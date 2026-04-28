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
        _showScreen('wizard', { mode: 'expense', parentId: seg1 });
        break;
      case 'manage':
        _showScreen('management', { tab: seg1 || 'records' });
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
  function showExpense(parentId)       { navigate('/expense/' + parentId); }
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
    el.mobileBtnLeft     = document.getElementById('mobile-btn-left');  // may be null (topbar removed)
    el.mobileBtnRight    = document.getElementById('mobile-btn-right'); // may be null (topbar removed)
    el.panelLeftTitle    = document.getElementById('panel-left-title');

    // Register screens — each file exposes a global screen object
    SCREENS = {
      list:       (typeof ListScreen       !== 'undefined') ? ListScreen       : null,
      wizard:     (typeof WizardScreen     !== 'undefined') ? WizardScreen     : null,
      view:       (typeof ViewScreen       !== 'undefined') ? ViewScreen       : null,
      share:      (typeof ShareScreen      !== 'undefined') ? ShareScreen      : null,
      management: (typeof ManagementScreen !== 'undefined') ? ManagementScreen : null,
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
    if (el.mobileBtnLeft)  el.mobileBtnLeft.addEventListener('click',  function() { _openMobilePanel('left'); });
    if (el.mobileBtnRight) el.mobileBtnRight.addEventListener('click', function() { _openMobilePanel('right'); });

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

    // Handle ?start=1 from receiver page (bypass normal onboarding gate timing)
    var urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('start') === '1') {
      _showScreen('list', {});
      _showOnboarding();
      return;
    }

    // Normal boot: onboarding check → route
    _checkOnboarding().then(function() {
      _route();
    });
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
    showManagement: showManagement,
    showManage:     showManagement,
    showQuickNote:  showQuickNote,
    toast:          toast,
    openMobilePanel: _openMobilePanel,
  };

}());

document.addEventListener('DOMContentLoaded', App.boot);
