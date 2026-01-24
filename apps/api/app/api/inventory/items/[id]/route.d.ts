/**
 * Individual Inventory Item API Endpoints
 *
 * GET    /api/inventory/items/[id]      - Get a single inventory item
 * PUT    /api/inventory/items/[id]      - Update an inventory item
 * DELETE /api/inventory/items/[id]      - Delete an inventory item (soft delete)
 */
import { NextResponse } from "next/server";
import type { InventoryItemWithStatus } from "../types";
type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};
/**
 * GET /api/inventory/items/[id] - Get a single inventory item
 */
export declare function GET(
  request: Request,
  context: RouteContext
): Promise<
  | NextResponse<InventoryItemWithStatus>
  | NextResponse<{
      message: string;
    }>
>;
/**
 * PUT /api/inventory/items/[id] - Update an inventory item
 */
export declare function PUT(
  request: Request,
  context: RouteContext
): Promise<
  | NextResponse<InventoryItemWithStatus>
  | NextResponse<{
      message: any;
    }>
>;
/**
 * DELETE /api/inventory/items/[id] - Soft delete an inventory item
 */
export declare function DELETE(
  request: Request,
  context: RouteContext
): Promise<
  | NextResponse<{
      message: string;
    }>
  | NextResponse<{
      success: boolean;
    }>
>;
//# sourceMappingURL=route.d.ts.map
