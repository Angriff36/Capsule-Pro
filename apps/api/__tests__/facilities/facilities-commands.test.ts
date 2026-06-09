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
import { GET as listAreas } from "@/app/api/facilities/areas/list/route";
import { GET as listWorkOrders } from "@/app/api/facilities/work-orders/list/route";
// Route imports
import {
  POST as createArea,
  POST as createFacility,
  POST as createWorkOrder,
  POST as deleteArea,
  POST as deleteFacility,
  POST as editArea,
  POST as editFacility,
  POST as updateWorkOrderStatus,
} from "@/app/api/manifest/[entity]/commands/[command]/route";

// Mock dependencies
vi.mock("@repo/database", () => ({
  database: {
    $queryRaw: vi.fn(),
    facilityArea: {
      findMany: vi.fn(),
    },
  },
  Prisma: {
    sql: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({
      strings,
      values,
    })),
    empty: { strings: [], values: [] },
  },
}));
vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  requireCurrentUser: vi.fn(),
  resolveCurrentUser: vi.fn(),
}));
vi.mock("@/lib/pagination", () => ({
  clampLimit: vi.fn((v: string | null) => {
    const n = parseInt(v || "50", 10);
    return Math.min(n, 200);
  }),
  clampOffset: vi.fn((v: string | null) => parseInt(v || "0", 10)),
}));
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));
vi.mock("@/lib/manifest/execute-command", () => ({
  runManifestCommand: vi.fn(),
}));
vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(),
}));
vi.mock("@/lib/manifest-response", async () => {
  const { NextResponse } = await import("next/server");
  return {
    manifestSuccessResponse: vi.fn((data: unknown, status = 200) =>
      NextResponse.json(
        {
          success: true,
          ...(typeof data === "object" && data !== null ? data : { data }),
        },
        { status }
      )
    ),
    manifestErrorResponse: vi.fn((message: string, status: number) =>
      NextResponse.json({ success: false, message }, { status })
    ),
  };
});
vi.mock("@repo/observability/log", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));
vi.mock("@/lib/database", async () => {
  const { database } = await import("@repo/database");
  return { database };
});
vi.mock("@/app/lib/invariant", () => ({
  InvariantError: class extends Error {
    constructor(message: string) {
      super(message);
      this.name = "InvariantError";
    }
  },
}));
vi.mock("@/app/lib/webhook-dispatch", () => ({
  dispatchWebhooks: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@repo/notifications", () => ({}));
vi.mock("@repo/manifest-runtime/run-manifest-command-core", () => ({
  runManifestCommandCore: vi.fn(),
}));
vi.mock("@/lib/manifest/issue-log", () => ({
  logManifestIssue: vi.fn(),
}));

// Import mocked modules
const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg, requireCurrentUser } = await import("@/app/lib/tenant");
const { InvariantError } = await import("@/app/lib/invariant");

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
 * Setup common auth + tenant mocks for the dispatcher route (requireCurrentUser).
 * The dispatcher route uses requireCurrentUser, not auth+getTenantIdForOrg.
 */
function setupHappyPathMocks() {
  vi.mocked(requireCurrentUser).mockResolvedValue({
    id: TEST_USER_ID,
    tenantId: TEST_TENANT_ID,
    role: "admin",
    email: "test@test.com",
    firstName: "Test",
    lastName: "User",
  } as never);
}

/**
 * Setup auth + tenant mocks for raw-SQL list routes (auth + getTenantIdForOrg).
 */
function setupListRouteMocks() {
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
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new InvariantError("Unauthorized") as never
      );

      const req = createNextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          name: "Test Facility",
        }
      );
      const res = await createFacility(req, {
        params: Promise.resolve({ entity: "Facility", command: "create" }),
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Unauthorized");
    });

    it("should return 400 when tenant not found", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new InvariantError("Tenant not found") as never
      );

      const req = createNextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          name: "Test Facility",
        }
      );
      const res = await createFacility(req, {
        params: Promise.resolve({ entity: "Facility", command: "create" }),
      });

      expect(res.status).toBe(401);
    });

    it("should create facility and return 200 via manifest command", async () => {
      const { runManifestCommand } = await import("@/lib/manifest/execute-command");
      vi.mocked(runManifestCommand).mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            result: createMockFacility(),
            events: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

      const req = createNextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
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
      const res = await createFacility(req, {
        params: Promise.resolve({ entity: "Facility", command: "create" }),
      });

      expect(res.status).toBe(200);
      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "Facility",
          command: "create",
          body: expect.objectContaining({ name: "Main Kitchen" }),
          user: expect.objectContaining({
            id: TEST_USER_ID,
            tenantId: TEST_TENANT_ID,
          }),
        })
      );
    });

    it("should return 500 on unexpected error", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new Error("Unexpected failure") as never
      );

      const req = createNextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          name: "Main Kitchen",
        }
      );
      const res = await createFacility(req, {
        params: Promise.resolve({ entity: "Facility", command: "create" }),
      });

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Internal server error");
    });
  });

  // ------------------------------------------------------------------ EDIT
  describe("POST /api/facilities/commands/edit", () => {
    it("should return 401 when unauthenticated", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new InvariantError("Unauthorized") as never
      );

      const req = createNextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          facilityId: "fac-001",
          name: "Updated",
        }
      );
      const res = await editFacility(req, {
        params: Promise.resolve({ entity: "Facility", command: "edit" }),
      });

      expect(res.status).toBe(401);
    });

    it("should edit facility and return 200 via manifest command", async () => {
      const { runManifestCommand } = await import("@/lib/manifest/execute-command");
      vi.mocked(runManifestCommand).mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            result: createMockFacility({ name: "Updated Kitchen" }),
            events: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

      const req = createNextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          facilityId: "fac-001",
          name: "Updated Kitchen",
        }
      );
      const res = await editFacility(req, {
        params: Promise.resolve({ entity: "Facility", command: "edit" }),
      });

      expect(res.status).toBe(200);
      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "Facility",
          command: "edit",
        })
      );
    });

    it("should return 500 on unexpected error", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new Error("Timeout") as never
      );

      const req = createNextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          facilityId: "fac-001",
          name: "Updated",
        }
      );
      const res = await editFacility(req, {
        params: Promise.resolve({ entity: "Facility", command: "edit" }),
      });

      expect(res.status).toBe(500);
    });
  });

  // ---------------------------------------------------------------- DELETE
  describe("POST /api/facilities/commands/delete", () => {
    it("should return 401 when unauthenticated", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new InvariantError("Unauthorized") as never
      );

      const req = createNextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          facilityId: "fac-001",
        }
      );
      const res = await deleteFacility(req, {
        params: Promise.resolve({ entity: "Facility", command: "remove" }),
      });

      expect(res.status).toBe(401);
    });

    it("should soft-delete facility and return 200 via manifest command", async () => {
      const { runManifestCommand } = await import("@/lib/manifest/execute-command");
      vi.mocked(runManifestCommand).mockResolvedValue(
        new Response(
          JSON.stringify({ success: true, result: { id: "fac-001" }, events: [] }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

      const req = createNextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          facilityId: "fac-001",
        }
      );
      const res = await deleteFacility(req, {
        params: Promise.resolve({ entity: "Facility", command: "remove" }),
      });

      expect(res.status).toBe(200);
      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "Facility",
          command: "remove",
        })
      );
    });

    it("should return 500 on unexpected error", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new Error("DB error") as never
      );

      const req = createNextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          facilityId: "fac-001",
        }
      );
      const res = await deleteFacility(req, {
        params: Promise.resolve({ entity: "Facility", command: "remove" }),
      });

      expect(res.status).toBe(500);
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
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new InvariantError("Unauthorized") as never
      );

      const req = createNextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          name: "Prep Area",
        }
      );
      const res = await createArea(req, {
        params: Promise.resolve({ entity: "FacilityArea", command: "create" }),
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Unauthorized");
    });

    it("should create area and return 200 via manifest command", async () => {
      const { runManifestCommand } = await import("@/lib/manifest/execute-command");
      vi.mocked(runManifestCommand).mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            result: createMockArea(),
            events: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

      const req = createNextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
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
      const res = await createArea(req, {
        params: Promise.resolve({ entity: "FacilityArea", command: "create" }),
      });

      expect(res.status).toBe(200);
      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "FacilityArea",
          command: "create",
          body: expect.objectContaining({ name: "Prep Area" }),
        })
      );
    });

    it("should return 500 on unexpected error", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new Error("DB failure") as never
      );

      const req = createNextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          venueId: "fac-001",
          name: "Prep Area",
        }
      );
      const res = await createArea(req, {
        params: Promise.resolve({ entity: "FacilityArea", command: "create" }),
      });

      expect(res.status).toBe(500);
    });
  });

  // ----------------------------------------------------------- AREAS EDIT
  describe("POST /api/facilities/areas/commands/edit", () => {
    it("should return 401 when unauthenticated", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new InvariantError("Unauthorized") as never
      );

      const req = createNextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          areaId: "area-001",
          name: "Updated",
        }
      );
      const res = await editArea(req, {
        params: Promise.resolve({ entity: "FacilityArea", command: "edit" }),
      });

      expect(res.status).toBe(401);
    });

    it("should update area and return 200 via manifest command", async () => {
      const { runManifestCommand } = await import("@/lib/manifest/execute-command");
      vi.mocked(runManifestCommand).mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            result: createMockArea({ name: "Updated Prep Area" }),
            events: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

      const req = createNextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          areaId: "area-001",
          name: "Updated Prep Area",
        }
      );
      const res = await editArea(req, {
        params: Promise.resolve({ entity: "FacilityArea", command: "edit" }),
      });

      expect(res.status).toBe(200);
      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "FacilityArea",
          command: "edit",
        })
      );
    });

    it("should return 500 on unexpected error", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new Error("Connection lost") as never
      );

      const req = createNextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          areaId: "area-001",
          name: "Updated",
        }
      );
      const res = await editArea(req, {
        params: Promise.resolve({ entity: "FacilityArea", command: "edit" }),
      });

      expect(res.status).toBe(500);
    });
  });

  // --------------------------------------------------------- AREAS DELETE
  describe("POST /api/facilities/areas/commands/delete", () => {
    it("should return 401 when unauthenticated", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new InvariantError("Unauthorized") as never
      );

      const req = createNextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          areaId: "area-001",
        }
      );
      const res = await deleteArea(req, {
        params: Promise.resolve({ entity: "FacilityArea", command: "remove" }),
      });

      expect(res.status).toBe(401);
    });

    it("should soft-delete area and return 200 via manifest command", async () => {
      const { runManifestCommand } = await import("@/lib/manifest/execute-command");
      vi.mocked(runManifestCommand).mockResolvedValue(
        new Response(
          JSON.stringify({ success: true, result: { id: "area-001" }, events: [] }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

      const req = createNextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          areaId: "area-001",
        }
      );
      const res = await deleteArea(req, {
        params: Promise.resolve({ entity: "FacilityArea", command: "remove" }),
      });

      expect(res.status).toBe(200);
    });

    it("should return 500 on unexpected error", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new Error("DB error") as never
      );

      const req = createNextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          areaId: "area-001",
        }
      );
      const res = await deleteArea(req, {
        params: Promise.resolve({ entity: "FacilityArea", command: "remove" }),
      });

      expect(res.status).toBe(500);
    });
  });
});

// ===========================================================================
// FACILITY AREAS LIST
// ===========================================================================

describe("Facility Areas List Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupListRouteMocks();
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
        { id: "area-1", venueId: "fac-001", name: "Prep Area", code: null, areaType: "prep", floor: null, description: null, squareFeet: null, status: "active", createdAt: new Date(), updatedAt: new Date() },
        { id: "area-2", venueId: "fac-001", name: "Storage Room", code: null, areaType: "storage", floor: null, description: null, squareFeet: null, status: "active", createdAt: new Date(), updatedAt: new Date() },
      ];
      vi.mocked(database.facilityArea.findMany).mockResolvedValue(mockAreas as never);

      const req = new NextRequest("http://localhost/api/facilities/areas/list");
      const res = await listAreas(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.areas).toHaveLength(2);
    });

    it("should default status filter to 'active'", async () => {
      vi.mocked(database.facilityArea.findMany).mockResolvedValue([] as never);

      const req = new NextRequest("http://localhost/api/facilities/areas/list");
      const res = await listAreas(req);

      expect(res.status).toBe(200);
      expect(database.facilityArea.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: "active" }),
        })
      );
    });

    it("should pass limit and offset from query params", async () => {
      vi.mocked(database.facilityArea.findMany).mockResolvedValue([] as never);

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
      vi.mocked(database.facilityArea.findMany).mockResolvedValue([] as never);

      const req = new NextRequest("http://localhost/api/facilities/areas/list");
      const res = await listAreas(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.limit).toBe(50);
      expect(body.offset).toBe(0);
    });

    it("should filter by venueId query param", async () => {
      vi.mocked(database.facilityArea.findMany).mockResolvedValue([] as never);

      const req = new NextRequest(
        "http://localhost/api/facilities/areas/list?venueId=fac-001"
      );
      const res = await listAreas(req);

      expect(res.status).toBe(200);
      expect(database.facilityArea.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ venueId: "fac-001" }),
        })
      );
    });

    it("should return empty array when no areas exist", async () => {
      vi.mocked(database.facilityArea.findMany).mockResolvedValue([] as never);

      const req = new NextRequest("http://localhost/api/facilities/areas/list");
      const res = await listAreas(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.areas).toEqual([]);
    });

    it("should return 500 on database error", async () => {
      vi.mocked(database.facilityArea.findMany).mockRejectedValue(new Error("SQL error"));

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
    setupListRouteMocks();
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
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new InvariantError("Unauthorized") as never
      );

      const req = createNextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          title: "Fix oven",
        }
      );
      const res = await createWorkOrder(req, {
        params: Promise.resolve({ entity: "WorkOrder", command: "create" }),
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Unauthorized");
    });

    it("should create work order and return 200 via manifest command", async () => {
      const { runManifestCommand } = await import("@/lib/manifest/execute-command");
      vi.mocked(runManifestCommand).mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            result: createMockWorkOrder(),
            events: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

      const req = createNextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          areaId: "area-001",
          workOrderType: "corrective",
          priority: "medium",
          title: "Fix oven door",
          description: "Hinge is broken",
        }
      );
      const res = await createWorkOrder(req, {
        params: Promise.resolve({ entity: "WorkOrder", command: "create" }),
      });

      expect(res.status).toBe(200);
      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "WorkOrder",
          command: "create",
          body: expect.objectContaining({ title: "Fix oven door" }),
          user: expect.objectContaining({
            id: TEST_USER_ID,
            tenantId: TEST_TENANT_ID,
          }),
        })
      );
    });

    it("should return 500 on unexpected error", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new Error("DB down") as never
      );

      const req = createNextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          title: "Fix oven",
          workOrderType: "corrective",
          priority: "medium",
        }
      );
      const res = await createWorkOrder(req, {
        params: Promise.resolve({ entity: "WorkOrder", command: "create" }),
      });

      expect(res.status).toBe(500);
    });
  });

  // --------------------------------------------- WORK ORDER UPDATE STATUS
  describe("POST /api/facilities/work-orders/commands/update-status", () => {
    it("should return 401 when unauthenticated", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new InvariantError("Unauthorized") as never
      );

      const req = createNextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          workOrderId: "wo-001",
          status: "in_progress",
        }
      );
      const res = await updateWorkOrderStatus(req, {
        params: Promise.resolve({
          entity: "WorkOrder",
          command: "updateStatus",
        }),
      });

      expect(res.status).toBe(401);
    });

    it("should update status and return 200 via manifest command", async () => {
      const { runManifestCommand } = await import("@/lib/manifest/execute-command");
      vi.mocked(runManifestCommand).mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            result: createMockWorkOrder({ status: "in_progress" }),
            events: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

      const req = createNextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          workOrderId: "wo-001",
          status: "in_progress",
        }
      );
      const res = await updateWorkOrderStatus(req, {
        params: Promise.resolve({
          entity: "WorkOrder",
          command: "updateStatus",
        }),
      });

      expect(res.status).toBe(200);
      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "WorkOrder",
          command: "updateStatus",
          body: expect.objectContaining({ status: "in_progress" }),
        })
      );
    });

    it("should return 500 on unexpected error", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new Error("DB failure") as never
      );

      const req = createNextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          workOrderId: "wo-001",
          status: "completed",
        }
      );
      const res = await updateWorkOrderStatus(req, {
        params: Promise.resolve({
          entity: "WorkOrder",
          command: "updateStatus",
        }),
      });

      expect(res.status).toBe(500);
    });
  });
});
