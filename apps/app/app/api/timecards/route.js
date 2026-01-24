Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const tenant_1 = require("@/app/lib/tenant");
function getStatusFilter(status) {
  if (status === "approved") {
    return "AND te.approved_at IS NOT NULL";
  }
  if (status === "pending") {
    return "AND te.approved_at IS NULL AND te.clock_out IS NOT NULL";
  }
  if (status === "open") {
    return "AND te.clock_out IS NULL";
  }
  return "";
}
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
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const employeeId = searchParams.get("employeeId");
  const status = searchParams.get("status");
  const locationId = searchParams.get("locationId");
  const page = Number.parseInt(searchParams.get("page") || "1", 10);
  const limit = Number.parseInt(searchParams.get("limit") || "50", 10);
  const offset = (page - 1) * limit;
  const statusFilter = getStatusFilter(status);
  const [timeEntries, totalCount] = await Promise.all([
    database_1.database.$queryRaw(database_1.Prisma.sql`
        WITH scheduled_shifts AS (
          SELECT
            ss.tenant_id,
            ss.id,
            ss.employee_id,
            ss.location_id,
            ss.shift_start,
            ss.shift_end
          FROM tenant_staff.schedule_shifts ss
          WHERE ss.tenant_id = ${tenantId}
            AND ss.deleted_at IS NULL
        )
        SELECT
          te.id,
          te.employee_id,
          e.first_name AS employee_first_name,
          e.last_name AS employee_last_name,
          e.email AS employee_email,
          e.role AS employee_role,
          te.location_id,
          l.name AS location_name,
          te.shift_id,
          ss.shift_start,
          ss.shift_end,
          te.clock_in,
          te.clock_out,
          te.break_minutes,
          te.notes,
          te.approved_by,
          te.approved_at,
          u.first_name AS approver_first_name,
          u.last_name AS approver_last_name,
          CASE
            WHEN ss.shift_start IS NOT NULL AND ss.shift_end IS NOT NULL THEN
              EXTRACT(EPOCH FROM (ss.shift_end - ss.shift_start)) / 3600
            ELSE NULL
          END AS scheduled_hours,
          CASE
            WHEN te.clock_out IS NOT NULL THEN
              EXTRACT(EPOCH FROM (te.clock_out - te.clock_in)) / 3600 - (te.break_minutes / 60.0)
            ELSE NULL
          END AS actual_hours,
          CASE
            WHEN te.clock_out IS NULL THEN 'missing_clock_out'
            WHEN ss.shift_start IS NOT NULL AND te.clock_in < ss.shift_start - INTERVAL '15 minutes' THEN 'early_clock_in'
            WHEN ss.shift_end IS NOT NULL AND te.clock_out > ss.shift_end + INTERVAL '15 minutes' THEN 'late_clock_out'
            WHEN ss.shift_start IS NOT NULL AND te.clock_in > ss.shift_start + INTERVAL '30 minutes' THEN 'late_arrival'
            WHEN te.break_minutes > 60 THEN 'excessive_break'
            ELSE NULL
          END AS exception_type
        FROM tenant_staff.time_entries te
        JOIN tenant_staff.employees e
          ON e.tenant_id = te.tenant_id
         AND e.id = te.employee_id
        LEFT JOIN tenant.locations l
          ON l.tenant_id = te.tenant_id
         AND l.id = te.location_id
        LEFT JOIN scheduled_shifts ss
          ON ss.tenant_id = te.tenant_id
         AND ss.id = te.shift_id
        LEFT JOIN tenant_staff.employees u
          ON u.tenant_id = te.tenant_id
         AND u.id = te.approved_by
        WHERE te.tenant_id = ${tenantId}
          AND te.deleted_at IS NULL
          ${startDate ? database_1.Prisma.sql`AND te.clock_in >= ${new Date(startDate)}` : database_1.Prisma.empty}
          ${endDate ? database_1.Prisma.sql`AND te.clock_in <= ${new Date(endDate)}` : database_1.Prisma.empty}
          ${employeeId ? database_1.Prisma.sql`AND te.employee_id = ${employeeId}` : database_1.Prisma.empty}
          ${locationId ? database_1.Prisma.sql`AND te.location_id = ${locationId}` : database_1.Prisma.empty}
          ${statusFilter ? database_1.Prisma.raw(statusFilter) : database_1.Prisma.empty}
        ORDER BY te.clock_in DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `),
    database_1.database.$queryRaw(database_1.Prisma.sql`
        SELECT COUNT(*)::bigint
        FROM tenant_staff.time_entries te
        WHERE te.tenant_id = ${tenantId}
          AND te.deleted_at IS NULL
          ${startDate ? database_1.Prisma.sql`AND te.clock_in >= ${new Date(startDate)}` : database_1.Prisma.empty}
          ${endDate ? database_1.Prisma.sql`AND te.clock_in <= ${new Date(endDate)}` : database_1.Prisma.empty}
          ${employeeId ? database_1.Prisma.sql`AND te.employee_id = ${employeeId}` : database_1.Prisma.empty}
          ${locationId ? database_1.Prisma.sql`AND te.location_id = ${locationId}` : database_1.Prisma.empty}
          ${statusFilter ? database_1.Prisma.raw(statusFilter) : database_1.Prisma.empty}
      `),
  ]);
  return server_2.NextResponse.json({
    timeEntries,
    pagination: {
      page,
      limit,
      total: Number(totalCount[0].count),
      totalPages: Math.ceil(Number(totalCount[0].count) / limit),
    },
  });
}
async function POST(request) {
  const { orgId, userId } = await (0, server_1.auth)();
  if (!(orgId && userId)) {
    return server_2.NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  const body = await request.json();
  if (!(body.employeeId && body.clockIn)) {
    return server_2.NextResponse.json(
      { message: "Employee ID and clock-in time are required" },
      { status: 400 }
    );
  }
  try {
    const timeEntry = await database_1.database.timeEntry.create({
      data: {
        tenantId,
        employeeId: body.employeeId,
        locationId: body.locationId || null,
        shift_id: body.shiftId || null,
        clockIn: new Date(body.clockIn),
        clockOut: body.clockOut ? new Date(body.clockOut) : null,
        breakMinutes: body.breakMinutes || 0,
        notes: body.notes || null,
      },
    });
    return server_2.NextResponse.json({ timeEntry }, { status: 201 });
  } catch (error) {
    console.error("Error creating time entry:", error);
    return server_2.NextResponse.json(
      { message: "Failed to create time entry" },
      { status: 500 }
    );
  }
}
