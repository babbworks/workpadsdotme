/* ============================================================
   ListScreen — dashboard overview (Financial + Contacts)
   ============================================================ */

var ListScreen = (function () {
  'use strict';

  var _records     = [];  // work pads only (financial tally)
  var _allMain     = [];  // all top-level pads (any type)
  var _expenses    = [];
  var _payments    = [];
  var _stylesAdded = false;

  var _PAD_TYPES = [
    { key: 'field', label: 'Field' },
    { key: 'work',  label: 'Work' },
    { key: 'note',  label: 'Memo' },
    { key: 'plan',  label: 'Plan' },
  ];

  // ── Styles ──────────────────────────────────────────────────

  function _addStyles() {
    if (_stylesAdded) return;
    _stylesAdded = true;
    var s = document.createElement('style');
    s.textContent = [
      '.list-wrap { max-width:760px; margin:0 auto; padding:36px 32px 80px; }',

      '.list-hd { margin-bottom:28px; }',
      '.list-title-img { height:clamp(44px,8vw,68px); width:auto; display:block; mix-blend-mode:multiply; }',

      /* Dashboard blocks */
      '.list-block {',
      '  background:var(--card); border:1px solid var(--rule);',
      '  border-radius:4px; box-shadow:var(--shadow-card);',
      '  margin-bottom:20px; overflow:hidden;',
      '}',
      '.list-block-hd {',
      '  display:flex; align-items:center; justify-content:space-between;',
      '  padding:14px 20px; border-bottom:1px solid var(--rule-light);',
      '  flex-wrap:wrap; gap:10px;',
      '}',
      '.list-block-title {',
      '  font-family:var(--font-display); font-size:15px; font-weight:700;',
      '  color:var(--ink);',
      '}',
      '.list-block-meta {',
      '  font-family:var(--font-mono); font-size:9.5px;',
      '  color:var(--ink-muted); margin-top:2px;',
      '}',
      '.list-block-btns { display:flex; gap:6px; }',
      '.list-block-btn {',
      '  font-family:var(--font-mono); font-size:9px; font-weight:700;',
      '  letter-spacing:.10em; text-transform:uppercase;',
      '  background:none; border:1.5px solid var(--rule);',
      '  border-radius:3px; padding:5px 12px; cursor:pointer;',
      '  color:var(--ink-muted); transition:all .12s;',
      '}',
      '.list-block-btn:hover { background:var(--stamp); border-color:var(--stamp); color:#fff; }',

      /* Stat row */
      '.list-block-snap {',
      '  display:grid;',
      '  grid-template-columns:repeat(auto-fill,minmax(130px,1fr));',
      '}',
      '.list-block-stat {',
      '  padding:16px 18px;',
      '  border-right:1px solid var(--rule-light);',
      '}',
      '.list-block-stat:last-child { border-right:none; }',
      '.list-block-stat-lbl {',
      '  font-family:var(--font-mono); font-size:8px; font-weight:700;',
      '  letter-spacing:.14em; text-transform:uppercase;',
      '  color:var(--ink-muted); margin-bottom:6px;',
      '}',
      '.list-block-stat-val {',
      '  font-family:var(--font-display); font-size:22px; font-weight:700;',
      '  color:var(--ink); line-height:1;',
      '}',
      '.list-block-stat-sub {',
      '  font-family:var(--font-mono); font-size:9px;',
      '  color:var(--ink-faint); margin-top:3px;',
      '}',

      /* Contacts block */
      '.list-contacts-body {',
      '  padding:16px 20px; display:flex; flex-wrap:wrap; gap:8px;',
      '}',
      '.list-contact-btn {',
      '  font-family:var(--font-mono); font-size:10px; font-weight:700;',
      '  letter-spacing:.06em; text-transform:uppercase;',
      '  background:var(--rule-light); border:1.5px solid var(--rule);',
      '  border-radius:3px; padding:7px 14px; cursor:pointer;',
      '  color:var(--ink-muted); transition:all .12s;',
      '}',
      '.list-contact-btn:hover {',
      '  border-color:var(--stamp-border); color:var(--stamp);',
      '  background:var(--stamp-light);',
      '}',

      /* Empty state */
      '.list-empty { padding:80px 32px; text-align:center; }',
      '.list-empty-heading {',
      '  font-family:var(--font-display); font-size:26px;',
      '  font-weight:300; font-style:italic;',
      '  color:var(--ink-muted); margin-bottom:10px;',
      '}',
      '.list-empty-sub {',
      '  font-family:var(--font-mono); font-size:11px;',
      '  color:var(--ink-faint); letter-spacing:.06em; margin-bottom:24px;',
      '}',

      /* Recent by type */
      '.list-recent-types {',
      '  display:grid; grid-template-columns:repeat(4,1fr);',
      '  border-top:1px solid var(--rule-light);',
      '}',
      '.list-recent-type-col {',
      '  padding:14px 12px 16px; border-right:1px solid var(--rule-light);',
      '  min-width:0;',
      '}',
      '.list-recent-type-col:last-child { border-right:none; }',
      '.list-recent-type-hd {',
      '  display:block; width:100%; text-align:left;',
      '  font-family:var(--font-mono); font-size:9px; font-weight:700;',
      '  letter-spacing:.12em; text-transform:uppercase;',
      '  color:var(--stamp); background:none; border:none; padding:0 0 8px;',
      '  cursor:pointer; transition:color .12s;',
      '}',
      '.list-recent-type-hd:hover { color:var(--ink); }',
      '.list-recent-item {',
      '  display:block; width:100%; text-align:left;',
      '  font-family:var(--font-body); font-size:12px; font-weight:600;',
      '  color:var(--ink-mid); background:none; border:none;',
      '  padding:4px 0; cursor:pointer;',
      '  white-space:nowrap; overflow:hidden; text-overflow:ellipsis;',
      '  transition:color .12s;',
      '}',
      '.list-recent-item:hover { color:var(--stamp); }',
      '.list-recent-empty {',
      '  font-family:var(--font-mono); font-size:9px;',
      '  color:var(--ink-faint); font-style:italic;',
      '}',
      '.list-recent-more {',
      '  display:block; width:100%; text-align:left;',
      '  font-family:var(--font-mono); font-size:9px; font-weight:700;',
      '  letter-spacing:.08em; text-transform:uppercase;',
      '  color:var(--stamp); background:none; border:none;',
      '  padding:8px 0 0; cursor:pointer;',
      '}',
      '.list-recent-more:hover { text-decoration:underline; }',
      '@media (max-width:720px) {',
      '  .list-recent-types { grid-template-columns:repeat(2,1fr); }',
      '  .list-recent-type-col:nth-child(2) { border-right:none; }',
      '}',
    ].join('\n');
    document.head.appendChild(s);
  }

  // ── Lifecycle ────────────────────────────────────────────────

  function onShow() {
    _addStyles();
    RecordService.list().then(function (all) {
      all = all || [];
      _allMain  = all.filter(function (r) { return !r.parentId && r.recordType !== 'expense' && r.recordType !== 'payment'; });
      _records  = _allMain.filter(function (r) { return (r.record_class || 'work') === 'work'; });
      var workIds = {};
      _records.forEach(function (r) { workIds[r.id] = true; });
      _expenses = all.filter(function (r) {
        return r.recordType === 'expense' && r.parentId && workIds[r.parentId];
      });
      _payments = all.filter(function (r) {
        return r.recordType === 'payment' && r.parentId && workIds[r.parentId];
      });
      _render();
    });
  }

  function onHide() {}

  // ── Render ───────────────────────────────────────────────────

  function _render() {
    var el  = document.getElementById('screen-list');
    var sym = '\u00a3';
    var fmt = function (n) { return sym + n.toFixed(2); };

    var totalRevenue  = _records.reduce(function (s, r) { return s + (parseFloat(r.amount) || 0); }, 0);
    var billedExps    = _expenses.filter(function (e) { return e.expense_billing !== 'cogs'; });
    var totalExpenses = billedExps.reduce(function (s, e) { return s + (parseFloat(e.amount) || 0); }, 0);
    var totalReceived = _payments.reduce(function (s, p) { return s + (parseFloat(p.amount) || 0); }, 0);

    var html = '<div class="list-wrap">';

    // Header
    html += '<div class="list-hd"><img src="/img/at-workpads.png" alt="@workpads" class="list-title-img"></div>';

    if (_allMain.length === 0) {
      html += _renderEmpty();
      html += '</div>';
      el.innerHTML = html;
      _bindEvents(el);
      return;
    }

    html += _renderRecentByType();

    // ── Financial Overview block (work pads only)
    if (_records.length === 0) {
      html += '<div class="list-block" style="margin-bottom:20px;">' +
        '<div class="list-block-hd"><div class="list-block-title">Financial Overview</div></div>' +
        '<div style="padding:16px 20px;font-family:var(--font-mono);font-size:11px;color:var(--ink-faint);font-style:italic;">' +
          'No work pads yet \u2014 jobs, quotes and invoices appear here.' +
        '</div></div>';
    } else {
    var metaStr = _records.length + ' record' + (_records.length !== 1 ? 's' : '');
    if (_expenses.length) metaStr += ' \xb7 ' + _expenses.length + ' expense' + (_expenses.length !== 1 ? 's' : '');
    if (_payments.length) metaStr += ' \xb7 ' + _payments.length + ' payment' + (_payments.length !== 1 ? 's' : '');

    html += '<div class="list-block">';
    html += '<div class="list-block-hd">';
    html += '<div>' +
      '<div class="list-block-title">Financial Overview</div>' +
      '<div class="list-block-meta">' + metaStr + '</div>' +
    '</div>';
    html += '<div class="list-block-btns">' +
      '<button class="list-block-btn" id="list-fin-basic">Basic</button>' +
      '<button class="list-block-btn" id="list-fin-advanced">Advanced</button>' +
    '</div>';
    html += '</div>';

    html += '<div class="list-block-snap">';
    html += _stat('Workpads', String(_records.length), '');
    if (totalRevenue  > 0) html += _stat('Revenue',  fmt(totalRevenue),  '');
    if (totalExpenses > 0) html += _stat('Expenses', fmt(totalExpenses), '');
    if (totalReceived > 0) html += _stat('Received', fmt(totalReceived), '');
    if (totalRevenue > 0 && totalExpenses > 0) {
      var margin    = totalRevenue - totalExpenses;
      var marginPct = (margin / totalRevenue * 100).toFixed(1) + '%';
      html += _stat('Gross margin', fmt(margin), marginPct);
    }
    html += '</div>';
    html += '</div>'; // .list-block (Financial)
    }

    // ── Contacts block
    html += '<div class="list-block">';
    html += '<div class="list-block-hd"><div class="list-block-title">Contacts</div></div>';
    html += '<div class="list-contacts-body">';
    ['Customers', 'Workers', 'Subcontractors', 'Referrers', 'Witnesses'].forEach(function (ct) {
      html += '<button class="list-contact-btn" data-contact="' + ct.toLowerCase() + '">' + ct + '</button>';
    });
    html += '</div>';
    html += '</div>'; // .list-block (Contacts)

    html += '</div>'; // .list-wrap
    el.innerHTML = html;
    _bindEvents(el);
  }

  function _stat(label, val, sub) {
    return (
      '<div class="list-block-stat">' +
        '<div class="list-block-stat-lbl">' + label + '</div>' +
        '<div class="list-block-stat-val">' + val + '</div>' +
        (sub ? '<div class="list-block-stat-sub">' + sub + '</div>' : '') +
      '</div>'
    );
  }

  function _padClass(r) {
    return r.record_class || 'work';
  }

  function _renderRecentByType() {
    var html = '<div class="list-block">';
    html += '<div class="list-block-hd"><div class="list-block-title">Recent by type</div></div>';
    html += '<div class="list-recent-types">';
    _PAD_TYPES.forEach(function (pt) {
      var allTyped = _allMain.filter(function (r) { return _padClass(r) === pt.key; })
        .sort(function (a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); });
      var typed = allTyped.slice(0, 10);
      html += '<div class="list-recent-type-col">';
      html += '<button class="list-recent-type-hd" data-pad-class="' + pt.key + '">' + pt.label + '</button>';
      if (!typed.length) {
        html += '<div class="list-recent-empty">None yet</div>';
      } else {
        typed.forEach(function (r) {
          html += '<button class="list-recent-item" data-id="' + _esc(r.id) + '">' + _esc(r.job || 'Untitled') + '</button>';
        });
        if (allTyped.length > 10) {
          html += '<button class="list-recent-more" data-pad-class="' + pt.key + '">View more</button>';
        }
      }
      html += '</div>';
    });
    html += '</div></div>';
    return html;
  }

  function _renderEmpty() {
    return (
      '<div class="list-empty">' +
        '<p class="list-empty-heading">No workpads yet</p>' +
        '<p class="list-empty-sub">Create your first record with + New Workpad</p>' +
        '<button class="btn-primary" id="list-btn-new">+ New workpad</button>' +
      '</div>'
    );
  }

  // ── Events ───────────────────────────────────────────────────

  function _bindEvents(screenEl) {
    var basicBtn = document.getElementById('list-fin-basic');
    var advBtn   = document.getElementById('list-fin-advanced');
    if (basicBtn) basicBtn.addEventListener('click', function () { App.showFinanceOverview('basic'); });
    if (advBtn)   advBtn.addEventListener('click',   function () { App.showFinanceOverview('advanced'); });

    screenEl.querySelectorAll('.list-contact-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (typeof App !== 'undefined' && App.toast) App.toast('Contacts coming soon');
      });
    });

    var newBtn = document.getElementById('list-btn-new');
    if (newBtn) newBtn.addEventListener('click', function () { App.showTypePicker(); });

    function _openPadFilter(padClass) {
      if (typeof WorkpadsPanel !== 'undefined' && WorkpadsPanel.showFilteredList) {
        WorkpadsPanel.showFilteredList(padClass);
      } else if (typeof WorkpadsPanel !== 'undefined' && WorkpadsPanel.setPadClassFilter) {
        WorkpadsPanel.setPadClassFilter(padClass);
      }
      var isMobile = window.matchMedia('(max-width: 900px)').matches;
      if (isMobile && typeof App !== 'undefined' && App.openMobilePanel) {
        App.openMobilePanel('left');
      } else {
        var panel = document.getElementById('panel-left');
        if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }

    screenEl.querySelectorAll('.list-recent-type-hd, .list-recent-more').forEach(function (btn) {
      btn.addEventListener('click', function () {
        _openPadFilter(btn.dataset.padClass);
      });
    });

    screenEl.querySelectorAll('.list-recent-item').forEach(function (btn) {
      btn.addEventListener('click', function () { App.showView(btn.dataset.id); });
    });
  }

  // ── Helpers ──────────────────────────────────────────────────

  function _esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── Public ───────────────────────────────────────────────────

  return { onShow: onShow, onHide: onHide };

}());
