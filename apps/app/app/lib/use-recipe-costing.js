/**
 * Recipe Costing Client API Functions
 *
 * Client-side functions for interacting with recipe costing API.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.listRecipes = listRecipes;
exports.getRecipeCost = getRecipeCost;
exports.recalculateRecipeCost = recalculateRecipeCost;
exports.scaleRecipe = scaleRecipe;
exports.updateWasteFactor = updateWasteFactor;
exports.updateEventBudgets = updateEventBudgets;
exports.useRecipeCost = useRecipeCost;
exports.useRecipes = useRecipes;
exports.getRecipeCategoryLabel = getRecipeCategoryLabel;
exports.getCuisineTypeLabel = getCuisineTypeLabel;
exports.getRecipeCategories = getRecipeCategories;
exports.getCuisineTypes = getCuisineTypes;
exports.formatCurrency = formatCurrency;
exports.formatQuantity = formatQuantity;
exports.formatWasteFactor = formatWasteFactor;
exports.formatDate = formatDate;
exports.calculateCostPercentage = calculateCostPercentage;
// ============================================================================
// Recipes API
// ============================================================================
/**
 * List recipes with pagination and filters
 */
async function listRecipes(filters = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.category) params.set("category", filters.category);
  if (filters.cuisineType) params.set("cuisineType", filters.cuisineType);
  if (filters.tag) params.set("tag", filters.tag);
  if (filters.isActive !== undefined)
    params.set("isActive", filters.isActive.toString());
  if (filters.page) params.set("page", filters.page.toString());
  if (filters.limit) params.set("limit", filters.limit.toString());
  const response = await fetch(`/api/kitchen/recipes?${params.toString()}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch recipes");
  }
  return response.json();
}
/**
 * Get recipe cost breakdown
 */
async function getRecipeCost(recipeVersionId) {
  const response = await fetch(`/api/kitchen/recipes/${recipeVersionId}/cost`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch recipe cost");
  }
  return response.json();
}
/**
 * Recalculate recipe costs
 */
async function recalculateRecipeCost(recipeVersionId) {
  const response = await fetch(`/api/kitchen/recipes/${recipeVersionId}/cost`, {
    method: "POST",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to recalculate recipe cost");
  }
  return response.json();
}
/**
 * Scale recipe to target portions
 */
async function scaleRecipe(recipeVersionId, request) {
  const response = await fetch(
    `/api/kitchen/recipes/${recipeVersionId}/scale`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    }
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to scale recipe");
  }
  return response.json();
}
/**
 * Update ingredient waste factor
 */
async function updateWasteFactor(recipeVersionId, request) {
  const response = await fetch(
    `/api/kitchen/recipes/${recipeVersionId}/scale`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    }
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to update waste factor");
  }
  return response.json();
}
/**
 * Update event budgets using this recipe
 */
async function updateEventBudgets(recipeVersionId) {
  const response = await fetch(
    `/api/kitchen/recipes/${recipeVersionId}/update-budgets`,
    {
      method: "POST",
    }
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to update event budgets");
  }
  return response.json();
}
// ============================================================================
// React Hooks
// ============================================================================
const react_1 = require("react");
function useRecipeCost(recipeVersionId) {
  const [data, setData] = (0, react_1.useState)(null);
  const [loading, setLoading] = (0, react_1.useState)(true);
  const [error, setError] = (0, react_1.useState)(null);
  const fetchCost = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getRecipeCost(recipeVersionId);
      setData(result);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };
  const recalculate = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await recalculateRecipeCost(recipeVersionId);
      setData(result);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };
  (0, react_1.useEffect)(() => {
    if (recipeVersionId) {
      fetchCost();
    }
  }, [recipeVersionId]);
  return { data, loading, error, refetch: fetchCost, recalculate };
}
function useRecipes(filters = {}) {
  const [data, setData] = (0, react_1.useState)([]);
  const [loading, setLoading] = (0, react_1.useState)(true);
  const [error, setError] = (0, react_1.useState)(null);
  const [pagination, setPagination] = (0, react_1.useState)(null);
  const fetchRecipes = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listRecipes(filters);
      setData(result.data);
      setPagination(result.pagination);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };
  (0, react_1.useEffect)(() => {
    fetchRecipes();
  }, [JSON.stringify(filters)]);
  return { data, loading, error, pagination, refetch: fetchRecipes };
}
// ============================================================================
// Helper Functions
// ============================================================================
/**
 * Get label for recipe category
 */
function getRecipeCategoryLabel(category) {
  if (!category) return "All Categories";
  return category
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
/**
 * Get label for cuisine type
 */
function getCuisineTypeLabel(cuisineType) {
  if (!cuisineType) return "All Cuisines";
  return cuisineType
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
/**
 * Get all recipe categories
 */
function getRecipeCategories() {
  const categories = [
    "appetizer",
    "soup",
    "salad",
    "entree",
    "side_dish",
    "dessert",
    "beverage",
    "sauce",
    "other",
  ];
  return categories.map((cat) => ({
    value: cat,
    label: getRecipeCategoryLabel(cat),
  }));
}
/**
 * Get all cuisine types
 */
function getCuisineTypes() {
  const cuisines = [
    "american",
    "italian",
    "french",
    "asian",
    "mexican",
    "mediterranean",
    "indian",
    "other",
  ];
  return cuisines.map((cuisine) => ({
    value: cuisine,
    label: getCuisineTypeLabel(cuisine),
  }));
}
/**
 * Format currency value
 */
function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}
/**
 * Format quantity with fixed decimals
 */
function formatQuantity(value, decimals = 2) {
  return value.toFixed(decimals);
}
/**
 * Format waste factor as percentage
 */
function formatWasteFactor(wasteFactor) {
  const percentage = (wasteFactor - 1) * 100;
  return `${percentage.toFixed(1)}%`;
}
/**
 * Format date for display
 */
function formatDate(date) {
  if (!date) return "Never";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}
/**
 * Calculate cost percentage of total
 */
function calculateCostPercentage(ingredientCost, totalCost) {
  if (totalCost === 0) return 0;
  return (ingredientCost / totalCost) * 100;
}
