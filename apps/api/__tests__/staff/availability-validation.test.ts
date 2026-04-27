/**
 * Staff Availability Validation Test Suite
 *
 * Why these tests matter:
 *   - This module is the input-validation perimeter for all employee
 *     availability writes (single + batch + update). Bugs here let bad data
 *     into `tenant_staff.employee_availability` — which then drives
 *     auto-assignment, scheduling, labor budgeting, and conflict detection.
 *   - The 45th audit pass (2026-04-27) fixed a HIGH SQL bug in
 *     `checkOverlappingAvailability` (a duplicate `AND` token inside the
 *     date-range overlap predicate). Prior to this suite, ZERO tests
 *     covered this module — meaning the SQL syntax error shipped to prod
 *     without ever failing a test, and a future regression that broke the
 *     same predicate would ship the same way.
 *   - Time + date overlap math is famously easy to get wrong (off-by-one
 *     boundary cases, NULL `effective_until`, exclude-self on update).
 *     The conformance tests below pin the *exact* boundary behavior so a
 *     refactor cannot silently flip a strict `<` to a `<=`.
 *
 * Coverage:
 *   - validateTimeFormat: HH:MM regex boundaries (00:00, 23:59, 24:00, ...)
 *   - validateDayOfWeek: 0..6 inclusive, integer-only
 *   - validateTimeRange: end > start, format-error pass-through
 *   - validateEffectiveDates: past rejected, until ≥ from required, null OK
 *   - checkOverlappingAvailability: SQL is called, time overlap math,
 *     NULL effective_until handling, excludeAvailabilityId on updates
 *   - verifyEmployee: 404 / 400 (inactive) / happy path
 *   - verifyAvailability: 404 / happy path
 *   - validateBatchAvailabilityInput: empty + duplicate days + per-pattern
 *
 * @vitest-environment node
 */

import { database } from "@repo/database";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DayOfWeek } from "@/app/api/staff/availability/types";
import {
  checkOverlappingAvailability,
  validateBatchAvailabilityInput,
  validateDayOfWeek,
  validateEffectiveDates,
  validateTimeFormat,
  validateTimeRange,
  verifyAvailability,
  verifyEmployee,
} from "@/app/api/staff/availability/validation";

const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const EMPLOYEE_ID = "11111111-1111-1111-1111-111111111111";
const AVAILABILITY_ID = "22222222-2222-2222-2222-222222222222";

const queryRawMock = vi.mocked(
  database.$queryRaw as unknown as (...args: unknown[]) => Promise<unknown>
);

/**
 * The `@repo/database` test mock returns a `{ strings, values, sql }` object
 * for `Prisma.sql\`...\`` calls. Conditional fragments produce nested objects
 * of the same shape, which stringify as `[object Object]` in the rendered SQL
 * but preserve their bound values in the `values` array. This walker pulls
 * every primitive bound parameter (recursing into nested Prisma.sql results)
 * so a test can assert "this ID was bound somewhere in the query" regardless
 * of how the parts were composed.
 */
function flattenSqlValues(arg: unknown, acc: unknown[] = []): unknown[] {
  if (arg && typeof arg === "object" && "values" in arg) {
    const values = (arg as { values: unknown[] }).values;
    for (const v of values) {
      flattenSqlValues(v, acc);
    }
    return acc;
  }
  acc.push(arg);
  return acc;
}

beforeEach(() => {
  queryRawMock.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// validateTimeFormat
// ---------------------------------------------------------------------------

describe("validateTimeFormat", () => {
  it.each([
    ["00:00", "midnight"],
    ["09:30", "morning"],
    ["12:00", "noon"],
    ["13:45", "afternoon"],
    ["23:59", "last minute of day"],
    ["19:00", "evening shift start"],
  ])("accepts valid HH:MM: %s (%s)", (time) => {
    expect(validateTimeFormat(time)).toBeNull();
  });

  it.each([
    ["24:00", "hours overflow — 24 not allowed"],
    ["25:00", "hours far overflow"],
    ["12:60", "minutes overflow"],
    ["12:99", "minutes far overflow"],
    ["9:30", "missing leading zero on hour"],
    ["09:5", "missing leading zero on minute"],
    ["9:5", "missing leading zeros both"],
    ["09:30:00", "trailing seconds"],
    ["abc", "non-numeric"],
    ["", "empty string"],
    ["12-30", "wrong separator"],
    ["12.30", "decimal separator"],
    [" 12:30", "leading whitespace"],
    ["12:30 ", "trailing whitespace"],
    ["120:30", "three-digit hour"],
  ])("rejects %s with 400 (%s)", async (time) => {
    const response = validateTimeFormat(time);
    expect(response).not.toBeNull();
    expect(response?.status).toBe(400);
    const body = await response?.json();
    expect(body.message).toContain("Invalid time format");
    expect(body.message).toContain(time);
  });
});

// ---------------------------------------------------------------------------
// validateDayOfWeek
// ---------------------------------------------------------------------------

describe("validateDayOfWeek", () => {
  it.each([0, 1, 2, 3, 4, 5, 6])("accepts %i", (day) => {
    expect(validateDayOfWeek(day)).toBeNull();
  });

  it.each([
    [-1, "below range"],
    [7, "above range"],
    [-100, "far below"],
    [42, "far above"],
    [1.5, "fractional"],
    [0.5, "fractional zero"],
    [Number.NaN, "NaN"],
  ])("rejects %s with 400 (%s)", async (day) => {
    const response = validateDayOfWeek(day);
    expect(response).not.toBeNull();
    expect(response?.status).toBe(400);
    const body = await response?.json();
    expect(body.message).toContain("Invalid day of week");
    expect(body.message).toContain("0-6");
  });
});

// ---------------------------------------------------------------------------
// validateTimeRange
// ---------------------------------------------------------------------------

describe("validateTimeRange", () => {
  it("accepts end strictly after start", () => {
    expect(validateTimeRange("09:00", "17:00")).toBeNull();
  });

  it("accepts a one-minute window", () => {
    expect(validateTimeRange("09:00", "09:01")).toBeNull();
  });

  it("rejects end equal to start (zero-length window)", async () => {
    const response = validateTimeRange("09:00", "09:00");
    expect(response?.status).toBe(400);
    const body = await response?.json();
    expect(body.message).toContain("must be after start time");
  });

  it("rejects end before start", () => {
    const response = validateTimeRange("17:00", "09:00");
    expect(response?.status).toBe(400);
  });

  it("propagates start-time format error", async () => {
    const response = validateTimeRange("9:00", "17:00");
    expect(response?.status).toBe(400);
    const body = await response?.json();
    expect(body.message).toContain("Invalid time format");
    // Error must reference the bad start, not the end.
    expect(body.message).toContain("9:00");
  });

  it("propagates end-time format error", async () => {
    const response = validateTimeRange("09:00", "25:00");
    expect(response?.status).toBe(400);
    const body = await response?.json();
    expect(body.message).toContain("Invalid time format");
    expect(body.message).toContain("25:00");
  });

  it("checks start format BEFORE end format (start error wins)", async () => {
    const response = validateTimeRange("bad-start", "bad-end");
    const body = await response?.json();
    expect(body.message).toContain("bad-start");
    expect(body.message).not.toContain("bad-end");
  });
});

// ---------------------------------------------------------------------------
// validateEffectiveDates
// ---------------------------------------------------------------------------

describe("validateEffectiveDates", () => {
  // The function normalizes Dates to *local* midnight via `setHours(0,0,0,0)`.
  // Construct dates with the local-time `Date(year, monthIndex, day, hour)`
  // form so the test is deterministic regardless of the runner's TZ.
  beforeEach(() => {
    vi.useFakeTimers();
    // Pin "today" to local 2026-06-15 14:00.
    vi.setSystemTime(new Date(2026, 5, 15, 14, 0, 0, 0));
  });

  it("accepts today (start-of-day)", () => {
    const today = new Date(2026, 5, 15, 0, 0, 0, 0);
    expect(validateEffectiveDates(today, null)).toBeNull();
  });

  it("accepts a future from-date with null until", () => {
    const future = new Date(2026, 11, 1, 0, 0, 0, 0);
    expect(validateEffectiveDates(future, null)).toBeNull();
  });

  it("accepts equal from and until (single-day window)", () => {
    const same = new Date(2026, 6, 1, 0, 0, 0, 0);
    expect(validateEffectiveDates(same, same)).toBeNull();
  });

  it("accepts until strictly after from", () => {
    const from = new Date(2026, 6, 1, 0, 0, 0, 0);
    const until = new Date(2026, 11, 31, 0, 0, 0, 0);
    expect(validateEffectiveDates(from, until)).toBeNull();
  });

  it("rejects from in the past (yesterday)", async () => {
    const yesterday = new Date(2026, 5, 14, 0, 0, 0, 0);
    const response = validateEffectiveDates(yesterday, null);
    expect(response?.status).toBe(400);
    const body = await response?.json();
    expect(body.message).toContain("cannot be in the past");
  });

  it("rejects until before from", async () => {
    const from = new Date(2026, 6, 1, 0, 0, 0, 0);
    const until = new Date(2026, 5, 30, 0, 0, 0, 0);
    const response = validateEffectiveDates(from, until);
    expect(response?.status).toBe(400);
    const body = await response?.json();
    expect(body.message).toContain("on or after effective from");
  });

  it("ignores time-of-day when comparing to today (4PM today is not 'past')", () => {
    // The function normalizes both sides to midnight, so a 13:00 same-day
    // from-date should still be accepted even though the system clock is 14:00.
    const sameDayMorning = new Date(2026, 5, 15, 13, 0, 0, 0);
    expect(validateEffectiveDates(sameDayMorning, null)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// checkOverlappingAvailability
// ---------------------------------------------------------------------------

describe("checkOverlappingAvailability", () => {
  const future = new Date("2030-01-01T00:00:00.000Z");
  const farFuture = new Date("2030-12-31T00:00:00.000Z");

  it("returns hasOverlap=false when DB returns no rows", async () => {
    queryRawMock.mockResolvedValueOnce([]);
    const result = await checkOverlappingAvailability(
      TENANT_ID,
      EMPLOYEE_ID,
      1 as DayOfWeek,
      "09:00",
      "17:00",
      future,
      null
    );
    expect(result.hasOverlap).toBe(false);
    expect(result.overlappingAvailability).toEqual([]);
    expect(queryRawMock).toHaveBeenCalledTimes(1);
  });

  it("returns hasOverlap=true when DB row's time window overlaps", async () => {
    queryRawMock.mockResolvedValueOnce([
      {
        id: "avail-existing",
        day_of_week: 1,
        start_time: "08:00:00",
        end_time: "12:00:00",
        effective_from: future,
        effective_until: null,
      },
    ]);
    const result = await checkOverlappingAvailability(
      TENANT_ID,
      EMPLOYEE_ID,
      1 as DayOfWeek,
      "10:00", // overlaps existing 08:00-12:00 by two hours
      "14:00",
      future,
      null
    );
    expect(result.hasOverlap).toBe(true);
    expect(result.overlappingAvailability).toHaveLength(1);
    expect(result.overlappingAvailability[0].id).toBe("avail-existing");
  });

  it("returns hasOverlap=false when DB row's date window matches but time is disjoint", async () => {
    // SQL pre-filtered on day_of_week + date range, but new shift starts AFTER existing ends.
    queryRawMock.mockResolvedValueOnce([
      {
        id: "avail-morning",
        day_of_week: 1,
        start_time: "06:00:00",
        end_time: "09:00:00",
        effective_from: future,
        effective_until: null,
      },
    ]);
    const result = await checkOverlappingAvailability(
      TENANT_ID,
      EMPLOYEE_ID,
      1 as DayOfWeek,
      "09:00", // BOUNDARY: starts exactly when existing ends → must NOT overlap
      "17:00",
      future,
      null
    );
    expect(result.hasOverlap).toBe(false);
  });

  it("treats touching boundary (new.end == existing.start) as non-overlapping", async () => {
    queryRawMock.mockResolvedValueOnce([
      {
        id: "avail-evening",
        day_of_week: 1,
        start_time: "17:00:00",
        end_time: "23:00:00",
        effective_from: future,
        effective_until: null,
      },
    ]);
    const result = await checkOverlappingAvailability(
      TENANT_ID,
      EMPLOYEE_ID,
      1 as DayOfWeek,
      "09:00",
      "17:00", // BOUNDARY: ends exactly when existing starts → must NOT overlap
      future,
      null
    );
    expect(result.hasOverlap).toBe(false);
  });

  it("filters multiple rows and only returns those whose times overlap", async () => {
    queryRawMock.mockResolvedValueOnce([
      // Disjoint: morning shift before our window
      {
        id: "avail-morning",
        day_of_week: 1,
        start_time: "06:00:00",
        end_time: "09:00:00",
        effective_from: future,
        effective_until: null,
      },
      // Overlapping: midday shift overlaps 12-13
      {
        id: "avail-midday",
        day_of_week: 1,
        start_time: "11:00:00",
        end_time: "13:00:00",
        effective_from: future,
        effective_until: null,
      },
      // Disjoint: evening shift starts after our window
      {
        id: "avail-evening",
        day_of_week: 1,
        start_time: "17:00:00",
        end_time: "23:00:00",
        effective_from: future,
        effective_until: null,
      },
    ]);
    const result = await checkOverlappingAvailability(
      TENANT_ID,
      EMPLOYEE_ID,
      1 as DayOfWeek,
      "09:00",
      "17:00",
      future,
      null
    );
    expect(result.hasOverlap).toBe(true);
    expect(result.overlappingAvailability).toHaveLength(1);
    expect(result.overlappingAvailability[0].id).toBe("avail-midday");
  });

  it("passes excludeAvailabilityId into the parameterized query (update path)", async () => {
    queryRawMock.mockResolvedValueOnce([]);
    await checkOverlappingAvailability(
      TENANT_ID,
      EMPLOYEE_ID,
      2 as DayOfWeek,
      "09:00",
      "17:00",
      future,
      farFuture,
      AVAILABILITY_ID
    );
    const queryArg = queryRawMock.mock.calls[0]?.[0];
    const bound = flattenSqlValues(queryArg);
    expect(bound).toContain(AVAILABILITY_ID);
    expect(bound).toContain(TENANT_ID);
    expect(bound).toContain(EMPLOYEE_ID);
  });

  it("does not bind excludeAvailabilityId when omitted (create path)", async () => {
    queryRawMock.mockResolvedValueOnce([]);
    await checkOverlappingAvailability(
      TENANT_ID,
      EMPLOYEE_ID,
      0 as DayOfWeek,
      "09:00",
      "17:00",
      future,
      null
    );
    const queryArg = queryRawMock.mock.calls[0]?.[0];
    const bound = flattenSqlValues(queryArg);
    // No availability ID should be in the bound parameters.
    expect(bound).not.toContain(AVAILABILITY_ID);
    // And the rendered SQL must not contain the exclude predicate.
    expect((queryArg as { sql: string }).sql).not.toContain("id !=");
  });

  it("binds effectiveFrom (twice) when effectiveUntil is null", async () => {
    queryRawMock.mockResolvedValueOnce([]);
    await checkOverlappingAvailability(
      TENANT_ID,
      EMPLOYEE_ID,
      0 as DayOfWeek,
      "09:00",
      "17:00",
      future,
      null
    );
    const queryArg = queryRawMock.mock.calls[0]?.[0];
    const bound = flattenSqlValues(queryArg);
    // The `(effectiveUntil || effectiveFrom)` ternary should fall back to
    // effectiveFrom, so the Date instance is bound at least twice (once for
    // each side of the date-range overlap predicate).
    const futureCount = bound.filter((v) => v === future).length;
    expect(futureCount).toBeGreaterThanOrEqual(2);
  });

  it("binds effectiveUntil when provided", async () => {
    queryRawMock.mockResolvedValueOnce([]);
    await checkOverlappingAvailability(
      TENANT_ID,
      EMPLOYEE_ID,
      0 as DayOfWeek,
      "09:00",
      "17:00",
      future,
      farFuture
    );
    const queryArg = queryRawMock.mock.calls[0]?.[0];
    const bound = flattenSqlValues(queryArg);
    expect(bound).toContain(farFuture);
    expect(bound).toContain(future);
  });

  it("returns DB-shaped overlap rows verbatim (id/day_of_week/start_time/end_time/effective_from/effective_until)", async () => {
    const row = {
      id: "row-id",
      day_of_week: 3,
      start_time: "10:00:00",
      end_time: "12:00:00",
      effective_from: future,
      effective_until: farFuture,
    };
    queryRawMock.mockResolvedValueOnce([row]);
    const result = await checkOverlappingAvailability(
      TENANT_ID,
      EMPLOYEE_ID,
      3 as DayOfWeek,
      "11:00",
      "13:00",
      future,
      null
    );
    expect(result.overlappingAvailability[0]).toEqual(row);
  });
});

// ---------------------------------------------------------------------------
// verifyEmployee
// ---------------------------------------------------------------------------

describe("verifyEmployee", () => {
  it("returns the employee row when found and active", async () => {
    queryRawMock.mockResolvedValueOnce([
      { id: EMPLOYEE_ID, role: "server", is_active: true },
    ]);
    const { employee, error } = await verifyEmployee(TENANT_ID, EMPLOYEE_ID);
    expect(error).toBeNull();
    expect(employee).toEqual({
      id: EMPLOYEE_ID,
      role: "server",
      is_active: true,
    });
  });

  it("returns 404 when no rows match", async () => {
    queryRawMock.mockResolvedValueOnce([]);
    const { employee, error } = await verifyEmployee(TENANT_ID, EMPLOYEE_ID);
    expect(employee).toBeNull();
    expect(error?.status).toBe(404);
    const body = await error?.json();
    expect(body.message).toBe("Employee not found");
  });

  it("returns 400 when the row exists but is_active=false", async () => {
    queryRawMock.mockResolvedValueOnce([
      { id: EMPLOYEE_ID, role: "server", is_active: false },
    ]);
    const { employee, error } = await verifyEmployee(TENANT_ID, EMPLOYEE_ID);
    expect(employee).toBeNull();
    expect(error?.status).toBe(400);
    const body = await error?.json();
    expect(body.message).toContain("inactive employee");
  });

  it("binds tenantId and employeeId into the query", async () => {
    queryRawMock.mockResolvedValueOnce([]);
    await verifyEmployee(TENANT_ID, EMPLOYEE_ID);
    const queryArg = queryRawMock.mock.calls[0]?.[0] as { sql: string };
    const bound = flattenSqlValues(queryArg);
    expect(bound).toContain(TENANT_ID);
    expect(bound).toContain(EMPLOYEE_ID);
    expect(queryArg.sql).toContain("tenant_staff.employees");
    expect(queryArg.sql).toContain("deleted_at IS NULL");
  });
});

// ---------------------------------------------------------------------------
// verifyAvailability
// ---------------------------------------------------------------------------

describe("verifyAvailability", () => {
  it("returns the availability row when found", async () => {
    queryRawMock.mockResolvedValueOnce([
      {
        id: AVAILABILITY_ID,
        employee_id: EMPLOYEE_ID,
        day_of_week: 2,
        effective_until: null,
      },
    ]);
    const { availability, error } = await verifyAvailability(
      TENANT_ID,
      AVAILABILITY_ID
    );
    expect(error).toBeNull();
    expect(availability).toEqual({
      id: AVAILABILITY_ID,
      employee_id: EMPLOYEE_ID,
      day_of_week: 2,
      effective_until: null,
    });
  });

  it("returns 404 when no rows match", async () => {
    queryRawMock.mockResolvedValueOnce([]);
    const { availability, error } = await verifyAvailability(
      TENANT_ID,
      AVAILABILITY_ID
    );
    expect(availability).toBeNull();
    expect(error?.status).toBe(404);
    const body = await error?.json();
    expect(body.message).toBe("Availability record not found");
  });

  it("filters out soft-deleted rows via deleted_at IS NULL", async () => {
    queryRawMock.mockResolvedValueOnce([]);
    await verifyAvailability(TENANT_ID, AVAILABILITY_ID);
    const queryArg = queryRawMock.mock.calls[0]?.[0] as { sql: string };
    expect(queryArg.sql).toContain("deleted_at IS NULL");
    expect(queryArg.sql).toContain("tenant_staff.employee_availability");
  });
});

// ---------------------------------------------------------------------------
// validateBatchAvailabilityInput
// ---------------------------------------------------------------------------

describe("validateBatchAvailabilityInput", () => {
  it("accepts a single valid pattern", () => {
    expect(
      validateBatchAvailabilityInput([
        { dayOfWeek: 1, startTime: "09:00", endTime: "17:00" },
      ])
    ).toBeNull();
  });

  it("accepts a full week with seven distinct days", () => {
    const week = [0, 1, 2, 3, 4, 5, 6].map((d) => ({
      dayOfWeek: d,
      startTime: "09:00",
      endTime: "17:00",
    }));
    expect(validateBatchAvailabilityInput(week)).toBeNull();
  });

  it("rejects an empty array with 400", async () => {
    const response = validateBatchAvailabilityInput([]);
    expect(response?.status).toBe(400);
    const body = await response?.json();
    expect(body.message).toContain("At least one availability pattern");
  });

  it("rejects null input with 400", () => {
    const response = validateBatchAvailabilityInput(
      null as unknown as Parameters<typeof validateBatchAvailabilityInput>[0]
    );
    expect(response?.status).toBe(400);
  });

  it("rejects duplicate days with a clear message", async () => {
    const response = validateBatchAvailabilityInput([
      { dayOfWeek: 1, startTime: "09:00", endTime: "12:00" },
      { dayOfWeek: 1, startTime: "13:00", endTime: "17:00" },
    ]);
    expect(response?.status).toBe(400);
    const body = await response?.json();
    expect(body.message).toContain("multiple availability patterns");
  });

  it("propagates an invalid dayOfWeek error from a single bad pattern", async () => {
    const response = validateBatchAvailabilityInput([
      { dayOfWeek: 1, startTime: "09:00", endTime: "17:00" },
      { dayOfWeek: 9, startTime: "09:00", endTime: "17:00" },
    ]);
    expect(response?.status).toBe(400);
    const body = await response?.json();
    expect(body.message).toContain("Invalid day of week");
  });

  it("propagates an invalid time-range error from a single bad pattern", async () => {
    const response = validateBatchAvailabilityInput([
      { dayOfWeek: 1, startTime: "17:00", endTime: "09:00" },
    ]);
    expect(response?.status).toBe(400);
    const body = await response?.json();
    expect(body.message).toContain("must be after start time");
  });

  it("propagates an invalid time-format error from a single bad pattern", async () => {
    const response = validateBatchAvailabilityInput([
      { dayOfWeek: 1, startTime: "9:00", endTime: "17:00" },
    ]);
    expect(response?.status).toBe(400);
    const body = await response?.json();
    expect(body.message).toContain("Invalid time format");
  });
});
