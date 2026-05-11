/* ============================================================
   Workpads Web App — app.js
   Router · Panel controller · Onboarding · Quick note · Boot
   ============================================================ */

var App = (function () {
  'use strict';

  // ── State ────────────────────────────────────────────────────
  var _currentScreen    = null;
  var _leftCollapsed    = false;
  var _rightCollapsed   = false;
  var _booted           = false;

  // ── DOM refs (populated in boot) ────────────────────────────
  var el = {};

  // ── Screen registry ──────────────────────────────────────────
  // Each entry is either a screen object (with onShow / onHide)
  // or null if not yet implemented.
  var SCREENS = {};

  // ── Routing ──────────────────────────────────────────────────

  function navigate(path) {
    window.location.hash = path;
  }

  function _route() {
    var hash  = window.location.hash.slice(1) || '/';
    var parts = hash.replace(/^\//, '').split('/').filter(Boolean);
    var name  = parts[0] || 'list';
    var seg1  = parts[1] || null;  // id or tab
    var seg2  = parts[2] || null;  // sub-param
    var seg3  = parts[3] || null;  // action index (expense only)

    switch (name) {
      case 'list':
      case '':
        _showScreen('list', {});
        break;
      case 'new':
        _showScreen('wizard', { mode: 'new' });
        break;
      case 'edit':
        if (!seg1) { navigate('/'); return; }
        _showScreen('wizard', { mode: 'edit', id: seg1 });
        break;
      case 'view':
        if (!seg1) { navigate('/'); return; }
        _showScreen('view', { id: seg1 });
        break;
      case 'share':
        if (!seg1) { navigate('/'); return; }
        _showScreen('share', { id: seg1 });
        break;
      case 'expense':
        if (!seg1) { navigate('/'); return; }
        _showScreen('wizard', { mode: 'expense', parentId: seg1, amount: seg2 || null, actionIdx: seg3 != null ? parseInt(seg3, 10) : null });
        break;
      case 'cogs':
        if (!seg1) { navigate('/'); return; }
        _showScreen('wizard', { mode: 'expense', parentId: seg1, billing: 'cogs', amount: seg2 || null, linkedExpenseId: seg3 || null });
        break;
      case 'cogs-action':
        if (!seg1) { navigate('/'); return; }
        _showScreen('wizard', { mode: 'expense', parentId: seg1, billing: 'cogs', actionIdx: seg2 != null ? parseInt(seg2, 10) : null, actionQuoted: seg3 || null });
        break;
      case 'archive':
        _showScreen('archive', {});
        break;
      case 'archived':
        if (!seg1) { navigate('/archive'); return; }
        _showScreen('view', { id: seg1, isArchived: true });
        break;
      case 'payment':
        if (!seg1) { navigate('/'); return; }
        _showScreen('wizard', { mode: 'payment', parentId: seg1 });
        break;
      case 'manage':
        _showScreen('management', { tab: seg1 || 'records' });
        break;
      case 'financial':
        if (!seg1) { navigate('/'); return; }
        _showScreen('financial', { id: seg1, tab: seg2 || 'summary' });
        break;
      case 'finance':
        _showScreen('finance-overview', { mode: seg1 || 'basic' });
        break;
      default:
        navigate('/');
    }
  }

  function _showScreen(name, params) {
    // Hide previous screen
    if (_currentScreen && _currentScreen !== name) {
      var prevEl = document.getElementById('screen-' + _currentScreen);
      if (prevEl) prevEl.classList.remove('active');
      var prev = SCREENS[_currentScreen];
      if (prev && prev.onHide) prev.onHide();
    }

    var screenEl = document.getElementById('screen-' + name);
    if (!screenEl) return;

    _currentScreen = name;
    screenEl.classList.add('active');

    // Update topbar context label
    _setTopbarContext(name, params);

    // Show / hide topbar New button (if present)
    if (el.btnNew) el.btnNew.style.display = (name === 'wizard') ? 'none' : '';

    // Invoke screen
    var screen = SCREENS[name];
    if (screen && screen.onShow) {
      screen.onShow(params);
    } else {
      _renderPlaceholder(screenEl, name);
    }

    // Scroll main area to top on every screen change
    el.mainArea.scrollTop = 0;

    // Suppress panels on management screen
    el.content.classList.toggle('panels-suppressed', name === 'management');

    // Update side panels
    var recordId = (name === 'view' || name === 'edit' || name === 'share')
      ? (params && params.id) || null
      : null;
    if (typeof PersonalPanel !== 'undefined' && PersonalPanel.setContext) {
      PersonalPanel.setContext(recordId);
    }
    if (typeof WorkpadsPanel !== 'undefined') {
      if (WorkpadsPanel.setContext) WorkpadsPanel.setContext(name, params || {});
      if (WorkpadsPanel.refresh)   WorkpadsPanel.refresh();
    }
  }

  function _setTopbarContext(name, params) {
    var labels = {
      list:       '',
      wizard:     params && params.mode === 'edit' ? 'Edit record' : 'New record',
      view:       'View record',
      share:      'Share record',
      management: 'Manage',
    };
    var label = labels[name] || '';
    if (el.topbarContext) {
      el.topbarContext.innerHTML = label
        ? '<span class="topbar-context-title">' + _esc(label) + '</span>'
        : '';
    }
  }

  function _renderPlaceholder(screenEl, name) {
    screenEl.innerHTML =
      '<div class="screen-inner">' +
        '<p style="padding-top:60px;font-family:var(--font-mono);font-size:11px;' +
            'color:var(--ink-faint);letter-spacing:0.08em;">' +
          'Screen \u201c' + _esc(name) + '\u201d \u2014 not yet loaded.' +
        '</p>' +
      '</div>';
  }

  // ── Public navigation helpers ────────────────────────────────

  function showList()                  { navigate('/'); }
  function showWizard(id)              { navigate(id ? '/edit/' + id : '/new'); }
  function showView(id)                { navigate('/view/' + id); }
  function showShare(id)               { navigate('/share/' + id); }
  function showExpense(parentId, amount, actionIdx) {
    var path = '/expense/' + parentId;
    if (amount || actionIdx != null) path += '/' + (amount || '_');
    if (actionIdx != null) path += '/' + actionIdx;
    navigate(path);
  }
  function showCogs(parentId, amount, linkedExpenseId) {
    var path = '/cogs/' + parentId;
    if (amount || linkedExpenseId) path += '/' + (amount || '_');
    if (linkedExpenseId) path += '/' + linkedExpenseId;
    navigate(path);
  }
  function showCogsAction(parentId, actionIdx, actionQuoted) {
    var path = '/cogs-action/' + parentId + '/' + actionIdx;
    if (actionQuoted) path += '/' + actionQuoted;
    navigate(path);
  }
  function showFinancial(id, tab)       { navigate('/financial/' + id + (tab ? '/' + tab : '')); }
  function showFinanceOverview(mode)    { navigate('/finance/' + (mode || 'basic')); }
  function showArchive()               { navigate('/archive'); }
  function showArchivedView(id)        { navigate('/archived/' + id); }
  function showPayment(parentId)       { navigate('/payment/' + parentId); }
  function showManagement(tab)         { navigate('/manage/' + (tab || 'records')); }

  // ── Panels ───────────────────────────────────────────────────

  var _STORAGE_LEFT  = 'wp_ui_left_collapsed';
  var _STORAGE_RIGHT = 'wp_ui_right_collapsed';

  function _initPanels() {
    _leftCollapsed  = localStorage.getItem(_STORAGE_LEFT)  === 'true';
    _rightCollapsed = localStorage.getItem(_STORAGE_RIGHT) === 'true';
    _applyPanelState(false); // no transition on initial load

    el.toggleLeft.addEventListener('click',  _toggleLeft);
    el.toggleRight.addEventListener('click', _toggleRight);
  }

  function _toggleLeft() {
    _leftCollapsed = !_leftCollapsed;
    localStorage.setItem(_STORAGE_LEFT, String(_leftCollapsed));
    _applyPanelState(true);
  }

  function _toggleRight() {
    _rightCollapsed = !_rightCollapsed;
    localStorage.setItem(_STORAGE_RIGHT, String(_rightCollapsed));
    _applyPanelState(true);
  }

  function _applyPanelState(animate) {
    if (!animate) el.content.style.transition = 'none';
    el.content.classList.toggle('left-collapsed',  _leftCollapsed);
    el.content.classList.toggle('right-collapsed', _rightCollapsed);
    if (!animate) {
      // Re-enable transition after the sync paint
      requestAnimationFrame(function() {
        el.content.style.transition = '';
      });
    }
  }

  // Mobile panel drawers
  function _initMobilePanels() {
    // Mobile toggle buttons injected into topbar via CSS display:none on desktop
    // Panels become position:fixed drawers — controlled by .mobile-open class
    var backdrop = document.createElement('div');
    backdrop.id = 'mobile-backdrop';
    backdrop.style.cssText =
      'display:none;position:fixed;inset:0;background:rgba(25,20,15,.35);' +
      'z-index:199;backdrop-filter:blur(2px);';
    document.body.appendChild(backdrop);

    backdrop.addEventListener('click', function() {
      el.panelLeft.classList.remove('mobile-open');
      el.panelRight.classList.remove('mobile-open');
      backdrop.style.display = 'none';
      // Reset import-mode placeholder if it was set
      var inp = document.getElementById('ppp-add-input');
      if (inp && inp.placeholder !== 'Quick note\u2026') inp.placeholder = 'Quick note\u2026';
    });
  }

  function _openMobilePanel(side) {
    var backdrop = document.getElementById('mobile-backdrop');
    el.panelLeft.classList.toggle('mobile-open',  side === 'left');
    el.panelRight.classList.toggle('mobile-open', side === 'right');
    if (backdrop) backdrop.style.display = 'block';
  }

  // ── Onboarding ───────────────────────────────────────────────

  function _checkOnboarding() {
    if (!ActivityService.hasAny()) _showOnboarding();
    return Promise.resolve();
  }

  function _showOnboarding() {
    el.overlayOnboarding.style.display = 'flex';
    setTimeout(function() {
      var input = document.getElementById('onboard-name');
      if (input) input.focus();
    }, 120);
  }

  // Seed two realistic demo records on first onboarding so new users land
  // on a populated list that demonstrates the full feature set.
  function _seedDemoRecords() {
    if (localStorage.getItem('wp_demos_v1')) return;
    localStorage.setItem('wp_demos_v1', '1');

    var t  = Date.now();
    var D1 = 'demo1r';
    var D2 = 'demo2r';

    var records = [

      // ── Record 1 — Invoice: boiler service ──────────────────
      { id: D1, record_type: 'invoice',
        job: 'Boiler service & pressure fix', customer: 'Helen Marsh',
        date: '2026-05-08', location: '14 Birch Lane',
        start_time: '09:00', end_time: '13:30', meeting_time: '08:45',
        customer_phone: '+44 7700 900142',
        worker: 'James Owens',
        participants: [
          { name: 'James Owens', role: 'worker' },
          { name: 'Tom Bradley', role: 'sub' },
        ],
        amount: '420.00', currency: 'GBP', vat: 'standard',
        charge_type: '', parts_flag: true, worker_cost: '180.00',
        actions: [
          { title: 'Flush & inspect system',        notes: 'Pressure low on arrival — 0.4 bar' },
          { title: 'Replace pressure relief valve', notes: 'Faulty 3-bar PRV — part no. PRV-3B' },
          { title: 'Top up system inhibitor',       notes: 'Fernox F1, 500ml' },
          { title: 'Commission & sign-off',         notes: '' },
        ],
        story: 'Found system pressure critically low. Replaced faulty relief valve, flushed system, and added inhibitor. All radiators heating evenly on completion.',
        details: 'Potterton 28kW. Final pressure 1.5 bar. PRV rated 3 bar. Inhibitor: Fernox F1.',
        chainRef: 'AAEC', draft: false, createdAt: t - 259200000, updatedAt: t - 86400000 },

      // Expenses for D1
      { id: 'demo1e1', parentId: D1, recordType: 'expense',
        job: 'Pressure relief valve', amount: '65.00', currency: 'GBP',
        expense_billing: 'customer', charge_type: '6', actionIdx: 1,
        date: '2026-05-08', draft: false, createdAt: t - 86400000, updatedAt: t - 86400000 },

      { id: 'demo1e2', parentId: D1, recordType: 'expense',
        job: 'Fernox F1 inhibitor', amount: '18.50', currency: 'GBP',
        expense_billing: 'customer', charge_type: '6', actionIdx: 2,
        date: '2026-05-08', draft: false, createdAt: t - 86400000, updatedAt: t - 86400000 },

      { id: 'demo1c1', parentId: D1, recordType: 'expense',
        job: 'Parts cost', amount: '55.00', currency: 'GBP',
        expense_billing: 'cogs', charge_type: '6', action_quoted: '83.50',
        date: '2026-05-08', draft: false, createdAt: t - 86400000, updatedAt: t - 86400000 },

      // Partial payment for D1
      { id: 'demo1p1', parentId: D1, recordType: 'payment',
        job: 'Deposit', amount: '200.00', currency: 'GBP',
        date: '2026-05-07', draft: false, createdAt: t - 172800000, updatedAt: t - 172800000 },

      // ── Record 2 — Quote: consumer unit upgrade ─────────────
      { id: D2, record_type: 'quote',
        job: 'Consumer unit upgrade', customer: 'Park View Estates',
        date: '2026-05-14', location: 'Unit 3, Park View Rd',
        start_time: '08:00', end_time: '17:00', meeting_time: '07:45',
        customer_phone: '+44 7911 123456',
        worker: 'Sarah Chen',
        participants: [
          { name: 'Sarah Chen', role: 'worker' },
        ],
        amount: '1850.00', currency: 'GBP', vat: 'standard',
        charge_type: '', parts_flag: true, worker_cost: '920.00',
        actions: [
          { title: 'Survey & disconnect old board', notes: 'Wylex split-load — 18th Ed non-compliant' },
          { title: 'Install new consumer unit',     notes: '17-way dual RCD board (DBDB17)' },
          { title: 'Test, certify & handover',      notes: 'EICR + Part P notification required' },
        ],
        story: 'Quote for full consumer unit replacement to 18th Edition standards. Existing Wylex board removed. All circuits tested and certified on completion.',
        details: '18th Ed DBDB17 board. Part P notification required post-install. EICR to be issued. Allow full day.',
        chainRef: 'AAED', draft: false, createdAt: t - 172800000, updatedAt: t - 43200000 },

      // Expenses for D2
      { id: 'demo2e1', parentId: D2, recordType: 'expense',
        job: '18th Ed consumer unit', amount: '145.00', currency: 'GBP',
        expense_billing: 'customer', charge_type: '5', actionIdx: 1,
        date: '2026-05-14', draft: false, createdAt: t - 43200000, updatedAt: t - 43200000 },

      { id: 'demo2e2', parentId: D2, recordType: 'expense',
        job: 'Cabling & fixings', amount: '85.00', currency: 'GBP',
        expense_billing: 'customer', charge_type: '6', actionIdx: 1,
        date: '2026-05-14', draft: false, createdAt: t - 43200000, updatedAt: t - 43200000 },

      { id: 'demo2c1', parentId: D2, recordType: 'expense',
        job: 'Materials cost', amount: '165.00', currency: 'GBP',
        expense_billing: 'cogs', charge_type: '6', action_quoted: '230.00', actionIdx: 1,
        date: '2026-05-14', draft: false, createdAt: t - 43200000, updatedAt: t - 43200000 },
    ];

    records.forEach(function(rec) {
      localStorage.setItem('wp_record_' + rec.id, JSON.stringify(rec));
    });
  }

  function _completeOnboarding() {
    var nameVal  = (document.getElementById('onboard-name').value  || '').trim();
    var phoneVal = (document.getElementById('onboard-phone').value || '').trim();
    if (!nameVal) {
      var nameInput = document.getElementById('onboard-name');
      nameInput.focus();
      nameInput.style.borderColor = 'var(--stamp)';
      setTimeout(function() { nameInput.style.borderColor = ''; }, 1200);
      return;
    }
    ActivityService.create({ name: nameVal, phone: phoneVal });
    _seedDemoRecords();
    el.overlayOnboarding.style.display = 'none';
    if (typeof WorkpadsPanel !== 'undefined' && WorkpadsPanel.refresh) {
      WorkpadsPanel.refresh();
    }
    _route();
  }

  // ── Quick note ───────────────────────────────────────────────

  function showQuickNote() {
    el.overlayQuicknote.style.display = 'flex';
    setTimeout(function() {
      var input = document.getElementById('quicknote-input');
      if (input) { input.value = ''; input.focus(); }
    }, 60);
  }

  function _saveQuickNote() {
    var text = (document.getElementById('quicknote-input').value || '').trim();
    if (!text) { _hideQuickNote(); return; }
    PersonalService.capture({ text: text, source: 'quick-note' }).then(function() {
      _hideQuickNote();
      toast('Note saved');
      if (typeof PersonalPanel !== 'undefined' && PersonalPanel.refresh) {
        PersonalPanel.refresh();
      }
    });
  }

  function _hideQuickNote() {
    el.overlayQuicknote.style.display = 'none';
  }

  // ── Toast ────────────────────────────────────────────────────

  function toast(message, duration) {
    duration = duration || 2200;
    var existing = document.querySelector('.toast');
    if (existing) existing.remove();

    var t = document.createElement('div');
    t.className = 'toast';
    t.textContent = message;
    document.body.appendChild(t);

    setTimeout(function() {
      t.classList.add('hiding');
      setTimeout(function() { if (t.parentNode) t.remove(); }, 220);
    }, duration);
  }

  // ── Keyboard shortcuts ───────────────────────────────────────

  function _initKeyboard() {
    document.addEventListener('keydown', function(e) {
      var inInput = (document.activeElement.tagName === 'INPUT' ||
                     document.activeElement.tagName === 'TEXTAREA');

      // Escape: close overlays in order
      if (e.key === 'Escape') {
        var noteDetail = document.getElementById('overlay-note-detail');
        if (noteDetail && noteDetail.style.display !== 'none') {
          noteDetail.style.display = 'none'; return;
        }
        if (el.overlayQuicknote.style.display !== 'none') { _hideQuickNote(); return; }
        if (el.overlayOnboarding.style.display !== 'none') return; // can't escape onboarding
      }

      // Ctrl/Cmd + . or * — quick note (not when typing)
      if (!inInput && (e.ctrlKey || e.metaKey) && e.key === '.') {
        e.preventDefault();
        showQuickNote();
        return;
      }
      if (!inInput && e.key === '*') {
        e.preventDefault();
        showQuickNote();
        return;
      }

      // Ctrl/Cmd + N — new workpad (not when typing)
      if (!inInput && (e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        showWizard();
        return;
      }

      // Backspace or Alt+Left — go back to list (not in inputs, not on list)
      if (!inInput && e.key === 'Backspace' && _currentScreen !== 'list') {
        e.preventDefault();
        showList();
        return;
      }
    });
  }

  // ── Helpers ──────────────────────────────────────────────────

  function _esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // ── Boot ─────────────────────────────────────────────────────

  function boot() {
    if (_booted) return;
    _booted = true;

    // Collect DOM refs
    el.content           = document.getElementById('content');
    el.mainArea          = document.getElementById('main-area');
    el.topbarContext     = document.getElementById('topbar-context');   // may be null (topbar removed)
    el.toggleLeft        = document.getElementById('toggle-left');
    el.toggleRight       = document.getElementById('toggle-right');
    el.panelLeft         = document.getElementById('panel-left');
    el.panelRight        = document.getElementById('panel-right');
    el.overlayOnboarding = document.getElementById('overlay-onboarding');
    el.overlayQuicknote  = document.getElementById('overlay-quicknote');
    el.btnNew            = document.getElementById('btn-new');          // may be null (topbar removed)
    el.btnManage         = document.getElementById('btn-manage');       // may be null (topbar removed)
    el.mobileBtnLeft     = document.getElementById('mobile-btn-left');   // filled disc — records panel
    el.mobileBtnRight    = document.getElementById('mobile-btn-right');  // unfilled circle — personal panel
    el.mobileBtnNote     = document.getElementById('mobile-btn-note');   // pencil — quick note
    el.mobileBtnImport   = document.getElementById('mobile-btn-import'); // arrow — import link
    el.panelLeftTitle    = document.getElementById('panel-left-title');

    // Register screens — each file exposes a global screen object
    SCREENS = {
      list:       (typeof ListScreen       !== 'undefined') ? ListScreen       : null,
      wizard:     (typeof WizardScreen     !== 'undefined') ? WizardScreen     : null,
      view:       (typeof ViewScreen       !== 'undefined') ? ViewScreen       : null,
      share:      (typeof ShareScreen      !== 'undefined') ? ShareScreen      : null,
      management: (typeof ManagementScreen !== 'undefined') ? ManagementScreen : null,
      archive:    (typeof ArchiveScreen    !== 'undefined') ? ArchiveScreen    : null,
      financial:  (typeof FinancialScreen  !== 'undefined') ? FinancialScreen  : null,
      'finance-overview': (typeof FinanceOverviewScreen !== 'undefined') ? FinanceOverviewScreen : null,
    };

    // Panels
    _initPanels();
    _initMobilePanels();

    // Initialise panel modules
    if (typeof WorkpadsPanel !== 'undefined' && WorkpadsPanel.init) WorkpadsPanel.init();
    if (typeof PersonalPanel !== 'undefined' && PersonalPanel.init) PersonalPanel.init();

    // Topbar buttons (may not exist if topbar removed)
    if (el.btnNew)    el.btnNew.addEventListener('click',    function() { showWizard(); });
    if (el.btnManage) el.btnManage.addEventListener('click', function() { showManagement(); });
    if (el.mobileBtnLeft)   el.mobileBtnLeft.addEventListener('click',   function() { _openMobilePanel('left'); });
    if (el.mobileBtnRight)  el.mobileBtnRight.addEventListener('click',  function() { _openMobilePanel('right'); });
    if (el.mobileBtnNote)   el.mobileBtnNote.addEventListener('click',   function() { showQuickNote(); });
    if (el.mobileBtnImport) el.mobileBtnImport.addEventListener('click', function() {
      showImport();
    });

    // Panel title — clicking "RECORDS" label shows all records (clears any context)
    if (el.panelLeftTitle) {
      el.panelLeftTitle.addEventListener('click', function() {
        if (_currentScreen === 'list') {
          // Already on list — just refresh panel to show all
          if (typeof WorkpadsPanel !== 'undefined' && WorkpadsPanel.refresh) WorkpadsPanel.refresh();
        } else {
          showList();
        }
      });
    }

    // Onboarding overlay
    document.getElementById('onboard-submit').addEventListener('click', _completeOnboarding);
    el.overlayOnboarding.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') _completeOnboarding();
    });

    // Quick note overlay
    document.getElementById('quicknote-cancel').addEventListener('click', _hideQuickNote);
    document.getElementById('quicknote-save').addEventListener('click',   _saveQuickNote);
    document.getElementById('quicknote-input').addEventListener('keydown', function(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') _saveQuickNote();
      if (e.key === 'Escape') _hideQuickNote();
    });
    el.overlayQuicknote.addEventListener('click', function(e) {
      if (e.target === el.overlayQuicknote) _hideQuickNote();
    });

    // Keyboard
    _initKeyboard();

    // Hash routing — listen for changes
    window.addEventListener('hashchange', _route);

    // Wire import overlay
    _initImport();

    var urlParams = new URLSearchParams(window.location.search);

    // ?import=<url> — receiver page redirects here to import a record
    if (urlParams.get('import')) {
      var importTarget = urlParams.get('import');
      _checkOnboarding().then(function() {
        _route();
        setTimeout(function() { showImport(decodeURIComponent(importTarget)); }, 300);
      });
      return;
    }

    // ?start=1 from receiver page — skip onboarding if account already exists
    if (urlParams.get('start') === '1') {
      _showScreen('list', {});
      if (!ActivityService.hasAny()) _showOnboarding();
      return;
    }

    // Handle Web Share Target launch (?from=share&url=...&text=...&title=...)
    if (urlParams.get('from') === 'share') {
      var sharedUrl  = urlParams.get('url')  || '';
      var sharedText = urlParams.get('text') || '';
      // Prefer explicit url param; fall back to text if it looks like a URL
      var candidate = sharedUrl || (sharedText.indexOf('workpads.me/p') !== -1 ? sharedText : '');
      _checkOnboarding().then(function () {
        _route();
        if (candidate) {
          setTimeout(function () { showImport(candidate); }, 300);
        }
      });
      return;
    }

    // Normal boot: onboarding check → route
    _checkOnboarding().then(function() {
      _route();
    });
  }

  // ── Import from workpads link ────────────────────────────────

  var _importDecoded = null;

  function _initImport() {
    var overlay   = document.getElementById('overlay-import');
    var cancelBtn = document.getElementById('import-cancel');
    var saveBtn   = document.getElementById('import-save');
    var urlInput  = document.getElementById('import-url-input');
    var errorEl   = document.getElementById('import-error');
    var previewEl = document.getElementById('import-preview');

    if (!overlay) return;

    function _hideImport() {
      overlay.style.display = 'none';
      _importDecoded = null;
      if (urlInput) urlInput.value = '';
      if (errorEl)  errorEl.style.display = 'none';
      if (previewEl) previewEl.style.display = 'none';
      if (saveBtn)  saveBtn.disabled = true;
    }

    function _tryDecode(url) {
      if (!url) return;
      var clean = url.trim();
      // Strip https:// prefix so codec hash extraction works
      clean = clean.replace(/^https?:\/\//, '');
      try {
        var rec = WPCodec.decode(clean);
        _importDecoded = rec;
        if (errorEl) errorEl.style.display = 'none';
        if (saveBtn) saveBtn.disabled = false;
        // Render preview
        if (previewEl) {
          var rows = [];
          if (rec.job)      rows.push(['Job',      rec.job]);
          if (rec.customer) rows.push(['Customer', rec.customer]);
          if (rec.date)     rows.push(['Date',     rec.date]);
          if (rec.worker)   rows.push(['Worker',   rec.worker]);
          if (rec.amount)   rows.push(['Amount',   (rec.currency || '') + ' ' + rec.amount]);
          var html = rows.map(function (r) {
            return '<div class="import-preview-row">' +
              '<span class="import-preview-label">' + _esc(r[0]) + '</span>' +
              '<span>' + _esc(r[1]) + '</span></div>';
          }).join('');
          if (!html) html = '<div class="import-preview-row"><span class="import-preview-label">Record</span><span>decoded — no preview fields</span></div>';
          previewEl.innerHTML = html;
          previewEl.style.display = 'block';
        }
      } catch (err) {
        _importDecoded = null;
        if (saveBtn) saveBtn.disabled = true;
        if (previewEl) previewEl.style.display = 'none';
        if (errorEl) {
          errorEl.textContent = 'Not a valid workpads link.';
          errorEl.style.display = 'block';
        }
      }
    }

    if (urlInput) {
      urlInput.addEventListener('input', function () { _tryDecode(this.value); });
      urlInput.addEventListener('paste', function () {
        var self = this;
        setTimeout(function () { _tryDecode(self.value); }, 20);
      });
    }

    if (cancelBtn) cancelBtn.addEventListener('click', _hideImport);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) _hideImport();
    });

    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        if (!_importDecoded) return;
        RecordService.storeReceived(_importDecoded).then(function (created) {
          _hideImport();
          toast('Workpad imported');
          if (typeof WorkpadsPanel !== 'undefined' && WorkpadsPanel.refresh) WorkpadsPanel.refresh();
          if (created && created.id) showView(created.id);
        }).catch(function () {
          if (errorEl) { errorEl.textContent = 'Save failed. Try again.'; errorEl.style.display = 'block'; }
        });
      });
    }
  }

  function showImport(prefillUrl) {
    var overlay  = document.getElementById('overlay-import');
    var urlInput = document.getElementById('import-url-input');
    var saveBtn  = document.getElementById('import-save');
    var errorEl  = document.getElementById('import-error');
    var previewEl = document.getElementById('import-preview');
    if (!overlay) return;
    _importDecoded = null;
    if (urlInput) urlInput.value = '';
    if (errorEl)  errorEl.style.display = 'none';
    if (previewEl) previewEl.style.display = 'none';
    if (saveBtn)  saveBtn.disabled = true;
    overlay.style.display = 'flex';
    if (prefillUrl) {
      if (urlInput) { urlInput.value = prefillUrl; }
      // Fire decode on the prefilled value via a synthetic event
      setTimeout(function () {
        if (urlInput) urlInput.dispatchEvent(new Event('input'));
      }, 60);
    } else {
      setTimeout(function () { if (urlInput) urlInput.focus(); }, 80);
    }
  }

  // ── Public API ───────────────────────────────────────────────

  return {
    boot:           boot,
    navigate:       navigate,
    showList:       showList,
    showWizard:     showWizard,
    showView:       showView,
    showShare:      showShare,
    showExpense:    showExpense,
    showCogs:       showCogs,
    showCogsAction: showCogsAction,
    showPayment:    showPayment,
    showManagement: showManagement,
    showManage:     showManagement,
    showFinancial:      showFinancial,
    showFinanceOverview: showFinanceOverview,
    showArchive:    showArchive,
    showArchivedView: showArchivedView,
    showQuickNote:  showQuickNote,
    showImport:     showImport,
    toast:          toast,
    openMobilePanel: _openMobilePanel,
  };

}());

document.addEventListener('DOMContentLoaded', App.boot);
