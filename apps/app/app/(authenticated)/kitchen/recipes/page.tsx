import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { AspectRatio } from "@repo/design-system/components/ui/aspect-ratio";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/design-system/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/design-system/components/ui/empty";
import { Separator } from "@repo/design-system/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import {
  CalculatorIcon,
  CheckCircleIcon,
  ChefHatIcon,
  Clock,
  DollarSignIcon,
  PackageIcon,
  SettingsIcon,
  TrendingUpIcon,
  UtensilsIcon,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DietaryBadges } from "@/components/dietary-badges";
import { getTenantIdForOrg } from "../../../lib/tenant";
import { Header } from "../../components/header";
import { updateRecipeImage } from "./actions";
import { DifficultyRating } from "./components/difficulty-stars";
import { MenuCard } from "./components/menu-card";
import { getMenus } from "./menus/actions";
import { RecipeEditButton } from "./recipe-edit-button";
import { RecipeFavoriteButton } from "./recipe-favorite-button";
import { RecipeImagePlaceholder } from "./recipe-image-placeholder";
import { RecipesPageClient } from "./recipes-page-client";
import RecipesRealtime from "./recipes-realtime";
import { RecipesToolbar } from "./recipes-toolbar";
import {
  getCostingSummaryStats,
  getVendorRecipeCostSummary,
  type VendorRecipeCostSummary,
  type CostingSummaryStats,
} from "./costing-actions";

interface RecipeRow {
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
  ingredient_count: number;
  dish_count: number;
  image_url: string | null;
}

interface DishRow {
  id: string;
  name: string;
  category: string | null;
  recipe_name: string | null;
  dietary_tags: string[] | null;
  price_per_person: number | null;
  cost_per_person: number | null;
  presentation_image_url: string | null;
  prep_task_count: number;
  event_count: number;
  is_active: boolean;
}

interface IngredientRow {
  id: string;
  name: string;
  category: string | null;
  allergens: string[] | null;
  unit_code: string | null;
  is_active: boolean;
}

interface RecipesPageProps {
  searchParams?: Promise<{
    tab?: string;
    q?: string;
    category?: string;
    dietary?: string;
    status?: string;
  }>;
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const formatMinutes = (minutes?: number | null) =>
  minutes && minutes > 0 ? `${minutes}m` : "-";

const formatPercent = (value: number | null) =>
  value === null ? "-" : `${Math.round(value)}%`;

const buildConditions = (base: Prisma.Sql[], extra: Prisma.Sql[]) => {
  const conditions = [...base, ...extra].filter(Boolean);
  return Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`;
};

const parseSearchParams = async (
  searchParams?: RecipesPageProps["searchParams"]
) => {
  const params = searchParams ? await searchParams : {};
  const activeTab = params.tab ?? "recipes";
  const query = params.q?.trim();
  const category = params.category?.trim();
  const dietary = params.dietary?.trim();
  const status = params.status?.trim();
  const queryPattern = query ? `%${query}%` : null;
  const categoryLower = category ? category.toLowerCase() : null;
  return {
    activeTab,
    query,
    category,
    dietary,
    status,
    queryPattern,
    categoryLower,
  };
};

const getStatusCondition = (status: string | undefined, column: Prisma.Sql) => {
  if (status === "active") {
    return Prisma.sql`${column} = true`;
  }
  if (status === "inactive") {
    return Prisma.sql`${column} = false`;
  }
  return Prisma.sql`TRUE`;
};

const getDietaryCondition = (
  dietary: string | undefined,
  column: Prisma.Sql
) => {
  if (!dietary) {
    return Prisma.sql`TRUE`;
  }
  return Prisma.sql`${column} @> ARRAY[${dietary}]::text[]`;
};

const KitchenRecipesPage = async ({ searchParams }: RecipesPageProps) => {
  const {
    activeTab,
    query,
    category,
    dietary,
    status,
    queryPattern,
    categoryLower,
  } = await parseSearchParams(searchParams);

  const { orgId, userId } = await auth();

  if (!orgId) {
    notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);

  const [recipeTotals] = await database.$queryRaw<{ count: number }[]>(
    Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM tenant_kitchen.recipes
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
    `
  );

  const [dishTotals] = await database.$queryRaw<{ count: number }[]>(
    Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM tenant_kitchen.dishes
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
    `
  );

  const [ingredientTotals] = await database.$queryRaw<{ count: number }[]>(
    Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM tenant_kitchen.ingredients
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
    `
  );

  const [menuTotals] = await database.$queryRaw<{ count: number }[]>(
    Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM tenant_kitchen.menus
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
    `
  );

  const recipeConditions = buildConditions(
    [Prisma.sql`r.tenant_id = ${tenantId}`, Prisma.sql`r.deleted_at IS NULL`],
    [
      queryPattern
        ? Prisma.sql`r.name ILIKE ${queryPattern}`
        : Prisma.sql`TRUE`,
      categoryLower
        ? Prisma.sql`lower(r.category) = ${categoryLower}`
        : Prisma.sql`TRUE`,
      getDietaryCondition(dietary, Prisma.sql`r.tags`),
      getStatusCondition(status, Prisma.sql`r.is_active`),
    ]
  );

  const dishConditions = buildConditions(
    [Prisma.sql`d.tenant_id = ${tenantId}`, Prisma.sql`d.deleted_at IS NULL`],
    [
      queryPattern
        ? Prisma.sql`d.name ILIKE ${queryPattern}`
        : Prisma.sql`TRUE`,
      categoryLower
        ? Prisma.sql`lower(d.category) = ${categoryLower}`
        : Prisma.sql`TRUE`,
      getDietaryCondition(dietary, Prisma.sql`d.dietary_tags`),
      getStatusCondition(status, Prisma.sql`d.is_active`),
    ]
  );

  const ingredientConditions = buildConditions(
    [Prisma.sql`i.tenant_id = ${tenantId}`, Prisma.sql`i.deleted_at IS NULL`],
    [
      queryPattern
        ? Prisma.sql`i.name ILIKE ${queryPattern}`
        : Prisma.sql`TRUE`,
      categoryLower
        ? Prisma.sql`lower(i.category) = ${categoryLower}`
        : Prisma.sql`TRUE`,
      getDietaryCondition(dietary, Prisma.sql`i.allergens`),
      getStatusCondition(status, Prisma.sql`i.is_active`),
    ]
  );

  const showRecipes = activeTab === "recipes";
  const showDishes = activeTab === "dishes" || activeTab === "costing";
  const showIngredients = activeTab === "ingredients";
  const showMenus = activeTab === "menus";

  const recipes = showRecipes
    ? await database.$queryRaw<RecipeRow[]>(
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
            COALESCE(ingredients.count, 0) AS ingredient_count,
            COALESCE(dishes.count, 0) AS dish_count,
            image.image_url
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
          LEFT JOIN LATERAL (
            SELECT COUNT(*)::int AS count
            FROM tenant_kitchen.recipe_ingredients ri
            WHERE ri.tenant_id = r.tenant_id
              AND ri.recipe_version_id = rv.id
              AND ri.deleted_at IS NULL
          ) ingredients ON true
          LEFT JOIN LATERAL (
            SELECT COUNT(*)::int AS count
            FROM tenant_kitchen.dishes d
            WHERE d.tenant_id = r.tenant_id
              AND d.recipe_id = r.id
              AND d.deleted_at IS NULL
          ) dishes ON true
          LEFT JOIN LATERAL (
            SELECT image_url
            FROM tenant_kitchen.recipe_steps rs
            WHERE rs.tenant_id = r.tenant_id
              AND rs.recipe_version_id = rv.id
              AND rs.deleted_at IS NULL
              AND rs.image_url IS NOT NULL
            ORDER BY rs.step_number ASC
            LIMIT 1
          ) image ON true
          ${recipeConditions}
          ORDER BY r.name ASC
        `
      )
    : [];

  const dishes = showDishes
    ? await database.$queryRaw<DishRow[]>(
        Prisma.sql`
          SELECT
            d.id,
            d.name,
            d.category,
            d.dietary_tags,
            d.price_per_person,
            d.cost_per_person,
            d.presentation_image_url,
            d.is_active,
            r.name AS recipe_name,
            COALESCE(prep_tasks.count, 0) AS prep_task_count,
            COALESCE(event_dishes.count, 0) AS event_count
          FROM tenant_kitchen.dishes d
          LEFT JOIN tenant_kitchen.recipes r
            ON r.tenant_id = d.tenant_id
            AND r.id = d.recipe_id
          LEFT JOIN LATERAL (
            SELECT COUNT(*)::int AS count
            FROM tenant_kitchen.prep_tasks pt
            WHERE pt.tenant_id = d.tenant_id
              AND pt.dish_id = d.id
              AND pt.deleted_at IS NULL
          ) prep_tasks ON true
          LEFT JOIN LATERAL (
            SELECT COUNT(*)::int AS count
            FROM tenant_events.event_dishes ed
            WHERE ed.tenant_id = d.tenant_id
              AND ed.dish_id = d.id
              AND ed.deleted_at IS NULL
          ) event_dishes ON true
          ${dishConditions}
          ORDER BY d.name ASC
        `
      )
    : [];

  const ingredients = showIngredients
    ? await database.$queryRaw<IngredientRow[]>(
        Prisma.sql`
          SELECT
            i.id,
            i.name,
            i.category,
            i.allergens,
            i.is_active,
            u.code AS unit_code
          FROM tenant_kitchen.ingredients i
          LEFT JOIN core.units u ON u.id = i.default_unit_id
          ${ingredientConditions}
          ORDER BY i.name ASC
        `
      )
    : [];

  const menus = showMenus ? await getMenus() : [];

  // Fetch costing data for the costing tab
  const [costingStatsResult, costingSummaryResult] = await Promise.all([
    showDishes ? getCostingSummaryStats() : null,
    showDishes ? getVendorRecipeCostSummary() : null,
  ]);

  const costingStats = costingStatsResult?.data;
  const costingSummary = costingSummaryResult?.data ?? [];

  const tabs = [
    { value: "recipes", label: "Recipes", count: recipeTotals?.count ?? 0 },
    { value: "dishes", label: "Dishes", count: dishTotals?.count ?? 0 },
    { value: "menus", label: "Menus", count: menuTotals?.count ?? 0 },
    {
      value: "ingredients",
      label: "Ingredients",
      count: ingredientTotals?.count ?? 0,
    },
    { value: "costing", label: "Costing Analysis" },
  ];

  const primaryAction = (() => {
    if (activeTab === "recipes") {
      return { label: "Add Recipe", href: "/kitchen/recipes/new" };
    }
    if (activeTab === "dishes") {
      return { label: "Add Dish", href: "/kitchen/recipes/dishes/new" };
    }
    if (activeTab === "menus") {
      return { label: "Add Menu", href: "/kitchen/recipes/menus/new" };
    }
    if (activeTab === "ingredients") {
      return {
        label: "Add Ingredient",
        href: "/kitchen/recipes/ingredients/new",
      };
    }
    return;
  })();

  const getDishMargin = (dish: DishRow) => {
    if (!(dish.price_per_person && dish.cost_per_person)) {
      return null;
    }
    return (
      ((dish.price_per_person - dish.cost_per_person) / dish.price_per_person) *
      100
    );
  };

  return (
    <>
      <Header page="Recipes & Menus" pages={["Kitchen Ops"]}>
        <div className="flex items-center gap-2 px-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild id="recipes-settings-trigger">
              <Button size="icon" variant="ghost">
                <SettingsIcon className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/kitchen/recipes/cleanup">Cleanup imports</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/search">Global search</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Header>
      <Separator />
      <RecipesRealtime tenantId={tenantId} userId={userId} />
      {activeTab === "recipes" && <RecipesPageClient />}
      <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
        <div className="rounded-3xl border bg-card/80 p-4 shadow-sm">
          <RecipesToolbar
            activeTab={activeTab}
            initialCategory={category}
            initialDietary={dietary}
            initialQuery={query}
            initialStatus={status}
            primaryAction={primaryAction}
            tabs={tabs}
          />
        </div>

        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-6 w-1 rounded-full bg-primary" />
            <h2 className="font-semibold text-base text-foreground">
              {activeTab === "recipes" && "Recipe Collection"}
              {activeTab === "dishes" && "Dish Library"}
              {activeTab === "ingredients" && "Ingredient Library"}
              {activeTab === "menus" && "Menu Collection"}
              {activeTab === "costing" && "Costing Analysis"}
            </h2>
            <span className="text-xs text-muted-foreground">
              {activeTab === "recipes" && `${recipeTotals?.count ?? 0} recipes`}
              {activeTab === "dishes" && `${dishTotals?.count ?? 0} dishes`}
              {activeTab === "ingredients" && `${ingredientTotals?.count ?? 0} ingredients`}
              {activeTab === "menus" && `${menuTotals?.count ?? 0} menus`}
            </span>
          </div>
          <div className="rounded-2xl border border-border/50 bg-card/50 p-5">
            {activeTab === "recipes" && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {recipes.length === 0 ? (
                  <Empty className="bg-card/50">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <ChefHatIcon />
                      </EmptyMedia>
                      <EmptyTitle>Create your first recipe</EmptyTitle>
                      <EmptyDescription>
                        Start building your recipe collection. Recipes can be
                        reused across multiple dishes, prep lists, and events to
                        streamline your kitchen operations.
                      </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                      <Button asChild>
                        <Link href="/kitchen/recipes/new">
                          Create New Recipe
                        </Link>
                      </Button>
                    </EmptyContent>
                  </Empty>
                ) : (
                  recipes.map((recipe) => {
                    const categoryColors: Record<string, string> = {
                      "appetizer": "border-l-amber-500",
                      "main course": "border-l-emerald-600",
                      "main": "border-l-emerald-600",
                      "dessert": "border-l-rose-400",
                      "side": "border-l-sky-400",
                      "beverage": "border-l-violet-400",
                    };
                    const borderColor = recipe.category
                      ? categoryColors[recipe.category.toLowerCase()] || "border-l-primary"
                      : "border-l-primary";

                    return (
                    <Card
                      className={`group overflow-hidden border-l-4 ${borderColor} shadow-sm transition-all duration-200 hover:translate-y-[-2px] hover:shadow-lg hover:border-l-[6px]`}
                      data-testid="recipe-card"
                      key={recipe.id}
                    >
                      <Link href={`/kitchen/recipes/${recipe.id}`}>
                        {recipe.image_url ? (
                          <AspectRatio
                            className="relative w-full bg-muted"
                            ratio={16 / 9}
                          >
                            <img
                              alt={recipe.name}
                              className="h-full w-full object-cover"
                              height={240}
                              src={recipe.image_url}
                              width={426}
                            />
                            <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 via-transparent to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
                              <RecipeEditButton
                                recipeId={recipe.id}
                                recipeName={recipe.name}
                              />
                            </div>
                            <RecipeFavoriteButton recipeName={recipe.name} />
                          </AspectRatio>
                        ) : (
                          <div className="relative flex h-16 items-center justify-between bg-gradient-to-r from-primary/5 to-secondary/10 px-4">
                            <ChefHatIcon className="h-8 w-8 text-primary/30" />
                            <RecipeFavoriteButton recipeName={recipe.name} />
                          </div>
                        )}
                      </Link>
                      <CardHeader className="space-y-3 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="font-semibold text-base leading-tight line-clamp-2">
                            {recipe.name}
                          </CardTitle>
                          <RecipeEditButton
                            recipeId={recipe.id}
                            recipeName={recipe.name}
                          />
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {recipe.category ? (
                            <Badge className="bg-primary/10 text-primary border-0 text-xs font-medium">{recipe.category}</Badge>
                          ) : null}
                          {recipe.prep_time_minutes ? (
                            <Badge variant="outline" className="gap-1 text-xs">
                              <Clock className="h-3 w-3" />
                              {formatMinutes(recipe.prep_time_minutes)}
                            </Badge>
                          ) : null}
                          {recipe.cook_time_minutes ? (
                            <Badge variant="outline" className="gap-1 text-xs">
                              <UtensilsIcon className="h-3 w-3" />
                              {formatMinutes(recipe.cook_time_minutes)}
                            </Badge>
                          ) : null}
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{recipe.ingredient_count} ingredients</span>
                          {recipe.dish_count > 0 && (
                            <span className="text-primary font-medium">{recipe.dish_count} dish{recipe.dish_count > 1 ? "es" : ""}</span>
                          )}
                        </div>
                        {recipe.tags && recipe.tags.length > 0 && (
                          <DietaryBadges
                            compact
                            size="sm"
                            tags={recipe.tags}
                          />
                        )}
                      </CardHeader>
                    </Card>
                  );})
                )}
              </div>
            )}

            {activeTab === "dishes" && (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {dishes.length === 0 ? (
                  <Empty className="bg-card/50">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <UtensilsIcon />
                      </EmptyMedia>
                      <EmptyTitle>Build your first dish</EmptyTitle>
                      <EmptyDescription>
                        Transform recipes into marketable dishes with pricing,
                        dietary information, and presentation details. Dishes
                        are what clients see on menus and what gets scheduled
                        for events.
                      </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                      <Button asChild>
                        <Link href="/kitchen/recipes/dishes/new">
                          Create New Dish
                        </Link>
                      </Button>
                    </EmptyContent>
                  </Empty>
                ) : (
                  dishes.map((dish) => {
                    const margin = getDishMargin(dish);
                    const marginColor = margin !== null
                      ? margin >= 60 ? "text-emerald-600" : margin >= 40 ? "text-amber-600" : "text-red-500"
                      : "text-muted-foreground";
                    return (
                      <Card className="group overflow-hidden border-l-4 border-l-secondary shadow-sm transition-all duration-200 hover:translate-y-[-2px] hover:shadow-lg" key={dish.id}>
                        {dish.presentation_image_url ? (
                          <div className="relative h-32 w-full bg-muted">
                            <img
                              alt={dish.name}
                              className="h-full w-full object-cover"
                              src={dish.presentation_image_url}
                            />
                          </div>
                        ) : (
                          <div className="flex h-14 items-center gap-3 bg-gradient-to-r from-secondary/10 to-primary/5 px-4">
                            <UtensilsIcon className="h-6 w-6 text-secondary/50" />
                            {dish.category ? (
                              <Badge className="bg-secondary/20 text-secondary-foreground border-0 text-xs">{dish.category}</Badge>
                            ) : null}
                          </div>
                        )}
                        <div className="px-4 pt-2">
                          {dish.dietary_tags && dish.dietary_tags.length > 0 && (
                            <DietaryBadges
                              compact
                              size="sm"
                              tags={dish.dietary_tags}
                            />
                          )}
                        </div>
                        <CardHeader className="space-y-1.5 p-4 pt-3">
                          <CardTitle className="font-semibold text-base leading-tight line-clamp-2">
                            {dish.name}
                          </CardTitle>
                          <div className="text-muted-foreground text-xs">
                            Recipe: {dish.recipe_name ?? <span className="italic">Unlinked</span>}
                          </div>
                        </CardHeader>
                        <CardContent className="grid grid-cols-3 gap-3 p-4 pt-0 text-sm">
                          <div>
                            <div className="text-muted-foreground text-xs">
                              Food cost
                            </div>
                            <div className="font-semibold">
                              {dish.cost_per_person
                                ? currencyFormatter.format(dish.cost_per_person)
                                : "-"}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground text-xs">
                              Menu price
                            </div>
                            <div className="font-semibold">
                              {dish.price_per_person
                                ? currencyFormatter.format(
                                    dish.price_per_person
                                  )
                                : "-"}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground text-xs">Margin</div>
                            <div className={`font-bold ${marginColor}`}>
                              {formatPercent(margin)}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Events</div>
                            <div className="font-semibold">
                              {dish.event_count}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">
                              Prep tasks
                            </div>
                            <div className="font-semibold">
                              {dish.prep_task_count}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Status</div>
                            <div className="flex items-center gap-1 font-semibold">
                              <CheckCircleIcon className="size-4 text-emerald-500" />
                              {dish.is_active ? "Active" : "Paused"}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            )}

            {activeTab === "ingredients" && (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {ingredients.length === 0 ? (
                  <Empty className="bg-card/50">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <PackageIcon />
                      </EmptyMedia>
                      <EmptyTitle>Add your ingredients</EmptyTitle>
                      <EmptyDescription>
                        Build your ingredient library with units, categories,
                        and allergen information. This ensures accurate recipe
                        scaling and helps with dietary restrictions and cost
                        calculations.
                      </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                      <Button asChild>
                        <Link href="/kitchen/recipes/ingredients/new">
                          Add Ingredient
                        </Link>
                      </Button>
                    </EmptyContent>
                  </Empty>
                ) : (
                  ingredients.map((ingredient) => (
                    <Card className="shadow-sm" key={ingredient.id}>
                      <CardHeader className="space-y-2">
                        <CardTitle className="font-semibold text-lg">
                          {ingredient.name}
                        </CardTitle>
                        <div className="flex flex-wrap gap-2">
                          {ingredient.category ? (
                            <Badge variant="secondary">
                              {ingredient.category.toUpperCase()}
                            </Badge>
                          ) : null}
                          {(ingredient.allergens ?? [])
                            .slice(0, 2)
                            .map((allergen) => (
                              <Badge key={allergen} variant="outline">
                                {allergen.toUpperCase()}
                              </Badge>
                            ))}
                        </div>
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="text-muted-foreground">
                            Default unit
                          </div>
                          <div className="font-semibold">
                            {ingredient.unit_code ?? "-"}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Status</div>
                          <div className="font-semibold">
                            {ingredient.is_active ? "Active" : "Paused"}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}

            {activeTab === "menus" && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {menus.length === 0 ? (
                  <Empty className="bg-card/50">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <UtensilsIcon />
                      </EmptyMedia>
                      <EmptyTitle>Create your first menu</EmptyTitle>
                      <EmptyDescription>
                        Build curated menu collections that group dishes
                        together for events. Each menu can include pricing
                        tiers, dietary breakdowns, and be customized for
                        different client needs.
                      </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                      <Button asChild>
                        <Link href="/kitchen/recipes/menus/new">
                          Create New Menu
                        </Link>
                      </Button>
                    </EmptyContent>
                  </Empty>
                ) : (
                  menus.map((menu) => (
                    <MenuCard
                      basePrice={menu.basePrice}
                      category={menu.category}
                      description={menu.description}
                      dishCount={menu.dishCount}
                      id={menu.id}
                      isActive={menu.isActive}
                      key={menu.id}
                      maxGuests={menu.maxGuests}
                      minGuests={menu.minGuests}
                      name={menu.name}
                      pricePerPerson={menu.pricePerPerson}
                    />
                  ))
                )}
              </div>
            )}

            {activeTab === "costing" && (
              <div className="space-y-6">
                {/* Summary Stat Cards - always show, with zeroes if no data */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Avg Food Cost
                      </CardTitle>
                      <CalculatorIcon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {costingStats ? formatPercent(costingStats.avgFoodCostPercent) : "-"}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Target: &lt;35%
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Total Recipe Value
                      </CardTitle>
                      <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {costingStats
                          ? currencyFormatter.format(costingStats.totalRecipeValue)
                          : currencyFormatter.format(0)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {costingStats?.recipesWithCostData ?? 0} of{" "}
                        {costingStats?.totalRecipes ?? dishes.length} recipes
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Highest Margin
                      </CardTitle>
                      <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-emerald-600">
                        {costingStats?.highestMarginDish
                          ? formatPercent(costingStats.highestMarginDish.margin)
                          : "-"}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {costingStats?.highestMarginDish?.name ?? "-"}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Cost Alerts
                      </CardTitle>
                      <Badge
                        variant={
                          (costingStats?.highFoodCostAlerts ?? 0) > 0
                            ? "destructive"
                            : "default"
                        }
                        className="h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs"
                      >
                        {costingStats?.highFoodCostAlerts ?? 0}
                      </Badge>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {(costingStats?.highFoodCostAlerts ?? 0) > 0
                          ? "Action Needed"
                          : "All Good"}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {costingStats?.highFoodCostAlerts ?? 0} recipes over
                        35% threshold
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Recipe Cost Analysis Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recipe Cost Analysis</CardTitle>
                    <CardDescription>
                      Compare recipe costs, margins, and identify high food
                      cost items
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {costingSummary.length === 0 ? (
                      <div className="py-8 text-center text-muted-foreground">
                        <DollarSignIcon className="mx-auto mb-4 h-12 w-12 opacity-50" />
                        <p className="text-lg font-medium">No vendor cost data available</p>
                        <p className="text-sm">
                          Add vendor pricing to ingredients to see recipe cost analysis.
                        </p>
                      </div>
                    ) : (
                      <>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Recipe</TableHead>
                              <TableHead className="text-right">
                                Cost/Yield
                              </TableHead>
                              <TableHead className="text-right">
                                Menu Price
                              </TableHead>
                              <TableHead className="text-right">
                                Food Cost %
                              </TableHead>
                              <TableHead className="text-right">
                                Margin
                              </TableHead>
                              <TableHead>Ingredients</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead />
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {costingSummary.map((recipe) => {
                              const foodCostPercent = recipe.foodCostPercent;
                              const margin = recipe.margin;
                              const isHighFoodCost =
                                foodCostPercent !== null &&
                                foodCostPercent > 35;

                              return (
                                <TableRow key={recipe.recipeId}>
                                  <TableCell>
                                    <div>
                                      <div className="font-medium">
                                        {recipe.recipeName}
                                      </div>
                                      <div className="text-muted-foreground text-xs">
                                        Yield: {recipe.yieldQuantity}{" "}
                                        {recipe.yieldUnit ?? "units"}
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {currencyFormatter.format(recipe.costPerYield)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {recipe.menuPrice
                                      ? currencyFormatter.format(
                                          recipe.menuPrice
                                        )
                                      : "-"}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <span
                                        className={
                                          isHighFoodCost
                                            ? "text-red-600 font-semibold"
                                            : ""
                                        }
                                      >
                                        {formatPercent(foodCostPercent)}
                                      </span>
                                      {isHighFoodCost && (
                                        <Badge
                                          variant="destructive"
                                          className="text-xs"
                                        >
                                          Alert
                                        </Badge>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <span
                                      className={
                                        margin !== null && margin > 50
                                          ? "text-emerald-600 font-semibold"
                                          : margin !== null && margin < 30
                                            ? "text-amber-600 font-semibold"
                                            : ""
                                      }
                                    >
                                      {formatPercent(margin)}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {recipe.ingredientCount}
                                  </TableCell>
                                  <TableCell>
                                    {recipe.lastCalculated ? (
                                      <Badge
                                        variant="outline"
                                        className="bg-green-50 text-green-700 border-green-200"
                                      >
                                        Calculated
                                      </Badge>
                                    ) : (
                                      <Badge variant="secondary">
                                        Pending
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      asChild
                                      size="sm"
                                      variant="ghost"
                                    >
                                      <Link
                                        href={`/kitchen/recipes/${recipe.recipeId}`}
                                      >
                                        View
                                      </Link>
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>

                        {/* Lowest Margin Alert */}
                        {costingStats?.lowestMarginDish &&
                          costingStats.lowestMarginDish.margin < 30 && (
                            <Card className="mt-4 border-amber-200 bg-amber-50 dark:bg-amber-950">
                              <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                  <Badge
                                    variant="outline"
                                    className="bg-amber-100 text-amber-800 border-amber-300"
                                  >
                                    Low Margin Alert
                                  </Badge>
                                  {costingStats.lowestMarginDish.name}
                                </CardTitle>
                                <CardDescription>
                                  This recipe has a margin of{" "}
                                  {formatPercent(
                                    costingStats.lowestMarginDish.margin
                                  )}
                                  . Consider reviewing ingredient costs or
                                  adjusting menu price.
                                </CardDescription>
                              </CardHeader>
                            </Card>
                          )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
};

export default KitchenRecipesPage;
