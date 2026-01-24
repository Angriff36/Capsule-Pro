Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
exports.PATCH = PATCH;
const server_1 = require("next/server");
const recipe_costing_1 = require("@/app/lib/recipe-costing");
async function POST(request, _params) {
  try {
    const body = await request.json();
    if (!(body.recipeVersionId && body.targetPortions && body.currentYield)) {
      return server_1.NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    const result = await (0, recipe_costing_1.scaleRecipeCost)(
      body.recipeVersionId,
      body.targetPortions,
      body.currentYield
    );
    return server_1.NextResponse.json(result);
  } catch (error) {
    console.error("Error scaling recipe cost:", error);
    return server_1.NextResponse.json(
      { error: "Failed to scale recipe cost" },
      { status: 500 }
    );
  }
}
async function PATCH(request, _params) {
  try {
    const body = await request.json();
    const { recipeIngredientId, wasteFactor } = body;
    if (!recipeIngredientId || typeof wasteFactor !== "number") {
      return server_1.NextResponse.json(
        { error: "recipeIngredientId and wasteFactor are required" },
        { status: 400 }
      );
    }
    await (0, recipe_costing_1.updateRecipeIngredientWasteFactor)(
      recipeIngredientId,
      wasteFactor
    );
    return server_1.NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating waste factor:", error);
    return server_1.NextResponse.json(
      { error: "Failed to update waste factor" },
      { status: 500 }
    );
  }
}
