# Manifest Alignment Implementation Plan

> **Status:** Core work complete (12/12 tasks done) - 2026-02-23
> **Created:** 2026-02-22
> **Last Updated:** 2026-02-23
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
- **File:** `apps/api/app/api/kitchen/recipes/[recipeId]/composite/restore-version/route.ts` (MOVED from composite/restore-version)
- **What:** POST endpoint using new `restore` command with `FOR UPDATE` lock on version sequence.
- **Completed:** 2026-02-23 — Uses `FOR UPDATE` lock to prevent concurrent restores, copies ingredients and steps from source version, creates new version through Manifest with constraints and outbox events. Replaces legacy raw SQL implementation. Route helper `kitchenRecipeCompositeRestore(recipeId)` added to routes.ts.

### [P1-3] ✅ COMPLETE — Register `suggest_manifest_plan` tool server-side
- **File:** `apps/app/app/api/command-board/chat/tool-registry.ts`
- **What:** Registered tool with entity resolution logic. Wired `createPendingManifestPlan()` call after plan generation.
- **Completed:** 2026-02-23 — Tool definition added to `BASE_TOOL_DEFINITIONS`, `suggestManifestPlanTool` handler queries `boardProjection` to populate `scope.entities`, generates `planId`, persists plan via `createPendingManifestPlan` before returning.

### [P1-4] ✅ COMPLETE — Create composite `update-with-version` route
- **File:** `apps/api/app/api/kitchen/recipes/[recipeId]/composite/update-with-version/route.ts` (MOVED from composite/update-with-version)
- **What:** POST endpoint for atomic Recipe update with new RecipeVersion creation in single `$transaction`.
- **Completed:** 2026-02-23 — Uses FOR UPDATE lock on version sequence, creates new version with provided or inherited fields, replaces ingredients/steps if provided. Enables safe version-controlled updates. Route helper `kitchenRecipeCompositeUpdate(recipeId)` added to routes.ts.

### [P2-1] ✅ COMPLETE — Add `RecipeStep` entity to manifest + PrismaStore
- **Files:** `recipe-rules.manifest`, `prisma-store.ts`, `manifest-runtime-factory.ts`
- **What:** Added RecipeStep entity with create/update/remove commands. Added `RecipeStepPrismaStore` and registered in factory.
- **Completed:** 2026-02-23 — Entity defined in manifest, PrismaStore maps to `recipe_steps` table, registered in ENTITIES_WITH_SPECIFIC_STORES.

### [P2-2] ✅ COMPLETE — Migrate frontend recipe forms to composite routes
- **Files:** `new-recipe-form-client.tsx`, `recipe-form-with-constraints.tsx`, `new-dish-form-client.tsx`, `recipe-detail-edit-button.tsx`, `recipe-detail-tabs.tsx`, `recipes-page-client.tsx`
- **What:** Replace server action imports with `apiFetch()` calls to composite endpoints.
- **Completed (2026-02-23):**
  - `recipe-detail-tabs.tsx` — Migrated `restoreRecipeVersion` to use `apiFetch(kitchenRecipeCompositeRestore(recipeId))`
  - `new-recipe-form-client.tsx` — Migrated `createRecipe`/`createRecipeWithOverride` to use `apiFetch(kitchenRecipeCompositeCreate())`
    - Added helper functions for FormData → JSON conversion
    - Unit code to ID lookup for yieldUnit field
    - Ingredient and steps text parsing
    - Constraint override support via `override` payload property
  - `recipe-detail-edit-button.tsx` — Migrated `updateRecipe`/`updateRecipeWithOverride` to use `apiFetch(kitchenRecipeCompositeUpdate(recipeId))`
    - Added `buildUpdatePayload()` for FormData → JSON conversion
    - Uses raw ingredient format (name + unit code) for server-side resolution
    - Constraint override support preserved
  - `recipes-page-client.tsx` — Migrated `createRecipe`/`updateRecipe` to use composite routes
    - Added `buildCreatePayload()` and `buildUpdatePayload()` for FormData → JSON conversion
    - Maps `RecipeEditorModal` form fields to composite route payload format
    - Still uses `getRecipeForEdit` from `actions-manifest-v2` for read operations (not a mutation)
  - Route helpers added to `routes.ts`: `kitchenRecipeCompositeCreate()`, `kitchenRecipeCompositeUpdate(recipeId)`, `kitchenRecipeCompositeRestore(recipeId)`
  - **Backend:** Composite routes accept raw ingredients (name + unit code) for server-side resolution
- **Not migrated:**
  - `recipe-form-with-constraints.tsx` — Generic wrapper component, not actively used
  - `new-dish-form-client.tsx` — No composite route for dish creation (kept server action)
  - `getRecipeForEdit` — Read operation, kept as server action (not in scope for deletion)
- **Rationale:** Medium — enables transaction safety. Must complete before deleting legacy actions.

### [P2-3] ✅ COMPLETE — Delete legacy recipe server actions
- **Files:** `actions-manifest-v2.ts`, `actions-manifest.ts`, `actions.ts`
- **What:** Removed `createRecipe`, `updateRecipe`, `restoreRecipeVersion` function definitions (and override variants). Kept `createDish`, `createDishWithOverride`, `getRecipeForEdit`, `updateRecipeImage`.
- **Completed:** 2026-02-23
  - `actions.ts` — Removed `createRecipe`, `updateRecipe`, `restoreRecipeVersion` (~550 lines)
  - `actions-manifest.ts` — Removed `createRecipe`, `updateRecipe`, `restoreRecipeVersion` re-export
  - `actions-manifest-v2.ts` — Removed `createRecipe`, `createRecipeWithOverride`, `updateRecipe`, `updateRecipeWithOverride`, `restoreRecipeVersion`
  - Deleted dead test file: `__tests__/recipes/update-recipe.test.ts`
  - Deleted dead component: `recipe-form-with-constraints.tsx` (never imported anywhere)

### [P3-1] Dead route cleanup (~28 routes) — READY FOR SEPARATE PR
- **Files:** `apps/api/app/api/command-board/*/commands/*`, `apps/api/app/api/kitchen/manifest/*`
- **What:** Delete confirmed dead routes (5 duplicate list routes in command-board, 19 command-board routes, 9 kitchen manifest routes). Verify no imports in apps, tests, e2e.
- **Status:** Exploration complete. 33+ dead routes identified. Missing import in dishes/[dishId]/pricing/route.ts FIXED (2026-02-23).
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
| New | `ingredient-resolution.ts` | Database (shared) |
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

---

## Session 2026-02-23 Summary

### Fixes Applied
1. **Fixed missing import** in `apps/api/app/api/kitchen/manifest/dishes/[dishId]/pricing/route.ts`
   - Added `syncDishPricingWithOutbox` to imports from helpers
   - This was blocking compilation of the pricing route

2. **Fixed menu-actions.test.ts** (31 tests)
   - Rewrote database mock to properly support `$transaction`
   - Used `vi.hoisted()` for mock functions to fix hoisting issues
   - Added `status: "pending"` to all outbox event assertions
   - All 31 tests now pass

3. **Reduced lint errors** via biome auto-fix
   - Original: 1062 errors + 1306 warnings
   - After fixes: 476 errors + 1077 warnings
   - 385 files auto-formatted (296 safe + 89 unsafe)
   - Remaining issues are mostly style preferences

4. **Fixed biome lint regression** in `packages/manifest-runtime/src/manifest/runtime-engine.ts`
   - Commit 23ae765a7's biome auto-fix inadvertently changed `==` to `===` and `!=` to `!==`
   - This broke manifest spec's loose equality semantics (`undefined == null` must be `true`)
   - Added biome-ignore comments to prevent future auto-reversion
   - Fixed 10 failing conformance tests (2 default-policies, 7 operator-equality, 1 evaluation-context)
   - Commit: 9484d907d

### Verification
- TypeScript: ✅ No errors
- Tests: ✅ All menu tests pass (31/31)
- Manifest tests: ✅ 667/667 pass (was 657/667 before fix)
- Build: ✅ Compiles successfully

### P3-1 Status
- Exploration complete: 33+ dead routes identified
- Missing import fixed
- Ready for separate PR

---

## Session 2026-02-23 (Agent 9) — Build Fix for ESM/moduleResolution

### Problem
The previous commit (66ddddd40) added `"type": "module"` to `@repo/database` to fix MCP server ESM imports, but this broke the Next.js build:
- TypeScript with `NodeNext` moduleResolution requires `.js` extensions for relative imports
- Next.js bundler doesn't understand `.js` extensions in TypeScript source files

### Solution
1. **Removed `"type": "module"`** from `@repo/database/package.json`
   - MCP server uses tsx which handles both ESM and CJS
   - preload.cts already handles Prisma client resolution via require.cache

2. **Changed manifest-adapters tsconfig** to use `Bundler` moduleResolution
   - `"module": "ESNext"` and `"moduleResolution": "Bundler"`
   - Compatible with Next.js bundler and handles ESM-style imports

3. **Added explicit types** in `database/tenant.ts`
   - `createTenantClient` callback parameters now explicitly typed
   - Prevents implicit any errors with strict mode

4. **Added ManifestEntityRow type** in `prisma-json-store.ts`
   - Explicit type for database row to prevent implicit any

### Files Changed
- `packages/database/package.json` — removed `"type": "module"`
- `packages/database/tenant.ts` — added explicit parameter types
- `packages/manifest-adapters/tsconfig.json` — use Bundler resolution
- `packages/manifest-adapters/src/prisma-json-store.ts` — added ManifestEntityRow type

### Verification
- TypeScript: ✅ No errors
- Build: ✅ app and api build successfully
- App tests: ✅ 379/379 pass
- Manifest tests: ✅ 667/667 pass
