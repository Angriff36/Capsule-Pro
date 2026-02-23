"use server";

import { randomUUID } from "node:crypto";
import { database, Prisma } from "@repo/database";
import { put } from "@repo/storage";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { invariant } from "../../../lib/invariant";
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

const _parseIngredientInput = (
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

const _parseStepInput = (value: FormDataEntryValue | null): StepInput[] => {
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

const _buildInstructionsText = (steps: StepInput[]): string | null =>
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

const _loadUnitMap = async (codes: string[]) => {
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

type TxClient = Parameters<Parameters<typeof database.$transaction>[0]>[0];

const _ensureIngredientId = async (
  tx: TxClient,
  tenantId: string,
  name: string,
  defaultUnitId: number
) => {
  const [existing] = await tx.$queryRaw<{ id: string }[]>(
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
  await tx.$executeRaw(
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
            yield_unit_id
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
            ${newVersionData.fallbackUnitId}
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

export interface RecipeForEdit {
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
          yield_unit_id
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
          ${fallbackUnit.id}
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
