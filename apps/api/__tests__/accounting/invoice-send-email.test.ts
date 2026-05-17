/**
 * Invoice Send Email Test Suite
 *
 * Verifies the email-dispatch contract on `POST /api/accounting/invoices/[id]`
 * (the "send invoice" handler).
 *
 * Why these tests matter:
 *   - The status transition DRAFT → SENT is the source of truth. The
 *     notification email is a side-effect that must NEVER roll back the
 *     transition. A regression that throws on email failure would block
 *     legitimate sends every time Resend has a transient outage.
 *   - When a client has no email on file we must skip the email entirely
 *     (not crash, not queue garbage, not pass `to: null` to Resend).
 *   - The subject and body must include the invoice number, amount due, and
 *     a payment URL the client can actually click. A regression that drops
 *     the URL or amount is a customer-facing bug we cannot catch in prod
 *     without per-tenant email logs.
 *   - Email failures must surface to Sentry (`captureException`) so the ops
 *     team can detect Resend regressions even though the route returns 200.
 *
 * @vitest-environment node
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const TENANT_ID_OTHER = "00000000-0000-0000-0000-000000000002";
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
  // The route imports InvoiceTemplate as a function and passes its return
  // value as `react:` to Resend. We stub it as a marker so the test can
  // assert the props it received.
  InvoiceTemplate: (props: unknown) => ({ __invoiceTemplate: true, props }),
}));

vi.mock("@/app/lib/tenant", () => ({
  requireTenantId: mocks.requireTenantIdMock,
}));

// P1.AM: POST /invoices/[id] now gates on manager-tier role. Stub auth-roles
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

import { NextRequest } from "next/server";
import { POST } from "@/app/api/accounting/invoices/[id]/route";

const draftInvoice = {
  tenantId: TENANT_ID,
  id: INVOICE_ID,
  invoiceNumber: "INV-2026-0001",
  invoiceType: "FINAL_PAYMENT",
  status: "DRAFT",
  clientId: CLIENT_ID,
  eventId: EVENT_ID,
  subtotal: { toString: () => "1000.00" },
  taxAmount: { toString: () => "0.00" },
  discountAmount: { toString: () => "0.00" },
  total: { toString: () => "1000.00" },
  amountPaid: { toString: () => "0.00" },
  amountDue: { toString: () => "1250.00" },
  depositPercentage: null,
  depositRequired: null,
  depositPaid: null,
  paymentTerms: 30,
  dueDate: new Date("2026-05-15T00:00:00.000Z"),
  issuedAt: new Date("2026-04-15T00:00:00.000Z"),
  notes: "Please remit promptly.",
  internalNotes: null,
  lineItems: [],
  metadata: {},
  sentAt: null,
  viewedAt: null,
  paidAt: null,
  voidedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const sentInvoiceWithClient = {
  ...draftInvoice,
  status: "SENT",
  sentAt: new Date(),
  client: {
    id: CLIENT_ID,
    company_name: "Acme Catering",
    first_name: "Jane",
    last_name: "Smith",
    email: "jane@acme.example.com",
    defaultPaymentTerms: 30,
  },
  event: {
    id: EVENT_ID,
    title: "Wedding Reception",
    eventDate: new Date("2026-06-01T00:00:00.000Z"),
  },
};

function makeRequest() {
  return new NextRequest(
    new URL(`http://localhost/api/accounting/invoices/${INVOICE_ID}`),
    { method: "POST" }
  );
}

const params = Promise.resolve({ id: INVOICE_ID });

describe("POST /api/accounting/invoices/[id] — email dispatch", () => {
  beforeEach(() => {
    mocks.invoiceFindFirstMock.mockReset();
    mocks.invoiceUpdateMock.mockReset();
    mocks.requireTenantIdMock.mockReset();
    mocks.resendSendMock.mockReset();
    mocks.captureExceptionMock.mockReset();
    mocks.consoleErrorMock.mockReset();

    mocks.requireTenantIdMock.mockResolvedValue(TENANT_ID);
    mocks.invoiceFindFirstMock.mockResolvedValue(draftInvoice);
    mocks.invoiceUpdateMock.mockResolvedValue(sentInvoiceWithClient);
    mocks.resendSendMock.mockResolvedValue({ data: { id: "msg_test" } });

    vi.spyOn(console, "error").mockImplementation(mocks.consoleErrorMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends an email when client has an email address", async () => {
    const response = await POST(makeRequest(), { params });

    expect(response.status).toBe(200);
    expect(mocks.resendSendMock).toHaveBeenCalledTimes(1);

    const sendArgs = mocks.resendSendMock.mock.calls[0][0];
    expect(sendArgs.to).toBe("jane@acme.example.com");
    expect(sendArgs.subject).toContain("INV-2026-0001");
    expect(sendArgs.subject).toContain("1250.00");
    expect(sendArgs.from).toBeTruthy();
  });

  it("renders the InvoiceTemplate with required props", async () => {
    await POST(makeRequest(), { params });

    const sendArgs = mocks.resendSendMock.mock.calls[0][0];
    expect(sendArgs.react).toMatchObject({
      __invoiceTemplate: true,
      props: {
        clientName: "Jane",
        invoiceNumber: "INV-2026-0001",
        amountDue: "1250.00",
        currency: "USD",
        // The route should compute a public-facing payment URL containing
        // the invoice id so the client can navigate from the email.
        paymentUrl: expect.stringContaining(INVOICE_ID),
        notes: "Please remit promptly.",
      },
    });
  });

  it("falls back to company_name when client has no first_name", async () => {
    mocks.invoiceUpdateMock.mockResolvedValue({
      ...sentInvoiceWithClient,
      client: {
        ...sentInvoiceWithClient.client,
        first_name: null,
      },
    });

    await POST(makeRequest(), { params });

    const sendArgs = mocks.resendSendMock.mock.calls[0][0];
    expect(sendArgs.react.props.clientName).toBe("Acme Catering");
  });

  it("falls back to a generic greeting when client has no name fields", async () => {
    mocks.invoiceUpdateMock.mockResolvedValue({
      ...sentInvoiceWithClient,
      client: {
        ...sentInvoiceWithClient.client,
        first_name: null,
        company_name: null,
      },
    });

    await POST(makeRequest(), { params });

    const sendArgs = mocks.resendSendMock.mock.calls[0][0];
    expect(sendArgs.react.props.clientName).toBe("Valued Client");
  });

  it("skips email entirely when client has no email", async () => {
    mocks.invoiceUpdateMock.mockResolvedValue({
      ...sentInvoiceWithClient,
      client: {
        ...sentInvoiceWithClient.client,
        email: null,
      },
    });

    const response = await POST(makeRequest(), { params });

    expect(response.status).toBe(200);
    expect(mocks.resendSendMock).not.toHaveBeenCalled();
    expect(mocks.captureExceptionMock).not.toHaveBeenCalled();
  });

  it("skips email when client relation is missing", async () => {
    mocks.invoiceUpdateMock.mockResolvedValue({
      ...sentInvoiceWithClient,
      client: null,
    });

    const response = await POST(makeRequest(), { params });

    expect(response.status).toBe(200);
    expect(mocks.resendSendMock).not.toHaveBeenCalled();
  });

  it("does NOT roll back the SENT transition if Resend throws", async () => {
    mocks.resendSendMock.mockRejectedValue(new Error("Resend down"));

    const response = await POST(makeRequest(), { params });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("SENT");
    // Status update was committed BEFORE the email attempt.
    expect(mocks.invoiceUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "SENT" }),
      })
    );
  });

  it("captures email failures to Sentry without failing the request", async () => {
    const emailError = new Error("Resend timeout");
    mocks.resendSendMock.mockRejectedValue(emailError);

    const response = await POST(makeRequest(), { params });

    expect(response.status).toBe(200);
    expect(mocks.captureExceptionMock).toHaveBeenCalledWith(emailError);
    expect(mocks.consoleErrorMock).toHaveBeenCalled();
  });

  it("rejects sending an invoice from another tenant (access invariant)", async () => {
    // Cross-tenant access: lookup returns an invoice owned by TENANT_ID_OTHER.
    mocks.invoiceFindFirstMock.mockResolvedValue({
      ...draftInvoice,
      tenantId: TENANT_ID_OTHER,
    });

    const response = await POST(makeRequest(), { params });

    expect(response.status).toBe(500);
    // No status update, no email send when access is denied.
    expect(mocks.invoiceUpdateMock).not.toHaveBeenCalled();
    expect(mocks.resendSendMock).not.toHaveBeenCalled();
  });

  it("returns 404 when invoice does not exist", async () => {
    mocks.invoiceFindFirstMock.mockResolvedValue(null);

    const response = await POST(makeRequest(), { params });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Invoice not found");
    expect(mocks.resendSendMock).not.toHaveBeenCalled();
  });

  it("formats the dueDate as a human-readable string in template props", async () => {
    await POST(makeRequest(), { params });

    const sendArgs = mocks.resendSendMock.mock.calls[0][0];
    // Locale formatting — accept "May 15, 2026" or "May 14, 2026"
    // (timezone-dependent), just assert it contains the year and month.
    expect(sendArgs.react.props.dueDate).toMatch(/2026/);
    expect(sendArgs.react.props.dueDate).toMatch(/May/);
  });
});
