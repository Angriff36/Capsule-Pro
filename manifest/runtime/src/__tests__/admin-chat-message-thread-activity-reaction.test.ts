/**
 * Reaction conformance — `AdminChatMessageSent → AdminChatThread.recordLastMessage`
 * (IMPLEMENTATION_PLAN P1 "AdminChatMessageSent → AdminChatThread.recordLastMessage").
 *
 * WHY this matters (not just WHAT it does): an admin chat thread's `lastMessageAt`
 * was a DEAD column — no command ever wrote it — so thread lists could not order by
 * recency (the most recently active conversation could sit at the bottom). Sending a
 * message must bump its thread's activity timestamp.
 *
 * The propagation is a REACTION (not middleware) because the target thread's id IS
 * reachable from the emitted payload: `AdminChatMessage.create(threadId, …)` takes
 * `threadId` as an INPUT PARAM, so it rides the engine's emitted payload
 * `{ ...commandInput, result }` as `payload.threadId`. The reaction therefore
 * resolves `payload.threadId` (the real param) — NOT `payload.adminChatThreadId`
 * (the DECLARED event field, which the engine never auto-populates from `self.*`;
 * resolving on it would be a silent no-op and would fail the reaction-payload audit
 * gate). `recordLastMessage()` takes no params and mutates `lastMessageAt = now()`.
 *
 * This test runs against the REAL compiled IR (`manifest/ir/kitchen.ir.json`) through
 * `RuntimeEngine.runCommand`, so it FAILS LOUDLY if the reaction regresses to a
 * non-param payload field, if the resolve stops pointing at the thread, or if the
 * engine stops dispatching the reaction — i.e. it fails when the *business
 * propagation* breaks, not merely when shape changes (CLAUDE.md Rule 9;
 * constitution §13).
 *
 * Chain proven here:
 *   AdminChatMessage.create(threadId=T, authorId, text)
 *     → emits AdminChatMessageSent (payload.threadId=T)
 *     → reaction runs AdminChatThread.recordLastMessage on thread T
 *     → thread T's lastMessageAt is set (was null)
 *     → emits AdminChatThreadLastMessageRecorded (bubbles up into create's events)
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { RuntimeEngine, type Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-admin-chat";
// admin satisfies AdminChatMessage.create's policy AND AdminChatThread's policy so
// neither the source command nor the reaction's downstream command is denied.
const USER = { id: "u-admin-chat", tenantId: TENANT, role: "admin" } as const;

const THREAD_ID = "thread-chat-001";
const OTHER_THREAD_ID = "thread-chat-002";

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

function newEngine(provider: (entity: string) => Store): RuntimeEngine {
  return new RuntimeEngine(
    ir,
    {
      tenantId: USER.tenantId,
      user: { id: USER.id, tenantId: USER.tenantId, role: USER.role },
    },
    { storeProvider: provider, customBuiltins: createCustomBuiltins() }
  );
}

async function seedThread(
  provider: (entity: string) => Store,
  id: string,
  overrides: Record<string, unknown> = {}
) {
  // Seed directly via the store (bypassing AdminChatThread.create's guards) so the
  // test isolates the message-send → reaction chain, not thread creation. The thread
  // starts with NO activity timestamp — the propagation must set it.
  await provider("AdminChatThread").create({
    id,
    tenantId: TENANT,
    threadType: "direct",
    slug: `slug-${id}`,
    directKey: "",
    createdBy: "u-admin-chat",
    lastMessageAt: null,
    deletedAt: null,
    ...overrides,
  } as never);
}

async function sendMessage(
  engine: RuntimeEngine,
  threadId: string,
  text = "hello"
) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "AdminChatMessage",
      command: "create",
      body: {
        id: `msg-${threadId}-${text.length}`,
        tenantId: TENANT,
        threadId,
        authorId: USER.id,
        authorName: "Admin User",
        text,
      },
      user: { ...USER },
    }
  );
}

describe("Reaction conformance: AdminChatMessageSent → AdminChatThread.recordLastMessage", () => {
  it("the compiled IR carries the reaction resolving the thread off a real create PARAM (payload.threadId, not adminChatThreadId/result)", () => {
    const reactions: Record<string, unknown>[] = ir.reactions ?? [];
    const reaction = reactions.find(
      (r) =>
        r.event === "AdminChatMessageSent" &&
        r.targetEntity === "AdminChatThread" &&
        r.targetCommand === "recordLastMessage"
    );
    expect(reaction).toBeDefined();

    // resolve must point at `payload.threadId` — the genuine `AdminChatMessage.create`
    // input param. A regression to `payload.adminChatThreadId` (a declared-but-never-
    // populated event field) or `payload.result.*` (a mutate scalar) would re-break
    // the propagation into a silent no-op.
    const resolveJson = JSON.stringify(reaction?.resolve);
    expect(resolveJson).toContain('"property":"threadId"');
    expect(resolveJson).not.toContain("adminChatThreadId");
    expect(resolveJson).not.toContain("result");
  });

  it("sending a message stamps the thread's lastMessageAt (was null) and emits the activity event", async () => {
    const provider = makeProvider();
    await seedThread(provider, THREAD_ID);
    const engine = newEngine(provider);

    const before = (await provider("AdminChatThread").getById(THREAD_ID)) as unknown as Record<string, unknown>;
    expect(before.lastMessageAt).toBeNull();

    const result = await sendMessage(engine, THREAD_ID);
    expect(result.ok).toBe(true);

    // THE PROOF: the reaction ran recordLastMessage against the SAME store, so the
    // thread now carries an activity timestamp it did not have before.
    const after = (await provider("AdminChatThread").getById(THREAD_ID)) as unknown as Record<string, unknown>;
    expect(after.lastMessageAt).not.toBeNull();
    expect(after.lastMessageAt).toBeDefined();
    // datetime is epoch-ms in this engine.
    expect(typeof after.lastMessageAt).toBe("number");
    expect(after.lastMessageAt as number).toBeGreaterThan(0);

    // Secondary proof: the downstream command's own event bubbles up into the
    // parent command's emitted events — only possible if the reaction executed.
    const eventNames = (result.ok ? result.events : [])?.map(
      // biome-ignore lint/suspicious/noExplicitAny: structural event rows.
      (e: any) => e?.name
    );
    expect(eventNames).toContain("AdminChatMessageSent");
    expect(eventNames).toContain("AdminChatThreadLastMessageRecorded");
  });

  it("targets ONLY the message's own thread — an unrelated thread is untouched (proves resolve is data-driven, not a hardcode)", async () => {
    const provider = makeProvider();
    await seedThread(provider, THREAD_ID);
    await seedThread(provider, OTHER_THREAD_ID);
    const engine = newEngine(provider);

    const result = await sendMessage(engine, THREAD_ID);
    expect(result.ok).toBe(true);

    const target = (await provider("AdminChatThread").getById(THREAD_ID)) as unknown as Record<string, unknown>;
    const bystander = (await provider("AdminChatThread").getById(
      OTHER_THREAD_ID
    )) as unknown as Record<string, unknown>;
    expect(target.lastMessageAt).not.toBeNull();
    expect(bystander.lastMessageAt).toBeNull();
  });

  it("a soft-deleted thread is skipped (guard self.deletedAt == null) without breaking the send", async () => {
    const provider = makeProvider();
    // deletedAt is set (epoch-ms) → recordLastMessage's guard fails; the reaction
    // error is logged-and-swallowed so the message still sends, but no activity is
    // recorded on a removed thread.
    await seedThread(provider, THREAD_ID, { deletedAt: 1_700_000_000_000 });
    const engine = newEngine(provider);

    const result = await sendMessage(engine, THREAD_ID);
    expect(result.ok).toBe(true);

    const after = (await provider("AdminChatThread").getById(THREAD_ID)) as unknown as Record<string, unknown>;
    expect(after.lastMessageAt).toBeNull();

    const eventNames = (result.ok ? result.events : [])?.map(
      // biome-ignore lint/suspicious/noExplicitAny: structural event rows.
      (e: any) => e?.name
    );
    expect(eventNames).toContain("AdminChatMessageSent");
    expect(eventNames).not.toContain("AdminChatThreadLastMessageRecorded");
  });
});
