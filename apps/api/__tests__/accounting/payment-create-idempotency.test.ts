/**
 * Payment Creation Idempotency Test Suite
 *
 * Verifies the `Idempotency-Key` contract on `POST /api/accounting/payments`.
 *
 * Why these tests matter:
 *   - Without idempotency, a network retry of a successful payment-creation
 *     request silently creates a SECOND Payment row. Once a real Stripe
 *     charge call lands inside this handler, that becomes a duplicate
 *     charge against the cardholder.
 *   - The cache is shared across tenants by table but partitioned by
 *     `(tenantId, key)` PK. A regression that drops the tenant prefix would
 *     let tenant A replay tenant B's response — a critical isolation breach.
 *   - The cache must fail OPEN (a Prisma outage on `manifest_idempotency`
 *     must not block payment writes), otherwise we'd be making availability
 *     worse than not having idempotency at all.
 *   - Only successful 201 responses must be cached. Validation errors (4xx)
 *     must remain un-cached so the client can correct the body and retry
 *     under the same key without being permanently locked into the error.
 *
 * @vitest-environment node
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const TENANT_ID_OTHER = "00000000-0000-0000-0000-000000000002";
const INVOICE_ID = "11111111-1111-1111-1111-111111111111";
const EVENT_ID = "44444444-4444-4444-4444-444444444444";
const CLIENT_ID = "55555555-5555-5555-5555-555555555555";
const PAYMENT_ID = "33333333-3333-3333-3333-333333333333";

const mocks = vi.hoisted(() => ({
  paymentCreateMock: vi.fn(),
  invoiceFindFirstMock: vi.fn(),
  eventFindFirstMock: vi.fn(),
  manifestIdempotencyFindUniqueMock: vi.fn(),
  manifestIdempotencyUpsertMock: vi.fn(),
  requireTenantIdMock: vi.fn(),
}));

vi.mock("@repo/database", () => ({
  database: {
    payment: {
      create: mocks.paymentCreateMock,
      findMany: vi.fn(),
      count: vi.fn(),
    },
    invoice: {
      findFirst: mocks.invoiceFindFirstMock,
    },
    event: {
      findFirst: mocks.eventFindFirstMock,
    },
    manifestIdempotency: {
      findUnique: mocks.manifestIdempotencyFindUniqueMock,
      upsert: mocks.manifestIdempotencyUpsertMock,
    },
  },
}));

vi.mock("@/app/lib/tenant", () => ({
  requireTenantId: mocks.requireTenantIdMock,
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

import { NextRequest } from "next/server";
import { POST } from "@/app/api/accounting/payments/route";

const validBody = {
  invoiceId: INVOICE_ID,
  eventId: EVENT_ID,
  amount: 100,
  currency: "USD",
  methodType: "CREDIT_CARD",
};

function makeRequest(
  opts: {
    body?: unknown;
    idempotencyKey?: string;
    headerName?: "Idempotency-Key" | "X-Idempotency-Key";
  } = {}
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (opts.idempotencyKey !== undefined) {
    headers[opts.headerName ?? "Idempotency-Key"] = opts.idempotencyKey;
  }
  return new NextRequest(new URL("http://localhost/api/accounting/payments"), {
    method: "POST",
    body: JSON.stringify(opts.body ?? validBody),
    headers,
  });
}

const createdPayment = {
  tenantId: TENANT_ID,
  id: PAYMENT_ID,
  invoiceId: INVOICE_ID,
  eventId: EVENT_ID,
  clientId: CLIENT_ID,
  amount: 100,
  currency: "USD",
  status: "PENDING" as const,
  methodType: "CREDIT_CARD",
  gatewayPaymentMethodId: null,
  gatewayTransactionId: "PAY-test-1",
  processor: null,
  processedAt: new Date("2026-04-26T00:00:00.000Z"),
  completedAt: null,
  refundedAt: null,
  createdAt: new Date("2026-04-26T00:00:00.000Z"),
  updatedAt: new Date("2026-04-26T00:00:00.000Z"),
  deletedAt: null,
};

beforeEach(() => {
  mocks.requireTenantIdMock.mockReset();
  mocks.requireTenantIdMock.mockResolvedValue(TENANT_ID);
  mocks.paymentCreateMock.mockReset();
  mocks.paymentCreateMock.mockResolvedValue({
    ...createdPayment,
    amount: { toString: () => "100" },
  });
  mocks.invoiceFindFirstMock.mockReset();
  mocks.invoiceFindFirstMock.mockResolvedValue({
    tenantId: TENANT_ID,
    id: INVOICE_ID,
    clientId: CLIENT_ID,
    deletedAt: null,
  });
  mocks.eventFindFirstMock.mockReset();
  mocks.eventFindFirstMock.mockResolvedValue({
    tenantId: TENANT_ID,
    id: EVENT_ID,
    deletedAt: null,
  });
  mocks.manifestIdempotencyFindUniqueMock.mockReset();
  mocks.manifestIdempotencyFindUniqueMock.mockResolvedValue(null);
  mocks.manifestIdempotencyUpsertMock.mockReset();
  mocks.manifestIdempotencyUpsertMock.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/accounting/payments — Idempotency-Key contract", () => {
  it("without Idempotency-Key header: creates payment, never touches cache", async () => {
    const res = await POST(makeRequest());

    expect(res.status).toBe(201);
    expect(mocks.paymentCreateMock).toHaveBeenCalledTimes(1);
    // No header → no cache lookup, no cache store. Backwards compatible.
    expect(mocks.manifestIdempotencyFindUniqueMock).not.toHaveBeenCalled();
    expect(mocks.manifestIdempotencyUpsertMock).not.toHaveBeenCalled();
  });

  it("with new Idempotency-Key: creates payment AND stores response in cache", async () => {
    const res = await POST(makeRequest({ idempotencyKey: "idemp_abc123" }));

    expect(res.status).toBe(201);
    expect(mocks.paymentCreateMock).toHaveBeenCalledTimes(1);

    // Cache lookup must happen — short-circuit prerequisite.
    expect(mocks.manifestIdempotencyFindUniqueMock).toHaveBeenCalledTimes(1);
    expect(mocks.manifestIdempotencyFindUniqueMock).toHaveBeenCalledWith({
      where: {
        tenantId_key: {
          tenantId: TENANT_ID,
          // Composite key includes scope prefix to prevent cross-route replay.
          key: "http:accounting:payments:create:idemp_abc123",
        },
      },
    });

    // Successful 201 response must be persisted under the same composite key.
    expect(mocks.manifestIdempotencyUpsertMock).toHaveBeenCalledTimes(1);
    const upsertArgs = mocks.manifestIdempotencyUpsertMock.mock.calls[0][0];
    expect(upsertArgs.where).toEqual({
      tenantId_key: {
        tenantId: TENANT_ID,
        key: "http:accounting:payments:create:idemp_abc123",
      },
    });
    expect(upsertArgs.create.tenantId).toBe(TENANT_ID);
    expect(upsertArgs.create.key).toBe(
      "http:accounting:payments:create:idemp_abc123"
    );
    expect(upsertArgs.create.result).toMatchObject({
      status: 201,
      body: expect.objectContaining({ id: PAYMENT_ID, amount: "100" }),
    });
    expect(upsertArgs.create.expiresAt).toBeInstanceOf(Date);
  });

  it("X-Idempotency-Key alias is accepted (Stripe + internal compatibility)", async () => {
    const res = await POST(
      makeRequest({
        idempotencyKey: "idemp_xyz789",
        headerName: "X-Idempotency-Key",
      })
    );

    expect(res.status).toBe(201);
    expect(mocks.manifestIdempotencyFindUniqueMock).toHaveBeenCalledWith({
      where: {
        tenantId_key: {
          tenantId: TENANT_ID,
          key: "http:accounting:payments:create:idemp_xyz789",
        },
      },
    });
  });

  it("retry with previously-cached key: replays cached body+status, does NOT create payment", async () => {
    // Simulate a prior successful POST that landed a 201 in the cache.
    mocks.manifestIdempotencyFindUniqueMock.mockResolvedValueOnce({
      tenantId: TENANT_ID,
      key: "http:accounting:payments:create:idemp_replay",
      result: {
        status: 201,
        body: { id: PAYMENT_ID, amount: "100", status: "PENDING" },
      },
      expiresAt: new Date(Date.now() + 60_000),
    });

    const res = await POST(makeRequest({ idempotencyKey: "idemp_replay" }));

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual({ id: PAYMENT_ID, amount: "100", status: "PENDING" });

    // Replay header signals to the client that this was a cache hit.
    expect(res.headers.get("X-Idempotent-Replay")).toBe("true");

    // Critical: a duplicate Payment row MUST NOT be created on retry.
    expect(mocks.paymentCreateMock).not.toHaveBeenCalled();
    // Cache must not be re-written either (not strictly required but a good
    // signal that we short-circuited cleanly).
    expect(mocks.manifestIdempotencyUpsertMock).not.toHaveBeenCalled();
  });

  it("expired cache entry is treated as a miss → payment is created", async () => {
    mocks.manifestIdempotencyFindUniqueMock.mockResolvedValueOnce({
      tenantId: TENANT_ID,
      key: "http:accounting:payments:create:idemp_expired",
      result: { status: 201, body: { id: "stale" } },
      expiresAt: new Date(Date.now() - 1000),
    });

    const res = await POST(makeRequest({ idempotencyKey: "idemp_expired" }));

    expect(res.status).toBe(201);
    // Expired entry must NOT be replayed. New payment is created and the
    // cache row is overwritten via upsert.
    expect(mocks.paymentCreateMock).toHaveBeenCalledTimes(1);
    expect(mocks.manifestIdempotencyUpsertMock).toHaveBeenCalledTimes(1);
  });

  it("tenant isolation: same key under different tenant does NOT collide", async () => {
    // Simulate tenant A having cached a key.
    mocks.manifestIdempotencyFindUniqueMock.mockImplementationOnce(
      async (args: {
        where: { tenantId_key: { tenantId: string; key: string } };
      }) => {
        // Only returns a hit for tenant A's row.
        if (args.where.tenantId_key.tenantId === TENANT_ID) {
          return {
            tenantId: TENANT_ID,
            key: args.where.tenantId_key.key,
            result: { status: 201, body: { tenant: "A" } },
            expiresAt: new Date(Date.now() + 60_000),
          };
        }
        return null;
      }
    );

    // Tenant B sends the SAME client-supplied key.
    mocks.requireTenantIdMock.mockResolvedValueOnce(TENANT_ID_OTHER);

    const res = await POST(makeRequest({ idempotencyKey: "idemp_shared" }));

    // Tenant B must NOT see tenant A's cached body. A new payment is created.
    expect(res.status).toBe(201);
    expect(mocks.paymentCreateMock).toHaveBeenCalledTimes(1);
    expect(res.headers.get("X-Idempotent-Replay")).toBeNull();

    // Lookup was scoped to tenant B's tenantId — verifies the (tenantId, key)
    // composite key partitions cache reads by tenant.
    expect(mocks.manifestIdempotencyFindUniqueMock).toHaveBeenCalledWith({
      where: {
        tenantId_key: {
          tenantId: TENANT_ID_OTHER,
          key: "http:accounting:payments:create:idemp_shared",
        },
      },
    });
  });

  it("rejects empty Idempotency-Key with 400", async () => {
    const res = await POST(makeRequest({ idempotencyKey: "   " }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/empty/i);
    // Validation rejection short-circuits BEFORE any DB write.
    expect(mocks.paymentCreateMock).not.toHaveBeenCalled();
    expect(mocks.manifestIdempotencyFindUniqueMock).not.toHaveBeenCalled();
  });

  it("rejects oversized Idempotency-Key with 400", async () => {
    const oversized = "a".repeat(256);
    const res = await POST(makeRequest({ idempotencyKey: oversized }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/exceeds/i);
    expect(mocks.paymentCreateMock).not.toHaveBeenCalled();
  });

  it("rejects Idempotency-Key with disallowed characters with 400", async () => {
    // Spaces and slashes are outside the allowed [A-Za-z0-9_\-:.] set.
    const res = await POST(
      makeRequest({ idempotencyKey: "bad key/with spaces" })
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid characters/i);
    expect(mocks.paymentCreateMock).not.toHaveBeenCalled();
  });

  it("validation error (404 invoice) under a key is NOT cached — client may retry under same key", async () => {
    mocks.invoiceFindFirstMock.mockResolvedValueOnce(null);

    const res = await POST(makeRequest({ idempotencyKey: "idemp_invalid" }));

    expect(res.status).toBe(404);
    // Cache must NOT store the error response. If it did, the client would
    // be permanently locked into the failure under the same key.
    expect(mocks.manifestIdempotencyUpsertMock).not.toHaveBeenCalled();
  });

  it("fails OPEN: cache lookup throwing does not block payment creation", async () => {
    // Simulate Prisma outage on the manifest_idempotency table.
    mocks.manifestIdempotencyFindUniqueMock.mockRejectedValueOnce(
      new Error("Prisma cache outage")
    );

    const res = await POST(makeRequest({ idempotencyKey: "idemp_outage" }));

    // Critical: payment write must succeed even if the cache is down.
    // Worst-case degradation = duplicate-on-retry, same as no idempotency
    // at all. We never make availability worse by adding it.
    expect(res.status).toBe(201);
    expect(mocks.paymentCreateMock).toHaveBeenCalledTimes(1);
  });

  it("fails OPEN: cache store throwing does not corrupt the response", async () => {
    mocks.manifestIdempotencyUpsertMock.mockRejectedValueOnce(
      new Error("Prisma cache outage")
    );

    const res = await POST(makeRequest({ idempotencyKey: "idemp_storefail" }));

    // Payment was created; cache write failure is swallowed and logged.
    expect(res.status).toBe(201);
    expect(mocks.paymentCreateMock).toHaveBeenCalledTimes(1);
    const body = await res.json();
    expect(body.id).toBe(PAYMENT_ID);
  });
});
