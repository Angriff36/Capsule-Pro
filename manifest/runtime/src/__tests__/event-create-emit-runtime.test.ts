/**
 * Event.create governed path — proves EventCreated emits through RuntimeEngine.
 *
 * WHY: apps/app previously used direct `tx.event.create`, bypassing Manifest and
 * silencing EventCreated (no reactions/sagas/outbox). Routing through
 * runManifestCommandCore must emit the semantic event so propagation can fire.
 */

import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
// @boundaries-ignore automatically added by `turbo boundaries --ignore=all`
"../../../ir/kitchen.ir.json" with { type: "json" };
import { createCustomBuiltins } from "../manifest-builtins.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";

// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON.
const ir: any = kitchenIr;

const TENANT = "t-event-create";
const USER = { id: "u-event-create", tenantId: TENANT, role: "admin" } as const;

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

describe("Event.create — governed write emits EventCreated", () => {
  it("the compiled IR declares Event.create with EventCreated emit", () => {
    const createCmd = ir.commands.find(
      (c: { entity: string; name: string }) =>
        c.entity === "Event" && c.name === "create"
    );
    expect(createCmd).toBeDefined();
    const emits: string[] = createCmd.emits ?? createCmd.events ?? [];
    expect(emits).toContain("EventCreated");
  });

  it("runManifestCommandCore returns EventCreated in emitted events", async () => {
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
          clientId: "",
          eventNumber: "EVT-2026-0001",
          title: "Governed Create Test",
          eventType: "catering",
          eventDate: Date.parse("2026-06-20T12:00:00Z"),
          guestCount: 50,
          venueName: "",
          venueAddress: "",
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

    const created = result.ok
      ? (result.result as { id?: string; title?: string })
      : null;
    expect(created?.id).toBeTruthy();
    expect(created?.title).toBe("Governed Create Test");
  });
});
