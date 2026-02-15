import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { executeManifestCommand } from "@/lib/manifest-command-handler";

interface RouteContext {
  params: Promise<{ shiftId: string }>;
}

/**
 * GET /api/staff/shifts/[shiftId]
 * Get a single shift by ID
 */
export async function GET(_request: Request, context: RouteContext) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { shiftId } = await context.params;

  const shifts = await database.$queryRaw<
    Array<{
      id: string;
      schedule_id: string;
      employee_id: string;
      employee_first_name: string | null;
      employee_last_name: string | null;
      employee_email: string;
      employee_role: string;
      location_id: string;
      location_name: string;
      shift_start: Date;
      shift_end: Date;
      role_during_shift: string | null;
      notes: string | null;
      created_at: Date;
      updated_at: Date;
    }>
  >(
    Prisma.sql`
      SELECT
        ss.id,
        ss.schedule_id,
        ss.employee_id,
        e.first_name AS employee_first_name,
        e.last_name AS employee_last_name,
        e.email AS employee_email,
        e.role AS employee_role,
        ss.location_id,
        l.name AS location_name,
        ss.shift_start,
        ss.shift_end,
        ss.role_during_shift,
        ss.notes,
        ss.created_at,
        ss.updated_at
      FROM tenant_staff.schedule_shifts ss
      JOIN tenant_staff.employees e
        ON e.tenant_id = ss.tenant_id
       AND e.id = ss.employee_id
      JOIN tenant.locations l
        ON l.tenant_id = ss.tenant_id
       AND l.id = ss.location_id
      WHERE ss.tenant_id = ${tenantId}
        AND ss.id = ${shiftId}
        AND ss.deleted_at IS NULL
    `
  );

  if (!shifts[0]) {
    return NextResponse.json({ message: "Shift not found" }, { status: 404 });
  }

  return NextResponse.json({ shift: shifts[0] });
}

/**
 * PUT /api/staff/shifts/[shiftId]
 * Update an existing shift (manifest command)
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  const { shiftId } = await context.params;
  console.log("[ScheduleShift/PUT] Delegating to manifest update command", {
    shiftId,
  });
  return executeManifestCommand(request, {
    entityName: "ScheduleShift",
    commandName: "update",
    params: { shiftId },
    transformBody: (body) => ({ ...body, id: shiftId }),
  });
}

/**
 * DELETE /api/staff/shifts/[shiftId]
 * Soft delete a shift (manifest command)
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const { shiftId } = await context.params;
  console.log("[ScheduleShift/DELETE] Delegating to manifest remove command", {
    shiftId,
  });
  return executeManifestCommand(request, {
    entityName: "ScheduleShift",
    commandName: "remove",
    params: { shiftId },
    transformBody: (_body) => ({ id: shiftId }),
  });
}
