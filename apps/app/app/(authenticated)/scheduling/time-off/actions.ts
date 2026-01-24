"use server";

import type {
  CreateTimeOffRequestInput,
  TimeOffRequest,
  TimeOffRequestsListResponse,
  TimeOffStatus,
  TimeOffType,
  UpdateTimeOffStatusInput,
} from "@api/staff/time-off/types";
import {
  checkOverlappingTimeOffRequests,
  validateTimeOffDates,
  verifyEmployee,
} from "@api/staff/time-off/validation";
import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { revalidatePath } from "next/cache";
import { getTenantIdForOrg } from "@/app/lib/tenant";

/**
 * Get time-off requests with optional filters
 */
export async function getTimeOffRequests(params: {
  employeeId?: string;
  status?: TimeOffStatus;
  startDate?: string;
  endDate?: string;
  requestType?: TimeOffType;
  page?: number;
  limit?: number;
}): Promise<TimeOffRequestsListResponse> {
  const { orgId } = await auth();
  if (!orgId) {
    throw new Error("Not authenticated");
  }
  const tenantId = await getTenantIdForOrg(orgId);
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
    database.$queryRaw<Array<TimeOffRequest>>(
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
          AND tor.deleted_at IS NULL
          ${hasEmployeeId ? Prisma.sql`AND tor.employee_id = ${params.employeeId!}` : Prisma.empty}
          ${hasStatus ? Prisma.sql`AND tor.status = ${params.status!}` : Prisma.empty}
          ${hasStartDate ? Prisma.sql`AND tor.end_date >= ${new Date(params.startDate!)}` : Prisma.empty}
          ${hasEndDate ? Prisma.sql`AND tor.start_date <= ${new Date(params.endDate!)}` : Prisma.empty}
          ${hasRequestType ? Prisma.sql`AND tor.request_type = ${params.requestType!}` : Prisma.empty}
        ORDER BY tor.created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `
    ),
    database.$queryRaw<[{ count: bigint }]>(
      Prisma.sql`
        SELECT COUNT(*)::bigint
        FROM tenant_staff.employee_time_off_requests tor
        WHERE tor.tenant_id = ${tenantId}
          AND tor.deleted_at IS NULL
          ${hasEmployeeId ? Prisma.sql`AND tor.employee_id = ${params.employeeId!}` : Prisma.empty}
          ${hasStatus ? Prisma.sql`AND tor.status = ${params.status!}` : Prisma.empty}
          ${hasStartDate ? Prisma.sql`AND tor.end_date >= ${new Date(params.startDate!)}` : Prisma.empty}
          ${hasEndDate ? Prisma.sql`AND tor.start_date <= ${new Date(params.endDate!)}` : Prisma.empty}
          ${hasRequestType ? Prisma.sql`AND tor.request_type = ${params.requestType!}` : Prisma.empty}
      `
    ),
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
export async function getTimeOffRequestById(
  requestId: string
): Promise<{ request: TimeOffRequest }> {
  const { orgId } = await auth();
  if (!orgId) throw new Error("Not authenticated");
  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) throw new Error("No tenant found");

  const [request] = await database.$queryRaw<Array<TimeOffRequest>>(
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

  if (!request) {
    throw new Error("Time-off request not found");
  }

  return { request };
}

/**
 * Create a new time-off request
 */
export async function createTimeOffRequest(
  input: CreateTimeOffRequestInput
): Promise<{ request: TimeOffRequest }> {
  const { orgId, userId } = await auth();
  if (!orgId) throw new Error("Not authenticated");
  const tenantId = await getTenantIdForOrg(orgId);
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
  const dateValidationError = validateTimeOffDates(startDate, endDate);
  if (dateValidationError) {
    throw new Error("Invalid date range");
  }

  // Verify employee exists and is active
  const { employee, error } = await verifyEmployee(tenantId, input.employeeId);
  if (error) {
    throw new Error("Employee not found or inactive");
  }

  // Check for overlapping time-off requests
  const { hasOverlap } = await checkOverlappingTimeOffRequests(
    tenantId,
    input.employeeId,
    startDate,
    endDate
  );

  if (hasOverlap) {
    throw new Error("Employee has overlapping time-off requests");
  }

  // Create the time-off request
  const result = await database.$queryRaw<
    Array<{
      id: string;
      tenant_id: string;
      employee_id: string;
      status: string;
      start_date: Date;
      end_date: Date;
      reason: string | null;
      request_type: string;
    }>
  >(
    Prisma.sql`
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
    `
  );

  revalidatePath("/scheduling/time-off");
  return { request: result[0] as TimeOffRequest };
}

/**
 * Update time-off request status (approve/reject/cancel)
 */
export async function updateTimeOffStatus(
  requestId: string,
  input: UpdateTimeOffStatusInput
): Promise<{ request: TimeOffRequest }> {
  const { orgId, userId } = await auth();
  if (!orgId) throw new Error("Not authenticated");
  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) throw new Error("No tenant found");

  // Get current request
  const timeOffRequests = await database.$queryRaw<
    Array<{
      id: string;
      status: string;
      employee_id: string;
      start_date: Date;
      end_date: Date;
    }>
  >(
    Prisma.sql`
      SELECT id, status, employee_id, start_date, end_date
      FROM tenant_staff.employee_time_off_requests
      WHERE tenant_id = ${tenantId}
        AND id = ${requestId}
        AND deleted_at IS NULL
    `
  );

  if (!timeOffRequests || timeOffRequests.length === 0) {
    throw new Error("Time-off request not found");
  }

  const timeOffRequest = timeOffRequests[0];

  // Validate status transition
  const statusTransitionError = await validateStatusTransition(
    timeOffRequest.status as TimeOffStatus,
    input.status,
    input.rejectionReason
  );

  if (statusTransitionError) {
    throw new Error(statusTransitionError.message);
  }

  // Update the time-off request status
  const result = await database.$queryRaw<
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
    `
  );

  revalidatePath("/scheduling/time-off");
  return { request: result[0] as TimeOffRequest };
}

/**
 * Delete a time-off request (soft delete)
 */
export async function deleteTimeOffRequest(
  requestId: string
): Promise<{ success: boolean }> {
  const { orgId } = await auth();
  if (!orgId) throw new Error("Not authenticated");
  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) throw new Error("No tenant found");

  // Get current request to check if it can be deleted
  const timeOffRequests = await database.$queryRaw<
    Array<{ id: string; status: string }>
  >(
    Prisma.sql`
      SELECT id, status
      FROM tenant_staff.employee_time_off_requests
      WHERE tenant_id = ${tenantId}
        AND id = ${requestId}
        AND deleted_at IS NULL
    `
  );

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
  await database.$queryRaw`
    UPDATE tenant_staff.employee_time_off_requests
    SET deleted_at = now()
    WHERE tenant_id = ${tenantId}
      AND id = ${requestId}
  `;

  revalidatePath("/scheduling/time-off");
  return { success: true };
}

/**
 * Get all employees for dropdown
 */
export async function getEmployees() {
  const { orgId } = await auth();
  if (!orgId) throw new Error("Not authenticated");
  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) throw new Error("No tenant found");

  const employees = await database.$queryRaw<
    Array<{
      id: string;
      email: string;
      first_name: string | null;
      last_name: string | null;
      role: string;
      is_active: boolean;
    }>
  >(
    Prisma.sql`
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
    `
  );

  return { employees };
}

/**
 * Get all time-off types for dropdown
 */
export const timeOffTypes: TimeOffType[] = [
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
  currentStatus: TimeOffStatus,
  newStatus: TimeOffStatus,
  rejectionReason?: string
): Promise<{ message: string } | null> {
  // PENDING can transition to APPROVED, REJECTED, or CANCELLED
  // APPROVED can transition to CANCELLED
  // REJECTED cannot transition (must create new request)
  // CANCELLED cannot transition

  const validTransitions: Record<TimeOffStatus, TimeOffStatus[]> = {
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
