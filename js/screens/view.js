/* ============================================================
   ViewScreen — read-only record display with inline actions
   ============================================================ */

var ViewScreen = (function () {
  'use strict';

  var _record        = null;
  var _approval      = null;
  var _expenses      = [];
  var _payments      = [];
  var _finTab        = 'expenses';
  var _stylesAdded   = false;
  var _actionsFilter = '';
  var _isArchived    = false;

  // ── Styles ───────────────────────────────────────────────────

  function _addStyles() {
    if (_stylesAdded) return;
    _stylesAdded = true;
    var s = document.createElement('style');
    s.textContent = [
      '.view-wrap { max-width:680px; margin:0 auto; padding:36px 32px 80px; }',

      '.view-doc-header {',
      '  margin-bottom:28px;',
      '}',

      '.view-stamp {',
      '  display:inline-block;',
      '  font-family:var(--font-mono); font-size:10px; font-weight:700;',
      '  letter-spacing:.22em; text-transform:uppercase;',
      '  color:var(--stamp); border:1.5px solid var(--stamp-border);',
      '  padding:4px 9px; border-radius:3px;',
      '  margin-bottom:14px;',
      '}',

      '.view-job {',
      '  font-family:var(--font-display); font-size:clamp(26px,4vw,40px);',
      '  font-weight:700; line-height:1.1; letter-spacing:-.02em;',
      '  color:var(--ink); margin-bottom:14px;',
      '}',

      '.view-meta-row {',
      '  display:flex; flex-wrap:wrap; align-items:center; gap:0;',
      '  margin-bottom:0;',
      '}',
      '.view-meta-item {',
      '  display:flex; align-items:baseline; gap:5px;',
      '}',
      '.view-meta-label {',
      '  font-family:var(--font-mono); font-size:9px; font-weight:700;',
      '  letter-spacing:.16em; text-transform:uppercase; color:var(--ink-muted);',
      '}',
      '.view-meta-value {',
      '  font-family:var(--font-mono); font-size:11.5px; color:var(--ink-mid);',
      '}',
      '.view-meta-sep {',
      '  width:1px; height:12px; background:var(--rule);',
      '  margin:0 12px; display:inline-block; vertical-align:middle;',
      '}',

      '.view-action-bar {',
      '  display:flex; gap:8px; flex-wrap:wrap;',
      '  margin-bottom:28px;',
      '}',

      '.view-section { margin-bottom:0; }',

      /* Actions list inside card */
      '.view-actions-list { list-style:none; }',
      '.view-action-item {',
      '  display:flex; gap:16px; align-items:flex-start;',
      '  padding:14px 0; border-bottom:1px solid var(--rule-light);',
      '}',
      '.view-action-item:first-child { padding-top:0; }',
      '.view-action-item:last-child  { border-bottom:none; padding-bottom:0; }',
      '.view-action-num {',
      '  font-family:var(--font-mono); font-size:11px; font-weight:700;',
      '  color:var(--stamp); min-width:22px; padding-top:2px; flex-shrink:0;',
      '}',
      '.view-action-title {',
      '  font-family:var(--font-body); font-size:15px; font-weight:700;',
      '  color:var(--ink); line-height:1.3;',
      '}',
      '.view-action-notes {',
      '  font-family:var(--font-body); font-size:13.5px; font-style:italic;',
      '  color:var(--ink-mid); margin-top:3px; line-height:1.5;',
      '}',
      '.view-action-body { flex:1; min-width:0; }',
      '.view-action-exp-btn {',
      '  flex-shrink:0; align-self:center;',
      '  font-family:var(--font-mono); font-size:10px; font-weight:700;',
      '  color:var(--stamp); background:none; border:1px solid var(--stamp-border);',
      '  border-radius:4px; padding:3px 8px; cursor:pointer; white-space:nowrap;',
      '  opacity:0.6; transition:opacity 0.15s;',
      '}',
      '.view-action-exp-btn:hover { opacity:1; }',

      /* Prose (story / details) — markdown rendered */
      '.view-prose {',
      '  font-family:var(--font-body); font-size:15.5px;',
      '  color:var(--ink); line-height:1.75;',
      '}',
      '.view-prose p { margin-bottom:.65em; }',
      '.view-prose p:last-child { margin-bottom:0; }',
      '.view-prose h1,.view-prose h2,.view-prose h3 {',
      '  font-weight:700; margin-bottom:.35em; margin-top:.6em; line-height:1.25;',
      '}',
      '.view-prose h1 { font-size:1.25em; }',
      '.view-prose h2 { font-size:1.1em; }',
      '.view-prose h3 { font-size:1em; letter-spacing:.02em; }',
      '.view-prose ul,.view-prose ol { padding-left:1.4em; margin-bottom:.6em; }',
      '.view-prose li { margin-bottom:.2em; }',
      '.view-prose code {',
      '  font-family:var(--font-mono); font-size:.85em;',
      '  background:var(--rule-light); border-radius:2px; padding:1px 5px;',
      '}',
      '.view-prose strong { font-weight:700; }',
      '.view-prose em { font-style:italic; }',

      /* Action filter toolbar */
      '.view-actions-toolbar {',
      '  display:flex; gap:8px; margin-bottom:14px;',
      '}',
      '.view-actions-search {',
      '  flex:1; font-family:var(--font-mono); font-size:11px;',
      '  color:var(--ink); background:var(--paper);',
      '  border:1px solid var(--rule); border-radius:3px;',
      '  padding:5px 9px; transition:border-color .13s;',
      '}',
      '.view-actions-search:focus { outline:none; border-color:var(--stamp-border); }',
      '.view-actions-search::placeholder { color:var(--ink-faint); }',

      /* Private badge on notes section */
      '.view-private-badge {',
      '  font-family:var(--font-mono); font-size:8px; font-weight:700;',
      '  letter-spacing:.12em; text-transform:uppercase;',
      '  color:var(--ink-muted); border:1px solid var(--rule);',
      '  border-radius:2px; padding:1px 5px; margin-left:8px;',
      '  vertical-align:middle;',
      '}',

      /* Financial card (separate from main card) */
      '.view-financial-card {',
      '  margin-top:12px;',
      '}',

      /* Details grid */
      '.view-details-grid {',
      '  display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:20px;',
      '}',
      '.view-detail-label {',
      '  font-family:var(--font-mono); font-size:9px; font-weight:700;',
      '  letter-spacing:.16em; text-transform:uppercase; color:var(--ink-muted); margin-bottom:5px;',
      '}',
      '.view-detail-value {',
      '  font-family:var(--font-mono); font-size:13px; color:var(--ink);',
      '}',

      /* Financial block */
      '.view-financial {',
      '  display:flex; flex-wrap:wrap; gap:20px;',
      '}',
      '.view-financial-amount {',
      '  font-family:var(--font-display); font-size:28px; font-weight:700;',
      '  color:var(--ink); line-height:1;',
      '}',
      '.view-financial-tax {',
      '  font-family:var(--font-mono); font-size:10px; color:var(--ink-muted);',
      '  margin-top:4px;',
      '}',
      '.view-financial-charge {',
      '  font-family:var(--font-mono); font-size:11px; color:var(--ink-muted);',
      '  padding:3px 7px; border:1px solid var(--rule); border-radius:2px;',
      '  display:inline-block; margin-bottom:4px;',
      '}',
      '.view-parts-flag {',
      '  font-family:var(--font-mono); font-size:10px; color:var(--ink-muted);',
      '  padding:2px 7px; border:1px solid var(--rule); border-radius:2px;',
      '  display:inline-block; margin-top:8px;',
      '}',

      /* Participants */
      '.view-participants { display:flex; flex-direction:column; gap:8px; }',
      '.view-participant {',
      '  display:flex; align-items:baseline; gap:10px;',
      '}',
      '.view-participant-name {',
      '  font-family:var(--font-mono); font-size:13px; color:var(--ink);',
      '}',
      '.view-participant-role {',
      '  font-family:var(--font-mono); font-size:9px; color:var(--ink-muted);',
      '  letter-spacing:.1em; text-transform:uppercase;',
      '}',
      '.view-participant-sender {',
      '  font-family:var(--font-mono); font-size:9px; color:var(--stamp);',
      '  letter-spacing:.06em;',
      '}',

      /* Approval notice */
      '.view-approval-notice {',
      '  display:flex; align-items:center; gap:8px;',
      '  margin-bottom:16px; padding:10px 14px;',
      '  background:#eef7ee; border:1.5px solid #6abf6a;',
      '  border-radius:3px;',
      '  font-family:var(--font-mono); font-size:11px; color:#2a6e2a;',
      '  font-weight:700; letter-spacing:.04em;',
      '}',
      '.view-approval-pending {',
      '  margin-bottom:16px; padding:8px 14px;',
      '  background:var(--stamp-light); border:1px solid var(--stamp-border);',
      '  border-radius:3px;',
      '  font-family:var(--font-mono); font-size:10px; color:var(--stamp);',
      '  letter-spacing:.06em;',
      '}',

      /* Expense tally */
      '.view-exp-action-header {',
      '  font-family:var(--font-mono); font-size:9px; font-weight:700; letter-spacing:0.06em;',
      '  color:var(--ink-faint); text-transform:uppercase; padding:8px 0 2px;',
      '}',
      '.view-exp-list { margin-bottom:12px; }',
      '.view-exp-row {',
      '  display:flex; justify-content:space-between; align-items:baseline;',
      '  padding:5px 0; border-bottom:1px solid var(--rule-light);',
      '  font-family:var(--font-mono); font-size:11px;',
      '}',
      '.view-exp-row:last-child { border-bottom:none; }',
      '.view-exp-label { color:var(--ink-mid); flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-right:12px; }',
      '.view-exp-label a { color:var(--stamp); text-decoration:none; }',
      '.view-exp-label a:hover { text-decoration:underline; }',
      '.view-exp-amount { color:var(--ink); font-weight:700; flex-shrink:0; }',
      '.view-exp-amount.cogs { color:var(--ink-faint); font-weight:400; }',
      '.view-tally-row {',
      '  display:flex; justify-content:space-between; align-items:baseline;',
      '  padding:8px 0;',
      '  font-family:var(--font-mono); font-size:11px;',
      '}',
      '.view-tally-label {',
      '  font-size:9px; font-weight:700; letter-spacing:.14em;',
      '  text-transform:uppercase; color:var(--ink-muted);',
      '}',
      '.view-tally-value { color:var(--ink); font-weight:700; }',
      '.view-tally-total {',
      '  border-top:1.5px solid var(--rule); margin-top:4px;',
      '}',
      '.view-tally-total .view-tally-value {',
      '  font-family:var(--font-display); font-size:24px; line-height:1;',
      '}',
      '.view-diff-row {',
      '  display:flex; justify-content:space-between; align-items:center;',
      '  padding:6px 0; margin-top:4px;',
      '  font-family:var(--font-mono); font-size:10px;',
      '  border-top:1px dashed var(--rule-light);',
      '}',
      '.view-diff-label { color:var(--ink-muted); }',
      '.view-diff-value { color:var(--ink-mid); font-weight:700; }',
      '.view-diff-link {',
      '  font-size:9px; font-weight:700; letter-spacing:.08em;',
      '  color:var(--stamp); background:none; border:none; cursor:pointer;',
      '  padding:0; margin-left:8px;',
      '  text-decoration:underline; text-decoration-style:dotted;',
      '}',

      /* Financial tab toggle */
      '.view-fin-tabs { display:flex; align-items:center; gap:0; }',
      '.view-fin-tab {',
      '  font-family:var(--font-mono); font-size:9px; font-weight:700;',
      '  letter-spacing:.16em; text-transform:uppercase;',
      '  background:none; border:none; cursor:pointer; padding:0;',
      '  color:var(--ink-faint); transition:color .12s;',
      '}',
      '.view-fin-tab.active { color:var(--ink-muted); }',
      '.view-fin-tab + .view-fin-tab {',
      '  margin-left:10px; padding-left:10px;',
      '  border-left:1px solid var(--rule);',
      '}',

      /* Cross-panel summary (non-active tab total + outstanding) */
      '.view-fin-cross {',
      '  display:flex; justify-content:space-between; align-items:baseline;',
      '  padding:5px 0;',
      '  font-family:var(--font-mono); font-size:10px;',
      '  border-top:1px dashed var(--rule-light); margin-top:6px;',
      '}',
      '.view-fin-cross + .view-fin-cross { border-top:none; margin-top:0; padding-top:2px; }',
      '.view-fin-cross-label { color:var(--ink-muted); }',
      '.view-fin-cross-value { color:var(--ink-mid); font-weight:700; }',
      '.view-fin-outstanding .view-fin-cross-label { font-weight:700; }',

      /* Payment rows (mirror of expense rows) */
      '.view-pay-row {',
      '  display:flex; justify-content:space-between; align-items:baseline;',
      '  padding:5px 0; border-bottom:1px solid var(--rule-light);',
      '  font-family:var(--font-mono); font-size:11px;',
      '}',
      '.view-pay-row:last-child { border-bottom:none; }',
      '.view-pay-label { color:var(--ink-mid); flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-right:12px; }',
      '.view-pay-label a { color:var(--stamp); text-decoration:none; }',
      '.view-pay-label a:hover { text-decoration:underline; }',
      '.view-pay-amount { color:var(--ink); font-weight:700; flex-shrink:0; }',
      '.view-pay-empty { font-family:var(--font-mono); font-size:10px; color:var(--ink-faint); padding:8px 0; }',

      /* Parent record link */
      '.view-parent-link {',
      '  font-family:var(--font-mono); font-size:11px; color:var(--stamp);',
      '  background:var(--stamp-light); border:1px solid var(--stamp-border);',
      '  border-radius:3px; padding:5px 10px; cursor:pointer;',
      '  transition:background .13s;',
      '}',
      '.view-parent-link:hover { background:var(--stamp-border); color:#fff; }',
    ].join('\n');
    document.head.appendChild(s);
  }

  // ── Lifecycle ────────────────────────────────────────────────

  function onShow(params) {
    _addStyles();
    if (!params || !params.id) { App.showList(); return; }
    _isArchived = !!(params && params.isArchived);

    var loader = _isArchived
      ? RecordService.getArchived(params.id)
      : RecordService.get(params.id);

    loader.then(function (r) {
      if (!r) {
        if (_isArchived) { App.showArchive(); return; }
        App.showList();
        return;
      }
      _record   = r;
      _approval = null;
      _expenses = [];

      var expenseLoad = RecordService.list().then(function (all) {
        _expenses = all.filter(function (rec) {
          return rec.parentId === r.id && rec.recordType === 'expense';
        });
        _payments = all.filter(function (rec) {
          return rec.parentId === r.id && rec.recordType === 'payment';
        });
      });

      var approvalLoad = (r.chainRef && r.record_type !== 'ack')
        ? RecordService.findByChainRef(r.chainRef).then(function (linked) {
            var acks = linked.filter(function (lr) {
              return lr.record_type === 'ack' && lr.id !== r.id;
            });
            _approval = acks.length ? acks[0] : null;
          })
        : Promise.resolve();

      Promise.all([expenseLoad, approvalLoad]).then(function () { _render(); });
    });
  }

  function onHide() { _record = null; _approval = null; _expenses = []; _payments = []; _finTab = 'expenses'; _actionsFilter = ''; _isArchived = false; }

  // ── Render ───────────────────────────────────────────────────

  function _render() {
    var el = document.getElementById('screen-view');
    var r  = _record;

    var html = '<div class="view-wrap">';

    // ── Document header
    var TYPE_STAMP = { quote: 'Quote', invoice: 'Invoice', ack: 'Approval' };
    html += '<div class="view-doc-header">';
    if (r.recordType === 'expense') {
      html += '<div class="view-stamp" style="background:var(--stamp-light);">Expense</div>';
    } else if (r.record_type && TYPE_STAMP[r.record_type]) {
      html += '<div class="view-stamp">' + TYPE_STAMP[r.record_type] + '</div>';
    } else if (r.receivedAt) {
      html += '<div class="view-stamp">Received</div>';
    }
    html += '<h1 class="view-job">' + _esc(r.job || 'Untitled') + '</h1>';
    html += _renderMetaRow(r);
    html += '</div>';

    // ── Approval status
    if (_approval) {
      html += '<div class="view-approval-notice">' +
        '\u2713 Approved by ' + _esc(_approval.worker || 'customer') +
        (_approval.date ? ' \xb7 ' + _esc(_approval.date) : '') +
      '</div>';
    } else if (r.record_type === 'quote') {
      html += '<div class="view-approval-pending">Awaiting customer approval</div>';
    }

    // ── Action bar
    html += '<div class="view-action-bar">';
    if (_isArchived) {
      html += '<button class="btn-primary" id="view-btn-restore">Restore</button>';
      html += '<button class="btn-ghost" id="view-btn-back-archive">\u2190 Archive</button>';
    } else {
      if (r.parentId) {
        html += '<button class="view-parent-link" id="view-btn-parent">\u2190 Parent record</button>';
      }
      if (r.recordType !== 'expense') {
        html += '<button class="btn-primary" id="view-btn-share">Share</button>';
      }
      html += '<button class="btn-ghost" id="view-btn-edit">Edit</button>';
      html += '<button class="btn-ghost" id="view-btn-archive">Archive</button>';
    }
    html += '</div>';

    // ── Body sections (main card)
    html += '<div class="card">';

    if (r.actions && r.actions.length) {
      html += _renderActionsSection(r.actions);
    }

    // Participants block (preferred) or legacy worker field
    var hasParticipants = r.participants && r.participants.length > 0;
    var timeFields  = ['start_time','end_time','meeting_time'];
    var otherFields = ['customer_phone'];
    if (r.location) otherFields.push('location');
    var detailFields = (hasParticipants ? [] : ['worker'])
      .concat(timeFields)
      .concat(otherFields);
    var hasDetail = hasParticipants || detailFields.some(function(k) { return !!r[k]; });
    if (hasDetail) {
      html += _renderCardSection('Details', _renderDetailSection(r, detailFields, hasParticipants));
    }

    if (r.story) {
      html += _renderCardSection('Story',
        '<div class="view-prose">' + _md(r.story) + '</div>');
    }

    if (r.details) {
      html += _renderCardSection(
        'Notes\u200b<span class="view-private-badge">Private</span>',
        '<div class="view-prose">' + _md(r.details) + '</div>',
        true
      );
    }

    if (r.receivedAt && r.recordType !== 'expense') {
      html += _renderCardSection('Source',
        '<p class="view-prose" style="font-style:italic;font-size:14px;">Received via shared link</p>');
    }

    html += '</div>'; // .card

    // ── Financial card (separate, below main card)
    if (r.amount || _expenses.length || _payments.length) {
      html += _renderFinancialCard(r);
    }

    html += '</div>'; // .view-wrap

    el.innerHTML = html;
    _bindEvents();
  }

  function _renderMetaRow(r) {
    var items = [];
    if (r.customer) items.push({ label: 'Customer', value: r.customer });
    if (r.date)     items.push({ label: 'Date',     value: r.date });
    if (r.location) items.push({ label: 'Location', value: r.location });
    if (!items.length) return '';

    var html = '<div class="view-meta-row">';
    items.forEach(function (item, i) {
      if (i > 0) html += '<span class="view-meta-sep"></span>';
      html += '<div class="view-meta-item">' +
                '<span class="view-meta-label">' + item.label + '</span>' +
                '<span class="view-meta-value">' + _esc(item.value) + '</span>' +
              '</div>';
    });
    return html + '</div>';
  }

  function _renderCardSection(label, bodyHtml, rawLabel) {
    var labelHtml = rawLabel ? label : _esc(label);
    return (
      '<div class="card-section">' +
        '<div class="section-label-row" style="margin-bottom:16px;">' +
          '<span class="section-label">' + labelHtml + '</span>' +
          '<span class="section-rule"></span>' +
        '</div>' +
        bodyHtml +
      '</div>'
    );
  }

  function _renderActionsSection(actions) {
    var toolbar = (
      '<div class="view-actions-toolbar">' +
        '<input class="view-actions-search" id="view-act-search" type="search" ' +
            'placeholder="Filter actions\u2026" autocomplete="off" value="' + _esc(_actionsFilter) + '">' +
      '</div>'
    );
    return (
      '<div class="card-section">' +
        '<div class="section-label-row" style="margin-bottom:16px;">' +
          '<span class="section-label">Actions</span>' +
          '<span class="section-rule"></span>' +
        '</div>' +
        toolbar +
        _renderActions(actions) +
      '</div>'
    );
  }

  function _renderActions(actions) {
    // Apply filter
    var filtered = actions.slice();
    if (_actionsFilter.trim()) {
      var q = _actionsFilter.toLowerCase();
      filtered = actions.filter(function(a) {
        return (a.title || '').toLowerCase().indexOf(q) !== -1 ||
               (a.notes || '').toLowerCase().indexOf(q) !== -1;
      });
    }

    if (!filtered.length) {
      return '<div style="font-family:var(--font-mono);font-size:11px;color:var(--ink-faint);padding:8px 0;">No matching actions</div>';
    }

    var html = '<ol class="view-actions-list">';
    filtered.forEach(function (a, i) {
      var num = (i < 9 ? '0' : '') + (i + 1);
      var origIdx = actions.indexOf(a);
      html += '<li class="view-action-item">' +
                '<span class="view-action-num">' + num + '</span>' +
                '<div class="view-action-body">' +
                  '<div class="view-action-title">' + _esc(a.title) + '</div>' +
                  (a.notes ? '<div class="view-action-notes">' + _esc(a.notes) + '</div>' : '') +
                '</div>' +
                '<button class="view-action-exp-btn" data-action-idx="' + origIdx + '" title="Add expense for this action">+ expense</button>' +
              '</li>';
    });
    return html + '</ol>';
  }

  function _renderDetailSection(r, keys, hasParticipants) {
    var html = '';
    if (hasParticipants) {
      html += _renderParticipants(r.participants);
      html += '<div style="margin-top:16px;"></div>';
    }
    html += _renderDetailGrid(r, keys);
    if (r.parts_flag) {
      html += '<div class="view-parts-flag">Parts / materials involved</div>';
    }
    return html;
  }

  function _renderParticipants(participants) {
    var ROLE_LABELS = {
      worker:     'Worker',
      supervisor: 'Job owner',
      sub:        'Subcontractor',
      colleague:  'Colleague',
      site:       'Site contact',
      referral:   'Referred by',
      witness:    'Witness',
    };
    var html = '<div class="view-participants">';
    participants.forEach(function (p, i) {
      var roleLabel = ROLE_LABELS[p.role] || (p.role || 'Worker');
      html += '<div class="view-participant">' +
        '<span class="view-participant-name">' + _esc(p.name || '\u2014') + '</span>' +
        '<span class="view-participant-role">' + _esc(roleLabel) + '</span>' +
        (i === 0 ? '<span class="view-participant-sender">\u2605 sender</span>' : '') +
      '</div>';
    });
    return html + '</div>';
  }

  function _renderFinancialCard(r) {
    var expActive = _finTab === 'expenses';
    var tabsHtml =
      '<div class="view-fin-tabs">' +
        '<button class="view-fin-tab' + ( expActive ? ' active' : '') + '" data-tab="expenses">Expenses</button>' +
        '<button class="view-fin-tab' + (!expActive ? ' active' : '') + '" data-tab="income">Income</button>' +
      '</div>';

    var content = expActive
      ? _renderExpensesTab(r, _expenses, _payments)
      : _renderIncomeTab(r, _expenses, _payments);

    return (
      '<div class="card view-financial-card">' +
        '<div class="card-section">' +
          '<div class="section-label-row" style="margin-bottom:16px;">' +
            tabsHtml +
            '<span class="section-rule"></span>' +
          '</div>' +
          content +
        '</div>' +
      '</div>'
    );
  }

  function _renderExpensesTab(r, expenses, payments) {
    var sym      = r.currency === 'EUR' ? '\u20ac' : r.currency === 'USD' ? '$' : '\u00a3';
    var vatLabel = r.vat === 'standard' ? 'inc. 20% VAT'
                 : r.vat === 'reduced'  ? 'inc. 5% VAT'
                 : r.vat === 'zero'     ? 'zero-rated' : '';
    var fmt = function (n) { return sym + n.toFixed(2); };

    var billedExp = (expenses || []).filter(function (e) { return e.expense_billing !== 'cogs' && e.amount; });
    var cogsExp   = (expenses || []).filter(function (e) { return e.expense_billing === 'cogs'  && e.amount; });
    var total     = parseFloat(r.amount) || 0;

    // Simple display when no expense line items
    if (!billedExp.length && !cogsExp.length) {
      var html = '<div class="view-financial"><div>';
      html += '<div class="view-financial-amount">' + sym + _esc(r.amount || '0') + '</div>';
      if (vatLabel) html += '<div class="view-financial-tax">' + vatLabel + '</div>';
      if (r.parts_flag) html += '<div class="view-parts-flag">Parts / materials involved</div>';
      html += '</div></div>';
      html += _renderFinCross(payments, null, r, 'expenses');
      return html;
    }

    var subtotal   = billedExp.reduce(function (s, e) { return s + (parseFloat(e.amount) || 0); }, 0);
    var diff       = total - subtotal;
    var diffRecord = billedExp.filter(function (e) { return e.isDifference; })[0] || null;

    var expRows = (function () {
      var groups = [];
      var groupMap = {};
      billedExp.forEach(function (e) {
        var key = e.actionIdx != null ? String(e.actionIdx) : '';
        if (!groupMap[key]) {
          var title = '';
          if (key !== '' && r.actions && r.actions[parseInt(key, 10)]) {
            title = r.actions[parseInt(key, 10)].title;
          }
          var g = { key: key, title: title, items: [] };
          groups.push(g);
          groupMap[key] = g;
        }
        groupMap[key].items.push(e);
      });
      return groups.map(function (g) {
        var header = g.title
          ? '<div class="view-exp-action-header">' + _esc(g.title) + '</div>'
          : '';
        var rows = g.items.map(function (e) {
          var label = e.isDifference
            ? '<span style="color:var(--ink-faint);font-style:italic;">Difference</span>'
            : '<a href="#" class="view-exp-nav" data-id="' + _esc(e.id) + '">' + _esc(e.job || 'Expense') + '</a>';
          return '<div class="view-exp-row">' +
                   '<span class="view-exp-label">' + label + '</span>' +
                   '<span class="view-exp-amount">' + fmt(parseFloat(e.amount) || 0) + '</span>' +
                 '</div>';
        }).join('');
        return header + rows;
      }).join('');
    }());

    var cogsRows = cogsExp.map(function (e) {
      return '<div class="view-exp-row">' +
               '<span class="view-exp-label"><a href="#" class="view-exp-nav" data-id="' + _esc(e.id) + '">' +
                 _esc(e.job || 'Expense') + '</a> <span style="font-size:9px;color:var(--ink-faint);">COGS</span></span>' +
               '<span class="view-exp-amount cogs">' + fmt(parseFloat(e.amount) || 0) + '</span>' +
             '</div>';
    }).join('');

    var diffLine = (Math.abs(diff) > 0.001)
      ? '<div class="view-diff-row">' +
          '<span class="view-diff-label">Difference</span>' +
          '<span>' +
            '<span class="view-diff-value">' + fmt(Math.abs(diff)) +
              (diff < 0 ? ' <span style="color:#b84040;">\u25b2</span>' : '') +
            '</span>' +
            (diffRecord
              ? '<button class="view-diff-link" id="view-diff-btn" data-id="' + _esc(diffRecord.id) + '">View</button>'
              : '<button class="view-diff-link" id="view-diff-btn" data-diff="' + Math.abs(diff).toFixed(2) + '">+ Absorb</button>') +
          '</span>' +
        '</div>'
      : '';

    return (
      '<div class="view-exp-list">' + expRows + cogsRows + '</div>' +
      '<div class="view-tally-row">' +
        '<span class="view-tally-label">Subtotal</span>' +
        '<span class="view-tally-value">' + fmt(subtotal) + '</span>' +
      '</div>' +
      '<div class="view-tally-row view-tally-total">' +
        '<span class="view-tally-label">Customer price</span>' +
        '<span class="view-tally-value">' + fmt(total) +
          (vatLabel ? ' <span style="font-family:var(--font-mono);font-size:9px;font-weight:400;color:var(--ink-muted);">' + vatLabel + '</span>' : '') +
        '</span>' +
      '</div>' +
      diffLine +
      _renderFinCross(payments, subtotal, r, 'expenses')
    );
  }

  function _renderIncomeTab(r, expenses, payments) {
    var sym = r.currency === 'EUR' ? '\u20ac' : r.currency === 'USD' ? '$' : '\u00a3';
    var fmt = function (n) { return sym + n.toFixed(2); };

    var payRows = (payments && payments.length)
      ? payments.map(function (p) {
          var label = p.date
            ? _esc(p.date) + (p.job ? ' \xb7 ' + _esc(p.job) : '')
            : _esc(p.job || 'Payment');
          return '<div class="view-pay-row">' +
                   '<span class="view-pay-label"><a href="#" class="view-pay-nav" data-id="' + _esc(p.id) + '">' + label + '</a></span>' +
                   '<span class="view-pay-amount">' + fmt(parseFloat(p.amount) || 0) + '</span>' +
                 '</div>';
        }).join('')
      : '<div class="view-pay-empty">No payments recorded.' +
          ' <button class="view-diff-link" id="view-add-payment">+ Record</button>' +
        '</div>';

    var totalPaid   = (payments || []).reduce(function (s, p) { return s + (parseFloat(p.amount) || 0); }, 0);
    var billedTotal = (expenses || [])
      .filter(function (e) { return e.expense_billing !== 'cogs' && e.amount; })
      .reduce(function (s, e) { return s + (parseFloat(e.amount) || 0); }, 0);

    var tallyHtml = payments && payments.length
      ? '<div class="view-tally-row view-tally-total">' +
          '<span class="view-tally-label">Total received</span>' +
          '<span class="view-tally-value">' + fmt(totalPaid) + '</span>' +
        '</div>' +
        '<div style="text-align:right;padding:4px 0;">' +
          '<button class="view-diff-link" id="view-add-payment">+ Record</button>' +
        '</div>'
      : '';

    return (
      '<div class="view-exp-list">' + payRows + '</div>' +
      tallyHtml +
      _renderFinCross(payments, billedTotal, r, 'income')
    );
  }

  function _renderFinCross(payments, expSubtotal, r, activeTab) {
    var sym = r.currency === 'EUR' ? '\u20ac' : r.currency === 'USD' ? '$' : '\u00a3';
    var fmt = function (n) { return sym + n.toFixed(2); };

    var totalPaid     = (payments || []).reduce(function (s, p) { return s + (parseFloat(p.amount) || 0); }, 0);
    var customerPrice = parseFloat(r.amount) || 0;
    var outstanding   = customerPrice - totalPaid;

    // Cross-panel total row
    var crossLabel = activeTab === 'expenses' ? 'Income received' : 'Expenses';
    var crossValue = activeTab === 'expenses' ? totalPaid : (expSubtotal || 0);

    var outLabel, outClass;
    if (Math.abs(outstanding) < 0.001 && (customerPrice > 0 || totalPaid > 0)) {
      outLabel = '\u2713 Paid in full';
      outClass = 'style="color:#2a6e2a;"';
    } else if (outstanding < 0) {
      outLabel = 'Overpayment \u00b7 ' + fmt(Math.abs(outstanding));
      outClass = 'style="color:#b84040;"';
    } else if (outstanding > 0) {
      outLabel = 'Outstanding';
      outClass = '';
    } else {
      return '';
    }

    return (
      '<div class="view-fin-cross">' +
        '<span class="view-fin-cross-label">' + crossLabel + '</span>' +
        '<span class="view-fin-cross-value">' + fmt(crossValue) + '</span>' +
      '</div>' +
      '<div class="view-fin-cross view-fin-outstanding">' +
        '<span class="view-fin-cross-label" ' + outClass + '>' + outLabel + '</span>' +
        (outstanding > 0
          ? '<span class="view-fin-cross-value">' + fmt(outstanding) + '</span>'
          : '') +
      '</div>'
    );
  }

  function _renderDetailGrid(r, keys) {
    var labels = {
      worker:         'Worker',
      location:       'Location',
      start_time:     'Start',
      end_time:       'End',
      meeting_time:   'Meeting',
      customer_phone: 'Phone',
    };
    var html = '<div class="view-details-grid">';
    keys.forEach(function (k) {
      if (!r[k]) return;
      html += '<div>' +
                '<div class="view-detail-label">' + (labels[k] || k) + '</div>' +
                '<div class="view-detail-value">' + _esc(r[k]) + '</div>' +
              '</div>';
    });
    return html + '</div>';
  }

  // ── Events ───────────────────────────────────────────────────

  function _bindEvents() {
    var id       = _record.id;
    var parentId = _record.parentId;

    if (_isArchived) {
      var restoreBtn  = document.getElementById('view-btn-restore');
      var backArchBtn = document.getElementById('view-btn-back-archive');
      if (restoreBtn)  restoreBtn.addEventListener('click',  _doRestore);
      if (backArchBtn) backArchBtn.addEventListener('click', function () { App.showArchive(); });
      _bindFinancialEvents(id);
      return;
    }

    var parentBtn  = document.getElementById('view-btn-parent');
    var shareBtn   = document.getElementById('view-btn-share');
    var editBtn    = document.getElementById('view-btn-edit');
    var archiveBtn = document.getElementById('view-btn-archive');

    if (parentBtn)  parentBtn.addEventListener('click',  function () { App.showView(parentId); });
    if (shareBtn)   shareBtn.addEventListener('click',   function () { App.showShare(id); });
    if (editBtn)    editBtn.addEventListener('click',    function () { App.showWizard(id); });
    if (archiveBtn) archiveBtn.addEventListener('click', _doArchive);

    _bindFinancialEvents(id);

    // Action filter toolbar (live re-render preserving filter state)
    var searchEl = document.getElementById('view-act-search');
    if (searchEl) {
      searchEl.addEventListener('input', function () {
        _actionsFilter = this.value;
        _rerenderActions();
      });
    }
  }

  function _bindFinancialEvents(id) {
    // Tab toggle
    document.querySelectorAll('.view-fin-tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var tab = this.dataset.tab;
        if (tab === _finTab) return;
        _finTab = tab;
        var card = document.querySelector('.view-financial-card');
        if (card) {
          var newCard = document.createElement('div');
          newCard.innerHTML = _renderFinancialCard(_record);
          card.parentNode.replaceChild(newCard.firstChild, card);
          _bindFinancialEvents(id);
        }
      });
    });

    // Expense navigation
    document.querySelectorAll('.view-exp-nav').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        App.showView(this.dataset.id);
      });
    });

    // Difference absorb / view
    var diffBtn = document.getElementById('view-diff-btn');
    if (diffBtn) {
      if (diffBtn.dataset.id) {
        diffBtn.addEventListener('click', function () { App.showView(this.dataset.id); });
      } else {
        diffBtn.addEventListener('click', function () { App.showExpense(id, this.dataset.diff); });
      }
    }

    // Payment navigation
    document.querySelectorAll('.view-pay-nav').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        App.showView(this.dataset.id);
      });
    });

    // Add payment button
    var addPayBtn = document.getElementById('view-add-payment');
    if (addPayBtn) {
      addPayBtn.addEventListener('click', function () { App.showPayment(id); });
    }

    // Action expense buttons
    document.querySelectorAll('.view-action-exp-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        App.showExpense(id, null, parseInt(this.dataset.actionIdx, 10));
      });
    });
  }

  function _rerenderActions() {
    var r = _record;
    if (!r || !r.actions || !r.actions.length) return;
    var screenEl    = document.getElementById('screen-view');
    var toolbarEl   = screenEl && screenEl.querySelector('.view-actions-toolbar');
    var actListEl   = toolbarEl && toolbarEl.nextElementSibling;
    if (!actListEl) return;
    actListEl.outerHTML = _renderActions(r.actions);
    // Re-bind expense buttons on new DOM nodes
    document.querySelectorAll('.view-action-exp-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        App.showExpense(r.id, null, parseInt(this.dataset.actionIdx, 10));
      });
    });
  }

  function _doRestore() {
    RecordService.restore(_record.id).then(function () {
      if (typeof WorkpadsPanel !== 'undefined' && WorkpadsPanel.refresh) WorkpadsPanel.refresh();
      App.toast('Record restored');
      App.showView(_record.id);
    }).catch(function () {
      App.toast('Restore failed');
    });
  }

  function _doArchive() {
    if (!confirm('Archive this record? It will be removed from your active list.')) return;
    var parentId = _record.parentId || null;
    RecordService.archive(_record.id).then(function () {
      if (typeof WorkpadsPanel !== 'undefined' && WorkpadsPanel.refresh) {
        WorkpadsPanel.refresh();
      }
      App.toast('Record archived');
      if (parentId) {
        App.showView(parentId);
      } else {
        App.showList();
      }
    });
  }

  // ── Markdown renderer ────────────────────────────────────────

  function _mdInline(s) {
    s = _esc(s);
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\*(.+?)\*/g,     '<em>$1</em>');
    s = s.replace(/`(.+?)`/g,       '<code>$1</code>');
    return s;
  }

  function _md(text) {
    if (!text) return '';
    var lines  = text.split('\n');
    var html   = '';
    var inUl   = false;
    var inOl   = false;
    var olNum  = 0;

    function closeList() {
      if (inUl) { html += '</ul>'; inUl = false; }
      if (inOl) { html += '</ol>'; inOl = false; olNum = 0; }
    }

    lines.forEach(function (line) {
      var hm = line.match(/^(#{1,3})\s+(.+)/);
      if (hm) {
        closeList();
        var lvl = hm[1].length;
        html += '<h' + lvl + '>' + _mdInline(hm[2]) + '</h' + lvl + '>';
        return;
      }
      var ulm = line.match(/^[-*]\s+(.+)/);
      if (ulm) {
        if (inOl) closeList();
        if (!inUl) { html += '<ul>'; inUl = true; }
        html += '<li>' + _mdInline(ulm[1]) + '</li>';
        return;
      }
      var olm = line.match(/^\d+\.\s+(.+)/);
      if (olm) {
        if (inUl) closeList();
        if (!inOl) { html += '<ol>'; inOl = true; }
        html += '<li>' + _mdInline(olm[1]) + '</li>';
        return;
      }
      closeList();
      if (line.trim() === '') {
        if (html.slice(-4) !== '<br>') html += '<br>';
        return;
      }
      html += '<p>' + _mdInline(line) + '</p>';
    });
    closeList();
    return html;
  }

  // ── Helpers ──────────────────────────────────────────────────

  function _esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function _escNl(s) {
    return _esc(s).replace(/\n/g, '<br>');
  }

  // ── Public ───────────────────────────────────────────────────

  return { onShow: onShow, onHide: onHide };

}());
