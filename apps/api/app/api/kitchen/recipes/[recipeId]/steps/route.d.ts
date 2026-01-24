/**
 * @module RecipeStepsAPI
 * @intent Fetch recipe steps for mobile viewer with step-by-step instructions
 * @responsibility Provide paginated recipe steps for mobile recipe viewer
 * @domain Kitchen
 * @tags recipes, steps, api, mobile
 * @canonical true
 */
import { NextResponse } from "next/server";
export type RecipeStep = {
  stepNumber: number;
  instruction: string;
  durationMinutes: number | null;
  temperatureValue: number | null;
  temperatureUnit: string | null;
  equipmentNeeded: string[] | null;
  tips: string | null;
  videoUrl: string | null;
  imageUrl: string | null;
};
export type RecipeStepsResponse = {
  recipeId: string;
  recipeName: string;
  recipeVersionId: string;
  description: string | null;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  restTimeMinutes: number | null;
  yieldQuantity: number | null;
  yieldUnit: string | null;
  steps: RecipeStep[];
  totalDuration: number;
};
/**
 * GET /api/kitchen/recipes/[recipeId]/steps
 * Fetch recipe steps for the latest version of a recipe
 */
export declare function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      recipeId: string;
    }>;
  }
): Promise<
  | NextResponse<{
      error: string;
    }>
  | NextResponse<RecipeStepsResponse>
>;
//# sourceMappingURL=route.d.ts.map
