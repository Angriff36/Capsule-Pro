import { NextResponse } from "next/server";
/**
 * GET /api/staff/shifts/[shiftId]/assignment-suggestions
 *
 * Get assignment suggestions for a specific shift.
 *
 * Query params:
 * - locationId: The location ID (optional)
 * - requiredSkills: Comma-separated list of skill IDs (optional)
 */
export declare function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      shiftId: string;
    }>;
  }
): Promise<NextResponse<any>>;
/**
 * POST /api/staff/shifts/[shiftId]/assignment-suggestions
 *
 * Auto-assign the best match employee to a shift.
 *
 * Body:
 * - employeeId: Optional specific employee ID to assign (if not provided, uses best match)
 * - force: Boolean to force assignment even with medium/low confidence
 */
export declare function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      shiftId: string;
    }>;
  }
): Promise<NextResponse<any>>;
//# sourceMappingURL=route.d.ts.map
