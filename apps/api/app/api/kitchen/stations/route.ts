/**
 * @module StationsAPI
 * @intent List stations with pagination and filtering
 * @responsibility Provide paginated list of stations for the current tenant
 * @domain Kitchen
 * @tags stations, api, list
 * @canonical true
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getTenantIdForOrg } from "@/app/lib/tenant";

interface StationListFilters {
  stationType?: string;
  locationId?: string;
  isActive?: boolean;
  search?: string;
}

interface PaginationParams {
  page: number;
  limit: number;
}

/**
 * Parse and validate station list filters from URL search params
 */
function parseStationFilters(
  searchParams: URLSearchParams
): StationListFilters {
  const filters: StationListFilters = {};

  const stationType = searchParams.get("stationType");
  if (stationType) {
    filters.stationType = stationType;
  }

  const locationId = searchParams.get("locationId");
  if (locationId) {
    filters.locationId = locationId;
  }

  const isActive = searchParams.get("isActive");
  if (isActive) {
    filters.isActive = isActive === "true";
  }

  const search = searchParams.get("search");
  if (search) {
    filters.search = search;
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
 * GET /api/kitchen/stations
 * List stations with pagination and filters
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
    const filters = parseStationFilters(searchParams);
    const { page, limit } = parsePaginationParams(searchParams);
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause: Record<string, unknown> = {
      AND: [{ tenantId }, { deletedAt: null }],
    };

    // Add station type filter
    if (filters.stationType) {
      whereClause.AND = [
        ...(whereClause.AND as Record<string, unknown>[]),
        { stationType: filters.stationType },
      ];
    }

    // Add location filter
    if (filters.locationId) {
      whereClause.AND = [
        ...(whereClause.AND as Record<string, unknown>[]),
        { locationId: filters.locationId },
      ];
    }

    // Add search filter (searches in name)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      whereClause.AND = [
        ...(whereClause.AND as Record<string, unknown>[]),
        { name: { contains: searchLower, mode: "insensitive" } },
      ];
    }

    // Add active filter
    if (filters.isActive !== undefined) {
      whereClause.AND = [
        ...(whereClause.AND as Record<string, unknown>[]),
        { isActive: filters.isActive },
      ];
    }

    // Fetch stations
    const stations = await database.station.findMany({
      where: whereClause,
      select: {
        id: true,
        locationId: true,
        name: true,
        stationType: true,
        capacitySimultaneousTasks: true,
        equipmentList: true,
        isActive: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ name: "asc" }],
      take: limit,
      skip: offset,
    });

    // Get total count for pagination
    const totalCount = await database.station.count({
      where: whereClause,
    });

    const totalPages = Math.ceil(totalCount / limit);

    // For each station, get the count of incomplete prep list items
    const data = await Promise.all(
      stations.map(async (station) => {
        const taskCount = await database.prepListItem.count({
          where: {
            tenantId,
            stationId: station.id,
            isCompleted: false,
            deletedAt: null,
          },
        });
        return {
          ...station,
          currentTaskCount: taskCount,
        };
      })
    );

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
      },
    });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
