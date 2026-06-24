/**
 * Middleware conformance — `EventCreated → ClientInteraction.create`
 * (IMPLEMENTATION_PLAN P1, Event lifecycle → CRM activity).
 *
 * WHY this matters (not just WHAT it does): booking an event for a client should
 * leave a trace on that client's CRM timeline so sales has a single, complete
 * activity history without re-entering the fact by hand. The plan first scoped
 * this as a pure `on EventCreated run ClientInteraction.create` reaction, but that
 * is structurally impossible: `ClientInteraction.create` REQUIRES a non-empty
 * `employeeId` (a command `guard` AND the entity-level `validEmployeeId` block
 * constraint), and `EventCreated` carries no creator field — `Event.create` has no
 * `userId`/`createdBy` param and declared event fields are never auto-populated
 * from `self.*`, so a reaction's `payload.employeeId` is always `undefined` and the
 * create guard could never pass. The middleware sources the employee from the
 * acting user (who booked the event) and dispatches the governed create.
 *
 * The test runs the REAL compiled IR through the runtime engine WITH the middleware
 * wired (middleware lives in the factory, not the IR), so it FAILS LOUDLY if the
 * propagation regresses — no interaction logged, wrong attribution, or the engine
 * stops dispatching — i.e. it fails when the BUSINESS propagation breaks, not on a
 * mere shape change (CLAUDE.md Rule 9; constitution §13).
 *
 * Chain proven here:
 *   Event.create(clientId=C)  (actor = the acting user)
 *     → emits EventCreated (_subject.id = the new Event id)
 *     → middleware reads clientId/title off the payload, employeeId from context
 *     → dispatches ClientInteraction.create(clientId=C, employeeId=actor, type="note")
 *     → a ClientInteraction row is persisted, ClientInteractionCreated bubbles up.
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { createEventCreatedClientInteractionMiddleware } from "../middleware/event-created-client-interaction-middleware.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-event-crm";
// admin satisfies BOTH Event.create's policy AND ClientInteraction.create's
// policy (user.role in [sales, sales_rep, sales_manager, manager, admin]) so
// neither the source command nor the downstream dispatch is denied.
const USER = { id: "u-booker", tenantId: TENANT, role: "admin" } as const;

const EVENT_ID = "event-crm-001";
const CLIENT_ID = "client-aurora";

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

/** Build the engine with the EventCreated→ClientInteraction middleware wired. */
function newEngine(provider: (entity: string) => Store): ManifestRuntimeEngine {
  let engine: ManifestRuntimeEngine;
  const middleware = [
    createEventCreatedClientInteractionMiddleware({
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

async function createEvent(
  engine: ManifestRuntimeEngine,
  body: Record<string, unknown>
) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "Event",
      command: "create",
      body: {
        // Event.create defaults eventType→"general" etc., but supply the
        // block-constrained fields explicitly so the create-bootstrap passes.
        id: EVENT_ID,
        tenantId: TENANT,
        title: "Aurora Gala",
        eventType: "general",
        eventDate: Date.now(),
        guestCount: 1,
        status: "draft",
        ...body,
      },
      user: { ...USER },
    }
  );
}

function interactionsOf(provider: (entity: string) => Store) {
  return provider("ClientInteraction").getAll() as Promise<
    Record<string, unknown>[]
  >;
}

describe("Middleware conformance: EventCreated → ClientInteraction.create", () => {
  it("the compiled IR carries no EventCreated→ClientInteraction reaction (it is middleware)", () => {
    const reactions: Record<string, unknown>[] = ir.reactions ?? [];
    const stale = reactions.filter(
      (r) =>
        r.event === "EventCreated" &&
        r.targetEntity === "ClientInteraction" &&
        r.targetCommand === "create"
    );
    // A regression here means someone added the structurally-impossible reaction
    // (it could never satisfy ClientInteraction.create's employeeId guard).
    expect(stale).toHaveLength(0);
  });

  it("booking an event for a client logs a CRM interaction attributed to the actor", async () => {
    const provider = makeProvider();
    const engine = newEngine(provider);

    const result = await createEvent(engine, { clientId: CLIENT_ID });
    expect(result.ok).toBe(true);

    // THE PROOF: the middleware ran ClientInteraction.create against the SAME
    // store, so a timeline entry now exists for the client.
    const interactions = await interactionsOf(provider);
    expect(interactions).toHaveLength(1);
    const interaction = interactions[0]!;
    expect(interaction).toBeDefined();
    expect(interaction.clientId).toBe(CLIENT_ID);
    expect(interaction.tenantId).toBe(TENANT);
    // Attribution: the employee is the acting user who booked the event.
    expect(interaction.employeeId).toBe(USER.id);
    expect(interaction.interactionType).toBe("note");
    // Correlated to the event so it dedupes and is traceable back to the booking.
    expect(interaction.correlationId).toBe(EVENT_ID);
    expect(String(interaction.subject)).toContain("Aurora Gala");

    // Secondary proof: the downstream command's own event bubbles up into the
    // parent command's emitted events — only possible if the middleware executed.
    const eventNames = (result.ok ? result.events : [])?.map(
      // biome-ignore lint/suspicious/noExplicitAny: structural event rows.
      (e: any) => e?.name
    );
    expect(eventNames).toContain("EventCreated");
    expect(eventNames).toContain("ClientInteractionCreated");
  });

  it("does not log an interaction for a clientless event", async () => {
    const provider = makeProvider();
    const engine = newEngine(provider);

    // clientId defaults to "" on Event; a clientless booking has no CRM client.
    const result = await createEvent(engine, { clientId: "" });
    expect(result.ok).toBe(true);

    const interactions = await interactionsOf(provider);
    expect(interactions).toHaveLength(0);
  });

  it("does not log a second interaction when one already exists for the event (idempotent)", async () => {
    const provider = makeProvider();
    // Pre-existing interaction already correlated to this event.
    await provider("ClientInteraction").create({
      id: "ci-pre-existing",
      tenantId: TENANT,
      clientId: CLIENT_ID,
      employeeId: USER.id,
      interactionType: "note",
      subject: "Manually logged",
      correlationId: EVENT_ID,
      status: "open",
    } as never);
    const engine = newEngine(provider);

    const result = await createEvent(engine, { clientId: CLIENT_ID });
    expect(result.ok).toBe(true);

    const interactions = await interactionsOf(provider);
    expect(interactions).toHaveLength(1);
    expect(interactions[0]!.id).toBe("ci-pre-existing");
  });
});
