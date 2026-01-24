/**
 * Individual Client Interaction API Endpoints
 *
 * PUT    /api/crm/clients/[id]/interactions/[interactionId] - Update interaction
 * DELETE /api/crm/clients/[id]/interactions/[interactionId] - Delete interaction
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PUT = PUT;
exports.DELETE = DELETE;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const invariant_1 = require("@/app/lib/invariant");
const tenant_1 = require("@/app/lib/tenant");
const validation_1 = require("../../../validation");
/**
 * PUT /api/crm/clients/[id]/interactions/[interactionId]
 * Update a specific interaction
 */
async function PUT(request, { params }) {
  try {
    const { id, interactionId } = await params;
    (0, invariant_1.invariant)(id, "params.id must exist");
    (0, invariant_1.invariant)(
      interactionId,
      "params.interactionId must exist"
    );
    const { orgId } = await (0, server_1.auth)();
    if (!orgId) {
      return server_2.NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
    const body = await request.json();
    // Validate request body
    (0, validation_1.validateUpdateClientInteractionRequest)(body);
    const data = body;
    // Verify client exists
    const client = await database_1.database.client.findFirst({
      where: {
        AND: [{ tenantId }, { id }, { deletedAt: null }],
      },
    });
    if (!client) {
      return server_2.NextResponse.json(
        { message: "Client not found" },
        { status: 404 }
      );
    }
    // Verify interaction exists and belongs to this client
    const existingInteraction =
      await database_1.database.clientInteraction.findFirst({
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
      return server_2.NextResponse.json(
        { message: "Interaction not found" },
        { status: 404 }
      );
    }
    // Build update data with only provided fields
    const updateData = {};
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
    const interaction = await database_1.database.clientInteraction.update({
      where: {
        tenantId_id: { tenantId, id: interactionId },
      },
      data: updateData,
    });
    return server_2.NextResponse.json({ data: interaction });
  } catch (error) {
    if (error instanceof invariant_1.InvariantError) {
      return server_2.NextResponse.json(
        { message: error.message },
        { status: 400 }
      );
    }
    console.error("Error updating client interaction:", error);
    return server_2.NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
/**
 * DELETE /api/crm/clients/[id]/interactions/[interactionId]
 * Soft delete a specific interaction
 */
async function DELETE(_request, { params }) {
  try {
    const { id, interactionId } = await params;
    (0, invariant_1.invariant)(id, "params.id must exist");
    (0, invariant_1.invariant)(
      interactionId,
      "params.interactionId must exist"
    );
    const { orgId } = await (0, server_1.auth)();
    if (!orgId) {
      return server_2.NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
    // Verify client exists
    const client = await database_1.database.client.findFirst({
      where: {
        AND: [{ tenantId }, { id }, { deletedAt: null }],
      },
    });
    if (!client) {
      return server_2.NextResponse.json(
        { message: "Client not found" },
        { status: 404 }
      );
    }
    // Verify interaction exists and belongs to this client
    const existingInteraction =
      await database_1.database.clientInteraction.findFirst({
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
      return server_2.NextResponse.json(
        { message: "Interaction not found" },
        { status: 404 }
      );
    }
    // Soft delete interaction
    await database_1.database.clientInteraction.update({
      where: {
        tenantId_id: { tenantId, id: interactionId },
      },
      data: { deletedAt: new Date() },
    });
    return server_2.NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof invariant_1.InvariantError) {
      return server_2.NextResponse.json(
        { message: error.message },
        { status: 400 }
      );
    }
    console.error("Error deleting client interaction:", error);
    return server_2.NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
