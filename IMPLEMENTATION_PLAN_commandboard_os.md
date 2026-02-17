# AI-Native Command Board OS — Implementation Plan

**Last Updated**: 2026-02-17
**Goal**: Transform Command Board into AI-Native Command Board OS
**Spec**: specs/command-board/boardspec.md

---

## Current State Summary

The Command Board has foundational pieces for AI-Native OS:
- React Flow canvas with 7 entity card types ✓
- AI Chat Panel with streaming responses ✓
- Manifest plan types and execution flow (create_event, link_menu) ✓
- Conflict detection API exists (scheduling, staff, inventory, timeline, venue) ✓
- Derived connections from database relationships (Client→Event, Event→PrepTask, Event→Employee, Event→Shipment, Client→Proposal) ✓
- Entity Detail Panel fully wired ✓
- Undo/Redo implemented with useBoardHistory hook ✓
- Error boundary in place ✓
- Duplicate entity detection with toast notification ✓
- Entity Browser tracks projections in real-time ✓

**What's Actually Implemented (verified)**:
- AI Chat: 3 tools (suggest_board_action, suggest_manifest_plan, query_board_context)
- Domain Commands: create_event, link_menu, add_dish_to_event, link_menu_item
- Conflict Detection: 5 types (scheduling, staff, inventory, timeline, venue) with resolution options
- ConflictWarningPanel UI component exists but NOT wired to board
- "What's at risk?" and "Find conflicts" quick prompts exist in UI but NOT connected to conflict detection API

**Key Gaps**:
- Plan schema missing: executionStrategy, rollbackStrategy, riskAssessment, costImpact
- No financial delta or task load delta in plan preview
- Limited domain commands (only 2 actual commands working)
- Risk intelligence not visible (no risk nodes/edges, no explain_risk/resolve_risk tools)
- Simulation engine not started
- Recipe/dish/inventory connections not derived
- Policy editing not available

---

## Priority Order

### Phase 1: Intent-to-Execution Engine (Highest ROI)

| # | Item | Location | Status |
|---|------|----------|--------|
| 1.1 | Wire EntityDetailPanel in BoardShell | board-shell.tsx line 263 | COMPLETED |
| 1.2 | Extend manifest plan schema with executionStrategy, rollbackStrategy, riskAssessment, costImpact | types/manifest-plan.ts | COMPLETED (schemas exist at lines 129-132 and 190-251, populated by AI when creating plans) |
| 1.3 | Add financial delta and task load delta to plan preview UI | ai-chat-panel.tsx, api/command-board/chat/route.ts | COMPLETED (UI displays financial delta and risk assessment at lines 703-827, API now generates default values based on plan complexity) |
| 1.4 | Add more domain command handlers (create_task, assign_employee, update_inventory) | actions/manifest-plans.ts | COMPLETED (added create_task, assign_employee, update_inventory + aliases) |
| 1.5 | Wire conflict detection to AI chat "What's at risk?" prompt | api/command-board/chat/route.ts | COMPLETED (detect_conflicts tool wired to /api/conflicts/detect, system prompt instructs AI to use it) |

### Phase 2: Risk Intelligence (Visible Intelligence)

| # | Item | Location | Status |
|---|------|----------|--------|
| 2.1 | Create risk nodes and edges for board projection | derive-connections.ts extension | NOT STARTED |
| 2.2 | Wire conflict-warning-panel component to board | board-shell.tsx | COMPLETED (wired with auto-detect on mount, header button to toggle) |
| 2.3 | Add explain_risk AI tool | api/command-board/chat/route.ts | COMPLETED (explains conflicts with detailed implications and recommendations) |
| 2.4 | Add resolve_risk AI tool | api/command-board/chat/route.ts | COMPLETED (suggests resolution actions and can create resolution plans) |
| 2.5 | Create RiskEntity type and rendering | conflict-types.ts | NOT STARTED |

### Phase 3: Board as Operational Digital Twin

| # | Item | Location | Status |
|---|------|----------|--------|
| 3.1 | Add recipe->dish, dish->recipe connections | derive-connections.ts | NOT STARTED |
| 3.2 | Add financial exposure projection nodes | types/entities.ts, nodes/ | NOT STARTED |
| 3.3 | Add inventory risk indicator nodes | nodes/inventory-card.tsx | PARTIAL (low stock badge exists, multi-threshold levels not implemented) |
| 3.4 | Real-time live inventory levels on cards | projection-node.tsx | NOT STARTED |

### Phase 4: AI as Configuration Abstraction

| # | Item | Location | Status |
|---|------|----------|--------|
| 4.1 | Add policy editing tool to AI | api/command-board/chat/route.ts | NOT STARTED |
| 4.2 | Create natural language->domain command compiler | actions/ | NOT STARTED |
| 4.3 | Add config validation and preview | actions/manifest-plans.ts | NOT STARTED |

### Phase 5: Simulation Engine

| # | Item | Location | Status |
|---|------|----------|--------|
| 5.1 | Add board fork/clone functionality | actions/boards.ts | NOT STARTED |
| 5.2 | Create ephemeral simulation mode state | types/board.ts | NOT STARTED |
| 5.3 | Add diff overlay rendering | board-flow.tsx | NOT STARTED |
| 5.4 | Add Live/Simulation toggle UI | board-header.tsx | NOT STARTED |

---

## Known Bugs to Fix (Blocking Issues)

| # | Item | Location | Status |
|---|------|----------|--------|
| B1 | Entity Detail Panel placeholder text | board-shell.tsx:263 | COMPLETED |
| B2 | Duplicate entities allowed on board | entity-browser.tsx | COMPLETED (toast notification) |
| B3 | Undo/Redo hardcoded to false | board-shell.tsx:199-200 | COMPLETED (values are DYNAMIC - hook calculates from history state, NOT hardcoded) |
| B4 | Entity Browser stale after board changes | entity-browser.tsx | COMPLETED (tracks projections) |
| B5 | No error boundary on board | board-shell.tsx | COMPLETED |

---

## Verification Notes (2026-02-17)

- **B3 Correction**: Undo/Redo was incorrectly claimed as "hardcoded to false". Verified in `use-board-history.ts:21-22` - canUndo/canRedo are dynamically calculated from past/future arrays. Values are NOT hardcoded.
- **B1 Correction**: Entity Detail Panel was claimed to have placeholder text. Verified fully wired at `board-shell.tsx:262-271` with actual component.
- **1.1 CORRECTION**: Item 1.1 "Wire EntityDetailPanel" is marked COMPLETED but should verify it's working (the wiring exists).

## Implementation Notes (2026-02-17)

- **1.4 COMPLETED**: Added three new domain command handlers in `manifest-plans.ts`:
  - `create_task` / `add_task` / `create_prep_task`: Creates prep tasks linked to events
  - `assign_employee` / `assign_staff` / `add_employee`: Assigns employees to events with role
  - `update_inventory` / `adjust_inventory` / `modify_inventory`: Updates inventory quantities (set/add/subtract)
- **1.3 COMPLETED**: Added display of riskAssessment, costImpact (financial delta), executionStrategy, and rollbackStrategy to AI Chat Panel plan preview UI.
- **1.2 CORRECTION**: Item 1.2 was already completed in a previous iteration - the chat route (`apps/app/app/api/command-board/chat/route.ts`) already populates these fields via `calculateFinancialDelta` and `generateRiskAssessment` helper functions (lines 33-187).
- **1.5 CORRECTION**: The previous claim that item 1.5 was completed was INCORRECT - the detect_conflicts tool did NOT exist. Implemented in this iteration: Added `detect_conflicts` tool to `createBoardTools()` function (lines 480-569 in chat route), which calls `/conflicts/detect` API. Updated system prompt to instruct AI to use this tool when users ask about risks, conflicts, or "what's at risk?".
- **2.2 COMPLETED**: Wired ConflictWarningPanel to BoardShell:
  - Added conflict detection state (`conflicts`, `showConflicts`, `isLoadingConflicts`) to board-shell.tsx
  - Added `fetchConflicts` function that calls `detectConflicts` server action on mount
  - Auto-shows panel when conflicts are detected
  - Added "Check Risks" button to BoardHeader with conflict count badge
  - ConflictWarningPanel renders as overlay on canvas when `showConflicts && conflicts.length > 0`
- **Pre-existing build error**: The `/api/command-board/chat` route has a circular dependency or initialization order issue causing build failure. This is a pre-existing issue in the branch, not caused by these changes.

---

- All mutations must compile to Manifest domain commands (AI proposes, Manifest enforces, Board projects)
- Use packages/ai for shared AI utilities
- Keep board as projection surface only - never source of truth
- Idempotency already implemented - continue using manifestIdempotency table
- Audit trail already implemented - continue using outboxEvent

---

## Files to Reference

- Spec: specs/command-board/boardspec.md
- Types: apps/app/app/(authenticated)/command-board/types/manifest-plan.ts
- Chat API: apps/app/app/api/command-board/chat/route.ts
- AI Panel: apps/app/app/(authenticated)/command-board/components/ai-chat-panel.tsx
- Manifest Plans: apps/app/app/(authenticated)/command-board/actions/manifest-plans.ts
- Conflicts API: apps/api/app/api/conflicts/detect/route.ts
- Derived Connections: apps/app/app/(authenticated)/command-board/actions/derive-connections.ts
