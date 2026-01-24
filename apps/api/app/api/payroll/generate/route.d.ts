import { type NextRequest, NextResponse } from "next/server";
/**
 * POST /api/payroll/generate
 * Generate payroll for a pay period
 *
 * Body:
 * {
 *   periodStart: string (ISO date),
 *   periodEnd: string (ISO date),
 *   jurisdiction?: string,
 *   regenerateOnDataChange?: boolean
 * }
 *
 * Response:
 * {
 *   batchId: string,
 *   status: "processing" | "completed" | "failed",
 *   periodId: string,
 *   estimatedTotals: {
 *     totalGross: number,
 *     totalNet: number,
 *     totalTaxes: number,
 *     totalDeductions: number,
 *     employeeCount: number
 *   }
 * }
 */
export declare function POST(request: NextRequest): Promise<
  | NextResponse<{
      error: string;
    }>
  | NextResponse<{
      batchId: string;
      status: "failed" | "completed" | "processing";
      periodId: string;
      estimatedTotals: {
        totalGross: number;
        totalNet: number;
        totalTaxes: number;
        totalDeductions: number;
        employeeCount: number;
      };
    }>
>;
//# sourceMappingURL=route.d.ts.map
