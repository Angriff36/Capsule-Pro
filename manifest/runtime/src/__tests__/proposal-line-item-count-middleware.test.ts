/**
 * Middleware conformance — ProposalLineItem → Proposal.lineItemCount
 * (IMPLEMENTATION_PLAN P1, the "proposals cannot be sent" deadlock).
 *
 * WHY this matters (not just WHAT it does): a proposal could NEVER be sent. Two
 * compounding defects produced the deadlock:
 *   1. `Proposal.create` set `lineItemCount = 0` and nothing ever changed it —
 *      `ProposalLineItem.create` emitted `ProposalLineItemCreated` but no
 *      reaction/middleware/command incremented the parent's count.
 *   2. `Proposal.send`'s gate `constraint blockNoLineItems:block self.hasLineItems`
 *      referenced a COMPUTED (`hasLineItems = self.lineItemCount > 0`), and the
 *      runtime does NOT resolve computeds inside :block/:warn constraints (only
 *      inside guards). Verified 2026-06-14: the gate blocked even at
 *      lineItemCount=2. So the gate failed EVERY send regardless of line items.
 *
 * The fix inlines the gate to the stored prop (`self.lineItemCount > 0`) and adds
 * this middleware to keep that stored count truthful. It is MIDDLEWARE not a
 * reaction because the parent `proposalId` is the line item's OWN field: it rides
 * the payload on `create` (an input param) but NOT on `remove` (`remove(userId)`
 * takes no proposalId, and declared event fields are never auto-populated from
 * `self.*`) — so a `resolve payload.proposalId` reaction would silently no-op on
 * the remove leg (the exact P0 no-op class).
 *
 * Tests run against the REAL compiled IR through the runtime engine WITH the
 * middleware wired, so they fail LOUDLY when the BUSINESS propagation breaks —
 * not merely on shape change (CLAUDE.md Rule 9; constitution §13).
 *
 * Chain proven here:
 *   ProposalLineItem.create(proposalId=P) → emits ProposalLineItemCreated
 *     → middleware dispatches Proposal.incrementLineItemCount → P.lineItemCount++
 *   …then Proposal.send(P) succeeds (gate `self.lineItemCount > 0` now passes).
 *   ProposalLineItem.remove → middleware dispatches decrementLineItemCount.
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { createProposalLineItemCountMiddleware } from "../middleware/proposal-line-item-count-middleware.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-proposal-count";
const USER = { id: "u-proposal-count", tenantId: TENANT, role: "admin" } as const;

class Mem implements Store {
  private readonly items = new Map<string, Record<string, unknown>>();
  // biome-ignore lint/suspicious/noExplicitAny: rows.
  async getAll(): Promise<any[]> {
    return Array.from(this.items.values()) as never;
  }
  // biome-ignore lint/suspicious/noExplicitAny: rows.
  async getById(id: string): Promise<any> {
    return this.items.get(id) as never;
  }
  // biome-ignore lint/suspicious/noExplicitAny: rows.
  async create(data: any): Promise<any> {
    const id = (data.id as string) ?? crypto.randomUUID();
    const row = { ...data, id };
    this.items.set(id, row);
    return row as never;
  }
  // biome-ignore lint/suspicious/noExplicitAny: rows.
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

/** Build the engine with the line-item-count middleware wired (as the factory does). */
function newEngine(provider: (entity: string) => Store): ManifestRuntimeEngine {
  let engine: ManifestRuntimeEngine;
  const middleware = [
    createProposalLineItemCountMiddleware({
      storeProvider: provider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
      onDiagnostic: () => {
        /* silence in tests */
      },
    }),
  ];
  engine = new ManifestRuntimeEngine(
    ir,
    { tenantId: USER.tenantId, user: { ...USER } },
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

/** Seed a valid draft Proposal directly via the store (isolates the line-item chain). */
async function seedProposal(
  provider: (entity: string) => Store,
  id = "prop-1"
): Promise<string> {
  await provider("Proposal").create({
    id,
    tenantId: TENANT,
    proposalNumber: "P-0001",
    clientId: "c-1",
    leadId: "",
    eventId: "",
    title: "Spring Gala Proposal",
    eventType: "",
    guestCount: 0,
    subtotal: 0,
    taxRate: 0,
    taxAmount: 0,
    discountAmount: 0,
    total: 0,
    status: "draft",
    notes: "",
    termsAndConditions: "",
    lineItemCount: 0,
    publicToken: "",
    deletedAt: null,
  } as never);
  return id;
}

let lineSeq = 0;
async function addLineItem(
  engine: ManifestRuntimeEngine,
  proposalId: string,
  description: string
) {
  lineSeq += 1;
  const id = `line-${lineSeq}`;
  const res = await runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "ProposalLineItem",
      command: "create",
      body: {
        id,
        tenantId: TENANT,
        proposalId,
        itemType: "service",
        category: "catering",
        description,
        quantity: 1,
        unitOfMeasure: "each",
        unitPrice: 100,
        sortOrder: 0,
        notes: "",
      },
      user: { ...USER },
    }
  );
  return { id, res };
}

function send(engine: ManifestRuntimeEngine, proposalId: string) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "Proposal",
      command: "send",
      body: { id: proposalId, tenantId: TENANT, userId: USER.id },
      user: { ...USER },
    }
  );
}

const countOf = async (
  provider: (entity: string) => Store,
  proposalId: string
): Promise<number> => {
  const row = (await provider("Proposal").getById(proposalId)) as
    | { lineItemCount?: unknown }
    | undefined;
  return Number(row?.lineItemCount ?? -1);
};

// biome-ignore lint/suspicious/noExplicitAny: structural self.<prop> walk.
function selfProps(expr: any, acc = new Set<string>()): Set<string> {
  if (!expr || typeof expr !== "object") {
    return acc;
  }
  if (
    expr.kind === "member" &&
    expr.object?.kind === "identifier" &&
    expr.object?.name === "self" &&
    typeof expr.property === "string"
  ) {
    acc.add(expr.property);
  }
  for (const value of Object.values(expr)) {
    if (Array.isArray(value)) {
      for (const v of value) {
        selfProps(v, acc);
      }
    } else if (value && typeof value === "object") {
      selfProps(value, acc);
    }
  }
  return acc;
}

describe("Middleware conformance: ProposalLineItem → Proposal.lineItemCount", () => {
  it("the send-gate references the STORED lineItemCount, not the hasLineItems computed (regression lock)", () => {
    const send = (ir.commands ?? []).find(
      (c: { entity?: string; name?: string }) =>
        c?.entity === "Proposal" && c?.name === "send"
    );
    expect(send).toBeDefined();
    const gate = (send.constraints ?? []).find(
      (c: { name: string }) => c.name === "blockNoLineItems"
    );
    expect(gate).toBeDefined();
    const refs = selfProps(gate.expression);
    // The runtime does not resolve computeds in constraints — the gate MUST read
    // the stored prop, never the `hasLineItems` computed (else send is dead again).
    expect(refs.has("lineItemCount")).toBe(true);
    expect(refs.has("hasLineItems")).toBe(false);
  });

  it("NO Proposal command guard or constraint references a computed (they are dead at runtime)", () => {
    // The runtime resolves ONLY stored props inside guards/:block/:warn — every
    // `self.<computed>` operand silently evaluates to undefined, so the rule is
    // dead. This locks the whole Proposal FSM (update/send/accept/withdraw) against
    // re-introducing a computed-referencing guard/constraint. (Verified 2026-06-14:
    // `guard self.isDraft` failed even on a draft proposal; markViewed's stored
    // `self.status == "sent"` guard passed.)
    const proposal = (ir.entities ?? []).find(
      (e: { name: string }) => e.name === "Proposal"
    );
    expect(proposal).toBeDefined();
    const computedNames = new Set<string>(
      (proposal.computedProperties ?? []).map((c: { name: string }) => c.name)
    );
    expect(computedNames.size).toBeGreaterThan(0);

    const proposalCommands = (ir.commands ?? []).filter(
      (c: { entity?: string }) => c?.entity === "Proposal"
    );
    const offenders: string[] = [];
    for (const cmd of proposalCommands) {
      // biome-ignore lint/suspicious/noExplicitAny: structural IR walk.
      const exprs: any[] = [
        ...(cmd.guards ?? []).map((g: { expression?: unknown }) => g.expression),
        ...(cmd.constraints ?? []).map(
          (c: { expression?: unknown }) => c.expression
        ),
      ];
      for (const expr of exprs) {
        for (const ref of selfProps(expr)) {
          if (computedNames.has(ref)) {
            offenders.push(`${cmd.name}: self.${ref}`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("Proposal.update enforces draft via a STORED-prop guard (was a dead computed guard)", async () => {
    const provider = makeProvider();
    const id = await seedProposal(provider, "prop-upd");
    const updated = await runManifestCommandCore(
      { createRuntime: async () => newEngine(provider) },
      {
        entity: "Proposal",
        command: "update",
        body: {
          id,
          tenantId: TENANT,
          title: "Renamed Proposal",
          eventDate: null,
          eventType: "",
          guestCount: 0,
          venueName: "",
          venueAddress: "",
          subtotal: 0,
          taxRate: 0,
          taxAmount: 0,
          discountAmount: 0,
          total: 0,
          validUntil: null,
          notes: "",
          termsAndConditions: "",
        },
        user: { ...USER },
      }
    );
    expect(updated.ok).toBe(true);
    const row = (await provider("Proposal").getById(id)) as { title?: unknown };
    expect(row.title).toBe("Renamed Proposal");
  });

  it("the count propagation is middleware, not a reaction (no Proposal increment/decrement reaction in IR)", () => {
    const reactions: Record<string, unknown>[] = ir.reactions ?? [];
    const stale = reactions.filter(
      (r) =>
        r.targetEntity === "Proposal" &&
        (r.targetCommand === "incrementLineItemCount" ||
          r.targetCommand === "decrementLineItemCount")
    );
    expect(stale).toHaveLength(0);
  });

  it("the increment/decrement commands exist on Proposal", () => {
    for (const name of ["incrementLineItemCount", "decrementLineItemCount"]) {
      const cmd = (ir.commands ?? []).find(
        (c: { entity?: string; name?: string }) =>
          c?.entity === "Proposal" && c?.name === name
      );
      expect(cmd, `Proposal.${name} must exist`).toBeDefined();
    }
  });

  it("THE GATE FIX: a proposal with a stored lineItemCount of 0 is blocked, but > 0 sends", async () => {
    // A proposal presents to the `send` request exactly as a stored row (the engine
    // loads it fresh from the store per request). Seeding the stored `lineItemCount`
    // directly is therefore the faithful shape of a real persisted proposal.

    // count 0 → blocked by the (now live) gate.
    const blockedProvider = makeProvider();
    const blockedId = await seedProposal(blockedProvider, "prop-blocked");
    const blocked = await send(newEngine(blockedProvider), blockedId);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.kind).toBe("constraint_blocked");
    }

    // count 2 → the gate passes (it was DEAD before: read the `hasLineItems`
    // computed, which the runtime cannot resolve inside a constraint, so it blocked
    // EVERY send). The proposal now actually sends.
    const okProvider = makeProvider();
    const okId = await seedProposal(okProvider, "prop-ok");
    await okProvider("Proposal").update("prop-ok", { lineItemCount: 2 } as never);
    const sent = await send(newEngine(okProvider), okId);
    expect(sent.ok).toBe(true);
    const proposal = (await okProvider("Proposal").getById(okId)) as {
      status?: unknown;
    };
    expect(proposal.status).toBe("sent");
  });

  it("THE PROPAGATION: adding line items increments the stored count, removing decrements", async () => {
    const provider = makeProvider();
    const id = await seedProposal(provider);
    const engine = newEngine(provider);

    // Add two line items through the governed command — the middleware bumps the
    // parent's stored count (previously frozen at 0 → the deadlock's other half).
    const a = await addLineItem(engine, id, "Plated dinner");
    expect(a.res.ok).toBe(true);
    expect(await countOf(provider, id)).toBe(1);

    const b = await addLineItem(engine, id, "Bar service");
    expect(b.res.ok).toBe(true);
    expect(await countOf(provider, id)).toBe(2);

    // Secondary proof the dispatch happened: the increment command's event bubbles
    // up into the parent line-item command's emitted events.
    const names = (a.res.ok ? (a.res.events ?? []) : []).map(
      // biome-ignore lint/suspicious/noExplicitAny: structural event rows.
      (e: any) => e?.name
    );
    expect(names).toContain("ProposalLineItemCreated");
    expect(names).toContain("ProposalLineItemCountChanged");

    // Removing a line item decrements the count back down. `remove` carries no
    // proposalId param — the middleware must load the line item to resolve it.
    const removed = await runManifestCommandCore(
      { createRuntime: async () => engine },
      {
        entity: "ProposalLineItem",
        command: "remove",
        body: { id: a.id, tenantId: TENANT, userId: USER.id },
        user: { ...USER },
      }
    );
    expect(removed.ok).toBe(true);
    expect(await countOf(provider, id)).toBe(1);
  });

  it("decrement never drives the count below zero", async () => {
    const provider = makeProvider();
    const id = await seedProposal(provider);
    const engine = newEngine(provider);

    // Drive a decrement directly against a count-0 proposal (defensive floor).
    const res = await engine.runCommand(
      "decrementLineItemCount",
      { id, tenantId: TENANT },
      { entityName: "Proposal", instanceId: id }
    );
    expect(res.success).toBe(true);
    expect(await countOf(provider, id)).toBe(0);
  });
});
