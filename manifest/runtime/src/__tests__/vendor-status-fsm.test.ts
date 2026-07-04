/**
 * Conformance — Vendor status FSM lets `approve` re-affirm an already-active
 * vendor (active self-loop) and `remove` idempotently re-deactivate an
 * already-inactive vendor (inactive self-loop).
 *
 * WHY this matters (not just WHAT it does): the Manifest runtime validates EVERY
 * status mutation against the declared `transition` edges and rejects any
 * undeclared target — INCLUDING a no-op self-transition (notes.md §21). The
 * Vendor transition table declared only:
 *   active   -> [inactive, blacklisted]
 *   inactive -> [active, blacklisted]
 * But two commands' guards admit the same state they mutate to:
 *   • approve — `guard self.status != "blacklisted"` (admits "active"),
 *     `mutate status = "active"`. Re-approving an already-active vendor (a
 *     real path: a manager re-confirming/refreshing approvedBy/approvedAt) was
 *     an undeclared "active -> active" and silently dropped while the command
 *     still reported ok. Only the "inactive -> active" half worked.
 *   • remove — `guard self.status != "blacklisted"` (admits "inactive"),
 *     `mutate status = "inactive"`. Re-removing an already-inactive vendor is a
 *     no-op self-transition the engine dropped, so the command was not
 *     idempotent.
 * The fix adds the two self-loop targets — active -> [..., active] and
 * inactive -> [..., inactive] — covering exactly the guard-admitted-state ×
 * reachable-target pairs (same dead-command class as the Driver / EventGuest /
 * EventStaff / LogisticsDispatch / VendorContract / Facility / InventoryAlert
 * transition fixes).
 *
 * Each test SEEDS the precondition row directly in the store (isolated
 * infrastructure setup, constitution §13) and drives the real command through
 * the production `ManifestRuntimeEngine` + compiled IR, asserting the runtime
 * ACCEPTS the transition AND persists the new status. They fail loudly if the
 * transition table regresses.
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

const TENANT = "t-vendor-status-fsm";
const USER = {
  id: "u-mgr",
  tenantId: TENANT,
  role: "procurement_manager",
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
 * Seed a Vendor row at a given status (precondition setup, not the behaviour
 * under test). All entity-level block constraints (validType / validStatus /
 * validPaymentTerms) must hold or the runtime silently drops the update mutate.
 */
async function seedVendor(
  provider: (entity: string) => Store,
  status: string,
  overrides: Record<string, unknown> = {}
): Promise<string> {
  const id = randomUUID();
  await provider("Vendor").create({
    id,
    tenantId: TENANT,
    name: "Acme Supply Co",
    type: "supplier",
    status,
    email: "",
    phone: "",
    website: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    taxId: "",
    paymentTerms: "net30",
    rating: 0,
    ratingCount: 0,
    notes: "",
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
      entity: "Vendor",
      command,
      body: { tenantId: TENANT, ...body },
      user: { ...USER },
    }
  );
}

describe("Conformance: Vendor approve/remove operate idempotently on their own state", () => {
  it("IR carries the active and inactive self-loops alongside the original edges", () => {
    const ent = Array.isArray(ir.entities)
      ? // biome-ignore lint/suspicious/noExplicitAny: structural IR.
        ir.entities.find((x: any) => x.name === "Vendor")
      : ir.entities.Vendor;
    const transitions: { from: string; to: string[] }[] = ent.transitions ?? [];
    const byFrom = new Map(transitions.map((t) => [t.from, t.to]));

    // The previously-missing self-loops approve/remove depend on.
    expect(byFrom.get("active")).toEqual(
      expect.arrayContaining(["inactive", "blacklisted", "active"])
    );
    expect(byFrom.get("inactive")).toEqual(
      expect.arrayContaining(["active", "blacklisted", "inactive"])
    );
  });

  it("approve re-affirms an already-active vendor (active -> active) — previously dropped", async () => {
    const provider = makeProvider();
    const id = await seedVendor(provider, "active");
    const engine = newEngine(provider);

    const result = await run(engine, "approve", { id, approvedBy: "u-mgr" });

    expect(result.ok).toBe(true);
    const row = (await provider("Vendor").getById(id)) as Record<
      string,
      unknown
    >;
    expect(row.status).toBe("active");
    // The re-affirmation actually persisted (approvedBy stamped).
    expect(row.approvedBy).toBe("u-mgr");
  });

  it("approve still reactivates an inactive vendor (inactive -> active, unchanged)", async () => {
    const provider = makeProvider();
    const id = await seedVendor(provider, "inactive");
    const engine = newEngine(provider);

    const result = await run(engine, "approve", { id, approvedBy: "u-mgr" });

    expect(result.ok).toBe(true);
    const row = (await provider("Vendor").getById(id)) as Record<
      string,
      unknown
    >;
    expect(row.status).toBe("active");
  });

  it("remove on an already-inactive vendor is idempotent (inactive -> inactive self-loop) — previously rejected", async () => {
    const provider = makeProvider();
    const id = await seedVendor(provider, "inactive");
    const engine = newEngine(provider);

    const result = await run(engine, "remove", {
      id,
      reason: "no longer used",
    });

    expect(result.ok).toBe(true);
    const row = (await provider("Vendor").getById(id)) as Record<
      string,
      unknown
    >;
    expect(row.status).toBe("inactive");
    expect(row.notes).toBe("no longer used");
  });

  it("remove still deactivates an active vendor (active -> inactive, unchanged)", async () => {
    const provider = makeProvider();
    const id = await seedVendor(provider, "active");
    const engine = newEngine(provider);

    const result = await run(engine, "remove", { id, reason: "offboarding" });

    expect(result.ok).toBe(true);
    const row = (await provider("Vendor").getById(id)) as Record<
      string,
      unknown
    >;
    expect(row.status).toBe("inactive");
  });

  it("a blacklisted vendor still cannot be approved (guard rejects, status untouched)", async () => {
    const provider = makeProvider();
    const id = await seedVendor(provider, "blacklisted");
    const engine = newEngine(provider);

    const result = await run(engine, "approve", { id, approvedBy: "u-mgr" });

    // Guard `self.status != "blacklisted"` excludes blacklisted.
    expect(result.ok).toBe(false);
    const row = (await provider("Vendor").getById(id)) as Record<
      string,
      unknown
    >;
    expect(row.status).toBe("blacklisted");
  });
});
