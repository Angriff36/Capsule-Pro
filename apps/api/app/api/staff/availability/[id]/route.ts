import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg, resolveCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/staff/availability/[id]
 * Get a single availability record by ID
 */
export async function GET(_request: Request, context: RouteContext) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { id } = await context.params;

  const record = await database.employeeAvailability.findFirst({
    where: { tenantId, id, deletedAt: null },
  });

  if (!record) {
    return NextResponse.json(
      { message: "Availability record not found" },
      { status: 404 }
    );
  }

  const employee = await database.user.findFirst({
    where: { tenantId, id: record.employeeId, deletedAt: null },
    select: { firstName: true, lastName: true, email: true, role: true },
  });

  return NextResponse.json({
    availability: {
      id: record.id,
      tenant_id: record.tenantId,
      employee_id: record.employeeId,
      employee_first_name: employee?.firstName ?? null,
      employee_last_name: employee?.lastName ?? null,
      employee_email: employee?.email ?? "",
      employee_role: employee?.role ?? "staff",
      day_of_week: record.dayOfWeek,
      start_time: record.startTime,
      end_time: record.endTime,
      is_available: record.isAvailable,
      effective_from: record.effectiveFrom,
      effective_until: record.effectiveUntil,
      created_at: record.createdAt,
      updated_at: record.updatedAt,
    },
  });
}

/**
 * PATCH /api/staff/availability/[id]
 * Update an existing availability record via manifest command
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await resolveCurrentUser(request);
  const rawBody = await request.json().catch(() => ({})) as Record<string, unknown>;
  return runManifestCommand({
    entity: "EmployeeAvailability",
    command: "update",
    body: {
      id,
      dayOfWeek: rawBody.dayOfWeek ?? rawBody.day_of_week,
      startTime: rawBody.startTime || rawBody.start_time,
      endTime: rawBody.endTime || rawBody.end_time,
      isAvailable: rawBody.isAvailable ?? rawBody.is_available,
      effectiveFrom: rawBody.effectiveFrom || rawBody.effective_from || "",
      effectiveUntil: rawBody.effectiveUntil || rawBody.effective_until || "",
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });
}

/**
 * DELETE /api/staff/availability/[id]
 * Soft delete an availability record via manifest command
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await resolveCurrentUser(request);
  return runManifestCommand({
    entity: "EmployeeAvailability",
    command: "softDelete",
    body: { id },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });
}
