/**
 * Complete Purchase Order Receiving Workflow
 *
 * POST   /api/inventory/purchase-orders/[id]/complete      - Complete receiving and update inventory
 */
import { NextResponse } from "next/server";
type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};
/**
 * POST /api/inventory/purchase-orders/[id]/complete - Complete receiving workflow
 */
export declare function POST(
  request: Request,
  context: RouteContext
): Promise<
  NextResponse<{
    message: any;
  }>
>;
//# sourceMappingURL=route.d.ts.map
