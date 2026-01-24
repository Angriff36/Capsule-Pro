import { NextResponse } from "next/server";
/**
 * POST /api/staff/shifts/bulk-assignment-suggestions
 *
 * Get assignment suggestions for multiple shifts at once.
 *
 * Body:
 * - shifts: Array of shift requirements
 *   - shiftId: string
 *   - locationId: string (optional)
 *   - requiredSkills: string[] (optional)
 */
export declare function POST(request: Request): Promise<
  | NextResponse<{
      message: string;
    }>
  | NextResponse<{
      results: any;
      summary: {
        total: any;
        canAutoAssign: any;
        hasSuggestions: any;
        noSuggestions: any;
      };
    }>
>;
/**
 * GET /api/staff/shifts/bulk-assignment-suggestions
 *
 * Get assignment suggestions for all open shifts (shifts without an assigned employee).
 *
 * Query params:
 * - scheduleId: Optional schedule ID to filter
 * - locationId: Optional location ID to filter
 * - startDate: Optional start date filter (ISO 8601)
 * - endDate: Optional end date filter (ISO 8601)
 */
export declare function GET(request: Request): Promise<
  | NextResponse<{
      message: string;
    }>
  | NextResponse<{
      results: any;
      summary: {
        total: any;
        canAutoAssign: any;
        hasSuggestions: any;
        noSuggestions: any;
      };
    }>
>;
//# sourceMappingURL=route.d.ts.map
