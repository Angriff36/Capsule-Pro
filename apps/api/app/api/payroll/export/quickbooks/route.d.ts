import { type NextRequest, NextResponse } from "next/server";
/**
 * POST /api/payroll/export/quickbooks
 * Export payroll to QuickBooks format
 *
 * Body:
 * {
 *   periodId: string,
 *   target: "qbxml" | "qbOnlineCsv"
 * }
 *
 * Response:
 * {
 *   exportId: string,
 *   fileUrl: string,
 *   format: string
 * }
 */
export declare function POST(request: NextRequest): Promise<
  | NextResponse<{
      error: string;
    }>
  | NextResponse<{
      exportId: string;
      fileUrl: string;
      format: string;
      filename: string;
    }>
>;
//# sourceMappingURL=route.d.ts.map
