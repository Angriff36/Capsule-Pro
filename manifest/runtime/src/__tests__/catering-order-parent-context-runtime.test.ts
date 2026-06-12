/**
 * CateringOrder parent-context — runtime inference proof (Task 8.10).
 *
 * Companion to the IR-contract test
 * (apps/api/__tests__/events/catering-order-parent-context.test.ts). That test
 * proves CateringOrder.create does NOT accept the event-owned venue fields as
 * params (assertion b of the parent-from-child guardrail). THIS test proves
 * assertion (a): venueName/venueAddress are actually INFERRED server-side from
 * only the parent FK (eventId), against the REAL compiled IR — not a synthetic
 * fixture.
 *
 * It exercises the same generic resolver the dispatcher runs
 * (run-manifest-command-core → resolveParentContext), so a regression that stops
 * copying a field, or breaks the CateringOrder→Event belongsTo wiring, fails here.
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

const TENANT = "t-catering-ctx";
const EVENT_ID = "evt-co-1";

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

async function seedEvent(
  provider: (entity: string) => Store,
  overrides: Record<string, unknown> = {}
) {
  await provider("Event").create({
    id: EVENT_ID,
    tenantId: TENANT,
    clientId: "client-77",
    venueName: "Grand Hall",
    venueAddress: "1 Main St",
    guestCount: 120,
    status: "confirmed",
    ...overrides,
  } as never);
}

describe("CateringOrder create — inherits Event-owned venue from only the eventId FK (real IR)", () => {
  it("fills venueName/venueAddress server-side", async () => {
    const { provider } = makeProvider();
    await seedEvent(provider);
    const runtime = newEngine(provider);

    const { body, inheritedFields } = await resolveParentContext(runtime, {
      entity: "CateringOrder",
      command: "create",
      // ONLY order-specific input + the parent link — no event-owned venue fields.
      body: { orderNumber: "CO-1", customerId: "cust-1", eventId: EVENT_ID },
    });

    expect(body.venueName).toBe("Grand Hall");
    expect(body.venueAddress).toBe("1 Main St");
    expect(inheritedFields).toContain("venueName");
    expect(inheritedFields).toContain("venueAddress");
  });

  it("keeps venueCity caller-owned (order-specific) and lets a child override win", async () => {
    const { provider } = makeProvider();
    await seedEvent(provider);
    const runtime = newEngine(provider);

    const { body, inheritedFields } = await resolveParentContext(runtime, {
      entity: "CateringOrder",
      command: "create",
      body: {
        orderNumber: "CO-2",
        customerId: "cust-1",
        eventId: EVENT_ID,
        venueName: "Override Hall",
        venueCity: "Springfield",
      },
    });

    // venueCity stays a create param (Event does not own it) -> never inherited.
    expect(inheritedFields).not.toContain("venueCity");
    expect(body.venueCity).toBe("Springfield");
    // explicit child value wins over the parent's.
    expect(body.venueName).toBe("Override Hall");
    expect(inheritedFields).not.toContain("venueName");
    // the other event-owned field still inherits
    expect(body.venueAddress).toBe("1 Main St");
  });

  it("skips empty parent values (no silent blanks copied onto the order)", async () => {
    const { provider } = makeProvider();
    await seedEvent(provider, { venueAddress: "" });
    const runtime = newEngine(provider);

    const { body, inheritedFields } = await resolveParentContext(runtime, {
      entity: "CateringOrder",
      command: "create",
      body: { orderNumber: "CO-3", customerId: "cust-1", eventId: EVENT_ID },
    });

    expect(body.venueAddress).toBeUndefined();
    expect(inheritedFields).not.toContain("venueAddress");
    // a non-empty field still inherits
    expect(body.venueName).toBe("Grand Hall");
  });

  it("is a no-op when no eventId link is supplied (standalone order)", async () => {
    const { provider } = makeProvider();
    await seedEvent(provider);
    const runtime = newEngine(provider);

    const { inheritedFields } = await resolveParentContext(runtime, {
      entity: "CateringOrder",
      command: "create",
      body: { orderNumber: "CO-4", customerId: "cust-1" },
    });

    expect(inheritedFields).toEqual([]);
  });
});
