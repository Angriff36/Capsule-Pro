/**
 * Middleware conformance — `EventStaffAssigned → Notification` for the assigned
 * staff member (IMPLEMENTATION_PLAN P1, Staffing → "EventStaffAssigned → …notify
 * the staff member").
 *
 * WHY this matters (not just WHAT it does): rostering a person onto an event is a
 * direct, time-sensitive hand-off — the person needs to know. Until this
 * propagation existed, `EventStaffAssigned` had ZERO consumers, so the
 * `/notifications` surface was blind to event staffing and staff learned of their
 * assignments only out of band. The plan scoped this as middleware (not a reaction)
 * because a useful notification names the event, and the event title is the Event's
 * OWN field — never on the assignment payload — so the leg must LOAD the Event.
 *
 * The test runs the REAL compiled IR through the runtime engine WITH the middleware
 * wired (the middleware lives in the factory, not the IR), so it FAILS LOUDLY if the
 * propagation regresses — no notification, wrong recipient, or the engine stops
 * dispatching — i.e. it fails when the BUSINESS propagation breaks, not on a mere
 * shape change (CLAUDE.md Rule 9; constitution §13).
 *
 * Chain proven here:
 *   EventStaff.assign(eventId, staffMemberId, role, …)  (status → assigned)
 *     → emits EventStaffAssigned (_subject.id = the EventStaff row id)
 *     → middleware loads the assignment row + the Event (for its title)
 *     → dispatches Notification.create for the staffMemberId
 *     → a Notification row persists, NotificationCreated bubbles up.
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { createEventStaffAssignedNotifyMiddleware } from "../middleware/event-staff-assigned-notify-middleware.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";
import { createSystemSideEffectDispatch } from "../system-side-effect-dispatch.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-event-staff-notify";
// manager satisfies BOTH EventStaff.assign's policy AND Notification.create's
// default policy (user.role in ["manager", "admin"]) so neither the source command
// nor the downstream dispatch is denied.
const USER = { id: "u-assigner", tenantId: TENANT, role: "manager" } as const;
const COORDINATOR = {
  id: "u-coordinator",
  tenantId: TENANT,
  role: "event_coordinator",
} as const;

const EVENT_ID = "event-notify-001";
const STAFF_ID = "staff-notify-001";

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

/** Build the engine with the EventStaffAssigned→Notification middleware wired. */
function newEngine(
  provider: (entity: string) => Store,
  actor: { id: string; tenantId: string; role: string } = USER
): ManifestRuntimeEngine {
  let engine: ManifestRuntimeEngine;
  const middleware = [
    createEventStaffAssignedNotifyMiddleware({
      storeProvider: provider,
      dispatchCommand: (commandName, input, options) =>
        createSystemSideEffectDispatch(engine)(commandName, input, options),
      onDiagnostic: () => {
        /* silence console diagnostics in tests */
      },
    }),
  ];
  engine = new ManifestRuntimeEngine(
    ir,
    {
      tenantId: actor.tenantId,
      user: { id: actor.id, tenantId: actor.tenantId, role: actor.role },
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

/**
 * Seed an Event so the notify leg can enrich the message with its title. Seeding
 * the precondition state is infrastructure setup; the behaviour under test is the
 * assign → notify propagation, which runs through the real engine below.
 */
async function seedEvent(provider: (entity: string) => Store) {
  await provider("Event").create({
    id: EVENT_ID,
    tenantId: TENANT,
    title: "Smith Wedding",
    eventType: "general",
    clientId: "client-1",
    status: "draft",
    deletedAt: null,
  } as never);
}

async function assign(
  engine: ManifestRuntimeEngine,
  body: Record<string, unknown>,
  actor: { id: string; tenantId: string; role: string } = USER
) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "EventStaff",
      command: "assign",
      body: {
        tenantId: TENANT,
        notes: "",
        shiftStart: new Date(1_700_000_000_000).toISOString(),
        shiftEnd: new Date(1_700_000_000_000).toISOString(),
        ...body,
      },
      user: { ...actor },
    }
  );
}

function notificationsOf(provider: (entity: string) => Store) {
  return provider("Notification").getAll() as Promise<
    Record<string, unknown>[]
  >;
}

describe("Middleware conformance: EventStaffAssigned → Notification for the assigned staff member", () => {
  it("the compiled IR carries no EventStaffAssigned→Notification reaction (it is middleware)", () => {
    const reactions: Record<string, unknown>[] = ir.reactions ?? [];
    const stale = reactions.filter(
      (r) =>
        r.event === "EventStaffAssigned" &&
        r.targetEntity === "Notification" &&
        r.targetCommand === "create"
    );
    // A regression here means someone added a reaction that cannot load the Event
    // title for a useful message — the propagation must stay middleware.
    expect(stale).toHaveLength(0);
  });

  it("assigning a staff member notifies that staff member with an event-named message", async () => {
    const provider = makeProvider();
    await seedEvent(provider);
    const engine = newEngine(provider);

    const result = await assign(engine, {
      id: randomUUID(),
      eventId: EVENT_ID,
      staffMemberId: STAFF_ID,
      role: "Lead Server",
    });
    expect(result.ok).toBe(true);

    // THE PROOF: the middleware ran Notification.create against the same store —
    // one notification, addressed to the assigned staff member.
    const notifications = await notificationsOf(provider);
    expect(notifications).toHaveLength(1);
    const notification = notifications[0]!;
    expect(notification.recipientEmployeeId).toBe(STAFF_ID);
    expect(notification.tenantId).toBe(TENANT);
    expect(notification.notificationType).toBe("event_staff_assigned");
    // Correlated to the event so it is traceable back to the assignment.
    expect(notification.correlationId).toBe(EVENT_ID);
    // The event title was loaded and woven into the message (the middleware-only win).
    expect(String(notification.title)).toContain("Smith Wedding");
    expect(String(notification.body)).toContain("Lead Server");

    // Secondary proof: the downstream command's own event bubbles up — only
    // possible if the middleware executed.
    const eventNames = (result.ok ? result.events : [])?.map(
      // biome-ignore lint/suspicious/noExplicitAny: structural event rows.
      (e: any) => e?.name
    );
    expect(eventNames).toContain("EventStaffAssigned");
    expect(eventNames).toContain("NotificationCreated");
  });

  it("still notifies (with a generic message) when the Event row is not loadable", async () => {
    const provider = makeProvider();
    // Deliberately do NOT seed the Event — the notify must not be blocked by it.
    const engine = newEngine(provider);

    const result = await assign(engine, {
      id: randomUUID(),
      eventId: "event-missing-999",
      staffMemberId: STAFF_ID,
      role: "Server",
    });
    expect(result.ok).toBe(true);

    const notifications = await notificationsOf(provider);
    expect(notifications).toHaveLength(1);
    const notification = notifications[0]!;
    expect(notification.recipientEmployeeId).toBe(STAFF_ID);
    // Generic fallback title (no event name available), still a valid non-empty title.
    expect(String(notification.title).length).toBeGreaterThan(0);
    expect(notification.correlationId).toBe("event-missing-999");
  });

  it("notifies each distinct assignment's own staff member", async () => {
    // Two separate assignments (different rows + different staff) on the same event
    // each notify their own recipient — the leg addresses the assigned person, not
    // a shared broadcast. (Cross-CALL dedupe of an identical re-delivery relies on
    // the opt-in idempotencyKey/outbox store, which the unit engine does not wire —
    // a documented, deliberate repo convention — so it is not asserted here.)
    const provider = makeProvider();
    await seedEvent(provider);
    const engine = newEngine(provider);

    const a = await assign(engine, {
      id: randomUUID(),
      eventId: EVENT_ID,
      staffMemberId: "staff-aaa",
      role: "Lead Server",
    });
    expect(a.ok).toBe(true);
    const b = await assign(engine, {
      id: randomUUID(),
      eventId: EVENT_ID,
      staffMemberId: "staff-bbb",
      role: "Bartender",
    });
    expect(b.ok).toBe(true);

    const notifications = await notificationsOf(provider);
    expect(notifications).toHaveLength(2);
    const recipients = notifications.map((n) => n.recipientEmployeeId).sort();
    expect(recipients).toEqual(["staff-aaa", "staff-bbb"]);
  });

  it("notifies when the assigner is an event_coordinator (system side-effect dispatch)", async () => {
    const provider = makeProvider();
    await seedEvent(provider);
    const engine = newEngine(provider, COORDINATOR);

    const result = await assign(
      engine,
      {
        id: randomUUID(),
        eventId: EVENT_ID,
        staffMemberId: STAFF_ID,
        role: "Lead Server",
      },
      COORDINATOR
    );
    expect(result.ok).toBe(true);

    const notifications = await notificationsOf(provider);
    expect(notifications).toHaveLength(1);
    expect(notifications[0]?.recipientEmployeeId).toBe(STAFF_ID);
  });
});
