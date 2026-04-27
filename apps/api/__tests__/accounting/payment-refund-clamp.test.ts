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
  requireTenantIdMock: vi.fn(),
  captureExceptionMock: vi.fn(),
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
  mocks.requireTenantIdMock.mockReset();
  mocks.captureExceptionMock.mockReset();

  mocks.requireTenantIdMock.mockResolvedValue(TENANT_ID);
  // payment.update echoes back input; tests assert against findFirst input.
  mocks.paymentUpdateMock.mockImplementation(({ data }) =>
    Promise.resolve({
      ...completedPayment,
      ...data,
      amount: { toString: () => "100.00" },
    })
  );
  mocks.invoiceUpdateMock.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/accounting/payments/[id] (refund)", () => {
  describe("ledger clamp invariant", () => {
    it("clamps over-refund: $250 requested against $100 payment debits invoice by $100, not $250", async () => {
      mocks.paymentFindFirstMock.mockResolvedValue(makePayment());
      // Invoice was paid in full ($100 paid, $0 due).
      mocks.invoiceFindFirstMock.mockResolvedValue(
        makeInvoice(100, 0, "PAID")
      );

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
      mocks.invoiceFindFirstMock.mockResolvedValue(
        makeInvoice(100, 0, "PAID")
      );

      await POST(
        buildRequest({ amount: 250, reason: "duplicate charge" }),
        { params: Promise.resolve({ id: PAYMENT_ID }) }
      );

      // body.amount=250 > paymentAmount=100, but the clamp kicks in so the
      // EFFECTIVE refund is 100 — i.e. a full refund. Status must be REFUNDED,
      // not PARTIALLY_REFUNDED.
      const paymentUpdateArgs = mocks.paymentUpdateMock.mock.calls[0][0];
      expect(paymentUpdateArgs.data.status).toBe("REFUNDED");
    });

    it("partial refund of $30 against $100 payment marks PARTIALLY_REFUNDED and adjusts invoice by $30", async () => {
      mocks.paymentFindFirstMock.mockResolvedValue(makePayment());
      mocks.invoiceFindFirstMock.mockResolvedValue(
        makeInvoice(100, 0, "PAID")
      );

      await POST(
        buildRequest({ amount: 30, reason: "partial dispute" }),
        { params: Promise.resolve({ id: PAYMENT_ID }) }
      );

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
      mocks.invoiceFindFirstMock.mockResolvedValue(
        makeInvoice(100, 0, "PAID")
      );

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
      mocks.invoiceFindFirstMock.mockResolvedValue(
        makeInvoice(200, 0, "PAID")
      );

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
      mocks.invoiceFindFirstMock.mockResolvedValue(
        makeInvoice(100, 0, "PAID")
      );

      await POST(
        buildRequest({ amount: 1_000_000, reason: "abuse attempt" }),
        { params: Promise.resolve({ id: PAYMENT_ID }) }
      );

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

      const res = await POST(
        buildRequest({ amount: 50, reason: "test" }),
        { params: Promise.resolve({ id: PAYMENT_ID }) }
      );

      expect(res.status).toBe(404);
      expect(mocks.paymentUpdateMock).not.toHaveBeenCalled();
      expect(mocks.invoiceUpdateMock).not.toHaveBeenCalled();
    });

    it("rejects refund of a non-COMPLETED payment", async () => {
      mocks.paymentFindFirstMock.mockResolvedValue(
        makePayment({ status: "PENDING" })
      );

      const res = await POST(
        buildRequest({ amount: 50, reason: "test" }),
        { params: Promise.resolve({ id: PAYMENT_ID }) }
      );

      expect(res.status).toBe(500);
      expect(mocks.paymentUpdateMock).not.toHaveBeenCalled();
      expect(mocks.invoiceUpdateMock).not.toHaveBeenCalled();
    });

    it("rejects refund without a reason", async () => {
      mocks.paymentFindFirstMock.mockResolvedValue(makePayment());

      const res = await POST(
        buildRequest({ amount: 50 }),
        { params: Promise.resolve({ id: PAYMENT_ID }) }
      );

      expect(res.status).toBe(500);
      expect(mocks.paymentUpdateMock).not.toHaveBeenCalled();
    });

    it("rejects refund with non-positive amount", async () => {
      mocks.paymentFindFirstMock.mockResolvedValue(makePayment());

      const res = await POST(
        buildRequest({ amount: 0, reason: "test" }),
        { params: Promise.resolve({ id: PAYMENT_ID }) }
      );

      expect(res.status).toBe(500);
      expect(mocks.paymentUpdateMock).not.toHaveBeenCalled();
    });

    it("rejects refund of an already-refunded payment", async () => {
      mocks.paymentFindFirstMock.mockResolvedValue(
        makePayment({ refundedAt: new Date("2026-04-21T00:00:00.000Z") })
      );

      const res = await POST(
        buildRequest({ amount: 50, reason: "test" }),
        { params: Promise.resolve({ id: PAYMENT_ID }) }
      );

      expect(res.status).toBe(500);
      expect(mocks.paymentUpdateMock).not.toHaveBeenCalled();
      expect(mocks.invoiceUpdateMock).not.toHaveBeenCalled();
    });
  });
});
