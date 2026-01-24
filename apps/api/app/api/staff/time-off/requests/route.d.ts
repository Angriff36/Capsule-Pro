import { NextResponse } from "next/server";
import type { TimeOffRequestsListResponse } from "../types";
/**
 * GET /api/staff/time-off/requests
 * List time-off requests with optional filtering
 *
 * Query params:
 * - employeeId: Filter by employee
 * - status: Filter by status (PENDING, APPROVED, REJECTED, CANCELLED)
 * - startDate: Filter requests starting on or after this date
 * - endDate: Filter requests ending on or before this date
 * - requestType: Filter by request type
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 50)
 */
export declare function GET(request: Request): Promise<
  | NextResponse<{
      message: string;
    }>
  | NextResponse<TimeOffRequestsListResponse>
>;
/**
 * POST /api/staff/time-off/requests
 * Create a new time-off request
 *
 * Required fields:
 * - employeeId: Employee requesting time off
 * - startDate: Start date (ISO date string)
 * - endDate: End date (ISO date string)
 * - requestType: Type of time off
 *
 * Optional fields:
 * - reason: Reason for time off
 */
export declare function POST(request: Request): Promise<NextResponse<unknown>>;
//# sourceMappingURL=route.d.ts.map
