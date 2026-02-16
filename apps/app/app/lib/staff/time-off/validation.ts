import { database, Prisma } from "@repo/database";
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
  const overlappingRequests = await database.$queryRaw<
    Array<{ id: string; start_date: Date; end_date: Date; status: string }>
  >(
    Prisma.sql`
      SELECT id, start_date, end_date, status
      FROM tenant_staff.employee_time_off_requests
      WHERE tenant_id = ${tenantId}
        AND employee_id = ${employeeId}
        ${excludeRequestId ? Prisma.sql`AND id != ${excludeRequestId}` : Prisma.empty}
        AND deleted_at IS NULL
        AND status IN ('PENDING', 'APPROVED')
        AND ((start_date <= ${endDate}) AND (end_date >= ${startDate}))
    `
  );

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
  const employee = await database.$queryRaw<
    Array<{ id: string; role: string; is_active: boolean }>
  >(
    Prisma.sql`
      SELECT id, role, is_active
      FROM tenant_staff.employees
      WHERE tenant_id = ${tenantId}
        AND id = ${employeeId}
        AND deleted_at IS NULL
    `
  );

  if (!employee[0]) {
    return {
      employee: null,
      error: NextResponse.json(
        { message: "Employee not found" },
        { status: 404 }
      ),
    };
  }

  if (!employee[0].is_active) {
    return {
      employee: null,
      error: NextResponse.json(
        { message: "Cannot create time-off request for inactive employee" },
        { status: 400 }
      ),
    };
  }

  return { employee: employee[0], error: null };
}

export async function verifyTimeOffRequest(
  tenantId: string,
  requestId: string
): Promise<{
  request: {
    id: string;
    employee_id: string;
    status: string;
    start_date: Date;
    end_date: Date;
  } | null;
  error: NextResponse | null;
}> {
  const request = await database.$queryRaw<
    Array<{
      id: string;
      employee_id: string;
      status: string;
      start_date: Date;
      end_date: Date;
    }>
  >(
    Prisma.sql`
      SELECT id, employee_id, status, start_date, end_date
      FROM tenant_staff.employee_time_off_requests
      WHERE tenant_id = ${tenantId}
        AND id = ${requestId}
        AND deleted_at IS NULL
    `
  );

  if (!request[0]) {
    return {
      request: null,
      error: NextResponse.json(
        { message: "Time-off request not found" },
        { status: 404 }
      ),
    };
  }

  return { request: request[0], error: null };
}
