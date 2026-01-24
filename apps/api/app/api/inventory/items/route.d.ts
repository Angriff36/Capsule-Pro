/**
 * Inventory Items API Endpoints
 *
 * GET    /api/inventory/items      - List items with pagination and filters
 * POST   /api/inventory/items      - Create a new inventory item
 */
import { NextResponse } from "next/server";
import type { InventoryItemWithStatus } from "./types";
/**
 * GET /api/inventory/items - List inventory items with pagination and filters
 */
export declare function GET(request: Request): Promise<
  | NextResponse<{
      message: string;
    }>
  | NextResponse<{
      data: InventoryItemWithStatus[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>
>;
/**
 * POST /api/inventory/items - Create a new inventory item
 */
export declare function POST(request: Request): Promise<
  | NextResponse<InventoryItemWithStatus>
  | NextResponse<{
      message: any;
    }>
>;
//# sourceMappingURL=route.d.ts.map
