# Command Board AI Integration - Implementation Plan

## Goal
Enable full AI-driven command board operations: users can create events, prep lists, recipes, workflows, payroll, and schedules through AI without touching traditional SaaS interfaces.

---

## Current State (Verified 2026-02-18)

### AI Tools Status (15 total) - ALL FUNCTIONAL
- suggest_board_action, suggest_manifest_plan, query_board_context
- detect_conflicts (calls `/api/conflicts/detect`)
- explain_risk, resolve_risk, query_policies, update_policy
- suggest_simulation_plan (uses forkCommandBoard)
- optimize_schedule (calls /api/conflicts/detect for real data)
- auto_generate_prep (calls /api/kitchen/ai/bulk-generate/prep-tasks)
- auto_generate_purchase (queries event_dishes, RecipeIngredient, InventoryItem)
- generate_payroll (calls /api/payroll/generate)
- create_shift (calls /api/staff/shifts via manifest runtime)
- create_recipe (calls /api/kitchen/recipes/commands/create)

### Domain Commands (11 implemented)
- create_event, link_menu, create_task, assign_employee, update_inventory
- create_prep_tasks, create_purchase_order, update_task, update_event
- update_role_policy, create_recipe

### Backend APIs (All Ready)
- `/api/kitchen/ai/bulk-generate/prep-tasks` and `/save`
- `/api/inventory/purchase-orders/commands/create`
- `/api/conflicts/detect` (7 conflict types)
- `/api/payroll/generate`
- `/api/staff/shifts`
- `/api/kitchen/recipes/commands/create`

---

## Priority Tasks

### P1 - Completed
- [x] Card hover action buttons (remove, detail, pin) - HIGH IMPACT
- [x] Edge hover state (thicken on hover + tooltip)
- [x] Empty state with quick action buttons
- [x] Entity Browser: refresh button for categories
- [x] Card hover/selection smooth animations
- [x] Entity Browser: drag-to-add functionality
- [x] Entity Browser: keyboard navigation
- [x] Smooth edge routing
- [x] Entity Browser: search within browser
- [x] Entity Browser: pre-load category counts
- [x] Browser text size fix (text-[10px] → text-xs)

### P2 - Completed
- [x] Canvas background brand colors
- [x] BUG-06: Smart placement algorithm (grid-based instead of random)
- [x] BUG-07: Consistent card width (280px constraint)

---

## Completed

- Command Board foundation, canvas, entity cards, AI chat with streaming
- Real-time sync with Liveblocks, conflict detection API
- Simulation mode with forkCommandBoard, manifest plan approval workflow
- 15 AI tools fully functional with real API integrations
- 11 domain commands implemented
- Simulation Conflicts UI with delta analysis
- Biome lint fixes across API routes
- Entity Browser search/filter
- Test fixes (1449 tests passing: 667 manifest-runtime + 675 API + 107 app)
- Added missing IR schema for validate command
- BUG-08: MiniMap/Controls styling - replaced !important with CSS classes
- Card hover action buttons (Eye, Pin/Unpin, Remove) with toggle pin API
- Edge hover state with thickening and tooltip for connection labels
- Empty state with quick action buttons (Events, Clients, Tasks, Browse All)
- Entity Browser: refresh button for categories with loading spinner
- Entity Browser: keyboard navigation (Arrow keys, Enter, Escape, Tab)
- Entity Browser: drag-to-add functionality with visual drop feedback
- Card hover/selection smooth animations (scale transforms, fade-in action buttons)
- Smooth edge routing using getSmoothStepPath with rounded corners
- Entity Browser: pre-load category counts (parallel count queries on mount)
- Entity Browser: text size fix (text-[10px] → text-xs for readability)
- Canvas background brand colors (using CSS variable --border for themed dots)
- BUG-06: Smart placement algorithm (grid-based, 3-column layout with 320x200 spacing)
- BUG-07: Card width constraint (280px fixed width in projection-node.tsx)
- Lint fix: Added default switch clause and fixed Array<T> → T[] syntax
