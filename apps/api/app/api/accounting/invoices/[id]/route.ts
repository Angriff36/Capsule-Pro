/**
 * Single Invoice API Routes
 *
 * Handles operations on individual invoices
 */

import { database } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { requireTenantId } from "@/app/lib/tenant";
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

    // In a real implementation, this would send an email to the client
    // with invoice details and payment link

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
    console.error("Error voiding invoice:", error);
    return NextResponse.json(
      { error: "Failed to void invoice" },
      { status: 500 }
    );
  }
}
