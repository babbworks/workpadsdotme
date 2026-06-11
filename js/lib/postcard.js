/* postcard.js — Shareable PNG cards (3 formats) for workpad records. */

var Postcard = (function () {
  'use strict';

  var BRAND = 'workpads.me';

  var FORMATS = {
    detailed:  { id: 'detailed',  name: 'Detailed',       w: 1200, h: 630,  desc: '1200 × 630 · Full data card with sidebar', thumb: 'detailed' },
    square:    { id: 'square',    name: 'Square',         w: 1080, h: 1080, desc: '1080 × 1080 · Instagram / bold format',    thumb: 'square' },
    landscape: { id: 'landscape', name: 'Landscape 16:9', w: 1200, h: 675,  desc: '1200 × 675 · Twitter / X / LinkedIn',     thumb: 'landscape' },
  };

  var HTML2CANVAS = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';

  var ROW_K = 'font-family:JetBrains Mono,monospace;font-size:9px;opacity:.55;text-transform:uppercase;letter-spacing:.08em;';
  var ROW_V = 'font-size:12px;line-height:1.35;margin-top:2px;';
  var ROW_K_SQ = 'font-family:JetBrains Mono,monospace;font-size:11px;opacity:.7;text-transform:uppercase;letter-spacing:.08em;';
  var ROW_V_SQ = 'font-size:16px;line-height:1.4;margin-top:3px;font-weight:500;';
  var SEC_HD = 'font-family:JetBrains Mono,monospace;font-size:8px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;opacity:.5;margin:14px 0 6px;';

  function _esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function _toast(msg) {
    if (typeof App !== 'undefined' && App.toast) App.toast(msg);
    else if (typeof console !== 'undefined') console.log('[Postcard] ' + msg);
  }

  function _padType(record) {
    return (typeof PadType !== 'undefined') ? PadType.of(record) : (record.record_class || 'work');
  }

  function _padLabel(record) {
    return (typeof PadType !== 'undefined') ? PadType.label(record).toUpperCase() : 'WORK';
  }

  function isLocked(record) {
    if (!record) return true;
    if (typeof WorkpadsEncrypt === 'undefined') return false;
    return WorkpadsEncrypt.isSealed(record);
  }

  /** Normalize legacy / imported records before export. */
  function prepareRecord(record) {
    if (!record) return null;
    var r = Object.assign({}, record);
    if (typeof PadsExt !== 'undefined') {
      try { r = PadsExt.extract(r) || r; } catch (_) {}
    }
    if (!r.record_class) r.record_class = 'work';
    return r;
  }

  function canExport(record) {
    if (!record) return false;
    if (record.recordType === 'expense' || record.recordType === 'payment') return false;
    return !isLocked(prepareRecord(record));
  }

  function _locationsFromRecord(record) {
    var locs = [];
    try {
      if (record._locations_json) {
        var json = (typeof MapUtils !== 'undefined')
          ? MapUtils.expandLocationsJson(record._locations_json) : record._locations_json;
        locs = JSON.parse(json);
      }
    } catch (_) {}
    if (!locs.length && record.location) {
      locs.push({ address: record.location, notes: '' });
    }
    return locs.map(function (loc) {
      return (typeof MapUtils !== 'undefined') ? MapUtils.expandLocation(loc) : loc;
    });
  }

  function getLocationChoices(record) {
    var pt = _padType(record);
    if (pt === 'field') {
      return _locationsFromRecord(record).map(function (loc, i) {
        return {
          index: i,
          loc: loc,
          label: (typeof MapUtils !== 'undefined')
            ? MapUtils.locationLabel(loc) : (loc.title || loc.address || ('Site ' + (i + 1))),
        };
      });
    }
    if (pt === 'plan') {
      var planLoc = (typeof MapUtils !== 'undefined')
        ? MapUtils.expandLocation({
          address: record.location || '',
          map_url: record.location_map_url || '',
          lat: record.location_lat,
          lon: record.location_lon,
          zoom: record.location_zoom,
        }) : { address: record.location || '' };
      return [{ index: 0, loc: planLoc, label: planLoc.address || 'Plan location' }];
    }
    if (record.location || record.location_map_url) {
      var wloc = (typeof MapUtils !== 'undefined')
        ? MapUtils.expandLocation({
          address: record.location || '',
          map_url: record.location_map_url || '',
          lat: record.location_lat,
          lon: record.location_lon,
          zoom: record.location_zoom,
        }) : { address: record.location || '' };
      return [{ index: 0, loc: wloc, label: record.location || 'Job location' }];
    }
    return [{ index: 0, loc: null, label: 'No map location' }];
  }

  function _resolveLoc(record, locIndex) {
    var choices = getLocationChoices(record);
    var pick = choices[locIndex] || choices[0];
    return pick ? pick.loc : null;
  }

  function _truncate(str, max) {
    str = String(str || '').trim();
    if (!str) return '';
    return str.length > max ? str.slice(0, max - 1) + '…' : str;
  }

  function _notesLabel(record) {
    var pt = _padType(record);
    if (pt === 'field') return 'Activity notes';
    if (pt === 'note')  return 'Summary';
    if (pt === 'plan')  return 'General plan';
    return 'Story';
  }

  function _detailsLabel(record) {
    var pt = _padType(record);
    if (pt === 'note') return 'Details';
    if (pt === 'plan') return 'Details';
    return 'Notes';
  }

  function _contentAvailability(record) {
    var pt = _padType(record);
    var hasActions = false;
    if (pt === 'note') {
      hasActions = !!(record.pads_actions && String(record.pads_actions).trim());
    } else {
      hasActions = !!(record.actions && record.actions.length);
    }
    var hasNotes = !!(record.story && String(record.story).trim());
    var hasDetails = false;
    if (pt === 'note') {
      hasDetails = !!(record.pads_details && String(record.pads_details).trim());
    } else {
      hasDetails = !!(record.details && String(record.details).trim());
    }
    return { hasActions: hasActions, hasNotes: hasNotes, hasDetails: hasDetails };
  }

  function _processRows(record, loc, opts) {
    opts = opts || {};
    var rows = [];
    var pt = _padType(record);

    if (record.job && !opts.skipTitle) rows.push(['Title', record.job]);

    if (pt === 'field') {
      if (record.date) rows.push(['Date', record.date]);
      if (record.start_time) rows.push(['Start', record.start_time]);
      if (record.end_time) rows.push(['End', record.end_time]);
      if (loc && (loc.title || loc.address)) {
        rows.push(['Site', (typeof MapUtils !== 'undefined') ? MapUtils.locationLabel(loc) : (loc.title || loc.address)]);
      }
      if (loc && loc.address && loc.title && loc.address !== loc.title) {
        rows.push(['Address', loc.address]);
      } else if (loc && loc.address && !loc.title) {
        rows.push(['Address', loc.address]);
      }
      if (record.worker) rows.push(['Signed', record.worker]);
    } else if (pt === 'note') {
      if (record.worker) rows.push(['Signed', record.worker]);
    } else if (pt === 'plan') {
      if (record.date) rows.push(['Start', record.date]);
      if (record.due_date) rows.push(['Due', record.due_date]);
      if (record.location) rows.push(['Location', record.location]);
      if (record.worker) rows.push(['Signed', record.worker]);
    } else {
      if (record.customer) rows.push(['Customer', record.customer]);
      if (record.date) rows.push(['Date', record.date]);
      if (record.location) rows.push(['Location', record.location]);
      if (record.start_time) rows.push(['Start', record.start_time]);
      if (record.end_time) rows.push(['End', record.end_time]);
      if (record.meeting_time) rows.push(['Meeting', record.meeting_time]);
      if (record.worker) rows.push(['Worker', record.worker]);
    }

    if (loc && loc.lat != null && loc.lon != null && typeof MapUtils !== 'undefined') {
      rows.push(['Coords', MapUtils.formatCoords(loc.lat, loc.lon)]);
    }
    return rows;
  }

  function _formatActions(record) {
    var pt = _padType(record);
    if (pt === 'note') {
      return record.pads_actions ? String(record.pads_actions).trim() : '';
    }
    if (!record.actions || !record.actions.length) return '';
    return record.actions.map(function (a, i) {
      var t = (a && a.title) ? a.title : ('Step ' + (i + 1));
      var n = (a && a.notes) ? ' — ' + a.notes : '';
      return t + n;
    }).join('\n');
  }

  function _detailsText(record) {
    var pt = _padType(record);
    if (pt === 'note') return record.pads_details ? String(record.pads_details).trim() : '';
    return record.details ? String(record.details).trim() : '';
  }

  var ADDR_KEYS = { Site: 1, Address: 1, Coords: 1, Location: 1 };

  function _splitRows(rows) {
    var main = [];
    var addr = [];
    rows.forEach(function (r) {
      if (ADDR_KEYS[r[0]]) addr.push(r);
      else main.push(r);
    });
    return { main: main, addr: addr };
  }

  function _rowsHtml(rows, variant) {
    var compact = variant === true || variant === 'compact';
    var square  = variant === 'square';
    var rowK = square ? ROW_K_SQ : ROW_K;
    var rowV = square ? ROW_V_SQ : ROW_V;
    var mb = square ? '10px' : (compact ? '6px' : '8px');
    return rows.map(function (r) {
      return '<div style="margin-bottom:' + mb + ';break-inside:avoid;">' +
        '<div style="' + rowK + '">' + _esc(r[0]) + '</div>' +
        '<div style="' + rowV + '">' + _esc(r[1]) + '</div></div>';
    }).join('');
  }

  function _blockHtml(label, text, max) {
    if (!text) return '';
    return '<div style="' + SEC_HD + '">' + _esc(label) + '</div>' +
      '<div style="font-size:11px;line-height:1.45;opacity:.88;white-space:pre-wrap;">' +
      _esc(_truncate(text, max)) + '</div>';
  }

  function _siteNoteHtml(notes, compact) {
    if (!notes || !String(notes).trim()) return '';
    var max = compact ? 200 : 360;
    return '<div style="' + SEC_HD + '">Site notes</div>' +
      '<div style="padding:10px 12px;background:rgba(192,71,10,.15);border-left:3px solid #c0470a;' +
      'font-family:Fraunces,Georgia,serif;font-size:' + (compact ? '12px' : '13px') + ';font-style:italic;' +
      'line-height:1.45;white-space:pre-wrap;">' + _esc(_truncate(notes, max)) + '</div>';
  }

  function _messageHtml(message, compact) {
    if (!message) return '';
    return '<div style="' + SEC_HD + '">Message</div>' +
      '<div style="font-size:' + (compact ? '13px' : '15px') + ';font-style:italic;opacity:.9;line-height:1.4;">' +
      _esc(_truncate(message, 200)) + '</div>';
  }

  function _buildPanels(record, loc, opts) {
    var process = _processRows(record, loc, { skipTitle: opts.skipTitle });
    var split = _splitRows(process);
    var siteNotes = loc ? (loc.notes || '') : '';
    var extras = '';
    if (opts.includeActions) extras += _blockHtml('Actions', _formatActions(record), opts.compact ? 280 : 500);
    if (opts.includeNotes)  extras += _blockHtml(_notesLabel(record), record.story || '', opts.compact ? 220 : 400);
    if (opts.includeDetails) extras += _blockHtml(_detailsLabel(record), _detailsText(record), opts.compact ? 220 : 400);
    var rowVariant = opts.squareLayout ? 'square' : opts.compact;
    return {
      processHtml: _rowsHtml(split.main, rowVariant),
      addressHtml: _rowsHtml(split.addr, rowVariant),
      siteNotesHtml: _siteNoteHtml(siteNotes, opts.compact),
      extrasHtml: extras,
      messageHtml: _messageHtml(opts.message, opts.compact),
      title: _esc(record.job || 'Untitled'),
      stamp: _esc(_padLabel(record)),
    };
  }

  function _mapImg(mapSnap) {
    return mapSnap && mapSnap.map_snapshot
      ? '<img src="' + mapSnap.map_snapshot + '" style="width:100%;height:100%;object-fit:cover;display:block;" alt="">'
      : '<div style="width:100%;height:100%;background:linear-gradient(135deg,#e8e4dc,#d8d0c4);"></div>';
  }

  function _brandBar(stamp, message) {
    var hasMsg = !!(message && String(message).trim());
    var barH = hasMsg ? (String(message).length > 55 ? 68 : 56) : 48;
    var msgBlock = hasMsg
      ? '<div style="flex:1;display:flex;align-items:center;justify-content:center;min-width:0;padding:0 14px;">' +
          '<div style="font-family:Fraunces,Georgia,serif;font-size:16px;font-style:italic;line-height:1.32;' +
            'text-align:center;max-width:78%;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;' +
            'overflow:hidden;">' + _esc(_truncate(message, 140)) + '</div>' +
        '</div>'
      : '';
    return '<div style="position:absolute;top:0;left:0;right:0;height:' + barH + 'px;display:flex;align-items:center;' +
      'padding:0 18px;background:rgba(25,20,15,.88);border-bottom:1px solid rgba(255,255,255,.08);z-index:3;">' +
      '<span style="font-family:JetBrains Mono,monospace;font-size:11px;font-weight:700;letter-spacing:.06em;flex-shrink:0;">' +
        _esc(BRAND) + '</span>' +
      '<span style="margin-left:10px;font-size:9px;opacity:.55;letter-spacing:.1em;flex-shrink:0;">' + stamp + '</span>' +
      msgBlock +
    '</div>';
  }

  function _attrib() {
    return '<div style="font-family:JetBrains Mono,monospace;font-size:7px;opacity:.4;margin-top:10px;">' +
      'Map tiles © OpenStreetMap contributors · ODbL</div>';
  }

  function _barHeight(message) {
    if (!message || !String(message).trim()) return 48;
    return String(message).length > 55 ? 68 : 56;
  }

  function _buildDetailed(record, format, mapSnap, loc, opts) {
    var W = format.w;
    var H = format.h;
    var msg = opts.message || '';
    var barH = _barHeight(msg);
    var p = _buildPanels(record, loc, {
      compact: false, skipTitle: false, squareLayout: false,
      includeActions: opts.includeActions, includeNotes: opts.includeNotes,
      includeDetails: opts.includeDetails, message: msg,
    });
    return '<div id="postcard-canvas" style="width:' + W + 'px;height:' + H + 'px;position:relative;overflow:hidden;' +
      'font-family:IBM Plex Sans,system-ui,sans-serif;background:#19140f;color:#f6f1e8;flex-shrink:0;box-sizing:border-box;">' +
      '<div style="position:absolute;inset:0;">' + _mapImg(mapSnap) + '</div>' +
      '<div style="position:absolute;inset:0;background:linear-gradient(90deg,' +
        'rgba(25,20,15,0) 0%,rgba(25,20,15,0) 56%,rgba(25,20,15,.22) 66%,rgba(25,20,15,.72) 78%,rgba(25,20,15,.93) 100%);"></div>' +
      _brandBar(p.stamp, msg) +
      '<div style="position:absolute;top:' + barH + 'px;right:0;width:400px;bottom:0;padding:18px 20px 16px;box-sizing:border-box;z-index:2;">' +
        '<div style="font-family:Fraunces,Georgia,serif;font-size:32px;font-weight:700;line-height:1.12;margin-bottom:12px;">' + p.title + '</div>' +
        p.processHtml + p.addressHtml + p.siteNotesHtml + p.extrasHtml + _attrib() +
      '</div>' +
    '</div>';
  }

  function _buildSquare(record, format, mapSnap, loc, opts) {
    var W = format.w;
    var H = format.h;
    var barH = 48;
    var p = _buildPanels(record, loc, {
      compact: true, skipTitle: true, squareLayout: true,
      includeActions: opts.includeActions, includeNotes: opts.includeNotes,
      includeDetails: opts.includeDetails, message: opts.message,
    });
    var addrBlock = p.addressHtml
      ? '<div style="flex:1;min-width:0;display:flex;flex-direction:column;justify-content:flex-end;text-align:right;padding-left:12px;">' +
          p.addressHtml +
        '</div>'
      : '';
    return '<div id="postcard-canvas" style="width:' + W + 'px;height:' + H + 'px;position:relative;overflow:hidden;' +
      'font-family:IBM Plex Sans,system-ui,sans-serif;background:#19140f;color:#f6f1e8;flex-shrink:0;box-sizing:border-box;">' +
      '<div style="position:absolute;inset:0;width:' + W + 'px;height:' + H + 'px;">' + _mapImg(mapSnap) + '</div>' +
      '<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(25,20,15,.55) 0%,transparent 16%,transparent 52%,rgba(25,20,15,.88) 100%);"></div>' +
      _brandBar(p.stamp) +
      '<div style="position:absolute;top:' + barH + 'px;left:22px;right:22px;z-index:2;">' +
        '<div style="font-family:Fraunces,Georgia,serif;font-size:42px;font-weight:700;line-height:1.08;' +
          'text-shadow:0 2px 12px rgba(25,20,15,.65);">' + p.title + '</div>' +
      '</div>' +
      '<div style="position:absolute;left:0;right:0;bottom:0;top:48%;padding:14px 22px 18px;box-sizing:border-box;z-index:2;' +
        'display:flex;flex-direction:column;justify-content:flex-end;overflow:visible;">' +
        '<div style="display:flex;align-items:flex-end;gap:14px;margin-bottom:8px;">' +
          '<div style="flex:2;min-width:0;columns:2;column-gap:22px;">' + p.processHtml + '</div>' +
          addrBlock +
        '</div>' +
        p.siteNotesHtml + p.extrasHtml + p.messageHtml + _attrib() +
      '</div>' +
    '</div>';
  }

  function _buildLandscape(record, format, mapSnap, loc, opts) {
    var W = format.w;
    var H = format.h;
    var p = _buildPanels(record, loc, { compact: true, includeActions: opts.includeActions, includeNotes: opts.includeNotes, includeDetails: opts.includeDetails, message: opts.message });
    return '<div id="postcard-canvas" style="width:' + W + 'px;height:' + H + 'px;position:relative;overflow:hidden;' +
      'font-family:IBM Plex Sans,system-ui,sans-serif;background:#19140f;color:#f6f1e8;flex-shrink:0;display:flex;box-sizing:border-box;">' +
      '<div style="position:relative;flex:1;height:100%;min-width:0;">' + _mapImg(mapSnap) + '</div>' +
      '<div style="width:340px;height:100%;background:rgba(20,16,12,.94);padding:18px 16px;box-sizing:border-box;border-left:1px solid rgba(255,255,255,.08);overflow:visible;z-index:2;">' +
        '<div style="font-family:JetBrains Mono,monospace;font-size:9px;font-weight:700;letter-spacing:.08em;margin-bottom:8px;">' +
          _esc(BRAND) + ' · ' + p.stamp + '</div>' +
        '<div style="font-family:Fraunces,Georgia,serif;font-size:26px;font-weight:700;line-height:1.12;margin-bottom:10px;">' + p.title + '</div>' +
        p.processHtml + p.addressHtml + p.siteNotesHtml + p.extrasHtml + p.messageHtml + _attrib() +
      '</div>' +
    '</div>';
  }

  function _buildCardHtml(record, format, mapSnap, loc, opts) {
    opts = opts || {};
    if (format.id === 'detailed') return _buildDetailed(record, format, mapSnap, loc, opts);
    if (format.id === 'square')    return _buildSquare(record, format, mapSnap, loc, opts);
    return _buildLandscape(record, format, mapSnap, loc, opts);
  }

  function _fetchMapBg(loc, format) {
    if (!loc || typeof MapUtils === 'undefined') return Promise.resolve(null);
    var coords = MapUtils.resolveLocationCoords(loc);
    if (!coords) return Promise.resolve(null);
    var w = format.w;
    var h = format.h;
    if (format.id === 'landscape') w = format.w - 340;
    return MapUtils.fetchPostcardSnapshot(coords.lat, coords.lon, coords.zoom, w, h)
      .catch(function () { return null; });
  }

  function _loadHtml2Canvas() {
    if (window.html2canvas) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = HTML2CANVAS;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('Could not load html2canvas')); };
      document.head.appendChild(s);
    });
  }

  function _slug(record, loc) {
    var base = (record.job || 'workpad').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 32);
    if (loc && typeof MapUtils !== 'undefined') {
      var lbl = MapUtils.locationLabel(loc).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 20);
      if (lbl && lbl !== 'untitled-site') base += '-' + lbl;
    }
    return base;
  }

  function _removeOverlay() {
    var el = document.querySelector('.postcard-overlay');
    if (el) el.remove();
  }

  function _captureCanvas(format, root) {
    var canvas = (root || document).querySelector('#postcard-canvas');
    if (!canvas || !window.html2canvas) return Promise.reject(new Error('Card not ready'));
    return window.html2canvas(canvas, {
      width: format.w,
      height: format.h,
      scale: 1,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#19140f',
      logging: false,
      imageTimeout: 15000,
    });
  }

  function _downloadPng(cvs, filename) {
    var link = document.createElement('a');
    link.download = filename;
    link.href = cvs.toDataURL('image/png');
    link.click();
  }

  function _fitPreview(card, format, previewWrap) {
    var maxW = Math.min(previewWrap.clientWidth || (window.innerWidth - 80), format.w);
    var scale = maxW / format.w;
    var scaledW = Math.round(format.w * scale);
    var scaledH = Math.round(format.h * scale);
    previewWrap.style.width  = scaledW + 'px';
    previewWrap.style.height = scaledH + 'px';
    previewWrap.style.margin   = '12px auto';
    card.style.width  = format.w + 'px';
    card.style.height = format.h + 'px';
    card.style.transformOrigin = 'top left';
    card.style.transform = 'scale(' + scale + ')';
  }

  function _openCardModal(record, format, opts) {
    opts = opts || {};
    var locIndex = opts.locIndex != null ? opts.locIndex : 0;
    var loc      = _resolveLoc(record, locIndex);
    var overlay  = document.createElement('div');
    overlay.className = 'postcard-overlay';
    overlay.innerHTML =
      '<div class="postcard-modal postcard-modal-preview">' +
        '<div class="postcard-modal-head">' +
          '<span class="postcard-modal-title">' + _esc(FORMATS[format.id].name) + ' postcard</span>' +
          '<button type="button" class="postcard-modal-close" id="pc-close" aria-label="Close">&times;</button>' +
        '</div>' +
        '<p class="postcard-map-note">Map imagery fetched from OpenStreetMap on your device</p>' +
        '<div class="postcard-preview-wrap" id="pc-preview-wrap">' +
          '<p class="postcard-loading">Fetching OpenStreetMap tiles…</p>' +
        '</div>' +
        '<div class="postcard-modal-actions">' +
          '<button type="button" class="btn-primary" id="pc-download" disabled>↓ Download PNG</button>' +
          (navigator.share ? '<button type="button" class="btn-ghost" id="pc-share" disabled>Share image</button>' : '') +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    var previewWrap = overlay.querySelector('#pc-preview-wrap');
    var dlBtn = overlay.querySelector('#pc-download');
    var shareBtn = overlay.querySelector('#pc-share');

    Promise.all([_loadHtml2Canvas(), _fetchMapBg(loc, format)]).then(function (res) {
      previewWrap.innerHTML = _buildCardHtml(record, format, res[1], loc, opts);
      var card = previewWrap.querySelector('#postcard-canvas');
      if (card) _fitPreview(card, format, previewWrap);
      dlBtn.disabled = false;
      if (shareBtn) shareBtn.disabled = false;
    }).catch(function () {
      previewWrap.innerHTML = _buildCardHtml(record, format, null, loc, opts);
      var card = previewWrap.querySelector('#postcard-canvas');
      if (card) _fitPreview(card, format, previewWrap);
      dlBtn.disabled = false;
      if (shareBtn) shareBtn.disabled = false;
      _toast('Map tiles unavailable — card exported without live map');
    });

    overlay.querySelector('#pc-close').addEventListener('click', _removeOverlay);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) _removeOverlay(); });

    dlBtn.addEventListener('click', function () {
      dlBtn.disabled = true;
      dlBtn.textContent = 'Rendering…';
      var card = previewWrap.querySelector('#postcard-canvas');
      var prevTransform = card ? card.style.transform : '';
      if (card) card.style.transform = 'none';
      _captureCanvas(format, previewWrap).then(function (cvs) {
        _downloadPng(cvs, 'workpads-' + format.id + '-' + _slug(record, loc) + '.png');
      }).catch(function (err) {
        _toast('Could not render: ' + (err.message || 'error'));
      }).finally(function () {
        if (card) card.style.transform = prevTransform;
        dlBtn.disabled = false;
        dlBtn.textContent = '↓ Download PNG';
      });
    });

    if (shareBtn) {
      shareBtn.addEventListener('click', function () {
        shareBtn.disabled = true;
        var card = previewWrap.querySelector('#postcard-canvas');
        var prevTransform = card ? card.style.transform : '';
        if (card) card.style.transform = 'none';
        _captureCanvas(format, previewWrap).then(function (cvs) {
          return new Promise(function (resolve, reject) {
            cvs.toBlob(function (blob) {
              if (!blob) { reject(new Error('Blob failed')); return; }
              var file = new File([blob], 'workpads-' + format.id + '.png', { type: 'image/png' });
              navigator.share({ title: record.job || 'Workpad', files: [file] }).then(resolve).catch(reject);
            }, 'image/png');
          });
        }).catch(function (err) {
          _toast('Share failed: ' + (err.message || 'error'));
        }).finally(function () {
          if (card) card.style.transform = prevTransform;
          shareBtn.disabled = false;
        });
      });
    }
  }

  function _optRow(id, label, checked, disabled) {
    return '<label class="postcard-opt-row' + (disabled ? ' disabled' : '') + '">' +
      '<input type="checkbox" id="' + id + '"' + (checked ? ' checked' : '') + (disabled ? ' disabled' : '') + '>' +
      '<span>' + _esc(label) + '</span></label>';
  }

  function _showOptionsStep(record, format, opts, onDone) {
    _removeOverlay();
    var avail = _contentAvailability(record);
    var overlay = document.createElement('div');
    overlay.className = 'postcard-overlay';
    overlay.innerHTML =
      '<div class="postcard-modal postcard-modal-sm">' +
        '<div class="postcard-modal-head">' +
          '<span class="postcard-modal-title">' + _esc(FORMATS[format.id].name) + ' — card content</span>' +
        '</div>' +
        '<p class="postcard-loc-hint">Process fields are always included. Map tiles come from <strong>OpenStreetMap</strong> (Google/Apple links open the app but tiles are OSM).</p>' +
        '<label class="postcard-field-label" for="pc-msg">Optional message</label>' +
        '<textarea class="postcard-msg-input" id="pc-msg" placeholder="Short message on the card…" rows="2" maxlength="200"></textarea>' +
        '<div class="postcard-opt-group">' +
          _optRow('pc-opt-actions', 'Include actions', avail.hasActions, !avail.hasActions) +
          _optRow('pc-opt-notes', 'Include ' + _notesLabel(record).toLowerCase(), avail.hasNotes, !avail.hasNotes) +
          _optRow('pc-opt-details', 'Include ' + _detailsLabel(record).toLowerCase(), avail.hasDetails, !avail.hasDetails) +
        '</div>' +
        '<div class="postcard-modal-actions">' +
          '<button type="button" class="btn-ghost" id="pc-opt-cancel">Cancel</button>' +
          '<button type="button" class="btn-primary" id="pc-opt-go">Create card →</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    overlay.querySelector('#pc-opt-go').addEventListener('click', function () {
      opts.message = (overlay.querySelector('#pc-msg').value || '').trim();
      opts.includeActions = avail.hasActions && overlay.querySelector('#pc-opt-actions').checked;
      opts.includeNotes   = avail.hasNotes   && overlay.querySelector('#pc-opt-notes').checked;
      opts.includeDetails = avail.hasDetails && overlay.querySelector('#pc-opt-details').checked;
      _removeOverlay();
      onDone(opts);
    });
    overlay.querySelector('#pc-opt-cancel').addEventListener('click', _removeOverlay);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) _removeOverlay(); });
    setTimeout(function () { var el = overlay.querySelector('#pc-msg'); if (el) el.focus(); }, 40);
  }

  function _showLocationPicker(record, format, choices, onDone) {
    _removeOverlay();
    var overlay = document.createElement('div');
    overlay.className = 'postcard-overlay';
    var optsHtml = choices.map(function (c, i) {
      return '<label class="postcard-loc-opt">' +
        '<input type="radio" name="pc-loc" value="' + i + '"' + (i === 0 ? ' checked' : '') + '>' +
        '<span>' + _esc(c.label) + '</span></label>';
    }).join('');
    overlay.innerHTML =
      '<div class="postcard-modal postcard-modal-sm">' +
        '<div class="postcard-modal-head"><span class="postcard-modal-title">Choose location</span></div>' +
        '<p class="postcard-loc-hint">Multiple sites on this field pad. Pick one for this card, or export one PNG per site.</p>' +
        '<div class="postcard-loc-list">' + optsHtml + '</div>' +
        '<div class="postcard-modal-actions">' +
          '<button type="button" class="btn-ghost" id="pc-loc-all">One card per location</button>' +
          '<button type="button" class="btn-primary" id="pc-loc-one">Continue →</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    overlay.querySelector('#pc-loc-one').addEventListener('click', function () {
      var sel = overlay.querySelector('input[name="pc-loc"]:checked');
      _removeOverlay();
      onDone({ locIndex: sel ? parseInt(sel.value, 10) : 0, all: false });
    });
    overlay.querySelector('#pc-loc-all').addEventListener('click', function () {
      _removeOverlay();
      onDone({ locIndex: 0, all: true });
    });
    overlay.addEventListener('click', function (e) { if (e.target === overlay) _removeOverlay(); });
  }

  function _showFormatPicker(record) {
    _removeOverlay();
    var overlay = document.createElement('div');
    overlay.className = 'postcard-overlay';
    var opts = '';
    Object.keys(FORMATS).forEach(function (key) {
      var f = FORMATS[key];
      opts += '<button type="button" class="postcard-fmt-opt" data-fmt="' + f.id + '">' +
        '<span class="postcard-fmt-thumb postcard-fmt-thumb-' + f.thumb + '"></span>' +
        '<span class="postcard-fmt-info">' +
          '<span class="postcard-fmt-name">' + _esc(f.name) + '</span>' +
          '<span class="postcard-fmt-desc">' + _esc(f.desc) + '</span>' +
        '</span></button>';
    });
    overlay.innerHTML =
      '<div class="postcard-modal postcard-modal-sm">' +
        '<div class="postcard-modal-head"><span class="postcard-modal-title">Export postcard</span></div>' +
        '<p class="postcard-loc-hint">PNG cards for sharing. Map backgrounds use OpenStreetMap tiles on your device.</p>' +
        opts +
        '<button type="button" class="btn-ghost postcard-cancel" id="pc-cancel">Cancel</button>' +
      '</div>';
    document.body.appendChild(overlay);

    overlay.querySelectorAll('.postcard-fmt-opt').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var fmt = FORMATS[btn.dataset.fmt];
        if (!fmt) return;
        _removeOverlay();
        _afterFormat(record, fmt);
      });
    });
    overlay.querySelector('#pc-cancel').addEventListener('click', _removeOverlay);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) _removeOverlay(); });
  }

  function _afterFormat(record, format) {
    var choices = getLocationChoices(record);
    var multiField = _padType(record) === 'field' && choices.length > 1;

    function _batchDownload(opts) {
      _loadHtml2Canvas().then(function () {
        var chain = Promise.resolve();
        choices.forEach(function (c, i) {
          chain = chain.then(function () {
            _toast('Rendering ' + (i + 1) + ' of ' + choices.length + '…');
            return _fetchMapBg(c.loc, format).then(function (mapSnap) {
              var host = document.createElement('div');
              host.style.cssText = 'position:fixed;left:-9999px;top:0;';
              host.innerHTML = _buildCardHtml(record, format, mapSnap, c.loc, opts);
              document.body.appendChild(host);
              return _captureCanvas(format, host).then(function (cvs) {
                _downloadPng(cvs, 'workpads-' + format.id + '-' + _slug(record, c.loc) + '.png');
                host.remove();
              }).catch(function () { host.remove(); });
            });
          });
        });
        return chain.then(function () { _toast('Downloaded ' + choices.length + ' postcards'); });
      }).catch(function (err) {
        _toast('Batch export failed: ' + (err.message || 'error'));
      });
    }

    function _launch(opts) {
      if (opts.all && multiField) {
        _batchDownload(opts);
        return;
      }
      _openCardModal(record, format, opts);
    }

    function _withOptions(base) {
      _showOptionsStep(record, format, base, _launch);
    }

    if (multiField) {
      _showLocationPicker(record, format, choices, function (pick) {
        _withOptions({
          locIndex: pick.locIndex,
          all: pick.all,
          message: '',
          includeActions: false,
          includeNotes: false,
          includeDetails: false,
        });
      });
    } else {
      _withOptions({
        locIndex: 0,
        all: false,
        message: '',
        includeActions: false,
        includeNotes: false,
        includeDetails: false,
      });
    }
  }

  function openPicker(record) {
    var r = prepareRecord(record);
    if (!r) {
      _toast('No record to export');
      return;
    }
    if (!canExport(r)) {
      _toast(isLocked(r) ? 'Unlock the record to export a postcard' : 'Cannot export this record');
      return;
    }
    _showFormatPicker(r);
  }

  return {
    FORMATS: FORMATS,
    BRAND: BRAND,
    canExport: canExport,
    prepareRecord: prepareRecord,
    isLocked: isLocked,
    openPicker: openPicker,
    getLocationChoices: getLocationChoices,
  };
}());
