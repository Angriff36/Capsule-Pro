import { readFileSync } from "node:fs";
import { join } from "node:path";
import { compileToIR } from "@angriff36/manifest/ir-compiler";
import { enforceCommandOwnership } from "@repo/manifest-runtime/ir-contract";
import { createCustomBuiltins } from "@repo/manifest-runtime/runtime-engine";
import { ManifestRuntimeEngine } from "@repo/manifest-runtime/runtime-engine";
import { createPrepInventoryDemandMiddleware } from "@repo/manifest-runtime/middleware";
import { describe, expect, it } from "vitest";
import { inMemoryStoreProvider } from "../test-helpers";

const TEST_TENANT_ID = "tenant-prep-demand";
const OTHER_TENANT_ID = "tenant-other";

async function buildRuntime() {
  const manifestRoot = join(process.cwd(), "../../manifest/source");
  const manifestFiles = [
    "prep-list-rules.manifest",
    "inventory-rules.manifest",
    "inventory-supplier-rules.manifest",
    "vendor-catalog-rules.manifest",
    "procurement-requisition-rules.manifest",
  ];
  const compiled = [];

  for (const file of manifestFiles) {
    const source = readFileSync(join(manifestRoot, file), "utf-8");
    const { ir, diagnostics } = await compileToIR(source);
    if (!ir) {
      throw new Error(
        diagnostics.map((diagnostic) => diagnostic.message).join("; ")
      );
    }
    compiled.push(enforceCommandOwnership(ir, file.replace(".manifest", "")));
  }

  const [base] = compiled;
  const mergedIr = {
    ...base,
    entities: compiled.flatMap((item) => item.entities),
    stores: compiled.flatMap((item) => item.stores),
    events: compiled.flatMap((item) => item.events),
    commands: compiled.flatMap((item) => item.commands),
    policies: compiled.flatMap((item) => item.policies),
    reactions: compiled.flatMap((item) => item.reactions ?? []),
  };

  const storeProvider = inMemoryStoreProvider();
  let runtime: ManifestRuntimeEngine;

  runtime = new ManifestRuntimeEngine(
    mergedIr,
    {
      user: {
        id: "kitchen-lead-001",
        tenantId: TEST_TENANT_ID,
        role: "kitchen_lead",
      },
    },
    {
      customBuiltins: createCustomBuiltins(),
      storeProvider,
      middleware: [
        createPrepInventoryDemandMiddleware({
          storeProvider,
          dispatchCommand: (commandName, input, options) =>
            runtime.runCommand(commandName, input, options),
        }),
      ],
    }
  );

  return { runtime, storeProvider };
}

describe("Prep list finalization derives inventory demand", () => {
  it("reserves inventory from prep-list item quantities without duplicate or cross-tenant demand", async () => {
    const { runtime, storeProvider } = await buildRuntime();
    const prepListId = "prep-list-demand-001";
    const eventId = "event-demand-001";
    const flourItemId = "inventory-flour";
    const butterItemId = "inventory-butter";
    const otherTenantItemId = "inventory-flour-other-tenant";

    await runtime.createInstance("InventoryItem", {
      id: flourItemId,
      tenantId: TEST_TENANT_ID,
      item_number: "FLOUR-001",
      name: "AP Flour",
      category: "dry-goods",
      unitOfMeasure: "kg",
      unitCost: 2,
      quantityOnHand: 20,
      quantityReserved: 0,
      parLevel: 5,
      reorder_level: 3,
    });

    await runtime.createInstance("InventoryItem", {
      id: butterItemId,
      tenantId: TEST_TENANT_ID,
      item_number: "BUTTER-001",
      name: "Butter",
      category: "dairy",
      unitOfMeasure: "kg",
      unitCost: 4,
      quantityOnHand: 12,
      quantityReserved: 1,
      parLevel: 4,
      reorder_level: 2,
    });

    await runtime.createInstance("InventorySupplier", {
      id: "supplier-us-foods",
      tenantId: TEST_TENANT_ID,
      name: "US Foods",
      supplierNumber: "USF-ACCOUNT-001",
      paymentTerms: "NET_30",
      isActive: true,
      qualificationStatus: "approved",
    });

    await runtime.createInstance("VendorCatalog", {
      id: "us-foods-flour-catalog",
      tenantId: TEST_TENANT_ID,
      supplierId: "supplier-us-foods",
      itemNumber: "FLOUR-001",
      itemName: "AP Flour",
      baseUnitCost: 2.5,
      currency: "USD",
      unitOfMeasure: "kg",
      leadTimeDays: 2,
      minimumOrderQuantity: 1,
      orderMultiple: 1,
      isActive: true,
      supplierSku: "USF-FLOUR-001",
      tags: ["us-foods"],
    });

    await runtime.createInstance("VendorCatalog", {
      id: "us-foods-butter-catalog",
      tenantId: TEST_TENANT_ID,
      supplierId: "supplier-us-foods",
      itemNumber: "BUTTER-001",
      itemName: "Butter",
      baseUnitCost: 5,
      currency: "USD",
      unitOfMeasure: "kg",
      leadTimeDays: 2,
      minimumOrderQuantity: 1,
      orderMultiple: 1,
      isActive: true,
      supplierSku: "USF-BUTTER-001",
      tags: ["us-foods"],
    });

    await runtime.createInstance("InventoryItem", {
      id: otherTenantItemId,
      tenantId: OTHER_TENANT_ID,
      item_number: "FLOUR-OTHER",
      name: "Other Tenant Flour",
      category: "dry-goods",
      unitOfMeasure: "kg",
      unitCost: 2,
      quantityOnHand: 50,
      quantityReserved: 0,
      parLevel: 5,
      reorder_level: 3,
    });

    await runtime.createInstance("PrepList", {
      id: prepListId,
      tenantId: TEST_TENANT_ID,
      eventId,
      name: "Banquet Prep",
      batchMultiplier: 2,
      totalItems: 2,
      totalEstimatedTime: 90,
      status: "draft",
      isActive: true,
    });

    await runtime.createInstance("PrepListItem", {
      id: "prep-item-flour",
      tenantId: TEST_TENANT_ID,
      prepListId,
      stationId: "station-pastry",
      stationName: "Pastry",
      ingredientId: flourItemId,
      ingredientName: "AP Flour",
      baseQuantity: 4,
      baseUnit: "kg",
      scaledQuantity: 8,
      scaledUnit: "kg",
      recipeVersionId: "recipe-version-cake",
      dishId: "dish-cake",
      dishName: "Cake",
      sortOrder: 1,
    });

    await runtime.createInstance("PrepListItem", {
      id: "prep-item-butter",
      tenantId: TEST_TENANT_ID,
      prepListId,
      stationId: "station-pastry",
      stationName: "Pastry",
      ingredientId: butterItemId,
      ingredientName: "Butter",
      baseQuantity: 2,
      baseUnit: "kg",
      scaledQuantity: 3,
      scaledUnit: "kg",
      recipeVersionId: "recipe-version-cake",
      dishId: "dish-cake",
      dishName: "Cake",
      sortOrder: 2,
    });

    await runtime.createInstance("PrepListItem", {
      id: "prep-item-other-tenant",
      tenantId: OTHER_TENANT_ID,
      prepListId,
      stationId: "station-other",
      stationName: "Other",
      ingredientId: otherTenantItemId,
      ingredientName: "Other Tenant Flour",
      baseQuantity: 30,
      baseUnit: "kg",
      scaledQuantity: 30,
      scaledUnit: "kg",
      recipeVersionId: "recipe-other",
      dishId: "dish-other",
      dishName: "Other Dish",
      sortOrder: 1,
    });

    const finalizeResult = await runtime.runCommand(
      "finalize",
      {},
      { entityName: "PrepList", instanceId: prepListId }
    );

    expect(finalizeResult.success).toBe(true);
    expect(finalizeResult.emittedEvents?.map((event) => event.name)).toEqual(
      expect.arrayContaining([
        "PrepListFinalized",
        "InventoryReserved",
        "InventoryReserved",
      ])
    );

    const inventoryStore = storeProvider("InventoryItem");
    await expect(inventoryStore.getById(flourItemId)).resolves.toMatchObject({
      tenantId: TEST_TENANT_ID,
      quantityReserved: 8,
    });
    await expect(inventoryStore.getById(butterItemId)).resolves.toMatchObject({
      tenantId: TEST_TENANT_ID,
      quantityReserved: 4,
    });
    await expect(
      inventoryStore.getById(otherTenantItemId)
    ).resolves.toMatchObject({
      tenantId: OTHER_TENANT_ID,
      quantityReserved: 0,
    });

    const requisitionStore = storeProvider("PurchaseRequisition");
    const requisitionItemStore = storeProvider("PurchaseRequisitionItem");
    const requisitions = await requisitionStore.getAll();
    const requisitionItems = await requisitionItemStore.getAll();

    expect(requisitions).toHaveLength(1);
    expect(requisitions[0]).toMatchObject({
      tenantId: TEST_TENANT_ID,
      requestedBy: "system:prep-demand",
      department: "kitchen",
      itemCategory: "prep-list-demand",
      status: "pending_manager",
      itemCount: 2,
      subtotal: 35,
      estimatedTotal: 35,
    });
    expect(String(requisitions[0].justification)).toContain(prepListId);
    expect(String(requisitions[0].justification)).toContain("US Foods");

    expect(requisitionItems).toHaveLength(2);
    expect(requisitionItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          tenantId: TEST_TENANT_ID,
          itemId: flourItemId,
          itemName: "AP Flour",
          quantityRequested: 8,
          estimatedUnitCost: 2.5,
          estimatedTotalCost: 20,
          suggestedVendorId: "supplier-us-foods",
          suggestedVendorName: "US Foods",
        }),
        expect.objectContaining({
          tenantId: TEST_TENANT_ID,
          itemId: butterItemId,
          itemName: "Butter",
          quantityRequested: 3,
          estimatedUnitCost: 5,
          estimatedTotalCost: 15,
          suggestedVendorId: "supplier-us-foods",
          suggestedVendorName: "US Foods",
        }),
      ])
    );

    const repeatedFinalizeResult = await runtime.runCommand(
      "finalize",
      {},
      { entityName: "PrepList", instanceId: prepListId }
    );

    expect(repeatedFinalizeResult.success).toBe(false);
    await expect(inventoryStore.getById(flourItemId)).resolves.toMatchObject({
      quantityReserved: 8,
    });
    await expect(inventoryStore.getById(butterItemId)).resolves.toMatchObject({
      quantityReserved: 4,
    });
    await expect(requisitionStore.getAll()).resolves.toHaveLength(1);
    await expect(requisitionItemStore.getAll()).resolves.toHaveLength(2);
  });
});
