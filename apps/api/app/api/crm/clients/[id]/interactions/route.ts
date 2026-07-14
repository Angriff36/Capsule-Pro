/**
 * Client Interactions (Communication Log) API Endpoints
 *
 * GET  /api/crm/clients/[id]/interactions - Get client communication timeline
 * POST /api/crm/clients/[id]/interactions - Log a new interaction
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { InvariantError, invariant } from "@/app/lib/invariant";
import { getTenantIdForOrg, resolveCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";
import { clampLimit, clampOffset } from "@/lib/pagination";

/**
 * GET /api/crm/clients/[id]/interactions
 * Get communication timeline for a client
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

    // Verify client exists (pure existence check — `client` is only read in the
    // `!client` 404 guard below; select { id } avoids materializing all columns).
    const client = await database.client.findFirst({
      where: {
        AND: [{ tenantId }, { id }, { deletedAt: null }],
      },
      select: { id: true },
    });

    if (!client) {
      return NextResponse.json(
        { message: "Client not found" },
        { status: 404 }
      );
    }

    // Fetch page + total count in parallel (independent reads, identical
    // where) — collapses 2 serial round-trips into 1 batch (#23).
    const interactionsWhere = {
      AND: [{ tenantId }, { clientId: id }, { deletedAt: null }],
    };
    const [interactions, totalCount] = await Promise.all([
      database.clientInteraction.findMany({
        where: interactionsWhere,
        orderBy: [{ interactionDate: "desc" }],
        take: limit,
        skip: offset,
      }),
      database.clientInteraction.count({ where: interactionsWhere }),
    ]);

    return NextResponse.json({
      data: interactions,
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
    log.error("Error listing client interactions:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/crm/clients/[id]/interactions
 * Log a new interaction with a client via manifest command
 */
export async function POST(
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
    entity: "ClientInteraction",
    command: "create",
    body: { ...rawBody, clientId: id },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });
}
