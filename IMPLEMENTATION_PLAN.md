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

## Priority Tasks (2 remaining - P1 UI Polish)

### P1 - In Progress
- [x] Card hover action buttons (remove, detail, pin) - HIGH IMPACT
- [x] Edge hover state (thicken on hover + tooltip)
- [ ] Empty state with quick action buttons
- [ ] Entity Browser: refresh button for categories

### P1 - Lower Priority
- [ ] Card hover/selection smooth animations
- [ ] Entity Browser: drag-to-add functionality
- [ ] Entity Browser: keyboard navigation
- [ ] Smooth edge routing

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
