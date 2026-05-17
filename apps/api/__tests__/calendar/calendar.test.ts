/**
 * Calendar API Tests
 *
 * Tests for GET /api/calendar and PATCH /api/calendar/reschedule
 * covering authentication, validation, data fetching, error handling,
 * and individual query resilience.
 */

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PATCH } from "@/app/api/calendar/reschedule/route";
import { GET } from "@/app/api/calendar/route";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockEventFindMany = vi.fn();
const mockEventFindFirst = vi.fn();
const mockScheduleShiftFindMany = vi.fn();
const mockScheduleShiftFindFirst = vi.fn();
const mockScheduleShiftUpdate = vi.fn();
const mockEventUpdate = vi.fn();

vi.mock("@repo/database", () => ({
  database: {
    event: {
      findMany: (...args: unknown[]) => mockEventFindMany(...args),
      findFirst: (...args: unknown[]) => mockEventFindFirst(...args),
      update: (...args: unknown[]) => mockEventUpdate(...args),
    },
    scheduleShift: {
      findMany: (...args: unknown[]) => mockScheduleShiftFindMany(...args),
      findFirst: (...args: unknown[]) => mockScheduleShiftFindFirst(...args),
      update: (...args: unknown[]) => mockScheduleShiftUpdate(...args),
    },
    timeOffRequest: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({ getTenantIdForOrg: vi.fn() }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

// ---------------------------------------------------------------------------
// Imported mocks
// ---------------------------------------------------------------------------

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg } = await import("@/app/lib/tenant");
const { database } = await import("@repo/database");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TEST_TENANT_ID = "00000000-0000-0000-0000-000000000020";
const TEST_USER_ID = "user_calendar_test";
const TEST_ORG_ID = "org_calendar_test";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAuthedUser() {
  vi.mocked(auth).mockResolvedValue({
    userId: TEST_USER_ID,
    orgId: TEST_ORG_ID,
  } as never);
  vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
}

function makeGetRequest(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  return new NextRequest(`http://localhost/api/calendar?${qs}`);
}

function makePatchRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/calendar/reschedule", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makeDbEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: "evt-1",
    title: "Team Meeting",
    eventDate: new Date("2026-05-10"),
    eventType: "corporate",
    status: "confirmed",
    venueName: "Main Hall",
    guestCount: 50,
    ...overrides,
  };
}

function makeDbShift(overrides: Record<string, unknown> = {}) {
  return {
    id: "shift-1",
    tenantId: TEST_TENANT_ID,
    shift_start: new Date("2026-05-10T08:00:00Z"),
    shift_end: new Date("2026-05-10T16:00:00Z"),
    role_during_shift: "Server",
    employeeId: "emp-1",
    deletedAt: null,
    ...overrides,
  };
}

function makeDbTimeOff(overrides: Record<string, unknown> = {}) {
  return {
    id: "toff-1",
    start_date: new Date("2026-05-10"),
    end_date: new Date("2026-05-12"),
    reason: "Vacation",
    status: "approved",
    request_type: "vacation",
    employee_id: "emp-001",
    tenant_id: "tenant-calendar-test",
    created_at: new Date("2026-05-01"),
    updated_at: new Date("2026-05-01"),
    deleted_at: null,
    approved_by: null,
    rejection_reason: null,
    ...overrides,
  } as never;
}

// ===========================================================================
// GET /api/calendar
// ===========================================================================

describe("GET /api/calendar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    makeAuthedUser();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ----- Auth & tenant -----

  it("should return 401 when auth fails", async () => {
    vi.mocked(auth).mockRejectedValue(new Error("Auth error") as never);

    const req = makeGetRequest({
      start: "2026-05-01",
      end: "2026-05-31",
    });
    const res = await GET(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Authentication failed");
  });

  it("should return 401 when orgId is missing", async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: TEST_USER_ID,
      orgId: null,
    } as never);

    const req = makeGetRequest({
      start: "2026-05-01",
      end: "2026-05-31",
    });
    const res = await GET(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("should return 500 when tenant resolution fails", async () => {
    vi.mocked(getTenantIdForOrg).mockRejectedValue(
      new Error("Tenant error") as never
    );

    const req = makeGetRequest({
      start: "2026-05-01",
      end: "2026-05-31",
    });
    const res = await GET(req);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to resolve organization");
  });

  // ----- Parameter validation -----

  it("should return 400 when start param is missing", async () => {
    const req = makeGetRequest({ end: "2026-05-31" });
    const res = await GET(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Missing start or end parameter");
  });

  it("should return 400 when end param is missing", async () => {
    const req = makeGetRequest({ start: "2026-05-01" });
    const res = await GET(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Missing start or end parameter");
  });

  it("should return 400 when both start and end are missing", async () => {
    const req = makeGetRequest({});
    const res = await GET(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Missing start or end parameter");
  });

  it("should return 400 for invalid start date format", async () => {
    const req = makeGetRequest({
      start: "not-a-date",
      end: "2026-05-31",
    });
    const res = await GET(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid date format. Use ISO 8601.");
  });

  it("should return 400 for invalid end date format", async () => {
    const req = makeGetRequest({
      start: "2026-05-01",
      end: "garbage",
    });
    const res = await GET(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid date format. Use ISO 8601.");
  });

  // ----- Successful fetches -----

  it("should return events from database.event.findMany", async () => {
    mockEventFindMany.mockResolvedValue([
      makeDbEvent({ id: "evt-1", title: "Conference" }),
    ]);
    mockScheduleShiftFindMany.mockResolvedValue([]);
    vi.mocked(database.timeOffRequest.findMany).mockResolvedValue([]);

    const req = makeGetRequest({
      start: "2026-05-01",
      end: "2026-05-31",
    });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.events).toHaveLength(1);
    expect(body.events[0].id).toBe("evt-1");
    expect(body.events[0].title).toBe("Conference");
    expect(body.events[0].type).toBe("event");
  });

  it("should map event fields correctly", async () => {
    const dbEvt = makeDbEvent({
      id: "evt-2",
      title: "Wedding",
      eventDate: new Date("2026-06-15"),
      eventType: "wedding",
      status: "confirmed",
      venueName: "Garden",
      guestCount: 120,
    });
    mockEventFindMany.mockResolvedValue([dbEvt]);
    mockScheduleShiftFindMany.mockResolvedValue([]);
    vi.mocked(database.timeOffRequest.findMany).mockResolvedValue([]);

    const req = makeGetRequest({
      start: "2026-06-01",
      end: "2026-06-30",
    });
    const res = await GET(req);
    const body = await res.json();

    const evt = body.events[0];
    expect(evt.id).toBe("evt-2");
    expect(evt.title).toBe("Wedding");
    expect(evt.start).toBe(dbEvt.eventDate.toISOString());
    expect(evt.type).toBe("event");
    expect(evt.status).toBe("confirmed");
    expect(evt.location).toBe("Garden");
    expect(evt.guestCount).toBe(120);
    expect(evt.details).toBe("Type: wedding");
  });

  it("should use eventType fallback when title is null", async () => {
    mockEventFindMany.mockResolvedValue([
      makeDbEvent({ title: null, eventType: "birthday" }),
    ]);
    mockScheduleShiftFindMany.mockResolvedValue([]);
    vi.mocked(database.timeOffRequest.findMany).mockResolvedValue([]);

    const req = makeGetRequest({
      start: "2026-05-01",
      end: "2026-05-31",
    });
    const res = await GET(req);
    const body = await res.json();

    expect(body.events[0].title).toBe("birthday Event");
  });

  it("should return shifts from database.scheduleShift.findMany", async () => {
    mockEventFindMany.mockResolvedValue([]);
    mockScheduleShiftFindMany.mockResolvedValue([makeDbShift()]);
    vi.mocked(database.timeOffRequest.findMany).mockResolvedValue([]);

    const req = makeGetRequest({
      start: "2026-05-01",
      end: "2026-05-31",
    });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.events).toHaveLength(1);
    expect(body.events[0].type).toBe("shift");
    expect(body.events[0].title).toBe("Shift: Server");
    expect(body.events[0].start).toBe("2026-05-10T08:00:00.000Z");
    expect(body.events[0].end).toBe("2026-05-10T16:00:00.000Z");
  });

  it("should return time-off requests from database.timeOffRequest.findMany", async () => {
    mockEventFindMany.mockResolvedValue([]);
    mockScheduleShiftFindMany.mockResolvedValue([]);
    vi.mocked(database.timeOffRequest.findMany).mockResolvedValue([
      makeDbTimeOff(),
    ]);

    const req = makeGetRequest({
      start: "2026-05-01",
      end: "2026-05-31",
    });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.events).toHaveLength(1);
    expect(body.events[0].type).toBe("timeoff");
    expect(body.events[0].title).toBe("vacation");
    expect(body.events[0].status).toBe("approved");
    expect(body.events[0].details).toBe("Vacation");
  });

  it("should combine events, shifts, and time-off into single array", async () => {
    mockEventFindMany.mockResolvedValue([makeDbEvent({ id: "e1" })]);
    mockScheduleShiftFindMany.mockResolvedValue([makeDbShift({ id: "s1" })]);
    vi.mocked(database.timeOffRequest.findMany).mockResolvedValue([
      makeDbTimeOff({ id: "t1" }),
    ]);

    const req = makeGetRequest({
      start: "2026-05-01",
      end: "2026-05-31",
    });
    const res = await GET(req);
    const body = await res.json();

    expect(body.events).toHaveLength(3);
    const types = body.events.map((e: { type: string }) => e.type);
    expect(types).toContain("event");
    expect(types).toContain("shift");
    expect(types).toContain("timeoff");
  });

  // ----- Types filter -----

  it("should filter to only events when types=event", async () => {
    mockEventFindMany.mockResolvedValue([makeDbEvent()]);

    const req = makeGetRequest({
      start: "2026-05-01",
      end: "2026-05-31",
      types: "event",
    });
    const res = await GET(req);
    const body = await res.json();

    expect(body.events).toHaveLength(1);
    expect(body.events[0].type).toBe("event");
    expect(mockScheduleShiftFindMany).not.toHaveBeenCalled();
  });

  it("should filter to only shifts when types=shift", async () => {
    mockScheduleShiftFindMany.mockResolvedValue([makeDbShift()]);

    const req = makeGetRequest({
      start: "2026-05-01",
      end: "2026-05-31",
      types: "shift",
    });
    const res = await GET(req);
    const body = await res.json();

    expect(body.events).toHaveLength(1);
    expect(body.events[0].type).toBe("shift");
    expect(mockEventFindMany).not.toHaveBeenCalled();
  });

  it("should default types to all when not provided", async () => {
    mockEventFindMany.mockResolvedValue([]);
    mockScheduleShiftFindMany.mockResolvedValue([]);
    vi.mocked(database.timeOffRequest.findMany).mockResolvedValue([]);

    const req = makeGetRequest({
      start: "2026-05-01",
      end: "2026-05-31",
    });
    await GET(req);

    expect(mockEventFindMany).toHaveBeenCalled();
    expect(mockScheduleShiftFindMany).toHaveBeenCalled();
    expect(database.timeOffRequest.findMany).toHaveBeenCalled();
  });

  // ----- Individual query resilience -----

  it("should continue if event query fails", async () => {
    mockEventFindMany.mockRejectedValue(new Error("DB down"));
    mockScheduleShiftFindMany.mockResolvedValue([makeDbShift()]);
    vi.mocked(database.timeOffRequest.findMany).mockResolvedValue([]);

    const req = makeGetRequest({
      start: "2026-05-01",
      end: "2026-05-31",
    });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.events).toHaveLength(1);
    expect(body.events[0].type).toBe("shift");
  });

  it("should continue if shift query fails", async () => {
    mockEventFindMany.mockResolvedValue([makeDbEvent()]);
    mockScheduleShiftFindMany.mockRejectedValue(new Error("Shift DB down"));
    vi.mocked(database.timeOffRequest.findMany).mockResolvedValue([]);

    const req = makeGetRequest({
      start: "2026-05-01",
      end: "2026-05-31",
    });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.events).toHaveLength(1);
    expect(body.events[0].type).toBe("event");
  });

  it("should continue if time-off query fails", async () => {
    mockEventFindMany.mockResolvedValue([]);
    mockScheduleShiftFindMany.mockResolvedValue([makeDbShift()]);
    vi.mocked(database.timeOffRequest.findMany).mockRejectedValue(
      new Error("TimeOff DB down")
    );

    const req = makeGetRequest({
      start: "2026-05-01",
      end: "2026-05-31",
    });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.events).toHaveLength(1);
    expect(body.events[0].type).toBe("shift");
  });

  // ----- Empty results -----

  it("should return empty events array when no data matches", async () => {
    mockEventFindMany.mockResolvedValue([]);
    mockScheduleShiftFindMany.mockResolvedValue([]);
    vi.mocked(database.timeOffRequest.findMany).mockResolvedValue([]);

    const req = makeGetRequest({
      start: "2026-05-01",
      end: "2026-05-31",
    });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.events).toEqual([]);
  });

  // ----- Outer catch -----

  it("should return 500 on unexpected outer error", async () => {
    // Trigger the outer catch by making request.nextUrl throw (after auth/tenant succeed)
    const badRequest = {
      nextUrl: {
        searchParams: {
          get: () => {
            throw new Error("Unexpected URL error");
          },
        },
      },
    } as unknown as NextRequest;

    const res = await GET(badRequest);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to fetch calendar data");
  });

  // ----- Query parameter passing -----

  it("should pass tenantId and date range to event.findMany", async () => {
    mockEventFindMany.mockResolvedValue([]);
    mockScheduleShiftFindMany.mockResolvedValue([]);
    vi.mocked(database.timeOffRequest.findMany).mockResolvedValue([]);

    const req = makeGetRequest({
      start: "2026-05-01T00:00:00Z",
      end: "2026-05-31T23:59:59Z",
      types: "event",
    });
    await GET(req);

    expect(mockEventFindMany).toHaveBeenCalledTimes(1);
    const call = mockEventFindMany.mock.calls[0][0];
    expect(call.where.tenantId).toBe(TEST_TENANT_ID);
    expect(call.where.deletedAt).toBeNull();
    expect(call.where.eventDate.gte).toBeInstanceOf(Date);
    expect(call.where.eventDate.lte).toBeInstanceOf(Date);
  });
});

// ===========================================================================
// PATCH /api/calendar/reschedule
// ===========================================================================

describe("PATCH /api/calendar/reschedule", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    makeAuthedUser();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ----- Auth -----

  it("should return 401 when orgId is missing", async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: TEST_USER_ID,
      orgId: null,
    } as never);

    const req = makePatchRequest({
      eventId: "evt-1",
      eventType: "event",
      newDate: "2026-06-15",
    });
    const res = await PATCH(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("should return 400 when tenant not found", async () => {
    vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

    const req = makePatchRequest({
      eventId: "evt-1",
      eventType: "event",
      newDate: "2026-06-15",
    });
    const res = await PATCH(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Tenant not found");
  });

  // ----- Body validation -----

  it("should return 400 when eventId is missing", async () => {
    const req = makePatchRequest({
      eventType: "event",
      newDate: "2026-06-15",
    });
    const res = await PATCH(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe(
      "Missing required fields: eventId, eventType, newDate"
    );
  });

  it("should return 400 when eventType is missing", async () => {
    const req = makePatchRequest({
      eventId: "evt-1",
      newDate: "2026-06-15",
    });
    const res = await PATCH(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe(
      "Missing required fields: eventId, eventType, newDate"
    );
  });

  it("should return 400 when newDate is missing", async () => {
    const req = makePatchRequest({
      eventId: "evt-1",
      eventType: "event",
    });
    const res = await PATCH(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe(
      "Missing required fields: eventId, eventType, newDate"
    );
  });

  it("should return 400 for invalid eventType", async () => {
    const req = makePatchRequest({
      eventId: "evt-1",
      eventType: "deadline",
      newDate: "2026-06-15",
    });
    const res = await PATCH(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid eventType. Must be 'event' or 'shift'");
  });

  // ----- Reschedule event -----

  it("should reschedule an event and return updated event", async () => {
    const updatedEvent = {
      id: "evt-1",
      tenantId: TEST_TENANT_ID,
      eventDate: new Date("2026-06-15").toISOString(),
      title: "Conference",
    };
    mockEventFindFirst.mockResolvedValue({
      id: "evt-1",
      status: "confirmed",
    });
    mockEventUpdate.mockResolvedValue({
      id: "evt-1",
      tenantId: TEST_TENANT_ID,
      eventDate: new Date("2026-06-15"),
      title: "Conference",
    });

    const req = makePatchRequest({
      eventId: "evt-1",
      eventType: "event",
      newDate: "2026-06-15",
    });
    const res = await PATCH(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.event.id).toBe("evt-1");
    expect(body.event.title).toBe("Conference");
  });

  it("should use compound key tenantId_id for event update", async () => {
    mockEventFindFirst.mockResolvedValue({
      id: "evt-1",
      status: "confirmed",
    });
    mockEventUpdate.mockResolvedValue({ id: "evt-1" });

    const req = makePatchRequest({
      eventId: "evt-1",
      eventType: "event",
      newDate: "2026-06-15",
    });
    await PATCH(req);

    expect(mockEventUpdate).toHaveBeenCalledTimes(1);
    const call = mockEventUpdate.mock.calls[0][0];
    expect(call.where.tenantId_id).toEqual({
      tenantId: TEST_TENANT_ID,
      id: "evt-1",
    });
    expect(call.data.eventDate).toBeInstanceOf(Date);
  });

  // ----- Reschedule shift -----

  it("should reschedule a shift preserving duration", async () => {
    const existingShift = makeDbShift({
      shift_start: new Date("2026-05-10T09:00:00Z"),
      shift_end: new Date("2026-05-10T17:00:00Z"),
    });
    mockScheduleShiftFindFirst.mockResolvedValue(existingShift);
    mockScheduleShiftUpdate.mockResolvedValue({
      ...existingShift,
      shift_start: new Date("2026-06-15T09:00:00Z"),
      shift_end: new Date("2026-06-15T17:00:00Z"),
    });

    const req = makePatchRequest({
      eventId: "shift-1",
      eventType: "shift",
      newDate: "2026-06-15",
    });
    const res = await PATCH(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.shift).toBeDefined();
  });

  it("should preserve original time-of-day when rescheduling shift", async () => {
    const existingShift = makeDbShift({
      shift_start: new Date("2026-05-10T14:30:00Z"),
      shift_end: new Date("2026-05-10T22:30:00Z"),
    });
    mockScheduleShiftFindFirst.mockResolvedValue(existingShift);
    mockScheduleShiftUpdate.mockImplementation(
      (args: Record<string, unknown>) =>
        Promise.resolve({
          ...existingShift,
          ...(args.data as Record<string, unknown>),
        })
    );

    const req = makePatchRequest({
      eventId: "shift-1",
      eventType: "shift",
      newDate: "2026-06-20",
    });
    await PATCH(req);

    expect(mockScheduleShiftUpdate).toHaveBeenCalledTimes(1);
    const updateCall = mockScheduleShiftUpdate.mock.calls[0][0];
    const newStart = updateCall.data.shift_start as Date;
    const newEnd = updateCall.data.shift_end as Date;

    // Duration should be preserved: 8 hours (28800000ms)
    const originalDuration =
      existingShift.shift_end.getTime() - existingShift.shift_start.getTime();
    expect(newEnd.getTime() - newStart.getTime()).toBe(originalDuration);

    // Time-of-day components (hours/minutes/seconds) should be preserved
    // via setHours/getHours (local time) matching the original shift
    expect(newStart.getHours()).toBe(existingShift.shift_start.getHours());
    expect(newStart.getMinutes()).toBe(existingShift.shift_start.getMinutes());
    expect(newStart.getSeconds()).toBe(existingShift.shift_start.getSeconds());
  });

  it("should return 404 when shift not found", async () => {
    mockScheduleShiftFindFirst.mockResolvedValue(null);

    const req = makePatchRequest({
      eventId: "nonexistent",
      eventType: "shift",
      newDate: "2026-06-15",
    });
    const res = await PATCH(req);

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Shift not found");
  });

  it("should use compound key tenantId_id for shift update", async () => {
    const existingShift = makeDbShift();
    mockScheduleShiftFindFirst.mockResolvedValue(existingShift);
    mockScheduleShiftUpdate.mockResolvedValue(existingShift);

    const req = makePatchRequest({
      eventId: "shift-1",
      eventType: "shift",
      newDate: "2026-06-15",
    });
    await PATCH(req);

    expect(mockScheduleShiftUpdate).toHaveBeenCalledTimes(1);
    const call = mockScheduleShiftUpdate.mock.calls[0][0];
    expect(call.where.tenantId_id).toEqual({
      tenantId: TEST_TENANT_ID,
      id: "shift-1",
    });
  });

  // ----- Error handling -----

  it("should return 500 on unexpected error", async () => {
    mockEventFindFirst.mockResolvedValue({
      id: "evt-1",
      status: "confirmed",
    });
    mockEventUpdate.mockRejectedValue(new Error("DB crash") as never);

    const req = makePatchRequest({
      eventId: "evt-1",
      eventType: "event",
      newDate: "2026-06-15",
    });
    const res = await PATCH(req);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to reschedule event");
  });

  it("should return 500 when shift update fails", async () => {
    const existingShift = makeDbShift();
    mockScheduleShiftFindFirst.mockResolvedValue(existingShift);
    mockScheduleShiftUpdate.mockRejectedValue(new Error("DB crash") as never);

    const req = makePatchRequest({
      eventId: "shift-1",
      eventType: "shift",
      newDate: "2026-06-15",
    });
    const res = await PATCH(req);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to reschedule event");
  });

  // ----- Reschedule validation (status checks) -----

  it("should return 400 when rescheduling a cancelled event", async () => {
    mockEventFindFirst.mockResolvedValue({
      id: "evt-1",
      status: "cancelled",
    });

    const req = makePatchRequest({
      eventId: "evt-1",
      eventType: "event",
      newDate: "2026-06-15",
    });
    const res = await PATCH(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Cannot reschedule a cancelled event");
    expect(mockEventUpdate).not.toHaveBeenCalled();
  });

  it("should return 400 when rescheduling a completed event", async () => {
    mockEventFindFirst.mockResolvedValue({
      id: "evt-1",
      status: "completed",
    });

    const req = makePatchRequest({
      eventId: "evt-1",
      eventType: "event",
      newDate: "2026-06-15",
    });
    const res = await PATCH(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Cannot reschedule a completed event");
    expect(mockEventUpdate).not.toHaveBeenCalled();
  });

  it("should return 404 when event not found", async () => {
    mockEventFindFirst.mockResolvedValue(null);

    const req = makePatchRequest({
      eventId: "evt-nonexistent",
      eventType: "event",
      newDate: "2026-06-15",
    });
    const res = await PATCH(req);

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Event not found");
  });

  it("should return 400 for invalid date format", async () => {
    const req = makePatchRequest({
      eventId: "evt-1",
      eventType: "event",
      newDate: "not-a-date",
    });
    const res = await PATCH(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid date format for newDate");
  });

  it("should return 400 for past date", async () => {
    const req = makePatchRequest({
      eventId: "evt-1",
      eventType: "event",
      newDate: "2020-01-01",
    });
    const res = await PATCH(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Cannot reschedule to a past date");
  });
});
