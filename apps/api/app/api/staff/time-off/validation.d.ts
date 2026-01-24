import { NextResponse } from "next/server";
import type { TimeOffStatus } from "./types";
/**
 * Validates time-off request dates
 */
export declare function validateTimeOffDates(
  startDate: Date,
  endDate: Date
): NextResponse | null;
/**
 * Validates time-off status transition
 */
export declare function validateStatusTransition(
  currentStatus: TimeOffStatus,
  newStatus: TimeOffStatus,
  rejectionReason?: string
): NextResponse | null;
/**
 * Checks for overlapping time-off requests for an employee
 */
export declare function checkOverlappingTimeOffRequests(
  tenantId: string,
  employeeId: string,
  startDate: Date,
  endDate: Date,
  excludeRequestId?: string
): Promise<{
  hasOverlap: boolean;
  overlappingRequests: Array<{
    id: string;
    start_date: Date;
    end_date: Date;
    status: string;
  }>;
}>;
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
 * Verifies a time-off request exists
 */
export declare function verifyTimeOffRequest(
  tenantId: string,
  requestId: string
): Promise<{
  request: {
    id: string;
    employee_id: string;
    status: string;
    start_date: Date;
    end_date: Date;
  } | null;
  error: NextResponse | null;
}>;
//# sourceMappingURL=validation.d.ts.map
