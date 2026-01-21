# Convoy Implementation Plan

**Last Updated:** 2026-01-20
**Status:** Planning Phase - Architecture Review Needed

**Priority Order:** Kitchen Tasks (P1) → Events (P2) → Staff/Scheduling (P3) → CRM → Inventory → Analytics → Integrations → Platform

---

## CRITICAL ARCHITECTURE ISSUES (Must Resolve First)

### [BLOCKER] Collaboration Package - Wrong Realtime Provider
- **Issue:** `packages/collaboration/` uses LiveBlocks but specs require Ably via outbox pattern
- **Impact:** Realtime features (kitchen task claims, events board, scheduling) cannot follow specified priority order
- **Specs:** `command-board-realtime-sync.md`
- **Files:**
  - `packages/collaboration/` - Entire package needs Ably migration
  - `apps/app/app/api/collaboration/auth/route.ts` - Needs Ably token endpoint
- **Action Required:** Decide - Keep LiveBlocks OR migrate to Ably per specs

---

## PHASE 1: KITCHEN MODULE FOUNDATION (Priority #1)

### Status: ~20% Complete
**Implemented:** Kitchen tasks API (`/api/kitchen/tasks/*`), production board UI with Kanban
**Missing:** Recipe management, prep lists, allergen tracking, mobile views, AI features

### 1.1 Kitchen Task Management Enhancements
**Specs:** `mobile-task-claim-interface.md`, `kitchen-prep-list-generation.md`

**Database:** ✅ Complete (KitchenTask, KitchenTaskClaim, KitchenTaskProgress, PrepTask)

**API Endpoints Needed:**
- `POST /api/kitchen/tasks/bulk-activate` - Accept/activate generated tasks
- `DELETE /api/kitchen/tasks/bulk-reject` - Reject generated tasks
- `GET /api/kitchen/tasks/suggestions` - Get AI-suggested next actions
- `GET /api/kitchen/tasks/available` - Get user's available tasks (mobile)
- `POST /api/kitchen/tasks/sync-claims` - Sync offline claims

**UI Components Needed:**
- Mobile task list view with optimized interactions
- Offline queue management for mobile claims
- Task review interface for AI-generated tasks
- Real-time task suggestions dashboard

**Files to Create:**
- `apps/app/app/(authenticated)/kitchen/mobile/page.tsx` - Mobile task claiming
- `apps/app/app/api/kitchen/tasks/suggestions/route.ts` - AI suggestions
- `apps/app/app/api/kitchen/tasks/bulk-activate/route.ts` - Bulk operations

---

### 1.2 Recipe Management System
**Specs:** `mobile-recipe-viewer.md`

**Database:** ✅ Complete (Recipe, RecipeVersion, RecipeIngredient, Ingredient, PrepMethod)

**API Endpoints Needed:**
- `POST /api/recipes` - Create recipe
- `GET /api/recipes/[id]` - Get recipe details
- `PATCH /api/recipes/[id]` - Update recipe
- `DELETE /api/recipes/[id]` - Delete recipe
- `POST /api/recipes/[id]/versions` - Create new version
- `GET /api/recipes/mobile/[id]` - Mobile-optimized recipe view
- `GET /api/recipes/favorites` - User's favorite recipes

**UI Components Needed:**
- Recipe creation/edit form with ingredient management
- Recipe viewer with step-by-step instructions
- Mobile recipe viewer with hands-free controls
- Integrated cooking timers
- Recipe search and filter

**Files to Create:**
- `apps/app/app/(authenticated)/kitchen/recipes/page.tsx` - Recipe list
- `apps/app/app/(authenticated)/kitchen/recipes/new/page.tsx` - Create recipe
- `apps/app/app/(authenticated)/kitchen/recipes/[id]/page.tsx` - Recipe detail
- `apps/app/app/(authenticated)/kitchen/recipes/mobile/page.tsx` - Mobile viewer
- `apps/app/app/api/recipes/route.ts` - Recipe CRUD
- `apps/app/app/api/recipes/[id]/route.ts` - Recipe detail operations
- `apps/app/components/recipe-card.tsx` - Recipe display component

---

### 1.3 Prep List Generation
**Specs:** `kitchen-prep-list-generation.md`

**Database:** ⚠️ Missing PrepList, PrepListItem models (need migration)

**API Endpoints Needed:**
- `POST /api/events/[id]/generate-prep-list` - Generate prep list from event menu
- `GET /api/prep-lists` - List prep lists with filters
- `GET /api/prep-lists/[id]` - Get prep list details
- `PATCH /api/prep-list-items/[id]` - Edit prep list quantities
- `GET /api/prep-lists/station/[station]` - Get prep list by station

**UI Components Needed:**
- Prep list viewer grouped by station and prep date
- Prep list editor for manual adjustments
- Daily prep dashboard

**Files to Create:**
- `apps/app/app/(authenticated)/kitchen/prep-lists/page.tsx` - Prep lists
- `apps/app/app/api/prep-lists/route.ts` - Prep list CRUD
- `packages/database/prisma/migrations/*_prep_lists.sql` - Add missing models

---

### 1.4 Allergen Tracking
**Specs:** `kitchen-allergen-tracking.md`

**Database:** ⚠️ Partial - Recipe has allergen tags, missing EventGuest, AllergenWarning models

**API Endpoints Needed:**
- `GET /api/recipes/[id]/allergens` - Get recipe allergen information
- `POST /api/events/guests/allergen-check` - Check allergen conflicts
- `GET /api/menu-items/dietary` - Filter menu by dietary restrictions
- `POST /api/events/allergen-warnings/acknowledge` - Acknowledge warnings

**UI Components Needed:**
- Allergen dashboard for recipe management
- Event planning warnings display
- Production alerts on prep lists
- Guest profile management for dietary restrictions

**Files to Create:**
- `apps/app/app/(authenticated)/kitchen/allergens/page.tsx` - Allergen management
- `apps/app/app/api/allergens/check/route.ts` - Allergen conflict checking
- `packages/database/prisma/migrations/*_allergen_tracking.sql` - Add missing models

---

### 1.5 Waste Tracking
**Specs:** `kitchen-waste-tracking.md`

**Database:** ❌ Missing WasteEntry, WasteReason, WasteReport models

**API Endpoints Needed:**
- `POST /api/kitchen/waste/entries` - Log waste entry
- `GET /api/kitchen/waste/reports` - Generate waste reports
- `GET /api/kitchen/waste/trends` - View waste trends over time
- `POST /api/kitchen/waste/reports` - Export waste analytics

**UI Components Needed:**
- Waste logging interface (quick entry form)
- Waste analytics dashboard with charts
- Mobile waste entry interface
- Reduction opportunity reports

**Files to Create:**
- `apps/app/app/(authenticated)/kitchen/waste/page.tsx` - Waste tracking
- `apps/app/app/api/kitchen/waste/route.ts` - Waste logging
- `packages/database/prisma/migrations/*_waste_tracking.sql` - Add waste models

---

### 1.6 AI Features for Kitchen
**Specs:** `ai-bulk-task-generation.md`, `ai-event-summaries.md`, `ai-suggested-next-actions.md`

**Database:** ✅ Complete for AI features (can use existing models + cache)

**API Endpoints Needed:**
- `POST /api/events/[id]/generate-tasks` - AI bulk task generation
- `GET /api/events/[id]/pending-tasks` - Review generated tasks
- `POST /api/events/[id]/generate-summary` - Generate event summary
- `GET /api/events/[id]/summary` - Retrieve cached summary

**UI Components Needed:**
- Task review interface with accept/edit/reject
- Event summary viewer in event details
- Suggestion dashboard with reasoning

**Files to Create:**
- `packages/ai/src/task-generation.ts` - AI task generation logic
- `packages/ai/src/event-summaries.ts` - AI summarization
- `apps/app/app/api/ai/tasks/generate/route.ts` - Task generation endpoint
- `apps/app/app/api/ai/summaries/route.ts` - Summary generation endpoint

**Note:** `packages/ai/` exists but needs business logic integration

---

## PHASE 2: EVENTS MODULE (Priority #2)

### Status: ~80% Complete
**Implemented:** Events dashboard, event creation, import functionality
**Missing:** Battle boards, timelines, budgets, contracts, proposals, command board

### 2.1 Battle Board Generation
**Specs:** `battle-board-pdf-export.md`, `strategic-command-board-foundation.md`

**Database:** ✅ Complete (BattleBoard, event_dishes)

**API Endpoints Needed:**
- `POST /api/events/[id]/battle-board/generate` - Generate battle board
- `GET /api/battle-board-exports/[id]` - Download generated PDF
- `GET /api/events/[id]/battle-board` - Get battle board data

**UI Components Needed:**
- Battle board viewer with menu, timeline, assignments
- PDF export with print-ready formatting
- Battle board editor

**Files to Create:**
- `apps/app/app/(authenticated)/tools/battleboards/page.tsx` - Replace placeholder
- `apps/app/app/api/battle-boards/route.ts` - Battle board generation
- `apps/app/components/battle-board-view.tsx` - Battle board display

---

### 2.2 Event Timeline Builder
**Specs:** `event-timeline-builder.md`

**Database:** ✅ Complete (EventTimeline)

**API Endpoints Needed:**
- `GET /api/events/[id]/timeline` - Get event timeline
- `POST /api/events/[id]/timeline` - Create timeline
- `POST /api/timelines/[id]/items` - Add timeline item
- `PATCH /api/timelines/[id]/items` - Update timeline item
- `POST /api/timelines/export` - Export timeline

**UI Components Needed:**
- Visual timeline builder (Gantt-style)
- Timeline item editor
- Timeline export functionality

**Files to Create:**
- `apps/app/app/(authenticated)/events/[id]/timeline/page.tsx` - Timeline builder
- `apps/app/app/api/timelines/route.ts` - Timeline CRUD
- `apps/app/components/timeline-builder.tsx` - Timeline UI component

---

### 2.3 Event Budget Tracking
**Specs:** `event-budget-tracking.md`

**Database:** ⚠️ Missing EventBudget, BudgetLineItem models

**API Endpoints Needed:**
- `GET /api/events/[id]/budget` - Get event budget
- `POST /api/events/[id]/budget` - Create budget
- `GET /api/events/[id]/budget/items` - Get budget line items
- `POST /api/events/[id]/budget/items` - Add line item
- `GET /api/events/[id]/budget/variance` - Calculate variance

**UI Components Needed:**
- Budget creation wizard
- Budget vs actuals dashboard
- Variance charts and indicators

**Files to Create:**
- `apps/app/app/(authenticated)/events/[id]/budget/page.tsx` - Budget tracking
- `apps/app/app/api/budgets/route.ts` - Budget CRUD
- `packages/database/prisma/migrations/*_event_budgets.sql` - Add budget models

---

### 2.4 Event Contract Management
**Specs:** `event-contract-management.md`

**Database:** ❌ Missing EventContract, ContractSignature models

**API Endpoints Needed:**
- `GET /api/events/[id]/contracts` - List contracts
- `POST /api/events/[id]/contracts` - Create contract
- `POST /api/contracts/[id]/signature` - Capture signature
- `GET /api/contracts/expiring` - Get expiring contracts alert

**UI Components Needed:**
- Contract upload interface
- Electronic signature component
- Contract status dashboard

**Files to Create:**
- `apps/app/app/(authenticated)/events/[id]/contracts/page.tsx` - Contracts
- `apps/app/app/api/contracts/route.ts` - Contract CRUD
- `apps/app/components/signature-capture.tsx` - Signature component
- `packages/database/prisma/migrations/*_contracts.sql` - Add contract models

---

### 2.5 Event Proposal Generation
**Specs:** `event-proposal-generation.md`

**Database:** ❌ Missing EventProposal, ProposalTemplate models

**API Endpoints Needed:**
- `GET /api/events/[id]/proposals` - List proposals
- `POST /api/events/[id]/proposals` - Create proposal
- `POST /api/proposals/[id]/generate` - Generate PDF
- `GET /api/proposals/templates` - List templates

**UI Components Needed:**
- Proposal builder interface
- Template selection
- PDF preview and export

**Files to Create:**
- `apps/app/app/(authenticated)/events/[id]/proposals/page.tsx` - Proposals
- `apps/app/app/api/proposals/route.ts` - Proposal CRUD
- `apps/app/components/proposal-builder.tsx` - Proposal UI
- `packages/database/prisma/migrations/*_proposals.sql` - Add proposal models

---

### 2.6 Strategic Command Board
**Specs:** `strategic-command-board-foundation.md`, `command-board-entity-cards.md`, `command-board-persistence.md`, `command-board-realtime-sync.md`, `command-board-relationship-lines.md`

**Database:** ❌ Missing CommandBoardLayout, CommandBoardPosition, CommandBoardPresence models

**API Endpoints Needed:**
- `GET /api/command-board/layout` - Get board layout
- `POST /api/command-board/layout` - Save board layout
- `GET /api/command-board/entities` - Get entities for board
- `POST /api/command-board/positions` - Save entity positions
- `GET /api/command-board/relationships` - Get relationship data

**UI Components Needed:**
- Full-screen canvas with grid and zoom
- Draggable entity cards (Client, Event, Task, Employee, Inventory)
- SVG relationship lines
- Real-time cursor indicators
- Layout save/load UI

**Files to Create:**
- `apps/app/app/(authenticated)/administrative/command-board/page.tsx` - Command board
- `apps/app/app/api/command-board/route.ts` - Board operations
- `apps/app/components/command-board/canvas.tsx` - Canvas component
- `apps/app/components/command-board/entity-card.tsx` - Entity cards
- `apps/app/components/command-board/relationship-lines.tsx` - Relationship visualization
- `packages/database/prisma/migrations/*_command_board.sql` - Add board models

**BLOCKER:** Depends on resolving collaboration package (Ably vs LiveBlocks)

---

## PHASE 3: STAFF/SCHEDULING MODULE (Priority #3)

### Status: ~10% Complete
**Implemented:** Scheduling dashboard with stats, basic shift management
**Missing:** Time tracking, availability, payroll, approval workflows, mobile time clock

### 3.1 Shift Management Enhancement
**Specs:** `scheduling-shift-crud.md`

**Database:** ✅ Complete (Schedule, ScheduleShift, User, Location)

**API Endpoints Needed:**
- `POST /api/staff/shifts` - Create shift
- `PUT /api/staff/shifts/[id]` - Update shift
- `DELETE /api/staff/shifts/[id]` - Delete shift
- `GET /api/staff/shifts` - List shifts with filters

**UI Components Needed:**
- Shift creation form with datetime pickers
- Shift calendar view (list/grid)
- Shift editing interface

**Files to Create:**
- `apps/app/app/api/staff/shifts/route.ts` - Shift CRUD
- `apps/app/app/(authenticated)/scheduling/shifts/new/page.tsx` - Shift creation

---

### 3.2 Availability Tracking
**Specs:** `scheduling-availability-tracking.md`

**Database:** ⚠️ Missing EmployeeAvailability, TimeOffRequest models

**API Endpoints Needed:**
- `POST /api/staff/availability` - Set availability
- `GET /api/staff/availability` - View availability
- `POST /api/staff/time-off` - Request time off
- `GET /api/staff/time-off` - View time off requests
- `PATCH /api/staff/time-off/[id]/status` - Approve/deny request

**UI Components Needed:**
- Availability calendar setup
- Time-off request form
- Manager availability view with conflict highlighting

**Files to Create:**
- `apps/app/app/(authenticated)/scheduling/availability/page.tsx` - Availability management
- `apps/app/app/api/staff/availability/route.ts` - Availability operations
- `apps/app/app/api/staff/time-off/route.ts` - Time-off operations
- `packages/database/prisma/migrations/*_availability.sql` - Add availability models

---

### 3.3 Auto-Assignment
**Specs:** `scheduling-auto-assignment.md`

**Database:** ⚠️ Missing EmployeeSkill, EmployeeSeniority, LaborBudget models

**API Endpoints Needed:**
- `POST /api/staff/auto-assign` - Suggest/auto-assign shifts
- `GET /api/staff/auto-assign/suggestions` - Get assignment suggestions
- `POST /api/staff/auto-assign/budget-check` - Validate budget before assignment

**UI Components Needed:**
- Assignment suggestion interface with reasoning
- Auto-assignment configuration settings
- Budget utilization dashboard

**Files to Create:**
- `apps/app/app/api/staff/auto-assign/route.ts` - Auto-assignment logic
- `apps/app/components/auto-assign-panel.tsx` - Auto-assign UI
- `packages/database/prisma/migrations/*_auto_assign.sql` - Add assignment models

---

### 3.4 Labor Budget Tracking
**Specs:** `scheduling-labor-budget-tracking.md`

**Database:** ⚠️ Partial LaborBudget exists, needs ScheduledHours model

**API Endpoints Needed:**
- `POST /api/staff/budgets` - Create labor budget
- `GET /api/staff/budgets/utilization` - Get budget utilization
- `PUT /api/staff/budgets/[id]` - Update budget
- `GET /api/staff/budgets/alerts` - Get budget alerts

**UI Components Needed:**
- Budget creation and management interface
- Real-time budget utilization dashboard
- Alert notifications for budget thresholds

**Files to Create:**
- `apps/app/app/(authenticated)/scheduling/budgets/page.tsx` - Budget management
- `apps/app/app/api/staff/budgets/route.ts` - Budget operations

---

### 3.5 Timecard System
**Specs:** `payroll-timecard-system.md`, `mobile-time-clock.md`

**Database:** ⚠️ Partial TimeEntry exists, needs Timecard, TimecardLocation, TimecardPhoto models

**API Endpoints Needed:**
- `POST /api/staff/timecards/clock-in` - Clock in
- `POST /api/staff/timecards/clock-out` - Clock out
- `POST /api/staff/timecards/break` - Start/end break
- `GET /api/staff/timecards` - View timecards
- `GET /api/staff/timecards/history` - Employee timecard history

**UI Components Needed:**
- Clock in/out interface
- Timecard management dashboard
- Location and photo verification screens
- Mobile-optimized clock interface

**Files to Create:**
- `apps/app/app/(authenticated)/payroll/timecards/page.tsx` - Timecards
- `apps/app/app/(authenticated)/payroll/mobile-clock/page.tsx` - Mobile time clock
- `apps/app/app/api/payroll/timecards/route.ts` - Timecard operations
- `apps/app/components/clock-interface.tsx` - Clock UI
- `packages/database/prisma/migrations/*_timecards.sql` - Add timecard models

---

### 3.6 Payroll Calculation Engine
**Specs:** `payroll-calculation-engine.md`

**Database:** ❌ Missing PayRate, PayrollCalculation, Deduction models

**API Endpoints Needed:**
- `POST /api/payroll/calculate` - Calculate payroll for employee
- `POST /api/payroll/calculate/batch` - Calculate payroll for all employees
- `GET /api/payroll/calculations` - View payroll summaries
- `POST /api/payroll/process` - Generate final payroll

**UI Components Needed:**
- Payroll calculation dashboard
- Rate management interface
- Deduction configuration
- Payroll summary reports

**Files to Create:**
- `apps/app/app/(authenticated)/payroll/calculations/page.tsx` - Payroll calculations
- `apps/app/app/api/payroll/calculations/route.ts` - Payroll calculation
- `packages/database/prisma/migrations/*_payroll.sql` - Add payroll models

---

### 3.7 Payroll Approval Workflow
**Specs:** `payroll-approval-workflow.md`

**Database:** ❌ Missing TimecardApproval, ApprovalHistory models

**API Endpoints Needed:**
- `GET /api/payroll/approvals/pending` - View pending approvals
- `POST /api/payroll/approvals/[id]` - Approve/reject timecard
- `PUT /api/payroll/approvals/[id]` - Edit timecard during approval
- `GET /api/payroll/approvals/history` - View approval history

**UI Components Needed:**
- Timecard approval queue
- Approval/reject interface
- Bulk approval tools
- Approval history timeline

**Files to Create:**
- `apps/app/app/(authenticated)/payroll/approvals/page.tsx` - Approvals
- `apps/app/app/api/payroll/approvals/route.ts` - Approval operations
- `packages/database/prisma/migrations/*_approvals.sql` - Add approval models

---

## PHASE 4: CRM MODULE

### Status: ~10% Complete
**Implemented:** Basic landing page
**Missing:** Full CRUD for clients, contacts, venues, communications, segmentation

### 4.1 Client Management
**Specs:** `crm-client-detail-view.md`

**Database:** ✅ Complete (Client, ClientContact, ClientPreference)

**API Endpoints Needed:**
- `GET /api/crm/clients` - List clients
- `POST /api/crm/clients` - Create client
- `GET /api/crm/clients/[id]` - Get client details
- `PUT /api/crm/clients/[id]` - Update client
- `GET /api/crm/clients/[id]/event-history` - Client event history
- `GET /api/crm/clients/[id]/financial-summary` - Financial data

**UI Components Needed:**
- Client list with search/filter
- Client detail page with tabbed sections (Contact, Events, Communications, Preferences, Financial)
- Edit client form
- Add note functionality

**Files to Create:**
- `apps/app/app/(authenticated)/crm/clients/page.tsx` - Client list
- `apps/app/app/(authenticated)/crm/clients/new/page.tsx` - Create client
- `apps/app/app/(authenticated)/crm/clients/[id]/page.tsx` - Client detail
- `apps/app/app/api/crm/clients/route.ts` - Client CRUD

---

### 4.2 Client Segmentation
**Specs:** `crm-client-segmentation.md`

**Database:** ❌ Missing ClientTag, ClientTagAssignment models

**API Endpoints Needed:**
- `POST /api/crm/tags` - Create tag
- `GET /api/crm/tags` - List tags
- `POST /api/crm/clients/[id]/tags` - Assign tag
- `DELETE /api/crm/clients/[id]/tags/[tagId]` - Remove tag
- `GET /api/crm/clients?tag=[tagId]` - Filter by tag

**UI Components Needed:**
- Tag management interface
- Client list with tag filtering
- Tag assignment modal
- Segment overview with counts

**Files to Create:**
- `apps/app/app/(authenticated)/crm/tags/page.tsx` - Tag management
- `apps/app/app/api/crm/tags/route.ts` - Tag operations
- `packages/database/prisma/migrations/*_tags.sql` - Add tag models

---

### 4.3 Client Communication Log
**Specs:** `crm-client-communication-log.md`

**Database:** ✅ Complete (ClientInteraction)

**API Endpoints Needed:**
- `GET /api/crm/clients/[id]/communications` - Get communication timeline
- `POST /api/crm/clients/[id]/communications` - Add communication
- `PUT /api/crm/communications/[id]` - Update communication
- `GET /api/crm/communications/[id]/attachments` - Get attachments

**UI Components Needed:**
- Communication timeline component
- Add communication modal
- Attachment upload interface
- Filter controls

**Files to Create:**
- `apps/app/app/(authenticated)/crm/clients/[id]/communications/page.tsx` - Communications
- `apps/app/app/api/crm/communications/route.ts` - Communication operations

---

### 4.4 Venue Management
**Specs:** `crm-venue-management.md`

**Database:** ⚠️ No dedicated Venue model (may need to add)

**API Endpoints Needed:**
- `GET /api/crm/venues` - List venues
- `POST /api/crm/venues` - Create venue
- `GET /api/crm/venues/[id]` - Get venue details
- `PUT /api/crm/venues/[id]` - Update venue
- `DELETE /api/crm/venues/[id]` - Delete venue
- `GET /api/crm/venues/[id]/event-history` - Get venue event history

**UI Components Needed:**
- Venue list with search/filter
- Venue detail page
- Venue creation/update form
- Event linking interface

**Files to Create:**
- `apps/app/app/(authenticated)/crm/venues/page.tsx` - Venue list
- `apps/app/app/(authenticated)/crm/venues/new/page.tsx` - Create venue
- `apps/app/app/api/crm/venues/route.ts` - Venue CRUD
- `packages/database/prisma/migrations/*_venues.sql` - Add venue model

---

### 4.5 Client Lifetime Value Analytics
**Specs:** `analytics-client-lifetime-value.md`

**Database:** ⚠️ Needs computed/aggregated LTV data (may use views or materialized views)

**API Endpoints Needed:**
- `GET /api/analytics/lifetime-value/clients` - All clients with LTV
- `GET /api/analytics/lifetime-value/top-clients` - Top clients
- `GET /api/analytics/lifetime-value/segments` - Client segments
- `GET /api/analytics/lifetime-value/trends` - LTV trends

**UI Components Needed:**
- LTV dashboard
- Client ranking
- Segmentation view
- Retention opportunities

**Files to Create:**
- `apps/app/app/(authenticated)/analytics/lifetime-value/page.tsx` - LTV analytics
- `apps/app/app/api/analytics/lifetime-value/route.ts` - LTV calculations

---

## PHASE 5: INVENTORY MODULE

### Status: ~10% Complete
**Implemented:** Basic landing page
**Missing:** Full CRUD for items, stock levels, forecasting, warehouse operations

### 5.1 Inventory Item Management
**Specs:** `inventory-item-management.md`

**Database:** ✅ Complete (InventoryItem, InventorySupplier, InventoryAlert)

**API Endpoints Needed:**
- `GET /api/inventory/items` - List items
- `POST /api/inventory/items` - Create item
- `PUT /api/inventory/items/[id]` - Update item
- `DELETE /api/inventory/items/[id]` - Delete item

**UI Components Needed:**
- Item list with search/filter
- Item creation/edit form
- Item details view

**Files to Create:**
- `apps/app/app/(authenticated)/inventory/items/page.tsx` - Item list
- `apps/app/app/(authenticated)/inventory/items/new/page.tsx` - Create item
- `apps/app/app/api/inventory/items/route.ts` - Item CRUD

---

### 5.2 Stock Levels Management
**Specs:** `inventory-stock-levels.md`

**Database:** ✅ Complete (InventoryStock, InventoryTransaction)

**API Endpoints Needed:**
- `GET /api/inventory/stock-levels` - Get current levels
- `POST /api/inventory/stock-levels/adjust` - Adjust levels
- `GET /api/inventory/transactions` - Get transaction history

**UI Components Needed:**
- Stock levels dashboard
- Real-time status indicators
- Transaction history
- Adjustment form

**Files to Create:**
- `apps/app/app/(authenticated)/inventory/levels/page.tsx` - Stock levels
- `apps/app/app/api/inventory/stock/route.ts` - Stock operations

---

### 5.3 Recipe Costing
**Specs:** `inventory-recipe-costing.md`

**Database:** ✅ Complete (RecipeIngredient links to InventoryItem)

**API Endpoints Needed:**
- `GET /api/recipes/[id]/cost` - Get recipe cost breakdown
- `POST /api/recipes/[id]/cost/recalculate` - Recalculate costs
- `GET /api/inventory/items/[id]/cost-history` - Cost changes

**UI Components Needed:**
- Recipe cost breakdown view
- Cost per serving calculation
- Cost change history

**Files to Create:**
- `apps/app/app/api/recipes/cost/route.ts` - Cost calculations
- `apps/app/components/recipe-cost-breakdown.tsx` - Cost display

---

### 5.4 Depletion Forecasting
**Specs:** `inventory-depletion-forecasting.md`

**Database:** ❌ Missing InventoryDepletionForecast model

**API Endpoints Needed:**
- `GET /api/inventory/forecasts` - List forecasts
- `GET /api/inventory/[id]/forecast` - Get item forecast
- `POST /api/inventory/[id]/forecast/recalculate` - Recalculate

**UI Components Needed:**
- Forecast dashboard
- Reorder alerts
- Event impact visualization

**Files to Create:**
- `apps/app/app/(authenticated)/inventory/forecasts/page.tsx` - Forecasts
- `apps/app/app/api/inventory/forecasts/route.ts` - Forecast calculations
- `packages/database/prisma/migrations/*_forecasts.sql` - Add forecast models

---

### 5.5 Warehouse Receiving
**Specs:** `warehouse-receiving-workflow.md`

**Database:** ❌ Missing Receiving, ReceivingItem models

**API Endpoints Needed:**
- `GET /api/inventory/receivings` - List receivings
- `POST /api/inventory/receivings` - Create receiving
- `PUT /api/inventory/receivings/[id]/complete` - Complete receiving
- `POST /api/inventory/receivings/[id]/partial` - Partial receiving

**UI Components Needed:**
- Receiving workflow interface
- PO matching
- Quantity verification
- Quality checks

**Files to Create:**
- `apps/app/app/(authenticated)/warehouse/receiving/page.tsx` - Receiving
- `apps/app/app/api/warehouse/receiving/route.ts` - Receiving operations
- `packages/database/prisma/migrations/*_receiving.sql` - Add receiving models

---

### 5.6 Warehouse Shipment Tracking
**Specs:** `warehouse-shipment-tracking.md`

**Database:** ❌ Missing Shipment, ShipmentItem models

**API Endpoints Needed:**
- `GET /api/inventory/shipments` - List shipments
- `POST /api/inventory/shipments` - Create shipment
- `PUT /api/inventory/shipments/[id]/status` - Update status
- `POST /api/inventory/shipments/[id]/confirm` - Confirm delivery
- `GET /api/inventory/shipments/[id]/packing-list` - Generate packing list

**UI Components Needed:**
- Shipment creation form
- Status tracking dashboard
- Delivery confirmation
- Packing list generator

**Files to Create:**
- `apps/app/app/(authenticated)/warehouse/shipments/page.tsx` - Shipments
- `apps/app/app/api/warehouse/shipments/route.ts` - Shipment operations
- `packages/database/prisma/migrations/*_shipments.sql` - Add shipment models

---

### 5.7 Cycle Counting
**Specs:** `warehouse-cycle-counting.md`

**Database:** ❌ Missing CycleCount, CountItem models

**API Endpoints Needed:**
- `GET /api/inventory/cycle-counts` - List cycle counts
- `POST /api/inventory/cycle-counts` - Create count
- `PUT /api/inventory/cycle-counts/[id]/complete` - Complete count
- `PUT /api/inventory/cycle-counts/[id]/items/[itemId]` - Record count

**UI Components Needed:**
- Cycle count scheduling
- Count execution form
- Variance report
- Adjustment workflow

**Files to Create:**
- `apps/app/app/(authenticated)/warehouse/audits/page.tsx` - Cycle counts
- `apps/app/app/api/warehouse/cycle-counts/route.ts` - Cycle count operations
- `packages/database/prisma/migrations/*_cycle_counts.sql` - Add cycle count models

---

## PHASE 6: ANALYTICS MODULE

### Status: ~5% Complete
**Implemented:** Basic landing page
**Missing:** Employee performance, profitability dashboards, comprehensive metrics

### 6.1 Employee Performance Analytics
**Specs:** `analytics-employee-performance.md`

**Database:** ✅ Can use existing models (User, KitchenTask, KitchenTaskClaim, TimeEntry)

**API Endpoints Needed:**
- `GET /api/analytics/employees` - List employees with metrics
- `GET /api/analytics/employees/[id]` - Detailed performance
- `GET /api/analytics/employees/compare` - Compare employees
- `GET /api/analytics/tasks/on-time-rate` - On-time completion

**UI Components Needed:**
- Performance dashboard
- Employee detail view with charts
- Comparison view
- Performance reports

**Files to Create:**
- `apps/app/app/(authenticated)/analytics/employees/page.tsx` - Performance analytics
- `apps/app/app/api/analytics/employees/route.ts` - Performance calculations

---

### 6.2 Profitability Dashboard
**Specs:** `analytics-profitability-dashboard.md`

**Database:** ✅ Can use existing models (Event, CateringOrder, Recipe, TimeEntry)

**API Endpoints Needed:**
- `GET /api/analytics/profitability/events` - Profitability by event
- `GET /api/analytics/profitability/event-types` - By event type
- `GET /api/analytics/profitability/clients` - By client
- `GET /api/analytics/profitability/details/[eventId]` - Event breakdown

**UI Components Needed:**
- Profitability dashboard
- Event profitability view
- Filters and export

**Files to Create:**
- `apps/app/app/(authenticated)/analytics/profitability/page.tsx` - Profitability
- `apps/app/app/api/analytics/profitability/route.ts` - Profitability calculations

---

## PHASE 7: INTEGRATIONS

### Status: ~0% Complete
**Missing:** All integration connections

### 7.1 GoodShuffle Integration
**Specs:** `goodshuffle-integration.md`

**Database:** ❌ Missing integration models (GoodShuffleConnection, GoodShuffleMapping, GoodShuffleSyncQueue)

**API Endpoints Needed:**
- `POST /api/integrations/goodshuffle/sync` - Trigger sync
- `GET /api/integrations/goodshuffle/logs` - View logs
- `PUT /api/integrations/goodshuffle/config` - Update config

**Files to Create:**
- `apps/app/app/(authenticated)/settings/integrations/goodshuffle/page.tsx` - Integration settings
- `apps/app/app/api/integrations/goodshake/route.ts` - Sync operations
- `packages/database/prisma/migrations/*_goodshuffle.sql` - Add integration models

---

### 7.2 Nowsta Integration
**Specs:** `nowsta-integration.md`

**Database:** ❌ Missing NowstaEmployee, NowstaShift, NowstaEmployeeMapping, NowstaSyncLog models

**API Endpoints Needed:**
- `POST /api/integrations/nowsta/sync` - Import shifts/employees
- `GET /api/integrations/nowsta/employees` - List imported
- `PUT /api/integrations/nowsta/mappings` - Update mappings

**Files to Create:**
- `apps/app/app/(authenticated)/settings/integrations/nowsta/page.tsx` - Integration settings
- `apps/app/app/api/integrations/nowsta/route.ts` - Sync operations
- `packages/database/prisma/migrations/*_nowsta.sql` - Add integration models

---

### 7.3 QuickBooks Export
**Specs:** `quickbooks-export.md`

**Database:** ❌ Missing QuickBooksMapping, QuickBooksExport, QuickBooksConnection models

**API Endpoints Needed:**
- `POST /api/integrations/quickbooks/export/invoices` - Export invoices
- `POST /api/integrations/quickbooks/export/bills` - Export bills
- `GET /api/integrations/quickbooks/exports` - View history

**Files to Create:**
- `apps/app/app/(authenticated)/settings/integrations/quickbooks/page.tsx` - Integration settings
- `apps/app/app/api/integrations/quickbooks/route.ts` - Export operations
- `packages/database/prisma/migrations/*_quickbooks.sql` - Add integration models

---

### 7.4 Outbound Webhook System
**Specs:** `webhook-outbound-integrations.md`

**Database:** ❌ Missing WebhookConfig, WebhookPayload, WebhookDeliveryLog models

**API Endpoints Needed:**
- `POST /api/webhooks` - Create webhook
- `PUT /api/webhooks/[id]` - Update webhook
- `DELETE /api/webhooks/[id]` - Delete webhook
- `GET /api/webhooks/logs` - Delivery logs

**Note:** `packages/webhooks/` exists with Svix but needs event integration

**Files to Create:**
- `apps/app/app/(authenticated)/settings/webhooks/page.tsx` - Webhook management
- `apps/app/app/api/webhooks/route.ts` - Webhook CRUD
- `packages/webhooks/src/outbox-integration.ts` - OutboxEvent → Webhook bridge
- `packages/database/prisma/migrations/*_webhooks.sql` - Add webhook models

---

## PHASE 8: PLATFORM FEATURES

### Status: ~0% Complete
**Missing:** Email workflows, bulk operations, SMS notifications, templates

### 8.1 Automated Email Workflows
**Specs:** `automated-email-workflows.md`

**Database:** ❌ Missing EmailWorkflow, EmailTrigger, UserNotificationPreference models

**API Endpoints Needed:**
- `POST /api/workflows/email` - Create workflow
- `GET /api/workflows/email` - List workflows
- `PUT /api/workflows/email/[id]` - Update workflow

**Note:** `packages/email/` exists with Resend but needs workflow logic

**Files to Create:**
- `packages/email/src/workflows.ts` - Workflow engine
- `apps/app/app/api/workflows/email/route.ts` - Workflow operations
- `packages/database/prisma/migrations/*_email_workflows.sql` - Add workflow models

---

### 8.2 Bulk Edit Operations
**Specs:** `bulk-edit-operations.md`

**Database:** ✅ Can use audit_log for undo tracking

**API Endpoints Needed:**
- `POST /api/bulk/edit` - Apply bulk edits
- `POST /api/bulk/edit/preview` - Preview changes
- `POST /api/bulk/edit/undo` - Undo operation

**UI Components Needed:**
- Multi-select checkboxes on entities
- Bulk edit modal
- Preview component

**Files to Create:**
- `apps/app/app/api/bulk/edit/route.ts` - Bulk operations
- `apps/app/components/bulk-edit-modal.tsx` - Bulk edit UI

---

### 8.3 Bulk Grouping Operations
**Specs:** `bulk-grouping-operations.md`

**Database:** ❌ Missing EntityGroup, EntityGroupMembership models

**API Endpoints Needed:**
- `POST /api/groups` - Create group
- `PUT /api/groups/[id]` - Update group
- `DELETE /api/groups/[id]` - Delete group
- `POST /api/groups/[id]/entities` - Add entities

**UI Components Needed:**
- Group creation modal
- Visual clustering
- Drag-and-drop handlers

**Files to Create:**
- `apps/app/app/api/groups/route.ts` - Group operations
- `apps/app/components/entity-group.tsx` - Group UI
- `packages/database/prisma/migrations/*_groups.sql` - Add group models

---

### 8.4 Email Template System
**Specs:** `email-template-system.md`

**Database:** ❌ Missing EmailTemplate, EmailTemplateCategory, EmailTemplateUsage models

**API Endpoints Needed:**
- `POST /api/templates/email` - Create template
- `GET /api/templates/email` - List templates
- `PUT /api/templates/email/[id]` - Update template
- `POST /api/templates/email/[id]/preview` - Preview

**UI Components Needed:**
- Template editor with merge fields
- Template list
- Preview component

**Files to Create:**
- `apps/app/app/(authenticated)/settings/email-templates/page.tsx` - Template management
- `apps/app/app/api/templates/email/route.ts` - Template operations
- `packages/database/prisma/migrations/*_templates.sql` - Add template models

---

### 8.5 SMS Notification System
**Specs:** `sms-notification-system.md`

**Database:** ❌ Missing SMSNotification, UserSMSPreference, SMSTemplate, SMSDeliveryLog models

**API Endpoints Needed:**
- `POST /api/sms/send` - Send SMS
- `GET /api/sms/delivery/[id]` - Check status
- `POST /api/sms/preferences` - Update preferences

**UI Components Needed:**
- SMS preferences page
- Delivery dashboard
- Sending interface

**Files to Create:**
- `packages/notifications/src/sms.ts` - SMS provider integration
- `apps/app/app/(authenticated)/settings/sms/page.tsx` - SMS preferences
- `apps/app/app/api/sms/route.ts` - SMS operations
- `packages/database/prisma/migrations/*_sms.sql` - Add SMS models

---

## MIGRATIONS NEEDED (Database Models to Add)

### Schema Gaps Summary

**Kitchen Module:**
- `PrepList`, `PrepListItem` (tenant_kitchen)
- `EventGuest`, `AllergenWarning` (tenant_kitchen)
- `WasteEntry`, `WasteReason`, `WasteReport` (tenant_kitchen)

**Events Module:**
- `EventBudget`, `BudgetLineItem` (tenant_events)
- `EventContract`, `ContractSignature` (tenant_events)
- `EventProposal`, `ProposalTemplate` (tenant_events)
- `CommandBoardLayout`, `CommandBoardPosition`, `CommandBoardPresence` (tenant_admin)

**Staff/Scheduling:**
- `EmployeeAvailability`, `TimeOffRequest` (tenant_staff)
- `EmployeeSkill`, `EmployeeSeniority` (tenant_staff)
- `Timecard`, `TimecardLocation`, `TimecardPhoto` (tenant_staff)
- `PayRate`, `PayrollCalculation`, `Deduction` (tenant_staff)
- `TimecardApproval`, `ApprovalHistory` (tenant_staff)

**CRM:**
- `ClientTag`, `ClientTagAssignment` (tenant_crm)
- `Venue` (tenant_crm - may need verification)

**Inventory:**
- `InventoryDepletionForecast` (tenant_inventory)
- `Receiving`, `ReceivingItem` (tenant_inventory)
- `Shipment`, `ShipmentItem` (tenant_inventory)
- `CycleCount`, `CountItem` (tenant_inventory)

**Integrations:**
- `GoodShuffleConnection`, `GoodShuffleMapping`, `GoodShuffleSyncQueue` (platform)
- `NowstaEmployee`, `NowstaShift`, `NowstaEmployeeMapping`, `NowstaSyncLog` (platform)
- `QuickBooksMapping`, `QuickBooksExport`, `QuickBooksConnection` (platform)
- `WebhookConfig`, `WebhookPayload`, `WebhookDeliveryLog` (platform)

**Platform:**
- `EmailWorkflow`, `EmailTrigger`, `UserNotificationPreference` (platform)
- `EntityGroup`, `EntityGroupMembership` (platform)
- `EmailTemplate`, `EmailTemplateCategory`, `EmailTemplateUsage` (platform)
- `SMSNotification`, `UserSMSPreference`, `SMSTemplate`, `SMSDeliveryLog` (platform)

---

## SUMMARY BY MODULE

| Module | Database | API | UI | Overall |
|--------|----------|-----|-----|---------|
| Kitchen | 85% | 40% | 25% | **30%** |
| Events | 90% | 50% | 40% | **60%** |
| Staff/Scheduling | 70% | 20% | 15% | **20%** |
| CRM | 80% | 10% | 10% | **15%** |
| Inventory | 75% | 10% | 10% | **15%** |
| Analytics | N/A (computed) | 5% | 5% | **5%** |
| Integrations | 0% | 0% | 0% | **0%** |
| Platform | 30% | 5% | 5% | **5%** |

**Overall Convoy Progress: ~15-20% Complete**

---

## NEXT STEPS (Recommended Starting Point)

1. **RESOLVE CRITICAL BLOCKER:** Collaboration package provider decision (Ably vs LiveBlocks)
2. **Complete Kitchen Module** (Priority #1) - mobile task claiming, recipes, prep lists
3. **Complete Events Module** (Priority #2) - battle boards, timelines, budgets
4. **Build Staff/Scheduling** (Priority #3) - availability, time tracking, payroll

---

## NOTES

- All database migrations must follow multi-tenant pattern with `tenantId` column
- All API routes must include tenant isolation and auth checks
- Realtime features depend on collaboration package resolution
- Testing strategy: browser-based testing prioritized over unit tests for UI
- Documentation to be updated in Mintlify at http://localhost:2232 when features are complete
