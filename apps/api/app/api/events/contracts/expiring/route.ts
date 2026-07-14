/**
 * Event Contracts Expiring API Endpoint
 *
 * GET /api/events/contracts/expiring - Get contracts expiring soon
 */

import { auth } from "@repo/auth/server";
import { database, type Prisma } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
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

    // Fetch contracts + total count in parallel (count is data-independent, same
    // where) — collapses 2 serial round-trips into 1 concurrent batch (#23).
    // The downstream groupBy/event/client enrichment reads depend only on ids
    // from this page (not on each other) and run in one further batch below (#7).
    const [contracts, totalCount] = await Promise.all([
      database.eventContract.findMany({
        where: whereClause,
        orderBy: [{ expiresAt: "asc" }],
        take: limit,
        skip: offset,
      }),
      database.eventContract.count({ where: whereClause }),
    ]);

    // Collect ids from the page — all three enrichment reads below depend only
    // on these, not on each other.
    const contractIds = contracts.map((c) => c.id);
    const eventIds = contracts
      .map((c) => c.eventId)
      .filter((id): id is string => id !== null);
    const clientIds = contracts
      .map((c) => c.clientId)
      .filter((id): id is string => id !== null);

    // Enrich the page in one concurrent batch: signature counts + events +
    // clients each depend only on ids derived from the contracts page, so the
    // three serial round-trips collapse into one (#7 detail-waterfall fix).
    const [signatureCounts, events, clients] = await Promise.all([
      database.contractSignature.groupBy({
        by: ["contractId"],
        where: {
          contractId: { in: contractIds },
          deletedAt: null,
        },
        _count: {
          id: true,
        },
      }),
      database.event.findMany({
        where: {
          AND: [{ tenantId }, { id: { in: eventIds } }, { deletedAt: null }],
        },
        select: {
          id: true,
          title: true,
          eventDate: true,
        },
      }),
      database.client.findMany({
        where: {
          AND: [{ tenantId }, { id: { in: clientIds } }, { deletedAt: null }],
        },
        select: {
          id: true,
          companyName: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      }),
    ]);

    // Create lookup maps
    const signatureCountMap = new Map(
      signatureCounts.map((sc) => [sc.contractId, sc._count.id])
    );
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
          ? client.companyName ||
            `${client.firstName} ${client.lastName}`.trim()
          : "Unknown Client",
        eventName: event?.title || null,
        eventDate: event?.eventDate ?? null,
        documentType: contract.documentType as DocumentType | null,
        expiresAt: contract.expiresAt,
        createdAt: contract.createdAt,
        updatedAt: contract.updatedAt,
        signatureCount: signatureCountMap.get(contract.id) || 0,
      };
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
    captureException(error);
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    log.error("Error fetching expiring contracts:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
