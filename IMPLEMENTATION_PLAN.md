# Command Board AI Integration - Implementation Plan

## Goal
Enable full AI-driven command board operations: users can create events, prep lists, recipes, workflows, payroll, and schedules through AI without touching traditional SaaS interfaces.

---

## Current State (Verified 2026-02-18)

### AI Tools Status (15 total)
| Tool | Status | Issue |
|------|--------|-------|
| suggest_board_action | FUNCTIONAL | - |
| suggest_manifest_plan | FUNCTIONAL | - |
| query_board_context | FUNCTIONAL | - |
| detect_conflicts | FUNCTIONAL | Calls `/api/conflicts/detect` correctly |
| explain_risk | FUNCTIONAL | Static templates (by design) |
| resolve_risk | FUNCTIONAL | - |
| query_policies | FUNCTIONAL | - |
| update_policy | FUNCTIONAL | - |
| suggest_simulation_plan | FUNCTIONAL | Uses forkCommandBoard correctly |
| optimize_schedule | FUNCTIONAL | Now calls /api/conflicts/detect for real data |
| **auto_generate_prep** | FUNCTIONAL | Now calls /api/kitchen/ai/bulk-generate/prep-tasks for real data |
| **auto_generate_purchase** | FUNCTIONAL | Now queries event_dishes, RecipeIngredient, InventoryItem for real data |
| **generate_payroll** | FUNCTIONAL | Calls /api/payroll/generate for real payroll calculations |
| **create_shift** | FUNCTIONAL | Calls /api/staff/shifts via manifest runtime |
| **create_recipe** | FUNCTIONAL | Calls /api/kitchen/recipes/commands/create via manifest runtime |

### Domain Commands Status (11 implemented)
| Command | Status | Location |
|---------|--------|----------|
| create_event | IMPLEMENTED | manifest-plans.ts:1229 |
| link_menu | IMPLEMENTED | manifest-plans.ts:1233-1239 |
| create_task | IMPLEMENTED | manifest-plans.ts:1241-1247 |
| assign_employee | IMPLEMENTED | manifest-plans.ts:1249-1255 |
| update_inventory | IMPLEMENTED | manifest-plans.ts:1257-1263 |
| create_prep_tasks | IMPLEMENTED | manifest-plans.ts:1265 |
| create_purchase_order | IMPLEMENTED | manifest-plans.ts:1269-1274 |
| update_task | IMPLEMENTED | manifest-plans.ts:1276-1281 |
| update_event | IMPLEMENTED | manifest-plans.ts:1283-1288 |
| update_role_policy | IMPLEMENTED | manifest-plans.ts:1290-1295 |
| create_recipe | IMPLEMENTED | manifest-plans.ts:1348-1349 |

### Backend APIs (All Verified Ready)
- `/api/kitchen/ai/bulk-generate/prep-tasks` - Returns GeneratedPrepTask[] with estimatedMinutes, station
- `/api/kitchen/ai/bulk-generate/prep-tasks/save` - Persists prep tasks
- `/api/inventory/purchase-orders/commands/create` - Manifest-based PO creation
- `/api/conflicts/detect` - 7 conflict types: scheduling, staff, inventory, timeline, venue, resource, financial
- `/api/payroll/generate` - Payroll calculation
- `/api/staff/shifts` - Shift creation via manifest
- `/api/kitchen/recipes/commands/create` - Recipe creation via manifest

---

## Priority Tasks (0 remaining - All complete!)

### P0-1. [x] Fix `auto_generate_prep` AI Tool
**File**: `apps/app/app/api/command-board/chat/route.ts:1497-1704`

**Completed**: 2026-02-18

**Changes**:
- Replaced static prep templates with real API calls to `/api/kitchen/ai/bulk-generate/prep-tasks`
- Calculates `estimatedHours` from `sum(task.estimatedMinutes) / 60` instead of hardcoded `40`
- Groups tasks by station when `groupByStation: true`
- Calls `/api/kitchen/ai/bulk-generate/prep-tasks/save` when `createTasks: true`
- Returns actual generated task data with proper type definitions

### P0-2. [x] Fix `auto_generate_purchase` AI Tool
**File**: `apps/app/app/api/command-board/chat/route.ts:1706-2040`

**Completed**: 2026-02-18

**Changes**:
- Replaced hardcoded items with real API queries to event_dishes, dishes, recipes, and inventory
- Queries `event_dishes` table for dishes linked to target events via $queryRaw
- Fetches `event.guestCount` from Event entity for accurate guest counts
- Gets latest `RecipeVersion` for each recipe to determine `yieldQuantity` (servings)
- Gets `RecipeIngredient` records for ingredient quantities per recipe
- Gets `Ingredient` details (name, category) for item descriptions
- Matches ingredients to `InventoryItem` by name for current stock levels
- Calculates needed: `recipeIngredient.quantity * (eventGuestCount / recipeServings)`
- Compares needed vs current stock to determine `suggestedOrder` quantities
- Returns real low-stock items from InventoryItem.parLevel checks
- Groups items by vendor when `groupByVendor: true`

### P1-1. [x] Add `create_prep_tasks` Domain Command
**File**: `apps/app/app/(authenticated)/command-board/actions/manifest-plans.ts:715-851`

**Completed**: 2026-02-18

**Changes**:
- Added `executeCreatePrepTasksStep()` function that calls `/api/kitchen/ai/bulk-generate/prep-tasks` to generate tasks
- Calls `/api/kitchen/ai/bulk-generate/prep-tasks/save` to persist tasks to database
- Adds board projections for each created task
- Returns created task count and projection count

### P1-2. [x] Add `create_purchase_order` Domain Command
**File**: `apps/app/app/(authenticated)/command-board/actions/manifest-plans.ts:853-942`

**Completed**: 2026-02-18

**Changes**:
- Added `executeCreatePurchaseOrderStep()` function
- Calls `/api/inventory/purchase-orders/commands/create` via manifest runtime
- Supports items array with ingredientId, inventoryItemId, name, quantity, unit, estimatedCost
- Returns PO ID and item count

### P1-3. [x] Add `update_task` Domain Command
**File**: `apps/app/app/(authenticated)/command-board/actions/manifest-plans.ts:944-1046`

**Completed**: 2026-02-18

**Changes**:
- Added `executeUpdateTaskStep()` function
- Supports modifying: status, priority, dueByDate, assignedTo, notes
- Uses raw SQL update via `database.$executeRaw`
- Validates task exists and belongs to tenant

### P1-4. [x] Add `update_event` Domain Command
**File**: `apps/app/app/(authenticated)/command-board/actions/manifest-plans.ts:1048-1134`

**Completed**: 2026-02-18

**Changes**:
- Added `executeUpdateEventStep()` function
- Supports updating: title, eventDate, guestCount, status, venueName, venueAddress, notes
- Uses Prisma `database.event.update()`
- Validates event exists and belongs to tenant

### P1-5. [x] Add `update_role_policy` Domain Command
**File**: `apps/app/app/(authenticated)/command-board/actions/manifest-plans.ts:1136-1205`

**Completed**: 2026-02-18

**Changes**:
- Added `executeUpdateRolePolicyStep()` function
- Supports updating: overtimeThresholdHours, overtimeMultiplier, baseRate
- Uses Prisma `database.role.update()` with compound unique key
- Validates role exists and belongs to tenant

### P2-1. [x] Add AI Tool: `generate_payroll`
**File**: `apps/app/app/api/command-board/chat/route.ts:2041-2180`

**Completed**: 2026-02-18

**Changes**:
- Added `generate_payroll` AI tool with periodStart, periodEnd, jurisdiction, previewOnly parameters
- Validates date range (max 31 days) before calling API
- Calls `POST /api/payroll/generate` with period parameters
- Returns payroll summary with formatted currency values (gross, net, taxes, deductions)
- Includes employee count in response
- Provides manifest plan hint for `execute_payroll` domain command
- Returns actionable next steps for approval workflow

### P2-2. [x] Add AI Tool: `create_shift`
**File**: `apps/app/app/api/command-board/chat/route.ts:2185-2410`

**Completed**: 2026-02-18

**Changes**:
- Added `create_shift` AI tool with employeeId, date, startTime, endTime, locationId, role (optional), notes (optional)
- Validates date format (ISO) and time format (HH:MM)
- Validates shift end time is after start time
- Warns if shift duration exceeds 12 hours
- Finds existing schedule for target date or creates new schedule via `/api/staff/schedules/commands/create`
- Creates shift via `POST /api/staff/shifts` with manifest runtime
- Returns shift details with formatted times, duration, and manifest plan hint
- Added tool guidance to SYSTEM_PROMPT for when to use create_shift

### P2-3. [x] Add AI Tool: `create_recipe`
**File**: `apps/app/app/api/command-board/chat/route.ts:2415-2513`

**Completed**: 2026-02-18

**Changes**:
- Added `create_recipe` AI tool with name, category, cuisineType, description, tags parameters
- Validates recipe name is required and non-empty
- Calls `POST /api/kitchen/recipes/commands/create` via manifest runtime
- Returns recipe details with ID and manifest plan hint
- Added tool guidance to SYSTEM_PROMPT for when to use create_recipe
- Added `create_recipe` domain command to manifest-plans.ts

### P2-4. [x] Wire Simulation Conflicts to UI
**File**: `apps/app/app/(authenticated)/command-board/components/conflict-warning-panel.tsx`

**Completed**: 2026-02-18

**Changes**:
- Added `simulationBoardId?: string` prop to ConflictWarningPanelProps
- Added `useSimulationConflicts` hook to fetch simulation board conflicts when simulationBoardId is provided
- Computes delta between live and simulation conflicts (new conflicts introduced, conflicts resolved)
- Displays "Simulation Analysis" alert with delta summary (blue border for simulation mode)
- Adds "New in simulation" badge and red left border for conflicts introduced by simulation
- Wires simulationBoardId in board-shell.tsx when boardMode === "simulation"
- Refactored component into sub-components (ConflictItem, SimulationDeltaAlert, ConflictList) to reduce complexity

---

## Completed

- [x] Command Board foundation, canvas, and entity cards
- [x] AI chat panel with streaming (Vercel AI SDK + useChat hook)
- [x] Real-time sync with Liveblocks
- [x] Conflict detection API (7 types: scheduling, staff, inventory, timeline, venue, resource, financial)
- [x] Simulation mode with forkCommandBoard
- [x] Manifest plan approval workflow
- [x] AI tool entity resolution (labels display correctly)
- [x] Domain commands: create_event, link_menu, create_task, assign_employee, update_inventory
- [x] **Domain commands: create_prep_tasks, create_purchase_order, update_task, update_event, update_role_policy** (2026-02-18)
- [x] 10 AI tools fully functional (auto_generate_prep now uses real API data)
- [x] Prep task generation API with save endpoint
- [x] Purchase order command API via manifest runtime
- [x] Payroll calculation engine and UI (standalone)
- [x] Recipe CRUD APIs and entity support
- [x] Full scheduling/shifts UI and APIs
- [x] Full payroll UI and APIs
- [x] **optimize_schedule** AI Tool - Now calls `/api/conflicts/detect` for real conflict data, maps affected entities to real event IDs, provides actionable recommendations with proper severity mapping
- [x] **auto_generate_prep** AI Tool - Now calls `/api/kitchen/ai/bulk-generate/prep-tasks` for real data, calculates estimatedHours from task.estimatedMinutes, groups by station, saves via save endpoint
- [x] **auto_generate_purchase** AI Tool - Now queries event_dishes, dishes, recipes (RecipeVersion, RecipeIngredient), ingredients, and inventory items for real purchase calculations based on event guest counts
- [x] **generate_payroll** AI Tool - Now calls `/api/payroll/generate` for real payroll calculations with period parameters, returns formatted summary with employee count and totals
- [x] **create_shift** AI Tool - Now calls `/api/staff/shifts` via manifest runtime, finds or creates schedule for target date, validates date/time formats and shift duration
- [x] **create_recipe** AI Tool - Now calls `/api/kitchen/recipes/commands/create` via manifest runtime with name, category, cuisineType, description, tags parameters
- [x] **create_recipe** Domain Command - Added executeCreateRecipeStep function and routing in manifest-plans.ts
- [x] **Simulation Conflicts UI** - ConflictWarningPanel now shows simulation-specific conflicts with delta analysis (introduces/resolves), blue border for simulation mode, "New in simulation" badges
- [x] **Biome Lint Fixes** - Fixed lint issues in kitchen routes: removed unused imports, fixed nested ternary expressions, reduced cognitive complexity in sync-claims/route.ts (2026-02-18)
- [x] **Biome Lint Fixes (Round 2)** - Fixed lint issues in sentry-fixer/process/route.ts: removed unnecessary async from GET handler, reduced cognitive complexity in processJob by extracting helper functions (validateRunnerConfig, notifyPRCreated, notifyFixFailed). Fixed async without await in shipments/route.ts (2026-02-18)
- [x] **Entity Browser Search** - Added search/filter input to Entity Browser with real-time filtering across title and subtitle fields. Updates empty state message when search has no matches. (2026-02-18)
- [x] **Card Width Fix** - Verified ProjectionNode already has explicit `w-[280px]` width constraint (2026-02-18)
- [x] **API Routes Lint Fixes (Round 3)** - Fixed biome lint issues in apps/api/app routes: reduced cognitive complexity in employees/[id]/route.ts by extracting coerceValue helper function, fixed nested ternary expressions, removed unnecessary async keywords from manifest-delegating routes (staff/shifts/route.ts, timecards/route.ts), added explicit type annotation for payload in sentry webhook route (2026-02-18)
