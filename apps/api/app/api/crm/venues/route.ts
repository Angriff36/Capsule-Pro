/**
 * Venues API Endpoints
 *
 * GET  /api/crm/venues  - List venues with filters and pagination
 * POST /api/crm/venues  - Create a new venue
 *
 * Mirrors apps/app/app/(authenticated)/crm/venues/actions.ts. Uses direct
 * Prisma writes because Venue does not yet have a manifest command surface.
 */

import { auth } from "@repo/auth/server";
import { Prisma, database } from "@repo/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { translatePrismaError } from "@/lib/prisma-error";
import {
  parsePaginationParams,
  parseVenueListFilters,
  validateCreateVenueRequest,
} from "./validation";

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
    console.error("Error listing venues:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/crm/venues
 */
export async function POST(request: NextRequest) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const body = await request.json();
    validateCreateVenueRequest(body);

    const venue = await database.venue.create({
      data: {
        tenantId,
        name: body.name,
        venueType: body.venueType ?? "other",
        addressLine1: body.addressLine1,
        addressLine2: body.addressLine2,
        city: body.city,
        stateProvince: body.stateProvince,
        postalCode: body.postalCode,
        countryCode: body.countryCode,
        capacity: body.capacity ?? 0,
        contactName: body.contactName,
        contactPhone: body.contactPhone,
        contactEmail: body.contactEmail,
        equipmentList:
          body.equipmentList === undefined
            ? Prisma.JsonNull
            : (body.equipmentList as Prisma.InputJsonValue),
        preferredVendors:
          body.preferredVendors === undefined
            ? Prisma.JsonNull
            : (body.preferredVendors as Prisma.InputJsonValue),
        accessNotes: body.accessNotes,
        cateringNotes: body.cateringNotes,
        layoutImageUrl: body.layoutImageUrl,
        isActive: body.isActive ?? true,
        tags: body.tags ?? [],
      },
    });

    return NextResponse.json({ data: venue }, { status: 201 });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { message: "Invalid JSON body" },
        { status: 400 }
      );
    }
    const prismaResult = translatePrismaError(error);
    if (prismaResult.mapped) {
      return NextResponse.json(
        { message: prismaResult.message },
        { status: prismaResult.status }
      );
    }
    console.error("Error creating venue:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
