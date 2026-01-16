"use server";

import { randomUUID } from "crypto";
import { Prisma, database } from "@repo/database";
import { requireTenantId } from "../../../../lib/tenant";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

type CandidateRow = {
  id: string;
  name: string;
};

const SUPPLY_KEYWORDS = [
  "chafing",
  "chafer",
  "sterno",
  "serveware",
  "servingware",
  "plate",
  "utensil",
  "fork",
  "spoon",
  "knife",
  "napkin",
  "plasticware",
  "disposable",
  "tray",
  "pan",
  "lid",
  "container",
  "place setting",
  "cutlery",
  "tongs",
];

const BEVERAGE_KEYWORDS = [
  "water",
  "iced tea",
  "tea",
  "lemonade",
  "coffee",
  "juice",
  "soda",
  "beverage",
  "drink",
];

const INGREDIENT_KEYWORDS = [
  "cheese",
  "lettuce",
  "tortilla",
  "rice",
  "beans",
  "salsa",
  "cream",
  "butter",
  "onion",
  "pickles",
  "tomato",
  "cilantro",
  "lime",
  "garlic",
  "pepper",
  "salt",
];

const normalize = (value: string) =>
  value.replace(/\uFEFF/g, "").trim().replace(/\s+/g, " ").toLowerCase();

const classifyCandidate = (name: string) => {
  const normalized = normalize(name);

  if (SUPPLY_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return { action: "inventory", category: "serveware" };
  }

  const isBeverage = BEVERAGE_KEYWORDS.some((keyword) =>
    normalized.includes(keyword),
  );
  if (isBeverage) {
    const isPackaged =
      normalized.includes("bottle") || normalized.includes("bottled");
    return {
      action: isPackaged ? "inventory" : "skip",
      category: "beverage",
    };
  }

  if (INGREDIENT_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return { action: "ingredient", category: "ingredient" };
  }

  return { action: "skip", category: "menu" };
};

const findInventoryItemId = async (tenantId: string, name: string) => {
  const [row] = await database.$queryRaw<{ id: string }[]>(
    Prisma.sql`
      SELECT id
      FROM tenant_inventory.inventory_items
      WHERE tenant_id = ${tenantId}
        AND name = ${name}
        AND deleted_at IS NULL
      LIMIT 1
    `,
  );
  return row?.id;
};

const insertInventoryItem = async (
  tenantId: string,
  name: string,
  category: string,
) => {
  const existingId = await findInventoryItemId(tenantId, name);
  if (existingId) {
    return existingId;
  }

  const id = randomUUID();
  const itemNumber = `INV-${id.slice(0, 8).toUpperCase()}`;
  await database.$executeRaw(
    Prisma.sql`
      INSERT INTO tenant_inventory.inventory_items (
        tenant_id,
        id,
        item_number,
        name,
        category,
        unit_cost,
        quantity_on_hand,
        reorder_level,
        tags
      )
      VALUES (
        ${tenantId},
        ${id},
        ${itemNumber},
        ${name},
        ${category},
        ${0},
        ${0},
        ${0},
        ${["cleanup"]}
      )
    `,
  );
  return id;
};

const findIngredientId = async (tenantId: string, name: string) => {
  const [row] = await database.$queryRaw<{ id: string }[]>(
    Prisma.sql`
      SELECT id
      FROM tenant_kitchen.ingredients
      WHERE tenant_id = ${tenantId}
        AND name = ${name}
        AND deleted_at IS NULL
      LIMIT 1
    `,
  );
  return row?.id;
};

const getFallbackUnitId = async () => {
  const [row] = await database.$queryRaw<{ id: number }[]>(
    Prisma.sql`
      SELECT id
      FROM core.units
      ORDER BY id ASC
      LIMIT 1
    `,
  );
  return row?.id;
};

const insertIngredient = async (
  tenantId: string,
  name: string,
  defaultUnitId: number,
  category: string,
) => {
  const existingId = await findIngredientId(tenantId, name);
  if (existingId) {
    return existingId;
  }

  const id = randomUUID();
  await database.$executeRaw(
    Prisma.sql`
      INSERT INTO tenant_kitchen.ingredients (
        tenant_id,
        id,
        name,
        category,
        default_unit_id,
        is_active
      )
      VALUES (${tenantId}, ${id}, ${name}, ${category}, ${defaultUnitId}, true)
    `,
  );
  return id;
};

const deactivateRecipeAndDish = async (tenantId: string, recipeId: string) => {
  await database.$executeRaw(
    Prisma.sql`
      UPDATE tenant_kitchen.recipes
      SET is_active = false
      WHERE tenant_id = ${tenantId}
        AND id = ${recipeId}
    `,
  );

  await database.$executeRaw(
    Prisma.sql`
      UPDATE tenant_kitchen.dishes
      SET is_active = false
      WHERE tenant_id = ${tenantId}
        AND recipe_id = ${recipeId}
    `,
  );
};

export const cleanupImportedItems = async (formData: FormData) => {
  const tenantId = await requireTenantId();
  const recipeIds = formData.getAll("recipeIds").map(String);
  if (recipeIds.length === 0) {
    redirect("/kitchen/recipes");
  }

  const candidates = await database.$queryRaw<CandidateRow[]>(
    Prisma.sql`
      SELECT id, name
      FROM tenant_kitchen.recipes
      WHERE tenant_id = ${tenantId}
        AND id IN (${Prisma.join(recipeIds)})
        AND deleted_at IS NULL
    `,
  );

  const fallbackUnitId = await getFallbackUnitId();
  if (!fallbackUnitId) {
    throw new Error("No units configured in core.units.");
  }

  for (const candidate of candidates) {
    const classification = classifyCandidate(candidate.name);
    if (classification.action === "inventory") {
      await insertInventoryItem(
        tenantId,
        candidate.name,
        classification.category,
      );
      await deactivateRecipeAndDish(tenantId, candidate.id);
      continue;
    }

    if (classification.action === "ingredient") {
      await insertIngredient(
        tenantId,
        candidate.name,
        fallbackUnitId,
        classification.category,
      );
      await deactivateRecipeAndDish(tenantId, candidate.id);
    }
  }

  revalidatePath("/kitchen/recipes");
  revalidatePath("/kitchen/recipes/cleanup");
  redirect("/kitchen/recipes");
};
