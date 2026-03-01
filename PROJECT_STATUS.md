# Industrial ERP Platform — Project Status

> **Last Updated:** 2026-03-01  
> **Current Phase:** Phase 14 Complete ✅  
> **Deployment:** Live at [industrial-erp-platform.vercel.app](https://industrial-erp-platform.vercel.app)

---

## 🏗️ What This App Is

A **local-first, offline-capable Progressive Web App (PWA)** for small-to-medium African businesses. It covers:
- Point-of-Sale (Sales terminal)
- Financial ledger (PocketBooks)
- Inventory management (PoolStock)
- Manufacturing scheduling (SmartShift)
- Group savings/syndicates (TrustCircle)
- Digital wallet (PocketWallet)
- Business reports & analytics
- Customer management
- AI-driven insights

**Target users:** Shop owners, traders, warehouse managers, manufacturers in Southern Africa.

---

## ⚙️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla JavaScript (ES Modules), HTML, CSS |
| Database (local) | IndexedDB via custom `db/index.js` wrapper |
| Database (cloud) | Supabase (PostgreSQL, free tier) |
| Auth | Supabase Auth |
| Real-time sync | Supabase Realtime (WebSockets) |
| Offline | Service Worker via `vite-plugin-pwa` |
| Build tool | Vite 5 |
| Hosting | Vercel (free tier) |
| AI / ML | Custom `src/ai/engine.js` (no external API — runs in browser) |

---

## 🔑 Credentials & Config

| Key | Value |
|-----|-------|
| Supabase URL | `https://paismvtdpkoihqpyacsd.supabase.co` |
| Supabase Anon Key | In `.env` file as `VITE_SUPABASE_ANON_KEY` |
| Vercel Project | Connected to GitHub repo `Refiloe96-hub/industrial-erp-platform` |
| GitHub Repo | `https://github.com/Refiloe96-hub/industrial-erp-platform.git` |

> ⚠️ `.env` is in `.gitignore` — never committed. Supabase keys are set as Vercel environment variables.

---

## 📁 Key File Map

```
src/
├── main.js              # App entry point, shell, routing, auth, all CSS
├── mobile.css           # Global mobile responsive rules (all pages)
├── ai/engine.js         # ML engine: demand forecasting (Linear Regression), dynamic pricing
├── db/index.js          # IndexedDB wrapper (local storage)
├── sync/syncManager.js  # Cloud↔Local sync with CRDT offline conflict resolution
├── services/
│   ├── supabase.js      # Supabase client init
│   └── payments.js      # Simulated payment gateway (Yoco/M-Pesa style)
├── modules/
│   ├── PocketBooks.js   # Financial ledger logic
│   ├── PoolStock.js     # Inventory logic
│   ├── Sales.js         # POS sales recording
│   ├── PocketWallet.js  # Digital wallet
│   ├── SmartShift.js    # Manufacturing scheduler
│   ├── TrustCircle.js   # Group savings/syndicates
│   └── Customers.js     # Customer management
└── ui/
    ├── pocketBooksUI.js
    ├── poolStockUI.js
    ├── salesUI.js        # POS terminal + barcode scanner + invoice modal
    ├── pocketWalletUI.js
    ├── smartShiftUI.js
    ├── trustCircleUI.js
    ├── reportsUI.js
    ├── customersUI.js
    ├── settingsUI.js
    └── pricingUI.js

supabase/
├── migrations/001_initial.sql      # Base schema + RLS policies
└── migrations/002_multi_tenant.sql # Multi-tenant business_id support

tests/manual.test.js  # Vanilla JS test suite (VAT, CRDT merge, pricing math)
```

---

## ✅ Completed Phases

### Phase 1–11: Core ERP (Local-First)
- All modules built and working offline via IndexedDB
- Barcode scanning (BarcodeDetector API)
- Invoice generation & printing
- Seed data for demos
- Dark/light theme toggle
- PWA manifest

### Phase 12: Cloud Launch
- ✅ Supabase integration (auth + database)
- ✅ Multi-tenant schema (`002_multi_tenant.sql` — must be run in Supabase SQL editor)
- ✅ Real-time sync via Supabase Realtime channels
- ✅ CRDT-like offline merge (conflicts resolved intelligently when reconnecting)
- ✅ Vercel deployment with CI from GitHub
- ✅ PWA service worker via `vite-plugin-pwa`

### Phase 13: Intelligence & Integrations
- ✅ ML demand forecasting — Linear Least Squares Regression in `AIEngine.forecastDemand()`
- ✅ Dynamic pricing heuristics — scarcity/velocity-based in `AIEngine.suggestDynamicPrice()`
- ✅ Payment gateway simulation — `src/services/payments.js` (Yoco/M-Pesa style delays)
- ✅ Automated tests — `tests/manual.test.js` (Node, no framework needed)
- ✅ Mobile UX overhaul — `src/mobile.css` global responsive stylesheet
- ✅ Bottom nav made persistent across all pages (moved to app shell in `main.js`)
- ✅ Sidebar footer (Upgrade Plan, Seed Data) pinned via flex
- ✅ Memory leak fix — DOM teardown on every navigation prevents event listener buildup

### Phase 14: Mobile Responsiveness Deep Fix (2026-03-01)
- ✅ **Root cause fixed** — duplicate `.main-content` CSS rule overrode `margin-left: 0` on mobile, pushing all content 260px off the left edge on every page except TrustCircle/SmartShift
- ✅ **Sidebar gap eliminated** — sidebar now uses `position: fixed !important` on mobile; takes zero layout space when hidden, content fills full screen width
- ✅ **Sidebar footer always visible** — `.nav-menu` scrolls internally (`flex: 1; overflow-y: auto`), `.sidebar-footer` pinned at bottom (`flex-shrink: 0`); no scrolling needed to reach Upgrade Plan / Seed Data
- ✅ **Dashboard grid fixed** — stat cards in `.dashboard-stats-row` (2-col subgrid), AI Supervisor & chart cards full-width; `minmax(280px)` → `minmax(min(100%, 280px))` prevents overflow
- ✅ **SmartShift tabs** — `.module-nav` / `.btn-tab` now wrap with `flex-wrap: wrap` on mobile
- ✅ **TrustCircle header** — stacks `h1 + p + button` vertically on mobile
- ✅ **Reports page fixed** — all four grids (`reports-grid`, `advanced-stats-grid`, `report-stats`, `inventory-summary`) collapse to single column; date filter buttons share equal width
- ✅ **Verified via browser screenshots** — test account created, all pages navigated, correct rendering confirmed at 390px mobile viewport

---

## 🗃️ Database Setup (Supabase)

Both files must be run **in order** in the Supabase SQL Editor:
1. `supabase/migrations/001_initial.sql`
2. `supabase/migrations/002_multi_tenant.sql`

Row Level Security is enabled. Users only see data belonging to their `business_id`.

---

## 🚀 Deployment Workflow

```bash
# Local dev
npm run dev           # http://localhost:5173

# Test suite (no install needed)
node tests/manual.test.js

# Deploy to production
npm run build
git add .
git commit -m "Your message"
git push              # Vercel auto-deploys from GitHub main branch
```

After pushing, Vercel rebuilds automatically. No manual deploy steps needed.

---

## 🔒 Security Notes

- New user signups can be **disabled** in Supabase → Authentication → Providers → Email → "Allow new users to sign up" = OFF
- This makes the app **invite-only** (admin manually creates users from Supabase dashboard)
- All data access is protected by Supabase RLS policies

---

## 🐛 Known Limitations / Next Steps

- [ ] Dashboard ML insights panel — show forecasting results on the dashboard (not just in AI engine)
- [ ] Push notifications for low stock alerts (needs VAPID keys + service worker push handler)
- [ ] Real payment gateway (Yoco or Paystack live API keys — currently simulated)
- [ ] Role-based access control (admin vs. cashier permissions)
- [ ] Disk space on dev machine is full — `npm install` of new packages fails (clear npm cache first)
- [ ] The `src/main.js` is ~2500 lines and could benefit from splitting into component files

---

## 📱 Mobile UX Status

The app is fully usable on mobile. Key behaviours:
- **Mobile header bar** — fixed at top with hamburger ☰, business name, theme toggle, and notification bell
- **Bottom nav bar** — persists on all pages (Dashboard, Sales, PocketBooks, PoolStock, TrustCircle); 5 icons always visible
- **Sidebar** — `position: fixed` overlay, slides in from left via hamburger. Takes zero space when hidden, so no blank left gap on any page
- **Sidebar footer** — Upgrade Plan, Seed Data, and Logout buttons are always visible at the bottom of the sidebar without scrolling
- **Tables** — scroll horizontally when they have too many columns (`.table-container { overflow-x: auto }`)
- **Forms** — collapse to single-column layout
- **Modals** — expand to ~95% screen width
- **All grids** — use `minmax(min(100%, X), 1fr)` so no card ever overflows the screen edge
- **Reports page** — all four grid sections (Supply Chain KPIs, ABC Analysis, Financial stats, Income/Expense cards) stack single-column on mobile
- **Dashboard** — AI Supervisor and chart cards go full width; stat cards sit in a 2-col subgrid row

---

*This file is maintained by the development assistant. Update it at the end of each session.*
