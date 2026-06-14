/**
 * Middleware conformance — `ContractSigned → Event.confirm` (IMPLEMENTATION_PLAN P0).
 *
 * WHY this matters (not just WHAT it does): signing an event contract is supposed to
 * automatically confirm the linked event so a signed deal immediately advances the
 * event lifecycle (draft → confirmed), which in turn seeds the prep list and battle
 * board. This was a SILENT NO-OP: the old `on ContractSigned run Event.confirm`
 * reaction did `resolve payload.result.eventId`, but `EventContract.sign` is a MUTATE
 * command, so the engine's emitted payload `{ ...commandInput, result }` carries
 * `result` = the last mutate's scalar (`signedAt = now()`), NOT the contract instance.
 * Worse, the event to confirm is identified by `EventContract.eventId` — the
 * contract's OWN field — and `sign()` takes NO input params, so NO reaction (even one
 * reading `payload.eventId`) can ever see it (declared event fields are not
 * auto-populated from `self.*`). The fix replaces the dead reaction with middleware
 * that LOADS the signed contract from the store, reads `self.eventId`, and dispatches
 * the governed `Event.confirm`.
 *
 * The test runs against the REAL compiled IR through the runtime engine WITH the
 * middleware wired (middleware lives in the factory, not the IR), so it FAILS LOUDLY
 * if the propagation regresses — event never confirmed, wrong target, or the engine
 * stops dispatching — i.e. it fails when the BUSINESS propagation breaks, not merely
 * on a shape change (CLAUDE.md Rule 9; constitution §13). It also regression-locks
 * that the broken reaction did not creep back into the IR.
 *
 * Chain proven here:
 *   EventContract.sign()  (contract in "viewed")
 *     → emits ContractSigned (_subject.id = the contract id)
 *     → middleware loads the contract, reads eventId
 *     → only if the linked Event is still "draft": dispatch Event.confirm(userId)
 *     → the Event row transitions to "confirmed", EventConfirmed bubbles up.
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { createContractSignedEventConfirmMiddleware } from "../middleware/contract-signed-event-confirm-middleware.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-contract-sign";
// admin satisfies EventContract.sign's policy AND the middleware's Event.confirm
// dispatch policy so neither the source command nor the downstream is denied.
const USER = { id: "u-contract-sign", tenantId: TENANT, role: "admin" } as const;

const CONTRACT_ID = "contract-sign-001";
const EVENT_ID = "event-for-contract-001";

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

/** Build the engine with the Contract→Event middleware wired (as the factory does). */
function newEngine(provider: (entity: string) => Store): ManifestRuntimeEngine {
  let engine: ManifestRuntimeEngine;
  const middleware = [
    createContractSignedEventConfirmMiddleware({
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

async function seedEvent(
  provider: (entity: string) => Store,
  overrides: Record<string, unknown> = {}
) {
  // Seed directly via the store so the test isolates the sign → middleware →
  // confirm chain, not event creation. The seed MUST satisfy Event's ENTITY-LEVEL
  // block constraints (validTitle/validEventType/validStatus/positiveGuestCount,
  // event-rules.manifest:61-64) — `updateInstance` re-validates them against the
  // merged row on every mutate and silently no-ops (returns undefined) if any
  // fail, even though the command still emits. Notably `eventType` must be
  // non-empty (in production `Event.create` defaults it to "general"). guestCount
  // > 0 also satisfies the confirm command's `blockNoGuestCount` constraint.
  await provider("Event").create({
    id: EVENT_ID,
    tenantId: TENANT,
    clientId: "client-smith",
    eventNumber: "EV-2026-001",
    title: "Smith Wedding",
    eventType: "wedding",
    status: "draft",
    guestCount: 120,
    accessibilityOptions: [],
    tags: [],
    deletedAt: null,
    ...overrides,
  } as never);
}

async function seedContract(
  provider: (entity: string) => Store,
  overrides: Record<string, unknown> = {}
) {
  // `sign` guards status in {sent, viewed} and the EventContract transition graph
  // only allows signed FROM "viewed" — so seed "viewed".
  await provider("EventContract").create({
    id: CONTRACT_ID,
    tenantId: TENANT,
    eventId: EVENT_ID,
    clientId: "client-smith",
    contractNumber: "EC-2026-001",
    title: "Smith Wedding Contract",
    status: "viewed",
    documentUrl: "https://example.com/contract.pdf",
    deletedAt: null,
    ...overrides,
  } as never);
}

async function signContract(engine: ManifestRuntimeEngine) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "EventContract",
      command: "sign",
      body: { id: CONTRACT_ID, tenantId: TENANT },
      user: { ...USER },
    }
  );
}

describe("Middleware conformance: ContractSigned → Event.confirm", () => {
  it("the compiled IR no longer carries the broken Contract→Event reaction (it is middleware now)", () => {
    const reactions: Record<string, unknown>[] = ir.reactions ?? [];
    const stale = reactions.filter(
      (r) =>
        r.event === "ContractSigned" &&
        r.targetEntity === "Event" &&
        r.targetCommand === "confirm"
    );
    // A regression here means someone re-added the dead `payload.result.*`
    // reaction; the propagation must stay in middleware.
    expect(stale).toHaveLength(0);
  });

  it("signing a contract confirms the linked draft event", async () => {
    const provider = makeProvider();
    await seedEvent(provider);
    await seedContract(provider);
    const engine = newEngine(provider);

    const result = await signContract(engine);
    expect(result.ok).toBe(true);

    // THE PROOF: the middleware ran Event.confirm against the SAME store, so the
    // linked event is now confirmed.
    const eventRow = (await provider("Event").getById(EVENT_ID)) as Record<
      string,
      unknown
    >;
    expect(eventRow.status).toBe("confirmed");

    // Secondary proof: the downstream command's own event bubbles up into the
    // parent command's emitted events — only possible if the middleware executed.
    const eventNames = (result.ok ? result.events : [])?.map(
      // biome-ignore lint/suspicious/noExplicitAny: structural event rows.
      (e: any) => e?.name
    );
    expect(eventNames).toContain("ContractSigned");
    expect(eventNames).toContain("EventConfirmed");
  });

  it("does not re-confirm an event that is already past draft (guard-safe/idempotent)", async () => {
    const provider = makeProvider();
    // Event already confirmed — Event.confirm's `guard self.status == "draft"`
    // would fail; the middleware must SKIP rather than produce a swallowed error.
    await seedEvent(provider, { status: "confirmed" });
    await seedContract(provider);
    const engine = newEngine(provider);

    const result = await signContract(engine);
    expect(result.ok).toBe(true);

    const eventRow = (await provider("Event").getById(EVENT_ID)) as Record<
      string,
      unknown
    >;
    // Untouched — still confirmed, not double-processed into an error state.
    expect(eventRow.status).toBe("confirmed");
  });

  it("confirms nothing when the signed contract has no linked event", async () => {
    const provider = makeProvider();
    await seedEvent(provider);
    await seedContract(provider, { eventId: "" });
    const engine = newEngine(provider);

    const result = await signContract(engine);
    expect(result.ok).toBe(true);

    // The seeded event stays draft — the middleware had no eventId to resolve.
    const eventRow = (await provider("Event").getById(EVENT_ID)) as Record<
      string,
      unknown
    >;
    expect(eventRow.status).toBe("draft");
  });
});
