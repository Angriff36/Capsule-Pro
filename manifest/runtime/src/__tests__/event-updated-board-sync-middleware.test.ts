/**
 * Middleware conformance — `Event update → BattleBoard snapshot sync`
 * (IMPLEMENTATION_PLAN P1, Event lifecycle).
 *
 * WHY this matters (not just WHAT it does): a battle board carries a SNAPSHOT of
 * its event (date, client, guest count, venue) so the kitchen never re-enters
 * event-owned data. Before this middleware, that snapshot was refreshed by a
 * hand-written imperative helper (`syncBattleBoardsForEvent`) that two server
 * actions had to remember to call after `Event.update` — transport-layer glue the
 * constitution says belongs behind the runtime, and which silently never ran for
 * `updateDate` / `updateLocation`. The result was boards drifting out of sync
 * with their event whenever those paths were used. This middleware makes the
 * propagation governed and uniform: any `EventUpdated`/`EventDateUpdated`/
 * `EventLocationUpdated` re-syncs EVERY linked board.
 *
 * The test runs against the REAL compiled IR through the runtime engine WITH the
 * board-sync middleware wired (as the factory wires it), so it FAILS LOUDLY when
 * the BUSINESS propagation regresses — a board left stale, the wrong board
 * touched, the engine ceasing to dispatch — not merely on a shape change
 * (CLAUDE.md Rule 9; constitution §13). It also regression-locks that nobody
 * re-expresses this 1:N fan-out as a (dead) IR reaction.
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { createEventUpdatedBoardSyncMiddleware } from "../middleware/event-updated-board-sync-middleware.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-board-sync";
// admin satisfies Event's update/* policies AND BattleBoard.syncFromEvent policy.
const USER = { id: "u-board-sync", tenantId: TENANT, role: "admin" } as const;

const EVENT_ID = "evt-sync-001";
const EVENT_DATE = 1_900_000_000_000;
const NEW_DATE = 2_000_000_000_000;
const TRIGGER_EVENTS = ["EventUpdated", "EventDateUpdated", "EventLocationUpdated"];

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

/** Engine wired with the board-sync middleware (as the factory does). */
function newEngine(provider: (entity: string) => Store): ManifestRuntimeEngine {
  let engine: ManifestRuntimeEngine;
  const middleware = [
    createEventUpdatedBoardSyncMiddleware({
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
  // Satisfy Event's entity-level block constraints (validTitle/validEventType/
  // validStatus/positiveGuestCount) so the update commands' mutates persist.
  await provider("Event").create({
    id: EVENT_ID,
    tenantId: TENANT,
    clientId: "client-9",
    title: "Smith Wedding",
    eventType: "wedding",
    eventDate: EVENT_DATE,
    guestCount: 120,
    status: "confirmed",
    venueName: "Old Hall",
    venueAddress: "1 Old St",
    locationId: "loc-old",
    accessibilityOptions: [],
    tags: [],
  } as never);
}

/**
 * Seed a battle board with a STALE snapshot. Block constraints
 * (validBoardName/validStatus/validBoardType) must be satisfied or
 * syncFromEvent's mutate would be silently dropped on updateInstance.
 */
async function seedBoard(
  provider: (entity: string) => Store,
  id: string,
  overrides: Record<string, unknown> = {}
) {
  await provider("BattleBoard").create({
    id,
    tenantId: TENANT,
    eventId: EVENT_ID,
    boardName: `Board ${id}`,
    boardType: "event-specific",
    status: "draft",
    // Deliberately stale snapshot — proves the sync overwrites it.
    eventDate: 1,
    clientId: "",
    guestCount: 0,
    venueName: "STALE",
    venueAddress: "STALE",
    locationId: "STALE",
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
        newVenueName: "Grand Ballroom",
        newVenueAddress: "500 Main St",
      },
      user: { ...USER },
    }
  );
}

function updateDate(engine: ManifestRuntimeEngine) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "Event",
      command: "updateDate",
      body: { id: EVENT_ID, tenantId: TENANT, newEventDate: NEW_DATE },
      user: { ...USER },
    }
  );
}

// biome-ignore lint/suspicious/noExplicitAny: structural event rows.
function eventNames(result: any): string[] {
  return (result.ok ? result.events : [])?.map((e: { name: string }) => e.name) ?? [];
}

describe("Middleware conformance: Event update → BattleBoard snapshot sync", () => {
  it("the compiled IR carries NO Event-update→BattleBoard reaction (it is a 1:N middleware sync)", () => {
    const reactions: Record<string, unknown>[] = ir.reactions ?? [];
    // A regression here means someone tried to express this fan-out as a
    // reaction, which structurally cannot resolve the many boards (1:N by
    // eventId) — it must stay middleware.
    const stale = reactions.filter((r) =>
      TRIGGER_EVENTS.includes(r.event as string)
    );
    expect(stale).toHaveLength(0);
  });

  it("EventLocationUpdated re-syncs the full snapshot to every linked board only", async () => {
    const provider = makeProvider();
    await seedEvent(provider);
    await seedBoard(provider, "bb-1");
    await seedBoard(provider, "bb-2");
    // A board for a DIFFERENT event must NOT be touched.
    await seedBoard(provider, "bb-other", { eventId: "evt-other" });
    // A soft-deleted board must NOT be touched.
    await seedBoard(provider, "bb-deleted", { deletedAt: Date.now() });

    const engine = newEngine(provider);
    const result = await updateLocation(engine);
    expect(result.ok).toBe(true);

    const bb1 = (await provider("BattleBoard").getById("bb-1")) as Record<string, unknown>;
    const bb2 = (await provider("BattleBoard").getById("bb-2")) as Record<string, unknown>;
    const other = (await provider("BattleBoard").getById("bb-other")) as Record<string, unknown>;
    const deleted = (await provider("BattleBoard").getById("bb-deleted")) as Record<string, unknown>;

    // THE PROOF: linked boards carry the event's CURRENT snapshot — both the
    // just-changed venue AND the unchanged client/guestCount/date (full sync,
    // sourced from the loaded Event, not the partial event payload).
    for (const bb of [bb1, bb2]) {
      expect(bb.venueName).toBe("Grand Ballroom");
      expect(bb.venueAddress).toBe("500 Main St");
      expect(bb.locationId).toBe("loc-new");
      expect(bb.clientId).toBe("client-9");
      expect(Number(bb.guestCount)).toBe(120);
      expect(Number(bb.eventDate)).toBe(EVENT_DATE);
    }
    // Unrelated and soft-deleted boards stay stale.
    expect(other.venueName).toBe("STALE");
    expect(deleted.venueName).toBe("STALE");

    // Secondary proof: the sync's downstream event bubbled up once per linked
    // board — only possible if the middleware actually dispatched syncFromEvent.
    const synced = eventNames(result).filter((n) => n === "BattleBoardSyncedFromEvent");
    expect(synced).toHaveLength(2);
  });

  it("EventDateUpdated pushes the new date to linked boards", async () => {
    const provider = makeProvider();
    await seedEvent(provider);
    await seedBoard(provider, "bb-1");

    const engine = newEngine(provider);
    const result = await updateDate(engine);
    expect(result.ok).toBe(true);

    const bb1 = (await provider("BattleBoard").getById("bb-1")) as Record<string, unknown>;
    expect(Number(bb1.eventDate)).toBe(NEW_DATE);
    expect(eventNames(result)).toContain("BattleBoardSyncedFromEvent");
  });

  it("an event with no boards is a no-op (not a failure)", async () => {
    const provider = makeProvider();
    await seedEvent(provider);

    const engine = newEngine(provider);
    const result = await updateLocation(engine);
    expect(result.ok).toBe(true);
    expect(eventNames(result)).not.toContain("BattleBoardSyncedFromEvent");
  });
});
