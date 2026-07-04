/**
 * Single Invoice API Routes
 *
 * Handles operations on individual invoices.
 * PUT / PATCH / POST / DELETE delegate to governed Manifest commands per constitution §10.
 * GET reads bypass runtime.
 */

import { database } from "@repo/database";
import { InvoiceTemplate, resend } from "@repo/email";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { requireApiManager } from "@/app/lib/auth-roles";
import { requireTenantId, resolveCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";
import { translatePrismaError } from "@/lib/prisma-error";
import {
  calculateInvoiceTotals,
  type InvoiceResponse,
  validateInvoiceAccess,
  validateInvoiceBusinessRules,
} from "../validation";

const DEFAULT_APP_URL = "https://app.capsule.pro";
const DEFAULT_FROM_ADDRESS = "noreply@capsule.pro";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/accounting/invoices/[id]
 * Get a single invoice by ID (read — bypasses Manifest per §10)
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const tenantId = await requireTenantId();
    const { id } = await context.params;

    const invoice = await database.invoice.findFirst({
      where: {
        tenantId,
        id,
        deletedAt: null,
      },
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
            firstName: true,
            lastName: true,
            email: true,
            defaultPaymentTerms: true,
          },
        },
        linkedEvent: {
          select: {
            id: true,
            title: true,
            eventDate: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json<InvoiceResponse>({
      ...invoice,
      subtotal: invoice.subtotal.toString(),
      taxAmount: invoice.taxAmount.toString(),
      discountAmount: invoice.discountAmount.toString(),
      total: invoice.total.toString(),
      amountPaid: invoice.amountPaid.toString(),
      amountDue: invoice.amountDue.toString(),
      depositPercentage: invoice.depositPercentage?.toString() ?? null,
      depositRequired: invoice.depositRequired?.toString() ?? null,
      depositPaid: invoice.depositPaid?.toString() ?? null,
      lineItems: invoice.lineItems as InvoiceResponse["lineItems"],
      metadata: invoice.metadata as Record<string, unknown>,
      // Column no longer exists in the truthful schema; kept for response shape.
      voidedAt: null,
    });
  } catch (error) {
    captureException(error);
    const prismaResult = translatePrismaError(error);
    if (prismaResult.mapped) {
      return NextResponse.json(
        { error: prismaResult.message },
        { status: prismaResult.status }
      );
    }
    log.error("Error fetching invoice", { error });
    return NextResponse.json(
      { error: "Failed to fetch invoice" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/accounting/invoices/[id]
 * Update an invoice via Manifest runtime.
 *
 * Pre-validation reads stay as direct Prisma reads per constitution §10.
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const guard = await requireApiManager();
    if (!guard.ok) {
      return guard.response;
    }
    const { tenantId } = guard;
    const { id } = await context.params;
    const body = await request.json();

    const invoice = await database.invoice.findFirst({
      where: {
        tenantId,
        id,
        deletedAt: null,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    validateInvoiceAccess(invoice, tenantId, ["DRAFT"]);

    // Calculate new totals if line items provided
    let subtotal = Number(invoice.subtotal);
    let taxAmount = Number(invoice.taxAmount);
    let total = Number(invoice.total);
    let amountDue = Number(invoice.amountDue);
    let lineItems =
      typeof invoice.lineItems === "string"
        ? invoice.lineItems
        : JSON.stringify(invoice.lineItems);

    if (body.lineItems) {
      const totals = calculateInvoiceTotals(body.lineItems);
      subtotal = totals.subtotal;
      taxAmount = totals.taxAmount;
      total = totals.total;
      amountDue = total - Number(invoice.amountPaid);
      lineItems = JSON.stringify(body.lineItems);
    }

    const user = await resolveCurrentUser(request);
    return runManifestCommand({
      entity: "Invoice",
      command: "update",
      body: {
        id,
        tenantId,
        subtotal,
        taxAmount,
        total,
        amountDue,
        notes: body.notes ?? (invoice.notes as string) ?? "",
        internalNotes:
          body.internalNotes ?? (invoice.internalNotes as string) ?? "",
        dueDate: body.dueDate ? new Date(body.dueDate) : invoice.dueDate,
        paymentTerms:
          body.paymentTerms ?? (invoice.paymentTerms as number) ?? 30,
        lineItems,
      },
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
    });
  } catch (error) {
    captureException(error);
    const prismaResult = translatePrismaError(error);
    if (prismaResult.mapped) {
      return NextResponse.json(
        { error: prismaResult.message },
        { status: prismaResult.status }
      );
    }
    log.error("Error updating invoice", { error });
    return NextResponse.json(
      { error: "Failed to update invoice" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/accounting/invoices/[id]
 * Handle invoice command actions via Manifest runtime.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const guard = await requireApiManager();
    if (!guard.ok) {
      return guard.response;
    }
    const { tenantId } = guard;
    const { id } = await context.params;
    const body = await request.json();

    const invoice = await database.invoice.findFirst({
      where: { tenantId, id, deletedAt: null },
      include: {
        client: {
          select: {
            id: true,
            email: true,
            firstName: true,
            companyName: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const user = await resolveCurrentUser(request);
    const manifestUser = {
      id: user.id,
      tenantId: user.tenantId,
      role: user.role,
    };
    const action = body.action;

    if (action === "apply-payment") {
      const amount = Number(body.amount);
      if (!amount || amount <= 0) {
        return NextResponse.json(
          { error: "Valid payment amount is required" },
          { status: 400 }
        );
      }

      return runManifestCommand({
        entity: "Invoice",
        command: "applyPayment",
        body: {
          id,
          tenantId,
          paymentAmount: amount,
          paymentId: body.paymentId ?? "",
        },
        user: manifestUser,
      });
    }

    if (action === "mark-as-paid") {
      return runManifestCommand({
        entity: "Invoice",
        command: "markAsPaid",
        body: { id, tenantId },
        user: manifestUser,
      });
    }

    if (action === "mark-overdue") {
      if (invoice.status === "VOID" || invoice.status === "PAID") {
        return NextResponse.json(
          { error: `Cannot mark ${invoice.status} invoice as overdue` },
          { status: 400 }
        );
      }

      return runManifestCommand({
        entity: "Invoice",
        command: "markOverdue",
        body: { id, tenantId },
        user: manifestUser,
      });
    }

    if (action === "send-reminder") {
      if (invoice.status === "DRAFT") {
        return NextResponse.json(
          { error: "Cannot send reminder for draft invoice" },
          { status: 400 }
        );
      }

      // Governed write first, then best-effort email
      const result = await runManifestCommand({
        entity: "Invoice",
        command: "sendReminder",
        body: { id, tenantId },
        user: manifestUser,
      });

      // Send reminder email (best-effort, non-fatal)
      if (result.status === 200) {
        const clientEmail = invoice.client?.email;
        if (clientEmail) {
          try {
            const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? DEFAULT_APP_URL;
            const paymentUrl = `${appUrl}/invoices/${invoice.id}`;
            const currency = "USD";

            await resend.emails.send({
              from: process.env.RESEND_FROM ?? DEFAULT_FROM_ADDRESS,
              to: clientEmail,
              subject: `Reminder: Invoice ${invoice.invoiceNumber} — ${invoice.amountDue.toString()} ${currency} due`,
              react: InvoiceTemplate({
                clientName:
                  invoice.client?.firstName ||
                  invoice.client?.companyName ||
                  "Valued Client",
                invoiceNumber: invoice.invoiceNumber,
                amountDue: invoice.amountDue.toString(),
                currency,
                dueDate: invoice.dueDate
                  ? new Date(invoice.dueDate).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : undefined,
                paymentUrl,
                notes: invoice.notes ?? undefined,
              }),
            });
          } catch (emailError) {
            captureException(emailError);
            log.error("Failed to send reminder email", { error: emailError });
          }
        }
      }

      return result;
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    captureException(error);
    const prismaResult = translatePrismaError(error);
    if (prismaResult.mapped) {
      return NextResponse.json(
        { error: prismaResult.message },
        { status: prismaResult.status }
      );
    }
    log.error("Error handling invoice action", { error });
    return NextResponse.json(
      { error: "Failed to handle invoice action" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/accounting/invoices/[id]/send
 * Send an invoice to client via Manifest runtime.
 *
 * Pre-validation reads stay as direct Prisma reads per constitution §10.
 * Email sending is a best-effort side-effect after the governed write.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const guard = await requireApiManager();
    if (!guard.ok) {
      return guard.response;
    }
    const { tenantId } = guard;
    const { id } = await context.params;

    const invoice = await database.invoice.findFirst({
      where: {
        tenantId,
        id,
        deletedAt: null,
      },
      include: {
        client: true,
        linkedEvent: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    validateInvoiceAccess(invoice, tenantId);
    validateInvoiceBusinessRules(
      {
        status: invoice.status as InvoiceResponse["status"],
        amountPaid: Number(invoice.amountPaid),
        amountDue: Number(invoice.amountDue),
      },
      "send"
    );

    // Governed write: transition to SENT via Manifest runtime
    const user = await resolveCurrentUser(request);
    const result = await runManifestCommand({
      entity: "Invoice",
      command: "send",
      body: {
        id,
        tenantId,
        clientContactId: invoice.clientId,
      },
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
    });

    // Send notification email (best-effort — failure does not roll back send).
    // Mirrors EventContract.send: status transition is the source of truth;
    // the email is a side-effect that should eventually move into a manifest
    // event handler. Failing OPEN preserves invoice send semantics during a
    // transient Resend/SMTP outage.
    if (result.status === 200) {
      const clientEmail = invoice.client?.email;
      if (clientEmail) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? DEFAULT_APP_URL;
        const paymentUrl = `${appUrl}/invoices/${invoice.id}`;
        const clientName =
          invoice.client?.firstName ||
          invoice.client?.companyName ||
          "Valued Client";
        const dueDate = invoice.dueDate
          ? new Date(invoice.dueDate).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })
          : undefined;

        const currency = "USD";
        const amountDue = invoice.amountDue.toString();

        try {
          await resend.emails.send({
            from: process.env.RESEND_FROM ?? DEFAULT_FROM_ADDRESS,
            to: clientEmail,
            subject: `Invoice ${invoice.invoiceNumber} — ${amountDue} ${currency} due`,
            react: InvoiceTemplate({
              clientName,
              invoiceNumber: invoice.invoiceNumber,
              amountDue,
              currency,
              dueDate,
              paymentUrl,
              notes: invoice.notes ?? undefined,
            }),
          });
        } catch (emailError) {
          // Non-fatal: status transition already committed.
          captureException(emailError);
          log.error("Failed to send invoice email", { error: emailError });
        }
      }
    }

    return result;
  } catch (error) {
    captureException(error);
    const prismaResult = translatePrismaError(error);
    if (prismaResult.mapped) {
      return NextResponse.json(
        { error: prismaResult.message },
        { status: prismaResult.status }
      );
    }
    log.error("Error sending invoice", { error });
    return NextResponse.json(
      { error: "Failed to send invoice" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/accounting/invoices/[id]
 * Void an invoice via Manifest runtime.
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const guard = await requireApiManager();
    if (!guard.ok) {
      return guard.response;
    }
    const { tenantId } = guard;
    const { id } = await context.params;

    const invoice = await database.invoice.findFirst({
      where: {
        tenantId,
        id,
        deletedAt: null,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    validateInvoiceAccess(invoice, tenantId);
    validateInvoiceBusinessRules(
      {
        status: invoice.status as InvoiceResponse["status"],
        amountPaid: Number(invoice.amountPaid),
        amountDue: Number(invoice.amountDue),
      },
      "void"
    );

    const user = await resolveCurrentUser(request);
    return runManifestCommand({
      entity: "Invoice",
      command: "voidInvoice",
      body: {
        id,
        tenantId,
        reason: "Voided via API",
      },
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
    });
  } catch (error) {
    captureException(error);
    const prismaResult = translatePrismaError(error);
    if (prismaResult.mapped) {
      return NextResponse.json(
        { error: prismaResult.message },
        { status: prismaResult.status }
      );
    }
    log.error("Error voiding invoice", { error });
    return NextResponse.json(
      { error: "Failed to void invoice" },
      { status: 500 }
    );
  }
}
