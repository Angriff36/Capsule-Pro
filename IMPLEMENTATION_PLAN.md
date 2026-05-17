# Config Alignment Implementation Plan

**Status**: Active audit -- 16-domain configuration alignment review (RLS runtime audit added 2026-05-17)
**Generated**: 2026-05-16 (pass 2) -- Updated 2026-05-17 (RLS runtime audit)
**Scope**: TypeScript, Next.js, Vitest, Turbo, Vercel, Sentry, Biome, Playwright, PostCSS, package.json, ENV, CI/CD, Build, Prisma, Misc, Cross-Config, Specs
**Counts**: ~842 issues. CRITICAL: 42 (including newly-elevated **RLS runtime no-op** — see below). HIGH: ~192. MEDIUM: ~325. LOW: ~283.

## Changes from spec audit pass (2026-05-17)

Comprehensive audit of all 25+ `specs/*` directories. **11 specs marked `_TODO` are fully implemented** and were renamed to `_COMPLETE`:
- `crm-client-detail-view` — all 6 acceptance criteria MET (FinancialTab now includes Total Revenue, Avg per Event, Est. Annual, Payment Terms, Tax Status, Lifetime Value)
- `inventory-stock-levels` — full API + frontend + integrations (barcode scanner, kitchen waste, warehouse)
- `inventory-recipe-costing` — full costing engine with unit conversions, waste factors, inventory cascade, event budget propagation
- `scheduling-shift-crud` — all 6 acceptance criteria, validation layer enforces all invariants
- `crm-venue-management` — full CRUD with tests
- `event-proposal-generation` — all 6 criteria including templates, PDF export, public signing
- `event-budget-tracking` — all 6 criteria including variance reporting
- `scheduling-auto-assignment` — all 6 criteria with scoring engine, bulk assignment
- `inventory-depletion-forecasting` — full forecasting library (998 lines), batch processing, accuracy tracking
- `bulk-grouping-operations` — all 6 criteria with canvas UI
- `event-import-export` — all export criteria implemented despite unchecked marks in spec

**Bug fix:** `apps/app/app/(authenticated)/payroll/timecards/timecard-bulk-actions.tsx` was dead code (never imported by page.tsx). Rewrote to accept `selectedCount` and action callbacks as props; wired into `page.tsx` with bulk approve/reject/edit-request/flag-exceptions handlers.

**Remaining _TODO specs with real gaps:**
- `crm-client-communication-log` — 5/6, missing file attachments
- `crm-client-segmentation` — read views done, missing dedicated tag CRUD UI
- `scheduling-availability-tracking` — missing calendar view and warning/override UI
- `payroll-timecard-system` — bulk actions now functional but edit-request/flag dialogs only apply to first selected entry
- `warehouse-cycle-counting` — implementation complete but spec files empty
- `warehouse-receiving-workflow` — missing dedicated history endpoint
- `event-timeline-builder` — two systems exist, gaps in block categorization and task linking
- `event-contract-management` — missing proactive expiration alert cron
- `bulk-edit-operations` — core done, preview/undo guardrails missing

## Changes from inventory-item-management spec completion pass (2026-05-17)

Completed the inventory item management spec (`specs/inventory/inventory-item-management_TODO/`). Four missing UI fields added to align the frontend with the existing API contract:

**Frontend changes:**
- `apps/app/app/lib/use-inventory.ts`: Added `description`, `unit_of_measure`, `par_level`, `supplier_id` to `InventoryItem`, `CreateInventoryItemRequest`, and `UpdateInventoryItemRequest` interfaces. Added `UNITS_OF_MEASURE` constant (20 units), `getUnitLabel()` helper, `Supplier` type, and `listSuppliers()` API function. Added `supplierId` parameter to `listInventoryItems()`.
- `apps/app/app/(authenticated)/inventory/items/components/create-inventory-item-modal.tsx`: Added form fields for description (text input), unit_of_measure (select with 20 units), par_level (number input), and supplier_id (select dropdown populated from `/api/inventory/suppliers/list`). Grid changed from 3-col to 4-col for cost/qty/par/reorder.
- `apps/app/app/(authenticated)/inventory/items/inventory-items-page-client.tsx`: Added supplier filter dropdown, moved text search from client-side filtering to server-side API `search` parameter (searches across all items, not just the current page). Pagination resets to page 1 on filter changes.

**Stale finding resolved:**
- `[ENV] packages/mcp-server has no keys.ts at all.` marked RESOLVED-STALE — `packages/mcp-server/src/keys.ts` already exists with full zod envSchema validation for all 10 env vars.

**Spec verification results:**
- CRM Client Detail View: 5/6 acceptance criteria MET, 1 PARTIALLY MET (missing payment history details). Nearly complete.
- Inventory Item Management: Previously 4 fields missing from UI + no supplier filter + client-side-only search. Now all addressed. Spec is substantially complete.

## Changes from package-exports + build-externals pass (2026-05-17)

Continuation of the package-exports hygiene work. 17 packages received exports maps + tsup externals fix for @repo/ai + CJS/ESM fix for @repo/realtime. Two stale findings confirmed and closed.

**17 packages with new exports maps:**
- `packages/auth` — main/types/exports with 8 subpaths (keys, server, client, proxy, provider, components/sign-in, components/sign-up)
- `packages/analytics` — main/types/exports with 7 subpaths (keys, server, provider, posthog-provider, instrumentation-client, error-tracking)
- `packages/feature-flags` — main/types/exports with 5 subpaths (keys, access, components/toolbar, lib/toolbar)
- `packages/cms` — main/types/exports with 8 subpaths (keys, next-config, components/body, feed, toc, toolbar)
- `packages/collaboration` — main/types/exports with 6 subpaths (keys, auth, config, hooks, room)
- `packages/design-system` — main/types only (points to index.tsx). No restrictive exports map — design-system has dozens of deep subpath imports resolved via TypeScript paths in its own tsconfig; adding exports would break those consumers.
- `packages/email` — main/types/exports with 3 subpaths (keys, templates/*)
- `packages/next-config` — main/types/exports with 3 subpaths (keys, ai)
- `packages/internationalization` — main/types/exports with 2 subpaths (proxy)
- `packages/payments` — main/types/exports with 2 subpaths (keys)
- `packages/rate-limit` — main/types/exports with 2 subpaths (keys)
- `packages/security` — main/types/exports with 3 subpaths (keys, proxy)
- `packages/webhooks` — main/types/exports with 2 subpaths (keys)
- `packages/seo` — exports with 3 subpaths (metadata, json-ld). No main/types (no index.ts).
- `packages/payroll-engine` — exports map added (already had main/types)
- `packages/observability` — exports with 11 subpaths (client, correlation, edge, error, instrumentation, keys, log, next-config, server, status, tracing). No main/types (no barrel index.ts).
- `packages/mcp-server` — main/types/exports pointing to dist/ (has a build step via tsc).

**@repo/ai tsup externals fix:** `packages/ai/tsup.config.ts` — added ai, @ai-sdk/openai, @t3-oss/env-nextjs, uuid, zod, streamdown, tailwind-merge to external array. dist/index.js shrank to 42 KB (from bundling hundreds of KB of AI SDK). Same pattern as the sentry-integration fix.

**@repo/realtime CJS/ESM fix:** `packages/realtime/package.json` — removed spurious "require" condition from exports. Package is ESM-only (builds with tsc), so the require condition was misleading.

**Stale items confirmed:** `[PKG-NEW] 6 phantom runtime deps` — all already removed in prior work. `[PKG] 13 packages have react in dependencies instead of peerDependencies` — all already in peerDependencies.

## Changes from package-exports hygiene pass (2026-05-17)

Three packages received exports maps in the initial batch (notifications, storage, types). See section above for the full 17-package continuation.

- `packages/notifications/package.json` — added main/types/exports pointing at `./index.ts`. 3 subpaths (keys, components/provider, components/trigger).
- `packages/storage/package.json` — added main/types/exports pointing at `./index.ts`. `./keys` subpath for symmetry.
- `packages/types/package.json` — added exports map with `.` and `./manifest-editor`. Deleted redundant root shim `packages/types/manifest-editor.ts`.

Verification: `pnpm --filter api typecheck` clean; `pnpm --filter app typecheck` clean; `pnpm --filter @repo/notifications test` 57/57 pass.

## Changes from sentry-integration build hygiene pass (2026-05-17)

Five HIGH/MEDIUM items in `packages/sentry-integration/` resolved as one cohesive package-config fix (two were stale, three were real):

- **Real fixes:**
  - Created `packages/sentry-integration/tsup.config.ts` consolidating the 9-entry build (was 9 paths inlined twice across `build` and `dev` scripts). `package.json` `build`/`dev` simplified to `tsup` / `tsup --watch`.
  - `package.json` `exports.*.types` changed from `./src/*.ts` → `./dist/*.d.ts` (was breaking type resolution for downstream consumers — TS would pick up uncompiled source instead of declarations). All 9 subpath exports updated.
  - tsup config externalizes `@repo/database`, `@repo/observability`, `@ai-sdk/openai`, `@slack/web-api`, `@t3-oss/env-nextjs`, `ai`, `zod` (was bundling everything — `slack.js` shrank from ~30KB to 162 bytes; `runner.js` 219 bytes; the heavy deps now resolve at consumer side). Resolves the long-standing **[BUILD] @repo/sentry-integration bundles ALL runtime deps (no --external)** finding.
- **Stale (no code change, just plan correction):**
  - `tsconfig.json` now extends `@repo/typescript-config/bundler-library.json` and was already sitting modified-but-uncommitted in the working tree from a prior session (matching the zod/TS/@types/node upgrade pass) — bundled into this commit. The **[CROSS-NEW] diverged tsconfig** finding was correctly identified previously; just not landed.
  - `keys.ts` adds `skipValidation: !!process.env.SKIP_ENV_VALIDATION` (line 9) — also sitting uncommitted from a prior session, matching the 16-other-packages pattern. Bundled into this commit. The **[SENTRY] keys.ts missing skipValidation** finding was correctly identified previously; just not landed.

Why this matters: the **types-point-to-.ts** issue was the highest-risk of the three. When a consumer imports `@repo/sentry-integration/keys` from a downstream package that strips `node_modules` source files (e.g. published packages, certain Vercel build modes), the resolver would 404 on `./src/keys.ts` because it isn't shipped. Pointing at `./dist/keys.d.ts` is the spec-compliant pattern (matches `@repo/ai`, the only other tsup-built shared package). The externals fix removes ~30KB of bundled `@slack/web-api` from every consumer that imports `slack`, and prevents version drift (e.g. if `apps/api` updates `@slack/web-api` but sentry-integration's bundled copy doesn't get rebuilt).

Verification: `pnpm --filter @repo/sentry-integration typecheck` clean; `pnpm --filter @repo/sentry-integration build` produces 9 entry .js + 9 .d.ts files in dist/; `pnpm --filter api typecheck` clean (3 consumers in apps/api still resolve correctly through new export paths).

## Changes from RLS runtime audit pass (2026-05-17)

**CRITICAL DISCOVERY — existing RLS infrastructure is a runtime no-op.** A definitive audit of all 202 tenant-scoped Prisma models found that 83 have RLS policies in migrations and 119 do not. Counts in prior passes (`~92 unprotected`, `178 tenant-scoped`, `~86 with RLS`) were slightly under-counted. Per-schema gap below.

**Why it matters (the bigger problem):** the policies that DO exist are not enforced at runtime, so adding more policies in the same pattern is security theater. Two independent breakages stack:

1. **`auth.jwt()` is a hardcoded zero-UUID stub.** `packages/database/prisma/migrations/0_init/migration.sql:35-40` defines `CREATE FUNCTION auth.jwt() RETURNS json AS $$ SELECT '{"tenant_id": "00000000-..."}'::json $$`. Every policy that references `auth.jwt() ->> 'tenant_id'` resolves to the zero UUID for every connection — there is no Supabase, and no Prisma middleware sets `request.jwt.claims` per request. If RLS were enforced, every policy-protected SELECT from the app would return zero rows.
2. **App connects as `neondb_owner` which has `BYPASSRLS`.** All env files (`.env:12`, `apps/app/.env.local:10`, `packages/database/.env:1`) use the Neon database owner role. Neon's default owner has `BYPASSRLS`, so policies are not evaluated for the app's queries at all. Tests pass because RLS is bypassed, not because policies match.

**Therefore the existing 83 RLS-protected tables provide ZERO runtime tenant isolation today.** All actual isolation comes from JS-side `tenantId` filters in route handlers (`requireApiManager()` / `requireTenantId()` → Prisma `where: { tenantId }`). The RLS policies are dormant defense-in-depth that will activate only if both runtime gaps are fixed.

**Decision:** further RLS coverage work (the 119-table gap) is BLOCKED on runtime wiring. Adding more no-op policies wastes effort and falsifies the security posture. The runtime fix needs: (a) a real non-`BYPASSRLS` app role, OR (b) a redefinition of `auth.jwt()` that reads from a per-request session GUC the app sets via Prisma middleware, AND (c) a route-level mechanism (likely Prisma `$extends` or `$use`) that calls `SET LOCAL request.jwt.claims = ...` at the start of every query/transaction. None of these are config drift — they are feature work.

**Documentation cleanup applied this pass:**
- `packages/database/README.md`: corrected `relationMode = "foreignKeys"` claim (actual is `"prisma"`), updated FK count (108 → 137, per migration `20260129120000_add_foreign_keys`), and replaced the "NO RLS - Clerk handles auth" claim with the accurate dual-state ("policies exist in migrations but are bypassed at runtime by the owner role + stub auth.jwt()"). The README was leading agents to either redundantly re-state "we don't use RLS" or to confidently add RLS without realizing it's dormant.
- IMPLEMENTATION_PLAN.md: corrected per-schema RLS counts, marked stale `tenant_accounting.* zero RLS` and `tenant_logistics.prisma uncommitted` items as RESOLVED-STALE, and documented the phantom RLS entries with file:line precision.

**Per-schema RLS coverage (current as of 2026-05-17):**

| Schema | Models | With RLS | Without RLS |
|---|---:|---:|---:|
| tenant_accounting | 10 | 10 | 0 |
| tenant_admin | 37 | 7 | 30 |
| tenant_crm | 9 | 6 | 3 |
| tenant_events | 26 | 7 | 19 |
| tenant_facilities | 5 | 5 | 0 |
| tenant_inventory | 32 | 17 | 15 |
| tenant_kitchen | 37 | 11 | 26 |
| tenant_logistics | 4 | 4 | 0 |
| tenant_staff | 42 | 16 | 26 |
| **Total** | **202** | **83** | **119** |

**Phantom RLS entries (RLS attached to tables with no Prisma model):**
- `tenant_admin.audit_log` — orphan table (created by both `20260327030000_add_audit_log` and `20260327100000_add_audit_log` — duplicate creation migrations). RLS in `20260427000000_add_rls_post_expansion_tables/migration.sql:280`. Prisma's `audit_log` model is in schema `platform`, not `tenant_admin`. The actual `platform.audit_log` (Prisma model at `schema.prisma:2946`, created by `0_init/migration.sql:1409`) has nullable `tenant_id` and **no RLS at all** — a naive `tenant_id = jwt.tenant_id` policy would hide every platform-level NULL row, so it needs a two-arm `(tenant_id IS NULL OR tenant_id = jwt)` policy.
- `tenant_inventory.vendor_catalog` (singular) — orphan table created by `20260308171626_repair_drift/migration.sql:136`, never dropped. RLS still applied as dead SQL at `20260429140000_add_rls_missing_tables/migration.sql:519-567`. The canonical plural `vendor_catalogs` (the table backing the `VendorCatalog` Prisma model) is correctly handled by `20260511000000_fix_vendor_catalogs_rls_table_name/migration.sql`. The orphan singular table should be dropped in a future cleanup migration after confirming row count is zero.

## Changes from biome+design-system+output-tracing+prisma7-routes pass (2026-05-17)

Five CRITICAL/HIGH items resolved + one promoted Biome rule + 12 latent typecheck errors fixed:

- packages/design-system/package.json: removed phantom `server-only` dep (zero source imports). Also loosened `peerDependencies` to `next: ">=15.5.0"` and `react: ">=19.0.0"` (was pinned to 15.4.11 / 19.2.4 which conflicted with the 15.5.18 CVE-patch override).
- biome.jsonc + biome.autofix.jsonc: promoted `correctness.noUnusedImports` from warn→error after verifying 0 existing violations across the repo. First of 21 downgraded-to-warn rules to be elevated back. Remaining rules (useBlockStatements 1820, noNestedTernary 317, noNonNullAssertion 276, etc.) need bulk auto-fix campaigns before promotion.
- IMPLEMENTATION_PLAN.md: marked **[NEXT] apps/api outputFileTracingIncludes verify completeness** as RESOLVED — the static `import commandsRegistry from "…commands.registry.json"` is bundled by Next.js (no tracing needed), and dynamic `readFileSync` of `kitchen.ir.json` + `.manifest` files is covered by the existing wildcards. Current config is complete.
- IMPLEMENTATION_PLAN.md: marked **[PRISMA] Migration 20260516120000_cleanup untracked** as RESOLVED-STALE — `migration.sql` is tracked in git via `git ls-files` (committed previously).
- Latent typecheck errors surfaced by Prisma 7 client regeneration + Next.js 15 stricter route-handler types:
  - **Prisma 7 `findUnique` composite keys (5 routes)**: `apps/api/app/api/command-board/{boards,cards,connections,groups,layouts}/[id]/route.ts` — switched `findUnique({where:{id,tenantId,deletedAt:null}})` to `findFirst(...)` (these models have `@@id([tenantId, id])` composite primary keys; `findUnique` in Prisma 7 requires the explicit `tenantId_id` composite-key shape, but `findFirst` accepts the loose filter form and matches the same row).
  - **Next.js 15 RouteHandlerConfig param-name mismatches (5 routes)**: `inventory/cycle-count/sessions/[id]/{finalize,records,variance-reports}/route.ts`, `kitchen/recipes/[id]/cost/route.ts`, `staff/shifts/[id]/assignment-suggestions/route.ts` — handlers declared `params: Promise<{ sessionId/shiftId/recipeVersionId: string }>` but the directory is `[id]`, so Next.js 15's strict `RouteHandlerConfig<Route>` inferred `{ id: string }` and rejected the mismatch. Renamed the type to `{ id: string }` and destructured with `const { id: sessionId } = await params;` to preserve the original variable names in the bodies. Also updated `assignment-suggestions/route.test.ts` (9 call sites) to pass `{ id: mockShiftId }` instead of `{ shiftId: mockShiftId }`.
  - **POST return type `Response | null` violates Next.js 15 RouteHandlerConfig (2 routes)**: `staff/shifts/commands/{create,update}-validated/route.ts` — `validateShift(...)` returns `error: NextResponse | null`, and the handlers did `return validation.error`, which made the POST return type `Response | null`. Next.js 15's RouteHandlerConfig requires `Response | void`, so changed to `return validation.error ?? manifestErrorResponse("Validation failed", 400)` (safe fallback that retains the existing semantic — if validation.valid is false, error should be non-null, but the type system can't prove it).

## Changes from Sentry shared-config fix pass (2026-05-17)

Batch H Sentry/observability cleanup — 13 items resolved (12 stale or already-fixed, 4 real code changes):

Code changes:
- packages/observability/client.ts: added normalizeDepth: 10 and beforeSendTransaction (drops /_next, /favicon, /monitoring noise transactions).
- packages/observability/server.ts: added DSN guard (early return when NEXT_PUBLIC_SENTRY_DSN missing) + tracePropagationTargets (matches client.ts and edge.ts).
- packages/observability/edge.ts: added tracePropagationTargets (matches client.ts and server.ts). All three runtimes now propagate trace context to localhost, relative URLs, vercel.app subdomains, capsule.pro subdomains.
- packages/observability/correlation.ts: replaced `import { randomUUID } from "node:crypto"` with `globalThis.crypto.randomUUID()`. Module now works in Node.js, Edge Runtime, and browser without changes.
- apps/api/instrumentation-client.ts: added `export const onRouterTransitionStart = captureRouterTransitionStart` so client-side navigation produces Sentry spans (apps/app already had this).

Verified stale (no code change needed; plan updated):
- apps/app/sentry.edge.config.ts "complete fork" — actually a 9-line delegator to shared @repo/observability/edge.
- vercelAIIntegration "only in edge" — present in both server.ts and edge.ts.
- vercelAIIntegration "invalid recordInputs/recordOutputs" — misattributed; those options live in mcp-server wrapMcpServerWithSentry where they're valid.
- "shared client missing tracePropagationTargets" — client.ts had them; gap was actually server.ts and edge.ts (now fixed).
- "next-config.ts calls keys() at module scope" — already uses lazy _env + getEnv() pattern.
- "apps/app/instrumentation.ts direct imports" — uses @repo/observability/instrumentation; only captureRequestError comes directly from @sentry/nextjs (correct Next.js pattern).

## Changes from OutboxEvent fix pass (2026-05-16)

- OutboxEvent model: fixed non-functional Prisma model (tenantId String -> @db.Uuid + @map("tenant_id"), added @map() on all columns, added updatedAt, upgraded timestamp precision to @db.Timestamptz(6)). Updated raw SQL in apps/api/app/outbox/publish/route.ts. Migration: 20260516130000_fix_outbox_event_columns.
- Restored missing scripts/require-shadow-database-url-for-migrate-dev.mjs.

## Changes from deploy hardening pass (2026-05-16)

deploy.yml supply chain risk resolved + stale items cleaned:
- deploy.yml: replaced unmaintained amondnet/vercel-action@v25 with direct Vercel CLI (npm install -g vercel + vercel deploy --prod). Eliminates third-party action supply chain vector across all 4 deploy targets (App, API, Web, Docs).
- deploy.yml: fixed notify-failing-dependabot to use github.token instead of PKG_AUTH_TOKEN for gh pr list (least-privilege).
- Marked stale items resolved: ignoreBuildErrors already false in apps/api and apps/web; sentry-fixer dev mode bypass already removed from code; secretlint already running in security.yml via `secrets:scan` script.

## Changes from security hardening pass 2 (2026-05-16)

- API key requests now rate-limited: proxy.ts sets x-api-key-id from key prefix before global rate limit. global-rate-limit.ts adds API key ID + IP fallback to extractTenantKey().
- Keep-alive cron moved from /cron/ to canonical /api/cron/ with standard x-vercel-cron + Bearer auth. Scheduled in vercel.json (*/5 min). Tests updated.
- CSP `unsafe-eval` removed from production (only needed for dev HMR). `unsafe-inline` remains required by Clerk/PostHog/GTM.
- performance.yml: added "Start app server" step with health check before Lighthouse scan.
- logging-sync.yml: node-version standardized to .nvmrc.

## Changes from CI hardening pass (2026-05-16)

CI workflow hardening + security fix:
- logging-sync.yml: added npmrc script, concurrency group, packages:read, NPM_TOKEN
- manifest-ci.yml: added concurrency group, timeout-minutes to all 5 jobs, replaced manual pnpm cache with cache:"pnpm" (~80 lines removed), added retention-days:7
- codeql.yml + vercel-compat.yml: added timeout-minutes
- Rate limiting: changed from fail-open to fail-closed default (Redis errors return 429)
- apps/app: added 4 missing transpilePackages (@repo/email, @repo/storage, @repo/types, @repo/next-config)

## Changes from security fix pass (2026-05-16)

Batch C security hardening — 4 HIGH/MEDIUM findings resolved:

- sentry-fixer GET handler now requires authentication (same as POST). Previously returned config status (enabled, secured, GitHub/OpenAI/Slack configured, rate limits) to anyone without auth.
- Added Content-Security-Policy header to apps/api: `default-src 'none'; frame-ancestors 'none'; base-uri 'none'`. API had security headers (X-Frame-Options, HSTS, etc.) but zero CSP.
- Fixed CORS credentials leak: `corsHeaders()` in `apps/api/app/lib/cors.ts` previously fell back to first allowed origin with `Access-Control-Allow-Credentials: true` for non-allowed origins. Now omits both headers when origin is not in the allowlist. Deduplicated Ably auth route's inline CORS to use the shared utility.
- supplier-catalog GET handler now requires `Authorization: Bearer <CRON_SECRET>`. Previously returned connector registry metadata (IDs, names, stub flags) and supported event types without any auth.

## Changes from pass 13 (2026-05-16)

12 domain-specific audit agents deep-checked all configs against latest official documentation. ~97 new findings.

### Fixes Applied (automated pass 14)

- deploy.yml: removed continue-on-error:true from tests step (tests now gate deployment)
- deploy.yml + ci.yml: added timeout-minutes to all jobs (check-dependabot: 5m, deploy-app-api-web: 30m, deploy-docs: 15m, notify-failing-dependabot: 5m, ci test: 30m)
- deploy.yml: changed PKG_AUTH_TOKEN to github.token for gh pr list (least-privilege)
- codeql.yml: removed Python from language matrix (zero Python code in repo, wasted runner time)
- security.yml: added security-events:write permission for SARIF upload
- security.yml: updated CodeQL actions from @v3 to @v4
- Vitest: aligned all packages to ^4.0.18 (notifications ^3→^4, sales-reporting ^2→^4, manifest-runtime/cli latest→^4 + pinned @types/node and typescript)
- biome.autofix.jsonc: synced 3 missing ignore patterns from biome.jsonc (.tmp, test-output, eslint.config.mjs)
- TS base.json: added noUncheckedSideEffectImports:true (TS 5.9 option)
- manifest-runtime/packages/cli: pinned floating deps (@types/node latest→25.2.0, typescript ^5.5.3→^5.9.3)

### Fixes Applied (automated pass 14 - continued)

- .husky/pre-push: replaced exit 0 with typecheck via pnpm check
- security.yml: removed continue-on-error from pnpm audit, pinned trivy-action to 0.30.0
- vitest: removed environmentMatchGlobs (REMOVED in Vitest 4), added @vitest-environment node pragmas to 11 test files
- vitest: changed root workspace default environment from jsdom to node (prevents jsdom leak to server packages)
- vitest: removed 7 console.log debug statements from apps/app and apps/api vitest configs
- biome: enabled useSortedClasses from nursery (was disabled by nursery:off)
- biome: added vcs.defaultBranch: "main" for --changed workflow support
- biome: added css.parser.tailwindDirectives:true for Tailwind CSS support

## Changes from CI e2e fix pass (2026-05-16)

CRITICAL fix: CI e2e-workflows job had NO app server startup step. Playwright tests were running against nothing.

### Fixes Applied

- Added "Build apps for E2E testing" step that builds both apps/app and apps/api with full env vars (matching the test job's build step pattern)
- Added "Start API server" step that starts the API on port 2223 in the background with a health check loop
- Added "Install Playwright browsers" step to install Chromium
- Fixed NEXT_PUBLIC_API_URL from "http://localhost:2221" to "http://localhost:2223" (was pointing to wrong port -- the app port instead of API port)
- Added PORT: "2221" to the E2E test step env to ensure the app starts on the correct port

## Changes from cron-auth fix pass (2026-05-16)

Systemic cron authentication fix. ALL 8 scheduled crons were non-functional due to:
1. Clerk middleware blocking /api/cron/* routes (not in isPublicRoute)
2. POST-only routes not handling Vercel's GET requests
3. Auth checks requiring Authorization: Bearer header (Vercel doesn't send it)

### Fixes Applied

- Added `/api/cron(.*)` to `isPublicRoute` in `apps/api/proxy.ts` — unblocks ALL cron routes at Clerk level
- Added `x-vercel-cron: 1` header auth to all 6 cron routes (webhook-retry, inventory-audit, idempotency-cleanup, integration-auto-sync, contract-expiration-alerts, email-reminders)
- Fixed inventory-audit: was checking `x-vercel-cron-secret` (wrong header), now checks `x-vercel-cron: 1` (correct Vercel header)
- Added GET handlers to contract-expiration-alerts, email-reminders, outbox/publish (Vercel sends GET)
- Fixed Stripe payments webhook: returns 503 (not 200) when STRIPE_WEBHOOK_SECRET missing
- Fixed packages/ai: process.env.API_KEY → process.env.OPENAI_API_KEY (dead code, was never consumed at runtime)

### Remaining Cron Auth Concerns

- sentry-fixer dev mode bypass (NODE_ENV==="development" returns authorized:true) — **RESOLVED: dev mode bypass already removed from code.**
- sentry-fixer GET endpoint leaks config status without auth — not addressed
- keep-alive uses non-standard x-cron-secret — not addressed
- x-vercel-cron header is spoofable (not cryptographically verified) — acceptable for now, matches sentry-fixer pattern

### CRITICAL / HIGH NEW FINDINGS

- **[NEW-P13] Missing verbatimModuleSyntax**: TS 5.9 recommends true repo-wide. Zero configs set it. Type-only imports silently dropped.
- **[NEW-P13] Missing noUncheckedSideEffectImports**: New TS 5.9 compiler option. Not set anywhere.
- **[NEW-P13] packages/manifest-ir missing tsconfig**: Not in root references, no tsconfig file.
- **[NEW-P13] serverActions placement**: Next 15.5.18 rejects top-level `serverActions`; bodySizeLimit must remain under `experimental.serverActions`.
- **[NEW-P13] 6 phantom runtime deps**: @repo/auth (next-themes), @repo/observability (react, server-only), @repo/feature-flags (@repo/design-system, react), @repo/ai (streamdown), @repo/seo (react), @repo/payroll-engine (server-only). **RESOLVED: all 6 phantom deps already removed from package.json in prior work. Finding was stale.**
- **[NEW-P13] 2 phantom workspace deps**: @repo/collaboration imports @repo/design-system unlisted. @repo/manifest-adapters imports @repo/database unlisted.
- **[NEW-P13] ABLY_API_KEY unvalidated**: Server secret via bare process.env in 2 auth routes.
- **[NEW-P13] MCP server zero env validation**: 5 credential vars via bare process.env. No keys.ts exists.
- **[NEW-P13] storage/upload.ts bypasses own keys.ts**: BLOB_READ_WRITE_TOKEN via bare process.env.
- **[NEW-P13] command-board + manifest-adapters OPENAI_API_KEY bypass**: Bare process.env instead of validated keys.
- **[NEW-P13] 8 Better Stack vars unvalidated**: observability reads SOURCE_TOKEN, INGESTING_URL, LOGTAIL_* + NEXT_PUBLIC variants bare.
- **[NEW-P13] API app NO Content-Security-Policy**: apps/api has security headers but zero CSP.
- **[NEW-P13] Payments webhook silent drop**: STRIPE_WEBHOOK_SECRET missing → 200. Stripe never retries.
- **[NEW-P13] Rate limiting fails open**: Redis errors → all traffic allowed.
- **[NEW-P13] CORS fallback leaks credentials header**: Untrusted origins get Allow-Credentials: true.

### KEY CORRECTIONS TO PASS 12

- @@unique count: 18 exact duplications (not ~169). 169 is @@id definitions total.
- fumadocs version skew: fumadocs-mdx should be ^15.x to match core/ui ^15.x.
- Prisma generator uses modern `prisma-client` provider (confirmed correct).

## Changes from config cleanup pass (2026-05-16)

Quick-win CRITICAL fixes applied:
- Root package.json: renamed from "next-forge" to "capsule-pro", added private:true, removed bin/files/version template leftovers
- Dead vitest configs: deleted apps/api/vitest.config.ts and vitest.config.ts.bak2 (only .mts configs are active)
- Hardcoded Windows paths: removed 4 absolute C:\Projects paths from vitest-database-mock plugin in vitest.config.mts
- CSP double-definition: removed CSP from root vercel.json (apps/app/next.config.ts is sole authority)
- Stale webhook-retry: deleted orphan app/cron/webhook-retry/route.ts (canonical path is app/api/cron/webhook-retry/)

## Changes from vitest+next-config fix pass (2026-05-16)

- packages/next-config: added poweredByHeader:false and reactStrictMode:true (all apps inherit)
- Vitest: added restoreMocks:true to root config + all 13 individual project configs (test isolation fix)
- Vitest: standardized globals:true across all configs (was in 4, now in all 14)
- apps/app/vitest.config.mts: removed 6 hardcoded Windows absolute paths (C:\Projects\capsule-pro\...) from resolveId hook
- Root vitest workspace: added manifest-adapters, manifest-runtime, notifications projects (enables running their tests from root)
- apps/docs: added poweredByHeader:false + 5 security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, HSTS)
- apps/storybook: added poweredByHeader:false
- Marked 4 stale plan items as RESOLVED (apps/web transpilePackages, CSP headers, security headers, docs/storybook shared config)
- .github/CODEOWNERS: replaced @your-username placeholders with @Angriff36, fixed syntax errors
- .github/dependabot.yml: created Dependabot config (weekly npm + GitHub Actions, semver-major ignores)
- apps/api/vitest.config.integration.mts: removed invalid optimizeDeps.disable (removed in Vite 6, repo on Vite 7)
- Verified apps/app setupFiles not needed (no jest-dom matcher usage, all 271 tests pass)
- packages/event-parser: renamed type-check script to typecheck (matches turbo task name)
- turbo.json: added lint task with dependsOn: [^build]
- turbo.json: added dependsOn: [^build] to generate task
- turbo.json: added remoteCache.signature:true for cache integrity
- turbo.json: added **/tsconfig*.json to globalDependencies (tsconfig changes invalidate caches)
- turbo.json: moved SENTRY_ENVIRONMENT, VERCEL, VERCEL_ENV, SKIP_ENV_VALIDATION from globalPassThroughEnv to globalEnv (correct cache invalidation)
- apps/api: added 7 missing @repo packages to transpilePackages (design-system, email, notifications, payments, rate-limit, realtime, sentry-integration)
- Shared next-config: added Cross-Origin-Opener-Policy and Cross-Origin-Resource-Policy headers (Spectre-mitigation)
- apps/api: added COOP/CORP headers to local headers override
- deploy.yml: added cache: 'pnpm' to setup-node steps (both deploy jobs)
- ci.yml: added concurrency group (ci-${{ github.ref }}, cancel-in-progress: true)
- security.yml: added concurrency group, timeout-minutes: 15, cache: 'pnpm'
- performance.yml: added concurrency group, timeout-minutes: 15, cache: 'pnpm' (both jobs)

## Changes from automation pass (2026-05-16)

- Removed ghost apps/studio reference from root tsconfig.json (line 13 was `{ "path": "./apps/studio" }` - directory confirmed non-existent)
- Corrected serverActions placement in apps/app/next.config.ts: Next 15.5.18 still expects `experimental.serverActions`; top-level `serverActions` triggers invalid-config warnings.
- Fixed apps/api/package.json build script: replaced bash-only `export $(grep ...)` with cross-platform `dotenv -e ... -- next build` (dotenv-cli already installed)
- CORRECTION: serverExternalPackages "ably dropped" finding is stale - both apps manually include "ably". Downgrade from CRITICAL to HIGH (fragile pattern, not runtime bug)
- apps/forecasting-service has no package.json or tsconfig.json - cannot add to root tsconfig references safely. Marked as blocked pending project setup.
- packages/manifest-ir has no package.json or tsconfig.json - it's a data-only package with IR JSON files consumed by other packages. tsconfig not applicable.
- Pre-existing: 1801 API test failures across 64 test files (domain-specific handler tests). Not related to config fixes.

## Changes from pass 12 (2026-05-16)

20 domain-specific audit agents deep-checked all configs against latest official documentation.

### CRITICAL / HIGH NEW FINDINGS

- **[NEW-P12] Clerk middleware blocks ALL cron routes**: `/api/cron/*` routes NOT in `isPublicRoute`. Clerk 401s every cron before handler auth runs. ALL crons non-functional, not just POST-only ones.
- **[NEW-P12] Ghost apps/studio reference**: root tsconfig.json references non-existent `apps/studio`. tsc --build fails.
- **[NEW-P12] Missing apps/forecasting-service**: exists on disk but not in root tsconfig references.
- **[NEW-P12] Next.js 15.4.11 CVE exposure**: 13 security patches in 15.5.18+. Repo vulnerable.
- **[NEW-P12] event-parser silent exclusion**: `type-check` script name doesn't match turbo `typecheck` task.
- **[NEW-P12] sentry-fixer NODE_ENV bypass**: `if (NODE_ENV === "development") return authorized:true` in production route.
- **[NEW-P12] sentry-fixer GET info leak**: unauthenticated GET exposes secret config status, rate limits, test commands.
- **[NEW-P12] Missing COOP/COEP/CORP headers**: all apps lack Spectre-mitigation headers.
- **[NEW-P12] security.yml missing permissions**: `security-events: write` not declared, SARIF uploads may fail.
- **[NEW-P12] codeql.yml scans Python**: no Python code in repo, wastes runner time.

### KEY CORRECTIONS TO PASS 11

- streamdown/tailwind-merge in @repo/ai: NOT dead deps -- actively used in components.
- Redundant @@unique count: 18 (not ~169 as stated).
- .husky/pre-commit: ACTIVE and well-structured (not broken).
- pnpm-lock.yaml: NOT missing from globalDependencies (auto-included by Turborepo).

## Changes from pass 11 (2026-05-16)

16 agents deep-dived all config domains. 240 new findings across 16 domains.

### CRITICAL / HIGH NEW FINDINGS

- **[NEW-P11] serverExternalPackages DROP bug**: shared config's `["ably"]` silently dropped when apps override (replace, not merge). Both apps/app and apps/api omit ably.
- **[NEW-P11] CI supply chain risk**: deploy.yml uses unmaintained amondnet/vercel-action@v25. **RESOLVED: replaced with direct Vercel CLI.**
- **[NEW-P11] logging-sync.yml**: runs `pnpm install` WITHOUT `scripts/ensure-github-packages-npmrc.sh` -- fails on @angriff36 packages.
- **[NEW-P11] e2e-workflows NO app server**: ci.yml e2e-workflows has no app server startup step at all (worse than "missing build").
- **[NEW-P11] Spoofable x-vercel-cron**: webhook-retry and sentry-fixer/process routes accept x-vercel-cron header with NO auth middleware and NO Clerk. External attacker invokes at will. sentry-fixer additionally runs AI agents, reads source, posts to Slack.
- **[NEW-P11] API_KEY vs OPENAI_API_KEY**: packages/ai reads process.env.API_KEY. Validated key in keys.ts NEVER consumed at runtime. (Escalated from P10.)
- **[NEW-P11] OAuth redirect URI undefined**: calendar/sync/connect uses bare process.env OAUTH_REDIRECT_URI. If unset, produces "undefined/api/calendar/sync/callback/...".
- **[NEW-P11] OAuth secrets unvalidated**: GOOGLE_CLIENT_SECRET and MICROSOFT_CLIENT_SECRET via bare process.env.
- **[NEW-P11] Sentry fixer env bypass**: sentry-fixer routes re-read ALL vars via bare process.env with inline defaults, bypassing validated env. Validation is cosmetic.
- **[NEW-P11] SENTRY_FIXER_MAX_EXECUTION_MS mismatch**: 50s inline default in cron route vs 240s in keys.ts. Cron runs on 50s budget.
- **[NEW-P11] Vitest/@types/node pinned to "latest"**: manifest-runtime/packages/cli has floating pins (non-deterministic CI).
- **[NEW-P11] @sentry/nextjs in shared packages**: observability AND manifest-adapters (boundary violation). manifest-adapters now has 5 dynamic imports (was 3).
- **[NEW-P11] Windows build failure**: apps/api build script uses bash-only `export $(grep ...)` syntax.
- **[NEW-P11] manifest-runtime published without React**: private:false with react as hard dep. Should be peerDep.
- **[NEW-P11] 4 cron routes POST-only but Vercel sends GET**: contract-expiration-alerts, email-reminders, sentry-fixer/process, outbox/publish.
- **[NEW-P11] OutboxEvent model non-functional**: tenantId is String not @db.Uuid, missing @map("tenant_id"), missing @db.Timestamptz(6) on timestamps.
- **[NEW-P11] prisma.config.ts lacks directUrl**: production db:deploy uses pooled connection through PgBouncer, risks advisory lock failures.

### KEY CORRECTIONS TO PASS 10

- Cron auth failure count: ALL crons confirmed spoofable (not just auth-header wrong).
- Sentry boundary violations: manifest-adapters now 5 imports (was 3).
- sentry-integration most outdated: confirmed zod v3, TS ^5.3, @types/node ^20, PLUS diverged tsconfig not extending shared.
- packages/ai dead deps: tailwind-merge confirmed in addition to streamdown.
- @logtail/next boundary violation in observability (should be @logtail/node).
- server-only in observability will throw in non-Next.js contexts.

### PREVIOUS PASSES (historical)

Passes 2-10 findings archived in `docs/audits/` and `docs/implementation-history/`. See Archive Map below.

---
## Priority 0 -- Critical (Do Now)

### Batch A: Build Correctness

- [ ] **[TS]** skipLibCheck:true in packages/typescript-config/base.json hides real type errors. **CRITICAL** [CONFIRMED-P10]
- [ ] **[NEXT]** CSP unsafe-inline + unsafe-eval in apps/app next.config.ts AND root vercel.json. **CRITICAL** [CONFIRMED-P10] **NOTE: unsafe-eval removed from production (only needed for dev HMR). unsafe-inline remains required by Clerk/PostHog/GTM. Full removal needs nonce-based CSP migration (medium-term).**
- [ ] **[NEXT-NEW]** packages/next-config serverExternalPackages replacement bug: shared ["ably"] DROPPED when apps define own array. **CRITICAL** [NEW-P11] **NOTE: Both apps already include "ably" manually. Pattern is fragile but not a runtime bug. Downgraded from CRITICAL to HIGH (maintenance concern).**
- [ ] **[TS-NEW]** Missing apps/forecasting-service from root tsconfig references. **CRITICAL** [NEW-P12] **NOTE: forecasting-service is a bare skeleton (only .env.example exists, no package.json or tsconfig.json). Cannot add to tsconfig references without proper project setup. Blocked pending project scaffolding.**
- [ ] **[TS-NEW]** Missing verbatimModuleSyntax -- TS 5.9 recommends true repo-wide. Zero configs set it. **HIGH** [NEW-P13] **DEFERRED: would break 11K+ imports. Needs gradual migration via @typescript-eslint/consistent-type-imports first.**

### Batch B: Runtime Correctness


### Batch C: Cron Systemic Auth Failure (ESCALATED-P12)

ALL scheduled crons non-functional. Clerk middleware blocks `/api/cron/*` (not in `isPublicRoute`) before handler auth. External attacker can invoke sentry-fixer at will.

_All Batch C cron items resolved (18 items) — see "Changes from cron-auth fix pass (2026-05-16)" and security pass writeups above._

### Batch D: Vitest Correctness

- [ ] **[VITEST]** mobile in root workspace but no vitest config. **MEDIUM** [CONFIRMED-P10] **NOTE: mobile has no test files, so missing vitest config is expected.**

_15 Batch D vitest items resolved — see "Changes from vitest+next-config fix pass (2026-05-16)" and pass-14 writeups above._

### Batch E: Database Security

- [ ] **[RLS]** 119 of 202 tenant models lack RLS policies. **CRITICAL** [CORRECTED-2026-05-17] **BLOCKED on runtime wiring — see "Changes from RLS runtime audit pass (2026-05-17)" above. Adding more no-op policies is theater until `auth.jwt()` stub is replaced and app stops connecting as `BYPASSRLS` owner. Per-schema gap: tenant_admin (30), tenant_kitchen (26), tenant_staff (26), tenant_events (19), tenant_inventory (15), tenant_crm (3). tenant_accounting, tenant_facilities, tenant_logistics are 100% covered (policies-wise; not enforced).**
- [ ] **[RLS]** Zero @@enableRLS annotations in Prisma schema. **CRITICAL** [CONFIRMED-P10] **NOTE: Prisma's `@@enableRLS` requires the `multiSchema` + `views` preview features and only emits `ENABLE ROW LEVEL SECURITY` in `prisma migrate dev` output — it does not author policies. Repo's current migrations author both `ENABLE ROW LEVEL SECURITY` and full CREATE POLICY SQL by hand, so `@@enableRLS` would be redundant. Lower-priority cleanup; revisit only if migrating to the Prisma-generated RLS workflow.**
- [ ] **[RLS]** Phantom RLS entries: audit_log (platform), vendor_catalog (singular). **CRITICAL** [CONFIRMED-P10] **PARTIAL: both phantom entries documented with precise file:line in the "Changes from RLS runtime audit pass" section above. Fix requires either dropping the orphan tables (`tenant_admin.audit_log`, `tenant_inventory.vendor_catalog`) after confirming zero rows, OR adding Prisma models that map to them. `platform.audit_log` itself needs a two-arm RLS policy that handles its nullable `tenant_id` (a naive tenant_isolation policy would silently hide every platform-level audit row). Treat as 3 distinct sub-items in a future migration.**
- [ ] **[PRISMA]** relationMode STILL prisma despite docs claiming foreignKeys. **CRITICAL** [CONFIRMED-P10] **DOC-FIXED 2026-05-17 (deferred for runtime): `packages/database/README.md` updated to correctly state `relationMode = "prisma"` and FK count (137, not 108). The actual switch from `"prisma"` to `"foreignKeys"` remains blocked — repo has 236 `@relation` directives but only 137 physical FK constraints (migration `20260129120000_add_foreign_keys` added them), so ~99 relations have no underlying FK. Switching would force Prisma to emit those FKs in the next migration, which will fail if any orphan rows exist (see `docs/database/KNOWN_ISSUES.md` and `docs/database/schemas/05-tenant_events.md:264,305` for known orphan scenarios). Prerequisite: an orphan-row audit and cleanup script.**
- [x] **[PRISMA-NEW]** prisma.config.ts lacks directUrl -- production db:deploy uses pooled connection, risks advisory lock failures. **HIGH** [NEW-P11] **NOT FIXABLE IN PRISMA 7.x: Prisma 7.3.0 removed directUrl from schema.prisma ("no longer supported in schema files") AND defineConfig() datasource type doesn't include it. The feature is not available in the current Prisma version. Downgrade from HIGH to MEDIUM — only affects production deployments through PgBouncer where advisory locks may fail.**
- [ ] **[PRISMA]** 339 snake_case field instances across 60 models without @map. **HIGH** [CONFIRMED-P10]
- [ ] **[PRISMA]** 215 String status fields zero enum adoption. **HIGH** [CONFIRMED-P10]

### Batch EE: Framework Boundary Violations

- [ ] **[BOUNDARY]** @repo/observability 7 direct @sentry/nextjs runtime imports. **HIGH** [CONFIRMED-P10]
- [ ] **[BOUNDARY-NEW]** @repo/manifest-adapters 5 dynamic @sentry/nextjs imports (was 3). **HIGH** [NEW-P11]
- [ ] **[BOUNDARY-NEW]** packages/observability server-only will throw in non-Next.js contexts. **HIGH** [NEW-P11]
- [ ] **[BOUNDARY]** @repo/seo/metadata.ts imports Metadata from next. **HIGH** [CONFIRMED-P10]
- [ ] **[BOUNDARY]** @repo/design-system has next as runtime dep. **HIGH** [CONFIRMED-P10]

### Batch L: Linting -- CRITICAL

- [ ] **[BIOME-P10]** 21 Biome rules downgraded from error to warn. **HIGH** [CONFIRMED-P10] **PARTIAL: Promoted `correctness.noUnusedImports` from warn→error in both biome.jsonc and biome.autofix.jsonc (verified 0 existing violations). Remaining warn-level rules have substantial existing violations (e.g. useBlockStatements: 1820, noNestedTernary: 317, noNonNullAssertion: 276) and require codebase-wide cleanup before promotion. Future work: bulk auto-fix campaigns to clear violations, then promote rules incrementally.**
- [ ] **[BIOME-P10]** Redundant apps/** override for noBarrelFile. **MEDIUM** [CONFIRMED-P10]
- [ ] **[LINT]** 2 packages stale eslint lint scripts. **MEDIUM** [CONFIRMED-P10]

---
## Priority 1 -- High (Next Sprint)

### Batch F: Type Safety Hardening

- [ ] **[TS]** Zero composite:true despite 39+ project references -- DECORATIVE. **CRITICAL** [CONFIRMED-P10]
- [ ] **[TS]** strict mode enabled but missing noUncheckedIndexedAccess, exactOptionalPropertyTypes. **HIGH** [CONFIRMED-P10]
- [ ] **[TS]** 15 shared packages extend nextjs.json not bundler-library.json. **HIGH** [CONFIRMED-P10]
- [ ] **[TS]** base.json includes DOM types -- leaks into Node-only packages. **HIGH** [CONFIRMED-P10]
- [ ] **[TS]** 3 standalone configs skip shared base (manifest-runtime, sales-reporting, sentry-integration). **HIGH** [CONFIRMED-P10]
- [ ] **[TS]** nextjs.json noEmit:true blocks declarations for 15+ library packages. **HIGH** [CONFIRMED-P10]
- [ ] **[TS]** 3 packages missing tsconfig entirely: forecasting-service, brand, types. **HIGH** [CONFIRMED-P10]
- [ ] **[TS]** sales-reporting uses module:commonjs inconsistent with ESM. **HIGH** [CONFIRMED-P10]
- [ ] **[TS]** mobile/studio extends nextjs.json inappropriate for React Native. **HIGH** [CONFIRMED-P10]
- [ ] **[TS]** design-system extends nextjs.json with next plugin inappropriate. **HIGH** [CONFIRMED-P10]
- [ ] **[TS]** 3 app configs have ignoreDeprecations. **HIGH** [CONFIRMED-P10]
- [ ] **[TS]** Root references missing brand and types packages. **MEDIUM** [CONFIRMED-P10]
- [ ] **[TS]** 9 packages have tsconfig but no direct typescript dep. **MEDIUM** [CONFIRMED-P10]

### Batch G: Next.js Build and Security

- [ ] **[NEXT]** apps/docs NormalModuleReplacementPlugin webpack-only ignored by Turbopack. **HIGH** [CONFIRMED-P10]
- [ ] **[NEXT-NEW]** apps/api + apps/app: outputFileTracingIncludes uses fragile relative paths without outputFileTracingRoot. **MEDIUM** [NEW-P11]
- [ ] **[NEXT-NEW]** packages/next-config turbopack.root uses process.cwd() instead of __dirname. **MEDIUM** [NEW-P11]
- [ ] **[NEXT-NEW]** apps/api CORS only allows 127.0.0.1 not localhost. **MEDIUM** [NEW-P11]
- [ ] **[NEXT-NEW]** apps/app CSP connect-src Ably wildcards too broad. **MEDIUM** [NEW-P11]
- [ ] **[NEXT-NEW]** apps/app headers() completely replaces shared config's headers (loses X-DNS-Prefetch-Control, static asset Cache-Control). **MEDIUM** [NEW-P11]
- [ ] **[NEXT-NEW]** apps/storybook does NOT use @repo/next-config shared config. **MEDIUM** [NEW-P13]

### Batch H: Sentry Configuration

- [ ] **[SENTRY]** 4 different trace sampling strategies across configs. **HIGH** [CONFIRMED-P10]
- [ ] **[SENTRY]** packages/mcp-server/src/index.ts bare process.env for Sentry. **HIGH** [CONFIRMED-P10]

_15 Batch H sentry items resolved — see "Changes from Sentry shared-config fix pass (2026-05-17)" and "Changes from sentry-integration build hygiene pass (2026-05-17)" above._

### Batch I: Turbo and CI Pipeline

- [ ] **[TURBO]** Zero turbo tasks define inputs. **HIGH** [CONFIRMED-P10]
- [ ] **[TURBO]** ~60+ env vars missing from turbo.json. **HIGH** [CONFIRMED-P10] **PARTIAL: added top 25 most impactful vars (VERCEL_URL, VERCEL_REGION, VERCEL_PROJECT_PRODUCTION_URL, VERCEL_PREVIEW_URL_SUFFIX, VERCEL_API_URL, NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_WEB_URL, NEXT_PUBLIC_API_URL, NEXT_PUBLIC_DOCS_URL, NEXT_PUBLIC_SENTRY_DSN, NEXT_PUBLIC_SENTRY_ENVIRONMENT, BASEHUB_TOKEN, CLERK_SECRET_KEY, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, ANALYZE, NODE_ENV). Remaining vars are package-specific (UPSTASH_REDIS, STRIPE, RESEND, KNOCK, TWILIO, ARCJET, LIVEBLOCKS, etc.) -- add per-package turbo.json env blocks when those packages get individual turbo configs.**
- [ ] **[CI-NEW]** logging-sync.yml pushes directly to default branch without PR. **MEDIUM** [NEW-P11]
- [ ] **[CI-NEW]** performance.yml continue-on-error means regressions never caught. **MEDIUM** [NEW-P11]
- [ ] **[CI-NEW]** Bitwarden secret IDs hardcoded in deploy.yml. **MEDIUM** [NEW-P11]

_22 Batch I turbo/CI items resolved — see "Changes from CI hardening pass (2026-05-16)", "Changes from vitest+next-config fix pass (2026-05-16)", and pass-14 writeups above._

### Batch J: Package.json Correctness

- [ ] **[PKG]** 13 packages have react in dependencies instead of peerDependencies. **HIGH** [CONFIRMED-P10] **RESOLVED: all 12 packages that declare react already have it in peerDependencies. Finding was stale.**
- [ ] **[PKG]** @repo/design-system depends on @repo/auth -- reverse coupling. **HIGH** [CONFIRMED-P10]
- [ ] **[PKG]** @repo/design-system has next as direct runtime dep should be peerDep. **HIGH** [CONFIRMED-P10]
- [ ] **[PKG]** React version mismatch: mobile on 19.1.0 vs monorepo 19.2.4. **HIGH** [CONFIRMED-P10]
- [ ] **[PKG]** pnpm.overrides pins manifest 0.3.37 but local is 0.3.35. **HIGH** [CONFIRMED-P10]
- [ ] **[PKG-NEW]** packages/manifest-runtime/packages/cli vitest pinned to "latest" (floating). **HIGH** [NEW-P11]
- [ ] **[PKG-NEW]** packages/manifest-runtime/packages/cli @types/node pinned to "latest". **HIGH** [NEW-P11]
- [ ] **[PKG-NEW]** packages/manifest-runtime/packages/cli missing @repo/typescript-config devDep, missing private:true. **HIGH** [NEW-P11]
- [ ] **[PKG-NEW]** packages/manifest-runtime private:false with react as hard dep. Should be peerDep. **HIGH** [NEW-P11]
- [ ] **[PKG-NEW]** packages/observability + manifest-adapters @sentry/nextjs as direct dep (boundary violation). **HIGH** [NEW-P11]
- [ ] **[PKG-NEW]** packages/manifest-runtime build is echo (no actual build, relies on checked-in dist). **HIGH** [NEW-P11]
- [ ] **[PKG-NEW]** packages/manifest-runtime pg as runtime dep of generic library. **HIGH** [NEW-P11]
- [ ] **[PKG-NEW]** apps/mobile missing typecheck/test scripts, TS ~5.9.2 tilde range. **MEDIUM** [NEW-P11]
- [ ] **[PKG-NEW]** packages/kitchen-state-transitions main/types point to .ts source. **MEDIUM** [NEW-P11]
- [ ] **[PKG-NEW]** packages/manifest-runtime/packages/cli exports point to .ts source. **MEDIUM** [NEW-P11]
- [ ] **[PKG-NEW]** packages/manifest-runtime/packages/cli TS ^5.5.3 (monorepo ^5.9.3). **MEDIUM** [NEW-P11]

### Batch K: ENV Validation

- [ ] **[ENV]** 81 unique env vars via bare process.env. **HIGH** [CONFIRMED-P10]
- [x] **[ENV]** APP_URL hardcoded to convoy.com in 5 files. **HIGH** [CONFIRMED-P10] **RESOLVED 2026-05-17: replaced 5 stale convoy.com APP_URL fallbacks across `apps/api/app/api/accounting/invoices/[id]/route.ts` (2), `apps/api/app/api/events/contracts/[id]/send/route.ts` (1), and `apps/app/app/(authenticated)/crm/proposals/actions.ts` (2) with `process.env.NEXT_PUBLIC_APP_URL ?? "https://app.capsule.pro"`. The `NEXT_PUBLIC_APP_URL` env is already validated in `@repo/next-config/keys` (`z.url()`) at module load; the literal fallback now carries the canonical brand rather than the stale convoy bleed. `import { env } from "@/env"` was rejected for these routes because it would force Clerk-key validation at test module-load (per `apps/api/test/setup.ts` having no env stubs), so we kept the bare-`process.env` pattern that matches other apps/api routes (e.g. `cron/email-reminders/route.ts:231`).**
- [x] **[ENV]** RESEND_FROM hardcoded to noreply@convoy.com in 4 files. **HIGH** [CONFIRMED-P10] **RESOLVED 2026-05-17: same files (`apps/api/.../invoices/[id]/route.ts`, `apps/api/.../events/contracts/[id]/send/route.ts`, `apps/app/.../crm/proposals/actions.ts`) — replaced 4 `RESEND_FROM || "noreply@convoy.com"` fallbacks with `process.env.RESEND_FROM ?? "noreply@capsule.pro"`. `RESEND_FROM` is already validated as `z.string().email()` in `@repo/email/keys`. Also fixed `packages/notifications/email-notification-service.ts:201` (`"Convoy <noreply@convoy.app>"` → `keys().RESEND_FROM ?? "Capsule <noreply@capsule.pro>"`), added `RESEND_FROM` to `packages/notifications/keys.ts` server schema, and fixed `packages/email/templates/invoice.tsx:114` preview-prop URL (`convoy.com` → `capsule.pro`). Verification: 31 invoice tests + 57 notifications tests pass; `pnpm --filter api typecheck` + `pnpm --filter app typecheck` clean; biome error count unchanged from baseline (2 pre-existing style flags on untouched lines).**
- [ ] **[ENV]** Missing ENV validation in: web, docs, email, storybook, forecasting-service, mobile. **HIGH** [CONFIRMED-P10]
- [ ] **[ENV]** apps/api/env.ts duplicates sentry keys instead of extending sentry-integration. **HIGH** [CONFIRMED-P10]
- [ ] **[ENV]** packages/mcp-server has no keys.ts at all. **HIGH** [CONFIRMED-P10] **RESOLVED: STALE — packages/mcp-server/src/keys.ts already exists with full zod envSchema validation covering all 10 env vars (NODE_ENV, SENTRY_DSN, SENTRY_ENVIRONMENT, MCP_SERVER_MODE, MCP_SERVICE_ACCOUNT_ID, MCP_SERVICE_TENANT_ID, DATABASE_URL, MCP_PROJECT_ROOT, MCP_ALLOW_DB, REPO_ROOT). Uses plain zod instead of @t3-oss/env-nextjs because MCP server is a standalone Node.js process, not a Next.js app. Pattern is correct for its context. Verified 2026-05-17.**
- [ ] **[ENV]** Mobile app has no env.ts at all. **HIGH** [CONFIRMED-P10]
- [ ] **[ENV-NEW]** Sentry edge config DSN resolution inverted vs rest of codebase. **MEDIUM** [NEW-P11]
- [ ] **[ENV]** SENTRY_WEBHOOK_SECRET schema drift across files. **HIGH** [CONFIRMED-P10]

_22 Batch K env items resolved — see "Changes from cron-auth fix pass (2026-05-16)", "Changes from security fix pass (2026-05-16)", and security hardening pass writeups above._

### Batch M: Build System

- [ ] **[BUILD]** 20 packages missing build scripts entirely. **HIGH** [CONFIRMED-P10]
- [x] **[BUILD]** @repo/sentry-integration bundles ALL runtime deps (no --external). **HIGH** [CONFIRMED-P10] **RESOLVED 2026-05-17: tsup.config.ts externalizes `@repo/database`, `@repo/observability`, `@ai-sdk/openai`, `@slack/web-api`, `@t3-oss/env-nextjs`, `ai`, `zod`. `dist/slack.js` shrank from ~30KB to 162 bytes; deps now resolve at consumer side. Prevents version drift and reduces bundle size for all 3 apps/api consumers.**
- [ ] **[BUILD]** @repo/ai does not externalize ai/@ai-sdk/openai. **HIGH** [CONFIRMED-P10] **RESOLVED 2026-05-17: externalized ai, @ai-sdk/openai, @t3-oss/env-nextjs, uuid, zod, streamdown, tailwind-merge. dist/index.js shrank to 42 KB.**
- [ ] **[BUILD]** @repo/mcp-server builds to dist/ but no main/exports/types fields. **HIGH** [CONFIRMED-P10] **RESOLVED 2026-05-17: added main/types/exports pointing to dist/.**
- [ ] **[BUILD]** @repo/realtime exports require pointing to ESM -- CJS break. **HIGH** [CONFIRMED-P10]
- [x] **[BUILD]** Root tsup.config.ts is stale/leftover. **HIGH** [CONFIRMED-P10] **RESOLVED: Deleted root tsup.config.ts — no package.json references it. Individual packages have their own tsup configs.**
- [x] **[BUILD]** @repo/ai has dead runtime deps: streamdown, tailwind-merge. **HIGH** [CONFIRMED-P10] **RESOLVED: STALE — both streamdown and tailwind-merge are actively imported. streamdown in streaming.ts, tailwind-merge in thread.tsx and message.tsx components.**
- [ ] **[BUILD]** 22 of 33 packages missing exports map. **HIGH** [CONFIRMED-P10] **RESOLVED: 31 of 33 packages now have exports maps (19 added this pass + 3 previously + 9 pre-existing). Remaining: @repo/design-system has main/types only (deep subpaths resolved via tsconfig paths), @repo/typescript-config is config-only (N/A).**
- [ ] **[BUILD]** 9 packages have main/exports pointing to .ts source files. **HIGH** [CONFIRMED-P10]
- [ ] **[BUILD]** Stale tsup.config.bundled_*.mjs artifact in packages/ai. **HIGH** [CONFIRMED-P10]
- [ ] **[BUILD]** @repo/supplier-connectors build is tsc --noEmit (no output). **HIGH** [CONFIRMED-P10]
- [ ] **[CROSS-NEW]** @repo/realtime CJS default + ESM exports map mismatch. **HIGH** [NEW-P11] **RESOLVED 2026-05-17: removed spurious "require" condition from exports. Package is ESM-only.**

---
## Priority 2 -- Medium (Planned)

### Batch N: TypeScript Consistency

- [ ] **[TS]** moduleResolution inconsistent across 3 standalone packages. **MEDIUM** [CONFIRMED-P10]
- [ ] **[TS]** Path aliases not consistently configured. **MEDIUM** [CONFIRMED-P10]
- [ ] **[TS]** declarationDir not set in library configs with declaration:true. **MEDIUM** [CONFIRMED-P10]
- [ ] **[TS]** skipLibCheck:true redundantly repeated in child configs. **MEDIUM** [CONFIRMED-P10]
- [ ] **[TS]** types:node in base.json injects Node types into browser packages. **MEDIUM** [CONFIRMED-P10]
- [ ] **[TS]** 8 standalone configs not extending shared base. **MEDIUM** [CONFIRMED-P10]
- [ ] **[TS]** 18 server packages get DOM types via nextjs.json. **MEDIUM** [CONFIRMED-P10]
- [ ] **[TS]** manifest-runtime/packages/cli uses @types/node: latest. **MEDIUM** [CONFIRMED-P10]

### Batch O: Vitest Standardization

- [ ] **[VITEST]** Coverage only in 1 package (mcp-server). **MEDIUM** [CONFIRMED-P10]
- [x] **[VITEST]** apps/api/vitest.config.mts dead code -- .ts takes precedence. **MEDIUM** [CONFIRMED-P10] **RESOLVED: STALE — both vitest.config.ts and vitest.config.ts.bak2 were already deleted in a previous pass. Only vitest.config.mts remains (active config).**
- [x] **[VITEST]** apps/api/vitest.config.ts.bak2 committed. Delete. **MEDIUM** [CONFIRMED-P10] **RESOLVED: STALE — already deleted in a previous pass.**

### Batch P: Turbo Pipeline

- [ ] **[TURBO]** typecheck cache:false wastes CI time. **MEDIUM** [CONFIRMED-P10]
- [ ] **[TURBO]** 5 packages missing turbo.json. **MEDIUM** [CONFIRMED-P10]
- [x] **[TURBO]** SENTRY_ENVIRONMENT split between globalPassThroughEnv and globalEnv. **MEDIUM** [CONFIRMED-P10] **RESOLVED: consolidated to globalEnv only, globalPassThroughEnv has only TURBO_TOKEN and TURBO_TEAM**
- [ ] **[TURBO]** build outputs overly broad. **MEDIUM** [CONFIRMED-P10]
- [ ] **[TURBO]** Mobile app missing turbo.json and no scripts. **MEDIUM** [CONFIRMED-P10]
- [x] **[TURBO-NEW]** test should depend on same-package build, not just ^test. **MEDIUM** [NEW-P11] **RESOLVED: test task now depends on ["^build"] which builds all dependency packages before testing**
- [ ] **[TURBO-NEW]** typecheck: fix should be inputs + cache:true, not just cache toggle. **MEDIUM** [NEW-P11]
- [ ] **[TURBO-NEW]** build outputs apply to ALL packages but include app-specific dirs (.react-email, storybook-static). **MEDIUM** [NEW-P11]
- [ ] **[TURBO-NEW]** Mobile app turbo.json missing: no boundary tags, dev task without proper persistent settings. **MEDIUM** [NEW-P11]

### Batch Q: Vercel Config Polish

- [ ] **[VERCEL]** 630 of 632 API routes lack maxDuration. **MEDIUM** [CONFIRMED-P10]
- [x] **[VERCEL]** apps/web and apps/docs have zero security headers. **MEDIUM** [CONFIRMED-P10] **RESOLVED (web): STALE — apps/web imports shared @repo/next-config which provides 6 security headers. apps/docs now has security headers added directly.**
- [ ] **[VERCEL-NEW]** inventory-audit uses non-standard x-vercel-cron-secret header. **MEDIUM** [NEW-P11]
- [x] **[VERCEL-NEW]** keep-alive uses non-standard x-cron-secret, no fallback. **MEDIUM** [NEW-P11] **RESOLVED: moved to /api/cron/ with standard auth.**
- [x] **[VERCEL-NEW]** 6 cron routes missing maxDuration (may timeout). **MEDIUM** [NEW-P11] **RESOLVED: Added maxDuration:60 to functions config for app/api/**/*.ts and app/cron/**/*.ts in apps/api/vercel.json.**
- [ ] **[VERCEL-NEW]** sentry-fixer GET handler exposes internal config publicly (information disclosure). **MEDIUM** [NEW-P11]
- [ ] **[VERCEL-NEW]** cron registry missing integration-auto-sync and outbox/publish. **MEDIUM** [NEW-P11]

### Batch R: Sentry Alignment

- [ ] **[SENTRY]** apps/app edge config missing enableLogs, beforeSend, DSN guard. **MEDIUM** [CONFIRMED-P10]
- [ ] **[SENTRY]** Inconsistent integrations lists. **MEDIUM** [CONFIRMED-P10]

### Batch S: Package-level Cleanup

- [ ] **[PKG]** sideEffects not configured for tree-shaking. **MEDIUM** [CONFIRMED-P10]
- [ ] **[PKG]** Missing clean script in 7 packages. **MEDIUM** [CONFIRMED-P10]

### Batch T: ENV and CI Completeness

- [ ] **[ENV]** NODE_ENV never validated in any schema. **MEDIUM** [CONFIRMED-P10]
- [ ] **[ENV]** NEXT_PUBLIC_ prefix inconsistently applied. **MEDIUM** [CONFIRMED-P10]
- [ ] **[ENV]** packages/database/keys.ts URL rewrite side effect. **MEDIUM** [CONFIRMED-P10]
- [ ] **[CI]** ci.yml linting runs typecheck instead of biome check. **MEDIUM** [CONFIRMED-P10]
- [x] **[CI]** 6 of 8 CI workflows lack concurrency groups. **MEDIUM** [CONFIRMED-P10] **RESOLVED: added concurrency groups to ci.yml, security.yml, performance.yml (3 most impactful). logging-sync.yml, manifest-ci.yml, codeql.yml remain without groups (low-impact or already covered by schedule-only triggers).**
- [ ] **[CI]** No GitHub Actions pinned to commit SHAs. **MEDIUM** [CONFIRMED-P10]

### Batch U: Build System

- [ ] **[BUILD]** No shared tsup config. **MEDIUM** [CONFIRMED-P10]
- [ ] **[BUILD]** @repo/observability missing exports field. **MEDIUM** [CONFIRMED-P10] **RESOLVED 2026-05-17: added exports with 11 subpaths covering all consumer imports. No main/types (no barrel index.ts).**

### Batch V: Prisma and Database

- [ ] **[PRISMA]** relationMode = prisma contradicts docs. **MEDIUM** [CONFIRMED-P10]
- [ ] **[PRISMA]** 2 pairs duplicate migration timestamps. **MEDIUM** [CONFIRMED-P10]
- [ ] **[PRISMA]** .npmrc link-workspace-packages=false contradicts workspace:* usage. **MEDIUM** [CONFIRMED-P10]
- [ ] **[PRISMA]** 89 migration folders, 32 repair_drift 36%. **MEDIUM** [CONFIRMED-P10]
- [ ] **[PRISMA]** DATABASE_PRE_MIGRATION_CHECKLIST.md accuracy issues. **MEDIUM** [CONFIRMED-P10]
- [ ] **[PRISMA]** prisma.config.ts mixed env access patterns. **MEDIUM** [CONFIRMED-P10]
- [ ] **[PRISMA-NEW]** 25 snake_case updated_at fields lack @updatedAt (no auto-update on modification). **MEDIUM** [NEW-P11]
- [ ] **[PRISMA-NEW]** 74 of 79 Json fields lack @db.JsonB (no GIN indexing, slower queries). **MEDIUM** [NEW-P11]
- [ ] **[PRISMA-NEW]** ~169 redundant @@unique([tenantId, id]) duplicating @@id([tenantId, id]) primary keys. **MEDIUM** [NEW-P11]

### Batch W: Playwright and Misc

- [ ] **[PLAYWRIGHT]** chromium-unauth hardcoded testMatch ignores E2E_SUITE. **MEDIUM** [CONFIRMED-P10]
- [x] **[PLAYWRIGHT]** trace: on-first-retry dead config with retries:0. **MEDIUM** [CONFIRMED-P10] **RESOLVED: Changed trace from "on-first-retry" to "retain-on-failure" (matches retries:0 intent).**
- [ ] **[PLAYWRIGHT]** Inconsistent Playwright version: root 1.58.1 vs app ^1.56.1. **MEDIUM** [CONFIRMED-P10]
- [ ] **[PLAYWRIGHT]** fullyParallel:false and workers:1 hardcoded globally. **MEDIUM** [CONFIRMED-P10]
- [x] **[PLAYWRIGHT-NEW]** Missing forbidOnly: !!process.env.CI -- test.only can slip into CI. **MEDIUM** [NEW-P11] **RESOLVED: Added forbidOnly: !!process.env.CI to playwright.config.ts.**
- [x] **[PLAYWRIGHT]** global-setup.ts is dead code. **LOW** [CONFIRMED-P10] **RESOLVED: Deleted e2e/global-setup.ts (not referenced — config uses global-setup-persistent-browser.ts instead).**
- [ ] **[PLAYWRIGHT]** WebServer health check uses /sign-in instead of /api/health. **LOW** [CONFIRMED-P10]
- [ ] **[CSS-NEW]** apps/docs missing @tailwindcss/postcss dep entirely. **MEDIUM** [NEW-P11]
- [ ] **[CSS-NEW]** apps/docs diverges from monorepo PostCSS pattern. **MEDIUM** [NEW-P11]
- [ ] **[MISC]** apps/docs PostCSS uses legacy tailwindcss plugin name. **MEDIUM** [CONFIRMED-P10]
- [ ] **[MISC]** .npmrc shamefully-hoist=true and strict-peer-dependencies=false. **MEDIUM** [CONFIRMED-P10]
- [ ] **[MISC]** .gitignore 471 lines, .vercel listed 6 times, .env*.local 4 times. **MEDIUM** [CONFIRMED-P10]
- [x] **[MISC]** Missing .editorconfig. **MEDIUM** [CONFIRMED-P10] **RESOLVED: Created .editorconfig with UTF-8, LF, 2-space indent, final newline, trailing whitespace trim.**
- [ ] **[MISC]** 4 stale worktrees. **MEDIUM** [CONFIRMED-P10]
- [ ] **[MISC]** 28 API route domains have ZERO spec coverage. **MEDIUM** [CONFIRMED-P10]
- [ ] **[MISC]** ~564 :any annotations in production. **MEDIUM** [CONFIRMED-P10]
- [ ] **[MISC]** fumadocs version skew (mdx v14, core/ui v15). **MEDIUM** [CONFIRMED-P10]
- [ ] **[ROOT-NEW]** .gitignore *.txt blanket glob. **MEDIUM** [NEW-P11]
- [ ] **[ROOT-NEW]** .husky/pre-commit runs full pnpm check on every commit (blocks fast iteration). **MEDIUM** [NEW-P11]

---

## Priority 3 -- Low (When Convenient)

### Batch Z: Hygiene and Documentation

- [ ] **[TS]** 26 redundant strictNullChecks:true overrides. **LOW** [CONFIRMED-P10]
- [ ] **[TS]** exactOptionalPropertyTypes not set. **LOW** [CONFIRMED-P10]
- [ ] **[TS]** incremental:false in base. **LOW** [CONFIRMED-P10]
- [ ] **[NEXT]** Missing cleanUrls configuration. **LOW** [CONFIRMED-P10]
- [ ] **[PLAYWRIGHT]** Missing outputDir configuration. **LOW** [CONFIRMED-P10]
- [ ] **[PLAYWRIGHT]** No shared fixtures file. **LOW** [CONFIRMED-P10]
- [ ] **[ENV]** No env var deprecation mechanism. **LOW** [CONFIRMED-P10]
- [ ] **[CI]** No matrix testing across Node versions. **LOW** [CONFIRMED-P10]
- [ ] **[CI]** No release automation. **LOW** [CONFIRMED-P10]
- [ ] **[CI]** AGENTS.md cron registry lists 6 but actual is 8+. **LOW** [CONFIRMED-P10]
- [ ] **[PRISMA]** All 223 models have @@schema annotation (0 missing). **INFO** [CONFIRMED-P10]
- [ ] **[PRISMA]** 4 redundant PascalCase @@map. **LOW** [CONFIRMED-P10]
- [x] **[CI]** Missing pnpm caching in deploy.yml, security.yml, performance.yml. **LOW** [CONFIRMED-P10] **RESOLVED: added cache: 'pnpm' to deploy.yml, security.yml, performance.yml setup-node steps**
- [ ] **[BUILD]** apps/docs unscoped name. **LOW** [CONFIRMED-P10]

### Batch AA: Package Metadata

- [ ] **[PKG]** engines field not set in 4 apps and all 33 packages. **LOW** [CONFIRMED-P10]
- [ ] **[PKG]** license field missing in 39 of 40 package.json files. **LOW** [CONFIRMED-P10]
- [ ] **[PKG]** files field not set in 32 of 33 packages. **LOW** [CONFIRMED-P10]
- [x] **[PKG]** Prettier dead dependency in devDeps and overrides. **LOW** [CONFIRMED-P10] **RESOLVED: Removed from root devDeps and pnpm.overrides.**
- [ ] **[PKG]** Missing @repo/typescript-config devDep in brand, sales-reporting, types, manifest-runtime. **LOW** [CONFIRMED-P10]

### Pass 11 Low/Info Findings by Domain (124 items -- not listed individually)

| Domain | Count | Key Themes |
|--------|-------|------------|
| TS | ~18 | Redundant overrides, decorative configs |
| NEXT | ~12 | Minor config drift, missing defaults |
| VITEST | ~10 | Coverage gaps, env inconsistencies |
| TURBO | ~8 | Cache invalidation, env passthrough |
| CI | ~15 | Workflow redundancy, missing retries |
| SENTRY | ~8 | Minor integration config gaps |
| PKG | ~20 | Metadata, version drift, dead deps |
| ENV | ~10 | Minor unvalidated vars |
| PRISMA | ~8 | Naming conventions, index opportunities |
| VERCEL | ~5 | Header config, scheduling |
| BOUNDARY | ~3 | Import hygiene |
| PLAYWRIGHT | ~3 | Config completeness |
| CROSS | ~2 | Export map issues |
| ROOT | ~2 | File hygiene |
| CSS | ~1 | PostCSS alignment |

### Pass 13 MEDIUM/LOW Findings by Domain (~62 items -- not listed individually)

| Domain | Count | Key Themes |
|--------|-------|------------|
| TS | ~5 | target ES2022, cli standalone config, rate-limit rootDir, sourceMap missing |
| NEXT | ~3 | compress unset, minimumCacheTTL, turbopack.root process.cwd |
| VITEST | ~5 | workspace wrong config, realtime no env, globals inconsistency, deprecated methods |
| SENTRY | ~6 | duplicate beforeSend, missing autoInstrument, sendDefaultPii fork, no browserTracingIntegration |
| BIOME | ~4 | nursery:off disables 24 promoted rules, missing ignore patterns, no types domain |
| PRISMA | ~4 | no strictUndefinedChecks, dbgenerated vs uuid, mixed env access, no binaryTargets |
| VERCEL | ~5 | root vercel.json hybrid, docs missing installCommand, outbox cron path, fumadocs skew |
| BUILD | ~3 | root tsup references gitignored files, storybook vercel.json stub |
| PKG | ~3 | seo missing next peerDep, types/brand missing devDeps |
| ENV | ~5 | SEO VERCEL_PROJECT_PRODUCTION_URL, SENTRY_TRACES_SAMPLE_RATE, edge config bare |
| CI | ~3 | typecheck cache:false, performance.yml continue-on-error, env var duplication |
| SECURITY | ~3 | CORS fallback, webhooks GET leaks, web app no headers |
| CROSS | ~3 | .npmrc contradiction, .gitignore redundancy, docs diverge from PostCSS pattern |
| SPECS | ~2 | Training/HRMS certification cron missing, stale cron references |

---

## Priority 4 -- Info / Intentional (No Action)

- apps/app eslint.ignoreDuringBuilds:true -- INTENTIONAL: Biome handles linting.
- webpack overrides vs Turbopack -- Turbopack ignores webpack key.
- baseURL NOT hardcoded -- config uses env var with default.
- Per-package keys.ts IS the shared validation pattern.
- Inconsistent env schemas between apps -- intentional by app role.
- module: esnext vs es2022 -- intentional by config type.
- Build output dirs -- all use dist/.
- packageManager field -- present with integrity hash.
- Sentry source map upload well-structured across all apps.
- replaysSessionSampleRate not in server configs -- replay is client-only.
- Shared headers include X-DNS-Prefetch-Control: on -- unnecessary but harmless.
- sentry.client.config.ts missing is NOT an issue -- instrumentation-client.ts is correct for Next.js 15.
- apps/docs uses .mjs -- intentional (fumadocs requirement).

---

## Resolved / Invalidated

### Pass 11 Corrections (2026-05-16)

- Cron auth: ALL crons confirmed spoofable (external attacker can invoke webhook-retry, sentry-fixer)
- manifest-adapters boundary violations: 5 imports (was 3)
- sentry-integration: diverged tsconfig confirmed (doesn't extend shared)
- packages/ai: tailwind-merge dead dep confirmed in addition to streamdown

### Pass 10 Corrections (archived -- see docs/audits/)

All pass 10 corrections archived. Key: root vercel.json is APP deploy target; packages extending nextjs.json: 15; bare process.env: 81 vars.

### Pass 7-9 Resolutions (archived -- see docs/implementation-history/)

---

## Archive Map

- docs/implementation-history/ -- pass logs, executive summaries, blocker history
- docs/audits/ -- numbered audit passes, route audit reports
- docs/audits/ralph05-routes/ -- latest route audit
- docs/audits/pass4-consolidated-findings.md through pass10-consolidated-findings.md
- docs/audits/pass11-consolidated-findings.md [TO BE CREATED]
- docs/audits/pass12-consolidated-findings.md [TO BE CREATED]
- docs/audits/pass13-consolidated-findings.md [TO BE CREATED]

---

## Notes

- **Line limit**: Targets <=800 lines per AGENTS.md rules.
- **Batch ordering**: P0 A-EE+L immediate. P1 F-M next sprint. P2 N-W planned. P3 Z-AA convenience. P4 informational.
- **Count methodology**: ~842 unique actionable items after pass 13 (~97 new findings from 12 agents).
- **[NEW-P13]**: Items discovered by pass 13 (12 agents, ~97 new findings against latest official docs).
- **[CONFIRMED-P10]**: Items re-verified still valid.
- **[NEW-P11]**: Items discovered by pass 11 (16 agents, 240 new findings).
- **[ESCALATED-P11]**: Items escalated from prior passes with new severity context.
- **CRITICAL -- CSP double-definition**: Root vercel.json and apps/app/next.config.ts have conflicting CSP allowlists.
- **CRITICAL -- Cron auth**: ALL crons spoofable or broken. External attacker can invoke webhook-retry and sentry-fixer (AI agent runner).
- **CRITICAL -- composite**: Zero composite:true despite 39+ project references.
- **CRITICAL -- ENV**: packages/ai reads API_KEY not OPENAI_API_KEY. Validated key never consumed.
- **CRITICAL -- OutboxEvent**: Model non-functional against actual DB columns (wrong types, missing maps).
- **CRITICAL -- serverExternalPackages**: Shared ["ably"] silently dropped by app overrides. **NOTE: Both apps already include "ably" manually. Pattern is fragile but not a runtime bug. Downgraded from CRITICAL to HIGH (maintenance concern).**
- **CRITICAL -- RLS runtime no-op**: existing 83 RLS-protected tables provide ZERO runtime tenant isolation. `auth.jwt()` is a stub returning the zero UUID (`packages/database/prisma/migrations/0_init/migration.sql:35-40`), app connects as `neondb_owner` which has `BYPASSRLS`, and there is no per-request middleware that sets `request.jwt.claims`. All actual isolation comes from JS-side `tenantId` filters in route handlers. Adding more policies in the same pattern is theater until the runtime is wired. See "Changes from RLS runtime audit pass (2026-05-17)" at the top of this file.
- **RLS**: 119 of 202 tenant models lack RLS migration coverage (corrected count). Per-schema gap: tenant_admin (30), tenant_kitchen (26), tenant_staff (26), tenant_events (19), tenant_inventory (15), tenant_crm (3). tenant_accounting/facilities/logistics are 100% covered (policies-wise).
- **sentry-integration**: Most outdated package (zod v3, TS ^5.3, @types/node ^20, diverged tsconfig).
- **Vitest**: 3 major versions, environmentMatchGlobs REMOVED in v4.
- **Cron Clerk block**: ALL /api/cron/* routes blocked by Clerk middleware (not in isPublicRoute). Even GET routes return 401.
- **Next.js CVE**: 15.4.11 has unpatched CVEs; 15.5.18+ contains 13 security patches.
- **event-parser**: Script name `type-check` doesn't match turbo task `typecheck` -- silently excluded from type checking.
- **zod**: v3/v4 runtime mismatch in sentry-integration + supplier-connectors vs rest of monorepo.
- **Prisma config**: Missing directUrl causes pooled-connection advisory lock risk in production.
- **verbatimModuleSyntax**: TS 5.9 recommends true. Zero configs set it. Type-only imports silently dropped.
- **serverActions**: Next 15.5.18 still reads this setting from `experimental.serverActions`; top-level `serverActions` is invalid. **RESOLVED: kept under experimental.**
- **Phantom deps**: 6 packages have runtime deps never imported in source (auth/observability/feature-flags/ai/seo/payroll-engine).
- **API CSP**: apps/api has security headers but zero Content-Security-Policy. **Web CSP**: apps/web now has CSP (added 2026-05-16).
- **Payments webhook**: Returns 200 when Stripe secret missing -- webhooks silently dropped, never retried.
- **Rate limiting**: Fails open on Redis errors -- attacker disrupting Redis disables all rate limiting.
- **MCP server**: ~~Zero env validation. 5 credential vars via bare process.env, no keys.ts.~~ **RESOLVED: keys.ts exists with full zod validation. Verified 2026-05-17.**
- **runtime-factory.ts** bypasses keys() — Minor inconsistency: runtime-factory.ts line 45 reads MCP_ALLOW_DB directly via process.env instead of through keys(), but the variable is still declared in the schema.
