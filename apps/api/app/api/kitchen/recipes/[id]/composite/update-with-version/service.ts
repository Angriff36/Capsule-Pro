import type { ConstraintOutcome } from "@angriff36/manifest/ir";
import {
  database,
  type IngredientInput,
  resolveIngredients,
  type Prisma,
} from "@repo/database";
import { createManifestRuntime } from "@/lib/manifest-runtime";
import { getBlockingConstraints } from "@repo/manifest-runtime/route-helpers";

type TransactionClient = Prisma.TransactionClient;

interface ResolvedIngredientInput {
  ingredientId: string;
  quantity: number;
  unitId: number;
  preparationNotes?: string;
  isOptional?: boolean;
  sortOrder: number;
}

interface RawIngredientInput {
  name: string;
  quantity: number;
  unit?: string | null;
  preparationNotes?: string | null;
  isOptional?: boolean;
  sortOrder: number;
}

type IngredientInputItem = ResolvedIngredientInput | RawIngredientInput;

export interface UpdateRecipeRequest {
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
  ingredients?: IngredientInputItem[];
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
  override?: {
    reasonCode: string;
    details: string;
  };
}

interface UpdateRecipeWithVersionInput {
  body: UpdateRecipeRequest;
  recipeId: string;
  tenantId: string;
  userId: string;
}

export interface UpdateRecipeWithVersionResult {
  version: unknown;
  ingredients: unknown[];
  steps: unknown[];
  newVersionNumber: number;
  events: unknown[];
  constraintOutcomes: ConstraintOutcome[];
}

export class ConstraintBlockedError extends Error {
  constructor(public readonly constraintOutcomes: ConstraintOutcome[]) {
    super("Recipe update blocked by constraints");
    this.name = "ConstraintBlockedError";
  }
}

export class RecipeNotFoundError extends Error {
  constructor() {
    super("Recipe not found");
    this.name = "RecipeNotFoundError";
  }
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

async function loadCurrentRecipe(
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

async function loadLatestVersion(
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
  return {
    id: newVersionId,
    recipeId,
    name: body.name ?? latestVersion.name,
    category: body.category ?? latestVersion.category ?? "",
    cuisineType: body.cuisineType ?? latestVersion.cuisineType ?? "",
    description: body.description ?? latestVersion.description ?? "",
    tags: body.tags ?? latestVersion.tags ?? [],
    versionNumber: newVersionNumber,
    yieldQuantity: body.yieldQuantity ?? Number(latestVersion.yieldQuantity),
    yieldUnitId: body.yieldUnitId ?? latestVersion.yieldUnitId,
    yieldDescription: body.yieldDescription ?? latestVersion.yieldDescription ?? "",
    prepTimeMinutes: body.prepTimeMinutes ?? latestVersion.prepTimeMinutes ?? 0,
    cookTimeMinutes: body.cookTimeMinutes ?? latestVersion.cookTimeMinutes ?? 0,
    restTimeMinutes: body.restTimeMinutes ?? latestVersion.restTimeMinutes ?? 0,
    difficultyLevel: body.difficultyLevel ?? latestVersion.difficultyLevel ?? 1,
    instructions: body.instructions ?? latestVersion.instructions ?? "",
    notes: body.notes ?? latestVersion.notes ?? "",
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
      throw new Error(
        `Failed to create ingredient: ${ingredientResult.guardFailure?.formatted || ingredientResult.error}`
      );
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
      throw new Error(
        `Failed to create step ${step.stepNumber}: ${stepResult.guardFailure?.formatted || stepResult.error}`
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
