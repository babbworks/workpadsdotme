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
      '  flex-shrink:0;',
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

      /* Expense sub-records section */
      '#wpp-expenses { flex-shrink:0; }',
      '.wpp-exp-header {',
      '  display:flex; justify-content:space-between; align-items:center;',
      '  padding:7px 14px 4px;',
      '  border-top:1px solid var(--panel-border);',
      '  font-family:var(--font-mono); font-size:9px; font-weight:700;',
      '  letter-spacing:.12em; text-transform:uppercase; color:var(--ink-faint);',
      '}',
      '.wpp-exp-item {',
      '  padding:5px 14px;',
      '  display:flex; justify-content:space-between; align-items:center;',
      '  border-top:1px solid var(--rule-light);',
      '  cursor:pointer; transition:background .1s;',
      '}',
      '.wpp-exp-item:hover { background:rgba(192,71,10,.04); }',
      '.wpp-exp-job {',
      '  font-family:var(--font-mono); font-size:11px; color:var(--ink-muted);',
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
      '}',
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
        '<input class="wpp-search-input" id="wpp-search" type="search"' +
          ' placeholder="Search\u2026" autocomplete="off" spellcheck="false">' +
      '</div>' +
      '<div id="wpp-ctx" style="display:none;"></div>' +
      '<div id="wpp-expenses" style="display:none;"></div>' +
      '<div class="wpp-list" id="wpp-list"></div>' +
      '<div class="wpp-footer">' +
        '<button class="btn-primary" id="wpp-new-btn" style="width:100%;">+ New workpad</button>' +
      '</div>'
    );

    var searchEl = document.getElementById('wpp-search');
    if (searchEl) {
      searchEl.addEventListener('input', function () {
        _query = this.value;
        _renderList();
      });
    }

    var newBtn = document.getElementById('wpp-new-btn');
    if (newBtn) newBtn.addEventListener('click', function () { App.showWizard(); });
  }

  // ── Load + render ────────────────────────────────────────────

  function _load() {
    RecordService.list().then(function (records) {
      _records = records || [];
      _renderList();
      _renderContext();
    });
  }

  function refresh() {
    _load();
  }

  function setContext(name, params) {
    _screenName   = name;
    _screenParams = params || {};
    _renderContext();
  }

  // ── Context rendering ────────────────────────────────────────

  function _renderContext() {
    var ctxEl  = document.getElementById('wpp-ctx');
    var expEl  = document.getElementById('wpp-expenses');
    if (!ctxEl) return;

    // Always hide expenses unless in record mode
    if (expEl && _screenName !== 'view' && _screenName !== 'edit' && _screenName !== 'share') {
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
    // Only count non-expense records for stats
    var mainRecords = _records.filter(function (r) { return r.recordType !== 'expense'; });
    var total    = mainRecords.length;
    if (total === 0) { ctxEl.style.display = 'none'; ctxEl.innerHTML = ''; return; }

    var received = mainRecords.filter(function (r) { return !!r.receivedAt; }).length;
    var sent     = total - received;
    var recent   = mainRecords.slice(0, 3);

    var statsHtml = '<div class="wpp-ctx-stats">' +
      '<span>' + total + ' total</span>';
    if (sent)     statsHtml += '<span class="wpp-ctx-stat-sep">\xb7</span><span>' + sent + ' sent</span>';
    if (received) statsHtml += '<span class="wpp-ctx-stat-sep">\xb7</span><span>' + received + ' received</span>';
    statsHtml += '</div>';

    var recentHtml = '';
    if (recent.length) {
      recentHtml = '<div class="wpp-ctx-recent-label">Recent</div>';
      recent.forEach(function (r) {
        recentHtml += '<div class="wpp-ctx-recent">' +
          _esc(r.job || 'Untitled') +
          (r.date ? '<span class="wpp-ctx-recent-date">' + _fmtDate(r.date) + '</span>' : '') +
        '</div>';
      });
    }

    ctxEl.style.display = '';
    ctxEl.innerHTML = '<div class="wpp-ctx"><div class="wpp-ctx-label">Overview</div>' + statsHtml + recentHtml + '</div>';
  }

  function _renderRecordCtx(ctxEl) {
    var activeId = _activeId();
    if (!activeId) { ctxEl.style.display = 'none'; ctxEl.innerHTML = ''; return; }

    var record = null;
    for (var i = 0; i < _records.length; i++) {
      if (_records[i].id === activeId) { record = _records[i]; break; }
    }
    if (!record) { ctxEl.style.display = 'none'; return; }

    var meta = [];
    if (record.customer) meta.push(_esc(record.customer));
    if (record.date)     meta.push(_fmtDate(record.date));
    var role = record.receivedAt ? 'Received' : 'Viewing';

    ctxEl.style.display = '';
    ctxEl.innerHTML = (
      '<div class="wpp-ctx">' +
        '<div class="wpp-ctx-label">' + role + '</div>' +
        '<div class="wpp-ctx-job">' + _esc(record.job || 'Untitled') + '</div>' +
        (meta.length ? '<div class="wpp-ctx-meta">' + meta.join(' \xb7 ') + '</div>' : '') +
        '<div class="wpp-ctx-actions">' +
          '<button class="btn-ghost" id="wpp-ctx-edit" style="font-size:10px;padding:4px 10px;">Edit</button>' +
          '<button class="btn-primary" id="wpp-ctx-share" style="font-size:10px;padding:4px 10px;">Share</button>' +
        '</div>' +
      '</div>'
    );

    var aid     = activeId;
    var editBtn  = document.getElementById('wpp-ctx-edit');
    var shareBtn = document.getElementById('wpp-ctx-share');
    if (editBtn)  editBtn.addEventListener('click',  function () { App.showWizard(aid); });
    if (shareBtn) shareBtn.addEventListener('click', function () { App.showShare(aid); });

    // Render expense sub-records for this workpad
    var expenses = _records.filter(function (r) { return r.parentId === activeId; });
    _renderExpenses(expenses, activeId);
  }

  function _renderWizardCtx(ctxEl) {
    var customer = (_screenParams && _screenParams.customer) || '';

    if (!customer) {
      ctxEl.style.display = '';
      ctxEl.innerHTML = (
        '<div class="wpp-ctx">' +
          '<div class="wpp-ctx-label">New record</div>' +
          '<div class="wpp-ctx-hint">Job title is required to save</div>' +
        '</div>'
      );
      return;
    }

    var mainRecords = _records.filter(function (r) { return r.recordType !== 'expense'; });
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

  function _renderExpenses(expenses, parentId) {
    var expEl = document.getElementById('wpp-expenses');
    if (!expEl) return;

    expEl.style.display = '';

    if (expenses.length === 0) {
      expEl.innerHTML = (
        '<div class="wpp-exp-header"><span>Expenses</span><span>0</span></div>' +
        '<div class="wpp-exp-add">' +
          '<button class="btn-ghost" id="wpp-add-exp" style="width:100%;font-size:11px;padding:5px 8px;">+ Add expense</button>' +
        '</div>'
      );
    } else {
      // Calculate total (all expenses in same currency assumption for display)
      var total     = 0;
      var hasCurrency = false;
      var currSym   = '\u00a3';
      expenses.forEach(function (e) {
        if (e.currency) {
          hasCurrency = true;
          currSym = e.currency === 'EUR' ? '\u20ac' : e.currency === 'USD' ? '$' : '\u00a3';
        }
        var amt = parseFloat(e.amount || '');
        if (!isNaN(amt)) total += amt;
      });

      var itemsHtml = expenses.map(function (e) {
        var sym = e.currency === 'EUR' ? '\u20ac' : e.currency === 'USD' ? '$' : '\u00a3';
        var amt = e.amount ? (sym + e.amount) : '';
        return (
          '<div class="wpp-exp-item" data-exp-id="' + _esc(e.id) + '">' +
            '<span class="wpp-exp-job">' + _esc(e.job || 'Expense') + '</span>' +
            (amt ? '<span class="wpp-exp-amount">' + _esc(amt) + '</span>' : '') +
          '</div>'
        );
      }).join('');

      var totalHtml = '';
      if (total > 0) {
        totalHtml = '<div class="wpp-exp-total">' +
          '<span>Total</span>' +
          '<span>' + currSym + total.toFixed(2) + '</span>' +
          '</div>';
      }

      expEl.innerHTML = (
        '<div class="wpp-exp-header">' +
          '<span>Expenses</span>' +
          '<span>' + expenses.length + '</span>' +
        '</div>' +
        itemsHtml +
        totalHtml +
        '<div class="wpp-exp-add">' +
          '<button class="btn-ghost" id="wpp-add-exp" style="width:100%;font-size:11px;padding:5px 8px;">+ Add expense</button>' +
        '</div>'
      );
    }

    // Bind "Add expense"
    var addExpBtn = document.getElementById('wpp-add-exp');
    if (addExpBtn) {
      addExpBtn.addEventListener('click', function () {
        if (typeof App.showExpense === 'function') App.showExpense(parentId);
      });
    }

    // Bind expense item clicks
    expEl.querySelectorAll('.wpp-exp-item').forEach(function (item) {
      item.addEventListener('click', function () {
        App.showView(this.dataset.expId);
      });
    });
  }

  // ── List rendering ───────────────────────────────────────────

  function _renderList() {
    var listEl = document.getElementById('wpp-list');
    if (!listEl) return;

    var activeId = _activeId();
    var inRecordMode = (_screenName === 'view' || _screenName === 'edit' || _screenName === 'share');

    // Filter: exclude expense sub-records from the main panel list
    var mainRecords = _records.filter(function (r) { return r.recordType !== 'expense'; });

    if (mainRecords.length === 0) {
      listEl.innerHTML = (
        '<div class="wpp-empty">No workpads yet.<br>Create your first record.</div>'
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

    if (filtered.length === 0) {
      listEl.innerHTML = '<div class="wpp-empty">No matches.</div>';
      return;
    }

    var html = '';
    filtered.forEach(function (r) {
      // In record mode, the active record is shown in the context card — exclude from list
      if (inRecordMode && r.id === activeId) return;
      var isActive = r.id === activeId;
      var meta     = [];
      if (r.customer) meta.push(_esc(r.customer));
      if (r.date)     meta.push(_fmtDate(r.date));

      html += (
        '<div class="wpp-item' + (isActive ? ' active' : '') + '"' +
            ' data-id="' + _esc(r.id) + '" tabindex="0" role="button">' +
          '<div class="wpp-item-job">' + _esc(r.job || 'Untitled') + '</div>' +
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

  // ── Public ───────────────────────────────────────────────────

  return { init: init, refresh: refresh, setContext: setContext };

}());
