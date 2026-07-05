/**
 * FacilityWorkOrder parent-context — runtime inference proof (Task 8.10, 7th adopter).
 *
 * Companion to the IR-contract test
 * (apps/api/__tests__/facilities/facility-work-order-parent-context.test.ts). That
 * test proves FacilityWorkOrder.create does NOT accept the asset-owned facility/area
 * as params (assertion b of the parent-from-child guardrail). THIS test proves
 * assertion (a): facilityId/areaId are actually INFERRED server-side from only the
 * parent FK (assetId), against the REAL compiled IR — not a synthetic fixture.
 *
 * It exercises the same generic resolver the dispatcher runs
 * (run-manifest-command-core → resolveParentContext), so a regression that stops
 * copying a field, or breaks the FacilityWorkOrder→FacilityAsset belongsTo wiring,
 * fails here.
 *
 * NOTE on the three belongsTo relationships: FacilityWorkOrder links to Facility
 * (fk facilityId), FacilityArea (fk areaId) AND FacilityAsset (fk assetId). Because
 * the resolver builds its fkSet PER relationship, facilityId/areaId are excluded
 * only while iterating the facility/area relationships (whose FKs are absent when
 * the caller supplies just assetId) and remain eligible while iterating the asset
 * relationship — so they correctly inherit from the asset.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { RuntimeEngine, type Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { resolveParentContext } from "../parent-context-resolver.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-fwo-ctx";
// UUID-shaped: the resolver skips lookups for FK values that cannot match a
// uuid-typed parent id column (P2007 guard), mirroring production data.
const ASSET_ID = "2b11e0aa-5555-4a55-a555-555555555555";

// Minimal persistent in-memory store (mirrors the upstream MemoryStore contract).
// Every IR entity is `durable`, so RuntimeEngine REQUIRES a storeProvider.
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
    const id = (data.id as string) ?? crypto.randomUUID();
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

function makeProvider(): {
  provider: (entity: string) => Store;
  stores: Map<string, Mem>;
} {
  const stores = new Map<string, Mem>();
  const provider = (entity: string): Store => {
    let store = stores.get(entity);
    if (!store) {
      store = new Mem();
      stores.set(entity, store);
    }
    return store;
  };
  return { provider, stores };
}

function newEngine(provider: (entity: string) => Store): RuntimeEngine {
  return new RuntimeEngine(
    ir,
    { user: { id: "u1", tenantId: TENANT } },
    { storeProvider: provider }
  );
}

async function seedAsset(
  provider: (entity: string) => Store,
  overrides: Record<string, unknown> = {}
) {
  await provider("FacilityAsset").create({
    id: ASSET_ID,
    tenantId: TENANT,
    facilityId: "fac-main",
    areaId: "area-kitchen",
    name: "Walk-in Cooler #2",
    status: "operational",
    ...overrides,
  } as never);
}

describe("FacilityWorkOrder create — inherits asset-owned facility/area from only the assetId FK (real IR)", () => {
  it("fills facilityId/areaId server-side", async () => {
    const { provider } = makeProvider();
    await seedAsset(provider);
    const runtime = newEngine(provider);

    const { body, inheritedFields } = await resolveParentContext(runtime, {
      entity: "FacilityWorkOrder",
      command: "create",
      // ONLY work-order input + the parent link — no asset-owned facility/area fields.
      body: { title: "Compressor making noise", assetId: ASSET_ID },
    });

    expect(body.facilityId).toBe("fac-main");
    expect(body.areaId).toBe("area-kitchen");
    expect(inheritedFields).toContain("facilityId");
    expect(inheritedFields).toContain("areaId");
  });

  it("lets an explicit child override win over the inherited value", async () => {
    const { provider } = makeProvider();
    await seedAsset(provider);
    const runtime = newEngine(provider);

    const { body, inheritedFields } = await resolveParentContext(runtime, {
      entity: "FacilityWorkOrder",
      command: "create",
      body: { title: "Relocate unit", assetId: ASSET_ID, areaId: "area-prep" },
    });

    // explicit child value wins over the asset's
    expect(body.areaId).toBe("area-prep");
    expect(inheritedFields).not.toContain("areaId");
    // the other asset-owned field still inherits
    expect(body.facilityId).toBe("fac-main");
    expect(inheritedFields).toContain("facilityId");
  });

  it("skips empty parent values (no silent blanks copied onto the work order)", async () => {
    const { provider } = makeProvider();
    await seedAsset(provider, { areaId: "" });
    const runtime = newEngine(provider);

    const { body, inheritedFields } = await resolveParentContext(runtime, {
      entity: "FacilityWorkOrder",
      command: "create",
      body: { title: "Inspect", assetId: ASSET_ID },
    });

    expect(body.areaId).toBeUndefined();
    expect(inheritedFields).not.toContain("areaId");
    // a non-empty field still inherits
    expect(body.facilityId).toBe("fac-main");
  });

  it("is a no-op when no assetId link is supplied (standalone work order)", async () => {
    const { provider } = makeProvider();
    await seedAsset(provider);
    const runtime = newEngine(provider);

    const { inheritedFields } = await resolveParentContext(runtime, {
      entity: "FacilityWorkOrder",
      command: "create",
      body: { title: "Ad-hoc order" },
    });

    expect(inheritedFields).toEqual([]);
  });
});
