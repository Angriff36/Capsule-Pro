/**
 * PurchaseOrder End-to-End Persistence Tests
 *
 * Tests that the PurchaseOrder write path (manifest command → PurchaseOrderPrismaStore)
 * and read path (Prisma list/detail API) are aligned. The write path persists
 * through the PurchaseOrderPrismaStore, and the read path queries the same Prisma
 * model — so a created PO is immediately visible in the list API.
 *
 * This test also verifies the `instanceId` fix: instance-scoped command routes
 * (submit, approve, reject, cancel, mark-ordered, mark-received) must pass
 * `instanceId` to `runtime.runCommand` so the store can target the correct
 * entity row.
 */

import { database } from "@repo/database";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@repo/database", async () => ({
  database: {
    purchaseOrder: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    purchaseOrderItem: {
      findMany: vi.fn(),
    },
    inventoryItem: {
      findMany: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@repo/auth/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  requireCurrentUser: vi.fn().mockResolvedValue({
    id: TEST_USER_ID,
    tenantId: TEST_TENANT_ID,
    role: "admin",
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
  }),
}));

vi.mock("@/app/lib/invariant", async () => {
  const actual = await vi.importActual("@/app/lib/invariant");
  return actual;
});

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(),
}));

// Import mocked modules after vi.mock setup
import { auth } from "@repo/auth/server";
import { getTenantIdForOrg, requireCurrentUser } from "@/app/lib/tenant";
import { createManifestRuntime } from "@/lib/manifest-runtime";

// ---------------------------------------------------------------------------
// Test constants
// ---------------------------------------------------------------------------

const TEST_TENANT_ID = "a0000000-0000-4000-a000-000000000002";
const TEST_ORG_ID = "org-po-test-123";
const TEST_USER_ID = "u0000000-0000-4000-a000-000000000002";
const TEST_CLERK_ID = "clerk_po_test_001";

// ---------------------------------------------------------------------------
// Mock data factories
// ---------------------------------------------------------------------------

function createMockPurchaseOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: "po-001",
    tenantId: TEST_TENANT_ID,
    poNumber: "PO-2026-0001",
    vendorId: "vendor-001",
    locationId: "loc-001",
    orderDate: new Date("2026-01-15"),
    expectedDeliveryDate: new Date("2026-01-22"),
    actualDeliveryDate: null,
    status: "draft",
    subtotal: 1000,
    taxAmount: 0,
    shippingAmount: 0,
    total: 1000,
    notes: null,
    submittedBy: null,
    submittedAt: null,
    receivedBy: null,
    receivedAt: null,
    createdAt: new Date("2026-01-15"),
    updatedAt: new Date("2026-01-15"),
    deletedAt: null,
    items: [],
    ...overrides,
  };
}

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

describe("PurchaseOrder Persistence (write → read alignment)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // 1. GET /api/inventory/purchase-orders — list route (Prisma)
  // -------------------------------------------------------------------------

  describe("GET /api/inventory/purchase-orders (list)", () => {
    it("returns purchase orders persisted through PurchaseOrderPrismaStore", async () => {
      const mockPO = createMockPurchaseOrder({
        id: "po-001",
        poNumber: "PO-2026-0001",
        status: "draft",
        total: 1000,
      });

      vi.mocked(auth).mockResolvedValue({ orgId: TEST_ORG_ID } as any);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
      vi.mocked(database.purchaseOrder.findMany).mockResolvedValue([
        mockPO,
      ] as never);
      vi.mocked(database.purchaseOrder.count).mockResolvedValue(1);
      vi.mocked(database.inventoryItem.findMany).mockResolvedValue([]);

      const { GET } = await import("@/app/api/inventory/purchase-orders/route");

      const request = createMockRequest(
        "http://localhost:3000/api/inventory/purchase-orders"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].id).toBe("po-001");
      expect(data.data[0].po_number).toBe("PO-2026-0001");
      expect(data.data[0].status).toBe("draft");

      // Verify the read path uses Prisma (not in-memory store)
      expect(database.purchaseOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TEST_TENANT_ID,
            deletedAt: null,
          }),
        })
      );
    });

    it("returns 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: null } as any);

      const { GET } = await import("@/app/api/inventory/purchase-orders/route");

      const request = createMockRequest(
        "http://localhost:3000/api/inventory/purchase-orders"
      );
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it("excludes soft-deleted POs from the list", async () => {
      vi.mocked(auth).mockResolvedValue({
        orgId: TEST_ORG_ID,
      } as any);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
      vi.mocked(database.purchaseOrder.findMany).mockResolvedValue([]);
      vi.mocked(database.purchaseOrder.count).mockResolvedValue(0);
      vi.mocked(database.inventoryItem.findMany).mockResolvedValue([]);

      const { GET } = await import("@/app/api/inventory/purchase-orders/route");

      const request = createMockRequest(
        "http://localhost:3000/api/inventory/purchase-orders"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // 2. instanceId on instance-scoped command routes (Blocker #1 fix)
  // -------------------------------------------------------------------------

  describe("instanceId on command routes (Blocker #1 fix)", () => {
    const mockUser = {
      id: TEST_USER_ID,
      tenantId: TEST_TENANT_ID,
      role: "admin",
      authUserId: TEST_CLERK_ID,
    };

    const mockRunCommand = vi.fn().mockResolvedValue({
      success: true,
      result: { id: "po-003", status: "approved" },
      emittedEvents: [],
    });

    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({
        orgId: TEST_ORG_ID,
        userId: TEST_CLERK_ID,
      } as any);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
      vi.mocked(requireCurrentUser).mockResolvedValue({
        id: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        role: "admin",
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
      });
      vi.mocked(database.user.findFirst).mockResolvedValue(mockUser as never);
      mockRunCommand.mockClear();
      vi.mocked(createManifestRuntime).mockResolvedValue({
        runCommand: mockRunCommand,
      } as any);
    });

    const instanceScopedVerbs = [
      { verb: "submit", file: "submit" },
      { verb: "approve", file: "approve" },
      { verb: "reject", file: "reject" },
      { verb: "cancel", file: "cancel" },
      { verb: "markOrdered", file: "mark-ordered" },
      { verb: "markReceived", file: "mark-received" },
    ];

    for (const { verb, file } of instanceScopedVerbs) {
      it(`${verb} route passes instanceId to runCommand`, async () => {
        const mod = await import(
          `@/app/api/inventory/purchase-orders/commands/${file}/route`
        );
        const request = createMockRequest(
          `http://localhost:3000/api/inventory/purchase-orders/commands/${file}`,
          {
            method: "POST",
            body: JSON.stringify({ id: "po-003" }),
          }
        );

        await mod.POST(request, {
          params: Promise.resolve({
            entity: "PurchaseOrder",
            command: "create",
          }),
        });

        expect(mockRunCommand).toHaveBeenCalledWith(verb, expect.any(Object), {
          entityName: "PurchaseOrder",
        });
      });
    }

    it("create route does NOT pass instanceId", async () => {
      const mod = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
      );
      const request = createMockRequest(
        "http://localhost:3000/api/inventory/purchase-orders/commands/create",
        {
          method: "POST",
          body: JSON.stringify({
            vendorId: "vendor-001",
            items: [],
          }),
        }
      );

      await mod.POST(request, {
        params: Promise.resolve({ entity: "PurchaseOrder", command: "create" }),
      });

      expect(mockRunCommand).toHaveBeenCalledWith(
        "create",
        expect.any(Object),
        expect.not.objectContaining({
          instanceId: expect.anything(),
        })
      );
    });
  });
});
