/**
 * webhook-retry cron — N+1 batch-preload regression guard.
 *
 * The retry loop previously issued one `outboundWebhook.findFirst` per delivery
 * (up to MAX_RETRIES_PER_RUN=100 per tick), and multiple deliveries frequently
 * target the SAME webhook — so the same row was re-fetched repeatedly. It now
 * preloads the distinct webhooks once into a Map keyed by `${tenantId}|${id}`
 * (preserving the original (tenantId, id) scoping) and does an in-memory
 * lookup. These tests pin that collapse and the deleted/inactive short-circuits.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockDeliveryFindMany = vi.fn();
const mockDeliveryUpdate = vi.fn();
const mockWebhookFindMany = vi.fn();
const mockWebhookFindFirst = vi.fn(); // regression guard — must NEVER fire
const mockWebhookUpdate = vi.fn();
const mockDlqCreate = vi.fn();

vi.mock("@repo/database", () => ({
  database: {
    webhookDeliveryLog: {
      findMany: (...args: unknown[]) => mockDeliveryFindMany(...args),
      update: (...args: unknown[]) => mockDeliveryUpdate(...args),
    },
    outboundWebhook: {
      findMany: (...args: unknown[]) => mockWebhookFindMany(...args),
      findFirst: (...args: unknown[]) => mockWebhookFindFirst(...args),
      update: (...args: unknown[]) => mockWebhookUpdate(...args),
    },
    webhookDeadLetterQueue: {
      create: (...args: unknown[]) => mockDlqCreate(...args),
    },
  },
}));

const mockSendWebhook = vi.fn();
const mockDetermineNextStatus = vi.fn();
const mockShouldAutoDisable = vi.fn();

vi.mock("@repo/notifications", () => ({
  sendWebhook: (...args: unknown[]) => mockSendWebhook(...args),
  determineNextStatus: (...args: unknown[]) => mockDetermineNextStatus(...args),
  shouldAutoDisable: (...args: unknown[]) => mockShouldAutoDisable(...args),
}));

vi.mock("@/lib/prisma-utils", () => ({ toJson: vi.fn((v: unknown) => v) }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@repo/observability/log", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

const { GET } = await import("@/app/api/cron/webhook-retry/route");

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const TENANT_A = "00000000-0000-0000-0000-0000000000a1";
const TENANT_B = "00000000-0000-0000-0000-0000000000b2";

function authedRequest() {
  return new Request("http://test/api/cron/webhook-retry", {
    headers: { authorization: "Bearer test-secret" },
  });
}

/** A delivery row awaiting retry. */
function delivery(
  overrides: Partial<{
    id: string;
    tenantId: string;
    webhookId: string;
    attemptNumber: number;
    eventType: string;
    entityType: string;
    entityId: string;
    payload: unknown;
  }> = {}
) {
  return {
    id: "del-1",
    tenantId: TENANT_A,
    webhookId: "wh-1",
    attemptNumber: 1,
    eventType: "event.created",
    entityType: "event",
    entityId: "evt-1",
    payload: { hello: "world" },
    ...overrides,
  };
}

/** An active outbound webhook row (full projection — the route uses many fields). */
function webhook(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "wh-1",
    tenantId: TENANT_A,
    status: "active",
    url: "https://example.com/hook",
    secret: "shh",
    apiKey: null,
    timeoutMs: 5000,
    customHeaders: null,
    retryCount: 3,
    consecutiveFailures: 0,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = "test-secret";
  // Happy-path defaults; individual tests override as needed.
  mockSendWebhook.mockResolvedValue({
    success: true,
    httpStatus: 200,
    responseBody: "ok",
    errorMessage: null,
  });
  mockDetermineNextStatus.mockReturnValue({
    status: "success",
    nextRetryAt: new Date(),
  });
  mockShouldAutoDisable.mockReturnValue(false);
  mockDeliveryUpdate.mockResolvedValue({});
  mockWebhookUpdate.mockResolvedValue({});
  mockDlqCreate.mockResolvedValue({});
});

afterEach(() => {
  delete process.env.CRON_SECRET;
});

// ---------------------------------------------------------------------------

describe("GET /api/cron/webhook-retry — N+1 batch preload", () => {
  it("preloads distinct webhooks ONCE and never calls findFirst (dedupes same-webhookId)", async () => {
    // 3 deliveries, but only 2 distinct webhooks (wh-1 targeted twice).
    // A reverted-to-serial implementation would fire 3 findFirst; the preload
    // fires exactly 1 findMany regardless of delivery count.
    mockDeliveryFindMany.mockResolvedValue([
      delivery({ id: "del-1", webhookId: "wh-1" }),
      delivery({ id: "del-2", webhookId: "wh-1" }), // same webhook as del-1
      delivery({ id: "del-3", webhookId: "wh-2" }),
    ]);
    mockWebhookFindMany.mockResolvedValue([
      webhook({ id: "wh-1", tenantId: TENANT_A }),
      webhook({ id: "wh-2", tenantId: TENANT_A }),
    ]);

    const res = await GET(authedRequest());
    const json = await res.json();

    // Regression guard: N+1 collapsed.
    expect(mockWebhookFindMany).toHaveBeenCalledTimes(1);
    expect(mockWebhookFindFirst).not.toHaveBeenCalled();
    // The preload is scoped to the distinct webhook ids.
    expect(mockWebhookFindMany).toHaveBeenCalledWith({
      where: { id: { in: ["wh-1", "wh-2"] }, deletedAt: null },
    });

    // Behavior parity: all 3 deliveries sent + counted.
    expect(mockSendWebhook).toHaveBeenCalledTimes(3);
    expect(json).toMatchObject({ processed: 3, success: 3, failed: 0 });
  });

  it("preserves (tenantId, id) scoping — a webhook under the wrong tenant is treated as not found", async () => {
    // wh-9 exists in the preload result, but under TENANT_B. A delivery from
    // TENANT_A referencing wh-9 must NOT resolve it (the map key includes the
    // tenant) — same as findFirst({ tenantId, id }) returning null.
    mockDeliveryFindMany.mockResolvedValue([
      delivery({ id: "del-x", tenantId: TENANT_A, webhookId: "wh-9" }),
    ]);
    mockWebhookFindMany.mockResolvedValue([
      webhook({ id: "wh-9", tenantId: TENANT_B }),
    ]);

    const res = await GET(authedRequest());
    const json = await res.json();

    // Tenant-scoped map miss → "Webhook configuration was deleted" path.
    expect(mockSendWebhook).not.toHaveBeenCalled();
    expect(mockDeliveryUpdate).toHaveBeenCalledWith({
      where: { tenantId_id: { tenantId: TENANT_A, id: "del-x" } },
      data: expect.objectContaining({
        status: "failed",
        errorMessage: "Webhook configuration was deleted",
      }),
    });
    expect(json).toMatchObject({ processed: 1, success: 0, failed: 1 });
  });

  it("short-circuits an inactive webhook to failed without sending", async () => {
    mockDeliveryFindMany.mockResolvedValue([delivery()]);
    mockWebhookFindMany.mockResolvedValue([
      webhook({ id: "wh-1", status: "disabled" }),
    ]);

    const res = await GET(authedRequest());
    const json = await res.json();

    expect(mockSendWebhook).not.toHaveBeenCalled();
    expect(mockDeliveryUpdate).toHaveBeenCalledWith({
      where: { tenantId_id: { tenantId: TENANT_A, id: "del-1" } },
      data: expect.objectContaining({
        status: "failed",
        errorMessage: "Webhook is disabled",
      }),
    });
    expect(json).toMatchObject({ processed: 1, success: 0, failed: 1 });
  });

  it("returns processed:0 and skips the preload when there are no deliveries", async () => {
    mockDeliveryFindMany.mockResolvedValue([]);

    const res = await GET(authedRequest());
    const json = await res.json();

    expect(json).toMatchObject({ processed: 0, success: 0, failed: 0 });
    expect(mockWebhookFindMany).not.toHaveBeenCalled();
    expect(mockWebhookFindFirst).not.toHaveBeenCalled();
  });

  it("rejects with 401 when the bearer secret is wrong", async () => {
    const req = new Request("http://test/api/cron/webhook-retry", {
      headers: { authorization: "Bearer wrong-secret" },
    });
    const res = await GET(req);

    expect(res.status).toBe(401);
    expect(mockDeliveryFindMany).not.toHaveBeenCalled();
  });

  it("rejects with 503 when CRON_SECRET is not configured", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(new Request("http://test/api/cron/webhook-retry"));

    expect(res.status).toBe(503);
    expect(mockDeliveryFindMany).not.toHaveBeenCalled();
  });
});
