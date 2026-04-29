/**
 * Timecards API Integration Tests
 *
 * Tests verify the time entry list/detail, clock-in/clock-out commands,
 * edit request list/approve/reject, and time-off request list/approve/reject
 * endpoints with authentication, authorization, and error handling.
 */

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// vi.mock factories are hoisted above imports, so we use vi.hoisted() to
// create the mock database and model stubs at hoist time.
// ---------------------------------------------------------------------------
const { modelStubs, mockDatabase } = vi.hoisted(() => {
  function createModelStub() {
    return {
      findMany: vi.fn(() => Promise.resolve([])),
      findFirst: vi.fn(() => Promise.resolve(null)),
      create: vi.fn(() => Promise.resolve({})),
      update: vi.fn(() => Promise.resolve({})),
      updateMany: vi.fn(() => Promise.resolve({ count: 0 })),
      delete: vi.fn(() => Promise.resolve({})),
      deleteMany: vi.fn(() => Promise.resolve({ count: 0 })),
    };
  }

  const stubs: Record<string, ReturnType<typeof createModelStub>> = {};

  const db: Record<string, ReturnType<typeof createModelStub>> = new Proxy(
    {} as Record<string, ReturnType<typeof createModelStub>>,
    {
      get(_target, prop: string) {
        if (!stubs[prop]) {
          stubs[prop] = createModelStub();
        }
        return stubs[prop];
      },
    },
  );

  return { modelStubs: stubs, mockDatabase: db };
});

vi.mock("@repo/database", () => ({
  database: mockDatabase,
  Prisma: {
    sql: (strings: TemplateStringsArray, ...values: unknown[]) =>
      ({ strings, values }),
    empty: { strings: [""], values: [] },
    raw: (s: string) => s,
  },
}));

vi.mock("@/lib/database", () => ({
  get database() {
    return mockDatabase;
  },
}));

// Mock other external dependencies
vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
}));
vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));
vi.mock("@/lib/manifest-command-handler", () => ({
  executeManifestCommand: vi.fn(),
}));

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg } = await import("@/app/lib/tenant");
const { createManifestRuntime } = await import("@/lib/manifest-runtime");

// Route imports (after mocks are set up)
import { GET as listTimeEntries } from "@/app/api/timecards/entries/list/route";
import { GET as getTimeEntry } from "@/app/api/timecards/entries/[id]/route";
import { POST as clockIn } from "@/app/api/timecards/entries/commands/clock-in/route";
import { POST as clockOut } from "@/app/api/timecards/entries/commands/clock-out/route";
import { POST as addEntry } from "@/app/api/timecards/entries/commands/add-entry/route";
import { GET as listEditRequests } from "@/app/api/timecards/edit-requests/list/route";
import { GET as getEditRequest } from "@/app/api/timecards/edit-requests/[id]/route";
import { POST as approveEditRequest } from "@/app/api/timecards/edit-requests/commands/approve/route";
import { POST as rejectEditRequest } from "@/app/api/timecards/edit-requests/commands/reject/route";
import { GET as listTimeOffRequests } from "@/app/api/timecards/time-off-requests/list/route";
import { GET as getTimeOffRequest } from "@/app/api/timecards/time-off-requests/[id]/route";
import { POST as approveTimeOff } from "@/app/api/timecards/time-off-requests/commands/approve/route";
import { POST as rejectTimeOff } from "@/app/api/timecards/time-off-requests/commands/reject/route";

// Convenience accessors through the Proxy (auto-creates stubs on first access)
const db = {
  get timeEntry() { return mockDatabase.timeEntry; },
  get timecardEditRequest() { return mockDatabase.timecardEditRequest; },
  get employeeTimeOffRequest() { return mockDatabase.employeeTimeOffRequest; },
  get user() { return mockDatabase.user; },
};

const TEST_TENANT_ID = "00000000-0000-0000-0000-000000000001";
const TEST_USER_ID = "user_timecards_test";
const TEST_ORG_ID = "org_timecards_test";

function createMockTimeEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: "entry-001",
    tenantId: TEST_TENANT_ID,
    employeeId: "emp-001",
    clockIn: new Date("2026-04-28T09:00:00Z"),
    clockOut: new Date("2026-04-28T17:00:00Z"),
    breakMinutes: 30,
    notes: null,
    locationId: null,
    shiftId: null,
    approvedBy: null,
    approvedAt: null,
    deleted_at: null,
    createdAt: new Date("2026-04-28T09:00:00Z"),
    updatedAt: new Date("2026-04-28T17:00:00Z"),
    ...overrides,
  };
}

function createMockEditRequest(overrides: Record<string, unknown> = {}) {
  return {
    id: "edit-001",
    tenantId: TEST_TENANT_ID,
    timeEntryId: "entry-001",
    employeeId: "emp-001",
    requestedClockIn: new Date("2026-04-28T08:00:00Z"),
    requestedClockOut: new Date("2026-04-28T16:00:00Z"),
    requestedBreakMinutes: 30,
    reason: "Forgot to clock in on time",
    status: "pending",
    createdAt: new Date("2026-04-28T18:00:00Z"),
    updatedAt: new Date("2026-04-28T18:00:00Z"),
    ...overrides,
  };
}

function createMockTimeOffRequest(overrides: Record<string, unknown> = {}) {
  return {
    id: "tor-001",
    tenant_id: TEST_TENANT_ID,
    employeeId: "emp-001",
    type: "vacation",
    startDate: new Date("2026-05-01"),
    endDate: new Date("2026-05-03"),
    reason: "Family event",
    status: "pending",
    approvedBy: null,
    approvedAt: null,
    deleted_at: null,
    created_at: new Date("2026-04-28T10:00:00Z"),
    updated_at: new Date("2026-04-28T10:00:00Z"),
    ...overrides,
  };
}

function createMockUser(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_USER_ID,
    tenantId: TEST_TENANT_ID,
    role: "admin",
    authUserId: "clerk-timecard-test",
    ...overrides,
  };
}

describe("Timecards API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      userId: TEST_USER_ID,
      orgId: TEST_ORG_ID,
    } as never);
    vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================ TIME ENTRY LIST
  describe("GET /api/timecards/entries/list", () => {
    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const request = new NextRequest(
        "http://localhost/api/timecards/entries/list",
      );
      const response = await listTimeEntries(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Unauthorized");
    });

    it("should return 400 when tenant not found", async () => {
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const request = new NextRequest(
        "http://localhost/api/timecards/entries/list",
      );
      const response = await listTimeEntries(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Tenant not found");
    });

    it("should return time entries for authenticated user", async () => {
      const mockEntries = [
        createMockTimeEntry({ id: "entry-1" }),
        createMockTimeEntry({
          id: "entry-2",
          clockIn: new Date("2026-04-29T09:00:00Z"),
          clockOut: new Date("2026-04-29T17:00:00Z"),
        }),
      ];

      db.timeEntry.findMany.mockResolvedValue(mockEntries as never);

      const request = new NextRequest(
        "http://localhost/api/timecards/entries/list",
      );
      const response = await listTimeEntries(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.timeEntrys).toHaveLength(2);
    });

    it("should filter by tenantId and exclude soft-deleted", async () => {
      db.timeEntry.findMany.mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost/api/timecards/entries/list",
      );
      await listTimeEntries(request);

      expect(db.timeEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: TEST_TENANT_ID,
            deleted_at: null,
          },
        }),
      );
    });

    it("should order results by createdAt descending", async () => {
      db.timeEntry.findMany.mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost/api/timecards/entries/list",
      );
      await listTimeEntries(request);

      expect(db.timeEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: "desc" },
        }),
      );
    });

    it("should return empty array when no entries exist", async () => {
      db.timeEntry.findMany.mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost/api/timecards/entries/list",
      );
      const response = await listTimeEntries(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.timeEntrys).toHaveLength(0);
    });

    it("should return 500 on database error", async () => {
      db.timeEntry.findMany.mockRejectedValue(
        new Error("Database connection failed"),
      );

      const request = new NextRequest(
        "http://localhost/api/timecards/entries/list",
      );
      const response = await listTimeEntries(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Internal server error");
    });
  });

  // ============================================ TIME ENTRY DETAIL
  describe("GET /api/timecards/entries/[id]", () => {
    it("should return a single time entry by ID", async () => {
      const mockEntry = createMockTimeEntry({ id: "entry-001" });

      db.timeEntry.findFirst.mockResolvedValue(mockEntry as never);

      const request = new NextRequest(
        "http://localhost/api/timecards/entries/entry-001",
      );
      const response = await getTimeEntry(request, {
        params: Promise.resolve({ id: "entry-001" }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.timeEntry.id).toBe("entry-001");
    });

    it("should return 404 when time entry not found", async () => {
      db.timeEntry.findFirst.mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost/api/timecards/entries/nonexistent",
      );
      const response = await getTimeEntry(request, {
        params: Promise.resolve({ id: "nonexistent" }),
      });

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("TimeEntry not found");
    });

    it("should enforce tenant isolation on detail queries", async () => {
      db.timeEntry.findFirst.mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost/api/timecards/entries/entry-001",
      );
      await getTimeEntry(request, {
        params: Promise.resolve({ id: "entry-001" }),
      });

      expect(db.timeEntry.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: "entry-001",
            tenantId: TEST_TENANT_ID,
            deleted_at: null,
          },
        }),
      );
    });

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const request = new NextRequest(
        "http://localhost/api/timecards/entries/entry-001",
      );
      const response = await getTimeEntry(request, {
        params: Promise.resolve({ id: "entry-001" }),
      });

      expect(response.status).toBe(401);
    });
  });

  // ============================================ CLOCK-IN COMMAND
  describe("POST /api/timecards/entries/commands/clock-in", () => {
    const mockRunCommand = vi.fn();

    beforeEach(() => {
      vi.mocked(createManifestRuntime).mockResolvedValue({
        runCommand: mockRunCommand,
      } as never);

      db.user.findFirst.mockResolvedValue(createMockUser() as never);
    });

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const request = new NextRequest(
        "http://localhost/api/timecards/entries/commands/clock-in",
        {
          method: "POST",
          body: JSON.stringify({ employeeId: "emp-001" }),
        },
      );
      const response = await clockIn(request);

      expect(response.status).toBe(401);
    });

    it("should return 400 when tenant not found", async () => {
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const request = new NextRequest(
        "http://localhost/api/timecards/entries/commands/clock-in",
        {
          method: "POST",
          body: JSON.stringify({ employeeId: "emp-001" }),
        },
      );
      const response = await clockIn(request);

      expect(response.status).toBe(400);
    });

    it("should return 400 when user not found in database", async () => {
      db.user.findFirst.mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost/api/timecards/entries/commands/clock-in",
        {
          method: "POST",
          body: JSON.stringify({ employeeId: "emp-001" }),
        },
      );
      const response = await clockIn(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.message).toBe("User not found in database");
    });

    it("should clock in successfully through manifest runtime", async () => {
      mockRunCommand.mockResolvedValue({
        success: true,
        result: { id: "entry-new" },
        emittedEvents: [],
      });

      const request = new NextRequest(
        "http://localhost/api/timecards/entries/commands/clock-in",
        {
          method: "POST",
          body: JSON.stringify({ employeeId: "emp-001" }),
        },
      );
      const response = await clockIn(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.result).toEqual({ id: "entry-new" });

      expect(mockRunCommand).toHaveBeenCalledWith(
        "clockIn",
        expect.objectContaining({ employeeId: "emp-001" }),
        { entityName: "TimeEntry" },
      );
    });

    it("should return 403 on policy denial", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        policyDenial: { policyName: "ManagerOnlyPolicy" },
      });

      const request = new NextRequest(
        "http://localhost/api/timecards/entries/commands/clock-in",
        {
          method: "POST",
          body: JSON.stringify({ employeeId: "emp-001" }),
        },
      );
      const response = await clockIn(request);

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.message).toContain("Access denied");
      expect(body.message).toContain("ManagerOnlyPolicy");
    });

    it("should return 422 on guard failure", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        guardFailure: {
          index: 0,
          formatted: "Employee already has an active time entry",
        },
      });

      const request = new NextRequest(
        "http://localhost/api/timecards/entries/commands/clock-in",
        {
          method: "POST",
          body: JSON.stringify({ employeeId: "emp-001" }),
        },
      );
      const response = await clockIn(request);

      expect(response.status).toBe(422);
      const body = await response.json();
      expect(body.message).toContain("Guard 0 failed");
      expect(body.message).toContain(
        "Employee already has an active time entry",
      );
    });

    it("should return 400 when command fails without policy/guard", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        error: "Invalid employee",
      });

      const request = new NextRequest(
        "http://localhost/api/timecards/entries/commands/clock-in",
        {
          method: "POST",
          body: JSON.stringify({ employeeId: "invalid" }),
        },
      );
      const response = await clockIn(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.message).toBe("Invalid employee");
    });

    it("should return 500 on unexpected error", async () => {
      mockRunCommand.mockRejectedValue(new Error("Runtime crash"));

      const request = new NextRequest(
        "http://localhost/api/timecards/entries/commands/clock-in",
        {
          method: "POST",
          body: JSON.stringify({ employeeId: "emp-001" }),
        },
      );
      const response = await clockIn(request);

      expect(response.status).toBe(500);
    });
  });

  // ============================================ CLOCK-OUT COMMAND
  describe("POST /api/timecards/entries/commands/clock-out", () => {
    const mockRunCommand = vi.fn();

    beforeEach(() => {
      vi.mocked(createManifestRuntime).mockResolvedValue({
        runCommand: mockRunCommand,
      } as never);

      db.user.findFirst.mockResolvedValue(createMockUser() as never);
    });

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const request = new NextRequest(
        "http://localhost/api/timecards/entries/commands/clock-out",
        {
          method: "POST",
          body: JSON.stringify({ id: "entry-001" }),
        },
      );
      const response = await clockOut(request);

      expect(response.status).toBe(401);
    });

    it("should return 400 when tenant not found", async () => {
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const request = new NextRequest(
        "http://localhost/api/timecards/entries/commands/clock-out",
        {
          method: "POST",
          body: JSON.stringify({ id: "entry-001" }),
        },
      );
      const response = await clockOut(request);

      expect(response.status).toBe(400);
    });

    it("should clock out successfully through manifest runtime", async () => {
      mockRunCommand.mockResolvedValue({
        success: true,
        result: { id: "entry-001", clockOut: "2026-04-28T17:00:00Z" },
        emittedEvents: [],
      });

      const request = new NextRequest(
        "http://localhost/api/timecards/entries/commands/clock-out",
        {
          method: "POST",
          body: JSON.stringify({ id: "entry-001" }),
        },
      );
      const response = await clockOut(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.result.id).toBe("entry-001");

      expect(mockRunCommand).toHaveBeenCalledWith(
        "clockOut",
        expect.objectContaining({ id: "entry-001" }),
        { entityName: "TimeEntry" },
      );
    });

    it("should return 422 on guard failure (already clocked out)", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        guardFailure: {
          index: 0,
          formatted: "Time entry is already clocked out",
        },
      });

      const request = new NextRequest(
        "http://localhost/api/timecards/entries/commands/clock-out",
        {
          method: "POST",
          body: JSON.stringify({ id: "entry-001" }),
        },
      );
      const response = await clockOut(request);

      expect(response.status).toBe(422);
      const body = await response.json();
      expect(body.message).toContain("Guard 0 failed");
      expect(body.message).toContain("already clocked out");
    });

    it("should return 403 on policy denial", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        policyDenial: { policyName: "SelfClockOutOnlyPolicy" },
      });

      const request = new NextRequest(
        "http://localhost/api/timecards/entries/commands/clock-out",
        {
          method: "POST",
          body: JSON.stringify({ id: "entry-001" }),
        },
      );
      const response = await clockOut(request);

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.message).toContain("Access denied");
      expect(body.message).toContain("SelfClockOutOnlyPolicy");
    });

    it("should return 500 on unexpected error", async () => {
      mockRunCommand.mockRejectedValue(new Error("Runtime crash"));

      const request = new NextRequest(
        "http://localhost/api/timecards/entries/commands/clock-out",
        {
          method: "POST",
          body: JSON.stringify({ id: "entry-001" }),
        },
      );
      const response = await clockOut(request);

      expect(response.status).toBe(500);
    });
  });

  // ============================================ ADD ENTRY COMMAND
  describe("POST /api/timecards/entries/commands/add-entry", () => {
    const mockRunCommand = vi.fn();

    beforeEach(() => {
      vi.mocked(createManifestRuntime).mockResolvedValue({
        runCommand: mockRunCommand,
      } as never);

      db.user.findFirst.mockResolvedValue(createMockUser() as never);
    });

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const request = new NextRequest(
        "http://localhost/api/timecards/entries/commands/add-entry",
        {
          method: "POST",
          body: JSON.stringify({
            employeeId: "emp-001",
            clockIn: "2026-04-28T09:00:00Z",
            clockOut: "2026-04-28T17:00:00Z",
          }),
        },
      );
      const response = await addEntry(request);

      expect(response.status).toBe(401);
    });

    it("should add entry successfully through manifest runtime", async () => {
      mockRunCommand.mockResolvedValue({
        success: true,
        result: { id: "entry-manual-001" },
        emittedEvents: [],
      });

      const request = new NextRequest(
        "http://localhost/api/timecards/entries/commands/add-entry",
        {
          method: "POST",
          body: JSON.stringify({
            employeeId: "emp-001",
            clockIn: "2026-04-28T09:00:00Z",
            clockOut: "2026-04-28T17:00:00Z",
            breakMinutes: 30,
          }),
        },
      );
      const response = await addEntry(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.result).toEqual({ id: "entry-manual-001" });

      expect(mockRunCommand).toHaveBeenCalledWith(
        "addEntry",
        expect.objectContaining({ employeeId: "emp-001" }),
        { entityName: "TimeEntry" },
      );
    });

    it("should return 422 on guard failure", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        guardFailure: {
          index: 0,
          formatted: "clockOut must be after clockIn",
        },
      });

      const request = new NextRequest(
        "http://localhost/api/timecards/entries/commands/add-entry",
        {
          method: "POST",
          body: JSON.stringify({
            employeeId: "emp-001",
            clockIn: "2026-04-28T17:00:00Z",
            clockOut: "2026-04-28T09:00:00Z",
          }),
        },
      );
      const response = await addEntry(request);

      expect(response.status).toBe(422);
      const body = await response.json();
      expect(body.message).toContain("Guard 0 failed");
    });
  });

  // ============================================ EDIT REQUEST LIST
  describe("GET /api/timecards/edit-requests/list", () => {
    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const request = new NextRequest(
        "http://localhost/api/timecards/edit-requests/list",
      );
      const response = await listEditRequests(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Unauthorized");
    });

    it("should return 400 when tenant not found", async () => {
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const request = new NextRequest(
        "http://localhost/api/timecards/edit-requests/list",
      );
      const response = await listEditRequests(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Tenant not found");
    });

    it("should return edit requests for authenticated user", async () => {
      const mockRequests = [
        createMockEditRequest({ id: "edit-1", status: "pending" }),
        createMockEditRequest({ id: "edit-2", status: "approved" }),
      ];

      db.timecardEditRequest.findMany.mockResolvedValue(mockRequests as never);

      const request = new NextRequest(
        "http://localhost/api/timecards/edit-requests/list",
      );
      const response = await listEditRequests(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.timecardEditRequests).toHaveLength(2);
    });

    it("should filter by tenantId only (no soft-delete filter)", async () => {
      db.timecardEditRequest.findMany.mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost/api/timecards/edit-requests/list",
      );
      await listEditRequests(request);

      expect(db.timecardEditRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: TEST_TENANT_ID,
          },
        }),
      );
    });

    it("should order results by createdAt descending", async () => {
      db.timecardEditRequest.findMany.mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost/api/timecards/edit-requests/list",
      );
      await listEditRequests(request);

      expect(db.timecardEditRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: "desc" },
        }),
      );
    });

    it("should return 500 on database error", async () => {
      db.timecardEditRequest.findMany.mockRejectedValue(
        new Error("Database connection failed"),
      );

      const request = new NextRequest(
        "http://localhost/api/timecards/edit-requests/list",
      );
      const response = await listEditRequests(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Internal server error");
    });
  });

  // ============================================ EDIT REQUEST DETAIL
  describe("GET /api/timecards/edit-requests/[id]", () => {
    it("should return a single edit request by ID", async () => {
      const mockRequest = createMockEditRequest({ id: "edit-001" });

      db.timecardEditRequest.findFirst.mockResolvedValue(mockRequest as never);

      const request = new NextRequest(
        "http://localhost/api/timecards/edit-requests/edit-001",
      );
      const response = await getEditRequest(request, {
        params: Promise.resolve({ id: "edit-001" }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.timecardEditRequest.id).toBe("edit-001");
    });

    it("should return 404 when edit request not found", async () => {
      db.timecardEditRequest.findFirst.mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost/api/timecards/edit-requests/nonexistent",
      );
      const response = await getEditRequest(request, {
        params: Promise.resolve({ id: "nonexistent" }),
      });

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("TimecardEditRequest not found");
    });

    it("should enforce tenant isolation on detail queries", async () => {
      db.timecardEditRequest.findFirst.mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost/api/timecards/edit-requests/edit-001",
      );
      await getEditRequest(request, {
        params: Promise.resolve({ id: "edit-001" }),
      });

      expect(db.timecardEditRequest.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: "edit-001",
            tenantId: TEST_TENANT_ID,
          },
        }),
      );
    });

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const request = new NextRequest(
        "http://localhost/api/timecards/edit-requests/edit-001",
      );
      const response = await getEditRequest(request, {
        params: Promise.resolve({ id: "edit-001" }),
      });

      expect(response.status).toBe(401);
    });
  });

  // ============================================ EDIT REQUEST APPROVE
  describe("POST /api/timecards/edit-requests/commands/approve", () => {
    const mockRunCommand = vi.fn();

    beforeEach(() => {
      vi.mocked(createManifestRuntime).mockResolvedValue({
        runCommand: mockRunCommand,
      } as never);

      db.user.findFirst.mockResolvedValue(createMockUser() as never);
    });

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const request = new NextRequest(
        "http://localhost/api/timecards/edit-requests/commands/approve",
        {
          method: "POST",
          body: JSON.stringify({ id: "edit-001" }),
        },
      );
      const response = await approveEditRequest(request);

      expect(response.status).toBe(401);
    });

    it("should approve an edit request through manifest runtime", async () => {
      mockRunCommand.mockResolvedValue({
        success: true,
        result: { id: "edit-001", status: "approved" },
        emittedEvents: [],
      });

      const request = new NextRequest(
        "http://localhost/api/timecards/edit-requests/commands/approve",
        {
          method: "POST",
          body: JSON.stringify({ id: "edit-001" }),
        },
      );
      const response = await approveEditRequest(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.result.status).toBe("approved");

      expect(mockRunCommand).toHaveBeenCalledWith(
        "approve",
        expect.objectContaining({ id: "edit-001" }),
        { entityName: "TimecardEditRequest" },
      );
    });

    it("should return 403 on policy denial", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        policyDenial: { policyName: "ManagerOnlyPolicy" },
      });

      const request = new NextRequest(
        "http://localhost/api/timecards/edit-requests/commands/approve",
        {
          method: "POST",
          body: JSON.stringify({ id: "edit-001" }),
        },
      );
      const response = await approveEditRequest(request);

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.message).toContain("Access denied");
      expect(body.message).toContain("ManagerOnlyPolicy");
    });

    it("should return 422 on guard failure", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        guardFailure: {
          index: 0,
          formatted: "Edit request is already processed",
        },
      });

      const request = new NextRequest(
        "http://localhost/api/timecards/edit-requests/commands/approve",
        {
          method: "POST",
          body: JSON.stringify({ id: "edit-001" }),
        },
      );
      const response = await approveEditRequest(request);

      expect(response.status).toBe(422);
      const body = await response.json();
      expect(body.message).toContain("Guard 0 failed");
      expect(body.message).toContain("already processed");
    });

    it("should return 400 when command fails without policy/guard", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        error: "Edit request not found",
      });

      const request = new NextRequest(
        "http://localhost/api/timecards/edit-requests/commands/approve",
        {
          method: "POST",
          body: JSON.stringify({ id: "nonexistent" }),
        },
      );
      const response = await approveEditRequest(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.message).toBe("Edit request not found");
    });

    it("should return 500 on unexpected error", async () => {
      mockRunCommand.mockRejectedValue(new Error("Runtime crash"));

      const request = new NextRequest(
        "http://localhost/api/timecards/edit-requests/commands/approve",
        {
          method: "POST",
          body: JSON.stringify({ id: "edit-001" }),
        },
      );
      const response = await approveEditRequest(request);

      expect(response.status).toBe(500);
    });
  });

  // ============================================ EDIT REQUEST REJECT
  describe("POST /api/timecards/edit-requests/commands/reject", () => {
    const mockRunCommand = vi.fn();

    beforeEach(() => {
      vi.mocked(createManifestRuntime).mockResolvedValue({
        runCommand: mockRunCommand,
      } as never);

      db.user.findFirst.mockResolvedValue(createMockUser() as never);
    });

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const request = new NextRequest(
        "http://localhost/api/timecards/edit-requests/commands/reject",
        {
          method: "POST",
          body: JSON.stringify({ id: "edit-001" }),
        },
      );
      const response = await rejectEditRequest(request);

      expect(response.status).toBe(401);
    });

    it("should reject an edit request through manifest runtime", async () => {
      mockRunCommand.mockResolvedValue({
        success: true,
        result: { id: "edit-001", status: "rejected" },
        emittedEvents: [],
      });

      const request = new NextRequest(
        "http://localhost/api/timecards/edit-requests/commands/reject",
        {
          method: "POST",
          body: JSON.stringify({ id: "edit-001", reason: "Not justified" }),
        },
      );
      const response = await rejectEditRequest(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.result.status).toBe("rejected");

      expect(mockRunCommand).toHaveBeenCalledWith(
        "reject",
        expect.objectContaining({ id: "edit-001", reason: "Not justified" }),
        { entityName: "TimecardEditRequest" },
      );
    });

    it("should return 403 on policy denial", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        policyDenial: { policyName: "ManagerOnlyPolicy" },
      });

      const request = new NextRequest(
        "http://localhost/api/timecards/edit-requests/commands/reject",
        {
          method: "POST",
          body: JSON.stringify({ id: "edit-001" }),
        },
      );
      const response = await rejectEditRequest(request);

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.message).toContain("Access denied");
    });

    it("should return 500 on unexpected error", async () => {
      mockRunCommand.mockRejectedValue(new Error("Runtime crash"));

      const request = new NextRequest(
        "http://localhost/api/timecards/edit-requests/commands/reject",
        {
          method: "POST",
          body: JSON.stringify({ id: "edit-001" }),
        },
      );
      const response = await rejectEditRequest(request);

      expect(response.status).toBe(500);
    });
  });

  // ============================================ TIME-OFF REQUEST LIST
  describe("GET /api/timecards/time-off-requests/list", () => {
    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const request = new NextRequest(
        "http://localhost/api/timecards/time-off-requests/list",
      );
      const response = await listTimeOffRequests(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Unauthorized");
    });

    it("should return 400 when tenant not found", async () => {
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const request = new NextRequest(
        "http://localhost/api/timecards/time-off-requests/list",
      );
      const response = await listTimeOffRequests(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Tenant not found");
    });

    it("should return time-off requests for authenticated user", async () => {
      const mockRequests = [
        createMockTimeOffRequest({ id: "tor-1", type: "vacation" }),
        createMockTimeOffRequest({
          id: "tor-2",
          type: "sick",
          startDate: new Date("2026-05-10"),
          endDate: new Date("2026-05-10"),
        }),
      ];

      db.employeeTimeOffRequest.findMany.mockResolvedValue(mockRequests as never);

      const request = new NextRequest(
        "http://localhost/api/timecards/time-off-requests/list",
      );
      const response = await listTimeOffRequests(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.timeOffRequests).toHaveLength(2);
    });

    it("should filter by tenant_id and exclude soft-deleted", async () => {
      db.employeeTimeOffRequest.findMany.mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost/api/timecards/time-off-requests/list",
      );
      await listTimeOffRequests(request);

      expect(db.employeeTimeOffRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenant_id: TEST_TENANT_ID,
            deleted_at: null,
          },
        }),
      );
    });

    it("should order results by created_at descending", async () => {
      db.employeeTimeOffRequest.findMany.mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost/api/timecards/time-off-requests/list",
      );
      await listTimeOffRequests(request);

      expect(db.employeeTimeOffRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { created_at: "desc" },
        }),
      );
    });

    it("should return 500 on database error", async () => {
      db.employeeTimeOffRequest.findMany.mockRejectedValue(
        new Error("Database connection failed"),
      );

      const request = new NextRequest(
        "http://localhost/api/timecards/time-off-requests/list",
      );
      const response = await listTimeOffRequests(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Internal server error");
    });
  });

  // ============================================ TIME-OFF REQUEST DETAIL
  describe("GET /api/timecards/time-off-requests/[id]", () => {
    it("should return a single time-off request by ID", async () => {
      const mockRequest = createMockTimeOffRequest({ id: "tor-001" });

      db.employeeTimeOffRequest.findFirst.mockResolvedValue(mockRequest as never);

      const request = new NextRequest(
        "http://localhost/api/timecards/time-off-requests/tor-001",
      );
      const response = await getTimeOffRequest(request, {
        params: Promise.resolve({ id: "tor-001" }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.timeOffRequest.id).toBe("tor-001");
    });

    it("should return 404 when time-off request not found", async () => {
      db.employeeTimeOffRequest.findFirst.mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost/api/timecards/time-off-requests/nonexistent",
      );
      const response = await getTimeOffRequest(request, {
        params: Promise.resolve({ id: "nonexistent" }),
      });

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("TimeOffRequest not found");
    });

    it("should enforce tenant isolation on detail queries", async () => {
      db.employeeTimeOffRequest.findFirst.mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost/api/timecards/time-off-requests/tor-001",
      );
      await getTimeOffRequest(request, {
        params: Promise.resolve({ id: "tor-001" }),
      });

      expect(db.employeeTimeOffRequest.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: "tor-001",
            tenant_id: TEST_TENANT_ID,
            deleted_at: null,
          },
        }),
      );
    });

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const request = new NextRequest(
        "http://localhost/api/timecards/time-off-requests/tor-001",
      );
      const response = await getTimeOffRequest(request, {
        params: Promise.resolve({ id: "tor-001" }),
      });

      expect(response.status).toBe(401);
    });
  });

  // ============================================ TIME-OFF REQUEST APPROVE
  describe("POST /api/timecards/time-off-requests/commands/approve", () => {
    const mockRunCommand = vi.fn();

    beforeEach(() => {
      vi.mocked(createManifestRuntime).mockResolvedValue({
        runCommand: mockRunCommand,
      } as never);

      db.user.findFirst.mockResolvedValue(createMockUser() as never);
    });

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const request = new NextRequest(
        "http://localhost/api/timecards/time-off-requests/commands/approve",
        {
          method: "POST",
          body: JSON.stringify({ id: "tor-001" }),
        },
      );
      const response = await approveTimeOff(request);

      expect(response.status).toBe(401);
    });

    it("should approve a time-off request through manifest runtime", async () => {
      mockRunCommand.mockResolvedValue({
        success: true,
        result: { id: "tor-001", status: "approved" },
        emittedEvents: [],
      });

      const request = new NextRequest(
        "http://localhost/api/timecards/time-off-requests/commands/approve",
        {
          method: "POST",
          body: JSON.stringify({ id: "tor-001" }),
        },
      );
      const response = await approveTimeOff(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.result.status).toBe("approved");

      expect(mockRunCommand).toHaveBeenCalledWith(
        "approve",
        expect.objectContaining({ id: "tor-001" }),
        { entityName: "TimeOffRequest" },
      );
    });

    it("should return 403 on policy denial", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        policyDenial: { policyName: "ManagerOnlyPolicy" },
      });

      const request = new NextRequest(
        "http://localhost/api/timecards/time-off-requests/commands/approve",
        {
          method: "POST",
          body: JSON.stringify({ id: "tor-001" }),
        },
      );
      const response = await approveTimeOff(request);

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.message).toContain("Access denied");
      expect(body.message).toContain("ManagerOnlyPolicy");
    });

    it("should return 422 on guard failure", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        guardFailure: {
          index: 0,
          formatted: "Request is already processed",
        },
      });

      const request = new NextRequest(
        "http://localhost/api/timecards/time-off-requests/commands/approve",
        {
          method: "POST",
          body: JSON.stringify({ id: "tor-001" }),
        },
      );
      const response = await approveTimeOff(request);

      expect(response.status).toBe(422);
      const body = await response.json();
      expect(body.message).toContain("Guard 0 failed");
    });

    it("should return 500 on unexpected error", async () => {
      mockRunCommand.mockRejectedValue(new Error("Runtime crash"));

      const request = new NextRequest(
        "http://localhost/api/timecards/time-off-requests/commands/approve",
        {
          method: "POST",
          body: JSON.stringify({ id: "tor-001" }),
        },
      );
      const response = await approveTimeOff(request);

      expect(response.status).toBe(500);
    });
  });

  // ============================================ TIME-OFF REQUEST REJECT
  describe("POST /api/timecards/time-off-requests/commands/reject", () => {
    const mockRunCommand = vi.fn();

    beforeEach(() => {
      vi.mocked(createManifestRuntime).mockResolvedValue({
        runCommand: mockRunCommand,
      } as never);

      db.user.findFirst.mockResolvedValue(createMockUser() as never);
    });

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const request = new NextRequest(
        "http://localhost/api/timecards/time-off-requests/commands/reject",
        {
          method: "POST",
          body: JSON.stringify({ id: "tor-001" }),
        },
      );
      const response = await rejectTimeOff(request);

      expect(response.status).toBe(401);
    });

    it("should reject a time-off request through manifest runtime", async () => {
      mockRunCommand.mockResolvedValue({
        success: true,
        result: { id: "tor-001", status: "rejected" },
        emittedEvents: [],
      });

      const request = new NextRequest(
        "http://localhost/api/timecards/time-off-requests/commands/reject",
        {
          method: "POST",
          body: JSON.stringify({
            id: "tor-001",
            reason: "Insufficient staffing",
          }),
        },
      );
      const response = await rejectTimeOff(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.result.status).toBe("rejected");

      expect(mockRunCommand).toHaveBeenCalledWith(
        "reject",
        expect.objectContaining({
          id: "tor-001",
          reason: "Insufficient staffing",
        }),
        { entityName: "TimeOffRequest" },
      );
    });

    it("should return 403 on policy denial", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        policyDenial: { policyName: "ManagerOnlyPolicy" },
      });

      const request = new NextRequest(
        "http://localhost/api/timecards/time-off-requests/commands/reject",
        {
          method: "POST",
          body: JSON.stringify({ id: "tor-001" }),
        },
      );
      const response = await rejectTimeOff(request);

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.message).toContain("Access denied");
    });

    it("should return 400 when command fails without policy/guard", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        error: "Request not found",
      });

      const request = new NextRequest(
        "http://localhost/api/timecards/time-off-requests/commands/reject",
        {
          method: "POST",
          body: JSON.stringify({ id: "nonexistent" }),
        },
      );
      const response = await rejectTimeOff(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.message).toBe("Request not found");
    });

    it("should return 500 on unexpected error", async () => {
      mockRunCommand.mockRejectedValue(new Error("Runtime crash"));

      const request = new NextRequest(
        "http://localhost/api/timecards/time-off-requests/commands/reject",
        {
          method: "POST",
          body: JSON.stringify({ id: "tor-001" }),
        },
      );
      const response = await rejectTimeOff(request);

      expect(response.status).toBe(500);
    });
  });
});
