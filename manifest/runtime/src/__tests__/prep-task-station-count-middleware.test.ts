/**
 * Middleware conformance — PrepTask lifecycle → Station.currentTaskCount reconciliation
 * (IMPLEMENTATION_PLAN P1, "PrepTask completion → Station.removeTask").
 *
 * WHY this matters (not just WHAT it does): `Station.currentTaskCount` is the stored property the
 * capacity computeds (`isAtCapacity`/`capacityRemaining`/…) and — critically — the `assignTask`
 * `blockFull` / `warnNearCapacity` constraints read to enforce station capacity. But NOTHING in the
 * runtime ever moved it: `assignTask`/`removeTask` have no reaction or middleware caller, so the
 * count sat at its create-time 0 and capacity enforcement was inert (a capacity-3 station would
 * never block a 4th task). The recently-shipped capacity computeds were therefore correct in form
 * but dead in practice. This middleware closes the loop.
 *
 * WHY a recompute and not +1/-1 deltas (the crux this test pins): `PrepTask.unclaim` and
 * `PrepTask.release` CLEAR `stationId` in the same mutate that re-opens the task, so by the
 * after-emit hook the row no longer knows which station to decrement (and the partial event payload
 * doesn't carry it — declared event fields are never auto-populated from `self.*`). A naive delta
 * middleware would leak the count upward forever. Instead, on any station-affecting PrepTask event,
 * the middleware recomputes every station's true occupancy (= in_progress PrepTasks pointing at it)
 * and dispatches the absolute, idempotent `Station.syncTaskCount(count)` only where the stored count
 * drifted — correct on EVERY path, including unclaim/release.
 *
 * The test runs against the REAL compiled IR through the runtime engine WITH the middleware wired,
 * driving genuine PrepTask commands (claim/complete/unclaim), so it FAILS LOUDLY if the propagation
 * regresses — count not tracked, the unclaim reset lost, or fan-out broken (CLAUDE.md Rule 9;
 * constitution §13). It also regression-locks that nobody re-expresses this tenant-wide fan-out as a
 * (structurally impossible) single-target reaction.
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { createPrepTaskStationCountMiddleware } from "../middleware/prep-task-station-count-middleware.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-station-count";
// admin satisfies BOTH PrepTask's default policy AND Station.syncTaskCount's default policy.
const USER = { id: "u-station-count", tenantId: TENANT, role: "admin" } as const;

const STATION_1 = "station-c-1";
const STATION_2 = "station-c-2";

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

/** Build the engine with the PrepTask→Station-count middleware wired (as the factory does). */
function newEngine(provider: (entity: string) => Store): ManifestRuntimeEngine {
  let engine: ManifestRuntimeEngine;
  const middleware = [
    createPrepTaskStationCountMiddleware({
      storeProvider: provider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
      onDiagnostic: () => {
        /* silence default console.warn in tests */
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
      now: () => Date.now(),
    }
  );
  return engine;
}

async function seedStation(
  provider: (entity: string) => Store,
  id: string,
  currentTaskCount = 0
) {
  await provider("Station").create({
    id,
    tenantId: TENANT,
    locationId: "loc-1",
    name: `Station ${id}`,
    // positiveCapacity + validStationType are bare invariants re-checked on the merged
    // row, so they must hold or syncTaskCount's mutate is silently dropped.
    stationType: "prep-station",
    capacitySimultaneousTasks: 3,
    currentTaskCount,
    isActive: true,
    inMaintenance: false,
  } as never);
}

async function seedOpenTask(provider: (entity: string) => Store, id: string) {
  await provider("PrepTask").create({
    id,
    tenantId: TENANT,
    eventId: "event-1",
    name: `Task ${id}`,
    taskType: "prep",
    status: "open",
    stationId: "",
    claimedBy: "",
    // Bare invariants (positiveQuantity/validPriority/validStatus) must hold on the
    // merged row through claim/complete or the status mutate is silently dropped.
    quantityTotal: 0,
    quantityCompleted: 0,
    priority: 5,
  } as never);
}

function run(
  engine: ManifestRuntimeEngine,
  command: string,
  body: Record<string, unknown>
) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    { entity: "PrepTask", command, body, user: { ...USER } }
  );
}

async function stationCount(
  provider: (entity: string) => Store,
  id: string
): Promise<number> {
  const station = (await provider("Station").getById(id)) as Record<
    string,
    unknown
  >;
  return Number(station.currentTaskCount);
}

describe("Middleware conformance: PrepTask lifecycle → Station.currentTaskCount", () => {
  it("the compiled IR exposes Station.syncTaskCount and carries NO PrepTask→Station reaction (tenant-wide fan-out is middleware-only)", () => {
    const commands: Record<string, unknown>[] = ir.commands ?? [];
    const hasSync = commands.some(
      (c) => c.entity === "Station" && c.name === "syncTaskCount"
    );
    expect(hasSync).toBe(true);

    const reactions: Record<string, unknown>[] = ir.reactions ?? [];
    const stale = reactions.filter(
      (r) =>
        typeof r.event === "string" &&
        r.event.startsWith("PrepTask") &&
        r.targetEntity === "Station"
    );
    // A regression here means someone tried to express this as a reaction, which cannot resolve
    // the many stations of a tenant nor recompute from a cross-entity scan — it must stay middleware.
    expect(stale).toHaveLength(0);
  });

  it("claiming tasks increments the station's stored count to the true occupancy (not a boolean)", async () => {
    const provider = makeProvider();
    await seedStation(provider, STATION_1, 0);
    await seedStation(provider, STATION_2, 0);
    await seedOpenTask(provider, "task-A");
    await seedOpenTask(provider, "task-B");
    const engine = newEngine(provider);

    const r1 = await run(engine, "claim", {
      id: "task-A",
      tenantId: TENANT,
      userId: USER.id,
      stationId: STATION_1,
    });
    expect(r1.ok).toBe(true);
    expect(await stationCount(provider, STATION_1)).toBe(1);

    const r2 = await run(engine, "claim", {
      id: "task-B",
      tenantId: TENANT,
      userId: USER.id,
      stationId: STATION_1,
    });
    expect(r2.ok).toBe(true);

    // THE PROOF: the stored count tracks the real number of in-progress tasks at the station,
    // and an unrelated station is untouched (fan-out is scoped to actual occupancy).
    expect(await stationCount(provider, STATION_1)).toBe(2);
    expect(await stationCount(provider, STATION_2)).toBe(0);

    // Secondary proof: the reconciliation command's event bubbles up into the parent command —
    // only possible if the middleware actually dispatched Station.syncTaskCount.
    const synced = (r2.ok ? r2.events : [])?.filter(
      // biome-ignore lint/suspicious/noExplicitAny: structural event rows.
      (e: any) => e?.name === "StationTaskCountSynced"
    );
    expect((synced?.length ?? 0) >= 1).toBe(true);
  });

  it("completing a task decrements the station's count (done tasks no longer occupy)", async () => {
    const provider = makeProvider();
    await seedStation(provider, STATION_1, 0);
    await seedOpenTask(provider, "task-A");
    await seedOpenTask(provider, "task-B");
    const engine = newEngine(provider);

    await run(engine, "claim", {
      id: "task-A",
      tenantId: TENANT,
      userId: USER.id,
      stationId: STATION_1,
    });
    await run(engine, "claim", {
      id: "task-B",
      tenantId: TENANT,
      userId: USER.id,
      stationId: STATION_1,
    });
    expect(await stationCount(provider, STATION_1)).toBe(2);

    const done = await run(engine, "complete", {
      id: "task-A",
      tenantId: TENANT,
      quantityCompleted: 0,
      userId: USER.id,
      completedAt: Date.now(),
    });
    expect(done.ok).toBe(true);
    // One task done → occupancy 1.
    expect(await stationCount(provider, STATION_1)).toBe(1);
  });

  it("unclaiming a task resets the count even though unclaim CLEARS stationId (recompute, not delta — the crux)", async () => {
    const provider = makeProvider();
    await seedStation(provider, STATION_1, 0);
    await seedOpenTask(provider, "task-A");
    const engine = newEngine(provider);

    await run(engine, "claim", {
      id: "task-A",
      tenantId: TENANT,
      userId: USER.id,
      stationId: STATION_1,
    });
    expect(await stationCount(provider, STATION_1)).toBe(1);

    const unclaimed = await run(engine, "unclaim", {
      id: "task-A",
      tenantId: TENANT,
      userId: USER.id,
      reason: "stepped away",
    });
    expect(unclaimed.ok).toBe(true);

    // The task is back to open with stationId="" — a +1/-1 delta middleware could NOT find the
    // station to decrement here. The recompute resets station-1 to 0 from the now-empty occupancy.
    const task = (await provider("PrepTask").getById("task-A")) as Record<
      string,
      unknown
    >;
    expect(task.status).toBe("open");
    expect(task.stationId).toBe("");
    expect(await stationCount(provider, STATION_1)).toBe(0);
  });
});
