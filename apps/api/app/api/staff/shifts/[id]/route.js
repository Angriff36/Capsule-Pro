Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.PUT = PUT;
exports.DELETE = DELETE;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const tenant_1 = require("@/app/lib/tenant");
const validation_1 = require("../validation");
/**
 * GET /api/staff/shifts/[id]
 * Get a single shift by ID
 */
async function GET(_request, context) {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    return server_2.NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  const { id } = await context.params;
  const shifts = await database_1.database.$queryRaw(database_1.Prisma.sql`
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
        AND ss.id = ${id}
        AND ss.deleted_at IS NULL
    `);
  if (!shifts[0]) {
    return server_2.NextResponse.json(
      { message: "Shift not found" },
      { status: 404 }
    );
  }
  return server_2.NextResponse.json({ shift: shifts[0] });
}
/**
 * PUT /api/staff/shifts/[id]
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
async function PUT(request, context) {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    return server_2.NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  const { id } = await context.params;
  const body = await request.json();
  // Verify shift exists
  const existingShift = await database_1.database.$queryRaw(database_1.Prisma
    .sql`
      SELECT id, employee_id, shift_start, shift_end
      FROM tenant_staff.schedule_shifts
      WHERE tenant_id = ${tenantId}
        AND id = ${id}
        AND deleted_at IS NULL
    `);
  if (!existingShift[0]) {
    return server_2.NextResponse.json(
      { message: "Shift not found" },
      { status: 404 }
    );
  }
  // Parse and validate times if provided
  const shiftStart = body.shiftStart
    ? new Date(body.shiftStart)
    : existingShift[0].shift_start;
  const shiftEnd = body.shiftEnd
    ? new Date(body.shiftEnd)
    : existingShift[0].shift_end;
  // Validate shift times
  const timeValidationError = (0, validation_1.validateShiftTimes)(
    shiftStart,
    shiftEnd
  );
  if (timeValidationError) {
    return timeValidationError;
  }
  // Validate employee if changing
  const currentEmployeeId = existingShift[0].employee_id;
  const newEmployeeId = body.employeeId;
  if (newEmployeeId && newEmployeeId !== currentEmployeeId) {
    const { employee, error: employeeError } = await (0,
    validation_1.verifyEmployee)(tenantId, newEmployeeId);
    if (employeeError) {
      return employeeError;
    }
    if (!employee) {
      return server_2.NextResponse.json(
        { message: "Employee not found" },
        { status: 404 }
      );
    }
    const roleValidationError = (0, validation_1.validateEmployeeRole)(
      employee.role,
      body.roleDuringShift
    );
    if (roleValidationError) {
      return roleValidationError;
    }
  }
  // Check for overlapping shifts
  const employeeId = newEmployeeId || currentEmployeeId;
  const { overlaps } = await (0, validation_1.checkOverlappingShifts)(
    tenantId,
    employeeId,
    shiftStart,
    shiftEnd,
    id
  );
  if (overlaps.length > 0 && !body.allowOverlap) {
    return server_2.NextResponse.json(
      {
        message: "Employee has overlapping shifts",
        overlappingShifts: overlaps,
      },
      { status: 409 }
    );
  }
  // Verify schedule exists if changing
  if (body.scheduleId) {
    const { error: scheduleError } = await (0, validation_1.verifySchedule)(
      tenantId,
      body.scheduleId
    );
    if (scheduleError) {
      return scheduleError;
    }
  }
  try {
    // Update the shift
    const shift = await database_1.database.scheduleShift.update({
      where: {
        tenantId_id: {
          tenantId,
          id,
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
    return server_2.NextResponse.json({ shift });
  } catch (error) {
    console.error("Error updating shift:", error);
    return server_2.NextResponse.json(
      { message: "Failed to update shift" },
      { status: 500 }
    );
  }
}
/**
 * DELETE /api/staff/shifts/[id]
 * Soft delete a shift
 */
async function DELETE(_request, context) {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    return server_2.NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  const { id } = await context.params;
  // Verify shift exists
  const existingShift = await database_1.database.$queryRaw(database_1.Prisma
    .sql`
      SELECT id, shift_start
      FROM tenant_staff.schedule_shifts
      WHERE tenant_id = ${tenantId}
        AND id = ${id}
        AND deleted_at IS NULL
    `);
  if (!existingShift[0]) {
    return server_2.NextResponse.json(
      { message: "Shift not found" },
      { status: 404 }
    );
  }
  try {
    // Soft delete the shift
    await database_1.database.scheduleShift.update({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
      data: {
        deletedAt: new Date(),
      },
    });
    return server_2.NextResponse.json({
      message: "Shift deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting shift:", error);
    return server_2.NextResponse.json(
      { message: "Failed to delete shift" },
      { status: 500 }
    );
  }
}
