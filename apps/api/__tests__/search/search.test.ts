/**
 * Global Search API Tests
 *
 * Tests for GET /api/search covering authentication, query parsing,
 * search across all entity types (events, clients, contacts, venues,
 * inventory, knowledge), type filtering, pagination, empty results,
 * and error handling.
 */

import { database } from "@repo/database";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  requireTenantId: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
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
vi.mock("@/lib/database", async () => {
  const mod =
    await vi.importActual<typeof import("@repo/database")>("@repo/database");
  return mod;
});

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg } = await import("@/app/lib/tenant");
const { GET } = await import("@/app/api/search/route");

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const TEST_TENANT_ID = "00000000-0000-0000-0000-000000000099";
const TEST_USER_ID = "user_search_test";
const TEST_ORG_ID = "org_search_test";

function makeRequest(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = qs
    ? `http://localhost/api/search?${qs}`
    : "http://localhost/api/search";
  return new NextRequest(url);
}

function mockAllModelsEmpty() {
  const models = [
    database.event,
    database.client,
    database.clientContact,
    database.venue,
    database.inventoryItem,
    database.knowledgeBaseEntry,
  ] as const;
  for (const model of models) {
    vi.mocked(model.findMany).mockResolvedValue([]);
    vi.mocked(model.count).mockResolvedValue(0);
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Global Search API — GET /api/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      userId: TEST_USER_ID,
      orgId: TEST_ORG_ID,
    } as never);
    vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------- Auth
  describe("authentication", () => {
    it("returns 401 when auth returns no orgId", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const response = await GET(makeRequest({ q: "test" }));
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.message).toBe("Unauthorized");
    });
  });

  // ---------------------------------------------------------------- No query
  describe("missing or empty query parameter", () => {
    it("returns empty groups when q is not provided", async () => {
      const response = await GET(makeRequest());
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.groups).toEqual([]);
      expect(body.total).toBe(0);
    });

    it("returns empty groups when q is whitespace-only", async () => {
      const response = await GET(makeRequest({ q: "   " }));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.groups).toEqual([]);
      expect(body.total).toBe(0);
    });

    it("does not call any database model when q is empty", async () => {
      await GET(makeRequest());

      expect(database.event.findMany).not.toHaveBeenCalled();
      expect(database.client.findMany).not.toHaveBeenCalled();
      expect(database.clientContact.findMany).not.toHaveBeenCalled();
      expect(database.venue.findMany).not.toHaveBeenCalled();
      expect(database.inventoryItem.findMany).not.toHaveBeenCalled();
      expect(database.knowledgeBaseEntry.findMany).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------- All types search
  describe("search across all entity types (no type filter)", () => {
    it("searches events and returns grouped results", async () => {
      mockAllModelsEmpty();
      vi.mocked(database.event.findMany).mockResolvedValue([
        {
          id: "evt-1",
          tenantId: TEST_TENANT_ID,
          title: "Annual Gala",
          eventNumber: "EVT-001",
          eventDate: new Date("2026-06-15"),
          venueName: "Grand Ballroom",
          status: "confirmed",
        },
      ] as never);
      vi.mocked(database.event.count).mockResolvedValue(1);

      const response = await GET(makeRequest({ q: "gala" }));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.groups.events).toBeDefined();
      expect(body.groups.events.items).toHaveLength(1);
      expect(body.groups.events.total).toBe(1);
    });

    it("searches clients and returns grouped results", async () => {
      mockAllModelsEmpty();
      vi.mocked(database.client.findMany).mockResolvedValue([
        {
          id: "cli-1",
          tenantId: TEST_TENANT_ID,
          company_name: "Acme Corp",
          first_name: "Jane",
          last_name: "Doe",
          email: "jane@acme.com",
          phone: "+1-555-0100",
        },
      ] as never);
      vi.mocked(database.client.count).mockResolvedValue(1);

      const response = await GET(makeRequest({ q: "acme" }));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.groups.clients).toBeDefined();
      expect(body.groups.clients.items).toHaveLength(1);
      expect(body.groups.clients.total).toBe(1);
    });

    it("searches contacts (clientContact) and returns grouped results", async () => {
      mockAllModelsEmpty();
      vi.mocked(database.clientContact.findMany).mockResolvedValue([
        {
          id: "con-1",
          tenantId: TEST_TENANT_ID,
          clientId: "cli-1",
          first_name: "John",
          last_name: "Smith",
          title: "VP Sales",
          email: "john@acme.com",
          phone: "+1-555-0200",
        },
      ] as never);
      vi.mocked(database.clientContact.count).mockResolvedValue(1);

      const response = await GET(makeRequest({ q: "john" }));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.groups.contacts).toBeDefined();
      expect(body.groups.contacts.items).toHaveLength(1);
    });

    it("searches venues and returns grouped results", async () => {
      mockAllModelsEmpty();
      vi.mocked(database.venue.findMany).mockResolvedValue([
        {
          id: "ven-1",
          tenantId: TEST_TENANT_ID,
          name: "Convention Center",
          city: "Chicago",
          stateProvince: "IL",
          venueType: "conference",
          capacity: 5000,
        },
      ] as never);
      vi.mocked(database.venue.count).mockResolvedValue(1);

      const response = await GET(makeRequest({ q: "convention" }));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.groups.venues).toBeDefined();
      expect(body.groups.venues.items).toHaveLength(1);
    });

    it("searches inventory items and returns grouped results", async () => {
      mockAllModelsEmpty();
      vi.mocked(database.inventoryItem.findMany).mockResolvedValue([
        {
          id: "inv-1",
          tenantId: TEST_TENANT_ID,
          item_number: "SKU-001",
          name: "Olive Oil",
          category: "Oils",
          unitOfMeasure: "liter",
          quantityOnHand: "50" as never,
        },
      ] as never);
      vi.mocked(database.inventoryItem.count).mockResolvedValue(1);

      const response = await GET(makeRequest({ q: "olive" }));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.groups.inventory).toBeDefined();
      expect(body.groups.inventory.items).toHaveLength(1);
    });

    it("searches knowledge base entries and returns grouped results", async () => {
      mockAllModelsEmpty();
      vi.mocked(database.knowledgeBaseEntry.findMany).mockResolvedValue([
        {
          id: "kb-1",
          tenantId: TEST_TENANT_ID,
          slug: "safety-guidelines",
          title: "Safety Guidelines",
          category: "Safety",
          publishedAt: new Date("2026-01-15"),
        },
      ] as never);
      vi.mocked(database.knowledgeBaseEntry.count).mockResolvedValue(1);

      const response = await GET(makeRequest({ q: "safety" }));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.groups.knowledge).toBeDefined();
      expect(body.groups.knowledge.items).toHaveLength(1);
    });

    it("computes total as sum of all group totals", async () => {
      mockAllModelsEmpty();
      vi.mocked(database.event.findMany).mockResolvedValue([
        { id: "e1" },
      ] as never);
      vi.mocked(database.event.count).mockResolvedValue(3);
      vi.mocked(database.client.findMany).mockResolvedValue([
        { id: "c1" },
      ] as never);
      vi.mocked(database.client.count).mockResolvedValue(2);
      vi.mocked(database.clientContact.count).mockResolvedValue(0);
      vi.mocked(database.venue.count).mockResolvedValue(0);
      vi.mocked(database.inventoryItem.count).mockResolvedValue(0);
      vi.mocked(database.knowledgeBaseEntry.count).mockResolvedValue(0);

      const response = await GET(makeRequest({ q: "test" }));
      const body = await response.json();

      expect(body.total).toBe(5);
    });
  });

  // ---------------------------------------------------------------- Type filter
  describe("type filter", () => {
    it("only searches events when type=events", async () => {
      mockAllModelsEmpty();
      vi.mocked(database.event.findMany).mockResolvedValue([
        { id: "e1", title: "Test Event" },
      ] as never);
      vi.mocked(database.event.count).mockResolvedValue(1);

      const response = await GET(makeRequest({ q: "test", type: "events" }));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(database.event.findMany).toHaveBeenCalled();
      expect(database.client.findMany).not.toHaveBeenCalled();
      expect(database.clientContact.findMany).not.toHaveBeenCalled();
      expect(database.venue.findMany).not.toHaveBeenCalled();
      expect(database.inventoryItem.findMany).not.toHaveBeenCalled();
      expect(database.knowledgeBaseEntry.findMany).not.toHaveBeenCalled();
      expect(body.groups.events).toBeDefined();
      expect(body.groups.clients).toBeUndefined();
    });

    it("only searches clients when type=clients", async () => {
      mockAllModelsEmpty();
      vi.mocked(database.client.findMany).mockResolvedValue([
        { id: "c1", company_name: "Test Co" },
      ] as never);
      vi.mocked(database.client.count).mockResolvedValue(1);

      const response = await GET(makeRequest({ q: "test", type: "clients" }));
      const body = await response.json();

      expect(database.event.findMany).not.toHaveBeenCalled();
      expect(database.client.findMany).toHaveBeenCalled();
      expect(body.groups.clients).toBeDefined();
      expect(body.groups.events).toBeUndefined();
    });

    it("only searches inventory when type=inventory", async () => {
      mockAllModelsEmpty();
      vi.mocked(database.inventoryItem.findMany).mockResolvedValue([
        { id: "i1", name: "Flour" },
      ] as never);
      vi.mocked(database.inventoryItem.count).mockResolvedValue(1);

      const response = await GET(
        makeRequest({ q: "flour", type: "inventory" })
      );
      const body = await response.json();

      expect(database.inventoryItem.findMany).toHaveBeenCalled();
      expect(database.event.findMany).not.toHaveBeenCalled();
      expect(body.groups.inventory).toBeDefined();
    });

    it("returns empty groups when type does not match any known entity", async () => {
      const response = await GET(
        makeRequest({ q: "test", type: "nonexistent" })
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.groups).toEqual({});
      expect(body.total).toBe(0);
      // No database calls should have been made
      expect(database.event.findMany).not.toHaveBeenCalled();
      expect(database.client.findMany).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------- Pagination
  describe("pagination", () => {
    it("uses default page=1 and limit=10 when not specified", async () => {
      mockAllModelsEmpty();

      const response = await GET(makeRequest({ q: "test" }));
      const body = await response.json();

      expect(body.page).toBe(1);
      expect(body.limit).toBe(10);
    });

    it("respects custom page and limit params", async () => {
      mockAllModelsEmpty();
      vi.mocked(database.event.findMany).mockResolvedValue([]);
      vi.mocked(database.event.count).mockResolvedValue(25);

      const response = await GET(
        makeRequest({ q: "test", type: "events", page: "3", limit: "5" })
      );
      const body = await response.json();

      expect(body.page).toBe(3);
      expect(body.limit).toBe(5);

      // Verify skip = (page - 1) * limit = 10
      const findManyCall = vi.mocked(database.event.findMany).mock
        .calls[0][0] as {
        skip?: number;
        take?: number;
      };
      expect(findManyCall.skip).toBe(10);
      expect(findManyCall.take).toBe(5);
    });

    it("clamps limit to maximum of 50", async () => {
      mockAllModelsEmpty();

      const response = await GET(makeRequest({ q: "test", limit: "999" }));
      const body = await response.json();

      expect(body.limit).toBe(50);
    });

    it("clamps limit to minimum of 1", async () => {
      mockAllModelsEmpty();

      const response = await GET(makeRequest({ q: "test", limit: "0" }));
      const body = await response.json();

      expect(body.limit).toBe(1);
    });

    it("clamps page to minimum of 1", async () => {
      mockAllModelsEmpty();

      const response = await GET(makeRequest({ q: "test", page: "-1" }));
      const body = await response.json();

      expect(body.page).toBe(1);
    });
  });

  // ---------------------------------------------------------------- Empty results
  describe("empty results", () => {
    it("returns all groups with zero totals when nothing matches", async () => {
      mockAllModelsEmpty();

      const response = await GET(makeRequest({ q: "zzznonexistent" }));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.total).toBe(0);
      // All 6 entity groups should be present
      expect(Object.keys(body.groups)).toHaveLength(6);
      for (const group of Object.values(body.groups) as {
        total: number;
        items: unknown[];
      }[]) {
        expect(group.total).toBe(0);
        expect(group.items).toEqual([]);
      }
    });
  });

  // ---------------------------------------------------------------- Error handling
  describe("error handling", () => {
    it("returns 500 when a database query throws", async () => {
      vi.mocked(database.event.findMany).mockRejectedValue(
        new Error("DB connection lost")
      );
      vi.mocked(database.event.count).mockRejectedValue(
        new Error("DB connection lost")
      );

      const response = await GET(makeRequest({ q: "test" }));
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.success).toBe(false);
      expect(body.message).toBe("Search failed");
    });

    it("captures exception with Sentry on error", async () => {
      const { captureException } = await import("@sentry/nextjs");
      const error = new Error("Unexpected failure");
      // Use type filter so only client model is queried
      vi.mocked(database.client.findMany).mockRejectedValue(error);

      await GET(makeRequest({ q: "test", type: "clients" }));

      expect(captureException).toHaveBeenCalledWith(error);
    });
  });
});
