/**
 * Proposal parent-context — runtime inference proof (Task 8.10).
 *
 * Companion to the IR-contract test (apps/api/__tests__/crm/proposal-parent-context.test.ts).
 * That test proves Proposal.create does NOT accept the event-owned fields as
 * params (assertion b of the parent-from-child guardrail). THIS test proves
 * assertion (a): those fields are actually INFERRED server-side from only the
 * parent FK (eventId), against the REAL compiled IR — not a synthetic fixture.
 *
 * It exercises the same generic resolver the dispatcher runs
 * (run-manifest-command-core → resolveParentContext), so a regression that stops
 * copying a field, or breaks the Proposal→Event belongsTo wiring, fails here.
 */

import { RuntimeEngine, type Store } from "@angriff36/manifest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveParentContext } from "../parent-context-resolver.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-proposal-ctx";
const EVENT_ID = "evt-pc-1";
const EVENT_DATE = 1_750_000_000_000;

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
    if (!existing) return undefined as never;
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

function makeProvider(): { provider: (entity: string) => Store; stores: Map<string, Mem> } {
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
  return new RuntimeEngine(ir, { user: { id: "u1", tenantId: TENANT } }, { storeProvider: provider });
}

async function seedEvent(provider: (entity: string) => Store, overrides: Record<string, unknown> = {}) {
  await provider("Event").create({
    id: EVENT_ID,
    tenantId: TENANT,
    clientId: "client-77",
    eventDate: EVENT_DATE,
    eventType: "wedding",
    venueName: "Grand Hall",
    venueAddress: "1 Main St",
    guestCount: 120,
    status: "confirmed",
    ...overrides,
  } as never);
}

describe("Proposal create — inherits Event-owned context from only the eventId FK (real IR)", () => {
  it("fills clientId/eventDate/eventType/venueName/venueAddress server-side", async () => {
    const { provider } = makeProvider();
    await seedEvent(provider);
    const runtime = newEngine(provider);

    const { body, inheritedFields } = await resolveParentContext(runtime, {
      entity: "Proposal",
      command: "create",
      // ONLY proposal-specific input + the parent link — no event-owned fields.
      body: { proposalNumber: "P-1", title: "Smith Wedding Proposal", eventId: EVENT_ID },
    });

    expect(body.clientId).toBe("client-77");
    expect(body.eventDate).toBe(EVENT_DATE);
    expect(body.eventType).toBe("wedding");
    expect(body.venueName).toBe("Grand Hall");
    expect(body.venueAddress).toBe("1 Main St");
    expect(inheritedFields.sort()).toEqual(
      ["clientId", "eventDate", "eventType", "venueAddress", "venueName"].sort()
    );
  });

  it("keeps guestCount caller-owned (proposal-specific) and lets a child override win", async () => {
    const { provider } = makeProvider();
    await seedEvent(provider);
    const runtime = newEngine(provider);

    const { body, inheritedFields } = await resolveParentContext(runtime, {
      entity: "Proposal",
      command: "create",
      body: { proposalNumber: "P-2", title: "x", eventId: EVENT_ID, venueName: "Override Hall", guestCount: 50 },
    });

    // guestCount stays a create param -> never inherited.
    expect(inheritedFields).not.toContain("guestCount");
    expect(body.guestCount).toBe(50);
    // explicit child value wins over the parent's.
    expect(body.venueName).toBe("Override Hall");
    expect(inheritedFields).not.toContain("venueName");
  });

  it("skips empty parent values (no silent blanks copied onto the proposal)", async () => {
    const { provider } = makeProvider();
    await seedEvent(provider, { venueAddress: "" });
    const runtime = newEngine(provider);

    const { body, inheritedFields } = await resolveParentContext(runtime, {
      entity: "Proposal",
      command: "create",
      body: { proposalNumber: "P-3", title: "x", eventId: EVENT_ID },
    });

    expect(body.venueAddress).toBeUndefined();
    expect(inheritedFields).not.toContain("venueAddress");
    // a non-empty field still inherits
    expect(body.clientId).toBe("client-77");
  });

  it("is a no-op when no eventId link is supplied (standalone proposal)", async () => {
    const { provider } = makeProvider();
    await seedEvent(provider);
    const runtime = newEngine(provider);

    const { inheritedFields } = await resolveParentContext(runtime, {
      entity: "Proposal",
      command: "create",
      body: { proposalNumber: "P-4", title: "x" },
    });

    expect(inheritedFields).toEqual([]);
  });
});
