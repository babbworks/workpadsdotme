/* ============================================================
   PersonalPanel — right sidebar: personal notes list
   ============================================================ */

var PersonalPanel = (function () {
  'use strict';

  var FIELD_LABELS = {
    job: 'Job', customer: 'Customer', date: 'Date',
    location: 'Location', customer_phone: 'Phone',
    worker: 'Worker', start_time: 'Start', end_time: 'End',
    meeting_time: 'Meeting', story: 'Story', details: 'Details',
  };

  var MAX_VISIBLE = 6;

  var _notes          = [];
  var _activeRecordId = null;
  var _showAll        = false;
  var _stylesAdded    = false;

  // ── Styles ───────────────────────────────────────────────────

  function _addStyles() {
    if (_stylesAdded) return;
    _stylesAdded = true;
    var s = document.createElement('style');
    s.textContent = [
      /* Panel inner layout — flex column filling panel-body */
      '#panel-right-body {',
      '  display:flex; flex-direction:column;',
      '  overflow:hidden; padding:0;',
      '}',

      '.ppp-add-bar {',
      '  flex-shrink:0; padding:8px 10px;',
      '  border-bottom:1px solid var(--panel-border);',
      '}',
      '.ppp-add-input {',
      '  display:block; width:100%;',
      '  font-family:var(--font-mono); font-size:11px;',
      '  color:var(--ink); background:var(--card);',
      '  border:1px solid var(--rule); border-radius:3px;',
      '  padding:6px 9px; resize:none;',
      '  transition:border-color .13s;',
      '  -webkit-appearance:none;',
      '  height:56px; overflow-y:auto;',
      '  overscroll-behavior:contain;',
      '}',
      '.ppp-add-input:focus { outline:none; border-color:var(--stamp-border); }',
      '.ppp-add-input::placeholder { color:var(--ink-faint); }',
      '.ppp-add-hint {',
      '  font-family:var(--font-mono); font-size:9px;',
      '  color:var(--ink-faint); margin-top:4px;',
      '  letter-spacing:.04em;',
      '}',

      '.ppp-list {',
      '  flex:1; overflow-y:auto; overflow-x:hidden;',
      '  overscroll-behavior:contain;',
      '}',
      '.ppp-list::-webkit-scrollbar { width:3px; }',
      '.ppp-list::-webkit-scrollbar-thumb { background:var(--rule); border-radius:2px; }',

      '.ppp-item {',
      '  padding:10px 14px; border-bottom:1px solid var(--rule-light);',
      '  cursor:default; position:relative;',
      '}',
      '.ppp-item:last-child { border-bottom:none; }',
      '.ppp-item:hover { background:rgba(0,0,0,.025); }',
      '.ppp-item:hover .ppp-item-delete { opacity:1; }',

      '.ppp-item-text {',
      '  font-family:var(--font-body); font-size:11px;',
      '  color:var(--ink); line-height:1.45;',
      '  word-break:break-word;',
      '  margin-bottom:2px;',
      '}',
      '.ppp-click-hint {',
      '  display:inline; font-size:9px; font-family:var(--font-mono);',
      '  color:var(--ink-faint); letter-spacing:.04em; margin-left:4px;',
      '}',
      '.ppp-item-tags {',
      '  display:block; margin-bottom:3px;',
      '  font-family:var(--font-mono); font-size:9px;',
      '  color:var(--stamp); letter-spacing:.04em;',
      '}',
      '.ppp-item-time {',
      '  font-family:var(--font-mono); font-size:9px;',
      '  color:var(--ink-faint);',
      '}',
      '.ppp-item-opts {',
      '  position:absolute; top:8px; right:8px;',
      '  font-family:var(--font-mono); font-size:9px;',
      '  color:var(--ink-faint); background:none; border:none;',
      '  cursor:pointer; padding:2px 5px; opacity:0;',
      '  transition:opacity .12s, color .12s; border-radius:2px;',
      '  line-height:1;',
      '}',
      '.ppp-item:hover .ppp-item-opts { opacity:1; }',
      '.ppp-item-opts:hover { color:var(--ink-mid); background:var(--rule-light); }',
      '.ppp-item-menu {',
      '  position:absolute; top:24px; right:8px; z-index:100;',
      '  background:var(--card-raised); border:1px solid var(--rule);',
      '  border-radius:3px; box-shadow:0 4px 12px rgba(25,20,15,.12);',
      '  min-width:110px; overflow:hidden;',
      '}',
      '.ppp-item-menu-opt {',
      '  display:block; width:100%; text-align:left;',
      '  padding:7px 12px;',
      '  font-family:var(--font-mono); font-size:10px; font-weight:700;',
      '  letter-spacing:.06em; text-transform:uppercase;',
      '  color:var(--ink-mid); background:none; border:none; border-bottom:1px solid var(--rule-light);',
      '  cursor:pointer; transition:background .1s, color .1s;',
      '}',
      '.ppp-item-menu-opt:last-child { border-bottom:none; }',
      '.ppp-item-menu-opt:hover { background:var(--rule-light); color:var(--ink); }',
      '.ppp-item-menu-opt.danger:hover { color:#b33a0a; }',

      '.ppp-empty {',
      '  padding:32px 16px; text-align:center;',
      '  font-family:var(--font-body); font-style:italic;',
      '  font-size:13px; color:var(--ink-faint);',
      '  line-height:1.5;',
      '}',

      '.ppp-show-all {',
      '  display:block; width:100%;',
      '  padding:8px 14px;',
      '  font-family:var(--font-mono); font-size:9px; font-weight:700;',
      '  letter-spacing:.08em; text-transform:uppercase;',
      '  color:var(--ink-muted); background:none; border:none;',
      '  border-top:1px solid var(--rule-light); cursor:pointer;',
      '  transition:color .12s; text-align:center;',
      '}',
      '.ppp-show-all:hover { color:var(--ink); }',

      '.ppp-footer {',
      '  flex-shrink:0; border-top:1px solid var(--panel-border);',
      '}',
      '.ppp-count {',
      '  padding:6px 14px 2px;',
      '  font-family:var(--font-mono); font-size:9px;',
      '  color:var(--ink-faint); letter-spacing:.06em;',
      '  display:flex; justify-content:space-between; align-items:center;',
      '}',
      '.ppp-archive-link {',
      '  font-family:var(--font-mono); font-size:9px; font-weight:700;',
      '  letter-spacing:.06em; text-transform:uppercase;',
      '  color:var(--ink-faint); background:none; border:none;',
      '  cursor:pointer; padding:0; transition:color .12s;',
      '  text-decoration:underline; text-decoration-style:dotted;',
      '}',
      '.ppp-archive-link:hover { color:var(--ink-mid); }',
      /* Bottom bar: Workpads · theme · gear */
      '.ppp-bottom-bar {',
      '  display:flex; align-items:center;',
      '  width:100%; border-top:1px solid var(--rule-light);',
      '  position:relative;',
      '}',
      '.ppp-wordmark {',
      '  flex:1; padding:10px 12px;',
      '  font-family:var(--font-mono); font-size:10px;',
      '  font-weight:700; letter-spacing:.16em; text-transform:uppercase;',
      '  color:var(--ink-faint); user-select:none; pointer-events:none;',
      '}',
      '.ppp-theme-btn {',
      '  flex-shrink:0; display:flex; align-items:center; gap:4px;',
      '  padding:7px 8px; border:none; background:none;',
      '  border-left:1px solid var(--rule-light);',
      '  cursor:pointer; transition:background .12s;',
      '}',
      '.ppp-theme-btn:hover { background:rgba(0,0,0,.04); }',
      '.ppp-theme-dot {',
      '  width:14px; height:14px; border-radius:2px;',
      '  background:#c0470a; flex-shrink:0; transition:background .2s;',
      '}',
      '.ppp-theme-arrow {',
      '  font-size:9px; color:var(--ink-faint); line-height:1;',
      '  transition:transform .2s;',
      '}',
      '.ppp-theme-btn.open .ppp-theme-arrow { transform:rotate(180deg); }',
      /* Theme flyout */
      '.ppp-theme-flyout {',
      '  position:absolute; bottom:100%; right:0;',
      '  background:var(--card); border:1px solid var(--rule);',
      '  border-radius:4px; box-shadow:0 4px 20px rgba(0,0,0,.14);',
      '  min-width:160px; overflow:hidden;',
      '  display:none; z-index:500;',
      '  animation:flyoutIn .14s ease forwards;',
      '}',
      '.ppp-theme-flyout.open { display:block; }',
      '@keyframes flyoutIn {',
      '  from { opacity:0; transform:translateY(4px); }',
      '  to   { opacity:1; transform:translateY(0); }',
      '}',
      '.ppp-theme-option {',
      '  display:flex; align-items:center; gap:10px;',
      '  width:100%; padding:10px 14px; border:none; background:none;',
      '  font-family:var(--font-mono); font-size:10px; font-weight:700;',
      '  letter-spacing:.1em; text-transform:uppercase;',
      '  color:var(--ink-mid); cursor:pointer;',
      '  border-bottom:1px solid var(--rule-light); text-align:left;',
      '  transition:background .1s;',
      '}',
      '.ppp-theme-option:last-child { border-bottom:none; }',
      '.ppp-theme-option:hover { background:var(--stamp-light); }',
      '.ppp-theme-option.active { color:var(--stamp); }',
      '.ppp-theme-pip {',
      '  width:12px; height:12px; border-radius:2px; flex-shrink:0;',
      '}',
      /* BG picker button — mirrors theme button */
      '.ppp-bg-btn {',
      '  flex-shrink:0; display:flex; align-items:center; gap:4px;',
      '  padding:7px 8px; border:none; background:none;',
      '  border-left:1px solid var(--rule-light);',
      '  cursor:pointer; transition:background .12s;',
      '}',
      '.ppp-bg-btn:hover { background:rgba(0,0,0,.04); }',
      '.ppp-bg-icon {',
      '  width:12px; height:12px; position:relative; flex-shrink:0;',
      '  display:grid; grid-template-columns:1fr 1fr; gap:2px;',
      '}',
      '.ppp-bg-icon span {',
      '  display:block; border-radius:1px;',
      '  background:var(--ink-faint); transition:background .2s;',
      '}',
      '.ppp-bg-btn:hover .ppp-bg-icon span { background:var(--ink-mid); }',
      /* BG flyout — same structure as theme flyout */
      '.ppp-bg-flyout {',
      '  position:absolute; bottom:100%; right:0;',
      '  background:var(--card); border:1px solid var(--rule);',
      '  border-radius:4px; box-shadow:0 4px 20px rgba(0,0,0,.14);',
      '  min-width:170px; overflow:hidden;',
      '  display:none; z-index:500;',
      '  animation:flyoutIn .14s ease forwards;',
      '}',
      '.ppp-bg-flyout.open { display:block; }',
      '.ppp-bg-option {',
      '  display:flex; align-items:center; gap:10px;',
      '  width:100%; padding:9px 14px; border:none; background:none;',
      '  font-family:var(--font-mono); font-size:10px; font-weight:700;',
      '  letter-spacing:.1em; text-transform:uppercase;',
      '  color:var(--ink-mid); cursor:pointer;',
      '  border-bottom:1px solid var(--rule-light); text-align:left;',
      '  transition:background .1s;',
      '}',
      '.ppp-bg-option:last-child { border-bottom:none; }',
      '.ppp-bg-option:hover { background:var(--stamp-light); }',
      '.ppp-bg-option.active { color:var(--stamp); }',
      '.ppp-bg-swatch {',
      '  width:28px; height:18px; border-radius:2px; flex-shrink:0;',
      '  border:1px solid var(--rule);',
      '}',

      '.overlay-note-header {',
      '  display:flex; align-items:center; justify-content:space-between;',
      '  margin-bottom:14px;',
      '}',
      '.overlay-note-time {',
      '  font-family:var(--font-mono); font-size:10px;',
      '  color:var(--ink-faint); letter-spacing:.04em;',
      '}',
      '.overlay-note-body {',
      '  font-family:var(--font-body); font-size:15px;',
      '  color:var(--ink); line-height:1.7;',
      '  word-break:break-word; white-space:pre-wrap;',
      '}',
      '.ppp-context-label {',
      '  padding:5px 14px 4px;',
      '  font-family:var(--font-mono); font-size:9px;',
      '  color:var(--stamp); letter-spacing:.06em;',
      '  border-bottom:1px solid var(--rule-light);',
      '  white-space:nowrap; overflow:hidden; text-overflow:ellipsis;',
      '}',

      '.ppp-field-badge {',
      '  display:inline-block; margin-right:5px;',
      '  font-family:var(--font-mono); font-size:8.5px; font-weight:700;',
      '  letter-spacing:.08em; text-transform:uppercase;',
      '  color:var(--stamp); background:var(--stamp-light);',
      '  border:1px solid var(--stamp-border); border-radius:2px;',
      '  padding:1px 4px; vertical-align:middle; line-height:1.3;',
      '}',
    ].join('\n');
    document.head.appendChild(s);
  }

  // ── Init ─────────────────────────────────────────────────────

  function init() {
    _addStyles();
    _buildStructure();
    _load();
  }

  function _buildStructure() {
    var body = document.getElementById('panel-right-body');
    if (!body) return;

    body.innerHTML = (
      '<div class="ppp-add-bar">' +
        '<textarea class="ppp-add-input" id="ppp-add-input"' +
            ' placeholder="Quick note\u2026" spellcheck="true"></textarea>' +
        '<div class="ppp-add-hint">Enter\u00a0to save\u00a0\u00b7\u00a0Shift+Enter\u00a0for\u00a0newline</div>' +
      '</div>' +
      '<div class="ppp-context-label" id="ppp-context" style="display:none;"></div>' +
      '<div class="ppp-list" id="ppp-list"></div>' +
      '<div class="ppp-footer">' +
        '<div class="ppp-count" id="ppp-count">' +
          '<span id="ppp-count-text"></span>' +
          '<button class="ppp-archive-link" id="ppp-archive-btn">Archive \u2192</button>' +
        '</div>' +
        '<div class="ppp-bottom-bar">' +
          '<span class="ppp-wordmark">Workpads</span>' +
          '<div style="position:relative;">' +
            '<button class="ppp-bg-btn" id="ppp-bg-btn" title="Background">' +
              '<span class="ppp-bg-icon">' +
                '<span></span><span></span><span></span><span></span>' +
              '</span>' +
              '<span class="ppp-theme-arrow">\u25b2</span>' +
            '</button>' +
            '<div class="ppp-bg-flyout" id="ppp-bg-flyout">' +
              '<button class="ppp-bg-option" data-bg="americana">' +
                '<span class="ppp-bg-swatch" id="ppp-bg-sw-americana" style="background:repeating-linear-gradient(45deg,#c9bfae 0,#c9bfae 1px,#f4ede0 1px,#f4ede0 6px);"></span>Americana' +
              '</button>' +
              '<button class="ppp-bg-option" data-bg="plain">' +
                '<span class="ppp-bg-swatch" style="background:var(--paper);"></span>Plain' +
              '</button>' +
              '<button class="ppp-bg-option" data-bg="grid">' +
                '<span class="ppp-bg-swatch" style="background:linear-gradient(rgba(0,0,0,.1) 1px,transparent 1px) 0 0/8px 8px,linear-gradient(90deg,rgba(0,0,0,.1) 1px,transparent 1px) 0 0/8px 8px,var(--paper);"></span>Grid' +
              '</button>' +
              '<button class="ppp-bg-option" data-bg="dots">' +
                '<span class="ppp-bg-swatch" style="background:radial-gradient(rgba(0,0,0,.18) 1px,transparent 1px) 0 0/7px 7px,var(--paper);"></span>Dots' +
              '</button>' +
              '<button class="ppp-bg-option" data-bg="linen">' +
                '<span class="ppp-bg-swatch" style="background:repeating-linear-gradient(45deg,rgba(0,0,0,.06) 0,rgba(0,0,0,.06) 1px,transparent 1px,transparent 6px),repeating-linear-gradient(-45deg,rgba(0,0,0,.04) 0,rgba(0,0,0,.04) 1px,transparent 1px,transparent 6px),var(--paper);"></span>Linen' +
              '</button>' +
            '</div>' +
          '</div>' +
          '<div style="position:relative;">' +
            '<button class="ppp-theme-btn" id="ppp-theme-btn" title="Change theme">' +
              '<span class="ppp-theme-dot" id="ppp-theme-dot"></span>' +
              '<span class="ppp-theme-arrow">\u25b2</span>' +
            '</button>' +
            '<div class="ppp-theme-flyout" id="ppp-theme-flyout">' +
              '<button class="ppp-theme-option" data-theme="telegram">' +
                '<span class="ppp-theme-pip" style="background:#c0470a;"></span>The Telegram' +
              '</button>' +
              '<button class="ppp-theme-option" data-theme="classic">' +
                '<span class="ppp-theme-pip" style="background:#1B3A6B;"></span>Classic' +
              '</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>'
    );

    var textarea = document.getElementById('ppp-add-input');
    if (textarea) {
      textarea.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          _saveNote(this.value);
        }
      });
    }


    // Theme button + flyout
    var themeBtn    = document.getElementById('ppp-theme-btn');
    var themeFlyout = document.getElementById('ppp-theme-flyout');
    var themeDot    = document.getElementById('ppp-theme-dot');

    function _syncThemeDot() {
      var t = localStorage.getItem('wp_theme') || 'telegram';
      if (themeDot) themeDot.style.background = (t === 'classic') ? '#1B3A6B' : '#c0470a';
      if (themeFlyout) {
        themeFlyout.querySelectorAll('.ppp-theme-option').forEach(function (opt) {
          opt.classList.toggle('active', opt.dataset.theme === t);
        });
      }
    }
    _syncThemeDot();

    if (themeBtn && themeFlyout) {
      themeBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = themeFlyout.classList.toggle('open');
        themeBtn.classList.toggle('open', open);
      });
      themeFlyout.querySelectorAll('.ppp-theme-option').forEach(function (opt) {
        opt.addEventListener('click', function () {
          var name = this.dataset.theme;
          if (name === 'telegram') {
            document.documentElement.removeAttribute('data-theme');
          } else {
            document.documentElement.setAttribute('data-theme', name);
          }
          localStorage.setItem('wp_theme', name);
          _syncThemeDot();
          themeFlyout.classList.remove('open');
          themeBtn.classList.remove('open');
        });
      });
      document.addEventListener('click', function () {
        themeFlyout.classList.remove('open');
        themeBtn.classList.remove('open');
      });
    }

    // Background picker
    var bgBtn    = document.getElementById('ppp-bg-btn');
    var bgFlyout = document.getElementById('ppp-bg-flyout');

    function _applyBg(name) {
      if (name && name !== 'americana') {
        document.documentElement.setAttribute('data-bg', name);
      } else {
        document.documentElement.removeAttribute('data-bg');
      }
      localStorage.setItem('wp_bg', name || 'americana');
      if (bgFlyout) {
        bgFlyout.querySelectorAll('.ppp-bg-option').forEach(function (opt) {
          opt.classList.toggle('active', opt.dataset.bg === (name || 'americana'));
        });
      }
    }
    _applyBg(localStorage.getItem('wp_bg') || 'americana');

    if (bgBtn && bgFlyout) {
      bgBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        // close theme flyout if open
        if (themeFlyout) { themeFlyout.classList.remove('open'); themeBtn && themeBtn.classList.remove('open'); }
        var open = bgFlyout.classList.toggle('open');
        bgBtn.querySelector('.ppp-theme-arrow').style.transform = open ? 'rotate(180deg)' : '';
      });
      bgFlyout.querySelectorAll('.ppp-bg-option').forEach(function (opt) {
        opt.addEventListener('click', function () {
          _applyBg(this.dataset.bg);
          bgFlyout.classList.remove('open');
          bgBtn.querySelector('.ppp-theme-arrow').style.transform = '';
        });
      });
      document.addEventListener('click', function () {
        bgFlyout.classList.remove('open');
        if (bgBtn) bgBtn.querySelector('.ppp-theme-arrow').style.transform = '';
      });
    }

    // Wire overlay-note-detail close button
    var closeBtn = document.getElementById('overlay-note-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', _hideNoteDetail);
    }
    var overlayEl = document.getElementById('overlay-note-detail');
    if (overlayEl) {
      overlayEl.addEventListener('click', function (e) {
        if (e.target === overlayEl) _hideNoteDetail();
      });
    }

    // Wire edit cancel button (Save wired per-note in _showNoteDetail)
    var editCancelBtn = document.getElementById('overlay-note-edit-cancel');
    if (editCancelBtn) {
      editCancelBtn.addEventListener('click', _exitEditMode);
    }

    // Detect workpads-link paste in add-input → offer import
    var addInput = document.getElementById('ppp-add-input');
    if (addInput) {
      addInput.addEventListener('paste', function (e) {
        var pasted = (e.clipboardData || window.clipboardData).getData('text');
        if (pasted && pasted.indexOf('workpads.me/p') !== -1) {
          e.preventDefault();
          if (typeof App !== 'undefined' && App.showImport) App.showImport(pasted.trim());
        }
      });
    }
  }

  // ── Load + render ────────────────────────────────────────────

  function _load() {
    PersonalService.list().then(function (notes) {
      _notes = notes || [];
      _renderList();
    });
  }

  function refresh() {
    _load();
  }

  function setContext(recordId) {
    _activeRecordId = recordId || null;
    _showAll        = false; // reset pagination on context change
    var contextEl = document.getElementById('ppp-context');
    if (contextEl) {
      if (_activeRecordId) {
        contextEl.textContent = 'Viewing workpad';
        contextEl.style.display = 'block';
      } else {
        contextEl.style.display = 'none';
      }
    }
    _load();
  }

  function _saveNote(raw) {
    var text = (raw || '').trim();
    if (!text) return;

    var textarea = document.getElementById('ppp-add-input');

    PersonalService.capture({ text: text, source: 'quick-note' }).then(function () {
      if (textarea) textarea.value = '';
      _load();
    });
  }

  function _renderList() {
    var listEl = document.getElementById('ppp-list');
    if (!listEl) return;

    // When a record is active, show linked notes first, then the rest
    var linked = [], unlinked = [];
    _notes.forEach(function (n) {
      if (_activeRecordId && n.linkedRecordId === _activeRecordId) {
        linked.push(n);
      } else {
        unlinked.push(n);
      }
    });
    var ordered = _activeRecordId ? linked.concat(unlinked) : _notes;

    if (ordered.length === 0) {
      var emptyMsg = _activeRecordId
        ? 'No saves yet.'
        : 'No notes yet.<br>Type above and press Enter.';
      listEl.innerHTML = '<div class="ppp-empty">' + emptyMsg + '</div>';
      var _ct = document.getElementById('ppp-count-text');
      if (_ct) _ct.textContent = '';
      return;
    }

    // Limit visible items unless _showAll
    var visible  = _showAll ? ordered : ordered.slice(0, MAX_VISIBLE);
    var hasMore  = ordered.length > MAX_VISIBLE && !_showAll;

    var html = '';
    var showingLinked = _activeRecordId && linked.length > 0;
    visible.forEach(function (n, i) {
      var timeStr  = n.timestamp ? _formatTime(n.timestamp) : '';
      var isLinked = _activeRecordId && n.linkedRecordId === _activeRecordId;

      // Divider between linked and unlinked sections
      if (showingLinked && i === linked.length && unlinked.length > 0) {
        html += '<div style="padding:5px 14px;font-family:var(--font-mono);font-size:9px;font-weight:700;color:var(--ink-mid);letter-spacing:.12em;text-transform:uppercase;border-top:2px solid var(--rule);background:var(--rule-light);">All Notes</div>';
      }

      var fieldBadge = (isLinked && n.linkedFieldId)
        ? '<span class="ppp-field-badge">' + _esc(FIELD_LABELS[n.linkedFieldId] || n.linkedFieldId) + '</span>'
        : '';

      // Truncate display text to 60 chars, stripping field label prefix if present
      var rawText = n.text || '';
      var displayText = rawText;
      if (fieldBadge && n.linkedFieldId) {
        var labelPrefix = FIELD_LABELS[n.linkedFieldId] || n.linkedFieldId;
        // Strip "Label: " or "Label " prefix (case-insensitive)
        var prefixRe = new RegExp('^' + labelPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[:\\s]\\s*', 'i');
        displayText = displayText.replace(prefixRe, '');
      }
      var truncated = displayText.length > 60;
      var display   = truncated ? displayText.slice(0, 60) + '\u2026' : displayText;

      // Tag display
      var tagsHtml = (n.tags && n.tags.length)
        ? '<span class="ppp-item-tags">' + n.tags.map(function (t) { return '#' + _esc(t); }).join(' ') + '</span>'
        : '';

      var isQuickNote  = (n.source === 'quick-note');
      var isFieldNote  = (n.source === 'field-note' || n.linkedFieldId);
      var clickAction  = isQuickNote ? 'quicknote' : (isFieldNote && n.linkedRecordId ? 'fieldnote' : '');

      html += (
        '<div class="ppp-item' + (isLinked ? ' ppp-item-linked' : '') + '"' +
            ' data-id="' + _esc(n.id) + '"' +
            ' data-action="' + clickAction + '"' +
            ' data-record="' + _esc(n.linkedRecordId || '') + '"' +
            (clickAction ? ' style="cursor:pointer;"' : '') + '>' +
          '<div class="ppp-item-text" title="' + _esc(rawText) + '">' + fieldBadge + _esc(display) +
            (truncated && clickAction ? '<span class="ppp-click-hint">click to view</span>' : '') +
          '</div>' +
          tagsHtml +
          (timeStr ? '<div class="ppp-item-time">' + timeStr + '</div>' : '') +
          '<button class="ppp-item-opts" data-id="' + _esc(n.id) + '" ' +
              'title="Options" aria-label="Note options" aria-haspopup="true">\u25be</button>' +
          '<div class="ppp-item-menu" id="ppp-menu-' + _esc(n.id) + '" style="display:none;">' +
            '<button class="ppp-item-menu-opt" data-action="archive" data-id="' + _esc(n.id) + '">Archive</button>' +
            '<button class="ppp-item-menu-opt danger" data-action="delete" data-id="' + _esc(n.id) + '">Delete</button>' +
          '</div>' +
        '</div>'
      );
    });

    // "Show all" toggle
    if (hasMore) {
      html += '<button class="ppp-show-all" id="ppp-show-all-btn">Show all (' + ordered.length + ')</button>';
    }

    listEl.innerHTML = html;

    var countTextEl  = document.getElementById('ppp-count-text');
    var archiveBtnEl = document.getElementById('ppp-archive-btn');
    if (countTextEl) {
      var label = _activeRecordId && linked.length > 0
        ? linked.length + ' linked \xb7 ' + _notes.length + ' total'
        : _notes.length + (_notes.length === 1 ? ' note' : ' notes');
      countTextEl.textContent = label;
    }
    if (archiveBtnEl) {
      archiveBtnEl.onclick = function () {
        if (typeof App !== 'undefined') App.showArchive();
      };
    }

    // Note item body click: quick-note → detail overlay, field-note → workpad
    listEl.querySelectorAll('.ppp-item').forEach(function (item) {
      item.addEventListener('click', function (e) {
        // Don't trigger if opts button or menu was clicked
        if (e.target.closest('.ppp-item-opts') || e.target.closest('.ppp-item-menu')) return;
        var action   = this.dataset.action;
        var recordId = this.dataset.record;
        var noteId   = this.dataset.id;
        if (action === 'quicknote') {
          var note = _notes.find(function (n) { return n.id === noteId; });
          if (note) _showNoteDetail(note);
        } else if (action === 'fieldnote' && recordId) {
          if (typeof App !== 'undefined') App.showView(recordId);
        }
      });
    });

    // Options button: toggle dropdown
    listEl.querySelectorAll('.ppp-item-opts').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var id   = this.dataset.id;
        var menu = document.getElementById('ppp-menu-' + id);
        if (!menu) return;
        var isOpen = menu.style.display !== 'none';
        // Close all other menus first
        listEl.querySelectorAll('.ppp-item-menu').forEach(function (m) { m.style.display = 'none'; });
        menu.style.display = isOpen ? 'none' : 'block';
      });
    });

    // Menu options: archive / delete
    listEl.querySelectorAll('.ppp-item-menu-opt').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var id     = this.dataset.id;
        var action = this.dataset.action;
        if (action === 'archive') {
          _archiveNote(id);
        } else if (action === 'delete') {
          if (window.confirm('Delete this note permanently? This cannot be undone.')) {
            _archiveNote(id); // archive = remove from active list
          }
        }
      });
    });

    // Click elsewhere closes open menus
    document.addEventListener('click', _closeMenus, { once: true });

    // Bind show-all toggle
    var showAllBtn = document.getElementById('ppp-show-all-btn');
    if (showAllBtn) {
      showAllBtn.addEventListener('click', function () {
        _showAll = true;
        _renderList();
      });
    }
  }

  function _closeMenus() {
    var listEl = document.getElementById('ppp-list');
    if (listEl) {
      listEl.querySelectorAll('.ppp-item-menu').forEach(function (m) { m.style.display = 'none'; });
    }
  }

  function _archiveNote(id) {
    if (!id) return;
    PersonalService.archive(id).then(function () {
      _load();
    });
  }

  function _showNoteDetail(note) {
    var overlayEl  = document.getElementById('overlay-note-detail');
    var timeEl     = document.getElementById('overlay-note-time');
    var bodyEl     = document.getElementById('overlay-note-body');
    if (!overlayEl || !bodyEl) return;
    if (timeEl) timeEl.textContent = note.timestamp ? _formatTime(note.timestamp) : '';
    bodyEl.textContent = note.text || '';
    bodyEl.style.display = '';

    var editArea  = document.getElementById('overlay-note-edit-area');
    var editInput = document.getElementById('overlay-note-edit-input');
    if (editArea) editArea.style.display = 'none';

    // Wire copy button
    var copyBtn = document.getElementById('overlay-note-copy');
    if (copyBtn) {
      copyBtn.onclick = function () {
        var text = note.text || '';
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () {
            copyBtn.textContent = 'Copied';
            setTimeout(function () { copyBtn.textContent = 'Copy'; }, 1800);
          }).catch(function () { _fallbackCopy(text, copyBtn); });
        } else {
          _fallbackCopy(text, copyBtn);
        }
      };
    }

    // Wire edit button
    var editBtn  = document.getElementById('overlay-note-edit');
    var saveBtn  = document.getElementById('overlay-note-edit-save');
    if (editBtn) {
      editBtn.onclick = function () {
        if (!editArea || !editInput) return;
        editInput.value = note.text || '';
        bodyEl.style.display = 'none';
        editArea.style.display = 'block';
        editInput.focus();
        editInput.setSelectionRange(editInput.value.length, editInput.value.length);
      };
    }
    if (saveBtn) {
      saveBtn.onclick = function () {
        var newText = (editInput ? editInput.value : '').trim();
        if (!newText) return;
        // Archive old, create new with same metadata
        PersonalService.archive(note.id).then(function () {
          return PersonalService.capture({
            text:           newText,
            source:         note.source || 'quick-note',
            linkedRecordId: note.linkedRecordId || null,
            linkedFieldId:  note.linkedFieldId  || null,
            tags:           note.tags || [],
          });
        }).then(function (updated) {
          _hideNoteDetail();
          _load();
          // Re-open with updated note
          _showNoteDetail(updated);
        });
      };
    }

    overlayEl.style.display = 'flex';
  }

  function _exitEditMode() {
    var bodyEl    = document.getElementById('overlay-note-body');
    var editArea  = document.getElementById('overlay-note-edit-area');
    if (bodyEl)   bodyEl.style.display = '';
    if (editArea) editArea.style.display = 'none';
  }

  function _fallbackCopy(text, btn) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = 'Copy'; }, 1800); } catch (e) {}
    document.body.removeChild(ta);
  }

  function _hideNoteDetail() {
    var overlayEl = document.getElementById('overlay-note-detail');
    if (overlayEl) overlayEl.style.display = 'none';
  }

  // ── Helpers ──────────────────────────────────────────────────

  function _formatTime(ts) {
    if (!ts) return '';
    try {
      var d   = new Date(ts);
      var mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      var day  = d.getDate();
      var mo   = mon[d.getMonth()];
      var hh   = ('0' + d.getHours()).slice(-2);
      var mm   = ('0' + d.getMinutes()).slice(-2);
      return day + '\u00a0' + mo + '\u00a0' + hh + ':' + mm;
    } catch (e) {
      return '';
    }
  }

  function _esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── Public ───────────────────────────────────────────────────

  return { init: init, refresh: refresh, setContext: setContext };

}());
