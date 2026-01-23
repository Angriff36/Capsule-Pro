/**
 * Venue CRUD API Endpoints
 *
 * GET    /api/crm/venues      - List venues with pagination and filters
 * POST   /api/crm/venues      - Create a new venue
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import type { CreateVenueRequest } from "./types";
import {
  parsePaginationParams,
  parseVenueListFilters,
  validateCreateVenueRequest,
} from "./validation";

/**
 * GET /api/crm/venues
 * List venues with pagination, search, and filters
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
    const filters = parseVenueListFilters(searchParams);
    const { page, limit } = parsePaginationParams(searchParams);
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause: Record<string, unknown> = {
      AND: [{ tenantId }, { deletedAt: null }],
    };

    // Add search filter (searches name, city, address)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      whereClause.AND = [
        ...(whereClause.AND as Array<Record<string, unknown>>),
        {
          OR: [
            { name: { contains: searchLower, mode: "insensitive" } },
            { city: { contains: searchLower, mode: "insensitive" } },
            { addressLine1: { contains: searchLower, mode: "insensitive" } },
          ],
        },
      ];
    }

    // Add tag filter
    if (filters.tags && filters.tags.length > 0) {
      whereClause.AND = [
        ...(whereClause.AND as Array<Record<string, unknown>>),
        { tags: { hasSome: filters.tags } },
      ];
    }

    // Add venueType filter
    if (filters.venueType) {
      whereClause.AND = [
        ...(whereClause.AND as Array<Record<string, unknown>>),
        { venueType: filters.venueType },
      ];
    }

    // Add city filter
    if (filters.city) {
      whereClause.AND = [
        ...(whereClause.AND as Array<Record<string, unknown>>),
        { city: { contains: filters.city, mode: "insensitive" } },
      ];
    }

    // Add isActive filter
    if (filters.isActive !== undefined) {
      whereClause.AND = [
        ...(whereClause.AND as Array<Record<string, unknown>>),
        { isActive: filters.isActive },
      ];
    }

    // Add minCapacity filter
    if (filters.minCapacity !== undefined) {
      whereClause.AND = [
        ...(whereClause.AND as Array<Record<string, unknown>>),
        { capacity: { gte: filters.minCapacity } },
      ];
    }

    // Fetch venues
    const venues = await database.venue.findMany({
      where: whereClause,
      orderBy: [{ name: "asc" }],
      take: limit,
      skip: offset,
    });

    // Get total count for pagination
    const totalCount = await database.venue.count({
      where: whereClause,
    });

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      data: venues,
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
    console.error("Error listing venues:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/crm/venues
 * Create a new venue
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
    validateCreateVenueRequest(body);

    const data = body as CreateVenueRequest;

    // Check for duplicate venue name (case-insensitive)
    const existingVenue = await database.venue.findFirst({
      where: {
        AND: [
          { tenantId },
          { name: { equals: data.name.trim(), mode: "insensitive" } },
          { deletedAt: null },
        ],
      },
    });

    if (existingVenue) {
      return NextResponse.json(
        { message: "A venue with this name already exists" },
        { status: 409 }
      );
    }

    // Create venue
    const venue = await database.venue.create({
      data: {
        tenantId,
        name: data.name.trim(),
        venueType: data.venueType || null,
        addressLine1: data.addressLine1?.trim() || null,
        addressLine2: data.addressLine2?.trim() || null,
        city: data.city?.trim() || null,
        stateProvince: data.stateProvince?.trim() || null,
        postalCode: data.postalCode?.trim() || null,
        countryCode: data.countryCode?.trim().toUpperCase() || null,
        capacity: data.capacity || null,
        contactName: data.contactName?.trim() || null,
        contactPhone: data.contactPhone?.trim() || null,
        contactEmail: data.contactEmail?.trim().toLowerCase() || null,
        equipmentList: data.equipmentList || [],
        preferredVendors: data.preferredVendors || {},
        accessNotes: data.accessNotes?.trim() || null,
        cateringNotes: data.cateringNotes?.trim() || null,
        layoutImageUrl: data.layoutImageUrl?.trim() || null,
        isActive: data.isActive ?? true,
        tags: data.tags || [],
      },
    });

    return NextResponse.json({ data: venue }, { status: 201 });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Error creating venue:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
