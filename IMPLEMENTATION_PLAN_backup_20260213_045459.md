# Manifest Migration Implementation Plan

## Executive Summary



**Completed Infrastructure**:
- 6 domain manifests fully implemented (PrepTask, PrepList, Recipe, Menu, Inventory, Station)
- 42 command API routes generated (all POST operations) ✅
- 11 list API routes generated (simple GET queries) ✅
- Runtime engine with PrismaStore integration ✅
- Event-driven architecture with outbox pattern ✅
- 180+ tests passing for constraint validation ✅

**Command Board**: 9/9 features fully implemented (undo/redo, auto-save, real-time sync, visual connectors, bulk operations, user preferences, anchor points, shadow manifest support, integration tests)

**Migration Gap Identified**: Mixed approach between Manifest-generated routes and direct Prisma routes causing:
1. Inconsistent API response formats
2. Duplicate route patterns
3. Direct Prisma writes bypassing constraints
4. Limited test coverage for consistency

---

## Status Summary

### Completed Features

| # | Feature | Status |
| --- | ------- | ------ |
| 1 | Manifest Runtime (6 domains) | COMPLETE |
| 2 | Command API Routes (42 total) | COMPLETE |
| 3 | List API Routes (11 total) | COMPLETE |
| 4 | PrismaStore Integration | COMPLETE |
| 5 | Event-Driven Architecture | COMPLETE |
| 6 | Constraint Validation | COMPLETE |
| 7 | Outbox Pattern Integration | COMPLETE |
| 8 | Command Board (9/9 features) | COMPLETE |
| 9 | Test Coverage (180+ tests) | COMPLETE |

### Pending / Not Started

| Priority | # | Feature | Status |
| -------- | --- | ------- | ------ |
| **P0** | 1 | Standardize API Response Format | NOT STARTED |
| **P0** | 2 | Migrate Kitchen Tasks to Manifest | NOT STARTED |
| **P0** | 3 | Consolidate Recipe/Dish/Menu Routes | NOT STARTED |
| **P1** | 4 | Audit Tenant Isolation | NOT STARTED |
| **P2** | 5 | Create kitchen-ops Package | NOT STARTED |
| **P3** | 6 | Documentation and Developer Guides | NOT STARTED |
| **P3** | 7 | Performance Optimization | NOT STARTED |

---

## Implementation Details (Pending Items)

### P0-CRITICAL: Standardize API Response Format

**Impact**: HIGH - Client code complexity and API inconsistency

**Problem**: Two different response formats exist across kitchen API endpoints:

**Manifest Format** (used by `/manifest/*` routes):
```typescript
{
  success: true | false,
  data?: T,
  error?: string,
  constraintOutcomes?: [{
    constraintName: string,
    passed: boolean,
    severity: "ok" | "warn" | "block",
    message: string,
    overridden: boolean
  }],
  emittedEvents?: [{
    name: string,
    channel: string,
    payload: unknown,
    timestamp: number
  }]
}
```

**Direct Prisma Format** (used by legacy routes):
```typescript
// Format 1: Simple wrapper
{ task: {...} }
{ recipes: [...] }

// Format 2: Data + pagination
{
  data: [...],
  pagination: { page, limit, total, totalPages }
}

// Format 3: Error only
{ message: "..." }
```

**Affected Routes** (estimated 30+ routes):
- `apps/api/app/api/kitchen/recipes/route.ts` - GET (list)
- `apps/api/app/api/kitchen/dishes/route.ts` - GET (list)
- `apps/api/app/api/kitchen/menus/route.ts` - GET (list)
- `apps/api/app/api/kitchen/tasks/route.ts` - GET/POST
- `apps/api/app/api/kitchen/tasks/[id]/route.ts` - PATCH/DELETE
- `apps/api/app/api/kitchen/waste/entries/route.ts` - GET/POST
- All other read/write endpoints

**Solution**:
1. Create `manifestSuccessResponse()` and `manifestErrorResponse()` wrappers
2. Migrate all direct Prisma routes to use Manifest response format
3. Update client-side code to expect unified format
4. Add response format validation tests

**Files to Update**:
- `C:\projects\capsule-pro\apps\api\app\api\kitchen\recipes\route.ts`
- `C:\projects\capsule-pro\apps\api\app\api\kitchen\dishes\route.ts`
- `C:\projects\capsule-pro\apps\api\app\api\kitchen\menus\route.ts`
- `C:\projects\capsule-pro\apps\api\app\api\kitchen\tasks\route.ts`
- `C:\projects\capsule-pro\apps\api\app\api\kitchen\tasks\[id]\route.ts`

**Estimated Effort**: 2-3 days

---

### P0-CRITICAL: Migrate Kitchen Tasks to Manifest

**Impact**: CRITICAL - Missing constraint validation and event emission

**Location**: `apps/api/app/api/kitchen/tasks/**/*.ts`

**Problem**: KitchenTask routes completely bypass Manifest for state updates:
- Direct Prisma writes for PATCH `/api/kitchen/tasks/:id` (status changes)
- Direct Prisma writes for POST `/api/kitchen/tasks` (task creation)
- Direct Prisma writes for POST `/api/kitchen/tasks/:id/release` (release)
- Custom status validation instead of Manifest constraints
- Missing outbox events for real-time updates

**Current State**:
```typescript
// apps/api/app/api/kitchen/tasks/[id]/route.ts
export async function PATCH(request: Request, context: RouteContext) {
  // Direct Prisma update - bypasses Manifest
  const updatedTask = await database.kitchenTask.update({
    where: { tenantId_id: { tenantId, id } },
    data: { ...body, updatedAt: new Date() }
  });
}
```

**Target State**:
```typescript
// Use Manifest runtime for constraint validation
const runtime = await createPrepTaskRuntime({ tenantId, userId });
const result = await runtime.runCommand("updateStatus", body, {
  entityName: "PrepTask",
  instanceId: taskId
});
```

**Issues**:
1. No constraint validation (e.g., can't complete already-done tasks)
2. Missing policy checks
3. No event emission for status changes
4. Inconsistent with PrepTask Manifest behavior
5. Manual status transition validation (should be in Manifest)

**Files to Migrate** (confirmed bypassing Manifest):
- `C:\projects\capsule-pro\apps\api\app\api\kitchen\tasks\[id]\route.ts` - PATCH/DELETE use direct Prisma
- `C:\projects\capsule-pro\apps\api\app\api\kitchen\tasks\[id]\release\route.ts` - Direct Prisma release
- `C:\projects\capsule-pro\apps\api\app\api\kitchen\tasks\route.ts` - GET/POST use direct Prisma

**Already Using Manifest** (no migration needed):
- `C:\projects\capsule-pro\apps\api\app\api\kitchen\tasks\[id]\claim\route.ts` - Uses Manifest runtime correctly ✅
- `C:\projects\capsule-pro\apps\api\app\api\kitchen\prep-tasks\commands\*` - All use Manifest ✅

**Estimated Effort**: 2-3 days

---

### P0-CRITICAL: Consolidate Recipe/Dish/Menu Routes

**Impact**: HIGH - Developer confusion and maintenance burden

**Location**: `apps/api/app/api/kitchen/recipes/**/*.ts`, `apps/api/app/api/kitchen/dishes/**/*.ts`, `apps/api/app/api/kitchen/menus/**/*.ts`

**Problem**: Routes split between Manifest-generated and direct Prisma implementations:

**Current Structure**:
```
apps/api/app/api/kitchen/
├── manifest/
│   ├── recipes/
│   │   ├── route.ts (GET - manifest runtime)
│   │   ├── [recipeId]/
│   │   │   ├── activate/route.ts (POST - manifest)
│   │   │   ├── deactivate/route.ts (POST - manifest)
│   │   │   ├── metadata/route.ts (POST - manifest)
│   │   │   ├── restore/route.ts (POST - manifest)
│   │   │   └── versions/route.ts (POST - manifest)
│   └── dishes/
│       ├── route.ts (GET - manifest runtime)
│       └── [dishId]/
│           └── pricing/route.ts (POST - manifest)
├── recipes/
│   ├── route.ts (GET - direct Prisma)
│   ├── [recipeId]/
│   │   ├── scale/route.ts
│   │   ├── cost/route.ts
│   │   ├── ingredients/route.ts
│   │   └── steps/route.ts
│   └── commands/
│       ├── update/route.ts
│       ├── activate/route.ts
│       ├── deactivate/route.ts
│       └── versions/create/route.ts
└── menus/
    ├── route.ts (GET - direct Prisma)
    └── commands/
        ├── update/route.ts
        ├── activate/route.ts
        └── deactivate/route.ts
```

**Confusion Points**:
1. Some operations in `/manifest/*`, others in `/`
2. Developers don't know which to use
3. Inconsistent patterns (manifest vs commands subdirectory)
4. Frontend must know which endpoint type to call

**Solution**:

**Option A (Recommended)**: Migrate ALL operations to Manifest
1. Move non-manifest GET routes to `/manifest/*` paths
2. Add deprecation headers to old routes
3. Update frontend to use unified `/api/kitchen/manifest/*` endpoints
4. Document manifest route generation pattern

**Option B**: Create unified response wrapper
1. Keep both paths but ensure consistent responses
2. Add deprecation notices to non-manifest routes
3. Gradually migrate frontend

**Estimated Effort**: 2-3 days

---

### P1-HIGH: Audit Tenant Isolation

**Impact**: HIGH - Security risk and data privacy

**Location**: All API routes

**Problem**: Need to verify `tenantId` is consistently used across all routes:
- Some routes may be missing tenant checks
- Direct Prisma queries might not filter by tenant
- Manifest runtime should auto-inject tenant context

**Audit Checklist**:
1. [ ] All routes include `tenantId` in WHERE clauses
2. [ ] All routes verify user belongs to tenant
3. [ ] No cross-tenant data access possible
4. [ ] Manifest runtime auto-injects tenant context
5. [ ] Outbox events include `tenantId`
6. [ ] Real-time channels scoped to tenant

**Files to Audit** (estimated 50+ files):
- All routes in `apps/api/app/api/kitchen/**/*.ts`
- All routes in `apps/api/app/api/inventory/**/*.ts`
- All routes in `apps/api/app/api/prep-task/**/*.ts`

**Solution**:
1. Create tenant isolation test suite
2. Run automated audit tool to find missing tenant checks
3. Add tenant check middleware
4. Document tenant isolation patterns

**Estimated Effort**: 3-4 days

---

### P2-MEDIUM: Create kitchen-ops Package

**Impact**: MEDIUM - Code organization and maintainability

**Location**: `packages/kitchen-ops/` (does not exist)

**Problem**: Kitchen operations spread across multiple packages:
- `manifest-adapters` - Runtime and commands
- `kitchen-state-transitions` - State management
- API routes - Business logic

**Proposed Structure**:
```
packages/kitchen-ops/
├── src/
│   ├── runtime/          # Manifest runtime setup
│   ├── commands/         # Command wrappers
│   ├── constraints/       # Constraint definitions
│   ├── projections/       # Read models/projections
│   ├── events/           # Event handlers
│   └── testing/          # Test utilities
├── manifests/             # Manifest source files
├── package.json
└── README.md
```

**Benefits**:
1. Clear separation of concerns
2. Easier to test kitchen operations
3. Reusable across API and worker processes
4. Single source of truth for kitchen logic

**Migration Path**:
1. Create package structure
2. Move runtime from `manifest-adapters` to `kitchen-ops/runtime`
3. Move commands from `manifest-adapters` to `kitchen-ops/commands`
4. Update imports across codebase
5. Deprecate old `manifest-adapters` exports

**Estimated Effort**: 5-6 days

---

### P3-LOW: Documentation and Developer Guides

**Impact**: LOW - Developer experience

**Location**: `docs/`

**Problem**: Limited documentation for Manifest integration:
- Developers don't know when to use Manifest vs Prisma
- No guide for adding new Manifest commands
- Missing examples of constraint patterns

**Needed Documentation**:
1. **Getting Started Guide**
   - When to use Manifest runtime
   - How to create a new Manifest command
   - Response format expectations

2. **Constraint Patterns**
   - Examples of common constraints
   - How to write guard expressions
   - Severity levels and override patterns

3. **Integration Guide**
   - How to add Manifest to existing routes
   - Migration checklist
   - Testing strategies

4. **API Reference**
   - `manifestSuccessResponse()` / `manifestErrorResponse()`
   - Runtime context setup
   - Command execution patterns

**Solution**:
1. Create `docs/manifest/` directory
2. Write developer guides
3. Add JSDoc examples to key functions
4. Create migration checklist

**Estimated Effort**: 2-3 days

---

### P3-LOW: Performance Optimization

**Impact**: LOW - Performance and scalability

**Location**: `packages/manifest-adapters/`, `apps/api/app/api/kitchen/`

**Potential Issues**:
1. Manifest IR compiled on every cold start
2. Multiple runtime instances created per request
3. PrismaStore provider creates new connections
4. No connection pooling

**Investigation Needed**:
1. Profile runtime creation overhead
2. Check IR compilation performance
3. Review Prisma connection pooling
4. Test concurrent request handling

**Solution**:
1. Benchmark current performance
2. Identify bottlenecks
3. Implement caching where appropriate
4. Add performance monitoring

**Estimated Effort**: 3-4 days

---

## Migration Checklist

### Before Starting Manifest Migration

- [ ] Read `packages/manifest-adapters/src/index.ts` documentation
- [ ] Review existing constraint patterns in manifest files
- [ ] Understand Prisma to Manifest status mapping
- [ ] Set up test environment with tenant isolation
- [ ] Review existing test coverage

### During Migration

- [ ] Create feature branch
- [ ] Write tests first (TDD approach)
- [ ] Use `createManifestRuntime()` for all operations
- [ ] Check constraint outcomes before proceeding
- [ ] Use `manifestSuccessResponse()` / `manifestErrorResponse()` helpers
- [ ] Emit outbox events for all state changes
- [ ] Update tenant_id in all queries
- [ ] Add response format tests
- [ ] Run `pnpm test` before committing

### After Migration

- [ ] All tests passing
- [ ] No direct Prisma writes (except queries)
- [ ] Consistent response formats
- [ ] Tenant isolation verified
- [ ] Documentation updated
- [ ] Performance benchmarks pass
- [ ] Code review completed

---

## Completed Feature Details (Archive)

### Manifest Domains (Complete)

**Location**: `packages/manifest-adapters/src/`

**1. PrepTask Entity** (6 commands)
- `claim`: Assign task to user
- `start`: Mark task as in-progress
- `complete`: Mark task as done
- `release`: User releases task
- `reassign`: Change task assignment
- `updateQuantity`: Update task quantities
- `cancel`: Cancel task
- **Events**: PrepTaskClaimed, PrepTaskStarted, PrepTaskCompleted, PrepTaskReleased, PrepTaskReassigned, PrepTaskQuantityUpdated, PrepTaskCanceled
- **Constraints**: Valid status transitions, positive quantities, valid priorities, not already claimed

**2. Station Entity** (6 commands)
- `assignTask`: Add task to station
- `removeTask`: Remove task from station
- `updateCapacity`: Change station capacity
- `activate`/`deactivate`: Enable/disable station
- `updateEquipment`: Update station equipment
- **Events**: StationTaskAssigned, StationTaskRemoved, StationCapacityUpdated, StationActivated, StationDeactivated, StationEquipmentUpdated
- **Constraints**: Capacity limits, active station check

**3. Inventory Entity** (6 commands)
- `reserve`: Reserve inventory for event
- `consume`: Record inventory usage
- `waste`: Record waste/loss
- `adjust`: Manual quantity adjustment
- `restock`: Add inventory
- `releaseReservation`: Release event reservation
- **Events**: InventoryReserved, InventoryConsumed, InventoryWasted, InventoryAdjusted, InventoryRestocked, InventoryReservationReleased
- **Constraints**: Sufficient stock, par levels, reservation limits

**4. Recipe Entity** (3 commands)
- `update`: Modify recipe details
- `activate`: Enable recipe
- `deactivate`: Disable recipe
- **Events**: RecipeUpdated, RecipeDeactivated, RecipeActivated
- **Constraints**: Valid name, tags, category

**5. RecipeVersion Entity** (1 command)
- `create`: Create new recipe version
- **Events**: RecipeVersionCreated

**6. Dish Entity** (2 commands)
- `updatePricing`: Update dish pricing
- `updateLeadTime`: Update lead time
- **Events**: DishPricingUpdated, DishLeadTimeUpdated

**7. Menu Entity** (3 commands)
- `update`: Modify menu details
- `activate`: Enable menu
- `deactivate`: Disable menu
- **Events**: MenuUpdated, MenuDeactivated, MenuActivated
- **Constraints**: Valid name, guest ranges, pricing

**8. PrepList Entity** (6 commands)
- `update`: Modify prep list
- `updateBatchMultiplier`: Change batch multiplier
- `finalize`: Lock prep list
- `activate`: Enable prep list
- `deactivate`: Disable prep list
- `markCompleted`: Mark as complete
- `cancel`: Cancel prep list
- **Events**: PrepListUpdated, PrepListFinalized, PrepListActivated, PrepListDeactivated, PrepListCompleted, PrepListCancelled
- **Constraints**: Valid status transitions, event date validation

**9. PrepListItem Entity** (5 commands)
- `updateQuantity`: Update item quantity
- `updateStation`: Change item station
- `updatePrepNotes`: Update prep notes
- `markCompleted`: Mark item complete
- `markUncompleted`: Unmark item
- **Events**: PrepListItemUpdated, PrepListItemStationChanged, PrepListItemNotesUpdated, PrepListItemCompleted, PrepListItemUncompleted
- **Constraints**: Valid quantities, station exists

### Command Board Features (Complete)

**Location**: `apps/app/app/(authenticated)/command-board/`, `apps/api/app/api/kitchen/tasks/`

1. **Undo/Redo System** ✓
   - Action history stack with keyboard shortcuts (Ctrl+Z, Ctrl+Shift+Z)
   - File: `command-board-card.tsx`

2. **Auto-Save/Draft Recovery** ✓
   - Automatic saves every 30 seconds with draft persistence
   - File: `command-board-card.tsx`

3. **Real-time Sync** ✓
   - Ably integration for collaborative editing
   - File: `command-board-card.tsx`

4. **Visual Connectors** ✓
   - Drag-and-drop connection creation with SVG rendering
   - File: `command-board-card.tsx`

5. **Bulk Operations** ✓
   - Multi-select with shift+click and batch actions
   - File: `command-board-card.tsx`

6. **User Preferences** ✓
   - Per-user view settings with persistent storage
   - File: `apps/api/app/api/administrative/tasks/[id]/preferences/route.ts`

7. **Anchor Points** ✓
   - Interactive connection nodes with hover states
   - File: `command-board-card.tsx`

8. **Shadow Manifest Support** ✓
   - Claim routes with runtime validation
   - File: `apps/api/app/api/kitchen/tasks/[id]/claim-shadow-manifest/route.ts`

9. **Integration Tests** ✓
   - Full coverage of manifest-generated endpoints
   - Files: `apps/api/__tests__/kitchen/*.test.ts`

### Infrastructure (Complete)

**Runtime Engine** (`packages/manifest-adapters/src/runtime-engine.ts`)
- Command execution with constraint validation
- Event emission
- Override mechanism for constraint bypass
- Concurrency conflict detection

**PrismaStore** (`packages/manifest-adapters/src/prisma-store.ts`)
- Maps Manifest entities to Prisma schema
- Tenant-scoped storage
- Transaction support
- Event emission integration

**API Response Helpers** (`packages/manifest-adapters/src/api-response.ts`)
- Standardized success/error formats
- HTTP status code mapping
- Constraint outcome formatting

**Event-Driven Architecture** (`packages/manifest-adapters/src/index.ts`)
- Outbox pattern for event emission
- 30+ event types defined across domains
- Real-time delivery via Ably
- Event replay and recovery support

---

## Notes

### Response Format Standardization

**Goal**: Single response format across all kitchen endpoints

**Manifest Format** (preferred):
```typescript
{
  success: true | false,
  data?: T,
  error?: string,
  constraintOutcomes?: [{
    constraintName: string,
    passed: boolean,
    severity: "ok" | "warn" | "block",
    message: string,
    overridden: boolean
  }],
  emittedEvents?: [{
    name: string,
    channel: string,
    payload: unknown,
    timestamp: number
  }]
}
```

**Current Direct Format** (needs migration):
```typescript
// Format 1: Simple wrapper
{ task: {...} }
{ recipes: [...] }

// Format 2: Data + pagination
{
  data: [...],
  pagination: { page, limit, total, totalPages }
}

// Format 3: Error only
{ message: "..." }
```

### Status Mapping

**Prisma** → **Manifest**:
```typescript
pending     → "open"
in_progress  → "in_progress"
done         → "done"
completed    → "done"
canceled     → "canceled"
```

### Tenant Isolation Pattern

**Required** for ALL queries:
```typescript
// BAD: Missing tenant filter
database.recipe.findMany({ where: { id: recipeId } })

// GOOD: Always include tenant
database.recipe.findMany({
  where: {
    AND: [
      { tenantId },
      { id: recipeId },
      { deletedAt: null }
    ]
  }
})
```

---

## References

### Key Files

- `packages/manifest-adapters/src/index.ts` - Main runtime exports
- `packages/manifest-adapters/src/runtime-engine.ts` - Runtime execution engine
- `packages/manifest-adapters/src/prisma-store.ts` - Prisma integration
- `packages/manifest-adapters/src/api-response.ts` - Response helpers
- `apps/api/app/api/kitchen/tasks/shared-task-helpers.ts` - Route helpers
- `apps/api/app/api/kitchen/manifest/recipes/route.ts` - Example Manifest route
- `apps/api/app/api/kitchen/recipes/route.ts` - Example direct Prisma route
- `apps/api/__tests__/kitchen/` - Test suite

### Documentation

- `docs/manifest/README.md` - (needs creation)
- `packages/manifest-adapters/src/index.ts` - Inline documentation
- `CLAUDE.md` - Project standards

### Quick Commands

```bash
# Run Manifest integration tests
pnpm test apps/api/__tests__/kitchen/

# Type check Manifest adapters
pnpm --filter @repo/manifest-adapters typecheck

# Build Manifest adapters
pnpm --filter @repo/manifest-adapters build

# Run specific test file
pnpm test apps/api/__tests__/kitchen/manifest-constraints-http.test.ts
```

---

**Last Updated**: 2026-02-13
**Status**: Analysis complete - 7 prioritized tasks identified
**Next Step**: Start with P0-CRITICAL #1 - Standardize API Response Format
