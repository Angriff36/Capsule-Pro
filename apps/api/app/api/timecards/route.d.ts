import { NextResponse } from "next/server";
export declare function GET(request: Request): Promise<
  | NextResponse<{
      message: string;
    }>
  | NextResponse<{
      timeEntries: {
        id: string;
        employee_id: string;
        employee_first_name: string | null;
        employee_last_name: string | null;
        employee_email: string;
        employee_role: string;
        location_id: string | null;
        location_name: string | null;
        shift_id: string | null;
        shift_start: Date | null;
        shift_end: Date | null;
        clock_in: Date;
        clock_out: Date | null;
        break_minutes: number;
        notes: string | null;
        approved_by: string | null;
        approved_at: Date | null;
        approver_first_name: string | null;
        approver_last_name: string | null;
        scheduled_hours: number | null;
        actual_hours: number | null;
        exception_type: string | null;
      }[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>
>;
export declare function POST(request: Request): Promise<
  | NextResponse<{
      message: string;
    }>
  | NextResponse<{
      timeEntry: {
        id: string;
        employeeId: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        notes: string | null;
        locationId: string | null;
        deleted_at: Date | null;
        shift_id: string | null;
        clockIn: Date;
        clockOut: Date | null;
        breakMinutes: number;
        approved_by: string | null;
        approved_at: Date | null;
      };
    }>
>;
//# sourceMappingURL=route.d.ts.map
