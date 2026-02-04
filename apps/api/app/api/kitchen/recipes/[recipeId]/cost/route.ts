import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

export interface UnitConversion {
  fromUnitId: number;
  toUnitId: number;
  multiplier: number;
}

export interface RecipeCostBreakdown {
  totalCost: number;
  costPerYield: number;
  costPerPortion?: number;
  ingredients: IngredientCostBreakdown[];
}

export interface IngredientCostBreakdown {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  wasteFactor: number;
  adjustedQuantity: number;
  unitCost: number;
  cost: number;
  hasInventoryItem: boolean;
}

const _loadUnitConversions = async () => {
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

const _convertQuantity = (
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

  await database.$executeRaw(
    Prisma.sql`
      UPDATE tenant_kitchen.recipe_versions
      SET
        total_cost = ${totalCost},
        cost_per_yield = ${costPerYield},
        cost_calculated_at = NOW()
      WHERE tenant_id = ${tenantId} AND id = ${recipeVersionId}
    `
  );

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
    await database.$executeRaw(
      Prisma.sql`
        UPDATE tenant_kitchen.recipe_ingredients
        SET cost_calculated_at = NOW()
        WHERE tenant_id = ${tenantId} AND id = ${ing.id}
      `
    );
  }

  return await calculateRecipeCost(tenantId, recipeVersionId);
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ recipeId: string }> }
) {
  try {
    const { recipeId } = await params;
    const recipeVersionId = recipeId;
    const { orgId } = await auth();

    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const costSummary = await calculateRecipeCost(tenantId, recipeVersionId);

    if (!costSummary) {
      return NextResponse.json(
        { error: "Recipe version not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(costSummary);
  } catch (error) {
    console.error("Error fetching recipe cost:", error);
    return NextResponse.json(
      { error: "Failed to fetch recipe cost" },
      { status: 500 }
    );
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ recipeVersionId: string }> }
) {
  try {
    const { recipeVersionId } = await params;
    const { orgId } = await auth();

    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const costSummary = await calculateAllRecipeCosts(
      tenantId,
      recipeVersionId
    );

    if (!costSummary) {
      return NextResponse.json(
        { error: "Recipe version not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(costSummary);
  } catch (error) {
    console.error("Error recalculating recipe cost:", error);
    return NextResponse.json(
      { error: "Failed to recalculate recipe cost" },
      { status: 500 }
    );
  }
}
