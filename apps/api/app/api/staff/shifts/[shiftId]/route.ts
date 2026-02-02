import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import {
  checkOverlappingShifts,
  validateEmployeeRole,
  validateShiftTimes,
  verifyEmployee,
  verifySchedule,
} from "../validation";

type RouteContext = {
  params: Promise<{ shiftId: string }>;
};

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
 * Update an existing shift
 *
 * Allowed fields:
 * - scheduleId: Parent schedule ID
 * - employeeId: Assigned employee
 * - locationId: Shift location
 * - shiftStart: Shift start time (ISO 8601)
 * - shiftEnd: Shift end time (ISO 8601)
 * - roleDuringShift: Required role for this shift
 * - notes: Additional notes
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex business validation is necessary for shift updates
export async function PUT(request: Request, context: RouteContext) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { shiftId } = await context.params;
  const body = await request.json();

  // Verify shift exists
  const existingShift = await database.$queryRaw<
    Array<{
      id: string;
      employee_id: string;
      shift_start: Date;
      shift_end: Date;
    }>
  >(
    Prisma.sql`
      SELECT id, employee_id, shift_start, shift_end
      FROM tenant_staff.schedule_shifts
      WHERE tenant_id = ${tenantId}
        AND id = ${shiftId}
        AND deleted_at IS NULL
    `
  );

  if (!existingShift[0]) {
    return NextResponse.json({ message: "Shift not found" }, { status: 404 });
  }

  // Parse and validate times if provided
  const shiftStart = body.shiftStart
    ? new Date(body.shiftStart)
    : existingShift[0].shift_start;
  const shiftEnd = body.shiftEnd
    ? new Date(body.shiftEnd)
    : existingShift[0].shift_end;

  // Validate shift times
  const timeValidationError = validateShiftTimes(shiftStart, shiftEnd);
  if (timeValidationError) {
    return timeValidationError;
  }

  // Validate employee if changing
  const currentEmployeeId = existingShift[0].employee_id;
  const newEmployeeId = body.employeeId;

  if (newEmployeeId && newEmployeeId !== currentEmployeeId) {
    const { employee, error: employeeError } = await verifyEmployee(
      tenantId,
      newEmployeeId
    );
    if (employeeError) {
      return employeeError;
    }
    if (!employee) {
      return NextResponse.json(
        { message: "Employee not found" },
        { status: 404 }
      );
    }

    const roleValidationError = validateEmployeeRole(
      employee.role,
      body.roleDuringShift
    );
    if (roleValidationError) {
      return roleValidationError;
    }
  }

  // Check for overlapping shifts
  const employeeId = newEmployeeId || currentEmployeeId;
  const { overlaps } = await checkOverlappingShifts(
    tenantId,
    employeeId,
    shiftStart,
    shiftEnd,
    shiftId
  );

  if (overlaps.length > 0 && !body.allowOverlap) {
    return NextResponse.json(
      {
        message: "Employee has overlapping shifts",
        overlappingShifts: overlaps,
      },
      { status: 409 }
    );
  }

  // Verify schedule exists if changing
  if (body.scheduleId) {
    const { error: scheduleError } = await verifySchedule(
      tenantId,
      body.scheduleId
    );
    if (scheduleError) {
      return scheduleError;
    }
  }

  try {
    // Update the shift
    const shift = await database.scheduleShift.update({
      where: {
        tenantId_id: {
          tenantId,
          id: shiftId,
        },
      },
      data: {
        ...(body.scheduleId && { scheduleId: body.scheduleId }),
        ...(body.employeeId && { employeeId: body.employeeId }),
        ...(body.locationId && { locationId: body.locationId }),
        ...(body.shiftStart && { shift_start: shiftStart }),
        ...(body.shiftEnd && { shift_end: shiftEnd }),
        ...(body.roleDuringShift !== undefined && {
          role_during_shift: body.roleDuringShift,
        }),
        ...(body.notes !== undefined && { notes: body.notes }),
      },
    });

    return NextResponse.json({ shift });
  } catch (error) {
    console.error("Error updating shift:", error);
    return NextResponse.json(
      { message: "Failed to update shift" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/staff/shifts/[shiftId]
 * Soft delete a shift
 */
export async function DELETE(_request: Request, context: RouteContext) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { shiftId } = await context.params;

  // Verify shift exists
  const existingShift = await database.$queryRaw<
    Array<{ id: string; shift_start: Date }>
  >(
    Prisma.sql`
      SELECT id, shift_start
      FROM tenant_staff.schedule_shifts
      WHERE tenant_id = ${tenantId}
        AND id = ${shiftId}
        AND deleted_at IS NULL
    `
  );

  if (!existingShift[0]) {
    return NextResponse.json({ message: "Shift not found" }, { status: 404 });
  }

  try {
    // Soft delete the shift
    await database.scheduleShift.update({
      where: {
        tenantId_id: {
          tenantId,
          id: shiftId,
        },
      },
      data: {
        deletedAt: new Date(),
      },
    });

    return NextResponse.json({ message: "Shift deleted successfully" });
  } catch (error) {
    console.error("Error deleting shift:", error);
    return NextResponse.json(
      { message: "Failed to delete shift" },
      { status: 500 }
    );
  }
}
