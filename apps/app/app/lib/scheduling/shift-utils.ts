import type { ScheduleShift } from "../manifest-types.generated";

export function isDeleted(deletedAt: unknown): boolean {
  return deletedAt != null && deletedAt !== "";
}

export function toDate(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return value;
  if (typeof value === "number") return new Date(value);
  if (typeof value === "string" && value.length > 0) return new Date(value);
  return null;
}

export function shiftStartDate(shift: ScheduleShift | Record<string, unknown>): Date | null {
  const raw =
    (shift as Record<string, unknown>).shiftStart ??
    (shift as Record<string, unknown>).shift_start;
  return toDate(raw);
}

export function shiftEndDate(shift: ScheduleShift | Record<string, unknown>): Date | null {
  const raw =
    (shift as Record<string, unknown>).shiftEnd ??
    (shift as Record<string, unknown>).shift_end;
  return toDate(raw);
}

export function activeShifts<T extends { deletedAt?: unknown }>(shifts: T[]): T[] {
  return shifts.filter((shift) => !isDeleted(shift.deletedAt));
}

export function inHalfOpenRange(value: Date, start: Date, end: Date): boolean {
  return value >= start && value < end;
}

export function countOverlappingShifts(
  shifts: ScheduleShift[],
  employeeId: string,
  startDate: Date,
  endDate: Date,
  excludeShiftId?: string
): number {
  return activeShifts(shifts).filter((shift) => {
    if (shift.employeeId !== employeeId) return false;
    if (excludeShiftId && shift.id === excludeShiftId) return false;
    const start = shiftStartDate(shift);
    const end = shiftEndDate(shift);
    if (!start || !end) return false;
    return start < endDate && end > startDate;
  }).length;
}

export function groupShiftCountsByEmployee(
  shifts: ScheduleShift[],
  weekStart: Date,
  weekEnd: Date
): Array<{ employeeId: string; shift_count: number }> {
  const counts = new Map<string, number>();

  for (const shift of activeShifts(shifts)) {
    const start = shiftStartDate(shift);
    if (!start || !inHalfOpenRange(start, weekStart, weekEnd)) continue;
    counts.set(shift.employeeId, (counts.get(shift.employeeId) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([employeeId, shift_count]) => ({ employeeId, shift_count }))
    .sort((a, b) => b.shift_count - a.shift_count);
}
