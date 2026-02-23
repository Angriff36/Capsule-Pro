import { randomUUID } from "node:crypto";
import { auth } from "@repo/auth/server";
import { database, type Prisma } from "@repo/database";
import {
  createRecipeRuntime,
  createRecipeVersion,
  type KitchenOpsContext,
} from "@repo/manifest-adapters";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

// Types
export interface AuthContext {
  tenantId: string;
  userId: string;
  userRole: string;
}

export interface RecipeContext {
  recipe: {
    id: string;
    name: string;
    category: string | null;
    cuisineType: string | null;
    description: string | null;
    tags: string[];
  };
}

export interface RecipeVersionSource {
  id: string;
  name: string;
  category: string | null;
  cuisine_type: string | null;
  description: string | null;
  tags: string[] | null;
  yield_quantity: number;
  yield_unit_id: number;
  yield_description: string | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  rest_time_minutes: number | null;
  difficulty_level: number | null;
  instructions: string | null;
  notes: string | null;
}

export interface CreateVersionRequest {
  name?: string;
  category?: string;
  cuisineType?: string;
  description?: string;
  tags?: string[];
  yieldQuantity?: number;
  yieldUnitId?: number;
  yieldDescription?: string;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  restTimeMinutes?: number;
  difficultyLevel?: number;
  instructions?: string;
  notes?: string;
  ingredientCount?: number;
  stepCount?: number;
}

export interface VersionResult {
  versionId: string;
  recipeId: string;
  versionNumber: number;
  name: string;
  yieldQuantity?: number;
  yieldUnitId?: number;
  constraintOutcomes?: unknown[];
  emittedEvents?: unknown[];
}

export interface RestoreResult {
  versionId: string;
  recipeId: string;
  sourceVersionId: string;
  versionNumber: number;
  name: string;
}

// Helper: Get authenticated context
export async function getAuthContext(): Promise<
  | { success: true; context: AuthContext }
  | { success: false; response: NextResponse }
> {
  const { orgId, userId } = await auth();

  if (!orgId) {
    return {
      success: false,
      response: NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
    };
  }

  const tenantId = await getTenantIdForOrg(orgId);

  const currentUser = await database.user.findFirst({
    where: {
      AND: [{ tenantId }, { authUserId: userId ?? "" }],
    },
  });

  if (!currentUser) {
    return {
      success: false,
      response: NextResponse.json(
        { message: "User not found in database" },
        { status: 400 }
      ),
    };
  }

  return {
    success: true,
    context: {
      tenantId,
      userId: currentUser.id,
      userRole: currentUser.role,
    },
  };
}

// Helper: Fetch and validate recipe
export async function fetchAndValidateRecipe(
  tenantId: string,
  recipeId: string
): Promise<
  | { success: true; recipe: RecipeContext["recipe"] }
  | { success: false; response: NextResponse }
> {
  const recipe = await database.recipe.findFirst({
    where: {
      AND: [{ tenantId }, { id: recipeId }, { deletedAt: null }],
    },
  });

  if (!recipe) {
    return {
      success: false,
      response: NextResponse.json(
        { message: "Recipe not found" },
        { status: 404 }
      ),
    };
  }

  return {
    success: true,
    recipe: {
      id: recipe.id,
      name: recipe.name,
      category: recipe.category,
      cuisineType: recipe.cuisineType,
      description: recipe.description,
      tags: Array.isArray(recipe.tags) ? recipe.tags : [],
    },
  };
}

// Helper: Get next version number
export async function getNextVersionNumber(
  tenantId: string,
  recipeId: string
): Promise<number> {
  const [maxVersionRow] = await database.$queryRaw<{ max: number | null }[]>`
    SELECT MAX(version_number)::int AS max
    FROM tenant_kitchen.recipe_versions
    WHERE tenant_id = ${tenantId}
      AND recipe_id = ${recipeId}
  `;
  return (maxVersionRow?.max ?? 0) + 1;
}

// Helper: Fetch source version for restoration
export async function fetchSourceVersion(
  tenantId: string,
  recipeId: string,
  sourceVersionId: string
): Promise<
  | { success: true; version: RecipeVersionSource }
  | { success: false; response: NextResponse }
> {
  const [sourceVersion] = await database.$queryRaw<RecipeVersionSource[]>`
    SELECT
      id,
      name,
      category,
      cuisine_type,
      description,
      tags,
      yield_quantity,
      yield_unit_id,
      yield_description,
      prep_time_minutes,
      cook_time_minutes,
      rest_time_minutes,
      difficulty_level,
      instructions,
      notes
    FROM tenant_kitchen.recipe_versions
    WHERE tenant_id = ${tenantId}
      AND recipe_id = ${recipeId}
      AND id = ${sourceVersionId}
      AND deleted_at IS NULL
    LIMIT 1
  `;

  if (!sourceVersion) {
    return {
      success: false,
      response: NextResponse.json(
        { message: "Source version not found" },
        { status: 404 }
      ),
    };
  }

  return { success: true, version: sourceVersion };
}

// Helper: Create manifest runtime context
export async function createRuntimeContext(
  authContext: AuthContext
): Promise<KitchenOpsContext> {
  const { createPrismaStoreProvider } = await import(
    "@repo/manifest-adapters/prisma-store"
  );

  return {
    tenantId: authContext.tenantId,
    userId: authContext.userId,
    userRole: authContext.userRole,
    storeProvider: createPrismaStoreProvider(database, authContext.tenantId),
  };
}

// Helper: Create version record via Manifest
export async function createVersionViaManifest(
  runtimeContext: KitchenOpsContext,
  data: {
    id: string;
    recipeId: string;
    name: string;
    versionNumber: number;
    category: string;
    cuisineType: string;
    description: string;
    tags: string;
    yieldQuantity: number;
    yieldUnitId: number;
    yieldDescription: string;
    prepTimeMinutes: number;
    cookTimeMinutes: number;
    restTimeMinutes: number;
    difficultyLevel: number;
    instructions: string;
    notes: string;
    ingredientCount: number;
    stepCount: number;
  }
): Promise<{ success: true } | { success: false; response: NextResponse }> {
  try {
    const runtime = await createRecipeRuntime(runtimeContext);

    await runtime.createInstance("RecipeVersion", {
      id: data.id,
      recipeId: data.recipeId,
      tenantId: runtimeContext.tenantId,
      name: data.name,
      versionNumber: data.versionNumber,
      category: data.category,
      cuisineType: data.cuisineType,
      description: data.description,
      tags: data.tags,
      yieldQuantity: data.yieldQuantity,
      yieldUnitId: data.yieldUnitId,
      yieldDescription: data.yieldDescription,
      prepTimeMinutes: data.prepTimeMinutes,
      cookTimeMinutes: data.cookTimeMinutes,
      restTimeMinutes: data.restTimeMinutes,
      difficultyLevel: data.difficultyLevel,
      instructions: data.instructions,
      notes: data.notes,
      ingredientCount: data.ingredientCount,
      stepCount: data.stepCount,
      createdAt: Date.now(),
    });

    return { success: true };
  } catch (error) {
    console.error("Error creating version via Manifest:", error);
    return {
      success: false,
      response: NextResponse.json(
        {
          message: "Failed to create recipe version",
          error: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      ),
    };
  }
}

// Helper: Create version record via Manifest with constraint checking
export async function createVersionWithConstraints(
  runtimeContext: KitchenOpsContext,
  data: {
    id: string;
    recipeId: string;
    name: string;
    versionNumber: number;
    category: string;
    cuisineType: string;
    description: string;
    tags: string;
    yieldQuantity: number;
    yieldUnitId: number;
    yieldDescription: string;
    prepTimeMinutes: number;
    cookTimeMinutes: number;
    restTimeMinutes: number;
    difficultyLevel: number;
    instructions: string;
    notes: string;
    ingredientCount: number;
    stepCount: number;
  }
): Promise<
  | {
      success: true;
      result: { constraintOutcomes: unknown[]; emittedEvents: unknown[] };
    }
  | { success: false; response: NextResponse }
> {
  try {
    const runtime = await createRecipeRuntime(runtimeContext);

    await runtime.createInstance("RecipeVersion", {
      id: data.id,
      recipeId: data.recipeId,
      tenantId: runtimeContext.tenantId,
      name: data.name,
      versionNumber: data.versionNumber,
      category: data.category,
      cuisineType: data.cuisineType,
      description: data.description,
      tags: data.tags,
      yieldQuantity: data.yieldQuantity,
      yieldUnitId: data.yieldUnitId,
      yieldDescription: data.yieldDescription,
      prepTimeMinutes: data.prepTimeMinutes,
      cookTimeMinutes: data.cookTimeMinutes,
      restTimeMinutes: data.restTimeMinutes,
      difficultyLevel: data.difficultyLevel,
      instructions: data.instructions,
      notes: data.notes,
      ingredientCount: data.ingredientCount,
      stepCount: data.stepCount,
      createdAt: Date.now(),
    });

    const result = await createRecipeVersion(
      runtime,
      data.id,
      data.yieldQuantity,
      data.yieldUnitId,
      data.prepTimeMinutes,
      data.cookTimeMinutes,
      data.restTimeMinutes,
      data.difficultyLevel,
      data.instructions,
      data.notes
    );

    const blockingConstraints = result.constraintOutcomes?.filter(
      (o: { passed: boolean; severity: string }) =>
        !o.passed && o.severity === "block"
    );

    if (blockingConstraints && blockingConstraints.length > 0) {
      return {
        success: false,
        response: NextResponse.json(
          {
            message:
              "Cannot create recipe version due to constraint violations",
            constraintOutcomes: blockingConstraints,
          },
          { status: 400 }
        ),
      };
    }

    return {
      success: true,
      result: {
        constraintOutcomes: result.constraintOutcomes ?? [],
        emittedEvents: result.emittedEvents ?? [],
      },
    };
  } catch (error) {
    console.error("Error creating version via Manifest:", error);
    return {
      success: false,
      response: NextResponse.json(
        {
          message: "Failed to create recipe version",
          error: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      ),
    };
  }
}

// Helper: Create version record in database
export async function createVersionRecord(
  tenantId: string,
  versionId: string,
  recipeId: string,
  versionNumber: number,
  data: {
    name: string;
    category?: string | null;
    cuisineType?: string | null;
    description?: string | null;
    tags?: string[];
    yieldQuantity: number;
    yieldUnitId: number;
    yieldDescription?: string | null;
    prepTimeMinutes?: number | null;
    cookTimeMinutes?: number | null;
    restTimeMinutes?: number | null;
    difficultyLevel?: number | null;
    instructions?: string | null;
    notes?: string | null;
  }
): Promise<void> {
  await database.recipeVersion.create({
    data: {
      tenantId,
      id: versionId,
      recipeId,
      name: data.name,
      versionNumber,
      category: data.category,
      cuisineType: data.cuisineType,
      description: data.description,
      tags: data.tags ?? [],
      yieldQuantity: data.yieldQuantity,
      yieldUnitId: data.yieldUnitId,
      yieldDescription: data.yieldDescription,
      prepTimeMinutes: data.prepTimeMinutes,
      cookTimeMinutes: data.cookTimeMinutes,
      restTimeMinutes: data.restTimeMinutes,
      difficultyLevel: data.difficultyLevel,
      instructions: data.instructions,
      notes: data.notes,
    },
  });
}

// Helper: Update recipe metadata
export async function updateRecipeMetadata(
  tenantId: string,
  recipeId: string,
  data: {
    name: string;
    category?: string | null;
    cuisineType?: string | null;
    description?: string | null;
    tags?: string[];
  }
): Promise<void> {
  await database.recipe.update({
    where: { tenantId_id: { tenantId, id: recipeId } },
    data: {
      name: data.name,
      category: data.category,
      cuisineType: data.cuisineType,
      description: data.description,
      tags: data.tags ?? [],
    },
  });
}

// Helper: Copy ingredients from source version
export async function copyIngredientsFromVersion(
  tenantId: string,
  sourceVersionId: string,
  targetVersionId: string
): Promise<void> {
  const ingredients = await database.$queryRaw<
    {
      ingredient_id: string;
      quantity: number;
      unit_id: number;
      preparation_notes: string | null;
      is_optional: boolean;
      sort_order: number;
    }[]
  >`
    SELECT
      ingredient_id,
      quantity,
      unit_id,
      preparation_notes,
      is_optional,
      sort_order
    FROM tenant_kitchen.recipe_ingredients
    WHERE tenant_id = ${tenantId}
      AND recipe_version_id = ${sourceVersionId}
      AND deleted_at IS NULL
    ORDER BY sort_order ASC
  `;

  for (const ingredient of ingredients) {
    await database.recipeIngredient.create({
      data: {
        tenantId,
        id: randomUUID(),
        recipeVersionId: targetVersionId,
        ingredientId: ingredient.ingredient_id,
        quantity: ingredient.quantity,
        unitId: ingredient.unit_id,
        preparationNotes: ingredient.preparation_notes,
        isOptional: ingredient.is_optional,
        sortOrder: ingredient.sort_order,
      },
    });
  }
}

// Helper: Copy steps from source version
export async function copyStepsFromVersion(
  tenantId: string,
  sourceVersionId: string,
  targetVersionId: string
): Promise<void> {
  const steps = await database.$queryRaw<
    {
      step_number: number;
      instruction: string;
      duration_minutes: number | null;
      temperature_value: number | null;
      temperature_unit: string | null;
      equipment_needed: string[] | null;
      tips: string | null;
      video_url: string | null;
      image_url: string | null;
    }[]
  >`
    SELECT
      step_number,
      instruction,
      duration_minutes,
      temperature_value,
      temperature_unit,
      equipment_needed,
      tips,
      video_url,
      image_url
    FROM tenant_kitchen.recipe_steps
    WHERE tenant_id = ${tenantId}
      AND recipe_version_id = ${sourceVersionId}
      AND deleted_at IS NULL
    ORDER BY step_number ASC
  `;

  for (const step of steps) {
    await database.recipe_steps.create({
      data: {
        tenant_id: tenantId,
        id: randomUUID(),
        recipe_version_id: targetVersionId,
        step_number: step.step_number,
        instruction: step.instruction,
        duration_minutes: step.duration_minutes,
        temperature_value: step.temperature_value,
        temperature_unit: step.temperature_unit,
        equipment_needed: step.equipment_needed ?? [],
        tips: step.tips,
        video_url: step.video_url,
        image_url: step.image_url,
      },
    });
  }
}

// Helper: Create version record + outbox event atomically
export async function createVersionRecordWithOutbox(
  tenantId: string,
  versionId: string,
  recipeId: string,
  versionNumber: number,
  data: {
    name: string;
    category?: string | null;
    cuisineType?: string | null;
    description?: string | null;
    tags?: string[];
    yieldQuantity: number;
    yieldUnitId: number;
    yieldDescription?: string | null;
    prepTimeMinutes?: number | null;
    cookTimeMinutes?: number | null;
    restTimeMinutes?: number | null;
    difficultyLevel?: number | null;
    instructions?: string | null;
    notes?: string | null;
  },
  outbox: {
    eventType: string;
    payload: unknown;
  }
): Promise<void> {
  await database.$transaction(async (tx) => {
    await tx.recipeVersion.create({
      data: {
        tenantId,
        id: versionId,
        recipeId,
        name: data.name,
        versionNumber,
        category: data.category,
        cuisineType: data.cuisineType,
        description: data.description,
        tags: data.tags ?? [],
        yieldQuantity: data.yieldQuantity,
        yieldUnitId: data.yieldUnitId,
        yieldDescription: data.yieldDescription,
        prepTimeMinutes: data.prepTimeMinutes,
        cookTimeMinutes: data.cookTimeMinutes,
        restTimeMinutes: data.restTimeMinutes,
        difficultyLevel: data.difficultyLevel,
        instructions: data.instructions,
        notes: data.notes,
      },
    });

    await tx.outboxEvent.create({
      data: {
        tenantId,
        aggregateType: "RecipeVersion",
        aggregateId: versionId,
        eventType: outbox.eventType,
        payload: outbox.payload as Prisma.InputJsonValue,
        status: "pending" as const,
      },
    });
  });
}

// Helper: Build version response
export function buildVersionResponse(result: VersionResult): NextResponse {
  return NextResponse.json(result, { status: 201 });
}

// Helper: Build restore response
export function buildRestoreResponse(result: RestoreResult): NextResponse {
  return NextResponse.json(result, { status: 201 });
}

// Helper: Format tags for storage
export function formatTagsForStorage(tags?: string[]): string {
  return Array.isArray(tags) ? tags.join(",") : "";
}

// Helper: Format tags for database
export function formatTagsForDatabase(tags?: string[]): string[] {
  return Array.isArray(tags) ? tags : [];
}

// Helper: Normalize create version request data
export interface NormalizedVersionData {
  name: string;
  category: string;
  cuisineType: string;
  description: string;
  tagsString: string;
  tagsArray: string[];
  yieldQuantity: number;
  yieldUnitId: number;
  yieldDescription: string;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  restTimeMinutes: number;
  difficultyLevel: number;
  instructions: string;
  notes: string;
  ingredientCount: number;
  stepCount: number;
}

export function normalizeCreateVersionRequest(
  body: CreateVersionRequest,
  recipe: RecipeContext["recipe"]
): NormalizedVersionData {
  return {
    name: body.name ?? recipe.name,
    category: body.category ?? recipe.category ?? "",
    cuisineType: body.cuisineType ?? recipe.cuisineType ?? "",
    description: body.description ?? recipe.description ?? "",
    tagsString: formatTagsForStorage(body.tags)
      ? formatTagsForStorage(body.tags)
      : formatTagsForStorage(recipe.tags),
    tagsArray: body.tags
      ? formatTagsForDatabase(body.tags)
      : formatTagsForDatabase(recipe.tags),
    yieldQuantity: body.yieldQuantity ?? 1,
    yieldUnitId: body.yieldUnitId ?? 1,
    yieldDescription: body.yieldDescription ?? "",
    prepTimeMinutes: body.prepTimeMinutes ?? 0,
    cookTimeMinutes: body.cookTimeMinutes ?? 0,
    restTimeMinutes: body.restTimeMinutes ?? 0,
    difficultyLevel: body.difficultyLevel ?? 1,
    instructions: body.instructions?.trim() ?? "",
    notes: body.notes?.trim() ?? "",
    ingredientCount: body.ingredientCount ?? 0,
    stepCount: body.stepCount ?? 0,
  };
}

// Helper: Execute complete version creation workflow
export async function executeVersionCreationWorkflow(
  tenantId: string,
  recipeId: string,
  versionId: string,
  versionNumber: number,
  runtimeContext: KitchenOpsContext,
  normalizedData: NormalizedVersionData,
  outbox?: {
    eventType: string;
    payload: unknown;
  }
): Promise<
  | {
      success: true;
      result: { constraintOutcomes: unknown[]; emittedEvents: unknown[] };
    }
  | { success: false; response: NextResponse }
> {
  // Create version via Manifest with constraint checking
  const manifestResult = await createVersionWithConstraints(runtimeContext, {
    id: versionId,
    recipeId,
    name: normalizedData.name,
    versionNumber,
    category: normalizedData.category,
    cuisineType: normalizedData.cuisineType,
    description: normalizedData.description,
    tags: normalizedData.tagsString,
    yieldQuantity: normalizedData.yieldQuantity,
    yieldUnitId: normalizedData.yieldUnitId,
    yieldDescription: normalizedData.yieldDescription,
    prepTimeMinutes: normalizedData.prepTimeMinutes,
    cookTimeMinutes: normalizedData.cookTimeMinutes,
    restTimeMinutes: normalizedData.restTimeMinutes,
    difficultyLevel: normalizedData.difficultyLevel,
    instructions: normalizedData.instructions,
    notes: normalizedData.notes,
    ingredientCount: normalizedData.ingredientCount,
    stepCount: normalizedData.stepCount,
  });

  if (!manifestResult.success) {
    return manifestResult;
  }

  const versionData = {
    name: normalizedData.name,
    category: normalizedData.category || null,
    cuisineType: normalizedData.cuisineType || null,
    description: normalizedData.description || null,
    tags: normalizedData.tagsArray,
    yieldQuantity: normalizedData.yieldQuantity,
    yieldUnitId: normalizedData.yieldUnitId,
    yieldDescription: normalizedData.yieldDescription || null,
    prepTimeMinutes: normalizedData.prepTimeMinutes || null,
    cookTimeMinutes: normalizedData.cookTimeMinutes || null,
    restTimeMinutes: normalizedData.restTimeMinutes || null,
    difficultyLevel: normalizedData.difficultyLevel || null,
    instructions: normalizedData.instructions || null,
    notes: normalizedData.notes || null,
  };

  // Sync to Prisma - create the version record (+ outbox atomically if provided)
  if (outbox) {
    await createVersionRecordWithOutbox(
      tenantId,
      versionId,
      recipeId,
      versionNumber,
      versionData,
      outbox
    );
  } else {
    await createVersionRecord(
      tenantId,
      versionId,
      recipeId,
      versionNumber,
      versionData
    );
  }

  return manifestResult;
}
