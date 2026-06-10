# Workpads.me — Deep Scan
_Generated 2026-05-11. Based on full source review of all JS, CSS, HTML, and service worker files._

---

## 1. Assets Inventory

### HTML entry points
| File | Purpose |
|------|---------|
| `index.html` | Main app shell — three-column layout, overlay templates, SW registration |
| `p/index.html` | Share-target receiver — decodes `1ag/`…`1dg/` payloads from URL hash, renders read-only workpad card |
| `p/customer.html` | Customer-facing share page (referenced in codec chain, not yet implemented) |

### Stylesheets
| File | Notes |
|------|-------|
| `css/app.css` | Single stylesheet for all screens, panels, themes, and responsive breakpoints |

### JavaScript — Services
| File | Role |
|------|------|
| `js/lib/fflate.js` | Deflate/inflate (zlib) for codec compression |
| `js/lib/codec.js` | pads-v1 encode/decode pipeline; current encoder `padsEncodeC` → scheme `1dg/` |
| `js/services/StorageAdapter.js` | `localStorage` CRUD with `wp_record_` prefix; lists, gets, saves, deletes |
| `js/services/ActivityService.js` | User identity — name, phone — stored as `wp_activity_<id>`; `getSenderIdentity()` autofills wizard |
| `js/services/RecordService.js` | Higher-level record ops; wire-field list for encoding; parent/child record linking |
| `js/services/PersonalService.js` | Quick notes — `wp_personal_` prefix; fields: text, tags (max 5), linkedRecordId, source, timestamp |
| `js/services/BlockRegistry.js` | Contact store — `wp_block_<normalised_name>`; auto-saved from records with both customer + phone |

### JavaScript — Screens
| File | Role |
|------|------|
| `js/screens/list.js` | Dashboard — revenue/expenses/received/margin summary block; contacts stub |
| `js/screens/wizard.js` | Create/edit full record with all fields; expense, COGS, and payment sub-record entry |
| `js/screens/view.js` | Read-only record detail — action list, financial card (expenses, COGS, payments) |
| `js/screens/share.js` | Encode + share — generates `1dg/` URL; share-as type, view options, includes toggles |
| `js/screens/management.js` | Settings — profile edit, default currency, payment methods; storage stats |
| `js/screens/archive.js` | Archive list — archived records with restore/delete; search |
| `js/screens/financial.js` | Per-record financial screen — Basic/Advanced; expense category breakdown; COGS split |
| `js/screens/finance-overview.js` | Cross-record overview — date filter, per-job table, totals; Advanced mode |

### JavaScript — Panels
| File | Role |
|------|------|
| `js/panels/WorkpadsPanel.js` | Left panel — record list with financial tally; four-tier COGS calculation; profit/margin metrics |
| `js/panels/PersonalPanel.js` | Right panel — quick notes list; add/view/delete notes |

### Images
| File | Used by |
|------|---------|
| `img/icon-192.svg` / `icon-512.svg` | PWA manifest, apple-touch-icon |
| `img/icon-192.png` / `icon-512.png` | PWA manifest (PNG fallback) |
| `img/at-workpads.png` | Onboarding overlay wordmark |
| `img/logo-w.png` | Mobile topbar home button |
| `img/classic-bg.svg` | "Classic American" theme background pattern |

### Other
| File | Notes |
|------|-------|
| `manifest.json` | PWA manifest — name, icons, `share_target` for receiving shared links |
| `sw.js` | Service worker — cache-first, `CACHE = 'workpads-v17'` |
| `CNAME` | GitHub Pages custom domain → `workpads.me` |

---

## 2. Architecture

### Storage namespaces (all `localStorage`)
| Key pattern | Owner | Content |
|-------------|-------|---------|
| `wp_record_<id>` | StorageAdapter | Any record object (main, expense, payment) |
| `wp_activity_<id>` | ActivityService | User identity (name, phone) |
| `wp_personal_<id>` | PersonalService | Quick note |
| `wp_block_<name>` | BlockRegistry | Contact (name + phone) |
| `wp_theme` | inline script | `'telegram'` (default) or `'classic'` |
| `wp_bg` | inline script | `'americana'` (default) or other |
| `wp_onboarded` | app.js | Set after onboarding; gate for boot |
| `wp_demos_v1` | app.js | Set after demo seed; prevents re-seed |
| `wp_currency` | management.js | Default currency (e.g. `'GBP'`) |
| `wp_payment_methods` | management.js | JSON array of payment method strings |
| `wp_fo_*` | finance-overview.js | Finance overview filter state |

### Record object model

**Main record** (job / quote / invoice):
```
id, record_type, job, customer, date, location,
start_time, end_time, meeting_time, customer_phone,
worker, participants[], actions[{title,notes}],
amount, currency, vat, charge_type, parts_flag,
worker_cost, details, story, chainRef,
draft, createdAt, updatedAt
```

**Expense sub-record** (customer-billed or COGS):
```
id, parentId, recordType:'expense',
job, amount, currency, date,
expense_billing: 'customer'|'cogs',
charge_type, actionIdx, action_quoted,
linkedExpenseId, createdAt, updatedAt
```

**Payment sub-record**:
```
id, parentId, recordType:'payment',
job, amount, currency, date,
createdAt, updatedAt
```

### Routing
`App._route()` in `app.js` drives all navigation. Routes are string-keyed (`'list'`, `'wizard'`, `'view'`, `'share'`, etc.). No URL router — navigation state is in-memory. The back button has no native integration (history API not used).

### Codec pipeline
```
Record object
  → RecordService.getSharePayload()         (wire fields only)
  → codec.padsEncodeC()
      → presence flags (16-bit)
      → action list (count + per-action strings)
      → binary date (uint16 days since 2020-01-01)
      → amounts as uint32 cents
      → fflate.deflateRaw()
      → base64url encode
      → prepend '1dg/'
  → URL: workpads.me/p#1dg/<payload>
```

Decoder (`padsDecodeAny`) supports all scheme tags: `1ag/`, `1bg/`, `1cg/`, `1dg/`.

---

## 3. Financial Data — Accumulation & Interlinking

### Record financial fields
- `amount` — total quoted/invoiced amount (customer-facing)
- `worker_cost` — labour cost (local only; never shared)
- `parts_flag` — boolean; indicates parts were used (affects UI context)
- `charge_type` — expense category code (local)

### Sub-record linkage
Sub-records link to parents via `parentId = <main record id>`. All sub-records are stored as independent `wp_record_` entries. To get all sub-records for a parent, the app lists all records and filters by `parentId`.

### Four-tier COGS priority (WorkpadsPanel.js)
For each expense with `expense_billing === 'cogs'`, the COGS cost is resolved in this priority order:

1. **linkedExpenseId** — cost is the matching customer-billed expense's amount (exact link)
2. **actionIdx** — cost is the sum of all customer-billed expenses on the same action index
3. **action_quoted** — cost is a manually recorded quoted amount for that action
4. **free-floating** — full COGS amount hits P&L directly

Self-funded COGS (COGS amount ≤ billed amount for the same action) is absorbed — it does not reduce profit. Only overruns beyond the billed amount appear as a P&L hit.

### Financial tally chain
```
Main record
  ├── Customer-billed expenses  (expense_billing: 'customer')
  │     → add to revenue side (already included in amount, displayed separately)
  ├── COGS expenses             (expense_billing: 'cogs')
  │     → four-tier resolution → P&L overrun or absorbed
  └── Payments                 (recordType: 'payment')
        → sum → compared to amount → outstanding balance

Derived metrics (WorkpadsPanel sidebar):
  Revenue      = record.amount
  COGS         = sum of resolved COGS costs (overrun portion only)
  Expenses     = sum of customer-billed expense amounts
  Received     = sum of payment amounts
  Gross Profit = Revenue - COGS
  Margin %     = Gross Profit / Revenue × 100
  COGS ratio   = COGS / Revenue × 100
```

### financial.js (per-record screen)
- **Basic mode**: total expenses, total payments, outstanding balance
- **Advanced mode**: expenses broken down by `charge_type` category; COGS split into self-funded vs overrun; per-action itemisation

### finance-overview.js (cross-record screen)
- Aggregates all main records (non-archived, non-draft) matching a date filter
- Date filter presets: this month / last month / 3 months / this year / last year
- Persists filter state in `wp_fo_*` localStorage keys
- **Advanced mode**: per-job table with individual revenue/expenses/received columns
- Currency hardcoded to `£` — does not respect per-record currency

### list.js dashboard block
- Shows Revenue / Expenses / Received / Gross margin for the current period
- Feeds from the same aggregation logic as finance-overview
- Currency hardcoded to `£`

---

## 4. Functionality Summary

| Feature | Status |
|---------|--------|
| Create/edit records (job, quote, invoice) | ✅ Full |
| Expense sub-records (customer-billed & COGS) | ✅ Full |
| Payment sub-records | ✅ Full |
| Share via encoded URL (pads-v1) | ✅ Full |
| Receive shared workpad (p/index.html) | ✅ Full |
| Archive / restore records | ✅ Full |
| Quick notes (Personal panel) | ✅ Full |
| Contact auto-save (BlockRegistry) | ✅ Full |
| Per-record financial screen | ✅ Full |
| Cross-record finance overview | ✅ Full |
| Dashboard financial summary | ✅ Full |
| Themes (Telegram / Classic American) | ✅ Full |
| PWA install + offline | ✅ Full |
| Demo record seeding (first run) | ✅ Added |
| Contacts screen (list.js stub) | ❌ Not built — "coming soon" buttons |
| Export (PDF, CSV) | ❌ Not built — placeholder |
| Customer-facing share page (p/customer.html) | ❌ Not built |
| Multi-currency finance aggregation | ❌ Not built — £ hardcoded |
| History API / back-button support | ❌ Not implemented |

---

## 5. Known Weaknesses & Bugs

### Critical / Data integrity

**camelCase vs snake_case sub-record filter**
- `view.js` filters `rec.recordType === 'expense'` (camelCase)
- Wire-received records decoded from a URL store `record_type` (snake_case)
- Imported sub-records are silently dropped from the financial card in view.js
- _Impact_: anyone who receives a shared workpad and then views its financial data sees nothing

**VAT encoding mismatch**
- Wizard stores `vat: 'standard'` locally; codec `VAT_RATES` expects numeric strings (`'20'`)
- On encode, `'standard'` falls through to the UTF-8 custom string path (vatIdx = 255)
- Not compact; receiver decodes it as a raw string, not a recognised rate
- _Impact_: cross-device VAT display will show raw `'standard'` instead of `'inc. 20% VAT'`

### UI / UX

**Stale codec labels**
- `share.js` UI shows `1cg` as the scheme label; actual encoder produces `1dg/`
- `management.js` About section shows `1ag` — two generations behind
- _Impact_: confusing for technical users; no functional impact

**Hardcoded £ in multi-record views**
- `finance-overview.js` and `list.js` use literal `£` symbol regardless of record currency
- _Impact_: incorrect for USD/EUR/CAD etc. records

**Dead HTML in index.html**
- `#topbar` element present but has `display:none` and is never used; the real topbar is `#main-topbar`

**Dead CSS in app.css**
- `.wizard-steps` / `.wizard-step` rules exist; wizard uses `.wiz-dots` / `.wiz-dot` instead
- Selector bloat only; no functional impact

**No OG / Twitter meta tags on index.html**
- Shared links to `workpads.me` show no preview card in messaging apps
- _Impact_: poor social sharing impression for the marketing entry point

**No history API**
- Navigating within the app does not update the URL or push history entries
- Browser back button exits the app rather than going to the previous screen

### Performance / Reliability

**Manual service worker asset list**
- `sw.js` ASSETS array must be hand-maintained on every deploy
- A forgotten file means offline mode silently breaks for that asset
- Cache version must be manually bumped; no build-time automation

**No storage quota guard**
- `localStorage` is capped (~5 MB per origin in most browsers)
- No warning is shown when approaching the limit; writes silently fail
- `management.js` does show a rough usage estimate but no alert threshold

**Single localStorage scope**
- All data for all "workspaces" shares one origin's localStorage
- No data migration strategy for schema changes; old records simply lack new fields

### Missing features with functional stubs
- Contacts screen buttons → `alert('coming soon')`
- Export buttons → `alert('coming soon')`
- `p/customer.html` is in the ASSETS list and referenced in codec spec but the file doesn't exist (would 404 in offline mode)

---

## 6. Theme System

Two themes controlled by `data-theme` and `data-bg` attributes on `<html>`:

| Theme | Key colour | Fonts | Background |
|-------|-----------|-------|-----------|
| Telegram (default) | `#c0470a` rust | Fraunces, JetBrains Mono | plain |
| Classic American | `#1B3A6B` federal blue | Playfair Display, Lora, IBM Plex Mono | `classic-bg.svg` texture |

Theme is set in an inline `<script>` at head parse time to avoid flash-of-wrong-theme.

---

## 7. PWA / Offline

- Service worker: cache-first, installs all ASSETS on first visit
- Navigation fallback: any unknown same-origin navigate → serves cached `index.html`
- `/p/` paths are excluded from the fallback (they have their own HTML)
- `skipWaiting()` + `clients.claim()` ensure immediate activation on update
- `manifest.json` declares `share_target` so the app appears in the system share sheet; shared URLs are received as a GET to `/?share-url=…` which the app router handles

---

## 8. Cross-Repo Dependencies

This repo (`workpadsdotme`) is the deployed PWA shell. The codec (`codec.js`) is shared with the companion repo that handles the customer-facing receiver and any future server components. Changes to the pads-v1 encoding format, presence-flag bit positions, or field enum lists (RECORD_TYPES, CURRENCIES, VAT_RATES) must be coordinated across both repos.

Wire fields (encoded on share): `job, customer, date, location, meeting_time, start_time, end_time, customer_phone, worker, actions[], details, story, amount, currency, vat, record_type`

Local-only fields (never encoded): `worker_cost, charge_type, expense_billing, parts_flag, participants[], parentId, recordType`
