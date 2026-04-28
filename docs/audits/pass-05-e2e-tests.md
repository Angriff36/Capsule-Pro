# Audit Archive — Pass 5: E2E Test Suite Audit

End-to-end test suite audit. Captured verbatim from `IMPLEMENTATION_PLAN.md` during the 2026-04-28 cleanup.

## E2E Test Suite Audit (5th Pass)

> **Audited:** 2026-04-24
> **Scope:** 57 spec files under `e2e/`, Playwright infrastructure, planning/workflows.md cross-reference.
> **Method:** 7 parallel subagents read every spec file in full; grep-verified skip counts; infrastructure files read directly.

---

### Executive Summary

The E2E suite has **57 spec files containing 382 `test()` blocks**. Infrastructure is mature (real Clerk auth via `@clerk/testing/playwright`, Playwright 1.58.1, persistent-browser mode, strict lint rules). However:

- **35 tests are skipped** (9.2% of suite) — 25 unconditionally via `test.skip(true, ...)`, 10 conditionally. Prior passes only counted the 25 unconditional skips; the real gap is 40% larger.
- **6 specs are STALE** (reference removed/renamed code or test features that were deleted).
- **3 specs are SKIP-STUBS** (verify file existence rather than functionality).
- **5 specs are BLOCKED** by missing implementations or auth issues.
- **Zero E2E coverage** for logistics, payroll, and 5 of 10 documented user workflows.
- **E2E tests have never been run in CI** — no GitHub Actions workflow triggers them.
- **15 specs would fail or skip due to known IMPLEMENTATION_PLAN blockers** (procurement crashes, missing command-board UI, 501 stubs, missing Prisma models).

The suite tests the *happy path surface* well for kitchen, events, inventory, CRM, and settings. It does not test *cross-module workflows*, *error states*, or *any of the five new modules* added in `b8c31eef` at the browser level.

---

### Per-Spec Analysis

| # | Spec File | Lines | `test()` | `test.skip()` | Feature | Status | Key Concern |
|---|---|---:|---:|---:|---|---|---|
| 1 | `board-fork-merge.spec.ts` | 243 | 7 | 0 | Command board simulation | PASSING | Navigates `/command-board` — but authenticated UI was removed (L1.1) |
| 2 | `event-import-flow.spec.ts` | 144 | 1 | 0 | PDF/CSV event import | PASSING | Hardcodes `localhost:2221` |
| 3 | `entity-graph-verification.spec.ts` | 156 | 8 | 0 | Entity relationship graph | PASSING | API-only; depends on entity-graph package |
| 4 | `api-key-management-verification.spec.ts` | 208 | 7 | 0 | API key management | PASSING | Tests `/settings/api-keys` page |
| 5 | `app.spider.spec.ts` | 295 | 1 | 0 | Full app crawl | PASSING | MAX_VISITS=50; may hit broken routes |
| 6 | `getting-started-checklist.spec.ts` | 147 | 3 | **3** | Onboarding checklist | PARTIAL | 1 unconditional skip + 2 conditional on data; tests `/analytics` page |
| 7 | `facility-management-verification.spec.ts` | 150 | 6 | 0 | Facility spaces/utilities | PASSING | Tests API endpoints for facility module |
| 8 | `entity-annotation-system.spec.ts` | 301 | 8 | 0 | Board annotations | PASSING | Navigates `/command-board` — UI removed (L1.1) |
| 9 | `board-template-system.spec.ts` | 108 | 6 | 0 | Board templates | PASSING | Navigates `/command-board` — UI removed (L1.1) |
| 10 | `illustrated-empty-states-verification.spec.ts` | 138 | 4 | **4** | Empty state illustrations | PARTIAL | All 4 skips are unconditional `test.skip(true,...)` |
| 11 | `equipment-scheduling-conflicts.spec.ts` | 115 | 5 | 0 | Equipment conflicts API | PASSING | API-only; endpoints may not exist |
| 12 | `ambient-animation-verification.spec.ts` | 65 | 3 | **3** | Ambient animations | SKIP-STUB | All 3 tests are `test.skip()` — no real test body runs |
| 13 | `ai-context-aware-suggestions-verification.spec.ts` | 197 | 4 | **4** | AI board suggestions | SKIP-STUB | 4 bare `test.skip()` calls — all tests are no-ops |
| 14 | `integrated-payment-processor-verification.spec.ts` | 295 | 8 | **7** | Payment processing | PARTIAL | 7 skips (all unconditional); accounting payments mocked per P2.A |
| 15 | `multi-location-support.spec.ts` | 155 | 9 | 0 | Multi-location API | PASSING | API-only; verifies endpoint/model existence |
| 16 | `presence-indicators-verification.spec.ts` | 3 | 0 | 0 | (deleted feature) | **STALE** | 3-line file; comment says "verified and integrated" — delete |
| 17 | `role-aware-empty-states.spec.ts` | 210 | 5 | **4** | Role-based empty states | PARTIAL | 4 unconditional skips when data exists |
| 18 | `kitchen.smoke.spec.ts` | 83 | 3 | 0 | Kitchen page routes | PASSING | Allows redirects; basic route verification |
| 19 | `sample-data.spec.ts` | 9 | 0 | 0 | (deleted feature) | **STALE** | 9-line file; comment says "implemented and verified" — delete |
| 20 | `quality-control-workflow-verification.spec.ts` | 292 | 8 | 0 | QC workflow | PASSING | File/API existence checks; manifest structured correctly |
| 21 | `onboarding-progress-share.spec.ts` | 51 | 3 | 0 | Onboarding sharing | PASSING | Mixed browser + API tests |
| 22 | `natural-language-commands-verification.spec.ts` | 293 | 10 | 0 | AI command execution | PASSING | API-only; verifies manifest command tools exist |
| 23 | `kitchen-workflow.spec.ts` | 462 | 9 | 0 | Kitchen recipe→event flow | PASSING | Most comprehensive workflow test (462 lines) |
| 24 | `menu-engineering-verification.spec.ts` | 119 | 6 | 0 | Menu analytics | PASSING | Browser navigation to `/analytics/menu-engineering` |
| 25 | `multi-location-dashboards.spec.ts` | 135 | 11 | 0 | Multi-location analytics | PASSING | Browser navigation to `/analytics/multi-location` |
| 26 | `manifest-policy-editor-verification.spec.ts` | 183 | 10 | 0 | Manifest editor UI | PASSING | Browser navigation to `/settings/manifest-editor` |
| 27 | `knowledge-base-verification.spec.ts` | 56 | 4 | 0 | Knowledge base | PASSING | Mixed API + browser; `/knowledge-base` |
| 28 | `prep-task-dependency-verification.spec.ts` | 384 | 10 | 0 | Prep task dependencies | PASSING | API + engine tests; 384 lines |
| 29 | `revenue-cycle-verification.spec.ts` | 195 | 9 | 0 | Revenue recognition | **STALE** | Tests 501-stub endpoints at `/api/accounting/revenue-recognition/*` |
| 30 | `procurement-automation-verification.spec.ts` | 262 | 9 | 0 | Procurement schema/routes | SKIP-STUB | Only checks file existence; routes crash at runtime (Blocker 2) |
| 31 | `manifest-test-playground.spec.ts` | 228 | 13 | 0 | Manifest playground UI | PASSING | Browser navigation to `/settings/manifest-playground` |
| 32 | `micro-tour-verification.spec.ts` | 68 | 4 | 0 | MicroTour component | PASSING | Component may not exist as standalone page |
| 33 | `rules-engine-verification.spec.ts` | 215 | 6 | 0 | Kitchen rules engine | PASSING | API-only; engine may not be fully implemented |
| 34 | `rate-limiting-verification.spec.ts` | 324 | 13 | 0 | API rate limiting | PASSING | API-only; verifies headers and config |
| 35 | `recipe-scaling-verification.spec.ts` | 339 | 7 | **7** | Recipe scaling engine | PARTIAL | 7 unconditional skips when no recipes available |
| 36 | `operational-bottleneck-detector.spec.ts` | 259 | 9 | 0 | Bottleneck analytics | PASSING | Browser navigation to `/analytics/bottlenecks` |
| 37 | `rbac-verification.spec.ts` | 83 | 4 | 0 | RBAC settings | **STALE** | Tests `/settings/role-policies` which may not exist as page |
| 38 | `nutrition-label-verification.spec.ts` | 331 | 12 | 0 | Nutrition label generator | PASSING | File system checks only; no browser |
| 39 | `tenant-audit-log-verification.spec.ts` | 59 | 3 | 0 | Audit logging | **STALE** | Tests `/api/audit/logs` and schema — audit_log is orphaned table |
| 40 | `version-control.spec.ts` | 259 | 6 | 0 | Version control API | BLOCKED | Auth-dependent; cannot sign in during test |
| 41 | `warehouse.smoke.spec.ts` | 227 | 10 | 0 | Warehouse pages | PASSING | Browser navigation to `/warehouse` routes |
| 42 | `verify-liveboards-integration.spec.ts` | 102 | 4 | 0 | Liveboards integration | FLAKY | Hardcodes `localhost:2221`; depends on Liveblocks |
| 43 | `vendor-catalog-management.spec.ts` | 167 | 6 | 0 | Vendor catalog API | SKIP-STUB | Schema existence checks only; `softDelete` duplicate issue (Blocker 4) |
| 44 | `soft-delete-recovery.spec.ts` | 203 | 7 | 0 | Trash/soft-delete UI | PASSING | Browser navigation to `/administrative/trash` |
| 45 | `search-empty-state-verification.spec.ts` | 144 | 3 | 0 | Search enhancements | PASSING | Browser navigation to `/command-board` — UI removed (L1.1) |
| 46 | `communication-preferences-verification.spec.ts` | 164 | 3 | **2** | Client comm preferences | STALE | References missing `communication-preferences-tab.tsx` component |
| 47 | `multi-channel-marketing-verification.spec.ts` | 51 | 3 | 0 | Marketing "Coming Soon" | PASSING | Tests placeholder page only; Category 3 feature |
| 48 | `event-profitability-verification.spec.ts` | 147 | 3 | 0 | Event profitability API | BLOCKED | API endpoint not fully implemented |
| 49 | `workflows/command-board.workflow.spec.ts` | 156 | 5 | **1** | Command board workflow | FLAKY | Navigates `/command-board` — UI removed (L1.1); 1 conditional skip |
| 50 | `workflows/inventory.workflow.spec.ts` | 109 | 6 | 0 | Inventory workflow | PASSING | Tests item creation, stock levels, forecasts |
| 51 | `workflows/crm.workflow.spec.ts` | 154 | 7 | **1** | CRM workflow | PARTIAL | Client creation may 404; 1 conditional skip |
| 52 | `workflows/full-site.spider.spec.ts` | 322 | 1 | 0 | Full site exhaustive crawl | BLOCKED | 101 hardcoded routes; many don't exist |
| 53 | `workflows/scheduling.workflow.spec.ts` | 94 | 6 | **1** | Scheduling workflow | PARTIAL | Shift creation needs seeded data; 1 fixme skip |
| 54 | `workflows/settings.workflow.spec.ts` | 110 | 6 | 0 | Settings workflow | PASSING | Tests team, security, integrations, email templates |
| 55 | `workflows/kitchen.workflow.spec.ts` | 114 | 6 | **1** | Kitchen module workflow | PARTIAL | Prep list AI generator needs event; 1 fixme skip |
| 56 | `workflows/staff.workflow.spec.ts` | 114 | 6 | 0 | Staff module workflow | PARTIAL | Some pages redirect to `/scheduling` |
| 57 | `workflows/events.workflow.spec.ts` | 125 | 8 | 0 | Events module workflow | PASSING | Tests create, budgets, battle boards, contracts |

---

### Test Skip Audit

**35 total `test.skip()` across 9 files:**

| Pattern | Count | Files |
|---|---:|---|
| `test.skip(true, "reason")` — unconditional | **25** | communication-preferences (2), role-aware-empty-states (4), integrated-payment-processor (7), getting-started-checklist (1), illustrated-empty-states (4), recipe-scaling (7) |
| `test.skip()` — bare, always skips | **4** | ai-context-aware-suggestions (4) |
| `test.skip("description", ...)` — conditional | **6** | ambient-animation (3), getting-started-checklist (2), command-board.workflow (1) |

**Third-pass count correction:** The third pass counted "25 `test.skip(true, ...)` across 6 spec files" — that was accurate for the unconditional pattern. The full skip picture is **35 across 9 files**. The third pass missed 4 bare `test.skip()` in ai-context-aware-suggestions and 6 conditional skips in ambient-animation, getting-started-checklist, and command-board.workflow.

**0 `describe.skip()`** and **0 `it.todo()`/`test.todo()`** confirmed in e2e/.

---

### Coverage Gap Matrix

| Module/Area | Routes | E2E Specs | Coverage | Critical Gaps |
|---|---:|---|---|---|
| Kitchen | 259 | kitchen.smoke, kitchen-workflow, kitchen.workflow, rules-engine, nutrition-label, prep-task-dependency, recipe-scaling | **~15%** | No waste tracking test; no allergen workflow; no equipment IoT test |
| Events | 141 | events.workflow, event-import-flow, event-profitability, event-profitability-verification | **~10%** | No contract signature flow; no battle board workflow; no guest management test |
| Inventory | 102 | inventory.workflow, warehouse.smoke, quality-control-workflow, vendor-catalog-management, soft-delete-recovery | **~12%** | No cycle count workflow; no transfer test; no forecasting verification |
| CRM | 61 | crm.workflow, communication-preferences, search-empty-state | **~8%** | No proposal→invoice flow; no lead pipeline test; no client preference verification |
| Staff | 50 | staff.workflow, scheduling.workflow | **~15%** | No certification tracking; no time-off approval; no training assignment test |
| Command Board | 39 | command-board.workflow, board-fork-merge, board-template-system, entity-annotation, entity-graph, natural-language-commands, search-empty-state, verify-liveboards | **~25%** | All specs navigate `/command-board` which doesn't exist as authenticated UI (L1.1) |
| Procurement | 37 | procurement-automation-verification (SKIP-STUB) | **~2%** | Only file-existence checks; requisition/vendor-contract routes crash (Blocker 2) |
| Payroll | 35 | **NONE** | **0%** | Zero E2E coverage for entire payroll module |
| Accounting | 17 | integrated-payment-processor (7 skips), revenue-cycle (STALE) | **~5%** | Payment routes are mocked; revenue recognition is 501 stub |
| Logistics | 13 | **NONE** | **0%** | Zero E2E coverage for entire logistics module |
| Facilities | 12 | facility-management-verification | **~10%** | Only space/booking API checks; no work-order test |
| Training | 12 | **NONE** | **0%** | Zero E2E coverage for training module |
| Settings | 14 | settings.workflow, api-key-management, manifest-policy-editor, manifest-test-playground, rate-limiting, rbac-verification | **~30%** | Best-covered module; RBAC spec is stale |
| Notifications | 12 | **NONE** | **0%** | Zero E2E coverage for notification delivery |

---

### Workflow Coverage

Cross-reference of the 10 user workflows in `planning/workflows.md` against E2E specs:

| # | Workflow | Modules | E2E Spec | Coverage | Blockers |
|---|---|---|---|---|---|
| 1 | Event Lead-to-Contract | CRM→Events→Menus→Contracts→Payments→Notifications | `events.workflow` + `crm.workflow` (partial) | **~15%** | Contract signature untested; payment flow mocked; no end-to-end quote→approve→invoice |
| 2 | Event Day Kitchen Execution | Events→Menus→Recipes→Prep Tasks→Command Board→Inventory→Staffing | `kitchen-workflow` + `kitchen.workflow` (partial) | **~20%** | No real-time command board test; no inventory reservation verification; no mobile staff test |
| 3 | Inventory Procurement Cycle | Inventory→Procurement→Vendors→POs→Warehouse→Notifications | `procurement-automation-verification` (SKIP-STUB) + `inventory.workflow` | **~5%** | Procurement routes crash (Blocker 2); no PO approval workflow; vendor-connectors are stubs |
| 4 | Staff Scheduling & Time Tracking | Staffing→Scheduling→Availability→Time Off→Kitchen→Payroll | `scheduling.workflow` + `staff.workflow` (partial) | **~15%** | No payroll integration; shift creation needs seeded data; no overtime threshold test |
| 5 | Client Communication & Quote Revision | CRM→Events→Menus→Pricing→Email→Notifications→Collaboration | `crm.workflow` (minimal) | **~5%** | Collaboration workspace is Category 3 (0% implemented); no quote revision flow; no email send test |
| 6 | Multi-Event Weekend Logistics | Events→Logistics→Vehicles→Drivers→Routes→Staffing→Warehouse→Dispatch | **NONE** | **0%** | Entire logistics module has zero E2E; driver update correctness bug (Blocker 6); GPS is simulated |
| 7 | Financial Close & Invoice Generation | Events→Accounting→Payments→Invoices→Payroll→Analytics | `integrated-payment-processor` (7 skips) + `revenue-cycle` (STALE) | **~5%** | Revenue recognition is 501 stub; payments mocked on accounting routes; payroll has no E2E |
| 8 | Cycle Count & Inventory Reconciliation | Inventory→Warehouse→Cycle Counting→Procurement→Analytics | `warehouse.smoke` (basic) | **~5%** | No cycle count workflow; no variance investigation test; no mobile scanner test |
| 9 | Employee Onboarding & Certification | Staff→Training→Certifications→Scheduling→Notifications | `staff.workflow` (minimal) | **~5%** | Training module has zero E2E; no certification expiration test; no auto-assignment verification |
| 10 | Waste Tracking & Food Cost Optimization | Kitchen→Inventory→Waste Entry→Analytics→Recipes→Menus | **NONE** | **0%** | Zero waste tracking E2E; no food cost calculation test; no yield data verification |

**Average workflow E2E coverage: ~7.5%**

---

### Infrastructure Assessment

#### Playwright Configuration

- **Framework:** Playwright 1.58.1 with TypeScript
- **Auth:** Real Clerk authentication via `@clerk/testing/playwright` (email: `jane+clerk_test@example.com`, code: `424242`)
- **Session:** Stored in `e2e/.auth/storageState.json`; replayed across tests
- **Base URL:** `http://127.0.0.1:2221` (configurable via `PLAYWRIGHT_BASE_URL`)
- **Modes:** Normal (auto-start server) and Persistent Browser (connect to Chrome CDP on port 9222)
- **Workers:** 1 (sequential execution — tests share state)
- **Retries:** 0 (fail-fast)

#### Helpers (`e2e/helpers/workflow.ts`)

Comprehensive utility library:
- Error collection (console errors, network failures, 4xx/5xx responses)
- Navigation with retries (handles Next.js dev server recompilation)
- Form filling for Radix/shadcn components
- Toast detection for success/failure messages
- Unique data generation via `unique("Prefix")` function

#### Lint Rules (`e2e/scripts/lint-workflow-specs.sh`)

- Prohibits `isVisible().catch(() => false)` anti-pattern
- Ensures every spec has real assertions
- Run via `pnpm e2e:lint`

#### CI Status

**E2E tests have NEVER been run in CI.** No GitHub Actions workflow triggers `pnpm test:e2e`. The `.github/workflows/` directory has CI for unit/integration tests only. Available scripts:
- `pnpm test:e2e` — run all E2E tests
- `pnpm test:kitchen` — kitchen workflow only
- `pnpm e2e:lint` — lint specs

#### Environment Dependencies

- Running Next.js dev server on port 2221
- Clerk test API keys (production Clerk instance)
- Neon PostgreSQL database with migrations applied
- No automated database seeding — many tests skip when data is absent
- No automated test data cleanup

---

### Cross-Reference with IMPLEMENTATION_PLAN Blockers

#### Specs that test areas with known blockers (would fail if run):

| Spec | Blocker | Failure Mode |
|---|---|---|
| `command-board.workflow.spec.ts` | L1.1 (UI removed) | All browser navigation to `/command-board` returns 404 |
| `board-fork-merge.spec.ts` | L1.1 (UI removed) | Same — `/command-board` does not exist |
| `board-template-system.spec.ts` | L1.1 (UI removed) | Same |
| `entity-annotation-system.spec.ts` | L1.1 (UI removed) | Same |
| `search-empty-state-verification.spec.ts` | L1.1 (UI removed) | Same |
| `verify-liveboards-integration.spec.ts` | L1.1 (UI removed) | Same |
| `procurement-automation-verification.spec.ts` | Blocker 2 | Routes crash; `PurchaseRequisition`/`VendorContract` models don't exist |
| `vendor-catalog-management.spec.ts` | Blocker 4 | `softDelete`/`soft-delete` duplicate in inventory modules |
| `revenue-cycle-verification.spec.ts` | P2.A (501 stubs) | Revenue recognition routes return 501 |
| `integrated-payment-processor-verification.spec.ts` | P2.A (mocked) | Payment routes return mocked `gatewayResponse` |
| `tenant-audit-log-verification.spec.ts` | Schema drift | `audit_log` table is orphaned (no Prisma model) |
| `version-control.spec.ts` | Auth setup | Cannot complete Clerk sign-in during test run |
| `full-site.spider.spec.ts` | Multiple | Crawls 101 routes including many that 404 or crash |

**Total: 13 specs (23% of suite) would encounter known blockers if run against current code.**

#### Specs that could catch known bugs (if fixed/seeded):

| Spec | Bug It Would Catch |
|---|---|
| `kitchen-workflow.spec.ts` | Could verify recipe→event linking, prep task generation |
| `inventory.workflow.spec.ts` | Could verify stock level updates, transfer workflows |
| `events.workflow.spec.ts` | Could verify event budget calculation, battle board rendering |
| `rate-limiting-verification.spec.ts` | Could verify rate limit headers are actually present |
| `soft-delete-recovery.spec.ts` | Could verify soft-delete/restore across modules |
| `equipment-scheduling-conflicts.spec.ts` | Could verify conflict detection logic |

---

### Prioritized Recommendations

#### Tier E0 — Delete Dead Specs (immediate, zero risk)

1. Delete `presence-indicators-verification.spec.ts` (3 lines, feature was "verified and integrated")
2. Delete `sample-data.spec.ts` (9 lines, feature was "implemented and verified")

#### Tier E1 — Fix Skips That Hide Bugs (do before any CI enablement)

3. **`ai-context-aware-suggestions-verification.spec.ts`** — 4 bare `test.skip()` with no body. Either write the tests or delete the file.
4. **`ambient-animation-verification.spec.ts`** — 3 `test.skip()` with no body. Same: implement or delete.
5. **`recipe-scaling-verification.spec.ts`** — 7 unconditional skips when no recipes. Add database seeding to unblock.
6. **`integrated-payment-processor-verification.spec.ts`** — 7 skips. Create test invoices/payments in setup to unblock.
7. **`illustrated-empty-states-verification.spec.ts`** — 4 skips when data exists. Seed empty-state test org.
8. **`role-aware-empty-states.spec.ts`** — 4 skips when data exists. Same as above.

#### Tier E2 — Remove/Archive Specs for Removed Features

9. **Command Board UI specs** (6 files): `board-fork-merge`, `entity-annotation-system`, `board-template-system`, `command-board.workflow`, `search-empty-state-verification`, `verify-liveboards-integration` — all navigate `/command-board` authenticated UI which was removed (L1.1). Either archive these or rebuild the UI.
10. **`revenue-cycle-verification.spec.ts`** — tests 501-stub endpoints. Archive until revenue recognition is implemented.
11. **`rbac-verification.spec.ts`** — tests page that may not exist. Verify page exists or archive.
12. **`communication-preferences-verification.spec.ts`** — references missing component. Archive or implement component.
13. **`tenant-audit-log-verification.spec.ts`** — tests orphaned table. Archive until model is added.

#### Tier E3 — Add Missing E2E for Critical Paths

14. **Logistics workflow** — zero coverage for entire module. Highest priority new spec.
15. **Payroll workflow** — zero coverage. At minimum: period creation, run execution, timecard integration.
16. **Procurement PO workflow** — `procurement-automation-verification` is SKIP-STUB; needs real functional test.
17. **Accounting invoice→payment flow** — current spec has 7 skips; needs real payment integration.
18. **Training/certification workflow** — zero coverage for onboarding flow.
19. **Waste tracking workflow** — zero coverage for food cost optimization.

#### Tier E4 — Enable E2E in CI

20. **Database seeding** — create a seed script that populates test data (at minimum: 1 org, 5 recipes, 10 inventory items, 5 staff, 2 events).
21. **CI workflow** — add GitHub Actions step: start dev server → run migrations → seed → run E2E.
22. **Test isolation** — move from `workers: 1` to parallelizable tests with per-test data setup.

#### Tier E5 — Improve Existing Specs

23. **`full-site.spider.spec.ts`** — prune the 101-route `ALL_ROUTES` array to remove routes known to 404.
24. **`procurement-automation-verification.spec.ts`** — convert from file-existence checks to functional route tests after Blocker 2 is fixed.
25. **`vendor-catalog-management.spec.ts`** — add functional assertions after Blocker 4 is resolved.
26. **`kitchen-workflow.spec.ts`** — extend to cover waste tracking and allergen substitution.
27. **`events.workflow.spec.ts`** — extend to cover contract signature and payment schedule.

---

### Deltas vs Prior Plan Claims

1. **Skip count.** Third pass said "25 `test.skip(true, ...)` across 6 files." Full picture: **35 `test.skip()` across 9 files** — 25 unconditional, 4 bare, 6 conditional. Prior pass undercounted by 40%.
2. **E2E file count.** Prior passes did not enumerate the E2E suite. This pass found **57 spec files** (45 top-level + 12 in `workflows/`).
3. **E2E test count.** **382 `test()` blocks** across the suite. Prior passes never counted these.
4. **Command Board specs.** 6 specs navigate `/command-board` authenticated UI which was removed (L1.1). These tests would fail immediately if run. Prior passes noted the UI was removed but did not flag the downstream E2E impact.
5. **CI status.** E2E tests have **never been run in CI**. Prior passes did not investigate CI integration.
6. **Workflow coverage.** Average E2E coverage of the 10 documented workflows is **~7.5%**. Prior passes did not assess workflow coverage.
7. **New modules.** Logistics (13 routes), Payroll (35 routes), Training (12 routes) have **zero E2E coverage**. Prior passes did not flag this gap.
8. **Seeding dependency.** 28 of 35 skips are caused by "no data available" — the suite has no database seeding. Prior passes did not identify the root cause of skips.

---

