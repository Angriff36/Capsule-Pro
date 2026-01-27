/**
 * Proposal CRUD API Endpoints
 *
 * GET    /api/crm/proposals      - List proposals with pagination and filters
 * POST   /api/crm/proposals      - Create a new proposal
 */

import { auth } from "@repo/auth/server";
import { database, Prisma, PrismaClient } from "@repo/database";
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

    const filters = parseProposalFilters(searchParams);
    const { page, limit } = parsePaginationParams(searchParams);
    const offset = (page - 1) * limit;

    const whereClause: Record<string, unknown> = {
      AND: [{ tenantId }, { deletedAt: null }],
    };

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

    if (filters.status) {
      whereClause.AND = [
        ...(whereClause.AND as Record<string, unknown>[]),
        { status: filters.status },
      ];
    }

    if (filters.clientId) {
      whereClause.AND = [
        ...(whereClause.AND as Record<string, unknown>[]),
        { clientId: filters.clientId },
      ];
    }

    if (filters.leadId) {
      whereClause.AND = [
        ...(whereClause.AND as Record<string, unknown>[]),
        { leadId: filters.leadId },
      ];
    }

    if (filters.eventId) {
      whereClause.AND = [
        ...(whereClause.AND as Record<string, unknown>[]),
        { eventId: filters.eventId },
      ];
    }

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

    const proposals = await database.proposal.findMany({
      where: whereClause,
      orderBy: [{ createdAt: "desc" }],
      take: limit,
      skip: offset,
    });

    const clientIds = proposals
      .map((p) => p.clientId)
      .filter((id): id is string => id !== null);
    const leadIds = proposals
      .map((p) => p.leadId)
      .filter((id): id is string => id !== null);

    const [clients, leads] = await Promise.all([
      database.client.findMany({
        where: {
          AND: [{ tenantId }, { id: { in: clientIds } }, { deletedAt: null }],
        },
        select: {
          id: true,
          company_name: true,
          first_name: true,
          last_name: true,
        },
      }),
      database.lead.findMany({
        where: {
          AND: [{ tenantId }, { id: { in: leadIds } }, { deletedAt: null }],
        },
        select: {
          id: true,
          companyName: true,
          contactName: true,
          contactEmail: true,
        },
      }),
    ]);

    const clientMap = new Map(clients.map((c) => [c.id, c]));
    const leadMap = new Map(leads.map((l) => [l.id, l]));

    const proposalsWithLineItems = await Promise.all(
      proposals.map(async (proposal) => {
        const lineItems = await database.proposalLineItem.findMany({
          where: { proposalId: proposal.id },
          orderBy: [{ sortOrder: "asc" }],
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

    const totalCount = await database.proposal.count({ where: whereClause });
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      data: proposalsWithLineItems,
      pagination: { page, limit, total: totalCount, totalPages },
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
 * Generate a unique proposal number
 */
async function generateProposalNumber(
  database: PrismaClient,
  tenantId: string
): Promise<string> {
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
  return `PROP-${year}-${String(count + 1).padStart(4, "0")}`;
}

/**
 * Calculate proposal totals from line items
 */
function calculateTotals(data: CreateProposalRequest) {
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

  return { calculatedSubtotal, calculatedTax, calculatedTotal };
}

/**
 * Create proposal data object
 */
function buildCreateProposalData(
  data: CreateProposalRequest,
  tenantId: string,
  proposalNumber: string,
  calculatedSubtotal: number,
  calculatedTax: number,
  calculatedTotal: number
) {
  return {
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
    status: data.status ?? "draft",
    validUntil: data.validUntil ? new Date(data.validUntil) : null,
    notes: data.notes?.trim() || null,
    termsAndConditions: data.termsAndConditions?.trim() || null,
  };
}

/**
 * Create line items for a proposal
 */
async function createLineItems(
  database: PrismaClient,
  proposalId: string,
  tenantId: string,
  lineItems: NonNullable<CreateProposalRequest["lineItems"]>
) {
  await database.$transaction(async (tx) => {
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
        total: new Prisma.Decimal(item.total ?? item.quantity * item.unitPrice),
        totalPrice: new Prisma.Decimal(
          item.total ?? item.quantity * item.unitPrice
        ),
        notes: item.notes?.trim() || null,
      })),
    });
  });
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

    validateCreateProposalRequest(body);
    const data = body as CreateProposalRequest;

    const proposalNumber = await generateProposalNumber(database, tenantId);
    const { calculatedSubtotal, calculatedTax, calculatedTotal } =
      calculateTotals(data);

    const proposalData = buildCreateProposalData(
      data,
      tenantId,
      proposalNumber,
      calculatedSubtotal,
      calculatedTax,
      calculatedTotal
    );
    const proposal = await database.proposal.create({ data: proposalData });

    if (data.lineItems && data.lineItems.length > 0) {
      await createLineItems(database, proposal.id, tenantId, data.lineItems);
    }

    const [client, lead] = await Promise.all([
      proposal.clientId
        ? database.client.findFirst({
            where: {
              AND: [
                { tenantId },
                { id: proposal.clientId },
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
          })
        : null,
      proposal.leadId
        ? database.lead.findFirst({
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
          })
        : null,
    ]);

    return NextResponse.json(
      { data: { ...proposal, client, lead } },
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
