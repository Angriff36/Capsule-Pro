/**
 * Reaction conformance — `ProposalAccepted → Event.create` (IMPLEMENTATION_PLAN P0).
 *
 * WHY this matters (not just WHAT it does): accepting a proposal is supposed to
 * automatically create the planning Event so the deal immediately enters the
 * event workflow (no manual proposal→event handoff). The reaction
 * `on ProposalAccepted run Event.create` (manifest/source/platform/reactions.manifest)
 * was a SILENT NO-OP: it read `payload.result.clientId/title/total` and resolved
 * `payload.result.id`, but `Proposal.accept` is a MUTATE command, so the engine's
 * emitted payload `{ ...commandInput, result }` carries `result` = the last
 * mutate's scalar (`acceptedAt = now()`), NOT the Proposal instance. Every
 * `payload.result.*` was therefore `undefined`, the resolve produced no id, and no
 * Event was ever created. Accepted proposals fell into a black hole.
 *
 * The fix adds `clientId/proposalNumber/title/total` as pass-through command params
 * on `accept` (supplied by the public proposal-respond route, which holds the full
 * proposal), so they arrive on the payload as `payload.<field>`, and switches the
 * reaction to `resolve null` (engine auto-generates the new Event id — same idiom as
 * the working `EventCreated → BattleBoard.create` reaction).
 *
 * This test runs against the REAL compiled IR (`manifest/ir/kitchen.ir.json`) through
 * `RuntimeEngine.runCommand`, so it FAILS LOUDLY if the reaction regresses to
 * `payload.result.*`, if the resolve stops auto-generating the id, if the params stop
 * mapping the proposal fields, or if the engine stops dispatching the reaction — i.e.
 * it can fail when the *business propagation* breaks, not merely when shape changes
 * (CLAUDE.md Rule 9; constitution §13).
 *
 * Chain proven here:
 *   Proposal.accept(clientId=C, proposalNumber=P, title=T, total=$)
 *     → emits ProposalAccepted (payload.clientId=C, payload.proposalNumber=P, …)
 *     → reaction runs Event.create(clientId=C, eventNumber=P, title=T, budget=$)
 *     → a new Event row is persisted with those fields
 *     → emits EventCreated (bubbles up into accept's emittedEvents)
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { RuntimeEngine, type Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-proposal-accept";
// admin satisfies Proposal.accept's policy AND Event.create's policy so neither the
// source command nor the reaction's downstream command is denied at the policy gate.
const USER = { id: "u-proposal-accept", tenantId: TENANT, role: "admin" } as const;

const PROPOSAL_ID = "prop-accept-001";

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

function newEngine(provider: (entity: string) => Store): RuntimeEngine {
  return new RuntimeEngine(
    ir,
    {
      tenantId: USER.tenantId,
      user: { id: USER.id, tenantId: USER.tenantId, role: USER.role },
    },
    { storeProvider: provider, customBuiltins: createCustomBuiltins() }
  );
}

async function seedProposal(
  provider: (entity: string) => Store,
  overrides: Record<string, unknown> = {}
) {
  // Seed directly via the store (bypassing Proposal.create's guards) so the test
  // isolates the accept → reaction chain, not proposal creation.
  await provider("Proposal").create({
    id: PROPOSAL_ID,
    tenantId: TENANT,
    proposalNumber: "PROP-2026-042",
    clientId: "client-aurora",
    title: "Aurora Gala Dinner",
    eventType: "wedding",
    total: 7500,
    status: "sent",
    lineItemCount: 1,
    ...overrides,
  } as never);
}

async function acceptProposal(
  engine: RuntimeEngine,
  fields: {
    clientId: string;
    proposalNumber: string;
    title: string;
    total: number;
    eventType: string;
  }
) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "Proposal",
      command: "accept",
      body: {
        id: PROPOSAL_ID,
        tenantId: TENANT,
        userId: "responder@example.com",
        // The public proposal-respond route supplies these pass-through params.
        clientId: fields.clientId,
        proposalNumber: fields.proposalNumber,
        title: fields.title,
        total: fields.total,
        eventType: fields.eventType,
      },
      user: { ...USER },
    }
  );
}

describe("Reaction conformance: ProposalAccepted → Event.create", () => {
  it("the compiled IR carries the reaction reading payload params with an auto-generated id (not payload.result.*)", () => {
    const reactions: Record<string, unknown>[] = ir.reactions ?? [];
    const reaction = reactions.find(
      (r) =>
        r.event === "ProposalAccepted" &&
        r.targetEntity === "Event" &&
        r.targetCommand === "create"
    );
    expect(reaction).toBeDefined();

    // resolve null ⇒ engine auto-generates the new Event id. A regression back to
    // `payload.result.id` (a mutate scalar) would re-break the reaction.
    expect(reaction?.resolve).toEqual({
      kind: "literal",
      value: { kind: "null" },
    });

    // Params read the proposal fields off the payload directly — NOT off
    // `payload.result.*` (which is the last mutate's scalar on a MUTATE command).
    const paramsJson = JSON.stringify(reaction?.params);
    expect(paramsJson).toContain('"property":"clientId"');
    expect(paramsJson).toContain('"property":"proposalNumber"');
    expect(paramsJson).toContain('"property":"total"');
    expect(paramsJson).not.toContain("result");
  });

  it("accepting a proposal dispatches the reaction and creates the planning Event with the proposal's data", async () => {
    const provider = makeProvider();
    await seedProposal(provider);
    const engine = newEngine(provider);

    const result = await acceptProposal(engine, {
      clientId: "client-aurora",
      proposalNumber: "PROP-2026-042",
      title: "Aurora Gala Dinner",
      total: 7500,
      eventType: "wedding",
    });
    expect(result.ok).toBe(true);

    // THE PROOF: the reaction ran Event.create against the SAME store, so a new
    // Event now exists carrying the proposal's client / number / title / budget.
    const events = (await provider("Event").getAll()) as Record<
      string,
      unknown
    >[];
    expect(events.length).toBe(1);
    const event = events[0]!;
    expect(event.clientId).toBe("client-aurora");
    expect(event.eventNumber).toBe("PROP-2026-042");
    expect(event.title).toBe("Aurora Gala Dinner");
    expect(event.eventType).toBe("wedding");
    expect(Number(event.budget)).toBe(7500);
    expect(event.status).toBe("draft");

    // Secondary proof: the downstream command's own event bubbles up into the
    // parent command's emitted events — only possible if the reaction executed.
    const eventNames = (result.ok ? result.events : [])?.map(
      // biome-ignore lint/suspicious/noExplicitAny: structural event rows.
      (e: any) => e?.name
    );
    // The presence of ProposalAccepted proves the accept transition fired: its
    // guards require status ∈ {sent, viewed}, so the engine loaded the seeded
    // proposal and ran the command before emitting. (Source-entity store
    // write-back is the engine's concern, not this reaction's — the WasteEntry
    // conformance test likewise asserts only the reaction TARGET's state.)
    expect(eventNames).toContain("ProposalAccepted");
    expect(eventNames).toContain("EventCreated");
  });

  it("maps distinct payload values into the event (proves the fields flow through, not hardcodes)", async () => {
    const provider = makeProvider();
    await seedProposal(provider, {
      clientId: "client-zen",
      proposalNumber: "PROP-2026-099",
      title: "Zen Rooftop Mixer",
      eventType: "corporate",
      total: 12_345,
    });
    const engine = newEngine(provider);

    const result = await acceptProposal(engine, {
      clientId: "client-zen",
      proposalNumber: "PROP-2026-099",
      title: "Zen Rooftop Mixer",
      total: 12_345,
      eventType: "corporate",
    });
    expect(result.ok).toBe(true);

    const events = (await provider("Event").getAll()) as Record<
      string,
      unknown
    >[];
    expect(events.length).toBe(1);
    const event = events[0]!;
    expect(event.clientId).toBe("client-zen");
    expect(event.eventNumber).toBe("PROP-2026-099");
    expect(event.title).toBe("Zen Rooftop Mixer");
    expect(event.eventType).toBe("corporate");
    expect(Number(event.budget)).toBe(12_345);
  });
});
