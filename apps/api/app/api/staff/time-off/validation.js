Object.defineProperty(exports, "__esModule", { value: true });
exports.validateTimeOffDates = validateTimeOffDates;
exports.validateStatusTransition = validateStatusTransition;
exports.checkOverlappingTimeOffRequests = checkOverlappingTimeOffRequests;
exports.verifyEmployee = verifyEmployee;
exports.verifyTimeOffRequest = verifyTimeOffRequest;
const database_1 = require("@repo/database");
const server_1 = require("next/server");
/**
 * Validates time-off request dates
 */
function validateTimeOffDates(startDate, endDate) {
  if (endDate < startDate) {
    return server_1.NextResponse.json(
      { message: "End date must be on or after start date" },
      { status: 400 }
    );
  }
  // Check for past dates (not allowed unless already approved for historical entry)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (startDate < today) {
    return server_1.NextResponse.json(
      { message: "Cannot request time off for past dates" },
      { status: 400 }
    );
  }
  return null;
}
/**
 * Validates time-off status transition
 */
function validateStatusTransition(currentStatus, newStatus, rejectionReason) {
  // PENDING can transition to APPROVED, REJECTED, or CANCELLED
  // APPROVED can transition to CANCELLED
  // REJECTED cannot transition (must create new request)
  // CANCELLED cannot transition
  const validTransitions = {
    PENDING: ["APPROVED", "REJECTED", "CANCELLED"],
    APPROVED: ["CANCELLED"],
    REJECTED: [],
    CANCELLED: [],
  };
  const allowedTransitions = validTransitions[currentStatus];
  if (!allowedTransitions.includes(newStatus)) {
    return server_1.NextResponse.json(
      {
        message: `Cannot transition from ${currentStatus} to ${newStatus}`,
      },
      { status: 400 }
    );
  }
  // Rejection requires reason
  if (newStatus === "REJECTED" && !rejectionReason) {
    return server_1.NextResponse.json(
      { message: "Rejection reason is required" },
      { status: 400 }
    );
  }
  return null;
}
/**
 * Checks for overlapping time-off requests for an employee
 */
async function checkOverlappingTimeOffRequests(
  tenantId,
  employeeId,
  startDate,
  endDate,
  excludeRequestId
) {
  const overlappingRequests = await database_1.database.$queryRaw(database_1
    .Prisma.sql`
      SELECT id, start_date, end_date, status
      FROM tenant_staff.employee_time_off_requests
      WHERE tenant_id = ${tenantId}
        AND employee_id = ${employeeId}
        ${excludeRequestId ? database_1.Prisma.sql`AND id != ${excludeRequestId}` : database_1.Prisma.empty}
        AND deleted_at IS NULL
        AND status IN ('PENDING', 'APPROVED')
        AND (
          (start_date <= ${endDate}) AND (end_date >= ${startDate})
        )
    `);
  return {
    hasOverlap: overlappingRequests.length > 0,
    overlappingRequests,
  };
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
        { message: "Cannot create time-off request for inactive employee" },
        { status: 400 }
      ),
    };
  }
  return { employee: employee[0], error: null };
}
/**
 * Verifies a time-off request exists
 */
async function verifyTimeOffRequest(tenantId, requestId) {
  const request = await database_1.database.$queryRaw(database_1.Prisma.sql`
      SELECT id, employee_id, status, start_date, end_date
      FROM tenant_staff.employee_time_off_requests
      WHERE tenant_id = ${tenantId}
        AND id = ${requestId}
        AND deleted_at IS NULL
    `);
  if (!request[0]) {
    return {
      request: null,
      error: server_1.NextResponse.json(
        { message: "Time-off request not found" },
        { status: 404 }
      ),
    };
  }
  return { request: request[0], error: null };
}
