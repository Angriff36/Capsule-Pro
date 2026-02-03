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

type IngredientInput = {
  name: string;
  quantity: number;
  unit: string | null;
  preparationNotes: string | null;
  isOptional: boolean;
};

type StepInput = {
  instruction: string;
};

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
        const name =
          typeof record.name === "string" ? record.name.trim() : "";
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

  const unitsMap = await loadUnitMap(
    [
      yieldUnit,
      ...ingredientInputs.map((ingredient) => ingredient.unit),
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
        ${cuisineType},
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

    const [recipe] = await database.$queryRaw<
      {
        name: string;
        category: string | null;
        cuisine_type: string | null;
        description: string | null;
        tags: string[] | null;
      }[]
    >(
      Prisma.sql`
        SELECT name, category, cuisine_type, description, tags
        FROM tenant_kitchen.recipes
        WHERE tenant_id = ${tenantId}
          AND id = ${recipeId}
          AND deleted_at IS NULL
        LIMIT 1
      `
    );

    if (!recipe) {
      throw new Error("Recipe not found.");
    }

    versionId = randomUUID();
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
          yield_unit_id
        )
        VALUES (
          ${tenantId},
          ${versionId},
          ${recipeId},
          ${recipe.name},
          ${recipe.category},
          ${recipe.cuisine_type},
          ${recipe.description},
          ${recipe.tags ?? null},
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
    throw new Error("Recipe not found or access denied.");
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
    [
      yieldUnit,
      ...ingredientInputs.map((ingredient) => ingredient.unit),
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
        cuisine_type = ${cuisineType},
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
  });

  revalidatePath("/kitchen/recipes");
  revalidatePath(`/kitchen/recipes/${recipeId}`);
};

export const restoreRecipeVersion = async (
  recipeId: string,
  versionId: string
) => {
  const tenantId = await requireTenantId();

  if (!recipeId) {
    throw new Error("Recipe ID is required.");
  }
  if (!versionId) {
    throw new Error("Version ID is required.");
  }

  const [version] = await database.$queryRaw<
    {
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
    }[]
  >(
    Prisma.sql`
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
        AND id = ${versionId}
        AND deleted_at IS NULL
      LIMIT 1
    `
  );

  if (!version) {
    throw new Error("Recipe version not found or access denied.");
  }

  const [maxVersionRow] = await database.$queryRaw<{ max: number | null }[]>(
    Prisma.sql`
      SELECT MAX(version_number)::int AS max
      FROM tenant_kitchen.recipe_versions
      WHERE tenant_id = ${tenantId}
        AND recipe_id = ${recipeId}
    `
  );
  const nextVersionNumber = (maxVersionRow?.max ?? 0) + 1;
  const newVersionId = randomUUID();

  await database.$executeRaw(
    Prisma.sql`
      UPDATE tenant_kitchen.recipes
      SET
        name = ${version.name},
        category = ${version.category},
        cuisine_type = ${version.cuisine_type},
        description = ${version.description},
        tags = ${version.tags ?? null},
        updated_at = NOW()
      WHERE tenant_id = ${tenantId}
        AND id = ${recipeId}
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
        ${newVersionId},
        ${recipeId},
        ${version.name},
        ${version.category},
        ${version.cuisine_type},
        ${version.description},
        ${version.tags ?? null},
        ${nextVersionNumber},
        ${version.yield_quantity},
        ${version.yield_unit_id},
        ${version.yield_description},
        ${version.prep_time_minutes},
        ${version.cook_time_minutes},
        ${version.rest_time_minutes},
        ${version.difficulty_level},
        ${version.instructions},
        ${version.notes}
      )
    `
  );

  const ingredients = await database.$queryRaw<
    {
      ingredient_id: string;
      quantity: number;
      unit_id: number;
      preparation_notes: string | null;
      is_optional: boolean;
      sort_order: number;
    }[]
  >(
    Prisma.sql`
      SELECT
        ingredient_id,
        quantity,
        unit_id,
        preparation_notes,
        is_optional,
        sort_order
      FROM tenant_kitchen.recipe_ingredients
      WHERE tenant_id = ${tenantId}
        AND recipe_version_id = ${versionId}
        AND deleted_at IS NULL
      ORDER BY sort_order ASC
    `
  );

  for (const ingredient of ingredients) {
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
          ${ingredient.ingredient_id},
          ${ingredient.quantity},
          ${ingredient.unit_id},
          ${ingredient.preparation_notes},
          ${ingredient.is_optional},
          ${ingredient.sort_order}
        )
      `
    );
  }

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
  >(
    Prisma.sql`
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
        AND recipe_version_id = ${versionId}
        AND deleted_at IS NULL
      ORDER BY step_number ASC
    `
  );

  for (const step of steps) {
    await database.$executeRaw(
      Prisma.sql`
        INSERT INTO tenant_kitchen.recipe_steps (
          tenant_id,
          id,
          recipe_version_id,
          step_number,
          instruction,
          duration_minutes,
          temperature_value,
          temperature_unit,
          equipment_needed,
          tips,
          video_url,
          image_url
        )
        VALUES (
          ${tenantId},
          ${randomUUID()},
          ${newVersionId},
          ${step.step_number},
          ${step.instruction},
          ${step.duration_minutes},
          ${step.temperature_value},
          ${step.temperature_unit},
          ${step.equipment_needed},
          ${step.tips},
          ${step.video_url},
          ${step.image_url}
        )
      `
    );
  }

  await enqueueOutboxEvent(tenantId, "recipe", recipeId, "recipe.version.restored", {
    recipeId,
    versionId,
    newVersionId,
    versionNumber: nextVersionNumber,
  });

  revalidatePath("/kitchen/recipes");
  revalidatePath(`/kitchen/recipes/${recipeId}`);

  return { versionId: newVersionId, versionNumber: nextVersionNumber };
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
