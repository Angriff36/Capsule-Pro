"use server";

Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupImportedItems = void 0;
const database_1 = require("@repo/database");
const crypto_1 = require("crypto");
const cache_1 = require("next/cache");
const navigation_1 = require("next/navigation");
const tenant_1 = require("../../../../lib/tenant");
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
const normalize = (value) =>
  value
    .replace(/\uFEFF/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
const classifyCandidate = (name) => {
  const normalized = normalize(name);
  if (SUPPLY_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return { action: "inventory", category: "serveware" };
  }
  const isBeverage = BEVERAGE_KEYWORDS.some((keyword) =>
    normalized.includes(keyword)
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
const findInventoryItemId = async (tenantId, name) => {
  const [row] = await database_1.database.$queryRaw(database_1.Prisma.sql`
      SELECT id
      FROM tenant_inventory.inventory_items
      WHERE tenant_id = ${tenantId}
        AND name = ${name}
        AND deleted_at IS NULL
      LIMIT 1
    `);
  return row?.id;
};
const insertInventoryItem = async (tenantId, name, category) => {
  const existingId = await findInventoryItemId(tenantId, name);
  if (existingId) {
    return existingId;
  }
  const id = (0, crypto_1.randomUUID)();
  const itemNumber = `INV-${id.slice(0, 8).toUpperCase()}`;
  await database_1.database.$executeRaw(database_1.Prisma.sql`
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
    `);
  return id;
};
const findIngredientId = async (tenantId, name) => {
  const [row] = await database_1.database.$queryRaw(database_1.Prisma.sql`
      SELECT id
      FROM tenant_kitchen.ingredients
      WHERE tenant_id = ${tenantId}
        AND name = ${name}
        AND deleted_at IS NULL
      LIMIT 1
    `);
  return row?.id;
};
const getFallbackUnitId = async () => {
  const [row] = await database_1.database.$queryRaw(database_1.Prisma.sql`
      SELECT id
      FROM core.units
      ORDER BY id ASC
      LIMIT 1
    `);
  return row?.id;
};
const insertIngredient = async (tenantId, name, defaultUnitId, category) => {
  const existingId = await findIngredientId(tenantId, name);
  if (existingId) {
    return existingId;
  }
  const id = (0, crypto_1.randomUUID)();
  await database_1.database.$executeRaw(database_1.Prisma.sql`
      INSERT INTO tenant_kitchen.ingredients (
        tenant_id,
        id,
        name,
        category,
        default_unit_id,
        is_active
      )
      VALUES (${tenantId}, ${id}, ${name}, ${category}, ${defaultUnitId}, true)
    `);
  return id;
};
const deactivateRecipeAndDish = async (tenantId, recipeId) => {
  await database_1.database.$executeRaw(database_1.Prisma.sql`
      UPDATE tenant_kitchen.recipes
      SET is_active = false
      WHERE tenant_id = ${tenantId}
        AND id = ${recipeId}
    `);
  await database_1.database.$executeRaw(database_1.Prisma.sql`
      UPDATE tenant_kitchen.dishes
      SET is_active = false
      WHERE tenant_id = ${tenantId}
        AND recipe_id = ${recipeId}
    `);
};
const cleanupImportedItems = async (formData) => {
  const tenantId = await (0, tenant_1.requireTenantId)();
  const recipeIds = formData.getAll("recipeIds").map(String);
  if (recipeIds.length === 0) {
    (0, navigation_1.redirect)("/kitchen/recipes");
  }
  const candidates = await database_1.database.$queryRaw(database_1.Prisma.sql`
      SELECT id, name
      FROM tenant_kitchen.recipes
      WHERE tenant_id = ${tenantId}
        AND id IN (${database_1.Prisma.join(recipeIds)})
        AND deleted_at IS NULL
    `);
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
        classification.category
      );
      await deactivateRecipeAndDish(tenantId, candidate.id);
      continue;
    }
    if (classification.action === "ingredient") {
      await insertIngredient(
        tenantId,
        candidate.name,
        fallbackUnitId,
        classification.category
      );
      await deactivateRecipeAndDish(tenantId, candidate.id);
    }
  }
  (0, cache_1.revalidatePath)("/kitchen/recipes");
  (0, cache_1.revalidatePath)("/kitchen/recipes/cleanup");
  (0, navigation_1.redirect)("/kitchen/recipes");
};
exports.cleanupImportedItems = cleanupImportedItems;
