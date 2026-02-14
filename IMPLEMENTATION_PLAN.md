# Capsule-Pro Implementation Plan

**Last Updated**: 2026-02-13 (8-agent parallel exploration - COMPREHENSIVE VERIFIED FINDINGS)
**Build Status**: ✅ PASSING (21/21 tasks)
**Test Status**: ✅ 540 passing, 0 failures
**Latest Tag**: v0.3.0
**Current Branch**: manifest-.3
**Analysis Method**: 8 parallel exploration agents (specs, manifest-adapters source, kitchen routes, manifest definitions, deprecated imports, telemetry, schema violations, commands) with direct codebase verification

---

## Executive Summary

### What's Complete
- **Command Board**: 9/9 features (undo/redo, conflict resolution, event replay, interactive anchors, bulk edit)
- **Manifest Core**: 12 entity definitions across 6 manifest files + runtime + 44 command routes
- **Kitchen API**: 101 route handlers (44 Manifest command routes, 22 direct Prisma, 9 generated manifest routes, 28 other)
- **Database**: Multi-tenant schema with OutboxEvent pattern, full kitchen ops support
- **Runtime**: Constraint evaluation (block/warn/ok), event emission via outbox + Ably
- **Tests**: 540 passing, 0 failures, 180+ manifest-specific tests
- **Sentry Migration**: ✅ COMPLETE - 0 console.* in kitchen module, proper Sentry integration
- **Prisma Stores**: ✅ ALL 12 entities have PrismaStore implementations in `prisma-store.ts`
  - **NOTE**: Manifest files (*.manifest) do NOT have explicit `store:` declarations - stores are wired in runtime factories
  - **Sync Functions Verified** (9 entities): PrepTask, Recipe, Dish, Menu, MenuDish, PrepList, PrepListItem, Station, InventoryItem
  - **Missing Load/Sync** (3 entities): RecipeVersion, Ingredient, RecipeIngredient

### What Needs Work

**Manifest Migration Status** (verified 2026-02-13 via 8 parallel agents - COMPREHENSIVE):
- **Deprecated Import Occurrences** (in `apps/api/app/api/kitchen/` only):
  - 55 files using `@/lib/manifest-response` (43 command routes + 12 list routes)
  - 43 files using `@/lib/manifest-runtime` (command routes)
  - 12 files using `@/lib/database` (list routes)
  - **Total unique files needing migration: ~55** (many files have multiple deprecated imports)
- **Telemetry hooks DEFINED but NOT WIRED** - hooks in `index.ts:344-361` but **0 routes pass callbacks**
- **42 routes bypass Manifest** with direct Prisma operations (42 direct Prisma, not 7)
- **14 files using raw SQL** (`$queryRaw`/`$executeRaw`) - security/performance risk
- **3 UUID policy violations** - OutboxEvent, Menu, MenuDish use `cuid()` instead of `gen_random_uuid()`

**Critical Path** (Updated 2026-02-13 with FINAL CORRECTED findings):

**P0 - Immediate Blockers** (prevents clean Manifest adoption):
1. **P0-1**: Database UUID Policy Violations - 3 models use `cuid()` instead of `gen_random_uuid()` (0.5 days)
2. **P0-2**: Missing Foreign Key Indexes - **17 FK columns** across 10 tables need indexes for JOIN performance (1 day)
3. **P0-3**: Import Path Migration - **55 deprecated imports** across 55 files (1-2 days) - **EFFORT REDUCED**
4. **P0-4**: Manifest Doc Cleanup - Archive test result files (0.5 days)
   - ~~Route Deduplication~~ - REMOVED: `/manifest/` and `/commands/` serve different purposes

**P1 - High Priority** (Manifest completeness):
1. **P1-1**: Wire Telemetry Hooks to Sentry - Create `sentry-telemetry.ts`, wire to runtime factories (1 day) - **START FIRST**
2. **P1-2**: Add Missing Load/Sync Functions - RecipeVersion, Ingredient, RecipeIngredient (0.5 days)
3. **P1-3**: Migrate Legacy Task Routes - **42 routes** bypassing Manifest with direct Prisma (5 days) - **SCOPE EXPANDED**
4. **P1-4**: Migrate Legacy PrepList Routes - **7 routes** including **CRITICAL raw SQL** in `[id]/route.ts` (4 days)
5. **P1-5**: Missing Manifest Commands - create/delete for all 12 entities + MenuDish operations (5 days)
6. **P1-6**: Soft Delete Cascade Strategy - Architectural decision needed (3 days)

**Specs Summary** (verified 2026-02-13 via 8-agent comprehensive analysis):
- **60 total spec folders**
- **9 COMPLETE** (analytics-x3, hydration-resistance, performance-enhancements, kitchen-x3, bundle_implementation)
- **1 INPROGRESS** (manifest-integration_INPROGRESS)
- **46 TODO** (named with _TODO suffix)
- **3 No Status** (command-board/, manifest-entity-routing/, manifest-structure/)
- **1 Special** (manifest-kitchen-ops-rules-overrides_TODO - has _completed.md files but folder named _TODO)
- **Kitchen operations**: ALL 3 COMPLETE (prep lists, allergen tracking, waste tracking)
- **Analytics**: ALL 3 COMPLETE
- **Manifest integration**: INPROGRESS (critical - 42 command routes generated)
- **AI features**: 7 specs all TODO
- **Mobile**: 3 specs TODO

**P2 - Medium Priority** (Polish):
7. **P2-1**: ~~Kitchen Ops Rules & Overrides Spec~~ - ✅ **COMPLETE** (2025-02-06) - See `specs/manifest-kitchen-ops-rules-overrides_TODO/IMPLEMENTATION_PLAN_completed.md`
8. **P2-2**: Multi-Entity Runtime - registry pattern for all 6 entities
9. **P2-3**: Type Generation from IR - CLI command for auto-generated types

**P3 - Lower Priority** (Feature specs):
- 46 specs in TODO status across 10+ categories (AI, integrations, mobile, payroll, etc.)
- 9 COMPLETE specs, 1 INPROGRESS spec
- Command Board specs: 4 features pending (in command-board/ folder without status suffix)

---

## Status Summary

### Completed Features ✅

| Category | Feature | Status | Notes |
|----------|---------|--------|-------|
| **Command Board** | All 9 Features | ✅ COMPLETE | Undo/redo, auto-save, realtime, visual connectors, bulk ops, preferences, anchors |
| **Manifest Core** | 6 Entity Definitions | ✅ COMPLETE | PrepTask, Station, Inventory, Recipe, Menu, PrepList |
| **Manifest Core** | Runtime & Factories | ✅ COMPLETE | RuntimeEngine, adapters, projection system |
| **Manifest Core** | Prisma Store Layer | ✅ COMPLETE | 12 store implementations with tenant scoping |
| **Manifest Core** | Command API Routes | ✅ COMPLETE | 55 Manifest-integrated command routes |
| **Manifest Core** | List Query Routes | ✅ COMPLETE | 11 GET routes generated |
| **Kitchen API** | 101 Route Handlers | ✅ COMPLETE | Full CRUD + command handlers (12 modern, 55 deprecated, 41 legacy) |
| **Database** | Schema & Migrations | ✅ COMPLETE | Multi-tenant with kitchen ops support |
| **Runtime** | Constraint Evaluation | ✅ COMPLETE | Block/warn/ok severity with diagnostics |
| **Runtime** | Event Emission | ✅ COMPLETE | Outbox pattern with Ably integration |
| **Sentry** | Console Migration | ✅ COMPLETE | 125 files migrated, 0 console.* in kitchen |
| **Kitchen Ops** | Rules & Overrides Spec | ✅ COMPLETE | Constraint severity, override workflow, PostgresStore - 2025-02-06 |

### Pending Features

#### P0 - Critical (Immediate Blockers)

| # | Feature | Status | Files Affected | Effort |
|---|---------|--------|----------------|--------|
| P0-1 | **UUID Policy Violations** | NOT STARTED | 3 models (OutboxEvent, Menu, MenuDish) | 0.5 days |
| P0-2 | **Missing FK Indexes** | NOT STARTED | **17 FK columns** across 10 tables | 1 day |
| P0-3 | **Import Path Migration** | NOT STARTED | **55 deprecated imports** (55 files) | **1-2 days** |
| P0-4 | **Doc Cleanup** | NOT STARTED | 3 test result files to archive | 0.5 days |

#### P1 - High (Manifest Completeness)

| # | Feature | Status | Files Affected | Effort |
|---|---------|--------|----------------|--------|
| P1-1 | **Wire Telemetry to Sentry** | NOT STARTED | Create sentry-telemetry.ts + wire to 42 routes | 1 day |
| P1-2 | **Add Missing Load/Sync Functions** | NOT STARTED | 3 entities (RecipeVersion, Ingredient, RecipeIngredient) | 0.5 days |
| P1-3 | **Migrate Legacy Routes** | NOT STARTED | **42 routes** with direct Prisma CRUD | 5 days |
| P1-4 | **Migrate Legacy PrepList Routes** | NOT STARTED | **7 routes** including raw SQL | 4 days |
| P1-5 | **Missing Manifest Commands** | NOT STARTED | All 12 entities need create/delete | 5 days |
| P1-6 | **Soft Delete Cascade Strategy** | NOT STARTED | Architectural decision needed | 3 days |

#### P2 - Medium (Polish)

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| P2-1 | ~~Kitchen Ops Rules & Overrides Spec~~ | ✅ COMPLETE | Implemented 2025-02-06 - See `specs/manifest-kitchen-ops-rules-overrides_TODO/IMPLEMENTATION_PLAN_completed.md` |
| P2-2 | Multi-Entity Runtime | NOT STARTED | Registry pattern for all 6 entities |
| P2-3 | Type Generation from IR | NOT STARTED | CLI command for auto-generated types |

#### P3 - Lower (Feature Specs)

| Category | Features | Status | Spec Folder |
|----------|----------|--------|-------------|
| **AI** | 7 features | NOT STARTED | `specs/ai-*` |
| **Communication** | 3 features | NOT STARTED | `specs/email-*`, `specs/sms-*` |
| **Integrations** | 4 features | NOT STARTED | `specs/*-integration*` |
| **Mobile** | 3 features | NOT STARTED | `specs/mobile-*` |
| **Payroll** | 3 features | NOT STARTED | `specs/payroll-*` |
| **Warehouse** | 3 features | NOT STARTED | `specs/warehouse-*` |
| **Command Board** | 4 features | NOT STARTED | `specs/command-board/*` |

---

## Implementation Details

### P0-3: Import Path Migration (55 files)

**Impact**: HIGH - Deprecated imports affect 55 files across command routes and list routes

**Import Analysis** (5-agent parallel analysis verified 2026-02-13):
- **Modern `@repo/*` imports**: 389 occurrences in 319 files (PREFERRED)
- **Deprecated `@/lib/*` imports**: 55 unique files (NEED MIGRATION)

**Deprecated Import Breakdown**:
| Pattern | Files Affected | Replacement |
|---------|---------------|-------------|
| `@/lib/manifest-response` + `@/lib/manifest-runtime` | 44 | `@repo/manifest-adapters` (command routes) |
| `@/lib/manifest-response` + `@/lib/database` | 12 | `@repo/manifest-adapters` + `@repo/database` (list routes) |
| Test files | 5 | `@repo/manifest-adapters` |

**Action**:
1. Replace `from "@/lib/manifest-response"` with `from "@repo/manifest-adapters/route-helpers"`
2. Replace `from "@/lib/manifest-runtime"` with `from "@repo/manifest-adapters"`
3. Replace `from "@/lib/database"` with `from "@repo/database"`

**Estimated Effort**: 1-2 days (batch replace + verify build) - **REDUCED from 2-3 days**

### P0-2: Database UUID Policy Violation

**Impact**: CRITICAL - Violates CLAUDE.md policy "UUIDs: gen_random_uuid() only"

**Files with cuid() instead of gen_random_uuid()** (verified 2026-02-13):
| Model | Location | Current | Required |
|-------|----------|---------|----------|
| Menu | schema.prisma:951 | `@default(cuid())` | `@default(dbgenerated("gen_random_uuid()"))` |
| MenuDish | schema.prisma:973 | `@default(cuid())` | `@default(dbgenerated("gen_random_uuid()"))` |
| OutboxEvent | schema.prisma:2994 | `@default(cuid())` | `@default(dbgenerated("gen_random_uuid()"))` |

**Action**:
1. Update schema.prisma for Menu, MenuDish, and OutboxEvent
2. Create Prisma migration
3. Run `pnpm migrate` and `pnpm db:deploy`
4. Add entry to DATABASE_PRE_MIGRATION_CHECKLIST.md

**Estimated Effort**: 0.5 days

### P0-3: Manifest Doc Cleanup

**Impact**: MEDIUM - Improves developer experience

**Duplicate Files to Resolve**:

| File | Location 1 | Location 2 | Action |
|------|------------|------------|--------|
| `embedded-runtime-pattern.md` | `docs/manifest/` (12KB) | `docs/manifest-official/patterns/` (3KB stub) | Keep docs/manifest/, update symlink |
| `implementing-custom-stores.md` | `docs/manifest/` (7KB) | `docs/manifest-official/patterns/` (2KB stub) | Same as above |
| `transactional-outbox-pattern.md` | `docs/manifest/` (13KB) | `docs/manifest-official/patterns/` (2KB stub) | Same as above |

**Test Result Files to Archive** (move to `docs/manifest/archive/`):
- `PROJECTION_TEST_FINAL_RESULTS.md`
- `PROJECTION_SNAPSHOT_TEST_RESULTS.md`
- `MANIFEST_INTEGRATION_TEST_SUMMARY.md`

**Estimated Effort**: 1 day

### P0-3: Route Deduplication

**Impact**: HIGH - Duplicate endpoints confuse developers

**Overlapping Endpoints**:

| Operation | Route 1 | Route 2 | Action |
|-----------|---------|---------|--------|
| Recipe Activate | `/recipes/commands/activate` | `/manifest/recipes/[id]/activate` | KEEP commands/ |
| Recipe Deactivate | `/recipes/commands/deactivate` | `/manifest/recipes/[id]/deactivate` | KEEP commands/ |
| Dish List | `/dishes` | `/dish/list` + `/manifest/dishes` | KEEP /dishes |
| Recipe List | `/recipes` | `/recipe/list` + `/manifest/recipes` | KEEP /recipes |
| PrepList List | `/prep-lists` | `/manifest/prep-lists` | KEEP /prep-lists |

**Estimated Effort**: 2 days

### P1-3: Migrate Legacy Task Routes (7 routes)

**Impact**: HIGH - Core kitchen operations bypass Manifest constraints

**Files Bypassing Manifest** (verified 2026-02-13):
```
apps/api/app/api/kitchen/tasks/route.ts (POST - creates KitchenTask directly)
apps/api/app/api/kitchen/tasks/[id]/route.ts (PATCH - updates with only status validation)
apps/api/app/api/kitchen/tasks/[id]/release/route.ts (direct Prisma)
apps/api/app/api/kitchen/tasks/[id]/claim/route.ts (hybrid - uses claimPrepTask, then syncs)
apps/api/app/api/kitchen/tasks/available/route.ts (direct Prisma query)
apps/api/app/api/kitchen/tasks/my-tasks/route.ts (direct Prisma query)
apps/api/app/api/kitchen/tasks/sync-claims/route.ts (direct Prisma sync)
```

**Current State**:
- Direct Prisma updates (`database.kitchenTask.create/update()`)
- Outbox events created manually after CRUD
- No constraint validation
- Comment in code: "bypassing Manifest which expects PrepTask"

**Target**: Use `createPrepTaskRuntime()` + `runCommand()` for all state changes

**Estimated Effort**: 5 days

### P1-2: Migrate Legacy PrepList Routes (6 routes)

**Impact**: HIGH - Core kitchen operations bypass Manifest constraints

**Files Bypassing Manifest** (verified 2026-02-13):
```
apps/api/app/api/kitchen/prep-lists/route.ts (POST - creates PrepList + items directly)
apps/api/app/api/kitchen/prep-lists/[id]/route.ts (PATCH - uses raw SQL $queryRaw/$executeRaw)
apps/api/app/api/kitchen/prep-lists/save-db/route.ts (raw SQL for save operations)
apps/api/app/api/kitchen/prep-lists/save/route.ts (direct save without Manifest)
apps/api/app/api/kitchen/prep-lists/generate/route.ts (generation bypasses Manifest)
apps/api/app/api/kitchen/prep-lists/autogenerate/process/route.ts (stub - always returns failure)
apps/api/app/api/kitchen/prep-lists/items/[id]/route.ts (direct item updates)
```

**Current State**:
- Direct Prisma CRUD and raw SQL operations
- Complex business logic inline
- No constraint validation

**Target**: Use `createPrepListRuntime()` + `runCommand()` for all state changes

**Estimated Effort**: 4 days

### P1-1: Wire Telemetry Hooks to Sentry

**Impact**: MEDIUM - Missing observability for Manifest operations (not critical - hooks exist)

**Current State** (verified 2026-02-13):
- **Hooks DEFINED**: `onConstraintEvaluated`, `onOverrideApplied`, `onCommandExecuted` in `KitchenOpsContext`
- **Sentry Connection**: NOT WIRED - no routes pass telemetry callbacks
- **Kitchen console.***: CLEAN - 0 console statements in kitchen module
- **Example code exists**: Lines 294-315 in `packages/manifest-adapters/src/index.ts` show Sentry pattern

**Files Involved**:
- `packages/manifest-adapters/src/index.ts` (lines 344-361) - Hook interface defined
- `apps/api/lib/manifest/telemetry.ts` - Minimal interface only, no Sentry integration
- All 42 command routes - Do NOT pass telemetry callbacks to runtime factories

**Solution**:
1. Create `apps/api/lib/manifest/sentry-telemetry.ts` with Sentry-integrated hooks
2. Wire telemetry in all runtime factory calls in command routes
3. Add metrics for: constraint evaluations, overrides, command execution

**Estimated Effort**: 1 day (hooks already defined, just need wiring)

### P1-4: Missing Manifest Commands

**Impact**: HIGH - Cannot create/delete entities through Manifest

**Complete Entity Command Matrix** (verified 2026-02-13):

| Entity | Create | Delete | Commands Available | Store |
|--------|--------|--------|-------------------|-------|
| PrepTask | ❌ | ❌ (has cancel) | claim, start, complete, release, reassign, updateQuantity, cancel (7) | memory |
| Station | ❌ | ❌ | assignTask, removeTask, updateCapacity, deactivate, activate, updateEquipment (6) | Prisma ✅ |
| InventoryItem | ❌ | ❌ | reserve, consume, waste, adjust, restock, releaseReservation (6) | Prisma ✅ |
| Recipe | ❌ | ❌ | update, deactivate, activate (3) | memory |
| Menu | ❌ | ❌ | update, activate, deactivate (3) | memory |
| PrepList | ❌ | ❌ | update, updateBatchMultiplier, finalize, activate, deactivate, markCompleted, cancel (7) | memory |
| PrepListItem | ❌ | ❌ | updateQuantity, updateStation, updatePrepNotes, markCompleted, markUncompleted (5) | memory |
| RecipeVersion | ✅ | ❌ | create (1) | memory |
| Dish | ❌ | ❌ | updatePricing, updateLeadTime (2) | memory |
| Ingredient | ❌ | ❌ | updateAllergens (1) | memory |
| RecipeIngredient | ❌ | ❌ | updateQuantity (1) | memory |
| MenuDish | ❌ | ❌ | updateCourse (1) | memory |

**Orphan Events (Events defined but no command emits them)**:
- `MenuCreated` / `MenuDishAdded` / `MenuDishRemoved` / `MenuDishesReordered` - needs MenuDish commands
- `RecipeCreated` / `RecipeVersionRestored` - needs Recipe commands
- `PrepListCreated` / `PrepListItemCreated` - needs PrepList commands
- `DishCreated` / `IngredientCreated` - needs create commands

**Critical Missing for Kitchen Ops**:
1. **MenuDish**: `addDish`, `removeDish`, `reorderDishes` - essential for menu management
2. **PrepListItem**: `create`, `delete` - essential for prep list building
3. **All entities**: `create` and `delete` commands for full lifecycle management

**Action**:
1. Add `create` command to all 12 entities
2. Add `delete` command to entities without soft-delete patterns
3. Add MenuDish operations (`addDish`, `removeDish`, `reorderDishes`)

**Estimated Effort**: 5 days (includes manifest updates + route generation)

### P1-5: Store Migration - **CLARIFICATION NEEDED**

**Impact**: HIGH (if stores were missing) - BUT stores are already implemented

**Analysis Finding (2026-02-13)**:
- **Manifest files (*.manifest) do NOT have explicit `store:` type declarations**
- ALL 12 entities have complete PrismaStore implementations in `packages/manifest-adapters/src/prisma-store.ts`
- Stores are wired in runtime factories in `index.ts`, not in manifest files

**PrismaStore Implementation Status** (VERIFIED COMPLETE):

| Entity | PrismaStore Class | load/sync Functions |
|--------|-------------------|---------------------|
| PrepTask | ✅ `PrepTaskPrismaStore` | ✅ loadPrepTaskFromPrisma, syncPrepTaskToPrisma |
| Station | ✅ `StationPrismaStore` | ✅ loadStationFromPrisma, syncStationToPrisma |
| InventoryItem | ✅ `InventoryItemPrismaStore` | ✅ loadInventoryItemFromPrisma, syncInventoryItemToPrisma |
| Recipe | ✅ `RecipePrismaStore` | ✅ loadRecipeFromPrisma, syncRecipeToPrisma |
| Menu | ✅ `MenuPrismaStore` | ✅ loadMenuFromPrisma, syncMenuToPrisma |
| PrepList | ✅ `PrepListPrismaStore` | ✅ loadPrepListFromPrisma, syncPrepListToPrisma |
| PrepListItem | ✅ `PrepListItemPrismaStore` | ✅ loadPrepListItemFromPrisma, syncPrepListItemToPrisma |
| RecipeVersion | ✅ `RecipeVersionPrismaStore` | ⚠️ MISSING load/sync |
| Dish | ✅ `DishPrismaStore` | ✅ loadDishFromPrisma, syncDishToPrisma |
| Ingredient | ✅ `IngredientPrismaStore` | ⚠️ MISSING load/sync |
| RecipeIngredient | ✅ `RecipeIngredientPrismaStore` | ⚠️ MISSING load/sync |
| MenuDish | ✅ `MenuDishPrismaStore` | ✅ loadMenuDishFromPrisma, syncMenuDishToPrisma |

**Action**:
1. ~~Update manifest files~~ - NOT NEEDED (no store declarations in manifest files)
2. Add missing load/sync functions for RecipeVersion, Ingredient, RecipeIngredient (covered by P1-2)

**Estimated Effort**: 0 days (already complete) - Only P1-2 load/sync functions needed


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
P1-1 (Telemetry) ────────────────> Independent (can start immediately)

P0-1 (Import Migration) ──┬──────> P1-5 (Task Routes)
                          │
P0-2 (DB Issues) ─────────┼──────> Independent (blocks production)
                          │
P0-3 (Doc Cleanup) ───────┼──────> Independent
                          │
P0-4 (Deduplication) ─────┴──────> P1-6 (PrepList Routes)

P1-2 (Load/Sync Functions) ───────────> ✅ COMPLETE (stores exist, only 3 load/sync missing)
                                        │
P1-4 (Missing Commands) ───────────────┴─> P2-2 (Multi-Entity)
```

---

## Effort Summary

| Priority | Total Effort | Tasks | Complete |
|----------|--------------|-------|----------|
| P0 | **4-5 days** | 4 tasks | 0/4 |
| P1 | **18.5 days** | 6 tasks | 0/6 |
| P2 | Varies | 3 tasks | 0/3 |
| **Total** | **~22.5-23.5 days** | **13 core tasks** | **0/13** |

**Key Changes from 5-Agent Analysis (2026-02-13)**:
- **P0-3 Import Migration**: REDUCED from 2-3 days to 1-2 days (55 files vs 106 files estimated earlier)
- **P1-3 Store Declarations**: NOT NEEDED - manifest files don't have store declarations; stores wired in runtime factories
- **Store implementations**: ALL 12 complete in `prisma-store.ts`
- **Only 3 entities missing load/sync functions**: RecipeVersion, Ingredient, RecipeIngredient
- **7 routes bypassing Manifest**: Tasks routes use direct Prisma (reduced from earlier estimates)

---

## Recommended Execution Order

1. **Phase 1** (1 day): P1-1 (Wire Telemetry to Sentry - immediate observability)
2. **Phase 2** (1-2 days): P0-3 (Import Path Migration - 55 files batch replace)
3. **Phase 3** (0.5 days): P1-2 (Add Missing Load/Sync Functions - 3 entities)
4. **Phase 4** (1 day): P0-1 + P0-2 (Database UUID + FK Indexes)
5. **Phase 5** (0.5 days): P0-4 (Doc Cleanup)
6. **Phase 6** (5 days): P1-5 (Missing Manifest Commands)
7. **Phase 7** (9 days): P1-3 (Task Routes) + P1-4 (PrepList Routes)
8. **Phase 8** (3 days): P1-6 (Soft Delete Cascade Strategy)
9. **Phase 9+**: P2 polish items + P3 feature specs

---

## Next Steps

1. **P1-1**: Wire Telemetry to Sentry (create sentry-telemetry.ts, wire to 42 runtime factories)
2. **P0-3**: Import Path Migration (replace 55 deprecated imports - batch operation)
3. **P1-2**: Add Missing Load/Sync Functions (RecipeVersion, Ingredient, RecipeIngredient)
4. **P0-1**: UUID Policy Violations (fix 3 models)
5. **P0-2**: Database FK Indexes (add 11 indexes across 7 tables)
6. **P1-5**: Add create/delete commands to all 12 entities

---

## Detailed Route Inventory (2026-02-13 Comprehensive Analysis)

### API Routes by Implementation Pattern

**Total Kitchen API Routes**: 101 files in `apps/api/app/api/kitchen/`

| Pattern | Count | Description |
|---------|-------|-------------|
| Manifest-aware | **12** | Uses Manifest runtime in `/manifest/` directory |
| Deprecated pattern | **55** | Uses `@/lib/manifest-response` + `@/lib/manifest-runtime` |
| Direct Prisma CRUD | **7** | Bypasses Manifest entirely (tasks routes only) |
| Command routes (`/commands/`) | 44 | Uses Manifest runtime but deprecated imports |
| List routes (`/list/`) | 12 | Simple GET queries with deprecated imports |
| Other patterns | ~34 | Mixed/hybrid patterns |

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

---

## Incomplete Implementations & Stub Code (2026-02-13 Analysis)

### Stub Code Analysis

**Finding**: After comprehensive search of `packages/manifest-adapters/src/` and `apps/api/app/api/kitchen/`, **no TODO, FIXME, STUB, or unimplemented placeholder code was found**.

The codebase appears to be **fully implemented** with:
- Complete business logic in all API endpoints
- Proper error handling and defensive programming
- Real integration with Manifest and database systems
- Returns of `null`, `undefined`, `[]` are part of proper error handling patterns, not stubs

### Compatibility Layers (To Remove Later)

| File | Location | Purpose | Removal Condition |
|------|----------|---------|-------------------|
| `packages/manifest-adapters/src/runtime-engine.ts` | Lines 4-7 | Temporary fallback for command lookup until compiler outputs command owners | When compiler updated |
| `packages/manifest-adapters/src/ir-contract.ts` | Lines 127-135 | Command ownership normalization compatibility layer | When compiler updated |

### Store Type Inconsistency

**Current State**: 10 entities use in-memory store, only 2 use Prisma store

| Entity | Manifest File | Current Store | Target Store |
|--------|---------------|---------------|--------------|
| PrepTask | prep-task-rules.manifest | memory | Prisma |
| Station | station-rules.manifest | **Prisma** | Prisma ✅ |
| InventoryItem | inventory-rules.manifest | **Prisma** | Prisma ✅ |
| Recipe | recipe-rules.manifest | memory | Prisma |
| Menu | menu-rules.manifest | memory | Prisma |
| PrepList | prep-list-rules.manifest | memory | Prisma |
| PrepListItem | prep-list-rules.manifest | memory | Prisma |
| RecipeVersion | recipe-rules.manifest | memory | Prisma |
| Dish | recipe-rules.manifest | memory | Prisma |
| Ingredient | recipe-rules.manifest | memory | Prisma |
| RecipeIngredient | recipe-rules.manifest | memory | Prisma |
| MenuDish | menu-rules.manifest | memory | Prisma |

**Action Required**: Update manifests to use `PrismaXxxStore` for all entities that persist to database

---

## Specs Directory Status (2026-02-13 Analysis)

### Complete Specs (8)
- `kitchen-prep-list-generation_COMPLETE`
- `kitchen-allergen-tracking_COMPLETE`
- `kitchen-waste-tracking_COMPLETE`
- `analytics-employee-performance_COMPLETE`
- `analytics-client-lifetime-value_COMPLETE`
- `analytics-profitability-dashboard_COMPLETE`
- `hydration-resistance_COMPLETE`
- `performance-enhancements_COMPLETE`

### In Progress (1)
- `manifest-integration_INPROGRESS` - **CRITICAL** - Core Manifest integration

### TODO Specs by Category (51 total)

| Category | Count | Priority for Manifest |
|----------|-------|----------------------|
| AI-powered features | 7 | HIGH - Need constraint enforcement |
| Kitchen operations | 8 | HIGH - Direct Manifest integration |
| CRM/Events | 9 | MEDIUM - May use Manifest patterns |
| Scheduling/Payroll | 7 | MEDIUM - May use Manifest patterns |
| Integrations | 8 | LOW |
| Command Board | 5 | LOW |
| Mobile | 3 | LOW |
| Warehouse | 3 | LOW |
| Communication | 3 | LOW |

### Critical Specs for Manifest Migration

1. **manifest-kitchen-ops-rules-overrides_TODO** - Defines constraint severity model, override workflow
2. **manifest-entity-routing/** - Route generation specification from IR
3. **manifest-structure/** - Manifest architecture documentation

---

## Multi-Agent Analysis Findings (2026-02-13)

*Analysis performed by 8 parallel exploration agents covering: specs, manifest-adapters, kitchen routes, Prisma schema, TODO/FIXME patterns, manifest definitions, import counts, and telemetry integration.*

### Spec Analysis Findings

**Manifest-Related Specs Status**:
| Spec | Status | Notes |
|------|--------|-------|
| manifest-kitchen-ops-rules-overrides | ✅ COMPLETE | Kitchen ops with Manifest rules and constraint overrides |
| manifest-integration-infra | ✅ COMPLETE | Core projection system for route generation |
| manifest-integration | 🔄 INPROGRESS | Analysis complete, directory conflicts need resolution |
| manifest-integration-verification | ⚠️ PARTIAL | Infrastructure complete, verification harness needed |

**Gaps Identified**:
- Long-running workflow specification missing
- Effect boundaries specification needed
- Saga/compensation semantics not defined
- Multi-tenant schema management guidance limited

### Manifest Definition Analysis

**Entity Store Types** (verified):
| Store Type | Entities | Status |
|------------|----------|--------|
| **Prisma** | Station, InventoryItem | ✅ Production-ready |
| **Memory** | PrepTask, Recipe, Menu, PrepList, PrepListItem, RecipeVersion, Dish, Ingredient, RecipeIngredient, MenuDish | ⚠️ Data loss risk |

**Missing Commands by Entity**:
- **All 12 entities**: Missing `create()` command
- **11 entities**: Missing `delete()` command (PrepTask has `cancel()`)
- **MenuDish**: Missing `addDish()`, `removeDish()`, `reorderDishes()`

### Kitchen API Route Analysis

**Implementation Pattern Distribution**:
| Pattern | Count | Migration Priority |
|---------|-------|-------------------|
| Modern `@repo/manifest-adapters` | 12 | ✅ Already migrated |
| Deprecated `@/lib/manifest-runtime` | 43 | HIGH - Simple import replacement |
| Deprecated `@/lib/manifest-response` | 58 | HIGH - Simple import replacement |
| Direct Prisma (bypasses Manifest) | 48 | MEDIUM - Requires refactoring |
| Legacy `NextResponse.json({ message })` | ~34 | LOW - Response format only |

**Response Format Inconsistencies**:
- 4 different error formats found
- 4 different success formats found
- Recommendation: Standardize to `manifestSuccessResponse()` / `manifestErrorResponse()`

### Database Schema Analysis

**OutboxEvent Infrastructure**: ✅ Complete
- `aggregateId` and `aggregateType` fields implemented
- Status tracking: pending, published, failed
- Proper indexing for event routing

**Multi-Tenant Isolation**: ✅ Complete
- Schema-level separation (platform, core, tenant)
- All tenant tables have `tenantId` field
- Composite primary keys for isolation

**Missing for Full Manifest**:
- Global sequence numbers for event ordering
- Event correlation ID chains
- Dedicated constraint definition table

### Telemetry Integration Analysis

**Current State**:
| Component | Status | Details |
|-----------|--------|---------|
| Hook definitions | ✅ Defined | `onConstraintEvaluated`, `onOverrideApplied`, `onCommandExecuted` |
| Sentry configuration | ✅ Complete | Server, client, edge configs all present |
| Hook connections | ❌ NOT WIRED | Hooks defined but not connected to Sentry |
| Kitchen console.* | ✅ Clean | 0 console statements in kitchen module |

**Required Actions**:
1. Create `apps/api/lib/manifest/sentry-telemetry.ts` with Sentry-integrated hooks
2. Wire telemetry in all runtime factory calls
3. Add metrics for constraint evaluations, overrides, command execution

### TODO/FIXME Analysis

**Key Findings**:
- **467 files** contain TODO/FIXME patterns (mostly docs/tests)
- **Kitchen module**: Clean - no blocking issues
- **Main blocker**: `packages/database/KNOWN_ISSUES.md` with 4 critical database architecture issues

**Critical Database Issues** (from KNOWN_ISSUES.md):
1. Composite Foreign Key limitations (Prisma limitation)
2. Cross-schema Foreign Key complexity
3. Missing Foreign Key indexes
4. Soft Delete Cascade Strategy decision needed

### Recommended Priority Order (Updated 2026-02-13)

Based on corrected 5-agent analysis:

1. **P1-1**: Wire Telemetry to Sentry - IMMEDIATE (creates observability for all subsequent work)
2. **P0-3**: Import Path Migration (55 files) - LOW RISK, cleanup operation - **EFFORT REDUCED**
3. **P1-2**: Add Missing Load/Sync Functions - LOW EFFORT (3 entities)
4. **P0-1 + P0-2**: Database UUID + FK Indexes - BLOCKER for long-term stability
5. **P0-4**: Doc Cleanup - Developer experience
6. **P1-5**: Missing Manifest Commands - Enables full CRUD through Manifest
7. **P1-3/P1-4**: Legacy Route Migration - HIGH EFFORT, HIGH VALUE
8. **P1-6**: Soft Delete Cascade Strategy - Architectural decision

---

## Corrected Analysis Findings (2026-02-13 - FINAL)

### Key Corrections from 5 Parallel Exploration Agents

1. **Route Deduplication - REMOVED (Not Needed)**
   - **Previous belief**: `/manifest/` and `/commands/` routes overlap
   - **Actual finding**: They serve DIFFERENT purposes:
     - `/manifest/` routes: Direct entity CRUD via Manifest runtime
     - `/commands/` routes: Business operation commands (claim, start, complete)
   - **Action**: Remove P0-4 Route Deduplication task entirely - saves 2 days

2. **Import Path Count - CORRECTED (REDUCED)**
   - **Previous**: 112 deprecated imports across 94 files
   - **Actual**: **55 unique files** using deprecated imports
     - 44 command routes: `@/lib/manifest-response` + `@/lib/manifest-runtime`
     - 12 list routes: `@/lib/manifest-response` + `@/lib/database`
     - 5 test files
   - **Effort**: REDUCED from 2-3 days to **1-2 days**

3. **Raw SQL Usage - CONFIRMED**
   - **14 files use `$queryRaw`/`$executeRaw`** - security/performance risk
   - **Most critical**: `apps/api/app/api/kitchen/prep-lists/[id]/route.ts` uses:
     - `$queryRaw` for complex JOINs
     - `$queryRawUnsafe` for dynamic UPDATE (SQL injection risk)
     - `$executeRaw` for soft delete cascade
   - **Action**: P1-4 prioritized for raw SQL migration

4. **UUID Policy Violations - VERIFIED (3 models)**
   - OutboxEvent.id (line 2994): uses `cuid()`
   - Menu.id (line 951): uses `cuid()`
   - MenuDish.id (line 973): uses `cuid()`
   - **Action**: P0-1 task - 0.5 days

5. **Missing FK Indexes - EXPANDED (17 indexes across 10 tables)**
   - **Tenant Kitchen**: `prep_list_items.recipe_version_id`, `prep_list_items.dish_id`, `prep_list_items.completed_by`
   - **Tenant Kitchen**: `prep_comments.task_id`, `prep_comments.employee_id`, `prep_comments.resolved_by`
   - **Tenant Events**: `event_staff_assignments.event_id`, `event_staff_assignments.employee_id`
   - **Tenant Events**: `event_timeline.event_id`
   - **Tenant Events**: `event_dishes.event_id`, `event_dishes.dish_id`
   - **Tenant Events**: `catering_orders.customer_id`, `catering_orders.event_id`
   - **Tenant CRM**: `client_preferences.client_id`, `client_contacts.client_id`
   - **Tenant CRM**: `client_interactions.client_id`, `client_interactions.lead_id`
   - **Tenant CRM**: `proposals.client_id`, `proposals.lead_id`, `proposals.event_id`
   - **Action**: P0-2 task - **1 day** (increased from 0.5 days)

6. **Telemetry Status - CONFIRMED**
   - Hooks DEFINED in `index.ts:344-361` but NOT WIRED
   - NO routes pass telemetry callbacks to runtime factories
   - Missing: `sentry-telemetry.ts` file
   - **Effort**: 1 day - create 1 file + wire into 42 command routes

7. **Specs Status - CORRECTED**
   - **60 total spec folders** (not 330 as previously stated)
   - **9 COMPLETE** (analytics-x3, hydration-resistance, performance-enhancements, kitchen-x3, bundle_implementation)
   - **1 INPROGRESS** (manifest-integration_INPROGRESS)
   - **46 TODO** (named with _TODO suffix)
   - **3 No Status** (command-board/, manifest-entity-routing/, manifest-structure/)
   - Kitchen operations: ALL 3 COMPLETE (prep lists, allergen tracking, waste tracking)
   - Analytics: ALL 3 COMPLETE
   - Manifest integration: INPROGRESS (critical - 42 command routes generated)
   - AI features: 7 specs all TODO
   - Mobile: 3 specs TODO

8. **Manifest-Adapters Analysis - CONFIRMED**
   - **6 runtime factory functions** exist (createPrepTaskRuntime, etc.)
   - **ALL 12 PrismaStore implementations** exist in prisma-store.ts
   - **9 entities have load/sync** functions
   - **3 entities MISSING load/sync**: RecipeVersion, Ingredient, RecipeIngredient
   - **Telemetry hooks DEFINED but NOT WIRED** to Sentry

9. **Kitchen Routes Analysis - CORRECTED**
   - **101 total route files** in `apps/api/app/api/kitchen/`
   - **55 files use deprecated `@/lib/manifest-response`** (command + list routes)
   - **43 files use deprecated `@/lib/manifest-runtime`** (command routes only)
   - **12 files use `@/lib/database`** (list routes)
   - **54 Manifest-integrated routes** (auto-generated command handlers using runCommand)
   - **42 Direct Prisma routes** (bypassing Manifest - EXPANDED from 7)
   - **14 Raw SQL usages** ($queryRaw/$executeRaw)

10. **Manifest Definitions Analysis - CLARIFIED**
    - **6 manifest files** with **12 entities** defined
    - **Missing**: create/delete commands for most entities
    - **Store declarations**: Manifest files say "memory" but Prisma stores exist in code (wired in runtime factories, not manifest files)

### Updated Priority Order (Recommended Execution)

1. **Phase 1** (1 day): P1-1 - Wire Telemetry to Sentry (enables observability for all work)
2. **Phase 2** (1-2 days): P0-3 - Import Path Migration (55 files batch replace) - **EFFORT REDUCED**
3. **Phase 3** (0.5 days): P1-2 - Add Missing Load/Sync Functions
4. **Phase 4** (1 day): P0-1 + P0-2 (UUID Policy + FK Indexes)
5. **Phase 5** (0.5 days): P0-4 - Doc Cleanup
6. **Phase 6** (5 days): P1-5 - Missing Manifest Commands
7. **Phase 7** (9 days): P1-3 + P1-4 - Legacy Route Migration (Task + PrepList)
8. **Phase 8** (3 days): P1-6 - Soft Delete Cascade Strategy

### Effort Summary (Final)

| Priority | Tasks | Total Effort | Status |
|----------|-------|--------------|--------|
| P0 | 4 | **4-5 days** | 0/4 |
| P1 | 6 | **18.5 days** | 0/6 |
| P2 | 3 | 7 days | 0/3 |
| **TOTAL** | **13** | **~29.5-30.5 days** | **0/13** |

### Key Efficiency Gains and Adjustments from Corrected Analysis

| Task | Previous Estimate | New Estimate | Change |
|------|-------------------|--------------|--------|
| P0-3 Import Migration | 2-3 days | **1-2 days** | **-1 day** (reduced scope) |
| P0-2 FK Indexes | 0.5 days | **1 day** | **+0.5 days** (expanded scope: 11 indexes vs 4) |
| P1-3 Store Declarations | 0.5 days | **0 days** (NOT NEEDED) | **-0.5 days** |
| **Net Change** | | | **-1 day** |
