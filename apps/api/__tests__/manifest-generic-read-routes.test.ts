/**
 * Tests for generic Manifest read routes (Task 3.1).
 *
 * Covers:
 *   GET /api/manifest/{entity}          — list with pagination
 *   GET /api/manifest/{entity}/{id}     — detail by id
 *
 * Key behaviors:
 *   - Auth required (401 when unauthenticated)
 *   - Entity resolution (404 for unknown/dropped entities)
 *   - Tenant isolation (tenantId always in where clause)
 *   - Soft-delete filtering (deletedAt: null)
 *   - Accessor overrides (e.g. EventStaff → eventStaffAssignment)
 *   - Snake_case field handling (raw models without @map)
 *   - Pagination (page, limit, total, totalPages)
 *   - Detail: 404 when record not found
 *   - Detail: 400 for composite-PK entities (ENTITY_DETAIL_DROP)
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────

vi.mock("server-only", () => ({}));

vi.mock("@repo/auth/server", () => ({
  auth: vi.fn(),
}));

// We use a dynamic mock shape — tests will configure database per scenario
vi.mock("@repo/database", () => ({
  database: {},
}));

vi.mock("@/app/lib/tenant", () => ({
  requireCurrentUser: vi.fn(),
  getTenantIdForOrg: vi.fn(),
  resolveCurrentUser: vi.fn(),
}));

// ── Imports (after mocks) ──────────────────────────────────────

import { database } from "@repo/database";
import { GET as detailGet } from "@/app/api/manifest/[entity]/[id]/route";
import { GET as listGet } from "@/app/api/manifest/[entity]/route";
import { requireCurrentUser } from "@/app/lib/tenant";

// ── Helpers ────────────────────────────────────────────────────

const TEST_TENANT = "tenant-abc-123";
const TEST_USER = {
  id: "user-1",
  tenantId: TEST_TENANT,
  role: "admin",
  email: "test@test.com",
  firstName: "Test",
  lastName: "User",
};

function authedUser(user = TEST_USER) {
  vi.mocked(requireCurrentUser).mockResolvedValue(user as never);
}

function unauthed() {
  vi.mocked(requireCurrentUser).mockRejectedValue(
    new Error("Not authenticated")
  );
}

function listRequest(
  entity: string,
  params?: { page?: number; limit?: number }
) {
  const search = new URLSearchParams();
  if (params?.page) {
    search.set("page", String(params.page));
  }
  if (params?.limit) {
    search.set("limit", String(params.limit));
  }
  const qs = search.toString();
  return new NextRequest(
    `https://api.test/api/manifest/${entity}${qs ? `?${qs}` : ""}`
  );
}

function detailRequest(entity: string, id: string) {
  return new NextRequest(`https://api.test/api/manifest/${entity}/${id}`);
}

async function parseJson(res: Response) {
  return res.json();
}

// ── Tests ──────────────────────────────────────────────────────

describe("Generic Manifest read routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authedUser();
  });

  // ─────────────────────────────────────────────────────────────
  // LIST ROUTE — GET /api/manifest/{entity}
  // ─────────────────────────────────────────────────────────────

  describe("GET /api/manifest/{entity} (list)", () => {
    it("should return 401 when unauthenticated", async () => {
      unauthed();
      const res = await listGet(listRequest("Event"), {
        params: Promise.resolve({ entity: "Event" }),
      });
      expect(res.status).toBe(401);
      const body = await parseJson(res);
      expect(body.success).toBe(false);
    });

    it("should return paginated list for a valid entity", async () => {
      const mockData = [
        { id: "evt-1", title: "Event One", tenantId: TEST_TENANT },
        { id: "evt-2", title: "Event Two", tenantId: TEST_TENANT },
      ];

      // database.event is the Prisma delegate for Event
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (database as any).event = {
        count: vi.fn().mockResolvedValue(2),
        findMany: vi.fn().mockResolvedValue(mockData),
      };

      const res = await listGet(listRequest("Event"), {
        params: Promise.resolve({ entity: "Event" }),
      });

      expect(res.status).toBe(200);
      const body = await parseJson(res);
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(2);
      expect(body.pagination).toEqual({
        page: 1,
        limit: 50,
        total: 2,
        totalPages: 1,
      });

      // Verify tenant isolation — where clause must include tenantId
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const findManyCall = (database as any).event.findMany.mock.calls[0][0];
      expect(findManyCall.where.tenantId).toBe(TEST_TENANT);
      expect(findManyCall.where.deletedAt).toBeNull();
    });

    it("should respect page and limit parameters", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (database as any).event = {
        count: vi.fn().mockResolvedValue(100),
        findMany: vi.fn().mockResolvedValue([]),
      };

      const res = await listGet(listRequest("Event", { page: 3, limit: 10 }), {
        params: Promise.resolve({ entity: "Event" }),
      });

      expect(res.status).toBe(200);
      const body = await parseJson(res);
      expect(body.pagination).toEqual({
        page: 3,
        limit: 10,
        total: 100,
        totalPages: 10,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const findManyCall = (database as any).event.findMany.mock.calls[0][0];
      expect(findManyCall.skip).toBe(20); // (3 - 1) * 10
      expect(findManyCall.take).toBe(10);
    });

    it("should clamp limit to max 200", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (database as any).event = {
        count: vi.fn().mockResolvedValue(0),
        findMany: vi.fn().mockResolvedValue([]),
      };

      const res = await listGet(listRequest("Event", { limit: 999 }), {
        params: Promise.resolve({ entity: "Event" }),
      });

      expect(res.status).toBe(200);
      const body = await parseJson(res);
      expect(body.pagination.limit).toBe(200);
    });

    it("should return 404 for dropped entities (no backing table)", async () => {
      // IR-only entity with no Prisma model (auto-dropped by metadata resolution)
      const res = await listGet(listRequest("SelOnboardingTrainingModuleDefinition"), {
        params: Promise.resolve({
          entity: "SelOnboardingTrainingModuleDefinition",
        }),
      });
      expect(res.status).toBe(404);
    });

    it("should return 404 for unknown entities with no Prisma accessor", async () => {
      // "FakeEntity" won't match any override and won't exist on database
      const res = await listGet(listRequest("FakeEntity"), {
        params: Promise.resolve({ entity: "FakeEntity" }),
      });
      expect(res.status).toBe(404);
    });

    it("should use overridden accessor for EventStaff", async () => {
      // EventStaff maps to eventStaff
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (database as any).eventStaff = {
        count: vi.fn().mockResolvedValue(0),
        findMany: vi.fn().mockResolvedValue([]),
      };

      const res = await listGet(listRequest("EventStaff"), {
        params: Promise.resolve({ entity: "EventStaff" }),
      });
      expect(res.status).toBe(200);
    });

    it("should handle database errors with 500", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (database as any).event = {
        count: vi.fn().mockRejectedValue(new Error("DB connection lost")),
        findMany: vi.fn(),
      };

      const res = await listGet(listRequest("Event"), {
        params: Promise.resolve({ entity: "Event" }),
      });
      expect(res.status).toBe(500);
      const body = await parseJson(res);
      expect(body.success).toBe(false);
      expect(body.message).toContain("DB connection lost");
    });

    it("should use snake_case tenantId for raw models", async () => {
      // Document uses raw snake_case fields (no @map)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (database as any).document = {
        count: vi.fn().mockResolvedValue(1),
        findMany: vi.fn().mockResolvedValue([{ id: "doc-1" }]),
      };

      const res = await listGet(listRequest("Document"), {
        params: Promise.resolve({ entity: "Document" }),
      });
      expect(res.status).toBe(200);

      // Verify the where clause uses snake_case tenant_id
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const findManyCall = (database as any).document.findMany.mock
        .calls[0][0];
      expect(findManyCall.where.tenant_id).toBe(TEST_TENANT);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // DETAIL ROUTE — GET /api/manifest/{entity}/{id}
  // ─────────────────────────────────────────────────────────────

  describe("GET /api/manifest/{entity}/{id} (detail)", () => {
    it("should return 401 when unauthenticated", async () => {
      unauthed();
      const res = await detailGet(detailRequest("Event", "evt-1"), {
        params: Promise.resolve({ entity: "Event", id: "evt-1" }),
      });
      expect(res.status).toBe(401);
    });

    it("should return a single record by id", async () => {
      const mockRecord = {
        id: "evt-1",
        title: "Test Event",
        tenantId: TEST_TENANT,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (database as any).event = {
        findFirst: vi.fn().mockResolvedValue(mockRecord),
      };

      const res = await detailGet(detailRequest("Event", "evt-1"), {
        params: Promise.resolve({ entity: "Event", id: "evt-1" }),
      });

      expect(res.status).toBe(200);
      const body = await parseJson(res);
      expect(body.success).toBe(true);
      expect(body.data.id).toBe("evt-1");

      // Verify tenant isolation
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const findFirstCall = (database as any).event.findFirst.mock.calls[0][0];
      expect(findFirstCall.where.tenantId).toBe(TEST_TENANT);
      expect(findFirstCall.where.id).toBe("evt-1");
      expect(findFirstCall.where.deletedAt).toBeNull();
    });

    it("should return 404 when record not found", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (database as any).event = {
        findFirst: vi.fn().mockResolvedValue(null),
      };

      const res = await detailGet(detailRequest("Event", "nonexistent"), {
        params: Promise.resolve({ entity: "Event", id: "nonexistent" }),
      });

      expect(res.status).toBe(404);
      const body = await parseJson(res);
      expect(body.success).toBe(false);
      expect(body.message).toContain("not found");
    });

    it("should return 404 for dropped entities", async () => {
      const res = await detailGet(
        detailRequest("SelOnboardingTrainingModuleDefinition", "x"),
        {
          params: Promise.resolve({
            entity: "SelOnboardingTrainingModuleDefinition",
            id: "x",
          }),
        }
      );
      expect(res.status).toBe(404);
    });

    it("should return 400 for composite-PK entities (TaskBundleItem)", async () => {
      // TaskBundleItem is in ENTITY_DETAIL_DROP
      // Need to mock the accessor so it passes the exists check first
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (database as any).taskBundleItem = {
        findFirst: vi.fn(),
      };

      const res = await detailGet(detailRequest("TaskBundleItem", "item-1"), {
        params: Promise.resolve({ entity: "TaskBundleItem", id: "item-1" }),
      });

      expect(res.status).toBe(400);
      const body = await parseJson(res);
      expect(body.success).toBe(false);
      expect(body.message).toContain("composite PK");
    });

    it("should use overridden accessor for BankAccount", async () => {
      // BankAccount maps to employeeBankAccount
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (database as any).employeeBankAccount = {
        findFirst: vi.fn().mockResolvedValue({
          id: "bank-1",
          tenantId: TEST_TENANT,
        }),
      };

      const res = await detailGet(detailRequest("BankAccount", "bank-1"), {
        params: Promise.resolve({ entity: "BankAccount", id: "bank-1" }),
      });

      expect(res.status).toBe(200);
    });

    it("should handle database errors with 500", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (database as any).event = {
        findFirst: vi.fn().mockRejectedValue(new Error("Connection refused")),
      };

      const res = await detailGet(detailRequest("Event", "evt-1"), {
        params: Promise.resolve({ entity: "Event", id: "evt-1" }),
      });

      expect(res.status).toBe(500);
      const body = await parseJson(res);
      expect(body.success).toBe(false);
    });

    it("should use snake_case tenantId for Document detail", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (database as any).document = {
        findFirst: vi.fn().mockResolvedValue({ id: "doc-1" }),
      };

      const res = await detailGet(detailRequest("Document", "doc-1"), {
        params: Promise.resolve({ entity: "Document", id: "doc-1" }),
      });
      expect(res.status).toBe(200);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const findFirstCall = (database as any).document.findFirst.mock
        .calls[0][0];
      expect(findFirstCall.where.tenant_id).toBe(TEST_TENANT);
      expect(findFirstCall.where.id).toBe("doc-1");
    });
  });
});
