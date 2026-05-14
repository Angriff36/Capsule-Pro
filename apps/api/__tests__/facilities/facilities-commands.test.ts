/**
 * Facilities Command Routes Integration Tests
 *
 * These tests verify the manifest dispatcher route at
 * `@/app/api/manifest/[entity]/commands/[command]/route.ts`.
 * All facility/work order commands go through the manifest runtime.
 * Covers auth guards, tenant resolution, and command dispatch.
 */

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as listAreas } from "@/app/api/facilities/areas/list/route";
import { GET as listWorkOrders } from "@/app/api/facilities/work-orders/list/route";
import { InvariantError } from "@/app/lib/invariant";
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
  },
}));
vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  requireCurrentUser: vi.fn(),
  getTenantIdForOrg: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

const { auth } = await import("@repo/auth/server");
const { requireCurrentUser, getTenantIdForOrg } = await import("@/app/lib/tenant");

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
  return new NextRequest(url, init as ConstructorParameters<typeof NextRequest>[1]);
}

/**
 * Setup common mocks for a happy-path request.
 * Individual tests override as needed for error cases.
 */
function setupHappyPathMocks() {
  vi.mocked(requireCurrentUser).mockResolvedValue({
    id: TEST_USER_ID,
    tenantId: TEST_TENANT_ID,
    role: "admin",
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
  } as never);
}

// ===========================================================================
// FACILITY COMMANDS (via manifest dispatcher)
// ===========================================================================

describe("Facilities Command Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupHappyPathMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("POST /api/manifest/Facility/create", () => {
    it("should return 401 when unauthenticated", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new InvariantError("auth.userId must exist")
      );

      const req = createNextRequest(
        "http://localhost/api/manifest/Facility/create",
        { name: "Test" }
      );
      const res = await createFacility(req, {
        params: Promise.resolve({ entity: "Facility", command: "create" }),
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Unauthorized");
    });

    it("should return 401 when tenant not found", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new InvariantError("auth.orgId must exist")
      );

      const req = createNextRequest(
        "http://localhost/api/manifest/Facility/create",
        { name: "Test" }
      );
      const res = await createFacility(req, {
        params: Promise.resolve({ entity: "Facility", command: "create" }),
      });

      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/manifest/Facility/edit", () => {
    it("should return 401 when unauthenticated", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new InvariantError("auth.userId must exist")
      );

      const req = createNextRequest(
        "http://localhost/api/manifest/Facility/edit",
        { facilityId: "fac-001", name: "Updated" }
      );
      const res = await editFacility(req, {
        params: Promise.resolve({ entity: "Facility", command: "edit" }),
      });

      expect(res.status).toBe(401);
    });

    it("should return 401 when tenant not found", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new InvariantError("auth.orgId must exist")
      );

      const req = createNextRequest(
        "http://localhost/api/manifest/Facility/edit",
        { facilityId: "fac-001", name: "Updated" }
      );
      const res = await editFacility(req, {
        params: Promise.resolve({ entity: "Facility", command: "edit" }),
      });

      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/manifest/Facility/remove", () => {
    it("should return 401 when unauthenticated", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new InvariantError("auth.userId must exist")
      );

      const req = createNextRequest(
        "http://localhost/api/manifest/Facility/remove",
        { facilityId: "fac-001" }
      );
      const res = await deleteFacility(req, {
        params: Promise.resolve({ entity: "Facility", command: "remove" }),
      });

      expect(res.status).toBe(401);
    });

    it("should return 401 when tenant not found", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new InvariantError("auth.orgId must exist")
      );

      const req = createNextRequest(
        "http://localhost/api/manifest/Facility/remove",
        { facilityId: "fac-001" }
      );
      const res = await deleteFacility(req, {
        params: Promise.resolve({ entity: "Facility", command: "remove" }),
      });

      expect(res.status).toBe(401);
    });
  });
});

// ===========================================================================
// FACILITY AREAS COMMANDS (via manifest dispatcher)
// ===========================================================================

describe("Facility Areas Command Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupHappyPathMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("POST /api/manifest/FacilityArea/create", () => {
    it("should return 401 when unauthenticated", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new InvariantError("auth.userId must exist")
      );

      const req = createNextRequest(
        "http://localhost/api/manifest/FacilityArea/create",
        { name: "Prep Area" }
      );
      const res = await createArea(req, {
        params: Promise.resolve({ entity: "FacilityArea", command: "create" }),
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Unauthorized");
    });

    it("should return 401 when tenant not found", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new InvariantError("auth.orgId must exist")
      );

      const req = createNextRequest(
        "http://localhost/api/manifest/FacilityArea/create",
        { name: "Prep Area" }
      );
      const res = await createArea(req, {
        params: Promise.resolve({ entity: "FacilityArea", command: "create" }),
      });

      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/manifest/FacilityArea/edit", () => {
    it("should return 401 when unauthenticated", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new InvariantError("auth.userId must exist")
      );

      const req = createNextRequest(
        "http://localhost/api/manifest/FacilityArea/edit",
        { areaId: "area-001", name: "Updated" }
      );
      const res = await editArea(req, {
        params: Promise.resolve({ entity: "FacilityArea", command: "edit" }),
      });

      expect(res.status).toBe(401);
    });

    it("should return 401 when tenant not found", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new InvariantError("auth.orgId must exist")
      );

      const req = createNextRequest(
        "http://localhost/api/manifest/FacilityArea/edit",
        { areaId: "area-001", name: "Updated" }
      );
      const res = await editArea(req, {
        params: Promise.resolve({ entity: "FacilityArea", command: "edit" }),
      });

      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/manifest/FacilityArea/remove", () => {
    it("should return 401 when unauthenticated", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new InvariantError("auth.userId must exist")
      );

      const req = createNextRequest(
        "http://localhost/api/manifest/FacilityArea/remove",
        { areaId: "area-001" }
      );
      const res = await deleteArea(req, {
        params: Promise.resolve({ entity: "FacilityArea", command: "remove" }),
      });

      expect(res.status).toBe(401);
    });

    it("should return 401 when tenant not found", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new InvariantError("auth.orgId must exist")
      );

      const req = createNextRequest(
        "http://localhost/api/manifest/FacilityArea/remove",
        { areaId: "area-001" }
      );
      const res = await deleteArea(req, {
        params: Promise.resolve({ entity: "FacilityArea", command: "remove" }),
      });

      expect(res.status).toBe(401);
    });
  });
});

// ===========================================================================
// FACILITY AREAS LIST (uses auth directly, not manifest)
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
      // Mock auth to return valid orgId so we reach the tenant check
      vi.mocked(auth).mockResolvedValue({
        userId: "test-user",
        orgId: TEST_ORG_ID,
      } as never);
      // getTenantIdForOrg returns null for unknown org
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const req = new NextRequest("http://localhost/api/facilities/areas/list");
      const res = await listAreas(req);

      expect(res.status).toBe(400);
    });
  });
});

// ===========================================================================
// WORK ORDERS LIST (uses auth directly, not manifest)
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
      // Mock auth to return valid orgId so we reach the tenant check
      vi.mocked(auth).mockResolvedValue({
        userId: "test-user",
        orgId: TEST_ORG_ID,
      } as never);
      // getTenantIdForOrg returns null for unknown org
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const req = new NextRequest(
        "http://localhost/api/facilities/work-orders/list"
      );
      const res = await listWorkOrders(req);

      expect(res.status).toBe(400);
    });
  });
});

// ===========================================================================
// WORK ORDERS COMMANDS (via manifest dispatcher)
// ===========================================================================

describe("Work Orders Command Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupHappyPathMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("POST /api/manifest/WorkOrder/create", () => {
    it("should return 401 when unauthenticated", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new InvariantError("auth.userId must exist")
      );

      const req = createNextRequest(
        "http://localhost/api/manifest/WorkOrder/create",
        { title: "Fix oven" }
      );
      const res = await createWorkOrder(req, {
        params: Promise.resolve({ entity: "WorkOrder", command: "create" }),
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Unauthorized");
    });

    it("should return 401 when tenant not found", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new InvariantError("auth.orgId must exist")
      );

      const req = createNextRequest(
        "http://localhost/api/manifest/WorkOrder/create",
        { title: "Fix oven" }
      );
      const res = await createWorkOrder(req, {
        params: Promise.resolve({ entity: "WorkOrder", command: "create" }),
      });

      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/manifest/WorkOrder/updateStatus", () => {
    it("should return 401 when unauthenticated", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new InvariantError("auth.userId must exist")
      );

      const req = createNextRequest(
        "http://localhost/api/manifest/WorkOrder/updateStatus",
        { workOrderId: "wo-001", status: "in_progress" }
      );
      const res = await updateWorkOrderStatus(req, {
        params: Promise.resolve({
          entity: "WorkOrder",
          command: "updateStatus",
        }),
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Unauthorized");
    });

    it("should return 401 when tenant not found", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new InvariantError("auth.orgId must exist")
      );

      const req = createNextRequest(
        "http://localhost/api/manifest/WorkOrder/updateStatus",
        { workOrderId: "wo-001", status: "in_progress" }
      );
      const res = await updateWorkOrderStatus(req, {
        params: Promise.resolve({
          entity: "WorkOrder",
          command: "updateStatus",
        }),
      });

      expect(res.status).toBe(401);
    });
  });
});