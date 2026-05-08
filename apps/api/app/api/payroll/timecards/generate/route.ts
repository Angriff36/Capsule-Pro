import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

/**
 * POST /api/payroll/timecards/generate
 * Auto-generate time entries from approved/published schedules.
 *
 * Body:
 * {
 *   periodStart: string (ISO date),
 *   periodEnd: string (ISO date),
 *   locationId?: string,
 *   dryRun?: boolean (default false — preview without creating)
 * }
 *
 * Finds published schedules in the date range, and for each schedule_shift
 * that doesn't already have a matching time_entry, creates one.
 *
 * Returns:
 * {
 *   created: number,
 *   skipped: number,       // already had time entries
 *   totalShifts: number,
 *   totalScheduledHours: number,
 *   overtimeShifts: { shiftId, employeeId, employeeName, scheduledHours, weeklyHours }[],
 *   entries: TimeEntry[]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const body = await request.json();

    const { periodStart, periodEnd, locationId, dryRun = false } = body;

    if (!(periodStart && periodEnd)) {
      return NextResponse.json(
        { error: "periodStart and periodEnd are required" },
        { status: 400 }
      );
    }

    const startDate = new Date(periodStart);
    const endDate = new Date(periodEnd);

    if (startDate >= endDate) {
      return NextResponse.json(
        { error: "periodStart must be before periodEnd" },
        { status: 400 }
      );
    }

    // Find published schedules in the date range
    const schedules = await database.$queryRaw<
      Array<{
        id: string;
        schedule_date: Date;
        status: string;
        location_id: string | null;
      }>
    >(
      Prisma.sql`
        SELECT id, schedule_date, status, location_id
        FROM tenant_staff.schedules
        WHERE tenant_id = ${tenantId}
          AND schedule_date >= ${startDate}
          AND schedule_date <= ${endDate}
          AND status = 'published'
          AND deleted_at IS NULL
      `
    );

    if (schedules.length === 0) {
      return NextResponse.json({
        created: 0,
        skipped: 0,
        totalShifts: 0,
        totalScheduledHours: 0,
        overtimeShifts: [],
        entries: [],
        message: "No published schedules found in the specified period",
      });
    }

    const scheduleIds = schedules.map((s) => s.id);

    // Get all shifts for these schedules, joined with existing time entries
    const shifts = await database.$queryRaw<
      Array<{
        shift_id: string;
        schedule_id: string;
        employee_id: string;
        location_id: string;
        shift_start: Date;
        shift_end: Date;
        role_during_shift: string | null;
        employee_first_name: string | null;
        employee_last_name: string | null;
        employee_email: string;
        scheduled_hours: number;
        weekly_hours: number;
        has_time_entry: boolean;
        existing_entry_id: string | null;
      }>
    >(
      Prisma.sql`
        WITH target_schedules AS (
          SELECT unnest(${scheduleIds}::uuid[]) AS schedule_id
        ),
        weekly_hours AS (
          SELECT
            te.employee_id,
            DATE_TRUNC('week', te.clock_in) AS week_start,
            SUM(
              EXTRACT(EPOCH FROM (te.clock_out - te.clock_in)) / 3600
              - (te.break_minutes / 60.0)
            ) AS total_hours
          FROM tenant_staff.time_entries te
          WHERE te.tenant_id = ${tenantId}
            AND te.deleted_at IS NULL
            AND te.clock_out IS NOT NULL
            AND te.clock_in >= ${startDate}
            AND te.clock_in <= ${endDate}
          GROUP BY te.employee_id, DATE_TRUNC('week', te.clock_in)
        ),
        shift_weekly AS (
          SELECT
            ss.employee_id,
            ss.location_id,
            DATE_TRUNC('week', ss.shift_start) AS week_start,
            SUM(EXTRACT(EPOCH FROM (ss.shift_end - ss.shift_start)) / 3600) AS weekly_hours
          FROM tenant_staff.schedule_shifts ss
          JOIN target_schedules ts ON ts.schedule_id = ss.schedule_id
          WHERE ss.tenant_id = ${tenantId}
            AND ss.deleted_at IS NULL
          GROUP BY ss.employee_id, ss.location_id, DATE_TRUNC('week', ss.shift_start)
        )
        SELECT
          ss.id AS shift_id,
          ss.schedule_id,
          ss.employee_id,
          ss.location_id,
          ss.shift_start,
          ss.shift_end,
          ss.role_during_shift,
          e.first_name AS employee_first_name,
          e.last_name AS employee_last_name,
          e.email AS employee_email,
          EXTRACT(EPOCH FROM (ss.shift_end - ss.shift_start)) / 3600 AS scheduled_hours,
          COALESCE(sw.weekly_hours, 0) AS weekly_hours,
          EXISTS (
            SELECT 1 FROM tenant_staff.time_entries te2
            WHERE te2.tenant_id = ${tenantId}
              AND te2.shift_id = ss.id
              AND te2.deleted_at IS NULL
          ) AS has_time_entry,
          (
            SELECT te3.id FROM tenant_staff.time_entries te3
            WHERE te3.tenant_id = ${tenantId}
              AND te3.shift_id = ss.id
              AND te3.deleted_at IS NULL
            LIMIT 1
          ) AS existing_entry_id
        FROM tenant_staff.schedule_shifts ss
        JOIN target_schedules ts ON ts.schedule_id = ss.schedule_id
        JOIN tenant_staff.employees e
          ON e.tenant_id = ss.tenant_id
         AND e.id = ss.employee_id
        LEFT JOIN shift_weekly sw
          ON sw.employee_id = ss.employee_id
         AND sw.location_id = ss.location_id
         AND sw.week_start = DATE_TRUNC('week', ss.shift_start)
        WHERE ss.tenant_id = ${tenantId}
          AND ss.deleted_at IS NULL
          ${locationId ? Prisma.sql`AND ss.location_id = ${locationId}` : Prisma.empty}
        ORDER BY ss.shift_start
      `
    );

    const OVERTIME_WEEKLY_THRESHOLD = 40;
    const OVERTIME_DAILY_THRESHOLD = 8;

    // Identify overtime shifts
    const overtimeShifts = shifts.filter(
      (s) =>
        s.weekly_hours > OVERTIME_WEEKLY_THRESHOLD ||
        s.scheduled_hours > OVERTIME_DAILY_THRESHOLD
    );

    // Separate shifts that need entries vs already have them
    const needsEntry = shifts.filter((s) => !s.has_time_entry);
    const alreadyExists = shifts.filter((s) => s.has_time_entry);

    const createdEntries: Array<{
      id: string;
      shift_id: string;
      employee_id: string;
      clock_in: Date;
    }> = [];

    if (!dryRun && needsEntry.length > 0) {
      // Create time entries for shifts that don't have them
      for (const shift of needsEntry) {
        try {
          const result = await database.$queryRaw<
            Array<{
              id: string;
              shift_id: string;
              employee_id: string;
              clock_in: Date;
            }>
          >(
            Prisma.sql`
              INSERT INTO tenant_staff.time_entries (tenant_id, employee_id, location_id, shift_id, clock_in, clock_out, break_minutes, notes)
              VALUES (
                ${tenantId},
                ${shift.employee_id},
                ${shift.location_id},
                ${shift.shift_id},
                ${shift.shift_start},
                ${shift.shift_end},
                0,
                ${"Auto-generated from schedule"}
              )
              RETURNING id, shift_id, employee_id, clock_in
            `
          );
          if (result.length > 0) {
            createdEntries.push(result[0]);
          }
        } catch (err) {
          log.error(
            `Failed to create time entry for shift ${shift.shift_id}:`,
            err
          );
        }
      }
    }

    const totalScheduledHours = shifts.reduce(
      (sum, s) => sum + Number(s.scheduled_hours),
      0
    );

    return NextResponse.json({
      created: dryRun ? needsEntry.length : createdEntries.length,
      skipped: alreadyExists.length,
      totalShifts: shifts.length,
      totalScheduledHours: Math.round(totalScheduledHours * 100) / 100,
      dryRun,
      overtimeShifts: overtimeShifts.map((s) => ({
        shiftId: s.shift_id,
        employeeId: s.employee_id,
        employeeName: [s.employee_first_name, s.employee_last_name]
          .filter(Boolean)
          .join(" "),
        scheduledHours: Number(s.scheduled_hours),
        weeklyHours: Math.round(Number(s.weekly_hours) * 100) / 100,
        overtimeType:
          s.weekly_hours > OVERTIME_WEEKLY_THRESHOLD ? "weekly" : "daily",
      })),
      entries: createdEntries,
      preview: dryRun
        ? needsEntry.map((s) => ({
            shiftId: s.shift_id,
            employeeName: [s.employee_first_name, s.employee_last_name]
              .filter(Boolean)
              .join(" "),
            shiftStart: s.shift_start,
            shiftEnd: s.shift_end,
            scheduledHours: Number(s.scheduled_hours),
            locationId: s.location_id,
          }))
        : undefined,
    });
  } catch (error) {
    captureException(error);
    log.error("Schedule-to-payroll generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate timecards from schedules" },
      { status: 500 }
    );
  }
}
