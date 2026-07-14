/**
 * POST /api/integrations/webhooks/trigger — per-webhook serial send/write loop
 * → concurrent Promise.all wave (#25, sibling of webhooks/retry #25d).
 *
 * The discriminating guards:
 *  (1) CONCURRENCY — N triggered webhooks send concurrently (max-in-flight of
 *      sendWebhook === N). A reverted serial for-of would cap at 1.
 *  (2) PER-WEBHOOK INDEPENDENCE — each outboundWebhook.update is keyed by its
 *      OWN webhook.id and each deliveryLog.create carries its OWN webhookId, so
 *      no two concurrent iterations contend on the same row (the safety premise
 *      for parallelizing).
 *  (3) preserved response shape + order — { triggered, results[] } with results
 *      in triggeredWebhooks order (Promise.all preserves index order).
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
  buildWebhookPayload: vi.fn(() => ({ built: true })),
  sendWebhook: vi.fn(),
  determineNextStatus: vi.fn(),
  shouldAutoDisable: vi.fn(),
  shouldTriggerWebhook: vi.fn(),
}));

vi.mock("@repo/database", () => ({
  database: {
    webhookDeliveryLog: {
      create: vi.fn(),
      update: vi.fn(),
    },
    outboundWebhook: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import {
  determineNextStatus,
  sendWebhook,
  shouldAutoDisable,
  shouldTriggerWebhook,
} from "@repo/notifications";
import { POST } from "@/app/api/integrations/webhooks/trigger/route";
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

function webhook(
  over: Partial<{
    id: string;
    name: string;
    consecutiveFailures: number;
    status: string;
  }> = {}
) {
  return {
    tenantId: "tenant_test",
    id: over.id ?? "wh-A",
    name: over.name ?? "A",
    url: `https://example.com/hook/${over.id ?? "wh-A"}`,
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
    consecutiveFailures: over.consecutiveFailures ?? 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };
}

function req(body: unknown) {
  return new NextRequest("http://x/api/integrations/webhooks/trigger", {
    method: "POST",
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0];
}

describe("POST /api/integrations/webhooks/trigger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      userId: "u-1",
      orgId: "org_test",
    } as never);
    vi.mocked(getTenantIdForOrg).mockResolvedValue("tenant_test");
    vi.mocked(shouldTriggerWebhook).mockReturnValue(true);
    // Distinct delivery-log id per webhook so each iteration writes its own row.
    vi.mocked(database.webhookDeliveryLog.create).mockImplementation(
      (async (args: { data: { webhookId: string } }) => ({
        id: `dl-${args.data.webhookId}`,
      })) as never
    );
    vi.mocked(database.webhookDeliveryLog.update).mockResolvedValue(
      {} as never
    );
    vi.mocked(database.outboundWebhook.update).mockResolvedValue({} as never);
    vi.mocked(determineNextStatus).mockReturnValue({
      status: "success",
      nextRetryAt: new Date(),
    });
  });

  it("sends to N webhooks concurrently (max-in-flight === N), not serially", async () => {
    vi.mocked(database.outboundWebhook.findMany).mockResolvedValue([
      webhook({ id: "wh-A", name: "A" }),
      webhook({ id: "wh-B", name: "B" }),
      webhook({ id: "wh-C", name: "C" }),
    ] as never);

    // Concurrency probe: each send yields on setTimeout(0); if the loop is
    // serial, max-in-flight caps at 1. If concurrent (Promise.all), it reaches N.
    let inFlight = 0;
    let maxInFlight = 0;
    vi.mocked(sendWebhook).mockImplementation(async () => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((r) => setTimeout(r, 0));
      inFlight--;
      return SUCCESS;
    });

    const res = await POST(
      req({
        data: { x: 1 },
        entityId: "e-1",
        entityType: "event",
        eventType: "created",
      })
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.triggered).toBe(3);
    expect(sendWebhook).toHaveBeenCalledTimes(3);
    expect(maxInFlight).toBe(3); // ← the concurrency guard
  });

  it("updates each webhook's OWN row (per-webhook independence + order)", async () => {
    vi.mocked(database.outboundWebhook.findMany).mockResolvedValue([
      webhook({ id: "wh-A", name: "Alpha" }),
      webhook({ id: "wh-B", name: "Bravo" }),
    ] as never);
    vi.mocked(sendWebhook).mockResolvedValue(SUCCESS);

    const res = await POST(
      req({
        data: {},
        entityId: "e-1",
        entityType: "event",
        eventType: "updated",
      })
    );
    const body = await res.json();

    // Each deliveryLog.create carries its OWN webhookId (no cross-contamination).
    const createdWebhookIds = vi
      .mocked(database.webhookDeliveryLog.create)
      .mock.calls.map(
        (c) => (c[0] as { data: { webhookId: string } }).data.webhookId
      );
    expect(createdWebhookIds).toEqual(["wh-A", "wh-B"]);

    // Each outboundWebhook.update keyed by its OWN webhook.id (distinct rows).
    const updatedWebhookIds = vi
      .mocked(database.outboundWebhook.update)
      .mock.calls.map(
        (c) =>
          (c[0] as { where: { tenantId_id: { id: string } } }).where.tenantId_id
            .id
      );
    expect(updatedWebhookIds).toEqual(["wh-A", "wh-B"]);

    // Results in triggeredWebhooks order (Promise.all preserves index order).
    expect(body.results).toEqual([
      {
        webhookId: "wh-A",
        webhookName: "Alpha",
        success: true,
        deliveryLogId: "dl-wh-A",
      },
      {
        webhookId: "wh-B",
        webhookName: "Bravo",
        success: true,
        deliveryLogId: "dl-wh-B",
      },
    ]);
  });

  it("resets consecutiveFailures on success and bumps + auto-disables only the failing webhook", async () => {
    vi.mocked(database.outboundWebhook.findMany).mockResolvedValue([
      webhook({ id: "wh-A", consecutiveFailures: 4 }), // succeeds → resets to 0
      webhook({ id: "wh-B", consecutiveFailures: 4 }), // fails → 5 + auto-disable
    ] as never);
    vi.mocked(sendWebhook).mockImplementation(
      (async (config: { url: string }) =>
        config.url.endsWith("/wh-B") ? FAILURE : SUCCESS) as never
    );
    vi.mocked(shouldAutoDisable).mockReturnValue(true);

    await POST(
      req({
        data: {},
        entityId: "e-1",
        entityType: "event",
        eventType: "created",
      })
    );

    const statsUpdates = vi
      .mocked(database.outboundWebhook.update)
      .mock.calls.map((c) => {
        const data = c[0] as {
          where: { tenantId_id: { id: string } };
          data: { consecutiveFailures: number; status?: string };
        };
        return { id: data.where.tenantId_id.id, ...data.data };
      });

    const a = statsUpdates.find((u) => u.id === "wh-A");
    const b = statsUpdates.find((u) => u.id === "wh-B");
    expect(a?.consecutiveFailures).toBe(0);
    expect(a?.status).toBeUndefined(); // success never disables
    expect(b?.consecutiveFailures).toBe(5);
    expect(b?.status).toBe("disabled"); // only the failing webhook disables itself
  });

  it("returns { triggered: 0, results: [] } and does no work when no webhook matches", async () => {
    vi.mocked(database.outboundWebhook.findMany).mockResolvedValue([
      webhook({ id: "wh-A" }),
    ] as never);
    vi.mocked(shouldTriggerWebhook).mockReturnValue(false); // filter rejects all

    const res = await POST(
      req({
        data: {},
        entityId: "e-1",
        entityType: "event",
        eventType: "created",
      })
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ triggered: 0, results: [] });
    expect(database.webhookDeliveryLog.create).not.toHaveBeenCalled();
    expect(sendWebhook).not.toHaveBeenCalled();
    expect(database.outboundWebhook.update).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated requests with 401 before any DB read", async () => {
    vi.mocked(auth).mockResolvedValue({ orgId: null } as never);
    const res = await POST(
      req({
        data: {},
        entityId: "e-1",
        entityType: "event",
        eventType: "created",
      })
    );
    expect(res.status).toBe(401);
    expect(database.outboundWebhook.findMany).not.toHaveBeenCalled();
    expect(sendWebhook).not.toHaveBeenCalled();
  });
});
