/**
 * Invoice Send Email Test Suite
 *
 * Verifies the email-dispatch contract on `POST /api/accounting/invoices/[id]`
 * (the "send invoice" handler).
 *
 * Post-migration (Task 8.2): the status transition goes through `runManifestCommand`.
 * The email is a best-effort side-effect after the governed write succeeds.
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
  // The route imports InvoiceTemplate as a function and passes its return
  // value as `react:` to Resend. We stub it as a marker so the test can
  // assert the props it received.
  InvoiceTemplate: (props: unknown) => ({ __invoiceTemplate: true, props }),
}));

vi.mock("@/app/lib/tenant", () => ({
  requireTenantId: vi.fn().mockResolvedValue("00000000-0000-0000-0000-000000000001"),
  resolveCurrentUser: mocks.resolveCurrentUserMock,
}));

// P1.AM: POST /invoices/[id] now gates on manager-tier role. Stub auth-roles
// to grant access using the tenantId from resolveCurrentUser.
vi.mock("@/app/lib/auth-roles", () => ({
  requireApiManager: vi.fn(async () => ({
    ok: true,
    user: {
      id: "00000000-0000-0000-0000-000000000099",
      tenantId: "00000000-0000-0000-0000-000000000001",
      role: "finance_manager",
      email: "m@t",
      firstName: "T",
      lastName: "M",
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

function manifestSuccessResponse(data: unknown, status = 200) {
  return new Response(
    JSON.stringify({ success: true, ...(typeof data === "object" && data !== null ? data : { data }) }),
    { status, headers: { "content-type": "application/json" } }
  );
}

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
    mocks.invoiceFindFirstMock.mockResolvedValue(draftInvoice);
    mocks.resendSendMock.mockResolvedValue({ data: { id: "msg_test" } });
    mocks.runManifestCommandMock.mockResolvedValue(
      manifestSuccessResponse({
        id: INVOICE_ID,
        status: "SENT",
        result: { ...sentInvoiceWithClient },
      })
    );
    vi.spyOn(console, "error").mockImplementation(mocks.consoleErrorMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends an email when client has an email address", async () => {
    const response = await makeRequestWithClient(sentInvoiceWithClient.client);

    expect(response.status).toBe(200);
    expect(mocks.resendSendMock).toHaveBeenCalledTimes(1);

    const sendArgs = mocks.resendSendMock.mock.calls[0][0];
    expect(sendArgs.to).toBe("jane@acme.example.com");
    expect(sendArgs.subject).toContain("INV-2026-0001");
    expect(sendArgs.subject).toContain("1250.00");
    expect(sendArgs.from).toBeTruthy();
  });

  it("renders the InvoiceTemplate with required props", async () => {
    await makeRequestWithClient(sentInvoiceWithClient.client);

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
    await makeRequestWithClient({
      ...sentInvoiceWithClient.client,
      first_name: null,
    });

    const sendArgs = mocks.resendSendMock.mock.calls[0][0];
    expect(sendArgs.react.props.clientName).toBe("Acme Catering");
  });

  it("falls back to a generic greeting when client has no name fields", async () => {
    await makeRequestWithClient({
      ...sentInvoiceWithClient.client,
      first_name: null,
      company_name: null,
    });

    const sendArgs = mocks.resendSendMock.mock.calls[0][0];
    expect(sendArgs.react.props.clientName).toBe("Valued Client");
  });

  it("skips email entirely when client has no email", async () => {
    await makeRequestWithClient({
      ...sentInvoiceWithClient.client,
      email: null,
    });

    const response = await makeRequestWithClient({
      ...sentInvoiceWithClient.client,
      email: null,
    });

    expect(response.status).toBe(200);
    expect(mocks.resendSendMock).not.toHaveBeenCalled();
    expect(mocks.captureExceptionMock).not.toHaveBeenCalled();
  });

  it("skips email when client relation is missing", async () => {
    mocks.invoiceFindFirstMock.mockResolvedValue({
      ...draftInvoice,
      client: null,
    });

    const response = await POST(makeRequest(), { params });

    expect(response.status).toBe(200);
    expect(mocks.resendSendMock).not.toHaveBeenCalled();
  });

  it("does NOT roll back the SENT transition if Resend throws", async () => {
    mocks.resendSendMock.mockRejectedValue(new Error("Resend down"));

    const response = await makeRequestWithClient(sentInvoiceWithClient.client);
    await response.json();

    expect(response.status).toBe(200);
    // Manifest write succeeded — the response reflects the SENT state.
    expect(mocks.runManifestCommandMock).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "Invoice",
        command: "send",
      })
    );
  });

  it("captures email failures to Sentry without failing the request", async () => {
    const emailError = new Error("Resend timeout");
    mocks.resendSendMock.mockRejectedValue(emailError);

    const response = await makeRequestWithClient(sentInvoiceWithClient.client);

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

    // validateInvoiceAccess throws an invariant → caught by general error → 500
    expect([400, 500]).toContain(response.status);
    // No Manifest command, no email send when access is denied.
    expect(mocks.runManifestCommandMock).not.toHaveBeenCalled();
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
    await makeRequestWithClient(sentInvoiceWithClient.client);

    const sendArgs = mocks.resendSendMock.mock.calls[0][0];
    // Locale formatting — accept "May 15, 2026" or "May 14, 2026"
    // (timezone-dependent), just assert it contains the year and month.
    expect(sendArgs.react.props.dueDate).toMatch(/2026/);
    expect(sendArgs.react.props.dueDate).toMatch(/May/);
  });
});

/**
 * Helper: sets up the full mock chain for a POST request that should succeed
 * (invoice found, Manifest write succeeds), then invokes POST.
 *
 * The route reads the invoice via findFirst (which includes the client),
 * delegates the status transition to runManifestCommand, and then sends
 * the email using the client from the findFirst result — NOT from the
 * Manifest result. So we set up the invoice with the given client on
 * findFirst.
 */
async function makeRequestWithClient(client: Record<string, unknown>) {
  mocks.invoiceFindFirstMock.mockResolvedValue({
    ...draftInvoice,
    client,
  });
  mocks.runManifestCommandMock.mockResolvedValue(
    manifestSuccessResponse({
      id: INVOICE_ID,
      status: "SENT",
    })
  );
  return POST(makeRequest(), { params });
}
