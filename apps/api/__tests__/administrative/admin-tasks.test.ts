/**
 * Admin Task API Test Suite
 *
 * Tests all admin task CRUD endpoints:
 * - GET /api/administrative/tasks (list with filters and pagination)
 * - GET /api/administrative/tasks/[id] (detail by ID)
 * - PATCH /api/administrative/tasks/[id] (update fields or status transitions)
 * - DELETE /api/administrative/tasks/[id] (soft delete)
 * - POST /api/administrative/tasks (create via manifest command handler)
 * - POST /api/administrative/tasks/commands/create (create via manifest dispatcher)
 * - GET /api/administrative/tasks/list (manifest list with pagination clamps)
 */

import { database } from "@repo/database";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --- Standard infrastructure mocks for manifest dispatcher ---

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
    manifestErrorResponse: (message: string, status: number) =>
      NextResponse.json({ success: false, message }, { status }),
  };
});
vi.mock("@/app/lib/invariant", () => ({
  InvariantError: class extends Error {
    override name = "InvariantError";
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

// --- Existing mocks ---

vi.mock("@repo/database", () => ({
  database: {
    adminTask: {
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}));

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  requireCurrentUser: vi.fn(),
  resolveCurrentUser: vi.fn(),
}));

// Safety net
vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

// Alias @/lib/database to the same mock object.
vi.mock("@/lib/database", async () => {
  const { database } = await import("@repo/database");
  return { database };
});

vi.mock("@/lib/pagination", () => ({
  clampLimit: (v: string | null) => Number(v) || 20,
  clampOffset: (v: string | null) => Number(v) || 0,
}));

vi.mock("@repo/observability/log", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

// --- Import mocked modules ---

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg, resolveCurrentUser, requireCurrentUser } =
  await import("@/app/lib/tenant");
const { runManifestCommand } = await import("@/lib/manifest/execute-command");

// --- Route imports ---

import {
  DELETE as deleteTask,
  GET as getTaskDetail,
  PATCH as patchTask,
} from "@/app/api/administrative/tasks/[id]/route";
import { GET as getTasksManifestList } from "@/app/api/administrative/tasks/list/route";
import {
  GET as getTasksList,
  POST as postTaskRoot,
} from "@/app/api/administrative/tasks/route";
import { POST as createTaskCommand } from "@/app/api/manifest/[entity]/commands/[command]/route";

// --- Constants ---

const TEST_TENANT_ID = "00000000-0000-0000-0000-000000000030";
const TEST_USER_ID = "user_admin_task_test";
const TEST_ORG_ID = "org_admin_task_test";
const TEST_TASK_ID = "task-00000000-0000-0000-000000000001";

// --- Helpers ---

function makeAuthedUser() {
  vi.mocked(auth).mockResolvedValue({
    orgId: TEST_ORG_ID,
    userId: TEST_USER_ID,
  } as never);
  vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
}

function makeRequest(url: string, options: RequestInit = {}): NextRequest {
  if (options.body && !options.headers) {
    options.headers = { "Content-Type": "application/json" };
  }
  return new NextRequest(
    new URL(url, "http://localhost:3000"),
    options as never
  );
}

function sampleTask(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_TASK_ID,
    tenantId: TEST_TENANT_ID,
    title: "Test Admin Task",
    description: "A test admin task",
    status: "backlog",
    priority: "medium",
    category: "general",
    assignedTo: null,
    createdBy: TEST_USER_ID,
    dueDate: null,
    sourceType: null,
    sourceId: null,
    deletedAt: null,
    createdAt: new Date("2026-01-15"),
    updatedAt: new Date("2026-01-15"),
    ...overrides,
  } as Record<string, unknown>;
}

function mockResolveCurrentUser() {
  vi.mocked(resolveCurrentUser).mockResolvedValue({
    id: TEST_USER_ID,
    tenantId: TEST_TENANT_ID,
    role: "admin",
    email: "test@test.com",
    firstName: "Test",
    lastName: "User",
  } as never);
}

function mockRequireCurrentUser() {
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
      JSON.stringify({
        success: true,
        result: { id: "test-id", ...result },
        events: [],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  );
}

// --- Tests ---

describe("Admin Task API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    makeAuthedUser();
    mockResolveCurrentUser();
    mockRequireCurrentUser();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ================================================================== GET LIST
  describe("GET /api/administrative/tasks", () => {
    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: null } as never);

      const response = await getTasksList(
        makeRequest("/api/administrative/tasks")
      );
      expect(response.status).toBe(401);

      const body = await response.json();
      expect(body.message).toBe("Unauthorized");
    });

    it("should return tasks with default pagination", async () => {
      const tasks = [sampleTask(), sampleTask({ id: "task-002" })];
      vi.mocked(database.adminTask.count).mockResolvedValue(2);
      vi.mocked(database.adminTask.findMany).mockResolvedValue(tasks as never);

      const response = await getTasksList(
        makeRequest("/api/administrative/tasks")
      );
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.data).toHaveLength(2);
      expect(body.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      });
    });

    it("should apply status filter to query", async () => {
      vi.mocked(database.adminTask.count).mockResolvedValue(0);
      vi.mocked(database.adminTask.findMany).mockResolvedValue([]);

      await getTasksList(
        makeRequest("/api/administrative/tasks?status=review")
      );

      const findManyMock = vi.mocked(database.adminTask.findMany);
      const where = findManyMock.mock.calls[0]![0] as Record<string, unknown>;
      const andClauses = (
        where.where
          ? (where.where as { AND: unknown[] }).AND
          : (where as { AND: unknown[] }).AND
      ) as unknown[];
      expect(
        andClauses.some(
          (c) => (c as Record<string, unknown>).status === "review"
        )
      ).toBe(true);
    });

    it("should apply priority filter to query", async () => {
      vi.mocked(database.adminTask.count).mockResolvedValue(0);
      vi.mocked(database.adminTask.findMany).mockResolvedValue([]);

      await getTasksList(
        makeRequest("/api/administrative/tasks?priority=high")
      );

      const findManyMock = vi.mocked(database.adminTask.findMany);
      const where = findManyMock.mock.calls[0]![0] as Record<string, unknown>;
      const andClauses = (
        where.where
          ? (where.where as { AND: unknown[] }).AND
          : (where as { AND: unknown[] }).AND
      ) as unknown[];
      expect(
        andClauses.some(
          (c) => (c as Record<string, unknown>).priority === "high"
        )
      ).toBe(true);
    });

    it("should apply category filter to query", async () => {
      vi.mocked(database.adminTask.count).mockResolvedValue(0);
      vi.mocked(database.adminTask.findMany).mockResolvedValue([]);

      await getTasksList(
        makeRequest("/api/administrative/tasks?category=general")
      );

      const findManyMock = vi.mocked(database.adminTask.findMany);
      const where = findManyMock.mock.calls[0]![0] as Record<string, unknown>;
      const andClauses = (
        where.where
          ? (where.where as { AND: unknown[] }).AND
          : (where as { AND: unknown[] }).AND
      ) as unknown[];
      expect(
        andClauses.some(
          (c) => (c as Record<string, unknown>).category === "general"
        )
      ).toBe(true);
    });

    it("should apply assignedTo filter to query", async () => {
      vi.mocked(database.adminTask.count).mockResolvedValue(0);
      vi.mocked(database.adminTask.findMany).mockResolvedValue([]);
      const assigneeId = "11111111-1111-4111-a111-111111111111";

      const response = await getTasksList(
        makeRequest(`/api/administrative/tasks?assignedTo=${assigneeId}`)
      );
      expect(response.status).toBe(200);

      const findManyMock = vi.mocked(database.adminTask.findMany);
      const callArgs = findManyMock.mock.calls[0]![0] as Record<string, unknown>;
      const andClauses = ((callArgs.where ?? callArgs) as { AND: unknown[] })
        .AND as unknown[];
      expect(
        andClauses.some(
          (c) => (c as Record<string, unknown>).assignedTo === assigneeId
        )
      ).toBe(true);
    });

    it("should return 400 for invalid query parameters", async () => {
      const response = await getTasksList(
        makeRequest("/api/administrative/tasks?status=INVALID_STATUS")
      );
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.message).toBe("Invalid query parameters");
      expect(body.details).toBeDefined();
    });

    it("should return 400 for invalid limit parameter", async () => {
      const response = await getTasksList(
        makeRequest("/api/administrative/tasks?limit=0")
      );
      expect(response.status).toBe(400);
    });

    it("should calculate totalPages correctly", async () => {
      vi.mocked(database.adminTask.count).mockResolvedValue(45);
      vi.mocked(database.adminTask.findMany).mockResolvedValue([]);

      const response = await getTasksList(
        makeRequest("/api/administrative/tasks?limit=10")
      );
      const body = await response.json();
      expect(body.pagination.totalPages).toBe(5);
    });

    it("should pass page and limit to skip/take correctly", async () => {
      vi.mocked(database.adminTask.count).mockResolvedValue(100);
      vi.mocked(database.adminTask.findMany).mockResolvedValue([]);

      await getTasksList(
        makeRequest("/api/administrative/tasks?page=3&limit=5")
      );

      expect(database.adminTask.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10, // (3-1)*5
          take: 5,
        })
      );
    });

    it("should include tenantId and deletedAt:null in where clause", async () => {
      vi.mocked(database.adminTask.count).mockResolvedValue(0);
      vi.mocked(database.adminTask.findMany).mockResolvedValue([]);

      await getTasksList(makeRequest("/api/administrative/tasks"));

      const findManyMock = vi.mocked(database.adminTask.findMany);
      const where = findManyMock.mock.calls[0]![0] as Record<string, unknown>;
      const andClauses = (
        where.where
          ? (where.where as { AND: unknown[] }).AND
          : (where as { AND: unknown[] }).AND
      ) as unknown[];
      expect(
        andClauses.some(
          (c) => (c as Record<string, unknown>).tenantId === TEST_TENANT_ID
        )
      ).toBe(true);
      expect(
        andClauses.some(
          (c) => (c as Record<string, unknown>).deletedAt === null
        )
      ).toBe(true);
    });
  });

  // ================================================================== GET DETAIL
  describe("GET /api/administrative/tasks/[id]", () => {
    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: null } as never);

      const response = await getTaskDetail(
        makeRequest(`/api/administrative/tasks/${TEST_TASK_ID}`),
        { params: Promise.resolve({ id: TEST_TASK_ID }) }
      );
      expect(response.status).toBe(401);
    });

    it("should return a task by ID", async () => {
      const task = sampleTask();
      vi.mocked(database.adminTask.findFirst).mockResolvedValue(task as never);

      const response = await getTaskDetail(
        makeRequest(`/api/administrative/tasks/${TEST_TASK_ID}`),
        { params: Promise.resolve({ id: TEST_TASK_ID }) }
      );
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.data.id).toBe(TEST_TASK_ID);
      expect(body.data.title).toBe("Test Admin Task");
      expect(body.data.status).toBe("backlog");
      expect(body.data.tenantId).toBe(TEST_TENANT_ID);
    });

    it("should return 404 when task is not found", async () => {
      vi.mocked(database.adminTask.findFirst).mockResolvedValue(null);

      const response = await getTaskDetail(
        makeRequest(`/api/administrative/tasks/${TEST_TASK_ID}`),
        { params: Promise.resolve({ id: TEST_TASK_ID }) }
      );
      expect(response.status).toBe(404);

      const body = await response.json();
      expect(body.message).toBe("Task not found");
    });

    it("should query with tenant isolation and soft-delete filter", async () => {
      vi.mocked(database.adminTask.findFirst).mockResolvedValue(null);

      await getTaskDetail(
        makeRequest(`/api/administrative/tasks/${TEST_TASK_ID}`),
        { params: Promise.resolve({ id: TEST_TASK_ID }) }
      );

      expect(database.adminTask.findFirst).toHaveBeenCalledWith({
        where: {
          AND: [
            { tenantId: TEST_TENANT_ID },
            { id: TEST_TASK_ID },
            { deletedAt: null },
          ],
        },
      });
    });
  });

  // ================================================================== PATCH
  describe("PATCH /api/administrative/tasks/[id]", () => {
    it("should map status 'backlog' to moveToBacklog command", async () => {
      mockManifestSuccess();

      await patchTask(
        makeRequest(`/api/administrative/tasks/${TEST_TASK_ID}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "backlog" }),
        }),
        { params: Promise.resolve({ id: TEST_TASK_ID }) }
      );

      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "AdminTask",
          command: "moveToBacklog",
        })
      );
    });

    it("should map status 'in_progress' to startProgress command", async () => {
      mockManifestSuccess();

      await patchTask(
        makeRequest(`/api/administrative/tasks/${TEST_TASK_ID}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "in_progress" }),
        }),
        { params: Promise.resolve({ id: TEST_TASK_ID }) }
      );

      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "AdminTask",
          command: "startProgress",
        })
      );
    });

    it("should map status 'done' to complete command", async () => {
      mockManifestSuccess();

      await patchTask(
        makeRequest(`/api/administrative/tasks/${TEST_TASK_ID}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "done" }),
        }),
        { params: Promise.resolve({ id: TEST_TASK_ID }) }
      );

      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "AdminTask",
          command: "complete",
        })
      );
    });

    it("should map status 'cancelled' to cancel command", async () => {
      mockManifestSuccess();

      await patchTask(
        makeRequest(`/api/administrative/tasks/${TEST_TASK_ID}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "cancelled" }),
        }),
        { params: Promise.resolve({ id: TEST_TASK_ID }) }
      );

      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "AdminTask",
          command: "cancel",
        })
      );
    });

    it("should map status 'review' to submitForReview command", async () => {
      mockManifestSuccess();

      await patchTask(
        makeRequest(`/api/administrative/tasks/${TEST_TASK_ID}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "review" }),
        }),
        { params: Promise.resolve({ id: TEST_TASK_ID }) }
      );

      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "AdminTask",
          command: "submitForReview",
        })
      );
    });

    it("should return 400 for invalid status value", async () => {
      const response = await patchTask(
        makeRequest(`/api/administrative/tasks/${TEST_TASK_ID}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "invalid_status" }),
        }),
        { params: Promise.resolve({ id: TEST_TASK_ID }) }
      );
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.message).toContain("Invalid status");
    });

    it("should use update command when no status is provided", async () => {
      mockManifestSuccess();

      await patchTask(
        makeRequest(`/api/administrative/tasks/${TEST_TASK_ID}`, {
          method: "PATCH",
          body: JSON.stringify({ title: "Updated Title" }),
        }),
        { params: Promise.resolve({ id: TEST_TASK_ID }) }
      );

      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "AdminTask",
          command: "update",
        })
      );
    });
  });

  // ================================================================== DELETE
  describe("DELETE /api/administrative/tasks/[id]", () => {
    it("should call runManifestCommand with softDelete", async () => {
      mockManifestSuccess();

      await deleteTask(
        makeRequest(`/api/administrative/tasks/${TEST_TASK_ID}`, {
          method: "DELETE",
        }),
        { params: Promise.resolve({ id: TEST_TASK_ID }) }
      );

      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "AdminTask",
          command: "softDelete",
        })
      );
    });
  });

  // ================================================================== POST ROOT (manifest command handler)
  describe("POST /api/administrative/tasks (root route)", () => {
    it("should delegate to runManifestCommand", async () => {
      mockManifestSuccess();

      const body = { title: "New Task", description: "Task description" };
      const request = makeRequest("/api/administrative/tasks", {
        method: "POST",
        body: JSON.stringify(body),
      });

      await postTaskRoot(request);

      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "AdminTask",
          command: "create",
        })
      );
    });

    it("should pass body that injects createdBy and defaults", async () => {
      mockManifestSuccess();

      const body = { title: "New Task" };
      const request = makeRequest("/api/administrative/tasks", {
        method: "POST",
        body: JSON.stringify(body),
      });

      await postTaskRoot(request);

      const callArgs = vi.mocked(runManifestCommand).mock.calls[0]![0];
      expect(callArgs.body.createdBy).toBe(TEST_USER_ID);
      expect(callArgs.body.status).toBe("backlog");
      expect(callArgs.body.priority).toBe("medium");
    });
  });

  // ================================================================== POST COMMANDS/CREATE (manifest dispatcher)
  describe("POST /api/administrative/tasks/commands/create", () => {
    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        Object.assign(new Error("Unauthenticated"), { name: "InvariantError" })
      );

      const request = makeRequest("/api/administrative/tasks/commands/create", {
        method: "POST",
        body: JSON.stringify({ title: "New Task" }),
      });
      const response = await createTaskCommand(request, {
        params: Promise.resolve({ entity: "AdminTask", command: "create" }),
      });

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.success).toBe(false);
    });

    it("should return 200 on successful task creation via dispatcher", async () => {
      mockManifestSuccess({ id: "new-task-id" });

      const request = makeRequest("/api/administrative/tasks/commands/create", {
        method: "POST",
        body: JSON.stringify({ title: "New Task", priority: "high" }),
      });
      const response = await createTaskCommand(request, {
        params: Promise.resolve({ entity: "AdminTask", command: "create" }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
    });

    it("should pass correct entity, command, and body to runManifestCommand", async () => {
      mockManifestSuccess({ id: "new-task-id" });

      const payload = { title: "New Task", priority: "high" };
      const request = makeRequest("/api/administrative/tasks/commands/create", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      await createTaskCommand(request, {
        params: Promise.resolve({ entity: "AdminTask", command: "create" }),
      });

      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "AdminTask",
          command: "create",
          body: payload,
          user: expect.objectContaining({
            id: TEST_USER_ID,
            tenantId: TEST_TENANT_ID,
          }),
        })
      );
    });

    it("should return error response from runManifestCommand", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            message: "Access denied by policy AdminOnly",
          }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        )
      );

      const request = makeRequest("/api/administrative/tasks/commands/create", {
        method: "POST",
        body: JSON.stringify({ title: "New Task" }),
      });
      const response = await createTaskCommand(request, {
        params: Promise.resolve({ entity: "AdminTask", command: "create" }),
      });

      expect(response.status).toBe(403);
    });

    it("should return 422 from runManifestCommand guard failure", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            message: "Guard 1 failed: Title too short",
          }),
          { status: 422, headers: { "Content-Type": "application/json" } }
        )
      );

      const request = makeRequest("/api/administrative/tasks/commands/create", {
        method: "POST",
        body: JSON.stringify({ title: "A" }),
      });
      const response = await createTaskCommand(request, {
        params: Promise.resolve({ entity: "AdminTask", command: "create" }),
      });

      expect(response.status).toBe(422);
    });

    it("should return 400 on general command error from runManifestCommand", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        new Response(
          JSON.stringify({ success: false, message: "Something went wrong" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        )
      );

      const request = makeRequest("/api/administrative/tasks/commands/create", {
        method: "POST",
        body: JSON.stringify({ title: "New Task" }),
      });
      const response = await createTaskCommand(request, {
        params: Promise.resolve({ entity: "AdminTask", command: "create" }),
      });

      expect(response.status).toBe(400);
    });

    it("should return 500 on unexpected exception", async () => {
      vi.mocked(runManifestCommand).mockRejectedValue(
        new Error("DB connection lost")
      );

      const request = makeRequest("/api/administrative/tasks/commands/create", {
        method: "POST",
        body: JSON.stringify({ title: "New Task" }),
      });
      const response = await createTaskCommand(request, {
        params: Promise.resolve({ entity: "AdminTask", command: "create" }),
      });

      expect(response.status).toBe(500);
    });
  });

  // ================================================================== GET LIST (manifest projection)
  describe("GET /api/administrative/tasks/list (manifest list)", () => {
    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        orgId: null,
        userId: null,
      } as never);

      const response = await getTasksManifestList(
        makeRequest("/api/administrative/tasks/list")
      );
      expect(response.status).toBe(401);

      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Unauthorized");
    });

    it("should return tasks with limit and offset", async () => {
      const tasks = [sampleTask()];
      vi.mocked(database.adminTask.findMany).mockResolvedValue(tasks as never);

      const response = await getTasksManifestList(
        makeRequest("/api/administrative/tasks/list?limit=10&offset=0")
      );
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.adminTasks).toHaveLength(1);
      expect(body.limit).toBe(10);
      expect(body.offset).toBe(0);
    });

    it("should filter by tenantId and exclude soft-deleted tasks", async () => {
      vi.mocked(database.adminTask.findMany).mockResolvedValue([]);

      await getTasksManifestList(makeRequest("/api/administrative/tasks/list"));

      expect(database.adminTask.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: TEST_TENANT_ID,
            deletedAt: null,
          },
        })
      );
    });

    it("should return 500 on database error", async () => {
      vi.mocked(database.adminTask.findMany).mockRejectedValue(
        new Error("DB error")
      );

      const response = await getTasksManifestList(
        makeRequest("/api/administrative/tasks/list")
      );
      expect(response.status).toBe(500);

      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Internal server error");
    });
  });
});
