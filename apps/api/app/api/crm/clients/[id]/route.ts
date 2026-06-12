/**
 * Single Client CRUD API Endpoints
 *
 * GET    /api/crm/clients/[id]  - Get client details
 * PUT    /api/crm/clients/[id]  - Update client (via manifest command)
 * DELETE /api/crm/clients/[id]  - Archive client (via manifest command)
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { InvariantError, invariant } from "@/app/lib/invariant";
import { getTenantIdForOrg, resolveCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";
import { translatePrismaError } from "@/lib/prisma-error";

/**
 * GET /api/crm/clients/[id]
 * Get client details with contacts, preferences, and stats
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

    // Get client with related data
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

    // Get contacts
    const contacts = await database.clientContact.findMany({
      where: {
        AND: [{ tenantId }, { clientId: id }, { deletedAt: null }],
      },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    });

    // Get preferences
    const preferences = await database.clientPreference.findMany({
      where: {
        AND: [{ tenantId }, { clientId: id }, { deletedAt: null }],
      },
      orderBy: [{ preferenceType: "asc" }, { preferenceKey: "asc" }],
    });

    // Get interaction count
    const interactionCount = await database.clientInteraction.count({
      where: {
        AND: [{ tenantId }, { clientId: id }, { deletedAt: null }],
      },
    });

    // Get event count (from events in tenant_events)
    const eventCount = await database.event.count({
      where: {
        AND: [{ tenantId }, { clientId: id }, { deletedAt: null }],
      },
    });

    // Get total revenue (sum of catering order totals)
    const revenueResult = await database.cateringOrder.aggregate({
      where: {
        AND: [{ tenantId }, { customer_id: id }, { deletedAt: null }],
      },
      _sum: {
        totalAmount: true,
      },
    });

    const totalRevenue = revenueResult._sum.totalAmount;

    return NextResponse.json({
      data: {
        ...client,
        contacts,
        preferences,
        interactionCount,
        eventCount,
        totalRevenue: totalRevenue ? { total: totalRevenue.toString() } : null,
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
    log.error("Error getting client:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/crm/clients/[id]
 * Update client via manifest command
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const user = await resolveCurrentUser(request);
  const rawBody = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  return runManifestCommand({
    entity: "Client",
    command: "update",
    body: { ...rawBody, id },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });
}

/**
 * DELETE /api/crm/clients/[id]
 * Archive client via manifest command
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const user = await resolveCurrentUser(request);
  return runManifestCommand({
    entity: "Client",
    command: "archive",
    body: { id },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });
}
