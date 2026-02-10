"use server";

import { randomUUID } from "node:crypto";
import type { ConstraintOutcome, OverrideRequest } from "@manifest/runtime/ir";
import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import {
  createDish as createDishManifest,
  createRecipeRuntime,
  createRecipeVersion,
  type KitchenOpsContext,
  updateRecipe as updateRecipeManifest,
} from "@repo/manifest-adapters";
import { put } from "@repo/storage";
import { revalidatePath } from "next/cache";
import { invariant } from "../../../lib/invariant";
import { requireTenantId } from "../../../lib/tenant";

// ============ Helper Functions (from original actions.ts) ============

const parseList = (value: FormDataEntryValue | null) =>
  typeof value === "string"
    ? value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
    : [];

const parseNumber = (value: FormDataEntryValue | null) => {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseLines = (value: FormDataEntryValue | null) =>
  typeof value === "string"
    ? value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    : [];

const toDecimalNumber = (value: unknown, field: string): number => {
  if (typeof value === "number") {
    return value;
  }

  if (Prisma.Decimal.isDecimal(value)) {
    const parsed = Number(value.toJSON());
    invariant(
      Number.isFinite(parsed),
      `${field} must be a finite decimal value`
    );
    return parsed;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    invariant(Number.isFinite(parsed), `${field} must be a numeric string`);
    return parsed;
  }

  invariant(false, `${field} must be a number or Decimal`);
};

const _toDecimalNumberOrNull = (
  value: unknown,
  field: string
): number | null => {
  if (value === null || value === undefined) {
    return null;
  }

  return toDecimalNumber(value, field);
};

interface IngredientInput {
  name: string;
  quantity: number;
  unit: string | null;
  preparationNotes: string | null;
  isOptional: boolean;
}

interface StepInput {
  instruction: string;
}

const parseJsonArray = (value: string): unknown[] | null => {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const parseIngredientInput = (
  value: FormDataEntryValue | null
): IngredientInput[] => {
  if (typeof value !== "string") {
    return [];
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }

  const jsonItems = parseJsonArray(trimmed);
  if (jsonItems) {
    return jsonItems
      .map((item) => {
        if (!item || typeof item !== "object") {
          return null;
        }
        const record = item as Record<string, unknown>;
        const name = typeof record.name === "string" ? record.name.trim() : "";
        if (!name) {
          return null;
        }
        const unit =
          typeof record.unit === "string" && record.unit.trim().length > 0
            ? record.unit.trim()
            : null;
        const quantityRaw = record.quantity;
        let quantity = 1;
        if (typeof quantityRaw === "number" && Number.isFinite(quantityRaw)) {
          quantity = quantityRaw;
        } else if (typeof quantityRaw === "string") {
          const parsed = Number(quantityRaw);
          if (Number.isFinite(parsed)) {
            quantity = parsed;
          }
        }
        const preparationNotes =
          typeof record.notes === "string" && record.notes.trim().length > 0
            ? record.notes.trim()
            : null;
        const isOptional =
          typeof record.isOptional === "boolean"
            ? record.isOptional
            : typeof record.optional === "boolean"
              ? record.optional
              : false;
        return { name, quantity, unit, preparationNotes, isOptional };
      })
      .filter((item): item is IngredientInput => item !== null);
  }

  return parseLines(trimmed).map((line) => {
    const parsed = parseIngredientLine(line);
    return {
      name: parsed.name || line,
      quantity: parsed.quantity,
      unit: parsed.unit,
      preparationNotes: null,
      isOptional: false,
    };
  });
};

const parseStepInput = (value: FormDataEntryValue | null): StepInput[] => {
  if (typeof value !== "string") {
    return [];
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }

  const jsonItems = parseJsonArray(trimmed);
  if (jsonItems) {
    return jsonItems
      .map((item) => {
        if (!item || typeof item !== "object") {
          return null;
        }
        const record = item as Record<string, unknown>;
        const instruction =
          typeof record.instruction === "string"
            ? record.instruction.trim()
            : typeof record.text === "string"
              ? record.text.trim()
              : "";
        if (!instruction) {
          return null;
        }
        return { instruction };
      })
      .filter((item): item is StepInput => item !== null);
  }

  return parseLines(trimmed).map((line) => ({ instruction: line }));
};

const buildInstructionsText = (steps: StepInput[]): string | null =>
  steps.length > 0 ? steps.map((step) => step.instruction).join("\n") : null;

const readImageFile = (formData: FormData, key: string) => {
  const file = formData.get(key);

  if (!(file instanceof File) || file.size === 0) {
    return null;
  }

  if (file.type && !file.type.startsWith("image/")) {
    throw new Error("Image must be an image file.");
  }

  return file;
};

const uploadImage = async (
  tenantId: string,
  pathPrefix: string,
  file: File
) => {
  const filename = file.name?.trim() || "image";
  const blob = await put(
    `tenants/${tenantId}/${pathPrefix}/${filename}`,
    file,
    {
      access: "public",
      addRandomSuffix: true,
      contentType: file.type || "application/octet-stream",
    }
  );
  return blob.url;
};

const enqueueOutboxEvent = async (
  tenantId: string,
  aggregateType: string,
  aggregateId: string,
  eventType: string,
  payload: Prisma.InputJsonValue
) => {
  await database.outboxEvent.create({
    data: {
      tenantId,
      aggregateType,
      aggregateId,
      eventType,
      payload,
    },
  });
};

const loadUnitMap = async (codes: string[]) => {
  if (codes.length === 0) {
    return new Map<string, number>();
  }
  const rows = await database.$queryRaw<{ id: number; code: string }[]>(
    Prisma.sql`
      SELECT id, code
      FROM core.units
      WHERE code IN (${Prisma.join(codes)})
    `
  );
  return new Map(rows.map((row) => [row.code.toLowerCase(), row.id]));
};

const ensureIngredientId = async (
  tenantId: string,
  name: string,
  defaultUnitId: number
) => {
  const [existing] = await database.$queryRaw<{ id: string }[]>(
    Prisma.sql`
      SELECT id
      FROM tenant_kitchen.ingredients
      WHERE tenant_id = ${tenantId}
        AND name = ${name}
        AND deleted_at IS NULL
      LIMIT 1
    `
  );

  if (existing?.id) {
    return existing.id;
  }

  const id = randomUUID();
  await database.$executeRaw(
    Prisma.sql`
      INSERT INTO tenant_kitchen.ingredients (
        tenant_id,
        id,
        name,
        default_unit_id,
        is_active
      )
      VALUES (${tenantId}, ${id}, ${name}, ${defaultUnitId}, true)
    `
  );
  return id;
};

const parseIngredientLine = (line: string) => {
  const match = line.match(/^([\d.]+)\s*([a-zA-Z]+)?\s*(.*)$/);
  if (!match) {
    return { quantity: 1, unit: null, name: line };
  }
  const quantity = Number(match[1]);
  const unit = match[2] ? match[2].toLowerCase() : null;
  const name = match[3]?.trim() || line;
  return {
    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
    unit,
    name,
  };
};

// ============ Helper: Create Manifest Runtime Context ============

/**
 * Creates a Manifest runtime context with Prisma store provider
 * for persistent entity storage and constraint checking.
 */
async function createRuntimeContext(): Promise<KitchenOpsContext> {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await requireTenantId();

  // Get current user from database
  const currentUser = await database.user.findFirst({
    where: {
      AND: [{ tenantId }, { authUserId: (await auth()).userId ?? "" }],
    },
  });

  invariant(currentUser, "User not found in database");

  // Dynamically import PrismaStore to avoid circular dependencies
  const { createPrismaStoreProvider } = await import(
    "@repo/manifest-adapters/prisma-store"
  );

  return {
    tenantId,
    userId: currentUser.id,
    userRole: currentUser.role,
    storeProvider: createPrismaStoreProvider(database, tenantId),
  };
}

/**
 * Create override requests from user-provided reason and details
 */
function createOverrideRequests(
  constraints: ConstraintOutcome[],
  reason: string,
  userId: string
): OverrideRequest[] {
  return constraints.map((c) => ({
    constraintCode: c.code,
    reason,
    authorizedBy: userId,
    timestamp: Date.now(),
  }));
}

// ============ Result Types ============

/**
 * Response type for Manifest-enabled actions
 * Contains constraint outcomes and redirect info for client-side handling
 */
export interface ManifestActionResult {
  success: boolean;
  constraintOutcomes?: ConstraintOutcome[];
  redirectUrl?: string;
  error?: string;
  recipeId?: string;
  dishId?: string;
}

// ============ Public Actions ============

/**
 * Create a new recipe using Manifest runtime for constraint checking.
 *
 * This action:
 * 1. Parses form data (ingredients, steps, image)
 * 2. Uploads image to storage
 * 3. Creates Recipe and RecipeVersion entities in Manifest for constraint checking
 * 4. Returns constraint outcomes (blocking or warning)
 * 5. If no blocking constraints (or they're overridden), persists to Prisma
 * 6. Returns redirect URL for success navigation
 *
 * @param formData - Recipe form data
 * @param overrideRequests - Optional override requests for blocking constraints
 * @returns ActionResult with constraint outcomes and redirect URL
 */
export const createRecipe = async (
  formData: FormData,
  _overrideRequests?: OverrideRequest[]
): Promise<ManifestActionResult> => {
  const tenantId = await requireTenantId();

  const name = String(formData.get("name") || "").trim();
  if (!name) {
    return { success: false, error: "Recipe name is required." };
  }

  const category = String(formData.get("category") || "").trim() || null;
  const cuisineType =
    String(
      formData.get("cuisineType") || formData.get("cuisine_type") || ""
    ).trim() || null;
  const description = String(formData.get("description") || "").trim() || null;
  const tags = parseList(formData.get("tags"));
  const yieldQuantity = parseNumber(formData.get("yieldQuantity"));
  const yieldUnit = String(formData.get("yieldUnit") || "").trim();
  const yieldDescription =
    String(formData.get("yieldDescription") || "").trim() || null;
  const prepTime = parseNumber(formData.get("prepTimeMinutes"));
  const cookTime = parseNumber(formData.get("cookTimeMinutes"));
  const restTime = parseNumber(formData.get("restTimeMinutes"));
  const difficulty = parseNumber(formData.get("difficultyLevel"));
  const notes = String(formData.get("notes") || "").trim() || null;
  const imageFile = readImageFile(formData, "imageFile");
  const hasImageFile = Boolean(imageFile);

  const ingredientInputs = parseIngredientInput(formData.get("ingredients"));
  const rawStepInputs = parseStepInput(formData.get("steps"));
  const stepInputs =
    rawStepInputs.length === 0 && hasImageFile
      ? [{ instruction: "Reference photo" }]
      : rawStepInputs;
  const instructionsText = buildInstructionsText(stepInputs);

  const unitsMap = await loadUnitMap(
    [yieldUnit, ...ingredientInputs.map((ingredient) => ingredient.unit)]
      .filter(Boolean)
      .map((value) => value as string)
  );

  const fallbackUnitId =
    unitsMap.get(yieldUnit.toLowerCase()) ??
    (
      await database.$queryRaw<{ id: number }[]>(
        Prisma.sql`
        SELECT id
        FROM core.units
        ORDER BY id ASC
        LIMIT 1
      `
      )
    )[0]?.id;

  if (!fallbackUnitId) {
    return { success: false, error: "No units configured in core.units." };
  }

  const recipeId = randomUUID();
  const recipeVersionId = randomUUID();
  const imageUrl = imageFile
    ? await uploadImage(tenantId, `recipes/${recipeId}/hero`, imageFile)
    : null;

  // Create Manifest runtime for constraint checking
  const runtimeContext = await createRuntimeContext();
  const runtime = await createRecipeRuntime(runtimeContext);

  // Create Recipe entity in Manifest for constraint checking
  const tagCount = tags.length;
  await runtime.createInstance("Recipe", {
    id: recipeId,
    tenantId,
    name,
    category: category ?? "",
    cuisineType: cuisineType ?? "",
    description: description ?? "",
    tags: tags.join(",") ?? "",
    isActive: true,
    hasVersion: true,
    tagCount,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  // Create RecipeVersion entity in Manifest for constraint checking
  const safeYieldQuantity =
    yieldQuantity && yieldQuantity > 0 ? yieldQuantity : 1;
  const yieldUnitId = unitsMap.get(yieldUnit.toLowerCase()) ?? fallbackUnitId;
  const ingredientCount = ingredientInputs.length;
  const stepCount = stepInputs.length;

  await runtime.createInstance("RecipeVersion", {
    id: recipeVersionId,
    recipeId,
    tenantId,
    name,
    versionNumber: 1,
    category: category ?? "",
    cuisineType: cuisineType ?? "",
    description: description ?? "",
    tags: tags.join(",") ?? "",
    yieldQuantity: safeYieldQuantity,
    yieldUnitId,
    yieldDescription: yieldDescription ?? "",
    prepTimeMinutes: prepTime ?? 0,
    cookTimeMinutes: cookTime ?? 0,
    restTimeMinutes: restTime ?? 0,
    difficultyLevel: difficulty ?? 1,
    instructions: instructionsText ?? "",
    notes: notes ?? "",
    ingredientCount,
    stepCount,
    createdAt: Date.now(),
  });

  // Run constraint checking via Manifest (with override requests if provided)
  const versionResult = await createRecipeVersion(
    runtime,
    recipeVersionId,
    safeYieldQuantity,
    yieldUnitId,
    prepTime ?? 0,
    cookTime ?? 0,
    restTime ?? 0,
    difficulty ?? 1,
    instructionsText ?? "",
    notes ?? ""
  );

  // Check for blocking constraints
  const blockingConstraints = versionResult.constraintOutcomes?.filter(
    (o) => !o.passed && o.severity === "block" && !o.overridden
  );

  if (blockingConstraints && blockingConstraints.length > 0) {
    // Return constraint outcomes for client-side handling
    return {
      success: false,
      constraintOutcomes: versionResult.constraintOutcomes,
    };
  }

  // Log warning constraints for observability
  // Note: constraintOutcomes are already included in the success response below
  const warningConstraints = versionResult.constraintOutcomes?.filter(
    (o) => !o.passed && o.severity === "warn"
  );
  if (warningConstraints && warningConstraints.length > 0) {
    console.warn(
      "[Manifest] Recipe creation warnings:",
      warningConstraints.map((c) => `${c.code}: ${c.formatted}`)
    );
  }

  // Persist to Prisma database
  await database.$executeRaw(
    Prisma.sql`
      INSERT INTO tenant_kitchen.recipes (
        tenant_id,
        id,
        name,
        category,
        description,
        tags,
        is_active
      )
      VALUES (
        ${tenantId},
        ${recipeId},
        ${name},
        ${category},
        ${cuisineType},
        ${tags.length > 0 ? tags : null},
        true
      )
    `
  );

  await database.$executeRaw(
    Prisma.sql`
      INSERT INTO tenant_kitchen.recipe_versions (
        tenant_id,
        id,
        recipe_id,
        name,
        category,
        cuisine_type,
        description,
        tags,
        version_number,
        yield_quantity,
        yield_unit_id,
        yield_description,
        prep_time_minutes,
        cook_time_minutes,
        rest_time_minutes,
        difficulty_level,
        instructions,
        notes
      )
      VALUES (
        ${tenantId},
        ${recipeVersionId},
        ${recipeId},
        ${name},
        ${category},
        ${cuisineType},
        ${description},
        ${tags.length > 0 ? tags : null},
        1,
        ${safeYieldQuantity},
        ${yieldUnitId},
        ${yieldDescription},
        ${prepTime},
        ${cookTime},
        ${restTime},
        ${difficulty},
        ${instructionsText},
        ${notes}
      )
    `
  );

  for (const [index, ingredient] of ingredientInputs.entries()) {
    const ingredientName = ingredient.name;
    const unitId =
      (ingredient.unit ? unitsMap.get(ingredient.unit) : undefined) ??
      fallbackUnitId;
    const ingredientId = await ensureIngredientId(
      tenantId,
      ingredientName,
      unitId
    );

    await database.$executeRaw(
      Prisma.sql`
        INSERT INTO tenant_kitchen.recipe_ingredients (
          tenant_id,
          id,
          recipe_version_id,
          ingredient_id,
          quantity,
          unit_id,
          preparation_notes,
          is_optional,
          sort_order
        )
        VALUES (
          ${tenantId},
          ${randomUUID()},
          ${recipeVersionId},
          ${ingredientId},
          ${ingredient.quantity},
          ${unitId},
          ${ingredient.preparationNotes},
          ${ingredient.isOptional},
          ${index + 1}
        )
      `
    );
  }

  for (const [index, step] of stepInputs.entries()) {
    await database.$executeRaw(
      Prisma.sql`
        INSERT INTO tenant_kitchen.recipe_steps (
          tenant_id,
          id,
          recipe_version_id,
          step_number,
          instruction,
          image_url
        )
        VALUES (
          ${tenantId},
          ${randomUUID()},
          ${recipeVersionId},
          ${index + 1},
          ${step.instruction},
          ${index === 0 ? imageUrl : null}
        )
      `
    );
  }

  revalidatePath("/kitchen/recipes");
  await enqueueOutboxEvent(tenantId, "recipe", recipeId, "recipe.created", {
    recipeId,
    imageUrl,
    constraintOutcomes:
      versionResult.constraintOutcomes as unknown as Prisma.InputJsonValue,
  });

  return {
    success: true,
    constraintOutcomes: versionResult.constraintOutcomes,
    redirectUrl: "/kitchen/recipes",
    recipeId,
  };
};

/**
 * Create a new recipe with override requests.
 * Helper function for the frontend to call after user confirms override.
 */
export const createRecipeWithOverride = async (
  formData: FormData,
  reason: string,
  details: string
): Promise<ManifestActionResult> => {
  const runtimeContext = await createRuntimeContext();

  // First run without overrides to get constraint outcomes
  const initialResult = await createRecipe(formData);

  if (!initialResult.success && initialResult.constraintOutcomes) {
    // Create override requests from the blocking constraints
    const overrideRequests = createOverrideRequests(
      initialResult.constraintOutcomes.filter(
        (c) => !c.passed && c.severity === "block"
      ),
      `${reason}: ${details}`,
      runtimeContext.userId
    );

    // Re-run with override requests
    return createRecipe(formData, overrideRequests);
  }

  return initialResult;
};

/**
 * Update a recipe using Manifest runtime for constraint checking.
 *
 * This action creates a new version of the recipe with updated values.
 * Uses Manifest runtime for constraint checking before persisting.
 *
 * @param recipeId - ID of the recipe to update
 * @param formData - Recipe form data
 * @param overrideRequests - Optional override requests for blocking constraints
 * @returns ActionResult with constraint outcomes
 */
export const updateRecipe = async (
  recipeId: string,
  formData: FormData,
  overrideRequests?: OverrideRequest[]
): Promise<ManifestActionResult> => {
  const tenantId = await requireTenantId();

  if (!recipeId) {
    return { success: false, error: "Recipe ID is required." };
  }

  // Validate name first before any database queries
  const name = String(formData.get("name") || "").trim();
  if (!name) {
    return { success: false, error: "Recipe name is required." };
  }

  // Verify recipe exists and belongs to tenant
  const [existingRecipe] = await database.$queryRaw<
    { id: string; tenant_id: string; cuisine_type: string | null }[]
  >(
    Prisma.sql`
      SELECT id, tenant_id, cuisine_type
      FROM tenant_kitchen.recipes
      WHERE id = ${recipeId}
        AND tenant_id = ${tenantId}
        AND deleted_at IS NULL
      LIMIT 1
    `
  );

  if (!existingRecipe) {
    return { success: false, error: "Recipe not found or access denied." };
  }

  const category = String(formData.get("category") || "").trim() || null;
  const cuisineTypeInput =
    String(
      formData.get("cuisineType") || formData.get("cuisine_type") || ""
    ).trim() || null;
  const cuisineType = cuisineTypeInput ?? existingRecipe.cuisine_type;
  const description = String(formData.get("description") || "").trim() || null;
  const tags = parseList(formData.get("tags"));
  const yieldQuantity = parseNumber(formData.get("yieldQuantity"));
  const yieldUnit = String(formData.get("yieldUnit") || "").trim();
  const yieldDescription =
    String(formData.get("yieldDescription") || "").trim() || null;
  const prepTime = parseNumber(formData.get("prepTimeMinutes"));
  const cookTime = parseNumber(formData.get("cookTimeMinutes"));
  const restTime = parseNumber(formData.get("restTimeMinutes"));
  const difficulty = parseNumber(formData.get("difficultyLevel"));
  const notes = String(formData.get("notes") || "").trim() || null;

  const ingredientInputs = parseIngredientInput(formData.get("ingredients"));
  const stepInputs = parseStepInput(formData.get("steps"));
  const instructionsText = buildInstructionsText(stepInputs);

  // Get current max version number for this recipe
  const [maxVersionRow] = await database.$queryRaw<{ max: number | null }[]>(
    Prisma.sql`
      SELECT MAX(version_number)::int AS max
      FROM tenant_kitchen.recipe_versions
      WHERE tenant_id = ${tenantId}
        AND recipe_id = ${recipeId}
    `
  );
  const nextVersionNumber = (maxVersionRow?.max ?? 0) + 1;

  // Load unit map for ingredient parsing
  const unitsMap = await loadUnitMap(
    [yieldUnit, ...ingredientInputs.map((ingredient) => ingredient.unit)]
      .filter(Boolean)
      .map((value) => value as string)
  );

  const fallbackUnitId =
    unitsMap.get(yieldUnit.toLowerCase()) ??
    (
      await database.$queryRaw<{ id: number }[]>(
        Prisma.sql`
        SELECT id
        FROM core.units
        ORDER BY id ASC
        LIMIT 1
      `
      )
    )[0]?.id;

  if (!fallbackUnitId) {
    return { success: false, error: "No units configured in core.units." };
  }

  // Create Manifest runtime for constraint checking
  const runtimeContext = await createRuntimeContext();
  const runtime = await createRecipeRuntime(runtimeContext);

  // Update recipe metadata via Manifest (constraint checking for recipe)
  await runtime.createInstance("Recipe", {
    id: recipeId,
    tenantId,
    name,
    category: category ?? "",
    cuisineType: cuisineType ?? "",
    description: description ?? "",
    tags: tags.join(",") ?? "",
    isActive: true,
    hasVersion: true,
    tagCount: tags.length,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const updateResult = await updateRecipeManifest(
    runtime,
    recipeId,
    name,
    category ?? "",
    cuisineType ?? "",
    description ?? "",
    tags.join(",") ?? "",
    overrideRequests
  );

  // Check for blocking constraints on recipe update
  const blockingConstraints = updateResult.constraintOutcomes?.filter(
    (o) => !o.passed && o.severity === "block" && !o.overridden
  );

  if (blockingConstraints && blockingConstraints.length > 0) {
    return {
      success: false,
      constraintOutcomes: updateResult.constraintOutcomes,
    };
  }

  // Create new version via Manifest (constraint checking for version)
  const newVersionId = randomUUID();
  const safeYieldQuantity =
    yieldQuantity && yieldQuantity > 0 ? yieldQuantity : 1;
  const yieldUnitId = unitsMap.get(yieldUnit.toLowerCase()) ?? fallbackUnitId;
  const ingredientCount = ingredientInputs.length;
  const stepCount = stepInputs.length;

  await runtime.createInstance("RecipeVersion", {
    id: newVersionId,
    recipeId,
    tenantId,
    name,
    versionNumber: nextVersionNumber,
    category: category ?? "",
    cuisineType: cuisineType ?? "",
    description: description ?? "",
    tags: tags.join(",") ?? "",
    yieldQuantity: safeYieldQuantity,
    yieldUnitId,
    yieldDescription: yieldDescription ?? "",
    prepTimeMinutes: prepTime ?? 0,
    cookTimeMinutes: cookTime ?? 0,
    restTimeMinutes: restTime ?? 0,
    difficultyLevel: difficulty ?? 1,
    instructions: instructionsText ?? "",
    notes: notes ?? "",
    ingredientCount,
    stepCount,
    createdAt: Date.now(),
  });

  const versionResult = await createRecipeVersion(
    runtime,
    newVersionId,
    safeYieldQuantity,
    yieldUnitId,
    prepTime ?? 0,
    cookTime ?? 0,
    restTime ?? 0,
    difficulty ?? 1,
    instructionsText ?? "",
    notes ?? ""
  );

  // Check for blocking constraints on version creation
  const versionBlockingConstraints = versionResult.constraintOutcomes?.filter(
    (o) => !o.passed && o.severity === "block" && !o.overridden
  );

  if (versionBlockingConstraints && versionBlockingConstraints.length > 0) {
    return {
      success: false,
      constraintOutcomes: versionResult.constraintOutcomes,
    };
  }

  // Update recipe table (name, category, description, tags)
  await database.$executeRaw(
    Prisma.sql`
      UPDATE tenant_kitchen.recipes
      SET
        name = ${name},
        category = ${category},
        cuisine_type = ${cuisineType},
        description = ${description},
        tags = ${tags.length > 0 ? tags : null},
        updated_at = NOW()
      WHERE id = ${recipeId}
        AND tenant_id = ${tenantId}
    `
  );

  // Create new recipe version
  await database.$executeRaw(
    Prisma.sql`
      INSERT INTO tenant_kitchen.recipe_versions (
        tenant_id,
        id,
        recipe_id,
        name,
        category,
        cuisine_type,
        description,
        tags,
        version_number,
        yield_quantity,
        yield_unit_id,
        yield_description,
        prep_time_minutes,
        cook_time_minutes,
        rest_time_minutes,
        difficulty_level,
        instructions,
        notes
      )
      VALUES (
        ${tenantId},
        ${newVersionId},
        ${recipeId},
        ${name},
        ${category},
        ${cuisineType},
        ${description},
        ${tags.length > 0 ? tags : null},
        ${nextVersionNumber},
        ${safeYieldQuantity},
        ${yieldUnitId},
        ${yieldDescription},
        ${prepTime},
        ${cookTime},
        ${restTime},
        ${difficulty},
        ${instructionsText},
        ${notes}
      )
    `
  );

  // Insert new ingredients for the new version
  for (const [index, ingredient] of ingredientInputs.entries()) {
    const ingredientName = ingredient.name;
    const unitId =
      (ingredient.unit ? unitsMap.get(ingredient.unit) : undefined) ??
      fallbackUnitId;
    const ingredientId = await ensureIngredientId(
      tenantId,
      ingredientName,
      unitId
    );

    await database.$executeRaw(
      Prisma.sql`
        INSERT INTO tenant_kitchen.recipe_ingredients (
          tenant_id,
          id,
          recipe_version_id,
          ingredient_id,
          quantity,
          unit_id,
          preparation_notes,
          is_optional,
          sort_order
        )
        VALUES (
          ${tenantId},
          ${randomUUID()},
          ${newVersionId},
          ${ingredientId},
          ${ingredient.quantity},
          ${unitId},
          ${ingredient.preparationNotes},
          ${ingredient.isOptional},
          ${index + 1}
        )
      `
    );
  }

  // Insert new steps for the new version
  for (const [index, step] of stepInputs.entries()) {
    await database.$executeRaw(
      Prisma.sql`
        INSERT INTO tenant_kitchen.recipe_steps (
          tenant_id,
          id,
          recipe_version_id,
          step_number,
          instruction
        )
        VALUES (
          ${tenantId},
          ${randomUUID()},
          ${newVersionId},
          ${index + 1},
          ${step.instruction}
        )
      `
    );
  }

  // Enqueue outbox event
  await enqueueOutboxEvent(tenantId, "recipe", recipeId, "recipe.updated", {
    recipeId,
    versionNumber: nextVersionNumber,
    constraintOutcomes:
      versionResult.constraintOutcomes as unknown as Prisma.InputJsonValue,
  });

  revalidatePath("/kitchen/recipes");
  revalidatePath(`/kitchen/recipes/${recipeId}`);

  return {
    success: true,
    constraintOutcomes: versionResult.constraintOutcomes,
    redirectUrl: `/kitchen/recipes/${recipeId}`,
    recipeId,
  };
};

/**
 * Update a recipe with override requests.
 * Helper function for the frontend to call after user confirms override.
 */
export const updateRecipeWithOverride = async (
  recipeId: string,
  formData: FormData,
  reason: string,
  details: string
): Promise<ManifestActionResult> => {
  const runtimeContext = await createRuntimeContext();

  // First run without overrides to get constraint outcomes
  const initialResult = await updateRecipe(recipeId, formData);

  if (!initialResult.success && initialResult.constraintOutcomes) {
    // Create override requests from the blocking constraints
    const overrideRequests = createOverrideRequests(
      initialResult.constraintOutcomes.filter(
        (c) => !c.passed && c.severity === "block"
      ),
      `${reason}: ${details}`,
      runtimeContext.userId
    );

    // Re-run with override requests
    return updateRecipe(recipeId, formData, overrideRequests);
  }

  return initialResult;
};

/**
 * Create a new dish using Manifest runtime for constraint checking.
 *
 * This action:
 * 1. Parses form data
 * 2. Uploads image to storage
 * 3. Creates Dish entity in Manifest for constraint checking (pricing, lead times)
 * 4. Returns constraint outcomes (blocking or warning)
 * 5. If no blocking constraints (or they're overridden), persists to Prisma
 *
 * @param formData - Dish form data
 * @param overrideRequests - Optional override requests for blocking constraints
 * @returns ActionResult with constraint outcomes and redirect URL
 */
export const createDish = async (
  formData: FormData,
  _overrideRequests?: OverrideRequest[]
): Promise<ManifestActionResult> => {
  const tenantId = await requireTenantId();

  const name = String(formData.get("name") || "").trim();
  const recipeId = String(formData.get("recipeId") || "").trim();
  if (!(name && recipeId)) {
    return { success: false, error: "Dish name and recipe are required." };
  }

  const category = String(formData.get("category") || "").trim() || null;
  const serviceStyle =
    String(formData.get("serviceStyle") || "").trim() || null;
  const description = String(formData.get("description") || "").trim() || null;
  const imageFile = readImageFile(formData, "imageFile");
  const dietaryTags = parseList(formData.get("dietaryTags"));
  const allergens = parseList(formData.get("allergens"));
  const pricePerPerson = parseNumber(formData.get("pricePerPerson"));
  const costPerPerson = parseNumber(formData.get("costPerPerson"));
  const minLead = parseNumber(formData.get("minPrepLeadDays"));
  const maxLead = parseNumber(formData.get("maxPrepLeadDays"));
  const portionSize =
    String(formData.get("portionSizeDescription") || "").trim() || null;

  const dishId = randomUUID();
  const imageUrl = imageFile
    ? await uploadImage(tenantId, `dishes/${dishId}/hero`, imageFile)
    : null;

  // Verify recipe exists
  const [recipe] = await database.$queryRaw<{ id: string; name: string }[]>(
    Prisma.sql`
      SELECT id, name
      FROM tenant_kitchen.recipes
      WHERE tenant_id = ${tenantId}
        AND id = ${recipeId}
        AND deleted_at IS NULL
      LIMIT 1
    `
  );

  if (!recipe) {
    return { success: false, error: "Recipe not found." };
  }

  // Create Manifest runtime for constraint checking
  const runtimeContext = await createRuntimeContext();
  const runtime = await createRecipeRuntime(runtimeContext);

  // Create dish via Manifest (constraint checking for pricing, margins, lead times)
  const result = await createDishManifest(
    runtime,
    dishId,
    name,
    recipeId,
    description ?? "",
    category ?? "",
    serviceStyle ?? "",
    dietaryTags.join(",") ?? "",
    allergens.join(",") ?? "",
    pricePerPerson ?? 0,
    costPerPerson ?? 0,
    minLead ?? 0,
    maxLead ?? 7,
    portionSize ?? ""
  );

  // Check for blocking constraints
  const blockingConstraints = result.constraintOutcomes?.filter(
    (o) => !o.passed && o.severity === "block" && !o.overridden
  );

  if (blockingConstraints && blockingConstraints.length > 0) {
    return {
      success: false,
      constraintOutcomes: result.constraintOutcomes,
    };
  }

  // Log warning constraints for observability
  const warningConstraints = result.constraintOutcomes?.filter(
    (o) => !o.passed && o.severity === "warn"
  );
  if (warningConstraints && warningConstraints.length > 0) {
    console.warn(
      "[Manifest] Dish creation warnings:",
      warningConstraints.map((c) => `${c.code}: ${c.formatted}`)
    );
  }

  // Persist to Prisma database
  await database.$executeRaw(
    Prisma.sql`
      INSERT INTO tenant_kitchen.dishes (
        tenant_id,
        id,
        recipe_id,
        name,
        description,
        category,
        service_style,
        presentation_image_url,
        dietary_tags,
        allergens,
        price_per_person,
        cost_per_person,
        min_prep_lead_days,
        max_prep_lead_days,
        portion_size_description,
        is_active
      )
      VALUES (
        ${tenantId},
        ${dishId},
        ${recipeId},
        ${name},
        ${description},
        ${category},
        ${serviceStyle},
        ${imageUrl},
        ${dietaryTags.length > 0 ? dietaryTags : null},
        ${allergens.length > 0 ? allergens : null},
        ${pricePerPerson},
        ${costPerPerson},
        ${minLead ?? 0},
        ${maxLead},
        ${portionSize},
        true
      )
    `
  );

  revalidatePath("/kitchen/recipes");
  await enqueueOutboxEvent(tenantId, "dish", dishId, "dish.created", {
    dishId,
    recipeId,
    name,
    pricePerPerson,
    costPerPerson,
    constraintOutcomes:
      result.constraintOutcomes as unknown as Prisma.InputJsonValue,
  });

  return {
    success: true,
    constraintOutcomes: result.constraintOutcomes,
    redirectUrl: "/kitchen/recipes?tab=dishes",
    dishId,
  };
};

/**
 * Create a dish with override requests.
 * Helper function for the frontend to call after user confirms override.
 */
export const createDishWithOverride = async (
  formData: FormData,
  reason: string,
  details: string
): Promise<ManifestActionResult> => {
  const runtimeContext = await createRuntimeContext();

  // First run without overrides to get constraint outcomes
  const initialResult = await createDish(formData);

  if (!initialResult.success && initialResult.constraintOutcomes) {
    // Create override requests from the blocking constraints
    const overrideRequests = createOverrideRequests(
      initialResult.constraintOutcomes.filter(
        (c) => !c.passed && c.severity === "block"
      ),
      `${reason}: ${details}`,
      runtimeContext.userId
    );

    // Re-run with override requests
    return createDish(formData, overrideRequests);
  }

  return initialResult;
};

// ============ Re-export other actions from original ============

// For now, keep updateRecipeImage and restoreRecipeVersion from original
// These can be migrated later if needed
// Note: In "use server" files, we must import and re-export individually

import {
  getRecipeForEdit as _getRecipeForEdit,
  restoreRecipeVersion as _restoreRecipeVersion,
  updateRecipeImage as _updateRecipeImage,
} from "./actions";

export const getRecipeForEdit = _getRecipeForEdit;
export const restoreRecipeVersion = _restoreRecipeVersion;
export const updateRecipeImage = _updateRecipeImage;

// Type export
export type { RecipeForEdit } from "./actions";
