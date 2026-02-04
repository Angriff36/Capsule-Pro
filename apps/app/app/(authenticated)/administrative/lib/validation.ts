/**
 * Validation utilities for Admin Dashboard
 */

import { invariant } from "../../../lib/invariant";

// Validation status for events
export type EventValidationStatus =
  | "ready"
  | "staff_mismatch"
  | "time_overlap"
  | "incomplete";

interface EventValidationInput {
  venueName: string | null;
  staffCount: number;
  guestCount: number;
  eventDate: Date;
  startTime: Date | null;
  endTime: Date | null;
}

/**
 * Determines validation status for an event based on completeness and staffing.
 * @throws InvariantError if guestCount is negative
 */
export function getEventValidationStatus(
  event: EventValidationInput
): EventValidationStatus {
  invariant(event.guestCount >= 0, "guestCount must be non-negative");
  invariant(event.staffCount >= 0, "staffCount must be non-negative");

  // Check for incomplete data
  if (!event.venueName) {
    return "incomplete";
  }

  // Simple heuristic: 1 staff per 15 guests minimum (0 guests = ready)
  if (event.guestCount > 0) {
    const requiredStaff = Math.ceil(event.guestCount / 15);
    if (event.staffCount < requiredStaff) {
      return "staff_mismatch";
    }
  }

  return "ready";
}

export const statusBadgeVariants: Record<
  EventValidationStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  ready: "default",
  staff_mismatch: "destructive",
  time_overlap: "secondary",
  incomplete: "outline",
};

export const statusLabels: Record<EventValidationStatus, string> = {
  ready: "Ready",
  staff_mismatch: "Staff Mismatch",
  time_overlap: "Time Overlap",
  incomplete: "Incomplete",
};

/**
 * Parses and validates week offset from search params.
 * @param weekParam - The raw week parameter string
 * @returns A valid week offset number (defaults to 0 if invalid)
 */
export function parseWeekOffset(weekParam: string | undefined): number {
  if (!weekParam) {
    return 0;
  }
  const parsed = Number.parseInt(weekParam, 10);
  if (Number.isNaN(parsed)) {
    return 0;
  }
  // Reasonable bounds: ±52 weeks (1 year)
  if (parsed < -52 || parsed > 52) {
    return 0;
  }
  return parsed;
}

/**
 * Calculates week date range for a given offset from current week.
 * @param weekOffset - Number of weeks from current week (positive = future, negative = past)
 */
export function getWeekDateRange(weekOffset = 0): {
  start: Date;
  end: Date;
  weekNumber: number;
} {
  const now = new Date();
  const currentDay = now.getDay();
  // Start of current week (Sunday)
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - currentDay + weekOffset * 7);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  // Calculate ISO week number
  const firstDayOfYear = new Date(weekStart.getFullYear(), 0, 1);
  const pastDaysOfYear =
    (weekStart.getTime() - firstDayOfYear.getTime()) / 86_400_000;
  const weekNumber = Math.ceil(
    (pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7
  );

  return { start: weekStart, end: weekEnd, weekNumber };
}

/**
 * Formats a date range for display.
 */
export function formatDateRange(start: Date, end: Date): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return `${formatter.format(start)} - ${formatter.format(end)}`;
}
