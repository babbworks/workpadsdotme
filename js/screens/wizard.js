/* ============================================================
   WizardScreen — PADS creation / edit form
   Tabs: Process · Actions · Details · Story
   ============================================================ */

var WizardScreen = (function () {
  'use strict';

  // ── State ────────────────────────────────────────────────────
  var _record      = {};
  var _id          = null;
  var _mode        = 'new';   // 'new' | 'edit'
  var _tab         = 'process';
  var _stylesAdded = false;

  var TABS = [
    { key: 'process', label: 'Process' },
    { key: 'actions', label: 'Actions' },
    { key: 'details', label: 'Details' },
    { key: 'story',   label: 'Story'   },
  ];

  // ── Styles ───────────────────────────────────────────────────

  function _addStyles() {
    if (_stylesAdded) return;
    _stylesAdded = true;
    var s = document.createElement('style');
    s.textContent = [
      '.wiz-wrap { max-width:680px; margin:0 auto; padding:36px 32px 80px; }',

      '.wiz-header {',
      '  display:flex; align-items:flex-start;',
      '  justify-content:space-between; gap:16px; margin-bottom:24px;',
      '}',

      '.wiz-footer {',
      '  display:flex; justify-content:space-between; align-items:center;',
      '  margin-top:28px; padding-top:20px; border-top:1px solid var(--rule-light);',
      '}',
      '.wiz-footer-right { display:flex; gap:8px; }',

      /* Actions list */
      '.wiz-actions-list { }',

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
      '  transition:color .13s;',
      '}',
      '.wiz-action-remove:hover { color:var(--stamp); }',

      '.wiz-add-row {',
      '  padding:14px 20px; border-top:1px solid var(--rule-light);',
      '}',

      '.wiz-actions-empty {',
      '  padding:36px 24px; text-align:center;',
      '}',

      /* Tab bar override — no bottom margin, card sits right below */
      '.wiz-wrap .tab-bar { margin-bottom:20px; }',

      /* Keyboard hint */
      '.wiz-kbd-hint {',
      '  font-family:var(--font-mono); font-size:10px;',
      '  color:var(--ink-faint); letter-spacing:.04em;',
      '}',
    ].join('\n');
    document.head.appendChild(s);
  }

  // ── Lifecycle ────────────────────────────────────────────────

  function onShow(params) {
    _addStyles();
    _mode = params.mode || 'new';
    _tab  = 'process';

    if (_mode === 'edit' && params.id) {
      _id = params.id;
      RecordService.get(_id).then(function (r) {
        _record = r || {};
        _render();
      });
    } else {
      // New: create a shell record immediately to get an ID
      var _identity = ActivityService.getSenderIdentity();
      RecordService.create({
        worker: (_identity && _identity.name) || '',
      }).then(function (r) {
        _record = r;
        _id     = r.id;
        _render();
      });
    }
  }

  function onHide() {
    // Nothing — state is discarded on next onShow
  }

  // ── Render ───────────────────────────────────────────────────

  function _render() {
    var el = document.getElementById('screen-wizard');
    el.innerHTML = (
      '<div class="wiz-wrap">' +
        _renderHeader() +
        _renderTabBar() +
        '<div id="wiz-body">' + _renderTabBody(_tab) + '</div>' +
        _renderFooter() +
      '</div>'
    );
    _bindEvents(el);
  }

  function _renderHeader() {
    var title = _mode === 'new'
      ? 'New workpad'
      : 'Edit record';
    var sub = (_mode === 'edit' && _record.job)
      ? '<p class="screen-subtitle" style="margin-bottom:0;">' + _esc(_record.job) + '</p>'
      : '';
    return (
      '<div class="wiz-header">' +
        '<div><h1 class="screen-title">' + title + '</h1>' + sub + '</div>' +
        '<button class="btn-ghost" id="wiz-cancel-top">Cancel</button>' +
      '</div>'
    );
  }

  function _renderTabBar() {
    var html = '<div class="tab-bar">';
    TABS.forEach(function (t) {
      html += '<button class="tab-btn' + (t.key === _tab ? ' active' : '') + '" data-tab="' + t.key + '">' +
                t.label +
              '</button>';
    });
    return html + '</div>';
  }

  function _renderFooter() {
    return (
      '<div class="wiz-footer">' +
        '<button class="btn-ghost" id="wiz-cancel-bottom">Cancel</button>' +
        '<div class="wiz-footer-right">' +
          '<span class="wiz-kbd-hint">Ctrl+S to save</span>' +
          '<button class="btn-ghost" id="wiz-save-draft">Save draft</button>' +
          '<button class="btn-primary" id="wiz-save">Save workpad</button>' +
        '</div>' +
      '</div>'
    );
  }

  // ── Tab bodies ───────────────────────────────────────────────

  function _renderTabBody(tab) {
    switch (tab) {
      case 'process': return _renderProcess();
      case 'actions': return _renderActions();
      case 'details': return _renderDetails();
      case 'story':   return _renderStory();
      default:        return '';
    }
  }

  function _renderProcess() {
    return (
      '<div class="card">' +
        '<div class="card-section">' +
          _field('job',      'Job',      'text', _record.job      || '', true,  'What is the job?') +
          _field('customer', 'Customer', 'text', _record.customer || '', false, 'Customer or client name') +
          _field('date',     'Date',     'date', _record.date     || '', false, '') +
        '</div>' +
      '</div>'
    );
  }

  function _renderDetails() {
    return (
      '<div class="card">' +
        '<div class="card-section">' +
          _field('worker',         'Worker',         'text', _record.worker         || '', false, 'Person doing the work') +
          _field('location',       'Location',       'text', _record.location       || '', false, 'Address or site') +
          _field('customer_phone', 'Customer phone', 'tel',  _record.customer_phone || '', false, '+44 7700 …') +
        '</div>' +
        '<div class="card-section">' +
          _field('start_time',   'Start time',   'text', _record.start_time   || '', false, '09:00') +
          _field('end_time',     'End time',     'text', _record.end_time     || '', false, '17:00') +
          _field('meeting_time', 'Meeting time', 'text', _record.meeting_time || '', false, 'Scheduled arrival') +
        '</div>' +
      '</div>'
    );
  }

  function _renderActions() {
    var actions = _record.actions || [];
    var html = '<div class="card">';

    if (actions.length === 0) {
      html += '<div class="wiz-actions-empty">' +
                '<p class="empty-state-title" style="margin-bottom:6px;">No actions yet</p>' +
                '<p class="empty-state-sub">Break the job into steps</p>' +
              '</div>';
    } else {
      html += '<div class="wiz-actions-list">';
      actions.forEach(function (a, i) {
        var num = (i < 9 ? '0' : '') + (i + 1);
        html += (
          '<div class="wiz-action">' +
            '<span class="wiz-action-num">' + num + '</span>' +
            '<div class="wiz-action-fields">' +
              '<input class="field-input wiz-action-title" type="text"' +
                ' placeholder="Step title" value="' + _esc(a.title || '') + '"' +
                ' data-action-title="' + i + '">' +
              '<input class="field-input wiz-action-notes" type="text"' +
                ' placeholder="Notes \u2014 optional" value="' + _esc(a.notes || '') + '"' +
                ' data-action-notes="' + i + '">' +
            '</div>' +
            '<button class="wiz-action-remove" data-remove="' + i + '" title="Remove action">\u00d7</button>' +
          '</div>'
        );
      });
      html += '</div>';
    }

    html += '<div class="wiz-add-row">' +
              '<button class="btn-ghost" id="wiz-add-action">+ Add action</button>' +
            '</div>';
    html += '</div>';
    return html;
  }

  function _renderStory() {
    return (
      '<div class="card">' +
        '<div class="card-section">' +
          '<div class="field-group">' +
            '<label class="field-label" for="f-story">Story</label>' +
            '<textarea class="field-input field-textarea" id="f-story" rows="6"' +
              ' placeholder="What happened? A plain account of the work\u2026">' +
              _esc(_record.story || '') +
            '</textarea>' +
            '<p class="field-hint">Narrative \u2014 readable by the customer</p>' +
          '</div>' +
        '</div>' +
        '<div class="card-section">' +
          '<div class="field-group">' +
            '<label class="field-label" for="f-details">Notes / Details</label>' +
            '<textarea class="field-input field-textarea" id="f-details" rows="5"' +
              ' placeholder="Technical notes, materials, measurements\u2026">' +
              _esc(_record.details || '') +
            '</textarea>' +
            '<p class="field-hint">Internal \u2014 included in the share link</p>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  // ── Field helper ─────────────────────────────────────────────

  function _field(key, label, type, value, required, placeholder) {
    return (
      '<div class="field-group">' +
        '<label class="field-label" for="f-' + key + '">' +
          label +
          (required ? ' <span class="field-required">*</span>' : '') +
        '</label>' +
        '<input class="field-input" id="f-' + key + '" type="' + type + '"' +
          ' value="' + _esc(value) + '"' +
          ' placeholder="' + _esc(placeholder) + '">' +
      '</div>'
    );
  }

  // ── Collect ──────────────────────────────────────────────────

  function _collect() {
    // Always collect all tabs that have rendered fields
    _tryCollect('job',            'f-job');
    _tryCollect('customer',       'f-customer');
    _tryCollect('date',           'f-date');
    _tryCollect('worker',         'f-worker');
    _tryCollect('location',       'f-location');
    _tryCollect('customer_phone', 'f-customer_phone');
    _tryCollect('start_time',     'f-start_time');
    _tryCollect('end_time',       'f-end_time');
    _tryCollect('meeting_time',   'f-meeting_time');
    _tryCollect('story',          'f-story');
    _tryCollect('details',        'f-details');
    _collectActions();
  }

  function _tryCollect(key, elId) {
    var input = document.getElementById(elId);
    if (input) _record[key] = input.value.trim();
  }

  function _collectActions() {
    var titles = document.querySelectorAll('[data-action-title]');
    if (!titles.length) return; // actions tab not visible — keep existing
    var notes = document.querySelectorAll('[data-action-notes]');
    var arr = [];
    for (var i = 0; i < titles.length; i++) {
      arr.push({
        title: titles[i].value || '',
        notes: notes[i] ? notes[i].value || '' : '',
      });
    }
    _record.actions = arr;
  }

  // ── Tab switching ────────────────────────────────────────────

  function _switchTab(tab) {
    if (tab === _tab) return;
    _collect();
    RecordService.save(_id, _record); // auto-save, fire and forget

    _tab = tab;

    // Update tab bar active state without full re-render
    document.querySelectorAll('.tab-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    // Swap body content
    var body = document.getElementById('wiz-body');
    if (body) {
      body.innerHTML = _renderTabBody(tab);
      _bindBodyEvents();
    }

    // Auto-focus
    _autoFocus();
  }

  function _autoFocus() {
    var targets = {
      process: 'f-job',
      details: 'f-worker',
      story:   'f-story',
    };
    var id = targets[_tab];
    if (id) {
      var input = document.getElementById(id);
      if (input && !input.value) input.focus();
    }
  }

  // ── Save / Cancel ────────────────────────────────────────────

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
      App.toast('Job title is required');
      return;
    }

    RecordService.save(_id, _record).then(function (saved) {
      // Auto-populate Block Registry
      if (saved.customer && saved.customer_phone) {
        BlockRegistry.save(saved.customer, saved.customer_phone);
      }
      // Refresh the panel
      if (typeof WorkpadsPanel !== 'undefined' && WorkpadsPanel.refresh) {
        WorkpadsPanel.refresh();
      }
      App.showView(_id);
    });
  }

  function _saveDraft() {
    _collect();
    RecordService.save(_id, _record).then(function () {
      App.toast('Draft saved');
    });
  }

  function _cancel() {
    if (_mode === 'new') {
      RecordService.delete(_id).then(function () { App.showList(); });
    } else {
      App.showView(_id);
    }
  }

  // ── Event binding ────────────────────────────────────────────

  function _bindEvents(screenEl) {
    // Tab buttons
    screenEl.querySelectorAll('.tab-btn').forEach(function (btn) {
      btn.addEventListener('click', function () { _switchTab(this.dataset.tab); });
    });

    // Cancel
    ['wiz-cancel-top', 'wiz-cancel-bottom'].forEach(function (id) {
      var btn = document.getElementById(id);
      if (btn) btn.addEventListener('click', _cancel);
    });

    // Save + draft
    var saveBtn  = document.getElementById('wiz-save');
    var draftBtn = document.getElementById('wiz-save-draft');
    if (saveBtn)  saveBtn.addEventListener('click',  _save);
    if (draftBtn) draftBtn.addEventListener('click', _saveDraft);

    // Ctrl/Cmd + S
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
    // Add action button
    var addBtn = document.getElementById('wiz-add-action');
    if (addBtn) {
      addBtn.addEventListener('click', function () {
        _collectActions();
        _record.actions = (_record.actions || []).concat([{ title: '', notes: '' }]);
        var body = document.getElementById('wiz-body');
        if (body) {
          body.innerHTML = _renderTabBody('actions');
          _bindBodyEvents();
          // Focus the new title input
          var inputs = document.querySelectorAll('.wiz-action-title');
          if (inputs.length) inputs[inputs.length - 1].focus();
        }
      });
    }

    // Remove action buttons
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
