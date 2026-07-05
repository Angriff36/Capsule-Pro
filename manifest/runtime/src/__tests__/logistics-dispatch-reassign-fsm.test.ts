/**
 * Conformance — LogisticsDispatch status FSM lets `reassign` reach "assigned".
 *
 * WHY this matters (not just WHAT it does): the Manifest runtime validates EVERY
 * status mutation against the declared `transition` edges and rejects any
 * undeclared target — INCLUDING a no-op self-transition (notes.md §21). The
 * `reassign` command guards `self.status in ["pending", "assigned", "failed"]`
 * and `mutate status = "assigned"`, but the transition table only declared:
 *   pending    -> [assigned]
 *   assigned   -> [in_transit, pending]   (no "assigned" self-loop)
 *   in_transit -> [delivered, failed]     (no "failed" out-edge at all)
 * So two of the three guarded start states were DEAD:
 *   • reassign on an already-assigned dispatch (assigned -> assigned) — the
 *     primary use, swapping driver/vehicle — was a no-op self-transition the
 *     engine silently dropped, LOSING the driver/vehicle change while the
 *     command still reported success.
 *   • reassign on a failed dispatch (failed -> assigned) — the recovery path —
 *     was rejected outright; a failed dispatch could never be re-driven.
 * The fix adds the "assigned" self-loop and the "failed" -> "assigned" edge
 * (mirrors the invoice PARTIALLY_PAID / equipment active self-loop precedents).
 *
 * Each test SEEDS the precondition row directly in the store (isolated
 * infrastructure setup, constitution §13) and drives the real `reassign` command
 * through the production `ManifestRuntimeEngine` + compiled IR, asserting the
 * runtime ACCEPTS the transition AND persists the new driver/vehicle — the part
 * the silent-drop bug ate. They fail loudly if the transition table regresses.
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

const TENANT = "t-logistics-reassign-fsm";
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

/** Seed a LogisticsDispatch row at a given status (precondition setup, not the behaviour under test). */
async function seedDispatch(
  provider: (entity: string) => Store,
  status: string,
  overrides: Record<string, unknown> = {}
): Promise<string> {
  const id = randomUUID();
  await provider("LogisticsDispatch").create({
    id,
    tenantId: TENANT,
    routeId: "route-fsm-001",
    driverId: "driver-old",
    vehicleId: "vehicle-old",
    status,
    priority: "normal",
    failureReason: "",
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
      entity: "LogisticsDispatch",
      command,
      body: { tenantId: TENANT, ...body },
      user: { ...USER },
    }
  );
}

describe("Conformance: LogisticsDispatch reassign reaches 'assigned' from every guarded state", () => {
  it("IR carries the assigned self-loop and the failed -> assigned recovery edge", () => {
    const ent = Array.isArray(ir.entities)
      ? // biome-ignore lint/suspicious/noExplicitAny: structural IR.
        ir.entities.find((x: any) => x.name === "LogisticsDispatch")
      : ir.entities.LogisticsDispatch;
    const transitions: { from: string; to: string[] }[] = ent.transitions ?? [];
    const byFrom = new Map(transitions.map((t) => [t.from, t.to]));

    // The two previously-missing edges reassign depends on.
    expect(byFrom.get("assigned")).toContain("assigned");
    expect(byFrom.get("failed")).toContain("assigned");
    // The original edges are preserved.
    expect(byFrom.get("pending")).toContain("assigned");
    expect(byFrom.get("assigned")).toContain("in_transit");
    expect(byFrom.get("in_transit")).toEqual(
      expect.arrayContaining(["delivered", "failed"])
    );
  });

  it("reassign swaps driver/vehicle on an already-assigned dispatch (assigned -> assigned self-loop) — previously a silent no-op", async () => {
    const provider = makeProvider();
    const id = await seedDispatch(provider, "assigned");
    const engine = newEngine(provider);

    const result = await run(engine, "reassign", {
      id,
      driverId: "driver-new",
      vehicleId: "vehicle-new",
      estimatedDeliveryTime: new Date(1_700_000_000_000).toISOString(),
      notes: "swap to backup driver",
    });

    expect(result.ok).toBe(true);
    const row = (await provider("LogisticsDispatch").getById(id)) as Record<
      string,
      unknown
    >;
    expect(row.status).toBe("assigned");
    // The mutation the silent-drop bug previously ate:
    expect(row.driverId).toBe("driver-new");
    expect(row.vehicleId).toBe("vehicle-new");
  });

  it("reassign recovers a failed dispatch onto a new driver (failed -> assigned) — previously rejected", async () => {
    const provider = makeProvider();
    const id = await seedDispatch(provider, "failed", {
      failureReason: "vehicle breakdown",
    });
    const engine = newEngine(provider);

    const result = await run(engine, "reassign", {
      id,
      driverId: "driver-recovery",
      vehicleId: "vehicle-recovery",
      estimatedDeliveryTime: new Date(1_700_000_000_000).toISOString(),
      notes: "re-driven after breakdown",
    });

    expect(result.ok).toBe(true);
    const row = (await provider("LogisticsDispatch").getById(id)) as Record<
      string,
      unknown
    >;
    expect(row.status).toBe("assigned");
    expect(row.driverId).toBe("driver-recovery");
    // reassign clears the stale failure reason.
    expect(row.failureReason).toBe("");
  });

  it("reassign still works from pending (pending -> assigned, unchanged)", async () => {
    const provider = makeProvider();
    const id = await seedDispatch(provider, "pending", {
      driverId: "",
      vehicleId: "",
    });
    const engine = newEngine(provider);

    const result = await run(engine, "reassign", {
      id,
      driverId: "driver-first",
      vehicleId: "vehicle-first",
      estimatedDeliveryTime: new Date(1_700_000_000_000).toISOString(),
      notes: "first assignment",
    });

    expect(result.ok).toBe(true);
    const row = (await provider("LogisticsDispatch").getById(id)) as Record<
      string,
      unknown
    >;
    expect(row.status).toBe("assigned");
    expect(row.driverId).toBe("driver-first");
  });
});
