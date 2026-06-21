/**
 * Middleware conformance — `EventFinalized → ClientInteraction.create`
 * (IMPLEMENTATION_PLAN P1, Event lifecycle → EventFinalized → post-event CRM
 * follow-up leg).
 *
 * WHY this matters (not just WHAT it does): completing an event should leave a
 * closing trace on the client's CRM timeline — the bookend to the booking
 * interaction the sibling `EventCreated → ClientInteraction` middleware logs — so
 * sales has the full lifecycle (booked … completed) without re-entering either
 * fact by hand. A pure `on EventFinalized run ClientInteraction.create` reaction
 * is structurally impossible: the useful interaction needs the event's `clientId`
 * and `title`, which are the Event's OWN fields and never ride the EventFinalized
 * payload (the engine payload is `{ ...commandInput, result }`; declared event
 * fields are never auto-populated from `self.*`). The middleware LOADS the
 * finalized Event via `_subject.id`, attributes the touch to the finalizing user
 * (a real `finalize(userId)` param), and dispatches the governed create.
 *
 * The test runs the REAL compiled IR through the runtime engine WITH the
 * middleware wired (middleware lives in the factory, not the IR), so it FAILS
 * LOUDLY if the propagation regresses — no interaction logged, wrong attribution,
 * the dedup collides with the booking interaction, or the engine stops
 * dispatching (CLAUDE.md Rule 9; constitution §13).
 *
 * Chain proven here:
 *   Event.create(clientId=C, draft) → confirm → finalize(userId=F)
 *     → emits EventFinalized (_subject.id = the Event id)
 *     → middleware loads the Event (clientId/title), employeeId = F
 *     → dispatches ClientInteraction.create(type="note", subject "Event completed: …")
 *     → a ClientInteraction row is persisted, ClientInteractionCreated bubbles up.
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { createEventFinalizedClientInteractionMiddleware } from "../middleware/event-finalized-client-interaction-middleware.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-event-finalize-crm";
// admin satisfies Event.create/confirm/finalize's policy AND
// ClientInteraction.create's policy so neither the source commands nor the
// downstream dispatch is denied.
const USER = { id: "u-booker", tenantId: TENANT, role: "admin" } as const;
// The finalizer id is passed as the finalize(userId) param and is DISTINCT from
// the acting context user, proving attribution flows from the finalize param.
const FINALIZER_ID = "u-closer";

const EVENT_ID = "event-finalize-001";
const CLIENT_ID = "client-borealis";
const EVENT_TITLE = "Borealis Banquet";

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

/** Build the engine with ONLY the EventFinalized→ClientInteraction middleware. */
function newEngine(provider: (entity: string) => Store): ManifestRuntimeEngine {
  let engine: ManifestRuntimeEngine;
  const middleware = [
    createEventFinalizedClientInteractionMiddleware({
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
        id: EVENT_ID,
        tenantId: TENANT,
        title: EVENT_TITLE,
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

async function runEventCommand(
  engine: ManifestRuntimeEngine,
  command: string,
  body: Record<string, unknown>
) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "Event",
      command,
      body: { id: EVENT_ID, tenantId: TENANT, ...body },
      user: { ...USER },
    }
  );
}

/** Drive an event through create(draft) → confirm → finalize(userId=F). */
async function bookConfirmAndFinalize(
  engine: ManifestRuntimeEngine,
  createBody: Record<string, unknown>
) {
  const created = await createEvent(engine, createBody);
  expect(created.ok).toBe(true);
  const confirmed = await runEventCommand(engine, "confirm", {
    userId: USER.id,
  });
  expect(confirmed.ok).toBe(true);
  return runEventCommand(engine, "finalize", { userId: FINALIZER_ID });
}

function interactionsOf(provider: (entity: string) => Store) {
  return provider("ClientInteraction").getAll() as Promise<
    Record<string, unknown>[]
  >;
}

describe("Middleware conformance: EventFinalized → ClientInteraction.create", () => {
  it("the compiled IR carries no EventFinalized→ClientInteraction reaction (it is middleware)", () => {
    const reactions: Record<string, unknown>[] = ir.reactions ?? [];
    const stale = reactions.filter(
      (r) =>
        r.event === "EventFinalized" &&
        r.targetEntity === "ClientInteraction" &&
        r.targetCommand === "create"
    );
    expect(stale).toHaveLength(0);
  });

  it("finalizing an event for a client logs a post-event CRM interaction attributed to the finalizer", async () => {
    const provider = makeProvider();
    const engine = newEngine(provider);

    const result = await bookConfirmAndFinalize(engine, {
      clientId: CLIENT_ID,
    });
    expect(result.ok).toBe(true);

    // THE PROOF: a completion timeline entry now exists for the client.
    const interactions = await interactionsOf(provider);
    expect(interactions).toHaveLength(1);
    const interaction = interactions[0]!;
    expect(interaction.clientId).toBe(CLIENT_ID);
    expect(interaction.tenantId).toBe(TENANT);
    // Attribution: the FINALIZER (finalize userId param), not the booking actor.
    expect(interaction.employeeId).toBe(FINALIZER_ID);
    expect(interaction.interactionType).toBe("note");
    expect(interaction.correlationId).toBe(EVENT_ID);
    // Namespaced completion subject (loaded from the Event's title).
    expect(String(interaction.subject)).toContain("Event completed");
    expect(String(interaction.subject)).toContain(EVENT_TITLE);

    // Secondary proof: the downstream event bubbles into the finalize result.
    const eventNames = (result.ok ? result.events : [])?.map(
      // biome-ignore lint/suspicious/noExplicitAny: structural event rows.
      (e: any) => e?.name
    );
    expect(eventNames).toContain("EventFinalized");
    expect(eventNames).toContain("ClientInteractionCreated");
  });

  it("does not log an interaction for a clientless event", async () => {
    const provider = makeProvider();
    const engine = newEngine(provider);

    const result = await bookConfirmAndFinalize(engine, { clientId: "" });
    expect(result.ok).toBe(true);

    const interactions = await interactionsOf(provider);
    expect(interactions).toHaveLength(0);
  });

  it("coexists with the booking interaction — a 'New event booked' row does NOT suppress the completion log", async () => {
    const provider = makeProvider();
    // Simulate the sibling EventCreated middleware having already logged a
    // booking interaction for THIS event (same correlationId).
    await provider("ClientInteraction").create({
      id: "ci-booking",
      tenantId: TENANT,
      clientId: CLIENT_ID,
      employeeId: USER.id,
      interactionType: "note",
      subject: `New event booked: ${EVENT_TITLE}`,
      correlationId: EVENT_ID,
      status: "open",
    } as never);
    const engine = newEngine(provider);

    const result = await bookConfirmAndFinalize(engine, {
      clientId: CLIENT_ID,
    });
    expect(result.ok).toBe(true);

    // The completion log is namespaced by the "Event completed" subject prefix,
    // so it is NOT deduped against the booking row → both now exist.
    const interactions = await interactionsOf(provider);
    expect(interactions).toHaveLength(2);
    const completion = interactions.find((i) =>
      String(i.subject).startsWith("Event completed")
    );
    expect(completion).toBeDefined();
    expect(completion?.employeeId).toBe(FINALIZER_ID);
  });

  it("does not log a second completion interaction when one already exists (idempotent)", async () => {
    const provider = makeProvider();
    // Pre-existing COMPLETION interaction already correlated to this event.
    await provider("ClientInteraction").create({
      id: "ci-completion-pre",
      tenantId: TENANT,
      clientId: CLIENT_ID,
      employeeId: FINALIZER_ID,
      interactionType: "note",
      subject: `Event completed: ${EVENT_TITLE}`,
      correlationId: EVENT_ID,
      status: "open",
    } as never);
    const engine = newEngine(provider);

    const result = await bookConfirmAndFinalize(engine, {
      clientId: CLIENT_ID,
    });
    expect(result.ok).toBe(true);

    const interactions = await interactionsOf(provider);
    expect(interactions).toHaveLength(1);
    expect(interactions[0]!.id).toBe("ci-completion-pre");
  });
});
