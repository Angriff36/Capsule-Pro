/**
 * Purchase Orders API Endpoints
 *
 * GET    /api/inventory/purchase-orders      - List purchase orders with pagination and filters
 */
import { NextResponse } from "next/server";
import type { PurchaseOrderWithDetails } from "./types";
/**
 * GET /api/inventory/purchase-orders - List purchase orders with pagination and filters
 */
export declare function GET(request: Request): Promise<
  | NextResponse<{
      message: string;
    }>
  | NextResponse<{
      data: PurchaseOrderWithDetails[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>
>;
//# sourceMappingURL=route.d.ts.map
