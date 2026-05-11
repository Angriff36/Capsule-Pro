import { auth } from "@repo/auth/server";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import { log } from "@repo/observability/log";
import { manifestErrorResponse, manifestSuccessResponse } from "@/lib/manifest-response";
import { captureException } from "@sentry/nextjs";

function getPeriodRange(period: string) {
  const now = new Date();
  const start = new Date();
  const end = new Date();

  switch (period) {
    case "today":
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case "week": {
      const dayOfWeek = now.getDay();
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday start
      start.setDate(now.getDate() - diff);
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;
    }
    case "2weeks": {
      const dayOfWeek = now.getDay();
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      start.setDate(now.getDate() - diff - 7);
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 13);
      end.setHours(23, 59, 59, 999);
      break;
    }
    case "month":
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(now.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      break;
    default:
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
  }

  return { start, end };
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export async function GET(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) return manifestErrorResponse("Unauthorized", 401);

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) return manifestErrorResponse("Tenant not found", 400);

    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get("period") || "week";
    const locationId = searchParams.get("locationId");

    const { start, end } = getPeriodRange(period);

    const locIdx = locationId ? 4 : 0;
    const locParam = locationId ? `AND ss.location_id = $${locIdx}::uuid` : "";

    const dailyRows = await database.$queryRawUnsafe(`
      SELECT
        DATE(ss.shift_start) AS date,
        COUNT(*) AS total_shifts,
        COUNT(CASE WHEN ss.employee_id IS NOT NULL THEN 1 END) AS filled_shifts,
        COUNT(CASE WHEN ss.employee_id IS NULL THEN 1 END) AS unfilled_shifts,
        COUNT(DISTINCT ss.employee_id) AS unique_employees,
        COALESCE(SUM(EXTRACT(EPOCH FROM (ss.shift_end - ss.shift_start)) / 3600), 0) AS total_hours
      FROM tenant_staff.schedule_shifts ss
      WHERE ss.tenant_id = $1::uuid
        AND ss.deleted_at IS NULL
        AND ss.shift_start >= $2::timestamptz
        AND ss.shift_end <= $3::timestamptz
        ${locParam}
      GROUP BY DATE(ss.shift_start)
      ORDER BY date ASC
    `, tenantId, start, end, ...(locationId ? [locationId] : []));

    const locationRows = await database.$queryRawUnsafe(`
      SELECT
        l.id AS location_id,
        l.name AS location_name,
        COUNT(*) AS total_shifts,
        COUNT(CASE WHEN ss.employee_id IS NOT NULL THEN 1 END) AS filled_shifts,
        COUNT(CASE WHEN ss.employee_id IS NULL THEN 1 END) AS unfilled_shifts
      FROM tenant_staff.schedule_shifts ss
      JOIN tenant.locations l ON l.tenant_id = ss.tenant_id AND l.id = ss.location_id
      WHERE ss.tenant_id = $1::uuid
        AND ss.deleted_at IS NULL
        AND ss.shift_start >= $2::timestamptz
        AND ss.shift_end <= $3::timestamptz
        ${locParam}
      GROUP BY l.id, l.name
      ORDER BY l.name ASC
    `, tenantId, start, end, ...(locationId ? [locationId] : []));

    // Get today-specific data for overview
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayRows = await database.$queryRawUnsafe(`
      SELECT
        COUNT(*) AS total_shifts,
        COUNT(CASE WHEN ss.employee_id IS NOT NULL THEN 1 END) AS filled_shifts,
        COUNT(CASE WHEN ss.employee_id IS NULL THEN 1 END) AS unfilled_shifts,
        COUNT(DISTINCT ss.employee_id) AS active_employees,
        COALESCE(SUM(EXTRACT(EPOCH FROM (ss.shift_end - ss.shift_start)) / 3600), 0) AS total_hours
      FROM tenant_staff.schedule_shifts ss
      WHERE ss.tenant_id = $1::uuid
        AND ss.deleted_at IS NULL
        AND ss.shift_start >= $2::timestamptz
        AND ss.shift_end <= $3::timestamptz
        ${locParam}
    `, tenantId, todayStart, todayEnd, ...(locationId ? [locationId] : []));

    // Today by location
    const todayLocations = await database.$queryRawUnsafe(`
      SELECT
        l.id AS location_id,
        l.name AS location_name,
        COUNT(*) AS total_shifts,
        COUNT(CASE WHEN ss.employee_id IS NOT NULL THEN 1 END) AS filled_shifts,
        COUNT(CASE WHEN ss.employee_id IS NULL THEN 1 END) AS unfilled_shifts
      FROM tenant_staff.schedule_shifts ss
      JOIN tenant.locations l ON l.tenant_id = ss.tenant_id AND l.id = ss.location_id
      WHERE ss.tenant_id = $1::uuid
        AND ss.deleted_at IS NULL
        AND ss.shift_start >= $2::timestamptz
        AND ss.shift_end <= $3::timestamptz
        ${locParam}
      GROUP BY l.id, l.name
      ORDER BY l.name ASC
    `, tenantId, todayStart, todayEnd, ...(locationId ? [locationId] : []));

    // Get weekly summaries for overview trend
    const weeklyRows = await database.$queryRawUnsafe(`
      SELECT
        DATE_TRUNC('week', ss.shift_start)::date AS week_start,
        (DATE_TRUNC('week', ss.shift_start)::date + 6)::date AS week_end,
        COUNT(*) AS total_shifts,
        COUNT(CASE WHEN ss.employee_id IS NOT NULL THEN 1 END) AS filled_shifts,
        COUNT(CASE WHEN ss.employee_id IS NULL THEN 1 END) AS unfilled_shifts,
        COUNT(DISTINCT ss.employee_id) AS unique_employees,
        COALESCE(SUM(EXTRACT(EPOCH FROM (ss.shift_end - ss.shift_start)) / 3600), 0) AS total_hours
      FROM tenant_staff.schedule_shifts ss
      WHERE ss.tenant_id = $1::uuid
        AND ss.deleted_at IS NULL
        AND ss.shift_start >= $2::timestamptz
        ${locParam}
      GROUP BY DATE_TRUNC('week', ss.shift_start)
      ORDER BY week_start DESC
      LIMIT 8
    `, tenantId, new Date(Date.now() - 56 * 24 * 60 * 60 * 1000), ...(locationId ? [locationId] : []));

    // Build daily array
    const daily = (dailyRows as any[]).map((row: any) => ({
      date: row.date,
      day_name: DAY_NAMES[new Date(row.date).getDay()],
      total_shifts: Number(row.total_shifts),
      filled_shifts: Number(row.filled_shifts),
      unfilled_shifts: Number(row.unfilled_shifts),
      unique_employees: Number(row.unique_employees),
      total_hours: Number(row.total_hours),
      locations: [],
    }));

    // Build location totals
    const location_totals = (locationRows as any[]).map((row: any) => ({
      location_id: row.location_id,
      location_name: row.location_name,
      total_shifts: Number(row.total_shifts),
      filled_shifts: Number(row.filled_shifts),
      unfilled_shifts: Number(row.unfilled_shifts),
      coverage_pct:
        Number(row.total_shifts) > 0
          ? Math.round((Number(row.filled_shifts) / Number(row.total_shifts)) * 100)
          : 100,
    }));

    // Summary
    const totalShifts = location_totals.reduce((s, l) => s + l.total_shifts, 0);
    const totalFilled = location_totals.reduce((s, l) => s + l.filled_shifts, 0);
    const totalUnfilled = location_totals.reduce((s, l) => s + l.unfilled_shifts, 0);
    const totalHours = daily.reduce((s, d) => s + d.total_hours, 0);
    const totalEmployees = new Set(
      (dailyRows as any[]).flatMap((r: any) => r.unique_employees || [])
    ).size || Math.max(...daily.map((d) => d.unique_employees), 0);

    const summary = {
      total_shifts: totalShifts,
      total_hours: Math.round(totalHours * 10) / 10,
      total_employees: totalEmployees,
      avg_coverage_pct:
        totalShifts > 0
          ? Math.round((totalFilled / totalShifts) * 100)
          : 100,
      unfilled_shifts: totalUnfilled,
    };

    // Today stats
    const todayData = (todayRows as any[])[0];
    const today = todayData
      ? {
          total_shifts: Number(todayData.total_shifts),
          filled_shifts: Number(todayData.filled_shifts),
          unfilled_shifts: Number(todayData.unfilled_shifts),
          active_employees: Number(todayData.active_employees),
          total_hours: Number(todayData.total_hours),
          locations: (todayLocations as any[]).map((loc: any) => ({
            location_id: loc.location_id,
            location_name: loc.location_name,
            total_shifts: Number(loc.total_shifts),
            filled_shifts: Number(loc.filled_shifts),
            unfilled_shifts: Number(loc.unfilled_shifts),
            coverage_pct:
              Number(loc.total_shifts) > 0
                ? Math.round(
                    (Number(loc.filled_shifts) / Number(loc.total_shifts)) * 100
                  )
                : 100,
          })),
        }
      : null;

    // Weekly summaries
    const weekly = (weeklyRows as any[])
      .reverse()
      .map((row: any) => ({
        week_start: row.week_start,
        week_end: row.week_end,
        total_shifts: Number(row.total_shifts),
        total_hours: Number(row.total_hours),
        unique_employees: Number(row.unique_employees),
        unfilled: Number(row.unfilled_shifts),
      }));

    const periodLabel =
      period === "today"
        ? "Today"
        : period === "week"
        ? "This Week"
        : period === "2weeks"
        ? "Past 2 Weeks"
        : "This Month";

    return manifestSuccessResponse({
      period: { start: start.toISOString(), end: end.toISOString(), label: periodLabel },
      summary,
      daily,
      location_totals,
      today,
      weekly,
    });
  } catch (error) {
    captureException(error);
    log.error("Error fetching staffing coverage:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
