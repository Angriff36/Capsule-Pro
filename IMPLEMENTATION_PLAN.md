# Capsule-Pro Implementation Plan — Live Queue

> **Last updated:** 2026-04-29 (14-agent comprehensive re-audit). **Convention:** this file is the **live queue only**. Completed pass write-ups are archived, not appended here. See the **Archive Map** at the bottom for history.

**ULTIMATE GOAL:** Every UI button, modal, and form must actually work when clicked.

---

## Current Task — Production-Readiness Gap Analysis

**STATUS: COMPREHENSIVE RE-AUDIT COMPLETE — RE-PRIORITIZED FOR EXECUTION.**

### Key Findings Summary (Updated 2026-04-29)

| Category | Finding | Status | Priority |
|----------|---------|--------|----------|
| **Pages That Never Load** | 7 pages with `data.data` mismatch | **ALL 7 FIXED** ✅ | ~~P0~~ |
| **Dead Buttons** | 8 buttons fixed, 1 blocked, 1 not rendered (down from 16) | 1 BLOCKED + 1 NOT RENDERED | **P0** |
| **Stub Pages with Live APIs** | 2 procurement pages still static | **ALL FIXED ✅** | ~~P0~~ |
| **RLS Policies** | 25+ tables MISSING RLS across 7 schemas | **ALL 53 FIXED ✅** | ~~P0~~ |
| **RAW_SQL Security** | 45 routes using $queryRawUnsafe (down from 67) | **6 CONVERTED** (39 remaining) | **P0** |
| **Missing API Routes** | 4 routes still missing | **ALL FIXED ✅** | ~~P1~~ |
| **BROKEN_PRISMA_READ** | 2 entities NOT wired | **ALL FIXED ✅** | ~~P1~~ |
| **Backend-Complete, No UI** | 4 major systems | UNCHANGED | P1 |
| **SPEC Coverage** | 9/45 complete (20%) | UPDATED COUNT | P2 |
| **Placeholder Pages** | 12 pages are stubs or "Coming Soon" | UNCHANGED | P2 |
| **Test Coverage** | ~80 API domains with zero tests | UNCHANGED | P3 |

### Audit Statistics (14 agents, 2026-04-29)

- **Total route files:** 1,352
- **Manifest command routes:** 853 (63%)
- **Raw SQL routes:** 45 (3.3%)
- **Routes without error handling:** 35 (2.6%)
- **Active manifests:** 74
- **Disabled manifests:** 6
- **Prisma models:** 212
- **Manifest routes:** 725
- **Filesystem route dirs:** 710
- **Specs total:** 45 (9 COMPLETE, 36 TODO)
- **API domains without tests:** ~80 of ~126

---

## TIER 0 — Critical UI Broken Actions (DO THESE FIRST)

User-visible breakage. Every item below is a page that errors, a button that does nothing, or data that never loads.

### T0-A: Pages That Never Load Data — ALL FIXED ✅

Root cause: `manifestSuccessResponse()` spreads data at top level, but UI reads `data.data.xxx`. All 7 fixed as of 2026-04-29.

| # | File | Status |
|---|------|--------|
| 1 | `logistics/dispatch/page.tsx` | ✅ FIXED |
| 2 | `logistics/drivers/page.tsx` | ✅ FIXED |
| 3 | `logistics/vehicles/page.tsx` | ✅ FIXED |
| 4 | `facilities/areas/page.tsx` | ✅ FIXED |
| 5 | `facilities/assets/page.tsx` | ✅ FIXED |
| 6 | `facilities/schedules/page.tsx` | ✅ FIXED |
| 7 | `facilities/work-orders/page.tsx` | ✅ FIXED |

---

### T0-B: Dead Buttons / Non-functional Actions (1 BLOCKED + 1 NOT RENDERED)

| # | File | Bug | Status |
|---|------|-----|--------|
| 8 | `accounting/invoices/invoices-client.tsx` | "New Invoice" button navigates to /accounting/invoices/new | ✅ FIXED (router.push) |
| 9 | `accounting/payments/payment-list-client.tsx` | "New Payment" button navigates to /accounting/payments/new | ✅ FIXED (router.push) |
| 10 | `accounting/payments/payment-list-client.tsx` | "Refund" button calls POST /api/accounting/payments/[id] | ✅ FIXED (handleRefund with reason/amount) |
| 11 | `accounting/payments/payment-list-client.tsx` | "View" links to `/accounting/payments/[id]` | ✅ FIXED (onClick now navigates) |
| 12 | `accounting/payments/payment-list-client.tsx` | "Create Payment" links to new-payment | ✅ FIXED (routes to export) |
| 13 | `payroll/timecards/page.tsx` | Edit icon prompts for reason then calls handleEditRequest | ✅ FIXED |
| 14 | `payroll/timecards/page.tsx` | Flag icon prompts for type/notes then calls handleFlagException | ✅ FIXED |
| 15 | `payroll/tax-setup/page.tsx` | Delete state tax trash icon deactivates via PUT | ✅ FIXED (handleDeleteStateTax) |
| 16 | `payroll/tax-setup/page.tsx` | "Add State" never sends API call | ✅ FIXED (handleAddStateTax calls API) |
| 17 | `payroll/payouts/page.tsx` | Entire page hardcoded — no PayrollRun Prisma model or payouts API | ❌ BLOCKED (requires backend work first) |
| 18 | `payroll/timecards/timecard-detail-modal.tsx` | "Clock Out" calls PUT /api/timecards/[id] | ✅ FIXED (handleClockOut) |
| 19 | `payroll/timecards/timecard-bulk-actions.tsx` | Dead code, never rendered (not imported) | ❌ NOT RENDERED (no fix needed) |
| 20 | `payroll/periods/page.tsx` | "View Details" navigates to /payroll/periods/[id] | ✅ FIXED (router.push) |
| 21 | `accounting/payments/payment-list-client.tsx` | Export calls non-existent endpoint | ✅ FIXED (route exists) |
| 22 | `accounting/invoices/payment-form-client.tsx` | After payment redirects to missing page | ✅ FIXED (routes correctly) |
| 23 | `payroll/direct-deposit/page.tsx` | URL mismatch with bank-accounts API | ✅ FIXED (correct endpoint) |

---

### T0-C: Stub Pages with Live APIs — ALL FIXED ✅

| # | File | Bug | API Status | Status |
|---|------|-----|------------|--------|
| 24 | `procurement/requisitions/page.tsx` | Static placeholder, zero API calls | 8 command routes functional | ✅ FIXED — Full list page with search, tabs, summary cards, line items. New requisition page with line item picker. Detail page with workflow actions. |
| 25 | `procurement/vendor-contracts/page.tsx` | Static placeholder, zero API calls | 10 command routes functional | ✅ FIXED — Full list page with search, tabs, summary cards, create dialog. Detail page with workflow actions and compliance metrics. |
| 26 | `procurement/purchase-orders/new/page.tsx` | PO creation broken | API returns `{ data: [...], pagination }` | ✅ FIXED (fully implemented) |

---

## TIER 0.5 — Security (IMMEDIATE ACTION REQUIRED)

### RLS Coverage Audit (2026-04-29)

**Tables WITH RLS (~83):**
- tenant_admin: admin_tasks, admin_chat_threads/participants/messages, audit_log, ActivityFeed, webhook_dead_letter_queue, manifest_command_telemetry
- tenant_staff: employee_bank_accounts, labor_budgets, budget_alerts, **users, employee_deductions, training_modules, training_assignments, employee_availability, employee_certifications, payroll_periods, payroll_runs, schedules, schedule_shifts, time_entries, timecard_edit_requests**
- tenant_events: event_budgets, budget_line_items, **events, event_profitability, event_summaries, event_reports, catering_orders**
- tenant_inventory: shipments, shipment_items, vendor_contacts, vendor_ratings, procurement_budgets, procurement_budget_alerts, **inventory_items, inventory_transactions, inventory_suppliers, vendor_catalog, pricing_tiers, bulk_order_rules, purchase_requisitions, purchase_requisition_items, vendor_contracts, purchase_orders, purchase_order_items**
- tenant_crm: crm_scoring_rules, **clients, client_contacts, client_interactions, leads, proposals**
- tenant_accounting: payment_methods, payments, payment_refund_attempts, **chart_of_accounts, invoices, collection_cases, collection_actions, collection_payment_plans, revenue_recognition_schedules, revenue_recognition_lines**
- tenant_logistics: delivery_routes, route_stops, vehicles, drivers
- tenant_facilities: facilities, facility_assets, **facility_areas, maintenance_work_orders, preventive_maintenance_schedules**
- tenant_kitchen: prep_task_plan_workflows, **prep_tasks, kitchen_tasks, recipes, recipe_versions, ingredients, stations, dishes, menus, prep_lists, waste_entries**

**All 53 previously missing tables now have RLS.** ✅ FIXED via migration `20260429140000_add_rls_missing_tables`.

### P0-4: RAW_SQL Security — 45 routes using $queryRawUnsafe → 39 remaining

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | ~5 | UNCHANGED (dynamic query builders) |
| HIGH | ~15 | **6 CONVERTED** to Prisma ORM (Batch 1 quick wins) |
| MEDIUM | ~25 | UNCHANGED (tagged template, parameterized) |

**Batch 1 Converted (6 routes, eliminated 10 `$queryRawUnsafe` calls):**
- `procurement/vendors/[id]` — 4 `$queryRawUnsafe` → `findFirst` with `include` + `count`
- `procurement/purchase-orders/[id]` — 2 `$queryRawUnsafe` → `findFirst` + `findMany`
- `logistics/drivers/commands/create` — 1 `$queryRaw` → `driver.create`
- `logistics/drivers/commands/delete` — 1 `$queryRaw` → `driver.update` (soft delete)
- `events/[eventId]/waitlist` — 2 `$queryRawUnsafe` → 2 `$queryRaw` (tagged template, safer)
- `inventory/supplier-sync` GET — 1 `$queryRawUnsafe` → `supplierSyncLog.findMany`

---

## TIER 1 — Missing API Routes — ALL FIXED ✅

| # | Entity/Route | Bug | Status |
|---|-------------|-----|--------|
| 27 | `logistics/vehicles/commands/delete` | Vehicle delete route doesn't exist | ✅ FIXED (soft-delete via raw SQL) |
| 28 | `facilities/areas/commands/edit|delete` | No edit/delete command routes | ✅ FIXED (COALESCE update, soft-delete) |
| 29 | `facilities/commands/edit|delete` | No facility edit/delete routes | ✅ FIXED (COALESCE update, soft-delete) |
| 30 | `facilities/work-orders/commands/update-status` | Status transitions not wired in UI | ✅ ROUTE EXISTS (UI needs wiring) |
| 31 | `facilities/schedules/commands/edit|delete` | No schedule edit/delete routes | ✅ FIXED |
| 32 | `facilities/components/facilities-navigation.tsx` | "Work Orders" link | ✅ FIXED (points to /facilities) |

---

## TIER 1 — Broken Prisma Read — ALL FIXED ✅

| # | Entity | Fix |
|---|--------|-----|
| 33 | VendorCatalog | ✅ FIXED — import + case added to `createPrismaStoreProvider` |
| 34 | VarianceReport | ✅ FIXED — import + case added to `createPrismaStoreProvider` |
| — | TrainingModule | ✅ FIXED (bonus) — same pattern, was also unwired |

---

## TIER 1 — Missing API Commands (0 entities)

| # | Entity | Status | Missing Commands |
|---|--------|---------|------------------|
| 35 | CollectionCase | ✅ FIXED | reopen (added to existing PATCH) |
| 36 | Invoice | ✅ FIXED | apply-payment, mark-as-paid, mark-overdue, send-reminder, void |
| 37 | PaymentMethod | ✅ FIXED | mark-as-default, verify, flag-for-fraud, mark-expired, remove |
| 38 | RevenueRecognitionSchedule | ✅ FIXED | adjust, cancel, recognize, reverse, start |

All 4 entities now have complete command implementations with Prisma models in `schema.prisma`.

### Venue Migration

- Prisma model EXISTS, database table does NOT
- API routes at `apps/api/app/api/venues/` return 404
- Frontend works via server actions (bypasses API)
- Fix: Create migration for `venues` table + enable RLS

---

## TIER 1.5 — Backend Complete, No Production UI (4 major systems)

These have full API backends but zero or placeholder frontend. Each is a significant UI build.

### GS-1: GoodShuffle Integration (3 specs)
- Backend: client, sync service, config API, status API — all functional
- UI: Settings/integrations page is ModuleSection placeholder
- Blocker: `settings/integrations/page.tsx` must be built first (P2-51)

### GS-2: Nowsta Integration
- Backend: 6 API routes, client, sync service, 3 Prisma models
- UI: ZERO frontend pages

### GS-3: SMS Notification System
- Backend: 9+ API routes, Twilio integration, automation engine, 5 Prisma models
- UI: ZERO frontend pages

### GS-4: Outbound Webhooks
- Backend: 9 API routes, retry, DLQ, cron
- UI: Only dev-console placeholder. ZERO production UI

---

## TIER 2 — Missing SPEC Implementations (9/45 = 20%)

### SPEC Coverage by Domain

| Domain | Complete | Total | Pct |
|--------|----------|-------|-----|
| Performance | 3 | 3 | 100% |
| Kitchen | 3 | 10 | 30% |
| Administrative | 3 | 9 | 33% |
| Staff | 0 | 8 | 0% |
| AI | 0 | 7 | 0% |
| CRM | 0 | 4 | 0% |
| Inventory | 0 | 4 | 0% |
| Mobile | 0 | 5 | 0% |
| Warehouse | 0 | 3 | 0% |

### Zero-Implementation SPECs (prioritized)

| # | Spec | Domain | What exists |
|---|------|--------|-------------|
| 39 | Kitchen bulk-edit | Kitchen | 0% — no route, no component |
| 40 | Kitchen bulk-grouping | Kitchen | 0% — no route, no component |
| 41 | Kitchen proposal-generation | Kitchen | 0% — no route, no component |
| 42 | Kitchen timeline-builder | Kitchen | 0% — no route, no component |
| 43 | Mobile recipe viewer | Mobile | 0% — no route, no component |
| 44 | AI bulk task generation | AI | 0% — no endpoint, no UI |
| 45 | Automated email workflows | Admin | API scaffolding only, no UI, no trigger engine |
| 46 | Training/HRMS (3 of 10 stories) | Staff | 0% for 3 stories |
| 47 | QuickBooks integration (3 specs) | Integration | 0% |

---

## TIER 2 — Placeholder Pages (12 pages)

| # | File | Status | Action |
|---|------|--------|--------|
| 48 | `marketing/page.tsx` | "Coming Soon" | Implement or remove nav link |
| 49 | `marketing/campaigns/page.tsx` | "Coming Soon" | Implement or remove nav link |
| 50 | `settings/security/page.tsx` | ModuleSection placeholder | Build security settings UI |
| 51 | `settings/integrations/page.tsx` | ModuleSection placeholder | Blocks GoodShuffle UI (GS-1) |
| 52 | `tools/ai/page.tsx` | ModuleSection placeholder | Build AI tools UI |
| 53 | `tools/battleboards/page.tsx` | ModuleSection placeholder | Build battleboard tools UI |
| 54 | `tools/autofill-reports/page.tsx` | ModuleSection placeholder | Build autofill UI |
| 55 | `dev-console/api-keys/page.tsx` | "Placeholder screen" | Build API key management |
| 56 | `dev-console/users/page.tsx` | "Placeholder screen" | Build user management |
| 57 | `dev-console/webhooks/page.tsx` | "Placeholder screen" | Build webhook management |
| 58 | `dev-console/dashboard` | All buttons hardcoded/no-op | Wire to real data |
| 59 | `dev-console/tenants` | All buttons hardcoded/no-op, fake data | Wire to real data |

---

## TIER 2 — Permanently Disabled Buttons

| # | File | Line | Bug |
|---|------|------|-----|
| 60 | `crm/scoring/scoring-rules-client.tsx` | 447 | Delete permanently disabled ("not implemented yet") |
| 61 | `events/[eventId]/battle-board/export-button.tsx` | 114 | "Email PDF (Coming Soon)" disabled |
| 62 | `warehouse/shipments/shipments-page-client.tsx` | — | "Add Item" button has empty onClick handler |

---

## TIER 2 — Fake Data / Random Logic in Production

| # | File | Line | Bug | Fix |
|---|------|------|-----|-----|
| 63 | `scheduling/time-off/time-off-form.tsx` | 148 | `Math.random() > 0.8` for conflict detection | Replace with real conflict check API |
| 64 | `kitchen/production-board-client.tsx` | 106-111 | Mock weather data | Remove or gate behind dev flag |
| 65 | `kitchen/recipes/recipe-editor-modal.tsx` | 89,118,187 | `Math.random().toString()` for IDs | Use server-generated IDs |
| 66 | `kitchen/allergen-warning-test/page.tsx` | — | Visual test page in production route | Move to `/dev/` or delete |
| 67 | `test-page.tsx` | — | Bare test page in production route | Delete |

---

## TIER 2 — alert() Calls to Replace (15 total)

| File | Count |
|------|-------|
| `calendar/sync` | 7 |
| `administrative/trash` | 1 |
| `kitchen/tasks/new` | 1 |
| `procurement/budget` | 2 |
| `procurement/vendors` | 2 |
| `kitchen/recipes/menus` | 2 |

Fix: Replace all with toast notifications via the design system.

---

## TIER 2 — Test Coverage

| Domain | Status | Action |
|--------|--------|--------|
| Recipe/Prep system | NO TESTS | Add unit tests |
| Payroll workflows | NO INTEGRATION | Add integration tests |
| Menu/Dish management | NO TESTS | Add unit tests |
| Training management | NO TESTS | Add unit tests |
| Event lifecycle | PARTIAL (1 file) | Expand coverage |
| 80+ API domains | ZERO TESTS | Prioritize core business domains |

### Skipped Tests

- **API:** 1 skipped `describe` block in `sales-reporting/generate.test.ts`
- **E2E:** 41 skipped tests across 13 files
- **API test files:** 46 files covering 20 domains (of ~126 total)

---

## TIER 3 — Tech Debt / Polish

### Settings/Admin Gaps

| # | File | Bug |
|---|------|-----|
| 68 | `settings/audit-log/page.tsx` | Filter form broken (selects outside form, no submit button) |
| 69 | `settings/team/page.tsx` | Read-only, no Invite/Edit/Remove actions |
| 70 | 18+ API routes | No UI consumer (apikey, rolepolicy, notification, settings/api-keys) |

### TBD Placeholders in Code

| Location | Placeholder | Fix |
|----------|-------------|-----|
| Events (7 files) | "Venue TBD" | "No venue assigned" or "Add venue" button |
| Events | "Time not set" | "Time not scheduled" |
| Battle Board | "TBD" station default | "Unassigned" or "Add station" |

### AGENTS.md Corrections

| Claim | Actual Status |
|-------|---------------|
| "vendor-contracts commands are functional" | RESOLVED (2026-04-29) — UI fully implemented with list, detail, create dialog |
| "Procurement requisitions routes functional" | RESOLVED (2026-04-29) — UI fully implemented with list, new, detail pages |
| "RLS on vendor_contacts missing" | RESOLVED (2026-04-28) |

### Generator Block

- Published `@angriff36/manifest` package is stale
- Local source has fixes, 80 route files carry manual patches
- 15 routes in manifest without filesystem implementation

### Manifest Route Gaps

- **725 routes in manifest** vs **710 route directories in filesystem** — 15 route gap
- **6 quarantined manifests** in `manifests-disabled/`: digital-twin, facility, knowledge-base, payment-reconciliation, prep-task-dependency, quality-control
- **111 entities lack documentation** (expected in `docs/entities/`)

---

## Recently Resolved

### 2026-04-29 — RLS + RAW_SQL Security Hardening
- **FIXED T0.5 RLS:** 53 tables across 7 schemas now have RLS policies (migration `20260429140000`)
  - tenant_accounting: 7 tables (chart_of_accounts, invoices, collection_cases, etc.)
  - tenant_inventory: 11 tables (inventory_items, purchase_orders, vendor_contracts, etc.)
  - tenant_staff: 12 tables (users, schedules, payroll_periods, etc.)
  - tenant_crm: 5 tables (clients, leads, proposals, etc.)
  - tenant_events: 5 tables (events, catering_orders, etc.)
  - tenant_kitchen: 10 tables (recipes, prep_tasks, dishes, etc.)
  - tenant_facilities: 3 tables (facility_areas, work_orders, etc.)
- **FIXED P0-4 Batch 1:** 6 routes converted from `$queryRawUnsafe` to Prisma ORM
  - procurement/vendors/[id]: 4 raw queries → findFirst with include + count
  - procurement/purchase-orders/[id]: 2 raw queries → findFirst + findMany with Map join
  - logistics/drivers/create: $queryRaw INSERT → driver.create
  - logistics/drivers/delete: $queryRaw UPDATE → driver.update (soft delete)
  - events/[eventId]/waitlist: $queryRawUnsafe → $queryRaw (tagged template, parameterized)
  - inventory/supplier-sync: $queryRawUnsafe → supplierSyncLog.findMany
- Remaining: 39 routes with raw SQL (~5 CRITICAL, ~9 HIGH, ~25 MEDIUM)

### 2026-04-29 — Procurement UI + Missing Routes + Prisma Reads
- **FIXED T0-C #24:** Procurement requisitions list/new/detail pages implemented with API integration
- **FIXED T0-C #25:** Vendor contracts list/detail pages implemented with create dialog and workflow actions
- **FIXED T1 #27:** Vehicle delete route (soft-delete via raw SQL)
- **FIXED T1 #28:** Facility areas edit + delete routes (COALESCE update, soft-delete)
- **FIXED T1 #29:** Facility edit + delete routes (COALESCE update, soft-delete)
- **FIXED T1 #31:** Preventive maintenance schedule edit + delete routes
- **FIXED T1 #33:** VendorCatalog PrismaStore wired (import + case in createPrismaStoreProvider)
- **FIXED T1 #34:** VarianceReport PrismaStore wired (import + case in createPrismaStoreProvider)
- **BONUS:** TrainingModule PrismaStore wired (same pattern, was also unwired)
- All 17 requisition end-to-end tests pass
- API typecheck passes

### 2026-04-29 — Financial API Commands Implementation
- **FIXED T1 #35:** CollectionCase - Added missing `reopen` command to existing PATCH handler
- **FIXED T1 #36:** Invoice - Added PATCH handler with 4 action commands (apply-payment, mark-as-paid, mark-overdue, send-reminder)
- **FIXED T1 #37:** PaymentMethod - Added status field + 5 command actions (mark-as-default, verify, flag-for-fraud, mark-expired, remove)
- **FIXED T1 #38:** RevenueRecognitionSchedule - Expanded PATCH handler with 5 action commands (adjust, cancel, recognize, reverse, start)
- All 4 entities now have complete CRUD + command implementations

### 2026-04-29 — Dead Button Fixes (T0-B batch 2)
- **FIXED T0-B #8:** "New Invoice" button navigates to /accounting/invoices/new
- **FIXED T0-B #9:** "New Payment" button navigates to /accounting/payments/new
- **FIXED T0-B #10:** "Refund" button calls POST /api/accounting/payments/[id]
- **FIXED T0-B #13:** Edit icon prompts for reason and calls handleEditRequest
- **FIXED T0-B #14:** Flag icon prompts for type/notes and calls handleFlagException
- **FIXED T0-B #15:** Tax delete icon deactivates config via handleDeleteStateTax
- **FIXED T0-B #18:** Clock Out button calls PUT /api/timecards/[id] for real clock-out
- **FIXED T0-B #20:** View Details navigates to /payroll/periods/[id]
- Updated dead button count: 9 remaining -> 1 blocked (#17), 1 not rendered (#19)

### 2026-04-29 — Comprehensive Re-Audit (14 agents)
- **FIXED T0-A #1-7:** All 7 `data.data` response shape mismatches resolved
- **FIXED T0-B #11:** Payment "View" links now navigate correctly
- **FIXED T0-B #12:** "Create Payment" routes to export
- **FIXED T0-B #16:** "Add State" now calls API via handleAddStateTax
- **FIXED T0-B #21:** Payment export endpoint exists
- **FIXED T0-B #22:** Invoice payment form redirects correctly
- **FIXED T0-B #23:** Direct deposit URL now matches actual API route
- **FIXED T0-C #26:** Purchase order creation fully implemented
- **FIXED T1 #32:** Work Orders link now points to correct path
- Updated RAW_SQL count: 45 routes (down from 67)
- Updated SPEC count: 9/45 complete (20%), not 9/55
- Confirmed 8 dead buttons fixed, 1 blocked (#17), 1 not rendered (#19) (down from 16)
- Confirmed 2 procurement stub pages remain (down from 3)
- Catalogued 25+ tables still missing RLS across 7 schemas

### 2026-04-29 — UI Gap Audit (16 agents)
- CATALOGUED: 75 findings across 6 priority tiers
- Root cause identified for 7 broken data-loading pages (response shape mismatch)
- Identified 4 backend-complete systems with zero UI

### 2026-04-28 — Batch 14 BROKEN_PRISMA_READ Fixes
- FIXED: 7 entities wired into PrismaStoreProvider
- FIXED: 4 quarantined manifests re-enabled

### 2026-04-28 — RLS Coverage Expansion
- FIXED: `employee_bank_accounts`, `vendor_contacts`, `vendor_ratings`, `procurement_budgets` RLS enabled

---

## Known Blockers

1. **Generator — Prisma-aware delegate/field resolver**
   - Blocked by package version coordination
   - `@angriff36/manifest` published package is stale

2. **Bypass / camelCase duplicate routes**
   - ~60 directories with duplicate camelCase paths
   - Do NOT fix during this phase

3. **RAW_SQL entities with missing Prisma models**
   - `TaxConfiguration` model missing for payroll/tax routes
   - `Equipment` model missing — routes return 501
   - Create model before converting routes to ORM

4. **Settings/Integrations placeholder**
   - Blocks GoodShuffle UI (GS-1)
   - Must be built before integration pages

---

## Archive Map

### `docs/implementation-history/`

| File | What it contains |
| ---- | ---------------- |
| `passes-38-63.md` | Full text of pass logs 38–71 |
| `executive-summary-2026-04-24.md` | Snapshot summary + re-verification deltas |
| `blockers-history.md` | Historical Tier-0 / Tier-1 manifest blockers |
| `schema-and-techdebt.md` | Schema drift, manifest coverage |

### `docs/audits/`

| File | What it contains |
| ---- | ---------------- |
| `pass-16-production-readiness-2026-04-29.md` | Full SPEC vs implementation gap analysis (16-agent audit raw findings) |

---

## Update Discipline

When you finish work on an in-scope item:
1. Move detailed write-up into the appropriate archive file
2. Update only **Recently Resolved** and **Known Blockers** (only if resolved)
3. Keep this file <= 800 lines. If it grows, content moves to archive
4. Never delete archive content — append to it
5. Mark items by number (e.g. "Fixed T0-A #1 through #7") when resolving
