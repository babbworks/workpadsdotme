// WPCodec — browser-compatible workpads codec (pads-v1 + fflate)
// Adapted from @workpads/codec for browser/KaiOS (no require/module.exports).
// Depends on: fflate UMD loaded before this file (window.fflate must be present).
// Exposes: window.WPCodec = { encode, decode, validate }

(function(global) {
  'use strict';

  var URL_PREFIX = 'workpads.me/p#';

  // ── base64url ───────────────────────────────────────────────────────────────

  function toBase64Url(bytes) {
    var bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  function fromBase64Url(str) {
    var padded = str + '=='.slice(0, (4 - (str.length % 4)) % 4);
    var bin = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  // ── UTF-8 helpers ───────────────────────────────────────────────────────────

  function toUtf8(str) {
    return new TextEncoder().encode(str);
  }

  function fromUtf8(bytes) {
    return new TextDecoder().decode(bytes);
  }

  // ── pads-v1 binary frame ─────────────────────────────────────────────────────

  var TEMPLATE_SVC_BASIC_V1 = 0x01;
  var ACTIONS_BIT = 9;
  var MAX_ACTIONS = 20;

  var SCALAR_FIELDS = [
    { id: 'job',            bit: 0  },
    { id: 'customer',       bit: 1  },
    { id: 'date',           bit: 2  },
    { id: 'location',       bit: 3  },
    { id: 'meeting_time',   bit: 4  },
    { id: 'start_time',     bit: 5  },
    { id: 'end_time',       bit: 6  },
    { id: 'customer_phone', bit: 7  },
    { id: 'worker',         bit: 8  },
    { id: 'details',        bit: 10 },
    { id: 'story',          bit: 11 },
    { id: 'amount',         bit: 12 },
    { id: 'currency',       bit: 13 },
    { id: 'vat',            bit: 14 },
    { id: 'record_type',    bit: 15 },
  ];

  function writeU16(buf, offset, value) {
    buf[offset]     = (value >>> 8) & 0xff;
    buf[offset + 1] = value & 0xff;
  }

  function readU16(buf, offset) {
    return ((buf[offset] & 0xff) << 8) | (buf[offset + 1] & 0xff);
  }

  function padsEncode(record) {
    var flags = 0;
    var scalarBytes = {};

    for (var i = 0; i < SCALAR_FIELDS.length; i++) {
      var f = SCALAR_FIELDS[i];
      var val = record[f.id];
      if (val !== null && val !== undefined) {
        var bytes = toUtf8(String(val));
        scalarBytes[f.id] = bytes;
        flags |= (1 << f.bit);
      }
    }

    var actionItems = [];
    if (Array.isArray(record.actions)) {
      flags |= (1 << ACTIONS_BIT);
      actionItems = record.actions.slice(0, MAX_ACTIONS);
    }

    var actionBytes = actionItems.map(function(a) {
      return {
        title: toUtf8(a && a.title ? String(a.title) : ''),
        notes: toUtf8(a && a.notes ? String(a.notes) : ''),
      };
    });

    var size = 3;
    for (var j = 0; j < SCALAR_FIELDS.length; j++) {
      if (scalarBytes[SCALAR_FIELDS[j].id]) {
        size += 2 + scalarBytes[SCALAR_FIELDS[j].id].length;
      }
    }
    if (flags & (1 << ACTIONS_BIT)) {
      size += 1;
      for (var k = 0; k < actionBytes.length; k++) {
        size += 2 + actionBytes[k].title.length + 2 + actionBytes[k].notes.length;
      }
    }

    var buf = new Uint8Array(size);
    var pos = 0;
    buf[pos++] = TEMPLATE_SVC_BASIC_V1;
    writeU16(buf, pos, flags); pos += 2;

    for (var m = 0; m < SCALAR_FIELDS.length; m++) {
      var sf = SCALAR_FIELDS[m];
      if (sf.bit < ACTIONS_BIT && scalarBytes[sf.id]) {
        var sb = scalarBytes[sf.id];
        writeU16(buf, pos, sb.length); pos += 2;
        buf.set(sb, pos); pos += sb.length;
      }
    }

    if (flags & (1 << ACTIONS_BIT)) {
      buf[pos++] = actionItems.length;
      for (var n = 0; n < actionBytes.length; n++) {
        var ab = actionBytes[n];
        writeU16(buf, pos, ab.title.length); pos += 2;
        buf.set(ab.title, pos); pos += ab.title.length;
        writeU16(buf, pos, ab.notes.length); pos += 2;
        buf.set(ab.notes, pos); pos += ab.notes.length;
      }
    }

    for (var p = 0; p < SCALAR_FIELDS.length; p++) {
      var sf2 = SCALAR_FIELDS[p];
      if (sf2.bit > ACTIONS_BIT && scalarBytes[sf2.id]) {
        var sb2 = scalarBytes[sf2.id];
        writeU16(buf, pos, sb2.length); pos += 2;
        buf.set(sb2, pos); pos += sb2.length;
      }
    }

    return buf;
  }

  function padsDecode(bytes) {
    if (bytes.length < 3) throw new Error('WPCodec: frame too short');
    var pos = 0;
    var templateId = bytes[pos++];
    if (templateId !== TEMPLATE_SVC_BASIC_V1) {
      throw new Error('WPCodec: unknown template 0x' + templateId.toString(16));
    }
    var flags = readU16(bytes, pos); pos += 2;
    var record = {};

    function readScalar() {
      var len = readU16(bytes, pos); pos += 2;
      var text = fromUtf8(bytes.subarray(pos, pos + len)); pos += len;
      return text;
    }

    for (var i = 0; i < SCALAR_FIELDS.length; i++) {
      var f = SCALAR_FIELDS[i];
      if (f.bit < ACTIONS_BIT && (flags & (1 << f.bit))) {
        record[f.id] = readScalar();
      }
    }

    if (flags & (1 << ACTIONS_BIT)) {
      var count = bytes[pos++];
      var actions = [];
      for (var k = 0; k < count; k++) {
        var titleLen = readU16(bytes, pos); pos += 2;
        var title = fromUtf8(bytes.subarray(pos, pos + titleLen)); pos += titleLen;
        var notesLen = readU16(bytes, pos); pos += 2;
        var notes = fromUtf8(bytes.subarray(pos, pos + notesLen)); pos += notesLen;
        actions.push({ title: title, notes: notes });
      }
      record.actions = actions;
    }

    for (var j = 0; j < SCALAR_FIELDS.length; j++) {
      var sf = SCALAR_FIELDS[j];
      if (sf.bit > ACTIONS_BIT && (flags & (1 << sf.bit))) {
        record[sf.id] = readScalar();
      }
    }

    return record;
  }

  // ── public API ──────────────────────────────────────────────────────────────

  // URL scheme tag: <version><codebook><compression>
  // '1' = pads-v1, 'a' = codebook-a, 'g' = deflate (fflate)
  var SCHEME_TAG = '1ag';

  function encode(record, chainRef) {
    var frame = padsEncode(record);
    var compressed = global.fflate.deflateSync(frame, { level: 9 });
    var d = toBase64Url(compressed);
    var url = URL_PREFIX + SCHEME_TAG + '/' + d;
    if (chainRef) url += '&c=' + chainRef;
    return url;
  }

  function decode(url) {
    var hash = url.indexOf('#') !== -1 ? url.slice(url.indexOf('#') + 1) : url;

    // Split on '&' — first segment is codec payload, rest are key=value params
    var segments = hash.split('&');
    var payload  = segments[0];
    var chainRef = null;
    for (var i = 1; i < segments.length; i++) {
      var eq = segments[i].indexOf('=');
      if (eq !== -1 && segments[i].slice(0, eq) === 'c') {
        chainRef = segments[i].slice(eq + 1);
      }
    }

    if (!/^[0-9][a-z][a-z]\//.test(payload)) throw new Error('WPCodec.decode: unrecognised format');
    var compressed = fromBase64Url(payload.slice(4));
    var frame = global.fflate.inflateSync(compressed);
    var record = padsDecode(frame);
    if (chainRef) record._chainRef = chainRef;
    return record;
  }

  function validate(record) {
    var errors = [];
    if (!record || typeof record !== 'object') {
      return { valid: false, errors: ['record must be an object'] };
    }
    if (!record.job || String(record.job).trim() === '') {
      errors.push('job is required');
    }
    var limits = {
      job: 120, customer: 120, date: 10, location: 160,
      meeting_time: 40, start_time: 40, end_time: 40,
      customer_phone: 40, worker: 80, details: 500, story: 2000,
    };
    Object.keys(limits).forEach(function(field) {
      if (record[field] != null) {
        var len = toUtf8(String(record[field])).length;
        if (len > limits[field]) {
          errors.push(field + ' exceeds ' + limits[field] + ' bytes');
        }
      }
    });
    if (record.actions != null) {
      if (!Array.isArray(record.actions)) {
        errors.push('actions must be an array');
      } else if (record.actions.length > 20) {
        errors.push('actions exceeds 20 items');
      }
    }
    return { valid: errors.length === 0, errors: errors };
  }

  // ── fin encoding (expenses + payments → compressed JSON → base64url) ────────

  function encodeFin(expenses, payments) {
    var obj = {};
    if (expenses && expenses.length) {
      obj.e = expenses.map(function(e) {
        var item = { a: String(e.amount || '0') };
        if (e.job)              item.l = e.job;
        if (e.date)             item.d = e.date;
        if (e.expense_billing)  item.b = e.expense_billing;
        if (e.actionIdx != null) item.n = e.actionIdx;
        return item;
      });
    }
    if (payments && payments.length) {
      obj.p = payments.map(function(p) {
        var item = { a: String(p.amount || '0') };
        if (p.job)  item.l = p.job;
        if (p.date) item.d = p.date;
        return item;
      });
    }
    var bytes = toUtf8(JSON.stringify(obj));
    var compressed = global.fflate.deflateSync(bytes, { level: 9 });
    return toBase64Url(compressed);
  }

  function decodeFin(str) {
    try {
      var bytes    = fromBase64Url(str);
      var inflated = global.fflate.inflateSync(bytes);
      return JSON.parse(fromUtf8(inflated));
    } catch(e) { return null; }
  }

  // Append viewer-added expenses to an existing decoded fin object.
  // viewerExpenses: [{job, amount, actionIdx}]
  // Returns new base64url fin string with added items flagged s:'v'.
  function appendFin(finObj, viewerExpenses) {
    var obj = {
      e: (finObj && finObj.e ? finObj.e.slice() : []),
      p: (finObj && finObj.p ? finObj.p.slice() : []),
    };
    (viewerExpenses || []).forEach(function(e) {
      var item = { a: String(e.amount || '0'), s: 'v' };
      if (e.job)           item.l = e.job;
      if (e.date)          item.d = e.date;
      if (e.actionIdx != null) item.n = e.actionIdx;
      obj.e.push(item);
    });
    var bytes = toUtf8(JSON.stringify(obj));
    var compressed = global.fflate.deflateSync(bytes, { level: 9 });
    return toBase64Url(compressed);
  }

  global.WPCodec = { encode: encode, decode: decode, validate: validate, encodeFin: encodeFin, decodeFin: decodeFin, appendFin: appendFin };

}(window));
