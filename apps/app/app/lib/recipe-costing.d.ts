export type UnitConversion = {
  fromUnitId: number;
  toUnitId: number;
  multiplier: number;
};
export type RecipeCostBreakdown = {
  totalCost: number;
  costPerYield: number;
  costPerPortion?: number;
  ingredients: IngredientCostBreakdown[];
};
export type IngredientCostBreakdown = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  wasteFactor: number;
  adjustedQuantity: number;
  unitCost: number;
  cost: number;
  hasInventoryItem: boolean;
};
export type PortionScaleRequest = {
  recipeVersionId: string;
  targetPortions: number;
  currentYield: number;
};
export type ScaledRecipeCost = {
  scaledTotalCost: number;
  scaledCostPerYield: number;
  scaleFactor: number;
  originalCost: number;
};
export declare const getRecipeCostSummary: (
  recipeVersionId: string
) => Promise<RecipeCostBreakdown | null>;
export declare const recalculateRecipeCosts: (
  recipeVersionId: string
) => Promise<RecipeCostBreakdown | null>;
export declare const scaleRecipeCost: (
  recipeVersionId: string,
  targetPortions: number,
  currentYield: number
) => Promise<ScaledRecipeCost>;
export declare const updateRecipeIngredientWasteFactor: (
  recipeIngredientId: string,
  wasteFactor: number
) => Promise<void>;
export declare const updateEventBudgetsForRecipe: (
  recipeVersionId: string
) => Promise<void>;
//# sourceMappingURL=recipe-costing.d.ts.map
