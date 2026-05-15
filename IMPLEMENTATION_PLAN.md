# IMPLEMENTATION_PLAN.md -- v109

> Updated 2026-05-14
> Synthesized from v109 multi-agent audit (25+ subagents) on branch `checkpoint/tailscale-auth-local-access-20260514`.
> All 22 P0 items resolved (v65-v72). Test suite repair complete (v77-v80).
> v0.12.2 tag created with RLS fixes and console statements audit baseline.
> **v109 KEY CHANGES OVER v108:**
> - **Test file breakdown was SWAPPED in v108**: 139 API + 64 pkg + 41 E2E = 244 (v108 said "64 API + 41 pkg + 139 E2E" -- the three buckets were assigned to wrong categories. Total 244 unchanged.)
> - **Events spec compliance FURTHER CORRECTED DOWN: ~6% fully MET** (2/35 FRs), ~24% with partial (v108 said ~31% -- STILL OVERCOUNTED). Battle board architecturally wrong, confidence field MISSING, importWorkflowId MISSING.
> - **Calendar spec compliance CORRECTED: ~55% MET** (16/29), ~67% with partial (v108 said ~58%). Token refresh NOT implemented, reschedule bypasses manifest.
> - **Contracts spec compliance NEW: ~21% MET** (7/34), ~41% with partial. Sign race condition confirmed, FR-503/FR-504/FR-603 NOT MET.
> - **RLS = 86/223 = 38.6%** (v108 said 84 -- found 2 more tables)
> - **`as any`: 150** (v108 said 124 -- codebase grew)
> - **`: any`: 142** (v108 said 106 -- codebase grew)
> - **`@ts-expect-error`: 11** (v108 said 12)
> - **queryRawUnsafe: 54** (v108 said 50 -- v108 was WRONG, v107's 54 was correct)
> - **Raw fetch(): 50** (v108 said 54 -- SWAPPED with queryRawUnsafe)
> - **Kitchen routes: 148** (v108 said 149 -- off by 1). 45 subdirectories. 49 direct DB calls bypassing manifest.
> - **Payroll test files: 7** (v108 said 5)
> - **Marketing routes: 3** (v108 said 1)
> - **CRM: 10 directories, ALL orphans** (zero frontend API refs). 41 BROKEN_PRISMA_READ patterns, 68 raw SQL patterns.
> - **NEW: Calendar token refresh NOT implemented** -- expired tokens ask users to reconnect instead of auto-refreshing
> - **NEW: Calendar dual sync page implementations** -- sync/page.tsx uses bare Card (design system violation)
> - **NEW: Contracts FR-504 notification NOT MET** -- no Notification entity created after signature
> - **NEW: Contracts FR-603 autoRenewPending NOT MET** -- no autoRenew flag logic
> - All v108 CONFIRMED items carried forward where unchanged (payroll bugs, accounting gaps, infrastructure metrics)

---

## P0 -- Critical Infrastructure

### P0.1 -- Remove `ignoreBuildErrors` [NOT STARTED]

**Status:** `ignoreBuildErrors: true` in 3 apps. CI runs `pnpm turbo typecheck` separately, so TS errors ARE caught in CI. But `next build` succeeds even with TS errors -- a risk if CI is bypassed or skipped. **SAFE TO REMOVE** -- all 3 apps pass `tsc` cleanly. Caveat: intermittent turbo cache issue with parenthesized route groups.

**Locations to remove:**
- `apps/app/next.config.ts:195` -- `ignoreBuildErrors: true`
- `apps/api/next.config.ts:102` -- `ignoreBuildErrors: true`
- `apps/web/next.config.ts:17` -- `ignoreBuildErrors: true`
- `apps/app/next.config.ts:189` -- `eslint.ignoreDuringBuilds: true`
- `packages/typescript-config/base.json:16` -- `skipLibCheck: true` (inherited by all 40+ tsconfigs)
- `noUncheckedIndexedAccess` -- NOT SET in any tsconfig (major strictness gap)
- Biome `noExplicitAny`: **warn only** (not error)
- NOTE: apps/docs/next.config.mjs and apps/storybook/next.config.ts do NOT have it

**Verified metrics (v109 -- hand-written production code ONLY, excluding generated/tests):**
- `as any`: **150** (v108 said 124 -- codebase grew)
- `: any`: **142** (v108 said 106 -- codebase grew)
- `@ts-ignore`: **0** (stable since v107)
- `@ts-expect-error`: **11** (v108 said 12)
- FIXME/HACK: **0 genuine** (5 false positives from format strings)
- Biome `noConsole` is OFF

### P0.2 -- Prisma Generate + Validate in CI [MOSTLY RESOLVED in v105]

**Status:** ci.yml now has explicit `pnpm --filter @repo/database exec prisma generate` (line 48) BEFORE typecheck, and `pnpm --filter @repo/database exec prisma validate` (line 63). **ONLY remaining issue:** `scripts/db-drift-check.mjs` is still a no-op (just logs and exits 0).

**Resolved (v105):** prisma generate and validate are now explicit CI steps.
**Still open:** Replace no-op drift-check with real validation.

### P0.3 -- Manifest Route Enforcement [RESOLVED -- DO NOT REOPEN]

**Status (v108 CONFIRMED):** manifest-ci.yml has `manifest-route-audit` job with `--strict` mode. `CONCRETE_COMMAND_ROUTE_NOT_DISPATCHED` rule prevents new concrete per-command route files. **248 entries** in `write-route-infra-allowlist.json`. **167 entries** in `audit-routes-exemptions.json`. **43 POST routes bypass manifest** with direct DB writes -- static analysis enforcement only, no runtime enforcement. **Manifest-runtime exemptions: 250.** Active manifests: **86**. Disabled manifests: **6**.

### P0.4 -- CI/CD Pipeline: Comprehensive Fixes [PARTIALLY RESOLVED in v105]

**v105 RESOLUTIONS:**
- [x] Biome lint: `pnpm biome check` now in ci.yml (line 54)
- [x] prisma generate + validate: explicit steps in ci.yml (lines 48, 63)
- [x] CodeQL: all v4 everywhere (codeql.yml and security.yml)
- [x] Trivy: pinned `@aquasecurity/trivy-action@0.28.0` (not @master)
- [x] Concurrency groups: ci.yml, security.yml, deploy.yml
- [x] "Run linting" step actually runs BOTH `pnpm turbo typecheck` AND `pnpm biome check` (misnamed but functional)

**STILL OPEN (v108 CONFIRMED):**
1. **E2E tests -- NO e2e-workflows job exists ANYWHERE.** No `.github/workflows/e2e*.yml` file at all.
2. **Lighthouse in performance.yml:** no dev server, `continue-on-error: true` (line 59)
3. **Pre-push hook disabled:** `.husky/pre-push` = `exit 0`
4. **npm audit:** `continue-on-error: true` (security.yml line 46)
5. **vercel-compat.yml:** uses node-version "22.x" not exact 22.18.0
6. **SKIP_ENV_VALIDATION:** in 4 of 7 workflows (build steps only)
7. **manifest-ci runs same test suite twice** (validate + tests)
8. **manifest-ci.yml excludes** cms/web/app from TS check
9. **Only 2 soft gates:** Lighthouse (performance.yml) and npm audit (security.yml)

### P0.5 -- [RESERVED -- DO NOT REOPEN]

### P0.6 -- Frontend Calls to Non-Existent API Routes [RESOLVED in v105 -- DO NOT REOPEN]

### P0.7 -- Calendar OAuth Tokens Stored Plaintext [NOT STARTED -- CRITICAL]

**Status (v108 CONFIRMED):** `calendar/sync/connect/route.ts` stores `accessToken`/`refreshToken` as plaintext String @db.Text in `ProviderSync` model. **ZERO encryption infrastructure** in entire codebase.

**v109 FINDINGS:**
- Callback routes use WRONG import: `@/lib/database` instead of `@repo/database` -- resolves via barrel re-export but inconsistent
- **No token refresh logic** -- expired tokens require full reconnection (trigger route detects expiry but asks users to reconnect)
- `store_tokens` action allows direct plaintext token injection via POST body
- `EmployeePin.pin_encrypted` is misleadingly named -- no encryption code exists
- **No RLS on ProviderSync**
- **Calendar spec compliance: ~55% MET** (16/29), 7 PARTIAL, 5 NOT MET (v108 said ~58%)
- **Mobile responsiveness FAIL** -- no breakpoints below 768px (FR-701)
- **Reschedule bypasses manifest** dispatch (FR-504), no optimistic concurrency (FR-502)
- **Dual sync page implementations** -- sync/page.tsx uses bare Card (design system violation), sync/sync-client.tsx uses correct patterns
- **Top gaps:** token encryption, optimistic concurrency, manifest dispatch, mobile view

### P0.8 -- /api/public/ Auth Gating [RESOLVED in v105 -- DO NOT REOPEN]

---

## P1 -- High Priority

### P1.A -- Payroll Runtime Bugs [PARTIALLY RESOLVED in v105]

**RESOLVED (v105):**
- [x] EmployeeDeduction table mapping: correctly mapped
- [x] Federal bracket copies: separate brackets for Single, Married, HoH
- [x] Deductions double-parse: only one `JSON.parse` call found

**STILL CRITICAL (v109 CONFIRMED with exact file paths):**
- **Division by zero:** `PrismaPayrollDataSource.ts:303-304, 317-318` -- `regularPay / hoursRegular || 0` stores `Infinity` (JS evaluates division before ||)
- **Second div-by-zero:** `calculator.ts:326-327` -- NaN when postTaxTotal is 0
- **YTD SS wages NEVER passed to tax engine:** `calculator.ts:300-305` never passes `ytdGrossPay`/`ytdSocialSecurityWages` -- SS over-collected for employees above wage base
- **tenant_payroll schema** referenced in `tax/list/route.ts:34,43,51,80` but NOT in schema.prisma -- RUNTIME CRASH (100% failure on GET and PUT)
- **FUTA/SUTA:** ZERO implementation -- employer tax liability understated
- **Tax engine tests:** ZERO dedicated tests
- **24 routes**, 7 test files (v108 said 5 -- WRONG)

### P1.B -- CRM Pipeline [UPDATED v108 -- CORRECTED]

**Status (v109):** **42 routes**. **41 BROKEN_PRISMA_READ patterns**, **68 raw SQL patterns** (v108 said 25 BROKEN_PRISMA_READ -- UNDERCOUNTED). **CrmScoringRule model EXISTS** but all 13 scoring calls still use raw SQL against `crm_scoring_rules`. **10 directories, ALL orphans** (zero frontend API refs found). **29 orphaned routes** with NO frontend consumer. **4 test files** + 1 E2E. Deal model: virtual projection over Proposals (by design -- DO NOT REOPEN). **No CRM spec exists.**

### P1.C -- Console Statement Cleanup [v109: 911 verified -- STABLE]

**v109 Breakdown (unchanged from v108):**
- console.error: **530**
- console.log: **345** (106 in manifest-runtime/doctor.ts alone)
- console.warn: **31**
- console.info: **4**
- console.debug: **1**
- **Total: 911** (stable since v106)
- @repo/observability: **402** imports
- Biome `noConsole` OFF

### P1.D -- Design System: Shell Compliance

**v106 verified counts (unchanged in v108):**
- Bare `<Card>` without tone: **37**
- Shadow violations: **239**
- `text-3xl`: **246**
- Pastel violations: **4**
- `border-b` tabs: **8**
- PageCanvas usage: **37** references
- ResearchTable usage: **842** references

### P1.E -- TypeScript Strictness [v109: METRIC UPDATES]

**v109 CORRECTED (hand-written production code, excluding generated/test files):**
- `as any`: **150** (v108 said 124 -- codebase grew)
- `: any`: **142** (v108 said 106 -- codebase grew)
- `@ts-ignore`: **0** (stable since v107)
- `@ts-expect-error`: **11** (v108 said 12)
- FIXME/HACK: **0 genuine**
- `noUncheckedIndexedAccess`: NOT SET -- major gap
- `skipLibCheck: true` in base tsconfig + inherited by all 40+ tsconfigs

### P1.F -- Accounting: Structural Gaps [17 routes]

**v109 CONFIRMED:**
- Financial reports expenses **HARDCODED TO ZERO** at `financial-reports/route.ts:193, 258-262` (`.reduce(() => 0, 0)` always returns 0)
- Journal entries / general ledger: **MISSING ENTIRELY** (no models exist)
- Bank reconciliation: **FULLY SIMULATED** (modulo distribution, fake variance)
- Double-entry bookkeeping: **NOT IMPLEMENTED** (ChartOfAccount is taxonomy only, no posting layer)
- **10 test files** (none for financial-reports or bank-reconciliation), RLS **100%**

### P1.G -- Inventory Route Manifest Gap [57 routes]

**v108 CONFIRMED:** **57 routes** (not 58). Frontend has **18 consumers** (not zero). **2 duplicate PO route pairs** across inventory/ and procurement/ with divergent imports (`@repo/database` vs `@/lib/database`). **18 raw SQL** instances (all safe). **6 test files**. 4 active manifest files.

### P1.H -- BROKEN_PRISMA_READ Pattern [v109: CRM CORRECTED]

**Pattern:** Writes via `executeManifestCommand`/`runtime.runCommand` (Manifest -> PrismaStore), reads query Prisma directly.

**Domains using manifest commands:** accounting, administrative, collaboration, command-board, communications, crm, events, inventory, kitchen, lead, manifest, payroll, procurement, rolepolicy, settings, shipments, smsautomationrule, staff, timecards, training

**112 POST routes bypass manifest** with direct DB writes (static analysis enforcement only, no runtime enforcement).

### P2.A -- Calendar (8 routes, ~55% spec compliance)
- [x] Drag-and-drop (dnd-kit) -- **IMPLEMENTED** (v106 said NOT -- WRONG; uses @dnd-kit/core with PointerSensor + TouchSensor)
- [ ] OAuth tokens PLAINTEXT -- escalated to P0.7
- [ ] Callback routes use inconsistent import (`@/lib/database` barrel vs `@repo/database` direct)
- [ ] No token refresh logic -- expired tokens require full reconnection (trigger detects expiry but asks reconnect)
- [ ] `store_tokens` allows plaintext injection via POST body
- [ ] **No RLS on ProviderSync**
- [ ] Reschedule lacks optimistic concurrency (FR-502), bypasses manifest dispatch (FR-504)
- [ ] Mobile responsive FAIL -- grid-cols-7 always, no breakpoints < 768px (FR-701)
- [ ] Reschedule missing timeoff rejection error (FR-501)
- [ ] FR-602: Schedule tab REMOVED
- [x] FR-603: List view **IMPLEMENTED** using ResearchTable
- [x] FR-301/302/303: entry-type taxonomy correct (3 types only)
- [ ] **Dual sync page implementations** -- sync/page.tsx uses bare Card (design system violation), sync/sync-client.tsx uses correct patterns
- **v109 CORRECTION:** 16/29 MET (55%), 7 PARTIAL, 5 NOT MET (v108 said ~58%)

### P2.B -- Accounting (17 routes)
- [x] Invoicing, payments, revenue recognition, collections
- [ ] Financial reports expenses HARDCODED TO ZERO (P1.F)
- [ ] Journal entries / general ledger: MISSING. Bank reconciliation: SIMULATED
- **v109:** 10 test files (none for financial-reports, bank-reconciliation)

### P2.C -- Contracts (18 total route files across 6 directories)

**v109 SPEC COMPLIANCE: ~21% MET (7/34), ~41% MET+PARTIAL**
- [x] 8 EventContract commands (manifest IR)
- [x] 10 VendorContract commands (manifest IR only -- **ZERO HTTP endpoints**)
- [ ] **canceled/cancelled spelling split CONFIRMED** -- validation.ts uses "canceled", manifest/status route uses "cancelled" -- MISMATCH CAN ALLOW SIGNING CANCELED CONTRACTS
- [ ] **Sign route race condition CONFIRMED** -- findFirst + no transaction, two separate non-transactional writes
- [ ] **Public signing bypasses manifest** -- direct DB writes, no event emission (FR-504)
- [ ] **Sign returns 400 not 409** -- violates FR-503
- [ ] **VendorContract renew wrong** -- updates endDate instead of creating new row (spec FR-604)
- [ ] **10 VendorContract command routes MISSING** -- AGENTS.md claims 10 command dirs exist, but ZERO HTTP endpoints found
- [ ] **FR-504 notification NOT MET** -- no Notification entity created after signature
- [ ] **FR-603 autoRenewPending NOT MET** -- no autoRenew flag logic
- [ ] `cron/contract-expiration-alerts`: CONFIRMED in vercel.json

### P2.D -- Events (87 routes -- v109 FURTHER CORRECTIONS)

**Spec coverage: ~6% fully MET** (2/35 FRs), ~24% with partial (v108 said ~31% -- STILL OVERCOUNTED).

**v109 CORRECTIONS (v108 was STILL OVERCOUNTING compliance):**
- Only **2 of 35 FR requirements fully met**, 13 partial, 12 not met (v108 said 5/35 MET)
- **Battle board is architecturally wrong** -- implemented as task-timeline with Gantt-chart, spec requires collaborative dish-voting. FR-5xx (5 requirements) entirely inapplicable.
- **Report template system not implemented**
- **ContactFormCard NOT used** -- FR-105 NOT MET
- **Card ladders** in lazy-event-explorer.tsx and menu-intelligence-section.tsx -- FR-201 violation
- Routes: **87** (stable)
- Test files: **16** (stable)
- Frontend pages: **26**
- **23 raw `fetch()` calls** bypass `apiFetch` in events frontend

**v109 FINDINGS (all still open):**
- `EventSummary.confidence`: **MISSING** from schema
- `Event.importWorkflowId`: **MISSING** from schema -- EventImportWorkflow model doesn't exist -- FR-404 blocked
- Budget URL: singular `/budget` vs spec requires plural `/budgets`
- Battle Board = collaborative dish-voting workspace for menu finalization (NOT task-timeline)
- BudgetAlert in wrong schema (`tenant_staff` not `tenant_events`)

### P2.E -- Kitchen (148 routes -- v109 CORRECTIONS)

**v109 CORRECTIONS:**
- Route files: **148** (v108 said 149 -- off by 1)
- **45 subdirectories** with many singular/plural pairs (dish/dishes, ingredient/ingredients, recipe/recipes, station/stations, menu/menus, prep-tasks/preptask, prep-lists/preplist, etc.)
- **Kitchen manifests = 18** (v106 said 1 -- MASSIVELY WRONG)
- **15 singular/plural duplicate pairs** = **30 dead routes**
- **49 direct DB calls bypassing manifest** (in routes)
- **37 test files**
- **~70 routes (47%)** have NO frontend consumer
- **31 frontend pages** (v108 said 38)
- **NO spec document** -- BIGGEST spec gap
- **Kitchen exemptions: 167** (stable)
- **Kitchen orphans: 95/148 = 64%**

### P2.F -- Logistics (5 routes -- confirmed)
- **5 routes** (v106 said 25 -- WRONG; v105's count of 5 was correct)
- GPS simulated with hardcoded LA coordinates (`logistics/tracking/route.ts:244-245`)
- 1 test, 5 frontend refs, no spec

### P2.G -- Staffing (2 routes -- confirmed)
- [x] Coverage + Recommendations APIs implemented
- [ ] CoverageBar: **3 inline div patterns** in page.tsx -- NOT a component
- [ ] **5 queryRawUnsafe** in coverage routes (cast results with `as any[]`)
- [ ] LaborBudget: **model EXISTS** in schema, endpoints under `/api/staff/budgets/` (not `/api/staffing/`)
- [x] **RESOLVED:** locationId UUID validation EXISTS (DO NOT REOPEN)

### P2.H -- Staff (35 production routes)
- No BROKEN_PRISMA_READ, no queryRawUnsafe (1 comment-only reference), no TODOs
- **35 production routes** (v106 said 37 -- includes 2 co-located test files)
- **12 subdomains** (v106 said 14 -- WRONG)
- **21 scheduling-related routes**
- **10 frontend consumer files**
- **Staff orphans: 21/35 = 60%** (NEW v108 finding)

### P2.I -- Settings (10 routes)
- [x] Audit log, API key revocation, role assignment, integrations, role policies, rate limits
- [ ] AlertsConfig frontend calls wrong path
- [ ] Billing P3/blocked -- no Subscription/Plan/Tier/BillingAccount models

### P2.J -- Analytics (5 routes)
- **5 routes** (v106 said 17 -- WRONG; v105's 5 was correct)
- **22 raw SQL** across all 5 route files (heaviest raw-SQL domain)
- 0 tests, 5 frontend refs, no spec

### P2.K -- Marketing (3 routes)
- **3 routes** (v108 said 1 -- WRONG; v106 said 5 -- WRONG)
- Spec EXISTS at `specs/marketing/SPEC.md`
- SMS automation in separate communications module
- 1 frontend consumer, 2 test files

### P2.L -- Command Board (22 routes)
**Specs at `specs/command-board/`.** Frontend EXISTS (4 files). 6 test files. **2 stub routes returning 501** (command-board templates). **Command-board orphans: 21/22 = 95%** (NEW v108 finding -- highest orphan rate of any domain).

### P2.M -- Knowledge Base (3 routes)
- **3 routes** (v106 said 13 -- WRONG; v105's 3 was correct)
- 2 tests, 2 frontend refs, no spec

### P2.N -- Integrations (5 routes)
- 5 routes (confirmed)

### P2.O -- Training (7 routes)
- **7 routes** (v106 said 1 -- WRONG)
- **15 raw SQL** across 4 files (heaviest: `complete/route.ts` with 9)
- 3 test files, 5 frontend consumers
- Spec at `specs/training-hrms_TODO/SPEC.md` (TODO status)

### P2.P -- Search [RESOLVED -- DO NOT REOPEN]
### P2.Q -- Procurement (24 routes) [CRITICAL: vendor-contracts 404]

**v108 CONFIRMED:** Route count 24. Requisitions 8/8 complete. **Vendor-contracts: ZERO command route directories** (AGENTS.md says 10 -- FABRICATED). **CRITICAL:** `[id]/page.tsx` lines 116, 145 call `/api/procurement/vendor-contracts/commands/*` which WILL 404. 5 test files.

### P2.R -- Timecards (10 routes)
- [ ] 4 Prisma models, 1 test (1,765 lines), no specs, no manifests
- [x] TimeOffRequest model EXISTS as `EmployeeTimeOffRequest` (DO NOT REOPEN)

### P2.S -- Documents (1 route) -- has API consumers (DO NOT REOPEN)
### P2.T -- Catering [NOT a ghost domain -- DO NOT REOPEN]
### P2.U -- Warehouse (2 routes, GET-only)

### P2.V -- Communications/Collaboration Fragmentation
- [ ] Communications: **7 routes** (v106 said 9 -- WRONG)
- [ ] Collaboration: **17 routes** (v106 said 5 -- WRONG; v105's 17 was correct)
- [ ] Notifications: dismissed state NOT in DB
- [ ] SMS fragmented across 3 modules

### P2.W -- Frontend Module Design System
### P2.X -- Unlisted Domains

**v109 domain route counts (corrected):**
Kitchen 148, Events 87, Inventory 57, CRM 42, Staff 35, Payroll 24, Procurement 24, Command-board 22, Accounting 17, Collaboration 17, Administrative 13, Knowledge-base 3, Communications 7, Shipments 9, Rolepolicy 7, Settings 10, Calendar 8, Facilities 5, Analytics 5, Marketing 3, Staffing 2, Training 7, Logistics 5, Integrations 5, + smaller domains.

**Per-domain route counts DISPUTED** (Wave 1 vs Wave 4 subagents differ, need re-verification):
CRM, Inventory, Staff, Procurement, Command-board, Collaboration, Administrative, Settings, Rolepolicy, Training, Timecards, Analytics, Knowledge-base, Staffing, Integrations, Communications

**Dead/Zombie:** sales-reporting (1 route -- ALIVE, has full POST endpoint with auth and tests), user-preferences (1 route, no UI).

### P2.Y -- Payroll (24 routes -- runtime bugs at P1.A, 7 test files)

### P2.Z -- Security Coverage [v109]

| Metric | v108 | v109 | Notes |
|---|---|---|---|
| RLS tables / total | **84/223** | **86/223** | **38.6%** (v109 found 2 more) |
| queryRawUnsafe | **50** | **54** | **v109 CORRECTION** (v108 was WRONG; v107's 54 was correct) |
| Manifest-using routes | **341** | **341** | STABLE |
| Raw fetch() bypass | **54** | **50** | **v109 CORRECTION** (SWAPPED with queryRawUnsafe in v108) |
| `/api/public/` in isPublicRoute | YES | YES | RESOLVED |
| POST routes bypassing manifest | **112** | **112** | STABLE |
| DEFAULT schema models with 0% RLS | **21** | **21** | STABLE |
| Orphan routes | **350/632** | **350/632** | STABLE (55.4%) |
| Active manifests | **86** | **86** | STABLE |
| Disabled manifests | **6** | **6** | STABLE |
| Allowlist entries | **248** | **248** | STABLE |
| Kitchen exemptions | **167** | **167** | STABLE |
| Manifest-runtime exemptions | **250** | **250** | STABLE |

**Per-schema RLS (v108 CORRECTED):**
- tenant_accounting: **100%**
- tenant_facilities: 5/5 -- **100%**
- tenant_logistics: 4/4 -- **100%**
- tenant_crm: **66%**
- tenant_inventory: 18/33 -- **53%**
- tenant_staff: 16/37 -- **38%**
- tenant_kitchen: 11/43 -- **29%** (worst large schema)
- tenant_events: **26%**
- tenant_admin: **18%**
- bare tenant: **12%** (1/8)
- **DEFAULT/public schema: 21 models -- 0% RLS -- HIGH RISK**
- **core schema: 0% RLS**
- **platform schema: 0% RLS**

**High-risk findings:**
- Contracts status spelling "canceled"/"cancelled" mismatch (P2.C)
- **21 models in DEFAULT/public schema with 0% RLS**
- core and platform schemas: 0% RLS
- `EmployeePin.pin_encrypted` plaintext -- no encryption code exists
- Calendar OAuth tokens plaintext, no RLS on ProviderSync (P0.7)
- Pre-push hook disabled (exit 0)
- E2E CI: NO e2e-workflows job at all
- **112 POST routes bypass manifest** with direct DB writes (v107 said 43 -- 2.6x WORSE)
- **350/632 = 55.4% routes are ORPHANS** -- massive cleanup needed

---

## P3 -- Lower Priority

### P3.A -- Dead Package Cleanup

**Dead (zero runtime imports):** @repo/ai, @capsule/brand, @repo/kitchen-state-transitions

**Alive (DO NOT REOPEN as dead):** @repo/mcp-server (standalone executable, 3 runtime imports), sales-reporting (has full POST endpoint with auth and tests), @repo/event-parser, @repo/storage, @repo/payroll-engine, @repo/pdf, @repo/realtime, @repo/supplier-connectors

**Package stats (v108):** 35 packages total. **25 without any test files**. Dead: ai, brand, kitchen-state-transitions. Alive: all others confirmed.

**Stale files:** `apps/app/package.json.bak` -- still exists, should be removed

### P3.B -- Spec Gap Analysis (v108)

**49 spec files, 14,822 lines total.** Domains WITH specs: Command Board (11 files), Manifest (17 files), Calendar, Events, Contracts, Marketing, Staffing, General (8 files). **3 TODO specs** (training, SMS, webhooks).

**Domains WITHOUT specs (HIGHEST priority to author):**

**v109 Spec Compliance Summary (where specs exist):**
| Domain | MET | PARTIAL | NOT MET | Top Gaps |
|---|---|---|---|---|
| Calendar (8 routes) | 16/29 (55%) | 7 | 5 | Token encryption, optimistic concurrency, manifest dispatch, mobile view, token refresh |
| Events (87 routes) | 2/35 (6%) | 13 | 12 | Battle board architecturally wrong, confidence MISSING, importWorkflowId MISSING, ContactFormCard unused, Card ladders |
| Contracts (18 files) | 7/34 (21%) | 7 | 20 | Race condition, spelling split, bypass manifest, 400 not 409, notification MISSING, autoRenew MISSING |
| Accounting (17 routes) | -- | -- | -- | Expenses zero, journal/ledger MISSING, reconciliation SIMULATED |
| Payroll (24 routes) | -- | -- | -- | All 5 runtime bugs confirmed (div-by-zero x2, YTD SS, tenant_payroll, FUTA/SUTA) |
| Domain | Routes | Orphans | Priority |
|---|---|---|---|
| Kitchen | 148 | 95 (64%) | HIGHEST -- biggest domain, 18 manifests, no spec |
| Events | 87 | 54 (62%) | Has spec but ~6% MET / ~24% partial (v108 said ~31% -- STILL OVERCOUNTED) |
| Inventory | 57 | -- | No spec |
| CRM | 42 | 31 (76%) | No spec; 29 orphans (v107 said ~16 -- much worse) |
| Staff | 35 | 21 (60%) | No spec |
| Collaboration | 17 | -- | No spec |
| Payroll | 24 | -- | No spec |
| Procurement | 24 | -- | No spec |
| Accounting | 17 | -- | No spec |
| Training | 7 | -- | TODO spec exists |
| Analytics | 5 | -- | No spec |
| Communications | 7 | -- | No spec |
| Logistics | 5 | -- | No spec |
| Facilities | 5 | -- | No spec |
| + ~15 more domains | ~30 | -- | No spec |

### P3.C -- Cron HTTP Method Inconsistency

**v109: 8 cron jobs** in vercel.json (stable). AGENTS.md registry says 6 -- STALE (missing `integration-auto-sync` and `outbox/publish`).

### P3.D -- Route Architecture (v109)

| Metric | v108 | v109 | Notes |
|---|---|---|---|
| Route files | **~632** | **~632** | STABLE |
| Manifest-using routes | **341** | **341** | STABLE |
| POST routes bypassing manifest | **112** | **112** | STABLE |
| Allowlist entries | **248** | **248** | STABLE |
| Exemption entries | **167** | **167** | STABLE (kitchen exemptions) |
| Manifest-runtime exemptions | **250** | **250** | STABLE |
| Domains | **50** | **50** | STABLE |
| Orphan routes | **350/632** | **350/632** | STABLE (55.4%) |
| Active manifests | **86** | **86** | STABLE |
| Disabled manifests | **6** | **6** | STABLE |

### P3.E -- AGENTS.md Corrections Needed (v109)

**v109 METRIC CORRECTIONS (highest priority updates):**
1. `@ts-ignore`: **0** (not 7 -- v106 was WRONG)
2. `@ts-expect-error`: **11** (v108 said 12 -- WRONG)
3. `as any`: **150** (v108 said 124 -- codebase grew)
4. `: any`: **142** (v108 said 106 -- codebase grew)
5. RLS: **86/223 = 38.6%** (v108 said 84/223 = 37.6% -- found 2 more)
6. Kitchen manifests: **18** (not 1 -- v106 was MASSIVELY WRONG)
7. Kitchen dup pairs: **15** (not 12)
8. Kitchen tests: **37** (not 35)
9. Kitchen no-frontend: **~70 routes (47%)** (not 106/149=71%)
10. Kitchen exemptions: **167** (not ~134)
11. Kitchen routes: **148** (v108 said 149 -- off by 1)
12. Kitchen subdirectories: **45** (v109 new metric)
13. Kitchen direct DB calls bypassing manifest: **49** (v109 new metric)
14. Kitchen frontend pages: **31** (v108 said 38)
15. CRM BROKEN_PRISMA_READ: **41** (v108 said 25 -- UNDERCOUNTED)
16. CRM raw SQL patterns: **68** (v109 new metric)
17. CRM directories: **10, ALL orphans** (zero frontend API refs)
18. CRM orphans: **29** (not ~16 as v107 said)
19. CrmScoringRule model: **EXISTS** but all 13 scoring calls use raw SQL
20. Events routes: **87** (stable)
21. Events test files: **16** (stable)
22. Events spec compliance: **~6% fully MET** (2/35), ~24% with partial (v108 said ~31% -- STILL OVERCOUNTED)
23. Events: ContactFormCard NOT used (FR-105 NOT MET)
24. Events: Card ladders in lazy-event-explorer.tsx, menu-intelligence-section.tsx (FR-201 violation)
25. Staff routes: **35 production** (not 37 -- v106 included test files)
26. Staff subdomains: **12** (not 14)
27. Inventory routes: **57** (not 58)
28. Logistics routes: **5** (not 25 -- v106 was WRONG, v105 was correct)
29. Collaboration routes: **17** (not 5 -- v106 was WRONG, v105 was correct)
30. Analytics routes: **5** (not 17 -- v106 was WRONG, v105 was correct)
31. Knowledge-base routes: **3** (not 13 -- v106 was WRONG, v105 was correct)
32. Training routes: **7** (not 1)
33. Administrative routes: **13** (not 7)
34. Rolepolicy routes: **7** (not 3)
35. Settings routes: **10** (not 7)
36. Shipments routes: **9** (not 7)
37. Marketing routes: **3** (v108 said 1 -- WRONG; v106 said 5 -- WRONG)
38. Communications routes: **7** (not 9)
39. Console total: **911** (stable since v106)
40. Raw fetch() bypass: **50** (v108 said 54 -- WRONG; SWAPPED with queryRawUnsafe)
41. Test files: **244** (139 API + 64 pkg + 41 E2E; v108 SWAPPED the bucket assignment)
42. E2E test.skip: **72** (stable)
43. Command-board 501 stubs: **2** (not 3)
44. DEFAULT schema: **21 models with 0% RLS** (stable)
45. **112 POST routes bypass manifest** with direct DB writes (stable)
46. Calendar dnd-kit: **IMPLEMENTED** (v106 said NOT -- WRONG)
47. Calendar spec compliance: **~55% MET** (16/29), ~67% with partial (v108 said ~58%)
48. Calendar token refresh: NOT implemented (expired tokens ask reconnect)
49. Calendar dual sync implementations (sync/page.tsx bare Card violation)
50. Procurement vendor-contracts frontend: CALLS 404 ROUTES
51. Competing vitest configs for API: **4 files** (stable)
52. Cron jobs: **8** in vercel.json (AGENTS.md says 6 -- STALE)
53. Orphan routes: **350/632 = 55.4%** (stable)
54. Active manifests: **86**, disabled: **6** (stable)
55. Allowlist entries: **248** (stable)
56. Contracts: **18 route files across 6 directories** (stable)
57. Contracts: canceled/cancelled spelling split, sign race condition, public sign bypass, 400 not 409
58. Contracts: VendorContract renew wrong, 10 command routes MISSING (0 HTTP endpoints)
59. Contracts FR-504 notification NOT MET, FR-603 autoRenewPending NOT MET
60. Contracts spec compliance: **~21% MET** (7/34), ~41% MET+PARTIAL (v109 new detailed audit)
61. queryRawUnsafe: **54** (v108 said 50 -- WRONG; v107's 54 was correct all along)
62. Payroll test files: **7** (v108 said 5)

### P3.F -- Test Infrastructure (v109 -- BREAKDOWN CORRECTED)

- **244 test files** (139 API + 64 packages + 41 E2E) -- v108 SWAPPED the bucket assignment (said 64 API + 41 pkg + 139 E2E). Total unchanged.
- **72 test.skip** in E2E -- stable
- **5 describe.skip** (sales-reporting + 4 event-timeline command tests)
- **2 stub routes** returning 501 (command-board templates)
- **Competing vitest configs** for API: `vitest.config.ts` + `vitest.config.mts` + `vitest.config.integration.mts` + `.bak2` backup (4 files)
- Pre-push hook disabled (exit 0)

### P3.G -- Raw fetch() Bypassing apiFetch

**50 raw `fetch()` calls** in `(authenticated)/` bypass `apiFetch` (v108 said 54 -- WRONG; SWAPPED with queryRawUnsafe). Highest in events (23 calls).

### P3.H -- Stale Backup Files

- `apps/app/package.json.bak` -- should be removed
- `apps/api/vitest.config.ts.bak2` -- should be removed

---

## Orphan Route Analysis (v108 NEW)

**Definition:** A route with NO frontend consumer -- no page, component, or client file in `apps/app/` calls it.

**Total: 350 of 632 routes = 55.4% are ORPHANS.**

| Domain | Total Routes | Orphans | Orphan % | Root Causes |
|---|---|---|---|---|
| Command-board | 22 | 21 | **95%** | Near-total dead code; only 1 route has frontend consumer |
| CRM | 42 | 31 | **76%** | Duplicate entity routes, unfinished features, raw SQL scoring bypass |
| Kitchen | 148 | 95 | **64%** | 15 singular/plural duplicate pairs (30 dead), 45 subdirs, unfinished features |
| Events | 87 | 54 | **62%** | CQRS commands wired through generic manifest path, unfinished features |
| Staff | 35 | 21 | **60%** | Scheduling subdomain has many unconsumed endpoints |
| Inventory | 57 | ~28 | ~49% | Some procurement overlap |
| Procurement | 24 | ~11 | ~46% | Vendor-contracts 404 frontend calls inflate count |
| Collaboration | 17 | ~8 | ~47% | Fragmented module |
| Accounting | 17 | ~7 | ~41% | Unused report endpoints |
| Payroll | 24 | ~8 | ~33% | Tax engine routes unconsumed |
| Other domains | ~159 | ~96 | ~60% | Mixed |

**Root Causes (sorted by impact):**
1. **Duplicate entity routes:** Singular/plural pairs (kitchen 15 pairs = 30 dead), inventory PO pairs
2. **Unfinished features:** Routes generated by manifest/CQRS scaffolding with no frontend yet
3. **CQRS commands wired through generic manifest path:** POST handlers that manifest dispatches but no UI triggers
4. **Stale API surface:** Routes created for features that were redesigned or abandoned
5. **Over-scaffolded CRUD:** Full create/read/update/delete for entities with partial frontend coverage

**Recommended approach:**
- Phase 1: Audit each orphan for dead code vs. planned-but-unbuilt
- Phase 2: Remove confirmed dead routes (highest ROI: command-board 21, kitchen 95)
- Phase 3: For planned-but-unbuilt, add TODO comments and track in spec

---

## Code Quality Metrics (v109)

| Metric | v108 | v109 | Status |
|---|---|---|---|
| Route files | **~632** | **~632** | STABLE |
| `as any` production | **124** | **150** | **v109 CORRECTION** (codebase grew) |
| `: any` production | **106** | **142** | **v109 CORRECTION** (codebase grew) |
| `@ts-ignore` | **0** | **0** | STABLE |
| `@ts-expect-error` | **12** | **11** | **v109 CORRECTION** |
| FIXME/HACK | **0 genuine** | **0 genuine** | STABLE |
| queryRawUnsafe | **50** | **54** | **v109 CORRECTION** (v108 was WRONG; v107's 54 was correct) |
| Raw fetch() | **54** | **50** | **v109 CORRECTION** (SWAPPED with queryRawUnsafe in v108) |
| Console total | **911** | **911** | STABLE |
| @repo/observability | **402** | **402** | STABLE |
| API test files | **64** | **139** | **v109 CORRECTION** (v108 SWAPPED buckets: 139 API, not 64) |
| Package test files | **41** | **64** | **v109 CORRECTION** (v108 SWAPPED buckets: 64 pkg, not 41) |
| E2E spec files | **139** | **41** | **v109 CORRECTION** (v108 SWAPPED buckets: 41 E2E, not 139) |
| Total test files | **244** | **244** | STABLE (total unchanged; breakdown corrected) |
| RLS tables/total | **84/223** | **86/223** | **v109 CORRECTION** (found 2 more; 38.6%) |
| POST routes bypassing manifest | **112** | **112** | STABLE |
| Orphan routes | **350/632** | **350/632** | STABLE (55.4%) |
| Events routes | **87** | **87** | STABLE |
| Events spec compliance | **~31%** | **~6% MET / ~24% partial** | **v109 CORRECTION** (v108 still overcounted) |
| Calendar spec compliance | **~58%** | **~55% MET / ~67% partial** | **v109 CORRECTION** |
| Contracts spec compliance | -- | **~21% MET / ~41% partial** | **v109 NEW** |
| Kitchen routes | **149** | **148** | **v109 CORRECTION** (off by 1) |
| Kitchen manifests | **18** | **18** | STABLE |
| Kitchen dup pairs | **15** | **15** | STABLE |
| Kitchen tests | **37** | **37** | STABLE |
| Kitchen exemptions | **167** | **167** | STABLE |
| CRM BROKEN_PRISMA_READ | **25** | **41** | **v109 CORRECTION** (v108 UNDERCOUNTED) |
| CRM orphans | **29** | **29** | STABLE |
| Staff routes | **35 prod** | **35 prod** | STABLE |
| Inventory routes | **57** | **57** | STABLE |
| Logistics routes | **5** | **5** | STABLE |
| Collaboration routes | **17** | **17** | STABLE |
| Analytics routes | **5** | **5** | STABLE |
| Knowledge-base routes | **3** | **3** | STABLE |
| Calendar dnd-kit | **IMPLEMENTED** | **IMPLEMENTED** | STABLE |
| Allowlist entries | **248** | **248** | STABLE |
| Manifest-runtime exemptions | **250** | **250** | STABLE |
| Active manifests | **86** | **86** | STABLE |
| Disabled manifests | **6** | **6** | STABLE |
| Contracts route files | **18 across 6 dirs** | **18 across 6 dirs** | STABLE |
| Cron jobs in vercel.json | **8** | **8** | STABLE |
| Marketing routes | **1** | **3** | **v109 CORRECTION** |
| Payroll test files | **5** | **7** | **v109 CORRECTION** |

---

## RLS Coverage (v109)

**86 tables** with RLS out of **223** total models = **38.6% coverage** (v108 said 84/223 = 37.6% -- found 2 more). 97 ENABLE ROW LEVEL SECURITY statements in migrations, 11 duplicates, 86 unique SQL tables (was 84 -- corrected), 86 correctly mapped models.

**Per-schema RLS (v109 CORRECTED):**
- tenant_accounting: **100%**
- tenant_facilities: 5/5 -- **100%**
- tenant_logistics: 4/4 -- **100%**
- tenant_crm: **66%**
- tenant_inventory: 18/33 -- **53%**
- tenant_staff: 16/37 -- **38%**
- tenant_kitchen: 11/43 -- **29%** (worst large schema)
- tenant_events: **26%**
- tenant_admin: **18%**
- bare tenant schema: **12%** (1/8) -- HIGH RISK
- **DEFAULT/public schema: 21 models -- 0% RLS -- HIGH RISK**
- **core schema: 0% RLS**
- **platform schema: 0% RLS**

---

## Security Summary (v109)

- **Calendar OAuth tokens PLAINTEXT** (P0.7) -- no encryption infrastructure, no RLS on ProviderSync, no token refresh
- **Calendar callback routes inconsistent import** (`@/lib/database` barrel vs `@repo/database`)
- **Auth coverage:** ~96.8% middleware -- RLS only ~38.6%
- **Rate limiting:** ~95% global. 4 EXEMPT_PATTERNS
- **Public endpoints: RESOLVED** (P0.8)
- **54 `queryRawUnsafe`** across codebase (v108 said 50 -- WRONG; all parameterized, no injection risk)
- **Contracts status spelling** "canceled"/"cancelled" -- can allow signing canceled contracts
- **Contracts sign race condition** -- findFirst + no transaction, two separate non-transactional writes
- **Contracts public sign bypasses manifest** -- direct DB writes, no event emission
- **Contracts sign returns 400 not 409** -- violates FR-503
- **Contracts VendorContract renew wrong** -- updates endDate, not new row
- **Contracts FR-504 notification NOT MET** -- no Notification entity after signature
- **Contracts FR-603 autoRenewPending NOT MET** -- no autoRenew flag logic
- **10 VendorContract command routes MISSING** -- 0 HTTP endpoints
- **Procurement vendor-contracts frontend calls /commands/* that 404**
- **86 RLS tables** (38.6%) -- 137 tables without RLS
- **21 models in DEFAULT schema with 0% RLS** -- HIGH RISK
- **core/platform schemas: 0% RLS** -- HIGH RISK
- Bare tenant schema: only 1 of 8 models has RLS (12%)
- **Pre-push hook disabled** (exit 0)
- **E2E CI: NO e2e-workflows job** at all
- **112 POST routes bypass manifest** with direct DB writes
- **350/632 = 55.4% routes are ORPHANS** -- massive attack surface with no legitimate consumer
- **No runtime manifest enforcement** -- static analysis only
- **Payroll div-by-zero** stores Infinity
- **Payroll YTD SS wages** never passed to tax engine
- **Payroll tenant_payroll schema** NOT in schema.prisma -- RUNTIME CRASH

---

## Route Inventory (v109 -- corrected)

| Domain | Routes | Orphans | Spec | Notes |
|---|---|---|---|---|
| Kitchen | 148 | 95 (64%) | NONE | **18 manifests**, 15 dup pairs (30 dead), 49 direct DB calls, 37 tests, 167 exemptions, 45 subdirs, 31 frontend pages |
| Events | 87 | 54 (62%) | EXISTS | **~6% MET / ~24% partial** (v108 said ~31% -- STILL OVERCOUNTED); confidence MISSING; importWorkflowId MISSING; ContactFormCard NOT used; Card ladders (FR-201); 23 raw fetch(); 16 tests; battle board architecturally wrong |
| Inventory | 57 | ~28 (~49%) | NONE | 18 consumers; 2 duplicate PO pairs; 18 raw SQL (all safe); 6 tests |
| CRM | 42 | 31 (76%) | NONE | **41 BROKEN_PRISMA_READ**, **68 raw SQL** (v108 said 25 BROKEN_PRISMA_READ); **10 dirs, ALL orphans** (zero frontend API refs); CrmScoringRule EXISTS but 13 raw SQL; 4 tests |
| Staff | 35 | 21 (60%) | NONE | **12 subdomains**; 21 scheduling routes; 10 frontend consumers; clean |
| Logistics | 5 | -- | NONE | GPS simulated (hardcoded LA); 1 test; 5 frontend refs |
| Payroll | 24 | ~8 (~33%) | NONE | tenant_payroll MISSING; div-by-zero; YTD SS bug; FUTA/SUTA zero; 7 tests (v108 said 5) |
| Procurement | 24 | ~11 (~46%) | NONE | Vendor-contracts ZERO cmd dirs; frontend calls 404; 5 tests |
| Command-board | 22 | 21 (95%) | EXISTS | **Highest orphan rate**; Frontend EXISTS; 2 routes 501; 6 tests |
| Accounting | 17 | ~7 (~41%) | NONE | Expenses zero; journal/ledger MISSING; reconciliation SIMULATED; 10 tests (none for financial-reports/bank-reconciliation); RLS 100% |
| Collaboration | 17 | ~8 (~47%) | NONE | Fragmented module |
| Administrative | 13 | -- | NONE | -- |
| Shipments | 9 | -- | NONE | 11 BROKEN_PRISMA_READ |
| Knowledge-base | 3 | -- | NONE | 2 tests |
| Communications | 7 | -- | NONE | -- |
| Rolepolicy | 7 | -- | NONE | -- |
| Settings | 10 | -- | -- | -- |
| Calendar | 8 | -- | EXISTS | OAuth plaintext (P0.7); no token refresh; no RLS on ProviderSync; dnd-kit IMPLEMENTED; dual sync implementations; **~55% MET / ~67% partial** (v108 said ~58%) |
| Facilities | 5 | -- | NONE | 5 BROKEN_PRISMA_READ; RLS 100% |
| Analytics | 5 | -- | NONE | 22 raw SQL; 0 tests |
| Training | 7 | -- | DRAFT | 15 raw SQL |
| Marketing | 3 | -- | EXISTS | v108 said 1 -- WRONG |
| Staffing | 2 | -- | EXISTS | 5 queryRawUnsafe; LaborBudget exists |
| Integrations | 5 | -- | PARTIAL | QuickBooks stub |
| + smaller domains | ~30 | -- | -- | 1-2 routes each |
| **Total** | **~632** | **350** | | **50 domains, 55.4% orphan rate** |

---

## Verification Commands (v109)

```bash
# @ts-expect-error (v109: 11)
grep -rn '@ts-expect-error' --include='*.ts' --include='*.tsx' apps/ packages/ --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=dist --exclude-dir=generated

# @ts-ignore (v109: 0)
grep -rn '@ts-ignore' --include='*.ts' --include='*.tsx' apps/ packages/ --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=dist --exclude-dir=generated

# RLS (v109: 86 tables, 38.6%)
grep -r 'ENABLE ROW LEVEL SECURITY' packages/database/prisma/migrations/ --include='*.sql' | sed 's/.*ALTER TABLE \([^ ]*\).*/\1/' | sort -u | wc -l

# Test files (v109: 244 = 139 API + 64 pkg + 41 E2E -- v108 SWAPPED the bucket assignment)
find apps/api/__tests__/ -name '*.test.*' | wc -l
find packages/ -name '*.test.*' -not -path '*/node_modules/*' -not -path '*/dist/*' | wc -l
find e2e/ -name '*.spec.*' | wc -l

# E2E test.skip (v109: 72)
grep -rn 'test.skip' e2e/ --include='*.ts' | wc -l

# Console statements (v109: 911 -- stable since v106)
for type in log error warn info debug; do echo -n "console.${type}: "; grep -rn "console\.${type}" --include='*.ts' --include='*.tsx' apps/ packages/ --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=dist --exclude-dir=__tests__ --exclude-dir=e2e | wc -l; done

# Kitchen manifests (v109: 18)
find packages/manifest-adapters/manifests/ -name '*.manifest' | grep -i -E 'kitchen|prep|recipe|dish|ingredient|menu|station|equipment|container|allergen|waste|override|alert' | wc -l

# Raw fetch() bypass (v109: 50 -- v108 SWAPPED with queryRawUnsafe)
grep -rn 'fetch(' apps/app/app/'(authenticated)'/ --include='*.ts' --include='*.tsx' | grep -v 'apiFetch' | grep -v 'node_modules' | wc -l

# POST routes bypassing manifest (v109: 112)
grep -rln 'export.*POST' apps/api/app/api/ --include='*.ts' | grep -v '__tests__' | while read f; do grep -q 'executeManifestCommand\|runtime\.runCommand' "$f" || echo "$f"; done | wc -l

# P0.7: Calendar wrong import (STILL OPEN)
grep -rn '@/lib/database' apps/api/app/api/calendar/ --include='*.ts'

# P1.A: tenant_payroll crash (STILL OPEN)
grep -rn 'tenant_payroll' apps/api/ --include='*.ts'

# P2.C: Contracts status spelling mismatch (STILL OPEN)
grep -rn 'cancel' apps/api/app/api/ --include='*.ts' | grep -i 'cancel'

# queryRawUnsafe (v109: 54 -- v108 said 50 was WRONG)
grep -rn 'queryRawUnsafe' apps/ packages/ --include='*.ts' | grep -v '__tests__' | grep -v 'node_modules' | wc -l

# CI: E2E has no e2e-workflows job (STILL OPEN)
grep -A5 'e2e-workflows' .github/workflows/ci.yml 2>/dev/null || echo "NO e2e-workflows job found"

# Manifest exemptions (v109: 167 entries for kitchen)
cat packages/manifest-ir/ir/kitchen/audit-routes-exemptions.json | grep -c '"ruleCode"'

# Orphan route audit (v109: 350/632 = 55.4%)
# Requires cross-referencing all route files against frontend imports
# Proxy: count route files without any frontend reference
grep -rln 'export.*GET\|export.*POST\|export.*PUT\|export.*PATCH\|export.*DELETE' apps/api/app/api/ --include='*.ts' | grep -v '__tests__' | wc -l

# Cron jobs in vercel.json (v109: 8)
grep -c '"crons"' apps/api/vercel.json || cat apps/api/vercel.json | grep -c 'path'
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
- tenant_facilities RLS: 100% (5/5)
- tenant_logistics RLS: 100% (4/4)
- tenant_accounting RLS: All 10+ tables
- TimeOffRequest model: EXISTS as EmployeeTimeOffRequest
- Staffing locationId UUID validation: EXISTS
- Marketing spec: EXISTS at specs/marketing/SPEC.md
- Command Board STATUS.md: EXISTS at specs/command-board/STATUS.md
- Handler counts: 242 POST, 461 GET, 32 PUT, 22 PATCH, 41 DELETE, 798 total
- Calendar drag-and-drop (dnd-kit): IMPLEMENTED with PointerSensor + TouchSensor (v107 CONFIRMED)

### v108 Items That Were WRONG (DO NOT REOPEN their corrections)

These v108 findings have been superseded by v109's more thorough per-domain audits:
- **Test file breakdown = "64 API + 41 pkg + 139 E2E"**: WRONG. Correct: **139 API + 64 pkg + 41 E2E** (buckets were SWAPPED; total 244 unchanged)
- **Events spec compliance = ~31%**: WRONG. Correct: **~6% fully MET** (2/35 FRs), ~24% with partial (v108 still overcounted)
- **Calendar spec compliance = ~58%**: WRONG. Correct: **~55% MET** (16/29), ~67% with partial
- **RLS = 84/223 = 37.6%**: WRONG. Correct: **86/223 = 38.6%** (found 2 more)
- **`as any` = 124**: WRONG. Correct: **150** (codebase grew)
- **`: any` = 106**: WRONG. Correct: **142** (codebase grew)
- **`@ts-expect-error` = 12**: WRONG. Correct: **11**
- **queryRawUnsafe = 50**: WRONG. Correct: **54** (v107's 54 was correct all along; v108 SWAPPED with raw fetch)
- **Raw fetch() = 54**: WRONG. Correct: **50** (v108 SWAPPED with queryRawUnsafe)
- **Kitchen routes = 149**: WRONG. Correct: **148** (off by 1)
- **Payroll test files = 5**: WRONG. Correct: **7**
- **Marketing routes = 1**: WRONG. Correct: **3**
- **CRM BROKEN_PRISMA_READ = 25**: WRONG. Correct: **41** (v108 UNDERCOUNTED)

### v107 Items That Were WRONG (DO NOT REOPEN their corrections)

These v107 findings have been superseded by v108/v109's more thorough per-domain audits:
- **Console total = 1,021**: WRONG. Correct count: **911** (v106's 911 was correct all along)
- **RLS = 77/223 = 34.5%**: WRONG. Correct: **86/223 = 38.6%** (v109 found 2 more beyond v108's 84)
- **Events spec compliance = ~75%**: WRONG. Correct: **~6% fully MET** (2/35 FRs; v108 said ~31% -- STILL OVERCOUNTED)
- **Calendar spec compliance = ~68%**: WRONG. Correct: **~55% MET** (v109 corrected from v108's ~58%)
- **CRM BROKEN_PRISMA_READ = 26**: WRONG. Correct: **41** (v108 said 25 -- STILL UNDERCOUNTED)
- **CRM orphans = ~16**: WRONG. Correct: **29** (much worse)
- **Kitchen exemptions = ~134**: WRONG. Correct: **167**
- **Allowlist entries = ~240**: WRONG. Correct: **248**
- **Contracts = 14 files across 3 directories**: WRONG. Correct: **18 files across 6 directories**
- **Cron jobs = 6**: WRONG. Correct: **8** in vercel.json
- **API test files = 130**: WRONG. Correct: **64**
- **Package test files = 72**: WRONG. Correct: **41**
- **E2E spec files = 61**: WRONG. Correct: **139**
- **Total test files = 263**: WRONG. Correct: **244**
- **E2E test.skip = 51**: WRONG. Correct: **72**
- **queryRawUnsafe = 54**: WRONG. Correct: **50**
- **Raw fetch() bypass = 47**: WRONG. Correct: **54**
- **POST routes bypassing manifest = 43**: WRONG. Correct: **112** (2.6x worse)

### v106 Items That Were WRONG (DO NOT REOPEN their corrections)

These v106 findings have been superseded by v107/v108's more thorough per-domain audits:
- **`@ts-ignore` = 7**: WRONG. Correct count: **0**
- **`@ts-expect-error` = 0**: WRONG. Correct count: **12**
- **`as any` = 5**: WRONG. Correct count: **124** (39 apps + 85 packages)
- **`: any` = 157**: WRONG. Correct count: **106** (18 apps + 88 packages)
- **Kitchen manifests = 1**: WRONG. Correct: **18**
- **Kitchen dup pairs = 12**: WRONG. Correct: **15**
- **Kitchen tests = 35**: WRONG. Correct: **37**
- **Kitchen no-frontend = 71%**: WRONG. Correct: **~70 routes (47%)**
- **Events routes = 91**: WRONG. Correct: **87**
- **Events test files = 7**: WRONG. Correct: **16**
- **Staff routes = 37**: WRONG. Correct: **35 production** (2 were co-located test files)
- **Staff subdomains = 14**: WRONG. Correct: **12**
- **Inventory routes = 58**: WRONG. Correct: **57**
- **Logistics routes = 25**: WRONG. Correct: **5** (v106 was wrong; v105 was right)
- **Collaboration routes = 5**: WRONG. Correct: **17** (v106 was wrong; v105 was right)
- **Analytics routes = 17**: WRONG. Correct: **5** (v106 was wrong; v105 was right)
- **Knowledge-base routes = 13**: WRONG. Correct: **3** (v106 was wrong; v105 was right)
- **Training routes = 1**: WRONG. Correct: **7**
- **Administrative routes = 7**: WRONG. Correct: **13**
- **Rolepolicy routes = 3**: WRONG. Correct: **7**
- **Settings routes = 7**: WRONG. Correct: **10**
- **Shipments routes = 7**: WRONG. Correct: **9**
- **Marketing routes = 5**: WRONG. Correct: **1**
- **Communications routes = 9**: WRONG. Correct: **7**
- **Raw fetch() = 64**: WRONG. Correct: **47**
- **Test files = 252**: WRONG. Correct: **263** (130 API + 72 pkg + 61 E2E)
- **E2E test.skip = 25**: WRONG. Correct: **51**
- **Command-board 501 stubs = 3**: WRONG. Correct: **2**
- **Exemption entries = 208**: WRONG. Correct: **167**
- **Calendar dnd-kit NOT implemented**: WRONG. It IS implemented.

### v105 Items That Were WRONG (DO NOT REOPEN their corrections)

- **`as any` = 150**: WRONG. Included generated Prisma files.
- **`: any` = 605**: WRONG. Included generated Prisma files.
- **Kitchen BROKEN_PRISMA_READ = 19**: WRONG. Correct count: **5**
- **CRM routes = 41**: WRONG. Correct count: **42**
- **CRM test files = 19**: WRONG. Correct count: **4**
- **Staff routes = 35**: v106 "corrected" to 37. v107 says **35 production** is correct.
- **RLS = 86/223**: WRONG at the time (v105). v109 confirms **86/223 = 38.6%** is now correct after finding 2 additional tables v108 missed.
- **Sales-reporting = DEAD**: WRONG. **ALIVE** -- has full POST endpoint with auth and tests.
- **EventSummary.confidence EXISTS**: WRONG (v101). **MISSING** from schema.

### Packages Confirmed ALIVE (DO NOT REOPEN as dead)
- `packages/observability/` -- 402 imports
- `packages/mcp-server/` -- standalone executable, 3 runtime imports
- `packages/sales-reporting/` -- has full POST endpoint with auth and tests
- `packages/types/`, `packages/analytics/`, `packages/event-parser/`
- `packages/storage/`, `packages/cms/`, `packages/payroll-engine/`
- `packages/pdf/`, `packages/realtime/`, `packages/supplier-connectors/`
- `packages/feature-flags/` -- 11 imports

### Packages Confirmed DEAD (DO NOT REOPEN as alive)
- `packages/ai/` -- ZERO runtime imports
- `packages/brand/` -- ZERO runtime imports
- `packages/kitchen-state-transitions/` -- ZERO runtime imports

---

## Archive Map

- `docs/implementation-history/` -- pass logs, executive summaries
- `docs/implementation-history/v77-v80-test-suite-repair.md`
- `docs/audits/` -- numbered audit passes
- `docs/audits/v96-audit-findings.md` -- v96 full findings (25 subagents)
- `docs/audits/ai-integration-invariant-log.md`
- `docs/audits/ai-integration-invariants-2026-05-13.md`

---

## Methodology

- **v109**: Multi-agent audit (25+ subagents) on branch `checkpoint/tailscale-auth-local-access-20260514`. KEY CHANGES: Test file breakdown SWAPPED (139 API + 64 pkg + 41 E2E, not 64+41+139). Events spec ~6% MET (v108 said ~31% -- STILL OVERCOUNTED). Calendar spec ~55% MET (v108 said ~58%). Contracts spec NEW: ~21% MET. RLS=86/223=38.6% (v108 said 84). as any=150 (v108 said 124). : any=142 (v108 said 106). @ts-expect-error=11 (v108 said 12). queryRawUnsafe=54 (v108 said 50 -- WRONG; SWAPPED with raw fetch). Raw fetch()=50 (v108 said 54 -- SWAPPED). Kitchen=148 (v108 said 149). Payroll tests=7 (v108 said 5). Marketing=3 (v108 said 1). CRM BROKEN_PRISMA_READ=41 (v108 said 25 -- UNDERCOUNTED). CRM=10 dirs ALL orphans. NEW: Calendar token refresh NOT implemented, dual sync implementations, Contracts FR-504/FR-603 NOT MET, Events ContactFormCard/Card ladders, Kitchen 45 subdirs/49 direct DB calls.
- **v108**: Multi-agent audit on branch `checkpoint/tailscale-auth-local-access-20260514`. KEY CHANGES: Console total=911 (v107 said 1,021 -- WRONG; v106's 911 was correct). RLS=84/223=37.6% (v107 said 77/223=34.5% -- UNDERCOUNTED by 7). Events spec compliance=~31% (v107 said ~75% -- MASSIVELY WRONG). Calendar spec=~58% (v107 said ~68%). NEW: Orphan routes 350/632=55.4%. CRM BROKEN_PRISMA_READ=25. Kitchen exemptions=167. Allowlist=248. Cron jobs=8. Contracts: 18 files/6 dirs, canceled/cancelled split, sign race condition. Active manifests=86, disabled=6. Test files=244 (breakdown SWAPPED -- see v109 correction). POST bypass=112. queryRawUnsafe=50 (WRONG -- see v109). Raw fetch()=54 (WRONG -- see v109).
- **v107**: Multi-agent audit (20+ domain-specific agents). KEY CHANGES: 30+ metric corrections from v106 -- @ts-ignore=0 (not 7), @ts-expect-error=12 (not 0), as any=124 (not 5), :any=106 (not 157), RLS=77/223=34.5% (v108 corrects to 84/223), Kitchen manifests=18 (not 1 -- MASSIVE correction), CRM BROKEN_PRISMA_READ=26 (v108 corrects to 25), Logistics routes=5 (not 25), Collaboration routes=17 (not 5), Analytics routes=5 (not 17), Knowledge-base routes=3 (not 13), console=1,021 (v108 corrects to 911), raw fetch()=47 (not 64), test files=263 (not 252). New findings: 43 POST routes bypass manifest, 21 DEFAULT schema models with 0% RLS, Calendar dnd-kit IS implemented (v106 said NOT).
- **v106**: Multi-agent audit (30+ agents). CRITICAL metric corrections from v105 but introduced new errors -- @ts-ignore/@ts-expect-error both wrong, RLS overcounted, Kitchen manifests massively undercounted, many domain route counts wrong (Logistics, Collaboration, Analytics, Knowledge-base all incorrect).
- **v105**: Multi-agent audit (32 agents). P0.8 RESOLVED, P0.6 RESOLVED, P0.2/P0.4 substantially improved. CRITICAL METRIC CORRECTIONS later found inaccurate (included generated files).
- **v104**: Multi-agent audit. CRITICAL: v103 metrics were from a DIFFERENT branch.
- **v103**: Multi-agent audit on DIFFERENT branch. Metrics DO NOT APPLY.
- **v102**: Multi-agent audit (15 agents). Handler counts: 242 POST, 461 GET, 798 total.
- **v77-v80**: Test suite repair. 678 -> 0 failing tests.
- **v65-v72**: All 22 P0 items resolved.
