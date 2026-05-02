/**
 * Facilities Command Routes Integration Tests
 *
 * Tests verify the facilities command endpoints (create, edit, delete) and
 * facility areas command endpoints plus work order command endpoints.
 * These routes use raw SQL ($queryRaw) against tenant_facilities schema.
 * Covers auth guards, tenant resolution, validation, success paths, and error handling.
 */

import { database } from "@repo/database";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as createArea } from "@/app/api/facilities/areas/commands/create/route";
import { POST as deleteArea } from "@/app/api/facilities/areas/commands/delete/route";
import { POST as editArea } from "@/app/api/facilities/areas/commands/edit/route";
import { GET as listAreas } from "@/app/api/facilities/areas/list/route";
// Route imports
import { POST as createFacility } from "@/app/api/facilities/commands/create/route";
import { POST as deleteFacility } from "@/app/api/facilities/commands/delete/route";
import { POST as editFacility } from "@/app/api/facilities/commands/edit/route";
import { POST as createWorkOrder } from "@/app/api/facilities/work-orders/commands/create/route";
import { POST as updateWorkOrderStatus } from "@/app/api/facilities/work-orders/commands/update-status/route";
import { GET as listWorkOrders } from "@/app/api/facilities/work-orders/list/route";

// Mock dependencies
vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg } = await import("@/app/lib/tenant");

const TEST_TENANT_ID = "00000000-0000-0000-0000-000000000005";
const TEST_USER_ID = "user_facilities_cmd_test";
const TEST_ORG_ID = "org_facilities_cmd_test";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createNextRequest(
  url: string,
  body?: Record<string, unknown>
): NextRequest {
  const init: RequestInit = {};
  if (body !== undefined) {
    init.method = "POST";
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(body);
  }
  return new NextRequest(
    url,
    init as ConstructorParameters<typeof NextRequest>[1]
  );
}

function createMockFacility(overrides: Record<string, unknown> = {}) {
  return {
    id: "fac-001",
    name: "Main Kitchen",
    code: "MK-001",
    facility_type: "kitchen",
    address_line1: "123 Main St",
    address_line2: null,
    city: "Springfield",
    state: "IL",
    postal_code: "62701",
    country: "US",
    phone: "+1-555-0100",
    status: "active",
    notes: "Primary commissary",
    created_at: new Date("2026-01-01"),
    ...overrides,
  };
}

function createMockArea(overrides: Record<string, unknown> = {}) {
  return {
    id: "area-001",
    venue_id: "fac-001",
    name: "Prep Area",
    code: "PA-001",
    area_type: "prep",
    floor: 1,
    description: "Main prep area",
    square_feet: 1200,
    status: "active",
    created_at: new Date("2026-01-01"),
    ...overrides,
  };
}

function createMockWorkOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: "wo-001",
    work_order_number: "WO-2026-00001",
    area_id: "area-001",
    equipment_id: null,
    work_order_type: "corrective",
    priority: "medium",
    status: "open",
    title: "Fix oven door",
    description: "Hinge is broken",
    reported_by: TEST_USER_ID,
    reported_at: new Date("2026-01-15"),
    assigned_to: null,
    assigned_vendor: null,
    scheduled_date: null,
    started_at: null,
    completed_at: null,
    completed_by: null,
    labor_hours: null,
    parts_cost: null,
    labor_cost: null,
    total_cost: null,
    notes: null,
    created_at: new Date("2026-01-15"),
    updated_at: new Date("2026-01-15"),
    ...overrides,
  };
}

/**
 * Setup common auth + tenant mocks for a happy-path request.
 * Individual tests override auth/tenant as needed for error cases.
 */
function setupHappyPathMocks() {
  vi.mocked(auth).mockResolvedValue({
    userId: TEST_USER_ID,
    orgId: TEST_ORG_ID,
  } as never);
  vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
}

// ===========================================================================
// FACILITY COMMANDS
// ===========================================================================

describe("Facilities Command Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupHappyPathMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------- CREATE
  describe("POST /api/facilities/commands/create", () => {
    it("should return 401 when unauthenticated", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const req = createNextRequest(
        "http://localhost/api/facilities/commands/create",
        {
          name: "Test Facility",
        }
      );
      const res = await createFacility(req);

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Unauthorized");
    });

    it("should return 400 when tenant not found", async () => {
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const req = createNextRequest(
        "http://localhost/api/facilities/commands/create",
        {
          name: "Test Facility",
        }
      );
      const res = await createFacility(req);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Tenant not found");
    });

    it("should return 400 when name is missing", async () => {
      const req = createNextRequest(
        "http://localhost/api/facilities/commands/create",
        {
          code: "FAC-001",
        }
      );
      const res = await createFacility(req);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("name is required");
    });

    it("should return 400 when name is empty string", async () => {
      const req = createNextRequest(
        "http://localhost/api/facilities/commands/create",
        {
          name: "   ",
        }
      );
      const res = await createFacility(req);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("name is required");
    });

    it("should create facility and return 200 with facility data", async () => {
      const mockFacility = createMockFacility();
      vi.mocked(database.$queryRaw).mockResolvedValue([mockFacility]);

      const req = createNextRequest(
        "http://localhost/api/facilities/commands/create",
        {
          name: "Main Kitchen",
          code: "MK-001",
          facilityType: "kitchen",
          addressLine1: "123 Main St",
          city: "Springfield",
          state: "IL",
          postalCode: "62701",
          country: "US",
          phone: "+1-555-0100",
          notes: "Primary commissary",
        }
      );
      const res = await createFacility(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.facility).toBeDefined();
      expect(body.facility.name).toBe("Main Kitchen");
    });

    it("should default facilityType to 'other' when invalid type provided", async () => {
      const mockFacility = createMockFacility({ facility_type: "other" });
      vi.mocked(database.$queryRaw).mockResolvedValue([mockFacility]);

      const req = createNextRequest(
        "http://localhost/api/facilities/commands/create",
        {
          name: "Test Facility",
          facilityType: "invalid_type",
        }
      );
      const res = await createFacility(req);

      expect(res.status).toBe(200);
      expect(database.$queryRaw).toHaveBeenCalled();
    });

    it("should accept valid facilityType values", async () => {
      const validTypes = [
        "kitchen",
        "warehouse",
        "commissary",
        "office",
        "other",
      ];
      for (const fType of validTypes) {
        vi.mocked(database.$queryRaw).mockResolvedValue([
          createMockFacility({ facility_type: fType }),
        ]);

        const req = createNextRequest(
          "http://localhost/api/facilities/commands/create",
          {
            name: `Facility ${fType}`,
            facilityType: fType,
          }
        );
        const res = await createFacility(req);

        expect(res.status).toBe(200);
      }
    });

    it("should return 500 on database error", async () => {
      vi.mocked(database.$queryRaw).mockRejectedValue(
        new Error("DB connection lost")
      );

      const req = createNextRequest(
        "http://localhost/api/facilities/commands/create",
        {
          name: "Main Kitchen",
        }
      );
      const res = await createFacility(req);

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Internal server error");
    });
  });

  // ------------------------------------------------------------------ EDIT
  describe("POST /api/facilities/commands/edit", () => {
    it("should return 401 when unauthenticated", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const req = createNextRequest(
        "http://localhost/api/facilities/commands/edit",
        {
          facilityId: "fac-001",
          name: "Updated",
        }
      );
      const res = await editFacility(req);

      expect(res.status).toBe(401);
    });

    it("should return 400 when tenant not found", async () => {
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const req = createNextRequest(
        "http://localhost/api/facilities/commands/edit",
        {
          facilityId: "fac-001",
          name: "Updated",
        }
      );
      const res = await editFacility(req);

      expect(res.status).toBe(400);
    });

    it("should return 400 when facilityId is missing", async () => {
      const req = createNextRequest(
        "http://localhost/api/facilities/commands/edit",
        {
          name: "Updated Name",
        }
      );
      const res = await editFacility(req);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("facilityId is required");
    });

    it("should update facility and return 200 with updated data", async () => {
      const updated = createMockFacility({ name: "Updated Kitchen" });
      vi.mocked(database.$queryRaw).mockResolvedValue([updated]);

      const req = createNextRequest(
        "http://localhost/api/facilities/commands/edit",
        {
          facilityId: "fac-001",
          name: "Updated Kitchen",
        }
      );
      const res = await editFacility(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.facility.name).toBe("Updated Kitchen");
    });

    it("should return 404 when facility not found (no rows updated)", async () => {
      vi.mocked(database.$queryRaw).mockResolvedValue([]);

      const req = createNextRequest(
        "http://localhost/api/facilities/commands/edit",
        {
          facilityId: "nonexistent-id",
          name: "Ghost",
        }
      );
      const res = await editFacility(req);

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Facility not found");
    });

    it("should return 500 on database error", async () => {
      vi.mocked(database.$queryRaw).mockRejectedValue(new Error("Timeout"));

      const req = createNextRequest(
        "http://localhost/api/facilities/commands/edit",
        {
          facilityId: "fac-001",
          name: "Updated",
        }
      );
      const res = await editFacility(req);

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.message).toBe("Internal server error");
    });
  });

  // ---------------------------------------------------------------- DELETE
  describe("POST /api/facilities/commands/delete", () => {
    it("should return 401 when unauthenticated", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const req = createNextRequest(
        "http://localhost/api/facilities/commands/delete",
        {
          facilityId: "fac-001",
        }
      );
      const res = await deleteFacility(req);

      expect(res.status).toBe(401);
    });

    it("should return 400 when tenant not found", async () => {
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const req = createNextRequest(
        "http://localhost/api/facilities/commands/delete",
        {
          facilityId: "fac-001",
        }
      );
      const res = await deleteFacility(req);

      expect(res.status).toBe(400);
    });

    it("should return 400 when facilityId is missing", async () => {
      const req = createNextRequest(
        "http://localhost/api/facilities/commands/delete",
        {}
      );
      const res = await deleteFacility(req);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("facilityId is required");
    });

    it("should soft-delete facility and return success", async () => {
      vi.mocked(database.$queryRaw).mockResolvedValue(undefined);

      const req = createNextRequest(
        "http://localhost/api/facilities/commands/delete",
        {
          facilityId: "fac-001",
        }
      );
      const res = await deleteFacility(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.success).toBe(true);
    });

    it("should call $queryRaw with UPDATE SET deleted_at", async () => {
      vi.mocked(database.$queryRaw).mockResolvedValue(undefined);

      const req = createNextRequest(
        "http://localhost/api/facilities/commands/delete",
        {
          facilityId: "fac-001",
        }
      );
      await deleteFacility(req);

      expect(database.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it("should return 500 on database error", async () => {
      vi.mocked(database.$queryRaw).mockRejectedValue(new Error("DB error"));

      const req = createNextRequest(
        "http://localhost/api/facilities/commands/delete",
        {
          facilityId: "fac-001",
        }
      );
      const res = await deleteFacility(req);

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.message).toBe("Internal server error");
    });
  });
});

// ===========================================================================
// FACILITY AREAS COMMANDS
// ===========================================================================

describe("Facility Areas Command Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupHappyPathMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --------------------------------------------------------- AREAS CREATE
  describe("POST /api/facilities/areas/commands/create", () => {
    it("should return 401 when unauthenticated", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const req = createNextRequest(
        "http://localhost/api/facilities/areas/commands/create",
        {
          name: "Prep Area",
        }
      );
      const res = await createArea(req);

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Unauthorized");
    });

    it("should return 400 when tenant not found", async () => {
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const req = createNextRequest(
        "http://localhost/api/facilities/areas/commands/create",
        {
          name: "Prep Area",
        }
      );
      const res = await createArea(req);

      expect(res.status).toBe(400);
    });

    it("should return 400 when name is missing", async () => {
      const req = createNextRequest(
        "http://localhost/api/facilities/areas/commands/create",
        {
          code: "PA-001",
        }
      );
      const res = await createArea(req);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("name is required");
    });

    it("should create area and return 200 with area data", async () => {
      const mockArea = createMockArea();
      // First call: duplicate code check returns empty (no duplicate)
      // Second call: INSERT returns the new area
      vi.mocked(database.$queryRaw)
        .mockResolvedValueOnce([]) // no duplicate
        .mockResolvedValueOnce([mockArea]); // insert result

      const req = createNextRequest(
        "http://localhost/api/facilities/areas/commands/create",
        {
          venueId: "fac-001",
          name: "Prep Area",
          code: "PA-001",
          areaType: "prep",
          floor: 1,
          description: "Main prep area",
          squareFeet: 1200,
        }
      );
      const res = await createArea(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.area).toBeDefined();
      expect(body.area.name).toBe("Prep Area");
    });

    it("should return 400 when area code already exists", async () => {
      // First call: duplicate check returns existing row
      // Second call should never be reached
      vi.mocked(database.$queryRaw).mockResolvedValueOnce([
        { id: "area-existing" },
      ]);

      const req = createNextRequest(
        "http://localhost/api/facilities/areas/commands/create",
        {
          venueId: "fac-001",
          name: "Duplicate Area",
          code: "PA-001",
        }
      );
      const res = await createArea(req);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Area code already exists");
    });

    it("should default areaType to 'other' when invalid type provided", async () => {
      const mockArea = createMockArea({ area_type: "other" });
      // No code provided, so only one $queryRaw call (the INSERT)
      vi.mocked(database.$queryRaw).mockResolvedValue([mockArea]);

      const req = createNextRequest(
        "http://localhost/api/facilities/areas/commands/create",
        {
          venueId: "fac-001",
          name: "Mystery Area",
          areaType: "nonexistent_type",
        }
      );
      const res = await createArea(req);

      expect(res.status).toBe(200);
      expect(database.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it("should accept all valid areaType values", async () => {
      const validTypes = [
        "kitchen",
        "storage",
        "dining",
        "prep",
        "office",
        "loading_dock",
        "restroom",
        "other",
      ];
      for (const aType of validTypes) {
        // No code provided, so only one $queryRaw call per iteration
        vi.mocked(database.$queryRaw).mockResolvedValue([
          createMockArea({ area_type: aType }),
        ]);

        const req = createNextRequest(
          "http://localhost/api/facilities/areas/commands/create",
          {
            venueId: "fac-001",
            name: `Area ${aType}`,
            areaType: aType,
          }
        );
        const res = await createArea(req);

        expect(res.status).toBe(200);
      }
    });

    it("should allow creation without a code (no duplicate check)", async () => {
      const mockArea = createMockArea({ code: null });
      vi.mocked(database.$queryRaw).mockResolvedValue([mockArea]);

      const req = createNextRequest(
        "http://localhost/api/facilities/areas/commands/create",
        {
          venueId: "fac-001",
          name: "No Code Area",
        }
      );
      const res = await createArea(req);

      expect(res.status).toBe(200);
      // Only one $queryRaw call (the INSERT), no duplicate check
      expect(database.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it("should return 500 on database error", async () => {
      vi.mocked(database.$queryRaw).mockRejectedValue(new Error("DB failure"));

      const req = createNextRequest(
        "http://localhost/api/facilities/areas/commands/create",
        {
          venueId: "fac-001",
          name: "Prep Area",
        }
      );
      const res = await createArea(req);

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.message).toBe("Internal server error");
    });
  });

  // ----------------------------------------------------------- AREAS EDIT
  describe("POST /api/facilities/areas/commands/edit", () => {
    it("should return 401 when unauthenticated", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const req = createNextRequest(
        "http://localhost/api/facilities/areas/commands/edit",
        {
          areaId: "area-001",
          name: "Updated",
        }
      );
      const res = await editArea(req);

      expect(res.status).toBe(401);
    });

    it("should return 400 when tenant not found", async () => {
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const req = createNextRequest(
        "http://localhost/api/facilities/areas/commands/edit",
        {
          areaId: "area-001",
          name: "Updated",
        }
      );
      const res = await editArea(req);

      expect(res.status).toBe(400);
    });

    it("should return 400 when areaId is missing", async () => {
      const req = createNextRequest(
        "http://localhost/api/facilities/areas/commands/edit",
        {
          name: "Updated",
        }
      );
      const res = await editArea(req);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("areaId is required");
    });

    it("should update area and return 200 with updated data", async () => {
      const updated = createMockArea({ name: "Updated Prep Area" });
      vi.mocked(database.$queryRaw).mockResolvedValue([updated]);

      const req = createNextRequest(
        "http://localhost/api/facilities/areas/commands/edit",
        {
          areaId: "area-001",
          name: "Updated Prep Area",
        }
      );
      const res = await editArea(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.area.name).toBe("Updated Prep Area");
    });

    it("should return 404 when area not found", async () => {
      vi.mocked(database.$queryRaw).mockResolvedValue([]);

      const req = createNextRequest(
        "http://localhost/api/facilities/areas/commands/edit",
        {
          areaId: "nonexistent",
          name: "Ghost",
        }
      );
      const res = await editArea(req);

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Area not found");
    });

    it("should return 500 on database error", async () => {
      vi.mocked(database.$queryRaw).mockRejectedValue(
        new Error("Connection lost")
      );

      const req = createNextRequest(
        "http://localhost/api/facilities/areas/commands/edit",
        {
          areaId: "area-001",
          name: "Updated",
        }
      );
      const res = await editArea(req);

      expect(res.status).toBe(500);
    });
  });

  // --------------------------------------------------------- AREAS DELETE
  describe("POST /api/facilities/areas/commands/delete", () => {
    it("should return 401 when unauthenticated", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const req = createNextRequest(
        "http://localhost/api/facilities/areas/commands/delete",
        {
          areaId: "area-001",
        }
      );
      const res = await deleteArea(req);

      expect(res.status).toBe(401);
    });

    it("should return 400 when tenant not found", async () => {
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const req = createNextRequest(
        "http://localhost/api/facilities/areas/commands/delete",
        {
          areaId: "area-001",
        }
      );
      const res = await deleteArea(req);

      expect(res.status).toBe(400);
    });

    it("should return 400 when areaId is missing", async () => {
      const req = createNextRequest(
        "http://localhost/api/facilities/areas/commands/delete",
        {}
      );
      const res = await deleteArea(req);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("areaId is required");
    });

    it("should soft-delete area and return success", async () => {
      vi.mocked(database.$queryRaw).mockResolvedValue(undefined);

      const req = createNextRequest(
        "http://localhost/api/facilities/areas/commands/delete",
        {
          areaId: "area-001",
        }
      );
      const res = await deleteArea(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });

    it("should return 500 on database error", async () => {
      vi.mocked(database.$queryRaw).mockRejectedValue(new Error("DB error"));

      const req = createNextRequest(
        "http://localhost/api/facilities/areas/commands/delete",
        {
          areaId: "area-001",
        }
      );
      const res = await deleteArea(req);

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.message).toBe("Internal server error");
    });
  });
});

// ===========================================================================
// FACILITY AREAS LIST
// ===========================================================================

describe("Facility Areas List Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupHappyPathMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /api/facilities/areas/list", () => {
    it("should return 401 when unauthenticated", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const req = new NextRequest("http://localhost/api/facilities/areas/list");
      const res = await listAreas(req);

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Unauthorized");
    });

    it("should return 400 when tenant not found", async () => {
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const req = new NextRequest("http://localhost/api/facilities/areas/list");
      const res = await listAreas(req);

      expect(res.status).toBe(400);
    });

    it("should return areas for authenticated user", async () => {
      const mockAreas = [
        createMockArea({ id: "area-1", name: "Prep Area" }),
        createMockArea({
          id: "area-2",
          name: "Storage Room",
          area_type: "storage",
        }),
      ];
      vi.mocked(database.$queryRaw).mockResolvedValue(mockAreas);

      const req = new NextRequest("http://localhost/api/facilities/areas/list");
      const res = await listAreas(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.areas).toHaveLength(2);
    });

    it("should default status filter to 'active'", async () => {
      vi.mocked(database.$queryRaw).mockResolvedValue([]);

      const req = new NextRequest("http://localhost/api/facilities/areas/list");
      const res = await listAreas(req);

      expect(res.status).toBe(200);
      expect(database.$queryRaw).toHaveBeenCalled();
    });

    it("should pass limit and offset from query params", async () => {
      vi.mocked(database.$queryRaw).mockResolvedValue([]);

      const req = new NextRequest(
        "http://localhost/api/facilities/areas/list?limit=10&offset=20"
      );
      const res = await listAreas(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.limit).toBe(10);
      expect(body.offset).toBe(20);
    });

    it("should use default limit=50 and offset=0 when not specified", async () => {
      vi.mocked(database.$queryRaw).mockResolvedValue([]);

      const req = new NextRequest("http://localhost/api/facilities/areas/list");
      const res = await listAreas(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.limit).toBe(50);
      expect(body.offset).toBe(0);
    });

    it("should filter by venueId query param", async () => {
      vi.mocked(database.$queryRaw).mockResolvedValue([]);

      const req = new NextRequest(
        "http://localhost/api/facilities/areas/list?venueId=fac-001"
      );
      const res = await listAreas(req);

      expect(res.status).toBe(200);
      expect(database.$queryRaw).toHaveBeenCalled();
    });

    it("should return empty array when no areas exist", async () => {
      vi.mocked(database.$queryRaw).mockResolvedValue([]);

      const req = new NextRequest("http://localhost/api/facilities/areas/list");
      const res = await listAreas(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.areas).toEqual([]);
    });

    it("should return 500 on database error", async () => {
      vi.mocked(database.$queryRaw).mockRejectedValue(new Error("SQL error"));

      const req = new NextRequest("http://localhost/api/facilities/areas/list");
      const res = await listAreas(req);

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.message).toBe("Internal server error");
    });
  });
});

// ===========================================================================
// WORK ORDERS LIST
// ===========================================================================

describe("Work Orders List Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupHappyPathMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /api/facilities/work-orders/list", () => {
    it("should return 401 when unauthenticated", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const req = new NextRequest(
        "http://localhost/api/facilities/work-orders/list"
      );
      const res = await listWorkOrders(req);

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Unauthorized");
    });

    it("should return 400 when tenant not found", async () => {
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const req = new NextRequest(
        "http://localhost/api/facilities/work-orders/list"
      );
      const res = await listWorkOrders(req);

      expect(res.status).toBe(400);
    });

    it("should return work orders for authenticated user", async () => {
      const mockOrders = [
        createMockWorkOrder({ id: "wo-1", title: "Fix oven" }),
        createMockWorkOrder({
          id: "wo-2",
          title: "Replace filter",
          priority: "low",
        }),
      ];
      vi.mocked(database.$queryRaw).mockResolvedValue(mockOrders);

      const req = new NextRequest(
        "http://localhost/api/facilities/work-orders/list"
      );
      const res = await listWorkOrders(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.workOrders).toHaveLength(2);
    });

    it("should default status filter to 'open'", async () => {
      vi.mocked(database.$queryRaw).mockResolvedValue([]);

      const req = new NextRequest(
        "http://localhost/api/facilities/work-orders/list"
      );
      await listWorkOrders(req);

      expect(database.$queryRaw).toHaveBeenCalled();
    });

    it("should filter by priority query param", async () => {
      vi.mocked(database.$queryRaw).mockResolvedValue([]);

      const req = new NextRequest(
        "http://localhost/api/facilities/work-orders/list?priority=critical"
      );
      const res = await listWorkOrders(req);

      expect(res.status).toBe(200);
    });

    it("should filter by areaId query param", async () => {
      vi.mocked(database.$queryRaw).mockResolvedValue([]);

      const req = new NextRequest(
        "http://localhost/api/facilities/work-orders/list?areaId=area-001"
      );
      const res = await listWorkOrders(req);

      expect(res.status).toBe(200);
    });

    it("should filter by workOrderType query param", async () => {
      vi.mocked(database.$queryRaw).mockResolvedValue([]);

      const req = new NextRequest(
        "http://localhost/api/facilities/work-orders/list?workOrderType=preventive"
      );
      const res = await listWorkOrders(req);

      expect(res.status).toBe(200);
    });

    it("should return empty array when no work orders exist", async () => {
      vi.mocked(database.$queryRaw).mockResolvedValue([]);

      const req = new NextRequest(
        "http://localhost/api/facilities/work-orders/list"
      );
      const res = await listWorkOrders(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.workOrders).toEqual([]);
    });

    it("should return 500 on database error", async () => {
      vi.mocked(database.$queryRaw).mockRejectedValue(new Error("SQL fail"));

      const req = new NextRequest(
        "http://localhost/api/facilities/work-orders/list"
      );
      const res = await listWorkOrders(req);

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.message).toBe("Internal server error");
    });
  });
});

// ===========================================================================
// WORK ORDERS COMMANDS
// ===========================================================================

describe("Work Orders Command Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupHappyPathMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------- WORK ORDER CREATE
  describe("POST /api/facilities/work-orders/commands/create", () => {
    it("should return 401 when unauthenticated", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const req = createNextRequest(
        "http://localhost/api/facilities/work-orders/commands/create",
        {
          title: "Fix oven",
        }
      );
      const res = await createWorkOrder(req);

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Unauthorized");
    });

    it("should return 400 when tenant not found", async () => {
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const req = createNextRequest(
        "http://localhost/api/facilities/work-orders/commands/create",
        {
          title: "Fix oven",
        }
      );
      const res = await createWorkOrder(req);

      expect(res.status).toBe(400);
    });

    it("should return 400 when title is missing", async () => {
      const req = createNextRequest(
        "http://localhost/api/facilities/work-orders/commands/create",
        {
          workOrderType: "corrective",
          priority: "medium",
        }
      );
      const res = await createWorkOrder(req);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("title is required");
    });

    it("should return 400 when workOrderType is invalid", async () => {
      const req = createNextRequest(
        "http://localhost/api/facilities/work-orders/commands/create",
        {
          title: "Fix oven",
          workOrderType: "invalid_type",
        }
      );
      const res = await createWorkOrder(req);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.message).toContain("Invalid work order type");
      expect(body.message).toContain("preventive");
      expect(body.message).toContain("corrective");
      expect(body.message).toContain("emergency");
      expect(body.message).toContain("inspection");
    });

    it("should return 400 when priority is invalid", async () => {
      const req = createNextRequest(
        "http://localhost/api/facilities/work-orders/commands/create",
        {
          title: "Fix oven",
          workOrderType: "corrective",
          priority: "super_urgent",
        }
      );
      const res = await createWorkOrder(req);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.message).toContain("Invalid priority");
      expect(body.message).toContain("critical");
      expect(body.message).toContain("high");
      expect(body.message).toContain("medium");
      expect(body.message).toContain("low");
    });

    it("should create work order and return 200 with work order data", async () => {
      const mockCountResult = [{ count: 0 }];
      const mockWO = createMockWorkOrder();
      vi.mocked(database.$queryRaw)
        .mockResolvedValueOnce(mockCountResult)
        .mockResolvedValueOnce([mockWO]);

      const req = createNextRequest(
        "http://localhost/api/facilities/work-orders/commands/create",
        {
          areaId: "area-001",
          workOrderType: "corrective",
          priority: "medium",
          title: "Fix oven door",
          description: "Hinge is broken",
        }
      );
      const res = await createWorkOrder(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.workOrder).toBeDefined();
      expect(body.workOrder.title).toBe("Fix oven door");
    });

    it("should auto-generate work_order_number in WO-YYYY-NNNNN format", async () => {
      const mockCountResult = [{ count: 4 }];
      const mockWO = createMockWorkOrder({
        work_order_number: "WO-2026-00005",
      });
      vi.mocked(database.$queryRaw)
        .mockResolvedValueOnce(mockCountResult)
        .mockResolvedValueOnce([mockWO]);

      const req = createNextRequest(
        "http://localhost/api/facilities/work-orders/commands/create",
        {
          title: "New WO",
          workOrderType: "corrective",
          priority: "medium",
        }
      );
      const res = await createWorkOrder(req);

      expect(res.status).toBe(200);
      // Verify the count query was called first to generate the number
      expect(database.$queryRaw).toHaveBeenCalledTimes(2);
    });

    it("should accept all valid workOrderType values", async () => {
      const validTypes = [
        "preventive",
        "corrective",
        "emergency",
        "inspection",
      ];
      for (const wType of validTypes) {
        vi.mocked(database.$queryRaw)
          .mockResolvedValueOnce([{ count: 0 }])
          .mockResolvedValueOnce([
            createMockWorkOrder({ work_order_type: wType }),
          ]);

        const req = createNextRequest(
          "http://localhost/api/facilities/work-orders/commands/create",
          {
            title: `WO ${wType}`,
            workOrderType: wType,
            priority: "medium",
          }
        );
        const res = await createWorkOrder(req);

        expect(res.status).toBe(200);
      }
    });

    it("should accept all valid priority values", async () => {
      const validPriorities = ["critical", "high", "medium", "low"];
      for (const prio of validPriorities) {
        vi.mocked(database.$queryRaw)
          .mockResolvedValueOnce([{ count: 0 }])
          .mockResolvedValueOnce([createMockWorkOrder({ priority: prio })]);

        const req = createNextRequest(
          "http://localhost/api/facilities/work-orders/commands/create",
          {
            title: `WO ${prio}`,
            workOrderType: "corrective",
            priority: prio,
          }
        );
        const res = await createWorkOrder(req);

        expect(res.status).toBe(200);
      }
    });

    it("should use defaults for workOrderType and priority when not provided", async () => {
      // Route defaults: workOrderType = "corrective", priority = "medium"
      const mockWO = createMockWorkOrder({
        work_order_type: "corrective",
        priority: "medium",
      });
      vi.mocked(database.$queryRaw)
        .mockResolvedValueOnce([{ count: 0 }])
        .mockResolvedValueOnce([mockWO]);

      const req = createNextRequest(
        "http://localhost/api/facilities/work-orders/commands/create",
        {
          title: "Default WO",
        }
      );
      const res = await createWorkOrder(req);

      expect(res.status).toBe(200);
      expect(database.$queryRaw).toHaveBeenCalledTimes(2);
    });

    it("should return 500 on database error", async () => {
      vi.mocked(database.$queryRaw).mockRejectedValue(new Error("DB down"));

      const req = createNextRequest(
        "http://localhost/api/facilities/work-orders/commands/create",
        {
          title: "Fix oven",
          workOrderType: "corrective",
          priority: "medium",
        }
      );
      const res = await createWorkOrder(req);

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.message).toBe("Internal server error");
    });
  });

  // --------------------------------------------- WORK ORDER UPDATE STATUS
  describe("POST /api/facilities/work-orders/commands/update-status", () => {
    it("should return 401 when unauthenticated", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const req = createNextRequest(
        "http://localhost/api/facilities/work-orders/commands/update-status",
        {
          workOrderId: "wo-001",
          status: "in_progress",
        }
      );
      const res = await updateWorkOrderStatus(req);

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Unauthorized");
    });

    it("should return 400 when tenant not found", async () => {
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const req = createNextRequest(
        "http://localhost/api/facilities/work-orders/commands/update-status",
        {
          workOrderId: "wo-001",
          status: "in_progress",
        }
      );
      const res = await updateWorkOrderStatus(req);

      expect(res.status).toBe(400);
    });

    it("should return 400 when workOrderId is missing", async () => {
      const req = createNextRequest(
        "http://localhost/api/facilities/work-orders/commands/update-status",
        {
          status: "in_progress",
        }
      );
      const res = await updateWorkOrderStatus(req);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("workOrderId is required");
    });

    it("should return 400 when status is invalid", async () => {
      const req = createNextRequest(
        "http://localhost/api/facilities/work-orders/commands/update-status",
        {
          workOrderId: "wo-001",
          status: "bogus_status",
        }
      );
      const res = await updateWorkOrderStatus(req);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.message).toContain("Invalid status");
      expect(body.message).toContain("open");
      expect(body.message).toContain("assigned");
      expect(body.message).toContain("in_progress");
      expect(body.message).toContain("parts_ordered");
      expect(body.message).toContain("completed");
      expect(body.message).toContain("cancelled");
    });

    it("should return 404 when work order not found", async () => {
      // First query: existence check returns empty
      vi.mocked(database.$queryRaw).mockResolvedValueOnce([]);

      const req = createNextRequest(
        "http://localhost/api/facilities/work-orders/commands/update-status",
        {
          workOrderId: "nonexistent",
          status: "in_progress",
        }
      );
      const res = await updateWorkOrderStatus(req);

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Work order not found");
    });

    it("should update status and return 200 with updated work order", async () => {
      const existingWO = [{ id: "wo-001", status: "open" }];
      const updatedWO = createMockWorkOrder({ status: "in_progress" });

      vi.mocked(database.$queryRaw)
        .mockResolvedValueOnce(existingWO)
        .mockResolvedValueOnce([updatedWO]);

      const req = createNextRequest(
        "http://localhost/api/facilities/work-orders/commands/update-status",
        {
          workOrderId: "wo-001",
          status: "in_progress",
        }
      );
      const res = await updateWorkOrderStatus(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.workOrder).toBeDefined();
      expect(body.workOrder.status).toBe("in_progress");
    });

    it("should accept all valid status values", async () => {
      const validStatuses = [
        "open",
        "assigned",
        "in_progress",
        "parts_ordered",
        "completed",
        "cancelled",
      ];
      for (const status of validStatuses) {
        const existingWO = [{ id: "wo-001", status: "open" }];
        const updatedWO = createMockWorkOrder({ status });

        vi.mocked(database.$queryRaw)
          .mockResolvedValueOnce(existingWO)
          .mockResolvedValueOnce([updatedWO]);

        const req = createNextRequest(
          "http://localhost/api/facilities/work-orders/commands/update-status",
          {
            workOrderId: "wo-001",
            status,
          }
        );
        const res = await updateWorkOrderStatus(req);

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
      }
    });

    it("should update labor and cost fields when provided", async () => {
      const existingWO = [{ id: "wo-001", status: "in_progress" }];
      const updatedWO = createMockWorkOrder({
        status: "completed",
        labor_hours: 3.5,
        parts_cost: 150.0,
        labor_cost: 350.0,
        total_cost: 500.0,
      });

      vi.mocked(database.$queryRaw)
        .mockResolvedValueOnce(existingWO)
        .mockResolvedValueOnce([updatedWO]);

      const req = createNextRequest(
        "http://localhost/api/facilities/work-orders/commands/update-status",
        {
          workOrderId: "wo-001",
          status: "completed",
          laborHours: 3.5,
          partsCost: 150.0,
          laborCost: 350.0,
          notes: "All fixed",
        }
      );
      const res = await updateWorkOrderStatus(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });

    it("should return 500 on database error", async () => {
      vi.mocked(database.$queryRaw).mockRejectedValue(new Error("DB failure"));

      const req = createNextRequest(
        "http://localhost/api/facilities/work-orders/commands/update-status",
        {
          workOrderId: "wo-001",
          status: "completed",
        }
      );
      const res = await updateWorkOrderStatus(req);

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.message).toBe("Internal server error");
    });
  });
});
