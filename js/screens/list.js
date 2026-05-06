/* ============================================================
   ListScreen — dashboard overview (Financial + Contacts)
   ============================================================ */

var ListScreen = (function () {
  'use strict';

  var _records     = [];  // main records (not expense/payment)
  var _expenses    = [];
  var _payments    = [];
  var _stylesAdded = false;

  // ── Styles ──────────────────────────────────────────────────

  function _addStyles() {
    if (_stylesAdded) return;
    _stylesAdded = true;
    var s = document.createElement('style');
    s.textContent = [
      '.list-wrap { max-width:760px; margin:0 auto; padding:36px 32px 80px; }',

      '.list-hd { margin-bottom:28px; }',
      '.list-title-img { height:42px; width:auto; display:block; mix-blend-mode:multiply; }',

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
    ].join('\n');
    document.head.appendChild(s);
  }

  // ── Lifecycle ────────────────────────────────────────────────

  function onShow() {
    _addStyles();
    RecordService.list().then(function (all) {
      all = all || [];
      _records  = all.filter(function (r) { return !r.parentId && r.recordType !== 'expense' && r.recordType !== 'payment'; });
      _expenses = all.filter(function (r) { return r.recordType === 'expense'; });
      _payments = all.filter(function (r) { return r.recordType === 'payment'; });
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

    if (_records.length === 0) {
      html += _renderEmpty();
      html += '</div>';
      el.innerHTML = html;
      _bindEvents(el);
      return;
    }

    // ── Financial Overview block
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

  function _renderEmpty() {
    return (
      '<div class="list-empty">' +
        '<p class="list-empty-heading">No workpads yet</p>' +
        '<p class="list-empty-sub">Create your first record with the + New button</p>' +
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
    if (newBtn) newBtn.addEventListener('click', function () { App.showWizard(); });
  }

  // ── Helpers ──────────────────────────────────────────────────

  function _esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── Public ───────────────────────────────────────────────────

  return { onShow: onShow, onHide: onHide };

}());
