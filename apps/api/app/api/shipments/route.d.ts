/**
 * Shipment API Endpoints
 *
 * GET    /api/shipments      - List shipments with pagination and filters
 * POST   /api/shipments      - Create a new shipment
 */
import { NextResponse } from "next/server";
export declare function GET(request: Request): Promise<
  | NextResponse<{
      message: string;
    }>
  | NextResponse<{
      data: {
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
        created_at: Date;
        updated_at: Date;
        deleted_at: Date | null;
      }[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>
>;
export declare function POST(request: Request): Promise<
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
      created_at: Date;
      updated_at: Date;
      deleted_at: Date | null;
    }>
  | NextResponse<{
      message: any;
    }>
>;
//# sourceMappingURL=route.d.ts.map
