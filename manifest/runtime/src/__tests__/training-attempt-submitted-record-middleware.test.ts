/**
 * Middleware conformance — `TrainingAttemptSubmitted → TrainingAttempt.create`
 * (IMPLEMENTATION_PLAN P0).
 *
 * WHY this matters (not just WHAT it does): every training attempt a staff member
 * submits — pass, fail, or final-fail — must be recorded as an immutable
 * TrainingAttempt row so managers and audits can see who attempted what, with which
 * score, on which try. This was a SILENT NO-OP: the old
 * `on TrainingAttemptSubmitted run TrainingAttempt.create` reaction read
 * `payload.result.attemptCount` / `payload.result.passThresholdPercent` /
 * `payload.result.managerReviewRequired`, but the three submit commands
 * (`submitPassingAttempt` / `submitFailedAttempt` / `submitFinalFailedAttempt`) are
 * all MUTATE commands, so the engine's emitted payload `{ ...commandInput, result }`
 * carries `result` = the last mutate's scalar (`managerReviewRequired`, a boolean),
 * NOT the TrainingAssignment instance. Those three fields are the assignment's OWN
 * fields and are NOT submit-command params, so NO reaction — even reading `payload.*`
 * — can ever see them (declared event fields are not auto-populated from `self.*`).
 * The fix replaces the dead reaction with middleware that LOADS the just-mutated
 * TrainingAssignment from the store, reads `self.attemptCount` (post-increment → the
 * attempt number), `self.passThresholdPercent`, and `self.managerReviewRequired`,
 * derives `passed = scorePercent >= threshold`, and dispatches the governed
 * `TrainingAttempt.create`.
 *
 * The test runs against the REAL compiled IR through the runtime engine WITH the
 * middleware wired (middleware lives in the factory, not the IR), so it FAILS LOUDLY
 * if the propagation regresses — no attempt row recorded, wrong attempt number, or
 * the engine stops dispatching — i.e. it fails when the BUSINESS propagation breaks,
 * not merely on a shape change (CLAUDE.md Rule 9; constitution §13). It also
 * regression-locks that the broken reaction did not creep back into the IR.
 *
 * Chain proven here:
 *   TrainingAssignment.submitPassingAttempt(scorePercent=90)
 *     → emits TrainingAttemptSubmitted (_subject.id = the assignment id)
 *     → middleware loads the assignment, reads attemptCount/passThresholdPercent/
 *       managerReviewRequired, derives passed
 *     → dispatches TrainingAttempt.create(attemptNumber=1, scorePercent=90, passed=true)
 *     → a new TrainingAttempt row is persisted, TrainingAttemptRecorded bubbles up.
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { createTrainingAttemptSubmittedRecordMiddleware } from "../middleware/training-attempt-submitted-record-middleware.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-training-attempt";
// admin satisfies submitPassingAttempt's policy AND the middleware's
// TrainingAttempt.create dispatch policy so neither is denied.
const USER = { id: "u-trainee", tenantId: TENANT, role: "admin" } as const;

const ASSIGNMENT_ID = "ta-assign-001";
const MODULE_ID = "mod-food-safety";
const STAFF_ID = "staff-river";
const ATTEMPT_ID = "attempt-001";

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

/** Build the engine with the training-attempt middleware wired (as the factory does). */
function newEngine(provider: (entity: string) => Store): ManifestRuntimeEngine {
  let engine: ManifestRuntimeEngine;
  const middleware = [
    createTrainingAttemptSubmittedRecordMiddleware({
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

async function seedAssignment(
  provider: (entity: string) => Store,
  overrides: Record<string, unknown> = {}
) {
  // Seed directly via the store (bypassing TrainingAssignment.create's guards) so
  // the test isolates the submit → middleware chain, not assignment creation. The
  // seed satisfies every entity-level block constraint (validStatus / validAttemptCount
  // / validThreshold / validMaxAttempts) so the submit command's mutates actually
  // persist — otherwise updateInstance silently drops them while still emitting.
  await provider("TrainingAssignment").create({
    id: ASSIGNMENT_ID,
    tenantId: TENANT,
    moduleId: MODULE_ID,
    // submitPassingAttempt guards staffMemberId == self.employeeId.
    employeeId: STAFF_ID,
    staffRole: "staff",
    status: "assigned",
    attemptCount: 0,
    passThresholdPercent: 80,
    maxAttempts: 3,
    managerReviewRequired: false,
    lastAttemptId: "",
    lastScorePercent: 0,
    ...overrides,
  } as never);
}

async function submit(
  engine: ManifestRuntimeEngine,
  command: string,
  scorePercent: number,
  attemptId: string = ATTEMPT_ID
) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "TrainingAssignment",
      command,
      body: {
        id: ASSIGNMENT_ID,
        tenantId: TENANT,
        assignmentId: ASSIGNMENT_ID,
        attemptId,
        moduleId: MODULE_ID,
        staffMemberId: STAFF_ID,
        scorePercent,
        answersJson: "[]",
        userId: "trainee@example.com",
      },
      user: { ...USER },
    }
  );
}

describe("Middleware conformance: TrainingAttemptSubmitted → TrainingAttempt.create", () => {
  it("the compiled IR no longer carries the broken reaction (it is middleware now)", () => {
    const reactions: Record<string, unknown>[] = ir.reactions ?? [];
    const stale = reactions.filter(
      (r) =>
        r.event === "TrainingAttemptSubmitted" &&
        r.targetEntity === "TrainingAttempt" &&
        r.targetCommand === "create"
    );
    // A regression here means someone re-added the dead `payload.result.*`
    // reaction; the propagation must stay in middleware.
    expect(stale).toHaveLength(0);
  });

  it("a passing submission records a TrainingAttempt with the attempt number, score, and passed=true", async () => {
    const provider = makeProvider();
    await seedAssignment(provider);
    const engine = newEngine(provider);

    const result = await submit(engine, "submitPassingAttempt", 90);
    expect(result.ok).toBe(true);

    // THE PROOF: the middleware ran TrainingAttempt.create against the SAME store.
    const attempts = (await provider("TrainingAttempt").getAll()) as Record<
      string,
      unknown
    >[];
    expect(attempts).toHaveLength(1);
    const attempt = attempts[0];
    expect(attempt.id).toBe(ATTEMPT_ID);
    expect(attempt.assignmentId).toBe(ASSIGNMENT_ID);
    expect(attempt.moduleId).toBe(MODULE_ID);
    expect(attempt.staffMemberId).toBe(STAFF_ID);
    // attemptCount was 0; submitPassingAttempt incremented it to 1 → this attempt's
    // number is 1 (read from the assignment's OWN field, the whole point of middleware).
    expect(Number(attempt.attemptNumber)).toBe(1);
    expect(Number(attempt.scorePercent)).toBe(90);
    expect(Number(attempt.passThresholdPercent)).toBe(80);
    expect(attempt.passed).toBe(true);
    expect(attempt.managerReviewRequired).toBe(false);

    // Secondary proof: the downstream command's own event bubbles up into the
    // parent command's emitted events — only possible if the middleware executed.
    const eventNames = (result.ok ? result.events : [])?.map(
      // biome-ignore lint/suspicious/noExplicitAny: structural event rows.
      (e: any) => e?.name
    );
    expect(eventNames).toContain("TrainingAttemptSubmitted");
    expect(eventNames).toContain("TrainingAttemptRecorded");
  });

  it("a failing submission records a TrainingAttempt with passed=false", async () => {
    const provider = makeProvider();
    await seedAssignment(provider);
    const engine = newEngine(provider);

    // 50 < passThresholdPercent (80) and attemptCount+1 (1) < maxAttempts (3),
    // so submitFailedAttempt is the valid command.
    const result = await submit(engine, "submitFailedAttempt", 50);
    expect(result.ok).toBe(true);

    const attempts = (await provider("TrainingAttempt").getAll()) as Record<
      string,
      unknown
    >[];
    expect(attempts).toHaveLength(1);
    const attempt = attempts[0];
    expect(Number(attempt.attemptNumber)).toBe(1);
    expect(Number(attempt.scorePercent)).toBe(50);
    // passed is derived in the middleware: 50 >= 80 → false.
    expect(attempt.passed).toBe(false);
  });

  it("does not record a second row when one already exists for the attempt id (idempotent)", async () => {
    const provider = makeProvider();
    await seedAssignment(provider);
    // Pre-existing attempt with the same id (e.g. a re-emitted submit event).
    await provider("TrainingAttempt").create({
      id: ATTEMPT_ID,
      tenantId: TENANT,
      assignmentId: ASSIGNMENT_ID,
      moduleId: MODULE_ID,
      staffMemberId: STAFF_ID,
      attemptNumber: 1,
      scorePercent: 88,
      passed: true,
    } as never);
    const engine = newEngine(provider);

    const result = await submit(engine, "submitPassingAttempt", 95);
    expect(result.ok).toBe(true);

    const attempts = (await provider("TrainingAttempt").getAll()) as Record<
      string,
      unknown
    >[];
    expect(attempts).toHaveLength(1);
    // The original row is untouched (the middleware skipped on the dedupe guard).
    expect(Number(attempts[0].scorePercent)).toBe(88);
  });
});
