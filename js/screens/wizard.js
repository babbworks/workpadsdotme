/* ============================================================
   WizardScreen — PADS creation / edit form
   Tabs: Process · Actions · Details · Story
   ============================================================ */

var WizardScreen = (function () {
  'use strict';

  // ── State ────────────────────────────────────────────────────
  var _record         = {};
  var _id             = null;
  var _mode           = 'new';   // 'new' | 'edit' | 'expense' | 'payment'
  var _padType        = 'work';  // 'work' | 'field' | 'note' | 'plan'
  var _locations      = [{ address: '', notes: '', map_url: '', google_map_url: '', apple_map_url: '', lat: null, lon: null, zoom: null, map_snapshot: null }];
  var _parentRecord   = null;
  var _tab            = 'process';
  var _stylesAdded    = false;
  var _storyPreview   = false;
  var _detailsPreview = false;
  var _actFilter      = '';
  var _dragIndex      = -1;
  var _locDragIndex   = -1;
  var _contentUnlocked = false;  // true after user unlocks a sealed record this session

  var TABS = [
    { key: 'process', label: 'Process' },
    { key: 'actions', label: 'Actions' },
    { key: 'details', label: 'Details' },
    { key: 'story',   label: 'Story'   },
  ];

  var TAB_INDEX = { process: 0, actions: 1, details: 2, story: 3 };

  var TABS_FIELD = [
    { key: 'process', label: 'Process' },
    { key: 'actions', label: 'Actions' },
    { key: 'story',   label: 'Notes'   },
  ];

  var TABS_NOTE = [
    { key: 'process', label: 'Process' },
    { key: 'actions', label: 'Actions' },
    { key: 'details', label: 'Details' },
    { key: 'story',   label: 'Summary' },
  ];

  var TABS_PLAN = [
    { key: 'process', label: 'Process' },
    { key: 'actions', label: 'Actions' },
    { key: 'story',   label: 'General Plan' },
    { key: 'details', label: 'Details' },
  ];

  function _tabs() {
    if (_mode === 'payment') {
      return [
        { key: 'process', label: 'Process' },
        { key: 'story',   label: 'Note'    },
      ];
    }
    if (_mode === 'expense') {
      return [
        { key: 'process', label: 'Process' },
        { key: 'actions', label: 'Items'   },
        { key: 'details', label: 'Details' },
        { key: 'story',   label: 'Story'   },
      ];
    }
    if (_padType === 'field') return TABS_FIELD;
    if (_padType === 'note')  return TABS_NOTE;
    if (_padType === 'plan')  return TABS_PLAN;
    return TABS;
  }

  function _tabIndex(key) {
    var tabs = _tabs();
    for (var i = 0; i < tabs.length; i++) {
      if (tabs[i].key === key) return i;
    }
    return 0;
  }

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
      '.wiz-cancel-top {',
      '  font-family:var(--font-mono); font-size:11px; font-weight:700;',
      '  color:var(--ink-muted); background:none; border:none; padding:0 0 20px;',
      '  cursor:pointer; display:block; transition:color .13s;',
      '}',
      '.wiz-cancel-top:hover { color:var(--ink); }',

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
      '.wiz-field-row {',
      '  display:flex; align-items:stretch;',
      '}',
      '.wiz-field-row .field-input {',
      '  flex:1; border-radius:3px 0 0 3px;',
      '}',
      '.wiz-field-note-btn {',
      '  flex-shrink:0; width:34px;',
      '  display:flex; align-items:center; justify-content:center;',
      '  font-size:15px; font-weight:900; line-height:1;',
      '  color:var(--ink-mid); background:var(--rule-light);',
      '  border:1.5px solid var(--rule); border-left:none;',
      '  border-radius:0 3px 3px 0;',
      '  cursor:pointer; transition:background .12s, color .12s;',
      '}',
      '.wiz-field-note-btn:hover { background:var(--rule); color:var(--stamp); }',
      '.wiz-field-note-btn:focus { outline:2px solid var(--stamp-border); outline-offset:-2px; }',

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

      /* Expense parent banner */
      '.wiz-expense-parent {',
      '  margin-bottom:16px; padding:10px 14px;',
      '  background:var(--stamp-light); border:1px solid var(--stamp-border);',
      '  border-radius:3px;',
      '}',
      '.wiz-expense-parent-job {',
      '  font-family:var(--font-body); font-size:13px; font-weight:700;',
      '  color:var(--ink); margin-bottom:3px;',
      '}',
      '.wiz-expense-parent-meta {',
      '  font-family:var(--font-mono); font-size:9px; color:var(--ink-muted);',
      '  letter-spacing:.04em; margin-bottom:5px;',
      '}',
      '.wiz-expense-parent-ids {',
      '  font-family:var(--font-mono); font-size:9px; color:var(--ink-faint);',
      '  letter-spacing:.04em;',
      '}',

      /* Expense billing toggle */
      '.wiz-billing-row {',
      '  display:flex; gap:6px; margin-bottom:16px;',
      '}',
      '.wiz-billing-btn {',
      '  font-family:var(--font-mono); font-size:9px; font-weight:700;',
      '  letter-spacing:.08em; text-transform:uppercase;',
      '  color:var(--ink-muted); border:1.5px solid var(--rule);',
      '  border-radius:3px; padding:4px 10px; cursor:pointer;',
      '  transition:all .13s; background:none;',
      '}',
      '.wiz-billing-btn.active {',
      '  color:var(--stamp); border-color:var(--stamp-border); background:var(--stamp-light);',
      '}',
      '.wiz-billing-btn:hover:not(.active) { border-color:var(--ink-faint); color:var(--ink-mid); }',

      /* COGS label style */
      '.wiz-cogs-label {',
      '  font-family:var(--font-mono); font-size:10px; font-weight:700;',
      '  letter-spacing:.1em; text-transform:uppercase; color:var(--ink-faint);',
      '}',

      /* COGS quoted context */
      '.wiz-cogs-quoted-row {',
      '  display:flex; gap:8px; align-items:center;',
      '}',
      '.wiz-cogs-pct-badge {',
      '  font-family:var(--font-mono); font-size:11px; font-weight:700;',
      '  padding:5px 9px; border-radius:3px; flex-shrink:0;',
      '  background:var(--stamp-light); color:var(--stamp);',
      '  transition:background .15s, color .15s;',
      '}',
      '.wiz-cogs-pct-badge.over { background:rgba(184,64,64,.1); color:#b84040; }',
      '.wiz-cogs-pct-note {',
      '  font-family:var(--font-mono); font-size:9px; color:var(--ink-faint);',
      '  margin-top:4px; letter-spacing:.03em;',
      '}',

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

      /* Field locations — collapse, drag, label */
      '.wiz-location-item {',
      '  border:1px solid var(--rule-light); border-radius:4px; margin-bottom:12px;',
      '  background:var(--paper-warm);',
      '}',
      '.wiz-location-item.dragging { opacity:.45; }',
      '.wiz-location-item.drag-over { box-shadow:inset 0 2px 0 var(--stamp); }',
      '.wiz-location-head {',
      '  display:flex; align-items:center; gap:6px; padding:8px 10px;',
      '  border-bottom:1px solid var(--rule-light);',
      '}',
      '.wiz-location-item.collapsed .wiz-location-head { border-bottom:none; }',
      '.wiz-loc-drag {',
      '  cursor:grab; color:var(--ink-faint); font-size:14px; user-select:none; flex-shrink:0;',
      '}',
      '.wiz-loc-collapse {',
      '  background:none; border:none; padding:0; cursor:pointer;',
      '  font-family:var(--font-mono); font-size:11px; color:var(--ink-muted); width:14px;',
      '}',
      '.wiz-loc-title { flex:1; min-width:0; font-size:13px; padding:6px 8px; }',
      '.wiz-location-body { padding:10px 12px 12px; }',
      '.wiz-location-row { display:flex; gap:8px; margin-bottom:8px; }',
      '.wiz-location-row .field-input { flex:1; }',
      '.wiz-location-remove {',
      '  background:none; border:none; color:var(--ink-faint); font-size:18px;',
      '  cursor:pointer; padding:0 4px; line-height:1; flex-shrink:0;',
      '}',
      '.wiz-location-remove:hover { color:var(--stamp); }',

      /* Locked content (sealed until unlock) */
      '.wiz-fields-wrap.wiz-fields-locked input,',
      '.wiz-fields-wrap.wiz-fields-locked textarea,',
      '.wiz-fields-wrap.wiz-fields-locked select,',
      '.wiz-fields-wrap.wiz-fields-locked button {',
      '  pointer-events:none; opacity:.55;',
      '}',

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

  function _blankLocation() {
    return {
      title: '', address: '', notes: '', map_url: '', google_map_url: '', apple_map_url: '',
      lat: null, lon: null, zoom: null, map_snapshot: null, collapsed: false,
    };
  }

  function onShow(params) {
    _addStyles();
    _mode           = params.mode || 'new';
    _padType        = (typeof PadType !== 'undefined')
      ? PadType.forWizard({}, params.padType || 'work')
      : (params.padType || 'work');
    _tab            = 'process';
    _storyPreview   = false;
    _detailsPreview = false;
    _actFilter      = '';
    _dragIndex      = -1;
    _contentUnlocked = false;
    _locations      = [_blankLocation()];

    if (_mode === 'edit' && params.id) {
      _id = params.id;
      RecordService.get(_id).then(function (r) {
        _record = r || {};
        _padType = (typeof PadType !== 'undefined')
          ? PadType.forWizard(r, params.padType)
          : (r.record_class || params.padType || 'work');
        _locations = (r._locations_json && JSON.parse(
          typeof MapUtils !== 'undefined' ? MapUtils.expandLocationsJson(r._locations_json) : r._locations_json
        )) || [Object.assign(_blankLocation(), { address: r.location || '' })];
        _locations = _locations.map(function (loc) {
          return Object.assign(_blankLocation(), loc);
        });
        _render();
        _notifyContext();
      });
    } else if (_mode === 'expense' && params.parentId) {
      var parentId = params.parentId;
      var preAmount = (params.amount && params.amount !== '_') ? params.amount : null;
      var preActionIdx = (params.actionIdx != null && !isNaN(params.actionIdx)) ? params.actionIdx : null;
      var linkedExpenseId = params.linkedExpenseId || null;
      var actionQuoted = params.actionQuoted || null;
      RecordService.get(parentId).then(function (parent) {
        _parentRecord = parent || null;
        var identity  = (typeof ActivityService !== 'undefined') ? ActivityService.getSenderIdentity() : null;
        var action = (preActionIdx != null && parent && parent.actions) ? parent.actions[preActionIdx] : null;

        // If linked to a specific expense, look it up for default job name
        var linkedExpenseJob = '';
        if (linkedExpenseId) {
          RecordService.get(linkedExpenseId).then(function (linkedExp) {
            if (linkedExp && linkedExp.job) linkedExpenseJob = linkedExp.job;
          });
        }

        var fields = {
          recordType:       'expense',
          parentId:         parentId,
          job:              '',
          customer:         parent ? (parent.customer || '') : '',
          worker:           (identity && identity.name) || '',
          expense_billing:  params.billing || 'customer',
          amount:           preAmount || undefined,
        };
        if (actionQuoted) fields.action_quoted = actionQuoted;
        if (linkedExpenseId) fields.linkedExpenseId = linkedExpenseId;
        if (preActionIdx != null) {
          fields.actionIdx   = preActionIdx;
          fields.actionTitle = action ? action.title : '';
        }
        RecordService.create(fields).then(function (r) {
          _record = r;
          _id     = r.id;
          _render();
          _notifyContext();
        });
      });
    } else if (_mode === 'payment' && params.parentId) {
      var parentId = params.parentId;
      RecordService.get(parentId).then(function (parent) {
        _parentRecord = parent || null;
        var identity  = (typeof ActivityService !== 'undefined') ? ActivityService.getSenderIdentity() : null;
        RecordService.create({
          recordType: 'payment',
          parentId:   parentId,
          job:        'Payment received',
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
      WorkpadsPanel.setContext('wizard', {
        customer: _record.customer || '',
        padType: _padType,
        job: _record.job || '',
      });
    }
  }

  // ── Render ───────────────────────────────────────────────────

  function _render() {
    var el = document.getElementById('screen-wizard');
    el.innerHTML = (
      '<div class="wiz-wrap">' +
        '<button class="wiz-cancel-top" id="wiz-cancel-top">\u2190 Cancel</button>' +
        _renderHeader() +
        (_mode === 'expense' || _mode === 'payment' ? _renderExpenseBanner() : '') +
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
    var p        = _parentRecord;
    var job      = p ? _esc(p.job || 'Untitled') : 'Parent record';
    var customer = p && p.customer ? _esc(p.customer) : '';
    var parentId = _record.parentId || '';
    var recId    = _id || '';
    var typeLabel = _mode === 'payment' ? 'Payment' : 'Expense';
    return (
      '<div class="wiz-expense-parent">' +
        '<div class="wiz-expense-parent-job">' + job + '</div>' +
        (customer ? '<div class="wiz-expense-parent-meta">Customer \u00b7 ' + customer + '</div>' : '') +
        '<div class="wiz-expense-parent-ids">' +
          'Parent\u00a0ID\u00a0' + _esc(parentId) +
          (recId ? '\u00a0\u00b7\u00a0 ' + typeLabel + '\u00a0ID\u00a0' + _esc(recId) : '') +
        '</div>' +
      '</div>'
    );
  }

  function _renderTabBar() {
    var html = '<div class="tab-bar">';
    _tabs().forEach(function (t) {
      html += '<button class="tab-btn' + (t.key === _tab ? ' active' : '') + '" data-tab="' + t.key + '">' +
                t.label +
              '</button>';
    });
    return html + '</div>';
  }

  function _renderDots() {
    var tabs = _tabs();
    var idx  = _tabIndex(_tab);
    var html = '<div class="wiz-dots">';
    for (var i = 0; i < tabs.length; i++) {
      html += '<span class="wiz-dot' + (i === idx ? ' active' : '') + '">' +
              (i === idx ? '\u25cf' : '\u25cb') + '</span>';
    }
    return html + '</div>';
  }

  function _saveLabel() {
    if (_padType === 'field') return 'Save field pad';
    if (_padType === 'note')  return 'Save memo';
    if (_padType === 'plan')  return 'Save plan';
    return 'Save workpad';
  }

  function _renderFooter() {
    var tabs    = _tabs();
    var tabIdx  = _tabIndex(_tab);
    var hasNext = tabIdx < tabs.length - 1;
    return (
      '<div class="wiz-footer">' +
        '<button class="btn-ghost" id="wiz-cancel-bottom">Cancel</button>' +
        '<div class="wiz-footer-right">' +
          '<span class="wiz-kbd-hint">Ctrl+S to save</span>' +
          '<button class="btn-ghost" id="wiz-save-draft">Save draft</button>' +
          (hasNext ? '<button class="btn-ghost" id="wiz-next">Next</button>' : '') +
          '<button class="btn-primary" id="wiz-save">' + _saveLabel() + '</button>' +
        '</div>' +
      '</div>'
    );
  }

  function _nextTab() {
    var tabs = _tabs();
    var idx  = _tabIndex(_tab);
    if (idx < tabs.length - 1) _switchTab(tabs[idx + 1].key);
  }

  // ── Tab bodies ───────────────────────────────────────────────

  function _renderTabBody(tab) {
    // Expense / payment keep their own paths unchanged
    if (_mode === 'expense' || _mode === 'payment') {
      switch (tab) {
        case 'process': return _renderProcess();
        case 'actions': return _renderActions();
        case 'details': return _renderDetails();
        case 'story':   return _renderStory();
        default:        return '';
      }
    }
    switch (_padType) {
      case 'field':
        switch (tab) {
          case 'process': return _renderProcessField();
          case 'actions': return _renderActions();
          case 'story':   return _renderNarrativeTab('story');
          default:        return '';
        }
      case 'note':
        switch (tab) {
          case 'process': return _renderProcessNote();
          case 'actions': return _renderActionsNote();
          case 'details': return _renderDetailsNote();
          case 'story':   return _renderNarrativeTab('story');
          default:        return '';
        }
      case 'plan':
        switch (tab) {
          case 'process': return _renderProcessPlan();
          case 'actions': return _renderActions();
          case 'story':   return _renderNarrativeTab('story');
          case 'details': return _renderNarrativeTab('details');
          default:        return '';
        }
      default: // 'work'
        switch (tab) {
          case 'process': return _renderProcess();
          case 'actions': return _renderActions();
          case 'details': return _renderDetails();
          case 'story':   return _renderStory();
          default:        return '';
        }
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

  function _renderActionPicker() {
    if (_mode !== 'expense' || !_parentRecord || !_parentRecord.actions || !_parentRecord.actions.length) return '';
    var current = _record.actionIdx != null ? String(_record.actionIdx) : '';
    var opts = '<option value="">— no specific action —</option>';
    _parentRecord.actions.forEach(function (a, i) {
      opts += '<option value="' + i + '"' + (String(i) === current ? ' selected' : '') + '>' + _esc(a.title) + '</option>';
    });
    return (
      '<div class="field-group">' +
        '<label class="field-label" for="f-action-idx">Action</label>' +
        '<select class="field-input" id="f-action-idx">' + opts + '</select>' +
      '</div>'
    );
  }

  function _isContentLocked() {
    return (typeof WorkpadsEncrypt !== 'undefined') &&
      WorkpadsEncrypt.isSealed(_record) &&
      !_contentUnlocked;
  }

  function _fieldsWrapClass() {
    return _isContentLocked() ? ' wiz-fields-locked' : '';
  }

  function _renderEncryptBlock() {
    if (_mode === 'expense' || _mode === 'payment') return '';
    var on     = !!_record.encrypt_enabled;
    var sealed = (typeof WorkpadsEncrypt !== 'undefined') && WorkpadsEncrypt.isSealed(_record);
    var padName = (typeof PadType !== 'undefined')
      ? PadType.label({ record_class: _padType }).toLowerCase()
      : 'workpad';
    var lockBtn = (on && !sealed)
      ? '<button class="btn-ghost" id="wiz-lock-seal" type="button" style="margin-top:6px;font-size:10px;padding:4px 10px;">Lock now</button>'
      : '';
    return (
      '<div class="wiz-encrypt-block">' +
        '<div class="wiz-encrypt-row">' +
          '<input type="checkbox" id="f-encrypt_enabled"' + (on ? ' checked' : '') + '>' +
          '<label for="f-encrypt_enabled">Encrypt this ' + padName + '</label>' +
        '</div>' +
        '<p class="wiz-encrypt-hint">Content can be locked with a passphrase before sharing. Title and type stay visible on this device.</p>' +
        '<div class="wiz-encrypt-pass" id="wiz-encrypt-pass"' + (on ? '' : ' style="display:none;"') + '>' +
          '<input class="field-input" type="password" id="f-encrypt_pass" placeholder="Passphrase" autocomplete="new-password">' +
          (sealed
            ? '<button class="btn-ghost" id="wiz-unlock-seal" type="button" style="margin-top:6px;font-size:10px;padding:4px 10px;">Unlock to edit</button>'
            : lockBtn) +
        '</div>' +
        (sealed && _isContentLocked()
          ? '<p class="wiz-encrypt-sealed">Content is locked — unlock to edit fields below.</p>'
          : '') +
      '</div>'
    );
  }

  function _narrativeCopy(part) {
    var p = _padType;
    if (p === 'field') {
      return part === 'story'
        ? { label: 'Activity notes', ph: 'What happened on site — observations, handoffs, outcomes…', hint: 'Readable when you share this field pad' }
        : { label: 'Details', ph: '', hint: '' };
    }
    if (p === 'note') {
      return part === 'story'
        ? { label: 'Summary', ph: 'The headline takeaway — what this memo is about…', hint: 'Short overview for yourself or a reader' }
        : { label: 'Details', ph: 'Supporting detail, references, quotes…', hint: 'Use the Actions tab for step-by-step items' };
    }
    if (p === 'plan') {
      return part === 'story'
        ? { label: 'General plan', ph: 'Overall goal, scope, milestones, and approach…', hint: 'The big picture — not individual tasks' }
        : { label: 'Details', ph: 'Constraints, resources, risks, assumptions…', hint: 'Context that supports the plan' };
    }
    return part === 'story'
      ? { label: 'Story', ph: 'A plain account of the work…', hint: 'Narrative — readable by the customer' }
      : { label: 'Details', ph: 'Technical notes, materials, measurements…', hint: 'Internal — included in the share link' };
  }

  function _renderNarrativeTab(part) {
    var cfg     = _narrativeCopy(part);
    var isStory = part === 'story';
    var sealed  = (typeof WorkpadsEncrypt !== 'undefined') && WorkpadsEncrypt.isSealed(_record);

    if (sealed && !_record[isStory ? 'story' : 'details']) {
      return (
        '<div class="card"><div class="card-section">' +
          '<p style="font-family:var(--font-mono);font-size:11px;color:var(--ink-muted);">' +
            'This workpad is sealed. Enter your passphrase on the Process tab and click Unlock to edit.' +
          '</p>' +
        '</div></div>'
      );
    }

    var showSummary = (_padType === 'work' && _mode !== 'expense' && _mode !== 'payment');
    var summaryHtml = '';
    if (showSummary && isStory) {
      var titleLine = [];
      if (_record.job)      titleLine.push('<strong>' + _esc(_record.job) + '</strong>');
      if (_record.customer) titleLine.push(_esc(_record.customer));
      if (_record.date)     titleLine.push(_esc(_record.date));
      summaryHtml = (
        '<div class="wiz-story-ctx">' +
          '<div class="wiz-story-ctx-label">Record summary</div>' +
          (titleLine.length
            ? '<div class="wiz-story-ctx-job">' + titleLine.join(' \xb7 ') + '</div>'
            : '<div class="wiz-story-ctx-job" style="color:var(--ink-faint);font-style:italic;">No title yet</div>') +
        '</div>'
      );
    }

    var fieldKey = isStory ? 'story' : 'details';
    var preview  = isStory ? _storyPreview : _detailsPreview;
    var toggleId = isStory ? 'wiz-story-md-btn' : 'wiz-details-md-btn';
    var inputId  = isStory ? 'f-story' : 'f-details';
    var prevId   = isStory ? 'f-story-preview' : 'f-details-preview';

    var mdRow = (
      '<div class="wiz-md-row">' +
        '<span class="wiz-md-label">' + cfg.label + '</span>' +
        '<div class="wiz-md-controls">' +
          '<button class="wiz-md-toggle" id="' + toggleId + '" type="button">' +
            (preview ? '\u270e Edit' : 'View as Markdown') +
          '</button>' +
          '<a class="wiz-md-help" href="https://commonmark.org/help/" target="_blank" rel="noopener" tabindex="-1">?</a>' +
        '</div>' +
      '</div>'
    );

    var fieldEl = preview
      ? '<div class="wiz-md-preview" id="' + prevId + '">' + _renderMarkdown(_record[fieldKey] || '') + '</div>'
      : '<textarea class="field-input field-textarea" id="' + inputId + '" rows="6"' +
          ' placeholder="' + _esc(cfg.ph) + '">' + _esc(_record[fieldKey] || '') + '</textarea>';

    return (
      '<div class="card"><div class="card-section">' +
        summaryHtml +
        '<div class="field-group">' + mdRow + fieldEl +
          (cfg.hint ? '<p class="field-hint">' + cfg.hint + '</p>' : '') +
        '</div>' +
      '</div></div>'
    );
  }

  function _renderLocMapPreview(loc) {
    if (typeof MapUtils === 'undefined') return '';
    return MapUtils.renderLocationPreview(loc);
  }

  // ── Field type renderer ──────────────────────────────────────

  function _renderProcessField() {
    var locHtml = '<div class="field-group"><label class="field-label">Locations</label>' +
      '<p class="field-hint">Map previews and postcards fetch tiles from <strong>OpenStreetMap</strong>. ' +
      'Share links keep coords only — receivers can fetch a richer preview on their device. Paste OSM, Google, or Apple links.</p>';
    locHtml += '<div class="wiz-locations-list" id="wiz-locations-list">';
    _locations.forEach(function(loc, i) {
      var isCollapsed = !!loc.collapsed;
      locHtml += '<div class="wiz-location-item' + (isCollapsed ? ' collapsed' : '') + '" draggable="true" data-loc-idx="' + i + '">' +
        '<div class="wiz-location-head">' +
          '<span class="wiz-loc-drag" title="Drag to reorder">\u2807</span>' +
          '<button type="button" class="wiz-loc-collapse" data-loc-collapse="' + i + '" title="Expand/collapse">' +
            (isCollapsed ? '\u25b8' : '\u25be') +
          '</button>' +
          '<input class="field-input wiz-loc-title" type="text" placeholder="Short label (e.g. Site A)"' +
            ' value="' + _esc(loc.title || '') + '" data-loc-field="title" data-loc-idx="' + i + '">' +
          (_locations.length > 1
            ? '<button class="wiz-location-remove" type="button" data-remove-loc="' + i + '" title="Remove">&times;</button>'
            : '') +
        '</div>' +
        '<div class="wiz-location-body" data-loc-body="' + i + '" style="' + (isCollapsed ? 'display:none' : '') + '">' +
        '<div class="wiz-location-row">' +
          '<input class="field-input wiz-loc-address" type="text" placeholder="Address or site name"' +
            ' value="' + _esc(loc.address || '') + '" data-loc-field="address" data-loc-idx="' + i + '">' +
        '</div>' +
        '<textarea class="field-input wiz-location-notes" rows="2" placeholder="Site notes — access, contacts, hazards…"' +
          ' data-loc-field="notes" data-loc-idx="' + i + '">' + _esc(loc.notes || '') + '</textarea>' +
        '<div class="wiz-loc-map-row">' +
          '<input class="field-input wiz-loc-map" type="url" inputmode="url"' +
            ' placeholder="OpenStreetMap link — used for map preview & snapshots"' +
            ' value="' + _esc(loc.map_url || '') + '" data-loc-field="map_url" data-loc-idx="' + i + '">' +
        '</div>' +
        '<div class="wiz-loc-map-row">' +
          '<input class="field-input wiz-loc-google" type="url" inputmode="url"' +
            ' placeholder="Google Maps link (optional)"' +
            ' value="' + _esc(loc.google_map_url || '') + '" data-loc-field="google_map_url" data-loc-idx="' + i + '">' +
        '</div>' +
        '<div class="wiz-loc-map-row">' +
          '<input class="field-input wiz-loc-apple" type="url" inputmode="url"' +
            ' placeholder="Apple Maps link (optional)"' +
            ' value="' + _esc(loc.apple_map_url || '') + '" data-loc-field="apple_map_url" data-loc-idx="' + i + '">' +
        '</div>' +
        '<div class="wiz-loc-enrich-row">' +
          '<button class="btn-ghost wiz-loc-enrich" type="button" data-loc-enrich="' + i + '">Fetch map snapshot</button>' +
          '<span class="wiz-loc-enrich-hint">Local snapshot for your editor — not embedded in share links. Google/Apple links open those apps; previews use OSM.</span>' +
        '</div>' +
        '<div class="wiz-loc-map-preview" data-loc-preview="' + i + '">' + _renderLocMapPreview(loc) + '</div>' +
        '</div>' +
      '</div>';
    });
    locHtml += '</div>';
    locHtml += '<button class="wiz-add-location-btn" id="wiz-add-location" type="button">+ Add location</button>';
    locHtml += '</div>';

    return (
      '<div class="card"><div class="card-section">' +
        _renderEncryptBlock() +
        '<div class="wiz-fields-wrap' + _fieldsWrapClass() + '">' +
        _field('job', 'Title', 'text', _record.job || '', true, 'Name this activity') +
        _field('date',       'Date',       'date', _record.date       || '', false, '') +
        _field('start_time', 'Start time', 'text', _record.start_time || '', false, '09:00') +
        _field('end_time',   'End time',   'text', _record.end_time   || '', false, '') +
        locHtml +
        _field('worker', 'Your alias', 'text', _record.worker || localStorage.getItem('wp_pref_alias') || '', false, 'Optional — how you sign this') +
        '</div>' +
      '</div></div>'
    );
  }

  // ── Note type renderer ───────────────────────────────────────

  function _renderProcessNote() {
    return (
      '<div class="card"><div class="card-section">' +
        _renderEncryptBlock() +
        '<div class="wiz-fields-wrap' + _fieldsWrapClass() + '">' +
        _field('job', 'Title', 'text', _record.job || '', true, 'Name this memo') +
        _field('worker', 'Your alias', 'text', _record.worker || localStorage.getItem('wp_pref_alias') || '', false, 'Optional — attribution only') +
        '</div>' +
      '</div></div>'
    );
  }

  function _renderActionsNote() {
    return (
      '<div class="card"><div class="card-section">' +
        '<div class="field-group">' +
          '<label class="field-label">Actions</label>' +
          '<textarea class="field-input" id="f-pads-actions" rows="10" style="height:180px;resize:none;" placeholder="Steps, bullets, or checklist items — one per line">' +
            _esc(_record.pads_actions || '') +
          '</textarea>' +
          '<p class="field-hint">Free-form list — not the structured action builder</p>' +
        '</div>' +
      '</div></div>'
    );
  }

  function _renderDetailsNote() {
    return (
      '<div class="card"><div class="card-section">' +
        '<div class="field-group">' +
          '<label class="field-label">Details</label>' +
          '<textarea class="field-input" id="f-pads-details" rows="10" style="height:180px;resize:none;" placeholder="References, links, quotes, background context…">' +
            _esc(_record.pads_details || _record.details || '') +
          '</textarea>' +
        '</div>' +
      '</div></div>'
    );
  }

  // ── Plan type renderer ───────────────────────────────────────

  function _renderProcessPlan() {
    return (
      '<div class="card"><div class="card-section">' +
        _renderEncryptBlock() +
        '<div class="wiz-fields-wrap' + _fieldsWrapClass() + '">' +
        _field('job',      'Title',    'text', _record.job      || '', true, 'What are you planning?') +
        _field('date',     'Start',    'date', _record.date     || '', false, 'When does this begin?') +
        _field('due_date', 'Due date', 'date', _record.due_date || '', false, 'Target completion') +
        _field('location', 'Location', 'text', _record.location || '', false, 'Where it happens (optional)') +
        '<div class="field-group">' +
          '<label class="field-label" for="f-location_map_url">Map link</label>' +
          '<input class="field-input" id="f-location_map_url" type="url" inputmode="url"' +
            (_isContentLocked() ? ' disabled readonly' : '') +
            ' placeholder="OpenStreetMap link — previews & postcards use OSM tiles"' +
            ' value="' + _esc(_record.location_map_url || '') + '">' +
          '<p class="field-hint">Map previews and postcards fetch tiles from OpenStreetMap. Paste any map link for coordinates; OSM URL gives the richest preview.</p>' +
          '<div id="wiz-plan-map-preview">' +
            ((typeof MapUtils !== 'undefined' && _record.location_lat != null)
              ? MapUtils.renderPreview(_record.location_lat, _record.location_lon, _record.location_zoom)
              : '') +
          '</div>' +
        '</div>' +
        _field('worker', 'Your alias', 'text', _record.worker || localStorage.getItem('wp_pref_alias') || '', false, 'Optional') +
        '</div>' +
      '</div></div>'
    );
  }

  // ── Work type (existing process renderer) ────────────────────

  function _renderProcess() {
    var jobLabel       = (_mode === 'expense' || (_mode === 'edit' && _record.recordType === 'expense')) ? 'Short description' : 'Job';
    var jobPlaceholder = (_mode === 'expense') ? 'Brief description of this item'
                      : (_mode === 'payment') ? 'Payment description'
                      : 'What is the job?';

    return (
      '<div class="card">' +
        '<div class="card-section">' +
          (_mode !== 'expense' && _mode !== 'payment' ? _renderRecordTypeSelector() : '') +
          _renderActionPicker() +
          _renderEncryptBlock() +
          '<div class="wiz-fields-wrap' + _fieldsWrapClass() + '">' +
          _field('job', jobLabel, 'text', _record.job || '', true, jobPlaceholder) +
          '<div class="field-group">' +
            '<label class="field-label" for="f-customer">Customer</label>' +
            '<div class="wiz-customer-row">' +
              '<input class="field-input" id="f-customer" type="text"' +
                (_isContentLocked() ? ' disabled readonly' : '') +
                ' value="' + _esc(_record.customer || '') + '" placeholder="Customer or client name">' +
              '<button class="wiz-me-btn" id="wiz-me-btn" type="button" title="Set to my own identity">ME</button>' +
            '</div>' +
          '</div>' +
          _field('date',     'Date',     'date', _record.date     || '', false, '') +
          '</div>' +
        '</div>' +
        '<div class="card-section wiz-fields-wrap' + _fieldsWrapClass() + '">' +
          _renderFinancialFields() +
        '</div>' +
      '</div>'
    );
  }

  function _actionCopy() {
    if (_padType === 'field') {
      return {
        emptyTitle: 'No steps yet', emptySub: 'Break the visit into checkpoints',
        titlePh: 'Step or checkpoint', notesPh: 'Site note for this step',
        addAction: '+ Add step', addSection: '+ Add section',
      };
    }
    if (_padType === 'plan') {
      return {
        emptyTitle: 'No tasks yet', emptySub: 'Add milestones and tasks in order',
        titlePh: 'Task or milestone', notesPh: 'Owner, deps, or notes',
        addAction: '+ Add task', addSection: '+ Add section',
      };
    }
    if (_padType === 'note') {
      return {
        emptyTitle: 'No items yet', emptySub: 'Use the Actions tab for free-form lists',
        titlePh: 'Item', notesPh: 'Notes',
        addAction: '+ Add item', addSection: '+ Add section',
      };
    }
    if (_mode === 'expense') {
      return {
        emptyTitle: 'No items yet', emptySub: 'List the expense items',
        titlePh: 'Item description', notesPh: 'Notes — optional',
        addAction: '+ Add item', addSection: '+ Add section',
      };
    }
    return {
      emptyTitle: 'No actions yet', emptySub: 'Break the job into steps',
      titlePh: 'Step title', notesPh: 'Notes — optional',
      addAction: '+ Add action', addSection: '+ Add section',
    };
  }

  function _renderFinancialFields() {
    var currency   = _record.currency    || localStorage.getItem('wp_pref_currency') || 'CAD';
    var amount     = _record.amount      || '';
    var vat        = _record.vat         || 'none';
    var workerCost = _record.worker_cost || '';
    var chargeType = _record.charge_type != null ? String(_record.charge_type) : '';
    var partsFlag  = _record.parts_flag  || false;

    var sym = currency === 'EUR' ? '\u20ac' : (currency === 'USD' || currency === 'CAD') ? '$' : '\u00a3';

    var currencyOpts = [
      { code: 'CAD', label: '$ CAD' },
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

    var isExpense   = (_mode === 'expense');
    var isPayment   = (_mode === 'payment');
    var billing     = _record.expense_billing || 'customer';
    var isCogs      = isExpense && billing === 'cogs';
    var amtLabelTxt = isPayment ? 'Payment amount'
                    : isCogs   ? 'Cost of Goods Sold'
                    : isExpense ? 'Expense amount'
                    : 'Customer price';

    var billingToggle = isExpense
      ? '<div class="wiz-billing-row">' +
          '<button type="button" class="wiz-billing-btn' + (billing === 'customer' ? ' active' : '') +
            '" data-billing="customer">Expense Amount</button>' +
          '<button type="button" class="wiz-billing-btn' + (billing === 'cogs' ? ' active' : '') +
            '" data-billing="cogs"' + (billing !== 'cogs' ? ' style="opacity:.55;"' : '') +
            '>COGS <span class="wiz-cogs-label">(Cost of Goods Sold)</span></button>' +
        '</div>'
      : '';

    // Payment mode: show "Applied to" dropdown with parent action items
    var paymentAppliedToField = '';
    if (isPayment && _parentRecord && _parentRecord.actions && _parentRecord.actions.length) {
      var currentApplied = _record.payment_ref || '';
      var appliedOpts = '<option value="">General payment</option>';
      _parentRecord.actions.forEach(function (a, i) {
        appliedOpts += '<option value="' + _esc(a.title) + '"' +
          (currentApplied === a.title ? ' selected' : '') + '>' + _esc(a.title) + '</option>';
      });
      paymentAppliedToField = (
        '<div class="field-group">' +
          '<label class="field-label">Applied to</label>' +
          '<select class="field-input wiz-field-select" id="f-payment_ref" style="width:100%;">' + appliedOpts + '</select>' +
        '</div>'
      );
    }

    return (
      billingToggle +
      (isPayment
        ? paymentAppliedToField
        : '<div class="field-group">' +
            '<label class="field-label">Charge type</label>' +
            '<select class="field-input wiz-field-select" id="f-charge_type" style="width:100%;">' +
              chargeTypeOpts +
            '</select>' +
          '</div>') +
      '<div class="field-group">' +
        '<label class="field-label" id="wiz-amount-label">' + amtLabelTxt + '</label>' +
        '<div class="wiz-finance-row">' +
          '<span class="wiz-finance-sym wiz-curr-sym">' + sym + '</span>' +
          '<input class="field-input" id="f-amount" type="text" inputmode="decimal"' +
            ' value="' + _esc(amount) + '" placeholder="0.00" style="flex:1;">' +
          '<select class="wiz-field-select" id="f-currency">' + currencyOpts + '</select>' +
        '</div>' +
      '</div>' +
      (!isPayment
        ? '<div class="field-group">' +
            '<label class="field-label">Tax</label>' +
            '<select class="field-input wiz-field-select" id="f-vat" style="width:100%;">' + vatOpts + '</select>' +
          '</div>'
        : '') +
      (isCogs && _record.linkedExpenseId
        ? '<div style="padding:6px 12px;margin-bottom:2px;background:rgba(120,100,80,.06);border-radius:3px;font-family:var(--font-mono);font-size:9px;color:var(--ink-muted);">' +
            'Costing for expense \u2014 COGS within the expense amount is self-funded (covered by your charge to the customer). Only overruns affect P&amp;L.' +
          '</div>'
        : '') +
      (isCogs && !_record.linkedExpenseId && _record.amount
        ? '<div style="padding:5px 12px;margin-bottom:2px;font-family:var(--font-mono);font-size:9px;color:var(--ink-faint);">Pre-filled from My Cost estimate</div>'
        : '') +
      (isCogs
        ? '<div class="field-group" id="wiz-cogs-context">' +
            '<label class="field-label">Quoted for this action <span class="field-optional">(the customer price)</span></label>' +
            '<div class="wiz-cogs-quoted-row">' +
              '<div class="wiz-finance-row" style="flex:1;">' +
                '<span class="wiz-finance-sym wiz-curr-sym">' + sym + '</span>' +
                '<input class="field-input" id="f-action_quoted" type="text" inputmode="decimal"' +
                  ' value="' + _esc(_record.action_quoted || '') + '" placeholder="0.00" style="flex:1;">' +
              '</div>' +
              '<div class="wiz-cogs-pct-badge' + (function() {
                  var c = parseFloat(_record.amount || '0');
                  var q = parseFloat(_record.action_quoted || '0');
                  if (!q) return '';
                  return c / q > 1 ? ' over' : '';
                }()) + '" id="wiz-cogs-pct-badge">' +
                (function() {
                  var c = parseFloat(_record.amount || '0');
                  var q = parseFloat(_record.action_quoted || '0');
                  if (!q || !c) return '\u2014';
                  return Math.round(c / q * 100) + '%';
                }()) +
              '</div>' +
            '</div>' +
            '<p class="wiz-cogs-pct-note" id="wiz-cogs-pct-note">' +
              (function() {
                var c = parseFloat(_record.amount || '0');
                var q = parseFloat(_record.action_quoted || '0');
                if (!q || !c) return 'Enter COGS amount and quoted price to see coverage %';
                var pct = c / q * 100;
                if (pct <= 100) return 'Within budget \u2014 ' + (100 - pct).toFixed(1) + '% margin on this action';
                return 'Over budget by ' + sym + (c - q).toFixed(2) + ' (' + (pct - 100).toFixed(1) + '% over)';
              }()) +
            '</p>' +
          '</div>'
        : (!isPayment
            ? '<div class="field-group">' +
                '<label class="field-label">My cost <span class="field-optional">(not shared)</span></label>' +
                '<div class="wiz-finance-row">' +
                  '<span class="wiz-finance-sym wiz-curr-sym">' + sym + '</span>' +
                  '<input class="field-input" id="f-worker_cost" type="text" inputmode="decimal"' +
                    ' value="' + _esc(workerCost) + '" placeholder="0.00">' +
                '</div>' +
                '<p class="wiz-internal-note">Stored locally only \u2014 never included in share link</p>' +
              '</div>'
            : '')) +
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

    var copy       = _actionCopy();
    var emptyTitle = copy.emptyTitle;
    var emptySub   = copy.emptySub;
    var titlePh    = copy.titlePh;
    var notesPh    = copy.notesPh;
    var addLabel   = copy.addAction;

    if (actions.length === 0) {
      html += '<div class="wiz-actions-empty">' +
                '<p class="empty-state-title" style="margin-bottom:6px;">' + emptyTitle + '</p>' +
                '<p class="empty-state-sub">' + emptySub + '</p>' +
              '</div>';
    } else if (displayList.length === 0) {
      html += '<div class="wiz-actions-empty">' +
                '<p class="empty-state-sub" style="padding:16px 0;">No ' + (isItems ? 'items' : 'actions') + ' match filter</p>' +
              '</div>';
    } else {
      html += '<div class="wiz-actions-list" id="wiz-actions-list">';
      displayList.forEach(function (entry) {
        var a = entry.a, i = entry.i;
        var isHead = a.kind === 'heading' || a.isHeading;
        var num = isHead ? '\u00a7' : ((i < 9 ? '0' : '') + (i + 1));
        html += (
          '<div class="wiz-action' + (isHead ? ' wiz-action-heading' : '') + '" draggable="true" data-index="' + i + '">' +
            '<span class="wiz-action-num">' + num + '</span>' +
            '<div class="wiz-action-fields">' +
              '<input class="field-input wiz-action-title' + (isHead ? ' wiz-action-heading-title' : '') + '" type="text"' +
                ' placeholder="' + (isHead ? 'Section heading' : titlePh) + '" value="' + _esc(a.title || '') + '"' +
                ' data-action-title="' + i + '" data-action-kind="' + (isHead ? 'heading' : 'action') + '">' +
              '<input class="field-input wiz-action-notes" type="text"' +
                ' placeholder="' + notesPh + '" value="' + _esc(a.notes || '') + '"' +
                ' data-action-notes="' + i + '">' +
            '</div>' +
            '<button class="wiz-action-remove" data-remove="' + i + '" title="Remove">\u00d7</button>' +
          '</div>'
        );
      });
      html += '</div>';
    }

    html += '<div class="wiz-add-row wiz-add-row-split">' +
              '<button class="btn-ghost" id="wiz-add-action">' + addLabel + '</button>' +
              '<button class="btn-ghost" id="wiz-add-section">' + copy.addSection + '</button>' +
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
      var sym = _record.currency === 'EUR' ? '\u20ac' : (_record.currency === 'USD' || _record.currency === 'CAD') ? '$' : '\u00a3';
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

    var storyCfg   = _narrativeCopy('story');
    var detailsCfg = _narrativeCopy('details');
    var storyMdRow = (
      '<div class="wiz-md-row">' +
        '<span class="wiz-md-label">' + storyCfg.label + '</span>' +
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
          ' placeholder="' + _esc(storyCfg.ph) + '">' +
          _esc(_record.story || '') +
        '</textarea>';

    var detailsMdRow = (
      '<div class="wiz-md-row">' +
        '<span class="wiz-md-label">' + detailsCfg.label + '</span>' +
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
          ' placeholder="' + _esc(detailsCfg.ph) + '">' +
          _esc(_record.details || '') +
        '</textarea>';

    return (
      '<div class="card">' +
        '<div class="card-section">' +
          summaryHtml +
          '<div class="field-group">' +
            storyMdRow +
            storyField +
            '<p class="field-hint">' + storyCfg.hint + '</p>' +
          '</div>' +
        '</div>' +
        '<div class="card-section">' +
          '<div class="field-group">' +
            detailsMdRow +
            detailsField +
            '<p class="field-hint">' + detailsCfg.hint + '</p>' +
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
    var locked = _isContentLocked();
    var dis    = locked ? ' disabled readonly' : '';
    var hasNote = !!(_id && typeof PersonalService !== 'undefined') && !locked;
    var noteBtn = hasNote
      ? '<button class="wiz-field-note-btn" type="button" data-field="' + key + '"' +
          ' data-label="' + _esc(label) + '" title="Add note for this field" tabindex="0">\u270f</button>'
      : '';
    var inputEl = '<input class="field-input" id="f-' + key + '" type="' + type + '"' +
      dis +
      ' value="' + _esc(value) + '"' +
      ' placeholder="' + _esc(placeholder) + '">';
    return (
      '<div class="field-group">' +
        '<label class="field-label" for="f-' + key + '">' +
          label +
          (required ? ' <span class="field-required">*</span>' : '') +
        '</label>' +
        (hasNote
          ? '<div class="wiz-field-row">' + inputEl + noteBtn + '</div>'
          : inputEl) +
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
    if (_padType === 'work' || _mode === 'expense' || _mode === 'payment') {
      _tryCollect('customer',       'f-customer');
      _tryCollect('customer_phone', 'f-customer_phone');
      _tryCollect('meeting_time',   'f-meeting_time');
    }
    _tryCollect('date',           'f-date');
    _tryCollect('location',       'f-location');
    _tryCollect('start_time',     'f-start_time');
    _tryCollect('end_time',       'f-end_time');
    _tryCollect('story',          'f-story');
    _tryCollect('details',        'f-details');
    _tryCollect('due_date',       'f-due_date');
    _tryCollect('location_map_url', 'f-location_map_url');
    _tryCollect('worker',         'f-worker');

    if (_padType === 'plan') {
      var parsed = _parseLocMapUrl(_record.location_map_url || '');
      if (parsed) {
        _record.location_lat  = parsed.lat;
        _record.location_lon  = parsed.lon;
        _record.location_zoom = parsed.zoom;
      } else {
        delete _record.location_lat;
        delete _record.location_lon;
        delete _record.location_zoom;
      }
    }
    if (_padType === 'work' || _mode === 'expense' || _mode === 'payment') {
      _tryCollect('amount',         'f-amount');
      _tryCollect('currency',       'f-currency');
      _tryCollect('vat',            'f-vat');
      if (_record.vat === 'none') delete _record.vat;
      _tryCollect('worker_cost',    'f-worker_cost');
      _tryCollect('action_quoted',  'f-action_quoted');
      _tryCollect('charge_type',    'f-charge_type');
      _tryCollect('payment_ref',    'f-payment_ref');
      if (_record.payment_ref) _record.job = _record.payment_ref;
    }

    // Note type: collect free-text PADS sections
    if (_padType === 'note') {
      _tryCollect('pads_actions', 'f-pads-actions');
      _tryCollect('pads_details', 'f-pads-details');
    }

    // Field type: collect locations and set first as canonical location field
    if (_padType === 'field') {
      _collectLocations();
      _record.location = (_locations[0] && _locations[0].address) ? _locations[0].address : '';
      var hasLocData = _locations.some(function (loc) {
        return (loc.title || loc.address || loc.notes || loc.map_url || loc.google_map_url || loc.apple_map_url);
      });
      if (hasLocData) {
        _record._locations_json = JSON.stringify(_locations.map(function (loc) {
          var copy = Object.assign({}, loc);
          delete copy.collapsed;
          return copy;
        }));
      } else {
        delete _record._locations_json;
      }
    }

    // Stamp pad type on every record
    _record.record_class = _padType;

    _collectParticipants();
    _collectPartsFlag();
    _collectActions();
    _collectEncrypt();
  }

  function _parseLocMapUrl(url) {
    if (typeof MapUtils === 'undefined' || !url) return null;
    return MapUtils.parseMapUrl(url);
  }

  function _collectLocations() {
    var titleEls   = document.querySelectorAll('.wiz-loc-title');
    var addressEls = document.querySelectorAll('.wiz-loc-address');
    var notesEls   = document.querySelectorAll('.wiz-location-notes');
    var mapEls     = document.querySelectorAll('.wiz-loc-map');
    var googleEls  = document.querySelectorAll('.wiz-loc-google');
    var appleEls   = document.querySelectorAll('.wiz-loc-apple');
    if (!addressEls.length) return;
    var locs = [];
    for (var i = 0; i < addressEls.length; i++) {
      var prev = _locations[i] || _blankLocation();
      var loc = {
        title:          titleEls[i] ? titleEls[i].value.trim() : (prev.title || ''),
        address:        addressEls[i].value.trim(),
        notes:          notesEls[i] ? notesEls[i].value.trim() : '',
        map_url:        mapEls[i] ? mapEls[i].value.trim() : '',
        google_map_url: googleEls[i] ? googleEls[i].value.trim() : '',
        apple_map_url:  appleEls[i] ? appleEls[i].value.trim() : '',
        map_snapshot:   prev.map_snapshot || null,
        ms:             prev.ms || null,
        mt:             prev.mt || null,
        mw:             prev.mw || null,
        mh:             prev.mh || null,
        collapsed:      !!prev.collapsed,
      };
      var parsed = typeof MapUtils !== 'undefined'
        ? MapUtils.resolveLocationCoords(loc)
        : _parseLocMapUrl(loc.map_url);
      if (parsed) {
        loc.lat = parsed.lat;
        loc.lon = parsed.lon;
        loc.zoom = parsed.zoom;
        loc.map_source = parsed.source;
      } else {
        loc.lat = loc.lon = loc.zoom = null;
        delete loc.map_source;
      }
      locs.push(loc);
    }
    _locations = locs;
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
      var kind = titles[i].dataset.actionKind || 'action';
      var item = {
        title: titles[i].value || '',
        notes: notes[i] ? (notes[i].value || '') : '',
      };
      if (kind === 'heading') item.kind = 'heading';
      arr.push(item);
    }
    _record.actions = arr;
  }

  function _collectEncrypt() {
    var enEl = document.getElementById('f-encrypt_enabled');
    if (enEl) _record.encrypt_enabled = enEl.checked;
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

    var newIdx = _tabIndex(tab);
    document.querySelectorAll('.wiz-dot').forEach(function (dot, i) {
      dot.classList.toggle('active', i === newIdx);
      dot.textContent = (i === newIdx) ? '\u25cf' : '\u25cb';
    });

    var body = document.getElementById('wiz-body');
    if (body) {
      body.innerHTML = _renderTabBody(tab);
      _bindBodyEvents();
    }

    var footer = document.querySelector('.wiz-wrap .wiz-footer');
    if (footer) footer.outerHTML = _renderFooter();
    _bindFooterEvents();

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

  function _titleRequiredMsg() {
    if (_padType === 'field') return 'Title is required';
    if (_padType === 'note')  return 'Memo title is required';
    if (_padType === 'plan')  return 'Plan title is required';
    if (_mode === 'expense')  return 'Short description is required';
    if (_mode === 'payment')  return 'Payment description is required';
    return 'Job title is required';
  }

  function _persistRecord(done) {
    _collect();
    var toSave = Object.assign({}, _record);
    var passEl = document.getElementById('f-encrypt_pass');
    var pass   = passEl ? passEl.value : '';

    if (toSave.encrypt_enabled) {
      if (typeof WorkpadsEncrypt === 'undefined') {
        App.toast('Encryption unavailable');
        return;
      }
      // Already sealed, no passphrase — save metadata only (stay locked).
      if (WorkpadsEncrypt.isSealed(toSave) && !pass) {
        RecordService.save(_id, toSave).then(done);
        return;
      }
      // Unlocked or never sealed — save edits without re-locking.
      if (!WorkpadsEncrypt.isSealed(toSave) && !pass) {
        delete toSave._encrypt_seal;
        RecordService.save(_id, toSave).then(function (saved) {
          _record = saved;
          done(saved);
        });
        return;
      }
      if (!pass) {
        App.toast('Enter a passphrase to lock');
        return;
      }
      WorkpadsEncrypt.sealRecord(toSave, pass).then(function (sealed) {
        _record = sealed;
        _contentUnlocked = false;
        RecordService.save(_id, sealed).then(done);
      }).catch(function () {
        App.toast('Encryption failed — check passphrase');
      });
      return;
    }

    delete toSave._encrypt_seal;
    RecordService.save(_id, toSave).then(function (saved) {
      _record = saved;
      done(saved);
    });
  }

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
      App.toast(_titleRequiredMsg());
      return;
    }

    _persistRecord(function (saved) {
      if (saved.customer && saved.customer_phone) {
        BlockRegistry.save(saved.customer, saved.customer_phone);
      }
      if (_mode === 'expense' && saved.parentId) {
        App.showView(saved.parentId);
      } else {
        App.showView(_id);
      }
    });
  }

  function _saveDraft() {
    _persistRecord(function () {
      App.toast('Draft saved');
    });
  }

  function _cancel() {
    if (_mode === 'new' || _mode === 'expense' || _mode === 'payment') {
      RecordService.remove(_id).then(function () {
        if ((_mode === 'expense' || _mode === 'payment') && _record.parentId) {
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

  function _bindFooterEvents() {
    var cancelBottom = document.getElementById('wiz-cancel-bottom');
    if (cancelBottom) cancelBottom.addEventListener('click', _cancel);
    var saveBtn  = document.getElementById('wiz-save');
    var draftBtn = document.getElementById('wiz-save-draft');
    var nextBtn  = document.getElementById('wiz-next');
    if (saveBtn)  saveBtn.addEventListener('click',  _save);
    if (draftBtn) draftBtn.addEventListener('click', _saveDraft);
    if (nextBtn)  nextBtn.addEventListener('click',  _nextTab);
  }

  function _bindEvents(screenEl) {
    screenEl.querySelectorAll('.tab-btn').forEach(function (btn) {
      btn.addEventListener('click', function () { _switchTab(this.dataset.tab); });
    });

    var cancelTop = document.getElementById('wiz-cancel-top');
    if (cancelTop) cancelTop.addEventListener('click', _cancel);
    _bindFooterEvents();

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
    var jobEl = document.getElementById('f-job');
    if (jobEl) {
      jobEl.addEventListener('input', function () {
        _record.job = jobEl.value;
        _notifyContext();
      });
    }

    // ── Add location (Field type) ────────────────────────────
    var addLocBtn = document.getElementById('wiz-add-location');
    if (addLocBtn) {
      addLocBtn.addEventListener('click', function () {
        _collectLocations();
        _locations.push(_blankLocation());
        var body = document.getElementById('wiz-body');
        if (body) {
          body.innerHTML = _renderTabBody('process');
          _bindBodyEvents();
          var inputs = document.querySelectorAll('.wiz-loc-address');
          if (inputs.length) inputs[inputs.length - 1].focus();
        }
      });
    }

    document.querySelectorAll('[data-loc-collapse]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        _collectLocations();
        var idx = parseInt(this.dataset.locCollapse, 10);
        if (_locations[idx]) _locations[idx].collapsed = !_locations[idx].collapsed;
        var body = document.getElementById('wiz-body');
        if (body) { body.innerHTML = _renderTabBody('process'); _bindBodyEvents(); }
      });
    });

    var locList = document.getElementById('wiz-locations-list');
    if (locList) {
      locList.addEventListener('dragstart', function (e) {
        var item = e.target.closest('.wiz-location-item');
        if (!item) return;
        _locDragIndex = parseInt(item.dataset.locIdx, 10);
        item.classList.add('dragging');
      });
      locList.addEventListener('dragend', function (e) {
        var item = e.target.closest('.wiz-location-item');
        if (item) item.classList.remove('dragging');
        locList.querySelectorAll('.drag-over').forEach(function (el) { el.classList.remove('drag-over'); });
      });
      locList.addEventListener('dragover', function (e) {
        e.preventDefault();
        var item = e.target.closest('.wiz-location-item');
        if (!item) return;
        locList.querySelectorAll('.drag-over').forEach(function (el) { el.classList.remove('drag-over'); });
        item.classList.add('drag-over');
      });
      locList.addEventListener('drop', function (e) {
        e.preventDefault();
        var item = e.target.closest('.wiz-location-item');
        if (!item || _locDragIndex < 0) return;
        var dropIndex = parseInt(item.dataset.locIdx, 10);
        if (dropIndex === _locDragIndex) return;
        _collectLocations();
        var moved = _locations.splice(_locDragIndex, 1)[0];
        _locations.splice(dropIndex, 0, moved);
        _locDragIndex = -1;
        var body = document.getElementById('wiz-body');
        if (body) { body.innerHTML = _renderTabBody('process'); _bindBodyEvents(); }
      });
    }

    document.querySelectorAll('[data-remove-loc]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        _collectLocations();
        var idx = parseInt(this.dataset.removeLoc, 10);
        _locations.splice(idx, 1);
        var body = document.getElementById('wiz-body');
        if (body) { body.innerHTML = _renderTabBody('process'); _bindBodyEvents(); }
      });
    });

    // ── Encrypt toggle ───────────────────────────────────────
    var encEl = document.getElementById('f-encrypt_enabled');
    if (encEl) {
      encEl.addEventListener('change', function () {
        _record.encrypt_enabled = encEl.checked;
        var box = document.getElementById('wiz-encrypt-pass');
        if (box) box.style.display = encEl.checked ? '' : 'none';
      });
    }
    var unlockBtn = document.getElementById('wiz-unlock-seal');
    if (unlockBtn) {
      unlockBtn.addEventListener('click', function () {
        var passEl = document.getElementById('f-encrypt_pass');
        var pass   = passEl ? passEl.value : '';
        if (!pass || typeof WorkpadsEncrypt === 'undefined') {
          App.toast('Enter passphrase');
          return;
        }
        WorkpadsEncrypt.unsealRecord(_record, pass).then(function (r) {
          delete r._encrypt_seal;
          _record = r;
          _padType = (typeof PadType !== 'undefined') ? PadType.of(r) : (r.record_class || 'work');
          _contentUnlocked = true;
          return RecordService.save(_id, r);
        }).then(function (saved) {
          if (saved) _record = saved;
          App.toast('Unlocked');
          _render();
          _notifyContext();
        }).catch(function () { App.toast('Wrong passphrase'); });
      });
    }

    var lockBtn = document.getElementById('wiz-lock-seal');
    if (lockBtn) {
      lockBtn.addEventListener('click', function () {
        _collect();
        var passEl = document.getElementById('f-encrypt_pass');
        var pass   = passEl ? passEl.value : '';
        if (!pass) { App.toast('Enter a passphrase to lock'); return; }
        WorkpadsEncrypt.sealRecord(_record, pass).then(function (sealed) {
          _record = sealed;
          _contentUnlocked = false;
          return RecordService.save(_id, sealed);
        }).then(function (saved) {
          if (saved) _record = saved;
          App.toast('Locked');
          _render();
        }).catch(function () { App.toast('Could not lock'); });
      });
    }

    // ── OSM map link parse (offline preview only) ────────────
    function _refreshLocMaps() {
      _collectLocations();
      var body = document.getElementById('wiz-body');
      if (body) { body.innerHTML = _renderTabBody('process'); _bindBodyEvents(); }
    }

    document.querySelectorAll('.wiz-loc-map, .wiz-loc-google, .wiz-loc-apple').forEach(function (input) {
      input.addEventListener('blur', _refreshLocMaps);
    });

    document.querySelectorAll('.wiz-loc-enrich').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (typeof MapUtils === 'undefined') return;
        _collectLocations();
        var idx = parseInt(btn.dataset.locEnrich, 10);
        var loc = _locations[idx];
        if (!loc) return;
        var coords = MapUtils.resolveLocationCoords(loc);
        if (!coords) {
          App.toast('Paste a map link with coordinates first');
          return;
        }
        btn.disabled = true;
        btn.textContent = 'Fetching…';
        MapUtils.fetchEnrichedSnapshot(coords.lat, coords.lon, coords.zoom).then(function (snap) {
          loc.ms            = snap.ms;
          loc.mt            = snap.mt;
          loc.mw            = snap.mw;
          loc.mh            = snap.mh;
          loc.map_snapshot  = snap.map_snapshot;
          loc.lat = coords.lat;
          loc.lon = coords.lon;
          loc.zoom = coords.zoom;
          _locations[idx] = loc;
          var sz = snap.bytes || MapUtils.snapshotSize(snap.ms);
          App.toast('Snapshot ready (~' + Math.round(sz / 1024) + ' KB, local only)');
          _refreshLocMaps();
        }).catch(function () {
          App.toast('Could not fetch map tiles — check connection or use offline preview');
          btn.disabled = false;
          btn.textContent = 'Fetch map snapshot';
        });
      });
    });

    var planMapEl = document.getElementById('f-location_map_url');
    if (planMapEl) {
      planMapEl.addEventListener('blur', function () {
        _collect();
        var body = document.getElementById('wiz-body');
        if (body) { body.innerHTML = _renderTabBody('process'); _bindBodyEvents(); }
      });
    }

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

    var addSectionBtn = document.getElementById('wiz-add-section');
    if (addSectionBtn) {
      addSectionBtn.addEventListener('click', function () {
        _collectActions();
        _record.actions = (_record.actions || []).concat([{ kind: 'heading', title: '', notes: '' }]);
        var body = document.getElementById('wiz-body');
        if (body) {
          body.innerHTML = _renderTabBody('actions');
          _bindBodyEvents();
          var inputs = document.querySelectorAll('.wiz-action-heading-title');
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

    // ── Action picker (expense mode) ─────────────────────────
    var actionPickerEl = document.getElementById('f-action-idx');
    if (actionPickerEl) {
      actionPickerEl.addEventListener('change', function () {
        var val = this.value;
        if (val === '') {
          _record.actionIdx   = undefined;
          _record.actionTitle = undefined;
        } else {
          var idx = parseInt(val, 10);
          var action = _parentRecord && _parentRecord.actions && _parentRecord.actions[idx];
          _record.actionIdx   = idx;
          _record.actionTitle = action ? action.title : '';
        }
        RecordService.save(_id, _record);
      });
    }

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

    // ── Expense billing toggle ───────────────────────────────
    var billingRow = document.querySelector('.wiz-billing-row');
    if (billingRow) {
      billingRow.addEventListener('click', function (e) {
        var btn = e.target.closest('.wiz-billing-btn');
        if (!btn) return;
        _record.expense_billing = btn.dataset.billing;
        document.querySelectorAll('.wiz-billing-btn').forEach(function (b) {
          b.classList.toggle('active', b.dataset.billing === _record.expense_billing);
        });
        // Update amount label text to reflect billing mode
        var amtLabel = document.getElementById('wiz-amount-label');
        if (amtLabel) {
          amtLabel.textContent = _record.expense_billing === 'cogs'
            ? 'Cost of Goods Sold'
            : 'Customer price';
        }
        RecordService.save(_id, _record);
      });
    }

    // ── COGS quoted context — live % indicator ───────────────
    function _updateCogsPct() {
      var badge = document.getElementById('wiz-cogs-pct-badge');
      var note  = document.getElementById('wiz-cogs-pct-note');
      if (!badge && !note) return;
      var sym  = (document.getElementById('f-currency') || {}).value;
      sym = sym === 'EUR' ? '\u20ac' : (sym === 'USD' || sym === 'CAD') ? '$' : '\u00a3';
      var c = parseFloat((document.getElementById('f-amount') || {}).value || '0');
      var q = parseFloat((document.getElementById('f-action_quoted') || {}).value || '0');
      if (!q || !c) {
        if (badge) { badge.textContent = '\u2014'; badge.className = 'wiz-cogs-pct-badge'; }
        if (note) note.textContent = 'Enter COGS amount and quoted price to see coverage %';
        return;
      }
      var pct  = c / q * 100;
      var over = pct > 100;
      if (badge) {
        badge.textContent = Math.round(pct) + '%';
        badge.className   = 'wiz-cogs-pct-badge' + (over ? ' over' : '');
      }
      if (note) {
        note.textContent = over
          ? 'Over budget by ' + sym + (c - q).toFixed(2) + ' (' + (pct - 100).toFixed(1) + '% over)'
          : 'Within budget \u2014 ' + (100 - pct).toFixed(1) + '% margin on this action';
      }
    }
    var cogsAmtEl = document.getElementById('f-amount');
    var cogsQtdEl = document.getElementById('f-action_quoted');
    if (cogsQtdEl) {
      if (cogsAmtEl) cogsAmtEl.addEventListener('input', _updateCogsPct);
      cogsQtdEl.addEventListener('input', _updateCogsPct);
    }

    // ── Currency change → update symbols ─────────────────────
    var currencyEl = document.getElementById('f-currency');
    if (currencyEl) {
      currencyEl.addEventListener('change', function () {
        var sym = this.value === 'EUR' ? '\u20ac' : (this.value === 'USD' || this.value === 'CAD') ? '$' : '\u00a3';
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
