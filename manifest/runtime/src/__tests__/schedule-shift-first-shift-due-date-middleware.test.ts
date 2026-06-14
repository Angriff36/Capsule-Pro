/**
 * Middleware conformance — `ScheduleShiftCreated → TrainingAssignment.applyFirstShiftDueDate`
 * (IMPLEMENTATION_PLAN P0, last open item; drains reaction-payload-baseline to zero).
 *
 * WHY this matters (not just WHAT it does): the SEL event-staff onboarding training
 * "must be completed before [the staff member's] first shift". The onboarding
 * `TrainingAssignment` is created at staff-create time with NO due date and
 * `dueDateReviewNeeded = true` — the first shift is unknown then. The due date must
 * be pinned to the first scheduled shift, otherwise it stays null forever and
 * `markOverdue` (guards `self.dueDate != null`) can never fire, so the deadline is
 * unenforceable.
 *
 * This was an UNFIREABLE ORPHAN: `on StaffMemberFirstShiftScheduled run
 * TrainingAssignment.applyFirstShiftDueDate` had no command emitting the event, and
 * it could not be salvaged as a reaction — `applyFirstShiftDueDate` resolves its
 * target via `guard assignmentId == self.id` (the assignment id is not on a shift
 * payload), the natural emitter `ScheduleShift.create` is a MUTATE whose payload
 * `{ ...commandInput, result }` carries only `employeeId`/`shiftStart`, and "first
 * shift" is a stateful fact a declarative reaction cannot express. The fix replaces
 * the orphan reaction (and its dead `StaffMemberFirstShiftScheduled` event) with
 * middleware triggered by the real `ScheduleShiftCreated`.
 *
 * The test runs against the REAL compiled IR through the runtime engine WITH the
 * middleware wired (middleware lives in the factory, not the IR), so it FAILS LOUDLY
 * if the business propagation regresses — due date not pinned, wrong assignment
 * matched, or the flag not cleared (CLAUDE.md Rule 9; constitution §13). It also
 * regression-locks that (a) the orphan reaction did not creep back into the IR and
 * (b) the dead `StaffMemberFirstShiftScheduled` event stays removed.
 *
 * Chain proven here:
 *   [pre-seeded] open SEL TrainingAssignment (employeeId=EMP, dueDateReviewNeeded=true)
 *   ScheduleShift.create(employeeId=EMP, shiftStart=T)
 *     → emits ScheduleShiftCreated
 *     → middleware dispatches applyFirstShiftDueDate(dueAt=T)
 *     → assignment.dueDate = T, dueDateReviewNeeded = false, TrainingAssignmentDueDateSet bubbles up.
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { createScheduleShiftFirstShiftDueDateMiddleware } from "../middleware/schedule-shift-first-shift-due-date-middleware.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const SEL_MODULE_ID = "training-module-sel-event-staff-onboarding";

const TENANT = "t-first-shift";
// admin satisfies ScheduleShift.create's policy (manager/admin) AND the
// TrainingAssignment.applyFirstShiftDueDate dispatch policy so neither is denied.
const USER = { id: "u-mgr", tenantId: TENANT, role: "admin" } as const;

const EMP_ID = "emp-first-shift-001";
const ASSIGNMENT_ID = "assign-first-shift-001";
const SCHEDULE_ID = "sched-first-shift-001";
const LOCATION_ID = "loc-first-shift-001";
// Epoch-ms datetimes (repo convention — ISO is rejected E_TYPE_DATETIME).
const SHIFT_START = 1_900_000_000_000;
const SHIFT_END = SHIFT_START + 4 * 60 * 60 * 1000;

// Minimal persistent in-memory store (mirrors the upstream MemoryStore contract).
// Every IR entity is `durable`, so RuntimeEngine REQUIRES a storeProvider.
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

/** Build the engine with the first-shift-due-date middleware wired (as the factory does). */
function newEngine(provider: (entity: string) => Store): ManifestRuntimeEngine {
  let engine: ManifestRuntimeEngine;
  const middleware = [
    createScheduleShiftFirstShiftDueDateMiddleware({
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
      now: () => Date.now(),
    }
  );
  return engine;
}

/** Seed an open SEL onboarding assignment whose due date still needs pinning. */
async function seedAssignment(
  provider: (entity: string) => Store,
  overrides: Record<string, unknown> = {}
): Promise<void> {
  await provider("TrainingAssignment").create({
    id: ASSIGNMENT_ID,
    tenantId: TENANT,
    moduleId: SEL_MODULE_ID,
    employeeId: EMP_ID,
    staffRole: "staff",
    status: "assigned",
    dueDateReviewNeeded: true,
    attemptCount: 0,
    passThresholdPercent: 80,
    maxAttempts: 3,
    ...overrides,
  } as never);
}

async function scheduleShift(
  engine: ManifestRuntimeEngine,
  body: Record<string, unknown> = {}
) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "ScheduleShift",
      command: "create",
      body: {
        id: SCHEDULE_ID,
        tenantId: TENANT,
        scheduleId: "schedule-001",
        employeeId: EMP_ID,
        // locationId is a required property but not a `create` param; the
        // full-body bootstrap seed satisfies the requirement.
        locationId: LOCATION_ID,
        shiftStart: SHIFT_START,
        shiftEnd: SHIFT_END,
        roleDuringShift: "server",
        notes: "",
        ...body,
      },
      user: { ...USER },
    }
  );
}

describe("Middleware conformance: ScheduleShiftCreated → TrainingAssignment.applyFirstShiftDueDate", () => {
  it("the compiled IR no longer carries the orphan reaction (it is middleware now)", () => {
    const reactions: Record<string, unknown>[] = ir.reactions ?? [];
    const stale = reactions.filter(
      (r) =>
        r.event === "StaffMemberFirstShiftScheduled" &&
        r.targetEntity === "TrainingAssignment" &&
        r.targetCommand === "applyFirstShiftDueDate"
    );
    // A regression here means someone re-added the unfireable orphan reaction; the
    // propagation must stay in middleware.
    expect(stale).toHaveLength(0);
  });

  it("the dead StaffMemberFirstShiftScheduled event is removed from the IR", () => {
    const defs: Record<string, unknown>[] = (ir.events ?? []).filter(
      (e: Record<string, unknown>) => e.name === "StaffMemberFirstShiftScheduled"
    );
    expect(defs).toHaveLength(0);
  });

  it("scheduling the first shift pins the onboarding training due date", async () => {
    const provider = makeProvider();
    await seedAssignment(provider);
    const engine = newEngine(provider);

    const result = await scheduleShift(engine);
    expect(result.ok).toBe(true);

    // THE PROOF: the middleware ran applyFirstShiftDueDate against the SAME store,
    // so the assignment's due date is now pinned to the shift start.
    const assignment = (await provider("TrainingAssignment").getById(
      ASSIGNMENT_ID
    )) as Record<string, unknown>;
    expect(assignment.dueDate).toBe(SHIFT_START);
    expect(assignment.firstShiftAt).toBe(SHIFT_START);
    // The "needs pinning" flag is cleared — this is what makes a SECOND shift a no-op.
    expect(assignment.dueDateReviewNeeded).toBe(false);

    // Secondary proof: the downstream command's own event bubbles up into the
    // parent command's emitted events — only possible if the middleware executed.
    const eventNames = (result.ok ? result.events : [])?.map(
      // biome-ignore lint/suspicious/noExplicitAny: structural event rows.
      (e: any) => e?.name
    );
    expect(eventNames).toContain("ScheduleShiftCreated");
    expect(eventNames).toContain("TrainingAssignmentDueDateSet");
  });

  it("a second shift does not re-pin the due date (first-shift-only idempotency)", async () => {
    const provider = makeProvider();
    // Already pinned to an EARLIER first shift; review no longer needed.
    const earlier = SHIFT_START - 7 * 24 * 60 * 60 * 1000;
    await seedAssignment(provider, {
      dueDate: earlier,
      firstShiftAt: earlier,
      dueDateReviewNeeded: false,
      status: "in_progress",
    });
    const engine = newEngine(provider);

    const result = await scheduleShift(engine, { id: "sched-second-001" });
    expect(result.ok).toBe(true);

    const assignment = (await provider("TrainingAssignment").getById(
      ASSIGNMENT_ID
    )) as Record<string, unknown>;
    // Unchanged — the later shift must NOT move the pinned first-shift due date.
    expect(assignment.dueDate).toBe(earlier);
    expect(assignment.firstShiftAt).toBe(earlier);
    expect(assignment.dueDateReviewNeeded).toBe(false);
  });

  it("no matching open assignment → safe no-op (different employee)", async () => {
    const provider = makeProvider();
    await seedAssignment(provider, { employeeId: "someone-else" });
    const engine = newEngine(provider);

    const result = await scheduleShift(engine);
    expect(result.ok).toBe(true);

    const assignment = (await provider("TrainingAssignment").getById(
      ASSIGNMENT_ID
    )) as Record<string, unknown>;
    // The shift was for EMP_ID; this assignment belongs to someone else → untouched.
    expect(assignment.dueDateReviewNeeded).toBe(true);
    expect(assignment.dueDate ?? null).toBeNull();
  });
});
