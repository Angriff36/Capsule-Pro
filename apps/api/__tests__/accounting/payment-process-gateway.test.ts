/**
 * Payment Process — Server-Side Gateway Trust Boundary Test Suite
 *
 * Verifies that `PUT /api/accounting/payments/[id]` (the "process payment"
 * handler) cannot be coerced by request-body content into:
 *   1. Flipping a PENDING payment to COMPLETED.
 *   2. Persisting a caller-supplied `gatewayTransactionId`.
 *   3. Cascading `invoice.amountPaid += payment.amount` and flipping the
 *      invoice to PAID.
 *
 * Why these tests matter:
 *   The previous handler parsed `body.gatewayResponse.code` and treated
 *   `"200" || "1"` as a success signal. Any authenticated tenant client
 *   could send `{ gatewayResponse: { code: "200", transactionId: "x" } }`
 *   and phantom-credit any of their own PENDING invoices — no money on
 *   any processor, full ledger update. This was the highest-priority
 *   open security item in the audit log; once a real Stripe charge call
 *   lands inside `gateway.ts`, the same trust gap would let the caller
 *   bypass the processor entirely.
 *
 * Contract pinned by these tests:
 *   - The route handler MUST NOT call `request.json()`.
 *   - The persisted `gatewayTransactionId` MUST be the value returned by
 *     `processPaymentGateway`, not anything from the body.
 *   - When `processPaymentGateway` returns `success: false`, the manifest
 *     runtime receives "processFailed" (not "process") and the invoice is
 *     NOT mutated by this handler directly.
 *   - The gateway call receives server-side payment metadata
 *     (`payment.amount`, `payment.currency`, `payment.id`, `tenantId`)
 *     never values from the body.
 *
 * @vitest-environment node
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const PAYMENT_ID = "11111111-1111-1111-1111-111111111111";
const INVOICE_ID = "22222222-2222-2222-2222-222222222222";

const mocks = vi.hoisted(() => ({
  paymentFindFirstMock: vi.fn(),
  requireTenantIdMock: vi.fn(),
  captureExceptionMock: vi.fn(),
  processPaymentGatewayMock: vi.fn(),
  checkRateLimitMock: vi.fn(),
  manifestRunCommandMock: vi.fn(),
}));

// Mock manifest runtime to avoid DATABASE_URL env validation at import time.
// The route now uses manifestRuntime.runCommand() for mutations.
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

// P1.AM: PUT /payments/[id] now gates on manager-tier role. Stub auth-roles
// to grant access using the tenantId from requireTenantIdMock.
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
  processPaymentGateway: mocks.processPaymentGatewayMock,
}));

vi.mock("@/middleware/rate-limiter", () => ({
  checkRateLimit: mocks.checkRateLimitMock,
}));

vi.mock("@repo/observability/log", () => ({
  log: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { NextRequest } from "next/server";
import { PUT } from "@/app/api/accounting/payments/[id]/route";

const pendingPayment = {
  tenantId: TENANT_ID,
  id: PAYMENT_ID,
  amount: { toString: () => "100.00" } as unknown as number,
  currency: "USD",
  status: "PENDING",
  methodType: "CREDIT_CARD",
  invoiceId: INVOICE_ID,
  eventId: "33333333-3333-3333-3333-333333333333",
  clientId: null,
  gatewayTransactionId: null as string | null,
  gatewayPaymentMethodId: null,
  processor: "stripe",
  processedAt: null,
  completedAt: null,
  refundedAt: null as Date | null,
  createdAt: new Date("2026-04-20T00:00:00.000Z"),
  updatedAt: new Date("2026-04-20T00:00:00.000Z"),
  deletedAt: null as Date | null,
};

function makePayment(overrides: Partial<typeof pendingPayment> = {}) {
  return { ...pendingPayment, ...overrides };
}

function buildRequest(body?: unknown) {
  return new NextRequest(
    `http://localhost/api/accounting/payments/${PAYMENT_ID}`,
    {
      method: "PUT",
      body: body === undefined ? undefined : JSON.stringify(body),
      headers: { "content-type": "application/json" },
    }
  );
}

beforeEach(() => {
  mocks.paymentFindFirstMock.mockReset();
  mocks.requireTenantIdMock.mockReset();
  mocks.captureExceptionMock.mockReset();
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
  // Default: manifest runtime succeeds. Tests override per-case.
  mocks.manifestRunCommandMock.mockResolvedValue({
    success: true,
    result: { id: PAYMENT_ID },
    emittedEvents: [],
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("PUT /api/accounting/payments/[id] (process) — gateway trust boundary", () => {
  describe("server-side outcome", () => {
    it("delegates to manifest runtime 'process' command when gateway returns success", async () => {
      // First findFirst returns the PENDING payment; second findFirst returns
      // the updated payment for the response body.
      mocks.paymentFindFirstMock
        .mockResolvedValueOnce(makePayment())
        .mockResolvedValueOnce(makePayment({ status: "COMPLETED", gatewayTransactionId: "txn_server_generated_abc" }));
      mocks.processPaymentGatewayMock.mockResolvedValue({
        success: true,
        transactionId: "txn_server_generated_abc",
      });

      const res = await PUT(buildRequest(), {
        params: Promise.resolve({ id: PAYMENT_ID }),
      });

      expect(res.status).toBe(200);
      // The route calls manifestRuntime.runCommand("process", ...) on success
      expect(mocks.manifestRunCommandMock).toHaveBeenCalledTimes(1);
      expect(mocks.manifestRunCommandMock).toHaveBeenCalledWith(
        "process",
        { gatewayTransactionId: "txn_server_generated_abc" },
        { entityName: "Payment", instanceId: PAYMENT_ID }
      );
    });

    it("delegates to manifest runtime 'processFailed' command when gateway returns failure", async () => {
      mocks.paymentFindFirstMock
        .mockResolvedValueOnce(makePayment())
        .mockResolvedValueOnce(makePayment({ status: "FAILED" }));
      mocks.processPaymentGatewayMock.mockResolvedValue({
        success: false,
        transactionId: "txn_failure_attempt",
        failureReason: "card_declined",
      });

      const res = await PUT(buildRequest(), {
        params: Promise.resolve({ id: PAYMENT_ID }),
      });

      expect(res.status).toBe(200);
      // On gateway failure, the route calls "processFailed" not "process"
      expect(mocks.manifestRunCommandMock).toHaveBeenCalledWith(
        "processFailed",
        { gatewayTransactionId: "txn_failure_attempt" },
        { entityName: "Payment", instanceId: PAYMENT_ID }
      );
    });
  });

  describe("body trust boundary", () => {
    it("ignores body.gatewayResponse.code='200' — gateway result is authoritative", async () => {
      mocks.paymentFindFirstMock
        .mockResolvedValueOnce(makePayment())
        .mockResolvedValueOnce(makePayment({ status: "FAILED" }));
      // Attacker sends a forged success body...
      const attackerBody = {
        gatewayResponse: {
          code: "200",
          message: "Success",
          transactionId: "txn_attacker_supplied",
        },
      };
      // ...but the server-side gateway returns failure.
      mocks.processPaymentGatewayMock.mockResolvedValue({
        success: false,
        transactionId: "txn_real_outcome",
        failureReason: "insufficient_funds",
      });

      const res = await PUT(buildRequest(attackerBody), {
        params: Promise.resolve({ id: PAYMENT_ID }),
      });

      expect(res.status).toBe(200);
      // The body's "200" code is ignored; the manifest receives "processFailed"
      expect(mocks.manifestRunCommandMock).toHaveBeenCalledWith(
        "processFailed",
        { gatewayTransactionId: "txn_real_outcome" },
        { entityName: "Payment", instanceId: PAYMENT_ID }
      );
    });

    it("ignores body.gatewayResponse.transactionId — server-generated ID is authoritative", async () => {
      mocks.paymentFindFirstMock
        .mockResolvedValueOnce(makePayment())
        .mockResolvedValueOnce(makePayment({ status: "COMPLETED", gatewayTransactionId: "txn_server_authoritative" }));
      mocks.processPaymentGatewayMock.mockResolvedValue({
        success: true,
        transactionId: "txn_server_authoritative",
      });

      await PUT(
        buildRequest({
          gatewayResponse: {
            code: "200",
            transactionId: "txn_attacker_forged_id",
          },
        }),
        { params: Promise.resolve({ id: PAYMENT_ID }) }
      );

      // The gateway result ID is what gets passed to manifest, not the body's
      expect(mocks.manifestRunCommandMock).toHaveBeenCalledWith(
        "process",
        { gatewayTransactionId: "txn_server_authoritative" },
        { entityName: "Payment", instanceId: PAYMENT_ID }
      );
    });

    it("succeeds with no request body at all (handler must not depend on body)", async () => {
      mocks.paymentFindFirstMock
        .mockResolvedValueOnce(makePayment())
        .mockResolvedValueOnce(makePayment({ status: "COMPLETED" }));
      mocks.processPaymentGatewayMock.mockResolvedValue({
        success: true,
        transactionId: "txn_no_body",
      });

      const res = await PUT(buildRequest(), {
        params: Promise.resolve({ id: PAYMENT_ID }),
      });

      expect(res.status).toBe(200);
      expect(mocks.manifestRunCommandMock).toHaveBeenCalledWith(
        "process",
        { gatewayTransactionId: "txn_no_body" },
        { entityName: "Payment", instanceId: PAYMENT_ID }
      );
    });
  });

  describe("gateway invocation contract", () => {
    it("calls gateway with server-side payment metadata, never values from body", async () => {
      mocks.paymentFindFirstMock
        .mockResolvedValueOnce(makePayment({ currency: "USD" }))
        .mockResolvedValueOnce(makePayment({ currency: "USD", status: "COMPLETED" }));
      mocks.processPaymentGatewayMock.mockResolvedValue({
        success: true,
        transactionId: "txn_ok",
      });

      // Attacker tries to lie about amount/currency in the body.
      await PUT(
        buildRequest({
          amount: 0.01,
          currency: "ZWL",
          gatewayResponse: { code: "200", transactionId: "x" },
        }),
        { params: Promise.resolve({ id: PAYMENT_ID }) }
      );

      expect(mocks.processPaymentGatewayMock).toHaveBeenCalledTimes(1);
      const gatewayArgs = mocks.processPaymentGatewayMock.mock.calls[0][0];
      // Inputs come from the persisted payment row, NOT the body.
      expect(gatewayArgs).toEqual({
        paymentId: PAYMENT_ID,
        tenantId: TENANT_ID,
        amount: 100, // payment.amount, not body.amount=0.01
        currency: "USD", // payment.currency, not body.currency=ZWL
        gatewayPaymentMethodId: null,
      });
    });

    it("calls gateway BEFORE manifest runtime (no manifest write on gateway throw)", async () => {
      mocks.paymentFindFirstMock.mockResolvedValue(makePayment());
      mocks.processPaymentGatewayMock.mockRejectedValue(
        new Error("network timeout")
      );

      const res = await PUT(buildRequest(), {
        params: Promise.resolve({ id: PAYMENT_ID }),
      });

      // Handler converts the throw to 500; the contract being pinned is
      // that no manifest mutation happens on a thrown gateway call.
      expect(res.status).toBe(500);
      expect(mocks.manifestRunCommandMock).not.toHaveBeenCalled();
    });
  });

  describe("guard rails", () => {
    it("returns 404 when payment does not exist for tenant — gateway not called", async () => {
      mocks.paymentFindFirstMock.mockResolvedValue(null);

      const res = await PUT(buildRequest(), {
        params: Promise.resolve({ id: PAYMENT_ID }),
      });

      expect(res.status).toBe(404);
      expect(mocks.processPaymentGatewayMock).not.toHaveBeenCalled();
      expect(mocks.manifestRunCommandMock).not.toHaveBeenCalled();
    });

    it("rejects already-COMPLETED payment — gateway not called", async () => {
      mocks.paymentFindFirstMock.mockResolvedValue(
        makePayment({ status: "COMPLETED" })
      );

      const res = await PUT(buildRequest(), {
        params: Promise.resolve({ id: PAYMENT_ID }),
      });

      expect(res.status).toBe(500);
      expect(mocks.processPaymentGatewayMock).not.toHaveBeenCalled();
      expect(mocks.manifestRunCommandMock).not.toHaveBeenCalled();
    });
  });
});
