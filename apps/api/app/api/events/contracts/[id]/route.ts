import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { InvariantError, invariant } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import {
  type ContractStatus,
  type UpdateContractRequest,
  validateContractBusinessRules,
  validateContractStatusTransition,
  validateUpdateContractRequest,
} from "../validation";

type Params = Promise<{ id: string }>;

/**
 * GET /api/events/contracts/[id]
 * Get a single contract by ID with event and client details
 */
export async function GET(request: Request, { params }: { params: Params }) {
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
 * Update a contract with validation
 */
export async function PUT(request: Request, { params }: { params: Params }) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { id } = await params;
    const body = await request.json();

    // Validate ID
    invariant(id, "Contract ID is required");

    // Validate request body
    validateUpdateContractRequest(body);
    const updateData = body as UpdateContractRequest;

    // Validate contract exists and belongs to tenant
    const existingContract = await database.eventContract.findFirst({
      where: {
        AND: [{ tenantId }, { id }, { deletedAt: null }],
      },
    });

    if (!existingContract) {
      return NextResponse.json(
        { message: "Contract not found" },
        { status: 404 }
      );
    }

    // Validate business rules for update
    validateContractBusinessRules(
      {
        status: existingContract.status as ContractStatus,
        expiresAt: existingContract.expiresAt,
      },
      "update"
    );

    // Handle status transition if provided
    if (updateData.status !== undefined) {
      const currentStatus = existingContract.status as ContractStatus;
      const newStatus = updateData.status as ContractStatus;

      validateContractStatusTransition(currentStatus, newStatus);
    }

    // Handle event ID update if provided
    if (updateData.eventId !== undefined) {
      // Validate event exists
      const event = await database.event.findFirst({
        where: {
          AND: [{ tenantId }, { id: updateData.eventId }, { deletedAt: null }],
        },
        select: {
          id: true,
          title: true,
        },
      });

      if (!event) {
        return NextResponse.json(
          { message: "Event not found" },
          { status: 404 }
        );
      }
    }

    // Handle client ID update if provided
    if (updateData.clientId !== undefined) {
      // Validate client exists
      const client = await database.client.findFirst({
        where: {
          AND: [{ tenantId }, { id: updateData.clientId }, { deletedAt: null }],
        },
        select: {
          id: true,
          company_name: true,
        },
      });

      if (!client) {
        return NextResponse.json(
          { message: "Client not found" },
          { status: 404 }
        );
      }
    }

    // Prepare update data
    const updatePayload: any = {
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
    const updatedContract = await database.eventContract.update({
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
        ? await database.event.findFirst({
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
          ? await database.event.findFirst({
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
        ? await database.client.findFirst({
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
          ? await database.client.findFirst({
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

    return NextResponse.json({
      contract: {
        ...updatedContract,
        event: eventDetails,
        client: clientDetails,
      },
    });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Error updating contract:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/events/contracts/[id]
 * Soft delete a contract
 */
export async function DELETE(request: Request, { params }: { params: Params }) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { id } = await params;

    // Validate ID
    invariant(id, "Contract ID is required");

    // Validate contract exists and belongs to tenant
    const existingContract = await database.eventContract.findFirst({
      where: {
        AND: [{ tenantId }, { id }, { deletedAt: null }],
      },
    });

    if (!existingContract) {
      return NextResponse.json(
        { message: "Contract not found" },
        { status: 404 }
      );
    }

    // Validate contract can be deleted
    validateContractBusinessRules(
      {
        status: existingContract.status as ContractStatus,
        expiresAt: existingContract.expiresAt,
      },
      "cancel"
    );

    // Additional validation: cannot delete signed or active contracts
    if (existingContract.status === "signed") {
      return NextResponse.json(
        { message: "Cannot delete a signed contract" },
        { status: 400 }
      );
    }

    if (existingContract.status === "pending") {
      return NextResponse.json(
        { message: "Cannot delete a pending contract" },
        { status: 400 }
      );
    }

    // Soft delete
    await database.eventContract.update({
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

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Error deleting contract:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
