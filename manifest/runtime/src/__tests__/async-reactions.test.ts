import { describe, expect, it } from "vitest";
import {
  computeBackoffMs,
  DEFAULT_ASYNC_REACTION_POLICY,
  type AsyncReactionHandler,
  type AsyncReactionJob,
} from "../async-reactions/types.js";
import { InMemoryAsyncReactionStore } from "../async-reactions/in-memory-async-reaction-store.js";
import {
  asyncReactionRegistry,
} from "../async-reactions/handler-registry.js";
import {
  drainAsyncReactions,
} from "../async-reactions/drain-async-reactions.js";

describe("computeBackoffMs", () => {
  it("doubles each attempt starting from initialBackoffMs", () => {
    expect(computeBackoffMs(1, 1000, 60_000)).toBe(1000);
    expect(computeBackoffMs(2, 1000, 60_000)).toBe(2000);
    expect(computeBackoffMs(3, 1000, 60_000)).toBe(4000);
    expect(computeBackoffMs(4, 1000, 60_000)).toBe(8000);
  });

  it("caps at maxBackoffMs", () => {
    expect(computeBackoffMs(10, 1000, 60_000)).toBe(60_000);
    expect(computeBackoffMs(100, 1000, 30_000)).toBe(30_000);
  });

  it("handles attempt = 0 / negative attempts defensively", () => {
    expect(computeBackoffMs(0, 1000, 60_000)).toBe(1000);
    expect(computeBackoffMs(-5, 1000, 60_000)).toBe(1000);
  });
});

describe("DEFAULT_ASYNC_REACTION_POLICY", () => {
  it("matches the documented defaults", () => {
    expect(DEFAULT_ASYNC_REACTION_POLICY).toEqual({
      maxAttempts: 5,
      initialBackoffMs: 1000,
      maxBackoffMs: 60_000,
    });
  });
});

describe("InMemoryAsyncReactionStore", () => {
  it("enqueues a pending job with default policy", async () => {
    const store = new InMemoryAsyncReactionStore();
    const job = await store.enqueue({
      tenantId: "t1",
      reactionName: "test.reaction",
      triggeringEvent: { name: "TestEvent", payload: { foo: "bar" } },
    });
    expect(job.status).toBe("pending");
    expect(job.attempts).toBe(0);
    expect(job.maxAttempts).toBe(DEFAULT_ASYNC_REACTION_POLICY.maxAttempts);
    expect(job.reactionName).toBe("test.reaction");
    expect(await store.countByStatus("pending")).toBe(1);
  });

  it("claim() moves jobs to running + bumps attempts", async () => {
    const store = new InMemoryAsyncReactionStore();
    await store.enqueue({
      tenantId: "t1",
      reactionName: "test.reaction",
      triggeringEvent: { name: "TestEvent", payload: {} },
    });
    const claimed = await store.claim(10);
    expect(claimed).toHaveLength(1);
    expect(claimed[0]?.status).toBe("running");
    expect(claimed[0]?.attempts).toBe(1);
    expect(await store.countByStatus("running")).toBe(1);
    expect(await store.countByStatus("pending")).toBe(0);
  });

  it("claim() returns empty when nothing is eligible", async () => {
    const store = new InMemoryAsyncReactionStore();
    expect(await store.claim(10)).toEqual([]);
  });

  it("markDelivered() moves a job to delivered (terminal)", async () => {
    const store = new InMemoryAsyncReactionStore();
    await store.enqueue({
      tenantId: "t1",
      reactionName: "test.reaction",
      triggeringEvent: { name: "TestEvent", payload: {} },
    });
    const [claimed] = await store.claim(10);
    await store.markDelivered(claimed!.id);
    expect(await store.countByStatus("delivered")).toBe(1);
  });

  it("markFailed() schedules a retry with exponential backoff when attempts remain", async () => {
    const store = new InMemoryAsyncReactionStore({
      maxAttempts: 5,
      initialBackoffMs: 1000,
      maxBackoffMs: 60_000,
    });
    await store.enqueue({
      tenantId: "t1",
      reactionName: "test.reaction",
      triggeringEvent: { name: "TestEvent", payload: {} },
    });
    const [claimed] = await store.claim(10);
    await store.markFailed(claimed!.id, "boom");
    const peeked = store.peek(claimed!.id);
    expect(peeked?.status).toBe("retry");
    expect(peeked?.lastError).toBe("boom");
    expect(peeked?.nextAttemptAt).toBeGreaterThan(claimed!.nextAttemptAt);
    expect(await store.countByStatus("retry")).toBe(1);
  });

  it("markFailed() moves to dead_letter when attempts exhausted + fires alert", async () => {
    const store = new InMemoryAsyncReactionStore({ maxAttempts: 1 });
    const deadLettered: string[] = [];
    await store.enqueue({
      tenantId: "t1",
      reactionName: "test.reaction",
      triggeringEvent: { name: "TestEvent", payload: {} },
    });
    const [claimed] = await store.claim(10);
    await store.markFailed(claimed!.id, "fatal", (job) => {
      deadLettered.push(job.id);
    });
    const peeked = store.peek(claimed!.id);
    expect(peeked?.status).toBe("dead_letter");
    expect(peeked?.deadLetteredAt).toBeGreaterThan(0);
    expect(deadLettered).toEqual([claimed!.id]);
    expect(await store.countByStatus("dead_letter")).toBe(1);
  });

  it("claim() respects next_attempt_at (retries not eligible until backoff elapses)", async () => {
    let now = 10_000;
    const store = new InMemoryAsyncReactionStore({
      now: () => now,
      maxAttempts: 3,
      initialBackoffMs: 500,
      maxBackoffMs: 60_000,
    });
    await store.enqueue({
      tenantId: "t1",
      reactionName: "test.reaction",
      triggeringEvent: { name: "TestEvent", payload: {} },
    });
    const [first] = await store.claim(10);
    await store.markFailed(first!.id, "transient");
    // Retry scheduled 500ms in the future — claim() at the same time returns 0.
    expect(await store.claim(10)).toHaveLength(0);
    // Advance past the backoff — claim() now picks it up.
    now += 600;
    const second = await store.claim(10);
    expect(second).toHaveLength(1);
    expect(second[0]?.attempts).toBe(2);
  });

  it("releaseStaleClaims() resets running jobs whose claimedAt is old", async () => {
    let now = 10_000;
    const store = new InMemoryAsyncReactionStore({ now: () => now });
    await store.enqueue({
      tenantId: "t1",
      reactionName: "test.reaction",
      triggeringEvent: { name: "TestEvent", payload: {} },
    });
    await store.claim(10);
    expect(await store.countByStatus("running")).toBe(1);
    // Advance past stale threshold (default 5min).
    now += 6 * 60_000;
    const released = await store.releaseStaleClaims();
    expect(released).toBe(1);
    expect(await store.countByStatus("pending")).toBe(1);
  });
});

describe("asyncReactionRegistry", () => {
  it("register + get round-trips a handler", () => {
    const name = `test.handler.${Math.random().toString(36).slice(2)}`;
    const handler: AsyncReactionHandler = async () => undefined;
    asyncReactionRegistry.register({
      name,
      description: "test",
      handler,
    });
    expect(asyncReactionRegistry.get(name)?.handler).toBe(handler);
    expect(asyncReactionRegistry.names()).toContain(name);
  });

  it("throws on duplicate registration", () => {
    const name = `test.dup.${Math.random().toString(36).slice(2)}`;
    asyncReactionRegistry.register({
      name,
      description: "first",
      handler: async () => undefined,
    });
    expect(() =>
      asyncReactionRegistry.register({
        name,
        description: "second",
        handler: async () => undefined,
      })
    ).toThrow(/duplicate handler registration/);
  });

  it("get() returns undefined for unknown names", () => {
    expect(asyncReactionRegistry.get("does.not.exist")).toBeUndefined();
  });
});

describe("drainAsyncReactions", () => {
  it("delivers jobs whose handlers succeed", async () => {
    const store = new InMemoryAsyncReactionStore();
    const dispatched: string[] = [];
    const reactionName = `test.success.${Math.random().toString(36).slice(2)}`;
    asyncReactionRegistry.register({
      name: reactionName,
      description: "test",
      handler: async (ctx) => {
        dispatched.push(ctx.job.id);
      },
    });

    await store.enqueue({
      tenantId: "t1",
      reactionName,
      triggeringEvent: { name: "TestEvent", payload: {} },
    });
    await store.enqueue({
      tenantId: "t1",
      reactionName,
      triggeringEvent: { name: "TestEvent", payload: {} },
    });

    const result = await drainAsyncReactions({
      store,
      releaseStaleBeforeClaim: false,
      buildHandlerContext: async () => ({
        dispatchCommand: async () => ({ success: true }),
        storeProvider: () => undefined,
      }),
    });

    expect(result.claimed).toBe(2);
    expect(result.delivered).toBe(2);
    expect(result.retried).toBe(0);
    expect(result.deadLettered).toBe(0);
    expect(dispatched).toHaveLength(2);
    expect(await store.countByStatus("delivered")).toBe(2);
  });

  it("retries handlers that throw (when attempts remain)", async () => {
    const store = new InMemoryAsyncReactionStore({ maxAttempts: 3 });
    const reactionName = `test.retry.${Math.random().toString(36).slice(2)}`;
    asyncReactionRegistry.register({
      name: reactionName,
      description: "test",
      handler: async () => {
        throw new Error("always fails");
      },
    });

    await store.enqueue({
      tenantId: "t1",
      reactionName,
      triggeringEvent: { name: "TestEvent", payload: {} },
    });

    const result = await drainAsyncReactions({
      store,
      releaseStaleBeforeClaim: false,
      buildHandlerContext: async () => ({
        dispatchCommand: async () => ({ success: true }),
        storeProvider: () => undefined,
      }),
    });

    expect(result.claimed).toBe(1);
    expect(result.delivered).toBe(0);
    expect(result.retried).toBe(1);
    expect(result.deadLettered).toBe(0);
    expect(await store.countByStatus("retry")).toBe(1);
  });

  it("dead-letters handlers that exhaust retries + fires onDeadLettered", async () => {
    const store = new InMemoryAsyncReactionStore({ maxAttempts: 1 });
    const alerted: string[] = [];
    const reactionName = `test.dlq.${Math.random().toString(36).slice(2)}`;
    asyncReactionRegistry.register({
      name: reactionName,
      description: "test",
      handler: async () => {
        throw new Error("terminal failure");
      },
    });

    await store.enqueue({
      tenantId: "t1",
      reactionName,
      triggeringEvent: { name: "TestEvent", payload: {} },
    });

    const result = await drainAsyncReactions({
      store,
      releaseStaleBeforeClaim: false,
      buildHandlerContext: async () => ({
        dispatchCommand: async () => ({ success: true }),
        storeProvider: () => undefined,
      }),
      onDeadLettered: (job) => alerted.push(job.id),
    });

    expect(result.deadLettered).toBe(1);
    expect(alerted).toHaveLength(1);
    expect(await store.countByStatus("dead_letter")).toBe(1);
  });

  it("dead-letters jobs with an unknown reactionName (registration bug)", async () => {
    // maxAttempts: 1 so the unknown-handler failure routes to DLQ immediately
    // (otherwise it would burn through retries before DLQ — also valid, but
    // the test asserts the terminal DLQ path here).
    const store = new InMemoryAsyncReactionStore({ maxAttempts: 1 });
    await store.enqueue({
      tenantId: "t1",
      reactionName: "never.registered",
      triggeringEvent: { name: "TestEvent", payload: {} },
    });

    const result = await drainAsyncReactions({
      store,
      releaseStaleBeforeClaim: false,
      buildHandlerContext: async () => ({
        dispatchCommand: async () => ({ success: true }),
        storeProvider: () => undefined,
      }),
    });

    expect(result.claimed).toBe(1);
    expect(result.deadLettered).toBe(1);
    expect(await store.countByStatus("dead_letter")).toBe(1);
  });

  it("returns zero claimed when the queue is empty", async () => {
    const store = new InMemoryAsyncReactionStore();
    const result = await drainAsyncReactions({
      store,
      releaseStaleBeforeClaim: false,
      buildHandlerContext: async () => ({
        dispatchCommand: async () => ({ success: true }),
        storeProvider: () => undefined,
      }),
    });
    expect(result).toEqual({
      claimed: 0,
      delivered: 0,
      retried: 0,
      deadLettered: 0,
      durationMs: expect.any(Number),
    });
  });
});
