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

// Type for update payload with additional fields
type UpdateContractPayload = UpdateContractRequest & {
  updatedAt: Date;
};

// Helper function to validate and get contract
async function validateAndGetContract(
  tenantId: string,
  id: string
): Promise<
  NonNullable<Awaited<ReturnType<typeof database.eventContract.findFirst>>>
> {
  const contract = await database.eventContract.findFirst({
    where: {
      AND: [{ tenantId }, { id }, { deletedAt: null }],
    },
  });

  if (!contract) {
    throw new Error("Contract not found");
  }

  return contract;
}

// Helper function to validate event exists
async function validateAndGetEvent(
  tenantId: string,
  eventId: string
): Promise<{ id: string; title: string }> {
  const event = await database.event.findFirst({
    where: {
      AND: [{ tenantId }, { id: eventId }, { deletedAt: null }],
    },
    select: {
      id: true,
      title: true,
    },
  });

  if (!event) {
    throw new Error("Event not found");
  }

  return event;
}

// Helper function to validate client exists
async function validateAndGetClient(
  tenantId: string,
  clientId: string
): Promise<{ id: string; company_name: string | null }> {
  const client = await database.client.findFirst({
    where: {
      AND: [{ tenantId }, { id: clientId }, { deletedAt: null }],
    },
    select: {
      id: true,
      company_name: true,
    },
  });

  if (!client) {
    throw new Error("Client not found");
  }

  return client;
}

// Helper function to build update payload
function buildUpdatePayload(
  updateData: UpdateContractRequest
): UpdateContractPayload {
  const updatePayload: UpdateContractPayload = {
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
    updatePayload.notes = updatePayload.notes?.trim() || undefined;
  }
  if (updatePayload.documentUrl !== undefined) {
    updatePayload.documentUrl = updatePayload.documentUrl?.trim() || undefined;
  }
  if (updatePayload.documentType !== undefined) {
    updatePayload.documentType = updatePayload.documentType?.trim() || undefined;
  }

  return updatePayload;
}

// Helper function to get event details
async function getEventDetails(
  tenantId: string,
  eventId: string | null,
  existingEventId: string | null
): Promise<{ id: string; title: string; eventDate: Date; } | null> {
  const targetEventId = eventId || existingEventId;

  if (!targetEventId) {
    return null;
  }

  const event = await database.event.findFirst({
    where: {
      AND: [{ tenantId }, { id: targetEventId }, { deletedAt: null }],
    },
    select: {
      id: true,
      title: true,
      eventDate: true,
    },
  });

  return event;
}

// Helper function to get client details
async function getClientDetails(
  tenantId: string,
  clientId: string | null,
  existingClientId: string | null
): Promise<{ id: string; company_name: string | null; first_name: string | null; last_name: string | null; } | null> {
  const targetClientId = clientId || existingClientId;

  if (!targetClientId) {
    return null;
  }

  const client = await database.client.findFirst({
    where: {
      AND: [{ tenantId }, { id: targetClientId }, { deletedAt: null }],
    },
    select: {
      id: true,
      company_name: true,
      first_name: true,
      last_name: true,
    },
  });

  return client;
}

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
    const existingContract = await validateAndGetContract(tenantId, id);

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
      await validateAndGetEvent(tenantId, updateData.eventId);
    }

    // Handle client ID update if provided
    if (updateData.clientId !== undefined) {
      await validateAndGetClient(tenantId, updateData.clientId);
    }

    // Prepare update data
    const updatePayload = buildUpdatePayload(updateData);

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
    const eventDetails = await getEventDetails(
      tenantId,
      updateData.eventId ?? null,
      existingContract.eventId
    );

    const clientDetails = await getClientDetails(
      tenantId,
      updateData.clientId ?? null,
      existingContract.clientId
    );

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
export async function DELETE(
  _request: Request,
  { params }: { params: Params }
) {
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
