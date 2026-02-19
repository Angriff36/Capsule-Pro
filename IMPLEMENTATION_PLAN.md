# Convoy Implementation Plan

> Last updated: 2026-02-18
> Generated from comprehensive codebase analysis using 20+ parallel agents

## Executive Summary

The Convoy platform is a catering/event management SaaS with strong foundations. The **Command Board** is feature-complete for core functionality and serves as the primary interface. Key gaps exist in integrations, mobile features, and some AI capabilities.

**Overall Completion: ~75%**

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

### Manifest Runtime NodeJS Enforcement (2026-02-18)
- **Fixed:** Manifest runtime nodejs enforcement
- **Issue:** Command routes using createManifestRuntime needed explicit `export const runtime = 'nodejs'` to prevent Edge runtime usage
- **Resolution:** Added runtime declaration to 224 command route files, updated invariant test

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

### 8. Goodshuffle Integration (3 parts)
- **Specs:** `specs/administrative/goodshuffle-*-sync_TODO/`
- **Parts:** Event sync, Inventory sync, Invoicing sync
- **Status:** Specs only - no implementation
- **Effort:** 6-8 hours each

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
    - `GET /api/collaboration/notifications/sms/logs` - Get SMS delivery logs
    - `GET/POST /api/collaboration/notifications/sms/preferences` - Manage SMS preferences
    - `POST /api/collaboration/notifications/sms/webhook` - Twilio delivery status callback
  - Full test coverage (14 tests passing)

### 14. Email Template System
- **Spec:** `specs/administrative/email-template-system_TODO/`
- **Status:** 3 templates exist (contact, contract, proposal)
- **Missing:** Template management UI, more templates
- **Effort:** 4-6 hours

### 15. Automated Email Workflows
- **Spec:** `specs/administrative/automated-email-workflows_TODO/`
- **Status:** Infrastructure exists, workflows not configured
- **Effort:** 6-8 hours

---

## P4 — Polish & Future Features

### 16. Event Budget Tracking Enhancement
- **Spec:** `specs/kitchen/event-budget-tracking_TODO/`
- **Status:** Basic budget model exists, tracking features partial
- **Effort:** 3-4 hours

### 17. Event Contract Management
- **Spec:** `specs/kitchen/event-contract-management_TODO/`
- **Status:** Contract model exists, workflow incomplete
- **Effort:** 4-6 hours

### 18. Event Proposal Generation
- **Spec:** `specs/kitchen/event-proposal-generation_TODO/`
- **Status:** Proposal model exists, AI generation missing
- **Effort:** 4-6 hours

### 19. Battle Board PDF Export
- **Spec:** `specs/administrative/battle-board-pdf-export_TODO/`
- **Status:** API route exists, PDF package is skeleton
- **Effort:** 3-4 hours

### 20. Inventory Recipe Costing
- **Spec:** `specs/inventory/inventory-recipe-costing_TODO/`
- **Status:** Models exist, costing calculations not wired
- **Effort:** 4-6 hours

### 21. Inventory Depletion Forecasting
- **Spec:** `specs/inventory/inventory-depletion-forecasting_TODO/`
- **Status:** Forecast model exists, prediction logic missing
- **Effort:** 4-6 hours

### 22. Warehouse Receiving Workflow
- **Spec:** `specs/warehouse/warehouse-receiving-workflow_TODO/`
- **Status:** Shipment model exists, receiving UI missing
- **Effort:** 4-6 hours

### 23. Warehouse Cycle Counting
- **Spec:** `specs/warehouse/warehouse-cycle-counting_TODO/`
- **Status:** Cycle count models exist, UI partial
- **Effort:** 3-4 hours

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
| Bulk Edit Operations | **Complete** | Multi-select toolbar, preview, undo/redo |
| Bulk Grouping Operations | **Complete** | Group/ungroup UI, named groups |
| SMS Notification System | **Complete** | Templates, delivery tracking, opt-in/opt-out |

---

## Package Infrastructure Status

| Package | Completeness | Notes |
|---------|-------------|-------|
| `@repo/database` | **Full** | 137 models, 10 schemas |
| `@repo/design-system` | **Full** | 60+ UI components |
| `@repo/ai` | **Full** | Agent/workflow SDK |
| `@repo/payroll-engine` | **Full** | Calculator, tax, exports |
| `@angriff36/manifest` | **Full** | Custom DSL runtime |
| `@repo/manifest-adapters` | **Full** | Kitchen runtime |
| `@repo/kitchen-state-transitions` | **Full** | State machine |
| `@repo/collaboration` | **Full** | Liveblocks |
| `@repo/realtime` | **Full** | Outbox + events |
| `@repo/notifications` | **Full** | Knock + Twilio + SMS templates + delivery tracking |
| `@repo/email` | **Partial** | 3 templates only |
| `@repo/pdf` | **Skeleton** | Needs implementation |

---

## Architecture Observations

### Strong Points
1. **Manifest DSL System** - Sophisticated custom language for business rules
2. **Multi-tenant Architecture** - Clean isolation with composite PKs
3. **Command Board** - Feature-complete as primary interface
4. **Payroll Engine** - Full calculation with tax and exports
5. **Kitchen Operations** - Complete workflow with state machines

### Gaps
1. **External Integrations** - Nowsta, Goodshuffle not implemented
2. **Mobile Time Clock** - Frontend missing despite backend support
3. **Venue Management** - Blocked on database model
4. **PDF Generation** - Package is skeleton
5. **Bulk Operations UI** - APIs exist, UI missing

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
