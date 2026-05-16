# IMPLEMENTATION_PLAN.md -- v113

> Updated 2026-05-15
> v113: Full spec-vs-implementation audit added to P3.B. Spec-by-spec FR compliance tables for calendar, events, contracts, marketing, staffing, command-board, training.
> Synthesized from v112 multi-agent verification on branch `checkpoint/tailscale-auth-local-access-20260514`.
> All 22 P0 items resolved (v65-v72). Test suite repair complete (v77-v80).
> v0.12.2 tag created with RLS fixes and console statements audit baseline.
> **v112 KEY CHANGES OVER v111:**
> - **Integrations routes: 25, NOT 5** -- MAJOR CORRECTION. Was 5x undercounted. Full inventory: goodshuffle (9), nowsta (6), quickbooks (1), webhooks (9).
> - **Total routes: 632, NOT ~622** -- +10 routes added since v111 audit.
> - **@ts-expect-error: 12, NOT 11** -- +1 new entry in storybook resizable.stories.tsx.
> - **queryRawUnsafe: 54, NOT 53** -- +1 new bottleneck-detector in manifest-adapters.
> - **Package test files: 72, NOT 64** -- +8 packages got new tests.
> - **Total test files: 275, NOT 267** -- 139 API + 72 pkg + 64 E2E.
> - **POST routes bypassing manifest: 93, NOT 86** -- +7 new direct-write POST routes.
> - **test.skip in E2E: 41, NOT 72** -- 31 skips removed/fixed since v111.
> - **`as any` production: 150, NOT 142** -- +8. Apps=41, manifest packages=90, other packages=19.
> - **`: any` apps-only: 20** -- v111's 53 was a specific subset. Manifest packages=115, generated=463.
> - **Domain route inventory expanded** -- 50 domains, 632 routes, 798 handlers (242 POST, 461 GET, 32 PUT, 22 PATCH, 41 DELETE).
> - **NEW: Frontend consumption analysis** -- 4 domains with NO frontend pages and NO API consumers: collaboration, training, shipments, communications.
> - **NEW: Specs coverage gaps** -- 47 spec files. 8 major domains (Kitchen/148, Inventory/58, CRM/41, Staff/35, Payroll/24, Procurement/24, Accounting/17, Collaboration/17) have ZERO specs.
> - **Confirmed accurate (no changes):** console=911, @ts-ignore=0, RLS=86/223=38.6%, API test files=139, E2E test files=64, raw fetch()=50, active manifests=86, disabled manifests=6, vitest configs=15, pre-push hook disabled (exit 0), .bak files=2, 501 routes=command-board/templates/[shareId], mockEmployee in production=payroll/tax/brackets.

---

## Ultimate Goal Action Items [v112]

### UG.1 -- Remove `ignoreBuildErrors` (P0.1)
**Status:** NOT STARTED. All 3 apps pass `tsc --noEmit` with zero errors. Removal is zero-risk.
**Action:** Delete `ignoreBuildErrors: true` from 3 next.config.ts files + `eslint.ignoreDuringBuilds` from apps/app. Optionally add `noUncheckedIndexedAccess` to base tsconfig.

### UG.2 -- CI Hard Gates (P0.4)
**Open gaps:**
1. **E2E CI job MISSING** — no `.github/workflows/e2e*.yml` exists. Add `e2e-workflows` job to ci.yml or new workflow.
2. **3 workflows lack concurrency groups** — manifest-ci.yml, performance.yml, codeql.yml waste CI minutes.
3. **Node version inconsistency** — ci.yml/security.yml hardcode 22.18.0, vercel-compat uses 22.x, rest use .nvmrc. Standardize on `.nvmrc`.
4. **vercel-compat.yml lacks explicit `prisma generate`** — relies on implicit behavior.
5. **deploy.yml `SKIP_ENV_VALIDATION` on ALL steps** — env schema changes not caught before deploy.
6. **2 soft gates** — npm audit (security.yml) and Lighthouse (performance.yml) use continue-on-error.
7. **manifest-ci.yml excludes cms/web/app from TS check** — type errors in these apps not caught.
8. **Pre-push hook disabled** — `.husky/pre-push` = `exit 0`.

### UG.3 -- Manifest Rule Enforcement (P0.3)
**Status:** RESOLVED. Dual enforcement: static CI audit (`manifest-route-audit` in manifest-ci.yml, `--strict` mode) + runtime provenance (SHA-256 hash). 86 active manifests, 6 disabled, 248 allowlist entries, 167 kitchen exemptions.
**Still open:** 93 POST routes bypass manifest (all covered by allowlist/exemption per P0.3).

### UG.4 -- Verification Commands (Section below)
**Status:** v112 verification commands confirmed with current output. See "Verification Commands" section.

### UG.5 -- Do Not Reopen Archive
**Status:** Comprehensive archive in "Resolved / Do Not Reopen" section below. Includes v105-v111 correction history.

### UG.6 -- All Routes Confirmed Exist and In Use
**Status:** 632 routes across 50 domains. ~280 are orphans (no frontend consumer). Key findings:
- **4 domains with NO frontend pages and NO API consumers:** collaboration (17 routes), training (7), shipments (9), communications (7) = 40 total orphan routes
- **2 domains use server actions bypassing API routes entirely:** command-board, cycle-counting
- **1 domain uses raw fetch only (not apiFetch):** marketing
- **Vendor-contracts command routes MISSING** — AGENTS.md claims 10 exist but filesystem confirms ZERO. Frontend calls to `/api/procurement/vendor-contracts/commands/*` WILL 404.
- **Kitchen has 95 orphan routes (64%)** — 15 singular/plural duplicate pairs = 30 dead routes

---

## P0 -- Critical Infrastructure

### P0.1 -- Remove `ignoreBuildErrors` [NOT STARTED -- SAFE TO REMOVE]

**Status:** `ignoreBuildErrors: true` in 3 apps. CI runs `pnpm turbo typecheck` separately, so TS errors ARE caught in CI. But `next build` succeeds even with TS errors -- a risk if CI is bypassed or skipped. **v110 VERIFIED: All 3 apps pass `tsc --noEmit` with ZERO errors. Removal is zero-risk.**

**Locations to remove:**
- `apps/app/next.config.ts:195` -- `ignoreBuildErrors: true`
- `apps/api/next.config.ts:102` -- `ignoreBuildErrors: true`
- `apps/web/next.config.ts:17` -- `ignoreBuildErrors: true`
- `apps/app/next.config.ts:189` -- `eslint.ignoreDuringBuilds: true`
- `packages/typescript-config/base.json:16` -- `skipLibCheck: true` (inherited by all 40+ tsconfigs)
- `noUncheckedIndexedAccess` -- NOT SET in any tsconfig (major strictness gap)
- Biome `noExplicitAny`: **warn only** (not error)

**Verified metrics (v112 -- hand-written production code ONLY, excluding generated/tests):**
- `as any`: **150** (v111 said 142 -- +8; breakdown: apps=41, manifest packages=90, other packages=19)
- `: any`: **apps-only=20** (v111's 53 was a specific subset; manifest packages=115, generated Prisma=463)
- `@ts-ignore`: **0** (stable since v107)
- `@ts-expect-error`: **12** (v111 said 11 -- +1 in storybook resizable.stories.tsx)
- FIXME/HACK: **0 genuine** (5 false positives from format strings)
- Biome `noConsole` is OFF

### P0.2 -- Prisma Generate + Validate in CI [MOSTLY RESOLVED in v105]

**Status:** ci.yml has explicit `pnpm --filter @repo/database exec prisma generate` (line 48) BEFORE typecheck, and `pnpm --filter @repo/database exec prisma validate` (line 63). **db-drift-check.mjs is still a no-op** (prints "DB drift check skipped (local dev)" and exits 0). Not called in any CI workflow.

**Resolved (v105):** prisma generate and validate are now explicit CI steps.
**Still open:** Replace no-op drift-check with real validation using `prisma migrate diff`.

### P0.3 -- Manifest Route Enforcement [RESOLVED -- DO NOT REOPEN]

**Status (v112 VERIFIED):** manifest-ci.yml has `manifest-route-audit` job with `--strict` mode. **86 active manifests, 6 disabled.** **248 allowlist entries, 167 kitchen exemptions.** Dual enforcement: static CI audit + runtime provenance verification (SHA-256 hash of IR in production). **93 POST routes bypass manifest** (all covered by allowlist/exemption). Manifest-runtime exemptions: 250.

### P0.4 -- CI/CD Pipeline: Comprehensive Fixes [PARTIALLY RESOLVED in v105]

**v105 RESOLUTIONS:**
- [x] Biome lint: `pnpm biome check` now in ci.yml (line 54)
- [x] prisma generate + validate: explicit steps in ci.yml (lines 48, 63)
- [x] CodeQL: all v4 everywhere
- [x] Trivy: pinned `@aquasecurity/trivy-action@0.28.0`
- [x] Concurrency groups: ci.yml, security.yml, deploy.yml
- [x] "Run linting" step runs BOTH `pnpm turbo typecheck` AND `pnpm biome check`

**STILL OPEN (v111 CONFIRMED):**
1. **E2E tests -- NO e2e-workflows job exists.** No `.github/workflows/e2e*.yml` at all.
2. **Lighthouse in performance.yml:** no dev server, `continue-on-error: true` (line 59). Clerk auth blocks meaningful results.
3. **Pre-push hook disabled:** `.husky/pre-push` = `exit 0`
4. **npm audit:** `continue-on-error: true` (security.yml line 46). Moderate+ vulns don't block.
5. **Node version inconsistency:** ci.yml/security.yml hardcode 22.18.0, others use .nvmrc, vercel-compat uses 22.x -- divergent behavior across workflows.
6. **3 workflows lack concurrency groups:** manifest-ci.yml, performance.yml, codeql.yml -- overlapping PRs waste CI minutes.
7. **vercel-compat.yml lacks explicit `prisma generate`** -- relies on implicit behavior from @repo/database build script.
8. **deploy.yml SKIP_ENV_VALIDATION on ALL deploy steps** -- env-variable schema changes not caught before deploy.
9. **SKIP_ENV_VALIDATION:** in 4 of 7 workflows (build steps only, except deploy.yml which has ALL steps).
10. **manifest-ci runs same test suite twice** (validate + tests)
11. **manifest-ci.yml excludes** cms/web/app from TS check
12. **Only 2 soft gates:** Lighthouse (performance.yml) and npm audit (security.yml)
13. **ci.yml build has 8 env vars** vs vercel-compat's 25 -- divergent build surface

### P0.5 -- [RESERVED -- DO NOT REOPEN]

### P0.6 -- Frontend Calls to Non-Existent API Routes [RESOLVED in v105 -- DO NOT REOPEN]

### P0.7 -- Calendar OAuth Tokens Stored Plaintext [NOT STARTED -- CRITICAL]

**Status:** `calendar/sync/connect/route.ts` stores `accessToken`/`refreshToken` as plaintext String @db.Text in `ProviderSync` model. **ZERO encryption infrastructure** in codebase.

**v109 FINDINGS (still open):**
- Callback routes use WRONG import: `@/lib/database` instead of `@repo/database`
- **No token refresh logic** -- expired tokens require full reconnection
- `store_tokens` action allows direct plaintext token injection via POST body
- `EmployeePin.pin_encrypted` is misleadingly named -- no encryption code exists
- **No RLS on ProviderSync**
- **Mobile responsiveness FAIL** -- no breakpoints below 768px (FR-701)
- **Reschedule bypasses manifest** dispatch (FR-504), no optimistic concurrency (FR-502)
- **Dual sync page implementations** -- sync/page.tsx uses bare Card (design system violation)

### P0.8 -- /api/public/ Auth Gating [RESOLVED in v105 -- DO NOT REOPEN]

---

## P1 -- High Priority

### P1.A -- Payroll Runtime Bugs [PARTIALLY RESOLVED in v105]

**RESOLVED (v105):**
- [x] EmployeeDeduction table mapping: correctly mapped
- [x] Federal bracket copies: separate brackets for Single, Married, HoH
- [x] Deductions double-parse: only one `JSON.parse` call found

**STILL CRITICAL (v111 CONFIRMED):**
- **Division by zero:** `PrismaPayrollDataSource.ts:303-304, 317-318` -- `regularPay / hoursRegular || 0` stores `Infinity`
- **Second div-by-zero:** `calculator.ts:326-327` -- NaN when postTaxTotal is 0
- **YTD SS wages PARTIALLY implemented:** type definitions exist in `taxEngine.ts` but may not be populated at call sites from `PrismaPayrollDataSource` -- SS over-collection possible for employees above wage base
- **tenant_payroll schema** referenced in `tax/list/route.ts:34,43,51,80` but NOT in schema.prisma -- RUNTIME CRASH
- **FUTA/SUTA:** ZERO implementation
- **Tax engine tests:** ZERO dedicated tests
- **24 routes**, **6 test files** (v110 said 7 -- WRONG)

### P1.B -- CRM Pipeline [v111 CORRECTED]

**Status:** **41 routes** (v110 said 42 -- WRONG). **41 BROKEN_PRISMA_READ patterns**, **68 raw SQL patterns**. **CrmScoringRule model EXISTS** but all 13 scoring calls still use raw SQL. **10 directories, ALL orphans.** **29 orphaned routes** with NO frontend consumer. **4 test files** + 1 E2E. No CRM spec.

### P1.C -- Console Statement Cleanup [911 -- STABLE]

**Breakdown (unchanged):**
- console.error: **530**, console.log: **345**, console.warn: **31**, console.info: **4**, console.debug: **1**
- **Total: 911** (stable since v106)
- @repo/observability: **402** imports, Biome `noConsole` OFF

### P1.D -- Design System: Shell Compliance

**v106 verified (unchanged):** Bare `<Card>` without tone: 37, Shadow violations: 239, `text-3xl`: 246, Pastel violations: 4, `border-b` tabs: 8, PageCanvas: 37, ResearchTable: 842.

### P1.E -- TypeScript Strictness [v112: METRIC CORRECTIONS]

**v112 CORRECTED (hand-written production code, excluding generated/test files):**
- `as any`: **150** (v111 said 142 -- +8; breakdown: apps=41, manifest packages=90, other packages=19)
- `: any`: **apps-only=20** (v111's 53 was a subset measure; manifest packages=115, generated Prisma=463)
- `@ts-ignore`: **0** (stable since v107)
- `@ts-expect-error`: **12** (v111 said 11 -- +1 in storybook resizable.stories.tsx)
- FIXME/HACK: **0 genuine**
- `noUncheckedIndexedAccess`: NOT SET -- major gap
- `skipLibCheck: true` in base tsconfig + inherited by all 40+ tsconfigs

### P1.F -- Accounting: Structural Gaps [17 routes]

**v111 CONFIRMED:**
- Financial reports expenses **HARDCODED TO ZERO** at `financial-reports/route.ts:193, 258-262` (`.reduce(() => 0, 0)`)
- Journal entries / general ledger: **MISSING ENTIRELY** (no JournalEntry or GeneralLedger models)
- Bank reconciliation: **FULLY SIMULATED** (modulo distribution, fake variance)
- Double-entry bookkeeping: **NOT IMPLEMENTED** (ChartOfAccount is taxonomy only, no posting layer)
- **10 test files** (none for financial-reports or bank-reconciliation), RLS **100%**

### P1.G -- Inventory Route Manifest Gap [58 routes]

**v111 CORRECTED:** **58 routes** (v110 said 57 -- WRONG by +1). Frontend has **18 consumers**. **2 duplicate PO route pairs** across inventory/ and procurement/ with divergent imports. **18 raw SQL** instances (all safe). **6 test files**. 4 active manifest files.

### P1.H -- BROKEN_PRISMA_READ Pattern [v111]

**Pattern:** Writes via `executeManifestCommand`/`runtime.runCommand` (Manifest -> PrismaStore), reads query Prisma directly.

**Domains using manifest commands:** accounting, administrative, collaboration, command-board, communications, crm, events, inventory, kitchen, lead, manifest, payroll, procurement, rolepolicy, settings, shipments, smsautomationrule, staff, timecards, training

**93 POST routes bypass manifest** with direct DB writes (all covered by allowlist/exemption per P0.3).

### P2.A -- Calendar (8 routes, ~57% spec compliance)
- [x] Drag-and-drop (dnd-kit) -- **IMPLEMENTED** with PointerSensor + TouchSensor
- [x] Entry-type taxonomy -- `deadline`/`reminder` REMOVED from API union; three-type enum correct
- [x] Reschedule route EXISTS at `/api/calendar/reschedule`
- [ ] OAuth tokens PLAINTEXT -- escalated to P0.7
- [ ] Callback routes inconsistent import (`@/lib/database` barrel vs `@repo/database`)
- [ ] No token refresh logic -- expired tokens require full reconnection
- [ ] `store_tokens` allows plaintext injection via POST body
- [ ] **No RLS on ProviderSync**
- [ ] Reschedule lacks optimistic concurrency (FR-502), bypasses manifest dispatch (FR-504)
- [ ] Mobile responsive FAIL -- grid-cols-7 always, no breakpoints < 768px (FR-701)
- [ ] **Calendar sync page uses bare `<Card>` imports** -- FR-102 violation (lines 6-10, 210-226 in sync/page.tsx)
- [ ] **Calendar List view is STUB ONLY** -- no ResearchTable implementation (FR-603)
- [ ] **Calendar Schedule tab** -- FR-602 says remove or implement; status unclear
- **20/34 MET (57%), 7 PARTIAL, 7 NOT MET**

### P2.B -- Accounting (17 routes)
- [x] Invoicing, payments, revenue recognition, collections
- [ ] Financial reports expenses HARDCODED TO ZERO (P1.F)
- [ ] Journal entries / general ledger: MISSING. Bank reconciliation: SIMULATED
- **10 test files** (none for financial-reports, bank-reconciliation)

### P2.C -- Contracts (18 route files across 6 directories)

**Spec compliance: ~21% MET (7/34), ~41% MET+PARTIAL**
- [x] 8 EventContract commands, 10 VendorContract commands (manifest IR) -- **v113 VERIFIED: EventContract has 10 entries (8 commands + list/detail), VendorContract has 12 (10 commands + list/detail) in manifest IR**
- [x] Deep URL `/contracts/[contractId]` EXISTS -- gap CLOSED
- [x] Public signing surface EXISTS at `/sign/contract/[token]/` (not `/sign/[signingToken]` as spec says)
- [x] `cron/contract-expiration-alerts` IS in vercel.json (0 7 * * *) -- was NOT missing
- [ ] **canceled/cancelled spelling split** -- validation.ts uses "canceled", manifest/status uses "cancelled"
- [ ] **Sign route race condition** -- findFirst + no transaction
- [ ] **Public signing URL mismatch** -- spec says `/sign/[signingToken]`, implementation is `/sign/contract/[token]/`
- [ ] **Sign returns 400 not 409** -- violates FR-503
- [ ] **VendorContract renew wrong** -- updates endDate instead of creating new row
- [ ] **VendorContract command HTTP endpoints** -- no dedicated dirs; all go through generic `/api/manifest/[entity]/commands/[command]`. AGENTS.md claim of dedicated dirs was FABRICATED
- [ ] **FR-504/FR-603 NOT MET** -- no notification, no autoRenew logic

### P2.D -- Events (87 routes -- ~6% spec compliance)

**Spec coverage: ~6% fully MET** (2/35 FRs), ~24% with partial.

**v113 VERIFIED (all still open):**
- **Battle board architecturally wrong** -- implemented as Gantt-chart editor (battle-board-editor-client.tsx), spec requires collaborative dish-voting with Nominated/Voting/Finalized columns. FR-5xx entirely inapplicable.
- **Report template system not implemented** -- EventReport has no templateId field, no 5 canonical templates
- **ContactFormCard NOT used** -- FR-105 NOT MET
- **Card ladders** in lazy-event-explorer.tsx and menu-intelligence-section.tsx -- FR-201 violation
- **23 raw `fetch()` calls** bypass `apiFetch`
- `EventSummary.confidence`: **CONFIRMED MISSING** from schema (model has no confidence field)
- `Event.importWorkflowId`: **CONFIRMED MISSING** -- EventImportWorkflow model doesn't exist (0 hits in schema)
- Budget URL: singular `/budget` vs spec requires plural `/budgets`
- Routes: **87**, Test files: **16**, Frontend pages: **26**

### P2.E -- Kitchen (148 routes)

**v111 CONFIRMED:**
- **45 subdirectories**, **15 singular/plural duplicate pairs** = **30 dead routes**
- **18 manifests**, **167 exemptions**, **37 test files**
- **49 direct DB calls bypassing manifest**, **~70 routes (47%) have NO frontend consumer**
- **31 frontend pages**, **~95/148 = 64% orphan rate**
- **NO spec document** -- biggest spec gap

### P2.F -- Logistics (5 routes)
- GPS simulated with hardcoded LA coordinates + `Math.random()`
- 1 test, 5 frontend refs, no spec

### P2.G -- Staffing (2 routes)
- [x] Coverage + Recommendations APIs implemented
- [ ] CoverageBar: **3 inline div patterns** -- NOT a component
- [ ] **5 queryRawUnsafe** in coverage routes (cast results with `as any[]`)
- [ ] LaborBudget: model EXISTS, endpoints under `/api/staff/budgets/`

### P2.H -- Staff (35 production routes)
- Clean: no BROKEN_PRISMA_READ, no queryRawUnsafe, no TODOs
- **12 subdomains**, **21 scheduling-related routes**, **10 frontend consumers**
- **Staff orphans: 21/35 = 60%**

### P2.I -- Settings (10 routes)
- [x] Audit log, API key revocation, role assignment, integrations, role policies, rate limits
- [ ] AlertsConfig frontend calls wrong path
- [ ] Billing P3/blocked -- no Subscription/Plan/Tier/BillingAccount models

### P2.J -- Analytics (5 routes)
- **22 raw SQL** across all 5 route files (heaviest raw-SQL domain). 0 tests, 5 frontend refs, no spec.

### P2.K -- Marketing (3 routes)
- Spec EXISTS at `specs/marketing/SPEC.md`. 1 frontend consumer, 2 test files.

### P2.L -- Command Board (22 routes)
**Frontend EXISTS at `apps/app/app/(authenticated)/command-board/` (page.tsx + [id] + new-board-dialog.tsx). 6 test files. 2 stub routes returning 501** (shareId/isPublic fields missing). **21/22 = 95% orphan rate** (highest of any domain). API surface complete: boards, cards, connections, groups, layouts, replay, simulations, templates. 11 spec files exist but most describe vision/roadmap, not implementation requirements.

### P2.M -- Knowledge Base (3 routes) -- 2 tests, 2 frontend refs, no spec
### P2.N -- Integrations (25 routes) [v112 MAJOR CORRECTION]

**v112 CORRECTION:** v111 said 5 routes -- was 5x UNDERCOUNTED. Actual: **25 routes** across 4 subdomains.

**Full inventory:**
- **goodshuffle:** 9 routes (config, events, inventory, inventory/sync, invoices, invoices/sync, status, sync, test)
- **nowsta:** 6 routes (config, employees/map, employees, status, sync, test)
- **quickbooks:** 1 route (history)
- **webhooks:** 9 routes (delivery-logs, dlq/[id]/resolve, dlq/[id]/retry, dlq/[id], dlq, [id], retry, trigger, root)
### P2.O -- Training (7 routes) -- **15 raw SQL** across 4 files, 3 test files, TODO spec. **ZERO frontend pages** (no `/training/` directory in authenticated app). API-only: modules (list, [id]), assignments (list, [id]), complete. Spec is planning document (not Cohere-aligned).

### P2.P -- Search [RESOLVED -- DO NOT REOPEN]
### P2.Q -- Procurement (24 routes) [CLARIFIED: vendor-contracts via manifest]
**Vendor-contracts: ZERO dedicated command route directories.** AGENTS.md says 10 dedicated HTTP dirs -- FABRICATED. However, all 12 VendorContract commands (10 commands + list/detail) DO exist in the manifest IR and are callable via the generic `/api/manifest/[entity]/commands/[command]` route. Frontend calls to `/api/procurement/vendor-contracts/commands/*` WILL 404 -- frontend should use the manifest route instead. 5 test files.

### P2.R -- Timecards (10 routes) -- 4 Prisma models, 1 test (1,765 lines), no specs, no manifests

### P2.S -- Documents (1 route) -- has API consumers (DO NOT REOPEN)
### P2.T -- Catering [NOT a ghost domain -- DO NOT REOPEN]
### P2.U -- Warehouse (2 routes, GET-only)

### P2.V -- Communications/Collaboration Fragmentation
- Communications: **7 routes**, Collaboration: **17 routes**, Notifications: dismissed state NOT in DB, SMS fragmented across 3 modules

### P2.W -- Frontend Module Design System
### P2.X -- Unlisted Domains

**v112 domain route counts:**
Kitchen 148, Events 87, Inventory 58, CRM 41, Staff 35, **Integrations 25**, Procurement 24, Payroll 24, Command-board 22, Collaboration 17, Accounting 17, Administrative 13, Timecards 10, Settings 10, Shipments 9, Calendar 8, Training 7, Rolepolicy 7, Communications 7, Cron 6, Logistics 5, Facilities 5, Analytics 5, Public 4, AI 4, Mobile 3, Knowledge-base 3, Warehouse 2, User 2, Staffing 2, Smsautomationrule 2, Activity-feed 2, +16 single-route domains. **Total: 632 across 50 domains.**

**Dead/Zombie:** sales-reporting (ALIVE -- has full POST endpoint with auth and tests), user-preferences (1 route, no UI).

### P2.Y -- Payroll (24 routes -- runtime bugs at P1.A, 6 test files)

### P2.Z -- Security Coverage [v112]

| Metric | v111 | v112 | Notes |
|---|---|---|---|
| RLS tables / total | **86/223** | **86/223** | STABLE at 38.6% |
| queryRawUnsafe | **53** | **54** | v112 CORRECTION (+1 new bottleneck-detector) |
| Raw fetch() bypass | **50** | **50** | STABLE |
| POST routes bypassing manifest | **86** | **93** | v112 CORRECTION (+7 new direct-write POST routes) |
| DEFAULT schema models 0% RLS | **21** | **21** | STABLE |
| Orphan routes | **~270/622** | **~280/632** | v112 CORRECTION (total routes now 632) |
| Active manifests | **86** | **86** | STABLE |
| Allowlist entries | **248** | **248** | STABLE |

**Per-schema RLS (v111 CONFIRMED):**
- tenant_accounting: **100%**, tenant_facilities: **100%**, tenant_logistics: **100%**
- tenant_crm: **66%**, tenant_inventory: **53%**, tenant_staff: **38%**
- tenant_kitchen: **29%** (worst large schema), tenant_events: **26%**, tenant_admin: **18%**
- bare tenant: **12%** (1/8) -- HIGH RISK
- **DEFAULT/public: 21 models -- 0% RLS -- HIGH RISK**
- **core, platform schemas: 0% RLS -- HIGH RISK**

---

## TODOs / Placeholders in Production Code [v111 NEW]

| Domain | Location | Issue | Severity |
|---|---|---|---|
| Command-board | 2 routes | Returning 501 (shareId/isPublic fields missing) | MEDIUM |
| Logistics tracking | `logistics/tracking/route.ts` | Simulated GPS with `Math.random()` + hardcoded LA coords | HIGH |
| Accounting bank-reconciliation | reconciliation routes | Simulated statement balance (fake variance) | HIGH |
| Events documents | ~40 lines commented-out | Import porting blocker prevents document handling | MEDIUM |
| Inventory supplier-sync | route exists | No `SupplierSyncHistory` model -- sync state untracked | MEDIUM |
| CRM | various routes | No Employee model -- `userId` used as `employeeId` | MEDIUM |
| Supplier connectors | US Foods, Charlies Produce | Complete stubs -- zero real API integration | LOW |
| Inventory forecast | `libs/inventory-forecast` | Entire client is placeholder | MEDIUM |
| Payroll tax brackets | production code | `mockEmployee` in production code path | HIGH |

---

## P3 -- Lower Priority

### P3.A -- Dead Package Cleanup

**Dead (zero runtime imports):** @repo/ai, @capsule/brand, @repo/kitchen-state-transitions

**Alive (DO NOT REOPEN):** @repo/mcp-server, sales-reporting, @repo/event-parser, @repo/storage, @repo/payroll-engine, @repo/pdf, @repo/realtime, @repo/supplier-connectors

**Package stats:** 35 packages total. **25 without any test files.**

**Stale files:** `apps/app/package.json.bak`, `apps/api/vitest.config.ts.bak2` -- should be removed

### P3.B -- Spec Gap Analysis (v113 FULL AUDIT)

**47 spec files** across 10 directories. Key domain specs: calendar, command-board (11 files), contracts, events, marketing, staffing, training. Plus extensive manifest specs (15+ files). General specs (8 files). 3 TODO specs: training-hrms, nowsta-integration, sms-notification-system. 1 TODO integration spec: webhook-outbound-integrations.

#### v113 Spec-by-Spec Compliance Audit

**Calendar (8 API routes, SPEC at `specs/calendar/SPEC.md`)**

| FR | Status | Finding |
|---|---|---|
| FR-101 PageCanvas shell | PARTIAL | Landing page exists. Sync page uses bare `<Card>` imports (lines 6-10, 210-226) -- spec violation |
| FR-301 entry-type taxonomy | PARTIAL | `deadline`/`reminder` removed from API union (verified 0 grep hits). Three-type enum correct |
| FR-501 reschedule API | MET | `/api/calendar/reschedule` route exists |
| FR-502 optimistic concurrency | NOT MET | No `expectedVersion` / 409 stale_version enforcement confirmed in v109 |
| FR-504 manifest dispatch | NOT MET | Reschedule bypasses manifest (v109 confirmed) |
| FR-603 List view | PARTIAL | Calendar page references "list views" (line 233) but no List tab component with ResearchTable exists |
| FR-604 token encryption | NOT MET | P0.7 -- OAuth tokens still plaintext |
| FR-701 mobile responsive | NOT MET | No breakpoints below 768px for grid |
| **Overall** | **~57% MET (20/34)** | **7 PARTIAL, 7 NOT MET** -- unchanged from v112 |

**Events (87 routes, SPEC at `specs/events/SPEC.md`)**

| FR | Status | Finding |
|---|---|---|
| FR-101 events list shell | MET | `/events/page.tsx` is the 3/3 reference implementation |
| FR-102 event detail shell | PARTIAL | Detail page exists at `/events/[eventId]/` but sub-tab composition varies |
| FR-106 battle-board | WRONG TYPE | Implemented as Gantt-chart editor (battle-board-editor-client.tsx), spec requires collaborative dish-voting with three columns (Nominated/Voting/Finalized). **Architectural mismatch** |
| FR-201 Card ladder | NOT MET | lazy-event-explorer.tsx and menu-intelligence-section.tsx have Card ladders |
| FR-301 data contract | PARTIAL | Most entities exist: Event, EventBudget, BudgetLineItem, EventContract, ContractSignature, EventStaff, EventGuest, EventDish, EventReport, BattleBoard, AllergenWarning. **MISSING:** EventSummary.confidence (no field), EventProfitability (no dedicated model), EventImportWorkflow (no model), Proposal/ProposalLineItem (no dedicated models -- may be virtual) |
| FR-304 EventSummary.confidence | NOT MET | EventSummary model has NO `confidence` field (verified in schema.prisma) |
| FR-404 Event.importWorkflowId | NOT MET | Event model has NO `importWorkflowId` field (0 grep hits in schema.prisma) |
| FR-601 report templates | NOT MET | EventReport has `reportConfig` JSON but no `templateId` field; no 5 canonical template types |
| **Overall** | **~6% fully MET (2/35)** | **13 PARTIAL, 12 NOT MET** -- unchanged from v112. New: EventSummary.confidence confirmed MISSING, Event.importWorkflowId confirmed MISSING |

**Contracts (18 route files, SPEC at `specs/contracts/SPEC.md`)**

| FR | Status | Finding |
|---|---|---|
| FR-101 contracts landing | MET | `/contracts/page.tsx` + `contracts-page-client.tsx` exist with detail pages |
| FR-102 deep URL `/contracts/[contractId]` | MET | `[contractId]/page.tsx` exists -- deep URL gap CLOSED (was spec's main gap) |
| FR-302 manifest discovery | PARTIAL | EventContract has 10 commands in manifest IR (cancel, create, expire, markViewed, send, sign, softDelete, update + list/detail). VendorContract has 12 commands (activate, approve, create, recordSlaBreach, reject, renew, submit, terminate, update, updateCompliance + list/detail). **BUT:** No dedicated HTTP route directories -- all go through generic `/api/manifest/[entity]/commands/[command]`. AGENTS.md claim of 10 dedicated vendor-contracts command dirs is FABRICATED |
| FR-501 public signing at `/sign/[signingToken]` | PARTIAL | Public signing EXISTS at `/sign/contract/[token]/` (not `/sign/[signingToken]` as spec says). Uses `contract-signing-client.tsx`. **URL mismatch** with spec |
| FR-503 signing idempotency | PARTIAL | Signing route uses `executeManifestCommand` (verified line 23). Sign returns standard response; 409 enforcement unclear |
| FR-601 cron contract-expiration-alerts | MET | `cron/contract-expiration-alerts` IS in vercel.json (schedule: `0 7 * * *`). AGENTS.md was stale saying it was missing |
| FR-206 raw SQL replacement | NOT VERIFIED | Spec says `/events/contracts/page.tsx` raw SQL must be replaced. Not verified this session |
| canceled/cancelled spelling | NOT MET | Spec notes validation.ts uses "canceled", manifest/status uses "cancelled" |
| **Overall** | **~21% MET (7/34)** | **7 PARTIAL, 20 NOT MET** -- key improvement: deep URL gap CLOSED, public signing EXISTS but at wrong URL. Manifest commands ALL exist in IR |

**Marketing (3 API routes, SPEC at `specs/marketing/SPEC.md`)**

| FR | Status | Finding |
|---|---|---|
| FR-101 landing shell | MET | `/marketing/page.tsx` -- v112 reported it clean (no text-3xl, no Card). Frontend pages exist: campaigns, email-workflows, leads/[leadId], sms-rules, analytics |
| FR-102 leads list | MET | `/marketing/leads/leads-page-client.tsx` + detail at `/marketing/leads/[leadId]/lead-detail-client.tsx` |
| FR-401 Campaign model | DEFERRED | No Campaign Prisma model (spec marks DEFERRED). Tag-based grouping not implemented either |
| FR-602 marketing analytics API | PARTIAL | `/api/marketing/analytics` exists but scope unverified |
| FR-505 rate limiting on public form | NOT VERIFIED | Rate limiting config not verified |
| **Overall** | **~60% MET** | **Highest spec compliance of any domain.** Full page tree implemented. Campaign model deferred per spec |

**Staffing (2 API routes, SPEC at `specs/staffing/SPEC.md`)**

| FR | Status | Finding |
|---|---|---|
| FR-101 landing shell | PARTIAL | `/staffing/page.tsx` near-3/3. layout.tsx still has border-b tabs (one of 4 remaining FR-204 violations) |
| FR-201 text-3xl font-bold | NOT MET | staffing-recommendations-client.tsx still has text-3xl opener |
| FR-202 bg-red-50 pastel | NOT MET | staffing-recommendations-client.tsx still uses bg-red-50/border-red-500 for errors |
| FR-204 border-b tab strip | NOT MET | staffing/layout.tsx:28 still has border-b tabs |
| FR-401 CoverageBar primitive | NOT MET | No CoverageBar component authored; 3 inline div blocks remain in staffing/page.tsx |
| FR-501 recommendations form | PARTIAL | Form exists but uses bare Card instead of ContactFormCard |
| **Overall** | **~40% MET** | **Key gaps are design-system violations, not functional.** All pages exist, APIs work |

**Command Board (22 routes, 11 spec files at `specs/command-board/`)**

| Item | Status | Finding |
|---|---|---|
| boardspec.md | PARTIAL | Board editor exists at `apps/app/app/(authenticated)/command-board/`. API has boards, cards, connections, groups, layouts, replay, simulations, templates |
| SPEC_entity-browser.md | NOT MET | Entity browser UI not verified |
| SPEC_entity-detail-panel.md | PARTIAL | Detail panel exists in board editor |
| SPEC_connections.md | PARTIAL | Connections API exists at `/api/command-board/[boardId]/connections/` |
| SPEC_ui-polish.md | NOT MET | Still 21/22 = 95% orphan rate |
| SPEC_product-direction.md | VISION | Not implementable as-is -- roadmap document, not spec |
| STATUS.md | STALE | May reference old paths |
| **Overall** | **~30% MET** | **API surface complete (22 routes). UI has 95% orphan rate. 2 routes return 501** |

**Training (7 API routes, TODO spec at `specs/training-hrms_TODO/SPEC.md`)**

| FR | Status | Finding |
|---|---|---|
| Training Module Completion | PARTIAL | API routes exist: `/api/training/modules/`, `/api/training/assignments/`, `/api/training/complete/`. No frontend pages (no `/training/` directory in authenticated app) |
| Certification Tracking | NOT MET | No certification management UI |
| Secure PIN Management | PARTIAL | EmployeePin model exists but spec says encryption is misleading (no encryption code) |
| **Overall** | **~25% MET** | **API-only. Zero frontend. 15 raw SQL across 4 files. Spec is marked TODO** |

**TODO Specs (no implementation, spec as planning documents):**

| Spec | Status | Implementation |
|---|---|---|
| `specs/nowsta-integration_TODO/nowsta-integration.md` | PLANNING | 6 API routes at `/api/integrations/nowsta/`. Spec is outcome-only, not Cohere-aligned |
| `specs/sms-notification-system_TODO/sms-notification-system.md` | PLANNING | 2 routes at `/api/smsautomationrule/`. Spec is outcome-only |
| `specs/webhook-outbound-integrations_TODO/webhook-outbound-integrations.md` | PLANNING | 9 routes at `/api/integrations/webhooks/`. Spec is outcome-only |

#### Spec-to-Implementation Discrepancies (NEW in v113)

| Discrepancy | Spec Says | Implementation | Impact |
|---|---|---|---|
| Public signing URL | `/sign/[signingToken]` | `/sign/contract/[token]/` | URL mismatch; spec update needed |
| VendorContract command dirs | AGENTS.md says 10 HTTP dirs | ZERO dedicated dirs; all via generic manifest route | AGENTS.md FABRICATED; commands DO exist in manifest IR |
| EventSummary.confidence | FR-304 requires `confidence: float` | Model has NO confidence field | Spec requires schema change |
| Event.importWorkflowId | FR-404 requires field | Model has NO importWorkflowId field | Spec requires schema change |
| Battle board | FR-106: collaborative dish-voting 3-column | Gantt-chart editor | **Architectural mismatch** -- spec vs implementation diverged |
| EventReport templates | FR-601: 5 canonical templates | No templateId field; status-based workflow only | Spec requires schema change |
| cron/contract-expiration-alerts | AGENTS.md said MISSING | IS in vercel.json (0 7 * * *) | AGENTS.md STALE -- already corrected |
| Calendar sync page | FR-102: CapabilityCard | Uses bare `<Card>` imports (6-10, 210-226) | Design system violation |
| Calendar List view | FR-603: ResearchTable | No List tab implementation | Stub only |
| Calendar Schedule tab | FR-602: remove or implement | Status unclear -- tab may still render | |

#### Domains WITHOUT Specs (HIGHEST priority to author)

| Domain | Routes | Orphans | Priority |
|---|---|---|---|
| Kitchen | 148 | 95 (64%) | HIGHEST -- biggest domain, 18 manifests, no spec |
| Inventory | 58 | -- | HIGH -- second biggest unspecced domain |
| CRM | 41 | 31 (76%) | HIGH -- 29 orphans, 68 raw SQL |
| Staff | 35 | 21 (60%) | HIGH -- 12 subdomains |
| Payroll | 24 | -- | HIGH -- runtime bugs (P1.A) |
| Procurement | 24 | -- | MEDIUM -- vendor-contracts gap |
| Accounting | 17 | -- | MEDIUM -- expenses zeroed, journal MISSING |
| Collaboration | 17 | -- | MEDIUM -- NO frontend pages |
| Timecards | 10 | -- | LOW -- 1 test, no manifests |
| Analytics | 5 | -- | LOW -- 22 raw SQL, 0 tests |
| Logistics | 5 | -- | LOW -- GPS simulated |
| Facilities | 5 | -- | LOW -- RLS 100% |
| Communications | 7 | -- | LOW -- NO frontend pages |
| Shipments | 9 | -- | LOW -- NO frontend pages |
| Administrative | 13 | -- | LOW |

### P3.C -- Cron HTTP Method Inconsistency
**8 cron jobs** in vercel.json (stable). AGENTS.md registry says 6 -- STALE.

### P3.D -- Route Architecture (v112)

| Metric | v111 | v112 | Notes |
|---|---|---|---|
| Route files | **~622** | **632** | v112 CORRECTION (+10 routes added since v111) |
| Manifest-using routes | **341** | **341** | STABLE |
| Active manifests | **86** | **86** | STABLE |
| Disabled manifests | **6** | **6** | STABLE |
| Allowlist entries | **248** | **248** | STABLE |
| Kitchen exemptions | **167** | **167** | STABLE |
| Domains | **50** | **50** | STABLE |

### P3.E -- AGENTS.md Corrections Needed (v112)

**v112 METRIC CORRECTIONS (highest priority updates):**
1. `as any`: **150** (v111 said 142 -- +8; breakdown: apps=41, manifest=90, other=19)
2. `: any`: **apps-only=20** (v111 said 53 which was a specific subset; manifest=115, generated=463)
3. queryRawUnsafe: **54** (v111 said 53 -- +1 new bottleneck-detector)
4. Total routes: **632** (v111 said ~622 -- +10 added)
5. Integrations routes: **25** (v111 said 5 -- MAJOR CORRECTION, 5x undercounted)
6. Package test files: **72** (v111 said 64 -- +8 new tests)
7. Total test files: **275** = 139 API + 72 pkg + 64 E2E (v111 said 267)
8. POST routes bypassing manifest: **93** (v111 said 86 -- +7 new direct-write routes)
9. test.skip in E2E: **41** (v111 implied 72 -- 31 skips removed/fixed)
10. `@ts-expect-error`: **12** (v111 said 11 -- +1 in storybook resizable.stories.tsx)
11. Inventory routes: **58** (stable)
12. CRM routes: **41** (stable)
13. Payroll test files: **6** (stable)
14. E2E test files: **64** (stable)
15. YTD SS wages: **PARTIALLY implemented** (types exist, call-site population unclear)
16. Vitest configs: **15 files** (stable)
17. Console total: **911** (stable)
18. `@ts-ignore`: **0** (stable)
19. RLS: **86/223 = 38.6%** (stable)
20. Kitchen routes: **148** (stable)
21. Events routes: **87** (stable)
22. Staff routes: **35** (stable)
23. Marketing routes: **3** (stable)
24. Calendar dnd-kit: **IMPLEMENTED** (stable)
25. Cron jobs: **8** in vercel.json (stable)
26. CRM BROKEN_PRISMA_READ: **41** (stable)
27. Contracts: 18 files/6 dirs, spelling split, sign race, VendorContract MISSING (stable)
28. 21 DEFAULT schema models with 0% RLS (stable)
29. Allowlist entries: **248** (stable)
30. POST bypass: **93** (all covered by allowlist/exemption)
31. Active manifests: **86**, disabled: **6** (stable)

### P3.F -- Test Infrastructure (v112 -- BREAKDOWN CORRECTED)

- **275 test files** (139 API + 72 packages + 64 E2E) -- v112 CORRECTION (v111 said 267, package count was wrong)
- **41 test.skip** in E2E -- v112 CORRECTION (v111 said 72 -- 31 skips removed/fixed)
- **5 describe.skip** (sales-reporting + 4 event-timeline command tests)
- **2 stub routes** returning 501 (command-board templates)
- **Vitest configs: 15 files** (stable), including .bak2
- Pre-push hook disabled (exit 0)

### P3.G -- Raw fetch() Bypassing apiFetch
**50 raw `fetch()` calls** in `(authenticated)/` bypass `apiFetch`. Highest in events (23 calls).

### P3.H -- Stale Backup Files
- `apps/app/package.json.bak` -- should be removed
- `apps/api/vitest.config.ts.bak2` -- should be removed

---

## Orphan Route Analysis (v112)

**Total: ~280 of 632 routes are ORPHANS.**

| Domain | Total Routes | Orphans | Orphan % | Root Causes |
|---|---|---|---|---|
| Command-board | 22 | 21 | **95%** | Near-total dead code |
| CRM | 41 | 31 | **76%** | Duplicate entity routes, raw SQL scoring |
| Kitchen | 148 | 95 | **64%** | 15 dup pairs (30 dead), 45 subdirs |
| Events | 87 | 54 | **62%** | CQRS commands, unfinished features |
| Staff | 35 | 21 | **60%** | Scheduling subdomain unconsumed |

---

## Code Quality Metrics (v112)

| Metric | v111 | v112 | Status |
|---|---|---|---|
| Route files | **~622** | **632** | v112 CORRECTION (+10 added) |
| `as any` production | **142** | **150** | v112 CORRECTION (+8; apps=41, manifest=90, other=19) |
| `: any` production | **53** | **apps-only=20** | v112 REFINEMENT (v111 measured subset; manifest=115, generated=463) |
| `@ts-ignore` | **0** | **0** | STABLE |
| `@ts-expect-error` | **11** | **12** | v112 CORRECTION (+1 in storybook) |
| queryRawUnsafe | **53** | **54** | v112 CORRECTION (+1 new bottleneck-detector) |
| Raw fetch() | **50** | **50** | STABLE |
| Console total | **911** | **911** | STABLE |
| API test files | **139** | **139** | STABLE |
| Package test files | **64** | **72** | v112 CORRECTION (+8 new tests) |
| E2E spec files | **64** | **64** | STABLE |
| Total test files | **267** | **275** | v112 CORRECTION (139+72+64) |
| RLS tables/total | **86/223** | **86/223** | STABLE (38.6%) |
| Inventory routes | **58** | **58** | STABLE |
| CRM routes | **41** | **41** | STABLE |
| Payroll test files | **6** | **6** | STABLE |
| Kitchen routes | **148** | **148** | STABLE |
| Events routes | **87** | **87** | STABLE |
| Vitest config files | **15** | **15** | STABLE |
| Integrations routes | **5** | **25** | **v112 MAJOR CORRECTION** (5x undercounted) |
| POST bypass manifest | **86** | **93** | v112 CORRECTION (+7) |
| E2E test.skip | **72** | **41** | v112 CORRECTION (31 removed/fixed) |

---

## RLS Coverage (v112)

**86 tables** with RLS out of **223** total = **38.6%**. 137 tables without RLS.

**Per-schema RLS:** tenant_accounting/facilities/logistics: **100%**. tenant_crm: **66%**. tenant_inventory: **53%**. tenant_staff: **38%**. tenant_kitchen: **29%** (worst large schema). tenant_events: **26%**. tenant_admin: **18%**. bare tenant: **12%**. DEFAULT/public: **21 models 0% RLS**. core/platform: **0% RLS**.

---

## Security Summary (v112)

- **Calendar OAuth tokens PLAINTEXT** (P0.7) -- no encryption infrastructure, no RLS on ProviderSync
- **Auth coverage:** ~96.8% middleware -- RLS only ~38.6%
- **54 `queryRawUnsafe`** across codebase (all parameterized, no injection risk)
- **Contracts:** spelling split, race condition, public sign bypasses manifest, 400 not 409, renew wrong, 10 command routes MISSING
- **Procurement vendor-contracts frontend calls 404 routes**
- **86 RLS tables** (38.6%) -- 137 without RLS
- **21 models in DEFAULT schema with 0% RLS** -- HIGH RISK
- **core/platform schemas: 0% RLS** -- HIGH RISK
- **Pre-push hook disabled** (exit 0)
- **E2E CI: NO e2e-workflows job**
- **93 POST routes bypass manifest** (all covered by allowlist/exemption)
- **Payroll div-by-zero** stores Infinity, YTD SS partially implemented, tenant_payroll MISSING

---

## Route Inventory (v112)

| Domain | Routes | Orphans | Spec | Notes |
|---|---|---|---|---|
| Kitchen | 148 | 95 (64%) | NONE | 18 manifests, 15 dup pairs, 49 direct DB, 37 tests, 167 exemptions |
| Events | 87 | 54 (62%) | EXISTS | ~6% MET; confidence MISSING; importWorkflowId MISSING; 23 raw fetch() |
| Inventory | 58 | ~28 | NONE | 18 consumers; 2 dup PO pairs; 18 raw SQL; 6 tests |
| CRM | 41 | 31 (76%) | NONE | 41 BROKEN_PRISMA_READ, 68 raw SQL, 10 dirs ALL orphans |
| Staff | 35 | 21 (60%) | NONE | 12 subdomains; 21 scheduling; clean |
| **Integrations** | **25** | -- | PARTIAL | **v112 MAJOR CORRECTION** (v111 said 5); goodshuffle(9), nowsta(6), quickbooks(1), webhooks(9) |
| Payroll | 24 | ~8 | NONE | tenant_payroll MISSING; div-by-zero; YTD SS; FUTA/SUTA zero; 6 tests |
| Procurement | 24 | ~11 | NONE | Vendor-contracts ZERO cmd dirs; frontend calls 404 |
| Command-board | 22 | 21 (95%) | EXISTS | 2 routes 501; 6 tests |
| Accounting | 17 | ~7 | NONE | Expenses zero; journal/ledger MISSING; reconciliation SIMULATED; RLS 100% |
| Collaboration | 17 | ~8 | NONE | Fragmented; NO frontend pages, NO API consumers |
| Administrative | 13 | -- | NONE | -- |
| Timecards | 10 | -- | NONE | 4 Prisma models, 1 test, no manifests |
| Settings | 10 | -- | -- | -- |
| Shipments | 9 | -- | NONE | 11 BROKEN_PRISMA_READ; NO frontend pages, NO API consumers |
| Calendar | 8 | -- | EXISTS | OAuth plaintext (P0.7); dnd-kit IMPLEMENTED; ~57% MET |
| Training | 7 | -- | DRAFT | 15 raw SQL; NO frontend pages, NO API consumers |
| Rolepolicy | 7 | -- | NONE | -- |
| Communications | 7 | -- | NONE | NO frontend pages, NO API consumers |
| Cron | 6 | -- | -- | 8 entries in vercel.json |
| Logistics | 5 | -- | NONE | GPS simulated; 1 test |
| Facilities | 5 | -- | NONE | RLS 100% |
| Analytics | 5 | -- | NONE | 22 raw SQL; 0 tests |
| Public | 4 | -- | -- | -- |
| AI | 4 | -- | -- | -- |
| Mobile | 3 | -- | -- | -- |
| Knowledge-base | 3 | -- | NONE | 2 tests |
| Marketing | 3 | -- | EXISTS | -- |
| Warehouse | 2 | -- | NONE | GET-only |
| User | 2 | -- | -- | -- |
| Staffing | 2 | -- | EXISTS | 5 queryRawUnsafe |
| Smsautomationrule | 2 | -- | -- | -- |
| Activity-feed | 2 | -- | -- | -- |
| +16 single-route domains | 16 | -- | -- | -- |
| **Total** | **632** | **~280** | | **50 domains** |

**Handler counts:** 242 POST, 461 GET, 32 PUT, 22 PATCH, 41 DELETE (798 total handlers)

---

## Verification Commands (v112)

```bash
# @ts-expect-error (v112: 12)
grep -rn '@ts-expect-error' --include='*.ts' --include='*.tsx' apps/ packages/ --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=dist --exclude-dir=generated

# @ts-ignore (v112: 0)
grep -rn '@ts-ignore' --include='*.ts' --include='*.tsx' apps/ packages/ --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=dist --exclude-dir=generated

# RLS (v112: 86 tables, 38.6%)
grep -r 'ENABLE ROW LEVEL SECURITY' packages/database/prisma/migrations/ --include='*.sql' | sed 's/.*ALTER TABLE \([^ ]*\).*/\1/' | sort -u | wc -l

# Test files (v112: 275 = 139 API + 72 pkg + 64 E2E)
find apps/api/__tests__/ -name '*.test.*' | wc -l
find packages/ -name '*.test.*' -not -path '*/node_modules/*' -not -path '*/dist/*' | wc -l
find e2e/ -name '*.spec.*' | wc -l

# Console statements (v112: 911 -- stable since v106)
for type in log error warn info debug; do echo -n "console.${type}: "; grep -rn "console\.${type}" --include='*.ts' --include='*.tsx' apps/ packages/ --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=dist --exclude-dir=__tests__ --exclude-dir=e2e | wc -l; done

# queryRawUnsafe (v112: 54)
grep -rn 'queryRawUnsafe' apps/ packages/ --include='*.ts' | grep -v '__tests__' | grep -v 'node_modules' | wc -l

# Raw fetch() bypass (v112: 50)
grep -rn 'fetch(' apps/app/app/'(authenticated)'/ --include='*.ts' --include='*.tsx' | grep -v 'apiFetch' | grep -v 'node_modules' | wc -l

# CI: E2E has no e2e-workflows job (STILL OPEN)
grep -A5 'e2e-workflows' .github/workflows/ci.yml 2>/dev/null || echo "NO e2e-workflows job found"
```

---

## Resolved / Do Not Reopen

### P0 Bugs (All 22 Resolved v65-v72)
### P0.3 Manifest POST Route Gap (RESOLVED v88)
### P0.6 Frontend Rewrite Destinations (RESOLVED v105)
### P0.8 /api/public/ Auth Gating (RESOLVED v105)

### Confirmed Resolved Items
- AllergenWarning Manifest Wiring (v88)
- @repo/observability Zero-Import Claim (v85)
- Scheduling API, Test Suite Repair (v77-v80), Payroll Period ID
- Search FR-107, Calendar Features, Bare Table Violations (v84)
- Catering NOT a domain (event type classification)
- tenant_facilities/logistics/accounting RLS: 100%
- TimeOffRequest model: EXISTS as EmployeeTimeOffRequest
- Staffing locationId UUID validation: EXISTS
- Marketing spec: EXISTS at specs/marketing/SPEC.md
- Handler counts: 242 POST, 461 GET, 32 PUT, 22 PATCH, 41 DELETE, 798 total
- Calendar drag-and-drop (dnd-kit): IMPLEMENTED with PointerSensor + TouchSensor

### v110 Items That Were WRONG (DO NOT REOPEN their corrections)

These v110 findings have been superseded by v111's verification:
- **`: any` = 142**: WRONG. Correct: **53** (overcounted by 89, 2.7x error)
- **`as any` = 150**: WRONG. Correct: **142** (8 fewer)
- **queryRawUnsafe = 54**: WRONG at the time. v111 corrected to **53**. v112 says **54** (+1 new instance).
- **Inventory routes = 57**: WRONG. Correct: **58** (off by +1)
- **CRM routes = 42**: WRONG. Correct: **41** (off by -1)
- **Total routes = ~632**: WRONG. Correct: **~622** (10 fewer)
- **Payroll test files = 7**: WRONG. Correct: **6** (1 fewer)
- **E2E test files = 41**: WRONG. Correct: **64** (reused v109's swapped count)
- **Package test files = 72**: WRONG. Correct: **64**
- **Total test files = 275**: WRONG. Correct: **267** (139+64+64)
- **POST routes bypassing manifest = 112**: WRONG. Correct: **86** (all covered by allowlist/exemption)
- **Vitest configs = 4**: WRONG. Correct: **15** files
- **YTD SS wages "never passed"**: OVERSIMPLIFIED. Correct: type definitions exist in taxEngine.ts but may not be populated at call sites (PARTIALLY implemented)

### v111 Items That Were WRONG (DO NOT REOPEN their corrections)

These v111 findings have been superseded by v112's verification:
- **Integrations routes = 5**: WRONG. Correct: **25** (5x undercounted; goodshuffle=9, nowsta=6, quickbooks=1, webhooks=9)
- **Total routes = ~622**: WRONG. Correct: **632** (+10 routes added since v111)
- **`as any` = 142**: WRONG. Correct: **150** (+8; apps=41, manifest=90, other=19)
- **`: any` = 53 (implied comprehensive)**: MISLEADING. Correct: **apps-only=20** (v111 measured a subset; manifest=115, generated=463)
- **@ts-expect-error = 11**: WRONG. Correct: **12** (+1 in storybook resizable.stories.tsx)
- **queryRawUnsafe = 53**: WRONG. Correct: **54** (+1 new bottleneck-detector)
- **Package test files = 64**: WRONG. Correct: **72** (+8 new tests)
- **Total test files = 267**: WRONG. Correct: **275** (139+72+64)
- **POST routes bypassing manifest = 86**: WRONG. Correct: **93** (+7 new direct-write routes)
- **test.skip in E2E = 72**: WRONG. Correct: **41** (31 skips removed/fixed)

### v109 Items That Were WRONG (DO NOT REOPEN their corrections)

- **Test file breakdown = "64 API + 41 pkg + 139 E2E"**: WRONG. Correct: **139 API + 64 pkg + 64 E2E** (v111: E2E=64, not 41)
- **Events spec compliance = ~31%**: WRONG. Correct: **~6% fully MET** (2/35 FRs)
- **Calendar spec compliance = ~58%**: WRONG. Correct: **~57% MET** (20/34)
- **RLS = 84/223**: WRONG. Correct: **86/223 = 38.6%**
- **`as any` = 124**: WRONG. Correct: **142**
- **`: any` = 106**: WRONG. Correct: **53** (v110 said 142 -- ALSO WRONG)
- **`@ts-expect-error` = 12**: WRONG at the time. v111 corrected to **11**. v112 now says **12** (new entry in storybook).
- **queryRawUnsafe = 50**: WRONG. Correct: **54** (v109 said 54, v111 corrected to 53, v112 back to 54 with new instance)
- **Kitchen routes = 149**: WRONG. Correct: **148**
- **Payroll test files = 5**: WRONG. Correct: **6** (v109 said 7, v111 corrects to 6)
- **Marketing routes = 1**: WRONG. Correct: **3**
- **CRM BROKEN_PRISMA_READ = 25**: WRONG. Correct: **41**

### v108 Items That Were WRONG (DO NOT REOPEN)

- Console total=1,021 WRONG (911 correct). CRM orphans=~16 WRONG (29). Kitchen exemptions=~134 WRONG (167). Allowlist=~240 WRONG (248). Contracts=14 files/3 dirs WRONG (18/6). Cron=6 WRONG (8). POST bypass=43 WRONG (86). E2E test.skip=51 WRONG (72).

### v107 Items That Were WRONG (DO NOT REOPEN)

- @ts-ignore=7 WRONG (0). Kitchen manifests=1 WRONG (18). Calendar dnd-kit NOT WRONG (IS implemented). Logistics=25 WRONG (5). Collaboration=5 WRONG (17). Analytics=17 WRONG (5). Knowledge-base=13 WRONG (3).

### v106 Items That Were WRONG (DO NOT REOPEN)

- as any=5 WRONG (142). :any=157 WRONG (53). Kitchen dup pairs=12 WRONG (15). Staff=37 WRONG (35). Inventory=58 WRONG then v110 said 57 WRONG (58 correct per v111). Marketing=5 WRONG (3). Exemption entries=208 WRONG (167).

### v105 Items That Were WRONG (DO NOT REOPEN)

- as any=150 included generated files. :any=605 included generated files. Kitchen BROKEN_PRISMA_READ=19 WRONG (5). CRM test files=19 WRONG (4). Sales-reporting=DEAD WRONG (ALIVE). EventSummary.confidence EXISTS WRONG (MISSING).

### Packages Confirmed ALIVE (DO NOT REOPEN as dead)
@repo/observability (402 imports), @repo/mcp-server (3 runtime imports), sales-reporting (full POST + tests), @repo/event-parser, @repo/storage, @repo/payroll-engine, @repo/pdf, @repo/realtime, @repo/supplier-connectors, @repo/feature-flags (11 imports)

### Packages Confirmed DEAD (DO NOT REOPEN as alive)
@repo/ai, @capsule/brand, @repo/kitchen-state-transitions -- all zero runtime imports

---

## Archive Map

- `docs/implementation-history/` -- pass logs, executive summaries
- `docs/implementation-history/v77-v80-test-suite-repair.md`
- `docs/audits/` -- numbered audit passes
- `docs/audits/v96-audit-findings.md`

---

## Methodology

- **v113**: Full spec-vs-implementation audit. Read all 47 spec files. Cross-referenced every FR against actual code (schema.prisma, API routes, frontend pages). Key findings: (1) Public signing surface EXISTS at `/sign/contract/[token]/` not `/sign/[signingToken]`. (2) EventSummary.confidence field is MISSING from schema. (3) Event.importWorkflowId field is MISSING. (4) VendorContract commands all exist in manifest IR (12 entries) but have NO dedicated HTTP route directories. (5) Battle board is Gantt-chart, not collaborative dish-voting. (6) Calendar sync page uses bare Card (FR-102 violation). (7) Calendar List view is stub only. (8) Marketing has highest spec compliance at ~60%. (9) 3 TODO specs are planning documents only.
- **v112**: Multi-agent verification on branch `checkpoint/tailscale-auth-local-access-20260514`. KEY CHANGES: Integrations=25 (v111 said 5 -- 5x UNDERCOUNT). Total routes=632 (v111 said ~622). @ts-expect-error=12 (v111 said 11). queryRawUnsafe=54 (v111 said 53). Package tests=72 (v111 said 64). Total tests=275 (v111 said 267). POST bypass=93 (v111 said 86). test.skip=41 (v111 implied 72). `as any`=150 (v111 said 142; breakdown: apps=41, manifest=90, other=19). `: any` apps-only=20 (v111's 53 was a subset). NEW: Frontend consumption analysis (4 domains with NO frontend: collaboration, training, shipments, communications). NEW: Specs coverage (47 spec files; 8 major domains with ZERO specs). Handler counts: 242 POST, 461 GET, 32 PUT, 22 PATCH, 41 DELETE = 798 total.
- **v111**: Multi-agent verification (14+ agents) on branch `checkpoint/tailscale-auth-local-access-20260514`. KEY CHANGES: `:any`=53 (v110 said 142 -- 2.7x OVERCOUNT). `as any`=142 (v110 said 150). queryRawUnsafe=53 (v110 said 54). Inventory=58 (v110 said 57). CRM=41 (v110 said 42). Total routes=~622 (v110 said ~632). E2E=64 (v110 said 41). Payroll tests=6 (v110 said 7). Total tests=267. Vitest configs=15 (v110 implied 4). YTD SS=PARTIALLY implemented (types exist, call-site unclear). NEW: CI workflow detail (node version inconsistency, 3 missing concurrency groups, vercel-compat lacks prisma generate, deploy.yml SKIP_ENV_VALIDATION all steps, npm audit + Lighthouse continue-on-error). NEW: TODOs/placeholders section (9 domains with stubs/simulations). Manifest enforcement: dual (static CI + runtime SHA-256), 86 POST bypass all covered by allowlist.
- **v110**: Multi-agent audit (12 subagents). KEY CHANGES: Test files=275 (139+72+64). API tests=139/139 PASS. Events spec=~3% MET. CRM=68 raw SQL. Kitchen=148, 45 subdirs. 2 stale .bak files. ignoreBuildErrors safe to remove.
- **v109**: Test file breakdown SWAPPED. Events spec ~6% MET. Calendar ~55%. Contracts ~21% NEW. RLS=86/223=38.6%. as any=150, :any=142. queryRawUnsafe=54, fetch=50 (SWAPPED). CRM 41 BROKEN_PRISMA_READ.
- **v108-v102**: See archive. Each version corrected prior errors. v103 was on DIFFERENT branch.
- **v77-v80**: Test suite repair. 678 -> 0 failing tests.
- **v65-v72**: All 22 P0 items resolved.
