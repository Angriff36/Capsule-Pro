/**
 * Scheduling domain queries — Convex-backed (no Prisma raw SQL).
 *
 * All functions wrapped with React cache() for per-request deduplication.
 * Tenant scope comes from auth via read-bridge-server, not SQL tenant_id.
 */

import { cache } from "react";
import { fetchConvexList } from "../convex/read-bridge-server";
import type {
  OpenShift,
  ScheduleShift,
  User,
} from "../manifest-types.generated";

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

type ShiftLike = ScheduleShift | OpenShift;

function isDeleted(deletedAt: unknown): boolean {
  return deletedAt != null && deletedAt !== "";
}

function toDate(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return value;
  if (typeof value === "number") return new Date(value);
  if (typeof value === "string" && value.length > 0) return new Date(value);
  return null;
}

function shiftStart(shift: ShiftLike): Date | null {
  const raw =
    (shift as Record<string, unknown>).shift_start ??
    (shift as Record<string, unknown>).shiftStart;
  return toDate(raw);
}

function shiftEnd(shift: ShiftLike): Date | null {
  const raw =
    (shift as Record<string, unknown>).shift_end ??
    (shift as Record<string, unknown>).shiftEnd;
  return toDate(raw);
}

function shiftHours(shift: ShiftLike): number {
  const start = shiftStart(shift);
  const end = shiftEnd(shift);
  if (!start || !end) return 0;
  return Math.max(0, (end.getTime() - start.getTime()) / 3_600_000);
}

function inHalfOpenRange(value: Date, start: Date, end: Date): boolean {
  return value >= start && value < end;
}

function startOfDay(value: Date): Date {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function hourlyRate(user: User): number {
  if (user.hourlyRate != null) return Number(user.hourlyRate);
  if (user.salaryAnnual != null) return Number(user.salaryAnnual) / 2080;
  return 0;
}

function activeUsers(users: User[]): User[] {
  return users.filter((user) => !isDeleted(user.deletedAt) && user.isActive);
}

function activeShifts(shifts: ScheduleShift[]): ScheduleShift[] {
  return shifts.filter((shift) => !isDeleted(shift.deletedAt));
}

function openShiftsInWeek(
  shifts: OpenShift[],
  weekStart: Date,
  weekEnd: Date
): OpenShift[] {
  return shifts.filter((shift) => {
    if (shift.status !== "open") return false;
    const start = shiftStart(shift);
    return start != null && inHalfOpenRange(start, weekStart, weekEnd);
  });
}

const loadSchedulingData = cache(async () => {
  const [users, shifts, openShifts] = await Promise.all([
    fetchConvexList("User") as Promise<User[]>,
    fetchConvexList("ScheduleShift") as Promise<ScheduleShift[]>,
    fetchConvexList("OpenShift") as Promise<OpenShift[]>,
  ]);
  return { users, shifts, openShifts };
});

export const getSchedulingMetrics = cache(
  async (
    _tenantId: string,
    weekStart: Date,
    weekEnd: Date,
    previousWeekStart: Date
  ): Promise<SchedulingMetrics> => {
    const { users, shifts, openShifts } = await loadSchedulingData();
    const employees = activeUsers(users);
    const scheduled = activeShifts(shifts);

    const currentStaff = employees.length;
    const previousStaff = employees.filter((user) => {
      const created = toDate(user.createdAt);
      return created != null && created < weekStart;
    }).length;

    const sumHours = (start: Date, end: Date) =>
      scheduled.reduce((total, shift) => {
        const shiftStartDate = shiftStart(shift);
        if (!shiftStartDate || !inHalfOpenRange(shiftStartDate, start, end)) {
          return total;
        }
        return total + shiftHours(shift);
      }, 0);

    const countOpen = (start: Date, end: Date) =>
      openShiftsInWeek(openShifts, start, end).length;

    const usersById = new Map(employees.map((user) => [user.id, user]));

    const sumCost = (start: Date, end: Date) =>
      scheduled.reduce((total, shift) => {
        const shiftStartDate = shiftStart(shift);
        if (!shiftStartDate || !inHalfOpenRange(shiftStartDate, start, end)) {
          return total;
        }
        const employee = usersById.get(shift.employeeId);
        return total + shiftHours(shift) * (employee ? hourlyRate(employee) : 0);
      }, 0);

    return {
      currentStaff: { count: currentStaff },
      previousStaff: { count: previousStaff },
      currentHours: { hours: sumHours(weekStart, weekEnd) },
      previousHours: { hours: sumHours(previousWeekStart, weekStart) },
      openShifts: { count: countOpen(weekStart, weekEnd) },
      previousOpenShifts: { count: countOpen(previousWeekStart, weekStart) },
      currentCost: { cost: sumCost(weekStart, weekEnd) },
      previousCost: { cost: sumCost(previousWeekStart, weekStart) },
    };
  }
);

export const getScheduleCadence = cache(
  async (
    _tenantId: string,
    weekStart: Date,
    weekEnd: Date
  ): Promise<{
    shiftSummary: ScheduleSummaryRow[];
    shiftTotals: ShiftTotals;
  }> => {
    const { shifts, openShifts } = await loadSchedulingData();
    const scheduled = activeShifts(shifts);
    const byDay = new Map<
      string,
      { shift_count: number; staff_count: Set<string>; open_count: number }
    >();

    for (const shift of scheduled) {
      const start = shiftStart(shift);
      if (!start || !inHalfOpenRange(start, weekStart, weekEnd)) continue;
      const key = startOfDay(start).toISOString();
      const row = byDay.get(key) ?? {
        shift_count: 0,
        staff_count: new Set<string>(),
        open_count: 0,
      };
      row.shift_count += 1;
      row.staff_count.add(shift.employeeId);
      byDay.set(key, row);
    }

    for (const shift of openShiftsInWeek(openShifts, weekStart, weekEnd)) {
      const start = shiftStart(shift);
      if (!start) continue;
      const key = startOfDay(start).toISOString();
      const row = byDay.get(key) ?? {
        shift_count: 0,
        staff_count: new Set<string>(),
        open_count: 0,
      };
      row.open_count += 1;
      row.shift_count += 1;
      byDay.set(key, row);
    }

    const shiftSummary: ScheduleSummaryRow[] = [...byDay.entries()]
      .map(([iso, row]) => ({
        shift_date: new Date(iso),
        shift_count: row.shift_count,
        staff_count: row.staff_count.size,
        open_count: row.open_count,
      }))
      .sort((a, b) => a.shift_date.getTime() - b.shift_date.getTime());

    const weekScheduled = scheduled.filter((shift) => {
      const start = shiftStart(shift);
      return start != null && inHalfOpenRange(start, weekStart, weekEnd);
    });

    return {
      shiftSummary,
      shiftTotals: {
        shift_count:
          weekScheduled.length +
          openShiftsInWeek(openShifts, weekStart, weekEnd).length,
        staff_count: new Set(weekScheduled.map((shift) => shift.employeeId))
          .size,
      },
    };
  }
);

export const getHappeningToday = cache(
  async (
    _tenantId: string,
    startOfToday: Date,
    endOfToday: Date
  ): Promise<HappeningShiftRow[]> => {
    const { users, shifts, openShifts } = await loadSchedulingData();
    const usersById = new Map(activeUsers(users).map((user) => [user.id, user]));
    const rows: HappeningShiftRow[] = [];

    for (const shift of activeShifts(shifts)) {
      const start = shiftStart(shift);
      const end = shiftEnd(shift);
      if (!start || !end || !inHalfOpenRange(start, startOfToday, endOfToday)) {
        continue;
      }
      const employee = usersById.get(shift.employeeId);
      rows.push({
        shift_start: start,
        shift_end: end,
        first_name: employee?.firstName ?? null,
        last_name: employee?.lastName ?? null,
        role: employee?.role ?? null,
      });
    }

    for (const shift of openShifts) {
      if (shift.status !== "open") continue;
      const start = shiftStart(shift);
      const end = shiftEnd(shift);
      if (!start || !end || !inHalfOpenRange(start, startOfToday, endOfToday)) {
        continue;
      }
      rows.push({
        shift_start: start,
        shift_end: end,
        first_name: null,
        last_name: null,
        role:
          ((shift as Record<string, unknown>).role_during_shift as
            | string
            | undefined) ??
          shift.role ??
          null,
      });
    }

    return rows
      .sort((a, b) => a.shift_start.getTime() - b.shift_start.getTime())
      .slice(0, 6);
  }
);

export const getLeaderboard = cache(
  async (
    _tenantId: string,
    weekStart: Date,
    weekEnd: Date
  ): Promise<LeaderboardRow[]> => {
    const { users, shifts } = await loadSchedulingData();
    const usersById = new Map(activeUsers(users).map((user) => [user.id, user]));
    const counts = new Map<string, number>();

    for (const shift of activeShifts(shifts)) {
      const start = shiftStart(shift);
      if (!start || !inHalfOpenRange(start, weekStart, weekEnd)) continue;
      counts.set(shift.employeeId, (counts.get(shift.employeeId) ?? 0) + 1);
    }

    return [...counts.entries()]
      .map(([employeeId, shift_count]) => {
        const employee = usersById.get(employeeId);
        return {
          employeeId,
          shift_count,
          first_name: employee?.firstName ?? null,
          last_name: employee?.lastName ?? null,
          role: employee?.role ?? null,
        };
      })
      .sort((a, b) => {
        if (b.shift_count !== a.shift_count) {
          return b.shift_count - a.shift_count;
        }
        return (a.last_name ?? "").localeCompare(b.last_name ?? "");
      })
      .slice(0, 3);
  }
);
