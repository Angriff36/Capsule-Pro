/**
 * Event Contracts API Endpoints
 *
 * GET    /api/events/contracts      - List contracts with pagination and filters
 * POST   /api/events/contracts      - Create a new contract
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { InvariantError, invariant } from "../../../lib/invariant";
import { getTenantIdForOrg } from "../../../lib/tenant";
import type { ContractStatus } from "./types";
import { CONTRACT_STATUSES } from "./validation";

// Define types
type CreateContractRequest = {
  eventId: string;
  clientId: string;
  title?: string;
  notes?: string;
  expiresAt?: string;
  documentUrl?: string;
  documentType?: string;
};

// Removed - imported from ./types

type ContractListFilters = {
  status?: ContractStatus;
  eventId?: string;
  clientId?: string;
  expiring?: boolean;
};

type PaginationParams = {
  page: number;
  limit: number;
};

/**
 * Parse and validate contract list filters from URL search params
 */
function parseContractFilters(
  searchParams: URLSearchParams
): ContractListFilters {
  const filters: ContractListFilters = {};

  // Parse status filter
  const status = searchParams.get("status");
  if (status && CONTRACT_STATUSES.includes(status as ContractStatus)) {
    filters.status = status as ContractStatus;
  }

  // Parse event ID filter
  const eventId = searchParams.get("eventId");
  if (eventId) {
    filters.eventId = eventId;
  }

  // Parse client ID filter
  const clientId = searchParams.get("clientId");
  if (clientId) {
    filters.clientId = clientId;
  }

  // Parse expiring filter
  const expiring = searchParams.get("expiring");
  if (expiring) {
    filters.expiring = expiring === "true";
  }

  return filters;
}

/**
 * Parse pagination parameters from URL search params
 */
function parsePaginationParams(
  searchParams: URLSearchParams
): PaginationParams {
  const page = Number.parseInt(searchParams.get("page") || "1", 10);
  const limit = Math.min(
    Math.max(Number.parseInt(searchParams.get("limit") || "20", 10), 1),
    100
  );

  return { page, limit };
}

/**
 * Validate create contract request body
 */
function validateCreateContractRequest(
  data: unknown
): asserts data is CreateContractRequest {
  invariant(data, "Request body is required");

  const body = data as CreateContractRequest;

  invariant(body.eventId, "eventId is required");
  invariant(body.clientId, "clientId is required");

  if (body.expiresAt) {
    const date = new Date(body.expiresAt);
    invariant(
      !isNaN(date.getTime()),
      "expiresAt must be a valid ISO date string"
    );
  }
}

/**
 * GET /api/events/contracts
 * List contracts with pagination and filters
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
    const filters = parseContractFilters(searchParams);
    const { page, limit } = parsePaginationParams(searchParams);
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause: Record<string, unknown> = {
      AND: [{ tenantId }, { deletedAt: null }],
    };

    // Add status filter
    if (filters.status) {
      whereClause.AND = [
        ...(whereClause.AND as Array<Record<string, unknown>>),
        { status: filters.status },
      ];
    }

    // Add event filter
    if (filters.eventId) {
      whereClause.AND = [
        ...(whereClause.AND as Array<Record<string, unknown>>),
        { eventId: filters.eventId },
      ];
    }

    // Add client filter
    if (filters.clientId) {
      whereClause.AND = [
        ...(whereClause.AND as Array<Record<string, unknown>>),
        { clientId: filters.clientId },
      ];
    }

    // Add expiring filter (contracts expiring in next 30 days)
    if (filters.expiring) {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      whereClause.AND = [
        ...(whereClause.AND as Array<Record<string, unknown>>),
        {
          AND: [
            { status: { in: ["draft", "sent", "viewed"] } },
            { expiresAt: { not: null } },
            { expiresAt: { lte: thirtyDaysFromNow } },
          ],
        },
      ];
    }

    // Fetch contracts
    const contracts = await database.eventContract.findMany({
      where: whereClause,
      orderBy: [{ createdAt: "desc" }],
      take: limit,
      skip: offset,
    });

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
      },
    });

    // Create lookup maps
    const eventMap = new Map(events.map((e) => [e.id, e]));
    const clientMap = new Map(clients.map((c) => [c.id, c]));

    // Add event and client details to contracts
    const contractsWithDetails = contracts.map((contract) => ({
      ...contract,
      event: contract.eventId ? eventMap.get(contract.eventId) || null : null,
      client: contract.clientId
        ? clientMap.get(contract.clientId) || null
        : null,
    }));

    // Get total count for pagination
    const totalCount = await database.eventContract.count({
      where: whereClause,
    });

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      data: contractsWithDetails,
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
    console.error("Error listing contracts:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/events/contracts
 * Create a new contract
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
    validateCreateContractRequest(body);

    const data = body as CreateContractRequest;

    // Verify event exists and belongs to the tenant
    const event = await database.event.findFirst({
      where: {
        tenantId,
        id: data.eventId,
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
      },
    });

    if (!event) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 });
    }

    // Verify client exists and belongs to the tenant
    const client = await database.client.findFirst({
      where: {
        tenantId,
        id: data.clientId,
        deletedAt: null,
      },
      select: {
        id: true,
        company_name: true,
        first_name: true,
        last_name: true,
      },
    });

    if (!client) {
      return NextResponse.json(
        { message: "Client not found" },
        { status: 404 }
      );
    }

    // Auto-generate contract number using JavaScript
    // Format: EVC-YYYY-0001 (EVC = Event Contract, YYYY = year, 0001 = sequential number)
    const currentYear = new Date().getFullYear().toString();
    const yearPrefix = `EVC-${currentYear}`;

    // Count existing contracts for this tenant and year
    const yearCount = await database.eventContract.count({
      where: {
        tenantId,
        contractNumber: { startsWith: yearPrefix },
        deletedAt: null,
      },
    });

    const sequentialNumber = String(yearCount + 1).padStart(4, "0");
    const finalContractNumber = `${yearPrefix}-${sequentialNumber}`;

    // Create contract with proper tenant isolation
    const contract = await database.eventContract.create({
      data: {
        tenantId,
        eventId: data.eventId,
        clientId: data.clientId,
        contractNumber: finalContractNumber,
        title: data.title?.trim() || "Untitled Contract",
        status: "draft" as ContractStatus,
        notes: data.notes?.trim() || null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        documentUrl: data.documentUrl?.trim() || null,
        documentType: data.documentType?.trim() || null,
      },
    });

    // Fetch event and client details for the response
    const eventDetails = await database.event.findFirst({
      where: {
        AND: [{ tenantId }, { id: data.eventId }, { deletedAt: null }],
      },
      select: {
        id: true,
        title: true,
        eventDate: true,
      },
    });

    const clientDetails = await database.client.findFirst({
      where: {
        AND: [{ tenantId }, { id: data.clientId }, { deletedAt: null }],
      },
      select: {
        id: true,
        company_name: true,
        first_name: true,
        last_name: true,
      },
    });

    return NextResponse.json(
      {
        data: {
          ...contract,
          event: eventDetails,
          client: clientDetails,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Error creating contract:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
