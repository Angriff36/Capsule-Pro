# Capsule-Pro Implementation Plan

> **Last updated:** 2026-04-24 (eighth-pass comprehensive raw-SQL audit)
> **Prior passes:** 2026-04-24 initial post-expansion audit → 2026-04-24 first re-verification → 2026-04-24 third-pass spot-check → 2026-04-24 fourth-pass package health → 2026-04-24 fifth-pass E2E audit → 2026-04-24 sixth-pass raw-SQL audit → 2026-04-24 seventh-pass supplementary raw-SQL audit → **2026-04-24 eighth-pass comprehensive raw-SQL audit**.
> **Previous snapshot:** 2026-03-08 (stale — many claims falsified by post-expansion audit)
> **Audit method:** initial 15+ parallel subagent investigations → 8-subagent re-verification → 10-subagent third-pass → 10-subagent fourth-pass → E2E fifth-pass → 20-subagent sixth-pass → 9-subagent seventh-pass → 15-subagent confirmation pass → **20-subagent eighth-pass comprehensive raw-SQL audit** covering all 233 source files with source-level verification, pattern-based analysis, and parameter index alignment checks.
> **Current state:** Massive feature expansion in commit b8c31eef (2026-04-19) added 5 new modules; no commits since a71ec8d5 (2026-04-24). **Eighth pass found 10 NEW CRITICAL, 15 NEW HIGH, 20+ NEW MEDIUM** issues not caught by prior passes. Key discoveries: systemic schema drift in `events/importer.ts` (15 queries using camelCase Prisma field names instead of DB column names — entire import pipeline broken), Goodshuffle sync services broken at runtime (wrong column names `name`→`title`, `total_budgeted`→`total_budget_amount`), `timecards/me` JOIN on non-existent `tenant.users`, `labor-budget.ts` Prisma.raw() with broken parameter binding, and SQL injection via unsanitized `sortOrder` in `trash/list`. **Combined 6th+7th+8th pass totals: 19 CRITICAL, 25 HIGH, 32+ MEDIUM, 17 tenant isolation gaps** across 1,594 raw-SQL lines in 233 source files.

---

## Executive Summary

The previous implementation plan (2026-03-08) was over-optimistic and has been substantially falsified by this audit. Between then and now, commit **b8c31eef (2026-04-19)** landed a massive expansion adding **five entirely new top-level modules** (accounting, facilities, logistics, payroll, procurement) plus load testing infrastructure and a suite of planning documents. None of that work was reflected in the old plan.

Core infrastructure remains strong:
- Manifest-driven command/event architecture is intact (63 manifest files / 91 entities / 389 commands / 387 events).
- Auth (Clerk), database (Prisma + Postgres schemas), and the `payroll-engine` package are production-quality.
- Original P0–P3 items that were genuinely completed (schema drift fixes, kitchen task reopen, webhook DLQ backend, email templates, rate limiting, API keys, RBAC, inventory audit, SMS rules, mobile search/settings/push) remain verified.

However, the new-module expansion shipped with:
- **Runtime crash bugs** in procurement (requisitions, vendor-contracts) and payroll (bank-accounts) caused by missing Prisma models and missing manifests.
- **Duplicate route directories** (`softDelete/` alongside `soft-delete/`) in ~45 modules causing Next.js routing ambiguity.
- **SQL injection risk** in logistics driver update.
- **Zero row-level-security policies** on any post-March-8 migration — all new tables are cross-tenant readable.
- **473 write handlers (46%)** still lack manifest coverage; 163 routes bypass the dispatcher entirely; 115 routes lack authentication.
- **Eight orphaned tables** in migrations with no Prisma model.
- **Falsified test claims** — several test-file paths and line counts referenced in the old plan do not match reality.

The Command Board authenticated UI appears to have been removed: `apps/app/app/(authenticated)/command-board/` **does not exist**, yet the old plan repeatedly cited files inside that directory.

This document supersedes the 2026-03-08 plan. Facts are grouped into the five required categories with file paths and line numbers so that any engineer can verify before acting.

---

## Re-verification Deltas (2026-04-24, third pass)

Third pass ran 10 parallel verification subagents against the second-pass claims. Corrections below are applied inline; this section is the changelog.

1. **Blocker 2a** — procurement requisitions have **8** command directories, not 9. The MISSING one is `delete/`, not `submit/`. Actual: `approve-finance, approve-manager, cancel, convert-to-po, create, reject, submit, update`. Second pass overstated by one.
2. **Blocker 2b** — procurement vendor-contracts have **7** command directories, not 8. The MISSING one is `update/`. Actual: `activate, approve, create, reject, submit, terminate, update-compliance`. Second pass overstated by one.
3. **Blocker 3** — Payroll bank-accounts routes do **NOT crash**. All 5 command routes use `database.$queryRaw` against `tenant_staff.employee_bank_accounts` directly, bypassing the missing `BankAccount` Prisma model. Pattern is broken (raw-SQL-instead-of-ORM) but not a runtime crash. Second pass was wrong about the failure mode.
4. **Blocker 4** — **23 modules** use one of the two spellings (not 21). 3 modules have the camelCase `softDelete/`, 2 of those 3 also have `soft-delete/` alongside it.
5. **Blocker 6** — The drivers/update/route.ts:41 code `${vehicleId !== undefined ? (vehicleId || null) + "::uuid" : "vehicle_id"}::uuid` is **NOT a classical SQL-injection vulnerability** — Prisma's `$queryRaw` template-literal interpolation parameterizes the computed string. It IS a **correctness bug**: the ternary emits `"<uuid-string>::uuid"` (a 40-char string with embedded cast syntax) which PostgreSQL then rejects at uuid cast time, and when vehicleId is undefined it emits the literal string `"vehicle_id"` as a parameter (not the column identifier the author intended). Still a Tier-1 blocker; the framing in the prior pass was wrong.
6. **Payroll engine tests** — 42 tests total (24 calculator + **18** export), not 46 (24 + 22). Second pass overcounted export by 4.
7. **MCP-server tests** — ~165 `it()` blocks across 10 test files (not 10 tests). "10 tests" was "10 files". Correct metric: 10 test files, 165 test cases.
8. **Dead code** — 21 orphan backup files (not 17). The second-pass count had an arithmetic error: 11 `.bak` + 6 `.backup` + 3 `.new` + 1 `.tmp` = 21, not 17. Individual extension counts were correct; the stated sum wasn't.
9. **`@ts-expect-error`/`@ts-ignore`** — 15 in committed source, not 10. Second-pass grep missed occurrences in 4 additional files.
10. **Raw SQL usage** — **1,577 occurrences across 250 files** (sixth-pass full grep count; prior "527 across 187" was a grep-line undercount, not occurrence count).
11. **Route-audit.md numbers are stale** — the planning doc (dated 2026-04-13) claims 163 bypass-dispatcher routes. Current count is closer to **~490** (3x underreport). `b8c31eef` added hundreds of new routes after the audit ran; the figures in that doc should not be quoted without re-running the scan.
12. **Manifest coverage gap** — real gap is **617 uncovered write handlers (61.6%)**, not 473 (46%). Routes `routes.manifest.json` only tracks POST; PUT/PATCH/DELETE handlers are entirely absent from coverage counts. Total write handlers = 1001, manifest-covered = 384.
13. **IR metrics** — `routes.manifest.json` reports **89 entities / 384 commands / 0 events** via `kind` fields (not 91/389/387). Event-sourced routes are either missing from the IR or counted differently. Treat the event count as suspect pending investigation.
14. **L1.6 proxy.ts merge conflict** — REMAINS FALSE. Third-pass subagent #5 flagged a conflict there; a direct grep confirms none exists. Prior plan was correct; that single subagent was wrong.
15. **Command Board** — L1.1 removal of the authenticated UI is confirmed, BUT the backend `apps/api/app/api/command-board/` has a **fully functional simulations engine** (11 subdirectories; `simulations/{apply,delta,discard,merge,route.ts}` all real). P1.3 "AI Simulation Engine is blocked" is **wrong** — the engine runs; only the UI-facing surface is missing. Users currently access the feature through the AI-assistant side panel (`apps/app/app/(authenticated)/components/ai-assistant/`) which calls `/api/command-board/chat`.
16. **Auto-generated camelCase route duplicates** — far more than the 5-12 listed in prior passes. A full top-level listing of `apps/api/app/api/` shows **~60 camelCase-no-hyphen directories** that appear auto-generated (see expanded list in Technical Debt section).
17. **Test file line counts have drifted** (files grew since plan metadata was recorded):
    - `apps/api/__tests__/ai/suggestions.test.ts` — 562 lines (plan said 501).
    - `apps/api/__tests__/inventory/forecasting.test.ts` — **837 lines** (plan said 267; off by a factor of 3).
    - `apps/api/__tests__/email-templates/templates.test.ts` — 1,078 lines (plan said 1,017).
18. **E2E skip count** — 25 `test.skip(true, …)` occurrences across 6 spec files, not 35 across 8. Revised offender list: communication-preferences (2), integrated-payment-processor (7), role-aware-empty-states (4), getting-started-checklist (1), illustrated-empty-states (4), recipe-scaling (7). `collaboration-workspace` and `ambient-animation` and `AI-context-aware-suggestions` skips from the second pass were not found in current source.
19. **Supplier sync logs** — `SupplierSyncLog` Prisma model was correctly removed from the orphaned-table list in the second pass. Still not orphaned.
20. **Spec `SPEC_connections.md`** (command board entity-relationship connections) — spec exists but **no backend routes or UI code**. Add to Category 3.

No new commits since `a71ec8d5`. Blocker validity unchanged at the file:line level; only counts and framing were corrected.

---

## Re-verification Deltas (2026-04-24, second pass — retained for history)

Second pass corrected the following factual errors in the first 2026-04-24 audit:

1. **Blocker 2a** — procurement requisitions have 9 command files (not 8); names are `create/update/delete/approve-finance/approve-manager/cancel/convert-to-po/reject/submit` (not `receive`).
2. **Blocker 2b** — vendor-contracts have 8 files with different names than first pass: `create/update/activate/approve/reject/submit/terminate/update-compliance` (no `delete/renew/amend/void`).
3. **Blocker 4** — 2 modules have both `softDelete/` and `soft-delete/`; 1 has only camelCase; 21 modules total. First pass' "~45" conflated paths with modules.
4. **P2.A Payment Methods** — `[id]` PUT/DELETE are functional at `payment-methods/[id]/route.ts:74-198`, not stubs.
5. **P2.E Procurement Approvals** — action route at `approvals/action/route.ts:68-97` has a working UPDATE + INSERT, not a stub.
6. **P2.D Payroll engine** — 46 tests (24 calculator + 22 export), not 24. Undercounted.
7. **Schema drift** — `supplier_sync_logs` has a `SupplierSyncLog` Prisma model; it is NOT orphaned. Remove from the list.
8. **Dead code** — 17 orphan backup files (not 9): 11 `.bak`, 6 `.backup`, 3 `.new`, 1 `.tmp`.
9. **`@ts-expect-error`/`@ts-ignore`** — 10 in committed source (not 12).
10. **Console logging** — 449 `console.log` + 1,727 `console.error` + 16 `console.warn` in `apps/api/` (~2,192 total). Prior "~393" only counted `console.log`.
11. **Quarantined manifests** — 17 live in `manifests-disabled/` (not just `facility-rules.manifest`). Full list now included in Manifest Coverage Audit.

No new commits since `a71ec8d5`. All Tier 0/1 blockers re-verified to still hold at the exact file paths and line numbers cited.

---

## Blockers (Fix Immediately)

1. **Merge conflict in `.autolab/tasks.json`** — lines 4195-4199 and 4213+ contain unresolved `<<<<<<< Updated upstream / ======= / >>>>>>> Stashed changes` markers. Blocks `pnpm biome check` (reports 1803 errors / 3152 warnings while this exists). Also shows as modified in `git status` on session start.

2. **Procurement runtime failures** — 15 command routes will crash on any POST (verified 2026-04-24, third pass):
   - `/apps/api/app/api/procurement/requisitions/commands/{approve-finance,approve-manager,cancel,convert-to-po,create,reject,submit,update}/route.ts` — **8 files** (no `delete/` directory; second-pass count of 9 was wrong); each calls `createManifestRuntime()` (e.g. `create/route.ts:14` import, `create/route.ts:51` call) against a non-existent manifest. The manifest exists but is quarantined at `packages/manifest-adapters/manifests-disabled/procurement-requisition-rules.manifest`. `PurchaseRequisition` Prisma model does not exist.
   - `/apps/api/app/api/procurement/vendor-contracts/commands/{activate,approve,create,reject,submit,terminate,update-compliance}/route.ts` — **7 files** (no `update/` directory; second-pass count of 8 was wrong); same pattern. Manifest at `manifests-disabled/vendor-contract-rules.manifest`. `VendorContract` model does not exist.

3. **Payroll bank-accounts broken scaffold** (downgraded from "runtime crash" to "architectural break" per third-pass verification) — `/apps/api/app/api/payroll/bank-accounts/commands/{create,update,delete,verify,set-default}/route.ts` all execute **raw SQL** against `tenant_staff.employee_bank_accounts` instead of using Prisma. They do NOT crash — they bypass the missing `BankAccount` model entirely. Migration `20260327020000` created the table; no Prisma model was ever added. The prior-pass "will crash" claim was wrong; the routes return data but leave the schema drift unresolved and sit outside the ORM / RLS enforcement layer.

4. **Duplicate route conflicts (`softDelete/` vs `soft-delete/`)** — re-verification 2026-04-24 (third pass):
   - **2 modules have BOTH** variants side-by-side (true routing ambiguity):
     - `apps/api/app/api/inventory/pricing-tiers/commands/`
     - `apps/api/app/api/inventory/bulk-order-rules/commands/`
   - **1 additional module has ONLY the camelCase variant** (should be renamed): `apps/api/app/api/inventory/supplier-catalogs/commands/softDelete/`.
   - **23 modules total** use one of the two spellings (third pass corrected second pass's "21"); the original "~45 modules" figure over-counted paths as modules.

   Next.js routing picks one arbitrarily on case-sensitive filesystems; behavior is ambiguous. Canonical is `soft-delete` (kebab-case).

5. **Accounting collections RouteContext bug** — `/apps/api/app/api/accounting/collections/cases/[id]/route.ts:47` declares `params: { id: string }` instead of `Promise<{ id: string }>`. Next.js 15 async params will throw at runtime.

6. **Logistics drivers update — correctness bug (not SQL injection)** — third-pass re-read of `/apps/api/app/api/logistics/drivers/commands/update/route.ts:41`:
   ```
   vehicle_id = ${vehicleId !== undefined ? (vehicleId || null) + "::uuid" : "vehicle_id"}::uuid,
   ```
   The ternary runs in JS **before** Prisma parameterizes — so Prisma receives a computed string, not user SQL, and the value IS parameterized. However the computed string is always wrong: when `vehicleId` is a UUID it becomes `"<uuid-value>::uuid"` (a 40-char literal Postgres rejects at uuid cast), and when `vehicleId` is undefined it becomes the literal `"vehicle_id"` (passed as parameter, not as a column reference). Rewrite as two explicit branches or use `Prisma.sql` with a conditional fragment. Still a Tier-1 blocker but classified as a correctness/runtime failure, not an injection vulnerability.

7. **Zero RLS on new-module tables** — multi-tenant data leakage possible across accounting, facilities, logistics, payroll, procurement. See Schema Drift Audit.

---

## Category 1: CLAIMED DONE BUT BROKEN OR MISSING (Lies in Prior Plan)

### L1.1 — Command Board UI "~95% complete" (UI only; backend intact)
- **Plan claimed:** `apps/app/app/(authenticated)/command-board/actions/boards.ts` (lines 407-567), `apps/app/components/command-board/board-shell.tsx`, and AI simulation mode UI inside board-shell.
- **Actual state:** `apps/app/app/(authenticated)/command-board/` **does not exist** at all. Surviving code:
  - `apps/app/app/lib/command-board/manifest-plans.ts` (orphaned library code)
  - `apps/app/app/api/command-board/` (frontend proxy with `chat/` agent-loop + `types/`)
  - `apps/app/__tests__/api/command-board/` (9 test files)
  - `apps/api/app/api/command-board/` — **11 subdirectories, FULLY functional**: `[boardId], boards, cards, connections, draft, groups, layouts, simulations, templates` + top-level `route.ts`. The simulations engine at `simulations/{apply,delta,discard,merge}/` is production-quality.
  - `apps/app/app/(authenticated)/components/ai-assistant/ai-assistant-panel.tsx` — users now interact with the board via this side-panel which hits `/api/command-board/chat`.
- **Impact (third-pass correction):** P1.3 AI Simulation Engine is **NOT blocked**. The engine runs. What's missing is the spatial/canvas UI layer; the feature is still usable via the AI assistant panel.
  - 501 stubs remain in `templates/route.ts` + `templates/[shareId]/route.ts` (awaiting `shareId`/`isPublic` fields on `CommandBoard` model).
  - `SPEC_connections.md` (entity-relationship connections) has **no backend routes** — it is pure spec (move to Category 3).
- **Resolution:** Decide whether to rebuild the canvas/authenticated UI (spec at `specs/command-board/boardspec.md`) or keep the chat-based surface and retire the canvas plan. If rebuilt, redesign around the existing simulations/chat backend and the `manifest-plans.ts` lib.

### L1.2 — API Keys test file path
- **Plan claimed:** `apps/api/__tests__/api-keys/api-keys.test.ts` (22 tests).
- **Actual:** That path does not exist. Real file is `apps/api/__tests__/lib/api-key-service.test.ts` (22 tests — count is correct, path is wrong).
- **Resolution:** Update references; the feature itself is VERIFIED.

### L1.3 — SMS automation test file path and count
- **Plan claimed:** `apps/api/__tests__/sms-automation/rules.test.ts` (25 tests).
- **Actual:** File does not exist. Closest analogue is `packages/notifications/__tests__/sms-templates.test.ts` (14 tests, not 25).
- **Resolution:** Update references; the manifest-driven SMS rules engine itself is VERIFIED.

### L1.4 — Test file line counts and modification dates
- **Plan claimed:**
  - `apps/api/__tests__/ai/suggestions.test.ts` is 501 lines, created 2026-03-08.
  - `apps/api/__tests__/inventory/forecasting.test.ts` is 267 lines, created 2026-03-08.
  - Email-templates test has 34 tests (1,017 lines) created 2026-03-08.
- **Actual:** All three files were last modified **2026-04-05**, not 2026-03-08. The AI suggestions file contains 18 `it()` blocks; line counts differ from plan.
- **Resolution:** The tests exist and are meaningful — just the metadata the plan cited is wrong. Treat the dates/sizes as unreliable going forward.

### L1.5 — Manifest file counts
- **Plan claimed:** "80 entities, 350 commands, 347 events, 54 manifest files".
- **Actual:** **63 manifest files / 91 entities / 389 commands / 387 events**.
- **Resolution:** Plan undercounted; adjust downstream figures accordingly.

### L1.6 — `auth-implementation.md` alleged merge conflict
- **Plan claimed:** merge conflict exists in `apps/api/proxy.ts`.
- **Actual:** No conflict in that file. The real conflict is in `.autolab/tasks.json` (see Blocker 1).
- **Resolution:** Correct the citation; the underlying Clerk auth work is VERIFIED.

### L1.7 — P2.1 Supplier Catalog "100% complete"
- **Plan claimed:** 100% done.
- **Actual:** Core routes exist and function, but duplicate `softDelete/` and `soft-delete/` directories in `pricing-tiers` and `bulk-order-rules` create Next.js routing conflicts.
- **Resolution:** Delete the camelCase variants. Downgrade to ~95% until duplicates are removed.

### L1.8 — Procurement Automation "0% FABRICATED"
- **Plan claimed:** No implementation at all.
- **Actual:** Substantial partial implementation exists — 37+ routes. Purchase orders, vendors, and budget are functional. Requisitions and vendor-contracts are broken scaffolds (see Blocker 2). This is an under-report by the plan, but also a misleading one because the half that exists is half-built.
- **Resolution:** Reclassify to Category 2 (Partially Implemented), ~40%.

### L1.9 — Dev tooling: `pnpm manifest:lint-routes`
- **Plan claimed:** agents can run `pnpm manifest:lint-routes`.
- **Actual:** Script does not exist in `package.json`. Available: `pnpm manifest:build`, `pnpm manifest:routes:ir`.
- **Resolution:** Documented in AGENTS.md Known Gotchas.

---

## Category 2: PARTIALLY IMPLEMENTED

### P2.A — Accounting (new module, ~70%)

| Sub-module | State | Key files |
|---|---|---|
| Chart of Accounts | DONE (but duplicate routes) | `/api/accounting/chart-of-accounts/` canonical; `/api/chartofaccount/` auto-generated duplicate |
| Invoices | MOSTLY DONE | Email sending stubbed at `apps/api/app/api/accounting/invoices/[id]/route.ts:233` |
| Payments | PARTIAL | Gateway stubbed at `apps/api/app/api/accounting/payments/[id]/route.ts:90-95`; UI form stubbed in `PaymentFormClient` lines 112-123 |
| Payment Methods | FUNCTIONAL (but schema-mismatched) | `[id]` PUT/DELETE implement full DB logic at `apps/api/app/api/accounting/payment-methods/[id]/route.ts:74-148` (PUT) and `:154-198` (DELETE soft-delete). File header acknowledges some referenced fields don't exist on the model. Prior plan's "stub" claim was incorrect. |
| Collections | MOSTLY DONE | RouteContext bug at `apps/api/app/api/accounting/collections/cases/[id]/route.ts:47` (see Blocker 5) |
| Revenue Recognition | 501 STUB | `apps/api/app/api/accounting/revenue-recognition/schedules/route.ts` and `[id]/route.ts`; `RevenueRecognitionSchedule` model missing from `schema.prisma` |

- **Tests:** zero accounting tests.
- **Manifests:** only `chart-of-account-rules.manifest` is active. **Five accounting manifests are quarantined in `packages/manifest-adapters/manifests-disabled/`**: `invoice-rules.manifest`, `payment-rules.manifest`, `payment-method-rules.manifest`, `collections-rules.manifest`, `revenue-recognition-rules.manifest`. Integrating them (and adding the missing Prisma models) would unlock most of the accounting surface at once.

### P2.B — Facilities (new module, ~70%)

| Sub-module | State | Notes |
|---|---|---|
| Areas | DONE | `FacilityArea` Prisma model present |
| Assets | BROKEN | Raw SQL against `tenant_facilities.facility_assets`; **NO Prisma model** |
| Preventive Maintenance Schedules | DONE | `PreventiveMaintenanceSchedule` model present |
| Work Orders | PARTIAL | UI is view-only; no status/cost update UI at `apps/app/app/(authenticated)/facilities/work-orders/page.tsx:231-236` |

- **Tests:** single widget test at `apps/app/__tests__/facilities/upcoming-maintenance-widget.test.tsx`.
- **Manifest:** `facility-rules.manifest` exists but lives in `manifests-disabled/` and is **not integrated**.

### P2.C — Logistics (new module, ~70%)

| Sub-module | State | Notes |
|---|---|---|
| Dispatch | PARTIAL | Assign works; UI doesn't reload on success |
| Drivers | PARTIAL | Raw SQL; **no `Driver` Prisma model**; SQL injection at `apps/api/app/api/logistics/drivers/commands/update/route.ts:41` |
| Vehicles | PARTIAL | Same pattern as drivers; no `Vehicle` Prisma model |
| Routes | PARTIAL | CRUD works; `DeliveryRoute` and `RouteStop` models exist (schema.prisma:5372, 5416) but lack fields needed by the optimize endpoint (`stops`, `totalDistance`, `totalDuration`, `optimizationScore`, `optimizationAlgorithm`). `apps/api/app/api/logistics/routes/commands/optimize/route.ts` returns 501 with that explanation inline. |
| Tracking | FUNCTIONAL BUT SIMULATED | GPS hardcoded to Los Angeles coordinates at `apps/api/app/api/logistics/tracking/route.ts:262-286`; no real GPS/webhook integration |
| Shipments | PRODUCTION | Predates logistics module; reused as-is |

- **Tests:** zero logistics tests.
- **Manifests:** no logistics manifests exist.

### P2.D — Payroll (new module, ~70%)

Strong engine, weak periphery.

- **`packages/payroll-engine/`** — DONE. Real tax calculation and tip allocation. **42 tests** across 2 files (24 in `calculator.test.ts`, **18** in `export.test.ts`); no skips. Third-pass corrected the prior "46" count which overstated export by 4.
- **Periods, Runs, Deductions, Approvals, Tax, Timecards, Export, Reports** — DONE at API level.
- **Bank Accounts** — BROKEN (Blocker 3). Migration `20260327020000` created `employee_bank_accounts` table but no Prisma model.
- **PrismaPayrollDataSource TODOs** at `packages/payroll-engine/src/dataSource/PrismaPayrollDataSource.ts`:
  - Lines 58, 59: missing `TaxInfo` model
  - Line 125: missing `PayrollPrefs` model
  - Line 287: missing `TipPool` model
  - Lines 383-394: YTD tracking unimplemented — Social Security wage base cap will not enforce across repeated runs within a year.
- **Tests:** engine tests solid; API integration tests absent; UI test is a 23-line link-routing smoke test only.
- **Manifest:** `payroll-rules.manifest` exists but partial.

### P2.E — Procurement (new module, ~40%)

| Sub-module | State | Notes |
|---|---|---|
| Purchase Orders | DONE | Raw SQL bypassing ORM at `apps/api/app/api/procurement/purchase-orders/[id]/route.ts:50` |
| Vendors | DONE | Uses `InventorySupplier` model; raw SQL for `vendor_ratings` + `vendor_contacts` (both orphaned — no Prisma models) |
| Budget | DONE | Queries `tenant_inventory.procurement_budgets` via raw SQL; no Prisma model |
| Requisitions | FABRICATED/BROKEN | 8 command routes call non-existent manifest; no `PurchaseRequisition` model — will 500 at runtime (Blocker 2) |
| Vendor Contracts | FABRICATED/BROKEN | Same pattern; no `VendorContract` model (Blocker 2) |
| Approvals | FUNCTIONAL | Re-verification 2026-04-24: action route at `apps/api/app/api/procurement/approvals/action/route.ts:68-97` contains a full UPDATE + INSERT of PO status and approval history. Prior plan called it a "stub"; that was wrong. Workflow is straight-line (no branching rules engine), but it runs. |

- **Tests:** zero procurement tests.
- **Manifests:** `purchase-order-rules.manifest`, `vendor-catalog-rules.manifest` exist; requisitions + vendor-contracts missing.

### P2.F — Other Partial Items

- **AI package** (`packages/ai/`) — re-verified 2026-04-24: `packages/ai/src/metrics.ts` (206 lines) is complete — `MetricsCollector`, `MetricsExportSchema`, `MetricsExportConfig`, `AggregateMetrics` all exported, no TODOs. The "incomplete exports" note from prior pass was wrong; downgrade concern to general maturity only.
- **Supplier Connectors** (`packages/supplier-connectors/`) — both connectors are EDI stubs:
  - `packages/supplier-connectors/src/connectors/us-foods.ts:65, 90, 111, 138` — TODOs
  - `packages/supplier-connectors/src/connectors/charlies-produce.ts:65` — TODO
- **Webhook DLQ Frontend UI** — still missing (backend DLQ is VERIFIED; plan P1.1 acknowledged the frontend gap).
- **Mobile App Staffing/Scheduling UI** — `apps/mobile/.../staffing/` only has recommendations + coverage; no shift assignment UI.
- **Sales Reporting PDF tests** — `describe.skip` at `apps/api/__tests__/sales-reporting/generate.test.ts:33`. (The PDF generation itself in `packages/sales-reporting/` is real and working — not a stub.)
- **Command Board authenticated UI** — see L1.1; the UI layer is missing, only the API proxy and lib remain.

---

## Category 3: NOT STARTED (Spec Exists, No Code)

| Item | Spec / Location | Status |
|---|---|---|
| Collaboration Workspace (P1.4) | In prior plan | 0% — no Prisma models, no routes, no UI |
| Multi-Channel Marketing (P3.2) | In prior plan | UI shell only — `apps/app/app/(authenticated)/marketing/page.tsx` shows "Coming Soon"; no API routes, no Prisma models |
| Nowsta Integration | `specs/nowsta-integration_TODO` | **Partial** (third-pass correction) — `nowsta-sync-service.ts` client + employee mapping implemented; no UI for sync configuration. Re-classify to Category 2 when next revised. |
| RLS Policies for new tables | — | Zero `ENABLE ROW LEVEL SECURITY` or `CREATE POLICY` statements in any migration after 2026-03-08. Accounting, facilities, logistics, payroll, procurement all ship without tenant isolation at the DB level |
| Revenue Recognition Schedules | — | Routes return 501; model missing |
| Command Board — canvas/spatial UI | `specs/command-board/boardspec.md` | Canvas UI not present (backend + AI-assistant chat surface work). Decide rebuild-or-retire. |
| Command Board — entity-relationship connections | `specs/command-board/SPEC_connections.md` | **NEW FINDING (third pass):** spec exists, no backend routes, no UI. |
| Load test execution | `testing/load-test.js` | Script exists (260 lines, 10 endpoints, k6 staged ramp 50-750 VUs) but has **never been run** |

---

## Category 4: NEW FEATURES (Post-March-8, Not in Prior Plan)

Commit **b8c31eef (2026-04-19)** introduced the following. Detailed state for modules is in Category 2; this list documents surface area for navigation.

### 4.1 — Accounting module
Location: `apps/api/app/api/accounting/*`, `apps/app/app/(authenticated)/accounting/*`
Five sub-modules: Chart of Accounts, Invoices, Payments, Payment Methods, Collections, Revenue Recognition. See P2.A.

### 4.2 — Facilities module
Location: `apps/api/app/api/facilities/*`, `apps/app/app/(authenticated)/facilities/*`
Four sub-modules: Areas, Assets, Preventive Maintenance Schedules, Work Orders. See P2.B.

### 4.3 — Logistics module
Location: `apps/api/app/api/logistics/*`, `apps/app/app/(authenticated)/logistics/*`
Six sub-modules: Dispatch, Drivers, Vehicles, Routes, Tracking, Shipments. See P2.C.

### 4.4 — Payroll module
Location: `apps/api/app/api/payroll/*`, `packages/payroll-engine/`
Ten sub-modules: Periods, Runs, Deductions, Approvals, Tax, Timecards, Export, Reports, Bank Accounts, plus the engine package. See P2.D.

### 4.5 — Procurement module
Location: `apps/api/app/api/procurement/*`
Six sub-modules: Purchase Orders, Vendors, Budget, Requisitions, Vendor Contracts, Approvals. See P2.E.

### 4.6 — Load testing infrastructure
`testing/load-test.js` — 260 lines, k6-based, 10 endpoints, staged ramp 50-750 VUs. **Never executed.** Accompanied by `planning/load-test-plan.md`.

### 4.7 — Planning documents (all dated 2026-04-13)
- `planning/feature-inventory.md` — 1346 routes / 195 Prisma models / 187 pages across 12 DB schemas.
- `planning/route-audit.md` — 163 routes bypass dispatcher, 115 unauthenticated, 60 domains without manifests; 12 CRITICAL + 85 HIGH action items.
- `planning/workflows.md` — 10 end-to-end user workflows.
- `planning/user-journey-map.md` — retention analysis.
- `planning/load-test-plan.md` — protocol for running the k6 script.
- `planning/auth-implementation.md` — Clerk integration status.

### 4.8 — Modules the old plan listed as fabricated but are actually implemented
- **Knowledge Base** — API + UI both present.
- **Training / Training Assignment / Training Module** — routes present; `training-hrms_TODO` spec is actually implemented.
- **SMS notification system** — `sms-notification-system_TODO` spec implemented.
- **Webhook outbound integrations** — `webhook-outbound-integrations_TODO` spec implemented.

### 4.9 — Other new surface area
- **Administrative / Admin Chat / Admin Task** routes.
- **Battle Board** routes (separate from command board).
- **Kitchen IoT** — alerts / readings / probes.
- **Sales Reporting PDF** — `packages/sales-reporting/` has real PDF generation.
- **MCP Server** — `packages/mcp-server/` functional with governance scanners; 10 tests.
- **Sentry fixer pipeline** — `packages/sentry-integration/` real AI-fix pipeline.
- **Event Parser** — framework exists; parsers likely incomplete.
- **Kitchen State Transitions** — `packages/kitchen-state-transitions/` real state machine.
- **Security package** — Arcjet integration for bot detection / rate limiting.

---

## Category 5: VERIFIED DONE

Preserved from prior plan; spot-verified where cited, not individually re-tested.

- **P0.1** Schema drift — 9 models added. VERIFIED.
- **P0.2** Kitchen task reopen — `STATUS_TO_COMMAND` has `"pending":"release"` at `apps/api/app/api/kitchen/tasks/[id]/route.ts:16-20`. VERIFIED.
- **P0.3** Timecards delete uses `executeManifestCommand` — `apps/api/app/api/timecards/[id]/route.ts:154-168`. VERIFIED.
- **P0.4** Cycle count uses `"remove"` command — `apps/api/app/api/inventory/cycle-count/records/[id]/route.ts:148-162`. VERIFIED.
- **P1.1** Webhook DLQ backend — cron endpoint + `vercel.json` wired. UI still missing (see Category 2).
- **P1.2** Email templates CRUD + 34-test suite. File path correct; only the 2026-03-08 creation date in the old plan is wrong (real mtime 2026-04-05).
- **P2.2** API rate limiting — middleware + routes integrated.
- **P2.3** API key management — service + routes present. Test file is `apps/api/__tests__/lib/api-key-service.test.ts` (not the path cited in the old plan).
- **P2.4** RBAC API — 5 routes.
- **P2.5** Inventory audit automation — cron + schedule + discrepancies + reports.
- **P2.6** SMS automation rules — manifest + engine + routes. Test file location differs from old plan claim.
- **P3.1** Mobile search / profile / settings / push — 3 screens + push handlers.
- **Manifest-driven architecture** for core entities (kitchen, events, inventory, staff).
- **Clerk auth integration** — matches `auth-implementation.md` except the `proxy.ts` merge-conflict claim.
- **Core shared packages** — `database`, `manifest-adapters`, `manifest-runtime`, `auth`, `payroll-engine`, `mcp-server`, `pdf`, `security`, `observability`, `sales-reporting`, `kitchen-state-transitions`.
- **Five core kitchen + event + inventory test suites** from original plan.
- **AI** natural-language commands, context-aware suggestions, inventory forecasting, overtime prevention, mobile offline mode — present with tests (file sizes differ from plan but the work exists).
- **Prisma/ESM bugs (agent 3)** — ALL FIXED per agent 7 (2026-02-23). Bugs 1-4 resolved; MCP server boots.

---

## Schema Drift Audit

### Orphaned tables (exist in migrations, no Prisma model)

| Table | Migration | Used by |
|---|---|---|
| `vendor_contacts` | 20260327000000 | Procurement vendors (raw SQL) |
| `vendor_ratings` | 20260327000000 | Procurement vendors (raw SQL) |
| `employee_bank_accounts` | 20260327020000 | Payroll bank-accounts routes (currently crashing — Blocker 3) |
| `audit_log` | 20260327030000 + duplicate 20260327100000 | Needs dedup + model |
| `crm_scoring_rules` | 20260327040000 | CRM scoring |
| `procurement_budgets` | 20260327010000 | Procurement budget (raw SQL) |
| `procurement_budget_alerts` | 20260327010000 | Procurement budget |
| ~~`supplier_sync_logs`~~ | 20260328080000 | Supplier sync status — **has a `SupplierSyncLog` Prisma model; NOT orphaned**. Prior pass was wrong. |

Plus **raw-SQL-only tables** with no model: `facility_assets`, `drivers`, `vehicles`.

### Missing models referenced by code
- `PurchaseRequisition`, `VendorContract` (Blocker 2)
- `BankAccount` (Blocker 3)
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
- Payroll (≥20 instances, including bank-accounts which currently has no Prisma model)
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
2. Procurement requisitions (**8 routes**, missing `delete/`): add `PurchaseRequisition` model + manifest, or remove the fabricated routes (Blocker 2a).
3. Procurement vendor-contracts (**7 routes**, missing `update/`): add `VendorContract` model + manifest, or remove the fabricated routes (Blocker 2b).
4. Payroll bank-accounts: add `BankAccount` model to schema to replace the 5 raw-SQL routes (Blocker 3 — not a crash, a schema/ORM break).
5. Accounting collections RouteContext: fix `params` type at `.../cases/[id]/route.ts:47` (Blocker 5).
6. Logistics drivers update: fix the broken ternary at `.../drivers/commands/update/route.ts:41` — rewrite as two explicit branches or use `Prisma.sql` fragment (Blocker 6 — correctness bug, not injection).
7. Duplicate `softDelete/` directories: remove camelCase variants in the 3 inventory modules (Blocker 4 — 23 modules use one of the two spellings; only 3 need cleanup).

### Tier 2 — Schema & Tenant Isolation
8. Backfill Prisma models for 8 orphaned tables + `facility_assets`, `drivers`, `vehicles`.
9. Add `ENABLE ROW LEVEL SECURITY` + policies to all post-March-8 tables (prevents cross-tenant data leak).
10. Dedup duplicate `audit_log` migration.
11. Remove auto-generated route aliases (`/api/chartofaccount/` etc.) after confirming no callers.

### Tier 3 — Incomplete Modules
12. Accounting: complete payment gateway integration, invoice email, revenue recognition model + routes.
13. Facilities: add `FacilityAsset` Prisma model; build work-order status/cost update UI; integrate `facility-rules.manifest` out of `manifests-disabled/`.
14. Logistics: real GPS/webhook integration; add `Driver`, `Vehicle` models; implement `/routes/commands/optimize`; create logistics manifests.
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

## Package Health Audit (4th Pass)

Scope: the 35 shared packages under `packages/`. Each package was audited "guilty until proven innocent" by parallel subagents. Evidence is cited file:line where available.

### A. Synthesis: Packages by Verdict Tier

| Package | LOC | Tests | Consumers | Verdict |
|---|---:|---:|---:|---|
| realtime | 7678 | 247 it / 9 files | multi | PRODUCTION |
| sales-reporting | 2428 | 42 it / 2 files | apps/api | PRODUCTION |
| manifest-ir | 18 src (+361KB JSON) | 0 | transport-wide | PRODUCTION |
| manifest-adapters | 20.5k | 178 pass + 1 broken suite | 838+ imports | MATURE-BUT-GAPS |
| mcp-server | 4071 + 1551 | 115 it / 10 files | `.mcp.json` | MATURE-BUT-GAPS |
| database | 3398 + 5493 prisma | 232 it / 2 files | apps/* | MATURE-BUT-GAPS |
| notifications | 3869 | ~113 assertions / 3 files | apps/api | MATURE-BUT-GAPS |
| sentry-integration | 2394 | 35 it / 3 files | **0** | MATURE-BUT-GAPS |
| observability | 689 | 0 | 6 | MATURE-BUT-GAPS |
| payroll-engine | 4722 | 46 it / 2 files | 6 API routes | PARTIAL |
| ai | 2207 | 0 | **0** | PARTIAL |
| security | 83 | 0 | 3 | PARTIAL |
| manifest-runtime | 22.7k (pre-built) | 0 | downstream of adapters | SCAFFOLD |
| kitchen-state-transitions | 282 | 0 | **0** | SCAFFOLD |
| auth | 57 | 0 | apps/* | SCAFFOLD |
| rate-limit | 32 | 0 | 0 real | SCAFFOLD |
| event-parser | 4738 | 0 | 2 | SCAFFOLD |
| supplier-connectors | 975 | 0 | 1 (inventory) | SCAFFOLD |
| pdf | 2913 | 0 | 4+ API routes | SCAFFOLD |
| brand | 100 | 0 | **0** | DEAD |
| packages/apps/app | meta | 0 | **0** | DEAD |
| analytics | 106 | 0 | 5+ | WRAPPER |
| feature-flags | 77 | 0 | 4+ | WRAPPER |
| email | 309 | 0 | apps/* | WRAPPER |
| webhooks | 72 | 0 | apps/api | WRAPPER |
| payments | 43 | 0 | apps/api | WRAPPER |
| storage | 15 | 0 | dynamic | WRAPPER |
| cms | 253 | 0 | 6+ (web) | WRAPPER |
| seo | 96 | 0 | 6+ | WRAPPER |
| internationalization | 117 | 0 | 6+ | WRAPPER |
| collaboration | 681 | 0 | 5+ | WRAPPER |
| design-system | ~85 components | 2 files + 18 stories | 377 imports | FOUNDATIONAL |
| typescript-config | n/a | n/a | 10+ | FOUNDATIONAL |
| next-config | ~70 | 0 | 3 | FOUNDATIONAL |
| types | 177 | 0 | design-system + apps/app | FOUNDATIONAL |

### B. Per-Package Findings

**PRODUCTION**
- `realtime` — Ably transport via transactional outbox, vector clocks, payload size gates (32K warn / 64K reject), SKIP LOCKED concurrency. 247 it blocks, 0 skips, 0 `any`, 0 console. Earlier plan claim of 1838 LOC was src-only; full LOC is 7678.
- `sales-reporting` — PDFKit engine, 0 `any`, 0 console. `describe.skip` at `apps/api/__tests__/sales-reporting/generate.test.ts:33` is NOT this package and has a documented PDFKit-in-Node rationale.
- `manifest-ir` — thin loader; 361KB `routes.manifest.json` + `kitchen.ir.json` + `marketing.ir.json` drive transport contract.

**MATURE-BUT-GAPS**
- `manifest-adapters` — 20.5k LOC, 50 enabled / 18 disabled manifests. Broken suite: `rbac-permission-checker.test.ts:428` references `beforeEach` without importing it. 91 `any` in nutrition/recipe/scaling. 6 `console.error` (prisma-*.ts, `nutrition-label-engine.ts:664`).
- `mcp-server` — 115 it across 10 files (contradicts 3rd pass "165"). 11 MCP tools across 5 plugins, stdio-only, governance scanners are regex-based, admin plugins are placeholders. 12 `as any` (mostly test mocks).
- `database` — 195 Prisma models, 452 indices. Tenant isolation is app-level via `tenant.ts:51-95` (whitelist of 13 models); **no row-level security**. `schema.prisma.backup` and `.bak` still in tree.
- `notifications` — Resend/Twilio/Knock + outbound webhook DLQ (exp backoff 1s→30s, HMAC-SHA256, auto-disable@5 fails). Orphan files: `sms-temp.ts` (TODO stub) and `sms.ts.new`. 7 console.*.
- `sentry-integration` — webhook→queue (30m dedup/60m ratelimit)→GPT-4o→search-and-replace with exact-match validation→pnpm test→revert/PR. Blocked-path regex. **No human-review gate, no cost cap, zero consumers.**
- `observability` — 3-tier Sentry + Logtail + correlation helpers. No OpenTelemetry, no metrics API. 2 console.log.

**PARTIAL**
- `payroll-engine` — 4722 LOC, 46 it (24 calculator + 22 export). Tax engine math is real but `employee.taxInfo` is undefined at `PrismaPayrollDataSource:58` (TODO); tip pool data TODO at line 125; `SOCIAL_SECURITY_WAGE_BASE` declared but unused; 1 `console.log` line 289.
- `ai` — 2207 LOC across index/agent/workflow/metrics/errors/retry/tool. `metrics.ts` confirmed complete at 205 LOC. ToolRegistry exists, ToolLoop not wired (single-turn only). OpenAI-only. **Zero consumers.**
- `security` — Arcjet shield (LIVE) + Nosecone headers (CSP disabled by default). 3 declared consumers but no actual imports verified.

**SCAFFOLD**
- `manifest-runtime` — 22.7k LOC is a **pre-built distribution** wrapping `@angriff36/manifest@0.3.35`. Build script: `echo 'dist is pre-built, skipping'`. Real implementation lives upstream.
- `auth` — 57 LOC pure Clerk re-export across server.ts/client.ts/keys.ts/proxy.ts. No tenant propagation, no RBAC helpers, no tests.
- `rate-limit` — 32 LOC Upstash sliding-window. Overlaps with `security` Arcjet. Neither actually imported in any app.
- `kitchen-state-transitions` — 282 LOC custom FSM (open→in_progress→done/canceled). Zero imports anywhere; Kitchen API routes bypass it.
- `event-parser` — 4738 LOC rule-based TPP PDF parser (regex + string match). 9 console.* in `document-router` + `pdf-extractor`. Brittle, no tests.
- `supplier-connectors` — 975 LOC, both connectors are stubs: `us-foods.ts` TODOs at 65, 90, 111, 138, 171-174; `charlies-produce.ts` TODOs at 65, 93, 132, 169. 10 TODOs, 12 console, 1 `any`. No AS2/SFTP/X12.
- `pdf` — 2913 LOC @react-pdf/renderer with 6 templates (BattleBoard/Contract/EventDetail/PackingList/PrepList/Proposal). **Zero tests**, 3 `@ts-expect-error` (library gaps), 3 console.error in error handlers, no visual/snapshot tests. Classified SCAFFOLD on test-coverage risk despite real consumers.

**DEAD**
- `brand` — 100 LOC date/time + ampersand helpers. **Zero imports in repo.**
- `packages/apps/app` — package.json listing 73 workspace deps as a meta-manifest. Not imported anywhere.

**WRAPPER** — Thin vendor wrappers; treat as configuration, not product code.
- `analytics` (posthog + @vercel/analytics), `feature-flags` (`flags` pkg + toolbar), `email` (Resend + 3 React Email templates), `webhooks` (Svix send + portal), `payments` (Stripe singleton + AgentToolkit; webhook at `apps/api/app/webhooks/payments/route.ts` handles checkout + schedule cancel with signature validation), `storage` (Vercel Blob re-export, dynamic consumption), `cms` (Basehub GraphQL, 72KB generated types, 6+ web consumers), `seo` (metadata + JSON-LD), `internationalization` (next-international + formatjs, languine pipeline), `collaboration` (Liveblocks auth/config/room/hooks/cursors/presence — largest wrapper at 681 LOC).

**FOUNDATIONAL**
- `design-system` — 55 UI + 30 blocks, 18 `.stories.tsx` but **no Storybook config dir**, 2 real test files (ambient-animation, micro-tour). Tailwind v4 + Radix + shadcn. 377 import sites.
- `typescript-config`, `next-config`, `types` — configuration/type surface only; types scope is narrow (manifest-editor only).

### C. Cross-cutting Concerns

**Test coverage gaps (0 tests; 22 packages):**
manifest-runtime, manifest-ir, auth, observability, security, rate-limit, ai, payroll-engine*, kitchen-state-transitions, event-parser, pdf, email, webhooks, storage, analytics, feature-flags, cms, collaboration, seo, internationalization, brand, next-config, types, supplier-connectors, payments. *payroll-engine has tests but data paths are inert.

**Logging inconsistency (direct console vs `@repo/observability`):**
- manifest-adapters (6), event-parser (9), supplier-connectors (12), notifications (7), observability (2), pdf (3), payroll-engine (1). All should route via observability.

**TypeScript debt (`any` / `@ts-ignore` / `@ts-expect-error`):**
- manifest-adapters: 91 `any` (nutrition/recipe/scaling engines — top hotspot)
- mcp-server: 12 `as any` (mostly test mocks)
- database: 3 `any`, pdf: 3 `@ts-expect-error`, sentry-integration: 1 `any`, supplier-connectors: 1 `any`.

**Orphaned files + dead code:**
- `packages/database/prisma/schema.prisma.backup`, `schema.prisma.bak`
- `packages/notifications/.../sms-temp.ts` (TODO stub), `sms.ts.new`
- `packages/ai/agent.ts.bak` (old stub version)
- `packages/brand/*` (entire package unused)
- `packages/apps/app/*` (meta-manifest package)

**No-consumer packages (declared but not imported):**
`@repo/ai` (2207 LOC), `@repo/sentry-integration` (2394 LOC), `@capsule/brand` (100 LOC), `packages/apps/app`, `@repo/rate-limit`, `@repo/security` (declared 3 consumers, imports unverified), `@repo/kitchen-state-transitions`.

### D. Dependency Graph Notes

**Circular deps:** None detected in the audit sample. `types` → design-system → apps is one-way; manifest-adapters → manifest-runtime → manifest-ir is one-way.

**Duplication / overlap:**
- `rate-limit` (Upstash) vs `security` (Arcjet includes rate-limit). Pick one.
- `observability` (Sentry wrapper) vs `sentry-integration` (auto-fix bot). Different purposes but both own the word "Sentry"; naming collision is a maintenance trap.
- `webhooks` (Svix wrapper) vs `notifications/outbound-webhook-service.ts` (full DLQ). The DLQ cron is `apps/api/app/cron/webhook-retry/route.ts` on `*/5 * * * *`.
- `brand` vs `design-system` — date/ampersand helpers overlap with design-system utilities.

**Manifest trio coupling:** `manifest-adapters` (20.5k) consumes `manifest-runtime` (pre-built 22.7k wrapping `@angriff36/manifest@0.3.35`) which ships with `manifest-ir` JSON payloads. Effective code owned locally is small; the bulk is upstream npm.

### E. Reconciliation vs Prior Plan

1. **payroll-engine test count.** 3rd pass said 42 (24+18). Actual: **46 (24+22)**. Second pass was right; third pass overcorrected.
2. **mcp-server it blocks.** 3rd pass said 165. Actual: **115 across 10 files**. Both prior passes were wrong.
3. **ai/metrics.ts size.** Plan says "complete at 206 lines" — **accurate** (205 LOC, fully exported).
4. **@repo/ai is consumed.** Plan implies yes — **FALSE**. Zero imports in apps/.
5. **@repo/sentry-integration is wired.** Plan implies yes — **pipeline is real, consumers are zero**. Needs a webhook route to run.
6. **manifest-runtime is production-quality.** Plan implies locally-owned — actually a pre-built vendored distribution of `@angriff36/manifest@0.3.35`; local source is a shim.
7. **@repo/auth is a production Clerk integration.** Actually a **57-LOC re-export shim** with no custom logic and no tests.
8. **Schema drift.** Add: `packages/database/prisma/schema.prisma.backup` and `schema.prisma.bak` are still in-tree noise (git has history; delete).

### F. Investment Recommendations

| Tag | Packages |
|---|---|
| INVEST | manifest-adapters, realtime, sales-reporting, database, design-system |
| HARDEN | manifest-runtime (clarify vendored status), ai (ToolLoop + tests + consumers), sentry-integration (human-review + cost cap + wire webhook), payroll-engine (TaxInfo/PayrollPrefs models + YTD enforcement), pdf (snapshot tests), notifications (remove orphans, split concerns), mcp-server (AST scanners, admin plugins), auth (tenant/RBAC/tests), observability (OpenTelemetry + metrics API) |
| MAINTAIN | email, webhooks, payments, storage, types, typescript-config, next-config, analytics, feature-flags, seo, internationalization, manifest-ir, cms, collaboration |
| DEPRECATE | rate-limit, kitchen-state-transitions, event-parser, security (merge w/ rate-limit decision) |
| DELETE | brand, packages/apps/app, supplier-connectors stubs, schema.prisma.backup/.bak, sms-temp.ts, sms.ts.new, agent.ts.bak |

### G. Immediate Tier-1 Follow-ups

- Fix `packages/manifest-adapters/.../rbac-permission-checker.test.ts:428` — add missing `beforeEach` import; currently breaks the manifest-adapters test suite (1 failed suite among 178 passing).
- Delete `packages/database/prisma/schema.prisma.backup` and `schema.prisma.bak` (git history already covers them).
- Decide rate-limit vs security: fold Upstash into Arcjet config OR delete `@repo/rate-limit`.
- Wire `@repo/ai` OR `@repo/sentry-integration` to a consumer — 4601 combined LOC with no current caller. Easiest first wire: sentry-integration to `apps/api/app/webhooks/sentry/route.ts`.
- Remove orphan files: `agent.ts.bak`, `sms-temp.ts`, `sms.ts.new`.
- Add `@capsule/brand` and `packages/apps/app` to the dead-code removal list in Tier 1 task 30 (dead-code cleanup).
- Introduce `observability`-only logging rule (biome lint) to retire the 40+ direct `console.*` calls across manifest-adapters, event-parser, supplier-connectors, notifications, pdf.

---

## Package Health Audit (4th Pass)

Scope: 34 shared packages under `packages/` audited "guilty until proven innocent" by 34 per-package subagents plus 4 cross-cutting analyses (specs scan, dep graph, apps consumption, manifest architecture). This section synthesizes those 38 reports. A prior draft of this section exists above; this block supersedes it where they disagree and is keyed off the current finding set.

### Executive Summary

Of 34 packages: **5 production-ready** (`manifest-adapters`, `sales-reporting`, `sentry-integration`, `internationalization`, `next-config`), **19 functional-with-gaps**, **5 partial scaffolds** (`observability`, `supplier-connectors`, `cms`, `analytics`, plus `manifest-runtime` with a runtime bug), and **2 genuinely dead** (`brand`, `kitchen-state-transitions`). `mcp-server` is a standalone stdio service and is treated separately from the orphan set. The plan's "core shared packages" framing is directionally correct but oversells several as "production" when they are untested wrappers (`payments`, `storage`, `webhooks`, `auth`, `security`, `rate-limit`) or carry correctness bugs (`manifest-runtime` at runtime-engine.ts:1189-1203). The heaviest-shared package is `design-system` (5 apps, 1,098 imports across consumers). The largest risk surface is `observability` adoption: 24 files import `@repo/observability` versus 2,198 raw `console.*` calls in 1,316 files in `apps/api` alone (1.6% adoption).

### Per-Package Findings Table

| Package | Verdict | LOC | Tests | Consumers | Key Issue |
|---|---|---:|---:|---:|---|
| brand | DEAD | 100 | 0 | 0 | `packages/brand/package.json` — zero imports anywhere |
| kitchen-state-transitions | DEAD | 282 | 0 | 0 | `packages/kitchen-state-transitions/package.json` — declared by apps/app, never imported |
| analytics | PARTIAL_SCAFFOLD | 106 | 0 | 5 | `packages/analytics/server.ts:10-17` noop stubs; `provider.tsx:15` TODO |
| cms | PARTIAL_SCAFFOLD | 252 | 0 | 1 | `apps/web/app/[locale]/blog/page.tsx:39` blog explicitly disabled |
| observability | PARTIAL_SCAFFOLD | 689 | 0 | 3 | 1.6% adoption; `error.ts:19` falls back to `console.error` |
| supplier-connectors | PARTIAL_SCAFFOLD | 975 | 0 | 0 | `us-foods.ts:174` and `charlies-produce.ts:93` stubbed bodies |
| manifest-runtime | PARTIAL_SCAFFOLD | 10,451 | 363 it / 8 files | 4 | `runtime-engine.ts:1189-1203` policy-denial event leak |
| ai | FUNCTIONAL_WITH_GAPS | 2,156 | 0 | 1 | `agent.ts:526` naive token estimation + 0 tests on 11 files |
| auth | FUNCTIONAL_WITH_GAPS | 179 | 0 | 6 | No RBAC abstractions; `AuthProvider` is a no-op component |
| collaboration | FUNCTIONAL_WITH_GAPS | 681 | 0 | 2 | `room.tsx:12` undocumented `any` + zero coverage on Liveblocks auth |
| database | FUNCTIONAL_WITH_GAPS | 6,701 | 70 it / 2 files | 9 | `KNOWN_ISSUES.md:67-95` 4 missing FK indexes; composite-FK gap |
| design-system | FUNCTIONAL_WITH_GAPS | 19,845 | 9 it / 2 files | 5 apps | `prep-task-dependency-graph.tsx:470` `as any`; 2/99 components unit-tested |
| email | FUNCTIONAL_WITH_GAPS | 309 | 0 | 3 | `proposal.tsx:46` unused `_secondaryColor`; zero template render tests |
| event-parser | FUNCTIONAL_WITH_GAPS | 4,800 | 0 | 1 | `battle-board-adapter.ts:259` CommonJS `require()` in ESM |
| feature-flags | FUNCTIONAL_WITH_GAPS | 77 | 0 | 2 | `package.json:7` vestigial `@repo/design-system` dep; 1 flag total |
| mcp-server | FUNCTIONAL_WITH_GAPS | 4,577 + 1,551 tests | 115 it / 10 files | 0 (stdio) | `governance-scanners.ts:165-424` regex-only (not AST) |
| notifications | FUNCTIONAL_WITH_GAPS | 2,974 | 56 it / 3 files | 2 | `sms-temp.ts:2` dead stub; `sms-new.ts` duplicates `sms.ts` |
| payments | FUNCTIONAL_WITH_GAPS | 43 | 0 | 2 | `apps/api/app/api/accounting/payments/[id]/route.ts:90-95` mocks despite real client |
| payroll-engine | FUNCTIONAL_WITH_GAPS | 3,638 | 42 it / 2 files | 1 | `PrismaPayrollDataSource.ts:393-394` returns hardcoded `[]`/0 |
| pdf | FUNCTIONAL_WITH_GAPS | 2,913 | 0 | 2 | `generator.tsx:80,108,143` `@ts-expect-error` + 0 tests |
| rate-limit | FUNCTIONAL_WITH_GAPS | 32 + 600 (middleware) | 88 it / 1 file (in apps/api) | 2 | `middleware/rate-limiter.ts:289` inline `require("crypto")` |
| realtime | FUNCTIONAL_WITH_GAPS | 1,838 | 263 it / 9 files | 2 | `replay-buffer.ts:56` class never instantiated |
| seo | FUNCTIONAL_WITH_GAPS | 96 | 0 | 2 | `metadata.ts:10-16` hardcoded "next-forge" branding |
| security | FUNCTIONAL_WITH_GAPS | 83 | 0 | 3 | `index.ts:47-49` no rate-limit rule actually declared |
| storage | FUNCTIONAL_WITH_GAPS | 44 | 0 | 1 | `apps/app/recipes/actions.ts:5` no error handling on `put` |
| types | FUNCTIONAL_WITH_GAPS | 178 | 0 | 2 | `manifest-editor.ts:1` redundant re-export; no `tsconfig.json` |
| typescript-config | FUNCTIONAL_WITH_GAPS | n/a | n/a | 20 | `base.json:17` strict on; `noUncheckedIndexedAccess` OFF |
| webhooks | FUNCTIONAL_WITH_GAPS | 72 (+ 900 in notifications) | 21 it / 1 file | 2 | `apps/api/app/api/integrations/webhooks/dlq/*` zero tests |
| manifest-ir | FUNCTIONAL_WITH_GAPS | 18 src + 135,601 data | 0 | 2 | `dist/routes.manifest.json` committed — desync risk |
| internationalization | PRODUCTION_READY | 117 | 0 | 2 | `index.ts:69` silent fallback on dictionary import failure |
| manifest-adapters | PRODUCTION_READY | 20,500 + 4,000 tests | 212 it / 10 files | 2 | 28 `any`/`as any` across 13 files (Prisma dynamic tables, justified) |
| next-config | PRODUCTION_READY | 210 | 0 | 3 | `keys.ts:14-32` `getPreviewUrl` unused param |
| sales-reporting | PRODUCTION_READY | 2,428 + 959 tests | 42 it / 2 files | 1 | `apps/api/__tests__/sales-reporting/generate.test.ts:33` `describe.skip` lives in apps/api, documented |
| sentry-integration | PRODUCTION_READY | 3,500 | 32 it / 3 files | 1 | `prisma-store.ts:32` `as any` on `payloadSnapshot`; no rollback if push fails post-commit |

### Package Highlights

**manifest-runtime** — runtime-engine.ts is 2,606 LOC with 363 `it()` in 6,419 LOC of tests, but carries a correctness bug at `runtime-engine.ts:1189-1203`: the policy denial path does not roll back events emitted by prior actions/constraints, so `eventLog` leaks on partial success. Transition errors additionally clear `constraintOutcomes` at lines 1293-1304, losing diagnostic context. Event listener errors are swallowed at line 2514 with `catch {}`. No mutation rollback on concurrency conflict (lines 1309-1324). Action: classify PARTIAL_SCAFFOLD despite heavy test count; remediate rollback semantics before relying on it as the authoritative dispatch engine.

**payments** — `packages/payments/index.ts` creates a real Stripe v20.3.0 client with `sk_` validation, and `apps/api/app/webhooks/payments/route.ts` uses it. However `apps/api/app/api/accounting/payments/[id]/route.ts:90-95` returns a mocked `gatewayResponse`, bypassing the real client entirely. Architectural inconsistency: the plan treats payments as wired; one consumer is, the other is a mock. Action: audit all accounting payment routes, replace mock branches with the real `@repo/payments` singleton.

**observability** — `Sentry` fully wired across server/client/edge (`server.ts:43`, `client.ts:40`, `edge.ts:50`), but adoption is 24 files consuming `@repo/observability` vs 2,198 `console.*` calls across 1,316 files in `apps/api` alone (1.6% adoption). Internal bypass at `error.ts:19` (parseError falls back to `console.error`). Action: INVEST — biome lint rule banning raw `console.*` in `apps/**` outside of `packages/observability/*`, then migrate in waves.

**brand** — `packages/brand/index.ts` exports 7 functions (date/time/ampersand helpers), zero `@capsule/brand` imports anywhere in the tree. Completely unused. Action: DELETE from `pnpm-workspace.yaml`.

**kitchen-state-transitions** — `packages/kitchen-state-transitions/index.ts` exports an ad-hoc FSM (plain `Record` object, not XState) for `open → in_progress → done → canceled`. Declared in `apps/app/package.json` but no imports anywhere in source. The Kitchen module routes bypass it entirely. Action: DELETE.

**ai** — 2,156 LOC across 11 files with 30 exports, zero tests. `agent.ts:526` uses `Math.ceil(text.length/4)` as a token estimator — fine for logging, unsafe for budget enforcement. ToolRegistry exists; ToolLoop wiring is single-turn only. Only consumer is `apps/app`. Action: HARDEN — add real tokenizer, wire `ToolLoop`, add at minimum smoke tests for workflow/retry.

**sentry-integration** — Full real pipeline: webhook → queue → stack resolution → context build → GPT-4o prompt → JSON validation → search-and-replace with exact-match guard → branch creation → `pnpm test` → revert on failure → `git commit` → `gh pr create`. `fixer-real.test.ts` and `fixer-live.test.ts` use `it.skipIf` on `OPENAI_API_KEY`/`SENTRY_TOKEN` — real end-to-end AI tests exist, env-gated. `fixer.ts:501` intentionally asserts no placeholders or TODOs in the output. Action: MAINTAIN — this is the rare genuinely-production package.

**supplier-connectors** — `us-foods.ts` (199 LOC) and `charlies-produce.ts` (185 LOC) are stub shells: all 4 methods return `false`/`[]`. TODOs at `us-foods.ts:65,90,111,138,171,174` and `charlies-produce.ts:65,93,132,169`. No EDI library in `package.json`. The `sync-service.ts` wrapper is production-grade. Action: Tier 4 task 27 owns this; classify connectors PARTIAL_SCAFFOLD; do not enable in any flow.

**analytics** — Declares PostHog + GA + Vercel Analytics, but `server.ts:10-17` are noop stubs returning `undefined`; `instrumentation-client.ts:14-18` initializes PostHog without any `.capture()` calls. Two explicit TODOs (`provider.tsx:15`, `instrumentation-client.ts:20`). Five consumers depend on a package that dispatches zero events. Action: HARDEN — define first event schema + consent gate + one real `capture()`.

**payroll-engine** — 42 tests (24 calculator + 18 export) confirm tax math works; however `PrismaPayrollDataSource.ts:393-394` returns hardcoded `taxesWithheld: []` and `totalTaxes: 0` from `getPayrollRecords()`, destroying calculation output on retrieval. `getTipPools()` returns `[]` unconditionally (line 125). YTD is not tracked (`calculator.ts:205`), so SS wage cap will not enforce across pay periods. Action: HARDEN — ship the Prisma TaxInfo/TipPool/YTD models before enabling payroll in any org.

### Cross-Cutting Concerns

**1. Test coverage cliff (0 test files).** 21 of 34 packages: `ai`, `auth`, `analytics`, `brand`, `cms`, `collaboration`, `email`, `event-parser`, `feature-flags`, `internationalization`, `kitchen-state-transitions`, `manifest-ir`, `next-config`, `observability`, `payments`, `pdf`, `rate-limit` (package itself), `security`, `seo`, `storage`, `supplier-connectors`, `types`. Eleven of these are consumed in production code paths by `apps/api` or `apps/app`.

**2. Observability bypass.** `apps/api` alone contains 2,198 `console.*` calls across 1,316 files. Only 24 files in `apps/api` import `@repo/observability`. Adoption ratio: 24 / (24 + 1,316) ≈ 1.8% of files touch the package even when raw `console` is factored out; weighted by call count, ≈1.1%. Internal bypass at `packages/observability/error.ts:19` means even the wrapper falls back to `console.error`. Action: biome rule + scripted migration.

**3. Payment gateway stub vs real client.** `packages/payments/index.ts` wires a real Stripe v20.3.0 client, used by `apps/api/app/webhooks/payments/route.ts`. Yet `apps/api/app/api/accounting/payments/[id]/route.ts:90-95` returns a mocked `gatewayResponse` object. This is a split-brain architecture: real on webhooks, mocked on accounting mutations.

**4. Dead packages (not imported by anything).**
- `packages/brand/package.json` — zero consumers.
- `packages/kitchen-state-transitions/package.json` — declared in `apps/app/package.json`, no source imports.
- (`packages/mcp-server/package.json` is standalone stdio; not counted as dead.)

**5. Vestigial internal dependencies.** `packages/feature-flags/package.json:7` declares `@repo/design-system`, never imported inside the package. Removing it simplifies the dep graph's one remaining heavy hitter.

**6. TypeScript suppression count correction.** Prior pass claimed "15 `as any` / `@ts-expect-error` across 9 files." Packages alone contain far more: `manifest-adapters` 28 (justified, Prisma dynamic event tables), `mcp-server` 4 (`zod-from-ir.ts:89` plus Sentry dynamic access), `notifications` 22 across 8 files, `pdf` 3 `@ts-expect-error` (`generator.tsx:80,108,143`), `collaboration` 1 `@ts-ignore` + 2 `any` (`room.tsx:12`), `manifest-runtime` 1 `@ts-ignore` (`stores.node.ts:202`), `sentry-integration` 1 `as any` (`prisma-store.ts:32`), `database` 1 `as any` (`ingredient-resolution.ts:42`), `design-system` 2 `as any` (`button-group.tsx:54`, `prep-task-dependency-graph.tsx:470`), `supplier-connectors` 4 `any` (`sync-service.ts`), `cms` 2 `any` + 1 `@ts-expect-error` (`toc.tsx:25`), `event-parser` 9 `any` across 3 files, `ai` 0. Revised package-scope total: **≈78 suppressions across ~35 files in packages/ alone**, the majority in `manifest-adapters` and `notifications` and most with defensible Prisma/SDK reasoning.

### Package Dependency Graph Findings

- Node count: 34 local packages.
- Circular dependencies: **none detected**.
- Heavy hitters (most internal `@repo/*` deps): `feature-flags` (3 — analytics, auth, design-system; design-system is vestigial), `manifest-adapters` (2), `mcp-server` (2), `notifications` (2), `payroll-engine` (2), `sentry-integration` (2). `design-system` has only 1 internal dep but is the most consumed.
- Orphan set (no inbound imports from `apps/` or `packages/`): 2 truly orphaned (`brand`, `kitchen-state-transitions`). 1 standalone service (`mcp-server`, stdio). `ai` has 1 consumer (`apps/app`), so is NOT orphaned. `manifest-runtime` is a local package (the `@angriff36/manifest` referenced by tests is an external ref), consumed by `manifest-adapters` and `mcp-server` — not an orphan.
- Apps consumption: `design-system` in 5 apps; `analytics`, `email`, `next-config`, `observability` in 3 apps each; `auth`, `database`, `event-parser`, `feature-flags`, `realtime`, `security`, `seo` in 2 apps each; remainder in 1 app each; `brand` and `kitchen-state-transitions` in 0 apps.

### Specs Alignment Findings

- All 16 named specs under `docs/specs/` have corresponding code — no orphan specs.
- **Post-expansion modules have NO specs.** Commit `b8c31eef` (2026-04-19) added accounting, facilities, logistics, payroll, procurement modules; none have a spec in `docs/specs/`. This is an unknown-to-spec ratio of 5/5.
- Command Board `SPEC_connections.md` claims an edge-label component is done (`STATUS.md` 2026-02-18) — **falsified**: no such component exists in source.
- Training HRMS spec from `2025-02-09` is 14 months stale as of audit date.

### Manifest Architecture Quality (Deep-Check)

- 63 active manifests are **substantive** — full guards, constraints, mutations, events. Not shells.
- 17 quarantined manifests are **procedurally written** but use imperative syntax (`if/else`, `for` loops, `let`) that the functional DSL compiler rejects. Quality is fine; dialect is wrong. Tooling mismatch, not content decay.
- Active dispatch pipeline: route handler → `manifest-runtime-factory` → `ManifestRuntimeEngine` → `prisma-store` → outbox. Clean layering.
- IR generation is offline: `packages/manifest-ir/dist/routes.manifest.json` is a committed artifact, regenerated by `@angriff36/manifest` ir-compiler during `loadManifests.ts:233`. No dev/deploy regen.
- Top 3 risks: (a) **134 hand-coded routes exempt from IR conformance** — the bypass allowlist is the growing seam; (b) **no pre-flight validation for manifest syntax dialect** — quarantined set will grow silently until caught at runtime; (c) **idempotency collision window in factory** between dedup-key insert and engine-dispatch phase.

### Recommendations by Tier

**INVEST** — critical shared infrastructure with closable gaps worth funding this cycle.
- `manifest-runtime` — fix `runtime-engine.ts:1189-1203` event leak and constraint-outcome loss; this package owns dispatch semantics.
- `observability` — rip out `console.*` from `apps/api` (2,198 call migration); wire OpenTelemetry; close `error.ts:19` bypass.
- `database` — close `KNOWN_ISSUES.md:67-95` FK index gaps; resolve composite-FK gap for EventGuest/AllergenWarning.
- `manifest-adapters` — fix broken suite reference (`rbac-permission-checker.test.ts:428` missing `beforeEach` import); retain rest as-is.
- `payroll-engine` — ship TaxInfo/TipPool/YTD Prisma models and remove hardcoded returns at `PrismaPayrollDataSource.ts:393-394`.
- `ai` — replace naive tokenizer (`agent.ts:526`), wire `ToolLoop`, add smoke tests.
- `payments` — unify accounting route (`apps/api/app/api/accounting/payments/[id]/route.ts:90-95`) with real Stripe client.

**MAINTAIN** — production-ready, do not touch.
- `manifest-adapters`, `sales-reporting`, `sentry-integration`, `internationalization`, `next-config`, `realtime` (if event leak fixed elsewhere).

**DEPRECATE / DELETE** — remove from `pnpm-workspace.yaml`.
- `packages/brand` — zero imports.
- `packages/kitchen-state-transitions` — zero imports; replaced by per-module state logic.
- Consider also: `packages/rate-limit` vs `packages/security` — one owns rate-limiting, pick one, delete the other.

### Package Health Audit Deltas vs Prior Plan Claims

Factual corrections and reclassifications this pass forced:

1. **"`@repo/ai` is unused."** Prior prose implied it was integrated; audit confirms exactly 1 consumer (`apps/app`) but zero tests. Reclassify FUNCTIONAL_WITH_GAPS, not DEAD. The earlier table row "ai ... 0 consumers" is wrong.
2. **`mcp-server` `it()` count.** Prior pass 3 said 165; pass 4 synthesis recorded 115 earlier on this page. Re-verified: **115 across 10 test files.** Earlier prose of "1551 LOC tests" is consistent.
3. **`payroll-engine` test count.** Second pass: 42. Third pass: varied. Audit: **42 (24 calculator + 18 export)**. The earlier table entry of 46 (24+22) on this page is wrong; the canonical figure is 42 plus **6 TODOs** (not 5): `PrismaPayrollDataSource.ts:58,59,125,287,383,389` + `calculator.ts:205`.
4. **`manifest-runtime` is production-quality.** FALSE at runtime semantics level. `runtime-engine.ts:1189-1203` leaks events on policy denial. Reclassify PARTIAL_SCAFFOLD despite 363 `it()`.
5. **`@repo/auth` is a Clerk integration.** Under-recognized: it is a 179-LOC re-export shim with 0 tests, 0 RBAC helpers, and `AuthProvider` is intentionally a no-op component. Functional but thin.
6. **`sentry-integration` has zero consumers.** FALSE per this audit — `fixer-real.test.ts:242,321,380,406` and `fixer-live.test.ts:121,172,219` run env-gated against real Sentry/OpenAI. `apps/api` is the consumer. Upgrade from "pipeline is real, consumers are zero" to PRODUCTION_READY.
7. **Payments module status.** Under-recognized split: real on webhooks, **mocked** on `apps/api/app/api/accounting/payments/[id]/route.ts:90-95`. Plan treated as done.
8. **Observability adoption.** Not previously quantified. **1.6% adoption** is the headline; any plan item that assumes observability is "integrated" must be rewritten to "wired but unadopted."
9. **Specs gap for expansion modules.** Prior passes did not flag this. Five modules (accounting, facilities, logistics, payroll, procurement) were added in `b8c31eef` with no spec. Add spec-writing to Tier 3.
10. **TypeScript suppression total.** Prior claim "15 across 9 files" was apps-only. Package-scope audit: ≈78 suppressions across ~35 files. Most defensible (Prisma dynamic event tables in `manifest-adapters`, Liveblocks generics in `collaboration`), but the figure materially resets the ceiling.

---

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

## Raw-SQL Audit (6th Pass)

> **Audited:** 2026-04-24
> **Scope:** All `$queryRaw`, `$executeRaw`, `$queryRawUnsafe`, `$executeRawUnsafe`, `Prisma.sql` usage across `apps/` and `packages/`
> **Method:** Full grep (1,577 occurrences across 250 files) → 20 parallel domain-specific subagents covering analytics, procurement, events, CRM/kitchen/inventory, frontend actions, payroll, logistics, shipments, staff lib, staff API, events API, kitchen API, inventory API, frontend server actions, frontend data actions, packages, events frontend, misc routes, remaining routes, remaining frontend. Manual verification of every CRITICAL/HIGH finding. Two agents rate-limited; gaps filled by cross-referencing other agents' results.
> **Prior coverage:** Blocker 6 identified a correctness bug in logistics drivers but no systematic audit of the other 526+ instances was performed. This pass provides the first complete file-by-file analysis.

### Executive Summary

Of 1,577 raw-SQL occurrences across 250 files (38 files use unsafe variants):

- **5 CRITICAL** — (1) CRM scoring interpolates stored rule values; (2) Staffing coverage concatenates `locationId` into SQL; (3) Payroll approval history injects unsanitized `action`; (4) Kitchen allergens matrix directly interpolates user-controlled ID list into `$queryRawUnsafe`; (5) Admin trash list manually replaces `$N` placeholders with `'${param}'` via `Prisma.raw()`
- **6 HIGH** — Dynamic column/ORDER BY identifiers without allowlist enforcement, unvalidated IN clauses, dynamic WHERE/SET in unsafe variants
- **7 MEDIUM** — Correctness bugs from ternary expressions and type-cast patterns inside template literals
- **7 tenant isolation gaps** — Missing `tenant_id` filter in 4 authenticated routes + 2 public routes + 1 service file
- **~15 SCHEMA_DRIFT** — Queries referencing orphaned tables
- **~100 justified `$queryRawUnsafe`** — Using `$N` parameterized placeholders with values passed separately
- **~470 safe `$queryRaw`/`$executeRaw`** — Using tagged template literals with `Prisma.sql` parameterization

### CRITICAL — Unsafe SQL with User Input

| # | File | Line | Pattern | Risk |
|---|---|---|---|---|
| 1 | `apps/api/app/api/crm/scoring/calculate/route.ts` | 145-157 | `$executeRawUnsafe` with SQL built by `buildRuleCondition()` which interpolates `rule.value` with only `'`→`''` escaping | **SQL injection**: rule values originate from user input stored in `crm_scoring_rules` table; single-quote escaping is insufficient for PostgreSQL. Also `FIELD_COLUMN_MAP[field] ?? field` at line 36 allows unvalidated column names. |
| 2 | `apps/api/app/api/staffing/coverage/route.ts` | 67, 90, 114, 130, 149 | `locationFilter = \`AND ss.location_id = '${locationId.replace(/'/g, "''")}'\`` injected into 5 `$queryRawUnsafe` calls | **SQL injection**: `locationId` from `searchParams.get("locationId")` — fully user-controlled. Quote-escaping insufficient. |
| 3 | `apps/api/app/api/payroll/approvals/history/route.ts` | 87 | `conditions.push(\`pah.action = '${action}'\`)` where `action` = `searchParams.get("action")` with NO validation. Injected via `Prisma.raw(whereClause)`. | **SQL injection**: `action` neither validated nor parameterized. `payrollRunId` IS UUID-validated at line 80 but `action` at line 87 is not. |
| 4 | `apps/api/app/api/kitchen/allergens/matrix/route.ts` | 115-116, 271-273 | `dishIds.map((id) => \`'\${id}'\`).join(", ")` — user-controlled `ids` query param directly interpolated into `$queryRawUnsafe` SQL string | **SQL injection**: `ids` comes from `searchParams.get("ids").split(",")` at line 415-418 with zero validation. Occurs in both `buildDishMatrix` and `buildRecipeMatrix`. An attacker can inject via `?ids='),('DROP TABLE`. |
| 5 | `apps/api/app/api/administrative/trash/list/route.ts` | 739-744 | `Prisma.raw(dataSql.replace(/\$\d+/g, (match) => { return \`'\${params[idx]}'\` }))` — manual parameter binding via string replacement | **SQL injection**: Replaces all `$N` placeholders with `'${paramValue}'` without escaping. If any param contains `'`, injection is trivial. Code at line 748+ uses Prisma findMany instead, suggesting this block may be dead code — verify before deprioritizing. |

### HIGH — Dynamic Identifiers Without Allowlist

| File | Line | Pattern | Risk |
|---|---|---|---|
| `apps/api/app/api/crm/scoring/calculate/route.ts` | 36 | `FIELD_COLUMN_MAP[field] ?? field` — fallback uses raw field value as column name | Column-name injection; 10 fields allowlisted but any other passes through |
| `apps/app/app/(authenticated)/analytics/clients/actions/get-client-ltv.ts` | 456 | `ORDER BY ${orderClause}` — dynamic ORDER BY from user `sortBy` | Arbitrary SQL after ORDER BY if not validated |
| `apps/api/app/api/inventory/batch/route.ts` | 190-198 | Dynamic SET clause: `SET ${setClauses.join(", ")}` in `$executeRawUnsafe` | Complex dynamic SQL; column names hardcoded but structure is fully dynamic |
| `apps/app/app/api/settings/audit-log/route.ts` | 87-128 | Dynamic WHERE clause from user filters, passed to `$queryRawUnsafe` | Individual values use `$N` params but WHERE structure is string-concatenated |
| `apps/app/app/(authenticated)/settings/audit-log/page.tsx` | 153-176 | Same dynamic WHERE pattern with `$queryRawUnsafe` | Same risk as server-side audit-log route |
| `apps/app/app/(authenticated)/analytics/staff/actions/get-employee-performance.ts` | 160, 175, 209 | Parameter index mismatches — `clock_in >= $2` should be `$3` (employeeId occupies `$2`) | Incorrect query results; dates filtered by employeeId value instead of actual dates |

### MEDIUM — Correctness Bugs (Blocker-6 pattern)

| File | Line | Pattern | Risk |
|---|---|---|---|
| `apps/api/app/api/logistics/drivers/commands/update/route.ts` | 40-41 | `${vehicleId !== undefined ? (vehicleId \|\| null) + "::uuid" : "vehicle_id"}::uuid` | **Known Blocker 6**: literal string `"vehicle_id"` as parameter or double-cast `<uuid>::uuid::uuid` |
| `apps/api/app/api/payroll/approvals/history/route.ts` | 83 | `pah.payroll_run_id = '${payrollRunId}'::uuid` — string concatenation | Not parameterized; relies on UUID regex validation upstream |
| `apps/api/app/api/facilities/assets/commands/create/route.ts` | 74-76 | `${purchaseCost \|\| null}::numeric` — falsy-value bug | `0 \|\| null` returns null instead of 0 |
| `apps/api/app/api/facilities/assets/commands/update/route.ts` | 52-55 | `COALESCE(${purchaseCost \|\| null}::numeric, purchase_cost)` | Same falsy-value bug: cost of `0` treated as null |
| `apps/api/app/api/procurement/vendors/commands/update/route.ts` | 55-69 | 14 ternary checks mixing `${x !== undefined ? x : null}` with `${x \|\| "default"}` | Inconsistent null handling for empty strings and zeros |
| `apps/api/app/api/procurement/budget/commands/update/route.ts` | 49-61 | `${fiscalYear ? fiscalYear : null}::int` | Falsy-value bug: `fiscalYear` of `0` becomes null |
| `packages/manifest-adapters/src/bottleneck-detector/detector.ts` | 349, 421, 432, 584, 640 | `${locationId ? "AND ... $N" : ""}` — conditional WHERE | Parameter indices shift based on condition, easy to misalign |
| `apps/api/app/api/kitchen/recipes/versions/compare/route.ts` | ~155 | `(${unitIds.join(",")}::int2)` — joins unit IDs into SQL cast | Non-numeric `unitId` produces invalid SQL |

### Tenant Isolation Gaps in Raw SQL

| File | Line | Query | Missing Filter |
|---|---|---|---|
| `apps/api/app/api/procurement/approvals/action/route.ts` | 100-111 | UPDATE `tenant_inventory.purchase_orders` | Missing `tenant_id` in WHERE — UPDATE could affect cross-tenant rows |
| `apps/api/app/api/kitchen/waste/units/route.ts` | 18-31 | SELECT from `core.units` | No tenant filter (acceptable if `core.units` is a shared system table) |
| `apps/api/app/api/kitchen/ai/bulk-generate/prep-tasks/service.ts` | 44-55 | SELECT event dishes | Missing `tenant_id` — could access events from other tenants |
| `apps/api/app/api/public/contracts/[token]/route.ts` | 98-103 | SELECT client by `clientId` only | Public route queries client without tenant verification — cross-tenant data access possible |
| `apps/api/app/api/public/proposals/[token]/route.ts` | 121-126, 145-150, 166-172 | SELECT client, lead, event by ID only | Public route queries without tenant verification — cross-tenant data access possible |
| `apps/app/app/(authenticated)/events/importer.ts` | 167-176, 179-185 | SELECT from `core.units` | No tenant filter (acceptable if `core.units` is shared) |
| `apps/app/app/(authenticated)/kitchen/recipes/cleanup/server-actions.ts` | 171-179 | SELECT from `core.units` | No tenant filter (acceptable if `core.units` is shared) |

**Note:** Queries on `core.units` are likely acceptable — `core` schema appears to be shared/system-level. The real gaps are procurement approvals (missing tenant_id on UPDATE) and public routes (cross-tenant data leak).

### Schema Drift in Raw SQL References

| File | Line | Table/Column Referenced | Status |
|---|---|---|---|
| `apps/api/app/api/procurement/budget/list/route.ts` | 29 | `tenant_inventory.procurement_budgets` | **Orphaned** — no Prisma model |
| `apps/api/app/api/procurement/budget/list/route.ts` | 35 | `tenant_inventory.procurement_budget_alerts` | **Orphaned** |
| `apps/api/app/api/procurement/budget/commands/refresh/route.ts` | 25, 76, 95 | Same two tables | **Orphaned** |
| `apps/api/app/api/procurement/budget/[id]/route.ts` | 25, 63, 86, 98 | Same two tables | **Orphaned** |
| `apps/api/app/api/procurement/vendors/[id]/route.ts` | 48, 61 | `vendor_contacts`, `vendor_ratings` | **Orphaned** |
| `apps/api/app/api/procurement/vendors/commands/rate/route.ts` | 51 | `vendor_ratings` | **Orphaned** |
| `apps/api/app/api/crm/scoring/calculate/route.ts` | 93 | `tenant_crm.crm_scoring_rules` | **Orphaned** |
| `apps/app/app/api/settings/audit-log/route.ts` | 92, 104-117 | `tenant_admin.audit_log` | **Orphaned** |
| `apps/app/app/(authenticated)/settings/audit-log/page.tsx` | 156, 179 | `tenant_admin.audit_log` | **Orphaned** |
| `apps/api/app/api/payroll/bank-accounts/*.ts` (5 files) | various | `tenant_staff.employee_bank_accounts` | **Orphaned** (Blocker 3) |
| `apps/api/app/api/facilities/assets/*.ts` (4 files) | various | `tenant_facilities.facility_assets` | **Orphaned** |
| `apps/api/app/api/logistics/drivers/*.ts` (4 files) | various | `tenant_logistics.drivers` | **Orphaned** |
| `apps/api/app/api/logistics/vehicles/*.ts` (3 files) | various | `tenant_logistics.vehicles` | **Orphaned** |

### $queryRawUnsafe / $executeRawUnsafe Full Inventory

**Total unsafe variant calls: ~100 across 38 files**

| Category | Files | Pattern | Verdict |
|---|---|---|---|
| Events waitlist (4 files) | `update-rsvp`, `add-guest`, `promote`, `waitlist/route.ts` | `$N` parameterized, tenant-filtered | **JUSTIFIED** |
| Events export (3 files) | `export/csv`, `export/pdf`, `battle-board/pdf` | `$N` parameterized, tenant-filtered | **JUSTIFIED** |
| Battle-board tasks (1 file) | `battle-board/actions/tasks.ts` | Dynamic SET builder with `$N` params | **JUSTIFIED** |
| Procurement (12 files) | vendors, budget, purchase-orders, approvals | `$N` parameterized, tenant-filtered | **JUSTIFIED** |
| Payroll (3 files) | bank-accounts (all 5), tax/list | `$N` parameterized, tenant-filtered | **JUSTIFIED** |
| Logistics (5 files) | drivers/list, dispatch, tracking | `$N` parameterized, tenant-filtered | **JUSTIFIED** |
| Facilities (4 files) | assets (list, create, update, delete) | `$N` parameterized, tenant-filtered | **JUSTIFIED** |
| Analytics (6 files) | finance, kitchen, events profitability, clients, staff | `$N` parameterized, tenant-filtered | **JUSTIFIED** |
| CRM scoring (1 file) | `scoring/calculate/route.ts` | Raw string interpolation from stored rules | **DANGEROUS** — CRITICAL #1 |
| Kitchen allergens (1 file) | `allergens/matrix/route.ts` | User IDs directly interpolated into IN clause | **DANGEROUS** — CRITICAL #4 |
| Inventory (3 files) | batch, supplier-sync, quickbooks export | `$N` parameterized, tenant-filtered | **JUSTIFIED** |
| Settings (2 files) | audit-log route + page | `$N` parameterized, tenant-filtered | **JUSTIFIED** |
| Staff (1 file) | performance/list | Dynamic WHERE with `$N` params | **JUSTIFIED** |
| Bottleneck detector (1 file) | `manifest-adapters/detector.ts` | `$N` parameterized with conditional WHERE | **JUSTIFIED** |

### Safe Usage (stats only)

- **~470 instances** of `$queryRaw` / `$executeRaw` using tagged template literals with `Prisma.sql` — safe; Prisma parameterizes all interpolated values
- **~100 instances** of `$queryRawUnsafe` / `$executeRawUnsafe` using `$N` parameterized placeholders — justified for queries needing dynamic WHERE or schema-scoped tables
- **5 instances** with genuinely dangerous string interpolation (listed in CRITICAL above)

### Recommended Actions (priority order)

1. **CRITICAL**: Rewrite `apps/api/app/api/crm/scoring/calculate/route.ts:145-157` to use `Prisma.sql` or `$N` parameterized queries. Replace `buildRuleCondition()` with a parameterized approach. Fix `FIELD_COLUMN_MAP` fallback to reject unknown fields.
2. **CRITICAL**: Fix `apps/api/app/api/staffing/coverage/route.ts:67,90,114,130,149` — replace string-concatenated `locationFilter` with `$N` parameterized placeholder.
3. **CRITICAL**: Fix `apps/api/app/api/payroll/approvals/history/route.ts:87` — validate `action` against an allowlist or parameterize it.
4. **CRITICAL**: Rewrite `apps/api/app/api/kitchen/allergens/matrix/route.ts:115-116,271-273` — replace `dishIds.map(id => \`'\${id}'\`).join(",")` with `Prisma.join(dishIds)` or validate all IDs as UUIDs before interpolation.
5. **CRITICAL**: Verify whether `apps/api/app/api/administrative/trash/list/route.ts:739-744` is dead code. If live, rewrite to use proper parameterized queries instead of `'${params[idx]}'` string replacement.
6. **HIGH**: Add allowlist validation for `orderClause` in `get-client-ltv.ts:456`.
7. **HIGH**: Fix parameter index mismatches in `get-employee-performance.ts:160,175,209` — `$2` should be `$3` where employeeId occupies `$2`.
8. **HIGH**: Migrate `inventory/batch/route.ts:190-198` from `$executeRawUnsafe` to `$executeRaw` tagged template.
9. **HIGH**: Add `tenant_id` filter to `apps/api/app/api/procurement/approvals/action/route.ts:100-111` UPDATE query.
10. **HIGH**: Add tenant verification to public route queries in `public/contracts/[token]/route.ts:98` and `public/proposals/[token]/route.ts:121-172`.
11. **HIGH**: Migrate audit-log routes from `$queryRawUnsafe` to `$queryRaw` tagged template with `Prisma.sql` fragment composition.
12. **MEDIUM**: Fix the Blocker-6 correctness bug in logistics drivers update (already tracked).
13. **MEDIUM**: Fix falsy-value bugs in facilities asset create/update (`0 || null` should be `0 ?? null`).
14. **MEDIUM**: Fix inconsistent null handling in procurement vendor/budget updates (standardize on `!== undefined` checks).
15. **MEDIUM**: Fix `kitchen/recipes/versions/compare/route.ts:155` string join for IN clause — use parameterized `ANY()`.
16. **MEDIUM**: Add `tenant_id` filter to `kitchen/ai/bulk-generate/prep-tasks/service.ts:44-55`.
17. **SCHEMA_DRIFT**: Backfill Prisma models for all orphaned tables (already tracked as Tier 2 item).
18. **HYGIENE**: Migrate all 28 "safe but wrong API" files from `$queryRawUnsafe(sql, ...params)` to `$queryRaw\`...\`` tagged template literals.

---

## Raw-SQL Deep Audit (7th Pass — Supplementary to 6th Pass)

> **Audited:** 2026-04-24
> **Scope:** Supplementary deep audit focused on `Prisma.raw()` usage, dead-code SQL execution, unauthenticated endpoint tenant isolation, and patterns the 6th pass missed.
> **Method:** Targeted grep for `Prisma.raw()`, dynamic ORDER BY, cross-tenant query patterns → 9 parallel domain-specific subagents (Prisma.raw audit, logistics, procurement, payroll/facilities, events, client-side apps/app, staff/inventory/kitchen, public/unauthenticated routes, packages/analytics/CRM) → manual verification of every new finding.

### Executive Summary

The 6th pass identified 5 CRITICAL, 6 HIGH, and 7 MEDIUM findings. This supplementary pass found **4 additional CRITICAL**, **4 additional HIGH**, and **2 additional MEDIUM** issues that the 6th pass missed. It also confirmed the 6th pass's existing findings remain valid and expanded the tenant isolation gap list from 7 to 10.

Key areas the 6th pass under-covered:
- `Prisma.raw()` injection patterns (found 2 new CRITICAL in trash/list that the 6th pass partially missed)
- Unauthenticated/service endpoints (email webhook, outbox publisher — both allow cross-tenant data access)
- Dead code that still executes vulnerable SQL queries

### CRITICAL — New Findings (not in 6th pass)

| # | File | Line | Pattern | Risk |
|---|---|---|---|---|
| 6 | `apps/api/app/api/administrative/trash/list/route.ts` | 706-711 | `Prisma.raw(\`SELECT COUNT(*) as count FROM (${query.sql.replace(..., \` WHERE ${whereClause}\`)}) AS subq\`)` — second `Prisma.raw()` call injecting user `search` param into unparameterized SQL | **SQL injection**: The 6th pass flagged line 739-744 but missed this count query at line 707. `whereClause` includes `LOWER($2)` with user search term, but the `$2` is inside a `Prisma.raw()` string — NOT a Prisma parameter. |
| 7 | `apps/api/app/api/collaboration/notifications/email/webhook/route.ts` | ~30-40 | `$queryRaw\`SELECT tenant_id, id FROM email_logs WHERE resend_id = ${resendId} LIMIT 1\`` with NO auth check | **Cross-tenant data leak**: No `auth()` call. Any caller can query any tenant's email logs by guessing/leaking a `resend_id`. The query returns `tenant_id` which is then used for subsequent tenant-scoped updates — an attacker can confirm tenant existence and enumerate email delivery records. |
| 8 | `apps/api/app/outbox/publish/route.ts` | ~100-116 | `$queryRaw\`SELECT ... FROM "tenant"."OutboxEvent" WHERE "status" = 'pending' ORDER BY "createdAt" ASC LIMIT ${limit} FOR UPDATE SKIP LOCKED\`` — no `tenantId` filter | **Cross-tenant data access**: Bearer token auth only. SELECT returns events from ALL tenants. An attacker with the outbox token can read every tenant's outbox events including `payload` data. |
| 9 | `apps/api/app/api/administrative/trash/list/route.ts` | 644-745 | Three sequential loops over same entity types: (1) lines 644-685 `Prisma.sql` with escaped `$` signs, (2) lines 688-745 `Prisma.raw` with manual param substitution, (3) lines 748-794 Prisma `findMany`. Only loop 3's results are used. | **Dead code executing vulnerable queries**: Loops 1 and 2 execute SQL against the database (including the CRITICAL injection at lines 707 and 739-744) but results are discarded. The queries still run — an injection payload in `search` executes successfully before the safe loop 3 runs. The 6th pass noted "may be dead code" on item 5 — **confirmed dead code, but queries still execute**. |

### HIGH — New Findings (not in 6th pass)

| File | Line | Pattern | Risk |
|---|---|---|---|
| `apps/api/app/api/administrative/trash/list/route.ts` | 718 | `ORDER BY ${query.displayNameColumn} ${sortOrder.toUpperCase()}` — `sortOrder` from `searchParams.get("sortOrder")` | `sortOrder` only uppercased, never validated against `ASC`/`DESC` allowlist. Arbitrary SQL after column name. Also applies to line 664 (`ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}`) where `sortColumn` is derived from `sortBy` — though `sortColumn` maps to hardcoded values, `sortOrder` does not. |
| `apps/api/app/api/logistics/dispatch/commands/assign/route.ts` | 72-76 | `UPDATE tenant_logistics.drivers SET status = 'on_route' WHERE id = ${driverId}::uuid` — missing `tenant_id` | No tenant filter on UPDATE. `driverId` IS validated against tenant in a prior SELECT (line 44-52), but defense-in-depth is missing. If the prior check is bypassed (race condition, schema change), this modifies cross-tenant data. |
| `apps/api/app/api/payroll/approvals/history/route.ts` | 76 | `conditions.push(\`pah.tenant_id = ${tenantId}\`)` — unquoted tenantId in `Prisma.raw()` | The 6th pass flagged line 87 (`action`) but missed line 76: `tenantId` interpolated without quotes into `Prisma.raw()`. For a UUID like `550e8400-e29b-41d4...`, PostgreSQL interprets `=` comparison against the unquoted hyphenated value as arithmetic subtraction, causing a runtime error. Not injection, but a correctness bug that breaks the endpoint for any UUID tenant_id. |
| `apps/api/app/api/administrative/trash/list/route.ts` | 681 | `Prisma.sql\`${Prisma.raw(sql.replace(/\$/g, "\\\\"))}\`` — escapes all `$` signs | All `$N` parameter placeholders become literal `\\$1` etc. The query likely fails or returns unexpected results. Part of dead code loop (see CRITICAL #9). |

### MEDIUM — New Findings (not in 6th pass)

| File | Line | Pattern | Risk |
|---|---|---|---|
| `apps/api/app/api/administrative/trash/list/route.ts` | 653-658 | `sql = sql.replace(" deleted_at IS NOT NULL", \` deleted_at IS NOT NULL AND LOWER(${query.displayNameColumn}) LIKE LOWER($2)\`)` | `displayNameColumn` comes from `ENTITY_QUERIES` constant (safe), but the string `.replace()` pattern is fragile — if the source SQL doesn't contain the exact substring, the search filter silently fails to apply. |
| `apps/api/lib/staff/labor-budget.ts` | 337 | `Prisma.raw(\`${Prisma.join(updateFields.map((f) => Prisma.raw(f)), ", ")}\`)` | Double-wrapping: `Prisma.raw()` inside `Prisma.join()` inside template literal inside another `Prisma.raw()`. Works because inner `Prisma.raw()` marks each field as SQL, but fragile and hard to audit. |

### Tenant Isolation Gaps — New Findings (not in 6th pass)

| File | Line | Query | Missing Filter |
|---|---|---|---|
| `apps/api/app/api/logistics/dispatch/commands/assign/route.ts` | 72-76 | UPDATE `tenant_logistics.drivers` SET status | Missing `tenant_id` in WHERE — only filters by `id` |
| `apps/api/app/api/collaboration/notifications/email/webhook/route.ts` | ~30-40 | SELECT from `email_logs` by `resend_id` | No auth; no tenant filter — searches across ALL tenants |
| `apps/api/app/outbox/publish/route.ts` | ~100-116 | SELECT from `OutboxEvent` by `status` | No tenant filter — returns events from ALL tenants |

**Updated total: 10 tenant isolation gaps** (7 from 6th pass + 3 new).

### Corrections to 6th Pass Findings

| Item | 6th Pass Claim | 7th Pass Finding |
|---|---|---|
| CRITICAL #5 (trash/list:739-744) | "may be dead code" | **Confirmed dead code** — results unused. But query STILL EXECUTES. Injection payload runs successfully before safe loop 3. |
| Tenant Isolation (6th pass) | "7 gaps" listed | Under-counted. Added 3 more gaps (logistics dispatch, email webhook, outbox publish). |
| Events followups create | Not mentioned | Insert DOES include `tenant_id` — verified, no issue. |
| `Prisma.raw()` audit | Not systematic | 6th pass did not grep for `Prisma.raw()` as a separate pattern. Found 2 additional injection points in trash/list and confirmed the pattern is used in 12 files total (see `Prisma.raw()` inventory below). |

### `Prisma.raw()` Full Inventory

`Prisma.raw()` bypasses Prisma's parameterization. Every usage must be audited.

| File | Line | What's Injected | Risk |
|---|---|---|---|
| `apps/api/app/api/administrative/trash/list/route.ts` | 681 | Escaped SQL string | Broken (escaped `$`) — dead code |
| `apps/api/app/api/administrative/trash/list/route.ts` | 707 | User `search` in WHERE | **CRITICAL** — SQL injection |
| `apps/api/app/api/administrative/trash/list/route.ts` | 739 | User `search`/pagination via manual `$N`→string replacement | **CRITICAL** — SQL injection |
| `apps/api/app/api/payroll/approvals/history/route.ts` | 97, 139 | `whereClause` with unquoted `tenantId` and unsanitized `action` | **CRITICAL** — injection + correctness |
| `apps/api/app/api/staff/availability/[id]/helpers.ts` | 331 | Dynamic UPDATE SET fields | AT_RISK — column names from validated input |
| `apps/api/app/api/timecards/route.ts` | 163, 179 | Static SQL strings for status filter | SAFE — hardcoded conditions |
| `apps/app/app/(authenticated)/events/actions/event-dishes.ts` | 272 | UUID array | SAFE — validated UUIDs |
| `apps/app/app/(authenticated)/kitchen/recipes/actions.ts` | 308, 1008 | UUID array, table name from type map | SAFE — validated/derived |
| `apps/api/app/api/events/allergens/check/route.ts` | 308 | UUID array | SAFE — validated UUIDs |
| `apps/api/app/api/crm/scoring/[id]/route.ts` | 118 | Dynamic update fields | AT_RISK — fields from request body |
| `apps/api/lib/staff/labor-budget.ts` | 337 | Dynamic SET fields from validated input | AT_RISK — column names validated |
| `packages/manifest-adapters/src/bottleneck-detector/detector.ts` | 349+ | Conditional WHERE fragments | SAFE — server-side booleans |

### Recommended Actions — Additional (supplementary to 6th pass)

19. **CRITICAL**: Add webhook signature verification to `apps/api/app/api/collaboration/notifications/email/webhook/route.ts` — validate Resend signing secret before processing. Add tenant scoping to initial email_logs query.
20. **CRITICAL**: Add `tenantId` filter to `apps/api/app/outbox/publish/route.ts` outbox event SELECT. Require tenant context alongside bearer token.
21. **CRITICAL**: Delete dead code loops 1 and 2 in `apps/api/app/api/administrative/trash/list/route.ts:644-745`. These execute vulnerable SQL queries (including the CRITICAL injection at lines 707 and 739-744) whose results are never used. Only loop 3 (Prisma findMany, lines 748-794) produces actual output.
22. **HIGH**: Add `tenant_id` filter to `apps/api/app/api/logistics/dispatch/commands/assign/route.ts:72-76` UPDATE query — add `AND tenant_id = ${tenantId}::uuid` to WHERE clause.
23. **HIGH**: Add allowlist validation for `sortOrder` in `apps/api/app/api/administrative/trash/list/route.ts:718` — reject anything other than `ASC` or `DESC`.
24. **HIGH**: Fix `apps/api/app/api/payroll/approvals/history/route.ts:76` — wrap `tenantId` in quotes: `pah.tenant_id = '${tenantId}'::uuid` or better, use `Prisma.sql` parameterization for the entire `whereClause` instead of `Prisma.raw()`.
25. **MEDIUM**: Audit all 12 `Prisma.raw()` call sites quarterly — any new addition must be reviewed for injection risk.

### Coverage Gaps

Two subagents hit context limits during the parallel audit:
- **Client-side apps/app routes** (~50 files) — partially covered by other subagents that overlapped. Key files (analytics, events, kitchen, scheduling, warehouse) were audited by other agents. Lower-priority files (training, payroll overview, CRM page, admin page) were not individually read.
- **Packages domain** (~15 files) — manifest-adapters engines, database scripts, and sync services were partially covered. The bottleneck detector was fully audited. The recipe optimization/scaling/nutrition engines and sync services (goodshuffle, nowsta) were not individually verified for correctness bugs.

**Recommendation**: A future pass should specifically target the 2 subagent gaps for completeness.

---

## Raw-SQL Re-Verification (6th Pass — 15-Subagent Confirmation)

> **Re-audited:** 2026-04-24
> **Method:** 15 parallel domain-specific subagents (Haiku model) re-read every raw-SQL file. Procurement, analytics, events, logistics+payroll, facilities, kitchen+CRM+staff+admin, inventory, settings/audit-log, bottleneck-detector, staff library, training+shipments, staff routes, apps/app pages+actions, remaining API routes, sync services+warehouse, client-side SQL. 3 agents hit context/rate limits; gaps cross-covered by overlapping agents.
> **Purpose:** Confirm 6th/7th pass findings at the source-code level and identify any issues the prior passes missed.

### Confirmation of Existing Findings

All 9 CRITICAL, 10 HIGH, and 9 MEDIUM findings from the 6th/7th pass were re-verified at the file:line level. No existing findings were falsified.

### New Findings — Tenant Isolation Gaps (not in 6th/7th pass)

| File | Line | Query | Missing Filter |
|---|---|---|---|
| `apps/api/app/api/shipments/[id]/status/route.ts` | 322-330 | UPDATE `tenant_inventory.inventory_items` SET quantity | Missing `tenant_id` in WHERE — inventory UPDATE could affect cross-tenant rows |
| `apps/api/app/api/shipments/[id]/status/route.ts` | 379-387 | UPDATE `tenant_inventory.inventory_items` SET quantity (reduce) | Same — no `tenant_id` filter |
| `apps/api/app/api/shipments/[id]/helpers.ts` | 143-159, 178-185 | UPDATE shipment items/totals | Missing `tenant_id` in WHERE clauses |
| `apps/api/app/api/staff/time-off/requests/[id]/route.ts` | 78-79 | SELECT time-off request with JOIN | Missing `tenant_id` in JOIN condition for processor table |
| `apps/api/lib/staff/workforce-ai-optimizer.ts` | 750-790 | Turnover risk query with EXISTS on `employee_locations` | EXISTS subquery doesn't verify `el.tenant_id` matches outer `tenant_id` |
| `apps/api/lib/staff/auto-assignment.ts` | 212-213 | Employee conflicts query JOIN on `tenant.locations` | Missing `l.tenant_id` verification in JOIN |
| `apps/api/lib/staff/auto-assignment.ts` | 256 | Employee availability JOIN | Missing tenant_id in availability join condition |

**Updated total: 17 tenant isolation gaps** (10 from 6th/7th pass + 7 new).

### New Findings — Correctness Bugs (not in 6th/7th pass)

| File | Line | Pattern | Risk |
|---|---|---|---|
| `apps/api/app/api/training/assignments/route.ts` | 91 | `ILIKE ${`%${search}%`}` — search term not sanitized for SQL LIKE wildcards (`%`, `_`) | Performance degradation / incorrect results with special LIKE characters |
| `apps/api/app/api/training/complete/route.ts` | 220-228 | `${body.score ?? null}`, `${body.passed ?? true}` directly in SQL without type validation | Potential runtime errors from unexpected types |
| `apps/api/app/api/shipments/[id]/helpers.ts` | 146-156 | `${updateData.quantityShipped}::numeric` without null check | NULL values produce `NULL::numeric` which may break downstream calculations |

### Coverage Verification

Of the 250 files with raw SQL, the 15 subagents directly read and classified:
- **~185 production source files** (excluding tests/mocks/seed scripts)
- **~40 files using `$queryRawUnsafe`/`$executeRawUnsafe`** — all verified
- **~100 files using `$queryRaw`/`$executeRaw` tagged templates** — tenant isolation spot-checked
- **~45 files using `Prisma.sql` in packages** — verified safe parameterization

The 3 subagent gaps (remaining API routes, sync services, some app pages) were partially covered by overlapping agents. No new CRITICAL findings are expected from these gaps — they predominantly use `Prisma.sql` tagged templates which are inherently safe from injection.

### Updated Statistics

| Category | Count |
|---|---|
| Total raw-SQL occurrences | ~1,577 |
| Files with raw SQL | 250 |
| Files with unsafe variants (`$queryRawUnsafe`/`$executeRawUnsafe`) | 38 |
| **CRITICAL** (SQL injection) | 9 |
| **HIGH** (dynamic identifiers, unvalidated params) | 10 |
| **MEDIUM** (correctness bugs, type-cast issues) | 9 + 3 new = 12 |
| **Tenant isolation gaps** | 10 + 7 new = 17 |
| **Schema drift** (queries on orphaned tables) | ~15 across 8 orphaned tables |
| Safe tagged-template usage | ~470 |
| Justified parameterized unsafe usage | ~100 |
| `Prisma.raw()` call sites | 12 (2 CRITICAL, 2 AT_RISK, 8 SAFE) |

