/* ============================================================
   ViewScreen — read-only record display with inline actions
   ============================================================ */

var ViewScreen = (function () {
  'use strict';

  var _record        = null;
  var _approval      = null;
  var _stylesAdded   = false;
  var _actionsFilter = '';

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

      /* Prose (story / details) */
      '.view-prose {',
      '  font-family:var(--font-body); font-size:15.5px;',
      '  color:var(--ink); line-height:1.75;',
      '}',

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

    RecordService.get(params.id).then(function (r) {
      if (!r) { App.showList(); return; }
      _record = r;
      _approval = null;

      if (r.chainRef && r.record_type !== 'ack') {
        RecordService.findByChainRef(r.chainRef).then(function(linked) {
          var acks = linked.filter(function(lr) {
            return lr.record_type === 'ack' && lr.id !== r.id;
          });
          _approval = acks.length ? acks[0] : null;
          _render();
        });
      } else {
        _render();
      }
    });
  }

  function onHide() { _record = null; _approval = null; _actionsFilter = ''; }

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
    if (r.parentId) {
      html += '<button class="view-parent-link" id="view-btn-parent">\u2190 Parent record</button>';
    }
    if (r.recordType !== 'expense') {
      html += '<button class="btn-primary" id="view-btn-share">Share</button>';
    }
    html += '<button class="btn-ghost" id="view-btn-edit">Edit</button>';
    html += '<button class="btn-ghost" id="view-btn-archive">Archive</button>';
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
        '<p class="view-prose">' + _escNl(r.story) + '</p>');
    }

    if (r.details) {
      html += _renderCardSection(
        'Notes\u200b<span class="view-private-badge">Private</span>',
        '<p class="view-prose">' + _escNl(r.details) + '</p>',
        true
      );
    }

    if (r.receivedAt && r.recordType !== 'expense') {
      html += _renderCardSection('Source',
        '<p class="view-prose" style="font-style:italic;font-size:14px;">Received via shared link</p>');
    }

    html += '</div>'; // .card

    // ── Financial card (separate, below main card)
    if (r.amount) {
      html += '<div class="card view-financial-card">';
      html += _renderCardSection('Financial', _renderFinancial(r));
      html += '</div>';
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
      filtered = ordered.filter(function(a) {
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
      html += '<li class="view-action-item">' +
                '<span class="view-action-num">' + num + '</span>' +
                '<div>' +
                  '<div class="view-action-title">' + _esc(a.title) + '</div>' +
                  (a.notes ? '<div class="view-action-notes">' + _esc(a.notes) + '</div>' : '') +
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

  function _renderFinancial(r) {
    var CHARGE_LABELS = {
      '':   'General / labour',
      '1':  'Urgency / emergency',
      '2':  'After-hours',
      '3':  'Travel / mileage',
      '4':  'Delivery / courier',
      '5':  'Equipment hire',
      '6':  'Materials / consumables',
      '7':  'Subcontractor',
      '8':  'Cancellation fee',
      '9':  'Deposit / retainer',
      '10': 'Credit / discount',
      '11': 'Warranty adjustment',
      '12': 'Regulatory levy',
      '13': 'FX adjustment',
      '14': 'Payment handling',
    };
    var sym = r.currency === 'EUR' ? '\u20ac' : r.currency === 'USD' ? '$' : '\u00a3';
    var vatLabel = r.vat === 'standard' ? ' inc. 20% VAT'
                 : r.vat === 'reduced'  ? ' inc. 5% VAT'
                 : r.vat === 'zero'     ? ' zero-rated' : '';
    var chargeStr = r.charge_type != null ? String(r.charge_type) : '';
    var chargeLabel = CHARGE_LABELS[chargeStr] || '';
    var html = '<div class="view-financial">';
    html += '<div>';
    if (chargeLabel) {
      html += '<div class="view-financial-charge">' + _esc(chargeLabel) + '</div>';
    }
    html += '<div class="view-financial-amount">' + sym + _esc(r.amount) + '</div>';
    if (vatLabel) {
      html += '<div class="view-financial-tax">' + vatLabel + '</div>';
    }
    html += '</div>';
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

    var parentBtn  = document.getElementById('view-btn-parent');
    var shareBtn   = document.getElementById('view-btn-share');
    var editBtn    = document.getElementById('view-btn-edit');
    var archiveBtn = document.getElementById('view-btn-archive');

    if (parentBtn)  parentBtn.addEventListener('click',  function () { App.showView(parentId); });
    if (shareBtn)   shareBtn.addEventListener('click',   function () { App.showShare(id); });
    if (editBtn)    editBtn.addEventListener('click',    function () { App.showWizard(id); });
    if (archiveBtn) archiveBtn.addEventListener('click', _doArchive);

    // Action filter toolbar (live re-render preserving filter state)
    var searchEl = document.getElementById('view-act-search');
    if (searchEl) {
      searchEl.addEventListener('input', function () {
        _actionsFilter = this.value;
        _rerenderActions();
      });
    }
  }

  function _rerenderActions() {
    var r = _record;
    if (!r || !r.actions || !r.actions.length) return;
    var screenEl    = document.getElementById('screen-view');
    var toolbarEl   = screenEl && screenEl.querySelector('.view-actions-toolbar');
    var actListEl   = toolbarEl && toolbarEl.nextElementSibling;
    if (!actListEl) return;
    // Replace just the list portion (after toolbar)
    var newHtml = _renderActions(r.actions);
    actListEl.outerHTML = newHtml;
  }

  function _doArchive() {
    if (!confirm('Archive this record? It will be removed from your active list.')) return;
    RecordService.archive(_record.id).then(function () {
      if (typeof WorkpadsPanel !== 'undefined' && WorkpadsPanel.refresh) {
        WorkpadsPanel.refresh();
      }
      App.toast('Record archived');
      App.showList();
    });
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
