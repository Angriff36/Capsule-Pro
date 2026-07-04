import {
  createPrepInventoryDemandMiddleware,
  type PrepDemandDiagnostic,
} from "@repo/manifest-runtime/middleware";
import {
  createCustomBuiltins,
  ManifestRuntimeEngine,
} from "@repo/manifest-runtime/runtime-engine";
import { describe, expect, it } from "vitest";
import {
  compileManifestSourceForTest,
  inMemoryStoreProvider,
} from "../test-helpers";

const TEST_TENANT_ID = "tenant-prep-demand";

async function buildRuntime(options?: {
  resolveUnitConversion?: (
    fromUnit: string,
    toUnit: string
  ) => Promise<number | undefined>;
}) {
  const manifestFiles = [
    "kitchen/prep-list-rules.manifest",
    "inventory/inventory-rules.manifest",
    "inventory/inventory-supplier-rules.manifest",
    "procurement/vendor-catalog-rules.manifest",
    "procurement/procurement-requisition-rules.manifest",
  ];

  // Each source opens with `use "../_base.manifest"` and mixes TenantScoped /
  // SoftDeletable; compiler 2.18.6 can't resolve `use` in a bare single-source
  // compile, so inline `_base.manifest` per file via the shared helper before
  // merging the resulting IRs.
  const compiled = [];
  for (const file of manifestFiles) {
    compiled.push(await compileManifestSourceForTest(file));
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
          dispatchCommand: (commandName, input, opts) =>
            runtime.runCommand(commandName, input, opts),
          onDiagnostic: (diag) => diagnostics.push(diag),
          ...(options?.resolveUnitConversion
            ? { resolveUnitConversion: options.resolveUnitConversion }
            : {}),
        }),
      ],
    }
  );

  return { runtime, storeProvider, diagnostics };
}

type Runtime = Awaited<ReturnType<typeof buildRuntime>>["runtime"];

async function seedSuppliersAndCatalogs(runtime: Runtime) {
  await runtime.createInstance("InventorySupplier", {
    id: "supplier-us-foods",
    tenantId: TEST_TENANT_ID,
    name: "US Foods",
    supplierNumber: "USF-ACCOUNT-001",
    paymentTerms: "NET_30",
    isActive: true,
    qualificationStatus: "approved",
  });
  await runtime.createInstance("InventorySupplier", {
    id: "supplier-baldor",
    tenantId: TEST_TENANT_ID,
    name: "Baldor",
    supplierNumber: "BALDOR-001",
    paymentTerms: "NET_30",
    isActive: true,
    qualificationStatus: "approved",
  });

  // US Foods: flour packs in multiples of 5kg; butter has a 4kg MOQ.
  await runtime.createInstance("VendorCatalog", {
    id: "us-foods-flour-catalog",
    tenantId: TEST_TENANT_ID,
    supplierId: "supplier-us-foods",
    itemNumber: "FLOUR-001",
    itemName: "AP Flour",
    baseUnitCost: 2.5,
    supplierSku: "USF-FLOUR-001",
    currency: "USD",
    unitOfMeasure: "kg",
    leadTimeDays: 2,
    minimumOrderQuantity: 0,
    orderMultiple: 5,
    isActive: true,
    tags: ["us-foods"],
  });
  await runtime.createInstance("VendorCatalog", {
    id: "us-foods-butter-catalog",
    tenantId: TEST_TENANT_ID,
    supplierId: "supplier-us-foods",
    itemNumber: "BUTTER-001",
    itemName: "Butter",
    baseUnitCost: 5,
    supplierSku: "USF-BUTTER-001",
    currency: "USD",
    unitOfMeasure: "kg",
    leadTimeDays: 2,
    minimumOrderQuantity: 4,
    orderMultiple: 1,
    isActive: true,
    tags: ["us-foods"],
  });
  // Baldor: sugar by the kg, no pack constraints.
  await runtime.createInstance("VendorCatalog", {
    id: "baldor-sugar-catalog",
    tenantId: TEST_TENANT_ID,
    supplierId: "supplier-baldor",
    itemNumber: "SUGAR-001",
    itemName: "Sugar",
    baseUnitCost: 1.5,
    supplierSku: "BALDOR-SUGAR-001",
    currency: "USD",
    unitOfMeasure: "kg",
    leadTimeDays: 1,
    minimumOrderQuantity: 0,
    orderMultiple: 0,
    isActive: true,
    tags: [],
  });
}

async function seedInventory(runtime: Runtime) {
  // flour: 2kg free -> most demand must be purchased.
  await runtime.createInstance("InventoryItem", {
    id: "inventory-flour",
    tenantId: TEST_TENANT_ID,
    item_number: "FLOUR-001",
    name: "AP Flour",
    category: "dry-goods",
    unitOfMeasure: "kg",
    unitCost: 2,
    quantityOnHand: 2,
    quantityReserved: 0,
    parLevel: 5,
    reorder_level: 3,
    supplierId: "supplier-us-foods",
  });
  // butter: 1 on hand but already reserved -> zero free stock.
  await runtime.createInstance("InventoryItem", {
    id: "inventory-butter",
    tenantId: TEST_TENANT_ID,
    item_number: "BUTTER-001",
    name: "Butter",
    category: "dairy",
    unitOfMeasure: "kg",
    unitCost: 4,
    quantityOnHand: 1,
    quantityReserved: 1,
    parLevel: 4,
    reorder_level: 2,
    supplierId: "supplier-us-foods",
  });
  // sugar: belongs to the SECOND supplier (Baldor), 1kg free.
  await runtime.createInstance("InventoryItem", {
    id: "inventory-sugar",
    tenantId: TEST_TENANT_ID,
    item_number: "SUGAR-001",
    name: "Sugar",
    category: "dry-goods",
    unitOfMeasure: "kg",
    unitCost: 1,
    quantityOnHand: 1,
    quantityReserved: 0,
    parLevel: 5,
    reorder_level: 3,
    supplierId: "supplier-baldor",
  });
  // salt: NO supplier mapping -> must surface as UNRESOLVED, never guessed.
  await runtime.createInstance("InventoryItem", {
    id: "inventory-salt",
    tenantId: TEST_TENANT_ID,
    item_number: "SALT-001",
    name: "Salt",
    category: "dry-goods",
    unitOfMeasure: "kg",
    unitCost: 0.5,
    quantityOnHand: 0,
    quantityReserved: 0,
    parLevel: 1,
    reorder_level: 1,
  });
  // rice: plenty of free stock -> demand fully covered, nothing purchased.
  await runtime.createInstance("InventoryItem", {
    id: "inventory-rice",
    tenantId: TEST_TENANT_ID,
    item_number: "RICE-001",
    name: "Rice",
    category: "dry-goods",
    unitOfMeasure: "kg",
    unitCost: 1.2,
    quantityOnHand: 50,
    quantityReserved: 0,
    parLevel: 10,
    reorder_level: 5,
    supplierId: "supplier-us-foods",
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
    scaledUnit?: string;
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
      baseUnit: item.scaledUnit ?? "kg",
      scaledQuantity: item.scaledQuantity,
      scaledUnit: item.scaledUnit ?? "kg",
      recipeVersionId: "recipe-version-cake",
      dishId: "dish-cake",
      dishName: "Cake",
      sortOrder: index + 1,
    });
  }
}

async function finalize(runtime: Runtime, prepListId: string) {
  return await runtime.runCommand(
    "finalize",
    {},
    { entityName: "PrepList", instanceId: prepListId }
  );
}

describe("Prep list finalization derives inventory demand", () => {
  it("orders NET demand grouped per supplier with pack rounding, keeps unresolved lines separate, and never auto-submits", async () => {
    const { runtime, storeProvider, diagnostics } = await buildRuntime();
    await seedInventory(runtime);
    await seedSuppliersAndCatalogs(runtime);

    // --- Prep list 1: flour 8kg, butter 3kg, salt 1kg, rice 4kg -------------
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
      {
        id: "prep-item-salt-1",
        ingredientId: "inventory-salt",
        ingredientName: "Salt",
        scaledQuantity: 1,
      },
      {
        id: "prep-item-rice-1",
        ingredientId: "inventory-rice",
        ingredientName: "Rice",
        scaledQuantity: 4,
      },
    ]);

    const finalize1 = await finalize(runtime, "prep-list-demand-001");
    expect(finalize1.success).toBe(true);

    // Reservations are GROSS demand (stock is held for prep regardless of
    // what must be purchased).
    const inventoryStore = storeProvider("InventoryItem");
    await expect(
      inventoryStore.getById("inventory-flour")
    ).resolves.toMatchObject({ quantityReserved: 8 });
    await expect(
      inventoryStore.getById("inventory-rice")
    ).resolves.toMatchObject({ quantityReserved: 4 });

    const requisitionStore = storeProvider("PurchaseRequisition");
    const requisitionItemStore = storeProvider("PurchaseRequisitionItem");

    // WHY: purchasing must order what's MISSING, not what's needed — demand
    // minus free stock — grouped by the supplier that actually sells each
    // item, and pack-rounded so the order is actually purchasable:
    //   flour: 8 needed - 2 free = 6 -> orderMultiple 5 -> 10kg @ 2.5
    //   butter: 3 needed - 0 free = 3 -> MOQ 4 -> 4kg @ 5
    //   rice: 4 needed, 50 free -> fully covered, NO line
    //   salt: no supplier mapping -> UNRESOLVED draft, never guessed
    let requisitions = (await requisitionStore.getAll()) as Record<
      string,
      unknown
    >[];
    expect(requisitions).toHaveLength(2);

    const usFoodsDraft = requisitions.find(
      (r) => r.supplierId === "supplier-us-foods"
    );
    expect(usFoodsDraft).toMatchObject({
      tenantId: TEST_TENANT_ID,
      requestedBy: "system:prep-demand",
      itemCategory: "prep-list-demand",
      sourceType: "prep_demand",
      status: "draft",
      itemCount: 2,
      subtotal: 45, // flour 10*2.5=25 + butter 4*5=20
      estimatedTotal: 45,
    });
    expect(String(usFoodsDraft?.requisitionNumber)).toMatch(/^PREP-DRAFT-/);
    expect(String(usFoodsDraft?.notes)).toContain(
      "[prep:prep-list-demand-001]"
    );

    const unresolvedDraft = requisitions.find(
      (r) => r.sourceType === "prep_demand_unresolved"
    );
    expect(unresolvedDraft).toMatchObject({
      status: "draft",
      itemCount: 1,
    });
    expect(String(unresolvedDraft?.requisitionNumber)).toMatch(
      /^PREP-UNRESOLVED-/
    );

    // --- Prep list 2 (same week): flour 6kg more + sugar 2kg (Baldor) -------
    // WHY: ten prep lists at the start of a busy week must grow the SAME
    // per-supplier drafts (quantities merged, provenance accumulated), not
    // create ten requisitions the manager has to combine by hand.
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

    const finalize2 = await finalize(runtime, "prep-list-demand-002");
    expect(finalize2.success).toBe(true);

    requisitions = (await requisitionStore.getAll()) as Record<
      string,
      unknown
    >[];
    // us-foods draft (grown) + NEW baldor draft + unresolved draft
    expect(requisitions).toHaveLength(3);

    const usFoodsDraft2 = requisitions.find(
      (r) => r.supplierId === "supplier-us-foods"
    );
    // flour list 2: free stock now 0 (2 on hand, 8 reserved) -> net 6 ->
    // pack multiple 5 -> 10 more; merged line 10+10=20kg @ 2.5 = 50.
    expect(usFoodsDraft2).toMatchObject({
      status: "draft",
      itemCount: 2,
      subtotal: 70, // flour 20*2.5=50 + butter 4*5=20
    });
    expect(String(usFoodsDraft2?.notes)).toContain(
      "[prep:prep-list-demand-001]"
    );
    expect(String(usFoodsDraft2?.notes)).toContain(
      "[prep:prep-list-demand-002]"
    );

    const baldorDraft = requisitions.find(
      (r) => r.supplierId === "supplier-baldor"
    );
    // sugar: 2 needed - 1 free = 1kg @ 1.5
    expect(baldorDraft).toMatchObject({
      sourceType: "prep_demand",
      itemCount: 1,
      subtotal: 1.5,
    });

    const items = (await requisitionItemStore.getAll()) as Record<
      string,
      unknown
    >[];
    const flourLine = items.find((i) => i.itemId === "inventory-flour");
    expect(flourLine).toMatchObject({
      quantityRequested: 20,
      estimatedUnitCost: 2.5,
    });
    // WHY: an order line must explain which prep lists caused it — the
    // sourcePrepListIds provenance is the click-through path from a draft
    // order back to the operational demand behind it.
    expect(flourLine?.sourcePrepListIds).toEqual([
      "prep-list-demand-001",
      "prep-list-demand-002",
    ]);
    const saltLine = items.find((i) => i.itemId === "inventory-salt");
    expect(saltLine).toMatchObject({ quantityRequested: 1 });
    expect(String(saltLine?.notes)).toContain("UNRESOLVED");
    expect(String(saltLine?.notes)).toContain("no supplier mapping");

    const doneDiags = diagnostics.filter((d) => d.stage === "done");
    expect(doneDiags).toHaveLength(2);
    expect(doneDiags[1]?.reason).toContain("NOT submitted");
    const stockDiags = diagnostics.filter((d) => d.stage === "stock");
    expect(stockDiags.length).toBeGreaterThan(0); // rice covered by stock
  });

  it("re-finalizing an already-ingested prep list neither double-reserves nor double-orders", async () => {
    const { runtime, storeProvider, diagnostics } = await buildRuntime();
    await seedInventory(runtime);
    await seedSuppliersAndCatalogs(runtime);
    await seedPrepList(runtime, "prep-list-demand-001", "event-demand-001", [
      {
        id: "prep-item-flour-1",
        ingredientId: "inventory-flour",
        ingredientName: "AP Flour",
        scaledQuantity: 8,
      },
    ]);

    const first = await finalize(runtime, "prep-list-demand-001");
    expect(first.success).toBe(true);

    // Direct re-finalize fails the draft-status guard before the middleware runs.
    const guarded = await finalize(runtime, "prep-list-demand-001");
    expect(guarded.success).toBe(false);

    // Reopen -> finalize is a legal transition; the middleware's dedupe (which
    // runs BEFORE inventory reserves) must skip the whole ingest.
    const reopened = await runtime.runCommand(
      "reopen",
      { reason: "fix a quantity" },
      { entityName: "PrepList", instanceId: "prep-list-demand-001" }
    );
    expect(reopened.success).toBe(true);
    const refinalized = await finalize(runtime, "prep-list-demand-001");
    expect(refinalized.success).toBe(true);

    await expect(
      storeProvider("InventoryItem").getById("inventory-flour")
    ).resolves.toMatchObject({
      quantityReserved: 8, // not 16
    });
    const requisitionItems = await storeProvider(
      "PurchaseRequisitionItem"
    ).getAll();
    expect(requisitionItems).toHaveLength(1);
    // net 6 -> pack multiple 5 -> 10 (not 20)
    expect(requisitionItems[0]).toMatchObject({ quantityRequested: 10 });

    expect(diagnostics.some((d) => d.stage === "dedupe")).toBe(true);
  });

  it("puts every line on the UNRESOLVED draft (loudly) when no suppliers are configured", async () => {
    const { runtime, storeProvider, diagnostics } = await buildRuntime();
    await seedInventory(runtime);
    // NOTE: no suppliers / catalogs seeded.
    await seedPrepList(runtime, "prep-list-demand-001", "event-demand-001", [
      {
        id: "prep-item-flour-1",
        ingredientId: "inventory-flour",
        ingredientName: "AP Flour",
        scaledQuantity: 8,
      },
    ]);

    const result = await finalize(runtime, "prep-list-demand-001");
    expect(result.success).toBe(true);

    // Inventory is still reserved (reservation does not depend on the vendor)...
    await expect(
      storeProvider("InventoryItem").getById("inventory-flour")
    ).resolves.toMatchObject({ quantityReserved: 8 });
    // ...and the un-orderable demand is SURFACED on the unresolved draft
    // instead of silently dropped.
    const requisitions = (await storeProvider(
      "PurchaseRequisition"
    ).getAll()) as Record<string, unknown>[];
    expect(requisitions).toHaveLength(1);
    expect(requisitions[0]).toMatchObject({
      sourceType: "prep_demand_unresolved",
      itemCount: 1,
    });
    const items = await storeProvider("PurchaseRequisitionItem").getAll();
    expect(String((items[0] as Record<string, unknown>).notes)).toContain(
      "supplier"
    );
    expect(diagnostics.some((d) => d.stage === "order")).toBe(true);
  });

  it("converts prep units to the catalog's ordering unit via the injected conversion — and surfaces missing conversions as UNRESOLVED", async () => {
    // US Foods sells flour by the CASE; 1kg = 0.1 case. Butter's catalog is
    // also in cases but NO conversion path exists for it.
    const { runtime, storeProvider } = await buildRuntime({
      resolveUnitConversion: (from, to) =>
        Promise.resolve(from === "kg" && to === "case" ? 0.1 : undefined),
    });
    await seedInventory(runtime);
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
      id: "us-foods-flour-case-catalog",
      tenantId: TEST_TENANT_ID,
      supplierId: "supplier-us-foods",
      itemNumber: "FLOUR-001",
      itemName: "AP Flour (25kg case)",
      baseUnitCost: 60,
      supplierSku: "USF-FLOUR-CASE",
      currency: "USD",
      unitOfMeasure: "case",
      leadTimeDays: 2,
      minimumOrderQuantity: 1,
      orderMultiple: 1,
      isActive: true,
      tags: [],
    });
    await runtime.createInstance("VendorCatalog", {
      id: "us-foods-butter-case-catalog",
      tenantId: TEST_TENANT_ID,
      supplierId: "supplier-us-foods",
      itemNumber: "BUTTER-001",
      itemName: "Butter (case)",
      baseUnitCost: 90,
      supplierSku: "USF-BUTTER-CASE",
      currency: "USD",
      unitOfMeasure: "cases",
      leadTimeDays: 2,
      minimumOrderQuantity: 1,
      orderMultiple: 1,
      isActive: true,
      tags: [],
    });

    await seedPrepList(runtime, "prep-list-demand-001", "event-demand-001", [
      {
        id: "prep-item-flour-1",
        ingredientId: "inventory-flour",
        ingredientName: "AP Flour",
        scaledQuantity: 8, // net 6kg -> 0.6 case -> MOQ 1 -> 1 case @ 60
      },
      {
        id: "prep-item-butter-1",
        ingredientId: "inventory-butter",
        ingredientName: "Butter",
        scaledQuantity: 3, // kg -> "cases": no conversion -> UNRESOLVED
      },
    ]);

    const result = await finalize(runtime, "prep-list-demand-001");
    expect(result.success).toBe(true);

    const requisitions = (await storeProvider(
      "PurchaseRequisition"
    ).getAll()) as Record<string, unknown>[];
    expect(requisitions).toHaveLength(2);

    const usFoodsDraft = requisitions.find(
      (r) => r.supplierId === "supplier-us-foods"
    );
    // WHY: quantities must be converted with REAL conversion data before pack
    // rounding — a 6kg shortfall is 0.6 case, purchasable as 1 case.
    expect(usFoodsDraft).toMatchObject({ itemCount: 1, subtotal: 60 });

    const unresolvedDraft = requisitions.find(
      (r) => r.sourceType === "prep_demand_unresolved"
    );
    expect(unresolvedDraft).toBeDefined();
    const items = (await storeProvider(
      "PurchaseRequisitionItem"
    ).getAll()) as Record<string, unknown>[];
    const butterLine = items.find((i) => i.itemId === "inventory-butter");
    expect(String(butterLine?.notes)).toContain("no unit conversion");
  });
});
