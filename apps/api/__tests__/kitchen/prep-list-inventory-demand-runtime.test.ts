import { readFileSync } from "node:fs";
import { join } from "node:path";
import { compileToIR } from "@angriff36/manifest/ir-compiler";
import {
  createPrepInventoryDemandMiddleware,
  type PrepDemandDiagnostic,
} from "@repo/manifest-runtime/middleware";
import {
  createCustomBuiltins,
  ManifestRuntimeEngine,
} from "@repo/manifest-runtime/runtime-engine";
import { describe, expect, it } from "vitest";
import { inMemoryStoreProvider } from "../test-helpers";

const TEST_TENANT_ID = "tenant-prep-demand";

async function buildRuntime() {
  const manifestRoot = join(process.cwd(), "../../manifest/source");
  const manifestFiles = [
    "kitchen/prep-list-rules.manifest",
    "inventory/inventory-rules.manifest",
    "inventory/inventory-supplier-rules.manifest",
    "procurement/vendor-catalog-rules.manifest",
    "procurement/procurement-requisition-rules.manifest",
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
    compiled.push(ir);
  }

  const [base] = compiled;
  if (!base) {
    throw new Error("No manifest IR compiled");
  }
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
  const diagnostics: PrepDemandDiagnostic[] = [];
  let runtime: ManifestRuntimeEngine;

  runtime = new ManifestRuntimeEngine(
    mergedIr,
    {
      tenantId: TEST_TENANT_ID,
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
          onDiagnostic: (diag) => diagnostics.push(diag),
        }),
      ],
    }
  );

  return { runtime, storeProvider, diagnostics };
}

type Runtime = Awaited<ReturnType<typeof buildRuntime>>["runtime"];

async function seedUsFoodsSupplierAndCatalog(runtime: Runtime) {
  await runtime.createInstance("InventorySupplier", {
    id: "supplier-us-foods",
    tenantId: TEST_TENANT_ID,
    name: "US Foods",
    supplierNumber: "USF-ACCOUNT-001",
    paymentTerms: "NET_30",
    isActive: true,
    qualificationStatus: "approved",
  });

  const catalogRows = [
    {
      id: "us-foods-flour-catalog",
      itemNumber: "FLOUR-001",
      itemName: "AP Flour",
      baseUnitCost: 2.5,
      supplierSku: "USF-FLOUR-001",
    },
    {
      id: "us-foods-butter-catalog",
      itemNumber: "BUTTER-001",
      itemName: "Butter",
      baseUnitCost: 5,
      supplierSku: "USF-BUTTER-001",
    },
    {
      id: "us-foods-sugar-catalog",
      itemNumber: "SUGAR-001",
      itemName: "Sugar",
      baseUnitCost: 1.5,
      supplierSku: "USF-SUGAR-001",
    },
  ];
  for (const row of catalogRows) {
    await runtime.createInstance("VendorCatalog", {
      tenantId: TEST_TENANT_ID,
      supplierId: "supplier-us-foods",
      currency: "USD",
      unitOfMeasure: "kg",
      leadTimeDays: 2,
      minimumOrderQuantity: 1,
      orderMultiple: 1,
      isActive: true,
      tags: ["us-foods"],
      ...row,
    });
  }
}

async function seedInventory(runtime: Runtime) {
  await runtime.createInstance("InventoryItem", {
    id: "inventory-flour",
    tenantId: TEST_TENANT_ID,
    item_number: "FLOUR-001",
    name: "AP Flour",
    category: "dry-goods",
    unitOfMeasure: "kg",
    unitCost: 2,
    quantityOnHand: 40,
    quantityReserved: 0,
    parLevel: 5,
    reorder_level: 3,
  });
  await runtime.createInstance("InventoryItem", {
    id: "inventory-butter",
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
  await runtime.createInstance("InventoryItem", {
    id: "inventory-sugar",
    tenantId: TEST_TENANT_ID,
    item_number: "SUGAR-001",
    name: "Sugar",
    category: "dry-goods",
    unitOfMeasure: "kg",
    unitCost: 1,
    quantityOnHand: 30,
    quantityReserved: 0,
    parLevel: 5,
    reorder_level: 3,
  });
}

async function seedPrepList(
  runtime: Runtime,
  prepListId: string,
  eventId: string,
  items: Array<{
    id: string;
    ingredientId: string;
    ingredientName: string;
    scaledQuantity: number;
  }>
) {
  await runtime.createInstance("PrepList", {
    id: prepListId,
    tenantId: TEST_TENANT_ID,
    eventId,
    name: `Prep ${prepListId}`,
    batchMultiplier: 2,
    totalItems: items.length,
    totalEstimatedTime: 90,
    status: "draft",
    isActive: true,
  });
  for (const [index, item] of items.entries()) {
    await runtime.createInstance("PrepListItem", {
      id: item.id,
      tenantId: TEST_TENANT_ID,
      prepListId,
      stationId: "station-pastry",
      stationName: "Pastry",
      ingredientId: item.ingredientId,
      ingredientName: item.ingredientName,
      baseQuantity: item.scaledQuantity / 2,
      baseUnit: "kg",
      scaledQuantity: item.scaledQuantity,
      scaledUnit: "kg",
      recipeVersionId: "recipe-version-cake",
      dishId: "dish-cake",
      dishName: "Cake",
      sortOrder: index + 1,
    });
  }
}

describe("Prep list finalization derives inventory demand", () => {
  it("consolidates demand from multiple prep lists into ONE open draft requisition that is never auto-submitted", async () => {
    const { runtime, storeProvider, diagnostics } = await buildRuntime();
    await seedInventory(runtime);
    await seedUsFoodsSupplierAndCatalog(runtime);

    // --- Prep list 1: flour 8kg + butter 3kg --------------------------------
    await seedPrepList(runtime, "prep-list-demand-001", "event-demand-001", [
      {
        id: "prep-item-flour-1",
        ingredientId: "inventory-flour",
        ingredientName: "AP Flour",
        scaledQuantity: 8,
      },
      {
        id: "prep-item-butter-1",
        ingredientId: "inventory-butter",
        ingredientName: "Butter",
        scaledQuantity: 3,
      },
    ]);

    const finalize1 = await runtime.runCommand(
      "finalize",
      {},
      { entityName: "PrepList", instanceId: "prep-list-demand-001" }
    );
    expect(finalize1.success).toBe(true);
    expect(finalize1.emittedEvents?.map((event) => event.name)).toEqual(
      expect.arrayContaining([
        "PrepListFinalized",
        "InventoryReserved",
        "InventoryReserved",
      ])
    );

    const inventoryStore = storeProvider("InventoryItem");
    await expect(
      inventoryStore.getById("inventory-flour")
    ).resolves.toMatchObject({
      quantityReserved: 8,
    });
    await expect(
      inventoryStore.getById("inventory-butter")
    ).resolves.toMatchObject({
      quantityReserved: 4,
    });

    const requisitionStore = storeProvider("PurchaseRequisition");
    const requisitionItemStore = storeProvider("PurchaseRequisitionItem");

    let requisitions = await requisitionStore.getAll();
    expect(requisitions).toHaveLength(1);
    // WHY: the system produces a reviewable DRAFT — auto-submitting an order
    // without manager review is explicitly forbidden behavior.
    expect(requisitions[0]).toMatchObject({
      tenantId: TEST_TENANT_ID,
      requestedBy: "system:prep-demand",
      department: "kitchen",
      itemCategory: "prep-list-demand",
      status: "draft",
      itemCount: 2,
      subtotal: 35,
      estimatedTotal: 35,
    });
    expect(String(requisitions[0]!.requisitionNumber)).toMatch(/^PREP-DRAFT-/);
    expect(String(requisitions[0]!.justification)).toContain("US Foods");
    expect(String(requisitions[0]!.notes)).toContain(
      "[prep:prep-list-demand-001]"
    );

    // --- Prep list 2 (same week): flour 6kg more + sugar 2kg ----------------
    // WHY: ten prep lists at the start of a busy week must grow ONE order
    // draft (quantities merged per item), not create ten requisitions the
    // manager has to combine by hand.
    await seedPrepList(runtime, "prep-list-demand-002", "event-demand-002", [
      {
        id: "prep-item-flour-2",
        ingredientId: "inventory-flour",
        ingredientName: "AP Flour",
        scaledQuantity: 6,
      },
      {
        id: "prep-item-sugar-2",
        ingredientId: "inventory-sugar",
        ingredientName: "Sugar",
        scaledQuantity: 2,
      },
    ]);

    const finalize2 = await runtime.runCommand(
      "finalize",
      {},
      { entityName: "PrepList", instanceId: "prep-list-demand-002" }
    );
    expect(finalize2.success).toBe(true);

    requisitions = await requisitionStore.getAll();
    expect(requisitions).toHaveLength(1); // still ONE consolidated draft
    expect(requisitions[0]).toMatchObject({
      status: "draft",
      itemCount: 3,
      // flour 14kg @ 2.5 = 35, butter 3kg @ 5 = 15, sugar 2kg @ 1.5 = 3
      subtotal: 53,
      estimatedTotal: 53,
    });
    expect(String(requisitions[0]!.notes)).toContain(
      "[prep:prep-list-demand-001]"
    );
    expect(String(requisitions[0]!.notes)).toContain(
      "[prep:prep-list-demand-002]"
    );

    const requisitionItems = await requisitionItemStore.getAll();
    expect(requisitionItems).toHaveLength(3);
    expect(requisitionItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          itemId: "inventory-flour",
          quantityRequested: 14, // 8 + 6 merged
          estimatedUnitCost: 2.5,
          estimatedTotalCost: 35,
        }),
        expect.objectContaining({
          itemId: "inventory-butter",
          quantityRequested: 3,
        }),
        expect.objectContaining({
          itemId: "inventory-sugar",
          quantityRequested: 2,
          estimatedUnitCost: 1.5,
        }),
      ])
    );

    const doneDiags = diagnostics.filter((d) => d.stage === "done");
    expect(doneDiags).toHaveLength(2);
    expect(doneDiags[1]!.reason).toContain("NOT submitted");
    expect(doneDiags[1]!.reason).toContain("existing draft");
  });

  it("re-finalizing an already-ingested prep list neither double-reserves nor double-orders", async () => {
    const { runtime, storeProvider, diagnostics } = await buildRuntime();
    await seedInventory(runtime);
    await seedUsFoodsSupplierAndCatalog(runtime);
    await seedPrepList(runtime, "prep-list-demand-001", "event-demand-001", [
      {
        id: "prep-item-flour-1",
        ingredientId: "inventory-flour",
        ingredientName: "AP Flour",
        scaledQuantity: 8,
      },
    ]);

    const first = await runtime.runCommand(
      "finalize",
      {},
      { entityName: "PrepList", instanceId: "prep-list-demand-001" }
    );
    expect(first.success).toBe(true);

    // Direct re-finalize fails the draft-status guard before the middleware runs.
    const guarded = await runtime.runCommand(
      "finalize",
      {},
      { entityName: "PrepList", instanceId: "prep-list-demand-001" }
    );
    expect(guarded.success).toBe(false);

    // Reopen -> finalize is a legal transition; the middleware's dedupe (which
    // runs BEFORE inventory reserves) must skip the whole ingest.
    const reopened = await runtime.runCommand(
      "reopen",
      { reason: "fix a quantity" },
      { entityName: "PrepList", instanceId: "prep-list-demand-001" }
    );
    expect(reopened.success).toBe(true);
    const refinalized = await runtime.runCommand(
      "finalize",
      {},
      { entityName: "PrepList", instanceId: "prep-list-demand-001" }
    );
    expect(refinalized.success).toBe(true);

    const inventoryStore = storeProvider("InventoryItem");
    await expect(
      inventoryStore.getById("inventory-flour")
    ).resolves.toMatchObject({
      quantityReserved: 8, // not 16
    });
    const requisitionItems = await storeProvider(
      "PurchaseRequisitionItem"
    ).getAll();
    expect(requisitionItems).toHaveLength(1);
    expect(requisitionItems[0]).toMatchObject({ quantityRequested: 8 }); // not 16

    expect(diagnostics.some((d) => d.stage === "dedupe")).toBe(true);
  });

  it("reports a loud diagnostic instead of silently skipping when no US Foods supplier exists", async () => {
    const { runtime, storeProvider, diagnostics } = await buildRuntime();
    await seedInventory(runtime);
    // NOTE: no supplier / catalog seeded.
    await seedPrepList(runtime, "prep-list-demand-001", "event-demand-001", [
      {
        id: "prep-item-flour-1",
        ingredientId: "inventory-flour",
        ingredientName: "AP Flour",
        scaledQuantity: 8,
      },
    ]);

    const finalize = await runtime.runCommand(
      "finalize",
      {},
      { entityName: "PrepList", instanceId: "prep-list-demand-001" }
    );
    expect(finalize.success).toBe(true);

    // Inventory is still reserved (reservation does not depend on the vendor)...
    await expect(
      storeProvider("InventoryItem").getById("inventory-flour")
    ).resolves.toMatchObject({ quantityReserved: 8 });
    // ...but no order draft is produced, and the reason is visible.
    await expect(
      storeProvider("PurchaseRequisition").getAll()
    ).resolves.toHaveLength(0);
    const supplierDiag = diagnostics.find((d) => d.stage === "supplier");
    expect(supplierDiag?.reason).toContain("no active US Foods supplier");
  });
});
