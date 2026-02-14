/**
 * Single Client CRUD API Endpoints
 *
 * GET    /api/crm/clients/[id]  - Get client details
 * PUT    /api/crm/clients/[id]  - Update client
 * DELETE /api/crm/clients/[id]  - Soft delete client
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { InvariantError, invariant } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import type { UpdateClientRequest } from "../types";
import { validateUpdateClientRequest } from "../validation";

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
    console.error("Error getting client:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Build update data from request, reducing complexity
 */
function buildUpdateData(data: UpdateClientRequest): Record<string, unknown> {
  const updateData: Record<string, unknown> = {};

  // Helper to conditionally add trimmed string fields
  const addTrimmedString = (
    key: keyof UpdateClientRequest,
    altKey?: string
  ) => {
    const value = data[key];
    if (value !== undefined) {
      updateData[altKey ?? key] = (value as string)?.trim() || null;
    }
  };

  // Helper to add non-string fields
  const addValue = (key: keyof UpdateClientRequest, altKey?: string) => {
    const value = data[key];
    if (value !== undefined) {
      updateData[altKey ?? key] = value;
    }
  };

  // String fields that need trimming
  addTrimmedString("company_name");
  addTrimmedString("first_name");
  addTrimmedString("last_name");
  addTrimmedString("email");
  addTrimmedString("phone");
  addTrimmedString("website");
  addTrimmedString("addressLine1");
  addTrimmedString("addressLine2");
  addTrimmedString("city");
  addTrimmedString("stateProvince");
  addTrimmedString("postalCode");
  addTrimmedString("countryCode");
  addTrimmedString("taxId");
  addTrimmedString("notes");
  addTrimmedString("source");

  // Non-string fields
  addValue("defaultPaymentTerms");
  addValue("taxExempt");
  addValue("tags");
  addValue("assignedTo");
  addValue("clientType");

  return updateData;
}

/**
 * PUT /api/crm/clients/[id]
 * Update client
 */
export async function PUT(
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
    const body = await request.json();

    // Validate request body
    validateUpdateClientRequest(body);

    // Check if client exists
    const existingClient = await database.client.findFirst({
      where: {
        AND: [{ tenantId }, { id }, { deletedAt: null }],
      },
    });

    if (!existingClient) {
      return NextResponse.json(
        { message: "Client not found" },
        { status: 404 }
      );
    }

    const data = body as UpdateClientRequest;

    // Check for duplicate email (if changing email)
    if (data.email?.trim() && data.email !== existingClient.email) {
      const duplicateClient = await database.client.findFirst({
        where: {
          AND: [
            { tenantId },
            { email: data.email.trim() },
            { deletedAt: null },
            { id: { not: id } },
          ],
        },
      });

      if (duplicateClient) {
        return NextResponse.json(
          { message: "A client with this email already exists" },
          { status: 409 }
        );
      }
    }

    // Build update data
    const updateData = buildUpdateData(data);

    // Update client
    const updatedClient = await database.client.update({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
      data: updateData,
    });

    return NextResponse.json({ data: updatedClient });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Error updating client:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/crm/clients/[id]
 * Soft delete client
 */
export async function DELETE(
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

    // Check if client exists
    const existingClient = await database.client.findFirst({
      where: {
        AND: [{ tenantId }, { id }, { deletedAt: null }],
      },
    });

    if (!existingClient) {
      return NextResponse.json(
        { message: "Client not found" },
        { status: 404 }
      );
    }

    // Soft delete client
    await database.client.update({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
      data: {
        deletedAt: new Date(),
      },
    });

    return NextResponse.json({ message: "Client deleted successfully" });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Error deleting client:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
