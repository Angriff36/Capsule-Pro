# IMPLEMENTATION_PLAN.md — v88

> Updated 2026-05-14
> Synthesized from v88 re-audit correcting significant v87 errors.
> All 22 P0 items resolved (v65-v72). Test suite repair complete (v77-v80).
> v0.12.2 tag created with RLS fixes and console statements audit baseline.
> **v88 KEY CORRECTIONS:** Console statements total 1,078 (v87 had debug/log SWAPPED: debug=1 not 420, log=420 not 1; error=555 not 367; warn=33 not 70; info=70 not 33). Hardcoded /api/ paths 620 (NOT 331 — v87 undercounted by 289). RLS actual 82/214=38.3% (NOT 97/221=43.8% — v87 had duplicate counts and wrong totals). Inventory routes 58 (NOT 24 — v87 undercounted by 34). Events routes 87 (MISSING from v87 entirely). Procurement 24 routes (NOT 58 — v87 included inventory). Documents 1 route (NOT 7). tenant_facilities 2/6=33.3% (NOT 5/5=100%). packages/ai is DEAD (v87 said ALIVE with 12 imports). packages/brand is DEAD (v87 said ALIVE with 8 files). packages/auth is 2nd heaviest with 714 imports (OMITTED from v87). packages/feature-flags EXISTS with 11 imports (v87 said "does not exist"). packages/sales-reporting has 1 import (NOT 7). P0.3 manifest POST gap RESOLVED (was 242, now 0). AllergenWarning manifest wiring RESOLVED. :any types 18 (NOT 12). Kitchen has 11 singular/plural route directory pairs (65+ likely duplicate routes). 22 domains not in v87 accounting for 96 routes. 241 test files (NOT 243). 47 skips (NOT 42). E2E skips 41 (NOT 37). Manifest runtime commands 40 (NOT 37). routes.manifest.json 849 routes (589 POST + 260 GET).

---

## P0 — Critical Infrastructure

These items block production safety or allow regressions to ship undetected.

### P0.1 — Remove `ignoreBuildErrors` [READY TO REMOVE]

**Status:** All three apps still have the flag set. Comment says typecheck done via `pnpm tsc --noEmit` in CI but that only covers apps.

- `apps/app/next.config.ts:17` — `ignoreBuildErrors: true`
- `apps/api/next.config.ts:102` — `ignoreBuildErrors: true`
- `apps/web/next.config.ts:196` — `ignoreBuildErrors: true`
- `skipLibCheck: true` in 8 tsconfig files

**Steps:**
1. Remove `ignoreBuildErrors` from all three `next.config.ts` files
2. Verify clean build with zero errors
3. Optionally address `skipLibCheck` in a follow-up

### P0.2 — Add Prisma Generate + db:check to CI [NOT STARTED]

**Status:** ci.yml has NO dedicated Prisma generate or db:check step. `prisma migrate deploy` only runs in E2E job. Main CI relies on implicit postinstall. `scripts/db-drift-check.mjs` is a **no-op placeholder** that always exits 0.

**Steps:**
1. Add explicit step after install in main CI job
2. Make it a HARD gate (no `continue-on-error`)
3. Fix or replace `scripts/db-drift-check.mjs` with real drift detection

**Files:** `.github/workflows/ci.yml`, `scripts/db-drift-check.mjs`

### P0.3 — Manifest Route Enforcement [RESOLVED — DO NOT REOPEN]

**Status:** `manifest-ci.yml` IS a hard gate. POST route gap is now **ZERO**. 209 filesystem POST routes: 66 matched by manifest IR, 143 matched by allowlist. Only 1 total write handler (DELETE /api/inventory/audit/reports/[id]) uncovered across all methods.

~Moved to Resolved section.~

### P0.4 — Extend TypeScript Typecheck to Packages + Fix CI Step Label [NOT STARTED]

**Status:** CI typecheck (ci.yml line 45) is MISLABELED as "Run linting" but actually runs typecheck. Only covers 3 apps. No packages are typechecked. 6 apps never typechecked (docs, email, mobile, storybook, studio). No Biome lint gate in CI. `skipLibCheck: true` everywhere.

**Steps:**
1. Fix step name from "Run linting" to "Run typecheck"
2. Add package typecheck to CI
3. Add typecheck scripts to 6 packages that lack them
4. Add actual linting step (Biome) or document that lint runs locally only

**Files:** `.github/workflows/ci.yml`

---

## P1 — High Priority

### P1.A — Payroll Runtime Bugs [NOT STARTED]

**Status:** Multiple runtime-level bugs prevent correct payroll operation.

- **CRITICAL:** `tax/list/route.ts` references `tenant_payroll.tax_configurations` — schema DOES NOT EXIST. Route will crash at runtime
- **CRITICAL:** Federal bracket values inconsistent — 3 copies with 2 different value sets: `taxEngine.ts` (canonical), `tax/brackets/route.ts` (hardcoded override), `tax/list/route.ts` (another copy)
- Missing `PayrollPeriod`/`PayrollRun`/`PayrollLineItem` Prisma models (models exist but in wrong schema context)
- State tax coverage: 9/50 states (only 8 with actual tax logic — CA, NY, OH, PA, IL, TX, FL, WA)
- No pay stub generation
- No W-4/withholding form management
- `payroll-engine` package exists with core calculations
- No spec at `specs/payroll.md`

**Steps:**
1. Fix `tenant_payroll` schema reference in `tax/list` route (should use correct schema)
2. Reconcile federal bracket values across all 3 copies (single source of truth)
3. Ensure `PayrollPeriod`/`PayrollRun`/`PayrollLineItem` models align with actual DB schema
4. Author payroll spec at `specs/payroll.md`

**Files:** `apps/api/app/api/payroll/`, `packages/database/prisma/schema.prisma`

### P1.B — CRM Pipeline Persistence Broken [NOT STARTED]

**Status:** Deal model DOES NOT EXIST. Deals routes are virtual view over Proposals. No PUT/PATCH for pipeline stage changes — drag-and-drop is ephemeral. 41 route files. Pipeline functionally broken for persistence. No spec at `specs/crm.md`.

**Steps:**
1. Wire CRM manifests to Prisma stores (BROKEN_PRISMA_READ pattern)
2. Fix pipeline drag-and-drop to use existing Proposal model
3. Author CRM spec at `specs/crm.md`

**Files:** CRM manifest files, `apps/api/app/api/crm/`

### P1.C — Console Statement Cleanup [CORRECTED — 1,078 TOTAL]

**Status:** v88 CORRECTION: **1,078 console statements** (NOT 891 — v87 undercounted). v87 had debug/log SWAPPED.

**Breakdown (v88 corrected):**
- 555 `console.error` (NOT 367 — largest block)
- 420 `console.log` (NOT 1 — v87 SWAPPED debug/log)
- 70 `console.info` (NOT 33 — v87 SWAPPED warn/info)
- 33 `console.warn` (NOT 70 — v87 SWAPPED warn/info)
- 1 `console.debug` (NOT 420 — v87 SWAPPED debug/log)

**@repo/observability:** 390 file imports (388 apps, 2 packages). 376 files import `{ log }` from `@repo/observability/log`. The replacement path IS wired and well-adopted.

**Priority order:**
1. Replace `console.error` in API route catch blocks (555 instances — largest block)
2. Replace `console.log` calls (420 instances — bulk cleanup)
3. Replace remaining `console.warn`/`console.info`/`console.debug`

### P1.D — Design System: Pastel Backgrounds + Bare Card [CORRECTED]

**Status:** Bare Card is **279** (unchanged from v87). Pastel backgrounds **117** (NOT 138 — v87 overcounted by 21).

- Bare `<Card>` without tone: **279**
- Pastel background violations: **117** (v87 said 138)
- shadow-* violations: 37 (unchanged)
- BlogFilterChip: 39 imports across 7 files
- ResearchTable: 23 imports across 10 files
- StatusPill: 67 imports across 17 files

**Steps:**
1. Systematic removal of 117 pastel background violations
2. Audit bare Card usage — determine which need `tone` prop (279 instances)
3. Drive BlogFilterChip and ResearchTable adoption

### P1.E — TypeScript Strictness [CORRECTED]

**Status:** v88 CORRECTION: `:any` types is **18** (NOT 12 — v87 undercounted by 6).
- `:any` types: **18** (NOT 12)
- `@ts-ignore`: **0** (confirmed clean)
- `@ts-expect-error`: **7** (stable)
- TODO in production source: **7** (stable)
- FIXME: **0** (clean)
- HACK: **0** (clean)

**Steps:**
1. Resolve 18 `:any` types in non-generated code
2. Add justification comments on all 7 `@ts-expect-error` suppressions
3. Triage 7 TODO items in production source

### P1.F — Accounting: Financial Reports Expenses Hardcoded to Zero [CONFIRMED]

**Status:** `.reduce(() => 0, 0)` at `financial-reports/route.ts:262` confirmed. Expenses always report as zero. Journal entries and general ledger MISSING ENTIRELY. Accounts receivable MISSING. Bank reconciliation FULLY SIMULATED.

- 17 route files, 36 HTTP handlers
- 21 manifest references
- Invoicing, payments, revenue recognition, collections: fully implemented
- No spec at `specs/accounting.md`

**Steps:**
1. Fix `.reduce(() => 0, 0)` to actually compute expense totals
2. Implement journal entries / general ledger foundation
3. Implement accounts receivable workflow

**Files:** `apps/api/app/api/accounting/`

### P1.G — Inventory Route Manifest Gap [CORRECTED]

**Status:** v88 CORRECTION: Inventory has **58 routes** (NOT 24 — v87 undercounted by 34). Still 0 manifest commands.

- **Inventory: 58 routes, 0 manifest commands** — this is a major gap
- Only 1 transfer route exists (list). Create, approve, cancel, receive, ship commands defined in manifest IR but have NO API routes

**Steps:**
1. Wire inventory routes to manifest commands (58 routes, 0 coverage)
2. Author inventory spec at `specs/inventory.md`

**Files:** `apps/api/app/api/inventory/`

### P1.H — Hardcoded API Paths [CORRECTED — 620]

**Status:** v88 CORRECTION: **620 hardcoded `/api/` paths** (NOT 331 — v87 undercounted by 289). Breakdown: 351 double-quoted + 269 template literals.

**Steps:**
1. Extract API base URL to shared constant
2. Migrate hardcoded paths to use the constant or typed API client
3. Verify `check-hardcoded-routes.mjs` catches new violations

---

## P2 — Medium Priority

### P2.A — Calendar (8 routes, spec violations confirmed)

- [x] Drag-and-drop: DONE (dnd-kit)
- [x] ResearchTable: DONE
- [x] BlogFilterChip: DONE for view toggle
- [ ] CRITICAL: Reschedule uses direct `database.event.update()` / `database.scheduleShift.update()` — NO manifest commands (FR-504 confirmed)
- [ ] CRITICAL: OAuth tokens stored PLAINTEXT in providerSync table (FR-604 confirmed)
- [ ] 0 manifest commands out of 8 routes
- [ ] No optimistic concurrency control (FR-502)
- [ ] No mobile responsive layout for drag-and-drop
- [ ] No E2E tests for calendar reschedule

### P2.B — Accounting (17 routes, significant gaps)

- [x] Comprehensive invoicing, payments, collections, revenue recognition
- [ ] Financial reports expenses HARDCODED TO ZERO (see P1.F)
- [ ] Journal entries / general ledger: MISSING ENTIRELY
- [ ] Bank reconciliation: FULLY SIMULATED
- [ ] Accounts receivable: MISSING
- [ ] 21 manifest references (good coverage for existing features)

### P2.C — Contracts (1 top-level route + public signing)

- [x] 8 EventContract commands confirmed (matching target)
- [x] Public signing surface exists at /api/public/contracts/[token]/
- [x] VendorContract commands exist (10 routes confirmed)
- [ ] Public signing uses direct DB writes (FR-504 violation)
- [ ] Public sign returns 400 not 409 for duplicates

### P2.D — Events (87 routes — v88 CORRECTION)

**v88 CORRECTION:** Events has **87 routes** (v87 said "8 routes" — was off by 79). This is the 2nd largest domain after Kitchen.

- [ ] `Event.importWorkflowId` NOT in schema
- [ ] `EventImportWorkflow` model missing entirely
- [ ] Event import code commented out at `apps/api/app/api/events/documents/parse/route.ts:936-944`
- [ ] 6-stage import workflow at 30% (UI shows 8-phase display; backend has flat `parseStatus`)
- [ ] Battle board at 40%
- [ ] AI confidence field missing
- [ ] 13/21 pages use legacy Header imports
- [ ] Spec needed at `specs/events.md`

### P2.E — Kitchen (148 routes — largest domain, no spec)

- [ ] 21 manifest commands (NOT 39 — v86 overcounted)
- [ ] 21/148 routes use manifest commands (14.2%)
- [ ] **11 singular/plural route directory pairs** (dish/dishes, ingredient/ingredients, recipe/recipes, etc.) — likely legacy duplicates accounting for 65+ routes
- [ ] No hardcoded nutrition ingredients found (v86 claim was incorrect)
- [ ] Spec needed at `specs/kitchen.md`

### P2.F — Logistics (5 routes, 0 manifest commands)

- [x] 5 GET routes (vehicles, drivers, routes, shipments, dispatch)
- [ ] 0 manifest commands have API route implementations
- [ ] GPS tracking: SIMULATED (not real)
- [ ] Spec needed at `specs/logistics.md`

### P2.G — Staffing (2 routes, 5 queryRawUnsafe — ALL PARAMETERIZED)

- [ ] CoverageBar primitive NOT authored (4 inline implementations)
- [ ] 5 `queryRawUnsafe` calls in `staffing/coverage/route.ts` (lines 70, 88, 112, 128, 147) — all parameterized with `$1`/`$2`, safe but cosmetic cleanup needed
- [ ] 4 other files converted (now just comments)
- [ ] Labor budget alerts backend NOT surfaced on frontend

### P2.H — Staff (35 routes — DIFFERENT DOMAIN from staffing)

- 35 route files under `apps/api/app/api/staff/`
- Scheduling is fully implemented here (18+ API routes)

### P2.I — Settings (10 routes, fully implemented)

- 10 route files
- Billing blocked on model

### P2.J — Analytics (5 routes, fully implemented)

- 5 routes, fully implemented
- Revenue computed 4 different ways across pages — no shared metrics contracts
- Spec needed at `specs/analytics.md`

### P2.K — Marketing (1 route — minimal)

- 1 route (analytics only)
- Campaigns: "Coming Soon" placeholder with legacy Header
- Zero BlogFilterChip, ResearchTable, ContactFormCard, StatusPill usage

### P2.L — Command Board (22 routes, 10 with write capabilities)

- [x] 22 routes, 10 with write capabilities
- [x] Shell score: 3/3 (full compliance)
- [ ] AI Chat UI: NOT IMPLEMENTED (APIs exist)
- [ ] Simulation: backend only, no UI
- [ ] Entity Detail Panel: NOT IMPLEMENTED
- [ ] Plan Approval UI: NOT IMPLEMENTED (APIs exist)
- [ ] Board templates return 501
- [ ] Data model divergence: frontend uses `CommandBoardCard`, API uses `BoardProjection`
- [ ] Template sharing blocked

### P2.M — Knowledge Base (3 routes, all read-only)

- 3 routes, all read-only
- No write/command surface for creating or editing articles

### P2.N — Integrations (25 routes — v88 CORRECTION)

**v88 CORRECTION:** 25 routes (NOT 23 — v87 undercounted by 2).

- GoodShuffle: 10 routes
- Nowsta: 6 routes
- QuickBooks: 1 route
- Webhooks: 9 routes (includes retry mechanism)

### P2.O — Training (7 routes)

- 7 route files
- Training module with moderate coverage

### P2.P — Search [RESOLVED — DO NOT REOPEN]

- [x] FR-107 resolved: single-char queries return 400
- [x] Entity coverage at 15 (meets spec requirement of 15+)
- [x] Multi-word AND-chaining IS implemented
- [ ] No saved searches, no search history (low priority)

### P2.Q — Procurement (24 routes — v88 CORRECTION)

**v88 CORRECTION:** Procurement has **24 routes** (NOT 58 — v87 included inventory routes).

- Requisitions: 8/8 command routes COMPLETE
- Vendor-contracts: 10/10 command routes COMPLETE
- Vendors: some command routes exist
- Spec needed at `specs/procurement.md`

### P2.R — Timecards (10 routes, no dual implementation)

- 10 routes. No dual implementation exists.

### P2.S — Documents (1 route — v88 CORRECTION)

**v88 CORRECTION:** Documents has **1 route** (NOT 7 — v87 overcounted by 6).

### P2.T — Catering (1 route)

- 1 route (list only)
- No create/update/delete command routes
- No manifest command surface

### P2.U — Warehouse (2 routes, no writes)

- Only 2 GET-only list routes
- All write operations missing (create, update, delete, transfer)
- No manifest command surface

### P2.V — Communications/Collaboration Fragmentation

**Status:** `communications/` and `collaboration/notifications/` duplicate email/SMS functionality. Zero manifest command routes. SMS automation has camelCase/kebab route duplication.

### P2.W — Frontend Module Design System Compliance

**Status:** 13/15 modules score 3/3. Kitchen 2/3.

| Module | Score | Notes |
|--------|-------|-------|
| accounting | 3/3 | Full PageCanvas/CommandBand/MetricBand/OperationalColumn |
| analytics | 3/3 | Complete shell |
| calendar | 3/3 | Complete shell |
| collaboration | 3/3 | Complete shell |
| command-board | 3/3 | Full compliance |
| communications | 3/3 | Complete shell |
| crm | 3/3 | Complete shell |
| events | 3/3 | Complete shell |
| inventory | 3/3 | Complete shell |
| kitchen | 2/3 | Still needs full shell adoption |
| logistics | 3/3 | Complete shell |
| marketing | 3/3 | Complete shell |
| procurement | 3/3 | Complete shell |
| scheduling | 3/3 | Complete shell |
| settings | 3/3 | Complete shell |

**Priority fix:**
1. Kitchen (2/3) — 148 routes, largest domain, needs OperationalColumn integration

### P2.X — 22 Unlisted Domains (96 routes — v88 NEW)

v87 only tracked 15 domains. 22 additional domains account for **96 routes** not individually tracked. These need individual assessment for manifest coverage, spec gaps, and RLS status.

### P2.Y — Payroll (24 routes — v88 CORRECTION)

**v88 CORRECTION:** Payroll has **24 routes** (NOT 25 — v87 overcounted by 1). Runtime bugs documented at P1.A.

---

## P3 — Lower Priority

### P3.A — Dead Package Cleanup

**v88 CORRECTION:** packages/ai and packages/brand are DEAD (v87 wrongly said ALIVE). packages/feature-flags EXISTS (v87 wrongly said "does not exist"). packages/sales-reporting has 1 import (v87 said 7).

**Confirmed dead (zero consumers):**

| Package | LOC | Notes |
|---------|-----|-------|
| packages/storage | — | Zero imports |
| packages/ai | — | Zero imports (v87 said 12 — WRONG) |
| packages/brand | — | Zero imports (v87 said 8 files — WRONG) |
| packages/kitchen-state-transitions | 282 | Covered by @repo/database enums |
| packages/apps/app | 0 | Dead shell (phantom package.json, no source) |
| packages/mcp-server | — | Zero imports from app/api (standalone) |

**v88 Newly Tracked Packages:**

| Package | Imports | Notes |
|---------|---------|-------|
| auth | 714 | 2nd heaviest package — OMITTED from v87 |
| notifications | 26 | Not in v87 |
| sentry-integration | 14 | Not in v87 |
| internationalization | 16 | Not in v87 |
| feature-flags | 11 | v87 said "does not exist" — WRONG |
| manifest-ir | — | Not tracked in v87 |
| seo, pdf, rate-limit, payments, payroll-engine, supplier-connectors, collaboration, webhooks, next-config, email | — | All exist, not individually tracked |

### P3.B — Spec Authoring

**v88 CORRECTION:** Many critical domains lack specs.

| Domain | API Routes | Priority | Notes |
|--------|-----------|----------|-------|
| kitchen/ | 148 | CRITICAL | Largest domain, no spec |
| events/ | 87 | CRITICAL | 2nd largest, no spec |
| payroll/ | 24 | CRITICAL | Runtime bugs, no spec |
| inventory/ | 58 | HIGH | No spec |
| crm/ | 41 | HIGH | Pipeline broken |
| logistics/ | 5 | HIGH | GPS simulated, no spec |
| analytics/ | 5 | HIGH | Revenue computed 4 ways |
| procurement/ | 24 | MEDIUM | No spec |
| accounting/ | 17 | MEDIUM | Expenses hardcoded to zero |
| scheduling/ | — | LOW | Full implementation, no spec |

4 `_TODO` spec directories are implemented but not graduated (SMS, Nowsta, Training, Webhooks). `specs/README.md` references `.automaker/features/` which does not exist.

### P3.C — Cron HTTP Method Inconsistency

8 cron jobs scheduled in vercel.json:

| Route | Schedule | HTTP Method Issue |
|-------|----------|-------------------|
| cron/webhook-retry | `*/5 * * * *` | GET for mutation |
| cron/inventory-audit | `0 6 * * *` | GET for mutation |
| sentry-fixer/process | `0 0 * * *` | — |
| cron/contract-expiration-alerts | `0 7 * * *` | — |
| cron/email-reminders | `*/15 * * * *` | — |
| cron/idempotency-cleanup | `0 3 * * *` | GET for mutation |
| cron/integration-auto-sync | varies | GET for mutation |
| cron/outbox/publish | varies | — |

4 cron endpoints use GET for mutating operations (should be POST).

### P3.D — Route Architecture

- **632 total API route files** (verified across v87 and v88)
- 86 active manifests, 6 disabled
- **40 manifest runtime commands** across all domains (NOT 37 — v87 undercounted)
- `routes.manifest.json`: 849 routes (589 POST + 260 GET, 0 PUT/PATCH/DELETE)
- **POST route gap: 0** (was 242, fully closed — P0.3 RESOLVED)
- Only 1 write handler uncovered: DELETE /api/inventory/audit/reports/[id]
- Manifest wiring: User BROKEN_RAW_SQL, ShipmentItem BROKEN_PRISMA_READ
- AllergenWarning wiring: RESOLVED (now in ENTITIES_WITH_SPECIFIC_STORES with full PrismaStore)
- `routes.manifest.json` only tracks POST/GET — PUT/PATCH/DELETE not in IR

### P3.E — AGENTS.md Corrections Needed

1. **Console count** — says ~932 across ~336 files; actual is **1,078** (v87 said 891 — also wrong)
2. **RLS** — implied all tables; actual is **82/214=38.3%** (v87 said 97/221=43.8% — also wrong)
3. **Cron registry** — says 6; actual is 8
4. **Calendar routes** — not explicitly listed; should note 8 routes
5. **Staff vs Staffing** — needs clarification (staff=35 routes, staffing=2 routes)
6. **Sales-reporting** — says dead; actual has 1 import (not 7 as v87 claimed)
7. **Feature-flags** — does not exist? WRONG — exists with 11 imports
8. **Inventory** — says 24 routes; actual is **58**
9. **Events** — not listed as separate tracked domain; actual is **87 routes**
10. **Packages ai/brand** — AGENTS.md does not list them; both are DEAD (zero imports)
11. **Package auth** — OMITTED; 2nd heaviest package at 714 imports

### P3.F — Manifest Wiring Gaps (v88 CORRECTED)

- ~~`AllergenWarning`: Missing from `ENTITIES_WITH_SPECIFIC_STORES`~~ — **RESOLVED** (now in ENTITIES_WITH_SPECIFIC_STORES line 194, with full AllergenWarningPrismaStore class)
- `User`: Store exists but broken (BROKEN_RAW_SQL)
- `ShipmentItem`: Registered but store broken (BROKEN_PRISMA_READ)

### P3.G — Test Suite Status (v88 CORRECTED)

- **241** test files total (NOT 243 — 2 app tests removed): 139 API + 41 app + 61 E2E
- **47** skips total (NOT 42): 6 API (NOT 5) + **41 E2E** (NOT 37) + 0 manifest-runtime + 0 app
- 0 test.todo, 0 .only: VERIFIED

---

## Code Quality Metrics

| Metric | v87 Count | v88 Count | Change | Notes |
|--------|-----------|-----------|--------|-------|
| `console.*` statements | 891 | **1,078** | +187 | v87 undercounted |
| console.error | 367 | **555** | +188 | v87 undercounted |
| console.log | 1 | **420** | +419 | v87 SWAPPED debug/log |
| console.debug | 420 | **1** | -419 | v87 SWAPPED debug/log |
| console.warn | 70 | **33** | -37 | v87 SWAPPED warn/info |
| console.info | 33 | **70** | +37 | v87 SWAPPED warn/info |
| `:any` types (non-gen) | 12 | **18** | +6 | v87 undercounted |
| `@ts-ignore` | 0 | **0** | — | CLEAN |
| `@ts-expect-error` | 7 | **7** | — | STABLE |
| Bare `<Card>` without tone | 279 | **279** | — | STABLE |
| Pastel backgrounds | 138 | **117** | -21 | v87 overcounted |
| Hardcoded `/api/` paths | 331 | **620** | +289 | v87 undercounted badly |
| shadow-* violations | 37 | **37** | — | STABLE |
| TODO (production) | 7 | **7** | — | VERIFIED |
| FIXME | 0 | **0** | — | CLEAN |
| HACK | 0 | **0** | — | CLEAN |
| BlogFilterChip imports | 39 | **39** | — | STABLE |
| ResearchTable imports | 23 | **23** | — | STABLE |
| StatusPill imports | 67 | **67** | — | STABLE |
| ContactFormCard imports | 0 | **0** | — | UNUSED |

---

## Package Utilization (v88 CORRECTED)

| Package | Imports | Status | v87 Claim |
|---------|---------|--------|-----------|
| design-system | 2,341+ | ALIVE | — |
| auth | **714** | ALIVE | **OMITTED entirely** |
| database | 791 | ALIVE | — |
| observability | 390 | ALIVE | — |
| @angriff36/manifest | 178 | ALIVE | v87 searched wrong name |
| manifest-adapters | 72 | ALIVE | — |
| notifications | 26 | ALIVE | Not in v87 |
| realtime | 19 | ALIVE | — |
| internationalization | 16 | ALIVE | Not in v87 |
| analytics | 14 | ALIVE | — |
| sentry-integration | 14 | ALIVE | Not in v87 |
| feature-flags | **11** | **ALIVE** | **v87: "does not exist"** |
| security | 9 | ALIVE | — |
| cms | 8 | ALIVE | — |
| event-parser | 3 | ALIVE | — |
| types | 6 | ALIVE | — |
| sales-reporting | **1** | ALIVE | v87 said 7 |
| **ai** | **0** | **DEAD** | **v87 said ALIVE (12 imports)** |
| **brand** | **0** | **DEAD** | **v87 said ALIVE (8 files)** |
| storage | 0 | DEAD | — |
| kitchen-state-transitions | 0 | DEAD | — |
| apps/app | 0 | DEAD SHELL | — |

---

## RLS Coverage (82/214 = 38.3% — CRITICAL)

**v88 CORRECTION:** v87 reported 97/221 = 43.8%. Actual: **82/214 = 38.3%** — still less than half. v87 had duplicate RLS statements counted and wrong table totals.

| Schema | v87 RLS/Total | v88 Actual | Change |
|--------|--------------|-----------|--------|
| tenant_facilities | 5/5=100% | **2/6=33.3%** | v87 WRONG |
| tenant_logistics | 4/4=100% | **4/4=100%** | VERIFIED |
| tenant_accounting | 20/16=125% | **10/11=90.9%** | CORRECTED |
| tenant_crm | 6/9=66.6% | **6/9=66.7%** | VERIFIED |
| tenant_inventory | 18/32=56.2% | **16/31=51.6%** | CORRECTED |
| tenant_staff | 17/42=40.4% | **16/39=41.0%** | CORRECTED |
| tenant_kitchen | 11/37=29.7% | **11/36=30.6%** | CORRECTED |
| tenant_events | 7/27=25.9% | **6/22=27.3%** | CORRECTED |
| tenant_admin | 8/49=16.3% | **8/36=22.2%** | CORRECTED (not as bad) |
| tenant (core) | 1/8=12.5% | **1/8=12.5%** | VERIFIED |
| **Total** | **97/221=43.8%** | **82/214=38.3%** | CORRECTED |

**Gap concentrated in tenant_admin (28 unprotected tables), tenant_core (7 unprotected), tenant_events (16 unprotected), and tenant_kitchen (25 unprotected).**

---

## Security Summary

- **5 `queryRawUnsafe` calls in 1 file** — all parameterized, no injection risk (cosmetic cleanup only)
- Calendar OAuth tokens stored in PLAINTEXT (ProviderSync model) — FR-604
- Contracts public signing uses direct DB writes — FR-504
- Auth coverage strong: 604 call sites
- Rate limiting: two-tier, 41 route call sites
- **RLS covers only 82/214 tables (38.3%)** — tenant_admin has 28 unprotected tables
- **POST route gap: 0** (RESOLVED — was 242)
- Only 1 uncovered write handler: DELETE /api/inventory/audit/reports/[id]

---

## Dead Packages Summary

| Package | LOC | Reason |
|---------|-----|--------|
| packages/ai/ | — | Zero imports (v87 wrongly said ALIVE) |
| packages/brand/ | — | Zero imports (v87 wrongly said ALIVE) |
| packages/storage/ | — | Zero imports |
| packages/kitchen-state-transitions/ | 282 | Covered by @repo/database enums |
| packages/apps/app/ | 0 | Dead shell — phantom package.json, no source |

---

## Resolved / Do Not Reopen

These items have been verified as resolved by multiple audit passes. Do not re-investigate without new evidence.

### P0 Bugs (All 22 Resolved v65-v72)
- All critical bugs across payroll, scheduling, security, marketing, procurement, events, knowledge base, event intake, settings, logistics, CRM
- See `docs/implementation-history/` for pass details

### P0.3 Manifest POST Route Gap (RESOLVED v88)
- 242 unregistered POST routes reduced to ZERO
- 209 filesystem POST routes: 66 matched by manifest IR, 143 matched by allowlist
- Only 1 write handler uncovered across all methods (DELETE /api/inventory/audit/reports/[id])
- manifest-ci.yml IS a hard gate — enforcement framework fully operational

### AllergenWarning Manifest Wiring (RESOLVED v88)
- Now present in ENTITIES_WITH_SPECIFIC_STORES (line 194 of manifest-runtime-factory.ts)
- Has full AllergenWarningPrismaStore class

### @repo/observability Zero-Import Claim (RESOLVED v85)
- v84 P0.5 claimed zero imports — WRONG. v88 found 390 file imports.
- The console replacement path IS wired.

### RLS Coverage (Partially Resolved 2026-05-14)
- v83 claimed "all tables have RLS enabled" — INCORRECT
- v84/v85 claimed 97/113 = 85.8% — INCORRECT (undercounted total tables)
- v86 claimed 86/221 = 38.9% — INCORRECT (undercounted RLS-enabled tables)
- v87 claimed 97/221 = 43.8% — INCORRECT (had duplicate RLS counts, wrong table totals)
- v88 actual: **82/214 = 38.3%**
- `20260514000000_add_rls_tenant_accounting` added RLS to all tenant_accounting tables

### Scheduling API (RESOLVED — DO NOT REOPEN)
- Scheduling is fully implemented under `apps/api/app/api/staff/` with 35 routes

### Test Suite (RESOLVED v77-v80)
- 241 test files (139 API + 41 app + 61 E2E), 47 skips, 0 failing
- v88 verified: 6 API skips + 41 E2E skips, 0 test.todo, 0 .only

### Payroll Period ID (RESOLVED 2026-05-14)
- Period ID generation now produces proper UUID strings

### Search FR-107 + Entity Coverage + Multi-word (RESOLVED 2026-05-14)
- Single-char queries now return 400 as required
- Entity coverage at 15 (meets spec requirement of 15+)
- Multi-word AND-chaining IS implemented

### Calendar Features (RESOLVED — DO NOT REOPEN)
- Drag-and-drop implemented with dnd-kit
- List view with ResearchTable implemented
- BlogFilterChip filters implemented
- Sync page implemented

### Bare Table Violations (RESOLVED v84)
- Down from 125+ (v82) to 23 (v83) to 0 (v84/v85)

### v87 False Claims (RESOLVED as FALSE — DO NOT REOPEN)
- Console 891 — FALSE (actual: 1,078; v87 also had debug/log and warn/info SWAPPED)
- Hardcoded /api/ 331 — FALSE (actual: 620; v87 undercounted by 289)
- RLS 97/221=43.8% — FALSE (actual: 82/214=38.3%; v87 had duplicate counts)
- Inventory 24 routes — FALSE (actual: 58)
- Events "8 routes" — FALSE (actual: 87 — MISSING from v87 entirely)
- Procurement 58 routes — FALSE (actual: 24; v87 included inventory)
- Documents 7 routes — FALSE (actual: 1)
- tenant_facilities 100% — FALSE (actual: 33.3%)
- packages/ai ALIVE 12 imports — FALSE (DEAD, zero imports)
- packages/brand ALIVE 8 files — FALSE (DEAD, zero imports)
- packages/feature-flags "does not exist" — FALSE (exists with 11 imports)
- packages/sales-reporting 7 imports — FALSE (actual: 1)
- packages/auth OMITTED — FALSE (714 imports, 2nd heaviest)
- :any types 12 — FALSE (actual: 18)
- Pastel backgrounds 138 — FALSE (actual: 117)
- Test files 243 — FALSE (actual: 241)
- Test skips 42 — FALSE (actual: 47)
- API skips 5 — FALSE (actual: 6)
- E2E skips 37 — FALSE (actual: 41)
- Manifest runtime 37 commands — FALSE (actual: 40)
- Integrations 23 routes — FALSE (actual: 25)
- Payroll 25 routes — FALSE (actual: 24)

### v86 False Claims (RESOLVED as FALSE — DO NOT REOPEN)
- queryRawUnsafe "60 across 9 files" — FALSE (actual: 5 in 1 file, all parameterized)
- Bare Card "~2,750" — FALSE (actual: 279)
- TODO "517" — FALSE (actual: 7 in production source)
- FIXME "22" — FALSE (actual: 0)
- HACK "4" — FALSE (actual: 0)
- Timecards dual implementation — FALSE (no dual implementation)
- Total routes 632 — VERIFIED correct (v87 agent overcount was rejected)
- Command-board shell 2/3 — FALSE (actual: 3/3)
- Kitchen shell 1/3 — FALSE (actual: 2/3)
- CRM routes 47 — FALSE (actual: 41)
- Manifest CI "no enforcement" — FALSE (manifest-ci.yml IS a hard gate)
- Kitchen manifest commands 39 — FALSE (actual: 21)

### Packages Confirmed ALIVE (v88 — DO NOT REOPEN as dead)
- `packages/observability/` — 390 file imports
- `packages/types/` — 6 consumers
- `packages/analytics/` — 14 imports
- `packages/event-parser/` — 3 imports
- `packages/cms/` — 8 imports
- `packages/sales-reporting/` — 1 import (v88 corrected from v87's "7")
- `packages/feature-flags/` — 11 imports (v87 wrongly said "does not exist")

### Packages Confirmed DEAD (v88 — DO NOT REOPEN as alive)
- `packages/ai/` — ZERO imports (v87 wrongly said ALIVE with 12 imports)
- `packages/brand/` — ZERO imports (v87 wrongly said ALIVE with 8 files)

---

## Route Inventory (v88 Complete)

| Domain | Routes | Manifest Commands | Spec | Notes |
|--------|--------|-------------------|------|-------|
| Kitchen | 148 | 21 | NONE | 11 singular/plural duplicate pairs |
| Events | 87 | — | NONE | v88: was missing from v87 |
| Inventory | 58 | 0 | NONE | v88: was 24 in v87 |
| CRM | 41 | — | NONE | Pipeline broken |
| Staff | 35 | — | — | Scheduling domain |
| Logistics | 5 | 0 | NONE | GPS simulated |
| Procurement | 24 | 8+10 | NONE | Requisitions + vendor-contracts complete |
| Payroll | 24 | — | NONE | Runtime bugs |
| Integrations | 25 | — | — | GoodShuffle/Nowsta/QB/Webhooks |
| Command-board | 22 | 10 writes | — | Shell 3/3 |
| Accounting | 17 | 21 refs | NONE | Expenses hardcoded to zero |
| Staffing | 2 | — | — | 5 queryRawUnsafe (safe) |
| Settings | 10 | — | — | Fully implemented |
| Calendar | 8 | 0 | — | OAuth plaintext |
| Marketing | 1 | — | — | Minimal |
| Documents | 1 | — | — | v88: was 7 in v87 |
| +22 other domains | 96 | — | — | Not individually tracked |
| **Total** | **632** | **40** | | |

---

## Verification Commands (v88)

```bash
# P0.1: ignoreBuildErrors
grep -rn 'ignoreBuildErrors' --include='*.ts' apps/*/next.config.ts
# Expected: 3 matches (apps/app, apps/api, apps/web)

# P0.2: CI gaps
grep -n 'continue-on-error' .github/workflows/ci.yml
# Expected: 2 matches (soft gates)
head -5 scripts/db-drift-check.mjs
# Expected: no-op placeholder

# P0.4: TypeScript strictness
grep -n 'Run linting' .github/workflows/ci.yml
# Expected: line 45 (mislabeled — actually runs typecheck)

# Metrics
grep -rn 'console\.' --include='*.ts' --include='*.tsx' apps/ packages/ --exclude-dir=node_modules --exclude-dir=.next | wc -l
# Expected: ~1,078
grep -rn 'queryRawUnsafe' --include='*.ts' apps/api/app/api/ | grep -v 'test\|spec\|//' | wc -l
# Expected: 5
grep -rn 'TODO' --include='*.ts' --include='*.tsx' apps/api/app/api apps/app/app | wc -l
# Expected: ~7
grep -rn 'FIXME' --include='*.ts' --include='*.tsx' apps/api/app/api apps/app/app | wc -l
# Expected: 0

# RLS
grep -r 'ENABLE ROW LEVEL SECURITY' packages/database/prisma/migrations/ --include='*.sql' | sort -u | wc -l
# Expected: 82

# Design system
grep -rn '<Card>' apps/app/app --include='*.tsx' --exclude-dir=node_modules | wc -l
# Expected: ~279
grep -rn 'bg-blue-50\|bg-green-50\|bg-red-50\|bg-yellow-50' apps/app/app --include='*.tsx' | wc -l
# Expected: ~117

# Hardcoded API paths
grep -rn '"/api/' --include='*.ts' --include='*.tsx' apps/ packages/ --exclude-dir=node_modules | wc -l
# Expected: ~351 double-quoted
grep -rn '`/api/' --include='*.ts' --include='*.tsx' apps/ packages/ --exclude-dir=node_modules | wc -l
# Expected: ~269 template

# Build
pnpm --filter api typecheck
pnpm --filter app typecheck
```

---

## Archive Map

Completed pass write-ups and historical notes:
- `docs/implementation-history/` — pass logs, executive summaries
- `docs/implementation-history/v77-v80-test-suite-repair.md` — test suite repair (v77-v80)
- `docs/audits/` — numbered audit passes
- `docs/audits/v61-spec-comparison.md` — detailed spec gap analysis
- `docs/audits/ralph05-cleanup/` — cleanup audit notes

---

## Methodology

- **v88**: Parallel re-audit correcting significant v87 errors. Key corrections: console 1,078 with debug/log and warn/info SWAPPED in v87 (debug=1 not 420, log=420 not 1, error=555 not 367, warn=33 not 70, info=70 not 33). Hardcoded /api/ paths 620 (NOT 331 — v87 undercounted by 289). RLS 82/214=38.3% (NOT 97/221=43.8% — v87 had duplicate RLS counts and wrong table totals). Inventory 58 routes (NOT 24). Events 87 routes (MISSING from v87). Procurement 24 routes (NOT 58 — v87 included inventory). Documents 1 route (NOT 7). tenant_facilities 33.3% (NOT 100%). packages/ai DEAD (v87 said ALIVE). packages/brand DEAD (v87 said ALIVE). packages/auth 714 imports (OMITTED from v87). packages/feature-flags EXISTS with 11 imports (v87 said "does not exist"). packages/sales-reporting 1 import (NOT 7). P0.3 manifest POST gap RESOLVED (was 242, now 0). AllergenWarning wiring RESOLVED. :any types 18 (NOT 12). Pastel backgrounds 117 (NOT 138). Kitchen has 11 singular/plural route directory pairs. 22 unlisted domains = 96 routes. 241 test files (NOT 243). 47 skips (NOT 42). E2E skips 41 (NOT 37). API skips 6 (NOT 5). Manifest runtime 40 commands (NOT 37). routes.manifest.json 849 routes. Integrations 25 routes (NOT 23). Payroll 24 routes (NOT 25).
- **v87**: Parallel re-audit correcting significant v86 errors. **MANY v87 FINDINGS PROVEN FALSE IN v88** — see Resolved section.
- **v86**: Parallel re-audit correcting v85 errors. **MANY v86 FINDINGS PROVEN FALSE IN v87** — see Resolved section.
- **v85**: Re-audit correcting v84 errors. Observability 407 imports, ai/brand ALIVE (WRONG per v88), pastel 294, /api/ 351.
- **v84**: 33-agent parallel audit. CI gaps, RLS, event CRUD gaps, logistics correction, facilities, CRM pipeline broken, payroll runtime bugs, security, console, design system, TypeScript, domain spec compliance.
- **v83**: 20-agent parallel audit. ignoreBuildErrors, CI gaps, RLS, event CRUD, console, design system, TypeScript, dead packages, route architecture.
- **v82**: 17-agent parallel audit. ignoreBuildErrors, CI gaps, manifest enforcement, RLS, test suite, console, TODO/FIXME, TypeScript, specs vs implementation.
- **v81**: P2.D payroll period ID and P2.G search FR-107 fixes. RLS for tenant_accounting.
- **v77-v80**: Test suite repair. Progress: 678 -> 527 -> 473 -> 0 failing tests.
- **v65-v72**: All 22 P0 items resolved.
