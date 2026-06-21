/**
 * Conformance — EventGuest rsvpStatus FSM lets `rsvpConfirm` re-confirm.
 *
 * WHY this matters (not just WHAT it does): the Manifest runtime validates EVERY
 * status mutation against the declared `transition` edges and rejects any
 * undeclared target — INCLUDING a no-op self-transition (notes.md §21). The
 * `rsvpConfirm` command guards `self.rsvpStatus != "declined"` (i.e. pending OR
 * confirmed) and `mutate rsvpStatus = "confirmed"`, but the transition table
 * only declared:
 *   pending   -> [confirmed, declined]
 *   confirmed -> [declined]            (no "confirmed" self-loop)
 * So re-confirming an ALREADY-confirmed guest (confirmed -> confirmed) — the
 * idempotent re-confirm that also refreshes `rsvpRespondedAt` — was a no-op
 * self-transition the engine silently dropped: the command reported success but
 * the `rsvpRespondedAt` refresh was lost. The guard was deliberately written
 * `!= "declined"` (not `== "pending"`), signalling re-confirm was intended — so
 * the transition table, not the guard, was the bug.
 *
 * The fix adds the "confirmed" self-loop (mirrors the invoice PARTIALLY_PAID /
 * equipment active / LogisticsDispatch assigned self-loop precedents).
 *
 * Each test SEEDS the precondition row directly in the store (isolated
 * infrastructure setup, constitution §13) and drives the real `rsvpConfirm`
 * command through the production `ManifestRuntimeEngine` + compiled IR, asserting
 * the runtime ACCEPTS the transition AND refreshes the response timestamp — the
 * part the silent-drop bug ate. They fail loudly if the table regresses.
 */

import { randomUUID } from "node:crypto";
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
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-event-guest-rsvp-fsm";
const USER = {
  id: "u-coord",
  tenantId: TENANT,
  role: "event_coordinator",
} as const;

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
      user: { id: USER.id, tenantId: TENANT, role: USER.role },
    },
    {
      storeProvider: provider,
      customBuiltins: createCustomBuiltins(),
      generateId: () => randomUUID(),
      now: () => Date.now(),
    }
  );
}

/** Seed an EventGuest row at a given rsvpStatus (precondition setup, not the behaviour under test). */
async function seedGuest(
  provider: (entity: string) => Store,
  rsvpStatus: string,
  overrides: Record<string, unknown> = {}
): Promise<string> {
  const id = randomUUID();
  await provider("EventGuest").create({
    id,
    tenantId: TENANT,
    eventId: "event-fsm-001",
    guestName: "Pat Guest",
    guestEmail: "",
    guestPhone: "",
    isPrimaryContact: false,
    dietaryRestrictions: [],
    allergenRestrictions: [],
    notes: "",
    declineReason: "",
    specialMealRequired: false,
    specialMealNotes: "",
    tableAssignment: "",
    mealPreference: "",
    rsvpStatus,
    rsvpRespondedAt: null,
    checkedInAt: null,
    deletedAt: null,
    ...overrides,
  } as never);
  return id;
}

function run(
  engine: ManifestRuntimeEngine,
  command: string,
  body: Record<string, unknown>
) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "EventGuest",
      command,
      body: { tenantId: TENANT, ...body },
      user: { ...USER },
    }
  );
}

describe("Conformance: EventGuest rsvpConfirm can re-confirm an already-confirmed guest", () => {
  it("IR carries the confirmed self-loop alongside the original edges", () => {
    const ent = Array.isArray(ir.entities)
      ? // biome-ignore lint/suspicious/noExplicitAny: structural IR.
        ir.entities.find((x: any) => x.name === "EventGuest")
      : ir.entities.EventGuest;
    const transitions: { property?: string; from: string; to: string[] }[] =
      ent.transitions ?? [];
    const rsvp = transitions.filter(
      (t) => (t.property ?? "rsvpStatus") === "rsvpStatus"
    );
    const byFrom = new Map(rsvp.map((t) => [t.from, t.to]));

    // The previously-missing edge rsvpConfirm depends on.
    expect(byFrom.get("confirmed")).toContain("confirmed");
    // The original edges are preserved.
    expect(byFrom.get("pending")).toEqual(
      expect.arrayContaining(["confirmed", "declined"])
    );
    expect(byFrom.get("confirmed")).toContain("declined");
  });

  it("re-confirms an already-confirmed guest (confirmed -> confirmed self-loop) and refreshes rsvpRespondedAt — previously a silent no-op", async () => {
    const provider = makeProvider();
    const id = await seedGuest(provider, "confirmed", {
      rsvpRespondedAt: "2020-01-01T00:00:00.000Z",
    });
    const engine = newEngine(provider);

    const result = await run(engine, "rsvpConfirm", { id });

    expect(result.ok).toBe(true);
    const row = (await provider("EventGuest").getById(id)) as Record<
      string,
      unknown
    >;
    expect(row.rsvpStatus).toBe("confirmed");
    // The mutation the silent-drop bug previously ate: the timestamp refresh.
    expect(row.rsvpRespondedAt).toBeDefined();
    expect(row.rsvpRespondedAt).not.toBe("2020-01-01T00:00:00.000Z");
  });

  it("still confirms a pending guest (pending -> confirmed, unchanged)", async () => {
    const provider = makeProvider();
    const id = await seedGuest(provider, "pending");
    const engine = newEngine(provider);

    const result = await run(engine, "rsvpConfirm", { id });

    expect(result.ok).toBe(true);
    const row = (await provider("EventGuest").getById(id)) as Record<
      string,
      unknown
    >;
    expect(row.rsvpStatus).toBe("confirmed");
    expect(row.rsvpRespondedAt).toBeDefined();
  });

  it("still refuses to re-confirm a declined guest (guard, not transition)", async () => {
    const provider = makeProvider();
    const id = await seedGuest(provider, "declined", {
      declineReason: "can't make it",
    });
    const engine = newEngine(provider);

    const result = await run(engine, "rsvpConfirm", { id });

    // The guard `rsvpStatus != "declined"` blocks this — re-invite first.
    expect(result.ok).toBe(false);
    const row = (await provider("EventGuest").getById(id)) as Record<
      string,
      unknown
    >;
    expect(row.rsvpStatus).toBe("declined");
  });
});
