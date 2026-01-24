import { NextResponse } from "next/server";
/**
 * GET /api/staff/shifts
 * List shifts with optional filtering
 *
 * Query params:
 * - startDate: Filter shifts starting after this date
 * - endDate: Filter shifts ending before this date
 * - employeeId: Filter by assigned employee
 * - locationId: Filter by location
 * - role: Filter by role during shift
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 50)
 */
export declare function GET(request: Request): Promise<
  | NextResponse<{
      message: string;
    }>
  | NextResponse<{
      shifts: {
        id: string;
        schedule_id: string;
        employee_id: string;
        employee_first_name: string | null;
        employee_last_name: string | null;
        employee_email: string;
        employee_role: string;
        location_id: string;
        location_name: string;
        shift_start: Date;
        shift_end: Date;
        role_during_shift: string | null;
        notes: string | null;
        created_at: Date;
        updated_at: Date;
      }[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>
>;
/**
 * POST /api/staff/shifts
 * Create a new shift
 *
 * Required fields:
 * - scheduleId: Parent schedule ID
 * - employeeId: Assigned employee
 * - locationId: Shift location
 * - shiftStart: Shift start time (ISO 8601)
 * - shiftEnd: Shift end time (ISO 8601)
 *
 * Optional fields:
 * - roleDuringShift: Required role for this shift
 * - notes: Additional notes
 */
export declare function POST(request: Request): Promise<NextResponse<unknown>>;
//# sourceMappingURL=route.d.ts.map
