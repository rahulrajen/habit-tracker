# Progress Log Template — Phase Hand-off Document
**Originated in:** Habit Tracker (app #1, Phase 0–4)
**Purpose:** Structured hand-off between phases and chat sessions.
**Absorbed by:** Ragul's Mission Control `config-standards-manager` module (when built).

---

## File Location

All progress logs go in: `docs/progress-logs/<phase-name>.md`

Example filenames:
- `phase-0-setup-scaffolding.md`
- `phase-1-core-infrastructure-profiles.md`
- `phase-2-habits-crud-reorder-completions.md`
- `phase-3-progress-confetti-history-sync.md`
- `phase-4-polish-local-hardening.md`

---

## Template

```markdown
# <Phase Number> — <Phase Title>
**Date:** YYYY-MM-DD
**Status:** ✅ COMPLETE | ⏳ IN PROGRESS | ❌ BLOCKED: [reason]

## What was built

### <Feature/Component Area 1>
| File | Purpose |
|------|---------|
| `path/to/file.ts` | Brief description |

Key behaviors:
- Behavior 1
- Behavior 2

### <Feature/Component Area 2>
...

## Code fixes applied during this phase
| Issue | Fix |
|-------|-----|
| Description of issue | What was done to fix it |

## Verification Results

| Check | Result | Notes |
|-------|--------|-------|
| `tsc --noEmit` | ✅ PASS / ❌ FAIL | Zero errors / specific error count |
| Test suite | ✅ PASS / ❌ FAIL | All tests pass / which failed |
| Build | ✅ PASS / ❌ FAIL | Production build succeeded/failed |

## What does NOT work yet (deferred)
| Item | Status | Notes |
|------|--------|-------|
| Deferred feature 1 | Deferred to Phase X | Why it was deferred |

## Open questions / Deferred items
| Item | Status | Notes |
|------|--------|-------|
| Question/decision 1 | Needs resolution | Context needed to resolve |

## Branch status
- Working branch: `<branch-name>`
- All files committed locally pending regression pass confirmation

## Next phase: <Phase Number> — <Title>
Brief note on what the next phase will build on top of.

## Plan Mode decisions recorded
| Decision | Chosen Option | Rationale |
|----------|--------------|-----------|
| Design decision 1 | Option A | Why A was chosen over B/C |

## Deviations from spec (if any)
| Spec Section | What Was Done Instead | Why |
|-------------|----------------------|-----|
| Section X.Y | Actual implementation | Justification for deviation |
```

---

## Writing Guidelines

### Be specific about verification results
Always include the actual output of `tsc --noEmit`, test suite, and build commands. "PASS" without context is not useful to the next session.

### Record every Plan Mode decision
If a design decision was made during Plan Mode review (or mid-phase when returning to Plan Mode), record it in the "Plan Mode decisions recorded" table with:
- What the decision was
- Which option was chosen
- Why that option was selected

### Document deviations immediately
If implementation deviated from the build spec — even slightly — note it in the "Deviations from spec" table. Include the spec section number and a clear rationale. This is how the spec itself evolves over time.

### Mark deferred items with target phase
Every item that wasn't completed should have a "Deferred to Phase X" label so the next session knows the intended priority.

---

## Absorption Protocol

When Mission Control's `config-standards-manager` module exists:
1. This template is absorbed as `progress-log-template.md`.
2. Progress logs from all apps are migrated into Mission Control's central log system.
3. The template may be extended with additional fields (e.g., telemetry metrics, deployment status) as the ecosystem grows.