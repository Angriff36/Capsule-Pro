var __importDefault =
  (this && this.__importDefault) ||
  ((mod) => (mod && mod.__esModule ? mod : { default: mod }));
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const badge_1 = require("@repo/design-system/components/ui/badge");
const button_1 = require("@repo/design-system/components/ui/button");
const card_1 = require("@repo/design-system/components/ui/card");
const lucide_react_1 = require("lucide-react");
const link_1 = __importDefault(require("next/link"));
const navigation_1 = require("next/navigation");
const tenant_1 = require("../../../../lib/tenant");
const header_1 = require("../../../components/header");
const formatMinutes = (minutes) =>
  minutes && minutes > 0 ? `${minutes}m` : "-";
const RecipeDetailPage = async ({ params }) => {
  const { orgId } = await (0, server_1.auth)();
  const resolvedParams = await params;
  if (!orgId) {
    return (0, navigation_1.notFound)();
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  const recipeId = resolvedParams.id;
  // Fetch recipe details
  const recipes = await database_1.database.$queryRaw(database_1.Prisma.sql`
      SELECT
        r.id,
        r.name,
        r.description,
        r.category,
        r.tags,
        r.is_active,
        rv.yield_quantity,
        u.code AS yield_unit,
        rv.prep_time_minutes,
        rv.cook_time_minutes,
        rv.rest_time_minutes,
        rv.instructions,
        rv.notes,
        (
          SELECT image_url
          FROM tenant_kitchen.recipe_steps rs
          WHERE rs.tenant_id = r.tenant_id
            AND rs.recipe_version_id = rv.id
            AND rs.deleted_at IS NULL
            AND rs.image_url IS NOT NULL
          ORDER BY rs.step_number ASC
          LIMIT 1
        ) AS image_url
      FROM tenant_kitchen.recipes r
      LEFT JOIN LATERAL (
        SELECT rv.*
        FROM tenant_kitchen.recipe_versions rv
        WHERE rv.tenant_id = r.tenant_id
          AND rv.recipe_id = r.id
          AND rv.deleted_at IS NULL
        ORDER BY rv.version_number DESC
        LIMIT 1
      ) rv ON true
      LEFT JOIN core.units u ON u.id = rv.yield_unit_id
      WHERE r.tenant_id = ${tenantId}
        AND r.id = ${recipeId}
        AND r.deleted_at IS NULL
    `);
  if (recipes.length === 0) {
    return (0, navigation_1.notFound)();
  }
  const recipe = recipes[0];
  // Fetch ingredients
  const ingredients = await database_1.database.$queryRaw(database_1.Prisma.sql`
      SELECT
        i.id,
        i.name,
        ri.quantity,
        u.code AS unit_code,
        ri.notes,
        ri.order_index
      FROM tenant_kitchen.recipe_ingredients ri
      JOIN tenant_kitchen.ingredients i
        ON i.tenant_id = ri.tenant_id
        AND i.id = ri.ingredient_id
      LEFT JOIN core.units u ON u.id = ri.unit_id
      WHERE ri.tenant_id = ${tenantId}
        AND ri.recipe_version_id = (
          SELECT rv.id
          FROM tenant_kitchen.recipe_versions rv
          WHERE rv.tenant_id = ${tenantId}
            AND rv.recipe_id = ${recipeId}
            AND rv.deleted_at IS NULL
          ORDER BY rv.version_number DESC
          LIMIT 1
        )
        AND ri.deleted_at IS NULL
      ORDER BY ri.order_index ASC
    `);
  return (
    <>
      <header_1.Header page={recipe.name} pages={["Kitchen Ops", "Recipes"]}>
        <button_1.Button asChild variant="outline">
          <link_1.default href="/kitchen/recipes">
            <lucide_react_1.ArrowLeft className="mr-2 h-4 w-4" />
            Back to Recipes
          </link_1.default>
        </button_1.Button>
      </header_1.Header>

      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        {/* Recipe Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{recipe.name}</h1>
              <badge_1.Badge
                variant={recipe.is_active ? "default" : "secondary"}
              >
                {recipe.is_active ? "Active" : "Inactive"}
              </badge_1.Badge>
            </div>
            {recipe.category && (
              <badge_1.Badge className="mt-1" variant="outline">
                {recipe.category}
              </badge_1.Badge>
            )}
          </div>
          <button_1.Button>
            <lucide_react_1.Edit className="mr-2 h-4 w-4" />
            Edit Recipe
          </button_1.Button>
        </div>

        {recipe.description && (
          <p className="text-muted-foreground">{recipe.description}</p>
        )}

        {/* Time and Yield Info */}
        <div className="grid gap-4 md:grid-cols-4">
          <card_1.Card>
            <card_1.CardContent className="flex items-center gap-3 pt-6">
              <lucide_react_1.Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground">Prep Time</div>
                <div className="font-semibold">
                  {formatMinutes(recipe.prep_time_minutes)}
                </div>
              </div>
            </card_1.CardContent>
          </card_1.Card>
          <card_1.Card>
            <card_1.CardContent className="flex items-center gap-3 pt-6">
              <lucide_react_1.ChefHat className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground">Cook Time</div>
                <div className="font-semibold">
                  {formatMinutes(recipe.cook_time_minutes)}
                </div>
              </div>
            </card_1.CardContent>
          </card_1.Card>
          <card_1.Card>
            <card_1.CardContent className="flex items-center gap-3 pt-6">
              <lucide_react_1.Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground">Rest Time</div>
                <div className="font-semibold">
                  {formatMinutes(recipe.rest_time_minutes)}
                </div>
              </div>
            </card_1.CardContent>
          </card_1.Card>
          <card_1.Card>
            <card_1.CardContent className="flex items-center gap-3 pt-6">
              <lucide_react_1.Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground">Yield</div>
                <div className="font-semibold">
                  {recipe.yield_quantity ?? "-"} {recipe.yield_unit ?? ""}
                </div>
              </div>
            </card_1.CardContent>
          </card_1.Card>
        </div>

        {/* Ingredients */}
        <card_1.Card>
          <card_1.CardHeader>
            <card_1.CardTitle>Ingredients</card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent>
            {ingredients.length === 0 ? (
              <p className="text-muted-foreground">No ingredients added yet.</p>
            ) : (
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {ingredients.map((ingredient) => (
                  <div
                    className="flex items-center justify-between rounded-lg border p-3"
                    key={ingredient.id}
                  >
                    <span className="font-medium">{ingredient.name}</span>
                    <span className="text-muted-foreground">
                      {ingredient.quantity} {ingredient.unit_code}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </card_1.CardContent>
        </card_1.Card>

        {/* Instructions */}
        {recipe.instructions && (
          <card_1.Card>
            <card_1.CardHeader>
              <card_1.CardTitle>Instructions</card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent>
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap">{recipe.instructions}</p>
              </div>
            </card_1.CardContent>
          </card_1.Card>
        )}

        {/* Notes */}
        {recipe.notes && (
          <card_1.Card>
            <card_1.CardHeader>
              <card_1.CardTitle>Notes</card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent>
              <p className="text-muted-foreground">{recipe.notes}</p>
            </card_1.CardContent>
          </card_1.Card>
        )}

        {/* Tags */}
        {recipe.tags && recipe.tags.length > 0 && (
          <card_1.Card>
            <card_1.CardHeader>
              <card_1.CardTitle>Tags</card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent>
              <div className="flex flex-wrap gap-2">
                {recipe.tags.map((tag) => (
                  <badge_1.Badge key={tag} variant="secondary">
                    {tag}
                  </badge_1.Badge>
                ))}
              </div>
            </card_1.CardContent>
          </card_1.Card>
        )}
      </div>
    </>
  );
};
exports.default = RecipeDetailPage;
