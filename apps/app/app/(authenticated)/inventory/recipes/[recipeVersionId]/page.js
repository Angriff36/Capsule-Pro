Object.defineProperty(exports, "__esModule", { value: true });
exports.default = RecipeCostPage;
const recipe_cost_detail_client_1 = require("./recipe-cost-detail-client");
async function RecipeCostPage({ params }) {
  const { recipeVersionId } = await params;
  return (
    <recipe_cost_detail_client_1.RecipeCostDetailClient
      recipeVersionId={recipeVersionId}
    />
  );
}
