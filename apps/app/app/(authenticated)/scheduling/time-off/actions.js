"use server";

Object.defineProperty(exports, "__esModule", { value: true });
exports.timeOffTypes = void 0;
exports.getTimeOffRequests = getTimeOffRequests;
exports.getTimeOffRequestById = getTimeOffRequestById;
exports.createTimeOffRequest = createTimeOffRequest;
exports.updateTimeOffStatus = updateTimeOffStatus;
exports.deleteTimeOffRequest = deleteTimeOffRequest;
exports.getEmployees = getEmployees;
const validation_1 = require("@api/staff/time-off/validation");
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const cache_1 = require("next/cache");
const tenant_1 = require("@/app/lib/tenant");
/**
 * Get time-off requests with optional filters
 */
async function getTimeOffRequests(params) {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    throw new Error("Not authenticated");
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  if (!tenantId) {
    throw new Error("No tenant found");
  }
  const limit = params.limit ?? 50;
  const page = params.page ?? 1;
  const offset = (page - 1) * limit;
  // Build filters
  const hasEmployeeId = params.employeeId !== undefined;
  const hasStatus = params.status !== undefined;
  const hasStartDate = params.startDate !== undefined;
  const hasEndDate = params.endDate !== undefined;
  const hasRequestType = params.requestType !== undefined;
  // Fetch requests and count
  const [requests, totalCount] = await Promise.all([
    database_1.database.$queryRaw(database_1.Prisma.sql`
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
          AND tor.deleted_at IS NULL
          ${hasEmployeeId ? database_1.Prisma.sql`AND tor.employee_id = ${params.employeeId}` : database_1.Prisma.empty}
          ${hasStatus ? database_1.Prisma.sql`AND tor.status = ${params.status}` : database_1.Prisma.empty}
          ${hasStartDate ? database_1.Prisma.sql`AND tor.end_date >= ${new Date(params.startDate)}` : database_1.Prisma.empty}
          ${hasEndDate ? database_1.Prisma.sql`AND tor.start_date <= ${new Date(params.endDate)}` : database_1.Prisma.empty}
          ${hasRequestType ? database_1.Prisma.sql`AND tor.request_type = ${params.requestType}` : database_1.Prisma.empty}
        ORDER BY tor.created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `),
    database_1.database.$queryRaw(database_1.Prisma.sql`
        SELECT COUNT(*)::bigint
        FROM tenant_staff.employee_time_off_requests tor
        WHERE tor.tenant_id = ${tenantId}
          AND tor.deleted_at IS NULL
          ${hasEmployeeId ? database_1.Prisma.sql`AND tor.employee_id = ${params.employeeId}` : database_1.Prisma.empty}
          ${hasStatus ? database_1.Prisma.sql`AND tor.status = ${params.status}` : database_1.Prisma.empty}
          ${hasStartDate ? database_1.Prisma.sql`AND tor.end_date >= ${new Date(params.startDate)}` : database_1.Prisma.empty}
          ${hasEndDate ? database_1.Prisma.sql`AND tor.start_date <= ${new Date(params.endDate)}` : database_1.Prisma.empty}
          ${hasRequestType ? database_1.Prisma.sql`AND tor.request_type = ${params.requestType}` : database_1.Prisma.empty}
      `),
  ]);
  return {
    requests,
    pagination: {
      page,
      limit,
      total: Number(totalCount[0].count),
      totalPages: Math.ceil(Number(totalCount[0].count) / limit),
    },
  };
}
/**
 * Get a single time-off request by ID
 */
async function getTimeOffRequestById(requestId) {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) throw new Error("Not authenticated");
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  if (!tenantId) throw new Error("No tenant found");
  const [request] = await database_1.database.$queryRaw(database_1.Prisma.sql`
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
  if (!request) {
    throw new Error("Time-off request not found");
  }
  return { request };
}
/**
 * Create a new time-off request
 */
async function createTimeOffRequest(input) {
  const { orgId, userId } = await (0, server_1.auth)();
  if (!orgId) throw new Error("Not authenticated");
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  if (!tenantId) throw new Error("No tenant found");
  const startDate = new Date(input.startDate);
  const endDate = new Date(input.endDate);
  // Validate required fields
  if (
    !(input.employeeId && input.startDate && input.endDate && input.requestType)
  ) {
    throw new Error(
      "Employee ID, start date, end date, and request type are required"
    );
  }
  // Validate dates
  const dateValidationError = (0, validation_1.validateTimeOffDates)(
    startDate,
    endDate
  );
  if (dateValidationError) {
    throw new Error("Invalid date range");
  }
  // Verify employee exists and is active
  const { employee, error } = await (0, validation_1.verifyEmployee)(
    tenantId,
    input.employeeId
  );
  if (error) {
    throw new Error("Employee not found or inactive");
  }
  // Check for overlapping time-off requests
  const { hasOverlap } = await (0,
  validation_1.checkOverlappingTimeOffRequests)(
    tenantId,
    input.employeeId,
    startDate,
    endDate
  );
  if (hasOverlap) {
    throw new Error("Employee has overlapping time-off requests");
  }
  // Create the time-off request
  const result = await database_1.database.$queryRaw(database_1.Prisma.sql`
      INSERT INTO tenant_staff.employee_time_off_requests (
        tenant_id,
        employee_id,
        start_date,
        end_date,
        reason,
        request_type,
        status
      )
      VALUES (
        ${tenantId},
        ${input.employeeId},
        ${startDate},
        ${endDate},
        ${input.reason || null},
        ${input.requestType},
        'PENDING'
      )
      RETURNING id, tenant_id, employee_id, status, start_date, end_date, reason, request_type
    `);
  (0, cache_1.revalidatePath)("/scheduling/time-off");
  return { request: result[0] };
}
/**
 * Update time-off request status (approve/reject/cancel)
 */
async function updateTimeOffStatus(requestId, input) {
  const { orgId, userId } = await (0, server_1.auth)();
  if (!orgId) throw new Error("Not authenticated");
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  if (!tenantId) throw new Error("No tenant found");
  // Get current request
  const timeOffRequests = await database_1.database.$queryRaw(database_1.Prisma
    .sql`
      SELECT id, status, employee_id, start_date, end_date
      FROM tenant_staff.employee_time_off_requests
      WHERE tenant_id = ${tenantId}
        AND id = ${requestId}
        AND deleted_at IS NULL
    `);
  if (!timeOffRequests || timeOffRequests.length === 0) {
    throw new Error("Time-off request not found");
  }
  const timeOffRequest = timeOffRequests[0];
  // Validate status transition
  const statusTransitionError = await validateStatusTransition(
    timeOffRequest.status,
    input.status,
    input.rejectionReason
  );
  if (statusTransitionError) {
    throw new Error(statusTransitionError.message);
  }
  // Update the time-off request status
  const result = await database_1.database.$queryRaw(database_1.Prisma.sql`
      UPDATE tenant_staff.employee_time_off_requests
      SET
        status = ${input.status},
        processed_at = now(),
        processed_by = ${userId},
        rejection_reason = ${input.status === "REJECTED" ? input.rejectionReason : null},
        updated_at = now()
      WHERE tenant_id = ${tenantId}
        AND id = ${requestId}
        AND deleted_at IS NULL
      RETURNING
        id,
        tenant_id,
        employee_id,
        e.first_name AS employee_first_name,
        e.last_name AS employee_last_name,
        e.email AS employee_email,
        e.role AS employee_role,
        start_date,
        end_date,
        reason,
        status,
        request_type,
        created_at,
        updated_at,
        processed_at,
        processed_by,
        processor.first_name AS processed_by_first_name,
        processor.last_name AS processed_by_last_name,
        rejection_reason
    `);
  (0, cache_1.revalidatePath)("/scheduling/time-off");
  return { request: result[0] };
}
/**
 * Delete a time-off request (soft delete)
 */
async function deleteTimeOffRequest(requestId) {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) throw new Error("Not authenticated");
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  if (!tenantId) throw new Error("No tenant found");
  // Get current request to check if it can be deleted
  const timeOffRequests = await database_1.database.$queryRaw(database_1.Prisma
    .sql`
      SELECT id, status
      FROM tenant_staff.employee_time_off_requests
      WHERE tenant_id = ${tenantId}
        AND id = ${requestId}
        AND deleted_at IS NULL
    `);
  if (!timeOffRequests || timeOffRequests.length === 0) {
    throw new Error("Time-off request not found");
  }
  const currentRequest = timeOffRequests[0];
  // Only allow deletion of PENDING or CANCELLED requests
  if (
    currentRequest.status !== "PENDING" &&
    currentRequest.status !== "CANCELLED"
  ) {
    throw new Error(
      `Cannot delete ${currentRequest.status} time-off request. Only PENDING and CANCELLED requests can be deleted.`
    );
  }
  // Soft delete the time-off request
  await database_1.database.$queryRaw`
    UPDATE tenant_staff.employee_time_off_requests
    SET deleted_at = now()
    WHERE tenant_id = ${tenantId}
      AND id = ${requestId}
  `;
  (0, cache_1.revalidatePath)("/scheduling/time-off");
  return { success: true };
}
/**
 * Get all employees for dropdown
 */
async function getEmployees() {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) throw new Error("Not authenticated");
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  if (!tenantId) throw new Error("No tenant found");
  const employees = await database_1.database.$queryRaw(database_1.Prisma.sql`
      SELECT
        id,
        email,
        first_name,
        last_name,
        role,
        is_active
      FROM tenant_staff.employees
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
        AND is_active = true
      ORDER BY last_name ASC, first_name ASC
    `);
  return { employees };
}
/**
 * Get all time-off types for dropdown
 */
exports.timeOffTypes = [
  "VACATION",
  "SICK_LEAVE",
  "PERSONAL_DAY",
  "BEREAVEMENT",
  "MATERNITY_LEAVE",
  "PATERNITY_LEAVE",
  "OTHER",
];
// Helper function to validate status transition (adapted from API validation)
async function validateStatusTransition(
  currentStatus,
  newStatus,
  rejectionReason
) {
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
    return {
      message: `Cannot transition from ${currentStatus} to ${newStatus}`,
    };
  }
  // Rejection requires reason
  if (newStatus === "REJECTED" && !rejectionReason) {
    return { message: "Rejection reason is required" };
  }
  return null;
}
