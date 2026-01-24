/**
 * @module RecipesAPI
 * @intent List recipes with pagination and filtering
 * @responsibility Provide paginated list of recipes for the current tenant
 * @domain Kitchen
 * @tags recipes, api, list
 * @canonical true
 */
import { NextResponse } from "next/server";
/**
 * GET /api/kitchen/recipes
 * List recipes with pagination and filters
 */
export declare function GET(request: Request): Promise<
  | NextResponse<{
      data: {
        id: string;
        description: string | null;
        category: string | null;
        name: string;
        tags: string[];
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        cuisineType: string | null;
      }[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>
  | NextResponse<{
      message: any;
    }>
>;
//# sourceMappingURL=route.d.ts.map
