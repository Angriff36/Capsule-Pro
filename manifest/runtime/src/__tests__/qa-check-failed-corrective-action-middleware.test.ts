/**
 * Middleware conformance — `QACheckFailed → QACorrectiveAction.create`
 * (IMPLEMENTATION_PLAN P1, "Kitchen QA/IoT → CorrectiveAction").
 *
 * WHY this matters (not just WHAT it does): a failed kitchen quality check is a
 * food-safety / compliance event whose whole point is to drive remediation —
 * `QACheck.fail`'s own comment says "callers should open a QACorrectiveAction".
 * But `QACheckFailed` had ZERO consumers (no reaction, no middleware, no factory
 * registration), and nothing in `apps/` chained a corrective-action create after
 * `qACheckFail`, so a failed check recorded the failure and then dropped it: no
 * tracked corrective action, no follow-up, no remediation audit trail. The
 * middleware opens the corrective action automatically.
 *
 * WHY middleware, not a reaction (the crux this test locks): `fail` is a MUTATE
 * command, so the engine's emitted payload `{ ...commandInput, result }` carries
 * the last mutate's scalar, NOT the check instance. The corrective action's
 * `relatedCheckId` is the QACheck's id (`_subject.id`) and the dispatch tenant is
 * the check's OWN `tenantId` field — neither is a `fail` input param, and declared
 * event fields are never auto-populated from `self.*`. So NO reaction can supply
 * the linkage/tenant; the middleware LOADS the check via `_subject.id`.
 *
 * The test runs against the REAL compiled IR through the runtime engine WITH the
 * middleware wired (middleware lives in the factory, not the IR), so it FAILS
 * LOUDLY if the propagation regresses — no corrective action opened, wrong
 * linkage, or the engine stops dispatching — i.e. it fails when the BUSINESS
 * propagation breaks, not merely on a shape change (CLAUDE.md Rule 9;
 * constitution §13). It also regression-locks that no `QACheckFailed →
 * QACorrectiveAction` reaction crept into the IR.
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { createQaCheckFailedCorrectiveActionMiddleware } from "../middleware/qa-check-failed-corrective-action-middleware.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-qa-fail";
// kitchen_lead satisfies QACheck's policy AND QACorrectiveAction.create's default
// policy (both: staff/kitchen_staff/kitchen_lead/manager/admin), so neither the
// source command nor the downstream create is policy-denied.
const USER = {
  id: "u-qa-fail",
  tenantId: TENANT,
  role: "kitchen_lead",
} as const;

const CHECK_ID = "qacheck-001";
const INSPECTOR = "inspector-007";

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

/** Build the engine with the qa-fail→corrective middleware wired (as the factory does). */
function newEngine(provider: (entity: string) => Store): ManifestRuntimeEngine {
  let engine: ManifestRuntimeEngine;
  const middleware = [
    createQaCheckFailedCorrectiveActionMiddleware({
      storeProvider: provider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
      onDiagnostic: () => {
        /* silence default console.warn in tests */
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

async function seedCheck(
  provider: (entity: string) => Store,
  overrides: Record<string, unknown> = {}
) {
  // A valid, pending check (validCheckType/validResult/validStatus constraints
  // re-validate on the fail command's mutate-persist).
  await provider("QACheck").create({
    id: CHECK_ID,
    tenantId: TENANT,
    location: "Walk-in cooler 2",
    checkType: "temperature",
    result: "pass",
    status: "pending",
    inspector: "",
    notes: "",
    ...overrides,
  } as never);
}

async function failCheck(
  engine: ManifestRuntimeEngine,
  notes: string,
  overrides: Record<string, unknown> = {}
) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "QACheck",
      command: "fail",
      body: {
        id: CHECK_ID,
        tenantId: TENANT,
        inspector: INSPECTOR,
        notes,
        ...overrides,
      },
      user: { ...USER },
    }
  );
}

// biome-ignore lint/suspicious/noExplicitAny: structural event rows.
function eventNames(result: any): string[] {
  return (result.ok ? result.events : [])?.map((e: any) => e?.name) ?? [];
}

async function correctiveActions(
  provider: (entity: string) => Store
): Promise<Record<string, unknown>[]> {
  return (await provider("QACorrectiveAction").getAll()) as Record<
    string,
    unknown
  >[];
}

describe("Middleware conformance: QACheckFailed → QACorrectiveAction.create", () => {
  it("the compiled IR carries no QACheckFailed→QACorrectiveAction reaction (it is middleware)", () => {
    const reactions: Record<string, unknown>[] = ir.reactions ?? [];
    const stale = reactions.filter(
      (r) =>
        r.event === "QACheckFailed" && r.targetEntity === "QACorrectiveAction"
    );
    // A regression here would mean someone added a reaction that structurally
    // cannot read the check's own tenantId / linkage — it must stay middleware.
    expect(stale).toHaveLength(0);
  });

  it("failing a check opens a linked corrective action for the inspector", async () => {
    const provider = makeProvider();
    await seedCheck(provider);
    const engine = newEngine(provider);

    const result = await failCheck(engine, "Cooler reading 48F — out of safe range");
    expect(result.ok).toBe(true);

    // THE PROOF: the middleware ran QACorrectiveAction.create against the store.
    const rows = await correctiveActions(provider);
    expect(rows).toHaveLength(1);
    const action = rows[0];
    expect(action.relatedCheckId).toBe(CHECK_ID);
    expect(action.assignedTo).toBe(INSPECTOR);
    expect(action.severity).toBe("high");
    expect(action.status).toBe("open");
    // The inspector's notes become the corrective-action description.
    expect(String(action.description)).toContain("out of safe range");
    // A due date was set (required create param) — a future epoch-ms timestamp.
    expect(typeof action.dueDate).toBe("number");
    expect(action.dueDate as number).toBeGreaterThan(0);

    // The check itself transitioned to completed/fail (the source command's effect).
    const checkRow = (await provider("QACheck").getById(CHECK_ID)) as Record<
      string,
      unknown
    >;
    expect(checkRow.status).toBe("completed");
    expect(checkRow.result).toBe("fail");

    // Secondary proof: the downstream event bubbles up into the parent's events —
    // only possible if the middleware executed.
    const names = eventNames(result);
    expect(names).toContain("QACheckFailed");
    expect(names).toContain("CorrectiveActionCreated");
  });

  it("falls back to a generated description when the inspector left no notes", async () => {
    const provider = makeProvider();
    await seedCheck(provider);
    const engine = newEngine(provider);

    // `fail` requires an inspector but not notes; an empty note must not produce
    // an empty corrective-action description (create guards `description != ""`).
    const result = await failCheck(engine, "");
    expect(result.ok).toBe(true);

    const rows = await correctiveActions(provider);
    expect(rows).toHaveLength(1);
    const action = rows[0];
    // Generated from the loaded check's type + location.
    expect(String(action.description)).toContain("temperature check failed");
    expect(String(action.description)).toContain("Walk-in cooler 2");

    const names = eventNames(result);
    expect(names).toContain("CorrectiveActionCreated");
  });

  it("opens no corrective action when the source command is not a real fail (clean no-op)", async () => {
    const provider = makeProvider();
    await seedCheck(provider);
    const engine = newEngine(provider);

    // Completing a check with a passing result emits QACheckCompleted, NOT
    // QACheckFailed — the middleware must not fire on it.
    const result = await runManifestCommandCore(
      { createRuntime: async () => engine },
      {
        entity: "QACheck",
        command: "complete",
        body: {
          id: CHECK_ID,
          tenantId: TENANT,
          result: "pass",
          inspector: INSPECTOR,
          notes: "All within range",
        },
        user: { ...USER },
      }
    );
    expect(result.ok).toBe(true);

    const rows = await correctiveActions(provider);
    expect(rows).toHaveLength(0);

    const names = eventNames(result);
    expect(names).toContain("QACheckCompleted");
    expect(names).not.toContain("CorrectiveActionCreated");
  });
});
