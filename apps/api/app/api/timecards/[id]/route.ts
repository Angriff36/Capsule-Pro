import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { id } = await params;

  const timeEntry = await database.$queryRaw<
    Array<{
      id: string;
      employee_id: string;
      employee_first_name: string | null;
      employee_last_name: string | null;
      employee_email: string;
      employee_role: string;
      employee_number: string | null;
      location_id: string | null;
      location_name: string | null;
      shift_id: string | null;
      shift_start: Date | null;
      shift_end: Date | null;
      clock_in: Date;
      clock_out: Date | null;
      break_minutes: number;
      notes: string | null;
      approved_by: string | null;
      approved_at: Date | null;
      approver_first_name: string | null;
      approver_last_name: string | null;
      created_at: Date;
      updated_at: Date;
      scheduled_hours: number | null;
      actual_hours: number | null;
      exception_type: string | null;
      hourly_rate: number | null;
      total_cost: number | null;
    }>
  >`
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
    return NextResponse.json(
      { message: "Time entry not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ timeEntry: timeEntry[0] });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { orgId, userId } = await auth();
  if (!(orgId && userId)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { id } = await params;
  const body = await request.json();

  try {
    const existingEntry = await database.timeEntry.findFirst({
      where: {
        tenantId,
        id,
        deleted_at: null,
      },
    });

    if (!existingEntry) {
      return NextResponse.json(
        { message: "Time entry not found" },
        { status: 404 }
      );
    }

    const updatedEntry = await database.timeEntry.update({
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

    return NextResponse.json({ timeEntry: updatedEntry });
  } catch (error) {
    console.error("Error updating time entry:", error);
    return NextResponse.json(
      { message: "Failed to update time entry" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { id } = await params;

  try {
    const existingEntry = await database.timeEntry.findFirst({
      where: {
        tenantId,
        id,
        deleted_at: null,
      },
    });

    if (!existingEntry) {
      return NextResponse.json(
        { message: "Time entry not found" },
        { status: 404 }
      );
    }

    await database.timeEntry.update({
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

    return NextResponse.json({ message: "Time entry deleted" });
  } catch (error) {
    console.error("Error deleting time entry:", error);
    return NextResponse.json(
      { message: "Failed to delete time entry" },
      { status: 500 }
    );
  }
}
