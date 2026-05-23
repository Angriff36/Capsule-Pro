# Manifest Integration Patterns — Capsule-Pro

> Last updated: 2026-02-16
>
> **Context7 Library:** `/angriff36/manifest` (1478 snippets)
>
> This document describes the actual patterns in use across the codebase, the gaps between them, and the recommended path forward.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Pattern A: Generated Single-Entity Command Routes](#pattern-a-generated-single-entity-command-routes)
3. [Pattern B: Server Action with Manifest Constraint Checking](#pattern-b-server-action-with-manifest-constraint-checking)
4. [Pattern C: Direct apiFetch (No Manifest)](#pattern-c-direct-apifetch-no-manifest)
5. [The Runtime Pipeline](#the-runtime-pipeline)
6. [Store Providers](#store-providers)
7. [Multi-Entity Orchestration](#multi-entity-orchestration)
8. [Dead Routes & Cleanup](#dead-routes--cleanup)
9. [Migration Strategy](#migration-strategy)
10. [Decision Log](#decision-log)

---

## Architecture Overview

Capsule-Pro has **three distinct patterns** for how the frontend executes domain commands. They coexist, sometimes for the same entity.

```
┌─────────────────────────────────────────────────────────────────┐
│                        apps/app (Frontend)                       │
│                                                                  │
│  Pattern A: apiFetch("/api/kitchen/prep-tasks/commands/claim")   │
│             → Next.js rewrite → apps/api route handler           │
│             → createManifestRuntime → runtime.runCommand          │
│             → PrismaStore persist → outbox events                │
│                                                                  │
│  Pattern B: Server action (actions-manifest.ts)                  │
│             → createRecipeRuntime (constraint check only)        │
│             → Hand-rolled raw SQL ($executeRaw) for persistence  │
│             → Manual outbox event creation                       │
│             → revalidatePath + redirect                          │
│                                                                  │
│  Pattern C: apiFetch("/api/events/event/commands/create")        │
│             → Next.js rewrite → apps/api route handler           │
│             → createManifestRuntime → runtime.runCommand          │
│             → PrismaJsonStore persist (generic JSON blob)        │
└─────────────────────────────────────────────────────────────────┘
```

### Which pattern is used where?

| Domain                                    | Pattern  | Frontend Callers | Notes                                                  |
| ----------------------------------------- | -------- | ---------------- | ------------------------------------------------------ |
| Kitchen (prep tasks, stations, inventory) | A        | 41 matches       | Full Manifest pipeline, PrismaStore                    |
| Kitchen (recipes, dishes)                 | **B**    | Server actions   | Manifest for constraints only, raw SQL for persistence |
| Events                                    | A/C      | 36 matches       | Generated routes, PrismaJsonStore for newer entities   |
| CRM                                       | A/C      | 10 matches       | Generated routes                                       |
| Staff                                     | A/C      | 8 matches        | Generated routes                                       |
| Inventory (purchasing)                    | A/C      | 30 matches       | Generated routes                                       |
| Shipments                                 | A/C      | 15 matches       | Generated routes                                       |
| Timecards                                 | A/C      | 6 matches        | Generated routes                                       |
| Command Board                             | **DEAD** | 0 matches        | Replaced by server actions (React Flow rewrite)        |

---

## Pattern A: Generated Single-Entity Command Routes

**Location:** `apps/api/app/api/{domain}/{entity}/commands/{command}/route.ts`
**Count:** 232 route files with `"Generated from Manifest IR - DO NOT EDIT"` header
**Used by:** Kitchen (non-recipe), Events, CRM, Staff, Inventory, Shipments, Timecards

### How it works

```typescript
// apps/api/app/api/kitchen/prep-tasks/commands/claim/route.ts
// Auto-generated Next.js command handler for PrepTask.claim
// Generated from Manifest IR - DO NOT EDIT

import { createManifestRuntime } from "@/lib/manifest-runtime";

export async function POST(request: NextRequest) {
  const { orgId, userId } = await auth();
  const tenantId = await getTenantIdForOrg(orgId);
  const body = await request.json();

  const runtime = await createManifestRuntime({
    user: { id: userId, tenantId },
    entityName: "PrepTask",
  });

  const result = await runtime.runCommand("claim", body, {
    entityName: "PrepTask",
  });

  // Handle policyDenial, guardFailure, or success
  return manifestSuccessResponse({
    result: result.result,
    events: result.emittedEvents,
  });
}
```

### What the runtime does (from `apps/api/lib/manifest-runtime.ts`)

1. **Resolves manifest file** — `ENTITY_TO_MANIFEST` maps entity name → `.manifest` file
2. **Compiles to IR** — `compileToIR(source)` with caching
3. **Creates store provider** — Entities in `ENTITIES_WITH_SPECIFIC_STORES` get `PrismaStore` (hand-written field mappings). Others get `PrismaJsonStore` (generic JSON blob).
4. **Wires telemetry** — Sentry metrics for constraint evaluation, command execution
5. **Wires outbox** — `createPrismaOutboxWriter` for transactional event delivery
6. **Wires idempotency** — `PrismaIdempotencyStore` for command deduplication
7. **Returns `ManifestRuntimeEngine`** — Ready to `runCommand()`

### Entities with dedicated PrismaStore (hand-written field mappings)

```
PrepTask, Recipe, RecipeVersion, Ingredient, RecipeIngredient, Dish,
Menu, MenuDish, PrepList, PrepListItem, Station, InventoryItem, KitchenTask
```

All other entities (Events, CRM, Staff, etc.) use `PrismaJsonStore` — a generic JSON blob store that doesn't map to dedicated Prisma models.

### Strengths

- Consistent pattern across all domains
- Full Manifest pipeline: guards → constraints → mutate → persist → emit events
- Idempotency, telemetry, outbox all wired automatically
- Generated code — no hand-writing route handlers

### Limitations

- **One entity per `runCommand` call** — Cannot create Recipe + RecipeVersion + Ingredients atomically
- **No complex input parsing** — Expects JSON body, not FormData
- **No file uploads** — No image handling
- **No Next.js-specific features** — No `revalidatePath`, no `redirect`
- **No cross-entity transactions** — Each `runCommand` is independent

---

## Pattern B: Server Action with Manifest Constraint Checking

**Location:** `apps/app/app/(authenticated)/kitchen/recipes/actions-manifest.ts`
**Count:** 1 file, 1162 lines
**Used by:** Recipe create, Recipe update, Dish create

### How it works

```typescript
// "use server" — runs on the Next.js server, called directly from React components

export const createRecipe = async (formData: FormData) => {
  // 1. Parse complex FormData (ingredients as JSON/text, steps, image file)
  const name = String(formData.get("name")).trim();
  const ingredientInputs = parseIngredientInput(formData.get("ingredients"));
  const imageFile = readImageFile(formData, "imageFile");

  // 2. Upload image to Vercel Blob storage
  const imageUrl = imageFile ? await uploadImage(tenantId, `recipes/${recipeId}/hero`, imageFile) : null;

  // 3. Create Manifest runtime for CONSTRAINT CHECKING ONLY
  const runtimeContext = await createRuntimeContext();
  const runtime = await createRecipeRuntime(runtimeContext);

  // 4. Create entity instances in Manifest (in-memory)
  await runtime.createInstance("Recipe", { id: recipeId, tenantId, name, ... });
  await runtime.createInstance("RecipeVersion", { id: versionId, recipeId, ... });

  // 5. Run command for constraint checking
  const versionResult = await createRecipeVersion(runtime, versionId, ...);

  // 6. Check blocking constraints
  const blockingConstraints = versionResult.constraintOutcomes?.filter(o => !o.passed && o.severity === "block");
  if (blockingConstraints?.length > 0) throw new Error(`Cannot create recipe: ${messages}`);

  // 7. HAND-ROLLED PERSISTENCE — raw SQL, NOT through Manifest store
  await database.$executeRaw(Prisma.sql`INSERT INTO tenant_kitchen.recipes (...) VALUES (...)`);
  await database.$executeRaw(Prisma.sql`INSERT INTO tenant_kitchen.recipe_versions (...) VALUES (...)`);
  for (const ingredient of ingredientInputs) {
    const ingredientId = await ensureIngredientId(tenantId, ingredient.name, unitId);
    await database.$executeRaw(Prisma.sql`INSERT INTO tenant_kitchen.recipe_ingredients (...) VALUES (...)`);
  }
  for (const step of stepInputs) {
    await database.$executeRaw(Prisma.sql`INSERT INTO tenant_kitchen.recipe_steps (...) VALUES (...)`);
  }

  // 8. Manual outbox event
  await enqueueOutboxEvent(tenantId, "recipe", recipeId, "recipe.created", { ... });

  // 9. Next.js-specific
  revalidatePath("/kitchen/recipes");
  redirect("/kitchen/recipes");
};
```

### Why this pattern exists

The recipe creation flow is **inherently multi-entity**:

- 1 Recipe
- 1 RecipeVersion
- N RecipeIngredients (each may auto-create an Ingredient)
- N RecipeSteps
- 1 Image upload
- 1 Outbox event

The generated single-entity routes can't handle this. `runtime.runCommand()` operates on one entity at a time (confirmed by Manifest docs: _"The runtime itself does not manage database transactions; transaction management should be handled at the caller level."_).

### What Manifest provides here

**Only constraint checking.** The runtime creates in-memory instances, runs guards and constraints, and returns `constraintOutcomes`. The actual persistence is entirely hand-rolled SQL.

### What Manifest does NOT provide here

- No PrismaStore persistence (uses raw SQL instead)
- No outbox integration (manual `enqueueOutboxEvent`)
- No idempotency
- No telemetry hooks
- No transactional atomicity across entities

### The gap

The `createRuntimeContext()` in the server action creates a `KitchenOpsContext` with a `PrismaStoreProvider`, but the code never uses it for persistence. It creates instances with `runtime.createInstance()` (in-memory) and runs commands for constraint outcomes, then throws all that away and does raw SQL.

---

## Pattern C: Direct apiFetch (No Manifest)

**Location:** Various frontend hooks and pages
**Used by:** Some older kitchen routes, custom queries

Some routes in `apps/api` are hand-written (not generated) and don't use the Manifest runtime at all. They do direct Prisma queries. The frontend calls them via `apiFetch()`.

Example: `apps/api/app/api/kitchen/recipe/list/route.ts` — a list/read route that just does `prisma.recipe.findMany()`.

**Read routes generally don't need Manifest** — Manifest is a command/write-side system. Reads bypass it for performance.

---

## The Runtime Pipeline

From the Manifest docs (`/angriff36/manifest`):

```
.manifest file
    ↓ compileToIR()
IR (Intermediate Representation)
    ↓ ManifestRuntimeEngine(ir, context, options)
RuntimeEngine
    ↓ runtime.runCommand(commandName, input, { entityName, instanceId })
CommandResult {
  success: boolean
  result: entity instance (after mutations)
  emittedEvents: EmittedEvent[]
  constraintOutcomes: ConstraintOutcome[]
  error?: string
  guardFailure?: { index, formatted }
  policyDenial?: { policyName }
}
```

### Key runtime behaviors (from Context7 docs)

1. **`runCommand` operates on ONE entity** — You cannot create parent + children in a single call
2. **Store adapters must implement `load(id)` and `save(id, data)`** — The runtime calls these during command execution
3. **The runtime does NOT manage transactions** — Caller must wrap in `prisma.$transaction` if atomicity is needed
4. **`store X in memory` vs `store X in postgres`** — The `.manifest` file declares intent, but the actual adapter is provided via `RuntimeOptions.storeProvider` at runtime
5. **For multi-step workflows, use the "Embedded Runtime Pattern"** — Orchestrate multiple `runCommand` calls, optionally chaining via `runtime.onEvent()`

### Embedded Runtime Pattern (from Manifest docs)

```typescript
// For complex multi-entity workflows
export async function POST(request: Request) {
  const runtime = new RuntimeEngine(ir, { userId, tenantId });

  // Chain commands via events
  runtime.onEvent(async (event) => {
    if (event.name === "RecipeCreated") {
      await runtime.runCommand("RecipeVersion", "create", {
        recipeId: event.payload.recipeId,
        ...versionData,
      });
    }
  });

  const result = await runtime.runCommand("Recipe", "create", input);
  return Response.json(result);
}
```

### Batch Operations (from Manifest docs)

```typescript
// Instead of N individual calls:
for (const item of items) {
  await runtime.executeCommand("RecipeIngredient", "create", item);
}

// Prefer a single command that handles the batch:
await runtime.executeCommand("Recipe", "addIngredients", {
  ingredients: items,
});
// Manifest handles all items in one transaction
```

---

## Store Providers

### PrismaStore (dedicated, hand-written)

**Location:** `packages/manifest-adapters/src/prisma-store.ts` (~2300 lines)
**Entities:** 13 (PrepTask, Recipe, RecipeVersion, Ingredient, RecipeIngredient, Dish, Menu, MenuDish, PrepList, PrepListItem, Station, InventoryItem, KitchenTask)

Each entity has:

- `load*FromPrisma(prisma, tenantId, id)` — Load entity from dedicated Prisma model
- `sync*ToPrisma(prisma, tenantId, entity)` — Persist entity to dedicated Prisma model
- Field mapping between Manifest property names and Prisma column names

**Pros:** Type-safe, efficient queries, proper field mapping
**Cons:** 2200+ lines of hand-written mapping code, doesn't scale

### PrismaJsonStore (generic, zero-config)

**Location:** `packages/manifest-adapters/src/prisma-json-store.ts`
**Entities:** Everything NOT in the 13 above (Events, CRM, Staff, etc.)

Stores entity state as a JSON blob in a generic `ManifestEntity` table:

```
@@id([tenantId, entityType, id])
```

**Pros:** Zero per-entity config, works for any entity
**Cons:** No type safety at DB level, no relational queries, no FK constraints

### In-Memory Store (testing / constraint-only)

**Used by:** Pattern B (server action) — creates instances in memory for constraint checking, never persists through the store.

---

## Multi-Entity Orchestration

### The Problem

Many real-world operations span multiple entities:

| Operation            | Entities Involved                                                    |
| -------------------- | -------------------------------------------------------------------- |
| Create Recipe        | Recipe + RecipeVersion + N RecipeIngredients + N RecipeSteps + Image |
| Create Event         | Event + CateringOrder + Budget + BudgetLineItems                     |
| Create Proposal      | Proposal + N ProposalLineItems                                       |
| Create PrepList      | PrepList + N PrepListItems (auto-generated from recipes)             |
| Create PurchaseOrder | PurchaseOrder + N PurchaseOrderItems                                 |

The generated single-entity routes handle each entity independently. There's no built-in multi-entity transaction.

### Current Solutions

1. **Pattern B (server action)** — Hand-orchestrate everything in one function. Works but bypasses Manifest persistence.
2. **Frontend orchestration** — Call multiple API routes in sequence. No atomicity.
3. **Composite API route** — Hand-write a route in `apps/api` that orchestrates multiple `runCommand` calls within a `prisma.$transaction`. Not yet implemented.

### Recommended Pattern: Composite Command Route

For multi-entity operations, create a hand-written route that uses the Embedded Runtime Pattern:

```typescript
// apps/api/app/api/kitchen/recipes/composite/create-with-version/route.ts
// NOT generated — hand-written orchestration

export async function POST(request: NextRequest) {
  const { orgId, userId } = await auth();
  const tenantId = await getTenantIdForOrg(orgId);
  const body = await request.json();

  const runtime = await createManifestRuntime({
    user: { id: userId, tenantId },
    manifestName: "recipe-rules",
  });

  // Wrap in transaction for atomicity
  const result = await database.$transaction(async (tx) => {
    // 1. Create Recipe
    const recipeResult = await runtime.runCommand("create", body.recipe, {
      entityName: "Recipe",
    });
    if (!recipeResult.success) return recipeResult;

    // 2. Create RecipeVersion
    const versionResult = await runtime.runCommand("create", body.version, {
      entityName: "RecipeVersion",
    });
    if (!versionResult.success) return versionResult;

    // 3. Create RecipeIngredients
    for (const ingredient of body.ingredients) {
      const ingredientResult = await runtime.runCommand("create", ingredient, {
        entityName: "RecipeIngredient",
      });
      if (!ingredientResult.success) return ingredientResult;
    }

    return { success: true, recipeId: body.recipe.id };
  });

  return manifestSuccessResponse(result);
}
```

**This pattern:**

- Uses Manifest for ALL constraint checking AND persistence
- Wraps in `prisma.$transaction` for atomicity
- Returns on first failure (no partial creates)
- Still gets telemetry, outbox events, idempotency

**Limitations:**

- Image uploads must happen BEFORE the transaction (upload to blob storage, pass URL in body)
- `revalidatePath`/`redirect` must be handled by the frontend after the API call
- FormData parsing must happen on the frontend or in a middleware layer

---

## Dead Routes & Cleanup

### Confirmed Dead (safe to delete)

| Route Group                                             | Count   | Reason                                          |
| ------------------------------------------------------- | ------- | ----------------------------------------------- |
| `apps/api/app/api/command-board/boards/commands/*`      | 5       | Replaced by server actions (React Flow rewrite) |
| `apps/api/app/api/command-board/cards/commands/*`       | 5       | Same                                            |
| `apps/api/app/api/command-board/connections/commands/*` | 2       | Same                                            |
| `apps/api/app/api/command-board/groups/commands/*`      | 3       | Same                                            |
| `apps/api/app/api/command-board/layouts/commands/*`     | 3       | Same                                            |
| `apps/api/app/api/command-board/[boardId]/draft`        | 1       | Old draft system removed                        |
| `apps/api/app/api/kitchen/manifest/*`                   | 9       | Gen 1 routes, replaced by server actions        |
| `other-app/`                                            | 1       | Dead sandbox, no package.json                   |
| **Total**                                               | **~30** |                                                 |

### Still Live (keep)

| Route                                                | Reason                                 |
| ---------------------------------------------------- | -------------------------------------- |
| `apps/api/app/api/command-board/[boardId]/replay`    | Called by `use-replay-events.ts`       |
| `apps/api/app/api/command-board/chat`                | Actually in `apps/app`, not `apps/api` |
| All other domain routes (kitchen, events, CRM, etc.) | Actively called by frontend            |

### Two Generations of Generated Routes

| Generation | Header                                        | Location                          | Status                                 |
| ---------- | --------------------------------------------- | --------------------------------- | -------------------------------------- |
| Gen 1      | `"DO NOT EDIT - Changes will be overwritten"` | `kitchen/manifest/`, `other-app/` | **ALL DEAD**                           |
| Gen 2      | `"Generated from Manifest IR - DO NOT EDIT"`  | All domains                       | **Mostly live** (except command-board) |

---

## Migration Strategy

### Phase 1: Fix Pattern B (Recipe Server Action)

**Goal:** Make the recipe server action use Manifest for persistence, not just constraint checking.

**Option 1: Migrate to Composite API Route** (recommended for consistency)

1. Create `apps/api/app/api/kitchen/recipes/composite/create-with-version/route.ts`
2. Move FormData parsing to a shared utility
3. Handle image upload separately (upload first, pass URL)
4. Frontend calls the composite route via `apiFetch`
5. Delete the server action

**Option 2: Enhance Server Action with PrismaStore Sync** (faster, less consistent)

1. Replace raw SQL with `syncRecipeToPrisma`, `syncRecipeVersionToPrisma`, etc.
2. Keep the server action pattern
3. Still bypasses the generated route system

**Option 3: Keep As-Is** (pragmatic)

1. The server action works
2. Manifest constraint checking is wired
3. Raw SQL is tested and correct
4. Migrate later when Manifest supports multi-entity transactions natively

### Phase 2: Delete Dead Routes

1. Delete all command-board manifest routes (30 files)
2. Delete Gen 1 kitchen/manifest routes (9 files)
3. Delete `other-app/` directory
4. Verify no regressions with `pnpm check`

### Phase 3: PrismaStore for Remaining Entities

Currently only 13 entities have dedicated PrismaStore implementations. The other ~45 entities use PrismaJsonStore (JSON blob). For entities that need relational queries or FK constraints, add dedicated PrismaStore implementations.

Priority order:

1. Event, CateringOrder (high-traffic, relational)
2. Client, Proposal (CRM core)
3. PurchaseOrder, Shipment (inventory core)
4. Others as needed

### Phase 4: Frontend Consistency

Migrate remaining direct Prisma routes to use Manifest runtime:

- 42 routes identified in `IMPLEMENTATION_PLAN.md` as bypassing Manifest
- Focus on write operations (reads can stay as direct Prisma for performance)

---

## Decision Log

| Date       | Decision                                                | Rationale                                                                                                     |
| ---------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 2026-02-10 | Use `store X in memory` in .manifest files              | PrismaStore adapter provided at runtime via `storeProvider`, not declared in manifest                         |
| 2026-02-10 | PrismaJsonStore as fallback                             | Zero-config persistence for entities without dedicated Prisma models                                          |
| 2026-02-14 | Recipe server action uses Manifest for constraints only | Multi-entity creation (recipe + version + ingredients + steps + image) can't be done in a single `runCommand` |
| 2026-02-15 | Generated routes for all 232 commands                   | Consistent pattern, auto-generated from IR                                                                    |
| 2026-02-15 | Command board routes dead after React Flow rewrite      | Server actions replaced all board CRUD                                                                        |
| 2026-02-16 | Document three coexisting patterns                      | Acknowledge reality before forcing migration                                                                  |
| 2026-02-16 | Recommend composite command routes for multi-entity ops | Embedded Runtime Pattern from Manifest docs, wraps in `prisma.$transaction`                                   |
