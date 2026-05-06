/* ============================================================
   ViewScreen — read-only record display with inline actions
   ============================================================ */

var ViewScreen = (function () {
  'use strict';

  var _record        = null;
  var _parentRecord  = null;
  var _approval      = null;
  var _expenses      = [];
  var _payments      = [];
  var _comments      = [];
  var _finTab        = 'expenses';  // kept for compat but unused
  var _stylesAdded   = false;
  var _isArchived    = false;
  var _expOpen       = true;
  var _payOpen       = true;
  var _cogsViewOpen  = false;

  // ── Styles ───────────────────────────────────────────────────

  function _addStyles() {
    if (_stylesAdded) return;
    _stylesAdded = true;
    var s = document.createElement('style');
    s.textContent = [
      '.view-wrap { max-width:680px; margin:0 auto; padding:36px 32px 80px; }',
      '.view-wrap.view-has-sidebar { max-width:960px; display:flex; gap:44px; align-items:flex-start; }',
      '.view-has-sidebar .view-main { flex:1; min-width:0; }',

      /* Comment sidebar */
      '.view-comments-col {',
      '  width:230px; flex-shrink:0; padding-top:0;',
      '}',
      '.view-comment-input-wrap { margin-bottom:18px; }',
      '.view-comment-input {',
      '  width:100%;',
      '  font-family:var(--font-mono); font-size:11px;',
      '  color:var(--ink-mid); background:transparent;',
      '  border:none; border-bottom:1.5px solid var(--rule);',
      '  padding:6px 2px; outline:none;',
      '  transition:border-color .15s;',
      '}',
      '.view-comment-input:focus { border-bottom-color:var(--stamp-border); }',
      '.view-comment-input::placeholder { color:var(--ink-faint); letter-spacing:.03em; }',
      '.view-comment { margin-bottom:1.7em; }',
      '.view-comment-text {',
      '  font-family:var(--font-body); font-size:14px;',
      '  color:#2d2318; line-height:1.55; margin-bottom:5px;',
      '}',
      '.view-comment-meta {',
      '  display:flex; align-items:center; justify-content:space-between;',
      '}',
      '.view-comment-ts {',
      '  font-family:var(--font-mono); font-size:9px;',
      '  color:var(--ink-faint); letter-spacing:.03em;',
      '}',
      '.view-comment-pin {',
      '  width:17px; height:17px; flex-shrink:0;',
      '  font-family:var(--font-mono); font-size:11px; font-weight:700;',
      '  color:var(--ink-faint); background:none;',
      '  border:1.5px solid var(--rule); border-radius:2px;',
      '  cursor:pointer; padding:0; line-height:1;',
      '  display:inline-flex; align-items:center; justify-content:center;',
      '  transition:border-color .12s, color .12s;',
      '}',
      '.view-comment-pin:hover { border-color:var(--stamp-border); color:var(--stamp); }',
      '.view-comment-pin.pinned { border-color:var(--stamp); color:var(--stamp); }',

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
      '  font-family:var(--font-body); font-size:13px; font-style:italic;',
      '  color:var(--ink-muted); margin-top:4px; line-height:1.5;',
      '  padding-left:10px; border-left:2px solid var(--rule);',
      '}',
      '.view-action-body { flex:1; min-width:0; }',
      '.view-action-btn-group {',
      '  display:flex; gap:5px; flex-shrink:0; align-self:center;',
      '}',
      '.view-action-exp-btn {',
      '  font-family:var(--font-mono); font-size:10px; font-weight:700;',
      '  color:var(--stamp); background:none; border:1px solid var(--stamp-border);',
      '  border-radius:4px; padding:3px 8px; cursor:pointer; white-space:nowrap;',
      '  opacity:0.6; transition:opacity 0.15s;',
      '}',
      '.view-action-exp-btn:hover { opacity:1; }',
      '.view-action-cogs-btn {',
      '  font-family:var(--font-mono); font-size:10px; font-weight:700;',
      '  color:var(--ink-faint); background:none; border:1px solid var(--rule);',
      '  border-radius:4px; padding:3px 8px; cursor:pointer; white-space:nowrap;',
      '  opacity:0.5; transition:opacity 0.15s;',
      '}',
      '.view-action-cogs-btn:hover { opacity:1; color:var(--ink-mid); }',

      /* Expense/COGS record context banner */
      '.view-child-ctx {',
      '  margin-bottom:20px; padding:12px 16px;',
      '  background:var(--stamp-light); border:1px solid var(--stamp-border);',
      '  border-radius:4px;',
      '}',
      '.view-child-ctx-label {',
      '  font-family:var(--font-mono); font-size:9px; font-weight:700;',
      '  letter-spacing:.14em; text-transform:uppercase; color:var(--stamp);',
      '  margin-bottom:4px;',
      '}',
      '.view-child-ctx-job {',
      '  font-family:var(--font-body); font-size:15px; font-weight:700;',
      '  color:var(--ink); margin-bottom:3px;',
      '}',
      '.view-child-ctx-meta {',
      '  font-family:var(--font-mono); font-size:9.5px; color:var(--ink-mid);',
      '  margin-bottom:6px;',
      '}',

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

      /* (filter toolbar removed — replaced by comment sidebar) */

      /* Private badge on notes section */
      '.view-private-badge {',
      '  font-family:var(--font-mono); font-size:8px; font-weight:700;',
      '  letter-spacing:.12em; text-transform:uppercase;',
      '  color:var(--ink-muted); border:1px solid var(--rule);',
      '  border-radius:2px; padding:1px 5px; margin-left:8px;',
      '  vertical-align:middle;',
      '}',

      /* Action quick-add row */
      '.view-action-add-row {',
      '  display:flex; gap:6px; margin-top:14px; padding-top:10px;',
      '  border-top:1px dashed var(--rule-light);',
      '}',
      '.view-action-add-input {',
      '  flex:1; font-family:var(--font-mono); font-size:11px;',
      '  color:var(--ink); background:var(--paper);',
      '  border:1px solid var(--rule); border-radius:3px;',
      '  padding:5px 9px; transition:border-color .13s;',
      '}',
      '.view-action-add-input:focus { outline:none; border-color:var(--stamp-border); }',
      '.view-action-add-input::placeholder { color:var(--ink-faint); }',
      '.view-action-add-btn {',
      '  font-family:var(--font-mono); font-size:10px; font-weight:700;',
      '  color:#fff; background:var(--stamp); border:none;',
      '  border-radius:3px; padding:5px 12px; cursor:pointer; white-space:nowrap;',
      '  transition:opacity .13s;',
      '}',
      '.view-action-add-btn:hover { opacity:0.85; }',

      /* Payment method selector in financial footer */
      '.view-pay-methods-row {',
      '  margin-top:12px; padding-top:10px;',
      '  border-top:1px dashed var(--rule-light);',
      '  display:flex; align-items:center; gap:10px;',
      '}',
      '.view-pay-methods-label {',
      '  font-family:var(--font-mono); font-size:9px; font-weight:700;',
      '  letter-spacing:.14em; text-transform:uppercase; color:var(--ink-muted);',
      '  flex-shrink:0;',
      '}',
      '.view-pay-methods-select {',
      '  font-family:var(--font-mono); font-size:11px; color:var(--ink);',
      '  background:var(--paper); border:1px solid var(--rule); border-radius:3px;',
      '  padding:3px 7px; cursor:pointer; flex:1;',
      '}',
      '.view-pay-methods-select:focus { outline:none; border-color:var(--stamp-border); }',

      /* Rejected items section */
      '.view-rejected-hd {',
      '  display:flex; align-items:center; gap:5px;',
      '  padding:5px 0 4px; cursor:pointer; user-select:none;',
      '  border-top:1px solid var(--rule-light); margin-top:6px;',
      '}',
      '.view-rejected-row {',
      '  display:flex; justify-content:space-between; align-items:center;',
      '  padding:5px 0; border-bottom:1px solid var(--rule-light);',
      '  font-family:var(--font-mono); font-size:11px; opacity:0.55;',
      '}',
      '.view-rejected-row:last-child { border-bottom:none; }',
      '.view-rejected-label { color:var(--ink-mid); flex:1; text-decoration:line-through; margin-right:8px; }',
      '.view-rejected-amount { color:var(--ink-faint); font-weight:400; flex-shrink:0; margin-right:8px; }',
      '.view-rejected-accept {',
      '  font-size:9px; font-weight:700; color:var(--stamp); background:none; border:none;',
      '  cursor:pointer; padding:0; text-decoration:underline; text-decoration-style:dotted; flex-shrink:0;',
      '}',
      '.view-exp-from {',
      '  font-family:var(--font-mono); font-size:8.5px; color:var(--ink-faint);',
      '  margin-left:5px; opacity:0.75;',
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
      '  color:var(--ink-faint); text-transform:uppercase; padding:4px 0 2px;',
      '}',
      '.view-exp-group { padding-bottom:6px; }',
      '.view-exp-group + .view-exp-group {',
      '  border-top:1px solid var(--rule); padding-top:10px; margin-top:6px;',
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

      /* Financial summary header */
      '.view-fin-header { display:flex; align-items:center; margin-bottom:10px; }',
      '.view-fin-summary-link {',
      '  font-family:var(--font-mono); font-size:9px; font-weight:700;',
      '  letter-spacing:.16em; text-transform:uppercase;',
      '  color:#1a3055; text-decoration:underline; cursor:pointer;',
      '  background:none; border:none; padding:0;',
      '}',
      '.view-fin-summary-link:hover { color:#0e1f38; }',
      '.view-fin-count-badge {',
      '  font-family:var(--font-mono); font-size:8.5px; font-weight:700;',
      '  color:var(--stamp); background:var(--stamp-light); border:1px solid var(--stamp-border);',
      '  border-radius:10px; padding:1px 6px; margin-left:8px; cursor:pointer;',
      '  transition:background .12s;',
      '}',
      '.view-fin-count-badge:hover { background:var(--stamp-border); color:#fff; }',

      /* Collapsible section headers */
      '.view-fin-section-hd {',
      '  display:flex; align-items:center; gap:5px;',
      '  padding:5px 0 4px; cursor:pointer; user-select:none;',
      '  border-top:1px solid var(--rule-light); margin-top:6px;',
      '}',
      '.view-fin-section-hd:first-of-type { border-top:none; margin-top:0; }',
      '.view-fin-section-arrow {',
      '  font-family:var(--font-mono); font-size:8px; color:var(--ink-faint);',
      '  width:10px; flex-shrink:0; display:inline-block; text-align:center;',
      '}',
      '.view-fin-section-name {',
      '  font-family:var(--font-mono); font-size:9px; font-weight:700;',
      '  letter-spacing:.14em; text-transform:uppercase; color:var(--ink-muted);',
      '}',
      '.view-fin-section-ct {',
      '  font-family:var(--font-mono); font-size:8px; color:var(--ink-faint);',
      '  background:var(--rule-light); border-radius:8px; padding:0 5px;',
      '  margin-left:2px;',
      '}',
      '.view-fin-section-body { padding-bottom:4px; }',

      /* Summary totals block */
      '.view-fin-totals { margin-top:8px; border-top:1.5px solid var(--rule); padding-top:8px; }',
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
      _comments = r.comments || [];

      // ACK return flow: redirect to the original record with a confirmation toast
      if (r.record_type === 'ack' && r._chainRef) {
        RecordService.findByChainRef(r._chainRef).then(function (linked) {
          var original = linked.filter(function (lr) { return lr.record_type !== 'ack'; })[0];
          if (original) {
            App.showView(original.id);
            App.toast('Acknowledgement received \u2014 ' + (r.worker || 'customer'));
          }
        });
        return;
      }

      var expenseLoad = RecordService.list().then(function (all) {
        _expenses = all.filter(function (rec) {
          return rec.parentId === r.id && rec.recordType === 'expense';
        });
        _payments = all.filter(function (rec) {
          return rec.parentId === r.id && rec.recordType === 'payment';
        });
      });

      var parentLoad = r.parentId
        ? RecordService.get(r.parentId).then(function (p) { _parentRecord = p || null; })
        : Promise.resolve();

      var approvalLoad = (r.chainRef && r.record_type !== 'ack')
        ? RecordService.findByChainRef(r.chainRef).then(function (linked) {
            var acks = linked.filter(function (lr) {
              return lr.record_type === 'ack' && lr.id !== r.id;
            });
            _approval = acks.length ? acks[0] : null;
          })
        : Promise.resolve();

      Promise.all([expenseLoad, parentLoad, approvalLoad]).then(function () { _render(); });
    });
  }

  function onHide() { _record = null; _parentRecord = null; _approval = null; _expenses = []; _payments = []; _comments = []; _finTab = 'expenses'; _isArchived = false; _expOpen = true; _payOpen = true; _cogsViewOpen = false; }

  // ── Render ───────────────────────────────────────────────────

  function _render() {
    var el = document.getElementById('screen-view');
    var r  = _record;

    var hasSidebar = !r.receivedAt && !_isArchived && r.recordType !== 'expense';
    var html = '<div class="view-wrap' + (hasSidebar ? ' view-has-sidebar' : '') + '">';
    if (hasSidebar) html += '<div class="view-main">';

    // ── Parent context banner (for child expense/COGS records)
    if (_parentRecord && r.parentId) {
      html += _renderParentContext(_parentRecord, r);
    }

    // ── Document header
    var TYPE_STAMP = { quote: 'Quote', invoice: 'Invoice', ack: 'Approval' };
    html += '<div class="view-doc-header">';
    if (r.recordType === 'expense') {
      var expStampLabel = r.expense_billing === 'cogs' ? 'COGS' : 'Expense';
      html += '<div class="view-stamp" style="background:var(--stamp-light);">' + expStampLabel + '</div>';
    } else if (r.record_type && TYPE_STAMP[r.record_type]) {
      html += '<div class="view-stamp">' + TYPE_STAMP[r.record_type] + '</div>';
    } else if (r.receivedAt) {
      html += '<div class="view-stamp">Received</div>';
    }
    // For COGS/expense records with blank job, fall back to charge type label
    var displayTitle = r.job || '';
    if (!displayTitle && r.recordType === 'expense' && r.charge_type != null) {
      displayTitle = CHARGE_TYPE_LABELS[String(r.charge_type)] || '';
    }
    html += '<h1 class="view-job">' + _esc(displayTitle || 'Untitled') + '</h1>';
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
        html += '<button class="btn-ghost" id="view-btn-quick-expense">+ Expense</button>';
        html += '<button class="btn-ghost" id="view-btn-quick-cogs">+ COGS</button>';
      }
      if (r.recordType === 'expense' && r.expense_billing !== 'cogs') {
        html += '<button class="btn-ghost" id="view-btn-cogs">Record COGS</button>';
      }
      html += '<button class="btn-ghost" id="view-btn-edit">Edit</button>';
      html += '<button class="btn-ghost" id="view-btn-archive">Archive</button>';
    }
    html += '</div>';

    // ── Body sections (main card)
    html += '<div class="card">';

    // Expense/COGS records: show all available fields first
    if (r.recordType === 'expense') {
      html += _renderExpenseDetails(r);
    }

    if (r.recordType !== 'expense') {
      if (r.actions && r.actions.length) {
        html += _renderActionsSection(r.actions, !r.receivedAt);
      } else if (!r.receivedAt) {
        html += _renderActionsSection([], true);
      }
    }

    // Participants block (preferred) or legacy worker field (non-expense main records only)
    if (r.recordType !== 'expense') {
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

    if (hasSidebar) {
      html += '</div>'; // .view-main
      html += _renderCommentsSidebar();
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

  function _renderActionsSection(actions, showAdd) {
    var addRow = showAdd ? (
      '<div class="view-action-add-row">' +
        '<input class="view-action-add-input" id="view-action-add-input" type="text" ' +
            'placeholder="New action item\u2026" autocomplete="off">' +
        '<button class="view-action-add-btn" id="view-action-add-btn">Add</button>' +
      '</div>'
    ) : '';
    return (
      '<div class="card-section">' +
        '<div class="section-label-row" style="margin-bottom:16px;">' +
          '<span class="section-label">Actions</span>' +
          '<span class="section-rule"></span>' +
        '</div>' +
        _renderActions(actions) +
        addRow +
      '</div>'
    );
  }

  function _renderActions(actions) {
    // Apply filter
    if (!actions.length) {
      return '<div style="font-family:var(--font-mono);font-size:11px;color:var(--ink-faint);padding:8px 0;" id="view-actions-list">No actions yet</div>';
    }

    var html = '<ol class="view-actions-list" id="view-actions-list">';
    actions.forEach(function (a, i) {
      var num = (i < 9 ? '0' : '') + (i + 1);
      var origIdx = i;
      html += '<li class="view-action-item">' +
                '<span class="view-action-num">' + num + '</span>' +
                '<div class="view-action-body">' +
                  '<div class="view-action-title">' + _esc(a.title) + '</div>' +
                  (a.notes ? '<div class="view-action-notes">' + _esc(a.notes) + '</div>' : '') +
                '</div>' +
                '<div class="view-action-btn-group">' +
                  '<button class="view-action-exp-btn" data-action-idx="' + origIdx + '" title="Add expense for this action">+ expense</button>' +
                  '<button class="view-action-cogs-btn" data-action-idx="' + origIdx + '" title="Record COGS for this action">COGS</button>' +
                '</div>' +
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

  var COGS_CHARGE_LABELS_V = {
    '': 'Labour', '1': 'Urgency / emergency', '2': 'After-hours',
    '3': 'Travel / mileage', '4': 'Delivery / courier', '5': 'Equipment hire',
    '6': 'Materials', '7': 'Subcontractor', '8': 'Cancellation fee',
    '9': 'Deposit / retainer', '10': 'Credit / discount', '11': 'Warranty',
    '12': 'Regulatory levy', '13': 'FX adjustment',
  };

  function _renderParentContext(parent, child) {
    var meta = [];
    if (parent.customer) meta.push(_esc(parent.customer));
    if (parent.date)     meta.push(_esc(parent.date));
    var actionCtx = '';
    if (child.actionIdx != null && parent.actions && parent.actions[parseInt(child.actionIdx, 10)]) {
      actionCtx = '<div class="view-child-ctx-meta" style="margin-top:2px;">' +
        '<span style="font-family:var(--font-mono);font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-faint);">Action\u00a0</span>' +
        _esc(parent.actions[parseInt(child.actionIdx, 10)].title) +
      '</div>';
    }
    return (
      '<div class="view-child-ctx">' +
        '<div class="view-child-ctx-label">Parent job</div>' +
        '<div class="view-child-ctx-job">' + _esc(parent.job || 'Untitled') + '</div>' +
        (meta.length ? '<div class="view-child-ctx-meta">' + meta.join(' \xb7 ') + '</div>' : '') +
        actionCtx +
        '<button class="view-parent-link" id="view-btn-parent-ctx" style="margin-top:8px;font-size:10px;">\u2190 View job</button>' +
      '</div>'
    );
  }

  var CHARGE_TYPE_LABELS = {
    '': 'General / labour', '1': 'Urgency / emergency', '2': 'After-hours',
    '3': 'Travel / mileage', '4': 'Delivery / courier', '5': 'Equipment hire',
    '6': 'Materials / consumables', '7': 'Subcontractor', '8': 'Cancellation fee',
    '9': 'Deposit / retainer', '10': 'Credit / discount', '11': 'Warranty adjustment',
    '12': 'Regulatory levy', '13': 'FX adjustment', '14': 'Payment handling fee',
  };

  function _renderExpenseDetails(r) {
    var rows = [];
    var sym = r.currency === 'EUR' ? '\u20ac' : (r.currency === 'USD' || r.currency === 'CAD') ? '$' : '\u00a3';

    var billingLabel = r.expense_billing === 'cogs' ? 'Cost of Goods Sold (COGS)' : 'Customer-billed expense';
    rows.push({ label: 'Type', value: billingLabel });

    if (r.charge_type != null && CHARGE_TYPE_LABELS[String(r.charge_type)]) {
      rows.push({ label: 'Charge type', value: CHARGE_TYPE_LABELS[String(r.charge_type)] });
    }

    if (r.amount) {
      var amtLabel = r.expense_billing === 'cogs' ? 'COGS amount' : 'Amount';
      rows.push({ label: amtLabel, value: sym + parseFloat(r.amount).toFixed(2) });
    }

    if (r.action_quoted) {
      rows.push({ label: 'Quoted for action', value: sym + parseFloat(r.action_quoted).toFixed(2) });
    }

    if (r.worker_cost && r.expense_billing !== 'cogs') {
      rows.push({ label: 'My cost (est.)', value: sym + parseFloat(r.worker_cost).toFixed(2) });
    }

    if (r.worker) {
      rows.push({ label: 'Worker', value: r.worker });
    }

    if (r.date) {
      rows.push({ label: 'Date', value: r.date });
    }

    if (!rows.length) return '';

    var gridHtml = '<div class="view-details-grid">';
    rows.forEach(function (row) {
      gridHtml += '<div>' +
        '<div class="view-detail-label">' + _esc(row.label) + '</div>' +
        '<div class="view-detail-value">' + _esc(row.value) + '</div>' +
      '</div>';
    });
    gridHtml += '</div>';

    return _renderCardSection('Details', gridHtml);
  }

  function _renderFinancialCard(r) {
    var sym      = r.currency === 'EUR' ? '\u20ac' : (r.currency === 'USD' || r.currency === 'CAD') ? '$' : '\u00a3';
    var vatLabel = r.vat === 'standard' ? 'inc. 20% VAT'
                 : r.vat === 'reduced'  ? 'inc. 5% VAT'
                 : r.vat === 'zero'     ? 'zero-rated' : '';
    var fmt      = function (n) { return sym + n.toFixed(2); };

    var billedExp = (_expenses || []).filter(function (e) { return e.expense_billing !== 'cogs' && e.amount; });
    var cogsExp   = (_expenses || []).filter(function (e) { return e.expense_billing === 'cogs'  && e.amount; });
    var pays      = _payments || [];
    var totalCount = billedExp.length + cogsExp.length + pays.length;

    var customerPrice = parseFloat(r.amount) || 0;

    // ── Simple display: no sub-records
    if (!billedExp.length && !cogsExp.length && !pays.length) {
      var simpleHtml = '<div class="card view-financial-card"><div class="card-section">';
      simpleHtml += '<div class="view-fin-header"><a href="#" class="view-fin-summary-link" id="view-fin-summary-link">Financial Summary</a><span class="section-rule" style="margin-left:10px;flex:1;"></span></div>';
      simpleHtml += '<div class="view-financial"><div>';
      simpleHtml += '<div class="view-financial-amount">' + sym + _esc(r.amount || '0') + '</div>';
      if (vatLabel) simpleHtml += '<div class="view-financial-tax">' + vatLabel + '</div>';
      if (r.parts_flag) simpleHtml += '<div class="view-parts-flag">Parts / materials involved</div>';
      simpleHtml += '</div></div>';
      simpleHtml += '</div></div>';
      return simpleHtml;
    }

    var html = '<div class="card view-financial-card"><div class="card-section">';

    // ── Header
    html += '<div class="view-fin-header">' +
      '<a href="#" class="view-fin-summary-link" id="view-fin-summary-link">Financial Summary</a>' +
      (totalCount > 0
        ? '<span class="view-fin-count-badge" id="view-fin-count-badge" title="All records">' + totalCount + '</span>'
        : '') +
      '<span class="section-rule" style="margin-left:10px;flex:1;"></span>' +
    '</div>';

    // ── Expenses section
    if (billedExp.length) {
      var subtotal = billedExp.reduce(function (s, e) { return s + (parseFloat(e.amount) || 0); }, 0);
      var diff = customerPrice - subtotal;
      var diffRecord = billedExp.filter(function (e) { return e.isDifference; })[0] || null;

      // Group by actionIdx
      var groups = [], groupMap = {};
      billedExp.forEach(function (e) {
        var key = e.actionIdx != null ? String(e.actionIdx) : '';
        if (!groupMap[key]) {
          var title = (key !== '' && r.actions && r.actions[parseInt(key, 10)]) ? r.actions[parseInt(key, 10)].title : '';
          var g = { key: key, title: title, items: [] };
          groups.push(g);
          groupMap[key] = g;
        }
        groupMap[key].items.push(e);
      });
      var expRows = groups.map(function (g) {
        var header = g.title ? '<div class="view-exp-action-header">' + _esc(g.title) + '</div>' : '';
        var rows = g.items.map(function (e) {
          var attribution = e.acceptedFrom ? '<span class="view-exp-from">from ' + _esc(e.acceptedFrom) + '</span>' : '';
          var label = e.isDifference
            ? '<span style="color:var(--ink-faint);font-style:italic;">Difference</span>'
            : '<a href="#" class="view-exp-nav" data-id="' + _esc(e.id) + '">' + _esc(e.job || 'Expense') + '</a>' + attribution;
          return '<div class="view-exp-row">' +
                   '<span class="view-exp-label">' + label + '</span>' +
                   '<span class="view-exp-amount">' + fmt(parseFloat(e.amount) || 0) + '</span>' +
                 '</div>';
        }).join('');
        return '<div class="view-exp-group">' + header + rows + '</div>';
      }).join('');

      var diffLine = (Math.abs(diff) > 0.001 && billedExp.length)
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

      html += '<div class="view-fin-section-hd" data-section="exp">' +
        '<span class="view-fin-section-arrow">' + (_expOpen ? '\u25be' : '\u25b8') + '</span>' +
        '<span class="view-fin-section-name">Expenses</span>' +
        '<span class="view-fin-section-ct">' + billedExp.length + '</span>' +
        '<span style="flex:1;"></span>' +
        '<span style="font-family:var(--font-mono);font-size:9px;color:var(--ink-muted);">' + fmt(subtotal) + '</span>' +
      '</div>' +
      '<div class="view-fin-section-body" id="fin-sec-exp" style="' + (_expOpen ? '' : 'display:none') + '">' +
        '<div class="view-exp-list">' + expRows + '</div>' +
        diffLine +
      '</div>';
    }

    // ── COGS section
    if (cogsExp.length) {
      var totalCogs = cogsExp.reduce(function (s, e) { return s + (parseFloat(e.amount) || 0); }, 0);
      var cogsRows = cogsExp.map(function (e) {
        var chargeLabel = e.charge_type != null && COGS_CHARGE_LABELS_V[String(e.charge_type)]
          ? COGS_CHARGE_LABELS_V[String(e.charge_type)] : null;
        var jobText = e.job && e.job !== 'Cost of goods sold' ? e.job : null;
        var displayLabel = chargeLabel || jobText || 'COGS';
        var refNote = '';
        if (e.linkedExpenseId) {
          var lExp = null;
          for (var bi = 0; bi < billedExp.length; bi++) {
            if (billedExp[bi].id === e.linkedExpenseId) { lExp = billedExp[bi]; break; }
          }
          if (lExp) refNote = '<span style="font-family:var(--font-mono);font-size:8.5px;color:var(--ink-muted);margin-left:5px;">for: ' + _esc(lExp.job || 'expense') + '</span>';
        } else if (e.actionIdx != null && e.actionIdx !== undefined && r.actions && r.actions[parseInt(e.actionIdx, 10)]) {
          refNote = '<span style="font-family:var(--font-mono);font-size:8.5px;color:var(--ink-muted);margin-left:5px;">for: ' + _esc(r.actions[parseInt(e.actionIdx, 10)].title || 'action') + '</span>';
        } else if (e.action_quoted) {
          refNote = '<span style="font-family:var(--font-mono);font-size:8.5px;color:var(--ink-muted);margin-left:5px;">of ' + sym + parseFloat(e.action_quoted).toFixed(2) + ' quoted</span>';
        }
        return '<div class="view-exp-row">' +
                 '<span class="view-exp-label"><a href="#" class="view-exp-nav" data-id="' + _esc(e.id) + '">' +
                   _esc(displayLabel) + '</a>' +
                   '<span style="font-family:var(--font-mono);font-size:8.5px;color:var(--ink-muted);margin-left:5px;">COGS</span>' +
                   refNote +
                 '</span>' +
                 '<span class="view-exp-amount cogs">' + fmt(parseFloat(e.amount) || 0) + '</span>' +
               '</div>';
      }).join('');

      html += '<div class="view-fin-section-hd" data-section="cogs">' +
        '<span class="view-fin-section-arrow">' + (_cogsViewOpen ? '\u25be' : '\u25b8') + '</span>' +
        '<span class="view-fin-section-name">COGS</span>' +
        '<span class="view-fin-section-ct">' + cogsExp.length + '</span>' +
        '<span style="flex:1;"></span>' +
        '<span style="font-family:var(--font-mono);font-size:9px;color:var(--ink-faint);">' + fmt(totalCogs) + '</span>' +
      '</div>' +
      '<div class="view-fin-section-body" id="fin-sec-cogs" style="' + (_cogsViewOpen ? '' : 'display:none') + '">' +
        '<div class="view-exp-list">' + cogsRows + '</div>' +
      '</div>';
    }

    // ── Rejected (proposed but declined) items
    var rejected = r.rejectedItems || [];
    if (rejected.length) {
      var rejOpen = false;
      var rejRows = rejected.map(function (item, ri) {
        return '<div class="view-rejected-row">' +
          '<span class="view-rejected-label">' + _esc(item.l || 'Item') + '</span>' +
          '<span class="view-rejected-amount">' + fmt(parseFloat(item.a) || 0) + '</span>' +
          '<button class="view-rejected-accept" data-rej-idx="' + ri + '">Accept</button>' +
        '</div>';
      }).join('');
      html += '<div class="view-fin-section-hd" data-section="rej">' +
        '<span class="view-fin-section-arrow">\u25b8</span>' +
        '<span class="view-fin-section-name" style="color:var(--ink-faint);">Proposed</span>' +
        '<span class="view-fin-section-ct">' + rejected.length + '</span>' +
        '<span style="flex:1;"></span>' +
        '<span style="font-family:var(--font-mono);font-size:8.5px;color:var(--ink-faint);">Declined \u2014 accept?</span>' +
      '</div>' +
      '<div class="view-fin-section-body" id="fin-sec-rej" style="display:none">' +
        '<div class="view-exp-list">' + rejRows + '</div>' +
      '</div>';
    }

    // ── Payments section
    if (pays.length) {
      var totalPaid = pays.reduce(function (s, p) { return s + (parseFloat(p.amount) || 0); }, 0);
      var payRows = pays.map(function (p) {
        var label = p.date
          ? _esc(p.date) + (p.job ? ' \xb7 ' + _esc(p.job) : '')
          : _esc(p.job || 'Payment');
        return '<div class="view-pay-row">' +
                 '<span class="view-pay-label"><a href="#" class="view-pay-nav" data-id="' + _esc(p.id) + '">' + label + '</a></span>' +
                 '<span class="view-pay-amount">' + fmt(parseFloat(p.amount) || 0) + '</span>' +
               '</div>';
      }).join('');

      html += '<div class="view-fin-section-hd" data-section="pay">' +
        '<span class="view-fin-section-arrow">' + (_payOpen ? '\u25be' : '\u25b8') + '</span>' +
        '<span class="view-fin-section-name">Payments</span>' +
        '<span class="view-fin-section-ct">' + pays.length + '</span>' +
        '<span style="flex:1;"></span>' +
        '<span style="font-family:var(--font-mono);font-size:9px;color:var(--ink-muted);">' + fmt(totalPaid) + '</span>' +
      '</div>' +
      '<div class="view-fin-section-body" id="fin-sec-pay" style="' + (_payOpen ? '' : 'display:none') + '">' +
        '<div class="view-exp-list">' + payRows + '</div>' +
        '<div style="text-align:right;padding:4px 0 2px;">' +
          '<button class="view-diff-link" id="view-add-payment">+ Record</button>' +
        '</div>' +
      '</div>';
    } else if (!pays.length && customerPrice > 0) {
      html += '<div style="font-family:var(--font-mono);font-size:10px;color:var(--ink-faint);padding:6px 0;">' +
        'No payments recorded. <button class="view-diff-link" id="view-add-payment">+ Record</button>' +
      '</div>';
    }

    // ── Summary totals (always visible)
    html += _renderFinTotals(r, billedExp, cogsExp, pays, sym, vatLabel);

    html += '</div></div>';
    return html;
  }

  function _renderFinTotals(r, billedExp, cogsExp, pays, sym, vatLabel) {
    var fmt = function (n) { return sym + n.toFixed(2); };
    var customerPrice = parseFloat(r.amount) || 0;
    var subtotal = billedExp.reduce(function (s, e) { return s + (parseFloat(e.amount) || 0); }, 0);
    var totalCogs = cogsExp.reduce(function (s, e) { return s + (parseFloat(e.amount) || 0); }, 0);
    var totalPaid = pays.reduce(function (s, p) { return s + (parseFloat(p.amount) || 0); }, 0);
    var outstanding = customerPrice - totalPaid;

    var html = '<div class="view-fin-totals">';

    if (subtotal > 0) {
      html += '<div class="view-tally-row">' +
        '<span class="view-tally-label">Expenses</span>' +
        '<span class="view-tally-value">' + fmt(subtotal) + '</span>' +
      '</div>';
    }
    if (totalCogs > 0) {
      html += '<div class="view-tally-row" style="opacity:0.6;">' +
        '<span class="view-tally-label">COGS (cost)</span>' +
        '<span class="view-tally-value" style="font-weight:400;">' + fmt(totalCogs) + '</span>' +
      '</div>';
    }
    if (customerPrice > 0) {
      html += '<div class="view-tally-row view-tally-total">' +
        '<span class="view-tally-label">' +
          (r.record_type === 'quote' ? 'Quote total'
         : r.record_type === 'invoice' ? 'Invoice total'
         : 'Customer price') +
        '</span>' +
        '<span class="view-tally-value">' + fmt(customerPrice) +
          (vatLabel ? ' <span style="font-family:var(--font-mono);font-size:9px;font-weight:400;color:var(--ink-muted);">' + vatLabel + '</span>' : '') +
        '</span>' +
      '</div>';
    }

    if (pays.length > 0) {
      html += '<div class="view-tally-row">' +
        '<span class="view-tally-label">Received</span>' +
        '<span class="view-tally-value" style="font-weight:400;">' + fmt(totalPaid) + '</span>' +
      '</div>';
    }

    if (Math.abs(outstanding) < 0.001 && (customerPrice > 0 || totalPaid > 0)) {
      html += '<div class="view-tally-row" style="color:#2a6e2a;">' +
        '<span class="view-tally-label" style="color:#2a6e2a;">\u2713 Paid in full</span>' +
        '<span></span>' +
      '</div>';
    } else if (outstanding < 0) {
      html += '<div class="view-tally-row" style="color:#b84040;">' +
        '<span class="view-tally-label" style="color:#b84040;">Overpayment</span>' +
        '<span class="view-tally-value">' + fmt(Math.abs(outstanding)) + '</span>' +
      '</div>';
    } else if (outstanding > 0 && pays.length > 0) {
      html += '<div class="view-tally-row">' +
        '<span class="view-tally-label">Outstanding</span>' +
        '<span class="view-tally-value">' + fmt(outstanding) + '</span>' +
      '</div>';
    }

    // Payment methods selector
    try {
      var pmethods = JSON.parse(localStorage.getItem('wp_pref_payment_methods') || '[]');
      if (pmethods.length > 0) {
        var savedMethod = r.paymentMethod || '';
        var opts = '<option value="">Payment method\u2026</option>' +
          pmethods.map(function (m) {
            return '<option value="' + _esc(m) + '"' + (savedMethod === m ? ' selected' : '') + '>' + _esc(m) + '</option>';
          }).join('');
        html += '<div class="view-pay-methods-row">' +
          '<span class="view-pay-methods-label">Method</span>' +
          '<select class="view-pay-methods-select" id="view-pay-method-select">' + opts + '</select>' +
        '</div>';
      }
    } catch (_) {}

    html += '</div>';
    return html;
  }

  function _renderCommentsSidebar() {
    var html = '<div class="view-comments-col" id="view-comments-col">';

    html += '<div class="view-comment-input-wrap">' +
      '<input class="view-comment-input" id="view-comment-input" type="text" ' +
          'placeholder="Private note\u2026" autocomplete="off">' +
    '</div>';

    if (_comments.length > 0) {
      html += '<div class="view-comment-list" id="view-comment-list">';
      var sorted = _comments.slice().sort(function (a, b) { return b.ts - a.ts; });
      sorted.forEach(function (c, idx) {
        var d  = new Date(c.ts);
        var mo = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        var ti = d.toTimeString().slice(0, 5);
        html += '<div class="view-comment" data-comment-ts="' + c.ts + '">' +
          '<p class="view-comment-text">' + _esc(c.text) + '</p>' +
          '<div class="view-comment-meta">' +
            '<span class="view-comment-ts">' + mo + ' \xb7 ' + ti + '</span>' +
            '<button class="view-comment-pin" data-comment-idx="' + idx + '" title="Save to Personal collection">+</button>' +
          '</div>' +
        '</div>';
      });
      html += '</div>';
    }

    html += '</div>';
    return html;
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
    var cogsBtn    = document.getElementById('view-btn-cogs');
    var editBtn    = document.getElementById('view-btn-edit');
    var archiveBtn = document.getElementById('view-btn-archive');

    if (parentBtn)  parentBtn.addEventListener('click',  function () { App.showView(parentId); });
    var parentCtxBtn = document.getElementById('view-btn-parent-ctx');
    if (parentCtxBtn) parentCtxBtn.addEventListener('click', function () { App.showView(parentId); });
    if (shareBtn)   shareBtn.addEventListener('click',   function () { App.showShare(id); });
    if (cogsBtn)    cogsBtn.addEventListener('click',    function () { App.showCogs(_record.parentId); });
    if (editBtn)    editBtn.addEventListener('click',    function () { App.showWizard(id); });
    if (archiveBtn) archiveBtn.addEventListener('click', _doArchive);

    // Quick expense / COGS from action bar
    var quickExpBtn = document.getElementById('view-btn-quick-expense');
    if (quickExpBtn) quickExpBtn.addEventListener('click', function () { App.showExpense(id); });
    var quickCogsBtn = document.getElementById('view-btn-quick-cogs');
    if (quickCogsBtn) quickCogsBtn.addEventListener('click', function () { App.showCogs(id); });

    _bindFinancialEvents(id);

    // Comment input — Enter submits
    var commentInput = document.getElementById('view-comment-input');
    if (commentInput) {
      commentInput.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter') return;
        var text = this.value.trim();
        if (!text) return;
        this.value = '';
        var c = { text: text, ts: Date.now() };
        _comments = _comments.concat([c]);
        RecordService.update(id, { comments: _comments }).then(function (updated) {
          _record = updated;
          _render();
          // Re-focus the input after re-render
          var inp = document.getElementById('view-comment-input');
          if (inp) inp.focus();
        });
      });
    }

    // Pin comment to Personal collection
    document.querySelectorAll('.view-comment-pin').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx  = parseInt(this.dataset.commentIdx, 10);
        var sorted = _comments.slice().sort(function (a, b) { return b.ts - a.ts; });
        var c = sorted[idx];
        if (!c) return;
        var self = this;
        PersonalService.capture({
          text: c.text,
          source: 'quick-note',
          linkedRecordId: id,
        }).then(function () {
          self.classList.add('pinned');
          self.title = 'Saved to Personal';
        });
      });
    });

    // Inline action add
    var addInput = document.getElementById('view-action-add-input');
    var addBtn   = document.getElementById('view-action-add-btn');
    if (addBtn && addInput) {
      var _doAddAction = function () {
        var title = addInput.value.trim();
        if (!title) return;
        var r = _record;
        var updatedActions = (r.actions || []).concat([{ title: title, notes: '' }]);
        RecordService.update(r.id, { actions: updatedActions }).then(function (updated) {
          _record = updated;
          addInput.value = '';
          _render();
        });
      };
      addBtn.addEventListener('click', _doAddAction);
      addInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') _doAddAction();
      });
    }
  }

  function _bindFinancialEvents(id) {
    // Financial summary link
    var summaryLink = document.getElementById('view-fin-summary-link');
    if (summaryLink) {
      summaryLink.addEventListener('click', function (e) {
        e.preventDefault();
        App.showFinancial(id);
      });
    }

    // Record count badge → records view
    var countBadge = document.getElementById('view-fin-count-badge');
    if (countBadge) {
      countBadge.addEventListener('click', function () {
        App.showFinancial(id, 'records');
      });
    }

    // Section collapse/expand toggles (in-place, no re-render)
    document.querySelectorAll('.view-fin-section-hd').forEach(function (hd) {
      hd.addEventListener('click', function () {
        var section = this.dataset.section;
        var body  = document.getElementById('fin-sec-' + section);
        var arrow = this.querySelector('.view-fin-section-arrow');
        if (!body) return;
        var open = body.style.display !== 'none';
        body.style.display = open ? 'none' : '';
        if (arrow) arrow.textContent = open ? '\u25b8' : '\u25be';
        if (section === 'exp')  _expOpen      = !open;
        if (section === 'cogs') _cogsViewOpen = !open;
        if (section === 'pay')  _payOpen      = !open;
      });
    });

    // Expense / COGS navigation
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

    // Payment method selector
    var pmSelect = document.getElementById('view-pay-method-select');
    if (pmSelect) {
      pmSelect.addEventListener('change', function () {
        var method = this.value;
        RecordService.update(id, { paymentMethod: method }).then(function (updated) {
          _record = updated;
        });
      });
    }

    // Accept rejected items
    document.querySelectorAll('.view-rejected-accept').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(this.dataset.rejIdx, 10);
        var r = _record;
        var rejected = (r.rejectedItems || []).slice();
        var item = rejected.splice(idx, 1)[0];
        if (!item) return;
        var now = Date.now();
        var eid = 'rv_' + now.toString(36) + '_acc';
        localStorage.setItem('wp_record_' + eid, JSON.stringify({
          id: eid, parentId: r.id,
          recordType: 'expense', job: item.l || 'Expense',
          amount: item.a || '0', currency: r.currency || 'CAD',
          expense_billing: 'customer',
          acceptedFrom: item.from || null,
          draft: false, createdAt: now, updatedAt: now, fromReview: true,
        }));
        RecordService.update(r.id, { rejectedItems: rejected }).then(function (updated) {
          _record = updated;
          _expenses = _expenses.concat([{ id: eid, parentId: r.id, recordType: 'expense',
            job: item.l || 'Expense', amount: item.a || '0', currency: r.currency || 'CAD',
            expense_billing: 'customer', acceptedFrom: item.from || null }]);
          _render();
        });
      });
    });

    // Action expense buttons
    document.querySelectorAll('.view-action-exp-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        App.showExpense(id, null, parseInt(this.dataset.actionIdx, 10));
      });
    });

    // Action COGS buttons
    document.querySelectorAll('.view-action-cogs-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var aidx = parseInt(this.dataset.actionIdx, 10);
        // Pre-fill action_quoted with sum of billed expenses for this action
        var billedSum = (_expenses || []).filter(function (e) {
          return e.expense_billing !== 'cogs' && String(e.actionIdx) === String(aidx);
        }).reduce(function (s, e) { return s + (parseFloat(e.amount) || 0); }, 0);
        App.showCogsAction(id, aidx, billedSum > 0 ? billedSum.toFixed(2) : null);
      });
    });
  }

  function _rerenderActions() {
    var r = _record;
    if (!r || !r.actions || !r.actions.length) return;
    var actListEl = document.getElementById('view-actions-list');
    if (!actListEl) return;
    actListEl.outerHTML = _renderActions(r.actions);
    // Re-bind action buttons on new DOM nodes
    document.querySelectorAll('.view-action-exp-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        App.showExpense(r.id, null, parseInt(this.dataset.actionIdx, 10));
      });
    });
    document.querySelectorAll('.view-action-cogs-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var aidx = parseInt(this.dataset.actionIdx, 10);
        var billedSum = (_expenses || []).filter(function (e) {
          return e.expense_billing !== 'cogs' && String(e.actionIdx) === String(aidx);
        }).reduce(function (s, e) { return s + (parseFloat(e.amount) || 0); }, 0);
        App.showCogsAction(r.id, aidx, billedSum > 0 ? billedSum.toFixed(2) : null);
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
