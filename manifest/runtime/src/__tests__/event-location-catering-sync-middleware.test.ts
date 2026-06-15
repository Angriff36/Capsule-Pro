/**
 * Middleware conformance — `Event location change → CateringOrder venue sync`
 * (IMPLEMENTATION_PLAN P1, Event lifecycle).
 *
 * WHY this matters (not just WHAT it does): a catering order carries a venue
 * snapshot (where the food is delivered) inherited from its event at create.
 * When the event's location later changes, an ACTIVE order's delivery venue must
 * follow — otherwise the kitchen/logistics ship to the wrong address. But a
 * DELIVERED/COMPLETED/CANCELLED order is physical history: it was delivered to
 * the venue it then held, and re-syncing it would falsify the record. This
 * middleware encodes both rules: re-sync every active linked order's
 * venueName/venueAddress on `EventLocationUpdated`, and leave terminal/unrelated/
 * soft-deleted orders untouched.
 *
 * The test runs against the REAL compiled IR through the runtime engine WITH the
 * venue-sync middleware wired (as the factory wires it), so it FAILS LOUDLY when
 * the BUSINESS propagation regresses — an active order left stale, a terminal
 * order rewritten, the wrong order touched, the engine ceasing to dispatch — not
 * merely on a shape change (CLAUDE.md Rule 9; constitution §13). It also
 * regression-locks that nobody re-expresses this 1:N fan-out as a (dead) IR
 * reaction.
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { createEventLocationCateringSyncMiddleware } from "../middleware/event-location-catering-sync-middleware.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-catering-sync";
// admin satisfies Event's updateLocation policy AND CateringOrder's default policy.
const USER = { id: "u-catering-sync", tenantId: TENANT, role: "admin" } as const;

const EVENT_ID = "evt-cat-001";
const TRIGGER_EVENT = "EventLocationUpdated";

// Minimal persistent in-memory store (mirrors the upstream MemoryStore contract).
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

/** Engine wired with the venue-sync middleware (as the factory does). */
function newEngine(provider: (entity: string) => Store): ManifestRuntimeEngine {
  let engine: ManifestRuntimeEngine;
  const middleware = [
    createEventLocationCateringSyncMiddleware({
      storeProvider: provider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
      onDiagnostic: () => {
        /* silence default console.warn in tests */
      },
    }),
  ];
  engine = new ManifestRuntimeEngine(
    ir,
    {
      tenantId: USER.tenantId,
      user: { id: USER.id, tenantId: USER.tenantId, role: USER.role },
    },
    {
      storeProvider: provider,
      customBuiltins: createCustomBuiltins(),
      middleware,
      generateId: () => randomUUID(),
      now: () => Date.now(),
    }
  );
  return engine;
}

async function seedEvent(provider: (entity: string) => Store) {
  // Satisfy Event's entity-level block constraints so updateLocation's mutates
  // persist (validTitle/validEventType/validStatus/positiveGuestCount).
  await provider("Event").create({
    id: EVENT_ID,
    tenantId: TENANT,
    clientId: "client-7",
    title: "Harbor Gala",
    eventType: "gala",
    eventDate: 1_900_000_000_000,
    guestCount: 200,
    status: "confirmed",
    venueName: "Old Pier",
    venueAddress: "1 Old Pier Rd",
    locationId: "loc-old",
    accessibilityOptions: [],
    tags: [],
  } as never);
}

/**
 * Seed a catering order with a STALE venue. Block constraints
 * (validOrderNumber/validStatus/positiveGuestCount/positiveTotalAmount) must be
 * satisfied or syncVenue's mutate would be silently dropped on updateInstance.
 */
async function seedOrder(
  provider: (entity: string) => Store,
  id: string,
  overrides: Record<string, unknown> = {}
) {
  await provider("CateringOrder").create({
    id,
    tenantId: TENANT,
    eventId: EVENT_ID,
    orderNumber: `CO-${id}`,
    customerId: "client-7",
    orderStatus: "confirmed",
    guestCount: 200,
    totalAmount: 0,
    // Deliberately stale venue — proves the sync overwrites it. The broken-out
    // city/state/zip/contact fields are caller-owned and must NOT be touched.
    venueName: "STALE",
    venueAddress: "STALE",
    venueCity: "Keepville",
    venueState: "KS",
    venueZip: "00000",
    venueContactName: "Pat Keeper",
    venueContactPhone: "555-0000",
    ...overrides,
  } as never);
}

function updateLocation(engine: ManifestRuntimeEngine) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "Event",
      command: "updateLocation",
      body: {
        id: EVENT_ID,
        tenantId: TENANT,
        newLocationId: "loc-new",
        newVenueId: "venue-new",
        newVenueName: "Grand Conservatory",
        newVenueAddress: "900 Garden Ave",
      },
      user: { ...USER },
    }
  );
}

// biome-ignore lint/suspicious/noExplicitAny: structural event rows.
function eventNames(result: any): string[] {
  return (result.ok ? result.events : [])?.map((e: { name: string }) => e.name) ?? [];
}

describe("Middleware conformance: Event location → CateringOrder venue sync", () => {
  it("the compiled IR carries NO EventLocationUpdated→CateringOrder reaction (it is a 1:N middleware sync)", () => {
    const reactions: Record<string, unknown>[] = ir.reactions ?? [];
    // A regression here means someone tried to express this fan-out as a
    // reaction, which structurally cannot resolve the many orders (1:N by
    // eventId) — it must stay middleware.
    const stale = reactions.filter(
      (r) =>
        r.event === TRIGGER_EVENT &&
        String(r.command ?? "").includes("syncVenue")
    );
    expect(stale).toHaveLength(0);
  });

  it("the new CateringOrder.syncVenue command exists in the IR", () => {
    // biome-ignore lint/suspicious/noExplicitAny: structural IR.
    const cmds: any[] = ir.commands ?? [];
    const syncVenue = cmds.find(
      (c) => c.entity === "CateringOrder" && c.name === "syncVenue"
    );
    expect(syncVenue).toBeTruthy();
  });

  it("EventLocationUpdated re-syncs the venue to every ACTIVE linked order only", async () => {
    const provider = makeProvider();
    await seedEvent(provider);
    await seedOrder(provider, "co-draft", { orderStatus: "draft" });
    await seedOrder(provider, "co-confirmed", { orderStatus: "confirmed" });
    await seedOrder(provider, "co-inprogress", { orderStatus: "in_progress" });
    // Terminal orders are physical history — must NOT be rewritten.
    await seedOrder(provider, "co-delivered", { orderStatus: "delivered" });
    await seedOrder(provider, "co-completed", { orderStatus: "completed" });
    await seedOrder(provider, "co-cancelled", { orderStatus: "cancelled" });
    // An order for a DIFFERENT event must NOT be touched.
    await seedOrder(provider, "co-other", { eventId: "evt-other" });
    // A soft-deleted order must NOT be touched.
    await seedOrder(provider, "co-deleted", { deletedAt: Date.now() });

    const engine = newEngine(provider);
    const result = await updateLocation(engine);
    expect(result.ok).toBe(true);

    const get = async (id: string) =>
      (await provider("CateringOrder").getById(id)) as Record<string, unknown>;

    // THE PROOF: active orders carry the event's CURRENT venue; the caller-owned
    // city/state/zip/contact fields are preserved (NOT blanked).
    for (const id of ["co-draft", "co-confirmed", "co-inprogress"]) {
      const order = await get(id);
      expect(order.venueName).toBe("Grand Conservatory");
      expect(order.venueAddress).toBe("900 Garden Ave");
      expect(order.venueCity).toBe("Keepville");
      expect(order.venueContactName).toBe("Pat Keeper");
    }
    // Terminal, unrelated, and soft-deleted orders stay stale.
    for (const id of [
      "co-delivered",
      "co-completed",
      "co-cancelled",
      "co-other",
      "co-deleted",
    ]) {
      const order = await get(id);
      expect(order.venueName).toBe("STALE");
      expect(order.venueAddress).toBe("STALE");
    }

    // Secondary proof: the sync's downstream event bubbled up once per ACTIVE
    // order — only possible if the middleware actually dispatched syncVenue.
    const synced = eventNames(result).filter(
      (n) => n === "CateringOrderVenueSynced"
    );
    expect(synced).toHaveLength(3);
  });

  it("an event with no active catering orders is a no-op (not a failure)", async () => {
    const provider = makeProvider();
    await seedEvent(provider);
    // Only a cancelled order — the middleware must skip it and emit nothing.
    await seedOrder(provider, "co-cancelled", { orderStatus: "cancelled" });

    const engine = newEngine(provider);
    const result = await updateLocation(engine);
    expect(result.ok).toBe(true);
    expect(eventNames(result)).not.toContain("CateringOrderVenueSynced");
  });
});
