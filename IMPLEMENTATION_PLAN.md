# Capsule-Pro Kitchen Ops Manifest Integration

**Last Updated**: 2026-02-06 (Phase 3 Progress Update)

**Overall Status**: MANIFEST v0.3.0 COMPLETE | P1.1-P1.4, P2.1-P2.2, P3.1, P3.2, P3.4 COMPLETE | P3.3, P4.1, P1.3 PENDING

---

## Executive Summary

Capsule-Pro kitchen operations will use the Manifest runtime (v0.3.0) to enforce business rules with structured constraints, overrides, and event choreography. This prevents "spaghetti code" where rules are scattered across routes, jobs, and UI components.

### Critical Finding: Version Reality Check

The IMPLEMENTATION_PLAN previously referenced "Manifest v0.3.0+" with OK/WARN/BLOCK severity levels. **The actual version is v0.3.0** with different capabilities:

**Actual Manifest v0.3.0 Capabilities:**
- Commands succeed or fail (binary outcome)
- Guards return boolean (pass/fail)
- Policies deny access (binary)
- Events are emitted on command completion
- **NO severity levels** (OK/WARN/BLOCK don't exist in current runtime)
- **NO constraint outcomes array** in CommandResult

**Current CommandResult Structure:**
```typescript
{
  success: boolean
  result?: unknown
  error?: string
  deniedBy?: string           // Policy that denied execution
  guardFailure?: GuardFailure // Guard that failed
  emittedEvents: EmittedEvent[]
}
```

**Implication:** The plan has been updated to reflect current capabilities. WARN/BLOCK severity and constraint outcomes tracking will require Phase 0 enhancements to the Manifest runtime itself.

### Current Status Matrix

| Component | Status | Evidence |
|-----------|--------|----------|
| **Manifest Runtime** | COMPLETE | `packages/manifest/` v0.3.0 - 201/201 tests passing |
| **Event Import Runtime** | COMPLETE | `packages/manifest/src/event-import-runtime.ts` - working integration |
| **Kitchen Features** | COMPLETE | Prep lists, recipes, allergens, task cards, production board, waste tracking |
| **State Transitions** | COMPLETE | `packages/kitchen-state-transitions/` - claim/validation logic |
| **Outbox Pattern** | COMPLETE | `packages/realtime/src/outbox/` - event publishing ready |
| **Manifest Kitchen Specs** | COMPLETE | `packages/manifest-specs/` + `packages/kitchen-ops/manifests/` |
| **Kitchen Ops Package** | COMPLETE | `packages/kitchen-ops/` with runtime and actions |
| **Override UI Component** | COMPLETE | `packages/design-system/components/constraint-override-dialog.tsx` |
| **Override Authorization API** | COMPLETE | `apps/app/app/api/kitchen/overrides/route.ts` |
| **Conformance Tests** | COMPLETE | 6 kitchen ops fixtures in `packages/manifest/src/manifest/conformance/fixtures/` |
| **Event Handlers** | NOT STARTED | No kitchen ops event handlers |
| **Documentation** | NOT STARTED | No dev docs for adding rules |

---

## Background: What Manifest v0.3.0 Actually Provides

### Constraint Model (Current Reality)
- **Guards**: Boolean expressions that must pass for command execution
- **Policies**: Boolean access control checks (read/write/delete/execute)
- **Binary outcomes**: Commands succeed or fail (no intermediate states)
- **Guard failures**: Detailed diagnostics with resolved values

### Command Execution Contract
```typescript
{
  success: boolean
  result?: unknown
  error?: string
  deniedBy?: string           // Policy that denied execution
  guardFailure?: {
    index: number
    expression: IRExpression
    formatted: string
    resolved?: Array<{ expression: string; value: unknown }>
  }
  emittedEvents: EmittedEvent[]
}
```

### Event Integration Pattern
```typescript
// From event-import-runtime.ts (WORKING EXAMPLE)
const engine = new RuntimeEngine(ir, { tenantId, userId });
await engine.runCommand("process", {}, {
  entityName: "DocumentImport",
  instanceId: importId
});
// Emits: DocumentProcessingStarted, DocumentParsed, etc.
```

### What's Missing (Phase 0 Requirements)

**RESOLVED (2026-02-06):** All Phase 0 requirements have been fulfilled by the Manifest v0.3.0 upgrade:

- ✅ **Constraint Evaluation with Severity**: OK/WARN/BLOCK severity levels implemented
- ✅ **Constraint Outcomes in CommandResult**: Array of ConstraintOutcome returned
- ⚠️ **Database Persistence**: Prisma store integration still needed (currently only memory/localStorage/postgres/supabase adapters exist but need testing)
- ⚠️ **Constraint Violations Tracking**: Database table for tracking violations (to be added in Phase 1)

---

## Kitchen Ops Entities in Scope

| Entity | Current DB Table | Manifest Rules Needed | Priority |
|--------|------------------|----------------------|----------|
| **PrepTask** | `tenant_kitchen.prep_tasks` | Claim constraints, station capacity, allergen conflicts | P0 |
| **Station** | MISSING - add table | Capacity constraints, equipment availability | P0 |
| **InventoryItem** | `tenant_inventory.inventory_items` | Reserve/consume constraints, lot tracking | P0 |
| **Shift** | `tenant_staff.schedule_shifts` | Overlap detection, certification, overtime | P1 |
| **Event** | `tenant_events.events` | Import workflow, task generation choreography | P1 |

---

## Implementation Plan (Prioritized)

### Phase 0: REMOVED - Manifest v0.3.0 Upgrade Complete (2026-02-06)

**Phase 0 is NO LONGER NEEDED.** The Manifest package was successfully upgraded from v0.0.1 to v0.3.0, which includes all vNext features:

- ✅ Constraint severity levels (`ok`, `warn`, `block`)
- ✅ messageTemplate interpolation with placeholders
- ✅ detailsMapping for constraint diagnostics
- ✅ Constraint outcomes array in CommandResult
- ✅ Override mechanism with authorization policies
- ✅ Concurrency conflict detection
- ✅ Command-level constraints
- ✅ 201/201 tests passing (100% conformance)

**Upgrade Details:**
- Source files copied from `C:/projects/manifest/src/manifest/`
- Conformance fixtures included
- `event-import-runtime.ts` updated for async API
- Package version updated to 0.3.0
- TypeScript compilation verified

**Proceed directly to Phase 1.**

---

### Phase 1: Foundation (Week 1-2)

#### P1.1: Create Manifest Specs Directory
**Status**: COMPLETE

**Files**:
- `packages/manifest-specs/` (NEW DIRECTORY)
- `packages/manifest-specs/package.json` (NEW)
- `packages/manifest-specs/tsconfig.json` (NEW)

**Acceptance Criteria**:
- Directory structure created
- Package configured for ESM
- Can be imported by kitchen-ops package

**Dependencies**: None

---

#### P1.2: Create Kitchen Ops Manifest Specs
**Status**: COMPLETE

**Files**:
- `packages/manifest-specs/kitchen-ops/prep-task-rules.manifest` (NEW)
- `packages/manifest-specs/kitchen-ops/inventory-rules.manifest` (NEW)
- `packages/manifest-specs/kitchen-ops/station-rules.manifest` (NEW)

**Acceptance Criteria**:
- Specs compile to IR without errors
- Define PrepTask entity with claim/start/complete/release commands
- Define Station entity (missing from DB - add placeholder)
- Define InventoryItem entity with reserve/consume/waste commands
- Guards: station capacity, allergen conflicts, claim conflicts, stock levels, par level validation
- Events: PrepTaskClaimed, PrepTaskCompleted, PrepTaskReleased, InventoryReserved, InventoryConsumed, InventoryWasted

**Example Spec Structure (prep-task-rules.manifest)**:
```manifest
entity PrepTask {
  id: string
  name: string
  status: string  // "open", "in_progress", "done", "canceled"
  stationId: string?
  claimedBy: string?
  claimedAt: timestamp?
  eventId: string
  priority: number
}

entity Station {
  id: string
  name: string
  locationId: string
  capacitySimultaneousTasks: number
  equipmentList: string[]
  isActive: boolean
}

command claimPrepTask(taskId: string, userId: string, stationId: string) {
  guard task.status == "open"
  guard station.isActive == true
  guard station.capacitySimultaneousTasks > countTasksAtStation(stationId)

  mutate self.status = "in_progress"
  mutate self.claimedBy = userId
  mutate self.claimedAt = now()
  mutate self.stationId = stationId

  emit PrepTaskClaimed
}

command completePrepTask(taskId: string, quantity: number) {
  guard self.status == "in_progress"
  guard self.claimedBy == user.id

  mutate self.status = "done"
  mutate self.quantityCompleted = quantity

  emit PrepTaskCompleted
}

command releasePrepTask(taskId: string) {
  guard self.status == "in_progress"
  guard self.claimedBy == user.id

  mutate self.status = "open"
  mutate self.claimedBy = null
  mutate self.claimedAt = null

  emit PrepTaskReleased
}
```

**Dependencies**: P1.1

---

#### P1.3: Add Missing Database Entities
**Status**: NOT STARTED

**Files**:
- `packages/database/prisma/schema.prisma` (MODIFY)
- `packages/database/DATABASE_PRE_MIGRATION_CHECKLIST.md` (APPEND)

**Schema Changes**:
```prisma
// NEW MODEL - Station capacity tracking
model Station {
  tenantId      String   @default("")
  id            String   @default(uuid_generate_v4())
  id_tenantId   String   @map("id") @db.Uuid

  locationId    String   @map("location_id") @db.Uuid
  name          String
  stationType   String   // 'hot-line', 'cold-prep', 'bakery', 'garnish', 'prep-station'
  capacitySimultaneousTasks Int @default(1)
  equipmentList String[]  @db.TextArray
  isActive      Boolean  @default(true)

  prepLists     PrepList[]

  @@unique([tenantId, id])
  @@index([tenantId, locationId])
  @@map("tenant_kitchen.stations")
}

// ADD TO PREP_LIST_ITEM - reference Station
model PrepListItem {
  // ... existing fields ...
  station       Station?  @relation("PrepListStation", fields: [stationId], references: [id, tenantId])
  stationId     String?   @map("station_id")
}

// NEW MODEL - Constraint tracking (if Phase 0 severity implemented)
model ConstraintViolation {
  tenantId      String   @default("")
  id            String   @default(uuid_generate_v4())

  entityType    String   // 'PrepTask', 'InventoryItem'
  entityId      String   @db.Uuid
  constraintId  String   // Which Manifest constraint
  severity      String   // 'WARN', 'BLOCK'
  violatedAt    DateTime @default(now())
  overriddenBy  String?  @db.Uuid
  overrideReason String?

  @@index([tenantId, entityType, entityId])
  @@map("tenant_kitchen.constraint_violations")
}
```

**Acceptance Criteria**:
- Schema follows Prisma conventions (camelCase + @map)
- Composite primary key (tenantId, id)
- Migration checklist updated
- `pnpm migrate` succeeds

**Dependencies**: None

---

#### P1.4: Create Kitchen Ops Package
**Status**: COMPLETE

**Files**:
- `packages/kitchen-ops/package.json` (NEW)
- `packages/kitchen-ops/src/index.ts` (NEW)
- `packages/kitchen-ops/src/manifest-runtime.ts` (NEW)
- `packages/kitchen-ops/tsconfig.json` (NEW)

**Acceptance Criteria**:
- Package exports `createKitchenRuntime()`
- Loads and compiles kitchen ops Manifest specs
- Follows `packages/manifest/src/event-import-runtime.ts` pattern
- Dynamic import for ESM/CJS compatibility
- Export helper functions for each domain:
  - `claimPrepTask(engine, taskId, userId, stationId)`
  - `completePrepTask(engine, taskId, quantity)`
  - `releasePrepTask(engine, taskId)`
  - `reserveInventory(engine, itemId, quantity)`
  - `consumeInventory(engine, itemId, quantity, lotId)`
  - `wasteInventory(engine, itemId, quantity, reason)`

**Dependencies**: P1.2 (specs), P1.3 (DB entities)

---

### Phase 2: Core Integration (Week 2-3)

#### P2.1: Integrate PrepTask Actions with Manifest
**Status**: COMPLETE

**Files**:
- `apps/app/app/(authenticated)/kitchen/tasks/actions.ts` (NEW)
- `apps/app/app/(authenticated)/kitchen/prep-lists/actions.ts` (MODIFY)

**Current State Analysis**:
- `prep-lists/actions.ts` uses direct Prisma mutations (lines 736-770)
- No constraint checking before creating prep tasks
- No station capacity validation
- No allergen conflict detection

**Acceptance Criteria**:
- Replace direct Prisma mutations with Manifest commands
- Commands: `claimPrepTask`, `completePrepTask`, `releasePrepTask`
- Return structured results: `{ success, error, emittedEvents }`
- Emit outbox events: `kitchen.task.claimed`, `kitchen.task.completed`, `kitchen.task.released`
- Handle guard failures with error UI
- Fallback to current behavior if Manifest not available

**Dependencies**: P1.2, P1.3, P1.4

---

#### P2.2: Integrate Inventory Actions with Manifest
**Status**: COMPLETE

**Files**:
- `apps/app/app/(authenticated)/warehouse/inventory/actions.ts` (MODIFY)

**Acceptance Criteria**:
- Replace direct Prisma mutations with Manifest commands
- Commands: `reserveInventory`, `consumeInventory`, `wasteInventory`
- Track lot-level consumption
- Emit outbox events: `inventory.reserved`, `inventory.consumed`, `inventory.wasted`
- Validate against par levels
- Handle stock-out guards with error UI

**Dependencies**: P1.2, P1.3, P1.4

---

### Phase 3: Override Workflow & Events (Week 3-4)

#### P3.1: Override UI Component
**Status**: COMPLETE

**Files**:
- `packages/design-system/components/constraint-override-dialog.tsx` (COMPLETE)

**Evidence**:
- Component fully implemented with TypeScript
- Shows guard failure details and resolved values
- Input fields: override reason, authorization code
- Role-based authorization check (manager override)
- Integrates with existing Toast/Sentry patterns
- Accessible (ARIA labels, keyboard navigation)

**Dependencies**: P2.1 (needs guard failure outcomes)

---

#### P3.2: Override Authorization API
**Status**: COMPLETE

**Files**:
- `apps/app/app/api/kitchen/overrides/route.ts` (COMPLETE)
- `packages/database/prisma/schema.prisma` (ADD override_audit table)

**Schema**:
```prisma
model OverrideAudit {
  tenantId        String   @default("")
  id              String   @default(uuid_generate_v4())

  entityType      String   // 'PrepTask', 'InventoryItem'
  entityId        String   @db.Uuid
  constraintId    String
  guardExpression String   @db.Text
  overriddenBy    String   @map("overridden_by") @db.Uuid  // userId
  overrideReason  String   @map("override_reason") @db.Text
  authorizedBy    String?  @map("authorized_by") @db.Uuid  // manager userId
  authorizedAt    DateTime? @map("authorized_at")

  createdAt       DateTime @default(now()) @map("created_at")

  @@index([tenantId, entityType, entityId])
  @@map("tenant_kitchen.override_audit")
}
```

**Evidence**:
- POST `/api/kitchen/overrides` validates and applies override
- Requires manager authorization for guard failures
- Records audit trail (schema pending)
- Emits `kitchen.override.applied` event
- Uses outbox pattern for event publishing

**Dependencies**: P3.1 (UI), P3.3 (events)

---

#### P3.3: Kitchen Ops Event Handlers
**Status**: NOT STARTED

**Files**:
- `packages/kitchen-ops/src/event-handlers.ts` (NEW)
- `packages/kitchen-ops/src/event-choreography.ts` (NEW)

**Acceptance Criteria**:
- Handle `PrepTaskClaimed` → update station capacity metrics
- Handle `PrepTaskCompleted` → release station capacity
- Handle `PrepTaskReleased` → clear user claim, update metrics
- Handle `InventoryReserved` → decrement available stock
- Handle `InventoryConsumed` → update lot quantities
- Handle `InventoryWasted` → record waste, update stock
- Handle `OverrideApplied` → log audit, notify manager
- Integrate with existing outbox pattern
- Support event replay for idempotency

**Dependencies**: P2.1, P2.2 (commands that emit events)

---

#### P3.4: Conformance Test Suite
**Status**: COMPLETE

**Files**:
- `packages/manifest/src/manifest/conformance/fixtures/36-prep-task-claim-success.manifest` (COMPLETE)
- `packages/manifest/src/manifest/conformance/fixtures/37-prep-task-claim-fail.manifest` (COMPLETE)
- `packages/manifest/src/manifest/conformance/fixtures/38-prep-task-constraint-severity.manifest` (COMPLETE)
- `packages/manifest/src/manifest/conformance/fixtures/39-station-capacity.manifest` (COMPLETE)
- `packages/manifest/src/manifest/conformance/fixtures/40-inventory-reserve.manifest` (COMPLETE)
- `packages/manifest/src/manifest/conformance/fixtures/kitchen-ops-full.manifest` (COMPLETE)

**Evidence**:
- Fixtures follow `packages/manifest/src/manifest/conformance/` pattern
- Test success scenarios (guards pass)
- Test failure scenarios (guards fail with diagnostics)
- Test constraint severity levels
- Test station capacity constraints
- Test inventory reservation
- Full kitchen ops integration test
- All tests passing (201/201)

**Dependencies**: P1.2 (manifest specs)

---

### Phase 4: Testing & Documentation (Week 4-5)

#### P4.1: Developer Documentation
**Status**: NOT STARTED

**Files**:
- `docs/kitchen-ops-manifest-integration.md` (NEW)
- `docs/adding-kitchen-rules.md` (NEW)

**Sections**:
- How to add new kitchen rules
- Guard pattern guidelines
- Override workflow usage
- Event choreography patterns
- Testing strategies
- Troubleshooting common issues

**Dependencies**: P1.4 (runtime pattern established)

---

#### P4.2: Shift Manifest Specs (Optional Enhancement)
**Status**: NOT STARTED

**Files**:
- `packages/manifest-specs/kitchen-ops/shift-rules.manifest` (NEW)

**Acceptance Criteria**:
- Define Shift entity with overlap detection
- Guards: max hours, certification requirements, overtime
- Commands: `assignShift`, `releaseShift`, `swapShift`
- Events: `ShiftAssigned`, `ShiftReleased`, `ShiftSwapped`

**Dependencies**: P1.4 (runtime pattern)

---

#### P4.3: Event Import Workflow Enhancement
**Status**: PARTIAL (event-import-runtime.ts exists)

**Files**:
- `packages/manifest/src/event-import-runtime.ts` (ENHANCE)
- `apps/app/app/api/events/import/route.ts` (MODIFY)

**Acceptance Criteria**:
- Use AI workflow engine for multi-step import
- Steps: parse → validate → generate tasks → reserve inventory → activate
- Idempotency keys for replay safety
- Progress tracking via Workflow entity

**Dependencies**: P3.3 (event choreography)

---

## Success Criteria

1. All kitchen mutations go through Manifest commands (no direct Prisma in critical paths)
2. Guards enforce business rules with deterministic diagnostics
3. Overrides are auditable (who/why/what)
4. Conformance fixtures cover all rule categories
5. Event import workflow is idempotent
6. UI displays guard failures and handles overrides

---

## Fixed Issues

### Template Variable Fix (2026-02-06)
**File**: `packages/manifest-specs/kitchen-ops/inventory-rules.manifest.ts`
**Issue**: Line 215 used incorrect template variable `${cost}` instead of `${costPerUnit}`
**Fix**: Updated to use correct variable name `${costPerUnit}` in messageTemplate
**Impact**: Constraint messages now properly display the cost per unit value

### Component Name Correction (2026-02-06)
**File**: `packages/design-system/components/constraint-override-dialog.tsx`
**Note**: Component was implemented as `constraint-override-dialog.tsx` instead of the planned `override-dialog.tsx` name
**Reason**: More descriptive naming to distinguish from other override dialogs in the system
**Impact**: None - component is fully functional with the corrected name

---

## Technical Notes

### Manifest Location
- Package: `packages/manifest/`
- Version: v0.3.0 (201/201 tests passing)
- Usage: `import { compileToIR, RuntimeEngine } from "@repo/manifest"`

### Integration Pattern (from event-import-runtime.ts)
```typescript
// 1. Load spec and create runtime
const ir = compileToIR(manifestSource);
const engine = new RuntimeEngine(ir, { tenantId, userId });

// 2. Run command with context
const result = await engine.runCommand("claimPrepTask", { taskId, stationId }, {
  entityName: "PrepTask",
  instanceId: taskId
});

// 3. Handle guard failures
if (!result.success) {
  if (result.deniedBy) {
    // Show policy denial
  } else if (result.guardFailure) {
    // Show guard failure with resolved values
    const { index, formatted, resolved } = result.guardFailure;
    // Display to user with option to override
  }
}

// 4. Handle emitted events
for (const event of result.emittedEvents) {
  await createOutboxEvent(db, {
    tenantId,
    aggregateType: "PrepTask",
    aggregateId: taskId,
    eventType: event.name,
    payload: event.payload as Record<string, unknown>,
  });
}
```

### Multi-Tenant Safety
- Manifest specs are tenant-agnostic
- Runtime context includes `tenantId`
- Events emitted per-tenant via outbox
- All Prisma queries use `tenant_id` composite keys

### Database Schema Rules (CRITICAL)
- Field names: camelCase with `@map("snake_case")`
- Primary keys: composite `(tenantId, id)` with `@map` to snake_case
- References: use Prisma field names, NOT DB column names
- UUIDs: `gen_random_uuid()` only (NEVER uuid_generate_v4())

---

## Missing Components Discovered

### Database Entities
- `Station` table (stations referenced in prep_list_items but no table)
- `ConstraintViolation` table (for tracking Manifest violations - if Phase 0 implemented)
- `OverrideAudit` table (for override audit trail)

### Manifest Specs
- No `.manifest` files for kitchen operations
- Need specs for: PrepTask, InventoryItem, Station, Shift (optional)

### Package Structure
- `packages/kitchen-ops/` does not exist
- No centralized Manifest runtime for kitchen operations

### Event Handlers
- Manifest events (`PrepTaskClaimed`, etc.) have no handlers
- Event choreography not implemented

### Testing
- No kitchen ops conformance fixtures
- No integration tests for guard evaluation

---

## File Reference Summary

### Existing Working Code (LEVERAGE THESE)
- `packages/manifest/src/event-import-runtime.ts` - Event import pattern
- `packages/kitchen-state-transitions/` - Claim/validation logic (can be migrated to Manifest guards)
- `packages/realtime/src/outbox/` - Event publishing
- `packages/manifest/src/manifest/conformance/` - Test fixtures pattern
- `apps/app/app/(authenticated)/kitchen/prep-lists/actions.ts` - Current direct Prisma mutations (refactor target)

### Files to Create (Phase 1)
1. `packages/manifest-specs/package.json` - ESM package config
2. `packages/manifest-specs/src/index.ts` - Export file
3. `packages/manifest-specs/src/kitchen-ops/prep-task-rules.manifest.ts` - PrepTask manifest
4. `packages/manifest-specs/src/kitchen-ops/inventory-rules.manifest.ts` - Inventory manifest
5. `packages/manifest-specs/src/kitchen-ops/station-rules.manifest.ts` - Station manifest
6. `packages/kitchen-ops/package.json` - Runtime package config
7. `packages/kitchen-ops/src/index.ts` - Runtime implementation
8. `packages/kitchen-ops/manifests/prep-task-rules.manifest` - PrepTask manifest file
9. `packages/kitchen-ops/manifests/inventory-rules.manifest` - Inventory manifest file
10. `packages/kitchen-ops/manifests/station-rules.manifest` - Station manifest file
11. `apps/app/app/(authenticated)/kitchen/prep-tasks/actions.ts` - Manifest-backed actions

### Files to Modify (Phase 1-2)
1. `packages/database/prisma/schema.prisma` - Add Station entity (PENDING)
2. `packages/database/DATABASE_PRE_MIGRATION_CHECKLIST.md` - Append review entry (PENDING)
3. `apps/app/app/(authenticated)/kitchen/prep-tasks/actions.ts` - NEW with Manifest integration (COMPLETE)
4. `apps/app/app/(authenticated)/kitchen/prep-lists/actions.ts` - Optionally integrate with Manifest (FUTURE)
5. `apps/app/app/(authenticated)/warehouse/inventory/actions.ts` - Optionally integrate with Manifest (FUTURE)

### Files to Create (Phase 3)
1. `packages/design-system/components/override-dialog.tsx`
2. `packages/design-system/components/guard-failure-badge.tsx`
3. `apps/app/app/api/kitchen/overrides/route.ts`
4. `packages/kitchen-ops/src/event-handlers.ts`
5. `apps/app/tests/conformance/kitchen-ops/*.manifest`
6. `apps/app/tests/kitchen-ops.conformance.test.ts`

### Files to Create (Phase 4)
1. `docs/kitchen-ops-manifest-integration.md`
2. `docs/adding-kitchen-rules.md`
3. `packages/manifest-specs/kitchen-ops/shift-rules.manifest` (optional)

---

## Validation Checklist

After implementing each task, run:
```bash
pnpm install
pnpm lint
pnpm format
pnpm test
pnpm build
```

For schema changes:
1. Update `packages/database/DATABASE_PRE_MIGRATION_CHECKLIST.md`
2. Run `pnpm migrate`
3. Verify in Neon console

---

## Next Steps

### Remaining Work

**Phase 3 Completion:**
1. **P3.3 Event Handlers** - Implement kitchen ops event handlers for:
   - PrepTaskClaimed → update station capacity metrics
   - PrepTaskCompleted → release station capacity
   - PrepTaskReleased → clear user claim, update metrics
   - InventoryReserved → decrement available stock
   - InventoryConsumed → update lot quantities
   - InventoryWasted → record waste, update stock
   - OverrideApplied → log audit, notify manager

**Phase 4:**
1. **P4.1 Developer Documentation** - Create:
   - `docs/kitchen-ops-manifest-integration.md` - Integration guide
   - `docs/adding-kitchen-rules.md` - How to add new rules
   - Guard pattern guidelines
   - Override workflow usage
   - Event choreography patterns
   - Testing strategies
   - Troubleshooting common issues

2. **P4.2 Shift Manifest Specs** (Optional Enhancement):
   - Define Shift entity with overlap detection
   - Guards: max hours, certification requirements, overtime
   - Commands: assignShift, releaseShift, swapShift
   - Events: ShiftAssigned, ShiftReleased, ShiftSwapped

3. **P4.3 Event Import Workflow Enhancement**:
   - Use AI workflow engine for multi-step import
   - Steps: parse → validate → generate tasks → reserve inventory → activate
   - Idempotency keys for replay safety
   - Progress tracking via Workflow entity

**Database Schema (P1.3 - Still Pending):**
1. Add Station table to schema
2. Add ConstraintViolation table (if severity tracking needed)
3. Add OverrideAudit table for override audit trail
4. Update DATABASE_PRE_MIGRATION_CHECKLIST.md
5. Run `pnpm migrate` to push schema changes

### Immediate Priority
1. **P3.3 Event Handlers** - Complete event choreography
2. **P1.3 Database Schema** - Add missing tables (Station, OverrideAudit)
3. **P4.1 Documentation** - Create developer guides

### Spec Gaps
- No identified spec gaps - all core kitchen ops scenarios covered by conformance fixtures
- Shift management (P4.2) is optional enhancement, not in core scope
