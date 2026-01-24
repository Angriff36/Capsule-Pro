import { NextResponse } from "next/server";
/**
 * GET /api/staff/shifts/available-employees
 * Get employees available for a shift (not already assigned during the same time)
 *
 * Query params:
 * - shiftStart: Shift start time (ISO 8601) - required
 * - shiftEnd: Shift end time (ISO 8601) - required
 * - excludeShiftId: Exclude this shift from conflict check (for updates)
 * - locationId: Filter by location
 * - requiredRole: Filter by required role
 */
export declare function GET(request: Request): Promise<
  | NextResponse<{
      message: string;
    }>
  | NextResponse<{
      employees: {
        id: string;
        firstName: string | null;
        lastName: string | null;
        email: string;
        role: string;
        isActive: boolean;
        hasConflictingShift: boolean;
        conflictingShifts: {
          id: string;
          shift_start: Date;
          shift_end: Date;
          location_name: string;
        }[];
      }[];
    }>
>;
//# sourceMappingURL=route.d.ts.map
