import { NextResponse } from "next/server";
/**
 * GET /api/staff/time-off/requests/[id]
 * Get a single time-off request by ID
 */
export declare function GET(
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
      request: {
        id: string;
        tenant_id: string;
        employee_id: string;
        employee_first_name: string | null;
        employee_last_name: string | null;
        employee_email: string;
        employee_role: string;
        start_date: Date;
        end_date: Date;
        reason: string | null;
        status: string;
        request_type: string;
        created_at: Date;
        updated_at: Date;
        processed_at: Date | null;
        processed_by: string | null;
        processed_by_first_name: string | null;
        processed_by_last_name: string | null;
        rejection_reason: string | null;
      };
    }>
>;
/**
 * PATCH /api/staff/time-off/requests/[id]
 * Update time-off request status (approve, reject, cancel)
 *
 * Body:
 * - status: "APPROVED" | "REJECTED" | "CANCELLED"
 * - rejectionReason: Required when status is "REJECTED"
 */
export declare function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
): Promise<NextResponse<unknown>>;
/**
 * DELETE /api/staff/time-off/requests/[id]
 * Soft delete a time-off request (only allowed for PENDING or CANCELLED requests)
 */
export declare function DELETE(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
): Promise<NextResponse<unknown>>;
//# sourceMappingURL=route.d.ts.map
