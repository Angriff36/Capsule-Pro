/**
 * Middleware conformance — `MaintenanceScheduleCompleted → MaintenanceWorkOrder.create`
 * (IMPLEMENTATION_PLAN P1 "Facilities/maintenance lifecycle —
 * PreventiveMaintenanceSchedule completed → next MaintenanceWorkOrder").
 *
 * WHY this matters (not just WHAT it does): a preventive-maintenance schedule is a
 * RECURRING template. Its `complete(nextDueAt)` command rolls the schedule forward
 * (new nextDueAt + lastCompletedAt) and emits `MaintenanceScheduleCompleted`, but that
 * event had ZERO consumers — nothing opened the work order for the next cycle, so once
 * the first work order was done the recurrence silently stopped and preventive
 * maintenance never got scheduled again. This middleware turns each completion into the
 * next governed work order.
 *
 * It CANNOT be a reaction: `complete(nextDueAt)` is a MUTATE, so the engine payload
 * `{ ...commandInput, result }` carries `nextDueAt` (an input param) but NOT the
 * schedule's own fields (equipmentId/areaId/title/...) the work order needs, and
 * declared event fields are never auto-populated from `self.*`. The middleware loads
 * the schedule via `_subject.id` and dispatches the explicit `MaintenanceWorkOrder.create`.
 *
 * The test runs against the REAL compiled IR through the runtime engine WITH the
 * middleware wired, so it FAILS LOUDLY if the propagation regresses — no work order
 * opened, wrong scheduledDate/type, or a double-open on re-completion. It also
 * regression-locks that a reaction does not creep into the IR for this propagation.
 *
 * Chain proven here:
 *   PreventiveMaintenanceSchedule.complete(nextDueAt)
 *     → emits MaintenanceScheduleCompleted (_subject.id = the schedule id)
 *     → middleware loads the schedule, reads equipmentId/areaId/title/...
 *     → dispatches MaintenanceWorkOrder.create(scheduledDate = nextDueAt, type "preventive")
 *       → a work order row is persisted; deduped per asset + due date; a genuinely
 *         later completion (different nextDueAt) opens a fresh one.
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { createMaintenanceScheduleCompletedWorkOrderCreateMiddleware } from "../middleware/maintenance-schedule-completed-work-order-create-middleware.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-pm-recurrence";
// admin satisfies both PreventiveMaintenanceSchedule.complete's policy AND the
// middleware's MaintenanceWorkOrder.create dispatch policy so neither is denied.
const USER = { id: "u-pm", tenantId: TENANT, role: "admin" } as const;

const SCHEDULE_ID = "pm-sched-001";
const EQUIPMENT_ID = "equip-walkin-1";
const DAY = 24 * 60 * 60 * 1000;
const DUE_1 = Date.now() + 30 * DAY;
const DUE_2 = Date.now() + 60 * DAY;

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

/** Build the engine with the schedule-completed → work-order middleware wired. */
function newEngine(provider: (entity: string) => Store): ManifestRuntimeEngine {
  let engine: ManifestRuntimeEngine;
  const middleware = [
    createMaintenanceScheduleCompletedWorkOrderCreateMiddleware({
      storeProvider: provider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
      onDiagnostic: () => {
        /* silence default console.warn diagnostics in tests */
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

async function seedSchedule(
  provider: (entity: string) => Store,
  overrides: Record<string, unknown> = {}
) {
  // requireTitle + requireFrequency are entity-level invariants re-validated on the
  // `complete` mutate persist — seed them non-empty or the mutate would be dropped.
  await provider("PreventiveMaintenanceSchedule").create({
    id: SCHEDULE_ID,
    tenantId: TENANT,
    scheduleNumber: "PM-12345678",
    areaId: "area-kitchen",
    equipmentId: EQUIPMENT_ID,
    title: "Service walk-in cooler",
    description: "Monthly compressor + gasket check",
    frequency: "monthly",
    intervalDays: 30,
    nextDueAt: Date.now() - DAY,
    lastCompletedAt: null,
    assignedTo: "tech-7",
    estimatedHours: 2,
    estimatedCost: 0,
    status: "active",
    ...overrides,
  } as never);
}

async function complete(engine: ManifestRuntimeEngine, nextDueAt: number) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "PreventiveMaintenanceSchedule",
      command: "complete",
      body: { id: SCHEDULE_ID, tenantId: TENANT, nextDueAt },
      user: { ...USER },
    }
  );
}

async function workOrdersForTenant(
  provider: (entity: string) => Store
): Promise<Record<string, unknown>[]> {
  const all = (await provider("MaintenanceWorkOrder").getAll()) as Record<
    string,
    unknown
  >[];
  return all.filter((w) => w.tenantId === TENANT);
}

describe("Middleware conformance: MaintenanceScheduleCompleted → MaintenanceWorkOrder.create", () => {
  it("the compiled IR carries no MaintenanceScheduleCompleted → MaintenanceWorkOrder.create reaction (it is middleware)", () => {
    const reactions: Record<string, unknown>[] = ir.reactions ?? [];
    const stale = reactions.filter(
      (r) =>
        r.event === "MaintenanceScheduleCompleted" &&
        r.targetEntity === "MaintenanceWorkOrder" &&
        r.targetCommand === "create"
    );
    // A regression here means someone added a reaction that cannot read the
    // schedule's own fields (equipmentId/title/...); it must stay middleware.
    expect(stale).toHaveLength(0);
  });

  it("opens the next preventive work order when a schedule is completed", async () => {
    const provider = makeProvider();
    await seedSchedule(provider);
    const engine = newEngine(provider);

    const result = await complete(engine, DUE_1);
    expect(result.ok).toBe(true);

    // THE PROOF: the middleware dispatched MaintenanceWorkOrder.create, so the next
    // cycle's work order now exists, scheduled for the schedule's new nextDueAt.
    const orders = await workOrdersForTenant(provider);
    expect(orders).toHaveLength(1);
    const wo = orders[0]!;
    expect(wo).toBeDefined();
    expect(wo.workOrderType).toBe("preventive");
    expect(wo.equipmentId).toBe(EQUIPMENT_ID);
    expect(wo.areaId).toBe("area-kitchen");
    expect(wo.title).toBe("Service walk-in cooler");
    expect(wo.assignedTo).toBe("tech-7");
    expect(wo.status).toBe("open");
    expect(Number(wo.scheduledDate)).toBe(DUE_1);

    // Secondary proof: the parent command's own event is present (the chain ran).
    const eventNames = (result.ok ? result.events : [])?.map(
      // biome-ignore lint/suspicious/noExplicitAny: structural event rows.
      (e: any) => e?.name
    );
    expect(eventNames).toContain("MaintenanceScheduleCompleted");
    expect(eventNames).toContain("MaintenanceWorkOrderCreated");
  });

  it("is idempotent — a re-emitted completion for the same due date does not double-open", async () => {
    const provider = makeProvider();
    await seedSchedule(provider);
    const engine = newEngine(provider);

    // Completing twice with the SAME nextDueAt models a re-delivered event.
    await complete(engine, DUE_1);
    await complete(engine, DUE_1);

    const orders = await workOrdersForTenant(provider);
    expect(orders).toHaveLength(1);
  });

  it("opens a fresh work order for the next cycle when the due date advances", async () => {
    const provider = makeProvider();
    await seedSchedule(provider);
    const engine = newEngine(provider);

    await complete(engine, DUE_1); // first cycle
    await complete(engine, DUE_2); // genuine next cycle (new due date)

    const orders = await workOrdersForTenant(provider);
    expect(orders).toHaveLength(2);
    const dates = orders
      .map((w) => Number(w.scheduledDate))
      .sort((a, b) => a - b);
    expect(dates).toEqual([DUE_1, DUE_2]);
  });
});
