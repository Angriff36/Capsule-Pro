/**
 * Conformance — CollectionCase dispute sub-FSM lets `markDisputed` dispute an
 * ACTIVE/IN_PROGRESS case and `resolveDispute` return it to ACTIVE.
 *
 * WHY this matters (not just WHAT it does): the Manifest runtime validates EVERY
 * status mutation against the declared `transition` edges and rejects any
 * undeclared target (notes.md §21). The dispute pair was dead for the common case:
 *   - `markDisputed` guards `self.isDisputed == false` (any active state) and
 *     `mutate status = "DISPUTED"`, but only `LEGAL -> DISPUTED` was declared — so
 *     disputing an ACTIVE or IN_PROGRESS case (a client disputing a live bill, the
 *     normal trigger) was an undeclared transition the engine rejected.
 *   - `resolveDispute` guards `self.isDisputed == true` (reachable only in DISPUTED,
 *     the lone state `markDisputed` produces) and `mutate status = "ACTIVE"`, but
 *     `DISPUTED -> [IN_PROGRESS, RESOLVED]` had no `-> ACTIVE` edge — so un-disputing
 *     back to active collection was rejected.
 * Both guards key off `isDisputed` (a stored boolean), not status, signalling the
 * full active workflow was intended to dispute/resolve — so the transition table,
 * not the guards, was the bug. The fix adds `ACTIVE/IN_PROGRESS -> DISPUTED` and
 * `DISPUTED -> ACTIVE` (the guard-admitted-state x reachable-target pairs for the
 * active workflow; terminals stay non-disputable). Same class as the
 * EventGuest/InventoryAlert/Driver/Vendor transition-drift fixes.
 *
 * Each test SEEDS the precondition row directly in the store (isolated
 * infrastructure setup, constitution §13) and drives the real commands through the
 * production `ManifestRuntimeEngine` + compiled IR, asserting the runtime ACCEPTS
 * the transition AND stamps the dispute fields — the part the silent-drop bug ate.
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

const TENANT = "t-collection-case-fsm";
const USER = {
  id: "u-fin",
  tenantId: TENANT,
  role: "finance",
} as const;

/** Minimal persistent in-memory store (mirrors the upstream MemoryStore contract). */
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

/**
 * Seed a CollectionCase row at a given status (precondition setup, not the
 * behaviour under test). All required fields + the entity-level constraints
 * (amount_positive, collected_valid) are satisfied so the engine's re-validation
 * on update does not silently drop the mutate (notes.md §21).
 */
async function seedCase(
  provider: (entity: string) => Store,
  status: string,
  overrides: Record<string, unknown> = {}
): Promise<string> {
  const id = randomUUID();
  await provider("CollectionCase").create({
    id,
    tenantId: TENANT,
    invoiceId: "inv-fsm-001",
    invoiceNumber: `INV-${id.slice(0, 8)}`,
    eventId: "evt-fsm-001",
    clientId: "cli-fsm-001",
    clientName: "Acme Catering Co",
    originalAmount: 1000,
    outstandingAmount: 1000,
    collectedAmount: 0,
    status,
    priority: "MEDIUM",
    dunningStage: "CURRENT",
    daysOverdue: 30,
    agingBucket: "30",
    assignedTo: "",
    hasPaymentPlan: false,
    paymentPlanId: "",
    isDisputed: false,
    disputeReason: "",
    isEscalatedToLegal: false,
    legalCaseNumber: "",
    legalFirm: "",
    notes: "",
    lastActivityAt: Date.now(),
    metadata: "{}",
    ...overrides,
  } as never);
  return id;
}

function run(
  engine: ManifestRuntimeEngine,
  command: string,
  body: Record<string, unknown>
) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "CollectionCase",
      command,
      body: { tenantId: TENANT, ...body },
      user: { ...USER },
    }
  );
}

describe("Conformance: CollectionCase dispute sub-FSM (markDisputed / resolveDispute)", () => {
  it("IR carries ACTIVE/IN_PROGRESS -> DISPUTED and DISPUTED -> ACTIVE alongside the original edges", () => {
    const ent = Array.isArray(ir.entities)
      ? // biome-ignore lint/suspicious/noExplicitAny: structural IR.
        ir.entities.find((x: any) => x.name === "CollectionCase")
      : ir.entities.CollectionCase;
    const transitions: { property?: string; from: string; to: string[] }[] =
      ent.transitions ?? [];
    const byFrom = new Map(
      transitions
        .filter((t) => (t.property ?? "status") === "status")
        .map((t) => [t.from, t.to])
    );

    // The previously-missing edges.
    expect(byFrom.get("ACTIVE")).toContain("DISPUTED");
    expect(byFrom.get("IN_PROGRESS")).toContain("DISPUTED");
    expect(byFrom.get("DISPUTED")).toContain("ACTIVE");
    // The original edges are preserved.
    expect(byFrom.get("LEGAL")).toContain("DISPUTED");
    expect(byFrom.get("DISPUTED")).toContain("IN_PROGRESS");
    expect(byFrom.get("DISPUTED")).toContain("RESOLVED");
  });

  it("disputes an ACTIVE case (ACTIVE -> DISPUTED) — previously silently rejected", async () => {
    const provider = makeProvider();
    const id = await seedCase(provider, "ACTIVE");
    const engine = newEngine(provider);

    const result = await run(engine, "markDisputed", {
      id,
      reason: "Client contests the catering line items",
    });

    expect(result.ok).toBe(true);
    const row = (await provider("CollectionCase").getById(id)) as Record<
      string,
      unknown
    >;
    expect(row.status).toBe("DISPUTED");
    expect(row.isDisputed).toBe(true);
    expect(row.disputeReason).toBe("Client contests the catering line items");
  });

  it("resolves a DISPUTED case back to ACTIVE (DISPUTED -> ACTIVE) and stamps disputeResolvedAt — previously silently rejected", async () => {
    const provider = makeProvider();
    const id = await seedCase(provider, "DISPUTED", {
      isDisputed: true,
      disputeReason: "Client contests the catering line items",
    });
    const engine = newEngine(provider);

    const result = await run(engine, "resolveDispute", {
      id,
      resolutionNotes: "Line items verified against the signed contract",
    });

    expect(result.ok).toBe(true);
    const row = (await provider("CollectionCase").getById(id)) as Record<
      string,
      unknown
    >;
    expect(row.status).toBe("ACTIVE");
    // The mutations the silent-drop bug previously ate.
    expect(row.isDisputed).toBe(false);
    expect(row.disputeResolvedAt).toBeTruthy();
  });

  it("still refuses resolveDispute on a non-disputed case (guard, not transition)", async () => {
    const provider = makeProvider();
    const id = await seedCase(provider, "ACTIVE");
    const engine = newEngine(provider);

    const result = await run(engine, "resolveDispute", {
      id,
      resolutionNotes: "n/a",
    });

    // The guard `isDisputed == true` blocks this.
    expect(result.ok).toBe(false);
    const row = (await provider("CollectionCase").getById(id)) as Record<
      string,
      unknown
    >;
    expect(row.status).toBe("ACTIVE");
    expect(row.isDisputed).toBe(false);
  });
});
