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

  // Save (upsert) a record by ID. Marks as non-draft.
  function save(id, fields) {
    return store.get(id).then(function(existing) {
      var rec = Object.assign(existing || { id: id }, fields, {
        updatedAt: Date.now(),
        draft: false,
      });
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
    return store.get(id);
  }

  // List all active records, newest first.
  function list() {
    return store.list().then(function(pairs) {
      return pairs
        .map(function(p) { return p.data; })
        .sort(function(a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); });
    });
  }

  // List archived records.
  function listArchived() {
    return archive.list().then(function(pairs) {
      return pairs.map(function(p) { return p.data; });
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
    return archive.get(id);
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
  function encodeUrl(rec) {
    var payload = {};
    var wireFields = [
      'job', 'customer', 'date', 'location', 'meeting_time',
      'start_time', 'end_time', 'customer_phone', 'worker',
      'details', 'story', 'actions',
      'amount', 'currency', 'vat', 'record_type',
    ];
    wireFields.forEach(function(f) {
      if (rec[f] !== null && rec[f] !== undefined) payload[f] = rec[f];
    });
    // Ensure worker is set from active Activity if not already on record
    if (!payload.worker) {
      var name = ActivityService.getSenderIdentity().name;
      if (name) payload.worker = name;
    }
    return WPCodec.encode(payload, rec.chainRef || null);
  }

  // Decode a received URL into a record object (not stored automatically).
  function decodeUrl(url) {
    return WPCodec.decode(url);
  }

  // Store a received record (from a decoded URL). Returns stored record.
  function storeReceived(decoded) {
    var id = genId();
    var chainRef = decoded._chainRef || null;
    var data = Object.assign({}, decoded);
    delete data._chainRef;
    var rec = Object.assign({ id: id, receivedAt: Date.now(), draft: false }, data);
    if (chainRef) rec.chainRef = chainRef;
    return store.put(id, rec).then(function() { return rec; });
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
    encodeUrl:       encodeUrl,
    decodeUrl:       decodeUrl,
    storeReceived:   storeReceived,
    findByChainRef:  findByChainRef,
  };

}(window));
