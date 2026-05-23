# Manifest Alignment Plan — Recipe Versioning, Entity Resolution, Dead Route Cleanup

> **Created:** 2026-02-22
> **Status:** Plan mode (not yet executing)
> **Prerequisite reading:** `specs/manifest/PATTERNS.md`, this investigation report
> **Branch:** TBD (create from main before executing)

---

## Problem Statement

Three interrelated failures traced to incomplete Manifest integration:

1. **`manifest_entity` table is empty** — not a bug. The 13 core kitchen entities (Recipe, RecipeVersion, etc.) use dedicated PrismaStore classes that write to their own tables. The ~40 non-core entities (Event, Client, etc.) would write to `manifest_entity` via PrismaJsonStore, but no UI path currently triggers commands for them.

2. **Command Board planner `entities: []`** — the `suggest_manifest_plan` AI tool was spec'd (`specs/command-board/boardspec.md:127`) and the UI renders its output (`ai-chat-panel.tsx:188`), but the server-side tool was **never implemented**. The schema defaults entities to `[]` (`manifest-plan.ts:209`), and `createPendingManifestPlan()` (`manifest-plans.ts:20`) is defined but never called.

3. **Recipe versioning "doesn't work"** — two missing API routes (`/versions/:versionId` detail, `/versions/compare` diff), a column mismatch bug (`cuisineType` stored in `description` column in `actions-manifest-v2.ts:558`), and `restoreRecipeVersion` bypassing Manifest entirely (legacy `actions.ts:1011` re-exported through `actions-manifest.ts:1169`).

---

## Architecture Decision Record

| Decision                | Choice                                                 | Rationale                                                                                                                                                                                                                                                                                                                                                                                                    |
| ----------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Transaction boundary    | Thread `tx` through **entire** `createManifestRuntime` | Each PrismaStore class takes `PrismaClient` in constructor (`prisma-store.ts:47`). Prisma `$transaction` callback `tx` is structurally compatible. Pass `tx` as the `prisma` dep → stores, outbox writes (`onCommandExecuted`), idempotency store, AND PrismaJsonStore fallback ALL share one transaction. (Codex R1: just overriding stores is insufficient — outbox + idempotency also use `deps.prisma`.) |
| RecipeStep              | Add to manifest                                        | Full coverage: entity + constraints + commands + PrismaStore. Eliminates the last raw-SQL holdout in recipe operations.                                                                                                                                                                                                                                                                                      |
| `suggest_manifest_plan` | Include in this work package                           | Addresses the root cause of `entities: []`. UI rendering already exists; only server-side tool registration + entity resolution logic needed.                                                                                                                                                                                                                                                                |
| Dead routes             | Include cleanup (separate PR)                          | ~30 confirmed dead routes per `PATTERNS.md:431-443`. Codex R1: verify against tests/e2e too, not just import grep. Ship as separate PR after new flows are verified.                                                                                                                                                                                                                                         |
| Dish actions            | Out of scope                                           | Codex R1: plan deletes `createDish` with no replacement. Keep dish server actions unchanged in this work package; migrate in a follow-up.                                                                                                                                                                                                                                                                    |
| Migration pattern       | Composite Command Route                                | Per `PATTERNS.md:367-411` — hand-written route wrapping multiple `runCommand` calls in `prisma.$transaction`.                                                                                                                                                                                                                                                                                                |

---

## Phase 1: Manifest DSL + IR Updates

### 1.1 Add `restore` command to RecipeVersion entity

- **File:** `packages/manifest-adapters/manifests/recipe-rules.manifest`
- **What:** Add a `restore` command to the `RecipeVersion` entity (currently only has `create`). The `RecipeVersionRestored` event already exists at line 386 but has no corresponding command.
- **Command signature:** `restore(sourceVersionId, newVersionNumber, name, category, cuisineType, description, tags, yieldQty, yieldUnit, yieldDescription, prepTime, cookTime, restTime, difficulty, instructionsText, notesText)`
- **Guards:** sourceVersionId non-empty, newVersionNumber > 0, name non-empty
- **Mutates:** All version fields + `createdAt = now()`
- **Emits:** `RecipeVersionRestored`
- **Rationale:** The runtime is pure — the composite route reads the source version from DB and passes all fields as command parameters. The command just validates + mutates + emits.

### 1.2 Add `RecipeStep` entity to manifest

- **File:** `packages/manifest-adapters/manifests/recipe-rules.manifest`
- **What:** New entity with properties matching the `recipe_steps` Prisma model: `id`, `tenantId`, `recipeVersionId`, `stepNumber`, `instruction`, `durationMinutes`, `temperatureValue`, `temperatureUnit`, `equipmentNeeded`, `tips`, `videoUrl`, `imageUrl`
- **Commands:** `create`, `update`, `remove` (soft-delete)
- **Constraints:** `validStepNumber` (> 0), `validInstruction` (non-empty)
- **Events:** `RecipeStepCreated`, `RecipeStepUpdated`, `RecipeStepRemoved`

### 1.3 Compile IR

- **Command:** `pnpm manifest:build`
- **Verify:** `pnpm manifest:lint-routes` and `pnpm manifest:routes:ir -- --format summary` show new commands
- **Output:** Updated `packages/manifest-ir/ir/kitchen/kitchen.ir.json`

---

## Phase 2: PrismaStore Infrastructure

### 2.1 Add `RecipeStepPrismaStore` class

- **File:** `packages/manifest-adapters/src/prisma-store.ts`
- **What:** New class implementing `Store<EntityInstance>` backed by `prisma.recipe_steps`. The Prisma model already exists (`schema.prisma:2852`, `model recipe_steps`), so use the Prisma client directly — no raw SQL needed. (Codex R1 fix: the plan's risk table was wrong about this.)
- **Methods:** `getAll`, `getById`, `create`, `update`, `delete`, `clear`
- **Field mapping:** `mapToManifestEntity()` converting DB row → flat EntityInstance

### 2.2 Register RecipeStep in store routing

- **File:** `packages/manifest-adapters/src/manifest-runtime-factory.ts`
- **What:** Add `"RecipeStep"` to `ENTITIES_WITH_SPECIFIC_STORES` set (line 119)
- **File:** `packages/manifest-adapters/src/prisma-store.ts`
- **What:** Add `case "RecipeStep"` to `createPrismaStoreProvider` switch (line 984)

### 2.3 Add transaction-aware `createManifestRuntime` overload

- **File:** `packages/manifest-adapters/src/manifest-runtime-factory.ts`
- **What:** Add an optional `prismaOverride` to `CreateManifestRuntimeDeps` that lets callers pass a Prisma transaction client (`tx`) instead of the singleton. When provided, **ALL** Prisma usages use `tx`:
  1. **Store construction** (line 232 `storeProvider`) — PrismaStore + PrismaJsonStore
  2. **Outbox writes** (`onCommandExecuted` at line 270 — currently opens its own `deps.prisma.$transaction`)
  3. **Idempotency store** (`PrismaIdempotencyStore` creation)
  4. **User role resolution** (`resolveUserRole` at line 161)
- **Design:**
  ```typescript
  export interface CreateManifestRuntimeDeps {
    prisma: PrismaLike;
    prismaOverride?: PrismaLike; // <-- NEW: transaction client for composite routes
    // ... rest unchanged
  }
  ```
  Compute `const effectivePrisma = deps.prismaOverride ?? deps.prisma` once at the top of `createManifestRuntime()` and use it everywhere instead of `deps.prisma`.
- **Critical (Codex R1):** If only stores use `tx` but outbox/idempotency use `deps.prisma`, entity writes and outbox events commit in different transactions — breaking atomicity. The override must be comprehensive.
- **Why:** This lets composite routes do:
  ```typescript
  await database.$transaction(async (tx) => {
    const rt = await createManifestRuntime({ ..., prismaOverride: tx });
    await rt.runCommand("create", ..., { entityName: "Recipe" });
    await rt.runCommand("create", ..., { entityName: "RecipeVersion" });
    // ALL writes (stores + outbox + idempotency) share the same transaction
  });
  ```
- **Backward compatible:** Existing callers don't pass `prismaOverride`, so behavior is unchanged.

### 2.4 Typecheck

- **Command:** `pnpm tsc --noEmit`
- **Must pass** before proceeding.

---

## Phase 3: Missing API Routes (Recipe Versioning)

### 3.1 Create version detail endpoint

- **File:** `apps/api/app/api/kitchen/recipes/[recipeId]/versions/[versionId]/route.ts` (NEW)
- **Method:** GET
- **What:** Auth → tenant check → `database.recipeVersion.findFirst({ where: { id, recipeId, tenantId, deletedAt: null } })` → fetch ingredients + steps → return `RecipeVersionDetail`
- **Return shape:** Must match `RecipeVersionDetail` type expected by `recipe-detail-tabs.tsx:88-134`
- **No manifest runtime needed** — read-only endpoint (per `PATTERNS.md:236`)

### 3.2 Create version compare endpoint

- **File:** `apps/api/app/api/kitchen/recipes/[recipeId]/versions/compare/route.ts` (NEW)
- **Method:** GET
- **What:** Auth → tenant check → parse `?from=X&to=Y` → fetch both versions with ingredients + steps → compute field-level diff → return `RecipeVersionCompare`
- **Return shape:** Must match `RecipeVersionCompare` type expected by `recipe-detail-tabs.tsx:467` (Codex R1: was `:473`)
- **No manifest runtime needed** — read-only endpoint
- **Security (Codex R1):** Both compared versions must belong to the same `recipeId` AND `tenantId`. Reject if either version belongs to a different recipe or tenant.

### 3.3 Verify UI integration

- **Check:** `recipe-detail-tabs.tsx` imports `kitchenRecipeVersionDetail` from `routes.ts:29-33` and `kitchenRecipeVersionsCompare` from `routes.ts:36-41`
- **URL patterns:** `/api/kitchen/recipes/:recipeId/versions/:versionId` and `/api/kitchen/recipes/:recipeId/versions/compare?from=X&to=Y`
- **Ensure:** Route file paths match Next.js App Router conventions for these URL patterns
- **Note:** The `routes.ts` helper for compare uses `?from=&to=` query params, so the compare route reads from searchParams.

---

## Phase 4: Composite Command Routes (Replace Pattern B)

### 4.1 Create composite `create-with-version` route

- **File:** `apps/api/app/api/kitchen/recipes/composite/create-with-version/route.ts` (NEW)
- **Method:** POST
- **Route surface (Codex R1):** Register this route in `routes.manifest.json` as a manual composite route (not infra-allowlisted — it's a domain write). Add `"Recipe.compositeCreate"` entry with source `"manual"`.
- **Idempotency (Codex R1):** Accept `X-Idempotency-Key` header. Derive key from `recipeId` if not provided. Check idempotency store before executing.
- **What:** Auth → parse body → `database.$transaction(async (tx) => { ... })`:
  1. `const rt = await createManifestRuntime({ ..., prismaOverride: tx })`
  2. `const recipeResult = await rt.runCommand("create", recipeData, { entityName: "Recipe" })` — capture result
  3. **Extract `recipeId`** from `recipeResult.result.id` for child entity wiring
  4. `const versionResult = await rt.runCommand("create", { ...versionData, recipeId }, { entityName: "RecipeVersion" })` — wire parent ID
  5. **Extract `versionId`** from `versionResult.result.id`
  6. For each ingredient: `await rt.runCommand("create", { ...ingredientData, recipeVersionId: versionId }, { entityName: "RecipeIngredient" })`
  7. For each step: `await rt.runCommand("create", { ...stepData, recipeVersionId: versionId }, { entityName: "RecipeStep" })`
  8. Outbox events collected via `eventCollector` pattern, written in same `tx`
- **Error handling (Codex R1):** Return `CommandResult` on first failure. Transaction rolls back automatically — no partial creates of recipe without version, or version without ingredients.
- **Image handling:** Frontend uploads to blob storage first, passes `imageUrl` in body
- **Fixes column mismatch:** RecipePrismaStore.create() (`prisma-store.ts:327`) already maps `cuisineType` to the correct column. No more raw SQL.

### 4.2 Create composite `update-with-version` route

- **File:** `apps/api/app/api/kitchen/recipes/composite/update-with-version/route.ts` (NEW)
- **Method:** POST
- **What:** Same transactional pattern as 4.1 but:
  1. `runtime.runCommand("update", recipeData, { entityName: "Recipe", instanceId: recipeId })`
  2. `runtime.runCommand("create", newVersionData, { entityName: "RecipeVersion" })` (new version, not update)
  3. Create ingredients + steps for the new version
- **Replaces:** `actions-manifest-v2.ts:742` (`updateRecipe`)

### 4.3 Create composite `restore-version` route

- **File:** `apps/api/app/api/kitchen/recipes/composite/restore-version/route.ts` (NEW)
- **Method:** POST
- **What:** Auth → read source version from DB → `database.$transaction(async (tx) => { ... })`:
  1. **Compute next version number inside the transaction (Codex R1):** Use `SELECT MAX(version_number) FROM tenant_kitchen.recipe_versions WHERE recipe_id = $1 FOR UPDATE` to lock the row and prevent concurrent restore/update from computing the same version number.
  2. `const rt = await createManifestRuntime({ ..., prismaOverride: tx })`
  3. `const versionResult = await rt.runCommand("restore", { sourceVersionId, newVersionNumber, ...sourceFields }, { entityName: "RecipeVersion" })` — capture `versionId` from result
  4. Copy ingredients: for each source ingredient, `await rt.runCommand("create", { ...ingredientData, recipeVersionId: versionResult.result.id }, { entityName: "RecipeIngredient" })`
  5. Copy steps: for each source step, `await rt.runCommand("create", { ...stepData, recipeVersionId: versionResult.result.id }, { entityName: "RecipeStep" })`
  6. `await rt.runCommand("update", { newName, newCategory, ... }, { entityName: "Recipe", instanceId: recipeId })`
- **Replaces:** `actions.ts:1011` (`restoreRecipeVersion`)
- **Fixes:** Restore now goes through Manifest (constraints, policies, outbox events, idempotency). Version number race condition prevented by `FOR UPDATE` lock inside transaction.

### 4.4 Update route URL helpers

- **File:** `apps/app/app/lib/routes.ts`
- **What:** Add helpers for composite routes:
  ```typescript
  export const kitchenRecipeCompositeCreate =
    "/api/kitchen/recipes/composite/create-with-version";
  export const kitchenRecipeCompositeUpdate = (recipeId: string) =>
    `/api/kitchen/recipes/composite/update-with-version`;
  export const kitchenRecipeCompositeRestore = (recipeId: string) =>
    `/api/kitchen/recipes/composite/restore-version`;
  ```

### 4.5 Migrate frontend callers

- **Files to change:**
  - `apps/app/app/(authenticated)/kitchen/recipes/[recipeId]/components/recipe-detail-edit-button.tsx` — change from calling `updateRecipe` server action to `apiFetch(kitchenRecipeCompositeUpdate(recipeId))`
  - `apps/app/app/(authenticated)/kitchen/recipes/[recipeId]/components/recipe-detail-tabs.tsx:52` — change `restoreRecipeVersion` from server action import to `apiFetch(kitchenRecipeCompositeRestore(recipeId))`
  - Recipe creation form — change from calling `createRecipe` server action to `apiFetch(kitchenRecipeCompositeCreate)`
  - Handle FormData → JSON conversion on frontend (image upload separate, then pass URL)
- **Key change:** All recipe writes now go through API routes (Pattern A), not server actions (Pattern B)

### 4.6 Delete legacy server actions

- **File:** `apps/app/app/(authenticated)/kitchen/recipes/actions-manifest-v2.ts` — delete `createRecipe`, `updateRecipe` and their override variants. **Keep `createDish`** (Codex R1: no replacement composite route in this plan; migrate dish separately).
- **File:** `apps/app/app/(authenticated)/kitchen/recipes/actions-manifest.ts` — delete `createRecipe`, `updateRecipe` re-exports. **Keep `createDish`** re-export.
- **Keep:** `getRecipeForEdit`, `updateRecipeImage` (still needed, migrate separately)
- **Keep:** `restoreRecipeVersion` removal depends on frontend migration in 4.5
- **Careful:** Don't delete anything until all frontend callers are migrated

---

## Phase 5: `suggest_manifest_plan` Tool Implementation

### 5.1 Define the server-side tool

- **File:** `apps/app/app/api/command-board/chat/tool-registry.ts`
- **What:** Register `suggest_manifest_plan` tool alongside the existing 3 tools (line 688+)
- **Tool contract:**
  - Input: `{ intent: string }` (user's natural language goal)
  - Output: `{ suggested: boolean, plan: SuggestedManifestPlan }`
  - The AI generates the plan structure using the IR's entity/command inventory as context
- **Entity resolution:** Before generating the plan, the tool should:
  1. Call `read_board_state` internally to get current board projections with entity types/IDs
  2. Build `ManifestEntityRef[]` from the projections
  3. Include these as `scope.entities` in the generated plan
- **Does NOT call `runCommand`** — it produces a plan for human approval, not execution

### 5.2 Wire entity resolution from board context

- **File:** `apps/app/app/api/command-board/chat/tool-registry.ts` (or new helper)
- **What:** Create `resolveEntitiesForPlan(boardId, tenantId)` function that:
  1. Queries board projections (similar to `read_board_state` tool at line 375)
  2. Maps projections to `ManifestEntityRef[]` (the shape expected by `manifest-plan.ts:187`)
  3. Returns entity refs for inclusion in the plan's `scope.entities`
- **This is the missing link** — the board page already does this for rendering (`[boardId]/page.tsx:73-90`) but the AI chat never did it for plan generation

### 5.3 Wire plan persistence (server-side)

- **What (Codex R1 fix):** Persist the plan **server-side when the `suggest_manifest_plan` tool returns**, not in the client approval handler. `approveManifestPlan()` (`manifest-plans.ts:2200+`) expects the plan to already exist via `getPendingManifestPlan()`.
- **File:** `apps/app/app/api/command-board/chat/tool-registry.ts` (or the chat route handler)
- **What:** After the `suggest_manifest_plan` tool produces a plan, call `createPendingManifestPlan()` (`lib/command-board/manifest-plans.ts:20`) to persist it as a pending outbox event BEFORE returning the tool result to the AI stream. This way, when the client calls `approveManifestPlan(boardId, planId)`, the plan already exists.
- **Currently:** `createPendingManifestPlan` is defined but never called — this wires it in.
- **Security (Codex R1):** The tool must schema-validate the generated plan against `suggestedManifestPlanSchema` and must NEVER call `runCommand` or any write operation. It is strictly a read + plan + persist-as-pending tool.

### 5.4 Plan execution via manifest commands

- **What (Codex R1 fix):** `executeDomainStepViaManifest()` (`manifest-step-executor.ts:98`) already calls `createManifestRuntime()` + `runtime.runCommand()` directly (NOT via API route mapping). This is correct for single-entity steps.
- **File:** `apps/app/app/(authenticated)/command-board/actions/manifest-plans.ts`
- **Recipe multi-entity steps:** When a `DomainCommandStep` has `entityType: "recipe"` and `commandName: "create"` or `"restore"`, the plan executor must detect this and route to the composite API endpoints (Phase 4) instead of calling `executeDomainStepViaManifest`. Add a `isCompositeRecipeStep()` check in `approveManifestPlan()` that delegates to `apiFetch(kitchenRecipeCompositeCreate)` etc.
- **Single-entity steps:** Continue using `executeDomainStepViaManifest()` as-is.

---

## Phase 6: Dead Route Cleanup (SEPARATE PR — Codex R1)

> **Ship as a separate PR** after all new flows in Phases 1-5 are verified and merged.
> Codex R1: filesystem routes can be externally called without imports. Import grep alone is insufficient evidence. Must also verify against test files and e2e specs.

### 6.1 Delete confirmed dead command-board routes

Per `PATTERNS.md:431-443`:

| Route Group                                             | Count | Files to Delete            |
| ------------------------------------------------------- | ----- | -------------------------- |
| `apps/api/app/api/command-board/boards/commands/*`      | 5     | All command route.ts files |
| `apps/api/app/api/command-board/cards/commands/*`       | 5     | All command route.ts files |
| `apps/api/app/api/command-board/connections/commands/*` | 2     | All command route.ts files |
| `apps/api/app/api/command-board/groups/commands/*`      | 3     | All command route.ts files |
| `apps/api/app/api/command-board/layouts/commands/*`     | 3     | All command route.ts files |
| `apps/api/app/api/command-board/[boardId]/draft`        | 1     | route.ts                   |

### 6.2 Delete Gen 1 kitchen/manifest routes (with caution)

| Route Group                           | Count | Notes                                                                                                                        |
| ------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/app/api/kitchen/manifest/*` | 9     | Check `apps/api/__tests__/kitchen/manifest-*.test.ts` first — if tests reference these routes, migrate tests before deleting |

### 6.3 Verify no remaining references (strengthened — Codex R1)

- **Command:** `rg "kitchen/manifest/" apps/ --include="*.ts" --include="*.tsx"` (check BOTH apps)
- **Command:** `rg "command-board/.*/commands/" apps/ --include="*.ts" --include="*.tsx"`
- **Command:** `rg "kitchen/manifest/" apps/api/__tests__/ --include="*.ts"` (check test files specifically)
- **Command:** `rg "kitchen/manifest/" e2e/ --include="*.ts"` (check e2e specs)
- **Must return zero results** before deleting

### 6.4 Verify build

- **Command:** `pnpm turbo build --filter=@capsule/api`
- **Command:** `pnpm tsc --noEmit`
- **Command:** `pnpm biome check`

---

## Phase 7: Verification & Testing

### 7.1 Add integration tests for composite routes

- **Files:** `apps/api/__tests__/kitchen/recipe-composite-create.test.ts` (NEW)
- **Tests:**
  - Happy path: create recipe + version + ingredients + steps → all in DB, outbox event present
  - Constraint violation: blocking constraint → transaction rolls back, nothing persisted
  - Policy denial: wrong role → 403, nothing persisted
  - Partial failure: ingredient 3 of 5 has invalid data → entire transaction rolls back

### 7.2 Add tests for version detail/compare routes

- **Files:** `apps/api/__tests__/kitchen/recipe-version-detail.test.ts` (NEW)
- **Tests:**
  - Happy path: returns version with ingredients and steps
  - 404 when version doesn't exist or wrong tenant
  - Compare: returns diff between two versions

### 7.3 Add test for restore composite route

- **Files:** `apps/api/__tests__/kitchen/recipe-composite-restore.test.ts` (NEW)
- **Tests:**
  - Happy path: restore creates new version with source data, copies ingredients + steps
  - Constraint checking runs on restored data
  - Outbox event emitted with correct type

### 7.4 Verify manifest route surface

- **Command:** `pnpm manifest:lint-routes`
- **Command:** `pnpm manifest:routes:ir -- --format summary`
- **Verify:** Composite routes are documented in allowlist (they're hand-written, not generated)

### 7.5 Full validation

- **Command:** `pnpm --filter @capsule/api test` (targeted)
- **Command:** `pnpm tsc --noEmit`
- **Command:** `pnpm turbo build --filter=@capsule/app`

---

## Execution Order & Dependencies

```
Phase 1 (DSL + IR)
  ├── 1.1 restore command
  ├── 1.2 RecipeStep entity
  └── 1.3 compile IR
         │
Phase 2 (Store infrastructure) ← depends on Phase 1
  ├── 2.1 RecipeStepPrismaStore (Prisma client, NOT raw SQL)
  ├── 2.2 register in factory
  ├── 2.3 tx-aware runtime factory (stores+outbox+idempotency — comprehensive)
  └── 2.4 typecheck
         │
     ┌───┴──────────────────────────────────┐
     │                                      │
Phase 3 (Read routes) ← can parallel    Phase 5.1-5.3 (Plan tool registration,
  ├── 3.1 version detail route             entity resolution, server-side persist)
  ├── 3.2 version compare route            ← can parallel with Phase 3
  └── 3.3 verify UI integration            (Codex R1: no Phase 4 dependency)
     │                                      │
     └───┬──────────────────────────────────┘
         │
Phase 4 (Composite routes) ← depends on Phase 2
  ├── 4.1 create-with-version (with ID capture + idempotency)
  ├── 4.2 update-with-version
  ├── 4.3 restore-version (with FOR UPDATE lock)
  ├── 4.4 route helpers + route surface registration
  ├── 4.5 migrate frontend
  └── 4.6 delete legacy recipe actions (keep createDish)
         │
Phase 5.4 (Plan execution wiring) ← depends on Phase 4
  └── 5.4 composite recipe step routing in plan executor
         │
Phase 7 (Verification) ← depends on Phases 1-5
  ├── 7.1 composite route tests
  ├── 7.2 version detail/compare tests
  ├── 7.3 restore tests
  ├── 7.4 route surface audit
  └── 7.5 full validation
         │
         ▼ MERGE main PR
         │
Phase 6 (Cleanup) ← SEPARATE PR after main merge
  ├── 6.1 delete dead command-board routes
  ├── 6.2 delete Gen 1 manifest routes (check tests first)
  ├── 6.3 verify no references (apps + tests + e2e)
  └── 6.4 verify build
```

---

## Risk Assessment

| Risk                                              | Likelihood | Impact  | Mitigation                                                                                                  |
| ------------------------------------------------- | ---------- | ------- | ----------------------------------------------------------------------------------------------------------- |
| PrismaStore tx threading breaks existing callers  | Low        | High    | `prismaOverride` is optional; existing callers unaffected. Comprehensive: covers stores+outbox+idempotency. |
| Outbox/idempotency commits outside tx             | Medium     | High    | (Codex R1) Use `effectivePrisma` everywhere in factory, not just store construction.                        |
| Frontend migration breaks recipe create/edit flow | Medium     | High    | Keep server actions until all frontend callers migrated and tested                                          |
| Version-number race on concurrent restore/update  | Medium     | Medium  | (Codex R1) `SELECT ... FOR UPDATE` inside transaction to lock version sequence.                             |
| `suggest_manifest_plan` AI produces bad plans     | Medium     | Low     | Plans require human approval; schema-validated; tool never calls `runCommand`.                              |
| Dead route deletion breaks tests/e2e              | Medium     | Medium  | (Codex R1) Ship as separate PR. Verify tests + e2e + both apps before deleting.                             |
| ~~RecipeStep Prisma model doesn't exist~~         | ~~N/A~~    | ~~N/A~~ | (Codex R1) Confirmed: `model recipe_steps` at `schema.prisma:2852`. Use Prisma client directly.             |

---

## Files Changed Summary (Estimated)

| Action | Files                                                         | Domain                |
| ------ | ------------------------------------------------------------- | --------------------- |
| Edit   | `recipe-rules.manifest`                                       | DSL                   |
| New    | `RecipeStepPrismaStore` in `prisma-store.ts`                  | Store                 |
| Edit   | `manifest-runtime-factory.ts` (tx support)                    | Runtime               |
| New    | `versions/[versionId]/route.ts`                               | API (read)            |
| New    | `versions/compare/route.ts`                                   | API (read)            |
| New    | `composite/create-with-version/route.ts`                      | API (write)           |
| New    | `composite/update-with-version/route.ts`                      | API (write)           |
| New    | `composite/restore-version/route.ts`                          | API (write)           |
| Edit   | `routes.ts` (new helpers)                                     | Frontend              |
| Edit   | `recipe-detail-edit-button.tsx`                               | Frontend              |
| Edit   | `recipe-detail-tabs.tsx`                                      | Frontend              |
| Edit   | Recipe creation form                                          | Frontend              |
| Edit   | `tool-registry.ts` (suggest_manifest_plan + plan persistence) | Command Board         |
| Delete | ~30 dead route files                                          | Cleanup (separate PR) |
| Delete | Legacy recipe server action exports (keep createDish)         | Cleanup               |
| New    | 3 test files                                                  | Testing               |

---

## Key Invariants (Must Be True When Done)

1. **All recipe write operations flow through `runtime.runCommand()`** — no raw SQL for persistence
2. **All multi-entity recipe operations are atomic** — wrapped in `prisma.$transaction`
3. **`RecipeVersionRestored` event is emitted** on version restore (currently silent)
4. **Version detail and compare endpoints return data** (currently 404)
5. **`suggest_manifest_plan` tool is registered** and populates `scope.entities` from board context
6. **`createPendingManifestPlan()` is called** on plan approval (currently dead code)
7. **All dead routes deleted** — no phantom API surface
8. **`cuisineType` stored in `cuisine_type` column, `description` stored in `description` column** — column mismatch fixed by removing raw SQL
