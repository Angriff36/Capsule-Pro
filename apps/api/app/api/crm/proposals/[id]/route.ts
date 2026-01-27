/**
 * Single Proposal CRUD API Endpoints
 *
 * GET    /api/crm/proposals/[id]      - Get a single proposal
 * PUT    /api/crm/proposals/[id]      - Update a proposal
 * DELETE /api/crm/proposals/[id]      - Soft delete a proposal
 */

import { auth } from "@repo/auth/server";
import { database, Prisma, type PrismaClient } from "@repo/database";
import { NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import type { CreateProposalRequest } from "../types";
import { validateCreateProposalRequest } from "../validation";

type RouteParams = {
  params: Promise<{ id: string }>;
};

type ClientSelect = {
  id: true;
  company_name: true;
  first_name: true;
  last_name: true;
  email: true;
  phone: true;
};

type LeadSelect = {
  id: true;
  companyName: true;
  contactName: true;
  contactEmail: true;
  contactPhone: true;
};

/**
 * Fetch client for a proposal
 */
function fetchClient(
  database: PrismaClient,
  tenantId: string,
  clientId: string | null
): Promise<Record<string, unknown> | null> {
  if (!clientId) {
    return Promise.resolve(null);
  }
  return database.client.findFirst({
    where: {
      AND: [{ tenantId }, { id: clientId }, { deletedAt: null }],
    },
    select: {
      id: true,
      company_name: true,
      first_name: true,
      last_name: true,
      email: true,
      phone: true,
    } as ClientSelect,
  });
}

/**
 * Fetch lead for a proposal
 */
function fetchLead(
  database: PrismaClient,
  tenantId: string,
  leadId: string | null
): Promise<Record<string, unknown> | null> {
  if (!leadId) {
    return Promise.resolve(null);
  }
  return database.lead.findFirst({
    where: {
      AND: [{ tenantId }, { id: leadId }, { deletedAt: null }],
    },
    select: {
      id: true,
      companyName: true,
      contactName: true,
      contactEmail: true,
      contactPhone: true,
    } as LeadSelect,
  });
}

/**
 * GET /api/crm/proposals/[id]
 * Get a single proposal by ID
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const tenantId = await getTenantIdForOrg(orgId);

    const proposal = await database.proposal.findFirst({
      where: {
        AND: [{ id }, { tenantId }, { deletedAt: null }],
      },
    });

    if (!proposal) {
      return NextResponse.json(
        { message: "Proposal not found" },
        { status: 404 }
      );
    }

    const [client, lead, event, lineItems] = await Promise.all([
      fetchClient(database, tenantId, proposal.clientId),
      fetchLead(database, tenantId, proposal.leadId),
      proposal.eventId
        ? database.event.findFirst({
            where: {
              AND: [
                { tenantId },
                { id: proposal.eventId },
                { deletedAt: null },
              ],
            },
            select: { id: true, title: true },
          })
        : null,
      database.proposalLineItem.findMany({
        where: { proposalId: proposal.id },
        orderBy: [{ sortOrder: "asc" }],
      }),
    ]);

    return NextResponse.json({
      data: { ...proposal, client, lead, event, lineItems },
    });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Error getting proposal:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Calculate proposal totals based on line items
 */
function calculateProposalTotals(
  data: Partial<CreateProposalRequest>,
  existingProposal: any
) {
  const existingSubtotal = Number(existingProposal.subtotal);
  const existingTaxAmount = Number(existingProposal.taxAmount);
  const existingTotal = Number(existingProposal.total);
  const existingTaxRate = Number(existingProposal.taxRate);
  const existingDiscountAmount = Number(existingProposal.discountAmount);

  let calculatedSubtotal = data.subtotal ?? existingSubtotal;
  let calculatedTax = data.taxAmount ?? existingTaxAmount;
  let calculatedTotal = data.total ?? existingTotal;

  if (data.lineItems && data.lineItems.length > 0) {
    calculatedSubtotal = data.lineItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );
    const taxRate = data.taxRate ?? existingTaxRate;
    calculatedTax = calculatedSubtotal * (taxRate / 100);
    const discount = data.discountAmount ?? existingDiscountAmount;
    calculatedTotal = calculatedSubtotal + calculatedTax - discount;
  }

  return { calculatedSubtotal, calculatedTax, calculatedTotal };
}

/**
 * Build proposal update data
 */
function buildProposalUpdateData(
  data: Partial<CreateProposalRequest>,
  calculatedSubtotal: number,
  calculatedTax: number,
  calculatedTotal: number
) {
  return {
    clientId: data.clientId,
    leadId: data.leadId,
    eventId: data.eventId,
    title: data.title?.trim(),
    eventDate: data.eventDate ? new Date(data.eventDate) : undefined,
    eventType: data.eventType?.trim() || undefined,
    guestCount: data.guestCount ?? undefined,
    venueName: data.venueName?.trim() || undefined,
    venueAddress: data.venueAddress?.trim() || undefined,
    subtotal: new Prisma.Decimal(calculatedSubtotal),
    taxRate:
      data.taxRate !== undefined && data.taxRate !== null
        ? new Prisma.Decimal(data.taxRate)
        : undefined,
    taxAmount: new Prisma.Decimal(calculatedTax),
    discountAmount:
      data.discountAmount !== undefined && data.discountAmount !== null
        ? new Prisma.Decimal(data.discountAmount)
        : undefined,
    total: new Prisma.Decimal(calculatedTotal),
    status: data.status ?? undefined,
    validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
    notes: data.notes?.trim() || undefined,
    termsAndConditions: data.termsAndConditions?.trim() || undefined,
  };
}

/**
 * Update line items for a proposal
 */
async function updateLineItems(
  database: PrismaClient,
  proposalId: string,
  tenantId: string,
  lineItems: CreateProposalRequest["lineItems"]
) {
  await database.$transaction(async (tx) => {
    await tx.proposalLineItem.deleteMany({
      where: { proposalId },
    });

    if (lineItems && lineItems.length > 0) {
      await tx.proposalLineItem.createMany({
        data: lineItems.map((item, index) => ({
          proposalId,
          tenantId,
          sortOrder: item.sortOrder ?? index,
          itemType: item.itemType.trim(),
          category: item.category?.trim() || item.itemType.trim(),
          description: item.description.trim(),
          quantity: new Prisma.Decimal(item.quantity),
          unitPrice: new Prisma.Decimal(item.unitPrice),
          total: new Prisma.Decimal(
            item.total ?? item.quantity * item.unitPrice
          ),
          totalPrice: new Prisma.Decimal(
            item.total ?? item.quantity * item.unitPrice
          ),
          notes: item.notes?.trim() || null,
        })),
      });
    }
  });
}

/**
 * PUT /api/crm/proposals/[id]
 * Update a proposal
 */
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const tenantId = await getTenantIdForOrg(orgId);
    const body = await request.json();

    validateCreateProposalRequest(body);

    const data = body as CreateProposalRequest;

    const existingProposal = await database.proposal.findFirst({
      where: {
        AND: [{ id }, { tenantId }, { deletedAt: null }],
      },
    });

    if (!existingProposal) {
      return NextResponse.json(
        { message: "Proposal not found" },
        { status: 404 }
      );
    }

    const { calculatedSubtotal, calculatedTax, calculatedTotal } =
      calculateProposalTotals(data, existingProposal);

    const updateData = buildProposalUpdateData(
      data,
      calculatedSubtotal,
      calculatedTax,
      calculatedTotal
    );

    const updatedProposal = await database.proposal.update({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
      data: updateData,
    });

    if (data.lineItems && data.lineItems.length > 0) {
      await updateLineItems(database, id, tenantId, data.lineItems);
    }

    const [client, lead] = await Promise.all([
      fetchClient(database, tenantId, updatedProposal.clientId),
      fetchLead(database, tenantId, updatedProposal.leadId),
    ]);

    return NextResponse.json({ data: { ...updatedProposal, client, lead } });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Error updating proposal:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/crm/proposals/[id]
 * Soft delete a proposal
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const tenantId = await getTenantIdForOrg(orgId);

    const existingProposal = await database.proposal.findFirst({
      where: {
        AND: [{ id }, { tenantId }, { deletedAt: null }],
      },
    });

    if (!existingProposal) {
      return NextResponse.json(
        { message: "Proposal not found" },
        { status: 404 }
      );
    }

    await database.proposal.updateMany({
      where: {
        AND: [{ tenantId }, { id }],
      },
      data: {
        deletedAt: new Date(),
      },
    });

    return NextResponse.json({ message: "Proposal deleted successfully" });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Error deleting proposal:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
