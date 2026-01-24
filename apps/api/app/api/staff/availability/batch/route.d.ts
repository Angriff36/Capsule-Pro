import { NextResponse } from "next/server";
/**
 * POST /api/staff/availability/batch
 * Create multiple availability records at once (for recurring weekly patterns)
 *
 * Required fields:
 * - employeeId: Employee to set availability for
 * - patterns: Array of availability patterns
 *   - dayOfWeek: Day of week (0-6)
 *   - startTime: Start time in HH:MM format
 *   - endTime: End time in HH:MM format
 *   - isAvailable: (optional) Whether available (defaults to true)
 *
 * Optional fields:
 * - effectiveFrom: Date when availability starts (YYYY-MM-DD, defaults to today)
 * - effectiveUntil: Date when availability ends (YYYY-MM-DD or null for ongoing)
 */
export declare function POST(request: Request): Promise<NextResponse<unknown>>;
//# sourceMappingURL=route.d.ts.map
