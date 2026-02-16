# AGENTS.md — Convoy (Ralph Wiggum Loop)

This file defines **operational context** for Ralph Wiggum loops. It is read on
every iteration.

It is NOT an architecture document. It is NOT a design proposal. It is NOT a
planning scratchpad.

---

## Project Type

- Monorepo
- Package manager: pnpm (ONLY)
- Primary folders:
  - apps/
  - packages/
  - specs/

---

## Build & Validation Conventions

- Use pnpm only (no npm, no yarn)
- Prefer the smallest possible validation:
  - Targeted tests
  - Targeted typecheck
- Do NOT run full monorepo builds unless required to validate the task
- ALWAYS ADD FULL ERROR LOGGING THIS IS RIDICULOUS

---

## Files to Ignore by Default

Do not read unless explicitly required by the current task:

- docs/inventory/\*\*
- Archived plans
- Historical architecture findings

---

## Execution Mode

- **Autonomous execution**: Do NOT ask for approval before bash/write/edit/task operations. Just do it.
- Skip approval gates — the user trusts the agent to execute directly.
- Still report errors and stop on failures (don't auto-fix blindly), but don't ask permission to start work.

---

## How to Add a New Route

1. **Create the route handler** in `apps/api/app/api/<domain>/<resource>/route.ts`
2. **Regenerate the route manifest**:
   ```bash
   pnpm manifest:routes
   ```
   This updates `packages/manifest-ir/dist/routes.manifest.json` and `routes.ts`.
3. **Add a route helper** in `apps/app/app/lib/routes.ts`:
   ```ts
   export const myNewRoute = (id: string): string =>
     `/api/domain/resource/${encodeURIComponent(id)}`;
   ```
4. **Use the helper** in your component:
   ```ts
   import { myNewRoute } from "@/app/lib/routes";
   const res = await apiFetch(myNewRoute(someId));
   ```

**Do NOT** hardcode `/api/...` strings in client code. The CI check
(`pnpm check:routes`) and the dev-time `apiFetch` guard will catch violations.

**Allowlisted files** (may contain `/api/` strings):

- `apps/app/app/lib/routes.ts` — route helper definitions
- `apps/app/app/lib/api.ts` — apiFetch wrapper
- `apps/app/next.config.ts` — Next.js rewrite rules
- `apps/app/app/api/**` — server route handlers
- `apps/api/**` — API server
- `scripts/**` — build scripts
- `*.test.ts` / `*.spec.ts` — tests

See `specs/manifest/manifest-master-plan.md` § "Manifest Routes Are Canonical" for full spec.

---

## Commit Rules

- Exactly one commit per iteration
- Conventional Commit format
