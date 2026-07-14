# Pre Go-Live Fixes — Profile 404 Bug (Phase 5 Hotfix)

**Date:** 2026-07-14  
**Severity:** Production-blocking  
**Root Cause:** Missing `app/profiles/page.tsx` route + missing redirect after profile creation

---

## Problem

The `/profiles` endpoint returned a 404 error in production when unseeded users clicked "Create Profile" from the root page. This was a genuine Next.js route-not-found error, not a caching or network issue.

### Root Cause Analysis

1. **Missing Route:** `src/app/profiles/` only contained `[id]/` subdirectory (dynamic route). No `page.tsx` existed for the bare `/profiles` path.
2. **Seed Script Blind Spot:** The local seed script (`src/scripts/seed.ts`) always created 3 sample profiles on first run, so every test and manual check ran against a populated database. The zero-profiles empty state was never exercised.
3. **Production Unseeded by Design:** Per Section 11 of the build spec ("don't seed production"), the live Neon database was correctly empty — making this a prod-only gap that local testing could not surface.
4. **Missing Redirect:** `ProfileSwitcher.tsx`'s `createMutation.onSuccess` did NOT redirect to the newly created profile page after creation, compounding the issue.

---

## Fixes Applied

### Fix A: Created `src/app/profiles/page.tsx` (NEW FILE)

The dedicated empty-state landing page for `/profiles`. Behavior:
- Fetches profiles from `/api/profiles` GET endpoint
- If profiles exist → redirects to first profile (`/profiles/[id]`)
- If no profiles exist → renders a "Create Your First Profile" form with emoji, name, and daily target inputs
- On successful creation → stores active profile in localStorage AND redirects to `/profiles/[newProfileId]`

### Fix B: Updated `src/modules/profiles/components/ProfileSwitcher.tsx` (line 70)

Added `router.replace(\`/profiles/${newProfile.id}\`)` to the `createMutation.onSuccess` callback, plus localStorage persistence. This ensures that even if a user reaches the inline create form from within an existing profile page, they land on their newly created profile afterward.

### Fix C: Updated `src/app/page.tsx` (root redirect)

Changed the zero-profiles fallback from rendering a link to `/profiles` (which was a dead route) to directly rendering `<ProfilesPage />` inline. This keeps the root page as the entry point for truly new users without an extra navigation hop.

---

## Verification

| Check | Result |
|-------|--------|
| `npm run build` — compile + type check | ✅ Passed, `/profiles` now listed in route output |
| Route table confirms `/profiles` exists | ✅ `○ /profiles 1.52 kB 99.3 kB` (static) |
| `npm test` — all unit tests | ✅ 58/58 passed (habits: 42, profiles: 16) |
| No lint errors | ✅ Clean |

---

## Why This Was Missed

The seed script created a **testing blind spot**. Local dev always had sample data present, so the empty-state code path was effectively dead code — never reached by humans or AI agents during development. The Phase 4/5 audits verified happy paths (create habits, mark completions, view charts) against seeded profiles only.

**Lesson:** Production database configurations that differ from local dev (unseeded vs seeded) should be explicitly tested as part of any pre-go-live checklist.

---

## Files Modified

| File | Action |
|------|--------|
| `src/app/profiles/page.tsx` | **CREATED** — Empty-state landing page with profile creation form |
| `src/modules/profiles/components/ProfileSwitcher.tsx` | Modified line 70 — Added redirect after profile creation |
| `src/app/page.tsx` | Modified — Inline render of ProfilesPage instead of dead link to `/profiles` |