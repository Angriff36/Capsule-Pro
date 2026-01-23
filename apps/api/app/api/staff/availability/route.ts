import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import type {
  AvailabilityListResponse,
  CreateAvailabilityInput,
} from "./types";
import {
  checkOverlappingAvailability,
  validateDayOfWeek,
  validateEffectiveDates,
  validateTimeRange,
  verifyEmployee,
} from "./validation";

/**
 * GET /api/staff/availability
 * List employee availability with optional filtering
 *
 * Query params:
 * - employeeId: Filter by employee
 * - dayOfWeek: Filter by day of week (0-6)
 * - effectiveDate: Filter availability effective on this date (YYYY-MM-DD)
 * - isActive: Filter currently active availability (true) or all (false/omitted)
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

  const employeeId = searchParams.get("employeeId");
  const dayOfWeekParam = searchParams.get("dayOfWeek");
  const effectiveDateParam = searchParams.get("effectiveDate");
  const isActiveParam = searchParams.get("isActive");
  const page = Number.parseInt(searchParams.get("page") || "1", 10);
  const limit = Number.parseInt(searchParams.get("limit") || "50", 10);
  const offset = (page - 1) * limit;

  // Build query conditions
  const dayOfWeek = dayOfWeekParam ? Number.parseInt(dayOfWeekParam, 10) : null;
  const effectiveDate = effectiveDateParam
    ? new Date(effectiveDateParam)
    : null;
  const isActive = isActiveParam === "true";

  // Validate day of week if provided
  if (dayOfWeek !== null) {
    const dayError = validateDayOfWeek(dayOfWeek);
    if (dayError) return dayError;
  }

  const [availability, totalCount] = await Promise.all([
    database.$queryRaw<
      Array<{
        id: string;
        tenant_id: string;
        employee_id: string;
        employee_first_name: string | null;
        employee_last_name: string | null;
        employee_email: string;
        employee_role: string;
        day_of_week: number;
        start_time: string;
        end_time: string;
        is_available: boolean;
        effective_from: Date;
        effective_until: Date | null;
        created_at: Date;
        updated_at: Date;
      }>
    >(
      Prisma.sql`
        SELECT
          ea.id,
          ea.tenant_id,
          ea.employee_id,
          e.first_name AS employee_first_name,
          e.last_name AS employee_last_name,
          e.email AS employee_email,
          e.role AS employee_role,
          ea.day_of_week,
          ea.start_time::text as start_time,
          ea.end_time::text as end_time,
          ea.is_available,
          ea.effective_from,
          ea.effective_until,
          ea.created_at,
          ea.updated_at
        FROM tenant_staff.employee_availability ea
        JOIN tenant_staff.employees e
          ON e.tenant_id = ea.tenant_id
         AND e.id = ea.employee_id
        WHERE ea.tenant_id = ${tenantId}
          AND ea.deleted_at IS NULL
          ${employeeId ? Prisma.sql`AND ea.employee_id = ${employeeId}` : Prisma.empty}
          ${dayOfWeek !== null ? Prisma.sql`AND ea.day_of_week = ${dayOfWeek}` : Prisma.empty}
          ${
            effectiveDate
              ? Prisma.sql`
                  AND ea.effective_from <= ${effectiveDate}
                  AND (ea.effective_until IS NULL OR ea.effective_until >= ${effectiveDate})
                `
              : Prisma.empty
          }
          ${
            isActive
              ? Prisma.sql`
                  AND ea.effective_from <= CURRENT_DATE
                  AND (ea.effective_until IS NULL OR ea.effective_until >= CURRENT_DATE)
                `
              : Prisma.empty
          }
        ORDER BY ea.employee_id, ea.day_of_week, ea.start_time
        LIMIT ${limit}
        OFFSET ${offset}
      `
    ),
    database.$queryRaw<[{ count: bigint }]>(
      Prisma.sql`
        SELECT COUNT(*)::bigint
        FROM tenant_staff.employee_availability ea
        WHERE ea.tenant_id = ${tenantId}
          AND ea.deleted_at IS NULL
          ${employeeId ? Prisma.sql`AND ea.employee_id = ${employeeId}` : Prisma.empty}
          ${dayOfWeek !== null ? Prisma.sql`AND ea.day_of_week = ${dayOfWeek}` : Prisma.empty}
          ${
            effectiveDate
              ? Prisma.sql`
                  AND ea.effective_from <= ${effectiveDate}
                  AND (ea.effective_until IS NULL OR ea.effective_until >= ${effectiveDate})
                `
              : Prisma.empty
          }
          ${
            isActive
              ? Prisma.sql`
                  AND ea.effective_from <= CURRENT_DATE
                  AND (ea.effective_until IS NULL OR ea.effective_until >= CURRENT_DATE)
                `
              : Prisma.empty
          }
      `
    ),
  ]);

  const response: AvailabilityListResponse = {
    availability,
    pagination: {
      page,
      limit,
      total: Number(totalCount[0].count),
      totalPages: Math.ceil(Number(totalCount[0].count) / limit),
    },
  };

  return NextResponse.json(response);
}

/**
 * POST /api/staff/availability
 * Create a new availability record for an employee
 *
 * Required fields:
 * - employeeId: Employee to set availability for
 * - dayOfWeek: Day of week (0-6, where 0=Sunday)
 * - startTime: Start time in HH:MM format (24-hour)
 * - endTime: End time in HH:MM format (24-hour)
 *
 * Optional fields:
 * - isAvailable: Whether employee is available (defaults to true)
 * - effectiveFrom: Date when availability starts (YYYY-MM-DD, defaults to today)
 * - effectiveUntil: Date when availability ends (YYYY-MM-DD or null for ongoing)
 */
export async function POST(request: Request) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const body = (await request.json()) as CreateAvailabilityInput;

  // Validate required fields
  if (
    !(
      body.employeeId &&
      body.dayOfWeek !== undefined &&
      body.startTime &&
      body.endTime
    )
  ) {
    return NextResponse.json(
      {
        message:
          "Employee ID, day of week, start time, and end time are required",
      },
      { status: 400 }
    );
  }

  // Validate day of week
  const dayError = validateDayOfWeek(body.dayOfWeek);
  if (dayError) return dayError;

  // Validate time range
  const timeError = validateTimeRange(body.startTime, body.endTime);
  if (timeError) return timeError;

  // Set defaults
  const effectiveFrom = body.effectiveFrom
    ? new Date(body.effectiveFrom)
    : new Date(); // Default to today
  effectiveFrom.setHours(0, 0, 0, 0);

  const effectiveUntil = body.effectiveUntil
    ? new Date(body.effectiveUntil)
    : null;
  if (effectiveUntil) {
    effectiveUntil.setHours(0, 0, 0, 0);
  }

  // Validate effective dates
  const dateError = validateEffectiveDates(effectiveFrom, effectiveUntil);
  if (dateError) return dateError;

  // Verify employee exists and is active
  const { employee, error: employeeError } = await verifyEmployee(
    tenantId,
    body.employeeId
  );
  if (employeeError) {
    return employeeError;
  }

  // Check for overlapping availability
  const { hasOverlap, overlappingAvailability } =
    await checkOverlappingAvailability(
      tenantId,
      body.employeeId,
      body.dayOfWeek,
      body.startTime,
      body.endTime,
      effectiveFrom,
      effectiveUntil
    );

  if (hasOverlap) {
    return NextResponse.json(
      {
        message: "Employee has overlapping availability for this day and time",
        overlappingAvailability,
      },
      { status: 409 }
    );
  }

  try {
    // Parse time strings to Time objects
    const [startHour, startMinute] = body.startTime.split(":").map(Number);
    const [endHour, endMinute] = body.endTime.split(":").map(Number);

    const startTime = new Date();
    startTime.setHours(startHour, startMinute, 0, 0);

    const endTime = new Date();
    endTime.setHours(endHour, endMinute, 0, 0);

    // Create the availability record
    const result = await database.$queryRaw<
      Array<{
        id: string;
        employee_id: string;
        day_of_week: number;
        start_time: Date;
        end_time: Date;
        effective_from: Date;
      }>
    >(
      Prisma.sql`
        INSERT INTO tenant_staff.employee_availability (
          tenant_id,
          employee_id,
          day_of_week,
          start_time,
          end_time,
          is_available,
          effective_from,
          effective_until
        )
        VALUES (
          ${tenantId},
          ${body.employeeId},
          ${body.dayOfWeek},
          ${startTime}::time,
          ${endTime}::time,
          ${body.isAvailable ?? true},
          ${effectiveFrom}::date,
          ${effectiveUntil}::date
        )
        RETURNING id, employee_id, day_of_week, start_time, end_time, effective_from
      `
    );

    return NextResponse.json({ availability: result[0] }, { status: 201 });
  } catch (error) {
    console.error("Error creating availability:", error);
    return NextResponse.json(
      { message: "Failed to create availability" },
      { status: 500 }
    );
  }
}