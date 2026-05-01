/**
 * Inventory Extended API Tests
 *
 * Tests for inventory suppliers, inventory transactions, pricing tiers,
 * bulk order rules, and vendor catalog command handlers.
 *
 * All route handlers follow the auto-generated manifest pattern:
 *   auth -> tenant lookup -> createManifestRuntime -> runCommand
 */

import { database } from "@repo/database";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
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
        { status },
      ),
    manifestErrorResponse: (message: string, status: number) =>
      NextResponse.json({ success: false, message }, { status }),
  };
});

// Mock manifest runtime with controllable runCommand
const mockRunCommand = vi.fn();
vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(() =>
    Promise.resolve({ runCommand: mockRunCommand }),
  ),
}));

// Import mocked modules
const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg } = await import("@/app/lib/tenant");
const { createManifestRuntime } = await import("@/lib/manifest-runtime");

// Import route handlers
// InventorySupplier
import { POST as supplierCreate } from "@/app/api/inventorysupplier/create/route";
import { POST as supplierDeactivate } from "@/app/api/inventorysupplier/deactivate/route";
import { POST as supplierUpdate } from "@/app/api/inventorysupplier/update/route";
// InventoryTransaction
import { POST as transactionCreate } from "@/app/api/inventorytransaction/create/route";
// PricingTier
import { POST as pricingTierCreate } from "@/app/api/pricingtier/create/route";
import { POST as pricingTierSoftDelete } from "@/app/api/pricingtier/soft-delete/route";
import { POST as pricingTierUpdate } from "@/app/api/pricingtier/update/route";
// BulkOrderRule
import { POST as bulkOrderCreate } from "@/app/api/bulkorderrule/create/route";
import { POST as bulkOrderSoftDelete } from "@/app/api/bulkorderrule/soft-delete/route";
import { POST as bulkOrderUpdate } from "@/app/api/bulkorderrule/update/route";
// VendorCatalog
import { POST as vendorCatalogCreate } from "@/app/api/vendorcatalog/create/route";
import { POST as vendorCatalogSoftDelete } from "@/app/api/vendorcatalog/soft-delete/route";
import { POST as vendorCatalogUpdate } from "@/app/api/vendorcatalog/update/route";

// --- Constants ---

const TEST_TENANT_ID = "00000000-0000-0000-0000-000000000040";
const TEST_USER_ID = "user_inventory_ext_001";
const TEST_ORG_ID = "org_inventory_ext_001";
const OTHER_TENANT_ID = "00000000-0000-0000-0000-000000000099";

// --- Helpers ---

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/test", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function successResult(data: Record<string, unknown>) {
  return {
    success: true,
    result: data,
    emittedEvents: [{ type: "created", payload: data }],
    policyDenial: null,
    guardFailure: null,
    error: null,
  };
}

function errorResult(error: string) {
  return {
    success: false,
    result: null,
    emittedEvents: [],
    policyDenial: null,
    guardFailure: null,
    error,
  };
}

function policyDenialResult(policyName: string) {
  return {
    success: false,
    result: null,
    emittedEvents: [],
    policyDenial: { policyName, reason: "denied" },
    guardFailure: null,
    error: null,
  };
}

function guardFailureResult(index: number, formatted: string) {
  return {
    success: false,
    result: null,
    emittedEvents: [],
    policyDenial: null,
    guardFailure: { index, formatted },
    error: null,
  };
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

    describe("POST /inventorysupplier/create", () => {
      it("should return 401 for unauthenticated requests", async () => {
        vi.mocked(auth).mockResolvedValue({
          userId: null,
          orgId: null,
        } as never);

        const response = await supplierCreate(makeRequest(supplierData));
        expect(response.status).toBe(401);
        const body = await response.json();
        expect(body.success).toBe(false);
        expect(body.message).toBe("Unauthorized");
      });

      it("should return 400 when tenant not found", async () => {
        vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

        const response = await supplierCreate(makeRequest(supplierData));
        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.success).toBe(false);
        expect(body.message).toBe("Tenant not found");
      });

      it("should create supplier and return success with events", async () => {
        mockRunCommand.mockResolvedValue(successResult(supplierData));

        const response = await supplierCreate(makeRequest(supplierData));
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.result).toEqual(supplierData);
        expect(body.events).toHaveLength(1);
      });

      it("should pass correct entityName to runtime", async () => {
        mockRunCommand.mockResolvedValue(successResult(supplierData));

        await supplierCreate(makeRequest(supplierData));

        expect(createManifestRuntime).toHaveBeenCalledWith({
          user: { id: TEST_USER_ID, tenantId: TEST_TENANT_ID },
        });
        expect(mockRunCommand).toHaveBeenCalledWith(
          "create",
          supplierData,
          { entityName: "InventorySupplier" },
        );
      });

      it("should return 500 on runtime error", async () => {
        vi.mocked(getTenantIdForOrg).mockRejectedValue(
          new Error("DB down") as never,
        );

        const response = await supplierCreate(makeRequest(supplierData));
        expect(response.status).toBe(500);
        const body = await response.json();
        expect(body.success).toBe(false);
        expect(body.message).toBe("Internal server error");
      });

      it("should return 403 on policy denial", async () => {
        mockRunCommand.mockResolvedValue(
          policyDenialResult("SupplierWritePolicy"),
        );

        const response = await supplierCreate(makeRequest(supplierData));
        expect(response.status).toBe(403);
        const body = await response.json();
        expect(body.success).toBe(false);
        expect(body.message).toContain("Access denied");
        expect(body.message).toContain("SupplierWritePolicy");
      });

      it("should return 422 on guard failure", async () => {
        mockRunCommand.mockResolvedValue(
          guardFailureResult(0, "name is required"),
        );

        const response = await supplierCreate(makeRequest(supplierData));
        expect(response.status).toBe(422);
        const body = await response.json();
        expect(body.success).toBe(false);
        expect(body.message).toContain("Guard 0 failed");
      });

      it("should return 400 on command failure without policy/guard", async () => {
        mockRunCommand.mockResolvedValue(errorResult("Duplicate supplier"));

        const response = await supplierCreate(makeRequest(supplierData));
        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.success).toBe(false);
        expect(body.message).toBe("Duplicate supplier");
      });
    });

    describe("POST /inventorysupplier/deactivate", () => {
      it("should return 401 for unauthenticated requests", async () => {
        vi.mocked(auth).mockResolvedValue({
          userId: null,
          orgId: null,
        } as never);

        const response = await supplierDeactivate(
          makeRequest({ id: "supplier-001" }),
        );
        expect(response.status).toBe(401);
      });

      it("should return 400 when tenant not found", async () => {
        vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

        const response = await supplierDeactivate(
          makeRequest({ id: "supplier-001" }),
        );
        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.message).toBe("Tenant not found");
      });

      it("should deactivate supplier successfully", async () => {
        const deactivated = { ...supplierData, active: false };
        mockRunCommand.mockResolvedValue(successResult(deactivated));

        const response = await supplierDeactivate(
          makeRequest({ id: "supplier-001" }),
        );
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.result.active).toBe(false);
      });

      it("should pass 'deactivate' command to runtime", async () => {
        mockRunCommand.mockResolvedValue(successResult(supplierData));

        await supplierDeactivate(makeRequest({ id: "supplier-001" }));

        expect(mockRunCommand).toHaveBeenCalledWith(
          "deactivate",
          { id: "supplier-001" },
          { entityName: "InventorySupplier" },
        );
      });

      it("should return 500 on unexpected error", async () => {
        mockRunCommand.mockRejectedValue(new Error("Runtime crash") as never);

        const response = await supplierDeactivate(
          makeRequest({ id: "supplier-001" }),
        );
        expect(response.status).toBe(500);
        const body = await response.json();
        expect(body.message).toBe("Internal server error");
      });

      it("should isolate tenant - passes tenant-scoped user context", async () => {
        mockRunCommand.mockResolvedValue(successResult(supplierData));

        await supplierDeactivate(makeRequest({ id: "supplier-001" }));

        expect(createManifestRuntime).toHaveBeenCalledWith({
          user: { id: TEST_USER_ID, tenantId: TEST_TENANT_ID },
        });
      });
    });

    describe("POST /inventorysupplier/update", () => {
      it("should return 401 for unauthenticated requests", async () => {
        vi.mocked(auth).mockResolvedValue({
          userId: null,
          orgId: null,
        } as never);

        const response = await supplierUpdate(
          makeRequest({ id: "supplier-001", name: "Updated" }),
        );
        expect(response.status).toBe(401);
      });

      it("should return 400 when tenant not found", async () => {
        vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

        const response = await supplierUpdate(
          makeRequest({ id: "supplier-001", name: "Updated" }),
        );
        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.message).toBe("Tenant not found");
      });

      it("should update supplier successfully", async () => {
        const updated = { ...supplierData, name: "Updated Produce Co" };
        mockRunCommand.mockResolvedValue(successResult(updated));

        const response = await supplierUpdate(
          makeRequest({ id: "supplier-001", name: "Updated Produce Co" }),
        );
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.result.name).toBe("Updated Produce Co");
      });

      it("should pass 'update' command to runtime", async () => {
        mockRunCommand.mockResolvedValue(successResult(supplierData));

        const updateBody = { id: "supplier-001", name: "Updated" };
        await supplierUpdate(makeRequest(updateBody));

        expect(mockRunCommand).toHaveBeenCalledWith(
          "update",
          updateBody,
          { entityName: "InventorySupplier" },
        );
      });

      it("should return 500 on unexpected error", async () => {
        mockRunCommand.mockRejectedValue(new Error("Runtime error") as never);

        const response = await supplierUpdate(
          makeRequest({ id: "supplier-001", name: "Updated" }),
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
        vi.mocked(auth).mockResolvedValue({
          userId: null,
          orgId: null,
        } as never);

        const response = await transactionCreate(
          makeRequest(transactionData),
        );
        expect(response.status).toBe(401);
        const body = await response.json();
        expect(body.success).toBe(false);
        expect(body.message).toBe("Unauthorized");
      });

      it("should return 400 when tenant not found", async () => {
        vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

        const response = await transactionCreate(
          makeRequest(transactionData),
        );
        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.success).toBe(false);
        expect(body.message).toBe("Tenant not found");
      });

      it("should create transaction and return success", async () => {
        mockRunCommand.mockResolvedValue(successResult(transactionData));

        const response = await transactionCreate(
          makeRequest(transactionData),
        );
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.result).toEqual(transactionData);
        expect(body.events).toHaveLength(1);
      });

      it("should pass correct entityName to runtime", async () => {
        mockRunCommand.mockResolvedValue(successResult(transactionData));

        await transactionCreate(makeRequest(transactionData));

        expect(mockRunCommand).toHaveBeenCalledWith(
          "create",
          transactionData,
          { entityName: "InventoryTransaction" },
        );
      });

      it("should return 500 on runtime error", async () => {
        mockRunCommand.mockRejectedValue(new Error("DB error") as never);

        const response = await transactionCreate(
          makeRequest(transactionData),
        );
        expect(response.status).toBe(500);
        const body = await response.json();
        expect(body.message).toBe("Internal server error");
      });

      it("should return 403 on policy denial", async () => {
        mockRunCommand.mockResolvedValue(
          policyDenialResult("TransactionWritePolicy"),
        );

        const response = await transactionCreate(
          makeRequest(transactionData),
        );
        expect(response.status).toBe(403);
        const body = await response.json();
        expect(body.message).toContain("Access denied");
        expect(body.message).toContain("TransactionWritePolicy");
      });

      it("should return 422 on guard failure", async () => {
        mockRunCommand.mockResolvedValue(
          guardFailureResult(1, "quantity must be positive"),
        );

        const response = await transactionCreate(
          makeRequest(transactionData),
        );
        expect(response.status).toBe(422);
        const body = await response.json();
        expect(body.message).toContain("Guard 1 failed");
      });

      it("should isolate tenant - passes tenant-scoped context", async () => {
        mockRunCommand.mockResolvedValue(successResult(transactionData));

        await transactionCreate(makeRequest(transactionData));

        expect(createManifestRuntime).toHaveBeenCalledWith({
          user: { id: TEST_USER_ID, tenantId: TEST_TENANT_ID },
        });
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
        vi.mocked(auth).mockResolvedValue({
          userId: null,
          orgId: null,
        } as never);

        const response = await pricingTierCreate(makeRequest(tierData));
        expect(response.status).toBe(401);
        const body = await response.json();
        expect(body.success).toBe(false);
        expect(body.message).toBe("Unauthorized");
      });

      it("should return 400 when tenant not found", async () => {
        vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

        const response = await pricingTierCreate(makeRequest(tierData));
        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.message).toBe("Tenant not found");
      });

      it("should create pricing tier successfully", async () => {
        mockRunCommand.mockResolvedValue(successResult(tierData));

        const response = await pricingTierCreate(makeRequest(tierData));
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.result).toEqual(tierData);
      });

      it("should pass correct entityName and command to runtime", async () => {
        mockRunCommand.mockResolvedValue(successResult(tierData));

        await pricingTierCreate(makeRequest(tierData));

        expect(mockRunCommand).toHaveBeenCalledWith(
          "create",
          tierData,
          { entityName: "PricingTier" },
        );
      });

      it("should return 500 on unexpected error", async () => {
        mockRunCommand.mockRejectedValue(new Error("Crash") as never);

        const response = await pricingTierCreate(makeRequest(tierData));
        expect(response.status).toBe(500);
        const body = await response.json();
        expect(body.message).toBe("Internal server error");
      });

      it("should return 400 on command failure", async () => {
        mockRunCommand.mockResolvedValue(
          errorResult("Tier already exists"),
        );

        const response = await pricingTierCreate(makeRequest(tierData));
        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.message).toBe("Tier already exists");
      });
    });

    describe("POST /pricingtier/soft-delete", () => {
      it("should return 401 for unauthenticated requests", async () => {
        vi.mocked(auth).mockResolvedValue({
          userId: null,
          orgId: null,
        } as never);

        const response = await pricingTierSoftDelete(
          makeRequest({ id: "tier-001" }),
        );
        expect(response.status).toBe(401);
      });

      it("should return 400 when tenant not found", async () => {
        vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

        const response = await pricingTierSoftDelete(
          makeRequest({ id: "tier-001" }),
        );
        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.message).toBe("Tenant not found");
      });

      it("should soft-delete pricing tier successfully", async () => {
        const deleted = { ...tierData, deletedAt: new Date().toISOString() };
        mockRunCommand.mockResolvedValue(successResult(deleted));

        const response = await pricingTierSoftDelete(
          makeRequest({ id: "tier-001" }),
        );
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
      });

      it("should pass 'softDelete' command with PricingTier entity", async () => {
        mockRunCommand.mockResolvedValue(successResult(tierData));

        await pricingTierSoftDelete(makeRequest({ id: "tier-001" }));

        expect(mockRunCommand).toHaveBeenCalledWith(
          "softDelete",
          { id: "tier-001" },
          { entityName: "PricingTier" },
        );
      });

      it("should return 500 on error", async () => {
        mockRunCommand.mockRejectedValue(new Error("DB error") as never);

        const response = await pricingTierSoftDelete(
          makeRequest({ id: "tier-001" }),
        );
        expect(response.status).toBe(500);
      });

      it("should isolate tenant via user context", async () => {
        mockRunCommand.mockResolvedValue(successResult(tierData));

        await pricingTierSoftDelete(makeRequest({ id: "tier-001" }));

        expect(createManifestRuntime).toHaveBeenCalledWith({
          user: { id: TEST_USER_ID, tenantId: TEST_TENANT_ID },
        });
      });
    });

    describe("POST /pricingtier/update", () => {
      it("should return 401 for unauthenticated requests", async () => {
        vi.mocked(auth).mockResolvedValue({
          userId: null,
          orgId: null,
        } as never);

        const response = await pricingTierUpdate(
          makeRequest({ id: "tier-001", discountPercent: 10 }),
        );
        expect(response.status).toBe(401);
      });

      it("should return 400 when tenant not found", async () => {
        vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

        const response = await pricingTierUpdate(
          makeRequest({ id: "tier-001", discountPercent: 10 }),
        );
        expect(response.status).toBe(400);
      });

      it("should update pricing tier successfully", async () => {
        const updated = { ...tierData, discountPercent: 10 };
        mockRunCommand.mockResolvedValue(successResult(updated));

        const response = await pricingTierUpdate(
          makeRequest({ id: "tier-001", discountPercent: 10 }),
        );
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.result.discountPercent).toBe(10);
      });

      it("should pass 'update' command to runtime", async () => {
        mockRunCommand.mockResolvedValue(successResult(tierData));

        const updateBody = { id: "tier-001", discountPercent: 10 };
        await pricingTierUpdate(makeRequest(updateBody));

        expect(mockRunCommand).toHaveBeenCalledWith(
          "update",
          updateBody,
          { entityName: "PricingTier" },
        );
      });

      it("should return 500 on unexpected error", async () => {
        mockRunCommand.mockRejectedValue(new Error("Oops") as never);

        const response = await pricingTierUpdate(
          makeRequest({ id: "tier-001", discountPercent: 10 }),
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
        vi.mocked(auth).mockResolvedValue({
          userId: null,
          orgId: null,
        } as never);

        const response = await bulkOrderCreate(makeRequest(ruleData));
        expect(response.status).toBe(401);
        const body = await response.json();
        expect(body.success).toBe(false);
        expect(body.message).toBe("Unauthorized");
      });

      it("should return 400 when tenant not found", async () => {
        vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

        const response = await bulkOrderCreate(makeRequest(ruleData));
        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.message).toBe("Tenant not found");
      });

      it("should create bulk order rule successfully", async () => {
        mockRunCommand.mockResolvedValue(successResult(ruleData));

        const response = await bulkOrderCreate(makeRequest(ruleData));
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.result).toEqual(ruleData);
        expect(body.events).toHaveLength(1);
      });

      it("should pass correct entityName to runtime", async () => {
        mockRunCommand.mockResolvedValue(successResult(ruleData));

        await bulkOrderCreate(makeRequest(ruleData));

        expect(mockRunCommand).toHaveBeenCalledWith(
          "create",
          ruleData,
          { entityName: "BulkOrderRule" },
        );
      });

      it("should return 500 on runtime error", async () => {
        mockRunCommand.mockRejectedValue(new Error("Fail") as never);

        const response = await bulkOrderCreate(makeRequest(ruleData));
        expect(response.status).toBe(500);
        const body = await response.json();
        expect(body.message).toBe("Internal server error");
      });

      it("should return 403 on policy denial", async () => {
        mockRunCommand.mockResolvedValue(
          policyDenialResult("BulkOrderPolicy"),
        );

        const response = await bulkOrderCreate(makeRequest(ruleData));
        expect(response.status).toBe(403);
        const body = await response.json();
        expect(body.message).toContain("Access denied");
        expect(body.message).toContain("BulkOrderPolicy");
      });

      it("should return 422 on guard failure", async () => {
        mockRunCommand.mockResolvedValue(
          guardFailureResult(0, "minQuantity must be > 0"),
        );

        const response = await bulkOrderCreate(makeRequest(ruleData));
        expect(response.status).toBe(422);
        const body = await response.json();
        expect(body.message).toContain("Guard 0 failed");
      });

      it("should return 400 on generic command failure", async () => {
        mockRunCommand.mockResolvedValue(
          errorResult("Overlapping rule exists"),
        );

        const response = await bulkOrderCreate(makeRequest(ruleData));
        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.message).toBe("Overlapping rule exists");
      });
    });

    describe("POST /bulkorderrule/soft-delete", () => {
      it("should return 401 for unauthenticated requests", async () => {
        vi.mocked(auth).mockResolvedValue({
          userId: null,
          orgId: null,
        } as never);

        const response = await bulkOrderSoftDelete(
          makeRequest({ id: "rule-001" }),
        );
        expect(response.status).toBe(401);
      });

      it("should return 400 when tenant not found", async () => {
        vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

        const response = await bulkOrderSoftDelete(
          makeRequest({ id: "rule-001" }),
        );
        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.message).toBe("Tenant not found");
      });

      it("should soft-delete bulk order rule successfully", async () => {
        const deleted = { ...ruleData, deletedAt: new Date().toISOString() };
        mockRunCommand.mockResolvedValue(successResult(deleted));

        const response = await bulkOrderSoftDelete(
          makeRequest({ id: "rule-001" }),
        );
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
      });

      it("should pass 'softDelete' command with BulkOrderRule entity", async () => {
        mockRunCommand.mockResolvedValue(successResult(ruleData));

        await bulkOrderSoftDelete(makeRequest({ id: "rule-001" }));

        expect(mockRunCommand).toHaveBeenCalledWith(
          "softDelete",
          { id: "rule-001" },
          { entityName: "BulkOrderRule" },
        );
      });

      it("should return 500 on error", async () => {
        mockRunCommand.mockRejectedValue(new Error("Error") as never);

        const response = await bulkOrderSoftDelete(
          makeRequest({ id: "rule-001" }),
        );
        expect(response.status).toBe(500);
      });

      it("should isolate tenant via user context", async () => {
        mockRunCommand.mockResolvedValue(successResult(ruleData));

        await bulkOrderSoftDelete(makeRequest({ id: "rule-001" }));

        expect(createManifestRuntime).toHaveBeenCalledWith({
          user: { id: TEST_USER_ID, tenantId: TEST_TENANT_ID },
        });
      });
    });

    describe("POST /bulkorderrule/update", () => {
      it("should return 401 for unauthenticated requests", async () => {
        vi.mocked(auth).mockResolvedValue({
          userId: null,
          orgId: null,
        } as never);

        const response = await bulkOrderUpdate(
          makeRequest({ id: "rule-001", discountPercent: 20 }),
        );
        expect(response.status).toBe(401);
      });

      it("should return 400 when tenant not found", async () => {
        vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

        const response = await bulkOrderUpdate(
          makeRequest({ id: "rule-001", discountPercent: 20 }),
        );
        expect(response.status).toBe(400);
      });

      it("should update bulk order rule successfully", async () => {
        const updated = { ...ruleData, discountPercent: 20 };
        mockRunCommand.mockResolvedValue(successResult(updated));

        const response = await bulkOrderUpdate(
          makeRequest({ id: "rule-001", discountPercent: 20 }),
        );
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.result.discountPercent).toBe(20);
      });

      it("should pass 'update' command to runtime", async () => {
        mockRunCommand.mockResolvedValue(successResult(ruleData));

        const updateBody = { id: "rule-001", discountPercent: 20 };
        await bulkOrderUpdate(makeRequest(updateBody));

        expect(mockRunCommand).toHaveBeenCalledWith(
          "update",
          updateBody,
          { entityName: "BulkOrderRule" },
        );
      });

      it("should return 500 on unexpected error", async () => {
        mockRunCommand.mockRejectedValue(new Error("Fail") as never);

        const response = await bulkOrderUpdate(
          makeRequest({ id: "rule-001", discountPercent: 20 }),
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
        vi.mocked(auth).mockResolvedValue({
          userId: null,
          orgId: null,
        } as never);

        const response = await vendorCatalogCreate(makeRequest(catalogData));
        expect(response.status).toBe(401);
        const body = await response.json();
        expect(body.success).toBe(false);
        expect(body.message).toBe("Unauthorized");
      });

      it("should return 400 when tenant not found", async () => {
        vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

        const response = await vendorCatalogCreate(makeRequest(catalogData));
        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.message).toBe("Tenant not found");
      });

      it("should create vendor catalog entry successfully", async () => {
        mockRunCommand.mockResolvedValue(successResult(catalogData));

        const response = await vendorCatalogCreate(makeRequest(catalogData));
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.result).toEqual(catalogData);
        expect(body.events).toHaveLength(1);
      });

      it("should pass correct entityName to runtime", async () => {
        mockRunCommand.mockResolvedValue(successResult(catalogData));

        await vendorCatalogCreate(makeRequest(catalogData));

        expect(mockRunCommand).toHaveBeenCalledWith(
          "create",
          catalogData,
          { entityName: "VendorCatalog" },
        );
      });

      it("should return 500 on runtime error", async () => {
        mockRunCommand.mockRejectedValue(new Error("DB fail") as never);

        const response = await vendorCatalogCreate(makeRequest(catalogData));
        expect(response.status).toBe(500);
        const body = await response.json();
        expect(body.message).toBe("Internal server error");
      });

      it("should return 403 on policy denial", async () => {
        mockRunCommand.mockResolvedValue(
          policyDenialResult("VendorCatalogWritePolicy"),
        );

        const response = await vendorCatalogCreate(makeRequest(catalogData));
        expect(response.status).toBe(403);
        const body = await response.json();
        expect(body.message).toContain("Access denied");
        expect(body.message).toContain("VendorCatalogWritePolicy");
      });

      it("should return 422 on guard failure", async () => {
        mockRunCommand.mockResolvedValue(
          guardFailureResult(2, "price must be positive"),
        );

        const response = await vendorCatalogCreate(makeRequest(catalogData));
        expect(response.status).toBe(422);
        const body = await response.json();
        expect(body.message).toContain("Guard 2 failed");
      });

      it("should return 400 on generic command failure", async () => {
        mockRunCommand.mockResolvedValue(
          errorResult("Duplicate catalog entry"),
        );

        const response = await vendorCatalogCreate(makeRequest(catalogData));
        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.message).toBe("Duplicate catalog entry");
      });
    });

    describe("POST /vendorcatalog/soft-delete", () => {
      it("should return 401 for unauthenticated requests", async () => {
        vi.mocked(auth).mockResolvedValue({
          userId: null,
          orgId: null,
        } as never);

        const response = await vendorCatalogSoftDelete(
          makeRequest({ id: "catalog-001" }),
        );
        expect(response.status).toBe(401);
      });

      it("should return 400 when tenant not found", async () => {
        vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

        const response = await vendorCatalogSoftDelete(
          makeRequest({ id: "catalog-001" }),
        );
        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.message).toBe("Tenant not found");
      });

      it("should soft-delete vendor catalog entry successfully", async () => {
        const deleted = {
          ...catalogData,
          deletedAt: new Date().toISOString(),
        };
        mockRunCommand.mockResolvedValue(successResult(deleted));

        const response = await vendorCatalogSoftDelete(
          makeRequest({ id: "catalog-001" }),
        );
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
      });

      it("should pass 'softDelete' command with VendorCatalog entity", async () => {
        mockRunCommand.mockResolvedValue(successResult(catalogData));

        await vendorCatalogSoftDelete(makeRequest({ id: "catalog-001" }));

        expect(mockRunCommand).toHaveBeenCalledWith(
          "softDelete",
          { id: "catalog-001" },
          { entityName: "VendorCatalog" },
        );
      });

      it("should return 500 on error", async () => {
        mockRunCommand.mockRejectedValue(new Error("Fail") as never);

        const response = await vendorCatalogSoftDelete(
          makeRequest({ id: "catalog-001" }),
        );
        expect(response.status).toBe(500);
      });

      it("should isolate tenant via user context", async () => {
        mockRunCommand.mockResolvedValue(successResult(catalogData));

        await vendorCatalogSoftDelete(makeRequest({ id: "catalog-001" }));

        expect(createManifestRuntime).toHaveBeenCalledWith({
          user: { id: TEST_USER_ID, tenantId: TEST_TENANT_ID },
        });
      });
    });

    describe("POST /vendorcatalog/update", () => {
      it("should return 401 for unauthenticated requests", async () => {
        vi.mocked(auth).mockResolvedValue({
          userId: null,
          orgId: null,
        } as never);

        const response = await vendorCatalogUpdate(
          makeRequest({ id: "catalog-001", price: 14.99 }),
        );
        expect(response.status).toBe(401);
      });

      it("should return 400 when tenant not found", async () => {
        vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

        const response = await vendorCatalogUpdate(
          makeRequest({ id: "catalog-001", price: 14.99 }),
        );
        expect(response.status).toBe(400);
      });

      it("should update vendor catalog entry successfully", async () => {
        const updated = { ...catalogData, price: 14.99 };
        mockRunCommand.mockResolvedValue(successResult(updated));

        const response = await vendorCatalogUpdate(
          makeRequest({ id: "catalog-001", price: 14.99 }),
        );
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.result.price).toBe(14.99);
      });

      it("should pass 'update' command to runtime", async () => {
        mockRunCommand.mockResolvedValue(successResult(catalogData));

        const updateBody = { id: "catalog-001", price: 14.99 };
        await vendorCatalogUpdate(makeRequest(updateBody));

        expect(mockRunCommand).toHaveBeenCalledWith(
          "update",
          updateBody,
          { entityName: "VendorCatalog" },
        );
      });

      it("should return 500 on unexpected error", async () => {
        mockRunCommand.mockRejectedValue(new Error("Fail") as never);

        const response = await vendorCatalogUpdate(
          makeRequest({ id: "catalog-001", price: 14.99 }),
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
      vi.mocked(auth).mockResolvedValue({
        userId: "user_other",
        orgId: "org_other",
      } as never);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(
        OTHER_TENANT_ID as never,
      );
      mockRunCommand.mockResolvedValue(
        successResult({ id: "supplier-other", tenantId: OTHER_TENANT_ID }),
      );

      await supplierCreate(
        makeRequest({ name: "Other Org Supplier" }),
      );

      expect(createManifestRuntime).toHaveBeenCalledWith({
        user: { id: "user_other", tenantId: OTHER_TENANT_ID },
      });
    });

    it("should not leak cross-tenant data in transaction create", async () => {
      // Tenant A creates a transaction
      mockRunCommand.mockResolvedValue(
        successResult({
          id: "txn-a",
          tenantId: TEST_TENANT_ID,
          type: "INBOUND",
        }),
      );

      const response = await transactionCreate(
        makeRequest({ itemId: "item-1", type: "INBOUND", quantity: 10 }),
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

      const response = await vendorCatalogCreate(
        makeRequest({
          supplierId: "supplier-001",
          itemId: "item-001",
          price: 9.99,
        }),
      );

      expect(response.status).toBe(401);
      // Runtime should never be called
      expect(createManifestRuntime).not.toHaveBeenCalled();
    });
  });
});
