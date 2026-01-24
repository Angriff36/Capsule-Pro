import { NextResponse } from "next/server";
import type { DayOfWeek } from "./types";
/**
 * Validates time string in HH:MM format (24-hour)
 */
export declare function validateTimeFormat(time: string): NextResponse | null;
/**
 * Validates day of week (0-6, where 0=Sunday)
 */
export declare function validateDayOfWeek(
  dayOfWeek: number
): NextResponse | null;
/**
 * Validates that end time is after start time
 */
export declare function validateTimeRange(
  startTime: string,
  endTime: string
): NextResponse | null;
/**
 * Validates effective date range
 */
export declare function validateEffectiveDates(
  effectiveFrom: Date,
  effectiveUntil: Date | null
): NextResponse | null;
/**
 * Checks for overlapping availability periods for the same employee and day
 */
export declare function checkOverlappingAvailability(
  tenantId: string,
  employeeId: string,
  dayOfWeek: DayOfWeek,
  startTime: string,
  endTime: string,
  effectiveFrom: Date,
  effectiveUntil: Date | null,
  excludeAvailabilityId?: string
): Promise<{
  hasOverlap: boolean;
  overlappingAvailability: Array<{
    id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    effective_from: Date;
    effective_until: Date | null;
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
 * Verifies an availability record exists
 */
export declare function verifyAvailability(
  tenantId: string,
  availabilityId: string
): Promise<{
  availability: {
    id: string;
    employee_id: string;
    day_of_week: number;
    effective_until: Date | null;
  } | null;
  error: NextResponse | null;
}>;
/**
 * Validates batch availability input
 */
export declare function validateBatchAvailabilityInput(
  patterns: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }>
): NextResponse | null;
//# sourceMappingURL=validation.d.ts.map
