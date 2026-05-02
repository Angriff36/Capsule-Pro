import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
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
import { SingleDeleteButton } from "./components/bulk-actions-bar";
import {
  InlineDishName,
  InlineDishPrice,
  InlineRecipeName,
} from "./components/inline-recipe-fields";
import { MenuCard } from "./components/menu-card";
import { ItemCheckbox, SelectableList } from "./components/selectable-list";
import {
  getCostingSummaryStats,
  getVendorRecipeCostSummary,
} from "./costing-actions";
import { getMenus } from "./menus/actions";
import { RecipeEditButton } from "./recipe-edit-button";
import { RecipeFavoriteButton } from "./recipe-favorite-button";
import { RecipeQuickRename } from "./recipe-quick-rename";
import { RecipesPageClient } from "./recipes-page-client";
import RecipesRealtime from "./recipes-realtime";
import { RecipesToolbar } from "./recipes-toolbar";

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
      <div className="flex flex-1 flex-col gap-10 bg-white px-6 pt-8 pb-24 text-[#0d0d0d] sm:px-10 lg:px-12">
        <div className="rounded-[24px] border border-[rgba(0,0,0,0.05)] bg-white p-6 shadow-[rgba(0,0,0,0.03)_0px_2px_4px] sm:p-8">
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

        <section className="space-y-6">
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-[rgba(0,0,0,0.05)] pb-4">
            <div className="space-y-2">
              <p className="font-mono text-[12px] font-medium uppercase tracking-[0.6px] text-[#666666]">
                {activeTab === "recipes" && "Kitchen / Recipes"}
                {activeTab === "dishes" && "Kitchen / Dishes"}
                {activeTab === "ingredients" && "Kitchen / Ingredients"}
                {activeTab === "menus" && "Kitchen / Menus"}
                {activeTab === "costing" && "Kitchen / Costing"}
              </p>
              <h2 className="font-semibold text-[40px] leading-[1.1] tracking-[-0.8px] text-[#0d0d0d]">
                {activeTab === "recipes" && "Recipe Collection"}
                {activeTab === "dishes" && "Dish Library"}
                {activeTab === "ingredients" && "Ingredient Library"}
                {activeTab === "menus" && "Menu Collection"}
                {activeTab === "costing" && "Costing Analysis"}
              </h2>
            </div>
            <span className="inline-flex items-center rounded-full border border-[rgba(0,0,0,0.05)] bg-[#fafafa] px-3 py-1 font-mono text-[12px] font-medium uppercase tracking-[0.6px] text-[#333333]">
              {activeTab === "recipes" && `${recipeTotals?.count ?? 0} recipes`}
              {activeTab === "dishes" && `${dishTotals?.count ?? 0} dishes`}
              {activeTab === "ingredients" &&
                `${ingredientTotals?.count ?? 0} ingredients`}
              {activeTab === "menus" && `${menuTotals?.count ?? 0} menus`}
              {activeTab === "costing" && "Live margins"}
            </span>
          </div>
          <div className="rounded-[24px] border border-[rgba(0,0,0,0.05)] bg-white p-6 shadow-[rgba(0,0,0,0.03)_0px_2px_4px] sm:p-8">
            {activeTab === "recipes" && (
              <div className="space-y-3">
                {recipes.length === 0 ? (
                  <div className="flex flex-col items-center gap-5 rounded-[16px] border border-[rgba(0,0,0,0.05)] bg-[#fafafa] px-6 py-16 text-center">
                    <span className="inline-flex size-12 items-center justify-center rounded-full border border-[rgba(0,0,0,0.05)] bg-white text-[#0fa76e]">
                      <ChefHatIcon className="size-5" />
                    </span>
                    <div className="space-y-2">
                      <h3 className="font-semibold text-[24px] leading-[1.3] tracking-[-0.24px] text-[#0d0d0d]">
                        Create your first recipe
                      </h3>
                      <p className="mx-auto max-w-md text-[16px] leading-[1.5] text-[#666666]">
                        Start building your recipe collection. Recipes can be
                        reused across multiple dishes, prep lists, and events to
                        streamline your kitchen operations.
                      </p>
                    </div>
                    <Button
                      asChild
                      className="rounded-full bg-[#0d0d0d] px-6 py-2 text-[15px] font-medium text-white shadow-[rgba(0,0,0,0.06)_0px_1px_2px] hover:bg-[#0d0d0d]/90"
                    >
                      <Link href="/kitchen/recipes/new">Create new recipe</Link>
                    </Button>
                  </div>
                ) : (
                  <SelectableList
                    items={recipes.map((r) => ({ id: r.id, name: r.name }))}
                    type="recipes"
                  >
                    {recipes.map((recipe) => {
                      const categoryColors: Record<string, string> = {
                        appetizer: "bg-[#c37d0d]",
                        "main course": "bg-[#0fa76e]",
                        main: "bg-[#0fa76e]",
                        dessert: "bg-[#d45656]",
                        side: "bg-[#3772cf]",
                        beverage: "bg-[#888888]",
                      };
                      const accentColor = recipe.category
                        ? categoryColors[recipe.category.toLowerCase()] ||
                          "bg-[#18E299]"
                        : "bg-[#18E299]";

                      // Compact row layout for all recipes (Galley-style)
                      return (
                        <Link
                          className="group flex items-center gap-4 rounded-[16px] border border-[rgba(0,0,0,0.05)] bg-white p-4 shadow-[rgba(0,0,0,0.03)_0px_2px_4px] transition-all hover:border-[rgba(0,0,0,0.08)] hover:bg-[#fafafa]"
                          data-testid="recipe-card"
                          href={`/kitchen/recipes/${recipe.id}`}
                          key={recipe.id}
                        >
                          {/* Selection checkbox */}
                          <ItemCheckbox id={recipe.id} />

                          {/* Colored accent bar */}
                          <div
                            className={`h-10 w-1 rounded-full ${accentColor}`}
                          />

                          {/* Recipe name - primary info */}
                          <div className="min-w-0 flex-1">
                            <InlineRecipeName
                              name={recipe.name}
                              recipeId={recipe.id}
                            />
                            {recipe.description && (
                              <div className="truncate text-[14px] text-[#666666]">
                                {recipe.description}
                              </div>
                            )}
                          </div>

                          {/* Category badge */}
                          {recipe.category && (
                            <Badge className="shrink-0 rounded-full border-0 bg-[#d4fae8] px-3 py-1 font-mono text-[12px] font-medium uppercase tracking-[0.6px] text-[#0fa76e]">
                              {recipe.category}
                            </Badge>
                          )}

                          {/* Time info */}
                          <div className="flex shrink-0 items-center gap-3 font-mono text-[12px] uppercase tracking-[0.6px] text-[#666666]">
                            {recipe.prep_time_minutes ? (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatMinutes(recipe.prep_time_minutes)}
                              </span>
                            ) : null}
                            {recipe.cook_time_minutes ? (
                              <span className="flex items-center gap-1">
                                <UtensilsIcon className="h-3 w-3" />
                                {formatMinutes(recipe.cook_time_minutes)}
                              </span>
                            ) : null}
                          </div>

                          {/* Counts */}
                          <div className="flex shrink-0 items-center gap-4 text-[13px]">
                            <span className="text-[#666666]">
                              <span className="font-semibold text-[#0d0d0d]">
                                {recipe.ingredient_count}
                              </span>{" "}
                              ing
                            </span>
                            {recipe.dish_count > 0 && (
                              <span className="font-medium text-[#0fa76e]">
                                {recipe.dish_count} dish
                                {recipe.dish_count > 1 ? "es" : ""}
                              </span>
                            )}
                          </div>

                          {/* Dietary tags */}
                          {recipe.tags &&
                            recipe.tags.filter(
                              (t) => t.toLowerCase() !== "imported"
                            ).length > 0 && (
                              <DietaryBadges
                                compact
                                size="sm"
                                tags={recipe.tags.filter(
                                  (t) => t.toLowerCase() !== "imported"
                                )}
                              />
                            )}

                          {/* Actions */}
                          <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <RecipeQuickRename
                              recipeId={recipe.id}
                              recipeName={recipe.name}
                            />
                            <RecipeEditButton
                              recipeId={recipe.id}
                              recipeName={recipe.name}
                            />
                            <SingleDeleteButton
                              id={recipe.id}
                              name={recipe.name}
                              type="recipe"
                            />
                            <RecipeFavoriteButton recipeName={recipe.name} />
                          </div>
                        </Link>
                      );
                    })}
                  </SelectableList>
                )}
              </div>
            )}

            {activeTab === "dishes" && (
              <div className="space-y-2">
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
                  <SelectableList
                    items={dishes.map((d) => ({ id: d.id, name: d.name }))}
                    type="dishes"
                  >
                    {dishes.map((dish) => {
                      const margin = getDishMargin(dish);
                      // Use brand colors for margin indicators
                      const marginColor =
                        margin !== null
                          ? margin >= 60
                            ? "text-[var(--brand-leafy-green)]"
                            : margin >= 40
                              ? "text-[var(--brand-golden-zest)]"
                              : "text-[var(--brand-spiced-orange)]"
                          : "text-muted-foreground";
                      const marginBg =
                        margin !== null
                          ? margin >= 60
                            ? "bg-[var(--brand-leafy-green)]"
                            : margin >= 40
                              ? "bg-[var(--brand-golden-zest)]"
                              : "bg-[var(--brand-spiced-orange)]"
                          : "bg-muted-foreground";
                      return (
                        <Link
                          className="group flex items-center gap-3 p-3 border border-border/50 hover:border-border hover:bg-muted/30 transition-colors"
                          href={`/kitchen/recipes/dishes/${dish.id}`}
                          key={dish.id}
                        >
                          {/* Selection checkbox */}
                          <ItemCheckbox id={dish.id} />

                          {/* Margin indicator bar */}
                          <div className={`w-1 h-10 rounded-sm ${marginBg}`} />

                          {/* Dish name and recipe link */}
                          <div className="flex-1 min-w-0">
                            <InlineDishName dishId={dish.id} name={dish.name} />
                            <div className="text-xs text-muted-foreground">
                              {dish.recipe_name ?? (
                                <span className="italic">Unlinked</span>
                              )}
                            </div>
                          </div>

                          {/* Category badge */}
                          {dish.category && (
                            <Badge className="bg-[var(--brand-avocado-mash)]/20 text-[var(--brand-leafy-green)] border-0 text-xs font-medium shrink-0">
                              {dish.category}
                            </Badge>
                          )}

                          {/* Dietary tags */}
                          {dish.dietary_tags &&
                            dish.dietary_tags.length > 0 && (
                              <DietaryBadges
                                compact
                                size="sm"
                                tags={dish.dietary_tags}
                              />
                            )}

                          {/* Cost data - prominent with brand colors */}
                          <div className="flex items-center gap-4 text-xs shrink-0">
                            <div className="text-center">
                              <div className="text-muted-foreground text-[10px] uppercase">
                                Cost
                              </div>
                              <div className="font-semibold text-foreground">
                                {dish.cost_per_person
                                  ? currencyFormatter.format(
                                      dish.cost_per_person
                                    )
                                  : "-"}
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-muted-foreground text-[10px] uppercase">
                                Price
                              </div>
                              <InlineDishPrice
                                dishId={dish.id}
                                price={
                                  dish.price_per_person?.toString() ?? null
                                }
                              />
                            </div>
                            <div className="text-center min-w-[50px]">
                              <div className="text-muted-foreground text-[10px] uppercase">
                                Margin
                              </div>
                              <div className={`font-bold ${marginColor}`}>
                                {formatPercent(margin)}
                              </div>
                            </div>
                          </div>

                          {/* Event/prep counts */}
                          <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                            <span>{dish.event_count} events</span>
                            <span>{dish.prep_task_count} prep</span>
                          </div>

                          {/* Status */}
                          <div className="flex items-center gap-1 text-xs shrink-0">
                            <CheckCircleIcon
                              className={`size-3.5 ${dish.is_active ? "text-[var(--brand-leafy-green)]" : "text-muted-foreground"}`}
                            />
                            <span
                              className={
                                dish.is_active
                                  ? "text-[var(--brand-leafy-green)] font-medium"
                                  : "text-muted-foreground"
                              }
                            >
                              {dish.is_active ? "Active" : "Paused"}
                            </span>
                          </div>

                          {/* Delete */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <SingleDeleteButton
                              id={dish.id}
                              name={dish.name}
                              type="dish"
                            />
                          </div>
                        </Link>
                      );
                    })}
                  </SelectableList>
                )}
              </div>
            )}

            {activeTab === "ingredients" && (
              <div className="space-y-2">
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
                    <div
                      className="group flex items-center gap-3 p-3 border border-border/50 hover:border-border hover:bg-muted/30 transition-colors"
                      key={ingredient.id}
                    >
                      {/* Status indicator */}
                      <div
                        className={`w-1 h-10 rounded-sm ${ingredient.is_active ? "bg-[var(--brand-leafy-green)]" : "bg-muted-foreground/50"}`}
                      />

                      {/* Ingredient name */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-foreground truncate">
                          {ingredient.name}
                        </div>
                      </div>

                      {/* Category badge */}
                      {ingredient.category && (
                        <Badge className="bg-[var(--brand-avocado-mash)]/20 text-[var(--brand-leafy-green)] border-0 text-xs font-medium shrink-0">
                          {ingredient.category}
                        </Badge>
                      )}

                      {/* Allergens */}
                      {(ingredient.allergens ?? []).length > 0 && (
                        <div className="flex gap-1 shrink-0">
                          {(ingredient.allergens ?? [])
                            .slice(0, 3)
                            .map((allergen) => (
                              <Badge
                                className="text-xs border-[var(--brand-spiced-orange)]/50 text-[var(--brand-spiced-orange)]"
                                key={allergen}
                                variant="outline"
                              >
                                {allergen}
                              </Badge>
                            ))}
                        </div>
                      )}

                      {/* Unit */}
                      <div className="text-xs text-muted-foreground shrink-0">
                        <span className="text-[10px] uppercase">Unit:</span>{" "}
                        <span className="font-medium">
                          {ingredient.unit_code ?? "-"}
                        </span>
                      </div>

                      {/* Status */}
                      <div className="flex items-center gap-1 text-xs shrink-0">
                        <CheckCircleIcon
                          className={`size-3.5 ${ingredient.is_active ? "text-[var(--brand-leafy-green)]" : "text-muted-foreground"}`}
                        />
                        <span
                          className={
                            ingredient.is_active
                              ? "text-[var(--brand-leafy-green)] font-medium"
                              : "text-muted-foreground"
                          }
                        >
                          {ingredient.is_active ? "Active" : "Paused"}
                        </span>
                      </div>
                    </div>
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
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                  <div className="p-4 border border-border/50 bg-card">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium uppercase text-muted-foreground tracking-wide">
                        Avg Food Cost
                      </span>
                      <CalculatorIcon className="h-4 w-4 text-[var(--brand-golden-zest)]" />
                    </div>
                    <div className="text-2xl font-bold text-[var(--brand-golden-zest)]">
                      {costingStats
                        ? formatPercent(costingStats.avgFoodCostPercent)
                        : "-"}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Target: &lt;35%
                    </p>
                  </div>
                  <div className="p-4 border border-border/50 bg-card">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium uppercase text-muted-foreground tracking-wide">
                        Total Recipe Value
                      </span>
                      <DollarSignIcon className="h-4 w-4 text-[var(--brand-golden-zest)]" />
                    </div>
                    <div className="text-2xl font-bold text-[var(--brand-golden-zest)]">
                      {costingStats
                        ? currencyFormatter.format(
                            costingStats.totalRecipeValue
                          )
                        : currencyFormatter.format(0)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {costingStats?.recipesWithCostData ?? 0} of{" "}
                      {costingStats?.totalRecipes ?? dishes.length} recipes
                    </p>
                  </div>
                  <div className="p-4 border border-border/50 bg-card">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium uppercase text-muted-foreground tracking-wide">
                        Highest Margin
                      </span>
                      <TrendingUpIcon className="h-4 w-4 text-[var(--brand-leafy-green)]" />
                    </div>
                    <div className="text-2xl font-bold text-[var(--brand-leafy-green)]">
                      {costingStats?.highestMarginDish
                        ? formatPercent(costingStats.highestMarginDish.margin)
                        : "-"}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {costingStats?.highestMarginDish?.name ?? "-"}
                    </p>
                  </div>
                  <div className="p-4 border border-border/50 bg-card">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium uppercase text-muted-foreground tracking-wide">
                        Cost Alerts
                      </span>
                      <Badge
                        className={`h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs ${
                          (costingStats?.highFoodCostAlerts ?? 0) > 0
                            ? "bg-[var(--brand-spiced-orange)] text-white border-[var(--brand-spiced-orange)]"
                            : "bg-[var(--brand-leafy-green)] text-white border-[var(--brand-leafy-green)]"
                        }`}
                        variant="outline"
                      >
                        {costingStats?.highFoodCostAlerts ?? 0}
                      </Badge>
                    </div>
                    <div
                      className={`text-2xl font-bold ${
                        (costingStats?.highFoodCostAlerts ?? 0) > 0
                          ? "text-[var(--brand-spiced-orange)]"
                          : "text-[var(--brand-leafy-green)]"
                      }`}
                    >
                      {(costingStats?.highFoodCostAlerts ?? 0) > 0
                        ? "Action Needed"
                        : "All Good"}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {costingStats?.highFoodCostAlerts ?? 0} recipes over 35%
                      threshold
                    </p>
                  </div>
                </div>

                {/* Recipe Cost Analysis Table */}
                <div className="border border-border/50 bg-card">
                  <div className="p-4 border-b border-border/50">
                    <h3 className="font-semibold text-sm">
                      Recipe Cost Analysis
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Compare recipe costs, margins, and identify high food cost
                      items
                    </p>
                  </div>
                  <div className="p-4">
                    {costingSummary.length === 0 ? (
                      <div className="py-8 text-center text-muted-foreground">
                        <DollarSignIcon className="mx-auto mb-4 h-12 w-12 opacity-50" />
                        <p className="text-lg font-medium">
                          No vendor cost data available
                        </p>
                        <p className="text-sm">
                          Add vendor pricing to ingredients to see recipe cost
                          analysis.
                        </p>
                      </div>
                    ) : (
                      <>
                        <Table>
                          <TableHeader>
                            <TableRow className="border-b border-border/50 hover:bg-transparent">
                              <TableHead className="text-xs uppercase text-muted-foreground font-medium">
                                Recipe
                              </TableHead>
                              <TableHead className="text-right text-xs uppercase text-muted-foreground font-medium">
                                Cost/Yield
                              </TableHead>
                              <TableHead className="text-right text-xs uppercase text-muted-foreground font-medium">
                                Menu Price
                              </TableHead>
                              <TableHead className="text-right text-xs uppercase text-muted-foreground font-medium">
                                Food Cost %
                              </TableHead>
                              <TableHead className="text-right text-xs uppercase text-muted-foreground font-medium">
                                Margin
                              </TableHead>
                              <TableHead className="text-xs uppercase text-muted-foreground font-medium">
                                Ingredients
                              </TableHead>
                              <TableHead className="text-xs uppercase text-muted-foreground font-medium">
                                Status
                              </TableHead>
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
                                <TableRow
                                  className="border-b border-border/30"
                                  key={recipe.recipeId}
                                >
                                  <TableCell>
                                    <div>
                                      <div className="font-medium text-sm">
                                        {recipe.recipeName}
                                      </div>
                                      <div className="text-muted-foreground text-xs">
                                        Yield: {recipe.yieldQuantity}{" "}
                                        {recipe.yieldUnit ?? "units"}
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right font-medium text-[var(--brand-golden-zest)]">
                                    {currencyFormatter.format(
                                      recipe.costPerYield
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right font-medium">
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
                                            ? "text-[var(--brand-spiced-orange)] font-semibold"
                                            : "text-[var(--brand-leafy-green)] font-medium"
                                        }
                                      >
                                        {formatPercent(foodCostPercent)}
                                      </span>
                                      {isHighFoodCost && (
                                        <Badge className="bg-[var(--brand-spiced-orange)] text-white border-0 text-xs">
                                          Alert
                                        </Badge>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <span
                                      className={
                                        margin !== null && margin > 50
                                          ? "text-[var(--brand-leafy-green)] font-semibold"
                                          : margin !== null && margin < 30
                                            ? "text-[var(--brand-spiced-orange)] font-semibold"
                                            : "text-[var(--brand-golden-zest)] font-medium"
                                      }
                                    >
                                      {formatPercent(margin)}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-center text-sm">
                                    {recipe.ingredientCount}
                                  </TableCell>
                                  <TableCell>
                                    {recipe.lastCalculated ? (
                                      <Badge className="bg-[var(--brand-leafy-green)]/10 text-[var(--brand-leafy-green)] border-[var(--brand-leafy-green)]/30 text-xs">
                                        Calculated
                                      </Badge>
                                    ) : (
                                      <Badge
                                        className="text-xs"
                                        variant="secondary"
                                      >
                                        Pending
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      asChild
                                      className="text-[var(--brand-leafy-green)] hover:text-[var(--brand-leafy-green)] hover:bg-[var(--brand-leafy-green)]/10"
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
                            <div className="mt-4 p-4 border border-[var(--brand-spiced-orange)]/50 bg-[var(--brand-spiced-orange)]/5">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className="bg-[var(--brand-spiced-orange)] text-white border-0 text-xs">
                                  Low Margin Alert
                                </Badge>
                                <span className="font-semibold text-sm">
                                  {costingStats.lowestMarginDish.name}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                This recipe has a margin of{" "}
                                <span className="text-[var(--brand-spiced-orange)] font-medium">
                                  {formatPercent(
                                    costingStats.lowestMarginDish.margin
                                  )}
                                </span>
                                . Consider reviewing ingredient costs or
                                adjusting menu price.
                              </p>
                            </div>
                          )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
};

export default KitchenRecipesPage;
