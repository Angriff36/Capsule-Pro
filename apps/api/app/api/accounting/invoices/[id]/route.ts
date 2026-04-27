/**
 * Single Invoice API Routes
 *
 * Handles operations on individual invoices
 */

import { database } from "@repo/database";
import { InvoiceTemplate, resend } from "@repo/email";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
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
    console.error("Error fetching invoice:", error);
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
    const tenantId = await requireTenantId();
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
    console.error("Error updating invoice:", error);
    return NextResponse.json(
      { error: "Failed to update invoice" },
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
    const tenantId = await requireTenantId();
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
        console.error("Failed to send invoice email:", emailError);
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
    console.error("Error sending invoice:", error);
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
    const tenantId = await requireTenantId();
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
    console.error("Error voiding invoice:", error);
    return NextResponse.json(
      { error: "Failed to void invoice" },
      { status: 500 }
    );
  }
}
