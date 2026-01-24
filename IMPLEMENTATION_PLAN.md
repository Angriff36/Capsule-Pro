# Convoy Implementation Plan

**Last Updated:** 2026-01-23
**Status:** Implementation in Progress
**Overall Progress:** ~62% Complete (+4% from GPT-4o-mini integration, Inventory Item Management, and Allergen Tracking completion)

**Module Status Summary:**
| Module | Database | API | UI | Overall |
|--------|----------|-----|----|---------|
| Kitchen | 95% | 80% | 75% | **78%** |
| Events | 100% | 80% | 80% | **80%** |
| Staff/Scheduling | 90% | 70% | 60% | **65%** |
| CRM | 100% | 100% | 100% | **100%** |
| Inventory | 80% | 60% | 45% | **58%** |
| Analytics | 70% | 85% | 80% | **80%** |
| Integrations | 0% | 0% | 0% | **0%** |
| Platform | 20% | 5% | 5% | **10%** |

**Priority Order:** Kitchen Tasks (P0) Events (P0) Staff/Scheduling (P1) Inventory (P1) CRM (P2) Analytics (P2) Integrations (P3) Platform (P3)

---

## Executive Summary

### Critical Architecture Issues

1. **`packages/realtime` is EMPTY** - Confirmed: Package has ZERO files
   - Ably integration needs to be built from scratch
   - Outbox pattern exists in schema (OutboxEvent model) but no implementation
   - Kitchen task claims, event updates, scheduling changes all depend on this

2. **CRITICAL BUG: OutboxEvent Model Missing from Database Client** - RUNTIME FAILURE RISK
   - The outbox publish endpoint at `apps/api/app/outbox/publish/route.ts` references `database.outboxEvent`
   - While the OutboxEvent model EXISTS in the Prisma schema (line 2476), the generated database client may not include it
   - This will cause immediate runtime failures when the outbox publish endpoint is called
   - **ACTION REQUIRED:** Verify Prisma client generation includes OutboxEvent model by running `pnpm migrate`
   - If the model is not in the generated client, this is a blocking issue for all real-time features

3. **GPT-4o-mini Integration Complete** ✅
   - `@repo/ai` package now has full GPT-4o-mini integration
   - Agent framework properly connects to OpenAI API
   - AI features (bulk task generation, event summaries, conflict detection) can now be implemented

4. **PDF Generation Missing** - Confirmed: No PDF library exists in project
   - Battle Board PDF export cannot work
   - Proposal PDF generation is a TODO
   - Contract PDF export is missing
   - Searched all package.json files: no @pdf, pdfkit, jspdf, or react-pdf dependencies found

5. **Event Budget UI Complete** - API and UI are both 100% complete
   - Full CRUD API exists at `apps/api/app/api/events/budgets/`
   - Complete UI implementation with budget management, line items, filtering, and search

**MUST CHANGE IMMEDIATELY**

If any api endpoint currently lives in the wrong place (apps/app/app/api/...) and hasn’t been migrated yet, then in IMPLEMENTATION_PLAN.md you should:

- Write it as a migration task with an explicit “source → destination” operation.

Example (this is the pattern you should use everywhere):

Migrate Event Budgets API from apps/app/app/api/events/budgets/** → apps/api/app/api/events/budgets/**, then delete the original under apps/app.
---

## MODULE-BY-MODULE BREAKDOWN

### PHASE 1: KITCHEN MODULE

**Status: 70% Complete**

#### 1.1 Kitchen Task Management & Production Board

**Specs:** `mobile-task-claim-interface.md`, `kitchen-prep-list-generation.md`

**Status:** 90% Complete

**Database:** Complete (KitchenTask, KitchenTaskClaim, KitchenTaskProgress, PrepTask)
**Location:** `packages/database/prisma/schema.prisma`

**API Endpoints:** Complete
- `GET /api/kitchen/tasks/available` - Get user's available tasks (mobile)
- `GET /api/kitchen/tasks/my-tasks` - Get user's claimed tasks
- `POST /api/kitchen/tasks/sync-claims` - Sync offline claims
- `POST /api/kitchen/tasks/bulk-activate` - Accept/activate generated tasks
- `DELETE /api/kitchen/tasks/bulk-reject` - Reject generated tasks

**UI Components:** Complete
- Mobile task list view with optimized interactions
- Offline queue management for mobile claims
- Production board for task management
**Location:** `apps/app/app/(authenticated)/kitchen/production-board-realtime.tsx`

**Missing:**
- Real-time updates via Ably (blocked by empty `packages/realtime`)

**Complexity:** Low | **Dependencies:** `packages/realtime` implementation

---

#### 1.2 Recipe Management System

**Specs:** `mobile-recipe-viewer.md`

**Status:** 90% Complete

**Database:** Complete (Recipe, RecipeVersion, RecipeIngredient, Ingredient, PrepMethod)

**API Endpoints:** Complete (CRUD, versioning, costing, scaling, mobile views)

**UI Components:** Complete (creation/edit forms, step-by-step viewers)

**Missing:**
- Mobile recipe viewer (spec calls for mobile-optimized view)

**Complexity:** Low | **Dependencies:** None

---

#### 1.3 Prep List Generation

**Specs:** `kitchen-prep-list-generation.md`

**Status:** 95% Complete

**Database:** Complete (PrepList, PrepListItem)

**API Endpoints:** Complete (auto-generation from event menu, station-based filtering, CRUD)

**UI Components:** Complete (viewer grouped by station/date, editor for manual adjustments)

**Complexity:** Complete | **Dependencies:** None

---

#### 1.4 Allergen Tracking ✅ COMPLETE

**Specs:** `kitchen-allergen-tracking.md`

**Status:** 100% Complete (updated from 20% - mock data replaced with real implementation)

**Database:** Complete (AllergenWarning, EventGuest models exist in tenant_kitchen and tenant_events schemas)

**API Endpoints:** Complete
**Location:** `apps/api/app/api/kitchen/allergens/`
- `GET /api/kitchen/allergens/warnings` - List all warnings with filtering (is_acknowledged, severity, warning_type, pagination)
- `POST /api/kitchen/allergens/detect-conflicts` - Automated conflict detection and warning generation
- `POST /api/kitchen/allergens/update-dish` - Update dish allergen/dietary information
- `POST /api/events/allergens/check` - Check for allergen conflicts between guests and dishes
- `POST /api/events/allergens/warnings/acknowledge` - Acknowledge/resolve warnings
- `GET /api/events/[eventId]/warnings` - Get warnings for specific event

**UI Components:** Complete
**Location:** `apps/app/app/(authenticated)/kitchen/allergens/page.tsx`
- Real API integration (replaced mock data)
- Tabbed interface: Warnings, Events, Dishes, Recipes
- Search and filtering functionality
- Warning acknowledgment and resolution actions
- Real-time data refresh via custom events
- Modal for editing dish allergen information

**Features Implemented:**
- Real allergen conflict detection logic
- Automated warning generation service
- Guest dietary restriction tracking
- Production allergen warnings system with severity levels (critical, warning, info)
- Cross-contamination detection between dish allergens and guest restrictions
- Override reason tracking for resolved warnings

**Complexity:** Complete | **Dependencies:** None (uses existing models)

---

#### 1.5 Waste Tracking

**Specs:** `kitchen-waste-tracking.md`

**Status:** 40% Complete

**Database:** Complete (WasteReason in core, WasteEntry in tenant_kitchen)

**API Endpoints:** Basic CRUD exists but incomplete

**UI Components:** Basic UI exists with TODOs

**Still Needed:**
- Dynamic inventory items/units fetching
- Proper auth context for loggedBy
- Real waste calculation logic
- Integration with inventory system

**Complexity:** Medium | **Dependencies:** Inventory module

---

#### 1.6 AI Features for Kitchen

**Specs:** `ai-bulk-task-generation.md`, `ai-event-summaries.md`, `ai-suggested-next-actions.md`

**Status:** 0% Complete - No GPT integration found

**Database:** No AI-specific models exist

**API Endpoints:** Missing

**UI Components:** Missing

**Still Needed:**
- GPT-4o-mini integration in `@repo/ai`
- Bulk task generation API
- Event summaries generation
- Suggested next actions system

**Complexity:** High | **Dependencies:** Complete `@repo/ai` implementation

---

### PHASE 2: EVENTS MODULE

**Status: 80% Complete**

#### 2.1 Event CRUD

**Status:** 100% Complete (complete - removed from detailed breakdown)

---

#### 2.2 Battle Board Generation

**Specs:** `battle-board-pdf-export.md`, `strategic-command-board-foundation.md`

**Status:** 75% Complete

**Database:** Complete (BattleBoard, event_dishes)

**API Endpoints:** Partial (generation exists, missing PDF export)

**UI Components:** Partial (viewer exists, missing PDF export, dependency lines, critical path)
**Location:** `apps/app/app/(authenticated)/events/[eventId]/battle-board/page.tsx`

**Still Needed:**
- PDF export functionality (requires PDF library)
- Dependency lines between tasks
- Critical path visualization

**Complexity:** High | **Dependencies:** PDF library selection

---

#### 2.3 Event Timeline Builder

**Specs:** `event-timeline-builder.md`

**Status:** Integrated into Battle Board

**Note:** Timeline functionality is integrated into the Battle Board feature.

---

#### 2.4 Event Budget Tracking

**Status:** 100% Complete

**Database:** Complete (EventBudget, BudgetLineItem models exist)

**API Endpoints:** Complete (full CRUD operations for budgets)
**Location:** `apps/api/app/api/events/budgets/`

**UI Components:** Complete
**Location:** `apps/app/app/(authenticated)/events/budgets/`
- `budgets-page-client.tsx` - Complete budget list page with filtering, search, pagination, and summary stats
- `[budgetId]/budget-detail-client.tsx` - Complete budget detail page with full CRUD for line items
- `components/create-budget-modal.tsx` - Create budget modal
- `components/budget-card.tsx` - Budget display card

**Complexity:** Complete

---

#### 2.5 Event Contract Management

**Status:** 100% Complete (complete - removed from detailed breakdown)

---

#### 2.6 Event Proposal Generation

**Specs:** `event-proposal-generation.md`

**Status:** 100% Complete (implemented in CRM module)

**Note:** Implemented in CRM module, not Events module as originally planned.

---

#### 2.7 Strategic Command Board

**Specs:** `strategic-command-board-foundation.md`, `command-board-entity-cards.md`, `command-board-persistence.md`, `command-board-realtime-sync.md`, `command-board-relationship-lines.md`

**Status:** 35% Complete

**Database:** Models exist (CommandBoard, CommandBoardCard in schema)

**API Endpoints:** Partial
**Location:** `apps/app/app/(authenticated)/command-board/actions/`
- `boards.ts` - Board CRUD actions
- `cards.ts` - Entity card actions
- `entity-cards.ts` - Entity type actions

**UI Components:** Partial foundation exists
**Location:** `apps/app/app/(authenticated)/command-board/`
- `page.tsx` - Landing page
- `command-board-wrapper.tsx` - Main wrapper
- `components/board-canvas-realtime.tsx` - Canvas with real-time hooks
- `components/connection-lines.tsx` - Relationship lines
- `components/draggable-card.tsx` - Draggable card component
- `components/cards/` - Card components (task, inventory, event, employee, client)

**Still Needed:**
- Full real-time sync via Ably (blocked by empty `packages/realtime`)
- Persistence layer completion
- Bulk editing and grouping features
- Complete entity card implementations

**Complexity:** High | **Dependencies:** `packages/realtime` implementation

---

#### 2.8 Event Import/Export

**Specs:** `event-import-export.md`

**Status:** 10% Complete

**Database:** Partial models exist (EventImport in schema)

**API Endpoints:** Missing

**UI Components:** Placeholder page exists
**Location:** `apps/app/app/(authenticated)/events/import/page.tsx`

**Still Needed:**
- CSV import functionality
- PDF export capabilities
- Data transformation logic
- Import history tracking

**Complexity:** High | **Dependencies:** PDF library, CSV parsing

---

### PHASE 3: STAFF/SCHEDULING MODULE

**Status: 65% Complete**

#### 3.1 Shift Management Enhancement

**Specs:** `scheduling-shift-crud.md`

**Status:** 100% Complete

**Database:** Complete (Schedule, ScheduleShift, User, Location)

**API Endpoints:** Complete (full CRUD operations)

**UI Components:** Complete (calendar view, creation forms, editing interface)
**Location:** `apps/app/app/(authenticated)/scheduling/scheduling-realtime.tsx`

**Note:** Architecture compliant - all routes in `apps/api`.

---

#### 3.2 Availability & Time-Off Tracking

**Specs:** `scheduling-availability-tracking.md`

**Status:** 100% Complete

**Database:** Complete (EmployeeAvailability, TimeOffRequest models exist)

**API Endpoints:** Complete (full CRUD operations for both features)

**UI Components:** Complete (management interfaces for both features)
**Location:** `apps/app/app/(authenticated)/scheduling/requests/page.tsx`

---

#### 3.3 Auto-Assignment

**Specs:** `scheduling-auto-assignment.md`

**Status:** 0% Complete

**Database:** MISSING - EmployeeSkill, EmployeeSeniority models do not exist in schema

**API Endpoints:** Missing

**UI Components:** Missing

**Still Needed:**
- Employee skill and seniority models (schema migration needed)
- Auto-assignment algorithm
- Budget-aware assignment logic
- Assignment suggestion interface

**Complexity:** High | **Dependencies:** Schema migration

---

#### 3.4 Labor Budget Tracking

**Specs:** `scheduling-labor-budget-tracking.md`

**Status:** 30% Complete

**Database:** MISSING - LaborBudget model does not exist in schema

**API Endpoints:** Basic calculation may exist but no management APIs

**UI Components:** Missing (no management interface)

**Still Needed:**
- LaborBudget model in schema
- Budget creation and management UI
- Real-time utilization dashboard
- Alert notifications for budget thresholds

**Complexity:** Medium | **Dependencies:** Schema migration

---

#### 3.5 Timecard System

**Specs:** `payroll-timecard-system.md`, `mobile-time-clock.md`

**Status:** 100% Complete

**Database:** Complete (TimeEntry, Timecard, TimecardLocation, TimecardPhoto)

**API Endpoints:** Complete (clock in/out, breaks, viewing, history)

**UI Components:** Complete (clock interface, timecard dashboard, mobile-optimized)
**Location:** `apps/app/app/(authenticated)/payroll/`

---

#### 3.6 Payroll Calculation Engine

**Specs:** `payroll-calculation-engine.md`

**Status:** 20% Complete - Basic time tracking only

**Database:** User has hourlyRate and salaryAnnual fields, but missing:
- PayRate model (for multiple pay rates per employee)
- PayrollCalculation model
- Deduction model

**API Endpoints:** Missing

**UI Components:** Missing

**Package Exists:** `packages/payroll-engine/` but needs investigation

**Still Needed:**
- Pay rate management
- Full calculation engine
- Deduction configuration
- Calculation dashboard

**Complexity:** High | **Dependencies:** Schema migration

---

#### 3.7 Payroll Approval Workflow

**Specs:** `payroll-approval-workflow.md`

**Status:** 20% Complete

**Database:** MISSING - TimecardApproval, ApprovalHistory models do not exist

**API Endpoints:** Missing

**UI Components:** Basic approval UI may exist, but full workflow is missing

**Still Needed:**
- Approval workflow models
- Approval queue interface
- Bulk approval tools
- Approval history tracking

**Complexity:** Medium | **Dependencies:** Schema migration

---

### PHASE 4: CRM MODULE

**Status: 100% Complete**

#### 4.1 Client Management

**Specs:** `crm-client-detail-view.md`

**Status:** 100% Complete

**Database:** Complete (Client, ClientContact, ClientPreference with tenant scoping)

**API Endpoints:** Complete (full CRUD operations)

**UI Components:** Complete (list, detail, creation/edit forms)

---

#### 4.2 Client Segmentation

**Specs:** `crm-client-segmentation.md`

**Status:** 100% Complete

**Database:** Complete (ClientTag, ClientTagAssignment models exist)

**API Endpoints:** Complete (tag management, filtering, assignment)

**UI Components:** Complete (tag management interface, filtering, segment overview)

---

#### 4.3 Client Communication Log

**Specs:** `crm-client-communication-log.md`

**Status:** 100% Complete

**Database:** Complete (ClientInteraction model in tenant_crm)

**API Endpoints:** Complete (full CRUD operations)

**UI Components:** Complete (timeline display, add/edit/delete modals)
**Location:** `apps/app/app/(authenticated)/crm/communications/page.tsx`

---

#### 4.4 Venue Management

**Specs:** `crm-venue-management.md`

**Status:** 100% Complete

**Database:** Complete (Venue model with tenant scoping)

**API Endpoints:** Complete (full CRUD operations with event history)

**UI Components:** Complete (list, detail, creation/edit forms)

---

#### 4.5 Client Lifetime Value Analytics

**Specs:** `analytics-client-lifetime-value.md`

**Status:** 100% Complete

**Database:** Complete (computed/aggregated LTV data via views)

**API Endpoints:** Complete (LTV calculations, segments, trends)

**UI Components:** Complete (LTV dashboard, client ranking, retention view)

---

#### 4.6 Proposal Generation

**Specs:** `event-proposal-generation.md`

**Status:** 95% Complete

**Database:** Complete (Proposal model)

**API Endpoints:** Complete

**UI Components:** Complete

**Missing:** PDF export is a TODO in code

**Complexity:** Low | **Dependencies:** PDF library

---

### PHASE 5: INVENTORY MODULE

**Status: 58% Complete** (+8% from Inventory Item Management completion)

#### 5.1 Inventory Item Management ✅ COMPLETE

**Specs:** `inventory-item-management.md`

**Status:** 100% Complete (updated from 40%)

**Database:** Complete (InventoryItem, InventorySupplier models exist)

**API Endpoints:** Complete - Full CRUD implemented
**Location:** `apps/api/app/api/inventory/items/route.ts`
- GET /api/inventory/items - List with pagination, search, and filters (category, stock_status, fsa_status, tags)
- POST /api/inventory/items - Create new item with validation
- GET /api/inventory/items/[id] - Get single item with computed stock_status and total_value
- PUT /api/inventory/items/[id] - Update item with duplicate item_number checking
- DELETE /api/inventory/items/[id] - Soft delete

**UI Components:** Complete
**Location:** `apps/app/app/(authenticated)/inventory/items/page.tsx`
**Files Created:**
- `inventory-items-page-client.tsx` - Main page with table view, search, filters, pagination
- `components/create-inventory-item-modal.tsx` - Create/Edit modal with full form
- `lib/use-inventory.ts` - Client API functions and helpers

**Features Implemented:**
- Full CRUD operations for inventory items
- Search by item number or name
- Filter by category, stock status, FSA status
- Pagination (20 items per page)
- Summary stats (total items, total value, low stock count, out of stock count)
- Stock status badges (In Stock, Low Stock, Out of Stock) based on quantity vs reorder level
- FSA compliance status tracking with badges
- Tag management
- Food safety flags (temperature logged, allergen info, traceable source)
- Delete confirmation dialog

**Complexity:** Medium | **Dependencies:** None

---

#### 5.2 Stock Levels Management

**Specs:** `inventory-stock-levels.md`

**Status:** 30% Complete

**Database:** Models exist (InventoryStock, InventoryTransaction) but minimal implementation

**API Endpoints:** Partial

**UI Components:** Placeholder page exists
**Location:** `apps/app/app/(authenticated)/inventory/levels/page.tsx`

**Still Needed:**
- Stock levels dashboard
- Real-time status indicators
- Transaction history
- Adjustment operations

**Complexity:** Medium | **Dependencies:** None

---

#### 5.3 Recipe Costing

**Specs:** `inventory-recipe-costing.md`

**Status:** 40% Complete

**Database:** RecipeIngredient links exist

**API Endpoints:** Partial - costing exists but not integrated
**Location:** `apps/app/app/lib/recipe-costing.ts`

**UI Components:** Placeholder page exists
**Location:** `apps/app/app/(authenticated)/inventory/recipes/page.tsx`

**Still Needed:**
- Recipe cost breakdown calculations
- Cost per serving calculations
- Cost history tracking

**Complexity:** Medium | **Dependencies:** Recipe ingredient data

---

#### 5.4 Depletion Forecasting

**Specs:** `inventory-depletion-forecasting.md`

**Status:** 30% Complete

**Database:** Models exist (InventoryForecast, ForecastInput, ReorderSuggestion, AlertsConfig)

**API Endpoints:** Basic structure exists

**UI Components:** Missing

**Still Needed:**
- Forecast calculation logic
- Forecast dashboard
- Reorder alerts
- Event impact visualization

**Complexity:** High | **Dependencies:** Historical consumption data

---

#### 5.5 Warehouse Receiving

**Specs:** `warehouse-receiving-workflow.md`

**Status:** 80% Complete

**Database:** Complete (PurchaseOrder, PurchaseOrderItem models exist)

**API Endpoints:** Complete (full workflow operations)

**UI Components:** Exists but may need connection verification
**Location:** `apps/app/app/(authenticated)/warehouse/inventory/page.tsx`

**Complexity:** Low | **Dependencies:** None

---

#### 5.6 Warehouse Shipment Tracking

**Specs:** `warehouse-shipment-tracking.md`

**Status:** 0% Complete

**Database:** MISSING - Shipment, ShipmentItem models do not exist

**API Endpoints:** Missing

**UI Components:** Placeholder page only
**Location:** `apps/app/app/(authenticated)/warehouse/shipments/page.tsx`

**Still Needed:**
- Shipment creation and tracking
- Status management
- Delivery confirmation
- Packing list generation

**Complexity:** High | **Dependencies:** Schema migration, PDF library

---

#### 5.7 Cycle Counting

**Specs:** `warehouse-cycle-counting.md`

**Status:** 40% Complete

**Database:** Models exist (CycleCountSession, CycleCountRecord, VarianceReport, CycleCountAuditLog)

**API Endpoints:** Partial

**UI Components:** Placeholder page exists
**Location:** `apps/app/app/(authenticated)/warehouse/audits/page.tsx`

**Still Needed:**
- Cycle count scheduling
- Count execution interface
- Variance reports
- Adjustment workflow

**Complexity:** Medium | **Dependencies:** Stock level implementation

---

### PHASE 6: ANALYTICS MODULE

**Status: 80% Complete**

#### 6.1 Employee Performance Analytics

**Specs:** `analytics-employee-performance.md`

**Status:** 100% Complete

**Database:** Uses existing models (User, KitchenTask, TimeEntry)

**API Endpoints:** Complete (performance metrics, comparisons)

**UI Components:** Complete (dashboard, detail view, comparison charts)

---

#### 6.2 Profitability Dashboard

**Specs:** `analytics-profitability-dashboard.md`

**Status:** 100% Complete

**Database:** Uses existing models (Event, CateringOrder, Recipe, TimeEntry)

**API Endpoints:** Complete (profitability calculations by event/type/client)
**Location:** `apps/app/app/(authenticated)/analytics/events/actions/get-event-profitability.ts`

**UI Components:** Complete (dashboard, event breakdown, filters)

---

#### 6.3 Finance Analytics

**Specs:** `analytics-finance.md`

**Status:** 10% Complete

**Database:** Missing financial models

**API Endpoints:** Missing

**UI Components:** Placeholder page exists
**Location:** `apps/app/app/(authenticated)/analytics/finance/page.tsx`

**Still Needed:**
- Financial data models
- Revenue/expense tracking
- Financial dashboard
- Reports and forecasting

**Complexity:** High | **Dependencies:** Schema migration

---

#### 6.4 Kitchen Analytics

**Specs:** `analytics-kitchen.md`

**Status:** 10% Complete

**Database:** Missing kitchen-specific analytics models

**API Endpoints:** Missing

**UI Components:** Placeholder page exists
**Location:** `apps/app/app/(authenticated)/analytics/kitchen/page.tsx`

**Still Needed:**
- Kitchen performance metrics
- Waste analytics
- Efficiency reports
- Cost analysis

**Complexity:** Medium | **Dependencies:** Waste tracking completion

---

### PHASE 7: INTEGRATIONS

**Status: 0% Complete**

#### 7.1 GoodShuffle Integration

**Specs:** `goodshuffle-event-sync.md`, `goodshuffle-inventory-sync.md`, `goodshuffle-invoicing-sync.md`

**Status:** 0% Complete

**Database:** Missing integration models

**API Endpoints:** Missing

**UI Components:** Settings page placeholder exists
**Location:** `apps/app/app/(authenticated)/settings/integrations/page.tsx`

**Still Needed:**
- GoodShuffle connection models
- Sync operations (events, inventory, invoicing)
- Mapping configuration
- Error handling

**Complexity:** High | **Dependencies:** GoodShuffle API access

---

#### 7.2 Nowsta Integration

**Specs:** `nowsta-integration.md`

**Status:** 0% Complete

**Database:** Missing Nowsta employee/shift models

**API Endpoints:** Missing

**UI Components:** Settings page placeholder exists

**Still Needed:**
- Nowsta employee mapping
- Shift import/export
- Synchronization logic
- Error handling

**Complexity:** High | **Dependencies:** Nowsta API access

---

#### 7.3 QuickBooks Export

**Specs:** `quickbooks-invoice-export.md`, `quickbooks-bill-export.md`, `quickbooks-payroll-export.md`

**Status:** 0% Complete

**Database:** Missing QuickBooks models

**API Endpoints:** Missing

**UI Components:** Settings page placeholder exists

**Still Needed:**
- Invoice export
- Bill export
- Payroll export
- Connection management

**Complexity:** High | **Dependencies:** QuickBooks API access

---

#### 7.4 Outbound Webhook System

**Specs:** `webhook-outbound-integrations.md`

**Status:** 0% Complete

**Database:** Missing webhook models

**API Endpoints:** Missing

**UI Components:** Webhooks page placeholder exists
**Location:** `apps/app/app/(authenticated)/webhooks/page.tsx`

**Package Exists:** `packages/webhooks/` (Svix integration)

**Still Needed:**
- Webhook configuration
- Payload handling
- Delivery logging
- Retry mechanisms

**Complexity:** Medium | **Dependencies:** Svix package utilization

---

### PHASE 8: PLATFORM FEATURES

**Status: 10% Complete**

#### 8.1 Automated Email Workflows

**Specs:** `automated-email-workflows.md`

**Status:** 0% Complete

**Database:** Missing EmailWorkflow, EmailTrigger models

**API Endpoints:** Missing

**UI Components:** Missing

**Package Exists:** `packages/email/` (Resend integration)

**Still Needed:**
- Workflow engine
- Trigger system
- Template integration
- Queue management

**Complexity:** High | **Dependencies:** Email templates

---

#### 8.2 Bulk Edit Operations

**Specs:** `bulk-edit-operations.md`

**Status:** 0% Complete

**Database:** Missing bulk operation models

**API Endpoints:** Missing

**UI Components:** Missing

**Still Needed:**
- Multi-select interface
- Bulk edit modal
- Preview component
- Undo functionality

**Complexity:** Medium | **Dependencies:** None

---

#### 8.3 Bulk Grouping Operations

**Specs:** `bulk-grouping-operations.md`

**Status:** 0% Complete

**Database:** Missing EntityGroup models

**API Endpoints:** Missing

**UI Components:** Missing

**Still Needed:**
- Group creation interface
- Visual clustering
- Drag-and-drop handling
- Nested groups

**Complexity:** Medium | **Dependencies:** Command board foundation

---

#### 8.4 Email Template System

**Specs:** `email-template-system.md`

**Status:** 0% Complete

**Database:** Missing EmailTemplate models

**API Endpoints:** Missing

**UI Components:** Missing

**Package Exists:** `apps/email/` (React Email templates)

**Still Needed:**
- Template editor
- Merge fields
- Preview system
- Version control

**Complexity:** Medium | **Dependencies:** None

---

#### 8.5 SMS Notification System

**Specs:** `sms-notification-system.md`

**Status:** 0% Complete

**Database:** Missing SMS models

**API Endpoints:** Missing

**UI Components:** Missing

**Still Needed:**
- SMS provider integration
- Template system
- Delivery tracking
- Preferences management

**Complexity:** Medium | **Dependencies:** SMS provider selection

---

## CROSS-CUTTING CONCERNS

### 1. Real-time Infrastructure (CRITICAL - Blocker)

**Package:** `packages/realtime/`

**Status:** EMPTY - Critical blocker for all real-time features

**Verified:** Package directory contains ZERO files

**Impact:**
- Kitchen task claims/progress
- Event board updates
- Scheduling changes
- Command board collaboration

**Required:**
- Ably integration for pub/sub
- Outbox pattern implementation (OutboxEvent model exists in schema at line 2476)
- CRITICAL BUG FIX: Verify OutboxEvent is in generated database client before using
- Token generation for authenticated channels
- Reconnection handling

**Spec:** `command-board-realtime-sync.md`

**Complexity:** HIGH

---

### 2. AI Integration

**Package:** `@repo/ai`

**Status:** GPT-4o-mini integration complete ✅

**Implemented:**
- GPT-4o-mini model integration via Vercel AI SDK
- Agent execution handler makes real LLM API calls
- Proper error handling and progress events

**Still Needed:**
- AI feature implementations (bulk task generation, event summaries, conflict detection, suggested next actions)

**Complexity:** MEDIUM (infrastructure complete, feature work remains)

---

### 3. PDF Generation

**Status:** Not available - No PDF library in project

**Verified:** Searched all package.json files - no @pdf, pdfkit, jspdf, or react-pdf dependencies found

**Impact:**
- Battle Board PDF export
- Proposal PDF generation
- Contract PDF export
- Shipment packing lists

**Required:**
- PDF library selection (jsPDF, PDFKit, or server-side solution)
- PDF templates
- Export endpoints

**Complexity:** MEDIUM

---

### 4. Mobile Optimization

**Status:** Partial

**Completed:**
- Mobile task claiming
- Mobile time clock

**Missing:**
- Mobile recipe viewer
- Mobile-optimized dashboards
- Offline support expansion

**Complexity:** MEDIUM

---

### 5. Email Workflows

**Status:** Basic Resend integration only

**Package:** `packages/email/`

**Missing:**
- Automated workflow engine
- Trigger system
- Template management UI

**Complexity:** HIGH

---

## PRIORITIZED ACTION LIST

### P0: Critical Blockers (Must resolve for production)

1. **Implement `packages/realtime` with Ably**
   - Empty package is blocking all real-time features
   - Outbox pattern exists in schema but no implementation
   - Estimated: 2-3 weeks

2. ~~**Add GPT-4o-mini integration to `@repo/ai`**~~ ✅ COMPLETE
   - All AI features are non-functional
   - Framework exists, just needs LLM connection
   - Estimated: 1-2 weeks
   - **COMPLETED:** GPT-4o-mini integration is now fully functional

3. **Add PDF generation library**
   - Required for battle board, proposals, contracts
   - Library selection and implementation
   - Estimated: 1 week

---

### P1: High Priority (Core functionality gaps)

4. ~~**Allergen Tracking Implementation**~~ ✅ COMPLETE
   - Models exist, logic and UI fully implemented
   - Real API integration with automated conflict detection
   - **COMPLETED:** 100% complete with automated warning generation

5. **Strategic Command Board Completion**
   - Foundation exists, needs real-time and persistence
   - Blocked by `packages/realtime`
   - Estimated: 2 weeks

6. **Auto-Assignment System**
   - Needs schema migration (EmployeeSkill, EmployeeSeniority)
   - Algorithm and UI
   - Estimated: 2-3 weeks

---

### P2: Medium Priority (Important for production readiness)

8. **Battle Board Enhancements**
   - PDF export (blocked by PDF library)
   - Dependency lines
   - Critical path visualization
   - Estimated: 1-2 weeks

9. **Event Import/Export**
   - CSV import
   - PDF export
   - Estimated: 1-2 weeks

10. **Payroll Calculation Engine**
   - Needs schema migration
   - Calculation logic and UI
   - Estimated: 2-3 weeks

11. **Labor Budget Management UI**
   - Needs schema migration
   - Budget creation and alerts
   - Estimated: 1-2 weeks

12. **Warehouse Shipment Tracking**
   - Needs schema migration
   - Full tracking workflow
   - Estimated: 2 weeks

13. **Stock Level Management**
   - Models exist, needs full implementation
   - Dashboard and real-time status
   - Estimated: 1-2 weeks

---

### P3: Lower Priority (Enhancements)

14. **Mobile Recipe Viewer**
   - Mobile-optimized recipe display
   - Estimated: 3-5 days

15. **Waste Tracking Completion**
   - Integration with inventory
   - Calculation logic
   - Estimated: 1 week

16. **Cycle Counting Implementation**
   - Models exist, needs UI and workflow
   - Estimated: 1 week

17. **Finance Analytics**
   - Needs schema migration
   - Dashboard and reports
   - Estimated: 2-3 weeks

18. **Kitchen Analytics**
   - Performance metrics
   - Waste analytics
   - Estimated: 1-2 weeks

19. **Depletion Forecasting**
   - Forecast calculation
   - Dashboard and alerts
   - Estimated: 2 weeks

---

### P4: Future Features (Integrations and Platform)

20. **GoodShuffle Integration**
   - Event, inventory, invoicing sync
   - Estimated: 3-4 weeks

21. **Nowsta Integration**
   - Employee and shift sync
   - Estimated: 2-3 weeks

22. **QuickBooks Export**
   - Invoice, bill, payroll export
   - Estimated: 3-4 weeks

23. **Outbound Webhook System**
   - Utilize existing Svix package
   - Estimated: 1-2 weeks

24. **Automated Email Workflows**
   - Workflow engine
   - Estimated: 2-3 weeks

25. **Email Template System**
   - Template editor UI
   - Estimated: 1-2 weeks

26. **SMS Notification System**
   - Provider integration
   - Estimated: 2 weeks

27. **Bulk Edit Operations**
   - Multi-select and bulk actions
   - Estimated: 1-2 weeks

28. **Bulk Grouping Operations**
   - Visual grouping
   - Estimated: 1-2 weeks

---

## SCHEMA MIGRATIONS NEEDED

### Priority 1 (P1 Features)

1. **Employee Skills & Seniority**
   ```prisma
   model EmployeeSkill {
     tenantId     String   @map("tenant_id")
     employeeId   String   @map("employee_id")
     skillId      String   @map("skill_id")
     proficiency  Int      // 1-5 scale
     certifiedAt  DateTime?
     certifiedBy  String?
     // ... indexes
   }

   model EmployeeSeniority {
     tenantId    String   @map("tenant_id")
     employeeId  String   @map("employee_id")
     level       String
     rank        Int
     effectiveAt DateTime
   }
   ```

2. **Labor Budget**
   ```prisma
   model LaborBudget {
     tenantId        String   @map("tenant_id")
     id              String   @default(uuid())
     name            String
     periodStart     Date     @map("period_start")
     periodEnd       Date     @map("period_end")
     targetBudget    Decimal  @map("target_budget")
     actualSpend     Decimal? @map("actual_spend")
     // ... indexes
   }
   ```

### Priority 2 (P2 Features)

3. **Payroll Models**
   ```prisma
   model PayRate {
     tenantId    String   @map("tenant_id")
     employeeId  String   @map("employee_id")
     rateType    String   // hourly, salary, piece_rate
     amount      Decimal
     effectiveAt DateTime
   }

   model PayrollRun {
     tenantId      String   @map("tenant_id")
     id            String   @default(uuid())
     periodStart   Date
     periodEnd     Date
     status        String
     totalPayroll  Decimal
     processedAt   DateTime?
   }

   model TimecardApproval {
     timecardId  String
     approverId  String
     status      String
     approvedAt  DateTime?
   }
   ```

4. **Warehouse Shipment**
   ```prisma
   model Shipment {
     tenantId      String   @map("tenant_id")
     id            String   @default(uuid())
     eventId       String?  @map("event_id")
     status        String
     shippedAt     DateTime?
     deliveredAt   DateTime?
   }

   model ShipmentItem {
     shipmentId    String   @map("shipment_id")
     inventoryId   String   @map("inventory_id")
     quantity      Decimal
     // ...
   }
   ```

### Priority 3 (P3 Features)

5. **Financial Analytics Models**
6. **Email Workflow Models**
7. **Webhook Models**
8. **Integration Models** (GoodShuffle, Nowsta, QuickBooks)

---

## TECHNICAL DEBT TRACKER

### Architecture Issues

1. **`packages/realtime` is empty**
   - Severity: CRITICAL
   - Impact: All real-time features blocked
   - Action: Implement Ably integration
   - Verified: Package directory contains ZERO files

2. **CRITICAL BUG: OutboxEvent database client mismatch**
   - Severity: CRITICAL - RUNTIME FAILURE RISK
   - Impact: Outbox publish endpoint will fail when called
   - Location: `apps/api/app/outbox/publish/route.ts` references `database.outboxEvent`
   - Details: OutboxEvent model exists in Prisma schema (line 2476) but may not be in generated client
   - Action Required: Run `pnpm migrate` to regenerate Prisma client and verify OutboxEvent is available

3. ~~**`@repo/ai` has no LLM provider**~~ ✅ RESOLVED
   - Severity: ~~CRITICAL~~
   - Impact: ~~All AI features non-functional~~
   - Action: ~~Add GPT-4o-mini integration~~
   - **COMPLETED:** GPT-4o-mini integration is now fully functional

4. **No PDF generation capability**
   - Severity: HIGH
   - Impact: Cannot export battle boards, proposals, contracts
   - Action: Add PDF library
   - Verified: No PDF libraries found in any package.json files

### Schema Gaps

4. **Missing EmployeeSkill model**
   - Severity: HIGH
   - Impact: Auto-assignment cannot work
   - Action: Create migration

5. **Missing LaborBudget model**
   - Severity: HIGH
   - Impact: No labor budget tracking
   - Action: Create migration

6. **Missing Shipment models**
   - Severity: MEDIUM
   - Impact: Warehouse shipments at 0%
   - Action: Create migration

7. **Missing Payroll calculation models**
   - Severity: MEDIUM
   - Impact: Payroll is basic only
   - Action: Create migration

### UI Gaps (where API is complete)

8. **Inventory Item UI incomplete**
   - Severity: MEDIUM
   - Impact: Core inventory features blocked
   - Action: Complete item management UI

10. **Stock Level UI incomplete**
    - Severity: MEDIUM
    - Impact: Cannot manage stock levels
    - Action: Complete stock level UI

---

## ARCHITECTURE NOTES

### Real-time Architecture

**Decision Made:** Ably is required for realtime transport per spec (outbox Ably). Liveblocks may remain for UI-only collaboration primitives.

**`packages/collaboration`** (LiveBlocks):
- Presence/avatars/cursors
- Selection state
- "I'm editing this card" indicators
- Draft/in-progress UI state

**`packages/realtime`** (Ably) - TO BE IMPLEMENTED:
- Task claiming
- Task completion
- Assignment truth
- System event distribution

**Outbox Pattern:**
- OutboxEvent model exists in schema
- Publisher needed to write to OutboxEvent
- Worker needed to publish to Ably
- Subscriber needed to consume from Ably

### API Architecture Compliance

**Rule:** `/api/**` must be implemented ONLY in `apps/api`

**Status:** Mostly compliant
- Event budgets: Compliant (all in `apps/api`)
- Most other routes: Compliant
- Verify: Check `apps/app/app/api/` for any violations

“If a Route Handler exists under apps/app/app/api/**/route.ts, move it to apps/api/app/api/**/route.ts, update any client calls to hit /api/... as before, and delete the original.”

### Multi-tenancy Pattern

**Rule:** All tenant-scoped tables include `tenantId` column

**Status:** Correctly implemented
- All tenant_* schemas use tenantId
- Indexes on tenantId for isolation

### Soft Delete Pattern

**Rule:** Tables include `deletedAt` timestamp

**Status:** Consistently implemented
- Use `WHERE deletedAt IS NULL` in queries

---

## DEVELOPMENT GUIDELINES

### Before Starting Any Feature

1. Run `pnpm docs:list` to check for relevant documentation
2. Check `packages/realtime` implementation status
3. Verify schema has required models
4. Confirm architecture compliance (API in apps/api)

### Testing Strategy

- Browser-based testing prioritized over unit tests for UI
- Use Playwright for integration testing
- Test real-time features with Ably mock server

### Documentation Updates

- Update Mintlify at http://localhost:2232/ when features complete
- Update this IMPLEMENTATION_PLAN.md as progress is made
- Document any architecture decisions

---

## NEXT STEPS (Recommended Starting Point)

### Week 1-2: Critical Infrastructure

1. **Implement `packages/realtime`**
   - Ably client setup
   - Token generation endpoint
   - Outbox publisher
   - Channel subscription utilities

2. **Add PDF generation library**
   - Choose library (jsPDF vs PDFKit)
   - Create utility package
   - Implement basic PDF export

### Week 3: Quick Wins

3. **Mobile Recipe Viewer**
   - Mobile-optimized display
   - Quick win for kitchen operations

### Week 4-5: Core Features

4. **Allergen Tracking Implementation**
   - Real conflict detection
   - Integration with recipes

5. **Inventory Item Management UI**
   - Complete CRUD operations
   - Search and filtering

### Week 6+: Larger Features

6. **Auto-Assignment**
   - Schema migration for skills
   - Algorithm implementation

7. **Strategic Command Board**
   - Complete real-time sync
   - Persistence layer

8. **Payroll Calculation**
   - Schema migration
   - Calculation engine

---

## SUMMARY

**Overall Progress:** ~62% Complete (+4% from GPT-4o-mini integration, Inventory Item Management, and Allergen Tracking completion)

**Key Achievements:**
- CRM module is 100% complete
- Kitchen module has strong foundation (78%) - Allergen Tracking complete ✅
- Events module has solid base (80%) - Event Budget UI complete
- Staff/Scheduling has core features (65%)
- **Inventory Item Management is now 100% complete** ✅
- **GPT-4o-mini integration is now complete** ✅
- **Allergen Tracking is now 100% complete** ✅

**Critical Blockers:**
1. `packages/realtime` is empty - blocks all real-time features
2. No PDF library - blocks exports

**Quick Wins (API complete, needs UI):**
- Mobile Recipe Viewer
- Stock Level Management
- AI features (infrastructure ready, needs feature implementation)

**Largest Remaining Efforts:**
- Real-time infrastructure
- AI feature implementations (bulk task generation, event summaries, suggested next actions)
- Payroll system completion
- Integration implementations (GoodShuffle, Nowsta, QuickBooks)
