/**
 * Middleware conformance — `EventFinalized → EventFollowup.create`
 * (IMPLEMENTATION_PLAN P1, Event lifecycle → EventFinalized → finance/inventory/
 * followup — the post-event `EventFollowup` leg).
 *
 * WHY this matters (not just WHAT it does): completing an event should open an
 * ACTIONABLE close-out task (thank-you, review request, final reconciliation) so
 * the work lands on someone's list instead of relying on memory. `EventFollowup`
 * existed in the IR but had ZERO producers — finalizing an event created nothing.
 * This is the action-item counterpart of the passive `EventFinalized →
 * ClientInteraction` CRM note (sibling middleware). A pure
 * `on EventFinalized run EventFollowup.create` reaction is structurally
 * impossible: `EventFollowup.create` needs `eventId` in the body, but
 * `EventFinalized` never populates it (the engine payload is
 * `{ ...commandInput, result }` and `finalize(userId)` carries only `userId`), and
 * the description is enriched with the Event's `title` (its OWN field). The
 * middleware reads the event id from `_subject.id`, LOADS the Event for the title,
 * attributes the task to the finalizing user, and dispatches the governed create.
 *
 * The test runs the REAL compiled IR through the runtime engine WITH the
 * middleware wired (middleware lives in the factory, not the IR), so it FAILS
 * LOUDLY if the propagation regresses — no follow-up opened, wrong attribution,
 * the dedup duplicates or collides with a manual follow-up, or the engine stops
 * dispatching (CLAUDE.md Rule 9; constitution §13).
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { createEventFinalizedFollowupCreateMiddleware } from "../middleware/event-finalized-followup-create-middleware.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-event-finalize-followup";
// admin satisfies Event.create/confirm/finalize's policy AND EventFollowup.create's
// policy so neither the source commands nor the downstream dispatch is denied.
const USER = { id: "u-booker", tenantId: TENANT, role: "admin" } as const;
// The finalizer id is the finalize(userId) param, DISTINCT from the acting context
// user, proving the follow-up is assigned from the finalize param.
const FINALIZER_ID = "u-closer";

const EVENT_ID = "event-finalize-followup-001";
const EVENT_TITLE = "Borealis Banquet";
const AUTO_TYPE = "post_event_followup";

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

/** Build the engine with ONLY the EventFinalized→EventFollowup middleware. */
function newEngine(provider: (entity: string) => Store): ManifestRuntimeEngine {
  let engine: ManifestRuntimeEngine;
  const middleware = [
    createEventFinalizedFollowupCreateMiddleware({
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
  createBody: Record<string, unknown> = {}
) {
  const created = await createEvent(engine, createBody);
  expect(created.ok).toBe(true);
  const confirmed = await runEventCommand(engine, "confirm", {
    userId: USER.id,
  });
  expect(confirmed.ok).toBe(true);
  return runEventCommand(engine, "finalize", { userId: FINALIZER_ID });
}

function followupsOf(provider: (entity: string) => Store) {
  return provider("EventFollowup").getAll() as Promise<
    Record<string, unknown>[]
  >;
}

describe("Middleware conformance: EventFinalized → EventFollowup.create", () => {
  it("the compiled IR carries no EventFinalized→EventFollowup reaction (it is middleware)", () => {
    const reactions: Record<string, unknown>[] = ir.reactions ?? [];
    const stale = reactions.filter(
      (r) =>
        r.event === "EventFinalized" &&
        r.targetEntity === "EventFollowup" &&
        r.targetCommand === "create"
    );
    expect(stale).toHaveLength(0);
  });

  it("finalizing an event opens a post-event follow-up task assigned to the finalizer", async () => {
    const provider = makeProvider();
    const engine = newEngine(provider);

    const result = await bookConfirmAndFinalize(engine);
    expect(result.ok).toBe(true);

    // THE PROOF: a post-event follow-up task now exists for the event.
    const followups = await followupsOf(provider);
    expect(followups).toHaveLength(1);
    const followup = followups[0]!;
    expect(followup.eventId).toBe(EVENT_ID);
    expect(followup.tenantId).toBe(TENANT);
    expect(followup.taskType).toBe(AUTO_TYPE);
    // Assignment: the FINALIZER (finalize userId param), not the booking actor.
    expect(followup.assignedTo).toBe(FINALIZER_ID);
    // Description enriched with the event's title (loaded from the Event row).
    expect(String(followup.description)).toContain(EVENT_TITLE);
    // A due date inside the close-out window was stamped.
    expect(typeof followup.dueDate).toBe("number");
    expect(followup.dueDate as number).toBeGreaterThan(0);

    // Secondary proof: the downstream event bubbles into the finalize result.
    const eventNames = (result.ok ? result.events : [])?.map(
      // biome-ignore lint/suspicious/noExplicitAny: structural event rows.
      (e: any) => e?.name
    );
    expect(eventNames).toContain("EventFinalized");
    expect(eventNames).toContain("EventFollowupCreated");
  });

  it("opens a follow-up even for a clientless event (it attaches to the event, not a client)", async () => {
    const provider = makeProvider();
    const engine = newEngine(provider);

    const result = await bookConfirmAndFinalize(engine, { clientId: "" });
    expect(result.ok).toBe(true);

    const followups = await followupsOf(provider);
    expect(followups).toHaveLength(1);
    expect(followups[0]!.eventId).toBe(EVENT_ID);
  });

  it("coexists with a manually-created follow-up of a different type (namespaced dedup)", async () => {
    const provider = makeProvider();
    // A manual follow-up of a DIFFERENT taskType already exists for this event.
    await provider("EventFollowup").create({
      id: "ef-manual",
      tenantId: TENANT,
      eventId: EVENT_ID,
      taskType: "site_visit",
      description: "Manual site visit",
      status: "pending",
    } as never);
    const engine = newEngine(provider);

    const result = await bookConfirmAndFinalize(engine);
    expect(result.ok).toBe(true);

    // The auto task is namespaced by taskType, so it is NOT deduped against the
    // manual one → both now exist.
    const followups = await followupsOf(provider);
    expect(followups).toHaveLength(2);
    const auto = followups.find((f) => f.taskType === AUTO_TYPE);
    expect(auto).toBeDefined();
    expect(auto?.assignedTo).toBe(FINALIZER_ID);
  });

  it("does not open a second auto follow-up when one already exists (idempotent)", async () => {
    const provider = makeProvider();
    // Pre-existing AUTO follow-up already correlated to this event.
    await provider("EventFollowup").create({
      id: "ef-auto-pre",
      tenantId: TENANT,
      eventId: EVENT_ID,
      taskType: AUTO_TYPE,
      description: "Post-event follow-up for prior run",
      status: "pending",
    } as never);
    const engine = newEngine(provider);

    const result = await bookConfirmAndFinalize(engine);
    expect(result.ok).toBe(true);

    const followups = await followupsOf(provider);
    expect(followups).toHaveLength(1);
    expect(followups[0]!.id).toBe("ef-auto-pre");
  });
});
