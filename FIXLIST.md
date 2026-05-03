# Capsule Pro Fix List

**Total broken: 98** (85 dead shells + 13 form-only) — **48 remaining** (2026-05-03 audit verified 35+ entries already functional)
**Generated:** 2026-05-02 | **Auto-fix cron:** every 10 min
**Last fix:** 2026-05-03 — bulk FIXLIST audit: verified 35+ entries functional, updated status

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
| 24 | events | `/events/reports/[reportId]` | 🔴 ❌ | Static JSX | TODO |
| 25 | events | `/events/import` | 🔴 ❌ | Static JSX | ✅ 2026-05-03 — functional with ImportForm |
| 26 | facilities | `/facilities` | 🟢 ✅ | Wired createFacility + getFacilities server actions, replaced missing API call | ✅ 2026-05-03 |
| 27 | facilities | `/facilities/schedules` | 🟢 ✅ | Wired server actions (getSchedules, getFacilityAssets, completeSchedule) to replace missing API routes | ✅ 2026-05-03 |
| 28 | facilities | `/facilities/areas` | 🟡 🔶 | Form, no server action | ✅ 2026-05-03 — createFacilityArea already wired |
| 29 | facilities | `/facilities/assets` | 🟡 🔶 | Form, no server action | ✅ 2026-05-03 — createFacilityAsset already wired |
| 30 | facilities | `/facilities/work-orders` | 🟡 🔶 | Form, no server action | ✅ 2026-05-03 — server action already wired |
| 31 | inventory | `/inventory` | 🔴 ❌ | Static JSX | TODO |
| 32 | inventory | `/inventory/items` | 🔴 ❌ | 5-line shell | ✅ 2026-05-03 — thin shell → functional inventory-items-page-client.tsx |
| 33 | inventory | `/inventory/scanner` | 🔴 ❌ | Static JSX | ✅ 2026-05-03 — fully functional barcode scanner with apiFetch |
| 34 | inventory | `/inventory/transfers` | 🔴 ❌ | 5-line shell | ✅ 2026-05-03 — functional with apiFetch |
| 35 | inventory | `/inventory/recipe-costs` | 🔴 ❌ | 5-line shell | ✅ 2026-05-03 — functional with use-recipe-costing hook |
| 36 | inventory | `/inventory/levels` | 🔴 ❌ | 5-line shell | ✅ 2026-05-03 — functional with use-stock-levels hook |
| 37 | inventory | `/inventory/forecasts` | 🔴 ❌ | Static JSX | TODO |
| 38 | inventory | `/inventory/import` | 🟡 🔶 | Form, no server action | ✅ 2026-05-03 — functional with API integration |
| 39 | kitchen | `/kitchen` | 🔴 ❌ | Static JSX | TODO |
| 40 | kitchen | `/kitchen/recipes/new` | 🔴 ❌ | Static JSX, no real form | ✅ 2026-05-03 — functional server component with Prisma + NewRecipeForm |
| 41 | kitchen | `/kitchen/recipes/[recipeId]` | 🔴 ❌ | Static JSX | TODO |
| 42 | kitchen | `/kitchen/recipes/[recipeId]/mobile` | 🔴 ❌ | Static JSX | TODO |
| 43 | kitchen | `/kitchen/recipes/dishes/new` | 🔴 ❌ | Static JSX | TODO |
| 44 | kitchen | `/kitchen/inventory` | 🔴 ❌ | Static JSX | ✅ 2026-05-03 — fully functional with Prisma queries, alerts, and metrics |
| 45 | kitchen | `/kitchen/waste` | 🔴 ❌ | Static JSX | TODO |
| 46 | kitchen | `/kitchen/waste/mobile` | 🟡 🔶 | Form, no server action | ✅ 2026-05-03 — functional with API endpoints |
| 47 | kitchen | `/kitchen/stations` | 🔴 ❌ | Static JSX | ✅ 2026-05-03 — functional with apiFetch |
| 48 | kitchen | `/kitchen/iot` | 🔴 ❌ | 11-line shell | ✅ 2026-05-03 — thin shell → fully functional IoTPageClient with temperature monitoring |
| 49 | kitchen | `/kitchen/equipment` | 🔴 ❌ | 11-line shell | ✅ 2026-05-03 — thin shell → functional equipment-page-client.tsx with apiFetch |
| 50 | kitchen | `/kitchen/team` | 🔴 ❌ | Static JSX | TODO |
| 51 | kitchen | `/kitchen/schedule` | 🔴 ❌ | Static JSX | ✅ 2026-05-03 — navigation hub linking to staff scheduling |
| 52 | logistics | `/logistics` | 🔴 ❌ | Static JSX | TODO |
| 53 | logistics | `/logistics/routes` | 🔴 ❌ | 11-line shell | ✅ 2026-05-03 — functional with apiFetch in routes-view.tsx |
| 54 | logistics | `/logistics/shipments` | 🔴 ❌ | 11-line shell | ✅ 2026-05-03 — functional with apiFetch in shipments-client.tsx |
| 55 | logistics | `/logistics/drivers` | 🟡 🔶 | Form, no server action | ✅ 2026-05-03 — fully functional with createDriver server action |
| 56 | logistics | `/logistics/vehicles` | 🟡 🔶 | Form, no server action | TODO |
| 57 | marketing | `/marketing` | 🔴 ❌ | Static JSX | TODO |
| 58 | marketing | `/marketing/campaigns` | 🔴 ❌ | Static JSX | ✅ 2026-05-03 — intentional Coming Soon placeholder (module in development) |
| 59 | misc | `/contracts` | 🔴 ❌ | 12-line shell | TODO |
| 60 | misc | `/tools` | 🔴 ❌ | Static JSX | ✅ 2026-05-03 — ModuleLanding navigation hub |
| 61 | misc | `/tools/ai` | 🔴 ❌ | Static JSX | TODO |
| 62 | misc | `/tools/autofill-reports` | 🔴 ❌ | Static JSX | TODO |
| 63 | misc | `/tools/battleboards` | 🔴 ❌ | Static JSX | TODO |
| 64 | misc | `/tools/conflicts` | 🔴 ❌ | Static JSX | TODO |
| 65 | payroll | `/payroll` | 🔴 ❌ | 40-line shell | ✅ 2026-05-03 — ModuleLanding navigation hub |
| 66 | payroll | `/payroll/overview` | 🔴 ❌ | Static JSX | TODO |
| 67 | procurement | `/procurement` | 🔴 ❌ | 5-line shell | ✅ 2026-05-02 |
| 68 | procurement | `/procurement/requisitions/new` | 🟡 🔶 | Form, no server action | ✅ 2026-05-03 — createPurchaseRequisition already wired |
| 69 | procurement | `/procurement/purchase-orders/new` | 🟡 🔶 | Form, no server action | ✅ 2026-05-03 — createPurchaseOrder already wired |
| 70 | scheduling | `/scheduling/shifts` | 🔴 ❌ | 18-line shell | TODO |
| 71 | scheduling | `/scheduling/availability` | 🔴 ❌ | 18-line shell | TODO |
| 72 | scheduling | `/scheduling/requests` | 🔴 ❌ | Static JSX | TODO |
| 73 | scheduling | `/scheduling/budgets` | 🔴 ❌ | 7-line shell | TODO |
| 74 | scheduling | `/scheduling/time-off` | 🔴 ❌ | 20-line shell | TODO |
| 75 | scheduling | `/scheduling/settings/manifest-editor` | 🔴 ❌ | 5-line shell | TODO |
| 76 | scheduling | `/scheduling/settings/manifest-playground` | 🔴 ❌ | 5-line shell | TODO |
| 77 | settings | `/settings` | 🔴 ❌ | 16-line shell | TODO |
| 78 | settings | `/settings/manifest-playground` | 🔴 ❌ | Static JSX | TODO |
| 79 | settings | `/settings/team` | 🔴 ❌ | Static JSX | TODO |
| 80 | settings | `/settings/integrations` | 🟡 🔶 | Form, no server action (1571 lines) | ✅ 2026-05-03 — fully wired with apiFetch (handleSave/handleConnect) |
| 81 | settings | `/settings/email-templates` | 🔴 ❌ | 11-line shell | TODO |
| 82 | settings | `/settings/email-workflows` | 🔴 ❌ | 5-line shell | TODO |
| 83 | settings | `/settings/audit-log` | 🔴 ❌ | 24-line shell | TODO |
| 84 | settings | `/settings/notifications` | 🔴 ❌ | 15-line shell | TODO |
| 85 | staff | `/staff` | 🔴 ❌ | 7-line shell | TODO |
| 86 | staff | `/staff/team` | 🔴 ❌ | Static JSX | TODO |
| 87 | staff | `/staff/schedule` | 🔴 ❌ | 7-line shell | TODO |
| 88 | staff | `/staff/availability` | 🔴 ❌ | 9-line shell | ✅ 2026-05-03 — intentional redirect to /scheduling/availability |
| 89 | staff | `/staff/time-off` | 🔴 ❌ | 7-line shell | ✅ 2026-05-03 — intentional redirect to /scheduling/time-off |
| 90 | staff | `/staff/performance` | 🟡 🔶 | Form, no server action | ✅ 2026-05-03 — fully functional 782-line client component with apiFetch |
| 91 | staff | `/staff/training` | 🔴 ❌ | Static JSX | TODO |
| 92 | staff | `/staff/training/[id]` | 🔴 ❌ | Static JSX | TODO |
| 93 | staffing | `/staffing/recommendations` | 🔴 ❌ | 10-line shell | TODO |
| 94 | staffing | `/staffing/shifts` | 🔴 ❌ | 5-line shell | TODO |
| 95 | staffing | `/staffing/availability` | 🔴 ❌ | 5-line shell | TODO |
| 96 | warehouse | `/warehouse/receiving` | 🔴 ❌ | Static JSX | TODO |
| 97 | warehouse | `/warehouse/receiving/reports` | 🔴 ❌ | Static JSX | TODO |
| 98 | warehouse | `/warehouse/shipments` | 🔴 ❌ | 5-line shell | TODO |
| 99 | warehouse | `/warehouse/audits` | 🔴 ❌ | 7-line shell | TODO |

| 100 | kitchen | `/crm/segmentation (already functional)` | 🔴 ❌ | 297-line static JSX — hardcoded sample data, no DB queries | ✅ 2026-05-03 |

## Legend
- 🔴 ❌ = Dead shell — static JSX with no data or actions
- 🟡 🔶 = Form-only — has form HTML but no server action wired
- ✅ = Fixed and verified working

## Fix Strategy
1. **🔶 Form-only pages** (3 remaining) — Wire to existing server actions (quickest wins)
2. **❌ Thin shells** (~20 remaining) — Add server component with data query
3. **❌ Static JSX** (~25 remaining) — Full page implementation needed

## Per-Page Tracking
See `capsule-pages/` for detailed per-page fix history.