/**
 * Conformance — Driver status FSM lets `reactivate` (and idempotent `remove`)
 * operate from the "inactive" state.
 *
 * WHY this matters (not just WHAT it does): the Manifest runtime validates EVERY
 * status mutation against the declared `transition` edges and rejects any
 * undeclared target — INCLUDING a no-op self-transition (notes.md §21). The
 * Driver transition table declared edges only out of "available", "on_route",
 * and "off_duty" — it had NO row for "inactive" as a source state at all:
 *   available -> [on_route, off_duty, inactive]
 *   on_route  -> [available, off_duty, inactive]
 *   off_duty  -> [available, on_route, inactive]
 * But two commands' guards admit "inactive":
 *   • reactivate — `guard self.status in ["off_duty", "inactive"]`, `mutate
 *     status = "available"`. This is the command's WHOLE POINT — bring a removed
 *     (inactive) driver back — yet "inactive -> available" was never a declared
 *     edge, so reactivating an inactive driver was rejected outright. Only the
 *     "off_duty -> available" half of the guard actually worked.
 *   • remove — `guard self.status != "on_route"` (admits "inactive"), `mutate
 *     status = "inactive"`. Re-removing an already-inactive driver is a no-op
 *     self-transition the engine dropped, so the command failed instead of
 *     being idempotent.
 * The fix adds one row — `inactive -> [available, inactive]` — covering exactly
 * the guard-admitted-state × reachable-target pairs (same dead-command class as
 * the EventGuest / EventStaff / LogisticsDispatch / VendorContract / Facility /
 * InventoryAlert transition fixes).
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

const TENANT = "t-driver-reactivate-fsm";
const USER = {
  id: "u-mgr",
  tenantId: TENANT,
  role: "logistics_manager",
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

/** Seed a Driver row at a given status (precondition setup, not the behaviour under test). */
async function seedDriver(
  provider: (entity: string) => Store,
  status: string,
  overrides: Record<string, unknown> = {}
): Promise<string> {
  const id = randomUUID();
  await provider("Driver").create({
    id,
    tenantId: TENANT,
    name: "Pat Driver",
    email: "pat@example.com",
    phone: "555-0100",
    licenseNumber: "DL-12345",
    licenseExpiry: null,
    vehicleId: "",
    status,
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
      entity: "Driver",
      command,
      body: { tenantId: TENANT, ...body },
      user: { ...USER },
    }
  );
}

describe("Conformance: Driver reactivate/remove operate from the 'inactive' state", () => {
  it("IR carries the inactive -> available reactivation edge and the inactive self-loop", () => {
    const ent = Array.isArray(ir.entities)
      ? // biome-ignore lint/suspicious/noExplicitAny: structural IR.
        ir.entities.find((x: any) => x.name === "Driver")
      : ir.entities.Driver;
    const transitions: { from: string; to: string[] }[] = ent.transitions ?? [];
    const byFrom = new Map(transitions.map((t) => [t.from, t.to]));

    // The previously-missing row reactivate/remove depend on.
    expect(byFrom.get("inactive")).toEqual(
      expect.arrayContaining(["available", "inactive"])
    );
    // The original edges are preserved.
    expect(byFrom.get("available")).toEqual(
      expect.arrayContaining(["on_route", "off_duty", "inactive"])
    );
    expect(byFrom.get("off_duty")).toContain("available");
  });

  it("reactivate brings an inactive (removed) driver back to available — previously rejected", async () => {
    const provider = makeProvider();
    const id = await seedDriver(provider, "inactive");
    const engine = newEngine(provider);

    const result = await run(engine, "reactivate", {
      id,
      notes: "back from leave",
    });

    expect(result.ok).toBe(true);
    const row = (await provider("Driver").getById(id)) as Record<
      string,
      unknown
    >;
    expect(row.status).toBe("available");
  });

  it("reactivate still works from off_duty (off_duty -> available, unchanged)", async () => {
    const provider = makeProvider();
    const id = await seedDriver(provider, "off_duty");
    const engine = newEngine(provider);

    const result = await run(engine, "reactivate", { id, notes: "" });

    expect(result.ok).toBe(true);
    const row = (await provider("Driver").getById(id)) as Record<
      string,
      unknown
    >;
    expect(row.status).toBe("available");
  });

  it("remove on an already-inactive driver is idempotent (inactive -> inactive self-loop) — previously rejected", async () => {
    const provider = makeProvider();
    const id = await seedDriver(provider, "inactive");
    const engine = newEngine(provider);

    const result = await run(engine, "remove", { id });

    expect(result.ok).toBe(true);
    const row = (await provider("Driver").getById(id)) as Record<
      string,
      unknown
    >;
    expect(row.status).toBe("inactive");
  });

  it("an on_route driver still cannot be reactivated (guard rejects, transition untouched)", async () => {
    const provider = makeProvider();
    const id = await seedDriver(provider, "on_route");
    const engine = newEngine(provider);

    const result = await run(engine, "reactivate", { id, notes: "" });

    // Guard `self.status in ["off_duty","inactive"]` excludes on_route.
    expect(result.ok).toBe(false);
    const row = (await provider("Driver").getById(id)) as Record<
      string,
      unknown
    >;
    expect(row.status).toBe("on_route");
  });
});
