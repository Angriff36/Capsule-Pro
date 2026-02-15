# Capsule-Pro Implementation Plan

**Last Updated**: 2026-02-15
**Goal**: KitchenTask Manifest Integration (Phase 1)
**Branch**: manifest-.3

---

## Completed

- [x] `kitchen-task-rules.manifest` (11 commands) at `packages/manifest-adapters/manifests/`
- [x] `ENTITY_TO_MANIFEST["KitchenTask"]` mapping in `apps/api/lib/manifest-runtime.ts:73`
- [x] `KitchenTask` Prisma model in `packages/database/prisma/schema.prisma:170-190`
- [x] `KitchenTaskClaim` Prisma model in `packages/database/prisma/schema.prisma:234-251`
- [x] `KitchenTaskProgress` Prisma model in `packages/database/prisma/schema.prisma:253-272`
- [x] Command routes: `claim/route.ts`, `release/route.ts` at `apps/api/app/api/kitchen/kitchen-tasks/commands/`

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

**Directory**: `apps/api/app/api/kitchen/kitchen-tasks/commands/`
**Template**: Use `claim/route.ts` as template

| Route | Command | Body Params | Status |
|-------|---------|-------------|--------|
| `start/route.ts` | start | `{ id, userId }` | [ ] TODO |
| `complete/route.ts` | complete | `{ id, userId }` | [ ] TODO |
| `reassign/route.ts` | reassign | `{ id, newUserId, requestedBy }` | [ ] TODO |
| `update-priority/route.ts` | updatePriority | `{ id, priority }` | [ ] TODO |
| `update-complexity/route.ts` | updateComplexity | `{ id, complexity }` | [ ] TODO |
| `add-tag/route.ts` | addTag | `{ id, tag }` | [ ] TODO |
| `remove-tag/route.ts` | removeTag | `{ id, tag }` | [ ] TODO |
| `cancel/route.ts` | cancel | `{ id, reason, canceledBy }` | [ ] TODO |
| `create/route.ts` | create | `{ title, summary, priority, complexity, tags, dueDate }` | [ ] TODO |

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

---
