/**
 * Client CRUD API Endpoints
 *
 * GET    /api/crm/clients      - List clients with pagination and filters
 * POST   /api/crm/clients      - Create a new client
 */

import { auth } from "@repo/auth/server";
import { database, PrismaClient } from "@repo/database";
import { NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import type { CreateClientRequest } from "./types";
import type { ClientCreateInput } from "@repo/database";
import {
  parseClientListFilters,
  parsePaginationParams,
  validateCreateClientRequest,
} from "./validation";

/**
 * GET /api/crm/clients
 * List clients with pagination, search, and filters
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
    const filters = parseClientListFilters(searchParams);
    const { page, limit } = parsePaginationParams(searchParams);
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause: Record<string, unknown> = {
      AND: [{ tenantId }, { deletedAt: null }],
    };

    // Add search filter (searches company name, individual names, email)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      whereClause.AND = [
        ...(whereClause.AND as Record<string, unknown>[]),
        {
          OR: [
            { company_name: { contains: searchLower, mode: "insensitive" } },
            { first_name: { contains: searchLower, mode: "insensitive" } },
            { last_name: { contains: searchLower, mode: "insensitive" } },
            { email: { contains: searchLower, mode: "insensitive" } },
          ],
        },
      ];
    }

    // Add tag filter
    if (filters.tags && filters.tags.length > 0) {
      whereClause.AND = [
        ...(whereClause.AND as Record<string, unknown>[]),
        { tags: { hasSome: filters.tags } },
      ];
    }

    // Add assignedTo filter
    if (filters.assignedTo) {
      whereClause.AND = [
        ...(whereClause.AND as Record<string, unknown>[]),
        { assignedTo: filters.assignedTo },
      ];
    }

    // Add clientType filter
    if (filters.clientType) {
      whereClause.AND = [
        ...(whereClause.AND as Record<string, unknown>[]),
        { clientType: filters.clientType },
      ];
    }

    // Add source filter
    if (filters.source) {
      whereClause.AND = [
        ...(whereClause.AND as Record<string, unknown>[]),
        { source: filters.source },
      ];
    }

    // Fetch clients
    const clients = await database.client.findMany({
      where: whereClause,
      orderBy: [{ createdAt: "desc" }],
      take: limit,
      skip: offset,
    });

    // Get total count for pagination
    const totalCount = await database.client.count({
      where: whereClause,
    });

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      data: clients,
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
    console.error("Error listing clients:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Build client data for creation
 */
function buildCreateClientData(
  data: CreateClientRequest,
  tenantId: string,
  clientType: string
): ClientCreateInput {
  const clientData: Record<string, unknown> = {
    tenantId,
    clientType,
  };

  // Helper to conditionally add trimmed string fields
  const addTrimmedString = (key: keyof CreateClientRequest) => {
    const value = data[key];
    if (value !== undefined && value !== null) {
      clientData[key] = (value as string)?.trim() || null;
    }
  };

  // Helper to add optional values
  const addOptional = <T>(key: keyof CreateClientRequest, defaultValue?: T) => {
    const value = data[key];
    if (value !== undefined) {
      clientData[key] =
        defaultValue !== undefined ? (value ?? defaultValue) : value;
    }
  };

  // Add string fields that need trimming
  addTrimmedString("company_name");
  addTrimmedString("first_name");
  addTrimmedString("last_name");
  addTrimmedString("email");
  addTrimmedString("phone");
  addTrimmedString("website");
  addTrimmedString("addressLine1");
  addTrimmedString("addressLine2");
  addTrimmedString("city");
  addTrimmedString("stateProvince");
  addTrimmedString("postalCode");
  addTrimmedString("countryCode");
  addTrimmedString("taxId");
  addTrimmedString("notes");
  addTrimmedString("source");

  // Add optional fields with defaults
  addOptional("defaultPaymentTerms", 30);
  addOptional("taxExempt", false);
  addOptional("tags", []);
  addOptional("assignedTo", null);

  return clientData as ClientCreateInput;
}

/**
 * Check for duplicate email
 */
async function checkDuplicateEmail(
  database: PrismaClient,
  tenantId: string,
  email: string
) {
  const existingClient = await database.client.findFirst({
    where: {
      AND: [{ tenantId }, { email: email.trim() }, { deletedAt: null }],
    },
  });
  return existingClient;
}

/**
 * POST /api/crm/clients
 * Create a new client
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
    validateCreateClientRequest(body);

    const data = body as CreateClientRequest;

    // Check for duplicate email (if provided)
    if (data.email?.trim()) {
      const existingClient = await checkDuplicateEmail(
        database,
        tenantId,
        data.email
      );

      if (existingClient) {
        return NextResponse.json(
          { message: "A client with this email already exists" },
          { status: 409 }
        );
      }
    }

    // Determine client type from data
    const clientType =
      data.clientType || (data.company_name ? "company" : "individual");

    // Create client
    const clientData = buildCreateClientData(data, tenantId, clientType);
    const client = await database.client.create({
      data: clientData,
    });

    return NextResponse.json({ data: client }, { status: 201 });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Error creating client:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
