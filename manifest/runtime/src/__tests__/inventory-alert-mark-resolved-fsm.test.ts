/**
 * Conformance — InventoryAlert status FSM lets `markResolved` resolve an
 * ACTIVE (un-acknowledged) alert directly.
 *
 * WHY this matters (not just WHAT it does): the Manifest runtime validates EVERY
 * status mutation against the declared `transition` edges and rejects any
 * undeclared target (notes.md §21). The `markResolved` command guards
 * `self.status != "resolved"` (i.e. active OR acknowledged) and
 * `mutate status = "resolved"`, but the transition table only declared:
 *   active       -> [acknowledged]
 *   acknowledged -> [resolved]
 * So resolving an alert straight from "active" (active -> resolved) — the common
 * case where staff fix the underlying condition, e.g. restock the item, without
 * first acknowledging — was an undeclared transition the engine silently
 * rejected: the command reported failure / the resolve was dropped. The guard
 * was deliberately written `!= "resolved"` (not `== "acknowledged"`), signalling
 * direct resolution from active was intended — so the transition table, not the
 * guard, was the bug.
 *
 * The fix adds the active -> resolved edge (mirrors the EventGuest confirmed /
 * invoice PARTIALLY_PAID / equipment active self-loop transition-drift fixes).
 *
 * Each test SEEDS the precondition row directly in the store (isolated
 * infrastructure setup, constitution §13) and drives the real `markResolved`
 * command through the production `ManifestRuntimeEngine` + compiled IR, asserting
 * the runtime ACCEPTS the transition AND stamps resolvedBy/resolvedAt — the part
 * the silent-drop bug ate. They fail loudly if the table regresses.
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

const TENANT = "t-inventory-alert-fsm";
const USER = {
  id: "u-inv",
  tenantId: TENANT,
  role: "inventory_manager",
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

/**
 * Seed an InventoryAlert row at a given status (precondition setup, not the
 * behaviour under test). Every entity-level block constraint (validStatus /
 * validSeverity / validAlertType) is satisfied so the engine's re-validation on
 * update does not silently drop the mutate (notes.md §21 / block-constraint
 * bootstrap class).
 */
async function seedAlert(
  provider: (entity: string) => Store,
  status: string,
  overrides: Record<string, unknown> = {}
): Promise<string> {
  const id = randomUUID();
  await provider("InventoryAlert").create({
    id,
    tenantId: TENANT,
    itemId: "item-fsm-001",
    alertType: "low_stock",
    severity: "high",
    thresholdValue: 10,
    notes: "Stock below threshold",
    status,
    triggeredAt: Date.now(),
    acknowledgedAt: null,
    resolvedAt: null,
    acknowledgedBy: "",
    resolvedBy: "",
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
      entity: "InventoryAlert",
      command,
      body: { tenantId: TENANT, ...body },
      user: { ...USER },
    }
  );
}

describe("Conformance: InventoryAlert markResolved can resolve an active alert directly", () => {
  it("IR carries the active -> resolved edge alongside the original edges", () => {
    const ent = Array.isArray(ir.entities)
      ? // biome-ignore lint/suspicious/noExplicitAny: structural IR.
        ir.entities.find((x: any) => x.name === "InventoryAlert")
      : ir.entities.InventoryAlert;
    const transitions: { property?: string; from: string; to: string[] }[] =
      ent.transitions ?? [];
    const status = transitions.filter(
      (t) => (t.property ?? "status") === "status"
    );
    const byFrom = new Map(status.map((t) => [t.from, t.to]));

    // The previously-missing edge markResolved depends on from active.
    expect(byFrom.get("active")).toContain("resolved");
    // The original edges are preserved.
    expect(byFrom.get("active")).toContain("acknowledged");
    expect(byFrom.get("acknowledged")).toContain("resolved");
  });

  it("resolves an ACTIVE alert directly (active -> resolved) and stamps resolvedBy/resolvedAt — previously silently rejected", async () => {
    const provider = makeProvider();
    const id = await seedAlert(provider, "active");
    const engine = newEngine(provider);

    const result = await run(engine, "markResolved", {
      id,
      resolvedBy: USER.id,
    });

    expect(result.ok).toBe(true);
    const row = (await provider("InventoryAlert").getById(id)) as Record<
      string,
      unknown
    >;
    expect(row.status).toBe("resolved");
    // The mutations the silent-drop bug previously ate.
    expect(row.resolvedBy).toBe(USER.id);
    expect(row.resolvedAt).toBeTruthy();
  });

  it("still resolves an ACKNOWLEDGED alert (acknowledged -> resolved, unchanged)", async () => {
    const provider = makeProvider();
    const id = await seedAlert(provider, "acknowledged", {
      acknowledgedBy: "u-other",
      acknowledgedAt: Date.now(),
    });
    const engine = newEngine(provider);

    const result = await run(engine, "markResolved", {
      id,
      resolvedBy: USER.id,
    });

    expect(result.ok).toBe(true);
    const row = (await provider("InventoryAlert").getById(id)) as Record<
      string,
      unknown
    >;
    expect(row.status).toBe("resolved");
    expect(row.resolvedBy).toBe(USER.id);
  });

  it("still refuses to re-resolve a resolved alert (guard, not transition)", async () => {
    const provider = makeProvider();
    const id = await seedAlert(provider, "resolved", {
      resolvedBy: "u-other",
      resolvedAt: Date.now(),
    });
    const engine = newEngine(provider);

    const result = await run(engine, "markResolved", {
      id,
      resolvedBy: USER.id,
    });

    // The guard `status != "resolved"` blocks this.
    expect(result.ok).toBe(false);
    const row = (await provider("InventoryAlert").getById(id)) as Record<
      string,
      unknown
    >;
    expect(row.status).toBe("resolved");
    expect(row.resolvedBy).toBe("u-other");
  });
});
