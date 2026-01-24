Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.PATCH = PATCH;
exports.DELETE = DELETE;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const tenant_1 = require("@/app/lib/tenant");
const validation_1 = require("../../validation");
/**
 * GET /api/staff/time-off/requests/[id]
 * Get a single time-off request by ID
 */
async function GET(request, { params }) {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    return server_2.NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  const { id: requestId } = await params;
  const [timeOffRequest] = await database_1.database.$queryRaw(database_1.Prisma
    .sql`
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
    `);
  if (!timeOffRequest) {
    return server_2.NextResponse.json(
      { message: "Time-off request not found" },
      { status: 404 }
    );
  }
  return server_2.NextResponse.json({ request: timeOffRequest });
}
/**
 * PATCH /api/staff/time-off/requests/[id]
 * Update time-off request status (approve, reject, cancel)
 *
 * Body:
 * - status: "APPROVED" | "REJECTED" | "CANCELLED"
 * - rejectionReason: Required when status is "REJECTED"
 */
async function PATCH(request, { params }) {
  const { orgId, userId } = await (0, server_1.auth)();
  if (!(orgId && userId)) {
    return server_2.NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  const { id: requestId } = await params;
  const body = await request.json();
  // Validate status is provided
  if (!body.status) {
    return server_2.NextResponse.json(
      { message: "Status is required" },
      { status: 400 }
    );
  }
  // Get current request
  const { request: timeOffRequest, error: requestError } = await (0,
  validation_1.verifyTimeOffRequest)(tenantId, requestId);
  if (requestError || !timeOffRequest) {
    return (
      requestError ||
      server_2.NextResponse.json(
        { message: "Time-off request not found" },
        { status: 404 }
      )
    );
  }
  // Validate status transition
  const transitionError = (0, validation_1.validateStatusTransition)(
    timeOffRequest.status,
    body.status,
    body.rejectionReason
  );
  if (transitionError) {
    return transitionError;
  }
  try {
    // Update the time-off request status
    const result = await database_1.database.$queryRaw(database_1.Prisma.sql`
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
      `);
    if (!result[0]) {
      return server_2.NextResponse.json(
        { message: "Time-off request not found" },
        { status: 404 }
      );
    }
    return server_2.NextResponse.json({ request: result[0] });
  } catch (error) {
    console.error("Error updating time-off request:", error);
    return server_2.NextResponse.json(
      { message: "Failed to update time-off request" },
      { status: 500 }
    );
  }
}
/**
 * DELETE /api/staff/time-off/requests/[id]
 * Soft delete a time-off request (only allowed for PENDING or CANCELLED requests)
 */
async function DELETE(request, { params }) {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    return server_2.NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  const { id: requestId } = await params;
  // Get current request
  const { request: timeOffRequest, error: requestError } = await (0,
  validation_1.verifyTimeOffRequest)(tenantId, requestId);
  if (requestError || !timeOffRequest) {
    return (
      requestError ||
      server_2.NextResponse.json(
        { message: "Time-off request not found" },
        { status: 404 }
      )
    );
  }
  // Only allow deletion of PENDING or CANCELLED requests
  if (
    timeOffRequest.status !== "PENDING" &&
    timeOffRequest.status !== "CANCELLED"
  ) {
    return server_2.NextResponse.json(
      {
        message: `Cannot delete ${timeOffRequest.status} time-off request. Only PENDING and CANCELLED requests can be deleted.`,
      },
      { status: 400 }
    );
  }
  try {
    // Soft delete the time-off request
    await database_1.database.$queryRaw`
      UPDATE tenant_staff.employee_time_off_requests
      SET deleted_at = now()
      WHERE tenant_id = ${tenantId}
        AND id = ${requestId}
    `;
    return server_2.NextResponse.json({ message: "Time-off request deleted" });
  } catch (error) {
    console.error("Error deleting time-off request:", error);
    return server_2.NextResponse.json(
      { message: "Failed to delete time-off request" },
      { status: 500 }
    );
  }
}
