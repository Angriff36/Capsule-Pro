/**
 * Event Timeline API Route Tests
 *
 * Covers:
 *   GET    /api/events/[eventId]/timeline                  (list + summary)
 *   POST   dispatch(EventTimelineItem, "createItem")
 *   POST   dispatch(EventTimelineItem, "updateItem")
 *   POST   dispatch(EventTimelineItem, "completeItem")
 *   POST   dispatch(EventTimelineItem, "deleteItem")
 *
 * GET route tests use concrete route + database mocks.
 * POST command tests use generic dispatcher + runManifestCommand mock.
 *
 * @vitest-environment node
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const TEST_TENANT_ID = "a0000000-0000-4000-a000-000000000001";
const TEST_USER_ID = "user_test_timeline";
const TEST_ORG_ID = "org_test_timeline";
const TEST_EVENT_ID = "b0000000-0000-4000-b000-000000000010";
const TEST_ITEM_ID = "c0000000-0000-4000-9000-000000000020";
const INVALID_UUID = "not-a-uuid";

const mocks = vi.hoisted(() => ({
  eventFindFirstMock: vi.fn(),
  eventFindUniqueMock: vi.fn(),
  timelineFindManyMock: vi.fn(),
  timelineFindFirstMock: vi.fn(),
  timelineCreateMock: vi.fn(),
  timelineUpdateMock: vi.fn(),
  timelineAggregateMock: vi.fn(),
  authMock: vi.fn(),
  tenantMock: vi.fn(),
  requireCurrentUserMock: vi.fn(),
  runManifestCommandMock: vi.fn(),
}));

vi.mock("@repo/auth/server", () => ({
  auth: mocks.authMock,
}));

vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: mocks.tenantMock,
  requireTenantId: vi.fn(),
  requireCurrentUser: mocks.requireCurrentUserMock,
  resolveCurrentUser: vi.fn(),
}));

vi.mock("@repo/database", () => ({
  database: {
    event: {
      findFirst: mocks.eventFindFirstMock,
      findUnique: mocks.eventFindUniqueMock,
    },
    eventTimeline: {
      findMany: mocks.timelineFindManyMock,
      findFirst: mocks.timelineFindFirstMock,
      create: mocks.timelineCreateMock,
      update: mocks.timelineUpdateMock,
      aggregate: mocks.timelineAggregateMock,
    },
  },
}));
vi.mock("@/lib/manifest-response", async () => {
  const { NextResponse } = await import("next/server");
  return {
    manifestSuccessResponse: (data: unknown, status = 200) =>
      NextResponse.json({ success: true, ...(typeof data === "object" && data !== null ? data : { data }) }, { status }),
    manifestErrorResponse: (message: string | { error: string; diagnostics?: unknown[] }, status: number) =>
      NextResponse.json(
        typeof message === "string" ? { success: false, message } : { success: false, error: message.error, diagnostics: message.diagnostics ?? [] },
        { status }
      ),
  };
});
vi.mock("@/lib/manifest/execute-command", () => ({ runManifestCommand: mocks.runManifestCommandMock }));
vi.mock("@/app/lib/invariant", () => ({
  InvariantError: class InvariantError extends Error {
    constructor(message: string) { super(message); this.name = "InvariantError"; }
  },
  invariant: (condition: unknown, message: string) => {
    if (!condition) { const err = new Error(message); err.name = "InvariantError"; throw err; }
  },
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

import { GET as listGET } from "@/app/api/events/[eventId]/timeline/route";
import { POST as manifestDispatch } from "@/app/api/manifest/[entity]/commands/[command]/route";

const dispatch =
  (entity: string, command: string) => (req: NextRequest, _ctx?: unknown) =>
    manifestDispatch(req, { params: Promise.resolve({ entity, command }) });

const createPOST = dispatch("EventTimelineItem", "createItem");
const deletePOST = dispatch("EventTimelineItem", "deleteItem");
const togglePOST = dispatch("EventTimelineItem", "completeItem");
const updatePOST = dispatch("EventTimelineItem", "updateItem");

const TEST_CURRENT_USER = {
  id: TEST_USER_ID,
  tenantId: TEST_TENANT_ID,
  role: "admin",
  email: "test@test.com",
  firstName: "Test",
  lastName: "User",
};

function setAuthOk() {
  mocks.authMock.mockResolvedValue({
    orgId: TEST_ORG_ID,
    userId: TEST_USER_ID,
  });
  mocks.tenantMock.mockResolvedValue(TEST_TENANT_ID);
  mocks.requireCurrentUserMock.mockResolvedValue(TEST_CURRENT_USER);
}

function setAuthMissingUser() {
  mocks.authMock.mockResolvedValue({ orgId: null, userId: null });
  const authError = new Error("Unauthenticated");
  authError.name = "InvariantError";
  mocks.requireCurrentUserMock.mockRejectedValue(authError);
}

function setAuthMissingTenant() {
  mocks.authMock.mockResolvedValue({
    orgId: TEST_ORG_ID,
    userId: TEST_USER_ID,
  });
  mocks.tenantMock.mockResolvedValue(null);
}

function makeReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function eventParams(id: string) {
  return { params: Promise.resolve({ eventId: id }) };
}

function ok(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify({ success: true, ...data }), {
    status, headers: { "Content-Type": "application/json" },
  });
}

function fail(status: number, message: string) {
  return new Response(JSON.stringify({ success: false, message }), {
    status, headers: { "Content-Type": "application/json" },
  });
}

describe("Event Timeline API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    // Default: authenticated user + success response for dispatcher
    mocks.requireCurrentUserMock.mockResolvedValue(TEST_CURRENT_USER);
    mocks.runManifestCommandMock.mockResolvedValue(
      ok({ result: { id: "test-id" }, events: [] })
    );
  });

  // ---------------------------------------------------------------- //
  // GET /timeline                                                     //
  // ---------------------------------------------------------------- //
  describe("GET /timeline", () => {
    it("returns 401 when unauthenticated", async () => {
      setAuthMissingUser();
      const res = await listGET(
        new NextRequest("http://localhost"),
        eventParams(TEST_EVENT_ID)
      );
      expect(res.status).toBe(401);
    });

    it("returns 400 for invalid eventId", async () => {
      setAuthOk();
      const res = await listGET(
        new NextRequest("http://localhost"),
        eventParams(INVALID_UUID)
      );
      expect(res.status).toBe(400);
    });

    it("returns 403 when tenant is missing", async () => {
      setAuthMissingTenant();
      const res = await listGET(
        new NextRequest("http://localhost"),
        eventParams(TEST_EVENT_ID)
      );
      expect(res.status).toBe(403);
    });

    it("returns 404 when event is not found", async () => {
      setAuthOk();
      mocks.eventFindFirstMock.mockResolvedValue(null);
      const res = await listGET(
        new NextRequest("http://localhost"),
        eventParams(TEST_EVENT_ID)
      );
      expect(res.status).toBe(404);
    });

    it("returns items + summary on success", async () => {
      setAuthOk();
      mocks.eventFindFirstMock.mockResolvedValue({
        id: TEST_EVENT_ID,
        title: "Annual Gala",
        eventNumber: "EV-001",
        eventDate: new Date("2026-06-15"),
        status: "confirmed",
      });
      mocks.timelineFindManyMock.mockResolvedValue([
        {
          id: "11111111-1111-4111-9111-111111111111",
          timelineTime: new Date(Date.UTC(1970, 0, 1, 17, 0)),
          description: "Doors open",
          responsibleRole: "Captain",
          isCompleted: true,
          completedAt: new Date(),
          notes: null,
          sortOrder: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "22222222-2222-4222-9222-222222222222",
          timelineTime: new Date(Date.UTC(1970, 0, 1, 18, 0)),
          description: "First course",
          responsibleRole: "Chef",
          isCompleted: false,
          completedAt: null,
          notes: null,
          sortOrder: 20,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const res = await listGET(
        new NextRequest("http://localhost"),
        eventParams(TEST_EVENT_ID)
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as {
        data: {
          items: unknown[];
          summary: {
            total: number;
            completed: number;
            pending: number;
            completionRate: number;
          };
        };
      };
      expect(json.data.items).toHaveLength(2);
      expect(json.data.summary).toEqual({
        total: 2,
        completed: 1,
        pending: 1,
        completionRate: 0.5,
      });
      expect(mocks.timelineFindManyMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: TEST_TENANT_ID,
            eventId: TEST_EVENT_ID,
            deletedAt: null,
          },
        })
      );
    });
  });

  // ---------------------------------------------------------------- //
  // POST /create-item (via dispatcher)                                //
  // ---------------------------------------------------------------- //
  describe("POST /commands/create-item", () => {
    it("returns 401 when unauthenticated", async () => {
      setAuthMissingUser();
      const res = await createPOST(makeReq({}));
      expect(res.status).toBe(401);
    });

    it("creates an item and returns 200 on success", async () => {
      mocks.runManifestCommandMock.mockResolvedValue(
        ok({ result: { id: TEST_ITEM_ID, description: "Service", sortOrder: 30 }, events: [] })
      );

      const res = await createPOST(
        makeReq({ timelineTime: "14:30", description: "Service" })
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.result.description).toBe("Service");

      expect(mocks.runManifestCommandMock).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "EventTimelineItem",
          command: "createItem",
          body: expect.objectContaining({ description: "Service" }),
          user: { id: TEST_USER_ID, tenantId: TEST_TENANT_ID, role: "admin" },
        })
      );
    });

    it("returns 403 on policy denial", async () => {
      mocks.runManifestCommandMock.mockResolvedValue(fail(403, "Access denied: timelineManagerOnly"));

      const res = await createPOST(
        makeReq({ timelineTime: "14:30", description: "Service" })
      );
      expect(res.status).toBe(403);
    });

    it("returns 422 on guard failure", async () => {
      mocks.runManifestCommandMock.mockResolvedValue(
        fail(422, "Guard failed: Event must exist")
      );

      const res = await createPOST(
        makeReq({ timelineTime: "14:30", description: "Service" })
      );
      expect(res.status).toBe(422);
    });

    it("returns 400 on command failure", async () => {
      mocks.runManifestCommandMock.mockResolvedValue(
        fail(400, "Missing required field: description")
      );

      const res = await createPOST(makeReq({}));
      expect(res.status).toBe(400);
    });

    it("returns 500 when runtime throws", async () => {
      mocks.runManifestCommandMock.mockRejectedValue(new Error("DB connection lost"));

      const res = await createPOST(
        makeReq({ timelineTime: "14:30", description: "Service" })
      );
      expect(res.status).toBe(500);
    });
  });

  // ---------------------------------------------------------------- //
  // POST /update-item (via dispatcher)                                //
  // ---------------------------------------------------------------- //
  describe("POST /commands/update-item", () => {
    it("returns 401 when unauthenticated", async () => {
      setAuthMissingUser();
      const res = await updatePOST(
        makeReq({ itemId: TEST_ITEM_ID, description: "Updated" })
      );
      expect(res.status).toBe(401);
    });

    it("updates an item and returns 200 on success", async () => {
      mocks.runManifestCommandMock.mockResolvedValue(
        ok({ result: { id: TEST_ITEM_ID, description: "Updated", notes: "Cue music" }, events: [] })
      );

      const res = await updatePOST(
        makeReq({ itemId: TEST_ITEM_ID, description: "Updated", notes: "Cue music" })
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.result.description).toBe("Updated");

      expect(mocks.runManifestCommandMock).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "EventTimelineItem",
          command: "updateItem",
          body: expect.objectContaining({ itemId: TEST_ITEM_ID, description: "Updated" }),
        })
      );
    });

    it("returns 422 on guard failure", async () => {
      mocks.runManifestCommandMock.mockResolvedValue(
        fail(422, "Guard failed: Item not found")
      );

      const res = await updatePOST(
        makeReq({ itemId: TEST_ITEM_ID, description: "Updated" })
      );
      expect(res.status).toBe(422);
    });

    it("returns 400 on command failure", async () => {
      mocks.runManifestCommandMock.mockResolvedValue(
        fail(400, "No fields provided")
      );

      const res = await updatePOST(makeReq({ itemId: TEST_ITEM_ID }));
      expect(res.status).toBe(400);
    });

    it("returns 500 when runtime throws", async () => {
      mocks.runManifestCommandMock.mockRejectedValue(new Error("DB error"));

      const res = await updatePOST(
        makeReq({ itemId: TEST_ITEM_ID, description: "Updated" })
      );
      expect(res.status).toBe(500);
    });
  });

  // ---------------------------------------------------------------- //
  // POST /toggle-completed (via dispatcher)                           //
  // ---------------------------------------------------------------- //
  describe("POST /commands/toggle-completed", () => {
    it("returns 401 when unauthenticated", async () => {
      setAuthMissingUser();
      const res = await togglePOST(
        makeReq({ itemId: TEST_ITEM_ID, isCompleted: true })
      );
      expect(res.status).toBe(401);
    });

    it("sets completedAt when marking complete", async () => {
      mocks.runManifestCommandMock.mockResolvedValue(
        ok({ result: { id: TEST_ITEM_ID, isCompleted: true, completedAt: new Date().toISOString() }, events: [] })
      );

      const res = await togglePOST(
        makeReq({ itemId: TEST_ITEM_ID, isCompleted: true })
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.result.isCompleted).toBe(true);

      expect(mocks.runManifestCommandMock).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "EventTimelineItem",
          command: "completeItem",
          body: expect.objectContaining({ itemId: TEST_ITEM_ID, isCompleted: true }),
        })
      );
    });

    it("clears completedAt when marking pending", async () => {
      mocks.runManifestCommandMock.mockResolvedValue(
        ok({ result: { id: TEST_ITEM_ID, isCompleted: false, completedAt: null }, events: [] })
      );

      const res = await togglePOST(
        makeReq({ itemId: TEST_ITEM_ID, isCompleted: false })
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.result.isCompleted).toBe(false);
      expect(body.result.completedAt).toBeNull();
    });

    it("returns 500 when runtime throws", async () => {
      mocks.runManifestCommandMock.mockRejectedValue(new Error("DB error"));

      const res = await togglePOST(
        makeReq({ itemId: TEST_ITEM_ID, isCompleted: true })
      );
      expect(res.status).toBe(500);
    });
  });

  // ---------------------------------------------------------------- //
  // POST /delete-item (via dispatcher)                                //
  // ---------------------------------------------------------------- //
  describe("POST /commands/delete-item", () => {
    it("returns 401 when unauthenticated", async () => {
      setAuthMissingUser();
      const res = await deletePOST(makeReq({ itemId: TEST_ITEM_ID }));
      expect(res.status).toBe(401);
    });

    it("soft-deletes and returns 200 on success", async () => {
      mocks.runManifestCommandMock.mockResolvedValue(
        ok({ result: { id: TEST_ITEM_ID, deletedAt: new Date().toISOString() }, events: [] })
      );

      const res = await deletePOST(makeReq({ itemId: TEST_ITEM_ID }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);

      expect(mocks.runManifestCommandMock).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "EventTimelineItem",
          command: "deleteItem",
          body: expect.objectContaining({ itemId: TEST_ITEM_ID }),
        })
      );
    });

    it("returns 404 when item not found", async () => {
      mocks.runManifestCommandMock.mockResolvedValue(fail(404, "Item not found"));

      const res = await deletePOST(makeReq({ itemId: TEST_ITEM_ID }));
      expect(res.status).toBe(404);
    });

    it("returns 500 when runtime throws", async () => {
      mocks.runManifestCommandMock.mockRejectedValue(new Error("DB error"));

      const res = await deletePOST(makeReq({ itemId: TEST_ITEM_ID }));
      expect(res.status).toBe(500);
    });
  });

  // ---------------------------------------------------------------- //
  // Cross-cutting: tenant isolation                                   //
  // ---------------------------------------------------------------- //
  describe("Tenant isolation", () => {
    it("passes tenant context to runManifestCommand", async () => {
      mocks.runManifestCommandMock.mockResolvedValue(
        ok({ result: { id: "test-id" }, events: [] })
      );

      const res = await createPOST(
        makeReq({ eventId: TEST_EVENT_ID, description: "Test" })
      );
      expect(res.status).toBe(200);

      expect(mocks.runManifestCommandMock).toHaveBeenCalledWith(
        expect.objectContaining({
          user: { id: TEST_USER_ID, tenantId: TEST_TENANT_ID, role: "admin" },
        })
      );
    });
  });

  // ---------------------------------------------------------------- //
  // Cross-cutting: response shape                                     //
  // ---------------------------------------------------------------- //
  describe("Response shape", () => {
    it("success responses contain success and result", async () => {
      mocks.runManifestCommandMock.mockResolvedValue(
        ok({ result: { id: TEST_ITEM_ID, description: "Test" }, events: [{ type: "TimelineItemCreated" }] })
      );

      const res = await createPOST(
        makeReq({ eventId: TEST_EVENT_ID, description: "Test" })
      );
      const body = await res.json();

      expect(body.success).toBe(true);
      expect(body.result).toBeDefined();
    });

    it("handles malformed JSON body gracefully", async () => {
      const req = new NextRequest("http://localhost/api/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not valid json {{{",
      });
      const res = await createPOST(req);

      // Dispatcher uses request.json().catch(() => ({})) so invalid JSON becomes empty body
      expect(res.status).toBe(200);
    });
  });
});
