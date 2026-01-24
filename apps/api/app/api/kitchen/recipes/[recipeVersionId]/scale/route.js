Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
exports.PATCH = PATCH;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const tenant_1 = require("@/app/lib/tenant");
const updateRecipeIngredientWasteFactor = async (
  recipeIngredientId,
  wasteFactor,
  tenantId
) => {
  if (wasteFactor <= 0) {
    throw new Error("Waste factor must be greater than 0");
  }
  await database_1.database.$executeRaw(database_1.Prisma.sql`
      UPDATE tenant_kitchen.recipe_ingredients
      SET waste_factor = ${wasteFactor}, updated_at = NOW()
      WHERE tenant_id = ${tenantId} AND id = ${recipeIngredientId}
    `);
};
const scaleRecipeCost = async (
  recipeVersionId,
  targetPortions,
  currentYield,
  tenantId
) => {
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
async function POST(request, { params }) {
  try {
    const { recipeVersionId } = await params;
    const body = await request.json();
    const { targetPortions, currentYield } = body;
    const { orgId } = await (0, server_1.auth)();
    if (!(recipeVersionId && targetPortions && currentYield)) {
      return server_2.NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    if (!orgId) {
      return server_2.NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
    const result = await scaleRecipeCost(
      recipeVersionId,
      targetPortions,
      currentYield,
      tenantId
    );
    return server_2.NextResponse.json(result);
  } catch (error) {
    console.error("Error scaling recipe cost:", error);
    return server_2.NextResponse.json(
      { error: "Failed to scale recipe cost" },
      { status: 500 }
    );
  }
}
async function PATCH(request, { params }) {
  try {
    const { recipeVersionId } = await params;
    const body = await request.json();
    const { recipeIngredientId, wasteFactor } = body;
    const { orgId } = await (0, server_1.auth)();
    if (!recipeIngredientId || typeof wasteFactor !== "number") {
      return server_2.NextResponse.json(
        { error: "recipeIngredientId and wasteFactor are required" },
        { status: 400 }
      );
    }
    if (!orgId) {
      return server_2.NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
    await updateRecipeIngredientWasteFactor(
      recipeIngredientId,
      wasteFactor,
      tenantId
    );
    return server_2.NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating waste factor:", error);
    return server_2.NextResponse.json(
      { error: "Failed to update waste factor" },
      { status: 500 }
    );
  }
}
