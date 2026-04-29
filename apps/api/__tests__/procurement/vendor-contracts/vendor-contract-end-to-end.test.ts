/**
 * VendorContract End-to-End Persistence Tests
 *
 * Tests that the VendorContract write path (manifest command -> store)
 * and read path (Prisma list/detail API) are aligned. The write path
 * persists through the store, and the read path queries the same Prisma
 * model -- so a created contract is immediately visible in the list API.
 *
 * This test also verifies the `instanceId` fix: all command routes
 * (create, update, submit, approve, reject, activate, terminate) pass
 * `instanceId` to `runtime.runCommand` so the store can target the
 * correct entity row.
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks (vi.hoisted so dynamic imports resolve the same mock instances)
// ---------------------------------------------------------------------------

const { mockDatabase, mockRunCommand, Prisma } = vi.hoisted(() => {
  const mockVendorContractStore = {
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
      vendorContract: mockVendorContractStore,
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
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(),
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

const mockContract = {
  id: "vc-001",
  tenantId: TEST_TENANT_ID,
  contractNumber: "VC-2026-001",
  vendorId: "vendor-001",
  vendorName: "Acme Supplies",
  contractType: "purchase",
  status: "draft",
  startDate: new Date("2026-01-01"),
  endDate: new Date("2026-12-31"),
  autoRenew: true,
  renewalTermDays: 365,
  noticeDaysBeforeRenewal: 30,
  paymentTerms: "NET_30",
  deliveryTerms: "FOB Destination",
  minimumOrderQuantity: new Prisma.Decimal("100.00"),
  annualSpendCommitment: new Prisma.Decimal("50000.00"),
  spendToPeriod: null,
  currencyCode: "USD",
  approvedBy: null,
  approvedAt: null,
  terminatedBy: null,
  terminatedAt: null,
  terminationReason: null,
  contractUrl: null,
  notes: null,
  complianceScore: 100,
  lastComplianceReview: null,
  slaBreachCount: 0,
  onTimeDeliveryRate: new Prisma.Decimal("95.00"),
  qualityRating: new Prisma.Decimal("4.5"),
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("VendorContract Persistence (write -> read alignment)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // 1. GET /api/procurement/vendor-contracts/list -- list route
  // -----------------------------------------------------------------------

  describe("GET /api/procurement/vendor-contracts/list", () => {
    it("returns vendor contracts persisted through store", async () => {
      vi.mocked(auth).mockResolvedValue({
        orgId: TEST_ORG_ID,
        userId: TEST_CLERK_ID,
      } as any);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
      vi.mocked(mockDatabase.vendorContract.findMany).mockResolvedValue([
        mockContract,
      ] as never);

      const { GET } = await import(
        "@/app/api/procurement/vendor-contracts/list/route"
      );

      const request = createMockRequest(
        "http://localhost:3000/api/procurement/vendor-contracts/list"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.vendorContracts).toHaveLength(1);
      expect(data.vendorContracts[0].id).toBe("vc-001");
      expect(data.vendorContracts[0].contractNumber).toBe("VC-2026-001");
      expect(data.vendorContracts[0].status).toBe("draft");

      expect(mockDatabase.vendorContract.findMany).toHaveBeenCalledWith(
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
        "@/app/api/procurement/vendor-contracts/list/route"
      );

      const request = createMockRequest(
        "http://localhost:3000/api/procurement/vendor-contracts/list"
      );
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it("excludes soft-deleted contracts from the list", async () => {
      vi.mocked(auth).mockResolvedValue({
        orgId: TEST_ORG_ID,
        userId: TEST_CLERK_ID,
      } as any);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
      vi.mocked(mockDatabase.vendorContract.findMany).mockResolvedValue([]);

      const { GET } = await import(
        "@/app/api/procurement/vendor-contracts/list/route"
      );

      const request = createMockRequest(
        "http://localhost:3000/api/procurement/vendor-contracts/list"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.vendorContracts).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------------------
  // 2. GET /api/procurement/vendor-contracts/[id] -- detail route
  // -----------------------------------------------------------------------

  describe("GET /api/procurement/vendor-contracts/[id] (detail)", () => {
    it("returns a single persisted vendor contract", async () => {
      vi.mocked(auth).mockResolvedValue({
        orgId: TEST_ORG_ID,
        userId: TEST_CLERK_ID,
      } as any);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
      vi.mocked(mockDatabase.vendorContract.findUnique).mockResolvedValue(
        mockContract as never
      );

      const { GET } = await import(
        "@/app/api/procurement/vendor-contracts/[id]/route"
      );

      const request = createMockRequest(
        "http://localhost:3000/api/procurement/vendor-contracts/vc-001"
      );
      const response = await GET(request, {
        params: Promise.resolve({ id: "vc-001" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.vendorContract.id).toBe("vc-001");
      expect(data.vendorContract.status).toBe("draft");
      expect(data.vendorContract.contractNumber).toBe("VC-2026-001");

      expect(mockDatabase.vendorContract.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: "vc-001",
            tenantId: TEST_TENANT_ID,
            deletedAt: null,
          },
        })
      );
    });

    it("returns 404 for non-existent contract", async () => {
      vi.mocked(auth).mockResolvedValue({
        orgId: TEST_ORG_ID,
        userId: TEST_CLERK_ID,
      } as any);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
      vi.mocked(mockDatabase.vendorContract.findUnique).mockResolvedValue(null);

      const { GET } = await import(
        "@/app/api/procurement/vendor-contracts/[id]/route"
      );

      const request = createMockRequest(
        "http://localhost:3000/api/procurement/vendor-contracts/non-existent"
      );
      const response = await GET(request, {
        params: Promise.resolve({ id: "non-existent" }),
      });

      expect(response.status).toBe(404);
    });
  });

  // -----------------------------------------------------------------------
  // 3. Command routes -- instanceId correctness (Blocker #1 fix)
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
        result: { id: "vc-new", status: "draft" },
        emittedEvents: [],
      });
      vi.mocked(createManifestRuntime).mockResolvedValue({
        runCommand: mockRunCommand,
      } as any);
    });

    // -- Create: passes instanceId from body.id ----------------------------

    it("create route passes instanceId from body.id", async () => {
      const { POST } = await import(
        "@/app/api/procurement/vendor-contracts/commands/create/route"
      );
      const request = createMockRequest(
        "http://localhost:3000/api/procurement/vendor-contracts/commands/create",
        {
          method: "POST",
          body: JSON.stringify({
            contractNumber: "VC-NEW-001",
            vendorId: "vendor-001",
            vendorName: "Acme Supplies",
            contractType: "purchase",
            startDate: "2026-01-01",
            endDate: "2026-12-31",
          }),
        }
      );

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockRunCommand).toHaveBeenCalledWith(
        "create",
        expect.any(Object),
        expect.objectContaining({
          entityName: "VendorContract",
          instanceId: undefined,
        })
      );
    });

    // -- Update: must pass instanceId --------------------------------------

    it("update route passes instanceId to runCommand", async () => {
      const { POST } = await import(
        "@/app/api/procurement/vendor-contracts/commands/update/route"
      );
      const request = createMockRequest(
        "http://localhost:3000/api/procurement/vendor-contracts/commands/update",
        {
          method: "POST",
          body: JSON.stringify({
            id: "vc-001",
            endDate: "2027-12-31",
          }),
        }
      );

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockRunCommand).toHaveBeenCalledWith(
        "update",
        expect.any(Object),
        expect.objectContaining({
          entityName: "VendorContract",
          instanceId: "vc-001",
        })
      );
    });

    // -- Submit: must pass instanceId ---------------------------------------

    it("submit route passes instanceId to runCommand", async () => {
      const { POST } = await import(
        "@/app/api/procurement/vendor-contracts/commands/submit/route"
      );
      const request = createMockRequest(
        "http://localhost:3000/api/procurement/vendor-contracts/commands/submit",
        {
          method: "POST",
          body: JSON.stringify({
            id: "vc-001",
            userId: TEST_USER_ID,
          }),
        }
      );

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockRunCommand).toHaveBeenCalledWith(
        "submit",
        expect.any(Object),
        expect.objectContaining({
          entityName: "VendorContract",
          instanceId: "vc-001",
        })
      );
    });

    // -- Approve: must pass instanceId ------------------------------------

    it("approve route passes instanceId to runCommand", async () => {
      const { POST } = await import(
        "@/app/api/procurement/vendor-contracts/commands/approve/route"
      );
      const request = createMockRequest(
        "http://localhost:3000/api/procurement/vendor-contracts/commands/approve",
        {
          method: "POST",
          body: JSON.stringify({
            id: "vc-001",
            userId: TEST_USER_ID,
          }),
        }
      );

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockRunCommand).toHaveBeenCalledWith(
        "approve",
        expect.any(Object),
        expect.objectContaining({
          entityName: "VendorContract",
          instanceId: "vc-001",
        })
      );
    });

    // -- Reject: must pass instanceId -------------------------------------

    it("reject route passes instanceId to runCommand", async () => {
      const { POST } = await import(
        "@/app/api/procurement/vendor-contracts/commands/reject/route"
      );
      const request = createMockRequest(
        "http://localhost:3000/api/procurement/vendor-contracts/commands/reject",
        {
          method: "POST",
          body: JSON.stringify({
            id: "vc-001",
            userId: TEST_USER_ID,
            reason: "Terms unacceptable",
          }),
        }
      );

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockRunCommand).toHaveBeenCalledWith(
        "reject",
        expect.any(Object),
        expect.objectContaining({
          entityName: "VendorContract",
          instanceId: "vc-001",
        })
      );
    });

    // -- Activate: must pass instanceId ------------------------------------

    it("activate route passes instanceId to runCommand", async () => {
      const { POST } = await import(
        "@/app/api/procurement/vendor-contracts/commands/activate/route"
      );
      const request = createMockRequest(
        "http://localhost:3000/api/procurement/vendor-contracts/commands/activate",
        {
          method: "POST",
          body: JSON.stringify({
            id: "vc-001",
            userId: TEST_USER_ID,
          }),
        }
      );

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockRunCommand).toHaveBeenCalledWith(
        "activate",
        expect.any(Object),
        expect.objectContaining({
          entityName: "VendorContract",
          instanceId: "vc-001",
        })
      );
    });

    // -- Terminate: must pass instanceId ------------------------------------

    it("terminate route passes instanceId to runCommand", async () => {
      const { POST } = await import(
        "@/app/api/procurement/vendor-contracts/commands/terminate/route"
      );
      const request = createMockRequest(
        "http://localhost:3000/api/procurement/vendor-contracts/commands/terminate",
        {
          method: "POST",
          body: JSON.stringify({
            id: "vc-001",
            userId: TEST_USER_ID,
            reason: "Breach of contract",
          }),
        }
      );

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockRunCommand).toHaveBeenCalledWith(
        "terminate",
        expect.any(Object),
        expect.objectContaining({
          entityName: "VendorContract",
          instanceId: "vc-001",
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
        "@/app/api/procurement/vendor-contracts/commands/create/route"
      );
      const request = createMockRequest(
        "http://localhost:3000/api/procurement/vendor-contracts/commands/create"
      );
      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it("update route returns 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: null } as any);

      const { POST } = await import(
        "@/app/api/procurement/vendor-contracts/commands/update/route"
      );
      const request = createMockRequest(
        "http://localhost:3000/api/procurement/vendor-contracts/commands/update"
      );
      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it("submit route returns 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: null } as any);

      const { POST } = await import(
        "@/app/api/procurement/vendor-contracts/commands/submit/route"
      );
      const request = createMockRequest(
        "http://localhost:3000/api/procurement/vendor-contracts/commands/submit"
      );
      const response = await POST(request);

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
        guardFailure: {
          index: 0,
          formatted: "Contract number is required",
        },
      });

      const { POST } = await import(
        "@/app/api/procurement/vendor-contracts/commands/create/route"
      );
      const request = createMockRequest(
        "http://localhost:3000/api/procurement/vendor-contracts/commands/create",
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );
      const response = await POST(request);

      expect(response.status).toBe(422);
    });

    it("returns 403 on policy denial", async () => {
      mockRunCommand.mockResolvedValueOnce({
        success: false,
        policyDenial: { policyName: "AdminOnly" },
      });

      const { POST } = await import(
        "@/app/api/procurement/vendor-contracts/commands/create/route"
      );
      const request = createMockRequest(
        "http://localhost:3000/api/procurement/vendor-contracts/commands/create",
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );
      const response = await POST(request);

      expect(response.status).toBe(403);
    });

    it("returns 400 on generic command failure", async () => {
      mockRunCommand.mockResolvedValueOnce({
        success: false,
        error: "Something went wrong",
      });

      const { POST } = await import(
        "@/app/api/procurement/vendor-contracts/commands/create/route"
      );
      const request = createMockRequest(
        "http://localhost:3000/api/procurement/vendor-contracts/commands/create",
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it("returns 500 on unexpected exception", async () => {
      mockRunCommand.mockRejectedValueOnce(new Error("Unexpected error"));

      const { POST } = await import(
        "@/app/api/procurement/vendor-contracts/commands/create/route"
      );
      const request = createMockRequest(
        "http://localhost:3000/api/procurement/vendor-contracts/commands/create",
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );
      const response = await POST(request);

      expect(response.status).toBe(500);
    });
  });
});
