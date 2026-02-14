# Capsule-Pro Implementation Plan

**Last Updated**: 2026-02-14 (P1-1 Telemetry Complete + Pre-existing Bug Fixes)
**Build Status**: ✅ PASSING (21/21 tasks)
**Test Status**: ✅ 540 passing, 0 failures
**Latest Tag**: v0.3.0
**Current Branch**: manifest-.3

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
- **Telemetry Integration**: ✅ P1-1 COMPLETE - Sentry telemetry wired centrally in manifest runtime (2026-02-14)

### What Needs Work

**Manifest Migration Status** (verified 2026-02-13 via 8 parallel agents - COMPREHENSIVE):
- **Deprecated Import Occurrences** (in `apps/api/app/api/kitchen/` only):
  - 55 files using `@/lib/manifest-response` (43 command routes + 12 list routes)
  - 43 files using `@/lib/manifest-runtime` (command routes)
  - 12 files using `@/lib/database` (list routes)
  - **Total unique files needing migration: ~55** (many files have multiple deprecated imports)
- **42 routes bypass Manifest** with direct Prisma operations (42 direct Prisma, not 7)
- **14 files using raw SQL** (`$queryRaw`/`$executeRaw`) - security/performance risk
- **3 UUID policy violations** - OutboxEvent, Menu, MenuDish use `cuid()` instead of `gen_random_uuid()`

**Critical Path** (Updated 2026-02-14):

**P0 - Immediate Blockers** (prevents clean Manifest adoption):
1. **P0-1**: Database UUID Policy Violations - 3 models use `cuid()` instead of `gen_random_uuid()` (0.5 days)
2. **P0-2**: Missing Foreign Key Indexes - **17 FK columns** across 10 tables need indexes for JOIN performance (1 day)
3. **P0-3**: Import Path Migration - **55 deprecated imports** across 55 files (1-2 days)
4. **P0-4**: Manifest Doc Cleanup - Archive test result files (0.5 days)

**P1 - High Priority** (Manifest completeness):
1. ✅ **P1-1**: Wire Telemetry Hooks to Sentry - **COMPLETE** (2026-02-14)
2. **P1-2**: Add Missing Load/Sync Functions - RecipeVersion, Ingredient, RecipeIngredient (0.5 days)
3. **P1-3**: Migrate Legacy Task Routes - **42 routes** bypassing Manifest with direct Prisma (5 days)
4. **P1-4**: Migrate Legacy PrepList Routes - **7 routes** including **CRITICAL raw SQL** in `[id]/route.ts` (4 days)
5. **P1-5**: Missing Manifest Commands - create/delete for all 12 entities + MenuDish operations (5 days)
6. **P1-6**: Soft Delete Cascade Strategy - Architectural decision needed (3 days)

**Specs Summary** (verified 2026-02-13 via 8-agent comprehensive analysis):
- **60 total spec folders**
- **9 COMPLETE** (analytics-x3, hydration-resistance, performance-enhancements, kitchen-x3, bundle_implementation)
- **1 INPROGRESS** (manifest-integration_INPROGRESS)
- **46 TODO** (named with _TODO suffix)
- **3 No Status** (command-board/, manifest-entity-routing/, manifest-structure/)

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
| **Telemetry** | Sentry Integration | ✅ P1-1 COMPLETE | Telemetry wired centrally in manifest runtime - 2026-02-14 |

### Pending Features

#### P0 - Critical (Immediate Blockers)

| # | Feature | Status | Files Affected | Effort |
|---|---------|--------|----------------|--------|
| P0-1 | **UUID Policy Violations** | NOT STARTED | 3 models (OutboxEvent, Menu, MenuDish) | 0.5 days |
| P0-2 | **Missing FK Indexes** | NOT STARTED | **17 FK columns** across 10 tables | 1 day |
| P0-3 | **Import Path Migration** | NOT STARTED | **55 deprecated imports** (55 files) | 1-2 days |
| P0-4 | **Doc Cleanup** | NOT STARTED | 3 test result files to archive | 0.5 days |

#### P1 - High (Manifest Completeness)

| # | Feature | Status | Files Affected | Effort |
|---|---------|--------|----------------|--------|
| P1-1 | **Wire Telemetry to Sentry** | ✅ **COMPLETE** | Wired centrally in manifest-runtime.ts | 1 day |
| P1-2 | **Add Missing Load/Sync Functions** | NOT STARTED | 3 entities (RecipeVersion, Ingredient, RecipeIngredient) | 0.5 days |
| P1-3 | **Migrate Legacy Routes** | NOT STARTED | **42 routes** with direct Prisma CRUD | 5 days |
| P1-4 | **Migrate Legacy PrepList Routes** | NOT STARTED | **7 routes** including raw SQL | 4 days |
| P1-5 | **Missing Manifest Commands** | NOT STARTED | All 12 entities need create/delete | 5 days |
| P1-6 | **Soft Delete Cascade Strategy** | NOT STARTED | Architectural decision needed | 3 days |

#### P2 - Medium (Polish)

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| P2-1 | ~~Kitchen Ops Rules & Overrides Spec~~ | ✅ COMPLETE | Implemented 2025-02-06 |
| P2-2 | Multi-Entity Runtime | NOT STARTED | Registry pattern for all 6 entities |
| P2-3 | Type Generation from IR | NOT STARTED | CLI command for auto-generated types |

---

## Implementation Details

### ✅ P1-1: Wire Telemetry Hooks to Sentry - COMPLETE (2026-02-14)

**Implementation Summary**:
- Telemetry wired **centrally** in `apps/api/lib/manifest-runtime.ts` via `createManifestRuntime()` factory
- ALL routes automatically get telemetry without individual changes
- Created `apps/api/lib/manifest/telemetry.ts` with `createSentryTelemetry()` providing all 3 hooks
- Uses Sentry v10 API: `Sentry.metrics.count()` with `attributes` (not deprecated `tags`)

**Metrics Emitted**:
- `manifest.constraint.evaluated` - All constraint evaluations with severity/outcome
- `manifest.override.applied` - Constraint overrides with reason tracking
- `manifest.command.executed` - Successful command executions
- `manifest.command.failed` - Failed command executions with error types
- `manifest.constraint.blocked` - Blocked operations by severity
- `manifest.constraint.warned` - Warning-level constraint violations

**Pre-existing Bug Fixed**:
Fixed broken Sentry imports in 9 files that referenced `Sentry.logger` without importing Sentry namespace:
- `packages/manifest-adapters/src/event-import-runtime.ts`
- `apps/api/app/api/kitchen/overrides/route.ts`
- `apps/app/app/(authenticated)/kitchen/allergens/page.tsx`
- `apps/app/app/(authenticated)/kitchen/waste/waste-entries-client.tsx`
- `apps/app/app/(authenticated)/kitchen/waste/lib/waste-analytics.ts`
- `apps/app/app/(authenticated)/kitchen/lib/use-suggestions.ts`
- `apps/app/app/(authenticated)/kitchen/production-board-realtime.tsx`
- `apps/app/app/(authenticated)/kitchen/prep-lists/actions-manifest.ts`
- `apps/app/app/(authenticated)/kitchen/recipes/actions-manifest-v2.ts`
- `apps/app/app/(authenticated)/kitchen/recipes/actions-manifest.ts`

### P0-3: Import Path Migration (55 files)

**Impact**: HIGH - Deprecated imports affect 55 files across command routes and list routes

**Import Analysis**:
- **Modern `@repo/*` imports**: 389 occurrences in 319 files (PREFERRED)
- **Deprecated `@/lib/*` imports**: 55 unique files (NEED MIGRATION)

**Deprecated Import Breakdown**:
| Pattern | Files Affected | Replacement |
|---------|---------------|-------------|
| `@/lib/manifest-response` + `@/lib/manifest-runtime` | 44 | `@repo/manifest-adapters` (command routes) |
| `@/lib/manifest-response` + `@/lib/database` | 12 | `@repo/manifest-adapters` + `@repo/database` (list routes) |

**Action**:
1. Replace `from "@/lib/manifest-response"` with `from "@repo/manifest-adapters/route-helpers"`
2. Replace `from "@/lib/manifest-runtime"` with `from "@repo/manifest-adapters"`
3. Replace `from "@/lib/database"` with `from "@repo/database"`

**Estimated Effort**: 1-2 days (batch replace + verify build)

### P0-1: Database UUID Policy Violation

**Impact**: CRITICAL - Violates CLAUDE.md policy "UUIDs: gen_random_uuid() only"

**Files with cuid() instead of gen_random_uuid()**:
| Model | Location | Current | Required |
|-------|----------|---------|----------|
| Menu | schema.prisma:951 | `@default(cuid())` | `@default(dbgenerated("gen_random_uuid()"))` |
| MenuDish | schema.prisma:973 | `@default(cuid())` | `@default(dbgenerated("gen_random_uuid()"))` |
| OutboxEvent | schema.prisma:2994 | `@default(cuid())` | `@default(dbgenerated("gen_random_uuid()"))` |

**Action**:
1. Update schema.prisma for Menu, MenuDish, and OutboxEvent
2. Create Prisma migration
3. Run `pnpm migrate` and `pnpm db:deploy`

**Estimated Effort**: 0.5 days

### P0-2: Missing Foreign Key Indexes

**Impact**: CRITICAL - Missing indexes on 17 FK columns across 10 tables

**Missing Indexes**:
- **Tenant Kitchen**: `prep_list_items.recipe_version_id`, `prep_list_items.dish_id`, `prep_list_items.completed_by`
- **Tenant Kitchen**: `prep_comments.task_id`, `prep_comments.employee_id`, `prep_comments.resolved_by`
- **Tenant Events**: `event_staff_assignments.event_id`, `event_staff_assignments.employee_id`
- **Tenant Events**: `event_timeline.event_id`
- **Tenant Events**: `event_dishes.event_id`, `event_dishes.dish_id`
- **Tenant Events**: `catering_orders.customer_id`, `catering_orders.event_id`
- **Tenant CRM**: `client_preferences.client_id`, `client_contacts.client_id`
- **Tenant CRM**: `client_interactions.client_id`, `client_interactions.lead_id`
- **Tenant CRM**: `proposals.client_id`, `proposals.lead_id`, `proposals.event_id`

**Estimated Effort**: 1 day

### P1-2: Add Missing Load/Sync Functions

**Impact**: MEDIUM - 3 entities missing load/sync functions

**Missing Load/Sync Functions**:
| Entity | PrismaStore Class | Missing Functions |
|--------|-------------------|-------------------|
| RecipeVersion | ✅ `RecipeVersionPrismaStore` | ⚠️ loadRecipeVersionFromPrisma, syncRecipeVersionToPrisma |
| Ingredient | ✅ `IngredientPrismaStore` | ⚠️ loadIngredientFromPrisma, syncIngredientToPrisma |
| RecipeIngredient | ✅ `RecipeIngredientPrismaStore` | ⚠️ loadRecipeIngredientFromPrisma, syncRecipeIngredientToPrisma |

**Estimated Effort**: 0.5 days

### P1-3: Migrate Legacy Task Routes (42 routes)

**Impact**: HIGH - Core kitchen operations bypass Manifest constraints

**Current State**:
- Direct Prisma updates (`database.kitchenTask.create/update()`)
- Outbox events created manually after CRUD
- No constraint validation

**Target**: Use `createPrepTaskRuntime()` + `runCommand()` for all state changes

**Estimated Effort**: 5 days

### P1-4: Migrate Legacy PrepList Routes (7 routes)

**Impact**: HIGH - Core kitchen operations bypass Manifest constraints, includes CRITICAL raw SQL

**Files with Raw SQL**:
- `apps/api/app/api/kitchen/prep-lists/[id]/route.ts` (uses `$queryRaw`, `$queryRawUnsafe`, `$executeRaw`)
- Other prep-list routes bypass Manifest

**Target**: Use `createPrepListRuntime()` + `runCommand()` for all state changes

**Estimated Effort**: 4 days

### P1-5: Missing Manifest Commands

**Impact**: HIGH - Cannot create/delete entities through Manifest

**Critical Missing for Kitchen Ops**:
1. **All entities**: `create` command for full lifecycle management
2. **All entities**: `delete` command (except PrepTask which has `cancel`)
3. **MenuDish**: `addDish`, `removeDish`, `reorderDishes` - essential for menu management
4. **PrepListItem**: `create`, `delete` - essential for prep list building

**Orphan Events (Events defined but no command emits them)**:
- `MenuCreated` / `MenuDishAdded` / `MenuDishRemoved` / `MenuDishesReordered`
- `RecipeCreated` / `RecipeVersionRestored`
- `PrepListCreated` / `PrepListItemCreated`
- `DishCreated` / `IngredientCreated`

**Estimated Effort**: 5 days (includes manifest updates + route generation)

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
✅ P1-1 (Telemetry) ──────────────────> COMPLETE (2026-02-14)

P0-3 (Import Migration) ──┬──────> P1-3 (Task Routes)
                          │
P0-1 (DB UUID) ───────────┼──────> Independent (blocks production)
                          │
P0-2 (FK Indexes) ────────┼──────> Independent (blocks production)
                          │
P0-4 (Doc Cleanup) ───────┴──────> Independent

P1-2 (Load/Sync) ─────────────────> Independent
                                     │
P1-5 (Missing Commands) ─────────────┴─> P2-2 (Multi-Entity)
```

---

## Effort Summary

| Priority | Total Effort | Tasks | Complete |
|----------|--------------|-------|----------|
| P0 | **4-5 days** | 4 tasks | 0/4 |
| P1 | **17.5 days** | 6 tasks | **1/6** ✅ |
| P2 | Varies | 3 tasks | 0/3 |
| **Total** | **~21.5-22.5 days** | **13 core tasks** | **1/13** |

---

## Recommended Execution Order

1. ✅ **Phase 1** (1 day): P1-1 (Wire Telemetry to Sentry) - **COMPLETE 2026-02-14**
2. **Phase 2** (1-2 days): P0-3 (Import Path Migration - 55 files batch replace)
3. **Phase 3** (0.5 days): P1-2 (Add Missing Load/Sync Functions - 3 entities)
4. **Phase 4** (1.5 days): P0-1 + P0-2 (Database UUID + FK Indexes)
5. **Phase 5** (0.5 days): P0-4 (Doc Cleanup)
6. **Phase 6** (5 days): P1-5 (Missing Manifest Commands)
7. **Phase 7** (9 days): P1-3 (Task Routes) + P1-4 (PrepList Routes)
8. **Phase 8** (3 days): P1-6 (Soft Delete Cascade Strategy)
9. **Phase 9+**: P2 polish items + P3 feature specs

---

## Next Steps

1. ✅ **P1-1**: Wire Telemetry to Sentry - **COMPLETE 2026-02-14**
2. **P0-3**: Import Path Migration (replace 55 deprecated imports - batch operation)
3. **P1-2**: Add Missing Load/Sync Functions (RecipeVersion, Ingredient, RecipeIngredient)
4. **P0-1**: UUID Policy Violations (fix 3 models)
5. **P0-2**: Database FK Indexes (add 17 indexes across 10 tables)
6. **P1-5**: Add create/delete commands to all 12 entities

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
