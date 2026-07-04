import type { ConstraintOutcome } from "@angriff36/manifest/ir";
import {
  database,
  type IngredientInput,
  type Prisma,
  resolveIngredients,
} from "@repo/database";
import { getBlockingConstraints } from "@repo/manifest-runtime/route-helpers";
import { mapFailureToExplanation } from "@/lib/manifest/friendly-error-mapper";
import { createManifestRuntime } from "@/lib/manifest-runtime";

type TransactionClient = Prisma.TransactionClient;

interface ResolvedIngredientInput {
  ingredientId: string;
  isOptional?: boolean;
  preparationNotes?: string;
  quantity: number;
  sortOrder: number;
  unitId: number;
}

interface RawIngredientInput {
  isOptional?: boolean;
  name: string;
  preparationNotes?: string | null;
  quantity: number;
  sortOrder: number;
  unit?: string | null;
}

type IngredientInputItem = ResolvedIngredientInput | RawIngredientInput;

export interface UpdateRecipeRequest {
  category?: string;
  cookTimeMinutes?: number;
  cuisineType?: string;
  description?: string;
  difficultyLevel?: number;
  ingredients?: IngredientInputItem[];
  instructions?: string;
  name?: string;
  notes?: string;
  override?: {
    reasonCode: string;
    details: string;
  };
  prepTimeMinutes?: number;
  restTimeMinutes?: number;
  steps?: {
    stepNumber: number;
    instruction: string;
    durationMinutes?: number;
    temperatureValue?: number;
    temperatureUnit?: string;
    equipmentNeeded?: string;
    tips?: string;
    videoUrl?: string;
    imageUrl?: string;
  }[];
  tags?: string[];
  yieldDescription?: string;
  yieldQuantity?: number;
  yieldUnitId?: number;
}

interface UpdateRecipeWithVersionInput {
  body: UpdateRecipeRequest;
  recipeId: string;
  tenantId: string;
  userId: string;
}

export interface UpdateRecipeWithVersionResult {
  constraintOutcomes: ConstraintOutcome[];
  events: unknown[];
  ingredients: unknown[];
  newVersionNumber: number;
  steps: unknown[];
  version: unknown;
}

export class ConstraintBlockedError extends Error {
  readonly constraintOutcomes: ConstraintOutcome[];

  constructor(constraintOutcomes: ConstraintOutcome[]) {
    super("Recipe update blocked by constraints");
    this.name = "ConstraintBlockedError";
    this.constraintOutcomes = constraintOutcomes;
  }
}

export class RecipeNotFoundError extends Error {
  constructor() {
    super("Recipe not found");
    this.name = "RecipeNotFoundError";
  }
}

/**
 * Thrown when a Manifest guard rejects a command, so the route can answer
 * 422 with a plain-language message instead of a 500 with the raw guard
 * expression.
 */
export class GuardBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GuardBlockedError";
  }
}

function guardBlockedError(
  entity: string,
  command: string,
  result: { error?: string; guardFailure?: unknown },
  body: object
): GuardBlockedError {
  const friendly = mapFailureToExplanation(
    {
      entity,
      command,
      kind: "guard_failed",
      message: result.error ?? `${entity}.${command} was blocked`,
      guardFailure: result.guardFailure,
    },
    { body: body as Record<string, unknown> }
  );
  return new GuardBlockedError(friendly.message);
}

function isResolvedIngredient(
  item: IngredientInputItem
): item is ResolvedIngredientInput {
  return typeof (item as ResolvedIngredientInput).ingredientId === "string";
}

function shouldUpdateRecipe(body: UpdateRecipeRequest): boolean {
  return Boolean(
    body.name ||
      body.category ||
      body.cuisineType ||
      body.description ||
      body.tags
  );
}

function loadCurrentRecipe(
  tx: TransactionClient,
  tenantId: string,
  recipeId: string
) {
  return tx.recipe.findFirst({
    where: {
      tenantId,
      id: recipeId,
      deletedAt: null,
    },
    select: {
      name: true,
      category: true,
      cuisineType: true,
      description: true,
      tags: true,
    },
  });
}

function loadLatestVersion(
  tx: TransactionClient,
  tenantId: string,
  recipeId: string
) {
  return tx.recipeVersion.findFirst({
    where: {
      tenantId,
      recipeId,
      deletedAt: null,
    },
    orderBy: {
      versionNumber: "desc",
    },
    select: {
      name: true,
      category: true,
      cuisineType: true,
      description: true,
      tags: true,
      yieldQuantity: true,
      yieldUnitId: true,
      yieldDescription: true,
      prepTimeMinutes: true,
      cookTimeMinutes: true,
      restTimeMinutes: true,
      difficultyLevel: true,
      instructions: true,
      notes: true,
    },
  });
}

function buildRecipeUpdatePayload(
  body: UpdateRecipeRequest,
  currentRecipe: NonNullable<Awaited<ReturnType<typeof loadCurrentRecipe>>>,
  recipeId: string
) {
  return {
    id: recipeId,
    name: body.name ?? currentRecipe.name,
    category: body.category ?? currentRecipe.category ?? "",
    cuisineType: body.cuisineType ?? currentRecipe.cuisineType ?? "",
    description: body.description ?? currentRecipe.description ?? "",
    tags: body.tags ?? currentRecipe.tags ?? [],
  };
}

function buildVersionCreatePayload(
  body: UpdateRecipeRequest,
  latestVersion: NonNullable<Awaited<ReturnType<typeof loadLatestVersion>>>,
  recipeId: string,
  newVersionId: string,
  newVersionNumber: number
) {
  const yieldQuantity =
    body.yieldQuantity ?? Number(latestVersion.yieldQuantity);
  const yieldUnitId = body.yieldUnitId ?? latestVersion.yieldUnitId;
  const prepTimeMinutes =
    body.prepTimeMinutes ?? latestVersion.prepTimeMinutes ?? 0;
  const cookTimeMinutes =
    body.cookTimeMinutes ?? latestVersion.cookTimeMinutes ?? 0;
  const restTimeMinutes =
    body.restTimeMinutes ?? latestVersion.restTimeMinutes ?? 0;
  const difficultyLevel =
    body.difficultyLevel ?? latestVersion.difficultyLevel ?? 1;
  const instructions = body.instructions ?? latestVersion.instructions ?? "";
  const notes = body.notes ?? latestVersion.notes ?? "";

  return {
    id: newVersionId,
    recipeId,
    name: body.name ?? latestVersion.name,
    category: body.category ?? latestVersion.category ?? "",
    cuisineType: body.cuisineType ?? latestVersion.cuisineType ?? "",
    description: body.description ?? latestVersion.description ?? "",
    tags: body.tags ?? latestVersion.tags ?? [],
    versionNumber: newVersionNumber,
    // Property seeds — the create pipeline copies matching entity columns
    // from the input into the new row.
    yieldQuantity,
    yieldUnitId,
    yieldDescription:
      body.yieldDescription ?? latestVersion.yieldDescription ?? "",
    prepTimeMinutes,
    cookTimeMinutes,
    restTimeMinutes,
    difficultyLevel,
    instructions,
    notes,
    // RecipeVersion.create command params (see
    // manifest/source/kitchen/recipe-rules.manifest) — guards and mutates
    // read THESE names, not the column names above.
    yieldQty: yieldQuantity,
    yieldUnit: yieldUnitId,
    prepTime: prepTimeMinutes,
    cookTime: cookTimeMinutes,
    restTime: restTimeMinutes,
    difficulty: difficultyLevel,
    instructionsText: instructions,
    notesText: notes,
  };
}

function collectConstraintOutcomes(
  allConstraintOutcomes: ConstraintOutcome[],
  nextOutcomes: ConstraintOutcome[] | undefined
): ConstraintOutcome[] {
  return nextOutcomes
    ? [...allConstraintOutcomes, ...nextOutcomes]
    : allConstraintOutcomes;
}

function throwIfBlocked(
  result: { success: boolean; constraintOutcomes?: ConstraintOutcome[] },
  allConstraintOutcomes: ConstraintOutcome[],
  hasOverride: boolean
) {
  if (hasOverride) {
    return;
  }

  const blocking = getBlockingConstraints(result);
  if (blocking) {
    throw new ConstraintBlockedError(allConstraintOutcomes);
  }
}

function commandFailureMessage(
  result: {
    error?: string;
    guardFailure?: { formatted?: string };
    policyDenial?: { policyName?: string };
  },
  fallback: string
) {
  return (
    result.guardFailure?.formatted ||
    result.policyDenial?.policyName ||
    result.error ||
    fallback
  );
}

async function resolveRecipeIngredients(
  tx: TransactionClient,
  tenantId: string,
  ingredients: IngredientInputItem[]
) {
  const resolvedIngredients: ResolvedIngredientInput[] = [];
  const rawIngredients: IngredientInput[] = [];

  for (const item of ingredients) {
    if (isResolvedIngredient(item)) {
      resolvedIngredients.push(item);
      continue;
    }

    rawIngredients.push({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit ?? null,
      preparationNotes: item.preparationNotes ?? null,
      isOptional: item.isOptional ?? false,
    });
  }

  const newlyResolved =
    rawIngredients.length > 0
      ? await resolveIngredients(tx, tenantId, rawIngredients)
      : [];

  return [
    ...resolvedIngredients.map((ingredient) => ({
      ingredientId: ingredient.ingredientId,
      quantity: ingredient.quantity,
      unitId: ingredient.unitId,
      preparationNotes: ingredient.preparationNotes || null,
      isOptional: ingredient.isOptional ?? false,
      sortOrder: ingredient.sortOrder,
    })),
    ...newlyResolved.map((ingredient, index) => ({
      ingredientId: ingredient.ingredientId,
      quantity: ingredient.quantity,
      unitId: ingredient.unitId,
      preparationNotes: ingredient.preparationNotes,
      isOptional: ingredient.isOptional,
      sortOrder: rawIngredients[index]?.sortOrder ?? index,
    })),
  ];
}

async function createIngredients({
  allConstraintOutcomes,
  body,
  hasOverride,
  newVersionId,
  runtime,
  tenantId,
  tx,
}: {
  allConstraintOutcomes: ConstraintOutcome[];
  body: UpdateRecipeRequest;
  hasOverride: boolean;
  newVersionId: string;
  runtime: Awaited<ReturnType<typeof createManifestRuntime>>;
  tenantId: string;
  tx: TransactionClient;
}) {
  const createdIngredients: unknown[] = [];
  let constraintOutcomes = allConstraintOutcomes;

  if (!body.ingredients || body.ingredients.length === 0) {
    return { createdIngredients, constraintOutcomes };
  }

  const ingredients = await resolveRecipeIngredients(
    tx,
    tenantId,
    body.ingredients
  );

  for (const ingredient of ingredients) {
    const ingredientResult = await runtime.runCommand(
      "create",
      {
        id: crypto.randomUUID(),
        recipeVersionId: newVersionId,
        ingredientId: ingredient.ingredientId,
        quantity: ingredient.quantity,
        unitId: ingredient.unitId,
        preparationNotes: ingredient.preparationNotes || "",
        isOptional: ingredient.isOptional,
        sortOrder: ingredient.sortOrder,
      },
      { entityName: "RecipeIngredient" }
    );

    constraintOutcomes = collectConstraintOutcomes(
      constraintOutcomes,
      ingredientResult.constraintOutcomes
    );

    if (!(ingredientResult.success || hasOverride)) {
      if (ingredientResult.guardFailure) {
        throw guardBlockedError(
          "RecipeIngredient",
          "create",
          ingredientResult,
          body
        );
      }
      throw new Error(`Failed to create ingredient: ${ingredientResult.error}`);
    }

    if (ingredientResult.result) {
      createdIngredients.push(ingredientResult.result);
    }
  }

  return { createdIngredients, constraintOutcomes };
}

async function createSteps({
  allConstraintOutcomes,
  body,
  hasOverride,
  newVersionId,
  runtime,
}: {
  allConstraintOutcomes: ConstraintOutcome[];
  body: UpdateRecipeRequest;
  hasOverride: boolean;
  newVersionId: string;
  runtime: Awaited<ReturnType<typeof createManifestRuntime>>;
}) {
  const createdSteps: unknown[] = [];
  let constraintOutcomes = allConstraintOutcomes;

  for (const step of body.steps || []) {
    const stepResult = await runtime.runCommand(
      "create",
      {
        id: crypto.randomUUID(),
        recipeVersionId: newVersionId,
        stepNumber: step.stepNumber,
        instruction: step.instruction,
        durationMinutes: step.durationMinutes || 0,
        temperatureValue: step.temperatureValue || 0,
        temperatureUnit: step.temperatureUnit || "",
        equipmentNeeded: step.equipmentNeeded
          ? step.equipmentNeeded
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
        tips: step.tips || "",
        videoUrl: step.videoUrl || "",
        imageUrl: step.imageUrl || "",
      },
      { entityName: "RecipeStep" }
    );

    constraintOutcomes = collectConstraintOutcomes(
      constraintOutcomes,
      stepResult.constraintOutcomes
    );

    if (!(stepResult.success || hasOverride)) {
      if (stepResult.guardFailure) {
        throw guardBlockedError("RecipeStep", "create", stepResult, body);
      }
      throw new Error(
        `Failed to create step ${step.stepNumber}: ${stepResult.error}`
      );
    }

    if (stepResult.result) {
      createdSteps.push(stepResult.result);
    }
  }

  return { createdSteps, constraintOutcomes };
}

export async function updateRecipeWithVersion({
  body,
  recipeId,
  tenantId,
  userId,
}: UpdateRecipeWithVersionInput): Promise<UpdateRecipeWithVersionResult> {
  const maxVersionResult = await database.recipeVersion.aggregate({
    where: {
      tenantId,
      recipeId,
      deletedAt: null,
    },
    _max: {
      versionNumber: true,
    },
  });

  const maxVersion = maxVersionResult._max.versionNumber;
  if (maxVersion === null) {
    throw new RecipeNotFoundError();
  }

  const hasOverride = Boolean(body.override);
  const newVersionNumber = maxVersion + 1;
  const newVersionId = crypto.randomUUID();

  return database.$transaction(async (tx) => {
    const runtime = await createManifestRuntime({
      user: { id: userId, tenantId },
      prismaOverride: tx,
    });
    let allConstraintOutcomes: ConstraintOutcome[] = [];

    if (shouldUpdateRecipe(body)) {
      const currentRecipe = await loadCurrentRecipe(tx, tenantId, recipeId);
      if (!currentRecipe) {
        throw new Error("Recipe not found");
      }

      const updateResult = await runtime.runCommand(
        "update",
        buildRecipeUpdatePayload(body, currentRecipe, recipeId),
        { entityName: "Recipe" }
      );

      allConstraintOutcomes = collectConstraintOutcomes(
        allConstraintOutcomes,
        updateResult.constraintOutcomes
      );
      throwIfBlocked(updateResult, allConstraintOutcomes, hasOverride);

      if (!(updateResult.success || hasOverride) && updateResult.guardFailure) {
        throw guardBlockedError("Recipe", "update", updateResult, body);
      }
    }

    const latestVersion = await loadLatestVersion(tx, tenantId, recipeId);
    if (!latestVersion) {
      throw new Error("No version found for recipe");
    }

    const versionResult = await runtime.runCommand(
      "create",
      buildVersionCreatePayload(
        body,
        latestVersion,
        recipeId,
        newVersionId,
        newVersionNumber
      ),
      { entityName: "RecipeVersion" }
    );

    allConstraintOutcomes = collectConstraintOutcomes(
      allConstraintOutcomes,
      versionResult.constraintOutcomes
    );
    throwIfBlocked(versionResult, allConstraintOutcomes, hasOverride);

    if (!(versionResult.success || hasOverride)) {
      if (versionResult.guardFailure) {
        throw guardBlockedError("RecipeVersion", "create", versionResult, body);
      }
      throw new Error(
        commandFailureMessage(versionResult, "Failed to create new version")
      );
    }

    const ingredientsResult = await createIngredients({
      allConstraintOutcomes,
      body,
      hasOverride,
      newVersionId,
      runtime,
      tenantId,
      tx,
    });
    allConstraintOutcomes = ingredientsResult.constraintOutcomes;

    const stepsResult = await createSteps({
      allConstraintOutcomes,
      body,
      hasOverride,
      newVersionId,
      runtime,
    });
    allConstraintOutcomes = stepsResult.constraintOutcomes;

    return {
      version: versionResult.result,
      ingredients: ingredientsResult.createdIngredients,
      steps: stepsResult.createdSteps,
      newVersionNumber,
      events: versionResult.emittedEvents || [],
      constraintOutcomes: allConstraintOutcomes,
    };
  });
}
