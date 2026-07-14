# Coding Standards — TypeScript / Next.js (Habit Tracker)
**Originated in:** Habit Tracker (app #1, Phase 0–4)
**Purpose:** Shared coding conventions for the TMag ecosystem.
**Absorbed by:** Ragul's Mission Control `config-standards-manager` module (when built).

---

## 1. TypeScript Rules

### Strict Mode
- `strict: true` in `tsconfig.json` — all strict checks enabled.
- No `any` type unless explicitly marked with `// eslint-disable-next-line @typescript-eslint/no-explicit-any`.
- Use `type` over `interface` except when extending third-party types (use `interface` for declaration merging).

### Naming Conventions
| Kind | Pattern | Example |
|------|---------|---------|
| Component | PascalCase, noun/noun+verb | `HabitCard`, `ProfileSwitcher` |
| Function / Action | camelCase, verb-first | `createHabit()`, `toggleCompletion()` |
| Type / Interface | PascalCase | `HabitItem`, `ToggleCompletionInput` |
| Constant | UPPER_SNAKE_CASE for config, camelCase for values | `REFRESH_INTERVAL_MS` |
| File (component) | kebab-case | `error-boundary.tsx`, `daily-progress.tsx` |
| File (module/API) | kebab-case | `ist-date.ts`, `stack-manifest.json` |

### File Extensions
- `.ts` — server code, types, utilities, tests
- `.tsx` — React components (any file with JSX syntax)
- No `.js` files in the project.

---

## 2. Core vs Module Pattern

### Rule: Only put something in `/core` once a second module genuinely needs it.
If only one module uses a utility, schema, or type, it lives inside that module's folder. Promote to core when a second consumer appears.

### What lives in `/core`:
- `db.ts` — Drizzle client instance (shared database connection)
- `schema.ts` — Core-owned tables (`profiles`)
- `contracts.ts` — Shared type definitions (`ProfileId`, `ProfileSummary`)
- `errors.ts` — Standard error shape and helper functions
- `logger.ts` — Tagged logger via `getLogger(moduleName)`
- `ist-date.ts` — UTC+5:30 date conversion (the only shared date utility)
- `health.ts` — Health check endpoint logic

### What lives in modules (`/modules/profiles`, `/modules/habits`):
- Own schema files (tables they exclusively own)
- Actions layer (server functions for API routes)
- Components (React UI)
- Types (module-specific interfaces)
- Tests (`tests/` subfolder)

### Import Boundaries (enforced by ESLint)
```
core  ←── allowed dependency ──┐
                                 │
modules/profiles ──imports from─┤  Both may import from core
                                 │
modules/habits   ──imports from─┘  Never on each other's internals
```

ESLint rule (`eslint-plugin-boundaries`):
- `from: "@modules/*"` → `to: ["@core"]`, mode: `"allow"`
- Cross-module imports (e.g., profiles importing habits types) fail lint.

---

## 3. Completion-Log Pattern

Proven in Habit Tracker — applies to any app tracking event-based data:

1. **No stored counters.** "Today's total" is always `SUM()` joined against a completion log table, never a running counter column.
2. **Unique constraint for concurrency safety.** `(entity_id, date)` unique constraint replaces optimistic locking / version tokens. Duplicate inserts fail at the DB level — no race condition possible.
3. **Insert-or-delete toggle.** Toggling is `INSERT ... ON CONFLICT DO UPDATE` or `DELETE`. The database handles concurrent toggles safely.
4. **Server-computed dates.** Calendar day boundaries are always computed server-side using a shared date utility (`core/ist-date.ts`). Never trust client-supplied dates for boundary logic.
5. **Soft-delete preserves history.** Archiving an entity sets `archived_at` but never deletes rows from the completion log. Past events remain attributable to their original dates.

---

## 6. The `.clineignore` Convention

Every repo in the ecosystem includes a `.clineignore` file at root that lists files/directories Cline/Qwen should skip reading:

```
node_modules/
.next/
dist/
coverage/
package-lock.json
.env*
.git/
```

This serves two purposes:
1. **Context efficiency** — Keeps the AI agent's context window focused on source code, not lockfiles or build artifacts.
2. **Security** — `.env*` patterns prevent any secret values (DB connection strings, API keys) from ever being read into the agent's context.

---

## 7. Module README Requirement

Every module folder (`/modules/profiles`, `/modules/habits`, and any future module) must include a `README.md` with:
1. **What it does** — One-paragraph summary of responsibility.
2. **Own tables** — Which database tables this module owns (schema file path).
3. **Reads from core** — What shared surfaces it reads (`core/schema.ts`, `core/contracts.ts`).
4. **Writes to core** — Confirm whether it writes to any core table (normally: no, only the profiles module writes `profiles`).
5. **API routes** — List of `/api/*` routes this module owns.
6. **"If something breaks here, check this first"** — Top 3–5 debugging checklist items specific to this module.
7. **Unit test coverage** — Which actions/functions have tests and where they live.

---

## 8. API Route Conventions

### Structure
```
src/app/api/
  /<resource>/
    route.ts          → GET, POST (list + create)
    /[id]/
      route.ts        → GET, PATCH, DELETE (single resource ops)
      completion/
        route.ts      → POST (domain-specific action)
```

### Patterns
- **Zod validation at every boundary.** All incoming data validated before DB interaction.
- **Standardized error responses.** Use `core/errors.ts` for consistent `{ error: string, status: number }` shapes.
- **Server-computed dates only.** Never accept a date string from the client for calendar-day logic.
- **Transactions for multi-row writes.** Reorder operations wrapping all row updates in a single transaction.

---

## 9. Testing Standards

### Unit / Integration (Vitest)
- Colocated: `src/modules/<module>/tests/<action-name>.test.ts`
- Run against local Docker Postgres (`habit_tracker_test`).
- Each public action function should have at least one test covering the happy path and one error case.

### E2E Smoke Tests (Playwright)
- Located in `e2e/tests/`.
- Minimum coverage: health check, root redirect, main page renders without JS errors, key UI elements visible.
- Two projects: Desktop Chrome + Mobile Chrome (Pixel 7).

### Type Checking Gate
- `tsc --noEmit` must pass with exit code 0 before any phase is marked complete.
- Build verification: `npm run build` must succeed without errors.

---

## 10. Git / Branching Conventions

- **Feature branch per phase:** Each phase/feature gets its own branch off `local-dev`.
- **Checkpoint commits:** Local-only commits on the feature branch after each successful regression pass.
- **Never touch `main` or push remotely until explicit go-live.**
- **Merge locally first,** then push+merge to remote only when the user explicitly approves Part D of the build spec.

---

## 11. Absorption Protocol

When Mission Control's `config-standards-manager` module exists:
1. Push this file to the shared standards location (or copy into Mission Control's `docs/standards/`).
2. The `config-standards-manager` absorbs it as `coding-standards.md`.
3. Subsequent apps reference these conventions instead of redefining them locally.