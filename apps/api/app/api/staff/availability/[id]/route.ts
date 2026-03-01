import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { executeManifestCommand } from "@/lib/manifest-command-handler";

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

  const availability = await database.$queryRaw<
    Array<{
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
    }>
  >(
    Prisma.sql`
      SELECT
        ea.id,
        ea.tenant_id,
        ea.employee_id,
        e.first_name AS employee_first_name,
        e.last_name AS employee_last_name,
        e.email AS employee_email,
        e.role AS employee_role,
        ea.day_of_week,
        ea.start_time::text as start_time,
        ea.end_time::text as end_time,
        ea.is_available,
        ea.effective_from,
        ea.effective_until,
        ea.created_at,
        ea.updated_at
      FROM tenant_staff.employee_availability ea
      JOIN tenant_staff.employees e
        ON e.tenant_id = ea.tenant_id
       AND e.id = ea.employee_id
      WHERE ea.tenant_id = ${tenantId}
        AND ea.id = ${id}
        AND ea.deleted_at IS NULL
    `
  );

  if (!availability[0]) {
    return NextResponse.json(
      { message: "Availability record not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ availability: availability[0] });
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
  return executeManifestCommand(request, {
    entityName: "EmployeeAvailability",
    commandName: "update",
    params: { id },
    transformBody: (body) => ({
      id,
      dayOfWeek: body.dayOfWeek ?? body.day_of_week,
      startTime: body.startTime || body.start_time,
      endTime: body.endTime || body.end_time,
      isAvailable: body.isAvailable ?? body.is_available,
      effectiveFrom: body.effectiveFrom || body.effective_from || "",
      effectiveUntil: body.effectiveUntil || body.effective_until || "",
    }),
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
  return executeManifestCommand(request, {
    entityName: "EmployeeAvailability",
    commandName: "softDelete",
    params: { id },
    transformBody: () => ({ id }),
  });
}
