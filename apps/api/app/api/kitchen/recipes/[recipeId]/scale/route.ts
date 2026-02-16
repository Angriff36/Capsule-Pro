import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

export interface PortionScaleRequest {
  recipeVersionId: string;
  targetPortions: number;
  currentYield: number;
}

export interface ScaledRecipeCost {
  scaledTotalCost: number;
  scaledCostPerYield: number;
  scaleFactor: number;
  originalCost: number;
}

const updateRecipeIngredientWasteFactor = async (
  recipeIngredientId: string,
  wasteFactor: number,
  tenantId: string
): Promise<void> => {
  if (wasteFactor <= 0) {
    throw new Error("Waste factor must be greater than 0");
  }

  await database.recipeIngredient.update({
    where: { tenantId_id: { tenantId, id: recipeIngredientId } },
    data: { wasteFactor, updatedAt: new Date() },
  });
};

const scaleRecipeCost = async (
  recipeVersionId: string,
  targetPortions: number,
  currentYield: number,
  tenantId: string
): Promise<ScaledRecipeCost> => {
  const recipeVersion = await database.recipeVersion.findFirst({
    where: { tenantId, id: recipeVersionId, deletedAt: null },
    select: { totalCost: true, costPerYield: true, yieldQuantity: true },
  });

  if (!recipeVersion) {
    throw new Error("Recipe version not found");
  }

  const originalCost = Number(recipeVersion.totalCost);
  const scaleFactor = targetPortions / currentYield;
  const scaledTotalCost = originalCost * scaleFactor;
  const scaledCostPerYield = Number(recipeVersion.costPerYield) * scaleFactor;

  return {
    scaledTotalCost,
    scaledCostPerYield,
    scaleFactor,
    originalCost,
  };
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ recipeId: string }> }
) {
  try {
    const { recipeId } = await params;
    const recipeVersionId = recipeId;
    const body = await request.json();
    const { targetPortions, currentYield } = body;
    const { orgId } = await auth();

    if (!(recipeVersionId && targetPortions && currentYield)) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const result = await scaleRecipeCost(
      recipeVersionId,
      targetPortions,
      currentYield,
      tenantId
    );

    return NextResponse.json(result);
  } catch (error) {
    captureException(error);
    return NextResponse.json(
      { error: "Failed to scale recipe cost" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ recipeId: string }> }
) {
  try {
    const { recipeId } = await params;
    const _recipeVersionId = recipeId;
    const body = await request.json();
    const { recipeIngredientId, wasteFactor } = body;
    const { orgId } = await auth();

    if (!recipeIngredientId || typeof wasteFactor !== "number") {
      return NextResponse.json(
        { error: "recipeIngredientId and wasteFactor are required" },
        { status: 400 }
      );
    }

    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    await updateRecipeIngredientWasteFactor(
      recipeIngredientId,
      wasteFactor,
      tenantId
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    captureException(error);
    return NextResponse.json(
      { error: "Failed to update waste factor" },
      { status: 500 }
    );
  }
}
