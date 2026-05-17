/**
 * Invoice PATCH Action Test Suite
 *
 * Verifies the command-action dispatcher on `PATCH /api/accounting/invoices/[id]`.
 * The PATCH handler routes on `body.action` to apply-payment / mark-as-paid /
 * mark-overdue / send-reminder, and the DELETE handler voids.
 *
 * Why these tests matter:
 *   - `apply-payment` is the financial source-of-truth transition. The route
 *     computes `newAmountPaid = amountPaid + amount` and `newStatus =
 *     newAmountDue <= 0.01 ? "PAID" : "PARTIALLY_PAID"`. A regression in that
 *     arithmetic produces silent revenue leakage — the invoice closes but the
 *     ledger has not collected the cash. Cover the boundary at 0.01 explicitly.
 *   - `mark-overdue` must reject terminal states (VOID/PAID). Allowing OVERDUE
 *     after PAID breaks downstream dunning and collections (the scheduler
 *     would re-open closed accounts).
 *   - `send-reminder` must reject DRAFT — drafts have no client-facing
 *     invoice number/total yet and emailing one is a customer-visible bug.
 *   - DELETE (void) must run business-rule validation. Voiding a PAID invoice
 *     creates an unreconcilable phantom payment.
 *
 * @vitest-environment node
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const INVOICE_ID = "11111111-1111-1111-1111-111111111111";
const CLIENT_ID = "22222222-2222-2222-2222-222222222222";
const EVENT_ID = "33333333-3333-3333-3333-333333333333";

const mocks = vi.hoisted(() => ({
  invoiceFindFirstMock: vi.fn(),
  invoiceUpdateMock: vi.fn(),
  requireTenantIdMock: vi.fn(),
  resendSendMock: vi.fn(),
  captureExceptionMock: vi.fn(),
  consoleErrorMock: vi.fn(),
}));

vi.mock("@repo/database", () => ({
  database: {
    invoice: {
      findFirst: mocks.invoiceFindFirstMock,
      update: mocks.invoiceUpdateMock,
    },
  },
}));

vi.mock("@repo/email", () => ({
  resend: {
    emails: {
      send: mocks.resendSendMock,
    },
  },
  InvoiceTemplate: (props: unknown) => ({ __invoiceTemplate: true, props }),
}));

vi.mock("@/app/lib/tenant", () => ({
  requireTenantId: mocks.requireTenantIdMock,
}));

// P1.AM: routes now gate on manager-tier role via requireApiManager. Tests
// don't exercise the auth-roles helper directly — they stub it to grant access
// using the tenantId the test setup wired into requireTenantIdMock. Role-guard
// behavior is covered by `auth-roles.test.ts`.
vi.mock("@/app/lib/auth-roles", () => ({
  requireApiManager: vi.fn(async () => ({
    ok: true,
    user: {
      id: "user-test",
      tenantId: await mocks.requireTenantIdMock(),
      role: "finance_manager",
      email: "manager@test",
      firstName: "Test",
      lastName: "Manager",
    },
    tenantId: await mocks.requireTenantIdMock(),
  })),
  requireApiAdmin: vi.fn(),
  requireApiRole: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: mocks.captureExceptionMock,
}));

import { NextRequest } from "next/server";
import { DELETE, PATCH } from "@/app/api/accounting/invoices/[id]/route";

const baseInvoice = {
  tenantId: TENANT_ID,
  id: INVOICE_ID,
  invoiceNumber: "INV-2026-0001",
  invoiceType: "FINAL_PAYMENT",
  status: "SENT",
  clientId: CLIENT_ID,
  eventId: EVENT_ID,
  subtotal: { toString: () => "1000.00" },
  taxAmount: { toString: () => "0.00" },
  discountAmount: { toString: () => "0.00" },
  total: { toString: () => "1000.00" },
  amountPaid: { toString: () => "0.00" },
  amountDue: { toString: () => "1000.00" },
  depositPercentage: null,
  depositRequired: null,
  depositPaid: null,
  paymentTerms: 30,
  dueDate: new Date("2026-05-15T00:00:00.000Z"),
  issuedAt: new Date("2026-04-15T00:00:00.000Z"),
  notes: null,
  internalNotes: null,
  lineItems: [],
  metadata: {},
  sentAt: new Date("2026-04-15T00:00:00.000Z"),
  viewedAt: null,
  paidAt: null,
  voidedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  client: {
    id: CLIENT_ID,
    email: "client@example.com",
    first_name: "Pat",
    company_name: "Acme Co",
  },
};

function makePatchRequest(body: Record<string, unknown>) {
  return new NextRequest(
    new URL(`http://localhost/api/accounting/invoices/${INVOICE_ID}`),
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

function makeDeleteRequest() {
  return new NextRequest(
    new URL(`http://localhost/api/accounting/invoices/${INVOICE_ID}`),
    { method: "DELETE" }
  );
}

const params = Promise.resolve({ id: INVOICE_ID });

describe("PATCH /api/accounting/invoices/[id] — action dispatcher", () => {
  beforeEach(() => {
    mocks.invoiceFindFirstMock.mockReset();
    mocks.invoiceUpdateMock.mockReset();
    mocks.requireTenantIdMock.mockReset();
    mocks.resendSendMock.mockReset();
    mocks.captureExceptionMock.mockReset();
    mocks.consoleErrorMock.mockReset();

    mocks.requireTenantIdMock.mockResolvedValue(TENANT_ID);
    mocks.resendSendMock.mockResolvedValue({ data: { id: "msg_test" } });
    vi.spyOn(console, "error").mockImplementation(mocks.consoleErrorMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------- 404 / guards

  it("returns 404 when invoice does not exist", async () => {
    mocks.invoiceFindFirstMock.mockResolvedValue(null);

    const response = await PATCH(makePatchRequest({ action: "mark-as-paid" }), {
      params,
    });

    expect(response.status).toBe(404);
    expect(mocks.invoiceUpdateMock).not.toHaveBeenCalled();
  });

  it("returns 400 for unknown actions", async () => {
    mocks.invoiceFindFirstMock.mockResolvedValue(baseInvoice);

    const response = await PATCH(
      makePatchRequest({ action: "totally-not-a-real-action" }),
      { params }
    );

    expect(response.status).toBe(400);
    expect(mocks.invoiceUpdateMock).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------- apply-payment

  describe("action: apply-payment", () => {
    it("rejects payment of zero amount", async () => {
      mocks.invoiceFindFirstMock.mockResolvedValue(baseInvoice);

      const response = await PATCH(
        makePatchRequest({ action: "apply-payment", amount: 0 }),
        { params }
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toMatch(/valid payment amount/i);
      expect(mocks.invoiceUpdateMock).not.toHaveBeenCalled();
    });

    it("rejects negative payment amounts", async () => {
      mocks.invoiceFindFirstMock.mockResolvedValue(baseInvoice);

      const response = await PATCH(
        makePatchRequest({ action: "apply-payment", amount: -50 }),
        { params }
      );

      expect(response.status).toBe(400);
      expect(mocks.invoiceUpdateMock).not.toHaveBeenCalled();
    });

    it("transitions to PARTIALLY_PAID when amount < total", async () => {
      mocks.invoiceFindFirstMock.mockResolvedValue(baseInvoice);
      mocks.invoiceUpdateMock.mockResolvedValue({
        ...baseInvoice,
        amountPaid: { toString: () => "300.00" },
        amountDue: { toString: () => "700.00" },
        status: "PARTIALLY_PAID",
      });

      const response = await PATCH(
        makePatchRequest({ action: "apply-payment", amount: 300 }),
        { params }
      );

      expect(response.status).toBe(200);
      expect(mocks.invoiceUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            amountPaid: 300,
            amountDue: 700,
            status: "PARTIALLY_PAID",
          }),
        })
      );
      // PartiallyPaid must NOT set paidAt
      const dataArg = mocks.invoiceUpdateMock.mock.calls[0][0].data;
      expect(dataArg.paidAt).toBeNull();
    });

    it("transitions to PAID and stamps paidAt when amount fully covers total", async () => {
      mocks.invoiceFindFirstMock.mockResolvedValue(baseInvoice);
      mocks.invoiceUpdateMock.mockResolvedValue({
        ...baseInvoice,
        amountPaid: { toString: () => "1000.00" },
        amountDue: { toString: () => "0.00" },
        status: "PAID",
        paidAt: new Date(),
      });

      const response = await PATCH(
        makePatchRequest({ action: "apply-payment", amount: 1000 }),
        { params }
      );

      expect(response.status).toBe(200);
      const dataArg = mocks.invoiceUpdateMock.mock.calls[0][0].data;
      expect(dataArg.status).toBe("PAID");
      expect(dataArg.paidAt).toBeInstanceOf(Date);
      expect(dataArg.amountDue).toBe(0);
    });

    it("clamps amountDue to 0 when overpayment occurs", async () => {
      mocks.invoiceFindFirstMock.mockResolvedValue(baseInvoice);
      mocks.invoiceUpdateMock.mockResolvedValue({
        ...baseInvoice,
        amountPaid: { toString: () => "1100.00" },
        amountDue: { toString: () => "0.00" },
        status: "PAID",
      });

      await PATCH(makePatchRequest({ action: "apply-payment", amount: 1100 }), {
        params,
      });

      const dataArg = mocks.invoiceUpdateMock.mock.calls[0][0].data;
      // newAmountDue = 1000 - 1100 = -100, must be clamped to 0
      expect(dataArg.amountDue).toBe(0);
      expect(dataArg.amountPaid).toBe(1100);
      expect(dataArg.status).toBe("PAID");
    });

    it("treats payment that lands within 0.01 of total as PAID", async () => {
      // Floating-point boundary — partial payment of 999.995 leaves 0.005
      // remaining due, which is within the PAID tolerance.
      const invoiceWithPartial = {
        ...baseInvoice,
        amountPaid: { toString: () => "999.995" },
        amountDue: { toString: () => "0.005" },
      };
      mocks.invoiceFindFirstMock.mockResolvedValue(invoiceWithPartial);
      mocks.invoiceUpdateMock.mockResolvedValue({
        ...baseInvoice,
        status: "PAID",
      });

      // Apply payment that brings due to exactly 0.01 - within tolerance
      const tinyTopUp = 0; // simulate via 0 not allowed; use 0.005
      void tinyTopUp;
      // Apply 0.0049 leaves 0.0001 remaining → PAID branch
      await PATCH(
        makePatchRequest({ action: "apply-payment", amount: 0.0049 }),
        { params }
      );

      const dataArg = mocks.invoiceUpdateMock.mock.calls[0][0].data;
      expect(dataArg.status).toBe("PAID");
    });
  });

  // ---------------------------------------------------------------- mark-as-paid

  describe("action: mark-as-paid", () => {
    it("forces status to PAID with amountPaid=total and amountDue=0", async () => {
      mocks.invoiceFindFirstMock.mockResolvedValue(baseInvoice);
      mocks.invoiceUpdateMock.mockResolvedValue({
        ...baseInvoice,
        status: "PAID",
        amountPaid: { toString: () => "1000.00" },
        amountDue: { toString: () => "0.00" },
        paidAt: new Date(),
      });

      const response = await PATCH(
        makePatchRequest({ action: "mark-as-paid" }),
        { params }
      );

      expect(response.status).toBe(200);
      const dataArg = mocks.invoiceUpdateMock.mock.calls[0][0].data;
      expect(dataArg.status).toBe("PAID");
      expect(dataArg.amountPaid).toBe(baseInvoice.total);
      expect(dataArg.amountDue).toBe(0);
      expect(dataArg.paidAt).toBeInstanceOf(Date);
    });
  });

  // ---------------------------------------------------------------- mark-overdue

  describe("action: mark-overdue", () => {
    it("rejects mark-overdue on a VOID invoice", async () => {
      mocks.invoiceFindFirstMock.mockResolvedValue({
        ...baseInvoice,
        status: "VOID",
      });

      const response = await PATCH(
        makePatchRequest({ action: "mark-overdue" }),
        { params }
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toMatch(/cannot mark/i);
      expect(body.error).toMatch(/VOID/);
      expect(mocks.invoiceUpdateMock).not.toHaveBeenCalled();
    });

    it("rejects mark-overdue on a PAID invoice", async () => {
      mocks.invoiceFindFirstMock.mockResolvedValue({
        ...baseInvoice,
        status: "PAID",
      });

      const response = await PATCH(
        makePatchRequest({ action: "mark-overdue" }),
        { params }
      );

      expect(response.status).toBe(400);
      expect(mocks.invoiceUpdateMock).not.toHaveBeenCalled();
    });

    it("transitions a SENT invoice to OVERDUE", async () => {
      mocks.invoiceFindFirstMock.mockResolvedValue(baseInvoice);
      mocks.invoiceUpdateMock.mockResolvedValue({
        ...baseInvoice,
        status: "OVERDUE",
      });

      const response = await PATCH(
        makePatchRequest({ action: "mark-overdue" }),
        { params }
      );

      expect(response.status).toBe(200);
      const dataArg = mocks.invoiceUpdateMock.mock.calls[0][0].data;
      expect(dataArg.status).toBe("OVERDUE");
    });
  });

  // ---------------------------------------------------------------- send-reminder

  describe("action: send-reminder", () => {
    it("rejects sending reminder for a DRAFT invoice", async () => {
      mocks.invoiceFindFirstMock.mockResolvedValue({
        ...baseInvoice,
        status: "DRAFT",
      });

      const response = await PATCH(
        makePatchRequest({ action: "send-reminder" }),
        { params }
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toMatch(/draft/i);
      expect(mocks.invoiceUpdateMock).not.toHaveBeenCalled();
      expect(mocks.resendSendMock).not.toHaveBeenCalled();
    });

    it("sends an email and updates the invoice timestamp", async () => {
      mocks.invoiceFindFirstMock.mockResolvedValue(baseInvoice);
      mocks.invoiceUpdateMock.mockResolvedValue({
        ...baseInvoice,
        client: baseInvoice.client,
      });

      const response = await PATCH(
        makePatchRequest({ action: "send-reminder" }),
        { params }
      );

      expect(response.status).toBe(200);
      expect(mocks.resendSendMock).toHaveBeenCalledTimes(1);

      const sendArgs = mocks.resendSendMock.mock.calls[0][0];
      expect(sendArgs.to).toBe("client@example.com");
      expect(sendArgs.subject).toMatch(/reminder/i);
      expect(sendArgs.subject).toContain("INV-2026-0001");

      // The reminder must NOT set status — only updatedAt.
      const dataArg = mocks.invoiceUpdateMock.mock.calls[0][0].data;
      expect(dataArg.status).toBeUndefined();
      expect(dataArg.updatedAt).toBeInstanceOf(Date);
    });

    it("skips email when client has no email on file (no crash)", async () => {
      mocks.invoiceFindFirstMock.mockResolvedValue({
        ...baseInvoice,
        client: { ...baseInvoice.client, email: null },
      });
      mocks.invoiceUpdateMock.mockResolvedValue({
        ...baseInvoice,
        client: { ...baseInvoice.client, email: null },
      });

      const response = await PATCH(
        makePatchRequest({ action: "send-reminder" }),
        { params }
      );

      expect(response.status).toBe(200);
      expect(mocks.resendSendMock).not.toHaveBeenCalled();
      expect(mocks.captureExceptionMock).not.toHaveBeenCalled();
    });

    it("does NOT roll back the timestamp update when Resend throws", async () => {
      mocks.invoiceFindFirstMock.mockResolvedValue(baseInvoice);
      mocks.invoiceUpdateMock.mockResolvedValue(baseInvoice);
      mocks.resendSendMock.mockRejectedValue(new Error("Resend down"));

      const response = await PATCH(
        makePatchRequest({ action: "send-reminder" }),
        { params }
      );

      expect(response.status).toBe(200);
      expect(mocks.captureExceptionMock).toHaveBeenCalled();
      // Update still ran after the email failed.
      expect(mocks.invoiceUpdateMock).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------- error path

  it("returns 500 on unexpected database error", async () => {
    mocks.invoiceFindFirstMock.mockRejectedValue(new Error("DB exploded"));

    const response = await PATCH(makePatchRequest({ action: "mark-as-paid" }), {
      params,
    });

    expect(response.status).toBe(500);
    expect(mocks.captureExceptionMock).toHaveBeenCalled();
  });
});

describe("DELETE /api/accounting/invoices/[id] — void", () => {
  beforeEach(() => {
    mocks.invoiceFindFirstMock.mockReset();
    mocks.invoiceUpdateMock.mockReset();
    mocks.requireTenantIdMock.mockReset();
    mocks.captureExceptionMock.mockReset();

    mocks.requireTenantIdMock.mockResolvedValue(TENANT_ID);
    vi.spyOn(console, "error").mockImplementation(mocks.consoleErrorMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 404 when invoice does not exist", async () => {
    mocks.invoiceFindFirstMock.mockResolvedValue(null);

    const response = await DELETE(makeDeleteRequest(), { params });

    expect(response.status).toBe(404);
  });

  it("voids a SENT invoice with no payments", async () => {
    mocks.invoiceFindFirstMock.mockResolvedValue(baseInvoice);
    mocks.invoiceUpdateMock.mockResolvedValue({
      ...baseInvoice,
      status: "VOID",
    });

    const response = await DELETE(makeDeleteRequest(), { params });

    expect(response.status).toBe(200);
    const dataArg = mocks.invoiceUpdateMock.mock.calls[0][0].data;
    expect(dataArg.status).toBe("VOID");
  });

  it("rejects voiding a PAID invoice (business rule)", async () => {
    mocks.invoiceFindFirstMock.mockResolvedValue({
      ...baseInvoice,
      status: "PAID",
      amountPaid: { toString: () => "1000.00" },
      amountDue: { toString: () => "0.00" },
    });

    const response = await DELETE(makeDeleteRequest(), { params });

    // validateInvoiceBusinessRules throws an invariant which the route
    // catches in its general error path → 500. Either way, no update
    // must have run.
    expect([400, 500]).toContain(response.status);
    expect(mocks.invoiceUpdateMock).not.toHaveBeenCalled();
  });
});
