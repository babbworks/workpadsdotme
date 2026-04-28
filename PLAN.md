# workpads.me — Web App Plan

**Status:** Architecture settled — ready to code
**Repo:** workpadsdotme
**Scope:** Full browser-based Workpads app (localStorage, bitpad-v1, no server)

---

## What This Site Is

workpads.me is the operational web version of Workpads. Not a marketing page — a working app.

- `workpads.me/` — the app (create, view, list, share, manage records)
- `workpads.me/p` — receiver (view a shared workpad link) — DONE

The "account" is localStorage. No signup. No server. One click to start.

---

## Core Differences from KaiOS App

| KaiOS | Web |
|-------|-----|
| D-pad navigation | Mouse + keyboard |
| Softkey bar (LSK/CSK/RSK) | Button bar at bottom of main panel |
| Panels: ArrowLeft/Right overlay | Panels: always visible sidebars, collapsible |
| 240×320px fixed | Responsive: 320px mobile → full desktop |
| Single column, full screen | Three-column layout on desktop |
| Screen stack (one at a time) | Panels persist across screen changes |

---

## Layout: Three-Column Desktop

```
┌─────────────────────────────────────────────────────────┐
│  WORKPADS                                    [New] [···] │  ← topbar
├──────────────┬──────────────────────┬────────────────────┤
│              │                      │                    │
│  Workpads    │   Main screen area   │   Personal         │
│  Panel       │                      │   Panel            │
│  (left)      │   [list / wizard /   │   (right)          │
│              │    view / share /    │                    │
│  Records     │    management]       │   Quick notes      │
│  list with   │                      │   timeline         │
│  search      │                      │                    │
│              │                      │                    │
│  [collapse]  │                      │   [collapse]       │
└──────────────┴──────────────────────┴────────────────────┘
```

On mobile (< 768px): panels collapse to icons / swipe drawers, main area is full width.

Panels have a collapse toggle (arrow button) that slides them off-screen and saves state to localStorage. On next load, panel state is restored.

---

## Screens

Same screens as KaiOS app — adapted for mouse:

| Screen | Key changes from KaiOS |
|--------|----------------------|
| `list` | Click to open record; search/filter input at top; no softkey nav |
| `wizard` | Tabs across top (P/A/D/S) clickable; inputs standard; Save button |
| `view` | Action buttons inline (Share / Edit / Archive) — no options overlay needed |
| `share` | Full URL displayed + click-to-copy button; QR code (future) |
| `management` | Tabs clickable; settings save on blur (not RSK) |
| `onboarding` | Same flow; Enter key submits; shown once on first visit |

---

## Panels

### Workpads Panel (left sidebar)
- Shows all records; click opens in main area
- Search box at top
- "New workpad" button at bottom
- Collapse to icon strip on narrow screens
- Width: ~240px, collapsible

### Personal Panel (right sidebar)
- Quick notes list
- "+" button to add a quick note (inline textarea, Enter to save)
- Notes show timestamp + first 80 chars
- Collapse to icon strip
- Width: ~220px, collapsible

Panel collapse state persisted in localStorage: `wp_ui_left_collapsed`, `wp_ui_right_collapsed`.

---

## Navigation Model

No D-pad. Navigation is click-based + URL-hash routing:

| Hash | Screen |
|------|--------|
| `#/` or empty | list |
| `#/new` | wizard (new record) |
| `#/edit/:id` | wizard (edit existing) |
| `#/view/:id` | view screen |
| `#/share/:id` | share screen |
| `#/manage` | management screen |

The `p` path (`/p#alg=bitpad-v1...`) is a separate page — the standalone receiver. It does not use the app shell.

---

## Services

Copy directly from workpadskaios — all services are browser-compatible vanilla JS:

| File | Source | Changes needed |
|------|--------|---------------|
| `js/lib/codec.js` | workpadskaios/js/lib/codec.js | None — DONE |
| `js/lib/fflate.js` | workpadskaios/js/lib/fflate.js | None — DONE |
| `js/services/StorageAdapter.js` | workpadskaios/js/StorageAdapter.js | None |
| `js/services/ActivityService.js` | workpadskaios/js/ActivityService.js | None |
| `js/services/RecordService.js` | workpadskaios/js/RecordService.js | None |
| `js/services/PersonalService.js` | workpadskaios/js/PersonalService.js | None |
| `js/services/BlockRegistry.js` | workpadskaios/js/BlockRegistry.js | None |

All services are pure localStorage + WPCodec — zero changes needed.

---

## Screens (new, browser-adapted)

All screens rewritten from scratch — no softkey logic, no D-pad events. Mouse-first.

| File | Notes |
|------|-------|
| `js/screens/list.js` | Click handlers; search input |
| `js/screens/wizard.js` | Tab click nav; standard form inputs; Save/Cancel buttons |
| `js/screens/view.js` | Inline action buttons; no options overlay |
| `js/screens/share.js` | Copy button; URL display |
| `js/screens/management.js` | Tab click nav; auto-save on blur |

---

## App Shell

`index.html` structure:
```
<div id="shell">
  <div id="topbar">...</div>
  <div id="content">
    <aside id="panel-left" class="panel">...</aside>
    <main id="main-area">
      <!-- screens render here -->
    </main>
    <aside id="panel-right" class="panel">...</aside>
  </div>
</div>

<!-- overlays -->
<div id="overlay-onboarding">...</div>
<div id="overlay-quicknote">...</div>
```

---

## Onboarding

Same as KaiOS: shown on first launch if no ActivityService profile exists. Modal overlay. Name + phone. Submit closes overlay and shows list.

Nudge copy for people arriving from a received workpad (`/p`) who click "Start yours":
- Redirect to `workpads.me/#/` with a `?start=1` query param
- App detects this, skips onboarding-gate and shows onboarding modal immediately with messaging: "No signup. Your records live on this device."

---

## CSS Strategy

Single `css/app.css`. Aesthetic carries from the receiver page ("The Telegram"):
- Same font stack: Fraunces + JetBrains Mono + Libre Baskerville
- Same warm paper palette
- Panels have subtle inner shadow to separate from main
- Responsive via CSS Grid (three-column → one-column collapse)
- No framework

---

## File Structure (final)

```
workpadsdotme/
  index.html                    App shell
  css/
    app.css                     All styles
  js/
    app.js                      Router + panel controller + boot
    lib/
      fflate.js                 — DONE
      codec.js                  — DONE
    services/
      StorageAdapter.js
      ActivityService.js
      RecordService.js
      PersonalService.js
      BlockRegistry.js
    screens/
      list.js
      wizard.js
      view.js
      share.js
      management.js
    panels/
      WorkpadsPanel.js
      PersonalPanel.js
  p/
    index.html                  Receiver page — DONE
```

---

## Build Order (next session)

1. Copy service files from workpadskaios (5 min — no changes needed)
2. Write `index.html` shell + CSS skeleton (three-column grid, topbar, panel structure)
3. Write `js/app.js` — router + panel collapse logic + boot
4. Port `list.js` — simplest screen, tests the wiring
5. Port `wizard.js` — longest screen, mouse-adapted form
6. Port `view.js`, `share.js`, `management.js`
7. Write `WorkpadsPanel.js` and `PersonalPanel.js` (sidebar versions)
8. Onboarding overlay
9. Mobile responsive pass
10. `/p` receiver — wire "Start yours" button to `workpads.me/?start=1`
