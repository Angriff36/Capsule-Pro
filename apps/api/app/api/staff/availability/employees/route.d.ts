import { NextResponse } from "next/server";
/**
 * GET /api/staff/availability/employees
 * Get employee availability for a date range (for scheduling)
 *
 * Query params:
 * - employeeIds: Comma-separated list of employee IDs to query (optional, returns all if omitted)
 * - startDate: Start date of range (YYYY-MM-DD, required)
 * - endDate: End date of range (YYYY-MM-DD, required)
 * - includeTimeOff: Also include time-off requests (true/false, default false)
 *
 * Returns availability for each day of the week for each employee,
 * along with any time-off requests that overlap the date range.
 */
export declare function GET(request: Request): Promise<
  | NextResponse<{
      message: string;
    }>
  | NextResponse<{
      employees: {
        employee_id: string;
        employee_first_name: string | null;
        employee_last_name: string | null;
        employee_email: string;
        employee_role: string;
        availability: Array<{
          day_of_week: number;
          start_time: string;
          end_time: string;
          is_available: boolean;
        }>;
      }[];
    }>
>;
//# sourceMappingURL=route.d.ts.map
