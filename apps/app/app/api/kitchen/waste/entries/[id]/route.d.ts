import { NextResponse } from "next/server";
type Params = Promise<{
  id: string;
}>;
/**
 * GET /api/kitchen/waste/entries/[id]
 * Get a single waste entry by ID
 */
export declare function GET(
  request: Request,
  {
    params,
  }: {
    params: Params;
  }
): Promise<
  | NextResponse<{
      message: string;
    }>
  | NextResponse<{
      entry: {
        inventoryItem: {
          id: string;
          name: string;
          item_number: string;
        };
      } & {
        id: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        notes: string | null;
        eventId: string | null;
        locationId: string | null;
        totalCost: import("@prisma/client/runtime/client").Decimal | null;
        quantity: import("@prisma/client/runtime/client").Decimal;
        unitId: number | null;
        unitCost: import("@prisma/client/runtime/client").Decimal | null;
        inventoryItemId: string;
        reasonId: number;
        loggedBy: string;
        loggedAt: Date;
      };
    }>
>;
/**
 * PUT /api/kitchen/waste/entries/[id]
 * Update a waste entry
 */
export declare function PUT(
  request: Request,
  {
    params,
  }: {
    params: Params;
  }
): Promise<
  | NextResponse<{
      message: string;
    }>
  | NextResponse<{
      entry: {
        id: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        notes: string | null;
        eventId: string | null;
        locationId: string | null;
        totalCost: import("@prisma/client/runtime/client").Decimal | null;
        quantity: import("@prisma/client/runtime/client").Decimal;
        unitId: number | null;
        unitCost: import("@prisma/client/runtime/client").Decimal | null;
        inventoryItemId: string;
        reasonId: number;
        loggedBy: string;
        loggedAt: Date;
      };
    }>
>;
/**
 * DELETE /api/kitchen/waste/entries/[id]
 * Soft delete a waste entry
 */
export declare function DELETE(
  request: Request,
  {
    params,
  }: {
    params: Params;
  }
): Promise<
  NextResponse<{
    message: string;
  }>
>;
//# sourceMappingURL=route.d.ts.map
