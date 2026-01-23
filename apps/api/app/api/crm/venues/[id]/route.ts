/**
 * Single Venue CRUD API Endpoints
 *
 * GET    /api/crm/venues/[id]  - Get venue details
 * PUT    /api/crm/venues/[id]  - Update venue
 * DELETE /api/crm/venues/[id]  - Soft delete venue
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { InvariantError, invariant } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { Prisma } from "@repo/database";
import type { UpdateVenueRequest } from "../types";
import { validateUpdateVenueRequest } from "../validation";

/**
 * GET /api/crm/venues/[id]
 * Get venue details with event history
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    invariant(id, "params.id must exist");

    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);

    // Get venue
    const venue = await database.venue.findFirst({
      where: {
        AND: [{ tenantId }, { id }, { deletedAt: null }],
      },
    });

    if (!venue) {
      return NextResponse.json({ message: "Venue not found" }, { status: 404 });
    }

    // Get event count for this venue
    const eventCount = await database.event.count({
      where: {
        AND: [{ tenantId }, { venueId: id }, { deletedAt: null }],
      },
    });

    // Get upcoming events at this venue
    const upcomingEvents = await database.event.findMany({
      where: {
        AND: [
          { tenantId },
          { venueId: id },
          { deletedAt: null },
          { eventDate: { gte: new Date() } },
        ],
      },
      orderBy: [{ eventDate: "asc" }],
      take: 5,
      select: {
        id: true,
        title: true,
        eventDate: true,
        guestCount: true,
        status: true,
      },
    });

    return NextResponse.json({
      data: {
        ...venue,
        eventCount,
        upcomingEvents,
      },
    });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Error getting venue:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/crm/venues/[id]
 * Update venue
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    invariant(id, "params.id must exist");

    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const body = await request.json();

    // Validate request body
    validateUpdateVenueRequest(body);

    // Check if venue exists
    const existingVenue = await database.venue.findFirst({
      where: {
        AND: [{ tenantId }, { id }, { deletedAt: null }],
      },
    });

    if (!existingVenue) {
      return NextResponse.json({ message: "Venue not found" }, { status: 404 });
    }

    const data = body as UpdateVenueRequest;

    // Check for duplicate name (if changing name)
    if (
      data.name &&
      data.name.trim() &&
      data.name.trim().toLowerCase() !== existingVenue.name.toLowerCase()
    ) {
      const duplicateVenue = await database.venue.findFirst({
        where: {
          AND: [
            { tenantId },
            { name: { equals: data.name.trim(), mode: "insensitive" } },
            { deletedAt: null },
            { id: { not: id } },
          ],
        },
      });

      if (duplicateVenue) {
        return NextResponse.json(
          { message: "A venue with this name already exists" },
          { status: 409 }
        );
      }
    }

    // Update venue
    const updatedVenue = await database.venue.update({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.venueType !== undefined && { venueType: data.venueType }),
        ...(data.addressLine1 !== undefined && {
          addressLine1: data.addressLine1?.trim() || null,
        }),
        ...(data.addressLine2 !== undefined && {
          addressLine2: data.addressLine2?.trim() || null,
        }),
        ...(data.city !== undefined && { city: data.city?.trim() || null }),
        ...(data.stateProvince !== undefined && {
          stateProvince: data.stateProvince?.trim() || null,
        }),
        ...(data.postalCode !== undefined && {
          postalCode: data.postalCode?.trim() || null,
        }),
        ...(data.countryCode !== undefined && {
          countryCode: data.countryCode?.trim().toUpperCase() || null,
        }),
        ...(data.capacity !== undefined && { capacity: data.capacity }),
        ...(data.contactName !== undefined && {
          contactName: data.contactName?.trim() || null,
        }),
        ...(data.contactPhone !== undefined && {
          contactPhone: data.contactPhone?.trim() || null,
        }),
        ...(data.contactEmail !== undefined && {
          contactEmail: data.contactEmail?.trim().toLowerCase() || null,
        }),
        ...(data.equipmentList !== undefined && {
          equipmentList:
            data.equipmentList === null
              ? Prisma.JsonNull
              : (data.equipmentList as Prisma.InputJsonValue),
        }),
        ...(data.preferredVendors !== undefined && {
          preferredVendors:
            data.preferredVendors === null
              ? Prisma.JsonNull
              : (data.preferredVendors as Prisma.InputJsonValue),
        }),
        ...(data.accessNotes !== undefined && {
          accessNotes: data.accessNotes?.trim() || null,
        }),
        ...(data.cateringNotes !== undefined && {
          cateringNotes: data.cateringNotes?.trim() || null,
        }),
        ...(data.layoutImageUrl !== undefined && {
          layoutImageUrl: data.layoutImageUrl?.trim() || null,
        }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.tags !== undefined && { tags: data.tags }),
      },
    });

    return NextResponse.json({ data: updatedVenue });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Error updating venue:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/crm/venues/[id]
 * Soft delete venue
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    invariant(id, "params.id must exist");

    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);

    // Check if venue exists
    const existingVenue = await database.venue.findFirst({
      where: {
        AND: [{ tenantId }, { id }, { deletedAt: null }],
      },
    });

    if (!existingVenue) {
      return NextResponse.json({ message: "Venue not found" }, { status: 404 });
    }

    // Check for active events (not completed/cancelled) at this venue
    const activeEvents = await database.event.count({
      where: {
        AND: [
          { tenantId },
          { venueId: id },
          { deletedAt: null },
          { status: { notIn: ["completed", "cancelled"] } },
        ],
      },
    });

    if (activeEvents > 0) {
      return NextResponse.json(
        {
          message: `Cannot delete venue with ${activeEvents} active event(s). Please cancel or complete the events first.`,
        },
        { status: 409 }
      );
    }

    // Soft delete venue
    await database.venue.update({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
      data: {
        deletedAt: new Date(),
      },
    });

    return NextResponse.json({ message: "Venue deleted successfully" });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Error deleting venue:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
