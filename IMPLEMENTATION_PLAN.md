# Capsule-Pro Implementation Plan

**Last Updated**: 2026-02-13
**Build Status**: ✅ PASSING (21/21 tasks)
**Test Status**: ✅ 540 passing, 0 failures
**Latest Tag**: v0.3.0
**Current Branch**: manifest-.3

---

## Executive Summary

### What's Complete
- **Command Board**: 9/9 features (undo/redo, conflict resolution, event replay, interactive anchors, bulk edit)
- **Manifest Core**: 6 entity definitions + runtime + 53 generated routes (42 commands + 11 queries)
- **Kitchen API**: 101 route handlers (59 Manifest runtime, 41 direct Prisma)
- **Database**: Multi-tenant schema with full kitchen ops support
- **Runtime**: Constraint evaluation (block/warn/ok), event emission via outbox + Ably
- **Tests**: 540 passing, 0 failures, 180+ manifest-specific tests
- **Sentry Migration**: ✅ 125 files migrated, 0 console.error/warn/log remaining in kitchen module

### What Needs Work

**Critical Path** (Updated 2026-02-13 based on deep analysis):
1. **P0**: Manifest doc cleanup (3 duplicate files + 3 test result files cluttering docs)
2. **P0**: API Response Format Standardization (5 formats found causing frontend issues)
3. **P0**: Route Deduplication (duplicate endpoints confuse developers)
4. **P1**: Missing Manifest Commands (MenuDish add/remove/reorder events exist but no commands)
5. **P1**: Import Path Migration (12 files using deprecated `@/lib/manifest-response`)
6. **P1**: Migrate legacy task/prep-list routes to Manifest (41 routes bypassing constraints)
7. **P1**: Wire telemetry hooks to Sentry (hooks defined but not connected)
8. **P2**: Feature specs (44 specs in TODO status across 10 categories)

---

## Status Summary

### Completed Features ✅

| Category | Feature | Status | Notes |
|----------|---------|--------|-------|
| **Command Board** | All 9 Features | ✅ COMPLETE | Undo/redo, auto-save, realtime, visual connectors, bulk ops, preferences, anchors |
| **Manifest Core** | 6 Entity Definitions | ✅ COMPLETE | PrepTask, Station, Inventory, Recipe, Menu, PrepList |
| **Manifest Core** | Runtime & Factories | ✅ COMPLETE | RuntimeEngine, adapters, projection system |
| **Manifest Core** | Prisma Store Layer | ✅ COMPLETE | All 6 entity stores with tenant scoping |
| **Manifest Core** | Command API Routes | ✅ COMPLETE | 42 POST routes generated |
| **Manifest Core** | List Query Routes | ✅ COMPLETE | 11 GET routes generated |
| **Kitchen API** | 106 Route Handlers | ✅ COMPLETE | Full CRUD + command handlers |
| **Database** | Schema & Migrations | ✅ COMPLETE | Multi-tenant with kitchen ops support |
| **Runtime** | Constraint Evaluation | ✅ COMPLETE | Block/warn/ok severity with diagnostics |
| **Runtime** | Event Emission | ✅ COMPLETE | Outbox pattern with Ably integration |

### Pending Features

#### P0 - Critical (Immediate Action Required)

| # | Feature | Status | Priority Rationale |
|---|---------|--------|-------------------|
| P0-1 | **Console → Sentry Migration** | ✅ COMPLETE | 125 files migrated, 0 console.error/warn/log remaining in kitchen module |
| P0-2 | **Manifest Doc Cleanup** | NOT STARTED | 3 duplicate files + 3 test result files cluttering docs |
| P0-3 | **API Response Format Standardization** | NOT STARTED | 5 different formats found causing frontend integration issues |
| P0-4 | **Route Deduplication Strategy** | NOT STARTED | Duplicate endpoints (3 dish routes, 2 recipe activation routes) |
| P0-5 | Manifest HTTP Verification | NOT STARTED | No HTTP-level testing with real auth/tenant/DB |

#### P1 - High (Manifest Completeness)

| # | Feature | Status | Priority Rationale |
|---|---------|--------|-------------------|
| P1-1 | **Missing Manifest Commands** | NOT STARTED | MenuDish add/remove/reorder events exist but no commands |
| P1-2 | **Import Path Migration** | NOT STARTED | 12 files using deprecated `@/lib/manifest-response` |
| P1-3 | **Migrate Legacy Task Routes** | NOT STARTED | Direct Prisma writes bypass Manifest constraints |
| P1-4 | **Migrate Legacy PrepList Routes** | NOT STARTED | Direct Prisma writes bypass Manifest constraints |
| P1-5 | **Wire Telemetry Hooks to Sentry** | NOT STARTED | Hooks defined in runtime but not connected to Sentry |
| P1-6 | Kitchen Ops Rules & Overrides | NOT STARTED | Missing override workflow + audit events |
| P1-7 | Multi-Entity Runtime | NOT STARTED | Runtime loads only PrepTask IR |
| P1-8 | Type Generation from IR | NOT STARTED | Manual types cause drift from manifest |
| P1-9 | Manifest CLI Directory Cleanup | NOT STARTED | Duplicate routes in `/manifest/` vs `/commands/` |

#### P2 - Medium (Feature Specs)

| # | Feature | Status | Spec Location |
|---|---------|--------|---------------|
| P2-1 | CRM Client Detail View | NOT STARTED | `specs/crm-client-detail-view_TODO` |
| P2-2 | Scheduling Shift CRUD | NOT STARTED | `specs/scheduling-shift-crud_TODO` |
| P2-3 | Inventory Item Management | NOT STARTED | `specs/inventory-item-management_TODO` |
| P2-4 | Event Budget Tracking | NOT STARTED | `specs/event-budget-tracking_TODO` |
| P2-5 | Command Board: Entity Cards | NOT STARTED | `specs/command-board-entity-cards_TODO` |
| P2-6 | Command Board: Persistence | NOT STARTED | `specs/command-board-persistence_TODO` |
| P2-7 | Command Board: Realtime Sync | NOT STARTED | `specs/command-board-realtime-sync_TODO` |
| P2-8 | Command Board: Relationship Lines | NOT STARTED | `specs/command-board-relationship-lines_TODO` |

#### P3 - Lower (AI, Integrations, Mobile, Payroll, Warehouse)

| Category | Features | Status | Spec Folder |
|----------|----------|--------|-------------|
| **AI** | 4 features | NOT STARTED | `specs/ai-*` |
| **Communication** | 3 features | NOT STARTED | `specs/email-*`, `specs/sms-*` |
| **Integrations** | 4 features | NOT STARTED | `specs/*-integration*` |
| **Mobile** | 3 features | NOT STARTED | `specs/mobile-*` |
| **Payroll** | 3 features | NOT STARTED | `specs/payroll-*` |
| **Warehouse** | 3 features | NOT STARTED | `specs/warehouse-*` |

---

## Implementation Details

See full details for each P0-P1 task in sections below, including:
- **P0-1**: API Response Format Standardization (5 formats → unified format)
- **P0-2**: Route Deduplication Strategy (deprecate duplicates, update frontend)
- **P0-3**: Commit uncommitted work (recipes, tasks routes, task-card, next.config, manifest scripts)
- **P0-4**: Sentry verification (confirm consoleLoggingIntegration is working in dashboard)
- **P0-5**: Manifest documentation cleanup (archive test results, resolve duplicate pattern files)
- **P0-6**: Manifest HTTP verification (test harness, all PrepTask commands, additional entity, CI snapshots)
- **P1-1**: Migrate Legacy Task Routes (direct Prisma → Manifest runtime)
- **P1-2**: Migrate Legacy PrepList Routes (direct Prisma → Manifest runtime)
- **P1-3**: Wire Telemetry Hooks to Sentry (onConstraintEvaluated, onOverrideApplied, onCommandExecuted)
- **P1-4**: Kitchen ops rules & overrides (severity model, override workflow, audit events)
- **P1-5**: Multi-entity runtime (registry pattern, cross-entity constraints, all 6 entities)
- **P1-6**: Type generation from IR (CLI command, generated types package, route updates)
- **P1-7**: Manifest CLI directory cleanup (audit manifest/ vs commands/, migrate frontend, remove duplicates)

### P0-1: Console → Sentry Migration ✅ COMPLETE

**Impact**: HIGH - Proper observability foundation for production

**Status**: ✅ Complete
- 125 files migrated from console.error/warn/log to Sentry.captureException and structured logging
- Kitchen module: 0 console statements remaining
- All route handlers now use Sentry for error tracking and telemetry
- Comprehensive test coverage maintained

### P0-3: API Response Format Standardization

**Impact**: HIGH - 5 different formats cause frontend integration issues

**Problem**: Five different response formats exist across kitchen API endpoints:

| Format | Structure | Used By |
|--------|-----------|---------|
| A (Legacy) | `{ data: [...], pagination: {...} }` | recipes/, dishes/, prep-lists/, stations/, menus/ |
| B (Manifest) | `{ success: true, result: {...}, events: [...] }` | /manifest/* routes, /commands/* routes |
| C (Simple) | `{ entities: [...] }` | /dish/list/, /recipe/list/, etc. |
| D (Custom) | `{ tasks: [...], userId: "..." }` | tasks/, tasks/available/ |
| E (Error) | `{ success: false, message: "..." }` | Various error responses |

**Target Unified Format**:
```typescript
// Success (single entity or command result)
{ success: true, data: T, constraintOutcomes?: ApiConstraintOutcome[], emittedEvents?: EmittedEvent[] }

// Success (list with optional pagination)
{ success: true, data: T[], pagination?: { page, limit, total, totalPages } }

// Error
{ success: false, message: string, errorCode?: string, constraintOutcomes?: ApiConstraintOutcome[] }
```

**Estimated Effort**: 3 days

### P0-2: Manifest Documentation Cleanup

**Impact**: MEDIUM - Improves developer experience and documentation clarity

**Problem**: Duplicate files and stale test results cluttering documentation

**Duplicate Files to Resolve**:

| File | Location 1 | Location 2 | Action |
|------|------------|------------|--------|
| `embedded-runtime-pattern.md` | `docs/manifest/` (12KB - Capsule-Pro specific) | `docs/manifest-official/patterns/` (3KB stub) | Keep docs/manifest/, update official symlink |
| `implementing-custom-stores.md` | `docs/manifest/` (7KB) | `docs/manifest-official/patterns/` (2KB stub) | Same as above |
| `transactional-outbox-pattern.md` | `docs/manifest/` (13KB) | `docs/manifest-official/patterns/` (2KB stub) | Same as above |

**Test Result Files to Archive** (move to `docs/manifest/archive/`):
- `PROJECTION_TEST_FINAL_RESULTS.md`
- `PROJECTION_SNAPSHOT_TEST_RESULTS.md`
- `MANIFEST_INTEGRATION_TEST_SUMMARY.md`

**Estimated Effort**: 1 day

### P0-4: Route Deduplication Strategy

**Impact**: HIGH - Duplicate endpoints confuse developers

**Problem**: Multiple routes exist for same operations:

| Operation | Duplicate Endpoints | Action |
|-----------|---------------------|--------|
| Recipe Activate | `/recipes/commands/activate` AND `/manifest/recipes/[id]/activate` | KEEP commands/, DEPRECATE manifest/ |
| Recipe Deactivate | `/recipes/commands/deactivate` AND `/manifest/recipes/[id]/deactivate` | KEEP commands/, DEPRECATE manifest/ |
| Dish List | `/dishes` AND `/dish/list` AND `/manifest/dishes` | KEEP /dishes, REMOVE /dish/list |
| Recipe List | `/recipes` AND `/recipe/list` AND `/manifest/recipes` | KEEP /recipes, REMOVE /recipe/list |
| PrepList List | `/prep-lists` AND `/manifest/prep-lists` | KEEP /prep-lists |

**Estimated Effort**: 2 days

### P1-1: Migrate Legacy Task Routes

**Files to Migrate**:
- `apps/api/app/api/kitchen/tasks/[id]/route.ts` (PATCH)
- `apps/api/app/api/kitchen/tasks/[id]/release/route.ts`
- `apps/api/app/api/kitchen/tasks/route.ts` (POST)
- `apps/api/app/api/kitchen/tasks/[id]/claim/route.ts`

**Current**: Direct Prisma updates bypass Manifest constraints
**Target**: Use `createPrepTaskRuntime()` + `runCommand()`

**Estimated Effort**: 3 days

### P1-2: Migrate Legacy PrepList Routes

**Files to Migrate**:
- `apps/api/app/api/kitchen/prep-lists/route.ts` (POST)
- `apps/api/app/api/kitchen/prep-lists/[id]/route.ts` (PATCH)
- `apps/api/app/api/kitchen/prep-lists/items/[id]/route.ts`

**Estimated Effort**: 2 days

### P1-3: Wire Telemetry Hooks to Sentry

**Location**: `packages/manifest-adapters/src/manifest-runtime.ts`

**Problem**: Telemetry hooks defined but not connected to Sentry

**Solution**:
```typescript
telemetry: {
  onConstraintEvaluated: (outcome, commandName, entityName) => {
    if (outcome.severity !== 'ok') {
      Sentry.metrics.increment('manifest.constraint.evaluated', 1, {
        tags: { severity: outcome.severity, passed: String(outcome.passed) }
      });
    }
  },
  onOverrideApplied: (constraint, overrideReq, outcome, commandName) => {
    Sentry.metrics.increment('manifest.override.applied', 1, {
      tags: { constraintCode: constraint.code, command: commandName }
    });
  }
}
```

**Estimated Effort**: 1 day


---

## Validation Commands

```bash
pnpm install       # Install deps
pnpm lint          # Biome linting
pnpm format        # Biome formatting
pnpm test          # 540 passing, 0 failures
pnpm build         # 21/21 tasks passing
pnpm boundaries    # Architecture check
pnpm migrate       # Prisma format + migrate
```

---

## Dependencies Graph

```
P0-2 (Doc Cleanup) ─────> Independent
                                     │
P0-3 (Response Format) ─┬─> P1-1 (Task Routes) ─┬─> P1-5 (Multi-Entity)
                        │                        │
P0-4 (Deduplication) ───┘                        │
                                                 │
P0-1 (Sentry) ✅ ──────> P1-3 (Telemetry) ──────┘
```

---

## Effort Summary

| Priority | Total Effort | Tasks | Complete |
|----------|--------------|-------|----------|
| P0 | 7+ days | 5 tasks | 1/5 ✅ |
| P1 | 11+ days | 7 tasks | 0/7 |
| P2 | Varies | 8 feature specs | 0/8 |
| **Total** | **18+ days** | **20 tasks** | **1/20** |

---

## Recommended Execution Order

1. **Week 1**: ✅ P0-1 (Sentry Migration) + P0-2 (Doc Cleanup) + P0-3 (Response Format)
2. **Week 2**: P0-4 (Deduplication) + P0-5 (HTTP Verification) + P1-3 (Telemetry)
3. **Week 3**: P1-1 (Task Routes) + P1-2 (PrepList Routes)
4. **Week 4**: P1-4 (Kitchen Ops Rules) + P1-5 (Multi-Entity)
5. **Week 5+**: P2 feature specs

---

## Next Steps

1. P0-2: Manifest Doc Cleanup (archive test results, resolve duplicate pattern files)
2. P0-3: API Response Format Standardization (pick target format, create helpers, migrate routes)
3. P0-4: Route Deduplication (deprecate duplicates, update frontend)
4. P0-5: Manifest HTTP Verification (test harness, all PrepTask commands, CI snapshots)
5. P1-1: Migrate Legacy Task Routes to Manifest

---

## Detailed Route Inventory (2026-02-13 Analysis)

### API Routes by Implementation Pattern

**Total Kitchen API Routes**: 97+ files in `apps/api/app/api/kitchen/`

| Pattern | Count | Description |
|---------|-------|-------------|
| Manifest-aware | 57 | Uses `manifestSuccessResponse`/`manifestErrorResponse` |
| Direct Prisma | 40 | Uses `NextResponse.json({ message/error: ... })` |
| Command routes (`/commands/`) | 41 | Auto-generated, uses Manifest runtime |
| List routes (`/list/`) | 11 | Simple GET queries |
| Manifest routes (`/manifest/`) | 11 | Full Manifest runtime integration |

### Response Format Patterns (Inconsistency)

**Error Formats Found**:
1. `manifestErrorResponse("message", statusCode)` - Manifest standard
2. `NextResponse.json({ message: "..." })` - Direct pattern
3. `NextResponse.json({ error: "..." })` - Alternative direct
4. `NextResponse.json({ success: false, message: "..." })` - Hybrid

**Success Formats Found**:
1. `manifestSuccessResponse({ data })` - Manifest standard
2. `NextResponse.json({ data, pagination })` - Paginated list
3. `NextResponse.json({ entity: [...] })` - Entity wrapper
4. `NextResponse.json(rawData)` - No wrapper

### Import Path Inconsistencies

**Two competing styles exist**:

```typescript
// Style 1: App-relative (deprecated)
import { database } from "@/lib/database";
import { manifestSuccessResponse } from "@/lib/manifest-response";
import { createManifestRuntime } from "@/lib/manifest-runtime";

// Style 2: Monorepo package (preferred)
import { database } from "@repo/database";
import { wasteInventory } from "@repo/manifest-adapters";
```

**Action Required**: Standardize all routes to use `@repo/*` imports

---

## Manifest Definition Gaps

### Missing Commands

| Entity | Create Command | Delete Command |
|--------|---------------|----------------|
| PrepTask | ❌ Missing | ❌ Missing (has cancel) |
| Station | ❌ Missing | ❌ Missing |
| InventoryItem | ❌ Missing | ❌ Missing |
| Recipe | ❌ Missing | ❌ Missing |
| Menu | ❌ Missing | ❌ Missing |
| PrepList | ❌ Missing | ❌ Missing |
| PrepListItem | ❌ Missing | ❌ Missing |
| RecipeVersion | ✅ Has create | ❌ Missing |
| Ingredient | ❌ Missing | ❌ Missing |
| RecipeIngredient | ❌ Missing | ❌ Missing |
| Dish | ❌ Missing | ❌ Missing |
| MenuDish | ❌ Missing | ❌ Missing |

### Orphan Events (No Command Emits Them)

- `MenuDishAdded` - needs `addDish` command
- `MenuDishRemoved` - needs `removeDish` command
- `MenuDishesReordered` - needs `reorderDishes` command
- `RecipeVersionRestored` - has route but no manifest command
- `PrepListItemCreated` - needs `create` command

### Status Pattern Inconsistency

| Entity | Status Field | Values |
|--------|-------------|--------|
| PrepList | `status` | draft, finalized, completed, cancelled |
| PrepTask | `status` | open, in_progress, done, canceled |
| Recipe | `isActive` | boolean |
| Station | `isActive` | boolean |
| Menu | `isActive` | boolean |
| InventoryItem | `isActive` | boolean |

**Note**: "canceled" vs "cancelled" spelling inconsistency

---

## Routes Bypassing Manifest (Need Migration)

### Critical: Direct Prisma Without Constraints

| Route File | Operation | Issue |
|-----------|-----------|-------|
| `tasks/route.ts` | POST | Creates KitchenTask directly |
| `tasks/[id]/route.ts` | PATCH | Updates with only status validation |
| `prep-lists/route.ts` | POST | Creates PrepList + items directly |
| `allergens/detect-conflicts/route.ts` | POST | Creates warnings directly |
| All `/list/` routes | GET | No validation, direct queries |

### Hybrid: Manifest Validation + Direct Prisma

| Route File | Pattern |
|-----------|---------|
| `tasks/[id]/claim/route.ts` | Uses `claimPrepTask`, then syncs to Prisma |
| `waste/entries/route.ts` | Uses `wasteInventory` for validation, then Prisma transaction |
| `manifest/dishes/route.ts` | Creates in Manifest, then persists separately |

---

## Key Files for Migration

### Manifest Core
- `packages/manifest-adapters/src/index.ts` - Runtime factories
- `packages/manifest-adapters/src/prisma-store.ts` - All entity stores
- `packages/manifest-adapters/src/ir-contract.ts` - Command ownership mappings
- `packages/manifest-adapters/src/route-helpers.ts` - Response helpers

### Manifest Definitions
- `packages/manifest-adapters/manifests/prep-task-rules.manifest`
- `packages/manifest-adapters/manifests/station-rules.manifest`
- `packages/manifest-adapters/manifests/inventory-rules.manifest`
- `packages/manifest-adapters/manifests/recipe-rules.manifest`
- `packages/manifest-adapters/manifests/menu-rules.manifest`
- `packages/manifest-adapters/manifests/prep-list-rules.manifest`

### Routes Needing Manifest Integration
- `apps/api/app/api/kitchen/tasks/route.ts` - POST needs Manifest
- `apps/api/app/api/kitchen/tasks/[id]/route.ts` - PATCH needs Manifest
- `apps/api/app/api/kitchen/prep-lists/route.ts` - POST needs Manifest

---

## Reference: Manifest Statistics

| Metric | Count |
|--------|-------|
| Manifest Files | 6 |
| Entities Defined | 12 |
| Commands | 34 |
| Constraints | 64 |
| Events | 55 |
| Policies | 18 |
| PrismaStore Implementations | 12 |

---

## Deep Analysis: Manifest System Architecture (2026-02-13)

### Current Implementation Status by Layer

**Layer 1: Entity Definitions (manifests/)** ✅ COMPLETE
| Entity | Commands | Constraints | Events | Store |
|--------|----------|-------------|--------|-------|
| PrepTask | 7 (claim, start, complete, release, reassign, updateQuantity, cancel) | 6 | 7 | memory |
| Station | 6 (assignTask, removeTask, updateCapacity, deactivate, activate, updateEquipment) | 4 | 6 | memory |
| InventoryItem | 6 (reserve, consume, waste, adjust, restock, releaseReservation) | 8 | 6 | memory |
| Recipe | 3 (update, deactivate, activate) | 5 | 4 | memory |
| Menu | 3 (update, activate, deactivate) | 5 | 8 | memory |
| PrepList | 7 (update, updateBatchMultiplier, finalize, activate, deactivate, markCompleted, cancel) | 6 | 12 | memory |
| PrepListItem | 5 (updateQuantity, updateStation, updatePrepNotes, markCompleted, markUncompleted) | 3 | 6 | memory |
| RecipeVersion | 1 (create) | 4 | 1 | memory |
| Dish | 2 (updatePricing, updateLeadTime) | 4 | 3 | memory |
| Ingredient | 1 (updateAllergens) | 2 | 1 | memory |
| RecipeIngredient | 1 (updateQuantity) | 2 | 1 | memory |

**Layer 2: Prisma Store Layer (prisma-store.ts)** ✅ COMPLETE
- 12 store implementations with proper tenant isolation
- Two-way sync functions: `loadXxxFromPrisma()` / `syncXxxToPrisma()`
- Soft delete pattern with `deletedAt` timestamp
- Complex relationship handling (e.g., PrepTask ↔ KitchenTaskClaim)

**Layer 3: Runtime Engine (manifest-runtime.ts)** ✅ COMPLETE
- 6 factory functions: `createPrepTaskRuntime`, `createStationRuntime`, `createInventoryRuntime`, `createRecipeRuntime`, `createMenuRuntime`, `createPrepListRuntime`
- Combined runtime: `createKitchenOpsRuntime()` merges all IRs
- Telemetry hooks defined (onConstraintEvaluated, onOverrideApplied, onCommandExecuted)
- Workflow metadata support (correlationId, causationId, idempotencyKey)

**Layer 4: API Response Layer (api-response.ts)** ✅ COMPLETE
- Standard response types: `ApiSuccessResponse<T>`, `ApiErrorResponse`
- HTTP status code mapping: 200/201/400/403/409/500
- Constraint outcome formatting for frontend
- Error type classes: `ManifestConstraintError`, `ManifestPolicyError`, `ManifestConflictError`

### Critical Missing Infrastructure

| Component | Status | Impact | Priority |
|-----------|--------|--------|----------|
| **Create Commands** | ❌ Missing | Cannot create entities through Manifest | P1 |
| **Projections Engine** | ❌ Missing | No read model projections | P2 |
| **Event Store** | ❌ Missing | No event sourcing, only outbox | P2 |
| **Query Engine** | ❌ Missing | No materialized views | P2 |
| **Real-time Subscriptions** | ⚠️ Partial | Ably exists, not connected to Manifest events | P1 |
| **CLI Tools** | ⚠️ Partial | Route generator exists, needs expansion | P2 |
| **Override Workflow** | ❌ Missing | Hooks defined, no UI/API for override auth | P1 |
| **Telemetry Connection** | ❌ Missing | Hooks defined, not wired to Sentry | P1 |

### Route Migration Status Matrix

| Category | Total Routes | Manifest-Integrated | Direct Prisma | Hybrid | Migration Priority |
|----------|--------------|---------------------|---------------|--------|-------------------|
| tasks | 8 | 2 | 5 | 1 | **HIGH** - Core kitchen ops |
| prep-lists | 19 | 12 | 5 | 2 | **HIGH** - Core kitchen ops |
| recipes | 10 | 6 | 3 | 1 | MEDIUM |
| stations | 7 | 4 | 2 | 1 | MEDIUM |
| menus | 4 | 3 | 1 | 0 | LOW |
| inventory | 6 | 4 | 1 | 1 | MEDIUM |
| dishes | 3 | 2 | 1 | 0 | LOW |
| ingredients | 2 | 1 | 1 | 0 | LOW |
| allergens | 3 | 0 | 3 | 0 | **HIGH** - Safety critical |
| waste | 6 | 1 | 4 | 1 | MEDIUM |
| manifest | 9 | 9 | 0 | 0 | N/A - Already Manifest |
| AI | 2 | 0 | 2 | 0 | LOW |
| **TOTAL** | **79** | **44** | **28** | **6** | |

### Spec Status for Manifest-Related Features

**Completed (Traditional CRUD)**:
- `kitchen-prep-list-generation_COMPLETE` - Uses direct Prisma
- `kitchen-allergen-tracking_COMPLETE` - Uses direct Prisma
- `kitchen-waste-tracking_COMPLETE` - Uses direct Prisma

**Critical for Manifest**:
- `manifest-kitchen-ops-rules-overrides_TODO` - **CRITICAL** - Defines constraint severity, override workflow
- `manifest-integration_INPROGRESS` - Infrastructure verification in progress
- `manifest-migration.md` - Migration strategy defined

**AI Features Requiring Manifest**:
- `ai-bulk-task-generation_TODO` - Needs constraint enforcement
- `ai-employee-conflict-detection_TODO` - Needs constraint evaluation
- `ai-inventory-conflict-detection_TODO` - Needs constraint evaluation
- `ai-equipment-conflict-detection_TODO` - Needs constraint evaluation
- `ai-venue-conflict-detection_TODO` - Needs constraint evaluation

### Recommended Missing Specs to Create

1. **Kitchen Workflow Entity Spec** - Define event import pipeline steps
2. **Inventory Reservation Workflow Spec** - Multi-step workflow for inventory ops
3. **Kitchen Command Binding Spec** - All kitchen commands, permissions, contracts
4. **AI Task Generation Constraint Spec** - AI constraints with override workflow
