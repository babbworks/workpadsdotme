/* ============================================================
   ArchiveScreen — browsable archive of all archived records
   ============================================================ */

var ArchiveScreen = (function () {
  'use strict';

  var _records      = [];
  var _query        = '';
  var _stylesAdded  = false;

  function _addStyles() {
    if (_stylesAdded) return;
    _stylesAdded = true;
    var s = document.createElement('style');
    s.textContent = [
      '.arc-wrap { max-width:680px; margin:0 auto; padding:36px 32px 80px; }',

      '.arc-search {',
      '  display:block; width:100%; max-width:400px;',
      '  font-family:var(--font-mono); font-size:11px;',
      '  color:var(--ink); background:var(--card);',
      '  border:1px solid var(--rule); border-radius:3px;',
      '  padding:7px 12px; margin-bottom:24px;',
      '  transition:border-color .13s;',
      '}',
      '.arc-search:focus { outline:none; border-color:var(--stamp-border); }',
      '.arc-search::placeholder { color:var(--ink-faint); }',

      '.arc-list { }',

      '.arc-item {',
      '  display:flex; justify-content:space-between; align-items:baseline;',
      '  padding:12px 0; border-bottom:1px solid var(--rule-light);',
      '  cursor:pointer; transition:background .1s;',
      '}',
      '.arc-item:last-child { border-bottom:none; }',
      '.arc-item:hover { background:rgba(192,71,10,.03); margin:0 -8px; padding-left:8px; padding-right:8px; }',

      '.arc-item-body { flex:1; min-width:0; }',
      '.arc-item-job {',
      '  font-family:var(--font-body); font-size:13px; font-weight:700;',
      '  color:var(--ink); margin-bottom:2px;',
      '  white-space:nowrap; overflow:hidden; text-overflow:ellipsis;',
      '}',
      '.arc-item-meta {',
      '  font-family:var(--font-mono); font-size:9.5px; color:var(--ink-muted);',
      '}',

      '.arc-item-actions {',
      '  flex-shrink:0; margin-left:16px;',
      '  display:flex; gap:6px; align-items:center;',
      '}',
      '.arc-restore-btn {',
      '  font-family:var(--font-mono); font-size:9px; font-weight:700;',
      '  letter-spacing:.06em; color:var(--ink-muted);',
      '  border:1px solid var(--rule); border-radius:2px; padding:3px 8px;',
      '  background:none; transition:color .12s, border-color .12s;',
      '}',
      '.arc-restore-btn:hover { color:var(--ink); border-color:var(--ink-mid); }',

      '.arc-empty {',
      '  padding:48px 0; text-align:center;',
      '  font-family:var(--font-body); font-style:italic;',
      '  font-size:13px; color:var(--ink-faint); line-height:1.6;',
      '}',

      '.arc-count {',
      '  font-family:var(--font-mono); font-size:10px; color:var(--ink-faint);',
      '  margin-bottom:16px; letter-spacing:.06em;',
      '}',
    ].join('\n');
    document.head.appendChild(s);
  }

  function onShow() {
    _addStyles();
    _query = '';
    _load();
  }

  function onHide() {
    _records = [];
    _query = '';
  }

  function _load() {
    RecordService.listArchived().then(function (records) {
      _records = (records || []).sort(function (a, b) {
        return (b.archivedAt || b.updatedAt || 0) - (a.archivedAt || a.updatedAt || 0);
      });
      _render();
    });
  }

  function _render() {
    var el = document.getElementById('screen-archive');
    if (!el) return;

    el.innerHTML = (
      '<div class="arc-wrap">' +
        '<h1 class="screen-title">Archive</h1>' +
        '<p class="screen-subtitle" style="margin-bottom:24px;">Archived workpad records</p>' +
        '<input class="arc-search" id="arc-search" type="search" ' +
            'placeholder="Filter by job, customer, date\u2026" autocomplete="off">' +
        '<div id="arc-body"></div>' +
      '</div>'
    );

    var searchEl = document.getElementById('arc-search');
    if (searchEl) {
      searchEl.addEventListener('input', function () {
        _query = this.value;
        _renderList();
      });
    }

    _renderList();
  }

  function _renderList() {
    var body = document.getElementById('arc-body');
    if (!body) return;

    var q = _query.toLowerCase().trim();
    var filtered = q
      ? _records.filter(function (r) {
          return (r.job      || '').toLowerCase().indexOf(q) !== -1 ||
                 (r.customer || '').toLowerCase().indexOf(q) !== -1 ||
                 (r.date     || '').toLowerCase().indexOf(q) !== -1;
        })
      : _records;

    if (!filtered.length) {
      body.innerHTML = '<div class="arc-empty">' +
        (_records.length === 0
          ? 'No archived records yet.'
          : 'No records match \u201c' + _esc(_query) + '\u201d.') +
      '</div>';
      return;
    }

    var html = '<div class="arc-count">' + filtered.length + ' record' + (filtered.length === 1 ? '' : 's') + '</div>';
    html += '<div class="arc-list">';

    filtered.forEach(function (r) {
      var meta = [];
      if (r.customer) meta.push(_esc(r.customer));
      if (r.date)     meta.push(_esc(r.date));
      if (r.archivedAt) meta.push('archived ' + _fmtDate(r.archivedAt));

      html += (
        '<div class="arc-item" data-id="' + _esc(r.id) + '">' +
          '<div class="arc-item-body">' +
            '<div class="arc-item-job">' + _esc(r.job || 'Untitled') + '</div>' +
            (meta.length ? '<div class="arc-item-meta">' + meta.join(' \xb7 ') + '</div>' : '') +
          '</div>' +
          '<div class="arc-item-actions">' +
            '<button class="arc-restore-btn" data-id="' + _esc(r.id) + '">Restore</button>' +
          '</div>' +
        '</div>'
      );
    });

    html += '</div>';
    body.innerHTML = html;

    body.querySelectorAll('.arc-item').forEach(function (item) {
      item.addEventListener('click', function (e) {
        if (e.target.closest('.arc-restore-btn')) return;
        App.showArchivedView(this.dataset.id);
      });
    });

    body.querySelectorAll('.arc-restore-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var id = this.dataset.id;
        _restoreRecord(id);
      });
    });
  }

  function _restoreRecord(id) {
    RecordService.restore(id).then(function () {
      App.toast('Record restored');
      if (typeof WorkpadsPanel !== 'undefined' && WorkpadsPanel.refresh) WorkpadsPanel.refresh();
      _load();
    }).catch(function () {
      App.toast('Restore failed');
    });
  }

  function _fmtDate(ts) {
    if (!ts) return '';
    try {
      var d   = new Date(ts);
      var mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return d.getDate() + '\u00a0' + mon[d.getMonth()];
    } catch (e) { return ''; }
  }

  function _esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  return { onShow: onShow, onHide: onHide };

}());
