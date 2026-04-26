/**
 * Invoice Send Email Test Suite
 *
 * Verifies that POST /api/accounting/invoices/[id] (the "send invoice"
 * action) transitions the invoice to SENT and dispatches an email to the
 * client via Resend.
 *
 * Why these tests matter:
 *   - Prior implementation contained only a TODO comment ("In a real
 *     implementation, this would send an email…"). A regression that
 *     silently drops the email send would be invisible to status checks.
 *   - The status transition (DRAFT → SENT) must NEVER be rolled back when
 *     the email fails — clients can be re-emailed, but losing the audit
 *     timestamp would corrupt downstream reporting.
 *   - The recipient must come from the joined `client.email`, not from the
 *     request body, to prevent abuse.
 *
 * @vitest-environment node
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const INVOICE_ID = "11111111-1111-1111-1111-111111111111";
const CLIENT_ID = "22222222-2222-2222-2222-222222222222";

// vi.mock factories are hoisted to the top of the file. Using vi.hoisted
// ensures the shared mock fns exist before the factories run.
const mocks = vi.hoisted(() => ({
  sendMock: vi.fn(),
  findFirstMock: vi.fn(),
  updateMock: vi.fn(),
  requireTenantIdMock: vi.fn(),
}));
const { sendMock, findFirstMock, updateMock, requireTenantIdMock } = mocks;

vi.mock("@repo/email", () => ({
  resend: {
    emails: {
      send: mocks.sendMock,
    },
  },
  // The route imports InvoiceTemplate as a value (called as a function in JSX).
  // Returning a plain identity stub avoids needing react-email runtime.
  InvoiceTemplate: (props: Record<string, unknown>) => ({
    type: "InvoiceTemplate",
    props,
  }),
}));

vi.mock("@repo/database", () => ({
  database: {
    invoice: {
      findFirst: mocks.findFirstMock,
      update: mocks.updateMock,
    },
  },
}));

vi.mock("@/app/lib/tenant", () => ({
  requireTenantId: mocks.requireTenantIdMock,
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

import { NextRequest } from "next/server";
// Importing the route AFTER vi.mock calls is required so Vitest can intercept.
import { POST } from "@/app/api/accounting/invoices/[id]/route";

function makeRequest(): NextRequest {
  return new NextRequest(
    new URL(`http://localhost/api/accounting/invoices/${INVOICE_ID}`),
    { method: "POST" }
  );
}

const draftInvoice = {
  tenantId: TENANT_ID,
  id: INVOICE_ID,
  status: "DRAFT" as const,
  amountPaid: 0,
  amountDue: 100,
  invoiceNumber: "INV-2026-0001",
};

function makeUpdatedInvoice(overrides: Record<string, unknown> = {}) {
  return {
    tenantId: TENANT_ID,
    id: INVOICE_ID,
    invoiceNumber: "INV-2026-0001",
    status: "SENT",
    sentAt: new Date("2026-04-26T10:00:00.000Z"),
    dueDate: new Date("2026-05-26T10:00:00.000Z"),
    subtotal: { toString: () => "100" },
    taxAmount: { toString: () => "0" },
    discountAmount: { toString: () => "0" },
    total: { toString: () => "100" },
    amountPaid: { toString: () => "0" },
    amountDue: { toString: () => "100" },
    depositPercentage: null,
    depositRequired: null,
    depositPaid: null,
    lineItems: [],
    metadata: {},
    client: {
      id: CLIENT_ID,
      email: "client@example.com",
      first_name: "Jane",
      last_name: "Doe",
      company_name: "Acme Co",
    },
    event: {
      id: "event-1",
      title: "Test Event",
      eventDate: new Date("2026-06-01T00:00:00.000Z"),
    },
    ...overrides,
  };
}

beforeEach(() => {
  requireTenantIdMock.mockResolvedValue(TENANT_ID);
  sendMock.mockReset();
  findFirstMock.mockReset();
  updateMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/accounting/invoices/[id] — send invoice", () => {
  it("transitions DRAFT → SENT and dispatches email to client.email", async () => {
    findFirstMock.mockResolvedValue(draftInvoice);
    updateMock.mockResolvedValue(makeUpdatedInvoice());
    sendMock.mockResolvedValue({ data: { id: "resend-id" }, error: null });

    const res = await POST(makeRequest(), {
      params: Promise.resolve({ id: INVOICE_ID }),
    });

    expect(res.status).toBe(200);
    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(updateMock.mock.calls[0][0].data).toMatchObject({ status: "SENT" });
    expect(sendMock).toHaveBeenCalledTimes(1);
    const call = sendMock.mock.calls[0][0];
    expect(call.to).toBe("client@example.com");
    expect(call.subject).toContain("INV-2026-0001");
    expect(call.subject).toContain("Acme Co");
    // Confirm InvoiceTemplate received formatted money + due date strings
    expect(call.react.props).toMatchObject({
      invoiceNumber: "INV-2026-0001",
      clientName: "Jane",
      total: expect.stringContaining("$"),
      amountDue: expect.stringContaining("$"),
      // viewUrl includes the invoice id so the recipient can deep-link
      viewUrl: expect.stringContaining(INVOICE_ID),
    });
  });

  it("does NOT roll back the SENT transition when Resend rejects", async () => {
    findFirstMock.mockResolvedValue(draftInvoice);
    updateMock.mockResolvedValue(makeUpdatedInvoice());
    sendMock.mockRejectedValue(new Error("Resend 502"));

    const res = await POST(makeRequest(), {
      params: Promise.resolve({ id: INVOICE_ID }),
    });

    // Status MUST be 200 — the system-of-record event (status flip) succeeded.
    // Re-sending the email is a separate operator action.
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("SENT");
    expect(updateMock).toHaveBeenCalledTimes(1);
  });

  it("skips email dispatch entirely when client has no email on file", async () => {
    findFirstMock.mockResolvedValue(draftInvoice);
    updateMock.mockResolvedValue(
      makeUpdatedInvoice({
        client: {
          id: CLIENT_ID,
          email: null,
          first_name: "Jane",
          last_name: "Doe",
          company_name: "Acme Co",
        },
      })
    );

    const res = await POST(makeRequest(), {
      params: Promise.resolve({ id: INVOICE_ID }),
    });

    expect(res.status).toBe(200);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the invoice does not exist for this tenant", async () => {
    findFirstMock.mockResolvedValue(null);

    const res = await POST(makeRequest(), {
      params: Promise.resolve({ id: INVOICE_ID }),
    });

    expect(res.status).toBe(404);
    expect(updateMock).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });
});
