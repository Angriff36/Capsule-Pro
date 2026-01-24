import { NextResponse } from "next/server";
/**
 * GET /api/staff/availability
 * List employee availability with optional filtering
 *
 * Query params:
 * - employeeId: Filter by employee
 * - dayOfWeek: Filter by day of week (0-6)
 * - effectiveDate: Filter availability effective on this date (YYYY-MM-DD)
 * - isActive: Filter currently active availability (true) or all (false/omitted)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 50)
 */
export declare function GET(request: Request): Promise<NextResponse<unknown>>;
/**
 * POST /api/staff/availability
 * Create a new availability record for an employee
 *
 * Required fields:
 * - employeeId: Employee to set availability for
 * - dayOfWeek: Day of week (0-6, where 0=Sunday)
 * - startTime: Start time in HH:MM format (24-hour)
 * - endTime: End time in HH:MM format (24-hour)
 *
 * Optional fields:
 * - isAvailable: Whether employee is available (defaults to true)
 * - effectiveFrom: Date when availability starts (YYYY-MM-DD, defaults to today)
 * - effectiveUntil: Date when availability ends (YYYY-MM-DD or null for ongoing)
 */
export declare function POST(request: Request): Promise<NextResponse<unknown>>;
//# sourceMappingURL=route.d.ts.map
