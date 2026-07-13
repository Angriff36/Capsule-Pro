/**
 * Prep Tasks API Test Suite
 *
 * Covers:
 *   GET  /api/kitchen/prep-tasks         (root list with rich filters)
 *   GET  /api/kitchen/prep-tasks/list    (manifest projection list)
 *   GET  /api/kitchen/prep-tasks/[id]    (detail)
 *   POST PrepTask command routes via dispatcher (cancel, claim, complete,
 *         create, reassign, release, start, unclaim, update-assignment,
 *         update-due-date, update-priority, update-quantity, update-status)
 *
 * @vitest-environment node
 */

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  tenant: vi.fn(),
  captureException: vi.fn(),
  runManifestCommand: vi.fn(),
  prepTaskFindMany: vi.fn(),
  prepTaskCount: vi.fn(),
  prepTaskFindFirst: vi.fn(),
}));

vi.mock("@repo/auth/server", () => ({ auth: mocks.auth }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: mocks.tenant,
  requireCurrentUser: vi.fn(),
  resolveCurrentUser: vi.fn(),
}));
vi.mock("@repo/database", () => ({
  database: {
    prepTask: {
      findMany: mocks.prepTaskFindMany,
      count: mocks.prepTaskCount,
      findFirst: mocks.prepTaskFindFirst,
    },
  },
}));
vi.mock("@/lib/database", () => ({
  database: {
    prepTask: {
      findMany: mocks.prepTaskFindMany,
      count: mocks.prepTaskCount,
      findFirst: mocks.prepTaskFindFirst,
    },
  },
}));
vi.mock("@sentry/nextjs", () => ({
  captureException: mocks.captureException,
  addBreadcrumb: vi.fn(),
}));
vi.mock("@repo/observability/log", () => ({ log: { error: vi.fn() } }));
vi.mock("@/lib/manifest/execute-command", () => ({
  runManifestCommand: mocks.runManifestCommand,
}));
vi.mock("@/lib/manifest-runtime", () => ({ createManifestRuntime: vi.fn() }));
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
      message: string | { error: string; diagnostics?: unknown[] },
      status: number
    ) => {
      const body =
        typeof message === "string"
          ? { success: false, message }
          : { success: false, ...message };
      return NextResponse.json(body, { status });
    },
  };
});
vi.mock("@/app/lib/invariant", () => {
  class InvariantError extends Error {
    override name = "InvariantError" as const;
    constructor(m: string) {
      super(m);
      this.name = "InvariantError";
    }
  }
  return { invariant: vi.fn(), InvariantError };
});
vi.mock("@/app/lib/webhook-dispatch", () => ({
  dispatchWebhooks: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@repo/notifications", () => ({}));
vi.mock("@repo/manifest-runtime/run-manifest-command-core", () => ({
  runManifestCommandCore: vi.fn(),
}));
vi.mock("@/lib/manifest/issue-log", () => ({ logManifestIssue: vi.fn() }));

const { POST: manifestDispatch } = await import(
  "@/app/api/manifest/[entity]/commands/[command]/route"
);

const TEST_TENANT_ID = "00000000-0000-0000-0000-000000000400";
const TEST_USER_ID = "user_prep_task_test";
const TEST_ORG_ID = "org_prep_task_test";
const TEST_PREP_TASK_ID = "33333333-3333-4333-a333-333333333333";
const TEST_EVENT_ID = "44444444-4444-4444-a444-444444444444";

function authed() {
  mocks.auth.mockResolvedValue({ orgId: TEST_ORG_ID, userId: TEST_USER_ID });
  mocks.tenant.mockResolvedValue(TEST_TENANT_ID);
}

function makeGET(url: string): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"));
}

function makePOST(body: unknown = {}): NextRequest {
  return new NextRequest("http://localhost:3000", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function findManyAndClauses(): unknown[] {
  const call = mocks.prepTaskFindMany.mock.calls[0];
  if (!call) {
    throw new Error("prepTask.findMany was not called");
  }
  const arg = call[0] as { where?: { AND: unknown[] } };
  if (!arg?.where?.AND) {
    throw new Error("prepTask.findMany was not called with a where.AND clause");
  }
  return arg.where.AND;
}

function mockRunSuccess(
  result: Record<string, unknown> = { id: TEST_PREP_TASK_ID }
) {
  mocks.runManifestCommand.mockResolvedValue(
    new Response(
      JSON.stringify({
        success: true,
        result,
        events: [{ type: "PrepTaskEvent", entityId: result.id }],
      }),
      { status: 200 }
    )
  );
}

function mockRunError(status: number, message: string) {
  mocks.runManifestCommand.mockResolvedValue(
    new Response(JSON.stringify({ success: false, message }), { status })
  );
}

describe("Prep Tasks API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authed();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ========================================================== GET ROOT
  describe("GET /api/kitchen/prep-tasks (filtered list)", () => {
    it("returns 401 when unauthenticated", async () => {
      mocks.auth.mockResolvedValue({ orgId: null, userId: null });
      const { GET } = await import("@/app/api/kitchen/prep-tasks/route");
      const res = await GET(makeGET("/api/kitchen/prep-tasks"));
      expect(res.status).toBe(401);
    });

    it("returns paginated results with default page=1, limit=20", async () => {
      mocks.prepTaskFindMany.mockResolvedValue([
        { id: TEST_PREP_TASK_ID, tenantId: TEST_TENANT_ID },
      ]);
      mocks.prepTaskCount.mockResolvedValue(1);

      const { GET } = await import("@/app/api/kitchen/prep-tasks/route");
      const res = await GET(makeGET("/api/kitchen/prep-tasks"));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toHaveLength(1);
      expect(body.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
    });

    it("scopes results to tenant + non-deleted", async () => {
      mocks.prepTaskFindMany.mockResolvedValue([]);
      mocks.prepTaskCount.mockResolvedValue(0);

      const { GET } = await import("@/app/api/kitchen/prep-tasks/route");
      await GET(makeGET("/api/kitchen/prep-tasks"));

      const ands = findManyAndClauses();
      expect(
        ands.some(
          (c) => (c as Record<string, unknown>).tenantId === TEST_TENANT_ID
        )
      ).toBe(true);
      expect(
        ands.some((c) => (c as Record<string, unknown>).deletedAt === null)
      ).toBe(true);
    });

    it("threads eventId filter", async () => {
      mocks.prepTaskFindMany.mockResolvedValue([]);
      mocks.prepTaskCount.mockResolvedValue(0);

      const { GET } = await import("@/app/api/kitchen/prep-tasks/route");
      await GET(makeGET(`/api/kitchen/prep-tasks?eventId=${TEST_EVENT_ID}`));

      const ands = findManyAndClauses();
      expect(
        ands.some(
          (c) => (c as Record<string, unknown>).eventId === TEST_EVENT_ID
        )
      ).toBe(true);
    });

    it("threads status filter", async () => {
      mocks.prepTaskFindMany.mockResolvedValue([]);
      mocks.prepTaskCount.mockResolvedValue(0);

      const { GET } = await import("@/app/api/kitchen/prep-tasks/route");
      await GET(makeGET("/api/kitchen/prep-tasks?status=in_progress"));

      const ands = findManyAndClauses();
      expect(
        ands.some(
          (c) => (c as Record<string, unknown>).status === "in_progress"
        )
      ).toBe(true);
    });

    it("threads priority filter (parsed as int)", async () => {
      mocks.prepTaskFindMany.mockResolvedValue([]);
      mocks.prepTaskCount.mockResolvedValue(0);

      const { GET } = await import("@/app/api/kitchen/prep-tasks/route");
      await GET(makeGET("/api/kitchen/prep-tasks?priority=3"));

      const ands = findManyAndClauses();
      expect(
        ands.some((c) => (c as Record<string, unknown>).priority === 3)
      ).toBe(true);
    });

    it("applies search filter as case-insensitive contains on name + notes", async () => {
      mocks.prepTaskFindMany.mockResolvedValue([]);
      mocks.prepTaskCount.mockResolvedValue(0);

      const { GET } = await import("@/app/api/kitchen/prep-tasks/route");
      await GET(makeGET("/api/kitchen/prep-tasks?search=Onion"));

      const ands = findManyAndClauses();
      const orClause = ands.find(
        (c) => (c as Record<string, unknown>).OR !== undefined
      ) as { OR: Record<string, { contains: string; mode: string }>[] };
      expect(orClause).toBeDefined();
      expect(orClause.OR[0]!.name!.contains).toBe("onion");
      expect(orClause.OR[0]!.name!.mode).toBe("insensitive");
    });

    it("applies isOverdue filter excluding done/completed/canceled", async () => {
      mocks.prepTaskFindMany.mockResolvedValue([]);
      mocks.prepTaskCount.mockResolvedValue(0);

      const { GET } = await import("@/app/api/kitchen/prep-tasks/route");
      await GET(makeGET("/api/kitchen/prep-tasks?isOverdue=true"));

      const ands = findManyAndClauses();
      const overdueClause = ands.find((c) => {
        const inner = (c as Record<string, unknown>).AND as
          | unknown[]
          | undefined;
        if (!inner) {
          return false;
        }
        return inner.some((x) => (x as Record<string, unknown>).dueByDate);
      }) as { AND: Record<string, unknown>[] };

      expect(overdueClause).toBeDefined();
      const statusClause = overdueClause.AND.find(
        (x) => (x as Record<string, unknown>).status
      ) as { status: { notIn: string[] } };
      expect(statusClause.status.notIn).toEqual([
        "done",
        "completed",
        "canceled",
      ]);
    });

    it("respects custom page/limit", async () => {
      mocks.prepTaskFindMany.mockResolvedValue([]);
      mocks.prepTaskCount.mockResolvedValue(45);

      const { GET } = await import("@/app/api/kitchen/prep-tasks/route");
      const res = await GET(makeGET("/api/kitchen/prep-tasks?page=2&limit=10"));
      const body = await res.json();
      expect(body.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 45,
        totalPages: 5,
      });
      expect(mocks.prepTaskFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10, skip: 10 })
      );
    });

    it("clamps limit to 100", async () => {
      mocks.prepTaskFindMany.mockResolvedValue([]);
      mocks.prepTaskCount.mockResolvedValue(0);

      const { GET } = await import("@/app/api/kitchen/prep-tasks/route");
      await GET(makeGET("/api/kitchen/prep-tasks?limit=999"));
      expect(mocks.prepTaskFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 })
      );
    });

    it("applies orderBy [priority desc, dueByDate asc, startByDate asc]", async () => {
      mocks.prepTaskFindMany.mockResolvedValue([]);
      mocks.prepTaskCount.mockResolvedValue(0);

      const { GET } = await import("@/app/api/kitchen/prep-tasks/route");
      await GET(makeGET("/api/kitchen/prep-tasks"));
      expect(mocks.prepTaskFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [
            { priority: "desc" },
            { dueByDate: "asc" },
            { startByDate: "asc" },
          ],
        })
      );
    });

    it("returns 500 on Prisma error", async () => {
      mocks.prepTaskFindMany.mockRejectedValue(new Error("DB down"));
      const { GET } = await import("@/app/api/kitchen/prep-tasks/route");
      const res = await GET(makeGET("/api/kitchen/prep-tasks"));
      expect(res.status).toBe(500);
    });

    it("runs findMany and count concurrently (Promise.all), not serially", async () => {
      let releaseFindMany!: () => void;
      mocks.prepTaskFindMany.mockReturnValue(
        new Promise<unknown[]>((resolve) => {
          releaseFindMany = () => resolve([]);
        })
      );
      mocks.prepTaskCount.mockResolvedValue(0);

      const { GET } = await import("@/app/api/kitchen/prep-tasks/route");
      const pending = GET(makeGET("/api/kitchen/prep-tasks"));
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(mocks.prepTaskCount).toHaveBeenCalledTimes(1);
      releaseFindMany();
      await pending;
    });
  });

  // ========================================================== GET LIST PROJECTION
  describe("GET /api/kitchen/prep-tasks/list", () => {
    it("returns 401 when unauthenticated", async () => {
      mocks.auth.mockResolvedValue({ orgId: null, userId: null });
      const { GET } = await import("@/app/api/kitchen/prep-tasks/list/route");
      const res = await GET(makeGET("/api/kitchen/prep-tasks/list"));
      expect(res.status).toBe(401);
    });

    it("returns 400 when tenant cannot be resolved", async () => {
      mocks.tenant.mockResolvedValue(null);
      const { GET } = await import("@/app/api/kitchen/prep-tasks/list/route");
      const res = await GET(makeGET("/api/kitchen/prep-tasks/list"));
      expect(res.status).toBe(400);
    });

    it("returns prep tasks scoped to tenant with default pagination", async () => {
      mocks.prepTaskFindMany.mockResolvedValue([{ id: TEST_PREP_TASK_ID }]);
      const { GET } = await import("@/app/api/kitchen/prep-tasks/list/route");
      const res = await GET(makeGET("/api/kitchen/prep-tasks/list"));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.prepTasks).toHaveLength(1);
      expect(body.limit).toBe(50);
      expect(body.offset).toBe(0);
    });

    it("clamps limit to MAX_LIMIT=200", async () => {
      mocks.prepTaskFindMany.mockResolvedValue([]);
      const { GET } = await import("@/app/api/kitchen/prep-tasks/list/route");
      await GET(makeGET("/api/kitchen/prep-tasks/list?limit=999"));
      expect(mocks.prepTaskFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 200 })
      );
    });

    it("returns 500 on Prisma error", async () => {
      mocks.prepTaskFindMany.mockRejectedValue(new Error("DB down"));
      const { GET } = await import("@/app/api/kitchen/prep-tasks/list/route");
      const res = await GET(makeGET("/api/kitchen/prep-tasks/list"));
      expect(res.status).toBe(500);
    });
  });

  // ========================================================== GET DETAIL
  describe("GET /api/kitchen/prep-tasks/[id]", () => {
    it("returns 401 when unauthenticated", async () => {
      mocks.auth.mockResolvedValue({ orgId: null, userId: null });
      const { GET } = await import("@/app/api/kitchen/prep-tasks/[id]/route");
      const res = await GET(
        makeGET(`/api/kitchen/prep-tasks/${TEST_PREP_TASK_ID}`),
        { params: Promise.resolve({ id: TEST_PREP_TASK_ID }) }
      );
      expect(res.status).toBe(401);
    });

    it("returns 404 when prep task not found", async () => {
      mocks.prepTaskFindFirst.mockResolvedValue(null);
      const { GET } = await import("@/app/api/kitchen/prep-tasks/[id]/route");
      const res = await GET(
        makeGET(`/api/kitchen/prep-tasks/${TEST_PREP_TASK_ID}`),
        { params: Promise.resolve({ id: TEST_PREP_TASK_ID }) }
      );
      expect(res.status).toBe(404);
    });

    it("returns 200 with prepTask payload", async () => {
      mocks.prepTaskFindFirst.mockResolvedValue({
        id: TEST_PREP_TASK_ID,
        tenantId: TEST_TENANT_ID,
      });
      const { GET } = await import("@/app/api/kitchen/prep-tasks/[id]/route");
      const res = await GET(
        makeGET(`/api/kitchen/prep-tasks/${TEST_PREP_TASK_ID}`),
        { params: Promise.resolve({ id: TEST_PREP_TASK_ID }) }
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.prepTask.id).toBe(TEST_PREP_TASK_ID);
    });

    it("returns 500 on Prisma error", async () => {
      mocks.prepTaskFindFirst.mockRejectedValue(new Error("Boom"));
      const { GET } = await import("@/app/api/kitchen/prep-tasks/[id]/route");
      const res = await GET(
        makeGET(`/api/kitchen/prep-tasks/${TEST_PREP_TASK_ID}`),
        { params: Promise.resolve({ id: TEST_PREP_TASK_ID }) }
      );
      expect(res.status).toBe(500);
    });
  });

  // ========================================================== COMMAND ROUTES
  type CommandSpec = {
    name: string;
    runtimeName: string;
    sampleBody: Record<string, unknown>;
  };

  const COMMANDS: CommandSpec[] = [
    {
      name: "cancel",
      runtimeName: "cancel",
      sampleBody: { id: TEST_PREP_TASK_ID, reason: "no longer needed" },
    },
    {
      name: "claim",
      runtimeName: "claim",
      sampleBody: { id: TEST_PREP_TASK_ID, claimedBy: TEST_USER_ID },
    },
    {
      name: "complete",
      runtimeName: "complete",
      sampleBody: { id: TEST_PREP_TASK_ID, quantityCompleted: 10 },
    },
    {
      name: "create",
      runtimeName: "create",
      sampleBody: {
        eventId: TEST_EVENT_ID,
        name: "Dice onions",
        taskType: "prep",
        quantityTotal: 10,
        priority: 1,
      },
    },
    {
      name: "reassign",
      runtimeName: "reassign",
      sampleBody: { id: TEST_PREP_TASK_ID, assigneeId: "another-user" },
    },
    {
      name: "release",
      runtimeName: "release",
      sampleBody: { id: TEST_PREP_TASK_ID },
    },
    {
      name: "start",
      runtimeName: "start",
      sampleBody: { id: TEST_PREP_TASK_ID, startedBy: TEST_USER_ID },
    },
    {
      name: "unclaim",
      runtimeName: "unclaim",
      sampleBody: { id: TEST_PREP_TASK_ID },
    },
    {
      name: "update-assignment",
      runtimeName: "updateAssignment",
      sampleBody: { id: TEST_PREP_TASK_ID, assigneeId: "user-2" },
    },
    {
      name: "update-due-date",
      runtimeName: "updateDueDate",
      sampleBody: { id: TEST_PREP_TASK_ID, dueByDate: "2026-05-02T12:00:00Z" },
    },
    {
      name: "update-priority",
      runtimeName: "updatePriority",
      sampleBody: { id: TEST_PREP_TASK_ID, priority: 3 },
    },
    {
      name: "update-quantity",
      runtimeName: "updateQuantity",
      sampleBody: { id: TEST_PREP_TASK_ID, quantityTotal: 25 },
    },
    {
      name: "update-status",
      runtimeName: "updateStatus",
      sampleBody: { id: TEST_PREP_TASK_ID, status: "in_progress" },
    },
  ];

  describe.each(COMMANDS)("POST PrepTask.$name", ({ name, sampleBody }) => {
    it(`returns 401 when unauthenticated [${name}]`, async () => {
      const { InvariantError } = await import("@/app/lib/invariant");
      const { requireCurrentUser } = await import("@/app/lib/tenant");
      vi.mocked(requireCurrentUser).mockImplementation(() => {
        throw new InvariantError("Unauthorized");
      });

      const res = await manifestDispatch(makePOST(sampleBody), {
        params: Promise.resolve({ entity: "PrepTask", command: name }),
      });
      expect(res.status).toBe(401);
    });

    it(`returns 200 with result and events on success [${name}]`, async () => {
      const { requireCurrentUser } = await import("@/app/lib/tenant");
      vi.mocked(requireCurrentUser).mockResolvedValue({
        id: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        role: "admin",
      } as never);

      mockRunSuccess({ id: TEST_PREP_TASK_ID, status: "pending" });
      const res = await manifestDispatch(makePOST(sampleBody), {
        params: Promise.resolve({ entity: "PrepTask", command: name }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.result.id).toBe(TEST_PREP_TASK_ID);
      expect(body.events).toHaveLength(1);
    });

    it(`returns 403 on policy denial [${name}]`, async () => {
      const { requireCurrentUser } = await import("@/app/lib/tenant");
      vi.mocked(requireCurrentUser).mockResolvedValue({
        id: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        role: "admin",
      } as never);

      mockRunError(403, "Access denied: kitchenStaffOnly (role=admin)");
      const res = await manifestDispatch(makePOST(sampleBody), {
        params: Promise.resolve({ entity: "PrepTask", command: name }),
      });
      expect(res.status).toBe(403);
      expect((await res.json()).message).toContain("kitchenStaffOnly");
    });

    it(`returns 422 on guard failure [${name}]`, async () => {
      const { requireCurrentUser } = await import("@/app/lib/tenant");
      vi.mocked(requireCurrentUser).mockResolvedValue({
        id: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        role: "admin",
      } as never);

      mockRunError(422, "Guard 0 failed: id is required");
      const res = await manifestDispatch(makePOST(sampleBody), {
        params: Promise.resolve({ entity: "PrepTask", command: name }),
      });
      expect(res.status).toBe(422);
      expect((await res.json()).message).toContain("Guard 0 failed");
    });

    it(`returns 400 on generic command failure [${name}]`, async () => {
      const { requireCurrentUser } = await import("@/app/lib/tenant");
      vi.mocked(requireCurrentUser).mockResolvedValue({
        id: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        role: "admin",
      } as never);

      mockRunError(400, "Illegal state transition");
      const res = await manifestDispatch(makePOST(sampleBody), {
        params: Promise.resolve({ entity: "PrepTask", command: name }),
      });
      expect(res.status).toBe(400);
      expect((await res.json()).message).toBe("Illegal state transition");
    });

    it(`returns 500 when runtime throws [${name}]`, async () => {
      const { requireCurrentUser } = await import("@/app/lib/tenant");
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new Error("Runtime explosion") as never
      );

      const res = await manifestDispatch(makePOST(sampleBody), {
        params: Promise.resolve({ entity: "PrepTask", command: name }),
      });
      expect(res.status).toBe(500);
    });

    it(`forwards correct command name + entity to runtime [${name}]`, async () => {
      const { requireCurrentUser } = await import("@/app/lib/tenant");
      vi.mocked(requireCurrentUser).mockResolvedValue({
        id: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        role: "admin",
      } as never);

      mockRunSuccess({ id: TEST_PREP_TASK_ID });
      await manifestDispatch(makePOST(sampleBody), {
        params: Promise.resolve({ entity: "PrepTask", command: name }),
      });

      expect(mocks.runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({ entity: "PrepTask", command: name })
      );
    });
  });
});
