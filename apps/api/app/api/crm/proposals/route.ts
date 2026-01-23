/**
 * Proposal CRUD API Endpoints
 *
 * GET    /api/crm/proposals      - List proposals with pagination and filters
 * POST   /api/crm/proposals      - Create a new proposal
 */

import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import type { CreateProposalRequest } from "./types";
import {
  parsePaginationParams,
  parseProposalFilters,
  validateCreateProposalRequest,
} from "./validation";

/**
 * GET /api/crm/proposals
 * List proposals with pagination, search, and filters
 */
export async function GET(request: Request) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { searchParams } = new URL(request.url);

    // Parse filters and pagination
    const filters = parseProposalFilters(searchParams);
    const { page, limit } = parsePaginationParams(searchParams);
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause: Record<string, unknown> = {
      AND: [{ tenantId }, { deletedAt: null }],
    };

    // Add search filter (searches title, proposal number, venue)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      whereClause.AND = [
        ...(whereClause.AND as Record<string, unknown>[]),
        {
          OR: [
            { title: { contains: searchLower, mode: "insensitive" } },
            { proposalNumber: { contains: searchLower, mode: "insensitive" } },
            { venueName: { contains: searchLower, mode: "insensitive" } },
          ],
        },
      ];
    }

    // Add status filter
    if (filters.status) {
      whereClause.AND = [
        ...(whereClause.AND as Record<string, unknown>[]),
        { status: filters.status },
      ];
    }

    // Add client filter
    if (filters.clientId) {
      whereClause.AND = [
        ...(whereClause.AND as Record<string, unknown>[]),
        { clientId: filters.clientId },
      ];
    }

    // Add lead filter
    if (filters.leadId) {
      whereClause.AND = [
        ...(whereClause.AND as Record<string, unknown>[]),
        { leadId: filters.leadId },
      ];
    }

    // Add event filter
    if (filters.eventId) {
      whereClause.AND = [
        ...(whereClause.AND as Record<string, unknown>[]),
        { eventId: filters.eventId },
      ];
    }

    // Add date range filters
    if (filters.dateFrom) {
      whereClause.AND = [
        ...(whereClause.AND as Record<string, unknown>[]),
        { eventDate: { gte: new Date(filters.dateFrom) } },
      ];
    }

    if (filters.dateTo) {
      whereClause.AND = [
        ...(whereClause.AND as Record<string, unknown>[]),
        { eventDate: { lte: new Date(filters.dateTo) } },
      ];
    }

    // Fetch proposals
    const proposals = await database.proposal.findMany({
      where: whereClause,
      orderBy: [{ createdAt: "desc" }],
      take: limit,
      skip: offset,
    });

    // Collect all client and lead IDs for batch query
    const clientIds = proposals
      .map((p) => p.clientId)
      .filter((id): id is string => id !== null);
    const leadIds = proposals
      .map((p) => p.leadId)
      .filter((id): id is string => id !== null);

    // Batch fetch clients and leads
    const clients = await database.client.findMany({
      where: {
        AND: [{ tenantId }, { id: { in: clientIds } }, { deletedAt: null }],
      },
      select: {
        id: true,
        company_name: true,
        first_name: true,
        last_name: true,
      },
    });

    const leads = await database.lead.findMany({
      where: {
        AND: [{ tenantId }, { id: { in: leadIds } }, { deletedAt: null }],
      },
      select: {
        id: true,
        companyName: true,
        contactName: true,
        contactEmail: true,
      },
    });

    // Create lookup maps
    const clientMap = new Map(clients.map((c) => [c.id, c]));
    const leadMap = new Map(leads.map((l) => [l.id, l]));

    // Fetch line items separately for each proposal
    const proposalsWithLineItems = await Promise.all(
      proposals.map(async (proposal) => {
        const lineItems = await database.proposal_line_items.findMany({
          where: { proposal_id: proposal.id },
          orderBy: [{ sort_order: "asc" }],
        });
        return {
          ...proposal,
          client: proposal.clientId
            ? clientMap.get(proposal.clientId) || null
            : null,
          lead: proposal.leadId ? leadMap.get(proposal.leadId) || null : null,
          lineItems,
        };
      })
    );

    // Get total count for pagination
    const totalCount = await database.proposal.count({
      where: whereClause,
    });

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      data: proposalsWithLineItems,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
      },
    });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Error listing proposals:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/crm/proposals
 * Create a new proposal
 */
export async function POST(request: Request) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const body = await request.json();

    // Validate request body
    validateCreateProposalRequest(body);

    const data = body as CreateProposalRequest;

    // Generate proposal number (PROP-YYYY-XXXX)
    const year = new Date().getFullYear();
    const count = await database.proposal.count({
      where: {
        AND: [
          { tenantId },
          { proposalNumber: { startsWith: `PROP-${year}` } },
          { deletedAt: null },
        ],
      },
    });
    const proposalNumber = `PROP-${year}-${String(count + 1).padStart(4, "0")}`;

    // Calculate totals if line items provided
    let calculatedSubtotal = data.subtotal ?? 0;
    let calculatedTax = data.taxAmount ?? 0;
    let calculatedTotal = data.total ?? 0;

    if (data.lineItems && data.lineItems.length > 0) {
      calculatedSubtotal = data.lineItems.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0
      );
      const taxRate = data.taxRate ?? 0;
      calculatedTax = calculatedSubtotal * (taxRate / 100);
      const discount = data.discountAmount ?? 0;
      calculatedTotal = calculatedSubtotal + calculatedTax - discount;
    }

    // Create proposal
    const proposal = await database.proposal.create({
      data: {
        tenantId,
        proposalNumber,
        clientId: data.clientId,
        leadId: data.leadId,
        eventId: data.eventId,
        title: data.title.trim(),
        eventDate: data.eventDate ? new Date(data.eventDate) : null,
        eventType: data.eventType?.trim() || null,
        guestCount: data.guestCount ?? null,
        venueName: data.venueName?.trim() || null,
        venueAddress: data.venueAddress?.trim() || null,
        subtotal: new Prisma.Decimal(calculatedSubtotal),
        taxRate: new Prisma.Decimal(data.taxRate ?? 0),
        taxAmount: new Prisma.Decimal(calculatedTax),
        discountAmount: new Prisma.Decimal(data.discountAmount ?? 0),
        total: new Prisma.Decimal(calculatedTotal),
        status: (data.status as any) ?? "draft",
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        notes: data.notes?.trim() || null,
        termsAndConditions: data.termsAndConditions?.trim() || null,
      },
    });

    // Fetch client and lead separately
    let client: Record<string, unknown> | null = null;
    let lead: Record<string, unknown> | null = null;

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

    // Create line items in a transaction
    if (data.lineItems && data.lineItems.length > 0) {
      await database.$transaction(async (tx) => {
        await tx.proposal_line_items.createMany({
          data: data.lineItems!.map((item, index) => ({
            proposal_id: proposal.id,
            tenant_id: tenantId,
            sort_order: item.sortOrder ?? index,
            item_type: item.itemType.trim(),
            description: item.description.trim(),
            quantity: new Prisma.Decimal(item.quantity),
            unit_price: new Prisma.Decimal(item.unitPrice),
            total: new Prisma.Decimal(
              item.total ?? item.quantity * item.unitPrice
            ),
            notes: item.notes?.trim() || null,
          })),
        });
      });
    }

    return NextResponse.json(
      {
        data: { ...proposal, client, lead },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Error creating proposal:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
