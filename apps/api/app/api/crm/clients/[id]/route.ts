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

    // Get event count (from catering_orders in tenant_events)
    const eventCount = await database.cateringOrder.count({
      where: {
        AND: [{ tenantId }, { clientId: id }, { deletedAt: null }],
      },
    });

    // Get total revenue (sum of catering order totals)
    const revenueResult = await database.cateringOrder.aggregate({
      where: {
        AND: [{ tenantId }, { clientId: id }, { deletedAt: null }],
      },
      _sum: {
        total: true,
      },
    });

    const totalRevenue = revenueResult._sum.total;

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
    if (
      data.email &&
      data.email.trim() &&
      data.email !== existingClient.email
    ) {
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

    // Update client
    const updatedClient = await database.client.update({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
      data: {
        ...(data.company_name !== undefined && {
          company_name: data.company_name?.trim() || null,
        }),
        ...(data.first_name !== undefined && {
          first_name: data.first_name?.trim() || null,
        }),
        ...(data.last_name !== undefined && {
          last_name: data.last_name?.trim() || null,
        }),
        ...(data.email !== undefined && { email: data.email?.trim() || null }),
        ...(data.phone !== undefined && { phone: data.phone?.trim() || null }),
        ...(data.website !== undefined && {
          website: data.website?.trim() || null,
        }),
        ...(data.addressLine1 !== undefined && {
          addressLine1: data.addressLine1?.trim() || null,
        }),
        ...(data.addressLine2 !== undefined && {
          addressLine2: data.addressLine2?.trim() || null,
        }),
        ...(data.city !== undefined && { city: data.city?.trim() || null }),
        ...(data.stateProvince !== undefined && {
          stateProvince: data.stateProvince?.trim() || null,
        }),
        ...(data.postalCode !== undefined && {
          postalCode: data.postalCode?.trim() || null,
        }),
        ...(data.countryCode !== undefined && {
          countryCode: data.countryCode?.trim() || null,
        }),
        ...(data.defaultPaymentTerms !== undefined && {
          defaultPaymentTerms: data.defaultPaymentTerms,
        }),
        ...(data.taxExempt !== undefined && { taxExempt: data.taxExempt }),
        ...(data.taxId !== undefined && { taxId: data.taxId?.trim() || null }),
        ...(data.notes !== undefined && { notes: data.notes?.trim() || null }),
        ...(data.tags !== undefined && { tags: data.tags }),
        ...(data.source !== undefined && {
          source: data.source?.trim() || null,
        }),
        ...(data.assignedTo !== undefined && {
          assignedTo: data.assignedTo || null,
        }),
        ...(data.clientType !== undefined && { clientType: data.clientType }),
      },
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
