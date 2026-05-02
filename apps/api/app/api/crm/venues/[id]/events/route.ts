/**
 * Venue Events API
 *
 * GET /api/crm/venues/[id]/events
 *   - List the event history for a single venue (most recent first).
 *   - Query: ?status=<event-status>  optional
 *           ?limit=<n>               default 50, max 100
 *           ?offset=<n>              default 0
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { InvariantError, invariant } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { translatePrismaError } from "@/lib/prisma-error";

export async function GET(
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

    // Verify venue exists for tenant — gives us a clean 404 instead of an
    // empty list for a typo'd venue id.
    const venue = await database.venue.findFirst({
      where: {
        AND: [{ tenantId }, { id }, { deletedAt: null }],
      },
      select: { id: true },
    });

    if (!venue) {
      return NextResponse.json({ message: "Venue not found" }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const limitParam = searchParams.get("limit");
    const offsetParam = searchParams.get("offset");

    const limit = limitParam
      ? Math.min(100, Math.max(1, Number.parseInt(limitParam, 10) || 50))
      : 50;
    const offset = offsetParam
      ? Math.max(0, Number.parseInt(offsetParam, 10) || 0)
      : 0;

    const andClauses: Record<string, unknown>[] = [
      { tenantId },
      { venueEntityId: id },
      { deletedAt: null },
    ];
    if (status) {
      andClauses.push({ status });
    }

    const whereClause = { AND: andClauses };

    const [events, total] = await Promise.all([
      database.event.findMany({
        where: whereClause,
        orderBy: [{ eventDate: "desc" }],
        take: limit,
        skip: offset,
      }),
      database.event.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      data: events,
      pagination: {
        limit,
        offset,
        total,
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
    console.error("Error listing venue events:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
