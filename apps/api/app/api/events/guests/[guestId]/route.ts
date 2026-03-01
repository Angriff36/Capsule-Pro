import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { executeManifestCommand } from "@/lib/manifest-command-handler";

type Params = Promise<{ guestId: string }>;

/**
 * GET /api/events/guests/[guestId]
 * Get a single guest by ID
 */
export async function GET(_request: Request, { params }: { params: Params }) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { guestId } = await params;

  const guest = await database.eventGuest.findFirst({
    where: {
      AND: [{ tenantId }, { id: guestId }, { deletedAt: null }],
    },
  });

  if (!guest) {
    return NextResponse.json({ message: "Guest not found" }, { status: 404 });
  }

  return NextResponse.json({ guest });
}

/**
 * PUT /api/events/guests/[guestId]
 * Update a guest via manifest runtime
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Params }
) {
  const { guestId } = await params;
  return executeManifestCommand(request, {
    entityName: "EventGuest",
    commandName: "update",
    params: { id: guestId },
    transformBody: (body, ctx) => ({
      ...body,
      id: guestId,
      tenantId: ctx.tenantId,
    }),
  });
}

/**
 * DELETE /api/events/guests/[guestId]
 * Soft delete a guest via manifest runtime
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Params }
) {
  const { guestId } = await params;
  return executeManifestCommand(request, {
    entityName: "EventGuest",
    commandName: "softDelete",
    params: { id: guestId },
    transformBody: (_body, ctx) => ({
      id: guestId,
      tenantId: ctx.tenantId,
    }),
  });
}
