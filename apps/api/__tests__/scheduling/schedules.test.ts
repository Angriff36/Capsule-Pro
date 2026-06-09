/**
 * Schedule Domain API Tests
 *
 * Tests verify the schedule command endpoints (create, update, close, release)
 * with authentication, authorization, error handling, and runManifestCommand
 * integration.
 *
 * All schedule routes are manifest command handlers (POST only).
 * There are no list/detail GET routes for this domain.
 */

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --- Standard infrastructure mocks for manifest dispatcher ---

vi.mock("@/lib/manifest/execute-command", () => ({
  runManifestCommand: vi.fn(),
}));
vi.mock("@/lib/manifest-response", () => ({
  manifestSuccessResponse: vi.fn((data, status = 200) =>
    new Response(JSON.stringify({ success: true, ...data }), { status })
  ),
  manifestErrorResponse: vi.fn((data, status = 400) =>
    new Response(
      JSON.stringify({
        success: false,
        ...(typeof data === "string" ? { message: data } : data),
      }),
      { status }
    )
  ),
}));
vi.mock("@/app/lib/invariant", () => ({
  InvariantError: class extends Error {
    name = "InvariantError";
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

// Keep existing mocks
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
  requireCurrentUser: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

// Safety net
vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(),
}));

// --- Import mocked modules ---

const { requireCurrentUser } = await import("@/app/lib/tenant");
const { runManifestCommand } = await import(
  "@/lib/manifest/execute-command"
);

// --- Route imports ---

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

// --- Constants ---

const TEST_TENANT_ID = "00000000-0000-0000-0000-000000000002";
const TEST_USER_ID = "user_schedule_test";

// --- Helpers ---

function makeCommandRequest(path: string, body: Record<string, unknown> = {}) {
  return new NextRequest(`http://localhost/api/schedule/${path}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function mockCurrentUser() {
  vi.mocked(requireCurrentUser).mockResolvedValue({
    id: TEST_USER_ID,
    tenantId: TEST_TENANT_ID,
    role: "admin",
    email: "test@test.com",
    firstName: "Test",
    lastName: "User",
  } as never);
}

function mockManifestSuccess(result: Record<string, unknown> = {}) {
  vi.mocked(runManifestCommand).mockResolvedValue(
    new Response(
      JSON.stringify({ success: true, result: { id: "schedule-001", ...result }, events: [] }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  );
}

function mockManifestError(message: string, status = 400) {
  vi.mocked(runManifestCommand).mockResolvedValue(
    new Response(
      JSON.stringify({ success: false, message }),
      { status, headers: { "Content-Type": "application/json" } }
    )
  );
}

describe("Schedule Command API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentUser();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ================================================================== CREATE
  describe("POST /api/schedule/create", () => {
    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        Object.assign(new Error("Unauthenticated"), { name: "InvariantError" })
      );

      const request = makeCommandRequest("create", {
        name: "Monday Dinner",
        date: "2026-05-04",
      });
      const createSchedule = await getCreateSchedule();
      const response = await createSchedule(request);

      expect(response.status).toBe(401);
    });

    it("should create a schedule through runManifestCommand", async () => {
      mockManifestSuccess({ id: "schedule-001" });

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

      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "Schedule",
          command: "create",
          body: expect.objectContaining({
            name: "Monday Dinner",
            date: "2026-05-04",
            stationIds: ["station-1", "station-2"],
          }),
          user: expect.objectContaining({
            id: TEST_USER_ID,
            tenantId: TEST_TENANT_ID,
          }),
        })
      );
    });

    it("should pass user context to runManifestCommand", async () => {
      mockManifestSuccess({ id: "schedule-002" });

      const request = makeCommandRequest("create", { name: "Test" });
      const createSchedule = await getCreateSchedule();
      await createSchedule(request);

      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.objectContaining({
            id: TEST_USER_ID,
            tenantId: TEST_TENANT_ID,
          }),
        })
      );
    });

    it("should return 403 on policy denial", async () => {
      mockManifestError("Access denied by policy ManagerOnlyPolicy", 403);

      const request = makeCommandRequest("create", { name: "Unauthorized" });
      const createSchedule = await getCreateSchedule();
      const response = await createSchedule(request);

      expect(response.status).toBe(403);
    });

    it("should return 422 on guard failure", async () => {
      mockManifestError("Guard 1 failed: Cannot create schedule for past date", 422);

      const request = makeCommandRequest("create", {
        name: "Past Schedule",
        date: "2020-01-01",
      });
      const createSchedule = await getCreateSchedule();
      const response = await createSchedule(request);

      expect(response.status).toBe(422);
    });

    it("should return 400 on generic command failure", async () => {
      mockManifestError("Invalid schedule data", 400);

      const request = makeCommandRequest("create", {});
      const createSchedule = await getCreateSchedule();
      const response = await createSchedule(request);

      expect(response.status).toBe(400);
    });

    it("should return 500 on unexpected runtime exception", async () => {
      vi.mocked(runManifestCommand).mockRejectedValue(new Error("Runtime crash"));

      const request = makeCommandRequest("create", { name: "Crash" });
      const createSchedule = await getCreateSchedule();
      const response = await createSchedule(request);

      expect(response.status).toBe(500);
    });
  });

  // ================================================================== UPDATE
  describe("POST /api/schedule/update", () => {
    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        Object.assign(new Error("Unauthenticated"), { name: "InvariantError" })
      );

      const request = makeCommandRequest("update", { id: "schedule-001" });
      const updateSchedule = await getUpdateSchedule();
      const response = await updateSchedule(request);

      expect(response.status).toBe(401);
    });

    it("should update a schedule through runManifestCommand", async () => {
      mockManifestSuccess({ id: "schedule-001", name: "Updated Dinner" });

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

      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "Schedule",
          command: "update",
          body: expect.objectContaining({
            id: "schedule-001",
            name: "Updated Dinner",
            notes: "Changed menu items",
          }),
        })
      );
    });

    it("should return 403 on policy denial", async () => {
      mockManifestError("Access denied by policy ScheduleOwnerPolicy", 403);

      const request = makeCommandRequest("update", { id: "schedule-001" });
      const updateSchedule = await getUpdateSchedule();
      const response = await updateSchedule(request);

      expect(response.status).toBe(403);
    });

    it("should return 422 on guard failure", async () => {
      mockManifestError("Guard 0 failed: Cannot update a closed schedule", 422);

      const request = makeCommandRequest("update", { id: "schedule-001" });
      const updateSchedule = await getUpdateSchedule();
      const response = await updateSchedule(request);

      expect(response.status).toBe(422);
    });

    it("should return 400 on generic command failure", async () => {
      mockManifestError("Schedule not found", 400);

      const request = makeCommandRequest("update", { id: "nonexistent" });
      const updateSchedule = await getUpdateSchedule();
      const response = await updateSchedule(request);

      expect(response.status).toBe(400);
    });

    it("should return 500 on unexpected error", async () => {
      vi.mocked(runManifestCommand).mockRejectedValue(new Error("Unexpected failure"));

      const request = makeCommandRequest("update", { id: "schedule-001" });
      const updateSchedule = await getUpdateSchedule();
      const response = await updateSchedule(request);

      expect(response.status).toBe(500);
    });
  });

  // =================================================================== CLOSE
  describe("POST /api/schedule/close", () => {
    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        Object.assign(new Error("Unauthenticated"), { name: "InvariantError" })
      );

      const request = makeCommandRequest("close", { id: "schedule-001" });
      const closeSchedule = await getCloseSchedule();
      const response = await closeSchedule(request);

      expect(response.status).toBe(401);
    });

    it("should close a schedule through runManifestCommand", async () => {
      mockManifestSuccess({ id: "schedule-001", status: "closed" });

      const request = makeCommandRequest("close", { id: "schedule-001" });
      const closeSchedule = await getCloseSchedule();
      const response = await closeSchedule(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);

      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "Schedule",
          command: "close",
          body: expect.objectContaining({ id: "schedule-001" }),
        })
      );
    });

    it("should return 403 on policy denial for close", async () => {
      mockManifestError("Access denied by policy AdminOnlyPolicy", 403);

      const request = makeCommandRequest("close", { id: "schedule-001" });
      const closeSchedule = await getCloseSchedule();
      const response = await closeSchedule(request);

      expect(response.status).toBe(403);
    });

    it("should return 422 on guard failure for close", async () => {
      mockManifestError("Guard 0 failed: Schedule already closed", 422);

      const request = makeCommandRequest("close", { id: "schedule-001" });
      const closeSchedule = await getCloseSchedule();
      const response = await closeSchedule(request);

      expect(response.status).toBe(422);
    });

    it("should return 400 on generic command failure for close", async () => {
      mockManifestError("Close operation failed", 400);

      const request = makeCommandRequest("close", { id: "schedule-001" });
      const closeSchedule = await getCloseSchedule();
      const response = await closeSchedule(request);

      expect(response.status).toBe(400);
    });

    it("should return 500 on unexpected error for close", async () => {
      vi.mocked(runManifestCommand).mockRejectedValue(new Error("Database timeout"));

      const request = makeCommandRequest("close", { id: "schedule-001" });
      const closeSchedule = await getCloseSchedule();
      const response = await closeSchedule(request);

      expect(response.status).toBe(500);
    });
  });

  // ================================================================= RELEASE
  describe("POST /api/schedule/release", () => {
    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        Object.assign(new Error("Unauthenticated"), { name: "InvariantError" })
      );

      const request = makeCommandRequest("release", { id: "schedule-001" });
      const releaseSchedule = await getReleaseSchedule();
      const response = await releaseSchedule(request);

      expect(response.status).toBe(401);
    });

    it("should release a schedule through runManifestCommand", async () => {
      mockManifestSuccess({ id: "schedule-001", status: "released" });

      const request = makeCommandRequest("release", { id: "schedule-001" });
      const releaseSchedule = await getReleaseSchedule();
      const response = await releaseSchedule(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);

      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "Schedule",
          command: "release",
          body: expect.objectContaining({ id: "schedule-001" }),
        })
      );
    });

    it("should return 403 on policy denial for release", async () => {
      mockManifestError("Access denied by policy ReleasePolicy", 403);

      const request = makeCommandRequest("release", { id: "schedule-001" });
      const releaseSchedule = await getReleaseSchedule();
      const response = await releaseSchedule(request);

      expect(response.status).toBe(403);
    });

    it("should return 422 on guard failure for release", async () => {
      mockManifestError("Guard 2 failed: Cannot release a draft schedule", 422);

      const request = makeCommandRequest("release", { id: "schedule-001" });
      const releaseSchedule = await getReleaseSchedule();
      const response = await releaseSchedule(request);

      expect(response.status).toBe(422);
    });

    it("should return 400 on generic command failure for release", async () => {
      mockManifestError("Release blocked", 400);

      const request = makeCommandRequest("release", { id: "schedule-001" });
      const releaseSchedule = await getReleaseSchedule();
      const response = await releaseSchedule(request);

      expect(response.status).toBe(400);
    });

    it("should return 500 on unexpected error for release", async () => {
      vi.mocked(runManifestCommand).mockRejectedValue(new Error("Network failure"));

      const request = makeCommandRequest("release", { id: "schedule-001" });
      const releaseSchedule = await getReleaseSchedule();
      const response = await releaseSchedule(request);

      expect(response.status).toBe(500);
    });

    it("should pass the full request body to runManifestCommand", async () => {
      mockManifestSuccess({ id: "schedule-001" });

      const payload = {
        id: "schedule-001",
        notifyStaff: true,
        effectiveDate: "2026-05-04",
      };
      const request = makeCommandRequest("release", payload);
      const releaseSchedule = await getReleaseSchedule();
      await releaseSchedule(request);

      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          command: "release",
          body: payload,
        })
      );
    });
  });

  // ============================================================ CROSS-CUTTING
  describe("Cross-cutting concerns", () => {
    it("should not call runManifestCommand when authentication fails", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        Object.assign(new Error("Unauthenticated"), { name: "InvariantError" })
      );

      const request = makeCommandRequest("create", { name: "Test" });
      const createSchedule = await getCreateSchedule();
      await createSchedule(request);

      expect(runManifestCommand).not.toHaveBeenCalled();
    });

    it("should handle requireCurrentUser throwing a non-InvariantError exception", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(new Error("Auth service down"));

      const request = makeCommandRequest("create", { name: "Test" });
      const createSchedule = await getCreateSchedule();
      const response = await createSchedule(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.success).toBe(false);
    });

    it("should handle malformed JSON body gracefully", async () => {
      const request = new NextRequest("http://localhost/api/schedule/create", {
        method: "POST",
        body: "not valid json {{{",
        headers: { "Content-Type": "application/json" },
      });
      const createSchedule = await getCreateSchedule();
      const response = await createSchedule(request);

      // Dispatcher catches JSON parse errors via .catch(() => ({}))
      // So it should still call runManifestCommand with empty body
      expect(response.status).toBe(200);
    });

    it("should always use entity 'Schedule' for all commands", async () => {
      mockManifestSuccess();

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

      for (const { fn, path } of commands) {
        const request = makeCommandRequest(path, { id: "schedule-x" });
        await fn(request);
      }

      for (const call of vi.mocked(runManifestCommand).mock.calls) {
        expect(call[0].entity).toBe("Schedule");
      }
    });
  });
});
