/**
 * Procurement Purchase Orders API Integration Tests
 *
 * Tests PO list (with vendor lookup), detail (with items),
 * create (with line items), receive (with inventory update),
 * and status transitions.
 *
 * PO routes use direct Prisma queries (not manifest runtime).
 */

import { database } from "@repo/database";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as listOrders } from "@/app/api/procurement/purchase-orders/list/route";
import { GET as getOrder } from "@/app/api/procurement/purchase-orders/[id]/route";
import { POST as createOrder } from "@/app/api/procurement/purchase-orders/commands/create/route";
import { POST as receiveOrder } from "@/app/api/procurement/purchase-orders/commands/receive/route";
import { POST as updateStatus } from "@/app/api/procurement/purchase-orders/commands/update-status/route";

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

// Import mocked modules
import { auth } from "@repo/auth/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

// Test constants
const TEST_TENANT_ID = "a0000000-0000-4000-a000-000000000002";
const TEST_ORG_ID = "org-po-test";
const TEST_USER_ID = "user-clerk-po";
const TEST_ORDER_ID = "c0000000-0000-4000-c000-000000000001";
const TEST_VENDOR_ID = "d0000000-0000-4000-d000-000000000001";

// Mock Decimal-like object that supports .toNumber(), .lessThan(), .greaterThanOrEqualTo()
function createMockDecimal(value: number) {
  return {
    toNumber: () => value,
    lessThan: (other: { toNumber(): number }) => value < other.toNumber(),
    greaterThanOrEqualTo: (other: { toNumber(): number }) =>
      value >= other.toNumber(),
    toString: () => String(value),
    valueOf: () => value,
  };
}

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

function setupAuth() {
  vi.mocked(auth).mockResolvedValue({
    orgId: TEST_ORG_ID,
    userId: TEST_USER_ID,
  } as never);
  vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
}

// Mock PO factory with Decimal fields
function createMockPO(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_ORDER_ID,
    tenantId: TEST_TENANT_ID,
    poNumber: "PO-2026-0001",
    vendorId: TEST_VENDOR_ID,
    locationId: null,
    orderDate: new Date("2026-01-15"),
    expectedDeliveryDate: new Date("2026-02-01"),
    actualDeliveryDate: null,
    status: "submitted",
    subtotal: createMockDecimal(100),
    taxAmount: createMockDecimal(0),
    shippingAmount: createMockDecimal(0),
    total: createMockDecimal(100),
    notes: null,
    submittedBy: TEST_USER_ID,
    submittedAt: new Date("2026-01-15"),
    receivedBy: null,
    receivedAt: null,
    createdAt: new Date("2026-01-15"),
    updatedAt: new Date("2026-01-15"),
    deletedAt: null,
    items: [],
    ...overrides,
  };
}

describe("Procurement Purchase Orders API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ================================================================
  // GET /api/procurement/purchase-orders (list)
  // ================================================================
  describe("GET /api/procurement/purchase-orders (list)", () => {
    it("should return list of POs with vendor names", async () => {
      const mockPOs = [
        createMockPO({
          id: "po-001",
          vendorId: TEST_VENDOR_ID,
          items: [
            {
              id: "item-001",
              quantityReceived: createMockDecimal(0),
              quantityOrdered: createMockDecimal(10),
            },
          ],
        }),
      ];
      const mockVendors = [{ id: TEST_VENDOR_ID, name: "Acme Supplies" }];

      setupAuth();
      vi.mocked(database.purchaseOrder.findMany).mockResolvedValue(
        mockPOs as never
      );
      vi.mocked(database.inventorySupplier.findMany).mockResolvedValue(
        mockVendors as never
      );

      const request = createMockRequest(
        "http://localhost:3000/api/procurement/purchase-orders"
      );
      const response = await listOrders(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.orders).toHaveLength(1);
      expect(data.orders[0].vendor_name).toBe("Acme Supplies");
      expect(data.orders[0].po_number).toBe("PO-2026-0001");
    });

    it("should filter by status when provided", async () => {
      setupAuth();
      vi.mocked(database.purchaseOrder.findMany).mockResolvedValue([]);
      vi.mocked(database.inventorySupplier.findMany).mockResolvedValue([]);

      const request = createMockRequest(
        "http://localhost:3000/api/procurement/purchase-orders?status=submitted"
      );
      await listOrders(request);

      expect(database.purchaseOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TEST_TENANT_ID,
            status: "submitted",
          }),
        })
      );
    });

    it("should not filter by status when status is 'all'", async () => {
      setupAuth();
      vi.mocked(database.purchaseOrder.findMany).mockResolvedValue([]);
      vi.mocked(database.inventorySupplier.findMany).mockResolvedValue([]);

      const request = createMockRequest(
        "http://localhost:3000/api/procurement/purchase-orders?status=all"
      );
      await listOrders(request);

      expect(database.purchaseOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TEST_TENANT_ID,
            deletedAt: null,
          }),
        })
      );
      // Should NOT include status in the where clause
      const callArgs = vi.mocked(database.purchaseOrder.findMany).mock.calls[0]?.[0];
      const whereClause = (callArgs?.where ?? {}) as Record<string, unknown>;
      expect(whereClause.status).toBeUndefined();
    });

    it("should enforce tenant isolation", async () => {
      setupAuth();
      vi.mocked(database.purchaseOrder.findMany).mockResolvedValue([]);
      vi.mocked(database.inventorySupplier.findMany).mockResolvedValue([]);

      const request = createMockRequest(
        "http://localhost:3000/api/procurement/purchase-orders"
      );
      await listOrders(request);

      expect(database.purchaseOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TEST_TENANT_ID,
          }),
        })
      );
    });

    it("should count pending items correctly", async () => {
      const mockPOs = [
        createMockPO({
          id: "po-001",
          items: [
            {
              id: "item-001",
              quantityReceived: createMockDecimal(5),
              quantityOrdered: createMockDecimal(10),
            },
            {
              id: "item-002",
              quantityReceived: createMockDecimal(10),
              quantityOrdered: createMockDecimal(10),
            },
          ],
        }),
      ];

      setupAuth();
      vi.mocked(database.purchaseOrder.findMany).mockResolvedValue(
        mockPOs as never
      );
      vi.mocked(database.inventorySupplier.findMany).mockResolvedValue([]);

      const request = createMockRequest(
        "http://localhost:3000/api/procurement/purchase-orders"
      );
      const response = await listOrders(request);
      const data = await response.json();

      expect(data.orders[0].item_count).toBe(2);
      expect(data.orders[0].pending_items).toBe(1);
    });

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        orgId: null,
        userId: null,
      } as never);

      const request = createMockRequest(
        "http://localhost:3000/api/procurement/purchase-orders"
      );
      const response = await listOrders(request);

      expect(response.status).toBe(401);
    });
  });

  // ================================================================
  // GET /api/procurement/purchase-orders/[id] (detail)
  // ================================================================
  describe("GET /api/procurement/purchase-orders/[id] (detail)", () => {
    it("should return PO detail with items and vendor name", async () => {
      const mockPO = createMockPO();
      const mockVendor = { name: "Acme Supplies" };
      const mockItems = [
        {
          id: "poi-001",
          tenantId: TEST_TENANT_ID,
          purchaseOrderId: TEST_ORDER_ID,
          itemId: "inv-item-001",
          quantityOrdered: createMockDecimal(10),
          quantityReceived: createMockDecimal(0),
          unitId: 1,
          unitCost: createMockDecimal(10),
          totalCost: createMockDecimal(100),
          qualityStatus: null,
          discrepancyType: null,
          discrepancyAmount: null,
          notes: null,
          createdAt: new Date("2026-01-15"),
          updatedAt: new Date("2026-01-15"),
        },
      ];
      const mockInventoryItems = [
        {
          id: "inv-item-001",
          name: "Flour",
          item_number: "SKU-001",
          unitOfMeasure: "lb",
        },
      ];

      setupAuth();
      vi.mocked(database.purchaseOrder.findFirst).mockResolvedValue(
        mockPO as never
      );
      vi.mocked(database.inventorySupplier.findFirst).mockResolvedValue(
        mockVendor as never
      );
      vi.mocked(database.purchaseOrderItem.findMany).mockResolvedValue(
        mockItems as never
      );
      vi.mocked(database.inventoryItem.findMany).mockResolvedValue(
        mockInventoryItems as never
      );

      const request = createMockRequest(
        `http://localhost:3000/api/procurement/purchase-orders/${TEST_ORDER_ID}`
      );
      const response = await getOrder(request, {
        params: Promise.resolve({ id: TEST_ORDER_ID }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.order.id).toBe(TEST_ORDER_ID);
      expect(data.order.vendor_name).toBe("Acme Supplies");
      expect(data.items).toHaveLength(1);
      expect(data.items[0].item_name).toBe("Flour");
      expect(data.items[0].quantity_ordered).toBe(10);
    });

    it("should return 404 when PO not found", async () => {
      setupAuth();
      vi.mocked(database.purchaseOrder.findFirst).mockResolvedValue(
        null as never
      );

      const request = createMockRequest(
        `http://localhost:3000/api/procurement/purchase-orders/${TEST_ORDER_ID}`
      );
      const response = await getOrder(request, {
        params: Promise.resolve({ id: TEST_ORDER_ID }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.message).toBe("PO not found");
    });

    it("should enforce tenant isolation in detail query", async () => {
      setupAuth();
      vi.mocked(database.purchaseOrder.findFirst).mockResolvedValue(
        null as never
      );

      const request = createMockRequest(
        `http://localhost:3000/api/procurement/purchase-orders/${TEST_ORDER_ID}`
      );
      await getOrder(request, {
        params: Promise.resolve({ id: TEST_ORDER_ID }),
      });

      expect(database.purchaseOrder.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TEST_TENANT_ID,
            id: TEST_ORDER_ID,
          }),
        })
      );
    });
  });

  // ================================================================
  // POST /api/procurement/purchase-orders/commands/create
  // ================================================================
  describe("POST create purchase order", () => {
    it("should create a PO with line items", async () => {
      const createdPO = createMockPO({
        id: "new-po-001",
        poNumber: "PO-2026-0001",
        status: "submitted",
        subtotal: createMockDecimal(200),
        total: createMockDecimal(200),
      });

      setupAuth();
      vi.mocked(database.purchaseOrder.count).mockResolvedValue(0);
      vi.mocked(database.purchaseOrder.create).mockResolvedValue(
        createdPO as never
      );

      const body = {
        vendorId: TEST_VENDOR_ID,
        expectedDeliveryDate: "2026-02-01",
        items: [
          { itemId: "item-001", quantityOrdered: 10, unitCost: 10 },
          { itemId: "item-002", quantityOrdered: 5, unitCost: 20 },
        ],
      };

      const request = createMockRequest(
        "http://localhost:3000/api/procurement/purchase-orders/commands/create",
        { method: "POST", body: JSON.stringify(body) }
      );
      const response = await createOrder(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.order.po_number).toBe("PO-2026-0001");
      expect(data.order.status).toBe("submitted");

      // Verify create was called with tenantId
      expect(database.purchaseOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TEST_TENANT_ID,
            vendorId: TEST_VENDOR_ID,
          }),
        })
      );
    });

    it("should return 400 when vendorId is missing", async () => {
      setupAuth();

      const body = {
        items: [{ itemId: "item-001", quantityOrdered: 10, unitCost: 10 }],
      };

      const request = createMockRequest(
        "http://localhost:3000/api/procurement/purchase-orders/commands/create",
        { method: "POST", body: JSON.stringify(body) }
      );
      const response = await createOrder(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toBe("vendorId is required");
    });

    it("should return 400 when items array is empty", async () => {
      setupAuth();

      const body = {
        vendorId: TEST_VENDOR_ID,
        items: [],
      };

      const request = createMockRequest(
        "http://localhost:3000/api/procurement/purchase-orders/commands/create",
        { method: "POST", body: JSON.stringify(body) }
      );
      const response = await createOrder(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toBe("At least one item is required");
    });

    it("should return 400 when items is missing", async () => {
      setupAuth();

      const body = { vendorId: TEST_VENDOR_ID };

      const request = createMockRequest(
        "http://localhost:3000/api/procurement/purchase-orders/commands/create",
        { method: "POST", body: JSON.stringify(body) }
      );
      const response = await createOrder(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toBe("At least one item is required");
    });

    it("should generate sequential PO number", async () => {
      setupAuth();
      vi.mocked(database.purchaseOrder.count).mockResolvedValue(5);
      vi.mocked(database.purchaseOrder.create).mockResolvedValue(
        createMockPO() as never
      );

      const body = {
        vendorId: TEST_VENDOR_ID,
        items: [{ itemId: "item-001", quantityOrdered: 1, unitCost: 10 }],
      };

      const request = createMockRequest(
        "http://localhost:3000/api/procurement/purchase-orders/commands/create",
        { method: "POST", body: JSON.stringify(body) }
      );
      await createOrder(request);

      expect(database.purchaseOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            poNumber: `PO-${new Date().getFullYear()}-0006`,
          }),
        })
      );
    });

    it("should calculate subtotal from line items", async () => {
      setupAuth();
      vi.mocked(database.purchaseOrder.count).mockResolvedValue(0);
      vi.mocked(database.purchaseOrder.create).mockResolvedValue(
        createMockPO() as never
      );

      const body = {
        vendorId: TEST_VENDOR_ID,
        items: [
          { itemId: "item-001", quantityOrdered: 10, unitCost: 5 }, // 50
          { itemId: "item-002", quantityOrdered: 3, unitCost: 20 }, // 60
        ],
      };

      const request = createMockRequest(
        "http://localhost:3000/api/procurement/purchase-orders/commands/create",
        { method: "POST", body: JSON.stringify(body) }
      );
      await createOrder(request);

      expect(database.purchaseOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subtotal: 110, // 10*5 + 3*20
            total: 110,
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
        "http://localhost:3000/api/procurement/purchase-orders/commands/create",
        {
          method: "POST",
          body: JSON.stringify({ vendorId: TEST_VENDOR_ID, items: [] }),
        }
      );
      const response = await createOrder(request);

      expect(response.status).toBe(401);
    });
  });

  // ================================================================
  // POST /api/procurement/purchase-orders/commands/receive
  // ================================================================
  describe("POST receive purchase order items", () => {
    it("should receive items and update inventory", async () => {
      setupAuth();

      const mockPOItem = {
        id: "poi-001",
        tenantId: TEST_TENANT_ID,
        purchaseOrderId: TEST_ORDER_ID,
        itemId: "inv-item-001",
        quantityOrdered: createMockDecimal(10),
        quantityReceived: createMockDecimal(0),
      };

      // Mock transaction to execute the callback directly
      vi.mocked(database.$transaction).mockImplementation(
        async (fn: unknown) => {
          const tx = {
            purchaseOrderItem: {
              findFirst: vi.fn().mockResolvedValue(mockPOItem),
              update: vi.fn(),
              findMany: vi.fn().mockResolvedValue([
                {
                  quantityReceived: createMockDecimal(10),
                  quantityOrdered: createMockDecimal(10),
                },
              ]),
            },
            inventoryItem: {
              update: vi.fn(),
            },
            purchaseOrder: {
              update: vi.fn(),
            },
          };
          return (fn as (tx: unknown) => Promise<unknown>)(tx);
        }
      );

      const body = {
        orderId: TEST_ORDER_ID,
        items: [
          {
            itemId: "poi-001",
            quantityReceived: 10,
            quantityOrdered: 10,
          },
        ],
      };

      const request = createMockRequest(
        "http://localhost:3000/api/procurement/purchase-orders/commands/receive",
        { method: "POST", body: JSON.stringify(body) }
      );
      const response = await receiveOrder(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.allReceived).toBe(true);
    });

    it("should return 400 when orderId is missing", async () => {
      setupAuth();

      const body = { items: [{ itemId: "item-1", quantityReceived: 5 }] };
      const request = createMockRequest(
        "http://localhost:3000/api/procurement/purchase-orders/commands/receive",
        { method: "POST", body: JSON.stringify(body) }
      );
      const response = await receiveOrder(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toBe("orderId and items required");
    });

    it("should return 400 when items is empty", async () => {
      setupAuth();

      const body = { orderId: TEST_ORDER_ID, items: [] };
      const request = createMockRequest(
        "http://localhost:3000/api/procurement/purchase-orders/commands/receive",
        { method: "POST", body: JSON.stringify(body) }
      );
      const response = await receiveOrder(request);
      const data = await response.json();

      expect(response.status).toBe(400);
    });

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        orgId: null,
        userId: null,
      } as never);

      const request = createMockRequest(
        "http://localhost:3000/api/procurement/purchase-orders/commands/receive",
        {
          method: "POST",
          body: JSON.stringify({ orderId: TEST_ORDER_ID, items: [] }),
        }
      );
      const response = await receiveOrder(request);

      expect(response.status).toBe(401);
    });
  });

  // ================================================================
  // POST /api/procurement/purchase-orders/commands/update-status
  // ================================================================
  describe("POST update PO status", () => {
    it("should transition from submitted to approved", async () => {
      const updatedPO = createMockPO({ status: "approved" });
      setupAuth();
      vi.mocked(database.purchaseOrder.findFirst).mockResolvedValue({
        status: "submitted",
      } as never);
      vi.mocked(database.purchaseOrder.update).mockResolvedValue(
        updatedPO as never
      );

      const body = { orderId: TEST_ORDER_ID, status: "approved" };
      const request = createMockRequest(
        "http://localhost:3000/api/procurement/purchase-orders/commands/update-status",
        { method: "POST", body: JSON.stringify(body) }
      );
      const response = await updateStatus(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.order.status).toBe("approved");
    });

    it("should reject invalid status transition", async () => {
      setupAuth();
      vi.mocked(database.purchaseOrder.findFirst).mockResolvedValue({
        status: "received",
      } as never);

      const body = { orderId: TEST_ORDER_ID, status: "approved" };
      const request = createMockRequest(
        "http://localhost:3000/api/procurement/purchase-orders/commands/update-status",
        { method: "POST", body: JSON.stringify(body) }
      );
      const response = await updateStatus(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toContain("Cannot transition from received to approved");
    });

    it("should return 404 when PO not found", async () => {
      setupAuth();
      vi.mocked(database.purchaseOrder.findFirst).mockResolvedValue(
        null as never
      );

      const body = { orderId: TEST_ORDER_ID, status: "approved" };
      const request = createMockRequest(
        "http://localhost:3000/api/procurement/purchase-orders/commands/update-status",
        { method: "POST", body: JSON.stringify(body) }
      );
      const response = await updateStatus(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.message).toBe("PO not found");
    });

    it("should return 400 when orderId is missing", async () => {
      setupAuth();

      const body = { status: "approved" };
      const request = createMockRequest(
        "http://localhost:3000/api/procurement/purchase-orders/commands/update-status",
        { method: "POST", body: JSON.stringify(body) }
      );
      const response = await updateStatus(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toBe("orderId and status required");
    });

    it("should enforce tenant isolation in status update", async () => {
      setupAuth();
      vi.mocked(database.purchaseOrder.findFirst).mockResolvedValue(
        null as never
      );

      const body = { orderId: TEST_ORDER_ID, status: "approved" };
      const request = createMockRequest(
        "http://localhost:3000/api/procurement/purchase-orders/commands/update-status",
        { method: "POST", body: JSON.stringify(body) }
      );
      await updateStatus(request);

      expect(database.purchaseOrder.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TEST_TENANT_ID,
            id: TEST_ORDER_ID,
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
        "http://localhost:3000/api/procurement/purchase-orders/commands/update-status",
        {
          method: "POST",
          body: JSON.stringify({
            orderId: TEST_ORDER_ID,
            status: "approved",
          }),
        }
      );
      const response = await updateStatus(request);

      expect(response.status).toBe(401);
    });

    it("should allow all valid status transitions", async () => {
      const validTransitions = [
        { from: "draft", to: "submitted" },
        { from: "draft", to: "cancelled" },
        { from: "submitted", to: "approved" },
        { from: "submitted", to: "rejected" },
        { from: "submitted", to: "cancelled" },
        { from: "approved", to: "ordered" },
        { from: "approved", to: "cancelled" },
        { from: "ordered", to: "received" },
        { from: "ordered", to: "cancelled" },
      ];

      for (const { from, to } of validTransitions) {
        vi.clearAllMocks();
        setupAuth();
        vi.mocked(database.purchaseOrder.findFirst).mockResolvedValue({
          status: from,
        } as never);
        vi.mocked(database.purchaseOrder.update).mockResolvedValue(
          createMockPO({ status: to }) as never
        );

        const body = { orderId: TEST_ORDER_ID, status: to };
        const request = createMockRequest(
          "http://localhost:3000/api/procurement/purchase-orders/commands/update-status",
          { method: "POST", body: JSON.stringify(body) }
        );
        const response = await updateStatus(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.order.status).toBe(to);
      }
    });

    it("should reject all invalid status transitions from terminal states", async () => {
      const terminalStates = ["received", "cancelled", "rejected"];

      for (const state of terminalStates) {
        vi.clearAllMocks();
        setupAuth();
        vi.mocked(database.purchaseOrder.findFirst).mockResolvedValue({
          status: state,
        } as never);

        const body = { orderId: TEST_ORDER_ID, status: "approved" };
        const request = createMockRequest(
          "http://localhost:3000/api/procurement/purchase-orders/commands/update-status",
          { method: "POST", body: JSON.stringify(body) }
        );
        const response = await updateStatus(request);

        expect(response.status).toBe(400);
      }
    });
  });
});
