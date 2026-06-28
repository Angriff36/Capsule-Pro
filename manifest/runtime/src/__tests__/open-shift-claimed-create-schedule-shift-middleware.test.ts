/**
 * Middleware conformance — `OpenShiftClaimed → ScheduleShift.create`
 * (IMPLEMENTATION_PLAN P1, Staffing → "OpenShiftClaimed → ScheduleShift.create").
 *
 * WHY this matters (not just WHAT it does): an `OpenShift` is an unfilled gap a
 * manager posts; an employee claiming it must end up actually rostered. Until this
 * propagation existed, `OpenShiftClaimed` had no consumer — `OpenShift.claim` flipped
 * the open shift to `claimed` and stamped `claimedBy` but produced NO `ScheduleShift`,
 * so the claimed shift never appeared on the real roster / labor reports / the
 * employee's schedule. A manager had to hand-create the shift.
 *
 * The plan scoped this as middleware (not a reaction) because `OpenShift.claim` is a
 * MUTATE whose payload carries only `claimedBy` — the shift's
 * scheduleId/role/shiftStart/shiftEnd are the OpenShift's OWN fields (never
 * auto-populated onto the event), and `ScheduleShift.create` additionally needs a
 * `locationId` that lives on the parent `Schedule`. So the middleware loads the
 * claimed OpenShift via `_subject.id` and the parent Schedule for `locationId`.
 *
 * The test runs the REAL compiled IR through the runtime engine WITH the middleware
 * wired, so it FAILS LOUDLY if the propagation regresses — no shift created, the
 * wrong fields carried, a location-less shift, or a duplicate on re-claim (CLAUDE.md
 * Rule 9; constitution §13).
 *
 * Chain proven here:
 *   OpenShift.claim(claimedBy)  (status open → claimed, stamps claimedBy)
 *     → emits OpenShiftClaimed (_subject.id = the open shift id)
 *     → middleware loads the open shift + parent schedule and creates a ScheduleShift
 *       (employeeId = claimer, locationId from the schedule, window/role from the shift)
 *     → ScheduleShiftCreated bubbles up.
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { createOpenShiftClaimedCreateScheduleShiftMiddleware } from "../middleware/open-shift-claimed-create-schedule-shift-middleware.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-open-shift";
// manager is in the intersection of OpenShift.claim's default policy
// (hr_admin/payroll_admin/manager/admin) AND ScheduleShift's default policy
// (manager/admin), so neither the source command nor the create dispatch is denied.
const USER = { id: "u-mgr", tenantId: TENANT, role: "manager" } as const;

const SCHEDULE_ID = "sched-001";
const LOCATION_ID = "loc-001";
const OPEN_SHIFT_ID = "open-001";
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

/** Build the engine with the OpenShiftClaimed→ScheduleShift-create middleware wired. */
function newEngine(provider: (entity: string) => Store): ManifestRuntimeEngine {
  let engine: ManifestRuntimeEngine;
  const middleware = [
    createOpenShiftClaimedCreateScheduleShiftMiddleware({
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

/** Seed the parent Schedule (infrastructure setup). */
async function seedSchedule(
  provider: (entity: string) => Store,
  overrides: Record<string, unknown> = {}
) {
  await provider("Schedule").create({
    id: SCHEDULE_ID,
    tenantId: TENANT,
    locationId: LOCATION_ID,
    status: "published",
    scheduleDate: SHIFT_START,
    notes: "",
    shiftCount: 0,
    deletedAt: null,
    ...overrides,
  } as never);
}

/** Seed an OPEN OpenShift ready to be claimed (infrastructure setup). */
async function seedOpenShift(
  provider: (entity: string) => Store,
  overrides: Record<string, unknown> = {}
) {
  await provider("OpenShift").create({
    id: OPEN_SHIFT_ID,
    tenantId: TENANT,
    scheduleId: SCHEDULE_ID,
    role: "server",
    shiftStart: SHIFT_START,
    shiftEnd: SHIFT_END,
    status: "open",
    claimedBy: "",
    deletedAt: null,
    ...overrides,
  } as never);
}

async function claim(engine: ManifestRuntimeEngine, claimedBy: string) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "OpenShift",
      command: "claim",
      body: { id: OPEN_SHIFT_ID, tenantId: TENANT, claimedBy },
      user: { ...USER },
    }
  );
}

async function shiftsOf(provider: (entity: string) => Store) {
  return (await provider("ScheduleShift").getAll()) as Record<
    string,
    unknown
  >[];
}

describe("Middleware conformance: OpenShiftClaimed → ScheduleShift.create", () => {
  it("the compiled IR carries no OpenShiftClaimed→ScheduleShift reaction (it is middleware)", () => {
    const reactions: Record<string, unknown>[] = ir.reactions ?? [];
    const stale = reactions.filter(
      (r) =>
        r.event === "OpenShiftClaimed" && r.targetEntity === "ScheduleShift"
    );
    // A regression here means someone added a reaction that cannot read the open
    // shift's own fields (scheduleId/role/window) or the parent schedule's location.
    expect(stale).toHaveLength(0);
  });

  it("claiming an open shift creates a ScheduleShift for the claimer with the shift's window/role and the schedule's location", async () => {
    const provider = makeProvider();
    await seedSchedule(provider);
    await seedOpenShift(provider);
    const engine = newEngine(provider);

    const result = await claim(engine, "emp-alex");
    expect(result.ok).toBe(true);

    const shifts = await shiftsOf(provider);
    // THE PROOF: exactly one shift, carrying the claim's identity + the schedule's location.
    expect(shifts).toHaveLength(1);
    const shift = shifts[0]!;
    expect(shift.employeeId).toBe("emp-alex");
    expect(shift.scheduleId).toBe(SCHEDULE_ID);
    expect(shift.locationId).toBe(LOCATION_ID);
    expect(shift.roleDuringShift).toBe("server");
    // datetime persists as the same epoch-ms instant.
    expect(toMs(shift.shiftStart)).toBe(SHIFT_START);
    expect(toMs(shift.shiftEnd)).toBe(SHIFT_END);

    // Secondary proof: the downstream command's event bubbles up — only possible if
    // the middleware executed and dispatched the create.
    const eventNames = (result.ok ? result.events : [])?.map(
      // biome-ignore lint/suspicious/noExplicitAny: structural event rows.
      (e: any) => e?.name
    );
    expect(eventNames).toContain("OpenShiftClaimed");
    expect(eventNames).toContain("ScheduleShiftCreated");
  });

  it("does not create a shift when the parent schedule has no locationId (required field)", async () => {
    const provider = makeProvider();
    await seedSchedule(provider, { locationId: "" });
    await seedOpenShift(provider);
    const engine = newEngine(provider);

    const result = await claim(engine, "emp-alex");
    // The claim itself still succeeds; only the (location-less) shift is skipped.
    expect(result.ok).toBe(true);
    expect(await shiftsOf(provider)).toHaveLength(0);
  });

  it("is idempotent: a matching shift already on the roster is not duplicated", async () => {
    const provider = makeProvider();
    await seedSchedule(provider);
    await seedOpenShift(provider);
    // A shift identical to the one the claim would produce already exists.
    await provider("ScheduleShift").create({
      id: "existing-shift",
      tenantId: TENANT,
      scheduleId: SCHEDULE_ID,
      employeeId: "emp-alex",
      locationId: LOCATION_ID,
      shiftStart: SHIFT_START,
      shiftEnd: SHIFT_END,
      roleDuringShift: "server",
      notes: "manually created earlier",
      swapStatus: "none",
      deletedAt: null,
    } as never);
    const engine = newEngine(provider);

    const result = await claim(engine, "emp-alex");
    expect(result.ok).toBe(true);

    // Still exactly one shift — the pre-existing one, untouched.
    const shifts = await shiftsOf(provider);
    expect(shifts).toHaveLength(1);
    expect(shifts[0]!.id).toBe("existing-shift");
    expect(shifts[0]!.notes).toBe("manually created earlier");
  });
});

/** Coerce a datetime (epoch-ms number, Date, or ISO string) to ms for comparison. */
function toMs(value: unknown): number | undefined {
  if (typeof value === "number") {
    return value;
  }
  if (value instanceof Date) {
    return value.getTime();
  }
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : Date.parse(value);
  }
  return undefined;
}
