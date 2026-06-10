/**
 * Prep Lists API Test Suite
 *
 * Covers:
 *   GET    /api/kitchen/prep-lists           (list with filters + pagination)
 *   GET    /api/kitchen/prep-lists/[id]      (detail, station grouping)
 *   POST   /api/kitchen/prep-lists           (PrepList.create via runManifestCommand)
 *   PATCH  /api/kitchen/prep-lists/[id]      (PrepList.update via runManifestCommand)
 *   DELETE /api/kitchen/prep-lists/[id]      (PrepList.cancel via runManifestCommand)
 *   POST   command routes via dispatcher (activate, cancel, create, create-from-seed,
 *          deactivate, finalize, mark-completed, reopen, update, update-batch-multiplier)
 *
 * @vitest-environment node
 */

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  tenant: vi.fn(),
  resolveCurrentUser: vi.fn(),
  captureException: vi.fn(),
  runManifestCommand: vi.fn(),
  prepListFindMany: vi.fn(),
  prepListCount: vi.fn(),
  prepListFindFirst: vi.fn(),
  prepListItemFindMany: vi.fn(),
  eventFindMany: vi.fn(),
  eventFindFirst: vi.fn(),
}));

vi.mock("@repo/auth/server", () => ({ auth: mocks.auth }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: mocks.tenant,
  requireCurrentUser: vi.fn(),
  resolveCurrentUser: mocks.resolveCurrentUser,
}));
vi.mock("@repo/database", () => ({
  database: {
    prepList: {
      findMany: mocks.prepListFindMany,
      count: mocks.prepListCount,
      findFirst: mocks.prepListFindFirst,
    },
    prepListItem: {
      findMany: mocks.prepListItemFindMany,
    },
    event: {
      findMany: mocks.eventFindMany,
      findFirst: mocks.eventFindFirst,
    },
  },
}));
vi.mock("@sentry/nextjs", () => ({ captureException: mocks.captureException, addBreadcrumb: vi.fn() }));
vi.mock("@repo/observability/log", () => ({ log: { error: vi.fn(), info: vi.fn() } }));
vi.mock("@/lib/manifest/execute-command", () => ({ runManifestCommand: mocks.runManifestCommand }));
vi.mock("@/lib/manifest-runtime", () => ({ createManifestRuntime: vi.fn() }));
vi.mock("@/lib/manifest-response", async () => {
  const { NextResponse } = await import("next/server");
  return {
    manifestSuccessResponse: (data: unknown, status = 200) =>
      NextResponse.json({ success: true, ...(typeof data === "object" && data !== null ? data : { data }) }, { status }),
    manifestErrorResponse: (message: string | { error: string; diagnostics?: unknown[] }, status: number) => {
      const body = typeof message === "string" ? { success: false, message } : { success: false, ...message };
      return NextResponse.json(body, { status });
    },
  };
});
vi.mock("@repo/notifications", () => ({}));
vi.mock("@/app/lib/webhook-dispatch", () => ({ dispatchWebhooks: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/app/lib/invariant", () => {
  class InvariantError extends Error { name = "InvariantError" as const; constructor(m: string) { super(m); this.name = "InvariantError"; } }
  return { invariant: vi.fn(), InvariantError };
});
vi.mock("@repo/manifest-runtime/run-manifest-command-core", () => ({ runManifestCommandCore: vi.fn() }));
vi.mock("@/lib/manifest/issue-log", () => ({ logManifestIssue: vi.fn() }));

const { POST: manifestDispatch } = await import("@/app/api/manifest/[entity]/commands/[command]/route");

const TEST_TENANT_ID = "00000000-0000-0000-0000-000000000200";
const TEST_USER_ID = "user_prep_list_test";
const TEST_ORG_ID = "org_prep_list_test";
const TEST_PREP_LIST_ID = "11111111-1111-4111-a111-111111111111";
const TEST_EVENT_ID = "22222222-2222-4222-a222-222222222222";
const MOCK_USER = { id: TEST_USER_ID, tenantId: TEST_TENANT_ID, role: "admin" };

function authed() {
  mocks.auth.mockResolvedValue({ orgId: TEST_ORG_ID, userId: TEST_USER_ID });
  mocks.tenant.mockResolvedValue(TEST_TENANT_ID);
  mocks.resolveCurrentUser.mockResolvedValue(MOCK_USER as never);
}

function makeGET(url: string): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"));
}

function makePOST(url: string, body: unknown = {}): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function findManyAndClauses(): unknown[] {
  const call = mocks.prepListFindMany.mock.calls[0];
  if (!call) throw new Error("prepList.findMany was not called");
  const arg = call[0] as { where?: { AND: unknown[] } };
  if (!arg?.where?.AND) throw new Error("prepList.findMany not called with where.AND");
  return arg.where.AND;
}

function mockRunSuccess(result: Record<string, unknown> = { id: TEST_PREP_LIST_ID }) {
  mocks.runManifestCommand.mockResolvedValue(
    new Response(JSON.stringify({ success: true, result, events: [{ type: "PrepListEvent", entityId: result.id }] }), { status: 200 })
  );
}

function mockRunError(status: number, message: string) {
  mocks.runManifestCommand.mockResolvedValue(
    new Response(JSON.stringify({ success: false, message }), { status })
  );
}

describe("Prep Lists API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authed();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ========================================================== GET LIST
  describe("GET /api/kitchen/prep-lists", () => {
    it("returns 401 when unauthenticated", async () => {
      mocks.auth.mockResolvedValue({ orgId: null });
      const { GET } = await import("@/app/api/kitchen/prep-lists/route");
      const res = await GET(makeGET("/api/kitchen/prep-lists"));
      expect(res.status).toBe(401);
    });

    it("returns paginated prep lists with default pagination", async () => {
      mocks.prepListFindMany.mockResolvedValue([{
        id: TEST_PREP_LIST_ID, tenantId: TEST_TENANT_ID, eventId: TEST_EVENT_ID,
        name: "Wedding Prep List", batchMultiplier: 1.0, dietaryRestrictions: [],
        status: "draft", totalItems: 0, totalEstimatedTime: 0, notes: null,
        generatedAt: new Date("2026-04-01"), finalizedAt: null,
        createdAt: new Date("2026-04-01"), updatedAt: new Date("2026-04-01"),
      }]);
      mocks.prepListCount.mockResolvedValue(1);
      mocks.eventFindMany.mockResolvedValue([{ id: TEST_EVENT_ID, title: "Wedding", eventDate: new Date("2026-05-01") }]);

      const { GET } = await import("@/app/api/kitchen/prep-lists/route");
      const res = await GET(makeGET("/api/kitchen/prep-lists"));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toHaveLength(1);
      expect(body.data[0].id).toBe(TEST_PREP_LIST_ID);
      expect(body.data[0].batchMultiplier).toBe(1);
      expect(body.pagination).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
    });

    it("applies eventId filter", async () => {
      mocks.prepListFindMany.mockResolvedValue([]);
      mocks.prepListCount.mockResolvedValue(0);
      mocks.eventFindMany.mockResolvedValue([]);

      const { GET } = await import("@/app/api/kitchen/prep-lists/route");
      await GET(makeGET(`/api/kitchen/prep-lists?eventId=${TEST_EVENT_ID}`));

      const ands = findManyAndClauses();
      expect(ands.some((c) => (c as Record<string, unknown>).eventId === TEST_EVENT_ID)).toBe(true);
    });

    it("applies status filter", async () => {
      mocks.prepListFindMany.mockResolvedValue([]);
      mocks.prepListCount.mockResolvedValue(0);
      mocks.eventFindMany.mockResolvedValue([]);

      const { GET } = await import("@/app/api/kitchen/prep-lists/route");
      await GET(makeGET("/api/kitchen/prep-lists?status=active"));

      const ands = findManyAndClauses();
      expect(ands.some((c) => (c as Record<string, unknown>).status === "active")).toBe(true);
    });

    it("applies search filter as case-insensitive contains", async () => {
      mocks.prepListFindMany.mockResolvedValue([]);
      mocks.prepListCount.mockResolvedValue(0);
      mocks.eventFindMany.mockResolvedValue([]);

      const { GET } = await import("@/app/api/kitchen/prep-lists/route");
      await GET(makeGET("/api/kitchen/prep-lists?search=Wedding"));

      const ands = findManyAndClauses();
      expect(ands.some((c) => {
        const name = (c as Record<string, unknown>).name as { contains: string; mode: string } | undefined;
        return name?.contains === "wedding" && name?.mode === "insensitive";
      })).toBe(true);
    });

    it("filters by station via prepListItem lookup", async () => {
      mocks.prepListItemFindMany.mockResolvedValue([{ prepListId: TEST_PREP_LIST_ID }]);
      mocks.prepListFindMany.mockResolvedValue([{ id: TEST_PREP_LIST_ID }]);
      mocks.prepListCount.mockResolvedValue(1);
      mocks.eventFindMany.mockResolvedValue([]);

      const { GET } = await import("@/app/api/kitchen/prep-lists/route");
      const res = await GET(makeGET("/api/kitchen/prep-lists?station=station-1"));
      expect(res.status).toBe(200);

      const ands = findManyAndClauses();
      expect(ands.some((c) => {
        const id = (c as Record<string, unknown>).id as { in: string[] } | undefined;
        return id?.in?.includes(TEST_PREP_LIST_ID);
      })).toBe(true);
    });

    it("returns empty result when station has no prep lists", async () => {
      mocks.prepListItemFindMany.mockResolvedValue([]);

      const { GET } = await import("@/app/api/kitchen/prep-lists/route");
      const res = await GET(makeGET("/api/kitchen/prep-lists?station=empty-station"));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toEqual([]);
      expect(body.pagination.total).toBe(0);
      expect(mocks.prepListFindMany).not.toHaveBeenCalled();
    });

    it("respects custom page and limit", async () => {
      mocks.prepListFindMany.mockResolvedValue([]);
      mocks.prepListCount.mockResolvedValue(45);
      mocks.eventFindMany.mockResolvedValue([]);

      const { GET } = await import("@/app/api/kitchen/prep-lists/route");
      const res = await GET(makeGET("/api/kitchen/prep-lists?page=2&limit=10"));
      const body = await res.json();
      expect(body.pagination).toEqual({ page: 2, limit: 10, total: 45, totalPages: 5 });
      expect(mocks.prepListFindMany).toHaveBeenCalledWith(expect.objectContaining({ take: 10, skip: 10 }));
    });

    it("clamps limit to max 100", async () => {
      mocks.prepListFindMany.mockResolvedValue([]);
      mocks.prepListCount.mockResolvedValue(0);
      mocks.eventFindMany.mockResolvedValue([]);

      const { GET } = await import("@/app/api/kitchen/prep-lists/route");
      await GET(makeGET("/api/kitchen/prep-lists?limit=999"));
      expect(mocks.prepListFindMany).toHaveBeenCalledWith(expect.objectContaining({ take: 100 }));
    });

    it("returns 500 on unexpected database error", async () => {
      mocks.prepListFindMany.mockRejectedValue(new Error("DB down"));
      const { GET } = await import("@/app/api/kitchen/prep-lists/route");
      const res = await GET(makeGET("/api/kitchen/prep-lists"));
      expect(res.status).toBe(500);
    });
  });

  // ========================================================== POST CREATE (root)
  describe("POST /api/kitchen/prep-lists", () => {
    it("delegates to runManifestCommand with PrepList.create", async () => {
      mocks.runManifestCommand.mockResolvedValue(
        new Response(JSON.stringify({ success: true, result: { id: TEST_PREP_LIST_ID } }), { status: 200 })
      );

      const { POST } = await import("@/app/api/kitchen/prep-lists/route");
      await POST(makePOST("/api/kitchen/prep-lists", { eventId: TEST_EVENT_ID }));

      expect(mocks.runManifestCommand).toHaveBeenCalledWith(expect.objectContaining({
        entity: "PrepList", command: "create",
      }));
    });
  });

  // ========================================================== GET DETAIL
  describe("GET /api/kitchen/prep-lists/[id]", () => {
    it("returns 401 when unauthenticated", async () => {
      mocks.auth.mockResolvedValue({ orgId: null });
      const { GET } = await import("@/app/api/kitchen/prep-lists/[id]/route");
      const res = await GET(makeGET(`/api/kitchen/prep-lists/${TEST_PREP_LIST_ID}`), { params: Promise.resolve({ id: TEST_PREP_LIST_ID }) });
      expect(res.status).toBe(401);
    });

    it("returns 404 when prep list not found", async () => {
      mocks.prepListFindFirst.mockResolvedValue(null);
      const { GET } = await import("@/app/api/kitchen/prep-lists/[id]/route");
      const res = await GET(makeGET(`/api/kitchen/prep-lists/${TEST_PREP_LIST_ID}`), { params: Promise.resolve({ id: TEST_PREP_LIST_ID }) });
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe("Prep list not found");
    });

    it("returns prep list with grouped station items", async () => {
      mocks.prepListFindFirst.mockResolvedValue({
        id: TEST_PREP_LIST_ID, tenantId: TEST_TENANT_ID, eventId: TEST_EVENT_ID,
        name: "Wedding Prep List", batchMultiplier: 1.0, dietaryRestrictions: [],
        status: "draft", totalItems: 3, totalEstimatedTime: 0, notes: null,
        generatedAt: new Date("2026-04-01"), finalizedAt: null,
        createdAt: new Date("2026-04-01"), updatedAt: new Date("2026-04-01"),
        tenant: { id: TEST_TENANT_ID },
      });
      mocks.eventFindFirst.mockResolvedValue({ title: "Wedding", eventDate: new Date("2026-05-01") });
      mocks.prepListItemFindMany.mockResolvedValue([
        { id: "item-1", stationId: "s1", stationName: "Pastry", ingredientId: "ing-1", ingredientName: "Flour", category: "dry", baseQuantity: 100, baseUnit: "g", scaledQuantity: 100, scaledUnit: "g", isOptional: false, preparationNotes: null, allergens: ["gluten"], dietarySubstitutions: [], dishId: null, dishName: null, recipeVersionId: null, sortOrder: 0, isCompleted: false, completedAt: null, completedBy: null },
        { id: "item-2", stationId: "s1", stationName: "Pastry", ingredientId: "ing-2", ingredientName: "Sugar", category: "dry", baseQuantity: 50, baseUnit: "g", scaledQuantity: 50, scaledUnit: "g", isOptional: false, preparationNotes: null, allergens: [], dietarySubstitutions: [], dishId: null, dishName: null, recipeVersionId: null, sortOrder: 1, isCompleted: false, completedAt: null, completedBy: null },
        { id: "item-3", stationId: "s2", stationName: "Grill", ingredientId: "ing-3", ingredientName: "Chicken", category: "protein", baseQuantity: 200, baseUnit: "g", scaledQuantity: 200, scaledUnit: "g", isOptional: false, preparationNotes: null, allergens: [], dietarySubstitutions: [], dishId: null, dishName: null, recipeVersionId: null, sortOrder: 0, isCompleted: false, completedAt: null, completedBy: null },
      ]);

      const { GET } = await import("@/app/api/kitchen/prep-lists/[id]/route");
      const res = await GET(makeGET(`/api/kitchen/prep-lists/${TEST_PREP_LIST_ID}`), { params: Promise.resolve({ id: TEST_PREP_LIST_ID }) });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.id).toBe(TEST_PREP_LIST_ID);
      expect(body.eventTitle).toBe("Wedding");
      expect(body.stations).toHaveLength(2);
      expect(body.stations[0].stationName).toBe("Pastry");
      expect(body.stations[0].items).toHaveLength(2);
      expect(body.stations[1].stationName).toBe("Grill");
      expect(body.stations[1].items).toHaveLength(1);
    });

    it("returns 500 on unexpected error", async () => {
      mocks.prepListFindFirst.mockRejectedValue(new Error("Boom"));
      const { GET } = await import("@/app/api/kitchen/prep-lists/[id]/route");
      const res = await GET(makeGET(`/api/kitchen/prep-lists/${TEST_PREP_LIST_ID}`), { params: Promise.resolve({ id: TEST_PREP_LIST_ID }) });
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe("Failed to get prep list");
    });
  });

  // ========================================================== PATCH
  describe("PATCH /api/kitchen/prep-lists/[id]", () => {
    it("delegates to runManifestCommand with PrepList.update", async () => {
      mocks.runManifestCommand.mockResolvedValue(
        new Response(JSON.stringify({ success: true, result: { id: TEST_PREP_LIST_ID } }), { status: 200 })
      );

      const { PATCH } = await import("@/app/api/kitchen/prep-lists/[id]/route");
      const req = makePOST(`/api/kitchen/prep-lists/${TEST_PREP_LIST_ID}`, { name: "Updated" });
      await PATCH(req, { params: Promise.resolve({ id: TEST_PREP_LIST_ID }) });

      expect(mocks.runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({ entity: "PrepList", command: "update", body: expect.objectContaining({ name: "Updated", id: TEST_PREP_LIST_ID }) })
      );
    });
  });

  // ========================================================== DELETE
  describe("DELETE /api/kitchen/prep-lists/[id]", () => {
    it("delegates to runManifestCommand with PrepList.cancel", async () => {
      mocks.runManifestCommand.mockResolvedValue(
        new Response(JSON.stringify({ success: true, result: { id: TEST_PREP_LIST_ID } }), { status: 200 })
      );

      const { DELETE } = await import("@/app/api/kitchen/prep-lists/[id]/route");
      const req = new NextRequest(new URL(`/api/kitchen/prep-lists/${TEST_PREP_LIST_ID}`, "http://localhost:3000"), { method: "DELETE" });
      await DELETE(req, { params: Promise.resolve({ id: TEST_PREP_LIST_ID }) });

      expect(mocks.runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "PrepList", command: "cancel",
          body: expect.objectContaining({ id: TEST_PREP_LIST_ID, reason: "Deleted via API", canceledBy: TEST_USER_ID }),
        })
      );
    });
  });

  // ========================================================== COMMAND ROUTES

  type CommandSpec = {
    name: string;
    runtimeName: string;
    sampleBody: Record<string, unknown>;
  };

  const COMMANDS: CommandSpec[] = [
    { name: "activate", runtimeName: "activate", sampleBody: { id: TEST_PREP_LIST_ID } },
    { name: "cancel", runtimeName: "cancel", sampleBody: { id: TEST_PREP_LIST_ID, reason: "Test cancel" } },
    { name: "create", runtimeName: "create", sampleBody: { eventId: TEST_EVENT_ID, name: "Test Prep List", batchMultiplier: 1 } },
    { name: "create-from-seed", runtimeName: "createFromSeed", sampleBody: { eventId: TEST_EVENT_ID, seedId: "seed-1" } },
    { name: "deactivate", runtimeName: "deactivate", sampleBody: { id: TEST_PREP_LIST_ID } },
    { name: "finalize", runtimeName: "finalize", sampleBody: { id: TEST_PREP_LIST_ID } },
    { name: "mark-completed", runtimeName: "markCompleted", sampleBody: { id: TEST_PREP_LIST_ID } },
    { name: "reopen", runtimeName: "reopen", sampleBody: { id: TEST_PREP_LIST_ID } },
    { name: "update", runtimeName: "update", sampleBody: { id: TEST_PREP_LIST_ID, name: "Renamed" } },
    { name: "update-batch-multiplier", runtimeName: "updateBatchMultiplier", sampleBody: { id: TEST_PREP_LIST_ID, batchMultiplier: 2.5 } },
  ];

  describe.each(COMMANDS)("POST PrepList.$name", ({ name, runtimeName, sampleBody }) => {
    it(`returns 401 when unauthenticated [${name}]`, async () => {
      const { InvariantError } = await import("@/app/lib/invariant");
      const { requireCurrentUser } = await import("@/app/lib/tenant");
      vi.mocked(requireCurrentUser).mockImplementation(() => { throw new InvariantError("Unauthorized"); });

      const res = await manifestDispatch(makePOST("/api/kitchen/prep-lists/commands/" + name, sampleBody), { params: Promise.resolve({ entity: "PrepList", command: name }) });
      expect(res.status).toBe(401);
    });

    it(`returns 200 with result and events on success [${name}]`, async () => {
      const { requireCurrentUser } = await import("@/app/lib/tenant");
      vi.mocked(requireCurrentUser).mockResolvedValue({ id: TEST_USER_ID, tenantId: TEST_TENANT_ID, role: "admin" } as never);

      mockRunSuccess({ id: TEST_PREP_LIST_ID, status: "active" });
      const res = await manifestDispatch(makePOST("/api/kitchen/prep-lists/commands/" + name, sampleBody), { params: Promise.resolve({ entity: "PrepList", command: name }) });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.result.id).toBe(TEST_PREP_LIST_ID);
      expect(body.events).toHaveLength(1);
    });

    it(`returns 403 on policy denial [${name}]`, async () => {
      const { requireCurrentUser } = await import("@/app/lib/tenant");
      vi.mocked(requireCurrentUser).mockResolvedValue({ id: TEST_USER_ID, tenantId: TEST_TENANT_ID, role: "admin" } as never);

      mockRunError(403, "Access denied: adminOnly (role=admin)");
      const res = await manifestDispatch(makePOST("/api/kitchen/prep-lists/commands/" + name, sampleBody), { params: Promise.resolve({ entity: "PrepList", command: name }) });
      expect(res.status).toBe(403);
      expect((await res.json()).message).toContain("adminOnly");
    });

    it(`returns 422 on guard failure [${name}]`, async () => {
      const { requireCurrentUser } = await import("@/app/lib/tenant");
      vi.mocked(requireCurrentUser).mockResolvedValue({ id: TEST_USER_ID, tenantId: TEST_TENANT_ID, role: "admin" } as never);

      mockRunError(422, "Guard 0 failed: id is required");
      const res = await manifestDispatch(makePOST("/api/kitchen/prep-lists/commands/" + name, sampleBody), { params: Promise.resolve({ entity: "PrepList", command: name }) });
      expect(res.status).toBe(422);
      expect((await res.json()).message).toContain("Guard 0 failed");
    });

    it(`returns 400 on generic command failure [${name}]`, async () => {
      const { requireCurrentUser } = await import("@/app/lib/tenant");
      vi.mocked(requireCurrentUser).mockResolvedValue({ id: TEST_USER_ID, tenantId: TEST_TENANT_ID, role: "admin" } as never);

      mockRunError(400, "State transition not allowed");
      const res = await manifestDispatch(makePOST("/api/kitchen/prep-lists/commands/" + name, sampleBody), { params: Promise.resolve({ entity: "PrepList", command: name }) });
      expect(res.status).toBe(400);
      expect((await res.json()).message).toBe("State transition not allowed");
    });

    it(`returns 500 when runtime throws [${name}]`, async () => {
      const { requireCurrentUser } = await import("@/app/lib/tenant");
      vi.mocked(requireCurrentUser).mockRejectedValue(new Error("Runtime explosion") as never);

      const res = await manifestDispatch(makePOST("/api/kitchen/prep-lists/commands/" + name, sampleBody), { params: Promise.resolve({ entity: "PrepList", command: name }) });
      expect(res.status).toBe(500);
    });

    it(`passes correct command name + entity to runtime [${name}]`, async () => {
      const { requireCurrentUser } = await import("@/app/lib/tenant");
      vi.mocked(requireCurrentUser).mockResolvedValue({ id: TEST_USER_ID, tenantId: TEST_TENANT_ID, role: "admin" } as never);

      mockRunSuccess({ id: TEST_PREP_LIST_ID });
      await manifestDispatch(makePOST("/api/kitchen/prep-lists/commands/" + name, sampleBody), { params: Promise.resolve({ entity: "PrepList", command: name }) });

      expect(mocks.runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({ entity: "PrepList", command: name })
      );
    });
  });
});
