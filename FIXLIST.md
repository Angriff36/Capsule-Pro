# Capsule Pro Fix List

**Total broken: 99** (86 dead shells + 13 form-only)
**Generated:** 2026-05-02 | **Auto-fix cron:** every 10 min

| # | Module | Route | Type | Issue | Status |
|---|--------|-------|------|-------|--------|
| 1 | accounting | `/accounting` | 🟢 ✅ | Accounting dashboard wired to live invoice/payment/account data | ✅ 2026-05-02 |
| 2 | accounting | `/accounting/chart-of-accounts` | 🟢 ✅ | Server-rendered Prisma-backed chart of accounts list with tenant auth | ✅ 2026-05-02 |
| 3 | accounting | `/accounting/payments` | 🟢 ✅ | Server-rendered tenant-scoped payment dashboard with Prisma metrics and recent payment list | ✅ 2026-05-02 |
| 4 | administrative | `/administrative` | 🟢 ✅ | Server-rendered administrative dashboard with tenant-scoped event prep, metrics, and document import activity | ✅ 2026-05-03 |
| 5 | administrative | `/administrative/chat` | 🟢 ✅ | Tenant-scoped operational chat page already wired to auth, Prisma employee lookup, and live client chat UI | ✅ 2026-05-03 |
| 6 | analytics | `/analytics/kitchen` | 🟢 ✅ | Server-rendered tenant-scoped kitchen analytics dashboard with live prep, waste, prep-list, and recipe data | ✅ 2026-05-03 |
| 7 | analytics | `/analytics/events` | 🟢 ✅ | Server-rendered event analytics dashboard with live tenant event, budget, invoice, payment, and report data | ✅ 2026-05-03 |
| 8 | analytics | `/analytics/sales` | 🔴 ❌ | 5-line shell | TODO |
| 9 | analytics | `/analytics/finance` | 🔴 ❌ | 19-line shell | TODO |
| 10 | analytics | `/analytics/staff` | 🔴 ❌ | 9-line shell | TODO |
| 11 | analytics | `/analytics/multi-location` | 🔴 ❌ | Static JSX | TODO |
| 12 | crm | `/crm/pipeline` | 🔴 ❌ | Static shell — no query, no action | TODO |
| 13 | crm | `/crm/venues` | 🔴 ❌ | 11-line shell | TODO |
| 14 | crm | `/crm/segmentation` | 🔴 ❌ | Static JSX — no server actions | TODO |
| 15 | events | `/events/budget` | 🔴 ❌ | Static JSX | TODO |
| 16 | events | `/events/timeline` | 🔴 ❌ | Static JSX | TODO |
| 17 | events | `/events/kitchen-dashboard` | 🔴 ❌ | Static JSX | TODO |
| 18 | events | `/events/battle-boards` | 🔴 ❌ | Static JSX | TODO |
| 19 | events | `/events/battle-boards/[boardId]` | 🔴 ❌ | Static JSX | TODO |
| 20 | events | `/events/budgets` | 🔴 ❌ | 5-line stub | TODO |
| 21 | events | `/events/budgets/[budgetId]` | 🔴 ❌ | 5-line stub | TODO |
| 22 | events | `/events/contracts` | 🔴 ❌ | Static JSX | TODO |
| 23 | events | `/events/reports` | 🔴 ❌ | Static JSX | TODO |
| 24 | events | `/events/reports/[reportId]` | 🔴 ❌ | Static JSX | TODO |
| 25 | events | `/events/import` | 🔴 ❌ | Static JSX | TODO |
| 26 | facilities | `/facilities` | 🟡 🔶 | Form, no server action | TODO |
| 27 | facilities | `/facilities/schedules` | 🟡 🔶 | Form, no server action | TODO |
| 28 | facilities | `/facilities/areas` | 🟡 🔶 | Form, no server action | TODO |
| 29 | facilities | `/facilities/assets` | 🟡 🔶 | Form, no server action | TODO |
| 30 | facilities | `/facilities/work-orders` | 🟡 🔶 | Form, no server action | TODO |
| 31 | inventory | `/inventory` | 🔴 ❌ | Static JSX | TODO |
| 32 | inventory | `/inventory/items` | 🔴 ❌ | 5-line shell | TODO |
| 33 | inventory | `/inventory/scanner` | 🔴 ❌ | Static JSX | TODO |
| 34 | inventory | `/inventory/transfers` | 🔴 ❌ | 5-line shell | TODO |
| 35 | inventory | `/inventory/recipe-costs` | 🔴 ❌ | 5-line shell | TODO |
| 36 | inventory | `/inventory/levels` | 🔴 ❌ | 5-line shell | TODO |
| 37 | inventory | `/inventory/forecasts` | 🔴 ❌ | Static JSX | TODO |
| 38 | inventory | `/inventory/import` | 🟡 🔶 | Form, no server action | TODO |
| 39 | kitchen | `/kitchen` | 🔴 ❌ | Static JSX | TODO |
| 40 | kitchen | `/kitchen/recipes/new` | 🔴 ❌ | Static JSX, no real form | TODO |
| 41 | kitchen | `/kitchen/recipes/[recipeId]` | 🔴 ❌ | Static JSX | TODO |
| 42 | kitchen | `/kitchen/recipes/[recipeId]/mobile` | 🔴 ❌ | Static JSX | TODO |
| 43 | kitchen | `/kitchen/recipes/dishes/new` | 🔴 ❌ | Static JSX | TODO |
| 44 | kitchen | `/kitchen/inventory` | 🔴 ❌ | Static JSX | TODO |
| 45 | kitchen | `/kitchen/waste` | 🔴 ❌ | Static JSX | TODO |
| 46 | kitchen | `/kitchen/waste/mobile` | 🟡 🔶 | Form, no server action | TODO |
| 47 | kitchen | `/kitchen/stations` | 🔴 ❌ | Static JSX | TODO |
| 48 | kitchen | `/kitchen/iot` | 🔴 ❌ | 11-line shell | TODO |
| 49 | kitchen | `/kitchen/equipment` | 🔴 ❌ | 11-line shell | TODO |
| 50 | kitchen | `/kitchen/team` | 🔴 ❌ | Static JSX | TODO |
| 51 | kitchen | `/kitchen/schedule` | 🔴 ❌ | Static JSX | TODO |
| 52 | logistics | `/logistics` | 🔴 ❌ | Static JSX | TODO |
| 53 | logistics | `/logistics/routes` | 🔴 ❌ | 11-line shell | TODO |
| 54 | logistics | `/logistics/shipments` | 🔴 ❌ | 11-line shell | TODO |
| 55 | logistics | `/logistics/drivers` | 🟡 🔶 | Form, no server action | TODO |
| 56 | logistics | `/logistics/vehicles` | 🟡 🔶 | Form, no server action | TODO |
| 57 | marketing | `/marketing` | 🔴 ❌ | Static JSX | TODO |
| 58 | marketing | `/marketing/campaigns` | 🔴 ❌ | Static JSX | TODO |
| 59 | misc | `/contracts` | 🔴 ❌ | 12-line shell | TODO |
| 60 | misc | `/tools` | 🔴 ❌ | Static JSX | TODO |
| 61 | misc | `/tools/ai` | 🔴 ❌ | Static JSX | TODO |
| 62 | misc | `/tools/autofill-reports` | 🔴 ❌ | Static JSX | TODO |
| 63 | misc | `/tools/battleboards` | 🔴 ❌ | Static JSX | TODO |
| 64 | misc | `/tools/conflicts` | 🔴 ❌ | Static JSX | TODO |
| 65 | payroll | `/payroll` | 🔴 ❌ | 40-line shell | TODO |
| 66 | payroll | `/payroll/overview` | 🔴 ❌ | Static JSX | TODO |
| 67 | procurement | `/procurement` | 🔴 ❌ | 5-line shell | ✅ 2026-05-02 |
| 68 | procurement | `/procurement/requisitions/new` | 🟡 🔶 | Form, no server action | TODO |
| 69 | procurement | `/procurement/purchase-orders/new` | 🟡 🔶 | Form, no server action | TODO |
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
| 80 | settings | `/settings/integrations` | 🟡 🔶 | Form, no server action (1571 lines) | TODO |
| 81 | settings | `/settings/email-templates` | 🔴 ❌ | 11-line shell | TODO |
| 82 | settings | `/settings/email-workflows` | 🔴 ❌ | 5-line shell | TODO |
| 83 | settings | `/settings/audit-log` | 🔴 ❌ | 24-line shell | TODO |
| 84 | settings | `/settings/notifications` | 🔴 ❌ | 15-line shell | TODO |
| 85 | staff | `/staff` | 🔴 ❌ | 7-line shell | TODO |
| 86 | staff | `/staff/team` | 🔴 ❌ | Static JSX | TODO |
| 87 | staff | `/staff/schedule` | 🔴 ❌ | 7-line shell | TODO |
| 88 | staff | `/staff/availability` | 🔴 ❌ | 9-line shell | TODO |
| 89 | staff | `/staff/time-off` | 🔴 ❌ | 7-line shell | TODO |
| 90 | staff | `/staff/performance` | 🟡 🔶 | Form, no server action | TODO |
| 91 | staff | `/staff/training` | 🔴 ❌ | Static JSX | TODO |
| 92 | staff | `/staff/training/[id]` | 🔴 ❌ | Static JSX | TODO |
| 93 | staffing | `/staffing/recommendations` | 🔴 ❌ | 10-line shell | TODO |
| 94 | staffing | `/staffing/shifts` | 🔴 ❌ | 5-line shell | TODO |
| 95 | staffing | `/staffing/availability` | 🔴 ❌ | 5-line shell | TODO |
| 96 | warehouse | `/warehouse/receiving` | 🔴 ❌ | Static JSX | TODO |
| 97 | warehouse | `/warehouse/receiving/reports` | 🔴 ❌ | Static JSX | TODO |
| 98 | warehouse | `/warehouse/shipments` | 🔴 ❌ | 5-line shell | TODO |
| 99 | warehouse | `/warehouse/audits` | 🔴 ❌ | 7-line shell | TODO |

## Legend
- 🔴 ❌ = Dead shell — static JSX with no data or actions
- 🟡 🔶 = Form-only — has form HTML but no server action wired
- ✅ = Fixed and verified working

## Fix Strategy
1. **🔶 Form-only pages** (13) — Wire to existing server actions (quickest wins)
2. **❌ Thin shells** (~30) — Add server component with data query
3. **❌ Static JSX** (~50) — Full page implementation needed

## Per-Page Tracking
See `capsule-pages/` for detailed per-page fix history.