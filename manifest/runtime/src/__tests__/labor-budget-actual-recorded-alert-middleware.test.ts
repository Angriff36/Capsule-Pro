/**
 * Middleware conformance — `LaborBudgetActualRecorded → BudgetAlert.create` (over target)
 * (IMPLEMENTATION_PLAN P1 "Fix BudgetAlert parent + auto-create", auto-create leg).
 *
 * WHY this matters (not just WHAT it does): a labor budget whose recorded actual spend
 * exceeds its target must surface a budget alert, otherwise the overage stays silent until
 * a human notices the number. `LaborBudgetActualRecorded` had ZERO consumers — recording an
 * actual flipped `actualSpend` and emitted the event, but nothing ever opened the
 * `BudgetAlert` the dashboards read. (The app-side `createBudgetAlert` helper is exported
 * but never called, so there is no existing alert path — and thus no double-apply.)
 *
 * It CANNOT be a reaction: `LaborBudget.recordActual(actualSpend)` is a MUTATE, so the
 * engine payload `{ ...commandInput, result }` carries only the `actualSpend` param — NOT
 * the budget's OWN `budgetTarget` needed to decide "is this over budget?". The middleware
 * loads the LaborBudget via `_subject.id`, compares `actualSpend > budgetTarget`, and only
 * then dispatches the governed `BudgetAlert.create`.
 *
 * The test runs against the REAL compiled IR through the runtime engine WITH the middleware
 * wired, so it FAILS LOUDLY if the propagation regresses — no alert opened, wrong type, or
 * the engine stops dispatching create. It also regression-locks that a reaction does not
 * creep into the IR for this propagation.
 *
 * Chain proven here:
 *   LaborBudget.recordActual(actualSpend > target)  (on an approved budget)
 *     → emits LaborBudgetActualRecorded (_subject.id = the budget id)
 *     → middleware loads the budget, reads actualSpend/budgetTarget
 *     → dispatches BudgetAlert.create(alertType "overage", utilization, ...) → one alert
 *       row persisted, deduped to one unresolved overage per budget.
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { createLaborBudgetActualRecordedAlertMiddleware } from "../middleware/labor-budget-actual-recorded-alert-middleware.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-labor-budget-alert";
// admin satisfies LaborBudget.recordActual's policy AND the middleware's
// BudgetAlert.create dispatch policy so neither command is denied.
const USER = { id: "u-budget", tenantId: TENANT, role: "admin" } as const;

const BUDGET_ID = "labor-budget-001";

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

/** Build the engine with the LaborBudgetActualRecorded→BudgetAlert middleware wired. */
function newEngine(provider: (entity: string) => Store): ManifestRuntimeEngine {
  let engine: ManifestRuntimeEngine;
  const middleware = [
    createLaborBudgetActualRecordedAlertMiddleware({
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

// Seed an APPROVED labor budget (recordActual guards status == "approved"; the
// positiveBudget invariant requires budgetTarget > 0). All numeric fields are seeded so
// no entity-level constraint silently drops the recordActual mutate.
async function seedBudget(
  provider: (entity: string) => Store,
  overrides: Record<string, unknown> = {}
) {
  await provider("LaborBudget").create({
    id: BUDGET_ID,
    tenantId: TENANT,
    locationId: "loc-1",
    periodStart: "2026-06-01",
    periodEnd: "2026-06-07",
    budgetTarget: 10_000,
    actualSpend: 0,
    budgetType: "weekly",
    status: "approved",
    description: "Front-of-house labor",
    approvedBy: USER.id,
    approvedAt: Date.now(),
    deletedAt: null,
    ...overrides,
  } as never);
}

async function recordActual(
  engine: ManifestRuntimeEngine,
  actualSpend: number
) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "LaborBudget",
      command: "recordActual",
      body: { id: BUDGET_ID, tenantId: TENANT, actualSpend },
      user: { ...USER },
    }
  );
}

async function alertsForTenant(
  provider: (entity: string) => Store
): Promise<Record<string, unknown>[]> {
  const all = (await provider("BudgetAlert").getAll()) as Record<
    string,
    unknown
  >[];
  return all.filter((a) => a.tenantId === TENANT);
}

describe("Middleware conformance: LaborBudgetActualRecorded → BudgetAlert.create", () => {
  it("the compiled IR carries no LaborBudgetActualRecorded → BudgetAlert.create reaction (it is middleware)", () => {
    const reactions: Record<string, unknown>[] = ir.reactions ?? [];
    const stale = reactions.filter(
      (r) =>
        r.event === "LaborBudgetActualRecorded" &&
        r.targetEntity === "BudgetAlert" &&
        r.targetCommand === "create"
    );
    // A regression here means someone added a reaction that cannot read the budget's
    // own budgetTarget to decide over/under; the propagation must stay middleware.
    expect(stale).toHaveLength(0);
  });

  it("opens an overage alert when recorded actual exceeds the budget target", async () => {
    const provider = makeProvider();
    await seedBudget(provider);
    const engine = newEngine(provider);

    const result = await recordActual(engine, 12_000); // 120% of 10000
    expect(result.ok).toBe(true);

    // THE PROOF: the middleware dispatched BudgetAlert.create, so an alert now exists.
    const alerts = await alertsForTenant(provider);
    expect(alerts).toHaveLength(1);
    const opened = alerts[0];
    expect(opened.budgetId).toBe(BUDGET_ID);
    expect(opened.alertType).toBe("overage");
    expect(Number(opened.utilization)).toBe(120);
    expect(opened.resolved).toBe(false);
    expect(opened.isAcknowledged).toBe(false);

    // Secondary proof: the chain ran end to end (both events present).
    const eventNames = (result.ok ? result.events : [])?.map(
      // biome-ignore lint/suspicious/noExplicitAny: structural event rows.
      (e: any) => e?.name
    );
    expect(eventNames).toContain("LaborBudgetActualRecorded");
    expect(eventNames).toContain("BudgetAlertCreated");
  });

  it("does NOT alert when actual spend is within target (the common path)", async () => {
    const provider = makeProvider();
    await seedBudget(provider);
    const engine = newEngine(provider);

    const result = await recordActual(engine, 5000); // 50% of 10000
    expect(result.ok).toBe(true);

    const alerts = await alertsForTenant(provider);
    expect(alerts).toHaveLength(0);
  });

  it("is idempotent — does not pile up a second alert while one unresolved overage exists", async () => {
    const provider = makeProvider();
    await seedBudget(provider);
    // Pre-existing UNRESOLVED overage alert for this budget.
    await provider("BudgetAlert").create({
      id: "alert-pre-existing",
      tenantId: TENANT,
      budgetId: BUDGET_ID,
      alertType: "overage",
      utilization: 115,
      message: "earlier overage",
      isAcknowledged: false,
      resolved: false,
    } as never);
    const engine = newEngine(provider);

    const result = await recordActual(engine, 13_000); // still over budget
    expect(result.ok).toBe(true);

    const alerts = await alertsForTenant(provider);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].id).toBe("alert-pre-existing");
  });

  it("opens a fresh alert once the prior overage alert has been resolved", async () => {
    const provider = makeProvider();
    await seedBudget(provider);
    // A prior overage alert that has been RESOLVED no longer blocks a new one.
    await provider("BudgetAlert").create({
      id: "alert-resolved",
      tenantId: TENANT,
      budgetId: BUDGET_ID,
      alertType: "overage",
      utilization: 110,
      message: "resolved overage",
      isAcknowledged: true,
      resolved: true,
    } as never);
    const engine = newEngine(provider);

    const result = await recordActual(engine, 14_000);
    expect(result.ok).toBe(true);

    const alerts = await alertsForTenant(provider);
    // The resolved one plus a new unresolved overage = 2 rows.
    expect(alerts).toHaveLength(2);
    const fresh = alerts.find((a) => a.id !== "alert-resolved");
    expect(fresh?.resolved).toBe(false);
    expect(Number(fresh?.utilization)).toBe(140);
  });
});
