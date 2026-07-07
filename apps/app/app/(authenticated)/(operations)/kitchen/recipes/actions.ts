"use server";

import { randomUUID } from "node:crypto";
import { database, Prisma } from "@repo/database";
import { put } from "@repo/storage";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { runManifestCommand } from "@/lib/manifest-command";
import { invariant } from "../../../../lib/invariant";
import { requireCurrentUser, requireTenantId } from "../../../../lib/tenant";

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

const toDecimalNumberOrNull = (
  value: unknown,
  field: string
): number | null => {
  if (value === null || value === undefined) {
    return null;
  }

  return toDecimalNumber(value, field);
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
  let newVersionData: {
    recipe: {
      name: string;
      category: string | null;
      cuisine_type: string | null;
      description: string | null;
      tags: string[] | null;
    };
    maxVersion: number;
    fallbackUnitId: number;
  } | null = null;

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
    newVersionData = {
      recipe,
      maxVersion: maxVersion?.max ?? 0,
      fallbackUnitId: fallbackUnit.id,
    };
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

  await database.$transaction(async (tx) => {
    if (newVersionData) {
      await tx.$executeRaw(
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
            updated_at
          )
          VALUES (
            ${tenantId},
            ${versionId},
            ${recipeId},
            ${newVersionData.recipe.name},
            ${newVersionData.recipe.category},
            ${newVersionData.recipe.cuisine_type},
            ${newVersionData.recipe.description},
            ${newVersionData.recipe.tags ?? null},
            ${newVersionData.maxVersion + 1},
            1,
            ${newVersionData.fallbackUnitId},
            NOW()
          )
        `
      );
    }

    if (step?.id) {
      await tx.$executeRaw(
        Prisma.sql`
          UPDATE tenant_kitchen.recipe_steps
          SET image_url = ${imageUrl}
          WHERE tenant_id = ${tenantId}
            AND id = ${step.id}
        `
      );
    } else {
      await tx.$executeRaw(
        Prisma.sql`
          INSERT INTO tenant_kitchen.recipe_steps (
            tenant_id,
            id,
            recipe_version_id,
            step_number,
            instruction,
            image_url,
            updated_at
          )
          VALUES (
            ${tenantId},
            ${randomUUID()},
            ${versionId},
            1,
            'Reference photo',
            ${imageUrl},
            NOW()
          )
        `
      );
    }

    await tx.outboxEvent.create({
      data: {
        tenantId,
        aggregateType: "recipe",
        aggregateId: recipeId,
        eventType: "recipe.image.updated",
        payload: {
          recipeId,
          imageUrl,
        },
        status: "pending" as const,
      },
    });
  });

  revalidatePath("/kitchen/recipes");
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
        is_active,
        updated_at
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
        true,
        NOW()
      )
    `
  );

  revalidatePath("/kitchen/recipes");
  redirect("/kitchen/recipes?tab=dishes");
};

export interface RecipeForEdit {
  category: string | null;
  description: string | null;
  id: string;
  ingredients: {
    id: string;
    ingredientId: string;
    name: string;
    quantity: number;
    unit: string;
    isOptional: boolean;
    sortOrder: number;
  }[];
  name: string;
  steps: {
    id: string;
    stepNumber: number;
    instruction: string;
    imageUrl: string | null;
  }[];
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
}

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
      cuisine_type: string | null;
      description: string | null;
      tags: string[] | null;
    }[]
  >(
    Prisma.sql`
      SELECT id, name, category, cuisine_type, description, tags
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
  let [version] = await database.$queryRaw<
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

  let yieldUnit = "";
  if (version) {
    // Fetch unit code for yield
    const [yieldUnitRow] = await database.$queryRaw<{ code: string }[]>(
      Prisma.sql`
        SELECT code
        FROM core.units
        WHERE id = ${version.yield_unit_id}
        LIMIT 1
      `
    );
    yieldUnit = yieldUnitRow?.code ?? "";
  } else {
    const [maxVersion] = await database.$queryRaw<{ max: number | null }[]>(
      Prisma.sql`
        SELECT MAX(version_number)::int AS max
        FROM tenant_kitchen.recipe_versions
        WHERE tenant_id = ${tenantId}
          AND recipe_id = ${recipeId}
      `
    );
    const [fallbackUnit] = await database.$queryRaw<
      { id: number; code: string }[]
    >(
      Prisma.sql`
        SELECT id, code
        FROM core.units
        ORDER BY id ASC
        LIMIT 1
      `
    );

    if (!fallbackUnit?.id) {
      throw new Error("No units configured in core.units.");
    }

    const newVersionId = randomUUID();
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
          updated_at
        )
        VALUES (
          ${tenantId},
          ${newVersionId},
          ${recipeId},
          ${recipe.name},
          ${recipe.category},
          ${recipe.cuisine_type},
          ${recipe.description},
          ${recipe.tags ?? null},
          ${(maxVersion?.max ?? 0) + 1},
          1,
          ${fallbackUnit.id},
          NOW()
        )
      `
    );

    version = {
      id: newVersionId,
      version_number: (maxVersion?.max ?? 0) + 1,
      yield_quantity: 1,
      yield_unit_id: fallbackUnit.id,
      yield_description: null,
      prep_time_minutes: null,
      cook_time_minutes: null,
      rest_time_minutes: null,
      difficulty_level: null,
      notes: null,
    };
    yieldUnit = fallbackUnit.code;
  }

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
      yieldQuantity: toDecimalNumber(
        version.yield_quantity,
        "recipe_versions.yield_quantity"
      ),
      yieldUnit,
      yieldDescription: version.yield_description,
      prepTimeMinutes: toDecimalNumberOrNull(
        version.prep_time_minutes,
        "recipe_versions.prep_time_minutes"
      ),
      cookTimeMinutes: toDecimalNumberOrNull(
        version.cook_time_minutes,
        "recipe_versions.cook_time_minutes"
      ),
      restTimeMinutes: toDecimalNumberOrNull(
        version.rest_time_minutes,
        "recipe_versions.rest_time_minutes"
      ),
      difficultyLevel: toDecimalNumberOrNull(
        version.difficulty_level,
        "recipe_versions.difficulty_level"
      ),
      notes: version.notes,
    },
    ingredients: ingredients.map((ing) => ({
      id: ing.id,
      ingredientId: ing.ingredient_id,
      name: ing.ingredient_name,
      quantity: toDecimalNumber(ing.quantity, "recipe_ingredients.quantity"),
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

export const deleteRecipe = async (recipeId: string) => {
  const tenantId = await requireTenantId();
  await database.$executeRaw`
    UPDATE tenant_kitchen.recipes
    SET deleted_at = NOW()
    WHERE tenant_id = ${tenantId} AND id = ${recipeId}::uuid
  `;
  revalidatePath("/kitchen/recipes");
};

export const deleteDish = async (dishId: string) => {
  const tenantId = await requireTenantId();
  await database.$executeRaw`
    UPDATE tenant_kitchen.dishes
    SET deleted_at = NOW()
    WHERE tenant_id = ${tenantId} AND id = ${dishId}::uuid
  `;
  revalidatePath("/kitchen/recipes");
};

export const bulkDeleteRecipes = async (recipeIds: string[]) => {
  const tenantId = await requireTenantId();
  for (const id of recipeIds) {
    await database.$executeRaw`
      UPDATE tenant_kitchen.recipes
      SET deleted_at = NOW()
      WHERE tenant_id = ${tenantId} AND id = ${id}::uuid
    `;
  }
  revalidatePath("/kitchen/recipes");
};

export const bulkDeleteDishes = async (dishIds: string[]) => {
  const tenantId = await requireTenantId();
  for (const id of dishIds) {
    await database.$executeRaw`
      UPDATE tenant_kitchen.dishes
      SET deleted_at = NOW()
      WHERE tenant_id = ${tenantId} AND id = ${id}::uuid
    `;
  }
  revalidatePath("/kitchen/recipes");
};

export const renameRecipe = async (recipeId: string, newName: string) => {
  const tenantId = await requireTenantId();
  const trimmedName = newName.trim();
  if (!trimmedName) {
    throw new Error("Recipe name cannot be empty.");
  }
  await database.$executeRaw`
    UPDATE tenant_kitchen.recipes
    SET name = ${trimmedName}, updated_at = NOW()
    WHERE tenant_id = ${tenantId} AND id = ${recipeId}::uuid AND deleted_at IS NULL
  `;
  revalidatePath("/kitchen/recipes");
  revalidatePath(`/kitchen/recipes/${recipeId}`);
};

export const updateDish = async (dishId: string, formData: FormData) => {
  const tenantId = await requireTenantId();

  const name = String(formData.get("name") || "").trim();
  if (!name) {
    throw new Error("Dish name is required.");
  }

  const category = String(formData.get("category") || "").trim() || null;
  const description = String(formData.get("description") || "").trim() || null;
  const dietaryTags = parseList(formData.get("dietaryTags"));
  const allergens = parseList(formData.get("allergens"));
  const pricePerPerson = parseNumber(formData.get("pricePerPerson"));
  const costPerPerson = parseNumber(formData.get("costPerPerson"));
  const minLead = parseNumber(formData.get("minPrepLeadDays"));
  const maxLead = parseNumber(formData.get("maxPrepLeadDays"));
  const portionSize =
    String(formData.get("portionSizeDescription") || "").trim() || null;
  const serviceStyle =
    String(formData.get("serviceStyle") || "").trim() || null;
  const isActive = formData.get("isActive") === "true";

  await database.$executeRaw`
    UPDATE tenant_kitchen.dishes
    SET
      name = ${name},
      description = ${description},
      category = ${category},
      service_style = ${serviceStyle},
      dietary_tags = ${dietaryTags.length > 0 ? dietaryTags : null},
      allergens = ${allergens.length > 0 ? allergens : null},
      price_per_person = ${pricePerPerson},
      cost_per_person = ${costPerPerson},
      min_prep_lead_days = ${minLead ?? 0},
      max_prep_lead_days = ${maxLead},
      portion_size_description = ${portionSize},
      is_active = ${isActive},
      updated_at = NOW()
    WHERE tenant_id = ${tenantId} AND id = ${dishId}::uuid AND deleted_at IS NULL
  `;

  revalidatePath("/kitchen/recipes");
  revalidatePath(`/kitchen/recipes/dishes/${dishId}`);
};

/**
 * Relink a dish to a different recipe via the governed Dish.changeRecipe
 * command. Prep-list generation resolves ingredients through this link, so
 * corrections must go through the Manifest runtime (audit + events).
 */
export const changeDishRecipe = async (dishId: string, recipeId: string) => {
  const tenantId = await requireTenantId();
  invariant(recipeId.trim().length > 0, "Recipe is required");

  const [recipe] = await database.$queryRaw<{ id: string }[]>`
    SELECT id
    FROM tenant_kitchen.recipes
    WHERE tenant_id = ${tenantId} AND id = ${recipeId}::uuid AND deleted_at IS NULL
    LIMIT 1
  `;
  if (!recipe) {
    throw new Error("Recipe not found.");
  }

  const user = await requireCurrentUser();
  const result = await runManifestCommand({
    entity: "Dish",
    command: "changeRecipe",
    instanceId: dishId,
    body: { recipeId },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to change recipe");
  }

  revalidatePath("/kitchen/recipes");
  revalidatePath(`/kitchen/recipes/dishes/${dishId}`);
};

/** Active recipes for pickers (id + name only). */
export const listRecipeOptions = async () => {
  const tenantId = await requireTenantId();
  return await database.$queryRaw<{ id: string; name: string }[]>`
    SELECT id, name
    FROM tenant_kitchen.recipes
    WHERE tenant_id = ${tenantId} AND deleted_at IS NULL
    ORDER BY name
  `;
};

export const updateRecipeName = async (recipeId: string, name: string) => {
  const tenantId = await requireTenantId();
  invariant(name.trim().length > 0, "Name cannot be empty");
  await database.$executeRaw`
    UPDATE tenant_kitchen.recipes
    SET name = ${name.trim()}, updated_at = NOW()
    WHERE tenant_id = ${tenantId} AND id = ${recipeId}::uuid
  `;
  revalidatePath("/kitchen/recipes");
};

export const updateDishName = async (dishId: string, name: string) => {
  const tenantId = await requireTenantId();
  invariant(name.trim().length > 0, "Name cannot be empty");
  await database.$executeRaw`
    UPDATE tenant_kitchen.dishes
    SET name = ${name.trim()}, updated_at = NOW()
    WHERE tenant_id = ${tenantId} AND id = ${dishId}::uuid
  `;
  revalidatePath("/kitchen/recipes");
};

export const updateDishPrice = async (dishId: string, price: string) => {
  const tenantId = await requireTenantId();
  const num = Number.parseFloat(price);
  invariant(!Number.isNaN(num) && num >= 0, "Invalid price");
  await database.$executeRaw`
    UPDATE tenant_kitchen.dishes
    SET price_per_person = ${num}::decimal, updated_at = NOW()
    WHERE tenant_id = ${tenantId} AND id = ${dishId}::uuid
  `;
  revalidatePath("/kitchen/recipes");
};

export const bulkUpdateDishPrice = async (dishIds: string[], price: string) => {
  const tenantId = await requireTenantId();
  const num = Number.parseFloat(price);
  invariant(!Number.isNaN(num) && num >= 0, "Invalid price");
  await database.$executeRaw`
    UPDATE tenant_kitchen.dishes
    SET price_per_person = ${num}::decimal, updated_at = NOW()
    WHERE tenant_id = ${tenantId} AND id = ANY(${dishIds}::uuid[])
  `;
  revalidatePath("/kitchen/recipes");
};

export const bulkUpdateNames = async (
  ids: string[],
  type: "recipes" | "dishes",
  name: string
) => {
  const tenantId = await requireTenantId();
  invariant(name.trim().length > 0, "Name cannot be empty");
  const table =
    type === "recipes" ? "tenant_kitchen.recipes" : "tenant_kitchen.dishes";
  await database.$executeRaw`
    UPDATE ${Prisma.raw(table)}
    SET name = ${name.trim()}, updated_at = NOW()
    WHERE tenant_id = ${tenantId} AND id = ANY(${ids}::uuid[])
  `;
  revalidatePath("/kitchen/recipes");
};
