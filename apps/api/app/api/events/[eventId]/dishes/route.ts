import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { InvariantError, invariant } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";

/**
 * GET /api/events/[eventId]/dishes
 * List all dishes for a specific event
 */
export async function GET(
  _request: NextRequest,
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

    // Validate event exists
    const event = await database.event.findFirst({
      where: {
        AND: [{ tenantId }, { id: eventId }, { deletedAt: null }],
      },
    });

    if (!event) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 });
    }

    const dishes = await database.eventDish.findMany({
      where: {
        tenantId,
        eventId,
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ dishes });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    log.error("Error listing event dishes:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
