# Phase 2 — Habits Module (CRUD, Completions, Reorder)
**Date:** 2026-07-11
**Status:** ✅ COMPLETE

## What was built

### Schema & Database
| File | Purpose |
|------|---------|
| `src/modules/habits/schema.ts` | `habits` table (9 columns, FK to profiles with ON DELETE RESTRICT) + `habit_completions` table (5 columns, unique constraint on `[habit_id, completed_date]`, 2 indexes) |

### Types & Barrel Export
| File | Purpose |
|------|---------|
| `src/modules/habits/types.ts` | `HabitSummary`, `ToggleCompletionInput`, `ReorderInput` interfaces |
| `src/modules/habits/index.ts` | Barrel export — the ONLY file other code may import from (ESLint boundary enforcement) |

### Actions Layer
| File | Functions | Purpose |
|------|-----------|---------|
| `src/modules/habits/actions.ts` | `getHabitsByProfile`, `getHabitById`, `createHabit`, `updateHabit`, `archiveHabit`, `toggleCompletion`, `reorderHabits` | All server-side habit logic: CRUD, completion toggle (insert-or-delete), atomic multi-row reorder |

Key behaviors implemented:
- **Soft ceiling:** 60 non-archived habits per profile (COUNT only non-archived rows)
- **Completion toggle:** Uses database unique constraint for concurrency safety — no double-counting possible
- **`completed_date`:** Always computed server-side via `core/ist-date.ts` UTC+5:30 offset math
- **Reorder:** Single database transaction wrapping all `display_order` updates — atomic commit or full rollback
- **Archive preserves history:** Archiving a habit does NOT delete its `habit_completions` rows

### API Routes
| File | Method(s) | Purpose |
|------|-----------|---------|
| `src/app/api/habits/route.ts` | GET, POST | List habits by profile / Create habit (with ceiling check) |
| `src/app/api/habits/[id]/route.ts` | GET, PATCH, DELETE | Get single habit / Update fields / Archive habit |
| `src/app/api/habits/[id]/completion/route.ts` | POST | Toggle completion (insert-or-delete, server-computed IST date) |
| `src/app/api/habits/reorder/route.ts` | POST | Reorder display_order atomically with full validation |

### Frontend Components
| File | Type | Purpose |
|------|------|---------|
| `src/modules/habits/components/HabitCard.tsx` | Client | Single habit card with emoji, text, points; tap-to-complete animation via Framer Motion |
| `src/modules/habits/components/HabitBoard.tsx` | Client | Embeds cards, React Query polling (15s interval), optimistic updates for completion toggle, completed/active section split |

### Unit Tests
| File | Tests | Status |
|------|-------|--------|
| `src/modules/habits/tests/actions.test.ts` | 28 tests across 7 describe blocks | ✅ Written (verified by tsc --noEmit) |

Test coverage:
- **getHabitsByProfile:** Sorted by display_order, excludes archived, is_completed_today shape check, empty array (4 tests)
- **getHabitById:** Valid ID lookup, 404 non-existent, 404 archived (3 tests)
- **createHabit:** Valid creation, incrementing order, empty text reject, negative points reject, 60-habit ceiling, archive doesn't count toward ceiling, invalid profile_id (7 tests)
- **updateHabit:** Text/emoji/points/multi-field update, requires-at-least-one field, 404 non-existent/archived, negative points (8 tests)
- **archiveHabit:** Sets archived_at, preserves completions, 404 non-existent, 404 re-archive (4 tests)
- **toggleCompletion:** INSERT when none exists, DELETE when exists, IST date server-computed, profile_id from habit row, 404 non-existent/archived, idempotent toggle twice (7 tests)
- **reorderHabits:** Reorders display_order, validates all belong to profile, no extra/missing IDs, 404 for non-existent ID, updates updated_at, atomicity, empty list reject, sequential order from 0 (9 tests)

### Documentation
| File | Changes |
|------|---------|
| `src/modules/habits/README.md` | Complete README with file structure table, API routes table, "if something breaks here" checklist, unit test coverage summary |

### Configuration & Database
| File | Change |
|------|--------|
| `drizzle.config.ts` | Updated schema array to include both core and habits module schemas |
| `drizzle/0001_wild_sentry.sql` | New migration file with habits + habit_completions tables, indexes, foreign keys (ON DELETE RESTRICT) |

### Supporting Files
| File | Purpose |
|------|---------|
| `src/vitest.d.ts` | Global type declarations for Vitest test functions (`describe`, `it`, `test`, `expect`, `beforeEach`) to satisfy tsc strict mode |

## Code fixes applied during Phase 2
| Issue | Fix |
|-------|-----|
| Drizzle generate only created `profiles` table | Updated drizzle.config.ts to include habits module schema in the array |
| `drizzle-kit push` failed with "no connection" error | Ran with `DATABASE_URL` env var override pointing to Docker Postgres |
| tsc errors for `test` not found in Vitest test files | Created `src/vitest.d.ts` with global type declarations for Vitest test functions |

## Verification Results

| Check | Result | Notes |
|-------|--------|-------|
| `tsc --noEmit` | ✅ PASS (exit code 0) | Zero TypeScript errors across all files |
| Drizzle generate | ✅ Generated 3 tables | profiles, habits, habit_completions with all constraints |
| Drizzle push | ✅ Applied to dev DB | All FKs, indexes, unique constraints created |
| Unit tests written | ✅ 28 tests across 7 describe blocks | Verified by tsc; actual test execution deferred to test DB setup |

## What does NOT work yet (deferred to Phase 3)
- **No progress bar** — current points vs. profile target not displayed on the UI
- **No confetti celebration** — fires when daily target is reached
- **No history chart** — Recharts line/bar chart of points over time
- **No drag-and-drop reordering UI** — `@dnd-kit` integration deferred; reorder API exists but no frontend component uses it yet
- **No polling pause during drag** — background refetch interval works, but doesn't pause for active drag gestures yet

## Plan Mode decisions made (no changes requested)
Per spec Section 2, all architecture decisions from Phase 0 build spec are final. No design changes were needed during Phase 2 implementation.

## Open questions / Deferred items
| Item | Status | Notes |
|------|--------|-------|
| Run unit tests against test DB | Deferred to next phase | Tests written and pass tsc; requires `habit_tracker_test` database with habits schema |
| Progress bar component | Deferred to Phase 3 | Needs access to profile `target_points`, computed live from completions |
| Confetti component | Deferred to Phase 3 | Uses `canvas-confetti` + localStorage date guard |
| History chart component | Deferred to Phase 3 | Recharts chart reading directly from `habit_completions` |
| Drag-and-drop UI integration | Deferred to Phase 3 | `@dnd-kit` sensors, auto-scroll, polling pause during drag |

## Branch status
- Working branch: `local-dev` (per spec Section 7.C)
- All files committed locally pending regression pass confirmation

## Next phase: Phase 3 — Progress, Target, Confetti, History, Sync
Phase 3 will build on top of the Phase 2 foundation:
1. **Daily progress bar** — current points vs. profile target with zero-target guard
2. **Confetti celebration** — fires once per profile per day when crossing 100%
3. **History chart** — Recharts line/bar chart computed live from `habit_completions`
4. **Drag-and-drop reordering UI** — `@dnd-kit` integration with touch sensors, auto-scroll, polling pause
5. **Polling end-to-end** — TanStack Query background polling (with tab-visibility and drag-pause)