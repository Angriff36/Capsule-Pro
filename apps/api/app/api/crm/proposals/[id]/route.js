/**
 * Single Proposal CRUD API Endpoints
 *
 * GET    /api/crm/proposals/[id]      - Get a single proposal
 * PUT    /api/crm/proposals/[id]      - Update a proposal
 * DELETE /api/crm/proposals/[id]      - Soft delete a proposal
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.PUT = PUT;
exports.DELETE = DELETE;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const invariant_1 = require("@/app/lib/invariant");
const tenant_1 = require("@/app/lib/tenant");
const validation_1 = require("../validation");
/**
 * GET /api/crm/proposals/[id]
 * Get a single proposal by ID
 */
async function GET(request, { params }) {
  try {
    const { orgId } = await (0, server_1.auth)();
    if (!orgId) {
      return server_2.NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    const { id } = await params;
    const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
    const proposal = await database_1.database.proposal.findFirst({
      where: {
        AND: [{ id }, { tenantId }, { deletedAt: null }],
      },
    });
    if (!proposal) {
      return server_2.NextResponse.json(
        { message: "Proposal not found" },
        { status: 404 }
      );
    }
    // Fetch client and lead separately
    let client = null;
    let lead = null;
    let event = null;
    if (proposal.clientId) {
      client = await database_1.database.client.findFirst({
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
      lead = await database_1.database.lead.findFirst({
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
      event = await database_1.database.event.findFirst({
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
    const lineItems = await database_1.database.proposal_line_items.findMany({
      where: { proposal_id: proposal.id },
      orderBy: [{ sort_order: "asc" }],
    });
    const proposalWithLineItems = {
      ...proposal,
      client,
      lead,
      event,
      lineItems,
    };
    return server_2.NextResponse.json({ data: proposalWithLineItems });
  } catch (error) {
    if (error instanceof invariant_1.InvariantError) {
      return server_2.NextResponse.json(
        { message: error.message },
        { status: 400 }
      );
    }
    console.error("Error getting proposal:", error);
    return server_2.NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
/**
 * PUT /api/crm/proposals/[id]
 * Update a proposal
 */
async function PUT(request, { params }) {
  try {
    const { orgId } = await (0, server_1.auth)();
    if (!orgId) {
      return server_2.NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    const { id } = await params;
    const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
    // Verify proposal exists and belongs to tenant
    const existingProposal = await database_1.database.proposal.findFirst({
      where: {
        AND: [{ id }, { tenantId }, { deletedAt: null }],
      },
    });
    if (!existingProposal) {
      return server_2.NextResponse.json(
        { message: "Proposal not found" },
        { status: 404 }
      );
    }
    const body = await request.json();
    // Validate request body (allow partial updates)
    if (body.title !== undefined) {
      (0, validation_1.validateCreateProposalRequest)(body);
    }
    const data = body;
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
    await database_1.database.proposal.updateMany({
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
        subtotal: new database_1.Prisma.Decimal(calculatedSubtotal),
        taxRate:
          data.taxRate !== undefined && data.taxRate !== null
            ? new database_1.Prisma.Decimal(data.taxRate)
            : undefined,
        taxAmount: new database_1.Prisma.Decimal(calculatedTax),
        discountAmount:
          data.discountAmount !== undefined && data.discountAmount !== null
            ? new database_1.Prisma.Decimal(data.discountAmount)
            : undefined,
        total: new database_1.Prisma.Decimal(calculatedTotal),
        status: data.status ? data.status : undefined,
        validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
        notes: data.notes?.trim() || undefined,
        termsAndConditions: data.termsAndConditions?.trim() || undefined,
      },
    });
    // Fetch updated proposal
    const updatedProposal = await database_1.database.proposal.findFirst({
      where: {
        AND: [{ tenantId }, { id }],
      },
    });
    if (!updatedProposal) {
      return server_2.NextResponse.json(
        { message: "Proposal not found after update" },
        { status: 404 }
      );
    }
    // Fetch client and lead separately
    let client = null;
    let lead = null;
    if (updatedProposal.clientId) {
      client = await database_1.database.client.findFirst({
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
      lead = await database_1.database.lead.findFirst({
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
      await database_1.database.$transaction(async (tx) => {
        // Delete existing line items
        await tx.proposal_line_items.deleteMany({
          where: { proposal_id: updatedProposal.id },
        });
        // Create new line items
        await tx.proposal_line_items.createMany({
          data: data.lineItems.map((item, index) => ({
            proposal_id: updatedProposal.id,
            tenant_id: tenantId,
            sort_order: item.sortOrder ?? index,
            item_type: item.itemType.trim(),
            description: item.description.trim(),
            quantity: new database_1.Prisma.Decimal(item.quantity),
            unit_price: new database_1.Prisma.Decimal(item.unitPrice),
            total: new database_1.Prisma.Decimal(
              item.total ?? item.quantity * item.unitPrice
            ),
            notes: item.notes?.trim() || null,
          })),
        });
      });
    }
    return server_2.NextResponse.json({
      data: { ...updatedProposal, client, lead },
    });
  } catch (error) {
    if (error instanceof invariant_1.InvariantError) {
      return server_2.NextResponse.json(
        { message: error.message },
        { status: 400 }
      );
    }
    console.error("Error updating proposal:", error);
    return server_2.NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
/**
 * DELETE /api/crm/proposals/[id]
 * Soft delete a proposal
 */
async function DELETE(request, { params }) {
  try {
    const { orgId } = await (0, server_1.auth)();
    if (!orgId) {
      return server_2.NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    const { id } = await params;
    const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
    // Verify proposal exists and belongs to tenant
    const existingProposal = await database_1.database.proposal.findFirst({
      where: {
        AND: [{ id }, { tenantId }, { deletedAt: null }],
      },
    });
    if (!existingProposal) {
      return server_2.NextResponse.json(
        { message: "Proposal not found" },
        { status: 404 }
      );
    }
    // Soft delete the proposal
    await database_1.database.proposal.updateMany({
      where: {
        AND: [{ tenantId }, { id }],
      },
      data: {
        deletedAt: new Date(),
      },
    });
    return server_2.NextResponse.json({
      message: "Proposal deleted successfully",
    });
  } catch (error) {
    if (error instanceof invariant_1.InvariantError) {
      return server_2.NextResponse.json(
        { message: error.message },
        { status: 400 }
      );
    }
    console.error("Error deleting proposal:", error);
    return server_2.NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
