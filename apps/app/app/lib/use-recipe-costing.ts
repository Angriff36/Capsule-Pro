/**
 * Recipe Costing Client API Functions
 *
 * Client-side functions for interacting with recipe costing API.
 */

// ============================================================================
// Type Definitions
// ============================================================================

export type RecipeCategory =
  | "appetizer"
  | "soup"
  | "salad"
  | "entree"
  | "side_dish"
  | "dessert"
  | "beverage"
  | "sauce"
  | "other";

export type CuisineType =
  | "american"
  | "italian"
  | "french"
  | "asian"
  | "mexican"
  | "mediterranean"
  | "indian"
  | "other";

export interface Recipe {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  category: RecipeCategory | null;
  cuisineType: CuisineType | null;
  yieldQuantity: number | null;
  yieldUnitId: number | null;
  portionSize: number | null;
  portionUnitId: number | null;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  isActive: boolean;
  currentVersion: {
    id: string;
    versionNumber: number;
    totalCost: number | null;
    costPerYield: number | null;
    costCalculatedAt: Date | null;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecipeCostBreakdown {
  totalCost: number;
  costPerYield: number;
  costPerPortion: number | null;
  lastCalculated: Date | null;
  ingredients: IngredientCostBreakdown[];
  recipe: {
    id: string;
    name: string;
    description: string | null;
    yieldQuantity: number | null;
    yieldUnit: string | null;
    portionSize: number | null;
    portionUnit: string | null;
  };
}

export interface IngredientCostBreakdown {
  id: string;
  recipeIngredientId: string;
  name: string;
  quantity: number;
  unit: string;
  wasteFactor: number;
  adjustedQuantity: number;
  unitCost: number;
  cost: number;
  hasInventoryItem: boolean;
  inventoryItemId: string | null;
}

export interface RecipeListResponse {
  data: Recipe[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface RecipeListFilters {
  search?: string;
  category?: RecipeCategory;
  cuisineType?: CuisineType;
  tag?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface ScaleRecipeRequest {
  targetPortions: number;
  currentYield: number;
}

export interface ScaledRecipeCost {
  scaledTotalCost: number;
  scaledCostPerYield: number;
  scaledCostPerPortion: number | null;
  scaleFactor: number;
  originalCost: number;
}

export interface UpdateWasteFactorRequest {
  recipeIngredientId: string;
  wasteFactor: number;
}

// ============================================================================
// Recipes API
// ============================================================================

/**
 * List recipes with pagination and filters
 */
export async function listRecipes(
  filters: RecipeListFilters = {}
): Promise<RecipeListResponse> {
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
export async function getRecipeCost(
  recipeVersionId: string
): Promise<RecipeCostBreakdown> {
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
export async function recalculateRecipeCost(
  recipeVersionId: string
): Promise<RecipeCostBreakdown> {
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
export async function scaleRecipe(
  recipeVersionId: string,
  request: ScaleRecipeRequest
): Promise<ScaledRecipeCost> {
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
export async function updateWasteFactor(
  recipeVersionId: string,
  request: UpdateWasteFactorRequest
): Promise<{ success: boolean; message: string }> {
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
export async function updateEventBudgets(
  recipeVersionId: string
): Promise<{ success: boolean; message: string; affectedEvents: number }> {
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

import { useEffect, useState } from "react";

export interface UseRecipeCostResult {
  data: RecipeCostBreakdown | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  recalculate: () => Promise<void>;
}

export function useRecipeCost(recipeVersionId: string): UseRecipeCostResult {
  const [data, setData] = useState<RecipeCostBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCost = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getRecipeCost(recipeVersionId);
      setData(result);
    } catch (err) {
      setError(err as Error);
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
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (recipeVersionId) {
      fetchCost();
    }
  }, [recipeVersionId]);

  return { data, loading, error, refetch: fetchCost, recalculate };
}

export interface UseRecipesResult {
  data: Recipe[];
  loading: boolean;
  error: Error | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null;
  refetch: () => Promise<void>;
}

export function useRecipes(filters: RecipeListFilters = {}): UseRecipesResult {
  const [data, setData] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null>(null);

  const fetchRecipes = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listRecipes(filters);
      setData(result.data);
      setPagination(result.pagination);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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
export function getRecipeCategoryLabel(
  category: RecipeCategory | null | undefined
): string {
  if (!category) return "All Categories";
  return category
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Get label for cuisine type
 */
export function getCuisineTypeLabel(
  cuisineType: CuisineType | null | undefined
): string {
  if (!cuisineType) return "All Cuisines";
  return cuisineType
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Get all recipe categories
 */
export function getRecipeCategories(): {
  value: RecipeCategory;
  label: string;
}[] {
  const categories: RecipeCategory[] = [
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
export function getCuisineTypes(): { value: CuisineType; label: string }[] {
  const cuisines: CuisineType[] = [
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
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

/**
 * Format quantity with fixed decimals
 */
export function formatQuantity(value: number, decimals = 2): string {
  return value.toFixed(decimals);
}

/**
 * Format waste factor as percentage
 */
export function formatWasteFactor(wasteFactor: number): string {
  const percentage = (wasteFactor - 1) * 100;
  return `${percentage.toFixed(1)}%`;
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string | null): string {
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
export function calculateCostPercentage(
  ingredientCost: number,
  totalCost: number
): number {
  if (totalCost === 0) return 0;
  return (ingredientCost / totalCost) * 100;
}
