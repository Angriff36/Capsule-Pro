/**
 * Individual Purchase Order API Endpoints
 *
 * GET    /api/inventory/purchase-orders/[id]      - Get a single purchase order by ID
 */
import { NextResponse } from "next/server";
import type { PurchaseOrderWithDetails } from "../types";
type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};
/**
 * GET /api/inventory/purchase-orders/[id] - Get a single purchase order by ID
 */
export declare function GET(
  request: Request,
  context: RouteContext
): Promise<
  | NextResponse<{
      message: string;
    }>
  | NextResponse<PurchaseOrderWithDetails>
>;
//# sourceMappingURL=route.d.ts.map
