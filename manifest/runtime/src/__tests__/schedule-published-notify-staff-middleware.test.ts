/**
 * Middleware conformance — `SchedulePublished → Notification` per shift employee
 * (IMPLEMENTATION_PLAN P1, Staffing → "SchedulePublished → notify staff").
 *
 * WHY this matters (not just WHAT it does): publishing a staff schedule is the most
 * time-sensitive scheduling event — staff need to know their shifts are live. Until
 * this propagation existed, `SchedulePublished` had no consumer, so the
 * `/notifications` surface was blind to every published schedule and employees were
 * never told. The plan scoped this as middleware (not a reaction) because it is a
 * 1:N fan-out AND the recipients are not on the event payload — the employee ids
 * live on the `ScheduleShift` rows and must be queried by `scheduleId`.
 *
 * The test runs the REAL compiled IR through the runtime engine WITH the middleware
 * wired (the middleware lives in the factory, not the IR), so it FAILS LOUDLY if the
 * propagation regresses — no notifications, wrong recipients, duplicate-per-employee,
 * or the engine stops dispatching — i.e. it fails when the BUSINESS propagation
 * breaks, not on a mere shape change (CLAUDE.md Rule 9; constitution §13).
 *
 * Chain proven here:
 *   Schedule.release(userId)  (status approved → published, shiftCount > 0)
 *     → emits SchedulePublished (_subject.id = the Schedule id)
 *     → middleware queries this schedule's active ScheduleShift rows
 *     → dispatches Notification.create once per DISTINCT employee
 *     → Notification rows persist, NotificationCreated bubbles up.
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { createSchedulePublishedNotifyStaffMiddleware } from "../middleware/schedule-published-notify-staff-middleware.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-schedule-notify";
// manager satisfies BOTH Schedule.release's policy AND Notification.create's
// policy (user.role in ["manager", "admin"]) so neither the source command nor the
// downstream dispatch is denied.
const USER = { id: "u-publisher", tenantId: TENANT, role: "manager" } as const;

const SCHEDULE_ID = "schedule-notify-001";

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

/** Build the engine with the SchedulePublished→Notification middleware wired. */
function newEngine(provider: (entity: string) => Store): ManifestRuntimeEngine {
  let engine: ManifestRuntimeEngine;
  const middleware = [
    createSchedulePublishedNotifyStaffMiddleware({
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
 * Seed an approved schedule (shiftCount > 0 so release's blockNoShifts passes).
 * Seeding the precondition state is infrastructure setup; the behaviour under test
 * is the release → notify propagation, which runs through the real engine below.
 */
async function seedSchedule(
  provider: (entity: string) => Store,
  shiftCount: number
) {
  await provider("Schedule").create({
    id: SCHEDULE_ID,
    tenantId: TENANT,
    locationId: "loc-1",
    scheduleDate: Date.now(),
    status: "approved",
    shiftCount,
    publishedAt: null,
    publishedBy: "",
    approvedBy: USER.id,
    approvedAt: Date.now(),
    notes: "",
    deletedAt: null,
  } as never);
}

async function seedShift(
  provider: (entity: string) => Store,
  overrides: Record<string, unknown>
) {
  await provider("ScheduleShift").create({
    id: randomUUID(),
    tenantId: TENANT,
    scheduleId: SCHEDULE_ID,
    employeeId: "emp-x",
    locationId: "loc-1",
    shiftStart: Date.now(),
    shiftEnd: Date.now() + 4 * 60 * 60 * 1000,
    roleDuringShift: "server",
    swapStatus: "none",
    notes: "",
    deletedAt: null,
    ...overrides,
  } as never);
}

async function release(engine: ManifestRuntimeEngine) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "Schedule",
      command: "release",
      body: { id: SCHEDULE_ID, tenantId: TENANT, userId: USER.id },
      user: { ...USER },
    }
  );
}

function notificationsOf(provider: (entity: string) => Store) {
  return provider("Notification").getAll() as Promise<
    Record<string, unknown>[]
  >;
}

describe("Middleware conformance: SchedulePublished → Notification per shift employee", () => {
  it("the compiled IR carries no SchedulePublished→Notification reaction (it is middleware)", () => {
    const reactions: Record<string, unknown>[] = ir.reactions ?? [];
    const stale = reactions.filter(
      (r) =>
        r.event === "SchedulePublished" &&
        r.targetEntity === "Notification" &&
        r.targetCommand === "create"
    );
    // A regression here means someone added a reaction that cannot fan out to many
    // recipients nor read the shift employee ids — the propagation must stay middleware.
    expect(stale).toHaveLength(0);
  });

  it("publishing a schedule notifies each distinct shift employee exactly once", async () => {
    const provider = makeProvider();
    await seedSchedule(provider, 3);
    // emp-a has TWO shifts (must be notified once), emp-b has one.
    await seedShift(provider, { employeeId: "emp-a" });
    await seedShift(provider, { employeeId: "emp-a" });
    await seedShift(provider, { employeeId: "emp-b" });
    const engine = newEngine(provider);

    const result = await release(engine);
    expect(result.ok).toBe(true);

    // THE PROOF: the middleware ran Notification.create against the same store —
    // one per DISTINCT employee, not one per shift.
    const notifications = await notificationsOf(provider);
    expect(notifications).toHaveLength(2);
    const recipients = notifications
      .map((n) => n.recipientEmployeeId)
      .sort();
    expect(recipients).toEqual(["emp-a", "emp-b"]);
    for (const n of notifications) {
      expect(n.tenantId).toBe(TENANT);
      expect(n.notificationType).toBe("schedule_published");
      expect(String(n.title).length).toBeGreaterThan(0);
      // Correlated to the schedule so it is traceable back to the publish.
      expect(n.correlationId).toBe(SCHEDULE_ID);
    }

    // Secondary proof: the downstream command's own event bubbles up — only
    // possible if the middleware executed.
    const eventNames = (result.ok ? result.events : [])?.map(
      // biome-ignore lint/suspicious/noExplicitAny: structural event rows.
      (e: any) => e?.name
    );
    expect(eventNames).toContain("SchedulePublished");
    expect(eventNames).toContain("NotificationCreated");
  });

  it("does not notify the employee of a removed (soft-deleted) shift", async () => {
    const provider = makeProvider();
    await seedSchedule(provider, 2);
    await seedShift(provider, { employeeId: "emp-active" });
    // A soft-deleted shift confers no notification.
    await seedShift(provider, { employeeId: "emp-removed", deletedAt: Date.now() });
    const engine = newEngine(provider);

    const result = await release(engine);
    expect(result.ok).toBe(true);

    const notifications = await notificationsOf(provider);
    expect(notifications).toHaveLength(1);
    expect(notifications[0]!.recipientEmployeeId).toBe("emp-active");
  });

  it("only notifies employees of the published schedule, not other schedules", async () => {
    const provider = makeProvider();
    await seedSchedule(provider, 1);
    await seedShift(provider, { employeeId: "emp-mine" });
    // A shift on an unrelated schedule must be untouched.
    await seedShift(provider, {
      employeeId: "emp-other",
      scheduleId: "schedule-other-999",
    });
    const engine = newEngine(provider);

    const result = await release(engine);
    expect(result.ok).toBe(true);

    const notifications = await notificationsOf(provider);
    expect(notifications).toHaveLength(1);
    expect(notifications[0]!.recipientEmployeeId).toBe("emp-mine");
  });
});
