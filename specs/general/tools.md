# Feature Specification: Tools Module (Battleboards, Autofill, AI Helpers, Conflict Detection)

**Feature Branch**: `general/tools`
**Created**: 2026-05-02
**Status**: Draft
**Input**: User description: "Codify the `/tools` module — the operator-facing utilities surface that bundles battleboard generation, report autofill, AI helpers (suggestions, summaries, bulk task generation), and conflict detection. Ship-or-hide decision per IMPLEMENTATION_PLAN.md §7.4 must be resolved by this spec."

> **Why this spec exists.** The Tools module ships today as four sub-routes (`/tools/battleboards`, `/tools/autofill-reports`, `/tools/ai`, `/tools/conflicts`) plus the landing at `/tools`. The landing already delegates to `ModuleLanding` (Cohere-aligned, scored 3/3 in §2C.10). The four sub-routes are STUB-level: a 523–699-byte server `page.tsx` plus a heavy bare-`<Card>` client (`battleboards-client.tsx` ≈ 1,040 lines, `autofill-reports-client.tsx` ≈ 1,082 lines, `ai-client.tsx` ≈ 668 lines, `conflicts-client.tsx` ≈ 631 lines) that violate §3.6 (`text-3xl font-bold`), §3.7 (shadows), §3.8 (pastel `bg-amber-50` etc.), and §3.11 (bare `<Card>`). The functional behavior is real and wired to live API endpoints (`/api/command-board`, `/api/events/reports`, `/api/events/documents/parse`, `/api/kitchen/waste/reports`, `/api/ai/suggestions`, `/api/ai/summaries/[id]`, `/api/conflicts/detect`); only the visual contract drifts. This spec is the rubric the §2C.10 sub-route rework will be scored against, and the place where the §7.4 "ship or hide" decision is recorded.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Event lead generates a battleboard for an upcoming event (Priority: P1)

An event lead navigates to `/tools/battleboards`, sees the existing battleboards as a `ResearchTable` row stack (not a card grid), creates a new board scoped to a specific event, and finalizes it after a voting/ranking pass over the candidate dishes. The finalized board is the kitchen-side production source of truth referenced by `specs/events/SPEC.md` §3 (kitchen handoff).

**Why this priority**: Battleboards are the primary operator-facing output of the Tools module — the artifact that bridges the events spec (§5.2) to the kitchen production board. Every other Tools surface is a helper.

**Independent Test**: An event lead with at least one event in `draft` or `confirmed` state can: (1) open `/tools/battleboards`, (2) click "New board" and pick an event from a search-typeahead, (3) move boards between `draft → active → archived` status, (4) finalize a board that becomes the canonical menu artifact for the linked event. The post-finalize board is fetched by the kitchen production view via `/api/command-board/{boardId}` and renders without re-fetching.

**Acceptance Scenarios**:

1. **Given** the event lead opens `/tools/battleboards`, **When** the page renders, **Then** the layout uses `PageCanvas → CommandBand → DisplayHeading → CommandBandActions → MetricBand (total / active / templates / total cards) → ResearchTable` per `specs/general/design-system-shell.md` FR-101/FR-102 — not the current bare-`<Card>` grid in `battleboards-client.tsx`.
2. **Given** the event lead clicks "New board", **When** the create dialog opens, **Then** the panel uses `ContactFormCard` (22px radius, 32px padding, pill primary submit, pill-outline cancel) per FR-103 — not the current shadcn `<Dialog>` + bare-`<Card>` body.
3. **Given** the event lead links a board to an event by ID, **When** the link succeeds, **Then** the `BattleBoard.eventId` (or `CommandBoard.eventId`, see Edge Cases) FK is set and the linked event surfaces the board in its detail view per `specs/events/SPEC.md` §3.

---

### User Story 2 — Operator autofills a pre-event review checklist from an uploaded document (Priority: P1)

A coordinator drags a PDF or CSV (vendor-supplied event briefing) onto `/tools/autofill-reports → Document Parser`, the parser extracts menu items, staff shifts, and event details, and the coordinator clicks "Apply to Event" to push the parsed data into a draft `EventReport` linked to a target event. The resulting report is a canonical pre-event review checklist (per `specs/events/SPEC.md` §4 report templates).

**Why this priority**: Report autofill is the second-most-touched surface in Tools and the only one that materially shortens event setup time. It also produces the canonical `EventReport` rows the events spec depends on.

**Independent Test**: A coordinator with one PDF and one event in `draft` state can: (1) open `/tools/autofill-reports`, (2) drag a PDF onto the upload zone, (3) click "Parse Document", (4) see structured menu items, staff shifts, and event details, (5) click "Apply to Event" to create an `EventReport` row with `parsedEventData` populated and `autoFillScore` set, (6) see the report appear in the Event Reports tab with status `draft` and the correct `eventName` link.

**Acceptance Scenarios**:

1. **Given** the coordinator opens `/tools/autofill-reports`, **When** the page renders, **Then** tabs use the design-system `<Tabs>` (pill-outline, not `border-b`) per FR-205 and the empty/error/loading states use the soft-stone `Empty` primitive per FR-105 — not the current bare-`<Card>` empty cards.
2. **Given** the coordinator generates an event report by entering an event ID, **When** the create command succeeds, **Then** the resulting row in `tenant_events.event_reports` has `status='draft'`, `completion=0`, `version='2025-01-01'`, and `checklistData` defaulting to the canonical EventChecklist structure referenced in `specs/events/SPEC.md` §4.
3. **Given** the coordinator views the Waste Reports tab, **When** the report loads, **Then** the four summary metrics (`totalCost`, `totalQuantity`, `entryCount`, `avgCostPerEntry`) sit in a `MetricBand` row and the entries below render as `ResearchTable` rows — not the current `StatCard` + bare-`<Card>` ladder.

---

### User Story 3 — Operator triages AI suggestions and applies one (Priority: P2)

An operator opens `/tools/ai → AI Suggestions`, picks a timeframe (`today | week | month`), generates a suggestion set, scans the priority + category + type pills, and clicks "Take Action" on a `navigate` suggestion (e.g. "Resolve overlap on event X" → `/events/X/staffing`). The suggestion log is observability-only — there is no per-suggestion persistence beyond the session.

**Why this priority**: Suggestions are an assistive surface, not a system of record. Useful but not blocking. Bulk task generation (third tab) is similarly assistive but materially shortens kitchen-prep handoff.

**Independent Test**: An operator with at least one event in the next 7 days can: (1) open `/tools/ai`, (2) select "This Week" and click "Generate Suggestions", (3) see ≥ 1 suggestion card with priority/category/type pills, (4) click "Take Action" on a `navigate` suggestion and arrive at the target route, (5) switch to the "Task Generator" tab and generate prep tasks for a known event ID with a guest count. Generated tasks render grouped by `stationName` with offset-day labels relative to the event date.

**Acceptance Scenarios**:

1. **Given** the operator opens `/tools/ai`, **When** the page renders, **Then** filter pills (timeframe, priority, category, type) use `BlogFilterChip` (coral taxonomy) per FR-104 — not the current `<Button variant="outline">` ladder.
2. **Given** the operator generates an event summary by ID, **When** the API returns `summary`, `highlights`, and `criticalInfo`, **Then** the critical-info card renders inside the `Empty`/soft-stone tile contract (NOT the current `border-amber-200 bg-amber-50/50` decorative pastel that violates FR-203).
3. **Given** the operator runs the bulk task generator, **When** results render, **Then** each `TaskGroup` is a `SectionHeader + ResearchTable` block (NOT the current bare-`<Card>` per group).

---

### User Story 4 — Operator detects and triages cross-domain conflicts (Priority: P2)

A scheduler opens `/tools/conflicts`, clicks "Detect Conflicts" for the next 14 days across all detectors (`scheduling, staff, equipment, inventory, venue`), reviews critical/high conflicts in the unified list, expands resolution options on a specific conflict, and either navigates into the affected entity (event, employee, equipment) or accepts a `reassign | reschedule | substitute | cancel | split` recommendation.

**Why this priority**: Conflict detection is the operator's safety net. It is currently a single unified UI feeding from four detector backends (`employee`, `equipment`, `inventory`, `venue`) per the `/api/conflicts/detect` payload. This spec ratifies the unified-UI choice and resolves §7.7 (the "single panel vs four pages" open question).

**Independent Test**: A scheduler with at least one known overlap (e.g. an employee assigned to two concurrent events) can: (1) open `/tools/conflicts`, (2) click "Detect Conflicts" with `entityTypes` defaulting to all five detector types, (3) see the overlap as a `Conflict` card with `severity` ≥ `high`, (4) expand resolution options, (5) navigate into the affected event or employee from the entity-link pills.

**Acceptance Scenarios**:

1. **Given** the scheduler opens `/tools/conflicts`, **When** the page renders, **Then** the five tabs (`all, employee, equipment, inventory, venue`) use design-system `<Tabs>` (pill-outline) per FR-205 and the summary row uses `MetricBand` (total / critical / high / medium / low) per FR-101 — not the current `StatCard` ladder.
2. **Given** the scheduler runs detection and one detector fails, **When** the API returns `warnings: [{ detectorType, message }]`, **Then** the warning surface uses the soft-stone `Empty` tile (not the current `border-amber-200 bg-amber-50/50` pastel that violates FR-203). Per-detector failure does not abort the run.
3. **Given** the scheduler has no conflicts, **When** the "all clear" empty state renders, **Then** it composes the soft-stone tile (icon, heading, body, optional CTA) per FR-105 — not the current bare-`<Card>` empty card with `text-green-700`.

---

### User Story 5 — Reviewer audits a finalized battleboard or report (Priority: P3)

A reviewer (operations manager, accountant) opens a finalized battleboard or completed report and verifies the finalization timestamp, source document attribution, and reviewer signature. Append-only — once finalized, content cannot be edited; only superseded by a new version.

**Why this priority**: Auditing is rare but high-trust. The behavior is observable today via `BattleBoard.status`, `EventReport.status`, `reviewedBy`, `reviewedAt`, but no UI surfaces the audit trail. Ship the spec; the UI work follows in §6.

**Independent Test**: A reviewer can: (1) open a finalized battleboard, (2) see `Finalized by {reviewer.name} on {reviewedAt}` in the detail header, (3) attempt to edit and see the action disabled with a tooltip pointing at the version history, (4) open an EventReport with `status='approved'` and see `reviewedBy + reviewedAt + reviewNotes` in the header.

**Acceptance Scenarios**:

1. **Given** the reviewer opens a finalized battleboard, **When** the detail view renders, **Then** the edit/delete actions are disabled and a `MonoLabel` eyebrow shows `FINALIZED · {reviewedAt}`.
2. **Given** the reviewer opens a `status='approved'` report, **When** the detail renders, **Then** `reviewNotes` are visible verbatim and the `autoFillScore` is shown as a `Badge` with the `BlogFilterChip` coral taxonomy.

---

### Edge Cases

- **What happens when the `/tools` landing claims a sub-route that ships ahead of its rework** (current state — landing is 3/3, sub-routes are 1/3)? Per `specs/general/design-system-shell.md` Edge Cases, the landing surfaces a "Spec pending" `MonoLabel` row inside the `OperationalColumn` for any sub-route still scored 1/3, so the gap is visible to operators rather than hidden.
- **What happens when a user creates a "battleboard" — does it write to `BattleBoard` or `CommandBoard`?** **RESOLVED:** the canonical battleboard model is `CommandBoard` (`tenant_events.command_boards`). The `/tools/battleboards` UI writes via `/api/command-board` to `CommandBoard` records (`name`, `description`, `cards` via `CommandBoardCard` children, `status`, optional `eventId`). The separate `BattleBoard` model (`tenant_events.battle_boards`) is a document-import-shaped artifact (`document_url`, `source_document_type`, `boardData` JSON, `schema_version='mangia-battle-board@1'`) used by vendor-import workflows, not by the user-facing battleboard creation. Rationale for the split: `CommandBoard` has rich relational structure (cards, groups, connections, layouts, projections, annotations); `BattleBoard` is a JSON blob optimized for one-shot ingestion. UI labeling is correct — "battleboard" in the UI consistently refers to `CommandBoard` instances. The two models do not share a FK and are not converted between; vendor imports land as `BattleBoard` rows and stay there until an operator copies content into a new `CommandBoard`.
- **What happens when document parsing extracts unexpected schema** (e.g. a vendor PDF with a "Bar Menu" section the parser doesn't know)? Unknown sections are surfaced as `parsedEventData.unmatched[]` and rendered as a "Review manually" tile. They are NOT silently dropped.
- **What happens when an AI suggestion's `action` is type `api_call` (not `navigate`)**? The current UI handles `navigate` only; `api_call` actions are silently ignored. [NEEDS CLARIFICATION: confirm scope — should `api_call` execute server-side with a confirmation dialog, or should `api_call` actions be hidden in the UI until the confirmation flow exists?]
- **What happens when conflict detection times out for one detector** (e.g. the `inventory` detector takes > 5s)? The orchestrator returns `warnings: [{ detectorType: 'inventory', message: '...' }]` and the UI renders the rest. The detection result is partial but actionable.
- **What happens when bulk task generation produces a task referencing a `dishId` that no longer exists** (e.g. the dish was deleted between event creation and generation)? The generator returns the task with `dishId: null` and `dishName: '<deleted>'`. The user is prompted to either re-link or remove before persisting via `/api/kitchen/prep-tasks/commands/create-bulk`.
- **What happens to `/tools` if §7.4 resolves "hide from nav until specs land"?** The landing remains accessible via direct URL but is removed from the global sidebar. The four sub-routes stay live (no API changes). The decision criterion (record in this spec, not in `IMPLEMENTATION_PLAN.md`): all four sub-routes must satisfy `design-system-shell.md` FR-501 (3/3) AND every entity referenced (BattleBoard, CommandBoard, EventReport, AdminTask, AiEventSetupSession) must have an active manifest. Until both gates pass, the recommendation is **ship in this design pass** — the functional surfaces are real and load-bearing.

## Requirements *(mandatory)*

### Functional Requirements

#### FR-1xx — Module landing & shell contract (inherits design-system-shell)

- **FR-101**: `/tools/page.tsx` MUST delegate to `ModuleLanding` from `@repo/design-system/components/blocks/module-landing.tsx` with `linkComponent={Link}`. Current state: compliant (16-line file). Do not regress.
- **FR-102**: Each Tools sub-route landing (`battleboards`, `autofill-reports`, `ai`, `conflicts`) MUST satisfy `specs/general/design-system-shell.md` FR-101..106, FR-201..207, FR-301..304. Score target: 3/3 per FR-501. Current baseline: 1/3 (all four).
- **FR-103**: The Tools landing `OperationalColumn` MUST surface one row per sub-route with: title (link), one-line summary, primary KPI from the sub-route (e.g. "12 active boards", "3 critical conflicts"), `MonoLabel` eyebrow showing sub-route status (`READY | SPEC PENDING | DRAFT`).

#### FR-2xx — Battleboards (`/tools/battleboards`)

- **FR-201**: List view MUST render boards as a `ResearchTable` (title left, status pill center, mono-date right, hairline divider). Filters (`status`, `is_template`, `event linked`) MUST use `BlogFilterChip`.
- **FR-202**: Create/edit form MUST be a `ContactFormCard`. Fields: `name` (required), `description` (textarea), `eventId` (search-typeahead, optional), `isTemplate` (checkbox). Submit pill primary, cancel pill-outline.
- **FR-203**: Detail view MUST render the header with `DisplayHeading` + `MonoLabel` eyebrow (`BATTLEBOARD · {status}`), the linked event as a `BlogFilterChip` (clickable), the cards subgrid as `ResearchTable` (title / type / status / position / color / updated), and tags as `BlogFilterChip` row.
- **FR-204**: Finalize action MUST mark the board immutable (no further edits) and write `reviewedBy + reviewedAt`. [NEEDS CLARIFICATION: `BattleBoard` schema currently lacks `reviewedBy/reviewedAt` fields — confirm whether finalization is a status-only transition (`active → archived`) or whether the schema gains review fields. `EventReport` already has both.]
- **FR-205**: Finalized boards MUST be referenceable from the linked event detail per `specs/events/SPEC.md` §3 (kitchen handoff). Persistence path: `Event.id ⇄ {BattleBoard|CommandBoard}.eventId`.

#### FR-3xx — Autofill Reports (`/tools/autofill-reports`)

- **FR-301**: Three tabs MUST be present: Event Reports (list + create), Document Parser (upload + parse + apply), Waste Reports (summary + entries). Tabs use design-system `<Tabs>` (pill-outline, FR-205 of design-system-shell). The `Tools / Autofill Reports` landing MUST NOT replicate the inner tabs as cards.
- **FR-302**: Event Reports list MUST be a `ResearchTable` filtered by `status` (`draft | complete | reviewed`) using `BlogFilterChip`. Generation creates a row in `tenant_events.event_reports` via `POST /api/events/reports/commands/create` with `eventId` body.
- **FR-303**: Document Parser MUST accept PDF and CSV (existing constraint — `accept=".pdf,.csv"`). Parse output structure: `{ menuItems[], staffShifts[], eventDetails, rawText? }`. The "Apply to Event" actions for each section MUST persist to a draft `EventReport.parsedEventData` and update `EventReport.autoFillScore`.
- **FR-304**: Waste Reports MUST consume `/api/kitchen/waste/reports?groupBy={reason|item|date}`. Summary metrics in `MetricBand`. Trends and entries in `ResearchTable` blocks. Currency formatting via `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })`. [NEEDS CLARIFICATION: tenant currency is hard-coded USD — confirm whether to thread a tenant currency setting per `specs/general/settings.md` §5.4.]
- **FR-305**: Async generation: report generation that takes > 2s MUST surface a progress state (loader pill in the row + toast on completion). [NEEDS CLARIFICATION: today the API is synchronous — confirm whether async generation is in scope for this design pass or deferred.]

#### FR-4xx — AI Helpers (`/tools/ai`)

- **FR-401**: Three tabs MUST be present: AI Suggestions, Event Summaries, Task Generator. Tabs use design-system `<Tabs>`.
- **FR-402**: AI Suggestions MUST consume `/api/ai/suggestions?maxSuggestions=5&timeframe={today|week|month}` and render `Suggestion` cards with: priority pill (`BlogFilterChip` coral for `high`, default for `medium`, ghost for `low`), category pill, type pill, description, `estimatedImpact`, and an action pill (currently `navigate`-only — see Edge Cases for `api_call`).
- **FR-403**: Event Summaries MUST consume `/api/ai/summaries/{eventId}` and render `summary`, `highlights[]`, `criticalInfo[]` in the soft-stone tile contract (FR-105 of design-system-shell), NOT in `border-amber-200 bg-amber-50/50` pastel cards.
- **FR-404**: Task Generator MUST consume `/api/ai/bulk-tasks/generate` (or equivalent — currently inferred from `bulk-task-generator.tsx`) and render generated tasks grouped by `stationName` with offset-day labels relative to the event date. Edit/delete per task before persisting via `/api/kitchen/prep-tasks/commands/create-bulk`.
- **FR-405**: AI session state (per-tab) MUST NOT persist beyond the page lifetime. **RESOLVED:** `AiEventSetupSession` is intentionally in-memory only — the manifest declaration (`packages/manifest-adapters/manifests/ai-event-setup-session.manifest.ts` line 94: `store AiEventSetupSession in memory`) explicitly opts out of Prisma persistence, and no model exists in `schema.prisma`. Sessions live for the duration of the originating wizard flow and are garbage-collected on tab close, page navigation, or server restart. Implication for FR-405: the per-tab state on `/tools/ai` MUST follow the same contract — no DB writes, no localStorage caching beyond the active session. If a future requirement needs cross-session persistence (e.g. resume a half-complete suggestion review), that is an explicit out-of-scope addition that requires a new Prisma model + migration + manifest update, not a silent localStorage hack.

#### FR-5xx — Conflict Detection (`/tools/conflicts`)

- **FR-501**: One unified UI MUST be the canonical surface (resolves §7.7 — "single unified `ConflictsPanel` vs four separate surfaces"). Decision: **unified panel with five tabs** (`all, employee, equipment, inventory, venue`).
- **FR-502**: Detection MUST consume `POST /api/conflicts/detect` with body `{ timeRange: { start, end }, entityTypes }` where `entityTypes` is filtered by the active tab.
- **FR-503**: Result rendering MUST: (a) show summary metrics in a `MetricBand` (total / critical / high / medium / low), (b) render each `Conflict` as a `ResearchTable` row with title, severity pill (`BlogFilterChip`), type pill, mono-date, (c) expand-to-detail (resolution options) inline via `<Collapsible>`, (d) render `affectedEntities` as link-pills routing into the matching module page (events, kitchen, inventory, scheduling, etc.). **Resolution options per conflict type** (canonical taxonomy — orchestrator MUST emit one or more of these per conflict):
  - **Scheduling** (`type: 'scheduling'`): `reschedule` (move event to alternate slot), `cancel` (cancel the conflicting event), `split` (split event across two slots). Required affected entity: `Event`.
  - **Staff** (`type: 'staff' | 'employee'`): `reassign` (replace the double-booked employee with a qualified peer), `split` (split the shift between two employees), `cancel-shift` (drop the conflicting shift). Required affected entities: `Employee` + ≥ 1 `ScheduleShift`.
  - **Equipment** (`type: 'equipment'`): `substitute` (swap to an equivalent equipment item from `Equipment` inventory), `reschedule` (move the dependent event), `cancel` (cancel the dependent event). Required affected entity: `Equipment`.
  - **Inventory** (`type: 'inventory'`): `substitute` (swap ingredient per `Recipe.substitutions`), `reduce-quantity` (lower the requested quantity to available stock), `cancel` (cancel the dependent prep task or event). Required affected entities: `Ingredient` + `Event` (or `PrepTask`).
  - **Venue** (`type: 'venue'`): `reschedule` (move event to alternate slot when venue free), `relocate` (move event to alternate venue), `cancel` (cancel the dependent event). Required affected entity: `Venue` (or `Event.venueId`).
- **FR-504**: Per-detector failures MUST surface as a single hairline-bordered `Empty` tile listing the failing detectors. Successful detectors render alongside. The detection MUST NOT abort on partial failure.
- **FR-505**: The "no conflicts" empty state MUST use the soft-stone tile contract (FR-105 of design-system-shell), with a `CheckCircle2` icon, "All clear for the next 14 days" body, and pill-outline "Run again" CTA.

#### FR-6xx — Cross-cutting tokens & boundaries

- **FR-601**: All four sub-routes MUST drop `text-3xl font-bold`, `border-amber-200`, `bg-amber-50/50`, `bg-blue-600`, `text-yellow-500`, `text-green-600`, `text-red-600`, `text-orange-600` ad-hoc utilities in favor of the `--ds-*` token surface (FR-303 of design-system-shell). Severity color must come from a single helper that maps to the design-system semantic tokens.
- **FR-602**: All four sub-routes MUST drop bare `<Card>` openers in favor of `tone="canvas|stone|ink"` `<Card>` invocations once §0.7 cva extension lands (FR-204 of design-system-shell).
- **FR-603**: All four sub-routes MUST drop the `Tabs` `border-b` rail (autofill-reports/ai/conflicts all currently use the default shadcn `<Tabs>`, which is OK — this rule is preventative against the §3.12 anti-pattern). Audit count target on touched files: 0.

#### FR-7xx — Ship-or-hide decision (resolves §7.4)

- **FR-701**: Per the §7.4 open question, this spec records the decision: **ship in this design pass**. Justification: the four sub-routes are wired to live API endpoints (`/api/command-board`, `/api/events/reports`, `/api/events/documents/parse`, `/api/kitchen/waste/reports`, `/api/ai/suggestions`, `/api/ai/summaries`, `/api/conflicts/detect`), the underlying entities (`BattleBoard`, `CommandBoard`, `EventReport`, `WasteEntry`) exist in `schema.prisma`, and the only blocker is visual drift — not missing functionality. **Ship gates** (all four MUST pass per sub-route — gates are independent and measurable, not circular):
  1. **Acceptance**: every Acceptance Scenario for User Stories 1–5 attributable to that sub-route passes in CI (Playwright workflow + Vitest component tests).
  2. **Token budget**: SC-002, SC-003, SC-004, SC-005 counts on `apps/app/app/(authenticated)/tools/{sub-route}/**` are all 0 (verified by `pnpm biome check` + a `grep -RnE "text-(3xl|4xl)|shadow-(sm|md|lg|xl|2xl)|bg-(amber|blue|red|green|orange|yellow)-(50|100|200|600|700)"` returning empty over the sub-route directory).
  3. **Design score**: sub-route scores 3/3 against `specs/general/design-system-shell.md` FR-501 (verified by the §2C.10 reviewer).
  4. **Persistence parity**: every entity referenced by the sub-route (`BattleBoard`, `CommandBoard`, `EventReport`, `WasteEntry`, `AdminTask`) has an active manifest in `packages/manifest-adapters/manifests/` and a matching Prisma model (transient entities — `Conflict`, `Suggestion`, `EventSummary`, `AiEventSetupSession` — are explicitly exempt and documented in FR-405 / Key Entities).
- **FR-702**: If FR-701 cannot be satisfied for one or more sub-routes by the design pass close, that sub-route MUST be hidden from the sidebar (but remain reachable by direct URL) and the `OperationalColumn` row on `/tools` MUST display `MonoLabel` eyebrow `SPEC PENDING — DIRECT URL ONLY`.

### Key Entities

- **BattleBoard** (`tenant_events.battle_boards`): document-imported board (`document_url`, `source_document_type`, `boardData` JSON, `schema_version='mangia-battle-board@1'`). Tagged, status-tracked (`draft | active | archived`), event-linked via optional `eventId`. Append-only via `createdAt/updatedAt/deletedAt` triple.
- **CommandBoard** (`tenant_events.command_boards`): user-authored board with sibling `CommandBoardCard` children, `CommandBoardGroup`, `CommandBoardConnection`, `BoardProjection`, `BoardAnnotation`. Currently the model the `/tools/battleboards` UI writes to via `/api/command-board`. Tags, status, optional `eventId`, `autoPopulate`, `scope` JSON.
- **EventReport** (`tenant_events.event_reports`): canonical pre-event review checklist. `status` (`draft | in_progress | completed | approved`), `completion` (0–100), `checklistData` JSON (EventChecklist structure), `parsedEventData` JSON, `reportConfig` JSON, `autoFillScore`, `reviewNotes/reviewedBy/reviewedAt/completedAt`. Linked to `Event` by required `eventId`.
- **WasteEntry** (`tenant_kitchen.waste_entries`): kitchen waste record consumed by Waste Reports tab; not authored from Tools.
- **Conflict** (transient, not persisted): in-memory detector output (`id, type, severity, title, description, affectedEntities[], suggestedAction?, resolutionOptions?[], createdAt`). Returned by `/api/conflicts/detect` per request, never written to a table.
- **Suggestion** (transient): AI suggestion record (`id, type, category, priority, title, description, action, estimatedImpact, dismissed`) with `action: navigate | api_call`. Not persisted server-side.
- **EventSummary** (transient): AI summary (`eventId, summary, wordCount, highlights[], criticalInfo[], generatedAt, eventTitle, eventDate, model`). Not persisted server-side.
- **AdminTask** / **AiEventSetupSession**: referenced by the MCP entity list but do not currently surface in the Tools UI. AdminTask is touched indirectly via Task Generator output (which writes through `/api/kitchen/prep-tasks/commands/create-bulk`, not AdminTask). AiEventSetupSession has no Prisma model — see FR-405.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All four `/tools/*` sub-routes score 3/3 against `specs/general/design-system-shell.md` FR-501. Current baseline: 1/3 (all four). Target: 3/3.
- **SC-002**: §3.6 (`text-3xl|4xl + font-bold`) count on `apps/app/app/(authenticated)/tools/**` drops to 0. Current baseline: 4 (one per sub-route landing). Target: 0.
- **SC-003**: §3.7 (`shadow-{sm,md,lg,xl,2xl}` on non-overlay) count on `apps/app/app/(authenticated)/tools/**` drops to 0. Target: 0.
- **SC-004**: §3.8 (decorative pastel `bg-*-(50|100|200)`) count on `apps/app/app/(authenticated)/tools/**` drops to 0. Current baseline includes `bg-amber-50/50`, `bg-amber-200`, `bg-blue-600`, `bg-muted`, `bg-muted/30`, `bg-muted/50`. Target: 0 decoratives (semantic `--ds-*` tokens may use `bg-muted`).
- **SC-005**: §3.11 strict bare-`<Card>` opener count on `apps/app/app/(authenticated)/tools/**` drops to 0. Current baseline: ≥ 30 across the four clients. Target: 0.
- **SC-006**: An operator can complete the User Story 1 (battleboard generation) flow in ≤ 90 seconds from `/tools` cold load to a finalized board, verified by 5-operator usability test.
- **SC-007**: Document parser autofill produces a draft `EventReport` with `autoFillScore ≥ 50` on the canonical vendor-PDF fixture set (target: 80% of 10 fixtures).
- **SC-008**: Conflict detection completes in ≤ 3s p95 over a 14-day window with all five detectors enabled, on a tenant with ≤ 100 events / ≤ 200 employees / ≤ 50 equipment.
- **SC-009**: Zero new occurrences in §3.6/§3.7/§3.8/§3.11/§3.12 counts on `apps/app/app/(authenticated)/tools/**` introduced after this spec lands (regression budget).
- **SC-010**: §7.4 ship-or-hide decision is resolved (FR-701) and §7.7 unified-vs-separate decision is resolved (FR-501) — both recorded in this spec, not deferred.

## Cross-references

- `specs/general/design-system-shell.md` — shell contract this spec inherits (FR-101..FR-603 mapped).
- `specs/events/SPEC.md` §3 (kitchen handoff), §4 (report templates) — battleboards and EventReport feed these.
- `specs/general/settings.md` (§5.4, pending) — tenant currency and AI provider settings.
- `specs/ai/ai-bulk-task-generation_TODO/`, `ai-employee-conflict-detection_TODO/`, `ai-equipment-conflict-detection_TODO/`, `ai-event-summaries_TODO/`, `ai-inventory-conflict-detection_TODO/`, `ai-suggested-next-actions_TODO/`, `ai-venue-conflict-detection_TODO/` — per-feature deep-dive specs (this spec is the parent surface; they are the per-detector / per-helper expansions).
- `IMPLEMENTATION_PLAN.md` §2C.10 (sub-route rework), §5.5 (this spec), §7.4 (ship-or-hide), §7.7 (unified conflicts UI).
- `packages/database/prisma/schema.prisma` lines 665, 1356, 1384, 2447, 3973 — `EventReport`, `BattleBoard`, `CommandBoard`, `AdminTask`, `WasteEntry` models.
- `apps/app/app/(authenticated)/tools/{page.tsx,battleboards,autofill-reports,ai,conflicts}` — implementation targets.

## Out of scope

- Native mobile Tools surface — see `specs/mobile/` and §4.24–4.28.
- Battleboard collaborative real-time editing (cursors, presence) — `BoardProjection` and `BoardAnnotation` models exist but are not surfaced by `/tools/battleboards`. Defer to a `specs/command-board/` collaboration spec.
- Vendor-document parser model selection / prompt engineering — owned by the `packages/ai/` provider abstraction; this spec consumes the result, not the implementation.
- Conflict-detector algorithm tuning — owned by the per-detector specs in `specs/ai/ai-*-conflict-detection_TODO/`. This spec consumes the orchestrator output.
- AI provider routing (OpenAI vs Anthropic vs local) — owned by `specs/general/settings.md` §5.4 (pending).
- Webhook/cron surface for periodic conflict scans — owned by `apps/api/vercel.json` cron registry; this spec covers the on-demand UI flow only.
