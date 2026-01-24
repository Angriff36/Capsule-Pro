"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.RecipesPageClient = void 0;
const badge_1 = require("@repo/design-system/components/ui/badge");
const button_1 = require("@repo/design-system/components/ui/button");
const card_1 = require("@repo/design-system/components/ui/card");
const input_1 = require("@repo/design-system/components/ui/input");
const select_1 = require("@repo/design-system/components/ui/select");
const table_1 = require("@repo/design-system/components/ui/table");
const lucide_react_1 = require("lucide-react");
const react_1 = require("react");
const sonner_1 = require("sonner");
const use_recipe_costing_1 = require("../../../lib/use-recipe-costing");
const RecipesPageClient = () => {
  const [recipes, setRecipes] = (0, react_1.useState)([]);
  const [isLoading, setIsLoading] = (0, react_1.useState)(true);
  const [page, setPage] = (0, react_1.useState)(1);
  const [totalPages, setTotalPages] = (0, react_1.useState)(1);
  const [totalCount, setTotalCount] = (0, react_1.useState)(0);
  const [categoryFilter, setCategoryFilter] = (0, react_1.useState)("all");
  const [cuisineFilter, setCuisineFilter] = (0, react_1.useState)("all");
  const [activeFilter, setActiveFilter] = (0, react_1.useState)("all");
  const [searchQuery, setSearchQuery] = (0, react_1.useState)("");
  const loadRecipes = (0, react_1.useCallback)(async () => {
    setIsLoading(true);
    try {
      const response = await (0, use_recipe_costing_1.listRecipes)({
        page,
        limit: 20,
        category: categoryFilter === "all" ? undefined : categoryFilter,
        cuisineType: cuisineFilter === "all" ? undefined : cuisineFilter,
        isActive: activeFilter === "all" ? undefined : activeFilter,
      });
      setRecipes(response.data);
      setTotalPages(response.pagination.totalPages);
      setTotalCount(response.pagination.total);
    } catch (error) {
      console.error("Failed to load recipes:", error);
      sonner_1.toast.error(
        error instanceof Error ? error.message : "Failed to load recipes"
      );
    } finally {
      setIsLoading(false);
    }
  }, [page, categoryFilter, cuisineFilter, activeFilter]);
  (0, react_1.useEffect)(() => {
    loadRecipes();
  }, [loadRecipes]);
  const filteredRecipes = recipes.filter((recipe) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      recipe.name.toLowerCase().includes(query) ||
      (recipe.description && recipe.description.toLowerCase().includes(query))
    );
  });
  const handlePreviousPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };
  const handleNextPage = () => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  };
  // Calculate summary stats
  const recipesWithCost = recipes.filter(
    (r) => r.currentVersion?.totalCost !== null
  );
  const totalRecipeValue = recipesWithCost.reduce(
    (sum, recipe) => sum + (recipe.currentVersion?.totalCost || 0),
    0
  );
  const averageCostPerYield =
    recipesWithCost.length > 0 ? totalRecipeValue / recipesWithCost.length : 0;
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <card_1.Card>
          <card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <card_1.CardTitle className="text-sm font-medium">
              Total Recipes
            </card_1.CardTitle>
            <lucide_react_1.CalculatorIcon className="h-4 w-4 text-muted-foreground" />
          </card_1.CardHeader>
          <card_1.CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
            <p className="text-xs text-muted-foreground">
              {recipes.filter((r) => r.isActive).length} active
            </p>
          </card_1.CardContent>
        </card_1.Card>
        <card_1.Card>
          <card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <card_1.CardTitle className="text-sm font-medium">
              With Cost Data
            </card_1.CardTitle>
            <lucide_react_1.DollarSignIcon className="h-4 w-4 text-muted-foreground" />
          </card_1.CardHeader>
          <card_1.CardContent>
            <div className="text-2xl font-bold">{recipesWithCost.length}</div>
            <p className="text-xs text-muted-foreground">
              {((recipesWithCost.length / recipes.length) * 100).toFixed(0)}% of
              total
            </p>
          </card_1.CardContent>
        </card_1.Card>
        <card_1.Card>
          <card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <card_1.CardTitle className="text-sm font-medium">
              Total Value
            </card_1.CardTitle>
            <lucide_react_1.DollarSignIcon className="h-4 w-4 text-muted-foreground" />
          </card_1.CardHeader>
          <card_1.CardContent>
            <div className="text-2xl font-bold">
              {(0, use_recipe_costing_1.formatCurrency)(totalRecipeValue)}
            </div>
            <p className="text-xs text-muted-foreground">
              Sum of all recipe costs
            </p>
          </card_1.CardContent>
        </card_1.Card>
        <card_1.Card>
          <card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <card_1.CardTitle className="text-sm font-medium">
              Avg Cost/Yield
            </card_1.CardTitle>
            <lucide_react_1.DollarSignIcon className="h-4 w-4 text-muted-foreground" />
          </card_1.CardHeader>
          <card_1.CardContent>
            <div className="text-2xl font-bold">
              {(0, use_recipe_costing_1.formatCurrency)(averageCostPerYield)}
            </div>
            <p className="text-xs text-muted-foreground">
              Per yield unit average
            </p>
          </card_1.CardContent>
        </card_1.Card>
      </div>

      {/* Filters */}
      <card_1.Card>
        <card_1.CardHeader>
          <card_1.CardTitle>Recipe Costing</card_1.CardTitle>
          <card_1.CardDescription>
            View and manage recipe costs with detailed ingredient breakdowns
          </card_1.CardDescription>
        </card_1.CardHeader>
        <card_1.CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <input_1.Input
              className="max-w-sm"
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search recipes..."
              value={searchQuery}
            />
            <select_1.Select
              onValueChange={(value) => setCategoryFilter(value)}
              value={categoryFilter}
            >
              <select_1.SelectTrigger className="w-[180px]">
                <select_1.SelectValue placeholder="Category" />
              </select_1.SelectTrigger>
              <select_1.SelectContent>
                <select_1.SelectItem value="all">
                  All Categories
                </select_1.SelectItem>
                {(0, use_recipe_costing_1.getRecipeCategories)().map((cat) => (
                  <select_1.SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </select_1.SelectItem>
                ))}
              </select_1.SelectContent>
            </select_1.Select>
            <select_1.Select
              onValueChange={(value) => setCuisineFilter(value)}
              value={cuisineFilter}
            >
              <select_1.SelectTrigger className="w-[180px]">
                <select_1.SelectValue placeholder="Cuisine" />
              </select_1.SelectTrigger>
              <select_1.SelectContent>
                <select_1.SelectItem value="all">
                  All Cuisines
                </select_1.SelectItem>
                {(0, use_recipe_costing_1.getCuisineTypes)().map((cuisine) => (
                  <select_1.SelectItem
                    key={cuisine.value}
                    value={cuisine.value}
                  >
                    {cuisine.label}
                  </select_1.SelectItem>
                ))}
              </select_1.SelectContent>
            </select_1.Select>
            <select_1.Select
              onValueChange={(value) =>
                setActiveFilter(value === "all" ? "all" : value === "true")
              }
              value={activeFilter.toString()}
            >
              <select_1.SelectTrigger className="w-[180px]">
                <select_1.SelectValue placeholder="Status" />
              </select_1.SelectTrigger>
              <select_1.SelectContent>
                <select_1.SelectItem value="all">
                  All Status
                </select_1.SelectItem>
                <select_1.SelectItem value="true">Active</select_1.SelectItem>
                <select_1.SelectItem value="false">
                  Inactive
                </select_1.SelectItem>
              </select_1.SelectContent>
            </select_1.Select>
          </div>
        </card_1.CardContent>
      </card_1.Card>

      {/* Recipe Table */}
      <card_1.Card>
        <card_1.CardContent className="p-0">
          <table_1.Table>
            <table_1.TableHeader>
              <table_1.TableRow>
                <table_1.TableHead>Recipe Name</table_1.TableHead>
                <table_1.TableHead>Category</table_1.TableHead>
                <table_1.TableHead>Cuisine</table_1.TableHead>
                <table_1.TableHead className="text-right">
                  Yield
                </table_1.TableHead>
                <table_1.TableHead className="text-right">
                  Total Cost
                </table_1.TableHead>
                <table_1.TableHead className="text-right">
                  Cost/Yield
                </table_1.TableHead>
                <table_1.TableHead>Status</table_1.TableHead>
                <table_1.TableHead />
              </table_1.TableRow>
            </table_1.TableHeader>
            <table_1.TableBody>
              {isLoading ? (
                <table_1.TableRow>
                  <table_1.TableCell className="text-center py-8" colSpan={8}>
                    Loading recipes...
                  </table_1.TableCell>
                </table_1.TableRow>
              ) : filteredRecipes.length === 0 ? (
                <table_1.TableRow>
                  <table_1.TableCell className="text-center py-8" colSpan={8}>
                    No recipes found
                  </table_1.TableCell>
                </table_1.TableRow>
              ) : (
                filteredRecipes.map((recipe) => (
                  <table_1.TableRow key={recipe.id}>
                    <table_1.TableCell className="font-medium">
                      <div>
                        <div className="font-medium">{recipe.name}</div>
                        {recipe.description && (
                          <div className="text-sm text-muted-foreground truncate max-w-md">
                            {recipe.description}
                          </div>
                        )}
                      </div>
                    </table_1.TableCell>
                    <table_1.TableCell>
                      {recipe.category ? (
                        <badge_1.Badge variant="outline">
                          {(0, use_recipe_costing_1.getRecipeCategoryLabel)(
                            recipe.category
                          )}
                        </badge_1.Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </table_1.TableCell>
                    <table_1.TableCell>
                      {recipe.cuisineType ? (
                        <badge_1.Badge variant="outline">
                          {(0, use_recipe_costing_1.getCuisineTypeLabel)(
                            recipe.cuisineType
                          )}
                        </badge_1.Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </table_1.TableCell>
                    <table_1.TableCell className="text-right">
                      {recipe.yieldQuantity ? (
                        <span>
                          {recipe.yieldQuantity}{" "}
                          {recipe.yieldUnitId ? "units" : ""}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </table_1.TableCell>
                    <table_1.TableCell className="text-right">
                      {recipe.currentVersion?.totalCost !== null &&
                      recipe.currentVersion?.totalCost !== undefined ? (
                        <span className="font-medium">
                          {(0, use_recipe_costing_1.formatCurrency)(
                            recipe.currentVersion.totalCost
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          Not calculated
                        </span>
                      )}
                    </table_1.TableCell>
                    <table_1.TableCell className="text-right">
                      {recipe.currentVersion?.costPerYield !== null &&
                      recipe.currentVersion?.costPerYield !== undefined ? (
                        <span>
                          {(0, use_recipe_costing_1.formatCurrency)(
                            recipe.currentVersion.costPerYield
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </table_1.TableCell>
                    <table_1.TableCell>
                      <badge_1.Badge
                        variant={recipe.isActive ? "default" : "secondary"}
                      >
                        {recipe.isActive ? "Active" : "Inactive"}
                      </badge_1.Badge>
                    </table_1.TableCell>
                    <table_1.TableCell>
                      <button_1.Button asChild size="sm" variant="ghost">
                        <a
                          href={`/inventory/recipes/${recipe.currentVersion?.id || recipe.id}`}
                        >
                          View Details
                        </a>
                      </button_1.Button>
                    </table_1.TableCell>
                  </table_1.TableRow>
                ))
              )}
            </table_1.TableBody>
          </table_1.Table>
        </card_1.CardContent>
      </card_1.Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, totalCount)} of{" "}
          {totalCount} recipes
        </div>
        <div className="flex items-center gap-2">
          <button_1.Button
            disabled={page === 1}
            onClick={handlePreviousPage}
            size="sm"
            variant="outline"
          >
            <lucide_react_1.ChevronLeftIcon className="h-4 w-4" />
            Previous
          </button_1.Button>
          <div className="text-sm">
            Page {page} of {totalPages}
          </div>
          <button_1.Button
            disabled={page === totalPages}
            onClick={handleNextPage}
            size="sm"
            variant="outline"
          >
            Next
            <lucide_react_1.ChevronRightIcon className="h-4 w-4" />
          </button_1.Button>
        </div>
      </div>
    </div>
  );
};
exports.RecipesPageClient = RecipesPageClient;
