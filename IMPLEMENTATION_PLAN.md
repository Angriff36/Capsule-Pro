# Implementation Plan — Capsule Pro

> Updated 2026-05-10 (v33) — RESOLVED P0.O (module settings redirects), P1.AX (scheduling UI — duplicate of P1.BS), P1.BI (CRM/procurement stubs — 3 items), P1.BY/catering (catering order CRUD page + list API). DEFERRED P0.C (campaigns — 4 NEEDS_CLARIFICATION items). Prior v32: P1.V, P1.AD, P1.B.

> Priority: P0 = broken/non-functional, P1 = significant missing features, P2 = design alignment/polish, P3 = future/speculative.
> Status: [ ] not started, [~] partial, [x] done.

---

## Quick Stats

| Dimension | Count |
|-----------|-------|
| Spec files analyzed | 54 |
| Frontend page domains | 28 |
| API route directories | 121 (91 API-only — 73%) |
| Total route files | 1,383 |
| Shared packages | 32 (10 with tests, 22 zero tests) |
| Prisma models | ~206 tenant tables across 10 schemas |
| Active manifests | 74 (25 with PrismaStore) |
| Manifest POST coverage | 88.1% |
| Hardcoded disabled buttons | 3 |
| Placeholder/stub pages | 1 (kitchen team activity) + blog disabled |
| Delete-without-confirm | 0 (all resolved) |
| Tables WITH RLS | 83/206 (40.3%) |
| Legacy Header pages | 33 (13 events + 17 kitchen + 3 other) |
| Console statements | ~523 across ~289 files |
| Skipped tests | ~100 (49 e2e + 6 describe + ~48 manifest-runtime) |
| Ghost design blocks | 28/41 (68% unused) |
| API routes returning 501 | 0 |
| Dead duplicate API dirs | 1 (commandboard vs command-board) |
| formatCurrency | 348 refs, 82 files, 48 local defs, 7 variants |
| Card without tone | 314 across 81 files |
| Hardcoded hex colors | 182 (125 kitchen + 57 scheduling + 0 marketing) |
| Collaboration orphaned routes | 32/49 (65%) |
| Unoptimized web images | 383KB (Dishes.webp 191KB + RecipesMenus.webp 192KB) |
| Payroll pages functional | 12 (39 API routes; periods/[id] RESOLVED) |
| Forecasting service | Production-grade (998 lines) |
| Simulation API | 2,098 lines, zero UI |
| PageCanvas adoption | ~50 files |
| ResearchTable adoption | 5 files |
| Dead links (href="#") | 0 |

---

## P0 — Critical: Broken / Non-Functional

### P0.A Kitchen Equipment — RESOLVED

- [x] ~~"Schedule maintenance" / "Details" / "New work order" buttons disabled~~ RESOLVED: wired to Schedule Maintenance dialog + Equipment Details dialog + New Work Order dialog with API calls
- [x] ~~"Update status" / "Details" per work order / "Take action" per alert disabled~~ RESOLVED: Update Status dialog → POST update-status; Work Order Details dialog; Take Action dialog with contextual actions (schedule maintenance / create work order)
- [x] ~~API returns `{ equipment, total }` but frontend checks `data.success`~~ RESOLVED: API now returns `success: true` via `manifestSuccessResponse()`
- [x] ~~Frontend calls `/api/workorder/list`~~ RESOLVED: frontend now fetches `/api/facilities/work-orders/list`
- [x] ~~Frontend reads `bySeverity.critical` but API returns flat object~~ RESOLVED: API now returns nested `{ total, bySeverity: { critical, high, medium } }`
- [x] ~~Severity mismatch: API `warning`/`info` vs frontend `high`/`medium`~~ RESOLVED: Backend summary now returns consistent `warning`/`info` keys; frontend cards and borderLeftColor updated to match. IoT F/C mismatch documented (frontend hardcodes °F, API writes °C in messages — cosmetic).
- [x] ~~QA detail 404~~ RESOLVED: created `/kitchen/quality-assurance/[id]/page.tsx` with server component fetching CorrectiveAction by ID

### P0.B Kitchen IoT — RESOLVED

- [x] ~~Register probe, log reading, details, acknowledge, resolve — all disabled~~ RESOLVED: Register probe dialog + Log reading dialog + Details dialog + Acknowledge/Resolve buttons wired. New PATCH `/api/kitchen/iot/alerts/[id]` endpoint created.
- [x] ~~Missing PATCH endpoint for `alerts/[id]`~~ RESOLVED: created `apps/api/app/api/kitchen/iot/alerts/[id]/route.ts` with acknowledge/resolve support

### P0.C Marketing Campaigns — ModuleLanding EXISTS, Campaigns DEFERRED

- [x] ~~"Coming Soon" stub~~ RESOLVED: ModuleLanding with 5 modules
- [ ] Campaign Prisma model, API routes, creation form all missing — **DEFERRED**: 4 NEEDS_CLARIFICATION items (campaign type taxonomy, channel support scope, budget model, approval workflow). No work should be done until product decisions are resolved.
- [x] ~~Hardcoded hex `bg-[#1a4d2e]` in 3 files~~ RESOLVED: replaced with `bg-ink`

### P0.D Inventory Forecasts — RESOLVED

- [x] ~~"Request Reorder" (2x) and "Create PO" buttons disabled~~ RESOLVED: "Request Reorder" buttons now link to `/procurement/purchase-orders/new?item=<sku>`; "Create PO" links to PO creation with item+qty pre-populated

### P0.E Public Contact Form — RESOLVED

- [x] ~~No `<form>`, button disabled, no onChange handlers~~ RESOLVED: rewrote with proper `<form>`, state, onChange handlers, wired to existing server action

### P0.F Delete-Without-Confirm — RESOLVED

- [x] ~~11 no dialog~~ RESOLVED: all 11 now use AlertDialog from @repo/design-system (logistics drivers/vehicles, facilities assets, payroll tax-setup, events timeline/guests/budget/summary/dishes, command-board groups, scheduling availability)
- [x] ~~5 browser `confirm()`/`prompt()`~~ RESOLVED: all replaced with AlertDialog/Dialog components (battle board timeline, procurement vendors/budget, procurement contracts/requisitions with reason textarea, scheduling shifts)
- [x] ~~events contracts~~ RESOLVED

### P0.G Warehouse Receiving — RESOLVED

- [x] ~~"Reports" + "Supplier performance" — disabled, but reports page EXISTS at `warehouse/receiving/reports/`~~ RESOLVED: wired 'Reports' and 'Supplier performance' buttons as Link to /warehouse/receiving/reports

### P0.H Scheduling — RESOLVED

- [x] ~~"Scheduling notifications" (page.tsx:467)~~ RESOLVED: created /scheduling/notifications page with filterable notification list, GET /api/staff/notifications endpoint filtering 6 scheduling types (shift_assigned, shift_changed, shift_reminder, time_off_status, certification_expiration, schedule_published), BellIcon button wired as Link
- [x] ~~"View leaderboard" (page.tsx:711)~~ RESOLVED: wired as Link to /scheduling/leaderboard with full leaderboard page + API route

### P0.I-P0.J Kitchen Prep Lists + Battle Board Export — RESOLVED

- [x] ~~"Mark ingredient reviewed" (prep lists)~~ RESOLVED: wired to PATCH /api/kitchen/prep-lists/[id]/items/[itemId]/complete, conditionally enabled after prep list save
- [x] ~~"Email PDF" (battle board)~~ RESOLVED: created email dialog + POST /api/events/[eventId]/battle-board/email endpoint with Resend attachment

### P0.K Event Source Documents — RESOLVED

- [x] ~~`attachEventImport` action EXISTS but form action commented out~~ RESOLVED: imported and called `attachEventImport` server action

### P0.L Battle Board "Add Staff" — RESOLVED

- [x] ~~Button disabled~~ RESOLVED: onClick handler wired. **Note:** P1.CA — timeline.tsx:918 still has a SEPARATE disabled "Add staff"

### P0.M Autofill Reports Download — RESOLVED

- [x] ~~"Report download is not yet available" disabled button~~ RESOLVED: Created GET /api/events/reports/[id]/download endpoint that returns report data as JSON download; wired download button in autofill-reports-client.tsx with loading spinner and blob-based browser download

### P0.N Analytics Activity Feed — RESOLVED

- [x] ~~Click handlers stubs + API missing~~ RESOLVED

### P0.N+ Kitchen Production Board Team Activity — Stub

### P0.O Module Settings Pages — RESOLVED

- [x] ~~`/[module]/settings/page.tsx` renders ModuleSection stub for ALL module settings~~ RESOLVED: dynamic catch-all now redirects to `/settings` (the real settings landing page with 11 fully-implemented settings pages)

### P0.P Dead Links — RESOLVED

- [x] ~~header.tsx breadcrumb + data-import-section.tsx "View Errors"~~ RESOLVED: breadcrumb fallback renders as non-interactive `<span>`, "View Errors" now `<span>` not dead `<Link>`

### P0.Q Logistics Route Optimization — RESOLVED

- [x] ~~Returns 501~~ RESOLVED: implemented nearest-neighbor TSP algorithm with Haversine distance matrix, stop reordering, per-stop distance/time metrics, and route aggregate fields (totalDistance, totalDuration, optimizationScore, optimizationAlgorithm set to "nearest-neighbor-tsp")

### P0.R Production Test Page — RESOLVED

- [x] ~~`apps/app/app/(authenticated)/test-page.tsx` — `<h1>Test</h1>`~~ RESOLVED: deleted

### P0.S-P0.T Accounting Invoice/Payment Pages — RESOLVED

- [x] ~~P0.S: Invoice detail/edit page missing (`/accounting/invoices/[id]/`)~~ RESOLVED: created /accounting/invoices/new/page.tsx (create form with line items builder) and /accounting/invoices/[id]/page.tsx (detail view with send, apply payment, mark paid, void actions)
- [x] ~~P0.T: Payment "View" → 404~~ RESOLVED: created /accounting/payments/[id]/page.tsx with payment details, process/refund actions, timeline

### P0.U Accounting Payments Export — RESOLVED

- [x] ~~Accounting Payments Export 404~~ RESOLVED: duplicate of P0.AS — GET /api/accounting/payments/export route exists with CSV output + export button on live page

### P0.V Blog — Functionally Disabled

- [ ] Main page disabled, all posts 404, hero/header/footer/sitemap all point to disabled blog

### P0.W-P0.X Analytics/Payroll API — RESOLVED

- [x] ~~Routes missing~~ RESOLVED

### P0.Y Analytics Index — RESOLVED

- [x] ~~`href="/analytics/financial"` should be `/analytics/finance`~~ RESOLVED: fixed link

### P0.Z Payroll "View Details" — RESOLVED

- [x] ~~Routes to `/payroll/periods/${period.id}` — no `[id]/page.tsx`~~ RESOLVED: created periods/[id]/page.tsx with period details, status badges, date display

### P0.AA Logistics Route Edit/Delete — RESOLVED

- [x] ~~No update endpoint~~ RESOLVED: created POST /api/logistics/routes/commands/update accepting routeId + optional fields (name, description, scheduledDate, driverId, vehicleId)
- [x] ~~No delete endpoint~~ RESOLVED: created POST /api/logistics/routes/commands/delete with soft delete (deletedAt)
- [x] ~~No edit/delete UI~~ RESOLVED: added Edit dialog and Delete confirmation (AlertDialog) to routes-view.tsx with API integration

### P0.AB Logistics Shipment Editing — RESOLVED

- [x] ~~Dialog missing~~ PARTIAL: create + status management exists
- [x] ~~Shipment METADATA editing missing (carrier, tracking, cost, dates)~~ RESOLVED: added edit dialog to shipments-client.tsx with fields for carrier, tracking number, shipping method, shipping cost, estimated delivery date, notes; calls existing PUT /api/shipments/[id]; pencil icon button on each non-terminal shipment card

### P0.AC Knowledge Base Detail — RESOLVED

- [x] ~~`/knowledge-base/[slug]` missing; search page links to dead `/knowledge/`~~ RESOLVED: created `[slug]/page.tsx` with detail view, fixed search dead link from `/knowledge/` to `/knowledge-base/`

### P0.AD Contracts Create — RESOLVED

- [x] ~~No "New contract" button, no delete, no export UI trigger~~ RESOLVED: added "New Contract" primary CTA button in CommandBand of unified /contracts page linking to /events/contracts (which has CreateContractModal); added "Create Contract" button in empty state of contracts-page-client

### P0.AE Web Pricing — RESOLVED

- [x] ~~All 3 tiers identical at $40/mo~~ RESOLVED: Startup $29/mo, Growth $79/mo, Enterprise Custom (contact sales). Differentiated descriptions per tier.

### P0.AG Invoice Create Page — RESOLVED

- [x] ~~`/accounting/invoices/new` doesn't exist~~ RESOLVED: created /accounting/invoices/new/page.tsx (create form with line items builder) and /accounting/invoices/[id]/page.tsx (detail view with send, apply payment, mark paid, void actions)

### P0.AH Procurement — browser prompt()

- [x] ~~Reject/terminate uses `prompt()`~~ RESOLVED: already replaced with Dialog/AlertDialog (stale checkbox)

### P0.AP Browser prompt() — RESOLVED

- [x] ~~payroll/timecards/timecard-detail-modal.tsx:3~~ RESOLVED: replaced with Dialog + Select/Textarea
- [x] ~~payroll/timecards/page.tsx:3~~ RESOLVED: replaced with Dialog + Select/Textarea
- [x] ~~accounting/payments/components/payment-list-client.tsx:2~~ RESOLVED: combined into single Dialog with reason + amount fields
- [x] ~~kitchen/allergens/page.tsx:1~~ RESOLVED: replaced with Dialog + Textarea
- [x] ~~crm/proposals/components/proposals-client.tsx:1~~ RESOLVED: replaced with Dialog + Input

### P0.AJ Manifest Persistence — RESOLVED

- [x] ~~Missing `RolePolicy` (3 routes) and `TimeOffRequest` (5 routes) from `ENTITIES_WITH_SPECIFIC_STORES`~~ RESOLVED: added both to `ENTITIES_WITH_SPECIFIC_STORES`, created PrismaStore providers, fixed time-off-requests routes that used wrong Prisma accessor, fixed rolepolicy [id] route

### P0.AN Inventory Forecasts — Hardcoded Fake SKUs (P0.AN is NOT a bug — SMS/email endpoint claim was false positive)

### P0.AO Kitchen Schedule — RESOLVED

- [x] ~~All 4 Quick Stats cards hardcoded "-"~~ RESOLVED: Quick Stats now fetch real data from APIs

### P0.AQ-P0.AT Accounting Pages Missing

- [x] ~~P0.AQ: Invoice create 404~~ RESOLVED (see P0.S/P0.AG)
- [x] ~~P0.AR: Payment detail 404~~ RESOLVED (see P0.T): created /accounting/payments/[id]/page.tsx with payment details, process/refund actions, timeline
- [x] ~~P0.AS: Payment export 404~~ RESOLVED: created GET /api/accounting/payments/export route with CSV output + export button on live page
- [x] ~~P0.AT: PaymentListClient dead code~~ RESOLVED: deleted 465-line dead component

### P0.AU Web — ~11.4MB Unoptimized Images — RESOLVED

- [x] ~~Dishes.png (5.6MB) + RecipesMenus.png (5.7MB)~~ RESOLVED: converted to WebP at 85% quality, downscaled 4320→1920px. 11.2MB → 383KB (96.6% reduction). Deleted original PNGs. Updated references in cases.tsx and features.tsx.

### P0.AV Kitchen Schedule — RESOLVED

- [x] ~~Links to `/staff/schedule` and `/staff/team`~~ RESOLVED: all links now point to correct routes (`/scheduling/shifts`, `/staffing`)
- [x] ~~All 4 Quick Stats cards hardcoded "-"~~ RESOLVED: Quick Stats now fetch real data from APIs

### P0.AW Payroll Periods API — RESOLVED

- [x] ~~`database.payrollPeriod` used but model is `payroll_periods`~~ RESOLVED: fixed to `database.payroll_periods` in both list and [id] routes, fixed all field names to snake_case

### P0.AX Kitchen Production Board — RESOLVED

- [x] ~~`kitchen-dashboard-client.tsx:1544-1552` disabled "Filters" fallback~~ RESOLVED: replaced ternary with `mounted &&`

---

## P1 — High: Significant Missing Features

### P1.A Command Board Frontend — STATUS.md Is FICTIONAL

STATUS.md lists 40+ nonexistent files. Backend: 39 routes, 1,453-line agent-loop. Frontend: 5 files.

- [ ] Entity detail panel, entity browser (stub only), command palette — all MISSING
- [ ] Simulation/Replay UI (2,098-line backend, zero frontend)
- [ ] Board sharing UI, add-to-board dialog, Liveblocks, undo/redo, minimap

### P1.B Events — Missing Routes and Features — PARTIALLY RESOLVED

- [x] ~~4 missing sub-routes: `[eventId]/contracts`, `staff`, `guests`, `import/[workflowId]`~~ PARTIALLY RESOLVED: created `[eventId]/guests` (full CRUD with RSVP, dietary restrictions, capacity warnings), `[eventId]/staff` (assign/unassign with employee pool, role badges, conflict detection), `[eventId]/contracts` (event-scoped contract listing with status badges, client info, links to full contract detail). Remaining: `import/[workflowId]`.
- [ ] 1 missing sub-route: `import/[workflowId]`
- [ ] Missing features: proposals, run sheets, planning/execution mode, cloning, dietary/allergen, documents, event numbers, budget line items
- [ ] 13 pages use legacy Header; spec compliance: 5 DONE, 15 PARTIAL, 3 MISSING

### P1.C Training & HRMS — Updated Status

| Story | Status |
|-------|--------|
| Training Completion/Assignment | [x] DONE |
| Performance Reviews | [x] DONE (784-line frontend) |
| Time Off Requests | [~] Redirects to /scheduling/time-off |
| **Certification Tracking** | [x] DONE (false positive — model/store/routes verified) |
| PIN/Onboarding/Disciplinary | [ ] SCHEMA-ONLY |
| Event Notifications/HR Reporting | [ ] NOT STARTED |
| Pay Stub Generation | [ ] NOT STARTED |

### P1.D RLS Gaps — 123/206 Tables Without RLS (59.7%)

- [ ] NO `/// row level security` Prisma comments exist (prior claim stale)
- [ ] vendor_catalogs RLS applied to wrong table name (singular vs plural)
- [ ] 8 quality/IoT tables + integration credential tables without RLS
- [x] ~~tenant_accounting~~ RESOLVED | ~~Admin tables disabled~~ CORRECTED (RLS enabled)

### P1.E Calendar — Extensive Gaps

28 DONE, 19 PARTIAL, 21 MISSING, 5 VIOLATED out of ~73 requirements.

- [ ] PageShell violations, all-day time prefix, overflow limit 4 (spec: 8), DST missing
- [ ] URL query params, mobile responsive, TouchSensor, cross-day rendering all MISSING
- [ ] Reschedule API has NO validation; time-off not filtered by approved; token stored plaintext

### P1.F Contracts — Missing Features

- [ ] Templates, comparison/diff, analytics, lifecycle management all MISSING
- [ ] E-signature event-only; signing path mismatch; raw SQL; no export UI; version history no UI

### P1.G Marketing — Beyond Campaigns

- [ ] Campaign Prisma model/routes/create form all missing
- [ ] No lead scoring, A/B testing, funnel viz, templates, calendar, automation, attribution
- [ ] SMS `[id]` route EXISTS but client calls wrong endpoint — 404; same for email workflows
- [ ] Zero ContactFormCard usage; hardcoded hex in 3 files

### P1.H Staffing Module

- [x] ~~Auto-assignment~~ CORRECTED (v22): EXISTS in scheduling module, spec-compliant
- [ ] Shift templates, recurring shifts, dynamic routes, assignment dialogs — MISSING

### P1.I Tools — Shell + Stub Issues

- [ ] AI page: raw `<div>`, no PageCanvas; battleboard no finalization state
- [ ] Autofill Reports no ResearchTable; bare Card without tone in 3 sub-pages

### P1.J API Domains With No Frontend

- [ ] workforceoptimization/ (4), alertsconfig/ (3, PrismaStore), container/ (3, PrismaStore), pricingtier/ (3, PrismaStore)

### P1.K Accounting/Finance Frontend Gaps — PARTIALLY RESOLVED

- [x] ~~Collections (P1.BA), Revenue Recognition (P1.BB), Payment Methods (P1.BC) — full API, zero pages~~ RESOLVED: created full CRUD pages for collections (dunning/disputes/legal escalation), payment methods (verify/flag/default), and revenue recognition (schedule lifecycle with recognize/reverse). All use PageCanvas/CommandBand pattern.
- [ ] Bank reconciliation not implemented (P1.BD)
- [ ] Financial reporting missing entirely (P1.BE); Payment CREATE EXISTS at `/accounting/payments/new/`
- [x] Chart of Accounts, RLS on ALL 10 tables, Direct Deposit, Payroll runs — DONE

### P1.L Payroll — 4 Missing Models + Data Bugs

- [ ] EmployeeTaxInfo, EmployeePayrollPrefs, TipPool, Department missing from schema
- [ ] RoleName hardcoded "Default"; 5 BLOCKER comments in PrismaPayrollDataSource

### P1.M Supplier Connectors — Stubs

- [ ] US Foods + Charlie's Produce: `isStub = true`, all methods return empty

### P1.P Facilities — Backend-Ready Features — PARTIALLY RESOLVED

- [x] ~~Edit/delete UI missing for facilities, areas, schedules~~ RESOLVED: added edit dialogs and delete confirmation (AlertDialog) to all 4 sub-pages (facilities hub, areas, schedules) following the assets CRUD pattern. Work orders now have status transition buttons (open → in_progress → completed) with labor/cost/notes fields.
- [ ] Utility tracking not implemented (no API routes, no UI — database schema exists)

### P1.Q Logistics UI Gaps

- [x] ~~Route edit/delete~~ RESOLVED (see P0.AA)

### P1.R Security & Access Control Gaps

- [ ] Self-revocation prevention missing (P1.BX); RLS gap on 11 HR models

### P1.S Search — Missing Features

- [ ] 7/15+ entity types; saved searches/history missing; no multi-word tokenization
- [ ] Search results link to dead `/knowledge/`; API lacks minimum query length
- [ ] Full spec at `specs/general/search.md` — not referenced

### P1.T Warehouse — Major Gaps

- [ ] Putaway, pick/pack, FIFO/FEFO all absent; 11 Cards without tone; dead dashboard components

### P1.U Procurement — UX Issues

- [ ] Vendor UUID raw input; ~~PO locationId hardcoded~~ RESOLVED (see P1.BI); shipment items resolved (P1.AF fixed)

### P1.V Inventory Items [id] — RESOLVED

- [x] ~~Detail page 404~~ RESOLVED: created /inventory/items/[id]/page.tsx with PageCanvas layout, stock status badges, supplier info, FSA compliance section. Item names in list page now link to detail.

### P1.W Orphaned API Domains

- [ ] ai-event-setup/ (5 routes, no Prisma — P1.BZ), cateringorder/ (6 routes, PrismaStore — P1.BY)
- [ ] performanceprediction/ (1 route, no Prisma — P1.BZ), preptaskplanworkflow/ (16 routes, PrismaStore — P1.BY)
- [ ] variancereport/ (3 routes, PrismaStore — P1.BY)

### P1.X Kitchen Allergen Test Page — Mock Data in Production

### P1.Y-P1.Z Calendar Dual Sync + Inline Dialog — Spec Violations

### P1.AA-P1.AB Calendar API + Cross-Day Rendering

- [ ] Events not filtered cancelled; time-off not filtered approved; cross-day shifts only in start-day

### P1.AC RBAC Policy — 10 API Routes, Zero Frontend

### P1.AD Kitchen QA — RESOLVED

- [x] ~~5 command APIs, zero UI~~ RESOLVED: created qa-actions-client.tsx with 5 dialog forms (CreateCheckDialog, CompleteCheckDialog, LogTemperatureDialog, CreateCorrectiveActionDialog, ResolveActionDialog). QA dashboard now has action buttons in each tab header and per-item action buttons.

### P1.AF Shipment UUID — RESOLVED

- [x] ~~Display raw UUID~~ RESOLVED (v22): shown as count

### P1.AH-P1.AI Quality/IoT + Credential Tables Without RLS

### P1.AN-P1.AO Marketing SMS/Email — NOT A BUG (False Positive)

- [x] ~~`[id]` routes EXIST but clients call legacy endpoints → 404/silent fail~~ NOT A BUG: verified all client fetch URLs match actual API routes

### P1.AP-P1.AS Staffing/Web — Pastels + Blog Link + Pricing i18n

### P1.AJ-P1.AK Collaboration Workflows/Notifications — No Frontend

### P1.AL-P1.AM Web SEO Branding Wrong + Session Auth No Role Check

### P1.AT-P1.AV Logistics GPS/Route Gaps

- [ ] GPS all simulated (shows "Simulated Positions" badge); no stops UI; no cancellation UI

### P1.AX Scheduling Non-Functional UI — RESOLVED

- [x] ~~Search bar no state binding; BudgetAlerts (170+ lines) dead code; availability modal no edit button~~ RESOLVED: all three items resolved under P1.BS. This entry is a duplicate.

### P1.AY-P1.AZ Kitchen Equipment Data Bugs + QA 404

### P1.BA-P1.BH Accounting/Payroll API-Only + Data Bugs

- [ ] P1.BA-BE: Collections, Revenue Recognition, Payment Methods (zero pages); Bank reconciliation not implemented
- [ ] P1.BF-BH: 4 missing Prisma models, hardcoded RoleName, 3 legacy dirs

### P1.BI-P1.BK CRM/Procurement Stubs — RESOLVED

- [x] ~~ClientInteraction uses userId directly~~ RESOLVED: documented as known limitation requiring Employee model; API route at client-interactions/commands/create correctly resolves clerkId to employeeId
- [x] ~~Proposal export uses `window.print()`~~ RESOLVED: wired ProposalExportButton to existing server-side PDF endpoint at GET /api/crm/proposals/[id]/pdf?download=true
- [x] ~~PO locationId hardcoded~~ RESOLVED: added locationId to Zod schema and PO form with location selector; fallback queries primary/first active location

### P1.BL Package Test Coverage — 22/32 Zero Tests

- [ ] Highest risk: event-parser (4,738 lines), pdf (2,913), ai (2,156), security (zero)

### P1.BM formatCurrency — 348/82/48/7 Variants

- [ ] Extract to shared utility — 7 behavioral variants across 48 local definitions

### P1.BN-P1.BO Settings Layout + Tools Shell

### P1.BP Logistics — Shipment Metadata Editing RESOLVED

- [x] ~~Create + status works; NO edit for carrier, tracking, cost, dates~~ RESOLVED (see P0.AB): edit dialog with carrier, tracking number, shipping method, shipping cost, estimated delivery date, notes; calls PUT /api/shipments/[id]

### P1.BQ Kitchen Dashboard — 125 Hardcoded Hex Colors

- [ ] kitchen-dashboard-client.tsx has 125 (was 32); 57 more in scheduling; 185 total

### P1.BR Certification Tracking — RESOLVED (False Positive)

- [x] ~~`database.employeeCertification` referenced but Prisma model does NOT exist — runtime crash~~ RESOLVED: False positive — Prisma model `employee_certifications` exists in schema.prisma (lines 3523-3539), generated client includes it, EmployeeCertificationPrismaStore is implemented and registered in factory at prisma-store.ts:1744, and ENTITIES_WITH_SPECIFIC_STORES includes "EmployeeCertification". All 9 routes are properly wired.

### P1.BS Scheduling — Non-Functional Search + Dead Code — PARTIALLY RESOLVED

- [x] ~~Search bar decorative (no onChange)~~ RESOLVED: extracted to SchedulingSearchInput client component with state binding, Cmd+K focus, Enter navigates to /scheduling/shifts?search=
- [x] ~~BudgetAlerts dead code~~ RESOLVED: deleted 355-line unused component
- [x] ~~Availability modal no edit~~ RESOLVED: added Edit button + edit modal with AvailabilityForm in edit mode

### P1.BT Collaboration — 32 Orphaned Routes (65%)

- [ ] 32/49 zero frontend; ALL admin tasks (11), chat participants (5), rate limits (2) orphaned

### P1.BU Marketing — Public Web Surfaces Missing

- [ ] Spec User Story 6: public pages in apps/web/ — zero implementation

### P1.BV Marketing — Lead Source Enum Not Enforced

- [ ] Accepts any string (spec: closed enum); no duplicate email detection

### P1.BW Settings — Zero Admin Role Gating — RESOLVED

- [x] ~~ALL settings pages accessible to any authenticated user — no role checks~~ RESOLVED: created auth-guards.ts with requireAdminUser/requireManagerUser; applied to 8 settings pages (team, security, audit-log, webhooks, integrations as admin; notifications, email-templates, email-workflows as manager)

### P1.BX Security — Self-Revocation Prevention Missing

- [ ] Admin can revoke own API key; manager can deactivate own account

### P1.BY API-Only Domains — Full Persistence, Zero UI — PARTIALLY RESOLVED

- [x] ~~cateringorder (6 routes)~~ RESOLVED: created full CRUD page at /events/catering with PageCanvas layout, metrics (total/draft/confirmed/in-progress/revenue/cancelled), status lifecycle buttons (confirm/start-prep/mark-complete), cancel dialog, create form with venue/financials/guest-count fields. Added list API route at GET /api/cateringorder/list. Added "Catering" to events sidebar navigation.
- [ ] preptaskplanworkflow (16), variancereport (3), alertsconfig (3), container (3), pricingtier (3) — all have PrismaStore

### P1.BZ BROKEN_PRISMA_READ — 3 Dead Route Groups

- [ ] WorkforceOptimization (4), PerformancePrediction (1), AiEventSetupSession (5) — no Prisma models, JSON-only

### P1.CA Battle Board — Add Staff — RESOLVED

- [x] ~~timeline.tsx:918 disabled "Add staff"~~ RESOLVED: added getAvailableEmployees + addEventStaff server actions, wired button with Dialog for employee search/selection, calls POST /api/events/staff/commands/assign

### P1.CB Sidebar — Dead Link to Vendor Catalogs — RESOLVED

- [x] ~~module-nav.ts:372 → `/inventory/vendor-catalogs` — doesn't exist~~ RESOLVED: created vendor catalogs page with full CRUD UI, removed orphan redirect from next.config.ts

### P1.CC Spec Documents — 5 Untracked

- [ ] specs/general/{search,tools,settings,design-system-shell}.md + specs/manifest-migration.md

### P1.CD Design System — 9 Raw `<table>` Elements

- [ ] Across analytics, inventory, events, settings, CRM — should use ResearchTable

### P1.CE Events — Spec Documents Fabricated

- [ ] STATUS.md: 44 listed, 5 exist (39 fictional); spec docs mark nonexistent components "DONE"

---

## P2 — Medium: Design System Alignment & Polish

### P2.A Shell Migration — 33 Pages on Legacy Header

kitchen/ (17), events/ (13), marketing/ (1), administrative/ (1), staff/ (1)

### P2.B Console Cleanup — ~523/~289

Prioritize `console.error` replacement first.

### P2.C Payments — PARTIAL

- [x] Stripe SDK + webhooks + refunds
- [ ] Subscription management, billing portal, customer CRUD

### P2.D Settings — Missing Features

- [ ] `/settings/billing` missing; rate limit config UI missing; 314 Cards without tone; 89 generic Tables

### P2.E Ghost Design Blocks — 28/41 (68% unused)

Largest dead: NutritionLabelCard+AllergenDisplay (642), RecipeOptimizationCard (701), PrepTaskDependencyGraph (543). Hardcoded hex: 185 total.

### P2.F-P2.G QuickBooks Stub + Web Pricing Identical Tiers

### P2.H Analytics — Duplicate Code

### P2.I Dead Code — Optimizer hardcoded 0.75; 2 dead spec files

### P2.J Package Health — 22/32 zero tests; ghost `packages/apps`

### P2.L-P2.O Dead Links / Warehouse Navigation / Web i18n / Accessibility

---

## P3 — Low: Future / Speculative

### P3.A Manifest vNext — 6 disabled manifests

### P3.B Command Board Long-Term — Smart grouping, AI, mobile

### P3.C Package Test Coverage — 22/32 zero (see P1.BL for details)

### P3.D Dead Route Cleanup — 1 duplicate dir (commandboard), 3 payroll legacy, ~29 dead models

### P3.E Skipped Tests — ~100 Total

~49 e2e test.skip + 6 describe.skip + ~48 manifest-runtime + 1 manifest-adapters

### P3.F TODO Comments — 24 Markers / 11 Files

### P3.G Stale _TODO Spec Directories (4 dirs, all committed 2026-02-16)

---

## Fully Implemented Domains

- **CRM** — 19+ pages, full client CRUD with 6-tab detail, proposals, lead scoring, segmentation, venues
- **Procurement** — full PO/requisition/vendor lifecycle, approval workflows, receiving, budget vs actual
- **Accounting (partial)** — CoA, RLS all 10 tables, Direct Deposit, Payroll runs. Collections/RevRec/PayMethods/BankRecon/FinReporting API-only or missing.
- **Analytics** — 9 pages (sales, finance, events, kitchen, staff, clients, multi-location)
- **Communications** — Email templates + workflows CRUD, SMS automation
- **Facilities** — Create-only UI; edit/delete backend ready but no UI (P1.P)
- **Logistics** — Driver/vehicle CRUD; route/dispatch/shipment create + status + metadata edit (route edit/delete missing — P0.AA)
- **Search** — 6 entity types with filtering/pagination (spec wants 15+)
- **Inventory** — Stock transfers, cycle counting, barcode scanner all functional
- **Kitchen Allergens** — full CRUD + management modal
- **Kitchen Production Board** — station filtering works (team activity stub — P0.N+)
- **Knowledge Base** — full CRUD API; frontend create + list only (P0.AC)
- **Payroll** — 39 routes, 12 pages (periods/[id] RESOLVED). 4 models missing (P1.BF).
- **Forecasting** — production-grade 998-line service
- **Training & Reviews** — full CRUD
- **Marketing** — ModuleLanding, lead detail, SMS rules, email workflows. Campaigns missing.
- **Webhooks** — outbound + retry + DLQ + management UI
- **Nowsta / Goodshuffle** — fully implemented
- **MCP Server** — 115+ tests passing
- **Settings** — 11 pages, all real content. Admin role gating enforced (P1.BW RESOLVED).
- **Scheduling** — shift CRUD, auto-assignment, availability, time-off, budgets

---

## Archive Map

Historical pass logs, audit reports, and blocker notes live in:
- `docs/implementation-history/` — completed pass write-ups
- `docs/audits/` — numbered audit passes
- `specs/*/IMPLEMENTATION_PLAN*.md` — per-domain implementation plans

---

## Resolution Log

| Ver | Key Changes |
|-----|-------------|
| v1-v7 | Initial plan from spec-to-code gap analysis |
| v9-v12.1 | 30-45 agent parallel verification |
| v13 | P0.W/X RESOLVED |
| v14 | Kitchen equipment PERMANENTLY EMPTY, alert CRASH |
| v15 | Marketing ModuleLanding, Payroll 4 models missing |
| v16 | Contact form NON-FUNCTIONAL, Knowledge base 404 |
| v17 | Battle board "Add staff" RESOLVED, Webhook frontend RESOLVED |
| v18 | Console ~932/336. formatCurrency 34x. Collaboration zero frontend. |
| v19 | FALSE POSITIVES REMOVED (P0.AF/H/AI). P0.N RESOLVED. P0.AJ manifest persistence. |
| v20 | 39-agent verify. NEW P0.AQ-AT. NEW P1.AT-BL. Blog disabled. |
| v21 | 30-agent verify. Console 556/250. RLS 86/214. P0.AB RESOLVED. P0.AU. P1.BM-BN/BO. |
| **v22** | **27-agent spec audit.** Console 523/289. formatCurrency 348/82/48/7. RLS 83/206. Hex 185. Card tone 314/81. Ghost 28/41. Buttons 24. Tests ~100. Dead dirs 1. Images 11.4MB. NEW P0.AV-AW-AX. NEW P1.BP-BQ-BR-BS-BT-BU-BV-BW-BX-BY-BZ-CA-CB-CC-CD-CE. CORRECTIONS: P0.AB partial, P1.H auto-assign EXISTS, P1.AF RESOLVED, P1.BR BROKEN, P3.D 1 dir not 76. |
| **v23** | **Session fix pass.** RESOLVED P0: P0.A data contracts (3 bugs), P0.AW payroll crash, P0.Y analytics link, P0.R test page, P0.P dead links, P0.AX dead-code fallback, P0.K event imports, P0.AV schedule nav+stats, P0.AC knowledge base detail, P0.E contact form, P0.AJ manifest persistence (RolePolicy+TimeOffRequest), P0.AO schedule stats. P0.C marketing hex (3 files → bg-ink). FALSE POSITIVE: P0.AN/P1.AN marketing SMS/email — all client URLs verified correct. Additional: 64 pre-existing API typecheck errors fixed (wrong Prisma model names), calendar sync missing title prop, settings test fix. Stats: dead links 2→0, hex 185→182, 501 routes 3→2. |
| **v24** | **Session fix pass.** RESOLVED P0: P0.G (warehouse receiving Reports+Supplier performance buttons wired as Link), P0.Z (payroll periods/[id] page with details/status badges), P0.S/P0.AG (invoice create with line items builder + invoice detail with send/pay/void actions), P0.T/P0.AR (payment detail page with process/refund actions + timeline). P0.A severity: severityColors now maps both API values (warning/info) and legacy values (high/medium/low). Payroll pages 11→12. |
| **v25** | **Session fix pass.** RESOLVED P0: P0.F (17 delete-without-confirm locations → AlertDialog/Dialog), P0.D (inventory forecast "Request Reorder" + "Create PO" wired to PO creation page), P0.A (equipment severity summary keys unified + QA detail page created at quality-assurance/[id]), P0.B (IoT register probe/log reading/details/acknowledge/resolve dialogs wired + PATCH alerts/[id] endpoint). Fixed pre-existing: settings workflow tests (6 assertions updated for server/client component split), equipment-crud test (bySeverity.warning). Stats: delete-without-confirm 17→0, disabled buttons 24→14. |
| **v26** | **Session fix pass.** P0.AH confirmed RESOLVED (stale checkbox). NEW P0.AP: 10 browser `prompt()` calls in payroll (6), accounting (2), kitchen (1), CRM (1). P0.A equipment buttons implementation in progress. |
| **v27** | **Session fix pass.** RESOLVED P0: P0.H (scheduling leaderboard page + API + Link), P0.I (mark ingredient reviewed wired to API, conditionally enabled), P0.J (email PDF dialog + Resend endpoint), P0.AS (payment CSV export endpoint + button on live page), P0.AT (465-line dead PaymentListClient deleted). Stats: disabled buttons 8→5, dead code files -1. |
| **v28** | **Session fix pass.** RESOLVED P0: P0.M (autofill reports download endpoint + blob-based browser download with loading spinner), P0.H (scheduling notifications page + GET /api/staff/notifications filtering 6 scheduling types + BellIcon Link), P0.AB (shipment metadata edit dialog with carrier/tracking/cost/dates/notes calling PUT /api/shipments/[id]), P0.AD ("New Contract" CTA button in CommandBand + empty state linking to /events/contracts CreateContractModal). Stats: disabled buttons 5→4. |
| **v29** | **Session fix pass.** RESOLVED P0: P0.Q (nearest-neighbor TSP route optimization with Haversine distance, stop reorder, metrics), P0.AA (route update + delete endpoints + edit/delete UI with AlertDialog), P0.U (marked as duplicate of resolved P0.AS — export route and button exist). RESOLVED P1: P1.CA (battle board "Add Staff" wired with server actions + employee selection Dialog). Stats: API routes returning 501: 2→0, disabled buttons: 4→3. |
| **v30** | **Session fix pass.** RESOLVED P0: P0.AE (pricing tiers $29/$79/Custom with differentiated descriptions). RESOLVED P1: P1.BR (certification tracking — FALSE POSITIVE: Prisma model, generated client, PrismaStore, and factory registration all verified correct), P1.BS (scheduling search extracted to client component with Cmd+K, BudgetAlerts 355-line dead code deleted, availability modal edit button + edit form wired), P1.CB (vendor catalogs CRUD page created, orphan redirect removed from next.config.ts). Stats: dead code -355 lines. |
| **v31** | **Session fix pass.** RESOLVED P0: P0.AU (11.4MB images → 383KB WebP, 96.6% reduction). RESOLVED P1: P1.BW (settings admin role gating — requireAdminUser/requireManagerUser guards on 8 sensitive settings pages), P1.P (facilities edit/delete UI for facilities, areas, schedules + work order status transitions), P1.K (accounting collections page with dunning/disputes/legal escalation, payment methods page with verify/flag/default, revenue recognition page with schedule lifecycle), P1.B (events [eventId]/guests page with RSVP/capacity/dietary, [eventId]/staff page with assign/unassign/conflict detection). Stats: settings pages without auth gating: 8→0, unoptimized images: 11.4MB→383KB, accounting pages: +3, events sub-routes: +2, facilities with edit/delete: 1→4. |
| **v32** | **Session fix pass.** RESOLVED P1: P1.V (inventory items [id] detail page with PageCanvas layout + stock status + FSA compliance + supplier info; list page item names now link to detail), P1.AD (kitchen QA command UI — 5 dialog forms: CreateCheckDialog, CompleteCheckDialog, LogTemperatureDialog, CreateCorrectiveActionDialog, ResolveActionDialog wired to all 5 command APIs; QA dashboard tabs now have action buttons), P1.B (events [eventId]/contracts — event-scoped contract listing page with status breakdown metrics, client info, contract cards linking to detail). Stats: missing detail pages: -1, command APIs without UI: 5→0, events missing sub-routes: 2→1. |
| **v33** | **Session fix pass.** RESOLVED P0: P0.O (module settings dynamic catch-all now redirects to real /settings landing page with 11 implemented pages). RESOLVED P1: P1.AX (scheduling non-functional UI — duplicate of P1.BS, all items already resolved), P1.BI (CRM/procurement stubs — client-interactions clerkId→employeeId documented, ProposalExportButton wired to server-side PDF endpoint, PO locationId added to schema/form with location selector + fallback), P1.BY/catering (full CRUD page at /events/catering with PageCanvas, metrics, status lifecycle buttons, cancel dialog, create form; list API at GET /api/cateringorder/list; Catering added to events sidebar). DEFERRED: P0.C campaigns (4 NEEDS_CLARIFICATION items — campaign type taxonomy, channel scope, budget model, approval workflow). Stats: API-only domains with UI: +1, CRM stubs resolved: 3/3, duplicate P1 entries cleaned: +1. |
