import { type NextRequest, NextResponse } from "next/server";
export declare function GET(request: NextRequest): Promise<
  | NextResponse<{
      error: string;
    }>
  | NextResponse<{
      id: string;
      tenantId: string;
      sku: string;
      recommended_order_qty: import("@prisma/client/runtime/client").Decimal;
      reorder_point: import("@prisma/client/runtime/client").Decimal;
      safety_stock: import("@prisma/client/runtime/client").Decimal;
      lead_time_days: number;
      justification: string;
      created_at: Date;
    }>
>;
export declare function POST(request: NextRequest): Promise<
  | NextResponse<{
      success: boolean;
    }>
  | NextResponse<{
      error: string;
    }>
>;
//# sourceMappingURL=route.d.ts.map
