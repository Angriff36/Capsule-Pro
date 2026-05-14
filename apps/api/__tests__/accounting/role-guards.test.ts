/**
 * Role Guard Tests — accounting/invoices/[id] and accounting/payments/[id]
 *
 * Why these tests matter:
 *   Before P1.AM batch 2, every write handler on these routes called
 *   `requireTenantId()` only. Any authenticated tenant member — including
 *   staff-tier sessions like a host, dishwasher, or prep cook — could:
 *     - Settle/refund a payment via PUT/POST /payments/[id] (real money)
 *     - Edit invoice line items via PUT /invoices/[id]
 *     - Send / mark-as-paid / mark-overdue / send-reminder via
 *       PATCH /invoices/[id] (customer-visible emails + AR ledger mutation)
 *     - Send an invoice via POST /invoices/[id]/send
 *     - Void an invoice via DELETE /invoices/[id]
 *
 *   The fix wraps each write handler in `requireApiManager()`. These tests
 *   verify the 401/403 envelope without exercising the handlers' downstream
 *   work — if the guard returns a response, the route must short-circuit and
 *   never reach `database.*` or `checkRateLimit`.
 *
 *   This is a regression test on a security boundary. If someone removes the
 *   guard, the test fails because the database mocks are never invoked.
 *
 * @vitest-environment node
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const TENANT_ID = "00000000-0000-0000-0000-000000000010";

const mocks = vi.hoisted(() => ({
  requireTenantIdMock: vi.fn(),
  requireApiManagerMock: vi.fn(),
  invoiceFindFirstMock: vi.fn(),
  invoiceUpdateMock: vi.fn(),
  paymentFindFirstMock: vi.fn(),
  paymentUpdateMock: vi.fn(),
  checkRateLimitMock: vi.fn(),
  captureExceptionMock: vi.fn(),
  processPaymentGatewayMock: vi.fn(),
  refundPaymentGatewayMock: vi.fn(),
  resendSendMock: vi.fn(),
}));

vi.mock("@repo/database", () => ({
  database: {
    invoice: {
      findFirst: mocks.invoiceFindFirstMock,
      update: mocks.invoiceUpdateMock,
    },
    payment: {
      findFirst: mocks.paymentFindFirstMock,
      update: mocks.paymentUpdateMock,
    },
  },
}));

vi.mock("@repo/email", () => ({
  resend: { emails: { send: mocks.resendSendMock } },
  InvoiceTemplate: () => ({}),
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

vi.mock("@/app/lib/auth-roles", () => ({
  requireApiManager: mocks.requireApiManagerMock,
  requireApiAdmin: vi.fn(),
  requireApiRole: vi.fn(),
}));

vi.mock("@/middleware/rate-limiter", () => ({
  checkRateLimit: mocks.checkRateLimitMock,
}));

vi.mock("@/app/api/accounting/payments/[id]/gateway", () => ({
  processPaymentGateway: mocks.processPaymentGatewayMock,
  refundPaymentGateway: mocks.refundPaymentGatewayMock,
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: mocks.captureExceptionMock,
}));

import { NextRequest, NextResponse } from "next/server";
import {
  DELETE as DELETE_INVOICE,
  PATCH as PATCH_INVOICE,
  POST as POST_INVOICE,
  PUT as PUT_INVOICE,
} from "@/app/api/accounting/invoices/[id]/route";
import {
  POST as POST_PAYMENT,
  PUT as PUT_PAYMENT,
} from "@/app/api/accounting/payments/[id]/route";

const FORBIDDEN_RESPONSE = () =>
  NextResponse.json(
    {
      message: "Forbidden",
      reason: "insufficient_role",
      role: "staff",
      required: ["super_admin", "tenant_admin", "admin"],
    },
    { status: 403 }
  );

const UNAUTHORIZED_RESPONSE = () =>
  NextResponse.json({ message: "Unauthorized" }, { status: 401 });

const ctx = { params: Promise.resolve({ id: "inv-1" }) };
const reqJSON = (body: unknown) =>
  new NextRequest("https://x.example/test", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });

beforeEach(() => {
  mocks.requireTenantIdMock.mockResolvedValue(TENANT_ID);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("invoices/[id] role guard", () => {
  it("PUT returns 403 when caller lacks manager role", async () => {
    mocks.requireApiManagerMock.mockResolvedValue({
      ok: false,
      response: FORBIDDEN_RESPONSE(),
    });

    const res = await PUT_INVOICE(reqJSON({ notes: "x" }), ctx);

    expect(res.status).toBe(403);
    expect(mocks.invoiceFindFirstMock).not.toHaveBeenCalled();
    expect(mocks.invoiceUpdateMock).not.toHaveBeenCalled();
  });

  it("PATCH returns 401 when no session resolves", async () => {
    mocks.requireApiManagerMock.mockResolvedValue({
      ok: false,
      response: UNAUTHORIZED_RESPONSE(),
    });

    const res = await PATCH_INVOICE(reqJSON({ action: "mark-as-paid" }), ctx);

    expect(res.status).toBe(401);
    expect(mocks.invoiceFindFirstMock).not.toHaveBeenCalled();
  });

  it("POST (send) returns 403 when caller lacks manager role", async () => {
    mocks.requireApiManagerMock.mockResolvedValue({
      ok: false,
      response: FORBIDDEN_RESPONSE(),
    });

    const res = await POST_INVOICE(reqJSON({}), ctx);

    expect(res.status).toBe(403);
    expect(mocks.invoiceFindFirstMock).not.toHaveBeenCalled();
    expect(mocks.resendSendMock).not.toHaveBeenCalled();
  });

  it("DELETE returns 403 when caller lacks manager role", async () => {
    mocks.requireApiManagerMock.mockResolvedValue({
      ok: false,
      response: FORBIDDEN_RESPONSE(),
    });

    const res = await DELETE_INVOICE(reqJSON({}), ctx);

    expect(res.status).toBe(403);
    expect(mocks.invoiceFindFirstMock).not.toHaveBeenCalled();
  });
});

describe("payments/[id] role guard", () => {
  it("PUT (process) returns 403 and never reaches rate-limit / gateway", async () => {
    mocks.requireApiManagerMock.mockResolvedValue({
      ok: false,
      response: FORBIDDEN_RESPONSE(),
    });

    const res = await PUT_PAYMENT(reqJSON({}), ctx);

    expect(res.status).toBe(403);
    expect(mocks.checkRateLimitMock).not.toHaveBeenCalled();
    expect(mocks.processPaymentGatewayMock).not.toHaveBeenCalled();
    expect(mocks.paymentFindFirstMock).not.toHaveBeenCalled();
  });

  it("POST (refund) returns 403 and never reaches rate-limit / gateway", async () => {
    mocks.requireApiManagerMock.mockResolvedValue({
      ok: false,
      response: FORBIDDEN_RESPONSE(),
    });

    const res = await POST_PAYMENT(
      reqJSON({ amount: 100, reason: "test" }),
      ctx
    );

    expect(res.status).toBe(403);
    expect(mocks.checkRateLimitMock).not.toHaveBeenCalled();
    expect(mocks.refundPaymentGatewayMock).not.toHaveBeenCalled();
    expect(mocks.paymentFindFirstMock).not.toHaveBeenCalled();
  });
});
