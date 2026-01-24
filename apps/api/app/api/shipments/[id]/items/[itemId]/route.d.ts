/**
 * Individual Shipment Item API Endpoints
 *
 * PUT    /api/shipments/[id]/items/[itemId]  - Update a shipment item
 * DELETE /api/shipments/[id]/items/[itemId]  - Delete a shipment item
 */
import { NextResponse } from "next/server";
export declare function PUT(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
      itemId: string;
    }>;
  }
): Promise<
  | NextResponse<{
      id: string;
      tenant_id: string;
      shipment_id: string;
      item_id: string;
      quantity_shipped: number;
      quantity_received: number;
      quantity_damaged: number;
      unit_id: number | null;
      unit_cost: number | null;
      total_cost: number;
      condition: string | null;
      condition_notes: string | null;
      lot_number: string | null;
      expiration_date: Date | null;
      created_at: Date;
      updated_at: Date;
      item: {
        id: string;
        name: string;
        item_number: string;
      } | null;
    }>
  | NextResponse<{
      message: any;
    }>
>;
export declare function DELETE(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
      itemId: string;
    }>;
  }
): Promise<
  NextResponse<{
    message: string;
  }>
>;
//# sourceMappingURL=route.d.ts.map
