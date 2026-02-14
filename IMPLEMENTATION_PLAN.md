# Capsule-Pro Implementation Plan

**Last Updated**: 2026-02-14 (P1-5 Create Commands + IR Contract Fixes)
**Build Status**: ✅ PASSING
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
- **Prisma Stores**: ALL 12 entities have PrismaStore implementations + load/sync functions
- **Telemetry**: P1-1 COMPLETE - Sentry telemetry wired centrally in manifest runtime (2026-02-14)
- **Import Migration**: P0-3 PARTIAL - 67/110 deprecated imports migrated (2026-02-14)
- **UUID Policy**: P0-1 COMPLETE - Menu, MenuDish, OutboxEvent migrated from cuid() to gen_random_uuid() (2026-02-14)
- **FK Indexes**: P0-2 COMPLETE - 16 FK indexes added across 10 tables (2026-02-14)

### What Needs Work

**Manifest Migration Status** (updated 2026-02-14):
- **Deprecated Import Occurrences**: 0 remaining (67 migrated)
- **42 routes bypass Manifest** with direct Prisma operations
- **14 files using raw SQL** (`$queryRaw`/`$executeRaw`) - security/performance risk

**Critical Path** (Updated 2026-02-14):

**P0 - Immediate Blockers** (prevents clean Manifest adoption):
1. ✅ **P0-1**: Database UUID Policy Violations - **COMPLETE** (2026-02-14)
2. ✅ **P0-2**: Missing Foreign Key Indexes - **COMPLETE** (2026-02-14)
3. ✅ **P0-3**: Import Path Migration - **PARTIAL COMPLETE** (2026-02-14)
4. **P0-4**: Manifest Doc Cleanup - Archive test result files (0.5 days)

**P1 - High Priority** (Manifest completeness):
1. ✅ **P1-1**: Wire Telemetry Hooks to Sentry - **COMPLETE** (2026-02-14)
2. ✅ **P1-2**: Add Missing Load/Sync Functions - **COMPLETE** (2026-02-14)
3. **P1-3**: Migrate Legacy Task Routes - **42 routes** bypassing Manifest with direct Prisma
4. **P1-4**: Migrate Legacy PrepList Routes - **7 routes** including **CRITICAL raw SQL** in `[id]/route.ts`
5. **P1-5**: Missing Manifest Commands - **12/12 create commands added**, delete + routes pending
6. **P1-6**: Soft Delete Cascade Strategy - Architectural decision needed

---

## Status Summary

### Completed Features ✅

| Category | Feature | Status | Notes |
|----------|---------|--------|-------|
| **Command Board** | All 9 Features | ✅ COMPLETE | Undo/redo, auto-save, realtime, visual connectors, bulk ops |
| **Manifest Core** | 12 Entity Definitions | ✅ COMPLETE | 6 manifest files + runtime + Prisma stores |
| **Kitchen API** | 101 Route Handlers | ✅ COMPLETE | 44 Manifest command routes, 22 direct Prisma, 35 other |
| **Database** | Schema & Migrations | ✅ COMPLETE | Multi-tenant with kitchen ops support |
| **Runtime** | Constraint & Events | ✅ COMPLETE | Block/warn/ok severity, outbox pattern with Ably |
| **Kitchen Ops** | Rules & Overrides | ✅ COMPLETE | Constraint severity, override workflow - 2025-02-06 |
| **Telemetry** | Sentry Integration | ✅ P1-1 COMPLETE | Wired centrally in manifest runtime - 2026-02-14 |
| **Migration** | Import Path Migration | ✅ P0-3 PARTIAL | 67/110 deprecated imports migrated - 2026-02-14 |
| **Database** | UUID Policy Fix | ✅ P0-1 COMPLETE | Menu, MenuDish, OutboxEvent → gen_random_uuid() - 2026-02-14 |
| **Database** | FK Index Coverage | ✅ P0-2 COMPLETE | 16 indexes across 10 tables - 2026-02-14 |

### Pending Features

#### P0 - Critical (Immediate Blockers)

| # | Feature | Status | Files Affected | Effort |
|---|---------|--------|----------------|--------|
| P0-1 | **UUID Policy Violations** | ✅ **COMPLETE** | 3 models fixed (2026-02-14) | Done |
| P0-2 | **Missing FK Indexes** | ✅ **COMPLETE** | 16 indexes across 10 tables (2026-02-14) | Done |
| P0-3 | **Import Path Migration** | ✅ **PARTIAL** | 67/110 imports migrated | Done |
| P0-4 | **Doc Cleanup** | NOT STARTED | 3 test result files to archive | 0.5 days |

#### P1 - High (Manifest Completeness)

| # | Feature | Status | Files Affected | Effort |
|---|---------|--------|----------------|--------|
| P1-1 | **Wire Telemetry to Sentry** | ✅ **COMPLETE** | Wired centrally in manifest-runtime.ts | Done |
| P1-2 | **Add Missing Load/Sync Functions** | ✅ **COMPLETE** | All 12 entities have load/sync | Done |
| P1-3 | **Migrate Legacy Routes** | NOT STARTED | **42 routes** with direct Prisma CRUD | 5 days |
| P1-4 | **Migrate Legacy PrepList Routes** | NOT STARTED | **7 routes** including raw SQL | 4 days |
| P1-5 | **Missing Manifest Commands** | **IN PROGRESS** | 12/12 create commands added, delete pending | 3 days remaining |
| P1-6 | **Soft Delete Cascade Strategy** | NOT STARTED | Architectural decision needed | 3 days |

#### P2 - Medium (Polish)

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| P2-1 | ~~Kitchen Ops Rules & Overrides Spec~~ | ✅ COMPLETE | Implemented 2025-02-06 |
| P2-2 | Multi-Entity Runtime | NOT STARTED | Registry pattern for all 6 entities |
| P2-3 | Type Generation from IR | NOT STARTED | CLI command for auto-generated types |

---

## Implementation Details

### ✅ P0-1: UUID Policy - COMPLETE (2026-02-14)
Changed 3 models from `@default(cuid())` to `@default(dbgenerated("gen_random_uuid()"))`: Menu (line 951), MenuDish (line 973), OutboxEvent (line 2994). OutboxEvent also gained `@db.Uuid` type annotation for consistency. Why: cuid() generates string-based IDs that are incompatible with the PostgreSQL UUID column type used across the schema, risking runtime errors and violating the CLAUDE.md database policy.

### ✅ P0-2: FK Indexes - COMPLETE (2026-02-14)
Added 16 `@@index` declarations across 10 models to cover foreign key columns used in JOINs:
- **tenant_kitchen** (3): KitchenTaskClaim.employeeId, RecipeVersion.recipeId, RecipeIngredient.recipeVersionId
- **tenant_events** (5): Event.clientId, Event.locationId, EventStaffAssignment.eventId, EventStaffAssignment.employeeId, EventTimeline.eventId
- **tenant_crm** (6): ClientContact.clientId, ClientInteraction.clientId, ClientInteraction.leadId, Proposal.clientId, Proposal.leadId, Proposal.eventId
- **tenant_inventory** (1): Shipment.locationId
- **tenant_staff** (1): User.roleId

Why: Without indexes on FK columns, JOINs and WHERE filters on these columns result in sequential table scans. With `relationMode = "prisma"`, the database doesn't auto-create FK indexes, making explicit indexes essential for query performance.

### ✅ P1-1: Telemetry - COMPLETE (2026-02-14)
Wired centrally in manifest-runtime.ts, created telemetry.ts with Sentry v10 API, 6 metrics.

### ✅ P0-3: Import Migration - PARTIAL (2026-02-14)
67/110 deprecated imports migrated. @/lib/manifest-runtime stays (NOT deprecated shim).

### ✅ P1-2: Load/Sync Functions - COMPLETE (2026-02-14)
All 12 PrismaStore classes + 24 load/sync functions exported from @repo/manifest-adapters.

### P1-3: Task Routes
42 routes bypass Manifest with direct Prisma, manual outbox, no constraint validation. Target: createPrepTaskRuntime() + runCommand().

### P1-4: PrepList Routes
7 routes bypass Manifest, CRITICAL raw SQL in prep-lists/[id]/route.ts. Target: createPrepListRuntime() + runCommand().

### P1-5: Commands - IN PROGRESS (2026-02-14)

**Create commands**: Added to all 12 entities across 6 manifest files:
- `prep-task-rules.manifest`: PrepTask.create (11 params) + PrepTaskCreated event
- `station-rules.manifest`: Station.create (6 params) + StationCreated event
- `inventory-rules.manifest`: InventoryItem.create (11 params) + InventoryItemCreated event
- `recipe-rules.manifest`: Recipe.create, Ingredient.create, RecipeIngredient.create, Dish.create + 2 new events
- `menu-rules.manifest`: Menu.create, MenuDish.create
- `prep-list-rules.manifest`: PrepList.create, PrepListItem.create

**Adapter updates**: 4 create functions (createDish, createRecipe, createMenu, createPrepList) migrated from `engine.createInstance()` to `engine.runCommand("create", ...)` for full constraint/event pipeline.

**IR contract fix**: Enhanced `ir-contract.ts` `inferOwnerEntityName()` with parameter-matching and event-name heuristics to disambiguate same-named commands (e.g., `create`) across multiple entities in the same manifest. Previously, only a hardcoded `KNOWN_COMMAND_OWNERS` map was used, which failed for duplicate command names.

**Remaining**: Delete commands (soft-delete pattern per P1-6), API route handlers for create endpoints.

---

## Validation

`pnpm install && pnpm lint && pnpm format && pnpm test && pnpm build && pnpm boundaries && pnpm migrate`

---

## Dependencies

✅ P0-1, P0-2, P0-3, P1-1, P1-2 Complete | P0-4 Independent | P1-5 → P2-2

---

## Effort Summary

| Priority | Total Effort | Tasks | Complete |
|----------|--------------|-------|----------|
| P0 | **2 days** | 4 tasks | **3/4** ✅ |
| P1 | **17.5 days** | 6 tasks | **2/6** ✅ |
| P2 | Varies | 3 tasks | 0/3 |
| **Total** | **~19.5 days** | **13 core tasks** | **5/13** |

---

## Execution Order

1-5. ✅ P1-1, P0-3, P1-2, P0-1, P0-2 Complete | 6. P0-4 (0.5d) | 7. P1-5 (5d) | 8. P1-3+P1-4 (9d) | 9. P1-6 (3d) | 10+. P2/P3

---

## Next Steps

1. **P0-4**: Manifest Doc Cleanup (archive test result files)
2. **P1-5**: Add create/delete commands to all 12 entities
3. **P1-3**: Migrate Legacy Task Routes (42 routes)
4. **P1-4**: Migrate Legacy PrepList Routes (7 routes with raw SQL)

---

## Manifest Statistics

6 manifest files, 12 entities, 46 commands (+12 create), 64 constraints, 58 events (+3 new), 18 policies, 12 PrismaStore implementations, 24 load/sync functions (all exported from @repo/manifest-adapters)
