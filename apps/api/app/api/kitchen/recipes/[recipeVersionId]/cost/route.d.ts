import { NextResponse } from "next/server";
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
export declare function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      recipeVersionId: string;
    }>;
  }
): Promise<
  | NextResponse<{
      error: string;
    }>
  | NextResponse<RecipeCostBreakdown>
>;
export declare function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      recipeVersionId: string;
    }>;
  }
): Promise<
  | NextResponse<RecipeCostBreakdown>
  | NextResponse<{
      error: string;
    }>
>;
//# sourceMappingURL=route.d.ts.map
