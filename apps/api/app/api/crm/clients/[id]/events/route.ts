/**
 * Client Event History API Endpoints
 *
 * GET /api/crm/clients/[id]/events - Get client's event history
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { InvariantError, invariant } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";

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
    const limit = Number.parseInt(searchParams.get("limit") || "50", 10);
    const offset = Number.parseInt(searchParams.get("offset") || "0", 10);

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

    // Get events from catering_orders
    const events = await database.cateringOrder.findMany({
      where: {
        AND: [{ tenantId }, { clientId: id }, { deletedAt: null }],
      },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            eventDate: true,
            status: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      take: limit,
      skip: offset,
    });

    // Get total count
    const totalCount = await database.cateringOrder.count({
      where: {
        AND: [{ tenantId }, { clientId: id }, { deletedAt: null }],
      },
    });

    return NextResponse.json({
      data: events,
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
    console.error("Error listing client events:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
