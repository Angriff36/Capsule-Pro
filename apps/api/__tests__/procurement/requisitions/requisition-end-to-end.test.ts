/**
 * PurchaseRequisition End-to-End Persistence Tests
 *
 * Tests that the PurchaseRequisition write path (manifest command route)
 * and read path (Prisma list/detail API) are aligned. The write path
 * persists through the manifest runtime / PrismaStore, and the read path
 * queries the same Prisma model -- so a created requisition is immediately
 * visible in the list API.
 *
 * This test also verifies the `instanceId` fix: instance-scoped command routes
 * (update, submit, approveManager, reject) must pass `instanceId` to
 * `runtime.runCommand` so the store can target the correct entity row.
 * The create route must NOT pass instanceId.
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks (vi.hoisted so dynamic imports resolve the same mock instances)
// ---------------------------------------------------------------------------

const { mockDatabase, mockRunCommand, Prisma } = vi.hoisted(() => {
  const mockPurchaseRequisitionStore = {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  };
  const mockUserStore = {
    findFirst: vi.fn(),
  };

  // Minimal Decimal stand-in (enough for equality assertions)
  class Decimal {
    value: string;
    constructor(v: string) {
      this.value = v;
    }
    toString() {
      return this.value;
    }
  }

  return {
    mockDatabase: {
      purchaseRequisition: mockPurchaseRequisitionStore,
      user: mockUserStore,
    },
    mockRunCommand: vi.fn(),
    Prisma: { Decimal },
  };
});

vi.mock("@repo/database", () => ({
  database: mockDatabase,
  Prisma,
}));

vi.mock("@/lib/database", () => ({
  database: mockDatabase,
}));

vi.mock("@repo/auth/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  requireCurrentUser: vi.fn(),
  requireTenantId: vi.fn(),
  resolveCurrentUser: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(),
}));

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

vi.mock("@/lib/manifest/execute-command", () => ({
  runManifestCommand: vi.fn(),
}));

// Import mocked modules after vi.mock setup
import { auth } from "@repo/auth/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { createManifestRuntime } from "@/lib/manifest-runtime";

// ---------------------------------------------------------------------------
// Test constants
// ---------------------------------------------------------------------------

const TEST_TENANT_ID = "tenant-test-001";
const TEST_ORG_ID = "org-test-123";
const TEST_USER_ID = "user-test-001";
const TEST_CLERK_ID = "clerk_test_001";

// ---------------------------------------------------------------------------
// Mock data factories
// ---------------------------------------------------------------------------

const mockRequisition = {
  id: "req-001",
  tenantId: TEST_TENANT_ID,
  requisitionNumber: "PR-2026-001",
  requestedBy: TEST_USER_ID,
  requestDate: new Date("2026-04-28"),
  requiredBy: new Date("2026-05-15"),
  locationId: "loc-001",
  department: "Kitchen",
  justification: "Monthly restock",
  status: "draft",
  subtotal: new Prisma.Decimal("100.00"),
  estimatedTax: new Prisma.Decimal("10.00"),
  estimatedShipping: new Prisma.Decimal("5.00"),
  estimatedTotal: new Prisma.Decimal("115.00"),
  approvedBy: null,
  approvedAt: null,
  managerApprovalBy: null,
  managerApprovalAt: null,
  financeApprovalBy: null,
  financeApprovalAt: null,
  convertedToPoId: null,
  convertedAt: null,
  rejectionReason: null,
  notes: null,
  submittedAt: null,
  itemCategory: "food",
  priority: "normal",
  createdAt: new Date("2026-04-28T10:00:00Z"),
  updatedAt: new Date("2026-04-28T10:00:00Z"),
  deletedAt: null,
};

const mockUser = {
  id: TEST_USER_ID,
  tenantId: TEST_TENANT_ID,
  role: "admin",
  authUserId: TEST_CLERK_ID,
};

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

// Helper to create manifest dispatcher params
function manifestParams(entity: string, command: string) {
  return { params: Promise.resolve({ entity, command }) };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PurchaseRequisition Persistence (write -> read alignment)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // 1. GET /api/procurement/requisitions/list — list route
  // -----------------------------------------------------------------------

  describe("GET /api/procurement/requisitions/list", () => {
    it("returns requisitions persisted through PrismaStore", async () => {
      vi.mocked(auth).mockResolvedValue({
        orgId: TEST_ORG_ID,
        userId: TEST_CLERK_ID,
      } as any);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
      vi.mocked(mockDatabase.purchaseRequisition.findMany).mockResolvedValue([
        mockRequisition,
      ] as never);

      const { GET } = await import(
        "@/app/api/procurement/requisitions/list/route"
      );

      const request = createMockRequest(
        "http://localhost:3000/api/procurement/requisitions/list"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.purchaseRequisitions).toHaveLength(1);
      expect(data.purchaseRequisitions[0].id).toBe("req-001");
      expect(data.purchaseRequisitions[0].status).toBe("draft");

      expect(mockDatabase.purchaseRequisition.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: TEST_TENANT_ID,
            deletedAt: null,
          },
        })
      );
    });

    it("returns 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        orgId: null,
        userId: null,
      } as any);

      const { GET } = await import(
        "@/app/api/procurement/requisitions/list/route"
      );

      const request = createMockRequest(
        "http://localhost:3000/api/procurement/requisitions/list"
      );
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it("excludes soft-deleted requisitions from the list", async () => {
      vi.mocked(auth).mockResolvedValue({
        orgId: TEST_ORG_ID,
        userId: TEST_CLERK_ID,
      } as any);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
      vi.mocked(mockDatabase.purchaseRequisition.findMany).mockResolvedValue(
        []
      );

      const { GET } = await import(
        "@/app/api/procurement/requisitions/list/route"
      );

      const request = createMockRequest(
        "http://localhost:3000/api/procurement/requisitions/list"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.purchaseRequisitions).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------------------
  // 2. GET /api/procurement/requisitions/[id] — detail route
  // -----------------------------------------------------------------------

  describe("GET /api/procurement/requisitions/[id] (detail)", () => {
    it("returns a single persisted requisition", async () => {
      vi.mocked(auth).mockResolvedValue({
        orgId: TEST_ORG_ID,
        userId: TEST_CLERK_ID,
      } as any);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
      vi.mocked(mockDatabase.purchaseRequisition.findUnique).mockResolvedValue(
        mockRequisition as never
      );

      const { GET } = await import(
        "@/app/api/procurement/requisitions/[id]/route"
      );

      const request = createMockRequest(
        "http://localhost:3000/api/procurement/requisitions/req-001"
      );
      const response = await GET(request, {
        params: Promise.resolve({ id: "req-001" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.purchaseRequisition.id).toBe("req-001");
      expect(data.purchaseRequisition.status).toBe("draft");
      expect(data.purchaseRequisition.requisitionNumber).toBe("PR-2026-001");

      expect(mockDatabase.purchaseRequisition.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: "req-001",
            tenantId: TEST_TENANT_ID,
            deletedAt: null,
          },
        })
      );
    });

    it("returns 404 for non-existent requisition", async () => {
      vi.mocked(auth).mockResolvedValue({
        orgId: TEST_ORG_ID,
        userId: TEST_CLERK_ID,
      } as any);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
      vi.mocked(mockDatabase.purchaseRequisition.findUnique).mockResolvedValue(
        null
      );

      const { GET } = await import(
        "@/app/api/procurement/requisitions/[id]/route"
      );

      const request = createMockRequest(
        "http://localhost:3000/api/procurement/requisitions/non-existent"
      );
      const response = await GET(request, {
        params: Promise.resolve({ id: "non-existent" }),
      });

      expect(response.status).toBe(404);
    });
  });

  // -----------------------------------------------------------------------
  // 3. Command routes — instanceId correctness (Blocker #1 fix)
  // -----------------------------------------------------------------------

  describe("instanceId on command routes (Blocker #1 fix)", () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({
        orgId: TEST_ORG_ID,
        userId: TEST_CLERK_ID,
      } as any);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
      vi.mocked(mockDatabase.user.findFirst).mockResolvedValue(
        mockUser as never
      );
      mockRunCommand.mockClear();
      mockRunCommand.mockResolvedValue({
        success: true,
        result: { id: "req-new", status: "draft" },
        emittedEvents: [],
      });
      vi.mocked(createManifestRuntime).mockResolvedValue({
        runCommand: mockRunCommand,
      } as any);
    });

    // -- Create: must NOT pass instanceId ------------------------------------

    it("create route does NOT pass instanceId", async () => {
      const { POST } = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
      );
      const request = createMockRequest(
        "http://localhost:3000/api/procurement/requisitions/commands/create",
        {
          method: "POST",
          body: JSON.stringify({
            requisitionNumber: "PR-2026-002",
            requestedBy: TEST_USER_ID,
            requiredBy: "2026-05-15",
            priority: "normal",
            department: "Kitchen",
            justification: "Monthly restock",
            locationId: "loc-001",
            itemCategory: "food",
          }),
        }
      );

      const response = await POST(
        request,
        manifestParams("PurchaseRequisition", "create")
      );

      expect(response.status).toBe(200);
      expect(mockRunCommand).toHaveBeenCalledWith(
        "create",
        expect.any(Object),
        expect.not.objectContaining({ instanceId: expect.anything() })
      );
    });

    // -- Update: must pass instanceId ---------------------------------------

    it("update route passes instanceId to runCommand", async () => {
      const { POST } = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
      );
      const request = createMockRequest(
        "http://localhost:3000/api/procurement/requisitions/commands/update",
        {
          method: "POST",
          body: JSON.stringify({
            id: "req-001",
            justification: "Updated reason",
          }),
        }
      );

      const response = await POST(
        request,
        manifestParams("PurchaseRequisition", "update")
      );

      expect(response.status).toBe(200);
      expect(mockRunCommand).toHaveBeenCalledWith(
        "update",
        expect.any(Object),
        expect.objectContaining({
          entityName: "PurchaseRequisition",
          instanceId: "req-001",
        })
      );
    });

    // -- Submit: must pass instanceId ----------------------------------------

    it("submit route passes instanceId to runCommand", async () => {
      const { POST } = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
      );
      const request = createMockRequest(
        "http://localhost:3000/api/procurement/requisitions/commands/submit",
        {
          method: "POST",
          body: JSON.stringify({
            id: "req-001",
            userId: TEST_USER_ID,
          }),
        }
      );

      const response = await POST(
        request,
        manifestParams("PurchaseRequisition", "submit")
      );

      expect(response.status).toBe(200);
      expect(mockRunCommand).toHaveBeenCalledWith(
        "submit",
        expect.any(Object),
        expect.objectContaining({
          entityName: "PurchaseRequisition",
          instanceId: "req-001",
        })
      );
    });

    // -- Approve-manager: must pass instanceId --------------------------------

    it("approve-manager route passes instanceId to runCommand", async () => {
      const { POST } = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
      );
      const request = createMockRequest(
        "http://localhost:3000/api/procurement/requisitions/commands/approve-manager",
        {
          method: "POST",
          body: JSON.stringify({
            id: "req-001",
            userId: TEST_USER_ID,
          }),
        }
      );

      const response = await POST(
        request,
        manifestParams("PurchaseRequisition", "approveManager")
      );

      expect(response.status).toBe(200);
      expect(mockRunCommand).toHaveBeenCalledWith(
        "approveManager",
        expect.any(Object),
        expect.objectContaining({
          entityName: "PurchaseRequisition",
          instanceId: "req-001",
        })
      );
    });

    // -- Reject: must pass instanceId -----------------------------------------

    it("reject route passes instanceId to runCommand", async () => {
      const { POST } = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
      );
      const request = createMockRequest(
        "http://localhost:3000/api/procurement/requisitions/commands/reject",
        {
          method: "POST",
          body: JSON.stringify({
            id: "req-001",
            userId: TEST_USER_ID,
            reason: "Budget cut",
          }),
        }
      );

      const response = await POST(
        request,
        manifestParams("PurchaseRequisition", "reject")
      );

      expect(response.status).toBe(200);
      expect(mockRunCommand).toHaveBeenCalledWith(
        "reject",
        expect.any(Object),
        expect.objectContaining({
          entityName: "PurchaseRequisition",
          instanceId: "req-001",
        })
      );
    });
  });

  // -----------------------------------------------------------------------
  // 4. Command route authentication
  // -----------------------------------------------------------------------

  describe("command route authentication", () => {
    it("create route returns 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: null } as any);

      const { POST } = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
      );
      const request = createMockRequest(
        "http://localhost:3000/api/procurement/requisitions/commands/create"
      );
      const response = await POST(
        request,
        manifestParams("PurchaseRequisition", "create")
      );

      expect(response.status).toBe(401);
    });

    it("update route returns 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: null } as any);

      const { POST } = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
      );
      const request = createMockRequest(
        "http://localhost:3000/api/procurement/requisitions/commands/update"
      );
      const response = await POST(
        request,
        manifestParams("PurchaseRequisition", "update")
      );

      expect(response.status).toBe(401);
    });

    it("submit route returns 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: null } as any);

      const { POST } = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
      );
      const request = createMockRequest(
        "http://localhost:3000/api/procurement/requisitions/commands/submit"
      );
      const response = await POST(
        request,
        manifestParams("PurchaseRequisition", "submit")
      );

      expect(response.status).toBe(401);
    });
  });

  // -----------------------------------------------------------------------
  // 5. Command route error handling
  // -----------------------------------------------------------------------

  describe("command route error handling", () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({
        orgId: TEST_ORG_ID,
        userId: TEST_CLERK_ID,
      } as any);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
      vi.mocked(mockDatabase.user.findFirst).mockResolvedValue(
        mockUser as never
      );
      mockRunCommand.mockClear();
      vi.mocked(createManifestRuntime).mockResolvedValue({
        runCommand: mockRunCommand,
      } as any);
    });

    it("returns 422 on guard failure", async () => {
      mockRunCommand.mockResolvedValueOnce({
        success: false,
        guardFailure: { index: 0, formatted: "Requisition number is required" },
      });

      const { POST } = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
      );
      const request = createMockRequest(
        "http://localhost:3000/api/procurement/requisitions/commands/create",
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );
      const response = await POST(
        request,
        manifestParams("PurchaseRequisition", "create")
      );

      expect(response.status).toBe(422);
    });

    it("returns 403 on policy denial", async () => {
      mockRunCommand.mockResolvedValueOnce({
        success: false,
        policyDenial: { policyName: "AdminOnly" },
      });

      const { POST } = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
      );
      const request = createMockRequest(
        "http://localhost:3000/api/procurement/requisitions/commands/create",
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );
      const response = await POST(
        request,
        manifestParams("PurchaseRequisition", "create")
      );

      expect(response.status).toBe(403);
    });

    it("returns 400 on generic command failure", async () => {
      mockRunCommand.mockResolvedValueOnce({
        success: false,
        error: "Something went wrong",
      });

      const { POST } = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
      );
      const request = createMockRequest(
        "http://localhost:3000/api/procurement/requisitions/commands/create",
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );
      const response = await POST(
        request,
        manifestParams("PurchaseRequisition", "create")
      );

      expect(response.status).toBe(400);
    });

    it("returns 500 on unexpected exception", async () => {
      mockRunCommand.mockRejectedValueOnce(new Error("Unexpected error"));

      const { POST } = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
      );
      const request = createMockRequest(
        "http://localhost:3000/api/procurement/requisitions/commands/create",
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );
      const response = await POST(
        request,
        manifestParams("PurchaseRequisition", "create")
      );

      expect(response.status).toBe(500);
    });
  });
});
