/**
 * Middleware conformance — Deal lifecycle propagation (IMPLEMENTATION_PLAN P1, CRM).
 *
 * WHY this matters (not just WHAT it does):
 *   - When a Deal is closed won/lost, the originating Lead's pipeline status must
 *     mirror the outcome so CRM funnel reporting stays honest. Without this the Lead
 *     freezes at "proposal" even though the opportunity is decided.
 *   - When a Deal is assigned, the assignee must be notified; otherwise assignments
 *     are silent and work is dropped.
 *
 * This CANNOT be a reaction. The Lead is `Deal.leadId` — the deal's OWN field, NOT a
 * `close` param (only `status` rides the `{ ...commandInput, result }` payload), and
 * `Lead.update` is a full-field mutate guarded by `contactName != ""`, so the lead
 * must be LOADED and its fields re-passed. The assignee notification needs the deal's
 * `title` (its OWN field) too. So both legs are middleware that load the Deal.
 *
 * Runs against the REAL compiled IR through the runtime engine WITH the middleware
 * wired (middleware lives in the factory, not the IR), so it FAILS LOUDLY if the
 * business propagation regresses — lead never mirrored, wrong target, FSM gate
 * broken, or assignee never notified (CLAUDE.md Rule 9; constitution §13). It also
 * regression-locks that no Deal* → Lead.update / Notification.create reaction crept
 * into the IR (it must stay middleware).
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { createDealLifecyclePropagationMiddleware } from "../middleware/deal-lifecycle-propagation-middleware.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-deal-lifecycle";
// admin satisfies Deal's command policy AND the downstream Lead.update / the
// manager/admin-gated Notification.create policy so no leg is denied.
const USER = { id: "u-deal-lifecycle", tenantId: TENANT, role: "admin" } as const;

const LEAD_ID = "lead-deal-001";
const DEAL_ID = "deal-lifecycle-001";

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

/** Build the engine with the Deal-lifecycle middleware wired (as the factory does). */
function newEngine(provider: (entity: string) => Store): ManifestRuntimeEngine {
  let engine: ManifestRuntimeEngine;
  const middleware = [
    createDealLifecyclePropagationMiddleware({
      storeProvider: provider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
      onDiagnostic: () => {
        /* silence console diagnostics in tests */
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

async function seedLead(
  provider: (entity: string) => Store,
  overrides: Record<string, unknown> = {}
) {
  // Seed must satisfy Lead's entity-level block constraints (validStatus/validSource/
  // validContactName, lead-rules.manifest:31-33), re-validated on every Lead.update
  // mutate. status drives whether the close mirror's FSM transition is legal.
  await provider("Lead").create({
    id: LEAD_ID,
    tenantId: TENANT,
    source: "manual",
    companyName: "Acme Co",
    contactName: "Pat Buyer",
    contactEmail: "pat@acme.example",
    contactPhone: "555-0199",
    eventType: "corporate",
    eventDate: null,
    estimatedGuests: 80,
    estimatedValue: 18000,
    status: "proposal",
    assignedTo: "u-sales-9",
    notes: "",
    convertedToClientId: "",
    convertedAt: null,
    deletedAt: null,
    ...overrides,
  } as never);
}

async function seedDeal(
  provider: (entity: string) => Store,
  overrides: Record<string, unknown> = {}
) {
  // Seed must satisfy Deal's entity-level block constraints (validStage/validStatus/
  // positiveValue/validProbability, deal-rules.manifest:31-34). status "open" so
  // close/assign guards pass.
  await provider("Deal").create({
    id: DEAL_ID,
    tenantId: TENANT,
    leadId: LEAD_ID,
    title: "Acme Q3 Catering",
    value: 18000,
    currency: "USD",
    stage: "negotiation",
    status: "open",
    probability: 60,
    expectedCloseDate: null,
    actualCloseDate: null,
    assignedTo: "",
    notes: "",
    ...overrides,
  } as never);
}

async function closeDeal(engine: ManifestRuntimeEngine, status: string) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "Deal",
      command: "close",
      body: { id: DEAL_ID, tenantId: TENANT, status },
      user: { ...USER },
    }
  );
}

async function assignDeal(engine: ManifestRuntimeEngine, assignedTo: string) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "Deal",
      command: "assign",
      body: { id: DEAL_ID, tenantId: TENANT, assignedTo, assignedBy: USER.id },
      user: { ...USER },
    }
  );
}

async function leadStatus(
  provider: (entity: string) => Store
): Promise<unknown> {
  const row = (await provider("Lead").getById(LEAD_ID)) as Record<
    string,
    unknown
  >;
  return row?.status;
}

describe("Middleware conformance: Deal lifecycle propagation", () => {
  it("the compiled IR carries no Deal*→Lead.update / Notification.create reaction (it is middleware)", () => {
    const reactions: Record<string, unknown>[] = ir.reactions ?? [];
    const stale = reactions.filter(
      (r) =>
        typeof r.event === "string" &&
        r.event.startsWith("Deal") &&
        ((r.targetEntity === "Lead" && r.targetCommand === "update") ||
          (r.targetEntity === "Notification" && r.targetCommand === "create"))
    );
    expect(stale).toHaveLength(0);
  });

  it("closing a deal 'won' mirrors a proposal-stage lead to 'won'", async () => {
    const provider = makeProvider();
    await seedLead(provider); // status "proposal"
    await seedDeal(provider);
    const engine = newEngine(provider);

    const result = await closeDeal(engine, "won");
    expect(result.ok).toBe(true);

    // THE PROOF: the middleware ran Lead.update against the SAME store.
    expect(await leadStatus(provider)).toBe("won");

    const eventNames = (result.ok ? result.events : [])?.map(
      // biome-ignore lint/suspicious/noExplicitAny: structural event rows.
      (e: any) => e?.name
    );
    expect(eventNames).toContain("DealClosed");
    expect(eventNames).toContain("LeadUpdated");
  });

  it("closing a deal 'lost' mirrors a proposal-stage lead to 'lost' without blanking fields", async () => {
    const provider = makeProvider();
    await seedLead(provider); // status "proposal"
    await seedDeal(provider);
    const engine = newEngine(provider);

    const result = await closeDeal(engine, "lost");
    expect(result.ok).toBe(true);

    const row = (await provider("Lead").getById(LEAD_ID)) as Record<
      string,
      unknown
    >;
    expect(row.status).toBe("lost");
    // Full-field mutate must preserve the lead's identifying fields.
    expect(row.companyName).toBe("Acme Co");
    expect(row.contactName).toBe("Pat Buyer");
    expect(row.contactEmail).toBe("pat@acme.example");
  });

  it("does not mirror onto an already-converted lead (Lead.update guard-safe)", async () => {
    const provider = makeProvider();
    // A converted lead (won via convertToClient) — Lead.update guard
    // `isConverted == false` would reject; the middleware must skip cleanly.
    await seedLead(provider, {
      status: "won",
      convertedToClientId: "client-123",
      convertedAt: Date.now(),
    });
    await seedDeal(provider);
    const engine = newEngine(provider);

    const result = await closeDeal(engine, "lost");
    expect(result.ok).toBe(true);

    // Untouched — the converted/FSM gates prevented an illegal mirror.
    expect(await leadStatus(provider)).toBe("won");
  });

  it("skips the mirror when the deal has no linked lead", async () => {
    const provider = makeProvider();
    await seedLead(provider); // a lead exists, but the deal points at nothing
    await seedDeal(provider, { leadId: "" });
    const engine = newEngine(provider);

    const result = await closeDeal(engine, "won");
    expect(result.ok).toBe(true);

    // The seeded lead stays "proposal" — the middleware had no leadId to resolve.
    expect(await leadStatus(provider)).toBe("proposal");
  });

  it("assigning a deal notifies the assignee via Notification.create", async () => {
    const provider = makeProvider();
    await seedLead(provider);
    await seedDeal(provider);
    const engine = newEngine(provider);

    const result = await assignDeal(engine, "u-rep-7");
    expect(result.ok).toBe(true);

    const eventNames = (result.ok ? result.events : [])?.map(
      // biome-ignore lint/suspicious/noExplicitAny: structural event rows.
      (e: any) => e?.name
    );
    expect(eventNames).toContain("DealAssigned");
    expect(eventNames).toContain("NotificationCreated");

    // THE PROOF: a notification row exists for the assignee, correlated to the deal.
    const notifications = (await provider("Notification").getAll()) as Record<
      string,
      unknown
    >[];
    const notice = notifications.find(
      (n) => n.recipientEmployeeId === "u-rep-7"
    );
    expect(notice).toBeDefined();
    expect(notice?.correlationId).toBe(DEAL_ID);
    expect(notice?.notificationType).toBe("deal_assigned");
    expect(String(notice?.title)).toContain("Acme Q3 Catering");
  });

  it("reassigning a deal notifies the new assignee (per-recipient notification)", async () => {
    const provider = makeProvider();
    await seedLead(provider);
    await seedDeal(provider);
    const engine = newEngine(provider);

    // First assignment, then a reassignment to a different person. The deal stays
    // "open" across both (assign does not close it), so both are legal and each
    // assignee gets their own notification (the idempotencyKey is per deal+recipient,
    // so a DIFFERENT recipient is not deduped).
    expect((await assignDeal(engine, "u-rep-7")).ok).toBe(true);
    expect((await assignDeal(engine, "u-rep-8")).ok).toBe(true);

    const notifications = (await provider("Notification").getAll()) as Record<
      string,
      unknown
    >[];
    expect(
      notifications.some((n) => n.recipientEmployeeId === "u-rep-7")
    ).toBe(true);
    expect(
      notifications.some((n) => n.recipientEmployeeId === "u-rep-8")
    ).toBe(true);
  });
});
