# Capsule-Pro Implementation Plan

**Last Updated**: 2026-02-15
**Goal**: Manifest Integration - Phase 1-7 (25 Manifests)
**Branch**: manifest-.3
**Tag**: v0.5.5

---

## Completed (v0.5.5) - Generated API Routes

### Generated Manifest Command Handlers

Added 160+ auto-generated API route handlers for all Phase 1-7 manifest entities:

- **Collaboration**: notifications (4 commands), workflows (4 commands)
- **Command Board**: boards (4), cards (5), connections (2), groups (3), layouts (3)
- **CRM**: clients (4), leads (5), proposals (8), client-contacts (4), client-interactions (3), client-preferences (3), proposal-line-items (3)
- **Events**: events (10), battle-boards (7), budgets (4), catering-orders (6), reports (4), profitability (3), summaries (3)
- **Inventory**: purchase-orders (8), purchase-order-items (3), shipments (7), shipment-items (2), suppliers (3), transactions (1), cycle-count sessions (5), cycle-count records (3), variance-reports (3)
- **Staff**: employees (5), schedules (4), shifts (3), timecard entries (3), timecard edit-requests (3)
- **Kitchen**: containers (3), prep-comments (4), prep-methods (3)

### Fixed List Route Imports

- Updated kitchen list routes to use @/lib/* imports instead of @repo/*
- Fixed CLI generate command import path
- Fixed generate.mjs script for Windows compatibility (shell: true on win32)

### Added Generic Manifest Handler

- Added apps/api/lib/manifest-command-handler.ts - reusable handler for manifest commands

### Build Status

- Build: PASSED (21 tasks)
- API Tests: 672 passed (1 skipped)

---

## Completed (v0.5.4) - Build Fixes

### Critical Fix: Restored manifest-runtime dist folder

- The vendored `packages/manifest-runtime/dist/` folder was accidentally deleted
- Restored from git (dist must be committed per .gitignore)
- Added vitest.config.ts for manifest-runtime (tests disabled for vendored package)

### Fixed scripts/manifest/generate.mjs

- Fixed CLI invocation to run from correct directory
- Updated to use `pnpm -C <dir> exec tsx` pattern for proper module resolution

### Build Status

- Build: PASSED (19 tasks)
- API Tests: 672 passed (1 skipped)
- Note: Turbo caching may cause intermittent test failures; direct test run passes

---

## Completed (v0.5.2)

### Phase 1-7 Manifest Files (25 new files)

| Phase | Manifest Files | Entities |
|-------|---------------|----------|
| Phase 1: Kitchen Ops | prep-comment, ingredient, dish, container, prep-method | ~10 |
| Phase 2: Events | event, event-report, event-budget, catering-order, battle-board | ~12 |
| Phase 3: CRM & Sales | client, lead, proposal, client-interaction | ~8 |
| Phase 4: Purchasing | purchase-order, shipment, inventory-transaction, inventory-supplier, cycle-count | ~14 |
| Phase 5: Staff | user, schedule, time-entry | ~6 |
| Phase 6: Command Board | command-board | ~5 |
| Phase 7: Workflows | workflow, notification | ~3 |

All wired into `ENTITY_TO_MANIFEST` mapping and `create*Runtime` helpers.

### Reserved Word Fixes

All manifest DSL reserved word issues resolved:
- `delete` → `softDelete` or `remove`
- `publish` → `release`
- `not in` → negated constraint

### PrismaJsonStore Generic Adapter

- New `PrismaJsonStore` class for entities without hand-written stores
- `ManifestEntity` + `ManifestIdempotency` models added to Prisma schema
- Fallback store provider for all 25+ new entities

### State Machine Enrichment (10 new commands)

- CateringOrder: startPrep, markComplete
- Event: confirm (draft → confirmed)
- EventBudget: approve (draft → approved)
- BattleBoard: open, startVoting
- CycleCountSession: finalize
- Shipment: schedule, startPreparing, ship
- CommandBoard: activate

### Test Coverage

- 672 tests passing
- `manifest-all-phases-compilation.test.ts` validates all 25 manifests

---

## Previous (v0.5.1)

- [x] `kitchen-task-rules.manifest` (11 commands) at `packages/manifest-adapters/manifests/`
- [x] `ENTITY_TO_MANIFEST["KitchenTask"]` mapping in `apps/api/lib/manifest-runtime.ts:73`
- [x] `KitchenTask` Prisma model in `packages/database/prisma/schema.prisma:170-190`
- [x] `KitchenTaskClaim` Prisma model in `packages/database/prisma/schema.prisma:234-251`
- [x] `KitchenTaskProgress` Prisma model in `packages/database/prisma/schema.prisma:253-272`
- [x] All 11 command routes at `apps/api/app/api/kitchen/kitchen-tasks/commands/`:
  - claim, release, start, complete, reassign
  - update-priority, update-complexity
  - add-tag, remove-tag, cancel, create

---

## Task 1: KitchenTaskPrismaStore (P0 - BLOCKER)

**Status**: COMPLETED ✓
**File**: `packages/manifest-adapters/src/prisma-store.ts` (lines 849-969)

- KitchenTaskPrismaStore class implemented with full CRUD
- Registered in createPrismaStoreProvider()
- Helper functions loadKitchenTaskFromPrisma and syncKitchenTaskToPrisma added

---

## Task 2: createKitchenTaskRuntime Helper (P1)

**Status**: COMPLETED ✓
**File**: `apps/api/lib/manifest-runtime.ts` (lines 313-319)

Added createKitchenTaskRuntime function that creates a manifest runtime for kitchen-task-rules.

---

## Task 3: Command Routes (P1)

**Status**: COMPLETED ✓
**Directory**: `apps/api/app/api/kitchen/kitchen-tasks/commands/`
**Template**: Used `claim/route.ts` as template

| Route | Command | Body Params | Status |
|-------|---------|-------------|--------|
| `start/route.ts` | start | `{ id, userId }` | [x] DONE |
| `complete/route.ts` | complete | `{ id, userId }` | [x] DONE |
| `reassign/route.ts` | reassign | `{ id, newUserId, requestedBy }` | [x] DONE |
| `update-priority/route.ts` | updatePriority | `{ id, priority }` | [x] DONE |
| `update-complexity/route.ts` | updateComplexity | `{ id, complexity }` | [x] DONE |
| `add-tag/route.ts` | addTag | `{ id, tag }` | [x] DONE |
| `remove-tag/route.ts` | removeTag | `{ id, tag }` | [x] DONE |
| `cancel/route.ts` | cancel | `{ id, reason, canceledBy }` | [x] DONE |
| `create/route.ts` | create | `{ title, summary, priority, complexity, tags, dueDate }` | [x] DONE |

---

## Dependencies

```
Task 1 (Store) -> Task 2 (Helper) -> Task 3 (Routes)
```

---

## Validation

```bash
pnpm install && pnpm lint && pnpm build
```

**Last Validation**: 2026-02-15
- Build: PASSED ✓
- Lint: Pre-existing errors (468 errors across codebase, not related to changes)
- Prisma generate: PASSED ✓

---

## Additional Work (v0.5.1)

### Phase 1-7 Manifest Files (25 new files)

Added 25 manifest files for comprehensive entity coverage:

| Phase | Manifest Files | Entities |
|-------|---------------|----------|
| Phase 1: Kitchen Ops | prep-comment, ingredient, dish, container, prep-method | ~10 |
| Phase 2: Events | event, event-report, event-budget, catering-order, battle-board | ~12 |
| Phase 3: CRM & Sales | client, lead, proposal, client-interaction | ~8 |
| Phase 4: Purchasing | purchase-order, shipment, inventory-transaction, inventory-supplier, cycle-count | ~14 |
| Phase 5: Staff | user, schedule, time-entry | ~6 |
| Phase 6: Command Board | command-board | ~5 |
| Phase 7: Workflows | workflow, notification | ~3 |

All wired into `ENTITY_TO_MANIFEST` mapping and `create*Runtime` helpers.

Build: PASSED ✓

---

## Summary

All Phase 1 KitchenTask Manifest Integration tasks completed:
- KitchenTaskPrismaStore with full CRUD
- createKitchenTaskRuntime helper
- 11 command routes (claim, release, start, complete, reassign, update-priority, update-complexity, add-tag, remove-tag, cancel, create)
- 25 additional manifest files for Phases 1-7

Branch ready for merge to main.
