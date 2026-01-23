/**
 * Event Contracts Expiring API Endpoint
 *
 * GET /api/events/contracts/expiring - Get contracts expiring soon
 */

import { auth } from "@repo/auth/server";
import { database, type Prisma } from "@repo/database";
import { NextResponse } from "next/server";
import { InvariantError } from "../../../../lib/invariant";
import { getTenantIdForOrg } from "../../../../lib/tenant";
import type {
  ContractListItem,
  ContractListResponse,
  ContractStatus,
  DocumentType,
} from "../types";

/**
 * Parse and validate expiring contracts parameters from URL search params
 */
function parseExpiringContractsParams(searchParams: URLSearchParams) {
  const days = Math.min(
    Math.max(Number.parseInt(searchParams.get("days") || "30", 10), 1),
    90
  );

  const page = Math.max(
    Number.parseInt(searchParams.get("page") || "1", 10),
    1
  );
  const limit = Math.min(
    Math.max(Number.parseInt(searchParams.get("limit") || "20", 10), 1),
    100
  );
  const offset = (page - 1) * limit;

  return { days, page, limit, offset };
}

/**
 * Calculate date range for expiring contracts
 */
function getExpiringDateRange(days: number) {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(now.getDate() + days);

  return {
    from: now,
    to: futureDate,
  };
}

/**
 * Build Prisma where clause for expiring contracts
 */
function buildExpiringContractsWhereClause(
  tenantId: string,
  dateRange: { from: Date; to: Date }
): Prisma.EventContractWhereInput {
  return {
    tenantId,
    deletedAt: null,
    status: { in: ["draft", "sent", "viewed"] },
    expiresAt: {
      not: null,
      gte: dateRange.from,
      lte: dateRange.to,
    },
  };
}

/**
 * GET /api/events/contracts/expiring
 * Get contracts expiring soon with pagination
 */
export async function GET(request: Request) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { searchParams } = new URL(request.url);

    // Parse parameters with validation
    const { days, page, limit, offset } =
      parseExpiringContractsParams(searchParams);
    const dateRange = getExpiringDateRange(days);

    // Build where clause for expiring contracts
    const whereClause = buildExpiringContractsWhereClause(tenantId, dateRange);

    // Fetch contracts
    const contracts = await database.eventContract.findMany({
      where: whereClause,
      orderBy: [{ expiresAt: "asc" }],
      take: limit,
      skip: offset,
    });

    // Get signature counts for each contract
    const contractIds = contracts.map((c) => c.id);
    const signatureCounts = await database.contractSignature.groupBy({
      by: ["contractId"],
      where: {
        contractId: { in: contractIds },
        deletedAt: null,
      },
      _count: {
        id: true,
      },
    });

    const signatureCountMap = new Map(
      signatureCounts.map((sc) => [sc.contractId, sc._count.id])
    );

    // Collect all event and client IDs for batch query
    const eventIds = contracts
      .map((c) => c.eventId)
      .filter((id): id is string => id !== null);
    const clientIds = contracts
      .map((c) => c.clientId)
      .filter((id): id is string => id !== null);

    // Batch fetch events and clients
    const events = await database.event.findMany({
      where: {
        AND: [{ tenantId }, { id: { in: eventIds } }, { deletedAt: null }],
      },
      select: {
        id: true,
        title: true,
        eventDate: true,
      },
    });

    const clients = await database.client.findMany({
      where: {
        AND: [{ tenantId }, { id: { in: clientIds } }, { deletedAt: null }],
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

    // Create lookup maps
    const eventMap = new Map(events.map((e) => [e.id, e]));
    const clientMap = new Map(clients.map((c) => [c.id, c]));

    // Build contract list items with event and client details
    const contractListItems: ContractListItem[] = contracts.map((contract) => {
      const event = contract.eventId ? eventMap.get(contract.eventId) : null;
      const client = contract.clientId
        ? clientMap.get(contract.clientId)
        : null;

      return {
        id: contract.id,
        contractNumber: contract.contractNumber,
        title: contract.title,
        status: contract.status as ContractStatus,
        clientId: contract.clientId,
        clientName: client
          ? client.company_name ||
            `${client.first_name} ${client.last_name}`.trim()
          : "Unknown Client",
        eventName: event?.title || null,
        eventDate: event?.eventDate,
        documentType: contract.documentType as DocumentType | null,
        expiresAt: contract.expiresAt,
        createdAt: contract.createdAt,
        updatedAt: contract.updatedAt,
        signatureCount: signatureCountMap.get(contract.id) || 0,
      };
    });

    // Get total count for pagination
    const totalCount = await database.eventContract.count({
      where: whereClause,
    });

    const totalPages = Math.ceil(totalCount / limit);

    // Response with business logic information
    const response: ContractListResponse = {
      data: contractListItems,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Error fetching expiring contracts:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
