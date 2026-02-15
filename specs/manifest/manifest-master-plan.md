# Capsule-Pro Manifest Master Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement each manifest incrementally.
>
> **Context7 Library:** Use `/angriff36/manifest` for all manifest DSL documentation.
>
> - Entity definitions: `property`, `computed`, `constraint`
> - Commands: `guard`, `mutate`, `emit`
> - Policies: `execute:`, `read:`, `write:`
> - Compilation: `compileToIR()` → IR → generated routes
> - Runtime: `RuntimeEngine.runCommand()` returns `{ success, result, emittedEvents, error?, guardFailure?, policyDenial? }`

**Goal:** Document all manifest files needed to cover Capsule-Pro's domain entities, with priority ordering based on architectural dependencies and business value.

**Architecture:** Each manifest defines entities with properties, computed fields, constraints (block/warn/ok), commands with guards/mutates/emits, policies, and events. Manifests compile to IR and generate route handlers.

**Tech Stack:** Manifest DSL (.manifest files), Prisma, Next.js API routes, Outbox pattern

---

## Verification: How to Test Manifests Work

### Quick Test (Unit)

```bash
cd apps/api && pnpm test -- --run manifest-preptask-runtime.test.ts
```

Tests pass ✓ (542 tests)

### HTTP Integration Test

The API routes are auto-generated. Example endpoint:

```
POST /api/kitchen/inventory/commands/create
POST /api/kitchen/prep-tasks/commands/claim
```

### Manual Verification (if needed)

1. Start dev server: `cd apps/api && pnpm dev`
2. Test create inventory:

```javascript
fetch("http://localhost:2223/api/kitchen/inventory/commands/create", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    itemNumber: "SKU-001",
    name: "Test Item",
    itemType: "ingredient",
    category: "produce",
    baseUnit: "each",
    parLevel: 10,
    reorderPoint: 5,
    reorderQuantity: 20,
    costPerUnit: 1.99,
    supplierId: "00000000-0000-0000-0000-000000000000",
    locationId: "00000000-0000-0000-0000-000000000000",
    allergens: "",
  }),
});
```

---

## Current State (6 Manifests, 12 Entities)

| Manifest File              | Entities                                            | Status      |
| -------------------------- | --------------------------------------------------- | ----------- |
| `menu-rules.manifest`      | Menu, MenuDish                                      | ✅ Complete |
| `prep-list-rules.manifest` | PrepList, PrepListItem                              | ✅ Complete |
| `prep-task-rules.manifest` | PrepTask                                            | ✅ Complete |
| `recipe-rules.manifest`    | Recipe, RecipeVersion, RecipeIngredient, RecipeStep | ✅ Complete |
| `station-rules.manifest`   | Station                                             | ✅ Complete |
| `inventory-rules.manifest` | InventoryItem                                       | ✅ Complete |

---

## Phase 1: Kitchen Operations (Priority: Critical)

These are the core operational entities that power daily kitchen workflows.

### Task 1.1: kitchen-task-rules.manifest

**Files:**

- Create: `packages/manifest-adapters/manifests/kitchen-task-rules.manifest`

**Entities:** KitchenTask, KitchenTaskClaim, KitchenTaskProgress

**Why:** P1-3 in IMPLEMENTATION_PLAN.md identifies 42 routes bypassing Manifest for KitchenTask. This is separate from PrepTask - KitchenTask is a general task system while PrepTask is event-driven prep work.

**Key Features:**

- Task status transitions (open → in_progress → done, etc.)
- Claim/release mechanics
- Priority and complexity scoring
- Tags support
- Progress tracking via KitchenTaskProgress
- Claim history via KitchenTaskClaim

**Commands:**

- create, claim, release, reassign
- updatePriority, updateComplexity
- addTag, removeTag
- complete, cancel

---

### Task 1.2: prep-comment-rules.manifest

**Files:**

- Create: `packages/manifest-adapters/manifests/prep-comment-rules.manifest`

**Entities:** PrepComment

**Why:** Linked to PrepTask but separate concern - comments, resolution workflow, threaded discussions.

**Commands:**

- create, resolve, unresolve, delete

---

### Task 1.3: ingredient-rules.manifest

**Files:**

- Create: `packages/manifest-adapters/manifests/ingredient-rules.manifest`

**Entities:** Ingredient

**Why:** Currently InventoryItem tracks stock, but Ingredient tracks metadata (allergens, shelf life, storage). They work together.

**Commands:**

- create, update, deactivate
- updateAllergens, updateShelfLife

---

### Task 1.4: dish-rules.manifest

**Files:**

- Create: `packages/manifest-adapters/manifests/dish-rules.manifest`

**Entities:** Dish

**Why:** Bridges Recipe to Menu. Has pricing, dietary tags, container requirements.

**Commands:**

- create, update, deactivate
- linkRecipe, unlinkRecipe
- updatePricing

---

### Task 1.5: container-rules.manifest

**Files:**

- Create: `packages/manifest-adapters/manifests/container-rules.manifest`

**Entities:** Container

**Why:** Kitchen equipment/containers for holding prep items.

**Commands:**

- create, update, deactivate

---

### Task 1.6: prep-method-rules.manifest

**Files:**

- Create: `packages/manifest-adapters/manifests/prep-method-rules.manifest`

**Entities:** PrepMethod

**Why:** Defines prep methods (chop, blend, marinate) with duration estimates and certifications.

**Commands:**

- create, update, deactivate

---

## Phase 2: Event & Catering (Priority: High)

### Task 2.1: event-rules.manifest

**Files:**

- Create: `packages/manifest-adapters/manifests/event-rules.manifest`

**Entities:** Event, EventProfitability, EventSummary

**Why:** Central to the entire system - all prep tasks and menus derive from events.

**Key Features:**

- Event lifecycle (draft → confirmed → completed → archived)
- Guest count changes with validation
- Status transitions
- Budget integration
- Profitability calculations

**Commands:**

- create, update, cancel, archive
- updateGuestCount, updateDate, updateLocation
- finalize, unfinalize

---

### Task 2.2: event-report-rules.manifest

**Files:**

- Create: `packages/manifest-adapters/manifests/event-report-rules.manifest`

**Entities:** EventReport

**Why:** Pre-event checklists and post-event reporting.

**Commands:**

- create, submit, approve, complete

---

### Task 2.3: event-budget-rules.manifest

**Files:**

- Create: `packages/manifest-adapters/manifests/event-budget-rules.manifest`

**Entities:** EventBudget, BudgetLineItem

**Why:** Event-specific budget tracking with variance analysis.

**Commands:**

- create, update, finalize
- addLineItem, updateLineItem, removeLineItem

---

### Task 2.4: catering-order-rules.manifest

**Files:**

- Create: `packages/manifest-adapters/manifests/catering-order-rules.manifest`

**Entities:** CateringOrder

**Why:** Customer-facing catering orders linked to events.

**Commands:**

- create, update, confirm, cancel
- updateStatus, addItem, removeItem

---

### Task 2.5: battle-board-rules.manifest

**Files:**

- Create: `packages/manifest-adapters/manifests/battle-board-rules.manifest`

**Entities:** BattleBoard

**Why:** Menu competition/selection board for events.

**Commands:**

- create, addDish, removeDish, vote, finalize

---

## Phase 3: CRM & Sales (Priority: Medium)

### Task 3.1: client-rules.manifest

**Files:**

- Create: `packages/manifest-adapters/manifests/client-rules.manifest`

**Entities:** Client, ClientContact, ClientPreference

**Why:** CRM foundation - all events/proposals link to clients.

**Commands:**

- create, update, merge, archive
- addContact, removeContact
- updatePreference

---

### Task 3.2: lead-rules.manifest

**Files:**

- Create: `packages/manifest-adapters/manifests/lead-rules.manifest`

**Entities:** Lead

**Why:** Lead pipeline management with conversion workflow.

**Commands:**

- create, update, convertToClient, disqualify, archive

---

### Task 3.3: proposal-rules.manifest

**Files:**

- Create: `packages/manifest-adapters/manifests/proposal-rules.manifest`

**Entities:** Proposal, ProposalLineItem

**Why:** Sales proposals with line items, pricing, acceptance workflow.

**Key Features:**

- Draft → Sent → Viewed → Accepted/Rejected
- Line item management
- Pricing calculations with tax/discount
- Validity periods

**Commands:**

- create, update, send, view, accept, reject, withdraw
- addLineItem, updateLineItem, removeLineItem
- applyDiscount, updateTax

---

### Task 3.4: client-interaction-rules.manifest

**Files:**

- Create: `packages/manifest-adapters/manifests/client-interaction-rules.manifest`

**Entities:** ClientInteraction

**Why:** Track all client communications.

**Commands:**

- create, update, complete

---

## Phase 4: Purchasing & Inventory (Priority: Medium)

### Task 4.1: purchase-order-rules.manifest

**Files:**

- Create: `packages/manifest-adapters/manifests/purchase-order-rules.manifest`

**Entities:** PurchaseOrder, PurchaseOrderItem

**Why:** Vendor ordering workflow.

**Key Features:**

- Draft → Submitted → Approved → Ordered → Received
- Line items with quantities and prices
- Approval workflow
- Receiving/inventory integration

**Commands:**

- create, submit, approve, reject, cancel
- addItem, updateItem, removeItem
- markReceived, partialReceive

---

### Task 4.2: shipment-rules.manifest

**Files:**

- Create: `packages/manifest-adapters/manifests/shipment-rules.manifest`

**Entities:** Shipment, ShipmentItem

**Why:** Receiving shipments from purchase orders.

**Key Features:**

- Tracking status
- Item receiving workflow
- Inventory integration

**Commands:**

- create, update, receive, cancel

---

### Task 4.3: inventory-transaction-rules.manifest

**Files:**

- Create: `packages/manifest-adapters/manifests/inventory-transaction-rules.manifest`

**Entities:** InventoryTransaction

**Why:** Audit trail for all inventory movements.

**Commands:**

- create (all transactions are immutable log entries)

---

### Task 4.4: inventory-supplier-rules.manifest

**Files:**

- Create: `packages/manifest-adapters/manifests/inventory-supplier-rules.manifest`

**Entities:** InventorySupplier

**Why:** Vendor management for inventory.

**Commands:**

- create, update, deactivate

---

### Task 4.5: cycle-count-rules.manifest

**Files:**

- Create: `packages/manifest-adapters/manifests/cycle-count-rules.manifest`

**Entities:** CycleCountSession, CycleCountRecord, VarianceReport

**Why:** Physical inventory verification.

**Commands:**

- createSession, startCount, submitCount, approveVariance
- addRecord, updateRecord

---

## Phase 5: Staff & Scheduling (Priority: Medium)

### Task 5.1: user-rules.manifest

**Files:**

- Create: `packages/manifest-adapters/manifests/user-rules.manifest`

**Entities:** User

**Why:** Staff management with roles and employment details.

**Commands:**

- create, update, deactivate, terminate
- updateRole, updateEmploymentType

---

### Task 5.2: schedule-rules.manifest

**Files:**

- Create: `packages/manifest-adapters/manifests/schedule-rules.manifest`

**Entities:** Schedule, ScheduleShift

**Why:** Staff scheduling.

**Commands:**

- create, update, publish, close
- addShift, updateShift, removeShift

---

### Task 5.3: time-entry-rules.manifest

**Files:**

- Create: `packages/manifest-adapters/manifests/time-entry-rules.manifest`

**Entities:** TimeEntry, TimecardEditRequest

**Why:** Time tracking and approval.

**Commands:**

- clockIn, clockOut, addEntry
- requestEdit, approveEdit, rejectEdit

---

## Phase 6: Command Board (Priority: Medium)

### Task 6.1: command-board-rules.manifest

**Files:**

- Create: `packages/manifest-adapters/manifests/command-board-rules.manifest`

**Entities:** CommandBoard, CommandBoardCard, CommandBoardLayout, CommandBoardGroup, CommandBoardConnection

**Why:** You have 9 complete features in Command Board - making this manifest-driven ensures consistency with the rest of the domain.

**Key Features:**

- Board CRUD
- Card management (create, move, resize, connect)
- Grouping and layout
- Connection/dependency tracking
- Undo/redo (via event replay)

**Commands:**

- createBoard, updateBoard, deleteBoard
- createCard, moveCard, resizeCard, deleteCard
- createGroup, updateGroup
- createConnection, deleteConnection

---

## Phase 7: Workflows & Notifications (Priority: Lower)

### Task 7.1: workflow-rules.manifest

**Files:**

- Create: `packages/manifest-adapters/manifests/workflow-rules.manifest`

**Entities:** Workflow

**Why:** General workflow definition (different from Manifest's workflow DSL - this is app-level workflow tracking).

**Commands:**

- create, update, activate, deactivate
- addStep, completeStep

---

### Task 7.2: notification-rules.manifest

**Files:**

- Create: `packages/manifest-adapters/manifests/notification-rules.manifest`

**Entities:** Notification

**Why:** User notification delivery and tracking.

**Commands:**

- create, markRead, markDismissed, delete

---

## Phase 8: Advanced/vNext (Priority: Future)

These require Manifest vNext features like workflow DSL, effects, and saga patterns.

### Task 8.1: event-processing-workflow.manifest

**Files:**

- Create: `packages/manifest-adapters/manifests/event-processing-workflow.manifest`

**Description:** Multi-step workflow for event processing

```manifest
workflow ProcessEventDocument {
  step ParseDocument effect ai
  step CreatePrepTasks command
  step AllocateStations command
  step AdjustInventory command
  step NotifyKitchen effect external
}
```

**Requires:** Manifest vNext workflow/step/effect syntax

---

### Task 8.2: purchasing-workflow.manifest

**Files:**

- Create: `packages/manifest-adapters/manifests/purchasing-workflow.manifest`

**Description:** PO → Shipment → Receiving → Inventory workflow

```manifest
workflow ReceivingWorkflow {
  step CreateShipment command
  step ReceiveShipment command
  step UpdateInventory command
  step CompletePO command

  compensate UpdateInventory with ReverseInventory
}
```

**Requires:** Saga/compensation semantics

---

### Task 8.3: ai-effects.manifest

**Files:**

- Create: `packages/manifest-adapters/manifests/ai-effects.manifest`

**Description:** AI capability definitions with confidence gating

```manifest
effect ParseEventPDF {
  input: documentId
  output: EventExtraction
  confidenceThreshold: 0.8
  onLowConfidence: warn
}

effect GeneratePrepSuggestion {
  input: eventId
  output: PrepSuggestion
  requiresApproval: true
}
```

**Requires:** Manifest vNext effect typing

---

## Summary

| Phase | Manifests | Entities | Priority |
| ----- | --------- | -------- | -------- |
| 1     | 6         | 8        | Critical |
| 2     | 5         | 8        | High     |
| 3     | 4         | 7        | Medium   |
| 4     | 5         | 9        | Medium   |
| 5     | 3         | 5        | Medium   |
| 6     | 1         | 5        | Medium   |
| 7     | 2         | 2        | Lower    |
| 8     | 3         | Future   | Future   |

**Total: 29 new manifest files covering ~46 entities**

---

## Dependencies

- Phase 1: No dependencies (foundational)
- Phase 2: Depends on Phase 1 (events reference tasks)
- Phase 3: Independent
- Phase 4: Depends on Phase 1 (inventory)
- Phase 5: Independent
- Phase 6: Independent
- Phase 7: Independent
- Phase 8: Depends on Manifest vNext implementation

---

## Next Steps

1. Execute Phase 1 manifests first (kitchen-task is highest ROI)
2. Each manifest follows the same pattern as existing manifests
3. Generate routes, stores, and tests for each
4. Migrate existing bypassed routes to use new manifests
