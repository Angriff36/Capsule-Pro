import { type NextRequest, NextResponse } from "next/server";
export declare function GET(request: NextRequest): Promise<
  | NextResponse<{
      error: string;
    }>
  | NextResponse<
      {
        id: string;
        tenantId: string;
        sku: string;
        date: Date;
        forecast: import("@prisma/client/runtime/client").Decimal;
        lower_bound: import("@prisma/client/runtime/client").Decimal;
        upper_bound: import("@prisma/client/runtime/client").Decimal;
        confidence: import("@prisma/client/runtime/client").Decimal;
        horizon_days: number;
        last_updated: Date;
      }[]
    >
>;
//# sourceMappingURL=route.d.ts.map
