import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { InvariantError, invariant } from "@/app/lib/invariant";
import { getTenantIdForOrg, resolveCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";
import { clampLimit, clampOffset, MAX_LIMIT } from "@/lib/pagination";

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

    // Validate event exists (pure existence check — `event` is only read in the
    // `!event` 404 guard below; select { id } avoids materializing all columns).
    const event = await database.event.findFirst({
      where: {
        AND: [{ tenantId }, { id: eventId }, { deletedAt: null }],
      },
      select: { id: true },
    });

    if (!event) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 });
    }

    // Pagination parameters
    const limit = clampLimit(searchParams.get("limit"), MAX_LIMIT, 100);
    const offset = clampOffset(searchParams.get("offset"));

    // Filter by guest name if provided
    const guestName = searchParams.get("guestName");

    // Fetch guests + total count in parallel (independent reads, same where)
    // — collapses 2 serial round-trips into 1 concurrent batch (#23).
    const [guests, totalCount] = await Promise.all([
      database.eventGuest.findMany({
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
      }),
      database.eventGuest.count({
        where: {
          AND: [
            { tenantId },
            { eventId },
            { deletedAt: null },
            ...(guestName ? [{ guestName: { contains: guestName } }] : []),
          ],
        },
      }),
    ]);

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
    log.error("Error listing guests:", error);
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
  const user = await resolveCurrentUser(request);
  const rawBody = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  return runManifestCommand({
    entity: "EventGuest",
    command: "create",
    body: {
      ...rawBody,
      eventId,
      tenantId: user.tenantId,
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });
}
