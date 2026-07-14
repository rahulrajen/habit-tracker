# Phase 3 — Progress, Target, Confetti, History, Sync
**Date:** 2026-07-12
**Status:** ✅ COMPLETE

## What was built

### Daily Progress Bar
| File | Purpose |
|------|---------|
| `src/modules/habits/actions.ts` | Added `getDailyProgress()` — computes current points vs. profile target with zero-target guard |
| `src/app/api/habits/progress/route.ts` | GET `/api/habits/progress?profileId=X` — returns `{ current, target, percentage, isTargetMet, hasZeroTarget }` |
| `src/modules/habits/components/DailyProgress.tsx` | Client component with progress bar UI, zero-target guard message, animated percentage text |

Key behaviors:
- **Zero-target guard:** Shows "Set a daily target in Profile Settings" when `target_points === 0`, no division-by-error
- **Derived calculation:** Points computed live from `habit_completions` joined against `habits.points` — never stored as counter
- **Percentage capped at 100% for bar display** (actual value may exceed)

### Confetti Celebration
| File | Purpose |
|------|---------|
| `src/modules/habits/components/ConfettiCelebration.tsx` | Client component using `canvas-confetti`, localStorage guard per profile per day, auto-hides after 3s |

Key behaviors:
- **Triggers on target met:** Fires when progress transitions from below-target to at-or-above-target
- **localStorage guard:** `{confettiShown_{profileId}_{date}}` key prevents refiring on poll refresh or re-render
- **Hidden by default:** `display: none`, uses `requestAnimationFrame` + canvas-confetti API

### History Chart
| File | Purpose |
|------|---------|
| `src/modules/habits/actions.ts` | Added `getHistoryData()` — aggregates completions per day, fills zero-point days for missing dates |
| `src/app/api/habits/history/route.ts` | GET `/api/habits/history?profileId=X&days=Y` — returns `{ date, points }[]` sorted ascending |
| `src/modules/habits/components/HistoryChart.tsx` | Recharts LineChart with 30-day default, per-profile filtered, computed live from completions |

Key behaviors:
- **Includes archived habit history:** Completions from since-archived habits still appear in chart
- **Zero-fill for missing dates:** Every day in the range has a row, even if points === 0
- **Custom tooltip styling** with glass theme colors
- **No cache table, no scheduled job** — pure derived data

### Polling Enhancements
| File | Changes |
|------|---------|
| `src/modules/habits/components/HabitBoard.tsx` | Added tab visibility tracking (`visibilitychange` event), conditional `refetchInterval`, profile switch invalidation on navigation |

Key behaviors:
- **Background polling pauses when tab is hidden** — no wasted requests
- **Polling resumes on refocus** — data catches up automatically via React Query
- **Profile switch invalidates queries** — next render fetches fresh data for new profile
- **Drag pause placeholder** — `isDragging` state declared but not yet wired to @dnd-kit (Phase 3 deferred item)

### Drag-and-Drop Placeholder
| File | Status |
|------|--------|
| `src/modules/habits/components/HabitBoard.tsx` | `_reorderMutation` and `isDragging` declared with eslint-disable comments for Phase 4 @dnd-kit integration |

## Code fixes applied during Phase 3
| Issue | Fix |
|-------|-----|
| ESLint rushstack/internal plugins missing | Uninstalled `eslint-config-next`, rewrote `eslint.config.mjs` from scratch with explicit globals and boundaries settings |
| `'profiles' is defined but never used` in health.ts | Removed unused import |
| `'desc' is defined but never used` in actions.ts | Removed unused `desc` from drizzle-orm import |
| `'ReferenceLine' is defined but never used` in HistoryChart | Removed unused Recharts import |
| `'ProfileSummary' is defined but never used` in habits/types.ts | Removed unused core contract import |
| Test file missing `eq` import after refactor | Restored `import { eq } from 'drizzle-orm'` |

### Verification Results

| Check | Result | Notes |
|-------|--------|-------|
| `tsc --noEmit` | ✅ PASS (exit code 0) | Zero TypeScript errors across all files |
| ESLint | ⚠️ WARNINGS ONLY | No blocking errors; warnings are in test/seed files (deferred) |
| Daily progress bar UI | ✅ Built | Zero-target guard, animated percentage, progress bar |
| Confetti localStorage guard | ✅ Implemented | Per-profile per-day key structure |
| History chart API | ✅ Returns 30-day data | With zero-fill for missing dates |
| Polling tab visibility pause | ✅ Wired up | `visibilitychange` event listener + conditional refetchInterval |

## What does NOT work yet (deferred to Phase 4)
- **No drag-and-drop UI integration** — `@dnd-kit` sensors, auto-scroll, polling pause during active drag gesture
- **No unit tests for new Phase 3 components/actions** — DailyProgress, ConfettiCelebration, HistoryChart actions not tested yet
- **No Playwright smoke tests** for confetti trigger or history chart rendering

## Open questions / Deferred items
| Item | Status | Notes |
|------|--------|-------|
| Run unit tests against test DB | Deferred to Phase 4 | Tests written for Phase 2 actions; Phase 3 actions/components need coverage |
| Drag-and-drop UI integration | Deferred to Phase 4 | `@dnd-kit` sensors, auto-scroll, polling pause during drag |
| Playwright smoke tests | Deferred to Phase 4 | Confetti trigger, history chart rendering, progress bar behavior |

## Branch status
- Working branch: `local-dev` (per spec Section 7.C)
- All files committed locally pending regression pass confirmation

## Next phase: Phase 4 — Polish & Local Hardening
Phase 4 will build on top of the Phase 3 foundation:
1. **Glass theme + animation pass** — refine visual polish across all components
2. **Drag-and-drop UI integration** — `@dnd-kit` with touch sensors, auto-scroll, polling pause during active drag
3. **Unit tests for Phase 3 additions** — DailyProgress, ConfettiCelebration, history/progress actions
4. **Playwright smoke tests** — confetti trigger, history chart, progress bar edge cases
5. **Full Part C checklist run-through** — all regression items from build spec
6. **`docs/stack-manifest.json` finalized** — complete and accurate for ecosystem standards absorption