/**
 * Conflicts Detection API Endpoint
 *
 * POST /api/conflicts/detect - Detect conflicts in operations data
 *
 * Detects various types of conflicts:
 * - Scheduling: Double-booked staff, overlapping shifts
 * - Resource: Equipment conflicts, venue conflicts
 * - Staff: Availability conflicts, time-off conflicts
 * - Inventory: Stock shortages for events
 * - Timeline: Task dependency violations, deadline risks
 */
import { NextResponse } from "next/server";
import type { ConflictDetectionResult } from "./types";
/**
 * POST /api/conflicts/detect
 * Detect conflicts across operations data
 */
export declare function POST(request: Request): Promise<
  | NextResponse<{
      message: string;
    }>
  | NextResponse<ConflictDetectionResult>
>;
//# sourceMappingURL=route.d.ts.map
