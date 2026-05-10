# Implementation Plan — Capsule Pro

> Updated 2026-05-10 (v23) — Session fix pass: 15 P0 items resolved (P0.A data contracts, P0.AW payroll crash, P0.Y analytics link, P0.R test page, P0.P dead links, P0.AX dead-code fallback, P0.K event imports, P0.AV schedule nav, P0.AC knowledge base 404, P0.E contact form, P0.AJ manifest persistence). P0.AN false positive. 64 pre-existing API typecheck errors fixed. Console ~523→~519 (4 marketing hex replaced). Hardcoded hex 185→182. Dead links 2→0. API routes returning 501→2.

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
| Hardcoded disabled buttons | 24 |
| Placeholder/stub pages | 1 (kitchen team activity) + blog disabled |
| Delete-without-confirm | 17 (1 resolved, 5 browser confirm, 11 no dialog) |
| Tables WITH RLS | 83/206 (40.3%) |
| Legacy Header pages | 33 (13 events + 17 kitchen + 3 other) |
| Console statements | ~523 across ~289 files |
| Skipped tests | ~100 (49 e2e + 6 describe + ~48 manifest-runtime) |
| Ghost design blocks | 28/41 (68% unused) |
| API routes returning 501 | 2 |
| Dead duplicate API dirs | 1 (commandboard vs command-board) |
| formatCurrency | 348 refs, 82 files, 48 local defs, 7 variants |
| Card without tone | 314 across 81 files |
| Hardcoded hex colors | 182 (125 kitchen + 57 scheduling + 0 marketing) |
| Collaboration orphaned routes | 32/49 (65%) |
| Unoptimized web images | ~11.4MB (Dishes.png 5.6MB + RecipesMenus.png 5.7MB) |
| Payroll pages functional | 11 (39 API routes; periods/[id] 404) |
| Forecasting service | Production-grade (998 lines) |
| Simulation API | 2,098 lines, zero UI |
| PageCanvas adoption | ~50 files |
| ResearchTable adoption | 5 files |
| Dead links (href="#") | 0 |

---

## P0 — Critical: Broken / Non-Functional

### P0.A Kitchen Equipment — 6 Disabled Buttons + DATA CONTRACT BUGS

- [ ] "Schedule maintenance" / "Details" / "New work order" buttons disabled
- [ ] "Update status" / "Details" per work order / "Take action" per alert disabled
- [x] ~~API returns `{ equipment, total }` but frontend checks `data.success`~~ RESOLVED: API now returns `success: true` via `manifestSuccessResponse()`
- [x] ~~Frontend calls `/api/workorder/list`~~ RESOLVED: frontend now fetches `/api/facilities/work-orders/list`
- [x] ~~Frontend reads `bySeverity.critical` but API returns flat object~~ RESOLVED: API now returns nested `{ total, bySeverity: { critical, high, medium } }`
- [ ] Severity mismatch: API `warning`/`info` vs frontend `high`/`medium`; IoT F/C mismatch
- [ ] QA detail 404: `/kitchen/quality-assurance/[id]` doesn't exist

### P0.B Kitchen IoT — 5 Disabled Buttons + Missing API

- [ ] Register probe, log reading, details, acknowledge, resolve — all disabled
- [ ] Missing PATCH endpoint for `alerts/[id]`

### P0.C Marketing Campaigns — ModuleLanding EXISTS, Campaigns Missing

- [x] ~~"Coming Soon" stub~~ RESOLVED: ModuleLanding with 5 modules
- [ ] Campaign Prisma model, API routes, creation form all missing
- [x] ~~Hardcoded hex `bg-[#1a4d2e]` in 3 files~~ RESOLVED: replaced with `bg-ink`

### P0.D Inventory Forecasts — 3 Disabled Buttons

- [ ] "Request Reorder" (2x) and "Create PO" buttons disabled

### P0.E Public Contact Form — RESOLVED

- [x] ~~No `<form>`, button disabled, no onChange handlers~~ RESOLVED: rewrote with proper `<form>`, state, onChange handlers, wired to existing server action

### P0.F Delete-Without-Confirm — 17 Locations

- [ ] 11 no dialog: logistics drivers/vehicles, facilities assets, payroll tax-setup, events timeline/guests/budget/summary/dishes, command-board groups, scheduling availability
- [ ] 5 browser `confirm()`/`prompt()`: events timeline, procurement vendors/budget/contracts/requisitions, scheduling shifts
- [x] ~~events contracts~~ RESOLVED

### P0.G Warehouse Receiving — 2 Buttons Not Wired

- [ ] "Reports" + "Supplier performance" — disabled, but reports page EXISTS at `warehouse/receiving/reports/`

### P0.H Scheduling — 2 Disabled Buttons CONFIRMED

- [ ] "Scheduling notifications" (page.tsx:467) and "View leaderboard" (page.tsx:711) — not implemented

### P0.I-P0.J Kitchen Prep Lists + Battle Board Export — 2 Disabled Buttons

- [ ] "Mark ingredient reviewed" (prep lists) + "Email PDF" (battle board) disabled

### P0.K Event Source Documents — RESOLVED

- [x] ~~`attachEventImport` action EXISTS but form action commented out~~ RESOLVED: imported and called `attachEventImport` server action

### P0.L Battle Board "Add Staff" — RESOLVED

- [x] ~~Button disabled~~ RESOLVED: onClick handler wired. **Note:** P1.CA — timeline.tsx:918 still has a SEPARATE disabled "Add staff"

### P0.M Autofill Reports Download — Disabled

### P0.N Analytics Activity Feed — RESOLVED

- [x] ~~Click handlers stubs + API missing~~ RESOLVED

### P0.N+ Kitchen Production Board Team Activity — Stub

### P0.O Module Settings Pages — Universal Stubs

- [ ] `/[module]/settings/page.tsx` renders ModuleSection stub for ALL module settings

### P0.P Dead Links — RESOLVED

- [x] ~~header.tsx breadcrumb + data-import-section.tsx "View Errors"~~ RESOLVED: breadcrumb fallback renders as non-interactive `<span>`, "View Errors" now `<span>` not dead `<Link>`

### P0.Q Logistics Route Optimization — Returns 501

### P0.R Production Test Page — RESOLVED

- [x] ~~`apps/app/app/(authenticated)/test-page.tsx` — `<h1>Test</h1>`~~ RESOLVED: deleted

### P0.S-P0.T Accounting Invoice/Payment Pages Missing

- [ ] P0.S: Invoice detail/edit page missing (`/accounting/invoices/[id]/`)
- [ ] P0.T: Payment "View" → 404

### P0.U Accounting Payments Export — 404

### P0.V Blog — Functionally Disabled

- [ ] Main page disabled, all posts 404, hero/header/footer/sitemap all point to disabled blog

### P0.W-P0.X Analytics/Payroll API — RESOLVED

- [x] ~~Routes missing~~ RESOLVED

### P0.Y Analytics Index — RESOLVED

- [x] ~~`href="/analytics/financial"` should be `/analytics/finance`~~ RESOLVED: fixed link

### P0.Z Payroll "View Details" → 404

- [ ] Routes to `/payroll/periods/${period.id}` — no `[id]/page.tsx`

### P0.AA Logistics Route Edit/Delete — NO Backend API

### P0.AB Logistics Shipment Editing — PARTIALLY RESOLVED

- [x] ~~Dialog missing~~ PARTIAL: create + status management exists
- [ ] Shipment METADATA editing missing (carrier, tracking, cost, dates) — see P1.BP

### P0.AC Knowledge Base Detail — RESOLVED

- [x] ~~`/knowledge-base/[slug]` missing; search page links to dead `/knowledge/`~~ RESOLVED: created `[slug]/page.tsx` with detail view, fixed search dead link from `/knowledge/` to `/knowledge-base/`

### P0.AD Contracts Create — Missing

- [ ] No "New contract" button, no delete, no export UI trigger

### P0.AE Web Pricing — All 3 Tiers Identical ($40/mo)

### P0.AG Invoice Create Page — 404

- [ ] `/accounting/invoices/new` doesn't exist

### P0.AH Procurement — browser prompt()

- [ ] Reject/terminate uses `prompt()` — should use AlertDialog

### P0.AJ Manifest Persistence — RESOLVED

- [x] ~~Missing `RolePolicy` (3 routes) and `TimeOffRequest` (5 routes) from `ENTITIES_WITH_SPECIFIC_STORES`~~ RESOLVED: added both to `ENTITIES_WITH_SPECIFIC_STORES`, created PrismaStore providers, fixed time-off-requests routes that used wrong Prisma accessor, fixed rolepolicy [id] route

### P0.AN Inventory Forecasts — Hardcoded Fake SKUs (P0.AN is NOT a bug — SMS/email endpoint claim was false positive)

### P0.AO Kitchen Schedule — RESOLVED

- [x] ~~All 4 Quick Stats cards hardcoded "-"~~ RESOLVED: Quick Stats now fetch real data from APIs

### P0.AQ-P0.AT Accounting Pages Missing

- [ ] P0.AQ: Invoice create 404 / P0.AR: Payment detail 404 / P0.AS: Payment export 404 / P0.AT: PaymentListClient dead code

### P0.AU Web — ~11.4MB Unoptimized Images

- [ ] Dishes.png (5.6MB) + RecipesMenus.png (5.7MB) — use Next.js Image or WebP/AVIF

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

### P1.B Events — Missing Routes and Features

- [ ] 4 missing sub-routes: `[eventId]/contracts`, `staff`, `guests`, `import/[workflowId]`
- [ ] Missing features: proposals, run sheets, planning/execution mode, cloning, dietary/allergen, documents, event numbers, budget line items
- [ ] 13 pages use legacy Header; spec compliance: 5 DONE, 15 PARTIAL, 3 MISSING

### P1.C Training & HRMS — Updated Status

| Story | Status |
|-------|--------|
| Training Completion/Assignment | [x] DONE |
| Performance Reviews | [x] DONE (784-line frontend) |
| Time Off Requests | [~] Redirects to /scheduling/time-off |
| **Certification Tracking** | [ ] **BROKEN** — API routes crash (no Prisma model) |
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

### P1.K Accounting/Finance Frontend Gaps

- [ ] Collections (P1.BA), Revenue Recognition (P1.BB), Payment Methods (P1.BC) — full API, zero pages
- [ ] Invoice detail 404, Payment detail 404, Bank reconciliation not implemented (P1.BD)
- [ ] Financial reporting missing entirely (P1.BE); Payment CREATE EXISTS at `/accounting/payments/new/`
- [x] Chart of Accounts, RLS on ALL 10 tables, Direct Deposit, Payroll runs — DONE

### P1.L Payroll — 4 Missing Models + Data Bugs

- [ ] EmployeeTaxInfo, EmployeePayrollPrefs, TipPool, Department missing from schema
- [ ] RoleName hardcoded "Default"; 5 BLOCKER comments in PrismaPayrollDataSource

### P1.M Supplier Connectors — Stubs

- [ ] US Foods + Charlie's Produce: `isStub = true`, all methods return empty

### P1.P Facilities — 7 Backend-Ready Features With No UI

- [ ] Edit/delete UI missing for facilities, areas, schedules, work orders; utility tracking not implemented

### P1.Q Logistics UI Gaps

- [ ] Route edit/delete — NO backend API (P0.AA); shipment metadata editing missing (P1.BP)

### P1.R Security & Access Control Gaps

- [ ] Self-revocation prevention missing (P1.BX); RLS gap on 11 HR models
- [ ] **ZERO admin role gating** in ALL settings pages (P1.BW)

### P1.S Search — Missing Features

- [ ] 7/15+ entity types; saved searches/history missing; no multi-word tokenization
- [ ] Search results link to dead `/knowledge/`; API lacks minimum query length
- [ ] Full spec at `specs/general/search.md` — not referenced

### P1.T Warehouse — Major Gaps

- [ ] Putaway, pick/pack, FIFO/FEFO all absent; 11 Cards without tone; dead dashboard components

### P1.U Procurement — UX Issues

- [ ] Vendor UUID raw input; PO locationId hardcoded; shipment items resolved (P1.AF fixed)

### P1.V Inventory Items [id] — 404

### P1.W Orphaned API Domains

- [ ] ai-event-setup/ (5 routes, no Prisma — P1.BZ), cateringorder/ (6 routes, PrismaStore — P1.BY)
- [ ] performanceprediction/ (1 route, no Prisma — P1.BZ), preptaskplanworkflow/ (16 routes, PrismaStore — P1.BY)
- [ ] variancereport/ (3 routes, PrismaStore — P1.BY)

### P1.X Kitchen Allergen Test Page — Mock Data in Production

### P1.Y-P1.Z Calendar Dual Sync + Inline Dialog — Spec Violations

### P1.AA-P1.AB Calendar API + Cross-Day Rendering

- [ ] Events not filtered cancelled; time-off not filtered approved; cross-day shifts only in start-day

### P1.AC RBAC Policy — 10 API Routes, Zero Frontend

### P1.AD Kitchen QA — 5 Command APIs, Zero UI

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

### P1.AX Scheduling Non-Functional UI

- [ ] Search bar no state binding; BudgetAlerts (170+ lines) dead code; availability modal no edit button

### P1.AY-P1.AZ Kitchen Equipment Data Bugs + QA 404

### P1.BA-P1.BH Accounting/Payroll API-Only + Data Bugs

- [ ] P1.BA-BE: Collections, Revenue Recognition, Payment Methods (zero pages); Bank reconciliation not implemented
- [ ] P1.BF-BH: 4 missing Prisma models, hardcoded RoleName, 3 legacy dirs

### P1.BI-P1.BK CRM/Procurement Stubs

- [ ] ClientInteraction uses userId directly; proposal export uses `window.print()`; PO locationId hardcoded

### P1.BL Package Test Coverage — 22/32 Zero Tests

- [ ] Highest risk: event-parser (4,738 lines), pdf (2,913), ai (2,156), security (zero)

### P1.BM formatCurrency — 348/82/48/7 Variants

- [ ] Extract to shared utility — 7 behavioral variants across 48 local definitions

### P1.BN-P1.BO Settings Layout + Tools Shell

### P1.BP Logistics — Shipment Metadata Editing Missing

- [ ] Create + status works; NO edit for carrier, tracking, cost, dates

### P1.BQ Kitchen Dashboard — 125 Hardcoded Hex Colors

- [ ] kitchen-dashboard-client.tsx has 125 (was 32); 57 more in scheduling; 185 total

### P1.BR Certification Tracking — API Routes Will Crash

- [ ] `database.employeeCertification` referenced but Prisma model does NOT exist — runtime crash

### P1.BS Scheduling — Non-Functional Search + Dead Code

- [ ] Search bar decorative (no onChange); BudgetAlerts dead code; availability modal no edit

### P1.BT Collaboration — 32 Orphaned Routes (65%)

- [ ] 32/49 zero frontend; ALL admin tasks (11), chat participants (5), rate limits (2) orphaned

### P1.BU Marketing — Public Web Surfaces Missing

- [ ] Spec User Story 6: public pages in apps/web/ — zero implementation

### P1.BV Marketing — Lead Source Enum Not Enforced

- [ ] Accepts any string (spec: closed enum); no duplicate email detection

### P1.BW Settings — Zero Admin Role Gating

- [ ] ALL settings pages accessible to any authenticated user — no role checks

### P1.BX Security — Self-Revocation Prevention Missing

- [ ] Admin can revoke own API key; manager can deactivate own account

### P1.BY API-Only Domains — Full Persistence, Zero UI

- [ ] cateringorder (6 routes), preptaskplanworkflow (16), variancereport (3), alertsconfig (3), container (3), pricingtier (3) — all have PrismaStore

### P1.BZ BROKEN_PRISMA_READ — 3 Dead Route Groups

- [ ] WorkforceOptimization (4), PerformancePrediction (1), AiEventSetupSession (5) — no Prisma models, JSON-only

### P1.CA Battle Board — Timeline "Add Staff" Still Disabled

- [ ] timeline.tsx:918 — separate from P0.L which was resolved

### P1.CB Sidebar — Dead Link to Vendor Catalogs

- [ ] module-nav.ts:372 → `/inventory/vendor-catalogs` — doesn't exist

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
- **Logistics** — Driver/vehicle CRUD; route/dispatch/shipment create + status (route edit/delete missing — P0.AA; metadata edit missing — P1.BP)
- **Search** — 6 entity types with filtering/pagination (spec wants 15+)
- **Inventory** — Stock transfers, cycle counting, barcode scanner all functional
- **Kitchen Allergens** — full CRUD + management modal
- **Kitchen Production Board** — station filtering works (team activity stub — P0.N+)
- **Knowledge Base** — full CRUD API; frontend create + list only (P0.AC)
- **Payroll** — 39 routes, 11 pages. Gap: periods/[id]. 4 models missing (P1.BF).
- **Forecasting** — production-grade 998-line service
- **Training & Reviews** — full CRUD
- **Marketing** — ModuleLanding, lead detail, SMS rules, email workflows. Campaigns missing.
- **Webhooks** — outbound + retry + DLQ + management UI
- **Nowsta / Goodshuffle** — fully implemented
- **MCP Server** — 115+ tests passing
- **Settings** — 11 pages, all real content. WARNING: zero admin gating (P1.BW).
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
