/**
 * Proposal CRUD API Endpoints
 *
 * GET    /api/crm/proposals      - List proposals with pagination and filters
 * POST   /api/crm/proposals      - Create a new proposal (via manifest command)
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { executeManifestCommand } from "@/lib/manifest-command-handler";
import { parsePaginationParams, parseProposalFilters } from "./validation";

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
 * POST /api/crm/proposals
 * Create a new proposal via manifest command
 */
export async function POST(request: NextRequest) {
  return executeManifestCommand(request, {
    entityName: "Proposal",
    commandName: "create",
  });
}
