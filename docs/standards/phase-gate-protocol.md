# Phase Gate Protocol — Plan Mode First Workflow
**Originated in:** Habit Tracker (app #1, Phase 0–4)
**Purpose:** Shared development workflow for the TMag ecosystem.
**Absorbed by:** Ragul's Mission Control `config-standards-manager` module (when built).

---

## 1. Core Principle: Plan Mode First

**Every phase starts in Plan Mode, with no exceptions.** The AI agent explicitly announces it — e.g., "Entering Plan Mode for Phase X" — before doing anything else for that phase. No code is written until the user reviews the plan and manually switches to Act Mode. The agent never switches itself.

### Why this matters
- Prevents wasted effort from building the wrong thing.
- Forces a deliberate design discussion before implementation commits.
- Creates a shared artifact (the approved plan) that serves as a reference during implementation.

---

## 2. Plan Mode Output Requirements

Before switching to Act Mode, the agent outputs a comprehensive, itemized plan covering:

1. **File-tree diff** — Every file to be created or modified, with its path relative to repo root.
2. **Purpose walkthrough** — What each file does and how data flows through the new feature end-to-end.
3. **Build order** — Which files must exist before others can be created, and why that order.
4. **Test strategy** — How each piece will be tested, against which parts of the regression protocol.
5. **Edge cases** — Every edge case identified for that phase and exactly how it's handled.
6. **Spec sections referenced** — Which sections of the build spec are directly relevant to this phase's scope, named explicitly.
7. **Open questions** — Any remaining decisions that need user input before implementation begins.

This should be detailed enough that a different developer could pick it up and build the same thing.

---

## 3. Mid-Phase Design Changes = Return to Plan Mode

If a meaningful design change is discovered mid-phase (during Act Mode), the agent must:
1. **Stop immediately** — Don't complete the current file or function.
2. **Announce the return to Plan Mode** — "Returning to Plan Mode for design change: [description]."
3. **Present the proposed change** — What's different, why it's needed, impact on already-written code.
4. **Get user sign-off** — Only proceed after the user reviews and approves the change.

### What counts as a "meaningful design change"
- Adding a new database column or table not in the original plan.
- Changing an API route signature (method, params, response shape).
- Introducing a new dependency (package) not previously listed.
- Altering a shared surface (`core/schema.ts`, `core/contracts.ts`).
- Any decision the build spec explicitly left as a "Plan Mode question."

### What does NOT require returning to Plan Mode
- Fixing lint errors or TypeScript type issues introduced by the agent's own code.
- Refactoring within the already-approved architecture (same patterns, just applied).
- Cosmetic CSS adjustments that don't change component structure.

---

## 4. Fresh Chat Per Phase

**Starting a new chat per phase is expected and encouraged**, rather than letting one conversation's context grow across the whole build.

### Hand-off mechanism
At the end of every phase, the agent writes a **progress log** to `docs/progress-logs/<phase-name>.md`. This written file is the authoritative hand-off — not a remembered or manually retyped summary.

When starting a new chat for the next phase:
1. **Read the build spec file first.**
2. **Then read the most recent progress log(s) from `docs/progress-logs/` on disk.**
3. A quick verbal recap from the user is a fine supplement but shouldn't be relied on as the primary mechanism.

---

## 5. Phase Gates Checklist

Before marking a phase complete and moving to the next, verify:

### Technical gates
- [ ] `tsc --noEmit` passes with exit code 0 (zero TypeScript errors).
- [ ] Full test suite runs against the **test** database (not dev).
- [ ] Production build (`npm run build`) succeeds without errors.
- [ ] ESLint has zero blocking errors (warnings are acceptable, documented).

### Documentation gates
- [ ] All new modules have a `README.md` with "if something breaks here" checklist.
- [ ] `docs/stack-manifest.json` is updated to reflect current state.
- [ ] Progress log written to `docs/progress-logs/<phase-name>.md`.

### Process gates
- [ ] Plan Mode was announced and plan approved before Act Mode began.
- [ ] Any mid-phase design changes returned to Plan Mode and were approved.
- [ ] No `git push`, Netlify deploy, or real database provision occurred without explicit user approval.

---

## 6. The Two-Strike Error Rule

If a command execution, compilation, linting check, or test suite run fails **2 consecutive times** after code modification:
1. **Stop all tool executions immediately.**
2. **Do NOT attempt a 3rd fix.**
3. **Print the exact error log output**, describe the root cause analysis attempted, and wait for human confirmation before proceeding.

This prevents iterative guesswork from consuming context window on problems that need human insight.

---

## 7. Circuit Breaker for Network Operations

When apps connect to external APIs (Google Drive, Calendar, Mission Control telemetry):
- All async external API operations must be governed by an explicit **Circuit Breaker** pattern.
- If a downstream API returns a 5xx error or timeout twice in a row, the circuit trips to `OPEN`, failing fast and logging structured telemetry.
- No raw retry loops — use state-driven transitions: `CLOSED → OPEN → HALF_OPEN → CLOSED`.

---

## 8. Absorption Protocol

When Mission Control's `config-standards-manager` module exists:
1. Push this file to the shared standards location (or copy into Mission Control's `docs/standards/`).
2. The `config-standards-manager` absorbs it as `phase-gate-protocol.md`.
3. Subsequent apps reference this protocol instead of redefining their phase workflow.