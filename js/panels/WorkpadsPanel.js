/* ============================================================
   WorkpadsPanel — left sidebar: record index + search
   ============================================================ */

var WorkpadsPanel = (function () {
  'use strict';

  var _records      = [];
  var _query        = '';
  var _stylesAdded  = false;
  var _screenName   = 'list';
  var _screenParams = {};
  var _cogsOpen     = false;
  var _padClassTab  = 'work';   // 'field' | 'work' | 'note' | 'plan'
  var _listTab      = 'jobs';   // work sub: 'jobs' | 'quotes' | 'invoices'
  var _sortMode     = 'recent'; // other pads: 'recent' | 'az' | 'za'

  // ── Styles ───────────────────────────────────────────────────

  function _addStyles() {
    if (_stylesAdded) return;
    _stylesAdded = true;
    var s = document.createElement('style');
    s.textContent = [
      /* Panel inner layout */
      '#panel-left-body {',
      '  display:flex; flex-direction:column;',
      '  overflow:hidden; padding:0;',
      '}',

      '.wpp-search {',
      '  flex-shrink:0; display:flex; align-items:center;',
      '  padding:8px 10px;',
      '  border-bottom:1px solid var(--panel-border);',
      '}',
      '.wpp-search-input {',
      '  display:block; width:100%;',
      '  font-family:var(--font-mono); font-size:11px;',
      '  color:var(--ink); background:var(--card);',
      '  border:1px solid var(--rule); border-radius:3px;',
      '  padding:6px 9px; transition:border-color .13s;',
      '  -webkit-appearance:none;',
      '}',
      '.wpp-search-input:focus { outline:none; border-color:var(--stamp-border); }',
      '.wpp-search-input::placeholder { color:var(--ink-faint); }',

      '.wpp-list {',
      '  flex:1; overflow-y:auto; overflow-x:hidden;',
      '  overscroll-behavior:contain;',
      '}',
      '.wpp-list::-webkit-scrollbar { width:3px; }',
      '.wpp-list::-webkit-scrollbar-thumb { background:var(--rule); border-radius:2px; }',

      '.wpp-item {',
      '  padding:11px 14px; border-bottom:1px solid var(--rule-light);',
      '  cursor:pointer; transition:background .1s; user-select:none;',
      '  position:relative;',
      '}',
      '.wpp-item:last-child { border-bottom:none; }',
      '.wpp-item:hover { background:rgba(192,71,10,.04); }',
      '.wpp-item.active { background:var(--stamp-light); border-left:2px solid var(--stamp); padding-left:12px; }',
      '.wpp-item:hover .wpp-item-opts { opacity:1; }',

      '.wpp-item-opts {',
      '  position:absolute; top:8px; right:8px;',
      '  font-family:var(--font-mono); font-size:9px;',
      '  color:var(--ink-faint); background:none; border:none;',
      '  cursor:pointer; padding:2px 5px; opacity:0;',
      '  transition:opacity .12s, color .12s; border-radius:2px; line-height:1;',
      '}',
      '.wpp-item-opts:hover { color:var(--ink-mid); background:var(--rule-light); }',
      '.wpp-item-menu {',
      '  position:absolute; top:24px; right:8px; z-index:200;',
      '  background:var(--card-raised); border:1px solid var(--rule);',
      '  border-radius:3px; box-shadow:0 4px 12px rgba(25,20,15,.12);',
      '  min-width:110px; overflow:hidden;',
      '}',
      '.wpp-item-menu-opt {',
      '  display:block; width:100%; text-align:left;',
      '  padding:7px 12px;',
      '  font-family:var(--font-mono); font-size:10px; font-weight:700;',
      '  letter-spacing:.06em; text-transform:uppercase;',
      '  color:var(--ink-mid); background:none; border:none; border-bottom:1px solid var(--rule-light);',
      '  cursor:pointer; transition:background .1s, color .1s;',
      '}',
      '.wpp-item-menu-opt:last-child { border-bottom:none; }',
      '.wpp-item-menu-opt:hover { background:var(--rule-light); color:var(--ink); }',
      '.wpp-item-menu-opt.danger:hover { color:#b33a0a; }',

      '.wpp-item-job {',
      '  font-family:var(--font-body); font-size:13px; font-weight:700;',
      '  color:var(--ink); line-height:1.3;',
      '  white-space:nowrap; overflow:hidden; text-overflow:ellipsis;',
      '  margin-bottom:3px; padding-right:20px;',
      '}',
      '.wpp-item-meta {',
      '  font-family:var(--font-mono); font-size:9.5px; color:var(--ink-muted);',
      '  white-space:nowrap; overflow:hidden; text-overflow:ellipsis;',
      '}',

      '.wpp-empty {',
      '  padding:32px 16px; text-align:center;',
      '  font-family:var(--font-body); font-style:italic;',
      '  font-size:13px; color:var(--ink-faint);',
      '  line-height:1.5;',
      '}',

      '.wpp-footer {',
      '  flex-shrink:0; padding:10px;',
      '  border-top:1px solid var(--panel-border);',
      '}',

      /* Back arrow in search bar */
      '.wpp-back-btn {',
      '  flex-shrink:0; padding:0 8px 0 2px;',
      '  background:none; border:none; cursor:pointer;',
      '  font-family:var(--font-mono); font-size:13px;',
      '  color:var(--ink-muted); line-height:1; transition:color .12s;',
      '  display:none;',  // shown via JS in record mode
      '}',
      '.wpp-back-btn:hover { color:var(--stamp); }',
      '.wpp-search-input { flex:1; }',

      /* Add buttons row above Financial header */
      '.wpp-exp-add-top {',
      '  padding:6px 10px;',
      '  border-bottom:1px solid var(--rule-light);',
      '  display:flex; gap:4px; overflow:hidden;',
      '}',
      '.wpp-exp-add-top .btn-ghost {',
      '  flex:1; min-width:0; overflow:hidden;',
      '  font-size:10px !important; padding:4px 4px !important;',
      '  white-space:nowrap; text-overflow:ellipsis;',
      '}',

      /* My cost confirm row */
      '.wpp-my-cost-row {',
      '  display:flex; align-items:center; justify-content:space-between;',
      '  padding:3px 14px 4px;',
      '  background:rgba(120,100,80,.03);',
      '}',
      '.wpp-my-cost-label {',
      '  font-family:var(--font-mono); font-size:9px;',
      '  color:var(--ink-muted); letter-spacing:.04em;',
      '}',
      '.wpp-my-cost-confirm {',
      '  font-family:var(--font-mono); font-size:9px; font-weight:700;',
      '  letter-spacing:.06em; text-transform:uppercase;',
      '  color:var(--stamp); background:none; border:none; cursor:pointer;',
      '  padding:2px 4px; flex-shrink:0; transition:color .12s;',
      '}',
      '.wpp-my-cost-confirm:hover { color:var(--ink); }',

      /* Context block */
      '.wpp-ctx {',
      '  padding:10px 14px 12px;',
      '  border-bottom:1px solid var(--panel-border);',
      '  background:var(--stamp-light);',
      '  flex-shrink:0;',
      '}',
      '.wpp-ctx-label {',
      '  font-family:var(--font-mono); font-size:9px; font-weight:700;',
      '  letter-spacing:.12em; text-transform:uppercase;',
      '  color:var(--stamp); margin-bottom:4px;',
      '}',
      '.wpp-ctx-job {',
      '  font-family:var(--font-body); font-size:13px; font-weight:700;',
      '  color:var(--ink); line-height:1.3; margin-bottom:2px;',
      '  white-space:nowrap; overflow:hidden; text-overflow:ellipsis;',
      '}',
      '.wpp-ctx-meta {',
      '  font-family:var(--font-mono); font-size:9.5px; color:var(--ink-muted);',
      '  margin-bottom:8px;',
      '  white-space:nowrap; overflow:hidden; text-overflow:ellipsis;',
      '}',
      '.wpp-ctx-actions { display:flex; gap:6px; }',

      /* Stats context (list mode) */
      '.wpp-ctx-stats {',
      '  font-family:var(--font-mono); font-size:10px;',
      '  color:var(--ink-muted); margin-bottom:6px;',
      '}',
      '.wpp-ctx-stat-sep { color:var(--ink-faint); margin:0 3px; }',
      '.wpp-ctx-recent-label {',
      '  font-family:var(--font-mono); font-size:9px; font-weight:700;',
      '  letter-spacing:.1em; text-transform:uppercase;',
      '  color:var(--ink-faint); margin:6px 0 3px;',
      '}',
      '.wpp-ctx-recent {',
      '  font-family:var(--font-body); font-size:11px; color:var(--ink-muted);',
      '  white-space:nowrap; overflow:hidden; text-overflow:ellipsis;',
      '  margin-bottom:2px;',
      '}',
      '.wpp-ctx-recent-date {',
      '  font-family:var(--font-mono); font-size:9px; color:var(--ink-faint);',
      '  margin-left:5px;',
      '}',
      '.wpp-ctx-hint {',
      '  font-family:var(--font-mono); font-size:10px;',
      '  color:var(--ink-faint); font-style:italic;',
      '}',

      /* Financial sub-records section */
      '#wpp-expenses { flex-shrink:0; }',
      '.wpp-exp-header {',
      '  display:flex; justify-content:space-between; align-items:center;',
      '  padding:7px 14px 4px;',
      '  border-top:1px solid var(--panel-border);',
      '  font-family:var(--font-mono); font-size:9px; font-weight:700;',
      '  letter-spacing:.12em; text-transform:uppercase; color:var(--ink-faint);',
      '}',
      '.wpp-fin-summary-link {',
      '  background:none; border:none; padding:0; cursor:pointer;',
      '  font-family:var(--font-mono); font-size:9px; font-weight:700;',
      '  letter-spacing:.12em; text-transform:uppercase;',
      '  color:#1a3055; text-decoration:underline; text-decoration-style:dotted;',
      '}',
      '.wpp-fin-summary-link:hover { text-decoration-style:solid; }',
      '.wpp-fin-subtitle {',
      '  padding:5px 14px 3px;',
      '  font-family:var(--font-mono); font-size:8.5px; font-weight:700;',
      '  letter-spacing:.10em; text-transform:uppercase;',
      '  color:rgba(80,70,60,.60);',
      '  border-top:1px solid var(--rule-light);',
      '}',
      '.wpp-fin-subtitle:first-of-type { border-top:none; }',

      '.wpp-exp-action-head {',
      '  padding:5px 14px 3px;',
      '  font-family:var(--font-mono); font-size:8px; font-weight:700;',
      '  letter-spacing:.08em; text-transform:uppercase;',
      '  color:var(--ink-faint); border-top:1px solid var(--rule-light);',
      '  pointer-events:none;',
      '}',
      '.wpp-exp-group:first-child .wpp-exp-action-head { border-top:none; }',
      '.wpp-exp-group:nth-child(even) { background:rgba(120,100,80,.03); }',
      '.wpp-exp-item {',
      '  padding:5px 14px;',
      '  display:flex; justify-content:space-between; align-items:center;',
      '  border-top:1px solid var(--rule-light);',
      '  cursor:pointer; transition:background .1s;',
      '}',
      '.wpp-exp-item:hover { background:rgba(192,71,10,.04); }',
      '.wpp-exp-job {',
      '  font-family:var(--font-mono); font-size:11px; color:var(--ink-mid);',
      '  white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1;',
      '}',
      '.wpp-exp-amount {',
      '  font-family:var(--font-mono); font-size:11px; color:var(--ink);',
      '  flex-shrink:0; margin-left:8px;',
      '}',
      '.wpp-exp-total {',
      '  padding:5px 14px;',
      '  border-top:1px solid var(--rule);',
      '  display:flex; justify-content:space-between;',
      '  font-family:var(--font-mono); font-size:11px;',
      '  font-weight:700; color:var(--ink);',
      '}',
      '.wpp-exp-add {',
      '  padding:6px 10px;',
      '  border-top:1px solid var(--rule-light);',
      '  display:flex; gap:6px;',
      '}',

      '.wpp-cogs-section {',
      '  border-top:1px solid var(--rule-light);',
      '}',
      '.wpp-cogs-toggle {',
      '  display:flex; align-items:center; gap:6px;',
      '  width:100%; padding:4px 14px;',
      '  background:none; border:none; cursor:pointer;',
      '  font-family:var(--font-mono); font-size:8.5px; font-weight:700;',
      '  letter-spacing:.10em; text-transform:uppercase;',
      '  color:rgba(80,70,60,.60); transition:color .12s;',
      '}',
      '.wpp-cogs-toggle:hover { color:var(--ink-muted); }',
      '.wpp-cogs-amt {',
      '  font-family:var(--font-mono); font-size:10px;',
      '  color:#b84040; margin-left:auto;',
      '}',
      '.wpp-cogs-add {',
      '  padding:5px 14px 6px;',
      '  border-top:1px solid var(--rule-light);',
      '}',
      '.wpp-cogs-chevron {',
      '  font-size:9px; color:var(--ink-faint);',
      '  transition:transform .15s;',
      '}',
      '.wpp-cogs-body { background:rgba(120,100,80,.025); }',

      '.wpp-calc-row {',
      '  font-weight:400; border-top:none;',
      '  color:var(--ink-mid); font-size:10.5px;',
      '}',
      '.wpp-calc-row span:first-child { color:var(--ink-mid); }',

      /* Sort tabs */
      '.wpp-sort-tabs {',
      '  display:flex; flex-shrink:0;',
      '  border-bottom:1px solid var(--panel-border);',
      '}',
      '.wpp-sort-tab {',
      '  flex:1; background:none; border:none; border-bottom:2px solid transparent;',
      '  font-family:var(--font-mono); font-size:9px; font-weight:700;',
      '  letter-spacing:.08em; text-transform:uppercase;',
      '  padding:8px 4px; text-align:center;',
      '  color:var(--ink-muted); cursor:pointer;',
      '  transition:color .12s, border-color .12s;',
      '}',
      '.wpp-sort-tab.active { color:var(--stamp); border-bottom-color:var(--stamp); }',
      '.wpp-sort-tab:hover:not(.active) { color:var(--ink-mid); }',
    ].join('\n');
    document.head.appendChild(s);
  }

  // ── Init ─────────────────────────────────────────────────────

  function init() {
    _addStyles();
    _buildStructure();
    _load();
    window.addEventListener('hashchange', _markActive);
  }

  function _buildStructure() {
    var body = document.getElementById('panel-left-body');
    if (!body) return;

    body.innerHTML = (
      '<div class="wpp-search">' +
        '<button class="wpp-back-btn" id="wpp-back-btn" title="Back to list">\u2190</button>' +
        '<input class="wpp-search-input" id="wpp-search" type="search"' +
          ' placeholder="Search\u2026" autocomplete="off" spellcheck="false">' +
      '</div>' +
      '<div class="wpp-sort-tabs wpp-pad-tabs" id="wpp-pad-tabs">' +
        '<button class="wpp-sort-tab" data-pad="field">Field</button>' +
        '<button class="wpp-sort-tab active" data-pad="work">Work</button>' +
        '<button class="wpp-sort-tab" data-pad="note">Memo</button>' +
        '<button class="wpp-sort-tab" data-pad="plan">Plan</button>' +
      '</div>' +
      '<div class="wpp-sort-tabs" id="wpp-sort-tabs"></div>' +
      '<div id="wpp-ctx" style="display:none;"></div>' +
      '<div id="wpp-expenses" style="display:none;"></div>' +
      '<div class="wpp-list" id="wpp-list"></div>'
    );

    var searchEl = document.getElementById('wpp-search');
    if (searchEl) {
      searchEl.addEventListener('input', function () {
        _query = this.value;
        _renderList();
      });
    }

    var backBtn = document.getElementById('wpp-back-btn');
    if (backBtn) backBtn.addEventListener('click', function () { App.showList(); });

    var padTabsEl = document.getElementById('wpp-pad-tabs');
    if (padTabsEl) {
      padTabsEl.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-pad]');
        if (!btn) return;
        _padClassTab = btn.dataset.pad;
        padTabsEl.querySelectorAll('[data-pad]').forEach(function (b) {
          b.classList.toggle('active', b.dataset.pad === _padClassTab);
        });
        if (_padClassTab === 'work') _listTab = 'jobs';
        else _sortMode = 'recent';
        _renderSubTabs();
        _renderList();
        _renderContext();
      });
    }
    _renderSubTabs();
  }

  // ── Load + render ────────────────────────────────────────────

  function _load() {
    RecordService.list().then(function (records) {
      _records = records || [];
      _syncPadTabFromActiveRecord();
      _renderList();
      _renderContext();
    });
  }

  function _syncPadTabFromActiveRecord() {
    var id = _activeId();
    if (!id) return;
    if (_screenName !== 'view' && _screenName !== 'edit' && _screenName !== 'share') return;
    for (var i = 0; i < _records.length; i++) {
      if (_records[i].id === id) {
        var pc = _padClass(_records[i]);
        if (pc && pc !== _padClassTab) setPadClassFilter(pc);
        return;
      }
    }
  }

  function refresh() {
    _load();
  }

  function setPadClassFilter(padClass) {
    _padClassTab = padClass || 'work';
    var padTabsEl = document.getElementById('wpp-pad-tabs');
    if (padTabsEl) {
      padTabsEl.querySelectorAll('[data-pad]').forEach(function (b) {
        b.classList.toggle('active', b.dataset.pad === _padClassTab);
      });
    }
    if (_padClassTab === 'work') _listTab = 'jobs';
    else _sortMode = 'recent';
    _renderSubTabs();
    _renderList();
    _renderContext();
  }

  function setContext(name, params) {
    _screenName   = name;
    _screenParams = params || {};
    _syncPadTabFromActiveRecord();
    _renderContext();
  }

  // ── Context rendering ────────────────────────────────────────

  function _renderContext() {
    var ctxEl   = document.getElementById('wpp-ctx');
    var expEl   = document.getElementById('wpp-expenses');
    var listEl  = document.getElementById('wpp-list');
    var backBtn = document.getElementById('wpp-back-btn');
    if (!ctxEl) return;

    var inRecordMode = (_screenName === 'view' || _screenName === 'edit' || _screenName === 'share');

    // Show/hide back arrow and record list based on mode
    if (backBtn) backBtn.style.display = inRecordMode ? '' : 'none';
    if (listEl)  listEl.style.display  = inRecordMode ? 'none' : '';

    // Pad + sub tabs: visible only in list mode
    var padTabsEl  = document.getElementById('wpp-pad-tabs');
    var sortTabsEl = document.getElementById('wpp-sort-tabs');
    if (padTabsEl)  padTabsEl.style.display  = inRecordMode ? 'none' : '';
    if (sortTabsEl) sortTabsEl.style.display = inRecordMode ? 'none' : '';
    if (!inRecordMode) _renderSubTabs();

    // Always hide expenses unless in record mode
    if (expEl && !inRecordMode) {
      expEl.style.display = 'none';
      expEl.innerHTML = '';
    }

    switch (_screenName) {
      case 'list':
        _renderListCtx(ctxEl);
        break;
      case 'view':
      case 'edit':
      case 'share':
        _renderRecordCtx(ctxEl);
        break;
      case 'wizard':
        _renderWizardCtx(ctxEl);
        break;
      default:
        ctxEl.style.display = 'none';
        ctxEl.innerHTML = '';
    }
  }

  function _renderListCtx(ctxEl) {
    var mainRecords = _records.filter(function (r) { return !r.parentId; });
    var total    = mainRecords.length;
    if (total === 0) { ctxEl.style.display = 'none'; ctxEl.innerHTML = ''; return; }

    var received = mainRecords.filter(function (r) { return !!r.receivedAt; }).length;
    var sent     = total - received;

    var statsHtml = '<div class="wpp-ctx-stats">' +
      '<span>' + total + ' total</span>';
    if (sent)     statsHtml += '<span class="wpp-ctx-stat-sep">\xb7</span><span>' + sent + ' sent</span>';
    if (received) statsHtml += '<span class="wpp-ctx-stat-sep">\xb7</span><span>' + received + ' received</span>';
    statsHtml += '</div>';

    ctxEl.style.display = '';
    ctxEl.innerHTML = '<div class="wpp-ctx"><div class="wpp-ctx-label">Overview</div>' + statsHtml + '</div>';
  }

  function _renderRecordCtx(ctxEl) {
    var activeId = _activeId();
    if (!activeId) { ctxEl.style.display = 'none'; ctxEl.innerHTML = ''; return; }

    var record = null;
    for (var i = 0; i < _records.length; i++) {
      if (_records[i].id === activeId) { record = _records[i]; break; }
    }
    if (!record) { ctxEl.style.display = 'none'; return; }

    // Child record (expense/payment) — show parent job below
    if (record.parentId) {
      var parent = null;
      for (var j = 0; j < _records.length; j++) {
        if (_records[j].id === record.parentId) { parent = _records[j]; break; }
      }
      _renderChildCtx(ctxEl, record, parent);
      var expEl = document.getElementById('wpp-expenses');
      if (expEl) { expEl.style.display = 'none'; expEl.innerHTML = ''; }
      return;
    }

    // Main record
    var meta = [];
    if (record.customer) meta.push(_esc(record.customer));
    if (record.date)     meta.push(_fmtDate(record.date));
    var pc = _padClass(record);
    var roleLabels = { field: 'Field visit', work: 'Viewing', note: 'Memo', plan: 'Plan' };
    var role = record.receivedAt ? 'Received' : (roleLabels[pc] || 'Viewing');

    ctxEl.style.display = '';
    ctxEl.innerHTML = (
      '<div class="wpp-ctx">' +
        '<div class="wpp-ctx-label">' + role + '</div>' +
        '<div class="wpp-ctx-job">' + _esc(
          (typeof WorkpadsEncrypt !== 'undefined' ? WorkpadsEncrypt.displayJob(record) : record.job) ||
          record.job || 'Untitled'
        ) + '</div>' +
        (meta.length ? '<div class="wpp-ctx-meta">' + meta.join(' \xb7 ') + '</div>' : '') +
        '<div class="wpp-ctx-actions">' +
          '<button class="btn-ghost" id="wpp-ctx-edit" style="font-size:10px;padding:4px 10px;">Edit</button>' +
          '<button class="btn-primary" id="wpp-ctx-share" style="font-size:10px;padding:4px 10px;">Share</button>' +
        '</div>' +
      '</div>'
    );

    var aid      = activeId;
    var editBtn  = document.getElementById('wpp-ctx-edit');
    var shareBtn = document.getElementById('wpp-ctx-share');
    if (editBtn)  editBtn.addEventListener('click', function () { App.showWizard(aid); });
    if (shareBtn) shareBtn.addEventListener('click', function () { App.showShare(aid); });

    var children = _records.filter(function (r) { return r.parentId === activeId; });
    if ((typeof PadType !== 'undefined' ? PadType.hasFinancials(record) : _padClass(record) === 'work')) {
      _renderExpenses(children, activeId);
    } else {
      var expEl = document.getElementById('wpp-expenses');
      if (expEl) { expEl.style.display = 'none'; expEl.innerHTML = ''; }
    }
  }

  function _renderChildCtx(ctxEl, record, parent) {
    var typeLabel = record.recordType === 'payment' ? 'Payment'
                  : record.recordType === 'expense'  ? 'Expense'
                  : 'Record';
    var currSym = record.currency === 'EUR' ? '\u20ac'
                : (record.currency === 'USD' || record.currency === 'CAD') ? '$' : '\u00a3';
    var amt = record.amount
      ? currSym + parseFloat(record.amount || 0).toFixed(2)
      : '';

    var parentBlock = '';
    if (parent) {
      var pmeta = [];
      if (parent.customer) pmeta.push(_esc(parent.customer));
      if (parent.date)     pmeta.push(_fmtDate(parent.date));
      parentBlock = (
        '<div style="border-top:1px solid var(--panel-border);margin-top:10px;padding-top:10px;">' +
          '<div class="wpp-ctx-label">Job</div>' +
          '<div class="wpp-ctx-job">' + _esc(parent.job || 'Untitled') + '</div>' +
          (pmeta.length ? '<div class="wpp-ctx-meta">' + pmeta.join(' \xb7 ') + '</div>' : '') +
          '<div class="wpp-ctx-actions" style="margin-top:6px;">' +
            '<button class="btn-ghost" id="wpp-ctx-parent" style="font-size:10px;padding:4px 10px;">\u2190 View Job</button>' +
          '</div>' +
        '</div>'
      );
    }

    ctxEl.style.display = '';
    ctxEl.innerHTML = (
      '<div class="wpp-ctx">' +
        '<div class="wpp-ctx-label">' + typeLabel + '</div>' +
        '<div class="wpp-ctx-job">' + _esc(record.job || typeLabel) + '</div>' +
        (amt ? '<div class="wpp-ctx-meta">' + amt + '</div>' : '') +
        parentBlock +
      '</div>'
    );

    var parentBtn = document.getElementById('wpp-ctx-parent');
    if (parentBtn && parent) {
      parentBtn.addEventListener('click', function () { App.showView(parent.id); });
    }
  }

  function _renderWizardCtx(ctxEl) {
    var customer = (_screenParams && _screenParams.customer) || '';
    var job      = (_screenParams && _screenParams.job) || '';
    var padType  = (_screenParams && _screenParams.padType) || 'work';
    var padLabels = { field: 'Field visit', work: 'Work pad', note: 'Memo', plan: 'Plan' };

    if (!customer && !job) {
      var padHint = (padType === 'field') ? 'Title is required to save'
                  : (padType === 'note')  ? 'Memo title is required'
                  : (padType === 'plan')  ? 'Plan title is required'
                  : 'Job title is required to save';
      ctxEl.style.display = '';
      ctxEl.innerHTML = (
        '<div class="wpp-ctx">' +
          '<div class="wpp-ctx-label">New ' + (padLabels[padType] || 'record').toLowerCase() + '</div>' +
          '<div class="wpp-ctx-hint">' + padHint + '</div>' +
        '</div>'
      );
      return;
    }

    if (padType !== 'work' && job) {
      ctxEl.style.display = '';
      ctxEl.innerHTML = (
        '<div class="wpp-ctx">' +
          '<div class="wpp-ctx-label">' + (padLabels[padType] || 'Editing') + '</div>' +
          '<div class="wpp-ctx-job">' + _esc(job) + '</div>' +
        '</div>'
      );
      return;
    }

    var mainRecords = _records.filter(function (r) { return !r.parentId; });
    var recent = mainRecords.filter(function (r) {
      return r.customer && r.customer.toLowerCase() === customer.toLowerCase();
    }).slice(0, 2);

    var recentHtml = '';
    if (recent.length) {
      recentHtml = '<div class="wpp-ctx-recent-label">Recent jobs</div>';
      recent.forEach(function (r) {
        recentHtml += '<div class="wpp-ctx-recent">' + _esc(r.job || 'Untitled') + '</div>';
      });
    } else {
      recentHtml = '<div class="wpp-ctx-hint">No prior jobs for this customer</div>';
    }

    ctxEl.style.display = '';
    ctxEl.innerHTML = (
      '<div class="wpp-ctx">' +
        '<div class="wpp-ctx-label">Customer</div>' +
        '<div class="wpp-ctx-job">' + _esc(customer) + '</div>' +
        recentHtml +
      '</div>'
    );
  }

  // ── Expense sub-records ──────────────────────────────────────

  function _renderExpenses(children, parentId) {
    var expEl = document.getElementById('wpp-expenses');
    if (!expEl) return;

    expEl.style.display = '';

    var payments     = children.filter(function (r) { return r.recordType === 'payment'; });
    var allExpenses  = children.filter(function (r) { return r.recordType !== 'payment'; });
    var cogsExpenses = allExpenses.filter(function (r) { return r.expense_billing === 'cogs'; });
    var expenses     = allExpenses.filter(function (r) { return r.expense_billing !== 'cogs'; });

    // Determine currency symbol from children or parent
    var currSym = '\u00a3';
    var parentRecord = null;
    for (var pi = 0; pi < _records.length; pi++) {
      if (_records[pi].id === parentId) { parentRecord = _records[pi]; break; }
    }
    if (parentRecord && parentRecord.currency) {
      currSym = parentRecord.currency === 'EUR' ? '\u20ac' : (parentRecord.currency === 'USD' || parentRecord.currency === 'CAD') ? '$' : '\u00a3';
    }
    children.forEach(function (r) {
      if (r.currency) currSym = r.currency === 'EUR' ? '\u20ac' : (r.currency === 'USD' || r.currency === 'CAD') ? '$' : '\u00a3';
    });

    var fmt = function (n) { return currSym + n.toFixed(2); };

    var SIDEBAR_CHARGE_LABELS = {
      '': 'Labour', '1': 'Urgency / emergency', '2': 'After-hours',
      '3': 'Travel / mileage', '4': 'Delivery / courier', '5': 'Equipment hire',
      '6': 'Materials', '7': 'Subcontractor', '8': 'Cancellation fee',
      '9': 'Deposit / retainer', '10': 'Credit / discount', '11': 'Warranty',
      '12': 'Regulatory levy', '13': 'FX adjustment', '14': 'Payment handling fee',
    };

    function itemsFor(list, defaultLabel) {
      return list.map(function (r) {
        var sym = r.currency === 'EUR' ? '\u20ac' : (r.currency === 'USD' || r.currency === 'CAD') ? '$' : '\u00a3';
        var amt = r.amount ? (sym + parseFloat(r.amount).toFixed(2)) : '';
        // If short description (job) is blank, fall back to charge type label
        var displayJob = (r.job && r.job.trim())
          ? r.job
          : (r.charge_type != null && SIDEBAR_CHARGE_LABELS[String(r.charge_type)]
              ? SIDEBAR_CHARGE_LABELS[String(r.charge_type)]
              : defaultLabel);
        var myCost = r.worker_cost && parseFloat(r.worker_cost) > 0
          ? parseFloat(r.worker_cost).toFixed(2) : null;
        // Hide "My Cost" row if a COGS record is already linked to this expense
        var alreadyCosted = cogsExpenses.some(function (c) { return c.linkedExpenseId === r.id; });
        var myCostRow = (myCost && !alreadyCosted)
          ? '<div class="wpp-my-cost-row">' +
              '<span class="wpp-my-cost-label">my cost: ' + sym + myCost + '</span>' +
              '<button class="wpp-my-cost-confirm" data-amount="' + _esc(myCost) + '" data-expid="' + _esc(r.id) + '" title="Record as COGS">COGS?</button>' +
            '</div>'
          : '';
        return (
          '<div class="wpp-exp-item" data-exp-id="' + _esc(r.id) + '" style="padding-right:6px;">' +
            '<span class="wpp-exp-job">' + _esc(displayJob) + '</span>' +
            '<div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">' +
              (amt ? '<span class="wpp-exp-amount" style="margin-right:4px;">' + _esc(amt) + '</span>' : '') +
              '<button class="wpp-item-opts wpp-exp-opts" data-id="' + _esc(r.id) + '" ' +
                'style="position:static;opacity:1;font-size:8px;" title="Options">\u25be</button>' +
              '<div class="wpp-item-menu" id="wpp-exp-menu-' + _esc(r.id) + '" style="display:none;top:auto;right:0;">' +
                (r.expense_billing !== 'cogs'
                  ? '<button class="wpp-item-menu-opt" data-action="cogs" data-id="' + _esc(r.id) + '" data-parent="' + _esc(parentId) + '" data-expid="' + _esc(r.id) + '">Record COGS</button>'
                  : '') +
                '<button class="wpp-item-menu-opt danger" data-action="archive" data-id="' + _esc(r.id) + '">Archive</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
          myCostRow
        );
      }).join('');
    }

    var bodyHtml = '';
    if (payments.length) {
      bodyHtml += '<div class="wpp-fin-subtitle">Payment</div>' + itemsFor(payments, 'Payment');
    }
    if (expenses.length) {
      // Group billable expenses by actionIdx
      var expGroups = [];
      var expGroupMap = {};
      expenses.forEach(function (r) {
        var key = r.actionIdx != null ? String(r.actionIdx) : '';
        if (!expGroupMap[key]) {
          var actionTitle = '';
          if (key !== '' && parentRecord && parentRecord.actions && parentRecord.actions[parseInt(key, 10)]) {
            actionTitle = parentRecord.actions[parseInt(key, 10)].title;
          }
          var grp = { key: key, title: actionTitle, items: [] };
          expGroups.push(grp);
          expGroupMap[key] = grp;
        }
        expGroupMap[key].items.push(r);
      });

      var hasActionGroups = expGroups.some(function (g) { return g.title; });
      if (hasActionGroups) {
        bodyHtml += '<div class="wpp-fin-subtitle">Expenses</div>';
        expGroups.forEach(function (g) {
          var head = g.title
            ? '<div class="wpp-exp-action-head">' + _esc(g.title) + '</div>'
            : '';
          bodyHtml += '<div class="wpp-exp-group">' + head + itemsFor(g.items, 'Expense') + '</div>';
        });
      } else {
        bodyHtml += '<div class="wpp-fin-subtitle">Expense</div>' + itemsFor(expenses, 'Expense');
      }
    }

    // ── COGS calculations ─────────────────────────────────────
    var totalBillable = expenses.reduce(function (s, r) { return s + (parseFloat(r.amount) || 0); }, 0);
    var totalCogs     = cogsExpenses.reduce(function (s, r) { return s + (parseFloat(r.amount) || 0); }, 0);
    var totalReceived = payments.reduce(function (s, r) { return s + (parseFloat(r.amount) || 0); }, 0);
    var quotedPrice   = parseFloat((parentRecord && parentRecord.amount) || 0);

    // COGS calculation — four tiers (priority order):
    // 1. linkedExpenseId → compare vs linked expense amount
    // 2. actionIdx → sum billed expenses with same actionIdx as reference
    // 3. action_quoted → compare vs manually entered quoted price
    // 4. free-floating → adds fully to effective cost
    var cogsOverrun = 0;
    var cogsWithinBudget = 0;
    var cogsUnlinked = 0;

    cogsExpenses.forEach(function (r) {
      var c = parseFloat(r.amount) || 0;
      if (r.linkedExpenseId) {
        var linked = null;
        for (var li = 0; li < expenses.length; li++) {
          if (expenses[li].id === r.linkedExpenseId) { linked = expenses[li]; break; }
        }
        var expAmt = linked ? (parseFloat(linked.amount) || 0) : 0;
        cogsOverrun      += Math.max(0, c - expAmt);
        cogsWithinBudget += Math.min(c, expAmt);
      } else if (r.actionIdx != null && r.actionIdx !== undefined && r.actionIdx !== '') {
        // Sum all billed expenses sharing the same actionIdx
        var actionRef = expenses.reduce(function (s, e) {
          return String(e.actionIdx) === String(r.actionIdx) ? s + (parseFloat(e.amount) || 0) : s;
        }, 0);
        if (actionRef > 0) {
          cogsOverrun      += Math.max(0, c - actionRef);
          cogsWithinBudget += Math.min(c, actionRef);
        } else {
          cogsUnlinked += c;
        }
      } else if (r.action_quoted != null && r.action_quoted !== '') {
        var q = parseFloat(r.action_quoted) || 0;
        cogsOverrun      += Math.max(0, c - q);
        cogsWithinBudget += Math.min(c, q);
      } else {
        cogsUnlinked += c;
      }
    });

    // My Cost (worker_cost) on billable expenses — unconfirmed projected COGS
    // Suppress for expenses already costed via linkedExpenseId or actionIdx
    var projectedCogs = expenses.reduce(function (s, r) {
      var costedByLink = cogsExpenses.some(function (c) { return c.linkedExpenseId === r.id; });
      var costedByAction = r.actionIdx != null && cogsExpenses.some(function (c) {
        return c.actionIdx != null && String(c.actionIdx) === String(r.actionIdx);
      });
      if (costedByLink || costedByAction) return s;
      return s + (parseFloat(r.worker_cost) || 0);
    }, 0);

    // Effective cost: billable expenses + unlinked COGS + overruns (self-funded COGS is already covered by its expense)
    var effectiveCost = totalBillable + cogsUnlinked + cogsOverrun;
    var effectiveCostWithProjected = (totalCogs === 0 && projectedCogs > 0)
      ? effectiveCost + projectedCogs
      : effectiveCost;
    var revenue = totalReceived > 0 ? totalReceived : quotedPrice;
    var profit  = revenue - (totalCogs > 0 ? effectiveCost : effectiveCostWithProjected);

    var COGS_CHARGE_LABELS = {
      '': 'Labour', '1': 'Urgency / emergency', '2': 'After-hours',
      '3': 'Travel / mileage', '4': 'Delivery / courier', '5': 'Equipment hire',
      '6': 'Materials', '7': 'Subcontractor', '8': 'Cancellation fee',
      '9': 'Deposit / retainer', '10': 'Credit / discount', '11': 'Warranty',
      '12': 'Regulatory levy', '13': 'FX adjustment',
    };

    // ── COGS section (collapsed by default, creator-only) ─────
    var cogsTotal = totalCogs;
    if (cogsExpenses.length) {
        var cogsItemsHtml = cogsExpenses.map(function (r) {
          var sym   = r.currency === 'EUR' ? '\u20ac' : (r.currency === 'USD' || r.currency === 'CAD') ? '$' : '\u00a3';
          var cAmt  = parseFloat(r.amount) || 0;

          // Primary display label: charge type if set, then job (skip generic default), then "COGS"
          var chargeLabel = r.charge_type != null && COGS_CHARGE_LABELS[String(r.charge_type)]
            ? COGS_CHARGE_LABELS[String(r.charge_type)]
            : null;
          var jobText = r.job && r.job !== 'Cost of goods sold' ? r.job : null;
          var displayLabel = chargeLabel || jobText || 'COGS';

          // Determine reference amount + label (priority: linkedExpenseId > actionIdx > action_quoted)
          var refAmt = null;
          var refLabel = null;
          if (r.linkedExpenseId) {
            var lExp = null;
            for (var li = 0; li < expenses.length; li++) {
              if (expenses[li].id === r.linkedExpenseId) { lExp = expenses[li]; break; }
            }
            if (lExp) { refAmt = parseFloat(lExp.amount) || 0; refLabel = lExp.job || 'Expense'; }
          } else if (r.actionIdx != null && r.actionIdx !== undefined && r.actionIdx !== '') {
            refAmt = expenses.reduce(function (s, e) {
              return String(e.actionIdx) === String(r.actionIdx) ? s + (parseFloat(e.amount) || 0) : s;
            }, 0);
            if (!refAmt) refAmt = null;
            // Use action title if available
            if (parentRecord && parentRecord.actions && parentRecord.actions[parseInt(r.actionIdx, 10)]) {
              refLabel = parentRecord.actions[parseInt(r.actionIdx, 10)].title;
            }
          } else if (r.action_quoted != null && r.action_quoted !== '') {
            refAmt = parseFloat(r.action_quoted) || 0;
          }

          var qAmt  = refAmt;
          var pct   = qAmt ? Math.round(cAmt / qAmt * 100) : null;
          var over  = qAmt && cAmt > qAmt;
          var badge = qAmt
            ? '<span style="font-family:var(--font-mono);font-size:9px;font-weight:700;padding:2px 5px;border-radius:2px;flex-shrink:0;' +
              'background:' + (over ? 'rgba(184,64,64,.12)' : 'var(--stamp-light)') + ';' +
              'color:' + (over ? '#b84040' : 'var(--stamp)') + ';">' +
              pct + '%' + (over ? '\u2191' : '') +
              '</span>'
            : '';
          var subline = qAmt
            ? '<div style="font-family:var(--font-mono);font-size:9px;color:' + (over ? '#b84040' : 'var(--ink-muted)') + ';padding-left:2px;margin-top:1px;">' +
                sym + cAmt.toFixed(2) + ' of ' + sym + qAmt.toFixed(2) +
                (r.linkedExpenseId ? ' charged' : r.actionIdx != null ? ' charged' : ' quoted') +
                (over ? ' \u2014 ' + sym + (cAmt - qAmt).toFixed(2) + ' over' : '') +
              '</div>'
            : '';
          var refNote = refLabel
            ? '<div style="font-family:var(--font-mono);font-size:8px;color:var(--ink-muted);padding:1px 14px 0;letter-spacing:.04em;">for: ' + _esc(refLabel) + '</div>'
            : '';
          return (
            refNote +
            '<div class="wpp-exp-item" data-exp-id="' + _esc(r.id) + '" style="padding-right:6px;flex-wrap:wrap;">' +
              '<span class="wpp-exp-job" style="flex:1;">' + _esc(displayLabel) + '</span>' +
              '<div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">' +
                (badge) +
                '<span class="wpp-exp-amount" style="color:#b84040;margin-right:4px;">' + sym + cAmt.toFixed(2) + '</span>' +
                '<button class="wpp-item-opts wpp-exp-opts" data-id="' + _esc(r.id) + '" ' +
                  'style="position:static;opacity:1;font-size:8px;" title="Options">\u25be</button>' +
                '<div class="wpp-item-menu" id="wpp-exp-menu-' + _esc(r.id) + '" style="display:none;top:auto;right:0;">' +
                  '<button class="wpp-item-menu-opt danger" data-action="archive" data-id="' + _esc(r.id) + '">Archive</button>' +
                '</div>' +
              '</div>' +
              (subline ? '<div style="width:100%;padding:0 0 2px;">' + subline + '</div>' : '') +
            '</div>'
          );
        }).join('');

        var cogsBodyDisplay = _cogsOpen ? '' : 'none';
        var cogsChevRot    = _cogsOpen ? 'rotate(-90deg)' : '';
        bodyHtml += (
          '<div class="wpp-cogs-section">' +
            '<button class="wpp-cogs-toggle" id="wpp-cogs-toggle">' +
              '<span style="flex:1;text-align:left;">Cost of Goods Sold</span>' +
              (cogsOverrun > 0
                ? '<span style="font-family:var(--font-mono);font-size:9px;color:#b84040;margin-right:6px;">\u2191 ' + fmt(cogsOverrun) + ' over</span>'
                : '') +
              '<span class="wpp-cogs-amt">' + _esc(fmt(cogsTotal)) + '</span>' +
              '<span class="wpp-cogs-chevron" id="wpp-cogs-chevron" style="transform:' + cogsChevRot + '">\u25be</span>' +
            '</button>' +
            '<div class="wpp-cogs-body" id="wpp-cogs-body" style="display:' + cogsBodyDisplay + ';">' +
              cogsItemsHtml +
              '<div class="wpp-cogs-add">' +
                '<button class="btn-ghost" id="wpp-add-cogs" style="width:100%;font-size:11px;padding:5px 8px;">+ Record COGS</button>' +
              '</div>' +
            '</div>' +
          '</div>'
        );
    }

    // ── Tally ─────────────────────────────────────────────────
    var summaryRows = '';
    if (quotedPrice > 0 || effectiveCost > 0 || totalReceived > 0 || totalCogs > 0) {
      if (quotedPrice > 0) {
        summaryRows += '<div class="wpp-exp-total" style="font-weight:400;border-top:1px solid var(--rule-light);">' +
          '<span style="color:var(--ink-muted);">Quoted</span>' +
          '<span>' + fmt(quotedPrice) + '</span>' +
        '</div>';
      }
      if (totalBillable > 0) {
        summaryRows += '<div class="wpp-exp-total" style="font-weight:400;border-top:none;">' +
          '<span style="color:var(--ink-muted);">Costs</span>' +
          '<span>' + fmt(totalBillable) + '</span>' +
        '</div>';
        if (quotedPrice > 0) {
          var diff = quotedPrice - totalBillable;
          summaryRows += '<div class="wpp-exp-total" style="font-weight:400;border-top:none;">' +
            '<span style="color:var(--ink-faint);font-size:10px;">' + (diff >= 0 ? 'Under by' : 'Over by') + '</span>' +
            '<span style="color:' + (diff >= 0 ? '#2a6e2a' : '#b84040') + ';font-size:10px;">' + fmt(Math.abs(diff)) + '</span>' +
          '</div>';
        }
      }
      if (totalCogs > 0) {
        summaryRows += '<div class="wpp-exp-total" style="font-weight:400;border-top:none;">' +
          '<span style="color:#b84040;">COGS</span>' +
          '<span style="color:#b84040;">\u2212\u00a0' + fmt(totalCogs) + '</span>' +
        '</div>';
        // Show the split: within-budget portion is self-funded; only overruns hit the bottom line
        if (cogsOverrun > 0) {
          summaryRows += '<div class="wpp-exp-total" style="font-weight:400;border-top:none;">' +
            '<span style="color:#b84040;font-size:10px;">Overrun</span>' +
            '<span style="color:#b84040;font-size:10px;">' + fmt(cogsOverrun) + ' hits P&amp;L</span>' +
          '</div>';
        } else if (cogsWithinBudget > 0) {
          summaryRows += '<div class="wpp-exp-total" style="font-weight:400;border-top:none;">' +
            '<span style="color:var(--ink-muted);font-size:10px;">Within budget</span>' +
            '<span style="color:#2a6e2a;font-size:10px;">self-funded</span>' +
          '</div>';
        }
        // Net of COGS against charged items — how much margin the charged items generate after COGS
        if (totalBillable > 0) {
          var cogsVsCharged = totalBillable - totalCogs;
          summaryRows += '<div class="wpp-exp-total" style="font-weight:400;border-top:none;">' +
            '<span style="color:var(--ink-muted);font-size:10px;">COGS \u00b1 Charged</span>' +
            '<span style="font-size:10px;color:' + (cogsVsCharged >= 0 ? '#2a6e2a' : '#b84040') + ';">' +
              (cogsVsCharged >= 0 ? '+' : '') + fmt(cogsVsCharged) +
            '</span>' +
          '</div>';
        }
      }
      // Projected COGS from unconfirmed worker_cost (only shown when no actual COGS)
      if (projectedCogs > 0 && totalCogs === 0) {
        summaryRows += '<div class="wpp-exp-total" style="font-weight:400;border-top:none;border-top:1px dashed var(--rule-light);">' +
          '<span style="color:var(--ink-muted);font-size:10px;">COGS (projected)</span>' +
          '<span style="color:var(--ink-muted);font-size:10px;">\u2212\u00a0' + fmt(projectedCogs) + '</span>' +
        '</div>';
      } else if (projectedCogs > 0 && totalCogs > 0) {
        summaryRows += '<div class="wpp-exp-total" style="font-weight:400;border-top:none;">' +
          '<span style="color:var(--ink-muted);font-size:10px;">+ unconf. COGS</span>' +
          '<span style="color:var(--ink-muted);font-size:10px;">' + fmt(projectedCogs) + '</span>' +
        '</div>';
      }

      if (totalReceived > 0) {
        summaryRows += '<div class="wpp-exp-total" style="font-weight:400;border-top:none;">' +
          '<span style="color:var(--ink-muted);">Received</span>' +
          '<span>' + fmt(totalReceived) + '</span>' +
        '</div>';
      } else if (quotedPrice > 0) {
        summaryRows += '<div class="wpp-exp-total" style="font-weight:400;border-top:none;">' +
          '<span style="color:var(--ink-muted);font-size:10px;">Projected</span>' +
          '<span style="color:var(--ink-muted);font-size:10px;">(no payment yet)</span>' +
        '</div>';
      }
      var profitLabel = totalReceived > 0 ? 'Profit' : 'Projected';
      summaryRows += '<div class="wpp-exp-total" style="border-top:1px solid var(--rule);">' +
        '<span>' + profitLabel + '</span>' +
        '<span style="color:' + (profit >= 0 ? '#2a6e2a' : '#b84040') + ';">' + fmt(profit) + '</span>' +
      '</div>';

      // ── Business metrics ──────────────────────────────────
      var revForCalc = revenue; // received or quoted
      if (revForCalc > 0) {
        var grossMargin = (profit / revForCalc) * 100;
        summaryRows += '<div class="wpp-exp-total wpp-calc-row">' +
          '<span>Margin</span>' +
          '<span style="color:' + (grossMargin >= 0 ? 'var(--ink-muted)' : '#b84040') + ';">' + grossMargin.toFixed(1) + '%</span>' +
        '</div>';
      }
      if (totalCogs > 0 && quotedPrice > 0) {
        var cogsRatio = (totalCogs / quotedPrice) * 100;
        summaryRows += '<div class="wpp-exp-total wpp-calc-row">' +
          '<span>COGS ratio</span>' +
          '<span>' + cogsRatio.toFixed(1) + '%</span>' +
        '</div>';
      }
      if (totalBillable > 0 && revForCalc > 0) {
        var overheadRatio = (totalBillable / revForCalc) * 100;
        summaryRows += '<div class="wpp-exp-total wpp-calc-row">' +
          '<span>Pass-through</span>' +
          '<span>' + overheadRatio.toFixed(1) + '%</span>' +
        '</div>';
      }
    }

    expEl.innerHTML = (
      '<div class="wpp-exp-add-top">' +
        '<button class="btn-ghost" id="wpp-add-pay">+ Payment</button>' +
        '<button class="btn-ghost" id="wpp-add-exp">+ Expense</button>' +
        '<button class="btn-ghost" id="wpp-add-cogs-top">+ COGS</button>' +
      '</div>' +
      '<div class="wpp-exp-header">' +
        '<button class="wpp-fin-summary-link" id="wpp-fin-summary-link" data-parent="' + _esc(parentId) + '">Financial Summary</button>' +
        '<span>' + children.length + '</span>' +
      '</div>' +
      bodyHtml +
      summaryRows
    );

    // Financial Summary link
    var finSummaryLink = document.getElementById('wpp-fin-summary-link');
    if (finSummaryLink) {
      finSummaryLink.addEventListener('click', function () {
        App.showFinancial(this.dataset.parent);
      });
    }

    // COGS toggle
    var cogsToggle = document.getElementById('wpp-cogs-toggle');
    if (cogsToggle) {
      cogsToggle.addEventListener('click', function () {
        var body = document.getElementById('wpp-cogs-body');
        var chev = document.getElementById('wpp-cogs-chevron');
        if (!body) return;
        _cogsOpen = body.style.display !== 'none' ? false : true;
        body.style.display = _cogsOpen ? '' : 'none';
        if (chev) chev.style.transform = _cogsOpen ? 'rotate(-90deg)' : '';
      });
    }

    var addCogsBtn    = document.getElementById('wpp-add-cogs');
    var addCogsTopBtn = document.getElementById('wpp-add-cogs-top');
    if (addCogsBtn)    addCogsBtn.addEventListener('click',    function () { App.showCogs(parentId); });
    if (addCogsTopBtn) addCogsTopBtn.addEventListener('click', function () { App.showCogs(parentId); });

    var addPayBtn = document.getElementById('wpp-add-pay');
    if (addPayBtn) addPayBtn.addEventListener('click', function () { App.showPayment(parentId); });

    var addExpBtn = document.getElementById('wpp-add-exp');
    if (addExpBtn) addExpBtn.addEventListener('click', function () { App.showExpense(parentId); });

    // My Cost confirm buttons
    expEl.querySelectorAll('.wpp-my-cost-confirm').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        App.showCogs(parentId, this.dataset.amount, this.dataset.expid);
      });
    });

    // Item click → navigate (not on opts button)
    expEl.querySelectorAll('.wpp-exp-item').forEach(function (item) {
      item.addEventListener('click', function (e) {
        if (e.target.closest('.wpp-exp-opts') || e.target.closest('.wpp-item-menu')) return;
        App.showView(this.dataset.expId);
      });
    });

    // Opts button dropdown
    expEl.querySelectorAll('.wpp-exp-opts').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var id   = this.dataset.id;
        var menu = document.getElementById('wpp-exp-menu-' + id);
        if (!menu) return;
        var isOpen = menu.style.display !== 'none';
        expEl.querySelectorAll('.wpp-item-menu').forEach(function (m) { m.style.display = 'none'; });
        menu.style.display = isOpen ? 'none' : 'block';
        if (!isOpen) document.addEventListener('click', function close() {
          expEl.querySelectorAll('.wpp-item-menu').forEach(function (m) { m.style.display = 'none'; });
          document.removeEventListener('click', close);
        });
      });
    });

    // Dropdown menu actions
    expEl.querySelectorAll('.wpp-item-menu-opt').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var id     = this.dataset.id;
        var action = this.dataset.action;
        expEl.querySelectorAll('.wpp-item-menu').forEach(function (m) { m.style.display = 'none'; });
        if (action === 'cogs') {
          App.showCogs(parentId, null, this.dataset.expid || null);
        } else if (action === 'archive') {
          if (window.confirm('Archive this record?')) {
            RecordService.archive(id).then(function () {
              App.toast('Archived');
              if (typeof WorkpadsPanel !== 'undefined' && WorkpadsPanel.refresh) WorkpadsPanel.refresh();
            });
          }
        }
      });
    });
  }

  // ── Sub-tab row (work subtypes or sort modes) ────────────────

  function _renderSubTabs() {
    var sortTabsEl = document.getElementById('wpp-sort-tabs');
    if (!sortTabsEl) return;

    var tabs, activeKey;
    if (_padClassTab === 'work') {
      tabs = [
        { key: 'jobs',     label: 'Jobs' },
        { key: 'quotes',   label: 'Quotes' },
        { key: 'invoices', label: 'Invoices' },
      ];
      activeKey = _listTab;
    } else {
      tabs = [
        { key: 'recent', label: 'Recent' },
        { key: 'az',     label: 'A\u2013Z' },
        { key: 'za',     label: 'Z\u2013A' },
      ];
      activeKey = _sortMode;
    }

    var html = '';
    tabs.forEach(function (t) {
      html += '<button class="wpp-sort-tab' + (t.key === activeKey ? ' active' : '') +
              '" data-subtab="' + t.key + '">' + t.label + '</button>';
    });
    sortTabsEl.innerHTML = html;

    sortTabsEl.querySelectorAll('[data-subtab]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = this.dataset.subtab;
        if (_padClassTab === 'work') _listTab = key;
        else _sortMode = key;
        sortTabsEl.querySelectorAll('[data-subtab]').forEach(function (b) {
          b.classList.toggle('active', b.dataset.subtab === key);
        });
        _renderList();
      });
    });
  }

  function _padClass(r) {
    return r.record_class || 'work';
  }

  function _filterMainRecords(inRecordMode) {
    return _records.filter(function (r) {
      if (r.parentId || r.record_type === 'ack') return false;
      if (inRecordMode) return true;
      if (_padClass(r) !== _padClassTab) return false;
      if (_padClassTab === 'work') {
        if (_listTab === 'quotes')   return r.record_type === 'quote';
        if (_listTab === 'invoices') return r.record_type === 'invoice';
        return r.record_type !== 'quote' && r.record_type !== 'invoice';
      }
      return true;
    });
  }

  function _sortRecords(records) {
    if (_padClassTab === 'work' || _sortMode === 'recent') return records;
    var sorted = records.slice();
    sorted.sort(function (a, b) {
      var ta = (a.job || '').toLowerCase();
      var tb = (b.job || '').toLowerCase();
      if (ta < tb) return _sortMode === 'az' ? -1 : 1;
      if (ta > tb) return _sortMode === 'az' ? 1 : -1;
      return 0;
    });
    return sorted;
  }

  var _PAD_BADGE = {
    field: { label: 'Fld', color: '#6a5a40', bg: 'rgba(106,90,64,.10)' },
    note:  { label: 'Memo', color: '#5a4a8a', bg: 'rgba(90,74,138,.10)' },
    plan:  { label: 'Plan', color: '#2a6e6e', bg: 'rgba(42,110,110,.10)' },
  };

  // ── List rendering ───────────────────────────────────────────

  function _renderList() {
    var listEl = document.getElementById('wpp-list');
    if (!listEl) return;

    var activeId = _activeId();
    var inRecordMode = (_screenName === 'view' || _screenName === 'edit' || _screenName === 'share');

    var mainRecords = _filterMainRecords(inRecordMode);

    if (mainRecords.length === 0) {
      var typeLabel = { field: 'field', work: 'work', note: 'memo', plan: 'plan' }[_padClassTab] || 'matching';
      listEl.innerHTML = (
        '<div class="wpp-empty">No ' + typeLabel + ' pads yet.<br>Create one with + New Workpad.</div>'
      );
      return;
    }

    // Apply search filter
    var filtered = _query
      ? mainRecords.filter(function (r) {
          var q = _query.toLowerCase();
          return (r.job      || '').toLowerCase().indexOf(q) !== -1 ||
                 (r.customer || '').toLowerCase().indexOf(q) !== -1 ||
                 (r.date     || '').toLowerCase().indexOf(q) !== -1;
        })
      : mainRecords;

    filtered = _sortRecords(filtered);

    if (filtered.length === 0) {
      listEl.innerHTML = '<div class="wpp-empty">No matches.</div>';
      return;
    }

    // When viewing a child record, find its parent so we can suppress it from the list too
    var activeRecord = null;
    for (var ai = 0; ai < _records.length; ai++) {
      if (_records[ai].id === activeId) { activeRecord = _records[ai]; break; }
    }
    var activeParentId = (activeRecord && activeRecord.parentId) || null;

    var html = '';
    filtered.forEach(function (r) {
      // Active record and its parent (when viewing a child) are shown in context card
      if (inRecordMode && (r.id === activeId || r.id === activeParentId)) return;
      var isActive = r.id === activeId;
      var meta     = [];
      if (r.customer) meta.push(_esc(r.customer));
      if (r.date)     meta.push(_fmtDate(r.date));

      var pc = _padClass(r);
      var padBadge = '';
      if (pc !== 'work' && _PAD_BADGE[pc]) {
        var pb = _PAD_BADGE[pc];
        padBadge = '<span style="display:inline-block;font-family:var(--font-mono);font-size:8px;font-weight:700;letter-spacing:.10em;text-transform:uppercase;padding:1px 5px;border-radius:2px;margin-left:6px;vertical-align:middle;background:' + pb.bg + ';color:' + pb.color + ';">' + pb.label + '</span>';
      }

      html += (
        '<div class="wpp-item' + (isActive ? ' active' : '') + '"' +
            ' data-id="' + _esc(r.id) + '" tabindex="0" role="button">' +
          '<div class="wpp-item-job">' + _esc(r.job || 'Untitled') +
            padBadge +
            (r.receivedAt
              ? '<span style="display:inline-block;font-family:var(--font-mono);font-size:8px;font-weight:700;letter-spacing:.10em;text-transform:uppercase;padding:1px 5px;border-radius:2px;margin-left:6px;vertical-align:middle;background:rgba(192,71,10,.10);color:var(--stamp);">Rcvd</span>'
              : r.record_type === 'quote'
              ? '<span style="display:inline-block;font-family:var(--font-mono);font-size:8px;font-weight:700;letter-spacing:.10em;text-transform:uppercase;padding:1px 5px;border-radius:2px;margin-left:6px;vertical-align:middle;background:rgba(20,80,180,.08);color:#3a6abf;">Qte</span>'
              : r.record_type === 'invoice'
              ? '<span style="display:inline-block;font-family:var(--font-mono);font-size:8px;font-weight:700;letter-spacing:.10em;text-transform:uppercase;padding:1px 5px;border-radius:2px;margin-left:6px;vertical-align:middle;background:rgba(10,140,60,.08);color:#1a7a40;">Inv</span>'
              : '') +
          '</div>' +
          (meta.length ? '<div class="wpp-item-meta">' + meta.join(' \xb7 ') + '</div>' : '') +
          '<button class="wpp-item-opts" data-id="' + _esc(r.id) + '" ' +
              'title="Options" aria-label="Record options">\u25be</button>' +
          '<div class="wpp-item-menu" id="wpp-menu-' + _esc(r.id) + '" style="display:none;">' +
            '<button class="wpp-item-menu-opt" data-action="open" data-id="' + _esc(r.id) + '">Open</button>' +
            '<button class="wpp-item-menu-opt danger" data-action="archive" data-id="' + _esc(r.id) + '">Archive</button>' +
          '</div>' +
        '</div>'
      );
    });

    listEl.innerHTML = html || '<div class="wpp-empty" style="padding:16px;font-size:12px;">All records shown above.</div>';

    listEl.querySelectorAll('.wpp-item').forEach(function (item) {
      item.addEventListener('click', function (e) {
        if (e.target.closest('.wpp-item-opts') || e.target.closest('.wpp-item-menu')) return;
        App.showView(this.dataset.id);
      });
      item.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          App.showView(this.dataset.id);
        }
      });
    });

    // Options button: toggle dropdown
    listEl.querySelectorAll('.wpp-item-opts').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var id   = this.dataset.id;
        var menu = document.getElementById('wpp-menu-' + id);
        if (!menu) return;
        var isOpen = menu.style.display !== 'none';
        listEl.querySelectorAll('.wpp-item-menu').forEach(function (m) { m.style.display = 'none'; });
        menu.style.display = isOpen ? 'none' : 'block';
        if (!isOpen) document.addEventListener('click', function closeWpp() {
          listEl.querySelectorAll('.wpp-item-menu').forEach(function (m) { m.style.display = 'none'; });
          document.removeEventListener('click', closeWpp);
        });
      });
    });

    // Menu options
    listEl.querySelectorAll('.wpp-item-menu-opt').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var id     = this.dataset.id;
        var action = this.dataset.action;
        listEl.querySelectorAll('.wpp-item-menu').forEach(function (m) { m.style.display = 'none'; });
        if (action === 'open') {
          App.showView(id);
        } else if (action === 'archive') {
          if (window.confirm('Archive this record?')) {
            RecordService.archive(id).then(function () {
              App.toast('Record archived');
              refresh();
              App.showList();
            });
          }
        }
      });
    });

    var activeEl = listEl.querySelector('.active');
    if (activeEl) activeEl.scrollIntoView({ block: 'nearest' });
  }

  function _markActive() {
    var activeId = _activeId();
    var listEl   = document.getElementById('wpp-list');
    if (!listEl) return;
    listEl.querySelectorAll('.wpp-item').forEach(function (item) {
      var isActive = item.dataset.id === activeId;
      item.classList.toggle('active', isActive);
      item.style.borderLeft  = isActive ? '2px solid var(--stamp)' : '';
      item.style.paddingLeft = isActive ? '12px' : '';
    });
  }

  // ── Helpers ──────────────────────────────────────────────────

  function _activeId() {
    var hash  = window.location.hash.slice(1);
    var parts = hash.replace(/^\//, '').split('/');
    if (parts[0] === 'view' || parts[0] === 'edit' || parts[0] === 'share') {
      return parts[1] || null;
    }
    return null;
  }

  function _fmtDate(s) {
    if (!s) return '';
    try {
      var d   = new Date(s + 'T00:00:00');
      var mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return d.getDate() + '\u00a0' + mon[d.getMonth()];
    } catch (e) { return s; }
  }

  function _esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function showFilteredList(padClass) {
    if (padClass) setPadClassFilter(padClass);
    _screenName   = 'list';
    _screenParams = {};
    _renderContext();
    var listEl = document.getElementById('wpp-list');
    if (listEl) listEl.scrollTop = 0;
  }

  // ── Public ───────────────────────────────────────────────────

  return { init: init, refresh: refresh, setContext: setContext, setPadClassFilter: setPadClassFilter, showFilteredList: showFilteredList };

}());
