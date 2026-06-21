/**
 * Conformance — Event-tree `CommandBoard` lets `deactivate` archive a board
 * from BOTH the "draft" and "active" states.
 *
 * WHY this matters (not just WHAT it does): the Manifest runtime validates EVERY
 * status mutation against the declared `transition` edges and rejects any
 * undeclared target (notes.md §21). CommandBoard.deactivate guards
 * `self.status != "archived"` — i.e. it admits BOTH "draft" and "active" — and
 * mutates `status = "archived"`. But the transition table only declared:
 *   draft  -> [active]
 *   active -> [archived]
 * So "draft -> archived" was never an edge: deactivating a draft board passed
 * its guard but the runtime rejected the transition, making `deactivate` DEAD
 * from "draft". Abandoning a draft event-tree board (created, never activated)
 * could therefore never archive/soft-delete it — exactly the operation the
 * guard says is allowed. The fix adds the one missing edge
 * `draft -> [active, archived]`, covering the guard-admitted-state ×
 * reachable-target pair (same dead-command class as the Driver / EventStaff /
 * LogisticsDispatch / Vendor / Facility / InventoryAlert / CollectionCase
 * transition fixes).
 *
 * Each test SEEDS the precondition row directly in the store (isolated
 * infrastructure setup, constitution §13) and drives the real `deactivate`
 * command through the production `ManifestRuntimeEngine` + compiled IR,
 * asserting the runtime ACCEPTS the transition AND persists the new status.
 * They fail loudly if the transition table regresses.
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

const TENANT = "t-command-board-deactivate-fsm";
const USER = {
  id: "u-coordinator",
  tenantId: TENANT,
  role: "manager",
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

/** Seed a CommandBoard row at a given status (precondition setup, not the behaviour under test). */
async function seedBoard(
  provider: (entity: string) => Store,
  status: string,
  overrides: Record<string, unknown> = {}
): Promise<string> {
  const id = randomUUID();
  await provider("CommandBoard").create({
    id,
    tenantId: TENANT,
    eventId: "evt-1",
    // Entity-level block constraint `validName` requires a non-empty name, else
    // the runtime silently drops the mutate while still emitting the event
    // ([[mutate-persist-dropped-by-block-constraints]]).
    name: "Smith Wedding Board",
    description: "",
    status,
    isTemplate: false,
    tags: [],
    autoPopulate: false,
    scope: "{}",
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
      entity: "CommandBoard",
      command,
      body: { tenantId: TENANT, ...body },
      user: { ...USER },
    }
  );
}

describe("Conformance: CommandBoard.deactivate archives from draft and active", () => {
  it("IR carries the draft -> archived edge and preserves draft -> active and active -> archived", () => {
    const ent = Array.isArray(ir.entities)
      ? // biome-ignore lint/suspicious/noExplicitAny: structural IR.
        ir.entities.find((x: any) => x.name === "CommandBoard")
      : ir.entities.CommandBoard;
    const transitions: { from: string; to: string[] }[] = ent.transitions ?? [];
    const byFrom = new Map(transitions.map((t) => [t.from, t.to]));

    // The previously-missing edge deactivate depends on from a draft board.
    expect(byFrom.get("draft")).toEqual(
      expect.arrayContaining(["active", "archived"])
    );
    // The original lifecycle edge is preserved.
    expect(byFrom.get("active")).toContain("archived");
  });

  it("deactivate archives a draft board — previously rejected (draft -> archived)", async () => {
    const provider = makeProvider();
    const id = await seedBoard(provider, "draft");
    const engine = newEngine(provider);

    const result = await run(engine, "deactivate", {
      id,
      reason: "event cancelled before setup",
      userId: USER.id,
    });

    expect(result.ok).toBe(true);
    const row = (await provider("CommandBoard").getById(id)) as Record<
      string,
      unknown
    >;
    expect(row.status).toBe("archived");
    expect(row.deletedAt).not.toBeNull();
  });

  it("deactivate still archives an active board (active -> archived, unchanged)", async () => {
    const provider = makeProvider();
    const id = await seedBoard(provider, "active");
    const engine = newEngine(provider);

    const result = await run(engine, "deactivate", {
      id,
      reason: "event complete",
      userId: USER.id,
    });

    expect(result.ok).toBe(true);
    const row = (await provider("CommandBoard").getById(id)) as Record<
      string,
      unknown
    >;
    expect(row.status).toBe("archived");
  });

  it("deactivate on an already-archived board is rejected by its guard (transition untouched)", async () => {
    const provider = makeProvider();
    const id = await seedBoard(provider, "archived", { deletedAt: new Date() });
    const engine = newEngine(provider);

    const result = await run(engine, "deactivate", {
      id,
      reason: "double archive",
      userId: USER.id,
    });

    // Guard `self.status != "archived"` blocks the second deactivate.
    expect(result.ok).toBe(false);
    const row = (await provider("CommandBoard").getById(id)) as Record<
      string,
      unknown
    >;
    expect(row.status).toBe("archived");
  });
});
