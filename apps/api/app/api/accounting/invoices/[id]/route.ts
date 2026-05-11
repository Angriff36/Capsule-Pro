/**
 * Single Invoice API Routes
 *
 * Handles operations on individual invoices
 */

import { database } from "@repo/database";
import { InvoiceTemplate, resend } from "@repo/email";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { requireApiManager } from "@/app/lib/auth-roles";
import { requireTenantId } from "@/app/lib/tenant";
import { translatePrismaError } from "@/lib/prisma-error";
import {
  calculateInvoiceTotals,
  type InvoiceResponse,
  validateInvoiceAccess,
  validateInvoiceBusinessRules,
} from "../validation";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function formatInvoiceResponse(invoice: Record<string, unknown>) {
  return {
    ...invoice,
    subtotal: String(invoice.subtotal),
    taxAmount: String(invoice.taxAmount),
    discountAmount: String(invoice.discountAmount),
    total: String(invoice.total),
    amountPaid: String(invoice.amountPaid),
    amountDue: String(invoice.amountDue),
    depositPercentage: invoice.depositPercentage
      ? String(invoice.depositPercentage)
      : null,
    depositRequired: invoice.depositRequired
      ? String(invoice.depositRequired)
      : null,
    depositPaid: invoice.depositPaid ? String(invoice.depositPaid) : null,
    lineItems: invoice.lineItems,
    metadata: invoice.metadata,
  };
}

/**
 * GET /api/accounting/invoices/[id]
 * Get a single invoice by ID
 */
export async function GET(request: NextRequest, context: RouteContext) {
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
            company_name: true,
            first_name: true,
            last_name: true,
            email: true,
            defaultPaymentTerms: true,
          },
        },
        event: {
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
 * Update an invoice
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    // Manager-tier role guard (P1.AM). Invoice edits change billed totals and
    // tax/line-item state — must not be reachable from a base-staff session.
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
    const updateData: Record<string, unknown> = {};
    if (body.lineItems) {
      const { subtotal, taxAmount, total } = calculateInvoiceTotals(
        body.lineItems
      );
      updateData.subtotal = subtotal;
      updateData.taxAmount = taxAmount;
      updateData.total = total;
      updateData.amountDue = total - Number(invoice.amountPaid);
    }

    // Copy other allowed fields
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.internalNotes !== undefined)
      updateData.internalNotes = body.internalNotes;
    if (body.dueDate !== undefined) updateData.dueDate = new Date(body.dueDate);
    if (body.paymentTerms !== undefined)
      updateData.paymentTerms = body.paymentTerms;

    // Update invoice
    const updatedInvoice = await database.invoice.update({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
      data: updateData,
      include: {
        client: {
          select: {
            id: true,
            company_name: true,
            first_name: true,
            last_name: true,
            email: true,
            defaultPaymentTerms: true,
          },
        },
        event: {
          select: {
            id: true,
            title: true,
            eventDate: true,
          },
        },
      },
    });

    return NextResponse.json<InvoiceResponse>({
      ...updatedInvoice,
      subtotal: updatedInvoice.subtotal.toString(),
      taxAmount: updatedInvoice.taxAmount.toString(),
      discountAmount: updatedInvoice.discountAmount.toString(),
      total: updatedInvoice.total.toString(),
      amountPaid: updatedInvoice.amountPaid.toString(),
      amountDue: updatedInvoice.amountDue.toString(),
      depositPercentage: updatedInvoice.depositPercentage?.toString() ?? null,
      depositRequired: updatedInvoice.depositRequired?.toString() ?? null,
      depositPaid: updatedInvoice.depositPaid?.toString() ?? null,
      lineItems: updatedInvoice.lineItems as InvoiceResponse["lineItems"],
      metadata: updatedInvoice.metadata as Record<string, unknown>,
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
 * Handle invoice command actions
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    // Manager-tier role guard (P1.AM). apply-payment / mark-as-paid /
    // mark-overdue / send-reminder mutate ledger state and trigger customer
    // emails — staff-tier sessions must not reach these branches.
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
            first_name: true,
            company_name: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const action = body.action;

    if (action === "apply-payment") {
      const amount = Number(body.amount);
      if (!amount || amount <= 0) {
        return NextResponse.json(
          { error: "Valid payment amount is required" },
          { status: 400 }
        );
      }

      const newAmountPaid = Number(invoice.amountPaid) + amount;
      const newAmountDue = Number(invoice.total) - newAmountPaid;
      const newStatus = newAmountDue <= 0.01 ? "PAID" : "PARTIALLY_PAID";

      const updated = await database.invoice.update({
        where: { tenantId_id: { tenantId, id } },
        data: {
          amountPaid: newAmountPaid,
          amountDue: Math.max(0, newAmountDue),
          status: newStatus,
          paidAt: newStatus === "PAID" ? new Date() : invoice.paidAt,
          updatedAt: new Date(),
        },
        include: {
          client: {
            select: {
              id: true,
              company_name: true,
              first_name: true,
              last_name: true,
              email: true,
            },
          },
          event: { select: { id: true, title: true, eventDate: true } },
        },
      });

      return NextResponse.json(formatInvoiceResponse(updated));
    }

    if (action === "mark-as-paid") {
      const updated = await database.invoice.update({
        where: { tenantId_id: { tenantId, id } },
        data: {
          amountPaid: invoice.total,
          amountDue: 0,
          status: "PAID",
          paidAt: new Date(),
          updatedAt: new Date(),
        },
        include: {
          client: {
            select: {
              id: true,
              company_name: true,
              first_name: true,
              last_name: true,
              email: true,
            },
          },
          event: { select: { id: true, title: true, eventDate: true } },
        },
      });

      return NextResponse.json(formatInvoiceResponse(updated));
    }

    if (action === "mark-overdue") {
      if (invoice.status === "VOID" || invoice.status === "PAID") {
        return NextResponse.json(
          { error: `Cannot mark ${invoice.status} invoice as overdue` },
          { status: 400 }
        );
      }

      const updated = await database.invoice.update({
        where: { tenantId_id: { tenantId, id } },
        data: {
          status: "OVERDUE",
          updatedAt: new Date(),
        },
        include: {
          client: {
            select: {
              id: true,
              company_name: true,
              first_name: true,
              last_name: true,
              email: true,
            },
          },
          event: { select: { id: true, title: true, eventDate: true } },
        },
      });

      return NextResponse.json(formatInvoiceResponse(updated));
    }

    if (action === "send-reminder") {
      if (invoice.status === "DRAFT") {
        return NextResponse.json(
          { error: "Cannot send reminder for draft invoice" },
          { status: 400 }
        );
      }

      // Send reminder email (best-effort)
      const clientEmail = invoice.client?.email;
      if (clientEmail) {
        try {
          const appUrl = process.env.APP_URL || "https://app.convoy.com";
          const paymentUrl = `${appUrl}/invoices/${invoice.id}`;
          const currency = "USD";

          await resend.emails.send({
            from: process.env.RESEND_FROM || "noreply@convoy.com",
            to: clientEmail,
            subject: `Reminder: Invoice ${invoice.invoiceNumber} — ${invoice.amountDue.toString()} ${currency} due`,
            react: InvoiceTemplate({
              clientName:
                invoice.client?.first_name ||
                invoice.client?.company_name ||
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

      const updated = await database.invoice.update({
        where: { tenantId_id: { tenantId, id } },
        data: { updatedAt: new Date() },
        include: {
          client: {
            select: {
              id: true,
              company_name: true,
              first_name: true,
              last_name: true,
              email: true,
            },
          },
          event: { select: { id: true, title: true, eventDate: true } },
        },
      });

      return NextResponse.json(formatInvoiceResponse(updated));
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
 * Send an invoice to client
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    // Manager-tier role guard (P1.AM). Sending an invoice transitions it to
    // SENT and triggers a client-visible email — keep it off staff-tier
    // sessions.
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
      "send"
    );

    // Update invoice status
    const updatedInvoice = await database.invoice.update({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
      data: {
        status: "SENT",
        sentAt: new Date(),
      },
      include: {
        client: true,
        event: true,
      },
    });

    // Send notification email (best-effort — failure does not roll back send).
    // Mirrors EventContract.send: status transition is the source of truth;
    // the email is a side-effect that should eventually move into a manifest
    // event handler. Failing OPEN preserves invoice send semantics during a
    // transient Resend/SMTP outage.
    const clientEmail = updatedInvoice.client?.email;
    if (clientEmail) {
      const appUrl = process.env.APP_URL || "https://app.convoy.com";
      const paymentUrl = `${appUrl}/invoices/${updatedInvoice.id}`;
      const clientName =
        updatedInvoice.client?.first_name ||
        updatedInvoice.client?.company_name ||
        "Valued Client";
      const dueDate = updatedInvoice.dueDate
        ? new Date(updatedInvoice.dueDate).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : undefined;

      // Invoice amounts are stored as Postgres `money` (single tenant currency,
      // USD by default). When a per-tenant currency setting lands, replace this
      // literal with that value.
      const currency = "USD";
      const amountDue = updatedInvoice.amountDue.toString();

      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM || "noreply@convoy.com",
          to: clientEmail,
          subject: `Invoice ${updatedInvoice.invoiceNumber} — ${amountDue} ${currency} due`,
          react: InvoiceTemplate({
            clientName,
            invoiceNumber: updatedInvoice.invoiceNumber,
            amountDue,
            currency,
            dueDate,
            paymentUrl,
            notes: updatedInvoice.notes ?? undefined,
          }),
        });
      } catch (emailError) {
        // Non-fatal: status transition already committed.
        captureException(emailError);
        log.error("Failed to send invoice email", { error: emailError });
      }
    }

    return NextResponse.json<InvoiceResponse>({
      ...updatedInvoice,
      subtotal: updatedInvoice.subtotal.toString(),
      taxAmount: updatedInvoice.taxAmount.toString(),
      discountAmount: updatedInvoice.discountAmount.toString(),
      total: updatedInvoice.total.toString(),
      amountPaid: updatedInvoice.amountPaid.toString(),
      amountDue: updatedInvoice.amountDue.toString(),
      depositPercentage: updatedInvoice.depositPercentage?.toString() ?? null,
      depositRequired: updatedInvoice.depositRequired?.toString() ?? null,
      depositPaid: updatedInvoice.depositPaid?.toString() ?? null,
      lineItems: updatedInvoice.lineItems as InvoiceResponse["lineItems"],
      metadata: updatedInvoice.metadata as Record<string, unknown>,
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
    log.error("Error sending invoice", { error });
    return NextResponse.json(
      { error: "Failed to send invoice" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/accounting/invoices/[id]
 * Void an invoice
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    // Manager-tier role guard (P1.AM). Voiding an invoice removes a
    // receivable from the AR ledger — staff-tier sessions must not reach it.
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

    // Update invoice status to VOID
    const updatedInvoice = await database.invoice.update({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
      data: {
        status: "VOID",
      },
    });

    return NextResponse.json<InvoiceResponse>({
      ...updatedInvoice,
      subtotal: updatedInvoice.subtotal.toString(),
      taxAmount: updatedInvoice.taxAmount.toString(),
      discountAmount: updatedInvoice.discountAmount.toString(),
      total: updatedInvoice.total.toString(),
      amountPaid: updatedInvoice.amountPaid.toString(),
      amountDue: updatedInvoice.amountDue.toString(),
      depositPercentage: updatedInvoice.depositPercentage?.toString() ?? null,
      depositRequired: updatedInvoice.depositRequired?.toString() ?? null,
      depositPaid: updatedInvoice.depositPaid?.toString() ?? null,
      lineItems: updatedInvoice.lineItems as InvoiceResponse["lineItems"],
      metadata: updatedInvoice.metadata as Record<string, unknown>,
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
