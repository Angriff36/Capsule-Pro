import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { InvariantError, invariant } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { executeManifestCommand } from "@/lib/manifest-command-handler";

/**
 * GET /api/events/[eventId]/guests
 * List all guests for a specific event with pagination
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    invariant(eventId, "params.eventId must exist");

    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { searchParams } = new URL(request.url);

    // Validate event exists
    const event = await database.event.findFirst({
      where: {
        AND: [{ tenantId }, { id: eventId }, { deletedAt: null }],
      },
    });

    if (!event) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 });
    }

    // Pagination parameters
    const limit = Number.parseInt(searchParams.get("limit") || "100", 10);
    const offset = Number.parseInt(searchParams.get("offset") || "0", 10);

    // Filter by guest name if provided
    const guestName = searchParams.get("guestName");

    const guests = await database.eventGuest.findMany({
      where: {
        AND: [
          { tenantId },
          { eventId },
          { deletedAt: null },
          ...(guestName ? [{ guestName: { contains: guestName } }] : []),
        ],
      },
      orderBy: { guestName: "asc" },
      take: limit,
      skip: offset,
    });

    // Get total count for pagination
    const totalCount = await database.eventGuest.count({
      where: {
        AND: [
          { tenantId },
          { eventId },
          { deletedAt: null },
          ...(guestName ? [{ guestName: { contains: guestName } }] : []),
        ],
      },
    });

    return NextResponse.json({
      guests,
      pagination: {
        limit,
        offset,
        total: totalCount,
      },
    });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Error listing guests:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/events/[eventId]/guests
 * Add a new guest to an event via manifest runtime
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  return executeManifestCommand(request, {
    entityName: "EventGuest",
    commandName: "create",
    params: { eventId },
    transformBody: (body, ctx) => ({
      ...body,
      eventId,
      tenantId: ctx.tenantId,
    }),
  });
}
