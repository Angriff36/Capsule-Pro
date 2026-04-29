# Implementation Plan Archive — Schema Drift, Manifest Coverage, Tech Debt, Execution Order, Notes

Long-form audit of schema drift, manifest coverage, technical debt, recommended tier-based execution order, and working notes from the 2026-04-24 audit. Some items have since been resolved; this is the historical baseline.

## Schema Drift Audit

### Orphaned tables (exist in migrations, no Prisma model)

| Table | Migration | Used by |
|---|---|---|
| `vendor_contacts` | 20260327000000 | Procurement vendors (raw SQL) |
| `vendor_ratings` | 20260327000000 | Procurement vendors (raw SQL) |
| `employee_bank_accounts` | 20260327020000 | Payroll bank-accounts routes — **RESOLVED**: Prisma model `EmployeeBankAccount` exists, all 6 routes use Prisma ORM, RLS enabled. Resolved 2026-04-28. |
| `audit_log` | 20260327030000 + duplicate 20260327100000 | Needs dedup + model |
| `crm_scoring_rules` | 20260327040000 | CRM scoring |
| `procurement_budgets` | 20260327010000 | Procurement budget (raw SQL) |
| `procurement_budget_alerts` | 20260327010000 | Procurement budget |
| ~~`supplier_sync_logs`~~ | 20260328080000 | Supplier sync status — **has a `SupplierSyncLog` Prisma model; NOT orphaned**. Prior pass was wrong. |

Plus **raw-SQL-only tables** with no model: `facility_assets`, `drivers`, `vehicles`.

### Missing models referenced by code
- `PurchaseRequisition`, `VendorContract` (Blocker 2)
- ~~`BankAccount` (Blocker 3)~~ **RESOLVED 2026-04-28**: Prisma model exists as `EmployeeBankAccount`, all 6 routes use Prisma ORM, RLS enabled.
- `RevenueRecognitionSchedule`
- `TaxInfo`, `PayrollPrefs`, `TipPool` (payroll engine TODOs)

### RLS status
**Zero** `ENABLE ROW LEVEL SECURITY` statements in any migration after 2026-03-08. All new-module tables (accounting, facilities, logistics, payroll, procurement) are **cross-tenant readable** at the database level. Application-level org-id filters are the only isolation — a dispatcher bypass (see below: 163 routes) becomes a tenant-data-leakage vulnerability.

---

## Manifest Coverage Audit

| Metric | Value | Source |
|---|---|---|
| Manifest files | 63 | glob `packages/manifest-adapters/manifests/**` (63 verified) |
| Quarantined manifests | 17 | `packages/manifest-adapters/manifests-disabled/` |
| Entities (per IR) | **89** | `routes.manifest.json` `kind=entity-read` count (plan prior: 91 — wrong) |
| Commands (per IR) | **384** | `routes.manifest.json` `kind=command` count (plan prior: 389 — wrong) |
| Events (per IR) | **0 reported** | `routes.manifest.json` `kind=event` — suspect; prior claim of 387 came from the `.manifest` sources, not the IR output |
| Routes in `routes.manifest.json` | 562 (178 GET, 384 POST) | file inspection |
| Total API write handlers | ~1,001 | count of POST/PUT/PATCH/DELETE handlers under `apps/api/app/api/**/route.ts` |
| Write handlers **without** manifest coverage | **~617 (61.6% gap)** | 1,001 − 384; note `routes.manifest.json` only tracks POST, so all PUT/PATCH/DELETE are uncovered |
| Routes bypassing manifest dispatcher | **stale: 163 per `planning/route-audit.md`; current ≈ 490** | 3x underreport — the planning doc is dated 2026-04-13 and predates most of the b8c31eef additions. Do not quote 163 without re-running the scan. |
| Routes lacking authentication | 115 (`planning/route-audit.md`) | same staleness caveat applies — re-verify before citing |

### Missing manifests by domain
- **Accounting**: invoice, payment, collection, revenue-recognition.
- **Facilities**: facility-area, asset, work-order (existing `facility-rules.manifest` lives in `manifests-disabled/`).
- **Logistics**: driver, vehicle, route, shipment — none exist.
- **Procurement**: requisition, vendor, vendor-contract.
- **Payroll**: partial coverage only.

### Quarantined manifests in `packages/manifest-adapters/manifests-disabled/` (17 files)

These manifests were authored but excluded from the active manifest build. Re-enabling each requires the matching Prisma model + policy review; many map directly to the missing-models list above.

Active work to re-integrate:
- `facility-rules.manifest`, `invoice-rules.manifest`, `payment-rules.manifest`, `payment-method-rules.manifest`, `collections-rules.manifest`, `revenue-recognition-rules.manifest`, `procurement-requisition-rules.manifest`, `vendor-contract-rules.manifest`, `equipment-rules.manifest`, `shipment-rules.manifest`, `knowledge-base-rules.manifest`, `quality-control-rules.manifest`, `rate-limit-rules.manifest`, `payment-reconciliation-rules.manifest`, `version-control-rules.manifest`, `digital-twin-rules.manifest`, `prep-task-dependency.manifest`.

A single pass to promote the Accounting set (5 manifests) plus `facility-rules.manifest` and the two procurement ones (`procurement-requisition-rules`, `vendor-contract-rules`) would close the bulk of the Tier 1 crashes and the biggest manifest-coverage gaps at once.

---

## Technical Debt Inventory

### High-priority TODOs
- `packages/payroll-engine/src/dataSource/PrismaPayrollDataSource.ts:58, 59, 125, 287, 383-394` — 5 missing models + YTD tracking.
- `packages/supplier-connectors/src/connectors/us-foods.ts:65, 90, 111, 138` — EDI unimplemented.
- `packages/supplier-connectors/src/connectors/charlies-produce.ts:65`.
- `apps/api/app/api/accounting/revenue-recognition/schedules/route.ts:20`.
- `apps/api/app/api/kitchen/tasks/[id]/route.ts:129` — title/summary/dueDate/tags updates.
- `apps/api/app/api/inventory/supplier-sync/status/route.ts:95`.
- `apps/api/app/api/calendar/route.ts:170` — deadlines/reminders models.
- `apps/api/app/api/crm/clients/actions.ts:611` — Employee model.
- `apps/api/app/api/procurement/approvals/action/route.ts:48-122` — workflow integration.

### 501 stubs
- `apps/api/app/api/command-board/templates/route.ts` and `[shareId]/route.ts`.
- `apps/api/app/api/accounting/revenue-recognition/schedules/route.ts` (+ `[id]/route.ts`).
- `apps/api/app/api/logistics/routes/commands/optimize/route.ts`.
- `apps/api/app/api/kitchen/equipment/*/route.ts` (5 routes — intentional per design).

### Skipped tests (~34 total, third-pass re-verified 2026-04-24)
- 5 `it.todo` in `apps/api/__tests__/email-templates/templates.test.ts:1073-1077`.
- 3 `it.todo` in `apps/api/__tests__/inventory/forecasting.test.ts:834-836`.
- 1 `describe.skip` in `apps/api/__tests__/sales-reporting/generate.test.ts:33`.
- **25** `test.skip(true, ...)` in `e2e/` across **6 spec files** (prior pass said 35/8 — overcounted): integrated-payment-processor (7), recipe-scaling (7), role-aware-empty-states (4), illustrated-empty-states (4), communication-preferences (2), getting-started-checklist (1). `collaboration-workspace`, `ambient-animation`, and `AI-context-aware-suggestions` had no `skip(true)` hits on third-pass grep.
- Environment-dependent skips in `packages/sentry-integration/` — `fixer-real.test.ts`, `fixer-live.test.ts` conditional on `OPENAI_API_KEY`.
- 0 committed `.only` directives (verified).

### Test suite footprint (third-pass counts)
- Total test files across the repo: **~160** (55 in `apps/api`, 29 in `apps/app`, 76 in `packages/*`).
- `packages/mcp-server/` has **10 test files, 165 `it()` blocks** — prior pass stated "10 tests" which was really 10 files.

### Dead / orphaned code

Re-verification 2026-04-24 (third pass) found **21 orphan backup/stale files** (prior passes said 9 and 17; the "17" was an arithmetic slip — the stated extension counts actually sum to 21):
- `.bak` files (11): `apps/api/__tests__/staff/auto-assignment.test.ts.bak`, `apps/api/app/api/events/[eventId]/warnings/route.test.js.bak`, `apps/api/app/api/kitchen/waste/trends/route.ts.bak`, `apps/api/app/api/shipments/[id]/route.ts.bak`, `apps/app/app/(authenticated)/crm/clients/[id]/components/tabs/events-tab.tsx.bak`, `apps/app/app/(authenticated)/kitchen/recipes/[recipeId]/components/recipe-detail-tabs.tsx.bak`, `apps/app/next.config.ts.bak`, `docs/database/migrations/README.md.bak`, `packages/ai/src/agent.ts.bak`, `packages/database/prisma/schema.prisma.bak`, `.autolab/tasks.json.bak`.
- `.backup` files (6): `AGENTS.md.backup`, `apps/api/app/api/events/allergens/check/route.ts.backup`, `apps/app/app/(authenticated)/kitchen/recipes/components/recipe-edit-modal.tsx.backup`, `archive/manifest-legacy-2026-02-10/route.ts.backup`, `docs/Roadmap/IMPLEMENTATION_PLAN.md.backup`, `packages/database/prisma/schema.prisma.backup`.
- `.new` files (3): `apps/app/app/(authenticated)/layout.tsx.new`, `apps/app/app/(authenticated)/components/sidebar.tsx.new`, `packages/notifications/sms.ts.new`.
- `.tmp` (1): `.specify/specs/004-database-docs-integrity/.progress.md.tmp`.

Also dead:
- `apps/app/app/(authenticated)/test-page.tsx` — trivial `<h1>Test</h1>`.
- `apps/app/app/(authenticated)/marketing/` — "Coming Soon" stub with no backend.
- `apps/app/app/lib/command-board/` — orphaned lib code for the missing authenticated UI.
- **Auto-generated duplicate routes** paralleling canonical paths:
  - `/api/chartofaccount/` vs `/api/accounting/chart-of-accounts/`
  - `/api/eventbudget/` vs `/api/events/budgets/`
  - `/api/payrollperiod/` vs `/api/payroll/periods/`
  - `/api/purchaseorder/` vs `/api/inventory/purchase-orders/`
  - `/api/scheduleshift/` vs `/api/staffing/schedule/`
  - (plus others following the same pattern)

### Raw SQL usage
**1,577 occurrences across 250 files** (sixth-pass full grep; prior passes said "527 across 187" — was a line-count not occurrence-count). Full audit in Raw-SQL Audit (6th Pass) section. Legitimate in analytics/reporting; concerning in:
- Procurement (≥21 instances)
- Payroll (≥20 instances; bank-accounts now uses Prisma ORM — resolved 2026-04-28)
- Shipments (≥11 instances)
- Logistics drivers/vehicles (no Prisma models)
- Facilities assets (no Prisma model)

All clusters need parameterization review + Prisma-model backfill. Blocker 6 is one already-identified correctness instance in logistics drivers.

### TypeScript suppressions
**15** `@ts-expect-error` / `@ts-ignore` total across committed source (third-pass re-count; prior passes said 10/12 — under-counted by 3-5). Location breakdown: 9 files. Most legitimate. Low priority.

### Duplicate `softDelete/` + `soft-delete/` directories
See Blocker 4. Canonical choice: `soft-delete/` (kebab-case). Re-verification 2026-04-24: 2 modules have BOTH variants, 1 has only the camelCase, 21 modules total use one or the other. Prior "~45 modules" figure conflated paths with modules.

### Console logging in production
Re-verification 2026-04-24 counted 449 `console.log` + 1,727 `console.error` + 16 `console.warn` = **~2,192 console.* statements** across `apps/api/` (1,304 files). Prior pass said "~393" which only counted `console.log`. The cleanup target is substantially larger than documented; prioritize replacing error-path logging with `@repo/observability` / Sentry.

### Auto-generated API duplicates (third-pass expanded)
Prior passes listed 5 then 12. A full `ls apps/api/app/api/` run identifies **~60 camelCase-no-hyphen directories** that appear auto-generated (most pair with a canonical hyphenated path, some appear orphaned). Complete list requiring manual per-directory audit before removal:

`adminchatparticipant, admintask, aieventsetupsession, alertsconfig, allergenwarning, apikey, battleboard, budgetalert, budgetlineitem, bulkorderrule, cateringorder, chartofaccount, clientcontact, clientinteraction, clientpreference, commandboard, commandboardcard, commandboardconnection, commandboardgroup, commandboardlayout, contractsignature, cyclecountrecord, cyclecountsession, emailtemplate, emailworkflow, employeeavailability, employeecertification, employeededuction, eventbudget, eventcontract, eventdish, eventguest, eventimportworkflow, eventprofitability, eventreport, eventstaff, eventsummary, inventoryitem, inventorysupplier, inventorytransaction, kitchentask, laborbudget, menudish, overrideaudit, payrollapprovalhistory, payrollperiod, payrollrun, performanceprediction, prepcomment, preplist, preplistitem, prepmethod, preptask, preptaskplanworkflow, pricingtier, proposal, proposallineitem, purchaseorder, purchaseorderitem, recipe, recipeingredient, recipestep, recipeversion, rolepolicy, sampledata, scheduleshift, smsautomationrule, station, timecardeditrequest, timeentry, timeoffrequest, trainingassignment, trainingmodule, variancereport, vendorcatalog, wasteentry`

Before removing, grep each for external callers. Keep ones that have unique callers (some may be the canonical path for an entity not otherwise routed). This is a multi-day sweep, not a single PR.

---

## Recommended Execution Order

Each tier should be complete before the next, except where items can be parallelized.

### Tier 0 — Build Blockers (do first)
1. Resolve merge conflict in `.autolab/tasks.json` (Blocker 1). Unblocks Biome and CI.

### Tier 1 — Runtime Crash + Correctness Bugs (parallelize)
2. ~~Procurement requisitions (**8 routes**, missing `delete/`): add `PurchaseRequisition` model + manifest, or remove the fabricated routes (Blocker 2a).~~ ✅ **RESOLVED 2026-04-26**: promoted `procurement-requisition-rules.manifest` from `manifests-disabled/`, added `PurchaseRequisition` + `PurchaseRequisitionItem` Prisma models (mapped to pre-existing `purchase_requisitions` / `purchase_requisition_items` tables in `tenant_inventory` schema), fixed `list/route.ts` bug (was querying `database.purchaseOrder`), and registered domain mappings in `generate.mjs` / `generate-all-routes.mjs` / `generate-route-manifest.ts`. Manifest grammar fixes: converted `:block` constraint to curly-brace form, removed undeclared `submittedBy` mutation, replaced unsupported `if/else` block in `approveManager` with ternary expressions. Compile clean (91 entities, 395 commands); no new typecheck errors in `procurement/requisitions/*`. The 8 commands (create/update/submit/approveManager/approveFinance/reject/convertToPo/cancel) are intentional — `delete` is replaced by `cancel` per workflow design.
3. ~~Procurement vendor-contracts (**7 routes**, missing `update/`): add `VendorContract` model + manifest, or remove the fabricated routes (Blocker 2b).~~ ✅ **RESOLVED 2026-04-26**: promoted `vendor-contract-rules.manifest` from `manifests-disabled/` with grammar fixes (no `if/else`, no `max()` builtin), added `VendorContract` Prisma model + `Account` back-relation, fixed `list/route.ts` bug (was querying `database.eventContract`), registered domain mapping in 3 generator scripts, and created the 3 missing command routes (`update`, `renew`, `record-sla-breach`). All 10 manifest commands now have route handlers. Compile clean.
4. ~~Payroll bank-accounts: add `BankAccount` model to schema to replace the 5 raw-SQL routes (Blocker 3 — not a crash, a schema/ORM break).~~ ✅ **RESOLVED 2026-04-28**: Prisma model exists (`EmployeeBankAccount`), all 6 routes use Prisma ORM, RLS enabled.
5. Accounting collections RouteContext: fix `params` type at `.../cases/[id]/route.ts:47` (Blocker 5).
6. Logistics drivers update: fix the broken ternary at `.../drivers/commands/update/route.ts:41` — rewrite as two explicit branches or use `Prisma.sql` fragment (Blocker 6 — correctness bug, not injection).
7. Duplicate `softDelete/` directories: remove camelCase variants in the 3 inventory modules (Blocker 4 — 23 modules use one of the two spellings; only 3 need cleanup).

### Tier 2 — Schema & Tenant Isolation
8. ~~Backfill Prisma models for 8 orphaned tables + `facility_assets`, `drivers`, `vehicles`.~~ ✅ **RESOLVED 2026-04-26**: Added `Driver`, `Vehicle`, `FacilityAsset`, `VendorContact`, `VendorRating`, `ProcurementBudget`, `ProcurementBudgetAlert`, `CrmScoringRule` to `schema.prisma`. Remaining orphaned: `ProcurementApproval`, `Deal`, `RevenueRecognitionSchedule` (lower priority — no active routes).
9. ~~Add `ENABLE ROW LEVEL SECURITY` + policies to all post-March-8 tables~~ ✅ **RESOLVED 2026-04-26**: Migration `20260427000000_add_rls_post_expansion_tables` adds RLS to 14 tables; migration `20260427010000_add_logistics_facilities_tables` creates 3 phantom tables with RLS baked in. All post-March-8 tenant-scoped tables now have RLS.
10. Dedup duplicate `audit_log` migration.
11. Remove auto-generated route aliases (`/api/chartofaccount/` etc.) after confirming no callers.

### Tier 3 — Incomplete Modules
12. Accounting: complete payment gateway integration, invoice email, revenue recognition model + routes.
13. Facilities: ~~add `FacilityAsset` Prisma model~~ ✅ (added 2026-04-26); build work-order status/cost update UI; integrate `facility-rules.manifest` out of `manifests-disabled/`.
14. Logistics: real GPS/webhook integration; ~~add `Driver`, `Vehicle` models~~ ✅ (added 2026-04-26); implement `/routes/commands/optimize`; create logistics manifests.
15. Payroll: implement YTD tracking for SS wage cap; add `TaxInfo`, `PayrollPrefs`, `TipPool` models; API integration tests.
16. Procurement: approvals baseline workflow is already wired (re-verification 2026-04-24); add rules-engine branching + hardening pass on raw SQL.
17. Command Board: decide rebuild-or-retire for authenticated UI.
18. Manifest coverage: close 473-handler gap, prioritizing accounting/facilities/logistics/procurement.
19. Route authentication: bring 115 unauthenticated routes into auth.

### Tier 4 — Polish & Verification
20. Webhook DLQ frontend UI.
21. Mobile staffing/scheduling shift-assignment UI.
22. Clean up dead code (`.new`, `.bak`, `test-page.tsx`, orphaned marketing shell, command-board lib orphans).
23. Run `testing/load-test.js` for the first time; capture baseline.
24. Unblock `sales-reporting/generate.test.ts:33` `describe.skip`.
25. Collaboration Workspace (P1.4) — rebuild from spec.
26. Multi-Channel Marketing (P3.2) — real implementation behind the UI shell.
27. Supplier-connector EDI implementation (us-foods, charlies-produce).
28. Nowsta integration from `nowsta-integration_TODO` spec.

---

## Notes on Working in This Repo

See `AGENTS.md` "Known Gotchas" section for operational pitfalls including the non-existent `pnpm manifest:lint-routes` command, Biome-blocked-by-merge-conflict, and the raw-SQL-vs-missing-model pattern across new modules.

---

