/**
 * Functional Test: Manifest runtime logic fixes for Recipe + Ingredient
 *
 * Regression guard for two silently-broken governed-logic bugs that were fixed
 * in `manifest/source/recipe-rules.manifest` and `ingredient-rules.manifest`:
 *
 *  1. RecipeVersion.totalTimeMinutes was a computed property HARDCODED to `0`
 *     instead of summing prepTimeMinutes + cookTimeMinutes + restTimeMinutes.
 *     The value surfaced to kitchen staff (and feeding the 8-hour
 *     `warnLongRecipe` heuristic) was always zero regardless of actual recipe
 *     times — a silent reporting bug.
 *
 *  2. Ingredient.recordLot accepted an `expiresAt` parameter but never assigned
 *     it to `currentLotExpiresAt`, so lot-expiry / FIFO food-safety tracking was
 *     a silent no-op. The param was validated by `warnNoExpiry` then thrown away.
 *
 * WHY this test lives at the runtime layer (not HTTP): both bugs live in the IR
 * command/computed SEMANTICS. An HTTP-status test would have returned 200 even
 * with the bug present (the command "succeeded", it just dropped the value).
 * Evaluating the computed and reading back the mutated instance is the only
 * place the regression is observable — so this is where it must be pinned.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { compileToIR } from "@angriff36/manifest/ir-compiler";
import { enforceCommandOwnership } from "@repo/manifest-runtime/ir-contract";
import { ManifestRuntimeEngine } from "@repo/manifest-runtime/runtime-engine";
import { describe, expect, it } from "vitest";
import { inMemoryStoreProvider } from "../test-helpers";

async function getRuntime(manifestFile: string) {
  const manifestPath = join(
    process.cwd(),
    "../../manifest/source",
    manifestFile
  );
  const source = readFileSync(manifestPath, "utf-8");
  const { ir, diagnostics } = await compileToIR(source);

  if (!ir) {
    throw new Error(
      `Failed to compile ${manifestFile}: ${diagnostics
        .map((d: { message: string }) => d.message)
        .join(", ")}`
    );
  }

  return new ManifestRuntimeEngine(
    enforceCommandOwnership(ir),
    {
      tenantId: "test-tenant-456",
      user: {
        id: "test-user-123",
        tenantId: "test-tenant-456",
        role: "admin",
      },
    },
    { storeProvider: inMemoryStoreProvider() }
  );
}

describe("Manifest Runtime - RecipeVersion.totalTimeMinutes computed", () => {
  it("sums prep + cook + rest time (regression: was hardcoded 0)", async () => {
    const runtime = await getRuntime("kitchen/recipe-rules.manifest");

    // Keep total <= 480 and difficulty < 4 to avoid the warn constraints, which
    // the current runtime treats as blocking on createInstance (see
    // MANIFEST_TESTING_NOTES.md).
    const created = await runtime.createInstance("RecipeVersion", {
      id: "rv-1",
      recipeId: "recipe-1",
      tenantId: "test-tenant-456",
      name: "Braised Short Rib",
      versionNumber: 1,
      tags: "",
      yieldQuantity: 4,
      prepTimeMinutes: 30,
      cookTimeMinutes: 45,
      restTimeMinutes: 15,
      difficultyLevel: 2,
      status: "draft",
    });
    expect(created).toBeDefined();

    const total = await runtime.evaluateComputed(
      "RecipeVersion",
      "rv-1",
      "totalTimeMinutes"
    );
    expect(total).toBe(90);
  });

  it("yields 0 only when all component times are 0", async () => {
    const runtime = await getRuntime("kitchen/recipe-rules.manifest");

    await runtime.createInstance("RecipeVersion", {
      id: "rv-2",
      recipeId: "recipe-1",
      tenantId: "test-tenant-456",
      name: "Instant Mix",
      versionNumber: 1,
      tags: "",
      yieldQuantity: 1,
      prepTimeMinutes: 0,
      cookTimeMinutes: 0,
      restTimeMinutes: 0,
      difficultyLevel: 1,
      status: "draft",
    });

    expect(
      await runtime.evaluateComputed("RecipeVersion", "rv-2", "totalTimeMinutes")
    ).toBe(0);
  });
});

describe("Manifest Runtime - Ingredient.recordLot persists expiry", () => {
  it("assigns expiresAt to currentLotExpiresAt (regression: was dropped)", async () => {
    const runtime = await getRuntime("kitchen/ingredient-rules.manifest");

    // shelfLifeDays > 0 avoids warnNoShelfLife; empty allergens avoids
    // warnMajorAllergen — both warn-level constraints block createInstance today.
    const created = await runtime.createInstance("Ingredient", {
      id: "ing-1",
      tenantId: "test-tenant-456",
      name: "Heavy Cream",
      defaultUnitId: 1,
      shelfLifeDays: 7,
      allergens: "",
      isActive: true,
    });
    expect(created).toBeDefined();

    const expiresAt = Date.now() + 7 * 86_400_000; // ~1 week out (non-zero)
    const result = await runtime.runCommand(
      "recordLot",
      {
        lotNumber: "LOT-001",
        receivedAt: Date.now(),
        expiresAt,
      },
      { entityName: "Ingredient", instanceId: "ing-1" }
    );

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();

    const instance = await runtime.getInstance("Ingredient", "ing-1");
    expect(instance?.currentLotNumber).toBe("LOT-001");
    // The core regression assertion: the expiry is actually persisted, not dropped.
    expect(instance?.currentLotExpiresAt).toBe(expiresAt);

    expect(result.emittedEvents?.[0]?.name).toBe("IngredientLotRecorded");
  });
});
