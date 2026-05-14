/**
 * Event Timeline API Route Tests
 *
 * Covers:
 *   GET    /api/events/[eventId]/timeline                  (list + summary)
 *   POST   /api/events/[eventId]/timeline/commands/create-item
 *   POST   /api/events/[eventId]/timeline/commands/update-item
 *   POST   /api/events/[eventId]/timeline/commands/toggle-completed
 *   POST   /api/events/[eventId]/timeline/commands/delete-item
 *
 * Verifies:
 *   - Auth: 401 unauthenticated, 403 missing tenant
 *   - Validation: 400 on invalid eventId / itemId / payload
 *   - 404 when event or item is missing or soft-deleted
 *   - Successful Prisma writes scoped to tenantId
 *   - Toggle complete sets completedAt; uncomplete clears it
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
}));

vi.mock("@repo/auth/server", () => ({
  auth: mocks.authMock,
}));

vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: mocks.tenantMock,
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

import { GET as listGET } from "@/app/api/events/[eventId]/timeline/route";
import { POST as manifestDispatch } from "@/app/api/manifest/[entity]/commands/[command]/route";

const dispatch =
  (entity: string, command: string) =>
  (req: NextRequest, _ctx?: unknown) =>
    manifestDispatch(req, { params: Promise.resolve({ entity, command }) });

const createPOST = dispatch("EventTimelineItem", "createItem");
const deletePOST = dispatch("EventTimelineItem", "deleteItem");
const togglePOST = dispatch("EventTimelineItem", "completeItem");
const updatePOST = dispatch("EventTimelineItem", "updateItem");

function setAuthOk() {
  mocks.authMock.mockResolvedValue({
    orgId: TEST_ORG_ID,
    userId: TEST_USER_ID,
  });
  mocks.tenantMock.mockResolvedValue(TEST_TENANT_ID);
}

function setAuthMissingUser() {
  mocks.authMock.mockResolvedValue({ orgId: null, userId: null });
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

describe("Event Timeline API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
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
  // POST /create-item                                                 //
  // ---------------------------------------------------------------- //
  describe("POST /commands/create-item", () => {
    it("returns 401 when unauthenticated", async () => {
      setAuthMissingUser();
      const res = await createPOST(makeReq({}), eventParams(TEST_EVENT_ID));
      expect(res.status).toBe(401);
    });

    it("returns 400 when description is missing", async () => {
      setAuthOk();
      const res = await createPOST(
        makeReq({ timelineTime: "14:30" }),
        eventParams(TEST_EVENT_ID)
      );
      expect(res.status).toBe(400);
    });

    it("returns 400 when timelineTime is invalid", async () => {
      setAuthOk();
      const res = await createPOST(
        makeReq({ timelineTime: "not-a-time", description: "Service" }),
        eventParams(TEST_EVENT_ID)
      );
      expect(res.status).toBe(400);
    });

    it("returns 404 when event does not exist", async () => {
      setAuthOk();
      mocks.eventFindFirstMock.mockResolvedValue(null);
      const res = await createPOST(
        makeReq({ timelineTime: "14:30", description: "Service" }),
        eventParams(TEST_EVENT_ID)
      );
      expect(res.status).toBe(404);
    });

    it("creates an item with auto-incremented sortOrder", async () => {
      setAuthOk();
      mocks.eventFindFirstMock.mockResolvedValue({ id: TEST_EVENT_ID });
      mocks.timelineAggregateMock.mockResolvedValue({
        _max: { sortOrder: 20 },
      });
      mocks.timelineCreateMock.mockResolvedValue({
        id: TEST_ITEM_ID,
        timelineTime: new Date(Date.UTC(1970, 0, 1, 14, 30)),
        description: "Service",
        responsibleRole: null,
        isCompleted: false,
        completedAt: null,
        notes: null,
        sortOrder: 30,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await createPOST(
        makeReq({ timelineTime: "14:30", description: "Service" }),
        eventParams(TEST_EVENT_ID)
      );
      expect(res.status).toBe(201);
      expect(mocks.timelineCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TEST_TENANT_ID,
            eventId: TEST_EVENT_ID,
            description: "Service",
            sortOrder: 30,
          }),
        })
      );
    });
  });

  // ---------------------------------------------------------------- //
  // POST /update-item                                                 //
  // ---------------------------------------------------------------- //
  describe("POST /commands/update-item", () => {
    it("returns 400 when itemId is invalid", async () => {
      setAuthOk();
      const res = await updatePOST(
        makeReq({ itemId: INVALID_UUID, description: "x" }),
        eventParams(TEST_EVENT_ID)
      );
      expect(res.status).toBe(400);
    });

    it("returns 400 when no fields are provided", async () => {
      setAuthOk();
      const res = await updatePOST(
        makeReq({ itemId: TEST_ITEM_ID }),
        eventParams(TEST_EVENT_ID)
      );
      expect(res.status).toBe(400);
    });

    it("returns 404 when item is not found", async () => {
      setAuthOk();
      mocks.timelineFindFirstMock.mockResolvedValue(null);
      const res = await updatePOST(
        makeReq({ itemId: TEST_ITEM_ID, description: "Updated" }),
        eventParams(TEST_EVENT_ID)
      );
      expect(res.status).toBe(404);
    });

    it("updates description and notes", async () => {
      setAuthOk();
      mocks.timelineFindFirstMock.mockResolvedValue({ id: TEST_ITEM_ID });
      mocks.timelineUpdateMock.mockResolvedValue({
        id: TEST_ITEM_ID,
        timelineTime: new Date(Date.UTC(1970, 0, 1, 17, 0)),
        description: "Updated",
        responsibleRole: "Captain",
        isCompleted: false,
        completedAt: null,
        notes: "Cue music",
        sortOrder: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await updatePOST(
        makeReq({
          itemId: TEST_ITEM_ID,
          description: "Updated",
          notes: "Cue music",
        }),
        eventParams(TEST_EVENT_ID)
      );
      expect(res.status).toBe(200);
      expect(mocks.timelineUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId_id: { tenantId: TEST_TENANT_ID, id: TEST_ITEM_ID },
          },
          data: { description: "Updated", notes: "Cue music" },
        })
      );
    });

    it("rejects empty description string", async () => {
      setAuthOk();
      const res = await updatePOST(
        makeReq({ itemId: TEST_ITEM_ID, description: "   " }),
        eventParams(TEST_EVENT_ID)
      );
      expect(res.status).toBe(400);
    });
  });

  // ---------------------------------------------------------------- //
  // POST /toggle-completed                                            //
  // ---------------------------------------------------------------- //
  describe("POST /commands/toggle-completed", () => {
    it("returns 400 when isCompleted is not a boolean", async () => {
      setAuthOk();
      const res = await togglePOST(
        makeReq({ itemId: TEST_ITEM_ID, isCompleted: "yes" }),
        eventParams(TEST_EVENT_ID)
      );
      expect(res.status).toBe(400);
    });

    it("sets completedAt when marking complete", async () => {
      setAuthOk();
      mocks.timelineFindFirstMock.mockResolvedValue({
        id: TEST_ITEM_ID,
        isCompleted: false,
      });
      mocks.timelineUpdateMock.mockResolvedValue({
        id: TEST_ITEM_ID,
        timelineTime: new Date(),
        description: "x",
        responsibleRole: null,
        isCompleted: true,
        completedAt: new Date(),
        notes: null,
        sortOrder: 0,
        updatedAt: new Date(),
      });

      const res = await togglePOST(
        makeReq({ itemId: TEST_ITEM_ID, isCompleted: true }),
        eventParams(TEST_EVENT_ID)
      );
      expect(res.status).toBe(200);
      expect(mocks.timelineUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isCompleted: true,
            completedAt: expect.any(Date),
          }),
        })
      );
    });

    it("clears completedAt when marking pending", async () => {
      setAuthOk();
      mocks.timelineFindFirstMock.mockResolvedValue({
        id: TEST_ITEM_ID,
        isCompleted: true,
      });
      mocks.timelineUpdateMock.mockResolvedValue({
        id: TEST_ITEM_ID,
        timelineTime: new Date(),
        description: "x",
        responsibleRole: null,
        isCompleted: false,
        completedAt: null,
        notes: null,
        sortOrder: 0,
        updatedAt: new Date(),
      });

      const res = await togglePOST(
        makeReq({ itemId: TEST_ITEM_ID, isCompleted: false }),
        eventParams(TEST_EVENT_ID)
      );
      expect(res.status).toBe(200);
      expect(mocks.timelineUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { isCompleted: false, completedAt: null },
        })
      );
    });
  });

  // ---------------------------------------------------------------- //
  // POST /delete-item                                                 //
  // ---------------------------------------------------------------- //
  describe("POST /commands/delete-item", () => {
    it("returns 404 when item is not found", async () => {
      setAuthOk();
      mocks.timelineFindFirstMock.mockResolvedValue(null);
      const res = await deletePOST(
        makeReq({ itemId: TEST_ITEM_ID }),
        eventParams(TEST_EVENT_ID)
      );
      expect(res.status).toBe(404);
    });

    it("soft-deletes by setting deletedAt", async () => {
      setAuthOk();
      mocks.timelineFindFirstMock.mockResolvedValue({ id: TEST_ITEM_ID });
      mocks.timelineUpdateMock.mockResolvedValue({});

      const res = await deletePOST(
        makeReq({ itemId: TEST_ITEM_ID }),
        eventParams(TEST_EVENT_ID)
      );
      expect(res.status).toBe(200);
      expect(mocks.timelineUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId_id: { tenantId: TEST_TENANT_ID, id: TEST_ITEM_ID },
          },
          data: { deletedAt: expect.any(Date) },
        })
      );
    });
  });
});
