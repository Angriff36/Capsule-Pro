import { type NextRequest, NextResponse } from "next/server";
/**
 * GET /api/payroll/reports/{periodId}?format={csv|qbxml|qbOnlineCsv|json}
 * Get payroll report in specified format
 *
 * Query Parameters:
 * - format: "csv" | "qbxml" | "qbOnlineCsv" | "json" (default: "json")
 * - aggregate: "true" | "false" - For QB exports, create single aggregate entry
 *
 * Response:
 * - For "json": JSON response with payroll data
 * - For other formats: Downloadable file
 */
export declare function GET(
  request: NextRequest,
  context: {
    params: Promise<{
      periodId: string;
    }>;
  }
): Promise<NextResponse<any>>;
//# sourceMappingURL=route.d.ts.map
