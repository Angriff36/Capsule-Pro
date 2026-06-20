/**
 * Overtime prevention — weekly hour aggregation and alert generation.
 */

import { database } from "@repo/database";

export type OvertimeRiskLevel = "ok" | "warning" | "critical";

export interface OvertimeAlert {
  employeeId: string;
  employeeName: string;
  overtimeHours: number;
  projectedOvertimeCost: number;
  riskLevel: OvertimeRiskLevel;
  scheduledHours: number;
  shiftIds: string[];
  suggestedActions: string[];
  thresholdHours: number;
  weekStart: string;
}

export interface OvertimeScanRequest {
  endDate: Date;
  locationId?: string;
  startDate: Date;
  tenantId: string;
}

export interface OvertimeScanResult {
  alerts: OvertimeAlert[];
  scannedShiftCount: number;
  summary: {
    criticalCount: number;
    employeesAtRisk: number;
    totalOvertimeHours: number;
    warningCount: number;
  };
}

export function computeShiftHours(shiftStart: Date, shiftEnd: Date): number {
  const ms = shiftEnd.getTime() - shiftStart.getTime();
  if (ms <= 0) {
    return 0;
  }
  return ms / (1000 * 60 * 60);
}

/** ISO week start (Monday 00:00 local). */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function weekKey(date: Date): string {
  return getWeekStart(date).toISOString().slice(0, 10);
}

function riskLevel(
  scheduledHours: number,
  threshold: number
): OvertimeRiskLevel {
  if (scheduledHours <= threshold) {
    return "ok";
  }
  if (scheduledHours <= threshold + 4) {
    return "warning";
  }
  return "critical";
}

function suggestedActions(
  level: OvertimeRiskLevel,
  overtimeHours: number
): string[] {
  if (level === "ok") {
    return [];
  }
  const actions = [
    "Redistribute shifts to employees under the weekly threshold",
    "Offer voluntary time off before adding more hours",
  ];
  if (overtimeHours > 8) {
    actions.push("Split long shifts or hire temporary coverage");
  }
  if (level === "critical") {
    actions.push(
      "Require manager approval before publishing additional shifts"
    );
  }
  return actions;
}

export async function scanOvertimeRisk(
  request: OvertimeScanRequest
): Promise<OvertimeScanResult> {
  const { tenantId, startDate, endDate, locationId } = request;

  const shifts = await database.scheduleShift.findMany({
    where: {
      tenantId,
      deletedAt: null,
      shift_start: { gte: startDate, lte: endDate },
      ...(locationId ? { locationId } : {}),
    },
    select: {
      id: true,
      employeeId: true,
      shift_start: true,
      shift_end: true,
    },
  });

  if (shifts.length === 0) {
    return {
      alerts: [],
      scannedShiftCount: 0,
      summary: {
        criticalCount: 0,
        employeesAtRisk: 0,
        totalOvertimeHours: 0,
        warningCount: 0,
      },
    };
  }

  const employeeIds = [...new Set(shifts.map((s) => s.employeeId))];
  const [employees, roles] = await Promise.all([
    database.user.findMany({
      where: { tenantId, id: { in: employeeIds }, deletedAt: null },
      select: { id: true, firstName: true, lastName: true, role: true },
    }),
    database.role.findMany({
      where: { tenantId, deletedAt: null, isActive: true },
      select: {
        name: true,
        overtimeThresholdHours: true,
        overtimeMultiplier: true,
        baseRate: true,
      },
    }),
  ]);

  const employeeById = new Map(employees.map((e) => [e.id, e]));
  const roleByName = new Map(roles.map((r) => [r.name, r]));
  const defaultThreshold = 40;
  const defaultMultiplier = 1.5;
  const defaultRate = 20;

  const buckets = new Map<
    string,
    { hours: number; shiftIds: string[]; employeeId: string; week: string }
  >();

  for (const shift of shifts) {
    const hours = computeShiftHours(shift.shift_start, shift.shift_end);
    const week = weekKey(shift.shift_start);
    const key = `${shift.employeeId}:${week}`;
    const existing = buckets.get(key);
    if (existing) {
      existing.hours += hours;
      existing.shiftIds.push(shift.id);
    } else {
      buckets.set(key, {
        hours,
        shiftIds: [shift.id],
        employeeId: shift.employeeId,
        week,
      });
    }
  }

  const alerts: OvertimeAlert[] = [];

  for (const bucket of buckets.values()) {
    const employee = employeeById.get(bucket.employeeId);
    const role = employee?.role ? roleByName.get(employee.role) : undefined;
    const threshold = role?.overtimeThresholdHours ?? defaultThreshold;
    const level = riskLevel(bucket.hours, threshold);
    if (level === "ok") {
      continue;
    }

    const overtimeHours = bucket.hours - threshold;
    const rate = role?.baseRate ? Number(role.baseRate) : defaultRate;
    const multiplier = role?.overtimeMultiplier
      ? Number(role.overtimeMultiplier)
      : defaultMultiplier;
    const projectedOvertimeCost = overtimeHours * rate * multiplier;

    alerts.push({
      employeeId: bucket.employeeId,
      employeeName: employee
        ? `${employee.firstName ?? ""} ${employee.lastName ?? ""}`.trim() ||
          "Unknown"
        : "Unknown",
      weekStart: bucket.week,
      scheduledHours: Math.round(bucket.hours * 100) / 100,
      thresholdHours: threshold,
      overtimeHours: Math.round(overtimeHours * 100) / 100,
      projectedOvertimeCost: Math.round(projectedOvertimeCost * 100) / 100,
      riskLevel: level,
      shiftIds: bucket.shiftIds,
      suggestedActions: suggestedActions(level, overtimeHours),
    });
  }

  alerts.sort((a, b) => b.overtimeHours - a.overtimeHours);

  return {
    alerts,
    scannedShiftCount: shifts.length,
    summary: {
      criticalCount: alerts.filter((a) => a.riskLevel === "critical").length,
      warningCount: alerts.filter((a) => a.riskLevel === "warning").length,
      employeesAtRisk: new Set(alerts.map((a) => a.employeeId)).size,
      totalOvertimeHours: alerts.reduce((sum, a) => sum + a.overtimeHours, 0),
    },
  };
}
