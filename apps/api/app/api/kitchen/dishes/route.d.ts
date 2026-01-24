/**
 * @module DishesAPI
 * @intent List dishes with pagination and filtering
 * @responsibility Provide paginated list of dishes with allergen and dietary information
 * @domain Kitchen
 * @tags dishes, allergens, api, list
 * @canonical true
 */
import { NextResponse } from "next/server";
/**
 * GET /api/kitchen/dishes
 * List dishes with pagination and filters
 */
export declare function GET(request: Request): Promise<
  | NextResponse<{
      data: {
        id: string;
        description: string | null;
        category: string | null;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        allergens: string[];
        serviceStyle: string | null;
        minPrepLeadDays: number;
        maxPrepLeadDays: number | null;
        dietaryTags: string[];
        pricePerPerson: import("@prisma/client/runtime/client").Decimal | null;
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
