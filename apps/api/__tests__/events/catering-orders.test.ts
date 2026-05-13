/**
 * Catering Orders API Integration Tests
 *
 * Tests all catering order endpoints: list, detail, and command routes
 * (create, update, confirm, cancel, start-prep, mark-complete).
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — single shared database mock for both import paths
// ---------------------------------------------------------------------------

const mockDb = {
  cateringOrder: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  user: {
    findFirst: vi.fn(),
  },
};

vi.mock("@repo/auth/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(),
}));

// Both import paths must resolve to the SAME mock object so that
// vi.mocked(database.cateringOrder.findMany) controls the fn the route calls.
vi.mock("@/lib/database", () => ({
  database: mockDb,
}));

vi.mock("@repo/database", () => ({
  database: mockDb,
}));

// ---------------------------------------------------------------------------
// Import mocked modules AFTER vi.mock declarations
// ---------------------------------------------------------------------------

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg } = await import("@/app/lib/tenant");
const { createManifestRuntime } = await import("@/lib/manifest-runtime");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TEST_TENANT_ID = "a0000000-0000-4000-a000-000000000001";
const TEST_USER_ID = "user_test";
const TEST_CLERK_ID = "clerk_test";
const TEST_ORG_ID = "org_test";
const TEST_ORDER_ID = "c0000000-0000-4000-a000-000000000001";
const TEST_EVENT_ID = "e0000000-0000-4000-a000-000000000001";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockRequest(
  url: string,
  options: RequestInit = {}
): NextRequest {
  if (options.body && !options.headers) {
    options.headers = { "Content-Type": "application/json" };
  }
  return new NextRequest(
    new URL(url, "http://localhost:3000"),
    options as ConstructorParameters<typeof NextRequest>[1]
  );
}

function createMockCateringOrder(overrides = {}) {
  return {
    id: TEST_ORDER_ID,
    tenantId: TEST_TENANT_ID,
    eventId: TEST_EVENT_ID,
    orderNumber: "CO-001",
    clientName: "Test Client",
    status: "draft",
    guestCount: 50,
    totalAmount: 2500,
    deliveryDate: new Date("2026-06-15"),
    notes: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    deletedAt: null,
    ...overrides,
  };
}

function createMockUser(overrides = {}) {
  return {
    id: TEST_USER_ID,
    tenantId: TEST_TENANT_ID,
    authUserId: TEST_CLERK_ID,
    role: "admin",
    email: "test@example.com",
    ...overrides,
  };
}

/** Setup common auth + tenant mocks for authenticated tests */
function setupAuthMocks(userOverrides = {}) {
  vi.mocked(auth).mockResolvedValue({
    orgId: TEST_ORG_ID,
    userId: TEST_CLERK_ID,
  } as any);
  vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
  mockDb.user.findFirst.mockResolvedValue(createMockUser(userOverrides) as any);
}

/** Setup manifest runtime mock for a successful command result */
function setupRuntimeSuccess(resultData = {}) {
  const runCommand = vi.fn().mockResolvedValue({
    success: true,
    result: { id: TEST_ORDER_ID, ...resultData },
    emittedEvents: [{ type: "CateringOrderCreated", payload: {} }],
    policyDenial: null,
    guardFailure: null,
    error: null,
  });
  vi.mocked(createManifestRuntime).mockResolvedValue({
    runCommand,
  } as any);
  return runCommand;
}

/** Setup manifest runtime mock for a policy denial */
function setupRuntimePolicyDenial(policyName: string) {
  const runCommand = vi.fn().mockResolvedValue({
    success: false,
    result: null,
    emittedEvents: [],
    policyDenial: { policyName, message: "Denied" },
    guardFailure: null,
    error: null,
  });
  vi.mocked(createManifestRuntime).mockResolvedValue({
    runCommand,
  } as any);
  return runCommand;
}

/** Setup manifest runtime mock for a guard failure */
function setupRuntimeGuardFailure() {
  const runCommand = vi.fn().mockResolvedValue({
    success: false,
    result: null,
    emittedEvents: [],
    policyDenial: null,
    guardFailure: { index: 1, formatted: "Status must be draft" },
    error: null,
  });
  vi.mocked(createManifestRuntime).mockResolvedValue({
    runCommand,
  } as any);
  return runCommand;
}

/** Setup manifest runtime mock for a generic command failure */
function setupRuntimeFailure(errorMsg = "Command failed") {
  const runCommand = vi.fn().mockResolvedValue({
    success: false,
    result: null,
    emittedEvents: [],
    policyDenial: null,
    guardFailure: null,
    error: errorMsg,
  });
  vi.mocked(createManifestRuntime).mockResolvedValue({
    runCommand,
  } as any);
  return runCommand;
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe("Catering Orders API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // GET /api/events/catering-orders/list
  // =========================================================================
  describe("GET /api/events/catering-orders/list", () => {
    let GET_list: typeof import("@/app/api/events/catering-orders/list/route").GET;

    beforeEach(async () => {
      const mod = await import("@/app/api/events/catering-orders/list/route");
      GET_list = mod.GET;
    });

    it("should return all catering orders for the tenant", async () => {
      const mockOrders = [
        createMockCateringOrder({ id: "order-001", status: "draft" }),
        createMockCateringOrder({
          id: "order-002",
          status: "confirmed",
          clientName: "Acme Corp",
        }),
      ];

      setupAuthMocks();
      mockDb.cateringOrder.findMany.mockResolvedValue(mockOrders as never);

      const request = createMockRequest(
        "http://localhost:3000/api/events/catering-orders/list"
      );
      const response = await GET_list(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.cateringOrders).toHaveLength(2);
      expect(data.cateringOrders[0].id).toBe("order-001");
      expect(data.cateringOrders[1].id).toBe("order-002");
    });

    it("should filter by tenantId to enforce tenant isolation", async () => {
      setupAuthMocks();
      mockDb.cateringOrder.findMany.mockResolvedValue([]);

      const request = createMockRequest(
        "http://localhost:3000/api/events/catering-orders/list"
      );
      await GET_list(request);

      expect(mockDb.cateringOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TEST_TENANT_ID,
            deletedAt: null,
          }),
        })
      );
    });

    it("should exclude soft-deleted orders", async () => {
      setupAuthMocks();
      mockDb.cateringOrder.findMany.mockResolvedValue([]);

      const request = createMockRequest(
        "http://localhost:3000/api/events/catering-orders/list"
      );
      await GET_list(request);

      expect(mockDb.cateringOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deletedAt: null }),
        })
      );
    });

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: null, userId: null } as any);

      const request = createMockRequest(
        "http://localhost:3000/api/events/catering-orders/list"
      );
      const response = await GET_list(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.message).toBe("Unauthorized");
    });

    it("should return 400 when tenant is not found", async () => {
      vi.mocked(auth).mockResolvedValue({
        orgId: TEST_ORG_ID,
        userId: TEST_CLERK_ID,
      } as any);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const request = createMockRequest(
        "http://localhost:3000/api/events/catering-orders/list"
      );
      const response = await GET_list(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toBe("Tenant not found");
    });

    it("should return 500 on database error", async () => {
      setupAuthMocks();
      mockDb.cateringOrder.findMany.mockRejectedValue(
        new Error("DB connection lost")
      );

      const request = createMockRequest(
        "http://localhost:3000/api/events/catering-orders/list"
      );
      const response = await GET_list(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toBe("Internal server error");
    });
  });

  // =========================================================================
  // GET /api/events/catering-orders/[id]
  // =========================================================================
  describe("GET /api/events/catering-orders/[id]", () => {
    let GET_detail: (
      request: NextRequest,
      ctx: { params: Promise<{ id: string }> }
    ) => Promise<Response>;

    beforeEach(async () => {
      const mod = await import("@/app/api/events/catering-orders/[id]/route");
      GET_detail = mod.GET;
    });

    it("should return a single catering order by ID", async () => {
      const mockOrder = createMockCateringOrder();

      setupAuthMocks();
      mockDb.cateringOrder.findUnique.mockResolvedValue(mockOrder as never);

      const request = createMockRequest(
        `http://localhost:3000/api/events/catering-orders/${TEST_ORDER_ID}`
      );
      const response = await GET_detail(request, {
        params: Promise.resolve({ id: TEST_ORDER_ID }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.cateringOrder.id).toBe(TEST_ORDER_ID);
    });

    it("should enforce tenant isolation on detail queries", async () => {
      setupAuthMocks();
      mockDb.cateringOrder.findUnique.mockResolvedValue(null as never);

      const request = createMockRequest(
        `http://localhost:3000/api/events/catering-orders/${TEST_ORDER_ID}`
      );
      await GET_detail(request, {
        params: Promise.resolve({ id: TEST_ORDER_ID }),
      });

      expect(mockDb.cateringOrder.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: TEST_ORDER_ID,
            tenantId: TEST_TENANT_ID,
          }),
        })
      );
    });

    it("should return 404 when order does not exist", async () => {
      setupAuthMocks();
      mockDb.cateringOrder.findUnique.mockResolvedValue(null as never);

      const request = createMockRequest(
        "http://localhost:3000/api/events/catering-orders/nonexistent-id"
      );
      const response = await GET_detail(request, {
        params: Promise.resolve({ id: "nonexistent-id" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.message).toBe("CateringOrder not found");
    });

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: null, userId: null } as any);

      const request = createMockRequest(
        `http://localhost:3000/api/events/catering-orders/${TEST_ORDER_ID}`
      );
      const response = await GET_detail(request, {
        params: Promise.resolve({ id: TEST_ORDER_ID }),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.message).toBe("Unauthorized");
    });

    it("should return 500 on database error", async () => {
      setupAuthMocks();
      mockDb.cateringOrder.findUnique.mockRejectedValue(new Error("DB error"));

      const request = createMockRequest(
        `http://localhost:3000/api/events/catering-orders/${TEST_ORDER_ID}`
      );
      const response = await GET_detail(request, {
        params: Promise.resolve({ id: TEST_ORDER_ID }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.message).toBe("Internal server error");
    });
  });

  // =========================================================================
  // POST /api/events/catering-orders/commands/create
  // =========================================================================
  describe("POST /api/events/catering-orders/commands/create", () => {
    let POST_create: typeof import("@/app/api/manifest/[entity]/commands/[command]/route").POST;

    beforeEach(async () => {
      const mod = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
      );
      POST_create = mod.POST;
    });

    it("should create a catering order successfully", async () => {
      setupAuthMocks();
      setupRuntimeSuccess({ status: "draft" });

      const body = {
        eventId: TEST_EVENT_ID,
        clientName: "Acme Corp",
        guestCount: 100,
        totalAmount: 5000,
      };

      const request = createMockRequest(
        "http://localhost:3000/api/events/catering-orders/commands/create",
        { method: "POST", body: JSON.stringify(body) }
      );
      const response = await POST_create(request, { params: Promise.resolve({ entity: "CateringOrder", command: "create" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result.id).toBe(TEST_ORDER_ID);
      expect(data.events).toHaveLength(1);
    });

    it("should resolve internal user and pass to runtime", async () => {
      const mockUser = createMockUser({ role: "manager" });
      setupAuthMocks({ role: "manager" });
      const runCommand = setupRuntimeSuccess();

      const request = createMockRequest(
        "http://localhost:3000/api/events/catering-orders/commands/create",
        {
          method: "POST",
          body: JSON.stringify({ eventId: TEST_EVENT_ID }),
        }
      );
      await POST_create(request, { params: Promise.resolve({ entity: "CateringOrder", command: "create" }) });

      expect(mockDb.user.findFirst).toHaveBeenCalledWith({
        where: {
          AND: [{ tenantId: TEST_TENANT_ID }, { authUserId: TEST_CLERK_ID }],
        },
      });

      expect(createManifestRuntime).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.objectContaining({
            id: mockUser.id,
            tenantId: TEST_TENANT_ID,
            role: "manager",
          }),
          entityName: "CateringOrder",
        })
      );

      expect(runCommand).toHaveBeenCalledWith("create", expect.any(Object), {
        entityName: "CateringOrder",
      });
    });

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: null, userId: null } as any);

      const request = createMockRequest(
        "http://localhost:3000/api/events/catering-orders/commands/create",
        {
          method: "POST",
          body: JSON.stringify({ eventId: TEST_EVENT_ID }),
        }
      );
      const response = await POST_create(request, { params: Promise.resolve({ entity: "CateringOrder", command: "create" }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.message).toBe("Unauthorized");
    });

    it("should return 400 when user is not found in database", async () => {
      setupAuthMocks();
      mockDb.user.findFirst.mockResolvedValue(null as never);

      const request = createMockRequest(
        "http://localhost:3000/api/events/catering-orders/commands/create",
        {
          method: "POST",
          body: JSON.stringify({ eventId: TEST_EVENT_ID }),
        }
      );
      const response = await POST_create(request, { params: Promise.resolve({ entity: "CateringOrder", command: "create" }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toBe("User not found in database");
    });

    it("should return 403 on policy denial", async () => {
      setupAuthMocks({ role: "viewer" });
      setupRuntimePolicyDenial("RequiresManagerRole");

      const request = createMockRequest(
        "http://localhost:3000/api/events/catering-orders/commands/create",
        {
          method: "POST",
          body: JSON.stringify({ eventId: TEST_EVENT_ID }),
        }
      );
      const response = await POST_create(request, { params: Promise.resolve({ entity: "CateringOrder", command: "create" }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.message).toContain("Access denied");
      expect(data.message).toContain("RequiresManagerRole");
    });

    it("should return 422 on guard failure", async () => {
      setupAuthMocks();
      setupRuntimeGuardFailure();

      const request = createMockRequest(
        "http://localhost:3000/api/events/catering-orders/commands/create",
        {
          method: "POST",
          body: JSON.stringify({ eventId: TEST_EVENT_ID }),
        }
      );
      const response = await POST_create(request, { params: Promise.resolve({ entity: "CateringOrder", command: "create" }) });
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.message).toContain("Guard 1 failed");
    });

    it("should return 400 on generic command failure", async () => {
      setupAuthMocks();
      setupRuntimeFailure("Invalid payload");

      const request = createMockRequest(
        "http://localhost:3000/api/events/catering-orders/commands/create",
        {
          method: "POST",
          body: JSON.stringify({ eventId: TEST_EVENT_ID }),
        }
      );
      const response = await POST_create(request, { params: Promise.resolve({ entity: "CateringOrder", command: "create" }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toBe("Invalid payload");
    });

    it("should return 500 on unexpected error", async () => {
      setupAuthMocks();
      mockDb.user.findFirst.mockRejectedValue(new Error("DB down"));

      const request = createMockRequest(
        "http://localhost:3000/api/events/catering-orders/commands/create",
        {
          method: "POST",
          body: JSON.stringify({ eventId: TEST_EVENT_ID }),
        }
      );
      const response = await POST_create(request, { params: Promise.resolve({ entity: "CateringOrder", command: "create" }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toBe("Internal server error");
    });
  });

  // =========================================================================
  // POST /api/events/catering-orders/commands/update
  // =========================================================================
  describe("POST /api/events/catering-orders/commands/update", () => {
    let POST_update: typeof import("@/app/api/manifest/[entity]/commands/[command]/route").POST;

    beforeEach(async () => {
      const mod = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
      );
      POST_update = mod.POST;
    });

    it("should update a catering order successfully", async () => {
      setupAuthMocks();
      setupRuntimeSuccess({ status: "draft", guestCount: 200 });

      const body = {
        instanceId: TEST_ORDER_ID,
        guestCount: 200,
        notes: "Updated guest count",
      };

      const request = createMockRequest(
        "http://localhost:3000/api/events/catering-orders/commands/update",
        { method: "POST", body: JSON.stringify(body) }
      );
      const response = await POST_update(request, { params: Promise.resolve({ entity: "CateringOrder", command: "create" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result.guestCount).toBe(200);
    });

    it("should pass the update command to runtime", async () => {
      setupAuthMocks();
      const runCommand = setupRuntimeSuccess();

      const body = { instanceId: TEST_ORDER_ID, clientName: "New Client" };

      const request = createMockRequest(
        "http://localhost:3000/api/events/catering-orders/commands/update",
        { method: "POST", body: JSON.stringify(body) }
      );
      await POST_update(request, { params: Promise.resolve({ entity: "CateringOrder", command: "create" }) });

      expect(runCommand).toHaveBeenCalledWith(
        "update",
        expect.objectContaining({ clientName: "New Client" }),
        { entityName: "CateringOrder" }
      );
    });

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: null, userId: null } as any);

      const request = createMockRequest(
        "http://localhost:3000/api/events/catering-orders/commands/update",
        {
          method: "POST",
          body: JSON.stringify({ instanceId: TEST_ORDER_ID }),
        }
      );
      const response = await POST_update(request, { params: Promise.resolve({ entity: "CateringOrder", command: "create" }) });

      expect(response.status).toBe(401);
    });
  });

  // =========================================================================
  // POST /api/events/catering-orders/commands/confirm
  // =========================================================================
  describe("POST /api/events/catering-orders/commands/confirm", () => {
    let POST_confirm: typeof import("@/app/api/manifest/[entity]/commands/[command]/route").POST;

    beforeEach(async () => {
      const mod = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
      );
      POST_confirm = mod.POST;
    });

    it("should confirm a catering order successfully", async () => {
      setupAuthMocks();
      setupRuntimeSuccess({ status: "confirmed" });

      const body = { instanceId: TEST_ORDER_ID };

      const request = createMockRequest(
        "http://localhost:3000/api/events/catering-orders/commands/confirm",
        { method: "POST", body: JSON.stringify(body) }
      );
      const response = await POST_confirm(request, { params: Promise.resolve({ entity: "CateringOrder", command: "create" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result.status).toBe("confirmed");
    });

    it("should return 403 on policy denial for confirm", async () => {
      setupAuthMocks({ role: "viewer" });
      setupRuntimePolicyDenial("ConfirmPolicy");

      const request = createMockRequest(
        "http://localhost:3000/api/events/catering-orders/commands/confirm",
        {
          method: "POST",
          body: JSON.stringify({ instanceId: TEST_ORDER_ID }),
        }
      );
      const response = await POST_confirm(request, { params: Promise.resolve({ entity: "CateringOrder", command: "create" }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.message).toContain("Access denied");
    });

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: null, userId: null } as any);

      const request = createMockRequest(
        "http://localhost:3000/api/events/catering-orders/commands/confirm",
        {
          method: "POST",
          body: JSON.stringify({ instanceId: TEST_ORDER_ID }),
        }
      );
      const response = await POST_confirm(request, { params: Promise.resolve({ entity: "CateringOrder", command: "create" }) });

      expect(response.status).toBe(401);
    });
  });

  // =========================================================================
  // POST /api/events/catering-orders/commands/cancel
  // =========================================================================
  describe("POST /api/events/catering-orders/commands/cancel", () => {
    let POST_cancel: typeof import("@/app/api/manifest/[entity]/commands/[command]/route").POST;

    beforeEach(async () => {
      const mod = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
      );
      POST_cancel = mod.POST;
    });

    it("should cancel a catering order successfully", async () => {
      setupAuthMocks();
      setupRuntimeSuccess({ status: "cancelled" });

      const body = {
        instanceId: TEST_ORDER_ID,
        cancellationReason: "Client requested",
      };

      const request = createMockRequest(
        "http://localhost:3000/api/events/catering-orders/commands/cancel",
        { method: "POST", body: JSON.stringify(body) }
      );
      const response = await POST_cancel(request, { params: Promise.resolve({ entity: "CateringOrder", command: "create" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result.status).toBe("cancelled");
    });

    it("should return 422 on guard failure for cancel", async () => {
      setupAuthMocks();
      setupRuntimeGuardFailure();

      const request = createMockRequest(
        "http://localhost:3000/api/events/catering-orders/commands/cancel",
        {
          method: "POST",
          body: JSON.stringify({ instanceId: TEST_ORDER_ID }),
        }
      );
      const response = await POST_cancel(request, { params: Promise.resolve({ entity: "CateringOrder", command: "create" }) });

      expect(response.status).toBe(422);
    });

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: null, userId: null } as any);

      const request = createMockRequest(
        "http://localhost:3000/api/events/catering-orders/commands/cancel",
        {
          method: "POST",
          body: JSON.stringify({ instanceId: TEST_ORDER_ID }),
        }
      );
      const response = await POST_cancel(request, { params: Promise.resolve({ entity: "CateringOrder", command: "create" }) });

      expect(response.status).toBe(401);
    });
  });

  // =========================================================================
  // POST /api/events/catering-orders/commands/start-prep
  // =========================================================================
  describe("POST /api/events/catering-orders/commands/start-prep", () => {
    let POST_startPrep: typeof import("@/app/api/manifest/[entity]/commands/[command]/route").POST;

    beforeEach(async () => {
      const mod = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
      );
      POST_startPrep = mod.POST;
    });

    it("should start prep on a catering order successfully", async () => {
      setupAuthMocks();
      setupRuntimeSuccess({ status: "in_preparation" });

      const body = { instanceId: TEST_ORDER_ID };

      const request = createMockRequest(
        "http://localhost:3000/api/events/catering-orders/commands/start-prep",
        { method: "POST", body: JSON.stringify(body) }
      );
      const response = await POST_startPrep(request, { params: Promise.resolve({ entity: "CateringOrder", command: "create" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result.status).toBe("in_preparation");
    });

    it("should pass the startPrep command to runtime", async () => {
      setupAuthMocks();
      const runCommand = setupRuntimeSuccess();

      const body = { instanceId: TEST_ORDER_ID };

      const request = createMockRequest(
        "http://localhost:3000/api/events/catering-orders/commands/start-prep",
        { method: "POST", body: JSON.stringify(body) }
      );
      await POST_startPrep(request, { params: Promise.resolve({ entity: "CateringOrder", command: "create" }) });

      expect(runCommand).toHaveBeenCalledWith(
        "startPrep",
        expect.objectContaining({ instanceId: TEST_ORDER_ID }),
        { entityName: "CateringOrder" }
      );
    });

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: null, userId: null } as any);

      const request = createMockRequest(
        "http://localhost:3000/api/events/catering-orders/commands/start-prep",
        {
          method: "POST",
          body: JSON.stringify({ instanceId: TEST_ORDER_ID }),
        }
      );
      const response = await POST_startPrep(request, { params: Promise.resolve({ entity: "CateringOrder", command: "create" }) });

      expect(response.status).toBe(401);
    });
  });

  // =========================================================================
  // POST /api/events/catering-orders/commands/mark-complete
  // =========================================================================
  describe("POST /api/events/catering-orders/commands/mark-complete", () => {
    let POST_markComplete: typeof import("@/app/api/manifest/[entity]/commands/[command]/route").POST;

    beforeEach(async () => {
      const mod = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
      );
      POST_markComplete = mod.POST;
    });

    it("should mark a catering order as complete successfully", async () => {
      setupAuthMocks();
      setupRuntimeSuccess({ status: "completed" });

      const body = { instanceId: TEST_ORDER_ID };

      const request = createMockRequest(
        "http://localhost:3000/api/events/catering-orders/commands/mark-complete",
        { method: "POST", body: JSON.stringify(body) }
      );
      const response = await POST_markComplete(request, { params: Promise.resolve({ entity: "CateringOrder", command: "create" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result.status).toBe("completed");
    });

    it("should pass the markComplete command to runtime", async () => {
      setupAuthMocks();
      const runCommand = setupRuntimeSuccess();

      const body = { instanceId: TEST_ORDER_ID };

      const request = createMockRequest(
        "http://localhost:3000/api/events/catering-orders/commands/mark-complete",
        { method: "POST", body: JSON.stringify(body) }
      );
      await POST_markComplete(request, { params: Promise.resolve({ entity: "CateringOrder", command: "create" }) });

      expect(runCommand).toHaveBeenCalledWith(
        "markComplete",
        expect.objectContaining({ instanceId: TEST_ORDER_ID }),
        { entityName: "CateringOrder" }
      );
    });

    it("should return 400 on generic command failure for mark-complete", async () => {
      setupAuthMocks();
      setupRuntimeFailure("Order must be in_preparation status");

      const request = createMockRequest(
        "http://localhost:3000/api/events/catering-orders/commands/mark-complete",
        {
          method: "POST",
          body: JSON.stringify({ instanceId: TEST_ORDER_ID }),
        }
      );
      const response = await POST_markComplete(request, { params: Promise.resolve({ entity: "CateringOrder", command: "create" }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toBe("Order must be in_preparation status");
    });

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: null, userId: null } as any);

      const request = createMockRequest(
        "http://localhost:3000/api/events/catering-orders/commands/mark-complete",
        {
          method: "POST",
          body: JSON.stringify({ instanceId: TEST_ORDER_ID }),
        }
      );
      const response = await POST_markComplete(request, { params: Promise.resolve({ entity: "CateringOrder", command: "create" }) });

      expect(response.status).toBe(401);
    });
  });
});
