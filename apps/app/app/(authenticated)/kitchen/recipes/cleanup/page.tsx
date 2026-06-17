import { auth } from "@repo/auth/server";
import {
  listDishes,
  listRecipes,
  listRecipeIngredients,
  listRecipeSteps,
  listRecipeVersions,
} from "@/app/lib/manifest-client.generated";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Separator } from "@repo/design-system/components/ui/separator";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenantIdForOrg } from "../../../../lib/tenant";
import { Header } from "../../../components/header";
import { cleanupImportedItems } from "./server-actions";

interface CleanupCandidate {
  category: string | null;
  dish_count: number;
  id: string;
  ingredient_count: number;
  name: string;
  step_count: number;
  tags: string[] | null;
}

interface Classification {
  action: "inventory" | "ingredient" | "skip";
  category: string;
}

const SUPPLY_KEYWORDS = [
  "chafing",
  "chafer",
  "sterno",
  "serveware",
  "servingware",
  "plate",
  "utensil",
  "fork",
  "spoon",
  "knife",
  "napkin",
  "plasticware",
  "disposable",
  "tray",
  "pan",
  "lid",
  "container",
  "place setting",
  "cutlery",
  "tongs",
];

const BEVERAGE_KEYWORDS = [
  "water",
  "iced tea",
  "tea",
  "lemonade",
  "coffee",
  "juice",
  "soda",
  "beverage",
  "drink",
];

const INGREDIENT_KEYWORDS = [
  "cheese",
  "lettuce",
  "tortilla",
  "rice",
  "beans",
  "salsa",
  "cream",
  "butter",
  "onion",
  "pickles",
  "tomato",
  "cilantro",
  "lime",
  "garlic",
  "pepper",
  "salt",
];

const normalize = (value: string) =>
  value
    .replace(/\uFEFF/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const classifyCandidate = (name: string): Classification => {
  const normalized = normalize(name);

  if (SUPPLY_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return { action: "inventory", category: "serveware" };
  }

  const isBeverage = BEVERAGE_KEYWORDS.some((keyword) =>
    normalized.includes(keyword)
  );
  if (isBeverage) {
    const isPackaged =
      normalized.includes("bottle") || normalized.includes("bottled");
    return {
      action: isPackaged ? "inventory" : "skip",
      category: "beverage",
    };
  }

  if (INGREDIENT_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return { action: "ingredient", category: "ingredient" };
  }

  return { action: "skip", category: "menu" };
};

const CleanupImportsPage = async () => {
  const { orgId } = await auth();
  if (!orgId) {
    notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);

  const [recipes, recipeVersions, recipeIngredients, recipeSteps, dishes] =
    await Promise.all([
      (await listRecipes()).data.filter(
        (recipe) => recipe.tenantId === tenantId && !recipe.deletedAt
      ),
      (await listRecipeVersions()).data.filter(
        (version) => version.tenantId === tenantId && !version.deletedAt
      ),
      (await listRecipeIngredients()).data.filter(
        (ingredient) => ingredient.tenantId === tenantId && !ingredient.deletedAt
      ),
      (await listRecipeSteps()).data.filter(
        (step) => step.tenantId === tenantId && !step.deletedAt
      ),
      (await listDishes()).data.filter(
        (dish) => dish.tenantId === tenantId && !dish.deletedAt
      ),
    ]);
  const recipeIdByVersionId = new Map<string, string>();
  for (const version of recipeVersions) {
    recipeIdByVersionId.set(version.id, version.recipeId);
  }
  const ingredientCountByRecipeId = new Map<string, number>();
  for (const ingredient of recipeIngredients) {
    const recipeId = recipeIdByVersionId.get(ingredient.recipeVersionId);
    if (!recipeId) {
      continue;
    }
    ingredientCountByRecipeId.set(
      recipeId,
      (ingredientCountByRecipeId.get(recipeId) ?? 0) + 1
    );
  }
  const stepCountByRecipeId = new Map<string, number>();
  for (const step of recipeSteps) {
    const recipeId = recipeIdByVersionId.get(step.recipeVersionId);
    if (!recipeId) {
      continue;
    }
    stepCountByRecipeId.set(recipeId, (stepCountByRecipeId.get(recipeId) ?? 0) + 1);
  }
  const dishCountByRecipeId = new Map<string, number>();
  for (const dish of dishes) {
    dishCountByRecipeId.set(
      dish.recipeId,
      (dishCountByRecipeId.get(dish.recipeId) ?? 0) + 1
    );
  }
  const candidates: CleanupCandidate[] = recipes.map((recipe) => ({
    id: recipe.id,
    name: recipe.name,
    category: recipe.category ?? null,
    tags: Array.isArray(recipe.tags) ? (recipe.tags as string[]) : null,
    ingredient_count: ingredientCountByRecipeId.get(recipe.id) ?? 0,
    step_count: stepCountByRecipeId.get(recipe.id) ?? 0,
    dish_count: dishCountByRecipeId.get(recipe.id) ?? 0,
  }));

  const rows = candidates
    .filter((candidate) => candidate.ingredient_count === 0)
    .filter((candidate) => candidate.step_count === 0)
    .map((candidate) => ({
      ...candidate,
      classification: classifyCandidate(candidate.name),
    }))
    .filter((candidate) => candidate.classification.action !== "skip");

  return (
    <>
      <Header page="Cleanup Imports" pages={["Kitchen Ops", "Recipes"]}>
        <Button asChild variant="ghost">
          <Link href="/kitchen/recipes">Back to recipes</Link>
        </Button>
      </Header>
      <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
        {/* Page Header */}
        <div className="space-y-0.5">
          <h1 className="font-semibold text-2xl tracking-tight">
            Cleanup Imports
          </h1>
          <p className="text-muted-foreground">
            Review and process imported recipe items that have no ingredients or
            steps
          </p>
        </div>

        <Separator />

        {/* Cleanup Candidates Section */}
        <section className="space-y-4">
          <h2 className="font-medium text-muted-foreground text-sm">
            Cleanup Candidates {rows.length > 0 && `(${rows.length})`}
          </h2>
          <Card>
            <CardHeader>
              <CardTitle>Imported item cleanup</CardTitle>
              <p className="text-muted-foreground text-sm">
                These items have no ingredients or steps. Cleanup will move
                supplies to warehouse inventory and convert ingredient-like
                entries to kitchen ingredients.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {rows.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No cleanup candidates found.
                </p>
              ) : (
                <form action={cleanupImportedItems} className="space-y-4">
                  <div className="grid gap-3">
                    {rows.map((row) => (
                      <label
                        className="flex flex-col gap-1 rounded-md border px-4 py-3 text-sm"
                        key={row.id}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="font-medium">{row.name}</div>
                          <span className="text-muted-foreground text-xs">
                            {row.classification.action === "inventory"
                              ? "Move to inventory"
                              : "Convert to ingredient"}
                          </span>
                        </div>
                        <div className="text-muted-foreground text-xs">
                          Linked dishes: {row.dish_count}
                        </div>
                        <input
                          defaultChecked
                          name="recipeIds"
                          type="checkbox"
                          value={row.id}
                        />
                      </label>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button type="submit">Run cleanup</Button>
                    <Button asChild type="button" variant="outline">
                      <Link href="/kitchen/recipes">Cancel</Link>
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </>
  );
};

export default CleanupImportsPage;
