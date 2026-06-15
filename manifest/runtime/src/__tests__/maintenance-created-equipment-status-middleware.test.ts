/**
 * Middleware conformance — `MaintenanceWorkOrderCreated → Equipment.updateStatus("maintenance")`
 * (IMPLEMENTATION_PLAN P1, Operations & logistics / Facilities).
 *
 * WHY this matters (not just WHAT it does): opening a maintenance work order against a
 * piece of equipment means that equipment is being worked on and must stop reading as
 * available/bookable. `MaintenanceWorkOrderCreated` had ZERO consumers, so the parent
 * Equipment stayed `active` for the whole life of an open work order — schedulers and the
 * equipment-status board never reflected that it was down. This is the symmetric
 * counterpart of the already-shipped `MaintenanceWorkOrderCompleted → recordMaintenance`
 * leg (which returns the equipment to `active`): open ⇒ `maintenance`, complete ⇒ `active`.
 *
 * WHY middleware and not a reaction: `equipmentId` IS a `MaintenanceWorkOrder.create` param
 * and `create` is a create command, so `payload.equipmentId` is reachable — a reaction was
 * technically possible here. We use middleware anyway for GUARD-SAFETY: `updateStatus`
 * guards `newStatus != self.status` and the FSM only allows `-> "maintenance"` from
 * `active`/`out_of_service`, so a reaction would fire blindly and rely on the engine
 * swallowing the failure for already-in-maintenance / retired equipment. The middleware
 * loads the equipment first and skips cleanly. It is also a pure runtime addition (no IR
 * change), keeping the schema/route/reaction-payload gates untouched.
 *
 * The test runs against the REAL compiled IR through the runtime engine WITH the middleware
 * wired, so it FAILS LOUDLY if the propagation regresses (CLAUDE.md Rule 9; constitution
 * §13), and regression-locks that nobody re-expresses this as an IR reaction.
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { createMaintenanceCreatedEquipmentStatusMiddleware } from "../middleware/maintenance-created-equipment-status-middleware.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-maint-open";
// admin satisfies MaintenanceWorkOrder.create AND Equipment.updateStatus policy.
const USER = { id: "u-maint-open", tenantId: TENANT, role: "admin" } as const;

const EQUIP = "equip-A";
const FIXED_NOW = 1_700_000_000_000;

// Minimal persistent in-memory store (mirrors the upstream MemoryStore contract).
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

/** Build the engine with the maintenance-status middleware wired (as the factory does). */
function newEngine(provider: (entity: string) => Store): ManifestRuntimeEngine {
  let engine: ManifestRuntimeEngine;
  const middleware = [
    createMaintenanceCreatedEquipmentStatusMiddleware({
      storeProvider: provider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
      onDiagnostic: () => {
        /* no-op in tests */
      },
    }),
  ];
  engine = new ManifestRuntimeEngine(
    ir,
    {
      tenantId: USER.tenantId,
      user: { id: USER.id, tenantId: USER.tenantId, role: USER.role },
    },
    {
      storeProvider: provider,
      customBuiltins: createCustomBuiltins(),
      middleware,
      generateId: () => randomUUID(),
      now: () => FIXED_NOW,
    }
  );
  return engine;
}

async function seedEquipment(
  provider: (entity: string) => Store,
  status: string
) {
  // Seed every entity-level block constraint (validEquipmentType/validStatus/
  // validCondition/positiveMaintenanceInterval/positiveMaxUsage) so updateStatus's
  // updateInstance re-validation does not silently drop the update.
  await provider("Equipment").create({
    id: EQUIP,
    tenantId: TENANT,
    locationId: "loc-1",
    name: "Walk-in Cooler",
    type: "refrigeration",
    status,
    condition: "good",
    maintenanceIntervalDays: 90,
    maxUsageHours: 1000,
    usageHours: 0,
    isActive: true,
  } as never);
}

async function createWorkOrder(
  engine: ManifestRuntimeEngine,
  overrides: Record<string, unknown> = {}
) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "MaintenanceWorkOrder",
      command: "create",
      body: {
        tenantId: TENANT,
        title: "Compressor service",
        workOrderType: "corrective",
        priority: "medium",
        description: "",
        areaId: "",
        equipmentId: EQUIP,
        assignedTo: "",
        reportedBy: "",
        notes: "",
        ...overrides,
      },
      user: { ...USER },
    }
  );
}

function eventNamesOf(result: { ok: boolean; events?: unknown }): string[] {
  return (result.ok ? (result.events as unknown[]) : [])?.map(
    // biome-ignore lint/suspicious/noExplicitAny: structural event rows.
    (e: any) => e?.name as string
  );
}

async function statusOf(provider: (entity: string) => Store): Promise<unknown> {
  const equipment = (await provider("Equipment").getById(EQUIP)) as Record<
    string,
    unknown
  >;
  return equipment.status;
}

describe("Middleware conformance: MaintenanceWorkOrderCreated → Equipment.updateStatus(maintenance)", () => {
  it("the compiled IR carries NO MaintenanceWorkOrderCreated → Equipment reaction (it is middleware)", () => {
    const reactions: Record<string, unknown>[] = ir.reactions ?? [];
    const stale = reactions.filter(
      (r) =>
        r.event === "MaintenanceWorkOrderCreated" &&
        r.targetEntity === "Equipment"
    );
    // A regression here means someone wired this as a (guard-unsafe) reaction; the
    // propagation must stay in middleware.
    expect(stale).toHaveLength(0);
  });

  it("opening a work order takes active equipment into maintenance", async () => {
    const provider = makeProvider();
    await seedEquipment(provider, "active");
    const engine = newEngine(provider);

    const result = await createWorkOrder(engine);
    expect(result.ok).toBe(true);

    // THE PROOF: the middleware ran Equipment.updateStatus against the SAME store, so the
    // equipment is now in maintenance — which nothing did before this leg existed.
    expect(await statusOf(provider)).toBe("maintenance");

    // The downstream status event bubbles up — only possible if the middleware executed.
    const names = eventNamesOf(result);
    expect(names).toContain("MaintenanceWorkOrderCreated");
    expect(names).toContain("EquipmentStatusUpdated");
  });

  it("opening a work order on out-of-service equipment also moves it to maintenance", async () => {
    const provider = makeProvider();
    await seedEquipment(provider, "out_of_service");
    const engine = newEngine(provider);

    const result = await createWorkOrder(engine);
    expect(result.ok).toBe(true);
    expect(await statusOf(provider)).toBe("maintenance");
    expect(eventNamesOf(result)).toContain("EquipmentStatusUpdated");
  });

  it("skips equipment already in maintenance (guard-safe no-op, no swallowed failure)", async () => {
    const provider = makeProvider();
    await seedEquipment(provider, "maintenance");
    const engine = newEngine(provider);

    const result = await createWorkOrder(engine);
    // The work order still opens; only the status change is skipped.
    expect(result.ok).toBe(true);
    expect(await statusOf(provider)).toBe("maintenance");

    const names = eventNamesOf(result);
    expect(names).toContain("MaintenanceWorkOrderCreated");
    expect(names).not.toContain("EquipmentStatusUpdated");
  });

  it("skips retired equipment (terminal state cannot transition to maintenance)", async () => {
    const provider = makeProvider();
    await seedEquipment(provider, "retired");
    const engine = newEngine(provider);

    const result = await createWorkOrder(engine);
    expect(result.ok).toBe(true);
    expect(await statusOf(provider)).toBe("retired");
    expect(eventNamesOf(result)).not.toContain("EquipmentStatusUpdated");
  });

  it("skips when the work order carries no equipmentId", async () => {
    const provider = makeProvider();
    await seedEquipment(provider, "active");
    const engine = newEngine(provider);

    const result = await createWorkOrder(engine, { equipmentId: "" });
    expect(result.ok).toBe(true);
    // Equipment untouched; the work order still opens (guard-safe).
    expect(await statusOf(provider)).toBe("active");
    expect(eventNamesOf(result)).not.toContain("EquipmentStatusUpdated");
  });
});
