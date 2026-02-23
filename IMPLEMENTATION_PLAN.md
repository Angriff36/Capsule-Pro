# Manifest Alignment Implementation Plan

> **Status:** Ready for execution (re-validated 2026-02-22)
> **Created:** 2026-02-22
> **Last Verified:** 2026-02-22 by 10 parallel exploration agents
> **Source:** Synthesized from specs/manifest/composite-routes/manifest-alignment-plan.md + codebase exploration

---

## Priority Legend

- **P0:** Blocking — must complete first, breaks core flows
- **P1:** High — significant impact, enables other work
- **P2:** Medium — important but not blocking
- **P3:** Low — cleanup, nice-to-have

---

## Unfinished Tasks (Max 12)

### [P0-1] ✅ COMPLETE — Add `restore` command to RecipeVersion entity (DSL)
- **File:** `packages/manifest-adapters/manifests/recipe-rules.manifest`
- **What:** Added `restore(sourceId: string, newVersionNum: number)` command to RecipeVersion entity (lines 136-144).
- **Completed:** 2026-02-23 — Command emits `RecipeVersionRestored` event.

### [P0-2] ✅ COMPLETE — Add transaction-aware `prismaOverride` to runtime factory
- **File:** `packages/manifest-adapters/src/manifest-runtime-factory.ts`
- **What:** Added `prismaOverride?: PrismaLike` to `CreateManifestRuntimeDeps`. When provided, ALL Prisma operations use it.
- **Completed:** 2026-02-23 — Updated 5 usage sites. Outbox skips nested `$transaction` when override provided.

### [P0-3] ✅ COMPLETE — Create version detail endpoint `[versionId]/route.ts`
- **File:** `apps/api/app/api/kitchen/recipes/[recipeId]/versions/[versionId]/route.ts` (NEW)
- **What:** GET endpoint returning `RecipeVersionDetail` with ingredients + steps.
- **Completed:** 2026-02-23 — Returns version data with joined ingredients and steps.

### [P0-4] ✅ COMPLETE — Create version compare endpoint `compare/route.ts`
- **File:** `apps/api/app/api/kitchen/recipes/[recipeId]/versions/compare/route.ts` (NEW)
- **What:** GET endpoint accepting `?from=X&to=Y`, returning field-level diff.
- **Completed:** 2026-02-23 — Compares base fields, ingredients (by ingredientId), and steps (by stepNumber). Security: both versions must belong to same recipeId AND tenantId.

### [P1-1] ✅ COMPLETE — Create composite `create-with-version` route
- **File:** `apps/api/app/api/kitchen/recipes/composite/create-with-version/route.ts` (NEW)
- **What:** POST endpoint wrapping Recipe + RecipeVersion + RecipeIngredients + RecipeSteps in single `$transaction`.
- **Completed:** 2026-02-23 — Uses `prismaOverride` for atomic multi-entity writes. Fixes cuisineType bug by using PrismaStore with correct field mapping instead of raw SQL.

### [P1-2] ✅ COMPLETE — Create composite `restore-version` route
- **File:** `apps/api/app/api/kitchen/recipes/composite/restore-version/route.ts` (NEW)
- **What:** POST endpoint using new `restore` command with `FOR UPDATE` lock on version sequence.
- **Completed:** 2026-02-23 — Uses `FOR UPDATE` lock to prevent concurrent restores, copies ingredients and steps from source version, creates new version through Manifest with constraints and outbox events. Replaces legacy raw SQL implementation.

### [P1-3] Register `suggest_manifest_plan` tool server-side
- **File:** `apps/app/app/api/command-board/chat/tool-registry.ts`
- **What:** Register tool with entity resolution logic. Wire `createPendingManifestPlan()` call after plan generation.
- **Implementation Details:**
  1. Add tool definition to `BASE_TOOL_DEFINITIONS` array (line 688+)
  2. Create async handler `suggestManifestPlanTool()` that:
     - Queries `boardProjection` table to populate `scope.entities`
     - Generates `planId` using `crypto.randomUUID()`
     - Constructs full `SuggestedManifestPlan` object
     - Calls `createPendingManifestPlan()` to persist BEFORE returning
  3. Add execution case in `executeToolCall()` (line 763-841)
  4. Import `createPendingManifestPlan` from `@/app/lib/command-board/manifest-plans`
- **Rationale:** High impact — UI renders tool output but `entities: []` because only 3 base tools registered (read_board_state, detect_conflicts, execute_manifest_command). `createPendingManifestPlan` exists in manifest-plans.ts but unwired.

### [P1-4] ✅ COMPLETE — Create composite `update-with-version` route
- **File:** `apps/api/app/api/kitchen/recipes/composite/update-with-version/route.ts` (NEW)
- **What:** POST endpoint for atomic Recipe update with new RecipeVersion creation in single `$transaction`.
- **Completed:** 2026-02-23 — Uses FOR UPDATE lock on version sequence, creates new version with provided or inherited fields, replaces ingredients/steps if provided. Enables safe version-controlled updates.

### [P2-1] ✅ COMPLETE — Add `RecipeStep` entity to manifest + PrismaStore
- **Files:** `recipe-rules.manifest`, `prisma-store.ts`, `manifest-runtime-factory.ts`
- **What:** Added RecipeStep entity with create/update/remove commands. Added `RecipeStepPrismaStore` and registered in factory.
- **Completed:** 2026-02-23 — Entity defined in manifest, PrismaStore maps to `recipe_steps` table, registered in ENTITIES_WITH_SPECIFIC_STORES.

### [P2-2] Migrate frontend recipe forms to composite routes
- **Files:** `new-recipe-form-client.tsx`, `recipe-form-with-constraints.tsx`, `new-dish-form-client.tsx`, `recipe-detail-edit-button.tsx`, `recipe-detail-tabs.tsx`
- **What:** Replace server action imports with `apiFetch()` calls to composite endpoints. Four components import from actions-manifest-v2.ts. `recipe-detail-tabs.tsx` imports `restoreRecipeVersion` from actions.ts.
- **Rationale:** Medium — enables transaction safety. Must complete before deleting legacy actions.

### [P2-3] Delete legacy recipe server actions
- **Files:** `actions-manifest-v2.ts`, `actions-manifest.ts`, `actions.ts`
- **What:** Remove `createRecipe`, `updateRecipe`, `restoreRecipeVersion` exports. Keep `createDish`. Three files have overlapping exports.
- **Rationale:** Medium — cleanup after frontend migration. Separate commit.

### [P3-1] Dead route cleanup (~28 routes)
- **Files:** `apps/api/app/api/command-board/*/commands/*`, `apps/api/app/api/kitchen/manifest/*`
- **What:** Delete confirmed dead routes (5 duplicate list routes in command-board, 19 command-board routes, 9 kitchen manifest routes). Verify no imports in apps, tests, e2e. Fix missing import in dishes/[dishId]/pricing/route.ts.
- **Rationale:** Low — cleanup, ship as separate PR after main work verified.

---

## Execution Phases

```
Phase 1 (DSL) → P0-1
Phase 2 (Infra) → P0-2, P2-1 (can parallel)
Phase 3 (Read Routes) → P0-3, P0-4 (can parallel)
Phase 4 (Composite Routes) → P1-1, P1-2, P1-4 (depends on Phase 2)
Phase 5 (AI Tool) → P1-3 (no dependency on Phase 4)
Phase 6 (Frontend) → P2-2 (depends on Phase 4)
Phase 7 (Cleanup) → P2-3, P3-1 (separate PR)
```

---

## Files Changed Summary

| Action | Files | Domain |
| ------ | ----- | ------ |
| Edit | `recipe-rules.manifest` | DSL |
| Edit | `manifest-runtime-factory.ts` | Runtime |
| New | `versions/[versionId]/route.ts` | API (read) |
| New | `versions/compare/route.ts` | API (read) |
| New | `composite/create-with-version/route.ts` | API (write) |
| New | `composite/restore-version/route.ts` | API (write) |
| New | `composite/update-with-version/route.ts` | API (write) |
| Edit | `tool-registry.ts` | Command Board |
| Edit | Frontend recipe components (5 files) | UI |
| Delete | Legacy actions (3 files) + dead routes (~28) | Cleanup |

---

## Key Invariants (Must Be True When Done)

1. All recipe writes flow through `runtime.runCommand()` — no raw SQL
2. Multi-entity recipe operations are atomic (`$transaction` wraps all)
3. `RecipeVersionRestored` event emitted on restore
4. Version detail + compare endpoints return data (not 404)
5. `suggest_manifest_plan` populates `scope.entities` from board context

---

## Verification Notes (2026-02-22 Exploration)

| Task | Verified | Evidence |
|------|----------|----------|
| P0-1 | CONFIRMED | RecipeVersion entity (recipe-rules.manifest:72-137) has only `create` command (lines 119-134). `RecipeVersionRestored` event at line 386 has no trigger. |
| P0-2 | CONFIRMED | `CreateManifestRuntimeDeps` (factory:87-99) lacks `prismaOverride`. 5 locations use `deps.prisma`: role resolution (L222), store config (L243), json store (L258), outbox transaction (L298), idempotency (L324). Outbox `$transaction` at line 298 breaks atomicity. |
| P0-3 | CONFIRMED | Glob confirmed: `versions/route.ts` exists (GET list only), `[versionId]/route.ts` does NOT. Helper `kitchenRecipeVersionDetail(recipeId, versionId)` at routes.ts:29-33, used at recipe-detail-tabs.tsx:441. |
| P0-4 | CONFIRMED | No `compare/route.ts` file. Helper `kitchenRecipeVersionsCompare(recipeId, from, to)` at routes.ts:36-41, used at recipe-detail-tabs.tsx:467. |
| P1-1 | CONFIRMED | cuisineType bug at actions.ts:361-382 — `${cuisineType}` inserted into `description` column position due to SQL column order mismatch. Same bug in actions-manifest.ts and actions-manifest-v2.ts (lines 542-562). No composite route exists. |
| P1-2 | CONFIRMED | Legacy `restoreRecipeVersion` in actions.ts (lines 1011-1290) uses raw SQL, bypasses Manifest entirely (no constraints, no outbox events). Creates new version with `MAX(version_number) + 1` without lock. |
| P1-3 | CONFIRMED | `suggest_manifest_plan` tool NOT registered server-side. Only 3 base tools in `BASE_TOOL_DEFINITIONS` (tool-registry.ts:688-752): read_board_state, detect_conflicts, execute_manifest_command. `createPendingManifestPlan` exists in manifest-plans.ts:20-43 but has NO callers. |
| P1-4 | CONFIRMED | No update-with-version composite route exists. Spec defined in composite-routes/manifest-alignment-plan.md. |
| P2-1 | CONFIRMED | RecipeStep NOT in ENTITIES_WITH_SPECIFIC_STORES (factory:119-133). No RecipeStep entity in recipe-rules.manifest. Prisma model is `recipe_steps` (plural) at packages/database/generated/models/recipe_steps.ts. |
| P2-2 | CONFIRMED | 4 components import from actions-manifest-v2.ts: new-recipe-form-client.tsx, recipe-form-with-constraints.tsx, new-dish-form-client.tsx, recipe-detail-edit-button.tsx. recipe-detail-tabs.tsx imports restoreRecipeVersion from actions.ts. |
| P2-3 | CONFIRMED | Three files exist with overlapping exports: actions.ts (legacy with cuisineType bug), actions-manifest.ts (manifest v1, throws on blocking constraints), actions-manifest-v2.ts (manifest v2 with override support, returns ManifestActionResult). |
| P3-1 | CONFIRMED | 28 dead routes: 5 duplicate list routes in command-board, 19 command-board routes (potentially unused), 9 kitchen manifest routes (potentially unused). One missing import in dishes/[dishId]/pricing/route.ts. |

---

## Key Architectural Notes

### Composite Route Pattern
All composite routes follow this pattern:
```typescript
// Example: create-with-version
await database.$transaction(async (tx) => {
  const rt = await createManifestRuntime({
    prisma: database,
    prismaOverride: tx,  // CRITICAL: Pass transaction client
    user: session.user,
    // ...
  });

  // ALL writes share the same transaction:
  const recipe = await rt.runCommand("create", recipeData, { entityName: "Recipe" });
  const version = await rt.runCommand("create", versionData, { entityName: "RecipeVersion" });
  // Ingredients, steps, etc.
});
```

### Entity Store Registration
Current entities with dedicated stores (`ENTITIES_WITH_SPECIFIC_STORES`):
- PrepTask, Recipe, RecipeVersion, Ingredient, RecipeIngredient, Dish
- Menu, MenuDish, PrepList, PrepListItem, Station, InventoryItem, KitchenTask

**Missing:** RecipeStep (P2-1)

### Legacy Action Migration Path
```
actions.ts (raw SQL) → actions-manifest.ts (throws on constraints) → actions-manifest-v2.ts (returns outcomes)
                                                                            ↓
                                                                 composite routes (this plan)
```

---

## Related Specs & Conflicts

### manifest-integration_INPROGRESS
There is an in-progress spec at `specs/manifest/manifest-integration_INPROGRESS/` that proposes:
- Moving manifest files to canonical location `packages/manifest-sources/kitchen/`
- Cleaning up `apps/api/app/api/kitchen/manifest/` routes

**Conflict:** This plan references `packages/manifest-adapters/manifests/recipe-rules.manifest` which the integration plan may move. Recommend completing integration Phase 1 first OR coordinating changes.

### Frontend Route Helpers (Already Exist)
The following route helpers already exist in `apps/app/app/lib/routes.ts` but point to non-existent endpoints:
- `kitchenRecipeVersionDetail(recipeId, versionId)` → `/api/kitchen/recipes/:recipeId/versions/:versionId` (404)
- `kitchenRecipeVersionsCompare(recipeId, from, to)` → `/api/kitchen/recipes/:recipeId/versions/compare` (404)

These will automatically work once P0-3 and P0-4 are implemented.

---

## Specs Analyzed

| Spec File | Purpose |
|-----------|---------|
| `specs/manifest/composite-routes/manifest-alignment-plan.md` | Master specification for this implementation plan |
| `specs/manifest/PATTERNS.md` | Manifest integration patterns |
| `specs/manifest/manifest-integration_INPROGRESS/` | Canonical location proposal (conflict noted) |
| `apps/app/app/(authenticated)/command-board/types/manifest-plan.ts` | SuggestedManifestPlan schema definition |

---

## Exploration Summary (2026-02-22)

10 parallel exploration agents analyzed:
- `specs/manifest/` directory structure and specifications
- `apps/api/app/api/kitchen/` route implementations
- `packages/manifest-adapters/src/manifest-runtime-factory.ts` for P0-2
- `packages/manifest-adapters/manifests/recipe-rules.manifest` for DSL gaps
- `apps/app/app/api/command-board/chat/tool-registry.ts` for P1-3
- `apps/app/app/lib/routes.ts` for frontend helpers
- Legacy action files (actions.ts, actions-manifest.ts, actions-manifest-v2.ts)
- Dead route candidates in command-board and kitchen/manifest directories
- PrismaStore implementation for transaction handling understanding

**All 12 tasks confirmed as accurate and necessary.**
