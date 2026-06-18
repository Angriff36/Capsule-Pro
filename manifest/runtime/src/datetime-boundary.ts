/**
 * Datetime parsing at manifest runtime boundaries.
 *
 * Contract: manifest datetime fields are epoch-ms numbers internally. Callers
 * may send ISO strings, date-only strings, Date objects, or numbers. Date-only
 * values (`YYYY-MM-DD`) always mean UTC midnight — matching calendar pages and
 * tenant defaultTimezone "UTC".
 */
import { Temporal } from "@js-temporal/polyfill";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function hasExplicitOffset(value: string): boolean {
  return /[zZ]$|[+-]\d{2}:\d{2}$/.test(value);
}

/**
 * Parse a boundary datetime value to epoch milliseconds.
 * Returns undefined when the value cannot be parsed.
 */
export function parseDatetimeToEpochMs(value: unknown): number | undefined {
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isFinite(ms) ? ms : undefined;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== "string" || value.length === 0) {
    return undefined;
  }

  if (DATE_ONLY.test(value)) {
    return Temporal.PlainDate.from(value)
      .toZonedDateTime("UTC")
      .epochMilliseconds;
  }

  try {
    return Temporal.Instant.from(value).epochMilliseconds;
  } catch {
    if (value.includes("T") && !hasExplicitOffset(value)) {
      try {
        return Temporal.Instant.from(`${value}Z`).epochMilliseconds;
      } catch {
        // fall through
      }
    }
  }

  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : undefined;
}

/** Parse to Date for Prisma store writes. */
export function parseToDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const ms = parseDatetimeToEpochMs(value);
  if (ms === undefined) {
    return null;
  }
  return new Date(ms);
}

/** Normalize any parsed datetime to UTC day start (midnight). */
export function toDayStartEpochMs(value: unknown): number | undefined {
  const ms = parseDatetimeToEpochMs(value);
  if (ms === undefined) {
    return undefined;
  }
  const day = Temporal.Instant.fromEpochMilliseconds(ms)
    .toZonedDateTimeISO("UTC")
    .toPlainDate();
  return day.toZonedDateTime("UTC").epochMilliseconds;
}
