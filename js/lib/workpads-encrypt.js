/* workpads-encrypt.js — Client-side AES-GCM sealing for workpad content. */

var WorkpadsEncrypt = (function () {
  'use strict';

  // Visible metadata — never sealed; needed for sidebar title, list, and pad-type UI routing.
  var METADATA_FIELDS = ['job', 'record_class', 'date'];

  // Content sealed inside _encrypt_seal. Metadata fields must not appear here.
  var SEAL_FIELDS = [
    'customer', 'location', 'meeting_time',
    'start_time', 'end_time', 'customer_phone', 'worker',
    'story', 'details', 'actions',
    'amount', 'currency', 'vat', 'record_type',
    '_locations_json', 'pads_actions', 'pads_details', 'due_date',
    'location_map_url', 'location_lat', 'location_lon', 'location_zoom',
    '_exp_comments', 'participants', 'parts_flag',
  ];

  // Legacy stub title for old encrypted links that hid the real job name.
  var STUB_JOB = 'Encrypted workpad';

  function _enc() {
    return new TextEncoder();
  }

  function _hasSealValue(v) {
    if (v === undefined || v === null || v === '') return false;
    if (Array.isArray(v) && !v.length) return false;
    return true;
  }

  function _b64(buf) {
    var bin = '';
    var bytes = new Uint8Array(buf);
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  function _b64dec(str) {
    var s = String(str || '').replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    var bin = atob(s);
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  function _deriveKey(password, salt) {
    return crypto.subtle.importKey(
      'raw', _enc().encode(password), 'PBKDF2', false, ['deriveKey']
    ).then(function (base) {
      return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: salt, iterations: 120000, hash: 'SHA-256' },
        base,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
    });
  }

  function seal(plaintext, password) {
    if (!password) return Promise.reject(new Error('Passphrase required'));
    var salt = crypto.getRandomValues(new Uint8Array(16));
    var iv   = crypto.getRandomValues(new Uint8Array(12));
    return _deriveKey(password, salt).then(function (key) {
      return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, _enc().encode(plaintext));
    }).then(function (cipher) {
      return {
        v: 1,
        salt: _b64(salt),
        iv:   _b64(iv),
        data: _b64(cipher),
      };
    });
  }

  function unseal(blob, password) {
    if (!blob || !password) return Promise.reject(new Error('Missing seal or passphrase'));
    var salt = _b64dec(blob.salt);
    var iv   = _b64dec(blob.iv);
    var data = _b64dec(blob.data);
    return _deriveKey(password, salt).then(function (key) {
      return crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, data);
    }).then(function (plain) {
      return new TextDecoder().decode(plain);
    });
  }

  function sealRecord(record, password) {
    var payload = {};
    SEAL_FIELDS.forEach(function (f) {
      if (_hasSealValue(record[f])) payload[f] = record[f];
    });
    return seal(JSON.stringify(payload), password).then(function (sealed) {
      var out = Object.assign({}, record, {
        encrypt_enabled: true,
        _encrypt_seal:   sealed,
      });
      SEAL_FIELDS.forEach(function (f) { delete out[f]; });
      // job, record_class, date remain on the record for list/sidebar/routing.
      return out;
    });
  }

  function unsealRecord(record, password) {
    if (!record._encrypt_seal) return Promise.resolve(record);
    return unseal(record._encrypt_seal, password).then(function (json) {
      var fields = JSON.parse(json);
      var merged = Object.assign({}, record, fields);
      // Prefer plaintext metadata if present (new format); fall back to sealed payload (legacy).
      METADATA_FIELDS.forEach(function (f) {
        if (record[f] != null && record[f] !== '') merged[f] = record[f];
      });
      return merged;
    });
  }

  function isSealed(record) {
    return !!(record && record.encrypt_enabled && record._encrypt_seal);
  }

  function looksEncrypted(record) {
    if (!record) return false;
    if (isSealed(record)) return true;
    if (record.job === STUB_JOB) return true;
    if (typeof PadsExt !== 'undefined' && PadsExt.isTransportEncrypted(record)) return true;
    return false;
  }

  function canUnlock(record) {
    return isSealed(record);
  }

  function stripSealedFields(record) {
    if (!record) return record;
    var out = Object.assign({}, record);
    SEAL_FIELDS.forEach(function (f) { delete out[f]; });
    return out;
  }

  /** Display-safe job title — hides legacy stub text. */
  function displayJob(record) {
    if (!record || !record.job) return '';
    if (record.job === STUB_JOB) return '';
    return record.job;
  }

  return {
    METADATA_FIELDS: METADATA_FIELDS,
    SEAL_FIELDS: SEAL_FIELDS,
    STUB_JOB: STUB_JOB,
    seal: seal,
    unseal: unseal,
    sealRecord: sealRecord,
    unsealRecord: unsealRecord,
    isSealed: isSealed,
    looksEncrypted: looksEncrypted,
    canUnlock: canUnlock,
    stripSealedFields: stripSealedFields,
    displayJob: displayJob,
  };
}());
