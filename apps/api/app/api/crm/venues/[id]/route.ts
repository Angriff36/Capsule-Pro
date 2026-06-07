/**
 * Single Venue API Endpoints
 *
 * GET    /api/crm/venues/[id]  - Get venue details with event count
 * PUT    /api/crm/venues/[id]  - Update venue (via Manifest runtime)
 * DELETE /api/crm/venues/[id]  - Soft-delete venue via Manifest deactivate
 *                                (blocked when active events exist)
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
 * Update venue via Manifest runtime.
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const user = await resolveCurrentUser(request);
  const rawBody = await request.json().catch(() => ({})) as Record<string, unknown>;
  return runManifestCommand({
    entity: "Venue",
    command: "update",
    body: { ...rawBody, id },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });
}

/**
 * DELETE /api/crm/venues/[id]
 *
 * Soft-delete via Manifest deactivate. Blocked when there are linked
 * active events (status in confirmed/pending) — venues cannot be removed
 * while active bookings reference them. The active-events check is kept as
 * a pre-validation guard that returns 409 before delegating to Manifest.
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const user = await resolveCurrentUser(request);

  // Pre-validation: block if active events reference this venue
  const activeEvents = await database.event.count({
    where: {
      AND: [
        { tenantId: user.tenantId },
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

  return runManifestCommand({
    entity: "Venue",
    command: "deactivate",
    body: { id },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });
}
