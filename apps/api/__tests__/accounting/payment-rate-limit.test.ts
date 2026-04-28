/**
 * Payment Sensitive-Mutation Rate Limit Test Suite
 *
 * Verifies that PUT (process) and POST (refund) on
 * `/api/accounting/payments/[id]` are protected by a tighter, dedicated
 * rate limit than the global 100/min ceiling.
 *
 * Why these tests matter:
 *   - The global rate limiter caps EVERY authenticated request at
 *     100/min/tenant. For money-moving operations that's too generous: a
 *     leaked session can still drive ~100 charge or refund attempts per
 *     minute before tripping the global ceiling, which is enough to
 *     drain an event's refund budget or hammer the payment processor
 *     into a fraud lock.
 *   - The sensitive throttle (20/min via the `payments_sensitive` Redis
 *     bucket) MUST run BEFORE we touch the database or the gateway.
 *     Otherwise a throttled caller would still consume DB capacity by
 *     looping `findFirst` lookups, defeating the purpose of the limit.
 *   - The 429 path MUST short-circuit and return the limiter's response
 *     verbatim — no DB writes, no gateway calls, no 200 leaking back.
 *   - Redis outages MUST fail OPEN (limiter returns success=true with
 *     no `response` object) so an Upstash failure does not lock all
 *     payment mutations behind a 5xx wall. The route handler is
 *     responsible for treating "no response object" as "proceed".
 *
 * Contract pinned by these tests:
 *   - When `checkRateLimit` returns `{ success: false, response }`, the
 *     handler returns that exact response with status 429 and the
 *     `payments_sensitive` headers untouched.
 *   - When the limiter returns 429, NO DB query and NO gateway call
 *     happens — verified via mock call counts.
 *   - When the limiter returns success (the happy path or fail-open),
 *     the request proceeds normally.
 *   - The limiter is invoked with the tenant ID from `requireTenantId()`
 *     and the `payments_sensitive` prefix + 20/1m options.
 *
 * @vitest-environment node
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const PAYMENT_ID = "11111111-1111-1111-1111-111111111111";
const INVOICE_ID = "22222222-2222-2222-2222-222222222222";

const mocks = vi.hoisted(() => ({
  paymentFindFirstMock: vi.fn(),
  paymentUpdateMock: vi.fn(),
  invoiceFindFirstMock: vi.fn(),
  invoiceUpdateMock: vi.fn(),
  requireTenantIdMock: vi.fn(),
  captureExceptionMock: vi.fn(),
  processPaymentGatewayMock: vi.fn(),
  refundPaymentGatewayMock: vi.fn(),
  checkRateLimitMock: vi.fn(),
}));

vi.mock("@repo/database", () => ({
  database: {
    payment: {
      findFirst: mocks.paymentFindFirstMock,
      update: mocks.paymentUpdateMock,
    },
    invoice: {
      findFirst: mocks.invoiceFindFirstMock,
      update: mocks.invoiceUpdateMock,
    },
  },
}));

vi.mock("@/app/lib/tenant", () => ({
  requireTenantId: mocks.requireTenantIdMock,
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: mocks.captureExceptionMock,
}));

vi.mock("@/app/api/accounting/payments/[id]/gateway", () => ({
  processPaymentGateway: mocks.processPaymentGatewayMock,
  refundPaymentGateway: mocks.refundPaymentGatewayMock,
}));

vi.mock("@/middleware/rate-limiter", () => ({
  checkRateLimit: mocks.checkRateLimitMock,
}));

import { NextRequest, NextResponse } from "next/server";
import { POST, PUT } from "@/app/api/accounting/payments/[id]/route";

const completedPayment = {
  tenantId: TENANT_ID,
  id: PAYMENT_ID,
  amount: { toString: () => "100.00" } as unknown as number,
  currency: "USD",
  status: "COMPLETED",
  methodType: "CREDIT_CARD",
  invoiceId: INVOICE_ID,
  eventId: "33333333-3333-3333-3333-333333333333",
  clientId: null,
  gatewayTransactionId: "txn_existing",
  gatewayPaymentMethodId: null,
  processor: "stripe",
  processedAt: new Date("2026-04-20T00:00:00.000Z"),
  completedAt: new Date("2026-04-20T00:00:00.000Z"),
  refundedAt: null as Date | null,
  createdAt: new Date("2026-04-20T00:00:00.000Z"),
  updatedAt: new Date("2026-04-20T00:00:00.000Z"),
  deletedAt: null as Date | null,
};

function buildPutRequest() {
  return new NextRequest(
    `http://localhost/api/accounting/payments/${PAYMENT_ID}`,
    {
      method: "PUT",
      headers: { "content-type": "application/json" },
    }
  );
}

function buildPostRequest(body: unknown) {
  return new NextRequest(
    `http://localhost/api/accounting/payments/${PAYMENT_ID}`,
    {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    }
  );
}

function makeThrottleResponse() {
  // Mirror the shape `createRateLimitedResponse` produces in
  // middleware/rate-limiter.ts so handlers see the real wire contract.
  return NextResponse.json(
    {
      message: "Too many requests. Please try again later.",
      limit: 20,
      remaining: 0,
      reset: new Date(Date.now() + 30_000).toISOString(),
    },
    {
      status: 429,
      headers: {
        "x-ratelimit-limit": "20",
        "x-ratelimit-remaining": "0",
        "retry-after": "30",
      },
    }
  );
}

beforeEach(() => {
  for (const fn of Object.values(mocks)) {
    fn.mockReset();
  }
  mocks.requireTenantIdMock.mockResolvedValue(TENANT_ID);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("Sensitive-mutation rate limiting", () => {
  describe("PUT /api/accounting/payments/[id] (process)", () => {
    it("returns 429 from the limiter and skips DB + gateway entirely", async () => {
      const throttle = makeThrottleResponse();
      mocks.checkRateLimitMock.mockResolvedValue({
        success: false,
        limit: 20,
        remaining: 0,
        reset: new Date(Date.now() + 30_000),
        response: throttle,
      });

      const res = await PUT(buildPutRequest(), {
        params: Promise.resolve({ id: PAYMENT_ID }),
      });

      expect(res.status).toBe(429);
      // The exact response object from the limiter must be returned —
      // headers, body, retry-after — so clients see the same throttle
      // contract the global limiter gives them.
      expect(res).toBe(throttle);
      // No DB lookups, no gateway calls. The whole point of the limit
      // is to short-circuit BEFORE consuming any backend resources.
      expect(mocks.paymentFindFirstMock).not.toHaveBeenCalled();
      expect(mocks.paymentUpdateMock).not.toHaveBeenCalled();
      expect(mocks.processPaymentGatewayMock).not.toHaveBeenCalled();
    });

    it("invokes the limiter with tenantId and the payments_sensitive options", async () => {
      mocks.checkRateLimitMock.mockResolvedValue({
        success: true,
        limit: 20,
        remaining: 19,
        reset: new Date(Date.now() + 60_000),
      });
      mocks.paymentFindFirstMock.mockResolvedValue(completedPayment);
      mocks.processPaymentGatewayMock.mockResolvedValue({
        success: true,
        transactionId: "txn_ok",
      });
      mocks.paymentUpdateMock.mockResolvedValue({
        ...completedPayment,
        amount: { toString: () => "100.00" },
      });

      // Force PENDING so the business-rule guard accepts a process call.
      mocks.paymentFindFirstMock.mockResolvedValueOnce({
        ...completedPayment,
        status: "PENDING",
      });

      await PUT(buildPutRequest(), {
        params: Promise.resolve({ id: PAYMENT_ID }),
      });

      expect(mocks.checkRateLimitMock).toHaveBeenCalledTimes(1);
      const [, tenantArg, optionsArg] = mocks.checkRateLimitMock.mock.calls[0];
      expect(tenantArg).toBe(TENANT_ID);
      expect(optionsArg).toEqual({
        limit: 20,
        window: "1m",
        prefix: "payments_sensitive",
      });
    });

    it("fails OPEN when the limiter returns success=true with no response (Redis outage)", async () => {
      // Simulates the fail-open branch in rate-limiter.ts (line 415):
      // Redis is down, the limiter swallows the error and returns
      // success=true with the full quota as `remaining`.
      mocks.checkRateLimitMock.mockResolvedValue({
        success: true,
        limit: 20,
        remaining: 20,
        reset: new Date(Date.now() + 60_000),
      });
      mocks.paymentFindFirstMock.mockResolvedValue({
        ...completedPayment,
        status: "PENDING",
      });
      mocks.processPaymentGatewayMock.mockResolvedValue({
        success: true,
        transactionId: "txn_failopen_ok",
      });
      mocks.paymentUpdateMock.mockResolvedValue({
        ...completedPayment,
        status: "COMPLETED",
        amount: { toString: () => "100.00" },
      });

      const res = await PUT(buildPutRequest(), {
        params: Promise.resolve({ id: PAYMENT_ID }),
      });

      // Outage MUST NOT lock out payment mutations. We degrade to "global
      // limit only" and let the request through.
      expect(res.status).toBe(200);
      expect(mocks.processPaymentGatewayMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("POST /api/accounting/payments/[id] (refund)", () => {
    it("returns 429 from the limiter and skips body parse + DB + gateway", async () => {
      const throttle = makeThrottleResponse();
      mocks.checkRateLimitMock.mockResolvedValue({
        success: false,
        limit: 20,
        remaining: 0,
        reset: new Date(Date.now() + 30_000),
        response: throttle,
      });

      const res = await POST(
        buildPostRequest({ amount: 50, reason: "duplicate" }),
        { params: Promise.resolve({ id: PAYMENT_ID }) }
      );

      expect(res.status).toBe(429);
      expect(res).toBe(throttle);
      // Refund-spam protection: no DB lookups, no processor call. If
      // any of these fired, an attacker could still drive Stripe API
      // load even while throttled.
      expect(mocks.paymentFindFirstMock).not.toHaveBeenCalled();
      expect(mocks.paymentUpdateMock).not.toHaveBeenCalled();
      expect(mocks.refundPaymentGatewayMock).not.toHaveBeenCalled();
      expect(mocks.invoiceUpdateMock).not.toHaveBeenCalled();
    });

    it("invokes the limiter with tenantId and the payments_sensitive options", async () => {
      mocks.checkRateLimitMock.mockResolvedValue({
        success: true,
        limit: 20,
        remaining: 19,
        reset: new Date(Date.now() + 60_000),
      });
      mocks.paymentFindFirstMock.mockResolvedValue(completedPayment);
      mocks.invoiceFindFirstMock.mockResolvedValue({
        tenantId: TENANT_ID,
        id: INVOICE_ID,
        amountPaid: 100,
        amountDue: 0,
        status: "PAID",
        paidAt: new Date(),
        deletedAt: null,
      });
      mocks.refundPaymentGatewayMock.mockResolvedValue({
        success: true,
        refundTransactionId: "re_ok",
      });
      mocks.paymentUpdateMock.mockResolvedValue({
        ...completedPayment,
        status: "REFUNDED",
        amount: { toString: () => "100.00" },
      });

      await POST(buildPostRequest({ amount: 100, reason: "test" }), {
        params: Promise.resolve({ id: PAYMENT_ID }),
      });

      expect(mocks.checkRateLimitMock).toHaveBeenCalledTimes(1);
      const [, tenantArg, optionsArg] = mocks.checkRateLimitMock.mock.calls[0];
      expect(tenantArg).toBe(TENANT_ID);
      expect(optionsArg).toEqual({
        limit: 20,
        window: "1m",
        prefix: "payments_sensitive",
      });
    });

    it("fails OPEN when the limiter returns success=true with no response (Redis outage)", async () => {
      mocks.checkRateLimitMock.mockResolvedValue({
        success: true,
        limit: 20,
        remaining: 20,
        reset: new Date(Date.now() + 60_000),
      });
      mocks.paymentFindFirstMock.mockResolvedValue(completedPayment);
      mocks.invoiceFindFirstMock.mockResolvedValue({
        tenantId: TENANT_ID,
        id: INVOICE_ID,
        amountPaid: 100,
        amountDue: 0,
        status: "PAID",
        paidAt: new Date(),
        deletedAt: null,
      });
      mocks.refundPaymentGatewayMock.mockResolvedValue({
        success: true,
        refundTransactionId: "re_failopen_ok",
      });
      mocks.paymentUpdateMock.mockResolvedValue({
        ...completedPayment,
        status: "REFUNDED",
        amount: { toString: () => "100.00" },
      });

      const res = await POST(
        buildPostRequest({ amount: 100, reason: "outage degraded" }),
        { params: Promise.resolve({ id: PAYMENT_ID }) }
      );

      expect(res.status).toBe(200);
      expect(mocks.refundPaymentGatewayMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("ordering invariant: limiter runs BEFORE auth-bound DB work", () => {
    it("PUT calls limiter after requireTenantId but before payment.findFirst", async () => {
      const callOrder: string[] = [];
      mocks.requireTenantIdMock.mockImplementation(() => {
        callOrder.push("requireTenantId");
        return Promise.resolve(TENANT_ID);
      });
      mocks.checkRateLimitMock.mockImplementation(() => {
        callOrder.push("checkRateLimit");
        return Promise.resolve({
          success: true,
          limit: 20,
          remaining: 19,
          reset: new Date(Date.now() + 60_000),
        });
      });
      mocks.paymentFindFirstMock.mockImplementation(() => {
        callOrder.push("payment.findFirst");
        return Promise.resolve({ ...completedPayment, status: "PENDING" });
      });
      mocks.processPaymentGatewayMock.mockResolvedValue({
        success: true,
        transactionId: "txn_order",
      });
      mocks.paymentUpdateMock.mockResolvedValue({
        ...completedPayment,
        amount: { toString: () => "100.00" },
      });

      await PUT(buildPutRequest(), {
        params: Promise.resolve({ id: PAYMENT_ID }),
      });

      // Tenant resolution must come first (we need a key to bucket
      // against). The limiter must come BEFORE any DB read so 429
      // costs zero query budget. Then the regular handler proceeds.
      expect(callOrder.slice(0, 3)).toEqual([
        "requireTenantId",
        "checkRateLimit",
        "payment.findFirst",
      ]);
    });

    it("POST calls limiter after requireTenantId but before payment.findFirst", async () => {
      const callOrder: string[] = [];
      mocks.requireTenantIdMock.mockImplementation(() => {
        callOrder.push("requireTenantId");
        return Promise.resolve(TENANT_ID);
      });
      mocks.checkRateLimitMock.mockImplementation(() => {
        callOrder.push("checkRateLimit");
        return Promise.resolve({
          success: true,
          limit: 20,
          remaining: 19,
          reset: new Date(Date.now() + 60_000),
        });
      });
      mocks.paymentFindFirstMock.mockImplementation(() => {
        callOrder.push("payment.findFirst");
        return Promise.resolve(completedPayment);
      });
      mocks.invoiceFindFirstMock.mockResolvedValue({
        tenantId: TENANT_ID,
        id: INVOICE_ID,
        amountPaid: 100,
        amountDue: 0,
        status: "PAID",
        paidAt: new Date(),
        deletedAt: null,
      });
      mocks.refundPaymentGatewayMock.mockResolvedValue({
        success: true,
        refundTransactionId: "re_order",
      });
      mocks.paymentUpdateMock.mockResolvedValue({
        ...completedPayment,
        status: "REFUNDED",
        amount: { toString: () => "100.00" },
      });

      await POST(buildPostRequest({ amount: 100, reason: "order" }), {
        params: Promise.resolve({ id: PAYMENT_ID }),
      });

      expect(callOrder.slice(0, 3)).toEqual([
        "requireTenantId",
        "checkRateLimit",
        "payment.findFirst",
      ]);
    });
  });
});
