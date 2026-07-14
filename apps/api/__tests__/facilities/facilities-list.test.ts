/**
 * Facilities List & Assets API Integration Tests
 *
 * Tests verify the facilities list and facility assets list endpoints
 * with authentication, authorization, pagination, filtering, and error handling.
 * These routes use Prisma ORM (database.facility.findMany / database.facilityAsset.findMany).
 */

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as listAssets } from "@/app/api/facilities/assets/list/route";
import { GET as listFacilities } from "@/app/api/facilities/list/route";

// Mock dependencies
vi.mock("server-only", () => ({}));
vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));
vi.mock("@repo/observability/log", () => ({
  log: { error: vi.fn() },
}));
vi.mock("@/lib/pagination", () => ({
  clampLimit: (v: string | null) => {
    if (!v) {
      return 50;
    }
    const n = Number.parseInt(v, 10);
    if (Number.isNaN(n) || n < 1) {
      return 50;
    }
    return Math.min(n, 200);
  },
  clampOffset: (v: string | null) => {
    if (!v) {
      return 0;
    }
    const n = Number.parseInt(v, 10);
    if (Number.isNaN(n) || n < 0) {
      return 0;
    }
    return n;
  },
}));
vi.mock("@/lib/manifest-response", () => ({
  manifestSuccessResponse: vi.fn((data, status = 200) => ({
    status,
    json: () => Promise.resolve({ success: true, ...data }),
  })),
  manifestErrorResponse: vi.fn((message, status) => ({
    status,
    json: () =>
      Promise.resolve({
        success: false,
        ...(typeof message === "string"
          ? { message }
          : { error: message.error }),
      }),
  })),
}));
vi.mock("@/lib/database", () => ({
  database: {
    facility: {
      findMany: vi.fn(),
    },
    facilityAsset: {
      findMany: vi.fn(),
    },
    facilityArea: {
      findMany: vi.fn(),
    },
  },
}));

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg } = await import("@/app/lib/tenant");
const { database } = await import("@/lib/database");

const TEST_TENANT_ID = "00000000-0000-0000-0000-000000000005";
const TEST_USER_ID = "user_facilities_test";
const TEST_ORG_ID = "org_facilities_test";

function createMockFacility(overrides = {} as Record<string, unknown>) {
  return {
    id: "facility-001",
    name: "Main Kitchen",
    code: "MK-001",
    facilityType: "kitchen",
    addressLine1: "123 Main St",
    addressLine2: null as string | null,
    city: "Springfield",
    state: "IL",
    postalCode: "62701",
    country: "US",
    phone: "+1-555-0100",
    status: "active",
    notes: null as string | null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

function createMockAsset(overrides = {} as Record<string, unknown>) {
  return {
    id: "asset-001",
    name: "Commercial Oven",
    assetType: "equipment",
    serialNumber: "OV-2026-001",
    manufacturer: "Vulcan",
    model: "VGX-36",
    purchaseDate: new Date("2025-06-01"),
    purchaseCost: 15_000.0,
    warrantyExpiry: new Date("2027-06-01"),
    status: "active",
    areaId: "area-001",
    notes: null as string | null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

describe("Facilities List API", () => {
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

  // -------------------------------------------------------- FACILITIES LIST
  describe("GET /api/facilities/list", () => {
    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const request = new NextRequest("http://localhost/api/facilities/list");
      const response = await listFacilities(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Unauthorized");
    });

    it("should return 400 when tenant not found", async () => {
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const request = new NextRequest("http://localhost/api/facilities/list");
      const response = await listFacilities(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Tenant not found");
    });

    it("should return facilities for authenticated user", async () => {
      const mockFacilities = [
        createMockFacility({ id: "fac-1", name: "Main Kitchen" }),
        createMockFacility({
          id: "fac-2",
          name: "Warehouse",
          facilityType: "warehouse",
        }),
      ];

      vi.mocked(database.facility.findMany).mockResolvedValue(
        mockFacilities as never
      );

      const request = new NextRequest("http://localhost/api/facilities/list");
      const response = await listFacilities(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.facilities).toHaveLength(2);
    });

    it("should call database.facility.findMany for the query", async () => {
      vi.mocked(database.facility.findMany).mockResolvedValue([]);

      const request = new NextRequest("http://localhost/api/facilities/list");
      await listFacilities(request);

      expect(database.facility.findMany).toHaveBeenCalled();
    });

    it("should pass limit and offset from query params", async () => {
      vi.mocked(database.facility.findMany).mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost/api/facilities/list?limit=10&offset=20"
      );
      const response = await listFacilities(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.limit).toBe(10);
      expect(body.offset).toBe(20);
      expect(database.facility.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10, skip: 20 })
      );
    });

    it("should use default limit and offset when not specified", async () => {
      vi.mocked(database.facility.findMany).mockResolvedValue([]);

      const request = new NextRequest("http://localhost/api/facilities/list");
      const response = await listFacilities(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      // clampLimit defaults to 50, clampOffset defaults to 0
      expect(body.limit).toBe(50);
      expect(body.offset).toBe(0);
    });

    it("should return 500 on database error", async () => {
      vi.mocked(database.facility.findMany).mockRejectedValue(
        new Error("SQL syntax error")
      );

      const request = new NextRequest("http://localhost/api/facilities/list");
      const response = await listFacilities(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Internal server error");
    });

    it("should return empty array when no facilities exist", async () => {
      vi.mocked(database.facility.findMany).mockResolvedValue([]);

      const request = new NextRequest("http://localhost/api/facilities/list");
      const response = await listFacilities(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.facilities).toEqual([]);
    });
  });

  // --------------------------------------------------------- ASSETS LIST
  describe("GET /api/facilities/assets/list", () => {
    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const request = new NextRequest(
        "http://localhost/api/facilities/assets/list"
      );
      const response = await listAssets(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Unauthorized");
    });

    it("should return 400 when tenant not found", async () => {
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const request = new NextRequest(
        "http://localhost/api/facilities/assets/list"
      );
      const response = await listAssets(request);

      expect(response.status).toBe(400);
    });

    it("should return assets for authenticated user", async () => {
      const mockAssets = [
        createMockAsset({ id: "asset-1", name: "Commercial Oven" }),
        createMockAsset({
          id: "asset-2",
          name: "Walk-in Freezer",
          assetType: "equipment",
        }),
      ];
      const mockAreas = [
        { id: "area-001", name: "Cooking Area", code: "CA-001" },
      ];

      vi.mocked(database.facilityAsset.findMany).mockResolvedValue(
        mockAssets as never
      );
      vi.mocked(database.facilityArea.findMany).mockResolvedValue(
        mockAreas as never
      );

      const request = new NextRequest(
        "http://localhost/api/facilities/assets/list"
      );
      const response = await listAssets(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.assets).toHaveLength(2);
    });

    it("should include area_name and area_code from area lookup", async () => {
      const mockAssets = [
        createMockAsset({
          id: "asset-1",
          areaId: "area-001",
        }),
      ];
      const mockAreas = [{ id: "area-001", name: "Prep Area", code: "PA-001" }];

      vi.mocked(database.facilityAsset.findMany).mockResolvedValue(
        mockAssets as never
      );
      vi.mocked(database.facilityArea.findMany).mockResolvedValue(
        mockAreas as never
      );

      const request = new NextRequest(
        "http://localhost/api/facilities/assets/list"
      );
      const response = await listAssets(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.assets[0].area_name).toBe("Prep Area");
      expect(body.assets[0].area_code).toBe("PA-001");
    });

    it("selects only the consumed asset columns (over-fetch fix)", async () => {
      vi.mocked(database.facilityAsset.findMany).mockResolvedValue([]);
      vi.mocked(database.facilityArea.findMany).mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost/api/facilities/assets/list"
      );
      await listAssets(request);

      const call = vi.mocked(database.facilityAsset.findMany).mock
        .calls[0]?.[0];
      // Exactly the 14 response-consumed scalars; re-adding a dropped column or
      // reverting the select fails here.
      expect(Object.keys(call?.select ?? {}).sort()).toEqual(
        [
          "areaId",
          "assetType",
          "createdAt",
          "id",
          "manufacturer",
          "model",
          "name",
          "notes",
          "purchaseCost",
          "purchaseDate",
          "serialNumber",
          "status",
          "updatedAt",
          "warrantyExpiry",
        ].sort()
      );
      // Proven-unused columns are NOT projected.
      expect(call?.select).not.toHaveProperty("currentValue");
      expect(call?.select).not.toHaveProperty("facilityId");
    });

    it("should pass limit and offset from query params", async () => {
      vi.mocked(database.facilityAsset.findMany).mockResolvedValue([]);
      vi.mocked(database.facilityArea.findMany).mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost/api/facilities/assets/list?limit=25&offset=50"
      );
      const response = await listAssets(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.limit).toBe(25);
      expect(body.offset).toBe(50);
    });

    it("should use default limit and offset when not specified", async () => {
      vi.mocked(database.facilityAsset.findMany).mockResolvedValue([]);
      vi.mocked(database.facilityArea.findMany).mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost/api/facilities/assets/list"
      );
      const response = await listAssets(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.limit).toBe(50);
      expect(body.offset).toBe(0);
    });

    it("should clamp limit to MAX_LIMIT (200)", async () => {
      vi.mocked(database.facilityAsset.findMany).mockResolvedValue([]);
      vi.mocked(database.facilityArea.findMany).mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost/api/facilities/assets/list?limit=9999"
      );
      const response = await listAssets(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.limit).toBe(200);
    });

    it("should return 500 on database error", async () => {
      vi.mocked(database.facilityAsset.findMany).mockRejectedValue(
        new Error("Connection refused")
      );

      const request = new NextRequest(
        "http://localhost/api/facilities/assets/list"
      );
      const response = await listAssets(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Internal server error");
    });

    it("should return empty array when no assets exist", async () => {
      vi.mocked(database.facilityAsset.findMany).mockResolvedValue([]);
      vi.mocked(database.facilityArea.findMany).mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost/api/facilities/assets/list"
      );
      const response = await listAssets(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.assets).toEqual([]);
    });
  });
});
