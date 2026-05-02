# Feature Specification: Calendar Module (Cohere-Aligned)

**Feature Branch**: `calendar/SPEC`
**Created**: 2026-05-02
**Status**: Draft
**Input**: User description: "Codify the calendar module — the unified operator surface that composites events, scheduled shifts, and time-off requests into a single date-keyed view. Cover the month/week/day calendar (`/calendar`), the sync settings page (`/calendar/sync`), the read API (`/api/calendar`), the reschedule mutation (`/api/calendar/reschedule`), and the four sync endpoints (Google + Outlook OAuth connect / disconnect / status / trigger). Inherit the shell contract from `specs/general/design-system-shell.md` (§5.1), document the closed-set entry-type taxonomy, declare which stub views (List, Schedule) must ship before the module is considered complete, and stitch the planned `Deadline` and `Reminder` entry types to either a Prisma model or an explicit deferral marker."

> **Why this spec exists.** The calendar is the only surface in the app that joins three otherwise-isolated domains — events, scheduling, and HR time-off — into one date-keyed view. The current implementation (`apps/app/app/(authenticated)/calendar/page.tsx` + `components/unified-calendar.tsx`, ~700 lines combined) renders three working entry types (`event`, `shift`, `timeoff`) and declares two more (`deadline`, `reminder`) as union members with no Prisma model behind them — `apps/api/app/api/calendar/route.ts:240–241` carries explicit `TODO: deadline/reminder models do not exist`. The page header also exposes `Calendar / List / Schedule` tab triggers but only the Calendar (month/week/day) view has an implementation; List and Schedule are stubs. Sync sources are hard-coded to Google and Outlook OAuth (no iCal feed import, no Apple Calendar, no CalDAV). None of this is documented as intentional scope vs accidental drift, so subsequent passes cannot tell whether the missing pieces are bugs, deferrals, or out-of-scope. This spec is that anchor — it declares what an "operationally complete calendar" must satisfy, locks the entry-type taxonomy at four canonical types (with `reminder` as out-of-scope), and converts the two stub views into either ship-required (List) or ship-or-delete (Schedule) decisions.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Operator scans the unified week (Priority: P1)

A scheduler or operations lead opens `/calendar` to see what is happening across events, shifts, and approved time-off in a single date-keyed grid. They must, within 2 seconds of viewport load, be able to:

1. **See the operational temperature.** A `MetricBand` row exposes 4–6 numbers an operator needs to triage (events this week, shifts assigned, time-off approved, total-day-load count, conflicts flagged, and any unstaffed events). Cells use `MetricBand` editorial typography — never `text-3xl font-bold`.
2. **Read the date grid.** A 7-column week or 6-row month grid shows entries as horizontal pills, color-keyed by entry type (event, shift, timeoff). Each cell shows up to 4 entries before truncating to a `+N more` affordance. The current month / week / day view is rendered via the `unified-calendar.tsx` `view` state machine — never as a `<Card>` per cell.
3. **Toggle entry types.** A `BlogFilterChip` cluster (event / shift / timeoff — exactly three chips, see FR-301) sits above the grid with multi-select AND-semantics. The chip cluster is the canonical taxonomy — never a generic shadcn `<Tabs>` or `<Toggle>` row.
4. **Drill into a specific entry.** A click on any entry in the grid navigates to that entry's canonical detail surface — `/events/[eventId]` for events, `/scheduling/shifts/[shiftId]` for shifts (or the equivalent staffing detail), `/staff/time-off/[requestId]` for time-off. The detail surface is owned by its parent module — the calendar is a router into them, not a fourth detail surface.
5. **Switch the date window.** A `CommandBand` actions cluster includes month/week/day pill-toggle, prev/next/today navigation, and a `"Sync calendars"` secondary pill-outline that routes to `/calendar/sync`. The primary action is `"New event"` (near-black pill) which opens the same create-event flow as `/events`.

**Why this priority**: The calendar is the second-most-touched cross-module surface after `/events`. If P1 is wrong, every operator who needs a daily/weekly view is forced to flip between three modules instead of one, and the calendar's reason-to-exist evaporates.

**Independent Test**: Given a tenant with ≥ 5 events, ≥ 10 shifts, and ≥ 2 approved time-off requests in the current week, an operator can identify (a) every event happening this week, (b) every shift assigned to a named employee, (c) every conflict between a shift and an approved time-off, all without scrolling and within 2 seconds. The page composition, when measured by `grep`, has zero `<Card>`-per-cell openers, zero `text-3xl font-bold`, zero `bg-*-50/100/200` decoratives, zero `shadow-*`, and inherits §5.1's `PageCanvas → CommandBand → MetricBand → OperationalColumn` ladder.

**Acceptance Scenarios**:

1. **Given** the operator opens `/calendar`, **When** the page renders, **Then** the shell composes `PageCanvas → CommandBand (with primary "New event" pill + secondary "Sync calendars" pill-outline + month/week/day toggle) → MetricBand (events this week, shifts assigned, time-off approved, conflicts) → BlogFilterChip cluster (event / shift / timeoff) → unified-calendar grid (month default; respects ?view=week|day query param)`. Zero `<Card>` per cell, zero legacy `Header` import, zero `text-3xl font-bold`.
2. **Given** the operator toggles the `event` chip off, **When** the chip cluster updates, **Then** the grid re-renders showing only `shift` and `timeoff` entries; the MetricBand `events this week` cell dims (or de-emphasizes via the `selected="false"` data attribute) but does not unmount; URL gains `?types=shift,timeoff`.
3. **Given** the operator clicks an entry rendered as a colored pill in any cell, **When** navigation completes, **Then** the operator lands on the parent module's detail surface (`/events/[eventId]`, `/scheduling/shifts/[shiftId]`, `/staff/time-off/[requestId]`) — never on a calendar-owned detail page.
4. **Given** the operator clicks the `Today` button, **When** the action fires, **Then** the date window resets to the calendar's "today" anchor (per the operator's tenant timezone — see FR-401), the URL strips any `?date=` param, and the focused cell is the today cell with `aria-current="date"`.
5. **Given** the operator switches from month to week view, **When** the toggle fires, **Then** the URL gains `?view=week`, the metric band re-aggregates to "this week" semantics (week-bounded), and the grid re-renders without re-mounting the chip cluster or the metric band container.

---

### User Story 2 — Operator drag-reschedules an entry (Priority: P1)

The operator long-presses (or click-drags) an event or shift entry from one cell into another to reschedule it. The drag-and-drop interaction is the only mutating action the calendar surface owns directly (every other action delegates to a parent module).

**Why this priority**: Drag-reschedule is the calendar's core operational verb. Without it, the calendar is a read-only viewer and operators bounce to `/events/[eventId]/edit` or `/scheduling/shifts/[shiftId]/edit` for every date change — a friction point that makes the calendar feel decorative rather than operational.

**Independent Test**: Given an event scheduled for Tuesday and a shift scheduled for Wednesday morning, dragging the event from Tuesday to Friday and the shift from Wednesday morning to Wednesday evening must, within 500ms of drop, persist the new dates via `PATCH /api/calendar/reschedule`, optimistically update the grid, and roll back if the server rejects. Time-off entries must NOT be drag-reschedulable (they are immutable from the calendar — operators must edit them at `/staff/time-off/[requestId]`).

**Acceptance Scenarios**:

1. **Given** the operator drags an event from the Tuesday cell, **When** the drop completes on the Friday cell of the same week, **Then** `PATCH /api/calendar/reschedule` fires with `{ entryType: "event", entryId, newDate: "<friday-iso>" }`, the grid updates optimistically, and on server success the entry persists to `Event.eventDate = <friday-iso>` (date-only, time component preserved).
2. **Given** the operator drags a shift from Wednesday 09:00 to Wednesday 17:00, **When** the drop completes, **Then** `PATCH /api/calendar/reschedule` fires with `{ entryType: "shift", entryId, newStart: "<wed-17:00>", newEnd: "<wed-21:00>" }` (duration preserved as `shift_end - shift_start` from the original); on server success `ScheduleShift.shift_start` and `shift_end` advance by the same delta.
3. **Given** the operator attempts to drag a time-off entry, **When** the pointer-down fires on a `type=timeoff` entry, **Then** the DnD activator does NOT engage (the time-off entry's `data-draggable="false"` attribute disables the sensor), no API call fires, and a `Toast` surfaces: `"Time-off cannot be rescheduled from the calendar — edit at /staff/time-off."`
4. **Given** the server rejects a reschedule (e.g. event is now in `cancelled` status, shift conflicts with a later-approved time-off, RBAC denies the operator's role), **When** the rejection arrives, **Then** the optimistic placement reverts within 200ms, a `Toast` surfaces the rejection reason verbatim from the server payload (closed-enum: `forbidden | not_found | event_cancelled | conflicts_with_timeoff | rate_limited`), and the entry returns to its original cell with focus restored to the drag origin for keyboard-resume.

---

### User Story 3 — Operator scans entries as a research-table list (Priority: P1)

The operator switches from the visual grid to the **List** view (currently a stub tab in the page header). The list view renders the same date-bounded entry set as the grid but as a `ResearchTable` (see §5.1 User Story 2) — entry title left, type pill center, date mono-formatted right, hairline divider between rows.

**Why this priority**: Operators with screen-reader, keyboard-first, or print workflows need a non-spatial view of the same data. The `ResearchTable` pattern is also the canonical accessibility floor across the app — every list-shaped surface must have one. Currently `List` is a stub tab trigger with no implementation; that is a documented bug (see §5.1 FR-201).

**Independent Test**: Given the same tenant data as User Story 1, switching the page header tab from `Calendar` to `List` must render every entry currently visible under the active filters as a `ResearchTable` row, sorted ascending by date. Screen-reader announcement of the table caption matches the active date window (e.g. `"Calendar entries — week of 2026-05-04 — 17 entries"`).

**Acceptance Scenarios**:

1. **Given** the operator clicks the `List` tab, **When** the view switches, **Then** the URL gains `?view=list`, the grid unmounts, and a `ResearchTable` mounts in its place with one row per entry. Each row uses the contract: `<a href={detailUrl}>{title-left}</a> {type-pill-center} {date-right-mono}` — no `<Card>` per row.
2. **Given** the operator filters by `shift` only, **When** the list re-renders, **Then** every row is a shift entry, the table caption updates to `"Calendar entries — week of <iso> — type: shift — N entries"`, and the date sort is preserved.
3. **Given** the operator presses `j` / `k` on the table (vim-style row navigation), **When** the keyboard handler fires, **Then** focus advances down/up by one row with `aria-rowindex` updating; pressing `Enter` on a focused row navigates to its detail URL.

---

### User Story 4 — Operator inspects sync status (Priority: P2)

The operator opens `/calendar/sync` to (a) connect a Google or Microsoft Outlook calendar to push the tenant's events into the operator's personal calendar, (b) inspect last-sync metadata, (c) trigger a manual sync, (d) disconnect a previously-connected provider.

**Why this priority**: External calendar sync is a power-user feature — most operators do not connect a personal calendar — but for those who do, an opaque sync state is a documented support pain point ("did my events sync this morning?"). Sync UX is operationally important but not on the critical path for every tenant.

**Independent Test**: Given a tenant with one operator and no connected providers, the page renders an empty state with two pill primaries (`Connect Google` and `Connect Outlook`). After connecting Google, the page re-renders with a Google card showing connected status, last-sync timestamp, and a `Trigger sync` action. Triggering a sync calls `POST /api/calendar/sync/trigger`, displays a progress indicator, and updates the last-sync timestamp on success.

**Acceptance Scenarios**:

1. **Given** the operator opens `/calendar/sync` with no connected providers, **When** the page renders, **Then** the shell composes `PageCanvas → CommandBand (heading "Calendar sync", lede "Connect Google Calendar or Microsoft Outlook to mirror events into your personal calendar.") → OperationalColumn (two `CapabilityCard`s — Google and Outlook — each with a `Connect` pill primary)`. No `<Card>` openers, no `bg-*-50/100/200`, no `shadow-*`.
2. **Given** the operator clicks `Connect Google`, **When** the click fires, **Then** `POST /api/calendar/sync/connect` returns the OAuth redirect URL, the browser navigates to the Google consent screen, the operator approves, Google posts back to `/api/calendar/sync/callback/google`, and the operator returns to `/calendar/sync` with the Google card now in `connected` state.
3. **Given** the Google sync is connected and `lastSyncAt` is more than 1 hour stale, **When** the page renders, **Then** the Google card shows the `Trigger sync` pill primary and a `MonoLabel` `"Last synced 2h ago"` in the card's metadata row; the freshness threshold is closed-enum (`< 5min: "just now"`, `< 1h: "Xm ago"`, `< 24h: "Xh ago"`, `< 7d: "Xd ago"`, `≥ 7d: "stale — re-sync"`).
4. **Given** the operator clicks `Disconnect`, **When** the action fires and is confirmed via a Dialog (per §5.1 User Story 3 form contract), **Then** `POST /api/calendar/sync/disconnect` revokes the OAuth grant, deletes the stored sync metadata, and the page re-renders with the provider card back in `not connected` state. The disconnect is reversible only by re-running the OAuth flow.
5. **Given** a sync trigger fails (token expired, Google API error, rate limit), **When** the rejection arrives, **Then** the card surfaces the failure as a `MonoLabel` `"Sync failed — <reason>"` in coral tone, and the `Trigger sync` action remains available; the failure reason is closed-enum (`token_expired | provider_error | rate_limited | network_error`) and the verbatim error message is logged to `@repo/observability`.

---

### User Story 5 — Operator drills into a date with overflow entries (Priority: P2)

Some cells contain more entries than the cell can show inline (the month grid renders up to 4 entries per cell, the week grid up to 8). The operator clicks the `+N more` affordance to see every entry on that date.

**Why this priority**: On busy operational days (high-event-volume tenants, end-of-month payroll closes, holiday windows) cells routinely overflow. Without an overflow surface, the calendar silently hides operational state — a documented operator-frustration source.

**Independent Test**: Given a date with ≥ 5 events, ≥ 5 shifts, and ≥ 1 timeoff (≥ 11 total entries) in the active filter, the cell renders the first 4 entries plus a `+7 more` affordance. Clicking the affordance opens a Dialog showing all 11 entries as a `ResearchTable` (same contract as User Story 3), sorted ascending by start time.

**Acceptance Scenarios**:

1. **Given** a cell with > 4 entries (month view) or > 8 entries (week view), **When** the cell renders, **Then** the visible-N-1 entries appear inline and the last slot is a `+M more` text-link affordance where `M = total - (visible - 1)`.
2. **Given** the operator clicks `+N more`, **When** the click fires, **Then** a Dialog opens with the date as `DisplayHeading`, an `OperationalColumn` containing every entry on that date as a `ResearchTable`, and a `Close` text-link in the Dialog action row.
3. **Given** the operator clicks an entry inside the overflow Dialog, **When** the click fires, **Then** the Dialog closes and navigation proceeds to the entry's detail URL (same contract as User Story 1.4).

---

### Edge Cases

- **Cross-day shifts.** A shift starting Wednesday 23:00 and ending Thursday 02:00 must render in BOTH cells (Wednesday and Thursday) with a continuation glyph (e.g. `→` arrow on the Wednesday cell, `←` on the Thursday cell) so operators visually parse the spillover. The shift is one logical entry — clicking either rendering navigates to the same detail URL.
- **All-day events.** An event with `eventDate` (date-only) and no time component is an all-day entry. It renders at the top of its cell with a full-width pill (no time prefix). Drag-reschedule moves the date but does not introduce a time component.
- **Time-off spanning multiple days.** A 5-day vacation request renders as a horizontal bar spanning all 5 cells (in week view) or stacked across the relevant rows (in month view). Drag is disabled (per User Story 2.3). The bar is one rendering — clicking navigates to a single detail URL.
- **Timezone transitions (DST).** During the spring-forward / fall-back hours, shifts that cross 02:00 must respect the tenant timezone — a 02:30 shift on the spring-forward Sunday does not exist and the API rejects with `error: "invalid_local_time"`. The calendar prompts the operator to pick a different time.
- **Concurrent reschedule.** Two operators dragging the same event on different machines must not lose updates — the API enforces optimistic concurrency via the `Event.updatedAt` field; the second operator receives `error: "stale_version"` and the calendar reverts the optimistic placement with a toast `"Reschedule failed — another operator updated this event. Refresh to see the current date."`
- **Empty week.** A week with zero entries (rare — small tenant, off-season) renders the grid normally with empty cells; the `MetricBand` shows zeros; no empty-state placeholder is overlaid (the empty grid IS the empty state).
- **Sync token expiry.** A connected Google sync whose OAuth token has expired surfaces in the `/calendar/sync` page as a coral `"Re-authorize required"` state — the calendar landing does NOT surface this; sync state is owned by `/calendar/sync` only.
- **Closed-enum entry types.** Any URL `?types=` value not in the closed enum (`event,shift,timeoff`) is silently dropped from the filter set with no error — the calendar treats unknown types as no-op rather than 4xx, so deep-linked URLs with stale type names degrade gracefully.

---

## Requirements *(mandatory)*

### Functional Requirements

#### Composition (inherits §5.1 design-system-shell)

- **FR-101**: `/calendar/page.tsx` MUST compose `PageCanvas → CommandBand → MetricBand → OperationalColumn` (or delegate to `ModuleLanding` if the per-page metrics are removed) — never bare `<Card>` and never legacy `Header` import.
- **FR-102**: `/calendar/sync/page.tsx` MUST compose `PageCanvas → CommandBand → OperationalColumn` with two `CapabilityCard`s (Google, Outlook) — never bare `<Card>`, never decorative pastels.
- **FR-103**: The unified-calendar grid MUST render entries as horizontal pills color-keyed by entry type using the closed `bg-{type}-pill` token set (defined in `packages/design-system/styles/globals.css`) — never `bg-blue-500` / `bg-emerald-500` / `bg-amber-500` saturated literals.
- **FR-104**: The month / week / day toggle MUST use `BlogFilterChip` (or the `pill-outline` Button variant from §0.6) — never shadcn `<Tabs>`.
- **FR-105**: The `+N more` overflow affordance MUST be a text-link (no underline by default, underline on hover) — never a `<Button>` and never a `<Card>`.
- **FR-106**: The page header tab cluster (`Calendar / List / Schedule`) MUST be removed if `Schedule` is deferred (see FR-602) — partial cluster is forbidden.

#### Forbidden patterns

- **FR-201**: `/calendar/**` MUST NOT contain `text-3xl font-bold` (use `DisplayHeading`).
- **FR-202**: `/calendar/**` MUST NOT contain `bg-*-(50|100|200)` decorative pastels (the four entry-type pills are tokenized — see FR-103).
- **FR-203**: `/calendar/**` MUST NOT contain `shadow-(sm|md|lg|xl|2xl)`.
- **FR-204**: `/calendar/**` MUST NOT contain bare `<Card>` openers per cell or per entry — entries are inline pills, not cards.
- **FR-205**: `/calendar/**` MUST NOT import `next/link` from any file inside `packages/design-system` — page-shell primitives accept a `linkComponent` prop per §5.1 FR-501.

#### Entry-type taxonomy (closed enum)

- **FR-301**: The canonical entry-type taxonomy MUST be exactly three types: `event`, `shift`, `timeoff`. Any fourth type is forbidden until a Prisma model exists.
- **FR-302**: The `deadline` entry type currently declared in the union at `apps/api/app/api/calendar/route.ts:240–241` MUST be deferred — either author a `CalendarDeadline` model and surface it (out of scope for this spec) or remove the type from the union. The `TODO` comment must be replaced with an explicit `// DEFERRED — see specs/calendar/SPEC.md FR-302` reference.
- **FR-303**: The `reminder` entry type MUST be removed from the union — it has no Prisma model, no API surface, and no operator workflow that requires it. Remove the chip color, the union member, and the type-color map entry.
- **FR-304**: When `?types=` query param contains a value outside the closed enum, the calendar MUST silently drop the unknown value (no 4xx, no toast) — see Edge Cases.

#### Read API (`GET /api/calendar`)

- **FR-401**: The read API MUST accept `start`, `end`, and `types` query parameters. `start` and `end` are ISO 8601 dates in the operator's tenant timezone (resolved server-side from `User.timezone` falling back to the tenant default).
- **FR-402**: The read API MUST return entries from three sources only: `Event` (filtered by `eventDate ∈ [start,end]` AND `tenantId = ctx.tenantId` AND `status != 'cancelled'`), `ScheduleShift` (filtered by `shift_start ∈ [start,end]` OR `shift_end ∈ [start,end]`), `EmployeeTimeOffRequest` (filtered by `start_date <= end AND end_date >= start AND status = 'approved'`). No other entity may surface as a calendar entry.
- **FR-403**: The read API response shape MUST be a flat array of entries with closed-enum `type` field plus the source row's primary id renamed as `entryId`. Source-table joins (event venue name, shift employee name, time-off employee name) MUST be inlined into the entry payload — no separate fetch.
- **FR-404**: The read API MUST be idempotent — same params return same entries in the same order (sort: `date ASC, type ASC, title ASC`) for the same tenant data.

#### Reschedule API (`PATCH /api/calendar/reschedule`)

- **FR-501**: The reschedule API MUST accept exactly `{ entryType: "event"|"shift", entryId: string, newDate: ISO8601 }` for events and `{ entryType: "shift", entryId, newStart: ISO8601, newEnd: ISO8601 }` for shifts. Time-off reschedules MUST be rejected with `error: "timeoff_not_reschedulable"`.
- **FR-502**: The reschedule API MUST enforce optimistic concurrency via the source table's `updatedAt` field — clients pass `expectedVersion: ISO8601`, server returns `409 stale_version` on mismatch.
- **FR-503**: The reschedule API MUST validate that the new date does not violate any of: event status (cancelled events cannot be rescheduled), shift conflict with an approved time-off for the same employee, RBAC (operator must have `event.write` or `shift.write` for the source row's tenant).
- **FR-504**: The reschedule API MUST emit the relevant manifest command (`Event.reschedule` or `ScheduleShift.reschedule`) per AGENTS.md "Critical Write Validation" — no direct `database.event.update` from the route.

#### Sync APIs (Google + Outlook)

- **FR-601**: The four sync endpoints (`/connect`, `/disconnect`, `/status`, `/trigger`) MUST be the ONLY sync surface — calendar landing pages do not call sync APIs directly.
- **FR-602**: The `Schedule` tab in the page header MUST be either (a) removed entirely or (b) implemented as a Gantt-style row-per-employee view of shifts. Until (b) ships, the tab trigger MUST NOT appear in the header. This spec recommends (a) — the `/scheduling` module already owns the row-per-employee view; duplicating it on the calendar adds no operational value.
- **FR-603**: The `List` tab MUST be implemented per User Story 3 before the calendar module is considered complete. Stub-tab + missing-implementation is forbidden.
- **FR-604**: Sync tokens (Google refresh token, Outlook refresh token) MUST be encrypted at rest — they are never stored as plaintext and never logged.

#### Mobile

- **FR-701**: The current responsive Tailwind degradation (`md:grid-cols-2` → single column on small screens) is acceptable for `/calendar/sync` but NOT for `/calendar` itself — on viewports < 768px, the month view MUST swap to a list-of-day-groups (one section per date with entries stacked) rather than a 7-column grid that is too narrow to read.
- **FR-702**: Drag-reschedule MUST be touch-aware — `PointerSensor` activation distance is 8px on desktop; on touch devices the activation MUST require a long-press (350ms hold) to avoid accidental rescheduling during scroll.

#### Cross-spec stitching

- **FR-801**: Entry detail navigation MUST route to the parent module's spec-defined detail URL — `/events/[eventId]` (per `specs/events/SPEC.md` User Story 2), `/scheduling/shifts/[shiftId]` (per `specs/staffing/SPEC.md` — to be authored as §5.7), `/staff/time-off/[requestId]` (per `specs/staff/*` — already exists). The calendar does NOT host detail surfaces.
- **FR-802**: When `specs/staffing/SPEC.md` (§5.7) lands, this spec MUST be re-read to confirm the shift detail URL convention. If staffing chooses a different URL pattern, FR-801 MUST be updated in the same PR.

### Key Entities

- **CalendarEntry** (synthesized type): `{ entryId: string; type: "event"|"shift"|"timeoff"; date: ISO8601; endDate?: ISO8601; title: string; subtitle?: string; detailUrl: string; draggable: boolean; }`. Not a Prisma model — produced by the `/api/calendar` route as a denormalized projection of `Event | ScheduleShift | EmployeeTimeOffRequest`.
- **Event** (Prisma): `{ id, eventDate, eventType, status, guestCount, venue, ... }`. Source for `type=event` entries. `eventDate` is `@db.Date` (date-only).
- **ScheduleShift** (Prisma): `{ id, shift_start, shift_end, role_during_shift, employee_id, ... }`. Source for `type=shift` entries.
- **EmployeeTimeOffRequest** (Prisma): `{ id, start_date, end_date, status, reason, employee_id, ... }`. Source for `type=timeoff` entries — only `status=approved` rows surface on the calendar.
- **CalendarSyncConnection** (Prisma — exists or to-be-created): `{ id, tenantId, userId, provider: "google"|"outlook", calendarName, lastSyncAt, lastSyncError, refreshTokenEncrypted, ... }`. Source-of-truth for sync state. If the model does not yet exist, it MUST be added before FR-601 is satisfied.
- **CalendarDeadline** (DEFERRED — see FR-302): NOT a Prisma model in this spec's scope. Future spec authors must (a) define the operational use case, (b) add the model, (c) update FR-301 to extend the closed enum.

### Assumptions & Dependencies

- **A-001**: Tenant timezone is resolved server-side from `User.timezone` falling back to a tenant-level default. If a tenant has no default, the system uses `UTC` and the operator sees a banner `"Set your tenant timezone in Settings → General to avoid date drift."` — the banner is owned by `/settings/general` (§5.4), not by the calendar.
- **A-002**: The `EmployeeTimeOffRequest` Prisma model and `tenant_staff` RLS policy already exist and are out of scope for this spec.
- **A-003**: The four sync endpoints (`/connect`, `/disconnect`, `/status`, `/trigger`) and the two callback handlers (`/callback/google`, `/callback/outlook`) already exist as scaffolding. This spec does NOT redefine the OAuth contract — it documents the operator-facing UX only.
- **A-004**: The `/calendar/page.tsx` and `unified-calendar.tsx` files already use `page-shell` primitives. This spec hardens the contract; it does not require a from-scratch rebuild.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Operator can identify every event, shift, and approved time-off entry for the current week within 2 seconds of opening `/calendar`. Verified by Lighthouse Largest-Contentful-Paint < 2.0s on a tenant with ≥ 50 entries in the active week.
- **SC-002**: `/calendar/**` files contain zero `text-3xl font-bold`, zero `bg-*-(50|100|200)`, zero `shadow-(sm|md|lg|xl|2xl)`, and zero bare `<Card>` openers per cell / per entry — measured by `rg -c` after each PR touching the directory.
- **SC-003**: The closed-enum entry-type union at `apps/api/app/api/calendar/route.ts` contains exactly three members (`event | shift | timeoff`) — `deadline` and `reminder` are removed or migrated to a deferred-with-spec-reference comment.
- **SC-004**: `PATCH /api/calendar/reschedule` round-trips in < 500ms p95 for a single-entry reschedule on a tenant with ≤ 1000 events / 5000 shifts.
- **SC-005**: Drag-reschedule of an event from one cell to another persists the new date and is visible in the read API on the next refetch — verified by E2E test under `e2e/workflows/calendar-reschedule.workflow.spec.ts` (does not yet exist; create as part of implementing this spec).
- **SC-006**: `/calendar/sync` lists every connected provider with last-sync metadata; manual `Trigger sync` round-trips in < 5s p95 for a tenant with ≤ 100 events to mirror.
- **SC-007**: Removing the `Schedule` tab (per FR-602 recommendation) results in zero broken links from any other page in the app — verified by `pnpm exec next build` succeeding without warnings about orphaned routes.
- **SC-008**: List view (per User Story 3 / FR-603) renders correctly under screen-reader emulation — `axe-core` reports zero violations on the table semantics.
- **SC-009**: 90% of operators in pilot can rename an event's date by drag-reschedule (vs editing the event detail page) on first attempt — measured by qualitative usability test on five operators.
- **SC-010**: Calendar module passes the §2 module-shell scoring rubric (3/3) — verified by the cross-cutting count sweeps in §3.6 / §3.7 / §3.8 / §3.11 / §3.12 returning zero matches under `apps/app/app/(authenticated)/calendar/`.
- **SC-011**: Zero `console.log` / `console.error` / `console.warn` calls under `apps/api/app/api/calendar/` — replaced with `@repo/observability` per AGENTS.md test-and-logging hygiene.
- **SC-012**: `pnpm --filter app typecheck`, `pnpm --filter api typecheck`, and `pnpm --filter app test` all pass after the `deadline` / `reminder` union members are removed (verifies no consumer depends on the deferred types).

## Out of Scope

- **CalendarDeadline / CalendarReminder Prisma models** — DEFERRED (see FR-302/FR-303). Adding these requires a separate spec and operator-research pass to confirm the use case.
- **Apple Calendar / iCal feed import / CalDAV** — out of scope; sync is Google + Outlook only until a documented operator demand exists.
- **Schedule tab Gantt view** — FR-602 recommends removal; if a Gantt view is desired it belongs in `specs/staffing/SPEC.md` (§5.7) under the scheduling module's surface, not on the calendar.
- **Recurring events on the calendar** — events are non-recurring per the events module spec (§5.2). If recurrence is added later, this spec must be re-read to define the recurrence-instance rendering rules.
- **Drag-resize (changing duration by dragging the trailing edge)** — out of scope; operators edit duration on the source detail page. The calendar surface owns date / start-time changes only.
- **Multi-select drag (rescheduling N entries at once)** — out of scope; one-entry-at-a-time is the operational floor.
- **Mobile-app calendar view (apps/mobile)** — out of scope; the mobile app surfaces tasks / settings / profile / search per the survey, not the calendar. If mobile calendar is added later, this spec defines the web contract; mobile gets its own spec.
