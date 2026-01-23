import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import type { UpdateTimeOffStatusInput } from "../../types";
import {
  validateStatusTransition,
  verifyTimeOffRequest,
} from "../../validation";

/**
 * GET /api/staff/time-off/requests/[id]
 * Get a single time-off request by ID
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const requestId = params.id;

  const [timeOffRequest] = await database.$queryRaw<
    Array<{
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
    }>
  >(
    Prisma.sql`
      SELECT
        tor.id,
        tor.tenant_id,
        tor.employee_id,
        e.first_name AS employee_first_name,
        e.last_name AS employee_last_name,
        e.email AS employee_email,
        e.role AS employee_role,
        tor.start_date,
        tor.end_date,
        tor.reason,
        tor.status,
        tor.request_type,
        tor.created_at,
        tor.updated_at,
        tor.processed_at,
        tor.processed_by,
        processor.first_name AS processed_by_first_name,
        processor.last_name AS processed_by_last_name,
        tor.rejection_reason
      FROM tenant_staff.employee_time_off_requests tor
      JOIN tenant_staff.employees e
        ON e.tenant_id = tor.tenant_id
       AND e.id = tor.employee_id
      LEFT JOIN tenant_staff.employees processor
        ON processor.tenant_id = tor.tenant_id
       AND processor.id = tor.processed_by
      WHERE tor.tenant_id = ${tenantId}
        AND tor.id = ${requestId}
        AND tor.deleted_at IS NULL
    `
  );

  if (!timeOffRequest) {
    return NextResponse.json(
      { message: "Time-off request not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ request: timeOffRequest });
}

/**
 * PATCH /api/staff/time-off/requests/[id]
 * Update time-off request status (approve, reject, cancel)
 *
 * Body:
 * - status: "APPROVED" | "REJECTED" | "CANCELLED"
 * - rejectionReason: Required when status is "REJECTED"
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { orgId, userId } = await auth();
  if (!(orgId && userId)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const requestId = params.id;
  const body = (await request.json()) as UpdateTimeOffStatusInput;

  // Validate status is provided
  if (!body.status) {
    return NextResponse.json(
      { message: "Status is required" },
      { status: 400 }
    );
  }

  // Get current request
  const { request: timeOffRequest, error: requestError } =
    await verifyTimeOffRequest(tenantId, requestId);
  if (requestError || !timeOffRequest) {
    return requestError || NextResponse.json(
      { message: "Time-off request not found" },
      { status: 404 }
    );
  }

  // Validate status transition
  const transitionError = validateStatusTransition(
    timeOffRequest.status as any,
    body.status,
    body.rejectionReason
  );
  if (transitionError) {
    return transitionError;
  }

  try {
    // Update the time-off request status
    const result = await database.$queryRaw<
      Array<{
        id: string;
        status: string;
        processed_at: Date | null;
        processed_by: string | null;
        rejection_reason: string | null;
      }>
    >(
      Prisma.sql`
        UPDATE tenant_staff.employee_time_off_requests
        SET
          status = ${body.status},
          processed_at = now(),
          processed_by = ${userId},
          rejection_reason = ${body.status === "REJECTED" ? body.rejectionReason : null},
          updated_at = now()
        WHERE tenant_id = ${tenantId}
          AND id = ${requestId}
          AND deleted_at IS NULL
        RETURNING id, status, processed_at, processed_by, rejection_reason
      `
    );

    if (!result[0]) {
      return NextResponse.json(
        { message: "Time-off request not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ request: result[0] });
  } catch (error) {
    console.error("Error updating time-off request:", error);
    return NextResponse.json(
      { message: "Failed to update time-off request" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/staff/time-off/requests/[id]
 * Soft delete a time-off request (only allowed for PENDING or CANCELLED requests)
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const requestId = params.id;

  // Get current request
  const { request: timeOffRequest, error: requestError } =
    await verifyTimeOffRequest(tenantId, requestId);
  if (requestError || !timeOffRequest) {
    return requestError || NextResponse.json(
      { message: "Time-off request not found" },
      { status: 404 }
    );
  }

  // Only allow deletion of PENDING or CANCELLED requests
  if (
    timeOffRequest.status !== "PENDING" &&
    timeOffRequest.status !== "CANCELLED"
  ) {
    return NextResponse.json(
      {
        message: `Cannot delete ${timeOffRequest.status} time-off request. Only PENDING and CANCELLED requests can be deleted.`,
      },
      { status: 400 }
    );
  }

  try {
    // Soft delete the time-off request
    await database.$queryRaw`
      UPDATE tenant_staff.employee_time_off_requests
      SET deleted_at = now()
      WHERE tenant_id = ${tenantId}
        AND id = ${requestId}
    `;

    return NextResponse.json({ message: "Time-off request deleted" });
  } catch (error) {
    console.error("Error deleting time-off request:", error);
    return NextResponse.json(
      { message: "Failed to delete time-off request" },
      { status: 500 }
    );
  }
}