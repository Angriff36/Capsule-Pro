"use server";

import { randomUUID } from "crypto";
import { Prisma, database } from "@repo/database";
import { requireTenantId } from "../../../lib/tenant";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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

const loadUnitMap = async (codes: string[]) => {
  if (codes.length === 0) {
    return new Map<string, number>();
  }
  const rows = await database.$queryRaw<{ id: number; code: string }[]>(
    Prisma.sql`
      SELECT id, code
      FROM core.units
      WHERE code IN (${Prisma.join(codes)})
    `,
  );
  return new Map(rows.map((row) => [row.code.toLowerCase(), row.id]));
};

const ensureIngredientId = async (
  tenantId: string,
  name: string,
  defaultUnitId: number,
) => {
  const [existing] = await database.$queryRaw<{ id: string }[]>(
    Prisma.sql`
      SELECT id
      FROM tenant_kitchen.ingredients
      WHERE tenant_id = ${tenantId}
        AND name = ${name}
        AND deleted_at IS NULL
      LIMIT 1
    `,
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
    `,
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
  const imageUrl = String(formData.get("imageUrl") || "").trim() || null;

  const ingredientLines = parseLines(formData.get("ingredients"));
  const rawStepLines = parseLines(formData.get("steps"));
  const stepLines =
    rawStepLines.length === 0 && imageUrl
      ? ["Reference photo"]
      : rawStepLines;

  const unitsMap = await loadUnitMap(
    [yieldUnit, ...ingredientLines.map((line) => parseIngredientLine(line).unit)]
      .filter(Boolean)
      .map((value) => value as string),
  );

  const fallbackUnitId =
    unitsMap.get(yieldUnit.toLowerCase()) ??
    (await database.$queryRaw<{ id: number }[]>(
      Prisma.sql`
        SELECT id
        FROM core.units
        ORDER BY id ASC
        LIMIT 1
      `,
    ))[0]?.id;

  if (!fallbackUnitId) {
    throw new Error("No units configured in core.units.");
  }

  const recipeId = randomUUID();
  const recipeVersionId = randomUUID();

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
    `,
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
    `,
  );

  for (const [index, line] of ingredientLines.entries()) {
    const parsed = parseIngredientLine(line);
    const ingredientName = parsed.name || line;
    const unitId =
      (parsed.unit ? unitsMap.get(parsed.unit) : undefined) ?? fallbackUnitId;
    const ingredientId = await ensureIngredientId(
      tenantId,
      ingredientName,
      unitId,
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
      `,
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
      `,
    );
  }

  revalidatePath("/kitchen/recipes");
  redirect("/kitchen/recipes");
};

export const createDish = async (formData: FormData) => {
  const tenantId = await requireTenantId();

  const name = String(formData.get("name") || "").trim();
  const recipeId = String(formData.get("recipeId") || "").trim();
  if (!name || !recipeId) {
    throw new Error("Dish name and recipe are required.");
  }

  const category = String(formData.get("category") || "").trim() || null;
  const serviceStyle = String(formData.get("serviceStyle") || "").trim() || null;
  const description = String(formData.get("description") || "").trim() || null;
  const imageUrl = String(formData.get("imageUrl") || "").trim() || null;
  const dietaryTags = parseList(formData.get("dietaryTags"));
  const allergens = parseList(formData.get("allergens"));
  const pricePerPerson = parseNumber(formData.get("pricePerPerson"));
  const costPerPerson = parseNumber(formData.get("costPerPerson"));
  const minLead = parseNumber(formData.get("minPrepLeadDays"));
  const maxLead = parseNumber(formData.get("maxPrepLeadDays"));
  const portionSize =
    String(formData.get("portionSizeDescription") || "").trim() || null;

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
        ${randomUUID()},
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
    `,
  );

  revalidatePath("/kitchen/recipes");
  redirect("/kitchen/recipes?tab=dishes");
};
