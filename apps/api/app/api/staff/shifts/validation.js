Object.defineProperty(exports, "__esModule", { value: true });
exports.validateShiftTimes = validateShiftTimes;
exports.verifyEmployee = verifyEmployee;
exports.validateEmployeeRole = validateEmployeeRole;
exports.checkOverlappingShifts = checkOverlappingShifts;
exports.verifySchedule = verifySchedule;
const database_1 = require("@repo/database");
const server_1 = require("next/server");
/**
 * Validates shift timing requirements
 */
function validateShiftTimes(shiftStart, shiftEnd, allowHistorical) {
  if (shiftEnd <= shiftStart) {
    return server_1.NextResponse.json(
      { message: "Shift end time must be after start time" },
      { status: 400 }
    );
  }
  const now = new Date();
  if (shiftEnd < now && !allowHistorical) {
    return server_1.NextResponse.json(
      {
        message:
          "Cannot create shifts in the past. Use allowHistorical flag for historical data entry.",
      },
      { status: 400 }
    );
  }
  return null;
}
/**
 * Verifies an employee exists and is active
 */
async function verifyEmployee(tenantId, employeeId) {
  const employee = await database_1.database.$queryRaw(database_1.Prisma.sql`
      SELECT id, role, is_active
      FROM tenant_staff.employees
      WHERE tenant_id = ${tenantId}
        AND id = ${employeeId}
        AND deleted_at IS NULL
    `);
  if (!employee[0]) {
    return {
      employee: null,
      error: server_1.NextResponse.json(
        { message: "Employee not found" },
        { status: 404 }
      ),
    };
  }
  if (!employee[0].is_active) {
    return {
      employee: null,
      error: server_1.NextResponse.json(
        { message: "Cannot assign shift to inactive employee" },
        { status: 400 }
      ),
    };
  }
  return { employee: employee[0], error: null };
}
/**
 * Validates employee role matches required role
 */
function validateEmployeeRole(employeeRole, requiredRole) {
  if (requiredRole && employeeRole !== requiredRole) {
    return server_1.NextResponse.json(
      {
        message: `Employee role (${employeeRole}) does not match required role (${requiredRole})`,
      },
      { status: 400 }
    );
  }
  return null;
}
/**
 * Checks for overlapping shifts for an employee
 */
async function checkOverlappingShifts(
  tenantId,
  employeeId,
  shiftStart,
  shiftEnd,
  excludeShiftId
) {
  const overlappingShifts = await database_1.database.$queryRaw(database_1
    .Prisma.sql`
      SELECT id, shift_start, shift_end
      FROM tenant_staff.schedule_shifts
      WHERE tenant_id = ${tenantId}
        AND employee_id = ${employeeId}
        ${excludeShiftId ? database_1.Prisma.sql`AND id != ${excludeShiftId}` : database_1.Prisma.empty}
        AND deleted_at IS NULL
        AND (
          (shift_start < ${shiftEnd}) AND (shift_end > ${shiftStart})
        )
    `);
  return {
    overlaps: overlappingShifts,
    error: null,
  };
}
/**
 * Verifies a schedule exists
 */
async function verifySchedule(tenantId, scheduleId) {
  const schedule = await database_1.database.$queryRaw(database_1.Prisma.sql`
      SELECT id, status
      FROM tenant_staff.schedules
      WHERE tenant_id = ${tenantId}
        AND id = ${scheduleId}
        AND deleted_at IS NULL
    `);
  if (!schedule[0]) {
    return {
      schedule: null,
      error: server_1.NextResponse.json(
        { message: "Schedule not found" },
        { status: 404 }
      ),
    };
  }
  return { schedule: schedule[0], error: null };
}
