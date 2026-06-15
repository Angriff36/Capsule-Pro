/**
 * Middleware conformance — `TimeOffRequestApproved → conflicting ScheduleShift
 * cleanup` (IMPLEMENTATION_PLAN P1, Staffing → "TimeOffRequestApproved →
 * conflicting shift cleanup").
 *
 * WHY this matters (not just WHAT it does): approving an employee's time off must
 * take that person OFF any shift inside the approved window. Until this
 * propagation existed, `TimeOffRequestApproved` had no consumer, so an approved
 * request left every clashing shift live — the schedule showed the employee both
 * on leave and rostered to work, a double-booking a human had to clean up by
 * hand. The plan scoped this as middleware (not a reaction) because it is a 1:N
 * fan-out AND the employee/date fields are the request's OWN fields, absent from
 * the `TimeOffRequestApproved` payload, so the request is loaded and the shifts
 * are queried.
 *
 * The test runs the REAL compiled IR through the runtime engine WITH the
 * middleware wired (the middleware lives in the factory, not the IR), so it FAILS
 * LOUDLY if the propagation regresses — no removal, the wrong shift removed, or a
 * shift outside the window removed — i.e. it fails when the BUSINESS propagation
 * breaks, not on a mere shape change (CLAUDE.md Rule 9; constitution §13).
 *
 * Chain proven here:
 *   TimeOffRequest.approve(processedBy)  (status PENDING → APPROVED)
 *     → emits TimeOffRequestApproved (_subject.id = the request id)
 *     → middleware loads the request, scans this employee's active ScheduleShift
 *       rows, and removes the ones overlapping [startDate, endDate]
 *     → ScheduleShift rows soft-delete, ScheduleShiftRemoved bubbles up.
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { createTimeOffApprovedShiftCleanupMiddleware } from "../middleware/time-off-approved-shift-cleanup-middleware.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-timeoff-cleanup";
// manager satisfies BOTH TimeOffRequest.approve's policy AND ScheduleShift.remove's
// policy (user.role in ["manager", "admin"]) so neither the source command nor the
// downstream dispatch is denied.
const USER = { id: "u-mgr", tenantId: TENANT, role: "manager" } as const;

const REQUEST_ID = "timeoff-001";
const EMPLOYEE = "emp-pto";

// Approved time-off window: 2026-07-10 .. 2026-07-12 (inclusive, whole days).
const TOFF_START = "2026-07-10";
const TOFF_END = "2026-07-12";
const dayMs = (iso: string) => Date.parse(`${iso}T12:00:00.000Z`);

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

/** Build the engine with the TimeOffRequestApproved→shift-cleanup middleware wired. */
function newEngine(provider: (entity: string) => Store): ManifestRuntimeEngine {
  let engine: ManifestRuntimeEngine;
  const middleware = [
    createTimeOffApprovedShiftCleanupMiddleware({
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

/**
 * Seed a PENDING time-off request for the employee. Seeding the precondition is
 * infrastructure setup; the behaviour under test is the approve → cleanup
 * propagation, which runs through the real engine below.
 */
async function seedRequest(provider: (entity: string) => Store) {
  await provider("TimeOffRequest").create({
    id: REQUEST_ID,
    tenantId: TENANT,
    employeeId: EMPLOYEE,
    startDate: TOFF_START,
    endDate: TOFF_END,
    reason: "vacation",
    requestType: "pto",
    status: "PENDING",
    reviewedBy: "",
    reviewedAt: null,
    rejectionReason: "",
    balanceSnapshot: 0,
    balanceUnit: "",
    deletedAt: null,
  } as never);
}

async function seedShift(
  provider: (entity: string) => Store,
  overrides: Record<string, unknown>
) {
  const id = (overrides.id as string) ?? randomUUID();
  await provider("ScheduleShift").create({
    id,
    tenantId: TENANT,
    scheduleId: "sched-1",
    employeeId: EMPLOYEE,
    locationId: "loc-1",
    shiftStart: dayMs(TOFF_START),
    shiftEnd: dayMs(TOFF_START) + 4 * 60 * 60 * 1000,
    roleDuringShift: "server",
    swapStatus: "none",
    notes: "",
    deletedAt: null,
    ...overrides,
  } as never);
  return id;
}

async function approve(engine: ManifestRuntimeEngine) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "TimeOffRequest",
      command: "approve",
      body: { id: REQUEST_ID, tenantId: TENANT, processedBy: USER.id },
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

const isRemoved = (row: Record<string, unknown>) => row.deletedAt != null;

describe("Middleware conformance: TimeOffRequestApproved → conflicting shift cleanup", () => {
  it("the compiled IR carries no TimeOffRequestApproved→ScheduleShift reaction (it is middleware)", () => {
    const reactions: Record<string, unknown>[] = ir.reactions ?? [];
    const stale = reactions.filter(
      (r) =>
        r.event === "TimeOffRequestApproved" &&
        r.targetEntity === "ScheduleShift"
    );
    // A regression here means someone added a reaction that cannot fan out to the
    // many conflicting shifts nor read the request's employee/date — the
    // propagation must stay middleware.
    expect(stale).toHaveLength(0);
  });

  it("approving time off removes the employee's shifts inside the window, leaving others intact", async () => {
    const provider = makeProvider();
    await seedRequest(provider);
    // In-window shifts (must be removed): one on the start day, one on the end day.
    const inStart = await seedShift(provider, {
      id: "shift-in-start",
      shiftStart: dayMs(TOFF_START),
    });
    const inEnd = await seedShift(provider, {
      id: "shift-in-end",
      shiftStart: dayMs(TOFF_END),
      shiftEnd: dayMs(TOFF_END) + 3 * 60 * 60 * 1000,
    });
    // Out-of-window shift (the day BEFORE the window): must survive.
    const before = await seedShift(provider, {
      id: "shift-before",
      shiftStart: dayMs("2026-07-09"),
      shiftEnd: dayMs("2026-07-09") + 3 * 60 * 60 * 1000,
    });
    // Out-of-window shift (the day AFTER the window): must survive.
    const after = await seedShift(provider, {
      id: "shift-after",
      shiftStart: dayMs("2026-07-13"),
      shiftEnd: dayMs("2026-07-13") + 3 * 60 * 60 * 1000,
    });
    const engine = newEngine(provider);

    const result = await approve(engine);
    expect(result.ok).toBe(true);

    const byId = new Map((await shiftsOf(provider)).map((s) => [s.id, s]));
    // THE PROOF: only the two in-window shifts were soft-deleted.
    expect(isRemoved(byId.get(inStart)!)).toBe(true);
    expect(isRemoved(byId.get(inEnd)!)).toBe(true);
    expect(isRemoved(byId.get(before)!)).toBe(false);
    expect(isRemoved(byId.get(after)!)).toBe(false);

    // Secondary proof: the downstream command's event bubbles up — only possible
    // if the middleware executed and dispatched the removes.
    const eventNames = (result.ok ? result.events : [])?.map(
      // biome-ignore lint/suspicious/noExplicitAny: structural event rows.
      (e: any) => e?.name
    );
    expect(eventNames).toContain("TimeOffRequestApproved");
    expect(eventNames).toContain("ScheduleShiftRemoved");
  });

  it("does not remove another employee's shift inside the same window", async () => {
    const provider = makeProvider();
    await seedRequest(provider);
    const mine = await seedShift(provider, { id: "shift-mine" });
    // A different employee's shift on the same day must be untouched.
    const theirs = await seedShift(provider, {
      id: "shift-theirs",
      employeeId: "emp-other",
    });
    const engine = newEngine(provider);

    const result = await approve(engine);
    expect(result.ok).toBe(true);

    const byId = new Map((await shiftsOf(provider)).map((s) => [s.id, s]));
    expect(isRemoved(byId.get(mine)!)).toBe(true);
    expect(isRemoved(byId.get(theirs)!)).toBe(false);
  });

  it("is idempotent: an already-removed conflicting shift is left as-is (no re-removal churn)", async () => {
    const provider = makeProvider();
    await seedRequest(provider);
    // A shift already soft-deleted before approval (e.g. removed manually).
    const already = await seedShift(provider, {
      id: "shift-already-gone",
      deletedAt: dayMs("2026-07-01"),
    });
    const active = await seedShift(provider, { id: "shift-active" });
    const engine = newEngine(provider);

    const result = await approve(engine);
    expect(result.ok).toBe(true);

    const byId = new Map((await shiftsOf(provider)).map((s) => [s.id, s]));
    // The active in-window shift is removed; the already-gone one keeps its
    // original deletedAt (the middleware filtered it out, so remove never re-ran).
    expect(isRemoved(byId.get(active)!)).toBe(true);
    expect(byId.get(already)!.deletedAt).toBe(dayMs("2026-07-01"));
  });
});
