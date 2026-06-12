/**
 * Invoice PATCH Action Test Suite
 *
 * Verifies the command-action dispatcher on `PATCH /api/accounting/invoices/[id]`.
 * The PATCH handler routes on `body.action` to apply-payment / mark-as-paid /
 * mark-overdue / send-reminder, and the DELETE handler voids.
 *
 * Post-migration (Task 8.2): all mutations go through `runManifestCommand`.
 * Tests verify the correct entity/command/body is delegated to the Manifest
 * runtime while pre-validation reads still use Prisma directly.
 *
 * Why these tests matter:
 *   - `apply-payment` is the financial source-of-truth transition. The route
 *     validates the payment amount, then delegates to Manifest. A regression
 *     in validation produces silent revenue leakage — the invoice closes but
 *     the ledger has not collected the cash.
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
const USER_ID = "00000000-0000-0000-0000-000000000099";

const mocks = vi.hoisted(() => ({
  invoiceFindFirstMock: vi.fn(),
  runManifestCommandMock: vi.fn(),
  resolveCurrentUserMock: vi.fn(),
  resendSendMock: vi.fn(),
  captureExceptionMock: vi.fn(),
  consoleErrorMock: vi.fn(),
}));

vi.mock("@repo/database", () => ({
  database: {
    invoice: {
      findFirst: mocks.invoiceFindFirstMock,
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
  requireTenantId: vi
    .fn()
    .mockResolvedValue("00000000-0000-0000-0000-000000000001"),
  resolveCurrentUser: mocks.resolveCurrentUserMock,
}));

vi.mock("@/app/lib/auth-roles", () => ({
  requireApiManager: vi.fn(async () => ({
    ok: true,
    user: {
      id: "00000000-0000-0000-0000-000000000099",
      tenantId: "00000000-0000-0000-0000-000000000001",
      role: "finance_manager",
      email: "manager@test",
      firstName: "Test",
      lastName: "Manager",
    },
    tenantId: "00000000-0000-0000-0000-000000000001",
  })),
  requireApiAdmin: vi.fn(),
  requireApiRole: vi.fn(),
}));

vi.mock("@/lib/manifest/execute-command", () => ({
  runManifestCommand: mocks.runManifestCommandMock,
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

function manifestSuccessResponse(data: unknown, status = 200) {
  return new Response(
    JSON.stringify({
      success: true,
      ...(typeof data === "object" && data !== null ? data : { data }),
    }),
    { status, headers: { "content-type": "application/json" } }
  );
}

describe("PATCH /api/accounting/invoices/[id] — action dispatcher", () => {
  beforeEach(() => {
    mocks.invoiceFindFirstMock.mockReset();
    mocks.runManifestCommandMock.mockReset();
    mocks.resolveCurrentUserMock.mockReset();
    mocks.resendSendMock.mockReset();
    mocks.captureExceptionMock.mockReset();
    mocks.consoleErrorMock.mockReset();

    mocks.resolveCurrentUserMock.mockResolvedValue({
      id: USER_ID,
      tenantId: TENANT_ID,
      role: "finance_manager",
    });
    mocks.resendSendMock.mockResolvedValue({ data: { id: "msg_test" } });
    mocks.runManifestCommandMock.mockResolvedValue(
      manifestSuccessResponse({ id: INVOICE_ID, status: "SENT" })
    );
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
    expect(mocks.runManifestCommandMock).not.toHaveBeenCalled();
  });

  it("returns 400 for unknown actions", async () => {
    mocks.invoiceFindFirstMock.mockResolvedValue(baseInvoice);

    const response = await PATCH(
      makePatchRequest({ action: "totally-not-a-real-action" }),
      { params }
    );

    expect(response.status).toBe(400);
    expect(mocks.runManifestCommandMock).not.toHaveBeenCalled();
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
      expect(mocks.runManifestCommandMock).not.toHaveBeenCalled();
    });

    it("rejects negative payment amounts", async () => {
      mocks.invoiceFindFirstMock.mockResolvedValue(baseInvoice);

      const response = await PATCH(
        makePatchRequest({ action: "apply-payment", amount: -50 }),
        { params }
      );

      expect(response.status).toBe(400);
      expect(mocks.runManifestCommandMock).not.toHaveBeenCalled();
    });

    it("delegates applyPayment to Manifest with correct amount", async () => {
      mocks.invoiceFindFirstMock.mockResolvedValue(baseInvoice);
      mocks.runManifestCommandMock.mockResolvedValue(
        manifestSuccessResponse({
          id: INVOICE_ID,
          status: "PARTIALLY_PAID",
          amountPaid: "300.00",
          amountDue: "700.00",
        })
      );

      const response = await PATCH(
        makePatchRequest({ action: "apply-payment", amount: 300 }),
        { params }
      );

      expect(response.status).toBe(200);
      expect(mocks.runManifestCommandMock).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "Invoice",
          command: "applyPayment",
          body: expect.objectContaining({
            id: INVOICE_ID,
            tenantId: TENANT_ID,
            paymentAmount: 300,
          }),
        })
      );
    });

    it("passes paymentId when provided", async () => {
      mocks.invoiceFindFirstMock.mockResolvedValue(baseInvoice);
      mocks.runManifestCommandMock.mockResolvedValue(
        manifestSuccessResponse({ id: INVOICE_ID, status: "PARTIALLY_PAID" })
      );

      await PATCH(
        makePatchRequest({
          action: "apply-payment",
          amount: 300,
          paymentId: "pay-123",
        }),
        { params }
      );

      expect(mocks.runManifestCommandMock).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            paymentId: "pay-123",
          }),
        })
      );
    });

    it("defaults paymentId to empty string when not provided", async () => {
      mocks.invoiceFindFirstMock.mockResolvedValue(baseInvoice);
      mocks.runManifestCommandMock.mockResolvedValue(
        manifestSuccessResponse({ id: INVOICE_ID, status: "PARTIALLY_PAID" })
      );

      await PATCH(makePatchRequest({ action: "apply-payment", amount: 300 }), {
        params,
      });

      expect(mocks.runManifestCommandMock).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            paymentId: "",
          }),
        })
      );
    });
  });

  // ---------------------------------------------------------------- mark-as-paid

  describe("action: mark-as-paid", () => {
    it("delegates markAsPaid to Manifest", async () => {
      mocks.invoiceFindFirstMock.mockResolvedValue(baseInvoice);
      mocks.runManifestCommandMock.mockResolvedValue(
        manifestSuccessResponse({
          id: INVOICE_ID,
          status: "PAID",
          amountPaid: "1000.00",
          amountDue: "0.00",
        })
      );

      const response = await PATCH(
        makePatchRequest({ action: "mark-as-paid" }),
        { params }
      );

      expect(response.status).toBe(200);
      expect(mocks.runManifestCommandMock).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "Invoice",
          command: "markAsPaid",
          body: expect.objectContaining({
            id: INVOICE_ID,
            tenantId: TENANT_ID,
          }),
        })
      );
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
      expect(mocks.runManifestCommandMock).not.toHaveBeenCalled();
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
      expect(mocks.runManifestCommandMock).not.toHaveBeenCalled();
    });

    it("delegates markOverdue to Manifest for a SENT invoice", async () => {
      mocks.invoiceFindFirstMock.mockResolvedValue(baseInvoice);
      mocks.runManifestCommandMock.mockResolvedValue(
        manifestSuccessResponse({ id: INVOICE_ID, status: "OVERDUE" })
      );

      const response = await PATCH(
        makePatchRequest({ action: "mark-overdue" }),
        { params }
      );

      expect(response.status).toBe(200);
      expect(mocks.runManifestCommandMock).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "Invoice",
          command: "markOverdue",
          body: expect.objectContaining({
            id: INVOICE_ID,
            tenantId: TENANT_ID,
          }),
        })
      );
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
      expect(mocks.runManifestCommandMock).not.toHaveBeenCalled();
      expect(mocks.resendSendMock).not.toHaveBeenCalled();
    });

    it("delegates sendReminder to Manifest then sends email", async () => {
      mocks.invoiceFindFirstMock.mockResolvedValue(baseInvoice);
      mocks.runManifestCommandMock.mockResolvedValue(
        manifestSuccessResponse({ id: INVOICE_ID, status: "SENT" })
      );

      const response = await PATCH(
        makePatchRequest({ action: "send-reminder" }),
        { params }
      );

      expect(response.status).toBe(200);
      expect(mocks.runManifestCommandMock).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "Invoice",
          command: "sendReminder",
          body: expect.objectContaining({
            id: INVOICE_ID,
            tenantId: TENANT_ID,
          }),
        })
      );
      expect(mocks.resendSendMock).toHaveBeenCalledTimes(1);

      const sendArgs = mocks.resendSendMock.mock.calls[0][0];
      expect(sendArgs.to).toBe("client@example.com");
      expect(sendArgs.subject).toMatch(/reminder/i);
      expect(sendArgs.subject).toContain("INV-2026-0001");
    });

    it("skips email when client has no email on file (no crash)", async () => {
      mocks.invoiceFindFirstMock.mockResolvedValue({
        ...baseInvoice,
        client: { ...baseInvoice.client, email: null },
      });
      mocks.runManifestCommandMock.mockResolvedValue(
        manifestSuccessResponse({ id: INVOICE_ID, status: "SENT" })
      );

      const response = await PATCH(
        makePatchRequest({ action: "send-reminder" }),
        { params }
      );

      expect(response.status).toBe(200);
      expect(mocks.runManifestCommandMock).toHaveBeenCalled();
      expect(mocks.resendSendMock).not.toHaveBeenCalled();
      expect(mocks.captureExceptionMock).not.toHaveBeenCalled();
    });

    it("does NOT roll back the Manifest write when Resend throws", async () => {
      mocks.invoiceFindFirstMock.mockResolvedValue(baseInvoice);
      mocks.runManifestCommandMock.mockResolvedValue(
        manifestSuccessResponse({ id: INVOICE_ID, status: "SENT" })
      );
      mocks.resendSendMock.mockRejectedValue(new Error("Resend down"));

      const response = await PATCH(
        makePatchRequest({ action: "send-reminder" }),
        { params }
      );

      // Manifest write succeeded (200), email failure is non-fatal
      expect(response.status).toBe(200);
      expect(mocks.captureExceptionMock).toHaveBeenCalled();
      // Manifest command ran before the email failed.
      expect(mocks.runManifestCommandMock).toHaveBeenCalled();
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
    mocks.runManifestCommandMock.mockReset();
    mocks.resolveCurrentUserMock.mockReset();
    mocks.captureExceptionMock.mockReset();
    mocks.consoleErrorMock.mockReset();

    mocks.resolveCurrentUserMock.mockResolvedValue({
      id: USER_ID,
      tenantId: TENANT_ID,
      role: "finance_manager",
    });
    mocks.runManifestCommandMock.mockResolvedValue(
      manifestSuccessResponse({ id: INVOICE_ID, status: "VOID" })
    );
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

  it("delegates voidInvoice to Manifest for a SENT invoice with no payments", async () => {
    mocks.invoiceFindFirstMock.mockResolvedValue(baseInvoice);
    mocks.runManifestCommandMock.mockResolvedValue(
      manifestSuccessResponse({ id: INVOICE_ID, status: "VOID" })
    );

    const response = await DELETE(makeDeleteRequest(), { params });

    expect(response.status).toBe(200);
    expect(mocks.runManifestCommandMock).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "Invoice",
        command: "voidInvoice",
        body: expect.objectContaining({
          id: INVOICE_ID,
          tenantId: TENANT_ID,
          reason: "Voided via API",
        }),
      })
    );
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
    // catches in its general error path → 500. Either way, no Manifest
    // command must have run.
    expect([400, 500]).toContain(response.status);
    expect(mocks.runManifestCommandMock).not.toHaveBeenCalled();
  });
});
