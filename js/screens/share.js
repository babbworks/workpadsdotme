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
  var _includeFinStats = true;   // show derived analysis on receiver — on by default
  var _includeStory    = true;
  var _includeDetails  = false;  // private notes — off by default
  var _includeCustomer = true;   // customer name, contact, location — on by default
  var _includeContact  = false;  // pad share: optional contact fields
  var _contactName     = '';
  var _contactPhone    = '';
  var _encodedContact  = { name: '', phone: '' };
  var _finSummary      = '';
  var _stylesAdded     = false;

  // ── Styles ───────────────────────────────────────────────────

  function _addStyles() {
    if (_stylesAdded) return;
    _stylesAdded = true;
    var s = document.createElement('style');
    s.textContent = [
      '.share-wrap { max-width:620px; margin:0 auto; padding:36px 32px 80px; }',
      '.share-encrypt-notice {',
      '  font-family:var(--font-mono); font-size:11px; line-height:1.5;',
      '  color:var(--ink-mid); background:var(--stamp-light);',
      '  border:1px solid #e8c4aa; border-radius:4px;',
      '  padding:12px 14px; margin-bottom:22px;',
      '}',
      '.share-origin-notice {',
      '  font-family:var(--font-mono); font-size:10px; line-height:1.45;',
      '  color:var(--ink-muted); margin-bottom:14px;',
      '}',
      '.share-url-warn {',
      '  font-family:var(--font-mono); font-size:11px; line-height:1.45;',
      '  color:var(--stamp); background:var(--stamp-light); border:1px solid #e8c4aa;',
      '  border-radius:4px; padding:10px 12px; margin-bottom:14px;',
      '}',

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

      /* Financial options outlined box */
      '.share-fin-options-box {',
      '  border:1.5px solid var(--rule); border-radius:4px;',
      '  margin-bottom:20px; overflow:hidden;',
      '}',
      '.share-fin-options-header {',
      '  font-family:var(--font-mono); font-size:9px; font-weight:700;',
      '  letter-spacing:.14em; text-transform:uppercase; color:var(--ink-muted);',
      '  padding:8px 12px 6px; border-bottom:1px solid var(--rule-light);',
      '  background:var(--paper);',
      '}',
      '.share-fin-option {',
      '  display:flex; align-items:center; gap:10px;',
      '  padding:8px 12px; cursor:pointer; user-select:none;',
      '  border-bottom:1px solid var(--rule-light); transition:background .12s;',
      '}',
      '.share-fin-option:last-child { border-bottom:none; }',
      '.share-fin-option:hover { background:var(--stamp-light); }',
      '.share-fin-option.active { background:var(--stamp-light); }',
      '.share-fin-opt-check {',
      '  width:13px; height:13px; flex-shrink:0;',
      '  border:1.5px solid var(--rule); border-radius:2px;',
      '  display:flex; align-items:center; justify-content:center;',
      '  font-size:9px; color:var(--stamp); transition:border-color .13s;',
      '}',
      '.share-fin-option.active .share-fin-opt-check { border-color:var(--stamp-border); }',
      '.share-fin-opt-label {',
      '  font-family:var(--font-mono); font-size:10px; font-weight:700;',
      '  letter-spacing:.04em; color:var(--ink); flex:1;',
      '}',
      '.share-fin-opt-note {',
      '  font-family:var(--font-mono); font-size:9px; color:var(--ink-faint);',
      '}',

      '.share-contact-fields {',
      '  margin:-8px 0 16px; padding:12px 14px;',
      '  border:1.5px solid var(--rule); border-radius:3px;',
      '  background:var(--paper);',
      '}',
      '.share-contact-fields .field-group { margin-bottom:10px; }',
      '.share-contact-fields .field-group:last-child { margin-bottom:0; }',
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
      _includeDetails  = (r.record_class === 'plan');
      _includeCustomer = !_isReducedShare(r);
      _includeContact  = false;
      _contactName     = '';
      _contactPhone    = '';
      _encodedContact  = { name: '', phone: '' };
      _loadFin().then(function () {
        return _refreshUrl();
      }).then(function () {
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
    _includeFinStats = true;
    _includeStory    = true;
    _includeDetails  = false;
    _includeCustomer = true;
    _includeContact  = false;
    _contactName     = '';
    _contactPhone    = '';
    _encodedContact  = { name: '', phone: '' };
  }

  function _isReducedShare(rec) {
    var r = rec || _record;
    if (!r) return false;
    var cls = r.record_class || 'work';
    return cls !== 'work';
  }

  function _padShareLabel() {
    var cls = (_record && _record.record_class) || 'work';
    return { field: 'field visit', note: 'memo', plan: 'plan' }[cls] || 'workpad';
  }

  function _contactFieldsDirty() {
    if (!_includeContact) return false;
    return _contactName !== _encodedContact.name || _contactPhone !== _encodedContact.phone;
  }

  function _contactFieldsReady() {
    return _includeContact && (_contactName.trim() || _contactPhone.trim());
  }

  function _copyBtnLabel() {
    if (_isReducedShare() && _contactFieldsReady() && _contactFieldsDirty()) {
      return 'Recreate link';
    }
    return 'Copy link';
  }

  function _loadFin() {
    return RecordService.list().then(function (all) {
      var id = _record.id;
      // COGS expenses are internal — never expose to customer
      _expenses = all.filter(function (r) {
        return r.parentId === id && r.recordType === 'expense' && r.expense_billing !== 'cogs';
      });
      _payments = all.filter(function (r) { return r.parentId === id && r.recordType === 'payment'; });
      if (!_isReducedShare() && (_expenses.length || _payments.length)) _includeFin = true;
      var parts = [];
      if (_expenses.length) parts.push(_expenses.length + ' expense' + (_expenses.length !== 1 ? 's' : ''));
      if (_payments.length) parts.push(_payments.length + ' payment' + (_payments.length !== 1 ? 's' : ''));
      _finSummary = parts.join(' \xb7 ');
    });
  }

  function _isLocationPad() {
    var cls = (_record && _record.record_class) || 'work';
    return cls === 'field' || cls === 'plan';
  }

  function _encodeUrl(locationsJson) {
    try {
      var recForEncode = Object.assign({}, _record, {
        record_type: _shareType === 'job' ? undefined : _shareType,
      });
      if (locationsJson !== undefined) recForEncode._locations_json = locationsJson;
      if (!_includeStory)    delete recForEncode.story;
      if (!_includeDetails)  delete recForEncode.details;
      if (_isReducedShare()) {
        delete recForEncode.customer;
        // Field/plan addresses travel via pads-ext (and codec location when present)
        var padCls = recForEncode.record_class || 'work';
        if (padCls !== 'field' && padCls !== 'plan') {
          delete recForEncode.location;
        }
        delete recForEncode.participants;
        delete recForEncode.amount;
        delete recForEncode.currency;
        delete recForEncode.vat;
        if (_includeContact) {
          if (_contactName.trim())  recForEncode.worker = _contactName.trim();
          if (_contactPhone.trim()) recForEncode.customer_phone = _contactPhone.trim();
        } else {
          delete recForEncode.worker;
          delete recForEncode.customer_phone;
        }
      } else if (!_includeCustomer) {
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
      _url = RecordService.shareUrlFromCodec(fragment, _shareView);
    } catch (e) {
      _url = '';
    }
  }

  function _refreshUrl() {
    if (!_record) return Promise.resolve();
    if (!_record._locations_json || typeof MapUtils === 'undefined') {
      _encodeUrl();
      return Promise.resolve();
    }
    return MapUtils.recompressLocationsJsonForShare(_record._locations_json, false)
      .then(function (json) { _encodeUrl(json); })
      .catch(function () { _encodeUrl(); });
  }

  function _reencode() {
    return _refreshUrl().then(_syncUrlDisplay);
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

    var reduced = _isReducedShare();

    // Header
    html += '<h1 class="screen-title">' + (reduced ? 'Share ' + _padShareLabel() : 'Share workpad') + '</h1>';
    var sealed = (typeof WorkpadsEncrypt !== 'undefined') && WorkpadsEncrypt.isSealed(_record);
    html += '<p class="screen-subtitle">' + _esc(sealed ? 'Encrypted workpad' : (_record.job || 'Untitled')) + '</p>';

    if (sealed) {
      html += '<div class="share-encrypt-notice">' +
        'This link contains only encrypted data. Send your passphrase to the recipient separately — ' +
        'by text, call, or in person. It is not included in the link.' +
      '</div>';
    }

    if (!reduced) {
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
    } else {
      html += '<p style="font-family:var(--font-mono);font-size:10px;color:var(--ink-muted);margin-bottom:18px;">Simple view \xb7 full screen</p>';
    }

    // Financial options (work pads only)
    if (!reduced && (_expenses.length || _payments.length || _record.amount)) {
      html += '<div class="share-fin-options-box" id="share-fin-options-box">';
      html += '<div class="share-fin-options-header">Financial options</div>';
      // Full financial summary (line items)
      if (_expenses.length || _payments.length) {
        html += '<div class="share-fin-option' + (_includeFin ? ' active' : '') + '" id="share-fin-toggle">' +
          '<div class="share-fin-opt-check">' + (_includeFin ? '\u2713' : '') + '</div>' +
          '<span class="share-fin-opt-label">Full financial summary</span>' +
          '<span class="share-fin-opt-note">' + _finSummary + '</span>' +
        '</div>';
      }
      // Financial analysis stats (derived on receiver from included data)
      html += '<div class="share-fin-option' + (_includeFinStats ? ' active' : '') + '" id="share-fin-stats-toggle">' +
        '<div class="share-fin-opt-check">' + (_includeFinStats ? '\u2713' : '') + '</div>' +
        '<span class="share-fin-opt-label">Financial analysis</span>' +
        '<span class="share-fin-opt-note">Margin \xb7 Pass-through</span>' +
      '</div>';
      html += '</div>'; // .share-fin-options-box
    }

    // Story / notes opt-in (only when record has story)
    if (_record.story) {
      var storyShareLabel = { field: 'Include activity notes', note: 'Include summary', plan: 'Include general plan' };
      var storyLbl = storyShareLabel[_record.record_class] || 'Include story';
      html += '<div class="share-fin-row' + (_includeStory ? ' active' : '') + '" id="share-story-toggle">' +
        '<div class="share-fin-check">' + (_includeStory ? '\u2713' : '') + '</div>' +
        '<div class="share-fin-text">' +
          '<div class="share-fin-label">' + storyLbl + '</div>' +
          '<div class="share-fin-meta">' + _esc(_record.story.slice(0, 60)) + (_record.story.length > 60 ? '\u2026' : '') + '</div>' +
        '</div>' +
      '</div>';
    }

    // Details opt-in (plan: context details; work: private notes)
    if (_record.details) {
      var detailsLabel = (_record.record_class === 'plan') ? 'Include details' : 'Include private notes';
      var detailsHint  = (_record.record_class === 'plan')
        ? 'Constraints, resources, risks — from the Details tab'
        : 'Internal notes — off by default';
      html += '<div class="share-fin-row' + (_includeDetails ? ' active' : '') + '" id="share-details-toggle">' +
        '<div class="share-fin-check">' + (_includeDetails ? '\u2713' : '') + '</div>' +
        '<div class="share-fin-text">' +
          '<div class="share-fin-label">' + detailsLabel + '</div>' +
          '<div class="share-fin-meta">' + _esc(_record.details.slice(0, 60)) + (_record.details.length > 60 ? '\u2026' : '') +
            ' · ' + detailsHint + '</div>' +
        '</div>' +
      '</div>';
    }

    if (reduced) {
      html += '<div class="share-fin-row' + (_includeContact ? ' active' : '') + '" id="share-contact-toggle">' +
        '<div class="share-fin-check">' + (_includeContact ? '\u2713' : '') + '</div>' +
        '<div class="share-fin-text">' +
          '<div class="share-fin-label">Include contact info</div>' +
          '<div class="share-fin-meta">Name and phone for the receiver</div>' +
        '</div>' +
      '</div>';
      if (_includeContact) {
        html += '<div class="share-contact-fields" id="share-contact-fields">' +
          '<div class="field-group">' +
            '<label class="field-label" for="share-contact-name">Contact name</label>' +
            '<input class="field-input" id="share-contact-name" type="text" value="' + _esc(_contactName) + '" placeholder="Who should they reach?">' +
          '</div>' +
          '<div class="field-group">' +
            '<label class="field-label" for="share-contact-phone">Contact phone</label>' +
            '<input class="field-input" id="share-contact-phone" type="tel" value="' + _esc(_contactPhone) + '" placeholder="+44 7700 …">' +
          '</div>' +
        '</div>';
      }
    } else {
      // Customer & contact info toggle (work pads)
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
    }

    // URL box — uses current origin so local dev links open the local receiver
    var urlPrefix = RecordService.shareUrlPrefix(_shareView);
    if (window.location.hostname !== 'workpads.me') {
      html += '<p class="share-origin-notice">Receiver opens on <strong>' +
        _esc(window.location.origin) + '</strong> — use the link below (not workpads.me).</p>';
    }
    if (charCount > 8000) {
      html += '<div class="share-url-warn" id="share-url-warn">This link is <strong>' + charCount +
        ' characters</strong> — some apps truncate long URLs. ' +
        'Try sharing less content (story, notes, financials, or fewer locations).' +
        '</div>';
    }
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
    html += '<button class="btn-primary" id="share-copy-btn">' + _copyBtnLabel() + '</button>';
    html += '<a class="btn-ghost" id="share-open-link" href="' + _esc(_url) + '" target="_blank" rel="noopener">Open in tab</a>';
    if (_record.recordType !== 'expense' && _record.recordType !== 'payment') {
      html += '<button class="btn-ghost" id="share-postcard-btn">Postcard</button>';
    }
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
    if (copyBtn) copyBtn.addEventListener('click', _handleCopyBtn);
    if (backBtn) backBtn.addEventListener('click', function () {
      App.showView(_record.id);
    });

    var postcardBtn = document.getElementById('share-postcard-btn');
    if (postcardBtn) {
      postcardBtn.addEventListener('click', function () {
        if (typeof Postcard === 'undefined') {
          App.toast('Postcard module not loaded — hard-refresh the app');
          return;
        }
        Postcard.openPicker(_record);
      });
    }

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
        _reencode();
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
        _reencode();
        // Update fin option note
        var finNote = document.querySelector('#share-fin-toggle .share-fin-opt-note');
        if (finNote) finNote.textContent = _finSummary;
      });
    }

    var finToggle = document.getElementById('share-fin-toggle');
    if (finToggle) {
      finToggle.addEventListener('click', function () {
        _includeFin = !_includeFin;
        _syncFinToggle();
        _reencode();
      });
    }

    var finStatsToggle = document.getElementById('share-fin-stats-toggle');
    if (finStatsToggle) {
      finStatsToggle.addEventListener('click', function () {
        _includeFinStats = !_includeFinStats;
        finStatsToggle.classList.toggle('active', _includeFinStats);
        var check = finStatsToggle.querySelector('.share-fin-opt-check');
        if (check) check.textContent = _includeFinStats ? '\u2713' : '';
        // Stats require fin data — auto-enable full summary if stats turned on
        if (_includeFinStats && (_expenses.length || _payments.length) && !_includeFin) {
          _includeFin = true;
          _syncFinToggle();
        }
        _reencode();
      });
    }

    var storyToggle = document.getElementById('share-story-toggle');
    if (storyToggle) {
      storyToggle.addEventListener('click', function () {
        _includeStory = !_includeStory;
        storyToggle.classList.toggle('active', _includeStory);
        var check = storyToggle.querySelector('.share-fin-check');
        if (check) check.textContent = _includeStory ? '\u2713' : '';
        _reencode();
      });
    }

    var detailsToggle = document.getElementById('share-details-toggle');
    if (detailsToggle) {
      detailsToggle.addEventListener('click', function () {
        _includeDetails = !_includeDetails;
        detailsToggle.classList.toggle('active', _includeDetails);
        var check = detailsToggle.querySelector('.share-fin-check');
        if (check) check.textContent = _includeDetails ? '\u2713' : '';
        _reencode();
      });
    }

    var customerToggle = document.getElementById('share-customer-toggle');
    if (customerToggle) {
      customerToggle.addEventListener('click', function () {
        _includeCustomer = !_includeCustomer;
        customerToggle.classList.toggle('active', _includeCustomer);
        var check = customerToggle.querySelector('.share-fin-check');
        if (check) check.textContent = _includeCustomer ? '\u2713' : '';
        _reencode();
      });
    }

    var contactToggle = document.getElementById('share-contact-toggle');
    if (contactToggle) {
      contactToggle.addEventListener('click', function () {
        _includeContact = !_includeContact;
        _render();
      });
    }

    var contactNameEl = document.getElementById('share-contact-name');
    var contactPhoneEl = document.getElementById('share-contact-phone');
    function _onContactInput() {
      if (contactNameEl)  _contactName  = contactNameEl.value;
      if (contactPhoneEl) _contactPhone = contactPhoneEl.value;
      var btn = document.getElementById('share-copy-btn');
      if (btn) btn.textContent = _copyBtnLabel();
    }
    if (contactNameEl)  contactNameEl.addEventListener('input', _onContactInput);
    if (contactPhoneEl) contactPhoneEl.addEventListener('input', _onContactInput);
  }

  function _handleCopyBtn() {
    if (_copyBtnLabel() === 'Recreate link') {
      _refreshUrl().then(function () {
        _encodedContact = { name: _contactName.trim(), phone: _contactPhone.trim() };
        _syncUrlDisplay();
        var btn = document.getElementById('share-copy-btn');
        if (btn) btn.textContent = 'Copy link';
      });
      return;
    }
    _copyUrl();
  }

  function _syncFinToggle() {
    var row = document.getElementById('share-fin-toggle');
    if (!row) return;
    row.classList.toggle('active', _includeFin);
    var check = row.querySelector('.share-fin-opt-check');
    if (check) check.textContent = _includeFin ? '\u2713' : '';
  }

  function _syncUrlDisplay() {
    var charCount = _url.length;
    var dataLen   = (_url.split('#')[1] || '').length;
    var prefixEl  = document.getElementById('share-url-prefix');
    var payloadEl = document.querySelector('.share-url-payload');
    var urlPrefix = RecordService.shareUrlPrefix(_shareView);
    if (prefixEl)  prefixEl.textContent  = urlPrefix;
    if (payloadEl) payloadEl.textContent = (_url.split('#')[1]) || '';
    var metaVals = document.querySelectorAll('.share-meta-value');
    if (metaVals[0]) metaVals[0].textContent = String(charCount);
    if (metaVals[1]) metaVals[1].textContent = dataLen + '\u00a0chars';
    var openLink = document.getElementById('share-open-link');
    if (openLink) openLink.href = _url;
    var warnEl = document.getElementById('share-url-warn');
    if (warnEl) {
      if (charCount > 8000) {
        warnEl.style.display = '';
        warnEl.innerHTML = 'This link is <strong>' + charCount +
          ' characters</strong> — some apps truncate long URLs. ' +
          'Try sharing less content (story, notes, financials, or fewer locations).';
      } else {
        warnEl.style.display = 'none';
      }
    }
    var copyBtn = document.getElementById('share-copy-btn');
    if (copyBtn) copyBtn.textContent = _copyBtnLabel();
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
