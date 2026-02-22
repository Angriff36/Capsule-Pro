import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { executeManifestCommand } from "@/lib/manifest-command-handler";

function getStatusFilter(status: string | null): string {
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
  const status = searchParams.get("status");
  const locationId = searchParams.get("locationId");
  const page = Number.parseInt(searchParams.get("page") || "1", 10);
  const limit = Number.parseInt(searchParams.get("limit") || "50", 10);
  const offset = (page - 1) * limit;

  const statusFilter = getStatusFilter(status);

  const [timeEntries, totalCount] = await Promise.all([
    database.$queryRaw<
      Array<{
        id: string;
        employee_id: string;
        employee_first_name: string | null;
        employee_last_name: string | null;
        employee_email: string;
        employee_role: string;
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
        scheduled_hours: number | null;
        actual_hours: number | null;
        exception_type: string | null;
      }>
    >(
      Prisma.sql`
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
          ${startDate ? Prisma.sql`AND te.clock_in >= ${new Date(startDate)}` : Prisma.empty}
          ${endDate ? Prisma.sql`AND te.clock_in <= ${new Date(endDate)}` : Prisma.empty}
          ${employeeId ? Prisma.sql`AND te.employee_id = ${employeeId}` : Prisma.empty}
          ${locationId ? Prisma.sql`AND te.location_id = ${locationId}` : Prisma.empty}
          ${statusFilter ? Prisma.raw(statusFilter) : Prisma.empty}
        ORDER BY te.clock_in DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `
    ),
    database.$queryRaw<[{ count: bigint }]>(
      Prisma.sql`
        SELECT COUNT(*)::bigint
        FROM tenant_staff.time_entries te
        WHERE te.tenant_id = ${tenantId}
          AND te.deleted_at IS NULL
          ${startDate ? Prisma.sql`AND te.clock_in >= ${new Date(startDate)}` : Prisma.empty}
          ${endDate ? Prisma.sql`AND te.clock_in <= ${new Date(endDate)}` : Prisma.empty}
          ${employeeId ? Prisma.sql`AND te.employee_id = ${employeeId}` : Prisma.empty}
          ${locationId ? Prisma.sql`AND te.location_id = ${locationId}` : Prisma.empty}
          ${statusFilter ? Prisma.raw(statusFilter) : Prisma.empty}
      `
    ),
  ]);

  return NextResponse.json({
    timeEntries,
    pagination: {
      page,
      limit,
      total: Number(totalCount[0].count),
      totalPages: Math.ceil(Number(totalCount[0].count) / limit),
    },
  });
}

export function POST(request: NextRequest) {
  console.log("[TimeEntry/POST] Delegating to manifest clockIn command");
  return executeManifestCommand(request, {
    entityName: "TimeEntry",
    commandName: "clockIn",
  });
}
