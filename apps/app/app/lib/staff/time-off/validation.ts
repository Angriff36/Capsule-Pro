import { listTimeOffRequests } from "@/app/lib/manifest-client.generated";
import {
  getTimeOffRequestById,
  loadUsers,
} from "@/app/lib/scheduling/server-reads";
import { isDeleted } from "@/app/lib/scheduling/shift-utils";
import { NextResponse } from "next/server";

import type { TimeOffStatus } from "./types";

export function validateTimeOffDates(
  startDate: Date,
  endDate: Date
): NextResponse | null {
  if (endDate < startDate) {
    return NextResponse.json(
      { message: "End date must be on or after start date" },
      { status: 400 }
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (startDate < today) {
    return NextResponse.json(
      { message: "Cannot request time off for past dates" },
      { status: 400 }
    );
  }

  return null;
}

export function validateStatusTransition(
  currentStatus: TimeOffStatus,
  newStatus: TimeOffStatus,
  rejectionReason?: string
): NextResponse | null {
  const validTransitions: Record<TimeOffStatus, TimeOffStatus[]> = {
    PENDING: ["APPROVED", "REJECTED", "CANCELLED"],
    APPROVED: ["CANCELLED"],
    REJECTED: [],
    CANCELLED: [],
  };

  const allowedTransitions = validTransitions[currentStatus];
  if (!allowedTransitions.includes(newStatus)) {
    return NextResponse.json(
      {
        message: `Cannot transition from ${currentStatus} to ${newStatus}`,
      },
      { status: 400 }
    );
  }

  if (newStatus === "REJECTED" && !rejectionReason) {
    return NextResponse.json(
      { message: "Rejection reason is required" },
      { status: 400 }
    );
  }

  return null;
}

export async function checkOverlappingTimeOffRequests(
  tenantId: string,
  employeeId: string,
  startDate: Date,
  endDate: Date,
  excludeRequestId?: string
): Promise<{
  hasOverlap: boolean;
  overlappingRequests: Array<{
    id: string;
    start_date: Date;
    end_date: Date;
    status: string;
  }>;
}> {
  const requests = (await listTimeOffRequests()).data.filter(
    (request) =>
      request.employeeId === employeeId &&
      !request.deletedAt &&
      ["PENDING", "APPROVED"].includes(request.status) &&
      new Date(request.startDate) <= endDate &&
      new Date(request.endDate) >= startDate &&
      (!excludeRequestId || request.id !== excludeRequestId),
  );
  const overlappingRequests = requests.map((request) => ({
    id: request.id,
    start_date: request.startDate,
    end_date: request.endDate,
    status: request.status,
  }));

  return {
    hasOverlap: overlappingRequests.length > 0,
    overlappingRequests,
  };
}

export async function verifyEmployee(
  tenantId: string,
  employeeId: string
): Promise<{
  employee: { id: string; role: string; is_active: boolean } | null;
  error: NextResponse | null;
}> {
  const employee = (await loadUsers()).find(
    (user) =>
      user.id === employeeId && !isDeleted(user.deletedAt),
  );

  if (!employee) {
    return {
      employee: null,
      error: NextResponse.json(
        { message: "Employee not found" },
        { status: 404 }
      ),
    };
  }

  if (!employee.isActive) {
    return {
      employee: null,
      error: NextResponse.json(
        { message: "Cannot create time-off request for inactive employee" },
        { status: 400 }
      ),
    };
  }

  return {
    employee: {
      id: employee.id,
      role: employee.role ?? "",
      is_active: employee.isActive,
    },
    error: null,
  };
}

export async function verifyTimeOffRequest(
  tenantId: string,
  requestId: string
): Promise<{
  request: {
    id: string;
    employeeId: string;
    status: string;
    start_date: Date;
    end_date: Date;
  } | null;
  error: NextResponse | null;
}> {
  const request = await getTimeOffRequestById(requestId);
  if (request && isDeleted(request.deletedAt)) {
    return {
      request: null,
      error: NextResponse.json(
        { message: "Time-off request not found" },
        { status: 404 }
      ),
    };
  }

  if (!request) {
    return {
      request: null,
      error: NextResponse.json(
        { message: "Time-off request not found" },
        { status: 404 }
      ),
    };
  }

  return {
    request: {
      id: request.id,
      employeeId: request.employeeId,
      status: request.status,
      start_date: request.startDate,
      end_date: request.endDate,
    },
    error: null,
  };
}
