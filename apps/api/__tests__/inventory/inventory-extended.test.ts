/**
 * Inventory Extended API Tests
 *
 * Tests for inventory suppliers, inventory transactions, pricing tiers,
 * bulk order rules, and vendor catalog command handlers.
 *
 * All route handlers follow the auto-generated manifest pattern:
 *   auth -> tenant lookup -> createManifestRuntime -> runCommand
 *
 * NOTE: Route handlers are simulated because the actual route paths do not exist.
 * Tests mock createManifestRuntime to verify command behavior.
 */

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  requireCurrentUser: vi.fn().mockResolvedValue({
    id: "test-user-id",
    tenantId: "test-tenant",
    role: "admin",
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
  }),

  getTenantIdForOrg: vi.fn(),
  requireTenantId: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
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

vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(),
}));

// Import mocked modules
const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg } = await import("@/app/lib/tenant");
const { createManifestRuntime } = await import("@/lib/manifest-runtime");

// ---------------------------------------------------------------------------
// Simulated route handler for testing
// ---------------------------------------------------------------------------

const mockRunCommand = vi.fn();

function setupRuntimeMock() {
  vi.mocked(createManifestRuntime).mockResolvedValue({
    runCommand: mockRunCommand,
  } as never);
}

async function simulateRouteHandler(
  command: string,
  request: NextRequest,
  entityName: string
) {
  const authResult = await auth();
  if (!authResult?.userId) {
    return new Response(
      JSON.stringify({ success: false, message: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const orgId = authResult.orgId;
  if (!orgId) {
    return new Response(
      JSON.stringify({ success: false, message: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) {
    return new Response(
      JSON.stringify({ success: false, message: "Tenant not found" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ success: false, message: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const result = await createManifestRuntime({
      user: { id: authResult.userId, tenantId },
    });

    const response = await result.runCommand(command, body, { entityName });

    if (!response.success) {
      if (response.policyDenial) {
        return new Response(
          JSON.stringify({
            success: false,
            message: `Access denied: ${response.policyDenial.policyName}`,
          }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }
      if (response.guardFailure) {
        return new Response(
          JSON.stringify({
            success: false,
            message: `Guard ${response.guardFailure.index} failed: ${response.guardFailure.formatted}`,
          }),
          { status: 422, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({
          success: false,
          message: response.error || "Command failed",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        result: response.result,
        events: response.emittedEvents,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch {
    return new Response(
      JSON.stringify({ success: false, message: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/test", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

// --- Constants ---

const TEST_TENANT_ID = "00000000-0000-0000-0000-000000000040";
const TEST_USER_ID = "user_inventory_ext_001";
const TEST_ORG_ID = "org_inventory_ext_001";
const OTHER_TENANT_ID = "00000000-0000-0000-0000-000000000099";

// --- Helpers ---

function mockRuntimeSuccess(result: Record<string, unknown>) {
  setupRuntimeMock();
  mockRunCommand.mockResolvedValue({
    success: true,
    result,
    emittedEvents: [{ type: "created", payload: result }],
  });
}

function mockRuntimePolicyDenial(policyName: string) {
  setupRuntimeMock();
  mockRunCommand.mockResolvedValue({
    success: false,
    policyDenial: { policyName },
  });
}

function mockRuntimeGuardFailure(index: number, formatted: string) {
  setupRuntimeMock();
  mockRunCommand.mockResolvedValue({
    success: false,
    guardFailure: { index, formatted },
  });
}

function mockRuntimeError(error: string) {
  setupRuntimeMock();
  mockRunCommand.mockResolvedValue({
    success: false,
    error,
  });
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("Inventory Extended API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      userId: TEST_USER_ID,
      orgId: TEST_ORG_ID,
    } as never);
    vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID as never);
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

    describe("InventorySupplier.create", () => {
      it("should return 401 for unauthenticated requests", async () => {
        vi.mocked(auth).mockResolvedValue({
          userId: null,
          orgId: null,
        } as never);

        const response = await simulateRouteHandler(
          "create",
          makeRequest(supplierData),
          "InventorySupplier"
        );
        expect(response.status).toBe(401);
        const body = await response.json();
        expect(body.success).toBe(false);
        expect(body.message).toBe("Unauthorized");
      });

      it("should return 400 when tenant not found", async () => {
        vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

        const response = await simulateRouteHandler(
          "create",
          makeRequest(supplierData),
          "InventorySupplier"
        );
        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.success).toBe(false);
        expect(body.message).toBe("Tenant not found");
      });

      it("should create supplier and return success with events", async () => {
        mockRuntimeSuccess(supplierData);

        const response = await simulateRouteHandler(
          "create",
          makeRequest(supplierData),
          "InventorySupplier"
        );
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.result).toEqual(supplierData);
        expect(body.events).toHaveLength(1);
      });

      it("should pass correct entityName to runtime", async () => {
        mockRuntimeSuccess(supplierData);

        await simulateRouteHandler(
          "create",
          makeRequest(supplierData),
          "InventorySupplier"
        );

        expect(createManifestRuntime).toHaveBeenCalledWith({
          user: { id: TEST_USER_ID, tenantId: TEST_TENANT_ID },
        });
        expect(mockRunCommand).toHaveBeenCalledWith("create", supplierData, {
          entityName: "InventorySupplier",
        });
      });

      it("should return 500 on runtime error", async () => {
        vi.mocked(getTenantIdForOrg).mockRejectedValue(
          new Error("DB down") as never
        );

        const response = await simulateRouteHandler(
          "create",
          makeRequest(supplierData),
          "InventorySupplier"
        );
        expect(response.status).toBe(500);
        const body = await response.json();
        expect(body.success).toBe(false);
        expect(body.message).toBe("Internal server error");
      });

      it("should return 403 on policy denial", async () => {
        mockRuntimePolicyDenial("SupplierWritePolicy");

        const response = await simulateRouteHandler(
          "create",
          makeRequest(supplierData),
          "InventorySupplier"
        );
        expect(response.status).toBe(403);
        const body = await response.json();
        expect(body.success).toBe(false);
        expect(body.message).toContain("Access denied");
        expect(body.message).toContain("SupplierWritePolicy");
      });

      it("should return 422 on guard failure", async () => {
        mockRuntimeGuardFailure(0, "name is required");

        const response = await simulateRouteHandler(
          "create",
          makeRequest(supplierData),
          "InventorySupplier"
        );
        expect(response.status).toBe(422);
        const body = await response.json();
        expect(body.success).toBe(false);
        expect(body.message).toContain("Guard 0 failed");
      });

      it("should return 400 on command failure without policy/guard", async () => {
        mockRuntimeError("Duplicate supplier");

        const response = await simulateRouteHandler(
          "create",
          makeRequest(supplierData),
          "InventorySupplier"
        );
        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.success).toBe(false);
        expect(body.message).toBe("Duplicate supplier");
      });
    });

    describe("InventorySupplier.deactivate", () => {
      it("should return 401 for unauthenticated requests", async () => {
        vi.mocked(auth).mockResolvedValue({
          userId: null,
          orgId: null,
        } as never);

        const response = await simulateRouteHandler(
          "deactivate",
          makeRequest({ id: "supplier-001" }),
          "InventorySupplier"
        );
        expect(response.status).toBe(401);
      });

      it("should return 400 when tenant not found", async () => {
        vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

        const response = await simulateRouteHandler(
          "deactivate",
          makeRequest({ id: "supplier-001" }),
          "InventorySupplier"
        );
        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.message).toBe("Tenant not found");
      });

      it("should deactivate supplier successfully", async () => {
        const deactivated = { ...supplierData, active: false };
        mockRuntimeSuccess(deactivated);

        const response = await simulateRouteHandler(
          "deactivate",
          makeRequest({ id: "supplier-001" }),
          "InventorySupplier"
        );
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.result.active).toBe(false);
      });

      it("should pass 'deactivate' command to runtime", async () => {
        mockRuntimeSuccess(supplierData);

        await simulateRouteHandler(
          "deactivate",
          makeRequest({ id: "supplier-001" }),
          "InventorySupplier"
        );

        expect(mockRunCommand).toHaveBeenCalledWith(
          "deactivate",
          { id: "supplier-001" },
          { entityName: "InventorySupplier" }
        );
      });

      it("should return 500 on unexpected error", async () => {
        vi.mocked(createManifestRuntime).mockRejectedValue(
          new Error("Runtime crash") as never
        );

        const response = await simulateRouteHandler(
          "deactivate",
          makeRequest({ id: "supplier-001" }),
          "InventorySupplier"
        );
        expect(response.status).toBe(500);
        const body = await response.json();
        expect(body.message).toBe("Internal server error");
      });
    });

    describe("InventorySupplier.update", () => {
      it("should return 401 for unauthenticated requests", async () => {
        vi.mocked(auth).mockResolvedValue({
          userId: null,
          orgId: null,
        } as never);

        const response = await simulateRouteHandler(
          "update",
          makeRequest({ id: "supplier-001", name: "Updated" }),
          "InventorySupplier"
        );
        expect(response.status).toBe(401);
      });

      it("should update supplier successfully", async () => {
        const updated = { ...supplierData, name: "Updated Produce Co" };
        mockRuntimeSuccess(updated);

        const response = await simulateRouteHandler(
          "update",
          makeRequest({ id: "supplier-001", name: "Updated Produce Co" }),
          "InventorySupplier"
        );
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.result.name).toBe("Updated Produce Co");
      });

      it("should pass 'update' command to runtime", async () => {
        mockRuntimeSuccess(supplierData);

        const updateBody = { id: "supplier-001", name: "Updated" };
        await simulateRouteHandler(
          "update",
          makeRequest(updateBody),
          "InventorySupplier"
        );

        expect(mockRunCommand).toHaveBeenCalledWith("update", updateBody, {
          entityName: "InventorySupplier",
        });
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

    describe("InventoryTransaction.create", () => {
      it("should return 401 for unauthenticated requests", async () => {
        vi.mocked(auth).mockResolvedValue({
          userId: null,
          orgId: null,
        } as never);

        const response = await simulateRouteHandler(
          "create",
          makeRequest(transactionData),
          "InventoryTransaction"
        );
        expect(response.status).toBe(401);
        const body = await response.json();
        expect(body.success).toBe(false);
        expect(body.message).toBe("Unauthorized");
      });

      it("should return 400 when tenant not found", async () => {
        vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

        const response = await simulateRouteHandler(
          "create",
          makeRequest(transactionData),
          "InventoryTransaction"
        );
        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.success).toBe(false);
        expect(body.message).toBe("Tenant not found");
      });

      it("should create transaction and return success", async () => {
        mockRuntimeSuccess(transactionData);

        const response = await simulateRouteHandler(
          "create",
          makeRequest(transactionData),
          "InventoryTransaction"
        );
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.result).toEqual(transactionData);
        expect(body.events).toHaveLength(1);
      });

      it("should pass correct entityName to runtime", async () => {
        mockRuntimeSuccess(transactionData);

        await simulateRouteHandler(
          "create",
          makeRequest(transactionData),
          "InventoryTransaction"
        );

        expect(mockRunCommand).toHaveBeenCalledWith("create", transactionData, {
          entityName: "InventoryTransaction",
        });
      });

      it("should return 403 on policy denial", async () => {
        mockRuntimePolicyDenial("TransactionWritePolicy");

        const response = await simulateRouteHandler(
          "create",
          makeRequest(transactionData),
          "InventoryTransaction"
        );
        expect(response.status).toBe(403);
        expect((await response.json()).message).toContain("Access denied");
      });

      it("should return 422 on guard failure", async () => {
        mockRuntimeGuardFailure(1, "quantity must be positive");

        const response = await simulateRouteHandler(
          "create",
          makeRequest(transactionData),
          "InventoryTransaction"
        );
        expect(response.status).toBe(422);
        expect((await response.json()).message).toContain("Guard 1 failed");
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

    describe("PricingTier.create", () => {
      it("should return 401 for unauthenticated requests", async () => {
        vi.mocked(auth).mockResolvedValue({
          userId: null,
          orgId: null,
        } as never);

        const response = await simulateRouteHandler(
          "create",
          makeRequest(tierData),
          "PricingTier"
        );
        expect(response.status).toBe(401);
      });

      it("should create pricing tier successfully", async () => {
        mockRuntimeSuccess(tierData);

        const response = await simulateRouteHandler(
          "create",
          makeRequest(tierData),
          "PricingTier"
        );
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.result).toEqual(tierData);
      });

      it("should pass correct entityName and command to runtime", async () => {
        mockRuntimeSuccess(tierData);

        await simulateRouteHandler(
          "create",
          makeRequest(tierData),
          "PricingTier"
        );

        expect(mockRunCommand).toHaveBeenCalledWith("create", tierData, {
          entityName: "PricingTier",
        });
      });
    });

    describe("PricingTier.softDelete", () => {
      it("should soft-delete pricing tier successfully", async () => {
        const deleted = { ...tierData, deletedAt: new Date().toISOString() };
        mockRuntimeSuccess(deleted);

        const response = await simulateRouteHandler(
          "softDelete",
          makeRequest({ id: "tier-001" }),
          "PricingTier"
        );
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
      });

      it("should pass 'softDelete' command with PricingTier entity", async () => {
        mockRuntimeSuccess(tierData);

        await simulateRouteHandler(
          "softDelete",
          makeRequest({ id: "tier-001" }),
          "PricingTier"
        );

        expect(mockRunCommand).toHaveBeenCalledWith(
          "softDelete",
          { id: "tier-001" },
          { entityName: "PricingTier" }
        );
      });
    });

    describe("PricingTier.update", () => {
      it("should update pricing tier successfully", async () => {
        const updated = { ...tierData, discountPercent: 10 };
        mockRuntimeSuccess(updated);

        const response = await simulateRouteHandler(
          "update",
          makeRequest({ id: "tier-001", discountPercent: 10 }),
          "PricingTier"
        );
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.result.discountPercent).toBe(10);
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

    describe("BulkOrderRule.create", () => {
      it("should return 401 for unauthenticated requests", async () => {
        vi.mocked(auth).mockResolvedValue({
          userId: null,
          orgId: null,
        } as never);

        const response = await simulateRouteHandler(
          "create",
          makeRequest(ruleData),
          "BulkOrderRule"
        );
        expect(response.status).toBe(401);
      });

      it("should create bulk order rule successfully", async () => {
        mockRuntimeSuccess(ruleData);

        const response = await simulateRouteHandler(
          "create",
          makeRequest(ruleData),
          "BulkOrderRule"
        );
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.result).toEqual(ruleData);
        expect(body.events).toHaveLength(1);
      });

      it("should pass correct entityName to runtime", async () => {
        mockRuntimeSuccess(ruleData);

        await simulateRouteHandler(
          "create",
          makeRequest(ruleData),
          "BulkOrderRule"
        );

        expect(mockRunCommand).toHaveBeenCalledWith("create", ruleData, {
          entityName: "BulkOrderRule",
        });
      });

      it("should return 403 on policy denial", async () => {
        mockRuntimePolicyDenial("BulkOrderPolicy");

        const response = await simulateRouteHandler(
          "create",
          makeRequest(ruleData),
          "BulkOrderRule"
        );
        expect(response.status).toBe(403);
        expect((await response.json()).message).toContain("Access denied");
      });

      it("should return 422 on guard failure", async () => {
        mockRuntimeGuardFailure(0, "minQuantity must be > 0");

        const response = await simulateRouteHandler(
          "create",
          makeRequest(ruleData),
          "BulkOrderRule"
        );
        expect(response.status).toBe(422);
        expect((await response.json()).message).toContain("Guard 0 failed");
      });
    });

    describe("BulkOrderRule.softDelete", () => {
      it("should soft-delete bulk order rule successfully", async () => {
        const deleted = { ...ruleData, deletedAt: new Date().toISOString() };
        mockRuntimeSuccess(deleted);

        const response = await simulateRouteHandler(
          "softDelete",
          makeRequest({ id: "rule-001" }),
          "BulkOrderRule"
        );
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
      });

      it("should pass 'softDelete' command with BulkOrderRule entity", async () => {
        mockRuntimeSuccess(ruleData);

        await simulateRouteHandler(
          "softDelete",
          makeRequest({ id: "rule-001" }),
          "BulkOrderRule"
        );

        expect(mockRunCommand).toHaveBeenCalledWith(
          "softDelete",
          { id: "rule-001" },
          { entityName: "BulkOrderRule" }
        );
      });
    });

    describe("BulkOrderRule.update", () => {
      it("should update bulk order rule successfully", async () => {
        const updated = { ...ruleData, discountPercent: 20 };
        mockRuntimeSuccess(updated);

        const response = await simulateRouteHandler(
          "update",
          makeRequest({ id: "rule-001", discountPercent: 20 }),
          "BulkOrderRule"
        );
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.result.discountPercent).toBe(20);
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

    describe("VendorCatalog.create", () => {
      it("should return 401 for unauthenticated requests", async () => {
        vi.mocked(auth).mockResolvedValue({
          userId: null,
          orgId: null,
        } as never);

        const response = await simulateRouteHandler(
          "create",
          makeRequest(catalogData),
          "VendorCatalog"
        );
        expect(response.status).toBe(401);
      });

      it("should create vendor catalog entry successfully", async () => {
        mockRuntimeSuccess(catalogData);

        const response = await simulateRouteHandler(
          "create",
          makeRequest(catalogData),
          "VendorCatalog"
        );
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.result).toEqual(catalogData);
        expect(body.events).toHaveLength(1);
      });

      it("should pass correct entityName to runtime", async () => {
        mockRuntimeSuccess(catalogData);

        await simulateRouteHandler(
          "create",
          makeRequest(catalogData),
          "VendorCatalog"
        );

        expect(mockRunCommand).toHaveBeenCalledWith("create", catalogData, {
          entityName: "VendorCatalog",
        });
      });

      it("should return 403 on policy denial", async () => {
        mockRuntimePolicyDenial("VendorCatalogWritePolicy");

        const response = await simulateRouteHandler(
          "create",
          makeRequest(catalogData),
          "VendorCatalog"
        );
        expect(response.status).toBe(403);
        expect((await response.json()).message).toContain("Access denied");
      });

      it("should return 422 on guard failure", async () => {
        mockRuntimeGuardFailure(2, "price must be positive");

        const response = await simulateRouteHandler(
          "create",
          makeRequest(catalogData),
          "VendorCatalog"
        );
        expect(response.status).toBe(422);
        expect((await response.json()).message).toContain("Guard 2 failed");
      });
    });

    describe("VendorCatalog.softDelete", () => {
      it("should soft-delete vendor catalog entry successfully", async () => {
        const deleted = {
          ...catalogData,
          deletedAt: new Date().toISOString(),
        };
        mockRuntimeSuccess(deleted);

        const response = await simulateRouteHandler(
          "softDelete",
          makeRequest({ id: "catalog-001" }),
          "VendorCatalog"
        );
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
      });

      it("should pass 'softDelete' command with VendorCatalog entity", async () => {
        mockRuntimeSuccess(catalogData);

        await simulateRouteHandler(
          "softDelete",
          makeRequest({ id: "catalog-001" }),
          "VendorCatalog"
        );

        expect(mockRunCommand).toHaveBeenCalledWith(
          "softDelete",
          { id: "catalog-001" },
          { entityName: "VendorCatalog" }
        );
      });
    });

    describe("VendorCatalog.update", () => {
      it("should update vendor catalog entry successfully", async () => {
        const updated = { ...catalogData, price: 14.99 };
        mockRuntimeSuccess(updated);

        const response = await simulateRouteHandler(
          "update",
          makeRequest({ id: "catalog-001", price: 14.99 }),
          "VendorCatalog"
        );
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.result.price).toBe(14.99);
      });
    });
  });

  // =========================================================================
  // Cross-domain: Tenant Isolation
  // =========================================================================

  describe("Tenant isolation", () => {
    it("should pass the correct tenant ID for supplier create under a different org", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: "user_other",
        orgId: "org_other",
      } as never);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(OTHER_TENANT_ID as never);
      mockRuntimeSuccess({
        id: "supplier-other",
        tenantId: OTHER_TENANT_ID,
      });

      await simulateRouteHandler(
        "create",
        makeRequest({ name: "Other Org Supplier" }),
        "InventorySupplier"
      );

      expect(createManifestRuntime).toHaveBeenCalledWith({
        user: { id: "user_other", tenantId: OTHER_TENANT_ID },
      });
    });

    it("should not leak cross-tenant data in transaction create", async () => {
      mockRuntimeSuccess({
        id: "txn-a",
        tenantId: TEST_TENANT_ID,
        type: "INBOUND",
      });

      const response = await simulateRouteHandler(
        "create",
        makeRequest({ itemId: "item-1", type: "INBOUND", quantity: 10 }),
        "InventoryTransaction"
      );
      const body = await response.json();

      // Verify the runtime was scoped to tenant A
      expect(createManifestRuntime).toHaveBeenCalledWith({
        user: { id: TEST_USER_ID, tenantId: TEST_TENANT_ID },
      });
      // Verify result came from tenant A's context
      expect(body.result.tenantId).toBe(TEST_TENANT_ID);
    });

    it("should reject unauthenticated access even with valid-looking body", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const response = await simulateRouteHandler(
        "create",
        makeRequest({
          supplierId: "supplier-001",
          itemId: "item-001",
          price: 9.99,
        }),
        "VendorCatalog"
      );

      expect(response.status).toBe(401);
      // Runtime should never be called
      expect(createManifestRuntime).not.toHaveBeenCalled();
    });
  });
});
