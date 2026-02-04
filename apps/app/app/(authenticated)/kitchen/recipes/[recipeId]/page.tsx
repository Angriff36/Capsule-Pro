import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Card, CardContent } from "@repo/design-system/components/ui/card";
import { ArrowLeft, ChefHat, Clock, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { invariant } from "../../../../lib/invariant";
import { getTenantIdForOrg } from "../../../../lib/tenant";
import { Header } from "../../../components/header";
import { RecipeDetailEditButton } from "./components/recipe-detail-edit-button";
import { RecipeDetailTabs } from "./components/recipe-detail-tabs";

interface RecipeDetailRow {
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
}

interface IngredientRow {
  id: string;
  name: string;
  quantity: number;
  unit_code: string;
  notes: string | null;
  order_index: number;
}

interface RecipeStepRow {
  step_number: number;
  instruction: string;
  duration_minutes: number | null;
  temperature_value: number | null;
  temperature_unit: string | null;
  equipment_needed: string[] | null;
  tips: string | null;
  video_url: string | null;
  image_url: string | null;
}

const formatMinutes = (minutes?: number | null) =>
  minutes && minutes > 0 ? `${minutes}m` : "-";

const toDecimalNumber = (value: unknown, field: string): number => {
  if (typeof value === "number") {
    return value;
  }

  if (Prisma.Decimal.isDecimal(value)) {
    const parsed = Number(value.toJSON());
    invariant(
      Number.isFinite(parsed),
      `${field} must be a finite decimal value`
    );
    return parsed;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    invariant(Number.isFinite(parsed), `${field} must be a numeric string`);
    return parsed;
  }

  invariant(false, `${field} must be a number or Decimal`);
};

const toDecimalNumberOrNull = (
  value: unknown,
  field: string
): number | null => {
  if (value === null || value === undefined) {
    return null;
  }

  return toDecimalNumber(value, field);
};

const RecipeDetailPage = async ({
  params,
}: {
  params: Promise<{ recipeId: string }>;
}) => {
  const { orgId } = await auth();
  const resolvedParams = await params;

  if (!orgId) {
    return notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const recipeId = resolvedParams.recipeId;

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

  const recipe = {
    ...recipes[0],
    yield_quantity: toDecimalNumberOrNull(
      recipes[0].yield_quantity,
      "recipe.yield_quantity"
    ),
  };

  // Fetch ingredients
  const ingredientRows = await database.$queryRaw<IngredientRow[]>(
    Prisma.sql`
      SELECT
        i.id,
        i.name,
        ri.quantity,
        u.code AS unit_code,
        ri.preparation_notes AS notes,
        ri.sort_order AS order_index
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
      ORDER BY ri.sort_order ASC
    `
  );
  const ingredients = ingredientRows.map((ingredient) => ({
    ...ingredient,
    quantity: toDecimalNumber(ingredient.quantity, "ingredient.quantity"),
  }));

  // Get the latest recipe version ID
  const recipeVersion = await database.$queryRaw<{ version_id: string }[]>(
    Prisma.sql`
      SELECT rv.id AS version_id
      FROM tenant_kitchen.recipe_versions rv
      WHERE rv.tenant_id = ${tenantId}
        AND rv.recipe_id = ${recipeId}
        AND rv.deleted_at IS NULL
      ORDER BY rv.version_number DESC
      LIMIT 1
    `
  );

  const recipeVersionId =
    recipeVersion.length > 0 ? recipeVersion[0].version_id : null;

  // Fetch recipe steps
  const _steps: RecipeStepRow[] =
    recipeVersion.length > 0
      ? await database.$queryRaw<RecipeStepRow[]>(
          Prisma.sql`
          SELECT
            step_number,
            instruction,
            duration_minutes,
            temperature_value,
            temperature_unit,
            equipment_needed,
            tips,
            video_url,
            image_url
          FROM tenant_kitchen.recipe_steps
          WHERE tenant_id = ${tenantId}
            AND recipe_version_id = ${recipeVersion[0].version_id}
            AND deleted_at IS NULL
          ORDER BY step_number ASC
        `
        )
      : [];

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
          <RecipeDetailEditButton
            recipeId={recipeId}
            recipeName={recipe.name}
          />
        </div>

        {recipe.description && (
          <p className="text-muted-foreground">{recipe.description}</p>
        )}

        {/* Metadata Bar */}
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
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground">Yield</div>
                <div className="font-semibold">
                  {recipe.yield_quantity ?? "-"} {recipe.yield_unit ?? ""}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <Badge className="h-5 w-5" />
              <div>
                <div className="text-sm text-muted-foreground">Difficulty</div>
                <div className="font-semibold">Medium</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recipe Detail Tabs */}
        <RecipeDetailTabs
          ingredients={ingredients}
          recipe={recipe}
          recipeVersionId={recipeVersionId}
        />
      </div>
    </>
  );
};

export default RecipeDetailPage;
