/**
 * Middleware conformance — `LeadConvertedToClient → Deal.create` (IMPLEMENTATION_PLAN P0).
 *
 * WHY this matters (not just WHAT it does): converting a lead to a client is supposed
 * to automatically open a Deal in the sales pipeline so no won lead falls through the
 * cracks. This was a SILENT NO-OP: the old `on LeadConvertedToClient run Deal.create`
 * reaction read `payload.result.companyName/estimatedValue` and resolved
 * `payload.result.id`, but `Lead.convertToClient` is a MUTATE command, so the engine's
 * emitted payload `{ ...commandInput, result }` carries `result` = the last mutate's
 * scalar (`status = "won"`), NOT the Lead instance. Worse, `companyName`/`estimatedValue`
 * are the Lead's OWN fields and are NOT `convertToClient` input params, so NO reaction —
 * even reading `payload.*` — can ever see them (declared event fields are not
 * auto-populated from `self.*`). The fix replaces the dead reaction with middleware that
 * LOADS the converted Lead from the store and dispatches the governed `Deal.create`.
 *
 * The test runs against the REAL compiled IR through the runtime engine WITH the
 * middleware wired (middleware lives in the factory, not the IR), so it FAILS LOUDLY if
 * the propagation regresses — no Deal created, wrong field mapping, or the engine stops
 * dispatching — i.e. it fails when the BUSINESS propagation breaks, not merely on shape
 * change (CLAUDE.md Rule 9; constitution §13). It also regression-locks that the broken
 * reaction did not creep back into the IR.
 *
 * Chain proven here:
 *   Lead.convertToClient(clientId=C)
 *     → emits LeadConvertedToClient (_subject.id = the Lead id)
 *     → middleware loads the Lead, reads companyName/estimatedValue
 *     → dispatches Deal.create(leadId, title=companyName, value=estimatedValue, stage="new")
 *     → a new Deal row is persisted, DealCreated bubbles up into the parent's events.
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { createLeadConvertedDealCreateMiddleware } from "../middleware/lead-converted-deal-create-middleware.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-lead-convert";
// admin satisfies Lead.convertToClient's policy AND the middleware's Deal.create
// dispatch policy so neither the source command nor the downstream is denied.
const USER = { id: "u-lead-convert", tenantId: TENANT, role: "admin" } as const;

const LEAD_ID = "lead-convert-001";

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

/** Build the engine with the Lead→Deal middleware wired (as the factory does). */
function newEngine(provider: (entity: string) => Store): ManifestRuntimeEngine {
  let engine: ManifestRuntimeEngine;
  const middleware = [
    createLeadConvertedDealCreateMiddleware({
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
  // Seed directly via the store (bypassing Lead.create's guards) so the test
  // isolates the convertToClient → middleware chain, not lead creation.
  await provider("Lead").create({
    id: LEAD_ID,
    tenantId: TENANT,
    // `convertToClient` mutates status -> "won", which the Lead state machine
    // only allows from "proposal" (lead-rules.manifest:39). source must be one
    // of website/manual/import (constraint validSource).
    source: "manual",
    companyName: "Aurora Events Co",
    contactName: "Dana Okafor",
    contactEmail: "dana@aurora.example",
    estimatedValue: 42_000,
    status: "proposal",
    assignedTo: "",
    convertedToClientId: "",
    convertedAt: null,
    deletedAt: null,
    ...overrides,
  } as never);
}

async function convertLead(engine: ManifestRuntimeEngine, clientId: string) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "Lead",
      command: "convertToClient",
      body: {
        id: LEAD_ID,
        tenantId: TENANT,
        clientId,
        userId: "agent@example.com",
      },
      user: { ...USER },
    }
  );
}

describe("Middleware conformance: LeadConvertedToClient → Deal.create", () => {
  it("the compiled IR no longer carries the broken Lead→Deal reaction (it is middleware now)", () => {
    const reactions: Record<string, unknown>[] = ir.reactions ?? [];
    const stale = reactions.filter(
      (r) =>
        r.event === "LeadConvertedToClient" &&
        r.targetEntity === "Deal" &&
        r.targetCommand === "create"
    );
    // A regression here means someone re-added the dead `payload.result.*`
    // reaction; the propagation must stay in middleware.
    expect(stale).toHaveLength(0);
  });

  it("converting a lead opens a Deal carrying the lead's company name and estimated value", async () => {
    const provider = makeProvider();
    await seedLead(provider);
    const engine = newEngine(provider);

    const result = await convertLead(engine, "client-from-aurora");
    expect(result.ok).toBe(true);

    // THE PROOF: the middleware ran Deal.create against the SAME store, so a new
    // Deal now exists carrying the lead's own fields.
    const deals = (await provider("Deal").getAll()) as Record<
      string,
      unknown
    >[];
    expect(deals).toHaveLength(1);
    const deal = deals[0]!;
    expect(deal.leadId).toBe(LEAD_ID);
    expect(deal.title).toBe("Aurora Events Co");
    expect(Number(deal.value)).toBe(42_000);
    expect(deal.stage).toBe("new");
    expect(Number(deal.probability)).toBe(25);
    expect(deal.currency).toBe("USD");

    // Secondary proof: the downstream command's own event bubbles up into the
    // parent command's emitted events — only possible if the middleware executed.
    const eventNames = (result.ok ? result.events : [])?.map(
      // biome-ignore lint/suspicious/noExplicitAny: structural event rows.
      (e: any) => e?.name
    );
    expect(eventNames).toContain("LeadConvertedToClient");
    expect(eventNames).toContain("DealCreated");
  });

  it("falls back to the contact name when the lead has no company name", async () => {
    const provider = makeProvider();
    await seedLead(provider, { companyName: "", contactName: "Sam Rivera" });
    const engine = newEngine(provider);

    const result = await convertLead(engine, "client-no-company");
    expect(result.ok).toBe(true);

    const deals = (await provider("Deal").getAll()) as Record<
      string,
      unknown
    >[];
    expect(deals).toHaveLength(1);
    // Deal.create guards `title != ""`; without the fallback the deal would never
    // be created (blank title → guard fails → silent no-op).
    expect(deals[0]!.title).toBe("Sam Rivera");
  });

  it("does not create a second deal when one already exists for the lead (idempotent)", async () => {
    const provider = makeProvider();
    await seedLead(provider);
    // Pre-existing deal for the same lead.
    await provider("Deal").create({
      id: "deal-pre-existing",
      tenantId: TENANT,
      leadId: LEAD_ID,
      title: "Manually created",
      value: 1,
      stage: "qualified",
      status: "open",
    } as never);
    const engine = newEngine(provider);

    const result = await convertLead(engine, "client-dup-guard");
    expect(result.ok).toBe(true);

    const deals = (await provider("Deal").getAll()) as Record<
      string,
      unknown
    >[];
    expect(deals).toHaveLength(1);
    expect(deals[0]!.id).toBe("deal-pre-existing");
  });
});
