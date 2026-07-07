"use server";

import { database, type Prisma } from "@repo/database";
import { revalidatePath } from "next/cache";
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
import { runManifestCommand } from "@/lib/manifest-command";
import { requireCurrentUser, requireTenantId } from "../../../../lib/tenant";

/**
 * Get time-off requests with optional filters
 */
function buildTimeOffWhere(
  tenantId: string,
  params: {
    employeeId?: string;
    status?: TimeOffStatus;
    startDate?: string;
    endDate?: string;
    requestType?: TimeOffType;
  }
): Prisma.TimeOffRequestWhereInput {
  return {
    tenantId,
    deletedAt: null,
    ...(params.employeeId ? { employeeId: params.employeeId } : {}),
    ...(params.status ? { status: params.status } : {}),
    ...(params.startDate
      ? { endDate: { gte: new Date(params.startDate) } }
      : {}),
    ...(params.endDate ? { startDate: { lte: new Date(params.endDate) } } : {}),
    ...(params.requestType ? { requestType: params.requestType } : {}),
  };
}

async function mapTimeOffRequests(
  tenantId: string,
  records: Array<{
    id: string;
    tenantId: string;
    employeeId: string;
    startDate: Date;
    endDate: Date;
    reason: string | null;
    status: string;
    requestType: string;
    createdAt: Date;
    updatedAt: Date;
    reviewedAt: Date | null;
    reviewedBy: string | null;
    rejectionReason: string | null;
  }>
): Promise<TimeOffRequest[]> {
  const userIds = Array.from(
    new Set(
      records.flatMap((record) =>
        record.reviewedBy
          ? [record.employeeId, record.reviewedBy]
          : [record.employeeId]
      )
    )
  );
  const users =
    userIds.length > 0
      ? await database.user.findMany({
          where: { tenantId, id: { in: userIds }, deletedAt: null },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        })
      : [];
  const usersById = new Map(users.map((user) => [user.id, user]));

  return records.map((record) => {
    const employee = usersById.get(record.employeeId);
    const processor = record.reviewedBy
      ? usersById.get(record.reviewedBy)
      : undefined;
    return {
      id: record.id,
      tenant_id: record.tenantId,
      employeeId: record.employeeId,
      employeeFirstName: employee?.firstName ?? null,
      employeeLastName: employee?.lastName ?? null,
      employeeEmail: employee?.email ?? "",
      employeeRole: employee?.role ?? "staff",
      start_date: record.startDate,
      end_date: record.endDate,
      reason: record.reason,
      status: record.status as TimeOffStatus,
      request_type: record.requestType as TimeOffType,
      created_at: record.createdAt,
      updated_at: record.updatedAt,
      processed_at: record.reviewedAt,
      processed_by: record.reviewedBy,
      processed_by_first_name: processor?.firstName ?? null,
      processed_by_last_name: processor?.lastName ?? null,
      rejection_reason: record.rejectionReason,
    };
  });
}

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

  const where = buildTimeOffWhere(tenantId, params);

  // Fetch requests and count
  const [records, totalCount] = await Promise.all([
    database.timeOffRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    database.timeOffRequest.count({ where }),
  ]);
  const requests = await mapTimeOffRequests(tenantId, records);

  return {
    requests,
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limit),
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

  const record = await database.timeOffRequest.findFirst({
    where: { tenantId, id: requestId, deletedAt: null },
  });

  if (!record) {
    throw new Error("Time-off request not found");
  }

  const [request] = await mapTimeOffRequests(tenantId, [record]);
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
  const timeOffRequest = await database.timeOffRequest.findFirst({
    where: { tenantId: user.tenantId, id: requestId, deletedAt: null },
    select: {
      id: true,
      status: true,
      employeeId: true,
      startDate: true,
      endDate: true,
    },
  });

  if (!timeOffRequest) {
    throw new Error("Time-off request not found");
  }

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
    throw new Error(
      result.message || "Failed to update time-off request status"
    );
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
  const currentRequest = await database.timeOffRequest.findFirst({
    where: { tenantId: user.tenantId, id: requestId, deletedAt: null },
    select: { id: true, status: true },
  });

  if (!currentRequest) {
    throw new Error("Time-off request not found");
  }

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

  const employeeRecords = await database.user.findMany({
    where: {
      tenantId,
      deletedAt: null,
      isActive: true,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  const employees = employeeRecords.map((employee) => ({
    id: employee.id,
    email: employee.email,
    first_name: employee.firstName,
    last_name: employee.lastName,
    role: employee.role,
    is_active: employee.isActive,
  }));

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
