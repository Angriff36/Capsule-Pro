"use server";

import { database, Prisma } from "@repo/database";
import { revalidatePath } from "next/cache";
import { runManifestCommand } from "@/lib/manifest-command";
import { requireCurrentUser, requireTenantId } from "../../../lib/tenant";
import type {
  CreateTimeOffRequestInput,
  TimeOffRequest,
  TimeOffRequestsListResponse,
  TimeOffStatus,
  TimeOffType,
  UpdateTimeOffStatusInput,
} from "@/app/lib/staff/time-off/types";
import {
  checkOverlappingTimeOffRequests,
  validateTimeOffDates,
  verifyEmployee,
} from "@/app/lib/staff/time-off/validation";

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
  const tenantId = await requireTenantId();

  const limit = params.limit ?? 50;
  const page = params.page ?? 1;
  const offset = (page - 1) * limit;

  // Build filters
  const hasEmployeeId = Boolean(params.employeeId);
  const hasStatus = Boolean(params.status);
  const hasStartDate = Boolean(params.startDate);
  const hasEndDate = Boolean(params.endDate);
  const hasRequestType = Boolean(params.requestType);

  // Fetch requests and count
  const [requests, totalCount] = await Promise.all([
    database.$queryRaw<TimeOffRequest[]>(
      Prisma.sql`
        SELECT
          tor.id,
          tor.tenant_id,
          tor.employeeId,
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
          tor.reviewed_at AS processed_at,
          tor.reviewed_by AS processed_by,
          processor.first_name AS processed_by_first_name,
          processor.last_name AS processed_by_last_name,
          tor.rejection_reason
        FROM tenant_staff.employee_time_off_requests tor
        JOIN tenant_staff.employees e
          ON e.tenant_id = tor.tenant_id
         AND e.id = tor.employeeId
        LEFT JOIN tenant_staff.employees processor
          ON processor.tenant_id = tor.tenant_id
         AND processor.id = tor.reviewed_by
        WHERE tor.tenant_id = ${tenantId}
          AND tor.deleted_at IS NULL
          ${hasEmployeeId ? Prisma.sql`AND tor.employeeId = ${params.employeeId!}` : Prisma.empty}
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
          ${hasEmployeeId ? Prisma.sql`AND tor.employeeId = ${params.employeeId!}` : Prisma.empty}
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
  const tenantId = await requireTenantId();

  const [request] = await database.$queryRaw<TimeOffRequest[]>(
    Prisma.sql`
      SELECT
        tor.id,
        tor.tenant_id,
        tor.employeeId,
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
        tor.reviewed_at AS processed_at,
        tor.reviewed_by AS processed_by,
        processor.first_name AS processed_by_first_name,
        processor.last_name AS processed_by_last_name,
        tor.rejection_reason
      FROM tenant_staff.employee_time_off_requests tor
      JOIN tenant_staff.employees e
        ON e.tenant_id = tor.tenant_id
       AND e.id = tor.employeeId
      LEFT JOIN tenant_staff.employees processor
        ON processor.tenant_id = tor.tenant_id
       AND processor.id = tor.reviewed_by
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
  const user = await requireCurrentUser();

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
  const { error } = await verifyEmployee(user.tenantId, input.employeeId);
  if (error) {
    throw new Error("Employee not found or inactive");
  }

  // Check for overlapping time-off requests
  const { hasOverlap } = await checkOverlappingTimeOffRequests(
    user.tenantId,
    input.employeeId,
    startDate,
    endDate
  );

  if (hasOverlap) {
    throw new Error("Employee has overlapping time-off requests");
  }

  // Create via governed Manifest command
  const result = await runManifestCommand({
    entity: "TimeOffRequest",
    command: "create",
    body: {
      employeeId: input.employeeId,
      startDate: input.startDate,
      endDate: input.endDate,
      reason: input.reason || "",
      requestType: input.requestType,
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to create time-off request");
  }

  revalidatePath("/scheduling/time-off");
  return { request: result.result as TimeOffRequest };
}

/**
 * Update time-off request status (approve/reject/cancel)
 */
export async function updateTimeOffStatus(
  requestId: string,
  input: UpdateTimeOffStatusInput
): Promise<{ request: TimeOffRequest }> {
  const user = await requireCurrentUser();

  // Get current request to validate transition
  const timeOffRequests = await database.$queryRaw<
    Array<{
      id: string;
      status: string;
      employeeId: string;
      start_date: Date;
      end_date: Date;
    }>
  >(
    Prisma.sql`
      SELECT id, status, employee_id, start_date, end_date
      FROM tenant_staff.employee_time_off_requests
      WHERE tenant_id = ${user.tenantId}
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

  // Dispatch to the appropriate Manifest command based on target status
  let commandName: string;
  let commandBody: Record<string, string>;

  switch (input.status) {
    case "APPROVED":
      commandName = "approve";
      commandBody = { processedBy: user.id };
      break;
    case "REJECTED":
      commandName = "reject";
      commandBody = {
        processedBy: user.id,
        rejectionReason: input.rejectionReason || "",
      };
      break;
    case "CANCELLED":
      commandName = "cancel";
      commandBody = {};
      break;
    default:
      throw new Error(`Unsupported status transition: ${input.status}`);
  }

  const result = await runManifestCommand({
    entity: "TimeOffRequest",
    command: commandName,
    instanceId: requestId,
    body: commandBody,
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to update time-off request status");
  }

  revalidatePath("/scheduling/time-off");
  return { request: result.result as TimeOffRequest };
}

/**
 * Delete a time-off request (soft delete)
 */
export async function deleteTimeOffRequest(
  requestId: string
): Promise<{ success: boolean }> {
  const user = await requireCurrentUser();

  // Get current request to verify it exists
  const timeOffRequests = await database.$queryRaw<
    Array<{ id: string; status: string }>
  >(
    Prisma.sql`
      SELECT id, status
      FROM tenant_staff.employee_time_off_requests
      WHERE tenant_id = ${user.tenantId}
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

  // Soft delete via governed Manifest command
  const result = await runManifestCommand({
    entity: "TimeOffRequest",
    command: "softDelete",
    instanceId: requestId,
    body: {},
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to delete time-off request");
  }

  revalidatePath("/scheduling/time-off");
  return { success: true };
}

/**
 * Get all employees for dropdown
 */
export async function getEmployees() {
  const tenantId = await requireTenantId();

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
