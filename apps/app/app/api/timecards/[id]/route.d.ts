import { NextResponse } from "next/server";
export declare function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
): Promise<
  | NextResponse<{
      message: string;
    }>
  | NextResponse<{
      timeEntry: {
        id: string;
        employee_id: string;
        employee_first_name: string | null;
        employee_last_name: string | null;
        employee_email: string;
        employee_role: string;
        employee_number: string | null;
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
        created_at: Date;
        updated_at: Date;
        scheduled_hours: number | null;
        actual_hours: number | null;
        exception_type: string | null;
        hourly_rate: number | null;
        total_cost: number | null;
      };
    }>
>;
export declare function PUT(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
): Promise<
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
export declare function DELETE(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
): Promise<
  NextResponse<{
    message: string;
  }>
>;
//# sourceMappingURL=route.d.ts.map
