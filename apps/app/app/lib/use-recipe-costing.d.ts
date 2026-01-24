/**
 * Recipe Costing Client API Functions
 *
 * Client-side functions for interacting with recipe costing API.
 */
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
/**
 * List recipes with pagination and filters
 */
export declare function listRecipes(
  filters?: RecipeListFilters
): Promise<RecipeListResponse>;
/**
 * Get recipe cost breakdown
 */
export declare function getRecipeCost(
  recipeVersionId: string
): Promise<RecipeCostBreakdown>;
/**
 * Recalculate recipe costs
 */
export declare function recalculateRecipeCost(
  recipeVersionId: string
): Promise<RecipeCostBreakdown>;
/**
 * Scale recipe to target portions
 */
export declare function scaleRecipe(
  recipeVersionId: string,
  request: ScaleRecipeRequest
): Promise<ScaledRecipeCost>;
/**
 * Update ingredient waste factor
 */
export declare function updateWasteFactor(
  recipeVersionId: string,
  request: UpdateWasteFactorRequest
): Promise<{
  success: boolean;
  message: string;
}>;
/**
 * Update event budgets using this recipe
 */
export declare function updateEventBudgets(recipeVersionId: string): Promise<{
  success: boolean;
  message: string;
  affectedEvents: number;
}>;
export interface UseRecipeCostResult {
  data: RecipeCostBreakdown | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  recalculate: () => Promise<void>;
}
export declare function useRecipeCost(
  recipeVersionId: string
): UseRecipeCostResult;
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
export declare function useRecipes(
  filters?: RecipeListFilters
): UseRecipesResult;
/**
 * Get label for recipe category
 */
export declare function getRecipeCategoryLabel(
  category: RecipeCategory | null | undefined
): string;
/**
 * Get label for cuisine type
 */
export declare function getCuisineTypeLabel(
  cuisineType: CuisineType | null | undefined
): string;
/**
 * Get all recipe categories
 */
export declare function getRecipeCategories(): {
  value: RecipeCategory;
  label: string;
}[];
/**
 * Get all cuisine types
 */
export declare function getCuisineTypes(): {
  value: CuisineType;
  label: string;
}[];
/**
 * Format currency value
 */
export declare function formatCurrency(value: number): string;
/**
 * Format quantity with fixed decimals
 */
export declare function formatQuantity(
  value: number,
  decimals?: number
): string;
/**
 * Format waste factor as percentage
 */
export declare function formatWasteFactor(wasteFactor: number): string;
/**
 * Format date for display
 */
export declare function formatDate(date: Date | string | null): string;
/**
 * Calculate cost percentage of total
 */
export declare function calculateCostPercentage(
  ingredientCost: number,
  totalCost: number
): number;
//# sourceMappingURL=use-recipe-costing.d.ts.map
