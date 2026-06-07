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
 *   - The invoice status MUST be re-derived after a refund. Otherwise a fully-
 *     refunded PAID invoice silently keeps its PAID badge in the UI.
 *   - The pass status (REFUNDED vs PARTIALLY_REFUNDED) MUST be derived from
 *     the *clamped* refund, not from the caller's body.amount.
 *
 * Route behavior (post Manifest migration):
 *   The route clamps the refund amount, calls the gateway, writes an audit row,
 *   then delegates the payment/invoice mutation to manifestRuntime.runCommand().
 *   The manifest runtime handles the Payment state change and triggers the
 *   Invoice.recordRefund reaction. Tests verify the gateway call args, clamping
 *   arithmetic, and audit trail — the manifest runtime mock confirms the correct
 *   command and payload are dispatched.
 *
 * @vitest-environment node
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const PAYMENT_ID = "11111111-1111-1111-1111-111111111111";
const INVOICE_ID = "22222222-2222-2222-2222-222222222222";

const mocks = vi.hoisted(() => ({
  paymentFindFirstMock: vi.fn(),
  paymentRefundAttemptCreateMock: vi.fn(),
  requireTenantIdMock: vi.fn(),
  captureExceptionMock: vi.fn(),
  refundPaymentGatewayMock: vi.fn(),
  processPaymentGatewayMock: vi.fn(),
  checkRateLimitMock: vi.fn(),
  manifestRunCommandMock: vi.fn(),
}));

// Mock manifest runtime to avoid DATABASE_URL env validation at import time.
// The route now uses manifestRuntime.runCommand() for payment/invoice mutations.
vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn().mockResolvedValue({
    runCommand: mocks.manifestRunCommandMock,
  }),
}));

vi.mock("@repo/database", () => ({
  database: {
    payment: {
      findFirst: mocks.paymentFindFirstMock,
    },
    invoice: {},
    paymentRefundAttempt: {
      create: mocks.paymentRefundAttemptCreateMock,
    },
  },
}));

vi.mock("@/app/lib/tenant", () => ({
  requireTenantId: mocks.requireTenantIdMock,
  resolveCurrentUser: vi.fn().mockResolvedValue({
    id: "user-test",
    tenantId: "00000000-0000-0000-0000-000000000001",
    role: "finance_manager",
  }),
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

vi.mock("@repo/observability/log", () => ({
  log: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
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

function makePayment(overrides: Partial<typeof completedPayment> = {}) {
  return {
    ...completedPayment,
    ...overrides,
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
  mocks.paymentRefundAttemptCreateMock.mockReset();
  mocks.requireTenantIdMock.mockReset();
  mocks.captureExceptionMock.mockReset();
  mocks.refundPaymentGatewayMock.mockReset();
  mocks.processPaymentGatewayMock.mockReset();
  mocks.checkRateLimitMock.mockReset();
  mocks.manifestRunCommandMock.mockReset();

  mocks.requireTenantIdMock.mockResolvedValue(TENANT_ID);
  mocks.checkRateLimitMock.mockResolvedValue({
    success: true,
    limit: 20,
    remaining: 19,
    reset: new Date(Date.now() + 60_000),
  });
  mocks.refundPaymentGatewayMock.mockResolvedValue({
    success: true,
    refundTransactionId: "re_default_success",
  });
  mocks.paymentRefundAttemptCreateMock.mockResolvedValue({});
  // Default: manifest runtime succeeds
  mocks.manifestRunCommandMock.mockResolvedValue({
    success: true,
    result: { id: PAYMENT_ID },
    emittedEvents: [],
  });
  // Default: findFirst returns the payment on both calls (lookup + re-fetch)
  mocks.paymentFindFirstMock.mockResolvedValue(makePayment());
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/accounting/payments/[id] (refund)", () => {
  describe("ledger clamp invariant", () => {
    it("clamps over-refund: $250 requested against $100 payment passes effectiveRefund=100 to gateway and manifest", async () => {
      mocks.paymentFindFirstMock
        .mockResolvedValueOnce(makePayment())
        .mockResolvedValueOnce(makePayment());

      const res = await POST(
        buildRequest({ amount: 250, reason: "duplicate charge" }),
        { params: Promise.resolve({ id: PAYMENT_ID }) }
      );

      expect(res.status).toBe(200);
      // Gateway receives the clamped $100, NOT the requested $250
      const gatewayArgs = mocks.refundPaymentGatewayMock.mock.calls[0][0];
      expect(gatewayArgs.amount).toBe(100);
      // Manifest receives "refund" (full) with the clamped amount
      expect(mocks.manifestRunCommandMock).toHaveBeenCalledWith(
        "refund",
        { refundAmount: 100, reason: "duplicate charge" },
        { entityName: "Payment", instanceId: PAYMENT_ID }
      );
    });

    it("derives full refund command from clamped effectiveRefund, not body.amount", async () => {
      mocks.paymentFindFirstMock
        .mockResolvedValueOnce(makePayment())
        .mockResolvedValueOnce(makePayment());

      await POST(buildRequest({ amount: 250, reason: "duplicate charge" }), {
        params: Promise.resolve({ id: PAYMENT_ID }) },
      );

      // body.amount=250 > paymentAmount=100, but the clamp kicks in so the
      // EFFECTIVE refund is 100 — i.e. a full refund. Command must be "refund",
      // not "partialRefund".
      expect(mocks.manifestRunCommandMock).toHaveBeenCalledWith(
        "refund",
        { refundAmount: 100, reason: "duplicate charge" },
        { entityName: "Payment", instanceId: PAYMENT_ID }
      );
    });

    it("partial refund of $30 against $100 payment sends 'partialRefund' command", async () => {
      mocks.paymentFindFirstMock
        .mockResolvedValueOnce(makePayment())
        .mockResolvedValueOnce(makePayment());

      await POST(buildRequest({ amount: 30, reason: "partial dispute" }), {
        params: Promise.resolve({ id: PAYMENT_ID }) },
      );

      expect(mocks.manifestRunCommandMock).toHaveBeenCalledWith(
        "partialRefund",
        { refundAmount: 30, reason: "partial dispute" },
        { entityName: "Payment", instanceId: PAYMENT_ID }
      );
    });
  });

  describe("guard rails", () => {
    it("returns 404 when payment does not exist for this tenant", async () => {
      mocks.paymentFindFirstMock.mockResolvedValue(null);

      const res = await POST(buildRequest({ amount: 50, reason: "test" }), {
        params: Promise.resolve({ id: PAYMENT_ID }) },
      );

      expect(res.status).toBe(404);
      expect(mocks.manifestRunCommandMock).not.toHaveBeenCalled();
    });

    it("rejects refund of a non-COMPLETED payment", async () => {
      mocks.paymentFindFirstMock.mockResolvedValue(
        makePayment({ status: "PENDING" })
      );

      const res = await POST(buildRequest({ amount: 50, reason: "test" }), {
        params: Promise.resolve({ id: PAYMENT_ID }) },
      );

      expect(res.status).toBe(500);
      expect(mocks.manifestRunCommandMock).not.toHaveBeenCalled();
    });

    it("rejects refund without a reason", async () => {
      mocks.paymentFindFirstMock.mockResolvedValue(makePayment());

      const res = await POST(buildRequest({ amount: 50 }), {
        params: Promise.resolve({ id: PAYMENT_ID }) },
      );

      expect(res.status).toBe(500);
      expect(mocks.manifestRunCommandMock).not.toHaveBeenCalled();
    });

    it("rejects refund with non-positive amount", async () => {
      mocks.paymentFindFirstMock.mockResolvedValue(makePayment());

      const res = await POST(buildRequest({ amount: 0, reason: "test" }), {
        params: Promise.resolve({ id: PAYMENT_ID }) },
      );

      expect(res.status).toBe(500);
      expect(mocks.manifestRunCommandMock).not.toHaveBeenCalled();
    });

    it("rejects refund of an already-refunded payment", async () => {
      mocks.paymentFindFirstMock.mockResolvedValue(
        makePayment({ refundedAt: new Date("2026-04-21T00:00:00.000Z") })
      );

      const res = await POST(buildRequest({ amount: 50, reason: "test" }), {
        params: Promise.resolve({ id: PAYMENT_ID }) },
      );

      expect(res.status).toBe(500);
      expect(mocks.manifestRunCommandMock).not.toHaveBeenCalled();
    });
  });

  describe("refund gateway trust boundary", () => {
    it("calls refundPaymentGateway with server-side metadata, NOT request body fields", async () => {
      mocks.paymentFindFirstMock
        .mockResolvedValueOnce(makePayment())
        .mockResolvedValueOnce(makePayment());

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
      mocks.paymentFindFirstMock
        .mockResolvedValueOnce(makePayment())
        .mockResolvedValueOnce(makePayment());

      // Body asks for $1M against a $100 payment. The clamp is the contract
      // boundary — both the local ledger AND the gateway must see $100, not
      // $1M (otherwise we'd ask Stripe to refund more than was charged).
      await POST(buildRequest({ amount: 1_000_000, reason: "abuse attempt" }), {
        params: Promise.resolve({ id: PAYMENT_ID }) },
      );

      const gatewayArgs = mocks.refundPaymentGatewayMock.mock.calls[0][0];
      expect(gatewayArgs.amount).toBe(100);
    });

    it("on gateway failure: returns 502 and does NOT mutate payment via manifest", async () => {
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

      // Critical: no manifest mutation when the processor said no.
      expect(mocks.manifestRunCommandMock).not.toHaveBeenCalled();
    });

    it("calls refund gateway BEFORE manifest mutation (call ordering)", async () => {
      mocks.paymentFindFirstMock
        .mockResolvedValueOnce(makePayment())
        .mockResolvedValueOnce(makePayment());

      const callOrder: string[] = [];
      mocks.refundPaymentGatewayMock.mockImplementationOnce(async () => {
        callOrder.push("gateway");
        return { success: true, refundTransactionId: "re_ordered" };
      });
      mocks.manifestRunCommandMock.mockImplementationOnce(async () => {
        callOrder.push("manifest.runCommand");
        return { success: true, result: { id: PAYMENT_ID }, emittedEvents: [] };
      });

      await POST(
        buildRequest({ amount: 100, reason: "customer cancellation" }),
        { params: Promise.resolve({ id: PAYMENT_ID }) }
      );

      // Gateway must run BEFORE manifest mutation so a gateway failure
      // prevents any local ledger state change.
      expect(callOrder).toEqual([
        "gateway",
        "manifest.runCommand",
      ]);
    });

    it("does not call gateway when payment is missing (404 short-circuit)", async () => {
      mocks.paymentFindFirstMock.mockResolvedValue(null);

      const res = await POST(buildRequest({ amount: 50, reason: "test" }), {
        params: Promise.resolve({ id: PAYMENT_ID }) },
      );

      expect(res.status).toBe(404);
      expect(mocks.refundPaymentGatewayMock).not.toHaveBeenCalled();
    });

    it("does not call gateway when validation rejects (already-refunded short-circuit)", async () => {
      mocks.paymentFindFirstMock.mockResolvedValue(
        makePayment({ refundedAt: new Date("2026-04-21T00:00:00.000Z") })
      );

      const res = await POST(buildRequest({ amount: 50, reason: "test" }), {
        params: Promise.resolve({ id: PAYMENT_ID }) },
      );

      expect(res.status).toBe(500);
      expect(mocks.refundPaymentGatewayMock).not.toHaveBeenCalled();
    });
  });

  describe("refund attempt audit trail", () => {
    it("on gateway SUCCESS: writes one audit row with success=true, clamped amounts, and gateway txn id", async () => {
      mocks.paymentFindFirstMock
        .mockResolvedValueOnce(makePayment())
        .mockResolvedValueOnce(makePayment());
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
      mocks.paymentFindFirstMock
        .mockResolvedValueOnce(makePayment())
        .mockResolvedValueOnce(makePayment());

      await POST(buildRequest({ amount: 250, reason: "customer typo" }), {
        params: Promise.resolve({ id: PAYMENT_ID }) },
      );

      const auditArgs = mocks.paymentRefundAttemptCreateMock.mock.calls[0][0];
      expect(auditArgs.data.requestedAmount).toBe(250);
      expect(auditArgs.data.effectiveAmount).toBe(100);
    });

    it("audit insert failure does NOT block the user-facing success response (best-effort write)", async () => {
      mocks.paymentFindFirstMock
        .mockResolvedValueOnce(makePayment())
        .mockResolvedValueOnce(makePayment());
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
      // Manifest mutation still happens.
      expect(mocks.manifestRunCommandMock).toHaveBeenCalledTimes(1);
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
        params: Promise.resolve({ id: PAYMENT_ID }) },
      );

      expect(res.status).toBe(502);
      expect(mocks.captureExceptionMock).toHaveBeenCalledTimes(1);
    });

    it("does not write audit row when gateway is never called (404 short-circuit)", async () => {
      mocks.paymentFindFirstMock.mockResolvedValue(null);

      await POST(buildRequest({ amount: 50, reason: "test" }), {
        params: Promise.resolve({ id: PAYMENT_ID }) },
      );

      expect(mocks.refundPaymentGatewayMock).not.toHaveBeenCalled();
      expect(mocks.paymentRefundAttemptCreateMock).not.toHaveBeenCalled();
    });
  });
});
