/* pads-ext.js — v01 extension blob embedded in details (no codec bit change). */

var PadsExt = (function () {
  'use strict';

  var MARKER_RE = /<!--wp-ext:([A-Za-z0-9_-]+)-->\n?/;

  function _b64urlEncode(str) {
    return btoa(unescape(encodeURIComponent(str)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  function _b64urlDecode(s) {
    var t = String(s || '').replace(/-/g, '+').replace(/_/g, '/');
    while (t.length % 4) t += '=';
    var bin = atob(t);
    try {
      return decodeURIComponent(escape(bin));
    } catch (_) {
      return bin;
    }
  }

  function pack(record) {
    var r = record || {};
    // Sealed share: ciphertext + pad type metadata (record_class must survive for receiver UI).
    if (r.encrypt_enabled && r._encrypt_seal) {
      var sealedExt = { encrypt_enabled: true, _encrypt_seal: r._encrypt_seal };
      if (r.record_class && r.record_class !== 'work') sealedExt.record_class = r.record_class;
      return sealedExt;
    }
    var ext = {};
    if (r.record_class && r.record_class !== 'work') ext.record_class = r.record_class;
    if (r._locations_json) {
      ext._locations_json = (typeof MapUtils !== 'undefined')
        ? MapUtils.compactLocationsJson(r._locations_json, false)
        : r._locations_json;
    }
    else if ((r.record_class === 'field' || r.record_class === 'plan') && r.location) {
      ext.location = r.location;
    }
    if (r.pads_actions)     ext.pads_actions     = r.pads_actions;
    if (r.pads_details)     ext.pads_details     = r.pads_details;
    if (r.due_date)         ext.due_date         = r.due_date;
    if (r.location_map_url) ext.location_map_url = r.location_map_url;
    if (r.location_lat != null)  ext.location_lat  = r.location_lat;
    if (r.location_lon != null)  ext.location_lon  = r.location_lon;
    if (r.location_zoom != null) ext.location_zoom = r.location_zoom;
    if (r._exp_comments)    ext._exp_comments    = r._exp_comments;
    return ext;
  }

  function hasExt(record) {
    return Object.keys(pack(record)).length > 0;
  }

  function prepareForShare(record) {
    var rec = Object.assign({}, record);
    var ext = pack(rec);
    if (!Object.keys(ext).length) return rec;

    if (ext.encrypt_enabled && ext._encrypt_seal && typeof WorkpadsEncrypt !== 'undefined') {
      rec = WorkpadsEncrypt.stripSealedFields(rec);
    }

    var userDetails = (ext.encrypt_enabled && ext._encrypt_seal)
      ? ''
      : String(rec.details || '').replace(MARKER_RE, '').trim();
    var marker = '<!--wp-ext:' + _b64urlEncode(JSON.stringify(ext)) + '-->\n';
    rec.details = marker + userDetails;
    return rec;
  }

  function hasMarker(text) {
    return /<!--wp-ext:/.test(String(text || ''));
  }

  function _stripMarker(details) {
    return String(details || '').replace(MARKER_RE, '').trim();
  }

  function extract(record) {
    if (!record) return record;
    var details = String(record.details || '');
    var m = details.match(MARKER_RE);
    if (!m) return record;

    var clean = _stripMarker(details);
    var out = Object.assign({}, record);
    if (clean) out.details = clean;
    else delete out.details;

    try {
      var merged = Object.assign(out, JSON.parse(_b64urlDecode(m[1])));
      if (merged._locations_json && typeof MapUtils !== 'undefined') {
        merged._locations_json = MapUtils.expandLocationsJson(merged._locations_json);
      }
      return merged;
    } catch (_) {
      // Never surface the transport marker as user-visible content.
      if (/encrypt_enabled|_encrypt_seal/.test(m[1])) out.encrypt_enabled = true;
      return out;
    }
  }

  function isTransportEncrypted(record) {
    if (!record) return false;
    if (record.encrypt_enabled && record._encrypt_seal) return true;
    if (typeof WorkpadsEncrypt !== 'undefined' && record.job === WorkpadsEncrypt.STUB_JOB) return true;
    if (record.job === 'Encrypted workpad') return true;
    return hasMarker(record.details);
  }

  return {
    pack: pack, hasExt: hasExt, prepareForShare: prepareForShare,
    extract: extract, hasMarker: hasMarker, isTransportEncrypted: isTransportEncrypted,
  };
}());
