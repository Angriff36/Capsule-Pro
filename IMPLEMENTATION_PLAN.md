# Capsule-Pro Implementation Plan

**Last Updated**: 2026-02-14 (P1-2 Load/Sync Functions Complete)
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
- **Prisma Stores**: ALL 12 entities have PrismaStore implementations (9 with sync functions, 3 missing load/sync)
- **Load/Sync Functions**: P1-2 COMPLETE - All 12 entities now have load/sync functions (2026-02-14)
- **Telemetry**: P1-1 COMPLETE - Sentry telemetry wired centrally in manifest runtime (2026-02-14)
- **Import Migration**: P0-3 PARTIAL - 67/110 deprecated imports migrated (2026-02-14)

### What Needs Work

**Manifest Migration Status** (updated 2026-02-14 after P0-3 partial completion):
- **Deprecated Import Occurrences** (in `apps/api/app/api/kitchen/` only):
  - `@/lib/manifest-response`: 0 remaining (was 55, all migrated to `@repo/manifest-adapters/route-helpers`)
  - `@/lib/database`: 0 remaining (was 12, all migrated to `@repo/database`)
  - `@/lib/manifest-runtime`: 43 files still using (VALID local imports to `apps/api/lib/manifest-runtime.ts` - NOT deprecated)
  - **Total unique files with deprecated @/lib imports: 0** (down from 55, 67 imports migrated)
- **42 routes bypass Manifest** with direct Prisma operations (42 direct Prisma, not 7)
- **14 files using raw SQL** (`$queryRaw`/`$executeRaw`) - security/performance risk
- **3 UUID policy violations** - OutboxEvent, Menu, MenuDish use `cuid()` instead of `gen_random_uuid()`

**Critical Path** (Updated 2026-02-14):

**P0 - Immediate Blockers** (prevents clean Manifest adoption):
1. **P0-1**: Database UUID Policy Violations - 3 models use `cuid()` instead of `gen_random_uuid()` (0.5 days)
2. **P0-2**: Missing Foreign Key Indexes - **17 FK columns** across 10 tables need indexes for JOIN performance (1 day)
3. ✅ **P0-3**: Import Path Migration - **PARTIAL COMPLETE** - 67/110 deprecated imports migrated (2026-02-14)
4. **P0-4**: Manifest Doc Cleanup - Archive test result files (0.5 days)

**P1 - High Priority** (Manifest completeness):
1. ✅ **P1-1**: Wire Telemetry Hooks to Sentry - **COMPLETE** (2026-02-14)
2. ✅ **P1-2**: Add Missing Load/Sync Functions - **COMPLETE** (2026-02-14)
3. **P1-3**: Migrate Legacy Task Routes - **42 routes** bypassing Manifest with direct Prisma (5 days)
4. **P1-4**: Migrate Legacy PrepList Routes - **7 routes** including **CRITICAL raw SQL** in `[id]/route.ts` (4 days)
5. **P1-5**: Missing Manifest Commands - create/delete for all 12 entities + MenuDish operations (5 days)
6. **P1-6**: Soft Delete Cascade Strategy - Architectural decision needed (3 days)

**Specs Summary**: 60 total (9 complete, 1 in-progress, 46 TODO, 3 no status)

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

### Pending Features

#### P0 - Critical (Immediate Blockers)

| # | Feature | Status | Files Affected | Effort |
|---|---------|--------|----------------|--------|
| P0-1 | **UUID Policy Violations** | NOT STARTED | 3 models (OutboxEvent, Menu, MenuDish) | 0.5 days |
| P0-2 | **Missing FK Indexes** | NOT STARTED | **17 FK columns** across 10 tables | 1 day |
| P0-3 | **Import Path Migration** | ✅ **PARTIAL** | 67/110 imports migrated (manifest-response + database done) | 0 days remaining |
| P0-4 | **Doc Cleanup** | NOT STARTED | 3 test result files to archive | 0.5 days |

#### P1 - High (Manifest Completeness)

| # | Feature | Status | Files Affected | Effort |
|---|---------|--------|----------------|--------|
| P1-1 | **Wire Telemetry to Sentry** | ✅ **COMPLETE** | Wired centrally in manifest-runtime.ts | 1 day |
| P1-2 | **Add Missing Load/Sync Functions** | ✅ **COMPLETE** | 3 entities (RecipeVersion, Ingredient, RecipeIngredient) | 0.5 days |
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

### ✅ P1-1: Telemetry - COMPLETE (2026-02-14)
Wired centrally in manifest-runtime.ts, created telemetry.ts with Sentry v10 API, 6 metrics (constraint.evaluated, override.applied, command.executed/failed, constraint.blocked/warned), fixed 10 broken imports.

### ✅ P0-3: Import Migration - PARTIAL (2026-02-14)
67/110 deprecated imports migrated: manifest-response→@repo/manifest-adapters/route-helpers (55 files), database→@repo/database (12 files). Response format changed: manifestSuccessResponse now wraps data in {success: true, data: T}. 3 test assertions updated. @/lib/manifest-runtime stays (310-line local factory with IR compilation, Sentry, outbox - NOT deprecated shim).

### ✅ P1-2: Load/Sync Functions - COMPLETE (2026-02-14)
Added load/sync functions for RecipeVersion, Ingredient, RecipeIngredient in prisma-store.ts. Also exported all 12 PrismaStore classes and all 12 load/sync function pairs from index.ts (previously only 9 were exported). Pattern: loadXFromPrisma delegates to Store.getById(), syncXToPrisma uses upsert (findFirst + create/update).

### P0-1: UUID Policy (0.5d)
Menu, MenuDish, OutboxEvent use cuid() instead of gen_random_uuid() - violates CLAUDE.md policy.

### P0-2: FK Indexes (1d)
17 FK columns across 10 tables missing indexes: Kitchen (prep_list_items, prep_comments), Events (4 tables), CRM (3 tables).

### ✅ P1-2: Load/Sync - COMPLETE (2026-02-14)
Added 6 functions (3 load + 3 sync) for RecipeVersion, Ingredient, RecipeIngredient. All 12 PrismaStore classes + 24 load/sync functions now exported from @repo/manifest-adapters.

### P1-3: Task Routes (5d)
42 routes bypass Manifest with direct Prisma, manual outbox, no constraint validation. Target: createPrepTaskRuntime() + runCommand().

### P1-4: PrepList Routes (4d)
7 routes bypass Manifest, CRITICAL raw SQL in prep-lists/[id]/route.ts ($queryRaw, $queryRawUnsafe, $executeRaw). Target: createPrepListRuntime() + runCommand().

### P1-5: Commands (5d)
Missing create/delete for all 12 entities, MenuDish operations, PrepListItem operations. 11 orphan events defined but not emitted.

---

## Validation

`pnpm install && pnpm lint && pnpm format && pnpm test && pnpm build && pnpm boundaries && pnpm migrate`

---

## Dependencies

✅ P1-1, P0-3 Complete | P0-1, P0-2, P0-4 Independent | P1-2 → P1-5 → P2-2

---

## Effort Summary

| Priority | Total Effort | Tasks | Complete |
|----------|--------------|-------|----------|
| P0 | **2 days** | 4 tasks | **1/4** ✅ |
| P1 | **17.5 days** | 6 tasks | **2/6** ✅ |
| P2 | Varies | 3 tasks | 0/3 |
| **Total** | **~19.5 days** | **13 core tasks** | **3/13** |

---

## Execution Order

1-3. ✅ P1-1, P0-3, P1-2 Complete | 4. P0-1+P0-2 (1.5d) | 5. P0-4 (0.5d) | 6. P1-5 (5d) | 7. P1-3+P1-4 (9d) | 8. P1-6 (3d) | 9+. P2/P3

---

## Next Steps

1. ✅ **P1-1**: Wire Telemetry to Sentry - **COMPLETE 2026-02-14**
2. ✅ **P0-3**: Import Path Migration - **PARTIAL COMPLETE 2026-02-14** (67/110 deprecated imports migrated)
3. ✅ **P1-2**: Add Missing Load/Sync Functions - **COMPLETE 2026-02-14**
4. **P0-1**: UUID Policy Violations (fix 3 models)
5. **P0-2**: Database FK Indexes (add 17 indexes across 10 tables)
6. **P1-5**: Add create/delete commands to all 12 entities

---

## Manifest Statistics

6 manifest files, 12 entities, 34 commands, 64 constraints, 55 events, 18 policies, 12 PrismaStore implementations, 24 load/sync functions (all exported from @repo/manifest-adapters)
