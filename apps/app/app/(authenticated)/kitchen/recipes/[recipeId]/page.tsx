import { auth } from "@repo/auth/server";
import { loadKitchenRecipeDetail } from "@/app/lib/convex/kitchen-recipe-catalog-loaders";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Card, CardContent } from "@repo/design-system/components/ui/card";
import { ArrowLeft, ChefHat, Clock, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "../../../components/header";
import { RecipeDetailEditButton } from "./components/recipe-detail-edit-button";
import { RecipeDetailTabs } from "./components/recipe-detail-tabs";

interface RecipeDetailRow {
  category: string | null;
  cook_time_minutes: number | null;
  description: string | null;
  id: string;
  image_url: string | null;
  instructions: string | null;
  is_active: boolean;
  name: string;
  notes: string | null;
  prep_time_minutes: number | null;
  rest_time_minutes: number | null;
  tags: string[] | null;
  yield_quantity: number | null;
  yield_unit: string | null;
}

interface IngredientRow {
  id: string;
  name: string;
  notes: string | null;
  order_index: number;
  quantity: number;
  unit_code: string;
}

interface RecipeStepRow {
  duration_minutes: number | null;
  equipment_needed: string[] | null;
  image_url: string | null;
  instruction: string;
  step_number: number;
  temperature_unit: string | null;
  temperature_value: number | null;
  tips: string | null;
  video_url: string | null;
}

const formatMinutes = (minutes?: number | null) =>
  minutes && minutes > 0 ? `${minutes}m` : "-";

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

  const recipeId = resolvedParams.recipeId;

  const detail = await loadKitchenRecipeDetail(recipeId);
  if (!detail) {
    return notFound();
  }

  const recipe = detail.recipe;
  const ingredients = detail.ingredients;
  const recipeVersionId = detail.recipeVersionId;
  const _steps = detail.steps;

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
              <h1 className="font-bold text-2xl">{recipe.name}</h1>
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
                <div className="text-muted-foreground text-sm">Prep Time</div>
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
                <div className="text-muted-foreground text-sm">Cook Time</div>
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
                <div className="text-muted-foreground text-sm">Yield</div>
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
                <div className="text-muted-foreground text-sm">Difficulty</div>
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
          steps={_steps}
        />
      </div>
    </>
  );
};

export default RecipeDetailPage;
