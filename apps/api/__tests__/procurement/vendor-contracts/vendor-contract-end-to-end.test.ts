/**
 * VendorContract End-to-End Persistence Tests
 *
 * Tests that the VendorContract write path (manifest command -> store)
 * and read path (Prisma list/detail API) are aligned. The write path
 * persists through the store, and the read path queries the same Prisma
 * model -- so a created contract is immediately visible in the list API.
 *
 * Command routes go through the generic dispatcher which uses
 * requireCurrentUser and runManifestCommand.
 */

import { database } from "@repo/database";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// The global vitest setup provides a full database mock with all models.
// Only need to mock auth, response helpers, and runManifestCommand here.
// ---------------------------------------------------------------------------

vi.mock("@repo/auth/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/manifest/execute-command", () => ({
  runManifestCommand: vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({ success: true, result: {}, events: [] }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  ),
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
    manifestErrorResponse: (
      message: string | { error: string; diagnostics?: unknown[] },
      status: number
    ) => {
      const body =
        typeof message === "string"
          ? { success: false, message }
          : { success: false, error: message.error, diagnostics: message.diagnostics ?? [] };
      return NextResponse.json(body, { status });
    },
  };
});

// Import mocked modules after vi.mock setup
import { auth } from "@repo/auth/server";
import { getTenantIdForOrg, requireCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";

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
  minimumOrderQuantity: "100.00",
  annualSpendCommitment: "50000.00",
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
  onTimeDeliveryRate: "95.00",
  qualityRating: "4.5",
  createdAt: new Date("2026-04-28T10:00:00Z"),
  updatedAt: new Date("2026-04-28T10:00:00Z"),
  deletedAt: null,
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

function authOk() {
  vi.mocked(auth).mockResolvedValue({
    orgId: TEST_ORG_ID,
    userId: TEST_CLERK_ID,
  } as any);
  vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
  vi.mocked(requireCurrentUser).mockResolvedValue({
    id: TEST_USER_ID,
    tenantId: TEST_TENANT_ID,
    role: "admin",
  } as never);
}

function authMissing() {
  vi.mocked(auth).mockResolvedValue({ orgId: null, userId: null } as any);
  const InvariantError = class extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = "InvariantError";
    }
  };
  vi.mocked(requireCurrentUser).mockRejectedValue(
    new InvariantError("Unauthenticated") as never
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
      authOk();
      vi.mocked(database.vendorContract.findMany).mockResolvedValue([
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

      expect(database.vendorContract.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: TEST_TENANT_ID,
            deletedAt: null,
          },
        })
      );
    });

    it("returns 401 for unauthenticated requests", async () => {
      authMissing();
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
      authOk();
      vi.mocked(database.vendorContract.findMany).mockResolvedValue([]);

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
      authOk();
      // Generated route uses findFirst
      vi.mocked(database.vendorContract.findFirst).mockResolvedValue(
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

      expect(database.vendorContract.findFirst).toHaveBeenCalledWith(
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
      authOk();
      vi.mocked(database.vendorContract.findFirst).mockResolvedValue(null);

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
  // 3. Command routes -- go through generic dispatcher
  // -----------------------------------------------------------------------

  describe("command routes through generic dispatcher", () => {
    beforeEach(() => {
      authOk();
    });

    // -- Create ---------------------------------------------------------------

    it("create route delegates to runManifestCommand", async () => {
      vi.mocked(runManifestCommand).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: true, result: { id: "vc-new", status: "draft" }, events: [] }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

      const { POST } = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
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

      const response = await POST(
        request,
        manifestParams("VendorContract", "create")
      );

      expect(response.status).toBe(200);
      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "VendorContract",
          command: "create",
          user: {
            id: TEST_USER_ID,
            tenantId: TEST_TENANT_ID,
            role: "admin",
          },
        })
      );
    });

    // -- Update ---------------------------------------------------------------

    it("update route passes correct entity and command", async () => {
      vi.mocked(runManifestCommand).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: true, result: { id: "vc-001" }, events: [] }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

      const { POST } = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
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

      const response = await POST(
        request,
        manifestParams("VendorContract", "update")
      );

      expect(response.status).toBe(200);
      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "VendorContract",
          command: "update",
          body: expect.objectContaining({ id: "vc-001" }),
        })
      );
    });

    // -- Submit ---------------------------------------------------------------

    it("submit route passes correct entity and command", async () => {
      vi.mocked(runManifestCommand).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: true, result: { id: "vc-001" }, events: [] }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

      const { POST } = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
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

      const response = await POST(
        request,
        manifestParams("VendorContract", "submit")
      );

      expect(response.status).toBe(200);
      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "VendorContract",
          command: "submit",
        })
      );
    });

    // -- Approve --------------------------------------------------------------

    it("approve route passes correct entity and command", async () => {
      vi.mocked(runManifestCommand).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: true, result: { id: "vc-001" }, events: [] }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

      const { POST } = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
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

      const response = await POST(
        request,
        manifestParams("VendorContract", "approve")
      );

      expect(response.status).toBe(200);
      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "VendorContract",
          command: "approve",
        })
      );
    });

    // -- Reject ---------------------------------------------------------------

    it("reject route passes correct entity and command", async () => {
      vi.mocked(runManifestCommand).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: true, result: { id: "vc-001" }, events: [] }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

      const { POST } = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
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

      const response = await POST(
        request,
        manifestParams("VendorContract", "reject")
      );

      expect(response.status).toBe(200);
      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "VendorContract",
          command: "reject",
        })
      );
    });

    // -- Activate -------------------------------------------------------------

    it("activate route passes correct entity and command", async () => {
      vi.mocked(runManifestCommand).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: true, result: { id: "vc-001" }, events: [] }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

      const { POST } = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
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

      const response = await POST(
        request,
        manifestParams("VendorContract", "activate")
      );

      expect(response.status).toBe(200);
      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "VendorContract",
          command: "activate",
        })
      );
    });

    // -- Terminate ------------------------------------------------------------

    it("terminate route passes correct entity and command", async () => {
      vi.mocked(runManifestCommand).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: true, result: { id: "vc-001" }, events: [] }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

      const { POST } = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
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

      const response = await POST(
        request,
        manifestParams("VendorContract", "terminate")
      );

      expect(response.status).toBe(200);
      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "VendorContract",
          command: "terminate",
        })
      );
    });
  });

  // -----------------------------------------------------------------------
  // 4. Command route authentication
  // -----------------------------------------------------------------------

  describe("command route authentication", () => {
    it("create route returns 401 for unauthenticated requests", async () => {
      authMissing();

      const { POST } = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
      );
      const request = createMockRequest(
        "http://localhost:3000/api/procurement/vendor-contracts/commands/create"
      );
      const response = await POST(
        request,
        manifestParams("VendorContract", "create")
      );

      expect(response.status).toBe(401);
    });

    it("update route returns 401 for unauthenticated requests", async () => {
      authMissing();

      const { POST } = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
      );
      const request = createMockRequest(
        "http://localhost:3000/api/procurement/vendor-contracts/commands/update"
      );
      const response = await POST(
        request,
        manifestParams("VendorContract", "update")
      );

      expect(response.status).toBe(401);
    });

    it("submit route returns 401 for unauthenticated requests", async () => {
      authMissing();

      const { POST } = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
      );
      const request = createMockRequest(
        "http://localhost:3000/api/procurement/vendor-contracts/commands/submit"
      );
      const response = await POST(
        request,
        manifestParams("VendorContract", "submit")
      );

      expect(response.status).toBe(401);
    });
  });

  // -----------------------------------------------------------------------
  // 5. Command route error handling
  // -----------------------------------------------------------------------

  describe("command route error handling", () => {
    beforeEach(() => {
      authOk();
    });

    it("returns 422 on guard failure", async () => {
      vi.mocked(runManifestCommand).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: false, message: "Contract number is required" }),
          { status: 422, headers: { "Content-Type": "application/json" } }
        )
      );

      const { POST } = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
      );
      const request = createMockRequest(
        "http://localhost:3000/api/procurement/vendor-contracts/commands/create",
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );
      const response = await POST(
        request,
        manifestParams("VendorContract", "create")
      );

      expect(response.status).toBe(422);
    });

    it("returns 403 on policy denial", async () => {
      vi.mocked(runManifestCommand).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: false, message: "Policy denied: AdminOnly" }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        )
      );

      const { POST } = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
      );
      const request = createMockRequest(
        "http://localhost:3000/api/procurement/vendor-contracts/commands/create",
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );
      const response = await POST(
        request,
        manifestParams("VendorContract", "create")
      );

      expect(response.status).toBe(403);
    });

    it("returns 400 on generic command failure", async () => {
      vi.mocked(runManifestCommand).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: false, message: "Something went wrong" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        )
      );

      const { POST } = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
      );
      const request = createMockRequest(
        "http://localhost:3000/api/procurement/vendor-contracts/commands/create",
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );
      const response = await POST(
        request,
        manifestParams("VendorContract", "create")
      );

      expect(response.status).toBe(400);
    });

    it("returns 500 on unexpected exception", async () => {
      vi.mocked(runManifestCommand).mockRejectedValueOnce(new Error("Unexpected error"));

      const { POST } = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
      );
      const request = createMockRequest(
        "http://localhost:3000/api/procurement/vendor-contracts/commands/create",
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );
      const response = await POST(
        request,
        manifestParams("VendorContract", "create")
      );

      expect(response.status).toBe(500);
    });
  });
});
