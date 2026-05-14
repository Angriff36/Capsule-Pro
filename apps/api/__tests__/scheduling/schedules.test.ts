/**
 * Schedule Domain API Tests
 *
 * Tests verify the schedule command endpoints (create, update, close, release)
 * with authentication, authorization, error handling, and manifest runtime
 * integration.
 *
 * All schedule routes are manifest command handlers (POST only).
 * There are no list/detail GET routes for this domain.
 */

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Schedule command params for manifest dispatcher
const scheduleParams = (command: string) => ({
  params: Promise.resolve({ entity: "Schedule", command }),
});

// Helper functions to get POST handlers with params bound
async function getCreateSchedule() {
  const mod = await import(
    "@/app/api/manifest/[entity]/commands/[command]/route"
  );
  return (req: NextRequest) => mod.POST(req, scheduleParams("create"));
}

async function getUpdateSchedule() {
  const mod = await import(
    "@/app/api/manifest/[entity]/commands/[command]/route"
  );
  return (req: NextRequest) => mod.POST(req, scheduleParams("update"));
}

async function getCloseSchedule() {
  const mod = await import(
    "@/app/api/manifest/[entity]/commands/[command]/route"
  );
  return (req: NextRequest) => mod.POST(req, scheduleParams("close"));
}

async function getReleaseSchedule() {
  const mod = await import(
    "@/app/api/manifest/[entity]/commands/[command]/route"
  );
  return (req: NextRequest) => mod.POST(req, scheduleParams("release"));
}

// Mock dependencies
vi.mock("@repo/database", () => ({
  database: {
    schedule: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));
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

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg } = await import("@/app/lib/tenant");
const { createManifestRuntime } = await import("@/lib/manifest-runtime");

const TEST_TENANT_ID = "00000000-0000-0000-0000-000000000002";
const TEST_USER_ID = "user_schedule_test";
const TEST_ORG_ID = "org_schedule_test";

function makeCommandRequest(path: string, body: Record<string, unknown> = {}) {
  return new NextRequest(`http://localhost/api/schedule/${path}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function makeAuthedUser() {
  vi.mocked(auth).mockResolvedValue({
    userId: TEST_USER_ID,
    orgId: TEST_ORG_ID,
  } as never);
  vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
}

function makeRuntime(mockRunCommand: ReturnType<typeof vi.fn>) {
  vi.mocked(createManifestRuntime).mockResolvedValue({
    runCommand: mockRunCommand,
  } as never);
}

describe("Schedule Command API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    makeAuthedUser();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ================================================================== CREATE
  describe("POST /api/schedule/create", () => {
    const mockRunCommand = vi.fn();

    beforeEach(() => {
      makeRuntime(mockRunCommand);
    });

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const request = makeCommandRequest("create", {
        name: "Monday Dinner",
        date: "2026-05-04",
      });
      const createSchedule = await getCreateSchedule();
      const response = await createSchedule(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Unauthorized");
    });

    it("should return 400 when tenant not found", async () => {
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const request = makeCommandRequest("create", {
        name: "Monday Dinner",
        date: "2026-05-04",
      });
      const createSchedule = await getCreateSchedule();
      const response = await createSchedule(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Tenant not found");
    });

    it("should create a schedule through manifest runtime", async () => {
      mockRunCommand.mockResolvedValue({
        success: true,
        result: { id: "schedule-001" },
        emittedEvents: [{ type: "ScheduleCreated" }],
      });

      const request = makeCommandRequest("create", {
        name: "Monday Dinner",
        date: "2026-05-04",
        stationIds: ["station-1", "station-2"],
      });
      const createSchedule = await getCreateSchedule();
      const response = await createSchedule(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.result).toEqual({ id: "schedule-001" });
      expect(body.events).toEqual([{ type: "ScheduleCreated" }]);

      expect(mockRunCommand).toHaveBeenCalledWith(
        "create",
        expect.objectContaining({
          name: "Monday Dinner",
          date: "2026-05-04",
          stationIds: ["station-1", "station-2"],
        }),
        { entityName: "Schedule" }
      );
    });

    it("should pass user context to manifest runtime", async () => {
      mockRunCommand.mockResolvedValue({
        success: true,
        result: { id: "schedule-002" },
        emittedEvents: [],
      });

      const request = makeCommandRequest("create", { name: "Test" });
      const createSchedule = await getCreateSchedule();
      await createSchedule(request);

      expect(createManifestRuntime).toHaveBeenCalledWith({
        user: { id: TEST_USER_ID, tenantId: TEST_TENANT_ID },
      });
    });

    it("should return 403 on policy denial", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        policyDenial: { policyName: "ManagerOnlyPolicy" },
      });

      const request = makeCommandRequest("create", { name: "Unauthorized" });
      const createSchedule = await getCreateSchedule();
      const response = await createSchedule(request);

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toContain("Access denied");
      expect(body.message).toContain("ManagerOnlyPolicy");
    });

    it("should return 422 on guard failure", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        guardFailure: {
          index: 1,
          formatted: "Cannot create schedule for past date",
        },
      });

      const request = makeCommandRequest("create", {
        name: "Past Schedule",
        date: "2020-01-01",
      });
      const createSchedule = await getCreateSchedule();
      const response = await createSchedule(request);

      expect(response.status).toBe(422);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toContain("Guard 1 failed");
      expect(body.message).toContain("Cannot create schedule for past date");
    });

    it("should return 400 on generic command failure", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        error: "Invalid schedule data",
      });

      const request = makeCommandRequest("create", {});
      const createSchedule = await getCreateSchedule();
      const response = await createSchedule(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Invalid schedule data");
    });

    it("should return 400 with default message when error is null", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        error: null,
      });

      const request = makeCommandRequest("create", {});
      const createSchedule = await getCreateSchedule();
      const response = await createSchedule(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.message).toBe("Command failed");
    });

    it("should return 500 on unexpected runtime exception", async () => {
      mockRunCommand.mockRejectedValue(new Error("Runtime crash"));

      const request = makeCommandRequest("create", { name: "Crash" });
      const createSchedule = await getCreateSchedule();
      const response = await createSchedule(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Internal server error");
    });
  });

  // ================================================================== UPDATE
  describe("POST /api/schedule/update", () => {
    const mockRunCommand = vi.fn();

    beforeEach(() => {
      makeRuntime(mockRunCommand);
    });

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const request = makeCommandRequest("update", { id: "schedule-001" });
      const updateSchedule = await getUpdateSchedule();
      const response = await updateSchedule(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Unauthorized");
    });

    it("should return 400 when tenant not found", async () => {
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const request = makeCommandRequest("update", { id: "schedule-001" });
      const updateSchedule = await getUpdateSchedule();
      const response = await updateSchedule(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Tenant not found");
    });

    it("should update a schedule through manifest runtime", async () => {
      mockRunCommand.mockResolvedValue({
        success: true,
        result: { id: "schedule-001", name: "Updated Dinner" },
        emittedEvents: [{ type: "ScheduleUpdated" }],
      });

      const request = makeCommandRequest("update", {
        id: "schedule-001",
        name: "Updated Dinner",
        notes: "Changed menu items",
      });
      const updateSchedule = await getUpdateSchedule();
      const response = await updateSchedule(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.result).toEqual({
        id: "schedule-001",
        name: "Updated Dinner",
      });

      expect(mockRunCommand).toHaveBeenCalledWith(
        "update",
        expect.objectContaining({
          id: "schedule-001",
          name: "Updated Dinner",
          notes: "Changed menu items",
        }),
        { entityName: "Schedule" }
      );
    });

    it("should return 403 on policy denial", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        policyDenial: { policyName: "ScheduleOwnerPolicy" },
      });

      const request = makeCommandRequest("update", { id: "schedule-001" });
      const updateSchedule = await getUpdateSchedule();
      const response = await updateSchedule(request);

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toContain("Access denied");
      expect(body.message).toContain("ScheduleOwnerPolicy");
    });

    it("should return 422 on guard failure", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        guardFailure: {
          index: 0,
          formatted: "Cannot update a closed schedule",
        },
      });

      const request = makeCommandRequest("update", { id: "schedule-001" });
      const updateSchedule = await getUpdateSchedule();
      const response = await updateSchedule(request);

      expect(response.status).toBe(422);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toContain("Guard 0 failed");
      expect(body.message).toContain("Cannot update a closed schedule");
    });

    it("should return 400 on generic command failure", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        error: "Schedule not found",
      });

      const request = makeCommandRequest("update", { id: "nonexistent" });
      const updateSchedule = await getUpdateSchedule();
      const response = await updateSchedule(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Schedule not found");
    });

    it("should return 500 on unexpected error", async () => {
      mockRunCommand.mockRejectedValue(new Error("Unexpected failure"));

      const request = makeCommandRequest("update", { id: "schedule-001" });
      const updateSchedule = await getUpdateSchedule();
      const response = await updateSchedule(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Internal server error");
    });
  });

  // =================================================================== CLOSE
  describe("POST /api/schedule/close", () => {
    const mockRunCommand = vi.fn();

    beforeEach(() => {
      makeRuntime(mockRunCommand);
    });

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const request = makeCommandRequest("close", { id: "schedule-001" });
      const closeSchedule = await getCloseSchedule();
      const response = await closeSchedule(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Unauthorized");
    });

    it("should return 400 when tenant not found", async () => {
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const request = makeCommandRequest("close", { id: "schedule-001" });
      const closeSchedule = await getCloseSchedule();
      const response = await closeSchedule(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Tenant not found");
    });

    it("should close a schedule through manifest runtime", async () => {
      mockRunCommand.mockResolvedValue({
        success: true,
        result: { id: "schedule-001", status: "closed" },
        emittedEvents: [{ type: "ScheduleClosed" }],
      });

      const request = makeCommandRequest("close", { id: "schedule-001" });
      const closeSchedule = await getCloseSchedule();
      const response = await closeSchedule(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.result).toEqual({ id: "schedule-001", status: "closed" });
      expect(body.events).toEqual([{ type: "ScheduleClosed" }]);

      expect(mockRunCommand).toHaveBeenCalledWith(
        "close",
        expect.objectContaining({ id: "schedule-001" }),
        { entityName: "Schedule" }
      );
    });

    it("should return 403 on policy denial for close", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        policyDenial: { policyName: "AdminOnlyPolicy" },
      });

      const request = makeCommandRequest("close", { id: "schedule-001" });
      const closeSchedule = await getCloseSchedule();
      const response = await closeSchedule(request);

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toContain("Access denied");
      expect(body.message).toContain("AdminOnlyPolicy");
    });

    it("should return 422 on guard failure for close", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        guardFailure: {
          index: 0,
          formatted: "Schedule already closed",
        },
      });

      const request = makeCommandRequest("close", { id: "schedule-001" });
      const closeSchedule = await getCloseSchedule();
      const response = await closeSchedule(request);

      expect(response.status).toBe(422);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toContain("Guard 0 failed");
      expect(body.message).toContain("Schedule already closed");
    });

    it("should return 400 on generic command failure for close", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        error: "Close operation failed",
      });

      const request = makeCommandRequest("close", { id: "schedule-001" });
      const closeSchedule = await getCloseSchedule();
      const response = await closeSchedule(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Close operation failed");
    });

    it("should return 500 on unexpected error for close", async () => {
      mockRunCommand.mockRejectedValue(new Error("Database timeout"));

      const request = makeCommandRequest("close", { id: "schedule-001" });
      const closeSchedule = await getCloseSchedule();
      const response = await closeSchedule(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Internal server error");
    });
  });

  // ================================================================= RELEASE
  describe("POST /api/schedule/release", () => {
    const mockRunCommand = vi.fn();

    beforeEach(() => {
      makeRuntime(mockRunCommand);
    });

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const request = makeCommandRequest("release", { id: "schedule-001" });
      const releaseSchedule = await getReleaseSchedule();
      const response = await releaseSchedule(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Unauthorized");
    });

    it("should return 400 when tenant not found", async () => {
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const request = makeCommandRequest("release", { id: "schedule-001" });
      const releaseSchedule = await getReleaseSchedule();
      const response = await releaseSchedule(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Tenant not found");
    });

    it("should release a schedule through manifest runtime", async () => {
      mockRunCommand.mockResolvedValue({
        success: true,
        result: { id: "schedule-001", status: "released" },
        emittedEvents: [{ type: "ScheduleReleased" }],
      });

      const request = makeCommandRequest("release", { id: "schedule-001" });
      const releaseSchedule = await getReleaseSchedule();
      const response = await releaseSchedule(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.result).toEqual({ id: "schedule-001", status: "released" });
      expect(body.events).toEqual([{ type: "ScheduleReleased" }]);

      expect(mockRunCommand).toHaveBeenCalledWith(
        "release",
        expect.objectContaining({ id: "schedule-001" }),
        { entityName: "Schedule" }
      );
    });

    it("should return 403 on policy denial for release", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        policyDenial: { policyName: "ReleasePolicy" },
      });

      const request = makeCommandRequest("release", { id: "schedule-001" });
      const releaseSchedule = await getReleaseSchedule();
      const response = await releaseSchedule(request);

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toContain("Access denied");
      expect(body.message).toContain("ReleasePolicy");
    });

    it("should return 422 on guard failure for release", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        guardFailure: {
          index: 2,
          formatted: "Cannot release a draft schedule",
        },
      });

      const request = makeCommandRequest("release", { id: "schedule-001" });
      const releaseSchedule = await getReleaseSchedule();
      const response = await releaseSchedule(request);

      expect(response.status).toBe(422);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toContain("Guard 2 failed");
      expect(body.message).toContain("Cannot release a draft schedule");
    });

    it("should return 400 on generic command failure for release", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        error: "Release blocked",
      });

      const request = makeCommandRequest("release", { id: "schedule-001" });
      const releaseSchedule = await getReleaseSchedule();
      const response = await releaseSchedule(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Release blocked");
    });

    it("should return 500 on unexpected error for release", async () => {
      mockRunCommand.mockRejectedValue(new Error("Network failure"));

      const request = makeCommandRequest("release", { id: "schedule-001" });
      const releaseSchedule = await getReleaseSchedule();
      const response = await releaseSchedule(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Internal server error");
    });

    it("should pass the full request body to runCommand", async () => {
      mockRunCommand.mockResolvedValue({
        success: true,
        result: { id: "schedule-001" },
        emittedEvents: [],
      });

      const payload = {
        id: "schedule-001",
        notifyStaff: true,
        effectiveDate: "2026-05-04",
      };
      const request = makeCommandRequest("release", payload);
      const releaseSchedule = await getReleaseSchedule();
      await releaseSchedule(request);

      expect(mockRunCommand).toHaveBeenCalledWith(
        "release",
        expect.objectContaining(payload),
        { entityName: "Schedule" }
      );
    });
  });

  // ============================================================ CROSS-CUTTING
  describe("Cross-cutting concerns", () => {
    const mockRunCommand = vi.fn();

    beforeEach(() => {
      makeRuntime(mockRunCommand);
    });

    it("should not call runCommand when authentication fails", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const request = makeCommandRequest("create", { name: "Test" });
      const createSchedule = await getCreateSchedule();
      await createSchedule(request);

      expect(createManifestRuntime).not.toHaveBeenCalled();
      expect(mockRunCommand).not.toHaveBeenCalled();
    });

    it("should not call runCommand when tenant is missing", async () => {
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const request = makeCommandRequest("create", { name: "Test" });
      const createSchedule = await getCreateSchedule();
      await createSchedule(request);

      expect(createManifestRuntime).not.toHaveBeenCalled();
      expect(mockRunCommand).not.toHaveBeenCalled();
    });

    it("should handle auth throwing an exception gracefully", async () => {
      vi.mocked(auth).mockRejectedValue(new Error("Auth service down"));

      const request = makeCommandRequest("create", { name: "Test" });
      const createSchedule = await getCreateSchedule();
      const response = await createSchedule(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Internal server error");
    });

    it("should handle getTenantIdForOrg throwing an exception", async () => {
      vi.mocked(getTenantIdForOrg).mockRejectedValue(
        new Error("Tenant lookup failed")
      );

      const request = makeCommandRequest("create", { name: "Test" });
      const createSchedule = await getCreateSchedule();
      const response = await createSchedule(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Internal server error");
    });

    it("should handle malformed JSON body gracefully", async () => {
      const request = new NextRequest("http://localhost/api/schedule/create", {
        method: "POST",
        body: "not valid json {{{",
        headers: { "Content-Type": "application/json" },
      });
      const createSchedule = await getCreateSchedule();
      const response = await createSchedule(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Internal server error");
    });

    it("should always use entityName 'Schedule' for all commands", async () => {
      mockRunCommand.mockResolvedValue({
        success: true,
        result: {},
        emittedEvents: [],
      });

      const createSchedule = await getCreateSchedule();
      const updateSchedule = await getUpdateSchedule();
      const closeSchedule = await getCloseSchedule();
      const releaseSchedule = await getReleaseSchedule();

      const commands = [
        { fn: createSchedule, action: "create", path: "create" },
        { fn: updateSchedule, action: "update", path: "update" },
        { fn: closeSchedule, action: "close", path: "close" },
        { fn: releaseSchedule, action: "release", path: "release" },
      ];

      for (const { fn, action, path } of commands) {
        const request = makeCommandRequest(path, { id: "schedule-x" });
        await fn(request);
      }

      for (const call of mockRunCommand.mock.calls) {
        expect(call[2]).toEqual({ entityName: "Schedule" });
      }
    });
  });
});
