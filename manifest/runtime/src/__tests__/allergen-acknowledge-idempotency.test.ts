/**
 * Regression: AllergenWarning.acknowledge must be idempotent at the runtime
 * command boundary.
 *
 * Product rule: re-issuing an idempotent user action (acknowledge / markResolved
 * / softDelete) after it has already taken effect is a NO-OP, not a 422. This
 * test pins:
 *   1. first acknowledge succeeds and emits exactly one AllergenWarningAcknowledged
 *   2. second acknowledge returns success, noop=true, and emits NO event
 *      (→ no duplicate audit/outbox row, and execute-command logs no
 *       [manifest-issue] because the result is ok)
 *   3. a GENUINE invalid transition still returns guard_failed / 422 — the
 *      idempotency path never rescues a real disallowed action
 *   4. an idempotent verb whose precondition genuinely fails (markResolved
 *      before acknowledge) is NOT masked — still guard_failed / 422
 *
 * Guards are NOT weakened here: the engine still rejects; the core only
 * reclassifies the rejection as a no-op when the entity is already in the
 * command's final state.
 */
import { RuntimeEngine } from "@angriff36/manifest";
import { compileToIR } from "@angriff36/manifest/ir-compiler";
import { beforeEach, describe, expect, it } from "vitest";
import { runManifestCommandCore } from "../run-manifest-command-core.js";

const SOURCE = `
entity AllergenWarning {
  key [tenantId, id]
  property required id: string
  property required tenantId: string
  property eventId: string = ""
  property warningType: string = ""
  property allergens: string = ""
  property severity: string = "warning"
  property isAcknowledged: boolean = false
  property acknowledgedBy: string = ""
  property acknowledgedAt: datetime
  property resolved: boolean = false
  property resolvedAt: datetime
  property escalatedAt: datetime
  property escalatedTo: string = ""
  property notes: string = ""
  property deletedAt: datetime

  default policy AllergenWarningDefaultAccess execute: user.role in ["staff", "manager", "admin"] "Allergen warning management"

  command create(eventId: string, warningType: string, allergens: string, severity: string) {
    guard warningType != null and warningType != "" "Warning type is required"
    mutate eventId = eventId
    mutate warningType = warningType
    mutate allergens = allergens
    mutate severity = severity
    mutate isAcknowledged = false
    mutate resolved = false
    emit AllergenWarningCreated
  }

  command acknowledge(acknowledgedBy: string, notes: string) {
    guard self.isAcknowledged == false "Warning is already acknowledged"
    guard acknowledgedBy != null and acknowledgedBy != "" "Acknowledged by user is required"
    mutate isAcknowledged = true
    mutate acknowledgedBy = acknowledgedBy
    mutate acknowledgedAt = now()
    mutate notes = notes
    emit AllergenWarningAcknowledged
  }

  command markResolved(resolvedBy: string) {
    guard self.resolved == false "Warning is already resolved"
    guard self.isAcknowledged "Warning must be acknowledged before resolving"
    mutate resolved = true
    mutate resolvedAt = now()
    emit AllergenWarningResolved
  }

  command escalate(escalatedTo: string, reason: string) {
    guard self.severity == "critical" "Only critical warnings can be escalated"
    guard self.isAcknowledged == false "Already-acknowledged warnings do not need escalation"
    guard escalatedTo != null and escalatedTo != "" "Escalation target is required"
    mutate escalatedAt = now()
    mutate escalatedTo = escalatedTo
    mutate notes = reason
    emit AllergenWarningEscalated
  }
}

event AllergenWarningCreated: "allergen.warning.created" { warningId: string }
event AllergenWarningAcknowledged: "allergen.warning.acknowledged" { warningId: string }
event AllergenWarningResolved: "allergen.warning.resolved" { warningId: string }
event AllergenWarningEscalated: "allergen.warning.escalated" { warningId: string }
`;

const USER = { id: "u1", tenantId: "t1", role: "manager" } as const;

// biome-ignore lint/suspicious/noExplicitAny: IR type is structural; engine accepts it.
let ir: any;

beforeEach(async () => {
  const result = await compileToIR(SOURCE);
  expect(result.ir).toBeTruthy();
  ir = result.ir;
});

function newEngine(): RuntimeEngine {
  return new RuntimeEngine(ir, {
    user: { id: USER.id, tenantId: USER.tenantId, role: USER.role },
  });
}

function run(
  engine: RuntimeEngine,
  command: string,
  body: Record<string, unknown>,
  instanceId?: string
) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "AllergenWarning",
      command,
      body,
      user: { ...USER },
      ...(instanceId ? { instanceId } : {}),
    }
  );
}

async function createWarning(
  engine: RuntimeEngine,
  overrides: Record<string, unknown> = {}
): Promise<string> {
  const res = await run(engine, "create", {
    eventId: "e1",
    warningType: "allergen_conflict",
    allergens: "peanut",
    severity: "warning",
    ...overrides,
  });
  expect(res.ok, `create failed: ${JSON.stringify(res)}`).toBe(true);
  const id = (res as { result: { id: string } }).result.id;
  expect(id).toBeTruthy();
  return id;
}

function eventNames(res: unknown): string[] {
  const events = (res as { events?: Array<{ name?: string; type?: string }> })
    .events;
  return (events ?? []).map((e) => e.name ?? e.type ?? "");
}

describe("AllergenWarning.acknowledge — idempotent no-op", () => {
  it("first acknowledge succeeds and emits exactly one event", async () => {
    const engine = newEngine();
    const id = await createWarning(engine);

    const res = await run(engine, "acknowledge", { acknowledgedBy: "u1" }, id);

    expect(res.ok).toBe(true);
    expect((res as { noop?: boolean }).noop).toBeFalsy();
    expect(eventNames(res).filter((n) => n.includes("Acknowledged"))).toHaveLength(
      1
    );
  });

  it("second acknowledge is a no-op: success, noop=true, NO duplicate event", async () => {
    const engine = newEngine();
    const id = await createWarning(engine);

    await run(engine, "acknowledge", { acknowledgedBy: "u1" }, id);
    const second = await run(engine, "acknowledge", { acknowledgedBy: "u1" }, id);

    // Success, not a 422 — the user never sees a state-machine error.
    expect(second.ok).toBe(true);
    expect((second as { noop?: boolean }).noop).toBe(true);
    // No second AllergenWarningAcknowledged event → no duplicate audit/outbox.
    expect(eventNames(second)).toHaveLength(0);
    // Returns the current (already-acknowledged) entity.
    expect(
      (second as { result: { isAcknowledged?: boolean } }).result.isAcknowledged
    ).toBe(true);
  });

  it("does NOT rescue a genuine invalid transition (escalate after acknowledge → 422)", async () => {
    const engine = newEngine();
    const id = await createWarning(engine, { severity: "critical" });
    await run(engine, "acknowledge", { acknowledgedBy: "u1" }, id);

    // escalate is NOT an idempotent action; escalating an acknowledged warning
    // is a real disallowed transition and must still be blocked.
    const res = await run(engine, "escalate", { escalatedTo: "chef", reason: "x" }, id);

    expect(res.ok).toBe(false);
    expect((res as { kind: string }).kind).toBe("guard_failed");
    expect((res as { httpStatus: number }).httpStatus).toBe(422);
  });

  it("does NOT mask a real precondition failure on an idempotent verb (markResolved before acknowledge → 422)", async () => {
    const engine = newEngine();
    const id = await createWarning(engine);

    // markResolved IS idempotent on resolved===true, but here resolved is false
    // and the warning is not acknowledged, so the guard genuinely fails and the
    // completion predicate is false → still 422.
    const res = await run(engine, "markResolved", { resolvedBy: "u1" }, id);

    expect(res.ok).toBe(false);
    expect((res as { kind: string }).kind).toBe("guard_failed");
    expect((res as { httpStatus: number }).httpStatus).toBe(422);
  });
});
