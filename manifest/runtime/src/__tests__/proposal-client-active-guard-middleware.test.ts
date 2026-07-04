/**
 * Middleware conformance — Proposal.send blocked when its Client is archived
 * (IMPLEMENTATION_PLAN P2 "cross-entity constraints": Proposal.clientMustBeActive).
 *
 * WHY this matters (not just WHAT it does): sending a proposal to an archived
 * (soft-deleted) client is a correctness bug — the customer relationship has been
 * closed, but `Proposal.send`'s own guards only check the proposal's own status
 * and deletion. The rule "the client must be active" is a CROSS-ENTITY
 * precondition that depends on the linked `Client`'s archived state. The Manifest
 * DSL CANNOT express it as a constraint/guard: those expressions see only
 * `self.*`, `user.*`, `context.*`, and command params — never another entity's
 * live state — and here the link (`clientId`) is the Proposal's OWN field, not
 * even a `send` param, so it is a two-hop derivation (Proposal -> Client). The
 * only faithful mechanism is a `before-guard` runtime middleware that loads the
 * Client and short-circuits the command. Client has no `status` field — archived
 * IS the soft-delete tombstone (`archive` sets `deletedAt`, `reactivate` clears
 * it), so "active" == `deletedAt == null`.
 *
 * These tests drive the REAL Proposal.send command through the runtime engine
 * WITH the middleware wired, so they FAIL LOUDLY if the guard regresses — an
 * archived client slipping through, or (the inverse failure) the middleware
 * over-reaching and blocking a legitimate active-client send, a clientless send,
 * or a different command (CLAUDE.md Rule 9; constitution §13).
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { createProposalClientActiveGuardMiddleware } from "../middleware/proposal-client-active-guard-middleware.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-proposal-client-active";
// admin satisfies the Proposal default policy.
const USER = { id: "u-proposal", tenantId: TENANT, role: "admin" } as const;

const PROPOSAL = "prop-client-active-guard";
const CLIENT = "client-active-guard";

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
  const middleware = [
    createProposalClientActiveGuardMiddleware({
      storeProvider: provider,
      onDiagnostic: () => {
        /* no-op in tests */
      },
    }),
  ];
  return new ManifestRuntimeEngine(
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
}

async function seedClient(
  provider: (entity: string) => Store,
  extra: Record<string, unknown> = {}
) {
  await provider("Client").create({
    id: CLIENT,
    tenantId: TENANT,
    clientType: "company",
    companyName: "Acme Co",
    tags: [],
    taxExempt: false,
    ...extra,
  } as never);
}

// A draft proposal with one line item so the send-gate `blockNoLineItems`
// (lineItemCount > 0) passes — isolating the active-guard as the thing under test.
async function seedProposal(
  provider: (entity: string) => Store,
  clientId: string
) {
  await provider("Proposal").create({
    id: PROPOSAL,
    tenantId: TENANT,
    proposalNumber: "PROP-1",
    clientId,
    title: "Spring Gala",
    status: "draft",
    lineItemCount: 1,
    subtotal: 100,
    total: 100,
    taxRate: 0,
  } as never);
}

function runSend(engine: ManifestRuntimeEngine) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "Proposal",
      command: "send",
      body: { id: PROPOSAL, tenantId: TENANT, userId: USER.id },
      user: { ...USER },
    }
  );
}

describe("Middleware conformance: Proposal.send requires an active Client", () => {
  it("BLOCKS send when the linked client is archived (deletedAt set)", async () => {
    const provider = makeProvider();
    await seedClient(provider, { deletedAt: new Date().toISOString() });
    await seedProposal(provider, CLIENT);
    const engine = newEngine(provider);

    const result = await runSend(engine);

    // The short-circuit returns success:false; the send never runs.
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("archived");
    }
  });

  it("ALLOWS send when the linked client is active (not archived)", async () => {
    const provider = makeProvider();
    await seedClient(provider);
    await seedProposal(provider, CLIENT);
    const engine = newEngine(provider);

    const result = await runSend(engine);

    expect(result.ok).toBe(true);
  });

  it("ALLOWS send for a clientless proposal (no client to be archived)", async () => {
    const provider = makeProvider();
    // No Client row at all; proposal carries an empty clientId.
    await seedProposal(provider, "");
    const engine = newEngine(provider);

    const result = await runSend(engine);

    expect(result.ok).toBe(true);
  });

  it("does NOT block a DIFFERENT command (markViewed) for an archived client", async () => {
    const provider = makeProvider();
    await seedClient(provider, { deletedAt: new Date().toISOString() });
    // Proposal already sent — markViewed is a client-driven transition that must
    // not be blocked just because the client was later archived.
    await provider("Proposal").create({
      id: PROPOSAL,
      tenantId: TENANT,
      proposalNumber: "PROP-1",
      clientId: CLIENT,
      title: "Spring Gala",
      status: "sent",
      lineItemCount: 1,
      subtotal: 100,
      total: 100,
      taxRate: 0,
    } as never);
    const engine = newEngine(provider);

    const result = await runManifestCommandCore(
      { createRuntime: async () => engine },
      {
        entity: "Proposal",
        command: "markViewed",
        body: { id: PROPOSAL, tenantId: TENANT, viewedByInfo: "browser" },
        user: { ...USER },
      }
    );

    expect(result.ok).toBe(true);
  });
});
