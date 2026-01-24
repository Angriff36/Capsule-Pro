Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.PUT = PUT;
exports.DELETE = DELETE;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const tenant_1 = require("@/app/lib/tenant");
async function GET(_request, { params }) {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    return server_2.NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  const { id } = await params;
  const timeEntry = await database_1.database.$queryRaw`
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
      e.employee_number,
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
      te.created_at,
      te.updated_at,
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
      END AS exception_type,
      e.hourly_rate,
      CASE
        WHEN te.clock_out IS NOT NULL AND e.hourly_rate IS NOT NULL THEN
          (EXTRACT(EPOCH FROM (te.clock_out - te.clock_in)) / 3600 - (te.break_minutes / 60.0)) * e.hourly_rate
        ELSE NULL
      END AS total_cost
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
      AND te.id = ${id}
      AND te.deleted_at IS NULL
  `;
  if (!timeEntry || timeEntry.length === 0) {
    return server_2.NextResponse.json(
      { message: "Time entry not found" },
      { status: 404 }
    );
  }
  return server_2.NextResponse.json({ timeEntry: timeEntry[0] });
}
async function PUT(request, { params }) {
  const { orgId, userId } = await (0, server_1.auth)();
  if (!(orgId && userId)) {
    return server_2.NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  const { id } = await params;
  const body = await request.json();
  try {
    const existingEntry = await database_1.database.timeEntry.findFirst({
      where: {
        tenantId,
        id,
        deleted_at: null,
      },
    });
    if (!existingEntry) {
      return server_2.NextResponse.json(
        { message: "Time entry not found" },
        { status: 404 }
      );
    }
    const updatedEntry = await database_1.database.timeEntry.update({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
      data: {
        clockOut: body.clockOut ? new Date(body.clockOut) : undefined,
        breakMinutes: body.breakMinutes ?? undefined,
        notes: body.notes ?? undefined,
        locationId: body.locationId ?? undefined,
      },
    });
    return server_2.NextResponse.json({ timeEntry: updatedEntry });
  } catch (error) {
    console.error("Error updating time entry:", error);
    return server_2.NextResponse.json(
      { message: "Failed to update time entry" },
      { status: 500 }
    );
  }
}
async function DELETE(_request, { params }) {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    return server_2.NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  const { id } = await params;
  try {
    const existingEntry = await database_1.database.timeEntry.findFirst({
      where: {
        tenantId,
        id,
        deleted_at: null,
      },
    });
    if (!existingEntry) {
      return server_2.NextResponse.json(
        { message: "Time entry not found" },
        { status: 404 }
      );
    }
    await database_1.database.timeEntry.update({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
      data: {
        deleted_at: new Date(),
      },
    });
    return server_2.NextResponse.json({ message: "Time entry deleted" });
  } catch (error) {
    console.error("Error deleting time entry:", error);
    return server_2.NextResponse.json(
      { message: "Failed to delete time entry" },
      { status: 500 }
    );
  }
}
