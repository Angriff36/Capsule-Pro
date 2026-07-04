/**
 * Middleware conformance — EventContract.sign blocked when its Event is no longer
 * active (IMPLEMENTATION_PLAN P2 "cross-entity constraints":
 * EventContract.eventMustBeActive).
 *
 * WHY this matters (not just WHAT it does): signing a binding contract for an
 * event that has already run (completed/archived) or been called off (cancelled)
 * is a correctness bug — the contract commits the client to an engagement that no
 * longer exists. `EventContract.sign`'s own guards only check the contract's own
 * status FSM (sent/viewed → signed). The rule "the event must still be active" is
 * a CROSS-ENTITY precondition that depends on the linked `Event`'s lifecycle
 * status. The Manifest DSL CANNOT express it as a constraint/guard: those
 * expressions see only `self.*`, `user.*`, `context.*`, and command params —
 * never another entity's live state — and here the link (`eventId`) is the
 * EventContract's OWN field, not a `sign` param (sign takes none), so it is a
 * two-hop derivation (EventContract -> Event). The only faithful mechanism is a
 * `before-guard` runtime middleware that loads the Event and short-circuits the
 * command. "Active" mirrors Event's own `computed isActive = status == "draft" or
 * "confirmed"`; the inactive set is {completed, archived, cancelled}.
 *
 * These tests drive the REAL EventContract.sign command through the runtime engine
 * WITH the middleware wired, so they FAIL LOUDLY if the guard regresses — an
 * inactive event slipping through, or (the inverse failure) the middleware
 * over-reaching and blocking a legitimate active-event sign, an eventless sign,
 * or a different command (CLAUDE.md Rule 9; constitution §13).
 *
 * NOTE on the contract FSM: `signed` is reachable ONLY from `viewed`
 * (event-contract-rules.manifest: `transition status from "viewed" to ["signed",
 * …]`), so the sign-path fixtures seed the contract as `viewed` to isolate THIS
 * guard as the thing under test.
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { createEventContractEventActiveGuardMiddleware } from "../middleware/event-contract-event-active-guard-middleware.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-event-contract-active";
// admin satisfies the EventContract default policy.
const USER = { id: "u-contract", tenantId: TENANT, role: "admin" } as const;

const CONTRACT = "contract-event-active-guard";
const EVENT = "event-active-guard";
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
    createEventContractEventActiveGuardMiddleware({
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

async function seedEvent(provider: (entity: string) => Store, status: string) {
  await provider("Event").create({
    id: EVENT,
    tenantId: TENANT,
    title: "Borealis Banquet",
    eventType: "general",
    status,
  } as never);
}

// A `viewed` contract so the sign FSM transition (viewed → signed) is legal,
// isolating the event-active guard as the thing under test. `eventId` defaults
// to the seeded EVENT but can be overridden (e.g. "" for the eventless case).
async function seedContract(
  provider: (entity: string) => Store,
  eventId: string = EVENT
) {
  await provider("EventContract").create({
    id: CONTRACT,
    tenantId: TENANT,
    eventId,
    clientId: CLIENT,
    contractNumber: "CON-1",
    title: "Catering Agreement",
    status: "viewed",
    documentUrl: "https://example.test/contract.pdf",
  } as never);
}

function runSign(engine: ManifestRuntimeEngine) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "EventContract",
      command: "sign",
      body: { id: CONTRACT, tenantId: TENANT },
      user: { ...USER },
    }
  );
}

describe("Middleware conformance: EventContract.sign requires an active Event", () => {
  it("BLOCKS sign when the linked event is completed", async () => {
    const provider = makeProvider();
    await seedEvent(provider, "completed");
    await seedContract(provider);
    const engine = newEngine(provider);

    const result = await runSign(engine);

    // The short-circuit returns success:false; the sign never runs.
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("no longer active");
    }
  });

  it("BLOCKS sign when the linked event is cancelled", async () => {
    const provider = makeProvider();
    await seedEvent(provider, "cancelled");
    await seedContract(provider);
    const engine = newEngine(provider);

    const result = await runSign(engine);

    expect(result.ok).toBe(false);
  });

  it("BLOCKS sign when the linked event is archived", async () => {
    const provider = makeProvider();
    await seedEvent(provider, "archived");
    await seedContract(provider);
    const engine = newEngine(provider);

    const result = await runSign(engine);

    expect(result.ok).toBe(false);
  });

  it("ALLOWS sign when the linked event is confirmed (active)", async () => {
    const provider = makeProvider();
    await seedEvent(provider, "confirmed");
    await seedContract(provider);
    const engine = newEngine(provider);

    const result = await runSign(engine);

    expect(result.ok).toBe(true);
  });

  it("ALLOWS sign when the linked event is still a draft (active)", async () => {
    const provider = makeProvider();
    await seedEvent(provider, "draft");
    await seedContract(provider);
    const engine = newEngine(provider);

    const result = await runSign(engine);

    expect(result.ok).toBe(true);
  });

  it("ALLOWS sign for an eventless contract (no event to be inactive)", async () => {
    const provider = makeProvider();
    // No Event row at all; the contract carries an empty eventId.
    await seedContract(provider, "");
    const engine = newEngine(provider);

    const result = await runSign(engine);

    expect(result.ok).toBe(true);
  });

  it("does NOT block a DIFFERENT command (markViewed) for an inactive event", async () => {
    const provider = makeProvider();
    await seedEvent(provider, "cancelled");
    // A `sent` contract — markViewed is a routing transition that must not be
    // blocked just because the event was later cancelled (only `sign` is gated).
    await provider("EventContract").create({
      id: CONTRACT,
      tenantId: TENANT,
      eventId: EVENT,
      clientId: CLIENT,
      contractNumber: "CON-1",
      title: "Catering Agreement",
      status: "sent",
      documentUrl: "https://example.test/contract.pdf",
    } as never);
    const engine = newEngine(provider);

    const result = await runManifestCommandCore(
      { createRuntime: async () => engine },
      {
        entity: "EventContract",
        command: "markViewed",
        body: { id: CONTRACT, tenantId: TENANT },
        user: { ...USER },
      }
    );

    expect(result.ok).toBe(true);
  });
});
