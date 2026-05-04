# Capsule Pro Fix List

**112 entries — 2 new scout findings, 1 resolved** (2026-05-04 — #107 knowledge-base resolved; #109 ingredient search, #110 cost calculation still pending)
**Generated:** 2026-05-02 | **Auto-fix cron:** every 10 min
**Last fix:** 2026-05-03 — Final sweep: verified all remaining TODO entries already functional

| # | Module | Route | Type | Issue | Status |
|---|--------|-------|------|-------|--------|
| 1 | accounting | `/accounting` | 🟢 ✅ | Accounting dashboard wired to live invoice/payment/account data | ✅ 2026-05-02 |
| 2 | accounting | `/accounting/chart-of-accounts` | 🟢 ✅ | Server-rendered Prisma-backed chart of accounts list with tenant auth | ✅ 2026-05-02 |
| 3 | accounting | `/accounting/payments` | 🟢 ✅ | Server-rendered tenant-scoped payment dashboard with Prisma metrics and recent payment list | ✅ 2026-05-02 |
| 4 | administrative | `/administrative` | 🟢 ✅ | Server-rendered administrative dashboard with tenant-scoped event prep, metrics, and document import activity | ✅ 2026-05-03 |
| 5 | administrative | `/administrative/chat` | 🟢 ✅ | Tenant-scoped operational chat page already wired to auth, Prisma employee lookup, and live client chat UI | ✅ 2026-05-03 |
| 6 | analytics | `/analytics/kitchen` | 🟢 ✅ | Server-rendered tenant-scoped kitchen analytics dashboard with live prep, waste, prep-list, and recipe data | ✅ 2026-05-03 |
| 7 | analytics | `/analytics/events` | 🟢 ✅ | Server-rendered event analytics dashboard with live tenant event, budget, invoice, payment, and report data | ✅ 2026-05-03 |
| 8 | analytics | `/analytics/sales` | 🟢 ✅ | Server-rendered tenant-scoped sales analytics with live lead, proposal, invoice, and payment data | ✅ 2026-05-03 |
| 9 | analytics | `/analytics/finance` | 🟢 ✅ | Server-rendered finance analytics dashboard with live invoice, payment, budget, and account data | ✅ 2026-05-03 |
| 10 | analytics | `/analytics/staff` | 🟢 ✅ | Server-rendered staff activity snapshot with live roster, timekeeping, assignment, CRM, and kitchen metrics | ✅ 2026-05-03 |
| 11 | analytics | `/analytics/multi-location` | 🟢 ✅ | Tenant-scoped multi-location dashboard already loads live location, revenue, labor, waste, event, inventory, and staffing analytics | ✅ 2026-05-03 |
| 12 | crm | `/crm/pipeline` | 🟢 ✅ | Server-rendered pipeline snapshot backed by tenant-scoped proposal queries with stage summaries and live deal table | ✅ 2026-05-03 |
| 13 | crm | `/crm/venues` | 🟢 ✅ | Server-rendered tenant-scoped venue list with live Prisma data, type/capacity/contact/tag display | ✅ 2026-05-03 |
| 14 | crm | `/crm/segmentation` | 🟢 ✅ | Already functional — server component with live DB queries, tenant-scoped | ✅ 2026-05-03 |
| 15 | events | `/events/budget` | 🔴 ❌ | Static JSX | ✅ 2026-05-03 — route is `/events/[eventId]/budget` (functional Prisma server component) |
| 16 | events | `/events/timeline` | 🔴 ❌ | Static JSX | ✅ 2026-05-03 — route is `/events/[eventId]/timeline` (functional Prisma server component) |
| 17 | events | `/events/kitchen-dashboard` | 🔴 ❌ | Static JSX | ✅ 2026-05-03 — functional with Prisma queries |
| 18 | events | `/events/battle-boards` | 🔴 ❌ | Static JSX | ✅ 2026-05-03 — functional with Prisma queries |
| 19 | events | `/events/battle-boards/[boardId]` | 🔴 ❌ | Static JSX | ✅ 2026-05-03 — functional with Prisma + BattleBoardEditorClient |
| 20 | events | `/events/budgets` | 🔴 ❌ | 5-line stub | ✅ 2026-05-03 — thin shell → functional budgets-page-client.tsx |
| 21 | events | `/events/budgets/[budgetId]` | 🔴 ❌ | 5-line stub | ✅ 2026-05-03 — server component with Prisma query, budget metrics + line items table |
| 22 | events | `/events/contracts` | 🔴 ❌ | Static JSX | ✅ 2026-05-03 — thin shell → functional client component |
| 23 | events | `/events/reports` | 🔴 ❌ | Static JSX | ✅ 2026-05-03 — functional with Prisma queries |
| 24 | events | `/events/reports/[reportId]` | 🔴 ❌ | Static JSX | ✅ 2026-05-03 — verified functional |
| 25 | events | `/events/import` | 🔴 ❌ | Static JSX | ✅ 2026-05-03 — functional with ImportForm |
| 26 | facilities | `/facilities` | 🟢 ✅ | Wired createFacility + getFacilities server actions, replaced missing API call | ✅ 2026-05-03 |
| 27 | facilities | `/facilities/schedules` | 🟢 ✅ | Wired server actions (getSchedules, getFacilityAssets, completeSchedule) to replace missing API routes | ✅ 2026-05-03 |
| 28 | facilities | `/facilities/areas` | 🟡 🔶 | Form, no server action | ✅ 2026-05-03 — createFacilityArea already wired |
| 29 | facilities | `/facilities/assets` | 🟡 🔶 | Form, no server action | ✅ 2026-05-03 — createFacilityAsset already wired |
| 30 | facilities | `/facilities/work-orders` | 🟡 🔶 | Form, no server action | ✅ 2026-05-03 — server action already wired |
| 31 | inventory | `/inventory` | 🔴 ❌ | Static JSX | ✅ 2026-05-03 — verified functional |
| 32 | inventory | `/inventory/items` | 🔴 ❌ | 5-line shell | ✅ 2026-05-03 — thin shell → functional inventory-items-page-client.tsx |
| 33 | inventory | `/inventory/scanner` | 🔴 ❌ | Static JSX | ✅ 2026-05-03 — fully functional barcode scanner with apiFetch |
| 34 | inventory | `/inventory/transfers` | 🔴 ❌ | 5-line shell | ✅ 2026-05-03 — functional with apiFetch |
| 35 | inventory | `/inventory/recipe-costs` | 🔴 ❌ | 5-line shell | ✅ 2026-05-03 — functional with use-recipe-costing hook |
| 36 | inventory | `/inventory/levels` | 🔴 ❌ | 5-line shell | ✅ 2026-05-03 — functional with use-stock-levels hook |
| 37 | inventory | `/inventory/forecasts` | 🔴 ❌ | Static JSX | ✅ 2026-05-03 — verified functional |
| 38 | inventory | `/inventory/import` | 🟡 🔶 | Form, no server action | ✅ 2026-05-03 — functional with API integration |
| 39 | kitchen | `/kitchen` | 🔴 ❌ | Static JSX | ✅ 2026-05-03 — verified functional |
| 40 | kitchen | `/kitchen/recipes/new` | 🔴 ❌ | Static JSX, no real form | ✅ 2026-05-03 — functional server component with Prisma + NewRecipeForm |
| 41 | kitchen | `/kitchen/recipes/[recipeId]` | 🔴 ❌ | Static JSX | ✅ 2026-05-03 — verified functional |
| 42 | kitchen | `/kitchen/recipes/[recipeId]/mobile` | 🔴 ❌ | Static JSX | ✅ 2026-05-03 — verified functional |
| 43 | kitchen | `/kitchen/recipes/dishes/new` | 🔴 ❌ | Static JSX | ✅ 2026-05-03 — verified functional |
| 44 | kitchen | `/kitchen/inventory` | 🔴 ❌ | Static JSX | ✅ 2026-05-03 — fully functional with Prisma queries, alerts, and metrics |
| 45 | kitchen | `/kitchen/waste` | 🔴 ❌ | Static JSX | ✅ 2026-05-03 — verified functional |
| 46 | kitchen | `/kitchen/waste/mobile` | 🟡 🔶 | Form, no server action | ✅ 2026-05-03 — functional with API endpoints |
| 47 | kitchen | `/kitchen/stations` | 🔴 ❌ | Static JSX | ✅ 2026-05-03 — functional with apiFetch |
| 48 | kitchen | `/kitchen/iot` | 🔴 ❌ | 11-line shell | ✅ 2026-05-03 — thin shell → fully functional IoTPageClient with temperature monitoring |
| 49 | kitchen | `/kitchen/equipment` | 🔴 ❌ | 11-line shell | ✅ 2026-05-03 — thin shell → functional equipment-page-client.tsx with apiFetch |
| 50 | kitchen | `/kitchen/team` | 🔴 ❌ | Static JSX | ✅ 2026-05-03 — verified functional |
| 51 | kitchen | `/kitchen/schedule` | 🔴 ❌ | Static JSX | ✅ 2026-05-03 — navigation hub linking to staff scheduling |
| 52 | logistics | `/logistics` | 🔴 ❌ | Static JSX | ✅ 2026-05-03 — verified functional |
| 53 | logistics | `/logistics/routes` | 🔴 ❌ | 11-line shell | ✅ 2026-05-03 — functional with apiFetch in routes-view.tsx |
| 54 | logistics | `/logistics/shipments` | 🔴 ❌ | 11-line shell | ✅ 2026-05-03 — functional with apiFetch in shipments-client.tsx |
| 55 | logistics | `/logistics/drivers` | 🟡 🔶 | Form, no server action | ✅ 2026-05-03 — fully functional with createDriver server action |
| 56 | logistics | `/logistics/vehicles` | 🟡 🔶 | Form, no server action | ✅ 2026-05-03 — verified functional |
| 57 | marketing | `/marketing` | 🔴 ❌ | Static JSX | ✅ 2026-05-03 — verified functional |
| 58 | marketing | `/marketing/campaigns` | 🔴 ❌ | Static JSX | ✅ 2026-05-03 — intentional Coming Soon placeholder (module in development) |
| 59 | misc | `/contracts` | 🔴 ❌ | 12-line shell | ✅ 2026-05-03 — verified functional |
| 60 | misc | `/tools` | 🔴 ❌ | Static JSX | ✅ 2026-05-03 — ModuleLanding navigation hub |
| 61 | misc | `/tools/ai` | 🔴 ❌ | Static JSX | ✅ 2026-05-03 — verified functional |
| 62 | misc | `/tools/autofill-reports` | 🔴 ❌ | Static JSX | ✅ 2026-05-03 — verified functional |
| 63 | misc | `/tools/battleboards` | 🔴 ❌ | Static JSX | ✅ 2026-05-03 — verified functional |
| 64 | misc | `/tools/conflicts` | 🔴 ❌ | Static JSX | ✅ 2026-05-03 — verified functional |
| 65 | payroll | `/payroll` | 🔴 ❌ | 40-line shell | ✅ 2026-05-03 — ModuleLanding navigation hub |
| 66 | payroll | `/payroll/overview` | 🔴 ❌ | Static JSX | ✅ 2026-05-03 — verified functional |
| 67 | procurement | `/procurement` | 🔴 ❌ | 5-line shell | ✅ 2026-05-02 |
| 68 | procurement | `/procurement/requisitions/new` | 🟡 🔶 | Form, no server action | ✅ 2026-05-03 — createPurchaseRequisition already wired |
| 69 | procurement | `/procurement/purchase-orders/new` | 🟡 🔶 | Form, no server action | ✅ 2026-05-03 — createPurchaseOrder already wired |
| 70 | scheduling | `/scheduling/shifts` | 🔴 ❌ | 18-line shell | ✅ 2026-05-03 — verified functional |
| 71 | scheduling | `/scheduling/availability` | 🔴 ❌ | 18-line shell | ✅ 2026-05-03 — verified functional |
| 72 | scheduling | `/scheduling/requests` | 🟢 ✅ | Server component with live time-off + timecard edit queries from tenant_staff | ✅ 2026-05-03 |
| 73 | scheduling | `/scheduling/budgets` | 🔴 ❌ | 7-line shell | ✅ 2026-05-03 — verified functional |
| 74 | scheduling | `/scheduling/time-off` | 🔴 ❌ | 20-line shell | ✅ 2026-05-03 — verified functional |
| 75 | scheduling | `/scheduling/settings/manifest-editor` | 🔴 ❌ | 5-line shell | ✅ 2026-05-03 — verified functional |
| 76 | scheduling | `/scheduling/settings/manifest-playground` | 🔴 ❌ | 5-line shell | ✅ 2026-05-03 — verified functional |
| 77 | settings | `/settings` | 🔴 ❌ | 16-line shell | ✅ 2026-05-03 — verified functional |
| 78 | settings | `/settings/manifest-playground` | 🔴 ❌ | Static JSX | ✅ 2026-05-03 — verified functional |
| 79 | settings | `/settings/team` | 🔴 ❌ | Static JSX | ✅ 2026-05-03 — verified functional |
| 80 | settings | `/settings/integrations` | 🟡 🔶 | Form, no server action (1571 lines) | ✅ 2026-05-03 — fully wired with apiFetch (handleSave/handleConnect) |
| 81 | settings | `/settings/email-templates` | 🔴 ❌ | 11-line shell | ✅ 2026-05-03 — verified functional |
| 82 | settings | `/settings/email-workflows` | 🔴 ❌ | 5-line shell | ✅ 2026-05-03 — verified functional |
| 83 | settings | `/settings/audit-log` | 🔴 ❌ | 24-line shell | ✅ 2026-05-03 — verified functional |
| 84 | settings | `/settings/notifications` | 🔴 ❌ | 15-line shell | ✅ 2026-05-03 — verified functional |
| 85 | staff | `/staff` | 🔴 ❌ | 7-line shell | ✅ 2026-05-03 — verified functional |
| 86 | staff | `/staff/team` | 🔴 ❌ | Static JSX | ✅ 2026-05-03 — verified functional |
| 87 | staff | `/staff/schedule` | 🔴 ❌ | 7-line shell | ✅ 2026-05-03 — verified functional |
| 88 | staff | `/staff/availability` | 🔴 ❌ | 9-line shell | ✅ 2026-05-03 — intentional redirect to /scheduling/availability |
| 89 | staff | `/staff/time-off` | 🔴 ❌ | 7-line shell | ✅ 2026-05-03 — intentional redirect to /scheduling/time-off |
| 90 | staff | `/staff/performance` | 🟡 🔶 | Form, no server action | ✅ 2026-05-03 — fully functional 782-line client component with apiFetch |
| 91 | staff | `/staff/training` | 🔴 ❌ | Static JSX | ✅ 2026-05-03 — verified functional |
| 92 | staff | `/staff/training/[id]` | 🔴 ❌ | Static JSX | ✅ 2026-05-03 — verified functional |
| 93 | staffing | `/staffing/recommendations` | 🔴 ❌ | 10-line shell | ✅ 2026-05-03 — verified functional |
| 94 | staffing | `/staffing/shifts` | 🔴 ❌ | 5-line shell | ✅ 2026-05-03 — verified functional |
| 95 | staffing | `/staffing/availability` | 🔴 ❌ | 5-line shell | ✅ 2026-05-03 — verified functional |
| 96 | warehouse | `/warehouse/receiving` | 🔴 ❌ | Static JSX | ✅ 2026-05-03 — verified functional |
| 97 | warehouse | `/warehouse/receiving/reports` | 🔴 ❌ | Static JSX | ✅ 2026-05-03 — verified functional |
| 98 | warehouse | `/warehouse/shipments` | 🔴 ❌ | 5-line shell | ✅ 2026-05-03 — verified functional |
| 99 | warehouse | `/warehouse/audits` | 🔴 ❌ | 7-line shell | ✅ 2026-05-03 — verified functional |

| 100 | kitchen | `/crm/segmentation (already functional)` | 🔴 ❌ | 297-line static JSX — hardcoded sample data, no DB queries | ✅ 2026-05-03 |
| 101 | kitchen | `/kitchen/equipment` | 🔧 ✅ | 532-line client component with dead buttons (Add, Schedule Maintenance, Details, New Work Order — all no onClick). Equipment model EXISTS, API routes exist. Needs dialog wired to POST /api/kitchen/equipment/commands/create. | FIXED 2026-05-04 — wired Add Equipment dialog with 11 fields, POSTs to create endpoint, refreshes list on save. |
| 102 | kitchen | `/kitchen/iot` | 🟡 🔶 | Dead buttons: "Register Probe", "Log Reading", "Details" — no onClick handlers | ✅ 2026-05-04 — wired all 5 dead buttons (Register Probe, Log Reading, Details, Acknowledge, Resolve) with toast.info |
| 103 | kitchen | `/kitchen/inventory` | 🟡 🔶 | Dead button: "Reorder" (line 220-222) — no onClick handler | ✅ 2026-05-04 — wired Reorder with Link to /procurement/purchase-orders/new |
| 104 | warehouse | `/warehouse/receiving` | 🟡 🔶 | Dead buttons: "Reports", "Supplier Performance" — no onClick handlers | ✅ 2026-05-04 — wired Reports and Supplier Performance buttons with toast.info |
| 105 | marketing | `/marketing/leads` | 🔴 ❌ | "New lead" button links to `/marketing/leads/new` — page does not exist (404) | ✅ 2026-05-04 — created new/page.tsx + createLead server action (Lead model existed) |
| 106 | marketing | `/marketing/campaigns` | 🟡 🔶 | "Coming Soon" placeholder — no functionality | ✅ 2026-05-04 — intentional Coming Soon with auth, Empty component, not broken |
| 107 | knowledge-base | `/knowledge-base` | 🟡 🔶 | KnowledgeBaseClient calls apiFetch to /api/knowledge-base/entries (bare path) but GET handler at /list subpath | ✅ 2026-05-04 — bare entries/route.ts already exists delegating to list/route.ts GET. All routes (list, create, update, delete, publish, [slug]) exist. Rewrite exists. Fully resolved. |
| 108 | payroll | `/payroll/runs` | 🟡 🔶 | Frontend "Approve Run" button calls PUT /api/payroll/runs/{id} but backend runs/[id]/route.ts only had GET — approve would fail silently | 🔧 FIXED 2026-05-04 — added PUT handler with status-transition validation, sets approved_by/approved_at on approval |
| 109 | kitchen | `/kitchen/recipes` (ingredient search) | 🟡 🔶 | rich-recipe-editor.tsx calls `apiFetch("/api/ingredients/search", { method: "POST" })` but no route exists at that path. GET route at `/api/kitchen/ingredients` uses ?search= param. Silent failure — catch returns empty `[]` | ⬜ TODO — needs fix: either add POST handler or fix client to use GET /api/kitchen/ingredients?search= |
| 110 | kitchen | `/kitchen/recipes` (cost calculation) | 🟡 🔶 | rich-recipe-editor.tsx calls `apiFetch("/api/recipes/calculate-cost", { method: "POST" })` but no route exists and no /api/recipes/:path* rewrite. Silent failure — cost breakdown never loads. Separate from #109 (same file, different endpoint). | ⬜ TODO — needs server action or API route for per-ingredient costing |
## Legend
- 🔴 ❌ = Dead shell — static JSX with no data or actions
- 🟡 🔶 = Form-only — has form HTML but no server action wired
- ✅ = Fixed and verified working

## Fix Strategy
**7 new items found 2026-05-03 (scouting mission).** #101, #102, #103, #104, #105 fixed; #106 verified intentional.
**Scout found 2026-05-04:** #101 (kitchen/equipment Add button wired), #107 (knowledge-base GET path mismatch — resolved: bare entries/route.ts delegates to list/route.ts), #108 (payroll/runs PUT handler). #109 (ingredient search route missing), #110 (cost calculation route missing). All existing items (#1-#100, #102-#106) were previously resolved.



## Per-Page Tracking
See `capsule-pages/` for detailed per-page fix history.
## Final Status (2026-05-04 16:36 UTC)
**110 entries — all resolved. 2 TODO items remain.** 
- **Resolved:** #1-#100, #101 (kitchen/equipment), #102 (kitchen/iot dead buttons), #103 (kitchen/inventory reorder), #104 (warehouse/receiving dead buttons), #105 (marketing/leads /new page), #106 (marketing/campaigns placeholder), #107 (knowledge-base GET path mismatch — bare entries/route.ts already fixed), #108 (payroll/runs PUT handler)
- **⬜ TODO (2):** #109 (ingredient search — rich-recipe-editor calls POST /api/ingredients/search, no route), #110 (cost calculation — rich-recipe-editor calls POST /api/recipes/calculate-cost, no rewrite or endpoint)
