/**
 * Individual Client Interaction API Endpoints
 *
 * PUT    /api/crm/clients/[id]/interactions/[interactionId] - Update interaction
 * DELETE /api/crm/clients/[id]/interactions/[interactionId] - Delete interaction
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { InvariantError, invariant } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import type { UpdateClientInteractionRequest } from "../../../types";
import { validateUpdateClientInteractionRequest } from "../../../validation";

/**
 * PUT /api/crm/clients/[id]/interactions/[interactionId]
 * Update a specific interaction
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; interactionId: string }> }
) {
  try {
    const { id, interactionId } = await params;
    invariant(id, "params.id must exist");
    invariant(interactionId, "params.interactionId must exist");

    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const body = await request.json();

    // Validate request body
    validateUpdateClientInteractionRequest(body);

    const data = body as UpdateClientInteractionRequest;

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

    // Verify interaction exists and belongs to this client
    const existingInteraction = await database.clientInteraction.findFirst({
      where: {
        AND: [
          { tenantId },
          { id: interactionId },
          { clientId: id },
          { deletedAt: null },
        ],
      },
    });

    if (!existingInteraction) {
      return NextResponse.json(
        { message: "Interaction not found" },
        { status: 404 }
      );
    }

    // Build update data with only provided fields
    const updateData: Record<string, unknown> = {};

    if (data.interactionType !== undefined) {
      updateData.interactionType = data.interactionType.trim();
    }
    if (data.subject !== undefined) {
      updateData.subject = data.subject?.trim() || null;
    }
    if (data.description !== undefined) {
      updateData.description = data.description?.trim() || null;
    }
    if (data.followUpDate !== undefined) {
      updateData.followUpDate = data.followUpDate
        ? new Date(data.followUpDate)
        : null;
    }
    if (data.followUpCompleted !== undefined) {
      updateData.followUpCompleted = data.followUpCompleted;
    }

    // Update interaction
    const interaction = await database.clientInteraction.update({
      where: {
        tenantId_id: { tenantId, id: interactionId },
      },
      data: updateData,
    });

    return NextResponse.json({ data: interaction });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Error updating client interaction:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/crm/clients/[id]/interactions/[interactionId]
 * Soft delete a specific interaction
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; interactionId: string }> }
) {
  try {
    const { id, interactionId } = await params;
    invariant(id, "params.id must exist");
    invariant(interactionId, "params.interactionId must exist");

    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);

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

    // Verify interaction exists and belongs to this client
    const existingInteraction = await database.clientInteraction.findFirst({
      where: {
        AND: [
          { tenantId },
          { id: interactionId },
          { clientId: id },
          { deletedAt: null },
        ],
      },
    });

    if (!existingInteraction) {
      return NextResponse.json(
        { message: "Interaction not found" },
        { status: 404 }
      );
    }

    // Soft delete interaction
    await database.clientInteraction.update({
      where: {
        tenantId_id: { tenantId, id: interactionId },
      },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Error deleting client interaction:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
