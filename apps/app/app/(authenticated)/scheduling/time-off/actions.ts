"use server";

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
import {
  activeUsers,
  getTimeOffRequestById as loadTimeOffRequestRecord,
  loadTimeOffRequests,
  loadUsers,
} from "@/app/lib/scheduling/server-reads";
import { isDeleted, toDate } from "@/app/lib/scheduling/shift-utils";
import type { TimeOffRequest as TimeOffRecord } from "@/app/lib/manifest-types.generated";
import { runManifestCommand } from "@/lib/manifest-command";
import { requireCurrentUser, requireTenantId } from "../../../lib/tenant";

function matchesTimeOffFilters(
  record: TimeOffRecord,
  params: {
    employeeId?: string;
    status?: TimeOffStatus;
    startDate?: string;
    endDate?: string;
    requestType?: TimeOffType;
  }
): boolean {
  if (isDeleted(record.deletedAt)) return false;
  if (params.employeeId && record.employeeId !== params.employeeId) return false;
  if (params.status && record.status !== params.status) return false;
  if (params.requestType && record.requestType !== params.requestType) return false;
  if (params.startDate) {
    const end = toDate(record.endDate);
    if (!end || end < new Date(params.startDate)) return false;
  }
  if (params.endDate) {
    const start = toDate(record.startDate);
    if (!start || start > new Date(params.endDate)) return false;
  }
  return true;
}

async function mapTimeOffRequests(
  records: TimeOffRecord[]
): Promise<TimeOffRequest[]> {
  const userIds = Array.from(
    new Set(
      records.flatMap((record) =>
        record.reviewedBy
          ? [record.employeeId ?? "", record.reviewedBy]
          : [record.employeeId ?? ""]
      )
    )
  ).filter(Boolean);
  const users = await loadUsers();
  const usersById = new Map(
    users.filter((user) => userIds.includes(user.id)).map((user) => [user.id, user])
  );

  return records.map((record) => {
    const employee = usersById.get(record.employeeId ?? "");
    const processor = record.reviewedBy
      ? usersById.get(record.reviewedBy)
      : undefined;
    return {
      id: record.id,
      tenant_id: record.tenantId,
      employeeId: record.employeeId ?? "",
      employeeFirstName: employee?.firstName ?? null,
      employeeLastName: employee?.lastName ?? null,
      employeeEmail: employee?.email ?? "",
      employeeRole: employee?.role ?? "staff",
      start_date: toDate(record.startDate) ?? new Date(),
      end_date: toDate(record.endDate) ?? new Date(),
      reason: record.reason ?? null,
      status: (record.status ?? "PENDING") as TimeOffStatus,
      request_type: (record.requestType ?? "vacation") as TimeOffType,
      created_at: toDate(record.createdAt) ?? new Date(),
      updated_at: toDate(record.updatedAt) ?? new Date(),
      processed_at: toDate(record.reviewedAt),
      processed_by: record.reviewedBy ?? null,
      processed_by_first_name: processor?.firstName ?? null,
      processed_by_last_name: processor?.lastName ?? null,
      rejection_reason: record.rejectionReason ?? null,
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
  await requireTenantId();

  const limit = params.limit ?? 50;
  const page = params.page ?? 1;
  const offset = (page - 1) * limit;

  const filtered = (await loadTimeOffRequests()).filter((record) =>
    matchesTimeOffFilters(record, params)
  );
  const totalCount = filtered.length;
  const pageRecords = filtered.slice(offset, offset + limit);
  const requests = await mapTimeOffRequests(pageRecords);

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

export async function getTimeOffRequestById(
  requestId: string
): Promise<{ request: TimeOffRequest }> {
  await requireTenantId();

  const record = await loadTimeOffRequestRecord(requestId);
  if (!record) throw new Error("Time-off request not found");

  const [request] = await mapTimeOffRequests([record]);
  return { request };
}

export async function createTimeOffRequest(
  input: CreateTimeOffRequestInput
): Promise<{ request: TimeOffRequest }> {
  const user = await requireCurrentUser();

  const startDate = new Date(input.startDate);
  const endDate = new Date(input.endDate);

  if (
    !(input.employeeId && input.startDate && input.endDate && input.requestType)
  ) {
    throw new Error(
      "Employee ID, start date, end date, and request type are required"
    );
  }

  const dateValidationError = validateTimeOffDates(startDate, endDate);
  if (dateValidationError) {
    throw new Error("Invalid date range");
  }

  const { error } = await verifyEmployee(user.tenantId, input.employeeId);
  if (error) {
    throw new Error("Employee not found or inactive");
  }

  const { hasOverlap } = await checkOverlappingTimeOffRequests(
    user.tenantId,
    input.employeeId,
    startDate,
    endDate
  );

  if (hasOverlap) {
    throw new Error("Employee has overlapping time-off requests");
  }

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

export async function updateTimeOffStatus(
  requestId: string,
  input: UpdateTimeOffStatusInput
): Promise<{ request: TimeOffRequest }> {
  const user = await requireCurrentUser();

  const timeOffRequest = await loadTimeOffRequestRecord(requestId);
  if (!timeOffRequest) {
    throw new Error("Time-off request not found");
  }

  const statusTransitionError = await validateStatusTransition(
    (timeOffRequest.status ?? "PENDING") as TimeOffStatus,
    input.status,
    input.rejectionReason
  );

  if (statusTransitionError) {
    throw new Error(statusTransitionError.message);
  }

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

export async function deleteTimeOffRequest(
  requestId: string
): Promise<{ success: boolean }> {
  const user = await requireCurrentUser();

  const currentRequest = await loadTimeOffRequestRecord(requestId);
  if (!currentRequest) {
    throw new Error("Time-off request not found");
  }

  if (
    currentRequest.status !== "PENDING" &&
    currentRequest.status !== "CANCELLED"
  ) {
    throw new Error(
      `Cannot delete ${currentRequest.status} time-off request. Only PENDING and CANCELLED requests can be deleted.`
    );
  }

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

export async function getEmployees() {
  await requireTenantId();

  const employees = activeUsers(await loadUsers()).map((employee) => ({
    id: employee.id,
    email: employee.email,
    first_name: employee.firstName ?? null,
    last_name: employee.lastName ?? null,
    role: employee.role ?? "staff",
    is_active: employee.isActive ?? true,
  }));

  return { employees };
}

async function validateStatusTransition(
  currentStatus: TimeOffStatus,
  newStatus: TimeOffStatus,
  rejectionReason?: string
): Promise<{ message: string } | null> {
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

  if (newStatus === "REJECTED" && !rejectionReason) {
    return { message: "Rejection reason is required" };
  }

  return null;
}
