/**
 * Regression — `ManifestRuntimeEngine.runCommand` must derive the target
 * instance from `body.id` for instance-scoped verbs when the caller omits
 * `options.instanceId`.
 *
 * WHY this matters (not just WHAT it does): the upstream engine only applies
 * `mutate` actions when `options.instanceId` is set — without it the command
 * still passes guards, emits its events, and reports success while persisting
 * NOTHING. The canonical HTTP dispatcher (run-manifest-command-core) derives
 * the id from the body before calling, but hand-rolled routes that call
 * `runtime.runCommand` directly (composite recipe update-with-version,
 * allergen dish update, contract send/status, waste-factor update, prep-list
 * item complete, SMS rule activate/deactivate) passed only `{ entityName }`.
 * Result: Recipe.update "succeeded", RecipeUpdated was emitted and logged,
 * and the recipes row never changed — the user's edited description was
 * silently dropped. These tests drive the exact bypass call shape and fail
 * if the wrapper stops threading the derived id into the engine.
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-run-command-instance-id";
const USER = { id: "u-chef", tenantId: TENANT, role: "manager" } as const;

/** Minimal persistent in-memory store (mirrors the upstream MemoryStore contract). */
class Mem implements Store {
  private readonly items = new Map<string, Record<string, unknown>>();
  // biome-ignore lint/suspicious/noExplicitAny: structural rows.
  async getAll(): Promise<any[]> {
    return Array.from(this.items.values()) as never;
  }
  // biome-ignore lint/suspicious/noExplicitAny: structural rows.
  async getById(id: string): Promise<any> {
    return this.items.get(id) as never;
  }
  // biome-ignore lint/suspicious/noExplicitAny: structural rows.
  async create(data: any): Promise<any> {
    const id = (data.id as string) ?? randomUUID();
    const row = { ...data, id };
    this.items.set(id, row);
    return row as never;
  }
  // biome-ignore lint/suspicious/noExplicitAny: structural rows.
  async update(id: string, data: any): Promise<any> {
    const existing = this.items.get(id);
    if (!existing) {
      return undefined as never;
    }
    const row = { ...existing, ...data, id };
    this.items.set(id, row);
    return row as never;
  }
  async delete(id: string): Promise<boolean> {
    return this.items.delete(id);
  }
  async clear(): Promise<void> {
    this.items.clear();
  }
}

function makeProvider(): (entity: string) => Store {
  const stores = new Map<string, Mem>();
  return (entity: string): Store => {
    let store = stores.get(entity);
    if (!store) {
      store = new Mem();
      stores.set(entity, store);
    }
    return store;
  };
}

function newEngine(provider: (entity: string) => Store): ManifestRuntimeEngine {
  return new ManifestRuntimeEngine(
    ir,
    {
      tenantId: TENANT,
      user: { ...USER },
    },
    {
      storeProvider: provider,
      customBuiltins: createCustomBuiltins(),
      generateId: () => randomUUID(),
      now: () => Date.now(),
    }
  );
}

async function seedRecipe(
  provider: (entity: string) => Store,
  overrides: Record<string, unknown> = {}
): Promise<string> {
  const id = randomUUID();
  await provider("Recipe").create({
    id,
    tenantId: TENANT,
    name: "BBQ Chicken Brine",
    category: "brine",
    cuisineType: "",
    description: "",
    tags: [],
    isActive: true,
    isSubrecipe: false,
    deletedAt: null,
    ...overrides,
  } as never);
  return id;
}

describe("Regression: runCommand derives instanceId from body.id for instance-scoped verbs", () => {
  it("persists Recipe.update mutates when the caller passes only { entityName } (composite-route call shape)", async () => {
    const provider = makeProvider();
    const engine = newEngine(provider);
    const recipeId = await seedRecipe(provider);

    // Exact call shape of update-with-version/service.ts — no instanceId.
    const result = await engine.runCommand(
      "update",
      {
        id: recipeId,
        newName: "BBQ Chicken Brine",
        newCategory: "brine",
        newCuisineType: "",
        newDescription: "Overnight brine — salt, sugar, aromatics.",
        newTags: [],
      },
      { entityName: "Recipe" }
    );

    expect(result.success).toBe(true);
    const row = (await provider("Recipe").getById(recipeId)) as Record<
      string,
      unknown
    >;
    expect(row.description).toBe("Overnight brine — salt, sugar, aromatics.");
  });

  it("an explicit options.instanceId still wins over body.id", async () => {
    const provider = makeProvider();
    const engine = newEngine(provider);
    const targetId = await seedRecipe(provider, { name: "Target" });
    const decoyId = await seedRecipe(provider, { name: "Decoy" });

    const result = await engine.runCommand(
      "update",
      {
        // body.id points at the decoy; instanceId must take precedence.
        id: decoyId,
        newName: "Target",
        newCategory: "",
        newCuisineType: "",
        newDescription: "written to the explicit target",
        newTags: [],
      },
      { entityName: "Recipe", instanceId: targetId }
    );

    expect(result.success).toBe(true);
    const target = (await provider("Recipe").getById(targetId)) as Record<
      string,
      unknown
    >;
    const decoy = (await provider("Recipe").getById(decoyId)) as Record<
      string,
      unknown
    >;
    expect(target.description).toBe("written to the explicit target");
    expect(decoy.description).toBe("");
  });

  it("create keeps the auto-create path: body.id becomes the new row, not a mutate target", async () => {
    const provider = makeProvider();
    const engine = newEngine(provider);
    const newId = randomUUID();

    const result = await engine.runCommand(
      "create",
      {
        id: newId,
        name: "New Recipe",
        category: "sauce",
        cuisineType: "",
        description: "created via auto-create",
        tags: [],
      },
      { entityName: "Recipe" }
    );

    expect(result.success).toBe(true);
    const row = (await provider("Recipe").getById(newId)) as Record<
      string,
      unknown
    >;
    expect(row).toBeDefined();
    expect(row.description).toBe("created via auto-create");
  });
});
