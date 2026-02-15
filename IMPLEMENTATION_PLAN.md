# Capsule-Pro Implementation Plan

**Last Updated**: 2026-02-15
**Goal**: Manifest Integration - Phase 1-7 (25 Manifests)
**Branch**: manifest-.3
**Tag**: v0.5.2

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
