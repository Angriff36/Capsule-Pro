Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const server_1 = require("next/server");
const recipe_costing_1 = require("@/app/lib/recipe-costing");
async function GET(_request, { params }) {
  try {
    const { recipeVersionId } = await params;
    const costSummary = await (0, recipe_costing_1.getRecipeCostSummary)(
      recipeVersionId
    );
    if (!costSummary) {
      return server_1.NextResponse.json(
        { error: "Recipe version not found" },
        { status: 404 }
      );
    }
    return server_1.NextResponse.json(costSummary);
  } catch (error) {
    console.error("Error fetching recipe cost:", error);
    return server_1.NextResponse.json(
      { error: "Failed to fetch recipe cost" },
      { status: 500 }
    );
  }
}
async function POST(_request, { params }) {
  try {
    const { recipeVersionId } = await params;
    const costSummary = await (0, recipe_costing_1.recalculateRecipeCosts)(
      recipeVersionId
    );
    if (!costSummary) {
      return server_1.NextResponse.json(
        { error: "Recipe version not found" },
        { status: 404 }
      );
    }
    return server_1.NextResponse.json(costSummary);
  } catch (error) {
    console.error("Error recalculating recipe cost:", error);
    return server_1.NextResponse.json(
      { error: "Failed to recalculate recipe cost" },
      { status: 500 }
    );
  }
}
