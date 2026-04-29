# AGENTS.md — Operational Guide

## Build & Run

- Monorepo with pnpm (ONLY — no npm, no yarn)
- Primary folders: `apps/`, `packages/`, `specs/`

## Session Start

- Read `tasks/ledger.md` before starting work (know the scoring system, know the
  leaderboard)
- Read `IMPLEMENTATION_PLAN.md` **NEXT** for the current manifest-persistence /
  repair quest marker (when applicable)

## Planning File Discipline

- `IMPLEMENTATION_PLAN.md` is the **live queue only** (target ≤ 800 lines):
  current task, remaining batches, known blockers, recently resolved, open
  followups, archive map.
- Completed pass write-ups, full audit reports, and historical blocker notes
  belong in archive files under `docs/implementation-history/` (pass logs,
  executive summaries, blocker history, schema/tech-debt) or `docs/audits/`
  (numbered audit passes). **Append to those archives, never delete them.**
- Do not append finished pass logs back into `IMPLEMENTATION_PLAN.md`. Move them
  out and link them from the **Archive Map**.
- `AGENTS.md` is durable operational rules only — no progress notes, no per-pass
  status updates. Status / progress goes in `IMPLEMENTATION_PLAN.md` (live
  queue) or the archives.

## Validation

Run these after implementing to get immediate feedback:

- API typecheck: `pnpm --filter api typecheck`
- API tests: `pnpm --filter api test`
- Frontend tests: `pnpm --filter app test`
- E2E/product-flow tests: `pnpm test:e2e`
- Lint: `pnpm biome check`
- App build: `pnpm turbo build --filter=app`

For any task touching create/edit/delete UI flows, run the matching product-flow
E2E test before committing. Create/edit/delete UI work is incomplete unless an
E2E test proves: UI submit → persisted record through API/database → visible UI
update after refetch or reload.

Product-flow tests:

- New Route:
  `pnpm exec playwright test e2e/workflows/logistics.workflow.spec.ts --project=chromium --workers=1`
- New Facility:
  `pnpm exec playwright test e2e/workflows/facilities.workflow.spec.ts --project=chromium --workers=1`
- New Asset:
  `pnpm exec playwright test e2e/workflows/facilities-assets.workflow.spec.ts --project=chromium --workers=1`

Do not commit if the relevant product-flow test fails. Fix the failure or
document the blocker in `IMPLEMENTATION_PLAN.md`.

## Critical Write Validation

For any command route (`POST /commands/*`), do not trust the command response
payload as proof of persistence. After executing the command:

- Query the corresponding list or detail API.
- Verify the created or updated entity exists in the read model.
- If the entity is not returned, the write path is incorrect, usually because
  `runtime.runCommand()` wrote to a Manifest/JSON store while the read API
  queries a Prisma table.
- Fix the storage wiring or replace the command implementation with a direct
  database write that persists to the same model the read API uses.

Only read APIs are source of truth. Do not commit command-route work unless
command execution is proven through the read path.

## Manifest Persistence Repair Rules

For BROKEN_PRISMA_READ work, use the existing AlertsConfig / batch01 / batch02
pattern.

Allowed changes:

- Add entity-specific PrismaStore.
- Wire entity into ENTITIES_WITH_SPECIFIC_STORES.
- Add createPrismaStoreProvider case.
- Add database mock surface if needed.
- Add targeted persistence test proving command/write path and list/detail read
  path align.

Do not modify Manifest runtime, generator, IR compiler, or constraint semantics
during mechanical BROKEN_PRISMA_READ batches.

If an entity requires runtime, generator, or manifest semantic changes, mark it
SEMANTIC_BLOCKER in IMPLEMENTATION_PLAN.md with a one-line reason and move on.

Do not work on BYPASS routes during BROKEN_PRISMA_READ batches.

## Manifest Commands

- Routes from IR: `pnpm manifest:routes:ir -- --format summary`
- ~~Lint routes: `pnpm manifest:lint-routes`~~ — **script does not exist** (see
  Known Gotchas). Use `pnpm manifest:build` and inspect diff against
  `packages/manifest-ir/dist/routes.manifest.json`.
- After .manifest edits: `pnpm manifest:build`
- Manifest CLI must run from the installed/published `@angriff36/manifest`
  package (`pnpm exec manifest ...`), not from `packages/manifest-runtime/...`
  source paths

## Operational Notes

- **GitHub Packages (`@angriff36`):** local dev — run once:
  `pnpm config set //npm.pkg.github.com/:_authToken <PAT> --location=user` (PAT
  with `read:packages`; same value as CI secret `PKG_AUTH_TOKEN`). Then use
  normal `pnpm install`. CI/Vercel inject auth via
  `scripts/ensure-github-packages-npmrc.sh`.
- IR is authority — filesystem is not source of truth for routes
- `@angriff36/manifest` must be consumed as the published package version
  (currently pinned), not `workspace:*` in `apps/*` or `packages/*`
- All mutations compile to Manifest domain commands
- New/changed API write handlers (`POST`/`PUT`/`PATCH`/`DELETE`) under
  `apps/api/app/api` must exist in canonical route surface
  (`packages/manifest-ir/dist/routes.manifest.json`) unless explicitly
  infrastructure-allowlisted (`webhooks`/`auth`/`cron`/`health`)
- Generated code is projection — never edit generated files
- Exactly one commit per iteration, conventional commit format

### Codebase Patterns

- Command Board UI: **currently missing** —
  `apps/app/app/(authenticated)/command-board/` does not exist (see Known
  Gotchas). Only `apps/app/app/lib/command-board/` (lib) and
  `apps/app/app/api/command-board/` (proxy) remain.
- Command Board API: `apps/api/app/api/command-board/`
- AI API: `apps/api/app/api/ai/`
- Shared packages: `packages/ai/`, `packages/database/`
- Specs: `specs/command-board/`

## Dev Workflow

### Web-Only (day-to-day)

```sh
pnpm dev:web    # app (2221) + api (2223) — no mobile
pnpm dev:app    # app only
pnpm dev:api    # api only
```

### Full Stack (when mobile is in scope)

```sh
pnpm dev:apps   # app + api + mobile
```

Avoid `pnpm dev` (starts everything) unless doing integration testing across all
services.

## Package Boundaries

Shared packages (`packages/`) must be framework-agnostic:

- **No `next/*` imports** in shared packages — use DI or move to `apps/` or
  adapter packages
- **No `react-native` imports** in web apps (`apps/app`, `apps/api`)
- Allowed exceptions: `packages/next-config`, `packages/seo`, `packages/cms`
  (framework-specific by design)

### Known Violations (to remediate)

- `packages/design-system/lib/fonts.ts` — imports `next/font/google`
- `packages/design-system/components/ui/chart.tsx` — imports `next/dynamic`
- `packages/design-system/components/blocks/manifest-test-playground.tsx` —
  imports `next/link`
- `packages/design-system/components/blocks/getting-started-checklist.tsx` —
  imports `next/link`
- `packages/feature-flags/access.ts` — imports `next/server`
- `packages/internationalization/proxy.ts` — imports `next/server`
- `packages/analytics/provider.tsx` — imports `@next/third-parties/google` +
  `@vercel/analytics/react` (added 2026-04-24)

React Native boundary: clean (no violations in web apps).

## Cron Schedule Registry

Vercel runs only what's in `apps/api/vercel.json` — adding a file under
`apps/api/app/api/cron/` does NOT schedule it. The endpoint directory currently
has 5 routes but only 3 are scheduled:

| Route                             | Schedule      | Scheduled? |
| --------------------------------- | ------------- | ---------- |
| `cron/webhook-retry`              | `*/5 * * * *` | ✅         |
| `cron/inventory-audit`            | `0 6 * * *`   | ✅         |
| `sentry-fixer/process`            | `0 0 * * *`   | ✅         |
| `cron/contract-expiration-alerts` | —             | ❌ missing |
| `cron/email-reminders`            | —             | ❌ missing |
| `cron/idempotency-cleanup`        | —             | ❌ missing |

When you add a new cron endpoint, add the matching entry to `vercel.json` in the
same PR, otherwise it never runs in production.

## E2E Product-Flow Tests in CI

E2E tests run in the `e2e-workflows` job of `.github/workflows/ci.yml`. The job:

- Spins up a PostgreSQL 16 service container
- Runs `prisma migrate deploy` to apply schema
- Executes Playwright with `E2E_SUITE=workflows` (runs
  `e2e/workflows/*.spec.ts`)
- Uses `chromium` project (authenticated via Clerk setup project)

**Required GitHub secrets:**

- `CLERK_SECRET_KEY` — Clerk backend secret for auth
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — Clerk publishable key

**GitHub Actions workflow (ci.yml) job:** `e2e-workflows`

**Local execution:** `pnpm test:e2e --project=chromium --workers=1` **CI-only
suites:** Set `E2E_SUITE=workflows` for product-flow tests, `E2E_SUITE=spider`
for smoke tests.

## Test & Logging Hygiene

- **No `console.log` in production code.** Re-verified 2026-04-24: `apps/api/`
  has **449 `console.log` + 1,727 `console.error` + 16 `console.warn` ≈ 2,192
  total** — clean up when you touch them and use `@repo/observability` / Sentry
  instead. Error-path logging is the biggest share; prioritize replacing
  `console.error` first.
- **No `.bak` / `.backup` / `.new` / `.tmp` files in the repo.** Re-verified
  2026-04-24 (third pass): **21 files violate this** — 11 `.bak` + 6 `.backup` +
  3 `.new` + 1 `.tmp` (prior note said "17" but the components already summed to
  21 — arithmetic slip). Includes `AGENTS.md.backup`,
  `packages/database/prisma/schema.prisma.{bak,backup}`,
  `apps/app/next.config.ts.bak`, `.autolab/tasks.json.bak`. Delete them when
  touching surrounding code — use git instead of filename suffixes.
- **No `describe.skip` or `test.todo` in committed code without a linked
  issue.** If a test must be skipped, open a follow-up ticket and reference it
  in a comment on the skip line. Current offenders:
  `apps/api/__tests__/sales-reporting/generate.test.ts:33`,
  `apps/api/__tests__/inventory/forecasting.test.ts:834-836`,
  `apps/api/__tests__/email-templates/templates.test.ts:1073-1077`. **E2E
  (third-pass re-count):** **25** `test.skip(true, …)` conditionals across **6**
  spec files — `integrated-payment-processor` (7), `recipe-scaling` (7),
  `role-aware-empty-states` (4), `illustrated-empty-states` (4),
  `communication-preferences` (2), `getting-started-checklist` (1). Prior note
  of "35 across 8 files" over-counted.

## Schema ↔ Migrations ↔ Code Drift

New migrations must include matching Prisma models in the same PR. The repo
currently has several orphaned cases — treat them as tech debt and fix alongside
related work:

- Migrations that create tables without Prisma models:
  `20260327040000_add_event_waitlist` (adds columns to `event_guests` only).
  (~~`20260327000000_add_vendor_management`~~ — resolved: `VendorContact`,
  `VendorRating` models exist. ~~`20260327010000_add_procurement_budgets`~~ —
  resolved: `ProcurementBudget`, `ProcurementBudgetAlert` models exist.
  ~~`20260327040000_add_lead_scoring`~~ — resolved: `CrmScoringRule` model
  exists. ~~`20260327020000_add_employee_bank_accounts`~~ — resolved:
  `EmployeeBankAccount` model exists.)
- Routes that use raw SQL against non-existent Prisma entities: `Equipment`,
  `ProcurementApproval`, `Deal`. (~~`Driver`, `Vehicle`, `FacilityAsset`,
  `RevenueRecognitionSchedule`~~ — models now exist. ~~`Vendor`, `Budget`~~ —
  `VendorContact`/`ProcurementBudget` cover the needed tables.)

Before adding a route that queries a table, check
`packages/database/prisma/schema.prisma` first — if the model is missing, add it
before the route.

## RLS Reminder

Tenant isolation is enforced via Postgres RLS policies on `tenant_*` schemas,
but coverage is incomplete. Current critical gaps (no RLS policy):

- `tenant_accounting.*` (all tables)
- `tenant_inventory.vendor_catalogs`, `pricing_tiers`, `bulk_order_rules`,
  `procurement_budgets`, `vendor_contacts`
- ~~`tenant_staff.employee_bank_accounts`~~ **RLS now enabled** (resolved
  2026-04-28)

When adding a new `tenant_*`-schema table migration, include
`ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` +
`CREATE POLICY tenant_isolation ON ...;` in the same migration.

## Important Efficiency Standards.

- Never re-read files you just wrote or edited. You know the contents.
- Never re-run commands to "verify" unless the outcome was uncertain.
- Don't echo back large blocks of code or file contents unless asked.
- Batch related edits into single operations. Don't make 5 edits when 1 handles
  it.
- Skip confirmations like "I'll continue..." Lust do it.
- If a task needs 1 tool call, don't use 3. Plan before acting.
- Do not summarize what you just did unless the result is ambiguous or you need
  additional input.

## Known Gotchas

Operational pitfalls discovered during the 2026-04-24 post-expansion audit. Read
these before blaming a tool or your environment.

- **`pnpm manifest:lint-routes` does not exist.** Prior plans referenced it, but
  the script is not in `package.json`. Use `pnpm manifest:build` or
  `pnpm manifest:routes:ir` instead.
- **Biome check may be blocked by stray merge conflicts in
  `.autolab/tasks.json`.** A single unresolved `<<<<<<< / ======= / >>>>>>>`
  block in that file causes `pnpm biome check` to report 1000+ spurious errors.
  Always check `git status` for a modified `.autolab/tasks.json` before trusting
  a lint failure.
- **New modules frequently use raw SQL against tables with no Prisma model.**
  Some domains still have routes that query tables via raw SQL because the
  Prisma model was never created (e.g., `Equipment`, `ProcurementApproval`,
  `Deal`). Models for `Driver`, `Vehicle`, `FacilityAsset`,
  `RevenueRecognitionSchedule`, `VendorContact`, `ProcurementBudget`, and
  `EmployeeBankAccount` now exist. Before trusting that a module is "done", open
  `packages/database/prisma/schema.prisma` and confirm the model exists. A
  passing test or a 200 response on GET does not prove completion.
- **Duplicate `softDelete/` + `soft-delete/` route directories** — the inventory
  triple (`pricing-tiers`, `bulk-order-rules`, `supplier-catalogs`) was cleaned
  up 2026-04-26 (`supplier-catalogs/` removed entirely as a stale duplicate of
  `vendor-catalogs/`). Canonical choice is **`soft-delete/` (kebab-case)**;
  delete any new `softDelete/` sibling you encounter and update
  `scripts/manifest/write-route-infra-allowlist.json` if the deleted prefix was
  listed there.
- **Command Board UI location is currently unclear.** The old
  `apps/app/app/(authenticated)/command-board/` directory does not exist, yet
  multiple documents still reference it. Only `apps/app/app/lib/command-board/`
  (library code) and `apps/app/app/api/command-board/` (API proxy) remain. Treat
  any doc pointing at the authenticated UI path as stale until a rebuild lands.
- **6 manifests are quarantined in
  `packages/manifest-adapters/manifests-disabled/`.** Before authoring a new
  `.manifest` file for Facilities, Knowledge Base, Quality Control, Payment
  Reconciliation, Digital Twin, or Prep Task Dependency domains — **check
  `manifests-disabled/` first**. The file may already exist, and re-integration
  (add the matching Prisma model, then move into `manifests/`) is usually
  cheaper than a new authoring pass. See `IMPLEMENTATION_PLAN.md` "Quarantined
  manifests" for the full list. (Updated 2026-04-28: 4 re-enabled in batch 14, 2
  stale duplicates deleted, down from 12.)
- **Procurement requisitions/vendor-contracts command routes are now
  functional.** Both `PurchaseRequisition` and `VendorContract` have Prisma
  models (in `tenant_inventory`), active manifests (NOT in
  `manifests-disabled/`), and dedicated PrismaStores wired into
  `createPrismaStoreProvider`. All command routes now pass `instanceId` to
  `runtime.runCommand()`. Route inventory: requisitions has **8 command dirs**
  (create, update, submit, approve-manager, approve-finance, reject,
  convert-to-po, cancel), vendor-contracts has **10** (create, update, submit,
  approve, reject, activate, terminate, renew, update-compliance,
  record-sla-breach).
- **Fabricated routes pattern.** Multiple new-module routes bind manifests that
  exist in `manifests-disabled/` plus Prisma models that do not exist at all.
  Before trusting any module listed as "DONE", (1) open `schema.prisma` and
  confirm the models exist, (2) grep `manifests-disabled/` to confirm the
  manifest is actually active. See Blocker 2a/2b and P2.D Bank Accounts in
  `IMPLEMENTATION_PLAN.md`.
- **Payroll bank-accounts routes are fully functional.** All 6 routes (create,
  update, delete, verify, set-default, list) use Prisma ORM
  (`database.employeeBankAccount.*`) against the `EmployeeBankAccount` model in
  `tenant_staff`. RLS is enabled and enforced. The prior raw-SQL claim was
  stale.
- **`$queryRaw` template interpolation IS parameterized, but JS-composed values
  are not safe-by-assumption.** Example:
  `logistics/drivers/commands/update/route.ts:41` writes
  `vehicle_id = ${vehicleId !== undefined ? (vehicleId || null) + "::uuid" : "vehicle_id"}::uuid`
  — Prisma parameterizes the ternary's output string, so there's no classical
  injection, BUT the ternary emits nonsense values (`"<uuid>::uuid"` as a
  literal, or `"vehicle_id"` as a parameter when the author wanted a column
  ref). Always branch explicitly or use `Prisma.sql` fragments for optional
  predicates. Don't copy this pattern.
- **`planning/route-audit.md` numbers are stale (dated 2026-04-13).** It says
  163 bypass-dispatcher routes; current count is closer to ~490. The b8c31eef
  expansion landed after the audit. Re-run the scan before quoting or citing
  these figures.
- **`routes.manifest.json` only tracks POST handlers.** PUT/PATCH/DELETE are not
  in the IR — so "manifest coverage" numbers computed only from the IR
  undercount the gap. Real coverage gap: ~617 of 1,001 write handlers (61.6%),
  not the 46% previously quoted.
- **Dozens of auto-generated camelCase route duplicates exist.** Full top-level
  `ls apps/api/app/api/` shows ~60 directories with no hyphens that appear to
  pair with canonical hyphenated paths (or orphan entirely). Don't add a new
  route under a camelCase directory without first checking whether a canonical
  kebab-case equivalent exists. See "Auto-generated API duplicates" in
  IMPLEMENTATION_PLAN.md for the full list before any cleanup sweep.
- **MCP server has 165 tests, not 10.** Prior plan passes read "10 test files"
  as "10 tests". If you touch `packages/mcp-server/`, expect to run ~165 `it()`
  blocks.
