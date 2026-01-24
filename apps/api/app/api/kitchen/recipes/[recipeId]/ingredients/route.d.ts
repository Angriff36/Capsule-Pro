/**
 * @module RecipeIngredientsAPI
 * @intent Fetch recipe ingredients for mobile viewer
 * @responsibility Provide ingredients list for a recipe
 * @domain Kitchen
 * @tags recipes, ingredients, api, mobile
 * @canonical true
 */
import { NextResponse } from "next/server";
export type RecipeIngredient = {
  id: string;
  name: string;
  quantity: number;
  unitCode: string;
  notes: string | null;
  isOptional: boolean;
  orderIndex: number;
};
/**
 * GET /api/kitchen/recipes/[recipeId]/ingredients
 * Fetch ingredients for the latest version of a recipe
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
  | NextResponse<{
      ingredients: {
        id: string;
        name: string;
        quantity: number;
        unitCode: string;
        notes: string | null;
        isOptional: boolean;
        orderIndex: number;
      }[];
    }>
>;
//# sourceMappingURL=route.d.ts.map
