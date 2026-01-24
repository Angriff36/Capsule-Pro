Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const tenant_1 = require("@/app/lib/tenant");
const validation_1 = require("./validation");
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
async function GET(request) {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    return server_2.NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
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
    const dayError = (0, validation_1.validateDayOfWeek)(dayOfWeek);
    if (dayError) return dayError;
  }
  const [availability, totalCount] = await Promise.all([
    database_1.database.$queryRaw(database_1.Prisma.sql`
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
          ${employeeId ? database_1.Prisma.sql`AND ea.employee_id = ${employeeId}` : database_1.Prisma.empty}
          ${dayOfWeek !== null ? database_1.Prisma.sql`AND ea.day_of_week = ${dayOfWeek}` : database_1.Prisma.empty}
          ${
            effectiveDate
              ? database_1.Prisma.sql`
                  AND ea.effective_from <= ${effectiveDate}
                  AND (ea.effective_until IS NULL OR ea.effective_until >= ${effectiveDate})
                `
              : database_1.Prisma.empty
          }
          ${
            isActive
              ? database_1.Prisma.sql`
                  AND ea.effective_from <= CURRENT_DATE
                  AND (ea.effective_until IS NULL OR ea.effective_until >= CURRENT_DATE)
                `
              : database_1.Prisma.empty
          }
        ORDER BY ea.employee_id, ea.day_of_week, ea.start_time
        LIMIT ${limit}
        OFFSET ${offset}
      `),
    database_1.database.$queryRaw(database_1.Prisma.sql`
        SELECT COUNT(*)::bigint
        FROM tenant_staff.employee_availability ea
        WHERE ea.tenant_id = ${tenantId}
          AND ea.deleted_at IS NULL
          ${employeeId ? database_1.Prisma.sql`AND ea.employee_id = ${employeeId}` : database_1.Prisma.empty}
          ${dayOfWeek !== null ? database_1.Prisma.sql`AND ea.day_of_week = ${dayOfWeek}` : database_1.Prisma.empty}
          ${
            effectiveDate
              ? database_1.Prisma.sql`
                  AND ea.effective_from <= ${effectiveDate}
                  AND (ea.effective_until IS NULL OR ea.effective_until >= ${effectiveDate})
                `
              : database_1.Prisma.empty
          }
          ${
            isActive
              ? database_1.Prisma.sql`
                  AND ea.effective_from <= CURRENT_DATE
                  AND (ea.effective_until IS NULL OR ea.effective_until >= CURRENT_DATE)
                `
              : database_1.Prisma.empty
          }
      `),
  ]);
  const response = {
    availability,
    pagination: {
      page,
      limit,
      total: Number(totalCount[0].count),
      totalPages: Math.ceil(Number(totalCount[0].count) / limit),
    },
  };
  return server_2.NextResponse.json(response);
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
async function POST(request) {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    return server_2.NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  const body = await request.json();
  // Validate required fields
  if (
    !(
      body.employeeId &&
      body.dayOfWeek !== undefined &&
      body.startTime &&
      body.endTime
    )
  ) {
    return server_2.NextResponse.json(
      {
        message:
          "Employee ID, day of week, start time, and end time are required",
      },
      { status: 400 }
    );
  }
  // Validate day of week
  const dayError = (0, validation_1.validateDayOfWeek)(body.dayOfWeek);
  if (dayError) return dayError;
  // Validate time range
  const timeError = (0, validation_1.validateTimeRange)(
    body.startTime,
    body.endTime
  );
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
  const dateError = (0, validation_1.validateEffectiveDates)(
    effectiveFrom,
    effectiveUntil
  );
  if (dateError) return dateError;
  // Verify employee exists and is active
  const { employee, error: employeeError } = await (0,
  validation_1.verifyEmployee)(tenantId, body.employeeId);
  if (employeeError) {
    return employeeError;
  }
  // Check for overlapping availability
  const { hasOverlap, overlappingAvailability } = await (0,
  validation_1.checkOverlappingAvailability)(
    tenantId,
    body.employeeId,
    body.dayOfWeek,
    body.startTime,
    body.endTime,
    effectiveFrom,
    effectiveUntil
  );
  if (hasOverlap) {
    return server_2.NextResponse.json(
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
    const result = await database_1.database.$queryRaw(database_1.Prisma.sql`
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
      `);
    return server_2.NextResponse.json(
      { availability: result[0] },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating availability:", error);
    return server_2.NextResponse.json(
      { message: "Failed to create availability" },
      { status: 500 }
    );
  }
}
