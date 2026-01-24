import { NextResponse } from "next/server";
import type { ShiftOverlap } from "./types";
/**
 * Validates shift timing requirements
 */
export declare function validateShiftTimes(
  shiftStart: Date,
  shiftEnd: Date,
  allowHistorical?: boolean
): NextResponse | null;
/**
 * Verifies an employee exists and is active
 */
export declare function verifyEmployee(
  tenantId: string,
  employeeId: string
): Promise<{
  employee: {
    id: string;
    role: string;
    is_active: boolean;
  } | null;
  error: NextResponse | null;
}>;
/**
 * Validates employee role matches required role
 */
export declare function validateEmployeeRole(
  employeeRole: string,
  requiredRole?: string
): NextResponse | null;
/**
 * Checks for overlapping shifts for an employee
 */
export declare function checkOverlappingShifts(
  tenantId: string,
  employeeId: string,
  shiftStart: Date,
  shiftEnd: Date,
  excludeShiftId?: string
): Promise<{
  overlaps: ShiftOverlap[];
  error: NextResponse | null;
}>;
/**
 * Verifies a schedule exists
 */
export declare function verifySchedule(
  tenantId: string,
  scheduleId: string
): Promise<{
  schedule: {
    id: string;
    status: string;
  } | null;
  error: NextResponse | null;
}>;
//# sourceMappingURL=validation.d.ts.map
