/**
 * Conformance — EventStaff status FSM transitions match the command set.
 *
 * WHY this matters (not just WHAT it does): the Manifest runtime validates EVERY
 * status mutation against the declared `transition` edges and rejects any
 * undeclared target — including a no-op self-transition (notes.md §21). The
 * EventStaff transition table had drifted from its own commands: it listed phantom
 * targets ("completed"/"cancelled") that no command writes and `validStatus`
 * forbids, while OMITTING real edges the commands depend on. Concretely, four
 * governed commands were silently rejected at runtime:
 *   • assign re-called on an already-assigned row  (assigned -> assigned)  [documented bug]
 *   • checkIn from "assigned"                       (assigned -> checked_in)
 *   • markNoShow from "assigned"                    (assigned -> no_show)
 *   • checkOut                                      (checked_in -> checked_out)  [fully dead]
 * checkOut was completely unreachable — the day-of attendance flow could never
 * close out. These bugs survived because no test exercised those edges.
 *
 * Each test SEEDS the precondition row directly in the store (isolated
 * infrastructure setup, constitution §13) and then drives the real command through
 * the production `ManifestRuntimeEngine` + compiled IR, asserting the runtime
 * ACCEPTS the transition and persists the new status. These fail loudly if the
 * transition table regresses back to the phantom-state vocabulary.
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

const TENANT = "t-event-staff-fsm";
const USER = { id: "u-mgr", tenantId: TENANT, role: "manager" } as const;

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

/** Seed an EventStaff row at a given status (precondition setup, not the behaviour under test). */
async function seedEventStaff(
  provider: (entity: string) => Store,
  status: string
): Promise<string> {
  const id = randomUUID();
  await provider("EventStaff").create({
    id,
    tenantId: TENANT,
    eventId: "event-fsm-001",
    staffMemberId: "staff-fsm-001",
    role: "Server",
    notes: "",
    status,
    deletedAt: null,
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
      entity: "EventStaff",
      command,
      body: { tenantId: TENANT, ...body },
      user: { ...USER },
    }
  );
}

describe("Conformance: EventStaff status FSM transitions match the command set", () => {
  it("IR carries the corrected, command-faithful transition table (no phantom states)", () => {
    const ent = Array.isArray(ir.entities)
      ? // biome-ignore lint/suspicious/noExplicitAny: structural IR.
        ir.entities.find((x: any) => x.name === "EventStaff")
      : ir.entities.EventStaff;
    const transitions: { from: string; to: string[] }[] = ent.transitions ?? [];
    const byFrom = new Map(transitions.map((t) => [t.from, t.to]));

    // The documented self-loop (re-assign) and the previously-dead checkOut edge.
    expect(byFrom.get("assigned")).toContain("assigned");
    expect(byFrom.get("assigned")).toContain("checked_in");
    expect(byFrom.get("assigned")).toContain("no_show");
    expect(byFrom.get("checked_in")).toEqual(["checked_out"]);

    // Phantom states that no command writes and validStatus forbids must be gone.
    const allTargets = transitions.flatMap((t) => t.to);
    expect(allTargets).not.toContain("completed");
    expect(allTargets).not.toContain("cancelled");
  });

  it("assign on an already-assigned row succeeds (assigned -> assigned self-loop)", async () => {
    const provider = makeProvider();
    const id = await seedEventStaff(provider, "assigned");
    const engine = newEngine(provider);

    const result = await run(engine, "assign", {
      id,
      eventId: "event-fsm-001",
      staffMemberId: "staff-fsm-001",
      role: "Lead Server",
    });

    expect(result.ok).toBe(true);
    const row = (await provider("EventStaff").getById(id)) as Record<
      string,
      unknown
    >;
    expect(row.status).toBe("assigned");
    expect(row.role).toBe("Lead Server");
  });

  it("checkIn fires directly from assigned (assigned -> checked_in)", async () => {
    const provider = makeProvider();
    const id = await seedEventStaff(provider, "assigned");
    const engine = newEngine(provider);

    const result = await run(engine, "checkIn", { id });

    expect(result.ok).toBe(true);
    const row = (await provider("EventStaff").getById(id)) as Record<
      string,
      unknown
    >;
    expect(row.status).toBe("checked_in");
  });

  it("checkOut closes out a checked-in row (checked_in -> checked_out) — previously dead", async () => {
    const provider = makeProvider();
    const id = await seedEventStaff(provider, "checked_in");
    const engine = newEngine(provider);

    const result = await run(engine, "checkOut", { id });

    expect(result.ok).toBe(true);
    const row = (await provider("EventStaff").getById(id)) as Record<
      string,
      unknown
    >;
    expect(row.status).toBe("checked_out");
  });

  it("markNoShow fires from assigned (assigned -> no_show)", async () => {
    const provider = makeProvider();
    const id = await seedEventStaff(provider, "assigned");
    const engine = newEngine(provider);

    const result = await run(engine, "markNoShow", { id, reason: "No call" });

    expect(result.ok).toBe(true);
    const row = (await provider("EventStaff").getById(id)) as Record<
      string,
      unknown
    >;
    expect(row.status).toBe("no_show");
  });
});
