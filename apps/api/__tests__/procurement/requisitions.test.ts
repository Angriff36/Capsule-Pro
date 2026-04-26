/**
 * Procurement Requisitions API Integration Tests
 *
 * Tests requisition CRUD (list/detail) and workflow commands
 * (create, update, submit, approve-manager, approve-finance,
 *  reject, cancel, convert-to-po) through the manifest runtime.
 */

import { database } from "@repo/database";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as listRequisitions } from "@/app/api/procurement/requisitions/list/route";
import { GET as getRequisition } from "@/app/api/procurement/requisitions/[id]/route";
import { POST as createRequisition } from "@/app/api/procurement/requisitions/commands/create/route";
import { POST as updateRequisition } from "@/app/api/procurement/requisitions/commands/update/route";
import { POST as submitRequisition } from "@/app/api/procurement/requisitions/commands/submit/route";
import { POST as approveManager } from "@/app/api/procurement/requisitions/commands/approve-manager/route";
import { POST as approveFinance } from "@/app/api/procurement/requisitions/commands/approve-finance/route";
import { POST as rejectRequisition } from "@/app/api/procurement/requisitions/commands/reject/route";
import { POST as cancelRequisition } from "@/app/api/procurement/requisitions/commands/cancel/route";
import { POST as convertToPo } from "@/app/api/procurement/requisitions/commands/convert-to-po/route";

// Mock dependencies
vi.mock("@repo/auth/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  requireCurrentUser: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(),
}));

// Import mocked modules
import { auth } from "@repo/auth/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { createManifestRuntime } from "@/lib/manifest-runtime";

// Test constants
const TEST_TENANT_ID = "a0000000-0000-4000-a000-000000000001";
const TEST_ORG_ID = "org-test-123";
const TEST_USER_ID = "user-clerk-001";
const TEST_DB_USER_ID = "db-user-001";
const TEST_REQUISITION_ID = "b0000000-0000-4000-b000-000000000001";

// Helper to create a mock request
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

// Mock data factories
function createMockRequisition(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_REQUISITION_ID,
    tenantId: TEST_TENANT_ID,
    requisitionNumber: "REQ-2026-0001",
    title: "Office Supplies",
    description: "Quarterly office supply order",
    status: "draft",
    priority: "medium",
    requestedBy: TEST_DB_USER_ID,
    requestedDate: new Date("2026-01-15"),
    requiredByDate: new Date("2026-02-01"),
    department: "Operations",
    vendorId: null,
    totalAmount: 0,
    notes: null,
    createdAt: new Date("2026-01-15"),
    updatedAt: new Date("2026-01-15"),
    deletedAt: null,
    ...overrides,
  };
}

function createMockUser(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_DB_USER_ID,
    tenantId: TEST_TENANT_ID,
    authUserId: TEST_USER_ID,
    role: "admin",
    email: "admin@test.com",
    firstName: "Admin",
    lastName: "User",
    ...overrides,
  };
}

// Helper to set up auth + user resolution
function setupAuthMocks(userOverrides: Record<string, unknown> = {}) {
  vi.mocked(auth).mockResolvedValue({
    orgId: TEST_ORG_ID,
    userId: TEST_USER_ID,
  } as never);
  vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
  vi.mocked(database.user.findFirst).mockResolvedValue(
    createMockUser(userOverrides) as never
  );
}

// Helper to create a mock runtime that succeeds
function createSuccessRuntime(result: unknown = { id: "new-id" }) {
  return {
    runCommand: vi.fn().mockResolvedValue({
      success: true,
      result,
      emittedEvents: [{ type: "created", payload: {} }],
    }),
  };
}

// Helper to create a mock runtime that fails with policy denial
function createPolicyDeniedRuntime(policyName: string) {
  return {
    runCommand: vi.fn().mockResolvedValue({
      success: false,
      policyDenial: { policyName, reason: "Not allowed" },
    }),
  };
}

// Helper to create a mock runtime that fails with guard failure
function createGuardFailedRuntime(index: number, formatted: string) {
  return {
    runCommand: vi.fn().mockResolvedValue({
      success: false,
      guardFailure: { index, formatted },
    }),
  };
}

describe("Procurement Requisitions API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ================================================================
  // GET /api/procurement/requisitions (list)
  // ================================================================
  describe("GET /api/procurement/requisitions (list)", () => {
    it("should return list of requisitions for authenticated user", async () => {
      const mockRequisitions = [
        createMockRequisition({ id: "req-001", title: "Office Supplies" }),
        createMockRequisition({
          id: "req-002",
          title: "Kitchen Equipment",
          status: "submitted",
        }),
      ];

      setupAuthMocks();
      vi.mocked(
        database.purchaseRequisition.findMany
      ).mockResolvedValue(mockRequisitions as never);

      const request = createMockRequest(
        "http://localhost:3000/api/procurement/requisitions"
      );
      const response = await listRequisitions(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.purchaseRequisitions).toHaveLength(2);
    });

    it("should enforce tenant isolation by passing tenantId in query", async () => {
      setupAuthMocks();
      vi.mocked(
        database.purchaseRequisition.findMany
      ).mockResolvedValue([]);

      const request = createMockRequest(
        "http://localhost:3000/api/procurement/requisitions"
      );
      await listRequisitions(request);

      expect(database.purchaseRequisition.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TEST_TENANT_ID,
            deletedAt: null,
          }),
        })
      );
    });

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        orgId: null,
        userId: null,
      } as never);

      const request = createMockRequest(
        "http://localhost:3000/api/procurement/requisitions"
      );
      const response = await listRequisitions(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.message).toBe("Unauthorized");
    });

    it("should return 400 when tenant not found", async () => {
      vi.mocked(auth).mockResolvedValue({
        orgId: TEST_ORG_ID,
        userId: TEST_USER_ID,
      } as never);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const request = createMockRequest(
        "http://localhost:3000/api/procurement/requisitions"
      );
      const response = await listRequisitions(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toBe("Tenant not found");
    });

    it("should return empty array when no requisitions exist", async () => {
      setupAuthMocks();
      vi.mocked(
        database.purchaseRequisition.findMany
      ).mockResolvedValue([]);

      const request = createMockRequest(
        "http://localhost:3000/api/procurement/requisitions"
      );
      const response = await listRequisitions(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.purchaseRequisitions).toEqual([]);
    });

    it("should return 500 on database error", async () => {
      setupAuthMocks();
      vi.mocked(
        database.purchaseRequisition.findMany
      ).mockRejectedValue(new Error("Database connection failed"));

      const request = createMockRequest(
        "http://localhost:3000/api/procurement/requisitions"
      );
      const response = await listRequisitions(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });

  // ================================================================
  // GET /api/procurement/requisitions/[id] (detail)
  // ================================================================
  describe("GET /api/procurement/requisitions/[id] (detail)", () => {
    it("should return a single requisition by ID", async () => {
      const mockReq = createMockRequisition();
      setupAuthMocks();
      vi.mocked(
        database.purchaseRequisition.findUnique
      ).mockResolvedValue(mockReq as never);

      const request = createMockRequest(
        `http://localhost:3000/api/procurement/requisitions/${TEST_REQUISITION_ID}`
      );
      const response = await getRequisition(request, {
        params: Promise.resolve({ id: TEST_REQUISITION_ID }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.purchaseRequisition.id).toBe(TEST_REQUISITION_ID);
    });

    it("should enforce tenant isolation in detail query", async () => {
      setupAuthMocks();
      vi.mocked(
        database.purchaseRequisition.findUnique
      ).mockResolvedValue(null as never);

      const request = createMockRequest(
        `http://localhost:3000/api/procurement/requisitions/${TEST_REQUISITION_ID}`
      );
      await getRequisition(request, {
        params: Promise.resolve({ id: TEST_REQUISITION_ID }),
      });

      expect(database.purchaseRequisition.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: TEST_REQUISITION_ID,
            tenantId: TEST_TENANT_ID,
          }),
        })
      );
    });

    it("should return 404 when requisition not found", async () => {
      setupAuthMocks();
      vi.mocked(
        database.purchaseRequisition.findUnique
      ).mockResolvedValue(null as never);

      const request = createMockRequest(
        `http://localhost:3000/api/procurement/requisitions/${TEST_REQUISITION_ID}`
      );
      const response = await getRequisition(request, {
        params: Promise.resolve({ id: TEST_REQUISITION_ID }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        orgId: null,
        userId: null,
      } as never);

      const request = createMockRequest(
        `http://localhost:3000/api/procurement/requisitions/${TEST_REQUISITION_ID}`
      );
      const response = await getRequisition(request, {
        params: Promise.resolve({ id: TEST_REQUISITION_ID }),
      });

      expect(response.status).toBe(401);
    });
  });

  // ================================================================
  // POST /api/procurement/requisitions/commands/create
  // ================================================================
  describe("POST create requisition", () => {
    it("should create a requisition via manifest runtime", async () => {
      const mockRuntime = createSuccessRuntime({
        id: "new-req-001",
        status: "draft",
      });
      setupAuthMocks();
      vi.mocked(createManifestRuntime).mockResolvedValue(
        mockRuntime as never
      );

      const body = {
        title: "New Office Supplies",
        description: "Quarterly order",
        priority: "high",
        department: "Operations",
      };

      const request = createMockRequest(
        "http://localhost:3000/api/procurement/requisitions/commands/create",
        { method: "POST", body: JSON.stringify(body) }
      );
      const response = await createRequisition(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result.id).toBe("new-req-001");
      expect(mockRuntime.runCommand).toHaveBeenCalledWith("create", body, {
        entityName: "PurchaseRequisition",
      });
    });

    it("should pass tenantId and user to runtime context", async () => {
      const mockRuntime = createSuccessRuntime();
      setupAuthMocks({ role: "admin" });
      vi.mocked(createManifestRuntime).mockResolvedValue(
        mockRuntime as never
      );

      const request = createMockRequest(
        "http://localhost:3000/api/procurement/requisitions/commands/create",
        {
          method: "POST",
          body: JSON.stringify({ title: "Test" }),
        }
      );
      await createRequisition(request);

      expect(createManifestRuntime).toHaveBeenCalledWith(
        expect.objectContaining({
          user: {
            id: TEST_DB_USER_ID,
            tenantId: TEST_TENANT_ID,
            role: "admin",
          },
          entityName: "PurchaseRequisition",
        })
      );
    });

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        orgId: null,
        userId: null,
      } as never);

      const request = createMockRequest(
        "http://localhost:3000/api/procurement/requisitions/commands/create",
        {
          method: "POST",
          body: JSON.stringify({ title: "Test" }),
        }
      );
      const response = await createRequisition(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.message).toBe("Unauthorized");
    });

    it("should return 400 when user not found in database", async () => {
      vi.mocked(auth).mockResolvedValue({
        orgId: TEST_ORG_ID,
        userId: TEST_USER_ID,
      } as never);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
      vi.mocked(database.user.findFirst).mockResolvedValue(null as never);

      const request = createMockRequest(
        "http://localhost:3000/api/procurement/requisitions/commands/create",
        {
          method: "POST",
          body: JSON.stringify({ title: "Test" }),
        }
      );
      const response = await createRequisition(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toBe("User not found in database");
    });

    it("should return 403 on policy denial", async () => {
      const mockRuntime = createPolicyDeniedRuntime("admin-only");
      setupAuthMocks({ role: "viewer" });
      vi.mocked(createManifestRuntime).mockResolvedValue(
        mockRuntime as never
      );

      const request = createMockRequest(
        "http://localhost:3000/api/procurement/requisitions/commands/create",
        {
          method: "POST",
          body: JSON.stringify({ title: "Test" }),
        }
      );
      const response = await createRequisition(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.message).toContain("Access denied");
      expect(data.message).toContain("admin-only");
    });

    it("should return 422 on guard failure", async () => {
      const mockRuntime = createGuardFailedRuntime(
        0,
        "Status must be 'draft'"
      );
      setupAuthMocks();
      vi.mocked(createManifestRuntime).mockResolvedValue(
        mockRuntime as never
      );

      const request = createMockRequest(
        "http://localhost:3000/api/procurement/requisitions/commands/create",
        {
          method: "POST",
          body: JSON.stringify({ title: "Test" }),
        }
      );
      const response = await createRequisition(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.message).toContain("Guard 0 failed");
      expect(data.message).toContain("Status must be 'draft'");
    });

    it("should return 400 on general command failure", async () => {
      const mockRuntime = {
        runCommand: vi.fn().mockResolvedValue({
          success: false,
          error: "Something went wrong",
        }),
      };
      setupAuthMocks();
      vi.mocked(createManifestRuntime).mockResolvedValue(
        mockRuntime as never
      );

      const request = createMockRequest(
        "http://localhost:3000/api/procurement/requisitions/commands/create",
        {
          method: "POST",
          body: JSON.stringify({ title: "Test" }),
        }
      );
      const response = await createRequisition(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toBe("Something went wrong");
    });

    it("should return 500 on unexpected error", async () => {
      setupAuthMocks();
      vi.mocked(createManifestRuntime).mockRejectedValue(
        new Error("Runtime initialization failed")
      );

      const request = createMockRequest(
        "http://localhost:3000/api/procurement/requisitions/commands/create",
        {
          method: "POST",
          body: JSON.stringify({ title: "Test" }),
        }
      );
      const response = await createRequisition(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });

  // ================================================================
  // POST /api/procurement/requisitions/commands/update
  // ================================================================
  describe("POST update requisition", () => {
    it("should update a requisition via manifest runtime", async () => {
      const mockRuntime = createSuccessRuntime({
        id: TEST_REQUISITION_ID,
        title: "Updated Title",
      });
      setupAuthMocks();
      vi.mocked(createManifestRuntime).mockResolvedValue(
        mockRuntime as never
      );

      const body = {
        id: TEST_REQUISITION_ID,
        title: "Updated Title",
      };

      const request = createMockRequest(
        "http://localhost:3000/api/procurement/requisitions/commands/update",
        { method: "POST", body: JSON.stringify(body) }
      );
      const response = await updateRequisition(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockRuntime.runCommand).toHaveBeenCalledWith("update", body, {
        entityName: "PurchaseRequisition",
      });
    });
  });

  // ================================================================
  // POST /api/procurement/requisitions/commands/submit
  // ================================================================
  describe("POST submit requisition", () => {
    it("should submit a requisition via manifest runtime", async () => {
      const mockRuntime = createSuccessRuntime({
        id: TEST_REQUISITION_ID,
        status: "submitted",
      });
      setupAuthMocks();
      vi.mocked(createManifestRuntime).mockResolvedValue(
        mockRuntime as never
      );

      const body = { id: TEST_REQUISITION_ID };
      const request = createMockRequest(
        "http://localhost:3000/api/procurement/requisitions/commands/submit",
        { method: "POST", body: JSON.stringify(body) }
      );
      const response = await submitRequisition(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockRuntime.runCommand).toHaveBeenCalledWith("submit", body, {
        entityName: "PurchaseRequisition",
      });
    });
  });

  // ================================================================
  // POST /api/procurement/requisitions/commands/approve-manager
  // ================================================================
  describe("POST approve-manager requisition", () => {
    it("should approve at manager level via manifest runtime", async () => {
      const mockRuntime = createSuccessRuntime({
        id: TEST_REQUISITION_ID,
        status: "manager_approved",
      });
      setupAuthMocks({ role: "manager" });
      vi.mocked(createManifestRuntime).mockResolvedValue(
        mockRuntime as never
      );

      const body = { id: TEST_REQUISITION_ID };
      const request = createMockRequest(
        "http://localhost:3000/api/procurement/requisitions/commands/approve-manager",
        { method: "POST", body: JSON.stringify(body) }
      );
      const response = await approveManager(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockRuntime.runCommand).toHaveBeenCalledWith(
        "approveManager",
        body,
        { entityName: "PurchaseRequisition" }
      );
    });
  });

  // ================================================================
  // POST /api/procurement/requisitions/commands/approve-finance
  // ================================================================
  describe("POST approve-finance requisition", () => {
    it("should approve at finance level via manifest runtime", async () => {
      const mockRuntime = createSuccessRuntime({
        id: TEST_REQUISITION_ID,
        status: "finance_approved",
      });
      setupAuthMocks({ role: "finance" });
      vi.mocked(createManifestRuntime).mockResolvedValue(
        mockRuntime as never
      );

      const body = { id: TEST_REQUISITION_ID };
      const request = createMockRequest(
        "http://localhost:3000/api/procurement/requisitions/commands/approve-finance",
        { method: "POST", body: JSON.stringify(body) }
      );
      const response = await approveFinance(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockRuntime.runCommand).toHaveBeenCalledWith(
        "approveFinance",
        body,
        { entityName: "PurchaseRequisition" }
      );
    });
  });

  // ================================================================
  // POST /api/procurement/requisitions/commands/reject
  // ================================================================
  describe("POST reject requisition", () => {
    it("should reject a requisition via manifest runtime", async () => {
      const mockRuntime = createSuccessRuntime({
        id: TEST_REQUISITION_ID,
        status: "rejected",
      });
      setupAuthMocks();
      vi.mocked(createManifestRuntime).mockResolvedValue(
        mockRuntime as never
      );

      const body = { id: TEST_REQUISITION_ID, reason: "Budget exceeded" };
      const request = createMockRequest(
        "http://localhost:3000/api/procurement/requisitions/commands/reject",
        { method: "POST", body: JSON.stringify(body) }
      );
      const response = await rejectRequisition(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockRuntime.runCommand).toHaveBeenCalledWith("reject", body, {
        entityName: "PurchaseRequisition",
      });
    });
  });

  // ================================================================
  // POST /api/procurement/requisitions/commands/cancel
  // ================================================================
  describe("POST cancel requisition", () => {
    it("should cancel a requisition via manifest runtime", async () => {
      const mockRuntime = createSuccessRuntime({
        id: TEST_REQUISITION_ID,
        status: "cancelled",
      });
      setupAuthMocks();
      vi.mocked(createManifestRuntime).mockResolvedValue(
        mockRuntime as never
      );

      const body = { id: TEST_REQUISITION_ID };
      const request = createMockRequest(
        "http://localhost:3000/api/procurement/requisitions/commands/cancel",
        { method: "POST", body: JSON.stringify(body) }
      );
      const response = await cancelRequisition(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockRuntime.runCommand).toHaveBeenCalledWith("cancel", body, {
        entityName: "PurchaseRequisition",
      });
    });
  });

  // ================================================================
  // POST /api/procurement/requisitions/commands/convert-to-po
  // ================================================================
  describe("POST convert-to-po requisition", () => {
    it("should convert requisition to PO via manifest runtime", async () => {
      const mockRuntime = createSuccessRuntime({
        requisitionId: TEST_REQUISITION_ID,
        purchaseOrderId: "po-001",
      });
      setupAuthMocks();
      vi.mocked(createManifestRuntime).mockResolvedValue(
        mockRuntime as never
      );

      const body = { id: TEST_REQUISITION_ID, vendorId: "vendor-001" };
      const request = createMockRequest(
        "http://localhost:3000/api/procurement/requisitions/commands/convert-to-po",
        { method: "POST", body: JSON.stringify(body) }
      );
      const response = await convertToPo(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockRuntime.runCommand).toHaveBeenCalledWith(
        "convertToPo",
        body,
        { entityName: "PurchaseRequisition" }
      );
    });
  });

  // ================================================================
  // Cross-cutting: all command routes share auth pattern
  // ================================================================
  describe("auth enforcement across all command routes", () => {
    const commandRoutes = [
      {
        name: "create",
        handler: createRequisition,
        path: "create",
      },
      {
        name: "update",
        handler: updateRequisition,
        path: "update",
      },
      {
        name: "submit",
        handler: submitRequisition,
        path: "submit",
      },
      {
        name: "approve-manager",
        handler: approveManager,
        path: "approve-manager",
      },
      {
        name: "approve-finance",
        handler: approveFinance,
        path: "approve-finance",
      },
      {
        name: "reject",
        handler: rejectRequisition,
        path: "reject",
      },
      {
        name: "cancel",
        handler: cancelRequisition,
        path: "cancel",
      },
      {
        name: "convert-to-po",
        handler: convertToPo,
        path: "convert-to-po",
      },
    ];

    for (const { name, handler, path } of commandRoutes) {
      it(`should return 401 for unauthenticated ${name} command`, async () => {
        vi.mocked(auth).mockResolvedValue({
          orgId: null,
          userId: null,
        } as never);

        const request = createMockRequest(
          `http://localhost:3000/api/procurement/requisitions/commands/${path}`,
          { method: "POST", body: JSON.stringify({}) }
        );
        const response = await handler(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.message).toBe("Unauthorized");
      });
    }
  });
});
