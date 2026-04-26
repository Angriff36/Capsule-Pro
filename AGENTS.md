# AGENTS.md — Operational Guide

## Build & Run

- Monorepo with pnpm (ONLY — no npm, no yarn)
- Primary folders: `apps/`, `packages/`, `specs/`

## Session Start
- Read `tasks/ledger.md` before starting work (know the scoring system, know the leaderboard)

## Validation
Run these after implementing to get immediate feedback:
- Tests (targeted): `pnpm --filter @capsule/app test [specific-test]`
- Typecheck: `pnpm tsc --noEmit`
- Lint: `pnpm biome check`
- Build: `pnpm turbo build --filter=@capsule/app`

## Manifest Commands

- Routes from IR: `pnpm manifest:routes:ir -- --format summary`
- ~~Lint routes: `pnpm manifest:lint-routes`~~ — **script does not exist** (see Known Gotchas). Use `pnpm manifest:build` and inspect diff against `packages/manifest-ir/dist/routes.manifest.json`.
- After .manifest edits: `pnpm manifest:build`
- Manifest CLI must run from the installed/published `@angriff36/manifest` package (`pnpm exec manifest ...`), not from `packages/manifest-runtime/...` source paths

## Operational Notes

- **GitHub Packages (`@angriff36`):** local dev — run once: `pnpm config set //npm.pkg.github.com/:_authToken <PAT> --location=user` (PAT with `read:packages`; same value as CI secret `PKG_AUTH_TOKEN`). Then use normal `pnpm install`. CI/Vercel inject auth via `scripts/ensure-github-packages-npmrc.sh`.
- IR is authority — filesystem is not source of truth for routes
- `@angriff36/manifest` must be consumed as the published package version (currently pinned), not `workspace:*` in `apps/*` or `packages/*`
- All mutations compile to Manifest domain commands
- New/changed API write handlers (`POST`/`PUT`/`PATCH`/`DELETE`) under `apps/api/app/api` must exist in canonical route surface (`packages/manifest-ir/dist/routes.manifest.json`) unless explicitly infrastructure-allowlisted (`webhooks`/`auth`/`cron`/`health`)
- Generated code is projection — never edit generated files
- Exactly one commit per iteration, conventional commit format

### Codebase Patterns

- Command Board UI: **currently missing** — `apps/app/app/(authenticated)/command-board/` does not exist (see Known Gotchas). Only `apps/app/app/lib/command-board/` (lib) and `apps/app/app/api/command-board/` (proxy) remain.
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

Avoid `pnpm dev` (starts everything) unless doing integration testing across all services.

## Package Boundaries

Shared packages (`packages/`) must be framework-agnostic:
- **No `next/*` imports** in shared packages — use DI or move to `apps/` or adapter packages
- **No `react-native` imports** in web apps (`apps/app`, `apps/api`)
- Allowed exceptions: `packages/next-config`, `packages/seo`, `packages/cms` (framework-specific by design)

### Known Violations (to remediate)
- `packages/design-system/lib/fonts.ts` — imports `next/font/google`
- `packages/design-system/components/ui/chart.tsx` — imports `next/dynamic`
- `packages/design-system/components/blocks/manifest-test-playground.tsx` — imports `next/link`
- `packages/design-system/components/blocks/getting-started-checklist.tsx` — imports `next/link`
- `packages/feature-flags/access.ts` — imports `next/server`
- `packages/internationalization/proxy.ts` — imports `next/server`
- `packages/analytics/provider.tsx` — imports `@next/third-parties/google` + `@vercel/analytics/react` (added 2026-04-24)

React Native boundary: clean (no violations in web apps).

## Cron Schedule Registry

Vercel runs only what's in `apps/api/vercel.json` — adding a file under `apps/api/app/api/cron/` does NOT schedule it. The endpoint directory currently has 5 routes but only 3 are scheduled:

| Route | Schedule | Scheduled? |
|-------|----------|-----------|
| `cron/webhook-retry` | `*/5 * * * *` | ✅ |
| `cron/inventory-audit` | `0 6 * * *` | ✅ |
| `sentry-fixer/process` | `0 0 * * *` | ✅ |
| `cron/contract-expiration-alerts` | — | ❌ missing |
| `cron/email-reminders` | — | ❌ missing |
| `cron/idempotency-cleanup` | — | ❌ missing |

When you add a new cron endpoint, add the matching entry to `vercel.json` in the same PR, otherwise it never runs in production.

## Test & Logging Hygiene

- **No `console.log` in production code.** Re-verified 2026-04-24: `apps/api/` has **449 `console.log` + 1,727 `console.error` + 16 `console.warn` ≈ 2,192 total** — clean up when you touch them and use `@repo/observability` / Sentry instead. Error-path logging is the biggest share; prioritize replacing `console.error` first.
- **No `.bak` / `.backup` / `.new` / `.tmp` files in the repo.** Cleaned 2026-04-26 (twenty-second pass): **16+ of 21 files removed** — all `.bak` (11), `.backup` (6), `.new` (3), `.tmp` (1) files deleted. Remaining known orphans: `packages/notifications/.../sms-temp.ts` (TODO stub, evaluate for deletion or completion). Use git instead of filename suffixes for backups.
- **No `describe.skip` or `test.todo` in committed code without a linked issue.** If a test must be skipped, open a follow-up ticket and reference it in a comment on the skip line. Current offenders: `apps/api/__tests__/sales-reporting/generate.test.ts:33`, `apps/api/__tests__/inventory/forecasting.test.ts:834-836`, `apps/api/__tests__/email-templates/templates.test.ts:1073-1077`. **E2E (third-pass re-count):** **25** `test.skip(true, …)` conditionals across **6** spec files — `integrated-payment-processor` (7), `recipe-scaling` (7), `role-aware-empty-states` (4), `illustrated-empty-states` (4), `communication-preferences` (2), `getting-started-checklist` (1). Prior note of "35 across 8 files" over-counted.

## Schema ↔ Migrations ↔ Code Drift

New migrations must include matching Prisma models in the same PR. The repo currently has several orphaned cases — treat them as tech debt and fix alongside related work:

- Migrations that create tables without Prisma models: `20260327000000_add_vendor_management`, `20260327010000_add_procurement_budgets`, `20260327020000_add_employee_bank_accounts`, `20260327040000_add_event_waitlist`, `20260327040000_add_lead_scoring`.
- Routes that use raw SQL against non-existent Prisma entities: `Driver`, `Vehicle`, `FacilityAsset`, `Equipment`, `Vendor`, `VendorContact`, `Budget`, `PurchaseRequisition`, `ProcurementApproval`, `Deal`, `RevenueRecognitionSchedule`.

Before adding a route that queries a table, check `packages/database/prisma/schema.prisma` first — if the model is missing, add it before the route.

## RLS Reminder

Tenant isolation is enforced via Postgres RLS policies on `tenant_*` schemas, but coverage is incomplete. Current critical gaps (no RLS policy):
- `tenant_accounting.*` (all tables)
- `tenant_inventory.vendor_catalogs`, `pricing_tiers`, `bulk_order_rules`, `procurement_budgets`, `vendor_contacts`
- `tenant_staff.employee_bank_accounts`

When adding a new `tenant_*`-schema table migration, include `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` + `CREATE POLICY tenant_isolation ON ...;` in the same migration.

## Important Efficiency Standards.
- Never re-read files you just wrote or edited. You know the contents.
- Never re-run commands to "verify" unless the outcome was uncertain.
- Don't echo back large blocks of code or file contents unless asked.
- Batch related edits into single operations. Don't make 5 edits when 1 handles it.
- Skip confirmations like "I'll continue..."  Lust do it.
- If a task needs 1 tool call, don't use 3. Plan before acting.
- Do not summarize what you just did unless the result is ambiguous or you need additional input.

## Known Gotchas

Operational pitfalls discovered during the 2026-04-24 post-expansion audit. Read these before blaming a tool or your environment.

- **`pnpm manifest:lint-routes` does not exist.** Prior plans referenced it, but the script is not in `package.json`. Use `pnpm manifest:build` or `pnpm manifest:routes:ir` instead.
- **Biome check may be blocked by stray merge conflicts in `.autolab/tasks.json`.** A single unresolved `<<<<<<< / ======= / >>>>>>>` block in that file causes `pnpm biome check` to report 1000+ spurious errors. Always check `git status` for a modified `.autolab/tasks.json` before trusting a lint failure.
- **New modules frequently use raw SQL against tables with no Prisma model.** Accounting, facilities, logistics, payroll, and procurement each contain routes that query tables (e.g., `facility_assets`, `drivers`, `vehicles`, `vendor_contacts`, `procurement_budgets`, `employee_bank_accounts`) via raw SQL because the Prisma model was never created. Before trusting that a module is "done", open `packages/database/prisma/schema.prisma` and confirm the model exists. A passing test or a 200 response on GET does not prove completion.
- **Duplicate `softDelete/` + `soft-delete/` route directories** — the inventory triple (`pricing-tiers`, `bulk-order-rules`, `supplier-catalogs`) was cleaned up 2026-04-26 (`supplier-catalogs/` removed entirely as a stale duplicate of `vendor-catalogs/`). Canonical choice is **`soft-delete/` (kebab-case)**; delete any new `softDelete/` sibling you encounter and update `scripts/manifest/write-route-infra-allowlist.json` if the deleted prefix was listed there.
- **Command Board UI location is currently unclear.** The old `apps/app/app/(authenticated)/command-board/` directory does not exist, yet multiple documents still reference it. Only `apps/app/app/lib/command-board/` (library code) and `apps/app/app/api/command-board/` (API proxy) remain. Treat any doc pointing at the authenticated UI path as stale until a rebuild lands.
- **13 manifests are quarantined in `packages/manifest-adapters/manifests-disabled/`.** Before authoring a new `.manifest` file for Accounting, Facilities, Procurement, Payment, Equipment, Knowledge Base, Quality Control, Rate Limit, or Payment Reconciliation domains — **check `manifests-disabled/` first**. The file may already exist, and re-integration (add the matching Prisma model, then move into `manifests/`) is usually cheaper than a new authoring pass. 4 have been promoted (shipment-rules, invoice-rules, payment-rules, revenue-recognition-rules). See `IMPLEMENTATION_PLAN.md` "Quarantined manifests" for the full list.
- **Procurement requisitions/vendor-contracts command routes will 500 on POST.** They call `createManifestRuntime()` against manifests that live in `manifests-disabled/` and reference Prisma models (`PurchaseRequisition`, `VendorContract`) that do not exist. Route inventory (third-pass 2026-04-24): requisitions has **8 command dirs** (missing `delete/`), vendor-contracts has **7** (missing `update/`) — do NOT assume the README-style "CRUD" set is complete. Confirm by reading `apps/api/app/api/procurement/requisitions/commands/create/route.ts` and grepping `schema.prisma` before any change there.
- **Fabricated routes pattern.** Multiple new-module routes bind manifests that exist in `manifests-disabled/` plus Prisma models that do not exist at all. Before trusting any module listed as "DONE", (1) open `schema.prisma` and confirm the models exist, (2) grep `manifests-disabled/` to confirm the manifest is actually active. See Blocker 2a/2b and P2.D Bank Accounts in `IMPLEMENTATION_PLAN.md`.
- **Payroll bank-accounts routes do NOT crash — they bypass Prisma.** All 5 commands use `database.$queryRaw` directly against `tenant_staff.employee_bank_accounts`. They return data but sit outside the ORM (and outside any RLS the tenant schema should enforce). Don't conclude from a 200 response that the module is sound; the missing `BankAccount` Prisma model is still tech debt.
- **`$queryRaw` template interpolation IS parameterized, but JS-composed values are not safe-by-assumption.** Example: `logistics/drivers/commands/update/route.ts:41` writes `vehicle_id = ${vehicleId !== undefined ? (vehicleId || null) + "::uuid" : "vehicle_id"}::uuid` — Prisma parameterizes the ternary's output string, so there's no classical injection, BUT the ternary emits nonsense values (`"<uuid>::uuid"` as a literal, or `"vehicle_id"` as a parameter when the author wanted a column ref). Always branch explicitly or use `Prisma.sql` fragments for optional predicates. Don't copy this pattern.
- **`planning/route-audit.md` numbers are stale (dated 2026-04-13).** It says 163 bypass-dispatcher routes; current count is closer to ~490. The b8c31eef expansion landed after the audit. Re-run the scan before quoting or citing these figures.
- **`routes.manifest.json` only tracks POST handlers.** PUT/PATCH/DELETE are not in the IR — so "manifest coverage" numbers computed only from the IR undercount the gap. Real coverage gap: ~617 of 1,001 write handlers (61.6%), not the 46% previously quoted.
- **Dozens of auto-generated camelCase route duplicates exist.** Full top-level `ls apps/api/app/api/` shows ~60 directories with no hyphens that appear to pair with canonical hyphenated paths (or orphan entirely). Don't add a new route under a camelCase directory without first checking whether a canonical kebab-case equivalent exists. See "Auto-generated API duplicates" in IMPLEMENTATION_PLAN.md for the full list before any cleanup sweep.
- **MCP server has 165 tests, not 10.** Prior plan passes read "10 test files" as "10 tests". If you touch `packages/mcp-server/`, expect to run ~165 `it()` blocks.
