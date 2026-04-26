/**
 * Payment Process + Refund Cascade Test Suite
 *
 * Verifies that PUT /api/accounting/payments/[id] (process) and
 * POST /api/accounting/payments/[id] (refund) correctly mutate the payment
 * record AND cascade invoice balance + status changes.
 *
 * Why these tests matter:
 *   - The cascade math (amountPaid / amountDue / status) is the system of
 *     record for invoice receivables. A regression in the cascade is
 *     invisible until reconciliation — by which time accounting reports
 *     are already wrong.
 *   - The original refund implementation used the caller-supplied refund
 *     amount verbatim to debit `amountPaid` / credit `amountDue`, which let
 *     a caller over-refund (refund $200 against a $100 payment would push
 *     the invoice into a negative-paid / over-due state).
 *   - The original refund implementation never updated invoice.status, so a
 *     PAID invoice would stay PAID after money flowed back out — a silent
 *     ledger error.
 *   - These tests lock in the contract before a real Stripe gateway is wired
 *     up, so the refund cascade cannot regress while the gateway integration
 *     is in flight.
 *
 * @vitest-environment node
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const PAYMENT_ID = "33333333-3333-3333-3333-333333333333";
const INVOICE_ID = "11111111-1111-1111-1111-111111111111";
const EVENT_ID = "44444444-4444-4444-4444-444444444444";

const mocks = vi.hoisted(() => ({
  paymentFindFirstMock: vi.fn(),
  paymentUpdateMock: vi.fn(),
  invoiceFindFirstMock: vi.fn(),
  invoiceUpdateMock: vi.fn(),
  requireTenantIdMock: vi.fn(),
  checkSensitiveTenantRateLimitMock: vi.fn(),
  processPaymentGatewayMock: vi.fn(),
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

vi.mock("@/lib/sensitive-rate-limit", () => ({
  checkSensitiveTenantRateLimit: mocks.checkSensitiveTenantRateLimitMock,
}));

vi.mock("@/app/api/accounting/payments/gateway", () => ({
  processPaymentGateway: mocks.processPaymentGatewayMock,
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

import { NextRequest, NextResponse } from "next/server";
import { GET, POST, PUT } from "@/app/api/accounting/payments/[id]/route";

function makeRequest(body?: unknown, method: "PUT" | "POST" | "GET" = "PUT") {
  return new NextRequest(
    new URL(`http://localhost/api/accounting/payments/${PAYMENT_ID}`),
    {
      method,
      ...(body !== undefined
        ? {
            body: JSON.stringify(body),
            headers: { "Content-Type": "application/json" },
          }
        : {}),
    }
  );
}

const pendingPayment = {
  tenantId: TENANT_ID,
  id: PAYMENT_ID,
  amount: 100,
  currency: "USD",
  status: "PENDING" as const,
  methodType: "CREDIT_CARD",
  invoiceId: INVOICE_ID,
  eventId: EVENT_ID,
  clientId: null,
  gatewayTransactionId: null,
  gatewayPaymentMethodId: null,
  processor: null,
  processedAt: null,
  completedAt: null,
  refundedAt: null,
  createdAt: new Date("2026-04-26T00:00:00.000Z"),
  updatedAt: new Date("2026-04-26T00:00:00.000Z"),
  deletedAt: null,
};

const completedPayment = {
  ...pendingPayment,
  status: "COMPLETED" as const,
  processedAt: new Date("2026-04-26T01:00:00.000Z"),
  completedAt: new Date("2026-04-26T01:00:00.000Z"),
  gatewayTransactionId: "txn_existing",
};

const sentInvoice = {
  tenantId: TENANT_ID,
  id: INVOICE_ID,
  status: "SENT" as const,
  amountPaid: 0,
  amountDue: 100,
  total: 100,
  deletedAt: null,
};

const paidInvoice = {
  ...sentInvoice,
  status: "PAID" as const,
  amountPaid: 100,
  amountDue: 0,
};

const partiallyPaidInvoice = {
  ...sentInvoice,
  status: "PARTIALLY_PAID" as const,
  amountPaid: 40,
  amountDue: 60,
};

beforeEach(() => {
  mocks.requireTenantIdMock.mockResolvedValue(TENANT_ID);
  mocks.paymentFindFirstMock.mockReset();
  mocks.paymentUpdateMock.mockReset();
  mocks.invoiceFindFirstMock.mockReset();
  mocks.invoiceUpdateMock.mockReset();
  // Default: rate limit allows the request through.
  // Tests that exercise the 429 path override per-call.
  mocks.checkSensitiveTenantRateLimitMock.mockReset();
  mocks.checkSensitiveTenantRateLimitMock.mockResolvedValue(null);
  // Default: gateway dispatch succeeds with a deterministic transaction ID.
  // Tests that exercise the failure path override per-call. Note: tests must
  // NOT rely on `body.gatewayResponse` to drive PUT outcome — that path was
  // removed because it let any caller forge a successful charge.
  mocks.processPaymentGatewayMock.mockReset();
  mocks.processPaymentGatewayMock.mockResolvedValue({
    success: true,
    transactionId: "txn_test",
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/accounting/payments/[id]", () => {
  it("returns 200 + payment when found for tenant", async () => {
    mocks.paymentFindFirstMock.mockResolvedValue(completedPayment);

    const res = await GET(makeRequest(undefined, "GET"), {
      params: Promise.resolve({ id: PAYMENT_ID }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(PAYMENT_ID);
    expect(body.amount).toBe("100");
    expect(body.status).toBe("COMPLETED");
  });

  it("returns 404 when payment not found", async () => {
    mocks.paymentFindFirstMock.mockResolvedValue(null);

    const res = await GET(makeRequest(undefined, "GET"), {
      params: Promise.resolve({ id: PAYMENT_ID }),
    });

    expect(res.status).toBe(404);
  });
});

describe("PUT /api/accounting/payments/[id] — process payment", () => {
  it("on full success: marks payment COMPLETED and cascades invoice → PAID + paidAt set", async () => {
    mocks.paymentFindFirstMock.mockResolvedValue(pendingPayment);
    mocks.paymentUpdateMock.mockResolvedValue({
      ...pendingPayment,
      status: "COMPLETED",
      processedAt: new Date(),
      completedAt: new Date(),
      gatewayTransactionId: "txn_test",
    });
    mocks.invoiceFindFirstMock.mockResolvedValue(sentInvoice);
    mocks.invoiceUpdateMock.mockResolvedValue(paidInvoice);

    const res = await PUT(
      makeRequest({
        gatewayResponse: {
          code: "200",
          message: "OK",
          transactionId: "txn_test",
        },
      }),
      { params: Promise.resolve({ id: PAYMENT_ID }) }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("COMPLETED");

    // Payment write
    expect(mocks.paymentUpdateMock).toHaveBeenCalledTimes(1);
    expect(mocks.paymentUpdateMock.mock.calls[0][0].data).toMatchObject({
      status: "COMPLETED",
      gatewayTransactionId: "txn_test",
    });

    // Invoice cascade — full payment of $100 against $100 due → PAID + paidAt
    expect(mocks.invoiceUpdateMock).toHaveBeenCalledTimes(1);
    const invoiceCall = mocks.invoiceUpdateMock.mock.calls[0][0];
    expect(invoiceCall.data.amountPaid).toBe(100);
    expect(invoiceCall.data.amountDue).toBe(0);
    expect(invoiceCall.data.status).toBe("PAID");
    expect(invoiceCall.data.paidAt).toBeInstanceOf(Date);
  });

  it("on partial success: cascades invoice → PARTIALLY_PAID, no paidAt", async () => {
    // $40 payment against $100-due invoice → PARTIALLY_PAID
    mocks.paymentFindFirstMock.mockResolvedValue({
      ...pendingPayment,
      amount: 40,
    });
    mocks.paymentUpdateMock.mockResolvedValue({
      ...pendingPayment,
      amount: 40,
      status: "COMPLETED",
    });
    mocks.invoiceFindFirstMock.mockResolvedValue(sentInvoice);
    mocks.invoiceUpdateMock.mockResolvedValue(partiallyPaidInvoice);

    const res = await PUT(makeRequest({}), {
      params: Promise.resolve({ id: PAYMENT_ID }),
    });

    expect(res.status).toBe(200);
    const invoiceCall = mocks.invoiceUpdateMock.mock.calls[0][0];
    expect(invoiceCall.data.amountPaid).toBe(40);
    expect(invoiceCall.data.amountDue).toBe(60);
    expect(invoiceCall.data.status).toBe("PARTIALLY_PAID");
    expect(invoiceCall.data.paidAt).toBeUndefined();
  });

  it("on gateway failure: marks payment FAILED and does NOT cascade to invoice", async () => {
    // Failure path is now driven by the server-side gateway adapter, not the
    // request body. A real Stripe decline would be reported by the gateway
    // module; tests inject the equivalent failure result here.
    mocks.processPaymentGatewayMock.mockResolvedValue({
      success: false,
      transactionId: "txn_failed",
      failureReason: "card_declined",
    });
    mocks.paymentFindFirstMock.mockResolvedValue(pendingPayment);
    mocks.paymentUpdateMock.mockResolvedValue({
      ...pendingPayment,
      status: "FAILED",
      processedAt: new Date(),
      completedAt: null,
      gatewayTransactionId: "txn_failed",
    });

    const res = await PUT(makeRequest({}), {
      params: Promise.resolve({ id: PAYMENT_ID }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("FAILED");

    expect(mocks.paymentUpdateMock).toHaveBeenCalledTimes(1);
    expect(mocks.paymentUpdateMock.mock.calls[0][0].data).toMatchObject({
      status: "FAILED",
      completedAt: null,
      gatewayTransactionId: "txn_failed",
    });
    // Invoice MUST NOT be touched on a failed payment.
    expect(mocks.invoiceFindFirstMock).not.toHaveBeenCalled();
    expect(mocks.invoiceUpdateMock).not.toHaveBeenCalled();
  });

  it("ignores client-supplied `gatewayResponse` body — gateway outcome is server-side only", async () => {
    // SECURITY: prior versions read `body.gatewayResponse` and used its
    // `code` to decide COMPLETED vs FAILED. That let any authenticated
    // tenant caller forge a successful charge by sending
    // `{ gatewayResponse: { code: "200", transactionId: "x" } }` against a
    // PENDING payment, cascading a phantom credit into the invoice. The
    // gateway adapter is now the single source of truth.
    mocks.processPaymentGatewayMock.mockResolvedValue({
      success: false,
      transactionId: "txn_server_failed",
      failureReason: "insufficient_funds",
    });
    mocks.paymentFindFirstMock.mockResolvedValue(pendingPayment);
    mocks.paymentUpdateMock.mockResolvedValue({
      ...pendingPayment,
      status: "FAILED",
      processedAt: new Date(),
      completedAt: null,
      gatewayTransactionId: "txn_server_failed",
    });

    // Caller tries to forge success via the body. This MUST be ignored.
    const res = await PUT(
      makeRequest({
        gatewayResponse: {
          code: "200",
          message: "Forged",
          transactionId: "txn_attacker_controlled",
        },
      }),
      { params: Promise.resolve({ id: PAYMENT_ID }) }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    // Server-side gateway said failure → payment is FAILED regardless of body.
    expect(body.status).toBe("FAILED");

    // The persisted transaction ID is the server-side one, never the
    // attacker-controlled value from the request body.
    expect(mocks.paymentUpdateMock.mock.calls[0][0].data).toMatchObject({
      status: "FAILED",
      gatewayTransactionId: "txn_server_failed",
    });
    expect(
      mocks.paymentUpdateMock.mock.calls[0][0].data.gatewayTransactionId
    ).not.toBe("txn_attacker_controlled");

    // Server-side gateway must have been called with the server-known
    // payment metadata, not anything from the body.
    expect(mocks.processPaymentGatewayMock).toHaveBeenCalledTimes(1);
    expect(mocks.processPaymentGatewayMock.mock.calls[0][0]).toMatchObject({
      paymentId: PAYMENT_ID,
      tenantId: TENANT_ID,
      amount: 100,
      currency: "USD",
    });

    // Failed payment must not cascade to the invoice.
    expect(mocks.invoiceFindFirstMock).not.toHaveBeenCalled();
    expect(mocks.invoiceUpdateMock).not.toHaveBeenCalled();
  });

  it("uses server-generated transaction ID even when caller forges a `transactionId` in body", async () => {
    // Even on success, the persisted gateway transaction ID must come from
    // the server-side gateway adapter, not from the request body.
    mocks.processPaymentGatewayMock.mockResolvedValue({
      success: true,
      transactionId: "txn_server_generated",
    });
    mocks.paymentFindFirstMock.mockResolvedValue(pendingPayment);
    mocks.paymentUpdateMock.mockResolvedValue({
      ...pendingPayment,
      status: "COMPLETED",
      processedAt: new Date(),
      completedAt: new Date(),
      gatewayTransactionId: "txn_server_generated",
    });
    mocks.invoiceFindFirstMock.mockResolvedValue(sentInvoice);
    mocks.invoiceUpdateMock.mockResolvedValue(paidInvoice);

    const res = await PUT(
      makeRequest({
        gatewayResponse: {
          code: "200",
          transactionId: "txn_attacker_controlled",
        },
      }),
      { params: Promise.resolve({ id: PAYMENT_ID }) }
    );

    expect(res.status).toBe(200);
    expect(mocks.paymentUpdateMock.mock.calls[0][0].data).toMatchObject({
      status: "COMPLETED",
      gatewayTransactionId: "txn_server_generated",
    });
    expect(
      mocks.paymentUpdateMock.mock.calls[0][0].data.gatewayTransactionId
    ).not.toBe("txn_attacker_controlled");
  });

  it("returns 404 when payment not found for tenant", async () => {
    mocks.paymentFindFirstMock.mockResolvedValue(null);

    const res = await PUT(makeRequest({}), {
      params: Promise.resolve({ id: PAYMENT_ID }),
    });

    expect(res.status).toBe(404);
    expect(mocks.paymentUpdateMock).not.toHaveBeenCalled();
    expect(mocks.invoiceUpdateMock).not.toHaveBeenCalled();
  });

  it("rejects processing a payment that is already COMPLETED", async () => {
    mocks.paymentFindFirstMock.mockResolvedValue(completedPayment);

    const res = await PUT(makeRequest({}), {
      params: Promise.resolve({ id: PAYMENT_ID }),
    });

    // validatePaymentBusinessRules throws an Error → caught → 500
    expect(res.status).toBe(500);
    expect(mocks.paymentUpdateMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/accounting/payments/[id] — refund payment", () => {
  it("full refund: marks payment REFUNDED and cascades invoice PAID → SENT", async () => {
    mocks.paymentFindFirstMock.mockResolvedValue(completedPayment);
    mocks.paymentUpdateMock.mockResolvedValue({
      ...completedPayment,
      status: "REFUNDED",
      refundedAt: new Date(),
    });
    mocks.invoiceFindFirstMock.mockResolvedValue(paidInvoice);
    mocks.invoiceUpdateMock.mockResolvedValue({
      ...paidInvoice,
      status: "SENT",
      amountPaid: 0,
      amountDue: 100,
    });

    const res = await POST(
      makeRequest({ amount: 100, reason: "Customer requested" }, "POST"),
      { params: Promise.resolve({ id: PAYMENT_ID }) }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("REFUNDED");

    // Invoice cascade: PAID → SENT (no payments left on invoice)
    expect(mocks.invoiceUpdateMock).toHaveBeenCalledTimes(1);
    const invoiceCall = mocks.invoiceUpdateMock.mock.calls[0][0];
    expect(invoiceCall.data.amountPaid).toBe(0);
    expect(invoiceCall.data.amountDue).toBe(100);
    expect(invoiceCall.data.status).toBe("SENT");
    expect(invoiceCall.data.paidAt).toBeNull();
  });

  it("partial refund: marks payment PARTIALLY_REFUNDED and invoice stays PARTIALLY_PAID", async () => {
    // $30 partial refund against a $100 payment that fully paid invoice.
    mocks.paymentFindFirstMock.mockResolvedValue(completedPayment);
    mocks.paymentUpdateMock.mockResolvedValue({
      ...completedPayment,
      status: "PARTIALLY_REFUNDED",
      refundedAt: new Date(),
    });
    mocks.invoiceFindFirstMock.mockResolvedValue(paidInvoice);
    mocks.invoiceUpdateMock.mockResolvedValue({
      ...paidInvoice,
      status: "PARTIALLY_PAID",
      amountPaid: 70,
      amountDue: 30,
    });

    const res = await POST(
      makeRequest({ amount: 30, reason: "Partial damage" }, "POST"),
      { params: Promise.resolve({ id: PAYMENT_ID }) }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("PARTIALLY_REFUNDED");

    const invoiceCall = mocks.invoiceUpdateMock.mock.calls[0][0];
    expect(invoiceCall.data.amountPaid).toBe(70);
    expect(invoiceCall.data.amountDue).toBe(30);
    expect(invoiceCall.data.status).toBe("PARTIALLY_PAID");
    expect(invoiceCall.data.paidAt).toBeNull();
  });

  it("clamps over-refund to payment amount (cannot refund more than was paid)", async () => {
    // Caller asks to refund $250 against a $100 payment.
    // Payment must be marked REFUNDED (full), and invoice must adjust by
    // $100 (the actual payment amount), NOT $250.
    mocks.paymentFindFirstMock.mockResolvedValue(completedPayment);
    mocks.paymentUpdateMock.mockResolvedValue({
      ...completedPayment,
      status: "REFUNDED",
      refundedAt: new Date(),
    });
    mocks.invoiceFindFirstMock.mockResolvedValue(paidInvoice);
    mocks.invoiceUpdateMock.mockResolvedValue({
      ...paidInvoice,
      status: "SENT",
      amountPaid: 0,
      amountDue: 100,
    });

    const res = await POST(
      makeRequest({ amount: 250, reason: "Mistaken amount" }, "POST"),
      { params: Promise.resolve({ id: PAYMENT_ID }) }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("REFUNDED");

    const invoiceCall = mocks.invoiceUpdateMock.mock.calls[0][0];
    // Critical: must use $100 (the clamped payment amount), not $250.
    expect(invoiceCall.data.amountPaid).toBe(0);
    expect(invoiceCall.data.amountDue).toBe(100);
    expect(invoiceCall.data.status).toBe("SENT");
  });

  it("returns 404 when payment not found", async () => {
    mocks.paymentFindFirstMock.mockResolvedValue(null);

    const res = await POST(makeRequest({ amount: 50, reason: "x" }, "POST"), {
      params: Promise.resolve({ id: PAYMENT_ID }),
    });

    expect(res.status).toBe(404);
    expect(mocks.paymentUpdateMock).not.toHaveBeenCalled();
    expect(mocks.invoiceUpdateMock).not.toHaveBeenCalled();
  });

  it("rejects refund when payment is not COMPLETED", async () => {
    mocks.paymentFindFirstMock.mockResolvedValue(pendingPayment);

    const res = await POST(makeRequest({ amount: 100, reason: "x" }, "POST"), {
      params: Promise.resolve({ id: PAYMENT_ID }),
    });

    expect(res.status).toBe(500);
    expect(mocks.paymentUpdateMock).not.toHaveBeenCalled();
  });

  it("rejects refund without a reason", async () => {
    mocks.paymentFindFirstMock.mockResolvedValue(completedPayment);

    const res = await POST(makeRequest({ amount: 50 }, "POST"), {
      params: Promise.resolve({ id: PAYMENT_ID }),
    });

    expect(res.status).toBe(500);
    expect(mocks.paymentUpdateMock).not.toHaveBeenCalled();
  });

  it("rejects refund with non-positive amount", async () => {
    mocks.paymentFindFirstMock.mockResolvedValue(completedPayment);

    const res = await POST(makeRequest({ amount: 0, reason: "x" }, "POST"), {
      params: Promise.resolve({ id: PAYMENT_ID }),
    });

    expect(res.status).toBe(500);
    expect(mocks.paymentUpdateMock).not.toHaveBeenCalled();
  });
});

describe("sensitive rate limiting", () => {
  // The PUT (process) and POST (refund) routes are financial mutations and
  // sit behind a tighter per-tenant rate limiter. The 429 path MUST short-
  // circuit before any DB lookup so a flood cannot exhaust DB connections.

  it("PUT short-circuits with 429 when rate-limited and never touches DB", async () => {
    const limited = NextResponse.json(
      { message: "Too many requests. Please try again later." },
      { status: 429 }
    );
    mocks.checkSensitiveTenantRateLimitMock.mockResolvedValueOnce(limited);

    const res = await PUT(
      makeRequest({ gatewayResponse: { code: "200", transactionId: "x" } }),
      {
        params: Promise.resolve({ id: PAYMENT_ID }),
      }
    );

    expect(res.status).toBe(429);
    // Critical assertion: rate limit fires BEFORE the DB lookup.
    expect(mocks.paymentFindFirstMock).not.toHaveBeenCalled();
    expect(mocks.paymentUpdateMock).not.toHaveBeenCalled();
  });

  it("POST short-circuits with 429 when rate-limited and never touches DB", async () => {
    const limited = NextResponse.json(
      { message: "Too many requests. Please try again later." },
      { status: 429 }
    );
    mocks.checkSensitiveTenantRateLimitMock.mockResolvedValueOnce(limited);

    const res = await POST(
      makeRequest({ amount: 100, reason: "test" }, "POST"),
      { params: Promise.resolve({ id: PAYMENT_ID }) }
    );

    expect(res.status).toBe(429);
    expect(mocks.paymentFindFirstMock).not.toHaveBeenCalled();
    expect(mocks.paymentUpdateMock).not.toHaveBeenCalled();
  });

  it("GET is NOT rate-limited (read-only, covered by global limiter)", async () => {
    mocks.paymentFindFirstMock.mockResolvedValue(completedPayment);

    await GET(makeRequest(undefined, "GET"), {
      params: Promise.resolve({ id: PAYMENT_ID }),
    });

    expect(mocks.checkSensitiveTenantRateLimitMock).not.toHaveBeenCalled();
  });
});
