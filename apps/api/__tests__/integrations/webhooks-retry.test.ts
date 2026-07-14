/**
 * POST /api/integrations/webhooks/retry — per-delivery outboundWebhook.findFirst
 * N+1 → findMany + Map preload (#25, same shape as cron/webhook-retry #8c).
 *
 * The discriminating guards:
 *  (1) the N+1 collapse — outboundWebhook.findMany is called ONCE with the
 *      deduped `id IN` list and findFirst is NEVER called, regardless of how
 *      many deliveries target the same webhook;
 *  (2) the consecutiveFailures FEED-BACK — a burst of FAILING deliveries to the
 *      SAME webhook must still accumulate consecutiveFailures across deliveries
 *      (2 → 3 → 4), because the prior per-delivery findFirst re-read the just-
 *      updated row. A naive Map snapshot would freeze both at 3;
 *  (3) the auto-disable FEED-BACK — once a delivery trips shouldAutoDisable and
 *      sets status="disabled", a LATER delivery to the same webhook must be
 *      skipped by the `status !== "active"` guard (no sendWebhook call), again
 *      requiring the fed-back status to be visible to the next iteration.
 */
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({ getTenantIdForOrg: vi.fn() }));
vi.mock("@repo/observability/log", () => ({
  log: { error: vi.fn(), info: vi.fn() },
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@/lib/prisma-utils", () => ({ toJson: vi.fn((v: unknown) => v) }));
vi.mock("@repo/notifications", () => ({
  sendWebhook: vi.fn(),
  determineNextStatus: vi.fn(),
  shouldAutoDisable: vi.fn(),
}));

vi.mock("@repo/database", () => ({
  database: {
    webhookDeliveryLog: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    outboundWebhook: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    webhookDeadLetterQueue: { create: vi.fn() },
  },
}));

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import {
  determineNextStatus,
  sendWebhook,
  shouldAutoDisable,
} from "@repo/notifications";
import { POST } from "@/app/api/integrations/webhooks/retry/route";
import { getTenantIdForOrg } from "@/app/lib/tenant";

const SUCCESS = {
  success: true,
  httpStatus: 200,
  responseBody: "ok",
  errorMessage: "",
};
const FAILURE = {
  success: false,
  httpStatus: 500,
  responseBody: "err",
  errorMessage: "boom",
};

function delivery(
  over: Partial<{ id: string; webhookId: string; attemptNumber: number }> = {}
) {
  return {
    id: over.id ?? "d-1",
    tenantId: "tenant_test",
    webhookId: over.webhookId ?? "wh-A",
    attemptNumber: over.attemptNumber ?? 1,
    payload: { hello: "world" },
    eventType: "event.test",
    entityType: "event",
    entityId: "e-1",
    status: "retrying",
    nextRetryAt: new Date(),
  };
}

function webhook(
  over: Partial<{
    id: string;
    consecutiveFailures: number;
    status: string;
  }> = {}
) {
  return {
    tenantId: "tenant_test",
    id: over.id ?? "wh-A",
    name: "A",
    url: "https://example.com/hook",
    secret: "s",
    apiKey: null,
    eventTypeFilters: [],
    entityFilters: [],
    status: (over.status ?? "active") as "active" | "inactive" | "disabled",
    retryCount: 3,
    retryDelayMs: 1000,
    timeoutMs: 30_000,
    customHeaders: null,
    lastTriggeredAt: null,
    lastSuccessAt: null,
    lastFailureAt: null,
    consecutiveFailures: over.consecutiveFailures ?? 2,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };
}

function req(body: unknown) {
  return new NextRequest("http://x/api/integrations/webhooks/retry", {
    method: "POST",
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0];
}

describe("POST /api/integrations/webhooks/retry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      userId: "u-1",
      orgId: "org_test",
    } as never);
    vi.mocked(getTenantIdForOrg).mockResolvedValue("tenant_test");
    vi.mocked(database.webhookDeliveryLog.update).mockResolvedValue(
      {} as never
    );
    vi.mocked(database.outboundWebhook.update).mockResolvedValue({} as never);
    vi.mocked(database.webhookDeadLetterQueue.create).mockResolvedValue(
      {} as never
    );
    vi.mocked(determineNextStatus).mockReturnValue({
      status: "retrying",
      nextRetryAt: new Date(),
    });
  });

  it("preloads webhooks in ONE findMany (deduped), never findFirst", async () => {
    // 3 deliveries: wh-A, wh-A (dup), wh-B → deduped IN-list [wh-A, wh-B]
    vi.mocked(database.webhookDeliveryLog.findMany).mockResolvedValue([
      delivery({ id: "d-1", webhookId: "wh-A" }),
      delivery({ id: "d-2", webhookId: "wh-A" }),
      delivery({ id: "d-3", webhookId: "wh-B" }),
    ] as never);
    vi.mocked(database.outboundWebhook.findMany).mockResolvedValue([
      webhook({ id: "wh-A" }),
      webhook({ id: "wh-B" }),
    ] as never);
    vi.mocked(sendWebhook).mockResolvedValue(SUCCESS);

    const res = await POST(req({}));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.retried).toBe(3);
    // N+1 collapse: exactly ONE findMany with the deduped id list; findFirst NEVER.
    expect(database.outboundWebhook.findMany).toHaveBeenCalledTimes(1);
    expect(database.outboundWebhook.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: "tenant_test",
        id: { in: ["wh-A", "wh-B"] },
        deletedAt: null,
      },
    });
    expect(database.outboundWebhook.findFirst).not.toHaveBeenCalled();
  });

  it("accumulates consecutiveFailures across same-webhook deliveries (feed-back guard)", async () => {
    // Two FAILING deliveries to wh-A whose consecutiveFailures starts at 2.
    vi.mocked(database.webhookDeliveryLog.findMany).mockResolvedValue([
      delivery({ id: "d-1", webhookId: "wh-A" }),
      delivery({ id: "d-2", webhookId: "wh-A" }),
    ] as never);
    vi.mocked(database.outboundWebhook.findMany).mockResolvedValue([
      webhook({ id: "wh-A", consecutiveFailures: 2 }),
    ] as never);
    vi.mocked(sendWebhook).mockResolvedValue(FAILURE);
    // Isolate the accumulation from auto-disable (status feed-back tested separately).
    vi.mocked(shouldAutoDisable).mockReturnValue(false);

    await POST(req({}));

    // Two outboundWebhook.update calls. The first bumps 2→3; the second MUST
    // observe the fed-back 3 and bump to 4 (a snapshot would freeze both at 3).
    const updates = vi
      .mocked(database.outboundWebhook.update)
      .mock.calls.map(
        (c) =>
          (c[0] as { data: { consecutiveFailures: number } }).data
            .consecutiveFailures
      );
    expect(updates).toEqual([3, 4]);
  });

  it("propagates auto-disable to a later same-webhook delivery (status feed-back)", async () => {
    // Delivery 1 fails + trips auto-disable → status="disabled" fed back.
    // Delivery 2 to the SAME webhook must be skipped by the inactive guard
    // (no sendWebhook), matching the prior per-delivery findFirst re-read.
    vi.mocked(database.webhookDeliveryLog.findMany).mockResolvedValue([
      delivery({ id: "d-1", webhookId: "wh-A" }),
      delivery({ id: "d-2", webhookId: "wh-A" }),
    ] as never);
    vi.mocked(database.outboundWebhook.findMany).mockResolvedValue([
      webhook({ id: "wh-A", consecutiveFailures: 4, status: "active" }),
    ] as never);
    vi.mocked(sendWebhook).mockResolvedValue(FAILURE);
    vi.mocked(shouldAutoDisable).mockReturnValue(true);

    await POST(req({}));

    // Delivery 1 sends (then disables); delivery 2 is skipped before the send.
    expect(sendWebhook).toHaveBeenCalledTimes(1);
    // Delivery 2 marked failed via the inactive branch, naming the disabled status.
    const deliveryLogUpdates = vi
      .mocked(database.webhookDeliveryLog.update)
      .mock.calls.map(
        (c) =>
          (c[0] as { data: { errorMessage: string | null } }).data.errorMessage
      );
    expect(deliveryLogUpdates).toContain("Webhook is disabled");
    // And the outbound webhook was disabled exactly once (delivery 1).
    const statusUpdates = vi
      .mocked(database.outboundWebhook.update)
      .mock.calls.map(
        (c) => (c[0] as { data: { status?: string } }).data.status
      );
    expect(statusUpdates.filter((s) => s === "disabled")).toHaveLength(1);
  });

  it("treats a preloaded-miss (deleted) webhook as failed, no send", async () => {
    vi.mocked(database.webhookDeliveryLog.findMany).mockResolvedValue([
      delivery({ id: "d-1", webhookId: "wh-gone" }),
    ] as never);
    // Preload returns nothing for wh-gone (deleted → filtered by deletedAt: null).
    vi.mocked(database.outboundWebhook.findMany).mockResolvedValue([] as never);

    await POST(req({}));

    expect(database.webhookDeliveryLog.update).toHaveBeenCalledWith({
      where: { tenantId_id: { tenantId: "tenant_test", id: "d-1" } },
      data: expect.objectContaining({
        status: "failed",
        errorMessage: "Webhook configuration was deleted",
      }),
    });
    expect(sendWebhook).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated requests with 401 before any DB read", async () => {
    vi.mocked(auth).mockResolvedValue({ orgId: null } as never);
    const res = await POST(req({}));
    expect(res.status).toBe(401);
    expect(database.webhookDeliveryLog.findMany).not.toHaveBeenCalled();
    expect(database.outboundWebhook.findMany).not.toHaveBeenCalled();
  });
});
