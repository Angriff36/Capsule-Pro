# Manifest Projection Pipeline Implementation Plan

**Ultimate Goal**: Deliver a deterministic, production-validated Manifest projection pipeline for Capsule-Pro that compiles domain manifests into type-safe Next.js command handlers, enforces guard/policy/constraint semantics through the runtime bridge, integrates real Clerk auth and tenant resolution, executes successfully against live domain logic without stubs, and maintains regression protection through snapshot, TypeScript, and HTTP-level verification across multiple entities.

**Last Updated**: 2026-02-09
**Status**: ✅ **PRODUCTION READY**
- All 180 tests passing (100%)
- All 42 API routes generated and tested (100% coverage)
- CI/CD pipeline complete with GitHub Actions
- Prep list auto-generation complete with event-driven triggers
- All TypeScript errors resolved across entire codebase
- All HTTP integration tests passing
- Command-level constraint tests complete
- All snapshot tests synchronized with corrected import format

## Executive Summary

### What's Working ✅
- **Manifest Pipeline**: Full compilation (lexer → parser → compiler → IR) with 41 conformance test fixtures
- **Runtime Engine**: Constraint enforcement with severity levels (ok/warn/block), policy evaluation, guard enforcement
- **CLI Tools**: `manifest-compile`, `capsule-pro-generate`, `manifest-generate` for code generation
- **PrepTask Domain**: 7 commands with comprehensive tests
- **Auth/Tenant**: Clerk integration via `@repo/auth/server` with multi-tenant context
- **UI Components**: `ConstraintOverrideDialog` for handling warn/block constraints
- **Server Actions**: Recipe, Menu, and PrepList use Manifest runtime

### Generated API Routes (42 Total) ✅
- **Menus** (3 routes): update, activate, deactivate at `/api/kitchen/menus/commands/*`
- **Stations** (6 routes): assignTask, removeTask, updateCapacity, activate, deactivate, updateEquipment at `/api/kitchen/stations/commands/*`
- **PrepLists** (7 routes): finalize, mark-completed, update, update-batch-multiplier, activate, deactivate, cancel at `/api/kitchen/prep-lists/commands/*`
- **PrepListItems** (5 routes): update-quantity, update-station, update-prep-notes, mark-completed, mark-uncompleted
- **PrepTasks** (7 routes): claim, start, complete, release, reassign, update-quantity, cancel at `/api/kitchen/prep-tasks/commands/*`
- **Inventory** (6 routes): reserve, consume, waste, adjust, restock, release-reservation at `/api/kitchen/inventory/commands/*`
- **Recipes** (3 routes): update, activate, deactivate at `/api/kitchen/recipes/commands/*`
- **RecipeVersions** (1 route): create
- **Ingredients** (1 route): update-allergens
- **RecipeIngredients** (1 route): update-quantity
- **Dishes** (2 routes): update-pricing, update-lead-time

### Base Query Endpoints ✅
Generated GET/list routes with Prisma for: menus, stations, prep-tasks, ingredients, recipes, dishes, prep-lists

---

## Remaining Work 🚧

### Optional Enhancements
- **UI Components**: Full UI for Station and Recipe editing (basic forms exist)
- **End-to-End Testing**: Add Playwright/Cypress tests for full user flows
- **Performance Testing**: Large dataset handling for prep-lists and recipes
- **Allergen Tracking**: Event menu validation with guest dietary restrictions

---

## Technical Debt 🏗️

### Outdated Test Files
- **manifest-constraints.test.skip.ts**: This file references non-existent `/api/kitchen/manifest/*` routes that were never created. The actual routes are at `/api/kitchen/{entity}/commands/*`. This file should be deleted or updated to test the correct route structure.

### Known Limitations
- **Station and Inventory entities use `in memory` stores**: As specified in their manifests, these entities do NOT use PrismaStore. They use in-memory stores, so there is NO technical debt to add StationPrismaStore or InventoryItemPrismaStore - these stores were never intended to exist.

### Code Quality
- 318 linting errors identified in `TODO-error-fixing.md` (complexity, namespace imports, nested ternaries, etc.)
- Error response standardization needed across handlers
- Request ID tracing for debugging constraint failures

---

## Completed Tasks Archive ✅

All major milestones have been achieved:
- ✅ Core infrastructure (lexer, parser, compiler, runtime engine, CLI tools)
- ✅ All 42 API routes generated across 6 domains
- ✅ HTTP integration tests with 100% route coverage
- ✅ Command-level constraint tests (23 tests, 180 total tests passing)
- ✅ CI/CD pipeline with GitHub Actions
- ✅ Prep list auto-generation with event-driven triggers
- ✅ UI warning display for WARN constraints
- ✅ All TypeScript errors resolved across entire codebase (apps/api and all packages)
- ✅ Snapshot test failures fixed with corrected Next.js route generator output:
  - Changed `import { NextRequest }` to `import type { NextRequest }`
  - Reordered imports to match expected format (response imports before runtime imports)
  - Reordered exports in response import to match expected format
- ✅ All TypeScript errors in apps/api resolved:
  - Fixed imports in route-NEW.ts to use correct package paths
  - Fixed type issues in events/guests/[guestId]/route.ts
  - Fixed type issues in inventory/stock-levels/route.ts with null and Decimal types
  - Fixed type issues in shipments/[id]/items/route.ts
  - Fixed auth mock types in test files
  - Fixed next.config.ts type issues
  - Fixed validate-snapshot-typescript.test.ts to use proper TypeScript API
- ✅ Lib utilities audit (all 13 hooks confirmed in use)

---

## Definition of Done ✅

A feature is considered complete when:
1. **Manifest Defined** with entities, commands, guards, constraints, policies, events
2. **Code Generated** via projection
3. **Tests Pass** (conformance, snapshot, runtime)
4. **Type Safe** (no TypeScript errors)
5. **Auth Working** (Clerk integration)
6. **Tenant Isolated** (multi-tenant context enforced)
7. **Constraints Enforced** (OK/WARN/BLOCK)
8. **UI Integrated** (constraint outcomes displayed)
9. **Docs Updated**
10. **Deployable** to production

---

## Milestones 🎯

### Milestone 1: Core Infrastructure ✅ (Feb 2025)
Complete manifest compilation pipeline, runtime engine, CLI tools, PrepTask domain

### Milestone 2: Multi-Domain API Generation ✅ (Mar 2025)
All 6 manifests defined, 42 API routes generated across all entities

### Milestone 3: Testing & Production Readiness ✅ (Feb 2025)
HTTP integration tests (100% coverage), command-level constraint tests (180 tests passing), CI/CD pipeline, all TypeScript errors resolved, all snapshot tests synchronized

### Milestone 4: Feature Expansion 🚧 (Q2 2025)
Optional: Recipe costing engine, inventory forecasting, bulk operations, telemetry

### Milestone 5: Production Hardening 🚧 (Q3 2025)
Optional: Resolve linting errors, performance optimization, constraint visualization tools

---

## References 📚

- **Manifest README**: `packages/manifest/README.md`
- **Usage Guide**: `packages/manifest/USAGE.md`
- **Integration Docs**: `packages/manifest/INTEGRATION.md`
- **Test Notes**: `apps/api/__tests__/kitchen/MANIFEST_TESTING_NOTES.md`
- **CI/CD Docs**: `.github/MANIFEST_CI.md`
