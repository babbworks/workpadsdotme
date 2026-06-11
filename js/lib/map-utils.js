/* map-utils.js — Parse map links, offline previews, optional enriched snapshots. */

var MapUtils = (function () {
  'use strict';

  var TILE_BASE = 'https://tile.openstreetmap.org';
  var TILE_SIZE = 256;

  // Share-link budget: ~3.5 KB binary per location keeps multi-site field pads under ~8K total.
  var SHARE_SNAP_MAX_BYTES = 3500;
  var SHARE_SNAP_W         = 200;
  var SHARE_SNAP_H         = 86;
  var PREVIEW_ZOOM_OFFSET  = 2;  // zoom out 2 levels for area context

  function previewZoom(zoom) {
    return Math.max(1, Math.min(18, (zoom || 15) - PREVIEW_ZOOM_OFFSET));
  }

  function _lonLatToWorldPx(lon, lat, zoom) {
    var scale = TILE_SIZE * Math.pow(2, zoom);
    var x = (lon + 180) / 360 * scale;
    var sin = Math.sin(lat * Math.PI / 180);
    var y = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale;
    return { x: x, y: y };
  }

  function _loadTile(z, x, y) {
    var max = Math.pow(2, z) - 1;
    if (x < 0 || y < 0 || x > max || y > max) return Promise.resolve(null);
    var url = TILE_BASE + '/' + z + '/' + x + '/' + y + '.png';
    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error('Tile fetch failed (' + res.status + ')');
      return res.blob();
    }).then(function (blob) {
      return new Promise(function (resolve, reject) {
        var img = new Image();
        var objUrl = URL.createObjectURL(blob);
        img.onload = function () { URL.revokeObjectURL(objUrl); resolve(img); };
        img.onerror = function () { URL.revokeObjectURL(objUrl); reject(new Error('Tile decode failed')); };
        img.src = objUrl;
      });
    });
  }

  function snapshotToDataUrl(raw, mimeHint) {
    if (!raw) return '';
    if (String(raw).indexOf('data:') === 0) return raw;
    var mime = mimeHint === 'w' ? 'image/webp' : 'image/jpeg';
    return 'data:' + mime + ';base64,' + raw;
  }

  function snapshotFromLocation(loc) {
    if (!loc) return '';
    if (loc.map_snapshot) return loc.map_snapshot;
    if (loc.ms) return snapshotToDataUrl(loc.ms, loc.mt);
    return '';
  }

  function snapshotSize(dataUrlOrRaw) {
    if (!dataUrlOrRaw) return 0;
    var base = String(dataUrlOrRaw).indexOf(',') >= 0
      ? String(dataUrlOrRaw).split(',')[1]
      : String(dataUrlOrRaw);
    return Math.ceil(base.length * 0.75);
  }

  function _compressCanvas(canvas, maxBytes) {
    maxBytes = maxBytes || SHARE_SNAP_MAX_BYTES;
    var scales   = [1, 0.78, 0.6];
    var qualities = [0.4, 0.28, 0.18, 0.12];
    var best     = null;

    for (var si = 0; si < scales.length; si++) {
      var w = Math.max(96, Math.round(canvas.width * scales[si]));
      var h = Math.max(40, Math.round(canvas.height * scales[si]));
      var tmp = document.createElement('canvas');
      tmp.width = w;
      tmp.height = h;
      tmp.getContext('2d').drawImage(canvas, 0, 0, w, h);

      for (var qi = 0; qi < qualities.length; qi++) {
        var q = qualities[qi];
        var dataUrl;
        try { dataUrl = tmp.toDataURL('image/jpeg', q); } catch (_) { continue; }
        var raw   = dataUrl.split(',')[1];
        var bytes = snapshotSize(raw);
        var pack  = { ms: raw, mt: 'j', mw: w, mh: h, bytes: bytes, map_snapshot: dataUrl };
        if (!best || bytes < best.bytes) best = pack;
        if (bytes <= maxBytes) return pack;
      }
    }
    return best;
  }

  function compressDataUrlForShare(dataUrl, maxBytes) {
    if (!dataUrl) return null;
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        var c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        c.getContext('2d').drawImage(img, 0, 0);
        resolve(_compressCanvas(c, maxBytes));
      };
      img.onerror = function () { reject(new Error('Snapshot load failed')); };
      img.src = dataUrl;
    });
  }

  function expandLocation(loc) {
    if (!loc || typeof loc !== 'object') return loc;
    var ex = {
      address:        loc.address !== undefined ? loc.address : (loc.a || ''),
      title:          loc.title || loc.t || '',
      notes:          loc.notes || loc.n || '',
      map_url:        loc.map_url || loc.u || '',
      google_map_url: loc.google_map_url || loc.g || '',
      apple_map_url:  loc.apple_map_url || loc.p || '',
      lat:            loc.lat,
      lon:            loc.lon,
      zoom:           loc.z != null ? loc.z : loc.zoom,
      ms:             loc.ms,
      mt:             loc.mt,
      mw:             loc.mw,
      mh:             loc.mh,
      map_snapshot:   loc.map_snapshot || (loc.ms ? snapshotToDataUrl(loc.ms, loc.mt) : null),
    };
    if (ex.lat == null || ex.lon == null || isNaN(ex.lat) || isNaN(ex.lon)) {
      var coords = resolveLocationCoords(ex);
      if (coords) {
        ex.lat = coords.lat;
        ex.lon = coords.lon;
        ex.zoom = coords.zoom;
        ex.map_source = coords.source;
      }
    }
    return ex;
  }

  function expandLocationsJson(jsonStr) {
    if (!jsonStr) return jsonStr;
    try {
      var locs = JSON.parse(jsonStr);
      if (!Array.isArray(locs)) return jsonStr;
      return JSON.stringify(locs.map(expandLocation));
    } catch (_) {
      return jsonStr;
    }
  }

  function compactLocation(loc, includeSnapshot) {
    if (!loc) return null;
    var c = {};
    if (loc.address) c.a = loc.address;
    if (loc.title)   c.t = loc.title;
    if (loc.notes)   c.n = loc.notes;
    if (loc.google_map_url) c.g = loc.google_map_url;
    else if (loc.apple_map_url) c.p = loc.apple_map_url;
    else if (loc.map_url) c.u = loc.map_url;
    var coords = resolveLocationCoords(loc);
    if (coords && (loc.lat == null || loc.lon == null)) {
      loc.lat = coords.lat;
      loc.lon = coords.lon;
      if (!loc.zoom) loc.zoom = coords.zoom;
    }
    if (loc.lat != null && loc.lon != null) {
      c.lat = Math.round(loc.lat * 1e5) / 1e5;
      c.lon = Math.round(loc.lon * 1e5) / 1e5;
    }
    if (loc.zoom) c.z = loc.zoom;

    if (includeSnapshot !== false) {
      var raw = loc.ms;
      if (!raw && loc.map_snapshot) {
        var parts = String(loc.map_snapshot).split(',');
        raw = parts.length > 1 ? parts[1] : parts[0];
      }
      if (raw) {
        if (snapshotSize(raw) > SHARE_SNAP_MAX_BYTES) raw = null;
      }
      if (raw) {
        c.ms = raw;
        c.mt = loc.mt || 'j';
        if (loc.mw) c.mw = loc.mw;
        if (loc.mh) c.mh = loc.mh;
      }
    }
    return Object.keys(c).length ? c : null;
  }

  function compactLocationsJson(jsonStr, includeSnapshots) {
    if (!jsonStr) return jsonStr;
    try {
      var locs = JSON.parse(jsonStr);
      if (!Array.isArray(locs)) return jsonStr;
      var out = locs.map(function (loc) {
        return compactLocation(expandLocation(loc), includeSnapshots);
      }).filter(Boolean);
      return out.length ? JSON.stringify(out) : undefined;
    } catch (_) {
      return jsonStr;
    }
  }

  function recompressLocationsJsonForShare(jsonStr, includeSnapshots) {
    if (!jsonStr) return Promise.resolve(jsonStr);
    if (includeSnapshots === false) {
      return Promise.resolve(compactLocationsJson(jsonStr, false));
    }
    try {
      var locs = JSON.parse(jsonStr);
      if (!Array.isArray(locs)) return Promise.resolve(compactLocationsJson(jsonStr, includeSnapshots));
      return Promise.all(locs.map(function (loc) {
        var ex = expandLocation(loc);
        var snap = ex.map_snapshot;
        if (!snap) return Promise.resolve(compactLocation(ex, true));
        if (snapshotSize(snap) <= SHARE_SNAP_MAX_BYTES) {
          return Promise.resolve(compactLocation(ex, true));
        }
        return compressDataUrlForShare(snap, SHARE_SNAP_MAX_BYTES).then(function (packed) {
          return compactLocation(Object.assign({}, ex, {
            ms: packed.ms, mt: packed.mt, mw: packed.mw, mh: packed.mh,
            map_snapshot: packed.map_snapshot,
          }), true);
        }).catch(function () { return compactLocation(ex, false); });
      })).then(function (compacted) {
        var out = compacted.filter(Boolean);
        return out.length ? JSON.stringify(out) : undefined;
      });
    } catch (_) {
      return Promise.resolve(compactLocationsJson(jsonStr, includeSnapshots));
    }
  }

  function parseOsmUrl(url) {
    if (!url || typeof url !== 'string') return null;
    var s = url.trim();
    if (!/openstreetmap\.org/i.test(s)) return null;
    var mlat = s.match(/[?&]mlat=([-\d.]+)/i);
    var mlon = s.match(/[?&]mlon=([-\d.]+)/i);
    if (mlat && mlon) {
      return { lat: parseFloat(mlat[1]), lon: parseFloat(mlon[1]), zoom: 15, source: 'osm' };
    }
    var hash = s.match(/#map=(\d+(?:\.\d+)?)\/([-\d.]+)\/([-\d.]+)/);
    if (hash) {
      return { lat: parseFloat(hash[2]), lon: parseFloat(hash[3]), zoom: parseInt(hash[1], 10) || 15, source: 'osm' };
    }
    return null;
  }

  function parseGoogleUrl(url) {
    if (!url || typeof url !== 'string') return null;
    var s = url.trim();
    if (!/google\.[a-z.]+\/maps|maps\.google|goo\.gl\/maps|maps\.app\.goo\.gl/i.test(s)) return null;
    var at = s.match(/@([-\d.]+),([-\d.]+)(?:,(\d+(?:\.\d+)?)z)?/);
    if (at) {
      return { lat: parseFloat(at[1]), lon: parseFloat(at[2]), zoom: at[3] ? parseInt(at[3], 10) : 15, source: 'google' };
    }
    var d34 = s.match(/!3d([-\d.]+)!4d([-\d.]+)/);
    if (d34) {
      return { lat: parseFloat(d34[1]), lon: parseFloat(d34[2]), zoom: 15, source: 'google' };
    }
    var q = s.match(/[?&]q=([-\d.]+),([-\d.]+)/);
    if (q) return { lat: parseFloat(q[1]), lon: parseFloat(q[2]), zoom: 15, source: 'google' };
    var query = s.match(/[?&]query=([-\d.]+),([-\d.]+)/);
    if (query) return { lat: parseFloat(query[1]), lon: parseFloat(query[2]), zoom: 15, source: 'google' };
    var ll = s.match(/[?&]ll=([-\d.]+),([-\d.]+)/);
    if (ll) return { lat: parseFloat(ll[1]), lon: parseFloat(ll[2]), zoom: 15, source: 'google' };
    return null;
  }

  function parseAppleUrl(url) {
    if (!url || typeof url !== 'string') return null;
    var s = url.trim();
    if (!/maps\.apple\.com/i.test(s)) return null;
    var ll = s.match(/[?&]ll=([-\d.]+),([-\d.]+)/);
    if (ll) return { lat: parseFloat(ll[1]), lon: parseFloat(ll[2]), zoom: 15, source: 'apple' };
    var q = s.match(/[?&]q=([-\d.]+),([-\d.]+)/);
    if (q) return { lat: parseFloat(q[1]), lon: parseFloat(q[2]), zoom: 15, source: 'apple' };
    return null;
  }

  function parseMapUrl(url) {
    if (!url) return null;
    return parseOsmUrl(url) || parseGoogleUrl(url) || parseAppleUrl(url);
  }

  function resolveLocationCoords(loc) {
    if (!loc) return null;
    if (loc.lat != null && loc.lon != null && !isNaN(loc.lat) && !isNaN(loc.lon)) {
      return { lat: loc.lat, lon: loc.lon, zoom: loc.zoom || loc.z || 15, source: loc.map_source || 'stored' };
    }
    var urls = [loc.map_url || loc.u, loc.google_map_url || loc.g, loc.apple_map_url || loc.p];
    for (var i = 0; i < urls.length; i++) {
      var p = parseMapUrl(urls[i]);
      if (p) return p;
    }
    return null;
  }

  function formatCoords(lat, lon) {
    if (lat == null || lon == null || isNaN(lat) || isNaN(lon)) return '';
    return lat.toFixed(5) + ', ' + lon.toFixed(5);
  }

  function locationLabel(loc) {
    if (!loc) return 'Untitled site';
    return loc.title || loc.t || loc.address || loc.a || 'Untitled site';
  }

  function mapLinkForLocation(loc) {
    if (!loc) return '';
    var urls = [
      loc.map_url, loc.u,
      loc.google_map_url, loc.g,
      loc.apple_map_url, loc.p,
    ];
    for (var i = 0; i < urls.length; i++) {
      if (urls[i]) return urls[i];
    }
    var coords = resolveLocationCoords(loc);
    if (!coords) return '';
    var z = previewZoom(coords.zoom);
    return 'https://www.openstreetmap.org/?mlat=' + coords.lat + '&mlon=' + coords.lon +
      '#map=' + z + '/' + coords.lat + '/' + coords.lon;
  }

  function renderMapLinkOnly(mapHref) {
    if (!mapHref) return '';
    return (
      '<a class="map-preview-offline map-preview-clickable map-preview-link" href="' + _esc(mapHref) + '" ' +
        'target="_blank" rel="noopener noreferrer" aria-label="Open in maps">' +
        '<p class="map-preview-link-label">Map link</p>' +
        '<p class="map-preview-note">Click or tap to open in maps</p>' +
      '</a>'
    );
  }

  function renderPreview(lat, lon, zoom, width, height, mapHref) {
    if (lat == null || lon == null || isNaN(lat) || isNaN(lon)) return '';
    width  = width  || 280;
    height = height || 120;
    zoom   = previewZoom(zoom);
    var cx = width / 2;
    var cy = height / 2;
    var svg = (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + width + ' ' + height + '" width="100%" height="' + height + '" role="img">' +
        '<rect width="' + width + '" height="' + height + '" fill="#e8e4dc"/>' +
        '<g stroke="#c8c0b4" stroke-width="1">' +
          '<line x1="0" y1="' + (height * 0.33) + '" x2="' + width + '" y2="' + (height * 0.33) + '"/>' +
          '<line x1="0" y1="' + (height * 0.66) + '" x2="' + width + '" y2="' + (height * 0.66) + '"/>' +
          '<line x1="' + (width * 0.33) + '" y1="0" x2="' + (width * 0.33) + '" y2="' + height + '"/>' +
          '<line x1="' + (width * 0.66) + '" y1="0" x2="' + (width * 0.66) + '" y2="' + height + '"/>' +
        '</g>' +
        '<circle cx="' + cx + '" cy="' + cy + '" r="14" fill="rgba(192,71,10,.15)"/>' +
        '<circle cx="' + cx + '" cy="' + cy + '" r="5" fill="#c0470a"/>' +
        '<text x="8" y="' + (height - 8) + '" font-family="monospace" font-size="9" fill="#6a6058">' +
          _esc(formatCoords(lat, lon) + ' · z' + zoom) +
        '</text>' +
      '</svg>'
    );
    var note = '<p class="map-preview-note">Offline schematic — click or tap to open in maps</p>';
    if (mapHref) {
      return (
        '<a class="map-preview-offline map-preview-clickable map-preview-link" href="' + _esc(mapHref) + '" ' +
          'target="_blank" rel="noopener noreferrer" aria-label="Map preview — click or tap to open maps">' +
          svg + note +
        '</a>'
      );
    }
    return '<div class="map-preview-offline">' + svg + note + '</div>';
  }

  function renderSnapshot(dataUrl, width, height, mapHref) {
    if (!dataUrl) return '';
    width  = width  || 280;
    height = height || 120;
    var img = '<img src="' + _esc(dataUrl) + '" width="' + width + '" height="' + height + '" ' +
         'alt="Map snapshot" style="display:block;width:100%;height:' + height + 'px;object-fit:cover;">';
    var note = '<p class="map-preview-note">Click or tap map to open in maps app</p>';
    if (mapHref) {
      return (
        '<a class="map-preview-offline map-preview-enriched map-preview-clickable map-preview-link" href="' + _esc(mapHref) + '" ' +
          'target="_blank" rel="noopener noreferrer" aria-label="Map snapshot — click or tap to open maps">' +
          img + note +
        '</a>'
      );
    }
    return '<div class="map-preview-offline map-preview-enriched">' + img + note + '</div>';
  }

  function renderFetchableBlock(coords, link, width, height) {
    width  = width  || 280;
    height = height || 120;
    var schematic = renderPreview(coords.lat, coords.lon, coords.zoom, width, height, '');
    return '<div class="map-preview-fetchable" data-lat="' + coords.lat + '" data-lon="' + coords.lon + '" ' +
      'data-zoom="' + (coords.zoom || 15) + '" data-href="' + _esc(link || '') + '" ' +
      'data-width="' + width + '" data-height="' + height + '">' +
      schematic +
      '<div class="map-fetch-row">' +
        '<button type="button" class="map-fetch-btn">Fetch OSM map preview</button>' +
        '<span class="map-fetch-hint">Loads OpenStreetMap tiles once on your device</span>' +
      '</div>' +
    '</div>';
  }

  function bindFetchButtons(root) {
    var scope = root || document;
    scope.querySelectorAll('.map-preview-fetchable .map-fetch-btn').forEach(function (btn) {
      if (btn.dataset.bound === '1') return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', function () {
        var wrap = btn.closest('.map-preview-fetchable');
        if (!wrap || wrap.dataset.loading === '1') return;
        var lat = parseFloat(wrap.dataset.lat);
        var lon = parseFloat(wrap.dataset.lon);
        var zoom = parseInt(wrap.dataset.zoom, 10) || 15;
        var href = wrap.dataset.href || '';
        var w = parseInt(wrap.dataset.width, 10) || 280;
        var h = parseInt(wrap.dataset.height, 10) || 120;
        if (isNaN(lat) || isNaN(lon)) return;
        wrap.dataset.loading = '1';
        btn.disabled = true;
        btn.textContent = 'Fetching…';
        fetchEnrichedSnapshot(lat, lon, zoom, w, h).then(function (snap) {
          wrap.outerHTML = renderSnapshot(snap.map_snapshot, w, h, href);
        }).catch(function () {
          wrap.dataset.loading = '0';
          btn.disabled = false;
          btn.textContent = 'Fetch OSM map preview';
          var hint = wrap.querySelector('.map-fetch-hint');
          if (hint) hint.textContent = 'Could not load tiles — check connection';
        });
      });
    });
  }

  function renderLocationPreview(loc, width, height, opts) {
    opts = opts || {};
    var link  = mapLinkForLocation(loc);
    var notes = opts.includeNotes === false ? '' : (loc.notes || loc.n || '');
    var mapHtml = '';
    var useSnap = opts.useSnapshot !== false;
    var snap = useSnap ? snapshotFromLocation(loc) : null;
    if (snap) {
      var sw = (loc && loc.mw) || width || 280;
      var sh = (loc && loc.mh) || height || 120;
      mapHtml = renderSnapshot(snap, sw, sh, link);
    } else {
      var coords = resolveLocationCoords(loc);
      if (coords && opts.fetchable !== false) {
        mapHtml = renderFetchableBlock(coords, link, width, height);
      } else if (coords) {
        mapHtml = renderPreview(coords.lat, coords.lon, coords.zoom, width, height, link);
      } else if (link) {
        mapHtml = renderMapLinkOnly(link);
      } else {
        return '';
      }
    }
    if (!notes) return mapHtml;
    return mapHtml.replace(
      /<\/(div|a)>\s*$/,
      '<p class="map-preview-loc-note">' + _esc(notes) + '</p></$1>'
    );
  }

  function _fetchTileSnapshot(lat, lon, zoom, width, height, zoomOffset) {
    if (lat == null || lon == null) return Promise.reject(new Error('Coordinates required'));
    width  = width  || SHARE_SNAP_W;
    height = height || SHARE_SNAP_H;
    zoom   = zoom || 15;
    if (zoomOffset) zoom = previewZoom(zoom);
    zoom   = Math.max(1, Math.min(18, zoom));

    var center = _lonLatToWorldPx(lon, lat, zoom);
    var left   = center.x - width / 2;
    var top    = center.y - height / 2;
    var x0 = Math.floor(left / TILE_SIZE);
    var y0 = Math.floor(top / TILE_SIZE);
    var x1 = Math.floor((left + width - 1) / TILE_SIZE);
    var y1 = Math.floor((top + height - 1) / TILE_SIZE);

    var canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#e8e4dc';
    ctx.fillRect(0, 0, width, height);

    var jobs = [];
    for (var ty = y0; ty <= y1; ty++) {
      for (var tx = x0; tx <= x1; tx++) jobs.push({ tx: tx, ty: ty });
    }

    return Promise.all(jobs.map(function (job) {
      return _loadTile(zoom, job.tx, job.ty).then(function (img) {
        if (!img) return;
        ctx.drawImage(img, job.tx * TILE_SIZE - left, job.ty * TILE_SIZE - top);
      });
    })).then(function () {
      var cx = width / 2;
      var cy = height / 2;
      var scale = Math.min(width, height) / 600;
      var pinR  = Math.round((width > 400 ? 20 : 14) * Math.max(1, scale));
      var dotR  = Math.round((width > 400 ? 9 : 6) * Math.max(1, scale));
      var ringW = Math.max(3, Math.round(4 * scale));

      ctx.fillStyle = 'rgba(255,255,255,.92)';
      ctx.beginPath();
      ctx.arc(cx, cy, pinR + ringW, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(192,71,10,.38)';
      ctx.beginPath();
      ctx.arc(cx, cy, pinR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#19140f';
      ctx.lineWidth = ringW;
      ctx.beginPath();
      ctx.arc(cx, cy, dotR + 1, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#c0470a';
      ctx.beginPath();
      ctx.arc(cx, cy, dotR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      ctx.beginPath();
      ctx.arc(cx - dotR * 0.28, cy - dotR * 0.28, Math.max(2, dotR * 0.35), 0, Math.PI * 2);
      ctx.fill();
      return canvas;
    });
  }

  function fetchEnrichedSnapshot(lat, lon, zoom, width, height) {
    return _fetchTileSnapshot(lat, lon, zoom, width, height, true).then(function (canvas) {
      var packed = _compressCanvas(canvas, SHARE_SNAP_MAX_BYTES);
      if (!packed) throw new Error('Snapshot compress failed');
      return {
        ms: packed.ms,
        mt: packed.mt,
        mw: packed.mw,
        mh: packed.mh,
        map_snapshot: packed.map_snapshot,
      };
    });
  }

  function fetchPostcardSnapshot(lat, lon, zoom, width, height) {
    return _fetchTileSnapshot(lat, lon, zoom, width, height, false).then(function (canvas) {
      var dataUrl = canvas.toDataURL('image/png');
      return {
        map_snapshot: dataUrl,
        mw: canvas.width,
        mh: canvas.height,
      };
    });
  }

  function _esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  return {
    SHARE_SNAP_MAX_BYTES: SHARE_SNAP_MAX_BYTES,
    parseOsmUrl: parseOsmUrl,
    parseGoogleUrl: parseGoogleUrl,
    parseAppleUrl: parseAppleUrl,
    parseMapUrl: parseMapUrl,
    resolveLocationCoords: resolveLocationCoords,
    formatCoords: formatCoords,
    previewZoom: previewZoom,
    locationLabel: locationLabel,
    mapLinkForLocation: mapLinkForLocation,
    snapshotToDataUrl: snapshotToDataUrl,
    snapshotFromLocation: snapshotFromLocation,
    snapshotSize: snapshotSize,
    compressDataUrlForShare: compressDataUrlForShare,
    expandLocation: expandLocation,
    expandLocationsJson: expandLocationsJson,
    compactLocation: compactLocation,
    compactLocationsJson: compactLocationsJson,
    recompressLocationsJsonForShare: recompressLocationsJsonForShare,
    renderPreview: renderPreview,
    renderSnapshot: renderSnapshot,
    renderLocationPreview: renderLocationPreview,
    renderFetchableBlock: renderFetchableBlock,
    bindFetchButtons: bindFetchButtons,
    fetchEnrichedSnapshot: fetchEnrichedSnapshot,
    fetchPostcardSnapshot: fetchPostcardSnapshot,
  };
}());
