# Command Board AI Integration - Implementation Plan

## Goal
Enable full AI-driven command board operations: users can create events, prep lists, recipes, workflows, payroll, and schedules through AI without touching traditional SaaS interfaces.

---

## Current State (Verified 2026-02-18)

### AI Tools Status (12 total)
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
| **auto_generate_purchase** | PLACEHOLDER | `estimatedGuests: 100` (line 1561), `currentQuantity: 0` (line 1583), hardcoded items |

### Domain Commands Status (5 implemented, 5 missing)
| Command | Status | Location |
|---------|--------|----------|
| create_event | IMPLEMENTED | manifest-plans.ts:734 |
| link_menu | IMPLEMENTED | manifest-plans.ts:738-743 |
| create_task | IMPLEMENTED | manifest-plans.ts:746-751 |
| assign_employee | IMPLEMENTED | manifest-plans.ts:754-759 |
| update_inventory | IMPLEMENTED | manifest-plans.ts:762-767 |
| **create_prep_tasks** | MISSING | Referenced in chat/route.ts:1498 |
| **create_purchase_order** | MISSING | Referenced in chat/route.ts:1607 |
| **update_task** | MISSING | Referenced in chat/route.ts:807 |
| **update_event** | MISSING | Referenced in chat/route.ts:817 |
| **update_role_policy** | MISSING | Referenced in chat/route.ts:1128 |

### Backend APIs (All Verified Ready)
- `/api/kitchen/ai/bulk-generate/prep-tasks` - Returns GeneratedPrepTask[] with estimatedMinutes, station
- `/api/kitchen/ai/bulk-generate/prep-tasks/save` - Persists prep tasks
- `/api/inventory/purchase-orders/commands/create` - Manifest-based PO creation
- `/api/conflicts/detect` - 7 conflict types: scheduling, staff, inventory, timeline, venue, resource, financial
- `/api/payroll/generate` - Payroll calculation
- `/api/staff/shifts` - Shift creation via manifest
- `/api/kitchen/recipes/commands/create` - Recipe creation via manifest

---

## Priority Tasks (10 remaining)

### P0-1. [x] Fix `auto_generate_prep` AI Tool
**File**: `apps/app/app/api/command-board/chat/route.ts:1497-1704`

**Completed**: 2026-02-18

**Changes**:
- Replaced static prep templates with real API calls to `/api/kitchen/ai/bulk-generate/prep-tasks`
- Calculates `estimatedHours` from `sum(task.estimatedMinutes) / 60` instead of hardcoded `40`
- Groups tasks by station when `groupByStation: true`
- Calls `/api/kitchen/ai/bulk-generate/prep-tasks/save` when `createTasks: true`
- Returns actual generated task data with proper type definitions

### P0-2. [ ] Fix `auto_generate_purchase` AI Tool
**File**: `apps/app/app/api/command-board/chat/route.ts:1534-1640`

**Problem**: Fabricates items, uses hardcoded `estimatedGuests: 100`, `currentQuantity: 0`.

**Solution**:
1. Query `event_dishes` table for dishes linked to target events
2. Query `RecipeIngredient` for ingredient quantities per recipe
3. Query `InventoryItem` for actual `quantity` and `reorder_level`
4. Fetch real `event.guestCount` from Event entity
5. Calculate needed: `recipeIngredient.quantity * (eventGuestCount / recipeServings)`
6. Compare needed vs current to determine `suggestedOrder` quantities

### P1-1. [ ] Add `create_prep_tasks` Domain Command
**File**: `apps/app/app/(authenticated)/command-board/actions/manifest-plans.ts:715-776`

**Solution**:
1. Add case in `executeDomainStep()` for `normalized === "create_prep_tasks"`
2. Call `POST /api/kitchen/ai/bulk-generate/prep-tasks/save` with eventId from args
3. Return created task count and task IDs
4. Add projection to board for each created task

### P1-2. [ ] Add `create_purchase_order` Domain Command
**File**: `apps/app/app/(authenticated)/command-board/actions/manifest-plans.ts:715-776`

**Solution**:
1. Add case in `executeDomainStep()` for `normalized === "create_purchase_order"`
2. Call `POST /api/inventory/purchase-orders/commands/create` with manifest runtime
3. Set `status: "draft"` in args for approval workflow
4. Return PO ID and item count

### P1-3. [ ] Add `update_task` Domain Command
**File**: `apps/app/app/(authenticated)/command-board/actions/manifest-plans.ts:715-776`

**Solution**:
1. Add case in `executeDomainStep()` for `normalized === "update_task"`
2. Support modifying: status, priority, dueByDate, assignedTo, notes
3. Use direct DB update via `database.prepTask.update()`
4. Validate task exists and belongs to tenant

### P1-4. [ ] Add `update_event` Domain Command
**File**: `apps/app/app/(authenticated)/command-board/actions/manifest-plans.ts:715-776`

**Solution**:
1. Add case in `executeDomainStep()` for `normalized === "update_event"`
2. Support updating: title, eventDate, guestCount, status, venueName, notes
3. Use direct DB update via `database.event.update()`
4. Validate event exists and belongs to tenant

### P1-5. [ ] Add `update_role_policy` Domain Command
**File**: `apps/app/app/(authenticated)/command-board/actions/manifest-plans.ts:715-776`

**Solution**:
1. Add case in `executeDomainStep()` for `normalized === "update_role_policy"`
2. Update overtimeThresholdHours, overtimeMultiplier, or baseRate
3. Use direct DB update via `database.role.update()`
4. Validate role exists and belongs to tenant

### P2-1. [ ] Add AI Tool: `generate_payroll`
**File**: `apps/app/app/api/command-board/chat/route.ts` (new tool after line 1640)

**Solution**:
1. Add `generate_payroll` AI tool with period parameters
2. Call `POST /api/payroll/generate` with startDate, endDate
3. Return payroll summary with employee breakdown for approval
4. Create manifest plan hint for `execute_payroll` command

### P2-2. [ ] Add AI Tool: `create_shift`
**File**: `apps/app/app/api/command-board/chat/route.ts` (new tool after line 1640)

**Solution**:
1. Add `create_shift` AI tool with employeeId, date, startTime, endTime, role, locationId
2. Call `POST /api/staff/shifts` via manifest runtime
3. Return shift details for approval
4. Create manifest plan with domain command

### P2-3. [ ] Add AI Tool: `create_recipe`
**File**: `apps/app/app/api/command-board/chat/route.ts` (new tool after line 1640)

**Solution**:
1. Add `create_recipe` AI tool with name, description, ingredients[], steps[]
2. Call `POST /api/kitchen/recipes/commands/create` via manifest runtime
3. Return recipe details for approval
4. Create manifest plan with domain command

### P2-4. [ ] Wire Simulation Conflicts to UI
**File**: `apps/app/app/(authenticated)/command-board/components/conflict-warning-panel.tsx`

**Problem**: Shows live conflicts only, no simulation-specific analysis.

**Solution**:
1. Add `simulationBoardId?: string` prop to ConflictWarningPanelProps
2. When simulationBoardId provided, call `/api/conflicts/detect` for simulation board
3. Display delta: "Simulation introduces X new conflicts, resolves Y conflicts"
4. Add visual distinction (blue border) for simulation-specific conflicts
5. Wire in board-shell.tsx where simulation toggle exists

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
- [x] 10 AI tools fully functional (auto_generate_prep now uses real API data)
- [x] Prep task generation API with save endpoint
- [x] Purchase order command API via manifest runtime
- [x] Payroll calculation engine and UI (standalone)
- [x] Recipe CRUD APIs and entity support
- [x] Full scheduling/shifts UI and APIs
- [x] Full payroll UI and APIs
- [x] **optimize_schedule** AI Tool - Now calls `/api/conflicts/detect` for real conflict data, maps affected entities to real event IDs, provides actionable recommendations with proper severity mapping
- [x] **auto_generate_prep** AI Tool - Now calls `/api/kitchen/ai/bulk-generate/prep-tasks` for real data, calculates estimatedHours from task.estimatedMinutes, groups by station, saves via save endpoint
