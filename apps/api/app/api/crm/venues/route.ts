/**
 * Venues API Endpoints
 *
 * GET  /api/crm/venues  - List venues with filters and pagination
 * POST /api/crm/venues  - Create a new venue (via Manifest runtime)
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg, resolveCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";
import { translatePrismaError } from "@/lib/prisma-error";
import { parsePaginationParams, parseVenueListFilters } from "./validation";

/**
 * GET /api/crm/venues
 */
export async function GET(request: NextRequest) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const filters = parseVenueListFilters(request.nextUrl.searchParams);
    const { page, limit } = parsePaginationParams(request.nextUrl.searchParams);

    const andClauses: Record<string, unknown>[] = [
      { tenantId },
      { deletedAt: null },
    ];

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      andClauses.push({
        OR: [
          { name: { contains: searchLower, mode: "insensitive" } },
          { city: { contains: searchLower, mode: "insensitive" } },
          { contactName: { contains: searchLower, mode: "insensitive" } },
        ],
      });
    }

    if (filters.tags && filters.tags.length > 0) {
      andClauses.push({ tags: { hasSome: filters.tags } });
    }

    if (filters.venueType) {
      andClauses.push({ venueType: filters.venueType });
    }

    if (filters.city) {
      andClauses.push({
        city: { contains: filters.city, mode: "insensitive" },
      });
    }

    if (filters.isActive !== undefined) {
      andClauses.push({ isActive: filters.isActive });
    }

    if (filters.minCapacity !== undefined) {
      andClauses.push({ capacity: { gte: filters.minCapacity } });
    }

    const whereClause = { AND: andClauses };
    const offset = (page - 1) * limit;

    const [venues, totalCount] = await Promise.all([
      database.venue.findMany({
        where: whereClause,
        orderBy: [{ createdAt: "desc" }],
        take: limit,
        skip: offset,
      }),
      database.venue.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      data: venues,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    const prismaResult = translatePrismaError(error);
    if (prismaResult.mapped) {
      return NextResponse.json(
        { message: prismaResult.message },
        { status: prismaResult.status }
      );
    }
    log.error("Error listing venues:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/crm/venues
 * Create a new venue via Manifest runtime.
 */
export async function POST(request: NextRequest) {
  const user = await resolveCurrentUser(request);
  const rawBody = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  return runManifestCommand({
    entity: "Venue",
    command: "create",
    body: rawBody,
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });
}
