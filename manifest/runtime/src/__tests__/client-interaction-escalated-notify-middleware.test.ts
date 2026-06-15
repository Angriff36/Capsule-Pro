/**
 * Middleware conformance — ClientInteraction escalated → Notification (P1, CRM).
 *
 * WHY this matters (not just WHAT it does):
 *   - When a rep escalates a follow-up it must surface on the escalation TARGET's
 *     notification feed — that person now owns an urgent item. `ClientInteractionEscalated`
 *     was an ORPHAN event: with no consumer, an escalation produced zero in-app signal
 *     for the person it was handed to.
 *   - The recipient is `escalatedTo`, NOT the original assignee (`employeeId`). That
 *     deliberate difference from the overdue sibling is the core behavior under test —
 *     a regression that notified the wrong person would silently misroute the signal.
 *
 * This CANNOT be a pure reaction: while `escalatedTo`/`reason` ARE escalate params
 * (they ride the `{ ...commandInput, result }` payload), the notification also needs
 * the interaction's OWN `subject`/`tenantId`, which are never auto-populated onto the
 * event payload. The middleware LOADS the interaction from the store and reads them.
 *
 * Runs against the REAL compiled IR through the runtime engine WITH the middleware
 * wired (middleware lives in the factory, not the IR), so it FAILS LOUDLY if the
 * propagation regresses — target never notified, wrong recipient, or it fires on the
 * wrong event (CLAUDE.md Rule 9; constitution §13). It also regression-locks that no
 * `ClientInteractionEscalated → Notification.create` reaction crept into the IR.
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { createClientInteractionEscalatedNotifyMiddleware } from "../middleware/client-interaction-escalated-notify-middleware.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-interaction-escalated";
// admin satisfies ClientInteraction's command policy AND the manager/admin-gated
// Notification.create policy so the notification leg is not denied.
const USER = {
  id: "u-interaction-escalated",
  tenantId: TENANT,
  role: "admin",
} as const;

const INTERACTION_ID = "interaction-escalated-001";
const ASSIGNEE_ID = "u-rep-42";
const ESCALATION_TARGET = "u-manager-1";
const DAY_MS = 24 * 60 * 60 * 1000;

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

/** Build the engine with the escalated-notify middleware wired (as the factory does). */
function newEngine(provider: (entity: string) => Store): ManifestRuntimeEngine {
  let engine: ManifestRuntimeEngine;
  const middleware = [
    createClientInteractionEscalatedNotifyMiddleware({
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

async function seedInteraction(
  provider: (entity: string) => Store,
  overrides: Record<string, unknown> = {}
) {
  // Seed must satisfy ClientInteraction's entity-level block constraints
  // (validInteractionType/validSubject/validEmployeeId/validStatus/validPriority),
  // re-validated on the escalate mutate. status "open" so escalate's guards pass.
  await provider("ClientInteraction").create({
    id: INTERACTION_ID,
    tenantId: TENANT,
    clientId: "client-7",
    leadId: "",
    employeeId: ASSIGNEE_ID,
    interactionType: "call",
    interactionDate: Date.now() - 7 * DAY_MS,
    subject: "Send Q3 catering proposal",
    description: "",
    followUpDate: Date.now() - DAY_MS,
    followUpCompleted: false,
    status: "open",
    priority: "normal",
    escalatedAt: null,
    escalatedTo: "",
    correlationId: "",
    deletedAt: null,
    ...overrides,
  } as never);
}

async function escalate(engine: ManifestRuntimeEngine) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "ClientInteraction",
      command: "escalate",
      body: {
        id: INTERACTION_ID,
        tenantId: TENANT,
        escalatedTo: ESCALATION_TARGET,
        reason: "client went cold",
      },
      user: { ...USER },
    }
  );
}

async function markOverdue(engine: ManifestRuntimeEngine) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "ClientInteraction",
      command: "markOverdue",
      body: { id: INTERACTION_ID, tenantId: TENANT },
      user: { ...USER },
    }
  );
}

describe("Middleware conformance: ClientInteraction escalated → Notification", () => {
  it("the compiled IR carries no ClientInteractionEscalated → Notification.create reaction (it is middleware)", () => {
    const reactions: Record<string, unknown>[] = ir.reactions ?? [];
    const stale = reactions.filter(
      (r) =>
        typeof r.event === "string" &&
        r.event === "ClientInteractionEscalated" &&
        r.targetEntity === "Notification" &&
        r.targetCommand === "create"
    );
    expect(stale).toHaveLength(0);
  });

  it("escalating a follow-up notifies the escalation target (escalatedTo), not the original assignee", async () => {
    const provider = makeProvider();
    await seedInteraction(provider);
    const engine = newEngine(provider);

    const result = await escalate(engine);
    expect(result.ok).toBe(true);

    const eventNames = (result.ok ? result.events : [])?.map(
      // biome-ignore lint/suspicious/noExplicitAny: structural event rows.
      (e: any) => e?.name
    );
    expect(eventNames).toContain("ClientInteractionEscalated");
    expect(eventNames).toContain("NotificationCreated");

    const notifications = (await provider("Notification").getAll()) as Record<
      string,
      unknown
    >[];

    // THE PROOF: the notification goes to the escalation TARGET, correlated to the
    // interaction, with the escalated type, subject in the title, and reason in body.
    const notice = notifications.find(
      (n) => n.recipientEmployeeId === ESCALATION_TARGET
    );
    expect(notice).toBeDefined();
    expect(notice?.correlationId).toBe(INTERACTION_ID);
    expect(notice?.notificationType).toBe("interaction_escalated");
    expect(String(notice?.title)).toContain("Send Q3 catering proposal");
    expect(String(notice?.body)).toContain("client went cold");

    // The deliberate difference from the overdue leg: the ORIGINAL assignee is NOT
    // the recipient — escalation routes to the person it was handed to.
    expect(
      notifications.some((n) => n.recipientEmployeeId === ASSIGNEE_ID)
    ).toBe(false);
  });

  it("does not notify on a different ClientInteraction command (event-name scoped)", async () => {
    const provider = makeProvider();
    await seedInteraction(provider);
    const engine = newEngine(provider);

    // markOverdue emits ClientInteractionMarkedOverdue, NOT ...Escalated — the
    // middleware must ignore it (no escalation notification on every mutation).
    const result = await markOverdue(engine);
    expect(result.ok).toBe(true);

    const notifications = (await provider("Notification").getAll()) as Record<
      string,
      unknown
    >[];
    expect(
      notifications.some((n) => n.notificationType === "interaction_escalated")
    ).toBe(false);
  });
});
