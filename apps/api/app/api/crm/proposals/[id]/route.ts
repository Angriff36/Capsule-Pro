/**
 * Single Proposal CRUD API Endpoints
 *
 * GET    /api/crm/proposals/[id]      - Get a single proposal
 * PUT    /api/crm/proposals/[id]      - Update a proposal
 * DELETE /api/crm/proposals/[id]      - Soft delete a proposal
 */

import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import type { CreateProposalRequest } from "../types";
import { validateCreateProposalRequest } from "../validation";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/crm/proposals/[id]
 * Get a single proposal by ID
 */
export async function GET(request: Request, { params }: RouteParams) {
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

    // Fetch client and lead separately
    let client: Record<string, unknown> | null = null;
    let lead: Record<string, unknown> | null = null;
    let event: Record<string, unknown> | null = null;

    if (proposal.clientId) {
      client = await database.client.findFirst({
        where: {
          AND: [{ tenantId }, { id: proposal.clientId }, { deletedAt: null }],
        },
        select: {
          id: true,
          company_name: true,
          first_name: true,
          last_name: true,
          email: true,
          phone: true,
          addressLine1: true,
          city: true,
          stateProvince: true,
          postalCode: true,
        },
      });
    }

    if (proposal.leadId) {
      lead = await database.lead.findFirst({
        where: {
          AND: [{ tenantId }, { id: proposal.leadId }, { deletedAt: null }],
        },
        select: {
          id: true,
          companyName: true,
          contactName: true,
          contactEmail: true,
          contactPhone: true,
        },
      });
    }

    if (proposal.eventId) {
      event = await database.event.findFirst({
        where: {
          AND: [{ tenantId }, { id: proposal.eventId }, { deletedAt: null }],
        },
        select: {
          id: true,
          title: true,
        },
      });
    }

    // Fetch line items separately
    const lineItems = await database.proposalLineItem.findMany({
      where: { proposalId: proposal.id },
      orderBy: [{ sortOrder: "asc" }],
    });

    const proposalWithLineItems = {
      ...proposal,
      client,
      lead,
      event,
      lineItems,
    };

    return NextResponse.json({ data: proposalWithLineItems });
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

    // Verify proposal exists and belongs to tenant
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

    const body = await request.json();

    // Validate request body (allow partial updates)
    if (body.title !== undefined) {
      validateCreateProposalRequest(body);
    }

    const data = body as Partial<CreateProposalRequest>;

    // Calculate totals if line items provided
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

    // Update proposal using updateMany with tenantId check
    await database.proposal.updateMany({
      where: {
        AND: [{ tenantId }, { id }],
      },
      data: {
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
        status: data.status ? (data.status as any) : undefined,
        validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
        notes: data.notes?.trim() || undefined,
        termsAndConditions: data.termsAndConditions?.trim() || undefined,
      },
    });

    // Fetch updated proposal
    const updatedProposal = await database.proposal.findFirst({
      where: {
        AND: [{ tenantId }, { id }],
      },
    });

    if (!updatedProposal) {
      return NextResponse.json(
        { message: "Proposal not found after update" },
        { status: 404 }
      );
    }

    // Fetch client and lead separately
    let client: Record<string, unknown> | null = null;
    let lead: Record<string, unknown> | null = null;

    if (updatedProposal.clientId) {
      client = await database.client.findFirst({
        where: {
          AND: [
            { tenantId },
            { id: updatedProposal.clientId },
            { deletedAt: null },
          ],
        },
        select: {
          id: true,
          company_name: true,
          first_name: true,
          last_name: true,
          email: true,
          phone: true,
        },
      });
    }

    if (updatedProposal.leadId) {
      lead = await database.lead.findFirst({
        where: {
          AND: [
            { tenantId },
            { id: updatedProposal.leadId },
            { deletedAt: null },
          ],
        },
        select: {
          id: true,
          companyName: true,
          contactName: true,
          contactEmail: true,
          contactPhone: true,
        },
      });
    }

    // Update line items if provided
    if (data.lineItems && data.lineItems.length > 0) {
      await database.$transaction(async (tx) => {
        // Delete existing line items
        await tx.proposalLineItem.deleteMany({
          where: { proposalId: updatedProposal.id },
        });

        // Create new line items
        await tx.proposalLineItem.createMany({
          data: data.lineItems!.map((item, index) => ({
            proposalId: updatedProposal.id,
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
      });
    }

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
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const tenantId = await getTenantIdForOrg(orgId);

    // Verify proposal exists and belongs to tenant
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

    // Soft delete the proposal
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
