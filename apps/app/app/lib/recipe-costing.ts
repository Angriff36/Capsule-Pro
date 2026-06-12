import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { getTenantIdForOrg, requireCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest-command";

export interface UnitConversion {
  fromUnitId: number;
  multiplier: number;
  toUnitId: number;
}

export interface RecipeCostBreakdown {
  costPerPortion?: number;
  costPerYield: number;
  ingredients: IngredientCostBreakdown[];
  totalCost: number;
}

export interface IngredientCostBreakdown {
  adjustedQuantity: number;
  cost: number;
  hasInventoryItem: boolean;
  id: string;
  name: string;
  quantity: number;
  unit: string;
  unitCost: number;
  wasteFactor: number;
}

export interface PortionScaleRequest {
  currentYield: number;
  recipeVersionId: string;
  targetPortions: number;
}

export interface ScaledRecipeCost {
  originalCost: number;
  scaledCostPerYield: number;
  scaledTotalCost: number;
  scaleFactor: number;
}

const loadUnitConversions = async () => {
  const rows = await database.$queryRaw<UnitConversion[]>(
    Prisma.sql`
      SELECT from_unit_id, to_unit_id, multiplier
      FROM core.unit_conversions
    `
  );
  return new Map(
    rows.map((row) => [`${row.fromUnitId}-${row.toUnitId}`, row.multiplier])
  );
};

const convertQuantity = (
  quantity: number,
  fromUnitId: number,
  toUnitId: number,
  conversions: Map<string, number>
): number => {
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

const calculateRecipeIngredientCost = async (
  tenantId: string,
  recipeIngredientId: string
): Promise<IngredientCostBreakdown | null> => {
  const ingredient = await database.$queryRaw<
    {
      id: string;
      ingredient_id: string;
      ingredient_name: string;
      quantity: number;
      unit_id: number;
      waste_factor: number;
      inventory_unit_cost: number;
      inventory_unit_id: number;
    }[]
  >(
    Prisma.sql`
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
        ON ii.tenant_id = ri.tenant_id
        AND ii.name = i.name
        AND ii.deleted_at IS NULL
      WHERE ri.tenant_id = ${tenantId}
        AND ri.id = ${recipeIngredientId}
        AND ri.deleted_at IS NULL
    `
  );

  if (!ingredient[0]) {
    return null;
  }

  const ing = ingredient[0];
  const conversions = await loadUnitConversions();

  const adjustedQuantity = ing.quantity * ing.waste_factor;
  let cost: number;
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

  await database.recipeIngredient.updateMany({
    where: { tenantId, id: recipeIngredientId },
    data: {
      adjustedQuantity,
      ingredientCost: cost,
      costCalculatedAt: new Date(),
    },
  });

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

const calculateRecipeCost = async (
  tenantId: string,
  recipeVersionId: string
): Promise<RecipeCostBreakdown | null> => {
  const recipeVersion = await database.$queryRaw<
    {
      id: string;
      yield_quantity: number;
    }[]
  >(
    Prisma.sql`
      SELECT id, yield_quantity
      FROM tenant_kitchen.recipe_versions
      WHERE tenant_id = ${tenantId} AND id = ${recipeVersionId}
    `
  );

  if (!recipeVersion[0]) {
    return null;
  }

  const ingredients = await database.$queryRaw<
    {
      id: string;
      ingredient_name: string;
      quantity: number;
      unit_id: number;
      waste_factor: number;
      ingredient_cost: number;
    }[]
  >(
    Prisma.sql`
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
    `
  );

  let totalCost = 0;
  const costBreakdowns: IngredientCostBreakdown[] = [];

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

  // Governed write: RecipeVersion.updateCosts via Manifest runtime (constitution §9)
  const user = await requireCurrentUser();
  await runManifestCommand({
    entity: "RecipeVersion",
    command: "updateCosts",
    body: {
      id: recipeVersionId,
      newTotalCost: totalCost,
      newCostPerYield: costPerYield,
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  // Bypass: costCalculatedAt is not an IR field — direct write for audit timestamp
  await database.recipeVersion.updateMany({
    where: { tenantId, id: recipeVersionId },
    data: { costCalculatedAt: new Date() },
  });

  return {
    totalCost,
    costPerYield,
    ingredients: costBreakdowns,
  };
};

const calculateAllRecipeCosts = async (
  tenantId: string,
  recipeVersionId: string
): Promise<RecipeCostBreakdown | null> => {
  const ingredients = await database.$queryRaw<{ id: string }[]>(
    Prisma.sql`
      SELECT id
      FROM tenant_kitchen.recipe_ingredients
      WHERE tenant_id = ${tenantId}
        AND recipe_version_id = ${recipeVersionId}
        AND deleted_at IS NULL
    `
  );

  for (const ing of ingredients) {
    await calculateRecipeIngredientCost(tenantId, ing.id);
  }

  return await calculateRecipeCost(tenantId, recipeVersionId);
};

export const getRecipeCostSummary = async (
  recipeVersionId: string
): Promise<RecipeCostBreakdown | null> => {
  const { orgId } = await auth();
  if (!orgId) {
    throw new Error("Unauthorized");
  }
  const tenantId = await getTenantIdForOrg(orgId);
  return await calculateRecipeCost(tenantId, recipeVersionId);
};

export const recalculateRecipeCosts = async (
  recipeVersionId: string
): Promise<RecipeCostBreakdown | null> => {
  const { orgId } = await auth();
  if (!orgId) {
    throw new Error("Unauthorized");
  }
  const tenantId = await getTenantIdForOrg(orgId);
  return await calculateAllRecipeCosts(tenantId, recipeVersionId);
};

export const scaleRecipeCost = async (
  recipeVersionId: string,
  targetPortions: number,
  currentYield: number
): Promise<ScaledRecipeCost> => {
  const { orgId } = await auth();
  if (!orgId) {
    throw new Error("Unauthorized");
  }
  const tenantId = await getTenantIdForOrg(orgId);

  const recipeVersion = await database.$queryRaw<
    {
      total_cost: number;
      cost_per_yield: number;
      yield_quantity: number;
    }[]
  >(
    Prisma.sql`
      SELECT total_cost, cost_per_yield, yield_quantity
      FROM tenant_kitchen.recipe_versions
      WHERE tenant_id = ${tenantId} AND id = ${recipeVersionId}
    `
  );

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

export const updateRecipeIngredientWasteFactor = async (
  recipeIngredientId: string,
  wasteFactor: number
): Promise<void> => {
  const { orgId } = await auth();
  if (!orgId) {
    throw new Error("Unauthorized");
  }

  if (wasteFactor <= 0) {
    throw new Error("Waste factor must be greater than 0");
  }

  // Governed write: RecipeIngredient.updateWasteFactor via Manifest runtime (constitution §9)
  const user = await requireCurrentUser();
  const result = await runManifestCommand({
    entity: "RecipeIngredient",
    command: "updateWasteFactor",
    body: {
      id: recipeIngredientId,
      newWasteFactor: wasteFactor,
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to update waste factor");
  }
};

export const updateEventBudgetsForRecipe = async (
  recipeVersionId: string
): Promise<void> => {
  const { orgId } = await auth();
  if (!orgId) {
    throw new Error("Unauthorized");
  }
  const tenantId = await getTenantIdForOrg(orgId);

  const eventRecipeCosts = await database.$queryRaw<
    {
      event_id: string;
      current_budget: Prisma.Decimal | null;
      total_recipe_cost: Prisma.Decimal | number | string;
    }[]
  >(
    Prisma.sql`
      WITH recipe_events AS (
        SELECT DISTINCT pt.event_id
        FROM tenant_kitchen.prep_tasks pt
        WHERE pt.tenant_id = ${tenantId}
          AND pt.recipe_version_id = ${recipeVersionId}
          AND pt.deleted_at IS NULL
      )
      SELECT
        e.id as event_id,
        e.budget as current_budget,
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
      GROUP BY e.id, e.budget
    `
  );

  // Governed write: Event.updateBudget via Manifest runtime (constitution §9)
  const user = await requireCurrentUser();
  for (const row of eventRecipeCosts) {
    const newBudget = new Prisma.Decimal(row.current_budget ?? 0).plus(
      row.total_recipe_cost
    );
    await runManifestCommand({
      entity: "Event",
      command: "updateBudget",
      body: {
        id: row.event_id,
        newBudget: newBudget.toNumber(),
      },
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
    });
  }
};
