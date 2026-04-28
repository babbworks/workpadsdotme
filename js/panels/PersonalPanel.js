/* ============================================================
   PersonalPanel — right sidebar: personal notes list
   ============================================================ */

var PersonalPanel = (function () {
  'use strict';

  var _notes       = [];
  var _stylesAdded = false;

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
      '  font-family:var(--font-body); font-size:12.5px;',
      '  color:var(--ink); line-height:1.5;',
      '  white-space:pre-wrap; word-break:break-word;',
      '  margin-bottom:4px;',
      '}',
      '.ppp-item-time {',
      '  font-family:var(--font-mono); font-size:9px;',
      '  color:var(--ink-faint);',
      '}',
      '.ppp-item-delete {',
      '  position:absolute; top:8px; right:10px;',
      '  font-family:var(--font-mono); font-size:10px;',
      '  color:var(--ink-faint); background:none; border:none;',
      '  cursor:pointer; padding:2px 4px; opacity:0;',
      '  transition:opacity .12s, color .12s;',
      '}',
      '.ppp-item-delete:hover { color:#b33a0a; }',

      '.ppp-empty {',
      '  padding:32px 16px; text-align:center;',
      '  font-family:var(--font-body); font-style:italic;',
      '  font-size:13px; color:var(--ink-faint);',
      '  line-height:1.5;',
      '}',

      '.ppp-count {',
      '  flex-shrink:0; padding:7px 14px;',
      '  border-top:1px solid var(--panel-border);',
      '  font-family:var(--font-mono); font-size:9px;',
      '  color:var(--ink-faint); letter-spacing:.06em;',
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
      '<div class="ppp-list" id="ppp-list"></div>' +
      '<div class="ppp-count" id="ppp-count"></div>'
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
  }

  // ── Load + render ────────────────────────────────────────────

  function _load() {
    PersonalService.list().then(function (notes) {
      // Newest first
      _notes = (notes || []).slice().sort(function (a, b) {
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
      _renderList();
    });
  }

  function refresh() {
    _load();
  }

  function _saveNote(raw) {
    var text = (raw || '').trim();
    if (!text) return;

    var textarea = document.getElementById('ppp-add-input');

    PersonalService.save({ text: text }).then(function () {
      if (textarea) textarea.value = '';
      _load();
    });
  }

  function _renderList() {
    var listEl  = document.getElementById('ppp-list');
    var countEl = document.getElementById('ppp-count');
    if (!listEl) return;

    if (_notes.length === 0) {
      listEl.innerHTML = (
        '<div class="ppp-empty">' +
          'No notes yet.<br>Type above and press Enter.' +
        '</div>'
      );
      if (countEl) countEl.textContent = '';
      return;
    }

    var html = '';
    _notes.forEach(function (n) {
      var timeStr = n.createdAt ? _formatTime(n.createdAt) : '';
      html += (
        '<div class="ppp-item" data-id="' + _esc(n.id) + '">' +
          '<div class="ppp-item-text">' + _escNl(n.text || '') + '</div>' +
          (timeStr ? '<div class="ppp-item-time">' + timeStr + '</div>' : '') +
          '<button class="ppp-item-delete" data-id="' + _esc(n.id) + '" ' +
              'title="Delete note" aria-label="Delete note">\u00d7</button>' +
        '</div>'
      );
    });

    listEl.innerHTML = html;

    if (countEl) {
      countEl.textContent = _notes.length + (_notes.length === 1 ? ' note' : ' notes');
    }

    // Bind delete buttons
    listEl.querySelectorAll('.ppp-item-delete').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        _deleteNote(this.dataset.id);
      });
    });
  }

  function _deleteNote(id) {
    if (!id) return;
    PersonalService.delete(id).then(function () {
      _load();
    });
  }

  // ── Helpers ──────────────────────────────────────────────────

  function _formatTime(ts) {
    if (!ts) return '';
    try {
      var d = new Date(ts);
      var now = new Date();
      var diff = now - d; // ms

      if (diff < 60000)          return 'just now';
      if (diff < 3600000)        return Math.floor(diff / 60000) + 'm ago';
      if (diff < 86400000)       return Math.floor(diff / 3600000) + 'h ago';
      if (diff < 7 * 86400000)   return Math.floor(diff / 86400000) + 'd ago';

      // Older — show date
      var mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return d.getDate() + '\u00a0' + mon[d.getMonth()];
    } catch (e) {
      return '';
    }
  }

  function _esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function _escNl(s) {
    return _esc(s).replace(/\n/g, '<br>');
  }

  // ── Public ───────────────────────────────────────────────────

  return { init: init, refresh: refresh };

}());
