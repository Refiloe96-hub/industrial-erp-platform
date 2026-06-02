# Industrial ERP Platform — Project Status

**Last updated:** 2026-06-02  
**Status:** Beta — feature-complete, pre-launch  
**Live URL:** https://industrial-erp-platform.vercel.app  
**Repo:** https://github.com/Refiloe96-hub/industrial-erp-platform

---

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla JS ES Modules, Vite 5 |
| Storage | IndexedDB (offline-first, local) |
| Cloud sync | Supabase (PostgreSQL + Auth) |
| Hosting | Vercel (auto-deploy from GitHub main) |
| PWA | VitePWA + Workbox |

---

## Modules
| Module | Status | Notes |
|--------|--------|-------|
| Sales / POS | Complete | Keyboard shortcuts, barcode, loyalty redemption, credit sales, staff PIN |
| PocketBooks | Complete | Ledger, P&L, cash flow, VAT report, CSV export |
| PoolStock | Complete | Inventory, purchase orders, stock take, supplier management, reorder shortcut |
| SmartShift | Complete | Production scheduling, machines, workers, shifts |
| TrustCircle | Complete | Syndicates, group buys, funding requests, trust scores |
| PocketWallet | Complete | B2B payments, deposits, withdrawals |
| Reports | Complete | Financial, ABC analysis, supply chain, traceability |
| Customers | Complete | CRM, loyalty, credit, debt aging, purchase history |
| Settings | Complete | Business profile, team/PIN, AI, notifications, data backup |

---

## Architecture — current file sizes
| File | Lines | Responsibility |
|------|-------|---------------|
| `src/main.js` | ~858 | App class, routing, module mounting |
| `src/config/modules.js` | ~35 | Module metadata (nav icons, labels, access) |
| `src/ui/appStyles.js` | ~1518 | All app shell CSS |
| `src/ui/authPage.js` | ~248 | Login + passkey HTML |
| `src/ui/authHandlers.js` | ~367 | Auth event handlers, PBKDF2, Supabase |
| `src/ui/dashboardPage.js` | ~226 | Dashboard HTML |
| `src/ui/dashboardData.js` | ~330 | Stats + charts + AI advisor |
| `src/ui/dashboardHandlers.js` | ~200 | Sidebar, nav, install prompt |
| `src/ui/notificationPanel.js` | ~103 | Bell panel |
| `src/services/globalSearch.js` | ~170 | Ctrl+K search |
| `src/services/dailySummary.js` | ~80 | End-of-day push notification |

---

## Phase 15 — completed June 2026
- Complete design system: single accent (#2563eb), no glassmorphism, dark/light mode
- Claude-style sidebar user profile with dropdown (Settings / Upgrade / Log out)
- Settings page redesigned (Claude.ai style — narrow nav, uppercase labels)
- Global Ctrl+K search + mobile bottom-sheet search
- Till reconciliation (end-of-day cash count with denomination breakdown)
- Daily push notification via Web Notifications API
- Customer loyalty redemption at POS (10pts = R1)
- Supplier management with CRUD + dropdown in item form
- CSV export — transactions (PocketBooks) and inventory (PoolStock)
- Customer credit/debt tracking with aging report (days outstanding)
- Low-stock one-click reorder shortcut → pre-filled PO
- Receipt customisation (logo, VAT number, tagline, address, phone, email)
- Sync status indicator in sidebar (Synced / Syncing / Queued / Offline)
- Per-module error boundaries with retry button
- Staff PIN login for shared POS terminals
- Customer purchase history side panel
- Stock take — physical count vs system with live variance
- Currency consistency — `sym()` helper replaces hardcoded R
- POS product search by name or SKU
- Empty dashboard onboarding guide for first-time users
- main.js split: 3906 → 858 lines (78% reduction, 11 new files)
- Circular import resolved via `src/config/modules.js`
- In-app pricing aligned: Free / R149/mo / R349/mo (SME market)
- Landing page: honest stats, beta testimonials labelled, Shoprite trademark removed

---

## Supabase (cloud sync)
- Project ref: `paismvtdpkoihqpyacsd`
- **Pauses on free tier** — restored 2026-06-01, will pause again ~2026-07-01
- App works fully offline without Supabase
- To keep always-on: upgrade to Supabase Pro (~$25/mo)

---

## Pre-launch checklist
- [ ] Replace 3 beta testimonials with real quotes
- [ ] Record a real demo video (replace `/public/demo.mp4`)
- [ ] Set up professional domain — update `CONTACT_EMAIL` in `src/ui/landingUI.js`
- [ ] Decide on Supabase plan before July 1
- [ ] Load seed data and do a full walkthrough before first external demo
