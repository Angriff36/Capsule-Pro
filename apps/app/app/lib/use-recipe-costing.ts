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
  category: RecipeCategory | null;
  cookTimeMinutes: number | null;
  createdAt: Date;
  cuisineType: CuisineType | null;
  currentVersion: {
    id: string;
    versionNumber: number;
    totalCost: number | null;
    costPerYield: number | null;
    costCalculatedAt: Date | null;
  } | null;
  description: string | null;
  id: string;
  isActive: boolean;
  name: string;
  portionSize: number | null;
  portionUnitId: number | null;
  prepTimeMinutes: number | null;
  tenantId: string;
  updatedAt: Date;
  yieldQuantity: number | null;
  yieldUnitId: number | null;
}

export interface RecipeCostBreakdown {
  costPerPortion: number | null;
  costPerYield: number;
  ingredients: IngredientCostBreakdown[];
  lastCalculated: Date | string | null;
  recipe: {
    id: string;
    name: string;
    description: string | null;
    yieldQuantity: number | null;
    yieldUnit: string | null;
    portionSize: number | null;
    portionUnit: string | null;
  };
  totalCost: number;
}

export interface IngredientCostBreakdown {
  adjustedQuantity: number;
  cost: number;
  hasInventoryItem: boolean;
  id: string;
  inventoryItemId: string | null;
  name: string;
  quantity: number;
  recipeIngredientId: string;
  unit: string;
  unitCost: number;
  wasteFactor: number;
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
  category?: RecipeCategory;
  cuisineType?: CuisineType;
  isActive?: boolean;
  limit?: number;
  page?: number;
  search?: string;
  tag?: string;
}

export interface ScaleRecipeRequest {
  currentYield: number;
  targetPortions: number;
}

export interface ScaledRecipeCost {
  originalCost: number;
  scaledCostPerPortion: number | null;
  scaledCostPerYield: number;
  scaledTotalCost: number;
  scaleFactor: number;
}

export interface UpdateWasteFactorRequest {
  recipeIngredientId: string;
  wasteFactor: number;
}

interface ManifestResponse<T> {
  data?: T;
  message?: string;
  success: boolean;
}

function unwrapManifestResponse<T>(payload: T | ManifestResponse<T>): T {
  if (
    payload &&
    typeof payload === "object" &&
    "success" in payload &&
    "data" in payload
  ) {
    return (payload as ManifestResponse<T>).data as T;
  }

  return payload as T;
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
  const query: Record<string, string | number> = {};

  if (filters.search) {
    query.search = filters.search;
  }
  if (filters.category) {
    query.category = filters.category;
  }
  if (filters.cuisineType) {
    query.cuisineType = filters.cuisineType;
  }
  if (filters.tag) {
    query.tag = filters.tag;
  }
  if (filters.isActive !== undefined) {
    query.isActive = String(filters.isActive);
  }
  if (filters.page) {
    query.page = filters.page;
  }
  if (filters.limit) {
    query.limit = filters.limit;
  }

  const result = await generatedListRecipes(
    Object.keys(query).length > 0 ? query : undefined
  );
  return {
    data: result.data as unknown as Recipe[],
    pagination: result.pagination,
  };
}

/**
 * Get recipe cost breakdown
 */
export async function getRecipeCost(
  recipeVersionId: string
): Promise<RecipeCostBreakdown> {
  const response = await apiFetch(
    `/api/kitchen/recipes/${recipeVersionId}/cost`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch recipe cost");
  }

  return unwrapManifestResponse<RecipeCostBreakdown>(await response.json());
}

/**
 * Recalculate recipe costs
 */
export async function recalculateRecipeCost(
  recipeVersionId: string
): Promise<RecipeCostBreakdown> {
  const response = await apiFetch(
    `/api/kitchen/recipes/${recipeVersionId}/cost`,
    {
      method: "POST",
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to recalculate recipe cost");
  }

  return unwrapManifestResponse<RecipeCostBreakdown>(await response.json());
}

/**
 * Scale recipe to target portions
 */
export async function scaleRecipe(
  recipeVersionId: string,
  request: ScaleRecipeRequest
): Promise<ScaledRecipeCost> {
  const response = await apiFetch(
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

  return unwrapManifestResponse<ScaledRecipeCost>(await response.json());
}

/**
 * Update ingredient waste factor
 */
export async function updateWasteFactor(
  recipeVersionId: string,
  request: UpdateWasteFactorRequest
): Promise<{ success: boolean; message: string }> {
  const response = await apiFetch(
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

  return unwrapManifestResponse<{ success: boolean; message: string }>(
    await response.json()
  );
}

/**
 * Update event budgets using this recipe
 */
export async function updateEventBudgets(
  recipeVersionId: string
): Promise<{ success: boolean; message: string; affectedEvents: number }> {
  const response = await apiFetch(
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

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/app/lib/api";
// NOTE: Keeping apiFetch for getRecipeCost, recalculateRecipeCost, scaleRecipe, updateWasteFactor, updateEventBudgets (no generated equivalents for custom sub-endpoints)
import { listRecipes as generatedListRecipes } from "@/app/lib/manifest-client.generated";

export interface UseRecipeCostResult {
  data: RecipeCostBreakdown | null;
  error: Error | null;
  loading: boolean;
  recalculate: () => Promise<void>;
  refetch: () => Promise<void>;
}

export function useRecipeCost(recipeVersionId: string): UseRecipeCostResult {
  const [data, setData] = useState<RecipeCostBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCost = useCallback(async () => {
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
  }, [recipeVersionId]);

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
  }, [recipeVersionId, fetchCost]);

  return { data, loading, error, refetch: fetchCost, recalculate };
}

export interface UseRecipesResult {
  data: Recipe[];
  error: Error | null;
  loading: boolean;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null;
  refetch: () => Promise<void>;
}

export function useRecipes(filters: RecipeListFilters = {}): UseRecipesResult {
  const { search, category, cuisineType, tag, isActive, page, limit } = filters;
  const [data, setData] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null>(null);

  const fetchRecipes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listRecipes({
        search,
        category,
        cuisineType,
        tag,
        isActive,
        page,
        limit,
      });
      setData(result.data);
      setPagination(result.pagination);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [search, category, cuisineType, tag, isActive, page, limit]);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

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
  if (!category) {
    return "All Categories";
  }
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
  if (!cuisineType) {
    return "All Cuisines";
  }
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

export { formatCurrency } from "@repo/design-system/lib/format-currency";

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
  if (!date) {
    return "Never";
  }
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
  if (totalCost === 0) {
    return 0;
  }
  return (ingredientCost / totalCost) * 100;
}
