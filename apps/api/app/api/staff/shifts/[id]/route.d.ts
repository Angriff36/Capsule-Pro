import { NextResponse } from "next/server";
type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};
/**
 * GET /api/staff/shifts/[id]
 * Get a single shift by ID
 */
export declare function GET(
  _request: Request,
  context: RouteContext
): Promise<
  | NextResponse<{
      message: string;
    }>
  | NextResponse<{
      shift: {
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
      };
    }>
>;
/**
 * PUT /api/staff/shifts/[id]
 * Update an existing shift
 *
 * Allowed fields:
 * - scheduleId: Parent schedule ID
 * - employeeId: Assigned employee
 * - locationId: Shift location
 * - shiftStart: Shift start time (ISO 8601)
 * - shiftEnd: Shift end time (ISO 8601)
 * - roleDuringShift: Required role for this shift
 * - notes: Additional notes
 */
export declare function PUT(
  request: Request,
  context: RouteContext
): Promise<NextResponse<unknown>>;
/**
 * DELETE /api/staff/shifts/[id]
 * Soft delete a shift
 */
export declare function DELETE(
  _request: Request,
  context: RouteContext
): Promise<
  NextResponse<{
    message: string;
  }>
>;
//# sourceMappingURL=route.d.ts.map
