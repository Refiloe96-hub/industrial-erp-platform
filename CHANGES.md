# Change Log

## Fix: Supabase Auth DNS Error on Login/Signup
**Date:** 2026-06-01  

---

### Problem

Users visiting the live Vercel deployment saw a browser-level DNS error when clicking any login or sign-up button:

```
This site can't be reached
paismvtdpkoihqpyacsd.supabase.co — DNS_PROBE_FINISHED_NXDOMAIN
```

**Root cause:** The Supabase free-tier project (`paismvtdpkoihqpyacsd`) was paused due to inactivity. Supabase pauses free projects after 7 days of inactivity and permanently deletes them after 90 days of being paused. The Vercel environment variable `VITE_SUPABASE_URL` pointed at the paused project's URL.

When a user clicked **Google** or **Apple** login, the Supabase JS client performed a full **browser redirect** to `https://paismvtdpkoihqpyacsd.supabase.co/auth/v1/authorize?...` — the browser navigated to that unreachable host, causing the hard DNS failure page instead of any error message from the app.

---

### Code Fix (applied 2026-06-01)

**Files changed:**

#### `src/services/supabase.js`
- Added `checkSupabaseReachable()` — pings `{VITE_SUPABASE_URL}/auth/v1/health` with a 6-second timeout before any auth operation. Returns `false` if the project is unreachable.

#### `src/main.js`
- Imported `checkSupabaseReachable`
- Added pre-flight check to: Google OAuth, Apple OAuth, Phone OTP, email identity lookup (Step 1), email/password login submit (Step 2)
- All checks show a clear in-app message instead of letting the browser redirect to a dead URL

---

### Supabase Free-Tier Status

- Project was **paused** — restored on **2026-06-01**
- **Will pause again on 2026-07-01** unless the plan is upgraded
- Currently on the **free tier**

**Options before 2026-07-01:**

| Option | Cost | Effect |
|--------|------|--------|
| Do nothing | Free | Project pauses again. Auth breaks for cloud users. Local-only signup/login still works. Users now see a clear in-app error instead of a DNS crash. |
| Export data | Free | Supabase → Settings → Database → Backups, or SQL Editor to dump tables. Recommended regardless. |
| Upgrade to Supabase Pro | ~$25/mo | Project stays always-on. Only needed if real users rely on cloud auth. |

**To export data manually (before July 1):**
1. Go to your Supabase project → SQL Editor
2. Run: `SELECT * FROM profiles;` → export as CSV
3. Repeat for other tables as needed
4. Or: Settings → Database → Backups for a full dump

---

### Notes

- The app fully supports **local-only / offline mode** — new users can sign up and use all features stored on-device without cloud. Cloud sync is optional.
- If the project is deleted and cannot be restored, existing cloud users will need to re-register.

---

## Phase 15: Security, Robustness & Professional Redesign
**Date:** 2026-06-02  
**Branch:** `deploy`

### Security Fixes
- **Password hashing**: Upgraded from raw SHA-256 to PBKDF2 (100k iterations, 16-byte salt). Legacy hashes auto-migrate on next login.
- **XSS prevention**: All user-controlled data escaped via `esc()` utility before innerHTML insertion.
- **JSON.parse safety**: New `safeParseJSON`/`getSession` utilities wrap all localStorage reads; WebRTC message parsing wrapped in try-catch.
- **Null guards**: `contentArea.parentNode` checked before replaceChild; `payload.new` null-checked in sync manager.
- **Input validation**: PoolStock rejects negative/NaN values before writing to IndexedDB.
- **Supabase connectivity**: Pre-flight health check before OAuth redirects prevents DNS crash page.

### Design System Overhaul
- **Single accent colour**: Removed competing orange (`#fb923c`) and indigo (`#6366f1`) accents — app-wide `#2563eb` blue.
- **Glassmorphism removed**: All `backdrop-filter: blur()` and `rgba(255,255,255,0.03)` glass backgrounds removed from every module.
- **Card system**: `padding: 0` on `.card`, padding provided by `.card-header`/`.card-body`/`.stat-card` per design system.
- **No hover lift**: All `transform: translateY()` on cards removed app-wide.
- **Dark-mode badge colours**: Light-mode `#d1fae5`/`#fee2e2` backgrounds replaced with `rgba(16,185,129,0.12)`/`rgba(239,68,68,0.12)`.
- **CSS tokens unified**: `--border-color` normalised to `--border` across all module files.
- **Missing variables defined**: `--radius-sm/md/lg`, `--shadow-sm/lg`, `--accent`, `--text-muted` all added to `:root`.

### Auth Screen
- Removed animated gradient background and glassmorphism.
- Removed AI-placeholder copy ("You'll get smarter operations...") — replaced with product-appropriate text.
- Standard 8px-radius inputs and buttons replacing 9999px pills.

### Module-by-Module Fixes
Each module had its own glassmorphism, undefined CSS classes, and light-mode colours removed. The Sales POS gained full desktop CSS (product grid had no styles at all). SmartShift had a complete CSS parser error (property names with spaces) fixed. Settings pane gained missing utility classes.

### Navigation & Shell
- Sidebar footer: three separate buttons → Claude-style user profile with click-to-open dropdown (Settings, Upgrade, Log out).
- Settings page: 320px nav → 200px; form labels → small uppercase muted; section headers smaller.
- Dashboard: stats now 4-column row on desktop; "Business Insights" moved below charts.
- Charts rewritten: responsive SVG, dark-mode text colours, single-colour bars.
- Removed dead "AI Insights" magic wand button from content header.
- Seed Data moved from broken DOM injection to Settings → Data & Storage.

### Global Utility Classes
Added globally to main.js: `text-muted`, `text-danger`, `text-success`, `text-center`, `btn-text`, `mt-1`–`mt-4`, `mb-1`–`mb-4`, `w-100`, `col-span-full`.

### Mobile
- Bottom nav CSS bug fixed (duplicate active rule with misplaced `}`).
- `padding-top` corrected to match actual 52px mobile header.
- Stat card flex override on mobile removed.
