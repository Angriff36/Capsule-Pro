# Capsule-Pro Implementation Plan — Live Queue

> **Last updated:** 2026-05-01 (notification commands test coverage added — 44 tests). **Convention:** this file is the **live queue only**. Completed pass write-ups are archived, not appended here. See the **Archive Map** at the bottom for history.

**ULTIMATE GOAL:** Every UI button, modal, and form must actually work when clicked.

---

## Current Task — Production-Readiness Gap Analysis

**STATUS: COMPREHENSIVE RE-AUDIT COMPLETE — RE-PRIORITIZED FOR EXECUTION.**

### Key Findings Summary (Updated 2026-04-29)

| Category | Finding | Status | Priority |
|----------|---------|--------|----------|
| **Pages That Never Load** | 7 pages with `data.data` mismatch | **ALL 7 FIXED** ✅ | ~~P0~~ |
| **Dead Buttons** | ALL fixed (down from 16) | **ALL FIXED ✅** | ~~P0~~ |
| **Stub Pages with Live APIs** | 2 procurement pages still static | **ALL FIXED ✅** | ~~P0~~ |
| **RLS Policies** | 25+ tables MISSING RLS across 7 schemas | **ALL 53 FIXED ✅** | ~~P0~~ |
| **RAW_SQL Security** | $queryRawUnsafe ELIMINATED. 136 files with safe $queryRaw (Prisma tagged template literals) + 23 with $executeRaw (safe tagged templates) | **$queryRawUnsafe ELIMINATED ✅** | ~~P0~~ |
| **Missing API Routes** | 4 routes still missing | **ALL FIXED ✅** | ~~P1~~ |
| **BROKEN_PRISMA_READ** | 2 entities NOT wired | **ALL FIXED ✅** | ~~P1~~ |
| **Backend-Complete, No UI** | 4 major systems | **ALL IMPLEMENTED** ✅ | ~~P1~~ |
| **SPEC Coverage** | 36/46 complete (78%) — All AI conflict detection + payroll approvals implemented | UPDATED COUNT | P2 |
| **Placeholder Pages** | 5 pages remain stubs (down from 12) | **7 FIXED ✅** | P2 |
| **Test Coverage** | ~45 of ~126 API domains untested (3,452 tests across 115 files; +44 notification commands, +130 prep-tasks, +98 prep-lists CRUD + 10 commands, +35 procurement POs + 71 shipment commands since wave 4) | IN PROGRESS | P3 |

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
- **Specs total:** 46 (36 COMPLETE, 10 TODO)
- **API domains without tests:** ~47 of ~126 (post-wave 4 additions: procurement purchase-orders, shipments command coverage)

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

### T0-B: Dead Buttons / Non-functional Actions — ALL FIXED ✅

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
| 17 | `payroll/payouts/page.tsx` | Entire page hardcoded — no PayrollRun Prisma model or payouts API | ✅ FIXED — Converted to client component fetching from /api/payroll/runs with status filters, summary cards, and empty state |
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

### P0-4: RAW_SQL Security — RESOLVED ✅

| Severity | Count | Status |
|----------|-------|--------|
| `$queryRawUnsafe` | **0** | **ELIMINATED** ✅ |
| `$executeRawUnsafe` | **0** | **ZERO** ✅ |
| `$queryRaw` (safe tagged templates) | 136 files | Safe — Prisma tagged template literals (`Prisma.sql`) |
| `$executeRaw` (safe tagged templates) | 23 files | Safe — Prisma tagged template literals |

**Batch 1 Converted (6 routes, eliminated 10 `$queryRawUnsafe` calls):**
- `procurement/vendors/[id]` — 4 `$queryRawUnsafe` → `findFirst` with `include` + `count`
- `procurement/purchase-orders/[id]` — 2 `$queryRawUnsafe` → `findFirst` + `findMany`
- `logistics/drivers/commands/create` — 1 `$queryRaw` → `driver.create`
- `logistics/drivers/commands/delete` — 1 `$queryRaw` → `driver.update` (soft delete)
- `events/[eventId]/waitlist` — 2 `$queryRawUnsafe` → 2 `$queryRaw` (tagged template, safer)
- `inventory/supplier-sync` GET — 1 `$queryRawUnsafe` → `supplierSyncLog.findMany`

**Batch 2 Converted (5 routes, eliminated 13 `$queryRawUnsafe` calls):**
- `logistics/drivers/list` — 1 `$queryRawUnsafe` → `driver.findMany` with `include: { vehicle }`
- `procurement/vendors/list` — 1 `$queryRawUnsafe` → `inventorySupplier.findMany` with `_count` includes
- `events/[eventId]/waitlist/commands/add-guest` — 4 `$queryRawUnsafe` → `event.findFirst` + `eventGuest.count/aggregate/create`
- `events/[eventId]/waitlist/commands/promote` — 3 `$queryRawUnsafe` → `eventGuest.findFirst/update/updateMany`
- `events/[eventId]/waitlist/commands/update-rsvp` — 4 `$queryRawUnsafe` → `eventGuest.findFirst/update/updateMany`

**Batch 3 Converted (5 routes, eliminated 10 `$queryRawUnsafe` calls):**
- `staff/performance/list` — 1 `$queryRawUnsafe` → `performanceReview.findMany` + batch `user.findMany`
- `procurement/purchase-orders/list` — 1 `$queryRawUnsafe` → `purchaseOrder.findMany` with include + batch `inventorySupplier.findMany`
- `procurement/budget/list` — 1 `$queryRawUnsafe` → `procurementBudget.findMany` with `_count` aggregation
- `procurement/budget/[id]` — 5 `$queryRawUnsafe` → Prisma `findFirst`/`findMany` + `$queryRaw` tagged templates for complex 3-table aggregation
- `procurement/budget/commands/refresh` — 2 `$queryRawUnsafe` → Prisma `findMany`/`update`/`findFirst`/`create` + `$queryRaw` tagged template for spend aggregation

**Batch 4 Audit (2026-04-29):**
2026-04-29 audit confirmed: 0 files use `$queryRawUnsafe` (5 grep matches were comments in already-converted files). 0 files use `$executeRawUnsafe`. All 136 remaining `$queryRaw` files use safe Prisma tagged template literals (`Prisma.sql`). RAW_SQL security concern is **RESOLVED**.

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

### Venue Migration ✅ RESOLVED (2026-05-01)

- ~~Prisma model EXISTS, database table does NOT~~ — table created in
  `20260501000000_add_venues_table` (composite PK, indexes, FK to
  `platform.accounts`, RLS with soft-delete-aware policies, service_role bypass,
  `update_timestamp` + `prevent_tenant_mutation` triggers, `REPLICA IDENTITY FULL`).
- ~~API routes at `apps/api/app/api/venues/` return 404~~ — re-enabled the four
  stubbed files under `apps/api/app/api/crm/venues/` (`route.ts`, `[id]/route.ts`,
  `[id]/events/route.ts`, plus `validation.ts` + `types.ts`). Routes use direct
  Prisma (Venue has no manifest); pattern mirrors the working server actions in
  `apps/app/app/(authenticated)/crm/venues/actions.ts`.
- DELETE blocks when there are linked events with status `confirmed`/`pending`
  (returns 409 + `activeEvents` count); otherwise soft-deletes via `deletedAt`.
- Coverage: `apps/api/__tests__/crm/venues/venue-crud.test.ts` — 17 tests
  covering auth, list filters, validation, soft-delete + active-events guard,
  events list. All green.

---

## TIER 1.5 — Backend Complete, No Production UI (4 major systems)

These have full API backends but zero or placeholder frontend. Each is a significant UI build.

### GS-1: GoodShuffle Integration (3 specs)
- Backend: client, sync service, config API, status API — all functional
- UI: **IMPLEMENTED** — Settings/Integrations page with GoodShuffle tab (config form, status display, sync controls, edit/delete)
- Blocks cleared: P2-51 resolved

### GS-2: Nowsta Integration
- Backend: 6 API routes, client, sync service, 3 Prisma models
- UI: **IMPLEMENTED** — Settings/Integrations page with Nowsta tab (config form, status display, statistics, recent errors, sync controls)

### GS-3: SMS Notification System
- Backend: 9+ API routes, Twilio integration, automation engine, 5 Prisma models
- UI: **IMPLEMENTED** — Settings/Notifications page with 2 tabs (Automation Rules CRUD, SMS History with status filtering), create/edit rule dialog, toggle active/inactive, delete confirmation, summary stat cards

### GS-4: Outbound Webhooks
- Backend: 9 API routes, retry, DLQ, cron
- UI: **IMPLEMENTED** — Dev-console/webhooks page with 3 tabs (Webhooks CRUD, Delivery Logs, Dead Letter Queue), create/edit dialogs, toggle status, retry failed deliveries, resolve DLQ entries

---

## TIER 2 — Missing SPEC Implementations (36/46 = 78%)

### SPEC Coverage by Domain

| Domain | Complete | Total | Pct |
|--------|----------|-------|-----|
| Performance | 3 | 3 | 100% |
| Kitchen | 10 | 10 | 100% |
| Administrative | 8 | 9 | 89% |
| Staff | 8 | 8 | 100% |
| AI | 7 | 7 | 100% |
| CRM | 4 | 4 | 100% |
| Inventory | 4 | 4 | 100% |
| Mobile | 3 | 5 | 60% |
| Warehouse | 3 | 3 | 100% |
| Integration | 6 | 6 | 100% |

### Zero-Implementation SPECs (prioritized)

| # | Spec | Domain | What exists |
|---|------|--------|-------------|
| 40 | AI Conflict Detection — Employee | AI | ✅ IMPLEMENTED — UI at /tools/conflicts with Employee tab |
| 41 | AI Conflict Detection — Equipment | AI | ✅ IMPLEMENTED — UI at /tools/conflicts with Equipment tab |
| 42 | AI Conflict Detection — Inventory | AI | ✅ IMPLEMENTED — UI at /tools/conflicts with Inventory tab |
| 43 | AI Conflict Detection — Venue | AI | ✅ IMPLEMENTED — UI at /tools/conflicts with Venue tab |
| — | Payroll Approval Workflow | Staff | ✅ IMPLEMENTED — UI at /payroll/approvals with Approval Queue + History tabs |
| 44 | Mobile Recipe Viewer | Mobile | 0% — no route, no component |
| 45 | Mobile Time Clock | Mobile | 0% — no route, no component |
| 46 | Native Mobile App | Mobile | 0% — no app shell |

---

## TIER 2 — Placeholder Pages (12 pages)

| # | File | Status | Action |
|---|------|--------|--------|
| 48 | `marketing/page.tsx` | "Coming Soon" | BLOCKED — no marketing backend APIs or Prisma models exist. Manifest IR exists at packages/manifest-ir/ir/marketing/ but is orphaned (no active manifest, no routes). |
| 49 | `marketing/campaigns/page.tsx` | "Coming Soon" | BLOCKED — no marketing backend APIs or Prisma models exist. Manifest IR exists at packages/manifest-ir/ir/marketing/ but is orphaned (no active manifest, no routes). |
| 50 | `settings/security/page.tsx` | ModuleSection placeholder | Build security settings UI |
| 51 | `settings/integrations/page.tsx` | ModuleSection placeholder | Blocks GoodShuffle UI (GS-1) |
| 52 | `tools/ai/page.tsx` | ✅ FIXED — AI suggestions (generate, priority/category badges, take action) + event summaries (per-event generation, highlights, critical info) |
| 53 | `tools/battleboards/page.tsx` | ✅ FIXED — Board list with stats, search; board detail with cards table; create/edit dialog; delete confirmation |
| 54 | `tools/autofill-reports/page.tsx` | ✅ FIXED — 3 tabs: Event Reports (generate), Document Parser (upload+parse), Waste Reports (groupBy, trends, reasons breakdown) |
| 55 | `dev-console/api-keys/page.tsx` | ✅ FIXED — Full CRUD (list, create, revoke, delete, rotate) |
| 56 | `dev-console/users/page.tsx` | ✅ FIXED — Employee directory with role management, deactivate/terminate, detail view, active/inactive filter |
| 57 | `dev-console/webhooks/page.tsx` | ✅ FIXED — Full webhook management with 3 tabs (Webhooks/Delivery Logs/DLQ), create/edit/delete, toggle status, retry failed |
| 58 | `dev-console/dashboard` | All buttons hardcoded/no-op | BLOCKED — requires platform-level metrics/tenants/activity APIs that don't exist |
| 59 | `dev-console/tenants` | All buttons hardcoded/no-op, fake data | BLOCKED — requires tenant provisioning API (/api/auth/register) and tenant management APIs that don't exist |

---

## TIER 2 — Permanently Disabled Buttons — ALL FIXED ✅

| # | File | Line | Bug | Status |
|---|------|------|-----|--------|
| 60 | `crm/scoring/scoring-rules-client.tsx` | 447 | Delete permanently disabled ("not implemented yet") | ✅ FIXED — Wired to DELETE /api/crm/scoring/[id] with confirmation |
| 61 | `events/[eventId]/battle-board/export-button.tsx` | 114 | "Email PDF (Coming Soon)" disabled | ❌ DISABLED (requires new email endpoint) |
| 62 | `warehouse/shipments/shipments-page-client.tsx` | — | "Add Item" button has empty onClick handler | ✅ FIXED — Added modal dialog with item selector, quantity, condition, lot number |

---

## TIER 2 — Fake Data / Random Logic in Production

| # | File | Line | Bug | Fix |
|---|------|------|-----|-----|
| 63 | `scheduling/time-off/time-off-form.tsx` | 148 | `Math.random() > 0.8` for conflict detection | ✅ FIXED — Wired to POST /api/conflicts/detect with scheduling+staff types |
| 64 | `kitchen/production-board-client.tsx` | 106-111 | Mock weather data | ✅ FIXED — Replaced with static production board info display |
| 65 | `kitchen/recipes/recipe-editor-modal.tsx` | 89,118,187 | `Math.random().toString()` for IDs | ✅ FIXED — Replaced with crypto.randomUUID() |
| 66 | `kitchen/allergen-warning-test/page.tsx` | — | Visual test page in production route | ✅ FIXED — Removed from production routes (git rm) |
| 67 | `test-page.tsx` | — | Bare test page in production route | ✅ FIXED — Removed from production routes (git rm) |

---

## TIER 2 — alert() Calls — ALL REPLACED ✅

All 16 `alert()` calls across 7 files replaced with `toast.success()` / `toast.error()` from Sonner:

| File | Count | Status |
|------|-------|--------|
| `calendar/sync/page.tsx` | 7 | ✅ FIXED |
| `administrative/trash/components/trash-page-client.tsx` | 1 | ✅ FIXED |
| `kitchen/tasks/new/page.tsx` | 1 | ✅ FIXED |
| `procurement/budget/page.tsx` | 2 | ✅ FIXED |
| `procurement/vendors/[id]/page.tsx` | 1 | ✅ FIXED |
| `procurement/vendors/page.tsx` | 1 | ✅ FIXED |
| `kitchen/recipes/menus/components/menu-editor.tsx` | 2 | ✅ FIXED |

---

## TIER 2 — Test Coverage

| Domain | Status | Action |
|--------|--------|--------|
| Recipe/Prep system | COVERED — stations (27), ingredients (27), prep-lists (98 — CRUD + 10 commands), prep-tasks (130 — CRUD + 13 commands) | Add edge cases for autogeneration + items |
| Payroll workflows | COVERED — periods (18), runs (13), deductions (11) | Add approval workflow tests |
| Menu/Dish management | COVERED — menus (14), dishes (25) covered | Add remaining unit tests |
| Training management | COVERED — ~80 tests (modules, assignments, completion) | Expand edge cases |
| Event lifecycle | COVERED — catering-orders (35), budgets (23), contracts (24), lifecycle (1) | Expand coverage |
| Logistics | COVERED — drivers/vehicles/routes (43 tests) | Expand edge cases |
| Facilities | COVERED — facilities/assets/areas/work-orders (78 tests) | Expand edge cases |
| Calendar | COVERED — GET calendar + PATCH reschedule (31 tests) | Expand edge cases |
| Knowledge Base | COVERED — entries list/create (40 tests) | Add update/delete tests |
| Admin Tasks | COVERED — 7 endpoints (~55 tests) | Expand edge cases |
| Analytics | COVERED — finance/kitchen/staff (46 tests) | Expand edge cases |
| Staffing Recommendations | COVERED — 23 tests (style multipliers, role allocation, labor costs) | — |
| Document Versioning | COVERED — 26 tests (create/restore/list versions) | — |
| Global Search | COVERED — 23 tests (6 entity types, filtering, pagination) | — |
| Public Contracts/Proposals | COVERED — ~35 tests (contract viewing/signing, proposals) | — |
| Locations | COVERED — ~13 tests (GET with $queryRaw) | — |
| Webhook: Supplier Catalog | COVERED — ~19 tests (HMAC verification, payload validation, upsert) | — |
| Activity Feed | COVERED — 26 tests (list filters/pagination/auth + stats bigint coercion + error paths) | — |
| Goodshuffle Integration | COVERED — 66 tests (config GET/POST/DELETE, status, test, sync, events/inventory/invoices list, inventory-sync, invoices-sync) | — |
| ~46 remaining API domains | ZERO TESTS | Prioritize core business domains |

### Skipped Tests

- **API:** 1 skipped `describe` block in `sales-reporting/generate.test.ts`
- **E2E:** 41 skipped tests across 13 files
- **API test files:** 121 files covering 47+ domains (of ~126 total)
- **All 3,676 API tests pass** (1 skipped, 8 todo)

---

## TIER 3 — Tech Debt / Polish

### Settings/Admin Gaps

| # | File | Bug |
|---|------|-----|
| 68 | `settings/audit-log/page.tsx` | ✅ FIXED — New API route (Prisma `audit_log` model), client component with filters/pagination/detail view |
| 69 | `settings/team/page.tsx` | ✅ FIXED — Client component with search, role change dialog, deactivate confirmation, status filter |
| 70 | 18+ API routes | No UI consumer (apikey, rolepolicy, notification, settings/api-keys) |

### TBD Placeholders in Code — ALL FIXED ✅

All 33 placeholder occurrences across 12 event files replaced with consistent, user-friendly text:
- "Venue TBD" → "No venue assigned"
- "Time not set" → "Not scheduled"
- Battle Board "TBD" → "Unassigned"
- "X not set" patterns → standardized ("Not specified", "No X assigned")
- Calendar export "TBD" kept as-is (different context)
- "Email PDF (Coming Soon)" kept as-is (feature stub)

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

### 2026-05-01 — Test Coverage: Events Battle Boards API (88 tests, 9 routes)

**Why this matters:**
- Battle Boards are the in-event competition primitive (chefs vs chefs, dishes
  vs dishes, votes from guests). The state machine has a strict legal-edge
  ordering — `create → open → start-voting → vote* → finalize` plus
  `add-dish/remove-dish` only valid before `voting` — so a misrouted command
  verb can silently corrupt a live competition. Tests pin every kebab→camel
  mapping (`add-dish→addDish`, `remove-dish→removeDish`,
  `start-voting→startVoting`) so a manifest-codegen rename can't silently
  break voting.
- All 7 command routes pass `{ entityName: "BattleBoard" }` only — they do
  NOT pass `instanceId` even for instance-scoped verbs like `vote`/`open`/
  `finalize` (the runtime resolves the instance from `body.id`). Tests pin
  this exact options-object shape so a future "helpful" patch that adds
  `instanceId: body.id` doesn't double-route or break.
- The list endpoint (`GET /api/events/battle-boards`) carries `eventId` and
  `status` filters plus pagination with a `limit` clamped to `[1, 100]` and
  a `take/skip` derived from `page`/`limit`. Tests pin: tenant + soft-delete
  filter is always present, eventId/status thread through `whereClause`,
  limit clamps both upper (500→100) and lower (0→1), and `totalPages =
  ceil(total/limit)`.
- The root POST is a thin delegator to `executeManifestCommand({ entityName:
  "BattleBoard", commandName: "create" })`. A test pin ensures the delegated
  shape stays exact and the delegated response propagates verbatim.
- Standard 9-test pattern per command: 401 unauth, 400 tenant-missing, 400
  user-not-found, 200 success + user-context shape pin (`{ id, tenantId,
  role }`), 403 policy denial (with `role=` suffix in error), 422 guard
  failure, 400 generic, 400 default-error fallback ("Command failed"), 500
  runtime throw, runtime-invocation pin (camelCase verb), tenant+clerk-scoped
  user lookup pin.

**Files added:**
- `apps/api/__tests__/events/battle-boards.test.ts` — 88 tests across 7
  command routes (10 tests each via `describe.each`) + 8 list/delegated-POST
  tests for the root route.

**Coverage delta:** TIER 2 untested API domains: Battle Boards (8 routes, 0
tests) → fully covered. Events sub-domain: previously ~5 tests for 141
routes; this lifts a cohesive 9-route slice (state machine + list + create
delegation) to full pin coverage.

**VALIDATION:** `pnpm --filter api test __tests__/events/battle-boards.test.ts`
— 88/88 pass.

### 2026-05-01 — Test Coverage: Collaboration Notifications Commands (44 tests, 4 routes)

**Why this matters:**
- Notifications are the multi-tenant alert spine: a leaked notification across
  tenants or a silently-dropped `instanceId` on `markRead`/`markDismissed`/
  `remove` means dismissed alerts re-appear or, worse, one tenant's user
  toggles read state on another tenant's notification row. Tests pin
  `instanceId: body.id` for all 3 instance-scoped verbs and prove `create`
  does NOT pass an instanceId.
- Routes call `database.user.findFirst({ AND: [{ tenantId }, { authUserId: clerkId }] })`
  to resolve the internal user before invoking runtime. Tests pin this
  composed `AND` clause so a refactor can't silently drop the tenant filter
  and resolve any user with a matching Clerk ID.
- All 4 commands (create, mark-dismissed, mark-read, remove) get the full
  test pattern: 401 unauth, 400 tenant-missing, 400 user-not-found, 200
  success + user-context shape pin (`{ id, tenantId, role }`), 403 policy
  denial (with `role=` suffix in error), 422 guard failure, 400 generic, 400
  default-error fallback, 500 runtime throw, runtime invocation pin.
- Coverage pins kebab-case URL → camelCase verb mapping (`mark-dismissed` →
  `markDismissed`, `mark-read` → `markRead`) so a manifest-codegen change
  can't silently misroute.

**Files added:**
- `apps/api/__tests__/collaboration/notifications/notification-commands.test.ts`
  — 44 tests across all 4 command routes (11 tests each via `describe.each`).

**Coverage delta:** TIER 2 untested API domains: ~46 → ~45. Notification
domain now has both end-to-end persistence pinning (existing) AND full
command-route auth/policy/guard/error coverage (new).

**VALIDATION:** `pnpm --filter api test __tests__/collaboration/notifications/notification-commands.test.ts`
— 44/44 pass. `pnpm --filter api typecheck` — clean.

### 2026-05-01 — Test Coverage: Kitchen Prep-Tasks API (130 tests, 16 routes)

**Why this matters:**
- Prep-tasks are the live work-queue every line cook hits during service. A
  silent bug in claim/release/reassign means food doesn't get prepped on
  time — the worst possible failure mode for a catering tenant on a
  Saturday-night gig. Tests pin every command's kebab-case URL → camelCase
  runtime mapping (e.g., `update-due-date` → `updateDueDate`) so a future
  rename can't silently misroute commands.
- The root GET `/api/kitchen/prep-tasks` carries 8 filters (`eventId`,
  `status`, `priority`, `stationId`, `locationId`, `taskType`, `search`,
  `isOverdue`) AND a custom `orderBy` `[priority desc, dueByDate asc,
  startByDate asc]`. A regression that drops the priority sort would push
  CRITICAL tasks below routine ones in the kitchen UI. Tests pin the orderBy
  array shape AND assert each filter threads into the correct `where.AND`
  clause.
- `isOverdue=true` requires `dueByDate < now()` AND `status NOT IN
  ['done','completed','canceled']`. A simple bug here floods the "overdue"
  badge with already-completed tasks and trains operators to ignore it.
  Tests assert both halves of the filter.
- `search` is a case-insensitive `contains` over `name OR notes`. Tests pin
  the `OR` array shape so a refactor can't silently drop one of the two
  fields.
- All 13 commands (`cancel`, `claim`, `complete`, `create`, `reassign`,
  `release`, `start`, `unclaim`, `update-assignment`, `update-due-date`,
  `update-priority`, `update-quantity`, `update-status`) follow the
  manifest-runtime pattern. Each command has 7 tests: 401 unauth, 400
  tenant-missing, 200 success + user-context shape pin (`{ id: userId,
  tenantId }`), 403 policy denial, 422 guard failure, 400 generic-error,
  500 runtime-throw. That's 91 of the 130 tests — a single `runCommand`
  signature change would surface as 13 simultaneous failures, making a
  contract break impossible to miss.
- Detail GET passes `where: { id, tenantId, deletedAt: null }`. Tests pin
  the soft-delete + tenant guard so a query refactor can't accidentally
  return cross-tenant rows or tombstoned tasks.
- List projection clamps `limit` to `MAX_LIMIT=200`. Tests pass `limit=500`
  and assert Prisma is called with `take: 200` to prove the clamp is the
  Prisma-call argument, not just the response field.
- All error paths assert `Sentry.captureException` so an upstream Prisma
  outage surfaces in alerting even when the route returns 500 to the user.

**Files added:**
- `apps/api/__tests__/kitchen/prep-tasks.test.ts` — 130 tests across all
  16 routes (root GET + list GET + [id] detail GET + 13 command POSTs).

**Coverage delta:** TIER 2 untested API domains: ~47 → ~46. API test files:
120 → 121. Total API tests: 3,546 → 3,676.

**VALIDATION:** `pnpm --filter api test __tests__/kitchen/prep-tasks.test.ts`
— 130/130 pass. Full API suite: **3,676 tests pass** across 121 files (1
skipped, 8 todo). No regressions.

### 2026-05-01 — Test Coverage: Goodshuffle Integration API (66 tests, 9 routes)

**Why this matters:**
- Goodshuffle is the SOURCE-OF-TRUTH credentials store for the tenant's
  event-rental sync. A regression that leaks `apiSecret` or `webhookSecret`
  over GET `/config` is a real customer-impact security bug. Tests assert
  `apiSecret` is always returned as `"********"` and `apiKey` is always
  masked to first-4 + last-4 (or `"****"` if ≤ 8 chars).
- POST `/config` MUST test the connection BEFORE persisting; otherwise we
  save broken creds and silently corrupt every subsequent scheduled sync.
  Test asserts `testConnection` is called BEFORE `upsert`, and that an
  upsert never happens when the connection check fails.
- Every handler is tenant-scoped via Clerk org → `getTenantIdForOrg`. All 9
  routes are tested for both unauthenticated (401) and missing-tenant (401)
  paths so a future refactor can't silently drop the tenant guard.
- Sync routes (`/sync`, `/inventory/sync`, `/invoices/sync`) are tested for
  date-range validation including the `startDate === endDate` boundary —
  prior plan history shows these off-by-one bugs are common when ported
  to a new sync target.
- List routes thread `status`, `limit`, `offset` query params into the
  Prisma `where` and pagination clauses. Regressions that drop the status
  filter would ship the wrong records to a "Failed Syncs" UI tab.
- All error paths assert `captureException` so ops can detect upstream
  Goodshuffle outages even though the route returns 500.

**Files added:**
- `apps/api/__tests__/integrations/goodshuffle.test.ts` — 66 tests across
  the 9 handlers (config GET/POST/DELETE, status, test POST/GET, sync,
  events list, inventory list, invoices list, inventory/sync, invoices/sync).

**Coverage delta:** TIER 2 untested API domains: ~48 → ~47.

### 2026-05-01 — Test Coverage: Accounting PATCH Action Dispatchers (72 tests, 4 suites)

- **ADDED** four new test files pinning the PATCH action-dispatcher contract on
  the accounting domain's detail routes:
  - `apps/api/__tests__/accounting/invoice-patch-actions.test.ts` (20 tests):
    `apply-payment` (zero/negative reject, `PARTIALLY_PAID` math, `PAID`
    transition, overpayment clamp, 0.01 boundary), `mark-as-paid` (forces
    `amountPaid=total`, `amountDue=0`, stamps `paidAt`), `mark-overdue`
    (rejects `VOID`/`PAID`, allows `SENT→OVERDUE`), `send-reminder` (rejects
    `DRAFT`, sends Resend email best-effort, falls back when no template id,
    treats Resend failure as non-fatal so the status transition is the source
    of truth), `DELETE` void with `validateInvoiceBusinessRules` guard
    rejecting paid invoices.
  - `apps/api/__tests__/accounting/payment-method-patch-actions.test.ts` (11
    tests): `mark-as-default` (asserts the `updateMany` filter shape so a
    typo can't demote every default in the tenant; pins call-order so the
    target update happens AFTER siblings are unset), `verify`,
    `flag-for-fraud`, `mark-expired`, `remove` (returns `{ success: true }`,
    not the entity — clients reading `response.id` would break), 404 + cross-
    tenant invariant rejection (500), unknown action 400.
  - `apps/api/__tests__/accounting/revenue-recognition-patch-actions.test.ts`
    (16 tests): `start` (PENDING-only → `IN_PROGRESS`), `recognize` (creates
    a line and updates aggregates atomically in `$transaction`; pins the
    `COMPLETED` transition at remaining ≤ 0.01), `reverse` (soft-deletes the
    line, restores amounts, transitions back to `IN_PROGRESS` from
    `COMPLETED`), `cancel` (rejects `COMPLETED`), `adjust` (recomputes
    `remainingAmount` when `totalAmount` changes), unknown action 200 (no-op
    update — pinned so a future "throw on unknown" change is intentional).
  - `apps/api/__tests__/accounting/collection-case-patch-actions.test.ts`
    (25 tests): `recordPayment` (Zod 400, partial vs `PAID` transition at
    0.01 floor, overpayment clamp), `escalateDunning` (priority derivation
    for `FINAL_NOTICE`/`COLLECTIONS` → `URGENT`, `REMINDER_2`/`REMINDER_3`
    → `HIGH`), `setPriority` (Zod 400 + notes append), `markDisputed` /
    `resolveDispute`, `escalateToLegal` (atomic `isEscalatedToLegal=true` +
    `status=LEGAL` + `priority=URGENT`), `writeOff` (Zod 400 +
    `Math.min(amount, outstandingAmount)` clamp + `status=WRITE_OFF`),
    `updateAging` (default `daysOverdue=0`, `agingBucket=null`), `close`,
    `createPaymentPlan` (Zod 400 + `priority=MEDIUM` downgrade), `reopen`
    (resets `status=ACTIVE`, `dunningStage=CURRENT`, clears legal flag),
    404 + unknown-action 400, 500 + Sentry on DB error.
- **EDITED** `apps/api/test/mocks/@repo/database.ts`: added Prisma model
  surface for `paymentMethod`, `invoice`, `payment`,
  `revenueRecognitionSchedule`, `revenueRecognitionLine`, `collectionCase`,
  `collectionAction`, `collectionPaymentPlan` so the accounting routes can be
  imported into vitest without the real `@repo/database` package.
- **EDITED** `apps/api/app/api/accounting/payment-methods/[id]/route.ts`:
  replaced the stale header comment that claimed `status` was not in the
  schema. Schema confirms `status String @default("ACTIVE")` at
  `packages/database/prisma/schema.prisma:4456` — comment now points at the
  schema and lists the canonical status values
  (`ACTIVE`/`VERIFIED`/`FLAGGED`/`EXPIRED`).
- **WHY THIS MATTERS:** These four PATCH dispatchers carry the entire
  invoice → payment → revenue-recognition → collections financial lifecycle.
  Every action is a state-machine edge with money on it: a regression on
  `apply-payment`'s `0.01` boundary leaves PAID invoices stuck in
  `PARTIALLY_PAID`; a regression on `writeOff`'s clamp creates negative
  receivables that bleed into financial reporting; a missing `unset siblings`
  call on `mark-as-default` leaves two payment methods both `isDefault=true`
  and silently picks an arbitrary card at charge time; a regression on
  `escalateToLegal`'s atomicity creates half-escalated cases that legal teams
  never see. None of these surfaces had any test coverage before this pass.
- **VALIDATION:** `pnpm --filter api test __tests__/accounting/` — **135/135
  pass** (9 files). Full API suite: **3,480 tests pass** across 118 files
  (1 skipped, 8 todo). `pnpm --filter api typecheck` clean. No regressions.

### 2026-05-01 — Test Coverage: Kitchen Prep Lists (98 tests, 1 suite)

- **ADDED** `apps/api/__tests__/kitchen/prep-lists.test.ts` covering the entire prep-lists surface (route.ts root + [id]/route.ts + 10 command routes under /commands/*):
  - **GET /api/kitchen/prep-lists** (10 tests): 401 unauth, default pagination shape, eventId/status/search filter threading, station filter via `prepListItem` lookup (including the early-empty-result short-circuit when no items exist for the station — verifies `prepList.findMany` is NOT called), custom page/limit, limit clamping at 100, 500 on Prisma throw.
  - **GET /api/kitchen/prep-lists/[id]** (5 tests): 401 unauth, 404 not-found, station-grouping output (multi-station + sortOrder), null-stationId fallback (groups by stationName), 500 on Prisma throw.
  - **PATCH + DELETE /api/kitchen/prep-lists/[id]** (2 tests): asserts each correctly delegates to `executeManifestCommand` with the right `entityName`/`commandName` ("PrepList"/"update", "PrepList"/"cancel") and that the `transformBody` callbacks inject `id` (PATCH) and synthesize the cancel payload `{ id, reason: "Deleted via API", canceledBy: ctx.userId }` (DELETE) using user context.
  - **POST /api/kitchen/prep-lists** (1 test): root POST delegates to `PrepList.create` via `executeManifestCommand`.
  - **All 10 command routes** (`activate`, `cancel`, `create`, `create-from-seed`, `deactivate`, `finalize`, `mark-completed`, `reopen`, `update`, `update-batch-multiplier`) × 7 paths each = **70 tests**: 401 unauth, 400 missing tenant, 200 success (validates runtime user context `{ id, tenantId }`), 403 policy denial, 422 guard failure, 400 generic command failure, 500 on runtime exception, plus a parameterized assertion that the manifest command name reaches `runtime.runCommand` in **camelCase** (`createFromSeed`, `markCompleted`, `updateBatchMultiplier`) even though the URL slug is kebab-case.
- **WHY THIS MATTERS:** Prep lists are the kitchen execution-plan backbone. The 10-command state machine (`draft → active → completed`, plus `cancel`/`reopen`/batch-multiplier scaling) is invoked from event prep flows; a regression in any guard would silently allow illegal transitions (e.g. completing a draft, reopening a cancelled list). The kebab-case → camelCase mapping is also a load-bearing pin: a new route generated from the manifest IR that forgot to camelCase its `runCommand("...")` argument would silently route to a non-existent command and return 400 in production. The station-filter early-exit (no `prepList.findMany` call when there are no items) is also pinned because forgetting it would issue an `id IN ([])` query that some Prisma versions translate to `false` and others to `1=0` — both correct, but easy to break with a refactor.
- **VALIDATION:** `pnpm --filter api test __tests__/kitchen/prep-lists.test.ts` — 98/98 pass. Full API suite: **3,408 tests pass** across 114 files (1 skipped, 8 todo). No regressions.

### 2026-05-01 — Test coverage: Activity Feed (list + stats)

- **ADDED** `apps/api/__tests__/activity-feed/activity-feed.test.ts` — 26 tests covering both read endpoints in `apps/api/app/api/activity-feed/`.
  - **`GET /list`** (16 tests): auth guards (401 when unauthenticated, 401 when only userId, 400 when no tenant), happy-path response shape (empty + populated + hasMore), filter threading (default tenant scope, all 7 optional filters at once, three date-range variants — both sides, only startDate, only endDate), pagination (default limit/offset, custom values, max-200 clamp, NaN fallback, orderBy desc), error paths (count throws + Sentry capture, findMany throws after count succeeds).
  - **`GET /stats`** (10 tests): auth guards (401 + 400), happy-path (full payload with bigint→number coercion across `totalActivities`/`todayCount`/`weekCount`/`byType`/`byEntity`, empty-tenant zero state, `Number.MAX_SAFE_INTEGER` boundary), error paths (each of the three sequential `$queryRaw` calls failing in turn).
- **WHY THIS MATTERS:** Activity feed is the system-wide audit timeline — a regression in the tenant guard silently leaks who-did-what records across organizations. The stats route returns `BigInt` from `COUNT(*)`; forgetting `Number(...)` either crashes the JSON layer or breaks UI arithmetic. The list route hand-builds a Prisma `where` clause from query params, and a single missing thread-through (e.g. `entityId`) makes drill-down filtering silently dead. All three failure modes are operationally invisible without tests, so they are now pinned.

### 2026-05-01 — Fix: ShipmentItem.updateReceived missing instanceId

- **FIXED** `apps/api/app/api/shipments/shipment-items/commands/update-received/route.ts:56-59` — added `instanceId: body.shipmentItemId` to the `runtime.runCommand()` options dict. The route is now consistent with every other instance-scoped shipment command (Shipment.cancel/schedule/ship/start-preparing/mark-delivered/update all pass `instanceId: body.id`).
- **WHY THIS MATTERS:** `updateReceived` is an instance-scoped manifest verb — the runtime needs to load the target ShipmentItem into `self` before guards (`quantityReceived >= 0`) and mutations (`quantityReceived = quantityReceived`, `quantityDamaged = quantityDamaged`, `condition = condition`, `conditionNotes = conditionNotes`, `updatedAt = now()`) execute. Without `instanceId`, the runtime cannot identify which item to receive, so the call would silently no-op or update the wrong record. The bug existed because the auto-generated route template didn't account for ShipmentItem using `shipmentItemId` (vs. the more common `id`) as its instance identifier in command bodies.
- **TEST FLIPPED:** `apps/api/__tests__/logistics/shipments/shipment-commands.test.ts:715-753` — the previous "pins missing-instanceId bug" test (which asserted `callArgs.instanceId).toBeUndefined()`) was renamed to "forwards body and instanceId to runtime" and now asserts `instanceId: "item-001"` is passed. This was the explicit acceptance criterion in the prior commit: a one-line flip in the test, paired with a one-line fix in the route.
- **VALIDATION:** `pnpm --filter api test __tests__/logistics/shipments/shipment-commands.test.ts` — 71/71 pass. Full API suite: **3,267 tests pass** across 111 files (1 skipped, 8 todo). API typecheck clean.
- Files: `apps/api/app/api/shipments/shipment-items/commands/update-received/route.ts`, `apps/api/__tests__/logistics/shipments/shipment-commands.test.ts`.

### 2026-05-01 — Test Coverage: Shipments Command Coverage (71 tests, 1 suite)

- **ADDED** `__tests__/logistics/shipments/shipment-commands.test.ts` — companion to the existing `shipment-end-to-end.test.ts` (which only covered list/detail GETs + instanceId wiring). The new file exhaustively exercises every shipment write path:
  - **7 Shipment commands** (`create`, `update`, `cancel`, `schedule`, `ship`, `start-preparing`, `mark-delivered`) × 4 guard cases each (401 unauth, 400 missing tenant, 400 missing user, 500 on auth throw) = **28 guard tests**.
  - **7 Shipment commands** × 3 runtime-failure paths (403 policy denial, 422 guard failure, 400 constraint violation) = **21 failure tests**.
  - **7 Shipment commands** × success body-forwarding paths = **7 success tests**, each asserting that `runtime.runCommand()` is invoked with the correct `entityName` and that the response body shape comes from the runtime.
  - **ShipmentItem.create**: 6 tests covering 401, 400 (missing tenant + user), success forwarding to `runtime.runCommand("create", body, { entityName: "ShipmentItem" })`, 422 guard failure on `quantityShipped <= 0`, and 500 on uncaught error.
  - **ShipmentItem.updateReceived**: 5 tests covering the runtime forwarding (now with correct `instanceId`), 401, 400 missing tenant, 422 guard failure on negative `quantityReceived`, and 500 on uncaught error. The original "bug-pin test" was flipped in the 2026-05-01 fix above — the route now correctly passes `instanceId: body.shipmentItemId`.
  - **GET /api/shipments/shipment-items/list**: 4 tests (401, 400 missing tenant, success body shape, 500 on Prisma throw).
- **WHY:** shipments encode a 5-state machine (draft → scheduled → preparing → in_transit → delivered, plus cancelled). The existing test only proved instanceId reached the runtime; it did not exercise auth, policy, or guard paths. A regression in any guard would silently allow illegal state transitions, untracked cancellations by non-managers (`ManagersCanCancelShipment`), or unauthorized inventory receipts (`StaffCanReceiveShipment`). The 71 new assertions pin all of those.
- **FOLLOW-UP RESOLVED:** The "missing-instanceId" bug noted with the test additions was fixed on 2026-05-01 (see entry above). The shipment-items/update-received route now correctly passes `instanceId: body.shipmentItemId` to `runtime.runCommand()`.
- Full API suite green: **3,267 tests pass** across 111 files (1 skipped, 8 todo). No regressions from the shipments-commands additions.

### 2026-05-01 — Test Coverage: Procurement Purchase Orders (35 tests, 1 suite)

- **ADDED** `__tests__/procurement/purchase-orders/purchase-orders.test.ts` covering all 5 procurement PO routes that previously had zero coverage:
  - `GET /api/procurement/purchase-orders/list` — auth guards (401, 400 missing tenant), shaped response (vendor_name/item_count/pending_items), status filter, `?status=all` bypass, soft-delete exclusion, vendor null fallback, 500 on Prisma error.
  - `GET /api/procurement/purchase-orders/[id]` — 401, 404 not-found, full enrichment with vendor + items + inventory item names, vendor_name null when vendorId missing.
  - `POST /api/procurement/purchase-orders/commands/create` — 401, 400 validation (missing vendorId, empty items), success path proves the `count → INSERT po → INSERT items` `$queryRaw` sequence, 500 when INSERT returns no row.
  - `POST /api/procurement/purchase-orders/commands/update-status` — full state machine: legal transitions (draft→submitted, submitted→approved, submitted→rejected, approved→ordered) and illegal transitions (received→ordered, draft→received, cancelled→approved) per `VALID_TRANSITIONS`, plus 401/400/404/500.
  - `POST /api/procurement/purchase-orders/commands/receive` — partial vs full receive, `allReceived` flag flip when remaining count hits 0, inventory `quantity_on_hand` update skipped when receive qty is 0, items missing `itemId` or `qty` are filtered out.
- **WHY:** procurement PO routes drive a state machine with inventory side-effects; an illegal transition or skipped inventory increment silently corrupts on-hand counts and budget realization. The state-machine and inventory-skip assertions are the load-bearing ones.
- **Updated** shared database mock (`apps/api/test/mocks/@repo/database.ts`): added `purchaseOrder` and `purchaseOrderItem` models so future procurement tests can use the global mock instead of inline `vi.mock` blocks.
- Full API suite green: **3,196 tests pass** across 110 files (1 skipped, 8 todo). No regressions from the mock surface expansion.

### 2026-05-01 — Public Contracts/Proposals Test Fixes (3 tests)

- **FIXED** 3 failing tests in `__tests__/public/contracts-proposals.test.ts`:
  - "returns 410 when proposal has expired" — used `FUTURE_DATE` instead of `PAST_DATE` for `validUntil`. Switched to `PAST_DATE` so the route's expiry check actually triggers.
  - "accepts a proposal successfully" — `database.proposal.update` mock omitted `status`/`acceptedAt`/`rejectedAt`, so the route returned undefined or stale status. Added explicit `mockResolvedValueOnce({ id, status: "accepted", acceptedAt, rejectedAt: null })`.
  - "rejects a proposal successfully" — same mock-shape gap. Added `mockResolvedValueOnce({ id, status: "rejected", acceptedAt: null, rejectedAt })`.
- **ROOT CAUSE** of mock state bleeding between tests: `beforeEach(() => vi.clearAllMocks())` does NOT clear `mockResolvedValueOnce` queued implementations — only `mock.calls`/`mock.results`. Earlier GET tests queued `update.mockResolvedValueOnce({status: "viewed"})` for views; if a route short-circuited and didn't consume that mock, the leftover queue value was returned to the next test's `update()` call. Switched `beforeEach` to `vi.resetAllMocks()` to flush the `Once` queues.
- All 3,161 API tests pass; typecheck clean.

### 2026-04-29 — Test Coverage Wave 4 — Staffing, Documents, Search, Public Contracts, Locations, Webhooks (~139 tests, 7 new suites)

- **ADDED** test coverage for 7 previously-untested API domains:
  - `__tests__/staffing/recommendations.test.ts` — 23 tests (service style multipliers, role allocation, labor cost calculations, validation, edge cases)
  - `__tests__/documents/versions.test.ts` — 26 tests (create/restore/list version endpoints with auth guards and tenant isolation)
  - `__tests__/search/search.test.ts` — 23 tests (global search across 6 entity types, type filtering, pagination, error handling)
  - `__tests__/public/contracts-proposals.test.ts` — ~35 tests (public contract viewing/signing, proposal viewing/responding — no auth required)
  - `__tests__/locations/locations.test.ts` — ~13 tests (locations GET endpoint using $queryRaw with tenant isolation)
  - `__tests__/webhooks/supplier-catalog.test.ts` — ~19 tests (webhook payload validation, HMAC-SHA256 signature verification, product upsert, health check)
  - `__tests__/crm/crm-extended.test.ts` — leads search and activity feed tests
- **FIXED** `$executeRaw` missing from database mock (caused user-preferences test failures)
- **FIXED** Date serialization mismatch in misc-domains-part2 test assertions
- **Updated** shared database mock: added `upsert` to `createMockModel()`, added `eventContract`, `contractSignature`, `proposal`, `proposalLineItem`, `account`, `inventorySupplier`, `vendorCatalog` models
- All 3,161 API tests pass across 109 test files. Zero failures.

### 2026-04-29 — Test Coverage Wave 3 — Logistics, Facilities, Calendar, KB, Admin, Analytics (6 domains, ~293 tests)
- **ADDED** test coverage for 6 previously-untested API domains across 10 test suites:
  - `__tests__/logistics/logistics.test.ts` — 43 tests (drivers/vehicles/routes list/create/delete with auth, tenant isolation, raw SQL)
  - `__tests__/facilities/facilities-commands.test.ts` — 78 tests (facility/area/work-order CRUD with raw SQL multi-call mocking)
  - `__tests__/calendar/calendar.test.ts` — 31 tests (GET calendar with multi-source fetching, PATCH reschedule with compound keys)
  - `__tests__/knowledge-base/knowledge-base.test.ts` — 40 tests (entries list with filtering/pagination, create with validation/duplicate detection)
  - `__tests__/administrative/admin-tasks.test.ts` — ~55 tests (7 endpoints covering list/detail/create/PATCH/DELETE with manifest runtime + direct DB patterns)
  - `__tests__/analytics/analytics.test.ts` — ~46 tests (finance/kitchen/staff analytics with multi-$queryRaw Promise.all mocking)
  - `__tests__/logistics/shipments/shipment-end-to-end.test.ts` — existing shipment persistence tests
- **Updated database mock surface:** Added `driver`, `vehicle`, `deliveryRoute` models to shared test mock
- All 2,134 API tests pass across 96 test files. Zero failures.

### 2026-04-29 — Critical Domain Test Coverage Wave 2 (5 suites, ~350 tests)
- **ADDED** test coverage for 5 critical previously-untested API domains:
  - `__tests__/scheduling/schedules.test.ts` — 37 tests (create, update, close, release schedule commands)
  - `__tests__/timecards/timecards.test.ts` — ~65 tests (time entries list/detail, clock-in/out, add-entry, edit requests list/approve/reject, time-off requests list/approve/reject)
  - `__tests__/communications/communications.test.ts` — ~80 tests (email templates list/detail/create/update/soft-delete, email workflows CRUD, SMS automation rules CRUD with filtering/pagination)
  - `__tests__/settings/settings.test.ts` — 90 tests (API keys lifecycle, rate limits config, alerts config, role policies grant/revoke, notifications CRUD, audit log)
  - `__tests__/training/training.test.ts` — ~80 tests (training modules list/detail/create/update/soft-delete, assignments list/detail/create/soft-delete, completion workflow)
- All 1,874 API tests pass across 91 test files. Full monorepo typecheck clean (41 packages).

### 2026-04-29 — Events + Kitchen API Test Coverage (175 tests, 7 suites)
- **ADDED** test coverage: 7 new test suites with 175 tests for previously untested critical API domains:
  - `__tests__/events/catering-orders.test.ts` — 35 tests (CRUD + command flow with auth/guard/policy)
  - `__tests__/events/event-budgets.test.ts` — 23 tests (list, detail, create, update with auth)
  - `__tests__/events/event-contracts.test.ts` — 24 tests (CRUD with auth, tenant isolation, guards)
  - `__tests__/kitchen/dishes.test.ts` — 25 tests (list, detail, create, update with auth)
  - `__tests__/kitchen/ingredients.test.ts` — 27 tests (CRUD with auth, tenant isolation, filtering)
  - `__tests__/kitchen/menus.test.ts` — 14 tests (list, detail with auth, pagination)
  - `__tests__/kitchen/stations.test.ts` — 27 tests (CRUD with auth, tenant isolation, ordering)
- All 1,520 API tests pass. Typecheck clean.

### 2026-04-29 — TBD Placeholder Cleanup + Payroll/CRM/Facilities Test Coverage
- **FIXED TIER 3 TBD Placeholders:** All 33 placeholder text occurrences across 12 event files replaced with consistent, professional fallback text. "Venue TBD" → "No venue assigned", "Time not set" → "Not scheduled", Battle Board "TBD" defaults → "Unassigned". Other "X not set" patterns standardized to "Not specified" or "No X assigned".
- Files: 10 files edited across events components, event-details-client, kitchen-dashboard, battle-boards, budgets, contracts.
- **ADDED Test Coverage:** 5 new test suites with 76 tests for previously untested critical API domains:
  - `__tests__/payroll/payroll-periods.test.ts` — 18 tests (list, detail, create with auth/policy/guard scenarios)
  - `__tests__/payroll/payroll-runs.test.ts` — 13 tests (list, detail with auth, tenant isolation, error handling)
  - `__tests__/payroll/payroll-deductions.test.ts` — 11 tests (list, detail with auth, tenant isolation, ordering)
  - `__tests__/crm/clients/client-crud.test.ts` — 17 tests (create, update, archive, reactivate with policy/guard)
  - `__tests__/facilities/facilities-list.test.ts` — 17 tests (facilities list, assets list with pagination, filtering)
- **Updated database mock:** Added payroll_periods, payroll_runs, employeeDeduction, employeeBankAccount, payrollApprovalHistory to test mock surface.
- All 1,345 API tests pass (76 new + 1,269 existing). API typecheck clean.

### 2026-04-29 — Payroll Approval Workflow UI
- **IMPLEMENTED:** Payroll Approval Workflow UI at /payroll/approvals
  - Backend: Pre-existing API routes at `/api/payroll/approvals` (GET list, POST create, PUT approve/reject) and `/api/payroll/approvals/history` (GET)
  - UI: New client component with 2 tabs (Approval Queue, Approval History)
  - Approval Queue: List payroll runs needing approval with status filter, bulk select, approve/reject actions, detail dialog with approval history timeline, summary stat cards
  - Approval History: Filter by Run ID, view approval history entries with performer info, action badges, status transitions
  - Added "Approvals" nav item to payroll layout between "Payroll Runs" and "Tax Setup"
  - Updated payroll overview landing page "Approvals" card to link to /payroll/approvals instead of /payroll/overview
  - App + API typecheck: clean. All 1,269 API tests pass.
- Files: `apps/app/app/(authenticated)/payroll/approvals/page.tsx`, `apps/app/app/(authenticated)/payroll/layout.tsx`, `apps/app/app/(authenticated)/payroll/page.tsx`

### 2026-04-29 — AI Conflict Detection UI (Specs #40-43)
- **IMPLEMENTED:** Conflict Detection Dashboard at /tools/conflicts with 5 tabs (All, Employee, Equipment, Inventory, Venue)
  - Backend: Pre-existing `/api/conflicts/detect` endpoint already handles scheduling, staff, equipment, inventory, and venue conflict detection with severity levels, suggested actions, and resolution options
  - UI: New client component with tabbed interface for each conflict domain, severity-based stat cards (Total/Critical/High/Medium/Low), conflict cards with severity badges, affected entity badges, suggested action display, expandable resolution options with impact assessment, time range filtering (next 14 days)
  - Employee tab (Spec #40): Detects double-booked employees across overlapping shifts and shifts during approved time-off
  - Equipment tab (Spec #41): Detects same equipment needed at multiple simultaneous events
  - Inventory tab (Spec #42): Detects inventory stock shortages for upcoming events
  - Venue tab (Spec #43): Detects multiple events booked at same venue on same date
- Files: `apps/app/app/(authenticated)/tools/conflicts/page.tsx`, `apps/app/app/(authenticated)/tools/conflicts/conflicts-client.tsx`
- App + API typecheck: clean. No new test files needed (existing conflict detection tests cover the backend).

### 2026-04-29 — AI Bulk Task Generation (Spec #39)
- **IMPLEMENTED:** AI Bulk Task Generation with full pipeline:
  - API: `POST /api/ai/bulk-tasks` (generate proposed tasks via GPT-4o-mini with fallback to rule-based generation) + `POST /api/ai/bulk-tasks/confirm` (persist selected tasks as PrepTask records via Prisma transaction)
  - Generate route gathers event context (event details, dishes with allergens/lead times, kitchen stations, existing tasks, prep methods), sends structured prompt to AI requesting tasks grouped by station with day-offset timing
  - Confirm route validates no past dates, deduplicates against existing tasks, creates PrepTask records in transaction
  - UI: New "Task Generator" tab in Tools/AI page with event ID input, AI-powered generation, station-grouped task review with per-task select/edit/remove, bulk accept/reject, and edit dialog for modifying task properties before confirmation
- Files: `apps/api/app/api/ai/bulk-tasks/route.ts`, `apps/api/app/api/ai/bulk-tasks/confirm/route.ts`, `apps/app/app/(authenticated)/tools/ai/bulk-task-generator.tsx`, modified `apps/app/app/(authenticated)/tools/ai/ai-client.tsx`
- App + API typecheck: clean. All 1,269 API tests pass.

### 2026-04-29 — Automated Email Workflows UI + SPEC Coverage Re-Audit
- **IMPLEMENTED:** Automated Email Workflows UI at settings/email-workflows with full CRUD: list page (search, trigger type filter, status filter, stat cards, data table), create page (name, trigger type selector with grouped options, email template selector, recipient config, trigger config JSON, active toggle), edit page (pre-populated form, delete with AlertDialog), server actions with direct Prisma access.
- Added "Email Workflows" to settings sidebar navigation.
- **COMPREHENSIVE RE-AUDIT:** Verified all 43 specs marked _TODO against actual implementation. Found 21 specs were fully implemented but still marked TODO. Updated SPEC coverage from 9/45 (20%) to 30/45 (67%).
- Remaining unimplemented: 5 AI specs (bulk task gen, 4 conflict detection), 2 mobile specs (recipe viewer, time clock), 1 mobile spec (native app).
- App + API typecheck: clean. All 1,269 API tests pass.

### 2026-04-29 — Settings/Team (#69), Settings/Audit-log (#68), Tools/AI (#52), Tools/Battleboards (#53), Tools/Autofill Reports (#54)
- **FIXED #69:** Settings/Team — converted from read-only to interactive client component with: summary cards (Total/Active/Inactive/Admins), search input, status filter dropdown, member table with avatar initials, View Details dialog, Change Role dialog (POST /api/user/update-role), Deactivate confirmation dialog (POST /api/user/deactivate). Added `/api/user/:path*` rewrite to next.config.ts.
- **FIXED #68:** Settings/Audit-log — original page queried wrong schema (`tenant_admin.audit_log` with nonexistent columns). Created new API route at `apps/api/app/api/settings/audit-log/route.ts` using Prisma `database.audit_log.findMany` against real `platform.audit_log` schema with pagination, action/table_name/search filters, user ID resolution. New client component with filter controls, paginated table, and DetailDialog with JSON preview of old_values/new_values. Added to infra-allowlist.
- **FIXED #52:** Tools/AI — replaced ModuleSection placeholder with 2-tab client component: AI Suggestions (timeframe selector, generate via GET /api/ai/suggestions, stat cards, suggestion cards with priority/category badges, Take Action button) and Event Summaries (event ID input, generate via GET /api/ai/summaries/[eventId], summary display with highlights and critical info).
- **FIXED #53:** Tools/Battleboards — replaced ModuleSection with full board management: board list with stat cards and search, board detail view with cards table, create/edit dialog (name, description, event ID, template toggle), delete confirmation. Uses GET/POST/PUT/DELETE /api/command-board endpoints.
- **FIXED #54:** Tools/Autofill Reports — replaced ModuleSection with 3-tab component: Event Reports (list + generate via POST /api/events/reports/commands/create), Document Parser (drag-drop upload, POST /api/events/documents/parse, parsed results with Apply), Waste Reports (GET /api/kitchen/waste/reports with groupBy selector, summary cards, reasons breakdown, trends, entries table).
- Remaining placeholder pages needing backend work: #48/#49 Marketing (no campaign APIs), #58 Dashboard (no platform-level APIs), #59 Tenants (no tenant management APIs).
- All 73 API test files pass (1,269 tests). App + API typecheck: clean.

### 2026-04-29 — GS-3 SMS Notification System UI (last TIER 1.5 item)
- **IMPLEMENTED GS-3:** Settings/Notifications page with 2 tabs (Automation Rules, SMS History)
  - Automation Rules tab: list rules in table, create/edit dialog (name, description, trigger type, recipient type, custom message, status, priority), toggle active/inactive, delete with confirmation, summary stat cards (total, active, inactive)
  - SMS History tab: delivery log table with status badges (delivered/sent/failed/pending), status filter dropdown, refresh button, summary stat cards (total, delivered, failed, pending)
- Resolves: GS-3 SMS Notification System (last remaining "Backend Complete, No UI" item — all 4 GS systems now have production UI)
- API routes consumed: GET/POST `/api/communications/sms/automation-rules`, GET/PATCH/DELETE `/api/communications/sms/automation-rules/[id]`, GET `/api/collaboration/notifications/sms/history`
- Biome: 2 warnings (style suggestions only, 0 errors). App + API typecheck: clean.

### 2026-04-29 — Dev-console Webhooks (#57, GS-4) + Users (#56) Pages
- **FIXED #57 + GS-4:** Dev-console/webhooks — replaced placeholder with full webhook management UI: 3-tab layout (Webhooks CRUD, Delivery Logs, Dead Letter Queue). Create/edit dialog with URL, HMAC secret, API key, event/entity filters, retry config. Toggle active/inactive, delete, retry failed deliveries, resolve DLQ entries. Summary stat cards (total, active, failed, DLQ).
- **FIXED #56:** Dev-console/users — replaced placeholder with employee directory UI: user list with avatar initials, role badges, status indicators. Filter by active/inactive. View details dialog. Change role dialog (admin/manager/supervisor/staff). Deactivate and terminate with confirmation. Summary stat cards (total, active, inactive, admins).
- Resolves: GS-4 Outbound Webhooks (now has production UI), placeholder #56, placeholder #57
- Biome: 0 errors on all files. App + API typecheck: clean.

### 2026-04-29 — Placeholder Page Implementation: Settings/Integrations (#51), Settings/Security (#50), Dev-console/API Keys (#55)
- **FIXED #51:** Settings/Integrations — replaced ModuleSection placeholder with full GoodShuffle + Nowsta integration management UI (config forms, status cards, sync controls, edit/delete with confirmation dialogs, test connection)
- **FIXED #50:** Settings/Security — replaced ModuleSection placeholder with API Keys table (view/revoke) + Role Policies table (view) + detail dialogs + revoke confirmation dialog
- **FIXED #55:** Dev-console/API Keys — replaced ModuleSection placeholder with full CRUD: list, create (scope selector), revoke, delete, rotate, view details + copy-to-clipboard for new/rotated keys
- Unblocks: GS-1 GoodShuffle specs (3), GS-2 Nowsta specs
- Biome: 0 errors, 0 warnings on all 4 files. App typecheck: clean.

### 2026-04-29 — Dead Buttons + alert() + Payouts Page Fix (T0-B #17, T2 #60-62, T2 alerts)
- **FIXED T0-B #17:** Payroll payouts page converted from hardcoded fake data to live client component fetching from `/api/payroll/runs` with status filtering, summary cards (Total Paid, Awaiting Payment, Processing), refresh button, and empty state. Blocker was stale — `PayrollRun` model and runs API both existed.
- **FIXED T2 #60:** CRM scoring rule delete button wired to `DELETE /api/crm/scoring/[id]` with confirmation dialog. Backend existed, frontend was just disabled.
- **FIXED T2 #62:** Shipment "Add Item" button now opens modal dialog with item selector (from inventory), quantity, unit cost, condition, lot number, and condition notes fields. Handler was already in the file as `_handleAddItem` — renamed and added modal UI.
- **FIXED T2 alert() calls:** All 16 `alert()` calls across 7 files replaced with `toast.success()` / `toast.error()` from Sonner:
  - calendar/sync (7), administrative/trash (1), kitchen/tasks/new (1), procurement/budget (2), procurement/vendors (2), kitchen/recipes/menus (2)
- All T0 dead buttons now resolved. Only T2 #61 (Email PDF battle board) remains disabled — requires new backend endpoint.
- API + App typechecks pass clean.

### 2026-04-29 — Fake Data / Random Logic Fixes (TIER 2, #63-67)
- **FIXED #63:** Time-off form conflict check replaced `Math.random() > 0.8` with real API call to POST `/api/conflicts/detect`
- **FIXED #64:** Production board WeatherWidget mock data replaced with static "Production Board / Kitchen operations" display
- **FIXED #65:** Recipe editor `Math.random().toString()` IDs (3 occurrences) replaced with `crypto.randomUUID()`
- **FIXED #66:** Allergen warning test page removed from production routes (`git rm`)
- **FIXED #67:** Bare test page removed from production routes (`git rm`)

### 2026-04-29 — RAW_SQL Batch 3 Conversion (5 routes, 10 $queryRawUnsafe eliminated)
- **CONVERTED P0-4 Batch 3:** 5 routes converted from `$queryRawUnsafe` to Prisma ORM / `$queryRaw` tagged templates
  - staff/performance/list: dynamic WHERE + JOIN → `performanceReview.findMany` + batch user lookup
  - procurement/purchase-orders/list: GROUP BY + JOIN → `purchaseOrder.findMany` with include + batch vendor lookup
  - procurement/budget/list: LATERAL JOIN → `procurementBudget.findMany` with `_count` for alerts
  - procurement/budget/[id]: 5 queries → Prisma for budget/alerts, `$queryRaw` tagged templates for 3-table aggregations (NULL-safe optional date params)
  - procurement/budget/commands/refresh: 2 queries → Prisma for budget CRUD/alerts, `$queryRaw` tagged template for spend
- Remaining RAW_SQL: 136 $queryRaw + 23 $executeRaw (all safe Prisma tagged template literals) — $queryRawUnsafe fully eliminated
- All 1269 API tests pass, typecheck clean

### 2026-04-29 — RAW_SQL Batch 4 Audit (Complete Verification)
- **VERIFIED:** $queryRawUnsafe usage is ZERO across all API routes (5 grep matches were code comments in already-converted files)
- **VERIFIED:** $executeRawUnsafe usage is ZERO across all API routes
- **VERIFIED:** No "WHERE 1=1" dynamic query building patterns exist
- **VERIFIED:** No unsafe string concatenation for SQL building exists
- 136 files remain with $queryRaw (safe Prisma tagged template literals) + 23 files with $executeRaw (safe tagged templates)
- All remaining raw SQL is parameterized and safe. RAW_SQL security issue is RESOLVED.

### 2026-04-29 — RAW_SQL Batch 2 + Prisma Schema Corrections
- **CONVERTED P0-4 Batch 2:** 5 routes converted from `$queryRawUnsafe` to Prisma ORM
  - logistics/drivers/list: dynamic SQL → driver.findMany with vehicle include
  - procurement/vendors/list: dynamic SQL with ILIKE → inventorySupplier.findMany with _count
  - events/[eventId]/waitlist/commands/add-guest: 4 raw queries → Prisma create + count + aggregate
  - events/[eventId]/waitlist/commands/promote: 3 raw queries → Prisma update + updateMany
  - events/[eventId]/waitlist/commands/update-rsvp: 4 raw queries → Prisma update + findFirst + updateMany
- **FIXED Prisma schema drift:**
  - Added 9 missing fields to InventorySupplier (address, tax, website, performanceRating)
  - Added vendorCatalogs relation to InventorySupplier + supplier relation to VendorCatalog
  - Fixed VendorCatalog @@map from `vendor_catalog` to `vendor_catalogs` (matching actual DB table)
  - Added 3 RSVP fields to EventGuest (rsvpStatus, waitlistPosition, rsvpRespondedAt) — from waitlist migration
  - Added maxCapacity to Event — from waitlist migration
- Remaining RAW_SQL: 34 routes (~5 CRITICAL, ~13 HIGH, ~16 MEDIUM)
- All 1269 API tests pass, typecheck clean

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

4. ~~**Settings/Integrations placeholder**~~ **RESOLVED** (2026-04-29)
   - Full GoodShuffle + Nowsta integration management UI implemented
   - Settings/Security (API Keys + Role Policies) also implemented
   - Dev-console/API Keys CRUD page also implemented

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
