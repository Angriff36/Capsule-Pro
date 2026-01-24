/**
 * @module UpdateDishAllergens
 * @intent Handle API requests to update allergen and dietary tag information for dishes
 * @responsibility Validate request, update dish allergens in database, return success/error response
 * @domain Kitchen
 * @tags allergens, api, dishes, dietary-restrictions
 * @canonical true
 */
import { type NextRequest, NextResponse } from "next/server";
export declare const runtime = "nodejs";
export declare const dynamic = "force-dynamic";
export declare function POST(request: NextRequest): Promise<
  | NextResponse<{
      error: string;
    }>
  | NextResponse<{
      success: boolean;
      dish: {
        id: string;
        name: string;
        allergens: string[];
        dietaryTags: string[];
      };
    }>
>;
//# sourceMappingURL=route.d.ts.map
