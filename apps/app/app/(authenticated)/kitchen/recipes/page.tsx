import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import {
  CommandBand,
  CommandBandBody,
  CommandBandHeader,
  CommandBandLede,
  DisplayHeading,
  MetricBand,
  MetricCell,
  MetricDelta,
  MetricLabel,
  MetricValue,
  MonoLabel,
  OperationalColumn,
  SectionHeader,
} from "@repo/design-system/components/blocks/page-shell";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/design-system/components/ui/dropdown-menu";
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
  CheckCircleIcon,
  ChefHatIcon,
  Clock,
  DollarSignIcon,
  PackageIcon,
  SettingsIcon,
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
import { getDishMarginTierClasses } from "./lib/dish-margin-tier";
import { getRecipeMarginCellClass } from "./lib/recipe-costing-styles";
import { getMenus } from "./menus/actions";
import { RecipeEditButton } from "./recipe-edit-button";
import { RecipeFavoriteButton } from "./recipe-favorite-button";
import { RecipeQuickRename } from "./recipe-quick-rename";
import { RecipesPageClient } from "./recipes-page-client";
import RecipesRealtime from "./recipes-realtime";
import { RecipesToolbar } from "./recipes-toolbar";

interface RecipeRow {
  category: string | null;
  cook_time_minutes: number | null;
  description: string | null;
  dish_count: number;
  id: string;
  image_url: string | null;
  ingredient_count: number;
  is_active: boolean;
  name: string;
  prep_time_minutes: number | null;
  rest_time_minutes: number | null;
  tags: string[] | null;
  yield_quantity: number | null;
  yield_unit: string | null;
}

interface DishRow {
  category: string | null;
  cost_per_person: number | null;
  dietary_tags: string[] | null;
  event_count: number;
  id: string;
  is_active: boolean;
  name: string;
  prep_task_count: number;
  presentation_image_url: string | null;
  price_per_person: number | null;
  recipe_name: string | null;
}

interface IngredientRow {
  allergens: string[] | null;
  category: string | null;
  id: string;
  is_active: boolean;
  name: string;
  unit_code: string | null;
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

  const hubStats = [
    {
      label: "Recipes",
      value: String(recipeTotals?.count ?? 0),
      note: "Production builds",
    },
    {
      label: "Dishes",
      value: String(dishTotals?.count ?? 0),
      note: "Client-facing",
    },
    {
      label: "Menus",
      value: String(menuTotals?.count ?? 0),
      note: "Composed sets",
    },
    {
      label: "Ingredients",
      value: String(ingredientTotals?.count ?? 0),
      note: "Raw inventory",
    },
  ];

  const recipesHead = {
    eyebrow: "Recipes",
    title: "Recipe collection",
    description: "Ingredients, yields, and timing for every production build.",
    count: `${recipeTotals?.count ?? 0} recipes`,
  };
  const catalogHead: Record<
    string,
    { eyebrow: string; title: string; description: string; count: string }
  > = {
    recipes: recipesHead,
    dishes: {
      eyebrow: "Dishes",
      title: "Dish library",
      description: "Pricing, dietary tags, and plating for sellable plates.",
      count: `${dishTotals?.count ?? 0} dishes`,
    },
    ingredients: {
      eyebrow: "Ingredients",
      title: "Ingredient library",
      description: "Allergens, units, and categories for raw items.",
      count: `${ingredientTotals?.count ?? 0} ingredients`,
    },
    menus: {
      eyebrow: "Menus",
      title: "Menu collection",
      description: "Bundles of dishes for events and tastings.",
      count: `${menuTotals?.count ?? 0} menus`,
    },
    costing: {
      eyebrow: "Costing",
      title: "Margin analysis",
      description: "Vendor recipe costs against sell price.",
      count: costingSummary.length
        ? `${costingSummary.length} rows`
        : "No vendor costs",
    },
  };

  const head = catalogHead[activeTab] ?? recipesHead;

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
            <DropdownMenuContent
              align="end"
              className="editorial-surface-reset"
            >
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

      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Kitchen / Library</MonoLabel>
            <DisplayHeading size="md">Recipes, dishes & menus</DisplayHeading>
            <CommandBandLede>
              One operational library for production builds, sellable dishes,
              composed menus, and raw ingredients — costing stays on the same
              canvas.
            </CommandBandLede>
          </div>
        </CommandBandHeader>
        <CommandBandBody>
          <MetricBand>
            {hubStats.map((m) => (
              <MetricCell key={m.label}>
                <MetricLabel>{m.label}</MetricLabel>
                <MetricValue>{m.value}</MetricValue>
                <div className="text-white/55 text-xs">{m.note}</div>
              </MetricCell>
            ))}
          </MetricBand>
        </CommandBandBody>
      </CommandBand>

      <OperationalColumn className="min-w-0 gap-10 pb-20">
        <section className="rounded-[22px] border border-hairline bg-soft-stone p-6 sm:p-8">
          <RecipesToolbar
            activeTab={activeTab}
            initialCategory={category}
            initialDietary={dietary}
            initialQuery={query}
            initialStatus={status}
            primaryAction={primaryAction}
            tabs={tabs}
          />
        </section>

        <section className="space-y-6">
          <SectionHeader
            count={head.count}
            description={head.description}
            eyebrow={head.eyebrow}
            title={head.title}
          />
          <div className="rounded-[22px] border border-hairline bg-canvas p-6 sm:p-8">
            {activeTab === "recipes" && (
              <div className="space-y-3">
                {recipes.length === 0 ? (
                  <div className="flex flex-col items-center gap-5 rounded-[16px] border border-hairline bg-soft-stone px-6 py-16 text-center">
                    <span className="inline-flex size-12 items-center justify-center rounded-full border border-hairline bg-canvas text-deep-green">
                      <ChefHatIcon className="size-5" />
                    </span>
                    <div className="space-y-2">
                      <h3 className="font-semibold text-[24px] text-foreground leading-[1.3] tracking-[-0.24px]">
                        Create your first recipe
                      </h3>
                      <p className="mx-auto max-w-md text-[16px] text-muted-foreground leading-[1.5]">
                        Start building your recipe collection. Recipes can be
                        reused across multiple dishes, prep lists, and events to
                        streamline your kitchen operations.
                      </p>
                    </div>
                    <Button
                      asChild
                      className="rounded-full bg-ink px-6 py-2 font-medium text-[15px] text-white hover:bg-ink/90"
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
                      return (
                        <Link
                          className="group flex items-center gap-4 rounded-[16px] border border-hairline bg-canvas p-4 transition-colors hover:border-ink/25 hover:bg-soft-stone/60"
                          data-testid="recipe-card"
                          href={`/kitchen/recipes/${recipe.id}`}
                          key={recipe.id}
                        >
                          <ItemCheckbox id={recipe.id} />

                          <div
                            aria-hidden
                            className="h-10 w-0.5 shrink-0 rounded-full bg-ink/15"
                          />

                          {/* Recipe name - primary info */}
                          <div className="min-w-0 flex-1">
                            <InlineRecipeName
                              name={recipe.name}
                              recipeId={recipe.id}
                            />
                            {recipe.description && (
                              <div className="truncate text-[14px] text-muted-foreground">
                                {recipe.description}
                              </div>
                            )}
                          </div>

                          {/* Category badge */}
                          {recipe.category && (
                            <Badge
                              className="shrink-0 font-normal"
                              variant="outline"
                            >
                              {recipe.category}
                            </Badge>
                          )}

                          {/* Time info */}
                          <div className="flex shrink-0 items-center gap-3 font-mono text-[12px] text-muted-foreground uppercase tracking-[0.6px]">
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
                            <span className="text-muted-foreground">
                              <span className="font-semibold text-foreground">
                                {recipe.ingredient_count}
                              </span>{" "}
                              ing
                            </span>
                            {recipe.dish_count > 0 && (
                              <span className="font-medium text-ink tabular-nums">
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
              <div className="space-y-3">
                {dishes.length === 0 ? (
                  <div className="flex flex-col items-center gap-5 rounded-[16px] border border-hairline bg-soft-stone px-6 py-16 text-center">
                    <span className="inline-flex size-12 items-center justify-center rounded-full border border-hairline bg-canvas text-deep-green">
                      <UtensilsIcon className="size-5" />
                    </span>
                    <div className="space-y-2">
                      <h3 className="font-normal text-[24px] text-ink leading-[1.3] tracking-[-0.24px]">
                        Build your first dish
                      </h3>
                      <p className="mx-auto max-w-md text-[16px] text-muted-foreground leading-[1.5]">
                        Transform recipes into marketable dishes with pricing,
                        dietary information, and presentation details.
                      </p>
                    </div>
                    <Button
                      asChild
                      className="rounded-full bg-ink px-6 py-2 font-medium text-[15px] text-white hover:bg-ink/90"
                    >
                      <Link href="/kitchen/recipes/dishes/new">
                        Create new dish
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <SelectableList
                    items={dishes.map((d) => ({ id: d.id, name: d.name }))}
                    type="dishes"
                  >
                    {dishes.map((dish) => {
                      const margin = getDishMargin(dish);
                      const marginTier = getDishMarginTierClasses(margin);
                      return (
                        <Link
                          className="group flex items-center gap-4 rounded-[16px] border border-hairline bg-canvas p-4 transition-colors hover:border-ink/25 hover:bg-soft-stone/60"
                          href={`/kitchen/recipes/dishes/${dish.id}`}
                          key={dish.id}
                        >
                          <ItemCheckbox id={dish.id} />

                          <div
                            aria-hidden
                            className={`h-10 w-0.5 shrink-0 rounded-full ${marginTier.barClass}`}
                          />

                          <div className="min-w-0 flex-1">
                            <InlineDishName dishId={dish.id} name={dish.name} />
                            <div className="text-[14px] text-muted-foreground">
                              {dish.recipe_name ?? (
                                <span className="italic">Unlinked</span>
                              )}
                            </div>
                          </div>

                          {dish.category && (
                            <Badge
                              className="shrink-0 font-normal"
                              variant="outline"
                            >
                              {dish.category}
                            </Badge>
                          )}

                          {dish.dietary_tags &&
                            dish.dietary_tags.length > 0 && (
                              <DietaryBadges
                                compact
                                size="sm"
                                tags={dish.dietary_tags}
                              />
                            )}

                          <div className="flex shrink-0 items-center gap-4 font-mono text-[12px] text-muted-foreground">
                            <div className="text-center">
                              <div className="text-[10px] uppercase tracking-wide">
                                Cost
                              </div>
                              <div className="font-medium font-sans text-ink">
                                {dish.cost_per_person
                                  ? currencyFormatter.format(
                                      dish.cost_per_person
                                    )
                                  : "-"}
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-[10px] uppercase tracking-wide">
                                Price
                              </div>
                              <div className="font-medium font-sans text-ink">
                                <InlineDishPrice
                                  dishId={dish.id}
                                  price={
                                    dish.price_per_person?.toString() ?? null
                                  }
                                />
                              </div>
                            </div>
                            <div className="min-w-[50px] text-center">
                              <div className="text-[10px] uppercase tracking-wide">
                                Margin
                              </div>
                              <div
                                className={`font-sans font-semibold ${marginTier.textClass}`}
                              >
                                {formatPercent(margin)}
                              </div>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-3 text-[13px] text-muted-foreground">
                            <span>{dish.event_count} events</span>
                            <span>{dish.prep_task_count} prep</span>
                          </div>

                          <div className="flex shrink-0 items-center gap-1 text-[13px]">
                            <CheckCircleIcon
                              className={`size-3.5 ${dish.is_active ? "text-deep-green" : "text-muted-foreground"}`}
                            />
                            <span
                              className={
                                dish.is_active
                                  ? "font-medium text-deep-green"
                                  : "text-muted-foreground"
                              }
                            >
                              {dish.is_active ? "Active" : "Paused"}
                            </span>
                          </div>

                          <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
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
              <div className="space-y-3">
                {ingredients.length === 0 ? (
                  <div className="flex flex-col items-center gap-5 rounded-[16px] border border-hairline bg-soft-stone px-6 py-16 text-center">
                    <span className="inline-flex size-12 items-center justify-center rounded-full border border-hairline bg-canvas text-deep-green">
                      <PackageIcon className="size-5" />
                    </span>
                    <div className="space-y-2">
                      <h3 className="font-normal text-[24px] text-ink leading-[1.3] tracking-[-0.24px]">
                        Add your ingredients
                      </h3>
                      <p className="mx-auto max-w-md text-[16px] text-muted-foreground leading-[1.5]">
                        Build your ingredient library with units, categories,
                        and allergen information for accurate scaling and cost
                        data.
                      </p>
                    </div>
                    <Button
                      asChild
                      className="rounded-full bg-ink px-6 py-2 font-medium text-[15px] text-white hover:bg-ink/90"
                    >
                      <Link href="/kitchen/recipes/ingredients/new">
                        Add ingredient
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {ingredients.map((ingredient) => (
                      <div
                        className="group flex items-center gap-4 rounded-[16px] border border-hairline bg-canvas px-4 py-3 transition-colors hover:border-ink/25 hover:bg-soft-stone/60"
                        key={ingredient.id}
                      >
                        <div
                          aria-hidden
                          className={`h-10 w-0.5 shrink-0 rounded-full ${ingredient.is_active ? "bg-deep-green" : "bg-muted-foreground/50"}`}
                        />

                        <div className="min-w-0 flex-1 truncate">
                          <div className="truncate font-medium text-[15px] text-ink">
                            {ingredient.name}
                          </div>
                        </div>

                        {ingredient.category && (
                          <Badge
                            className="shrink-0 font-normal"
                            variant="outline"
                          >
                            {ingredient.category}
                          </Badge>
                        )}

                        {(ingredient.allergens ?? []).length > 0 && (
                          <div className="flex shrink-0 flex-wrap gap-1">
                            {(ingredient.allergens ?? [])
                              .slice(0, 3)
                              .map((allergen) => (
                                <Badge
                                  className="border-coral-soft font-normal text-coral text-xs"
                                  key={allergen}
                                  variant="outline"
                                >
                                  {allergen}
                                </Badge>
                              ))}
                          </div>
                        )}

                        <div className="shrink-0 font-mono text-[12px] text-muted-foreground">
                          <span className="text-[10px] uppercase tracking-wide">
                            Unit
                          </span>{" "}
                          <span className="font-medium font-sans text-ink">
                            {ingredient.unit_code ?? "—"}
                          </span>
                        </div>

                        <div className="flex shrink-0 items-center gap-1 text-[13px]">
                          <CheckCircleIcon
                            className={`size-3.5 ${ingredient.is_active ? "text-deep-green" : "text-muted-foreground"}`}
                          />
                          <span
                            className={
                              ingredient.is_active
                                ? "font-medium text-deep-green"
                                : "text-muted-foreground"
                            }
                          >
                            {ingredient.is_active ? "Active" : "Paused"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "menus" && (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {menus.length === 0 ? (
                  <div className="col-span-full flex flex-col items-center gap-5 rounded-[16px] border border-hairline bg-soft-stone px-6 py-16 text-center">
                    <span className="inline-flex size-12 items-center justify-center rounded-full border border-hairline bg-canvas text-deep-green">
                      <UtensilsIcon className="size-5" />
                    </span>
                    <div className="space-y-2">
                      <h3 className="font-normal text-[24px] text-ink leading-[1.3] tracking-[-0.24px]">
                        Create your first menu
                      </h3>
                      <p className="mx-auto max-w-md text-[16px] text-muted-foreground leading-[1.5]">
                        Curate dishes into bundles for events, tastings, and
                        client proposals.
                      </p>
                    </div>
                    <Button
                      asChild
                      className="rounded-full bg-ink px-6 py-2 font-medium text-[15px] text-white hover:bg-ink/90"
                    >
                      <Link href="/kitchen/recipes/menus/new">
                        Create new menu
                      </Link>
                    </Button>
                  </div>
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
              <div className="space-y-8">
                <MetricBand cols={4} surface="light">
                  <MetricCell surface="light">
                    <MetricLabel surface="light">Avg food cost</MetricLabel>
                    <MetricValue
                      className="text-4xl sm:text-[2.75rem]"
                      surface="light"
                    >
                      {costingStats
                        ? formatPercent(costingStats.avgFoodCostPercent)
                        : "—"}
                    </MetricValue>
                    <MetricDelta surface="light">Target below 35%</MetricDelta>
                  </MetricCell>
                  <MetricCell surface="light">
                    <MetricLabel surface="light">Recipe value</MetricLabel>
                    <MetricValue
                      className="text-4xl sm:text-[2.75rem]"
                      surface="light"
                    >
                      {costingStats
                        ? currencyFormatter.format(
                            costingStats.totalRecipeValue
                          )
                        : currencyFormatter.format(0)}
                    </MetricValue>
                    <MetricDelta surface="light">
                      {costingStats?.recipesWithCostData ?? 0} of{" "}
                      {costingStats?.totalRecipes ?? dishes.length} with data
                    </MetricDelta>
                  </MetricCell>
                  <MetricCell surface="light">
                    <MetricLabel surface="light">Highest margin</MetricLabel>
                    <MetricValue
                      className="text-4xl text-deep-green sm:text-[2.75rem]"
                      surface="light"
                    >
                      {costingStats?.highestMarginDish
                        ? formatPercent(costingStats.highestMarginDish.margin)
                        : "—"}
                    </MetricValue>
                    <MetricDelta className="truncate" surface="light">
                      {costingStats?.highestMarginDish?.name ?? "—"}
                    </MetricDelta>
                  </MetricCell>
                  <MetricCell surface="light">
                    <MetricLabel surface="light">Cost alerts</MetricLabel>
                    <MetricValue
                      className={
                        (costingStats?.highFoodCostAlerts ?? 0) > 0
                          ? "text-4xl text-coral sm:text-[2.75rem]"
                          : "text-4xl text-deep-green sm:text-[2.75rem]"
                      }
                      surface="light"
                    >
                      {(costingStats?.highFoodCostAlerts ?? 0) > 0
                        ? "Action"
                        : "Clear"}
                    </MetricValue>
                    <MetricDelta surface="light">
                      {(costingStats?.highFoodCostAlerts ?? 0) > 0
                        ? `${costingStats?.highFoodCostAlerts ?? 0} over 35%`
                        : "Within threshold"}
                    </MetricDelta>
                  </MetricCell>
                </MetricBand>

                <div className="overflow-hidden rounded-[22px] border border-hairline bg-canvas">
                  <div className="border-hairline border-b px-6 py-5">
                    <h3 className="font-normal text-ink text-lg tracking-[-0.01em]">
                      Recipe cost analysis
                    </h3>
                    <p className="mt-1 text-[14px] text-muted-foreground">
                      Compare costs, margins, and high food-cost items.
                    </p>
                  </div>
                  <div className="p-6">
                    {costingSummary.length === 0 ? (
                      <div className="py-10 text-center text-muted-foreground">
                        <DollarSignIcon className="mx-auto mb-4 h-12 w-12 opacity-40" />
                        <p className="font-medium text-ink text-lg">
                          No vendor cost data
                        </p>
                        <p className="mt-1 text-sm">
                          Add vendor pricing to ingredients to populate this
                          view.
                        </p>
                      </div>
                    ) : (
                      <>
                        <Table>
                          <TableHeader>
                            <TableRow className="border-hairline border-b hover:bg-transparent">
                              <TableHead className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.2em]">
                                Recipe
                              </TableHead>
                              <TableHead className="text-right font-mono text-[11px] text-muted-foreground uppercase tracking-[0.2em]">
                                Cost / yield
                              </TableHead>
                              <TableHead className="text-right font-mono text-[11px] text-muted-foreground uppercase tracking-[0.2em]">
                                Menu price
                              </TableHead>
                              <TableHead className="text-right font-mono text-[11px] text-muted-foreground uppercase tracking-[0.2em]">
                                Food cost %
                              </TableHead>
                              <TableHead className="text-right font-mono text-[11px] text-muted-foreground uppercase tracking-[0.2em]">
                                Margin
                              </TableHead>
                              <TableHead className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.2em]">
                                Ingredients
                              </TableHead>
                              <TableHead className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.2em]">
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
                              const marginCellClass =
                                getRecipeMarginCellClass(margin);

                              return (
                                <TableRow
                                  className="border-hairline/80 border-b last:border-b-0"
                                  key={recipe.recipeId}
                                >
                                  <TableCell>
                                    <div>
                                      <div className="font-medium text-[15px] text-ink">
                                        {recipe.recipeName}
                                      </div>
                                      <div className="text-[13px] text-muted-foreground">
                                        Yield {recipe.yieldQuantity}{" "}
                                        {recipe.yieldUnit ?? "units"}
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right font-medium text-action-blue">
                                    {currencyFormatter.format(
                                      recipe.costPerYield
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right font-medium text-ink">
                                    {recipe.menuPrice
                                      ? currencyFormatter.format(
                                          recipe.menuPrice
                                        )
                                      : "—"}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <span
                                        className={
                                          isHighFoodCost
                                            ? "font-semibold text-coral"
                                            : "font-medium text-deep-green"
                                        }
                                      >
                                        {formatPercent(foodCostPercent)}
                                      </span>
                                      {isHighFoodCost ? (
                                        <Badge className="border-0 bg-coral px-2 text-white text-xs">
                                          Alert
                                        </Badge>
                                      ) : null}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <span className={marginCellClass}>
                                      {formatPercent(margin)}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-center text-[14px] text-ink tabular-nums">
                                    {recipe.ingredientCount}
                                  </TableCell>
                                  <TableCell>
                                    {recipe.lastCalculated ? (
                                      <Badge
                                        className="border-deep-green/30 bg-deep-green/10 text-deep-green text-xs"
                                        variant="outline"
                                      >
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
                                      className="text-deep-green hover:bg-deep-green/10 hover:text-deep-green"
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

                        {costingStats?.lowestMarginDish &&
                          costingStats.lowestMarginDish.margin < 30 && (
                            <div className="mt-6 rounded-[16px] border border-coral/40 bg-coral/5 px-5 py-4">
                              <div className="mb-1 flex flex-wrap items-center gap-2">
                                <Badge className="border-0 bg-coral text-white text-xs">
                                  Low margin
                                </Badge>
                                <span className="font-medium text-[15px] text-ink">
                                  {costingStats.lowestMarginDish.name}
                                </span>
                              </div>
                              <p className="text-[13px] text-muted-foreground">
                                Margin{" "}
                                <span className="font-medium text-coral">
                                  {formatPercent(
                                    costingStats.lowestMarginDish.margin
                                  )}
                                </span>
                                . Review ingredient costs or menu pricing.
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
      </OperationalColumn>
    </>
  );
};

export default KitchenRecipesPage;
