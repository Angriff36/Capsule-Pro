/**
 * Middleware conformance — `MaintenanceWorkOrderCompleted → Equipment.recordMaintenance`
 * (IMPLEMENTATION_PLAN P0).
 *
 * WHY this matters (not just WHAT it does): completing a maintenance work order is
 * supposed to record the maintenance on the parent Equipment (refresh
 * lastMaintenanceDate / nextMaintenanceDate) and return it to active status, so the
 * equipment's maintenance history and availability track reality. This was a SILENT
 * NO-OP: the two old reactions (`run Equipment.recordMaintenance` and
 * `run Equipment.updateStatus`) both resolved `payload.result.equipmentId`, and
 * `MaintenanceWorkOrder.completeWork` is a MUTATE command, so the engine's emitted
 * payload `{ ...commandInput, result }` carries `result` = the last mutate's scalar
 * (`completedAt`), NOT the MaintenanceWorkOrder instance. So completed work orders never
 * touched the equipment record.
 *
 * The fix is middleware (not a reaction), per the verified engine-semantics rule:
 * `equipmentId` is the MaintenanceWorkOrder's OWN field — not a `completeWork` param, and
 * declared event fields are never auto-populated from `self.*` — so no reaction can read
 * it. The middleware loads the completed work order from the store, reads
 * `self.equipmentId`, and dispatches the governed `Equipment.recordMaintenance`. Only ONE
 * command is dispatched: recordMaintenance itself mutates `status = "active"`, subsuming
 * the redundant `updateStatus` reaction (dispatching both would trip updateStatus's
 * `newStatus != self.status` guard once active).
 *
 * Self-transition note (regression-locked here): because MaintenanceWorkOrderCreated →
 * maintenance is not wired, equipment is typically ALREADY active when a work order
 * completes, so recordMaintenance's `status = "active"` mutate is a no-op self-transition.
 * The engine does not exempt those, so the equipment source adds an `active → active`
 * self-loop; without it the whole recordMaintenance update (incl. the date refresh) is
 * silently dropped. The "already active" test below proves the dates persist.
 *
 * The test runs against the REAL compiled IR through the runtime engine WITH the
 * middleware wired, so it FAILS LOUDLY if the propagation regresses (CLAUDE.md Rule 9;
 * constitution §13), and regression-locks that nobody re-expresses this as the (no-op) IR
 * reactions.
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { createMaintenanceCompletedEquipmentRecordMiddleware } from "../middleware/maintenance-completed-equipment-record-middleware.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-maint-record";
// admin satisfies MaintenanceWorkOrder.completeWork AND Equipment.recordMaintenance policy.
const USER = { id: "u-maint-record", tenantId: TENANT, role: "admin" } as const;

const EQUIP = "equip-A";
const WORK_ORDER = "wo-A";
const FIXED_NOW = 1_700_000_000_000;
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

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

/** Build the engine with the maintenance-record middleware wired (as the factory does). */
function newEngine(provider: (entity: string) => Store): ManifestRuntimeEngine {
  let engine: ManifestRuntimeEngine;
  const middleware = [
    createMaintenanceCompletedEquipmentRecordMiddleware({
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
  // validCondition/positiveMaintenanceInterval/positiveMaxUsage) so recordMaintenance's
  // updateInstance re-validation does not silently drop the update.
  await provider("Equipment").create({
    id: EQUIP,
    tenantId: TENANT,
    locationId: "loc-1",
    name: "Walk-in Cooler",
    type: "cooking",
    status,
    condition: "good",
    maintenanceIntervalDays: 90,
    maxUsageHours: 1000,
    usageHours: 0,
    isActive: true,
  } as never);
}

async function seedWorkOrder(
  provider: (entity: string) => Store,
  overrides: Record<string, unknown> = {}
) {
  await provider("MaintenanceWorkOrder").create({
    id: WORK_ORDER,
    tenantId: TENANT,
    equipmentId: EQUIP,
    title: "Compressor service",
    workOrderType: "corrective",
    priority: "medium",
    status: "in_progress",
    totalCost: 0,
    ...overrides,
  } as never);
}

async function complete(engine: ManifestRuntimeEngine, totalCost: number) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "MaintenanceWorkOrder",
      command: "completeWork",
      body: {
        id: WORK_ORDER,
        tenantId: TENANT,
        totalCost,
        partsUsed: "compressor seal",
        notes: "done",
        userId: "u-tech",
      },
      user: { ...USER },
    }
  );
}

describe("Middleware conformance: MaintenanceWorkOrderCompleted → Equipment.recordMaintenance", () => {
  it("the compiled IR no longer carries the broken Maintenance→Equipment reactions (they are middleware now)", () => {
    const reactions: Record<string, unknown>[] = ir.reactions ?? [];
    const stale = reactions.filter(
      (r) =>
        r.event === "MaintenanceWorkOrderCompleted" &&
        r.targetEntity === "Equipment" &&
        (r.targetCommand === "recordMaintenance" ||
          r.targetCommand === "updateStatus")
    );
    // A regression here means someone re-added the dead `payload.result.equipmentId`
    // reactions; the propagation must stay in middleware.
    expect(stale).toHaveLength(0);
  });

  it("completing a work order records maintenance on the (already active) equipment and keeps it active", async () => {
    const provider = makeProvider();
    await seedEquipment(provider, "active");
    await seedWorkOrder(provider, { totalCost: 250 });
    const engine = newEngine(provider);

    const result = await complete(engine, 250);
    expect(result.ok).toBe(true);

    // THE PROOF: the middleware ran Equipment.recordMaintenance against the SAME store,
    // so the maintenance dates were stamped and the equipment stayed active — none of
    // which the no-op reactions did. The status="active" mutate is a self-transition
    // (already active), so this also locks in the active→active self-loop.
    const equipment = (await provider("Equipment").getById(EQUIP)) as Record<
      string,
      unknown
    >;
    expect(Number(equipment.lastMaintenanceDate)).toBe(FIXED_NOW);
    expect(Number(equipment.nextMaintenanceDate)).toBe(
      FIXED_NOW + NINETY_DAYS_MS
    );
    expect(equipment.status).toBe("active");

    // Secondary proof: the downstream recordMaintenance event bubbles up — only
    // possible if the middleware executed.
    const eventNames = (result.ok ? result.events : [])?.map(
      // biome-ignore lint/suspicious/noExplicitAny: structural event rows.
      (e: any) => e?.name
    );
    expect(eventNames).toContain("MaintenanceWorkOrderCompleted");
    expect(eventNames).toContain("EquipmentMaintenanceRecorded");
  });

  it("returns equipment that was in maintenance back to active on completion", async () => {
    const provider = makeProvider();
    await seedEquipment(provider, "maintenance");
    await seedWorkOrder(provider);
    const engine = newEngine(provider);

    const result = await complete(engine, 0);
    expect(result.ok).toBe(true);

    const equipment = (await provider("Equipment").getById(EQUIP)) as Record<
      string,
      unknown
    >;
    expect(equipment.status).toBe("active");
    expect(Number(equipment.lastMaintenanceDate)).toBe(FIXED_NOW);
  });

  it("skips recording when the work order carries no equipmentId", async () => {
    const provider = makeProvider();
    await seedEquipment(provider, "active");
    await seedWorkOrder(provider, { equipmentId: "" });
    const engine = newEngine(provider);

    const result = await complete(engine, 100);
    // The work order still completes; only the equipment record is skipped (guard-safe).
    expect(result.ok).toBe(true);

    const equipment = (await provider("Equipment").getById(EQUIP)) as Record<
      string,
      unknown
    >;
    expect(equipment.lastMaintenanceDate).toBeUndefined();

    const eventNames = (result.ok ? result.events : [])?.map(
      // biome-ignore lint/suspicious/noExplicitAny: structural event rows.
      (e: any) => e?.name
    );
    expect(eventNames).toContain("MaintenanceWorkOrderCompleted");
    expect(eventNames).not.toContain("EquipmentMaintenanceRecorded");
  });
});
