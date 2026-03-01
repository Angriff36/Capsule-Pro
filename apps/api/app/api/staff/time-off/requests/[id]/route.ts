import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { executeManifestCommand } from "@/lib/manifest-command-handler";

export const runtime = "nodejs";

/**
 * GET /api/staff/time-off/requests/[id]
 * Get a single time-off request by ID
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { id: requestId } = await params;

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
 * Update time-off request status (approve, reject, cancel) via manifest command
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.clone().json();
  const status = body.status;

  let commandName: string;
  if (status === "APPROVED") commandName = "approve";
  else if (status === "REJECTED") commandName = "reject";
  else if (status === "CANCELLED") commandName = "cancel";
  else
    return new Response(JSON.stringify({ message: "Invalid status" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });

  return executeManifestCommand(request, {
    entityName: "TimeOffRequest",
    commandName,
    params: { id },
    transformBody: (body, ctx) => ({
      ...body,
      processedBy: ctx.userId,
      rejectionReason: body.rejectionReason || body.rejection_reason || "",
    }),
  });
}

/**
 * DELETE /api/staff/time-off/requests/[id]
 * Soft delete a time-off request via manifest command
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return executeManifestCommand(request, {
    entityName: "TimeOffRequest",
    commandName: "softDelete",
    params: { id },
    transformBody: () => ({ id }),
  });
}
