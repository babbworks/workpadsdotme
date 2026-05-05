// WPCodec — workpads codec (pads-v1 + fflate), codebook b
// Codebook a frames (1ag/) still decode for backwards compatibility.
// Codebook b (1bg/) adds the financial block at bit 12, freeing bits 13-15 for future use.
// Depends on: fflate UMD (window.fflate must be present).
// Exposes: window.WPCodec = { encode, decode, validate }

(function(global) {
  'use strict';

  var URL_PREFIX = 'workpads.me/p#';

  // ── base64url ─────────────────────────────────────────────────────────────────

  function toBase64Url(bytes) {
    var bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  function fromBase64Url(str) {
    var padded = str + '=='.slice(0, (4 - str.length % 4) % 4);
    var bin = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  // ── UTF-8 helpers ─────────────────────────────────────────────────────────────

  function toUtf8(str)   { return new TextEncoder().encode(str); }
  function fromUtf8(buf) { return new TextDecoder().decode(buf); }

  // ── frame constants ───────────────────────────────────────────────────────────

  var TEMPLATE_SVC_BASIC = 0x01;
  var ACTIONS_BIT        = 9;
  var FIN_BIT            = 12;   // financial block present
  var MAX_ACTIONS        = 20;

  // ── codebook-b scalar fields (bits 0–11) ──────────────────────────────────────

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
    // bit 9 = actions blob
    { id: 'details',        bit: 10 },
    { id: 'story',          bit: 11 },
    // bit 12 = financial block (FIN_BIT)
    // bits 13–15 reserved
  ];

  // codebook-a included old financial scalars at bits 12–15; kept for decode compat
  var SCALAR_FIELDS_A = SCALAR_FIELDS.concat([
    { id: 'amount',      bit: 12 },
    { id: 'currency',    bit: 13 },
    { id: 'vat',         bit: 14 },
    { id: 'record_type', bit: 15 },
  ]);

  // ── financial block enums ─────────────────────────────────────────────────────
  // 'job' is the default record_type — not written; decoder returns 'job' when absent.
  var RECORD_TYPES  = ['quote', 'invoice', 'expense', 'payment'];
  var CURRENCIES    = ['GBP', 'USD', 'EUR', 'CAD', 'AUD', 'NZD', 'ZAR'];
  var VAT_RATES     = ['0', '5', '7.5', '10', '12.5', '15', '20', '23', '25'];
  var BILLING_TYPES = ['billable', 'non-billable', 'absorbed', 'cogs'];

  // ── write/read helpers ────────────────────────────────────────────────────────

  function writeU16(buf, offset, val) {
    buf[offset]     = (val >>> 8) & 0xff;
    buf[offset + 1] = val & 0xff;
  }

  function readU16(buf, offset) {
    return ((buf[offset] & 0xff) << 8) | (buf[offset + 1] & 0xff);
  }

  function enumIdx(arr, val) {
    var i = arr.indexOf(val);
    return i === -1 ? 255 : i;   // 255 = custom string follows
  }

  // ── codebook-b encoder ────────────────────────────────────────────────────────

  function padsEncodeB(record, expenses, payments) {
    expenses = expenses || [];
    payments = payments || [];

    // ── scalar presence ───────────────────────────────────────────────────────
    var flags = 0;
    var scalarBytes = {};
    for (var i = 0; i < SCALAR_FIELDS.length; i++) {
      var f = SCALAR_FIELDS[i];
      var val = record[f.id];
      if (val != null && val !== '') {
        var b = toUtf8(String(val));
        scalarBytes[f.id] = b;
        flags |= (1 << f.bit);
      }
    }

    var actionItems = Array.isArray(record.actions) ? record.actions.slice(0, MAX_ACTIONS) : [];
    if (actionItems.length) flags |= (1 << ACTIONS_BIT);

    // ── financial block presence ───────────────────────────────────────────────
    var withFin = !!(
      (record.record_type && record.record_type !== 'job') ||
      record.currency || record.vat || record.amount ||
      expenses.length || payments.length
    );
    if (withFin) flags |= (1 << FIN_BIT);

    // ── pre-compute financial block data ───────────────────────────────────────
    var finFlagsByte = 0;
    var rtIdx = -1, curIdx = -1, vatIdx = -1;
    var curCustom = null, vatCustom = null, amtBytes = null;
    var expItems = [], payItems = [];

    if (withFin) {
      if (record.record_type && record.record_type !== 'job') {
        rtIdx = RECORD_TYPES.indexOf(record.record_type);
        if (rtIdx !== -1) finFlagsByte |= 0x01;
      }
      if (record.currency) {
        finFlagsByte |= 0x02;
        curIdx = enumIdx(CURRENCIES, record.currency);
        if (curIdx === 255) curCustom = toUtf8(String(record.currency));
      }
      if (record.vat != null) {
        finFlagsByte |= 0x04;
        vatIdx = enumIdx(VAT_RATES, String(record.vat));
        if (vatIdx === 255) vatCustom = toUtf8(String(record.vat));
      }
      if (record.amount != null) {
        finFlagsByte |= 0x08;
        amtBytes = toUtf8(String(record.amount));
      }
      if (expenses.length) {
        finFlagsByte |= 0x10;
        for (var ei = 0; ei < expenses.length; ei++) {
          var e = expenses[ei];
          var eflags = 0;
          var eamt  = toUtf8(String(e.amount || '0'));
          var ejob  = null, edate = null, ebilling = -1, eaidx = -1;
          if (e.job)   { eflags |= 0x01; ejob  = toUtf8(String(e.job)); }
          if (e.date)  { eflags |= 0x02; edate = toUtf8(String(e.date)); }
          var bval = e.expense_billing;
          if (bval) { ebilling = BILLING_TYPES.indexOf(bval); if (ebilling !== -1) eflags |= 0x04; }
          if (e.actionIdx != null && e.actionIdx >= 0 && e.actionIdx <= 19) { eflags |= 0x08; eaidx = e.actionIdx; }
          if (e.is_viewer) eflags |= 0x10;
          expItems.push({ flags: eflags, amt: eamt, job: ejob, date: edate, billing: ebilling, aidx: eaidx });
        }
      }
      if (payments.length) {
        finFlagsByte |= 0x20;
        for (var pi = 0; pi < payments.length; pi++) {
          var p = payments[pi];
          var pflags = 0;
          var pamt  = toUtf8(String(p.amount || '0'));
          var pjob  = null, pdate = null;
          if (p.job)  { pflags |= 0x01; pjob  = toUtf8(String(p.job)); }
          if (p.date) { pflags |= 0x02; pdate = toUtf8(String(p.date)); }
          payItems.push({ flags: pflags, amt: pamt, job: pjob, date: pdate });
        }
      }
    }

    // ── size pass ──────────────────────────────────────────────────────────────
    var size = 3; // template + 2-byte flags

    for (var j = 0; j < SCALAR_FIELDS.length; j++) {
      var sf = SCALAR_FIELDS[j];
      if (sf.bit < ACTIONS_BIT && scalarBytes[sf.id]) size += 2 + scalarBytes[sf.id].length;
    }
    if (actionItems.length) {
      size += 1;
      for (var k = 0; k < actionItems.length; k++) {
        var ta = toUtf8(actionItems[k].title || '');
        var na = toUtf8(actionItems[k].notes || '');
        size += 2 + ta.length + 2 + na.length;
      }
    }
    for (var m = 0; m < SCALAR_FIELDS.length; m++) {
      var pfs = SCALAR_FIELDS[m];
      if (pfs.bit > ACTIONS_BIT && pfs.bit < FIN_BIT && scalarBytes[pfs.id]) size += 2 + scalarBytes[pfs.id].length;
    }
    if (withFin) {
      size += 1; // finFlagsByte
      if (finFlagsByte & 0x01) size += 1;
      if (finFlagsByte & 0x02) { size += 1; if (curIdx === 255) size += 2 + curCustom.length; }
      if (finFlagsByte & 0x04) { size += 1; if (vatIdx === 255) size += 2 + vatCustom.length; }
      if (finFlagsByte & 0x08) size += 2 + amtBytes.length;
      if (finFlagsByte & 0x10) {
        size += 1;
        for (var ei2 = 0; ei2 < expItems.length; ei2++) {
          var ed = expItems[ei2];
          size += 1 + 2 + ed.amt.length;
          if (ed.flags & 0x01) size += 2 + ed.job.length;
          if (ed.flags & 0x02) size += 2 + ed.date.length;
          if (ed.flags & 0x04) size += 1;
          if (ed.flags & 0x08) size += 1;
        }
      }
      if (finFlagsByte & 0x20) {
        size += 1;
        for (var pi2 = 0; pi2 < payItems.length; pi2++) {
          var pd = payItems[pi2];
          size += 1 + 2 + pd.amt.length;
          if (pd.flags & 0x01) size += 2 + pd.job.length;
          if (pd.flags & 0x02) size += 2 + pd.date.length;
        }
      }
    }

    // ── write pass ─────────────────────────────────────────────────────────────
    var buf = new Uint8Array(size);
    var pos = 0;

    buf[pos++] = TEMPLATE_SVC_BASIC;
    writeU16(buf, pos, flags); pos += 2;

    function writeField(bytes) {
      writeU16(buf, pos, bytes.length); pos += 2;
      buf.set(bytes, pos); pos += bytes.length;
    }

    for (var a = 0; a < SCALAR_FIELDS.length; a++) {
      var asf = SCALAR_FIELDS[a];
      if (asf.bit < ACTIONS_BIT && scalarBytes[asf.id]) writeField(scalarBytes[asf.id]);
    }
    if (actionItems.length) {
      buf[pos++] = actionItems.length;
      for (var ai = 0; ai < actionItems.length; ai++) {
        writeField(toUtf8(actionItems[ai].title || ''));
        writeField(toUtf8(actionItems[ai].notes || ''));
      }
    }
    for (var n = 0; n < SCALAR_FIELDS.length; n++) {
      var nsf = SCALAR_FIELDS[n];
      if (nsf.bit > ACTIONS_BIT && nsf.bit < FIN_BIT && scalarBytes[nsf.id]) writeField(scalarBytes[nsf.id]);
    }

    if (withFin) {
      buf[pos++] = finFlagsByte;
      if (finFlagsByte & 0x01) buf[pos++] = rtIdx;
      if (finFlagsByte & 0x02) { buf[pos++] = curIdx; if (curIdx === 255) writeField(curCustom); }
      if (finFlagsByte & 0x04) { buf[pos++] = vatIdx; if (vatIdx === 255) writeField(vatCustom); }
      if (finFlagsByte & 0x08) writeField(amtBytes);
      if (finFlagsByte & 0x10) {
        buf[pos++] = expItems.length;
        for (var ex = 0; ex < expItems.length; ex++) {
          var ed2 = expItems[ex];
          buf[pos++] = ed2.flags;
          writeField(ed2.amt);
          if (ed2.flags & 0x01) writeField(ed2.job);
          if (ed2.flags & 0x02) writeField(ed2.date);
          if (ed2.flags & 0x04) buf[pos++] = ed2.billing;
          if (ed2.flags & 0x08) buf[pos++] = ed2.aidx;
        }
      }
      if (finFlagsByte & 0x20) {
        buf[pos++] = payItems.length;
        for (var px = 0; px < payItems.length; px++) {
          var pd2 = payItems[px];
          buf[pos++] = pd2.flags;
          writeField(pd2.amt);
          if (pd2.flags & 0x01) writeField(pd2.job);
          if (pd2.flags & 0x02) writeField(pd2.date);
        }
      }
    }

    return buf;
  }

  // ── codebook-b decoder ────────────────────────────────────────────────────────

  function padsDecodeB(bytes) {
    if (bytes.length < 3) throw new Error('WPCodec: frame too short');
    var pos = 0;
    var templateId = bytes[pos++];
    if (templateId !== TEMPLATE_SVC_BASIC) throw new Error('WPCodec: unknown template 0x' + templateId.toString(16));
    var flags = readU16(bytes, pos); pos += 2;
    var record = {};

    function readField() {
      var len = readU16(bytes, pos); pos += 2;
      var text = fromUtf8(bytes.subarray(pos, pos + len)); pos += len;
      return text;
    }

    for (var i = 0; i < SCALAR_FIELDS.length; i++) {
      var f = SCALAR_FIELDS[i];
      if (f.bit < ACTIONS_BIT && (flags & (1 << f.bit))) record[f.id] = readField();
    }
    if (flags & (1 << ACTIONS_BIT)) {
      var count = bytes[pos++];
      var actions = [];
      for (var k = 0; k < count; k++) {
        actions.push({ title: readField(), notes: readField() });
      }
      record.actions = actions;
    }
    for (var j = 0; j < SCALAR_FIELDS.length; j++) {
      var sf = SCALAR_FIELDS[j];
      if (sf.bit > ACTIONS_BIT && sf.bit < FIN_BIT && (flags & (1 << sf.bit))) record[sf.id] = readField();
    }

    if (flags & (1 << FIN_BIT)) {
      var finFlags = bytes[pos++];
      record.record_type = 'job';
      if (finFlags & 0x01) { var ri = bytes[pos++]; record.record_type = RECORD_TYPES[ri] || 'job'; }
      if (finFlags & 0x02) {
        var ci = bytes[pos++];
        record.currency = ci === 255 ? readField() : (CURRENCIES[ci] || '');
      }
      if (finFlags & 0x04) {
        var vi = bytes[pos++];
        record.vat = vi === 255 ? readField() : (VAT_RATES[vi] || '');
      }
      if (finFlags & 0x08) record.amount = readField();
      if (finFlags & 0x10) {
        var ec = bytes[pos++];
        var exps = [];
        for (var ei = 0; ei < ec; ei++) {
          var eflags = bytes[pos++];
          var exp = { amount: readField() };
          if (eflags & 0x01) exp.job             = readField();
          if (eflags & 0x02) exp.date            = readField();
          if (eflags & 0x04) exp.expense_billing = BILLING_TYPES[bytes[pos++]] || 'billable';
          if (eflags & 0x08) exp.actionIdx       = bytes[pos++];
          if (eflags & 0x10) exp.is_viewer       = true;
          exps.push(exp);
        }
        record.expenses = exps;
      }
      if (finFlags & 0x20) {
        var pc = bytes[pos++];
        var pays = [];
        for (var pi = 0; pi < pc; pi++) {
          var pflags = bytes[pos++];
          var pay = { amount: readField() };
          if (pflags & 0x01) pay.job  = readField();
          if (pflags & 0x02) pay.date = readField();
          pays.push(pay);
        }
        record.payments = pays;
      }
    }

    return record;
  }

  // ── codebook-a decoder (backwards compatibility for 1ag/ URLs) ───────────────

  function padsDecodeA(bytes) {
    if (bytes.length < 3) throw new Error('WPCodec: frame too short');
    var pos = 0;
    if (bytes[pos++] !== TEMPLATE_SVC_BASIC) throw new Error('WPCodec: unknown template');
    var flags = readU16(bytes, pos); pos += 2;
    var record = {};

    function readField() {
      var len = readU16(bytes, pos); pos += 2;
      var text = fromUtf8(bytes.subarray(pos, pos + len)); pos += len;
      return text;
    }

    for (var i = 0; i < SCALAR_FIELDS_A.length; i++) {
      var f = SCALAR_FIELDS_A[i];
      if (f.bit < ACTIONS_BIT && (flags & (1 << f.bit))) record[f.id] = readField();
    }
    if (flags & (1 << ACTIONS_BIT)) {
      var count = bytes[pos++];
      var actions = [];
      for (var k = 0; k < count; k++) actions.push({ title: readField(), notes: readField() });
      record.actions = actions;
    }
    for (var j = 0; j < SCALAR_FIELDS_A.length; j++) {
      var sf = SCALAR_FIELDS_A[j];
      if (sf.bit > ACTIONS_BIT && (flags & (1 << sf.bit))) record[sf.id] = readField();
    }
    return record;
  }

  // ── public API ────────────────────────────────────────────────────────────────

  var SCHEME_TAG = '1bg';

  // encode(record, opts)
  // opts: string (chainRef, legacy) | { chainRef, expenses, payments }
  function encode(record, opts) {
    var chainRef = null, expenses = [], payments = [];
    if (typeof opts === 'string' || opts === null || opts === undefined) {
      chainRef = opts || null;
    } else {
      chainRef = opts.chainRef  || null;
      expenses = opts.expenses  || [];
      payments = opts.payments  || [];
    }
    var frame      = padsEncodeB(record, expenses, payments);
    var compressed = global.fflate.deflateSync(frame, { level: 9 });
    var url        = URL_PREFIX + SCHEME_TAG + '/' + toBase64Url(compressed);
    if (chainRef) url += '&c=' + chainRef;
    return url;
  }

  // decode(url) — routes 1ag/ to codebook-a, 1bg/ to codebook-b
  function decode(url) {
    var hash     = url.indexOf('#') !== -1 ? url.slice(url.indexOf('#') + 1) : url;
    var segments = hash.split('&');
    var payload  = segments[0];
    var chainRef = null;
    for (var i = 1; i < segments.length; i++) {
      var eq = segments[i].indexOf('=');
      if (eq !== -1 && segments[i].slice(0, eq) === 'c') chainRef = segments[i].slice(eq + 1);
    }
    if (!/^[0-9][a-z][a-z]\//.test(payload)) throw new Error('WPCodec.decode: unrecognised format');
    var tag        = payload.slice(0, 3);
    var compressed = fromBase64Url(payload.slice(4));
    var frame      = global.fflate.inflateSync(compressed);
    var record     = tag === '1ag' ? padsDecodeA(frame) : padsDecodeB(frame);
    if (chainRef) record._chainRef = chainRef;
    return record;
  }

  function validate(record) {
    var errors = [];
    if (!record || typeof record !== 'object') return { valid: false, errors: ['record must be an object'] };
    if (!record.job || String(record.job).trim() === '') errors.push('job is required');
    var limits = {
      job: 120, customer: 120, date: 10, location: 160,
      meeting_time: 40, start_time: 40, end_time: 40,
      customer_phone: 40, worker: 80, details: 500, story: 2000,
    };
    Object.keys(limits).forEach(function(field) {
      if (record[field] != null) {
        var len = toUtf8(String(record[field])).length;
        if (len > limits[field]) errors.push(field + ' exceeds ' + limits[field] + ' bytes');
      }
    });
    if (record.actions != null) {
      if (!Array.isArray(record.actions)) errors.push('actions must be an array');
      else if (record.actions.length > MAX_ACTIONS) errors.push('actions exceeds ' + MAX_ACTIONS + ' items');
    }
    return { valid: errors.length === 0, errors: errors };
  }

  global.WPCodec = { encode: encode, decode: decode, validate: validate };

}(window));
