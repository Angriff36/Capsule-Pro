/**
 * WasteEntry + Shipment parent-context — runtime inference proof (Task 8.10).
 *
 * Companion to the IR-contract test
 * (apps/api/__tests__/logistics/location-inheritance-parent-context.test.ts).
 * That test proves WasteEntry.create / Shipment.create do NOT accept the
 * event-owned `locationId` as a param (assertion b of the parent-from-child
 * guardrail). THIS test proves assertion (a): `locationId` is actually INFERRED
 * server-side from only the parent FK (eventId), against the REAL compiled IR —
 * not a synthetic fixture.
 *
 * It exercises the same generic resolver the dispatcher runs
 * (run-manifest-command-core → resolveParentContext), so a regression that stops
 * copying `locationId`, or breaks the WasteEntry/Shipment → Event belongsTo
 * wiring, fails here.
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

const TENANT = "t-loc-ctx";
const EVENT_ID = "evt-loc-1";
const LOCATION_ID = "loc-abc-123";

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

function newEngine(provider: (entity: string) => Store): RuntimeEngine {
  return new RuntimeEngine(
    ir,
    { user: { id: "u1", tenantId: TENANT } },
    { storeProvider: provider }
  );
}

async function seedEvent(
  provider: (entity: string) => Store,
  overrides: Record<string, unknown> = {}
) {
  await provider("Event").create({
    id: EVENT_ID,
    tenantId: TENANT,
    clientId: "client-77",
    locationId: LOCATION_ID,
    status: "confirmed",
    ...overrides,
  } as never);
}

describe("WasteEntry create — inherits Event locationId from only the eventId FK (real IR)", () => {
  it("fills locationId server-side", async () => {
    const provider = makeProvider();
    await seedEvent(provider);
    const runtime = newEngine(provider);

    const { body, inheritedFields } = await resolveParentContext(runtime, {
      entity: "WasteEntry",
      command: "create",
      // ONLY waste-specific input + the parent link — no event-owned location.
      body: {
        inventoryItemId: "inv-1",
        reasonId: 2,
        quantity: 3,
        eventId: EVENT_ID,
      },
    });

    expect(body.locationId).toBe(LOCATION_ID);
    expect(inheritedFields).toContain("locationId");
  });

  it("lets an explicit child locationId override the parent's", async () => {
    const provider = makeProvider();
    await seedEvent(provider);
    const runtime = newEngine(provider);

    const { body, inheritedFields } = await resolveParentContext(runtime, {
      entity: "WasteEntry",
      command: "create",
      body: {
        inventoryItemId: "inv-1",
        quantity: 1,
        eventId: EVENT_ID,
        locationId: "loc-override",
      },
    });

    expect(body.locationId).toBe("loc-override");
    expect(inheritedFields).not.toContain("locationId");
  });

  it("skips an empty parent location (no silent blank copied)", async () => {
    const provider = makeProvider();
    await seedEvent(provider, { locationId: "" });
    const runtime = newEngine(provider);

    const { body, inheritedFields } = await resolveParentContext(runtime, {
      entity: "WasteEntry",
      command: "create",
      body: { inventoryItemId: "inv-1", quantity: 1, eventId: EVENT_ID },
    });

    expect(body.locationId).toBeUndefined();
    expect(inheritedFields).not.toContain("locationId");
  });

  it("is a no-op for a standalone waste entry (no eventId link)", async () => {
    const provider = makeProvider();
    await seedEvent(provider);
    const runtime = newEngine(provider);

    const { inheritedFields } = await resolveParentContext(runtime, {
      entity: "WasteEntry",
      command: "create",
      body: { inventoryItemId: "inv-1", quantity: 1 },
    });

    expect(inheritedFields).toEqual([]);
  });
});

describe("Shipment create — inherits Event locationId from only the eventId FK (real IR)", () => {
  it("fills locationId server-side", async () => {
    const provider = makeProvider();
    await seedEvent(provider);
    const runtime = newEngine(provider);

    const { body, inheritedFields } = await resolveParentContext(runtime, {
      entity: "Shipment",
      command: "create",
      // ONLY shipment-specific input + the parent link — no event-owned location.
      body: { shipmentNumber: "S-1", supplierId: "sup-1", eventId: EVENT_ID },
    });

    expect(body.locationId).toBe(LOCATION_ID);
    expect(inheritedFields).toContain("locationId");
  });

  it("lets an explicit child locationId override the parent's", async () => {
    const provider = makeProvider();
    await seedEvent(provider);
    const runtime = newEngine(provider);

    const { body, inheritedFields } = await resolveParentContext(runtime, {
      entity: "Shipment",
      command: "create",
      body: {
        shipmentNumber: "S-2",
        eventId: EVENT_ID,
        locationId: "loc-override",
      },
    });

    expect(body.locationId).toBe("loc-override");
    expect(inheritedFields).not.toContain("locationId");
  });

  it("is a no-op for a standalone shipment (no eventId link)", async () => {
    const provider = makeProvider();
    await seedEvent(provider);
    const runtime = newEngine(provider);

    const { inheritedFields } = await resolveParentContext(runtime, {
      entity: "Shipment",
      command: "create",
      body: { shipmentNumber: "S-3" },
    });

    expect(inheritedFields).toEqual([]);
  });
});
