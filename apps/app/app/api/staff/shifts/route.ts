import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import {
  checkOverlappingShifts,
  validateEmployeeRole,
  validateShiftTimes,
  verifyEmployee,
  verifySchedule,
} from "./validation";

/**
 * GET /api/staff/shifts
 * List shifts with optional filtering
 *
 * Query params:
 * - startDate: Filter shifts starting after this date
 * - endDate: Filter shifts ending before this date
 * - employeeId: Filter by assigned employee
 * - locationId: Filter by location
 * - role: Filter by role during shift
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 50)
 */
export async function GET(request: Request) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { searchParams } = new URL(request.url);

  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const employeeId = searchParams.get("employeeId");
  const locationId = searchParams.get("locationId");
  const role = searchParams.get("role");
  const page = Number.parseInt(searchParams.get("page") || "1", 10);
  const limit = Number.parseInt(searchParams.get("limit") || "50", 10);
  const offset = (page - 1) * limit;

  const [shifts, totalCount] = await Promise.all([
    database.$queryRaw<
      Array<{
        id: string;
        schedule_id: string;
        employee_id: string;
        employee_first_name: string | null;
        employee_last_name: string | null;
        employee_email: string;
        employee_role: string;
        location_id: string;
        location_name: string;
        shift_start: Date;
        shift_end: Date;
        role_during_shift: string | null;
        notes: string | null;
        created_at: Date;
        updated_at: Date;
      }>
    >(
      Prisma.sql`
        SELECT
          ss.id,
          ss.schedule_id,
          ss.employee_id,
          e.first_name AS employee_first_name,
          e.last_name AS employee_last_name,
          e.email AS employee_email,
          e.role AS employee_role,
          ss.location_id,
          l.name AS location_name,
          ss.shift_start,
          ss.shift_end,
          ss.role_during_shift,
          ss.notes,
          ss.created_at,
          ss.updated_at
        FROM tenant_staff.schedule_shifts ss
        JOIN tenant_staff.employees e
          ON e.tenant_id = ss.tenant_id
         AND e.id = ss.employee_id
        JOIN tenant.locations l
          ON l.tenant_id = ss.tenant_id
         AND l.id = ss.location_id
        WHERE ss.tenant_id = ${tenantId}
          AND ss.deleted_at IS NULL
          ${startDate ? Prisma.sql`AND ss.shift_start >= ${new Date(startDate)}` : Prisma.empty}
          ${endDate ? Prisma.sql`AND ss.shift_end <= ${new Date(endDate)}` : Prisma.empty}
          ${employeeId ? Prisma.sql`AND ss.employee_id = ${employeeId}` : Prisma.empty}
          ${locationId ? Prisma.sql`AND ss.location_id = ${locationId}` : Prisma.empty}
          ${role ? Prisma.sql`AND ss.role_during_shift = ${role}` : Prisma.empty}
        ORDER BY ss.shift_start ASC
        LIMIT ${limit}
        OFFSET ${offset}
      `
    ),
    database.$queryRaw<[{ count: bigint }]>(
      Prisma.sql`
        SELECT COUNT(*)::bigint
        FROM tenant_staff.schedule_shifts ss
        WHERE ss.tenant_id = ${tenantId}
          AND ss.deleted_at IS NULL
          ${startDate ? Prisma.sql`AND ss.shift_start >= ${new Date(startDate)}` : Prisma.empty}
          ${endDate ? Prisma.sql`AND ss.shift_end <= ${new Date(endDate)}` : Prisma.empty}
          ${employeeId ? Prisma.sql`AND ss.employee_id = ${employeeId}` : Prisma.empty}
          ${locationId ? Prisma.sql`AND ss.location_id = ${locationId}` : Prisma.empty}
          ${role ? Prisma.sql`AND ss.role_during_shift = ${role}` : Prisma.empty}
      `
    ),
  ]);

  return NextResponse.json({
    shifts,
    pagination: {
      page,
      limit,
      total: Number(totalCount[0].count),
      totalPages: Math.ceil(Number(totalCount[0].count) / limit),
    },
  });
}

/**
 * POST /api/staff/shifts
 * Create a new shift
 *
 * Required fields:
 * - scheduleId: Parent schedule ID
 * - employeeId: Assigned employee
 * - locationId: Shift location
 * - shiftStart: Shift start time (ISO 8601)
 * - shiftEnd: Shift end time (ISO 8601)
 *
 * Optional fields:
 * - roleDuringShift: Required role for this shift
 * - notes: Additional notes
 */
export async function POST(request: Request) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const body = await request.json();

  // Validate required fields
  if (
    !(
      body.scheduleId &&
      body.employeeId &&
      body.locationId &&
      body.shiftStart &&
      body.shiftEnd
    )
  ) {
    return NextResponse.json(
      {
        message:
          "Schedule ID, employee ID, location ID, start time, and end time are required",
      },
      { status: 400 }
    );
  }

  const shiftStart = new Date(body.shiftStart);
  const shiftEnd = new Date(body.shiftEnd);

  // Validate shift times
  const timeValidationError = validateShiftTimes(
    shiftStart,
    shiftEnd,
    body.allowHistorical
  );
  if (timeValidationError) {
    return timeValidationError;
  }

  // Verify employee exists and is active
  const { employee, error: employeeError } = await verifyEmployee(
    tenantId,
    body.employeeId
  );
  if (employeeError) {
    return employeeError;
  }
  if (!employee) {
    return NextResponse.json(
      { message: "Employee not found" },
      { status: 404 }
    );
  }

  // Validate employee has required role
  const roleValidationError = validateEmployeeRole(
    employee.role,
    body.roleDuringShift
  );
  if (roleValidationError) {
    return roleValidationError;
  }

  // Check for overlapping shifts
  const { overlaps } = await checkOverlappingShifts(
    tenantId,
    body.employeeId,
    shiftStart,
    shiftEnd
  );

  if (overlaps.length > 0 && !body.allowOverlap) {
    return NextResponse.json(
      {
        message: "Employee has overlapping shifts",
        overlappingShifts: overlaps,
      },
      { status: 409 }
    );
  }

  // Verify schedule exists
  const { error: scheduleError } = await verifySchedule(
    tenantId,
    body.scheduleId
  );
  if (scheduleError) {
    return scheduleError;
  }

  try {
    // Create the shift
    const shift = await database.scheduleShift.create({
      data: {
        tenantId,
        scheduleId: body.scheduleId,
        employeeId: body.employeeId,
        locationId: body.locationId,
        shift_start: shiftStart,
        shift_end: shiftEnd,
        role_during_shift: body.roleDuringShift || employee.role,
        notes: body.notes || null,
      },
    });

    return NextResponse.json({ shift }, { status: 201 });
  } catch (error) {
    console.error("Error creating shift:", error);
    return NextResponse.json(
      { message: "Failed to create shift" },
      { status: 500 }
    );
  }
}
