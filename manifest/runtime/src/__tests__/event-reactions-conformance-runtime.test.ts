/**
 * Event hub reactions — EventCreated → BattleBoard.create (Phase C).
 *
 * Proves the governed Event.create chain dispatches the declarative reaction
 * and persists a linked BattleBoard with inherited event context.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-event-reaction";
const USER = {
  id: "u-event-reaction",
  tenantId: TENANT,
  role: "admin",
} as const;

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
    const row = { ...data, id, tenantId: data.tenantId ?? TENANT };
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

describe("Reaction conformance: EventCreated → BattleBoard.create", () => {
  it("the compiled IR carries the EventCreated reaction", () => {
    const reactions: Array<Record<string, unknown>> = ir.reactions ?? [];
    const created = reactions.find(
      (r) =>
        r.event === "EventCreated" &&
        r.targetEntity === "BattleBoard" &&
        r.targetCommand === "create"
    );
    expect(created).toBeDefined();
    expect(JSON.stringify(created?.params)).toContain("eventId");
    expect(JSON.stringify(created?.params)).toContain("boardName");
  });

  it("Event.create dispatches BattleBoard.create and links the board to the event", async () => {
    const provider = makeProvider();
    const engine = new ManifestRuntimeEngine(
      ir,
      {
        tenantId: USER.tenantId,
        user: { id: USER.id, tenantId: USER.tenantId, role: USER.role },
      },
      { storeProvider: provider, customBuiltins: createCustomBuiltins() }
    );

    const result = await runManifestCommandCore(
      { createRuntime: async () => engine },
      {
        entity: "Event",
        command: "create",
        body: {
          clientId: "client-1",
          eventNumber: "EVT-2026-0099",
          title: "Reaction Board Test",
          eventType: "catering",
          eventDate: Date.parse("2026-07-04T12:00:00Z"),
          guestCount: 80,
          venueName: "Garden Hall",
          venueAddress: "1 Main St",
          notes: "",
          tags: [],
          status: "draft",
          budget: 0,
          ticketPrice: 0,
          ticketTier: "",
          eventFormat: "",
          accessibilityOptions: [],
          featuredMediaUrl: "",
          templateId: "",
        },
        user: { ...USER },
      }
    );

    expect(result.ok).toBe(true);

    const eventNames = (result.ok ? result.events : [])?.map(
      // biome-ignore lint/suspicious/noExplicitAny: structural event rows.
      (e: any) => e?.name
    );
    expect(eventNames).toContain("EventCreated");
    expect(eventNames).toContain("BattleBoardCreated");

    const createdEvent = result.ok
      ? (result.result as { id?: string; guestCount?: number })
      : null;
    expect(createdEvent?.id).toBeTruthy();

    const boards = (await provider("BattleBoard").getAll()) as Array<
      Record<string, unknown>
    >;
    expect(boards.length).toBe(1);
    expect(boards[0]?.eventId).toBe(createdEvent?.id);
    expect(boards[0]?.boardName).toBe("Reaction Board Test - Battle Board");
    expect(boards[0]?.guestCount).toBe(80);
    expect(boards[0]?.venueName).toBe("Garden Hall");
  });
});
