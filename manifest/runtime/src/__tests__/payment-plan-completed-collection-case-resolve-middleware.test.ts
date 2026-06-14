/**
 * Middleware conformance — `PaymentPlanCompleted → CollectionCase.markResolved`
 * (IMPLEMENTATION_PLAN P1 "PaymentPlanCompleted → CollectionCase.markResolved").
 *
 * WHY this matters (not just WHAT it does): when a collection payment plan is paid off
 * and marked COMPLETED, the underlying collection case must leave the dunning pipeline —
 * otherwise collections keeps chasing a debt that has been fully settled. The
 * `PaymentPlanCompleted` event had ZERO consumers, so the case sat ACTIVE forever. This
 * middleware closes the loop (a sibling of `CollectionWrittenOff → Invoice.writeOff`).
 * It CANNOT be a reaction: `CollectionPaymentPlan.markCompleted()` takes NO params and is
 * a MUTATE, so the engine payload `{ ...commandInput, result }` carries only a timestamp
 * scalar; the case to resolve is `CollectionPaymentPlan.collectionCaseId` — the plan's OWN
 * field, never auto-populated onto the event. The middleware loads the plan via
 * `_subject.id` and dispatches the governed `CollectionCase.markResolved`.
 *
 * It is GUARD-SAFE by design: `markResolved` guards `outstandingAmount <= 0.01` and the
 * FSM only reaches RESOLVED from ACTIVE/IN_PROGRESS/LEGAL/DISPUTED. A completed plan that
 * did NOT settle the case (residual debt) is deliberately left ACTIVE — resolving it would
 * erase real money owed. The tests pin both the happy path (settled → RESOLVED) and the
 * residual-debt skip so the guard-safety can't silently regress into wrongful resolution.
 *
 * The test runs against the REAL compiled IR through the runtime engine WITH the
 * middleware wired, so it FAILS LOUDLY if the propagation or the source FSMs regress.
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
import { createPaymentPlanCompletedCollectionCaseResolveMiddleware } from "../middleware/payment-plan-completed-collection-case-resolve-middleware.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-resolve-collection";
const CASE_ID = "case-resolve-1";
const PLAN_ID = "plan-resolve-1";
const INVOICE_ID = "invoice-resolve-1";
const CLIENT_ID = "client-resolve-1";
const EVENT_ID = "event-resolve-1";

const USER = {
  id: "user-resolve-1",
  tenantId: TENANT,
  role: "admin",
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
    createPaymentPlanCompletedCollectionCaseResolveMiddleware({
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

async function seedCase(
  provider: (entity: string) => Store,
  overrides: Record<string, unknown> = {}
) {
  await provider("CollectionCase").create({
    id: CASE_ID,
    tenantId: TENANT,
    invoiceId: INVOICE_ID,
    invoiceNumber: "INV-RES-1",
    eventId: EVENT_ID,
    clientId: CLIENT_ID,
    clientName: "Acme Co",
    originalAmount: 4000,
    // Fully settled: a properly-paid plan drives the case balance to zero via
    // CollectionCase.recordPayment as installments land.
    outstandingAmount: 0,
    collectedAmount: 4000,
    status: "ACTIVE",
    priority: "MEDIUM",
    dunningStage: "CURRENT",
    daysOverdue: 30,
    hasPaymentPlan: true,
    paymentPlanId: PLAN_ID,
    metadata: "{}",
    deletedAt: null,
    ...overrides,
  } as never);
}

async function seedPlan(
  provider: (entity: string) => Store,
  overrides: Record<string, unknown> = {}
) {
  await provider("CollectionPaymentPlan").create({
    id: PLAN_ID,
    tenantId: TENANT,
    collectionCaseId: CASE_ID,
    totalAmount: 4000,
    installmentAmount: 1000,
    installments: 4,
    completedInstallments: 4,
    status: "ACTIVE",
    startDate: Date.now() - 90 * 86_400_000,
    metadata: "{}",
    deletedAt: null,
    ...overrides,
  } as never);
}

function completePlan(engine: ManifestRuntimeEngine) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "CollectionPaymentPlan",
      command: "markCompleted",
      body: {
        id: PLAN_ID,
        tenantId: TENANT,
      },
      user: { ...USER },
    }
  );
}

describe("PaymentPlanCompleted → CollectionCase.markResolved middleware", () => {
  it("the IR carries no PaymentPlanCompleted reaction (it is middleware) AND both source FSMs allow the path (markCompleted: ACTIVE→COMPLETED, markResolved: ACTIVE→RESOLVED)", () => {
    const reactions: Record<string, unknown>[] = ir.reactions ?? [];
    const stale = reactions.filter((r) => r.event === "PaymentPlanCompleted");
    expect(stale).toHaveLength(0);

    const plan = (ir.entities ?? []).find(
      (e: { name?: string }) => e.name === "CollectionPaymentPlan"
    );
    const planTransitions: { from?: string; to?: string[] }[] =
      plan?.transitions ?? [];
    // markCompleted mutates status -> COMPLETED; ACTIVE must reach it or markCompleted is dead.
    expect(
      planTransitions.find((t) => t.from === "ACTIVE")?.to ?? []
    ).toContain("COMPLETED");

    const collectionCase = (ir.entities ?? []).find(
      (e: { name?: string }) => e.name === "CollectionCase"
    );
    const caseTransitions: { from?: string; to?: string[] }[] =
      collectionCase?.transitions ?? [];
    // markResolved mutates status -> RESOLVED; the resolvable source states must reach it.
    for (const from of ["ACTIVE", "IN_PROGRESS", "LEGAL", "DISPUTED"]) {
      expect(caseTransitions.find((t) => t.from === from)?.to ?? []).toContain(
        "RESOLVED"
      );
    }
  });

  it("resolves the linked case when a settled payment plan completes (case reaches RESOLVED + CollectionResolved bubbles up)", async () => {
    const provider = makeProvider();
    await seedCase(provider);
    await seedPlan(provider);
    const engine = newEngine(provider);

    const result = await completePlan(engine);
    expect(result.ok).toBe(true);

    // The source command fires — plan is completed.
    const completedPlan = (await provider("CollectionPaymentPlan").getById(
      PLAN_ID
    )) as { status?: string };
    expect(completedPlan.status).toBe("COMPLETED");

    // The propagation resolved the case: RESOLVED with resolvedAt/closedAt stamped.
    const resolvedCase = (await provider("CollectionCase").getById(
      CASE_ID
    )) as { status?: string; resolvedAt?: unknown; closedAt?: unknown };
    expect(resolvedCase.status).toBe("RESOLVED");
    expect(resolvedCase.resolvedAt).toBeTruthy();
    expect(resolvedCase.closedAt).toBeTruthy();
  });

  it("leaves the case ACTIVE when the completed plan did NOT settle the balance (residual debt — never wrongful resolution)", async () => {
    const provider = makeProvider();
    // Case still owes money even though the plan was marked completed.
    await seedCase(provider, { outstandingAmount: 1500, collectedAmount: 2500 });
    await seedPlan(provider);
    const engine = newEngine(provider);

    const result = await completePlan(engine);
    expect(result.ok).toBe(true);

    const completedPlan = (await provider("CollectionPaymentPlan").getById(
      PLAN_ID
    )) as { status?: string };
    expect(completedPlan.status).toBe("COMPLETED");

    // markResolved's guard (outstandingAmount <= 0.01) is mirrored — case untouched.
    const stillActive = (await provider("CollectionCase").getById(
      CASE_ID
    )) as { status?: string };
    expect(stillActive.status).toBe("ACTIVE");
  });

  it("skips cleanly when the plan has no collectionCaseId (plan still completes, no crash)", async () => {
    const provider = makeProvider();
    await seedCase(provider);
    await seedPlan(provider, { collectionCaseId: "" });
    const engine = newEngine(provider);

    const result = await completePlan(engine);
    expect(result.ok).toBe(true);

    const completedPlan = (await provider("CollectionPaymentPlan").getById(
      PLAN_ID
    )) as { status?: string };
    expect(completedPlan.status).toBe("COMPLETED");

    // No case was targeted — the seeded case is untouched.
    const untouched = (await provider("CollectionCase").getById(CASE_ID)) as {
      status?: string;
    };
    expect(untouched.status).toBe("ACTIVE");
  });
});
