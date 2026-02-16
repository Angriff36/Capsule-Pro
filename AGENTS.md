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

## Manifest CLI — Your Primary Development Tool

The Manifest CLI is the **canonical interface** for understanding and working with
this codebase's API surface. You MUST use it instead of guessing, grepping, or
scanning the filesystem.

### Rules

- **MUST** run `pnpm manifest:routes:ir -- --format summary` before writing any
  route-related code. This gives you the complete route surface (230 routes, all
  params, methods, auth, policies) in one call.
- **MUST** run `pnpm manifest:lint-routes` after editing client code to verify no
  hardcoded `/api/` paths were introduced.
- **MUST** run `pnpm check:routes` before committing any client-side changes.
- **NEVER** guess at route paths, params, or methods. Query the manifest.
- **NEVER** hardcode `/api/...` strings in client code. Use route helpers.
- **NEVER** scan `apps/api/app/api/` with glob/find to discover routes. Use the CLI.

### CLI Quick Reference

| Command                     | What it does                                                | When to use                              |
| --------------------------- | ----------------------------------------------------------- | ---------------------------------------- |
| `pnpm manifest:routes:ir`   | Generate route manifest from compiled IR (230 routes)       | Before any route work — know what exists |
| `pnpm manifest:routes`      | Regenerate route manifest from filesystem scan (412 routes) | After adding/changing route handlers     |
| `pnpm manifest:lint-routes` | Scan for hardcoded route strings                            | After editing client code                |
| `pnpm check:routes`         | CI conformance scan for `/api/` literals                    | Before committing client changes         |
| `pnpm manifest:compile`     | Compile `.manifest` → IR                                    | After editing manifest files             |
| `pnpm manifest:generate`    | Generate route handlers from IR                             | After compiling new manifests            |
| `pnpm manifest:build`       | Compile + generate in one step                              | Full manifest rebuild                    |
| `pnpm manifest:validate`    | Validate IR + check manifest health                         | Verify manifest integrity                |
| `pnpm manifest:sync`        | Sync vendored runtime from C:/projects/manifest             | After upstream runtime changes           |

### How to Add a New Route

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

### How to Debug a Route Issue

1. **Check if the route exists**:
   ```bash
   pnpm manifest:routes:ir -- --format json | grep "the/path"
   ```
2. **Check method and params**: The JSON output includes `method`, `params`, `auth`, `tenant` for every route.
3. **Check if client code is using the right helper**: Run `pnpm manifest:lint-routes` to find hardcoded paths.
4. **Check policy coverage**: The summary format shows policy-covered vs uncovered routes.

### Allowlisted Files

These files may contain `/api/` strings (everything else is a violation):

- `apps/app/app/lib/routes.ts` — route helper definitions
- `apps/app/app/lib/api.ts` — apiFetch wrapper
- `apps/app/next.config.ts` — Next.js rewrite rules
- `apps/app/app/api/**` — server route handlers
- `apps/api/**` — API server
- `scripts/**` — build scripts
- `*.test.ts` / `*.spec.ts` — tests

See `specs/manifest/manifest-master-plan.md` § "Manifest CLI Workflow for AI Agents" for
the full detailed workflow with examples.

---

## Commit Rules

- Exactly one commit per iteration
- Conventional Commit format
