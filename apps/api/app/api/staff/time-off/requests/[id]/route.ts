import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg, resolveCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";

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

  const record = await database.timeOffRequest.findFirst({
    where: { tenantId, id: requestId, deletedAt: null },
  });

  if (!record) {
    return NextResponse.json(
      { message: "Time-off request not found" },
      { status: 404 }
    );
  }

  const users = await database.user.findMany({
    where: {
      tenantId,
      id: {
        in: [record.employeeId, record.reviewedBy].filter(
          (id): id is string => Boolean(id)
        ),
      },
      deletedAt: null,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
    },
  });
  const usersById = new Map(users.map((user) => [user.id, user]));
  const employee = usersById.get(record.employeeId);
  const processor = record.reviewedBy
    ? usersById.get(record.reviewedBy)
    : undefined;
  const timeOffRequest = {
    id: record.id,
    tenant_id: record.tenantId,
    employee_id: record.employeeId,
    employee_first_name: employee?.firstName ?? null,
    employee_last_name: employee?.lastName ?? null,
    employee_email: employee?.email ?? "",
    employee_role: employee?.role ?? "staff",
    start_date: record.startDate,
    end_date: record.endDate,
    reason: record.reason,
    status: record.status,
    request_type: record.requestType,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
    processed_at: record.reviewedAt,
    processed_by: record.reviewedBy,
    processed_by_first_name: processor?.firstName ?? null,
    processed_by_last_name: processor?.lastName ?? null,
    rejection_reason: record.rejectionReason,
  };

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
  const user = await resolveCurrentUser(request);
  const rawBody = await request.json().catch(() => ({})) as Record<string, unknown>;
  const status = rawBody.status as string;

  let commandName: string;
  if (status === "APPROVED") commandName = "approve";
  else if (status === "REJECTED") commandName = "reject";
  else if (status === "CANCELLED") commandName = "cancel";
  else
    return new Response(JSON.stringify({ message: "Invalid status" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });

  return runManifestCommand({
    entity: "TimeOffRequest",
    command: commandName,
    body: {
      ...rawBody,
      id,
      processedBy: user.id,
      rejectionReason: (rawBody.rejectionReason as string) || (rawBody.rejection_reason as string) || "",
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
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
  const user = await resolveCurrentUser(request);

  return runManifestCommand({
    entity: "TimeOffRequest",
    command: "softDelete",
    body: { id },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });
}
