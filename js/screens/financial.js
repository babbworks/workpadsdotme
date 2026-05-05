/* ============================================================
   FinancialScreen — financial summary + records view
   Modes: summary (basic / advanced) | records (all sub-records)
   ============================================================ */

var FinancialScreen = (function () {
  'use strict';

  var _record   = null;
  var _expenses = [];
  var _payments = [];
  var _tab      = 'summary';   // 'summary' | 'records'
  var _mode     = 'basic';     // 'basic' | 'advanced'
  var _stylesAdded = false;

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
      '.fin-wrap { max-width:720px; margin:0 auto; padding:32px 32px 80px; }',

      /* Header */
      '.fin-header { margin-bottom:24px; }',
      '.fin-back { font-family:var(--font-mono); font-size:11px; color:var(--stamp);',
      '  background:none; border:none; cursor:pointer; padding:0; margin-bottom:14px;',
      '  display:inline-block; text-decoration:underline; text-decoration-style:dotted; }',
      '.fin-title { font-family:var(--font-display); font-size:clamp(22px,3.5vw,34px);',
      '  font-weight:700; line-height:1.1; color:var(--ink); margin-bottom:6px; }',
      '.fin-subtitle { font-family:var(--font-mono); font-size:10px; color:var(--ink-muted);',
      '  letter-spacing:.06em; }',

      /* Tab bar */
      '.fin-tabs { display:flex; gap:0; margin-bottom:20px; border-bottom:1.5px solid var(--rule); }',
      '.fin-tab { font-family:var(--font-mono); font-size:9px; font-weight:700;',
      '  letter-spacing:.16em; text-transform:uppercase; background:none; border:none;',
      '  cursor:pointer; padding:8px 14px 7px; color:var(--ink-faint);',
      '  border-bottom:2px solid transparent; margin-bottom:-1.5px; transition:color .12s; }',
      '.fin-tab.active { color:var(--ink); border-bottom-color:var(--stamp); }',

      /* Mode toggle (basic / advanced) */
      '.fin-mode-bar { display:flex; align-items:center; gap:8px; margin-bottom:20px; }',
      '.fin-mode-btn { font-family:var(--font-mono); font-size:9px; font-weight:700;',
      '  letter-spacing:.12em; text-transform:uppercase; background:none;',
      '  border:1px solid var(--rule); border-radius:3px; cursor:pointer;',
      '  padding:4px 10px; color:var(--ink-muted); transition:all .12s; }',
      '.fin-mode-btn.active { background:var(--stamp); color:#fff; border-color:var(--stamp); }',

      /* Snapshot cards row */
      '.fin-snapshot { display:grid; grid-template-columns:repeat(auto-fill,minmax(140px,1fr));',
      '  gap:10px; margin-bottom:24px; }',
      '.fin-snap-card { background:var(--paper); border:1px solid var(--rule);',
      '  border-radius:4px; padding:12px 14px; }',
      '.fin-snap-label { font-family:var(--font-mono); font-size:8.5px; font-weight:700;',
      '  letter-spacing:.14em; text-transform:uppercase; color:var(--ink-muted); margin-bottom:6px; }',
      '.fin-snap-value { font-family:var(--font-display); font-size:22px; font-weight:700;',
      '  color:var(--ink); line-height:1; }',
      '.fin-snap-sub { font-family:var(--font-mono); font-size:9px; color:var(--ink-faint);',
      '  margin-top:3px; }',
      '.fin-snap-card.positive .fin-snap-value { color:#2a6e2a; }',
      '.fin-snap-card.negative .fin-snap-value { color:#b84040; }',

      /* Section blocks */
      '.fin-section { margin-bottom:20px; }',
      '.fin-section-title { font-family:var(--font-mono); font-size:9px; font-weight:700;',
      '  letter-spacing:.16em; text-transform:uppercase; color:var(--ink-muted);',
      '  margin-bottom:10px; padding-bottom:6px; border-bottom:1px solid var(--rule-light); }',

      /* Category breakdown table */
      '.fin-table { width:100%; border-collapse:collapse; font-family:var(--font-mono);',
      '  font-size:11px; }',
      '.fin-table th { text-align:left; font-size:8.5px; letter-spacing:.12em;',
      '  text-transform:uppercase; color:var(--ink-muted); padding:4px 0 6px;',
      '  border-bottom:1px solid var(--rule); font-weight:700; }',
      '.fin-table th:last-child,.fin-table td:last-child { text-align:right; }',
      '.fin-table td { padding:6px 0 5px; border-bottom:1px solid var(--rule-light);',
      '  color:var(--ink-mid); vertical-align:baseline; }',
      '.fin-table tr:last-child td { border-bottom:none; }',
      '.fin-table .fin-t-main { color:var(--ink); font-weight:500; }',
      '.fin-table .fin-t-pct { color:var(--ink-faint); font-size:9.5px; padding-left:8px; }',
      '.fin-table .fin-t-total td { font-weight:700; color:var(--ink);',
      '  border-top:1.5px solid var(--rule); border-bottom:none; padding-top:8px; }',

      /* Progress bar */
      '.fin-progress-wrap { background:var(--rule-light); border-radius:3px;',
      '  height:6px; margin:6px 0 10px; overflow:hidden; }',
      '.fin-progress-fill { height:100%; border-radius:3px;',
      '  background:var(--stamp); transition:width .3s; }',

      /* Margin meter (advanced) */
      '.fin-margin-row { display:flex; justify-content:space-between; align-items:baseline;',
      '  padding:5px 0; font-family:var(--font-mono); font-size:11px;',
      '  border-bottom:1px solid var(--rule-light); }',
      '.fin-margin-row:last-child { border-bottom:none; }',
      '.fin-margin-label { color:var(--ink-muted); }',
      '.fin-margin-value { font-weight:700; color:var(--ink); }',
      '.fin-margin-pct { font-size:9px; color:var(--ink-faint); margin-left:6px;',
      '  font-weight:400; }',
      '.fin-positive { color:#2a6e2a !important; }',
      '.fin-negative { color:#b84040 !important; }',

      /* Records list (records tab) */
      '.fin-rec-group { margin-bottom:20px; }',
      '.fin-rec-group-title {',
      '  font-family:var(--font-mono); font-size:8.5px; font-weight:700;',
      '  letter-spacing:.16em; text-transform:uppercase; color:var(--ink-muted);',
      '  padding:6px 12px; background:var(--rule-light); border-radius:3px 3px 0 0;',
      '  border:1px solid var(--rule); border-bottom:none; }',
      '.fin-rec-list { border:1px solid var(--rule); border-radius:0 0 3px 3px;',
      '  overflow:hidden; }',
      '.fin-rec-item { display:flex; align-items:baseline; gap:10px;',
      '  padding:10px 14px; border-bottom:1px solid var(--rule-light);',
      '  font-family:var(--font-mono); font-size:11px; cursor:pointer;',
      '  transition:background .1s; }',
      '.fin-rec-item:last-child { border-bottom:none; }',
      '.fin-rec-item:hover { background:var(--rule-light); }',
      '.fin-rec-label { flex:1; color:var(--ink); }',
      '.fin-rec-meta { font-size:9px; color:var(--ink-faint); }',
      '.fin-rec-amount { color:var(--ink); font-weight:700; flex-shrink:0; }',
      '.fin-rec-amount.cogs { color:var(--ink-faint); font-weight:400; }',
      '.fin-rec-empty { font-family:var(--font-mono); font-size:10px;',
      '  color:var(--ink-faint); padding:12px 14px; border:1px solid var(--rule);',
      '  border-radius:3px; }',
    ].join('\n');
    document.head.appendChild(s);
  }

  // ── Lifecycle ────────────────────────────────────────────────

  function onShow(params) {
    _addStyles();
    if (!params || !params.id) { App.showList(); return; }
    _tab  = (params.tab === 'records') ? 'records' : 'summary';
    _mode = 'basic';

    RecordService.get(params.id).then(function (r) {
      if (!r) { App.showList(); return; }
      _record = r;
      RecordService.list().then(function (all) {
        _expenses = all.filter(function (rec) {
          return rec.parentId === r.id && rec.recordType === 'expense';
        });
        _payments = all.filter(function (rec) {
          return rec.parentId === r.id && rec.recordType === 'payment';
        });
        _render();
      });
    });
  }

  function onHide() { _record = null; _expenses = []; _payments = []; _tab = 'summary'; _mode = 'basic'; }

  // ── Render ───────────────────────────────────────────────────

  function _render() {
    var el = document.getElementById('screen-financial');
    var r  = _record;
    var sym = r.currency === 'EUR' ? '\u20ac' : r.currency === 'USD' ? '$' : '\u00a3';
    var fmt = function (n) { return sym + n.toFixed(2); };

    var billedExp = _expenses.filter(function (e) { return e.expense_billing !== 'cogs' && e.amount; });
    var cogsExp   = _expenses.filter(function (e) { return e.expense_billing === 'cogs' && e.amount; });
    var pays      = _payments;

    var html = '<div class="fin-wrap">';

    // Header
    html += '<div class="fin-header">' +
      '<button class="fin-back" id="fin-back">\u2190 Back to record</button>' +
      '<div class="fin-title">' + _esc(r.job || 'Untitled') + '</div>' +
      '<div class="fin-subtitle">Financial summary' +
        (r.customer ? ' \u00b7 ' + _esc(r.customer) : '') +
        (r.date ? ' \u00b7 ' + _esc(r.date) : '') +
      '</div>' +
    '</div>';

    // Tabs
    html += '<div class="fin-tabs">' +
      '<button class="fin-tab' + (_tab === 'summary' ? ' active' : '') + '" data-tab="summary">Summary</button>' +
      '<button class="fin-tab' + (_tab === 'records' ? ' active' : '') + '" data-tab="records">All Records</button>' +
    '</div>';

    if (_tab === 'summary') {
      html += _renderSummaryTab(r, billedExp, cogsExp, pays, sym, fmt);
    } else {
      html += _renderRecordsTab(r, billedExp, cogsExp, pays, sym, fmt);
    }

    html += '</div>';
    el.innerHTML = html;
    _bindEvents();
  }

  // ── Summary tab ──────────────────────────────────────────────

  function _renderSummaryTab(r, billedExp, cogsExp, pays, sym, fmt) {
    var html = '';

    // Mode toggle
    html += '<div class="fin-mode-bar">' +
      '<button class="fin-mode-btn' + (_mode === 'basic' ? ' active' : '') + '" data-mode="basic">Basic</button>' +
      '<button class="fin-mode-btn' + (_mode === 'advanced' ? ' active' : '') + '" data-mode="advanced">Advanced</button>' +
    '</div>';

    var customerPrice = parseFloat(r.amount) || 0;
    var subtotal      = billedExp.reduce(function (s, e) { return s + (parseFloat(e.amount) || 0); }, 0);
    var totalCogs     = cogsExp.reduce(function (s, e) { return s + (parseFloat(e.amount) || 0); }, 0);
    var totalPaid     = pays.reduce(function (s, p) { return s + (parseFloat(p.amount) || 0); }, 0);
    var outstanding   = customerPrice - totalPaid;
    var grossMargin   = customerPrice - subtotal;

    // ── COGS split calculation (mirrors WorkpadsPanel logic)
    var cogsOverrun = 0, cogsWithinBudget = 0, cogsUnlinked = 0;
    cogsExp.forEach(function (c) {
      var cAmt = parseFloat(c.amount) || 0;
      if (c.linkedExpenseId) {
        var linked = null;
        for (var i = 0; i < billedExp.length; i++) {
          if (billedExp[i].id === c.linkedExpenseId) { linked = billedExp[i]; break; }
        }
        var expAmt = linked ? (parseFloat(linked.amount) || 0) : 0;
        cogsOverrun      += Math.max(0, cAmt - expAmt);
        cogsWithinBudget += Math.min(cAmt, expAmt);
      } else if (c.actionIdx != null && c.actionIdx !== '') {
        var actionRef = billedExp.reduce(function (s, e) {
          return String(e.actionIdx) === String(c.actionIdx) ? s + (parseFloat(e.amount) || 0) : s;
        }, 0);
        if (actionRef > 0) {
          cogsOverrun      += Math.max(0, cAmt - actionRef);
          cogsWithinBudget += Math.min(cAmt, actionRef);
        } else {
          cogsUnlinked += cAmt;
        }
      } else {
        cogsUnlinked += cAmt;
      }
    });
    var effectiveCost = subtotal + cogsUnlinked + cogsOverrun;
    var netMargin = customerPrice - effectiveCost;

    // ── Snapshot cards
    html += '<div class="fin-snapshot">';
    if (customerPrice > 0) {
      html += _snapCard('Customer price', fmt(customerPrice), null, '');
    }
    if (subtotal > 0) {
      html += _snapCard('Expenses', fmt(subtotal), null, '');
    }
    if (totalCogs > 0) {
      html += _snapCard('COGS', fmt(totalCogs), null, '');
    }
    if (totalPaid > 0 || customerPrice > 0) {
      var paidPct = customerPrice > 0 ? Math.round(totalPaid / customerPrice * 100) : 100;
      var paidClass = Math.abs(outstanding) < 0.001 ? 'positive' : '';
      html += _snapCard('Received', fmt(totalPaid), paidPct + '%\u00a0paid', paidClass);
    }
    if (customerPrice > 0 && subtotal > 0) {
      html += _snapCard('Gross margin', fmt(grossMargin), null, grossMargin >= 0 ? 'positive' : 'negative');
    }
    html += '</div>';

    // ── Payment progress bar
    if (customerPrice > 0) {
      var pct = Math.min(100, customerPrice > 0 ? (totalPaid / customerPrice * 100) : 0);
      html += '<div class="fin-section">';
      html += '<div style="display:flex;justify-content:space-between;font-family:var(--font-mono);font-size:9px;color:var(--ink-muted);margin-bottom:4px;">' +
        '<span>Payment progress</span>' +
        '<span>' + Math.round(pct) + '%</span>' +
      '</div>';
      html += '<div class="fin-progress-wrap"><div class="fin-progress-fill" style="width:' + pct.toFixed(1) + '%;"></div></div>';
      if (outstanding > 0.001) {
        html += '<div style="font-family:var(--font-mono);font-size:9px;color:var(--ink-muted);">' +
          fmt(outstanding) + ' outstanding</div>';
      } else if (outstanding < -0.001) {
        html += '<div style="font-family:var(--font-mono);font-size:9px;color:#b84040;">Overpaid by ' + fmt(Math.abs(outstanding)) + '</div>';
      }
      html += '</div>';
    }

    // ── Expense categories breakdown
    if (billedExp.length) {
      // Group by charge_type
      var catMap = {};
      billedExp.forEach(function (e) {
        var key = e.charge_type != null ? String(e.charge_type) : '';
        var label = CHARGE_LABELS[key] || 'Other';
        if (!catMap[label]) catMap[label] = 0;
        catMap[label] += parseFloat(e.amount) || 0;
      });
      var cats = Object.keys(catMap).map(function (k) { return { label: k, amount: catMap[k] }; });
      cats.sort(function (a, b) { return b.amount - a.amount; });

      html += '<div class="fin-section">';
      html += '<div class="fin-section-title">Expense breakdown by category</div>';
      html += '<table class="fin-table"><thead><tr>' +
        '<th>Category</th>' +
        '<th>Amount</th>' +
        (_mode === 'advanced' ? '<th>% of expenses</th><th>% of price</th>' : '') +
      '</tr></thead><tbody>';
      cats.forEach(function (cat) {
        var pctOfExp = subtotal > 0 ? (cat.amount / subtotal * 100) : 0;
        var pctOfPrice = customerPrice > 0 ? (cat.amount / customerPrice * 100) : 0;
        html += '<tr>' +
          '<td class="fin-t-main">' + _esc(cat.label) + '</td>' +
          '<td>' + fmt(cat.amount) + '</td>' +
          (_mode === 'advanced'
            ? '<td class="fin-t-pct">' + pctOfExp.toFixed(1) + '%</td>' +
              '<td class="fin-t-pct">' + pctOfPrice.toFixed(1) + '%</td>'
            : '') +
        '</tr>';
      });
      if (_mode === 'advanced') {
        html += '<tr class="fin-t-total"><td>Total</td><td>' + fmt(subtotal) + '</td><td>100%</td><td class="fin-t-pct">' +
          (customerPrice > 0 ? (subtotal / customerPrice * 100).toFixed(1) + '%' : '—') + '</td></tr>';
      }
      html += '</tbody></table></div>';
    }

    // ── COGS breakdown
    if (cogsExp.length) {
      // Group by charge_type
      var cogsCatMap = {};
      cogsExp.forEach(function (e) {
        var key = e.charge_type != null ? String(e.charge_type) : '';
        var label = CHARGE_LABELS[key] || 'Other';
        if (!cogsCatMap[label]) cogsCatMap[label] = 0;
        cogsCatMap[label] += parseFloat(e.amount) || 0;
      });
      var cogsCats = Object.keys(cogsCatMap).map(function (k) { return { label: k, amount: cogsCatMap[k] }; });
      cogsCats.sort(function (a, b) { return b.amount - a.amount; });

      html += '<div class="fin-section">';
      html += '<div class="fin-section-title">COGS breakdown</div>';

      if (_mode === 'advanced') {
        // Self-funded vs overrun split
        html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px;">';
        html += _miniStat('Self-funded', fmt(cogsWithinBudget), 'within billed expenses');
        html += _miniStat('Overrun', fmt(cogsOverrun), 'above billed amount');
        html += _miniStat('Unlinked', fmt(cogsUnlinked), 'no reference');
        html += '</div>';
      }

      html += '<table class="fin-table"><thead><tr>' +
        '<th>Type</th><th>Amount</th>' +
        (_mode === 'advanced' ? '<th>% of COGS</th><th>% of price</th>' : '') +
      '</tr></thead><tbody>';
      cogsCats.forEach(function (cat) {
        var pctOfCogs  = totalCogs > 0 ? (cat.amount / totalCogs * 100) : 0;
        var pctOfPrice = customerPrice > 0 ? (cat.amount / customerPrice * 100) : 0;
        html += '<tr>' +
          '<td class="fin-t-main">' + _esc(cat.label) + '</td>' +
          '<td>' + fmt(cat.amount) + '</td>' +
          (_mode === 'advanced'
            ? '<td class="fin-t-pct">' + pctOfCogs.toFixed(1) + '%</td>' +
              '<td class="fin-t-pct">' + pctOfPrice.toFixed(1) + '%</td>'
            : '') +
        '</tr>';
      });
      html += '</tbody></table></div>';
    }

    // ── Payments log
    if (pays.length) {
      html += '<div class="fin-section">';
      html += '<div class="fin-section-title">Payments</div>';
      html += '<table class="fin-table"><thead><tr><th>Date / note</th><th>Amount</th></tr></thead><tbody>';
      pays.forEach(function (p) {
        var label = p.date
          ? _esc(p.date) + (p.job ? ' \xb7 ' + _esc(p.job) : '')
          : _esc(p.job || 'Payment');
        html += '<tr><td class="fin-t-main">' + label + '</td><td>' + fmt(parseFloat(p.amount) || 0) + '</td></tr>';
      });
      html += '</tbody></table></div>';
    }

    // ── Advanced: full profit / margin analysis
    if (_mode === 'advanced' && customerPrice > 0) {
      html += '<div class="fin-section">';
      html += '<div class="fin-section-title">Profit \u0026 margin analysis</div>';

      var rows = [];
      if (subtotal > 0) {
        rows.push({ label: 'Revenue (customer price)', value: customerPrice, pct: null, cls: '' });
        rows.push({ label: 'Total expenses (billed)', value: -subtotal, pct: subtotal / customerPrice * 100, cls: '' });
        rows.push({ label: 'Gross margin', value: grossMargin, pct: grossMargin / customerPrice * 100, cls: grossMargin >= 0 ? 'fin-positive' : 'fin-negative' });
      }
      if (totalCogs > 0) {
        var effectiveCogsCost = cogsUnlinked + cogsOverrun;
        rows.push({ label: 'COGS net cost (overrun + unlinked)', value: -effectiveCogsCost, pct: effectiveCogsCost / customerPrice * 100, cls: '' });
        rows.push({ label: 'Net margin (after COGS)', value: netMargin, pct: netMargin / customerPrice * 100, cls: netMargin >= 0 ? 'fin-positive' : 'fin-negative' });
      }
      if (totalPaid > 0) {
        rows.push({ label: 'Received', value: totalPaid, pct: totalPaid / customerPrice * 100, cls: '' });
        rows.push({ label: 'Outstanding', value: outstanding, pct: outstanding / customerPrice * 100, cls: outstanding > 0.001 ? '' : 'fin-positive' });
      }

      rows.forEach(function (row) {
        var sign = row.value >= 0 ? '' : '\u2212';
        var absVal = Math.abs(row.value);
        var pctStr = row.pct != null ? '<span class="fin-margin-pct">' + Math.abs(row.pct).toFixed(1) + '%</span>' : '';
        html += '<div class="fin-margin-row">' +
          '<span class="fin-margin-label">' + row.label + '</span>' +
          '<span class="fin-margin-value ' + row.cls + '">' + sign + fmt(absVal) + pctStr + '</span>' +
        '</div>';
      });

      // Expense ratio
      if (subtotal > 0) {
        var expRatio = subtotal / customerPrice;
        html += '<div class="fin-margin-row">' +
          '<span class="fin-margin-label" style="font-style:italic;">Expense ratio</span>' +
          '<span class="fin-margin-value" style="font-weight:400;">' + (expRatio * 100).toFixed(1) + '% of revenue</span>' +
        '</div>';
      }

      html += '</div>';

      // Per-action item breakdown (if actions exist and expenses are linked)
      if (_record.actions && _record.actions.length && billedExp.some(function (e) { return e.actionIdx != null; })) {
        html += '<div class="fin-section">';
        html += '<div class="fin-section-title">Per action item</div>';
        html += '<table class="fin-table"><thead><tr><th>Action</th><th>Expenses</th><th>COGS</th><th>% of total</th></tr></thead><tbody>';
        _record.actions.forEach(function (a, idx) {
          var actExp  = billedExp.filter(function (e) { return String(e.actionIdx) === String(idx); });
          var actCogs = cogsExp.filter(function (c) { return String(c.actionIdx) === String(idx); });
          if (!actExp.length && !actCogs.length) return;
          var actExpAmt  = actExp.reduce(function (s, e) { return s + (parseFloat(e.amount) || 0); }, 0);
          var actCogsAmt = actCogs.reduce(function (s, c) { return s + (parseFloat(c.amount) || 0); }, 0);
          var pctOfTotal = subtotal > 0 ? (actExpAmt / subtotal * 100).toFixed(1) + '%' : '—';
          html += '<tr>' +
            '<td class="fin-t-main">' + _esc(a.title || 'Item ' + (idx + 1)) + '</td>' +
            '<td>' + (actExpAmt > 0 ? fmt(actExpAmt) : '—') + '</td>' +
            '<td>' + (actCogsAmt > 0 ? fmt(actCogsAmt) : '—') + '</td>' +
            '<td class="fin-t-pct">' + pctOfTotal + '</td>' +
          '</tr>';
        });
        html += '</tbody></table></div>';
      }
    }

    return html;
  }

  // ── Records tab ──────────────────────────────────────────────

  function _renderRecordsTab(r, billedExp, cogsExp, pays, sym, fmt) {
    var html = '';

    var groups = [
      { title: 'Expenses', items: billedExp, type: 'expense' },
      { title: 'COGS', items: cogsExp, type: 'cogs' },
      { title: 'Payments', items: pays, type: 'payment' },
    ];

    groups.forEach(function (g) {
      html += '<div class="fin-rec-group">';
      html += '<div class="fin-rec-group-title">' + _esc(g.title) +
        (g.items.length ? ' <span style="font-weight:400;opacity:0.7;">(' + g.items.length + ')</span>' : '') +
      '</div>';
      if (!g.items.length) {
        html += '<div class="fin-rec-empty">No ' + _esc(g.title.toLowerCase()) + ' recorded.</div>';
        html += '</div>';
        return;
      }
      html += '<div class="fin-rec-list">';
      g.items.forEach(function (rec) {
        var label = rec.job || (g.type === 'payment' ? 'Payment' : g.type === 'cogs' ? 'COGS' : 'Expense');
        if (g.type === 'cogs' && rec.charge_type != null && CHARGE_LABELS[String(rec.charge_type)]) {
          label = CHARGE_LABELS[String(rec.charge_type)];
        }
        var meta = rec.date || '';
        if (g.type === 'expense' && rec.actionIdx != null && r.actions && r.actions[parseInt(rec.actionIdx, 10)]) {
          meta = (meta ? meta + ' \u00b7 ' : '') + r.actions[parseInt(rec.actionIdx, 10)].title;
        }
        var amtClass = g.type === 'cogs' ? ' cogs' : '';
        html += '<div class="fin-rec-item" data-id="' + _esc(rec.id) + '">' +
          '<span class="fin-rec-label">' + _esc(label) + '</span>' +
          (meta ? '<span class="fin-rec-meta">' + _esc(meta) + '</span>' : '') +
          '<span class="fin-rec-amount' + amtClass + '">' + fmt(parseFloat(rec.amount) || 0) + '</span>' +
        '</div>';
      });
      html += '</div></div>';
    });

    return html;
  }

  // ── Events ───────────────────────────────────────────────────

  function _bindEvents() {
    var id = _record.id;

    // Back button
    var backBtn = document.getElementById('fin-back');
    if (backBtn) backBtn.addEventListener('click', function () { App.showView(id); });

    // Tab toggle
    document.querySelectorAll('.fin-tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        _tab = this.dataset.tab;
        _render();
      });
    });

    // Mode toggle
    document.querySelectorAll('.fin-mode-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (this.dataset.mode === _mode) return;
        _mode = this.dataset.mode;
        _render();
      });
    });

    // Records list navigation
    document.querySelectorAll('.fin-rec-item').forEach(function (item) {
      item.addEventListener('click', function () {
        App.showView(this.dataset.id);
      });
    });
  }

  // ── Helpers ──────────────────────────────────────────────────

  function _snapCard(label, value, sub, cls) {
    return '<div class="fin-snap-card' + (cls ? ' ' + cls : '') + '">' +
      '<div class="fin-snap-label">' + label + '</div>' +
      '<div class="fin-snap-value">' + value + '</div>' +
      (sub ? '<div class="fin-snap-sub">' + sub + '</div>' : '') +
    '</div>';
  }

  function _miniStat(label, value, sub) {
    return '<div style="background:var(--rule-light);border:1px solid var(--rule);border-radius:3px;padding:8px 10px;">' +
      '<div style="font-family:var(--font-mono);font-size:8px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-muted);margin-bottom:4px;">' + label + '</div>' +
      '<div style="font-family:var(--font-mono);font-size:14px;font-weight:700;color:var(--ink);">' + value + '</div>' +
      '<div style="font-family:var(--font-mono);font-size:8px;color:var(--ink-faint);margin-top:2px;">' + sub + '</div>' +
    '</div>';
  }

  function _esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ── Public API ───────────────────────────────────────────────

  return { onShow: onShow, onHide: onHide };

}());
