/**
 * Location Resource Sharing API
 *
 * Allows sharing resources (recipes, menu items, etc.) between locations
 *
 * GET    /api/locations/resources           - List shared resources
 * POST   /api/locations/resources           - Create a resource share
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

interface ResourceShareFilters {
  resourceType?: string;
  locationId?: string;
  shareWithAll?: boolean;
}

/**
 * Parse resource share filters from URL search params
 */
function parseResourceShareFilters(
  searchParams: URLSearchParams
): ResourceShareFilters {
  const filters: ResourceShareFilters = {};

  const resourceType = searchParams.get("resourceType");
  if (resourceType) {
    filters.resourceType = resourceType;
  }

  const locationId = searchParams.get("locationId");
  if (locationId) {
    filters.locationId = locationId;
  }

  const shareWithAll = searchParams.get("shareWithAll");
  if (shareWithAll) {
    filters.shareWithAll = shareWithAll === "true";
  }

  return filters;
}

/**
 * GET /api/locations/resources - List shared resources
 */
export async function GET(request: Request) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json(
        { message: "Tenant not found" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const filters = parseResourceShareFilters(searchParams);

    const whereClause: Record<string, unknown> = {
      AND: [{ tenantId }, { deletedAt: null }, { isActive: true }],
    };

    if (filters.resourceType) {
      whereClause.AND = [
        ...(whereClause.AND as Record<string, unknown>[]),
        { resourceType: filters.resourceType },
      ];
    }

    if (filters.shareWithAll !== undefined) {
      whereClause.AND = [
        ...(whereClause.AND as Record<string, unknown>[]),
        { shareWithAll: filters.shareWithAll },
      ];
    }

    // Filter by location in sharedWithLocationIds
    if (filters.locationId) {
      whereClause.AND = [
        ...(whereClause.AND as Record<string, unknown>[]),
        {
          OR: [
            { shareWithAll: true },
            { sharedWithLocationIds: { has: filters.locationId } },
          ],
        },
      ];
    }

    const shares = await database.locationResourceShare.findMany({
      where: whereClause,
      orderBy: [{ resourceType: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ data: shares });
  } catch (error) {
    captureException(error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/locations/resources - Create a resource share
 *
 * Body:
 * - resourceType: "Recipe" | "MenuItem" | "Dish" | "Equipment" | etc.
 * - resourceId: string
 * - shareWithAll: boolean (default: false)
 * - sharedWithLocationIds: string[] (optional)
 * - canEdit: boolean (default: false)
 * - canFork: boolean (default: true)
 * - notes: string (optional)
 */
export async function POST(request: Request) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json(
        { message: "Tenant not found" },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!(body.resourceType && body.resourceId)) {
      return NextResponse.json(
        { message: "Resource type and ID are required" },
        { status: 400 }
      );
    }

    // Check if share already exists
    const existing = await database.locationResourceShare.findFirst({
      where: {
        tenantId,
        resourceType: body.resourceType,
        resourceId: body.resourceId,
        deletedAt: null,
      },
    });

    if (existing) {
      // Update existing share
      const updated = await database.locationResourceShare.update({
        where: {
          tenantId_id: { tenantId, id: existing.id },
        },
        data: {
          shareWithAll: body.shareWithAll ?? false,
          sharedWithLocationIds: body.sharedWithLocationIds ?? [],
          canEdit: body.canEdit ?? false,
          canFork: body.canFork ?? true,
          notes: body.notes ?? null,
          isActive: true,
        },
      });

      return NextResponse.json({ data: updated }, { status: 200 });
    }

    // Create new share
    const share = await database.locationResourceShare.create({
      data: {
        tenantId,
        resourceType: body.resourceType,
        resourceId: body.resourceId,
        shareWithAll: body.shareWithAll ?? false,
        sharedWithLocationIds: body.sharedWithLocationIds ?? [],
        canEdit: body.canEdit ?? false,
        canFork: body.canFork ?? true,
        notes: body.notes ?? null,
      },
    });

    return NextResponse.json({ data: share }, { status: 201 });
  } catch (error) {
    captureException(error);
    console.error("Failed to create resource share:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
