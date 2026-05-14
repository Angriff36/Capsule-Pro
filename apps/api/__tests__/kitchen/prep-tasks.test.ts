/**
 * Prep Tasks API Test Suite
 *
 * Surface under test (16 route files):
 *
 *   GET  /api/kitchen/prep-tasks                       (root list w/ rich filters)
 *   GET  /api/kitchen/prep-tasks/list                  (manifest projection list)
 *   GET  /api/kitchen/prep-tasks/[id]                  (detail)
 *
 *   POST /api/kitchen/prep-tasks/commands/{cancel|claim|complete|create|reassign|
 *                                          release|start|unclaim|update-assignment|
 *                                          update-due-date|update-priority|
 *                                          update-quantity|update-status}
 *
 * Why these tests matter:
 *   Prep tasks are the kitchen's atomic unit of work. They drive station
 *   dispatch, claim/unclaim ownership, due-date overdue triggers, and
 *   completion bookkeeping that flows back into event readiness signals.
 *   The 13 command verbs encode a state machine — pending -> in_progress ->
 *   completed, with side flows for cancel/reassign/release. A regression in
 *   any guard would silently let a chef "complete" a task they never
 *   claimed, or "claim" a task already claimed by someone else, both of
 *   which corrupt kitchen accountability.
 *
 *   The root GET is also load-bearing for the kitchen dashboard. Its
 *   `isOverdue` filter pushes `dueByDate < now AND status NOT IN
 *   (done, completed, canceled)` into the WHERE clause; a regression that
 *   drops the status exclusion would surface "overdue" tasks that were
 *   already finished and pollute the standup view. Pagination clamping
 *   (max 100) prevents an unbounded read on a multi-tenant table.
 *
 *   The detail and list-projection routes use the manifestErrorResponse /
 *   manifestSuccessResponse envelope; if a future refactor switches to a
 *   different envelope shape, every UI consumer breaks. These tests pin
 *   the response shape AND the tenant/auth guard order.
 *
 *   Each command route is exercised against the menus.test.ts /
 *   prep-lists.test.ts pattern: 401 unauth, 400 tenant-missing, 200
 *   success, 403 policy denial, 422 guard failure, 400 generic failure,
 *   500 internal error, plus a pin asserting the runtime command name
 *   is forwarded as the camelCase variant (e.g. update-due-date URL ->
 *   `updateDueDate` runtime call). The kebab->camel mapping is auto-
 *   generated and easy to break with a hand-edit.
 *
 * @vitest-environment node
 */

import { database } from "@repo/database";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  requireCurrentUser: vi.fn().mockResolvedValue({
    id: "test-user-id",
    tenantId: "test-tenant",
    role: "admin",
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
  }),
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

vi.mock("@/app/lib/invariant", () => ({
  InvariantError: class extends Error {
    constructor(message: string) {
      super(message);
      this.name = "InvariantError";
    }
  },
  invariant: vi.fn(),
}));

vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(),
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

// --- Module imports (after mocks) ---

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg, requireCurrentUser } = await import("@/app/lib/tenant");
const { createManifestRuntime } = await import("@/lib/manifest-runtime");

// --- Constants ---

const TEST_TENANT_ID = "00000000-0000-0000-0000-000000000400";
const TEST_USER_ID = "user_prep_task_test";
const TEST_ORG_ID = "org_prep_task_test";
const TEST_PREP_TASK_ID = "33333333-3333-4333-a333-333333333333";
const TEST_EVENT_ID = "44444444-4444-4444-a444-444444444444";
const TEST_STATION_ID = "55555555-5555-4555-a555-555555555555";

// --- Helpers ---

function authed() {
  vi.mocked(auth).mockResolvedValue({
    orgId: TEST_ORG_ID,
    userId: TEST_USER_ID,
  } as never);
  vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID as never);
}

function unauthed() {
  vi.mocked(auth).mockResolvedValue({ orgId: null, userId: null } as never);
  // Throwing InvariantError specifically so the route catches it and returns 401
  class InvariantError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "InvariantError";
    }
  }
  vi.mocked(requireCurrentUser).mockRejectedValue(
    new InvariantError("Unauthorized") as never
  );
  vi.mocked(createManifestRuntime).mockResolvedValue({
    runCommand: vi.fn().mockResolvedValue({ success: false }),
  } as never);
}

function makeRequest(url: string, init?: RequestInit): NextRequest {
  const opts: RequestInit = { ...init };
  if (opts.body && !opts.headers) {
    opts.headers = { "Content-Type": "application/json" };
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), opts as never);
}

function postRequest(url: string, body: unknown = {}): NextRequest {
  return makeRequest(url, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function samplePrepTask(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_PREP_TASK_ID,
    tenantId: TEST_TENANT_ID,
    eventId: TEST_EVENT_ID,
    dishId: null,
    recipeVersionId: null,
    methodId: null,
    containerId: null,
    locationId: null,
    taskType: "prep",
    name: "Dice onions",
    quantityTotal: 10,
    quantityUnitId: null,
    quantityCompleted: 0,
    servingsTotal: 100,
    startByDate: new Date("2026-05-01T08:00:00Z"),
    dueByDate: new Date("2026-05-01T12:00:00Z"),
    dueByTime: "12:00",
    isEventFinish: false,
    status: "pending",
    priority: 1,
    estimatedMinutes: 30,
    actualMinutes: null,
    notes: null,
    createdAt: new Date("2026-04-30"),
    updatedAt: new Date("2026-04-30"),
    do_not_complete_until: null,
    ...overrides,
  } as Record<string, unknown>;
}

function findManyAndClauses(): unknown[] {
  const call = vi.mocked(database.prepTask.findMany).mock.calls[0];
  if (!call) {
    throw new Error("prepTask.findMany was not called");
  }
  const arg = call[0] as { where?: { AND: unknown[] } };
  if (!arg?.where?.AND) {
    throw new Error("prepTask.findMany was not called with a where.AND clause");
  }
  return arg.where.AND;
}

function mockRuntimeSuccess(
  result: Record<string, unknown> = { id: TEST_PREP_TASK_ID }
) {
  vi.mocked(createManifestRuntime).mockResolvedValue({
    runCommand: vi.fn().mockResolvedValue({
      success: true,
      result,
      emittedEvents: [{ type: "PrepTaskEvent", entityId: result.id }],
    }),
  } as never);
}

function mockRuntimeFailure(error: string) {
  vi.mocked(createManifestRuntime).mockResolvedValue({
    runCommand: vi.fn().mockResolvedValue({
      success: false,
      error,
    }),
  } as never);
}

function mockRuntimePolicyDenial(policyName: string) {
  vi.mocked(createManifestRuntime).mockResolvedValue({
    runCommand: vi.fn().mockResolvedValue({
      success: false,
      policyDenial: { policyName },
    }),
  } as never);
}

function mockRuntimeGuardFailure(index: number, formatted: string) {
  vi.mocked(createManifestRuntime).mockResolvedValue({
    runCommand: vi.fn().mockResolvedValue({
      success: false,
      guardFailure: { index, formatted },
    }),
  } as never);
}

// --- Test Suite ---

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
      unauthed();
      const { GET } = await import("@/app/api/kitchen/prep-tasks/route");
      const res = await GET(makeRequest("/api/kitchen/prep-tasks"));

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.message).toBe("Unauthorized");
    });

    it("returns paginated results with default page=1, limit=20", async () => {
      vi.mocked(database.prepTask.findMany).mockResolvedValue([
        samplePrepTask(),
      ] as never);
      vi.mocked(database.prepTask.count).mockResolvedValue(1 as never);

      const { GET } = await import("@/app/api/kitchen/prep-tasks/route");
      const res = await GET(makeRequest("/api/kitchen/prep-tasks"));

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toHaveLength(1);
      expect(body.data[0].id).toBe(TEST_PREP_TASK_ID);
      expect(body.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
    });

    it("scopes results to tenant + non-deleted by default", async () => {
      vi.mocked(database.prepTask.findMany).mockResolvedValue([] as never);
      vi.mocked(database.prepTask.count).mockResolvedValue(0 as never);

      const { GET } = await import("@/app/api/kitchen/prep-tasks/route");
      await GET(makeRequest("/api/kitchen/prep-tasks"));

      const ands = findManyAndClauses();
      expect(
        ands.some(
          (c) => (c as Record<string, unknown>).tenantId === TEST_TENANT_ID
        )
      ).toBe(true);
      expect(
        ands.some((c) => {
          const dl = (c as Record<string, unknown>).deletedAt;
          return dl === null;
        })
      ).toBe(true);
    });

    it("threads eventId filter into where.AND", async () => {
      vi.mocked(database.prepTask.findMany).mockResolvedValue([] as never);
      vi.mocked(database.prepTask.count).mockResolvedValue(0 as never);

      const { GET } = await import("@/app/api/kitchen/prep-tasks/route");
      await GET(
        makeRequest(`/api/kitchen/prep-tasks?eventId=${TEST_EVENT_ID}`)
      );

      const ands = findManyAndClauses();
      expect(
        ands.some(
          (c) => (c as Record<string, unknown>).eventId === TEST_EVENT_ID
        )
      ).toBe(true);
    });

    it("threads status filter into where.AND", async () => {
      vi.mocked(database.prepTask.findMany).mockResolvedValue([] as never);
      vi.mocked(database.prepTask.count).mockResolvedValue(0 as never);

      const { GET } = await import("@/app/api/kitchen/prep-tasks/route");
      await GET(makeRequest("/api/kitchen/prep-tasks?status=in_progress"));

      const ands = findManyAndClauses();
      expect(
        ands.some(
          (c) => (c as Record<string, unknown>).status === "in_progress"
        )
      ).toBe(true);
    });

    it("threads priority filter (parsed as int) into where.AND", async () => {
      vi.mocked(database.prepTask.findMany).mockResolvedValue([] as never);
      vi.mocked(database.prepTask.count).mockResolvedValue(0 as never);

      const { GET } = await import("@/app/api/kitchen/prep-tasks/route");
      await GET(makeRequest("/api/kitchen/prep-tasks?priority=3"));

      const ands = findManyAndClauses();
      expect(
        ands.some((c) => (c as Record<string, unknown>).priority === 3)
      ).toBe(true);
    });

    it("threads locationId filter into where.AND", async () => {
      vi.mocked(database.prepTask.findMany).mockResolvedValue([] as never);
      vi.mocked(database.prepTask.count).mockResolvedValue(0 as never);

      const { GET } = await import("@/app/api/kitchen/prep-tasks/route");
      await GET(
        makeRequest(`/api/kitchen/prep-tasks?locationId=${TEST_STATION_ID}`)
      );

      const ands = findManyAndClauses();
      expect(
        ands.some(
          (c) => (c as Record<string, unknown>).locationId === TEST_STATION_ID
        )
      ).toBe(true);
    });

    it("threads taskType filter into where.AND", async () => {
      vi.mocked(database.prepTask.findMany).mockResolvedValue([] as never);
      vi.mocked(database.prepTask.count).mockResolvedValue(0 as never);

      const { GET } = await import("@/app/api/kitchen/prep-tasks/route");
      await GET(makeRequest("/api/kitchen/prep-tasks?taskType=prep"));

      const ands = findManyAndClauses();
      expect(
        ands.some((c) => (c as Record<string, unknown>).taskType === "prep")
      ).toBe(true);
    });

    it("applies search filter as case-insensitive contains on name + notes", async () => {
      vi.mocked(database.prepTask.findMany).mockResolvedValue([] as never);
      vi.mocked(database.prepTask.count).mockResolvedValue(0 as never);

      const { GET } = await import("@/app/api/kitchen/prep-tasks/route");
      await GET(makeRequest("/api/kitchen/prep-tasks?search=Onion"));

      const ands = findManyAndClauses();
      // Search clause is { OR: [ {name:{contains}}, {notes:{contains}} ] }
      const orClause = ands.find(
        (c) => (c as Record<string, unknown>).OR !== undefined
      ) as { OR: Array<Record<string, { contains: string; mode: string }>> };
      expect(orClause).toBeDefined();
      expect(orClause.OR).toHaveLength(2);
      expect(orClause.OR[0].name.contains).toBe("onion");
      expect(orClause.OR[0].name.mode).toBe("insensitive");
      expect(orClause.OR[1].notes.contains).toBe("onion");
      expect(orClause.OR[1].notes.mode).toBe("insensitive");
    });

    it("applies isOverdue filter excluding done/completed/canceled with dueByDate < now", async () => {
      vi.mocked(database.prepTask.findMany).mockResolvedValue([] as never);
      vi.mocked(database.prepTask.count).mockResolvedValue(0 as never);

      const { GET } = await import("@/app/api/kitchen/prep-tasks/route");
      await GET(makeRequest("/api/kitchen/prep-tasks?isOverdue=true"));

      const ands = findManyAndClauses();
      const overdueClause = ands.find((c) => {
        const inner = (c as Record<string, unknown>).AND as
          | unknown[]
          | undefined;
        if (!inner) return false;
        return inner.some((x) => (x as Record<string, unknown>).dueByDate);
      }) as { AND: Array<Record<string, unknown>> };

      expect(overdueClause).toBeDefined();
      const dueClause = overdueClause.AND.find(
        (x) => (x as Record<string, unknown>).dueByDate
      ) as { dueByDate: { lt: Date } };
      const statusClause = overdueClause.AND.find(
        (x) => (x as Record<string, unknown>).status
      ) as { status: { notIn: string[] } };
      expect(dueClause.dueByDate.lt).toBeInstanceOf(Date);
      expect(statusClause.status.notIn).toEqual([
        "done",
        "completed",
        "canceled",
      ]);
    });

    it("does NOT add overdue clause when isOverdue=false", async () => {
      vi.mocked(database.prepTask.findMany).mockResolvedValue([] as never);
      vi.mocked(database.prepTask.count).mockResolvedValue(0 as never);

      const { GET } = await import("@/app/api/kitchen/prep-tasks/route");
      await GET(makeRequest("/api/kitchen/prep-tasks?isOverdue=false"));

      const ands = findManyAndClauses();
      const hasOverdue = ands.some((c) => {
        const inner = (c as Record<string, unknown>).AND as
          | unknown[]
          | undefined;
        if (!inner) return false;
        return inner.some((x) => (x as Record<string, unknown>).dueByDate);
      });
      expect(hasOverdue).toBe(false);
    });

    it("respects custom page=2 limit=10 and computes totalPages", async () => {
      vi.mocked(database.prepTask.findMany).mockResolvedValue([] as never);
      vi.mocked(database.prepTask.count).mockResolvedValue(45 as never);

      const { GET } = await import("@/app/api/kitchen/prep-tasks/route");
      const res = await GET(
        makeRequest("/api/kitchen/prep-tasks?page=2&limit=10")
      );
      const body = await res.json();

      expect(body.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 45,
        totalPages: 5,
      });
      expect(database.prepTask.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10, skip: 10 })
      );
    });

    it("clamps limit to 100 when caller asks for limit=999", async () => {
      vi.mocked(database.prepTask.findMany).mockResolvedValue([] as never);
      vi.mocked(database.prepTask.count).mockResolvedValue(0 as never);

      const { GET } = await import("@/app/api/kitchen/prep-tasks/route");
      await GET(makeRequest("/api/kitchen/prep-tasks?limit=999"));

      expect(database.prepTask.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 })
      );
    });

    it("applies orderBy [priority desc, dueByDate asc, startByDate asc]", async () => {
      vi.mocked(database.prepTask.findMany).mockResolvedValue([] as never);
      vi.mocked(database.prepTask.count).mockResolvedValue(0 as never);

      const { GET } = await import("@/app/api/kitchen/prep-tasks/route");
      await GET(makeRequest("/api/kitchen/prep-tasks"));

      expect(database.prepTask.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [
            { priority: "desc" },
            { dueByDate: "asc" },
            { startByDate: "asc" },
          ],
        })
      );
    });

    it("returns 500 on Prisma error and captures via Sentry", async () => {
      const { captureException } = await import("@sentry/nextjs");
      vi.mocked(database.prepTask.findMany).mockRejectedValue(
        new Error("DB down") as never
      );

      const { GET } = await import("@/app/api/kitchen/prep-tasks/route");
      const res = await GET(makeRequest("/api/kitchen/prep-tasks"));

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.message).toBe("Internal server error");
      expect(captureException).toHaveBeenCalled();
    });
  });

  // ========================================================== GET LIST PROJECTION
  describe("GET /api/kitchen/prep-tasks/list", () => {
    it("returns 401 when unauthenticated", async () => {
      unauthed();
      const { GET } = await import("@/app/api/kitchen/prep-tasks/list/route");
      const res = await GET(makeRequest("/api/kitchen/prep-tasks/list"));

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.message).toBe("Unauthorized");
    });

    it("returns 400 when tenant cannot be resolved", async () => {
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const { GET } = await import("@/app/api/kitchen/prep-tasks/list/route");
      const res = await GET(makeRequest("/api/kitchen/prep-tasks/list"));

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.message).toBe("Tenant not found");
    });

    it("returns prep tasks scoped to tenant + non-deleted with default pagination", async () => {
      vi.mocked(database.prepTask.findMany).mockResolvedValue([
        samplePrepTask(),
      ] as never);

      const { GET } = await import("@/app/api/kitchen/prep-tasks/list/route");
      const res = await GET(makeRequest("/api/kitchen/prep-tasks/list"));

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.prepTasks).toHaveLength(1);
      expect(body.limit).toBe(50); // DEFAULT_LIMIT from clampLimit
      expect(body.offset).toBe(0);
      expect(database.prepTask.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TEST_TENANT_ID, deletedAt: null },
          orderBy: { createdAt: "desc" },
          take: 50,
          skip: 0,
        })
      );
    });

    it("clamps limit to MAX_LIMIT=200", async () => {
      vi.mocked(database.prepTask.findMany).mockResolvedValue([] as never);

      const { GET } = await import("@/app/api/kitchen/prep-tasks/list/route");
      await GET(makeRequest("/api/kitchen/prep-tasks/list?limit=999"));

      expect(database.prepTask.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 200 })
      );
    });

    it("threads custom offset", async () => {
      vi.mocked(database.prepTask.findMany).mockResolvedValue([] as never);

      const { GET } = await import("@/app/api/kitchen/prep-tasks/list/route");
      await GET(makeRequest("/api/kitchen/prep-tasks/list?offset=25&limit=10"));

      expect(database.prepTask.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 25, take: 10 })
      );
    });

    it("returns 500 on Prisma error", async () => {
      vi.mocked(database.prepTask.findMany).mockRejectedValue(
        new Error("DB down") as never
      );

      const { GET } = await import("@/app/api/kitchen/prep-tasks/list/route");
      const res = await GET(makeRequest("/api/kitchen/prep-tasks/list"));

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.message).toBe("Internal server error");
    });
  });

  // ========================================================== GET DETAIL
  describe("GET /api/kitchen/prep-tasks/[id]", () => {
    it("returns 401 when unauthenticated", async () => {
      unauthed();
      const { GET } = await import("@/app/api/kitchen/prep-tasks/[id]/route");
      const res = await GET(
        makeRequest(`/api/kitchen/prep-tasks/${TEST_PREP_TASK_ID}`),
        { params: Promise.resolve({ id: TEST_PREP_TASK_ID }) }
      );

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.message).toBe("Unauthorized");
    });

    it("returns 400 when tenant cannot be resolved", async () => {
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const { GET } = await import("@/app/api/kitchen/prep-tasks/[id]/route");
      const res = await GET(
        makeRequest(`/api/kitchen/prep-tasks/${TEST_PREP_TASK_ID}`),
        { params: Promise.resolve({ id: TEST_PREP_TASK_ID }) }
      );

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.message).toBe("Tenant not found");
    });

    it("returns 404 when prep task not found in tenant", async () => {
      vi.mocked(database.prepTask.findFirst).mockResolvedValue(null as never);

      const { GET } = await import("@/app/api/kitchen/prep-tasks/[id]/route");
      const res = await GET(
        makeRequest(`/api/kitchen/prep-tasks/${TEST_PREP_TASK_ID}`),
        { params: Promise.resolve({ id: TEST_PREP_TASK_ID }) }
      );

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.message).toBe("PrepTask not found");
    });

    it("returns 200 with prepTask payload scoped by id + tenantId + deletedAt:null", async () => {
      vi.mocked(database.prepTask.findFirst).mockResolvedValue(
        samplePrepTask() as never
      );

      const { GET } = await import("@/app/api/kitchen/prep-tasks/[id]/route");
      const res = await GET(
        makeRequest(`/api/kitchen/prep-tasks/${TEST_PREP_TASK_ID}`),
        { params: Promise.resolve({ id: TEST_PREP_TASK_ID }) }
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.prepTask.id).toBe(TEST_PREP_TASK_ID);
      expect(database.prepTask.findFirst).toHaveBeenCalledWith({
        where: {
          id: TEST_PREP_TASK_ID,
          tenantId: TEST_TENANT_ID,
          deletedAt: null,
        },
      });
    });

    it("returns 500 on Prisma error", async () => {
      vi.mocked(database.prepTask.findFirst).mockRejectedValue(
        new Error("Boom") as never
      );

      const { GET } = await import("@/app/api/kitchen/prep-tasks/[id]/route");
      const res = await GET(
        makeRequest(`/api/kitchen/prep-tasks/${TEST_PREP_TASK_ID}`),
        { params: Promise.resolve({ id: TEST_PREP_TASK_ID }) }
      );

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.message).toBe("Internal server error");
    });
  });

  // ========================================================== COMMAND ROUTES
  // 13 commands × 7 paths = 91 tests. Pattern matches prep-lists.test.ts.

  type CommandSpec = {
    name: string;
    runtimeName: string;
    path: string;
    routePath: string;
    sampleBody: Record<string, unknown>;
  };

  const COMMANDS: CommandSpec[] = [
    {
      name: "cancel",
      runtimeName: "cancel",
      path: "/api/kitchen/prep-tasks/commands/cancel",
      routePath: "@/app/api/manifest/[entity]/commands/[command]/route",
      sampleBody: { id: TEST_PREP_TASK_ID, reason: "no longer needed" },
    },
    {
      name: "claim",
      runtimeName: "claim",
      path: "/api/kitchen/prep-tasks/commands/claim",
      routePath: "@/app/api/manifest/[entity]/commands/[command]/route",
      sampleBody: { id: TEST_PREP_TASK_ID, claimedBy: TEST_USER_ID },
    },
    {
      name: "complete",
      runtimeName: "complete",
      path: "/api/kitchen/prep-tasks/commands/complete",
      routePath: "@/app/api/manifest/[entity]/commands/[command]/route",
      sampleBody: { id: TEST_PREP_TASK_ID, quantityCompleted: 10 },
    },
    {
      name: "create",
      runtimeName: "create",
      path: "/api/kitchen/prep-tasks/commands/create",
      routePath: "@/app/api/manifest/[entity]/commands/[command]/route",
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
      path: "/api/kitchen/prep-tasks/commands/reassign",
      routePath: "@/app/api/manifest/[entity]/commands/[command]/route",
      sampleBody: {
        id: TEST_PREP_TASK_ID,
        assigneeId: "another-user",
      },
    },
    {
      name: "release",
      runtimeName: "release",
      path: "/api/kitchen/prep-tasks/commands/release",
      routePath: "@/app/api/manifest/[entity]/commands/[command]/route",
      sampleBody: { id: TEST_PREP_TASK_ID },
    },
    {
      name: "start",
      runtimeName: "start",
      path: "/api/kitchen/prep-tasks/commands/start",
      routePath: "@/app/api/manifest/[entity]/commands/[command]/route",
      sampleBody: { id: TEST_PREP_TASK_ID, startedBy: TEST_USER_ID },
    },
    {
      name: "unclaim",
      runtimeName: "unclaim",
      path: "/api/kitchen/prep-tasks/commands/unclaim",
      routePath: "@/app/api/manifest/[entity]/commands/[command]/route",
      sampleBody: { id: TEST_PREP_TASK_ID },
    },
    {
      name: "update-assignment",
      runtimeName: "updateAssignment",
      path: "/api/kitchen/prep-tasks/commands/update-assignment",
      routePath: "@/app/api/manifest/[entity]/commands/[command]/route",
      sampleBody: {
        id: TEST_PREP_TASK_ID,
        assigneeId: "user-2",
      },
    },
    {
      name: "update-due-date",
      runtimeName: "updateDueDate",
      path: "/api/kitchen/prep-tasks/commands/update-due-date",
      routePath: "@/app/api/manifest/[entity]/commands/[command]/route",
      sampleBody: {
        id: TEST_PREP_TASK_ID,
        dueByDate: "2026-05-02T12:00:00Z",
      },
    },
    {
      name: "update-priority",
      runtimeName: "updatePriority",
      path: "/api/kitchen/prep-tasks/commands/update-priority",
      routePath: "@/app/api/manifest/[entity]/commands/[command]/route",
      sampleBody: { id: TEST_PREP_TASK_ID, priority: 3 },
    },
    {
      name: "update-quantity",
      runtimeName: "updateQuantity",
      path: "/api/kitchen/prep-tasks/commands/update-quantity",
      routePath: "@/app/api/manifest/[entity]/commands/[command]/route",
      sampleBody: { id: TEST_PREP_TASK_ID, quantityTotal: 25 },
    },
    {
      name: "update-status",
      runtimeName: "updateStatus",
      path: "/api/kitchen/prep-tasks/commands/update-status",
      routePath: "@/app/api/manifest/[entity]/commands/[command]/route",
      sampleBody: { id: TEST_PREP_TASK_ID, status: "in_progress" },
    },
  ];

  describe.each(COMMANDS)("POST $path", ({
    name,
    runtimeName,
    path,
    routePath,
    sampleBody,
  }) => {
    it(`returns 401 when unauthenticated [${name}]`, async () => {
      unauthed();
      const mod = await import(routePath);
      const res = await mod.POST(postRequest(path, sampleBody), {
        params: Promise.resolve({ entity: "PrepTask", command: name }),
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.message).toBe("Unauthorized");
    });

    it(`returns 400 when tenant cannot be resolved [${name}]`, async () => {
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const mod = await import(routePath);
      const res = await mod.POST(postRequest(path, sampleBody), {
        params: Promise.resolve({ entity: "PrepTask", command: name }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.message).toBe("Tenant not found");
    });

    it(`returns 200 with result and events on success [${name}]`, async () => {
      mockRuntimeSuccess({ id: TEST_PREP_TASK_ID, status: "pending" });

      const mod = await import(routePath);
      const res = await mod.POST(postRequest(path, sampleBody), {
        params: Promise.resolve({ entity: "PrepTask", command: name }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.result.id).toBe(TEST_PREP_TASK_ID);
      expect(body.events).toHaveLength(1);

      // Pin the user context shape — a regression dropping userId or
      // tenantId would silently break command authorization at runtime.
      const runtimeCall = vi.mocked(createManifestRuntime).mock.calls[0][0];
      expect(runtimeCall).toEqual({
        user: { id: TEST_USER_ID, tenantId: TEST_TENANT_ID },
      });
    });

    it(`returns 403 on policy denial [${name}]`, async () => {
      mockRuntimePolicyDenial("kitchenStaffOnly");

      const mod = await import(routePath);
      const res = await mod.POST(postRequest(path, sampleBody), {
        params: Promise.resolve({ entity: "PrepTask", command: name }),
      });

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.message).toContain("Access denied");
      expect(body.message).toContain("kitchenStaffOnly");
    });

    it(`returns 422 on guard failure [${name}]`, async () => {
      mockRuntimeGuardFailure(0, "id is required");

      const mod = await import(routePath);
      const res = await mod.POST(postRequest(path, sampleBody), {
        params: Promise.resolve({ entity: "PrepTask", command: name }),
      });

      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.message).toContain("Guard 0 failed");
      expect(body.message).toContain("id is required");
    });

    it(`returns 400 on generic command failure [${name}]`, async () => {
      mockRuntimeFailure("Illegal state transition");

      const mod = await import(routePath);
      const res = await mod.POST(postRequest(path, sampleBody), {
        params: Promise.resolve({ entity: "PrepTask", command: name }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.message).toBe("Illegal state transition");
    });

    it(`returns 500 when runtime throws [${name}]`, async () => {
      vi.mocked(createManifestRuntime).mockRejectedValue(
        new Error("Runtime explosion") as never
      );

      const mod = await import(routePath);
      const res = await mod.POST(postRequest(path, sampleBody), {
        params: Promise.resolve({ entity: "PrepTask", command: name }),
      });

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.message).toBe("Internal server error");
    });

    it(`forwards correct camelCase command name + entity to runtime [${name}]`, async () => {
      const runCommand = vi.fn().mockResolvedValue({
        success: true,
        result: { id: TEST_PREP_TASK_ID },
        emittedEvents: [],
      });
      vi.mocked(createManifestRuntime).mockResolvedValue({
        runCommand,
      } as never);

      const mod = await import(routePath);
      await mod.POST(postRequest(path, sampleBody), {
        params: Promise.resolve({ entity: "PrepTask", command: name }),
      });

      // Pinned: kebab-case URL slug -> camelCase runtime name.
      expect(runCommand).toHaveBeenCalledWith(runtimeName, sampleBody, {
        entityName: "PrepTask",
      });
    });
  });
});
