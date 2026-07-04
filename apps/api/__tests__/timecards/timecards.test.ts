/**
 * Timecards API Integration Tests
 *
 * Tests verify the time entry list/detail, clock-in/clock-out commands,
 * edit request list/approve/reject, and time-off request list/approve/reject
 * endpoints with authentication, authorization, and error handling.
 *
 * GET routes use auth() + getTenantIdForOrg() + direct Prisma.
 * POST routes go through the manifest dispatcher (requireCurrentUser + runManifestCommand).
 */

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// vi.mock factories are hoisted above imports, so we use vi.hoisted() to
// create the mock database and model stubs at hoist time.
// ---------------------------------------------------------------------------
const { mockDatabase } = vi.hoisted(() => {
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
    }
  );

  return { modelStubs: stubs, mockDatabase: db };
});

vi.mock("@repo/database", () => ({
  database: mockDatabase,
  Prisma: {
    sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
      strings,
      values,
    }),
    empty: { strings: [""], values: [] },
    raw: (s: string) => s,
  },
}));

vi.mock("@/lib/database", () => ({
  get database() {
    return mockDatabase;
  },
}));

// Mock external dependencies
vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  requireCurrentUser: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

// Manifest runtime mocks — POST routes go through the dispatcher
vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(),
}));
vi.mock("@/lib/manifest/execute-command", () => ({
  runManifestCommand: vi.fn(),
}));
vi.mock("@/lib/manifest-response", async () => {
  const { NextResponse } = await import("next/server");
  return {
    manifestSuccessResponse: (data: unknown, status = 200) =>
      NextResponse.json(
        {
          success: true,
          ...(typeof data === "object" && data !== null ? data : { data }),
        },
        { status }
      ),
    manifestErrorResponse: (
      message:
        | string
        | ({ error: string; diagnostics?: unknown[] } & Record<
            string,
            unknown
          >),
      status: number
    ) => {
      const body =
        typeof message === "string"
          ? { success: false, message }
          : {
              success: false,
              diagnostics: message.diagnostics ?? [],
              ...message,
              error: message.error,
            };
      return NextResponse.json(body, { status });
    },
  };
});
vi.mock("@/app/lib/invariant", () => ({
  InvariantError: class extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = "InvariantError";
    }
  },
}));
vi.mock("@/app/lib/webhook-dispatch", () => ({
  dispatchWebhooks: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@repo/notifications", () => ({}));
vi.mock("@repo/manifest-runtime/run-manifest-command-core", () => ({
  runManifestCommandCore: vi.fn(),
}));
vi.mock("@/lib/manifest/issue-log", () => ({
  logManifestIssue: vi.fn(),
}));

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg, requireCurrentUser } = await import(
  "@/app/lib/tenant"
);
const { runManifestCommand } = await import("@/lib/manifest/execute-command");

import {
  POST as addEntry,
  POST as approveEditRequest,
  POST as approveTimeOff,
  POST as clockIn,
  POST as clockOut,
  POST as rejectEditRequest,
  POST as rejectTimeOff,
} from "@/app/api/manifest/[entity]/commands/[command]/route";
import { GET as getEditRequest } from "@/app/api/timecards/edit-requests/[id]/route";
import { GET as listEditRequests } from "@/app/api/timecards/edit-requests/list/route";
import { GET as getTimeEntry } from "@/app/api/timecards/entries/[id]/route";
import { GET as listTimeEntries } from "@/app/api/timecards/entries/list/route";
import { GET as getTimeOffRequest } from "@/app/api/timecards/time-off-requests/[id]/route";
import { GET as listTimeOffRequests } from "@/app/api/timecards/time-off-requests/list/route";

// Convenience accessors through the Proxy (auto-creates stubs on first access)
const db = {
  // The Proxy auto-creates a stub on first access, so these are never undefined.
  get timeEntry() {
    return mockDatabase.timeEntry!;
  },
  get timecardEditRequest() {
    return mockDatabase.timecardEditRequest!;
  },
  get timeOffRequest() {
    return mockDatabase.timeOffRequest!;
  },
  get user() {
    return mockDatabase.user!;
  },
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
    deletedAt: null,
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
    tenantId: TEST_TENANT_ID,
    employeeId: "emp-001",
    type: "vacation",
    startDate: new Date("2026-05-01"),
    endDate: new Date("2026-05-03"),
    reason: "Family event",
    status: "pending",
    approvedBy: null,
    approvedAt: null,
    deletedAt: null,
    createdAt: new Date("2026-04-28T10:00:00Z"),
    updatedAt: new Date("2026-04-28T10:00:00Z"),
    ...overrides,
  };
}

/** Helper to mock requireCurrentUser for authenticated requests */
function mockAuthenticatedUser() {
  vi.mocked(requireCurrentUser).mockResolvedValue({
    id: TEST_USER_ID,
    tenantId: TEST_TENANT_ID,
    role: "admin",
    email: "test@test.com",
    firstName: "Test",
    lastName: "User",
  });
}

/** Helper to make requireCurrentUser throw InvariantError (mapped to 401 by dispatcher) */
async function mockUnauthenticated() {
  const { InvariantError } = await import("@/app/lib/invariant");
  vi.mocked(requireCurrentUser).mockRejectedValue(
    new InvariantError("Unauthorized")
  );
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
        "http://localhost/api/timecards/entries/list"
      );
      const response = await listTimeEntries(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe("Unauthorized");
    });

    it("should return 400 when tenant not found", async () => {
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const request = new NextRequest(
        "http://localhost/api/timecards/entries/list"
      );
      const response = await listTimeEntries(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Tenant not found");
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
        "http://localhost/api/timecards/entries/list"
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
        "http://localhost/api/timecards/entries/list"
      );
      await listTimeEntries(request);

      expect(db.timeEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: TEST_TENANT_ID,
            deletedAt: null,
          },
        })
      );
    });

    it("should order results by createdAt descending", async () => {
      db.timeEntry.findMany.mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost/api/timecards/entries/list"
      );
      await listTimeEntries(request);

      expect(db.timeEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: "desc" },
        })
      );
    });

    it("should return empty array when no entries exist", async () => {
      db.timeEntry.findMany.mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost/api/timecards/entries/list"
      );
      const response = await listTimeEntries(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.timeEntrys).toHaveLength(0);
    });

    it("should return 500 on database error", async () => {
      db.timeEntry.findMany.mockRejectedValue(
        new Error("Database connection failed")
      );

      const request = new NextRequest(
        "http://localhost/api/timecards/entries/list"
      );
      const response = await listTimeEntries(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe("Internal server error");
    });
  });

  // ============================================ TIME ENTRY DETAIL
  describe("GET /api/timecards/entries/[id]", () => {
    it("should return a single time entry by ID", async () => {
      const mockEntry = createMockTimeEntry({ id: "entry-001" });

      db.timeEntry.findFirst.mockResolvedValue(mockEntry as never);

      const request = new NextRequest(
        "http://localhost/api/timecards/entries/entry-001"
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
        "http://localhost/api/timecards/entries/nonexistent"
      );
      const response = await getTimeEntry(request, {
        params: Promise.resolve({ id: "nonexistent" }),
      });

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe("TimeEntry not found");
    });

    it("should enforce tenant isolation on detail queries", async () => {
      db.timeEntry.findFirst.mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost/api/timecards/entries/entry-001"
      );
      await getTimeEntry(request, {
        params: Promise.resolve({ id: "entry-001" }),
      });

      expect(db.timeEntry.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: "entry-001",
            tenantId: TEST_TENANT_ID,
            deletedAt: null,
          },
        })
      );
    });

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const request = new NextRequest(
        "http://localhost/api/timecards/entries/entry-001"
      );
      const response = await getTimeEntry(request, {
        params: Promise.resolve({ id: "entry-001" }),
      });

      expect(response.status).toBe(401);
    });
  });

  // ============================================ CLOCK-IN COMMAND
  describe("POST /api/timecards/entries/commands/clock-in", () => {
    beforeEach(() => {
      mockAuthenticatedUser();
    });

    it("should return 401 for unauthenticated requests", async () => {
      await mockUnauthenticated();

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ employeeId: "emp-001" }),
        }
      );
      const response = await clockIn(request, {
        params: Promise.resolve({ entity: "TimeEntry", command: "clockIn" }),
      });

      expect(response.status).toBe(401);
    });

    it("should return 401 when tenant not found (InvariantError)", async () => {
      // Dispatcher catches all InvariantError and returns 401
      await mockUnauthenticated();

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ employeeId: "emp-001" }),
        }
      );
      const response = await clockIn(request, {
        params: Promise.resolve({ entity: "TimeEntry", command: "clockIn" }),
      });

      expect(response.status).toBe(401);
    });

    it("should return 401 when user not found in database (InvariantError)", async () => {
      // Dispatcher catches all InvariantError and returns 401
      await mockUnauthenticated();

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ employeeId: "emp-001" }),
        }
      );
      const response = await clockIn(request, {
        params: Promise.resolve({ entity: "TimeEntry", command: "clockIn" }),
      });

      expect(response.status).toBe(401);
    });

    it("should clock in successfully through manifest runtime", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            result: { id: "entry-new" },
            events: [],
          }),
          { status: 200 }
        )
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ employeeId: "emp-001" }),
        }
      );
      const response = await clockIn(request, {
        params: Promise.resolve({ entity: "TimeEntry", command: "clockIn" }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.result).toEqual({ id: "entry-new" });

      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "TimeEntry",
          command: "clockIn",
          body: expect.objectContaining({ employeeId: "emp-001" }),
          user: expect.objectContaining({
            id: TEST_USER_ID,
            tenantId: TEST_TENANT_ID,
          }),
        })
      );
    });

    it("should return 403 on policy denial", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            error: "Access denied",
            kind: "policy_denied",
            policyDenial: { policyName: "ManagerOnlyPolicy" },
          }),
          { status: 403 }
        )
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ employeeId: "emp-001" }),
        }
      );
      const response = await clockIn(request, {
        params: Promise.resolve({ entity: "TimeEntry", command: "clockIn" }),
      });

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.policyDenial.policyName).toContain("ManagerOnlyPolicy");
    });

    it("should return 422 on guard failure", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            error: "Guard 0 failed: Employee already has an active time entry",
            kind: "guard_failed",
            guardFailure: {
              index: 0,
              formatted: "Employee already has an active time entry",
            },
          }),
          { status: 422 }
        )
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ employeeId: "emp-001" }),
        }
      );
      const response = await clockIn(request, {
        params: Promise.resolve({ entity: "TimeEntry", command: "clockIn" }),
      });

      expect(response.status).toBe(422);
      const body = await response.json();
      expect(body.error).toContain("Guard 0 failed");
      expect(body.error).toContain("Employee already has an active time entry");
    });

    it("should return 400 when command fails without policy/guard", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            error: "Invalid employee",
            kind: "command_failed",
          }),
          { status: 400 }
        )
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ employeeId: "invalid" }),
        }
      );
      const response = await clockIn(request, {
        params: Promise.resolve({ entity: "TimeEntry", command: "clockIn" }),
      });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Invalid employee");
    });

    it("should return 500 on unexpected error", async () => {
      vi.mocked(runManifestCommand).mockRejectedValue(
        new Error("Runtime crash")
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ employeeId: "emp-001" }),
        }
      );
      const response = await clockIn(request, {
        params: Promise.resolve({ entity: "TimeEntry", command: "clockIn" }),
      });

      expect(response.status).toBe(500);
    });
  });

  // ============================================ CLOCK-OUT COMMAND
  describe("POST /api/timecards/entries/commands/clock-out", () => {
    beforeEach(() => {
      mockAuthenticatedUser();
    });

    it("should return 401 for unauthenticated requests", async () => {
      await mockUnauthenticated();

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ id: "entry-001" }),
        }
      );
      const response = await clockOut(request, {
        params: Promise.resolve({ entity: "TimeEntry", command: "clockOut" }),
      });

      expect(response.status).toBe(401);
    });

    it("should return 401 when tenant not found (InvariantError)", async () => {
      await mockUnauthenticated();

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ id: "entry-001" }),
        }
      );
      const response = await clockOut(request, {
        params: Promise.resolve({ entity: "TimeEntry", command: "clockOut" }),
      });

      expect(response.status).toBe(401);
    });

    it("should clock out successfully through manifest runtime", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            result: { id: "entry-001", clockOut: "2026-04-28T17:00:00Z" },
            events: [],
          }),
          { status: 200 }
        )
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ id: "entry-001" }),
        }
      );
      const response = await clockOut(request, {
        params: Promise.resolve({ entity: "TimeEntry", command: "clockOut" }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.result.id).toBe("entry-001");

      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "TimeEntry",
          command: "clockOut",
          body: expect.objectContaining({ id: "entry-001" }),
          user: expect.objectContaining({
            id: TEST_USER_ID,
            tenantId: TEST_TENANT_ID,
          }),
        })
      );
    });

    it("should return 422 on guard failure (already clocked out)", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            error: "Guard 0 failed: Time entry is already clocked out",
            kind: "guard_failed",
            guardFailure: {
              index: 0,
              formatted: "Time entry is already clocked out",
            },
          }),
          { status: 422 }
        )
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ id: "entry-001" }),
        }
      );
      const response = await clockOut(request, {
        params: Promise.resolve({ entity: "TimeEntry", command: "clockOut" }),
      });

      expect(response.status).toBe(422);
      const body = await response.json();
      expect(body.error).toContain("Guard 0 failed");
      expect(body.error).toContain("already clocked out");
    });

    it("should return 403 on policy denial", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            error: "Access denied",
            kind: "policy_denied",
            policyDenial: { policyName: "SelfClockOutOnlyPolicy" },
          }),
          { status: 403 }
        )
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ id: "entry-001" }),
        }
      );
      const response = await clockOut(request, {
        params: Promise.resolve({ entity: "TimeEntry", command: "clockOut" }),
      });

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.policyDenial.policyName).toContain("SelfClockOutOnlyPolicy");
    });

    it("should return 500 on unexpected error", async () => {
      vi.mocked(runManifestCommand).mockRejectedValue(
        new Error("Runtime crash")
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ id: "entry-001" }),
        }
      );
      const response = await clockOut(request, {
        params: Promise.resolve({ entity: "TimeEntry", command: "clockOut" }),
      });

      expect(response.status).toBe(500);
    });
  });

  // ============================================ ADD ENTRY COMMAND
  describe("POST /api/timecards/entries/commands/add-entry", () => {
    beforeEach(() => {
      mockAuthenticatedUser();
    });

    it("should return 401 for unauthenticated requests", async () => {
      await mockUnauthenticated();

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({
            employeeId: "emp-001",
            clockIn: "2026-04-28T09:00:00Z",
            clockOut: "2026-04-28T17:00:00Z",
          }),
        }
      );
      const response = await addEntry(request, {
        params: Promise.resolve({ entity: "TimeEntry", command: "addEntry" }),
      });

      expect(response.status).toBe(401);
    });

    it("should add entry successfully through manifest runtime", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            result: { id: "entry-manual-001" },
            events: [],
          }),
          { status: 200 }
        )
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({
            employeeId: "emp-001",
            clockIn: "2026-04-28T09:00:00Z",
            clockOut: "2026-04-28T17:00:00Z",
            breakMinutes: 30,
          }),
        }
      );
      const response = await addEntry(request, {
        params: Promise.resolve({ entity: "TimeEntry", command: "addEntry" }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.result).toEqual({ id: "entry-manual-001" });

      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "TimeEntry",
          command: "addEntry",
          body: expect.objectContaining({ employeeId: "emp-001" }),
          user: expect.objectContaining({
            id: TEST_USER_ID,
            tenantId: TEST_TENANT_ID,
          }),
        })
      );
    });

    it("should return 422 on guard failure", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            error: "Guard 0 failed: clockOut must be after clockIn",
            kind: "guard_failed",
            guardFailure: {
              index: 0,
              formatted: "clockOut must be after clockIn",
            },
          }),
          { status: 422 }
        )
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({
            employeeId: "emp-001",
            clockIn: "2026-04-28T17:00:00Z",
            clockOut: "2026-04-28T09:00:00Z",
          }),
        }
      );
      const response = await addEntry(request, {
        params: Promise.resolve({ entity: "TimeEntry", command: "addEntry" }),
      });

      expect(response.status).toBe(422);
      const body = await response.json();
      expect(body.error).toContain("Guard 0 failed");
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
        "http://localhost/api/timecards/edit-requests/list"
      );
      const response = await listEditRequests(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe("Unauthorized");
    });

    it("should return 400 when tenant not found", async () => {
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const request = new NextRequest(
        "http://localhost/api/timecards/edit-requests/list"
      );
      const response = await listEditRequests(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Tenant not found");
    });

    it("should return edit requests for authenticated user", async () => {
      const mockRequests = [
        createMockEditRequest({ id: "edit-1", status: "pending" }),
        createMockEditRequest({ id: "edit-2", status: "approved" }),
      ];

      db.timecardEditRequest.findMany.mockResolvedValue(mockRequests as never);

      const request = new NextRequest(
        "http://localhost/api/timecards/edit-requests/list"
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
        "http://localhost/api/timecards/edit-requests/list"
      );
      await listEditRequests(request);

      expect(db.timecardEditRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: TEST_TENANT_ID,
          },
        })
      );
    });

    it("should order results by createdAt descending", async () => {
      db.timecardEditRequest.findMany.mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost/api/timecards/edit-requests/list"
      );
      await listEditRequests(request);

      expect(db.timecardEditRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: "desc" },
        })
      );
    });

    it("should return 500 on database error", async () => {
      db.timecardEditRequest.findMany.mockRejectedValue(
        new Error("Database connection failed")
      );

      const request = new NextRequest(
        "http://localhost/api/timecards/edit-requests/list"
      );
      const response = await listEditRequests(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe("Internal server error");
    });
  });

  // ============================================ EDIT REQUEST DETAIL
  describe("GET /api/timecards/edit-requests/[id]", () => {
    it("should return a single edit request by ID", async () => {
      const mockRequest = createMockEditRequest({ id: "edit-001" });

      db.timecardEditRequest.findFirst.mockResolvedValue(mockRequest as never);

      const request = new NextRequest(
        "http://localhost/api/timecards/edit-requests/edit-001"
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
        "http://localhost/api/timecards/edit-requests/nonexistent"
      );
      const response = await getEditRequest(request, {
        params: Promise.resolve({ id: "nonexistent" }),
      });

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe("TimecardEditRequest not found");
    });

    it("should enforce tenant isolation on detail queries", async () => {
      db.timecardEditRequest.findFirst.mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost/api/timecards/edit-requests/edit-001"
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
        })
      );
    });

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const request = new NextRequest(
        "http://localhost/api/timecards/edit-requests/edit-001"
      );
      const response = await getEditRequest(request, {
        params: Promise.resolve({ id: "edit-001" }),
      });

      expect(response.status).toBe(401);
    });
  });

  // ============================================ EDIT REQUEST APPROVE
  describe("POST /api/timecards/edit-requests/commands/approve", () => {
    beforeEach(() => {
      mockAuthenticatedUser();
    });

    it("should return 401 for unauthenticated requests", async () => {
      await mockUnauthenticated();

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ id: "edit-001" }),
        }
      );
      const response = await approveEditRequest(request, {
        params: Promise.resolve({
          entity: "TimecardEditRequest",
          command: "approve",
        }),
      });

      expect(response.status).toBe(401);
    });

    it("should approve an edit request through manifest runtime", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            result: { id: "edit-001", status: "approved" },
            events: [],
          }),
          { status: 200 }
        )
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ id: "edit-001" }),
        }
      );
      const response = await approveEditRequest(request, {
        params: Promise.resolve({
          entity: "TimecardEditRequest",
          command: "approve",
        }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.result.status).toBe("approved");

      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "TimecardEditRequest",
          command: "approve",
          body: expect.objectContaining({ id: "edit-001" }),
          user: expect.objectContaining({
            id: TEST_USER_ID,
            tenantId: TEST_TENANT_ID,
          }),
        })
      );
    });

    it("should return 403 on policy denial", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            error: "Access denied",
            kind: "policy_denied",
            policyDenial: { policyName: "ManagerOnlyPolicy" },
          }),
          { status: 403 }
        )
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ id: "edit-001" }),
        }
      );
      const response = await approveEditRequest(request, {
        params: Promise.resolve({
          entity: "TimecardEditRequest",
          command: "approve",
        }),
      });

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.policyDenial.policyName).toContain("ManagerOnlyPolicy");
    });

    it("should return 422 on guard failure", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            error: "Guard 0 failed: Edit request is already processed",
            kind: "guard_failed",
            guardFailure: {
              index: 0,
              formatted: "Edit request is already processed",
            },
          }),
          { status: 422 }
        )
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ id: "edit-001" }),
        }
      );
      const response = await approveEditRequest(request, {
        params: Promise.resolve({
          entity: "TimecardEditRequest",
          command: "approve",
        }),
      });

      expect(response.status).toBe(422);
      const body = await response.json();
      expect(body.error).toContain("Guard 0 failed");
      expect(body.error).toContain("already processed");
    });

    it("should return 400 when command fails without policy/guard", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            error: "Edit request not found",
            kind: "command_failed",
          }),
          { status: 400 }
        )
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ id: "nonexistent" }),
        }
      );
      const response = await approveEditRequest(request, {
        params: Promise.resolve({
          entity: "TimecardEditRequest",
          command: "approve",
        }),
      });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Edit request not found");
    });

    it("should return 500 on unexpected error", async () => {
      vi.mocked(runManifestCommand).mockRejectedValue(
        new Error("Runtime crash")
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ id: "edit-001" }),
        }
      );
      const response = await approveEditRequest(request, {
        params: Promise.resolve({
          entity: "TimecardEditRequest",
          command: "approve",
        }),
      });

      expect(response.status).toBe(500);
    });
  });

  // ============================================ EDIT REQUEST REJECT
  describe("POST /api/timecards/edit-requests/commands/reject", () => {
    beforeEach(() => {
      mockAuthenticatedUser();
    });

    it("should return 401 for unauthenticated requests", async () => {
      await mockUnauthenticated();

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ id: "edit-001" }),
        }
      );
      const response = await rejectEditRequest(request, {
        params: Promise.resolve({
          entity: "TimecardEditRequest",
          command: "reject",
        }),
      });

      expect(response.status).toBe(401);
    });

    it("should reject an edit request through manifest runtime", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            result: { id: "edit-001", status: "rejected" },
            events: [],
          }),
          { status: 200 }
        )
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ id: "edit-001", reason: "Not justified" }),
        }
      );
      const response = await rejectEditRequest(request, {
        params: Promise.resolve({
          entity: "TimecardEditRequest",
          command: "reject",
        }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.result.status).toBe("rejected");

      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "TimecardEditRequest",
          command: "reject",
          body: expect.objectContaining({
            id: "edit-001",
            reason: "Not justified",
          }),
          user: expect.objectContaining({
            id: TEST_USER_ID,
            tenantId: TEST_TENANT_ID,
          }),
        })
      );
    });

    it("should return 403 on policy denial", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            error: "Access denied",
            kind: "policy_denied",
            policyDenial: { policyName: "ManagerOnlyPolicy" },
          }),
          { status: 403 }
        )
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ id: "edit-001" }),
        }
      );
      const response = await rejectEditRequest(request, {
        params: Promise.resolve({
          entity: "TimecardEditRequest",
          command: "reject",
        }),
      });

      expect(response.status).toBe(403);
    });

    it("should return 500 on unexpected error", async () => {
      vi.mocked(runManifestCommand).mockRejectedValue(
        new Error("Runtime crash")
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ id: "edit-001" }),
        }
      );
      const response = await rejectEditRequest(request, {
        params: Promise.resolve({
          entity: "TimecardEditRequest",
          command: "reject",
        }),
      });

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
        "http://localhost/api/timecards/time-off-requests/list"
      );
      const response = await listTimeOffRequests(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe("Unauthorized");
    });

    it("should return 400 when tenant not found", async () => {
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const request = new NextRequest(
        "http://localhost/api/timecards/time-off-requests/list"
      );
      const response = await listTimeOffRequests(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Tenant not found");
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

      db.timeOffRequest.findMany.mockResolvedValue(mockRequests as never);

      const request = new NextRequest(
        "http://localhost/api/timecards/time-off-requests/list"
      );
      const response = await listTimeOffRequests(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.timeOffRequests).toHaveLength(2);
    });

    it("should filter by tenantId and exclude soft-deleted", async () => {
      db.timeOffRequest.findMany.mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost/api/timecards/time-off-requests/list"
      );
      await listTimeOffRequests(request);

      expect(db.timeOffRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: TEST_TENANT_ID,
            deletedAt: null,
          },
        })
      );
    });

    it("should order results by createdAt descending", async () => {
      db.timeOffRequest.findMany.mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost/api/timecards/time-off-requests/list"
      );
      await listTimeOffRequests(request);

      expect(db.timeOffRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: "desc" },
        })
      );
    });

    it("should return 500 on database error", async () => {
      db.timeOffRequest.findMany.mockRejectedValue(
        new Error("Database connection failed")
      );

      const request = new NextRequest(
        "http://localhost/api/timecards/time-off-requests/list"
      );
      const response = await listTimeOffRequests(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe("Internal server error");
    });
  });

  // ============================================ TIME-OFF REQUEST DETAIL
  describe("GET /api/timecards/time-off-requests/[id]", () => {
    it("should return a single time-off request by ID", async () => {
      const mockRequest = createMockTimeOffRequest({ id: "tor-001" });

      db.timeOffRequest.findFirst.mockResolvedValue(mockRequest as never);

      const request = new NextRequest(
        "http://localhost/api/timecards/time-off-requests/tor-001"
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
      db.timeOffRequest.findFirst.mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost/api/timecards/time-off-requests/nonexistent"
      );
      const response = await getTimeOffRequest(request, {
        params: Promise.resolve({ id: "nonexistent" }),
      });

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe("TimeOffRequest not found");
    });

    it("should enforce tenant isolation on detail queries", async () => {
      db.timeOffRequest.findFirst.mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost/api/timecards/time-off-requests/tor-001"
      );
      await getTimeOffRequest(request, {
        params: Promise.resolve({ id: "tor-001" }),
      });

      expect(db.timeOffRequest.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: "tor-001",
            tenantId: TEST_TENANT_ID,
            deletedAt: null,
          },
        })
      );
    });

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const request = new NextRequest(
        "http://localhost/api/timecards/time-off-requests/tor-001"
      );
      const response = await getTimeOffRequest(request, {
        params: Promise.resolve({ id: "tor-001" }),
      });

      expect(response.status).toBe(401);
    });
  });

  // ============================================ TIME-OFF REQUEST APPROVE
  describe("POST /api/timecards/time-off-requests/commands/approve", () => {
    beforeEach(() => {
      mockAuthenticatedUser();
    });

    it("should return 401 for unauthenticated requests", async () => {
      await mockUnauthenticated();

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ id: "tor-001" }),
        }
      );
      const response = await approveTimeOff(request, {
        params: Promise.resolve({
          entity: "TimeOffRequest",
          command: "approve",
        }),
      });

      expect(response.status).toBe(401);
    });

    it("should approve a time-off request through manifest runtime", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            result: { id: "tor-001", status: "approved" },
            events: [],
          }),
          { status: 200 }
        )
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ id: "tor-001" }),
        }
      );
      const response = await approveTimeOff(request, {
        params: Promise.resolve({
          entity: "TimeOffRequest",
          command: "approve",
        }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.result.status).toBe("approved");

      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "TimeOffRequest",
          command: "approve",
          body: expect.objectContaining({ id: "tor-001" }),
          user: expect.objectContaining({
            id: TEST_USER_ID,
            tenantId: TEST_TENANT_ID,
          }),
        })
      );
    });

    it("should return 403 on policy denial", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            error: "Access denied",
            kind: "policy_denied",
            policyDenial: { policyName: "ManagerOnlyPolicy" },
          }),
          { status: 403 }
        )
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ id: "tor-001" }),
        }
      );
      const response = await approveTimeOff(request, {
        params: Promise.resolve({
          entity: "TimeOffRequest",
          command: "approve",
        }),
      });

      expect(response.status).toBe(403);
    });

    it("should return 422 on guard failure", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            error: "Guard 0 failed: Request is already processed",
            kind: "guard_failed",
            guardFailure: {
              index: 0,
              formatted: "Request is already processed",
            },
          }),
          { status: 422 }
        )
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ id: "tor-001" }),
        }
      );
      const response = await approveTimeOff(request, {
        params: Promise.resolve({
          entity: "TimeOffRequest",
          command: "approve",
        }),
      });

      expect(response.status).toBe(422);
    });

    it("should return 500 on unexpected error", async () => {
      vi.mocked(runManifestCommand).mockRejectedValue(
        new Error("Runtime crash")
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ id: "tor-001" }),
        }
      );
      const response = await approveTimeOff(request, {
        params: Promise.resolve({
          entity: "TimeOffRequest",
          command: "approve",
        }),
      });

      expect(response.status).toBe(500);
    });
  });

  // ============================================ TIME-OFF REQUEST REJECT
  describe("POST /api/timecards/time-off-requests/commands/reject", () => {
    beforeEach(() => {
      mockAuthenticatedUser();
    });

    it("should return 401 for unauthenticated requests", async () => {
      await mockUnauthenticated();

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ id: "tor-001" }),
        }
      );
      const response = await rejectTimeOff(request, {
        params: Promise.resolve({
          entity: "TimeOffRequest",
          command: "reject",
        }),
      });

      expect(response.status).toBe(401);
    });

    it("should reject a time-off request through manifest runtime", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            result: { id: "tor-001", status: "rejected" },
            events: [],
          }),
          { status: 200 }
        )
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({
            id: "tor-001",
            reason: "Insufficient staffing",
          }),
        }
      );
      const response = await rejectTimeOff(request, {
        params: Promise.resolve({
          entity: "TimeOffRequest",
          command: "reject",
        }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.result.status).toBe("rejected");

      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "TimeOffRequest",
          command: "reject",
          body: expect.objectContaining({
            id: "tor-001",
            reason: "Insufficient staffing",
          }),
          user: expect.objectContaining({
            id: TEST_USER_ID,
            tenantId: TEST_TENANT_ID,
          }),
        })
      );
    });

    it("should return 403 on policy denial", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            error: "Access denied",
            kind: "policy_denied",
            policyDenial: { policyName: "ManagerOnlyPolicy" },
          }),
          { status: 403 }
        )
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ id: "tor-001" }),
        }
      );
      const response = await rejectTimeOff(request, {
        params: Promise.resolve({
          entity: "TimeOffRequest",
          command: "reject",
        }),
      });

      expect(response.status).toBe(403);
    });

    it("should return 400 when command fails without policy/guard", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            error: "Request not found",
            kind: "command_failed",
          }),
          { status: 400 }
        )
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ id: "nonexistent" }),
        }
      );
      const response = await rejectTimeOff(request, {
        params: Promise.resolve({
          entity: "TimeOffRequest",
          command: "reject",
        }),
      });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Request not found");
    });

    it("should return 500 on unexpected error", async () => {
      vi.mocked(runManifestCommand).mockRejectedValue(
        new Error("Runtime crash")
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ id: "tor-001" }),
        }
      );
      const response = await rejectTimeOff(request, {
        params: Promise.resolve({
          entity: "TimeOffRequest",
          command: "reject",
        }),
      });

      expect(response.status).toBe(500);
    });
  });
});
