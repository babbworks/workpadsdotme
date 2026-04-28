/* ============================================================
   ManagementScreen — Records · Personal · Settings tabs
   ============================================================ */

var ManagementScreen = (function () {
  'use strict';

  var _tab         = 'records';
  var _stylesAdded = false;

  // ── Styles ───────────────────────────────────────────────────

  function _addStyles() {
    if (_stylesAdded) return;
    _stylesAdded = true;
    var s = document.createElement('style');
    s.textContent = [
      '.mgmt-wrap { max-width:700px; margin:0 auto; padding:36px 32px 80px; }',

      '.stat-grid {',
      '  display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr));',
      '  gap:12px; margin-bottom:28px;',
      '}',

      '.stat-card {',
      '  background:var(--card); border:1px solid var(--rule);',
      '  border-radius:4px; padding:16px 18px;',
      '}',
      '.stat-label {',
      '  font-family:var(--font-mono); font-size:9px; font-weight:700;',
      '  letter-spacing:.18em; text-transform:uppercase;',
      '  color:var(--ink-muted); margin-bottom:8px;',
      '}',
      '.stat-value {',
      '  font-family:var(--font-display); font-size:32px;',
      '  font-weight:700; color:var(--ink); line-height:1;',
      '}',
      '.stat-sub {',
      '  font-family:var(--font-mono); font-size:10px;',
      '  color:var(--ink-faint); margin-top:4px;',
      '}',

      '.mgmt-section-title {',
      '  font-family:var(--font-mono); font-size:10px; font-weight:700;',
      '  letter-spacing:.2em; text-transform:uppercase; color:var(--ink-muted);',
      '  margin:28px 0 12px;',
      '}',
      '.mgmt-section-title:first-child { margin-top:0; }',

      '.mgmt-info-row {',
      '  display:flex; justify-content:space-between; align-items:baseline;',
      '  padding:11px 0; border-bottom:1px solid var(--rule-light);',
      '  font-family:var(--font-mono); font-size:12px;',
      '}',
      '.mgmt-info-row:last-child { border-bottom:none; }',
      '.mgmt-info-label { color:var(--ink-muted); }',
      '.mgmt-info-value { color:var(--ink); font-weight:500; }',

      '.mgmt-danger-btn {',
      '  font-family:var(--font-mono); font-size:11px; font-weight:700;',
      '  letter-spacing:.06em; color:#b33a0a;',
      '  border:1.5px solid #e8b0a0; border-radius:3px; padding:7px 14px;',
      '  background:transparent; transition:background .13s, color .13s;',
      '}',
      '.mgmt-danger-btn:hover { background:#b33a0a; color:#fff; border-color:#b33a0a; }',
    ].join('\n');
    document.head.appendChild(s);
  }

  // ── Lifecycle ────────────────────────────────────────────────

  function onShow(params) {
    _addStyles();
    _tab = (params && params.tab) || 'records';
    _render();
  }

  function onHide() {}

  // ── Render ───────────────────────────────────────────────────

  function _render() {
    var el = document.getElementById('screen-management');
    el.innerHTML = (
      '<div class="mgmt-wrap">' +
        '<h1 class="screen-title" style="text-align:center;">Workpads</h1>' +
        '<p class="screen-subtitle" style="margin-bottom:24px;text-align:center;">Your Local Workspace</p>' +
        '<div class="tab-bar" id="mgmt-tabs">' +
          _tabBtn('records',  'Records') +
          _tabBtn('personal', 'Personal') +
          _tabBtn('settings', 'Settings') +
        '</div>' +
        '<div id="mgmt-body"></div>' +
      '</div>'
    );

    el.querySelectorAll('.tab-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        _tab = this.dataset.tab;
        el.querySelectorAll('.tab-btn').forEach(function (b) {
          b.classList.toggle('active', b.dataset.tab === _tab);
        });
        _renderTabBody();
      });
    });

    _renderTabBody();
  }

  function _tabBtn(key, label) {
    return '<button class="tab-btn' + (key === _tab ? ' active' : '') +
           '" data-tab="' + key + '">' + label + '</button>';
  }

  function _renderTabBody() {
    switch (_tab) {
      case 'records':  _renderRecords();  break;
      case 'personal': _renderPersonal(); break;
      case 'settings': _renderSettings(); break;
    }
  }

  // ── Records tab ──────────────────────────────────────────────

  function _renderRecords() {
    var body = document.getElementById('mgmt-body');
    body.innerHTML = '<div style="padding-top:8px;color:var(--ink-muted);font-family:var(--font-mono);font-size:11px;">Loading\u2026</div>';

    Promise.all([
      RecordService.list(),
      RecordService.listArchived(),
      BlockRegistry.count(),
      PersonalService.count(),
    ]).then(function (results) {
      var active   = results[0] || [];
      var archived = results[1] || [];
      var contacts = results[2] || 0;
      var notes    = results[3] || 0;

      var received = active.filter(function (r) { return !!r.receivedAt; }).length;
      var sent     = active.length - received;

      // Storage estimate
      var storageUsed = _estimateStorage();

      body.innerHTML = (
        '<div style="padding-top:8px;">' +
          '<div class="stat-grid">' +
            _stat('Active',   active.length,   'records') +
            _stat('Sent',     sent,            'created here') +
            _stat('Received', received,        'via link') +
            _stat('Archived', archived.length, 'records') +
            _stat('Contacts', contacts,        'in block registry') +
            _stat('Notes',    notes,           'personal captures') +
          '</div>' +

          '<p class="mgmt-section-title">Storage</p>' +
          '<div class="card">' +
            '<div style="padding:16px 20px;">' +
              _infoRow('Estimated usage', storageUsed) +
              _infoRow('Backend',         'localStorage (browser)') +
              _infoRow('Codec',           'pads-v1 \xb7 1ag \xb7 fflate deflate') +
              _infoRow('App version',     'Workpads v0.1.0') +
            '</div>' +
          '</div>' +

          '<p class="mgmt-section-title">Actions</p>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
            '<button class="mgmt-danger-btn" id="mgmt-clear-records">Delete Active Records</button>' +
            '<button class="mgmt-danger-btn" id="mgmt-clear-archive">Clear Archive</button>' +
            '<button class="mgmt-danger-btn" id="mgmt-clear-all-storage">Clear All Storage</button>' +
          '</div>' +
        '</div>'
      );

      var clearBtn = document.getElementById('mgmt-clear-records');
      if (clearBtn) clearBtn.addEventListener('click', _clearRecords);

      var clearArchBtn = document.getElementById('mgmt-clear-archive');
      if (clearArchBtn) clearArchBtn.addEventListener('click', _clearArchive);

      var clearAllBtn = document.getElementById('mgmt-clear-all-storage');
      if (clearAllBtn) clearAllBtn.addEventListener('click', _clearAllStorage);
    });
  }

  function _stat(label, value, sub) {
    return (
      '<div class="stat-card">' +
        '<div class="stat-label">' + label + '</div>' +
        '<div class="stat-value">' + String(value) + '</div>' +
        '<div class="stat-sub">' + sub + '</div>' +
      '</div>'
    );
  }

  function _infoRow(label, value) {
    return (
      '<div class="mgmt-info-row">' +
        '<span class="mgmt-info-label">' + _esc(label) + '</span>' +
        '<span class="mgmt-info-value">' + _esc(value) + '</span>' +
      '</div>'
    );
  }

  function _estimateStorage() {
    try {
      var total = 0;
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf('wp_') === 0) {
          total += (localStorage.getItem(k) || '').length;
        }
      }
      var kb = (total / 1024).toFixed(1);
      return kb + '\u00a0KB (workpads data)';
    } catch (e) {
      return 'Unknown';
    }
  }

  function _clearRecords() {
    if (!confirm('Delete all records permanently? This cannot be undone.')) return;
    RecordService.list().then(function (records) {
      return Promise.all(records.map(function (r) {
        return RecordService.remove(r.id);
      }));
    }).then(function () {
      App.toast('All records cleared');
      if (typeof WorkpadsPanel !== 'undefined' && WorkpadsPanel.refresh) {
        WorkpadsPanel.refresh();
      }
      _renderRecords();
    });
  }

  function _clearArchive() {
    if (!confirm('Delete all archived records permanently? This cannot be undone.')) return;
    try {
      var keysToRemove = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf('wp_archive_') === 0) keysToRemove.push(k);
      }
      keysToRemove.forEach(function (k) { localStorage.removeItem(k); });
    } catch (e) {}
    App.toast('Archive cleared');
    _renderRecords();
  }

  function _clearAllStorage() {
    if (!confirm('Delete ALL workpads data (records, archive, notes, profile)? This cannot be undone.')) return;
    try {
      var keysToRemove = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf('wp_') === 0) keysToRemove.push(k);
      }
      keysToRemove.forEach(function (k) { localStorage.removeItem(k); });
    } catch (e) {}
    App.toast('All workpads storage cleared');
    if (typeof WorkpadsPanel !== 'undefined' && WorkpadsPanel.refresh) WorkpadsPanel.refresh();
    if (typeof PersonalPanel !== 'undefined' && PersonalPanel.refresh) PersonalPanel.refresh();
    _renderRecords();
  }

  // ── Personal tab ─────────────────────────────────────────────

  function _renderPersonal() {
    var body = document.getElementById('mgmt-body');
    body.innerHTML = '<div style="padding-top:8px;color:var(--ink-muted);font-family:var(--font-mono);font-size:11px;">Loading\u2026</div>';

    PersonalService.list().then(function (notes) {
      var all        = notes || [];
      var quickCount = all.filter(function (n) { return n.source === 'quick-note'; }).length;
      var fieldCount = all.filter(function (n) { return n.source === 'field-note' || n.linkedFieldId; }).length;
      var otherCount = all.length - quickCount - fieldCount;

      body.innerHTML = (
        '<div style="padding-top:8px;">' +
          '<div class="stat-grid">' +
            _stat('Quick Notes',     quickCount, 'free-text notes') +
            _stat('Field Captures',  fieldCount, 'linked to records') +
            (otherCount > 0 ? _stat('Other', otherCount, 'captures') : '') +
          '</div>' +
          '<div class="card" style="margin-bottom:20px;">' +
            '<div style="padding:16px 20px;">' +
              _infoRow('Storage prefix', 'wp_per_') +
              _infoRow('Export', 'Coming in v0.2') +
            '</div>' +
          '</div>' +
          '<div style="display:flex;gap:8px;">' +
            '<button class="btn-ghost" id="mgmt-export-notes">Export notes</button>' +
            '<button class="mgmt-danger-btn" id="mgmt-clear-notes">Archive Saves</button>' +
          '</div>' +
        '</div>'
      );

      var exportBtn = document.getElementById('mgmt-export-notes');
      if (exportBtn) exportBtn.addEventListener('click', function () {
        App.toast('Export coming in v0.2');
      });

      var clearBtn = document.getElementById('mgmt-clear-notes');
      if (clearBtn) clearBtn.addEventListener('click', _clearNotes);
    });
  }

  function _clearNotes() {
    if (!confirm('Delete all personal notes? This cannot be undone.')) return;
    PersonalService.list().then(function (notes) {
      return Promise.all((notes || []).map(function (n) {
        return PersonalService.archive(n.id);
      }));
    }).then(function () {
      App.toast('Notes cleared');
      if (typeof PersonalPanel !== 'undefined' && PersonalPanel.refresh) {
        PersonalPanel.refresh();
      }
      _renderPersonal();
    });
  }

  // ── Settings tab ─────────────────────────────────────────────

  function _renderSettings() {
    var body = document.getElementById('mgmt-body');
    body.innerHTML = '<div style="padding-top:8px;color:var(--ink-muted);font-family:var(--font-mono);font-size:11px;">Loading\u2026</div>';

    var profile = ActivityService.getActive();
    var name  = (profile && profile.name)  || '';
    var phone = (profile && profile.phone) || '';

    body.innerHTML = (
      '<div style="padding-top:8px;">' +
        '<p class="mgmt-section-title">Your profile</p>' +
        '<div class="card">' +
          '<div class="card-section">' +
            '<div class="field-group">' +
              '<label class="field-label" for="mgmt-name">Your name</label>' +
              '<input class="field-input" id="mgmt-name" type="text" value="' + _esc(name) + '" placeholder="e.g. Alice Smith">' +
            '</div>' +
            '<div class="field-group" style="margin-bottom:0;">' +
              '<label class="field-label" for="mgmt-phone">Phone / WhatsApp <span class="field-optional">(optional)</span></label>' +
              '<input class="field-input" id="mgmt-phone" type="tel" value="' + _esc(phone) + '" placeholder="+44 7700 \u2026">' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div style="margin-top:16px;display:flex;gap:8px;">' +
          '<button class="btn-primary" id="mgmt-save-profile">Save profile</button>' +
        '</div>' +

        '<p class="mgmt-section-title">About</p>' +
        '<div class="card">' +
          '<div style="padding:16px 20px;">' +
            _infoRow('App version', 'Workpads v0.1.0') +
            _infoRow('Platform',    'Web \xb7 localStorage') +
            _infoRow('Codec',       'pads-v1 \xb7 1ag \xb7 fflate 0.8.2') +
            _infoRow('Standard',    'Workpads Standard v0.1') +
          '</div>' +
        '</div>' +
      '</div>'
    );

    var saveBtn = document.getElementById('mgmt-save-profile');
    if (saveBtn) saveBtn.addEventListener('click', _saveProfile);
  }

  function _saveProfile() {
    var name  = (document.getElementById('mgmt-name').value  || '').trim();
    var phone = (document.getElementById('mgmt-phone').value || '').trim();
    if (!name) {
      var nameEl = document.getElementById('mgmt-name');
      if (nameEl) {
        nameEl.focus();
        nameEl.style.borderColor = 'var(--stamp)';
        setTimeout(function () { nameEl.style.borderColor = ''; }, 1400);
      }
      App.toast('Name is required');
      return;
    }
    ActivityService.update({ name: name, phone: phone });
    App.toast('Profile saved');
  }

  // ── Helpers ──────────────────────────────────────────────────

  function _esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── Public ───────────────────────────────────────────────────

  return { onShow: onShow, onHide: onHide };

}());
