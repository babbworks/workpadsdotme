/* ============================================================
   FinanceOverviewScreen — master financial view across all records
   ============================================================ */

var FinanceOverviewScreen = (function () {
  'use strict';

  var _mode        = 'basic';   // 'basic' | 'advanced'
  var _records     = [];
  var _expenses    = [];
  var _payments    = [];
  var _stylesAdded = false;
  var _dateFrom    = '';   // ISO date string or '' — persisted across mode/screen changes
  var _dateTo      = '';

  var _DATE_FROM_KEY = 'wp_fov_date_from';
  var _DATE_TO_KEY   = 'wp_fov_date_to';

  var CHARGE_LABELS = {
    '': 'Labour', '1': 'Urgency / emergency', '2': 'After-hours',
    '3': 'Travel / mileage', '4': 'Delivery / courier', '5': 'Equipment hire',
    '6': 'Materials', '7': 'Subcontractor', '8': 'Cancellation fee',
    '9': 'Deposit / retainer', '10': 'Credit / discount', '11': 'Warranty',
    '12': 'Regulatory levy', '13': 'FX adjustment',
  };

  // ── Styles ───────────────────────────────────────────────────

  function _addStyles() {
    if (_stylesAdded) return;
    _stylesAdded = true;
    var s = document.createElement('style');
    s.textContent = [
      '.fov-wrap { max-width:760px; margin:0 auto; padding:32px 32px 80px; }',

      /* Header */
      '.fov-hd { margin-bottom:24px; }',
      '.fov-back { font-family:var(--font-mono); font-size:11px; color:var(--stamp);',
      '  background:none; border:none; cursor:pointer; padding:0; margin-bottom:14px;',
      '  display:inline-block; text-decoration:underline; text-decoration-style:dotted; }',
      '.fov-title { font-family:var(--font-display); font-size:clamp(24px,4vw,38px);',
      '  font-weight:700; line-height:1.1; color:var(--ink); margin-bottom:4px; }',
      '.fov-subtitle { font-family:var(--font-mono); font-size:10px; color:var(--ink-muted);',
      '  letter-spacing:.06em; }',

      /* Mode toggle */
      '.fov-mode-bar { display:flex; align-items:center; gap:8px; margin-bottom:24px;',
      '  padding-bottom:16px; border-bottom:1.5px solid var(--rule); }',
      '.fov-mode-btn { font-family:var(--font-mono); font-size:9px; font-weight:700;',
      '  letter-spacing:.12em; text-transform:uppercase; background:none;',
      '  border:1.5px solid var(--rule); border-radius:3px; cursor:pointer;',
      '  padding:5px 14px; color:var(--ink-muted); transition:all .12s; }',
      '.fov-mode-btn.active { background:var(--stamp); color:#fff; border-color:var(--stamp); }',
      '.fov-mode-note { font-family:var(--font-mono); font-size:9px; color:var(--ink-faint);',
      '  margin-left:4px; }',

      /* Snapshot row */
      '.fov-snapshot { display:grid;',
      '  grid-template-columns:repeat(auto-fill,minmax(140px,1fr)); gap:10px;',
      '  margin-bottom:28px; }',
      '.fov-snap { background:var(--card); border:1px solid var(--rule);',
      '  border-radius:4px; padding:14px 16px; }',
      '.fov-snap-lbl { font-family:var(--font-mono); font-size:8.5px; font-weight:700;',
      '  letter-spacing:.14em; text-transform:uppercase; color:var(--ink-muted);',
      '  margin-bottom:7px; }',
      '.fov-snap-val { font-family:var(--font-display); font-size:24px; font-weight:700;',
      '  color:var(--ink); line-height:1; }',
      '.fov-snap-sub { font-family:var(--font-mono); font-size:9px; color:var(--ink-faint);',
      '  margin-top:4px; }',
      '.fov-snap.positive .fov-snap-val { color:#2a6e2a; }',
      '.fov-snap.negative .fov-snap-val { color:#b84040; }',
      '.fov-snap.neutral  .fov-snap-val { color:var(--ink-muted); }',

      /* Progress bar */
      '.fov-prog-wrap { background:var(--rule-light); border-radius:3px;',
      '  height:7px; margin:6px 0 10px; overflow:hidden; }',
      '.fov-prog-fill { height:100%; border-radius:3px; background:var(--stamp); }',

      /* Section */
      '.fov-section { margin-bottom:28px; }',
      '.fov-section-title {',
      '  font-family:var(--font-mono); font-size:9px; font-weight:700;',
      '  letter-spacing:.16em; text-transform:uppercase; color:var(--ink-muted);',
      '  margin-bottom:12px; padding-bottom:7px; border-bottom:1px solid var(--rule-light);',
      '}',

      /* Table */
      '.fov-table { width:100%; border-collapse:collapse;',
      '  font-family:var(--font-mono); font-size:11px; }',
      '.fov-table th { text-align:left; font-size:8.5px; letter-spacing:.12em;',
      '  text-transform:uppercase; color:var(--ink-muted); padding:4px 0 8px;',
      '  border-bottom:1px solid var(--rule); font-weight:700; }',
      '.fov-table th:not(:first-child),.fov-table td:not(:first-child) { text-align:right; }',
      '.fov-table td { padding:6px 0 5px; border-bottom:1px solid var(--rule-light);',
      '  color:var(--ink-mid); vertical-align:baseline; }',
      '.fov-table tr:last-child td { border-bottom:none; }',
      '.fov-table .fov-t-main { color:var(--ink); font-weight:500; }',
      '.fov-table .fov-t-pct { color:var(--ink-faint); font-size:9.5px; padding-left:10px; }',
      '.fov-table .fov-t-sub { color:var(--ink-faint); font-size:9.5px; }',
      '.fov-table .fov-t-total td { font-weight:700; color:var(--ink);',
      '  border-top:1.5px solid var(--rule); border-bottom:none; padding-top:9px; }',
      '.fov-table .fov-t-link td:first-child { color:var(--stamp); cursor:pointer; }',
      '.fov-table .fov-t-link:hover td { background:var(--stamp-light); }',

      /* Margin / P&L rows */
      '.fov-pl-row { display:flex; justify-content:space-between; align-items:baseline;',
      '  padding:6px 0; font-family:var(--font-mono); font-size:11px;',
      '  border-bottom:1px solid var(--rule-light); }',
      '.fov-pl-row:last-child { border-bottom:none; }',
      '.fov-pl-lbl { color:var(--ink-muted); }',
      '.fov-pl-val { font-weight:700; color:var(--ink); }',
      '.fov-pl-pct { font-size:9px; color:var(--ink-faint); margin-left:6px; font-weight:400; }',
      '.fov-positive { color:#2a6e2a !important; }',
      '.fov-negative { color:#b84040 !important; }',

      /* Per-job mini table */
      '.fov-job-row { display:grid; align-items:baseline;',
      '  grid-template-columns:1fr auto auto auto;',
      '  gap:12px;',
      '  padding:7px 0; border-bottom:1px solid var(--rule-light);',
      '  font-family:var(--font-mono); font-size:10px; cursor:pointer; }',
      '.fov-job-row:last-child { border-bottom:none; }',
      '.fov-job-row:hover .fov-job-name { color:var(--stamp); }',
      '.fov-job-name { color:var(--ink); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }',
      '.fov-job-num  { color:var(--ink-mid); text-align:right; flex-shrink:0; }',
      '.fov-job-pct  { color:var(--ink-faint); font-size:9px; text-align:right; flex-shrink:0; }',
      '.fov-job-margin { font-weight:700; text-align:right; flex-shrink:0; }',

      /* Date filter */
      '.fov-date-bar {',
      '  display:flex; align-items:center; gap:8px; flex-wrap:wrap;',
      '  padding:10px 14px; margin-bottom:20px;',
      '  background:var(--rule-light); border:1px solid var(--rule); border-radius:4px;',
      '}',
      '.fov-date-label {',
      '  font-family:var(--font-mono); font-size:8.5px; font-weight:700;',
      '  letter-spacing:.12em; text-transform:uppercase; color:var(--ink-muted);',
      '  flex-shrink:0;',
      '}',
      '.fov-date-input {',
      '  font-family:var(--font-mono); font-size:10px; color:var(--ink);',
      '  background:var(--paper); border:1px solid var(--rule); border-radius:3px;',
      '  padding:4px 8px; width:130px; transition:border-color .12s;',
      '}',
      '.fov-date-input:focus { outline:none; border-color:var(--stamp-border); }',
      '.fov-date-sep { font-family:var(--font-mono); font-size:9px; color:var(--ink-faint); }',
      '.fov-date-presets { display:flex; gap:4px; flex-wrap:wrap; margin-left:4px; }',
      '.fov-preset-btn {',
      '  font-family:var(--font-mono); font-size:8.5px; font-weight:700;',
      '  letter-spacing:.06em; text-transform:uppercase;',
      '  background:var(--paper); border:1px solid var(--rule);',
      '  border-radius:2px; padding:3px 8px; cursor:pointer;',
      '  color:var(--ink-muted); transition:all .1s;',
      '}',
      '.fov-preset-btn:hover { border-color:var(--stamp-border); color:var(--stamp); }',
      '.fov-preset-btn.active { background:var(--stamp); border-color:var(--stamp); color:#fff; }',
      '.fov-date-active-badge {',
      '  font-family:var(--font-mono); font-size:8px; color:var(--stamp);',
      '  background:var(--stamp-light); border:1px solid var(--stamp-border);',
      '  border-radius:2px; padding:2px 6px; margin-left:auto;',
      '}',
    ].join('\n');
    document.head.appendChild(s);
  }

  // ── Lifecycle ────────────────────────────────────────────────

  function onShow(params) {
    _addStyles();
    _mode = (params && params.mode === 'advanced') ? 'advanced' : 'basic';
    // Restore persisted date filter (only on first load — don't overwrite if already set)
    if (_dateFrom === '' && _dateTo === '') {
      _dateFrom = localStorage.getItem(_DATE_FROM_KEY) || '';
      _dateTo   = localStorage.getItem(_DATE_TO_KEY)   || '';
    }

    RecordService.list().then(function (all) {
      _records  = all.filter(function (r) { return r.recordType !== 'expense' && r.recordType !== 'payment'; });
      _expenses = all.filter(function (r) { return r.recordType === 'expense'; });
      _payments = all.filter(function (r) { return r.recordType === 'payment'; });
      _render();
    });
  }

  function onHide() { _records = []; _expenses = []; _payments = []; }
  // Note: _dateFrom / _dateTo intentionally NOT cleared on hide — persist across screens

  // ── Render ───────────────────────────────────────────────────

  function _render() {
    var el = document.getElementById('screen-finance-overview');

    // ── Apply date filter to records, then pull matching sub-records
    var fromTs = _dateFrom ? new Date(_dateFrom + 'T00:00:00').getTime() : null;
    var toTs   = _dateTo   ? new Date(_dateTo   + 'T23:59:59').getTime() : null;

    var filteredRecords = _records.filter(function (r) {
      if (!fromTs && !toTs) return true;
      if (!r.date) return !fromTs; // undated records: include only when no from-filter
      var ts = new Date(r.date + 'T00:00:00').getTime();
      if (fromTs && ts < fromTs) return false;
      if (toTs   && ts > toTs)   return false;
      return true;
    });

    var filteredIds = {};
    filteredRecords.forEach(function (r) { filteredIds[r.id] = true; });

    var billedAll = _expenses.filter(function (e) { return e.expense_billing !== 'cogs' && filteredIds[e.parentId]; });
    var cogsAll   = _expenses.filter(function (e) { return e.expense_billing === 'cogs'  && filteredIds[e.parentId]; });
    var filteredPayments = _payments.filter(function (p) { return filteredIds[p.parentId]; });

    // ── Aggregate totals
    var totalRevenue  = 0;
    var totalExpenses = 0;
    var totalCogs     = 0;
    var totalPaid     = 0;
    var totalOutstanding = 0;

    var catMap     = {};
    var cogsCatMap = {};
    var cogsOverrunTotal  = 0;
    var cogsWithinBudget  = 0;
    var cogsUnlinkedTotal = 0;

    filteredRecords.forEach(function (r) {
      totalRevenue += parseFloat(r.amount) || 0;
    });

    billedAll.forEach(function (e) {
      var amt = parseFloat(e.amount) || 0;
      totalExpenses += amt;
      var key = e.charge_type != null ? String(e.charge_type) : '';
      var label = CHARGE_LABELS[key] || 'Other';
      catMap[label] = (catMap[label] || 0) + amt;
    });

    cogsAll.forEach(function (c) {
      var cAmt = parseFloat(c.amount) || 0;
      totalCogs += cAmt;
      var key = c.charge_type != null ? String(c.charge_type) : '';
      cogsCatMap[CHARGE_LABELS[key] || 'Other'] = (cogsCatMap[CHARGE_LABELS[key] || 'Other'] || 0) + cAmt;

      // COGS split
      if (c.linkedExpenseId) {
        var linked = null;
        for (var i = 0; i < billedAll.length; i++) {
          if (billedAll[i].id === c.linkedExpenseId) { linked = billedAll[i]; break; }
        }
        var expAmt = linked ? (parseFloat(linked.amount) || 0) : 0;
        cogsOverrunTotal    += Math.max(0, cAmt - expAmt);
        cogsWithinBudget    += Math.min(cAmt, expAmt);
      } else if (c.actionIdx != null && c.actionIdx !== '') {
        var actionRef = billedAll.reduce(function (s, e) {
          return e.parentId === c.parentId && String(e.actionIdx) === String(c.actionIdx)
            ? s + (parseFloat(e.amount) || 0) : s;
        }, 0);
        if (actionRef > 0) {
          cogsOverrunTotal += Math.max(0, cAmt - actionRef);
          cogsWithinBudget += Math.min(cAmt, actionRef);
        } else {
          cogsUnlinkedTotal += cAmt;
        }
      } else {
        cogsUnlinkedTotal += cAmt;
      }
    });

    filteredPayments.forEach(function (p) {
      totalPaid += parseFloat(p.amount) || 0;
    });

    totalOutstanding = totalRevenue - totalPaid;
    var grossMargin  = totalRevenue - totalExpenses;
    var effectiveCogsCost = cogsUnlinkedTotal + cogsOverrunTotal;
    var netMargin    = grossMargin - effectiveCogsCost;
    var paidPct      = totalRevenue > 0 ? Math.min(100, totalPaid / totalRevenue * 100) : 0;

    var sym = '\u00a3'; // default currency symbol — could be improved with per-record logic
    var fmt = function (n) { return sym + n.toFixed(2); };

    var html = '<div class="fov-wrap">';

    // Header
    html += '<div class="fov-hd">' +
      '<button class="fov-back" id="fov-back">\u2190 All records</button>' +
      '<div class="fov-title">Financial Overview</div>' +
      '<div class="fov-subtitle">' + filteredRecords.length + ' records \u00b7 ' +
        billedAll.length + ' expenses \u00b7 ' +
        filteredPayments.length + ' payments' +
        ((_dateFrom || _dateTo) ? ' \u00b7 <span style="color:var(--stamp);">filtered</span>' : '') +
      '</div>' +
    '</div>';

    // Mode toggle
    html += '<div class="fov-mode-bar">' +
      '<button class="fov-mode-btn' + (_mode === 'basic'    ? ' active' : '') + '" data-mode="basic">Basic</button>' +
      '<button class="fov-mode-btn' + (_mode === 'advanced' ? ' active' : '') + '" data-mode="advanced">Advanced</button>' +
      '<span class="fov-mode-note">' + (_mode === 'advanced' ? 'Full breakdown with percentages and profit analysis' : 'Summary across all records') + '</span>' +
    '</div>';

    // Date filter bar
    html += _renderDateBar();

    // Snapshot cards
    html += '<div class="fov-snapshot">';
    html += _snap('Revenue', fmt(totalRevenue), filteredRecords.length + ' records', '');
    if (totalExpenses > 0) html += _snap('Expenses', fmt(totalExpenses), billedAll.length + ' items', '');
    if (totalCogs > 0)     html += _snap('COGS', fmt(totalCogs), cogsAll.length + ' items', '');
    html += _snap('Received', fmt(totalPaid), Math.round(paidPct) + '% of revenue', paidPct >= 99.9 ? 'positive' : '');
    if (totalRevenue > 0 && totalExpenses > 0) {
      html += _snap('Gross Margin', fmt(grossMargin), (totalRevenue > 0 ? (grossMargin/totalRevenue*100).toFixed(1)+'%' : ''), grossMargin >= 0 ? 'positive' : 'negative');
    }
    if (totalOutstanding > 0.001) html += _snap('Outstanding', fmt(totalOutstanding), '', 'neutral');
    html += '</div>';

    // Payment progress
    if (totalRevenue > 0) {
      html += '<div class="fov-section">';
      html += '<div style="display:flex;justify-content:space-between;font-family:var(--font-mono);font-size:9px;color:var(--ink-muted);margin-bottom:3px;">' +
        '<span>Collection progress</span><span>' + Math.round(paidPct) + '%</span></div>';
      html += '<div class="fov-prog-wrap"><div class="fov-prog-fill" style="width:' + paidPct.toFixed(1) + '%;"></div></div>';
      html += '</div>';
    }

    // Expense categories
    if (Object.keys(catMap).length) {
      var cats = Object.keys(catMap).map(function(k){return{label:k,amt:catMap[k]};});
      cats.sort(function(a,b){return b.amt-a.amt;});

      html += '<div class="fov-section">';
      html += '<div class="fov-section-title">Expense categories</div>';
      html += '<table class="fov-table"><thead><tr>' +
        '<th>Category</th><th>Amount</th>' +
        (_mode==='advanced' ? '<th>% of expenses</th><th>% of revenue</th>' : '') +
      '</tr></thead><tbody>';
      cats.forEach(function(cat) {
        var pExp = totalExpenses > 0 ? (cat.amt/totalExpenses*100).toFixed(1)+'%' : '—';
        var pRev = totalRevenue  > 0 ? (cat.amt/totalRevenue *100).toFixed(1)+'%' : '—';
        html += '<tr><td class="fov-t-main">' + _esc(cat.label) + '</td><td>' + fmt(cat.amt) + '</td>' +
          (_mode==='advanced' ? '<td class="fov-t-pct">' + pExp + '</td><td class="fov-t-pct">' + pRev + '</td>' : '') +
        '</tr>';
      });
      html += '<tr class="fov-t-total"><td>Total</td><td>' + fmt(totalExpenses) + '</td>' +
        (_mode==='advanced' ? '<td>100%</td><td class="fov-t-pct">' + (totalRevenue>0?(totalExpenses/totalRevenue*100).toFixed(1)+'%':'—') + '</td>' : '') +
      '</tr></tbody></table></div>';
    }

    // COGS categories
    if (Object.keys(cogsCatMap).length) {
      var cogsCats = Object.keys(cogsCatMap).map(function(k){return{label:k,amt:cogsCatMap[k]};});
      cogsCats.sort(function(a,b){return b.amt-a.amt;});

      html += '<div class="fov-section">';
      html += '<div class="fov-section-title">COGS breakdown</div>';

      if (_mode === 'advanced') {
        html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px;">';
        html += _miniStat('Self-funded', fmt(cogsWithinBudget), 'within billed');
        html += _miniStat('Overrun', fmt(cogsOverrunTotal), 'above billed');
        html += _miniStat('Unlinked', fmt(cogsUnlinkedTotal), 'free-floating');
        html += '</div>';
      }

      html += '<table class="fov-table"><thead><tr>' +
        '<th>Type</th><th>Amount</th>' +
        (_mode==='advanced' ? '<th>% of COGS</th><th>% of revenue</th>' : '') +
      '</tr></thead><tbody>';
      cogsCats.forEach(function(cat) {
        var pCogs = totalCogs   > 0 ? (cat.amt/totalCogs  *100).toFixed(1)+'%' : '—';
        var pRev  = totalRevenue > 0 ? (cat.amt/totalRevenue*100).toFixed(1)+'%' : '—';
        html += '<tr><td class="fov-t-main">' + _esc(cat.label) + '</td><td>' + fmt(cat.amt) + '</td>' +
          (_mode==='advanced' ? '<td class="fov-t-pct">' + pCogs + '</td><td class="fov-t-pct">' + pRev + '</td>' : '') +
        '</tr>';
      });
      html += '</tbody></table></div>';
    }

    // Advanced: full P&L
    if (_mode === 'advanced' && totalRevenue > 0) {
      html += '<div class="fov-section">';
      html += '<div class="fov-section-title">Profit \u0026 loss</div>';

      var plRows = [
        { label: 'Total revenue', val: totalRevenue, pct: null, cls: '' },
        { label: 'Total expenses', val: -totalExpenses, pct: totalRevenue>0?totalExpenses/totalRevenue*100:null, cls: '' },
        { label: 'Gross margin', val: grossMargin, pct: totalRevenue>0?grossMargin/totalRevenue*100:null, cls: grossMargin>=0?'fov-positive':'fov-negative' },
      ];
      if (totalCogs > 0) {
        plRows.push({ label: 'COGS net cost', val: -effectiveCogsCost, pct: totalRevenue>0?effectiveCogsCost/totalRevenue*100:null, cls: '' });
        plRows.push({ label: 'Net margin', val: netMargin, pct: totalRevenue>0?netMargin/totalRevenue*100:null, cls: netMargin>=0?'fov-positive':'fov-negative' });
      }
      plRows.push({ label: 'Collected', val: totalPaid, pct: totalRevenue>0?totalPaid/totalRevenue*100:null, cls: '' });
      if (Math.abs(totalOutstanding) > 0.001) {
        plRows.push({ label: totalOutstanding>0?'Outstanding':'Overpaid', val: totalOutstanding, pct: totalRevenue>0?Math.abs(totalOutstanding)/totalRevenue*100:null, cls: totalOutstanding<0?'fov-negative':'' });
      }

      plRows.forEach(function(row) {
        var sign = row.val < 0 ? '\u2212' : '';
        html += '<div class="fov-pl-row">' +
          '<span class="fov-pl-lbl">' + row.label + '</span>' +
          '<span class="fov-pl-val ' + (row.cls||'') + '">' +
            sign + fmt(Math.abs(row.val)) +
            (row.pct != null ? '<span class="fov-pl-pct">' + row.pct.toFixed(1) + '%</span>' : '') +
          '</span>' +
        '</div>';
      });

      // Ratios
      if (totalExpenses > 0) {
        html += '<div class="fov-pl-row">' +
          '<span class="fov-pl-lbl" style="font-style:italic;">Expense ratio</span>' +
          '<span class="fov-pl-val" style="font-weight:400;">' + (totalExpenses/totalRevenue*100).toFixed(1) + '% of revenue</span>' +
        '</div>';
      }
      if (filteredRecords.length > 0 && totalRevenue > 0) {
        html += '<div class="fov-pl-row">' +
          '<span class="fov-pl-lbl" style="font-style:italic;">Avg revenue per job</span>' +
          '<span class="fov-pl-val" style="font-weight:400;">' + fmt(totalRevenue / filteredRecords.length) + '</span>' +
        '</div>';
      }

      html += '</div>';

      // Per-job breakdown
      if (filteredRecords.length > 1) {
        html += '<div class="fov-section">';
        html += '<div class="fov-section-title">Per job</div>';

        var jobData = filteredRecords.map(function(r) {
          var rBilled = billedAll.filter(function(e){return e.parentId===r.id;});
          var rCogs   = cogsAll.filter(function(e){return e.parentId===r.id;});
          var rPays   = filteredPayments.filter(function(p){return p.parentId===r.id;});
          var rRev    = parseFloat(r.amount) || 0;
          var rExp    = rBilled.reduce(function(s,e){return s+(parseFloat(e.amount)||0);},0);
          var rPaid   = rPays.reduce(function(s,p){return s+(parseFloat(p.amount)||0);},0);
          var rMargin = rRev - rExp;
          return { r: r, rev: rRev, exp: rExp, paid: rPaid, margin: rMargin };
        });
        jobData.sort(function(a,b){return b.rev - a.rev;});

        html += '<table class="fov-table"><thead><tr>' +
          '<th>Record</th><th>Revenue</th><th>Expenses</th><th>Margin</th><th>% of total rev</th>' +
        '</tr></thead><tbody>';
        jobData.forEach(function(d) {
          if (!d.rev && !d.exp) return;
          var pRev = totalRevenue > 0 ? (d.rev/totalRevenue*100).toFixed(1)+'%' : '—';
          var marginCls = d.margin >= 0 ? 'fov-positive' : 'fov-negative';
          html += '<tr class="fov-t-link" data-id="' + _esc(d.r.id) + '">' +
            '<td class="fov-t-main">' + _esc(d.r.job || 'Untitled') + '</td>' +
            '<td>' + (d.rev ? fmt(d.rev) : '—') + '</td>' +
            '<td>' + (d.exp ? fmt(d.exp) : '—') + '</td>' +
            '<td class="' + marginCls + '">' + (d.rev||d.exp ? fmt(d.margin) : '—') + '</td>' +
            '<td class="fov-t-pct">' + pRev + '</td>' +
          '</tr>';
        });
        html += '</tbody></table></div>';
      }
    }

    html += '</div>'; // .fov-wrap
    el.innerHTML = html;
    _bindEvents();
  }

  // ── Date filter ──────────────────────────────────────────────

  function _renderDateBar() {
    var preset = _activePreset();
    var presets = [
      { key: 'all',    label: 'All' },
      { key: 'thismonth', label: 'This month' },
      { key: 'lastmonth', label: 'Last month' },
      { key: '3months',   label: '3 months' },
      { key: 'thisyear',  label: 'This year' },
      { key: 'lastyear',  label: 'Last year' },
    ];
    var html = '<div class="fov-date-bar">';
    html += '<span class="fov-date-label">Date range:</span>';
    html += '<input class="fov-date-input" id="fov-date-from" type="date" value="' + _esc(_dateFrom) + '" title="From date">';
    html += '<span class="fov-date-sep">\u2013</span>';
    html += '<input class="fov-date-input" id="fov-date-to" type="date" value="' + _esc(_dateTo) + '" title="To date">';
    html += '<div class="fov-date-presets">';
    presets.forEach(function (p) {
      html += '<button class="fov-preset-btn' + (preset === p.key ? ' active' : '') + '" data-preset="' + p.key + '">' + p.label + '</button>';
    });
    html += '</div>';
    if (_dateFrom || _dateTo) {
      html += '<span class="fov-date-active-badge">Filtered</span>';
    }
    html += '</div>';
    return html;
  }

  function _activePreset() {
    var now   = new Date();
    var y     = now.getFullYear();
    var m     = now.getMonth(); // 0-based

    var pad = function (n) { return n < 10 ? '0' + n : String(n); };
    var lastDayOf = function (yr, mo) { return new Date(yr, mo + 1, 0).getDate(); };

    var presets = {
      all:       { from: '', to: '' },
      thismonth: { from: y + '-' + pad(m+1) + '-01', to: y + '-' + pad(m+1) + '-' + pad(lastDayOf(y, m)) },
      lastmonth: (function() {
        var lm = m === 0 ? 11 : m - 1;
        var ly = m === 0 ? y - 1 : y;
        return { from: ly + '-' + pad(lm+1) + '-01', to: ly + '-' + pad(lm+1) + '-' + pad(lastDayOf(ly, lm)) };
      }()),
      '3months': (function() {
        var d = new Date(y, m - 2, 1);
        return { from: d.getFullYear() + '-' + pad(d.getMonth()+1) + '-01', to: y + '-' + pad(m+1) + '-' + pad(lastDayOf(y, m)) };
      }()),
      thisyear:  { from: y + '-01-01', to: y + '-12-31' },
      lastyear:  { from: (y-1) + '-01-01', to: (y-1) + '-12-31' },
    };

    var keys = ['all', 'thismonth', 'lastmonth', '3months', 'thisyear', 'lastyear'];
    for (var i = 0; i < keys.length; i++) {
      var p = presets[keys[i]];
      if (p.from === _dateFrom && p.to === _dateTo) return keys[i];
    }
    return (_dateFrom || _dateTo) ? 'custom' : 'all';
  }

  function _applyPreset(key) {
    var now = new Date();
    var y   = now.getFullYear();
    var m   = now.getMonth();
    var pad = function (n) { return n < 10 ? '0' + n : String(n); };
    var lastDayOf = function (yr, mo) { return new Date(yr, mo + 1, 0).getDate(); };

    switch (key) {
      case 'all':
        _dateFrom = ''; _dateTo = ''; break;
      case 'thismonth':
        _dateFrom = y + '-' + pad(m+1) + '-01';
        _dateTo   = y + '-' + pad(m+1) + '-' + pad(lastDayOf(y, m)); break;
      case 'lastmonth': {
        var lm = m === 0 ? 11 : m - 1;
        var ly = m === 0 ? y - 1 : y;
        _dateFrom = ly + '-' + pad(lm+1) + '-01';
        _dateTo   = ly + '-' + pad(lm+1) + '-' + pad(lastDayOf(ly, lm)); break;
      }
      case '3months': {
        var d3 = new Date(y, m - 2, 1);
        _dateFrom = d3.getFullYear() + '-' + pad(d3.getMonth()+1) + '-01';
        _dateTo   = y + '-' + pad(m+1) + '-' + pad(lastDayOf(y, m)); break;
      }
      case 'thisyear':
        _dateFrom = y + '-01-01'; _dateTo = y + '-12-31'; break;
      case 'lastyear':
        _dateFrom = (y-1) + '-01-01'; _dateTo = (y-1) + '-12-31'; break;
    }
    _persistDates();
  }

  function _persistDates() {
    localStorage.setItem(_DATE_FROM_KEY, _dateFrom);
    localStorage.setItem(_DATE_TO_KEY,   _dateTo);
  }

  // ── Events ───────────────────────────────────────────────────

  function _bindEvents() {
    var backBtn = document.getElementById('fov-back');
    if (backBtn) backBtn.addEventListener('click', function () { App.showList(); });

    document.querySelectorAll('.fov-mode-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (this.dataset.mode === _mode) return;
        _mode = this.dataset.mode;
        App.showFinanceOverview(_mode);
      });
    });

    // Date inputs — live filter on change
    var fromInput = document.getElementById('fov-date-from');
    var toInput   = document.getElementById('fov-date-to');
    if (fromInput) {
      fromInput.addEventListener('change', function () {
        _dateFrom = this.value;
        _persistDates();
        _render();
      });
    }
    if (toInput) {
      toInput.addEventListener('change', function () {
        _dateTo = this.value;
        _persistDates();
        _render();
      });
    }

    // Preset buttons
    document.querySelectorAll('.fov-preset-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        _applyPreset(this.dataset.preset);
        _render();
      });
    });

    document.querySelectorAll('.fov-t-link').forEach(function (row) {
      row.addEventListener('click', function () {
        App.showView(this.dataset.id);
      });
    });
  }

  // ── Helpers ──────────────────────────────────────────────────

  function _snap(label, val, sub, cls) {
    return '<div class="fov-snap' + (cls ? ' ' + cls : '') + '">' +
      '<div class="fov-snap-lbl">' + label + '</div>' +
      '<div class="fov-snap-val">' + val + '</div>' +
      (sub ? '<div class="fov-snap-sub">' + sub + '</div>' : '') +
    '</div>';
  }

  function _miniStat(label, val, sub) {
    return '<div style="background:var(--rule-light);border:1px solid var(--rule);border-radius:3px;padding:8px 10px;">' +
      '<div style="font-family:var(--font-mono);font-size:8px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-muted);margin-bottom:4px;">' + label + '</div>' +
      '<div style="font-family:var(--font-mono);font-size:13px;font-weight:700;color:var(--ink);">' + val + '</div>' +
      '<div style="font-family:var(--font-mono);font-size:8px;color:var(--ink-faint);margin-top:2px;">' + sub + '</div>' +
    '</div>';
  }

  function _esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ── Public API ───────────────────────────────────────────────

  return { onShow: onShow, onHide: onHide };

}());
