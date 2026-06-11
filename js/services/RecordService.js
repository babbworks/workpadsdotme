// RecordService — create, store, list, and share workpad records
// Exposes: window.RecordService (singleton)

(function(global) {
  'use strict';

  var store   = new StorageAdapter('wp_record_');
  var archive = new StorageAdapter('wp_archive_');

  function genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function genChainRef() {
    var buf = new Uint8Array(3);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(buf);
    } else {
      for (var i = 0; i < 3; i++) buf[i] = Math.floor(Math.random() * 256);
    }
    var bin = '';
    for (var i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  function todayIso() {
    return new Date().toISOString().slice(0, 10);
  }

  // Create a new draft record. Returns full record object.
  function create(fields) {
    var id = genId();
    var identity = ActivityService.getSenderIdentity();
    var rec = Object.assign({
      id:        id,
      date:      todayIso(),
      worker:    identity.name || undefined,
      chainRef:  genChainRef(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      draft:     true,
    }, fields || {});
    return store.put(id, rec).then(function() { return rec; });
  }

  function normalizeRecord(rec) {
    if (!rec || typeof PadsExt === 'undefined') return rec;
    return PadsExt.extract(rec);
  }

  function _needsPersistCleanup(stored, normalized) {
    if (!stored || !normalized) return false;
    if (stored.details && /<!--wp-ext:/.test(stored.details)) return true;
    if (!stored.record_class && normalized.record_class) return true;
    return false;
  }

  function _maybePersistNormalized(id, stored, normalized, putFn) {
    if (_needsPersistCleanup(stored, normalized)) {
      var clean = Object.assign({}, normalized, { id: id, updatedAt: Date.now() });
      return putFn(id, clean).then(function () { return clean; });
    }
    return Promise.resolve(normalized);
  }

  // Save (upsert) a record by ID. Marks as non-draft.
  function save(id, fields) {
    return store.get(id).then(function(existing) {
      var rec = normalizeRecord(Object.assign(existing || { id: id }, fields, {
        updatedAt: Date.now(),
        draft: false,
      }));
      return store.put(id, rec).then(function() { return rec; });
    });
  }

  // Update fields on an existing record without changing draft status.
  function update(id, fields) {
    return store.get(id).then(function(existing) {
      if (!existing) throw new Error('RecordService: record not found: ' + id);
      var rec = Object.assign(existing, fields, { updatedAt: Date.now() });
      return store.put(id, rec).then(function() { return rec; });
    });
  }

  // Get a single record by ID.
  function get(id) {
    return store.get(id).then(function (rec) {
      if (!rec) return null;
      var norm = normalizeRecord(rec);
      return _maybePersistNormalized(id, rec, norm, store.put.bind(store));
    });
  }

  // List all active records, newest first.
  function list() {
    return store.list().then(function(pairs) {
      return pairs
        .map(function(p) {
          var norm = normalizeRecord(p.data);
          if (_needsPersistCleanup(p.data, norm)) {
            store.put(p.id, Object.assign({}, norm, { id: p.id, updatedAt: Date.now() }));
          }
          return norm;
        })
        .sort(function(a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); });
    });
  }

  // List archived records.
  function listArchived() {
    return archive.list().then(function(pairs) {
      return pairs.map(function(p) {
        var norm = normalizeRecord(p.data);
        if (_needsPersistCleanup(p.data, norm)) {
          archive.put(p.id, Object.assign({}, norm, { id: p.id, updatedAt: Date.now() }));
        }
        return norm;
      });
    });
  }

  // Hard-delete: permanently remove record from storage.
  function removeRecord(id) {
    return store.remove(id);
  }

  // Soft-delete: move record to archive namespace.
  function archive_record(id) {
    return store.get(id).then(function(rec) {
      if (!rec) return;
      rec.archivedAt = Date.now();
      return archive.put(id, rec).then(function() {
        return store.remove(id);
      });
    });
  }

  // Get a single record by ID from the archive store.
  function getArchived(id) {
    return archive.get(id).then(function (rec) {
      if (!rec) return null;
      var norm = normalizeRecord(rec);
      return _maybePersistNormalized(id, rec, norm, archive.put.bind(archive));
    });
  }

  // Restore: move record from archive back to active store.
  function restoreRecord(id) {
    return archive.get(id).then(function(rec) {
      if (!rec) return Promise.reject(new Error('RecordService: archived record not found: ' + id));
      delete rec.archivedAt;
      rec.updatedAt = Date.now();
      return store.put(id, rec).then(function() {
        return archive.remove(id);
      });
    });
  }

  // Encode a record to a shareable workpads URL.
  // Strips internal fields (id, createdAt, updatedAt, draft) before encoding.
  // finOpts: optional { expenses: [], payments: [] } — line-item arrays for the financial block.
  function encodeUrl(rec, finOpts) {
    var toEncode = (typeof PadsExt !== 'undefined') ? PadsExt.prepareForShare(rec) : rec;
    var chainRef = toEncode.chainRef || rec.chainRef || null;

    // Sealed: wire carries only a stub title + ext marker (ciphertext inside marker).
    if (typeof WorkpadsEncrypt !== 'undefined' && WorkpadsEncrypt.isSealed(toEncode)) {
      var sealedPayload = {
        job: toEncode.job || WorkpadsEncrypt.STUB_JOB,
      };
      if (toEncode.details) sealedPayload.details = toEncode.details;
      return WPCodec.encode(sealedPayload, chainRef);
    }

    var payload = {};
    var wireFields = [
      'job', 'customer', 'date', 'location', 'meeting_time',
      'start_time', 'end_time', 'customer_phone', 'worker',
      'details', 'story', 'actions',
      'amount', 'currency', 'vat', 'record_type',
    ];
    wireFields.forEach(function(f) {
      if (toEncode[f] !== null && toEncode[f] !== undefined) payload[f] = toEncode[f];
    });
    if (!payload.worker) {
      var name = ActivityService.getSenderIdentity().name;
      if (name) payload.worker = name;
    }
    if (finOpts) {
      return WPCodec.encode(payload, {
        chainRef: chainRef,
        expenses: finOpts.expenses || [],
        payments: finOpts.payments || [],
      });
    }
    return WPCodec.encode(payload, chainRef);
  }

  // Decode a received URL into a record object (not stored automatically).
  function decodeUrl(url) {
    var decoded = WPCodec.decode(url);
    return Promise.resolve(
      (typeof PadsExt !== 'undefined') ? PadsExt.extract(decoded) : decoded
    );
  }

  // Store a received record (from a decoded URL). Returns stored record.
  // Inline expenses/payments from the fin block are persisted as child records
  // so view.js and WorkpadsPanel can find them via parentId lookup.
  function storeReceived(decoded) {
    var id = genId();
    var chainRef       = decoded._chainRef  || null;
    var inlineExpenses = decoded._expenses  || [];
    var inlinePayments = decoded._payments  || [];

    var data = (typeof PadsExt !== 'undefined') ? PadsExt.extract(decoded) : Object.assign({}, decoded);
    delete data._chainRef;
    delete data._expenses;
    delete data._payments;

    var rec = Object.assign({ id: id, receivedAt: Date.now(), draft: false }, data);
    if (chainRef) rec.chainRef = chainRef;

    return store.put(id, rec).then(function() {
      var children = [];
      var now = Date.now();
      var currSym = rec.currency || null;

      inlineExpenses.forEach(function(ex) {
        var eid = genId();
        var child = {
          id: eid, parentId: id,
          recordType:      'expense',
          job:             ex.job    || 'Expense',
          amount:          ex.amount || '0',
          currency:        currSym,
          draft:           false,
          createdAt:       now,
          updatedAt:       now,
          importedFromShare: true,
        };
        if (ex.date)          child.date          = ex.date;
        if (ex.actionIdx != null) child.actionIdx = ex.actionIdx;
        if (ex.billing)       child.expense_billing = ex.billing;
        if (ex.is_viewer)     child.is_viewer     = true;
        children.push(store.put(eid, child));
      });

      inlinePayments.forEach(function(py) {
        var pid = genId();
        var child = {
          id: pid, parentId: id,
          recordType:      'payment',
          job:             py.job    || 'Payment',
          amount:          py.amount || '0',
          currency:        currSym,
          draft:           false,
          createdAt:       now,
          updatedAt:       now,
          importedFromShare: true,
        };
        if (py.date) child.date = py.date;
        children.push(store.put(pid, child));
      });

      return Promise.all(children).then(function() { return rec; });
    });
  }

  // Hash fragment from codec output (strips workpads.me/p# prefix if present).
  function codecHash(codecUrl) {
    var s = String(codecUrl || '');
    if (s.indexOf('#') !== -1) return s.slice(s.lastIndexOf('#') + 1);
    if (s.indexOf('p#') !== -1) return s.split('p#').pop();
    return s;
  }

  // Build a full receiver URL on the current origin (localhost in dev, production when deployed).
  function shareUrlFromCodec(codecUrl, view) {
    var hash = codecHash(codecUrl);
    var origin = (typeof window !== 'undefined' && window.location && window.location.origin)
      ? window.location.origin
      : 'https://workpads.me';
    var path = view === 'full' ? '/p/customer.html#' : '/p#';
    return origin + path + hash;
  }

  function shareUrlPrefix(view) {
    var origin = (typeof window !== 'undefined' && window.location && window.location.origin)
      ? window.location.origin
      : 'https://workpads.me';
    return view === 'full' ? origin + '/p/customer.html#' : origin + '/p#';
  }

  // Find all records sharing a chainRef (for ACK / approval lookup).
  function findByChainRef(chainRef) {
    if (!chainRef) return Promise.resolve([]);
    return store.list().then(function(pairs) {
      return pairs
        .map(function(p) { return p.data; })
        .filter(function(r) { return r.chainRef === chainRef; });
    });
  }

  global.RecordService = {
    create:          create,
    save:            save,
    update:          update,
    get:             get,
    list:            list,
    listArchived:    listArchived,
    getArchived:     getArchived,
    archive:         archive_record,
    restore:         restoreRecord,
    remove:          removeRecord,
    encodeUrl:          encodeUrl,
    codecHash:          codecHash,
    shareUrlFromCodec:  shareUrlFromCodec,
    shareUrlPrefix:     shareUrlPrefix,
    decodeUrl:       decodeUrl,
    storeReceived:   storeReceived,
    findByChainRef:  findByChainRef,
  };

}(window));
