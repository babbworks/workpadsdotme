/* ============================================================
   ListScreen — record index with live search
   ============================================================ */

var ListScreen = (function () {
  'use strict';

  var _records     = [];
  var _query       = '';
  var _stylesAdded = false;

  // ── Styles ──────────────────────────────────────────────────

  function _addStyles() {
    if (_stylesAdded) return;
    _stylesAdded = true;
    var s = document.createElement('style');
    s.textContent = [
      '.list-hd {',
      '  display: flex;',
      '  align-items: flex-end;',
      '  justify-content: space-between;',
      '  gap: 20px;',
      '  margin-bottom: 28px;',
      '  flex-wrap: wrap;',
      '}',

      '.list-search {',
      '  font-family: var(--font-mono);',
      '  font-size: 12px;',
      '  color: var(--ink);',
      '  background: var(--card);',
      '  border: 1.5px solid var(--rule);',
      '  border-radius: 3px;',
      '  padding: 8px 14px;',
      '  width: 220px;',
      '  transition: border-color .13s;',
      '  -webkit-appearance: none;',
      '}',
      '.list-search:focus { outline: none; border-color: var(--stamp-border); }',
      '.list-search::placeholder { color: var(--ink-faint); }',

      '.list-records {',
      '  border: 1px solid var(--rule);',
      '  border-radius: 4px;',
      '  background: var(--card);',
      '  box-shadow: var(--shadow-card);',
      '  overflow: hidden;',
      '}',

      '.list-row {',
      '  display: flex;',
      '  align-items: center;',
      '  gap: 12px;',
      '  padding: 16px 20px;',
      '  border-bottom: 1px solid var(--rule-light);',
      '  cursor: pointer;',
      '  transition: background .1s;',
      '  user-select: none;',
      '}',
      '.list-row:last-child { border-bottom: none; }',
      '.list-row:hover { background: rgba(192,71,10,.04); }',
      '.list-row:hover .list-row-arrow { transform: translateX(3px); color: var(--stamp); }',
      '.list-row:focus { outline: 2px solid var(--stamp); outline-offset: -2px; }',

      '.list-row-main { flex: 1; min-width: 0; }',

      '.list-row-job {',
      '  font-family: var(--font-body);',
      '  font-size: 15px;',
      '  font-weight: 700;',
      '  color: var(--ink);',
      '  line-height: 1.3;',
      '  white-space: nowrap;',
      '  overflow: hidden;',
      '  text-overflow: ellipsis;',
      '  margin-bottom: 4px;',
      '}',

      '.list-row-meta {',
      '  font-family: var(--font-mono);',
      '  font-size: 11px;',
      '  color: var(--ink-muted);',
      '  white-space: nowrap;',
      '  overflow: hidden;',
      '  text-overflow: ellipsis;',
      '}',

      '.list-row-actions {',
      '  display: none;',
      '  gap: 6px;',
      '  flex-shrink: 0;',
      '}',
      '.list-row:hover .list-row-actions { display: flex; }',

      '.list-row-action {',
      '  font-family: var(--font-mono);',
      '  font-size: 10px;',
      '  font-weight: 700;',
      '  letter-spacing: .06em;',
      '  color: var(--ink-muted);',
      '  background: var(--rule-light);',
      '  border: 1px solid var(--rule);',
      '  border-radius: 3px;',
      '  padding: 4px 10px;',
      '  transition: color .1s, border-color .1s;',
      '}',
      '.list-row-action:hover { color: var(--stamp); border-color: var(--stamp-border); }',

      '.list-row-arrow {',
      '  font-family: var(--font-body);',
      '  font-size: 18px;',
      '  color: var(--ink-faint);',
      '  flex-shrink: 0;',
      '  transition: transform .15s, color .13s;',
      '  line-height: 1;',
      '}',

      '.list-count {',
      '  font-family: var(--font-mono);',
      '  font-size: 11px;',
      '  color: var(--ink-muted);',
      '  letter-spacing: .06em;',
      '  margin-bottom: 24px;',
      '  margin-top: -16px;',
      '}',

      '.list-empty {',
      '  padding: 80px 32px;',
      '  text-align: center;',
      '}',
      '.list-empty-heading {',
      '  font-family: var(--font-display);',
      '  font-size: 26px;',
      '  font-weight: 300;',
      '  font-style: italic;',
      '  color: var(--ink-muted);',
      '  margin-bottom: 10px;',
      '}',
      '.list-empty-sub {',
      '  font-family: var(--font-mono);',
      '  font-size: 11px;',
      '  color: var(--ink-faint);',
      '  letter-spacing: .06em;',
      '  margin-bottom: 24px;',
      '}',
    ].join('\n');
    document.head.appendChild(s);
  }

  // ── Render ───────────────────────────────────────────────────

  function onShow() {
    _addStyles();
    _query = '';
    RecordService.list().then(function (records) {
      _records = records;
      _render();
    });
  }

  function onHide() {}

  function _render() {
    var el       = document.getElementById('screen-list');
    var filtered = _filtered();
    var total    = _records.length;

    var html = '<div style="max-width:760px;margin:0 auto;padding:36px 32px 80px;">';

    // ── Header row
    html += '<div class="list-hd">';
    html += '<div>';
    html += '<h1 class="screen-title">Records</h1>';
    html += '<p class="screen-subtitle" style="margin-bottom:0;">' +
              total + '\u00a0workpad' + (total !== 1 ? 's' : '') +
            '</p>';
    html += '</div>';
    html += '<input class="list-search" id="list-search" type="search" ' +
              'placeholder="Search records\u2026" value="' + _esc(_query) + '" ' +
              'autocomplete="off" spellcheck="false">';
    html += '</div>';

    // ── Records list
    if (total === 0) {
      html += _renderEmpty(false);
    } else if (filtered.length === 0) {
      html += _renderEmpty(true);
    } else {
      html += '<div class="list-records">';
      filtered.forEach(function (r) { html += _renderRow(r); });
      html += '</div>';
    }

    html += '</div>'; // wrapper
    el.innerHTML = html;

    _bindEvents(el);
  }

  function _renderRow(r) {
    var meta = [];
    if (r.customer) meta.push(_esc(r.customer));
    if (r.date)     meta.push(_esc(r.date));
    if (r.location) meta.push(_esc(r.location));

    var jobHtml = _esc(r.job || 'Untitled');
    if (_query) jobHtml = _highlight(jobHtml, _esc(_query));

    return (
      '<div class="list-row" data-id="' + _esc(r.id) + '" tabindex="0" role="button">' +
        '<div class="list-row-main">' +
          '<div class="list-row-job">' +
            jobHtml +
            (r.receivedAt ? '<span class="record-item-tag" style="margin-left:8px;">Received</span>' : '') +
          '</div>' +
          (meta.length
            ? '<div class="list-row-meta">' + meta.join(' \xb7 ') + '</div>'
            : '') +
        '</div>' +
        '<div class="list-row-actions">' +
          '<button class="list-row-action" data-action="share" data-id="' + _esc(r.id) + '">Share</button>' +
          '<button class="list-row-action" data-action="edit"  data-id="' + _esc(r.id) + '">Edit</button>' +
        '</div>' +
        '<div class="list-row-arrow">\u203a</div>' +
      '</div>'
    );
  }

  function _renderEmpty(isFiltered) {
    if (isFiltered) {
      return (
        '<div class="list-empty">' +
          '<p class="list-empty-heading">No matches</p>' +
          '<p class="list-empty-sub">Try a different search term</p>' +
        '</div>'
      );
    }
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
    // Search input
    var searchEl = document.getElementById('list-search');
    if (searchEl) {
      searchEl.addEventListener('input', function () {
        _query = this.value;
        _render();
        // restore focus to search after re-render
        var el = document.getElementById('list-search');
        if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
      });
    }

    // Row clicks → view
    screenEl.querySelectorAll('.list-row').forEach(function (row) {
      row.addEventListener('click', function (e) {
        // Don't navigate if an action button was clicked
        if (e.target.closest('.list-row-action')) return;
        App.showView(this.dataset.id);
      });
      row.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          App.showView(this.dataset.id);
        }
      });
    });

    // Action buttons
    screenEl.querySelectorAll('.list-row-action').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var id     = this.dataset.id;
        var action = this.dataset.action;
        if (action === 'share') App.showShare(id);
        if (action === 'edit')  App.showWizard(id);
      });
    });

    // Empty state new button
    var newBtn = document.getElementById('list-btn-new');
    if (newBtn) newBtn.addEventListener('click', function () { App.showWizard(); });
  }

  // ── Helpers ──────────────────────────────────────────────────

  function _filtered() {
    if (!_query) return _records;
    var q = _query.toLowerCase();
    return _records.filter(function (r) {
      return (r.job      || '').toLowerCase().indexOf(q) !== -1 ||
             (r.customer || '').toLowerCase().indexOf(q) !== -1 ||
             (r.location || '').toLowerCase().indexOf(q) !== -1 ||
             (r.date     || '').toLowerCase().indexOf(q) !== -1;
    });
  }

  // Wrap matched text in a highlight span
  function _highlight(escaped, query) {
    var idx = escaped.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return escaped;
    return (
      escaped.slice(0, idx) +
      '<mark style="background:rgba(192,71,10,.15);color:inherit;border-radius:2px;">' +
      escaped.slice(idx, idx + query.length) +
      '</mark>' +
      escaped.slice(idx + query.length)
    );
  }

  function _esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── Public ───────────────────────────────────────────────────

  return { onShow: onShow, onHide: onHide };

}());
