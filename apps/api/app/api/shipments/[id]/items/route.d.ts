/**
 * Shipment Items API Endpoints
 *
 * GET    /api/shipments/[id]/items  - List items for a shipment
 * POST   /api/shipments/[id]/items  - Add items to a shipment
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
      data: {
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
export declare function POST(
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
      data: {
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
      }[];
    }>
  | NextResponse<{
      message: any;
    }>
>;
//# sourceMappingURL=route.d.ts.map
