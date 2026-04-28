# Implementation Plan Archive — Categories 1–5 (2026-04-24 audit)

The 2026-04-24 audit grouped findings into five categories: claimed-done-but-broken, partially implemented, not started, post-`b8c31eef` new features, and verified done. Captured here verbatim. Use as a baseline; do not edit retroactively.

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
- **Actual:** Core routes exist and function. Duplicate `softDelete/` directories in `pricing-tiers`, `bulk-order-rules`, and the entire stale `supplier-catalogs/` tree (mirroring the canonical `vendor-catalogs/`) were **REMOVED 2026-04-26** (see Blocker 4).
- **Resolution:** ✅ Resolved. Single canonical surface remains.

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
| Invoices | DONE | Email dispatch wired (Resend, best-effort, fail-open); `InvoiceTemplate` in `packages/email/templates/invoice.tsx`; 11-test suite at `apps/api/__tests__/accounting/invoice-send-email.test.ts` |
| Payments | PARTIAL | Gateway stubbed at `apps/api/app/api/accounting/payments/[id]/route.ts:90-95`; UI form stubbed in `PaymentFormClient` lines 112-123 |
| Payment Methods | FUNCTIONAL (but schema-mismatched) | `[id]` PUT/DELETE implement full DB logic at `apps/api/app/api/accounting/payment-methods/[id]/route.ts:74-148` (PUT) and `:154-198` (DELETE soft-delete). File header acknowledges some referenced fields don't exist on the model. Prior plan's "stub" claim was incorrect. |
| Collections | DONE | RouteContext fixed 2026-04-26 — `params` now async-typed and awaited in both GET/PATCH (see Blocker 5) |
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
| Drivers | PARTIAL | Raw SQL; **no `Driver` Prisma model**. Update route's broken vehicle-id ternary fixed 2026-04-26 — now uses `Prisma.sql` conditional fragments via `buildVehicleAssignment()` helper (see Blocker 6) |
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
