import { NextResponse } from "next/server";
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
  | NextResponse<{
      error: string;
    }>
  | NextResponse<ScaledRecipeCost>
>;
export declare function PATCH(
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
  | NextResponse<{
      success: boolean;
    }>
>;
//# sourceMappingURL=route.d.ts.map
