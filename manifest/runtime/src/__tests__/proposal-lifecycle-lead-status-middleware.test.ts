/**
 * Middleware conformance — Proposal lifecycle → Lead status (IMPLEMENTATION_PLAN P1).
 *
 * WHY this matters (not just WHAT it does): the sales funnel must stay honest —
 * when a proposal is created/sent the originating Lead should advance to the
 * "proposal" stage, when it is accepted the lead is "won", and when rejected the
 * lead is "lost". Without this the Lead status freezes at "qualified" forever and
 * pipeline reporting is wrong.
 *
 * This CANNOT be a reaction: the Lead is identified by `Proposal.leadId` (the
 * proposal's OWN field), and `send`/`accept`/`reject` are MUTATE commands that take
 * no `leadId` param, so the emitted payload (`{ ...commandInput, result }`) cannot
 * carry it. Worse, `Lead.update` is a full-field mutate guarded by
 * `contactName != ""` — a reaction passing only `{ leadId, status }` would blank the
 * lead's other fields and trip the guard. The fix is middleware that LOADS the
 * Proposal (for leadId) and the Lead (for its existing fields + current status),
 * and dispatches the governed `Lead.update` only when the FSM transition is legal.
 *
 * The test runs against the REAL compiled IR through the runtime engine WITH the
 * middleware wired (middleware lives in the factory, not the IR), so it FAILS LOUDLY
 * if the propagation regresses — lead never advanced, wrong target, FSM gate broken,
 * or the engine stops dispatching — i.e. it fails when the BUSINESS propagation
 * breaks, not merely on a shape change (CLAUDE.md Rule 9; constitution §13). It also
 * regression-locks that no `Proposal* → Lead.update` reaction crept into the IR.
 *
 * Chain proven here:
 *   Proposal.send()  (proposal in "draft"/"sent"; lead in "qualified")
 *     → emits ProposalSent (_subject.id = the proposal id)
 *     → middleware loads the proposal, reads leadId; loads the lead, reads status
 *     → only if the lead's status permits the transition: dispatch Lead.update(status)
 *     → the Lead row advances, LeadUpdated bubbles up.
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { createProposalLifecycleLeadStatusMiddleware } from "../middleware/proposal-lifecycle-lead-status-middleware.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-proposal-lead";
// admin satisfies both Proposal commands' policy AND the middleware's Lead.update
// dispatch policy so neither the source command nor the downstream is denied.
const USER = { id: "u-proposal-lead", tenantId: TENANT, role: "admin" } as const;

const LEAD_ID = "lead-proposal-001";
const PROPOSAL_ID = "proposal-lead-001";

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

/** Build the engine with the Proposal→Lead middleware wired (as the factory does). */
function newEngine(provider: (entity: string) => Store): ManifestRuntimeEngine {
  let engine: ManifestRuntimeEngine;
  const middleware = [
    createProposalLifecycleLeadStatusMiddleware({
      storeProvider: provider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
      // Silence the default console.warn diagnostics in tests.
      onDiagnostic: () => {
        /* no-op */
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
  // Seed directly so the test isolates the proposal → middleware → Lead.update
  // chain. The seed must satisfy Lead's entity-level block constraints
  // (validStatus/validContactName/positiveEstimatedValue, lead-rules.manifest:31-34)
  // because `updateInstance` re-validates them against the merged row on every
  // mutate and silently no-ops if any fail. contactName must be non-empty (the
  // Lead.update guard) and status "qualified" so the proposal transitions are legal.
  await provider("Lead").create({
    id: LEAD_ID,
    tenantId: TENANT,
    source: "manual",
    companyName: "Smith Co",
    contactName: "Jane Smith",
    contactEmail: "jane@smith.example",
    contactPhone: "555-0100",
    eventType: "wedding",
    eventDate: null,
    estimatedGuests: 120,
    estimatedValue: 25000,
    status: "qualified",
    assignedTo: "u-sales-1",
    notes: "",
    convertedToClientId: "",
    convertedAt: null,
    deletedAt: null,
    ...overrides,
  } as never);
}

async function seedProposal(
  provider: (entity: string) => Store,
  overrides: Record<string, unknown> = {}
) {
  // Seed must satisfy Proposal's entity-level block constraints
  // (validTitle/validProposalNumber/positiveSubtotal/positiveTaxRate/positiveTotal,
  // proposal-rules.manifest:47-56), `send`'s `blockNoLineItems` (lineItemCount > 0,
  // :157) and `accept`'s `blockExpired` (validUntil == null, :209) — all re-validated
  // against the merged row on every mutate.
  await provider("Proposal").create({
    id: PROPOSAL_ID,
    tenantId: TENANT,
    leadId: LEAD_ID,
    clientId: "",
    eventId: "",
    proposalNumber: "PR-2026-001",
    title: "Smith Wedding Proposal",
    subtotal: 5000,
    taxRate: 8,
    taxAmount: 400,
    discountAmount: 0,
    total: 5400,
    lineItemCount: 2,
    validUntil: null,
    status: "draft",
    deletedAt: null,
    ...overrides,
  } as never);
}

async function sendProposal(engine: ManifestRuntimeEngine) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "Proposal",
      command: "send",
      body: { id: PROPOSAL_ID, tenantId: TENANT, userId: USER.id },
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
  return row.status;
}

describe("Middleware conformance: Proposal lifecycle → Lead status", () => {
  it("the compiled IR carries no Proposal*→Lead.update reaction (it is middleware)", () => {
    const reactions: Record<string, unknown>[] = ir.reactions ?? [];
    const stale = reactions.filter(
      (r) =>
        typeof r.event === "string" &&
        r.event.startsWith("Proposal") &&
        r.targetEntity === "Lead" &&
        r.targetCommand === "update"
    );
    // A regression here means someone added a reaction that structurally cannot
    // read Proposal.leadId / re-pass the lead's fields; it must stay middleware.
    expect(stale).toHaveLength(0);
  });

  it("sending a proposal advances a qualified lead to 'proposal'", async () => {
    const provider = makeProvider();
    await seedLead(provider); // status "qualified"
    await seedProposal(provider);
    const engine = newEngine(provider);

    const result = await sendProposal(engine);
    expect(result.ok).toBe(true);

    // THE PROOF: the middleware ran Lead.update against the SAME store.
    expect(await leadStatus(provider)).toBe("proposal");

    // Secondary proof: the downstream command's event bubbles into the parent
    // command's emitted events — only possible if the middleware executed.
    const eventNames = (result.ok ? result.events : [])?.map(
      // biome-ignore lint/suspicious/noExplicitAny: structural event rows.
      (e: any) => e?.name
    );
    expect(eventNames).toContain("ProposalSent");
    expect(eventNames).toContain("LeadUpdated");
  });

  it("the full-field Lead.update does not blank the lead's other fields", async () => {
    const provider = makeProvider();
    await seedLead(provider);
    await seedProposal(provider);
    const engine = newEngine(provider);

    await sendProposal(engine);

    const row = (await provider("Lead").getById(LEAD_ID)) as Record<
      string,
      unknown
    >;
    // Status advanced, but identifying fields are preserved (the middleware
    // re-passed them from the loaded row rather than blanking them).
    expect(row.status).toBe("proposal");
    expect(row.companyName).toBe("Smith Co");
    expect(row.contactName).toBe("Jane Smith");
    expect(row.contactEmail).toBe("jane@smith.example");
  });

  it("accepting a proposal advances a lead from 'proposal' to 'won'", async () => {
    const provider = makeProvider();
    await seedLead(provider, { status: "proposal" });
    await seedProposal(provider, { status: "sent" });
    const engine = newEngine(provider);

    const result = await runManifestCommandCore(
      { createRuntime: async () => engine },
      {
        entity: "Proposal",
        command: "accept",
        body: { id: PROPOSAL_ID, tenantId: TENANT, userId: USER.id },
        user: { ...USER },
      }
    );
    expect(result.ok).toBe(true);
    expect(await leadStatus(provider)).toBe("won");
  });

  it("rejecting a proposal moves a lead from 'proposal' to 'lost'", async () => {
    const provider = makeProvider();
    await seedLead(provider, { status: "proposal" });
    await seedProposal(provider, { status: "sent" });
    const engine = newEngine(provider);

    const result = await runManifestCommandCore(
      { createRuntime: async () => engine },
      {
        entity: "Proposal",
        command: "reject",
        body: {
          id: PROPOSAL_ID,
          tenantId: TENANT,
          userId: USER.id,
          reason: "budget",
        },
        user: { ...USER },
      }
    );
    expect(result.ok).toBe(true);
    expect(await leadStatus(provider)).toBe("lost");
  });

  it("does not advance a lead that is not in a transitionable state (FSM-safe)", async () => {
    const provider = makeProvider();
    // Lead still "new": ProposalSent targets "proposal", which is only reachable
    // from "qualified". The middleware must SKIP rather than swallow a failure.
    await seedLead(provider, { status: "new" });
    await seedProposal(provider);
    const engine = newEngine(provider);

    const result = await sendProposal(engine);
    expect(result.ok).toBe(true);

    // Untouched — the FSM gate prevented an illegal transition.
    expect(await leadStatus(provider)).toBe("new");
  });

  it("advances nothing when the proposal has no linked lead", async () => {
    const provider = makeProvider();
    await seedLead(provider);
    await seedProposal(provider, { leadId: "" });
    const engine = newEngine(provider);

    const result = await sendProposal(engine);
    expect(result.ok).toBe(true);

    // The seeded lead stays qualified — the middleware had no leadId to resolve.
    expect(await leadStatus(provider)).toBe("qualified");
  });
});
