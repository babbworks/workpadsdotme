/* ============================================================
   WorkpadsPanel — left sidebar: record index + search
   ============================================================ */

var WorkpadsPanel = (function () {
  'use strict';

  var _records     = [];
  var _query       = '';
  var _stylesAdded = false;

  // ── Styles ───────────────────────────────────────────────────

  function _addStyles() {
    if (_stylesAdded) return;
    _stylesAdded = true;
    var s = document.createElement('style');
    s.textContent = [
      /* Panel inner layout — flex column filling panel-body */
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
      '}',
      '.wpp-item:last-child { border-bottom:none; }',
      '.wpp-item:hover { background:rgba(192,71,10,.04); }',
      '.wpp-item.active { background:var(--stamp-light); border-left:2px solid var(--stamp); padding-left:12px; }',

      '.wpp-item-job {',
      '  font-family:var(--font-body); font-size:13px; font-weight:700;',
      '  color:var(--ink); line-height:1.3;',
      '  white-space:nowrap; overflow:hidden; text-overflow:ellipsis;',
      '  margin-bottom:3px;',
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
    ].join('\n');
    document.head.appendChild(s);
  }

  // ── Init ─────────────────────────────────────────────────────

  function init() {
    _addStyles();
    _buildStructure();
    _load();

    // Highlight active record when hash changes
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
      '<div class="wpp-list" id="wpp-list"></div>' +
      '<div class="wpp-footer">' +
        '<button class="btn-primary" id="wpp-new-btn" style="width:100%;">+ New workpad</button>' +
      '</div>'
    );

    // Search
    var searchEl = document.getElementById('wpp-search');
    if (searchEl) {
      searchEl.addEventListener('input', function () {
        _query = this.value;
        _renderList();
      });
    }

    // New button
    var newBtn = document.getElementById('wpp-new-btn');
    if (newBtn) newBtn.addEventListener('click', function () { App.showWizard(); });
  }

  // ── Load + render ────────────────────────────────────────────

  function _load() {
    RecordService.list().then(function (records) {
      _records = records || [];
      _renderList();
    });
  }

  function refresh() {
    _load();
  }

  function _renderList() {
    var listEl = document.getElementById('wpp-list');
    if (!listEl) return;

    var filtered = _filtered();
    var activeId = _activeId();

    if (_records.length === 0) {
      listEl.innerHTML = (
        '<div class="wpp-empty">' +
          'No workpads yet.<br>Create your first record.' +
        '</div>'
      );
      return;
    }

    if (filtered.length === 0) {
      listEl.innerHTML = (
        '<div class="wpp-empty">No matches.</div>'
      );
      return;
    }

    var html = '';
    filtered.forEach(function (r) {
      var isActive = r.id === activeId;
      var meta     = [];
      if (r.customer) meta.push(_esc(r.customer));
      if (r.date)     meta.push(_esc(r.date));

      html += (
        '<div class="wpp-item' + (isActive ? ' active' : '') + '"' +
            ' data-id="' + _esc(r.id) + '" tabindex="0" role="button">' +
          '<div class="wpp-item-job">' + _esc(r.job || 'Untitled') + '</div>' +
          (meta.length
            ? '<div class="wpp-item-meta">' + meta.join(' \xb7 ') + '</div>'
            : '') +
        '</div>'
      );
    });

    listEl.innerHTML = html;

    // Bind clicks
    listEl.querySelectorAll('.wpp-item').forEach(function (item) {
      item.addEventListener('click', function () {
        App.showView(this.dataset.id);
      });
      item.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          App.showView(this.dataset.id);
        }
      });
    });

    // Scroll active item into view
    var activeEl = listEl.querySelector('.active');
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }

  function _markActive() {
    var activeId  = _activeId();
    var listEl    = document.getElementById('wpp-list');
    if (!listEl) return;
    listEl.querySelectorAll('.wpp-item').forEach(function (item) {
      var isActive = item.dataset.id === activeId;
      item.classList.toggle('active', isActive);
      if (isActive) {
        item.style.borderLeft = '2px solid var(--stamp)';
        item.style.paddingLeft = '12px';
      } else {
        item.style.borderLeft = '';
        item.style.paddingLeft = '';
      }
    });
  }

  // ── Helpers ──────────────────────────────────────────────────

  function _filtered() {
    if (!_query) return _records;
    var q = _query.toLowerCase();
    return _records.filter(function (r) {
      return (r.job      || '').toLowerCase().indexOf(q) !== -1 ||
             (r.customer || '').toLowerCase().indexOf(q) !== -1 ||
             (r.date     || '').toLowerCase().indexOf(q) !== -1;
    });
  }

  function _activeId() {
    var hash  = window.location.hash.slice(1);
    var parts = hash.replace(/^\//, '').split('/');
    // hash is /view/:id or /edit/:id or /share/:id
    if (parts[0] === 'view' || parts[0] === 'edit' || parts[0] === 'share') {
      return parts[1] || null;
    }
    return null;
  }

  function _esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ── Public ───────────────────────────────────────────────────

  return { init: init, refresh: refresh };

}());
