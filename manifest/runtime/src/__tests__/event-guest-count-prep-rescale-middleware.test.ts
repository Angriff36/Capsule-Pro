/**
 * Middleware conformance — `EventGuestCountUpdated → PrepList / PrepListItem
 * rescale` (IMPLEMENTATION_PLAN P1, Event lifecycle).
 *
 * WHY this matters (not just WHAT it does): a prep list's batch multiplier is
 * hardcoded to 1 at seed time and each ingredient row's `scaledQuantity` is
 * derived ONCE from the event's guest count. Nothing recomputed either when the
 * guest count changed — so bumping a 120-guest event to 240 silently left the
 * kitchen prepping for 120. This is a food-quantity correctness defect, not a
 * cosmetic one.
 *
 * The test runs against the REAL compiled IR through the runtime engine WITH the
 * rescale middleware wired (as the factory wires it), so it FAILS LOUDLY when the
 * BUSINESS propagation regresses — a prep list left un-rescaled, the wrong list
 * touched, baseQuantity disturbed, a finalized (locked) list mutated — not merely
 * on a shape change (CLAUDE.md Rule 9; constitution §13). It also regression-locks
 * that nobody re-expresses this 1:N ratio fan-out as a (structurally impossible)
 * IR reaction.
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { createEventGuestCountPrepRescaleMiddleware } from "../middleware/event-guest-count-prep-rescale-middleware.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-guest-rescale";
// admin satisfies Event.updateGuestCount AND PrepList/PrepListItem policies.
const USER = { id: "u-guest-rescale", tenantId: TENANT, role: "admin" } as const;

const EVENT_ID = "evt-rescale-001";

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

/** Engine wired with the guest-count rescale middleware (as the factory does). */
function newEngine(provider: (entity: string) => Store): ManifestRuntimeEngine {
  let engine: ManifestRuntimeEngine;
  const middleware = [
    createEventGuestCountPrepRescaleMiddleware({
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

async function seedEvent(
  provider: (entity: string) => Store,
  guestCount: number,
  id: string = EVENT_ID
) {
  // Satisfy Event's entity-level block constraints so updateGuestCount persists.
  await provider("Event").create({
    id,
    tenantId: TENANT,
    clientId: "client-9",
    title: "Smith Wedding",
    eventType: "wedding",
    eventDate: 1_900_000_000_000,
    guestCount,
    status: "confirmed",
    venueName: "Old Hall",
    venueAddress: "1 Old St",
    locationId: "loc-old",
    accessibilityOptions: [],
    tags: [],
  } as never);
}

async function seedPrepList(
  provider: (entity: string) => Store,
  id: string,
  overrides: Record<string, unknown> = {}
) {
  // Satisfy PrepList block constraints (validName/validEventId/
  // validBatchMultiplier/validStatus/positiveTotalItems/positiveTotalTime) so
  // updateBatchMultiplier's mutate is not silently dropped on updateInstance.
  await provider("PrepList").create({
    id,
    tenantId: TENANT,
    eventId: EVENT_ID,
    name: `Prep ${id}`,
    batchMultiplier: 1,
    dietaryRestrictions: [],
    status: "draft",
    totalItems: 0,
    totalEstimatedTime: 0,
    isActive: true,
    ...overrides,
  } as never);
}

async function seedPrepItem(
  provider: (entity: string) => Store,
  id: string,
  prepListId: string,
  baseQuantity: number,
  scaledQuantity: number
) {
  // Satisfy PrepListItem block constraints so updateQuantity persists.
  await provider("PrepListItem").create({
    id,
    tenantId: TENANT,
    prepListId,
    stationId: "station-1",
    stationName: "Garde Manger",
    ingredientId: `ing-${id}`,
    ingredientName: `Ingredient ${id}`,
    baseQuantity,
    baseUnit: "kg",
    scaledQuantity,
    scaledUnit: "kg",
    sortOrder: 0,
  } as never);
}

function updateGuestCount(engine: ManifestRuntimeEngine, newGuestCount: number) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "Event",
      command: "updateGuestCount",
      body: { id: EVENT_ID, tenantId: TENANT, newGuestCount },
      user: { ...USER },
    }
  );
}

// biome-ignore lint/suspicious/noExplicitAny: structural event rows.
function eventNames(result: any): string[] {
  return (
    (result.ok ? result.events : [])?.map((e: { name: string }) => e.name) ?? []
  );
}

async function num(
  provider: (entity: string) => Store,
  entity: string,
  id: string,
  field: string
): Promise<number> {
  const row = (await provider(entity).getById(id)) as Record<string, unknown>;
  return Number(row[field]);
}

describe("Middleware conformance: EventGuestCountUpdated → PrepList rescale", () => {
  it("the compiled IR carries NO EventGuestCountUpdated reaction (it is a 1:N ratio middleware)", () => {
    const reactions: Record<string, unknown>[] = ir.reactions ?? [];
    const stale = reactions.filter(
      (r) => (r.event as string) === "EventGuestCountUpdated"
    );
    expect(stale).toHaveLength(0);
  });

  it("doubling the guest count doubles batchMultiplier and every item's scaledQuantity (baseQuantity untouched) and bubbles the updates", async () => {
    const provider = makeProvider();
    await seedEvent(provider, 120);
    await seedPrepList(provider, "pl-1");
    await seedPrepItem(provider, "pli-A", "pl-1", 5, 10);
    await seedPrepItem(provider, "pli-B", "pl-1", 2, 3);

    const engine = newEngine(provider);
    const result = await updateGuestCount(engine, 240); // ratio = 2
    expect(result.ok).toBe(true);

    // THE PROOF: scaled amounts doubled; recipe base amounts unchanged.
    expect(await num(provider, "PrepList", "pl-1", "batchMultiplier")).toBe(2);
    expect(await num(provider, "PrepListItem", "pli-A", "scaledQuantity")).toBe(20);
    expect(await num(provider, "PrepListItem", "pli-A", "baseQuantity")).toBe(5);
    expect(await num(provider, "PrepListItem", "pli-B", "scaledQuantity")).toBe(6);
    expect(await num(provider, "PrepListItem", "pli-B", "baseQuantity")).toBe(2);

    // The event's own mutate still landed.
    expect(await num(provider, "Event", EVENT_ID, "guestCount")).toBe(240);

    // Secondary proof: the rescale's downstream events bubbled up — only possible
    // if the middleware actually dispatched the governed commands.
    const names = eventNames(result);
    expect(names).toContain("PrepListBatchMultiplierUpdated");
    expect(names.filter((n) => n === "PrepListItemUpdated")).toHaveLength(2);
  });

  it("halving the guest count halves the scaled quantities (ratio < 1)", async () => {
    const provider = makeProvider();
    await seedEvent(provider, 200);
    await seedPrepList(provider, "pl-1", { batchMultiplier: 4 });
    await seedPrepItem(provider, "pli-A", "pl-1", 8, 40);

    const engine = newEngine(provider);
    const result = await updateGuestCount(engine, 100); // ratio = 0.5
    expect(result.ok).toBe(true);

    expect(await num(provider, "PrepList", "pl-1", "batchMultiplier")).toBe(2);
    expect(await num(provider, "PrepListItem", "pli-A", "scaledQuantity")).toBe(20);
    expect(await num(provider, "PrepListItem", "pli-A", "baseQuantity")).toBe(8);
  });

  it("rescales only DRAFT prep lists for THIS event — finalized and other-event lists are untouched", async () => {
    const provider = makeProvider();
    await seedEvent(provider, 100);
    await seedPrepList(provider, "pl-draft");
    await seedPrepItem(provider, "pli-draft", "pl-draft", 5, 5);
    // Finalized list is locked for execution — must NOT rescale.
    await seedPrepList(provider, "pl-final", { status: "finalized" });
    await seedPrepItem(provider, "pli-final", "pl-final", 5, 5);
    // A draft list for a DIFFERENT event — must NOT be touched.
    await seedPrepList(provider, "pl-other", { eventId: "evt-other" });
    await seedPrepItem(provider, "pli-other", "pl-other", 5, 5);

    const engine = newEngine(provider);
    const result = await updateGuestCount(engine, 300); // ratio = 3
    expect(result.ok).toBe(true);

    // Draft list for this event rescaled.
    expect(await num(provider, "PrepList", "pl-draft", "batchMultiplier")).toBe(3);
    expect(await num(provider, "PrepListItem", "pli-draft", "scaledQuantity")).toBe(15);
    // Finalized + other-event lists untouched.
    expect(await num(provider, "PrepList", "pl-final", "batchMultiplier")).toBe(1);
    expect(await num(provider, "PrepListItem", "pli-final", "scaledQuantity")).toBe(5);
    expect(await num(provider, "PrepList", "pl-other", "batchMultiplier")).toBe(1);
    expect(await num(provider, "PrepListItem", "pli-other", "scaledQuantity")).toBe(5);
  });

  it("an unchanged guest count is a no-op (ratio 1, no rescale dispatched)", async () => {
    const provider = makeProvider();
    await seedEvent(provider, 100);
    await seedPrepList(provider, "pl-1");
    await seedPrepItem(provider, "pli-A", "pl-1", 5, 10);

    const engine = newEngine(provider);
    const result = await updateGuestCount(engine, 100); // ratio = 1
    expect(result.ok).toBe(true);

    expect(await num(provider, "PrepList", "pl-1", "batchMultiplier")).toBe(1);
    expect(await num(provider, "PrepListItem", "pli-A", "scaledQuantity")).toBe(10);
    expect(eventNames(result)).not.toContain("PrepListItemUpdated");
  });
});
