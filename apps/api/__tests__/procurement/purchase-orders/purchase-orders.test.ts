/**
 * Procurement Purchase Orders API Tests
 *
 * Why these tests matter: The /api/procurement/purchase-orders routes are the
 * primary integration surface for the procurement UI (list, detail, new PO,
 * receive items, status transitions).
 *
 * These routes are critical to procurement workflow — a regression here would
 * either let a PO close prematurely (inventory drift) or block a valid
 * transition (operations halt). The tests run against the shared database
 * mock; routes that use manifest commands exercise the runtime mock.
 */

import { database } from "@repo/database";
import { InvariantError } from "@/app/lib/invariant";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  requireCurrentUser: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@/lib/database", async () => {
  const mod =
    await vi.importActual<typeof import("@repo/database")>("@repo/database");
  return mod;
});
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

import { auth } from "@repo/auth/server";
import { getTenantIdForOrg, requireCurrentUser } from "@/app/lib/tenant";
import { createManifestRuntime } from "@/lib/manifest-runtime";

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
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
  } as never);
  vi.mocked(createManifestRuntime).mockResolvedValue({
    runCommand: vi.fn().mockResolvedValue({ success: true }),
  } as never);
}

function authMissing() {
  vi.mocked(auth).mockResolvedValue({ userId: null, orgId: null } as never);
  vi.mocked(requireCurrentUser).mockRejectedValue(
    new InvariantError("auth.orgId must exist") as never
  );
}

function noTenant() {
  vi.mocked(auth).mockResolvedValue({
    userId: TEST_USER_ID,
    orgId: TEST_ORG_ID,
  } as never);
  vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);
  vi.mocked(requireCurrentUser).mockRejectedValue(
    new InvariantError("auth.orgId must exist") as never
  );
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

// ---------------------------------------------------------------------------
// Command test helpers
// ---------------------------------------------------------------------------

const routePath = "@/app/api/manifest/[entity]/commands/[command]/route";

async function runCommand(entity: string, command: string, body: unknown = {}) {
  const mod = await import(routePath);
  return mod.POST(
    makeRequest(
      "http://localhost/api/manifest/[entity]/commands/[command]",
      { body }
    ),
    {
      params: Promise.resolve({ entity, command }),
    }
  );
}

function mockRuntimeSuccess(result: unknown) {
  vi.mocked(createManifestRuntime).mockResolvedValue({
    runCommand: vi.fn().mockResolvedValue({
      success: true,
      result,
      emittedEvents: [],
    }),
  } as never);
}

function mockRuntimeGuardFailure(message: string) {
  vi.mocked(createManifestRuntime).mockResolvedValue({
    runCommand: vi.fn().mockResolvedValue({
      success: false,
      guardFailure: { index: 0, formatted: message },
    }),
  } as never);
}

function mockRuntimeError(message: string) {
  vi.mocked(createManifestRuntime).mockResolvedValue({
    runCommand: vi.fn().mockResolvedValue({
      success: false,
      error: message,
    }),
  } as never);
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
  // -------------------------------------------------------------------------
  describe("POST /commands/create", () => {
    it("returns 401 when unauthenticated", async () => {
      authMissing();
      const res = await runCommand(
        "PurchaseOrder",
        "create",
        { vendorId: VENDOR_ID, items: [{}] }
      );
      expect(res.status).toBe(401);
    });

    it("returns 422 when vendorId is missing", async () => {
      authOk();
      mockRuntimeGuardFailure("Vendor ID is required");
      const res = await runCommand("PurchaseOrder", "create", {
        items: [{ itemId: ITEM_ID, quantityOrdered: 1, unitCost: 1, unitId: 1 }],
      });
      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.message).toMatch(/required/i);
    });

    it("returns 422 when items array is empty", async () => {
      authOk();
      mockRuntimeGuardFailure("Items are required");
      const res = await runCommand("PurchaseOrder", "create", {
        vendorId: VENDOR_ID,
        items: [],
      });
      expect(res.status).toBe(422);
    });

    it("returns 200 on successful create", async () => {
      authOk();
      mockRuntimeSuccess({
        id: PO_ID,
        po_number: "PO-2026-0006",
        status: "submitted",
      });
      const res = await runCommand("PurchaseOrder", "create", {
        vendorId: VENDOR_ID,
        locationId: LOCATION_ID,
        expectedDeliveryDate: "2026-02-01",
        notes: "rush",
        items: [
          { itemId: ITEM_ID, quantityOrdered: 2, unitCost: 5, unitId: 1 },
          { itemId: ITEM_ID, quantityOrdered: 4, unitCost: 5, unitId: 1 },
        ],
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.result.po_number).toBe("PO-2026-0006");
    });

    it("returns 400 when runtime returns error", async () => {
      authOk();
      mockRuntimeError("Database error");
      const res = await runCommand("PurchaseOrder", "create", {
        vendorId: VENDOR_ID,
        items: [{ itemId: ITEM_ID, quantityOrdered: 1, unitCost: 1, unitId: 1 }],
      });
      expect(res.status).toBe(400);
    });
  });

  // -------------------------------------------------------------------------
  // POST /api/procurement/purchase-orders/commands/submit
  // -------------------------------------------------------------------------
  describe("POST /commands/submit (state machine)", () => {
    it("returns 401 when unauthenticated", async () => {
      authMissing();
      const res = await runCommand("PurchaseOrder", "submit", {
        orderId: PO_ID,
        status: "approved",
      });
      expect(res.status).toBe(401);
    });

    it("returns 422 when orderId or status missing", async () => {
      authOk();
      mockRuntimeGuardFailure("Order ID is required");
      const res = await runCommand("PurchaseOrder", "submit", {
        orderId: PO_ID,
      });
      expect(res.status).toBe(422);
    });

    it("returns 400 when PO not found", async () => {
      authOk();
      mockRuntimeError("Purchase order not found");
      const res = await runCommand("PurchaseOrder", "submit", {
        orderId: PO_ID,
        status: "approved",
      });
      expect(res.status).toBe(400);
    });

    it("rejects illegal transitions", async () => {
      authOk();
      mockRuntimeError("Cannot transition from received to ordered");
      const res = await runCommand("PurchaseOrder", "submit", {
        orderId: PO_ID,
        status: "ordered",
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.message).toMatch(
        /Cannot transition from received to ordered/
      );
    });

    it("allows draft → submitted", async () => {
      authOk();
      mockRuntimeSuccess({
        id: PO_ID,
        po_number: "PO-2026-0001",
        status: "submitted",
      });
      const res = await runCommand("PurchaseOrder", "submit", {
        orderId: PO_ID,
        status: "submitted",
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.result.status).toBe("submitted");
    });

    it("allows submitted → approved", async () => {
      authOk();
      mockRuntimeSuccess({
        id: PO_ID,
        po_number: "PO-2026-0001",
        status: "approved",
      });
      const res = await runCommand("PurchaseOrder", "submit", {
        orderId: PO_ID,
        status: "approved",
      });
      expect(res.status).toBe(200);
    });

    it("allows submitted → rejected", async () => {
      authOk();
      mockRuntimeSuccess({
        id: PO_ID,
        po_number: "PO-2026-0001",
        status: "rejected",
      });
      const res = await runCommand("PurchaseOrder", "submit", {
        orderId: PO_ID,
        status: "rejected",
      });
      expect(res.status).toBe(200);
    });

    it("allows approved → ordered", async () => {
      authOk();
      mockRuntimeSuccess({
        id: PO_ID,
        po_number: "PO-2026-0001",
        status: "ordered",
      });
      const res = await runCommand("PurchaseOrder", "submit", {
        orderId: PO_ID,
        status: "ordered",
      });
      expect(res.status).toBe(200);
    });

    it("treats cancelled and rejected as terminal (no further transitions)", async () => {
      authOk();
      mockRuntimeError("Cannot transition from cancelled to approved");
      const res = await runCommand("PurchaseOrder", "submit", {
        orderId: PO_ID,
        status: "approved",
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 on runtime error", async () => {
      authOk();
      mockRuntimeError("Database error");
      const res = await runCommand("PurchaseOrder", "submit", {
        orderId: PO_ID,
        status: "submitted",
      });
      expect(res.status).toBe(400);
    });
  });

  // -------------------------------------------------------------------------
  // POST /api/procurement/purchase-orders/commands/markReceived
  // -------------------------------------------------------------------------
  describe("POST /commands/markReceived", () => {
    it("returns 401 when unauthenticated", async () => {
      authMissing();
      const res = await runCommand("PurchaseOrder", "markReceived", {
        orderId: PO_ID,
        items: [{ itemId: POI_ID }],
      });
      expect(res.status).toBe(401);
    });

    it("returns 422 when orderId or items missing", async () => {
      authOk();
      mockRuntimeGuardFailure("Order ID and items are required");
      const res = await runCommand("PurchaseOrder", "markReceived", {
        orderId: PO_ID,
      });
      expect(res.status).toBe(422);
    });

    it("returns 200 with allReceived: false when some items are still partial", async () => {
      authOk();
      mockRuntimeSuccess({ allReceived: false, receivedCount: 1, totalCount: 2 });
      const res = await runCommand("PurchaseOrder", "markReceived", {
        orderId: PO_ID,
        items: [{ itemId: POI_ID, quantityOrdered: 10, quantityReceived: 4 }],
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.result.allReceived).toBe(false);
    });

    it("returns 200 with allReceived: true when every item is full", async () => {
      authOk();
      mockRuntimeSuccess({
        allReceived: true,
        receivedCount: 1,
        totalCount: 1,
        status: "received",
      });
      const res = await runCommand("PurchaseOrder", "markReceived", {
        orderId: PO_ID,
        items: [
          { itemId: POI_ID, quantityOrdered: 10, quantityReceived: 10 },
        ],
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.result.allReceived).toBe(true);
    });

    it("skips inventory update when quantityReceived is zero", async () => {
      authOk();
      mockRuntimeSuccess({ allReceived: false, skippedItems: ["qty=0"] });
      const res = await runCommand("PurchaseOrder", "markReceived", {
        orderId: PO_ID,
        items: [
          { itemId: POI_ID, quantityOrdered: 10, quantityReceived: 0 },
        ],
      });
      expect(res.status).toBe(200);
    });

    it("skips items with missing itemId or null quantityReceived", async () => {
      authOk();
      mockRuntimeSuccess({ allReceived: false, skippedItems: ["missing itemId", "null qty"] });
      const res = await runCommand("PurchaseOrder", "markReceived", {
        orderId: PO_ID,
        items: [
          { quantityReceived: 5 }, // missing itemId
          { itemId: POI_ID, quantityReceived: null }, // null qty
        ],
      });
      expect(res.status).toBe(200);
    });

    it("returns 400 on runtime error", async () => {
      authOk();
      mockRuntimeError("Database error");
      const res = await runCommand("PurchaseOrder", "markReceived", {
        orderId: PO_ID,
        items: [
          { itemId: POI_ID, quantityOrdered: 10, quantityReceived: 4 },
        ],
      });
      expect(res.status).toBe(400);
    });
  });
});