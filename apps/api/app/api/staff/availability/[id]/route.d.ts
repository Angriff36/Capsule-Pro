import { NextResponse } from "next/server";
type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};
/**
 * GET /api/staff/availability/[id]
 * Get a single availability record by ID
 */
export declare function GET(
  request: Request,
  context: RouteContext
): Promise<
  | NextResponse<{
      message: string;
    }>
  | NextResponse<{
      availability: {
        id: string;
        tenant_id: string;
        employee_id: string;
        employee_first_name: string | null;
        employee_last_name: string | null;
        employee_email: string;
        employee_role: string;
        day_of_week: number;
        start_time: string;
        end_time: string;
        is_available: boolean;
        effective_from: Date;
        effective_until: Date | null;
        created_at: Date;
        updated_at: Date;
      };
    }>
>;
/**
 * PATCH /api/staff/availability/[id]
 * Update an existing availability record
 *
 * Optional fields:
 * - dayOfWeek: New day of week (0-6)
 * - startTime: New start time in HH:MM format
 * - endTime: New end time in HH:MM format
 * - isAvailable: New availability status
 * - effectiveFrom: New effective from date (YYYY-MM-DD)
 * - effectiveUntil: New effective until date (YYYY-MM-DD or null)
 */
export declare function PATCH(
  request: Request,
  context: RouteContext
): Promise<NextResponse<unknown>>;
/**
 * DELETE /api/staff/availability/[id]
 * Soft delete an availability record
 */
export declare function DELETE(
  request: Request,
  context: RouteContext
): Promise<NextResponse<unknown>>;
//# sourceMappingURL=route.d.ts.map
