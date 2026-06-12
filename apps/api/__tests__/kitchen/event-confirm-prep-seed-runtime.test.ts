/**
 * Full-chain conformance: confirming an event with a menu auto-creates its
 * prep list (declarative reaction EventConfirmed -> PrepList.create), the
 * seed middleware derives scaled ingredient items from the menu, and
 * finalizing that prep list grows the consolidated draft requisition.
 *
 * WHY: "an event should be known to the rest of the app" — the whole chain
 * must run from ONE governed Event.confirm with no hand-wired glue, and the
 * order side must stop at a reviewable DRAFT.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { compileToIR } from "@angriff36/manifest/ir-compiler";
import { enforceCommandOwnership } from "@repo/manifest-runtime/ir-contract";
import {
  createPrepInventoryDemandMiddleware,
  createPrepListSeedMiddleware,
  type PrepDemandDiagnostic,
  type PrepSeedDiagnostic,
} from "@repo/manifest-runtime/middleware";
import {
  createCustomBuiltins,
  ManifestRuntimeEngine,
} from "@repo/manifest-runtime/runtime-engine";
import { describe, expect, it } from "vitest";
import { inMemoryStoreProvider } from "../test-helpers";

const TEST_TENANT_ID = "tenant-prep-seed";

async function buildRuntime() {
  const manifestRoot = join(process.cwd(), "../../manifest/source");
  const manifestFiles = [
    "events/event-rules.manifest",
    "events/event-dish-rules.manifest",
    "kitchen/dish-rules.manifest",
    "kitchen/recipe-rules.manifest",
    "kitchen/ingredient-rules.manifest",
    "kitchen/prep-list-rules.manifest",
    "inventory/inventory-rules.manifest",
    "inventory/inventory-supplier-rules.manifest",
    "procurement/vendor-catalog-rules.manifest",
    "procurement/procurement-requisition-rules.manifest",
    "platform/reactions.manifest",
  ];
  const compiled = [];
  for (const file of manifestFiles) {
    const source = readFileSync(join(manifestRoot, file), "utf-8");
    const { ir, diagnostics } = await compileToIR(source);
    if (!ir) {
      throw new Error(
        `${file}: ${diagnostics.map((diagnostic) => diagnostic.message).join("; ")}`
      );
    }
    const manifestName = file.replace(".manifest", "").split("/").pop();
    compiled.push(enforceCommandOwnership(ir, manifestName));
  }

  const [base] = compiled;
  const mergedIr = {
    ...base,
    entities: compiled.flatMap((item) => item.entities),
    stores: compiled.flatMap((item) => item.stores),
    events: compiled.flatMap((item) => item.events),
    commands: compiled.flatMap((item) => item.commands),
    policies: compiled.flatMap((item) => item.policies),
    // Scope to the reaction under test — other production reactions target
    // entities not compiled into this fixture IR.
    reactions: compiled
      .flatMap((item) => item.reactions ?? [])
      .filter((reaction) => reaction.event === "EventConfirmed"),
  };
  expect(mergedIr.reactions).toHaveLength(1);

  const storeProvider = inMemoryStoreProvider();
  const seedDiagnostics: PrepSeedDiagnostic[] = [];
  const demandDiagnostics: PrepDemandDiagnostic[] = [];
  let runtime: ManifestRuntimeEngine;

  runtime = new ManifestRuntimeEngine(
    mergedIr,
    {
      tenantId: TEST_TENANT_ID,
      user: {
        id: "manager-001",
        tenantId: TEST_TENANT_ID,
        role: "manager",
      },
    },
    {
      customBuiltins: createCustomBuiltins(),
      storeProvider,
      // Mirror the factory default: the cascade (confirm -> reaction ->
      // seed dispatches -> finalize -> demand dispatches) shares ONE budget.
      evaluationLimits: { maxEvaluationSteps: 250_000 },
      middleware: [
        createPrepListSeedMiddleware({
          storeProvider,
          dispatchCommand: (commandName, input, options) =>
            runtime.runCommand(commandName, input, options),
          onDiagnostic: (diag) => seedDiagnostics.push(diag),
        }),
        createPrepInventoryDemandMiddleware({
          storeProvider,
          dispatchCommand: (commandName, input, options) =>
            runtime.runCommand(commandName, input, options),
          onDiagnostic: (diag) => demandDiagnostics.push(diag),
        }),
      ],
    }
  );

  return { runtime, storeProvider, seedDiagnostics, demandDiagnostics };
}

type Runtime = Awaited<ReturnType<typeof buildRuntime>>["runtime"];

async function seedMenuFixtures(runtime: Runtime, eventId: string) {
  await runtime.createInstance("Event", {
    id: eventId,
    tenantId: TEST_TENANT_ID,
    title: "Gala Dinner",
    eventType: "banquet",
    eventDate: Date.now() + 7 * 24 * 60 * 60 * 1000,
    guestCount: 50,
    status: "draft",
  });

  // --- Cake: two recipe versions; the LATEST (v2, yield 10) must win -------
  await runtime.createInstance("Dish", {
    id: "dish-cake",
    tenantId: TEST_TENANT_ID,
    name: "Wedding Cake",
    recipeId: "recipe-cake",
  });
  await runtime.createInstance("RecipeVersion", {
    id: "recipe-cake-v1",
    tenantId: TEST_TENANT_ID,
    recipeId: "recipe-cake",
    name: "Wedding Cake v1",
    versionNumber: 1,
    tags: "",
    yieldQuantity: 5,
  });
  await runtime.createInstance("RecipeVersion", {
    id: "recipe-cake-v2",
    tenantId: TEST_TENANT_ID,
    recipeId: "recipe-cake",
    name: "Wedding Cake v2",
    versionNumber: 2,
    tags: "",
    yieldQuantity: 10,
  });
  await runtime.createInstance("RecipeIngredient", {
    id: "ri-cake-flour",
    tenantId: TEST_TENANT_ID,
    recipeVersionId: "recipe-cake-v2",
    ingredientId: "ing-flour",
    quantity: 4,
    unitId: 1,
    sortOrder: 1,
  });
  await runtime.createInstance("RecipeIngredient", {
    id: "ri-cake-sugar",
    tenantId: TEST_TENANT_ID,
    recipeVersionId: "recipe-cake-v2",
    ingredientId: "ing-sugar",
    quantity: 1,
    unitId: 1,
    sortOrder: 2,
  });

  // --- Salad: single version, yield 5 --------------------------------------
  await runtime.createInstance("Dish", {
    id: "dish-salad",
    tenantId: TEST_TENANT_ID,
    name: "Garden Salad",
    recipeId: "recipe-salad",
  });
  await runtime.createInstance("RecipeVersion", {
    id: "recipe-salad-v1",
    tenantId: TEST_TENANT_ID,
    recipeId: "recipe-salad",
    name: "Garden Salad v1",
    versionNumber: 1,
    tags: "",
    yieldQuantity: 5,
  });
  await runtime.createInstance("RecipeIngredient", {
    id: "ri-salad-lettuce",
    tenantId: TEST_TENANT_ID,
    recipeVersionId: "recipe-salad-v1",
    ingredientId: "ing-lettuce",
    quantity: 3,
    unitId: 1,
    sortOrder: 1,
  });

  // --- Ingredients linked to inventory items --------------------------------
  const ingredients = [
    {
      id: "ing-flour",
      name: "AP Flour",
      category: "bake mix",
      allergens: "gluten",
      inventoryItemId: "inventory-flour",
    },
    {
      id: "ing-sugar",
      name: "Sugar",
      category: "baked goods",
      allergens: "",
      inventoryItemId: "inventory-sugar",
    },
    {
      id: "ing-lettuce",
      name: "Lettuce",
      category: "salad greens",
      allergens: "",
      inventoryItemId: "inventory-lettuce",
    },
  ];
  for (const ing of ingredients) {
    await runtime.createInstance("Ingredient", {
      tenantId: TEST_TENANT_ID,
      isActive: true,
      ...ing,
    });
  }

  const inventory = [
    {
      id: "inventory-flour",
      item_number: "FLOUR-001",
      name: "AP Flour",
      unitCost: 2,
      category: "dry-goods",
    },
    {
      id: "inventory-sugar",
      item_number: "SUGAR-001",
      name: "Sugar",
      unitCost: 1,
      category: "dry-goods",
    },
    {
      id: "inventory-lettuce",
      item_number: "LETTUCE-001",
      name: "Lettuce",
      unitCost: 2,
      category: "produce",
    },
  ];
  for (const item of inventory) {
    await runtime.createInstance("InventoryItem", {
      tenantId: TEST_TENANT_ID,
      unitOfMeasure: "kg",
      quantityOnHand: 50,
      quantityReserved: 0,
      parLevel: 5,
      reorder_level: 3,
      ...item,
    });
  }

  // --- Menu: cake feeds 20, salad feeds 10 ----------------------------------
  await runtime.createInstance("EventDish", {
    id: "event-dish-cake",
    tenantId: TEST_TENANT_ID,
    eventId,
    dishId: "dish-cake",
    quantityServings: 20,
  });
  await runtime.createInstance("EventDish", {
    id: "event-dish-salad",
    tenantId: TEST_TENANT_ID,
    eventId,
    dishId: "dish-salad",
    quantityServings: 10,
  });
}

async function seedUsFoods(runtime: Runtime) {
  await runtime.createInstance("InventorySupplier", {
    id: "supplier-us-foods",
    tenantId: TEST_TENANT_ID,
    name: "US Foods",
    supplierNumber: "USF-ACCOUNT-001",
    paymentTerms: "NET_30",
    isActive: true,
    qualificationStatus: "approved",
  });
  const catalog = [
    {
      id: "cat-flour",
      itemNumber: "FLOUR-001",
      itemName: "AP Flour",
      baseUnitCost: 2.5,
      supplierSku: "USF-FLOUR-001",
    },
    {
      id: "cat-sugar",
      itemNumber: "SUGAR-001",
      itemName: "Sugar",
      baseUnitCost: 1.5,
      supplierSku: "USF-SUGAR-001",
    },
    {
      id: "cat-lettuce",
      itemNumber: "LETTUCE-001",
      itemName: "Lettuce",
      baseUnitCost: 2,
      supplierSku: "USF-LETTUCE-001",
    },
  ];
  for (const row of catalog) {
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

describe("Event confirmation auto-seeds the prep list and feeds the order draft", () => {
  it("confirm -> reaction creates prep list -> middleware seeds scaled items -> finalize -> consolidated draft", async () => {
    const { runtime, storeProvider, seedDiagnostics } = await buildRuntime();
    const eventId = "event-gala-001";
    await seedMenuFixtures(runtime, eventId);
    await seedUsFoods(runtime);

    const confirmResult = await runtime.runCommand(
      "confirm",
      { userId: "manager-001" },
      { entityName: "Event", instanceId: eventId }
    );
    expect(confirmResult.success).toBe(true);

    // --- Prep list created by the reaction, titled + seeded by middleware ---
    const prepLists = await storeProvider("PrepList").getAll();
    expect(prepLists).toHaveLength(1);
    expect(prepLists[0]).toMatchObject({
      tenantId: TEST_TENANT_ID,
      eventId,
      name: "Gala Dinner - Prep List",
      status: "draft",
      totalItems: 3,
      isActive: true,
    });
    expect(String(prepLists[0].notes)).toContain("[auto-seed:event-confirmed]");
    const prepListId = String(prepLists[0].id);

    // --- Items: scaled = recipeQty * (servings / yield), latest version wins -
    const prepItems = await storeProvider("PrepListItem").getAll();
    expect(prepItems).toHaveLength(3);
    expect(prepItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          prepListId,
          ingredientId: "inventory-flour", // resolved to the INVENTORY id
          ingredientName: "AP Flour",
          scaledQuantity: 8, // 4 * (20 servings / yield 10) — v2, not v1
          scaledUnit: "kg",
          stationId: "bakery",
          stationName: "Bakery",
          allergens: "gluten",
          dishName: "Wedding Cake",
          recipeVersionId: "recipe-cake-v2",
        }),
        expect.objectContaining({
          ingredientId: "inventory-sugar",
          scaledQuantity: 2, // 1 * (20 / 10)
        }),
        expect.objectContaining({
          ingredientId: "inventory-lettuce",
          scaledQuantity: 6, // 3 * (10 servings / yield 5)
          stationId: "cold-prep",
          stationName: "Cold Prep",
        }),
      ])
    );
    expect(seedDiagnostics.filter((d) => d.stage === "done")).toHaveLength(1);

    // --- Full chain: finalize the auto-seeded list -> consolidated DRAFT ----
    const finalizeResult = await runtime.runCommand(
      "finalize",
      {},
      { entityName: "PrepList", instanceId: prepListId }
    );
    expect(finalizeResult.success).toBe(true);

    const requisitions = await storeProvider("PurchaseRequisition").getAll();
    expect(requisitions).toHaveLength(1);
    expect(requisitions[0]).toMatchObject({
      status: "draft", // reviewable — never auto-submitted
      itemCategory: "prep-list-demand",
      itemCount: 3,
      // flour 8kg @ 2.5 + sugar 2kg @ 1.5 + lettuce 6kg @ 2 = 20 + 3 + 12
      subtotal: 35,
      estimatedTotal: 35,
    });
    expect(String(requisitions[0].notes)).toContain(`[prep:${prepListId}]`);

    await expect(
      storeProvider("InventoryItem").getById("inventory-flour")
    ).resolves.toMatchObject({ quantityReserved: 8 });
  });

  it("confirming an event with no menu leaves a visible empty shell and a loud diagnostic", async () => {
    const { runtime, storeProvider, seedDiagnostics } = await buildRuntime();
    const eventId = "event-no-menu-001";
    await runtime.createInstance("Event", {
      id: eventId,
      tenantId: TEST_TENANT_ID,
      title: "Bare Event",
      eventType: "meeting",
      eventDate: Date.now() + 24 * 60 * 60 * 1000,
      guestCount: 10,
      status: "draft",
    });

    const confirmResult = await runtime.runCommand(
      "confirm",
      { userId: "manager-001" },
      { entityName: "Event", instanceId: eventId }
    );
    expect(confirmResult.success).toBe(true);

    const prepLists = await storeProvider("PrepList").getAll();
    expect(prepLists).toHaveLength(1);
    expect(prepLists[0]).toMatchObject({
      eventId,
      totalItems: 0,
      status: "draft",
    });
    expect(await storeProvider("PrepListItem").getAll()).toHaveLength(0);
    expect(
      seedDiagnostics.some(
        (d) =>
          d.stage === "derive" && d.reason.includes("no derivable menu demand")
      )
    ).toBe(true);
  });
});
