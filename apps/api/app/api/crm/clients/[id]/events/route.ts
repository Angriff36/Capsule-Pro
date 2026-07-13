/**
 * Client Event History API Endpoints
 *
 * GET /api/crm/clients/[id]/events - Get client's event history
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { InvariantError, invariant } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { clampLimit, clampOffset } from "@/lib/pagination";

/**
 * GET /api/crm/clients/[id]/events
 * Get event history for a client
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
    const { searchParams } = new URL(request.url);

    // Pagination
    const limit = clampLimit(searchParams.get("limit"));
    const offset = clampOffset(searchParams.get("offset"));

    // Verify client exists
    const client = await database.client.findFirst({
      where: {
        AND: [{ tenantId }, { id }, { deletedAt: null }],
      },
    });

    if (!client) {
      return NextResponse.json(
        { message: "Client not found" },
        { status: 404 }
      );
    }

    // Fetch page + total count in parallel (independent reads, identical
    // where) — collapses 2 serial round-trips into 1 batch (#23).
    const eventsWhere = {
      AND: [{ tenantId }, { clientId: id }, { deletedAt: null }],
    };
    const [events, totalCount] = await Promise.all([
      database.event.findMany({
        where: eventsWhere,
        select: {
          id: true,
          title: true,
          eventDate: true,
          status: true,
          guestCount: true,
          eventType: true,
          venueName: true,
          createdAt: true,
        },
        orderBy: [{ eventDate: "desc" }],
        take: limit,
        skip: offset,
      }),
      database.event.count({ where: eventsWhere }),
    ]);

    return NextResponse.json({
      data: events,
      pagination: {
        limit,
        offset,
        total: totalCount,
      },
    });
  } catch (error) {
    captureException(error);
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    log.error("Error listing client events:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
