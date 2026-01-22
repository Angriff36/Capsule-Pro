import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { ArrowLeft, ChefHat, Clock, Edit, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenantIdForOrg } from "../../../../lib/tenant";
import { Header } from "../../../components/header";

type RecipeDetailRow = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  tags: string[] | null;
  is_active: boolean;
  yield_quantity: number | null;
  yield_unit: string | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  rest_time_minutes: number | null;
  instructions: string | null;
  notes: string | null;
  image_url: string | null;
};

type IngredientRow = {
  id: string;
  name: string;
  quantity: number;
  unit_code: string;
  notes: string | null;
  order_index: number;
};

const formatMinutes = (minutes?: number | null) =>
  minutes && minutes > 0 ? `${minutes}m` : "-";

const RecipeDetailPage = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const { orgId } = await auth();
  const resolvedParams = await params;

  if (!orgId) {
    return notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const recipeId = resolvedParams.id;

  // Fetch recipe details
  const recipes = await database.$queryRaw<RecipeDetailRow[]>(
    Prisma.sql`
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
    `
  );

  if (recipes.length === 0) {
    return notFound();
  }

  const recipe = recipes[0];

  // Fetch ingredients
  const ingredients = await database.$queryRaw<IngredientRow[]>(
    Prisma.sql`
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
    `
  );

  return (
    <>
      <Header page={recipe.name} pages={["Kitchen Ops", "Recipes"]}>
        <Button asChild variant="outline">
          <Link href="/kitchen/recipes">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Recipes
          </Link>
        </Button>
      </Header>

      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        {/* Recipe Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{recipe.name}</h1>
              <Badge variant={recipe.is_active ? "default" : "secondary"}>
                {recipe.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
            {recipe.category && (
              <Badge className="mt-1" variant="outline">
                {recipe.category}
              </Badge>
            )}
          </div>
          <Button>
            <Edit className="mr-2 h-4 w-4" />
            Edit Recipe
          </Button>
        </div>

        {recipe.description && (
          <p className="text-muted-foreground">{recipe.description}</p>
        )}

        {/* Time and Yield Info */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground">Prep Time</div>
                <div className="font-semibold">
                  {formatMinutes(recipe.prep_time_minutes)}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <ChefHat className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground">Cook Time</div>
                <div className="font-semibold">
                  {formatMinutes(recipe.cook_time_minutes)}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground">Rest Time</div>
                <div className="font-semibold">
                  {formatMinutes(recipe.rest_time_minutes)}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground">Yield</div>
                <div className="font-semibold">
                  {recipe.yield_quantity ?? "-"} {recipe.yield_unit ?? ""}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ingredients */}
        <Card>
          <CardHeader>
            <CardTitle>Ingredients</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        {/* Instructions */}
        {recipe.instructions && (
          <Card>
            <CardHeader>
              <CardTitle>Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap">{recipe.instructions}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {recipe.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{recipe.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Tags */}
        {recipe.tags && recipe.tags.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {recipe.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
};

export default RecipeDetailPage;
