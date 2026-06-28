/**
 * Middleware conformance — `PerformancePredictionCreated → Notification.create` (risk-flagged)
 * (IMPLEMENTATION_PLAN "WorkforceOptimization/PerformancePrediction → governed action").
 *
 * WHY this matters (not just WHAT it does): the workforce-AI feature emits a
 * `PerformancePrediction` for an employee, but `PerformancePredictionCreated` had ZERO
 * consumers — a forecast of high overtime risk or low productivity surfaced to no one. This
 * middleware turns a risk-flagged prediction into an in-app Notification for the predicted
 * employee, so the AI's output becomes an actionable signal instead of a silent row.
 *
 * It CANNOT be a reaction: the propagation is CONDITIONAL on a per-type threshold (alert when
 * an `overtime_risk` score is HIGH, or a `productivity` score is LOW; never for `attendance`/
 * `skill_match`). A Manifest reaction is an unconditional 1:1 event→command mapping — it would
 * fire a Notification for every prediction or none. The middleware also LOADS the prediction
 * via `_subject.id` to read the authoritative `tenantId` (a TenantScoped field that never
 * rides the create payload). The test runs against the REAL compiled IR through the runtime
 * engine WITH the middleware wired, so it FAILS LOUDLY if the routing regresses, and
 * regression-locks that no reaction creeps into the IR for this propagation.
 *
 * Chain proven here:
 *   PerformancePrediction.create(predictionType "overtime_risk", predictionScore 85)
 *     → emits PerformancePredictionCreated (_subject.id = the prediction id)
 *     → middleware loads the prediction, reads type + score + tenant + employee
 *     → (risk!) dispatches Notification.create(recipientEmployeeId = employeeId, ...) → one
 *       notification row, deduped per prediction.
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { createPerformancePredictionRiskNotifyMiddleware } from "../middleware/performance-prediction-risk-notify-middleware.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-perf-prediction";
// manager satisfies PerformancePrediction.create's policy; the Notification.create dispatch
// runs as system in production (here it runs as the same actor — manager is allowed too).
const USER = { id: "u-mgr", tenantId: TENANT, role: "manager" } as const;

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

/** Build the engine with the PerformancePredictionCreated→Notification middleware wired. */
function newEngine(provider: (entity: string) => Store): ManifestRuntimeEngine {
  let engine: ManifestRuntimeEngine;
  const middleware = [
    createPerformancePredictionRiskNotifyMiddleware({
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

let predictionSeq = 0;
async function createPrediction(
  engine: ManifestRuntimeEngine,
  fields: {
    confidence?: string;
    employeeId?: string;
    predictionScore: number;
    predictionType: string;
  }
) {
  predictionSeq += 1;
  const id = `pred-${predictionSeq}`;
  const result = await runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "PerformancePrediction",
      command: "create",
      body: {
        id,
        tenantId: TENANT,
        employeeId: fields.employeeId ?? "emp-1",
        predictionType: fields.predictionType,
        predictionHorizon: 7,
        predictionScore: fields.predictionScore,
        confidence: fields.confidence ?? "high",
        factors: "{}",
      },
      user: { ...USER },
    }
  );
  return { id, result };
}

async function notificationsForTenant(
  provider: (entity: string) => Store
): Promise<Record<string, unknown>[]> {
  const all = (await provider("Notification").getAll()) as Record<
    string,
    unknown
  >[];
  return all.filter((n) => n.tenantId === TENANT);
}

describe("Middleware conformance: PerformancePredictionCreated → Notification.create", () => {
  it("the compiled IR carries no PerformancePredictionCreated → Notification.create reaction (it is middleware)", () => {
    const reactions: Record<string, unknown>[] = ir.reactions ?? [];
    const stale = reactions.filter(
      (r) =>
        r.event === "PerformancePredictionCreated" &&
        r.targetEntity === "Notification" &&
        r.targetCommand === "create"
    );
    // A regression here means someone added a reaction that cannot express the
    // conditional per-type risk threshold; the propagation must stay middleware.
    expect(stale).toHaveLength(0);
  });

  it("notifies the employee when a high overtime-risk prediction is created", async () => {
    const provider = makeProvider();
    const engine = newEngine(provider);

    const { id, result } = await createPrediction(engine, {
      predictionType: "overtime_risk",
      predictionScore: 85, // >= 70 threshold
      employeeId: "emp-7",
    });
    expect(result.ok).toBe(true);

    // THE PROOF: the middleware dispatched Notification.create.
    const notes = await notificationsForTenant(provider);
    expect(notes).toHaveLength(1);
    const note = notes[0]!;
    expect(note.recipientEmployeeId).toBe("emp-7");
    expect(note.notificationType).toBe("performance_risk");
    expect(String(note.title)).toContain("Overtime risk");
    expect(note.correlationId).toBe(id);

    // Secondary proof: the chain ran end to end (both events present).
    const eventNames = (result.ok ? result.events : [])?.map(
      // biome-ignore lint/suspicious/noExplicitAny: structural event rows.
      (e: any) => e?.name
    );
    expect(eventNames).toContain("PerformancePredictionCreated");
    expect(eventNames).toContain("NotificationCreated");
  });

  it("notifies the employee when a low productivity prediction is created", async () => {
    const provider = makeProvider();
    const engine = newEngine(provider);

    const { result } = await createPrediction(engine, {
      predictionType: "productivity",
      predictionScore: 30, // <= 40 threshold
    });
    expect(result.ok).toBe(true);

    const notes = await notificationsForTenant(provider);
    expect(notes).toHaveLength(1);
    expect(String(notes[0]!.title)).toContain("Low productivity");
  });

  it("does NOT notify when a prediction is within healthy range (the common path)", async () => {
    const provider = makeProvider();
    const engine = newEngine(provider);

    // High productivity (good) and low overtime risk (good) → no alert.
    await createPrediction(engine, {
      predictionType: "productivity",
      predictionScore: 90,
    });
    await createPrediction(engine, {
      predictionType: "overtime_risk",
      predictionScore: 20,
    });

    const notes = await notificationsForTenant(provider);
    expect(notes).toHaveLength(0);
  });

  it("does NOT notify for non-routed prediction types (attendance / skill_match)", async () => {
    const provider = makeProvider();
    const engine = newEngine(provider);

    // Even an extreme score on a non-routed type must not alert.
    await createPrediction(engine, {
      predictionType: "attendance",
      predictionScore: 5,
    });
    await createPrediction(engine, {
      predictionType: "skill_match",
      predictionScore: 5,
    });

    const notes = await notificationsForTenant(provider);
    expect(notes).toHaveLength(0);
  });
});
