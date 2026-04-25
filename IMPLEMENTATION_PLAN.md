# Capsule-Pro Implementation Plan

> **Last updated:** 2026-04-25 (eleventh-pass credential exposure & webhook security deep-dive)
> **Prior passes:** 2026-04-24 initial post-expansion audit → 2026-04-24 first re-verification → 2026-04-24 third-pass spot-check → 2026-04-24 fourth-pass package health → 2026-04-24 fifth-pass E2E audit → 2026-04-24 sixth-pass raw-SQL audit → 2026-04-24 seventh-pass supplementary raw-SQL audit → 2026-04-24 eighth-pass comprehensive raw-SQL audit → 2026-04-25 ninth-pass frontend health audit → 2026-04-25 tenth-pass mobile + public website audit → **2026-04-25 eleventh-pass auth, middleware & integration services audit** (3 sub-passes: initial 6-agent pass, 6-agent addendum, 5-agent credential/webhook deep-dive).
> **Previous snapshot:** 2026-03-08 (stale — many claims falsified by post-expansion audit)
> **Audit method:** initial 15+ parallel subagent investigations → 8-subagent re-verification → 10-subagent third-pass → 10-subagent fourth-pass → E2E fifth-pass → 20-subagent sixth-pass → 9-subagent seventh-pass → 15-subagent confirmation pass → 20-subagent eighth-pass raw-SQL audit → 24-subagent ninth-pass frontend health audit → 11-subagent tenth-pass mobile + public website audit → **17-subagent eleventh-pass auth/middleware/integration audit** (6 + 6 + 5 agents across 3 sub-passes) covering full auth chain trace, route-level auth enforcement scan, credential exposure scan across all directories, webhook receiver security deep-audit, all 16 lib files, and external integration packages. **All agent findings verified against actual codebase before reporting.**
> **Current state:** Massive feature expansion in commit b8c31eef (2026-04-19) added 5 new modules; no commits since a71ec8d5 (2026-04-24). **Ninth pass re-verified: prior draft claimed 16 CRITICAL but 12 were false positives** (broken imports resolved correctly via path alias, `manifestSuccessResponse` wrapping makes `data.data.xxx` correct, many "missing" API modules actually exist). **Verified findings: 4 NEW CRITICAL, 6 NEW HIGH, 8 NEW MEDIUM, 5 NEW LOW** frontend issues. Key verified issues: chart-of-accounts uses PATCH where API only supports PUT (405), missing `/api/accounting/payments/export` endpoint, only 2 `loading.tsx` files across the entire app, procurement budget hooks use ambiguous base paths, 6 hook libraries missing `'use client'` directives.

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


## Raw-SQL Audit (8th Pass — Comprehensive Re-Audit)

> **Audited:** 2026-04-24
> **Scope:** All `$queryRaw`, `$executeRaw`, `$queryRawUnsafe`, `$executeRawUnsafe`, `Prisma.sql`, `Prisma.raw` usage across `apps/` and `packages/` (233 source files, 1,594 raw-SQL lines)
> **Method:** 20 parallel subagents: 12 domain-specific file-by-file audits, 2 targeted pattern searches (ternary/falsy bugs, parameter index alignment), plus coverage of prior-pass gaps (packages engines, sync services, client-side pages). 4 agents rate-limited; gaps filled by overlapping agents and pattern search. Every finding verified by reading actual source.
> **Prior coverage:** 6th pass found 5 CRITICAL, 6 HIGH, 7 MEDIUM. 7th pass found 4 additional CRITICAL, 4 HIGH, 2 MEDIUM. This pass covers areas those passes explicitly flagged as gaps (packages engines, sync services, client-side pages) plus re-examines all files for new issues.

### Executive Summary

Of 233 source files containing raw SQL, the 8th pass found **10 NEW CRITICAL**, **15 NEW HIGH**, and **20+ NEW MEDIUM** issues not identified in prior passes. The most significant discovery is systemic schema drift in `events/importer.ts` where 15 raw-SQL queries use Prisma camelCase field names (`tenantId`, `deletedAt`, `eventId`) instead of actual database column names (`tenant_id`, `deleted_at`, `event_id`) — making the entire event import pipeline non-functional. Additionally, all three Goodshuffle sync services contain broken column references that cause runtime failures.

Key areas the 6th/7th passes under-covered that this pass filled:
- **Packages engines** (recipe optimization/scaling/nutrition) — found CRITICAL: non-existent `ingredient_id` column in `inventory_items` JOIN
- **Sync services** (Goodshuffle, Nowsta) — found CRITICAL: column name mismatches in event/invoice sync (`name`→`title`, `total_budgeted`→`total_budget_amount`)
- **Client-side pages** (events, scheduling) — found 15 CRITICAL schema drift issues in `importer.ts`
- **Pattern-based analysis** — found new SQL injection via `sortOrder` in `trash/list` and systemic `|| null` falsy-value bug across 27+ call sites

### CRITICAL — New Findings (not in 6th/7th pass)

| # | File | Line(s) | Pattern | Risk |
|---|---|---|---|---|
| 10 | `apps/app/app/(authenticated)/events/importer.ts` | 140-651 (15 queries) | Raw SQL uses camelCase Prisma field names (`tenantId`, `deletedAt`, `eventId`, `recipeId`, `dishId`) instead of DB column names (`tenant_id`, `deleted_at`, `event_id`, `recipe_id`, `dish_id`) | **Entire event import pipeline broken** — every INSERT/SELECT will fail with "column does not exist". 15 separate queries affected: `ensureLocationId`, `findRecipeId`, `insertRecipe`, `findDishId`, `insertDish`, `findIngredientId`, `insertIngredient`, `findInventoryItemId`, `insertInventoryItem`, `insertEvent`, `insertEventDish`, `insertPrepTask`, `attachEventImport` (2 paths) |
| 11 | `apps/api/app/lib/goodshuffle-event-sync-service.ts` | 266-311 | `INSERT/UPDATE ... SET name = ${gsEvent.name}` — column `name` does not exist on `tenant_events.events`; actual column is `title` (Prisma field `title` has no `@map`) | **Runtime failure** on every Goodshuffle event sync |
| 12 | `apps/api/app/lib/goodshuffle-invoice-sync-service.ts` | 261-335 | `INSERT/UPDATE` uses `total_budgeted`, `total_actual`, `currency` — actual columns are `total_budget_amount`, `total_actual_amount`; `currency` column does not exist at all | **Runtime failure** on every Goodshuffle invoice sync |
| 13 | `apps/api/app/api/kitchen/waste/entries/[id]/route.ts` | 45-59 | SELECT/JOIN uses `ingredient_id` (should be `inventory_item_id`), `created_by` (should be `logged_by`), wrong join table (`tenant_inventory.ingredients` instead of `inventory_items`) | **Endpoint completely broken** — 4 column name mismatches + wrong join table |
| 14 | `apps/api/app/api/timecards/me/route.ts` | 47 | `JOIN tenant.users u ON u.id = e.user_id` — `tenant.users` table does not exist | **Route returns 500 on every call** |
| 15 | `packages/manifest-adapters/src/recipe-optimization-engine.ts` | 215-218 | `LEFT JOIN tenant_inventory.inventory_items ii ON ii.ingredient_id = i.id` — `ingredient_id` column does not exist on `inventory_items` | **Recipe optimization crashes** for any ingredient with potential substitutions |
| 16 | `apps/api/lib/staff/labor-budget.ts` | 336-338 | `Prisma.raw()` with `$N` positional params in SET clauses — `values[]` array is built but never bound; `$2` references `${tenantId}` parameter, causing data corruption | **Data corruption on every labor budget update** — columns set to wrong values |
| 17 | `apps/api/app/api/procurement/approvals/action/route.ts` | 100-111 | Final SELECT returns updated PO without `tenant_id` filter — `WHERE po.id = $1::uuid` only | **Cross-tenant PO data exposure** — any authenticated user who knows a PO ID can read any tenant's purchase order |
| 18 | `apps/api/app/api/administrative/trash/list/route.ts` | 664, 724 | `ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}` — `sortOrder` from `searchParams.get("sortOrder")` with zero validation, injected via `Prisma.raw()` into executed SQL | **SQL injection** — attacker can pass arbitrary SQL in `sortOrder` query parameter. Occurs in two separate code blocks |
| 19 | `apps/app/app/(authenticated)/events/actions.ts` | 430-451 | `INSERT INTO tenant_events.event_imports (..., eventId, ...)` — `eventId` is a Prisma field name; actual DB column is `event_id` | **Runtime failure** on event import attachment |

### HIGH — New Findings (not in 6th/7th pass)

| # | File | Line(s) | Pattern | Risk |
|---|---|---|---|---|
| 11 | `apps/api/lib/staff/workforce-ai-optimizer.ts` | 759, 784 | `e.seniority_rank` referenced directly — column exists only on `employee_seniority` table, not `employees` | **Runtime SQL error** — `identifyTurnoverRisks()` function fails |
| 12 | `apps/api/app/api/staff/availability/validation.ts` | 155-159 | SQL overlap check has `AND ( AND (...) AND (...) )` — inner `AND` has no left operand | **SQL syntax error** on availability overlap detection |
| 13 | `apps/api/app/api/kitchen/recipes/[recipeId]/update-budgets/route.ts` | 26-33 | `pt.dish_id` matched against `rv.recipe_id` — these are different entities (dish_id ≠ recipe_id) | **Silently wrong budget calculations** — type confusion between dishes and recipes |
| 14 | `apps/api/app/api/kitchen/recipes/[recipeId]/update-budgets/route.ts` | 34-38 | MAX version subquery missing `deleted_at IS NULL` and `tenant_id` filter | Deleted versions treated as "latest"; cross-tenant version consideration |
| 15 | `apps/api/app/api/kitchen/prep-lists/generate/route.ts` | 330-389 | `_tenantId` parameter accepted but never used in recipe_ingredients query | Cross-tenant data leak if call site refactored |
| 16 | `apps/api/app/api/analytics/finance/route.ts` | 158-165 | `active_contracts` sub-SELECT missing date filter (`$2`/`$3` unused) | `active_contracts` count ignores date range — incorrect financial metrics |
| 17 | `apps/api/app/api/procurement/purchase-orders/list/route.ts` | 42 | `purchase_order_items` JOIN missing `poi.tenant_id = po.tenant_id` | Cross-tenant item data in PO list (budget routes correctly include this guard) |
| 18 | `apps/api/app/api/procurement/purchase-orders/commands/create/route.ts` | 61-69 | No validation that `item.itemId` belongs to current tenant before INSERT | Caller can reference any inventory item across tenants |
| 19 | `apps/api/app/api/procurement/approvals/list/route.ts` | 65 | Same — `purchase_order_items` JOIN missing tenant guard | Same cross-tenant item leak |
| 20 | `apps/api/app/api/staff/availability/validation.ts` | 157 | `${effectiveUntil || effectiveFrom}` — falsy fallback coerces intentional `null` ("no end date") to `effectiveFrom` | Semantic logic error in overlap detection |
| 21 | `apps/api/app/api/user-preferences/route.ts` | 28, 101 | `userId` from `searchParams` with no auth binding — any tenant user can read/write any employee's preferences | **IDOR** within tenant boundaries |
| 22 | `apps/api/app/api/staff/performance/list/route.ts` | 24-57 | `$queryRawUnsafe` with unvalidated `status` (no whitelist) and `employeeId` (no UUID check) | Unhandled 500 on invalid UUID; silent empty results on invalid status |
| 23 | `apps/app/app/(authenticated)/scheduling/availability/actions.ts` | 80-81 | `hasIsActive` filter duplicates `hasEffectiveDate` date-range check — should filter `is_available` | Copy-paste bug — `is_active` filter never actually applied |
| 24 | `apps/api/app/api/kitchen/allergens/detect-conflicts/route.ts` | 56-59 | Bidirectional `includes()` — `"egg"` matches `"veggie"`, `"nut"` matches `"peanut"` | False-positive allergen warnings from substring matching |
| 25 | **Systemic `|| null` falsy-value bug** | 27+ call sites across facilities, logistics, inventory, shipments | `${cost || null}`, `${hours || null}`, `${capacity || null}` — zero values silently become NULL | Cannot set any numeric field to zero across ~27 update/insert sites |

### MEDIUM — New Findings (not in 6th/7th pass)

| File | Line(s) | Pattern | Risk |
|---|---|---|---|
| `apps/api/app/lib/recipe-costing.ts` | 438-478 | `pt.dish_id` in prep_tasks — no such column in Prisma model | Runtime failure in event cost rollup CTE |
| `apps/api/app/api/kitchen/prep-lists/generate/route.ts` | 862, 870, 895 | NULL array elements cast to `text[]` — fails when category/preparationNotes is null | Runtime error when any ingredient has null category |
| `apps/api/app/api/kitchen/allergens/detect-conflicts/route.ts` | 230-243 | `deleteMany` outside transaction, `createMany` inside — non-atomic | Duplicate allergen warnings under concurrent requests |
| `apps/api/app/api/user-preferences/route.ts` | 109 | `$executeRaw` with `RETURNING` — result silently discarded | Dead code; upsert result lost |
| `apps/api/app/api/crm/scoring/[id]/route.ts` | 96-128 | Dead UPDATE code — `.reduce()` returns unchanged `acc`, producing `SET WHERE` (syntax error), caught by try/catch, then second UPDATE runs | Spurious error + Sentry noise on every PUT |
| `apps/api/app/api/analytics/finance/route.ts` | 95-96 | `budgeted_other_cost` uses actual cost columns instead of budgeted columns | `budgetedOtherCost` always equals `actualOtherCost` |
| `apps/api/app/api/procurement/budget/commands/refresh/route.ts` | 47-55 | `period_end` without `period_start` causes unbound `$4` parameter | Runtime crash when budget has end date but no start date. Same bug in `budget/[id]/route.ts` (3 queries) |
| `apps/api/app/api/procurement/vendors/list/route.ts` | 39-44 | ILIKE with user search — `%` and `_` wildcards not escaped | Search `"%"` matches everything; unintended results |
| `apps/api/app/api/procurement/purchase-orders/commands/create/route.ts` | 28-32 | COUNT-based PO number generation with no lock | Duplicate PO numbers under concurrent requests. Same pattern in facilities schedules and work orders |
| `apps/app/app/(authenticated)/events/importer.ts` | 521-544 | Event INSERT omits dietary/allergen data | Imported events lack dietary information |
| `apps/api/app/api/public/proposals/[token]/respond/route.ts` | 38, 123-142 | `notes`, `responderName`, `responderEmail` stored unsanitized from unauthenticated endpoint | **Stored XSS** if frontend renders as HTML |
| `apps/api/app/api/public/proposals/[token]/respond/route.ts` | 123-142 | Audit log INSERT passes email string to `performed_by` UUID column | Runtime crash or audit trail pollution |
| `apps/api/app/api/collaboration/notifications/email/webhook/route.ts` | 83-88 | `email_logs` not schema-qualified — should be `tenant_admin.email_logs` | Depends on search_path; wrong table if path differs |
| `apps/api/app/api/public/contracts/[token]/sign/route.ts` | 95-104 | No duplicate signature prevention; unlimited signatures per token | Attacker can flood contract with unlimited signatures |
| All public mutation endpoints | N/A | No rate limiting on contract signing, proposal responding, or email webhook | DoS and brute-force token attacks |
| `apps/api/app/api/locations/route.ts` | 57 | `isActive="false"` treated identically to absent parameter | Returns ALL locations instead of inactive-only |
| `apps/api/app/api/staff/availability/[id]/helpers.ts` | 331 | `Prisma.raw()` with manual `$N` indices — brittle pattern | Future field additions will silently break index math |
| **9+ pagination routes** | Various | Unbounded LIMIT/OFFSET — no upper bound on `limit` param (staff/time-off, schedules, shifts, availability, certifications, timecards, training, followups) | Resource exhaustion / DoS via `limit=999999999` |
| `apps/app/app/(authenticated)/kitchen/recipes/[recipeId]/update-budgets/route.ts` | 59-60 | `recipeId` param aliased to `recipeVersionId` — semantic naming confusion | Silently does nothing when recipe ID is passed instead of version ID |

### Tenant Isolation Gaps — New Findings

| File | Line(s) | Query | Missing Filter |
|---|---|---|---|
| `procurement/approvals/action/route.ts` | 100-111 | SELECT from `purchase_orders` by `id` only | **No `tenant_id` filter** — cross-tenant PO data exposure |
| `procurement/purchase-orders/list/route.ts` | 42 | LEFT JOIN `purchase_order_items` | Missing `poi.tenant_id = po.tenant_id` |
| `procurement/approvals/list/route.ts` | 65 | LEFT JOIN `purchase_order_items` | Same |
| `procurement/purchase-orders/[id]/route.ts` | 46 | LEFT JOIN `inventory_items` | Missing `ii.tenant_id = poi.tenant_id` |
| `procurement/purchase-orders/commands/create/route.ts` | 61-69 | INSERT into `purchase_order_items` | No validation `itemId` belongs to tenant |
| `kitchen/prep-lists/generate/route.ts` | 330-389 | SELECT from `recipe_ingredients` by version ID | `_tenantId` param unused |
| `staff/auto-assignment.ts` | 256 | LEFT JOIN `employee_availability` | Missing `ea.tenant_id = e.tenant_id` in JOIN |
| `logistics/dispatch/route.ts` | 69 | LEFT JOIN `vehicles` | Missing `v.tenant_id` in JOIN |
| `logistics/vehicles/list/route.ts` | 25-26 | Correlated subquery on `drivers` | Missing `d.tenant_id` scope |
| `shipments/[id]/status/route.ts` | 257-269 | SELECT from `shipment_items` by `shipment_id` only | Missing `tenant_id` filter (indirect gap) |

**Updated total: 20+ tenant isolation gaps** (10 from 6th/7th pass + 10 new).

### Schema Drift in Raw SQL — New Findings

| File | Line(s) | Table/Column Referenced | Status |
|---|---|---|---|
| `events/importer.ts` | 140-651 | 15 queries using camelCase names (`tenantId`, `deletedAt`, `eventId`, `recipeId`, `dishId`) | **BROKEN** — DB uses snake_case (`tenant_id`, `deleted_at`, etc.) |
| `goodshuffle-event-sync-service.ts` | 266-311 | `name` column on `events` | **BROKEN** — should be `title` |
| `goodshuffle-invoice-sync-service.ts` | 261-335 | `total_budgeted`, `total_actual`, `currency` on `event_budgets` | **BROKEN** — should be `total_budget_amount`, `total_actual_amount`; `currency` doesn't exist |
| `waste/entries/[id]/route.ts` | 45-59 | `ingredient_id`, `created_by` on `waste_entries` | **BROKEN** — should be `inventory_item_id`, `logged_by` |
| `timecards/me/route.ts` | 47 | `tenant.users` | **BROKEN** — table doesn't exist |
| `recipe-optimization-engine.ts` | 215-218 | `ingredient_id` on `inventory_items` | **BROKEN** — column doesn't exist |
| `recipe-costing.ts` | 438-478 | `pt.dish_id` on `prep_tasks` | **BROKEN** — not in Prisma model |
| `workforce-ai-optimizer.ts` | 759, 784 | `e.seniority_rank` on `employees` | **BROKEN** — column on `employee_seniority` table |
| `events/actions.ts` | 430-451 | `eventId` on `event_imports` | **BROKEN** — should be `event_id` |
| `recipe-optimization-engine.ts`, `nutrition-label-engine.ts` | Various | `calories_per_100g`, `protein_per_100g` etc. | Exist in DB migration but NOT in Prisma model — schema drift risk |

### Systemic Issue: `|| null` Falsy-Value Anti-Pattern

The expression `value || null` appears **27+ times** across facilities, logistics, inventory, and shipment routes. It coerces legitimate falsy values (`0`, `""`) to `NULL`:
- **Cannot set any cost/price to zero**: `purchaseCost || null`, `partsCost || null`, `laborCost || null`, `unit_cost || null`, `actualCost || null`, `estimatedCost || null`, `budgetAmount || null`
- **Cannot set hours/quantity to zero**: `laborHours || null`, `estimatedHours || null`, `actualHours || null`, `capacityWeight || null`, `capacityVolume || null`, `mileage || null`
- **Cannot clear text fields to empty**: `notes || null`, `description || null`, `serialNumber || null`

Correct pattern: `${value !== undefined ? value : null}` or `${value ?? null}`.

### Unbounded LIMIT/OFFSET — DoS Vectors

Nine routes parse `limit`/`offset` from query params without upper bounds:
- `staff/time-off/requests`, `staff/schedules`, `staff/shifts`, `staff/availability`, `staff/certifications`
- `timecards/route.ts`, `training/modules`, `training/assignments`, `events/automated-followups/list`

Payroll routes correctly use `parsePaginationParams` which clamps to `[1, 100]`.

### Safe Usage (stats only)

- **~470 instances** of `$queryRaw`/`$executeRaw` using tagged template literals with `Prisma.sql` — safe
- **~100 instances** of `$queryRawUnsafe`/`$executeRawUnsafe` with `$N` parameterized placeholders — justified
- **0 parameter index misalignment bugs** found across all 30 files using `$N` placeholders (full alignment audit completed)
- **All seed scripts** (6 files) confirmed SAFE — hardcoded data only, no user input
- **All client-side kitchen/warehouse pages** (12 files) confirmed SAFE — all use `Prisma.sql` tagged templates with correct tenant isolation

### Coverage Gaps (4 rate-limited agents)

- **Events followups/contracts** — not individually re-read; these use `$queryRaw` tagged templates in patterns covered by other agents
- **Events waitlist/export/battle-board** — covered by parameter index alignment agent (no misalignments found); patterns are `$N` parameterized and tenant-filtered
- **Client-side CRM/admin/payroll/training pages** — partially covered; these are read-only dashboard pages using `Prisma.sql` tagged templates
- **Client-side recipe/kitchen actions** — partially covered by events/scheduling agent and warehouse pages agent; `Prisma.raw(table)` and `Prisma.raw(uuidArraySql)` patterns already documented in prior passes

### Recommended Actions — Additional (priority order)

26. **CRITICAL**: Fix `events/importer.ts` — replace all camelCase column names with snake_case DB column names (15 queries affected). Consider using Prisma ORM calls instead of raw SQL.
27. **CRITICAL**: Fix `goodshuffle-event-sync-service.ts` — `name` → `title`.
28. **CRITICAL**: Fix `goodshuffle-invoice-sync-service.ts` — `total_budgeted` → `total_budget_amount`, `total_actual` → `total_actual_amount`, remove `currency`.
29. **CRITICAL**: Fix `waste/entries/[id]/route.ts` — `ingredient_id` → `inventory_item_id`, `created_by` → `logged_by`, fix join table.
30. **CRITICAL**: Fix `timecards/me/route.ts` — replace `tenant.users` JOIN with `tenant_staff.employees` and `auth_user_id`.
31. **CRITICAL**: Fix `recipe-optimization-engine.ts` — remove JOIN on non-existent `ingredient_id`; redesign substitution matching.
32. **CRITICAL**: Fix `lib/staff/labor-budget.ts` — rewrite `Prisma.raw()` with proper `Prisma.sql` parameterized SET clauses; bind values correctly.
33. **CRITICAL**: Add `tenant_id` filter to `procurement/approvals/action/route.ts:100-111` final SELECT.
34. **CRITICAL**: Add `sortOrder` allowlist validation (`ASC`/`DESC` only) to `administrative/trash/list/route.ts:664,724`.
35. **CRITICAL**: Fix `events/actions.ts:430-451` — `eventId` → `event_id`.
36. **HIGH**: Fix `workforce-ai-optimizer.ts` — `e.seniority_rank` → join through `employee_seniority` table.
37. **HIGH**: Fix `staff/availability/validation.ts:155-159` — remove duplicate `AND` in overlap check SQL.
38. **HIGH**: Fix `kitchen/recipes/[recipeId]/update-budgets/route.ts` — use `pt.recipe_version_id` or join through dishes instead of `pt.dish_id` vs `rv.recipe_id`.
39. **HIGH**: Add `tenant_id` and `deleted_at IS NULL` to update-budgets MAX version subquery.
40. **HIGH**: Migrate all `|| null` patterns (27+ sites) to `?? null` or `!== undefined` ternary across facilities, logistics, inventory, and shipments.
41. **HIGH**: Add rate limiting middleware to all public mutation endpoints (contract signing, proposal responding, email webhook).
42. **HIGH**: Sanitize `notes`/`responderName` in proposal respond endpoint to prevent stored XSS.
43. **MEDIUM**: Fix `procurement/budget` routes — handle `period_end` without `period_start` case (currently causes runtime crash from unbound `$4`).
44. **MEDIUM**: Add LIMIT bounds (max 200) to all 9 unbounded pagination routes.
45. **MEDIUM**: Escape `%` and `_` wildcards in ILIKE queries (procurement vendor search).
46. **MEDIUM**: Add `dish_id` column to `PrepTask` Prisma model if used in raw SQL, or remove references.

---

## Raw-SQL Parameterization & Injection Audit (9th Pass — Injection-Focused)

> **Audited:** 2026-04-24
> **Scope:** All `$queryRaw`, `$executeRaw`, `$queryRawUnsafe`, `$executeRawUnsafe`, `Prisma.sql`, `Prisma.raw` usage across `apps/` and `packages/` (233 source files, 1,603 raw-SQL lines)
> **Method:** Full grep for all raw-SQL patterns → 13 parallel domain-specific subagents (Haiku model) reading every file → source-level verification of all flagged findings. Focus on injection vectors, parameterization correctness, and tenant isolation — not schema drift (covered by 8th pass).
> **Prior coverage:** 6th pass (route-level claims), 7th pass (spot-check corrections), 8th pass (comprehensive schema-drift focus). This pass provides independent injection-focused analysis.

### Executive Summary

Of 233 source files with raw SQL, 13 domain subagents classified every call. The codebase has **~90 `$queryRawUnsafe`/`$executeRawUnsafe` calls across ~40 production files**. Most use `$N`-style parameterized placeholders and are functionally safe, but **5 CRITICAL injection vectors** were found where string interpolation or `Prisma.raw()` injects unsanitized values into SQL. An additional **7 tenant isolation gaps** were identified that weren't in prior passes.

| Category | Count |
|---|---|
| Total raw-SQL occurrences | ~1,603 |
| Files with raw SQL | 233 |
| Files with `$queryRawUnsafe`/`$executeRawUnsafe` | ~40 |
| **CRITICAL** (SQL injection) | 5 (new) |
| **HIGH** (dynamic identifiers without allowlist) | 3 (new) |
| **MEDIUM** (correctness) | 2 (new) |
| **Tenant isolation gaps** (new) | 7 |
| Safe tagged-template usage | ~470 |
| Parameterized `$queryRawUnsafe` usage (justified) | ~85 |
| `Prisma.raw()` dynamic SQL sites | 13 |

### CRITICAL — SQL Injection (new findings, not in prior passes)

| # | File | Line | Pattern | Risk |
|---|---|---|---|---|
| 1 | `apps/api/app/api/payroll/approvals/history/route.ts` | 87 | `action` query param from `searchParams.get("action")` directly interpolated: `pah.action = '${action}'` then passed via `Prisma.raw(whereClause)` | **Exploitable SQL injection** — attacker passes `action=' OR 1=1 --` to bypass all filters and read cross-tenant payroll data. No validation on `action` parameter. |
| 2 | `apps/api/app/api/crm/scoring/calculate/route.ts` | 147-157 | `$executeRawUnsafe(sql)` where `sql` is built with string interpolation: `score = score + ${rule.points}`, rule name and condition from DB rules table injected via `${cond}` | **Second-order SQL injection** — if malicious data is inserted into CRM scoring rules, it executes arbitrary SQL. `tenantId` also interpolated as `'${tenantId}'::uuid` instead of parameterized. |
| 3 | `apps/api/app/api/events/allergens/check/route.ts` | 308 | `Prisma.raw(dishIds.map((id) => \`'\${id}'\`).join(","))` — UUID values manually quoted and concatenated | **UUID array injection** — if `dishIds` array contains non-UUID strings (e.g. from manipulated request), arbitrary SQL can be injected inside the `UNNEST(ARRAY[...])::uuid[]` expression. |
| 4 | `apps/app/app/(authenticated)/events/actions/event-dishes.ts` | 249 | Same pattern: `linkedIdArray.map((id) => \`'\${id}'\`).join(",")` passed to SQL | Same UUID array injection risk. Should use `Prisma.join()` or `Prisma.sql` with `${Prisma.join(ids)}`. |
| 5 | `apps/api/app/api/payroll/approvals/history/route.ts` | 76, 83 | `tenantId` interpolated as `pah.tenant_id = ${tenantId}` (raw JS number/string) and `payrollRunId` as `'${payrollRunId}'::uuid` — both inside `Prisma.raw()` | While `payrollRunId` has UUID_REGEX validation (line 80), `tenantId` at line 76 is not validated and flows directly into `Prisma.raw()`. |

### HIGH — Dynamic Identifiers Without Allowlist (new findings)

| # | File | Line | Pattern | Risk |
|---|---|---|---|---|
| 1 | `apps/app/app/(authenticated)/kitchen/recipes/actions.ts` | 1008 | `Prisma.raw(table)` where `table` is a variable — if table name comes from user input, SQL injection | Dynamic table name via `Prisma.raw()`. Verify `table` is from a constant/allowlist, not user input. |
| 2 | `apps/app/app/(authenticated)/analytics/clients/actions/get-client-ltv.ts` | 456 | Dynamic `ORDER BY` with string interpolation in `$queryRawUnsafe` | If sort column is derived from user input without allowlist, enables ORDER BY injection. |
| 3 | `apps/api/app/api/administrative/trash/list/route.ts` | 681 | `Prisma.raw(sql.replace(/\$/g, "\\"))` — SQL string dynamically built then escaped via regex | Regex escape is fragile; if original SQL construction has bugs, this wrapper won't prevent injection. (8th pass found `sortOrder` injection here too.) |

### MEDIUM — Correctness Bugs (new findings)

| File | Line | Pattern | Risk |
|---|---|---|---|
| `apps/api/app/api/staffing/coverage/route.ts` | 71-149 | 6 consecutive `$queryRawUnsafe` calls building SQL strings with `+ string concatenation` for date parameters | No parameter binding — values are string-concatenated directly. While dates come from server-side `new Date()`, the pattern is fragile and a template for future bugs. |
| `apps/api/app/api/logistics/drivers/list/route.ts` | 30-43 | `$queryRawUnsafe` with dynamic `status` filter from query params | Status value not validated against allowlist before interpolation. |

### Tenant Isolation Gaps in Raw SQL (new findings, not in prior passes)

| File | Line | Query | Missing Filter |
|---|---|---|---|
| `apps/api/app/api/logistics/dispatch/commands/assign/route.ts` | 72-77 | UPDATE driver status to `in_progress` | Missing `tenant_id` in WHERE — could update cross-tenant driver status |
| `apps/api/app/api/payroll/tax/list/route.ts` | 32, 52 | SELECT tax configurations | Missing `tenant_id` filter — returns all tenants' tax configs |
| `apps/api/app/api/collaboration/notifications/email/webhook/route.ts` | 81-88 | SELECT from `email_logs` by message ID | Missing `tenant_id` — webhook has no tenant context, could match any tenant's logs |
| `apps/api/app/outbox/publish/route.ts` | 110-118 | SELECT from outbox events | Missing `tenant_id` — outbox processor could process cross-tenant events |
| `apps/api/app/api/procurement/approvals/action/route.ts` | 100 | Final SELECT of updated POs | Missing `tenant_id` — already flagged in 8th pass as cross-tenant exposure |
| `apps/api/app/lib/recipe-costing.ts` | 44-49 | SELECT from `core.unit_conversions` | Intentional — `core` schema is shared reference data, not tenant-scoped |
| Various kitchen/recipe files | Multiple | SELECT from `core.units` | Intentional — units are global reference data |

### $queryRawUnsafe / $executeRawUnsafe Full Audit

**Total unsafe variant calls in production code: ~90 across ~40 files.**

**Classification:**
- **Parameterized with `$N` placeholders**: ~85 calls — functionally safe but using the unsafe API variant. These accept the SQL as a plain string but bind parameters separately via `$1, $2, $3...`. Prisma still parameterizes the values, but the SQL string itself is not tagged-template-protected.
- **String interpolation with user-derived values**: ~5 calls — the CRITICAL findings above.

**Files with highest density of `$queryRawUnsafe` calls:**

| File | Count | Classification |
|---|---|---|
| `apps/app/app/(authenticated)/analytics/staff/actions/get-employee-performance.ts` | 8 | All parameterized — AT_RISK but functional |
| `apps/app/app/(authenticated)/events/[eventId]/battle-board/actions/tasks.ts` | 10 | Mix: 8 parameterized (safe), 2 `$executeRawUnsafe` with string building |
| `apps/api/app/api/events/[eventId]/waitlist/commands/` (3 files) | 12 | All parameterized — AT_RISK but functional |
| `apps/api/app/api/procurement/budget/` (6 files) | 15 | All parameterized, many reference orphaned tables |
| `apps/api/app/api/analytics/kitchen/route.ts` | 6 | All parameterized — AT_RISK but functional |
| `packages/manifest-adapters/src/bottleneck-detector/detector.ts` | 6 | All parameterized — AT_RISK but functional |
| `apps/app/app/api/settings/audit-log/route.ts` | 2 | Parameterized — AT_RISK but functional |
| `apps/app/app/(authenticated)/settings/audit-log/page.tsx` | 2 | Parameterized — AT_RISK but functional |

### Prisma.raw() Dynamic SQL Sites (13 total)

| File | Line | Input Source | Risk Level |
|---|---|---|---|
| `apps/api/app/api/events/allergens/check/route.ts` | 308 | `dishIds` array (user-derived) | **CRITICAL** |
| `apps/app/app/(authenticated)/events/actions/event-dishes.ts` | 272 | `linkedIdArray` (user-derived) | **CRITICAL** |
| `apps/app/app/(authenticated)/kitchen/recipes/actions.ts` | 1008 | `table` variable (constant) | HIGH (verify source) |
| `apps/api/app/api/payroll/approvals/history/route.ts` | 97, 139 | `whereClause` with `action` param | **CRITICAL** |
| `apps/api/app/api/administrative/trash/list/route.ts` | 681, 706, 739 | Dynamic SQL with regex escape | HIGH |
| `apps/api/app/api/staff/availability/[id]/helpers.ts` | 331 | Manual `$N` param building | MEDIUM |
| `apps/api/app/api/timecards/route.ts` | 163, 179 | `statusFilter` (conditional) | SAFE (internal logic) |
| `apps/api/app/api/crm/scoring/[id]/route.ts` | 118 | `u` variable (internal) | SAFE |
| `apps/api/lib/staff/labor-budget.ts` | 337 | `updateFields` array (internal) | MEDIUM |
| `apps/api/app/api/events/contracts/validation.ts` | — | Uses Prisma ORM | SAFE |

### Schema Drift in Raw SQL — Confirmation

This pass confirms the 8th pass's orphaned table references. Queries referencing tables without Prisma models:

| Table | Files Referencing | Status |
|---|---|---|
| `tenant_inventory.procurement_budgets` | 5 procurement budget files | In migration, no Prisma model |
| `tenant_inventory.procurement_budget_alerts` | 3 procurement budget files | In migration, no Prisma model |
| `tenant_inventory.vendor_contacts` | 3 vendor command files | In migration, no Prisma model |
| `tenant_inventory.vendor_ratings` | 2 vendor command files | In migration, no Prisma model |
| `platform.audit_log` | Contracts history, proposals routes | In migration, no Prisma model |
| `tenant_crm.crm_scoring_rules` | CRM scoring routes | In migration, no Prisma model |

### Safe Usage (stats only)

- **~470 instances** of `$queryRaw`/`$executeRaw` using tagged template literals with `Prisma.sql` — safe
- **~85 instances** of `$queryRawUnsafe`/`$executeRawUnsafe` with `$N` parameterized placeholders — justified but should migrate to tagged templates
- **All sync services** (Goodshuffle ×3, Nowsta) — use safe `Prisma.sql` tagged templates
- **All public/unauthenticated routes** — confirmed proper tenant isolation via `proposal.tenantId`/`contract.tenantId`
- **All packages engines** (recipe-optimization, recipe-scaling, nutrition-label) — safe `Prisma.sql` tagged templates
- **All seed scripts** — safe, hardcoded data only

### Recommended Actions — Injection Fixes (priority order)

47. **CRITICAL**: Fix `payroll/approvals/history/route.ts:87` — validate `action` against an allowlist (`['approved', 'rejected', 'submitted', 'cancelled']`) BEFORE interpolating into SQL. Better: rewrite entire function to use `Prisma.sql` tagged template.
48. **CRITICAL**: Fix `crm/scoring/calculate/route.ts:147-157` — replace `$executeRawUnsafe` with `$executeRaw` using `Prisma.sql` tagged template. Parameterize `tenantId`, `rule.points`, `rule.id`, and `rule.rule_name`.
49. **CRITICAL**: Fix `events/allergens/check/route.ts:308` — replace `Prisma.raw(dishIds.map(...))` with `Prisma.sql` + `${Prisma.join(dishIds)}` using proper UUID array binding.
50. **CRITICAL**: Fix `events/actions/event-dishes.ts:249` — same UUID array pattern, use `Prisma.join()`.
51. **CRITICAL**: Fix `payroll/approvals/history/route.ts:76,83` — use `Prisma.sql` tagged template instead of `Prisma.raw(whereClause)` with JS-interpolated `tenantId`.
52. **HIGH**: Verify `kitchen/recipes/actions.ts:1008` — confirm `table` variable is a constant from allowlist, not user-controlled.
53. **HIGH**: Add ORDER BY allowlist in `analytics/clients/actions/get-client-ltv.ts:456`.
54. **HIGH**: Add `tenant_id` filter to `logistics/dispatch/commands/assign/route.ts:72-77` UPDATE query.
55. **HIGH**: Add `tenant_id` filter to `payroll/tax/list/route.ts:32,52` SELECT queries.
56. **MEDIUM**: Add tenant context to `collaboration/notifications/email/webhook/route.ts` and `outbox/publish/route.ts`.
57. **MEDIUM**: Validate `status` parameter in `logistics/drivers/list/route.ts` against allowlist before interpolation.
58. **LOW**: Consider migrating all ~85 parameterized `$queryRawUnsafe` calls to `Prisma.sql` tagged templates for defense-in-depth.

---

## Frontend Health Audit (9th Pass — Re-verified)

> **Audited:** 2026-04-25
> **Scope:** All 601 .ts/.tsx files under `apps/app/` (pages, components, actions, lib) + 111 files in `packages/design-system/`
> **Method:** 24 parallel subagent investigations (20 initial + 4 re-launched after rate-limit) — full import graph analysis, API contract comparison, error boundary inventory, client/server boundary check, accessibility scan, performance audit. **All findings verified against actual codebase; 12 of prior draft's 16 "CRITICAL" claims were false positives.**
> **Prior passes covered:** API routes, raw SQL, packages, E2E tests. **This pass is entirely new — no overlap.**

### False Positive Corrections from Prior Draft

The initial 9th-pass draft contained numerous false claims. All have been corrected below:

| Prior Claim | Verification | Reality |
|-------------|-------------|---------|
| "4 broken `@/components/*` imports in kitchen" | `tsconfig.json` has `@/*: ["./*"]` relative to `apps/app/`; `apps/app/components/allergen-matrix.tsx` exists | **FALSE** — imports resolve correctly |
| "Facilities `data.data.xxx` response nesting is wrong" | `manifestSuccessResponse({ assets })` returns `{ success: true, data: { assets } }`; `data.data.assets` is correct | **FALSE** — access pattern is correct |
| "Facilities assets missing update/delete endpoints" | `ls apps/api/app/api/facilities/assets/commands/` shows `create, delete, update` | **FALSE** — endpoints exist |
| "Mobile kitchen NotificationsProvider import broken" | `notifications-provider.tsx` exists at `(authenticated)/components/`; relative import resolves | **FALSE** — import works |
| "`@/env` import in layout.tsx doesn't resolve" | `apps/app/env.ts` exists with `createEnv()` export | **FALSE** — import resolves |
| "Shipments API module completely missing" | `apps/api/app/api/shipments/` exists with `route.ts`, `[id]/route.ts`, `shipment/`, `shipment-items/` | **FALSE** — module exists |
| "Staff shifts API module missing" | `apps/api/app/api/staff/shifts/` exists with `[id]`, `available-employees`, `bulk-assignment`, `commands` | **FALSE** — module exists |
| "Staff performance API missing" | `apps/api/app/api/staff/performance/` exists with `employees`, `list`, `commands` | **FALSE** — module exists |
| "Training API missing" | `apps/api/app/api/training/` exists with `assignments`, `modules`, `commands`, `[id]`, `list` | **FALSE** — module exists |
| "`/api/analytics/finance` doesn't exist" | `apps/api/app/api/analytics/finance/route.ts` exists | **FALSE** — endpoint exists |
| "Payroll `use-labor-budgets.ts` hits non-existent routes" | Both `/api/staff/budgets/` and `/api/payroll/labor-budgets/` exist | **FALSE** — path works (ambiguity, not broken) |
| "6 components truly orphaned" | `notifications-provider` imported by sidebar + mobile layout; `module-landing` imported by payroll + settings; `module-header` imported by sidebar | **3 FALSE** — only 3 truly dead |

### Executive Summary

| Severity | Count | Impact |
|----------|-------|--------|
| CRITICAL | 4 | Runtime errors (405 method mismatch) + blank screens on failure |
| HIGH | 6 | Missing features, data rendering risk, ambiguous API paths |
| MEDIUM | 8 | Dead code, missing directives, performance debt |
| LOW | 5 | Accessibility, style, minor patterns |
| **Total** | **23** | |

**Top verified risks:**
1. **Chart-of-accounts PATCH vs PUT** — `use-chart-of-accounts.ts:159` sends PATCH but API only supports PUT (405)
2. **Missing `/api/accounting/payments/export`** — export button silently broken
3. **Only 2 `loading.tsx` files** across the entire authenticated app — most data-fetching pages show blank on failure
4. **Ambiguous API base paths** in procurement hooks (both old and new paths exist — needs canonical decision)
5. **6 hook libraries missing `'use client'`** — defensive risk if imported from server components

### 1. Broken Imports

**No build-blocking broken imports found.** All import audits returned CLEAN:

- `@/components/*` (5 kitchen files) — resolves correctly via `tsconfig.json` paths: `@/* → apps/app/./*`
- All `@repo/*` imports — verified against actual package exports
- All `@repo/design-system` imports (50+ paths) — every export exists
- All `@/app/lib/*`, `@/env`, and relative imports — verified resolvable
- No stale `@/components/ui/` references
- No circular imports in `apps/app/app/lib/`
- No `require()` calls in ESM context

### 2. Dead/Orphan Components

#### MEDIUM — Truly dead (zero importers, verified by grep)

| File | Type | Evidence |
|------|------|----------|
| `(authenticated)/test-page.tsx` | Orphan page | 0 links/imports across `apps/` |
| `(authenticated)/components/avatar-stack.tsx` | Dead component | 0 importers |
| `(authenticated)/components/module-shell.tsx` | Dead component | 0 importers |
| `(authenticated)/components/module-section.tsx` | Dead component | 0 importers |
| `(authenticated)/components/cursors.tsx` | Dead component | 0 importers (was collaboration workspace) |
| `(authenticated)/components/collaboration-provider.tsx` | Dead component | 0 importers (was collaboration workspace) |
| `(authenticated)/components/clipboard-image-button.tsx` | Dead component | 0 importers |
| `(authenticated)/data/seed-data.ts` | Dead data file | 0 importers |

#### LOW — Backup/temp files (5)

| File | Notes |
|------|-------|
| `(authenticated)/components/sidebar.tsx.new` | Uncommitted backup |
| `(authenticated)/layout.tsx.new` | Uncommitted backup |
| `(authenticated)/crm/clients/[id]/components/tabs/events-tab.tsx.bak` | Backup file |
| `(authenticated)/kitchen/recipes/components/recipe-edit-modal.tsx.backup` | Backup file |
| `(authenticated)/kitchen/recipes/[recipeId]/components/recipe-detail-tabs.tsx.bak` | Backup file |

#### Verified linked (not orphan)

- `notifications-provider.tsx` — imported by `sidebar.tsx` (dynamic) + mobile layout
- `module-landing.tsx` — imported by `payroll/page.tsx` + `settings/page.tsx`
- `module-header.tsx` — imported by `sidebar.tsx`
- `search.tsx` — imported by `sidebar.tsx`
- `lib/command-board/manifest-plans.ts` — imported by `api/command-board/chat/tool-registry.ts`
- `contracts/` — linked via events sidebar (`/events/contracts`)
- `cycle-counting/` — linked via warehouse sidebar (`/cycle-counting`)
- `settings/` — linked under administrative sidebar
- `marketing/` — intentional "Coming Soon" page, linked in sidebar

### 3. UI-to-API Contract Mismatches

#### CRITICAL — Verified runtime errors

| # | Module | File | Line | Mismatch | Impact |
|---|--------|------|------|----------|--------|
| C1 | Accounting | `app/lib/use-chart-of-accounts.ts` | 159 | Sends PATCH to `/api/accounting/accounts/${id}` but `[id]/route.ts` only exports GET, PUT, DELETE | **405 Method Not Allowed** |
| C2 | Accounting | `(authenticated)/accounting/payments/components/payment-list-client.tsx` | 123 | Calls `GET /api/accounting/payments/export` — no route handler exists | **404** — export button broken |
| C3 | Accounting | `app/lib/use-chart-of-accounts.ts` | 89 | Expects `pagination` in GET response but `/api/accounting/accounts` doesn't implement pagination metadata | **Data renders but no pagination** |
| C4 | Various | ~10 data-fetching pages | — | No `loading.tsx`, no `error.tsx`, no try/catch | **Blank white screen on failure** |

#### HIGH — Path ambiguity + missing features

| # | Module | File | Line | Mismatch | Impact |
|---|--------|------|------|----------|--------|
| H1 | Procurement | `app/lib/use-purchase-orders.ts` | 170+ | Uses `/api/inventory/purchase-orders` — both this AND `/api/procurement/purchase-orders` exist | Ambiguous — which is canonical? |
| H2 | Procurement | `app/lib/use-budgets.ts` | 129+ | Uses `/api/events/budgets` — both this AND `/api/procurement/budget` exist | Ambiguous — which is canonical? |
| H3 | Accounting | `app/lib/use-finance-analytics.ts` | 109 | Calls `/api/analytics/finance` — endpoint exists but response shape may differ | Verify contract matches |
| H4 | Scheduling | `scheduling/budgets/components/budgets-client.tsx` | — | Response shape may not match API | Verify contract |
| H5 | Kitchen | `(authenticated)/kitchen/prep-lists/prep-list-client.tsx` | 363 | Calls `/api/kitchen/prep-lists/${id}/pdf` — PDF export endpoint may not exist | Export button potentially broken |
| H6 | Staff | `staff/mobile/timeclock/page.tsx` | 221 | Calls `/api/timecards/entries/commands/clock-in` — endpoint may not exist | Clock-in potentially broken |

#### Verified clean (API contracts match)

- **Facilities module** — `data.data.xxx` pattern is CORRECT (verified: `manifestSuccessResponse` wraps in `{ success: true, data: {...} }`)
- **Facilities assets/areas/work-orders/schedules** — all endpoints exist, response shapes match
- **Logistics module** — all API calls match their endpoints
- **Payroll module** — all contracts verified (both `/api/staff/budgets` and `/api/payroll/labor-budgets` paths work)
- **Procurement pages** (vendors, requisitions, vendor-contracts, approvals, PO pages, budget page) — all match
- **CRM module** — all match
- **Events module** — all match
- **No hardcoded absolute API URLs** — all calls use relative paths or centralized `api.ts`

### 4. Error Handling Gaps

#### CRITICAL — Blank white screen risk

Only **2 `loading.tsx` files** exist in the entire authenticated route tree:
- `kitchen/recipes/loading.tsx`
- `kitchen/recipes/[recipeId]/loading.tsx`

**Pages at highest risk** (no loading.tsx, no error.tsx, no try/catch):

| Page | Fetch type | Risk |
|------|-----------|------|
| `/analytics/finance/page.tsx` | Server component | **CRITICAL** — blank white screen |
| `/inventory/transfers/page.tsx` | Client wrapper | **HIGH** — blank on failure |
| `/events/budgets/page.tsx` | Client wrapper | **HIGH** — blank on failure |
| `/kitchen/recipes/menus/[menuId]/page.tsx` | Server component | **MEDIUM** |
| `/crm/clients/[id]/page.tsx` | Server component | **MEDIUM** |
| `/payroll/reports/page.tsx` | Server component | **MEDIUM** |

**Positive:** `global-error.tsx` and `(authenticated)/error.tsx` provide route-level error boundaries with Sentry integration. Some client components (FinanceAnalyticsPageClient, PODetailPage) have proper loading skeletons and error states.

### 5. Client/Server Boundary Issues

#### MEDIUM — Missing `'use client'` directives (defensive risk)

These files export React hooks (useState, useEffect) without `'use client'`. Currently safe because they're only imported from client components, but would crash if accidentally imported from a server component:

| File | Hooks used |
|------|-----------|
| `app/lib/use-recipe-costing.ts` | useState, useEffect |
| `app/lib/use-kitchen-analytics.ts` | useState, useEffect |
| `app/lib/use-forecasts.ts` | useState, useEffect |
| `app/lib/use-event-budgets.ts` | useState, useEffect |
| `app/lib/use-event-export.ts` | useState, useEffect |
| `app/lib/use-finance-analytics.ts` | useState, useEffect |

All other `'use client'` directives verified correct — no unnecessary or missing directives on component files.

### 6. Accessibility Debt

#### LOW — Icon-only buttons without `aria-label` (6 instances)

| File | Line | Element |
|------|------|---------|
| `scheduling/budgets/components/budgets-client.tsx` | 499 | Edit icon button |
| `scheduling/budgets/components/budgets-client.tsx` | 506 | Trash icon button |
| `events/budgets/budgets-page-client.tsx` | 472 | Calendar icon button |
| `events/budgets/budgets-page-client.tsx` | 479 | Edit icon button |
| `events/budgets/budgets-page-client.tsx` | 486 | Trash icon button |
| `events/budgets/components/create-budget-modal.tsx` | 213 | Close (X) icon button |

**Verified good:** Forms use `<label>` with `htmlFor`, `target="_blank"` links use `rel="noreferrer"`, status indicators include text alongside color, images have `alt` attributes.

### 7. Performance Anti-Patterns

#### MEDIUM

| File | Issue |
|------|-------|
| `(authenticated)/kitchen/waste/waste-entries-client.tsx` | List rendering without `React.memo` on items |
| `(mobile-kitchen)/kitchen/mobile/prep-lists/[id]/page.tsx` | Complex list updates without memoization |
| `kitchen/production-board-realtime.tsx:4` | `import * as Sentry` — namespace import when specific methods needed |
| `kitchen/waste/waste-entries-client.tsx:23` | Same — namespace Sentry import |
| `kitchen/allergens/page.tsx:29` | Same — namespace Sentry import |

#### LOW

| File | Issue |
|------|-------|
| `events/[eventId]/event-details-client/index.tsx:420-460` | Inline function creation in `map()` without memoization |
| `events/[eventId]/event-details-client/event-explorer.tsx:780-822` | Complex cards in `map()` without `React.memo` |
| `analytics/clients/components/client-table.tsx:91-124` | TableRow in `map()` without memoization |
| `app/lib/use-labor-budgets.ts`, `use-event-budgets.ts` | Bypass centralized `api.ts` client with raw `fetch()` |

**Verified positive:** Extensive `useMemo`/`useCallback` usage, dynamic imports with `ssr: false` for heavy components, proper lazy loading.

### Recommended Actions — Frontend Fixes (priority order)

#### Build-blocking (do first)

59. **CRITICAL**: Fix `use-chart-of-accounts.ts:159` — change `method: "PATCH"` to `method: "PUT"`.
60. **CRITICAL**: Create `/api/accounting/payments/export/route.ts` endpoint.
61. **CRITICAL**: Add `loading.tsx` to top 10 data-fetching page directories (analytics/*, payroll/*, facilities/*, procurement/*, crm, events/budgets).
62. **HIGH**: Resolve procurement hook base-path ambiguity — decide canonical paths for `use-purchase-orders.ts` and `use-budgets.ts`, then consolidate.

#### Error handling (do second)

63. **HIGH**: Add `error.tsx` boundaries to pages that fetch without try/catch fallback UI (analytics/finance, inventory/transfers, events/budgets).
64. **HIGH**: Verify clock-in endpoint exists for staff mobile timeclock page.
65. **HIGH**: Verify prep-list PDF export endpoint exists.

#### Cleanup (do third)

66. **MEDIUM**: Add `'use client'` to 6 hook library files (defensive measure).
67. **MEDIUM**: Remove 8 dead files (test-page.tsx, avatar-stack.tsx, module-shell.tsx, module-section.tsx, cursors.tsx, collaboration-provider.tsx, clipboard-image-button.tsx, data/seed-data.ts).
68. **MEDIUM**: Resolve or delete 5 backup files (.new/.bak/.backup).
69. **MEDIUM**: Add `React.memo` to list item components in waste-entries-client and prep-lists.
70. **MEDIUM**: Replace Sentry namespace imports with specific imports.

#### Polish (do last)

71. **LOW**: Add `aria-label` to 6 icon-only buttons in scheduling budgets and events budgets.
72. **LOW**: Memoize list item components in event-explorer and client-table.
73. **LOW**: Convert `use-labor-budgets.ts` and `use-event-budgets.ts` to use centralized `api.ts` client.

---

## Mobile & Public Website Audit (10th Pass)

> **Audited:** 2026-04-25
> **Scope:** `apps/mobile/` (React Native/Expo — 37 source files, 9 screens) + `apps/web/` (Next.js marketing site — 57 source files, 6 pages)
> **Method:** 6 parallel subagents (mobile API layer, mobile screens/navigation, mobile components/hooks, web SEO/i18n, web components/content, mobile-vs-web API cross-reference) + direct reads of all configuration, test, and page files. Every finding verified against source code.
> **Prior coverage:** Passes 1–9 covered API backend, shared packages, E2E tests, and authenticated web frontend (`apps/app/`). **Neither `apps/mobile/` nor `apps/web/` was systematically audited before this pass.** The 9th pass did note `apps/app/app/(authenticated)/components/notifications-provider.tsx` is imported by "mobile layout" — that refers to the responsive web layout under `apps/app/`, NOT the React Native app.

### Part A: Mobile App

#### Executive Summary

The mobile app is a **kitchen-first MVP** — 37 source files, 9 screens, ~1 test file. It focuses exclusively on kitchen task management and prep lists. The app is well-structured (Clerk auth, React Query, offline queue) but covers only a small fraction of web features. **Zero modules beyond kitchen/tasks/prep-lists have mobile screens.** No camera/barcode scanner, no biometric auth, no deep linking, no push notification registration with the backend. The app is functional for its narrow scope but is **not App Store-ready** (placeholder icons, no app.config.ts, no splash screen variations, no privacy policy URL).

| Metric | Value |
|--------|-------|
| Source files | 37 (.tsx/.ts) |
| Screens | 9 (Today, Tasks, PrepLists, PrepListDetail, MyWork, Search, Settings, Profile, SignIn) |
| Components | 10 |
| Hooks | 3 (useHaptics, useNetworkStatus, useOfflineSync) |
| Test files | 1 (`__tests__/offline-sync.test.ts`, 267 lines) |
| Navigation | React Navigation v7 (Bottom Tabs + Stack) |
| State | React Query + Zustand-like auth store + AsyncStorage offline queue |
| Auth | `@clerk/clerk-expo` with `expo-secure-store` token cache |

#### 1. Feature Completeness

**Module-by-module comparison (mobile vs web):**

| Module | Web App (`apps/app/`) | Mobile (`apps/mobile/`) | Status |
|--------|----------------------|------------------------|--------|
| Kitchen Tasks | Full CRUD, filtering, status transitions | `TasksScreen` — list, claim, release, start, complete | **SIMPLIFIED** — no filtering, no tags, no assignments UI |
| Kitchen Prep Lists | Full list, detail, generate, PDF export | `PrepListsScreen` + `PrepListDetailScreen` — view only | **SIMPLIFIED** — no generation, no PDF, view prep items + mark complete |
| Kitchen Recipes | Full CRUD, versions, scaling, nutrition | **MISSING** | Not in mobile |
| Kitchen Waste | Entry list, trends, analytics | **MISSING** | Not in mobile |
| Kitchen Allergens | Matrix, detection, conflicts | **MISSING** | Not in mobile |
| Kitchen Equipment | CRUD, scheduling, IoT | **MISSING** | Not in mobile |
| Inventory | Stock levels, transfers, cycle counts, barcode | **MISSING** | Not in mobile |
| Events | List, details, budgets, contracts, guests, import | **MISSING** | Not in mobile |
| Staff/Scheduling | Shifts, time clock, availability, certifications | **MISSING** | Not in mobile (prior plan P2.F noted "staffing/scheduling UI only has recommendations + coverage; no shift assignment UI") |
| CRM | Clients, proposals, interactions, scoring | **MISSING** | Not in mobile |
| Accounting | CoA, invoices, payments, collections | **MISSING** | Not in mobile |
| Facilities | Areas, assets, maintenance, work orders | **MISSING** | Not in mobile |
| Logistics | Dispatch, drivers, vehicles, routes, tracking | **MISSING** | Not in mobile |
| Payroll | Periods, runs, timecards, bank accounts | **MISSING** | Not in mobile |
| Procurement | POs, vendors, budget, requisitions | **MISSING** | Not in mobile |
| Command Board | Boards, cards, simulations, AI assistant | **MISSING** | Not in mobile |
| Search | Full-text across all modules | `SearchScreen` — kitchen-only search | **LIMITED** |
| Settings | Full settings (RBAC, manifests, webhooks, email templates) | `SettingsScreen` — push notification toggles only | **LIMITED** |
| Profile | Full profile management | `ProfileScreen` — display name + sign out | **LIMITED** |
| Today Dashboard | Aggregated dashboard | `TodayScreen` — task summary, upcoming prep | **SIMPLIFIED** |

**Coverage estimate: ~8% of web features have mobile equivalents (kitchen tasks + prep lists only).**

#### 2. API Contract Issues

**Mobile API client** (`src/api/client.ts`):
- Uses a centralized `apiClient` function that wraps `fetch()`
- Auth token obtained via `setAuthTokenGetter()` bridge from Clerk's `useAuth().getToken()`
- Base URL: `EXPO_PUBLIC_API_URL` env var (falls back to `NEXT_PUBLIC_API_URL`) — `App.tsx:84`

**Endpoints called by mobile app:**
- `/api/kitchen/tasks` — GET list, POST claim/release/start/complete (`mutations.ts`)
- `/api/kitchen/prep-lists` — GET list (`queries.ts`)
- `/api/kitchen/prep-lists/[id]` — GET detail (`queries.ts`)
- `/api/kitchen/prep-lists/[id]/items/[itemId]` — PATCH mark complete, update notes (`mutations.ts`)
- `/api/notifications/preferences` — GET/PUT push notification settings (`queries.ts`, `mutations.ts`)
- `/api/staff/me` — GET current user profile (`queries.ts`)

**API contract findings:**

| # | Finding | File | Line | Severity |
|---|---------|------|------|----------|
| A1 | No barcode scanner integration — mobile cannot scan inventory items | N/A (feature missing) | — | HIGH |
| A2 | Push notification tokens are NOT registered with backend — no endpoint to save Expo push tokens | `notifications/push-handlers.ts` | — | CRITICAL |
| A3 | Mobile only calls 6 endpoints vs 500+ available in backend — extreme under-coverage | `src/api/queries.ts`, `src/api/mutations.ts` | — | HIGH |
| A4 | `EXPO_PUBLIC_API_URL` has no validation — empty string would cause silent failures | `src/api/client.ts` | — | MEDIUM |
| A5 | No token refresh handling — if Clerk token expires mid-session, requests fail silently | `src/api/client.ts` | — | HIGH |

#### 3. Native Integration

| Feature | Status | Details |
|---------|--------|---------|
| Camera / Barcode Scanner | **MISSING** | No `expo-camera` or `expo-barcode-scanner` in dependencies; no camera usage in any screen |
| Push Notifications | **PARTIAL** | `expo-notifications` in dependencies; `push-handlers.ts` exists but **does not register tokens with backend**. Frontend listener only — notifications won't actually arrive. |
| Biometric Auth | **MISSING** | No `expo-local-authentication` in dependencies |
| Deep Linking | **MISSING** | No `linking` config in `AppNavigator.tsx`; no universal links configuration |
| Secure Storage | **PRESENT** | `expo-secure-store` for Clerk token cache — properly configured via `app.json` plugins |
| Haptics | **PRESENT** | `expo-haptics` in dependencies; `useHaptics` hook wraps feedback |
| Network Status | **PRESENT** | `@react-native-community/netinfo` via `useNetworkStatus` hook |
| Offline Support | **PRESENT** | AsyncStorage-based queue with FIFO processing, exponential backoff, 30s sync interval |

**App Store readiness issues:**

| # | Finding | File | Line | Severity |
|---|---------|------|------|----------|
| N1 | No `app.config.ts` — using bare `app.json` with minimal config | `app.json` | — | HIGH |
| N2 | No privacy policy URL configured | `app.json` | — | HIGH (App Store requirement) |
| N3 | No splash screen background color variation for dark mode | `app.json:10` | — | LOW |
| N4 | App name is "mobile" (slug/name) — not a product name | `app.json:3-4` | — | HIGH |
| N5 | No iOS App Store icon variation or Android adaptive icon foreground config | `app.json:17-22` | — | MEDIUM |
| N6 | No EAS build configuration (`eas.json` missing) | — | — | HIGH |
| N7 | `predictiveBackGestureEnabled: false` — disables Android back gesture | `app.json:24` | — | LOW |
| N8 | No `expo-updates` for OTA updates | `package.json` | — | MEDIUM |

#### 4. Code Quality

| # | Finding | File | Line | Severity |
|---|---------|------|------|----------|
| Q1 | TypeScript strict mode enabled | `tsconfig.json` | 4 | POSITIVE |
| Q2 | Only 1 test file — 267 lines covering offline queue only; 0 screen/component tests | `__tests__/offline-sync.test.ts` | — | HIGH |
| Q3 | Test uses `vi.mocked(AsyncStorage, true)` — `deep: true` parameter deprecated in Vitest | `__tests__/offline-sync.test.ts:57` | — | LOW |
| Q4 | Test file has retry/backoff tests that assert constant values, not actual sync behavior | `__tests__/offline-sync.test.ts:268-300` | — | MEDIUM |
| Q5 | `EventCard` component exists but is never used in any screen (dead code) | `src/components/EventCard.tsx` | — | LOW |
| Q6 | Navigation has both `index.ts` and `index.tsx` barrel files — confusing | `src/navigation/` | — | LOW |
| Q7 | No error boundary wrapping the app — unhandled errors crash to white screen | `App.tsx` | — | HIGH |
| Q8 | `OfflineBanner` component is imported but `useNetworkStatus` is called inside `AppContent`, not at the query level | `App.tsx:34-35` | — | MEDIUM |
| Q9 | React Query `refetchOnWindowFocus: false` is correct for mobile (no window focus) | `App.tsx:28` | — | POSITIVE |
| Q10 | Metro config properly excludes `.next` from other apps | `metro.config.cjs:11-17` | — | POSITIVE |

#### 5. Security

| # | Finding | File | Line | Severity |
|---|---------|------|------|----------|
| S1 | Clerk JWT stored in `expo-secure-store` (Keychain/Keystore) — secure | `App.tsx:9` | — | POSITIVE |
| S2 | No API key exposure in client code — all env vars use `EXPO_PUBLIC_` prefix | `package.json`, `App.tsx` | — | POSITIVE |
| S3 | No certificate pinning configured | — | — | MEDIUM |
| S4 | Offline queue stores action data in AsyncStorage (unencrypted) — queued task IDs visible if device compromised | `src/store/offline-queue.ts` | — | MEDIUM |
| S5 | Auth token getter bridges Clerk token to API client via closure — pattern is secure | `App.tsx:50-65` | — | POSITIVE |

---

### Part B: Public Website

#### Executive Summary

The public website is a **6-page marketing site** with i18n support (5 locales), Basehub CMS integration, Sentry monitoring, and Vercel deployment. It is well-structured with proper SSR, ISR caching, and metadata generation. However, the **blog is explicitly disabled**, the **pricing page has placeholder content** (all tiers $40/month, identical descriptions), and several components have **hardcoded English strings** that bypass the i18n dictionary. Only 1 test file exists (hydration regression tests).

| Metric | Value |
|--------|-------|
| Source files | 57 (.tsx/.ts) excluding `.next/` |
| Pages | 6 (Home, Blog, Blog/[slug], Contact, Pricing, Legal/[slug]) |
| Layouts | 2 (root locale, legal) |
| Components | 17 (7 homepage sections, 4 header parts, 1 footer, 1 contact form, 1 sidebar, 3 test mocks) |
| Test files | 1 (`__tests__/hydration.test.tsx`, 407 lines) + 3 test mocks |
| Locales | 5 (en, es, de, zh, fr, pt) |
| CMS | Basehub (GraphQL) |
| Monitoring | Sentry (edge + server + client) |

#### 1. SEO & Metadata

| # | Finding | File | Line | Severity |
|---|---------|------|------|----------|
| SEO1 | `robots.ts` properly configured — allows all, includes sitemap URL | `app/[locale]/robots.ts` | — | POSITIVE |
| SEO2 | `sitemap.ts` dynamically generates sitemap from CMS posts + legal pages | `app/[locale]/sitemap.ts` | — | POSITIVE |
| SEO3 | Homepage uses `generateMetadata()` with dictionary-based meta | `(home)/page.tsx:23-29` | — | POSITIVE |
| SEO4 | Contact page uses `generateMetadata()` with dictionary-based meta | `contact/page.tsx:15-21` | — | POSITIVE |
| SEO5 | Blog listing uses `generateMetadata()` with dictionary-based meta | `blog/page.tsx:17-24` | — | POSITIVE |
| SEO6 | **Pricing page has NO `generateMetadata()`** — no title/description for SEO | `pricing/page.tsx` | — | HIGH |
| SEO7 | `createMetadata()` from `@repo/seo/metadata` used consistently where metadata exists | All metadata pages | — | POSITIVE |
| SEO8 | No Open Graph image generation (`opengraph-image.tsx` files absent) | — | — | MEDIUM |
| SEO9 | ISR configured: home (86,400s), contact (86,400s), blog (1,800s) | Various pages | — | POSITIVE |
| SEO10 | `productionBrowserSourceMaps: true` — source maps uploaded to Sentry then deleted | `next.config.ts:15-16` | — | POSITIVE |
| SEO11 | `sitemap.ts` uses `fs.readdirSync("app")` at build time — fragile if build runs from different directory | `app/[locale]/sitemap.ts:6` | — | LOW |

#### 2. Internationalization

| # | Finding | File | Line | Severity |
|---|---------|------|------|----------|
| I1 | 5 valid locales configured: en, es, de, zh, fr, pt | `middleware.ts:5` | — | POSITIVE |
| I2 | Middleware properly redirects invalid locales to `/en` | `middleware.ts:85-91` | — | POSITIVE |
| I3 | Middleware handles bot user-agents — returns 404 for invalid locale + bot patterns | `middleware.ts:77-83` | — | POSITIVE |
| I4 | Layout validates locale via `isValidLocale()` and calls `notFound()` for invalid | `app/[locale]/layout.tsx:25-27` | — | POSITIVE |
| I5 | **Pricing page has ALL strings hardcoded in English** — no dictionary usage | `pricing/page.tsx` | Multiple | HIGH |
| I6 | Pricing page: "Prices that make sense!", "Managing a small business today is already tough." — untranslated | `pricing/page.tsx:15-16` | — | HIGH |
| I7 | Pricing tiers: "Startup", "Growth", "Enterprise", all descriptions hardcoded English | `pricing/page.tsx:24-57` | — | HIGH |
| I8 | Pricing features: "SSO", "AI Assistant", "Version Control", "Members", "Multiplayer Mode", "Orchestration" — hardcoded | `pricing/page.tsx:78-152` | — | HIGH |
| I9 | Blog page: "Blog is currently disabled" message is hardcoded English | `blog/page.tsx:39` | — | MEDIUM |
| I10 | Sidebar component date formatted with hardcoded `"en-US"` locale and `"America/New_York"` timezone | `components/sidebar.tsx:22-25` | — | MEDIUM |
| I11 | No `/[locale]/features/` page — product features only shown on homepage | — | — | LOW |
| I12 | `normalizeLocale()` handles `en-US`, `en_US`, `EN` variants correctly | `middleware.ts:43-45` | — | POSITIVE |

#### 3. Performance

| # | Finding | File | Line | Severity |
|---|---------|------|------|----------|
| P1 | Homepage is Server Component with ISR — good for performance | `(home)/page.tsx` | — | POSITIVE |
| P2 | Contact page is Server Component — no client-side data fetching | `contact/page.tsx` | — | POSITIVE |
| P3 | `next/image` remote patterns configured for `assets.basehub.com` | `next.config.ts:20-28` | — | POSITIVE |
| P4 | `typescript.ignoreBuildErrors: true` — **TypeScript errors suppressed in production builds** | `next.config.ts:17-19` | — | HIGH |
| P5 | Bundle analyzer available via `ANALYZE=true` env var | `next.config.ts:47-49` | — | POSITIVE |
| P6 | `Basehub Pump` component used for CMS data — enables streaming SSR | `(home)/page.tsx:38` | — | POSITIVE |
| P7 | 10 marketing images in `public/marketing/` — all PNG, not optimized WebP | `public/marketing/*.png` | — | MEDIUM |
| P8 | `vercel.json` only has `"ignoreCommand": "exit 0"` — no custom headers, caching, or redirects beyond Next.js config | `vercel.json` | — | LOW |

#### 4. Content Completeness

| # | Finding | File | Line | Severity |
|---|---------|------|------|----------|
| C1 | **Blog is explicitly disabled** — "Blog is currently disabled. This page will be re-enabled when the CMS has a posts collection wired up." | `blog/page.tsx:39` | — | HIGH |
| C2 | Blog detail page (`blog/[slug]/page.tsx`) exists but is unreachable since blog listing shows disabled message | `blog/[slug]/page.tsx` | — | HIGH |
| C3 | **Pricing page has placeholder content** — all 3 tiers priced at $40/month with identical descriptions | `pricing/page.tsx:29-57` | — | HIGH |
| C4 | Pricing descriptions: "Our goal is to streamline SMB trade, making it easier and faster than ever for everyone and everywhere." — generic boilerplate, identical across all tiers | `pricing/page.tsx:26-27,41-42,57-58` | — | HIGH |
| C5 | Contact page has a real form with dictionary-driven labels | `contact/page.tsx`, `contact/components/contact-form.tsx` | — | POSITIVE |
| C6 | Legal pages dynamically loaded from CMS via `@repo/cms` | `legal/[slug]/page.tsx` | — | POSITIVE |
| C7 | Homepage has real content: Hero, Cases, Features, Stats, Testimonials, FAQ, CTA — all dictionary-driven | `(home)/page.tsx:49-55` | — | POSITIVE |
| C8 | Homepage `<pre className="hidden">{JSON.stringify(data, null, 2)}</pre>` — debug dump of CMS data in production DOM | `(home)/page.tsx:43` | — | MEDIUM |
| C9 | No `/[locale]/about/` page — company info not available | — | — | LOW |
| C10 | No `/[locale]/docs/` page — documentation link in header goes nowhere or external | — | — | LOW |
| C11 | Navigation config exists in `header/navigation-config.ts` — structure for header links | — | — | POSITIVE |
| C12 | `basehub-types.d.ts` generated types file for CMS — indicates real CMS integration | — | — | POSITIVE |

#### 5. Security

| # | Finding | File | Line | Severity |
|---|---------|------|------|----------|
| W1 | Sentry DSN configured via environment, not hardcoded | `sentry.edge.config.ts`, `sentry.server.config.ts` | — | POSITIVE |
| W2 | `@repo/security` (Arcjet) integrated via env keys | `env.ts:7` | — | POSITIVE |
| W3 | Contact form action exists at `contact/actions/contact.tsx` — server action, not client-side API call | — | — | POSITIVE |
| W4 | `proxy.ts` exists but content not audited (same pattern as `apps/api/proxy.ts`) | `proxy.ts` | — | LOW |
| W5 | No CSP headers configured in `next.config.ts` or `vercel.json` | — | — | MEDIUM |

---

### Recommended Actions

#### Mobile App (priority order)

**CRITICAL — Must Fix Before Any Release**

74. Wire push notification token registration: create `/api/notifications/devices` endpoint in backend; call it from `push-handlers.ts` after `expo-notifications.getExpoPushTokenAsync()`.
75. Add React Error Boundary to `App.tsx` wrapping `<AppContent />`.
76. Create `app.config.ts` with proper app name, version, privacy policy URL, and EAS build config.

**HIGH — Feature Gaps**

77. Add at minimum: Inventory (stock levels, barcode scan), Events (list, details), and Staff (today's shifts, time clock) screens.
78. Add deep linking configuration to `AppNavigator.tsx` for push notification tap-through.
79. Add camera/barcode scanner for inventory (`expo-camera` + `expo-barcode-scanner` plugins).
80. Add token refresh handling — listen to Clerk's token refresh events and update the API client getter.
81. Create `eas.json` for Expo Application Services build configuration.
82. Add screen-level and component-level tests — current 1-file coverage is insufficient.

**MEDIUM — Quality**

83. Remove dead `EventCard` component or add an events screen that uses it.
84. Consolidate navigation barrel files (`index.ts` + `index.tsx`).
85. Add certificate pinning for API calls (via `expo-network` or custom config).
86. Validate `EXPO_PUBLIC_API_URL` is non-empty before making API calls.

#### Public Website (priority order)

**HIGH — Content & Metadata**

87. Add `generateMetadata()` to pricing page with proper title and description.
88. Replace pricing page hardcoded strings with dictionary entries — all tiers, descriptions, feature names.
89. Replace pricing page placeholder content with real pricing tiers and descriptions.
90. Enable blog — wire CMS posts collection and replace disabled message with actual blog listing.
91. Fix `typescript.ignoreBuildErrors: true` — resolve type errors instead of suppressing them in production.

**MEDIUM — i18n & Performance**

92. Convert marketing images from PNG to WebP for performance (10 files in `public/marketing/`).
93. Replace hardcoded `"en-US"` locale in `components/sidebar.tsx:22-25` with dynamic locale.
94. Add Open Graph image generation (`opengraph-image.tsx`) for homepage, pricing, and contact pages.
95. Remove debug `<pre>` from homepage `(home)/page.tsx:43` — CMS data dump in DOM.
96. Add CSP headers via `next.config.ts` headers configuration.
97. Fix `sitemap.ts:6` — use `path.join(process.cwd(), "app")` instead of relative `"app"`.

**LOW — Polish**

98. Add `/about` page for company information.
99. Consider adding `/features` page as a dedicated product showcase (currently only homepage sections).
100. Change app name from "mobile" to product name in `app.json:3-4`.

---

### Critical Supplementary Findings (from parallel subagent deep-reads)

The 6 subagents returned additional findings beyond the initial audit above. These are the most significant:

#### CRITICAL — Mobile API Contract Bugs (will cause runtime errors)

| # | Finding | Mobile File:Line | Backend File:Line | Severity |
|---|---------|-------------------|-------------------|----------|
| C1 | **Claim/Start/Release body field mismatch**: Mobile sends `{ taskId }` but backend claim handler destructures `{ id }` from body — returns 400 "Task ID is required" on every claim attempt | `mutations.ts:91` | `kitchen/kitchen-tasks/commands/claim/route.ts:42` | **CRITICAL** |
| C2 | **Start/Release likely affected**: Same pattern — mobile sends `{ taskId }`, backend may expect different field name depending on manifest runtime schema | `mutations.ts:196,316` | `kitchen/kitchen-tasks/commands/start/route.ts:34`, `release/route.ts:34` | **CRITICAL** |
| C3 | **Prep lists response key mismatch**: Mobile expects `{ prepLists: [] }` but backend returns `{ data: [...], pagination: {...} }` — `data.prepLists` is `undefined` → empty list on mobile | `queries.ts:23,110` | `kitchen/prep-lists/route.ts:216-224` | **CRITICAL** |
| C4 | **Prep list detail response key mismatch**: Mobile expects `{ prepList: {...} }` but backend returns flat object — `data.prepList` is `undefined` → empty detail on mobile | `queries.ts:27,124` | `kitchen/prep-lists/[id]/route.ts:139-156` | **CRITICAL** |
| C5 | **Prep list item shape mismatch**: Mobile type has `completed`, `notes`, `unit` but backend returns `isCompleted`, `preparationNotes`, `baseUnit`, `scaledQuantity`, and groups items under `stations` (not flat `items` array) | `types.ts:67-79` | `kitchen/prep-lists/[id]/route.ts:139-156` | **CRITICAL** |

**Impact**: The mobile app's core features (task claiming, prep list viewing) are **non-functional** due to these contract mismatches. Only the Today screen (events) and task listing (read-only) work correctly.

#### CRITICAL — Push Notifications Non-Functional

| # | Finding | File:Line | Severity |
|---|---------|------|------|----------|
| C6 | Backend endpoint `/api/mobile/push-token` does NOT exist — push tokens are never registered server-side | `push-handlers.ts:72` | **CRITICAL** |
| C7 | Backend endpoint `/api/mobile/notification-preferences` does NOT exist — notification preference management is non-functional | `push-handlers.ts:175,195` | **CRITICAL** |
| C8 | Backend endpoint `/api/mobile/app-settings` does NOT exist — SettingsScreen settings fetch will 404 | `SettingsScreen.tsx:33-42` | **CRITICAL** |
| C9 | Backend endpoint `/api/user/profile` may not exist — ProfileScreen profile fetch likely 404 | `ProfileScreen.tsx:38-44` | **HIGH** |

#### HIGH — Mobile Architecture Issues

| # | Finding | File:Line | Severity |
|---|---------|------|------|----------|
| C10 | `useOfflineSync` syncStatus is a ref, not state — `OfflineBanner` receives stale sync data and will not re-render on sync state changes | `useOfflineSync.ts:105-109` | **HIGH** |
| C11 | No conflict resolution for queued offline actions — stale claims/starts will fail with retries then remain in queue forever with no user notification | `useOfflineSync.ts` | **HIGH** |
| C12 | Retry `setTimeout` not cleaned up on unmount — potential state updates on unmounted component | `useOfflineSync.ts:160-170` | **HIGH** |
| C13 | `LoadingSkeleton.tsx:66` uses `Math.random()` in render — causes visual flickering on re-renders | `LoadingSkeleton.tsx:66` | **MEDIUM** |
| C14 | No shared API types package — mobile types defined locally, can silently drift from backend (root cause of C3-C5) | `types.ts` | **HIGH** |
| C15 | 7 bottom tabs exceeds platform guidelines (iOS max 5, Material 3-5) — will cause cramped tab bar | `AppNavigator.tsx:81-147` | **MEDIUM** |

#### HIGH — Zero Accessibility Across All 9 Screens

| # | Finding | Severity |
|---|---------|----------|
| C16 | Zero `accessibilityLabel` usage across all 9 screens and 10 components | **HIGH** |
| C17 | Zero `accessibilityRole` / `accessibilityHint` usage | **HIGH** |
| C18 | Emoji used as meaningful UI elements (tab icons, empty states) without accessible alternatives | **HIGH** |
| C19 | `OfflineBanner` has no `accessibilityRole="alert"` — screen readers won't announce offline state | **HIGH** |
| C20 | `ProgressBar` has no `accessibilityRole="progressbar"` or `accessibilityValue` | **MEDIUM** |

#### Updated Recommended Actions — Additional

101. **CRITICAL**: Fix mobile API body fields — change `mutations.ts:91` from `{ taskId }` to `{ id: taskId }` for claim, and verify start/release/start command handlers.
102. **CRITICAL**: Fix mobile prep-lists response parsing — update `queries.ts:110` to use `data.data` (matching `manifestSuccessResponse` wrapping) and `queries.ts:124` to handle flat response object.
103. **CRITICAL**: Fix mobile `PrepListItem` types to match backend response shape (`isCompleted` not `completed`, `preparationNotes` not `notes`, station-grouped items).
104. **CRITICAL**: Create backend endpoints `/api/mobile/push-token`, `/api/mobile/notification-preferences`, `/api/mobile/app-settings`.
105. **CRITICAL**: Verify `/api/user/profile` exists in backend; if not, create it.
106. **HIGH**: Fix `useOfflineSync` to use state (not ref) for `syncStatus` so `OfflineBanner` re-renders.
107. **HIGH**: Add conflict resolution to offline queue — detect 409 responses, notify user, and remove stale items from queue.
108. **HIGH**: Create shared `@repo/types` API contract types shared between mobile, web, and backend.
109. **HIGH**: Add `accessibilityLabel` to all touchable elements and `accessibilityRole` to interactive components.
110. **MEDIUM**: Reduce bottom tabs from 7 to 5 (combine Today + My Work, combine Search into header).
111. **MEDIUM**: Replace emoji tab icons with proper icon library (e.g., `@expo/vector-icons`).
112. **MEDIUM**: Fix `Math.random()` in `LoadingSkeleton.tsx:66` — use deterministic function based on index.

#### Web App — Additional Findings from Subagent Deep-Read

| # | Finding | File:Line | Severity |
|---|---------|------|------|----------|
| W6 | **Contact form is non-functional**: server action `actions/contact.tsx` exists but `contact-form.tsx` has no `onSubmit`/`action` binding and is not wrapped in a `<form>` element — form submissions go nowhere | `contact/components/contact-form.tsx` | **CRITICAL** |
| W7 | **Middleware conflict**: `middleware.ts` (locale-only logic) likely overrides `proxy.ts` (full security stack with Clerk + Arcjet + CSP headers) — security headers and auth middleware may not be running | `middleware.ts` vs `proxy.ts` | **HIGH** |
| W8 | **Marketing images critically oversized**: Two PNGs exceed 5 MB each (`PolishedDashboard.png`, `OperationsDashboard.png`); all 10 images are 4320px wide (far beyond display needs). Total: ~40 MB of PNG images | `public/marketing/*.png` | **HIGH** |
| W9 | **Sidebar date hardcoded to `"en-US"` / `"America/New_York"`**: Not locale-aware for a multi-locale site | `components/sidebar.tsx:22-25` | **MEDIUM** |

**Updated web actions:**

113. **CRITICAL**: Wire contact form `onSubmit` to the existing server action in `actions/contact.tsx`.
114. **HIGH**: Resolve middleware conflict — merge `proxy.ts` security stack into `middleware.ts` or ensure Next.js middleware chaining includes both locale routing and security headers.
115. **HIGH**: Convert all 10 marketing PNGs to WebP/AVIF and downscale from 4320px to 1920px max.

#### Web App — SEO/i18n Deep-Read Supplementary Findings

| # | Finding | File:Line | Severity |
|---|---------|------|------|----------|
| W10 | **Non-EN dictionaries contain stale upstream template content**: ES/DE/ZH/FR/PT show completely different metrics (100K MAU, $100K MRR) and testimonials ("Hayden Bleasel", "Lee Robinson") vs EN (7 modules, Operations Director) | `packages/internationalization/dictionaries/*.json` | **CRITICAL** |
| W11 | **SEO metadata branded "next-forge" / Vercel**: `applicationName = "next-forge"`, author = Vercel, twitter = @vercel, publisher = "Vercel" — every page title ends with "| next-forge" | `packages/seo/metadata.ts:10-16` | **CRITICAL** |
| W12 | **No canonical URLs**: `createMetadata()` never sets `alternates.canonical` — search engines may index duplicate content across locales | `packages/seo/metadata.ts` | **HIGH** |
| W13 | **No hreflang tags**: With 6 supported locales, every page should declare `alternates.languages` mapping — without this, search engines cannot identify language/region relationships | `packages/seo/metadata.ts` | **HIGH** |
| W14 | **Sitemap omits locale prefixes**: Generates `/blog/slug` instead of `/en/blog/slug`, `/es/blog/slug` — URLs will be redirected by middleware | `app/[locale]/sitemap.ts:43-54` | **CRITICAL** |
| W15 | **Zero JSON-LD structured data**: `packages/seo/json-ld.tsx` component exists but no page uses it — no Organization, WebSite, FAQPage, or Blog schema | All pages | **HIGH** |
| W16 | **Blog post `generateMetadata` returns `{}`** (empty) — no title/description for SEO | `blog/[slug]/page.tsx` | **HIGH** |
| W17 | **Header SVG title says "Vercel"** instead of "Capsule" | `components/header/index.tsx:56` | **MEDIUM** |
| W18 | **~30+ hardcoded English strings** across hero, testimonials, pricing, footer, sidebar, blog, legal pages (detailed in subagent report) | Multiple files | **HIGH** |
| W19 | **OG locale hardcoded to `"en_US"`** regardless of actual locale served | `packages/seo/metadata.ts:49` | **MEDIUM** |
| W20 | **No root `/` to `/en` redirect** — middleware lets root pass through, no root `app/layout.tsx` exists | `middleware.ts:55-57` | **HIGH** |
| W21 | **Blog detail always calls `notFound()`** — fully stubbed but sitemap still generates blog URLs from CMS that will 404 | `blog/[slug]/page.tsx` | **HIGH** |
| W22 | **Legal page description duplicates title** — `description: post._title` | `legal/[slug]/page.tsx:31-34` | **LOW** |
| W23 | **Currency "$" symbol hardcoded** in stats component regardless of locale | `(home)/components/stats.tsx:84` | **MEDIUM** |
| W24 | **Footer receives no dictionary prop** — all content hardcoded English | `components/footer.tsx` | **HIGH** |

**Updated web actions (additional):**

116. **CRITICAL**: Translate non-EN dictionaries to match Capsule content — ES/DE/ZH/FR/PT currently show upstream "next-forge" template content.
117. **CRITICAL**: Fix `packages/seo/metadata.ts` branding — change `applicationName`, author, twitter handle, publisher from next-forge/Vercel to Capsule.
118. **CRITICAL**: Fix sitemap to include locale prefixes in all URLs — generate entries for all 6 locales.
119. **HIGH**: Add canonical URLs and hreflang tags to `createMetadata()`.
120. **HIGH**: Add JSON-LD structured data to homepage (Organization, WebSite), FAQ section (FAQPage), and pricing page.
121. **HIGH**: Add `generateMetadata()` to pricing page.
122. **HIGH**: Add root `/` to `/en` redirect in middleware.
123. **HIGH**: Internationalize footer, hero CTA buttons, and ~30 hardcoded strings across the site.
124. **HIGH**: Fix blog detail page — either enable CMS posts or remove blog URLs from sitemap.
125. **MEDIUM**: Fix header SVG title from "Vercel" to "Capsule".
126. **MEDIUM**: Make OG locale dynamic based on served locale.
127. **MEDIUM**: Make stats component currency formatting locale-aware.

---

## Mobile & Public Website Audit (10th Pass)

> **Audited:** 2026-04-25
> **Scope:** `apps/mobile/` (React Native/Expo, 57 .ts/.tsx files, 9 screens) + `apps/web/` (Next.js marketing site, 37 .ts/.tsx files, 6 pages)
> **Method:** 11 parallel subagents — full screen/page inventory, API contract comparison against backend routes, offline/push/security deep-read, feature completeness vs web app, code quality scan, SEO/i18n audit
> **Prior coverage:** Passes 1–9 covered API backend, shared packages, E2E tests, and authenticated web frontend (`apps/app/`). Mobile app and public website were NEVER audited.
> **No mobile-specific packages exist** — `packages/mobile-*` returned zero results.

### Part A: Mobile App

#### Executive Summary

The mobile app (`apps/mobile/`) is a **kitchen task execution tool only**. It has 9 screens covering a single bottom-tab navigator, but only covers ~25–30% of the Kitchen module. **11 of 12 major module areas have zero mobile presence.** The app calls 4 endpoint groups (`/api/mobile/*`, `/api/user/profile`) that **have no backend routes** — they return 404. Additionally, the `taskId` vs `id` field mismatch on task claim means every claim attempt fails with 400. Prep list response shapes don't match what the mobile app expects, leaving the Prep Lists tab always empty.

**Total screens:** 9 (TodayScreen, TasksScreen, MyWorkScreen, PrepListsScreen, PrepListDetailScreen, SearchScreen, ProfileScreen, SettingsScreen, SignInScreen)
**Test coverage:** 16 tests in 1 file (`__tests__/offline-sync.test.ts`) — offline queue only, no UI/component/navigation/integration tests
**Offline architecture:** Functional queue-and-replay with optimistic UI, but fragile error detection, no conflict resolution, and a syncStatus ref bug
**Push notifications:** Handlers written but NOT integrated into App.tsx; 3 of 4 push-related endpoints missing from backend
**Security posture:** JWT properly stored via Clerk + SecureStore; no hardcoded secrets; no certificate pinning; no 401 retry logic

**Top risks:**
1. **CRITICAL**: 4 endpoint groups missing from backend — Settings, Profile, Push Token, Notification Preferences screens are all broken
2. **CRITICAL**: Task claim sends `{ taskId }` but backend expects `{ id }` — every claim returns 400
3. **CRITICAL**: Prep list response shape mismatch — both list and detail screens always show empty
4. **HIGH**: 11 of 12 modules have zero mobile representation
5. **HIGH**: Push notification handlers written but never wired into App.tsx
6. **HIGH**: syncStatus is a ref not state — OfflineBanner won't re-render on status changes

#### 1. Feature Completeness

##### Module-by-Module Gap Analysis

| Module | Web App Pages | Mobile Screens | Status |
|--------|--------------|----------------|--------|
| **Kitchen – Tasks** | Task board + create | TasksScreen (claim, start, complete, release, bundle-claim, filter) | Partial — no task creation on mobile |
| **Kitchen – Prep Lists** | List + mobile-optimized view | PrepListsScreen + PrepListDetailScreen | Present but **broken** (response shape mismatch) |
| **Kitchen – Recipes** | 10 pages (list, new, detail, dishes, menus, cleanup, mobile view) | None | **MISSING** |
| **Kitchen – Waste** | 2 pages (list + mobile entry) | None | **MISSING** |
| **Kitchen – Stations/Team/Schedule/Equipment/Allergens/Nutrition/QA/IoT** | 10+ pages | None | **MISSING** |
| **Events** | 13+ pages (list, detail, follow-ups, waitlist, battle boards, budgets, contracts, reports) | TodayScreen shows only today's kitchen events (read-only) | **MISSING** — no event list, detail, CRUD |
| **Inventory** | 8 pages (dashboard, stock levels, items, barcode, transfers, import, forecasts, recipe cost) | None | **MISSING** |
| **Staff / Scheduling / Staffing** | 15+ pages (directory, availability, time clock, time off, performance, training, shifts, budgets, coverage) | None | **MISSING** |
| **Settings / Profile** | 7+ pages (general, team, audit log, security, integrations, email templates, manifest editor) | SettingsScreen + ProfileScreen | **Broken** — backend routes don't exist |
| **Accounting** | 4 pages | None | **MISSING** |
| **Procurement** | 10+ pages | None | **MISSING** |
| **Facilities** | 5 pages | None | **MISSING** |
| **Logistics** | 7 pages | None | **MISSING** |
| **Payroll** | 9 pages | None | **MISSING** |
| **CRM** | 17+ pages (clients, pipeline, proposals, venues, etc.) | None | **MISSING** |
| **Command Board** | API + AI assistant panel | None | **MISSING** |
| **Analytics** | 9 pages | None | **MISSING** |
| **Calendar** | 2 pages | None | **MISSING** |
| **Warehouse** | 6 pages | None | **MISSING** |
| **Cycle Counting** | 2 pages | None | **MISSING** |
| **Marketing** | 2 pages | None | **MISSING** |
| **Knowledge Base** | 1 page | None | **MISSING** |

**Summary:** Web app has ~120+ page files across 20 modules. Mobile has 8 authenticated screens covering only kitchen tasks and prep lists (both broken). 11 of 12 requested audit modules (kitchen, inventory, events, staff/scheduling, settings, accounting, procurement, facilities, logistics, payroll, CRM) have zero or broken mobile coverage.

#### 2. API Contract Issues

##### BLOCKING — Endpoints with No Backend Route

| # | Mobile Endpoint | Method | Mobile Source | Impact |
|---|----------------|--------|---------------|--------|
| M2A | `/api/mobile/app-settings` | GET + PATCH | `SettingsScreen.tsx:36,49` | Settings screen always fails |
| M2B | `/api/mobile/push-token` | POST | `push-handlers.ts:72` | Push registration silently fails |
| M2C | `/api/mobile/notification-preferences` | GET + PATCH | `push-handlers.ts:176,195` | Notification toggles silently fail |
| M2D | `/api/user/profile` | GET + PATCH | `ProfileScreen.tsx:40,50` | Profile screen always shows error |

`apps/api/app/api/mobile/` directory does **not exist**. Backend `apps/api/app/api/user/` has `create`, `deactivate`, `terminate`, `update-role`, `update` — no `profile` subdirectory.

##### BLOCKING — Request Body Field Mismatches

| # | Mobile Sends | Backend Expects | Mobile Source | Backend Source | Impact |
|---|-------------|-----------------|---------------|----------------|--------|
| M3A | `{ taskId }` | `{ id }` | `mutations.ts:93` | `kitchen-tasks/commands/claim/route.ts:42-45` | Every task claim returns 400 |
| M3B | `{ itemId }` | likely `{ id }` | `mutations.ts:389` | `prep-list-items/commands/mark-completed/route.ts:34` | Mark-complete likely fails |

##### BLOCKING — Response Shape Mismatches

| # | Mobile Expects | Backend Returns | Mobile Source | Backend Source | Impact |
|---|----------------|-----------------|---------------|----------------|--------|
| M4A | `{ prepLists: PrepList[] }` | `{ data: [...], pagination: {...} }` | `queries.ts:22-24,110` | `kitchen/prep-lists/route.ts:216-224` | Prep Lists tab always empty |
| M4B | `{ prepList: PrepList }` | flat object `{ id, name, stations, ... }` | `queries.ts:26-28,124` | `kitchen/prep-lists/[id]/route.ts:139-156` | Detail screen always empty |
| M4C | `PrepList` type has `completedCount`, `totalCount`, `items`, `dueDate` | Backend returns `stations` array, `batchMultiplier`, `dietaryRestrictions`, etc. | `types.ts:45-65` | `kitchen/prep-lists/[id]/route.ts:139-156` | Even with wrapper fix, data shapes incompatible |

##### HIGH — Other Contract Issues

| # | Finding | Mobile Source | Backend Source |
|---|---------|---------------|----------------|
| M5 | Manifest command responses wrapped in `{ success, data: { result, events } }` but mobile expects simple `{ success }` | `mutations.ts:196-197` | All kitchen-tasks command routes |
| M6 | No 401 retry/re-auth in API client — if session expires, all requests fail | `client.ts:40-47` | N/A |

#### 3. Native Integration

| Area | Status | Details |
|------|--------|---------|
| **Camera / Barcode** | **Not present** | No camera usage, no barcode scanning dependency. Inventory barcode feature completely absent. |
| **Push Notifications** | **Written but NOT wired** | `push-handlers.ts` has full configuration (permissions, Expo token, backend registration, listeners) but is **never called from App.tsx**. No `configurePushNotifications()` call in the app entry. |
| **Biometric Auth** | **Not present** | No biometric dependency or usage. |
| **Deep Linking** | **Not configured** | No `scheme` in `app.json`, no `expo-linking` plugin, no deep link configuration. |
| **Haptic Feedback** | **Present** | `useHaptics` hook wraps `expo-haptics`, used in PrepListItem and TaskCard. |
| **App Store Readiness** | **Not ready** | App name is `"mobile"` (generic), no `eas.json`, no custom URL scheme, no iOS/Android specific permissions declared beyond `expo-secure-store`. |
| **Expo Config** | **Minimal** | `app.json` has basic splash/icons (all present in assets/), `newArchEnabled: true` (risky for production), single plugin (`expo-secure-store`). No EAS build config, no OTA updates config. |

#### 4. Code Quality

| Area | Finding | Severity |
|------|---------|----------|
| **TypeScript** | `strict: true` in tsconfig — good. But `any` used in `client.ts:14` (request body) and `offline-queue.ts:9` (type assertion) | MEDIUM |
| **Dead Code** | `LoadingCard` exported from `components/index.ts` but never used | LOW |
| **Unused Export** | `ApiError` re-exported from both `client.ts` and `mutations.ts` | LOW |
| **Large Files** | `TaskCard.tsx` is 468 lines — should be split | MEDIUM |
| **Large Files** | `TasksScreen.tsx` is ~780+ lines with complex filter/modal state | MEDIUM |
| **Magic Numbers** | Tab bar height hardcoded to 60px (`AppNavigator.tsx:155`), refresh intervals hardcoded throughout | LOW |
| **Design System** | All colors hardcoded (e.g., `#2563eb`, `#64748b`) — no theme provider | MEDIUM |
| **Icon Library** | Tab bar uses **emoji strings** instead of icon library (`AppNavigator.tsx:21-47`) | LOW |
| **String Externalization** | **Zero i18n** — every UI string across all 9 screens is hardcoded English | HIGH |
| **Accessibility** | **Zero accessibility labels** across all screens and components — no `accessibilityLabel`, no `accessibilityRole`, no screen reader support | HIGH |
| **Error Boundary** | No global error boundary in the app — unhandled errors will crash to OS level | HIGH |
| **State Management** | React Query + AsyncStorage + Context (auth). No global state store. Appropriate for current scope. | OK |
| **Test Coverage** | 1 test file, 16 tests — only offline queue logic. No UI, navigation, integration, or screen tests. | HIGH |

#### 5. Security

| Area | Finding | Severity |
|------|---------|----------|
| **JWT Storage** | Properly stored via Clerk SDK + `expo-secure-store` (iOS Keychain / Android Keystore) | OK |
| **Hardcoded Secrets** | None found — only `EXPO_PUBLIC_*` env vars (Clerk publishable key, Expo project ID, API URL) — all designed to be public | OK |
| **Certificate Pinning** | None — standard `fetch` with no SSL configuration | MEDIUM |
| **Default API URL** | HTTP (not HTTPS) for development (`http://10.0.2.2:2223` / `http://localhost:2223`). Production depends on `EXPO_PUBLIC_API_URL` being set to HTTPS. | LOW |
| **Token Refresh** | No explicit refresh logic — relies on Clerk SDK internal refresh. No 401 retry in API client. | LOW |
| **Offline Queue** | Stored in unencrypted AsyncStorage (not SecureStore) — queued mutations are readable if device is compromised | MEDIUM |
| **Math.random()** | Used for optimistic ID generation (`mutations.ts:47`) — not cryptographically secure, potential for collisions | LOW |

### Part B: Public Website

#### Executive Summary

The public website (`apps/web/`) is a Next.js 15 marketing site with 6 pages, CMS integration via BaseHub, i18n support for 6 locales, Sentry monitoring, and Arcjet security. It uses shared packages from `packages/` for SEO, analytics, feature flags, and internationalization.

**Page count:** 6 (home, blog, blog/[slug], contact, legal/[slug], pricing)
**Test coverage:** 1 test file (`__tests__/hydration.test.tsx`) — component hydration stability only, no page-level tests
**CMS:** BaseHub integration for blog and legal pages, but blog is **completely disabled** with hardcoded "Blog is currently disabled" message
**i18n:** 6 locales supported via `[locale]` routing, but **dozens of hardcoded English strings** across components

**Top risks (beyond findings already in W1–W24):**
1. Blog system completely disabled — always shows "disabled" message, slug pages always 404
2. Contact form exists but is NOT wired to the server action — form submission does nothing
3. Pricing page shows identical $40/mo for all tiers, no `generateMetadata()`, no i18n
4. `next.config.ts` has `productionBrowserSourceMaps: true` and `ignoreBuildErrors: true`
5. Cases carousel has duplicate images and 1-second auto-scroll (too fast for users)

Note: Findings W1–W24 from the 9th pass (SEO/i18n deep-read) remain valid and are not repeated here. This section covers **new findings only**.

#### 1. SEO & Metadata (New Findings)

| # | Finding | File:Line | Severity |
|---|---------|-----------|----------|
| W25 | **Pricing page has no `generateMetadata()`** — no title, description, or OG tags for /pricing | `pricing/page.tsx` | HIGH |
| W26 | **Blog page `generateMetadata` works** but blog itself is disabled — metadata serves no purpose and may confuse crawlers | `blog/page.tsx:15-25` | MEDIUM |
| W27 | **`productionBrowserSourceMaps: true`** in next.config — exposes source code in production | `next.config.ts:13-14` | HIGH |
| W28 | **`ignoreBuildErrors: true`** — TypeScript errors don't block builds, masking real issues | `next.config.ts:16-18` | HIGH |

#### 2. Internationalization (New Findings)

| # | Finding | File:Line | Severity |
|---|---------|-----------|----------|
| W29 | **Pricing page: zero i18n** — all tier names, prices, features, CTA text hardcoded English | `pricing/page.tsx` | HIGH |
| W30 | **Hero CTA buttons hardcoded** — "Get in touch", "Sign up" not from dictionary | `(home)/components/hero.tsx:35,40` | MEDIUM |
| W31 | **CTA section buttons hardcoded** — "Get in touch", "Get started" not from dictionary | `(home)/components/cta.tsx:26,32` | MEDIUM |
| W32 | **Cases carousel images duplicated** — lines 23+32, 24+34 show identical image references | `(home)/components/cases.tsx:23-35` | MEDIUM |
| W33 | **Cases carousel auto-scroll: 1 second** — too fast for users to read content | `(home)/components/cases.tsx:50` | HIGH |
| W34 | **Testimonials carousel auto-scroll: 4 seconds with no pause control** — no user control over speed | `(home)/components/testimonials.tsx` | MEDIUM |
| W35 | **Error page (`error.tsx`) hardcoded English** — all text, including "Go to home" link hardcoded to `/en` | `(home)/error.tsx:46-59` | HIGH |
| W36 | **Locale error page (`[locale]/error.tsx`)** redirects to hardcoded `/en` instead of current locale | `[locale]/error.tsx:66` | HIGH |
| W37 | **Global error page hardcoded `lang="en"`** | `[locale]/global-error.tsx:36` | MEDIUM |
| W38 | **Legal page has hardcoded "Back to Home" text** — not from dictionary | `legal/[slug]/page.tsx:68` | LOW |
| W39 | **Footer tagline hardcoded** — "Enterprise business solutions, unified." | `components/footer.tsx:42` | MEDIUM |

#### 3. Performance (New Findings)

| # | Finding | File:Line | Severity |
|---|---------|-----------|----------|
| W40 | **Sitemap does filesystem sync read** (`readdirSync`) on every request — no caching | `app/[locale]/sitemap.ts:6` | MEDIUM |
| W41 | **Blog detail page always returns `notFound()`** but sitemap still generates blog URLs — crawlers hit 404s | `blog/[slug]/page.tsx:28` + `sitemap.ts` | HIGH |
| W42 | **Home page `betaFeature` call is unawaited** — potential race condition | `(home)/page.tsx:35` | LOW |
| W43 | **Cases carousel: 12 large images, no lazy loading** — impacts initial page load | `(home)/components/cases.tsx` | MEDIUM |
| W44 | **Feature images load immediately** — no lazy loading for below-fold content | `(home)/components/features.tsx` | LOW |

#### 4. Content Completeness (New Findings)

| # | Finding | File:Line | Severity |
|---|---------|-----------|----------|
| W45 | **Blog system completely disabled** — shows hardcoded "Blog is currently disabled" message | `blog/page.tsx:39-46` | CRITICAL |
| W46 | **Blog slug page always returns 404** — `generateStaticParams` returns `[]`, page always calls `notFound()` | `blog/[slug]/page.tsx:18-28` | CRITICAL |
| W47 | **Contact form NOT wired to server action** — form renders but `onSubmit` does nothing (no handler) | `contact/components/contact-form.tsx` | CRITICAL |
| W48 | **Server action exists** (`actions/contact.tsx`) with Resend email + rate limiting, but form doesn't call it | `contact/actions/contact.tsx:39-45` vs `contact-form.tsx` | HIGH |
| W49 | **Pricing page: all tiers identical $40/mo** — Startup, Growth, Enterprise all show same price | `pricing/page.tsx` | HIGH |
| W50 | **Missing email template** — server action references `@repo/email/templates/contact` but file may not exist | `contact/actions/contact.tsx` | HIGH |
| W51 | **Testimonials avatar fallback is "??"** — not professional for production | `(home)/components/testimonials.tsx:68` | MEDIUM |
| W52 | **All testimonial/cases images have generic alt text** ("Operations preview") — not descriptive | `(home)/components/testimonials.tsx` + `cases.tsx` | MEDIUM |
| W53 | **Beta banner text hardcoded English** — "Beta feature now available" | `(home)/page.tsx:46` | LOW |
| W54 | **Home page debug `<pre>` element** renders in production — should be gated behind dev/flag | `(home)/page.tsx:43` | MEDIUM |
| W55 | **Legal page description duplicates title** — `description: post._title` | `legal/[slug]/page.tsx:31-34` | LOW |

### Recommended Actions

#### Mobile App — Priority Ordered

**CRITICAL (app is non-functional without these):**
128. Create backend routes for `/api/mobile/app-settings` (GET + PATCH), `/api/mobile/push-token` (POST), `/api/mobile/notification-preferences` (GET + PATCH), `/api/user/profile` (GET + PATCH) — four entire feature areas are dead.
129. Fix task claim body: change mobile from `{ taskId }` to `{ id }` in `mutations.ts:93`, or update backend to accept `taskId`.
130. Fix prep list response shape: mobile expects `{ prepLists }` / `{ prepList }` wrappers but backend returns `{ data }` or flat object — align mobile's `select` transforms with actual backend shapes.
131. Fix prep list detail type: mobile's `PrepList` type (`types.ts:45-65`) has fields (`completedCount`, `totalCount`, `items`, `dueDate`) that don't exist in the backend response (`stations`, `batchMultiplier`, `dietaryRestrictions`).

**HIGH:**
132. Wire push notification handlers into App.tsx — `configurePushNotifications()` is never called.
133. Fix `syncStatus` in `useOfflineSync.ts:105-110` — change from ref to state so OfflineBanner re-renders.
134. Add global error boundary to App.tsx.
135. Add accessibility labels to all interactive elements across all 9 screens.
136. Externalize all hardcoded UI strings (100+ instances) to a localization system.
137. Create `eas.json` for production builds.
138. Set `newArchEnabled: false` in `app.json` for production stability.
139. Add deep linking configuration (URL scheme + universal links).
140. Expand test coverage beyond 1 file — add screen, component, and navigation tests.
141. Replace emoji tab icons with an icon library (e.g., `@expo/vector-icons`).

**MEDIUM:**
142. Add theme provider to replace hardcoded colors throughout components.
143. Implement certificate pinning for API communication.
144. Move offline queue storage from AsyncStorage to encrypted storage (SecureStore).
145. Add conflict resolution for offline queue (version checking or server-side merge).
146. Improve network error detection — currently only catches `TypeError` with `"Network"`.
147. Split `TaskCard.tsx` (468 lines) and `TasksScreen.tsx` (~780 lines) into smaller components.
148. Remove unused `LoadingCard` export.
149. Deduplicate `ApiError` export.
150. Change app name from `"mobile"` to branded name in `app.json`.

#### Public Website — Priority Ordered

**CRITICAL:**
151. Wire contact form `onSubmit` to the server action in `actions/contact.tsx`.
152. Either enable CMS blog posts and fix `blog/[slug]/page.tsx`, or remove blog URLs from sitemap entirely.

**HIGH:**
153. Disable `productionBrowserSourceMaps` and `ignoreBuildErrors` in `next.config.ts`.
154. Add `generateMetadata()` to pricing page.
155. Internationalize pricing page — all content currently hardcoded English.
156. Fix cases carousel: remove duplicate images and increase auto-scroll from 1s to 5s+.
157. Fix error pages to use current locale instead of hardcoded `/en` redirect.
158. Fix `betaFeature` unawaited call or remove debug `<pre>` element from homepage.

**MEDIUM:**
159. Externalize all remaining hardcoded strings (CTA buttons, footer tagline, legal "Back to Home").
160. Add lazy loading for below-fold images (cases, features sections).
161. Cache sitemap generation results instead of sync filesystem read on every request.
162. Fix testimonials avatar fallback from "??" to initials or default avatar.
163. Add descriptive alt text to testimonial/cases images.
164. Fix global error page `lang="en"` to use dynamic locale.

---

## 10th Pass — Verification & Corrections (2026-04-25)

> **Method:** 7 parallel subagents re-read every source file in `apps/mobile/` and `apps/web/`, cross-referencing all prior 10th-pass claims against actual code. This section documents corrections, new findings, and structural issues with the plan itself.

### Structural Note: Duplicate 10th Pass

The 10th pass audit appears **twice** in this document:
- Lines ~1956–2343: First copy (findings A1–A5, M2A–M6, N1–N8, Q1–Q10, S1–S5, SEO1–SEO11, I1–I12, P1–P8, C1–C12, W1–W5, C1–C20, W6–W24, actions 74–112)
- Lines ~2345–2605: Second copy (overlapping + additional W25–W55, actions 128–164)

**Recommendation:** Deduplicate — keep the second copy (more findings), merge unique items from the first (C6–C20 supplementary, W6–W24), then delete the first copy. This would save ~350 lines.

### Corrections to Prior 10th Pass

| # | Prior Claim | Actual | Source |
|---|-------------|--------|--------|
| ERR-1 | **Q5**: "EventCard is never used in any screen (dead code)" | **WRONG** — EventCard IS imported and rendered by `TodayScreen.tsx` for displaying event cards | `TodayScreen.tsx` imports `EventCard` from components |
| ERR-2 | **Navigation**: "Both `index.ts` and `index.tsx` barrel files" | **WRONG** — `src/navigation/index.tsx` does NOT exist. Only `index.ts` and `AppNavigator.tsx` | `find apps/mobile/src/navigation/ -type f` confirms only 2 files |
| ERR-3 | **Tests**: "267 lines, 16 tests" | **WRONG** — File is 300 lines with 7 test cases in 5 describe blocks | `__tests__/offline-sync.test.ts` — wc -l = 300 |
| ERR-4 | **Tests**: "vi.mocked(AsyncStorage, true) — deep: true deprecated" | **WRONG** — No `deep` option used. `vi.mocked(AsyncStorage, true)` passes `true` as the second arg to `vi.mocked`, which is the `deep` parameter in older Vitest but is not a named option. This is valid usage. | `__tests__/offline-sync.test.ts:57` |
| ERR-5 | **TasksScreen**: "~780+ lines" | **UNDERSTATED** — File is actually 1,258 lines | `wc -l apps/mobile/src/screens/TasksScreen.tsx` |
| ERR-6 | **TaskCard**: "468 lines" | **MINOR** — File is 467 lines | `wc -l apps/mobile/src/components/TaskCard.tsx` |

### New Findings Not in Prior 10th Pass

#### Mobile — API Contract

| # | Finding | File:Line | Severity |
|---|---------|-----------|----------|
| M-NEW-1 | **BundleClaimResponse type mismatch**: Mobile types.ts defines `BundleClaimResponse` with `{ success, data?: { claimed: [...], totalClaimed } }` but the actual mutation handler may return `{ success, claimId }` | `types.ts:112-125`, `mutations.ts:155` | HIGH |
| M-NEW-2 | **Query key inconsistency**: `queries.ts` uses `["prepListDetail", id]` but `mutations.ts` invalidates `["prepListDetail"]` without the id — cache won't be properly invalidated for specific prep lists | `queries.ts:37`, `mutations.ts:400,412,451,463` | HIGH |
| M-NEW-3 | **Missing endpoints in prior audit's table**: TodayScreen calls `/api/kitchen/events/today`, TasksScreen calls `/api/kitchen/tasks/available` and `/api/kitchen/tasks/my-tasks` — these ARE in the code but weren't explicitly listed in the endpoint table | `queries.ts`, multiple screens | LOW |
| M-NEW-4 | **Bundle claim endpoint exists but shape may differ**: `/api/kitchen/tasks/bundle-claim` exists in backend, but response format may not match mobile expectations | `mutations.ts:155` vs backend route | MEDIUM |
| M-NEW-5 | **No empty/null task ID validation**: Mutations don't validate taskId before making requests — could cause 400 errors with unhelpful messages | `mutations.ts` (all mutation hooks) | LOW |

#### Mobile — Architecture

| # | Finding | File:Line | Severity |
|---|---------|-----------|----------|
| M-NEW-6 | **Expo SDK 54 + React Native 0.81 + React 19.1**: This is a very recent stack. `newArchEnabled: true` on SDK 54 is less risky than on older SDKs — the new architecture is maturing. Downgrading severity of prior finding N1 from HIGH to MEDIUM. | `package.json` | INFO |
| M-NEW-7 | **No babel.config.js**: Project relies on Expo's default Babel config — acceptable for Expo SDK 54 but limits custom transforms | Project root | LOW |
| M-NEW-8 | **Network error detection is narrow**: Only catches `TypeError` with substring `"Network"` — misses DNS errors, timeouts, CORS issues, and other network failure modes | `mutations.ts` (7 instances: lines 98, 159, 204, 258, 323, 392, 444) | MEDIUM |

#### Mobile — Confirmed Prior Findings Worth Highlighting

| # | Finding | Verified | Notes |
|---|---------|---------|-------|
| V-1 | `/api/mobile/` directory does NOT exist in backend | Confirmed | All 4 mobile-prefixed endpoints (app-settings, push-token, notification-preferences, and profile) return 404 |
| V-2 | `/api/user/profile` does NOT exist | Confirmed | Backend has user create/deactivate/terminate/update-role/update but no `profile` subdirectory |
| V-3 | `/api/staff/me` does NOT exist | Confirmed | Listed in prior endpoint table but no backend route exists |
| V-4 | Task claim sends `{ taskId }` | Confirmed | `mutations.ts:93` sends `{ taskId }`, backend claim handler expects different field name |
| V-5 | Prep list response shape mismatch | Confirmed | Mobile expects `{ prepLists }` wrapper, backend returns `{ data, pagination }` |
| V-6 | Push handlers never wired into App.tsx | Confirmed | `configurePushNotifications()` is defined but never called |
| V-7 | syncStatus is a ref, not state | Confirmed | `useOfflineSync.ts:105` uses useRef, OfflineBanner won't re-render |

#### Web — Confirmed Prior Findings Worth Highlighting

| # | Finding | Verified | Notes |
|---|---------|---------|-------|
| V-8 | Blog disabled with hardcoded English message | Confirmed | `blog/page.tsx:39` |
| V-9 | Pricing page: all tiers $40/month, identical descriptions | Confirmed | `pricing/page.tsx:30,46,62` |
| V-10 | Contact form NOT wired to server action | Confirmed | `contact-form.tsx` has no onSubmit/action binding |
| V-11 | SEO branded "next-forge"/Vercel | Confirmed | `packages/seo/metadata.ts:10-16` |
| V-12 | Non-EN dictionaries have stale upstream template content | Confirmed | ES/DE/ZH/FR/PT reference "trading systems", "Hayden Bleasel", "Lee Robinson" — generic next-forge boilerplate |
| V-13 | Sitemap omits locale prefixes | Confirmed | `sitemap.ts:43-48` |
| V-14 | Header SVG title says "Vercel" | Confirmed | `header/index.tsx:55` |
| V-15 | Error pages redirect to hardcoded `/en` | Confirmed | `(home)/error.tsx:56`, `[locale]/error.tsx:66,73` |

### Updated Severity Adjustments

| Finding | Prior Severity | Recommended | Reason |
|---------|---------------|-------------|--------|
| N1 (newArchEnabled) | HIGH | MEDIUM | SDK 54 new architecture is maturing, less risky than when originally flagged |
| Q5 (EventCard dead code) | LOW | **REMOVE** | Finding is incorrect — EventCard IS used |

### Actions to Add (Not in Prior Lists)

165. **HIGH**: Fix query key inconsistency in `mutations.ts` — change `queryClient.invalidateQueries({ queryKey: ["prepListDetail"] })` to include the specific id: `["prepListDetail", prepListId]`.
166. **HIGH**: Verify BundleClaimResponse type matches backend actual response — test `POST /api/kitchen/tasks/bundle-claim` and update `types.ts:112-125` accordingly.
167. **MEDIUM**: Broaden network error detection in mutations — catch `TypeError`, `AbortError`, and check `error.message` for "network", "timeout", "fetch" patterns instead of only `TypeError` + "Network".
168. **LOW**: Add guard in mutation hooks to validate taskId/prepListId is non-empty before making API call.

### Deduplication Cleanup

When consolidating the two 10th-pass copies, preserve these items from the FIRST copy that are NOT in the second:
- Supplementary findings C6–C20 (push non-functional, mobile architecture issues, zero accessibility)
- Web findings W6–W24 (contact form, middleware conflict, marketing images, SEO/i18n deep-read)
- Actions 74–112 (from the first recommended actions list)

Items already in the second copy can be safely removed from the first.

---

## 10th Pass — Supplementary Re-Verification (2026-04-25, second session)

> **Method:** 15 parallel subagents (11 mobile + 4 web verification) re-read every source file, cross-referenced mobile API calls against backend routes, and compared all findings against the two existing 10th-pass copies. This section contains only corrections and genuinely NEW findings.

### Corrections to Prior Verification Section

| # | Prior Claim | Actual | Evidence |
|---|-------------|--------|----------|
| ERR-7 | **ERR-2**: "`src/navigation/index.tsx` does NOT exist. Only `index.ts` and `AppNavigator.tsx`" | **WRONG** — `index.tsx` DOES exist (1-line placeholder: `// This file intentionally left blank - exports are in index.ts`). Original finding Q6 was correct: both barrel files exist. | `ls apps/mobile/src/navigation/` shows 3 files including `index.tsx` |
| ERR-8 | **ERR-3**: "267 lines, 16 tests" corrected to "300 lines with 7 test cases in 5 describe blocks" | **PARTIALLY WRONG** — File is 300 lines, but the original first copy's "267 lines" was closer to content lines. Both 7 test cases and 5 describe blocks confirmed. The second copy's "16 tests" was wrong; original "267 lines" was just stale. | `wc -l apps/mobile/__tests__/offline-sync.test.ts` = 300 |
| ERR-9 | **SEO10**: "productionBrowserSourceMaps: true — source maps uploaded to Sentry then deleted" (POSITIVE) | **MISFRAMED** — This is a HIGH risk. Source maps are publicly downloadable in browser devtools, exposing full source code. The first copy correctly flagged it as HIGH (P4, W27). The POSITIVE rating in the SEO table is wrong. | `next.config.ts:13-14` — `productionBrowserSourceMaps: true` |

### Genuinely New Mobile Findings (Not in Any Prior Copy)

| # | Finding | File:Line | Severity |
|---|---------|-----------|----------|
| M-SUP-1 | **SettingsScreen support links are non-functional placeholders** — "Help Center", "Report a Bug", "Contact Support" items have no navigation or URL (lines 352-369) | `SettingsScreen.tsx:352-369` | MEDIUM |
| M-SUP-2 | **ProfileScreen role fallback hardcoded "Staff"** — if API returns no role, displays "Staff" as default (line 166) | `ProfileScreen.tsx:166` | LOW |
| M-SUP-3 | **ProfileScreen version hardcoded "1.0.0"** — not read from app.json or native module | `ProfileScreen.tsx:284` | LOW |
| M-SUP-4 | **SearchScreen is client-side only** — fetches all tasks and all prep lists, then filters locally. No `/api/search` endpoint used. Does not scale. | `SearchScreen.tsx:30-70` | MEDIUM |
| M-SUP-5 | **Offline queue has no size limit** — unlimited growth possible if user queues many actions offline. No maxItems cap in `addToOfflineQueue()` | `store/offline-queue.ts:16-20` | MEDIUM |
| M-SUP-6 | **Offline queue has no corruption detection** — AsyncStorage JSON parse errors are caught by returning `[]` but silently discard the entire queue with no user notification | `store/offline-queue.ts:8-14` | LOW |
| M-SUP-7 | **Offline sync polls queue count every 5 seconds** (`useOfflineSync.ts:222-226`) — inefficient; should use event-driven updates after queue mutations | `useOfflineSync.ts:222-226` | LOW |
| M-SUP-8 | **TodayScreen has "Future" navigation comment** — `// Future: Could use navigation.navigate with nested structure` (line 33-37) suggesting planned but incomplete deep navigation | `TodayScreen.tsx:33-37` | INFO |
| M-SUP-9 | **All 13 kitchen endpoints verified to EXIST in backend** — the core API layer is correctly wired. Only `/api/mobile/app-settings` and `/api/user/profile` are missing (already documented as M2A, M2D). The prior first copy's endpoint list (lines 2017-2022) missed several endpoints that DO work: `/api/kitchen/events/today`, `/api/kitchen/tasks/available`, `/api/kitchen/tasks/my-tasks`, `/api/kitchen/tasks/bundle-claim` | `apps/api/app/api/kitchen/` | POSITIVE |

### Genuinely New Web Findings (Not in Any Prior Copy)

| # | Finding | File:Line | Severity |
|---|---------|-----------|----------|
| W-SUP-1 | **Contact form has file input (`<input type="file">`) with no handler** — contact-form.tsx renders a file upload field (lines 103-107) but has no onChange handler, no file state, and the server action doesn't accept file uploads | `contact/components/contact-form.tsx:103-107` | MEDIUM |
| W-SUP-2 | **Server action `actions/contact.tsx` implements rate limiting (Redis) + Resend email** — properly architected backend, but entirely unreachable because form has no onSubmit binding (already documented as W6/W47/W48). Adding: the server action also references `@repo/email/templates/contact` which may not exist. | `contact/actions/contact.tsx:23-45` | INFO |
| W-SUP-3 | **Cases carousel has exact duplicate image pairs**: lines 23+32 and 24+34 reference identical images. Only 6 unique images across 12 carousel slides. | `(home)/components/cases.tsx:23-35` | MEDIUM (adds specificity to W32) |
| W-SUP-4 | **All homepage hero/features/stats/FAQ/CTA sections are properly server-rendered** with dictionary props — no `'use client'` on these components | `(home)/components/*.tsx` | POSITIVE |
| W-SUP-5 | **ISR revalidation is well-configured**: home 86400s, contact 86400s, blog 1800s, legal 86400s — appropriate for a marketing site | Multiple page files | POSITIVE |

### Structural Recommendations for This Document

1. **Merge the two 10th-pass copies** — lines 1956-2343 (first copy) and 2345-2605 (second copy) have significant overlap. The verification section (2609-2698) already identified this.
2. **Correct ERR-2** — `index.tsx` DOES exist in navigation; Q6 is valid.
3. **Downgrade SEO10** — `productionBrowserSourceMaps: true` should be HIGH risk, not POSITIVE.
4. **Actions to add:**
   - 169. **MEDIUM**: Add navigation handlers to SettingsScreen support links (Help Center URL, email link for bug reports).
   - 170. **MEDIUM**: Add server-side search API for mobile SearchScreen or implement pagination to avoid fetching all tasks/prep-lists.
   - 171. **MEDIUM**: Add `maxItems` cap to offline queue (suggest 100) with oldest-item eviction and user notification.
   - 172. **LOW**: Replace 5-second polling in `useOfflineSync` with event-driven count updates after queue mutations.

---

## Auth, Middleware & Integration Services Audit (11th Pass)

> **Audited:** 2026-04-25
> **Scope:** Auth chain (proxy.ts, middleware/, packages/auth, packages/security, packages/rate-limit), Integration services (apps/api/app/lib/), External integrations (packages/supplier-connectors, packages/payments, packages/webhooks)
> **Method:** 6 parallel subagents — full auth chain trace + route-level auth scan + credential exposure scan + lib file audit (all 16 files) + integration correctness review + external package audit. All agent findings cross-referenced.
> **Prior passes covered:** routes, raw SQL (4 passes), frontend (2 passes), mobile, public website, E2E, packages. Auth chain, integration services, and external packages were NEVER audited before this pass.
> **New findings:** 8 CRITICAL, 16 HIGH, 24 MEDIUM, 15 LOW, 8 INFO

### Part A: Authentication & Authorization

#### Executive Summary

The auth chain follows a solid architecture: Clerk middleware in `proxy.ts` gates all `/api(.*)` routes, extracting `userId` from the JWT. Tenant resolution (`apps/api/app/lib/tenant.ts`) correctly derives `tenantId` from `auth().orgId`, not from user-controllable input. API key authentication (`apps/api/middleware/api-key-auth.ts`) uses timing-safe comparison against bcrypt-hashed keys stored in the database.

However, the audit uncovered **8 exploitable vulnerabilities**: tenant spoofing in the Ably auth route and calendar callbacks, silent webhook event drops, cross-tenant data access in forecasts, and a payload injection in the Svix webhook integration. The global rate limiter is **effectively inert** because it depends on headers (`x-tenant-id`, `x-user-id`) that the middleware never injects from the Clerk session. API key auth is fully implemented but **never used** by any route handler.

The "115 routes lack authentication" claim in prior sections of this document is **not accurate** — only 21 routes lack direct auth imports, of which 15 are legitimately public (with alternative auth mechanisms), 3 are dead code stubs, and 2 are genuinely problematic (missing tenant isolation). The discrepancy arose from not accounting for `requireTenantId()` and `executeManifestCommand()` as indirect auth mechanisms.

#### 1. Middleware Chain

**Architecture (proxy.ts):**
- Clerk middleware matches `["/api(.*)", "/trpc(.*)]` — covers ALL API routes. No routes exist outside this matcher.
- Auth flow: Clerk `auth()` → `userId` extraction → 401 JSON if unauthenticated → global rate limit → route handler.
- Public route exemptions (bypass Clerk auth):
  - `/webhooks(.*)` — webhook receivers
  - `/outbox/publish` — outbox publisher
  - `/api/health(.*)` — health checks
  - `/api/sentry-fixer/process` — Sentry fixer

**Finding A-01 | CRITICAL | Rate Limiter Effectively Inert**
- **File:** `apps/api/middleware/global-rate-limit.ts:38-55`
- The global rate limiter identifies clients by reading `x-tenant-id`, `x-org-id`, `x-user-id` headers. These headers are **never injected** by the middleware or Clerk — they would only be present if the client sends them manually. This means the rate limiter falls back to IP-based identification (via `x-forwarded-for` or `x-real-ip`) for all authenticated requests. Per-tenant and per-user rate limiting does not function as designed. The per-route granular rate limiter (`apps/api/middleware/rate-limiter.ts`) has the same dependency on these headers.
- **Exploitable:** YES — a single user can bypass per-tenant/per-user rate limits by rotating IPs or through a shared corporate proxy.

**Finding A-02 | HIGH | Cron Auth Accepts Spoofable Header**
- **File:** Cron routes verify `Authorization: Bearer ${CRON_SECRET}`, but `cron/inventory-audit` also accepts `x-vercel-cron-secret` header as fallback. Any external request can set this header to any value; it is not compared against an environment variable. If `CRON_SECRET` is not set, the route falls back to accepting the Vercel header without verification.
- **Exploitable:** THEORETICAL — requires missing `CRON_SECRET` env var.

**Finding A-03 | MEDIUM | Webhook Routes Lack Signature Verification**
- **File:** `apps/api/app/api/collaboration/notifications/email/webhook/route.ts`, `apps/api/app/api/collaboration/notifications/sms/webhook/route.ts`
- Both routes have NO signature verification. Comments acknowledge this: "In production, you should verify the webhook signature." Anyone who discovers these endpoints can forge email/SMS delivery status updates.
- Note: `webhooks/supplier-catalog` correctly uses HMAC-SHA256 with `timingSafeEqual` — this is the gold standard pattern.
- **Exploitable:** YES — external attacker can forge delivery status updates.

#### 2. Route-Level Auth Enforcement

**Route Counts:**

| Metric | Count |
|--------|-------|
| Total `route.ts` files | 1347 |
| Routes with Clerk auth (direct or indirect) | 1326 |
| Routes with NO auth in handler code | 21 |
| Legitimately public (alternative auth) | 15 |
| Dead code stubs | 3 |
| Genuinely problematic (missing auth/isolation) | 2 |
| Weak auth (IDOR risk) | 2 |

**Finding A-04 | CRITICAL | Cross-Tenant Data Access in Forecasts**
- **File:** `apps/api/app/api/inventory/forecasts/batch/route.ts`
- Queries `inventoryForecast` by SKU list with NO `tenantId` filter. Middleware enforces Clerk auth, but once authenticated, any user can query forecasts from any tenant by providing their SKUs.
- **Exploitable:** YES

**Finding A-05 | CRITICAL | Calendar Callback IDOR (Cross-Tenant Write)**
- **File:** `apps/api/app/api/calendar/sync/callback/google/route.ts`, `apps/api/app/api/calendar/sync/callback/outlook/route.ts`
- Both extract `tenantId` from the `state` query parameter (base64-encoded, user-controllable). They write calendar provider tokens to that tenant's `providerSync` record without verifying the authenticated user belongs to that tenant. An attacker with a valid Clerk session can manipulate the `state` parameter to write tokens to another tenant's record.
- **Exploitable:** YES

**Finding A-06 | CRITICAL | Ably Auth Tenant Spoofing**
- **File:** `apps/api/app/ably/auth/route.ts:126-135`
- Resolves `tenantId` from `requestBody.tenantId` (user-controllable) as primary source, falling back to `sessionClaims.tenantId`. An authenticated user can POST any `tenantId` and receive an Ably token scoped to another tenant's channel with `subscribe` capability — allowing them to observe all real-time events for that tenant.
- **Exploitable:** YES

**Correction to Prior Plan:** The "115 routes lack authentication" claim (Executive Summary, line 25) overcounts by not accounting for `requireTenantId()` and `executeManifestCommand()` which call `auth()` internally. Actual problematic count: **4 routes** (A-04, A-05, A-06, plus the staffing/recommendations compute endpoint which is LOW risk — no DB access).

#### 3. RBAC Enforcement

**RBAC architecture:**
- **Manifest routes (69):** RBAC enforced through manifest runtime policy system. `executeManifestCommand` passes `currentUser.role` to runtime; policy denials return 403.
- **`requireTenantId()` routes (22):** Get tenant-scoped data access via `auth().orgId` → `tenantId`, but have **NO role checks**. Any authenticated user within the tenant can access all data in these routes.
- **Direct auth routes (majority):** Check `userId` + `orgId` from Clerk session. Role enforcement varies.

**Finding A-07 | MEDIUM | No RBAC on 22 Non-Manifest Routes**
- Routes using only `requireTenantId()` (no manifest) have no role-based access control. Any authenticated user in the tenant can access accounting/payments, accounting/invoices, logistics/dispatch, inventory/reorder-suggestions, etc. Admin-only operations are not restricted.
- **Exploitable:** THEORETICAL — requires valid org membership.

**Finding A-08 | MEDIUM | Auto-Provisioned Users Get Admin Role**
- **File:** `apps/api/app/lib/tenant.ts:184`
- When auto-provisioning a new user, `requireCurrentUser` assigns `role: "admin"` unconditionally. If Clerk org membership is loosely controlled, this grants admin privileges to arbitrary users.
- **Exploitable:** THEORETICAL — depends on Clerk org membership policies.

#### 4. API Key Authentication

**Architecture (`apps/api/middleware/api-key-auth.ts` + `apps/api/app/lib/api-key-service.ts`):**
- Keys are prefixed (`cpk_`), hashed with bcrypt (10 rounds), stored in `ApiKey` Prisma model.
- Validation uses `timingSafeEqual` for the key prefix check, then bcrypt for the secret portion.
- Keys are scoped to `tenantId` and have configurable permissions/scopes.

**Finding A-09 | HIGH | API Key Auth Never Used in Routes**
- Grep for `withApiKeyAuth` and `authenticateApiKey` across all route handlers returned **zero results**. API key authentication is fully implemented but no route actually invokes it. All routes rely exclusively on Clerk auth or are public.
- **Exploitable:** NO — this is a completeness gap, not a vulnerability.

**Finding A-10 | MEDIUM | API Key Scope Enforcement is Opt-In**
- **File:** `apps/api/middleware/api-key-auth.ts:85-112`
- Scope/permission checking on API keys is optional — the `withApiKeyAuth` wrapper accepts a `requiredScopes` parameter, but it's not enforced at the key validation level. Any key with `isActive: true` passes authentication regardless of scopes.
- **Exploitable:** THEORETICAL — requires routes to actually use API key auth first.

#### 5. Session & Token Handling

**Finding A-11 | CRITICAL | Tracked `.env` Files in Git**
- **File:** Root `.env` and `packages/database/.env` appear to be tracked by git despite being listed in `.gitignore`. These need to be untracked with `git rm --cached` to prevent potential secret exposure.
- **Exploitable:** YES — if repo is shared or CI logs expose file contents.

**Finding A-12 | HIGH | Server Secrets Exposed via NEXT_PUBLIC_ Prefix**
- **File:** `packages/observability/next-config.ts:83-91`
- Better Stack/Logtail source tokens use `NEXT_PUBLIC_` env var prefix, which embeds them in client-side JavaScript bundles at build time.
- **Exploitable:** YES — tokens are publicly readable in production JS bundles.

**Finding A-13 | INFO | Clerk JWT Token Refresh**
- Token refresh is handled automatically by Clerk's client-side SDK. Server-side routes call `auth()` which reads the current session. There is no mid-request token expiry issue because each route handler gets a fresh session from the middleware.

**Finding A-14 | ~~INFO~~ → SUPERSEDED | Hardcoded Secrets Found in Root Scripts**
- **Original claim (WRONG):** "No hardcoded secret values found in source files." The grep only covered `apps/` and `packages/` — it missed 5 tracked root scripts.
- **Actual state (per Addendum 2):** Three root scripts contain a hardcoded Clerk secret key (`sk_test_...`), two contain a hardcoded Neon database connection string. See findings AE2-A01 and AE2-A02 in Addendum 2. Production source code (`apps/`, `packages/`) correctly loads secrets via `process.env` with Zod validation via `@t3-oss/env-nextjs`. The hardcoded secrets are exclusively in ad-hoc test/debug scripts at the repository root.

### Part B: Integration Services

#### 1. Goodshuffle Integration

**Architecture:** Poll-based sync (no webhooks). Client (`goodshuffle-client.ts`) makes paginated REST API calls. Three sync services handle events, inventory, and invoices respectively. Credentials loaded from database per-tenant.

**Finding B-G01 | HIGH | No Fetch Timeout**
- **File:** `apps/api/app/lib/goodshuffle-client.ts:132-158`
- `request<T>()` has zero timeout configuration. If Goodshuffle API is slow/unresponsive, fetch calls hang indefinitely (or until Node.js default socket timeout, which can be minutes). Affects all paginated `getAll*()` methods.
- **Data loss risk:** POTENTIAL — stalled sync leaves `lastSyncStatus` inconsistent.

**Finding B-G02 | HIGH | No Retry Logic**
- **File:** `apps/api/app/lib/goodshuffle-client.ts:132-158`
- No retry or exponential backoff. A transient 5xx response immediately fails the entire sync. Mid-pagination failures produce partial datasets treated as complete by sync services.
- **Data loss risk:** POTENTIAL — partial data treated as full dataset.

**Finding B-G03 | HIGH | No Transaction Wrapping — Duplicates on Failure**
- **File:** `apps/api/app/lib/goodshuffle-event-sync-service.ts:124-198` (also `inventory-sync:119-192`, `invoice-sync:93-166`)
- Sync loops perform multiple DB writes per item without transactions. Crash mid-loop creates items without sync records, causing duplicate creation on next sync.
- **Data loss risk:** YES — duplicate events/inventory/invoices on re-sync.

**Finding B-G04 | MEDIUM | Conflict Detection Dead Code**
- **File:** `apps/api/app/lib/goodshuffle-event-sync-service.ts:28-87` (also `inventory-sync:26-85`, `invoice-sync:30-56`)
- `_detectConflicts()` functions are defined but never called (underscore-prefixed). Sync unconditionally overwrites Convoy data with Goodshuffle data. Local modifications to event names, dates, guest counts, inventory quantities, or budget amounts are silently overwritten.
- **Data loss risk:** YES — local corrections overwritten on every sync.

**Finding B-G05 | MEDIUM | Sync Direction Option Ignored**
- **File:** `apps/api/app/lib/goodshuffle-event-sync-service.ts:20-23`
- `EventSyncOptions.direction` accepts `"convoy_to_goodshuffle" | "goodshuffle_to_convoy" | "both"` but is never used. Only `goodshuffle_to_convoy` is implemented. Users selecting bidirectional sync get one-way behavior silently.
- **Data loss risk:** POTENTIAL — users may believe bidirectional sync is active.

**Finding B-G06 | MEDIUM | Destructive Invoice Line Item Replacement**
- **File:** `apps/api/app/lib/goodshuffle-invoice-sync-service.ts:340-345`
- `updateConvoyBudgetFromGoodshuffle()` DELETEs ALL budget line items with `category = 'invoice'` and recreates them. No transaction wrapping. Failure between DELETE and INSERT permanently loses line items.
- **Data loss risk:** YES

**Finding B-G07 | MEDIUM | Inventory Quantity Overwrite Ignores Local Corrections**
- **File:** `apps/api/app/lib/goodshuffle-inventory-sync-service.ts:297-308`
- Unconditionally overwrites `quantity_on_hand` with Goodshuffle's `quantity_available`. Manual stock adjustments are reverted on next sync. Also does not check `deleted_at`, potentially updating soft-deleted items.
- **Data loss risk:** YES

**Finding B-G08 | MEDIUM | No Input Validation on External Data**
- **File:** `apps/api/app/lib/goodshuffle-event-sync-service.ts:240-287`
- No validation of incoming Goodshuffle data before raw SQL INSERT. Fields could be empty, invalid dates, or negative numbers.
- **Data loss risk:** NO (data corruption risk)

**Finding B-G09 | LOW | Unbounded Pagination Loop**
- **File:** `apps/api/app/lib/goodshuffle-client.ts:263-280`
- `getAll*()` methods have no maximum page count. If the API reports `total` incorrectly, these loop forever.
- **Data loss risk:** NO

#### 2. QuickBooks Export

**Architecture:** File-based IIF/CSV export (not API-based). No OAuth, no direct QuickBooks API calls. Users download generated files and manually import into QuickBooks Desktop. This is a deliberate design choice.

**Finding B-QB1 | MEDIUM | CSV Formula Injection**
- **File:** `apps/api/app/lib/quickbooks-bill-export.ts:132-141`, `apps/api/app/lib/quickbooks-invoice-export.ts:128-137`
- `escapeCSV` only escapes commas, double quotes, and newlines. Does not sanitize formula injection payloads (cells beginning with `=`, `+`, `-`, `@`). If a vendor name or description starts with `=`, it will be interpreted as a formula when opened in Excel.
- **Exploitable:** THEORETICAL — requires attacker-controlled vendor/item names.

**Finding B-QB2 | LOW | No Export Deduplication**
- **File:** `apps/api/app/lib/quickbooks-bill-export.ts:435-457`, `apps/api/app/lib/quickbooks-invoice-export.ts:435-457`
- Same bill/invoice can be exported and imported into QuickBooks multiple times. No "already exported" tracking.
- **Data loss risk:** NO (data duplication, not loss)

**Finding B-QB3 | LOW | Zero Line Item Bills**
- **File:** `apps/api/app/lib/quickbooks-bill-export.ts:195-261`
- No validation that `lineItems` is non-empty. A bill with zero line items produces an invalid IIF `TRNS...ENDTRNS` block.

#### 3. Nowsta Integration

**Architecture:** One-way sync (Nowsta → Convoy). Client (`nowsta-client.ts`) makes paginated REST API calls. Sync service handles employee matching (by email) and shift synchronization.

**Finding B-N01 | HIGH | No Fetch Timeout**
- **File:** `apps/api/app/lib/nowsta-client.ts:74-103`
- Same as B-G01. Zero timeout configuration on all fetch calls.

**Finding B-N02 | HIGH | No Retry Logic**
- **File:** `apps/api/app/lib/nowsta-client.ts:74-103`
- Same as B-G02. No retry or backoff. Partial data on pagination failure.

**Finding B-N03 | HIGH | No Transaction Wrapping — Duplicate Shifts**
- **File:** `apps/api/app/lib/nowsta-sync-service.ts:283-410`
- `processShift()` performs multiple DB operations (find/create schedule, find location, create/update shift, create sync record) without transaction wrapping. Failure between creating a shift and its sync record creates an orphaned shift; next sync creates a duplicate.
- **Data loss risk:** YES

**Finding B-N04 | HIGH | Failed Shifts Skipped Permanently**
- **File:** `apps/api/app/lib/nowsta-sync-service.ts:188-198`
- Individual shift processing failures are caught and logged but skipped permanently until next full sync. No retry mechanism or flagging for manual review.
- **Data loss risk:** POTENTIAL

**Finding B-N05 | MEDIUM | Sync Resurrects Soft-Deleted Shifts**
- **File:** `apps/api/app/lib/nowsta-sync-service.ts:339-349`
- UPDATE query does not check `deleted_at`. Soft-deleted shifts are silently un-deleted by sync.
- **Data loss risk:** YES

**Finding B-N06 | MEDIUM | Email-Only Matching Breaks on Email Change**
- **File:** `apps/api/app/lib/nowsta-sync-service.ts:52-64`
- Employee matching uses email as sole key. If an employee changes email in Nowsta, the next sync treats them as unmapped. Shifts assigned to this employee fail to sync.
- **Data loss risk:** POTENTIAL

**Finding B-N07 | MEDIUM | No Conflict Resolution (One-Way Sync)**
- **File:** `apps/api/app/lib/nowsta-sync-service.ts:104-144`
- Only Nowsta → Convoy direction is implemented. Local Convoy changes to employee data (name, role, phone) are not pushed back to Nowsta and are overwritten on re-sync if the update path triggers.
- **Data loss risk:** YES

#### 4. Shared Libraries

**`activity-feed-service.ts`:**
- Tenant isolation is correctly enforced throughout (all queries filter by `tenantId`).
- **MEDIUM** — `getCorrelatedActivities` has no limit parameter; unbounded result set on large correlation sets (`activity-feed-service.ts:319-330`).
- **LOW** — `getActivityStats` runs `COUNT(*)` with no date filter on the `total` query (`activity-feed-service.ts:457`) — slow on large tables.
- **INFO** — Query functions (`getActivities`, `getEntityActivities`, etc.) have no active route consumers — never load-tested.

**`tenant.ts`:**
- Tenant resolution is **correct and secure**: derives `tenantId` from `auth().orgId`, never from user-controllable input.
- **LOW** — Race condition in `getTenantIdForOrg`: `findFirst` then `create` without unique constraint handling (`tenant.ts:11-23`). `requireCurrentUser` at line 200 handles this correctly but `getTenantIdForOrg` does not.
- **LOW** — `console.log` statements include `clerkId` and `tenantId` (`tenant.ts:114,148,170`).

**`cors.ts`:**
- **MEDIUM** — When origin doesn't match allowed origins, falls back to `allowedOrigins[0]` instead of rejecting (`cors.ts:22-23`). Browser enforces origin match, but server behavior is misleading.
- **LOW** — `Access-Control-Allow-Headers` hardcoded to only `"Content-Type"` (`cors.ts:28`) — will break requests with `Authorization` header.
- **LOW** — Empty string in `ABLY_AUTH_CORS_ORIGINS` produces `[""]` which passes truthy check (`cors.ts:12-17`).

**`invariant.ts`:**
- **INFO** — Clean implementation. `InvariantError` extends `Error`, uses `asserts condition` for type narrowing. Consistently used across 20+ files.

**`recipe-costing.ts`:**
- **CRITICAL** — Division by zero in `scaleRecipeCost` when `currentYield` is 0. Produces `Infinity` propagated to `scaledTotalCost` and persisted (`recipe-costing.ts:340`).
- **CRITICAL** — `updateEventBudgetsForRecipe` uses additive budget accumulation: each call appends total recipe cost rather than replacing. Repeated calls inflate budget indefinitely (`recipe-costing.ts:469-478`).
- **HIGH** — N+1 pattern: `loadUnitConversions` issues unfiltered `SELECT * FROM core.unit_conversions` once per ingredient, fetching entire table each time (`recipe-costing.ts:43-53, 120`).
- **HIGH** — Case-sensitive inventory matching: `ii.name = i.name` silently produces 0 cost for case mismatches (`recipe-costing.ts:105-108`).
- **HIGH** — `recalculateRecipeCostsForInventoryItem` accepts `tenantId` as raw parameter without deriving from auth (`recipe-costing.ts:385-427`).

**`recipe-version-helpers.ts`:**
- **CRITICAL** — `getNextVersionNumber` race condition: reads `MAX(version_number)` and returns `max + 1` with no locking. Concurrent requests produce duplicate version numbers (`recipe-version-helpers.ts:166-177`).
- **HIGH** — Manifest + Prisma writes not in a single transaction. If Manifest write succeeds but Prisma fails, systems desync (`recipe-version-helpers.ts:243-308, 341-420`).
- **HIGH** — `copyIngredientsFromVersion` and `copyStepsFromVersion` insert one-at-a-time with no transaction (`recipe-version-helpers.ts:523-537, 546-594`).
- **MEDIUM** — Error responses include raw error messages, potentially leaking SQL errors and connection strings (`recipe-version-helpers.ts:296-307`).
- **MEDIUM** — Falsy coercion: `prepTimeMinutes || null` coerces explicit `0` to `null` (`recipe-version-helpers.ts:786-790`).

**`inventory-forecasting.ts`:**
- **HIGH** — Hardcoded `0.1` units/guest for event usage estimation regardless of item type (pencils = steak = 0.1 units/guest) (`inventory-forecasting.ts:307-309`).
- **HIGH** — `saveForecastToDatabase` does 62 sequential queries per SKU for a 30-day horizon, with no transaction and no unique constraint on `tenantId + sku + date` (`inventory-forecasting.ts:598-605`).
- **HIGH** — `batchCalculateForecasts` processes SKUs sequentially: 300+ queries for 100 items (`inventory-forecasting.ts:559-576`).
- **MEDIUM** — Event projections use empty SKU string, meaning every SKU gets identical event usage projections (`inventory-forecasting.ts:337-339`).
- **MEDIUM** — `dailyAverage` divides by 30 (lookback window) instead of `dataPoints` (actual days with usage), understating average for sporadically-used items (`inventory-forecasting.ts:245-253`).
- **MEDIUM** — MAPE label is misleading: metric is `(averageErrorDays / 30) * 100`, not actual Mean Absolute Percentage Error (`inventory-forecasting.ts:770-771`).
- **MEDIUM** — Confidence accuracy formula produces meaningless units (`100 - avgDaysError`) labeled as percentages (`inventory-forecasting.ts:797-808`).

### Part C: External Integration Packages

#### 1. Supplier Connectors (`packages/supplier-connectors/`)

**Supported suppliers:** US Foods (EDI-based stub), Charlie's Produce (REST API stub).

**Finding C-SC1 | HIGH | No Implementation Distinction**
- **File:** `charlies-produce.ts:64-68`, `us-foods.ts:64-68`
- Both connectors return `false`/empty results with no mechanism to distinguish "not implemented" from "auth failed" from "service down." `console.warn` includes credential key names.

**Finding C-SC2 | HIGH | Sync Transaction Error Handling**
- **File:** `sync-service.ts:88-135`
- `syncCatalog` collects Promise operations eagerly before `$transaction`. If any throws during Promise construction (not execution), the entire sync fails.

**Finding C-SC3 | MEDIUM | N+1 in syncChanges**
- **File:** `sync-service.ts:176-260`
- `syncChanges` runs sequential `findFirst` + `update`/`create` per product with no batching or transaction.

**Finding C-SC4 | MEDIUM | Unstructured Credential Storage**
- **File:** `types.ts:79`
- `credentials: Record<string, string>` with no constraints, encryption, or validation. API keys flow through as plain strings.

**Finding C-SC5 | INFO | Shared Connector Instances**
- **File:** `registry.ts:44-46`
- Singleton `connectorRegistry` is module-scoped and shared across all tenants.

#### 2. Payments (`packages/payments/`)

**Provider:** Stripe. Exports: `stripe` client, `Stripe` type, `keys()` env validator, `paymentsAgentToolkit` (Stripe AI agent toolkit).

**Finding C-PAY1 | CRITICAL | Stripe Key in Client Bundle Risk**
- **File:** `packages/payments/index.ts:1`
- `import "server-only"` is the sole guard preventing Stripe secret key from entering client bundles. If `server-only` is misconfigured in the build, the secret key is exposed. Key validation only checks `sk_` prefix — no distinction between test and live keys.
- **Exploitable:** THEORETICAL — depends on build configuration failure.

**Finding C-PAY2 | HIGH | No Tenant Scoping on AI Toolkit**
- **File:** `packages/payments/ai.ts:4-18`
- `paymentsAgentToolkit` initialized with the platform Stripe key, granting access to the entire account. No tenant scoping. An AI agent using this toolkit could affect any tenant's data.
- **Exploitable:** THEORETICAL — depends on AI agent usage patterns.

**Finding C-PAY3 | MEDIUM | Optional Webhook Secret**
- **File:** `packages/payments/keys.ts:9`
- `STRIPE_WEBHOOK_SECRET` is optional. If webhook endpoints exist without this env var, signature verification is skipped, allowing forged payloads.

#### 3. Webhooks (`packages/webhooks/`)

**Provider:** Svix. Exports: `webhooks.send()`, `webhooks.getAppPortal()`, `keys()`.

**Finding C-WH1 | CRITICAL | Silent Event Drops**
- **File:** `packages/webhooks/lib/svix.ts:8-31`
- `send` silently returns `undefined` when `orgId` is falsy (line 18). No error thrown, no logging, no indication the event was dropped. Callers cannot detect silent event loss. This violates event-driven system reliability — dropped events cause downstream data inconsistency.
- **Exploitable:** YES — events can be silently lost without detection.

**Finding C-WH2 | CRITICAL | Payload Injection via Spread**
- **File:** `packages/webhooks/lib/svix.ts:20-30`
- Payload construction spreads caller payload AFTER setting `eventType`:
  ```typescript
  payload: { eventType, ...payload }
  ```
  If caller's payload contains an `eventType` key, it overwrites the top-level eventType. A caller can inject `{ eventType: "different.event.type" }` to change the actual event type delivered by the webhook.
- **Exploitable:** YES

**Finding C-WH3 | HIGH | No Retry on Send Failure**
- **File:** `packages/webhooks/lib/svix.ts`
- `svix.message.create()` failures propagate to caller with no retry. Svix has its own delivery retry for created messages, but creation failures are not retried.

**Finding C-WH4 | MEDIUM | New Client Per Call**
- **File:** `packages/webhooks/lib/svix.ts:6, 38`
- New `Svix` client instance created on every `send()` and `getAppPortal()` call. Inefficient for high-volume event streams.

**Finding C-WH5 | MEDIUM | No Idempotency**
- **File:** `packages/webhooks/lib/svix.ts`
- No idempotency key support. Duplicate `send()` calls produce duplicate webhook deliveries. Svix supports `MessageIn.idempotencyKey` but it is not used.

### Recommended Actions

#### Tier 0 — Exploitable Vulnerabilities (fix immediately)

| # | Finding | File:Line | Action |
|---|---------|-----------|--------|
| A11-1 | A-06: Ably tenant spoofing | `apps/api/app/ably/auth/route.ts:126-135` | Derive `tenantId` exclusively from `auth().orgId` via `getTenantIdForOrg()`. Never accept from request body. |
| A11-2 | A-04: Cross-tenant forecast access | `apps/api/app/api/inventory/forecasts/batch/route.ts` | Add `tenantId` filter from `requireTenantId()`. |
| A11-3 | A-05: Calendar callback IDOR | `apps/api/app/api/calendar/sync/callback/google/route.ts`, `outlook/route.ts` | Verify authenticated user belongs to the `tenantId` from the `state` param before writing. |
| A11-4 | A-11: Tracked .env files | Root `.env`, `packages/database/.env` | Run `git rm --cached` on both files immediately. |
| A11-5 | C-WH1: Silent webhook drops | `packages/webhooks/lib/svix.ts:18` | Throw error or log warning when `orgId` is missing. Never silently drop events. |
| A11-6 | C-WH2: Webhook payload injection | `packages/webhooks/lib/svix.ts:20-30` | Spread caller payload BEFORE `eventType`, or namespace under a key that cannot collide. |

#### Tier 1 — Security Hardening (fix next)

| # | Finding | File:Line | Action |
|---|---------|-----------|--------|
| A11-7 | A-12: NEXT_PUBLIC_ tokens | `packages/observability/next-config.ts:83-91` | Remove `NEXT_PUBLIC_` prefix; read server-side only. |
| A11-8 | A-01: Rate limiter inert | `apps/api/middleware/global-rate-limit.ts:38-55` | Inject `x-tenant-id`, `x-user-id` headers from Clerk session in proxy.ts before rate limit check. |
| A11-9 | A-03: Webhook signature missing | `collaboration/notifications/email/webhook`, `sms/webhook` | Implement HMAC signature verification (follow the pattern in `webhooks/supplier-catalog`). |
| A11-10 | C-PAY3: Optional Stripe webhook secret | `packages/payments/keys.ts:9` | Make `STRIPE_WEBHOOK_SECRET` required when webhook endpoints are deployed. |
| A11-11 | C-PAY1: Server-only guard | `packages/payments/index.ts:1` | Verify `server-only` is correctly configured in build pipeline. |

#### Tier 2 — Data Integrity (integration services)

| # | Finding | File:Line | Action |
|---|---------|-----------|--------|
| A11-12 | B-G03, B-N03: No transactions | Goodshuffle sync services, Nowsta sync service | Wrap multi-step sync operations in `database.$transaction()`. |
| A11-13 | B-G01, B-N01: No fetch timeout | `goodshuffle-client.ts:132`, `nowsta-client.ts:74` | Add `AbortController` with configurable timeout (30s default). |
| A11-14 | B-G02, B-N02: No retry | Same files | Add retry with exponential backoff for 5xx and network errors (3 retries max). |
| A11-15 | B-G04: Conflict detection dead code | Goodshuffle sync services | Either wire `_detectConflicts()` into sync flow or remove and document last-write-wins behavior. |
| A11-16 | B-N05: Resurrects soft-deleted | `nowsta-sync-service.ts:339-349` | Add `AND deleted_at IS NULL` to all sync UPDATE queries. |
| A11-17 | B-RC01: Division by zero | `recipe-costing.ts:340` | Guard `currentYield > 0`; validate `targetPortions > 0`. |
| A11-18 | B-RC02: Additive budget | `recipe-costing.ts:469-478` | Rewrite to delta-based or replace-based budget update. |
| A11-19 | B-RV01: Version race condition | `recipe-version-helpers.ts:166-177` | Use `SELECT ... FOR UPDATE` or database sequence for atomic version numbering. |
| A11-20 | B-IF08: Empty SKU in forecasts | `inventory-forecasting.ts:337-339` | Pass actual SKU to `getUpcomingEventsUsingInventory` and implement SKU-to-event-menu mapping. |

#### Tier 3 — Reliability & Correctness

| # | Finding | File:Line | Action |
|---|---------|-----------|--------|
| A11-21 | B-RC03: N+1 unit conversions | `recipe-costing.ts:43-53` | Cache `loadUnitConversions` results; call once per `calculateAllRecipeCosts` batch. |
| A11-22 | B-RC04: Case-sensitive matching | `recipe-costing.ts:105-108` | Use `LOWER()` for case-insensitive matching. |
| A11-23 | B-IF01: Hardcoded 0.1 usage | `inventory-forecasting.ts:307-309` | Replace with per-item consumption rates from recipe data. |
| A11-24 | B-RV02: Manifest/Prisma desync | `recipe-version-helpers.ts:243-308` | Wrap in compensating-transaction pattern; persist Prisma first with outbox for retry. |
| A11-25 | C-WH3: No webhook retry | `packages/webhooks/lib/svix.ts` | Add retry with backoff for `svix.message.create()` failures. |
| A11-26 | B-QB1: CSV formula injection | Both QuickBooks export libs | Prefix cells starting with `=`, `+`, `-`, `@` with single quote. |

#### Tier 4 — Code Quality

| # | Finding | File:Line | Action |
|---|---------|-----------|--------|
| A11-27 | A-09: API key auth unused | Middleware + routes | Add `withApiKeyAuth` to routes that should support API key access (webhook receivers, cron). |
| A11-28 | A-07: No RBAC on 22 routes | Non-manifest routes using `requireTenantId()` | Add role checks for admin-only operations. |
| A11-29 | A-08: Auto-admin on provision | `tenant.ts:184` | Default new users to `role: "member"`. Admin requires explicit promotion. |
| A11-30 | B-N08: Email-only matching | `nowsta-sync-service.ts:52-64` | Add secondary matching key (e.g., employee ID) to handle email changes. |
| A11-31 | C-SC2/3: Sync batching | `supplier-connectors/sync-service.ts` | Batch `syncChanges` operations; fix eager Promise construction in `syncCatalog`. |
| A11-32 | B-IF04: Wrong average denominator | `inventory-forecasting.ts:245-253` | Divide by `dataPoints` instead of `daysToLookBack`. |
| A11-33 | B-RV07: Falsy coercion bug | `recipe-version-helpers.ts:786-790` | Replace `||` with `??` for numeric fields (`prepTimeMinutes`, `cookTimeMinutes`, etc.). |

---

## 11th Pass Addendum: Extended Deep-Dive Findings

> **Audited:** 2026-04-25 (second pass over same scope)
> **Method:** 6 parallel subagents re-auditing auth chain, route-level auth, integration services, external packages, and credential exposure. Findings cross-referenced against existing 11th pass. Only genuinely NEW findings are listed below.
> **Why a second pass:** The original 11th pass was a single-session effort. This addendum covers findings missed in the first pass, provides additional detail on existing findings, and corrects a factual inaccuracy in the API key hashing description.

### Corrections to Existing Findings

**Correction to A-09/A-10 (API Key Auth):**
- The existing 11th pass states API keys are "hashed with bcrypt (10 rounds)." This is incorrect. Per `apps/api/app/lib/api-key-service.ts:61-63`, keys are hashed with **SHA-256** (`crypto.createHash("sha256").update(...).digest("hex")`), not bcrypt. The timing-safe comparison at lines 73-82 is a custom XOR loop, not Node.js `crypto.timingSafeEqual`.
- **Impact:** SHA-256 is a fast hash. While acceptable here (the input is a high-entropy 32-byte random key, not a password), bcrypt would be more resistant if key entropy were ever reduced.

### New Findings — Part A: Authentication & Authorization

#### A-15 | MEDIUM | Sentry-Fixer GET Exposes Configuration Without Auth

- **File:** `apps/api/app/api/sentry-fixer/process/route.ts:416-444`
- The GET handler at `/api/sentry-fixer/process` is public (covered by the `/api/sentry-fixer/process` public route matcher). While the POST handler requires CRON_SECRET, the GET handler returns configuration details including: enabled status, whether GitHub/OpenAI/Slack secrets are configured, and operational state — all without any authentication.
- **Exploitable:** THEORETICAL — information disclosure only, no state mutation.

#### A-16 | HIGH | API Key Lookup Not Scoped by TenantId

- **File:** `apps/api/middleware/api-key-auth.ts:147-166`
- The `findFirst` query filters by `keyPrefix` and `deletedAt: null` but does **NOT** filter by `tenantId`. A key prefix lookup returns the first matching key across all tenants. While the 8-char random prefix makes collisions unlikely, the query allows any key to validate against any tenant's record. Once validated, the `ApiKeyContext` at line 41 includes `tenantId` from the matched record — meaning the caller inherits whichever tenant the first match belongs to.
- **Exploitable:** THEORETICAL — requires key prefix collision (extremely unlikely with 8-char random prefix). However, this is a defense-in-depth gap.
- **Note:** This finding is moot until API key auth is actually used by routes (see A-09).

#### A-17 | LOW | Timing-Safe Comparison Has Theoretical Length Leak

- **File:** `apps/api/app/lib/api-key-service.ts:96-98`
- If `computedHash.length !== hashedKey.length`, the function returns `false` immediately before the constant-time loop. SHA-256 hex strings are always 64 chars, so this never triggers in practice. But the early-return is technically a timing side-channel.
- **Exploitable:** NO — SHA-256 output is always 64 hex chars.

#### A-18 | MEDIUM | Rate Limiter Fail-Open on Redis Errors

- **File:** `apps/api/middleware/global-rate-limit.ts:183-187`, `apps/api/middleware/rate-limiter.ts:414-423`
- Both rate limiters catch Redis errors and allow the request through. If Redis is down or unreachable, all rate limiting is disabled. An attacker could target Redis to disable rate limiting across the platform.
- **Exploitable:** THEORETICAL — requires Redis to be down.

#### A-19 | LOW | Rate Limiter Instantiated Per-Request

- **File:** `apps/api/middleware/rate-limiter.ts:371-374`
- `createRateLimiter()` is called for every request, creating a new `Ratelimit` instance and Redis client wrapper. The global rate limiter at `global-rate-limit.ts:43-46` correctly creates the limiter once at module scope. The per-route limiter should follow the same pattern.
- **Exploitable:** NO — performance concern only.

#### A-20 | MEDIUM | IP Rate Limit Bypass via X-Forwarded-For Spoofing

- **File:** `apps/api/middleware/rate-limiter.ts:157-159`
- Falls back to `x-forwarded-for` header for rate limit identity when tenant headers are missing (which is always — see A-01). Takes `forwardedFor.split(",")[0]` which is the leftmost value — the one most easily spoofed. An attacker can rotate `X-Forwarded-For` values to bypass IP-based rate limits.
- **Exploitable:** YES — when behind a trusted reverse proxy, Vercel overwrites this header, mitigating the risk. Self-hosted deployments are vulnerable.

#### A-21 | INFO | Exempt Patterns Broader Than Needed

- **File:** `apps/api/middleware/global-rate-limit.ts:31-36`
- Exempts `/api/public/*` from rate limiting, but no `/api/public/*` routes exist in the codebase. The exemption is harmless but suggests planned-but-unimplemented public routes.

#### A-22 | THEORETICAL | CSP Allows unsafe-inline and unsafe-eval

- **File:** `apps/app/next.config.ts:251-258`
- The CSP in the web app allows `'unsafe-inline'` and `'unsafe-eval'` in `script-src`. This significantly weakens XSS protection. While Clerk SDK requires `unsafe-eval` for its authentication flows, `unsafe-inline` could potentially be replaced with nonce-based CSP.
- **Note:** This finding applies to the web app (`apps/app`), not the API app. The API app at `apps/api/next.config.ts` sets security headers but no CSP. The `packages/security/proxy.ts:12-13` explicitly disables CSP (`contentSecurityPolicy: false`).

### New Findings — Part B: Integration Services

#### B-G10 | LOW | response.json() Called on DELETE Endpoints (204 No Content)

- **File:** `apps/api/app/lib/goodshuffle-client.ts:245-249, 349-353, 456-460`
- `deleteEvent()`, `deleteInventoryItem()`, and `deleteInvoice()` call `this.request<void>(...)` which attempts `response.json()` at line 157. DELETE endpoints typically return 204 No Content with no body, causing `JSON.parse("")` to throw. The error is caught by the generic error handler, but this means delete operations always appear to "fail" even when they succeed.

#### B-G11 | MEDIUM | Event Status Always Set to 'draft'

- **File:** `apps/api/app/lib/goodshuffle-event-sync-service.ts:278`
- `createConvoyEventFromGoodshuffle()` hardcodes event status to `'draft'` regardless of the Goodshuffle event's actual status. A confirmed/booked event in Goodshuffle appears as draft in Convoy. The status field from Goodshuffle is available in the mapped data but is not used.
- **Data loss risk:** YES — event status information is silently lost on sync.

#### B-G12 | LOW | Inventory Items Created Without Supplier Link Silently

- **File:** `apps/api/app/lib/goodshuffle-inventory-sync-service.ts:240-249`
- When creating inventory items, the code runs `SELECT ... ORDER BY created_at ASC LIMIT 1` to find a default supplier. If no supplier exists, `supplierId` is null and the item is created without a supplier link — no warning or error logged.

#### B-G13 | LOW | Currency Hardcoded to USD

- **File:** `apps/api/app/lib/goodshuffle-invoice-sync-service.ts:274`
- Invoice budget items are created with `currency: 'USD'` hardcoded. Multi-currency tenants will have incorrect currency data on all Goodshuffle-sourced invoices.

#### B-G14 | MEDIUM | Client Objects Store Credentials as Plain Properties

- **File:** `apps/api/app/lib/goodshuffle-client.ts:122-124`, `apps/api/app/lib/nowsta-client.ts:62-65`
- Both client classes store `apiKey` and `apiSecret` as plain class properties with no `toString()` or `toJSON()` override. If the object is logged (e.g., by Sentry error capture or `console.log`), credentials would be exposed in logs/telemetry.

#### B-QB4 | MEDIUM | IIF Column Count Mismatch

- **File:** `apps/api/app/lib/quickbooks-bill-export.ts:291-419`, `apps/api/app/lib/quickbooks-invoice-export.ts:289-419`
- IIF format has mismatched column counts between row types: TRNS rows have 16 fields, SPL rows have 14 fields, but the header declares 16/18 columns respectively. QuickBooks Desktop strictly validates column alignment — mismatched counts cause import failures or data misalignment.

#### B-N08 | LOW | Dry-Run Mode Inflates Import Counters

- **File:** `apps/api/app/lib/nowsta-sync-service.ts:190-192`
- When `dryRun: true`, `processShift()` returns at line 248 without importing, but the caller at line 190-192 still increments `result.shiftsImported++`. Dry-run reports show inflated import counts that don't match actual behavior.

#### B-N09 | MEDIUM | No Aggregate Warning When All Shifts Fail

- **File:** `apps/api/app/lib/nowsta-sync-service.ts:333-334`
- `processShift()` throws if no location is found, which fails the individual shift. If NO location exists for a tenant (misconfiguration), ALL shifts fail individually with no aggregate warning. The sync result just shows `shiftsFailed: N` with no indication that the root cause is missing locations.

#### B-RV08 | HIGH | Duplicated Manifest createInstance() Call

- **File:** `apps/api/app/lib/recipe-version-helpers.ts:243-420`
- `createVersionViaManifest()` (lines 243-308) calls `runtime.createInstance()`. `createVersionWithConstraints()` (lines 311-420) ALSO calls `runtime.createInstance()` AND `createRecipeVersion()`. The duplication means the Manifest side-effect (`createInstance`) runs twice when constraints are used, creating orphaned Manifest instances.

### New Findings — Part C: External Integration Packages

#### C-SC6 | HIGH | Supplier Sync Env Var Injection via connectorId

- **File:** `apps/api/app/api/inventory/supplier-sync/route.ts:93-105`
- Credential keys are constructed dynamically: `process.env[\`SUPPLIER_${connectorId.toUpperCase().replace(/-/g, "_")}_API_KEY\`]`. The `connectorId` comes from user input (parsed from request body at line 62). While Zod validates it as `z.string().min(1)`, there is no constraint limiting it to known connector IDs before the env lookup. A malicious `connectorId` could probe unexpected environment variables.
- **Exploitable:** THEORETICAL — requires valid Clerk auth + knowledge of env var names. But the pattern is dangerous.

#### C-SC7 | MEDIUM | Incremental Sync Fetches Entire Catalog

- **File:** `packages/supplier-connectors/src/sync-service.ts:188-196`
- `syncChanges()` calls `connector.fetchCatalog(config)` to retrieve the entire catalog, then filters by `effectiveFrom >= since` in JavaScript. The `since` parameter is never sent to the supplier API. For large catalogs, this is wasteful and increases the window for data inconsistency if pricing changes between fetch and filter.

#### C-PAY4 | LOW | Hardcoded Stripe API Version

- **File:** `packages/payments/index.ts:6`
- `apiVersion: "2026-01-28.clover"` is hardcoded. When Stripe deprecates this version, the integration may silently break or receive unexpected response shapes.

#### C-PAY5 | MEDIUM | No Refund Handling

- **File:** `packages/payments/` (entire package)
- No refund logic exists. The webhook handler processes `checkout.session.completed` and `subscription_schedule.canceled` but does not handle `charge.refunded`, `payment_intent.payment_failed`, or dispute events. Refunds processed in Stripe Dashboard are never reflected in the application.

#### C-PAY6 | MEDIUM | Webhook Handler Does Full User Scan

- **File:** `apps/api/app/webhooks/payments/route.ts:12-20`
- `getUserFromCustomerId()` calls `clerk.users.getUserList()` with no filters, loading all users into memory, then searches client-side for a matching `stripeCustomerId`. Clerk paginates at 100 users by default — this silently fails for tenants with >100 users.

#### C-WH6 | LOW | Svix Token Cached at Module Level

- **File:** `packages/webhooks/lib/svix.ts:6`
- `const svixToken = keys().SVIX_TOKEN` is called once at module load. If the env var changes at runtime (key rotation), the stale token persists until process restart.

#### C-WH7 | LOW | Test Tokens Accepted in Production

- **File:** `packages/webhooks/keys.ts:8-10`
- Zod schema accepts both `sk_` (production) and `testsk_` (test) prefixed tokens with no environment-aware gating. A `testsk_` token in production routes messages to Svix's test infrastructure.

### New Findings — Cross-Cutting

#### X-01 | MEDIUM | dangerouslySetInnerHTML Usage Without Sanitization

- **Files:**
  - `packages/design-system/components/ui/chart.tsx:117`
  - `packages/seo/json-ld.tsx:17`
  - `apps/app/app/(authenticated)/components/ai-assistant/ai-assistant-panel.tsx:168`
  - `packages/manifest-runtime/src/App.tsx:262`
- Four components use `dangerouslySetInnerHTML`. The JSON-LD component is likely safe (structured data). The AI assistant panel at line 168 is highest risk — renders AI-generated content without sanitization.
- **Exploitable:** THEORETICAL — requires malicious AI response or stored content.

#### X-02 | INFO | Zero Test Coverage Across Integration Packages

- **Files:** `packages/supplier-connectors/`, `packages/payments/`, `packages/webhooks/`
- None of the three packages contain test files. No `.test.ts` or `.spec.ts` files exist. For packages handling financial transactions (payments) and data synchronization (supplier connectors), this is a significant reliability gap.

#### X-03 | LOW | Console.log Statements Include Sensitive IDs

- **File:** `apps/api/app/lib/tenant.ts:114, 148, 170`
- `console.log` statements include `tenantId`, `clerkId`, and `userId`. In production, these are captured by observability tools (Sentry, Better Stack) and may be accessible to support staff who should not see cross-tenant identifiers.

### Additional Recommended Actions

| # | Finding | File:Line | Action |
|---|---------|-----------|--------|
| A11-34 | A-20: IP rate limit bypass | `rate-limiter.ts:157-159` | Trust only the last `X-Forwarded-For` value (set by CDN/proxy), not the first (client-settable). |
| A11-35 | A-18: Redis fail-open | `global-rate-limit.ts:183-187` | Consider fail-closed for production: return 429 when Redis is unreachable. |
| A11-36 | A-16: API key unscoped lookup | `api-key-auth.ts:147` | Add `tenantId` to the `findFirst` where clause (or restructure to hash-based lookup). |
| A11-37 | B-G11: Event status hardcoded to draft | `goodshuffle-event-sync-service.ts:278` | Map Goodshuffle status field to Convoy status enum. |
| A11-38 | B-RV08: Duplicated Manifest call | `recipe-version-helpers.ts:243-420` | Refactor to single code path; `createVersionWithConstraints` should call the base version's logic, not duplicate it. |
| A11-39 | C-SC6: Env var injection | `inventory/supplier-sync/route.ts:93-105` | Validate `connectorId` against `connectorRegistry.listMetadata()` before constructing env var names. |
| A11-40 | C-PAY5: No refund handling | `packages/payments/` | Add handlers for `charge.refunded`, `payment_intent.payment_failed`, and dispute events. |
| A11-41 | C-PAY6: Full user scan | `webhooks/payments/route.ts:12-20` | Replace `getUserList()` with Clerk metadata query or local customer-to-user mapping table. |
| A11-42 | X-01: dangerouslySetInnerHTML | AI assistant panel, chart component | Add DOMPurify or similar sanitizer before rendering HTML content. |
| A11-43 | B-G10: 204 parse failure | `goodshuffle-client.ts:245-249` | Check `response.status === 204` before calling `response.json()` in delete methods. |

---

## 11th Pass Addendum 2: Credential Exposure & Webhook Security Deep-Dive

> **Audited:** 2026-04-25 (third sub-pass over same scope)
> **Method:** 5 parallel subagents — credential exposure scan across all `apps/` + `packages/`, webhook receiver deep-audit, route-level auth re-verification, integration services re-audit, external package re-audit. Findings cross-referenced against existing 11th pass + Addendum 1. Only genuinely NEW findings listed.
> **Why a third sub-pass:** The original 11th pass did not scan for hardcoded secrets in tracked scripts (only grepped source files under `apps/api/` and `packages/`). It also accepted the supplier-catalog webhook as the "gold standard" without verifying the conditional signature check. This addendum corrects both gaps.

### Corrections to Existing Findings

**CRITICAL Correction to A-14 ("No Hardcoded Secrets Found"):**
- The original 11th pass states: "Grep for `sk_live`, `sk_test` ... no hardcoded secret values found in source files." This is **incorrect**. The grep only covered `apps/` and `packages/` directories — it missed **5 tracked scripts in the repository root** that contain hardcoded credentials. See findings AE2-A01 and AE2-A02 below. Finding A-14 should be revised to acknowledge these exceptions.

**Correction to A-03 Assessment ("supplier-catalog is gold standard"):**
- The original 11th pass states: "`webhooks/supplier-catalog` correctly uses HMAC-SHA256 with `timingSafeEqual` — this is the gold standard pattern." While the HMAC implementation itself is correct, the signature check is **conditional** — it only runs when the `x-supplier-signature` header is present. Requests without this header are processed without verification. See finding AE2-A04 below. The "gold standard" assessment should be qualified.

### New Findings — Part A: Credential Exposure & Webhook Security

#### AE2-A01 | CRITICAL | Hardcoded Clerk Secret Key in Tracked Scripts

- **Files:**
  - `test-cp031-cp048-cp049.mjs:15`
  - `test-final.mjs:16`
  - `debug-ticket.mjs:7`
- All three tracked-in-git scripts contain an identical hardcoded Clerk `secretKey`: `sk_test_8hldxeqOyMCZV62r6ves3vMapWwko8Qfl1qa2FOGHr`. This key grants full backend API access to the Clerk instance — user impersonation, org management, session creation. Anyone with repository read access can extract it.
- **Exploitable:** YES — key is in git history even if files are removed.
- **Action:** Rotate the Clerk secret key immediately. Refactor scripts to use `process.env.CLERK_SECRET_KEY` or `git rm --cached` them. If key was ever pushed to a public remote, treat as a credential breach.

#### AE2-A02 | CRITICAL | Hardcoded Database Connection String in Tracked Scripts

- **Files:**
  - `check-new-event.mjs:4`
  - `test-cp086.mjs:119-120`
- Both contain a real Neon PostgreSQL connection string: `postgresql://neondb_owner:npg_4xRiAGLCaT7s@ep-divine-math-ah5lmxku[...].us-east-1.aws.neon.tech/neondb`. Credentials (`neondb_owner` / `npg_4xRiAGLCaT7s`) are embedded in the URL.
- **Exploitable:** YES — direct database access with owner-level credentials.
- **Action:** Rotate the Neon database password immediately. Refactor scripts to use `process.env.DATABASE_URL`.

#### AE2-A03 | CRITICAL | Clerk Webhook Body Round-Trip Breaks Signature Verification

- **File:** `apps/api/app/webhooks/auth/route.ts:166-167`
- The Clerk webhook handler reads the body via `request.json()` and then re-serializes with `JSON.stringify(payload)` before passing to Svix's `webhook.verify()`. This JSON round-trip can alter whitespace, key ordering, and number formatting compared to the raw bytes Svix signed. A legitimate webhook could be rejected (false negative), or an attacker could craft a payload that passes verification after the round-trip transformation (theoretical false positive).
- **Contrast:** The Stripe webhook handler at `apps/api/app/webhooks/payments/route.ts:70` correctly uses `request.text()` for the raw body — this is the correct pattern.
- **Exploitable:** YES — legitimate webhooks may be rejected, causing user creation/update events to be silently lost.
- **Action:** Replace `request.json()` + `JSON.stringify()` with `request.text()` and pass the raw string to `webhook.verify()`.

#### AE2-A04 | HIGH | Supplier Catalog Webhook Signature Check Bypassed by Omitting Header

- **File:** `apps/api/app/api/webhooks/supplier-catalog/route.ts:124-157`
- The HMAC-SHA256 signature verification is **conditional**: `if (signature)` at line 125. If the `x-supplier-signature` header is absent, the entire verification block is skipped and the payload is processed without any authentication. An attacker can inject arbitrary vendor catalog data (pricing, availability, product details) by sending POST requests without a signature header.
- **Note:** The HMAC implementation itself is correct (uses `timingSafeEqual`), but the conditional guard makes it ineffective against attackers who simply omit the header.
- **Exploitable:** YES — any external party can submit catalog updates without credentials.
- **Action:** Reject requests where `x-supplier-signature` header is missing. Change `if (signature)` to a required check that returns 401 when absent.

#### AE2-A05 | HIGH | PII Logged in Clerk Webhook Body

- **File:** `apps/api/app/webhooks/auth/route.ts:192`
- After Svix signature verification, the full webhook body is logged: `log.info("Webhook", { id, eventType, body })`. This body contains user PII — email addresses, phone numbers, first/last names, avatar URLs. The PII enters the observability pipeline (Sentry, Better Stack) and may be accessible to support staff and developers.
- **Exploitable:** NO — but PII exposure to internal teams violates data minimization.
- **Action:** Remove the `body` field from the log statement, or redact to only `eventType` + `id` + timestamp.

#### AE2-A06 | HIGH | Unscoped Raw SQL in Email Webhook

- **File:** `apps/api/app/api/collaboration/notifications/email/webhook/route.ts:81-88`
- The unauthenticated Resend email webhook performs a raw SQL `$queryRaw` lookup by `email_id` (Resend ID) without any `tenant_id` filter. Combined with the lack of authentication (A-03), any external caller can enumerate email IDs and trigger database queries across all tenants. The query is parameterized (no SQL injection), but the lack of auth + lack of tenant scoping means this endpoint leaks cross-tenant email metadata.
- **Exploitable:** YES — in conjunction with A-03 (no signature verification).
- **Action:** Add HMAC signature verification (as A-03 recommends) AND add `tenant_id` filter to the query.

### New Findings — Part B: Security Configuration

#### AE2-B01 | MEDIUM | CSP Completely Disabled

- **File:** `packages/security/proxy.ts:13`
- Content Security Policy is explicitly set to `false`: `contentSecurityPolicy: false`. The comment notes "values depend on which Next Forge features are enabled." The web app (`apps/app/next.config.ts:250-265`) does set comprehensive CSP headers, but the API app (`apps/api/next.config.ts:81-96`) does not — it sets X-Frame-Options, X-Content-Type-Options, and HSTS but has no CSP at all. The `packages/security/` Nosecone config is the centralized place for this.
- **Exploitable:** THEORETICAL — depends on whether XSS vectors exist.
- **Action:** Configure at least a basic CSP in `packages/security/proxy.ts` or in `apps/api/next.config.ts` headers.

#### AE2-B02 | MEDIUM | Inconsistent CRON_SECRET Handling Across Cron Endpoints

- **Files:**
  - `apps/api/app/api/cron/inventory-audit/route.ts:131` — returns 503 when CRON_SECRET not set (correct)
  - `apps/api/app/api/cron/idempotency-cleanup/route.ts` — returns 503 when CRON_SECRET not set (correct)
  - `apps/api/app/api/cron/email-reminders/route.ts:27-29` — **allows access** when CRON_SECRET not set
  - `apps/api/app/api/cron/contract-expiration-alerts/route.ts:42-44` — **allows access** when CRON_SECRET not set
  - `apps/api/app/api/cron/webhook-retry/route.ts` — uses CRON_SECRET (correct)
- Two of five cron endpoints have `verifyCronAuth()` functions that return `true` when `CRON_SECRET` is not configured, effectively making those endpoints publicly accessible in environments where the env var is accidentally unset.
- **Exploitable:** YES — in misconfigured deployments.
- **Action:** Make all cron endpoints return 503 when `CRON_SECRET` is not set (follow the `inventory-audit` pattern).

#### AE2-B03 | MEDIUM | Public Routes at `/api/public/*` Blocked by Clerk Middleware

- **File:** `apps/api/proxy.ts:6-11`
- The `isPublicRoute` matcher does NOT include `/api/public(.*)`. However, public proposal response and contract signing endpoints exist at `/api/public/proposals/[token]/respond` and `/api/public/contracts/[token]/sign`. Since the middleware matcher is `["/api(.*)"]`, these routes go through Clerk auth. The route handlers use token-based access (no `auth()` call), but the middleware rejects unauthenticated requests with 401 before the handler can validate the token. This means **public proposal/contract links are likely broken for unauthenticated users**.
- **Exploitable:** NO — this is a **functional bug**, not a security vulnerability. The routes are over-protected rather than under-protected.
- **Action:** Add `/api/public(.*)` to the `isPublicRoute` matcher in `proxy.ts`.

#### AE2-B04 | MEDIUM | Sentry Signature Verification Falls Back to Timing-Unsafe Comparison

- **File:** `packages/sentry-integration/src/webhook.ts:41-44`
- The `verifySentrySignature` function catches hex parsing errors and falls back to plain string comparison: `return digest === signature`. This is NOT timing-safe and leaks information about the expected signature via timing side-channels. The comment acknowledges this: "(less secure but handles edge cases)."
- **Exploitable:** THEORETICAL — requires timing measurement capability and hex parsing failure.
- **Action:** Return `false` instead of falling back to `===`. If hex parsing fails, the signature is invalid.

#### AE2-B05 | MEDIUM | Cron Retry Uses Timing-Unsafe Bearer Token Comparison

- **File:** `apps/api/app/api/cron/webhook-retry/route.ts:49-50`
- The CRON_SECRET is compared via string inequality: `authHeader !== \`Bearer ${cronSecret}\``. This is not a timing-safe comparison. An attacker could use timing side-channels to brute-force the CRON_SECRET character by character.
- **Exploitable:** THEORETICAL — requires many requests and precise timing measurement.
- **Action:** Replace with `crypto.timingSafeEqual(Buffer.from(authHeader), Buffer.from(\`Bearer ${cronSecret}\`))`.

#### AE2-B06 | MEDIUM | Nowsta Sync Exposes Employee Emails in Error Messages

- **File:** `apps/api/app/lib/nowsta-sync-service.ts:173-178`
- The error message concatenates all unmapped employee email addresses: `${unmapped.map((e) => e.email).join(", ")}`. This list is stored in `result.errors`, which is persisted to `nowstaConfig.lastSyncError` in the database (line 208-210). Employee PII (email addresses) are stored in an error log column visible through the admin UI.
- **Exploitable:** NO — internal data exposure to tenant admins.
- **Action:** Store only the count of unmapped employees, not their email addresses. Or log emails to a separate audit table not exposed in the UI.

### New Findings — Part C: Minor & Informational

#### AE2-C01 | LOW | Integration Client Credentials Stored as Plain Class Properties

- **Files:** `apps/api/app/lib/nowsta-client.ts:62-64`, `apps/api/app/lib/goodshuffle-client.ts:126-129`
- Both `NowstaClient` and `GoodshuffleClient` store `apiKey` and `apiSecret` as plain private properties with no `toString()` or `toJSON()` override. If the client instance is accidentally logged (e.g., by Sentry error capture or `console.log`), credentials would be exposed in logs/telemetry.
- **Exploitable:** THEORETICAL — requires accidental logging of the client object.
- **Action:** Add `toJSON()` override that returns `[Client redacted]` or similar.

#### AE2-C02 | LOW | Full Stripe Event Returned in Webhook Response

- **File:** `apps/api/app/webhooks/payments/route.ts:100`
- On successful processing, the full Stripe event object is returned: `NextResponse.json({ result: event, ok: true })`. This includes potentially sensitive customer and subscription details. While the caller is Stripe (low risk in practice), returning full event data is unnecessary.
- **Action:** Return only `{ ok: true, eventId: event.id }`.

#### AE2-C03 | LOW | Integration Test Logs Database URL Host

- **File:** `apps/api/test/setup.integration.ts:26-27`
- Logs the host portion of `DATABASE_URL`: `console.log("[integration] DATABASE_URL host:", process.env.DATABASE_URL?.split("@")[1]?.split("?")[0])`. Credentials are stripped (everything before `@`), but the hostname, region, and database name are logged in test output.
- **Action:** Remove or reduce to just logging whether DATABASE_URL is set.

### Positive Findings (Security Done Right)

These patterns are correctly implemented and should be preserved:

1. **Centralized secrets management** — `@t3-oss/env-nextjs` with Zod validation in per-package `keys.ts` files. All production code loads secrets via `process.env`. (Files: `packages/*/keys.ts`, `apps/api/env.ts`)

2. **Integration secrets masked in API responses** — Both `apps/api/app/api/integrations/goodshuffle/config/route.ts:71-78` and `apps/api/app/api/integrations/nowsta/config/route.ts:67-73` correctly mask API keys (`maskApiKey()` returning first 4 / last 4) and replace secrets with `"********"`.

3. **API key service uses secure patterns** — Keys generated with `crypto.randomBytes(32)`, hashed with SHA-256 (appropriate for high-entropy keys), timing-safe comparison. Plain key returned only once at creation. (File: `apps/api/app/lib/api-key-service.ts`)

4. **Outbound webhook signatures are correct** — HMAC-SHA256 with timestamp-prefixed payload, standard `t=,v1=` format. (File: `packages/notifications/outbound-webhook-service.ts:55-65`)

5. **Security headers on API app** — X-Frame-Options: DENY, X-Content-Type-Options: nosniff, HSTS with preload, Referrer-Policy: strict-origin-when-cross-origin, Permissions-Policy. (File: `apps/api/next.config.ts:81-96`)

6. **CORS is NOT overly permissive** — Production has no CORS headers; development only allows `http://127.0.0.1:2221`. No `Access-Control-Allow-Origin: *`. (File: `apps/api/app/lib/cors.ts`)

7. **Secretlint configured** — `.secretlintrc.json` with recommended preset. (However, the hardcoded secrets in findings AE2-A01/A02 indicate secretlint is either not run in CI or these root scripts are excluded.)

### Summary of New Findings

| Severity | Count | Finding IDs |
|----------|-------|-------------|
| CRITICAL | 3 | AE2-A01 (Clerk secret in scripts), AE2-A02 (DB creds in scripts), AE2-A03 (webhook body round-trip) |
| HIGH | 3 | AE2-A04 (supplier sig bypass), AE2-A05 (PII in webhook log), AE2-A06 (unscoped email webhook) |
| MEDIUM | 6 | AE2-B01 through AE2-B06 |
| LOW | 3 | AE2-C01 through AE2-C03 |

### Updated Recommended Actions

| # | Finding | Priority | Action |
|---|---------|----------|--------|
| A11-44 | AE2-A01: Clerk secret in scripts | **TIER 0** | Rotate Clerk `sk_test_8hldxeqOy...` key immediately. `git rm --cached` the 3 scripts, refactor to use `process.env`. |
| A11-45 | AE2-A02: DB creds in scripts | **TIER 0** | Rotate Neon `neondb_owner:npg_4xRiAGLCaT7s` password immediately. `git rm --cached` the 2 scripts, refactor to use `process.env`. |
| A11-46 | AE2-A03: Webhook body round-trip | **TIER 0** | Replace `request.json()` + `JSON.stringify(payload)` with `request.text()` in `apps/api/app/webhooks/auth/route.ts:166`. |
| A11-47 | AE2-A04: Supplier sig bypass | **TIER 1** | Make `x-supplier-signature` header required in `supplier-catalog/route.ts:125`. Reject with 401 if absent. |
| A11-48 | AE2-A05: PII in webhook log | **TIER 1** | Remove `body` from `log.info("Webhook", ...)` at `webhooks/auth/route.ts:192`. Log only `id`, `eventType`, `timestamp`. |
| A11-49 | AE2-A06: Unscoped email webhook | **TIER 1** | Add HMAC signature verification (as A-03 recommends) AND add `tenant_id` filter to the raw SQL query. |
| A11-50 | AE2-B02: Inconsistent CRON_SECRET | **TIER 2** | Make `email-reminders` and `contract-expiration-alerts` return 503 when `CRON_SECRET` not set. |
| A11-51 | AE2-B03: Public routes blocked | **TIER 2** | Add `/api/public(.*)` to `isPublicRoute` matcher in `proxy.ts`. |
| A11-52 | AE2-B04: Sentry timing-unsafe fallback | **TIER 3** | Return `false` instead of `digest === signature` in the catch block. |
| A11-53 | AE2-B05: Cron timing-unsafe comparison | **TIER 3** | Replace string comparison with `crypto.timingSafeEqual` for CRON_SECRET check. |
| A11-54 | AE2-B06: Employee emails in errors | **TIER 3** | Store only unmapped count, not email addresses. |
| A11-55 | AE2-B01: CSP disabled | **TIER 3** | Configure at least a basic CSP in `packages/security/proxy.ts`. |
