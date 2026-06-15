/**
 * Middleware conformance — `ScheduleShiftCreated/Removed → Schedule.syncShiftCount`
 * (IMPLEMENTATION_PLAN P1, Staffing → the remaining "Schedule.shiftCount" leg of
 * "OpenShiftClaimed → ScheduleShift.create", also flagged on the time-off
 * shift-cleanup leg).
 *
 * WHY this matters (not just WHAT it does): `Schedule.shiftCount` is a STORED int
 * that two GOVERNED gates read — `Schedule.approve`'s `guard self.shiftCount > 0`
 * and `Schedule.release`'s `blockNoShifts:block self.shiftCount > 0`. But NO
 * ScheduleShift create/remove path ever moved it, so it stayed at its create-time 0
 * and BOTH gates were starved: a schedule with real shifts could neither be approved
 * nor published (the same dead-counter deadlock class as the Proposal `lineItemCount`
 * send-block). This middleware keeps the stored count honest so the gates function.
 *
 * The fix is a RECOMPUTE (absolute set), not a +/- delta, because
 * `ScheduleShift.remove` only sets `deletedAt` and its `ScheduleShiftRemoved` payload
 * carries no `scheduleId` (declared event fields are never auto-populated from
 * `self.*`) — a delta middleware would have nothing to decrement. Recompute is correct
 * on every path and HEALS drift.
 *
 * Each test drives the REAL governed `ScheduleShift.create`/`remove` (and
 * `Schedule.approve`) commands through the runtime WITH the middleware wired, so it
 * FAILS LOUDLY if the propagation regresses — the count not maintained, the approve
 * deadlock returning, or a delta leaking instead of a true recompute (CLAUDE.md Rule
 * 9; constitution §13).
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { createScheduleShiftCountMiddleware } from "../middleware/schedule-shift-count-middleware.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-shift-count";
// manager satisfies BOTH ScheduleShift's default policy (manager/admin) and
// Schedule's default policy (manager/admin), so neither the source shift command
// nor the syncShiftCount dispatch is policy-denied.
const USER = { id: "u-mgr", tenantId: TENANT, role: "manager" } as const;

const SCHEDULE_ID = "sched-001";
const LOCATION_ID = "loc-001";
const SHIFT_START = 1_900_000_000_000; // arbitrary epoch ms
const SHIFT_END = SHIFT_START + 6 * 60 * 60 * 1000; // +6h

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

/** Build the engine with the ScheduleShift-count reconciliation middleware wired. */
function newEngine(provider: (entity: string) => Store): ManifestRuntimeEngine {
  let engine: ManifestRuntimeEngine;
  const middleware = [
    createScheduleShiftCountMiddleware({
      storeProvider: provider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
      onDiagnostic: () => {
        /* silence console diagnostics in tests */
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

/** Seed the parent Schedule (infrastructure setup). Default: draft, 0 shifts. */
async function seedSchedule(
  provider: (entity: string) => Store,
  overrides: Record<string, unknown> = {}
) {
  await provider("Schedule").create({
    id: SCHEDULE_ID,
    tenantId: TENANT,
    locationId: LOCATION_ID,
    status: "draft",
    scheduleDate: SHIFT_START,
    notes: "",
    shiftCount: 0,
    deletedAt: null,
    ...overrides,
  } as never);
}

let shiftSeq = 0;
/** Drive the REAL governed ScheduleShift.create; returns its command result. */
async function createShift(
  engine: ManifestRuntimeEngine,
  employeeId: string,
  id = `shift-${++shiftSeq}`
) {
  const result = await runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "ScheduleShift",
      command: "create",
      body: {
        id,
        tenantId: TENANT,
        scheduleId: SCHEDULE_ID,
        employeeId,
        // Required-but-non-param field, body-seeded via create-bootstrap.
        locationId: LOCATION_ID,
        shiftStart: SHIFT_START,
        shiftEnd: SHIFT_END,
        roleDuringShift: "server",
        notes: "",
        swapStatus: "none",
        deletedAt: null,
      },
      user: { ...USER },
    }
  );
  return { id, result };
}

/** Drive the REAL governed ScheduleShift.remove (soft-delete). */
async function removeShift(engine: ManifestRuntimeEngine, id: string) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "ScheduleShift",
      command: "remove",
      body: { id, tenantId: TENANT, userId: USER.id },
      user: { ...USER },
    }
  );
}

/** Drive the REAL governed Schedule.approve — its guard reads shiftCount. */
async function approveSchedule(engine: ManifestRuntimeEngine) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "Schedule",
      command: "approve",
      body: { id: SCHEDULE_ID, tenantId: TENANT, userId: USER.id },
      user: { ...USER },
    }
  );
}

async function shiftCountOf(provider: (entity: string) => Store) {
  const schedule = (await provider("Schedule").getById(SCHEDULE_ID)) as
    | { shiftCount?: unknown }
    | undefined;
  return schedule?.shiftCount;
}

function eventNames(result: { ok: boolean; events?: unknown[] }): string[] {
  return (result.ok ? (result.events ?? []) : []).map(
    // biome-ignore lint/suspicious/noExplicitAny: structural event rows.
    (e: any) => e?.name as string
  );
}

describe("Middleware conformance: ScheduleShift create/remove → Schedule.syncShiftCount", () => {
  it("the compiled IR has the syncShiftCount command and NO ScheduleShift→Schedule reaction (it is middleware)", () => {
    const reactions: Record<string, unknown>[] = ir.reactions ?? [];
    const stale = reactions.filter(
      (r) =>
        (r.event === "ScheduleShiftCreated" ||
          r.event === "ScheduleShiftRemoved") &&
        r.targetEntity === "Schedule"
    );
    expect(stale).toHaveLength(0);

    // The recompute target command must exist on Schedule (mirrors Station.syncTaskCount).
    // IR entity `commands` is an array of command-name strings.
    const schedule = (ir.entities ?? []).find(
      // biome-ignore lint/suspicious/noExplicitAny: structural IR rows.
      (e: any) => e.name === "Schedule"
    );
    expect(schedule?.commands ?? []).toContain("syncShiftCount");
  });

  it("unblocks the approve deadlock: a 0-shift draft cannot be approved, but creating a shift syncs shiftCount and approval then succeeds", async () => {
    const provider = makeProvider();
    await seedSchedule(provider);
    const engine = newEngine(provider);

    // Precondition: with shiftCount at 0, the governed approve guard blocks it.
    const blocked = await approveSchedule(engine);
    expect(blocked.ok).toBe(false);

    const { result } = await createShift(engine, "emp-alex");
    expect(result.ok).toBe(true);

    // THE PROOF the counter is maintained + the sync command fired.
    expect(shiftCountOf(provider)).resolves.toBe(1);
    expect(eventNames(result)).toContain("ScheduleShiftCreated");
    expect(eventNames(result)).toContain("ScheduleShiftCountSynced");

    // The same schedule can now be approved — the deadlock is gone.
    const approved = await approveSchedule(engine);
    expect(approved.ok).toBe(true);
    const schedule = (await provider("Schedule").getById(SCHEDULE_ID)) as {
      status?: unknown;
    };
    expect(schedule.status).toBe("approved");
  });

  it("recomputes the TRUE count as multiple shifts are added", async () => {
    const provider = makeProvider();
    await seedSchedule(provider);
    const engine = newEngine(provider);

    await createShift(engine, "emp-a");
    expect(await shiftCountOf(provider)).toBe(1);
    await createShift(engine, "emp-b");
    expect(await shiftCountOf(provider)).toBe(2);
    await createShift(engine, "emp-c");
    expect(await shiftCountOf(provider)).toBe(3);
  });

  it("decrements on removal and re-locks approval when the last shift is removed", async () => {
    const provider = makeProvider();
    await seedSchedule(provider);
    const engine = newEngine(provider);

    const a = await createShift(engine, "emp-a");
    const b = await createShift(engine, "emp-b");
    expect(await shiftCountOf(provider)).toBe(2);

    // Removing one soft-deletes it; the recompute excludes deleted rows.
    const removedB = await removeShift(engine, b.id);
    expect(removedB.ok).toBe(true);
    expect(await shiftCountOf(provider)).toBe(1);

    // Removing the last drives the count back to 0 and the approve guard re-engages.
    const removedA = await removeShift(engine, a.id);
    expect(eventNames(removedA)).toContain("ScheduleShiftCountSynced");
    expect(await shiftCountOf(provider)).toBe(0);
    const blockedAgain = await approveSchedule(engine);
    expect(blockedAgain.ok).toBe(false);
  });

  it("HEALS drift: a stale stored shiftCount is corrected to reality (absolute recompute, not a delta)", async () => {
    const provider = makeProvider();
    // Pretend the stored count was left wildly wrong (e.g. out-of-band writes).
    await seedSchedule(provider, { shiftCount: 9 });
    const engine = newEngine(provider);

    // One real governed shift event triggers a full recompute: the true count is 1,
    // NOT 10 (which a +1 delta off the stale 9 would have produced).
    await createShift(engine, "emp-a");
    expect(await shiftCountOf(provider)).toBe(1);
  });
});
