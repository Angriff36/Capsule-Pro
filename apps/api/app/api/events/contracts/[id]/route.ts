import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { InvariantError, invariant } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { executeManifestCommand } from "@/lib/manifest-command-handler";

type Params = Promise<{ id: string }>;

/**
 * GET /api/events/contracts/[id]
 * Get a single contract by ID with event and client details
 */
export async function GET(_request: Request, { params }: { params: Params }) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { id } = await params;
    invariant(id, "Contract ID is required");

    // Validate contract exists and belongs to tenant
    const contract = await database.eventContract.findFirst({
      where: {
        AND: [{ tenantId }, { id }, { deletedAt: null }],
      },
    });

    if (!contract) {
      return NextResponse.json(
        { message: "Contract not found" },
        { status: 404 }
      );
    }

    // Fetch event details
    const event = await database.event.findFirst({
      where: {
        AND: [{ tenantId }, { id: contract.eventId }, { deletedAt: null }],
      },
      select: {
        id: true,
        title: true,
        eventDate: true,
      },
    });

    // Fetch client details
    const client = await database.client.findFirst({
      where: {
        AND: [{ tenantId }, { id: contract.clientId }, { deletedAt: null }],
      },
      select: {
        id: true,
        company_name: true,
        first_name: true,
        last_name: true,
      },
    });

    return NextResponse.json({
      contract: {
        ...contract,
        event,
        client,
      },
    });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Error fetching contract:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/events/contracts/[id]
 * Update a contract via manifest runtime
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Params }
) {
  const { id } = await params;
  return executeManifestCommand(request, {
    entityName: "EventContract",
    commandName: "update",
    params: { id },
    transformBody: (body, ctx) => ({
      ...body,
      id,
      tenantId: ctx.tenantId,
    }),
  });
}

/**
 * DELETE /api/events/contracts/[id]
 * Soft delete a contract via manifest runtime
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Params }
) {
  const { id } = await params;
  return executeManifestCommand(request, {
    entityName: "EventContract",
    commandName: "softDelete",
    params: { id },
    transformBody: (_body, ctx) => ({
      id,
      tenantId: ctx.tenantId,
    }),
  });
}
