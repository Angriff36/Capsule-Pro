/**
 * Stock Adjustment API Endpoint
 *
 * POST   /api/inventory/stock-levels/adjust      - Create a manual stock adjustment
 */
import { NextResponse } from "next/server";
/**
 * POST /api/inventory/stock-levels/adjust - Create a manual stock adjustment
 */
export declare function POST(request: Request): Promise<
  NextResponse<{
    message: any;
  }>
>;
//# sourceMappingURL=route.d.ts.map
