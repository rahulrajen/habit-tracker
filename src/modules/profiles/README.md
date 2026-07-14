# Profiles Module

## What it does
- CRUD operations for the core-owned `profiles` table (via Drizzle)
- Create, switch, archive (soft-delete via `archived_at`) profiles
- Enforce 8-profile soft ceiling (counts only non-archived rows)
- Edit per-profile `target_points`

## What it reads/writes from `/core`
- **Reads:** `core/schema.ts` — `profiles` table schema (for queries)
- **Writes:** `core/schema.ts` — `profiles` table ONLY (no other module writes to profiles)
- **Imports types from:** `core/contracts.ts` — `ProfileId`, `ProfileSummary`, `CreateProfileInput`, `UpdateTargetInput`

## Its own tables
None. The `profiles` table is core-owned; this module owns the business logic and API routes for it.

## File structure
```
src/modules/profiles/
├── actions.ts          # All server-side CRUD + validation (imported by API routes)
├── index.ts            # Barrel export — the ONLY file other code may import from
├── types.ts            # Zod schemas and client-facing type aliases
├── tests/
│   └── actions.test.ts # Unit tests (16 passing, runs against test DB)
└── README.md           # This file
```

## API routes that consume this module
| Method | Route | Handler | Source |
|--------|-------|---------|--------|
| GET | `/api/profiles` | List all non-archived profiles | `src/app/api/profiles/route.ts` |
| POST | `/api/profiles` | Create a new profile (enforces ceiling) | `src/app/api/profiles/route.ts` |
| GET | `/api/profiles/[id]` | Get single profile by ID | `src/app/api/profiles/[id]/route.ts` |
| PATCH | `/api/profiles/[id]` | Update target points | `src/app/api/profiles/[id]/route.ts` |
| DELETE | `/api/profiles/[id]` | Archive a profile (soft-delete) | `src/app/api/profiles/[id]/route.ts` |

## Frontend UI that consumes this module
| Route | Component | Source |
|-------|-----------|--------|
| `/profiles/[id]` | Profile switcher with create/archive/target-edit forms | `src/app/profiles/[id]/page.tsx` |

## If something breaks here, check this first
1. **Database connection:** Is `DATABASE_URL` set correctly? Run `npm run db:push` to ensure schema matches.
2. **Soft ceiling not enforced:** Check that `actions.ts` counts only `WHERE archived_at IS NULL`.
3. **Archive not working:** Verify `archived_at` is being set to `NOW()`, not a row DELETE.
4. **ESLint boundary error:** This module must NOT import from `@modules/habits/*`. If it does, fix the import — use core contracts instead.

## Known limitations (documented per spec)
| Limitation | Impact | Mitigation |
|------------|--------|------------|
| **Ceiling race condition** | In the extremely unlikely event two users create a profile simultaneously at count=7, both could succeed yielding 9 profiles. READ COMMITTED isolation + two-query pattern (COUNT then INSERT). | Deliberate tradeoff: probability and consequence (one extra profile) don't justify advisory lock plumbing. See `actions.ts` for full docstring. |
| **No rate limiter** | Rapid writes to `/api/profiles` are unbounded. | Soft ceiling protects against slow unbounded growth; burst risk accepted per spec Section 4. |
| **Archive last profile blocked** | Cannot archive the final non-archived profile (data integrity). | Error returned to client with clear message. User must keep at least one profile active. |

## Running tests
```bash
# Requires: Docker Postgres running, test DB schema applied
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/habit_tracker_test" \
  npx vitest run src/modules/profiles/tests/actions.test.ts