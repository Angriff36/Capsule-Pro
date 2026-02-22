/**
 * Client CRUD API Endpoints
 *
 * GET    /api/crm/clients      - List clients with pagination and filters
 * POST   /api/crm/clients      - Create a new client (via manifest command)
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { executeManifestCommand } from "@/lib/manifest-command-handler";
import { parseClientListFilters, parsePaginationParams } from "./validation";

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
 * POST /api/crm/clients
 * Create a new client via manifest command
 */
export async function POST(request: NextRequest) {
  return await executeManifestCommand(request, {
    entityName: "Client",
    commandName: "create",
  });
}
