import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { captureException } from "@sentry/nextjs";
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

const calculateRecipeCost = async (
  tenantId: string,
  recipeVersionId: string
): Promise<RecipeCostBreakdown | null> => {
  const recipeVersion = await database.recipeVersion.findFirst({
    where: { tenantId, id: recipeVersionId, deletedAt: null },
    select: { id: true, yieldQuantity: true },
  });

  if (!recipeVersion) {
    return null;
  }

  const recipeIngredients = await database.recipeIngredient.findMany({
    where: {
      tenantId,
      recipeVersionId,
      deletedAt: null,
    },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      ingredientId: true,
      quantity: true,
      unitId: true,
      wasteFactor: true,
      ingredientCost: true,
    },
  });

  // Fetch ingredient names in a single query to avoid N+1
  const ingredientIds = recipeIngredients.map((ri) => ri.ingredientId);
  const ingredients = await database.ingredient.findMany({
    where: { tenantId, id: { in: ingredientIds }, deletedAt: null },
    select: { id: true, name: true },
  });
  const ingredientNameMap = new Map(ingredients.map((i) => [i.id, i.name]));

  let totalCost = 0;
  const costBreakdowns: IngredientCostBreakdown[] = [];

  for (const ri of recipeIngredients) {
    const cost = Number(ri.ingredientCost) || 0;
    totalCost += cost;

    const quantity = Number(ri.quantity);
    const wasteFactor = Number(ri.wasteFactor);
    const adjustedQuantity = quantity * wasteFactor;

    costBreakdowns.push({
      id: ri.id,
      name: ingredientNameMap.get(ri.ingredientId) ?? "Unknown",
      quantity,
      unit: ri.unitId.toString(),
      wasteFactor,
      adjustedQuantity,
      unitCost: adjustedQuantity > 0 ? cost / adjustedQuantity : 0,
      cost,
      hasInventoryItem: ri.ingredientCost !== null,
    });
  }

  const yieldQuantity = Number(recipeVersion.yieldQuantity);
  const costPerYield = yieldQuantity > 0 ? totalCost / yieldQuantity : 0;

  await database.recipeVersion.update({
    where: { tenantId_id: { tenantId, id: recipeVersionId } },
    data: {
      totalCost,
      costPerYield,
      costCalculatedAt: new Date(),
    },
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
  // Batch update all ingredient cost timestamps in one query (fixes N+1)
  await database.recipeIngredient.updateMany({
    where: {
      tenantId,
      recipeVersionId,
      deletedAt: null,
    },
    data: { costCalculatedAt: new Date() },
  });

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
    captureException(error);
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
    captureException(error);
    return NextResponse.json(
      { error: "Failed to recalculate recipe cost" },
      { status: 500 }
    );
  }
}
