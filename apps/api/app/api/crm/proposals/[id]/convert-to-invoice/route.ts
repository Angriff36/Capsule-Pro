/**
 * Proposal to Invoice Conversion API Route
 *
 * POST /api/crm/proposals/[id]/convert-to-invoice
 * Converts an accepted proposal into an invoice
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { executeManifestCommand } from "@/lib/manifest-command-handler";

/**
 * POST /api/crm/proposals/[id]/convert-to-invoice
 * Convert an accepted proposal to an invoice
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const proposalId = params.id;

    // Get the proposal with line items
    const proposal = await database.proposal.findFirst({
      where: {
        AND: [{ tenantId }, { id: proposalId }, { deletedAt: null }],
      },
      include: {
        client: true,
        event: true,
        lineItems: {
          orderBy: [{ sortOrder: "asc" }],
        },
      },
    });

    if (!proposal) {
      return NextResponse.json(
        { message: "Proposal not found" },
        { status: 404 }
      );
    }

    // Validate proposal can be converted
    if (proposal.status !== "accepted") {
      return NextResponse.json(
        { message: "Only accepted proposals can be converted to invoices" },
        { status: 400 }
      );
    }

    if (!proposal.clientId) {
      return NextResponse.json(
        { message: "Proposal must have a client to create an invoice" },
        { status: 400 }
      );
    }

    if (!proposal.eventId) {
      return NextResponse.json(
        { message: "Proposal must be linked to an event to create an invoice" },
        { status: 400 }
      );
    }

    if (!proposal.lineItems || proposal.lineItems.length === 0) {
      return NextResponse.json(
        { message: "Proposal must have line items to create an invoice" },
        { status: 400 }
      );
    }

    // Check if invoice already exists for this proposal
    const existingInvoice = await database.invoice.findFirst({
      where: {
        AND: [
          { tenantId },
          { eventId: proposal.eventId },
          { metadata: { path: ["proposalId"], equals: proposalId } },
        ],
      },
    });

    if (existingInvoice) {
      return NextResponse.json(
        {
          message: "Invoice already exists for this proposal",
          invoiceId: existingInvoice.id,
        },
        { status: 409 }
      );
    }

    // Get client's payment terms
    const client = await database.client.findFirst({
      where: {
        AND: [{ tenantId }, { id: proposal.clientId }, { deletedAt: null }],
      },
    });

    if (!client) {
      return NextResponse.json(
        { message: "Client not found" },
        { status: 404 }
      );
    }

    // Calculate totals from proposal line items
    const lineItems = proposal.lineItems.map((item) => ({
      itemType: item.itemType,
      category: item.category,
      description: item.description,
      quantity: Number(item.quantity),
      unitOfMeasure: item.unitOfMeasure,
      unitPrice: Number(item.unitPrice),
      total: Number(item.total),
      notes: item.notes,
    }));

    const subtotal = Number(proposal.subtotal);
    const taxAmount = Number(proposal.taxAmount);
    const discountAmount = Number(proposal.discountAmount);
    const total = Number(proposal.total);

    // Calculate due date
    const paymentTerms = client.defaultPaymentTerms ?? 30;
    const issuedAt = new Date();
    const dueDate = new Date(
      issuedAt.getTime() + paymentTerms * 24 * 60 * 60 * 1000
    );

    // Generate invoice number
    const invoiceNumber = `INV-${Date.now().toString().slice(-8)}`;

    // Create the invoice
    const invoice = await database.invoice.create({
      data: {
        tenantId,
        invoiceNumber,
        invoiceType: "FINAL_PAYMENT",
        status: "DRAFT",
        clientId: proposal.clientId,
        eventId: proposal.eventId,
        subtotal,
        taxAmount,
        discountAmount,
        total,
        amountPaid: 0,
        amountDue: total,
        paymentTerms,
        dueDate,
        issuedAt,
        lineItems,
        metadata: {
          proposalId,
          proposalNumber: proposal.proposalNumber,
          convertedAt: new Date().toISOString(),
        },
      },
    });

    // Execute the manifest command for proposal conversion
    await executeManifestCommand(
      {
        json: async () => ({
          entityName: "Proposal",
          commandName: "convertToInvoice",
          input: {
            proposalId,
            invoiceId: invoice.id,
            invoiceType: "FINAL_PAYMENT",
          },
        }),
      } as Request,
      {
        entityName: "Proposal",
        commandName: "convertToInvoice",
      }
    );

    return NextResponse.json(
      {
        message: "Proposal converted to invoice successfully",
        invoice: {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          total: Number(invoice.total),
          status: invoice.status,
          dueDate: invoice.dueDate,
        },
        proposal: {
          id: proposal.id,
          proposalNumber: proposal.proposalNumber,
          total: Number(proposal.total),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Error converting proposal to invoice:", error);
    return NextResponse.json(
      { message: "Failed to convert proposal to invoice" },
      { status: 500 }
    );
  }
}
