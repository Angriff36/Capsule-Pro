# IMPLEMENTATION_PLAN.md — v67

> Updated 2026-05-13 by verification pass.
> P0.I, P0.X, P0.L, P0.AE, P0.AF resolved. P0.AH demoted (localhost fallback is correct pattern).

## v67 Findings (2026-05-13)

- **Production code: CLEAN** — 0 typecheck errors in `apps/api/app/api/` route files; `pnpm --filter app typecheck` passes. Build blocked by missing env vars (RESEND_TOKEN, NEXT_PUBLIC_CLERK_*, etc.) locally.
- **Test file import failures: 171** — TS2307 "Cannot find module" across ~40 test files. Tests import camelCase paths (e.g., `@/app/api/adminchatparticipant/archive/route`) but routes use kebab-case (`/administrative/chat/participants/`). Some routes don't exist at all (e.g., `@/app/api/user/create/route`).
- **Test type errors (non-TS2307): 221** — Wrong argument counts (TS2554), request type mismatches (TS2345 using `Request` instead of `NextRequest`). Test setup issues, not production.
- **Manifest dispatcher modified** — `apps/api/app/api/manifest/[entity]/commands/[command]/route.ts` imports kitchen-specific `kitchen.commands.json` registry. May not work for non-kitchen entities. Console.log statements present (violates P1.B policy).

## v66 Resolved (2026-05-13)

- **P0.I — Events: waitlist route uses $queryRaw unnecessarily** [RESOLVED v66] — Replaced raw SQL queries with Prisma ORM for event capacity and guest list. File: `apps/api/app/api/events/[eventId]/waitlist/route.ts`.
- **P0.X — Scheduling: notifications fetch missing /api/ prefix** [RESOLVED v66] — Added missing `/api/` prefix to notifications API call. File: `apps/app/app/(authenticated)/scheduling/notifications/notifications-client.tsx`.
- **P0.L — Knowledge Base: client reads wrong response shape** [RESOLVED v66] — Fixed client to read `data.entries` instead of `data.data.entries`. File: `apps/app/app/(authenticated)/knowledge-base/knowledge-base-client.tsx`.
- **P0.AE — Events: server-to-server import targets wrong table** [RESOLVED v66] — Changed INSERT from `event_tasks` to `timeline_tasks`. Added missing priority/category fields to schema. File: `apps/api/app/api/events/import/server-to-server/route.ts`.
- **P0.AF — Logistics: tracking queries wrong suppliers table** [RESOLVED v66] — Changed table name from `suppliers` to `inventory_suppliers` (matching @@map on InventorySupplier). File: `apps/api/app/api/logistics/tracking/route.ts`.

## v65 Resolved (2026-05-13)

- **P0.A — Payroll: generation UI sends empty body** [RESOLVED v65] — Schema updated to accept optional `periodStart`/`periodEnd`; server-side defaults to current month start through today. Files: `packages/payroll-engine/src/models/index.ts`, `apps/api/app/api/payroll/generate/route.ts`, `packages/payroll-engine/src/services/payrollService.ts`.
- **P0.D — Scheduling: shift_count column doesn't exist** [RESOLVED v65] — Replaced invalid `s.shift_count` column reference with `COUNT(ss.id)::bigint AS shift_count` via LEFT JOIN to `schedule_shifts`. File: `apps/app/app/(authenticated)/scheduling/shifts/actions.ts`.
- **P0.Q — Security: plaintext credentials in docs/test-screenshot.ts** [RESOLVED v65] — File deleted. Credentials (`unashamed366@gmail.com` / `rWon22Jo5HvYCa`) removed from codebase.

---

## P0 — Critical Bugs (Fix Immediately)

These cause runtime errors, data loss, or broken user flows. 21 items (down from 29; 8 resolved in v65-v66, 2 removed as false/non-bugs). Plus 12 confirmed missing backend routes (all individually tracked as P0 items).

### Confirmed (verified by code inspection)

- [x] **P0.A — Payroll: generation UI sends empty body** [RESOLVED v65]
  `apps/app/app/(authenticated)/payroll/runs/page.tsx:177` sends `body: JSON.stringify({})`. API at `apps/api/app/api/payroll/generate/route.ts:51` requires `periodStart`/`periodEnd`. Every attempt fails 400.

- [x] **P0.B — Payroll: 2024 tax rates presented as 2026** [RESOLVED v68]
  `packages/payroll-engine/src/core/taxEngine.ts` uses 2024 brackets. Updated to 2026 IRS Revenue Procedure 2025-53 brackets. Additional Medicare computed but discarded (`_additionalMedicare`) — now properly added to withholding. `head_of_household` fell through to single brackets — now has dedicated HOH brackets and standard deduction.

- [x] **P0.D — Scheduling: shift_count column doesn't exist** [RESOLVED v65]
  `apps/app/app/(authenticated)/scheduling/shifts/actions.ts:678` raw SQL selects `s.shift_count` from `tenant_staff.schedules`. No such column. Other code correctly uses COUNT(*) aggregate.

- [ ] **P0.E — Marketing: lead command routes missing** [VERIFIED v63]
  `apps/app/app/lib/use-leads.ts:105` calls `/api/crm/leads/commands/{convert-to-client,disqualify,archive,update}`. No `commands/` directory. Client sends kebab-case but manifest expects camelCase (`convertToClient`).

- [ ] **P0.F — Marketing: SMS toggle route mismatch** [VERIFIED v63]
  UI calls `POST /api/smsautomationrule/activate|deactivate`. Actual API is `PATCH /api/communications/sms/automation-rules/[id]`. Toggle is broken.

- [ ] **P0.G — Procurement: command route directories missing** [VERIFIED v63]
  UI calls `/api/procurement/requisitions/commands/${command}`. No `commands/` directory exists. AGENTS.md claim of "8+10 command dirs" is fabricated.

- [x] **P0.I — Events: stale waitlist route uses $queryRaw unnecessarily** [RESOLVED v66]
  `apps/api/app/api/events/[eventId]/waitlist/route.ts` — all referenced fields (`Event.maxCapacity`, `EventGuest.rsvpStatus`, `EventGuest.waitlistPosition`) exist in Prisma. Could use ORM.

- [ ] **P0.J — Inventory: barcode lookup queries non-existent column** [VERIFIED v63]
  `apps/api/app/api/inventory/barcode-lookup/route.ts:62-86` queries `barcode` from `InventoryItem`. No such field (exists on `CycleCountRecord` only).

- [x] **P0.L — Knowledge Base: client reads wrong response shape** [RESOLVED v66]
  Client reads `data.data.entries` but API returns flat `{ success, entries, hasMore, totalCount }`. TypeError on every load.

- [x] **P0.O — Cycle Counting: server action passes tenantId as authUserId** [RESOLVED v67]
  `apps/app/app/(authenticated)/cycle-counting/actions/sessions.ts:119-123` and `records.ts:117-121,300-304` passed `requireTenantId()` as `authUserId`. User lookup always failed. Fixed by using `requireCurrentUser()` instead, which properly resolves the Clerk userId and performs correct `(tenantId, authUserId)` lookup.

- [x] **P0.P — Cycle Counting: hardcoded dummy UUID for locationId** [RESOLVED v67]
  `apps/app/app/(authenticated)/cycle-counting/page.tsx:74` hardcoded nil UUID. Fixed by adding a location `<Select>` dropdown that fetches locations from the database and passes the selected `locationId` to the server action.

- [x] **P0.Q — Security: plaintext credentials in docs/test-screenshot.ts** [RESOLVED v65]
  Real email `unashamed366@gmail.com` and password `rWon22Jo5HvYCa` from Playwright codegen. Rotate immediately.

- [ ] **P0.R — Event Intake: /api/menu-story route missing** [VERIFIED v63]
  `MenuWizardShell.tsx:69` calls `POST /api/menu-story`. No route exists.

- [ ] **P0.S — Event Intake: /api/lead route missing (singular)** [VERIFIED v63]
  `submitLead.ts:13` calls `POST /api/lead`. Routes are at `/api/crm/leads/` (plural).

- [ ] **P0.T — Inventory: variance report review/approve routes missing** [VERIFIED v63]
  UI calls `POST /api/variancereport/review` and `approve`. Only `list/` exists.

- [ ] **P0.U — Settings: alerts config create/update/remove routes missing** [VERIFIED v63]
  UI calls `/api/alertsconfig/{create,update,remove}`. Only `list/` exists.

- [ ] **P0.V — Events: catering order create/cancel/command routes missing** [VERIFIED v63]
  UI calls `/api/cateringorder/{create,cancel,${command}}`. Only `list/` exists.

- [ ] **P0.W — Settings: user update-role and deactivate routes missing** [VERIFIED v63]
  UI calls `/api/user/{update-role,deactivate}`. No `apps/api/app/api/user/` directory.

- [x] **P0.X — Scheduling: notifications fetch missing /api/ prefix** [RESOLVED v66]
  Client calls `apiFetch("/staff/notifications")` without `/api/` prefix.

- [ ] **P0.Y — Events: /api/events/{eventId}/dishes route missing** [VERIFIED v63]
  `guest-management.tsx:260` calls `GET /api/events/${eventId}/dishes`. No route directory.

- [ ] **P0.Z — Kitchen: prep-task-plan-workflows command routes missing** [VERIFIED v63]
  `workflows-client.tsx:298` calls `/api/kitchen/prep-task-plan-workflows/commands/${command}`. No `commands/` directory.

- [ ] **P0.AA — CRM: /api/crm/deals base route missing** [VERIFIED v63]
  `pipeline-board.tsx:212` calls `GET /api/crm/deals`. Only `/api/crm/deals/list/` exists. No base route.ts.

- [ ] **P0.AB — Events: profitability recalculate command route missing** [VERIFIED v63]
  `apps/app/app/lib/use-event-profitability.ts:101` calls `POST /api/events/profitability/commands/recalculate`. No `commands/` directory.

- [ ] **P0.AC — Events: import-workflows command routes missing** [VERIFIED v63]
  `workflow-detail-client.tsx:194` calls `POST /api/events/import-workflows/commands/${command}`. No `commands/` directory.

- [ ] **P0.AD — CRM: proposals command routes missing** [VERIFIED v63]
  `apps/app/app/lib/use-proposals.ts:133` calls `POST /api/crm/proposals/commands/${command}`. No `commands/` directory.

- [x] **P0.AE — Events: server-to-server import targets non-existent event_tasks table** [RESOLVED v66]
  `apps/api/app/api/events/import/server-to-server/route.ts:490` raw SQL INSERT into `event_tasks`. Correct table is `timeline_tasks` (via @@map).

- [x] **P0.AF — Logistics: tracking queries non-existent suppliers table** [RESOLVED v66]
  `apps/api/app/api/logistics/tracking/route.ts:97` queries `tenant_inventory.suppliers`. Correct table is `inventory_suppliers` (via @@map on InventorySupplier).

- [x] **P0.AG — Schema: default zero UUID in production schema** [RESOLVED v68]
  `packages/database/prisma/schema.prisma` had `DEFAULT '00000000-0000-0000-0000-000000000000'` for `storage_location_id` in `InventoryTransaction`. Changed to nullable (String? @db.Uuid). Updated all code paths that used zero UUID as fallback.

- [REMOVED v66] **P0.AH — Calendar: hardcoded localhost in production sync** — NOT A BUG. Fallback pattern (`NEXT_PUBLIC_APP_URL || "http://localhost:2221"`) is correct for development. Production properly uses `NEXT_PUBLIC_APP_URL` set via Vercel environment.
  `apps/app/app/(authenticated)/calendar/sync/page.tsx:354,388` hardcodes `"http://localhost:2221"` as fallback URL.

### Items removed from prior versions (verified as false)

- **[REMOVED v58] P0.C — Notifications: bouncedAt field crash**: Not a runtime crash.
- **[REMOVED v58] P0.H — Events: EventDish has no Prisma model**: Model exists.
- **[REMOVED v58] P0.K — Inventory: low-stock pagination metadata is wrong**: Metadata is correct.
- **[REMOVED v59] P0.N — Calendar Sync: no Prisma model**: Routes use `ProviderSync` model.
- **[REMOVED v64] P0.M — Knowledge Base: entity not in manifest IR**: FALSE POSITIVE. `KnowledgeBaseEntry` IS in routes.manifest.json with 6 routes (list, detail, create, publishEntry, remove, update). See v64 Corrections.

---

## P1 — High Priority (Production Blockers / Security)

### P1.A — Design System Compliance [CORRECTED v63]

- [ ] **ResearchTable**: 125+ bare `<Table>` usages confirmed. 10 ResearchTable import files.
- [ ] **BlogFilterChip**: 7 import files, 16 uses. Most filterable lists use `<Select>` or raw buttons.
- [ ] **ContactFormCard**: 0 adopters. Defined but never imported.
- [ ] **30/40 design blocks have zero external consumers** — majority of block exports are unused.
- [ ] **Empty state primitive**: ~16 files use shared components vs 40+ inline div instances.
- [ ] **Module landings**: 7 of 20+ modules.
- [ ] **`text-3xl font-bold`**: 2 occurrences across 2 files.
- [ ] **Decorative pastel backgrounds**: 523 `bg-*-50/100/200` instances across 105 files.
- [ ] **Bare Card violations**: 213 files across apps/app.

### P1.B — Console Statements [CORRECTED v63]

~974 total across ~364 files. `console.log`: 429/52 files. `console.error`: 501/293 files. `console.warn`: 44/28 files. 153 of 561 manifest routes have console.error (27%).

### P1.C — RLS Gaps [CORRECTED v63]

14 migration files enable RLS across 20+ tables. Full recount of tables without RLS still needed. Confirmed tables WITH RLS: accounting (chart_of_accounts, invoices, collection_cases, collection_actions, collection_payment_plans, revenue_recognition_schedules, revenue_recognition_lines), inventory (inventory_items, inventory_transactions, inventory_suppliers, vendor_catalogs), logistics (vehicles, drivers), facilities (facility_assets), staff (labor_budgets, budget_alerts), admin (admin_chat_threads, admin_chat_participants, admin_chat_messages), kitchen (prep_task_plan_workflows), plus audit_log, ActivityFeed, webhook_dead_letter_queue, manifest_command_telemetry.

### P1.D — Duplicate Route Cleanup [CHALLENGED v63]

v62 claimed 7 confirmed true duplicates. Deep scan found 0 true duplicates (routes calling `executeManifestCommand` were miscounted as "manifest-generated"). Needs final reconciliation.

### P1.E — Manifest/Prisma Schema Alignment [VERIFIED v63]

- **Logistics**: Driver has single `name` in Prisma vs `firstName`+`lastName` in manifest.
- **Facilities**: Manifest defines Facility entity with `type` defaulting to `"venue"` vs Prisma `facilityType` defaulting to `"kitchen"`.
- **Scheduling**: Override confirmed but class is generic `PrismaStore`.

### P1.F — Missing E2E Product-Flow Tests [v59]

Genuine gaps: Payroll (no workflow), Marketing (feature unbuilt), Procurement (no workflow), Search (no full-flow test).

### P1.G — Auto-Generated Route Quality [CORRECTED v63]

178 auto-generated routes. 154/178 use `console.error`. Some routes DO implement filtering/pagination (events, inventory, clients have pagination; events and inventory have filtering). IR tracks both GET (260) and POST (589) handlers.

### P1.H — Audit Writer Never Called [VERIFIED v63]

`apps/api/app/lib/audit-writer.ts` exports never called from any route. Zero grep matches across all API route files.

### P1.I — AGENTS.md Fabricated Procurement Claim [VERIFIED v63]

AGENTS.md lines 369-378 claim "8+10 command dirs" for procurement. None exist on disk.

### P1.J — Broken Test Imports [CORRECTED v64]

619 TS errors (TS2307: module not found) across 19 test files. 41 skipped tests across 13 E2E files.

---

## P2 — Medium Priority (Feature Gaps / Hardening)

### P2.A — Accounting [v59, CORRECTED v63]

- [ ] No journal entries / general ledger / double-entry bookkeeping
- [ ] Bank reconciliation is simulated
- [ ] Financial reports expense totals hardcoded to 0 — `.reduce(() => 0, 0)` at `apps/api/app/api/accounting/financial-reports/route.ts:260`
- [ ] No accounts payable
- [ ] TaxConfiguration model has only 1 API route under payroll, zero accounting routes
- [ ] No fiscal year / period management
- [ ] New forms use raw UUID text inputs
- [ ] Duplicate CoA route directories

### P2.B — Events [v59, CORRECTED v63]

- [ ] EventSummary missing `confidence` field (confirmed: model has no confidence column)
- [ ] Event.importWorkflowId NOT in schema (confirmed: no such field on Event model)
- [ ] Import pipeline: backend has flat `parseStatus`; UI shows 8-phase display
- [ ] Multi-day event support not modeled
- [ ] Event import code commented out — BLOCKER at `apps/api/app/api/events/documents/parse/route.ts:936-944`
- [ ] Budget alerts not integrated in events list
- [ ] Event detail not using spec shell composition

### P2.C — Logistics [VERIFIED v63]

- [ ] Simulated GPS tracking (hardcoded LA coordinates — 34.052)
- [ ] Route optimization non-functional
- [ ] No Prisma relations (FK fields only, all joins via raw SQL)
- [ ] Mixed create patterns across entities

### P2.D — Payroll [VERIFIED v63]

- [ ] State tax coverage only 8/50 states
- [ ] Period ID generation produces non-UUID strings
- [ ] No payroll_line_items index
- [ ] Duplicate routes

### P2.E — Scheduling [VERIFIED v63]

- [ ] No `apps/api/app/api/scheduling/` directory — no scheduling API exists at all
- [ ] `open_shifts` model has no management UI or API
- [ ] Requests page joins `public.users` instead of `tenant_staff.employees`

### P2.F — CRM [v59]

- [ ] Lead.score/score_breakdown columns not in Prisma model
- [ ] 0 scoring tests (all raw SQL)
- [ ] Dual write/read paths untested
- [ ] ClientContact/ClientPreference missing relations to Client
- [ ] Venue in wrong schema

### P2.G — Search [VERIFIED v63]

- [ ] FR-107 violation: single-char queries return 200+empty not 400
- [ ] No saved searches (no model, no API, no UI)
- [ ] No search history (no model, no API, no UI)
- [ ] Filter pills not migrated to BlogFilterChip
- [ ] Results not migrated to ResearchTable

### P2.H — Settings [VERIFIED v63]

- [ ] Rate limits have full API but no UI surface
- [ ] No Clerk MFA link in Security page
- [ ] Audit writer never called (see P1.H)
- [ ] Integrations-client.tsx: 2,064 lines (monolithic)
- [ ] Notifications-client.tsx: 1,714 lines (monolithic)
- [ ] Admin role-gating incomplete

### P2.I — Staff/HR [VERIFIED v63]

- [ ] No API routes for Disciplinary actions, Onboarding tasks, Departments, Skills, PINs
- [ ] Duplicate `getEmployees()` across 3 scheduling action files
- [ ] 3 redirect pages

### P2.J — Notifications [v59, CORRECTED v63]

- [ ] Duplicate SMS files — `sms.ts`, `sms-new.ts`, `sms-temp.ts` in `packages/notifications/`
- [ ] Hardcoded sender email
- [ ] No pagination on main notifications list
- [ ] No real-time push (Knock provider context exists but server-side never called)

### P2.K — Marketing [VERIFIED v63]

- [ ] Campaigns page is "Coming Soon" placeholder
- [ ] Analytics open rate counts "delivered" as "opened" — inflates rate
- [ ] No public lead capture endpoint (spec FR-702, SC-005)
- [ ] E2E test is stale
- [ ] SMS rules uses plain Dialog not ContactFormCard; list uses custom div grid not ResearchTable
- [ ] Leads list uses custom div grid, zero ResearchTable usage in marketing
- [ ] Analytics page returns `0` for zero-data case instead of null/em-dash per spec

### P2.L — Procurement [v59]

- [ ] PO receive operation lacks `$transaction()`
- [ ] No requisition line items in detail view
- [ ] Vendor contract create uses raw UUID input for vendorId
- [ ] Budget alerts not generated by any cron/trigger
- [ ] No tests for budget, approvals, or server actions

### P2.M — Facilities [v59]

- [ ] No spec exists
- [ ] RBAC policies defined but not enforced
- [ ] Schedules/work-orders list routes have no pagination clamps
- [ ] SelectItem with empty string value
- [ ] Orphan E2E test tests non-existent routes

### P2.N — Tools/AI [v59]

- [ ] `packages/ai` SDK is disconnected (zero imports of `@repo/ai`)
- [ ] Only 1 of 4 API routes has tests
- [ ] ~50 bare Card violations, color violations present

### P2.O — Command Board [v59]

- [ ] Two competing data models: `CommandBoardCard` vs `BoardProjection`
- [ ] Template sharing blocked (501)
- [ ] Direct Prisma writes bypass manifest runtime
- [ ] AI Chat UI, Plan Approval UI, Simulation toggle UI all missing (APIs exist)
- [ ] Realtime collaboration not wired (Liveblocks exists, not connected)
- [ ] React Flow not used (spec requires it; implementation uses custom HTML canvas)

### P2.P — Documents/Storage [v59]

- [ ] No document management UI
- [ ] Zero tests for `@repo/storage` and `@repo/pdf`
- [ ] Duplicated base64 encoding logic across 6 PDF routes

### P2.Q — Environment Variable Gaps [v59]

- [ ] `RESEND_WEBHOOK_SECRET` used without t3-env validation
- [ ] `SENTRY_DSN` used in edge config but not declared in keys.ts
- [ ] `PLASMIC_PROJECT_ID` / `PLASMIC_API_TOKEN` guarded by `invariant()` but not in `.env.example`
- [ ] 5 other env vars absent from `.env.example`

### P2.R — Verified Discoveries [VERIFIED v63]

- [ ] **Kitchen: import uses nil UUIDs for FK fields** — `apps/api/app/api/kitchen/import/route.ts:311,333`
- [ ] **QuickBooks: export history always returns empty** — `apps/api/app/api/integrations/quickbooks/history/route.ts:26-27`
- [ ] **No SupplierSyncHistory model** — `apps/api/app/api/inventory/supplier-sync/status/route.ts:96-98` BLOCKER
- [ ] **Workforce AI optimizer placeholder** — `apps/api/lib/staff/workforce-ai-optimizer.ts:569` always returns `0.75`
- [ ] **Trash list route: 9+ table name mismatches**
- [ ] **5 tables in migrations with no Prisma model** — `inter_location_transfers`, `inter_location_transfer_items`, `location_resource_shares`, `sensor_readings`, `food_safety_logs`

### P2.S — Kitchen: Duplicate Route Directories [VERIFIED v63]

- [ ] 11+ pairs (camelCase vs kebab-case): dish/dishes, ingredient/ingredients, station/stations, task/tasks, preplist/prep-lists, preplistitem/prep-list-items, recipe/recipes, menudish/menu-dishes, recipeingredient/recipe-ingredients, recipeversion/recipe-versions, inventoryitem/inventory

### P2.T — Kitchen: Hardcoded Nutrition Database [VERIFIED v63]

- [ ] 16 hardcoded ingredients. Anything else silently returns zero nutrition values.

### P2.U — CRM: No Deal Prisma Model [VERIFIED v63]

- [ ] Pipeline drag-and-drop broken. No `Deal` model. `deal-rules.manifest` stores in memory only.

### P2.V — CRM: No Leads Management UI [VERIFIED v63]

- [ ] Full Lead API exists but no UI for listing, creating, converting, or disqualifying.

### P2.W — CRM: All Manifests Store In Memory [VERIFIED v63]

- [ ] All 5 CRM manifests use `store X in memory`. No CRM data persists through manifest system.

### P2.X — Zod v3/v4 Version Mismatch [VERIFIED v63]

- [ ] `packages/supplier-connectors` uses Zod `^3.24.2` while repo uses Zod v4.

### P2.Y — Triple Overlapping SMS Files [VERIFIED v63]

- [ ] `packages/notifications/` has `sms.ts`, `sms-new.ts`, `sms-temp.ts` with near-identical content.

### P2.Z — Dual PDF Stacks [VERIFIED v63]

- [ ] `packages/pdf` uses `@react-pdf/renderer`, `packages/sales-reporting` uses `pdfkit`.

### P2.AA — Dead Packages Confirmed [VERIFIED v63]

- [ ] `@repo/ai` — 0 consumers. Re-exports bare Vercel AI SDK, internal class unused.
- [ ] `@repo/kitchen-state-transitions` — 0 consumers. State logic handled inline.

### P2.BB — Events: EventDish entity missing from Prisma schema [NEW v63]

- [ ] Spec requires EventDish for battle board dish voting. Model does not exist.

### P2.BC — Events: No status transition commands [NEW v63]

- [ ] Spec requires dedicated commands (confirm/cancel/start/complete). Events mutated directly without domain events or audit trail.

### P2.BD — Staffing: CoverageBar design primitive missing [NEW v63]

- [ ] Spec FR-401 requires CoverageBar component. Does not exist in design system.

### P2.BE — Staffing: Onboarding tasks not implemented [NEW v63, CORRECTED v64]

- [ ] `OnboardingTask` and `OnboardingCompletion` Prisma models exist but have zero API routes. No UI. Spec compliance gap.

### P2.BF — REMOVED v64 (Calendar: sync routes verified present)

All 6 calendar sync routes confirmed present. See v64 Corrections below.

### P2.BG — Frontend API Calls Hitting Missing Routes [NEW v63, CORRECTED v64]

Deep audit found the "130 missing routes" claim was massively overstated. Actual count: **12 confirmed missing routes** across 13 call sites. All 12 are already individually tracked as P0 items (P0.E, P0.T, P0.U, P0.V, P0.W, P0.AA, P0.AD, P0.Y). 41 other "missing" calls work correctly through the manifest dispatcher (`/api/manifest/[Entity]/commands/[command]`). 166 non-manifest routes have matching backend files. This item is now a cross-reference only.

### P2.BH — Security: SQL Injection Risk in Staffing Coverage [NEW v63, DOWNGRADED v64]

- [ ] `apps/api/app/api/staffing/coverage/route.ts:70-163` uses `$queryRawUnsafe`. However, only `$${locIdx}` (a hardcoded number) is interpolated into SQL. No user data reaches the query string. **Risk: LOW** (not exploitable as-is, but pattern should be replaced with `$queryRaw` + `Prisma.sql` for defense-in-depth).

### P2.BI — Security: Exposed Stack Traces in Production API Responses [NEW v63, DOWNGRADED v64]

- [ ] `apps/api/app/api/kitchen/import/route.ts:481-483` and `apps/api/app/api/events/documents/parse/route.ts:1235-1237` include `error.stack` in responses but ONLY when `NODE_ENV === "development"`. `apps/api/app/api/communications/email-templates/commands/create/route.ts:118` passes stack to `log.error` only, not the response body. **Risk: LOW-MEDIUM** (safe in production; fix to remove conditionally for defense-in-depth).

### P2.BJ — Data Integrity: Clock-In Duplicates Not Prevented [NEW v63]

- [ ] No unique constraint on `(tenant_id, employee_id, shift_id)` for TimeEntry.

### P2.BK — Data Integrity: Payroll Generation Race Condition [NEW v63]

- [ ] `apps/api/app/api/payroll/timecards/generate/route.ts:223-236` bulk inserts without checking for existing entries.

### P2.BL — Data Integrity: Inventory Stock Adjustment Race Condition [NEW v63]

- [ ] `apps/api/app/api/inventory/stock-levels/adjust/route.ts:314` checks for negative stock BEFORE the transaction starts.

### P2.BM — Security: readFileSync for OPENAI_API_KEY in Production Code [NEW v64]

- [ ] `apps/app/app/api/command-board/chat/route.ts:71-81` reads `.env` files with `readFileSync` to extract `OPENAI_API_KEY` at runtime when `process.env.OPENAI_API_KEY` is not set. Falls back to scanning `Documents/env.txt`.
- [ ] `packages/manifest-adapters/src/bottleneck-detector/ai-suggestions.ts:48-58` has identical pattern. Both should use `process.env` only. File reads in serverless functions are unreliable and potentially expose secrets through logging/error paths.

### P2.BN — Manifest Dispatcher Console.log in Hot Path [NEW v64]

- [ ] `apps/api/app/api/manifest/[entity]/commands/[command]/route.ts:46` logs every command execution with `console.log` including userId, userRole, tenantId, and body keys. High-traffic route. Violates P1.B policy and leaks PII to stdout.

### P2.BO — Missing Error Boundaries [NEW v64]

- [ ] Only 1 `error.tsx` exists in the authenticated layout (`apps/app/app/(authenticated)/error.tsx`). 233 page.tsx files have no dedicated error boundary. Module-level crashes propagate to the top-level catch-all, losing navigation context and showing generic error UI.

---

## P3 — Low Priority (Polish / Cleanup)

### Dead Packages (confirmed zero imports)

- `packages/brand/` — wrong naming convention (`@capsule/` vs `@repo/`)
- `packages/sales-reporting/` — 1 API consumer, no frontend UI

### Package Issues

- Zod version fragmentation across 3 version ranges (see P2.X)
- `packages/sales-reporting/`: wrong package name, stale vitest, separate lockfile
- `packages/event-parser/`: narrow usage (2 consumers), no tests

### Manifest System Issues

- 86 active manifests, 6 disabled — all compiled into IR (no silent dead manifests)
- 178 generated routes
- IR tracks GET (260) and POST (589) routes
- 71 route files use executeManifestCommand
- ESLint enforcement not activated; 5,013 hardcoded `/api/` paths

### Stub Connectors

- `packages/supplier-connectors/` — US Foods and Charlie's Produce are stubs

### Duplicate Components

- 4 copies of StatCard in tools domain
- 2 copies of getInitials() in collaboration package
- 2 cursor implementations

### Skipped Tests

- 41 skipped tests across 13 E2E files
- 4 unconditionally skipped in ai-context-aware-suggestions E2E
- 2 test files with broken imports (22 total — see P1.J)
- 8+ domains with zero E2E coverage (Accounting, CRM, Payroll, Search, Settings, Timecards, Training, Webhooks)

### Stats

- 1,105 TODOs across 250 files
- 5 BLOCKER comments in API routes
- 12+ hardcoded zero UUIDs in production code
- ~974 console statements across ~364 files
- 12 confirmed missing backend routes (already tracked as individual P0 items)
- 41 frontend calls work via manifest dispatcher (not missing)
- 2 test files with broken imports (619 total — see P1.J)

---

## Spec Gap Summary

See `docs/audits/v61-spec-comparison.md` for detailed per-spec analysis.

### Events (~40% spec compliance)

Missing `confidence` field on EventSummary (confirmed absent). No `importWorkflowId` on Event (confirmed absent). No status transition commands. 6-stage import pipeline not implemented (flat parseStatus vs 8-phase display). EventDish model does not exist (battle board non-functional). Budget alerts not integrated. Event detail not using spec shell composition.

### Calendar (partial compliance)

All 6 sync routes CONFIRMED present. `CalendarSyncConnection` model is `ProviderSync` (naming mismatch only). Missing mobile responsive list view. Hardcoded localhost confirmed (P0.AH, display-only fallback). Reschedule API CONFIRMED.

### Staffing (~70% compliance)

Employee CRUD: COMPLETE. Scheduling: COMPLETE. Timecards: PARTIAL (no clock in/out). Certifications: PARTIAL (no expiration alerts). Onboarding: Prisma models exist (OnboardingTask/OnboardingCompletion) but zero API routes — NOT IMPLEMENTED. CoverageBar primitive: MISSING. Design system violations in staffing pages.

### Command Board

AI Chat backend built, frontend MISSING. Plan Approval/Rejection backend built, frontend MISSING. Simulation Toggle: 6 API endpoints built, frontend MISSING. React Flow required, custom HTML canvas used. Data model divergence: frontend uses CommandBoardCard, API uses BoardProjection.

### Marketing

Campaigns "Coming Soon". SMS rules use plain Dialog not ContactFormCard. Leads list uses custom div grid. Zero ResearchTable usage. No public lead capture endpoint.

### Contracts

EventContract and VendorContract models exist in Prisma. EventContract has 8 commands in manifest IR. VendorContract has 10 commands in manifest IR. Public signing surface at `/sign/[signingToken]` needs verification. Contract expiration cron exists in vercel.json.

### CRM

NO spec document. Ranked HIGH priority for spec authoring. Full pipeline board, proposals, scoring, venues built. Lead API exists but UI only partially built.

### Kitchen

NO spec (ranked CRITICAL — largest domain at 240 files with 32 Prisma models, 46 API route groups, 31 frontend pages, zero spec coverage). 11 duplicate route directory pairs. Zero commands/ directories (pure REST pattern).

### Domains WITHOUT specs (ranked by urgency)

| Priority | Domain | Files | Why needed |
|----------|--------|-------|------------|
| CRITICAL | kitchen/ | 240 | Largest domain, no spec coverage |
| HIGH | crm/ | 78 | Full CRM lifecycle, no spec at all |
| HIGH | analytics/ | 79 | Cross-cutting dashboards, no metrics contract |
| HIGH | scheduling/ | 41 | Core operational module, no API exists |
| MEDIUM | inventory/ | 61 | Warehouse operations |
| MEDIUM | accounting/ | 50 | Financial module |
| MEDIUM | procurement/ | 61 | Requisition through PO |
| MEDIUM | payroll/ | 100 | Payroll processing |

---

## Archive Map

Completed pass write-ups and historical notes:
- `docs/implementation-history/` — pass logs, executive summaries
- `docs/audits/` — numbered audit passes
- `docs/audits/v61-spec-comparison.md` — detailed spec gap analysis

---

## Methodology

- **v64**: 60+ agent comprehensive audit (7 spec readers, 30 P0 verifiers, 11 domain analysts, 6 spec compliance checkers, 3 security verifiers, 3 new-issue scouts). All 30 P0 items re-verified — 29 confirmed, 1 REMOVED (P0.M false positive). P2.BH downgraded to LOW (safely constructed params, no user data). P2.BI downgraded to LOW-MEDIUM (gated behind NODE_ENV=development). 3 new P2 items: readFileSync for OPENAI_API_KEY (P2.BM), manifest dispatcher console.log in hot path (P2.BN), missing error boundaries (P2.BO). Spec compliance re-verified: Events ~40%, Staffing ~70%, Calendar partial, Contracts partially verified. Kitchen confirmed largest domain (240 files, 32 Prisma models, 46 API groups). CRM has 78 files with no spec. Domain file counts updated.
- **v63**: Full re-verification of all 30 P0 items by 40+ parallel agents. 30 CONFIRMED. P1.A counts updated. P1.B raised (~974/~364). P1.C RLS corrected. P1.D duplicate routes claim CHALLENGED. P1.G corrected. 6 new P2 items (P2.BB–P2.BL).
- **v62**: Full re-verification of all 28 P0 items from v61. 2 new P0 (P0.AG, P0.AH). 8 new P2 items (P2.S–P2.AA).
- **v61**: Massive multi-agent audit synthesis. 28 P0 items verified. 5 new P0 (P0.AB–P0.AF). 7 new P2 items.
- **v60**: 30+ parallel Sonnet verification agents + 1 Opus synthesis. 3 new P0 (P0.Y–P0.AA).
- **v59**: 80+ parallel verification agents. 7 new P0 (P0.R–P0.X).
- **v58**: Initial 80+ agent audit.

### v64 Corrections

- **P0.M REMOVED**: KnowledgeBaseEntry IS in routes.manifest.json with 6 routes (list, detail, create, publishEntry, remove, update). The manifest IS compiled into IR. The v63 claim "absent from routes.manifest.json" and "never compiled" was FALSE. The real bug for Knowledge Base is P0.L (response shape mismatch) only.
- **P2.BF REMOVED**: Deep audit confirmed all 6 calendar sync routes are present. The v63 claim of missing trigger/callback endpoints was FALSE.
- **P2.BG CORRECTED**: Deep audit found actual count is 12 confirmed missing routes (not 130). 41 "missing" calls work through manifest dispatcher. 166 non-manifest routes have matching backend files. All 12 missing routes are already tracked as individual P0 items (P0.E, P0.T, P0.U, P0.V, P0.W, P0.AA, P0.AD, P0.Y).
- **P2.BE CORRECTED**: OnboardingTask and OnboardingCompletion Prisma models DO exist. Gap is API routes and UI only, not models.
- **P1.J CORRECTED**: Actual count is 619 TS errors (TS2307) across 19 test files, not "22 type errors in 2 files".
- **P1.A UPDATED**: Added finding that 30/40 design blocks have zero external consumers.
- **P2.BH DOWNGRADED**: `$queryRawUnsafe` in staffing/coverage uses safely constructed `locParam`. Only `$${locIdx}` (a hardcoded numeric index) is interpolated. No user data enters the SQL string. Changed from HIGH to LOW severity.
- **P2.BI DOWNGRADED**: Stack traces in kitchen/import:481 and events/documents/parse:1235 are gated behind `NODE_ENV === "development"`. Email-templates/create:118 passes stack to `log.error` only, not response. Changed from HIGH to LOW-MEDIUM severity.

### v64 New Discoveries

- **P2.BM**: readFileSync for OPENAI_API_KEY — `apps/app/app/api/command-board/chat/route.ts:71-81` and `packages/manifest-adapters/src/bottleneck-detector/ai-suggestions.ts:48-58` fall back to reading `.env` files from disk when `process.env.OPENAI_API_KEY` is unset. Unreliable in serverless, potential secret exposure through logging.
- **P2.BN**: Manifest dispatcher console.log — `apps/api/app/api/manifest/[entity]/commands/[command]/route.ts:46` logs every command with userId, userRole, tenantId, and body keys. High-traffic hot path. PII leak to stdout.
- **P2.BO**: Missing error boundaries — only 1 error.tsx for 233 page.tsx files in authenticated layout. Module-level crashes lose navigation context.
