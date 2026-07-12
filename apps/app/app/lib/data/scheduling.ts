/**
 * Scheduling domain queries.
 *
 * All functions wrapped with React cache() for per-request deduplication.
 * Every function scoped to a single tenant — no cross-tenant leakage.
 *
 * 12 raw SQL queries → 4 domain functions.
 */

import { Prisma } from "@repo/database";
import { cache } from "react";
import { timedQueryRaw } from "../data/db";

// ============================================================================
// Types
// ============================================================================

export interface StaffCount {
  count: number;
}

export interface HoursTotal {
  hours: number;
}

export interface OpenShiftCount {
  count: number;
}

export interface LaborCost {
  cost: number;
}

export interface ScheduleSummaryRow {
  open_count: number;
  shift_count: number;
  shift_date: Date;
  staff_count: number;
}

export interface ShiftTotals {
  shift_count: number;
  staff_count: number;
}

export interface HappeningShiftRow {
  first_name: string | null;
  last_name: string | null;
  role: string | null;
  shift_end: Date;
  shift_start: Date;
}

export interface LeaderboardRow {
  employeeId: string;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
  shift_count: number;
}

export interface SchedulingMetrics {
  currentCost: LaborCost;
  currentHours: HoursTotal;
  currentStaff: StaffCount;
  openShifts: OpenShiftCount;
  previousCost: LaborCost;
  previousHours: HoursTotal;
  previousOpenShifts: OpenShiftCount;
  previousStaff: StaffCount;
}

// ============================================================================
// Metric queries — all 8 current/previous comparisons
// ============================================================================

/**
 * All 8 scheduling metrics for the current and previous week.
 * Half-open intervals [start, end) — no BETWEEN timestamp anti-patterns.
 */
export const getSchedulingMetrics = cache(
  async (
    tenantId: string,
    weekStart: Date,
    weekEnd: Date,
    previousWeekStart: Date
  ): Promise<SchedulingMetrics> => {
    const [
      currentStaffRows,
      previousStaffRows,
      currentHoursRows,
      previousHoursRows,
      openShiftRows,
      previousOpenShiftRows,
      currentCostRows,
      previousCostRows,
    ] = await Promise.all([
      timedQueryRaw<StaffCount[]>(
        Prisma.sql`
          SELECT COUNT(*)::int AS count
          FROM tenant_staff.employees
          WHERE tenant_id = ${tenantId}
            AND deleted_at IS NULL
            AND is_active = true
        `,
        "scheduling.staffCount.current"
      ),
      timedQueryRaw<StaffCount[]>(
        Prisma.sql`
          SELECT COUNT(*)::int AS count
          FROM tenant_staff.employees
          WHERE tenant_id = ${tenantId}
            AND deleted_at IS NULL
            AND is_active = true
            AND created_at < ${weekStart}
        `,
        "scheduling.staffCount.previous"
      ),
      timedQueryRaw<HoursTotal[]>(
        Prisma.sql`
          SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (shift_end - shift_start)) / 3600), 0) AS hours
          FROM tenant_staff.schedule_shifts
          WHERE tenant_id = ${tenantId}
            AND deleted_at IS NULL
            AND shift_start >= ${weekStart}
            AND shift_start < ${weekEnd}
        `,
        "scheduling.hours.current"
      ),
      timedQueryRaw<HoursTotal[]>(
        Prisma.sql`
          SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (shift_end - shift_start)) / 3600), 0) AS hours
          FROM tenant_staff.schedule_shifts
          WHERE tenant_id = ${tenantId}
            AND deleted_at IS NULL
            AND shift_start >= ${previousWeekStart}
            AND shift_start < ${weekStart}
        `,
        "scheduling.hours.previous"
      ),
      timedQueryRaw<OpenShiftCount[]>(
        Prisma.sql`
          SELECT COUNT(*)::int AS count
          FROM tenant_staff.open_shifts
          WHERE tenant_id = ${tenantId}
            AND deleted_at IS NULL
            AND status = 'open'
            AND shift_start >= ${weekStart}
            AND shift_start < ${weekEnd}
        `,
        "scheduling.openShifts.current"
      ),
      timedQueryRaw<OpenShiftCount[]>(
        Prisma.sql`
          SELECT COUNT(*)::int AS count
          FROM tenant_staff.open_shifts
          WHERE tenant_id = ${tenantId}
            AND deleted_at IS NULL
            AND status = 'open'
            AND shift_start >= ${previousWeekStart}
            AND shift_start < ${weekStart}
        `,
        "scheduling.openShifts.previous"
      ),
      timedQueryRaw<LaborCost[]>(
        Prisma.sql`
          SELECT COALESCE(
            SUM(
              EXTRACT(EPOCH FROM (s.shift_end - s.shift_start)) / 3600 *
              CASE
                WHEN e.hourly_rate IS NOT NULL THEN e.hourly_rate
                WHEN e.salary_annual IS NOT NULL THEN e.salary_annual / 2080
                ELSE 0
              END
            ),
            0
          ) AS cost
          FROM tenant_staff.schedule_shifts s
          JOIN tenant_staff.employees e
            ON e.tenant_id = s.tenant_id
           AND e.id = s.employee_id
          WHERE s.tenant_id = ${tenantId}
            AND s.deleted_at IS NULL
            AND s.shift_start >= ${weekStart}
            AND s.shift_start < ${weekEnd}
        `,
        "scheduling.cost.current"
      ),
      timedQueryRaw<LaborCost[]>(
        Prisma.sql`
          SELECT COALESCE(
            SUM(
              EXTRACT(EPOCH FROM (s.shift_end - s.shift_start)) / 3600 *
              CASE
                WHEN e.hourly_rate IS NOT NULL THEN e.hourly_rate
                WHEN e.salary_annual IS NOT NULL THEN e.salary_annual / 2080
                ELSE 0
              END
            ),
            0
          ) AS cost
          FROM tenant_staff.schedule_shifts s
          JOIN tenant_staff.employees e
            ON e.tenant_id = s.tenant_id
           AND e.id = s.employee_id
          WHERE s.tenant_id = ${tenantId}
            AND s.deleted_at IS NULL
            AND s.shift_start >= ${previousWeekStart}
            AND s.shift_start < ${weekStart}
        `,
        "scheduling.cost.previous"
      ),
    ]);

    return {
      currentStaff: currentStaffRows[0] ?? { count: 0 },
      previousStaff: previousStaffRows[0] ?? { count: 0 },
      currentHours: currentHoursRows[0] ?? { hours: 0 },
      previousHours: previousHoursRows[0] ?? { hours: 0 },
      openShifts: openShiftRows[0] ?? { count: 0 },
      previousOpenShifts: previousOpenShiftRows[0] ?? { count: 0 },
      currentCost: currentCostRows[0] ?? { cost: 0 },
      previousCost: previousCostRows[0] ?? { cost: 0 },
    };
  }
);

// ============================================================================
// Schedule cadence — day-by-day shift summary + week totals
// ============================================================================

export const getScheduleCadence = cache(
  async (
    tenantId: string,
    weekStart: Date,
    weekEnd: Date
  ): Promise<{
    shiftSummary: ScheduleSummaryRow[];
    shiftTotals: ShiftTotals;
  }> => {
    const [shiftSummary, totals] = await Promise.all([
      timedQueryRaw<ScheduleSummaryRow[]>(
        Prisma.sql`
          WITH scheduled AS (
            SELECT
              date_trunc('day', shift_start) AS shift_date,
              COUNT(*)::int AS shift_count,
              COUNT(DISTINCT employee_id)::int AS staff_count
            FROM tenant_staff.schedule_shifts
            WHERE tenant_id = ${tenantId}
              AND deleted_at IS NULL
              AND shift_start >= ${weekStart}
              AND shift_start < ${weekEnd}
            GROUP BY shift_date
          ),
          open AS (
            SELECT
              date_trunc('day', shift_start) AS shift_date,
              COUNT(*)::int AS open_count
            FROM tenant_staff.open_shifts
            WHERE tenant_id = ${tenantId}
              AND deleted_at IS NULL
              AND status = 'open'
              AND shift_start >= ${weekStart}
              AND shift_start < ${weekEnd}
            GROUP BY shift_date
          )
          SELECT
            COALESCE(s.shift_date, o.shift_date) AS shift_date,
            COALESCE(s.shift_count, 0) + COALESCE(o.open_count, 0) AS shift_count,
            COALESCE(s.staff_count, 0) AS staff_count,
            COALESCE(o.open_count, 0) AS open_count
          FROM scheduled s
          FULL OUTER JOIN open o ON o.shift_date = s.shift_date
        `,
        "scheduling.shiftSummary"
      ),
      timedQueryRaw<ShiftTotals[]>(
        Prisma.sql`
          SELECT
            (
              SELECT COUNT(*)::int
              FROM tenant_staff.schedule_shifts
              WHERE tenant_id = ${tenantId}
                AND deleted_at IS NULL
                AND shift_start >= ${weekStart}
                AND shift_start < ${weekEnd}
            ) +
            (
              SELECT COUNT(*)::int
              FROM tenant_staff.open_shifts
              WHERE tenant_id = ${tenantId}
                AND deleted_at IS NULL
                AND status = 'open'
                AND shift_start >= ${weekStart}
                AND shift_start < ${weekEnd}
            ) AS shift_count,
            (
              SELECT COUNT(DISTINCT employee_id)::int
              FROM tenant_staff.schedule_shifts
              WHERE tenant_id = ${tenantId}
                AND deleted_at IS NULL
                AND shift_start >= ${weekStart}
                AND shift_start < ${weekEnd}
            ) AS staff_count
        `,
        "scheduling.shiftTotals"
      ),
    ]);

    return {
      shiftSummary,
      shiftTotals: totals[0] ?? { shift_count: 0, staff_count: 0 },
    };
  }
);

// ============================================================================
// Live view — shifts happening today (scheduled + open, max 6)
// ============================================================================

export const getHappeningToday = cache(
  async (
    tenantId: string,
    startOfToday: Date,
    endOfToday: Date
  ): Promise<HappeningShiftRow[]> =>
    timedQueryRaw<HappeningShiftRow[]>(
      Prisma.sql`
        SELECT
          s.shift_start,
          s.shift_end,
          e.first_name,
          e.last_name,
          e.role
        FROM tenant_staff.schedule_shifts s
        JOIN tenant_staff.employees e
          ON e.tenant_id = s.tenant_id
         AND e.id = s.employee_id
        WHERE s.tenant_id = ${tenantId}
          AND s.deleted_at IS NULL
          AND s.shift_start >= ${startOfToday}
          AND s.shift_start < ${endOfToday}
        UNION ALL
        SELECT
          o.shift_start,
          o.shift_end,
          NULL::text AS first_name,
          NULL::text AS last_name,
          o.role_during_shift AS role
        FROM tenant_staff.open_shifts o
        WHERE o.tenant_id = ${tenantId}
          AND o.deleted_at IS NULL
          AND o.status = 'open'
          AND o.shift_start >= ${startOfToday}
          AND o.shift_start < ${endOfToday}
        ORDER BY shift_start
        LIMIT 6
      `,
      "scheduling.happeningToday"
    )
);

// ============================================================================
// Leaderboard — top 3 shift-claimers this week
// ============================================================================

export const getLeaderboard = cache(
  async (
    tenantId: string,
    weekStart: Date,
    weekEnd: Date
  ): Promise<LeaderboardRow[]> =>
    timedQueryRaw<LeaderboardRow[]>(
      Prisma.sql`
        SELECT
          s.employee_id AS "employeeId",
          e.first_name,
          e.last_name,
          e.role,
          COUNT(*)::int AS shift_count
        FROM tenant_staff.schedule_shifts s
        JOIN tenant_staff.employees e
          ON e.tenant_id = s.tenant_id
         AND e.id = s.employee_id
        WHERE s.tenant_id = ${tenantId}
          AND s.deleted_at IS NULL
          AND s.shift_start >= ${weekStart}
          AND s.shift_start < ${weekEnd}
        GROUP BY s.employee_id, e.first_name, e.last_name, e.role
        ORDER BY shift_count DESC, e.last_name ASC
        LIMIT 3
      `,
      "scheduling.leaderboard"
    )
);
