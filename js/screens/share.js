/* ============================================================
   ShareScreen — encode record to URL, copy to clipboard
   ============================================================ */

var ShareScreen = (function () {
  'use strict';

  var _record      = null;
  var _url         = '';
  var _stylesAdded = false;

  // ── Styles ───────────────────────────────────────────────────

  function _addStyles() {
    if (_stylesAdded) return;
    _stylesAdded = true;
    var s = document.createElement('style');
    s.textContent = [
      '.share-wrap { max-width:620px; margin:0 auto; padding:36px 32px 80px; }',

      '.share-url-box {',
      '  background:var(--ink); border-radius:4px;',
      '  padding:20px 22px; margin:24px 0; cursor:pointer;',
      '  transition:background .13s; position:relative; overflow:hidden;',
      '}',
      '.share-url-box:hover { background:#2a2420; }',

      '.share-url-prefix {',
      '  font-family:var(--font-mono); font-size:11px;',
      '  color:rgba(240,237,230,.35); letter-spacing:.04em;',
      '  margin-bottom:4px;',
      '}',

      '.share-url-payload {',
      '  font-family:var(--font-mono); font-size:12px;',
      '  color:rgba(240,237,230,.85); word-break:break-all;',
      '  line-height:1.55; letter-spacing:.02em;',
      '}',

      '.share-url-hint {',
      '  position:absolute; top:50%; right:20px;',
      '  transform:translateY(-50%);',
      '  font-family:var(--font-mono); font-size:10px;',
      '  font-weight:700; letter-spacing:.1em; text-transform:uppercase;',
      '  color:rgba(240,237,230,.3);',
      '  pointer-events:none;',
      '}',

      '.share-meta-row {',
      '  display:flex; gap:24px; flex-wrap:wrap;',
      '  margin-bottom:28px;',
      '}',
      '.share-meta-item { }',
      '.share-meta-label {',
      '  font-family:var(--font-mono); font-size:9px; font-weight:700;',
      '  letter-spacing:.18em; text-transform:uppercase; color:var(--ink-muted);',
      '  margin-bottom:4px;',
      '}',
      '.share-meta-value {',
      '  font-family:var(--font-mono); font-size:14px;',
      '  font-weight:700; color:var(--ink);',
      '}',

      '.share-actions { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:36px; }',

      '.share-attribution {',
      '  border-top:1px solid var(--rule-light); padding-top:20px;',
      '  font-family:var(--font-mono); font-size:10px;',
      '  color:var(--ink-faint); letter-spacing:.06em;',
      '}',
    ].join('\n');
    document.head.appendChild(s);
  }

  // ── Lifecycle ────────────────────────────────────────────────

  function onShow(params) {
    _addStyles();
    if (!params || !params.id) { App.showList(); return; }

    RecordService.get(params.id).then(function (r) {
      if (!r) { App.showList(); return; }
      _record = r;

      try {
        var fragment = RecordService.encodeUrl(r);
        _url = 'https://' + fragment;
      } catch (e) {
        _url = '';
      }

      _render();
    });
  }

  function onHide() {
    _record = null;
    _url    = '';
  }

  // ── Render ───────────────────────────────────────────────────

  function _render() {
    var el = document.getElementById('screen-share');

    if (!_url) {
      el.innerHTML = (
        '<div class="share-wrap">' +
          '<h1 class="screen-title">Share</h1>' +
          '<p style="font-family:var(--font-body);color:var(--ink-mid);margin-top:16px;">' +
            'Could not encode this record. Make sure the Job field is filled in.' +
          '</p>' +
          '<div style="margin-top:20px;">' +
            '<button class="btn-ghost" id="share-back">Back to record</button>' +
          '</div>' +
        '</div>'
      );
      var backBtn = document.getElementById('share-back');
      if (backBtn) backBtn.addEventListener('click', function () {
        App.showView(_record.id);
      });
      return;
    }

    var charCount = _url.length;
    var dataLen   = (_url.split('#')[1] || '').length;

    var html = '<div class="share-wrap">';

    // Header
    html += '<h1 class="screen-title">Share workpad</h1>';
    html += '<p class="screen-subtitle">' + _esc(_record.job || 'Untitled') + '</p>';

    // URL box
    html += '<div class="share-url-box" id="share-url-box" title="Click to copy">';
    html += '<div class="share-url-prefix">https://workpads.me/p#</div>';
    html += '<div class="share-url-payload">' + _esc((_url.split('#')[1]) || '') + '</div>';
    html += '<span class="share-url-hint">Click to copy</span>';
    html += '</div>';

    // Meta stats
    html += '<div class="share-meta-row">';
    html += _metaItem('Characters', String(charCount));
    html += _metaItem('Payload', dataLen + '\u00a0chars');
    html += _metaItem('Codec', 'bitpad-v1');
    html += '</div>';

    // Action buttons
    html += '<div class="share-actions">';
    html += '<button class="btn-primary" id="share-copy-btn">Copy link</button>';
    html += '<a class="btn-ghost" id="share-open-link" href="' + _esc(_url) + '" target="_blank" rel="noopener">Open in tab</a>';
    html += '<button class="btn-ghost" id="share-back-btn">Back to record</button>';
    html += '</div>';

    // Attribution
    html += '<div class="share-attribution">';
    html += 'Workpads v0.1.0 \xb7 bitpad-v1 codec \xb7 workpads.me';
    html += '</div>';

    html += '</div>'; // .share-wrap
    el.innerHTML = html;
    _bindEvents();
  }

  function _metaItem(label, value) {
    return (
      '<div class="share-meta-item">' +
        '<div class="share-meta-label">' + label + '</div>' +
        '<div class="share-meta-value">' + value + '</div>' +
      '</div>'
    );
  }

  // ── Events ───────────────────────────────────────────────────

  function _bindEvents() {
    var urlBox  = document.getElementById('share-url-box');
    var copyBtn = document.getElementById('share-copy-btn');
    var backBtn = document.getElementById('share-back-btn');

    if (urlBox)  urlBox.addEventListener('click',  _copyUrl);
    if (copyBtn) copyBtn.addEventListener('click', _copyUrl);
    if (backBtn) backBtn.addEventListener('click', function () {
      App.showView(_record.id);
    });
  }

  function _copyUrl() {
    if (!_url) return;

    var fallback = function () {
      var ta = document.createElement('textarea');
      ta.value = _url;
      ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (e) { /* ignore */ }
      document.body.removeChild(ta);
      App.toast('Link copied');
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(_url).then(function () {
        App.toast('Link copied \u2014 send it anywhere');
      }).catch(fallback);
    } else {
      fallback();
    }
  }

  // ── Helpers ──────────────────────────────────────────────────

  function _esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── Public ───────────────────────────────────────────────────

  return { onShow: onShow, onHide: onHide };

}());
