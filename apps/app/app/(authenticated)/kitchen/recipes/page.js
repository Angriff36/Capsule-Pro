var __importDefault =
  (this && this.__importDefault) ||
  ((mod) => (mod && mod.__esModule ? mod : { default: mod }));
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const aspect_ratio_1 = require("@repo/design-system/components/ui/aspect-ratio");
const badge_1 = require("@repo/design-system/components/ui/badge");
const button_1 = require("@repo/design-system/components/ui/button");
const card_1 = require("@repo/design-system/components/ui/card");
const dropdown_menu_1 = require("@repo/design-system/components/ui/dropdown-menu");
const empty_1 = require("@repo/design-system/components/ui/empty");
const lucide_react_1 = require("lucide-react");
const link_1 = __importDefault(require("next/link"));
const navigation_1 = require("next/navigation");
const tenant_1 = require("../../../lib/tenant");
const header_1 = require("../../components/header");
const actions_1 = require("./actions");
const recipe_favorite_button_1 = require("./recipe-favorite-button");
const recipe_image_placeholder_1 = require("./recipe-image-placeholder");
const recipes_page_client_1 = require("./recipes-page-client");
const recipes_realtime_1 = __importDefault(require("./recipes-realtime"));
const recipes_toolbar_1 = require("./recipes-toolbar");
const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});
const formatMinutes = (minutes) =>
  minutes && minutes > 0 ? `${minutes}m` : "-";
const formatPercent = (value) =>
  value === null ? "-" : `${Math.round(value)}%`;
const buildConditions = (base, extra) => {
  const conditions = [...base, ...extra].filter(Boolean);
  return database_1.Prisma
    .sql`WHERE ${database_1.Prisma.join(conditions, " AND ")}`;
};
const parseSearchParams = async (searchParams) => {
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
const getStatusCondition = (status, column) => {
  if (status === "active") {
    return database_1.Prisma.sql`${column} = true`;
  }
  if (status === "inactive") {
    return database_1.Prisma.sql`${column} = false`;
  }
  return database_1.Prisma.sql`TRUE`;
};
const getDietaryCondition = (dietary, column) => {
  if (!dietary) {
    return database_1.Prisma.sql`TRUE`;
  }
  return database_1.Prisma.sql`${column} @> ARRAY[${dietary}]::text[]`;
};
const KitchenRecipesPage = async ({ searchParams }) => {
  const {
    activeTab,
    query,
    category,
    dietary,
    status,
    queryPattern,
    categoryLower,
  } = await parseSearchParams(searchParams);
  const { orgId, userId } = await (0, server_1.auth)();
  if (!orgId) {
    (0, navigation_1.notFound)();
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  const [recipeTotals] = await database_1.database.$queryRaw(database_1.Prisma
    .sql`
      SELECT COUNT(*)::int AS count
      FROM tenant_kitchen.recipes
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
    `);
  const [dishTotals] = await database_1.database.$queryRaw(database_1.Prisma
    .sql`
      SELECT COUNT(*)::int AS count
      FROM tenant_kitchen.dishes
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
    `);
  const [ingredientTotals] = await database_1.database.$queryRaw(database_1
    .Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM tenant_kitchen.ingredients
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
    `);
  const recipeConditions = buildConditions(
    [
      database_1.Prisma.sql`r.tenant_id = ${tenantId}`,
      database_1.Prisma.sql`r.deleted_at IS NULL`,
    ],
    [
      queryPattern
        ? database_1.Prisma.sql`r.name ILIKE ${queryPattern}`
        : database_1.Prisma.sql`TRUE`,
      categoryLower
        ? database_1.Prisma.sql`lower(r.category) = ${categoryLower}`
        : database_1.Prisma.sql`TRUE`,
      getDietaryCondition(dietary, database_1.Prisma.sql`r.tags`),
      getStatusCondition(status, database_1.Prisma.sql`r.is_active`),
    ]
  );
  const dishConditions = buildConditions(
    [
      database_1.Prisma.sql`d.tenant_id = ${tenantId}`,
      database_1.Prisma.sql`d.deleted_at IS NULL`,
    ],
    [
      queryPattern
        ? database_1.Prisma.sql`d.name ILIKE ${queryPattern}`
        : database_1.Prisma.sql`TRUE`,
      categoryLower
        ? database_1.Prisma.sql`lower(d.category) = ${categoryLower}`
        : database_1.Prisma.sql`TRUE`,
      getDietaryCondition(dietary, database_1.Prisma.sql`d.dietary_tags`),
      getStatusCondition(status, database_1.Prisma.sql`d.is_active`),
    ]
  );
  const ingredientConditions = buildConditions(
    [
      database_1.Prisma.sql`i.tenant_id = ${tenantId}`,
      database_1.Prisma.sql`i.deleted_at IS NULL`,
    ],
    [
      queryPattern
        ? database_1.Prisma.sql`i.name ILIKE ${queryPattern}`
        : database_1.Prisma.sql`TRUE`,
      categoryLower
        ? database_1.Prisma.sql`lower(i.category) = ${categoryLower}`
        : database_1.Prisma.sql`TRUE`,
      getDietaryCondition(dietary, database_1.Prisma.sql`i.allergens`),
      getStatusCondition(status, database_1.Prisma.sql`i.is_active`),
    ]
  );
  const showRecipes = activeTab === "recipes";
  const showDishes = activeTab === "dishes" || activeTab === "costing";
  const showIngredients = activeTab === "ingredients";
  const recipes = showRecipes
    ? await database_1.database.$queryRaw(database_1.Prisma.sql`
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
        `)
    : [];
  const dishes = showDishes
    ? await database_1.database.$queryRaw(database_1.Prisma.sql`
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
        `)
    : [];
  const ingredients = showIngredients
    ? await database_1.database.$queryRaw(database_1.Prisma.sql`
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
        `)
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
  const getDishMargin = (dish) => {
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
      <header_1.Header page="Recipes & Menus" pages={["Kitchen Ops"]}>
        <div className="flex items-center gap-2 px-4">
          <dropdown_menu_1.DropdownMenu>
            <dropdown_menu_1.DropdownMenuTrigger asChild>
              <button_1.Button size="icon" variant="ghost">
                <lucide_react_1.SettingsIcon className="size-4" />
              </button_1.Button>
            </dropdown_menu_1.DropdownMenuTrigger>
            <dropdown_menu_1.DropdownMenuContent align="end">
              <dropdown_menu_1.DropdownMenuItem asChild>
                <link_1.default href="/kitchen/recipes/cleanup">
                  Cleanup imports
                </link_1.default>
              </dropdown_menu_1.DropdownMenuItem>
              <dropdown_menu_1.DropdownMenuItem asChild>
                <link_1.default href="/search">Global search</link_1.default>
              </dropdown_menu_1.DropdownMenuItem>
            </dropdown_menu_1.DropdownMenuContent>
          </dropdown_menu_1.DropdownMenu>
        </div>
      </header_1.Header>
      <recipes_realtime_1.default tenantId={tenantId} userId={userId} />
      {activeTab === "recipes" && <recipes_page_client_1.RecipesPageClient />}
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        <div className="rounded-3xl border bg-card/80 p-4 shadow-sm">
          <recipes_toolbar_1.RecipesToolbar
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
                <empty_1.Empty className="bg-card/50">
                  <empty_1.EmptyHeader>
                    <empty_1.EmptyMedia variant="icon">
                      <lucide_react_1.ChefHatIcon />
                    </empty_1.EmptyMedia>
                    <empty_1.EmptyTitle>No recipes yet</empty_1.EmptyTitle>
                    <empty_1.EmptyDescription>
                      Add your first recipe so it can be reused across dishes,
                      prep lists, and events.
                    </empty_1.EmptyDescription>
                  </empty_1.EmptyHeader>
                  <empty_1.EmptyContent>
                    <button_1.Button asChild>
                      <link_1.default href="/kitchen/recipes/new">
                        Add Recipe
                      </link_1.default>
                    </button_1.Button>
                  </empty_1.EmptyContent>
                </empty_1.Empty>
              ) : (
                recipes.map((recipe) => (
                  <card_1.Card
                    className="group overflow-hidden shadow-sm transition-all duration-200 hover:translate-y-[-4px] hover:shadow-md"
                    data-testid="recipe-card"
                    key={recipe.id}
                  >
                    <link_1.default href={`/kitchen/recipes/${recipe.id}`}>
                      <aspect_ratio_1.AspectRatio
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
                          <recipe_image_placeholder_1.RecipeImagePlaceholder
                            recipeName={recipe.name}
                            uploadAction={actions_1.updateRecipeImage.bind(
                              null,
                              recipe.id
                            )}
                          />
                        )}
                        <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 via-transparent to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
                          <button_1.Button
                            aria-label={`Edit ${recipe.name}`}
                            className="text-white"
                            size="sm"
                            type="button"
                            variant="secondary"
                          >
                            Edit
                          </button_1.Button>
                        </div>
                        <recipe_favorite_button_1.RecipeFavoriteButton
                          recipeName={recipe.name}
                        />
                      </aspect_ratio_1.AspectRatio>
                    </link_1.default>
                    <card_1.CardHeader className="space-y-2">
                      <card_1.CardTitle className="font-semibold text-lg">
                        {recipe.name}
                      </card_1.CardTitle>
                      <div className="flex flex-wrap items-center gap-2">
                        {recipe.category ? (
                          <badge_1.Badge variant="secondary">
                            {recipe.category}
                          </badge_1.Badge>
                        ) : null}
                        <badge_1.Badge variant="outline">
                          {formatMinutes(recipe.prep_time_minutes)}
                        </badge_1.Badge>
                      </div>
                      {recipe.description && (
                        <p className="line-clamp-2 text-muted-foreground text-sm">
                          {recipe.description}
                        </p>
                      )}
                    </card_1.CardHeader>
                  </card_1.Card>
                ))
              )}
            </section>
          )}

          {activeTab === "dishes" && (
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {dishes.length === 0 ? (
                <empty_1.Empty className="bg-card/50">
                  <empty_1.EmptyHeader>
                    <empty_1.EmptyMedia variant="icon">
                      <lucide_react_1.BookOpenIcon />
                    </empty_1.EmptyMedia>
                    <empty_1.EmptyTitle>No dishes yet</empty_1.EmptyTitle>
                    <empty_1.EmptyDescription>
                      Dishes bundle recipes with service details so they can be
                      scheduled on events and prep runs.
                    </empty_1.EmptyDescription>
                  </empty_1.EmptyHeader>
                  <empty_1.EmptyContent>
                    <button_1.Button asChild>
                      <link_1.default href="/kitchen/recipes/dishes/new">
                        Add Dish
                      </link_1.default>
                    </button_1.Button>
                  </empty_1.EmptyContent>
                </empty_1.Empty>
              ) : (
                dishes.map((dish) => {
                  const margin = getDishMargin(dish);
                  return (
                    <card_1.Card
                      className="overflow-hidden shadow-sm"
                      key={dish.id}
                    >
                      <div className="relative h-40 w-full bg-muted">
                        {dish.presentation_image_url ? (
                          <img
                            alt={dish.name}
                            className="h-full w-full object-cover"
                            src={dish.presentation_image_url}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-slate-200 via-slate-100 to-white text-muted-foreground">
                            <lucide_react_1.BookOpenIcon size={32} />
                          </div>
                        )}
                        <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
                          {dish.category ? (
                            <badge_1.Badge variant="secondary">
                              {dish.category.toUpperCase()}
                            </badge_1.Badge>
                          ) : null}
                          {(dish.dietary_tags ?? []).slice(0, 2).map((tag) => (
                            <badge_1.Badge key={tag}>
                              {tag.toUpperCase()}
                            </badge_1.Badge>
                          ))}
                        </div>
                      </div>
                      <card_1.CardHeader className="space-y-2">
                        <card_1.CardTitle className="font-semibold text-lg">
                          {dish.name}
                        </card_1.CardTitle>
                        <div className="text-muted-foreground text-sm">
                          Recipe: {dish.recipe_name ?? "Unlinked"}
                        </div>
                      </card_1.CardHeader>
                      <card_1.CardContent className="grid grid-cols-3 gap-3 text-sm">
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
                            <lucide_react_1.CheckCircleIcon className="size-4 text-emerald-500" />
                            {dish.is_active ? "Active" : "Paused"}
                          </div>
                        </div>
                      </card_1.CardContent>
                    </card_1.Card>
                  );
                })
              )}
            </section>
          )}

          {activeTab === "ingredients" && (
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {ingredients.length === 0 ? (
                <empty_1.Empty className="bg-card/50">
                  <empty_1.EmptyHeader>
                    <empty_1.EmptyMedia variant="icon">
                      <lucide_react_1.ChefHatIcon />
                    </empty_1.EmptyMedia>
                    <empty_1.EmptyTitle>No ingredients yet</empty_1.EmptyTitle>
                    <empty_1.EmptyDescription>
                      Add ingredients to keep recipe scaling and costing
                      accurate.
                    </empty_1.EmptyDescription>
                  </empty_1.EmptyHeader>
                </empty_1.Empty>
              ) : (
                ingredients.map((ingredient) => (
                  <card_1.Card className="shadow-sm" key={ingredient.id}>
                    <card_1.CardHeader className="space-y-2">
                      <card_1.CardTitle className="font-semibold text-lg">
                        {ingredient.name}
                      </card_1.CardTitle>
                      <div className="flex flex-wrap gap-2">
                        {ingredient.category ? (
                          <badge_1.Badge variant="secondary">
                            {ingredient.category.toUpperCase()}
                          </badge_1.Badge>
                        ) : null}
                        {(ingredient.allergens ?? [])
                          .slice(0, 2)
                          .map((allergen) => (
                            <badge_1.Badge key={allergen} variant="outline">
                              {allergen.toUpperCase()}
                            </badge_1.Badge>
                          ))}
                      </div>
                    </card_1.CardHeader>
                    <card_1.CardContent className="grid grid-cols-2 gap-3 text-sm">
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
                    </card_1.CardContent>
                  </card_1.Card>
                ))
              )}
            </section>
          )}

          {activeTab === "menus" && (
            <empty_1.Empty className="bg-card/50">
              <empty_1.EmptyHeader>
                <empty_1.EmptyMedia variant="icon">
                  <lucide_react_1.BookOpenIcon />
                </empty_1.EmptyMedia>
                <empty_1.EmptyTitle>Menus are coming next</empty_1.EmptyTitle>
                <empty_1.EmptyDescription>
                  Menus will bundle dishes into event-ready collections with
                  pricing and dietary breakdowns.
                </empty_1.EmptyDescription>
              </empty_1.EmptyHeader>
            </empty_1.Empty>
          )}

          {activeTab === "costing" && (
            <section className="grid gap-4 lg:grid-cols-2">
              {dishes.length === 0 ? (
                <empty_1.Empty className="bg-card/50">
                  <empty_1.EmptyHeader>
                    <empty_1.EmptyMedia variant="icon">
                      <lucide_react_1.BookOpenIcon />
                    </empty_1.EmptyMedia>
                    <empty_1.EmptyTitle>No costing data yet</empty_1.EmptyTitle>
                    <empty_1.EmptyDescription>
                      Add dishes with pricing and cost details to see margins.
                    </empty_1.EmptyDescription>
                  </empty_1.EmptyHeader>
                </empty_1.Empty>
              ) : (
                dishes.map((dish) => {
                  const margin = getDishMargin(dish);
                  return (
                    <card_1.Card className="shadow-sm" key={dish.id}>
                      <card_1.CardHeader className="space-y-1">
                        <card_1.CardTitle className="text-base">
                          {dish.name}
                        </card_1.CardTitle>
                        <div className="text-muted-foreground text-sm">
                          Recipe: {dish.recipe_name ?? "Unlinked"}
                        </div>
                      </card_1.CardHeader>
                      <card_1.CardContent className="grid grid-cols-3 gap-3 text-sm">
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
                      </card_1.CardContent>
                    </card_1.Card>
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
exports.default = KitchenRecipesPage;
