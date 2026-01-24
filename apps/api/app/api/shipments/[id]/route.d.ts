/**
 * Individual Shipment API Endpoints
 *
 * GET    /api/shipments/[id]  - Get a single shipment by ID
 * PUT    /api/shipments/[id]  - Update a shipment
 * DELETE /api/shipments/[id]  - Soft delete a shipment
 */
import { NextResponse } from "next/server";
export declare function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
): Promise<
  | NextResponse<{
      message: string;
    }>
  | NextResponse<{
      id: string;
      tenant_id: string;
      shipment_number: string;
      status: import("@repo/database").ShipmentStatus;
      event_id: string | null;
      supplier_id: string | null;
      location_id: string | null;
      scheduled_date: Date | null;
      shipped_date: Date | null;
      estimated_delivery_date: Date | null;
      actual_delivery_date: Date | null;
      total_items: number;
      shipping_cost: number | null;
      total_value: number | null;
      tracking_number: string | null;
      carrier: string | null;
      shipping_method: string | null;
      delivered_by: string | null;
      received_by: string | null;
      signature: string | null;
      notes: string | null;
      internal_notes: string | null;
      reference: string | null;
      created_at: Date;
      updated_at: Date;
      deleted_at: Date | null;
      items: {
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
        deleted_at: Date | null;
        item: {
          id: string;
          name: string;
          item_number: string;
        } | null;
      }[];
    }>
>;
export declare function PUT(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
): Promise<
  | NextResponse<{
      id: string;
      tenant_id: string;
      shipment_number: string;
      status: import("@repo/database").ShipmentStatus;
      event_id: string | null;
      supplier_id: string | null;
      location_id: string | null;
      scheduled_date: Date | null;
      shipped_date: Date | null;
      estimated_delivery_date: Date | null;
      actual_delivery_date: Date | null;
      total_items: number;
      shipping_cost: number | null;
      total_value: number | null;
      tracking_number: string | null;
      carrier: string | null;
      shipping_method: string | null;
      delivered_by: string | null;
      received_by: string | null;
      signature: string | null;
      notes: string | null;
      internal_notes: string | null;
      reference: string | null;
      created_at: Date;
      updated_at: Date;
      deleted_at: Date | null;
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
    }>;
  }
): Promise<
  NextResponse<{
    message: string;
  }>
>;
//# sourceMappingURL=route.d.ts.map
