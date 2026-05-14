/**
 * Payment Refund Clamp + Invoice Status Re-derivation Test Suite
 *
 * Verifies the ledger-correctness contract on `POST /api/accounting/payments/[id]`
 * (the "refund payment" handler).
 *
 * Why these tests matter:
 *   - The refund cascade (payment → invoice) is the system of record for
 *     receivables. A regression that lets a caller-supplied amount over-debit
 *     `invoice.amountPaid` (driving it negative) corrupts every downstream
 *     report — and the corruption is invisible until reconciliation, by
 *     which point books may already be closed.
 *   - The invoice status MUST be re-derived from the post-refund balance.
 *     Otherwise a fully-refunded PAID invoice silently keeps its PAID badge
 *     in the UI, and the AR-aging report omits it, even though the money
 *     left.
 *   - The pass status (REFUNDED vs PARTIALLY_REFUNDED) MUST be derived from
 *     the *clamped* refund, not from the caller's body.amount. Otherwise a
 *     $250 refund request against a $100 payment would mark it
 *     PARTIALLY_REFUNDED (since 250 > 100, but with the clamp the comparison
 *     should detect a full refund).
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
  paymentRefundAttemptCreateMock: vi.fn(),
  requireTenantIdMock: vi.fn(),
  captureExceptionMock: vi.fn(),
  refundPaymentGatewayMock: vi.fn(),
  processPaymentGatewayMock: vi.fn(),
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
    paymentRefundAttempt: {
      create: mocks.paymentRefundAttemptCreateMock,
    },
  },
}));

vi.mock("@/app/lib/tenant", () => ({
  requireCurrentUser: vi.fn().mockResolvedValue({
    id: "test-user-id",
    tenantId: "test-tenant",
    role: "admin",
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
  }),

  requireTenantId: mocks.requireTenantIdMock,
}));

// P1.AM: POST /payments/[id] refund now gates on manager-tier role. Stub
// auth-roles to grant access; refund-clamp arithmetic remains the focus.
vi.mock("@/app/lib/auth-roles", () => ({
  requireApiManager: vi.fn(async () => {
    const tenantId = await mocks.requireTenantIdMock();
    return {
      ok: true,
      user: {
        id: "user-test",
        tenantId,
        role: "finance_manager",
        email: "m@t",
        firstName: "T",
        lastName: "M",
      },
      tenantId,
    };
  }),
  requireApiAdmin: vi.fn(),
  requireApiRole: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: mocks.captureExceptionMock,
}));

vi.mock("@/app/api/accounting/payments/[id]/gateway", () => ({
  refundPaymentGateway: mocks.refundPaymentGatewayMock,
  processPaymentGateway: mocks.processPaymentGatewayMock,
}));

vi.mock("@/middleware/rate-limiter", () => ({
  checkRateLimit: mocks.checkRateLimitMock,
}));

import { NextRequest } from "next/server";
import { POST } from "@/app/api/accounting/payments/[id]/route";

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

// `Number(payment.amount)` is used in the route; supply a numeric-coercible
// shape that matches Prisma Decimal's `toString()` contract.
function makePayment(overrides: Partial<typeof completedPayment> = {}) {
  return {
    ...completedPayment,
    ...overrides,
  };
}

function makeInvoice(amountPaid: number, amountDue: number, status: string) {
  return {
    tenantId: TENANT_ID,
    id: INVOICE_ID,
    amountPaid,
    amountDue,
    status,
    paidAt: status === "PAID" ? new Date("2026-04-20T00:00:00.000Z") : null,
    deletedAt: null,
  };
}

function buildRequest(body: unknown) {
  return new NextRequest(
    `http://localhost/api/accounting/payments/${PAYMENT_ID}`,
    {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    }
  );
}

beforeEach(() => {
  mocks.paymentFindFirstMock.mockReset();
  mocks.paymentUpdateMock.mockReset();
  mocks.invoiceFindFirstMock.mockReset();
  mocks.invoiceUpdateMock.mockReset();
  mocks.paymentRefundAttemptCreateMock.mockReset();
  mocks.requireTenantIdMock.mockReset();
  mocks.captureExceptionMock.mockReset();
  mocks.refundPaymentGatewayMock.mockReset();
  mocks.processPaymentGatewayMock.mockReset();
  mocks.checkRateLimitMock.mockReset();

  mocks.requireTenantIdMock.mockResolvedValue(TENANT_ID);
  // Default: allow all requests through. The rate-limit-specific test
  // suite (payment-rate-limit.test.ts) overrides this to assert the 429
  // throttle path.
  mocks.checkRateLimitMock.mockResolvedValue({
    success: true,
    limit: 20,
    remaining: 19,
    reset: new Date(Date.now() + 60_000),
  });
  // payment.update echoes back input; tests assert against findFirst input.
  mocks.paymentUpdateMock.mockImplementation(({ data }) =>
    Promise.resolve({
      ...completedPayment,
      ...data,
      amount: { toString: () => "100.00" },
    })
  );
  mocks.invoiceUpdateMock.mockResolvedValue(undefined);
  // Default: refund gateway always succeeds. Tests that need failure
  // override with mockResolvedValueOnce.
  mocks.refundPaymentGatewayMock.mockResolvedValue({
    success: true,
    refundTransactionId: "re_default_success",
  });
  // Default: audit row insert succeeds. Tests that need to assert
  // best-effort fallback override with mockRejectedValueOnce.
  mocks.paymentRefundAttemptCreateMock.mockResolvedValue({});
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/accounting/payments/[id] (refund)", () => {
  describe("ledger clamp invariant", () => {
    it("clamps over-refund: $250 requested against $100 payment debits invoice by $100, not $250", async () => {
      mocks.paymentFindFirstMock.mockResolvedValue(makePayment());
      // Invoice was paid in full ($100 paid, $0 due).
      mocks.invoiceFindFirstMock.mockResolvedValue(makeInvoice(100, 0, "PAID"));

      const res = await POST(
        buildRequest({ amount: 250, reason: "duplicate charge" }),
        { params: Promise.resolve({ id: PAYMENT_ID }) }
      );

      expect(res.status).toBe(200);
      // Invoice update must reflect the clamped $100, NOT the requested $250.
      // Without the clamp, amountPaid would land at -150 and amountDue at +250.
      expect(mocks.invoiceUpdateMock).toHaveBeenCalledTimes(1);
      const updateArgs = mocks.invoiceUpdateMock.mock.calls[0][0];
      expect(updateArgs.data.amountPaid).toBe(0);
      expect(updateArgs.data.amountDue).toBe(100);
    });

    it("derives REFUNDED status from clamped refund, not body.amount", async () => {
      mocks.paymentFindFirstMock.mockResolvedValue(makePayment());
      mocks.invoiceFindFirstMock.mockResolvedValue(makeInvoice(100, 0, "PAID"));

      await POST(buildRequest({ amount: 250, reason: "duplicate charge" }), {
        params: Promise.resolve({ id: PAYMENT_ID }),
      });

      // body.amount=250 > paymentAmount=100, but the clamp kicks in so the
      // EFFECTIVE refund is 100 — i.e. a full refund. Status must be REFUNDED,
      // not PARTIALLY_REFUNDED.
      const paymentUpdateArgs = mocks.paymentUpdateMock.mock.calls[0][0];
      expect(paymentUpdateArgs.data.status).toBe("REFUNDED");
    });

    it("partial refund of $30 against $100 payment marks PARTIALLY_REFUNDED and adjusts invoice by $30", async () => {
      mocks.paymentFindFirstMock.mockResolvedValue(makePayment());
      mocks.invoiceFindFirstMock.mockResolvedValue(makeInvoice(100, 0, "PAID"));

      await POST(buildRequest({ amount: 30, reason: "partial dispute" }), {
        params: Promise.resolve({ id: PAYMENT_ID }),
      });

      const paymentUpdateArgs = mocks.paymentUpdateMock.mock.calls[0][0];
      expect(paymentUpdateArgs.data.status).toBe("PARTIALLY_REFUNDED");

      const invoiceUpdateArgs = mocks.invoiceUpdateMock.mock.calls[0][0];
      expect(invoiceUpdateArgs.data.amountPaid).toBe(70);
      expect(invoiceUpdateArgs.data.amountDue).toBe(30);
    });
  });

  describe("invoice status re-derivation", () => {
    it("full refund of fully-paid invoice flips status PAID -> SENT and clears paidAt", async () => {
      mocks.paymentFindFirstMock.mockResolvedValue(makePayment());
      mocks.invoiceFindFirstMock.mockResolvedValue(makeInvoice(100, 0, "PAID"));

      await POST(
        buildRequest({ amount: 100, reason: "customer cancellation" }),
        { params: Promise.resolve({ id: PAYMENT_ID }) }
      );

      const updateArgs = mocks.invoiceUpdateMock.mock.calls[0][0];
      expect(updateArgs.data.status).toBe("SENT");
      expect(updateArgs.data.paidAt).toBeNull();
    });

    it("partial refund where money still on file marks invoice PARTIALLY_PAID and clears paidAt", async () => {
      mocks.paymentFindFirstMock.mockResolvedValue(makePayment());
      // Invoice is part of a multi-payment series: $200 already paid, $0 due,
      // status = PAID. Refunding the $100 payment leaves $100 still on file.
      mocks.invoiceFindFirstMock.mockResolvedValue(makeInvoice(200, 0, "PAID"));

      await POST(
        buildRequest({ amount: 100, reason: "customer cancellation" }),
        { params: Promise.resolve({ id: PAYMENT_ID }) }
      );

      const updateArgs = mocks.invoiceUpdateMock.mock.calls[0][0];
      expect(updateArgs.data.amountPaid).toBe(100);
      expect(updateArgs.data.amountDue).toBe(100);
      expect(updateArgs.data.status).toBe("PARTIALLY_PAID");
      expect(updateArgs.data.paidAt).toBeNull();
    });

    it("clamped over-refund still flips a PAID invoice back to SENT (no negative amountPaid)", async () => {
      mocks.paymentFindFirstMock.mockResolvedValue(makePayment());
      mocks.invoiceFindFirstMock.mockResolvedValue(makeInvoice(100, 0, "PAID"));

      await POST(buildRequest({ amount: 1_000_000, reason: "abuse attempt" }), {
        params: Promise.resolve({ id: PAYMENT_ID }),
      });

      const updateArgs = mocks.invoiceUpdateMock.mock.calls[0][0];
      // Clamp prevents $1M from being applied. Invoice goes back to zero-paid.
      expect(updateArgs.data.amountPaid).toBe(0);
      expect(updateArgs.data.amountDue).toBe(100);
      expect(updateArgs.data.status).toBe("SENT");
      expect(updateArgs.data.paidAt).toBeNull();
    });
  });

  describe("guard rails", () => {
    it("returns 404 when payment does not exist for this tenant", async () => {
      mocks.paymentFindFirstMock.mockResolvedValue(null);

      const res = await POST(buildRequest({ amount: 50, reason: "test" }), {
        params: Promise.resolve({ id: PAYMENT_ID }),
      });

      expect(res.status).toBe(404);
      expect(mocks.paymentUpdateMock).not.toHaveBeenCalled();
      expect(mocks.invoiceUpdateMock).not.toHaveBeenCalled();
    });

    it("rejects refund of a non-COMPLETED payment", async () => {
      mocks.paymentFindFirstMock.mockResolvedValue(
        makePayment({ status: "PENDING" })
      );

      const res = await POST(buildRequest({ amount: 50, reason: "test" }), {
        params: Promise.resolve({ id: PAYMENT_ID }),
      });

      expect(res.status).toBe(500);
      expect(mocks.paymentUpdateMock).not.toHaveBeenCalled();
      expect(mocks.invoiceUpdateMock).not.toHaveBeenCalled();
    });

    it("rejects refund without a reason", async () => {
      mocks.paymentFindFirstMock.mockResolvedValue(makePayment());

      const res = await POST(buildRequest({ amount: 50 }), {
        params: Promise.resolve({ id: PAYMENT_ID }),
      });

      expect(res.status).toBe(500);
      expect(mocks.paymentUpdateMock).not.toHaveBeenCalled();
    });

    it("rejects refund with non-positive amount", async () => {
      mocks.paymentFindFirstMock.mockResolvedValue(makePayment());

      const res = await POST(buildRequest({ amount: 0, reason: "test" }), {
        params: Promise.resolve({ id: PAYMENT_ID }),
      });

      expect(res.status).toBe(500);
      expect(mocks.paymentUpdateMock).not.toHaveBeenCalled();
    });

    it("rejects refund of an already-refunded payment", async () => {
      mocks.paymentFindFirstMock.mockResolvedValue(
        makePayment({ refundedAt: new Date("2026-04-21T00:00:00.000Z") })
      );

      const res = await POST(buildRequest({ amount: 50, reason: "test" }), {
        params: Promise.resolve({ id: PAYMENT_ID }),
      });

      expect(res.status).toBe(500);
      expect(mocks.paymentUpdateMock).not.toHaveBeenCalled();
      expect(mocks.invoiceUpdateMock).not.toHaveBeenCalled();
    });
  });

  describe("refund gateway trust boundary", () => {
    it("calls refundPaymentGateway with server-side metadata, NOT request body fields", async () => {
      mocks.paymentFindFirstMock.mockResolvedValue(makePayment());
      mocks.invoiceFindFirstMock.mockResolvedValue(makeInvoice(100, 0, "PAID"));

      // Caller forges a refund transaction ID and a different
      // originalGatewayTransactionId. Neither value should leak into the
      // gateway call — the route must use the server-known
      // payment.gatewayTransactionId ("txn_existing") only.
      await POST(
        buildRequest({
          amount: 50,
          reason: "partial dispute",
          refundTransactionId: "re_attacker_supplied",
          originalGatewayTransactionId: "txn_attacker_supplied",
          gatewayResponse: { code: "200", refundId: "re_forged" },
        }),
        { params: Promise.resolve({ id: PAYMENT_ID }) }
      );

      expect(mocks.refundPaymentGatewayMock).toHaveBeenCalledTimes(1);
      const gatewayArgs = mocks.refundPaymentGatewayMock.mock.calls[0][0];
      expect(gatewayArgs.paymentId).toBe(PAYMENT_ID);
      expect(gatewayArgs.tenantId).toBe(TENANT_ID);
      expect(gatewayArgs.amount).toBe(50);
      expect(gatewayArgs.currency).toBe("USD");
      expect(gatewayArgs.reason).toBe("partial dispute");
      // Source of truth is the persisted payment row, not the request body.
      expect(gatewayArgs.originalGatewayTransactionId).toBe("txn_existing");
    });

    it("passes the CLAMPED effectiveRefund to the gateway, not body.amount", async () => {
      mocks.paymentFindFirstMock.mockResolvedValue(makePayment());
      mocks.invoiceFindFirstMock.mockResolvedValue(makeInvoice(100, 0, "PAID"));

      // Body asks for $1M against a $100 payment. The clamp is the contract
      // boundary — both the local ledger AND the gateway must see $100, not
      // $1M (otherwise we'd ask Stripe to refund more than was charged).
      await POST(buildRequest({ amount: 1_000_000, reason: "abuse attempt" }), {
        params: Promise.resolve({ id: PAYMENT_ID }),
      });

      const gatewayArgs = mocks.refundPaymentGatewayMock.mock.calls[0][0];
      expect(gatewayArgs.amount).toBe(100);
    });

    it("on gateway failure: returns 502 and does NOT mutate payment or invoice", async () => {
      mocks.paymentFindFirstMock.mockResolvedValue(makePayment());
      mocks.refundPaymentGatewayMock.mockResolvedValueOnce({
        success: false,
        refundTransactionId: "re_failed_attempt",
        failureReason: "charge_already_refunded",
      });

      const res = await POST(
        buildRequest({ amount: 50, reason: "duplicate" }),
        { params: Promise.resolve({ id: PAYMENT_ID }) }
      );

      expect(res.status).toBe(502);
      const body = await res.json();
      expect(body.error).toBe("Refund gateway rejected the refund");
      expect(body.failureReason).toBe("charge_already_refunded");
      expect(body.refundTransactionId).toBe("re_failed_attempt");

      // Critical: no DB writes when the processor said no. The local
      // payment must remain COMPLETED to mirror the processor.
      expect(mocks.paymentUpdateMock).not.toHaveBeenCalled();
      expect(mocks.invoiceFindFirstMock).not.toHaveBeenCalled();
      expect(mocks.invoiceUpdateMock).not.toHaveBeenCalled();
    });

    it("calls refund gateway BEFORE mutating payment or invoice (call ordering)", async () => {
      mocks.paymentFindFirstMock.mockResolvedValue(makePayment());
      mocks.invoiceFindFirstMock.mockResolvedValue(makeInvoice(100, 0, "PAID"));

      const callOrder: string[] = [];
      mocks.refundPaymentGatewayMock.mockImplementationOnce(async () => {
        callOrder.push("gateway");
        return { success: true, refundTransactionId: "re_ordered" };
      });
      mocks.paymentUpdateMock.mockImplementationOnce(async ({ data }) => {
        callOrder.push("payment.update");
        return {
          ...completedPayment,
          ...data,
          amount: { toString: () => "100.00" },
        };
      });
      mocks.invoiceUpdateMock.mockImplementationOnce(async () => {
        callOrder.push("invoice.update");
        return undefined;
      });

      await POST(
        buildRequest({ amount: 100, reason: "customer cancellation" }),
        { params: Promise.resolve({ id: PAYMENT_ID }) }
      );

      // If the gateway is called AFTER the DB mutation, a network failure
      // on the processor side would leave the local ledger marked REFUNDED
      // while the customer still has their money. Lock the order.
      expect(callOrder).toEqual([
        "gateway",
        "payment.update",
        "invoice.update",
      ]);
    });

    it("does not call gateway when payment is missing (404 short-circuit)", async () => {
      mocks.paymentFindFirstMock.mockResolvedValue(null);

      const res = await POST(buildRequest({ amount: 50, reason: "test" }), {
        params: Promise.resolve({ id: PAYMENT_ID }),
      });

      expect(res.status).toBe(404);
      // No spurious processor call for a payment we can't find.
      expect(mocks.refundPaymentGatewayMock).not.toHaveBeenCalled();
    });

    it("does not call gateway when validation rejects (already-refunded short-circuit)", async () => {
      mocks.paymentFindFirstMock.mockResolvedValue(
        makePayment({ refundedAt: new Date("2026-04-21T00:00:00.000Z") })
      );

      const res = await POST(buildRequest({ amount: 50, reason: "test" }), {
        params: Promise.resolve({ id: PAYMENT_ID }),
      });

      expect(res.status).toBe(500);
      expect(mocks.refundPaymentGatewayMock).not.toHaveBeenCalled();
    });
  });

  describe("refund attempt audit trail", () => {
    it("on gateway SUCCESS: writes one audit row with success=true, clamped amounts, and gateway txn id", async () => {
      mocks.paymentFindFirstMock.mockResolvedValue(makePayment());
      mocks.invoiceFindFirstMock.mockResolvedValue(makeInvoice(100, 0, "PAID"));
      mocks.refundPaymentGatewayMock.mockResolvedValueOnce({
        success: true,
        refundTransactionId: "re_audit_success",
      });

      await POST(
        buildRequest({ amount: 75, reason: "customer cancellation" }),
        { params: Promise.resolve({ id: PAYMENT_ID }) }
      );

      expect(mocks.paymentRefundAttemptCreateMock).toHaveBeenCalledTimes(1);
      const auditArgs = mocks.paymentRefundAttemptCreateMock.mock.calls[0][0];
      expect(auditArgs.data).toMatchObject({
        tenantId: TENANT_ID,
        paymentId: PAYMENT_ID,
        requestedAmount: 75,
        effectiveAmount: 75,
        refundReason: "customer cancellation",
        originalGatewayTransactionId: "txn_existing",
        refundTransactionId: "re_audit_success",
        success: true,
        failureReason: null,
      });
    });

    it("on gateway FAILURE: writes audit row with success=false, failureReason, and the gateway-side refundTransactionId BEFORE 502", async () => {
      mocks.paymentFindFirstMock.mockResolvedValue(makePayment());
      mocks.refundPaymentGatewayMock.mockResolvedValueOnce({
        success: false,
        refundTransactionId: "re_audit_failed",
        failureReason: "charge_already_refunded",
      });

      const res = await POST(
        buildRequest({ amount: 50, reason: "duplicate" }),
        { params: Promise.resolve({ id: PAYMENT_ID }) }
      );

      // The 502 is the user-facing surface, but the forensic record
      // (failureReason, gateway-side refundTransactionId) MUST be persisted.
      // Without this row, every gateway failure is invisible after the
      // response stream closes.
      expect(res.status).toBe(502);
      expect(mocks.paymentRefundAttemptCreateMock).toHaveBeenCalledTimes(1);
      const auditArgs = mocks.paymentRefundAttemptCreateMock.mock.calls[0][0];
      expect(auditArgs.data).toMatchObject({
        tenantId: TENANT_ID,
        paymentId: PAYMENT_ID,
        requestedAmount: 50,
        effectiveAmount: 50,
        refundReason: "duplicate",
        originalGatewayTransactionId: "txn_existing",
        refundTransactionId: "re_audit_failed",
        success: false,
        failureReason: "charge_already_refunded",
      });
    });

    it("audit row records BOTH the requested AND clamped amounts when caller over-refunds", async () => {
      mocks.paymentFindFirstMock.mockResolvedValue(makePayment());
      mocks.invoiceFindFirstMock.mockResolvedValue(makeInvoice(100, 0, "PAID"));

      await POST(buildRequest({ amount: 250, reason: "customer typo" }), {
        params: Promise.resolve({ id: PAYMENT_ID }),
      });

      // The audit needs both numbers so a forensic reviewer can see (a)
      // what the caller asked for and (b) what was actually applied. If we
      // only stored the clamped value, abuse attempts would look identical
      // to legitimate full refunds.
      const auditArgs = mocks.paymentRefundAttemptCreateMock.mock.calls[0][0];
      expect(auditArgs.data.requestedAmount).toBe(250);
      expect(auditArgs.data.effectiveAmount).toBe(100);
    });

    it("audit insert failure does NOT block the user-facing success response (best-effort write)", async () => {
      mocks.paymentFindFirstMock.mockResolvedValue(makePayment());
      mocks.invoiceFindFirstMock.mockResolvedValue(makeInvoice(100, 0, "PAID"));
      // Simulate audit table being unreachable (DB outage, RLS misconfig).
      // The processor has already moved money — refusing to acknowledge the
      // refund to the caller would be worse than a missing audit row.
      mocks.paymentRefundAttemptCreateMock.mockRejectedValueOnce(
        new Error("audit table offline")
      );

      const res = await POST(
        buildRequest({ amount: 100, reason: "customer cancellation" }),
        { params: Promise.resolve({ id: PAYMENT_ID }) }
      );

      expect(res.status).toBe(200);
      // Audit failure must surface to Sentry so on-call notices the
      // forensic gap.
      expect(mocks.captureExceptionMock).toHaveBeenCalledTimes(1);
      // Payment + invoice mutations still happen.
      expect(mocks.paymentUpdateMock).toHaveBeenCalledTimes(1);
      expect(mocks.invoiceUpdateMock).toHaveBeenCalledTimes(1);
    });

    it("audit insert failure on a gateway-failure call still returns 502 (does not promote to 500)", async () => {
      mocks.paymentFindFirstMock.mockResolvedValue(makePayment());
      mocks.refundPaymentGatewayMock.mockResolvedValueOnce({
        success: false,
        refundTransactionId: "re_double_failure",
        failureReason: "insufficient_funds_at_processor",
      });
      mocks.paymentRefundAttemptCreateMock.mockRejectedValueOnce(
        new Error("audit table offline")
      );

      const res = await POST(buildRequest({ amount: 50, reason: "test" }), {
        params: Promise.resolve({ id: PAYMENT_ID }),
      });

      // The user-facing failure mode (gateway said no) is more important
      // to communicate than the audit gap. Surfacing 500 here would cause
      // ops to misdiagnose as a server crash instead of a processor reject.
      expect(res.status).toBe(502);
      expect(mocks.captureExceptionMock).toHaveBeenCalledTimes(1);
    });

    it("does not write audit row when gateway is never called (404 short-circuit)", async () => {
      mocks.paymentFindFirstMock.mockResolvedValue(null);

      await POST(buildRequest({ amount: 50, reason: "test" }), {
        params: Promise.resolve({ id: PAYMENT_ID }),
      });

      // No gateway call -> nothing to audit.
      expect(mocks.refundPaymentGatewayMock).not.toHaveBeenCalled();
      expect(mocks.paymentRefundAttemptCreateMock).not.toHaveBeenCalled();
    });
  });
});
