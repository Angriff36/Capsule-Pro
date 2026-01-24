/**
 * Stock Levels API Endpoints
 *
 * GET    /api/inventory/stock-levels      - List stock levels with pagination and filters
 */
import { NextResponse } from "next/server";
import type { StockLevelWithStatus } from "./types";
/**
 * GET /api/inventory/stock-levels - List stock levels with pagination and filters
 */
export declare function GET(request: Request): Promise<
  | NextResponse<{
      message: string;
    }>
  | NextResponse<{
      data: StockLevelWithStatus[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
      summary: {
        totalItems: number;
        totalValue: number;
        belowParCount: number;
        outOfStockCount: number;
      };
    }>
>;
//# sourceMappingURL=route.d.ts.map
