Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.PUT = PUT;
exports.DELETE = DELETE;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const invariant_1 = require("@/app/lib/invariant");
const tenant_1 = require("@/app/lib/tenant");
const validation_1 = require("../validation");
/**
 * GET /api/events/contracts/[id]
 * Get a single contract by ID with event and client details
 */
async function GET(request, { params }) {
  try {
    const { orgId } = await (0, server_1.auth)();
    if (!orgId) {
      return server_2.NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
    const { id } = await params;
    (0, invariant_1.invariant)(id, "Contract ID is required");
    // Validate contract exists and belongs to tenant
    const contract = await database_1.database.eventContract.findFirst({
      where: {
        AND: [{ tenantId }, { id }, { deletedAt: null }],
      },
    });
    if (!contract) {
      return server_2.NextResponse.json(
        { message: "Contract not found" },
        { status: 404 }
      );
    }
    // Fetch event details
    const event = await database_1.database.event.findFirst({
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
    const client = await database_1.database.client.findFirst({
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
    return server_2.NextResponse.json({
      contract: {
        ...contract,
        event,
        client,
      },
    });
  } catch (error) {
    if (error instanceof invariant_1.InvariantError) {
      return server_2.NextResponse.json(
        { message: error.message },
        { status: 400 }
      );
    }
    console.error("Error fetching contract:", error);
    return server_2.NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
/**
 * PUT /api/events/contracts/[id]
 * Update a contract with validation
 */
async function PUT(request, { params }) {
  try {
    const { orgId } = await (0, server_1.auth)();
    if (!orgId) {
      return server_2.NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
    const { id } = await params;
    const body = await request.json();
    // Validate ID
    (0, invariant_1.invariant)(id, "Contract ID is required");
    // Validate request body
    (0, validation_1.validateUpdateContractRequest)(body);
    const updateData = body;
    // Validate contract exists and belongs to tenant
    const existingContract = await database_1.database.eventContract.findFirst({
      where: {
        AND: [{ tenantId }, { id }, { deletedAt: null }],
      },
    });
    if (!existingContract) {
      return server_2.NextResponse.json(
        { message: "Contract not found" },
        { status: 404 }
      );
    }
    // Validate business rules for update
    (0, validation_1.validateContractBusinessRules)(
      {
        status: existingContract.status,
        expiresAt: existingContract.expiresAt,
      },
      "update"
    );
    // Handle status transition if provided
    if (updateData.status !== undefined) {
      const currentStatus = existingContract.status;
      const newStatus = updateData.status;
      (0, validation_1.validateContractStatusTransition)(
        currentStatus,
        newStatus
      );
    }
    // Handle event ID update if provided
    if (updateData.eventId !== undefined) {
      // Validate event exists
      const event = await database_1.database.event.findFirst({
        where: {
          AND: [{ tenantId }, { id: updateData.eventId }, { deletedAt: null }],
        },
        select: {
          id: true,
          title: true,
        },
      });
      if (!event) {
        return server_2.NextResponse.json(
          { message: "Event not found" },
          { status: 404 }
        );
      }
    }
    // Handle client ID update if provided
    if (updateData.clientId !== undefined) {
      // Validate client exists
      const client = await database_1.database.client.findFirst({
        where: {
          AND: [{ tenantId }, { id: updateData.clientId }, { deletedAt: null }],
        },
        select: {
          id: true,
          company_name: true,
        },
      });
      if (!client) {
        return server_2.NextResponse.json(
          { message: "Client not found" },
          { status: 404 }
        );
      }
    }
    // Prepare update data
    const updatePayload = {
      ...updateData,
      updatedAt: new Date(),
    };
    // Convert date fields
    if (updatePayload.expiresAt) {
      updatePayload.expiresAt = new Date(updatePayload.expiresAt);
    }
    // Trim string fields
    if (updatePayload.title !== undefined) {
      updatePayload.title = updatePayload.title.trim();
    }
    if (updatePayload.notes !== undefined) {
      updatePayload.notes = updatePayload.notes?.trim() || null;
    }
    if (updatePayload.documentUrl !== undefined) {
      updatePayload.documentUrl = updatePayload.documentUrl?.trim() || null;
    }
    if (updatePayload.documentType !== undefined) {
      updatePayload.documentType = updatePayload.documentType?.trim() || null;
    }
    // Update contract
    const updatedContract = await database_1.database.eventContract.update({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
      data: updatePayload,
    });
    // Fetch updated event and client details
    const eventDetails =
      updateData.eventId !== undefined
        ? await database_1.database.event.findFirst({
            where: {
              AND: [
                { tenantId },
                { id: updateData.eventId },
                { deletedAt: null },
              ],
            },
            select: {
              id: true,
              title: true,
              eventDate: true,
            },
          })
        : existingContract.eventId
          ? await database_1.database.event.findFirst({
              where: {
                AND: [
                  { tenantId },
                  { id: existingContract.eventId },
                  { deletedAt: null },
                ],
              },
              select: {
                id: true,
                title: true,
                eventDate: true,
              },
            })
          : null;
    const clientDetails =
      updateData.clientId !== undefined
        ? await database_1.database.client.findFirst({
            where: {
              AND: [
                { tenantId },
                { id: updateData.clientId },
                { deletedAt: null },
              ],
            },
            select: {
              id: true,
              company_name: true,
              first_name: true,
              last_name: true,
            },
          })
        : existingContract.clientId
          ? await database_1.database.client.findFirst({
              where: {
                AND: [
                  { tenantId },
                  { id: existingContract.clientId },
                  { deletedAt: null },
                ],
              },
              select: {
                id: true,
                company_name: true,
                first_name: true,
                last_name: true,
              },
            })
          : null;
    return server_2.NextResponse.json({
      contract: {
        ...updatedContract,
        event: eventDetails,
        client: clientDetails,
      },
    });
  } catch (error) {
    if (error instanceof invariant_1.InvariantError) {
      return server_2.NextResponse.json(
        { message: error.message },
        { status: 400 }
      );
    }
    console.error("Error updating contract:", error);
    return server_2.NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
/**
 * DELETE /api/events/contracts/[id]
 * Soft delete a contract
 */
async function DELETE(request, { params }) {
  try {
    const { orgId } = await (0, server_1.auth)();
    if (!orgId) {
      return server_2.NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
    const { id } = await params;
    // Validate ID
    (0, invariant_1.invariant)(id, "Contract ID is required");
    // Validate contract exists and belongs to tenant
    const existingContract = await database_1.database.eventContract.findFirst({
      where: {
        AND: [{ tenantId }, { id }, { deletedAt: null }],
      },
    });
    if (!existingContract) {
      return server_2.NextResponse.json(
        { message: "Contract not found" },
        { status: 404 }
      );
    }
    // Validate contract can be deleted
    (0, validation_1.validateContractBusinessRules)(
      {
        status: existingContract.status,
        expiresAt: existingContract.expiresAt,
      },
      "cancel"
    );
    // Additional validation: cannot delete signed or active contracts
    if (existingContract.status === "signed") {
      return server_2.NextResponse.json(
        { message: "Cannot delete a signed contract" },
        { status: 400 }
      );
    }
    if (existingContract.status === "pending") {
      return server_2.NextResponse.json(
        { message: "Cannot delete a pending contract" },
        { status: 400 }
      );
    }
    // Soft delete
    await database_1.database.eventContract.update({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
      data: {
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    });
    return new server_2.NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof invariant_1.InvariantError) {
      return server_2.NextResponse.json(
        { message: error.message },
        { status: 400 }
      );
    }
    console.error("Error deleting contract:", error);
    return server_2.NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
