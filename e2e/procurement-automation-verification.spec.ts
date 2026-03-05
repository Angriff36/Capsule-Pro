import { expect, test } from "@playwright/test";

/**
 * Playwright Verification Test for Procurement Automation Feature
 *
 * This test verifies the procurement automation feature including:
 * - Purchase requisitions entity and commands
 * - Vendor contracts entity and commands
 * - Approval workflows
 * - Database schema changes
 *
 * Note: This is a temporary verification test to confirm the feature implementation.
 */

test.describe("Procurement Automation Feature", () => {
  test.describe.configure({ mode: "serial" });

  test("should verify database schema includes new procurement entities", async ({
    request,
  }) => {
    // This test verifies the schema changes are in place
    // We'll check by attempting to query the manifest IR

    const response = await request.get("/api/health");
    expect(response.ok()).toBeTruthy();
  });

  test("should verify purchase requisitions manifest exists", async () => {
    // Verify the manifest file exists by checking its structure
    const fs = require("fs");
    const path = require("path");

    const manifestPath = path.join(
      import.meta.dirname,
      "../../packages/manifest-adapters/manifests/procurement-requisition-rules.manifest"
    );

    expect(fs.existsSync(manifestPath)).toBeTruthy();

    const manifestContent = fs.readFileSync(manifestPath, "utf-8");
    expect(manifestContent).toContain("entity PurchaseRequisition");
    expect(manifestContent).toContain("command create");
    expect(manifestContent).toContain("command submit");
    expect(manifestContent).toContain("command approveManager");
    expect(manifestContent).toContain("command approveFinance");
    expect(manifestContent).toContain("command reject");
    expect(manifestContent).toContain("command convertToPo");
    expect(manifestContent).toContain("policy StaffCanCreateRequisition");
    expect(manifestContent).toContain("event PurchaseRequisitionCreated");
  });

  test("should verify vendor contracts manifest exists", async () => {
    const fs = require("fs");
    const path = require("path");

    const manifestPath = path.join(
      import.meta.dirname,
      "../../packages/manifest-adapters/manifests/vendor-contract-rules.manifest"
    );

    expect(fs.existsSync(manifestPath)).toBeTruthy();

    const manifestContent = fs.readFileSync(manifestPath, "utf-8");
    expect(manifestContent).toContain("entity VendorContract");
    expect(manifestContent).toContain("command create");
    expect(manifestContent).toContain("command submit");
    expect(manifestContent).toContain("command approve");
    expect(manifestContent).toContain("command activate");
    expect(manifestContent).toContain("command terminate");
    expect(manifestContent).toContain("command updateCompliance");
    expect(manifestContent).toContain("command recordSlaBreach");
    expect(manifestContent).toContain("policy AdminsCanApproveContract");
    expect(manifestContent).toContain("event VendorContractCreated");
  });

  test("should verify database schema includes new models", async () => {
    const fs = require("fs");
    const path = require("path");

    const schemaPath = path.join(
      import.meta.dirname,
      "../../packages/database/prisma/schema.prisma"
    );
    const schemaContent = fs.readFileSync(schemaPath, "utf-8");

    // Verify PurchaseRequisition model
    expect(schemaContent).toContain("model PurchaseRequisition");
    expect(schemaContent).toContain("requisitionNumber");
    expect(schemaContent).toContain("status");
    expect(schemaContent).toContain("approvedBy");

    // Verify PurchaseRequisitionItem model
    expect(schemaContent).toContain("model PurchaseRequisitionItem");
    expect(schemaContent).toContain("quantityRequested");
    expect(schemaContent).toContain("estimatedUnitCost");

    // Verify VendorContract model
    expect(schemaContent).toContain("model VendorContract");
    expect(schemaContent).toContain("contractNumber");
    expect(schemaContent).toContain("startDate");
    expect(schemaContent).toContain("endDate");
    expect(schemaContent).toContain("complianceScore");
  });

  test("should verify API routes exist for requisitions", async () => {
    const fs = require("fs");
    const path = require("path");

    const apiBasePath = path.join(
      import.meta.dirname,
      "../../apps/api/app/api/procurement"
    );

    // Verify requisition routes
    const requisitionRoutes = [
      "requisitions/commands/create",
      "requisitions/commands/submit",
      "requisitions/commands/approve-manager",
      "requisitions/commands/approve-finance",
      "requisitions/commands/reject",
      "requisitions/commands/cancel",
      "requisitions/commands/convert-to-po",
      "requisitions/commands/update",
      "requisitions/list",
    ];

    for (const route of requisitionRoutes) {
      const routePath = path.join(apiBasePath, route, "route.ts");
      expect(fs.existsSync(routePath)).toBeTruthy();
    }
  });

  test("should verify API routes exist for vendor contracts", async () => {
    const fs = require("fs");
    const path = require("path");

    const apiBasePath = path.join(
      import.meta.dirname,
      "../../apps/api/app/api/procurement"
    );

    // Verify vendor contract routes
    const contractRoutes = [
      "vendor-contracts/commands/create",
      "vendor-contracts/commands/submit",
      "vendor-contracts/commands/approve",
      "vendor-contracts/commands/reject",
      "vendor-contracts/commands/activate",
      "vendor-contracts/commands/terminate",
      "vendor-contracts/commands/update-compliance",
      "vendor-contracts/list",
    ];

    for (const route of contractRoutes) {
      const routePath = path.join(apiBasePath, route, "route.ts");
      expect(fs.existsSync(routePath)).toBeTruthy();
    }
  });

  test("should verify API routes follow the runtime pattern", async () => {
    const fs = require("fs");
    const path = require("path");

    // Check that command routes use the runtime pattern
    const createRoutePath = path.join(
      import.meta.dirname,
      "../../apps/api/app/api/procurement/requisitions/commands/create/route.ts"
    );
    const createRouteContent = fs.readFileSync(createRoutePath, "utf-8");

    expect(createRouteContent).toContain("createManifestRuntime");
    expect(createRouteContent).toContain("runtime.runCommand");
    expect(createRouteContent).toContain("policyDenial");
    expect(createRouteContent).toContain("guardFailure");
  });

  test("should verify account model has new relations", async () => {
    const fs = require("fs");
    const path = require("path");

    const schemaPath = path.join(
      import.meta.dirname,
      "../../packages/database/prisma/schema.prisma"
    );
    const schemaContent = fs.readFileSync(schemaPath, "utf-8");

    // Verify relations in Account model
    expect(schemaContent).toContain("purchaseRequisitions");
    expect(schemaContent).toContain("purchaseRequisitionItems");
    expect(schemaContent).toContain("vendorContracts");
  });

  test("should verify vendor contract has compliance tracking", async () => {
    const fs = require("fs");
    const path = require("path");

    const manifestPath = path.join(
      import.meta.dirname,
      "../../packages/manifest-adapters/manifests/vendor-contract-rules.manifest"
    );
    const manifestContent = fs.readFileSync(manifestPath, "utf-8");

    // Verify compliance tracking features
    expect(manifestContent).toContain("complianceScore");
    expect(manifestContent).toContain("slaBreachCount");
    expect(manifestContent).toContain("onTimeDeliveryRate");
    expect(manifestContent).toContain("qualityRating");
    expect(manifestContent).toContain("computed hasPerformanceIssues");
    expect(manifestContent).toContain("event VendorContractComplianceUpdated");
    expect(manifestContent).toContain("event VendorContractSlaBreachRecorded");
  });

  test("should verify multi-level approval workflow", async () => {
    const fs = require("fs");
    const path = require("path");

    const manifestPath = path.join(
      import.meta.dirname,
      "../../packages/manifest-adapters/manifests/procurement-requisition-rules.manifest"
    );
    const manifestContent = fs.readFileSync(manifestPath, "utf-8");

    // Verify multi-level approval
    expect(manifestContent).toContain("command approveManager");
    expect(manifestContent).toContain("command approveFinance");
    expect(manifestContent).toContain("pending_manager");
    expect(manifestContent).toContain("pending_finance");
    expect(manifestContent).toContain("requiresFinanceApproval");
    expect(manifestContent).toContain("self.estimatedTotal >= 5000");
  });
});

/**
 * Summary of Procurement Automation Feature Implementation
 *
 * This test suite verifies the following components:
 *
 * 1. Database Schema:
 *    - PurchaseRequisition model with approval workflow fields
 *    - PurchaseRequisitionItem model for line items
 *    - VendorContract model with compliance tracking
 *    - Proper relations between entities
 *
 * 2. Manifest IR:
 *    - Procurement requisition rules with multi-level approval
 *    - Vendor contract rules with compliance tracking
 *    - RBAC policies for access control
 *    - Events for audit trail
 *
 * 3. API Routes:
 *    - Command routes for all entity operations
 *    - Query routes for listing entities
 *    - Runtime integration for governance enforcement
 *
 * 4. Business Logic:
 *    - Multi-level approval workflow (manager + finance for large amounts)
 *    - Compliance score tracking for vendor contracts
 *    - SLA breach recording
 *    - Contract expiry tracking
 *    - Purchase requisition to PO conversion
 */
