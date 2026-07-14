# Habits Module

## File structure

```
src/modules/habits/
├── schema.ts              # habits + habit_completions tables (OWNED)
├── types.ts               # HabitSummary, ToggleCompletionInput, ReorderInput, HabitDetail
├── actions.ts             # CRUD, toggleCompletion, reorderHabits, getDailyProgress, getHistoryData
├── index.ts               # Barrel export — ONLY file other code may import from
├── components/
│   ├── HabitCard.tsx      # Tap-to-complete card with Framer Motion animation
│   ├── HabitBoard.tsx     # Embeds cards, QueryClientProvider hooks, progress/confetti/history integration
│   ├── DailyProgress.tsx  # Progress bar showing current points vs target (Phase 3)
│   ├── ConfettiCelebration.tsx  # localStorage-guarded confetti on target met (Phase 3)
│   └── HistoryChart.tsx   # Recharts line chart of points over time (Phase 3)
├── tests/
│   └── actions.test.ts    # Unit tests across describe blocks
└── README.md              # This file
```

## API routes (hosted in /app)

| Route | Method(s) | Purpose |
|-------|-----------|---------|
| `src/app/api/habits/route.ts` | GET, POST | List habits by profile / Create habit |
| `src/app/api/habits/[id]/route.ts` | GET, PATCH, DELETE | Get single habit / Update fields / Archive habit |
| `src/app/api/habits/[id]/completion/route.ts` | POST | Toggle completion (insert-or-delete) |
| `src/app/api/habits/reorder/route.ts` | POST | Reorder display_order atomically |
| `src/app/api/habits/progress/route.ts` | GET | Get daily progress (current/target/percentage) — Phase 3 |
| `src/app/api/habits/history/route.ts` | GET | Get history data for chart ({date, points} array) — Phase 3 |

## What it does
- **CRUD:** Create, update, archive habits per profile (text, emoji, points, display_order)
  - Soft ceiling of 60 non-archived habits per profile
  - Deletion is archival (`archived_at`), never row DELETE
  - Plain last-write-wins updates — no version column, no conflict detection
- **Completion toggle:** Via `habit_completions` log table (insert-or-delete)
  - `completed_date` always computed server-side via `core/ist-date.ts` (never trusted from client)
  - Unique constraint on `[habit_id, completed_date]` prevents double-counting
- **Drag-and-drop reordering:** Using `@dnd-kit` with touch sensors
  - Multi-row `display_order` update in one atomic transaction
  - Background polling paused during active drag (via `isDragging` state flag)
- **Daily progress:** Derived from completions joined against habit points
  - Progress bar component with zero-target guard (`target_points === 0`)
  - Confetti (localStorage-guarded per profile+date, fires once at 100%)
- **History chart:** Recharts line chart computed live from `habit_completions`
  - 30-day default range, configurable via prop
  - Includes completions from archived habits (history preserved)
- **Polling enhancements:** TanStack Query background polling
  - Paused when tab is not visible (`visibilitychange` listener)
  - Paused during active drag gesture (`isDragging` state)
  - Invalidates all habit/progress/history queries on profile switch

## What it reads/writes from `/core`
- **Reads:** `core/schema.ts` — `profiles` table (read-only for `target_points`)
- **Writes to core:** NONE. The habits module never writes the `profiles` table.
- **Own tables:** `habits`, `habit_completions` defined in `modules/habits/schema.ts`

## Its own tables
- `habits` — id, profile_id (FK), text, emoji, points, display_order, created_at, updated_at, archived_at
- `habit_completions` — id, habit_id (FK), profile_id (FK), completed_date (date, IST server-computed), completed_at (timestamptz)
  - Unique constraint on `[habit_id, completed_date]`
  - Foreign keys: `ON DELETE RESTRICT`

## If something breaks here, check this first
1. **Duplicate completion error:** Check the unique constraint on `[habit_id, completed_date]`. This is by design — it prevents double-counting.
2. **Completion date wrong:** Verify `core/ist-date.ts` is being used server-side. Never accept `completed_date` from client input.
3. **Reordering leaves half-updated list:** The multi-row `display_order` update MUST be in a single database transaction. If not, rollback on any failure.
4. **ESLint boundary error:** This module must NOT import from `@modules/profiles/*`. Use core contracts (`ProfileSummary`) for shared types only.
5. **Progress bar shows NaN with zero target:** Guard against `target_points === 0` or `null` before dividing (see `getDailyProgress`).
6. **Confetti refires on poll refresh:** The `localStorage` guard key includes IST date — check `getConfettiKey()` in ConfettiCelebration.tsx.
7. **History chart empty despite completions:** Verify the API route query joins habits table for points. Archived habit completions ARE included (that's by design).
8. **Polling not pausing on tab switch:** Check that `document.hidden` is being read correctly and the `refetchInterval` ternary returns `false` (not `0`) when paused.
9. **Progress data stale after profile switch:** ProfileSwitcher now invalidates habits/progress/history queries — check `invalidateHabitsQueries()` call.

## Unit tests (Phase 2)
Run: `npm test -- modules/habits/tests/actions.test.ts`

| Describe block | Tests | Coverage |
|---------------|-------|----------|
| `getHabitsByProfile` | 4 | Sorted by display_order, excludes archived, is_completed_today shape, empty array |
| `getHabitById` | 3 | Valid ID lookup, 404 non-existent, 404 archived |
| `createHabit` | 7 | Valid creation, incrementing order, empty text reject, negative points reject, 60-habit ceiling, archive doesn't count toward ceiling, invalid profile_id |
| `updateHabit` | 8 | Text/emoji/points/multi-field update, requires-at-least-one field, 404 non-existent/archived, negative points |
| `archiveHabit` | 4 | Sets archived_at, preserves completions, 404 non-existent, 404 re-archive |
| `toggleCompletion` | 7 | INSERT when none exists, DELETE when exists, IST date server-computed, profile_id from habit row, 404 non-existent/archived, idempotent toggle twice |
| `reorderHabits` | 9 | Reorders display_order, validates all belong to profile, no extra/missing IDs, 404 for non-existent ID, updates updated_at, atomicity, empty list reject, sequential order from 0 |

Total: **28 tests** across **7 describe blocks**.