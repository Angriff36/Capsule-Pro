"use server";

import { randomUUID } from "node:crypto";
import { database, Prisma } from "@repo/database";
import { put } from "@repo/storage";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTenantId } from "../../../lib/tenant";

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

export const createRecipe = async (formData: FormData) => {
  const tenantId = await requireTenantId();

  const name = String(formData.get("name") || "").trim();
  if (!name) {
    throw new Error("Recipe name is required.");
  }

  const category = String(formData.get("category") || "").trim() || null;
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

  const ingredientLines = parseLines(formData.get("ingredients"));
  const rawStepLines = parseLines(formData.get("steps"));
  const stepLines =
    rawStepLines.length === 0 && hasImageFile
      ? ["Reference photo"]
      : rawStepLines;

  const unitsMap = await loadUnitMap(
    [
      yieldUnit,
      ...ingredientLines.map((line) => parseIngredientLine(line).unit),
    ]
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
    throw new Error("No units configured in core.units.");
  }

  const recipeId = randomUUID();
  const recipeVersionId = randomUUID();
  const imageUrl = imageFile
    ? await uploadImage(tenantId, `recipes/${recipeId}/hero`, imageFile)
    : null;

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
        ${description},
        ${tags.length > 0 ? tags : null},
        true
      )
    `
  );

  const safeYieldQuantity =
    yieldQuantity && yieldQuantity > 0 ? yieldQuantity : 1;

  await database.$executeRaw(
    Prisma.sql`
      INSERT INTO tenant_kitchen.recipe_versions (
        tenant_id,
        id,
        recipe_id,
        yield_quantity,
        yield_unit_id,
        yield_description,
        prep_time_minutes,
        cook_time_minutes,
        rest_time_minutes,
        difficulty_level,
        notes
      )
      VALUES (
        ${tenantId},
        ${recipeVersionId},
        ${recipeId},
        ${safeYieldQuantity},
        ${unitsMap.get(yieldUnit.toLowerCase()) ?? fallbackUnitId},
        ${yieldDescription},
        ${prepTime},
        ${cookTime},
        ${restTime},
        ${difficulty},
        ${notes}
      )
    `
  );

  for (const [index, line] of ingredientLines.entries()) {
    const parsed = parseIngredientLine(line);
    const ingredientName = parsed.name || line;
    const unitId =
      (parsed.unit ? unitsMap.get(parsed.unit) : undefined) ?? fallbackUnitId;
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
          sort_order
        )
        VALUES (
          ${tenantId},
          ${randomUUID()},
          ${recipeVersionId},
          ${ingredientId},
          ${parsed.quantity},
          ${unitId},
          ${index + 1}
        )
      `
    );
  }

  for (const [index, instruction] of stepLines.entries()) {
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
          ${instruction},
          ${index === 0 ? imageUrl : null}
        )
      `
    );
  }

  revalidatePath("/kitchen/recipes");
  await enqueueOutboxEvent(tenantId, "recipe", recipeId, "recipe.created", {
    recipeId,
    imageUrl,
  });
  redirect("/kitchen/recipes");
};

export const updateRecipeImage = async (
  recipeId: string,
  formData: FormData
) => {
  const tenantId = await requireTenantId();
  if (!recipeId) {
    throw new Error("Recipe id is required.");
  }

  const imageFile = readImageFile(formData, "imageFile");
  if (!imageFile) {
    return;
  }
  const imageUrl = await uploadImage(
    tenantId,
    `recipes/${recipeId}/hero`,
    imageFile
  );

  const [version] = await database.$queryRaw<{ id: string }[]>(
    Prisma.sql`
      SELECT id
      FROM tenant_kitchen.recipe_versions
      WHERE tenant_id = ${tenantId}
        AND recipe_id = ${recipeId}
        AND deleted_at IS NULL
      ORDER BY version_number DESC
      LIMIT 1
    `
  );

  let versionId = version?.id;
  if (!versionId) {
    const [maxVersion] = await database.$queryRaw<{ max: number | null }[]>(
      Prisma.sql`
        SELECT MAX(version_number)::int AS max
        FROM tenant_kitchen.recipe_versions
        WHERE tenant_id = ${tenantId}
          AND recipe_id = ${recipeId}
      `
    );
    const [fallbackUnit] = await database.$queryRaw<{ id: number }[]>(
      Prisma.sql`
        SELECT id
        FROM core.units
        ORDER BY id ASC
        LIMIT 1
      `
    );

    if (!fallbackUnit?.id) {
      throw new Error("No units configured in core.units.");
    }

    versionId = randomUUID();
    await database.$executeRaw(
      Prisma.sql`
        INSERT INTO tenant_kitchen.recipe_versions (
          tenant_id,
          id,
          recipe_id,
          version_number,
          yield_quantity,
          yield_unit_id
        )
        VALUES (
          ${tenantId},
          ${versionId},
          ${recipeId},
          ${(maxVersion?.max ?? 0) + 1},
          1,
          ${fallbackUnit.id}
        )
      `
    );
  }

  const [step] = await database.$queryRaw<{ id: string }[]>(
    Prisma.sql`
      SELECT id
      FROM tenant_kitchen.recipe_steps
      WHERE tenant_id = ${tenantId}
        AND recipe_version_id = ${versionId}
        AND deleted_at IS NULL
      ORDER BY step_number ASC
      LIMIT 1
    `
  );

  if (step?.id) {
    await database.$executeRaw(
      Prisma.sql`
        UPDATE tenant_kitchen.recipe_steps
        SET image_url = ${imageUrl}
        WHERE tenant_id = ${tenantId}
          AND id = ${step.id}
      `
    );
  } else {
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
          ${versionId},
          1,
          'Reference photo',
          ${imageUrl}
        )
      `
    );
  }

  revalidatePath("/kitchen/recipes");
  await enqueueOutboxEvent(
    tenantId,
    "recipe",
    recipeId,
    "recipe.image.updated",
    {
      recipeId,
      imageUrl,
    }
  );
};

export const createDish = async (formData: FormData) => {
  const tenantId = await requireTenantId();

  const name = String(formData.get("name") || "").trim();
  const recipeId = String(formData.get("recipeId") || "").trim();
  if (!(name && recipeId)) {
    throw new Error("Dish name and recipe are required.");
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
  redirect("/kitchen/recipes?tab=dishes");
};

export const updateRecipe = async (recipeId: string, formData: FormData) => {
  const tenantId = await requireTenantId();

  if (!recipeId) {
    throw new Error("Recipe ID is required.");
  }

  // Validate name first before any database queries
  const name = String(formData.get("name") || "").trim();
  if (!name) {
    throw new Error("Recipe name is required.");
  }

  // Verify recipe exists and belongs to tenant
  const [existingRecipe] = await database.$queryRaw<
    { id: string; tenant_id: string }[]
  >(
    Prisma.sql`
      SELECT id, tenant_id
      FROM tenant_kitchen.recipes
      WHERE id = ${recipeId}
        AND tenant_id = ${tenantId}
        AND deleted_at IS NULL
      LIMIT 1
    `
  );

  if (!existingRecipe) {
    throw new Error("Recipe not found or access denied.");
  }

  const category = String(formData.get("category") || "").trim() || null;
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

  const ingredientLines = parseLines(formData.get("ingredients"));
  const stepLines = parseLines(formData.get("steps"));

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

  // Get current active version to soft-delete its ingredients/steps
  const [currentVersion] = await database.$queryRaw<{ id: string }[]>(
    Prisma.sql`
      SELECT id
      FROM tenant_kitchen.recipe_versions
      WHERE tenant_id = ${tenantId}
        AND recipe_id = ${recipeId}
        AND deleted_at IS NULL
      ORDER BY version_number DESC
      LIMIT 1
    `
  );

  // Load unit map for ingredient parsing
  const unitsMap = await loadUnitMap(
    [
      yieldUnit,
      ...ingredientLines.map((line) => parseIngredientLine(line).unit),
    ]
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
    throw new Error("No units configured in core.units.");
  }

  // Update recipe table (name, category, description, tags)
  await database.$executeRaw(
    Prisma.sql`
      UPDATE tenant_kitchen.recipes
      SET
        name = ${name},
        category = ${category},
        description = ${description},
        tags = ${tags.length > 0 ? tags : null},
        updated_at = NOW()
      WHERE id = ${recipeId}
        AND tenant_id = ${tenantId}
    `
  );

  // Create new recipe version
  const newVersionId = randomUUID();
  const safeYieldQuantity =
    yieldQuantity && yieldQuantity > 0 ? yieldQuantity : 1;

  await database.$executeRaw(
    Prisma.sql`
      INSERT INTO tenant_kitchen.recipe_versions (
        tenant_id,
        id,
        recipe_id,
        version_number,
        yield_quantity,
        yield_unit_id,
        yield_description,
        prep_time_minutes,
        cook_time_minutes,
        rest_time_minutes,
        difficulty_level,
        notes
      )
      VALUES (
        ${tenantId},
        ${newVersionId},
        ${recipeId},
        ${nextVersionNumber},
        ${safeYieldQuantity},
        ${unitsMap.get(yieldUnit.toLowerCase()) ?? fallbackUnitId},
        ${yieldDescription},
        ${prepTime},
        ${cookTime},
        ${restTime},
        ${difficulty},
        ${notes}
      )
    `
  );

  // Soft-delete old version's ingredients and steps
  if (currentVersion?.id) {
    await database.$executeRaw(
      Prisma.sql`
        UPDATE tenant_kitchen.recipe_ingredients
        SET deleted_at = NOW()
        WHERE tenant_id = ${tenantId}
          AND recipe_version_id = ${currentVersion.id}
          AND deleted_at IS NULL
      `
    );

    await database.$executeRaw(
      Prisma.sql`
        UPDATE tenant_kitchen.recipe_steps
        SET deleted_at = NOW()
        WHERE tenant_id = ${tenantId}
          AND recipe_version_id = ${currentVersion.id}
          AND deleted_at IS NULL
      `
    );
  }

  // Insert new ingredients for the new version
  for (const [index, line] of ingredientLines.entries()) {
    const parsed = parseIngredientLine(line);
    const ingredientName = parsed.name || line;
    const unitId =
      (parsed.unit ? unitsMap.get(parsed.unit) : undefined) ?? fallbackUnitId;
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
          sort_order
        )
        VALUES (
          ${tenantId},
          ${randomUUID()},
          ${newVersionId},
          ${ingredientId},
          ${parsed.quantity},
          ${unitId},
          ${index + 1}
        )
      `
    );
  }

  // Insert new steps for the new version
  for (const [index, instruction] of stepLines.entries()) {
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
          ${instruction}
        )
      `
    );
  }

  // Enqueue outbox event
  await enqueueOutboxEvent(tenantId, "recipe", recipeId, "recipe.updated", {
    recipeId,
    versionNumber: nextVersionNumber,
  });

  revalidatePath("/kitchen/recipes");
  revalidatePath(`/kitchen/recipes/${recipeId}`);
};

export type RecipeForEdit = {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  tags: string[];
  version: {
    id: string;
    versionNumber: number;
    yieldQuantity: number;
    yieldUnit: string;
    yieldDescription: string | null;
    prepTimeMinutes: number | null;
    cookTimeMinutes: number | null;
    restTimeMinutes: number | null;
    difficultyLevel: number | null;
    notes: string | null;
  };
  ingredients: {
    id: string;
    ingredientId: string;
    name: string;
    quantity: number;
    unit: string;
    isOptional: boolean;
    sortOrder: number;
  }[];
  steps: {
    id: string;
    stepNumber: number;
    instruction: string;
    imageUrl: string | null;
  }[];
};

export const getRecipeForEdit = async (
  recipeId: string
): Promise<RecipeForEdit | null> => {
  const tenantId = await requireTenantId();

  if (!recipeId) {
    return null;
  }

  // Fetch recipe base data
  const [recipe] = await database.$queryRaw<
    {
      id: string;
      name: string;
      category: string | null;
      description: string | null;
      tags: string[] | null;
    }[]
  >(
    Prisma.sql`
      SELECT id, name, category, description, tags
      FROM tenant_kitchen.recipes
      WHERE id = ${recipeId}
        AND tenant_id = ${tenantId}
        AND deleted_at IS NULL
      LIMIT 1
    `
  );

  if (!recipe) {
    return null;
  }

  // Fetch latest version
  const [version] = await database.$queryRaw<
    {
      id: string;
      version_number: number;
      yield_quantity: number;
      yield_unit_id: number;
      yield_description: string | null;
      prep_time_minutes: number | null;
      cook_time_minutes: number | null;
      rest_time_minutes: number | null;
      difficulty_level: number | null;
      notes: string | null;
    }[]
  >(
    Prisma.sql`
      SELECT
        id,
        version_number,
        yield_quantity,
        yield_unit_id,
        yield_description,
        prep_time_minutes,
        cook_time_minutes,
        rest_time_minutes,
        difficulty_level,
        notes
      FROM tenant_kitchen.recipe_versions
      WHERE recipe_id = ${recipeId}
        AND tenant_id = ${tenantId}
        AND deleted_at IS NULL
      ORDER BY version_number DESC
      LIMIT 1
    `
  );

  if (!version) {
    return null;
  }

  // Fetch unit code for yield
  const [yieldUnitRow] = await database.$queryRaw<{ code: string }[]>(
    Prisma.sql`
      SELECT code
      FROM core.units
      WHERE id = ${version.yield_unit_id}
      LIMIT 1
    `
  );
  const yieldUnit = yieldUnitRow?.code ?? "";

  // Fetch ingredients with their names and unit codes
  const ingredients = await database.$queryRaw<
    {
      id: string;
      ingredient_id: string;
      ingredient_name: string;
      quantity: number;
      unit_code: string;
      is_optional: boolean;
      sort_order: number;
    }[]
  >(
    Prisma.sql`
      SELECT
        ri.id,
        ri.ingredient_id,
        i.name AS ingredient_name,
        ri.quantity,
        u.code AS unit_code,
        COALESCE(ri.is_optional, false) AS is_optional,
        ri.sort_order
      FROM tenant_kitchen.recipe_ingredients ri
      JOIN tenant_kitchen.ingredients i ON i.id = ri.ingredient_id
      JOIN core.units u ON u.id = ri.unit_id
      WHERE ri.recipe_version_id = ${version.id}
        AND ri.tenant_id = ${tenantId}
        AND ri.deleted_at IS NULL
      ORDER BY ri.sort_order ASC
    `
  );

  // Fetch steps
  const steps = await database.$queryRaw<
    {
      id: string;
      step_number: number;
      instruction: string;
      image_url: string | null;
    }[]
  >(
    Prisma.sql`
      SELECT id, step_number, instruction, image_url
      FROM tenant_kitchen.recipe_steps
      WHERE recipe_version_id = ${version.id}
        AND tenant_id = ${tenantId}
        AND deleted_at IS NULL
      ORDER BY step_number ASC
    `
  );

  return {
    id: recipe.id,
    name: recipe.name,
    category: recipe.category,
    description: recipe.description,
    tags: recipe.tags ?? [],
    version: {
      id: version.id,
      versionNumber: version.version_number,
      yieldQuantity: version.yield_quantity,
      yieldUnit,
      yieldDescription: version.yield_description,
      prepTimeMinutes: version.prep_time_minutes,
      cookTimeMinutes: version.cook_time_minutes,
      restTimeMinutes: version.rest_time_minutes,
      difficultyLevel: version.difficulty_level,
      notes: version.notes,
    },
    ingredients: ingredients.map((ing) => ({
      id: ing.id,
      ingredientId: ing.ingredient_id,
      name: ing.ingredient_name,
      quantity: ing.quantity,
      unit: ing.unit_code,
      isOptional: ing.is_optional,
      sortOrder: ing.sort_order,
    })),
    steps: steps.map((step) => ({
      id: step.id,
      stepNumber: step.step_number,
      instruction: step.instruction,
      imageUrl: step.image_url,
    })),
  };
};
