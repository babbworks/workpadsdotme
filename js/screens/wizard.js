/* ============================================================
   WizardScreen — PADS creation / edit form
   Tabs: Process · Actions · Details · Story
   ============================================================ */

var WizardScreen = (function () {
  'use strict';

  // ── State ────────────────────────────────────────────────────
  var _record         = {};
  var _id             = null;
  var _mode           = 'new';   // 'new' | 'edit' | 'expense'
  var _tab            = 'process';
  var _stylesAdded    = false;
  var _storyPreview   = false;
  var _detailsPreview = false;
  var _actFilter      = '';
  var _dragIndex      = -1;

  var TABS = [
    { key: 'process', label: 'Process' },
    { key: 'actions', label: 'Actions' },
    { key: 'details', label: 'Details' },
    { key: 'story',   label: 'Story'   },
  ];

  var TAB_INDEX = { process: 0, actions: 1, details: 2, story: 3 };

  var ROLES = [
    { val: 'worker',     label: 'Worker' },
    { val: 'supervisor', label: 'Job owner / supervisor' },
    { val: 'sub',        label: 'Subcontractor' },
    { val: 'colleague',  label: 'Colleague' },
    { val: 'site',       label: 'Site contact' },
    { val: 'referral',   label: 'Referred by' },
    { val: 'witness',    label: 'Witness / verifier' },
  ];

  var CHARGE_TYPES = [
    { val: '',   label: 'General / labour' },
    { val: '1',  label: 'Urgency / emergency' },
    { val: '2',  label: 'After-hours' },
    { val: '3',  label: 'Travel / mileage' },
    { val: '4',  label: 'Delivery / courier' },
    { val: '5',  label: 'Equipment hire' },
    { val: '6',  label: 'Materials / consumables' },
    { val: '7',  label: 'Subcontractor' },
    { val: '8',  label: 'Cancellation fee' },
    { val: '9',  label: 'Deposit / retainer' },
    { val: '10', label: 'Credit / discount' },
    { val: '11', label: 'Warranty adjustment' },
    { val: '12', label: 'Regulatory levy' },
    { val: '13', label: 'FX adjustment' },
    { val: '14', label: 'Payment handling fee' },
  ];

  // ── Styles ───────────────────────────────────────────────────

  function _addStyles() {
    if (_stylesAdded) return;
    _stylesAdded = true;
    var s = document.createElement('style');
    s.textContent = [
      '.wiz-wrap { max-width:680px; margin:0 auto; padding:36px 32px 80px; }',

      '.wiz-header {',
      '  display:flex; align-items:flex-start;',
      '  justify-content:space-between; gap:16px; margin-bottom:24px;',
      '}',

      '.wiz-expense-banner {',
      '  margin-bottom:16px; padding:8px 14px;',
      '  background:var(--stamp-light); border:1px solid var(--stamp-border);',
      '  border-radius:3px;',
      '  font-family:var(--font-mono); font-size:10px; color:var(--stamp);',
      '  letter-spacing:.06em;',
      '}',

      '.wiz-footer {',
      '  display:flex; justify-content:space-between; align-items:center;',
      '  margin-top:28px; padding-top:20px; border-top:1px solid var(--rule-light);',
      '}',
      '.wiz-footer-right { display:flex; gap:8px; }',

      /* Record type selector */
      '.wiz-type-row {',
      '  display:flex; gap:6px; margin-bottom:18px;',
      '}',
      '.wiz-type-btn {',
      '  font-family:var(--font-mono); font-size:10px; font-weight:700;',
      '  letter-spacing:.08em; text-transform:uppercase;',
      '  color:var(--ink-muted); border:1.5px solid var(--rule);',
      '  border-radius:3px; padding:5px 12px; cursor:pointer;',
      '  transition:color .13s, border-color .13s, background .13s;',
      '  background:none;',
      '}',
      '.wiz-type-btn.active {',
      '  color:var(--stamp); border-color:var(--stamp-border);',
      '  background:var(--stamp-light);',
      '}',
      '.wiz-type-btn:hover:not(.active) {',
      '  border-color:var(--ink-faint); color:var(--ink-mid);',
      '}',

      /* Progress dots */
      '.wiz-dots {',
      '  display:flex; justify-content:center; gap:10px;',
      '  margin:-6px 0 16px;',
      '}',
      '.wiz-dot {',
      '  font-family:var(--font-mono); font-size:12px; line-height:1;',
      '  color:var(--ink-faint); transition:color .13s; cursor:default;',
      '}',
      '.wiz-dot.active { color:var(--stamp); }',

      /* Story review card */
      '.wiz-story-ctx {',
      '  margin-bottom:18px; padding:12px 16px;',
      '  background:var(--paper); border:1px solid var(--rule-light);',
      '  border-radius:3px;',
      '}',
      '.wiz-story-ctx-label {',
      '  font-family:var(--font-mono); font-size:9px; font-weight:700;',
      '  letter-spacing:.12em; text-transform:uppercase;',
      '  color:var(--ink-muted); margin-bottom:6px;',
      '}',
      '.wiz-story-ctx-job {',
      '  font-family:var(--font-body); font-size:13px; font-weight:700;',
      '  color:var(--ink); margin-bottom:3px;',
      '}',
      '.wiz-story-ctx-line {',
      '  font-family:var(--font-mono); font-size:10.5px;',
      '  color:var(--ink-mid); margin-bottom:2px;',
      '  white-space:nowrap; overflow:hidden; text-overflow:ellipsis;',
      '}',

      /* Markdown toggle row */
      '.wiz-md-row {',
      '  display:flex; align-items:center; justify-content:space-between;',
      '  margin-bottom:6px;',
      '}',
      '.wiz-md-label {',
      '  font-family:var(--font-mono); font-size:10px; font-weight:700;',
      '  letter-spacing:.14em; text-transform:uppercase; color:var(--ink-muted);',
      '}',
      '.wiz-md-controls { display:flex; align-items:center; gap:8px; }',
      '.wiz-md-toggle {',
      '  font-family:var(--font-mono); font-size:9px; font-weight:700;',
      '  letter-spacing:.08em; color:var(--stamp); background:none; border:none;',
      '  cursor:pointer; padding:2px 0; border-bottom:1px solid transparent;',
      '  transition:border-color .12s;',
      '}',
      '.wiz-md-toggle:hover { border-bottom-color:var(--stamp); }',
      '.wiz-md-help {',
      '  font-family:var(--font-mono); font-size:9px;',
      '  color:var(--ink-faint); border:1px solid var(--rule);',
      '  border-radius:2px; padding:1px 5px;',
      '  text-decoration:none; transition:color .12s, border-color .12s;',
      '}',
      '.wiz-md-help:hover { color:var(--ink-mid); border-color:var(--ink-faint); }',
      '.wiz-md-preview {',
      '  font-family:var(--font-body); font-size:14.5px; line-height:1.7;',
      '  color:var(--ink); min-height:100px;',
      '  padding:9px 12px; background:var(--card-raised);',
      '  border:1.5px solid var(--stamp-border); border-radius:3px;',
      '}',
      '.wiz-md-preview p { margin-bottom:.7em; }',
      '.wiz-md-preview p:last-child { margin-bottom:0; }',
      '.wiz-md-preview h1,.wiz-md-preview h2,.wiz-md-preview h3 {',
      '  font-weight:700; margin-bottom:.4em; margin-top:.6em;',
      '}',
      '.wiz-md-preview ul,.wiz-md-preview ol {',
      '  padding-left:1.4em; margin-bottom:.6em;',
      '}',

      /* Actions list */
      '.wiz-action {',
      '  display:flex; align-items:flex-start; gap:16px;',
      '  padding:16px 20px; border-bottom:1px solid var(--rule-light);',
      '}',
      '.wiz-action:last-of-type { border-bottom:none; }',

      '.wiz-action-num {',
      '  font-family:var(--font-mono); font-size:11px; font-weight:700;',
      '  color:var(--stamp); min-width:22px; padding-top:10px; flex-shrink:0;',
      '}',

      '.wiz-action-fields { flex:1; display:flex; flex-direction:column; gap:7px; }',

      '.wiz-action-title { font-weight:700; }',
      '.wiz-action-notes { font-style:italic; font-size:14px; }',

      '.wiz-action-remove {',
      '  color:var(--ink-faint); font-size:20px; line-height:1;',
      '  padding:6px 4px; flex-shrink:0; margin-top:4px;',
      '  transition:color .13s; background:none; border:none; cursor:pointer;',
      '}',
      '.wiz-action-remove:hover { color:var(--stamp); }',

      '.wiz-add-row {',
      '  padding:14px 20px; border-top:1px solid var(--rule-light);',
      '}',

      '.wiz-actions-empty {',
      '  padding:36px 24px; text-align:center;',
      '}',

      /* Tab bar override — no bottom margin, dots sit right below */
      '.wiz-wrap .tab-bar { margin-bottom:8px; }',

      /* Keyboard hint */
      '.wiz-kbd-hint {',
      '  font-family:var(--font-mono); font-size:10px;',
      '  color:var(--ink-faint); letter-spacing:.04em;',
      '}',

      /* Field-level note capture */
      '.wiz-field-note-btn {',
      '  display:inline; margin-left:6px;',
      '  font-family:var(--font-mono); font-size:9px;',
      '  color:var(--ink-faint); background:none; border:none;',
      '  cursor:pointer; padding:0 2px; vertical-align:middle;',
      '  transition:color .12s; line-height:1;',
      '}',
      '.wiz-field-note-btn:hover { color:var(--stamp); }',

      '.wiz-note-box {',
      '  margin-top:6px; padding:10px 12px;',
      '  background:var(--stamp-light); border:1px solid var(--stamp-border);',
      '  border-radius:3px;',
      '}',
      '.wiz-note-box textarea {',
      '  display:block; width:100%; background:var(--card-raised);',
      '  border:1.5px solid var(--rule); border-radius:3px;',
      '  padding:7px 10px; font-family:var(--font-body); font-size:13px;',
      '  color:var(--ink); resize:none; min-height:52px;',
      '  transition:border-color .13s; -webkit-appearance:none;',
      '}',
      '.wiz-note-box textarea:focus { border-color:var(--stamp-border); outline:none; }',
      '.wiz-note-box-actions { display:flex; gap:6px; margin-top:6px; }',

      /* More section (financial + extras) */
      '.wiz-more-toggle {',
      '  font-family:var(--font-mono); font-size:10px; font-weight:700;',
      '  letter-spacing:.1em; text-transform:uppercase;',
      '  color:var(--ink-muted); background:none; border:none;',
      '  cursor:pointer; padding:0; transition:color .12s;',
      '}',
      '.wiz-more-toggle:hover { color:var(--ink); }',
      '.wiz-more-arrow { display:inline-block; font-size:8px; transition:transform .15s; margin-right:4px; }',
      '.wiz-more-body { margin-top:18px; }',

      '.wiz-finance-row {',
      '  display:flex; gap:8px; align-items:center;',
      '}',
      '.wiz-finance-sym {',
      '  font-family:var(--font-mono); font-size:14px;',
      '  color:var(--ink-muted); flex-shrink:0; width:14px;',
      '}',
      '.wiz-field-select {',
      '  display:block; background:var(--card-raised);',
      '  border:1.5px solid var(--rule); border-radius:3px;',
      '  padding:9px 10px; font-family:var(--font-mono); font-size:13px;',
      '  color:var(--ink); transition:border-color .13s; -webkit-appearance:none;',
      '}',
      '.wiz-field-select:focus { border-color:var(--stamp-border); outline:none; }',

      '.wiz-internal-note {',
      '  font-family:var(--font-mono); font-size:9px;',
      '  color:var(--ink-faint); letter-spacing:.04em;',
      '  margin-top:4px;',
      '}',

      /* ME button (customer field) */
      '.wiz-me-btn {',
      '  flex-shrink:0; width:32px; height:100%;',
      '  font-family:var(--font-mono); font-size:10px; font-weight:700;',
      '  letter-spacing:.06em; color:var(--ink-mid);',
      '  background:var(--rule-light); border:none; border-left:1.5px solid var(--rule);',
      '  border-radius:0 3px 3px 0; cursor:pointer;',
      '  transition:background .12s, color .12s;',
      '}',
      '.wiz-me-btn:hover { background:var(--rule); color:var(--ink); }',
      '.wiz-customer-row { display:flex; }',
      '.wiz-customer-row .field-input { border-radius:3px 0 0 3px; flex:1; }',

      /* Edit mode context banner */
      '.wiz-edit-banner {',
      '  margin-bottom:20px; padding:12px 16px;',
      '  background:var(--card); border:1px solid var(--rule);',
      '  border-radius:4px; box-shadow:0 1px 4px rgba(25,20,15,.05);',
      '}',
      '.wiz-edit-banner-job {',
      '  font-family:var(--font-body); font-size:17px; font-weight:700;',
      '  color:var(--ink); line-height:1.2; margin-bottom:2px;',
      '}',
      '.wiz-edit-banner-meta {',
      '  font-family:var(--font-mono); font-size:10px;',
      '  color:var(--ink-mid); letter-spacing:.04em;',
      '}',

      /* Action filter bar */
      '.wiz-act-filter-row {',
      '  padding:10px 16px; border-bottom:1px solid var(--rule-light);',
      '}',
      '.wiz-act-filter-input {',
      '  display:block; width:100%;',
      '  font-family:var(--font-mono); font-size:11px;',
      '  color:var(--ink); background:var(--paper);',
      '  border:1px solid var(--rule); border-radius:3px;',
      '  padding:5px 9px; transition:border-color .13s;',
      '}',
      '.wiz-act-filter-input:focus { outline:none; border-color:var(--stamp-border); }',
      '.wiz-act-filter-input::placeholder { color:var(--ink-faint); }',

      /* Drag-and-drop */
      '.wiz-action { cursor:grab; }',
      '.wiz-action.dragging { opacity:.4; }',
      '.wiz-action.drag-over { border-top:2px solid var(--stamp); }',

      /* Participants block */
      '.wiz-part-row {',
      '  display:flex; gap:6px; align-items:center;',
      '  margin-bottom:6px;',
      '}',
      '.wiz-part-sender {',
      '  flex-shrink:0; font-family:var(--font-mono); font-size:10px;',
      '  color:var(--stamp); width:16px; text-align:center; cursor:default;',
      '}',
      '.wiz-part-remove {',
      '  flex-shrink:0; width:16px; text-align:center;',
      '  color:var(--ink-faint); font-size:15px; line-height:1;',
      '  padding:3px 0; background:none; border:none; cursor:pointer;',
      '  transition:color .13s;',
      '}',
      '.wiz-part-remove:hover { color:var(--stamp); }',
      '.wiz-part-name { flex:1; min-width:0; }',
      '.wiz-part-role { width:150px; flex-shrink:0; font-size:12px; padding:8px 9px; }',

      /* Parts flag */
      '.wiz-parts-flag-row {',
      '  display:flex; align-items:center; gap:8px; padding:4px 0;',
      '}',
      '.wiz-parts-flag-row input[type=checkbox] {',
      '  width:15px; height:15px; cursor:pointer; accent-color:var(--stamp);',
      '}',
      '.wiz-parts-flag-label {',
      '  font-family:var(--font-mono); font-size:12px;',
      '  color:var(--ink-muted); cursor:pointer;',
      '}',
    ].join('\n');
    document.head.appendChild(s);
  }

  // ── Lifecycle ────────────────────────────────────────────────

  function onShow(params) {
    _addStyles();
    _mode           = params.mode || 'new';
    _tab            = 'process';
    _storyPreview   = false;
    _detailsPreview = false;
    _actFilter      = '';
    _dragIndex      = -1;

    if (_mode === 'edit' && params.id) {
      _id = params.id;
      RecordService.get(_id).then(function (r) {
        _record = r || {};
        _render();
        _notifyContext();
      });
    } else if (_mode === 'expense' && params.parentId) {
      var parentId = params.parentId;
      RecordService.get(parentId).then(function (parent) {
        var parentJob = parent ? (parent.job || 'record') : 'record';
        var identity  = (typeof ActivityService !== 'undefined') ? ActivityService.getSenderIdentity() : null;
        RecordService.create({
          recordType: 'expense',
          parentId:   parentId,
          job:        'Expense',
          customer:   parent ? (parent.customer || '') : '',
          worker:     (identity && identity.name) || '',
        }).then(function (r) {
          _record = r;
          _id     = r.id;
          _render();
          _notifyContext();
        });
      });
    } else {
      var identity = (typeof ActivityService !== 'undefined') ? ActivityService.getSenderIdentity() : null;
      RecordService.create({
        worker: (identity && identity.name) || '',
      }).then(function (r) {
        _record = r;
        _id     = r.id;
        _render();
        _notifyContext();
      });
    }
  }

  function onHide() {}

  function _notifyContext() {
    if (typeof WorkpadsPanel !== 'undefined' && WorkpadsPanel.setContext) {
      WorkpadsPanel.setContext('wizard', { customer: _record.customer || '' });
    }
  }

  // ── Render ───────────────────────────────────────────────────

  function _render() {
    var el = document.getElementById('screen-wizard');
    el.innerHTML = (
      '<div class="wiz-wrap">' +
        _renderHeader() +
        (_mode === 'expense' ? _renderExpenseBanner() : '') +
        _renderTabBar() +
        _renderDots() +
        '<div id="wiz-body">' + _renderTabBody(_tab) + '</div>' +
        _renderFooter() +
      '</div>'
    );
    _bindEvents(el);
  }

  function _renderHeader() {
    if (_mode === 'edit' && (_record.job || _record.customer)) {
      var meta = [];
      if (_record.customer) meta.push(_esc(_record.customer));
      if (_record.date)     meta.push(_esc(_record.date));
      return (
        '<div class="wiz-edit-banner">' +
          '<div class="wiz-edit-banner-job">' + _esc(_record.job || 'Untitled') + '</div>' +
          (meta.length ? '<div class="wiz-edit-banner-meta">' + meta.join(' \xb7 ') + '</div>' : '') +
        '</div>'
      );
    }
    return '';
  }

  function _renderExpenseBanner() {
    return '<div class="wiz-expense-banner">Expense record \u2014 linked to parent workpad</div>';
  }

  function _renderTabBar() {
    var html = '<div class="tab-bar">';
    TABS.forEach(function (t) {
      html += '<button class="tab-btn' + (t.key === _tab ? ' active' : '') + '" data-tab="' + t.key + '">' +
                t.label +
              '</button>';
    });
    return html + '</div>';
  }

  function _renderDots() {
    var idx  = TAB_INDEX[_tab] || 0;
    var html = '<div class="wiz-dots">';
    for (var i = 0; i < 4; i++) {
      html += '<span class="wiz-dot' + (i === idx ? ' active' : '') + '">' +
              (i === idx ? '\u25cf' : '\u25cb') + '</span>';
    }
    return html + '</div>';
  }

  function _renderFooter() {
    return (
      '<div class="wiz-footer">' +
        '<button class="btn-ghost" id="wiz-cancel-bottom">Cancel</button>' +
        '<div class="wiz-footer-right">' +
          '<span class="wiz-kbd-hint">Ctrl+S to save</span>' +
          '<button class="btn-ghost" id="wiz-save-draft">Save draft</button>' +
          '<button class="btn-primary" id="wiz-save">Save workpad</button>' +
        '</div>' +
      '</div>'
    );
  }

  // ── Tab bodies ───────────────────────────────────────────────

  function _renderTabBody(tab) {
    switch (tab) {
      case 'process': return _renderProcess();
      case 'actions': return _renderActions();
      case 'details': return _renderDetails();
      case 'story':   return _renderStory();
      default:        return '';
    }
  }

  function _renderRecordTypeSelector() {
    var current = _record.record_type || 'job';
    var types = [
      { val: 'job',     label: 'Job record' },
      { val: 'quote',   label: 'Quote' },
      { val: 'invoice', label: 'Invoice' },
    ];
    var html = '<div class="wiz-type-row">';
    types.forEach(function(t) {
      html += '<button type="button" class="wiz-type-btn' +
              (t.val === current ? ' active' : '') +
              '" data-type="' + t.val + '">' + t.label + '</button>';
    });
    return html + '</div>';
  }

  function _renderProcess() {
    var moreOpen = (_mode === 'expense');
    var jobPlaceholder = (_mode === 'expense') ? 'What is the expense?' : 'What is the job?';

    return (
      '<div class="card">' +
        '<div class="card-section">' +
          (_mode !== 'expense' ? _renderRecordTypeSelector() : '') +
          _field('job',      'Job',      'text', _record.job      || '', true,  jobPlaceholder) +
          '<div class="field-group">' +
            '<label class="field-label" for="f-customer">Customer</label>' +
            '<div class="wiz-customer-row">' +
              '<input class="field-input" id="f-customer" type="text"' +
                ' value="' + _esc(_record.customer || '') + '" placeholder="Customer or client name">' +
              '<button class="wiz-me-btn" id="wiz-me-btn" type="button" title="Set to my own identity">ME</button>' +
            '</div>' +
          '</div>' +
          _field('date',     'Date',     'date', _record.date     || '', false, '') +
        '</div>' +
        '<div class="card-section" style="padding-top:14px;padding-bottom:14px;">' +
          '<button class="wiz-more-toggle" id="wiz-more-toggle" type="button">' +
            '<span class="wiz-more-arrow" id="wiz-more-arrow"' +
              (moreOpen ? ' style="transform:rotate(90deg);"' : '') + '>\u25b8</span>More' +
          '</button>' +
          '<div id="wiz-more-body"' + (moreOpen ? '' : ' style="display:none;"') + '>' +
            '<div class="wiz-more-body">' +
              _renderFinancialFields() +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function _renderFinancialFields() {
    var currency   = _record.currency    || 'GBP';
    var amount     = _record.amount      || '';
    var vat        = _record.vat         || 'none';
    var workerCost = _record.worker_cost || '';
    var chargeType = _record.charge_type != null ? String(_record.charge_type) : '';
    var partsFlag  = _record.parts_flag  || false;

    var sym = currency === 'EUR' ? '\u20ac' : currency === 'USD' ? '$' : '\u00a3';

    var currencyOpts = [
      { code: 'GBP', label: '\u00a3 GBP' },
      { code: 'EUR', label: '\u20ac EUR' },
      { code: 'USD', label: '$ USD' },
    ].map(function (c) {
      return '<option value="' + c.code + '"' + (c.code === currency ? ' selected' : '') + '>' + c.label + '</option>';
    }).join('');

    var vatOpts = [
      { val: 'none',     label: 'No tax' },
      { val: 'standard', label: 'Standard rate (20%)' },
      { val: 'zero',     label: 'Zero rated (0%)' },
      { val: 'reduced',  label: 'Reduced rate (5%)' },
    ].map(function (o) {
      return '<option value="' + o.val + '"' + (o.val === vat ? ' selected' : '') + '>' + o.label + '</option>';
    }).join('');

    var chargeTypeOpts = CHARGE_TYPES.map(function (ct) {
      return '<option value="' + ct.val + '"' + (ct.val === chargeType ? ' selected' : '') + '>' + ct.label + '</option>';
    }).join('');

    return (
      '<div class="field-group">' +
        '<label class="field-label">Charge type</label>' +
        '<select class="field-input wiz-field-select" id="f-charge_type" style="width:100%;">' +
          chargeTypeOpts +
        '</select>' +
      '</div>' +
      '<div class="field-group">' +
        '<label class="field-label">Customer price</label>' +
        '<div class="wiz-finance-row">' +
          '<span class="wiz-finance-sym wiz-curr-sym">' + sym + '</span>' +
          '<input class="field-input" id="f-amount" type="text" inputmode="decimal"' +
            ' value="' + _esc(amount) + '" placeholder="0.00" style="flex:1;">' +
          '<select class="wiz-field-select" id="f-currency">' + currencyOpts + '</select>' +
        '</div>' +
      '</div>' +
      '<div class="field-group">' +
        '<label class="field-label">Tax</label>' +
        '<select class="field-input wiz-field-select" id="f-vat" style="width:100%;">' + vatOpts + '</select>' +
      '</div>' +
      '<div class="field-group">' +
        '<label class="field-label">My cost <span class="field-optional">(not shared)</span></label>' +
        '<div class="wiz-finance-row">' +
          '<span class="wiz-finance-sym wiz-curr-sym">' + sym + '</span>' +
          '<input class="field-input" id="f-worker_cost" type="text" inputmode="decimal"' +
            ' value="' + _esc(workerCost) + '" placeholder="0.00">' +
        '</div>' +
        '<p class="wiz-internal-note">Stored locally only \u2014 never included in share link</p>' +
      '</div>' +
      '<div class="field-group" style="margin-bottom:0;">' +
        '<div class="wiz-parts-flag-row">' +
          '<input type="checkbox" id="f-parts_flag"' + (partsFlag ? ' checked' : '') + '>' +
          '<label class="wiz-parts-flag-label" for="f-parts_flag">Parts / materials involved</label>' +
        '</div>' +
      '</div>'
    );
  }

  // ── Details tab ──────────────────────────────────────────────

  function _renderDetails() {
    return (
      '<div class="card">' +
        '<div class="card-section">' +
          _renderParticipants() +
          _field('location',       'Location',       'text', _record.location       || '', false, 'Address or site') +
          _field('customer_phone', 'Customer phone', 'tel',  _record.customer_phone || '', false, '+44 7700 \u2026') +
        '</div>' +
        '<div class="card-section">' +
          _field('start_time',   'Start time',   'text', _record.start_time   || '', false, '09:00') +
          _field('end_time',     'End time',     'text', _record.end_time     || '', false, '17:00') +
          _field('meeting_time', 'Meeting time', 'text', _record.meeting_time || '', false, 'Scheduled arrival') +
        '</div>' +
      '</div>'
    );
  }

  function _renderParticipants() {
    // Use participants array; fall back to worker field for backward compat
    var parts = (_record.participants && _record.participants.length > 0)
      ? _record.participants
      : [{ name: _record.worker || '', role: 'worker' }];

    var html = '<div class="field-group">';
    html += '<label class="field-label">Participants</label>';
    html += '<div id="wiz-parts-list">';

    parts.forEach(function (p, i) {
      var isFirst = (i === 0);
      var roleOpts = ROLES.map(function (r) {
        return '<option value="' + r.val + '"' +
               (r.val === (p.role || 'worker') ? ' selected' : '') +
               '>' + r.label + '</option>';
      }).join('');

      html += '<div class="wiz-part-row">';
      if (isFirst) {
        html += '<span class="wiz-part-sender" title="Record creator">\u2605</span>';
      } else {
        html += '<button class="wiz-part-remove" type="button" data-remove-part="' + i +
                '" title="Remove participant">\u00d7</button>';
      }
      html += '<input class="field-input wiz-part-name" type="text"' +
              ' placeholder="' + (isFirst ? 'Your name' : 'Name') + '"' +
              ' value="' + _esc(p.name || '') + '">';
      html += '<select class="wiz-field-select wiz-part-role">' + roleOpts + '</select>';
      html += '</div>';
    });

    html += '</div>';
    html += '<button class="btn-ghost" id="wiz-add-part" type="button"' +
            ' style="margin-top:8px;font-size:11px;padding:5px 10px;">+ Add participant</button>';
    html += '</div>';
    return html;
  }

  // ── Actions tab ──────────────────────────────────────────────

  function _renderActions() {
    var actions = _record.actions || [];

    // Apply filter
    var q = _actFilter.trim().toLowerCase();
    var displayList = actions.map(function (a, i) {
      return { a: a, i: i };
    });
    if (q) {
      displayList = displayList.filter(function (entry) {
        return (entry.a.title || '').toLowerCase().indexOf(q) !== -1 ||
               (entry.a.notes || '').toLowerCase().indexOf(q) !== -1;
      });
    }

    var html = '<div class="card">';

    // Filter bar (always shown when there are actions)
    if (actions.length > 0) {
      html += '<div class="wiz-act-filter-row">' +
                '<input class="wiz-act-filter-input" id="wiz-act-filter" type="search"' +
                  ' placeholder="Filter actions\u2026" autocomplete="off"' +
                  ' value="' + _esc(_actFilter) + '">' +
              '</div>';
    }

    if (actions.length === 0) {
      html += '<div class="wiz-actions-empty">' +
                '<p class="empty-state-title" style="margin-bottom:6px;">No actions yet</p>' +
                '<p class="empty-state-sub">Break the job into steps</p>' +
              '</div>';
    } else if (displayList.length === 0) {
      html += '<div class="wiz-actions-empty">' +
                '<p class="empty-state-sub" style="padding:16px 0;">No actions match filter</p>' +
              '</div>';
    } else {
      html += '<div class="wiz-actions-list" id="wiz-actions-list">';
      displayList.forEach(function (entry) {
        var a = entry.a, i = entry.i;
        var num = (i < 9 ? '0' : '') + (i + 1);
        html += (
          '<div class="wiz-action" draggable="true" data-index="' + i + '">' +
            '<span class="wiz-action-num">' + num + '</span>' +
            '<div class="wiz-action-fields">' +
              '<input class="field-input wiz-action-title" type="text"' +
                ' placeholder="Step title" value="' + _esc(a.title || '') + '"' +
                ' data-action-title="' + i + '">' +
              '<input class="field-input wiz-action-notes" type="text"' +
                ' placeholder="Notes \u2014 optional" value="' + _esc(a.notes || '') + '"' +
                ' data-action-notes="' + i + '">' +
            '</div>' +
            '<button class="wiz-action-remove" data-remove="' + i + '" title="Remove">\u00d7</button>' +
          '</div>'
        );
      });
      html += '</div>';
    }

    html += '<div class="wiz-add-row">' +
              '<button class="btn-ghost" id="wiz-add-action">+ Add action</button>' +
            '</div>';
    html += '</div>';
    return html;
  }

  // ── Story tab ────────────────────────────────────────────────

  function _renderStory() {
    var titleLine = [];
    if (_record.job)      titleLine.push('<strong>' + _esc(_record.job) + '</strong>');
    if (_record.customer) titleLine.push(_esc(_record.customer));
    if (_record.date)     titleLine.push(_esc(_record.date));

    var metaLines = [];

    // Participants / worker
    var parts = _record.participants;
    if (parts && parts.length > 0) {
      var names = parts.map(function (p) { return p.name; }).filter(Boolean);
      if (names.length) metaLines.push((names.length === 1 ? 'Worker: ' : 'Workers: ') + _esc(names.join(', ')));
    } else if (_record.worker) {
      metaLines.push('Worker: ' + _esc(_record.worker));
    }

    if (_record.location) metaLines.push('Location: ' + _esc(_record.location));
    if (_record.start_time && _record.end_time) {
      metaLines.push(_esc(_record.start_time) + ' \u2013 ' + _esc(_record.end_time));
    }
    if (_record.amount) {
      var sym = _record.currency === 'EUR' ? '\u20ac' : _record.currency === 'USD' ? '$' : '\u00a3';
      var vatLabel = _record.vat === 'standard' ? ' inc. 20% VAT'
                   : _record.vat === 'reduced'  ? ' inc. 5% VAT' : '';
      metaLines.push(sym + _esc(_record.amount) + vatLabel);
    }
    if (_record.parts_flag) metaLines.push('Parts / materials involved');

    var actions    = _record.actions || [];
    var actionLine = '';
    if (actions.length > 0) {
      var first = actions[0] && actions[0].title ? actions[0].title.slice(0, 40) : '';
      actionLine = actions.length + ' action' + (actions.length !== 1 ? 's' : '') +
                   (first ? ': ' + _esc(first) + (actions[0].title.length > 40 ? '\u2026' : '') : '');
    }

    var details        = _record.details || '';
    var detailsSnippet = details.slice(0, 100) + (details.length > 100 ? '\u2026' : '');

    var summaryHtml = (
      '<div class="wiz-story-ctx">' +
        '<div class="wiz-story-ctx-label">Record summary</div>' +
        (titleLine.length
          ? '<div class="wiz-story-ctx-job">' + titleLine.join(' \xb7 ') + '</div>'
          : '<div class="wiz-story-ctx-job" style="color:var(--ink-faint);font-style:italic;">No job title yet</div>') +
        metaLines.map(function (l) {
          return '<div class="wiz-story-ctx-line">' + l + '</div>';
        }).join('') +
        (actionLine
          ? '<div class="wiz-story-ctx-line">' + actionLine + '</div>'
          : '') +
        (detailsSnippet
          ? '<div class="wiz-story-ctx-line">' + _esc(detailsSnippet) + '</div>'
          : '') +
      '</div>'
    );

    var storyMdRow = (
      '<div class="wiz-md-row">' +
        '<span class="wiz-md-label">Story</span>' +
        '<div class="wiz-md-controls">' +
          '<button class="wiz-md-toggle" id="wiz-story-md-btn" type="button">' +
            (_storyPreview ? '\u270e Edit' : 'View as Markdown') +
          '</button>' +
          '<a class="wiz-md-help" href="https://commonmark.org/help/" target="_blank" rel="noopener" tabindex="-1">?</a>' +
        '</div>' +
      '</div>'
    );

    var storyField = _storyPreview
      ? '<div class="wiz-md-preview" id="f-story-preview">' + _renderMarkdown(_record.story || '') + '</div>'
      : '<textarea class="field-input field-textarea" id="f-story" rows="6"' +
          ' placeholder="A plain account of the work\u2026">' +
          _esc(_record.story || '') +
        '</textarea>';

    var detailsMdRow = (
      '<div class="wiz-md-row">' +
        '<span class="wiz-md-label">Notes / Details</span>' +
        '<div class="wiz-md-controls">' +
          '<button class="wiz-md-toggle" id="wiz-details-md-btn" type="button">' +
            (_detailsPreview ? '\u270e Edit' : 'View as Markdown') +
          '</button>' +
          '<a class="wiz-md-help" href="https://commonmark.org/help/" target="_blank" rel="noopener" tabindex="-1">?</a>' +
        '</div>' +
      '</div>'
    );

    var detailsField = _detailsPreview
      ? '<div class="wiz-md-preview" id="f-details-preview">' + _renderMarkdown(_record.details || '') + '</div>'
      : '<textarea class="field-input field-textarea" id="f-details" rows="5"' +
          ' placeholder="Technical notes, materials, measurements\u2026">' +
          _esc(_record.details || '') +
        '</textarea>';

    return (
      '<div class="card">' +
        '<div class="card-section">' +
          summaryHtml +
          '<div class="field-group">' +
            storyMdRow +
            storyField +
            '<p class="field-hint">Narrative \u2014 readable by the customer</p>' +
          '</div>' +
        '</div>' +
        '<div class="card-section">' +
          '<div class="field-group">' +
            detailsMdRow +
            detailsField +
            '<p class="field-hint">Internal \u2014 included in the share link</p>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  // ── Markdown renderer (minimal) ───────────────────────────────

  function _renderMarkdown(text) {
    if (!text) return '<p style="color:var(--ink-faint);font-style:italic;">Nothing written yet.</p>';
    var lines  = text.split('\n');
    var html   = '';
    var inList = false;

    function closeList() {
      if (inList) { html += '</ul>'; inList = false; }
    }

    lines.forEach(function (line) {
      // Headings
      var hm = line.match(/^(#{1,3})\s+(.+)/);
      if (hm) {
        closeList();
        var lvl = hm[1].length;
        html += '<h' + lvl + '>' + _inline(hm[2]) + '</h' + lvl + '>';
        return;
      }
      // Unordered list
      var lm = line.match(/^[\-\*]\s+(.+)/);
      if (lm) {
        if (!inList) { html += '<ul>'; inList = true; }
        html += '<li>' + _inline(lm[1]) + '</li>';
        return;
      }
      closeList();
      // Blank line = paragraph break
      if (line.trim() === '') {
        html += '<br>';
        return;
      }
      html += '<p>' + _inline(line) + '</p>';
    });
    closeList();
    return html;
  }

  function _inline(s) {
    // Escape HTML first, then apply inline markdown
    s = _esc(s);
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\*(.+?)\*/g,     '<em>$1</em>');
    s = s.replace(/`(.+?)`/g,       '<code style="font-family:var(--font-mono);font-size:.9em;">$1</code>');
    return s;
  }

  // ── Field helper ─────────────────────────────────────────────

  function _field(key, label, type, value, required, placeholder) {
    var noteBtn = (_id && typeof PersonalService !== 'undefined')
      ? '<button class="wiz-field-note-btn" type="button" data-field="' + key + '"' +
          ' data-label="' + _esc(label) + '" title="Add note for this field">\u270e</button>'
      : '';
    return (
      '<div class="field-group">' +
        '<label class="field-label" for="f-' + key + '">' +
          label +
          (required ? ' <span class="field-required">*</span>' : '') +
          noteBtn +
        '</label>' +
        '<input class="field-input" id="f-' + key + '" type="' + type + '"' +
          ' value="' + _esc(value) + '"' +
          ' placeholder="' + _esc(placeholder) + '">' +
        '<div class="wiz-note-box" id="wiz-notebox-' + key + '" style="display:none;">' +
          '<textarea placeholder="Note about \u2018' + _esc(label) + '\u2019\u2026" rows="2"></textarea>' +
          '<div class="wiz-note-box-actions">' +
            '<button class="btn-ghost wiz-note-save" type="button"' +
              ' data-field="' + key + '" data-label="' + _esc(label) + '"' +
              ' style="font-size:10px;padding:4px 10px;">Save note</button>' +
            '<button class="btn-ghost wiz-note-cancel" type="button"' +
              ' data-field="' + key + '" style="font-size:10px;padding:4px 10px;">Cancel</button>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  // ── Collect ──────────────────────────────────────────────────

  function _collect() {
    _tryCollect('job',            'f-job');
    _tryCollect('customer',       'f-customer');
    _tryCollect('date',           'f-date');
    _tryCollect('location',       'f-location');
    _tryCollect('customer_phone', 'f-customer_phone');
    _tryCollect('start_time',     'f-start_time');
    _tryCollect('end_time',       'f-end_time');
    _tryCollect('meeting_time',   'f-meeting_time');
    _tryCollect('story',          'f-story');
    _tryCollect('details',        'f-details');
    _tryCollect('amount',         'f-amount');
    _tryCollect('currency',       'f-currency');
    _tryCollect('vat',            'f-vat');
    _tryCollect('worker_cost',    'f-worker_cost');
    _tryCollect('charge_type',    'f-charge_type');
    _collectParticipants();
    _collectPartsFlag();
    _collectActions();
  }

  function _tryCollect(key, elId) {
    var el = document.getElementById(elId);
    if (el) _record[key] = el.value.trim ? el.value.trim() : el.value;
  }

  function _collectParticipants() {
    var nameEls = document.querySelectorAll('.wiz-part-name');
    if (!nameEls.length) return;
    var roleEls = document.querySelectorAll('.wiz-part-role');
    var parts   = [];
    for (var i = 0; i < nameEls.length; i++) {
      parts.push({
        name: nameEls[i].value.trim(),
        role: roleEls[i] ? roleEls[i].value : 'worker',
      });
    }
    _record.participants = parts;
    // Keep worker field in sync with first participant for backward compat
    _record.worker = (parts[0] && parts[0].name) ? parts[0].name : '';
  }

  function _collectPartsFlag() {
    var el = document.getElementById('f-parts_flag');
    if (el) _record.parts_flag = el.checked;
  }

  function _collectActions() {
    var titles = document.querySelectorAll('[data-action-title]');
    if (!titles.length) return;
    var notes = document.querySelectorAll('[data-action-notes]');
    var arr   = [];
    for (var i = 0; i < titles.length; i++) {
      arr.push({
        title: titles[i].value || '',
        notes: notes[i] ? (notes[i].value || '') : '',
      });
    }
    _record.actions = arr;
  }

  // ── Tab switching ────────────────────────────────────────────

  function _switchTab(tab) {
    if (tab === _tab) return;
    _collect();
    RecordService.save(_id, _record);

    _tab = tab;

    document.querySelectorAll('.tab-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    var newIdx = TAB_INDEX[tab] || 0;
    document.querySelectorAll('.wiz-dot').forEach(function (dot, i) {
      dot.classList.toggle('active', i === newIdx);
      dot.textContent = (i === newIdx) ? '\u25cf' : '\u25cb';
    });

    var body = document.getElementById('wiz-body');
    if (body) {
      body.innerHTML = _renderTabBody(tab);
      _bindBodyEvents();
    }

    _autoFocus();
    _notifyContext();
  }

  function _autoFocus() {
    if (_tab === 'process') {
      var jobEl = document.getElementById('f-job');
      if (jobEl && !jobEl.value) jobEl.focus();
    } else if (_tab === 'details') {
      var nameInputs = document.querySelectorAll('.wiz-part-name');
      if (nameInputs.length && !nameInputs[0].value) nameInputs[0].focus();
    } else if (_tab === 'story') {
      var storyEl = document.getElementById('f-story');
      if (storyEl && !storyEl.value) storyEl.focus();
    }
  }

  // ── Save / Cancel ────────────────────────────────────────────

  function _save() {
    _collect();

    if (!(_record.job || '').trim()) {
      _switchTab('process');
      setTimeout(function () {
        var jobEl = document.getElementById('f-job');
        if (jobEl) {
          jobEl.focus();
          jobEl.style.borderColor = 'var(--stamp)';
          setTimeout(function () { jobEl.style.borderColor = ''; }, 1400);
        }
      }, 40);
      App.toast('Job title is required');
      return;
    }

    RecordService.save(_id, _record).then(function (saved) {
      if (saved.customer && saved.customer_phone) {
        BlockRegistry.save(saved.customer, saved.customer_phone);
      }
      // After saving an expense, return to the parent record
      if (_mode === 'expense' && saved.parentId) {
        App.showView(saved.parentId);
      } else {
        App.showView(_id);
      }
    });
  }

  function _saveDraft() {
    _collect();
    RecordService.save(_id, _record).then(function () {
      App.toast('Draft saved');
    });
  }

  function _cancel() {
    if (_mode === 'new' || _mode === 'expense') {
      RecordService.remove(_id).then(function () {
        if (_mode === 'expense' && _record.parentId) {
          App.showView(_record.parentId);
        } else {
          App.showList();
        }
      });
    } else {
      App.showView(_id);
    }
  }

  // ── Event binding ────────────────────────────────────────────

  function _bindEvents(screenEl) {
    screenEl.querySelectorAll('.tab-btn').forEach(function (btn) {
      btn.addEventListener('click', function () { _switchTab(this.dataset.tab); });
    });

    ['wiz-cancel-top', 'wiz-cancel-bottom'].forEach(function (id) {
      var btn = document.getElementById(id);
      if (btn) btn.addEventListener('click', _cancel);
    });

    var saveBtn  = document.getElementById('wiz-save');
    var draftBtn = document.getElementById('wiz-save-draft');
    if (saveBtn)  saveBtn.addEventListener('click',  _save);
    if (draftBtn) draftBtn.addEventListener('click', _saveDraft);

    screenEl.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        _save();
      }
    });

    _bindBodyEvents();
    _autoFocus();
  }

  function _bindBodyEvents() {
    // ── Add action ───────────────────────────────────────────
    var addActionBtn = document.getElementById('wiz-add-action');
    if (addActionBtn) {
      addActionBtn.addEventListener('click', function () {
        _collectActions();
        _record.actions = (_record.actions || []).concat([{ title: '', notes: '' }]);
        var body = document.getElementById('wiz-body');
        if (body) {
          body.innerHTML = _renderTabBody('actions');
          _bindBodyEvents();
          var inputs = document.querySelectorAll('.wiz-action-title');
          if (inputs.length) inputs[inputs.length - 1].focus();
        }
      });
    }

    // ── Remove action ────────────────────────────────────────
    document.querySelectorAll('.wiz-action-remove').forEach(function (btn) {
      btn.addEventListener('click', function () {
        _collectActions();
        var idx = parseInt(this.dataset.remove, 10);
        if (_record.actions) _record.actions.splice(idx, 1);
        var body = document.getElementById('wiz-body');
        if (body) {
          body.innerHTML = _renderTabBody('actions');
          _bindBodyEvents();
        }
      });
    });

    // ── Add participant ──────────────────────────────────────
    var addPartBtn = document.getElementById('wiz-add-part');
    if (addPartBtn) {
      addPartBtn.addEventListener('click', function () {
        _collectParticipants();
        _record.participants = (_record.participants || []).concat([{ name: '', role: 'worker' }]);
        var body = document.getElementById('wiz-body');
        if (body) {
          body.innerHTML = _renderTabBody('details');
          _bindBodyEvents();
          var nameInputs = document.querySelectorAll('.wiz-part-name');
          if (nameInputs.length) nameInputs[nameInputs.length - 1].focus();
        }
      });
    }

    // ── Remove participant ───────────────────────────────────
    document.querySelectorAll('.wiz-part-remove').forEach(function (btn) {
      btn.addEventListener('click', function () {
        _collectParticipants();
        var idx = parseInt(this.dataset.removePart, 10);
        if (_record.participants && _record.participants.length > 1) {
          _record.participants.splice(idx, 1);
        }
        var body = document.getElementById('wiz-body');
        if (body) {
          body.innerHTML = _renderTabBody('details');
          _bindBodyEvents();
        }
      });
    });

    // ── Record type selector ─────────────────────────────────
    var typeRow = document.querySelector('.wiz-type-row');
    if (typeRow) {
      typeRow.addEventListener('click', function(e) {
        var btn = e.target.closest('.wiz-type-btn');
        if (!btn) return;
        _record.record_type = btn.dataset.type;
        document.querySelectorAll('.wiz-type-btn').forEach(function(b) {
          b.classList.toggle('active', b.dataset.type === _record.record_type);
        });
        RecordService.save(_id, _record);
      });
    }

    // ── ME button — fill customer from profile ───────────────
    var meBtn = document.getElementById('wiz-me-btn');
    if (meBtn) {
      meBtn.addEventListener('click', function () {
        var identity = (typeof ActivityService !== 'undefined') ? ActivityService.getSenderIdentity() : null;
        var name = identity && identity.name ? identity.name : '';
        var customerInput = document.getElementById('f-customer');
        if (customerInput && name) customerInput.value = name;
      });
    }

    // ── Action filter ────────────────────────────────────────
    var actFilterEl = document.getElementById('wiz-act-filter');
    if (actFilterEl) {
      actFilterEl.addEventListener('input', function () {
        _actFilter = this.value;
        _collect(); // persist current field values before re-rendering
        var body = document.getElementById('wiz-body');
        if (body) { body.innerHTML = _renderTabBody('actions'); _bindBodyEvents(); }
        var f = document.getElementById('wiz-act-filter');
        if (f) f.focus();
      });
    }

    // ── Drag-and-drop action reordering ─────────────────────
    var actList = document.getElementById('wiz-actions-list');
    if (actList) {
      actList.addEventListener('dragstart', function (e) {
        var item = e.target.closest('.wiz-action');
        if (!item) return;
        _dragIndex = parseInt(item.dataset.index, 10);
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      actList.addEventListener('dragend', function (e) {
        var item = e.target.closest('.wiz-action');
        if (item) item.classList.remove('dragging');
        actList.querySelectorAll('.drag-over').forEach(function (el) { el.classList.remove('drag-over'); });
      });
      actList.addEventListener('dragover', function (e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        var item = e.target.closest('.wiz-action');
        if (!item) return;
        actList.querySelectorAll('.drag-over').forEach(function (el) { el.classList.remove('drag-over'); });
        item.classList.add('drag-over');
      });
      actList.addEventListener('drop', function (e) {
        e.preventDefault();
        var item = e.target.closest('.wiz-action');
        if (!item || _dragIndex < 0) return;
        var dropIndex = parseInt(item.dataset.index, 10);
        if (dropIndex === _dragIndex) return;
        _collect(); // save current text values first
        var actions = _record.actions || [];
        var moved = actions.splice(_dragIndex, 1)[0];
        actions.splice(dropIndex, 0, moved);
        _record.actions = actions;
        _dragIndex = -1;
        _actFilter = '';
        var body = document.getElementById('wiz-body');
        if (body) { body.innerHTML = _renderTabBody('actions'); _bindBodyEvents(); }
      });
    }

    // ── More section toggle ──────────────────────────────────
    var moreToggle = document.getElementById('wiz-more-toggle');
    if (moreToggle) {
      moreToggle.addEventListener('click', function () {
        var moreBody = document.getElementById('wiz-more-body');
        var arrow    = document.getElementById('wiz-more-arrow');
        if (!moreBody) return;
        var open = moreBody.style.display !== 'none';
        moreBody.style.display = open ? 'none' : '';
        if (arrow) arrow.style.transform = open ? '' : 'rotate(90deg)';
      });
    }

    // ── Currency change → update symbols ─────────────────────
    var currencyEl = document.getElementById('f-currency');
    if (currencyEl) {
      currencyEl.addEventListener('change', function () {
        var sym = this.value === 'EUR' ? '\u20ac' : this.value === 'USD' ? '$' : '\u00a3';
        document.querySelectorAll('.wiz-curr-sym').forEach(function (el) {
          el.textContent = sym;
        });
      });
    }

    // ── Field note — open/close ──────────────────────────────
    document.querySelectorAll('.wiz-field-note-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var field = this.dataset.field;
        var box   = document.getElementById('wiz-notebox-' + field);
        if (!box) return;
        var open = box.style.display !== 'none';
        box.style.display = open ? 'none' : '';
        if (!open) {
          var ta = box.querySelector('textarea');
          if (ta) { ta.value = ''; ta.focus(); }
        }
      });
    });

    // ── Field note — save ────────────────────────────────────
    document.querySelectorAll('.wiz-note-save').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var field = this.dataset.field;
        var label = this.dataset.label;
        var box   = document.getElementById('wiz-notebox-' + field);
        var ta    = box ? box.querySelector('textarea') : null;
        var text  = ta ? (ta.value || '').trim() : '';
        if (!text) return;
        PersonalService.capture({
          text:           text,
          source:         'field-note',
          linkedRecordId: _id,
          linkedFieldId:  field,
        }).then(function () {
          if (ta)  ta.value = '';
          if (box) box.style.display = 'none';
          App.toast('Note saved');
          if (typeof PersonalPanel !== 'undefined' && PersonalPanel.refresh) {
            PersonalPanel.refresh();
          }
        });
      });
    });

    // ── Field note — cancel ──────────────────────────────────
    document.querySelectorAll('.wiz-note-cancel').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var box = document.getElementById('wiz-notebox-' + this.dataset.field);
        if (box) box.style.display = 'none';
      });
    });

    // ── Markdown preview toggles ─────────────────────────────
    var storyMdBtn = document.getElementById('wiz-story-md-btn');
    if (storyMdBtn) {
      storyMdBtn.addEventListener('click', function () {
        // Collect current text before toggling
        var ta = document.getElementById('f-story');
        if (ta) _record.story = ta.value;
        _storyPreview = !_storyPreview;
        var body = document.getElementById('wiz-body');
        if (body) { body.innerHTML = _renderTabBody('story'); _bindBodyEvents(); }
      });
    }
    var detailsMdBtn = document.getElementById('wiz-details-md-btn');
    if (detailsMdBtn) {
      detailsMdBtn.addEventListener('click', function () {
        var ta = document.getElementById('f-details');
        if (ta) _record.details = ta.value;
        _detailsPreview = !_detailsPreview;
        var body = document.getElementById('wiz-body');
        if (body) { body.innerHTML = _renderTabBody('story'); _bindBodyEvents(); }
      });
    }
  }

  // ── Helpers ──────────────────────────────────────────────────

  function _esc(s) {
    return String(s || '')
      .replace(/&/g,  '&amp;')
      .replace(/</g,  '&lt;')
      .replace(/>/g,  '&gt;')
      .replace(/"/g,  '&quot;');
  }

  // ── Public ───────────────────────────────────────────────────

  return { onShow: onShow, onHide: onHide };

}());
