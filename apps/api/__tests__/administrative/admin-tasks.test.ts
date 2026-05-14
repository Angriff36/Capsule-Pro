/**
 * Admin Task API Test Suite
 *
 * Tests all admin task CRUD endpoints:
 * - GET /api/administrative/tasks (list with filters and pagination)
 * - GET /api/administrative/tasks/[id] (detail by ID)
 * - PATCH /api/administrative/tasks/[id] (update fields or status transitions)
 * - DELETE /api/administrative/tasks/[id] (soft delete)
 * - POST /api/administrative/tasks (create via manifest command handler)
 * - POST /api/administrative/tasks/commands/create (create via manifest runtime)
 * - GET /api/administrative/tasks/list (manifest list with pagination clamps)
 */

import { database } from "@repo/database";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

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
  requireCurrentUser: vi.fn().mockResolvedValue({
    id: TEST_USER_ID,
    tenantId: TEST_TENANT_ID,
    role: "admin",
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
  }),
}));

// Manifest command handler mock — used by PATCH, DELETE, and POST on the root route.
vi.mock("@/lib/manifest-command-handler", () => ({
  executeManifestCommand: vi.fn(),
}));

// Manifest runtime mock — used by POST /commands/create.
vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

// manifest-response is a thin wrapper — provide real implementations.
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

// Alias @/lib/database to the same mock object.
vi.mock("@/lib/database", async () => {
  const { database } = await import("@repo/database");
  return { database };
});

vi.mock("@/lib/pagination", () => ({
  clampLimit: (v: string | null) => Number(v) || 20,
  clampOffset: (v: string | null) => Number(v) || 0,
}));

// --- Import mocked modules ---

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg } = await import("@/app/lib/tenant");
const { executeManifestCommand } = await import(
  "@/lib/manifest-command-handler"
);
const { createManifestRuntime } = await import("@/lib/manifest-runtime");

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

function makeRuntime(mockRunCommand: ReturnType<typeof vi.fn>) {
  vi.mocked(createManifestRuntime).mockResolvedValue({
    runCommand: mockRunCommand,
  } as never);
}

// --- Tests ---

describe("Admin Task API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    makeAuthedUser();
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

      await getTasksList(makeRequest("/api/administrative/tasks?status=todo"));

      const findManyMock = vi.mocked(database.adminTask.findMany);
      const where = findManyMock.mock.calls[0][0] as Record<string, unknown>;
      const andClauses = (
        where.where
          ? (where.where as { AND: unknown[] }).AND
          : (where as { AND: unknown[] }).AND
      ) as unknown[];
      expect(
        andClauses.some((c) => (c as Record<string, unknown>).status === "todo")
      ).toBe(true);
    });

    it("should apply priority filter to query", async () => {
      vi.mocked(database.adminTask.count).mockResolvedValue(0);
      vi.mocked(database.adminTask.findMany).mockResolvedValue([]);

      await getTasksList(
        makeRequest("/api/administrative/tasks?priority=high")
      );

      const findManyMock = vi.mocked(database.adminTask.findMany);
      const where = findManyMock.mock.calls[0][0] as Record<string, unknown>;
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
      const where = findManyMock.mock.calls[0][0] as Record<string, unknown>;
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
      const callArgs = findManyMock.mock.calls[0][0] as Record<string, unknown>;
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
      const where = findManyMock.mock.calls[0][0] as Record<string, unknown>;
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
    it("should map status 'todo' to moveToTodo command", async () => {
      vi.mocked(executeManifestCommand).mockResolvedValue(
        new Response(JSON.stringify({ success: true }), {
          headers: { "Content-Type": "application/json" },
        })
      );

      await patchTask(
        makeRequest(`/api/administrative/tasks/${TEST_TASK_ID}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "todo" }),
        }),
        { params: Promise.resolve({ id: TEST_TASK_ID }) }
      );

      expect(executeManifestCommand).toHaveBeenCalledWith(
        expect.any(Request),
        expect.objectContaining({
          entityName: "AdminTask",
          commandName: "moveToTodo",
          params: { id: TEST_TASK_ID },
        })
      );
    });

    it("should map status 'in_progress' to startProgress command", async () => {
      vi.mocked(executeManifestCommand).mockResolvedValue(
        new Response(JSON.stringify({ success: true }), {
          headers: { "Content-Type": "application/json" },
        })
      );

      await patchTask(
        makeRequest(`/api/administrative/tasks/${TEST_TASK_ID}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "in_progress" }),
        }),
        { params: Promise.resolve({ id: TEST_TASK_ID }) }
      );

      expect(executeManifestCommand).toHaveBeenCalledWith(
        expect.any(Request),
        expect.objectContaining({
          entityName: "AdminTask",
          commandName: "startProgress",
        })
      );
    });

    it("should map status 'done' to complete command", async () => {
      vi.mocked(executeManifestCommand).mockResolvedValue(
        new Response(JSON.stringify({ success: true }), {
          headers: { "Content-Type": "application/json" },
        })
      );

      await patchTask(
        makeRequest(`/api/administrative/tasks/${TEST_TASK_ID}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "done" }),
        }),
        { params: Promise.resolve({ id: TEST_TASK_ID }) }
      );

      expect(executeManifestCommand).toHaveBeenCalledWith(
        expect.any(Request),
        expect.objectContaining({
          entityName: "AdminTask",
          commandName: "complete",
        })
      );
    });

    it("should map status 'cancelled' to cancel command", async () => {
      vi.mocked(executeManifestCommand).mockResolvedValue(
        new Response(JSON.stringify({ success: true }), {
          headers: { "Content-Type": "application/json" },
        })
      );

      await patchTask(
        makeRequest(`/api/administrative/tasks/${TEST_TASK_ID}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "cancelled" }),
        }),
        { params: Promise.resolve({ id: TEST_TASK_ID }) }
      );

      expect(executeManifestCommand).toHaveBeenCalledWith(
        expect.any(Request),
        expect.objectContaining({
          entityName: "AdminTask",
          commandName: "cancel",
        })
      );
    });

    it("should map status 'backlog' to reopen command", async () => {
      vi.mocked(executeManifestCommand).mockResolvedValue(
        new Response(JSON.stringify({ success: true }), {
          headers: { "Content-Type": "application/json" },
        })
      );

      await patchTask(
        makeRequest(`/api/administrative/tasks/${TEST_TASK_ID}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "backlog" }),
        }),
        { params: Promise.resolve({ id: TEST_TASK_ID }) }
      );

      expect(executeManifestCommand).toHaveBeenCalledWith(
        expect.any(Request),
        expect.objectContaining({
          entityName: "AdminTask",
          commandName: "reopen",
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
      vi.mocked(executeManifestCommand).mockResolvedValue(
        new Response(JSON.stringify({ success: true }), {
          headers: { "Content-Type": "application/json" },
        })
      );

      await patchTask(
        makeRequest(`/api/administrative/tasks/${TEST_TASK_ID}`, {
          method: "PATCH",
          body: JSON.stringify({ title: "Updated Title" }),
        }),
        { params: Promise.resolve({ id: TEST_TASK_ID }) }
      );

      expect(executeManifestCommand).toHaveBeenCalledWith(
        expect.any(Request),
        expect.objectContaining({
          entityName: "AdminTask",
          commandName: "update",
          params: { id: TEST_TASK_ID },
        })
      );
    });
  });

  // ================================================================== DELETE
  describe("DELETE /api/administrative/tasks/[id]", () => {
    it("should call executeManifestCommand with softDelete", async () => {
      vi.mocked(executeManifestCommand).mockResolvedValue(
        new Response(JSON.stringify({ success: true }), {
          headers: { "Content-Type": "application/json" },
        })
      );

      await deleteTask(
        makeRequest(`/api/administrative/tasks/${TEST_TASK_ID}`, {
          method: "DELETE",
        }),
        { params: Promise.resolve({ id: TEST_TASK_ID }) }
      );

      expect(executeManifestCommand).toHaveBeenCalledWith(
        expect.any(Request),
        expect.objectContaining({
          entityName: "AdminTask",
          commandName: "softDelete",
          params: { id: TEST_TASK_ID },
        })
      );
    });
  });

  // ================================================================== POST ROOT (manifest command handler)
  describe("POST /api/administrative/tasks (root route)", () => {
    it("should delegate to executeManifestCommand", async () => {
      vi.mocked(executeManifestCommand).mockResolvedValue(
        new Response(JSON.stringify({ success: true, result: {} }), {
          headers: { "Content-Type": "application/json" },
        })
      );

      const body = { title: "New Task", description: "Task description" };
      const request = makeRequest("/api/administrative/tasks", {
        method: "POST",
        body: JSON.stringify(body),
      });

      await postTaskRoot(request);

      expect(executeManifestCommand).toHaveBeenCalledWith(
        expect.any(Request),
        expect.objectContaining({
          entityName: "AdminTask",
          commandName: "create",
        })
      );
    });

    it("should pass transformBody that injects createdBy and defaults", async () => {
      vi.mocked(executeManifestCommand).mockResolvedValue(
        new Response(JSON.stringify({ success: true, result: {} }), {
          headers: { "Content-Type": "application/json" },
        })
      );

      const body = { title: "New Task" };
      const request = makeRequest("/api/administrative/tasks", {
        method: "POST",
        body: JSON.stringify(body),
      });

      await postTaskRoot(request);

      const options = vi.mocked(executeManifestCommand).mock.calls[0][1];
      const transformed = options.transformBody!(
        { title: "New Task" },
        {
          userId: TEST_USER_ID,
          tenantId: TEST_TENANT_ID,
          role: "admin",
        }
      );
      expect(transformed.createdBy).toBe(TEST_USER_ID);
      expect(transformed.status).toBe("backlog");
      expect(transformed.priority).toBe("medium");
    });
  });

  // ================================================================== POST COMMANDS/CREATE (manifest runtime)
  describe("POST /api/administrative/tasks/commands/create", () => {
    const mockRunCommand = vi.fn();

    beforeEach(() => {
      makeRuntime(mockRunCommand);
      vi.mocked(database.user.findFirst).mockResolvedValue({
        id: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        role: "admin",
        authUserId: TEST_USER_ID,
      } as never);
    });

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        orgId: null,
        userId: null,
      } as never);

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
      expect(body.message).toBe("Unauthorized");
    });

    it("should return 400 when user is not found in database", async () => {
      vi.mocked(database.user.findFirst).mockResolvedValue(null);

      const request = makeRequest("/api/administrative/tasks/commands/create", {
        method: "POST",
        body: JSON.stringify({ title: "New Task" }),
      });
      const response = await createTaskCommand(request, {
        params: Promise.resolve({ entity: "AdminTask", command: "create" }),
      });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.message).toBe("User not found in database");
    });

    it("should return 200 on successful task creation", async () => {
      mockRunCommand.mockResolvedValue({
        success: true,
        result: { id: "new-task-id" },
        emittedEvents: [],
      });

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
      expect(body.result).toEqual({ id: "new-task-id" });
    });

    it("should return 403 on policy denial", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        policyDenial: { policyName: "AdminOnly" },
      });

      const request = makeRequest("/api/administrative/tasks/commands/create", {
        method: "POST",
        body: JSON.stringify({ title: "New Task" }),
      });
      const response = await createTaskCommand(request, {
        params: Promise.resolve({ entity: "AdminTask", command: "create" }),
      });

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toContain("Access denied");
    });

    it("should return 422 on guard failure", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        guardFailure: { index: 1, formatted: "Title too short" },
      });

      const request = makeRequest("/api/administrative/tasks/commands/create", {
        method: "POST",
        body: JSON.stringify({ title: "A" }),
      });
      const response = await createTaskCommand(request, {
        params: Promise.resolve({ entity: "AdminTask", command: "create" }),
      });

      expect(response.status).toBe(422);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toContain("Guard 1 failed");
    });

    it("should return 400 on general command error", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        error: "Something went wrong",
      });

      const request = makeRequest("/api/administrative/tasks/commands/create", {
        method: "POST",
        body: JSON.stringify({ title: "New Task" }),
      });
      const response = await createTaskCommand(request, {
        params: Promise.resolve({ entity: "AdminTask", command: "create" }),
      });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.message).toBe("Something went wrong");
    });

    it("should return 500 on unexpected exception", async () => {
      mockRunCommand.mockRejectedValue(new Error("DB connection lost"));

      const request = makeRequest("/api/administrative/tasks/commands/create", {
        method: "POST",
        body: JSON.stringify({ title: "New Task" }),
      });
      const response = await createTaskCommand(request, {
        params: Promise.resolve({ entity: "AdminTask", command: "create" }),
      });

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.message).toBe("Internal server error");
    });

    it("should create runtime with correct user context", async () => {
      mockRunCommand.mockResolvedValue({
        success: true,
        result: {},
        emittedEvents: [],
      });

      const request = makeRequest("/api/administrative/tasks/commands/create", {
        method: "POST",
        body: JSON.stringify({ title: "New Task" }),
      });
      await createTaskCommand(request, {
        params: Promise.resolve({ entity: "AdminTask", command: "create" }),
      });

      expect(createManifestRuntime).toHaveBeenCalledWith({
        user: {
          id: TEST_USER_ID,
          tenantId: TEST_TENANT_ID,
          role: "admin",
        },
        entityName: "AdminTask",
      });
    });

    it("should pass correct command and body to runCommand", async () => {
      mockRunCommand.mockResolvedValue({
        success: true,
        result: {},
        emittedEvents: [],
      });

      const payload = { title: "New Task", priority: "urgent" };
      const request = makeRequest("/api/administrative/tasks/commands/create", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      await createTaskCommand(request, {
        params: Promise.resolve({ entity: "AdminTask", command: "create" }),
      });

      expect(mockRunCommand).toHaveBeenCalledWith("create", payload, {
        entityName: "AdminTask",
      });
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
