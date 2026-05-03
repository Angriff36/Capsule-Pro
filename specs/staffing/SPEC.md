# Feature Specification: Staffing Module (Cohere-Aligned)

**Feature ID**: CAP-STAFFING-001
**Feature Branch**: `spec/staffing-001`
**Created**: 2026-05-02
**Status**: Draft
**Input**: User description: "Codify the staffing module — the operator surface that owns coverage dashboards, AI-driven staffing recommendations, labor-budget alerts, and cross-links to the scheduling module for shifts, availability, and time-off. Inherit the shell contract from `specs/general/design-system-shell.md` (§5.1) and define the CoverageBar primitive, coral chip taxonomy for shift status and employment type, and migration path for the `staffing/layout.tsx:28` border-b tab strip and `staffing-recommendations-client.tsx` text-3xl openers."

> **Why this spec exists.** Staffing is a derived analytical surface, not a system of record. Its data ladder is `ScheduleShift` (filled vs unfilled slots, owned by Scheduling) → location/role rollups → coverage thresholds → AI recommendations. The current implementation already ships a near-3/3 landing (`staffing/page.tsx`) but the children diverge: `layout.tsx` uses `text-3xl font-bold` + `border-b` tab strip (§3.6 / §3.12 violations, one of four remaining §3.12 offenders cited in `IMPLEMENTATION_PLAN.md`) and `recommendations/staffing-recommendations-client.tsx` uses a `text-3xl font-bold` opener plus a bare `<Card>` ladder with `bg-red-50` error surface (§3.6, §3.11, §3.8 violations cited in §2B.4). Additionally, `/staffing/shifts` and `/staffing/availability` are redirect stubs forwarding to the scheduling module — the boundary is intentional and this spec ratifies it. This document defines the contract so §2B.4 passes can close against an explicit rubric, establishes the `CoverageBar` primitive recommendation, and declares the coral chip taxonomy for shift status, employment type, and certification status.

## Clarifications

- **[NEEDS CLARIFICATION: C-001]** `WorkforceOptimization`, `EmployeeAvailability`, and `EmployeeCertification` appear in the MCP entity catalog but have no Prisma model in `schema.prisma` as of 2026-05-02. Confirm whether these should be authored before v1 recommendations persistence is in scope, or whether the recommendations API remains stateless (transient transform only).
- **[NEEDS CLARIFICATION: C-002]** `/staffing/coverage` is linked from the landing quick-links section and the "Location coverage / View all" affordance but no `page.tsx` exists. Confirm whether this route should be built as a full coverage drilldown page, or the link should redirect to `/scheduling/shifts?view=coverage` as an interim.
- **[NEEDS CLARIFICATION: C-003]** Nowsta is a shift-sync integration under `/settings/integrations`. Confirm whether the staffing landing should surface a Nowsta sync-status `MonoLabel` indicator inline (similar to Goodshuffle on events), or whether sync status is exclusively owned by `/settings/integrations`.
- **[NEEDS CLARIFICATION: C-004]** `LaborBudget` has `threshold80Pct`, `threshold90Pct`, `threshold100Pct` booleans and `actualSpend`. Confirm whether budget-threshold alerts should surface on the staffing landing MetricBand, or only on `/scheduling/budgets`.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Scheduler triages today's coverage (Priority: P1)

A scheduler or operations lead opens `/staffing` to see the day's coverage health across all locations. They must identify, within 2 seconds of viewport load: total shifts, filled count, unfilled count with coral alert styling, and a CoverageBar per location.

**Why this priority**: The coverage dashboard is the primary reason the staffing module exists. If P1 is wrong, schedulers go directly to `/scheduling/shifts` and the staffing surface provides no distinct cross-location value.

**Independent Test**: Given a tenant with ≥ 3 locations, ≥ 10 shifts today (≥ 2 unfilled), the operator answers "how many unfilled shifts today?" without scrolling. Page composes `PageCanvas → CommandBand → MetricBand → OperationalColumn` with zero `text-3xl font-bold`, zero `bg-*-(50|100|200)`, zero `shadow-*`.

**Acceptance Scenarios**:

1. **Given** the operator opens `/staffing` at 08:00 with 12 shifts and 2 unfilled, **When** the page loads, **Then** the `MetricBand` shows Total Shifts: 12 / Filled: 10 / Unfilled: 2 (note: "Needs attention" in warning-coral delta pill) / Hours Today: `<sum>`. The inline `CoverageBar` track reads `83% of shifts filled` in coral tone (below 90% threshold).
2. **Given** all shifts today are filled, **When** the page loads, **Then** the Unfilled cell note reads "All covered" and the `CoverageBar` fill uses `bg-deep-green` (≥ 90% threshold).
3. **Given** the scheduler selects a specific location from the `CommandBandActions` Select, **When** the filter applies, **Then** the `MetricBand` and coverage sections refetch from `GET /api/staffing/coverage?period=today&locationId=<id>` and the location list narrows to that site.
4. **Given** no shifts exist for the tenant today, **When** the page renders, **Then** the empty state uses the `Empty` primitive with soft-stone tile (`bg-soft-stone px-6 py-16 rounded-[22px]`, central `Users` icon, "No staffing data" heading, body pointing at `/scheduling/shifts`, pill primary CTA "Go to shifts") — not the current inline `<div className="rounded-[22px] border...bg-canvas p-12">`.

---

### User Story 2 — Scheduler scans the six-week coverage trend (Priority: P1)

After triaging today, the scheduler reviews the "Last six weeks" section to detect chronic understaffing at any location before it becomes a turnover issue.

**Why this priority**: Daily triage catches today's pain. Six-week trend catches systemic patterns. Coverage analytics without trend is a snapshot, not a tool.

**Independent Test**: Given six weeks of `ScheduleShift` rows with non-uniform fill rates, each week row shows a mono-date prefix, a `CoverageBar`, shift count, and a coral badge for unfilled count — readable by scan without clicking into any row.

**Acceptance Scenarios**:

1. **Given** the operator views the trend section, **When** rows render, **Then** each row displays: `<week-start MonoLabel month-day> | CoverageBar | <total> shifts | -N coral badge when unfilled > 0`. Rows in reverse-chronological order (newest first).
2. **Given** `?locationId=<id>` is set, **When** the trend renders, **Then** data is scoped to that location only; without a location filter it aggregates across all locations.
3. **Given** the operator's location has a week where `coverage_pct < 70`, **When** that row renders, **Then** the `CoverageBar` fill uses `bg-coral` and the badge renders the exact unfilled count.

---

### User Story 3 — Sales operator generates AI staffing recommendations (Priority: P1)

A sales operator entering an event proposal opens `/staffing/recommendations`, enters event parameters (guest count, type, service style, duration), and receives a role-by-role staffing breakdown with counts, hourly rates, and total estimated labor cost.

**Why this priority**: AI recommendations are the staffing module's highest-differentiation feature. The current implementation is functionally correct but visually broken — `text-3xl font-bold`, bare `<Card>` ladder, `bg-red-50` error tile. These are §3.6/§3.11/§3.8 violations.

**Independent Test**: Operator submits `{ guestCount: 200, eventType: "wedding", serviceStyle: "plated", duration: 4 }`. The result renders as `MetricBand` (Total Staff, Estimated Labor Cost, Ratio) + `ResearchTable` (role rows). Page has zero `<Card>` openers, zero `text-3xl font-bold`, zero `bg-*-(50|100|200)`.

**Acceptance Scenarios**:

1. **Given** the operator opens `/staffing/recommendations`, **When** the page renders, **Then** the shell composes `PageCanvas → CommandBand (DisplayHeading="AI Staffing Recommendations", eyebrow="Operations / Staffing / Recommendations", lede="Get AI-powered staffing plans based on event parameters.") → ContactFormCard (guest count, event type Select, service style Select, duration) → OperationalColumn (results or empty state)`. Zero `text-3xl font-bold`, zero bare `<Card>`.
2. **Given** the operator submits valid parameters, **When** the recommendation returns, **Then** the result renders `MetricBand` (Total Staff, Estimated Labor Cost, Staff-to-Guest Ratio) followed by `ResearchTable` with one row per role: role-name left, `BlogFilterChip` role-type chip center (chef/server/bartender/coordinator/support), `$subtotal` mono-right with `×count @ $rate/hr × Nh` as sub-caption.
3. **Given** the API returns `{ error: "<reason>" }`, **When** the error renders, **Then** it surfaces as a `StatusPill` in warning-coral tone inside the `OperationalColumn` — never as a `border-red-500 bg-red-50` Card (current `staffing-recommendations-client.tsx:161` violation).
4. **Given** the operator changes any form field after a recommendation has rendered, **When** they re-submit, **Then** the prior result clears before the new request resolves — no stale numbers visible during loading.

---

### User Story 4 — Scheduler navigates between staffing sub-routes via pill-outline tabs (Priority: P2)

The scheduler navigates between Overview, Recommendations, and Coverage using the staffing layout tab strip. The current `staffing/layout.tsx:28` renders a `border-b` underline strip — a §3.12 violation.

**Why this priority**: The layout wraps every staffing sub-route. Fixing it removes a §3.12 offender and makes staffing consistent with the pill-outline pattern used across the authenticated shell.

**Independent Test**: Zero `border-b` classes in `staffing/layout.tsx`. Zero `text-3xl font-bold` in `staffing/layout.tsx`. The nav uses pill-outline tabs (`rounded-xl`, 30px radius, near-black active state).

**Acceptance Scenarios**:

1. **Given** the operator opens any `/staffing/*` sub-route, **When** the layout renders, **Then** the nav uses pill-outline tabs with the active tab as near-black pill and inactive tabs as `rounded-xl` outline. No `border-b-2 border-primary` underline.
2. **Given** the `<h2 className="text-3xl font-bold tracking-tight">Staffing</h2>` at `staffing/layout.tsx:26` exists, **Then** it MUST be removed. Each page's own `CommandBand → DisplayHeading` is the authoritative heading; the layout does not duplicate it.
3. **Given** the operator clicks the "Shifts" tab, **When** the click fires, **Then** the redirect stub at `staffing/shifts/page.tsx` forwards to `/scheduling/shifts` — the cross-module jump is intentional (FR-701) and the tab label MAY carry a "↗" indicator to signal this.

---

### User Story 5 — Scheduler monitors labor budget vs actuals (Priority: P2)

A scheduler sees a budget-threshold alert on `/staffing` when `LaborBudget.actualSpend / budgetTarget` reaches a configured threshold, so they can act before payroll overruns.

**Why this priority**: Budget alerts are proactive — they prevent overspend before payroll runs. The `LaborBudget` model already ships the threshold booleans; this story surfaces them in the staffing UI.

**Acceptance Scenarios**:

1. **Given** a `LaborBudget` row with `actualSpend / budgetTarget = 0.85` and `threshold80Pct = true`, **When** the staffing landing renders, **Then** the `OperationalColumn` includes a budget-alert section above Quick Links with `MonoLabel` eyebrow "LABOR BUDGET" and `StatusPill` "80% consumed" in amber-500 tone linking to `/scheduling/budgets`.
2. **Given** `actualSpend >= budgetTarget`, **When** the alert renders, **Then** the `StatusPill` reads "Over budget" in coral tone.
3. **Given** no `LaborBudget` rows exist, **When** the landing renders, **Then** no alert section renders; a "Set labor budgets" text-link appears in the Quick Links section pointing to `/scheduling/budgets`.

---

### Edge Cases

- **`total_shifts = 0` today.** The coverage bar reads 100% (per the `coveragePct` convention at `staffing/page.tsx:115-119`). Spec requires a `MonoLabel` caption "No shifts scheduled" on the bar when `total_shifts === 0` to prevent the "100% coverage" reading from being mistaken for a busy-day.
- **AI recommendation API unavailable.** The error MUST render as `StatusPill` warning-coral inside `OperationalColumn` — never `bg-red-50 border-red-500 Card`. The `ContactFormCard` form must remain interactive for retry.
- **`LaborBudget.actualSpend` is null.** The budget-alert section MUST NOT render. Null means tracking has not started — do not interpolate 0 as "0% consumed".
- **`/staffing/coverage` route missing.** The quick-link "Coverage report → /staffing/coverage" currently navigates to a non-existent route. Until FR-108 resolves §C-002, the link MUST redirect to `/scheduling/shifts` or be removed. A broken navigation affordance is worse than a missing one.
- **Mobile viewports.** The `MetricBand` 4-cell row MUST wrap to 2×2 on viewports < 768px. The `CoverageBar` per-location stack MUST collapse to single-column. The quick-links 4-column grid MUST collapse to 1-column.

---

## Requirements *(mandatory)*

### Functional Requirements

#### FR-1xx — Composition (inherited from §5.1 design-system-shell)

- **FR-101**: Every page under `apps/app/app/(authenticated)/staffing/*` MUST compose its top-level shell using primitives from `packages/design-system/components/blocks/page-shell.tsx` (`PageCanvas`, `CommandBand`, `DisplayHeading`, `MonoLabel`, `MetricBand`, `MetricCell`, `MetricLabel`, `MetricValue`, `OperationalColumn`, `SectionHeader`, `StatusPill`). Bespoke local imitations are forbidden. Inherits `design-system-shell.md` FR-101.
- **FR-102**: The recommendations role-breakdown MUST use `ResearchTable` from `packages/design-system/components/blocks/research-table.tsx`. The current per-role `<div className="flex items-center justify-between p-4 border rounded-lg">` blocks MUST be replaced. Inherits FR-102.
- **FR-103**: The recommendations form panel MUST use `ContactFormCard` from `packages/design-system/components/blocks/contact-form-card.tsx`. The current bare `<Card><CardHeader><CardContent>` input grid MUST migrate. Inherits FR-103.
- **FR-104**: Shift-status, employment-type, and certification-status taxonomy chips MUST use `BlogFilterChip` from `packages/design-system/components/blocks/blog-filter-chip.tsx`. Chip taxonomy — shift status: `open` / `filled` / `cancelled`; employment type: `full-time` / `part-time` / `contractor`; certification status: `current` / `expiring` / `expired`. Inherits FR-104.
- **FR-105**: Empty states (no shifts today, no recommendation generated, no location data) MUST use the `Empty` primitive with soft-stone tile contract. The current inline `<div className="rounded-[22px] border border-hairline bg-canvas p-12 text-center">` at `staffing/page.tsx:396` MUST migrate. Inherits FR-105.
- **FR-106**: `staffing/layout.tsx` MUST NOT render a `text-3xl font-bold` h2. Each child page's `CommandBand` owns its `DisplayHeading`. The layout owns navigation only. Inherits FR-201.

#### FR-2xx — Forbidden patterns (staffing-specific)

- **FR-201**: `/staffing/**` MUST NOT contain `text-3xl font-bold`. Primary violations: `staffing/layout.tsx:26` and `staffing-recommendations-client.tsx:77`. Use `DisplayHeading` inside `CommandBand`. Audit target: 0.
- **FR-202**: `/staffing/**` MUST NOT contain `bg-red-50`, `border-red-500`, or any `bg-*-(50|100|200)` decorative pastel. The error Card at `staffing-recommendations-client.tsx:161` MUST migrate to a `StatusPill` in warning-coral. Audit target: 0.
- **FR-203**: `/staffing/**` MUST NOT contain bare `<Card>` or `<CardContent>` openers without a `tone` prop. The `staffing-recommendations-client.tsx` Card ladder (≥ 5 openers) MUST migrate. Audit target: 0.
- **FR-204**: `staffing/layout.tsx:28` MUST NOT contain a `border-b` tab strip. The `flex space-x-1 border-b overflow-x-auto` nav MUST migrate to pill-outline tabs (`rounded-xl`, 30px radius). This is one of the four §3.12 offenders in `IMPLEMENTATION_PLAN.md`. Audit target: 0.
- **FR-205**: `/staffing/**` MUST NOT contain `shadow-(sm|md|lg|xl|2xl)` on non-overlay surfaces. Inherits FR-202 from design-system-shell.

#### FR-3xx — Tokens (inherited from §5.1 design-system-shell)

- **FR-301**: Coverage threshold colors MUST use `--ds-coral` (below 70%), `text-muted-foreground / bg-muted-foreground/40` (70–89%), and `--ds-deep-green` (90%+). The current `getCoverageMeta` function at `staffing/page.tsx:73` implements this correctly — the spec ratifies it. Inherits FR-303.
- **FR-302**: `MonoLabel` date labels in the weekly trend (currently `font-mono text-[11px] uppercase tracking-[0.18em]`) MUST migrate to the `MonoLabel` primitive from `page-shell.tsx`. Inherits FR-304.
- **FR-303**: Radius MUST consume the DESIGN.md scale. The existing `rounded-[22px]` in `staffing/page.tsx` is the documented empty-state shorthand; other inline instances MUST migrate to `rounded-lg` token. Inherits FR-301.

#### FR-4xx — CoverageBar primitive

- **FR-401**: A `CoverageBar` primitive MUST be authored per `IMPLEMENTATION_PLAN.md §2B.4` at `packages/design-system/components/blocks/coverage-bar.tsx` (or, if app-scoped only, at `apps/app/app/lib/coverage-bar.tsx`). Props: `pct: number`, `height?: "h-2"|"h-3"` (default `h-2`), `thresholdWarning?: number` (default 70), `thresholdGood?: number` (default 90), `aria-label: string`. Renders a `rounded-full bg-soft-stone` track with a threshold-keyed fill per FR-301.
- **FR-402**: `CoverageBar` MUST expose `data-coverage-pct` and `data-coverage-zone` (`green|warning|danger`) attributes for E2E test assertions without relying on color class names.
- **FR-403**: The three inline coverage-bar div blocks in `staffing/page.tsx` (lines 214–219, 251–255, 305–310) MUST be replaced by `CoverageBar`. No other file under `/staffing/**` MAY author an inline `h-2 rounded-full bg-soft-stone` coverage pattern after `CoverageBar` lands.

#### FR-5xx — AI Recommendations surface

- **FR-501**: The recommendations input form MUST use `ContactFormCard` with field stack: Guest Count (number), Event Type (Select: corporate / wedding / social / nonprofit / festival), Service Style (Select: plated / buffet / family_style / cocktail / food_truck), Duration (number, hours). All four fields are required. Submit is the near-black pill primary labeled "Generate Recommendation".
- **FR-502**: The recommendation result MUST render a `MetricBand` (Total Staff, Estimated Labor Cost, Staff-to-Guest Ratio) followed by `ResearchTable` with one row per role. Row contract: role-name capitalized left, `BlogFilterChip` employment-type chip center, `$subtotal` mono-right with `×count @ $rate/hr × Nh` sub-caption in `MonoLabel`.
- **FR-503**: The Notes section MUST render as an `OperationalColumn` section with `SectionHeader` ("Notes") and one `OperationalLine` per note — not a bare `<ul>` inside a `<Card>`.
- **FR-504**: `POST /api/staffing/recommendations` is infrastructure-allowlisted (existing route). This spec does NOT require migrating it to a manifest command in v1. The route is stateless — inputs in, recommendation out, nothing persisted until §C-001 is resolved.

#### FR-6xx — Labor budget alerts

- **FR-601**: When `LaborBudget.actualSpend` is non-null and `actualSpend / budgetTarget >= 0.8` with `threshold80Pct = true`, the staffing landing MUST surface a budget-alert `OperationalColumn` section above the Quick Links section.
- **FR-602**: Budget-alert `StatusPill` tones — 80–89%: amber-500 ("80% consumed"); 90–99%: coral ("90% consumed — review required"); 100%+: coral ("Over budget"). Each threshold renders only when its corresponding `threshold*Pct` boolean on `LaborBudget` is true.
- **FR-603**: Budget alerts MUST link to `/scheduling/budgets`. Staffing reads budget state; scheduling owns budget management.
- **FR-604**: When no `LaborBudget` rows exist, a "Set labor budgets" text-link renders in the Quick Links section pointing to `/scheduling/budgets`.

#### FR-7xx — Scheduling cross-links (module boundary)

- **FR-701**: `/staffing/*` MUST NOT own shift-management, availability-management, or time-off-management UI. These belong to `/scheduling/*`. The redirect stubs (`staffing/shifts/page.tsx → /scheduling/shifts`, `staffing/availability/page.tsx → /scheduling/availability`) are the correct architecture and MUST be preserved.
- **FR-702**: The coverage API (`GET /api/staffing/coverage`) reads from `ScheduleShift` and `Schedule` in `tenant_staff` schema. It MUST NOT duplicate scheduling write logic — it aggregates read-only coverage metrics.
- **FR-703**: When `specs/calendar/SPEC.md` (§5.6) references `/scheduling/shifts/[shiftId]` as the shift detail URL (per FR-801 of that spec), the staffing module MUST NOT introduce an alternate shift-detail URL. Staffing surfaces shift status via coverage aggregates only — individual shift navigation goes to `/scheduling/shifts/[shiftId]`.
- **FR-704**: The staffing landing "Quick links" grid MUST link to exactly four destinations: `Manage shifts → /staffing/shifts` (→ redirects to `/scheduling/shifts`), `Availability → /staffing/availability` (→ redirects to `/scheduling/availability`), `Coverage report → /staffing/coverage` (pending §C-002 resolution), `AI recommendations → /staffing/recommendations`.

### Key Entities

- **ScheduleShift** (Prisma, `tenant_staff.schedule_shifts`): `{ id, tenantId, scheduleId, employeeId, locationId, shift_start, shift_end, role_during_shift, notes, ... }`. Source for coverage aggregation in `/api/staffing/coverage`. Read-only from staffing — writes go through `/scheduling/` commands.
- **Schedule** (Prisma, `tenant_staff.schedules`): `{ id, tenantId, locationId, schedule_date, status (draft/published), published_at, ... }`. Parent of `ScheduleShift`.
- **LaborBudget** (Prisma, `tenant_staff.LaborBudget`): `{ id, tenantId, locationId, eventId, budgetType, periodStart, periodEnd, budgetTarget, budgetUnit, actualSpend, threshold80Pct, threshold90Pct, threshold100Pct }`. Source for FR-6xx budget alerts.
- **CoverageBar** (UI primitive, to be authored per FR-401): not a Prisma model. React component encapsulating threshold-keyed progress bar. Shared across staffing landing, recommendations, and future scheduling consumers.
- **TodayStats** (transient API DTO): `{ total_shifts, filled_shifts, unfilled_shifts, active_employees, total_hours, locations: LocationCoverage[] }`. Defined in `staffing/page.tsx:60–67`.
- **LocationCoverage** (transient API DTO): `{ location_id, location_name, total_shifts, filled_shifts, unfilled_shifts, coverage_pct }`. Defined in `staffing/page.tsx:42–49`.
- **WorkforceOptimization / EmployeeAvailability / EmployeeCertification** (DEFERRED — §C-001): no Prisma model exists. Out of scope until backed by a migration.

### Cross-references

- `specs/general/design-system-shell.md` (§5.1) — shell contract this spec inherits. Every FR-1xx/FR-2xx/FR-3xx mapping defers to that document for radius/spacing/color/typography rules.
- `specs/calendar/SPEC.md` (§5.6) — shift detail URL convention; the calendar spec's FR-801 references this spec for the canonical shift-detail path.
- `specs/events/SPEC.md` (§5.2) — events module owns per-event staffing summary at `/events/[eventId]/staff`; this spec owns the cross-event coverage dashboard.
- `IMPLEMENTATION_PLAN.md §2B.4` — CoverageBar primitive extraction and recommendations shell migration task.
- `IMPLEMENTATION_PLAN.md §3.12` — `staffing/layout.tsx:28` border-b offender (one of four remaining).
- `IMPLEMENTATION_PLAN.md §3.6` — `staffing-recommendations-client.tsx:77` text-3xl offender.
- `IMPLEMENTATION_PLAN.md §3.11` — bare `<Card>` ladder in `staffing-recommendations-client.tsx`.
- `apps/app/app/(authenticated)/staffing/page.tsx` — near-3/3 reference implementation (FR-101 baseline).
- `apps/app/app/(authenticated)/staffing/layout.tsx` — §3.12 and §3.6 offender (lines 26–28).
- `apps/app/app/(authenticated)/staffing/recommendations/staffing-recommendations-client.tsx` — §3.6, §3.8, §3.11 offender.
- `apps/app/app/(authenticated)/scheduling/` — scheduling module owns shifts, availability, time-off, budgets.
- `apps/api/app/api/staffing/recommendations/route.ts` — AI recommendation endpoint (infrastructure-allowlisted).
- `packages/database/prisma/schema.prisma` — `ScheduleShift` (line 2601), `Schedule` (line 2583), `LaborBudget` (line 2684).

### Out of scope

- Shift management UI — owned by `/scheduling/shifts`; redirect stubs are the boundary.
- Employee availability management — owned by `/scheduling/availability`.
- Time-off request management — owned by `/scheduling/time-off`.
- Labor budget creation and editing — owned by `/scheduling/budgets`.
- Nowsta integration sync status inline — owned by `/settings/integrations` (see §C-003).
- `WorkforceOptimization`, `EmployeeAvailability`, `EmployeeCertification` Prisma models — no model exists; deferred (§C-001).
- Payroll runs — owned by `/payroll` module, separate spec required.
- External scheduling system integration beyond Nowsta read-model (Deputy, When I Work, CalDAV) — no documented operator demand.
- Mobile-staffing surface — `apps/app/app/(mobile-kitchen)/*` does not include a staffing view; if added, it requires its own spec.
- Persisted recommendation history — gated on `WorkforceOptimization` model existence (§C-001).

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `staffing/layout.tsx` ships zero `text-3xl font-bold` openers and zero `border-b` tab strips. Current baseline: 1 `text-3xl font-bold` (line 26), 1 `border-b` tab strip (line 28). Verified by `rg "text-3xl font-bold|border-b" apps/app/app/(authenticated)/staffing/layout.tsx` returning zero matches.
- **SC-002**: `staffing-recommendations-client.tsx` ships zero `text-3xl font-bold` openers and zero bare `<Card>` openers. Current baseline: 1 `text-3xl font-bold` (line 77), ≥ 5 bare `<Card>` openers (lines 83, 161, 171, 184, 196, 213, 258). Target: 0 / 0.
- **SC-003**: `bg-red-50` and `border-red-500` in `staffing-recommendations-client.tsx` are removed. Verified by `rg "bg-red-50|border-red-500" apps/app/app/(authenticated)/staffing/` returning zero matches.
- **SC-004**: `CoverageBar` primitive is authored and replaces all three inline coverage-bar div blocks in `staffing/page.tsx`. Verified by `rg "h-2 rounded-full bg-soft-stone|h-3 rounded-full" apps/app/app/(authenticated)/staffing/page.tsx` returning zero matches after migration.
- **SC-005**: The staffing landing (`/staffing`) scores 3/3 against `design-system-shell.md` FR-501. Current: near-3/3 (landing composes correctly but `console.error` at line 105 violates logging hygiene). Target: 3/3 with zero exceptions.
- **SC-006**: `/staffing/recommendations` scores 3/3 against `design-system-shell.md` FR-501. Current: 1/3 (bare-Card ladder, decorative pastel error, text-3xl opener). Target: 3/3.
- **SC-007**: Operator answers "how many unfilled shifts today?" within 2 seconds of opening `/staffing`. Verified by Lighthouse LCP < 2.0s on a tenant with ≥ 20 shifts today.
- **SC-008**: AI recommendation round-trip completes in < 6s p95. Verified by Playwright timing assertion in `e2e/workflows/staffing-recommendations.workflow.spec.ts` (does not yet exist; create when implementing FR-5xx).
- **SC-009**: Budget alert renders for a `LaborBudget` row at 85% utilization and DOES NOT render for a row at 75% (`threshold80Pct = true` in both cases). Verified by unit test or E2E assertion.
- **SC-010**: Zero `console.log` / `console.error` calls under `apps/app/app/(authenticated)/staffing/**` after migration. Current violation: `staffing/page.tsx:105` `console.error("Failed to fetch coverage:", err)` MUST migrate to `@repo/observability` per `AGENTS.md` logging hygiene.

---

## Reference

- `DESIGN.md` (root) — color, typography, radius, spacing, component tokens.
- `packages/design-system/components/blocks/page-shell.tsx` — `PageCanvas`, `CommandBand`, `MetricBand`, `OperationalColumn`, `SectionHeader`, `StatusPill`, `DisplayHeading`, `MonoLabel`, `FilterRail`.
- `packages/design-system/components/blocks/research-table.tsx` — `ResearchTable` (target for recommendations role-breakdown).
- `packages/design-system/components/blocks/contact-form-card.tsx` — `ContactFormCard` (target for recommendations input form).
- `packages/design-system/components/blocks/blog-filter-chip.tsx` — `BlogFilterChip` (shift-status / employment-type / certification-status chip taxonomy).
- `packages/design-system/components/blocks/product-card.tsx` — `ProductCard` (target for quick-links tiles).
- `IMPLEMENTATION_PLAN.md §2B.4` — staffing §2B migration item; CoverageBar primitive extraction.
- `IMPLEMENTATION_PLAN.md §3.6 / §3.12 / §3.11 / §3.8` — cross-cutting audit sweeps this spec closes.
