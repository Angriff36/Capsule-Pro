import { database } from "@repo/database";
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
  const requests = await database.timeOffRequest.findMany({
    where: {
      tenantId,
      employeeId,
      ...(excludeRequestId ? { id: { not: excludeRequestId } } : {}),
      deletedAt: null,
      status: { in: ["PENDING", "APPROVED"] },
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
    select: { id: true, startDate: true, endDate: true, status: true },
  });
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
  const employee = await database.user.findFirst({
    where: { tenantId, id: employeeId, deletedAt: null },
    select: { id: true, role: true, isActive: true },
  });

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
    employee: { id: employee.id, role: employee.role, is_active: employee.isActive },
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
  const request = await database.timeOffRequest.findFirst({
    where: { tenantId, id: requestId, deletedAt: null },
    select: {
      id: true,
      employeeId: true,
      status: true,
      startDate: true,
      endDate: true,
    },
  });

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
