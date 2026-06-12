/**
 * Inventory Extended API Tests
 *
 * Tests for inventory suppliers, inventory transactions, pricing tiers,
 * bulk order rules, and vendor catalog command handlers.
 *
 * All route handlers follow the auto-generated manifest pattern:
 *   requireCurrentUser -> runManifestCommand -> Response
 */

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  requireCurrentUser: vi.fn(),
  resolveCurrentUser: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@/lib/manifest/execute-command", () => ({
  runManifestCommand: vi.fn(),
}));
vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(),
}));
vi.mock("@/lib/manifest-response", async () => {
  const { NextResponse } = await import("next/server");
  return {
    manifestSuccessResponse: vi.fn((data: unknown, status = 200) =>
      NextResponse.json(
        {
          success: true,
          ...(typeof data === "object" && data !== null ? data : { data }),
        },
        { status }
      )
    ),
    manifestErrorResponse: vi.fn(
      (
        message: string | { error: string; diagnostics?: unknown[] },
        status: number
      ) => {
        const body =
          typeof message === "string"
            ? { success: false, message }
            : {
                success: false,
                error: message.error,
                diagnostics: message.diagnostics ?? [],
              };
        return NextResponse.json(body, { status });
      }
    ),
  };
});
vi.mock("@/app/lib/invariant", () => ({
  InvariantError: class extends Error {
    constructor(message: string) {
      super(message);
      this.name = "InvariantError";
    }
  },
}));
vi.mock("@/app/lib/webhook-dispatch", () => ({
  dispatchWebhooks: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@repo/notifications", () => ({}));
vi.mock("@repo/manifest-runtime/run-manifest-command-core", () => ({
  runManifestCommandCore: vi.fn(),
}));
vi.mock("@/lib/manifest/issue-log", () => ({
  logManifestIssue: vi.fn(),
}));

// Import mocked modules
const { requireCurrentUser } = await import("@/app/lib/tenant");
const { runManifestCommand } = await import("@/lib/manifest/execute-command");
const { InvariantError } = await import("@/app/lib/invariant");

// Import dispatcher
import { POST as manifestDispatch } from "@/app/api/manifest/[entity]/commands/[command]/route";

const dispatch = (entity: string, command: string) => (req: NextRequest) =>
  manifestDispatch(req, { params: Promise.resolve({ entity, command }) });

// BulkOrderRule
const bulkOrderCreate = dispatch("BulkOrderRule", "create");
const bulkOrderSoftDelete = dispatch("BulkOrderRule", "softDelete");
const bulkOrderUpdate = dispatch("BulkOrderRule", "update");
// InventorySupplier
const supplierCreate = dispatch("InventorySupplier", "create");
const supplierDeactivate = dispatch("InventorySupplier", "deactivate");
const supplierUpdate = dispatch("InventorySupplier", "update");
// InventoryTransaction
const transactionCreate = dispatch("InventoryTransaction", "create");
// PricingTier
const pricingTierCreate = dispatch("PricingTier", "create");
const pricingTierSoftDelete = dispatch("PricingTier", "softDelete");
const pricingTierUpdate = dispatch("PricingTier", "update");
// VendorCatalog
const vendorCatalogCreate = dispatch("VendorCatalog", "create");
const vendorCatalogSoftDelete = dispatch("VendorCatalog", "softDelete");
const vendorCatalogUpdate = dispatch("VendorCatalog", "update");

// --- Constants ---

const TEST_TENANT_ID = "00000000-0000-0000-0000-000000000040";
const TEST_USER_ID = "user_inventory_ext_001";
const _TEST_ORG_ID = "org_inventory_ext_001";
const OTHER_TENANT_ID = "00000000-0000-0000-0000-000000000099";

// --- Helpers ---

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/test", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function successResponse(data: Record<string, unknown>) {
  return new Response(
    JSON.stringify({
      success: true,
      result: data,
      events: [{ type: "created", payload: data }],
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

function errorResponse(message: string, status = 400) {
  return new Response(JSON.stringify({ success: false, message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("Inventory Extended API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireCurrentUser).mockResolvedValue({
      id: TEST_USER_ID,
      tenantId: TEST_TENANT_ID,
      role: "admin",
      email: "test@test.com",
      firstName: "Test",
      lastName: "User",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // InventorySupplier
  // =========================================================================

  describe("InventorySupplier", () => {
    const supplierData = {
      id: "supplier-001",
      tenantId: TEST_TENANT_ID,
      name: "Acme Produce",
      contactEmail: "orders@acmeproduce.com",
      phone: "555-0100",
      active: true,
    };

    describe("POST /inventorysupplier/create", () => {
      it("should return 401 for unauthenticated requests", async () => {
        vi.mocked(requireCurrentUser).mockRejectedValue(
          new InvariantError("Unauthorized") as never
        );

        const response = await supplierCreate(makeRequest(supplierData));
        expect(response.status).toBe(401);
        const body = await response.json();
        expect(body.success).toBe(false);
        expect(body.message).toBe("Unauthorized");
      });

      it("should return 401 when tenant not found", async () => {
        vi.mocked(requireCurrentUser).mockRejectedValue(
          new InvariantError("Tenant not found") as never
        );

        const response = await supplierCreate(makeRequest(supplierData));
        expect(response.status).toBe(401);
        const body = await response.json();
        expect(body.success).toBe(false);
        expect(body.message).toBe("Tenant not found");
      });

      it("should create supplier and return success with events", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          successResponse(supplierData)
        );

        const response = await supplierCreate(makeRequest(supplierData));
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.result).toEqual(supplierData);
        expect(body.events).toHaveLength(1);
      });

      it("should pass correct entity and command to runManifestCommand", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          successResponse(supplierData)
        );

        await supplierCreate(makeRequest(supplierData));

        expect(runManifestCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            entity: "InventorySupplier",
            command: "create",
            body: supplierData,
            user: expect.objectContaining({
              id: TEST_USER_ID,
              tenantId: TEST_TENANT_ID,
            }),
          })
        );
      });

      it("should return 500 on runtime error", async () => {
        vi.mocked(requireCurrentUser).mockRejectedValue(
          new Error("DB down") as never
        );

        const response = await supplierCreate(makeRequest(supplierData));
        expect(response.status).toBe(500);
        const body = await response.json();
        expect(body.success).toBe(false);
        expect(body.message).toBe("Internal server error");
      });

      it("should return 403 on policy denial", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          errorResponse("Access denied by policy SupplierWritePolicy", 403)
        );

        const response = await supplierCreate(makeRequest(supplierData));
        expect(response.status).toBe(403);
        const body = await response.json();
        expect(body.success).toBe(false);
        expect(body.message).toContain("Access denied");
        expect(body.message).toContain("SupplierWritePolicy");
      });

      it("should return 422 on guard failure", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          errorResponse("Guard 0 failed: name is required", 422)
        );

        const response = await supplierCreate(makeRequest(supplierData));
        expect(response.status).toBe(422);
        const body = await response.json();
        expect(body.success).toBe(false);
        expect(body.message).toContain("Guard 0 failed");
      });

      it("should return 400 on command failure without policy/guard", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          errorResponse("Duplicate supplier")
        );

        const response = await supplierCreate(makeRequest(supplierData));
        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.success).toBe(false);
        expect(body.message).toBe("Duplicate supplier");
      });
    });

    describe("POST /inventorysupplier/deactivate", () => {
      it("should return 401 for unauthenticated requests", async () => {
        vi.mocked(requireCurrentUser).mockRejectedValue(
          new InvariantError("Unauthorized") as never
        );

        const response = await supplierDeactivate(
          makeRequest({ id: "supplier-001" })
        );
        expect(response.status).toBe(401);
      });

      it("should return 401 when tenant not found", async () => {
        vi.mocked(requireCurrentUser).mockRejectedValue(
          new InvariantError("Tenant not found") as never
        );

        const response = await supplierDeactivate(
          makeRequest({ id: "supplier-001" })
        );
        expect(response.status).toBe(401);
        const body = await response.json();
        expect(body.message).toBe("Tenant not found");
      });

      it("should deactivate supplier successfully", async () => {
        const deactivated = { ...supplierData, active: false };
        vi.mocked(runManifestCommand).mockResolvedValue(
          successResponse(deactivated)
        );

        const response = await supplierDeactivate(
          makeRequest({ id: "supplier-001" })
        );
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.result.active).toBe(false);
      });

      it("should pass 'deactivate' command to runManifestCommand", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          successResponse(supplierData)
        );

        await supplierDeactivate(makeRequest({ id: "supplier-001" }));

        expect(runManifestCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            entity: "InventorySupplier",
            command: "deactivate",
            body: { id: "supplier-001" },
          })
        );
      });

      it("should return 500 on unexpected error", async () => {
        vi.mocked(requireCurrentUser).mockRejectedValue(
          new Error("Runtime crash") as never
        );

        const response = await supplierDeactivate(
          makeRequest({ id: "supplier-001" })
        );
        expect(response.status).toBe(500);
        const body = await response.json();
        expect(body.message).toBe("Internal server error");
      });

      it("should isolate tenant - passes tenant-scoped user context", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          successResponse(supplierData)
        );

        await supplierDeactivate(makeRequest({ id: "supplier-001" }));

        expect(runManifestCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            user: expect.objectContaining({
              id: TEST_USER_ID,
              tenantId: TEST_TENANT_ID,
            }),
          })
        );
      });
    });

    describe("POST /inventorysupplier/update", () => {
      it("should return 401 for unauthenticated requests", async () => {
        vi.mocked(requireCurrentUser).mockRejectedValue(
          new InvariantError("Unauthorized") as never
        );

        const response = await supplierUpdate(
          makeRequest({ id: "supplier-001", name: "Updated" })
        );
        expect(response.status).toBe(401);
      });

      it("should return 401 when tenant not found", async () => {
        vi.mocked(requireCurrentUser).mockRejectedValue(
          new InvariantError("Tenant not found") as never
        );

        const response = await supplierUpdate(
          makeRequest({ id: "supplier-001", name: "Updated" })
        );
        expect(response.status).toBe(401);
        const body = await response.json();
        expect(body.message).toBe("Tenant not found");
      });

      it("should update supplier successfully", async () => {
        const updated = { ...supplierData, name: "Updated Produce Co" };
        vi.mocked(runManifestCommand).mockResolvedValue(
          successResponse(updated)
        );

        const response = await supplierUpdate(
          makeRequest({ id: "supplier-001", name: "Updated Produce Co" })
        );
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.result.name).toBe("Updated Produce Co");
      });

      it("should pass 'update' command to runManifestCommand", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          successResponse(supplierData)
        );

        const updateBody = { id: "supplier-001", name: "Updated" };
        await supplierUpdate(makeRequest(updateBody));

        expect(runManifestCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            entity: "InventorySupplier",
            command: "update",
            body: updateBody,
          })
        );
      });

      it("should return 500 on unexpected error", async () => {
        vi.mocked(requireCurrentUser).mockRejectedValue(
          new Error("Runtime error") as never
        );

        const response = await supplierUpdate(
          makeRequest({ id: "supplier-001", name: "Updated" })
        );
        expect(response.status).toBe(500);
        const body = await response.json();
        expect(body.message).toBe("Internal server error");
      });
    });
  });

  // =========================================================================
  // InventoryTransaction
  // =========================================================================

  describe("InventoryTransaction", () => {
    const transactionData = {
      id: "txn-001",
      tenantId: TEST_TENANT_ID,
      itemId: "item-001",
      type: "INBOUND",
      quantity: 50,
      unitCost: 5.99,
      reference: "PO-2026-001",
      performedBy: TEST_USER_ID,
    };

    describe("POST /inventorytransaction/create", () => {
      it("should return 401 for unauthenticated requests", async () => {
        vi.mocked(requireCurrentUser).mockRejectedValue(
          new InvariantError("Unauthorized") as never
        );

        const response = await transactionCreate(makeRequest(transactionData));
        expect(response.status).toBe(401);
        const body = await response.json();
        expect(body.success).toBe(false);
        expect(body.message).toBe("Unauthorized");
      });

      it("should return 401 when tenant not found", async () => {
        vi.mocked(requireCurrentUser).mockRejectedValue(
          new InvariantError("Tenant not found") as never
        );

        const response = await transactionCreate(makeRequest(transactionData));
        expect(response.status).toBe(401);
        const body = await response.json();
        expect(body.success).toBe(false);
        expect(body.message).toBe("Tenant not found");
      });

      it("should create transaction and return success", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          successResponse(transactionData)
        );

        const response = await transactionCreate(makeRequest(transactionData));
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.result).toEqual(transactionData);
        expect(body.events).toHaveLength(1);
      });

      it("should pass correct entity and command to runManifestCommand", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          successResponse(transactionData)
        );

        await transactionCreate(makeRequest(transactionData));

        expect(runManifestCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            entity: "InventoryTransaction",
            command: "create",
            body: transactionData,
          })
        );
      });

      it("should return 500 on runtime error", async () => {
        vi.mocked(requireCurrentUser).mockRejectedValue(
          new Error("DB error") as never
        );

        const response = await transactionCreate(makeRequest(transactionData));
        expect(response.status).toBe(500);
        const body = await response.json();
        expect(body.message).toBe("Internal server error");
      });

      it("should return 403 on policy denial", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          errorResponse("Access denied by policy TransactionWritePolicy", 403)
        );

        const response = await transactionCreate(makeRequest(transactionData));
        expect(response.status).toBe(403);
        const body = await response.json();
        expect(body.message).toContain("Access denied");
        expect(body.message).toContain("TransactionWritePolicy");
      });

      it("should return 422 on guard failure", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          errorResponse("Guard 1 failed: quantity must be positive", 422)
        );

        const response = await transactionCreate(makeRequest(transactionData));
        expect(response.status).toBe(422);
        const body = await response.json();
        expect(body.message).toContain("Guard 1 failed");
      });

      it("should isolate tenant - passes tenant-scoped context", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          successResponse(transactionData)
        );

        await transactionCreate(makeRequest(transactionData));

        expect(runManifestCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            user: expect.objectContaining({
              id: TEST_USER_ID,
              tenantId: TEST_TENANT_ID,
            }),
          })
        );
      });
    });
  });

  // =========================================================================
  // PricingTier
  // =========================================================================

  describe("PricingTier", () => {
    const tierData = {
      id: "tier-001",
      tenantId: TEST_TENANT_ID,
      name: "Volume Discount 10+",
      minQuantity: 10,
      maxQuantity: 49,
      discountPercent: 5,
      active: true,
    };

    describe("POST /pricingtier/create", () => {
      it("should return 401 for unauthenticated requests", async () => {
        vi.mocked(requireCurrentUser).mockRejectedValue(
          new InvariantError("Unauthorized") as never
        );

        const response = await pricingTierCreate(makeRequest(tierData));
        expect(response.status).toBe(401);
        const body = await response.json();
        expect(body.success).toBe(false);
        expect(body.message).toBe("Unauthorized");
      });

      it("should return 401 when tenant not found", async () => {
        vi.mocked(requireCurrentUser).mockRejectedValue(
          new InvariantError("Tenant not found") as never
        );

        const response = await pricingTierCreate(makeRequest(tierData));
        expect(response.status).toBe(401);
        const body = await response.json();
        expect(body.message).toBe("Tenant not found");
      });

      it("should create pricing tier successfully", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          successResponse(tierData)
        );

        const response = await pricingTierCreate(makeRequest(tierData));
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.result).toEqual(tierData);
      });

      it("should pass correct entityName and command to runManifestCommand", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          successResponse(tierData)
        );

        await pricingTierCreate(makeRequest(tierData));

        expect(runManifestCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            entity: "PricingTier",
            command: "create",
            body: tierData,
          })
        );
      });

      it("should return 500 on unexpected error", async () => {
        vi.mocked(requireCurrentUser).mockRejectedValue(
          new Error("Crash") as never
        );

        const response = await pricingTierCreate(makeRequest(tierData));
        expect(response.status).toBe(500);
        const body = await response.json();
        expect(body.message).toBe("Internal server error");
      });

      it("should return 400 on command failure", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          errorResponse("Tier already exists")
        );

        const response = await pricingTierCreate(makeRequest(tierData));
        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.message).toBe("Tier already exists");
      });
    });

    describe("POST /pricingtier/soft-delete", () => {
      it("should return 401 for unauthenticated requests", async () => {
        vi.mocked(requireCurrentUser).mockRejectedValue(
          new InvariantError("Unauthorized") as never
        );

        const response = await pricingTierSoftDelete(
          makeRequest({ id: "tier-001" })
        );
        expect(response.status).toBe(401);
      });

      it("should return 401 when tenant not found", async () => {
        vi.mocked(requireCurrentUser).mockRejectedValue(
          new InvariantError("Tenant not found") as never
        );

        const response = await pricingTierSoftDelete(
          makeRequest({ id: "tier-001" })
        );
        expect(response.status).toBe(401);
        const body = await response.json();
        expect(body.message).toBe("Tenant not found");
      });

      it("should soft-delete pricing tier successfully", async () => {
        const deleted = { ...tierData, deletedAt: new Date().toISOString() };
        vi.mocked(runManifestCommand).mockResolvedValue(
          successResponse(deleted)
        );

        const response = await pricingTierSoftDelete(
          makeRequest({ id: "tier-001" })
        );
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
      });

      it("should pass 'softDelete' command with PricingTier entity", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          successResponse(tierData)
        );

        await pricingTierSoftDelete(makeRequest({ id: "tier-001" }));

        expect(runManifestCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            entity: "PricingTier",
            command: "softDelete",
            body: { id: "tier-001" },
          })
        );
      });

      it("should return 500 on error", async () => {
        vi.mocked(requireCurrentUser).mockRejectedValue(
          new Error("DB error") as never
        );

        const response = await pricingTierSoftDelete(
          makeRequest({ id: "tier-001" })
        );
        expect(response.status).toBe(500);
      });

      it("should isolate tenant via user context", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          successResponse(tierData)
        );

        await pricingTierSoftDelete(makeRequest({ id: "tier-001" }));

        expect(runManifestCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            user: expect.objectContaining({
              id: TEST_USER_ID,
              tenantId: TEST_TENANT_ID,
            }),
          })
        );
      });
    });

    describe("POST /pricingtier/update", () => {
      it("should return 401 for unauthenticated requests", async () => {
        vi.mocked(requireCurrentUser).mockRejectedValue(
          new InvariantError("Unauthorized") as never
        );

        const response = await pricingTierUpdate(
          makeRequest({ id: "tier-001", discountPercent: 10 })
        );
        expect(response.status).toBe(401);
      });

      it("should return 401 when tenant not found", async () => {
        vi.mocked(requireCurrentUser).mockRejectedValue(
          new InvariantError("Tenant not found") as never
        );

        const response = await pricingTierUpdate(
          makeRequest({ id: "tier-001", discountPercent: 10 })
        );
        expect(response.status).toBe(401);
      });

      it("should update pricing tier successfully", async () => {
        const updated = { ...tierData, discountPercent: 10 };
        vi.mocked(runManifestCommand).mockResolvedValue(
          successResponse(updated)
        );

        const response = await pricingTierUpdate(
          makeRequest({ id: "tier-001", discountPercent: 10 })
        );
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.result.discountPercent).toBe(10);
      });

      it("should pass 'update' command to runManifestCommand", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          successResponse(tierData)
        );

        const updateBody = { id: "tier-001", discountPercent: 10 };
        await pricingTierUpdate(makeRequest(updateBody));

        expect(runManifestCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            entity: "PricingTier",
            command: "update",
            body: updateBody,
          })
        );
      });

      it("should return 500 on unexpected error", async () => {
        vi.mocked(requireCurrentUser).mockRejectedValue(
          new Error("Oops") as never
        );

        const response = await pricingTierUpdate(
          makeRequest({ id: "tier-001", discountPercent: 10 })
        );
        expect(response.status).toBe(500);
      });
    });
  });

  // =========================================================================
  // BulkOrderRule
  // =========================================================================

  describe("BulkOrderRule", () => {
    const ruleData = {
      id: "rule-001",
      tenantId: TEST_TENANT_ID,
      name: "Bulk 50+ Discount",
      minQuantity: 50,
      discountPercent: 15,
      appliesTo: "ALL",
      active: true,
    };

    describe("POST /bulkorderrule/create", () => {
      it("should return 401 for unauthenticated requests", async () => {
        vi.mocked(requireCurrentUser).mockRejectedValue(
          new InvariantError("Unauthorized") as never
        );

        const response = await bulkOrderCreate(makeRequest(ruleData));
        expect(response.status).toBe(401);
        const body = await response.json();
        expect(body.success).toBe(false);
        expect(body.message).toBe("Unauthorized");
      });

      it("should return 401 when tenant not found", async () => {
        vi.mocked(requireCurrentUser).mockRejectedValue(
          new InvariantError("Tenant not found") as never
        );

        const response = await bulkOrderCreate(makeRequest(ruleData));
        expect(response.status).toBe(401);
        const body = await response.json();
        expect(body.message).toBe("Tenant not found");
      });

      it("should create bulk order rule successfully", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          successResponse(ruleData)
        );

        const response = await bulkOrderCreate(makeRequest(ruleData));
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.result).toEqual(ruleData);
        expect(body.events).toHaveLength(1);
      });

      it("should pass correct entity and command to runManifestCommand", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          successResponse(ruleData)
        );

        await bulkOrderCreate(makeRequest(ruleData));

        expect(runManifestCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            entity: "BulkOrderRule",
            command: "create",
            body: ruleData,
          })
        );
      });

      it("should return 500 on runtime error", async () => {
        vi.mocked(requireCurrentUser).mockRejectedValue(
          new Error("Fail") as never
        );

        const response = await bulkOrderCreate(makeRequest(ruleData));
        expect(response.status).toBe(500);
        const body = await response.json();
        expect(body.message).toBe("Internal server error");
      });

      it("should return 403 on policy denial", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          errorResponse("Access denied by policy BulkOrderPolicy", 403)
        );

        const response = await bulkOrderCreate(makeRequest(ruleData));
        expect(response.status).toBe(403);
        const body = await response.json();
        expect(body.message).toContain("Access denied");
        expect(body.message).toContain("BulkOrderPolicy");
      });

      it("should return 422 on guard failure", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          errorResponse("Guard 0 failed: minQuantity must be > 0", 422)
        );

        const response = await bulkOrderCreate(makeRequest(ruleData));
        expect(response.status).toBe(422);
        const body = await response.json();
        expect(body.message).toContain("Guard 0 failed");
      });

      it("should return 400 on generic command failure", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          errorResponse("Overlapping rule exists")
        );

        const response = await bulkOrderCreate(makeRequest(ruleData));
        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.message).toBe("Overlapping rule exists");
      });
    });

    describe("POST /bulkorderrule/soft-delete", () => {
      it("should return 401 for unauthenticated requests", async () => {
        vi.mocked(requireCurrentUser).mockRejectedValue(
          new InvariantError("Unauthorized") as never
        );

        const response = await bulkOrderSoftDelete(
          makeRequest({ id: "rule-001" })
        );
        expect(response.status).toBe(401);
      });

      it("should return 401 when tenant not found", async () => {
        vi.mocked(requireCurrentUser).mockRejectedValue(
          new InvariantError("Tenant not found") as never
        );

        const response = await bulkOrderSoftDelete(
          makeRequest({ id: "rule-001" })
        );
        expect(response.status).toBe(401);
        const body = await response.json();
        expect(body.message).toBe("Tenant not found");
      });

      it("should soft-delete bulk order rule successfully", async () => {
        const deleted = { ...ruleData, deletedAt: new Date().toISOString() };
        vi.mocked(runManifestCommand).mockResolvedValue(
          successResponse(deleted)
        );

        const response = await bulkOrderSoftDelete(
          makeRequest({ id: "rule-001" })
        );
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
      });

      it("should pass 'softDelete' command with BulkOrderRule entity", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          successResponse(ruleData)
        );

        await bulkOrderSoftDelete(makeRequest({ id: "rule-001" }));

        expect(runManifestCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            entity: "BulkOrderRule",
            command: "softDelete",
            body: { id: "rule-001" },
          })
        );
      });

      it("should return 500 on error", async () => {
        vi.mocked(requireCurrentUser).mockRejectedValue(
          new Error("Error") as never
        );

        const response = await bulkOrderSoftDelete(
          makeRequest({ id: "rule-001" })
        );
        expect(response.status).toBe(500);
      });

      it("should isolate tenant via user context", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          successResponse(ruleData)
        );

        await bulkOrderSoftDelete(makeRequest({ id: "rule-001" }));

        expect(runManifestCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            user: expect.objectContaining({
              id: TEST_USER_ID,
              tenantId: TEST_TENANT_ID,
            }),
          })
        );
      });
    });

    describe("POST /bulkorderrule/update", () => {
      it("should return 401 for unauthenticated requests", async () => {
        vi.mocked(requireCurrentUser).mockRejectedValue(
          new InvariantError("Unauthorized") as never
        );

        const response = await bulkOrderUpdate(
          makeRequest({ id: "rule-001", discountPercent: 20 })
        );
        expect(response.status).toBe(401);
      });

      it("should return 401 when tenant not found", async () => {
        vi.mocked(requireCurrentUser).mockRejectedValue(
          new InvariantError("Tenant not found") as never
        );

        const response = await bulkOrderUpdate(
          makeRequest({ id: "rule-001", discountPercent: 20 })
        );
        expect(response.status).toBe(401);
      });

      it("should update bulk order rule successfully", async () => {
        const updated = { ...ruleData, discountPercent: 20 };
        vi.mocked(runManifestCommand).mockResolvedValue(
          successResponse(updated)
        );

        const response = await bulkOrderUpdate(
          makeRequest({ id: "rule-001", discountPercent: 20 })
        );
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.result.discountPercent).toBe(20);
      });

      it("should pass 'update' command to runManifestCommand", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          successResponse(ruleData)
        );

        const updateBody = { id: "rule-001", discountPercent: 20 };
        await bulkOrderUpdate(makeRequest(updateBody));

        expect(runManifestCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            entity: "BulkOrderRule",
            command: "update",
            body: updateBody,
          })
        );
      });

      it("should return 500 on unexpected error", async () => {
        vi.mocked(requireCurrentUser).mockRejectedValue(
          new Error("Fail") as never
        );

        const response = await bulkOrderUpdate(
          makeRequest({ id: "rule-001", discountPercent: 20 })
        );
        expect(response.status).toBe(500);
      });
    });
  });

  // =========================================================================
  // VendorCatalog
  // =========================================================================

  describe("VendorCatalog", () => {
    const catalogData = {
      id: "catalog-001",
      tenantId: TEST_TENANT_ID,
      supplierId: "supplier-001",
      itemId: "item-001",
      sku: "VND-SKU-001",
      price: 12.99,
      minOrderQty: 10,
      leadTimeDays: 3,
      active: true,
    };

    describe("POST /vendorcatalog/create", () => {
      it("should return 401 for unauthenticated requests", async () => {
        vi.mocked(requireCurrentUser).mockRejectedValue(
          new InvariantError("Unauthorized") as never
        );

        const response = await vendorCatalogCreate(makeRequest(catalogData));
        expect(response.status).toBe(401);
        const body = await response.json();
        expect(body.success).toBe(false);
        expect(body.message).toBe("Unauthorized");
      });

      it("should return 401 when tenant not found", async () => {
        vi.mocked(requireCurrentUser).mockRejectedValue(
          new InvariantError("Tenant not found") as never
        );

        const response = await vendorCatalogCreate(makeRequest(catalogData));
        expect(response.status).toBe(401);
        const body = await response.json();
        expect(body.message).toBe("Tenant not found");
      });

      it("should create vendor catalog entry successfully", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          successResponse(catalogData)
        );

        const response = await vendorCatalogCreate(makeRequest(catalogData));
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.result).toEqual(catalogData);
        expect(body.events).toHaveLength(1);
      });

      it("should pass correct entity and command to runManifestCommand", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          successResponse(catalogData)
        );

        await vendorCatalogCreate(makeRequest(catalogData));

        expect(runManifestCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            entity: "VendorCatalog",
            command: "create",
            body: catalogData,
          })
        );
      });

      it("should return 500 on runtime error", async () => {
        vi.mocked(requireCurrentUser).mockRejectedValue(
          new Error("DB fail") as never
        );

        const response = await vendorCatalogCreate(makeRequest(catalogData));
        expect(response.status).toBe(500);
        const body = await response.json();
        expect(body.message).toBe("Internal server error");
      });

      it("should return 403 on policy denial", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          errorResponse("Access denied by policy VendorCatalogWritePolicy", 403)
        );

        const response = await vendorCatalogCreate(makeRequest(catalogData));
        expect(response.status).toBe(403);
        const body = await response.json();
        expect(body.message).toContain("Access denied");
        expect(body.message).toContain("VendorCatalogWritePolicy");
      });

      it("should return 422 on guard failure", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          errorResponse("Guard 2 failed: price must be positive", 422)
        );

        const response = await vendorCatalogCreate(makeRequest(catalogData));
        expect(response.status).toBe(422);
        const body = await response.json();
        expect(body.message).toContain("Guard 2 failed");
      });

      it("should return 400 on generic command failure", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          errorResponse("Duplicate catalog entry")
        );

        const response = await vendorCatalogCreate(makeRequest(catalogData));
        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.message).toBe("Duplicate catalog entry");
      });
    });

    describe("POST /vendorcatalog/soft-delete", () => {
      it("should return 401 for unauthenticated requests", async () => {
        vi.mocked(requireCurrentUser).mockRejectedValue(
          new InvariantError("Unauthorized") as never
        );

        const response = await vendorCatalogSoftDelete(
          makeRequest({ id: "catalog-001" })
        );
        expect(response.status).toBe(401);
      });

      it("should return 401 when tenant not found", async () => {
        vi.mocked(requireCurrentUser).mockRejectedValue(
          new InvariantError("Tenant not found") as never
        );

        const response = await vendorCatalogSoftDelete(
          makeRequest({ id: "catalog-001" })
        );
        expect(response.status).toBe(401);
        const body = await response.json();
        expect(body.message).toBe("Tenant not found");
      });

      it("should soft-delete vendor catalog entry successfully", async () => {
        const deleted = {
          ...catalogData,
          deletedAt: new Date().toISOString(),
        };
        vi.mocked(runManifestCommand).mockResolvedValue(
          successResponse(deleted)
        );

        const response = await vendorCatalogSoftDelete(
          makeRequest({ id: "catalog-001" })
        );
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
      });

      it("should pass 'softDelete' command with VendorCatalog entity", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          successResponse(catalogData)
        );

        await vendorCatalogSoftDelete(makeRequest({ id: "catalog-001" }));

        expect(runManifestCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            entity: "VendorCatalog",
            command: "softDelete",
            body: { id: "catalog-001" },
          })
        );
      });

      it("should return 500 on error", async () => {
        vi.mocked(requireCurrentUser).mockRejectedValue(
          new Error("Fail") as never
        );

        const response = await vendorCatalogSoftDelete(
          makeRequest({ id: "catalog-001" })
        );
        expect(response.status).toBe(500);
      });

      it("should isolate tenant via user context", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          successResponse(catalogData)
        );

        await vendorCatalogSoftDelete(makeRequest({ id: "catalog-001" }));

        expect(runManifestCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            user: expect.objectContaining({
              id: TEST_USER_ID,
              tenantId: TEST_TENANT_ID,
            }),
          })
        );
      });
    });

    describe("POST /vendorcatalog/update", () => {
      it("should return 401 for unauthenticated requests", async () => {
        vi.mocked(requireCurrentUser).mockRejectedValue(
          new InvariantError("Unauthorized") as never
        );

        const response = await vendorCatalogUpdate(
          makeRequest({ id: "catalog-001", price: 14.99 })
        );
        expect(response.status).toBe(401);
      });

      it("should return 401 when tenant not found", async () => {
        vi.mocked(requireCurrentUser).mockRejectedValue(
          new InvariantError("Tenant not found") as never
        );

        const response = await vendorCatalogUpdate(
          makeRequest({ id: "catalog-001", price: 14.99 })
        );
        expect(response.status).toBe(401);
      });

      it("should update vendor catalog entry successfully", async () => {
        const updated = { ...catalogData, price: 14.99 };
        vi.mocked(runManifestCommand).mockResolvedValue(
          successResponse(updated)
        );

        const response = await vendorCatalogUpdate(
          makeRequest({ id: "catalog-001", price: 14.99 })
        );
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.result.price).toBe(14.99);
      });

      it("should pass 'update' command to runManifestCommand", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          successResponse(catalogData)
        );

        const updateBody = { id: "catalog-001", price: 14.99 };
        await vendorCatalogUpdate(makeRequest(updateBody));

        expect(runManifestCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            entity: "VendorCatalog",
            command: "update",
            body: updateBody,
          })
        );
      });

      it("should return 500 on unexpected error", async () => {
        vi.mocked(requireCurrentUser).mockRejectedValue(
          new Error("Fail") as never
        );

        const response = await vendorCatalogUpdate(
          makeRequest({ id: "catalog-001", price: 14.99 })
        );
        expect(response.status).toBe(500);
      });
    });
  });

  // =========================================================================
  // Cross-domain: Tenant Isolation
  // =========================================================================

  describe("Tenant isolation", () => {
    it("should pass the correct tenant ID for supplier create under a different org", async () => {
      vi.mocked(requireCurrentUser).mockResolvedValue({
        id: "user_other",
        tenantId: OTHER_TENANT_ID,
        role: "admin",
        email: "other@test.com",
        firstName: "Other",
        lastName: "User",
      });
      vi.mocked(runManifestCommand).mockResolvedValue(
        successResponse({ id: "supplier-other", tenantId: OTHER_TENANT_ID })
      );

      await supplierCreate(makeRequest({ name: "Other Org Supplier" }));

      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.objectContaining({
            id: "user_other",
            tenantId: OTHER_TENANT_ID,
          }),
        })
      );
    });

    it("should not leak cross-tenant data in transaction create", async () => {
      // Tenant A creates a transaction
      vi.mocked(runManifestCommand).mockResolvedValue(
        successResponse({
          id: "txn-a",
          tenantId: TEST_TENANT_ID,
          type: "INBOUND",
        })
      );

      const response = await transactionCreate(
        makeRequest({ itemId: "item-1", type: "INBOUND", quantity: 10 })
      );
      const body = await response.json();

      // Verify the command was scoped to tenant A
      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.objectContaining({
            id: TEST_USER_ID,
            tenantId: TEST_TENANT_ID,
          }),
        })
      );
      // Verify result came from tenant A's context
      expect(body.result.tenantId).toBe(TEST_TENANT_ID);
    });

    it("should reject unauthenticated access even with valid-looking body", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new InvariantError("Unauthorized") as never
      );

      const response = await vendorCatalogCreate(
        makeRequest({
          supplierId: "supplier-001",
          itemId: "item-001",
          price: 9.99,
        })
      );

      expect(response.status).toBe(401);
      // runManifestCommand should never be called
      expect(runManifestCommand).not.toHaveBeenCalled();
    });
  });
});
