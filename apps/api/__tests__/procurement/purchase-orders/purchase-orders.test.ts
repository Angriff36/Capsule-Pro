/**
 * Procurement Purchase Orders API Tests
 *
 * Why these tests matter: The /api/procurement/purchase-orders routes are the
 * primary integration surface for the procurement UI (list, detail, new PO,
 * receive items, status transitions). Several routes still use $queryRaw for
 * INSERTs/UPDATEs against tenant_inventory.purchase_orders[_items], so coverage
 * here proves:
 *   1. Auth and tenant isolation work on every endpoint.
 *   2. The list/detail routes shape Prisma rows into the legacy snake_case
 *      response the UI consumes (po_number, vendor_name, item_count, etc.).
 *   3. The state-transition guard in update-status enforces the documented
 *      VALID_TRANSITIONS map (draft→submitted, etc.) and rejects illegal jumps.
 *   4. The receive route flips the PO to "received" only when every line item
 *      is fully received, and increments inventory_on_hand for received items.
 *
 * These routes are critical to procurement workflow — a regression here would
 * either let a PO close prematurely (inventory drift) or block a valid
 * transition (operations halt). The tests run against the shared database
 * mock; routes that issue raw SQL are exercised through database.$queryRaw.
 */

import { database } from "@repo/database";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// The global vitest setup (test/setup.ts + test/mocks/@repo/database.ts)
// provides a full database mock with all models including inventorySupplier,
// inventoryItem, purchaseOrder, purchaseOrderItem, etc. We only need to mock
// auth and response helpers here.
// ---------------------------------------------------------------------------

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));

// Mock runManifestCommand for tests that go through the generic dispatcher.
// Individual tests override this with vi.doMock when they need specific behavior.
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

import { auth } from "@repo/auth/server";
import { getTenantIdForOrg, requireCurrentUser, resolveCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";

// Minimal Decimal stand-in for mocking Prisma Decimal return values
// (the receive route calls .lt() and .gt() on quantityReceived/quantityOrdered)
class TestDecimal {
  value: number;
  constructor(v: string | number) {
    this.value = Number(v);
  }
  toString() {
    return String(this.value);
  }
  gt(other: unknown) {
    return this.value > Number(other);
  }
  lt(other: unknown) {
    return this.value < Number(other);
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TEST_TENANT_ID = "00000000-0000-0000-0000-000000000010";
const TEST_ORG_ID = "org_proc_po_test";
const TEST_USER_ID = "user_proc_po_test";
const PO_ID = "00000000-0000-0000-0000-000000000a01";
const VENDOR_ID = "00000000-0000-0000-0000-000000000b01";
const LOCATION_ID = "00000000-0000-0000-0000-000000000c01";
const ITEM_ID = "00000000-0000-0000-0000-000000000d01";
const POI_ID = "00000000-0000-0000-0000-000000000e01";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function authOk() {
  vi.mocked(auth).mockResolvedValue({
    userId: TEST_USER_ID,
    orgId: TEST_ORG_ID,
  } as never);
  vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
  vi.mocked(requireCurrentUser).mockResolvedValue({
    id: TEST_USER_ID,
    tenantId: TEST_TENANT_ID,
    role: "admin",
  } as never);
  vi.mocked(resolveCurrentUser).mockResolvedValue({
    id: TEST_USER_ID,
    tenantId: TEST_TENANT_ID,
    role: "admin",
  } as never);
}

function authMissing() {
  vi.mocked(auth).mockResolvedValue({ userId: null, orgId: null } as never);
  // Generic dispatcher uses requireCurrentUser which throws InvariantError
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

function noTenant() {
  vi.mocked(auth).mockResolvedValue({
    userId: TEST_USER_ID,
    orgId: TEST_ORG_ID,
  } as never);
  vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);
}

function makeRequest(
  url: string,
  init: { method?: string; body?: unknown } = {}
): NextRequest {
  const headers: Record<string, string> = {};
  let body: BodyInit | undefined;
  if (init.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(init.body);
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method: init.method ?? (body ? "POST" : "GET"),
    headers,
    body,
  } as ConstructorParameters<typeof NextRequest>[1]);
}

// Helper to create manifest dispatcher params
function manifestParams(entity: string, command: string) {
  return { params: Promise.resolve({ entity, command }) };
}

function makePO(overrides: Record<string, unknown> = {}) {
  return {
    id: PO_ID,
    tenantId: TEST_TENANT_ID,
    poNumber: "PO-2026-0001",
    vendorId: VENDOR_ID,
    locationId: LOCATION_ID,
    orderDate: new Date("2026-01-15"),
    expectedDeliveryDate: new Date("2026-01-22"),
    actualDeliveryDate: null,
    status: "submitted",
    subtotal: 1000,
    taxAmount: 0,
    shippingAmount: 0,
    total: 1000,
    notes: null,
    submittedBy: TEST_USER_ID,
    submittedAt: new Date("2026-01-15"),
    receivedBy: null,
    receivedAt: null,
    createdAt: new Date("2026-01-15"),
    updatedAt: new Date("2026-01-15"),
    deletedAt: null,
    items: [
      {
        quantityOrdered: 10,
        quantityReceived: 0,
      },
    ],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Procurement Purchase Orders API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // -------------------------------------------------------------------------
  // GET /api/procurement/purchase-orders/list
  // -------------------------------------------------------------------------
  describe("GET /list", () => {
    it("returns 401 when unauthenticated", async () => {
      authMissing();
      const { GET } = await import(
        "@/app/api/procurement/purchase-orders/list/route"
      );
      const res = await GET(
        makeRequest("http://localhost/api/procurement/purchase-orders/list")
      );
      expect(res.status).toBe(401);
    });

    it("returns 400 when tenant cannot be resolved", async () => {
      noTenant();
      const { GET } = await import(
        "@/app/api/procurement/purchase-orders/list/route"
      );
      const res = await GET(
        makeRequest("http://localhost/api/procurement/purchase-orders/list")
      );
      expect(res.status).toBe(400);
    });

    it("returns shaped POs with vendor_name, item_count, and pending_items", async () => {
      authOk();
      const po = makePO({
        items: [
          { quantityOrdered: 10, quantityReceived: 4 },
          { quantityOrdered: 5, quantityReceived: 5 },
        ],
      });
      vi.mocked(database.purchaseOrder.findMany).mockResolvedValue([
        po,
      ] as never);
      vi.mocked(database.inventorySupplier.findMany).mockResolvedValue([
        { id: VENDOR_ID, name: "Acme Foods" },
      ] as never);

      const { GET } = await import(
        "@/app/api/procurement/purchase-orders/list/route"
      );
      const res = await GET(
        makeRequest("http://localhost/api/procurement/purchase-orders/list")
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.orders).toHaveLength(1);
      expect(body.orders[0]).toMatchObject({
        id: PO_ID,
        po_number: "PO-2026-0001",
        vendor_id: VENDOR_ID,
        vendor_name: "Acme Foods",
        item_count: 2,
        pending_items: 1, // one line still pending (4/10 received)
        status: "submitted",
      });
    });

    it("filters by status when ?status=approved is provided", async () => {
      authOk();
      vi.mocked(database.purchaseOrder.findMany).mockResolvedValue([] as never);
      vi.mocked(database.inventorySupplier.findMany).mockResolvedValue(
        [] as never
      );

      const { GET } = await import(
        "@/app/api/procurement/purchase-orders/list/route"
      );
      await GET(
        makeRequest(
          "http://localhost/api/procurement/purchase-orders/list?status=approved"
        )
      );

      expect(database.purchaseOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TEST_TENANT_ID,
            deletedAt: null,
            status: "approved",
          }),
        })
      );
    });

    it("does NOT filter by status when ?status=all is passed", async () => {
      authOk();
      vi.mocked(database.purchaseOrder.findMany).mockResolvedValue([] as never);
      vi.mocked(database.inventorySupplier.findMany).mockResolvedValue(
        [] as never
      );

      const { GET } = await import(
        "@/app/api/procurement/purchase-orders/list/route"
      );
      await GET(
        makeRequest(
          "http://localhost/api/procurement/purchase-orders/list?status=all"
        )
      );

      const call = vi.mocked(database.purchaseOrder.findMany).mock
        .calls[0]?.[0];
      expect(call?.where).not.toHaveProperty("status");
    });

    it("excludes soft-deleted POs (deletedAt: null filter)", async () => {
      authOk();
      vi.mocked(database.purchaseOrder.findMany).mockResolvedValue([] as never);
      vi.mocked(database.inventorySupplier.findMany).mockResolvedValue(
        [] as never
      );

      const { GET } = await import(
        "@/app/api/procurement/purchase-orders/list/route"
      );
      await GET(
        makeRequest("http://localhost/api/procurement/purchase-orders/list")
      );

      expect(database.purchaseOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deletedAt: null }),
        })
      );
    });

    it("returns 500 with sanitized message on database error", async () => {
      authOk();
      vi.mocked(database.purchaseOrder.findMany).mockRejectedValue(
        new Error("connection lost")
      );
      const { GET } = await import(
        "@/app/api/procurement/purchase-orders/list/route"
      );
      const res = await GET(
        makeRequest("http://localhost/api/procurement/purchase-orders/list")
      );
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.message).toBe("Internal server error");
    });

    it("returns vendor_name: null when vendor lookup misses", async () => {
      authOk();
      vi.mocked(database.purchaseOrder.findMany).mockResolvedValue([
        makePO(),
      ] as never);
      vi.mocked(database.inventorySupplier.findMany).mockResolvedValue(
        [] as never
      );

      const { GET } = await import(
        "@/app/api/procurement/purchase-orders/list/route"
      );
      const res = await GET(
        makeRequest("http://localhost/api/procurement/purchase-orders/list")
      );
      const body = await res.json();
      expect(body.orders[0].vendor_name).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // GET /api/procurement/purchase-orders/[id]
  // -------------------------------------------------------------------------
  describe("GET /[id]", () => {
    it("returns 401 when unauthenticated", async () => {
      authMissing();
      const { GET } = await import(
        "@/app/api/procurement/purchase-orders/[id]/route"
      );
      const res = await GET(
        makeRequest(
          `http://localhost/api/procurement/purchase-orders/${PO_ID}`
        ),
        { params: Promise.resolve({ id: PO_ID }) }
      );
      expect(res.status).toBe(401);
    });

    it("returns 404 when PO does not exist", async () => {
      authOk();
      vi.mocked(database.purchaseOrder.findFirst).mockResolvedValue(
        null as never
      );

      const { GET } = await import(
        "@/app/api/procurement/purchase-orders/[id]/route"
      );
      const res = await GET(
        makeRequest(
          `http://localhost/api/procurement/purchase-orders/${PO_ID}`
        ),
        { params: Promise.resolve({ id: PO_ID }) }
      );
      expect(res.status).toBe(404);
    });

    it("returns the PO with vendorName, items, and item enrichment", async () => {
      authOk();
      const po = makePO({ items: undefined });
      vi.mocked(database.purchaseOrder.findFirst).mockResolvedValue(
        po as never
      );
      vi.mocked(database.inventorySupplier.findFirst).mockResolvedValue({
        name: "Acme Foods",
      } as never);
      vi.mocked(database.purchaseOrderItem.findMany).mockResolvedValue([
        {
          id: POI_ID,
          tenantId: TEST_TENANT_ID,
          purchaseOrderId: PO_ID,
          itemId: ITEM_ID,
          quantityOrdered: 10,
          quantityReceived: 0,
          unitId: 1,
          unitCost: 5,
          totalCost: 50,
          qualityStatus: "pending",
          notes: null,
          deletedAt: null,
          createdAt: new Date("2026-01-15"),
        },
      ] as never);
      vi.mocked(database.inventoryItem.findMany).mockResolvedValue([
        {
          id: ITEM_ID,
          name: "Olive Oil 1L",
          item_number: "OO-1L",
          unitOfMeasure: "bottle",
        },
      ] as never);

      const { GET } = await import(
        "@/app/api/procurement/purchase-orders/[id]/route"
      );
      const res = await GET(
        makeRequest(
          `http://localhost/api/procurement/purchase-orders/${PO_ID}`
        ),
        { params: Promise.resolve({ id: PO_ID }) }
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.order.vendorName).toBe("Acme Foods");
      expect(body.items).toHaveLength(1);
      expect(body.items[0].itemName).toBe("Olive Oil 1L");
      expect(body.items[0].itemNumber).toBe("OO-1L");
      expect(body.items[0].unitOfMeasure).toBe("bottle");
    });

    it("returns vendorName: null when PO has no vendorId", async () => {
      authOk();
      const po = makePO({ vendorId: null, items: undefined });
      vi.mocked(database.purchaseOrder.findFirst).mockResolvedValue(
        po as never
      );
      vi.mocked(database.purchaseOrderItem.findMany).mockResolvedValue(
        [] as never
      );
      vi.mocked(database.inventoryItem.findMany).mockResolvedValue([] as never);

      const { GET } = await import(
        "@/app/api/procurement/purchase-orders/[id]/route"
      );
      const res = await GET(
        makeRequest(
          `http://localhost/api/procurement/purchase-orders/${PO_ID}`
        ),
        { params: Promise.resolve({ id: PO_ID }) }
      );
      const body = await res.json();
      expect(body.order.vendorName).toBeNull();
      expect(database.inventorySupplier.findFirst).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // POST /api/procurement/purchase-orders/commands/create
  // Create has no concrete route -- goes through the generic dispatcher.
  // -------------------------------------------------------------------------
  describe("POST /commands/create", () => {
    it("returns 401 when unauthenticated", async () => {
      authMissing();
      const { POST } = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
      );
      const res = await POST(
        makeRequest(
          "http://localhost/api/manifest/[entity]/commands/[command]",
          { body: { vendorId: VENDOR_ID, items: [{}] } }
        ),
        manifestParams("PurchaseOrder", "create")
      );
      expect(res.status).toBe(401);
    });

    it("returns 400 when vendorId is missing (via command guard)", async () => {
      authOk();
      vi.mocked(runManifestCommand).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: false, message: "vendorId is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        )
      );
      const { POST } = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
      );
      const res = await POST(
        makeRequest(
          "http://localhost/api/manifest/[entity]/commands/[command]",
          {
            body: {
              items: [
                { itemId: ITEM_ID, quantityOrdered: 1, unitCost: 1, unitId: 1 },
              ],
            },
          }
        ),
        manifestParams("PurchaseOrder", "create")
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.message).toMatch(/vendorId/i);
    });

    it("returns 400 when items array is empty (via command guard)", async () => {
      authOk();
      vi.mocked(runManifestCommand).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: false, message: "items are required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        )
      );
      const { POST } = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
      );
      const res = await POST(
        makeRequest(
          "http://localhost/api/manifest/[entity]/commands/[command]",
          { body: { vendorId: VENDOR_ID, items: [] } }
        ),
        manifestParams("PurchaseOrder", "create")
      );
      expect(res.status).toBe(400);
    });

    it("delegates to runManifestCommand and returns the result", async () => {
      authOk();
      vi.mocked(runManifestCommand).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            result: {
              id: PO_ID,
              poNumber: "PO-2026-0006",
              status: "submitted",
              subtotal: 30,
              total: 30,
            },
            events: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );
      const { POST } = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
      );
      const res = await POST(
        makeRequest(
          "http://localhost/api/manifest/[entity]/commands/[command]",
          {
            body: {
              vendorId: VENDOR_ID,
              locationId: LOCATION_ID,
              expectedDeliveryDate: "2026-02-01",
              notes: "rush",
              items: [
                { itemId: ITEM_ID, quantityOrdered: 2, unitCost: 5, unitId: 1 },
                { itemId: ITEM_ID, quantityOrdered: 4, unitCost: 5, unitId: 1 },
              ],
            },
          }
        ),
        manifestParams("PurchaseOrder", "create")
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });

    it("returns 500 when runManifestCommand throws", async () => {
      authOk();
      vi.mocked(runManifestCommand).mockRejectedValueOnce(new Error("runtime error"));
      const { POST } = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
      );
      const res = await POST(
        makeRequest(
          "http://localhost/api/manifest/[entity]/commands/[command]",
          {
            body: {
              vendorId: VENDOR_ID,
              items: [
                { itemId: ITEM_ID, quantityOrdered: 1, unitCost: 1, unitId: 1 },
              ],
            },
          }
        ),
        manifestParams("PurchaseOrder", "create")
      );
      expect(res.status).toBe(500);
    });
  });

  // -------------------------------------------------------------------------
  // POST /api/procurement/purchase-orders/commands/update-status
  // This route has a concrete implementation that validates transitions
  // via $queryRaw and delegates the governed mutation to runManifestCommand.
  // -------------------------------------------------------------------------
  describe("POST /commands/update-status (state machine)", () => {
    it("returns 401 when unauthenticated", async () => {
      authMissing();
      const { POST } = await import(
        "@/app/api/procurement/purchase-orders/commands/update-status/route"
      );
      const res = await POST(
        makeRequest(
          "http://localhost/api/procurement/purchase-orders/commands/update-status",
          { body: { orderId: PO_ID, status: "approved" } }
        )
      );
      expect(res.status).toBe(401);
    });

    it("returns 400 when orderId or status missing", async () => {
      authOk();
      const { POST } = await import(
        "@/app/api/procurement/purchase-orders/commands/update-status/route"
      );
      const res = await POST(
        makeRequest(
          "http://localhost/api/procurement/purchase-orders/commands/update-status",
          { body: { orderId: PO_ID } }
        )
      );
      expect(res.status).toBe(400);
    });

    it("returns 404 when PO not found", async () => {
      authOk();
      const queryRaw = vi.mocked(database.$queryRaw);
      queryRaw.mockReset();
      queryRaw.mockResolvedValueOnce([]); // current status query → empty

      const { POST } = await import(
        "@/app/api/procurement/purchase-orders/commands/update-status/route"
      );
      const res = await POST(
        makeRequest(
          "http://localhost/api/procurement/purchase-orders/commands/update-status",
          { body: { orderId: PO_ID, status: "approved" } }
        )
      );
      expect(res.status).toBe(404);
    });

    it("rejects illegal transitions (e.g. received → ordered)", async () => {
      authOk();
      const queryRaw = vi.mocked(database.$queryRaw);
      queryRaw.mockReset();
      queryRaw.mockResolvedValueOnce([{ status: "received" }]);

      const { POST } = await import(
        "@/app/api/procurement/purchase-orders/commands/update-status/route"
      );
      const res = await POST(
        makeRequest(
          "http://localhost/api/procurement/purchase-orders/commands/update-status",
          { body: { orderId: PO_ID, status: "ordered" } }
        )
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.message).toMatch(
        /Cannot transition from received to ordered/
      );
    });

    it("rejects illegal transitions (draft → received)", async () => {
      authOk();
      const queryRaw = vi.mocked(database.$queryRaw);
      queryRaw.mockReset();
      queryRaw.mockResolvedValueOnce([{ status: "draft" }]);

      const { POST } = await import(
        "@/app/api/procurement/purchase-orders/commands/update-status/route"
      );
      const res = await POST(
        makeRequest(
          "http://localhost/api/procurement/purchase-orders/commands/update-status",
          { body: { orderId: PO_ID, status: "received" } }
        )
      );
      expect(res.status).toBe(400);
    });

    it("allows draft → submitted", async () => {
      authOk();
      const queryRaw = vi.mocked(database.$queryRaw);
      queryRaw.mockReset();
      queryRaw
        .mockResolvedValueOnce([{ status: "draft" }]) // current
        .mockResolvedValueOnce([
          { id: PO_ID, po_number: "PO-2026-0001", status: "submitted" },
        ]); // update RETURNING

      // Mock runManifestCommand for the governed mutation
      vi.mocked(runManifestCommand).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: true, result: { id: PO_ID }, events: [] }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

      // Mock the final read of the updated PO
      vi.mocked(database.purchaseOrder.findFirst).mockResolvedValue({
        id: PO_ID,
        poNumber: "PO-2026-0001",
        status: "submitted",
      } as never);

      const { POST } = await import(
        "@/app/api/procurement/purchase-orders/commands/update-status/route"
      );
      const res = await POST(
        makeRequest(
          "http://localhost/api/procurement/purchase-orders/commands/update-status",
          { body: { orderId: PO_ID, status: "submitted" } }
        )
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.order.status).toBe("submitted");
    });

    it("allows submitted → approved", async () => {
      authOk();
      const queryRaw = vi.mocked(database.$queryRaw);
      queryRaw.mockReset();
      queryRaw
        .mockResolvedValueOnce([{ status: "submitted" }])
        .mockResolvedValueOnce([
          { id: PO_ID, po_number: "PO-2026-0001", status: "approved" },
        ]);

      vi.mocked(runManifestCommand).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: true, result: { id: PO_ID }, events: [] }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

      vi.mocked(database.purchaseOrder.findFirst).mockResolvedValue({
        id: PO_ID,
        poNumber: "PO-2026-0001",
        status: "approved",
      } as never);

      const { POST } = await import(
        "@/app/api/procurement/purchase-orders/commands/update-status/route"
      );
      const res = await POST(
        makeRequest(
          "http://localhost/api/procurement/purchase-orders/commands/update-status",
          { body: { orderId: PO_ID, status: "approved" } }
        )
      );
      expect(res.status).toBe(200);
    });

    it("allows submitted → rejected", async () => {
      authOk();
      const queryRaw = vi.mocked(database.$queryRaw);
      queryRaw.mockReset();
      queryRaw
        .mockResolvedValueOnce([{ status: "submitted" }])
        .mockResolvedValueOnce([
          { id: PO_ID, po_number: "PO-2026-0001", status: "rejected" },
        ]);

      vi.mocked(runManifestCommand).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: true, result: { id: PO_ID }, events: [] }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

      vi.mocked(database.purchaseOrder.findFirst).mockResolvedValue({
        id: PO_ID,
        poNumber: "PO-2026-0001",
        status: "rejected",
      } as never);

      const { POST } = await import(
        "@/app/api/procurement/purchase-orders/commands/update-status/route"
      );
      const res = await POST(
        makeRequest(
          "http://localhost/api/procurement/purchase-orders/commands/update-status",
          { body: { orderId: PO_ID, status: "rejected" } }
        )
      );
      expect(res.status).toBe(200);
    });

    it("allows approved → ordered", async () => {
      authOk();
      const queryRaw = vi.mocked(database.$queryRaw);
      queryRaw.mockReset();
      queryRaw
        .mockResolvedValueOnce([{ status: "approved" }])
        .mockResolvedValueOnce([
          { id: PO_ID, po_number: "PO-2026-0001", status: "ordered" },
        ]);

      vi.mocked(runManifestCommand).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: true, result: { id: PO_ID }, events: [] }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

      vi.mocked(database.purchaseOrder.findFirst).mockResolvedValue({
        id: PO_ID,
        poNumber: "PO-2026-0001",
        status: "ordered",
      } as never);

      const { POST } = await import(
        "@/app/api/procurement/purchase-orders/commands/update-status/route"
      );
      const res = await POST(
        makeRequest(
          "http://localhost/api/procurement/purchase-orders/commands/update-status",
          { body: { orderId: PO_ID, status: "ordered" } }
        )
      );
      expect(res.status).toBe(200);
    });

    it("treats cancelled and rejected as terminal (no further transitions)", async () => {
      authOk();
      const queryRaw = vi.mocked(database.$queryRaw);
      queryRaw.mockReset();
      queryRaw.mockResolvedValueOnce([{ status: "cancelled" }]);

      const { POST } = await import(
        "@/app/api/procurement/purchase-orders/commands/update-status/route"
      );
      const res = await POST(
        makeRequest(
          "http://localhost/api/procurement/purchase-orders/commands/update-status",
          { body: { orderId: PO_ID, status: "approved" } }
        )
      );
      expect(res.status).toBe(400);
    });

    it("returns 500 when the read after command throws", async () => {
      authOk();
      const queryRaw = vi.mocked(database.$queryRaw);
      queryRaw.mockReset();
      queryRaw.mockResolvedValueOnce([{ status: "draft" }]);

      vi.mocked(runManifestCommand).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: true, result: { id: PO_ID }, events: [] }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

      // The final purchaseOrder.findFirst call throws
      vi.mocked(database.purchaseOrder.findFirst).mockRejectedValue(new Error("db error") as never);

      const { POST } = await import(
        "@/app/api/procurement/purchase-orders/commands/update-status/route"
      );
      const res = await POST(
        makeRequest(
          "http://localhost/api/procurement/purchase-orders/commands/update-status",
          { body: { orderId: PO_ID, status: "submitted" } }
        )
      );
      expect(res.status).toBe(500);
    });
  });

  // -------------------------------------------------------------------------
  // POST /api/procurement/purchase-orders/commands/receive
  // This route has a concrete implementation using Prisma $transaction.
  // -------------------------------------------------------------------------
  describe("POST /commands/receive", () => {
    it("returns 401 when unauthenticated", async () => {
      authMissing();
      const { POST } = await import(
        "@/app/api/procurement/purchase-orders/commands/receive/route"
      );
      const res = await POST(
        makeRequest(
          "http://localhost/api/procurement/purchase-orders/commands/receive",
          { body: { orderId: PO_ID, items: [{ itemId: POI_ID }] } }
        )
      );
      expect(res.status).toBe(401);
    });

    it("returns 400 when orderId or items missing", async () => {
      authOk();
      const { POST } = await import(
        "@/app/api/procurement/purchase-orders/commands/receive/route"
      );
      const res = await POST(
        makeRequest(
          "http://localhost/api/procurement/purchase-orders/commands/receive",
          { body: { orderId: PO_ID } }
        )
      );
      expect(res.status).toBe(400);
    });

    it("returns allReceived: false when some items are still partial", async () => {
      authOk();

      // Mock $transaction to execute the callback with the database mock
      vi.mocked(database.$transaction).mockImplementation(async (fn: any) =>
        fn(database)
      );

      // Mock purchaseOrderItem.updateMany (quality partial)
      vi.mocked(database.purchaseOrderItem.updateMany).mockResolvedValue({ count: 1 } as never);
      // Mock purchaseOrderItem.findUnique (returns the item with its inventory itemId)
      vi.mocked(database.purchaseOrderItem.findUnique).mockResolvedValue({
        itemId: ITEM_ID,
      } as never);
      // Mock inventoryItem.updateMany (increment)
      vi.mocked(database.inventoryItem.updateMany).mockResolvedValue({ count: 1 } as never);
      // Mock purchaseOrderItem.findMany for remaining check — Prisma returns Decimal objects
      // with .lt() method, so we use TestDecimal instances
      vi.mocked(database.purchaseOrderItem.findMany).mockResolvedValue([
        { quantityReceived: new TestDecimal(4), quantityOrdered: new TestDecimal(10) },
        { quantityReceived: new TestDecimal(5), quantityOrdered: new TestDecimal(5) },
      ] as never);

      const { POST } = await import(
        "@/app/api/procurement/purchase-orders/commands/receive/route"
      );
      const res = await POST(
        makeRequest(
          "http://localhost/api/procurement/purchase-orders/commands/receive",
          {
            body: {
              orderId: PO_ID,
              items: [
                { itemId: POI_ID, quantityOrdered: 10, quantityReceived: 4 },
              ],
            },
          }
        )
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.allReceived).toBe(false);
    });

    it("returns allReceived: true and marks PO received when every item is full", async () => {
      authOk();

      vi.mocked(database.$transaction).mockImplementation(async (fn: any) =>
        fn(database)
      );

      vi.mocked(database.purchaseOrderItem.updateMany).mockResolvedValue({ count: 1 } as never);
      vi.mocked(database.purchaseOrderItem.findUnique).mockResolvedValue({
        itemId: ITEM_ID,
      } as never);
      vi.mocked(database.inventoryItem.updateMany).mockResolvedValue({ count: 1 } as never);
      // All items fully received → remaining = 0
      vi.mocked(database.purchaseOrderItem.findMany).mockResolvedValue([
        { quantityReceived: new TestDecimal(10), quantityOrdered: new TestDecimal(10) },
      ] as never);
      // Mock PO update to received
      vi.mocked(database.purchaseOrder.update).mockResolvedValue({ id: PO_ID } as never);

      const { POST } = await import(
        "@/app/api/procurement/purchase-orders/commands/receive/route"
      );
      const res = await POST(
        makeRequest(
          "http://localhost/api/procurement/purchase-orders/commands/receive",
          {
            body: {
              orderId: PO_ID,
              items: [
                { itemId: POI_ID, quantityOrdered: 10, quantityReceived: 10 },
              ],
            },
          }
        )
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.allReceived).toBe(true);
      // Verify PO was updated to received
      expect(database.purchaseOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "received" }),
        })
      );
    });

    it("skips inventory update when quantityReceived is zero", async () => {
      authOk();

      vi.mocked(database.$transaction).mockImplementation(async (fn: any) =>
        fn(database)
      );

      // qty=0 → route skips inventory increment
      vi.mocked(database.purchaseOrderItem.updateMany).mockResolvedValue({ count: 1 } as never);
      vi.mocked(database.purchaseOrderItem.findMany).mockResolvedValue([
        { quantityReceived: new TestDecimal(0), quantityOrdered: new TestDecimal(10) },
      ] as never);

      const { POST } = await import(
        "@/app/api/procurement/purchase-orders/commands/receive/route"
      );
      const res = await POST(
        makeRequest(
          "http://localhost/api/procurement/purchase-orders/commands/receive",
          {
            body: {
              orderId: PO_ID,
              items: [
                { itemId: POI_ID, quantityOrdered: 10, quantityReceived: 0 },
              ],
            },
          }
        )
      );
      expect(res.status).toBe(200);
      // inventoryItem.updateMany should NOT have been called (qty=0 skips it)
      expect(database.inventoryItem.updateMany).not.toHaveBeenCalled();
    });

    it("skips items with missing itemId or null quantityReceived", async () => {
      authOk();

      vi.mocked(database.$transaction).mockImplementation(async (fn: any) =>
        fn(database)
      );

      // Both items will be skipped (missing itemId, null qty)
      vi.mocked(database.purchaseOrderItem.findMany).mockResolvedValue([] as never);

      const { POST } = await import(
        "@/app/api/procurement/purchase-orders/commands/receive/route"
      );
      const res = await POST(
        makeRequest(
          "http://localhost/api/procurement/purchase-orders/commands/receive",
          {
            body: {
              orderId: PO_ID,
              items: [
                { quantityReceived: 5 }, // missing itemId
                { itemId: POI_ID, quantityReceived: null }, // null qty
              ],
            },
          }
        )
      );
      expect(res.status).toBe(200);
    });

    it("returns 500 on database error", async () => {
      authOk();

      vi.mocked(database.$transaction).mockRejectedValue(new Error("db error"));

      const { POST } = await import(
        "@/app/api/procurement/purchase-orders/commands/receive/route"
      );
      const res = await POST(
        makeRequest(
          "http://localhost/api/procurement/purchase-orders/commands/receive",
          {
            body: {
              orderId: PO_ID,
              items: [
                { itemId: POI_ID, quantityOrdered: 10, quantityReceived: 4 },
              ],
            },
          }
        )
      );
      expect(res.status).toBe(500);
    });
  });
});
