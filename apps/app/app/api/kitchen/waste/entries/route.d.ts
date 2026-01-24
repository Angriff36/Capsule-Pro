import { NextResponse } from "next/server";
/**
 * GET /api/kitchen/waste/entries
 * List waste entries with optional filters
 */
export declare function GET(request: Request): Promise<
  | NextResponse<{
      message: string;
    }>
  | NextResponse<{
      entries: ({
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
      })[];
      wasteReasons: {
        id: number;
        description: string | null;
        code: string;
        name: string;
        isActive: boolean;
        sortOrder: number;
        colorHex: string | null;
      }[];
      pagination: {
        limit: number;
        offset: number;
        total: number;
      };
    }>
>;
/**
 * POST /api/kitchen/waste/entries
 * Create a new waste entry
 */
export declare function POST(request: Request): Promise<
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
//# sourceMappingURL=route.d.ts.map
