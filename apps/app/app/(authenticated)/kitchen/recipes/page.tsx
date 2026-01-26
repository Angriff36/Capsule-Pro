import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { AspectRatio } from "@repo/design-system/components/ui/aspect-ratio";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
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
import {
  BookOpenIcon,
  CheckCircleIcon,
  ChefHatIcon,
  SettingsIcon,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenantIdForOrg } from "../../../lib/tenant";
import { Header } from "../../components/header";
import { updateRecipeImage } from "./actions";
import { RecipeEditButton } from "./recipe-edit-button";
import { RecipeFavoriteButton } from "./recipe-favorite-button";
import { RecipeImagePlaceholder } from "./recipe-image-placeholder";
import { RecipesPageClient } from "./recipes-page-client";
import RecipesRealtime from "./recipes-realtime";
import { RecipesToolbar } from "./recipes-toolbar";

type RecipeRow = {
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
};

type DishRow = {
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
};

type IngredientRow = {
  id: string;
  name: string;
  category: string | null;
  allergens: string[] | null;
  unit_code: string | null;
  is_active: boolean;
};

type RecipesPageProps = {
  searchParams?: Promise<{
    tab?: string;
    q?: string;
    category?: string;
    dietary?: string;
    status?: string;
  }>;
};

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

const parseSearchParams = async (searchParams?: Promise<any>) => {
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

  const tabs = [
    { value: "recipes", label: "Recipes", count: recipeTotals?.count ?? 0 },
    { value: "dishes", label: "Dishes", count: dishTotals?.count ?? 0 },
    { value: "menus", label: "Menus", count: 0 },
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
            <DropdownMenuTrigger asChild>
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
      <RecipesRealtime tenantId={tenantId} userId={userId} />
      {activeTab === "recipes" && <RecipesPageClient />}
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
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

        <div className="rounded-3xl border bg-muted/40 p-4">
          {activeTab === "recipes" && (
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {recipes.length === 0 ? (
                <Empty className="bg-card/50">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <ChefHatIcon />
                    </EmptyMedia>
                    <EmptyTitle>No recipes yet</EmptyTitle>
                    <EmptyDescription>
                      Add your first recipe so it can be reused across dishes,
                      prep lists, and events.
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button asChild>
                      <Link href="/kitchen/recipes/new">Add Recipe</Link>
                    </Button>
                  </EmptyContent>
                </Empty>
              ) : (
                recipes.map((recipe) => (
                  <Card
                    className="group overflow-hidden shadow-sm transition-all duration-200 hover:translate-y-[-4px] hover:shadow-md"
                    data-testid="recipe-card"
                    key={recipe.id}
                  >
                    <Link href={`/kitchen/recipes/${recipe.id}`}>
                      <AspectRatio
                        className="relative w-full bg-muted"
                        ratio={16 / 9}
                      >
                        {recipe.image_url ? (
                          <img
                            alt={recipe.name}
                            className="h-full w-full object-cover"
                            height={240}
                            src={recipe.image_url}
                            width={426}
                          />
                        ) : (
                          <RecipeImagePlaceholder
                            recipeName={recipe.name}
                            uploadAction={updateRecipeImage.bind(
                              null,
                              recipe.id
                            )}
                          />
                        )}
                        <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 via-transparent to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
                          <RecipeEditButton
                            recipeId={recipe.id}
                            recipeName={recipe.name}
                          />
                        </div>
                        <RecipeFavoriteButton recipeName={recipe.name} />
                      </AspectRatio>
                    </Link>
                    <CardHeader className="space-y-2">
                      <CardTitle className="font-semibold text-lg">
                        {recipe.name}
                      </CardTitle>
                      <div className="flex flex-wrap items-center gap-2">
                        {recipe.category ? (
                          <Badge variant="secondary">{recipe.category}</Badge>
                        ) : null}
                        <Badge variant="outline">
                          {formatMinutes(recipe.prep_time_minutes)}
                        </Badge>
                      </div>
                      {recipe.description && (
                        <p className="line-clamp-2 text-muted-foreground text-sm">
                          {recipe.description}
                        </p>
                      )}
                    </CardHeader>
                  </Card>
                ))
              )}
            </section>
          )}

          {activeTab === "dishes" && (
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {dishes.length === 0 ? (
                <Empty className="bg-card/50">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <BookOpenIcon />
                    </EmptyMedia>
                    <EmptyTitle>No dishes yet</EmptyTitle>
                    <EmptyDescription>
                      Dishes bundle recipes with service details so they can be
                      scheduled on events and prep runs.
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button asChild>
                      <Link href="/kitchen/recipes/dishes/new">Add Dish</Link>
                    </Button>
                  </EmptyContent>
                </Empty>
              ) : (
                dishes.map((dish) => {
                  const margin = getDishMargin(dish);
                  return (
                    <Card className="overflow-hidden shadow-sm" key={dish.id}>
                      <div className="relative h-40 w-full bg-muted">
                        {dish.presentation_image_url ? (
                          <img
                            alt={dish.name}
                            className="h-full w-full object-cover"
                            src={dish.presentation_image_url}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-slate-200 via-slate-100 to-white text-muted-foreground">
                            <BookOpenIcon size={32} />
                          </div>
                        )}
                        <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
                          {dish.category ? (
                            <Badge variant="secondary">
                              {dish.category.toUpperCase()}
                            </Badge>
                          ) : null}
                          {(dish.dietary_tags ?? []).slice(0, 2).map((tag) => (
                            <Badge key={tag}>{tag.toUpperCase()}</Badge>
                          ))}
                        </div>
                      </div>
                      <CardHeader className="space-y-2">
                        <CardTitle className="font-semibold text-lg">
                          {dish.name}
                        </CardTitle>
                        <div className="text-muted-foreground text-sm">
                          Recipe: {dish.recipe_name ?? "Unlinked"}
                        </div>
                      </CardHeader>
                      <CardContent className="grid grid-cols-3 gap-3 text-sm">
                        <div>
                          <div className="text-muted-foreground">Food cost</div>
                          <div className="font-semibold">
                            {dish.cost_per_person
                              ? currencyFormatter.format(dish.cost_per_person)
                              : "-"}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">
                            Menu price
                          </div>
                          <div className="font-semibold">
                            {dish.price_per_person
                              ? currencyFormatter.format(dish.price_per_person)
                              : "-"}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Margin</div>
                          <div className="font-semibold text-emerald-600">
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
            </section>
          )}

          {activeTab === "ingredients" && (
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {ingredients.length === 0 ? (
                <Empty className="bg-card/50">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <ChefHatIcon />
                    </EmptyMedia>
                    <EmptyTitle>No ingredients yet</EmptyTitle>
                    <EmptyDescription>
                      Add ingredients to keep recipe scaling and costing
                      accurate.
                    </EmptyDescription>
                  </EmptyHeader>
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
            </section>
          )}

          {activeTab === "menus" && (
            <Empty className="bg-card/50">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <BookOpenIcon />
                </EmptyMedia>
                <EmptyTitle>Menus are coming next</EmptyTitle>
                <EmptyDescription>
                  Menus will bundle dishes into event-ready collections with
                  pricing and dietary breakdowns.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}

          {activeTab === "costing" && (
            <section className="grid gap-4 lg:grid-cols-2">
              {dishes.length === 0 ? (
                <Empty className="bg-card/50">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <BookOpenIcon />
                    </EmptyMedia>
                    <EmptyTitle>No costing data yet</EmptyTitle>
                    <EmptyDescription>
                      Add dishes with pricing and cost details to see margins.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                dishes.map((dish) => {
                  const margin = getDishMargin(dish);
                  return (
                    <Card className="shadow-sm" key={dish.id}>
                      <CardHeader className="space-y-1">
                        <CardTitle className="text-base">{dish.name}</CardTitle>
                        <div className="text-muted-foreground text-sm">
                          Recipe: {dish.recipe_name ?? "Unlinked"}
                        </div>
                      </CardHeader>
                      <CardContent className="grid grid-cols-3 gap-3 text-sm">
                        <div>
                          <div className="text-muted-foreground">Food cost</div>
                          <div className="font-semibold">
                            {dish.cost_per_person
                              ? currencyFormatter.format(dish.cost_per_person)
                              : "-"}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">
                            Menu price
                          </div>
                          <div className="font-semibold">
                            {dish.price_per_person
                              ? currencyFormatter.format(dish.price_per_person)
                              : "-"}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Margin</div>
                          <div className="font-semibold text-emerald-600">
                            {formatPercent(margin)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </section>
          )}
        </div>
      </div>
    </>
  );
};

export default KitchenRecipesPage;
