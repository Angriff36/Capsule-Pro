Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const recipe_costing_1 = require("@/app/lib/recipe-costing");
async function POST(request, _params) {
  try {
    const body = await request.json();
    const { recipeVersionId } = body;
    if (!recipeVersionId) {
      return server_1.NextResponse.json(
        { error: "recipeVersionId is required" },
        { status: 400 }
      );
    }
    await (0, recipe_costing_1.updateEventBudgetsForRecipe)(recipeVersionId);
    return server_1.NextResponse.json({
      success: true,
      message: "Event budgets updated",
    });
  } catch (error) {
    console.error("Error updating event budgets:", error);
    return server_1.NextResponse.json(
      { error: "Failed to update event budgets" },
      { status: 500 }
    );
  }
}
