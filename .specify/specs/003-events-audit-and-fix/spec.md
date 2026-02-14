# Feature Specification: Events Audit and Fix

Feature ID: 003
Status: Draft
Constitution Version: 1.0.0

## 1. Overview

### 1.1 Goal
Audit and fix the events module implementation to ensure events are properly saved to the database, related entities (battle boards, reports) are auto-created when appropriate, and all pages/functions work correctly.

### 1.2 Problem Statement
The events module has several integration issues:
- Events creation may have field mapping issues between form components
- Battle boards and reports are not auto-created when events are created
- Budgets API endpoints do not exist (hooks call `/api/events/budgets` but route is missing)
- Multiple form components with inconsistent field naming

### 1.3 Success Metrics
- All event CRUD operations save correctly to DB
- Battle boards auto-created when new event is created
- Event reports accessible via UI
- Budgets API endpoints exist and functional
- Zero console errors on events pages

## 2. Constitution Alignment

### 2.1 Relevant Principles

| Principle | Section | Alignment |
|-----------|---------|-----------|
| [MUST] Use Prisma + Neon | C§2.1 | Events use database.events.create() - compliant |
| [MUST] All tenant tables include tenantId | C§2.1 | Events use tenant_id column - compliant |
| [MUST] Use soft deletes | C§2.1 | Events uses deleted_at column - compliant |
| [SHOULD] Use server components | C§2.2 | Mix of server/client components - needs review |
| [SHOULD] Use Zod for runtime validation | C§2.2 | No Zod schemas found in events module |

### 2.2 Technology Constraints
- Next.js App Router with route groups
- Prisma ORM with multi-tenant schema
- Clerk authentication (already integrated)

## 3. User Stories

### US1: Consistent Event Creation Form
**As a** event coordinator
**I want to** create events using a consistent form
**So that** events are saved correctly with all fields mapped properly

**Acceptance Criteria:**
- AC-1.1: EventForm (`apps/app/app/(authenticated)/events/components/event-form.tsx`) and EventEditorModal (`apps/app/app/(authenticated)/events/event-editor-modal.tsx`) use consistent field names [C§2.1 - must validate data]
- AC-1.2: Both forms submit data via the same createEvent action (`apps/app/app/(authenticated)/events/actions.ts`)
- AC-1.3: Required fields (title, eventDate, eventType) are validated before DB insertion

### US2: Auto-Create Battle Board with Event
**As a** event coordinator
**I want to** have a battle board automatically created when I create an event
**So that** I can immediately start planning the event timeline

**Acceptance Criteria:**
- AC-2.1: When createEvent is called, a battle_board record is created with event_id linking to the new event
- AC-2.2: Battle board status defaults to "draft"
- AC-2.3: Battle board is accessible via `/events/[eventId]/battle-board` immediately after event creation

### US3: Functional Budgets API
**As a** event coordinator
**I want to** create and manage event budgets through the UI
**So that** I can track event finances

**Acceptance Criteria:**
- AC-3.1: API route `/api/events/budgets` exists and handles GET, POST [C§2.2 - authenticate API routes]
- AC-3.2: API route `/api/events/budgets/[budgetId]` exists and handles GET, PUT, DELETE
- AC-3.3: Budget line items API endpoints exist (`/[budgetId]/line-items`)
- AC-3.4: All budget operations respect tenant isolation via tenantId

### US4: Verify Event Reports Integration
**As a** event coordinator
**I want to** access event reports from the events module
**So that** I can review pre-event checklists

**Acceptance Criteria:**
- AC-4.1: Event reports list page (`/events/reports`) displays reports from event_reports table
- AC-4.2: Each report links to its associated event
- AC-4.3: Report detail page (`/events/reports/[reportId]`) loads correctly

### US5: Verify Event Import Flow
**As a** event coordinator
**I want to** import events from CSV/PDF files
**So that** I can quickly create events from existing documents

**Acceptance Criteria:**
- AC-5.1: Import form (`/events/import`) uploads and parses files
- AC-5.2: Events are created in the database via importer.ts
- AC-5.3: Prep tasks are created in tenant_kitchen.prep_tasks linked to the event

## 4. Scope

### 4.1 In Scope
- Fix field name inconsistency between EventForm and EventEditorModal
- Implement auto-creation of battle_board when event is created
- Create missing budgets API endpoints
- Verify event reports integration
- Verify event import flow
- Add Zod validation for event creation input

### 4.2 Out of Scope
- Real-time sync for battle boards (collaboration package exists)
- Advanced budget features (variance analysis, forecasting)
- PDF parsing improvements (existing implementation is basic)
- Staff scheduling integration (separate module)

### 4.3 Future Considerations
- Auto-create event report template when event is created
- Link budgets to event automatically during creation
- Add event profitability calculations

## 5. Dependencies

### 5.1 Internal Dependencies
- `database.events` model (Prisma client)
- `database.battle_boards` model
- `database.event_reports` model
- `database.event_budgets` model

### 5.2 External Dependencies
- None (all database operations via Prisma)

## 6. Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Battle board auto-creation may conflict with manual board creation | Medium | Low | Use separate table, allow multiple boards per event |
| Budgets API missing - hooks call non-existent endpoints | High | High | Create API routes first |
| Field name mismatch causes silent data loss | High | Medium | Add Zod validation, unit tests |

## 7. Technical Findings Summary

### 7.1 Database Schema (tenant_events)
- **events**: Core event model with tenant_id, title, event_date, status, etc.
- **battle_boards**: Linked to events via event_id foreign key
- **event_reports**: Linked to events via event_id
- **event_budgets**: Model exists, but API endpoints missing
- **timeline_tasks**: Event-specific tasks for battle board

### 7.2 Event Creation Flow Analysis
1. **Form submission**: EventForm submits to createEvent action (actions.ts:87-119)
2. **DB insertion**: Uses `database.events.create()` - CORRECT
3. **Redirect**: Redirects to `/events/[eventId]` - WORKS
4. **Missing**: No battle_board creation after event creation

### 7.3 Form Field Name Inconsistency
| Field | EventForm | EventEditorModal |
|-------|-----------|------------------|
| Title | `title` | `title` (via `name` default) |
| Event Type | `eventType` | `eventType` (Select) |
| Date | `eventDate` | `eventDate` (date input) |
| Guest Count | `guestCount` | `capacity` (name mismatch!) |
| Venue Name | `venueName` | `venueName` (via `location` default) |
| Status | `status` | `status` (Select, hardcoded "confirmed") |

### 7.4 Missing API Endpoints
The following endpoints are called by `use-event-budgets` but DO NOT exist:
- `GET /api/events/budgets`
- `POST /api/events/budgets`
- `GET /api/events/budgets/[budgetId]`
- `PUT /api/events/budgets/[budgetId]`
- `DELETE /api/events/budgets/[budgetId]`
- Line items endpoints

### 7.5 Pages Audit

| Page | Path | Status | Notes |
|------|------|--------|-------|
| Events List | `/events` | WORKS | Lists events from DB |
| New Event | `/events/new` | WORKS | Uses EventForm |
| Event Details | `/events/[eventId]` | WORKS | Shows event details |
| Battle Board | `/events/[eventId]/battle-board` | WORKS | Shows timeline tasks |
| Battle Boards List | `/events/battle-boards` | WORKS | Lists all boards |
| Battle Board Detail | `/events/battle-boards/[boardId] | WORKS | Edits board |
| Reports List | `/events/reports` | WORKS | Lists reports |
| Report Detail | `/events/reports/[reportId] | NEEDS VERIFY | Editor exists |
| Budgets List | `/events/budgets` | BROKEN | API missing |
| Budget Detail | `/events/budgets/[budgetId] | BROKEN | API missing |
| Import | `/events/import` | WORKS | CSV/PDF import |
| Contracts | `/events/contracts` | WORKS | Lists contracts |

## 8. Implementation Plan

### Phase 1: Fix Event Creation (Priority 1)
1. Align field names in EventEditorModal (guestCount not capacity)
2. Ensure EventEditorModal uses same validation as EventForm
3. Add Zod schema for event creation

### Phase 2: Auto-Create Battle Board (Priority 2)
1. Modify createEvent action to also create battle_board
2. Ensure battle_board.boardData is initialized as empty object
3. Test redirect works with new board

### Phase 3: Create Budgets API (Priority 3)
1. Create `/api/events/budgets/route.ts` for GET/POST
2. Create `/api/events/budgets/[budgetId]/route.ts` for GET/PUT/DELETE
3. Create line-items sub-routes
4. Add tenant isolation checks

### Phase 4: Verification (Priority 4)
1. Test event import flow
2. Verify reports link to events
3. Run pnpm check for lint issues
4. Add integration tests

## 9. Open Questions

- [ ] Should battle board auto-creation be optional (feature flag)?
- [ ] Should event report be auto-created on event creation?
- [ ] What should be the default board_type when creating battle board from event?

## Appendix

### A. Related Files
- `apps/app/app/(authenticated)/events/actions.ts` - Event CRUD actions
- `apps/app/app/(authenticated)/events/components/event-form.tsx` - Create event form
- `apps/app/app/(authenticated)/events/event-editor-modal.tsx` - Modal form (inconsistent fields)
- `apps/app/app/(authenticated)/events/importer.ts` - CSV/PDF import logic
- `apps/app/app/lib/use-event-budgets.ts` - Budget hooks (expecting API)
- `packages/database/prisma/schema.prisma` - Database models

### B. References
- Constitution: `.specify/memory/constitution.md`
- Schema contract: `docs/legacy-contracts/schema-contract-v2.txt`
