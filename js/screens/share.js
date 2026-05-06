/* ============================================================
   ShareScreen — encode record to URL, copy to clipboard
   ============================================================ */

var ShareScreen = (function () {
  'use strict';

  var _record      = null;
  var _url         = '';
  var _shareType   = 'job';
  var _shareView   = 'simple';  // 'simple' (p/index.html) | 'full' (customer.html)
  var _expenses    = [];
  var _payments    = [];
  var _includeFin      = false;
  var _includeStory    = true;
  var _includeDetails  = false;  // private notes — off by default
  var _includeCustomer = true;   // customer name, contact, location — on by default
  var _finSummary      = '';
  var _stylesAdded     = false;

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

      '.share-url-top-row {',
      '  display:flex; align-items:baseline; justify-content:space-between;',
      '  margin-bottom:4px;',
      '}',
      '.share-url-prefix {',
      '  font-family:var(--font-mono); font-size:11px;',
      '  color:rgba(240,237,230,.35); letter-spacing:.04em;',
      '}',

      '.share-url-payload {',
      '  font-family:var(--font-mono); font-size:12px;',
      '  color:rgba(240,237,230,.85); word-break:break-all;',
      '  line-height:1.55; letter-spacing:.02em;',
      '}',

      '.share-url-hint {',
      '  font-family:var(--font-mono); font-size:10px;',
      '  font-weight:700; letter-spacing:.1em; text-transform:uppercase;',
      '  color:rgba(240,237,230,.3);',
      '  pointer-events:none; flex-shrink:0; margin-left:12px;',
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

      '.share-type-row {',
      '  display:flex; gap:6px; margin-bottom:16px; flex-wrap:wrap;',
      '}',
      '.share-type-btn {',
      '  font-family:var(--font-mono); font-size:10px; font-weight:700;',
      '  letter-spacing:.08em; text-transform:uppercase;',
      '  color:var(--ink-muted); border:1.5px solid var(--rule);',
      '  border-radius:3px; padding:5px 12px; cursor:pointer;',
      '  transition:color .13s, border-color .13s, background .13s;',
      '  background:none;',
      '}',
      '.share-type-btn.active {',
      '  color:var(--stamp); border-color:var(--stamp-border); background:var(--stamp-light);',
      '}',
      '.share-type-btn:hover:not(.active) {',
      '  border-color:var(--ink-faint); color:var(--ink-mid);',
      '}',
      '.share-type-label {',
      '  font-family:var(--font-mono); font-size:9px; font-weight:700;',
      '  letter-spacing:.14em; text-transform:uppercase; color:var(--ink-muted);',
      '  margin-bottom:8px;',
      '}',

      '.share-fin-row {',
      '  display:flex; align-items:center; gap:10px;',
      '  margin-bottom:20px; padding:10px 14px;',
      '  border:1.5px solid var(--rule); border-radius:3px;',
      '  cursor:pointer; user-select:none; transition:border-color .13s;',
      '}',
      '.share-fin-row:hover { border-color:var(--ink-faint); }',
      '.share-fin-row.active { border-color:var(--stamp-border); background:var(--stamp-light); }',
      '.share-fin-check {',
      '  width:14px; height:14px; flex-shrink:0;',
      '  border:1.5px solid var(--rule); border-radius:2px;',
      '  display:flex; align-items:center; justify-content:center;',
      '  font-size:10px; color:var(--stamp); transition:border-color .13s;',
      '}',
      '.share-fin-row.active .share-fin-check { border-color:var(--stamp-border); }',
      '.share-fin-text { flex:1; }',
      '.share-fin-label {',
      '  font-family:var(--font-mono); font-size:10px; font-weight:700;',
      '  letter-spacing:.06em; color:var(--ink);',
      '}',
      '.share-fin-meta {',
      '  font-family:var(--font-mono); font-size:9px; color:var(--ink-muted);',
      '  margin-top:2px;',
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
      _record     = r;
      _shareType  = r.record_type || 'job';
      _shareView  = 'simple';
      _expenses   = [];
      _payments   = [];
      _finSummary      = '';
      _includeFin      = (_shareType === 'quote' || _shareType === 'invoice');
      _includeStory    = true;
      _includeDetails  = false;
      _includeCustomer = true;
      _loadFin().then(function () {
        _encodeUrl();
        _render();
      });
    });
  }

  function onHide() {
    _record     = null;
    _url        = '';
    _shareType  = 'job';
    _shareView  = 'simple';
    _expenses   = [];
    _payments   = [];
    _finSummary      = '';
    _includeFin      = false;
    _includeStory    = true;
    _includeDetails  = false;
    _includeCustomer = true;
  }

  function _loadFin() {
    return RecordService.list().then(function (all) {
      var id = _record.id;
      // COGS expenses are internal — never expose to customer
      _expenses = all.filter(function (r) {
        return r.parentId === id && r.recordType === 'expense' && r.expense_billing !== 'cogs';
      });
      _payments = all.filter(function (r) { return r.parentId === id && r.recordType === 'payment'; });
      // If this record has any line items, default to including them regardless of record type
      if (_expenses.length || _payments.length) _includeFin = true;
      var parts = [];
      if (_expenses.length) parts.push(_expenses.length + ' expense' + (_expenses.length !== 1 ? 's' : ''));
      if (_payments.length) parts.push(_payments.length + ' payment' + (_payments.length !== 1 ? 's' : ''));
      _finSummary = parts.join(' \xb7 ');
    });
  }

  function _encodeUrl() {
    try {
      var recForEncode = Object.assign({}, _record, {
        record_type: _shareType === 'job' ? undefined : _shareType,
      });
      if (!_includeStory)    delete recForEncode.story;
      if (!_includeDetails)  delete recForEncode.details;
      if (!_includeCustomer) {
        delete recForEncode.customer;
        delete recForEncode.customer_phone;
        delete recForEncode.location;
        delete recForEncode.worker;
        delete recForEncode.participants;
      }
      var finOpts = (_includeFin && (_expenses.length || _payments.length))
        ? { expenses: _expenses, payments: _payments }
        : null;
      var fragment = RecordService.encodeUrl(recForEncode, finOpts);
      if (_shareView === 'full') {
        fragment = fragment.replace('workpads.me/p#', 'workpads.me/p/customer.html#');
      }
      _url = 'https://' + fragment;
    } catch (e) {
      _url = '';
    }
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

    // Share-as type selector
    var shareTypes = [
      { val: 'job',     label: 'Job record' },
      { val: 'quote',   label: 'Quote' },
      { val: 'invoice', label: 'Invoice' },
    ];
    html += '<div class="share-type-label">Share as</div>';
    html += '<div class="share-type-row" id="share-type-row">';
    shareTypes.forEach(function (t) {
      html += '<button type="button" class="share-type-btn' +
              (t.val === _shareType ? ' active' : '') +
              '" data-type="' + t.val + '">' + t.label + '</button>';
    });
    html += '</div>';

    // View layout selector
    html += '<div class="share-type-label">View layout</div>';
    html += '<div class="share-type-row" id="share-view-row">';
    html += '<button type="button" class="share-type-btn' + (_shareView === 'simple' ? ' active' : '') + '" data-view="simple">Simple</button>';
    html += '<button type="button" class="share-type-btn' + (_shareView === 'full'   ? ' active' : '') + '" data-view="full">Full screen</button>';
    html += '</div>';

    // Financials toggle (only when fin data available)
    if (_expenses.length || _payments.length) {
      html += '<div class="share-fin-row' + (_includeFin ? ' active' : '') + '" id="share-fin-toggle">' +
        '<div class="share-fin-check">' + (_includeFin ? '\u2713' : '') + '</div>' +
        '<div class="share-fin-text">' +
          '<div class="share-fin-label">Include expenses &amp; payments</div>' +
          '<div class="share-fin-meta">' + _finSummary + (_shareView === 'full' ? ' \xb7 sidebar' : ' \xb7 inline') + '</div>' +
        '</div>' +
      '</div>';
    }

    // Story opt-in (only when record has story)
    if (_record.story) {
      html += '<div class="share-fin-row' + (_includeStory ? ' active' : '') + '" id="share-story-toggle">' +
        '<div class="share-fin-check">' + (_includeStory ? '\u2713' : '') + '</div>' +
        '<div class="share-fin-text">' +
          '<div class="share-fin-label">Include story</div>' +
          '<div class="share-fin-meta">' + _esc(_record.story.slice(0, 60)) + (_record.story.length > 60 ? '\u2026' : '') + '</div>' +
        '</div>' +
      '</div>';
    }

    // Details opt-in (only when record has details — private notes, default OFF)
    if (_record.details) {
      html += '<div class="share-fin-row' + (_includeDetails ? ' active' : '') + '" id="share-details-toggle">' +
        '<div class="share-fin-check">' + (_includeDetails ? '\u2713' : '') + '</div>' +
        '<div class="share-fin-text">' +
          '<div class="share-fin-label">Include private notes</div>' +
          '<div class="share-fin-meta">' + _esc(_record.details.slice(0, 60)) + (_record.details.length > 60 ? '\u2026' : '') + '</div>' +
        '</div>' +
      '</div>';
    }

    // Customer & contact info toggle (always shown)
    var hasCustomerInfo = !!((_record.customer || _record.customer_phone || _record.location || _record.worker ||
      (_record.participants && _record.participants.length)));
    if (hasCustomerInfo) {
      var customerMeta = [_record.customer, _record.location].filter(Boolean).join(' \xb7 ');
      html += '<div class="share-fin-row' + (_includeCustomer ? ' active' : '') + '" id="share-customer-toggle">' +
        '<div class="share-fin-check">' + (_includeCustomer ? '\u2713' : '') + '</div>' +
        '<div class="share-fin-text">' +
          '<div class="share-fin-label">Include customer &amp; contact info</div>' +
          '<div class="share-fin-meta">' + (customerMeta ? _esc(customerMeta) : 'Name, location, phone, workers') + '</div>' +
        '</div>' +
      '</div>';
    }

    // URL box
    var urlPrefix = _shareView === 'full' ? 'https://workpads.me/p/customer.html#' : 'https://workpads.me/p#';
    html += '<div class="share-url-box" id="share-url-box" title="Click to copy">';
    html += '<div class="share-url-top-row">';
    html += '<span class="share-url-prefix" id="share-url-prefix">' + urlPrefix + '</span>';
    html += '<span class="share-url-hint">Click to copy</span>';
    html += '</div>';
    html += '<div class="share-url-payload">' + _esc((_url.split('#')[1]) || '') + '</div>';
    html += '</div>';

    // Meta stats
    html += '<div class="share-meta-row">';
    html += _metaItem('Characters', String(charCount));
    html += _metaItem('Payload', dataLen + '\u00a0chars');
    html += _metaItem('Codec', 'pads-v1 \xb7 1cg');
    html += '</div>';

    // Action buttons
    html += '<div class="share-actions">';
    html += '<button class="btn-primary" id="share-copy-btn">Copy link</button>';
    html += '<a class="btn-ghost" id="share-open-link" href="' + _esc(_url) + '" target="_blank" rel="noopener">Open in tab</a>';
    html += '<button class="btn-ghost" id="share-back-btn">Back to record</button>';
    html += '</div>';

    // Attribution
    html += '<div class="share-attribution">';
    html += 'Workpads v0.1.0 \xb7 pads-v1 \xb7 1cg \xb7 workpads.me';
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

    var typeRow = document.getElementById('share-type-row');
    if (typeRow) {
      typeRow.addEventListener('click', function (e) {
        var btn = e.target.closest('.share-type-btn');
        if (!btn) return;
        _shareType = btn.dataset.type;
        document.querySelectorAll('.share-type-btn').forEach(function (b) {
          b.classList.toggle('active', b.dataset.type === _shareType);
        });
        // Auto-enable fin for financial document types
        if (_expenses.length || _payments.length) {
          _includeFin = (_shareType === 'quote' || _shareType === 'invoice');
          _syncFinToggle();
        }
        _encodeUrl();
        _syncUrlDisplay();
      });
    }

    var viewRow = document.getElementById('share-view-row');
    if (viewRow) {
      viewRow.addEventListener('click', function (e) {
        var btn = e.target.closest('.share-type-btn');
        if (!btn) return;
        _shareView = btn.dataset.view;
        viewRow.querySelectorAll('.share-type-btn').forEach(function (b) {
          b.classList.toggle('active', b.dataset.view === _shareView);
        });
        _encodeUrl();
        _syncUrlDisplay();
        // Update fin meta label
        var finMeta = document.querySelector('#share-fin-toggle .share-fin-meta');
        if (finMeta) {
          finMeta.textContent = _finSummary + (_shareView === 'full' ? ' \xb7 sidebar' : ' \xb7 inline');
        }
      });
    }

    var finToggle = document.getElementById('share-fin-toggle');
    if (finToggle) {
      finToggle.addEventListener('click', function () {
        _includeFin = !_includeFin;
        _syncFinToggle();
        _encodeUrl();
        _syncUrlDisplay();
      });
    }

    var storyToggle = document.getElementById('share-story-toggle');
    if (storyToggle) {
      storyToggle.addEventListener('click', function () {
        _includeStory = !_includeStory;
        storyToggle.classList.toggle('active', _includeStory);
        var check = storyToggle.querySelector('.share-fin-check');
        if (check) check.textContent = _includeStory ? '\u2713' : '';
        _encodeUrl();
        _syncUrlDisplay();
      });
    }

    var detailsToggle = document.getElementById('share-details-toggle');
    if (detailsToggle) {
      detailsToggle.addEventListener('click', function () {
        _includeDetails = !_includeDetails;
        detailsToggle.classList.toggle('active', _includeDetails);
        var check = detailsToggle.querySelector('.share-fin-check');
        if (check) check.textContent = _includeDetails ? '\u2713' : '';
        _encodeUrl();
        _syncUrlDisplay();
      });
    }

    var customerToggle = document.getElementById('share-customer-toggle');
    if (customerToggle) {
      customerToggle.addEventListener('click', function () {
        _includeCustomer = !_includeCustomer;
        customerToggle.classList.toggle('active', _includeCustomer);
        var check = customerToggle.querySelector('.share-fin-check');
        if (check) check.textContent = _includeCustomer ? '\u2713' : '';
        _encodeUrl();
        _syncUrlDisplay();
      });
    }
  }

  function _syncFinToggle() {
    var row = document.getElementById('share-fin-toggle');
    if (!row) return;
    row.classList.toggle('active', _includeFin);
    var check = row.querySelector('.share-fin-check');
    if (check) check.textContent = _includeFin ? '\u2713' : '';
  }

  function _syncUrlDisplay() {
    var charCount = _url.length;
    var dataLen   = (_url.split('#')[1] || '').length;
    var prefixEl  = document.getElementById('share-url-prefix');
    var payloadEl = document.querySelector('.share-url-payload');
    var urlPrefix = _shareView === 'full' ? 'https://workpads.me/p/customer.html#' : 'https://workpads.me/p#';
    if (prefixEl)  prefixEl.textContent  = urlPrefix;
    if (payloadEl) payloadEl.textContent = (_url.split('#')[1]) || '';
    var metaVals = document.querySelectorAll('.share-meta-value');
    if (metaVals[0]) metaVals[0].textContent = String(charCount);
    if (metaVals[1]) metaVals[1].textContent = dataLen + '\u00a0chars';
    var openLink = document.getElementById('share-open-link');
    if (openLink) openLink.href = _url;
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
