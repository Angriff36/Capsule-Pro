Object.defineProperty(exports, "__esModule", { value: true });
exports.updateEventBudgetsForRecipe =
  exports.updateRecipeIngredientWasteFactor =
  exports.scaleRecipeCost =
  exports.recalculateRecipeCosts =
  exports.getRecipeCostSummary =
    void 0;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const tenant_1 = require("@/app/lib/tenant");
const loadUnitConversions = async () => {
  const rows = await database_1.database.$queryRaw(database_1.Prisma.sql`
      SELECT from_unit_id, to_unit_id, multiplier
      FROM core.unit_conversions
    `);
  return new Map(
    rows.map((row) => [`${row.fromUnitId}-${row.toUnitId}`, row.multiplier])
  );
};
const convertQuantity = (quantity, fromUnitId, toUnitId, conversions) => {
  if (fromUnitId === toUnitId) {
    return quantity;
  }
  const key = `${fromUnitId}-${toUnitId}`;
  const multiplier = conversions.get(key);
  if (!multiplier) {
    throw new Error(
      `Cannot convert from unit ${fromUnitId} to unit ${toUnitId}`
    );
  }
  return quantity * multiplier;
};
const calculateRecipeIngredientCost = async (tenantId, recipeIngredientId) => {
  const ingredient = await database_1.database.$queryRaw(database_1.Prisma.sql`
      SELECT
        ri.id,
        ri.ingredient_id,
        i.name as ingredient_name,
        ri.quantity,
        ri.unit_id,
        COALESCE(ri.waste_factor, 1.0) as waste_factor,
        ii.unit_cost as inventory_unit_cost,
        i.default_unit_id as inventory_unit_id
      FROM tenant_kitchen.recipe_ingredients ri
      JOIN tenant_kitchen.ingredients i ON i.id = ri.ingredient_id
      LEFT JOIN tenant_inventory.inventory_items ii
        ON ii.item_number = i.name
        AND ii.tenant_id = ri.tenant_id
        AND ii.deleted_at IS NULL
      WHERE ri.tenant_id = ${tenantId}
        AND ri.id = ${recipeIngredientId}
        AND ri.deleted_at IS NULL
    `);
  if (!ingredient[0]) {
    return null;
  }
  const ing = ingredient[0];
  const conversions = await loadUnitConversions();
  const adjustedQuantity = ing.quantity * ing.waste_factor;
  let cost;
  let convertedQuantity = adjustedQuantity;
  if (!ing.inventory_unit_cost) {
    return {
      id: ing.id,
      name: ing.ingredient_name,
      quantity: Number(ing.quantity),
      unit: ing.unit_id.toString(),
      wasteFactor: Number(ing.waste_factor),
      adjustedQuantity: Number(adjustedQuantity),
      unitCost: 0,
      cost: 0,
      hasInventoryItem: false,
    };
  }
  if (ing.unit_id === ing.inventory_unit_id) {
    cost = adjustedQuantity * Number(ing.inventory_unit_cost);
  } else {
    convertedQuantity = convertQuantity(
      adjustedQuantity,
      ing.unit_id,
      ing.inventory_unit_id,
      conversions
    );
    cost = convertedQuantity * Number(ing.inventory_unit_cost);
  }
  await database_1.database.$executeRaw(database_1.Prisma.sql`
      UPDATE tenant_kitchen.recipe_ingredients
      SET
        adjusted_quantity = ${adjustedQuantity},
        ingredient_cost = ${cost},
        cost_calculated_at = NOW()
      WHERE tenant_id = ${tenantId} AND id = ${recipeIngredientId}
    `);
  return {
    id: ing.id,
    name: ing.ingredient_name,
    quantity: Number(ing.quantity),
    unit: ing.unit_id.toString(),
    wasteFactor: Number(ing.waste_factor),
    adjustedQuantity: Number(adjustedQuantity),
    unitCost: Number(ing.inventory_unit_cost),
    cost,
    hasInventoryItem: true,
  };
};
const calculateRecipeCost = async (tenantId, recipeVersionId) => {
  const recipeVersion = await database_1.database.$queryRaw(database_1.Prisma
    .sql`
      SELECT id, yield_quantity
      FROM tenant_kitchen.recipe_versions
      WHERE tenant_id = ${tenantId} AND id = ${recipeVersionId}
    `);
  if (!recipeVersion[0]) {
    return null;
  }
  const ingredients = await database_1.database.$queryRaw(database_1.Prisma.sql`
      SELECT
        ri.id,
        i.name as ingredient_name,
        ri.quantity,
        ri.unit_id,
        COALESCE(ri.waste_factor, 1.0) as waste_factor,
        ri.ingredient_cost
      FROM tenant_kitchen.recipe_ingredients ri
      JOIN tenant_kitchen.ingredients i ON i.id = ri.ingredient_id
      WHERE ri.tenant_id = ${tenantId}
        AND ri.recipe_version_id = ${recipeVersionId}
        AND ri.deleted_at IS NULL
      ORDER BY ri.sort_order
    `);
  let totalCost = 0;
  const costBreakdowns = [];
  for (const ing of ingredients) {
    const cost = Number(ing.ingredient_cost) || 0;
    totalCost += cost;
    costBreakdowns.push({
      id: ing.id,
      name: ing.ingredient_name,
      quantity: Number(ing.quantity),
      unit: ing.unit_id.toString(),
      wasteFactor: Number(ing.waste_factor),
      adjustedQuantity: Number(ing.quantity) * Number(ing.waste_factor),
      unitCost: ing.ingredient_cost
        ? cost / (Number(ing.quantity) * Number(ing.waste_factor))
        : 0,
      cost,
      hasInventoryItem: ing.ingredient_cost !== null,
    });
  }
  const yieldQuantity = Number(recipeVersion[0].yield_quantity);
  const costPerYield = yieldQuantity > 0 ? totalCost / yieldQuantity : 0;
  await database_1.database.$executeRaw(database_1.Prisma.sql`
      UPDATE tenant_kitchen.recipe_versions
      SET
        total_cost = ${totalCost},
        cost_per_yield = ${costPerYield},
        cost_calculated_at = NOW()
      WHERE tenant_id = ${tenantId} AND id = ${recipeVersionId}
    `);
  return {
    totalCost,
    costPerYield,
    ingredients: costBreakdowns,
  };
};
const calculateAllRecipeCosts = async (tenantId, recipeVersionId) => {
  const ingredients = await database_1.database.$queryRaw(database_1.Prisma.sql`
      SELECT id
      FROM tenant_kitchen.recipe_ingredients
      WHERE tenant_id = ${tenantId}
        AND recipe_version_id = ${recipeVersionId}
        AND deleted_at IS NULL
    `);
  for (const ing of ingredients) {
    await calculateRecipeIngredientCost(tenantId, ing.id);
  }
  return await calculateRecipeCost(tenantId, recipeVersionId);
};
const getRecipeCostSummary = async (recipeVersionId) => {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    throw new Error("Unauthorized");
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  return await calculateRecipeCost(tenantId, recipeVersionId);
};
exports.getRecipeCostSummary = getRecipeCostSummary;
const recalculateRecipeCosts = async (recipeVersionId) => {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    throw new Error("Unauthorized");
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  return await calculateAllRecipeCosts(tenantId, recipeVersionId);
};
exports.recalculateRecipeCosts = recalculateRecipeCosts;
const scaleRecipeCost = async (
  recipeVersionId,
  targetPortions,
  currentYield
) => {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    throw new Error("Unauthorized");
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  const recipeVersion = await database_1.database.$queryRaw(database_1.Prisma
    .sql`
      SELECT total_cost, cost_per_yield, yield_quantity
      FROM tenant_kitchen.recipe_versions
      WHERE tenant_id = ${tenantId} AND id = ${recipeVersionId}
    `);
  if (!recipeVersion[0]) {
    throw new Error("Recipe version not found");
  }
  const originalCost = Number(recipeVersion[0].total_cost);
  const scaleFactor = targetPortions / currentYield;
  const scaledTotalCost = originalCost * scaleFactor;
  const scaledCostPerYield =
    Number(recipeVersion[0].cost_per_yield) * scaleFactor;
  return {
    scaledTotalCost,
    scaledCostPerYield,
    scaleFactor,
    originalCost,
  };
};
exports.scaleRecipeCost = scaleRecipeCost;
const updateRecipeIngredientWasteFactor = async (
  recipeIngredientId,
  wasteFactor
) => {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    throw new Error("Unauthorized");
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  if (wasteFactor <= 0) {
    throw new Error("Waste factor must be greater than 0");
  }
  await database_1.database.$executeRaw(database_1.Prisma.sql`
      UPDATE tenant_kitchen.recipe_ingredients
      SET waste_factor = ${wasteFactor}, updated_at = NOW()
      WHERE tenant_id = ${tenantId} AND id = ${recipeIngredientId}
    `);
};
exports.updateRecipeIngredientWasteFactor = updateRecipeIngredientWasteFactor;
const updateEventBudgetsForRecipe = async (recipeVersionId) => {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    throw new Error("Unauthorized");
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  await database_1.database.$executeRaw(database_1.Prisma.sql`
      WITH recipe_events AS (
        SELECT DISTINCT pt.event_id
        FROM tenant_kitchen.prep_tasks pt
        WHERE pt.tenant_id = ${tenantId}
          AND pt.recipe_version_id = ${recipeVersionId}
          AND pt.deleted_at IS NULL
      ),
      event_recipe_costs AS (
        SELECT
          e.id as event_id,
          COALESCE(SUM(rv.total_cost), 0) as total_recipe_cost
        FROM recipe_events re
        JOIN tenant_events.events e ON e.id = re.event_id
        JOIN tenant_kitchen.recipe_versions rv
          ON rv.recipe_id IN (
            SELECT DISTINCT pt.dish_id
            FROM tenant_kitchen.prep_tasks pt
            WHERE pt.event_id = e.id
              AND pt.tenant_id = ${tenantId}
              AND pt.deleted_at IS NULL
          )
          AND rv.version_number = (
            SELECT MAX(version_number)
            FROM tenant_kitchen.recipe_versions
            WHERE recipe_id = rv.recipe_id
          )
        WHERE e.tenant_id = ${tenantId}
          AND e.budget IS NOT NULL
        GROUP BY e.id
      )
      UPDATE tenant_events.events e
      SET budget = COALESCE(e.budget, 0) + COALESCE(
        (SELECT total_recipe_cost FROM event_recipe_costs WHERE event_id = e.id),
        0
      )
      WHERE e.tenant_id = ${tenantId}
        AND e.id IN (SELECT event_id FROM recipe_events)
    `);
};
exports.updateEventBudgetsForRecipe = updateEventBudgetsForRecipe;
