import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import type {
  CreateTimeOffRequestInput,
  TimeOffRequest,
  TimeOffRequestsListResponse,
  TimeOffStatus,
  TimeOffType,
} from "../types";
import {
  checkOverlappingTimeOffRequests,
  validateTimeOffDates,
  verifyEmployee,
} from "../validation";

/**
 * GET /api/staff/time-off/requests
 * List time-off requests with optional filtering
 *
 * Query params:
 * - employeeId: Filter by employee
 * - status: Filter by status (PENDING, APPROVED, REJECTED, CANCELLED)
 * - startDate: Filter requests starting on or after this date
 * - endDate: Filter requests ending on or before this date
 * - requestType: Filter by request type
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 50)
 */
export async function GET(request: Request) {
  const { orgId, userId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { searchParams } = new URL(request.url);

  const employeeId = searchParams.get("employeeId");
  const status = searchParams.get("status");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const requestType = searchParams.get("requestType");
  const page = Number.parseInt(searchParams.get("page") || "1", 10);
  const limit = Number.parseInt(searchParams.get("limit") || "50", 10);
  const offset = (page - 1) * limit;

  const requests = await database.$queryRaw<
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
          ${employeeId ? Prisma.sql`AND tor.employee_id = ${employeeId}` : Prisma.empty}
          ${status ? Prisma.sql`AND tor.status = ${status}` : Prisma.empty}
          ${startDate ? Prisma.sql`AND tor.end_date >= ${new Date(startDate)}` : Prisma.empty}
          ${endDate ? Prisma.sql`AND tor.start_date <= ${new Date(endDate)}` : Prisma.empty}
          ${requestType ? Prisma.sql`AND tor.request_type = ${requestType}` : Prisma.empty}
        ORDER BY tor.created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `
    );

  // Get total count
  const totalCountResult = await database.$queryRaw<[{ count: bigint }]>(
    Prisma.sql`
      SELECT COUNT(*)::bigint
      FROM tenant_staff.employee_time_off_requests tor
      WHERE tor.tenant_id = ${tenantId}
        AND tor.deleted_at IS NULL
        ${employeeId ? Prisma.sql`AND tor.employee_id = ${employeeId}` : Prisma.empty}
        ${status ? Prisma.sql`AND tor.status = ${status}` : Prisma.empty}
        ${startDate ? Prisma.sql`AND tor.end_date >= ${new Date(startDate)}` : Prisma.empty}
        ${endDate ? Prisma.sql`AND tor.start_date <= ${new Date(endDate)}` : Prisma.empty}
        ${requestType ? Prisma.sql`AND tor.request_type = ${requestType}` : Prisma.empty}
    `
  );

  // Map raw results to TimeOffRequest type with proper status casting
  const typedRequests: TimeOffRequest[] = requests.map((req) => ({
    ...req,
    status: req.status as TimeOffStatus,
    request_type: req.request_type as TimeOffType,
  }));

  const response: TimeOffRequestsListResponse = {
    requests: typedRequests,
    pagination: {
      page,
      limit,
      total: Number(totalCountResult[0].count),
      totalPages: Math.ceil(Number(totalCountResult[0].count) / limit),
    },
  };

  return NextResponse.json(response);
}

/**
 * POST /api/staff/time-off/requests
 * Create a new time-off request
 *
 * Required fields:
 * - employeeId: Employee requesting time off
 * - startDate: Start date (ISO date string)
 * - endDate: End date (ISO date string)
 * - requestType: Type of time off
 *
 * Optional fields:
 * - reason: Reason for time off
 */
export async function POST(request: Request) {
  const { orgId, userId } = await auth();
  if (!(orgId && userId)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const body = (await request.json()) as CreateTimeOffRequestInput;

  // Validate required fields
  if (
    !(body.employeeId && body.startDate && body.endDate && body.requestType)
  ) {
    return NextResponse.json(
      {
        message:
          "Employee ID, start date, end date, and request type are required",
      },
      { status: 400 }
    );
  }

  const startDate = new Date(body.startDate);
  const endDate = new Date(body.endDate);

  // Validate dates
  const dateValidationError = validateTimeOffDates(startDate, endDate);
  if (dateValidationError) {
    return dateValidationError;
  }

  // Verify employee exists and is active
  const { employee, error: employeeError } = await verifyEmployee(
    tenantId,
    body.employeeId
  );
  if (employeeError) {
    return employeeError;
  }

  // Check for overlapping time-off requests
  const { hasOverlap, overlappingRequests } =
    await checkOverlappingTimeOffRequests(
      tenantId,
      body.employeeId,
      startDate,
      endDate
    );

  if (hasOverlap) {
    return NextResponse.json(
      {
        message: "Employee has overlapping time-off requests",
        overlappingRequests,
      },
      { status: 409 }
    );
  }

  try {
    // Create the time-off request
    const result = await database.$queryRaw<
      Array<{
        id: string;
        employee_id: string;
        status: string;
        start_date: Date;
        end_date: Date;
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
          ${body.employeeId},
          ${startDate},
          ${endDate},
          ${body.reason || null},
          ${body.requestType},
          'PENDING'
        )
        RETURNING id, employee_id, status, start_date, end_date
      `
    );

    return NextResponse.json({ request: result[0] }, { status: 201 });
  } catch (error) {
    console.error("Error creating time-off request:", error);
    return NextResponse.json(
      { message: "Failed to create time-off request" },
      { status: 500 }
    );
  }
}
