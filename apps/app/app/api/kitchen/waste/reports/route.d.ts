import { NextResponse } from "next/server";
/**
 * GET /api/kitchen/waste/reports
 * Generate waste reports with filtering options
 */
export declare function GET(request: Request): Promise<
  | NextResponse<{
      message: string;
    }>
  | NextResponse<{
      report: {
        summary: {
          totalCost: number;
          totalQuantity: number;
          entryCount: number;
          avgCostPerEntry: number;
        };
        groupedBy: string;
        data: any[];
        trends: any[];
        wasteReasons: {
          id: number;
          description: string | null;
          code: string;
          name: string;
          isActive: boolean;
          sortOrder: number;
          colorHex: string | null;
        }[];
      };
    }>
>;
//# sourceMappingURL=route.d.ts.map
