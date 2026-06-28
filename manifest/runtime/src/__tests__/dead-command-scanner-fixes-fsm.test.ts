/**
 * Conformance — three dead-command FSM fixes harvested by audit-dead-commands.mjs.
 *
 * The Manifest runtime validates EVERY status mutation against the declared
 * `transition` edges and rejects any undeclared target — INCLUDING a no-op
 * self-transition (notes.md §21) — so a command whose guarded source state has
 * no edge to its `mutate` target silently drops the mutate while reporting
 * success: a DEAD command. `manifest/scripts/audit-dead-commands.mjs` flags
 * exactly that (guard-admitted-states × reachable-targets); these three were
 * the highest-conviction guarded findings it surfaced (the vein the plan had
 * hand-waved "DRAINED" — it was not). All three are transition-table-only
 * fixes (transitions do not project to Prisma → no schema/migration).
 *
 *   1. Event.unfinalize        — guard status=="completed", mutate→"confirmed",
 *      but completed only reached [completed, archived]. Fully DEAD: reopening
 *      a finalized event did nothing (the FinalizeEventWithReporting saga's own
 *      compensation comment names this exact intent: "unfinalize reverts event
 *      to confirmed"). Fix: completed now also reaches "confirmed".
 *   2. EventReport.updateProgress — guard status in {draft, in_progress},
 *      mutate→"in_progress", but in_progress had no self-loop. So progress could
 *      be saved ONCE (draft→in_progress) and every later update silently failed
 *      the whole command. Fix: in_progress self-loop (the rsvpConfirm class).
 *   3. PrepTaskPlanWorkflow.quickApprove — guard status=="awaiting_review",
 *      mutate→"instantiating", but awaiting_review only reached [reviewing,
 *      cancelled]. Fully DEAD: the fast-path straight to instantiation never
 *      worked. Fix: awaiting_review now also reaches "instantiating".
 *
 * Each test drives the REAL `ManifestRuntimeEngine` + compiled IR (rows seeded
 * directly in an in-memory store — isolated infra setup, constitution §13) and
 * asserts the runtime now ACCEPTS the transition. They fail loudly if a table
 * regresses (and audit-dead-commands.mjs fails in CI for the same reason).
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-dead-cmd-fsm";
const USER = { id: "u-admin", tenantId: TENANT, role: "admin" } as const;

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
    const id = (data.id as string) ?? randomUUID();
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

function newEngine(provider: (entity: string) => Store): ManifestRuntimeEngine {
  return new ManifestRuntimeEngine(
    ir,
    {
      tenantId: TENANT,
      user: { id: USER.id, tenantId: TENANT, role: USER.role },
    },
    {
      storeProvider: provider,
      customBuiltins: createCustomBuiltins(),
      generateId: () => randomUUID(),
      now: () => Date.now(),
    }
  );
}

async function seed(
  provider: (entity: string) => Store,
  entity: string,
  row: Record<string, unknown>
): Promise<string> {
  const id = (row.id as string) ?? randomUUID();
  await provider(entity).create({ id, tenantId: TENANT, ...row } as never);
  return id;
}

function run(
  engine: ManifestRuntimeEngine,
  entity: string,
  command: string,
  body: Record<string, unknown>
) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity,
      command,
      body: { tenantId: TENANT, ...body },
      user: { ...USER },
    }
  );
}

function transitionsFor(entityName: string, prop = "status") {
  const ent = Array.isArray(ir.entities)
    ? // biome-ignore lint/suspicious/noExplicitAny: structural IR.
      ir.entities.find((x: any) => x.name === entityName)
    : ir.entities[entityName];
  const byFrom = new Map<string, string[]>();
  for (const t of ent.transitions ?? []) {
    if ((t.property ?? "status") === prop) {
      byFrom.set(t.from, t.to);
    }
  }
  return byFrom;
}

describe("Conformance: dead-command scanner fixes (FSM transition drift)", () => {
  it("Event.unfinalize: completed now reaches confirmed (unfinalize was fully dead)", () => {
    const byFrom = transitionsFor("Event");
    expect(byFrom.get("completed")).toContain("confirmed");
    // Existing edges preserved.
    expect(byFrom.get("completed")).toEqual(
      expect.arrayContaining(["completed", "confirmed", "archived"])
    );
    expect(byFrom.get("confirmed")).toContain("completed");
  });

  it("EventReport.updateProgress: in_progress self-loop lets repeated progress saves land", () => {
    const byFrom = transitionsFor("EventReport");
    expect(byFrom.get("in_progress")).toContain("in_progress");
    expect(byFrom.get("in_progress")).toContain("completed");
    expect(byFrom.get("draft")).toContain("in_progress");
  });

  it("drives EventReport.updateProgress on an in_progress report — previously a silent no-op", async () => {
    const provider = makeProvider();
    const id = await seed(provider, "EventReport", {
      eventId: "evt-1",
      name: "Post-event report",
      status: "in_progress",
      completion: 10,
      checklistData: "",
      version: 1,
      deletedAt: null,
    });
    const engine = newEngine(provider);

    const result = await run(engine, "EventReport", "updateProgress", {
      id,
      completion: 55,
      checklistData: "half done",
    });

    expect(result.ok).toBe(true);
    const row = (await provider("EventReport").getById(id)) as Record<
      string,
      unknown
    >;
    expect(row.status).toBe("in_progress"); // self-loop accepted, not rejected
    expect(row.completion).toBe(55); // the save the silent-drop bug previously ate
  });

  it("PrepTaskPlanWorkflow.quickApprove: awaiting_review now reaches instantiating (quickApprove was fully dead)", () => {
    const byFrom = transitionsFor("PrepTaskPlanWorkflow");
    expect(byFrom.get("awaiting_review")).toContain("instantiating");
    // Original fast-path + cancel preserved.
    expect(byFrom.get("awaiting_review")).toEqual(
      expect.arrayContaining(["reviewing", "instantiating", "cancelled"])
    );
  });

  it("drives PrepTaskPlanWorkflow.quickApprove from awaiting_review — previously fully dead", async () => {
    const provider = makeProvider();
    const id = await seed(provider, "PrepTaskPlanWorkflow", {
      eventId: "evt-1",
      idempotencyKey: "idem-1",
      status: "awaiting_review",
      currentStep: 2,
      totalSteps: 5,
      generatedCount: 3, // guard requires > 0
      approvedCount: 0,
      instantiatedCount: 0,
    });
    const engine = newEngine(provider);

    const result = await run(engine, "PrepTaskPlanWorkflow", "quickApprove", {
      id,
      approverId: USER.id,
    });

    expect(result.ok).toBe(true);
    const row = (await provider("PrepTaskPlanWorkflow").getById(id)) as Record<
      string,
      unknown
    >;
    expect(row.status).toBe("instantiating"); // the fast-path the dead transition blocked
  });
});
