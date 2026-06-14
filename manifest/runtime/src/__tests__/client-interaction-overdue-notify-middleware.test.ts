/**
 * Middleware conformance — ClientInteraction overdue → Notification (P1, CRM).
 *
 * WHY this matters (not just WHAT it does):
 *   - A follow-up that slips past its due date must surface on the assignee's
 *     notification feed. `ClientInteractionMarkedOverdue` was an ORPHAN event — with
 *     no consumer, overdue follow-ups generated zero signal and silently rotted.
 *
 * This CANNOT be a reaction. `markOverdue()` takes NO params, so the emitted
 * `{ ...commandInput, result }` payload carries no entity fields (declared event
 * fields are never auto-populated from `self.*`). The recipient (`employeeId`),
 * `subject`, and `tenantId` are the interaction's OWN fields, and
 * `Notification.create` guards `recipientEmployeeId != ""` / `title != ""`, so a
 * reaction passing `undefined`s would fail the guard and be swallowed. The middleware
 * LOADS the interaction from the store and reads its own fields.
 *
 * Runs against the REAL compiled IR through the runtime engine WITH the middleware
 * wired (middleware lives in the factory, not the IR), so it FAILS LOUDLY if the
 * propagation regresses — assignee never notified, wrong recipient, or it fires on
 * the wrong event (CLAUDE.md Rule 9; constitution §13). It also regression-locks that
 * no `ClientInteractionMarkedOverdue → Notification.create` reaction crept into the
 * IR (it must stay middleware).
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { createClientInteractionOverdueNotifyMiddleware } from "../middleware/client-interaction-overdue-notify-middleware.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-interaction-overdue";
// admin satisfies ClientInteraction's command policy AND the manager/admin-gated
// Notification.create policy so the notification leg is not denied.
const USER = {
  id: "u-interaction-overdue",
  tenantId: TENANT,
  role: "admin",
} as const;

const INTERACTION_ID = "interaction-overdue-001";
const ASSIGNEE_ID = "u-rep-42";
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

/** Build the engine with the overdue-notify middleware wired (as the factory does). */
function newEngine(provider: (entity: string) => Store): ManifestRuntimeEngine {
  let engine: ManifestRuntimeEngine;
  const middleware = [
    createClientInteractionOverdueNotifyMiddleware({
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
  // (validInteractionType/validSubject/validEmployeeId/validStatus/validPriority,
  // client-interaction-rules.manifest:32-50), re-validated on the markOverdue mutate.
  // followUpDate in the past + status "open" so markOverdue's guards pass.
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

async function escalate(engine: ManifestRuntimeEngine) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "ClientInteraction",
      command: "escalate",
      body: {
        id: INTERACTION_ID,
        tenantId: TENANT,
        escalatedTo: "u-manager-1",
        reason: "client went cold",
      },
      user: { ...USER },
    }
  );
}

describe("Middleware conformance: ClientInteraction overdue → Notification", () => {
  it("the compiled IR carries no ClientInteractionMarkedOverdue → Notification.create reaction (it is middleware)", () => {
    const reactions: Record<string, unknown>[] = ir.reactions ?? [];
    const stale = reactions.filter(
      (r) =>
        typeof r.event === "string" &&
        r.event === "ClientInteractionMarkedOverdue" &&
        r.targetEntity === "Notification" &&
        r.targetCommand === "create"
    );
    expect(stale).toHaveLength(0);
  });

  it("marking a follow-up overdue notifies the assignee via Notification.create", async () => {
    const provider = makeProvider();
    await seedInteraction(provider);
    const engine = newEngine(provider);

    const result = await markOverdue(engine);
    expect(result.ok).toBe(true);

    const eventNames = (result.ok ? result.events : [])?.map(
      // biome-ignore lint/suspicious/noExplicitAny: structural event rows.
      (e: any) => e?.name
    );
    expect(eventNames).toContain("ClientInteractionMarkedOverdue");
    expect(eventNames).toContain("NotificationCreated");

    // THE PROOF: a notification row exists for the assignee, correlated to the
    // interaction, with the overdue type and the follow-up subject in the title.
    const notifications = (await provider("Notification").getAll()) as Record<
      string,
      unknown
    >[];
    const notice = notifications.find(
      (n) => n.recipientEmployeeId === ASSIGNEE_ID
    );
    expect(notice).toBeDefined();
    expect(notice?.correlationId).toBe(INTERACTION_ID);
    expect(notice?.notificationType).toBe("interaction_overdue");
    expect(String(notice?.title)).toContain("Send Q3 catering proposal");
  });

  it("does not notify on a different ClientInteraction command (event-name scoped)", async () => {
    const provider = makeProvider();
    await seedInteraction(provider);
    const engine = newEngine(provider);

    // escalate emits ClientInteractionEscalated, NOT ...MarkedOverdue — the
    // middleware must ignore it (no overdue notification spam on every mutation).
    const result = await escalate(engine);
    expect(result.ok).toBe(true);

    const notifications = (await provider("Notification").getAll()) as Record<
      string,
      unknown
    >[];
    expect(
      notifications.some((n) => n.notificationType === "interaction_overdue")
    ).toBe(false);
  });
});
