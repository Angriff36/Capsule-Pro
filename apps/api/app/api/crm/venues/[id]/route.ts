/**
 * Single Venue API Endpoints
 *
 * GET    /api/crm/venues/[id]  - Get venue details with event count
 * PUT    /api/crm/venues/[id]  - Update venue
 * DELETE /api/crm/venues/[id]  - Soft-delete venue (blocked when active events exist)
 */

import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { log } from "@repo/observability/log";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { InvariantError, invariant } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { translatePrismaError } from "@/lib/prisma-error";
import { validateUpdateVenueRequest } from "../validation";

/**
 * GET /api/crm/venues/[id]
 */
export async function GET(
  _request: Request,
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

    const venue = await database.venue.findFirst({
      where: {
        AND: [{ tenantId }, { id }, { deletedAt: null }],
      },
    });

    if (!venue) {
      return NextResponse.json({ message: "Venue not found" }, { status: 404 });
    }

    const eventCount = await database.event.count({
      where: {
        AND: [{ tenantId }, { venueEntityId: id }, { deletedAt: null }],
      },
    });

    return NextResponse.json({
      data: {
        ...venue,
        eventCount,
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
    log.error("Error getting venue:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/crm/venues/[id]
 */
export async function PUT(
  request: NextRequest,
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
    validateUpdateVenueRequest(body);

    // Verify venue exists for this tenant
    const existing = await database.venue.findFirst({
      where: {
        AND: [{ tenantId }, { id }, { deletedAt: null }],
      },
    });

    if (!existing) {
      return NextResponse.json({ message: "Venue not found" }, { status: 404 });
    }

    const venue = await database.venue.update({
      where: { tenantId_id: { tenantId, id } },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.venueType !== undefined && { venueType: body.venueType }),
        ...(body.addressLine1 !== undefined && {
          addressLine1: body.addressLine1,
        }),
        ...(body.addressLine2 !== undefined && {
          addressLine2: body.addressLine2,
        }),
        ...(body.city !== undefined && { city: body.city }),
        ...(body.stateProvince !== undefined && {
          stateProvince: body.stateProvince,
        }),
        ...(body.postalCode !== undefined && { postalCode: body.postalCode }),
        ...(body.countryCode !== undefined && {
          countryCode: body.countryCode,
        }),
        ...(body.capacity !== undefined && { capacity: body.capacity }),
        ...(body.contactName !== undefined && {
          contactName: body.contactName,
        }),
        ...(body.contactPhone !== undefined && {
          contactPhone: body.contactPhone,
        }),
        ...(body.contactEmail !== undefined && {
          contactEmail: body.contactEmail,
        }),
        ...(body.equipmentList !== undefined && {
          equipmentList:
            body.equipmentList === null
              ? Prisma.JsonNull
              : (body.equipmentList as Prisma.InputJsonValue),
        }),
        ...(body.preferredVendors !== undefined && {
          preferredVendors:
            body.preferredVendors === null
              ? Prisma.JsonNull
              : (body.preferredVendors as Prisma.InputJsonValue),
        }),
        ...(body.accessNotes !== undefined && {
          accessNotes: body.accessNotes,
        }),
        ...(body.cateringNotes !== undefined && {
          cateringNotes: body.cateringNotes,
        }),
        ...(body.layoutImageUrl !== undefined && {
          layoutImageUrl: body.layoutImageUrl,
        }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.tags !== undefined && { tags: body.tags }),
      },
    });

    return NextResponse.json({ data: venue });
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
    log.error("Error updating venue:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/crm/venues/[id]
 *
 * Soft-delete. Blocked when there are linked active events
 * (status in confirmed/pending) — venues cannot be removed while
 * active bookings reference them.
 */
export async function DELETE(
  _request: NextRequest,
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

    const existing = await database.venue.findFirst({
      where: {
        AND: [{ tenantId }, { id }, { deletedAt: null }],
      },
    });

    if (!existing) {
      return NextResponse.json({ message: "Venue not found" }, { status: 404 });
    }

    const activeEvents = await database.event.count({
      where: {
        AND: [
          { tenantId },
          { venueEntityId: id },
          { deletedAt: null },
          { status: { in: ["confirmed", "pending"] } },
        ],
      },
    });

    if (activeEvents > 0) {
      return NextResponse.json(
        {
          message:
            "Cannot delete venue with linked active events. Reassign or complete the events first.",
          activeEvents,
        },
        { status: 409 }
      );
    }

    await database.venue.update({
      where: { tenantId_id: { tenantId, id } },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ data: { success: true } });
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
    log.error("Error deleting venue:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
