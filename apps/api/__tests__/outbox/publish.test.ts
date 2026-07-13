/**
 * POST /outbox/publish — batched status writes (#14).
 *
 * The outbox drain cron (Vercel Cron every minute) loops over pending events,
 * fans each out to SSE, then marks it `published`. Before #14 that was ONE
 * `outboxEvent.update` PER fanned-out event (N serial round-trips/tick). Now
 * the `published` writes collapse to ONE guarded `updateMany` after the loop.
 * Failure paths (oversized payload, fanout throw) stay per-event because their
 * error strings carry per-event data (size / error message) and are rare.
 *
 * This mocked suite pins the batching; the real-DB behavior is covered by
 * `publish.integration.test.ts` (transparent to it — asserts outcomes, not
 * call counts).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/env", () => ({ env: { OUTBOX_PUBLISH_TOKEN: "test-token" } }));
vi.mock("@/lib/realtime/pubsub", () => ({ publish: vi.fn() }));
vi.mock("@repo/realtime", () => ({
  getChannelName: (tenantId: string) => `channel:${tenantId}`,
}));
vi.mock("@repo/database", () => ({
  database: {
    outboxEvent: {
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}));

import { database } from "@repo/database";
import { publish as publishToChannel } from "@/lib/realtime/pubsub";
import { POST } from "../../app/outbox/publish/route";

interface RawEvent {
  aggregate_id: string;
  aggregate_type: string;
  created_at: Date;
  error: string | null;
  event_type: string;
  id: string;
  payload: unknown;
  published_at: Date | null;
  status: string;
  tenant_id: string;
}

const mkEvent = (overrides: Partial<RawEvent> = {}): RawEvent => ({
  id: "e1",
  tenant_id: "tenant_a",
  aggregate_type: "Thing",
  aggregate_id: "agg_1",
  event_type: "thing.created",
  payload: { occurredAt: "2026-01-01T00:00:00.000Z" },
  status: "pending",
  error: null,
  created_at: new Date("2026-01-01T00:00:00.000Z"),
  published_at: null,
  ...overrides,
});

const authedPost = (body: unknown = {}) =>
  new Request("http://x/outbox/publish", {
    method: "POST",
    headers: {
      authorization: "Bearer test-token",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

describe("POST /outbox/publish — batched `published` writes (#14)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(database.outboxEvent.findFirst).mockResolvedValue(null);
    vi.mocked(database.outboxEvent.update).mockResolvedValue({} as never);
    vi.mocked(database.outboxEvent.updateMany).mockResolvedValue({
      count: 0,
    } as never);
    vi.mocked(database.$queryRaw).mockResolvedValue([]);
    vi.mocked(publishToChannel).mockReturnValue(undefined as never);
  });

  it("marks all fanned-out events published in ONE batched updateMany (not N updates)", async () => {
    const events = [
      mkEvent({ id: "e1" }),
      mkEvent({ id: "e2" }),
      mkEvent({ id: "e3" }),
    ];
    vi.mocked(database.$queryRaw).mockResolvedValue(events as never);

    const res = await POST(authedPost());
    const body = await res.json();

    expect(publishToChannel).toHaveBeenCalledTimes(3); // fanout still per-event
    // ONE batched published write carrying every fanned-out id.
    expect(database.outboxEvent.updateMany).toHaveBeenCalledTimes(1);
    expect(database.outboxEvent.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["e1", "e2", "e3"] } },
      data: {
        status: "published",
        publishedAt: expect.any(Date),
        error: null,
      },
    });
    // The old per-event `published` update path is gone.
    expect(database.outboxEvent.update).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
    expect(body.published).toBe(3);
    expect(body.failed).toBe(0);
  });

  it("keeps failure writes per-event; batches only the published bucket", async () => {
    const events = [
      mkEvent({ id: "oversized", payload: { big: "x".repeat(70_000) } }), // > 64 KiB
      mkEvent({ id: "ok" }),
      mkEvent({ id: "throws" }),
    ];
    vi.mocked(database.$queryRaw).mockResolvedValue(events as never);
    // Fanout throws only for the "throws" event (discriminate by envelope id;
    // the oversized event never reaches fanout — it fails the size check first).
    vi.mocked(publishToChannel).mockImplementation(((
      _channel: string,
      message: { data: { id: string } }
    ) => {
      if (message.data.id === "throws") {
        throw new Error("ably down");
      }
    }) as never);

    const res = await POST(authedPost());
    const body = await res.json();

    // Failures stay per-event: oversized + fanout-throw each get their own update.
    expect(database.outboxEvent.update).toHaveBeenCalledTimes(2);
    const updates = vi
      .mocked(database.outboxEvent.update)
      .mock.calls.map((c) => c[0]);
    expect(updates).toContainEqual(
      expect.objectContaining({
        where: { id: "oversized" },
        data: expect.objectContaining({
          status: "failed",
          error: expect.stringContaining("PAYLOAD_TOO_LARGE"),
        }),
      })
    );
    expect(updates).toContainEqual(
      expect.objectContaining({
        where: { id: "throws" },
        data: { status: "failed", error: "PUBLISH_ERROR: ably down" },
      })
    );
    // The one published event is batched, not per-event.
    expect(database.outboxEvent.updateMany).toHaveBeenCalledTimes(1);
    expect(database.outboxEvent.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["ok"] } },
      data: { status: "published", publishedAt: expect.any(Date), error: null },
    });
    expect(body.published).toBe(1);
    expect(body.failed).toBe(2);
  });

  it("a batched updateMany failure does NOT crash and leaves events pending (not failed)", async () => {
    vi.mocked(database.$queryRaw).mockResolvedValue([
      mkEvent({ id: "e1" }),
      mkEvent({ id: "e2" }),
    ] as never);
    vi.mocked(database.outboxEvent.updateMany).mockRejectedValue(
      new Error("db blip") as never
    );

    const res = await POST(authedPost());
    expect(res.status).toBe(200); // did not crash
    // No per-event update fired → the fanned-out events are NOT marked failed;
    // they stay pending and retry next tick (at-least-once).
    expect(database.outboxEvent.update).not.toHaveBeenCalled();
    expect(database.outboxEvent.updateMany).toHaveBeenCalledTimes(1);
  });

  it("skips the batched write entirely when nothing was fanned out", async () => {
    vi.mocked(database.$queryRaw).mockResolvedValue([
      mkEvent({ id: "big", payload: { big: "x".repeat(70_000) } }), // fails pre-fanout
    ] as never);

    await POST(authedPost());

    expect(database.outboxEvent.updateMany).not.toHaveBeenCalled();
    expect(database.outboxEvent.update).toHaveBeenCalledTimes(1); // the oversized failure
  });

  it("rejects unauthorized requests with 401 before any DB read", async () => {
    const res = await POST(
      new Request("http://x/outbox/publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(401);
    expect(database.$queryRaw).not.toHaveBeenCalled();
    expect(database.outboxEvent.updateMany).not.toHaveBeenCalled();
  });
});
