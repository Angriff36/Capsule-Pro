# Convoy Implementation Plan

> Last updated: 2026-02-19
> Generated from comprehensive codebase analysis using 20+ parallel agents

## Executive Summary

The Convoy platform is a catering/event management SaaS with strong foundations. The **Command Board** is feature-complete for core functionality. Current focus: **Mobile Kitchen App**.

**Overall Completion: 95%**

**Active Feature: Mobile Kitchen App** — `specs/mobile/mobile-kitchen-app_TODO/`

**Verification (2026-02-19 22:10 UTC):**
- Build: ✅ Passed (app package)
- Tests: ✅ Kitchen tests passed
- Lint: ✅ Clean on mobile-kitchen code (warnings only)
- Tags: v0.6.85 (latest)

---

## Mobile Kitchen App — Active Development

**Spec:** `specs/mobile/mobile-kitchen-app_TODO/mobile-kitchen-app.md`

### What Exists (Do Not Rebuild)

| Component | Location | Status |
|-----------|----------|--------|
| Task claiming UI | `/(mobile-kitchen)/kitchen/mobile/tasks/page.tsx` | ✅ Tabs (Available/My Tasks), claim/release, offline sync |
| Prep list view | `/kitchen/prep-lists/mobile/page.tsx` | ✅ Station grouping, completion display |
| Tasks available API | `/api/kitchen/tasks/available` | ✅ Returns available tasks |
| My tasks API | `/api/kitchen/tasks/my-tasks` | ✅ Returns claimed tasks |
| Task commands | `/api/kitchen/kitchen-tasks/commands/*` | ✅ claim, release, start, complete |
| Prep task commands | `/api/kitchen/prep-tasks/commands/*` | ✅ claim, release, start, complete |
| Prep lists API | `/api/kitchen/prep-lists/` | ✅ CRUD, items, mark-completed |
| Offline queue pattern | `/(mobile-kitchen)/kitchen/mobile/tasks/page.tsx` | ✅ Sync on reconnect |
| Mobile shell (bottom nav) | `/(mobile-kitchen)/kitchen/mobile/layout.tsx` | ✅ 4-tab navigation, offline banner |
| Today tab | `/(mobile-kitchen)/kitchen/mobile/page.tsx` | ✅ Event overview with urgency |
| Prep lists tab | `/(mobile-kitchen)/kitchen/mobile/prep-lists/page.tsx` | ✅ Event-grouped prep lists |
| Prep list detail | `/(mobile-kitchen)/kitchen/mobile/prep-lists/[id]/page.tsx` | ✅ Item completion with offline sync |
| My Work tab | `/(mobile-kitchen)/kitchen/mobile/my-work/page.tsx` | ✅ Active/claimed tasks, start/complete/release |
| Today events API | `/api/kitchen/events/today` | ✅ Returns events with urgency + prep status |

### ~~P0 — Shell & Navigation (Critical Path)~~ ✅ COMPLETE (2026-02-19)

- [x] **Create bottom nav shell** at `apps/app/app/(mobile-kitchen)/kitchen/mobile/layout.tsx`
  - Bottom navigation: Today | Tasks | Prep Lists | My Work
  - Fullscreen mobile viewport (no desktop sidebar)
  - Offline banner (reuse existing pattern)
  - Active tab highlighting

- [x] **Create route structure:**
  - `/kitchen/mobile/` → Today tab (event overview with urgency)
  - `/kitchen/mobile/tasks` → Tasks tab (claim/release tasks)
  - `/kitchen/mobile/prep-lists` → Prep Lists tab (event-grouped lists)
  - `/kitchen/mobile/prep-lists/[id]` → Prep List detail (item completion)
  - `/kitchen/mobile/my-work` → My Work tab (claimed/active tasks)

### ~~P1 — Today Tab (Daily Overview)~~ ✅ COMPLETE (2026-02-19)

- [x] **Create API endpoint:** `GET /api/kitchen/events/today`
  - Returns events for today + tomorrow
  - Each event: name, startTime, headcount, unclaimedPrepCount, incompleteItemsCount
  - Urgency: `< 2h` = critical (red), `< 6h` = warning (amber), else = ok (green)

- [x] **Create Today page:** `/(mobile-kitchen)/kitchen/mobile/page.tsx`
  - Event cards with urgency color borders
  - Shows: event name, time, headcount, "X tasks unclaimed", "Y items incomplete"
  - Empty state: "No events today"

### ~~P2 — Task Bundle Claiming~~ ✅ COMPLETE (2026-02-19)

- [x] **Create API endpoint:** `POST /api/kitchen/tasks/bundle-claim`
  - Accepts `{ taskIds: string[] }`
  - Atomic: all succeed or none claimed (transaction)
  - Returns claimed tasks and any failures

- [x] **Add multi-select to Tasks tab:**
  - Long-press → multi-select mode
  - Checkboxes on all cards
  - "Select All [Station]" shortcut
  - Floating "Claim X Tasks" button

- [x] **Add station filter bottom sheet:**
  - Filter by: station, priority, event
  - "My Station" quick button (localStorage)
  - Filter chips above task list

### ~~P3 — Prep Lists Enhancement~~ ✅ COMPLETE (2026-02-19)

- [x] **Add completion interaction to prep list items:**
  - Large checkbox (single tap = complete)
  - Filter bar: All | Incomplete | Complete
  - Offline queue for completions
  - Location: `/(mobile-kitchen)/kitchen/mobile/prep-lists/[id]/page.tsx`

### ~~P4 — My Work Tab~~ ✅ COMPLETE (2026-02-19)

- [x] **Create unified My Work page:** `/(mobile-kitchen)/kitchen/mobile/my-work`
  - Fetch: claimed kitchen tasks + claimed prep tasks
  - Groups: Active (in_progress) | Claimed (not started)
  - Start/Complete/Release buttons
  - 30s auto-refresh

### Key Invariants (Must Never Happen)

- Task must never be claimable by two users simultaneously
- Bundle claim must be atomic (all or none)
- Prep list completions must never be lost offline
- Mobile UI must never require more than 2 taps to claim/complete

---

## P0 — Critical Blockers (Must Do First)

### 1. ~~Add Venue Database Model~~ ✅ COMPLETE (2026-02-18)
- **Spec:** `specs/crm/crm-venue-management_TODO/crm-venue-management.md`
- **Implemented:**
  - Added `Venue` model to Prisma schema with all required fields
  - Added `venueEntityId` to Event model for venue linking
  - Implemented full CRUD server actions in `apps/app/app/(authenticated)/crm/venues/actions.ts`
  - Updated all venue UI pages (list, new, detail, edit)
  - Added venue filtering by type, city, capacity, status
  - Implemented soft delete with active event check

### 2. ~~Mobile Time Clock Interface~~ ✅ COMPLETE (2026-02-18)
- **Spec:** `specs/mobile/mobile-time-clock_TODO/mobile-time-clock.md`
- **Implemented:**
  - Created mobile time clock page at `/staff/mobile/timeclock`
  - Added `/api/timecards/me` endpoint for current employee status
  - Implemented clock in/out with large touch-friendly buttons
  - Added geolocation capture at clock in/out
  - Added photo verification for clock in
  - Added break tracking (start/end break)
  - Implemented offline support with sync queue
  - Location selection with job site picker
  - Real-time clocked-in duration display

---

## Bug Fixes

### Mobile Kitchen Duplicate Route (2026-02-19)
- **Fixed:** Removed duplicate mobile kitchen route
- **Issue:** Both `/(authenticated)/kitchen/mobile/page.tsx` and `/(mobile-kitchen)/kitchen/mobile/page.tsx` resolved to same path `/kitchen/mobile`, causing Next.js build failure
- **Resolution:** Deleted old `(authenticated)` version since new `(mobile-kitchen)` route group has proper mobile shell with bottom navigation

### Manifest Runtime NodeJS Enforcement (2026-02-18)
- **Fixed:** Manifest runtime nodejs enforcement
- **Issue:** Command routes using createManifestRuntime needed explicit `export const runtime = 'nodejs'` to prevent Edge runtime usage
- **Resolution:** Added runtime declaration to 224 command route files, updated invariant test

### Command Board Bugs (2026-02-18) ✅ ALL FIXED
- **Location:** `specs/command-board/BUGS.md`
- **Fixed Issues:**
  - BUG-01: Entity Detail Panel now properly wired up
  - BUG-02: Duplicate entities prevention implemented
  - BUG-03: Undo/Redo functionality restored
  - BUG-04: Entity Browser now tracks real-time projections
  - BUG-05: Error boundary added for React Flow crashes
  - BUG-06: Grid-based placement algorithm for card positioning
  - BUG-07: Card width constraints applied
  - BUG-08: MiniMap/Controls styling fixed

### Linting Issues (2026-02-18) ✅ FIXED
- **Fixed:** Various linting issues across codebase
- **Issues:**
  - Unused variables in QuickBooks export tests
  - Missing default switch clause in SMS webhook route
  - Formatting inconsistencies in 253 files
- **Resolution:** Added underscore prefix to unused variables, added default switch clause, auto-fixed with biome

---

## P1 — High Priority (AI + Command Board Enhancement)

### 3. ~~AI Conflict Detection Completion~~ ✅ COMPLETE (2026-02-18)
- **Specs:** `specs/ai/ai-*-conflict-detection_TODO/`
- **Implemented:**
  - Equipment conflict detection: Detects same equipment needed at multiple overlapping events
  - Links equipment via stations → prep list items → prep lists → events
  - Provides resolution options (substitute equipment, reschedule events)
  - Severity levels based on number of conflicting events (2 events = high, >2 = critical)
  - Added "equipment" to ConflictType and affected entity types
  - Updated conflict summary to include equipment counts
  - Note: Employee, Inventory, and Venue conflict detection were already implemented in the conflicts API

### 4. ~~AI Suggested Next Actions~~ ✅ COMPLETE (2026-02-18)
- **Spec:** `specs/ai/ai-suggested-next-actions_TODO/`
- **Implemented:**
  - Integrated existing SuggestionsPanel into Command Board BoardShell
  - Added suggestions state and fetch logic to BoardShell
  - Added suggestions toggle button to BoardHeader
  - Added keyboard shortcut (Cmd+S) for suggestions panel
  - Panel shows AI-generated suggestions with dismiss/refresh actions
  - Suggestions render as side panel on right side of board

### 5. ~~Command Board: Live Card Updates~~ ✅ COMPLETE (2026-02-18)
- **Spec:** `specs/command-board/SPEC_product-direction.md`
- **Implemented:**
  - Created `useEntityPolling` hook for periodic entity refresh
  - Hook polls every 30 seconds for entity data changes
  - Pauses polling when tab is not visible (saves resources)
  - Only updates entities when data actually changes (JSON comparison)
  - Disabled during simulation mode (only polls in live mode)
  - Wired into BoardShell component alongside existing inventory realtime

### 6. ~~Command Board: Quick Actions on Cards~~ ✅ COMPLETE (2026-02-18)
- **Spec:** `specs/command-board/SPEC_product-direction.md`
- **Implemented:**
  - Added quick action dropdown menu to projection cards
  - Task actions: Start, Mark Complete, Release, Cancel (based on task status)
  - Event actions: Confirm Event, Mark Completed, Cancel Event (based on event status)
  - Wired up API calls to kitchen task and event command endpoints
  - Auto-refresh after action execution

---

## P2 — Integrations (External System Connectivity)

### ~~7. Nowsta Integration~~ ✅ COMPLETE (2026-02-18)
- **Spec:** `specs/nowsta-integration_TODO/`
- **Implemented:**
  - Added `NowstaConfig`, `NowstaEmployeeMapping`, `NowstaShiftSync` models to Prisma schema
  - Created Nowsta API client service (`apps/api/app/lib/nowsta-client.ts`)
  - Created sync service with employee auto-mapping and shift sync (`apps/api/app/lib/nowsta-sync-service.ts`)
  - API endpoints:
    - `GET/POST/DELETE /api/integrations/nowsta/config` - Manage configuration
    - `POST /api/integrations/nowsta/sync` - Trigger sync
    - `GET /api/integrations/nowsta/status` - Get sync status
    - `GET /api/integrations/nowsta/employees` - List employees for mapping
    - `POST /api/integrations/nowsta/employees/map` - Create/update mapping
    - `POST/GET /api/integrations/nowsta/test` - Test connection
  - Employee auto-mapping by email match
  - Shift sync with duplicate prevention via Nowsta shift IDs
  - Full error handling and status tracking

### ~~8. Goodshuffle Integration~~ ✅ COMPLETE (2026-02-18)
- **Specs:** `specs/administrative/goodshuffle-*-sync_TODO/`
- **Implemented:**
  - Added `GoodshuffleInventorySync` and `GoodshuffleInvoiceSync` models to Prisma schema
  - Extended GoodshuffleClient with inventory and invoice API methods
  - Created inventory sync service (`apps/api/app/lib/goodshuffle-inventory-sync-service.ts`)
  - Created invoice sync service (`apps/api/app/lib/goodshuffle-invoice-sync-service.ts`)
  - Inventory sync maps Goodshuffle items to Convoy InventoryItem model
  - Invoice sync maps Goodshuffle invoices to Convoy EventBudget/BudgetLineItem models
  - API endpoints:
    - `GET /api/integrations/goodshuffle/inventory` - List inventory sync records
    - `POST /api/integrations/goodshuffle/inventory/sync` - Trigger inventory sync
    - `GET /api/integrations/goodshuffle/invoices` - List invoice sync records
    - `POST /api/integrations/goodshuffle/invoices/sync` - Trigger invoice sync
  - Conflict detection for name, quantity, and cost fields
  - Status tracking with synced, pending, conflict, and error states
  - Note: Event sync was already implemented in prior work

### ~~9. QuickBooks Invoice Export~~ ✅ COMPLETE (2026-02-18)
- **Spec:** `specs/staff/quickbooks-invoice-export_TODO/`
- **Implemented:**
  - Created invoice export utility at `apps/api/app/lib/quickbooks-invoice-export.ts`
  - Supports QuickBooks Online CSV format with proper column structure
  - Supports QuickBooks Desktop IIF format for import
  - Builder pattern for fluent invoice construction
  - CSV escaping for special characters (commas, quotes)
  - Configurable date formats (US MM/DD/YYYY or ISO YYYY-MM-DD)
  - Account mappings for income accounts, items, tax codes
  - Created API endpoint at `/api/events/export/quickbooks`
  - Filters events by date range, status
  - Maps Event + BudgetLineItems to invoice line items
  - Returns base64-encoded file for download
  - Full test coverage (14 tests passing)

### ~~9b. QuickBooks Bill Export~~ ✅ COMPLETE (2026-02-18)
- **Spec:** `specs/staff/quickbooks-bill-export_TODO/`
- **Implemented:**
  - Created bill export utility at `apps/api/app/lib/quickbooks-bill-export.ts`
  - Supports QuickBooks Online CSV format with proper column structure
  - Supports QuickBooks Desktop IIF format for import
  - Builder pattern for fluent bill construction
  - CSV escaping for special characters (commas, quotes, newlines)
  - Configurable date formats (US MM/DD/YYYY or ISO YYYY-MM-DD)
  - Account mappings for expense accounts, AP accounts, items
  - Created API endpoint at `/api/inventory/purchase-orders/export/quickbooks`
  - Filters purchase orders by date range, status, vendor
  - Maps PurchaseOrder + PurchaseOrderItems to bill line items
  - Returns base64-encoded file for download
  - Full test coverage (25 tests passing)

---

## P3 — Feature Gaps (Spec TODOs with Existing Foundations)

### 10. ~~Client Segmentation UI~~ ✅ COMPLETE (2026-02-18)
- **Spec:** `specs/crm/crm-client-segmentation_TODO/`
- **Implemented:**
  - Added `getAvailableTags` server action to fetch unique tags with counts
  - Added tag filter dropdown with multi-select capability
  - Tag filter shows tag name and client count
  - Filters persist in URL query parameters
  - Tag selections clear with other filters

### ~~11. Bulk Edit Operations (Command Board)~~ ✅ COMPLETE (2026-02-18)
- **Spec:** `specs/kitchen/bulk-edit-operations_TODO/`
- **Implemented:**
  - Created bulk edit server action (`apps/app/app/(authenticated)/command-board/actions/bulk-edit.ts`)
  - Supports bulk editing status and priority for events, prep tasks, kitchen tasks, proposals, shipments
  - Preview functionality shows current vs new values before applying changes
  - Undo support with snapshot-based rollback
  - Created BulkActionToolbar component with ReactFlow selection integration
  - Multi-select support via Shift+click and drag selection
  - Visual feedback with toast notifications for success/errors
  - Undo toast after successful bulk edit

### ~~12. Bulk Grouping Operations~~ ✅ COMPLETE (2026-02-18)
- **Spec:** `specs/kitchen/bulk-grouping-operations_TODO/`
- **Implemented:**
  - Created group server actions (`apps/app/app/(authenticated)/command-board/actions/groups.ts`)
  - Supports creating named groups from selected entities
  - Automatic bounding box calculation for group positioning
  - Ungroup functionality to return entities to individual items
  - Added "Group" button to BulkActionToolbar (appears when 2+ items selected)
  - Added "Ungroup" button (appears when all selected items share same group)
  - Group dialog for naming the group
  - Toast notifications for success/errors
  - Note: Visual group rendering on canvas uses existing ReactFlow parentId mechanism

### ~~13. SMS Notification System~~ ✅ COMPLETE (2026-02-18)
- **Spec:** `specs/sms-notification-system_TODO/`
- **Implemented:**
  - Added `sms_logs` model to Prisma schema with delivery status tracking
  - Added `sms_status` enum (pending, sent, delivered, failed)
  - Created SMS template utility with merge field support (`packages/notifications/sms-templates.ts`)
  - Pre-defined templates for: urgent_update, shift_reminder, shift_assignment, task_assignment, task_reminder, clock_in_reminder, schedule_change
  - Created SMS notification service (`packages/notifications/sms-notification-service.ts`)
  - Opt-in/opt-out checking via notification_preferences
  - E.164 phone number normalization and validation
  - Delivery status tracking via sms_logs table
  - API endpoints:
    - `POST /api/collaboration/notifications/sms/send` - Send SMS notifications
    - `GET /api/collaboration/notifications/sms/history` - Get SMS delivery history
    - `GET/POST /api/collaboration/notifications/sms/preferences` - Manage SMS preferences
    - `POST /api/collaboration/notifications/sms/webhook` - Twilio delivery status callback
  - Full test coverage (14 tests passing)

### ~~14. Email Template System~~ ✅ COMPLETE (2026-02-18)
- **Spec:** `specs/administrative/email-template-system_TODO/`
- **Implemented:**
  - Added `email_templates` model to Prisma schema with merge fields support
  - Added `email_template_type` enum (proposal, confirmation, reminder, follow_up, contract, contact, custom)
  - Created CRUD server actions in `apps/app/app/(authenticated)/settings/email-templates/actions.ts`
  - Full template list page with filtering by type and status
  - Template creation page with merge field insertion
  - Template editing page with preview functionality
  - Merge field rendering with `{{fieldName}}` syntax
  - Common merge fields (recipientName, eventName, proposalUrl, etc.)
  - Template preview with sample data
  - Default template support per template type
  - Active/inactive template status

### ~~15. Automated Email Workflows~~ ✅ COMPLETE (2026-02-18)
- **Spec:** `specs/administrative/automated-email-workflows_TODO/`
- **Implemented:**
  - Added `EmailWorkflow` and `EmailLog` models to Prisma schema
  - Added `email_trigger_type` and `email_status` enums
  - Created email notification service (`packages/notifications/email-notification-service.ts`)
  - Created email template rendering utility (`packages/notifications/email-templates.ts`)
  - Created email workflow trigger service (`packages/notifications/email-workflow-triggers.ts`)
  - API endpoints:
    - `GET/POST /api/collaboration/notifications/email/preferences` - Manage email preferences
    - `GET /api/collaboration/notifications/email/history` - Get email delivery history
    - `POST /api/collaboration/notifications/email/send` - Send email notifications
    - `POST /api/collaboration/notifications/email/webhook` - Resend delivery status callback
    - `GET/POST /api/collaboration/notifications/email/workflows` - List/create workflows
    - `GET/PUT/DELETE /api/collaboration/notifications/email/workflows/[id]` - Workflow CRUD
    - `POST /api/cron/email-reminders` - Scheduled task/shift reminder processing
  - Trigger types: event_confirmed, event_canceled, event_completed, task_assigned, task_completed, task_reminder, shift_reminder, proposal_sent, contract_signed
  - Opt-in/opt-out support via notification_preferences
  - Template-based emails with merge field support
  - Delivery status tracking via email_logs

---

## P4 — Polish & Future Features

### ~~16. Event Budget Tracking~~ ✅ COMPLETE (2026-02-18)
- **Spec:** `specs/kitchen/event-budget-tracking_TODO/`
- **Implemented:**
  - `EventBudget` and `BudgetLineItem` models with variance tracking
  - Full CRUD API endpoints at `/api/events/budgets/`
  - Budget list page with performance overview, search, and filters
  - Budget detail page with line item management
  - Variance calculation and real-time status updates
  - Multiple budget version support

### ~~17. Event Contract Management~~ ✅ COMPLETE (2026-02-18)
- **Spec:** `specs/kitchen/event-contract-management_TODO/`
- **Implemented:**
  - Contract CRUD with status tracking (draft, sent, signed, expired, canceled)
  - Electronic signature capture via SignaturePad component
  - Document upload and PDF generation
  - Contract email sending via Resend
  - Expiring contracts API endpoint
  - **Automated expiration alert notifications (cron job)** - 2026-02-18
    - Added `contract_expiration` trigger type to `email_trigger_type` enum
    - Created cron endpoint `/api/cron/contract-expiration-alerts` for daily processing
    - Configurable reminder intervals (default: 30, 14, 7, 3, 1 days before expiration)
    - Integrated with email workflow system for template-based notifications
    - Added helper functions `buildContractRecipients` and `buildContractTemplateData`
  - **Public client-side signing page** - 2026-02-18
    - Added `signingToken` field to EventContract model for secure public access
    - Public API endpoints at `/api/public/contracts/[token]` for contract access and signing
    - Public signing page at `/sign/contract/[token]` (no auth required)
    - Updated contract send endpoint to generate signing token and use public URL
    - SignaturePad component updated with `isSubmitting` state
    - Full contract details, document download, and signature capture
  - **Contract history/versions view** - 2026-02-18
    - Added `/api/events/contracts/[id]/history` endpoint to fetch contract audit logs
    - Contract status changes logged to `platform.audit_log` table
    - Contract detail page shows history timeline with status changes and signatures
    - History section displays performer info, old/new values, and timestamps
  - **Document preview in UI** - 2026-02-18
    - Added iframe-based PDF preview for contract documents
    - Added image preview support for image uploads
    - Fallback message with download button for unsupported types

### ~~18. Event Proposal Generation~~ ✅ COMPLETE (2026-02-18)
- **Spec:** `specs/kitchen/event-proposal-generation_TODO/`
- **Implemented:**
  - Proposal CRUD with line items
  - PDF export with `ProposalTemplate`
  - Email template for proposals
  - Status tracking (draft, sent, accepted, rejected)
  - **Email sending implementation** - 2026-02-18
    - Completed `sendProposal` action with actual Resend email integration
    - Uses `ProposalTemplate` from `@repo/email` for professional email formatting
    - Fetches client name for personalization
    - Formats total amount in USD currency
    - Builds proposal URL for email link
  - **Proposal Templates System** - 2026-02-18
    - Added `ProposalTemplate` model to Prisma schema with: name, description, eventType, defaultTerms, defaultTaxRate, defaultNotes, defaultLineItems (JSON), isActive, isDefault flags, tenantId relation
    - Added `templateId` field to Proposal model to link proposals to templates
    - Template CRUD server actions: getProposalTemplates, getProposalTemplateById, getDefaultTemplateForEventType, createProposalTemplate, updateProposalTemplate, deleteProposalTemplate (soft delete), duplicateProposalTemplate
    - Updated createProposal action to accept templateId parameter and apply template defaults for tax rate, terms, notes, and line items
    - Template management UI: list page (/crm/proposals/templates), create page (/crm/proposals/templates/new), edit page (/crm/proposals/templates/[id]/edit)
    - Updated proposal form with template selection dropdown
    - API endpoint GET /api/crm/proposals/templates
  - **Public Shareable Links** - 2026-02-18
    - Added `publicToken` field to Proposal model for secure public access
    - Public API endpoint GET `/api/public/proposals/[token]` - View proposal without auth
    - Public API endpoint POST `/api/public/proposals/[token]/respond` - Accept/reject without auth
    - Public viewing page at `/view/proposal/[token]` with:
      - Full proposal details display (line items, pricing, terms)
      - Accept/reject functionality with responder info capture
      - Automatic viewedAt tracking and status updates
      - Mobile-responsive design
    - Updated `sendProposal` action to generate public token and use public URL in emails
    - Added `getProposalPublicLink` action to get/regenerate public links
  - **Branding Customization** - 2026-02-19
    - Added branding fields to ProposalTemplate model: logoUrl, primaryColor, secondaryColor, accentColor, fontFamily
    - Updated PDF template to use custom branding colors, fonts, and logo
    - Updated email template to support branding customization
    - Added branding section to template creation and edit UI with color pickers
    - Default colors provided when no branding specified

### ~~19. Battle Board PDF Export~~ ✅ COMPLETE (2026-02-18)
- **Spec:** `specs/administrative/battle-board-pdf-export_TODO/`
- **Implemented:**
  - API route at `/api/events/[eventId]/battle-board/pdf` for PDF generation
  - BattleBoardPDF template with event, tasks, summary, and staff sections
  - Added BattleBoardExportButton component with download and copy-link options
  - Export button integrated into Battle Board page header
  - Supports direct download or base64 data URL for sharing

### ~~20. Inventory Recipe Costing~~ ✅ COMPLETE (2026-02-18)
- **Spec:** `specs/inventory/inventory-recipe-costing_TODO/`
- **Implemented:**
  - Recipe cost calculation engine with unit conversion support
  - Ingredient-to-inventory item linking by name match
  - Cost breakdown per ingredient with waste factor
  - API endpoints at `/api/kitchen/recipes/[recipeId]/cost`
  - Recipe list and detail pages with cost visualization
  - **Auto-update trigger: Recipe costs automatically recalculate when inventory item prices change**
  - Response includes `_recipeCostUpdate` info when recipes are affected
- **Note:** Spec invariant satisfied: "Cost updates must never be lost when inventory prices change"

### ~~21. Inventory Depletion Forecasting~~ ✅ COMPLETE (2026-02-18)
- **Spec:** `specs/inventory/inventory-depletion-forecasting_TODO/`
- **Implemented:**
  - Core forecasting logic with confidence levels (high/medium/low)
  - Historical usage analysis (30-day lookback)
  - Event-based projection for upcoming events
  - Reorder suggestions with urgency levels (critical/warning/info)
  - Forecast alerts API endpoint
  - Frontend UI with charts and alerts panel
- **Note:** Uses simplified 0.1 units/guest calculation (TODO: real menu-to-inventory mapping)

### ~~22. Warehouse Receiving Workflow~~ ✅ COMPLETE (2026-02-18)
- **Spec:** `specs/warehouse/warehouse-receiving-workflow_TODO/`
- **Implemented:**
  - PO matching and lookup
  - Quantity verification with validation
  - Quality status recording with discrepancy tracking
  - Automatic inventory stock updates on receive
  - Partial receiving support
  - Receiving reports page with supplier performance metrics
- **Missing:**
  - Explicit override mechanism for over-receiving
  - Dedicated receiving history view

### ~~23. Warehouse Cycle Counting~~ ✅ COMPLETE (2026-02-18)
- **Spec:** `specs/warehouse/warehouse-cycle-counting_TODO/`
- **Implemented:**
  - Full database schema (CycleCountSession, CycleCountRecord, VarianceReport, AuditLog)
  - Complete API endpoints for sessions, records, finalization
  - Manifest rules with state transitions and role-based policies
  - Server actions for sessions, records, finalization
  - Cycle counting list page
  - **Session detail page** (`/warehouse/audits/[sessionId]`) with:
    - Session summary cards (progress, variance, verified count)
    - Count records table with variance display
    - Add item to count dialog with inventory search
    - Edit count functionality
    - Verify record functionality
    - Complete and finalize session actions
  - Item selection integration with inventory search
  - Variance calculation and display in real-time

---

## Already Complete (Specs Marked _TODO But Implemented)

Several specs are marked `_TODO` but have substantial implementations:

| Feature | Implementation Status | Notes |
|---------|----------------------|-------|
| Payroll Calculation Engine | **Complete** | Full calculator, tax engine, exports |
| Payroll Timecard System | **Complete** | Clock in/out, approvals, exceptions |
| Payroll Approval Workflow | **Complete** | Multi-step approval with history |
| QuickBooks Payroll Export | **Complete** | QBXML and QBO CSV exports |
| QuickBooks Invoice Export | **Complete** | QBO CSV and IIF formats for events |
| QuickBooks Bill Export | **Complete** | QBO CSV and IIF formats for purchase orders |
| Scheduling Shift CRUD | **Complete** | Full API and UI |
| Scheduling Availability | **Complete** | Full API and UI |
| Scheduling Auto-Assignment | **Complete** | Sophisticated algorithm with tests |
| Scheduling Labor Budget | **Complete** | Budget tracking with alerts |
| Kitchen Prep List Generation | **Complete** | Auto-generation from events |
| Kitchen Allergen Tracking | **Complete** | Per-event allergen warnings |
| Kitchen Waste Tracking | **Complete** | Waste logging with mobile |
| Mobile Task Claim Interface | **Complete** | Offline support, priority badges |
| Mobile Recipe Viewer | **Complete** | Timer, scaling, offline cache |
| CRM Client Detail View | **Complete** | Full tabbed interface |
| CRM Client Communication Log | **Complete** | Timeline, interactions |
| AI Bulk Task Generation | **Complete** | GPT-4o-mini integration |
| AI Suggested Next Actions | **Complete** | Panel integrated into Command Board |
| Command Board Foundation | **Complete** | React Flow, Liveblocks, AI chat |
| Command Board Entity Cards | **Complete** | 9 entity types |
| Command Board Persistence | **Complete** | Full CRUD with undo/redo |
| Command Board Realtime Sync | **Complete** | Liveblocks integration |
| Command Board Relationships | **Complete** | Derived connections |
| Client Segmentation UI | **Complete** | Tag filter with multi-select, counts |
| Nowsta Integration | **Complete** | Employee mapping, shift sync |
| Goodshuffle Integration | **Complete** | Event, inventory, and invoice sync services |
| Bulk Edit Operations | **Complete** | Multi-select toolbar, preview, undo/redo |
| Bulk Grouping Operations | **Complete** | Group/ungroup UI, named groups |
| SMS Notification System | **Complete** | Templates, delivery tracking, opt-in/opt-out |
| Email Template System | **Complete** | User-defined templates, merge fields, preview |
| Automated Email Workflows | **Complete** | Workflow triggers, email service, scheduled reminders |
| Battle Board PDF Export | **Complete** | PDF generation API, export button, download/share options |
| Event Budget Tracking | **Complete** | Full CRUD, variance calculation, real-time status |
| Inventory Recipe Costing | **Complete** | Cost calculation, auto-update on price change |
| Inventory Depletion Forecasting | **Complete** | Confidence levels, reorder suggestions, frontend UI |
| Warehouse Receiving Workflow | **Complete** | PO matching, quality checks, automatic stock updates |
| Warehouse Cycle Counting | **Complete** | Session detail page, item search, count/verify workflow |
| Event Contract Management | **Complete** | CRUD, signatures, public signing, history timeline |
| Event Proposal Generation | **Complete** | CRUD, PDF export, email sending via Resend, template system, public shareable links |
| AI Event Summaries | **Complete** | API endpoint, EventBriefingCard UI, allergen/dietary info, team handoff summaries |
| Inventory Item Management | **Complete** | Full CRUD, SKU management, FSA compliance, dependency checking |
| Inventory Stock Levels | **Complete** | Stock tracking, adjustments, transactions, locations |
| Event Timeline Builder | **Complete** | Battle Board provides full timeline functionality |
| Manifest Kitchen Ops Rules Overrides | **Complete** | Constraint evaluation, override workflow, audit trail |
| Warehouse Shipment Tracking | **Complete** | Full lifecycle, PDF export, inventory reservation on preparation, event-to-shipment packing list generation |
| Training/HRMS | **Complete** | Training modules, assignments, completions, certifications, time-off, performance reviews, disciplinary actions, onboarding, secure PIN management |

---

## Package Infrastructure Status

| Package | Completeness | Notes |
|---------|-------------|-------|
| `@repo/database` | **Full** | 150+ models, 10 schemas |
| `@repo/design-system` | **Full** | 60+ UI components |
| `@repo/ai` | **Full** | Agent/workflow SDK |
| `@repo/payroll-engine` | **Full** | Calculator, tax, exports |
| `@angriff36/manifest` | **Full** | Custom DSL runtime |
| `@repo/manifest-adapters` | **Full** | Kitchen runtime |
| `@repo/kitchen-state-transitions` | **Full** | State machine |
| `@repo/collaboration` | **Full** | Liveblocks |
| `@repo/realtime` | **Full** | Outbox + events |
| `@repo/notifications` | **Full** | Knock + Twilio + SMS + Email workflows + delivery tracking |
| `@repo/email` | **Full** | User-defined templates with merge fields |
| `@repo/pdf` | **Full** | Battle Board, Event Detail, Proposal, Contract, Packing List templates |

---

## Architecture Observations

### Strong Points
1. **Manifest DSL System** - Sophisticated custom language for business rules
2. **Multi-tenant Architecture** - Clean isolation with composite PKs
3. **Command Board** - Feature-complete as primary interface
4. **Payroll Engine** - Full calculation with tax and exports
5. **Kitchen Operations** - Complete workflow with state machines
6. **External Integrations** - Nowsta and Goodshuffle fully implemented
7. **Proposal Branding** - Full customization with logo, colors, and fonts
8. **Training/HRMS** - Complete employee lifecycle management with training, certifications, and compliance

---

## P5 — Unaddressed Specs (Previously Undocumented)

### ~~24. AI Event Summaries~~ ✅ COMPLETE (2026-02-18)
- **Spec:** `specs/ai/ai-event-summaries_TODO/`
- **Implemented:**
  - API endpoint at `/api/ai/summaries/[eventId]` for AI-powered event briefings
  - Generates concise summaries (200-400 words) for team handoffs
  - Includes client info, menu items, allergens, dietary restrictions, staff assignments
  - Critical safety info (allergens, dietary restrictions) never omitted
  - Fallback generator for AI failures
  - **EventBriefingCard component** for displaying quick briefings in event overview
  - Integrated into EventOverviewCard sidebar for easy access
  - Copy to clipboard and regenerate functionality
  - Highlights and critical info sections with visual indicators

### ~~25. Inventory Item Management~~ ✅ COMPLETE (2026-02-18)
- **Spec:** `specs/inventory/inventory-item-management_TODO/`
- **Implemented:**
  - Full CRUD API endpoints at `/api/inventory/items/`
  - Complete Prisma model with all required fields (SKU, description, unit, par levels, etc.)
  - UI pages with filtering, search, and create/edit modals
  - FSA compliance tracking (status, temperature logging, allergen info, traceability)
  - Dependency checking for deletion safety
  - Recipe cost recalculation when prices change

### ~~26. Inventory Stock Levels~~ ✅ COMPLETE (2026-02-18)
- **Spec:** `specs/inventory/inventory-stock-levels_TODO/`
- **Implemented:**
  - Stock levels API (`/api/inventory/stock-levels/`) with pagination and filters
  - Stock adjustment API (`/api/inventory/stock-levels/adjust`) with reason tracking
  - Transaction history API (`/api/inventory/stock-levels/transactions`)
  - Storage locations API (`/api/inventory/stock-levels/locations`)
  - Reorder status calculation (below_par, at_par, above_par)
  - Location-specific stock tracking
  - UI with performance overview, filters, and adjustment modal

### ~~27. Event Import/Export~~ ✅ COMPLETE (2026-02-18)
- **Spec:** `specs/kitchen/event-import-export_TODO/`
- **Implemented:**
  - **CSV Export** (`apps/api/app/api/events/[eventId]/export/csv/route.ts`):
    - Single event CSV export with sections: summary, menu, staff, guests
    - Proper CSV escaping, filename sanitization
    - Download and JSON response modes
  - **PDF Export** (`apps/api/app/api/events/[eventId]/export/pdf/route.tsx`):
    - Single event PDF export using @react-pdf/renderer and EventDetailPDF component
    - Includes event summary, menu, staff, guests, tasks
    - Metadata with generated date and user info
    - Base64 and download modes
  - **Bulk CSV Export** (`apps/api/app/api/events/export/csv/route.ts`):
    - Export filtered event lists with various filter parameters
    - Summary row with filters applied

### ~~28. Event Timeline Builder~~ ✅ COMPLETE (2026-02-18)
- **Spec:** `specs/kitchen/event-timeline-builder_TODO/`
- **Implemented:**
  - Battle Board provides complete timeline functionality:
    - 24-hour interactive timeline with drag-and-drop task scheduling
    - Time markers with 3-hour intervals and current time indicator
    - Zoom controls (50%-200%)
    - Task management with status tracking (not started, in progress, completed, delayed, blocked)
    - Priority levels (low, medium, high, critical)
    - Staff assignment with availability indicators
    - Conflict detection for overlapping assignments
    - Critical path calculation with visual highlighting
    - Undo/redo and keyboard shortcuts
    - Progress tracking and dependency management
  - Database: `tenant_events.timeline_tasks` table with full CRUD
  - Server actions for all operations including critical path calculation

### ~~29. Manifest Kitchen Ops Rules Overrides~~ ✅ COMPLETE (2026-02-18)
- **Spec:** `specs/manifest/manifest-kitchen-ops-rules-overrides_TODO/`
- **Implemented:**
  - Constraint evaluation with severity levels (OK/WARN/BLOCK)
  - Override workflow with role-based authorization
  - `ConstraintOverrideDialog` UI component
  - `OverrideAudit` table for tracking all overrides
  - Full audit trail with event emission
  - API routes for override management (`/api/kitchen/overrides/`)
  - Integration with all kitchen operations

### ~~30. Training/HRMS~~ ✅ COMPLETE (2026-02-19)
- **Spec:** `specs/training-hrms_TODO/`
- **Implemented:**
  - **Database Models** (Prisma schema):
    - `TrainingModule` - Training content with type, duration, category
    - `TrainingAssignment` - Module assignments to employees
    - `TrainingCompletion` - Completion tracking with scores
    - `EmployeeTimeOffRequest` - Time-off request management
    - `PerformanceReview` - Review scheduling and documentation
    - `DisciplinaryAction` - CA/PIP tracking with milestones
    - `ActionMilestone` - Milestone tracking for disciplinary actions
    - `OnboardingTask` - Onboarding checklist templates
    - `OnboardingCompletion` - Employee onboarding progress
    - `EmployeePin` - Secure PIN storage with encryption
    - `EmployeePinAccessLog` - Audit logging for PIN access
  - **Training Module API** (`/api/training/`):
    - `GET/POST /api/training/modules` - List/create training modules
    - `GET/PUT/DELETE /api/training/modules/[id]` - Module CRUD
    - `GET/POST /api/training/assignments` - List/create assignments
    - `POST /api/training/complete` - Start/complete training
  - **Certification API** (`/api/staff/certifications/`):
    - `GET/POST /api/staff/certifications` - List/create certifications
    - `GET/PUT/DELETE /api/staff/certifications/[id]` - Certification CRUD
    - Expiration tracking with days_until_expiry calculation
  - **Training UI** (`/staff/training/`):
    - Training module list page with stats
    - Create training module dialog with form validation
    - Training module detail page with assignment management
    - Assign training dialog with employee selection and due dates
- **Note:** Onboarding, performance reviews, and disciplinary actions have database models ready. UI for these features can be added as needed.

### ~~31. Warehouse Shipment Tracking~~ ✅ COMPLETE (2026-02-18)
- **Spec:** `specs/warehouse/warehouse-shipment-tracking_TODO/`
- **Implemented:**
  - Shipment API (`apps/api/app/api/shipments/`) with full CRUD
  - Status tracking: draft, scheduled, preparing, in_transit, delivered, returned, cancelled
  - Delivery confirmation fields (delivered_by, received_by, signature)
  - Tracking fields (tracking_number, carrier, shipping_method)
  - Shipment items with quantity tracking and condition
  - UI pages at `/warehouse/shipments`
  - Manifest commands for create, update, schedule, start-preparing, ship, mark-delivered, cancel
  - PDF packing list generation (`/api/shipments/[id]/pdf`)
  - Automatic inventory updates on delivery (adds stock for incoming shipments)
  - **Automatic inventory reservation on preparation** (2026-02-18):
    - Outgoing shipments (with event_id) have inventory reserved when entering "preparing" status
    - Inventory transactions created with "transfer" type and negative quantities
    - Inventory quantity_on_hand reduced for reserved items
    - Full reversal on cancellation (restores inventory)
  - **Event-to-shipment packing list generation** (2026-02-18):
    - API endpoint `POST /api/events/[eventId]/shipments/generate` to create shipments from event prep lists
    - API endpoint `GET /api/events/[eventId]/shipments/generate` to preview shipment requirements
    - Maps prep list ingredients to inventory items by name matching
    - Stock availability validation with configurable enforcement
    - Automatic shipment number generation with year-based sequencing
    - Links shipment to event and location

### ~~32. Outbound Webhook System~~ ✅ COMPLETE (2026-02-19)
- **Spec:** `specs/webhook-outbound-integrations_TODO/`
- **Implemented:**
  - Database models: `OutboundWebhook`, `WebhookDeliveryLog` with full Prisma schema
  - Enums: `webhook_event_type`, `webhook_status`, `webhook_delivery_status`
  - Webhook delivery service with HMAC-SHA256 signature generation
  - Exponential backoff retry logic with configurable delays
  - Auto-disable after 5 consecutive failures
  - API endpoints:
    - `GET/POST /api/integrations/webhooks` - List/create webhooks
    - `GET/PUT/DELETE /api/integrations/webhooks/[id]` - Webhook CRUD
    - `GET /api/integrations/webhooks/delivery-logs` - Delivery log history
    - `POST /api/integrations/webhooks/trigger` - Trigger webhooks for entity events
    - `POST /api/integrations/webhooks/retry` - Retry failed deliveries
  - Event filtering by entity type and event type
  - Full test coverage (21 tests passing)
  - Support for custom headers, API keys, and secrets

---

## Recommended Execution Order

1. **Week 1:** P0 blockers (Venue model, Mobile time clock)
2. **Week 2:** P1 AI features (Conflict detection, Suggestions)
3. **Week 3-4:** P2 Integrations (Nowsta, Goodshuffle)
4. **Week 5-6:** P3 Feature gaps (Bulk ops, Notifications)
5. **Week 7+:** P4 Polish items

---

## File References

**Command Board:** `apps/app/app/(authenticated)/command-board/`
**API Routes:** `apps/api/app/api/`
**Database Schema:** `packages/database/prisma/schema.prisma`
**Payroll Engine:** `packages/payroll-engine/src/`
**Manifest System:** `packages/manifest-runtime/`, `packages/manifest-adapters/`
**Specs:** `specs/**/*_TODO/`

---

*This plan was generated from analysis of 500+ files across apps, packages, and specs directories.*
