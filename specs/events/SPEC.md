# Feature Specification: Events Module (Cohere-Aligned)

**Feature Branch**: `events/SPEC`
**Created**: 2026-05-02
**Status**: Draft
**Input**: User description: "Codify the events module — the most-touched operator surface in the app. Cover events list, event detail, planning vs execution sub-tabs, battle boards, reports, import. Inherit the shell contract from `specs/general/design-system-shell.md` (§5.1) and stitch the seven `_TODO` sub-specs (event-budget-tracking, event-contract-management, event-import-export, event-proposal-generation, event-timeline-builder, ai-event-summaries, goodshuffle-event-sync) into one parent contract."

> **Why this spec exists.** Events is the central module of the catering operations system — every other module (kitchen, scheduling, inventory, payroll, accounting, crm) hangs off an event's lifecycle. Yet `specs/events/` did not exist before this document; the seven `_TODO` event-related specs lived as orphans under `specs/kitchen/`, `specs/ai/`, and `specs/administrative/` with no parent contract to anchor them. The events landing page (`apps/app/app/(authenticated)/events/page.tsx`) was scored 3/3 in §2C of `IMPLEMENTATION_PLAN.md`, but the rest of the module surface (8 top-level pages, 20+ nested routes, 21 API directories, 80+ commands, 9 Prisma entities) had no codified rules. This document is that anchor — it defines what an "events-module-aligned" page must satisfy so subsequent passes can score every events sub-route against an explicit rubric.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Operator scans the events list (Priority: P1)

A scheduler or sales lead opens `/events` to triage what is happening this week. They must, within 2 seconds of viewport load, be able to:

1. **See the operational temperature.** A `MetricBand` row shows the 4–6 numbers a coordinator needs (events this week, confirmed vs tentative, total guest count, total revenue at risk, overdue contracts, unstaffed events).
2. **Find a specific event by name, client, date, or status.** A `BlogFilterChip` cluster (status: tentative/confirmed/in-progress/completed/cancelled; type: wedding/corporate/social/tasting; date window: this-week/this-month/upcoming/past) sits above the list.
3. **Drill into an event in one click.** Each row is a `ResearchTable` entry: event title left, status pill center, event date (mono) right, with a hairline divider and the whole row a single anchor.
4. **Create a new event.** A `CommandBand` primary action ("New event", near-black pill) sits adjacent to the heading. A secondary "Import events" pill-outline action opens the import workflow (User Story 6).

**Why this priority**: The events list is the entry point for ~90% of operator sessions. If P1 is wrong, every downstream interaction is friction-loaded.

**Independent Test**: Given a tenant with ≥ 20 events spanning ≥ 3 statuses, an operator can identify (a) the next event happening, (b) any event currently flagged "needs staffing" or "overdue contract", and (c) the click-target to create a new event — all without scrolling, all within 2 seconds.

**Acceptance Scenarios**:

1. **Given** the operator opens `/events`, **When** the page renders, **Then** the shell composes `PageCanvas → CommandBand (with primary "New event" pill + secondary "Import events" pill-outline) → MetricBand (events this week, confirmed, tentative, guest count, revenue at risk, unstaffed) → BlogFilterChip cluster → ResearchTable` with no `<Card>` per row, no `text-3xl font-bold` opener, no `bg-*-50/100/200` decorative pastels, no legacy `Header` import.
2. **Given** the operator filters by status="confirmed", **When** the chip toggles, **Then** the list re-renders showing only confirmed events and the MetricBand updates the "confirmed" cell to a selected/highlighted state without re-mounting the chip cluster.
3. **Given** the operator clicks an event row, **When** the navigation completes, **Then** the operator lands on `/events/[eventId]` (User Story 2) with the event-name eyebrow already populated and no flash of unfilled `DisplayHeading`.

---

### User Story 2 — Operator drills into a single event (Priority: P1)

After picking an event from the list, the operator opens `/events/[eventId]`. The detail page is the second-most-touched events surface and the hub from which the operator branches into planning, execution, contracts, budgets, reports, staffing, guests, and the battle board.

**Why this priority**: The detail page is where the operator spends the bulk of pre-event coordination time. It is also the page that fans out to every sub-spec (`event-budget-tracking`, `event-contract-management`, `event-timeline-builder`, `event-proposal-generation`, `ai-event-summaries`).

**Independent Test**: Given an event in `confirmed` status with budget, contract, staff, and guest data populated, the operator can — without leaving `/events/[eventId]` — see the headline event metadata (name, date, venue, guest count, status pill), the operational column (budget summary, contract status, staffing summary, allergen warnings, AI summary), and the navigation links to each sub-tab. No piece of headline metadata is rendered as a generic `<Card>` opener.

**Acceptance Scenarios**:

1. **Given** the operator opens `/events/[eventId]`, **When** the page renders, **Then** the shell composes `PageCanvas → CommandBand (event title as DisplayHeading, eyebrow="Operations / Events / <eventNumber>", lede=client-name + venue + date, primary action="Edit event" pill, secondary actions="Generate proposal", "Open battle board", "Print run sheet" as pill-outline / text-link) → MetricBand (guest count, budget, days until, contract state, staff filled, AI confidence) → OperationalColumn (sections: Schedule, Budget, Contract, Staffing, Guests & RSVPs, Allergens, AI Summary, Follow-ups)`.
2. **Given** the event has an `EventSummary` row generated by AI, **When** the operational column renders the AI section, **Then** the body uses `ds-body` typography with a `MonoLabel` "AI summary" eyebrow and a confidence pill (≥ 0.8 = green-600 status pill, 0.5–0.8 = amber-500, < 0.5 = warning-coral). Cross-references `specs/ai/ai-event-summaries_TODO.md`.
3. **Given** the operator clicks "Open battle board", **When** the navigation completes, **Then** the operator lands on `/events/[eventId]/battle-board` (User Story 5) and a battle board is created lazily if none exists yet (POST `/api/events/[eventId]/battle-boards/create` if `BattleBoard` for this event is null).
4. **Given** the operator clicks "Generate proposal", **When** the action completes, **Then** the proposal-generation flow opens per `specs/sales/event-proposal-generation_TODO.md` and on success returns to `/events/[eventId]` with the new `Proposal` linked under a new "Proposals" line in the operational column.

---

### User Story 3 — Operator switches between Planning and Execution sub-tabs (Priority: P1)

Inside the event detail page, the operator must be able to toggle between the **Planning** view (forward-looking: budget, contract, proposal, timeline, staffing, allergens) and the **Execution** view (day-of operational: battle board, run sheet, kitchen tasks, station assignments, guest check-in, real-time updates). The two views are different mental models — planning is editorial / form-heavy, execution is operational / dashboard-heavy.

**Why this priority**: The planning/execution toggle is the cognitive switch operators perform when an event moves from "next week's wedding" to "today's wedding". Conflating the two views (showing budget edit forms during execution, or showing battle-board status during planning) is a documented operator-frustration source.

**Independent Test**: Given an event in `confirmed` status more than 24h away, the default tab is **Planning**. Given an event in `in-progress` status (event date == today, status === "in-progress"), the default tab is **Execution**. Switching tabs swaps the operational column composition without re-fetching the event header.

**Acceptance Scenarios**:

1. **Given** the operator opens `/events/[eventId]` with `eventDate > now + 24h`, **When** the page renders, **Then** the Planning tab is selected and the operational column shows the planning ladder (Schedule, Budget, Contract, Staffing, Guests, Allergens, AI Summary, Follow-ups).
2. **Given** the operator opens `/events/[eventId]` with `eventDate <= now + 24h` AND `status in ('in-progress', 'confirmed')`, **When** the page renders, **Then** the Execution tab is selected and the operational column shows the execution ladder (Battle Board, Run Sheet, Kitchen Tasks, Station Assignments, Guest Check-in, Live Issues).
3. **Given** the operator manually toggles between Planning and Execution, **When** the toggle fires, **Then** the URL updates to `?tab=planning` or `?tab=execution` (no full-page reload), and the operator's last choice is remembered per-event in `localStorage` so re-visiting the same event opens the same tab.
4. **Given** the operator is on the Execution tab and the event finishes (status flips to `completed`), **When** the operator returns to `/events/[eventId]`, **Then** the default tab flips to **Reports** (User Story 7) — Planning and Execution are operationally moot, Reports is the post-mortem surface.

---

### User Story 4 — Operator runs a battle board (Priority: P2)

The operator opens `/events/[eventId]/battle-board` to coordinate menu finalization with the chef and event lead. A battle board is a collaborative dish-voting workspace: dishes are nominated, the team votes (or "battles" them off), and the winner is added to the event's final menu.

**Why this priority**: Battle boards are a high-engagement collaboration surface but are used on a subset of events (typically tasting events, weddings with custom menus, corporate events with chef's-choice tiers). Operationally important but not on every event's critical path.

**Independent Test**: Given an event with no battle board, the page renders an Empty primitive with a "Create battle board" pill CTA. Given an event with an active battle board, the page renders the dish nomination column, the voting column, and the finalized-menu column as a three-column operational layout.

**Acceptance Scenarios**:

1. **Given** the operator opens `/events/[eventId]/battle-board` for an event with no `BattleBoard` row, **When** the page renders, **Then** the empty state matches the soft-stone tile contract from §5.1 FR-105 with "Create battle board" as the pill primary CTA. On click, POST `/api/events/[eventId]/battle-boards/create` and re-render with the active board.
2. **Given** the battle board is active with dishes nominated, **When** the operator clicks a dish "Vote" affordance, **Then** POST `/api/battle-boards/[boardId]/vote` fires with the operator's identity, the vote tally updates optimistically, and the dish row's vote-count pill increments. If the server rejects (rate-limited, already voted, board closed), the optimistic update reverts and a `Toast` surfaces the rejection reason.
3. **Given** the operator (event lead role) clicks "Finalize" on a dish, **When** the action completes, **Then** the dish moves from "nominated" to "finalized" column, an `EventDish` row is created linking the event to the dish, and the dish appears on the run sheet (User Story 3 Execution view) and the proposal (if not yet sent).

---

### User Story 5 — Operator imports events from a third-party source (Priority: P2)

The operator opens `/events/import` to bulk-import events from CSV, Goodshuffle, or PartySlate. The import workflow is a multi-stage state machine: extracting → parsing → validating → reserving → proposing → activating. Each stage has its own visible state, errors, and re-runnable retry semantics.

**Why this priority**: Import is the on-ramp for catering companies migrating from competing software. Getting the import workflow right is the difference between "one-day setup" and "three-week migration project".

**Independent Test**: Given an `events.csv` with 12 well-formed rows and 3 malformed rows, the operator can launch the import, see all 6 stages progress in the operational column with mono-label timestamps, see the 3 malformed rows quarantined with row-level error reasons, and re-run only the failed rows after fixing them. Cross-references `specs/sales/event-import-export_TODO.md` and `specs/administrative/goodshuffle-event-sync_TODO.md`.

**Acceptance Scenarios**:

1. **Given** the operator opens `/events/import`, **When** the page renders, **Then** the shell composes `PageCanvas → CommandBand ("Import events" heading, eyebrow="Operations / Events / Import", body explaining the 6 stages) → ContactFormCard (file upload + source picker: CSV / Goodshuffle / PartySlate / Manual) → OperationalColumn ("Recent imports" listing the last 10 `EventImportWorkflow` rows with their current stage)`.
2. **Given** the operator uploads a CSV and clicks "Import", **When** POST `/api/events/imports/create` returns the new `EventImportWorkflow` ID, **Then** the page navigates to `/events/import/[workflowId]` and the operational column shows the 6 stage rows with the current stage highlighted (animating mono-label "RUNNING" indicator on active stage).
3. **Given** an import is in `validating` stage with row-level errors, **When** the operator clicks the "validating" stage row, **Then** an inline ResearchTable expands listing the failed rows, each with a `BlogFilterChip` for the error category (missing-required-field, invalid-date, unknown-venue, duplicate-event-number) and a "Fix and re-run" pill action.
4. **Given** the import reaches `activating`, **When** the workflow completes, **Then** the resulting `Event` rows are visible at `/events`, the import workflow row is marked `completed` with a green-600 status pill, and the operator is offered a "View imported events" pill that pre-filters the events list to `?importWorkflowId=<workflowId>`.

---

### User Story 6 — Operator generates an event report (Priority: P2)

After an event completes, the operator opens `/events/[eventId]/reports` to generate the post-event report (financials, guest satisfaction, kitchen performance, profitability vs budget, follow-up actions). Reports are templated but customizable per tenant.

**Why this priority**: Reports are the closing-the-loop surface — they are how event profitability and operational learning gets back to the executive team. Important for retention/upsell but not on the critical path for next week's event.

**Independent Test**: Given a completed event with budget actuals, profitability rows, and guest feedback, the operator can generate a report from a chosen template, preview it, and export it (PDF, CSV, email-attachment) without leaving the events module.

**Acceptance Scenarios**:

1. **Given** the operator opens `/events/[eventId]/reports`, **When** the page renders, **Then** the shell composes `PageCanvas → CommandBand ("Event reports" heading, primary "Generate report" pill, secondary "Email to client") → ResearchTable listing existing `EventReport` rows (title left, type pill center, generated-at mono-date right) → OperationalColumn ("Available templates": post-event-summary, financial-debrief, kitchen-performance, client-satisfaction, profitability-deep-dive)`.
2. **Given** the operator clicks "Generate report" and selects a template, **When** POST `/api/events/[eventId]/reports/create` completes, **Then** the new `EventReport` appears at the top of the ResearchTable with status pill "generating" → "ready". On "ready", the row links to `/events/[eventId]/reports/[reportId]` (preview).
3. **Given** the operator opens a generated report preview, **When** the preview renders, **Then** it is a `PageCanvas` with editorial typography (`ds-section-display` for title, `ds-section-heading` for sections, `MetricBand` for the financials row) — not a generic dashboard `<Card>` ladder. Export actions ("Download PDF", "Download CSV", "Email to client") sit in a CommandBand above the preview.

---

### User Story 7 — Operator coordinates contracts, budgets, staffing, and guests as sub-tabs (Priority: P2)

Within `/events/[eventId]`, the operator can drill into specialized sub-routes for contracts, budgets, staffing, and guest management. Each sub-route is a focused workspace with its own commands and listings, but inherits the same parent shell (event eyebrow, name in DisplayHeading, breadcrumb back to event detail).

**Why this priority**: These four sub-routes (`/events/[eventId]/contracts`, `/events/[eventId]/budgets`, `/events/[eventId]/staff`, `/events/[eventId]/guests`) are where the bulk of pre-event coordination happens. Each has a corresponding `_TODO` spec that is currently orphaned and must be cross-referenced from this parent contract.

**Independent Test**: From `/events/[eventId]`, the operator can navigate to each of the four sub-routes via the operational column, perform the headline action (sign contract, approve budget, assign staff, mark guest RSVP), and return to the parent event detail with the operational column reflecting the change. No sub-route is a generic CRUD page — each composes the page-shell primitives.

**Acceptance Scenarios**:

1. **Given** the operator clicks "Contracts" in the operational column of `/events/[eventId]`, **When** they land on `/events/[eventId]/contracts`, **Then** the page composes `PageCanvas → CommandBand ("Contracts" heading, eyebrow="Operations / Events / <eventNumber> / Contracts", primary "New contract" pill) → ResearchTable listing `EventContract` rows with status pill (draft/sent/signed/expired/voided)`. Cross-references `specs/sales/event-contract-management_TODO.md`.
2. **Given** the operator opens `/events/[eventId]/budgets`, **Then** the page composes the same shell with `MetricBand (budget total, committed, actuals, variance) → ResearchTable listing `BudgetLineItem` rows`. Cross-references `specs/sales/event-budget-tracking_TODO.md`.
3. **Given** the operator opens `/events/[eventId]/staff`, **Then** the page composes the shell with `OperationalColumn (sections: Required roles, Assigned, Unfilled, Conflicts) → ResearchTable per section`. Each row links to the assigned `User` and shows shift status pill. Cross-references `specs/scheduling/*` (parent module, separate spec).
4. **Given** the operator opens `/events/[eventId]/guests`, **Then** the page composes the shell with `MetricBand (total invited, confirmed, declined, awaiting RSVP, capacity remaining) → ResearchTable listing `EventGuest` rows`. Capacity warnings appear as warning-coral status pills when `confirmed > maxCapacity`.
5. **Given** the operator opens `/events/[eventId]/follow-ups` or `/events/[eventId]/waitlist`, **Then** the same sub-tab contract applies: PageCanvas → CommandBand → MetricBand or ResearchTable, hairline dividers, no `<Card>` ladder.

---

### Edge Cases

- **What happens when an event is multi-day** (a wedding weekend, a 3-day corporate retreat)? The Event model's `eventDate` is a single timestamp; multi-day events are modeled as either a parent event with linked child events (one per day) or via the `Event.notes` JSON field. Per `specs/kitchen/event-timeline-builder_TODO.md`, the timeline-builder UI is the canonical surface for multi-day coordination — the events list shows one row per parent event with a "+ N days" pill annotation.
- **What happens when guest count exceeds `maxCapacity`** during RSVP? The `EventGuest` create command MUST refuse the new RSVP and emit a domain event so the waitlist surface (`/events/[eventId]/waitlist`) auto-adds the guest. The events list MetricBand surfaces a "capacity exceeded" warning-coral pill.
- **What happens when a contract expires** (signature window passes without signature)? The cron job `cron/contract-expiration-alerts` (currently missing per `AGENTS.md` Cron Schedule Registry) MUST be added to `vercel.json` before this spec is considered fully wired. The events list surfaces an "overdue contracts" MetricBand cell that links to a pre-filtered list.
- **What happens when AI summary confidence is below 0.5** (model not confident in its own output)? The `EventSummary` operational column row renders with a warning-coral confidence pill and the body is collapsed by default with a "Show low-confidence summary" affordance — operators MUST opt in to see it, preventing low-quality AI text from being mistaken for verified facts.
- **What happens when an event is imported with a venue that does not exist** in the `Location` table? The import workflow's `validating` stage flags the row, the `validating` UI offers an inline "Create venue" or "Map to existing" affordance, and the workflow does not proceed to `reserving` until every row's venue is resolved.
- **What happens when the Goodshuffle sync is in flight** while an operator opens `/events`? The events list MUST render the current snapshot (do not block on the sync), but a `MonoLabel` eyebrow above the MetricBand reads "SYNC IN PROGRESS — last update <timestamp>". Cross-references `specs/administrative/goodshuffle-event-sync_TODO.md`.
- **What happens when a battle board has zero votes after 24h**? The board's status pill flips from `active` to `stale` and the parent event detail surfaces a "Battle board needs attention" line in the operational column.
- **What happens when an event is cancelled** after contracts/budgets/staffing already exist? The cancel command MUST cascade-soft-delete the `EventContract`, `EventStaff`, and `EventGuest` rows; the budget rows are retained (financial history) but flagged `cancelledAt`. The events list status pill turns slate (not red) — cancellation is operational, not error.

## Requirements *(mandatory)*

### Functional Requirements

#### FR-1xx — Composition (what every events page MUST use)

- **FR-101**: `/events` (events list) MUST compose `PageCanvas → CommandBand → MetricBand → BlogFilterChip cluster → ResearchTable` per User Story 1. The current implementation at `apps/app/app/(authenticated)/events/page.tsx` is the §2C reference (3/3 score per `IMPLEMENTATION_PLAN.md` item 13) — preserve its shell as the canonical example.
- **FR-102**: `/events/[eventId]` (event detail) MUST compose `PageCanvas → CommandBand (event-name DisplayHeading, eyebrow=`Operations / Events / <eventNumber>`, lede=client/venue/date, primary "Edit event" pill, ≥2 secondary actions) → MetricBand (≥4 cells) → OperationalColumn` per User Story 2.
- **FR-103**: Sub-routes under `/events/[eventId]/*` (battle-board, contracts, budgets, staff, guests, reports, follow-ups, waitlist) MUST inherit the parent eyebrow taxonomy (`Operations / Events / <eventNumber> / <SubRouteTitle>`) and place their own `DisplayHeading` (the sub-route title) below the eyebrow. Breadcrumb-back is the eyebrow link, not a separate "back" button.
- **FR-104**: `/events/import` and `/events/import/[workflowId]` MUST compose the import workflow visualization as an `OperationalColumn` with one row per stage (extracting / parsing / validating / reserving / proposing / activating), each row showing stage status pill, mono-label timestamp, and a "View details" affordance for failed/in-progress stages.
- **FR-105**: `/events/new` MUST use `ContactFormCard` per §5.1 FR-103, with the field stack: title, client picker, location picker, event date+time, guest count, event type chip group, notes. Field labels use `MonoLabel` for taxonomy fields (event type, status), plain caption for free-text fields.
- **FR-106**: `/events/[eventId]/battle-board` MUST render either an Empty primitive (no board exists) or a three-column operational layout (Nominated / Voting / Finalized) — never a generic shadcn `<Tabs>` + `<TabContent>` shell.
- **FR-107**: `/events/[eventId]/reports/[reportId]` (report preview) MUST compose `PageCanvas → CommandBand (export actions) → editorial body` with the report rendered using `ds-section-display`/`ds-section-heading`/`MetricBand` typography — not a dashboard `<Card>` ladder.
- **FR-108**: Status pills across events surfaces MUST use the canonical taxonomy: `tentative` (slate), `confirmed` (green-600), `in-progress` (action-blue), `completed` (deep-green), `cancelled` (slate strike-through), `overdue` (warning-coral). Use `BlogFilterChip` for filters and `StatusPill` from page-shell for inline status — never raw shadcn `<Badge>`.

#### FR-2xx — Forbidden patterns (events-specific in addition to §5.1 FR-2xx)

- **FR-201**: No events page MUST render an event row as a `<Card>` opener. The events list MUST be a `ResearchTable` per FR-101. Card-grid layouts for events are an explicit anti-pattern carried over from the legacy template.
- **FR-202**: No events page MUST hardcode an event-type or status color outside the FR-108 taxonomy. The `unified-calendar.tsx` 9-pastel mapping (per `IMPLEMENTATION_PLAN.md` §2C.6) is the documented exception, scoped to the calendar surface only.
- **FR-203**: No events page MUST render the AI summary as raw text without the confidence pill and `MonoLabel` "AI summary" eyebrow. Stripping the provenance signal is forbidden — operators MUST be able to distinguish AI-generated text from human-authored notes at a glance.
- **FR-204**: No events page MUST mutate event status via a free-text dropdown. Status transitions MUST go through dedicated commands (`POST /api/events/[eventId]/confirm`, `/cancel`, `/start`, `/complete`) so the domain events are emitted and the audit trail is preserved.
- **FR-205**: No events sub-route MUST issue a write directly to a related entity without routing through the corresponding manifest command. E.g. `EventGuest` writes go through `POST /api/events/[eventId]/guests/create`, not a generic `POST /api/event-guests/create`. This preserves the parent-event invariants (capacity check, waitlist trigger, RSVP deadline).
- **FR-206**: No events page MUST render contracts, budgets, staff, or guest lists as a generic shadcn `<Table>`. Each MUST use `ResearchTable` per §5.1 FR-102. Tabular numeric reporting (e.g. profitability deep-dive table) is the exception per §5.1 FR-102.

#### FR-3xx — Data contract (entities and commands)

- **FR-301**: The events module reads from and writes to: `Event` (core), `EventBudget`, `BudgetLineItem`, `BudgetAlert`, `EventContract`, `ContractSignature`, `EventStaff`, `EventGuest`, `EventDish`, `EventReport`, `EventSummary`, `EventProfitability`, `BattleBoard`, `EventImportWorkflow`, `AllergenWarning`, `Proposal`, `ProposalLineItem`. Cross-tenant scoping is enforced by RLS on each `tenant_*` schema.
- **FR-302**: Every events write command MUST be discoverable in `packages/manifest-ir/dist/routes.manifest.json`. The current 21 API directories under `apps/api/app/api/events/` and adjacent (`battle-boards/`, `event-dishes/`, `event-guests/`, etc.) MUST each be in the manifest IR.
- **FR-303**: The 80+ events-domain commands documented in the survey (event lifecycle, guests, contracts, budgets, reports, staff, battle boards, catering, allergens, profitability, summaries, follow-ups, import workflows) MUST persist via PrismaStore-backed manifest commands per `AGENTS.md` "Critical Write Validation" section. No command may write to a Manifest/JSON store while the read API queries Prisma.
- **FR-304**: `EventSummary` rows generated by AI MUST include `confidence: float` and `generatedAt: timestamp` fields. The AI summary command (`POST /api/events/[eventId]/summaries/create`) MUST be idempotent on `(eventId, generatedAt)` so re-runs do not duplicate summaries — they update the latest row in place.

#### FR-4xx — Import workflow stages

- **FR-401**: Every `EventImportWorkflow` row MUST progress through the 6 stages in order: `extracting → parsing → validating → reserving → proposing → activating`. Skipping a stage is forbidden; rolling back a stage requires explicit operator action ("Reset workflow") that emits a `WorkflowReset` domain event.
- **FR-402**: Each stage MUST persist its own `startedAt`, `completedAt`, `status` (pending / running / succeeded / failed / skipped), and per-row error array. The operational column visualization (FR-104) reads these fields directly — no aggregation in the UI layer.
- **FR-403**: The `validating` stage MUST emit per-row error reasons from a closed enum: `missing-required-field`, `invalid-date`, `unknown-venue`, `duplicate-event-number`, `client-not-found`, `capacity-exceeds-venue`, `currency-mismatch`. Free-text error messages are forbidden in this stage.
- **FR-404**: The `proposing` stage MUST create draft `Event` rows with `status='tentative'` and link them to the import workflow via `Event.importWorkflowId`. The `activating` stage flips them to `status='confirmed'` (or whatever the operator selected as the target status during file upload).
- **FR-405**: Goodshuffle and PartySlate imports MUST use the same 6-stage workflow as CSV imports — the source-specific extractor lives in the `extracting` stage only. This keeps the operator's mental model consistent across all import sources. Cross-references `specs/administrative/goodshuffle-event-sync_TODO.md`.

#### FR-5xx — Battle board mechanics

- **FR-501**: A `BattleBoard` is created lazily on first navigation to `/events/[eventId]/battle-board` — never auto-created at event creation time. Empty states are first-class per §5.1 FR-105.
- **FR-502**: Vote commands (`POST /api/battle-boards/[boardId]/vote`) MUST enforce one-vote-per-user-per-dish. A user changing their vote on a dish replaces the prior vote (not a tally increment). The vote tally is computed server-side; the UI shows an optimistic delta but reconciles on response.
- **FR-503**: Finalize commands (`POST /api/battle-boards/[boardId]/finalize-dish`) MUST be authorized to the event lead role only (operators with `event_lead` capability on the event). Other operators see the "Finalize" affordance disabled with a tooltip explaining the role requirement.
- **FR-504**: When a board's last dish is finalized, the board's status flips to `closed` and any pending votes are dropped (not retroactively counted). The closed board remains visible at `/events/[eventId]/battle-board` as a historical record.
- **FR-505**: A finalized dish MUST create an `EventDish` row linking the event to the dish. This is what the run sheet (Execution view) and the proposal generator both read from.

#### FR-6xx — Reports

- **FR-601**: The 5 canonical report templates are: `post-event-summary`, `financial-debrief`, `kitchen-performance`, `client-satisfaction`, `profitability-deep-dive`. Tenants MAY add custom templates via the `EventReport.templateId` field — custom templates MUST live under `tenant_reports.report_templates` (separate spec, out of scope here).
- **FR-602**: The `profitability-deep-dive` template is the documented exception to FR-206 — it renders true tabular numeric data (line items × cost categories × variance) and may use a generic `<Table>` from shadcn.
- **FR-603**: Report generation is async — the create command returns immediately with the `EventReport` row in `status='generating'`, and a background worker computes the report content. The UI MUST poll or subscribe for status flip to `ready`. Polling cadence: 2s exponential backoff to 30s.
- **FR-604**: Report preview MUST render server-side (no client-side hydration of report content) so that the PDF export and the in-browser preview share the same rendering pipeline. Cross-references `specs/sales/event-proposal-generation_TODO.md` for the parallel proposal-rendering pipeline.

#### FR-7xx — Cross-spec stitching

- **FR-701**: This spec is the parent contract for the seven `_TODO` event-related specs:
  - `specs/kitchen/event-budget-tracking_TODO.md` → governed by `/events/[eventId]/budgets` (User Story 7.2)
  - `specs/kitchen/event-contract-management_TODO.md` → governed by `/events/[eventId]/contracts` (User Story 7.1)
  - `specs/kitchen/event-import-export_TODO.md` → governed by `/events/import` (User Story 5)
  - `specs/kitchen/event-proposal-generation_TODO.md` → governed by the "Generate proposal" action on `/events/[eventId]` (User Story 2.4)
  - `specs/kitchen/event-timeline-builder_TODO.md` → governed by the timeline view on `/events/[eventId]` (User Story 2 + multi-day edge case)
  - `specs/ai/ai-event-summaries_TODO.md` → governed by the AI summary section in the operational column of `/events/[eventId]` (User Story 2.2)
  - `specs/administrative/goodshuffle-event-sync_TODO.md` → governed by `/events/import` Goodshuffle source (User Story 5 + FR-405)
- **FR-702**: When any of the seven `_TODO` specs is graduated (renamed from `*_TODO.md` to `*.md`), this parent spec MUST be updated in the same PR to reference the graduated path. Orphaned `_TODO` references are tech debt by definition.
- **FR-703**: Sub-spec authoring MUST follow the §5.1 + this spec's compositional contract. A sub-spec MUST NOT introduce a new top-level shell pattern, new status taxonomy, or new entity that conflicts with FR-3xx.

### Key Entities

- **Event**: Core event record. Fields: `id`, `tenantId`, `eventNumber` (sequential per-tenant), `title`, `clientId`, `locationId`, `venueId`, `venueEntityId`, `eventType` (wedding/corporate/social/tasting), `eventDate`, `guestCount`, `maxCapacity`, `status` (tentative/confirmed/in-progress/completed/cancelled), `budget`, `ticketPrice`, `ticketTier`, `eventFormat`, `accessibilityOptions`, `featuredMediaUrl`, `assignedTo`, `venueName`, `venueAddress`, `notes`, `tags`, `templateId`, `importWorkflowId`, timestamps + soft-delete.
- **EventBudget**: 1:1 with Event. Owns committed totals and aggregations across `BudgetLineItem` rows.
- **BudgetLineItem**: N:1 to Event. Per-category budget rows (food, beverage, labor, equipment, venue, contingency).
- **BudgetAlert**: N:1 to Event. Threshold-based alerts (e.g. 80% of budget consumed).
- **EventContract**: N:1 to Event. Each contract has version history via `ContractSignature`.
- **ContractSignature**: N:1 to EventContract. Signature events with timestamp, signatory, IP, signature method.
- **EventStaff**: N:1 to Event. Per-role staffing (chef, server, bartender, coordinator) with assigned User and shift.
- **EventGuest**: N:1 to Event. RSVP records with dietary restrictions, plus-one count, table assignment.
- **EventDish**: N:1 to Event, N:1 to Dish. Linkage created when a battle board finalizes a dish or when a menu is attached.
- **EventReport**: N:1 to Event. Generated from a template; status: generating/ready/failed.
- **EventSummary**: N:1 to Event. AI-generated narrative summary with `confidence` and `generatedAt`.
- **EventProfitability**: 1:1 with Event. Computed actuals vs budget rolled up post-event.
- **BattleBoard**: 1:1 with Event (lazy). Three columns of dish nominations: nominated, voting, finalized.
- **EventImportWorkflow**: N:1 to import source. 6-stage state machine (extracting → parsing → validating → reserving → proposing → activating).
- **AllergenWarning**: N:1 to Event (via guest dietary data + dish allergen data). Surfaced in the event detail operational column.
- **Proposal / ProposalLineItem**: N:1 to Event. Sales-side proposal artifact generated from the event's menu + budget + venue.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of pages under `apps/app/app/(authenticated)/events/*` score 3/3 against §5.1 FR-501 + this spec's FR-1xx composition rules. Current baseline: 1 of 8 top-level pages scored 3/3 in `IMPLEMENTATION_PLAN.md` item 13 (events/page.tsx). Target: 8 of 8 + ≥ 12 nested sub-routes.
- **SC-002**: Operator can answer "what is the next event happening this week?" within 2 seconds of opening `/events`. Verified by 5-operator usability test, ≥ 4 of 5 succeeding (User Story 1 acceptance).
- **SC-003**: Event detail page (`/events/[eventId]`) loads with all operational column sections populated within 1.5s p95 on cold cache, 500ms p95 on warm cache. Measured via real-user monitoring on production tenants with ≥ 50 events.
- **SC-004**: Planning ↔ Execution tab toggle (User Story 3) does not refetch the event header — verified by network panel showing zero requests on toggle. Measured via Playwright network assertion.
- **SC-005**: Import workflow completes the full 6-stage pipeline for a 100-row CSV in under 30s p95 on a tenant with no prior data. Failed-row count is reported accurately within ±0 of the input file's actual malformed rows.
- **SC-006**: Battle board vote command round-trip (click → optimistic update → server reconcile) completes in under 200ms p95. Measured via Playwright timing in the battle-board E2E spec.
- **SC-007**: All 7 `_TODO` event-related sub-specs are cross-referenced from this parent spec (FR-701) — verified by greppable presence of each sub-spec path in this document. When a sub-spec is graduated, FR-702 enforces the rename.
- **SC-008**: §3.6/§3.7/§3.8/§3.11/§3.12 cross-cutting counts (per `IMPLEMENTATION_PLAN.md`) on files under `apps/app/app/(authenticated)/events/*` drop to 0. Current baseline TBD per next audit pass; target: 0 across all 5 sweeps on every events file.
- **SC-009**: Every events write command listed in FR-302 is discoverable in `packages/manifest-ir/dist/routes.manifest.json` (POST handlers) — verified by `pnpm manifest:routes:ir -- --format summary | grep events` returning ≥ 80 entries.
- **SC-010**: Every events read API has corresponding write paths that persist through PrismaStore (per `AGENTS.md` Critical Write Validation). Verified by E2E product-flow test that submits via UI and re-reads via list API, asserting equality. Target: 0 commands writing to Manifest/JSON store while read API queries Prisma.
- **SC-011**: Cron job `cron/contract-expiration-alerts` is added to `apps/api/vercel.json` per the AGENTS.md Cron Schedule Registry "missing" list. Without this entry, FR contract-expiration edge case is not actually wired in production.
- **SC-012**: `EventSummary.confidence < 0.5` rows are collapsed by default in the operational column (FR-203 + Edge Case "low AI confidence"). Verified by Playwright assertion that low-confidence summary body has `aria-hidden="true"` until operator opt-in.

## Cross-references

- `specs/general/design-system-shell.md` — §5.1 parent design contract. Every events page inherits its FR-1xx / FR-2xx / FR-3xx rules.
- `specs/kitchen/event-budget-tracking_TODO.md` — sub-spec for `/events/[eventId]/budgets` (FR-701).
- `specs/kitchen/event-contract-management_TODO.md` — sub-spec for `/events/[eventId]/contracts` (FR-701).
- `specs/kitchen/event-import-export_TODO.md` — sub-spec for `/events/import` (FR-701).
- `specs/kitchen/event-proposal-generation_TODO.md` — sub-spec for the "Generate proposal" action (FR-701).
- `specs/kitchen/event-timeline-builder_TODO.md` — sub-spec for timeline + multi-day events (FR-701).
- `specs/ai/ai-event-summaries_TODO.md` — sub-spec for AI summary section (FR-701).
- `specs/administrative/goodshuffle-event-sync_TODO.md` — sub-spec for Goodshuffle import source (FR-701).
- `IMPLEMENTATION_PLAN.md` §2C item 13 (events/page.tsx 3/3 reference), §5.2 (this spec entry), §3.x cross-cutting sweeps.
- `AGENTS.md` — Cron Schedule Registry (FR contract-expiration), Critical Write Validation (FR-303), Schema ↔ Migrations ↔ Code Drift (Event maxCapacity field resolved 2026-04-28).
- `apps/app/app/(authenticated)/events/page.tsx` — canonical 3/3 reference for events list shell.
- `apps/api/app/api/events/` + 21 sibling directories — events-domain command surface (80+ commands).
- `packages/database/prisma/schema.prisma` — Event + 16 related models (FR-301).

## Out of scope

- Mobile-kitchen agent surface for events (`apps/app/app/(mobile-kitchen)/events/*`) — operational pattern, separate spec required.
- Native mobile app events surface (§4.28) — platform unspecified, separate spec.
- Marketing site event landing pages (`apps/web/app/events/*`) — distinct three-zone nav contract owned by web shell spec.
- Custom report template authoring UX (FR-601) — tenant-customization surface, separate spec under `specs/general/`.
- Cross-tenant event sharing / federation — not a current requirement.
- Recurring event series (weekly tasting events, monthly chef's-table) — modeled today as N independent events; recurrence engine is a separate spec.
- Calendar-view rendering of events (`/calendar`) — owned by `specs/calendar/SPEC.md` (§5.6), this spec covers only `/events/*` URL space.
- Scheduling / staff-shift management beyond the per-event staffing summary in User Story 7.3 — owned by `specs/staffing/SPEC.md` (§5.7).
