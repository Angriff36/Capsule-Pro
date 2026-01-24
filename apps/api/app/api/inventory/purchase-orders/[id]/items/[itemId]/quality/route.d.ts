/**
 * Update Purchase Order Item Quality Status
 *
 * PUT    /api/inventory/purchase-orders/[id]/items/[itemId]/quality      - Update quality status for an item
 */
import { NextResponse } from "next/server";
type RouteContext = {
  params: Promise<{
    id: string;
    itemId: string;
  }>;
};
/**
 * PUT /api/inventory/purchase-orders/[id]/items/[itemId]/quality - Update quality status
 */
export declare function PUT(
  request: Request,
  context: RouteContext
): Promise<
  | NextResponse<{
      id: string;
      tenant_id: string;
      purchase_order_id: string;
      item_id: string;
      quantity_ordered: number;
      quantity_received: number;
      unit_id: number;
      unit_cost: number;
      total_cost: number;
      quality_status: string;
      discrepancy_type: string | null;
      discrepancy_amount: number | null;
      notes: string | null;
      created_at: Date;
      updated_at: Date;
      deleted_at: Date | null;
    }>
  | NextResponse<{
      message: any;
    }>
>;
//# sourceMappingURL=route.d.ts.map
