/**
 * Middleware conformance — `PayrollRunPaid → close TipPool(s) + notify employees`
 * (IMPLEMENTATION_PLAN P1 "PayrollRunPaid → lock period / close tip pool / notify").
 * The lock leg ships separately; this covers the two REMAINING legs that fan out off
 * the same `PayrollRunPaid` event.
 *
 * WHY this matters (not just WHAT it does):
 *   - A `TipPool` is pay-period-scoped. Once the period's run is PAID, the tips have
 *     been paid out as part of payroll, so the pool should leave the active workflow
 *     and close. `TipPool.close` was unreachable from the payroll lifecycle.
 *   - Paying a run is the moment each employee on it should be told their pay
 *     processed; `PayrollRunPaid` had no notify consumer.
 *
 * It CANNOT be a reaction: `PayrollRun.markPaid()` takes NO params and is a MUTATE, so
 * the engine payload `{ ...commandInput, result }` carries only a `paidAt` scalar. The
 * pools are reached via the run→`payrollPeriodId`→`TipPool.periodId` chain (1:N, no
 * direct `payrollRunId` FK), and the recipients are the distinct `employeeId`s on the
 * run's `PayrollLineItem` rows (1:N, queried by `payrollRunId`). Both need store access
 * a declarative reaction does not have.
 *
 * PREREQUISITE DEAD-COMMAND FIX locked here: `TipPool.close()` guards
 * `status in ["allocated", "distributed"]`, but the FSM declared only
 * `distributed → closed` — so close() was DEAD from `allocated` (the engine rejected
 * the undeclared transition). The source now adds `allocated → closed`; the IR-lock
 * test below pins that both guard states can reach `closed` so the fix can't regress.
 *
 * Runs against the REAL compiled IR through the runtime engine WITH the middleware
 * wired, so it FAILS LOUDLY if the propagation or the source FSM/commands regress.
 *
 * @vitest-environment node
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { createPayrollRunPaidCascadeMiddleware } from "../middleware/payroll-run-paid-cascade-middleware.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-payroll-cascade";
const OTHER_TENANT = "t-other";
const PERIOD_ID = "period-cascade-1";
const RUN_ID = "run-cascade-1";

const USER = {
  id: "user-payroll-cascade-1",
  // close() + Notification.create both require manager/admin; marking a run paid is a
  // finance/admin action, so the acting user is admin in the realistic path.
  role: "admin",
  tenantId: TENANT,
} as const;

class Mem implements Store {
  private readonly items = new Map<string, Record<string, unknown>>();
  async getAll(): Promise<never> {
    return Array.from(this.items.values()) as never;
  }
  async getById(id: string): Promise<never> {
    return this.items.get(id) as never;
  }
  async create(data: Record<string, unknown>): Promise<never> {
    const id = (data.id as string) ?? randomUUID();
    const row = { ...data, id };
    this.items.set(id, row);
    return row as never;
  }
  async update(id: string, data: Record<string, unknown>): Promise<never> {
    const existing = this.items.get(id);
    if (!existing) {
      return undefined as never;
    }
    const row = { ...existing, ...data, id };
    this.items.set(id, row);
    return row as never;
  }
  async delete(id: string): Promise<never> {
    return this.items.delete(id) as never;
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
  let engine: ManifestRuntimeEngine;
  const middleware = [
    createPayrollRunPaidCascadeMiddleware({
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
      user: { id: USER.id, role: USER.role, tenantId: USER.tenantId },
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

async function seedRun(
  provider: (entity: string) => Store,
  overrides: Record<string, unknown> = {}
) {
  await provider("PayrollRun").create({
    id: RUN_ID,
    tenantId: TENANT,
    payrollPeriodId: PERIOD_ID,
    runDate: "2026-06-16",
    // markPaid() guards status == "approved".
    status: "approved",
    totalGross: 10_000,
    totalDeductions: 2_000,
    totalNet: 8_000,
    approvedBy: USER.id,
    deletedAt: null,
    ...overrides,
  } as never);
}

async function seedTipPool(
  provider: (entity: string) => Store,
  id: string,
  overrides: Record<string, unknown> = {}
) {
  await provider("TipPool").create({
    id,
    tenantId: TENANT,
    periodId: PERIOD_ID,
    totalTips: 1_000,
    status: "distributed",
    allocationRule: "by_hours",
    fixedShares: "{}",
    distributedAmount: 1_000,
    distributedBy: USER.id,
    ...overrides,
  } as never);
}

async function seedLineItem(
  provider: (entity: string) => Store,
  id: string,
  employeeId: string,
  overrides: Record<string, unknown> = {}
) {
  await provider("PayrollLineItem").create({
    id,
    tenantId: TENANT,
    payrollRunId: RUN_ID,
    employeeId,
    grossPay: 5_000,
    netPay: 4_000,
    totalDeductions: 1_000,
    hoursWorked: 80,
    deletedAt: null,
    ...overrides,
  } as never);
}

function markPaid(engine: ManifestRuntimeEngine) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "PayrollRun",
      command: "markPaid",
      body: { id: RUN_ID, tenantId: TENANT },
      user: { ...USER },
    }
  );
}

async function tipPoolStatuses(
  provider: (entity: string) => Store
): Promise<Record<string, string>> {
  const rows = (await provider("TipPool").getAll()) as {
    id?: string;
    status?: string;
  }[];
  const out: Record<string, string> = {};
  for (const r of rows) {
    if (r.id) {
      out[r.id] = r.status ?? "";
    }
  }
  return out;
}

async function notificationRecipients(
  provider: (entity: string) => Store
): Promise<{ recipientEmployeeId?: string; notificationType?: string }[]> {
  return (await provider("Notification").getAll()) as {
    recipientEmployeeId?: string;
    notificationType?: string;
  }[];
}

describe("PayrollRunPaid → close TipPool(s) + notify employees middleware", () => {
  it("IR-locks the path: no PayrollRunPaid reaction; close() reaches 'closed' from BOTH allocated and distributed; Notification.create + PayrollLineItem exist", () => {
    const reactions: Record<string, unknown>[] = ir.reactions ?? [];
    expect(
      reactions.filter((r) => r.event === "PayrollRunPaid")
    ).toHaveLength(0);

    const tipPool = (ir.entities ?? []).find(
      (e: { name?: string }) => e.name === "TipPool"
    );
    const tipTransitions: { from?: string; to?: string[] }[] =
      tipPool?.transitions ?? [];
    // close() mutates status -> closed and guards status in [allocated, distributed];
    // BOTH must reach "closed" or close() is dead from one of its own guard states.
    expect(
      tipTransitions.find((t) => t.from === "allocated")?.to ?? []
    ).toContain("closed");
    expect(
      tipTransitions.find((t) => t.from === "distributed")?.to ?? []
    ).toContain("closed");

    // Targets the middleware dispatches must exist.
    const notification = (ir.entities ?? []).find(
      (e: { name?: string }) => e.name === "Notification"
    );
    expect(notification?.commands ?? []).toContain("create");
    const lineItem = (ir.entities ?? []).find(
      (e: { name?: string }) => e.name === "PayrollLineItem"
    );
    expect(lineItem).toBeTruthy();
  });

  it("closes the pay period's allocated+distributed tip pools and notifies each distinct employee", async () => {
    const provider = makeProvider();
    await seedRun(provider);
    await seedTipPool(provider, "pool-allocated", { status: "allocated" });
    await seedTipPool(provider, "pool-distributed", { status: "distributed" });
    // Two employees, one with two line items (must still be notified once).
    await seedLineItem(provider, "li-1", "emp-A");
    await seedLineItem(provider, "li-2", "emp-A");
    await seedLineItem(provider, "li-3", "emp-B");
    const engine = newEngine(provider);

    const result = await markPaid(engine);
    expect(result.ok).toBe(true);

    // Source command fired.
    const paidRun = (await provider("PayrollRun").getById(RUN_ID)) as {
      status?: string;
    };
    expect(paidRun.status).toBe("paid");

    // Both pools closed (proves the allocated->closed FSM fix is live).
    const statuses = await tipPoolStatuses(provider);
    expect(statuses["pool-allocated"]).toBe("closed");
    expect(statuses["pool-distributed"]).toBe("closed");

    // Distinct employees notified — emp-A once despite two line items.
    const notifications = await notificationRecipients(provider);
    expect(notifications).toHaveLength(2);
    const recipients = notifications.map((n) => n.recipientEmployeeId).sort();
    expect(recipients).toEqual(["emp-A", "emp-B"]);
    expect(
      notifications.every((n) => n.notificationType === "payroll_run_paid")
    ).toBe(true);

    // TipPoolClosed + NotificationCreated bubbled up through the runtime — only
    // possible if the middleware executed.
    const eventNames = (result.ok ? result.events : [])?.map(
      // biome-ignore lint/suspicious/noExplicitAny: structural event rows.
      (e: any) => e?.name
    );
    expect(eventNames).toContain("TipPoolClosed");
    expect(eventNames).toContain("NotificationCreated");
  });

  it("is guard-safe: an 'open' pool (nothing allocated) and an already-'closed' pool are left untouched", async () => {
    const provider = makeProvider();
    await seedRun(provider);
    await seedTipPool(provider, "pool-open", { status: "open" });
    await seedTipPool(provider, "pool-closed", { status: "closed" });
    await seedTipPool(provider, "pool-distributed", { status: "distributed" });
    const engine = newEngine(provider);

    const result = await markPaid(engine);
    expect(result.ok).toBe(true);

    const statuses = await tipPoolStatuses(provider);
    // open is not closable (mirrors the close() guard) — untouched.
    expect(statuses["pool-open"]).toBe("open");
    // already-closed stays closed (idempotent, no swallowed re-close).
    expect(statuses["pool-closed"]).toBe("closed");
    // the genuinely-closable one still closes.
    expect(statuses["pool-distributed"]).toBe("closed");
  });

  it("legs are independent and tenant/run-scoped: another period's pool and another run's line item are not touched; a run with no line items still closes its pools", async () => {
    const provider = makeProvider();
    await seedRun(provider);
    // A pool for a DIFFERENT period — must not close.
    await seedTipPool(provider, "pool-other-period", {
      periodId: "period-other",
      status: "distributed",
    });
    // A pool for THIS period in another tenant — must not close.
    await seedTipPool(provider, "pool-other-tenant", {
      tenantId: OTHER_TENANT,
      status: "distributed",
    });
    // This period's own pool — closes.
    await seedTipPool(provider, "pool-mine", { status: "distributed" });
    // A line item for a DIFFERENT run — must not be notified.
    await seedLineItem(provider, "li-other-run", "emp-X", {
      payrollRunId: "run-other",
    });
    const engine = newEngine(provider);

    const result = await markPaid(engine);
    expect(result.ok).toBe(true);

    const statuses = await tipPoolStatuses(provider);
    expect(statuses["pool-mine"]).toBe("closed");
    expect(statuses["pool-other-period"]).toBe("distributed");
    expect(statuses["pool-other-tenant"]).toBe("distributed");

    // No line items belong to this run → nobody notified (the close leg still ran).
    const notifications = await notificationRecipients(provider);
    expect(notifications).toHaveLength(0);
  });
});
