import { NextRequest, NextResponse } from "next/server";
/**
 * GET /api/kitchen/waste/trends
 * View waste trends over time with analytics
 */
export declare function GET(request: NextRequest): Promise<
  | NextResponse<{
      message: string;
    }>
  | NextResponse<{
      trends: {
        summary: {
          totalCost: any;
          totalQuantity: any;
          totalEntries: any;
          avgCostPerEntry: number;
          period: string;
          startDate: string;
          endDate: string;
        };
        data: any[];
        topReasons: {
          reason: {
            id: number;
            description: string | null;
            code: string;
            name: string;
            isActive: boolean;
            sortOrder: number;
            colorHex: string | null;
          } | null;
          count: number;
          cost: number;
        }[];
        topItems: {
          name: string;
          count: number;
          cost: number;
        }[];
        reductionOpportunities: {
          type: string;
          description: string;
          potentialSavings: number;
          priority: string;
        }[];
      };
    }>
>;
//# sourceMappingURL=route.d.ts.map
