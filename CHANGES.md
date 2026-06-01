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
