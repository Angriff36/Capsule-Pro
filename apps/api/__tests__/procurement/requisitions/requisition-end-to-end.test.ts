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

import { database } from "@repo/database";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// The global vitest setup (test/setup.ts + test/mocks/@repo/database.ts)
// provides a full database mock with all models. Only need to mock auth,
// response helpers, and runManifestCommand here.
// ---------------------------------------------------------------------------

vi.mock("@repo/auth/server", () => ({
  auth: vi.fn(),
}));

// Mock runManifestCommand for tests that go through the generic dispatcher.
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
  subtotal: "100.00",
  estimatedTax: "10.00",
  estimatedShipping: "5.00",
  estimatedTotal: "115.00",
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

describe("PurchaseRequisition Persistence (write -> read alignment)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // 1. GET /api/procurement/requisitions/list — list route
  // -----------------------------------------------------------------------

  describe("GET /api/procurement/requisitions/list", () => {
    it("returns requisitions persisted through PrismaStore", async () => {
      authOk();
      vi.mocked(database.purchaseRequisition.findMany).mockResolvedValue([
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

      expect(database.purchaseRequisition.findMany).toHaveBeenCalledWith(
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
        "@/app/api/procurement/requisitions/list/route"
      );

      const request = createMockRequest(
        "http://localhost:3000/api/procurement/requisitions/list"
      );
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it("excludes soft-deleted requisitions from the list", async () => {
      authOk();
      vi.mocked(database.purchaseRequisition.findMany).mockResolvedValue([]);

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
      authOk();
      // Generated route uses findFirst, not findUnique
      vi.mocked(database.purchaseRequisition.findFirst).mockResolvedValue(
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

      expect(database.purchaseRequisition.findFirst).toHaveBeenCalledWith(
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
      authOk();
      vi.mocked(database.purchaseRequisition.findFirst).mockResolvedValue(
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
  //    These go through the generic dispatcher which uses requireCurrentUser
  //    and runManifestCommand.
  // -----------------------------------------------------------------------

  describe("instanceId on command routes (Blocker #1 fix)", () => {
    beforeEach(() => {
      authOk();
    });

    // -- Create: must NOT pass instanceId ------------------------------------

    it("create route does NOT pass instanceId", async () => {
      vi.mocked(runManifestCommand).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: true, result: { id: "req-new", status: "draft" }, events: [] }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

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
      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "PurchaseRequisition",
          command: "create",
          user: {
            id: TEST_USER_ID,
            tenantId: TEST_TENANT_ID,
            role: "admin",
          },
        })
      );
    });

    // -- Update: command is sent through dispatcher --------------------------

    it("update route passes correct entity and command", async () => {
      vi.mocked(runManifestCommand).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: true, result: { id: "req-001" }, events: [] }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

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
      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "PurchaseRequisition",
          command: "update",
          body: expect.objectContaining({ id: "req-001" }),
        })
      );
    });

    // -- Submit: command is sent through dispatcher ---------------------------

    it("submit route passes correct entity and command", async () => {
      vi.mocked(runManifestCommand).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: true, result: { id: "req-001" }, events: [] }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

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
      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "PurchaseRequisition",
          command: "submit",
        })
      );
    });

    // -- Approve-manager: command is sent through dispatcher --------------------

    it("approve-manager route passes correct entity and command", async () => {
      vi.mocked(runManifestCommand).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: true, result: { id: "req-001" }, events: [] }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

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
      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "PurchaseRequisition",
          command: "approveManager",
        })
      );
    });

    // -- Reject: command is sent through dispatcher ------------------------------

    it("reject route passes correct entity and command", async () => {
      vi.mocked(runManifestCommand).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: true, result: { id: "req-001" }, events: [] }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

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
      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "PurchaseRequisition",
          command: "reject",
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
        "http://localhost:3000/api/procurement/requisitions/commands/create"
      );
      const response = await POST(
        request,
        manifestParams("PurchaseRequisition", "create")
      );

      expect(response.status).toBe(401);
    });

    it("update route returns 401 for unauthenticated requests", async () => {
      authMissing();

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
      authMissing();

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
      authOk();
    });

    it("returns 422 on guard failure", async () => {
      vi.mocked(runManifestCommand).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: false, message: "Requisition number is required" }),
          { status: 422, headers: { "Content-Type": "application/json" } }
        )
      );

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
      vi.mocked(runManifestCommand).mockRejectedValueOnce(new Error("Unexpected error"));

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
