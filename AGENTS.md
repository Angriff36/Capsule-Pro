# AGENTS.md — Operational rules and commands

This is the operational source of truth for working in this repo. **Behavioral rules** (how to think, plan, verify, fail loud) live in [`CLAUDE.md`](./CLAUDE.md). **Manifest governance** lives in [`docs/manifest/governance.md`](./docs/manifest/governance.md) — read it before any Manifest, API route, dispatcher, or governed-entity work. **Database/migration workflow** lives in [`docs/database/CONTRIBUTING.md`](./docs/database/CONTRIBUTING.md) — read it before any schema or migration work.

If you are about to touch:
- A Next.js route or page → read the bundled Next.js doc relevant to the area (see below).
- A Manifest-governed entity, route, or command → read `docs/manifest/governance.md` AND `docs/manifest/constitution/constitution-v1.md`.
- A Prisma migration or schema → read `docs/database/CONTRIBUTING.md`.

<!-- BEGIN:nextjs-agent-rules -->

## Next.js: ALWAYS read bundled docs before coding

Before any Next.js work, find and read the relevant doc in `node_modules/next/dist/docs/`.
Your training data is outdated — the docs are the source of truth.

<!-- END:nextjs-agent-rules -->

## Capsule Pro Dev Server

- **App**: `http://localhost:2221` (Tailscale: `https://pop-os.tail78dd9e.ts.net`)
- **API**: `http://localhost:2223`
- **MCP endpoint**: `http://localhost:2221/_next/mcp` (Next.js 16+ built-in, SSE)

## Start Dev Server

```bash
cd /home/oc/projects/capsule-pro/apps/app
pnpm dev
```

Or with Infisical secrets (if keyring available):
```bash
cd /home/oc/projects/capsule-pro
source .env  # for INFISICAL_TOKEN
infisical run --projectId=d8319856-8caf-4c22-8717-57ab28b326b3 --env=dev --path=/apps/capsule-pro/app -- pnpm --filter app dev
```

## MCP Tools (use mcporter)

```bash
# List available tools
mcporter list --http-url http://127.0.0.1:2221/_next/mcp --allow-http --name next-devtools

# Call a tool
mcporter call --http-url http://127.0.0.1:2221/_next/mcp --allow-http 'next-devtools.get_routes()'
mcporter call --http-url http://127.0.0.1:2221/_next/mcp --allow-http 'next-devtools.get_errors()'
mcporter call --http-url http://127.0.0.1:2221/_next/mcp --allow-http 'next-devtools.get_project_metadata()'
```

Available tools: `get_project_metadata`, `get_errors`, `get_page_metadata`, `get_logs`, `get_server_action_by_id`, `get_routes`

## Build / Typecheck / Test

```bash
pnpm turbo typecheck                    # workspace-wide
pnpm turbo typecheck --filter=api       # one app/package
pnpm turbo test                         # workspace-wide
pnpm turbo test --filter=api            # one app/package
pnpm turbo build                        # full build
pnpm vitest run path/to/file.test.ts    # single test file (run from repo root or the app dir)
```

When running a single test that imports `@/...` aliases, run from the owning app directory (e.g. `cd apps/api && pnpm vitest run __tests__/...`) so module resolution picks up the app's `tsconfig.json` paths.

## Manifest CLI cheat sheet

Operational commands for `@angriff36/manifest` (current installed version: 0.5.0). Authority for what is allowed lives in [`docs/manifest/governance.md`](./docs/manifest/governance.md) — these are just the commands.

```bash
# Validate manifest sources compile to a valid IR
pnpm manifest check -g "packages/manifest-adapters/manifests/*.manifest"

# Compile all manifests to one IR file
pnpm manifest compile -g "packages/manifest-adapters/manifests/*.manifest" -o /tmp/ir-out

# Emit commands.json + entities.json from an existing IR
pnpm manifest emit registries --ir packages/manifest-ir/ir/kitchen/kitchen.ir.json --out manifest-registry

# Validate the bypass registry
pnpm manifest audit-bypasses --registry bypasses.json --strict-expiry

# Run the full governance detector suite
pnpm manifest audit-governance -r apps/api \
  --commands-registry ../../manifest-registry/commands.json \
  --bypass-registry ../../bypasses.json --strict

# The gate before claiming compliance
pnpm manifest integration-check --root apps/api \
  --commands-registry manifest-registry/commands.json \
  --bypass-registry bypasses.json

# Capsule-local direct-write audit (closes the upstream detector blind spot —
# detector matches `prisma.X.method` only; Capsule uses `database.X.method`).
# Reports JSON + Markdown into manifest-audit/.
pnpm manifest:audit-direct-writes
pnpm manifest:audit-direct-writes:strict  # exit 1 on governed-entity violations

# Diagnostics for source/IR/route drift
pnpm manifest doctor
pnpm manifest runtime-check <Entity> <command>

# Generate a route surface from IR (use only when the dispatcher is missing)
pnpm manifest generate <path-to-ir.json> --projection nextjs --surface route -o apps/api/app/api
```

Path conventions:
- `bypasses.json` lives at repo root.
- `manifest-registry/{commands,entities}.json` lives at repo root.
- Canonical dispatcher: `apps/api/app/api/manifest/[entity]/commands/[command]/route.ts`.

## Database & Migrations (command summary)

**Canonical workflow doc:** [`docs/database/CONTRIBUTING.md`](./docs/database/CONTRIBUTING.md). **Read it before any schema or migration work.** Supplementary references: `docs/database/README.md` (architecture), `docs/database/SCHEMAS.md` (per-schema overview), `docs/database/KNOWN_ISSUES.md` (active gotchas). This section is a command quick-reference only; CONTRIBUTING.md is the source of truth for rationale, rules, and recovery.

```bash
pnpm db:check                                # detect drift
pnpm db:dev -- --create-only --name <name>   # author a migration via shadow DB (args after --)
pnpm db:deploy                               # apply migrations to current DB
pnpm migrate                                 # chained: db:check && prisma:format && prisma:check && db:dev (auto-applies; no --create-only)
pnpm migrate:status                          # wrapper for prisma migrate status
pnpm migrate:resolve --rolled-back <name>    # repair a failed migration
pnpm db:repair                               # generate additive-only repair migration
```

Hard rules (full rationale in `docs/database/CONTRIBUTING.md`):

- **Never hand-author `migrations/<ts>_name/migration.sql`** — use `pnpm db:dev --create-only --name <name>` so the shadow DB validates every reference. Do not invoke `prisma migrate dev` directly.
- **Verify table names against `packages/database/prisma/schema.prisma`** before writing raw SQL. `@@map` overrides change the table name (e.g. `model User` → `@@map("employees")` → table is `employees`). Models without `@@map` use the verbatim PascalCase model name.
- **Existing migrations are immutable.** Add a new migration; never edit a committed one. The only exception is a failed dev-only migration that has not been applied elsewhere — mark rolled-back, patch, redeploy.
- **Never `prisma db push` (disabled here) or `prisma migrate reset` without explicit user confirmation** — `reset` drops all data.
- **`pnpm db:repair` creates untracked folders** — `git add` them immediately; auto-stash hooks can eat untracked migration folders.

If you hit a broken state (`P3009`, missing migration folder, table-name mismatch, orphaned `_prisma_migrations` rows), follow the recovery cheatsheet in `docs/database/CONTRIBUTING.md`.

## Process Management (Windows)

- NEVER use `taskkill //F //IM node.exe` — it kills ALL Node.js processes INCLUDING the Claude Code CLI itself.
- Use `npx kill-port PORT` to free a port, or find a PID with `netstat -ano | findstr :PORT` then kill it specifically with `taskkill //F //PID XXXX`.
- Use Unix shell syntax even on Windows (the harness runs bash): forward slashes in paths, `/dev/null` not `NUL`.

## Git / commit / push safety

- Commit often, small atomic changes. Format: `[type] what and why`.
- `commit` is a routine local action — do it yourself when scope is clear.
- `push` is a remote, harder-to-reverse action — confirm with the user before pushing.
- Never amend a pushed commit, force-push to a shared branch, or skip pre-commit hooks (`--no-verify`) without explicit user authorization.
- Never use `git add -A` or `git add .` blindly — add specific files. `.env`, credentials, and large binaries are easy to commit by accident.

## Capsule Pro-Specific Code Rules

- **Server-side: governed mutations go through the canonical Manifest dispatcher.** Path verified: `apps/api/app/api/manifest/[entity]/commands/[command]/route.ts`. Policy (when an alias is acceptable, when a bypass is acceptable) is decided by [`docs/manifest/governance.md`](./docs/manifest/governance.md), not by AGENTS.md.
- **Client-side: no raw `/api/` string literals in UI code.** The only file in client/UI code allowed to contain `/api/...` strings is `apps/app/app/lib/routes.ts` — the client route SDK that exports typed helpers for every API endpoint (not Manifest-specific). The CI conformance check + ESLint rule enforce this. To add a new route helper, see the in-file instructions at the top of `apps/app/app/lib/routes.ts`.
- App-side server-action shim: `apps/app/lib/manifest-runtime.ts` (wraps `@repo/manifest-adapters/manifest-runtime-factory` with the app's database/Sentry/log singletons). Server actions that need to invoke `runCommand` directly use this.
- Auth: Clerk (`auth().protect()`) on all protected routes.
- Prisma: no foreign keys, use flat keys, Decimal fields must be cast with `.toFixed(2)`.
- No `.js` extensions in imports — use `.ts`/`.tsx` only.
- Port 2221 for app, 2223 for API server.
- Test via Tailscale HTTPS URL, not localhost.

## Known repo gotchas

- The IR file `packages/manifest-ir/ir/kitchen/kitchen.ir.json` — despite the kitchen-suffixed filename — contains the full aggregated IR for ALL 86 manifest source files (130 entities, 589 commands). Use it as the source for `manifest emit registries --ir ...`.
- `pnpm manifest emit registries --source <glob>` does NOT expand globs; pass a single file. Use `--ir` for the aggregated registry.
- `pnpm manifest compile -o <single-file>` overwrites the same file for each compiled source — the final output is whichever file compiled last. Use `-o <dir>` for per-source output.
- The `direct-writes` detector regex matches `prisma.X.method(` but the codebase uses `database.X.method()` (re-exported `PrismaClient`). The detector is currently lenient toward `database.` calls; the governance rule (in `docs/manifest/governance.md`) is not. Use `pnpm manifest:audit-direct-writes` to surface the writes the upstream detector skips — it also walks `app/lib/**`, server actions outside `app/actions/`, packages, and cron handlers, which the upstream globs miss.
- `pnpm manifest audit-governance -r apps/api ...` resolves `--commands-registry` and `--bypass-registry` paths relative to `--root`, not cwd. Use `../../manifest-registry/...` and `../../bypasses.json` when `--root apps/api`. The `integration-check` command resolves them relative to cwd.
