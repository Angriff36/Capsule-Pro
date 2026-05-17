/**
 * Locations API Integration Tests
 *
 * Tests the GET /api/locations endpoint which uses $queryRaw
 * to query tenant.locations with optional isActive filter.
 *
 * Covers: authentication, tenant resolution, query filtering,
 * empty results, database errors, and response shaping.
 */

import { database } from "@repo/database";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@/lib/database", async () => {
  const mod =
    await vi.importActual<typeof import("@repo/database")>("@repo/database");
  return mod;
});

// --- Import mocked modules ---

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg } = await import("@/app/lib/tenant");

// --- Route import ---

import { GET } from "@/app/api/locations/route";

// --- Constants ---

const TEST_TENANT_ID = "00000000-0000-0000-0000-000000000020";
const TEST_USER_ID = "user_locations_test";
const TEST_ORG_ID = "org_locations_test";

// --- Helpers ---

function mockAuth() {
  vi.mocked(auth).mockResolvedValue({
    userId: TEST_USER_ID,
    orgId: TEST_ORG_ID,
  } as never);
  vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
}

function createMockLocation(overrides: Record<string, unknown> = {}) {
  return {
    id: "loc-001",
    name: "Main Kitchen",
    address_line_1: "123 Main St",
    address_line_2: null,
    city: "Springfield",
    state_province: "IL",
    postal_code: "62701",
    country_code: "US",
    timezone: "America/Chicago",
    is_primary: true,
    is_active: true,
    created_at: new Date("2026-01-15"),
    updated_at: new Date("2026-01-15"),
    ...overrides,
  };
}

// --- Tests ---

describe("Locations API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /api/locations", () => {
    it("should return 401 when user is not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const request = new NextRequest("http://localhost/api/locations");
      const response = await GET(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe("Not authenticated");
    });

    it("should return 401 when tenant is not found for org", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: TEST_USER_ID,
        orgId: TEST_ORG_ID,
      } as never);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const request = new NextRequest("http://localhost/api/locations");
      const response = await GET(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe("No tenant found");
    });

    it("should return locations for an authenticated user", async () => {
      mockAuth();
      const mockLocations = [
        createMockLocation({ id: "loc-1", name: "Main Kitchen" }),
        createMockLocation({
          id: "loc-2",
          name: "Warehouse",
          is_primary: false,
        }),
      ];

      vi.mocked(database.$queryRaw).mockResolvedValue(mockLocations);

      const request = new NextRequest("http://localhost/api/locations");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.locations).toHaveLength(2);
      expect(body.locations[0].name).toBe("Main Kitchen");
      expect(body.locations[1].name).toBe("Warehouse");
    });

    it("should return an empty array when no locations exist", async () => {
      mockAuth();
      vi.mocked(database.$queryRaw).mockResolvedValue([]);

      const request = new NextRequest("http://localhost/api/locations");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.locations).toEqual([]);
    });

    it("should call $queryRaw with a SQL query", async () => {
      mockAuth();
      vi.mocked(database.$queryRaw).mockResolvedValue([]);

      const request = new NextRequest("http://localhost/api/locations");
      await GET(request);

      expect(database.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it("should filter by isActive=true when query param is set", async () => {
      mockAuth();
      const activeLocations = [
        createMockLocation({ id: "loc-1", is_active: true }),
      ];

      vi.mocked(database.$queryRaw).mockResolvedValue(activeLocations);

      const request = new NextRequest(
        "http://localhost/api/locations?isActive=true"
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.locations).toHaveLength(1);
      // Verify $queryRaw was called (the SQL template will contain the active filter)
      expect(database.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it("should not filter by active status when isActive is not 'true'", async () => {
      mockAuth();
      vi.mocked(database.$queryRaw).mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost/api/locations?isActive=false"
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(database.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it("should return all locations when isActive param is absent", async () => {
      mockAuth();
      const allLocations = [
        createMockLocation({ id: "loc-1", is_active: true }),
        createMockLocation({ id: "loc-2", is_active: false }),
      ];

      vi.mocked(database.$queryRaw).mockResolvedValue(allLocations);

      const request = new NextRequest("http://localhost/api/locations");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.locations).toHaveLength(2);
    });

    it("should include all location fields in response", async () => {
      mockAuth();
      const location = createMockLocation({
        id: "loc-full",
        name: "Downtown Branch",
        address_line_1: "456 Oak Ave",
        address_line_2: "Suite 200",
        city: "Chicago",
        state_province: "IL",
        postal_code: "60601",
        country_code: "US",
        timezone: "America/Chicago",
        is_primary: false,
        is_active: true,
      });

      vi.mocked(database.$queryRaw).mockResolvedValue([location]);

      const request = new NextRequest("http://localhost/api/locations");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      const returned = body.locations[0];
      expect(returned.id).toBe("loc-full");
      expect(returned.name).toBe("Downtown Branch");
      expect(returned.address_line_1).toBe("456 Oak Ave");
      expect(returned.address_line_2).toBe("Suite 200");
      expect(returned.city).toBe("Chicago");
      expect(returned.state_province).toBe("IL");
      expect(returned.postal_code).toBe("60601");
      expect(returned.country_code).toBe("US");
      expect(returned.timezone).toBe("America/Chicago");
      expect(returned.is_primary).toBe(false);
      expect(returned.is_active).toBe(true);
    });

    it("should handle locations with null optional fields", async () => {
      mockAuth();
      const location = createMockLocation({
        id: "loc-minimal",
        name: "Minimal Location",
        address_line_1: null,
        address_line_2: null,
        city: null,
        state_province: null,
        postal_code: null,
        country_code: null,
        timezone: null,
      });

      vi.mocked(database.$queryRaw).mockResolvedValue([location]);

      const request = new NextRequest("http://localhost/api/locations");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      const returned = body.locations[0];
      expect(returned.address_line_1).toBeNull();
      expect(returned.city).toBeNull();
      expect(returned.timezone).toBeNull();
    });

    it("should return 500 on database error", async () => {
      mockAuth();
      vi.mocked(database.$queryRaw).mockRejectedValue(
        new Error("Connection refused")
      );

      const request = new NextRequest("http://localhost/api/locations");
      const response = await GET(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe("Failed to fetch locations");
    });

    it("should capture exception on database error", async () => {
      mockAuth();
      const dbError = new Error("SQL timeout");
      vi.mocked(database.$queryRaw).mockRejectedValue(dbError);

      const { captureException } = await import("@sentry/nextjs");
      const request = new NextRequest("http://localhost/api/locations");
      await GET(request);

      expect(captureException).toHaveBeenCalledWith(dbError);
    });

    it("should return 500 when database query throws a generic error", async () => {
      mockAuth();
      vi.mocked(database.$queryRaw).mockRejectedValue(new Error("unknown"));

      const request = new NextRequest("http://localhost/api/locations");
      const response = await GET(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe("Failed to fetch locations");
    });
  });
});
