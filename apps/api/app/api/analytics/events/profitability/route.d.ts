import { NextResponse } from "next/server";
export declare function GET(request: Request): Promise<
  | NextResponse<{
      error: string;
    }>
  | NextResponse<
      {
        period: string;
        totalEvents: number;
        averageGrossMarginPct: number;
        totalRevenue: number;
        totalCost: number;
        averageFoodCostPct: number;
        averageLaborCostPct: number;
        averageOverheadPct: number;
      }[]
    >
>;
//# sourceMappingURL=route.d.ts.map
