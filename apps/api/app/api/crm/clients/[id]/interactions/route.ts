/**
 * Client Interactions (Communication Log) API Endpoints
 *
 * GET  /api/crm/clients/[id]/interactions - Get client communication timeline
 * POST /api/crm/clients/[id]/interactions - Log a new interaction
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { InvariantError, invariant } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import type { CreateClientInteractionRequest } from "../../types";
import { validateCreateClientInteractionRequest } from "../../validation";

/**
 * GET /api/crm/clients/[id]/interactions
 * Get communication timeline for a client
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
    const { searchParams } = new URL(request.url);

    // Pagination
    const limit = Number.parseInt(searchParams.get("limit") || "50", 10);
    const offset = Number.parseInt(searchParams.get("offset") || "0", 10);

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

    // Get interactions (joined with employee data for display)
    const interactions = await database.clientInteraction.findMany({
      where: {
        AND: [{ tenantId }, { clientId: id }, { deletedAt: null }],
      },
      orderBy: [{ interactionDate: "desc" }],
      take: limit,
      skip: offset,
    });

    // Get total count
    const totalCount = await database.clientInteraction.count({
      where: {
        AND: [{ tenantId }, { clientId: id }, { deletedAt: null }],
      },
    });

    return NextResponse.json({
      data: interactions,
      pagination: {
        limit,
        offset,
        total: totalCount,
      },
    });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Error listing client interactions:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/crm/clients/[id]/interactions
 * Log a new interaction with a client
 */
export async function POST(
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
    validateCreateClientInteractionRequest(body);

    const data = body as CreateClientInteractionRequest;

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

    // Get current user (employee) ID
    // For now, we'll need to look up the employee from the user
    const employee = await database.user.findFirst({
      where: {
        AND: [{ tenantId }, { deletedAt: null }],
      },
    });

    if (!employee) {
      return NextResponse.json(
        { message: "User record not found for current user" },
        { status: 400 }
      );
    }

    // Create interaction
    const interaction = await database.clientInteraction.create({
      data: {
        tenantId,
        clientId: id,
        employeeId: employee.id,
        interactionType: data.interactionType.trim(),
        subject: data.subject?.trim() || null,
        description: data.description?.trim() || null,
        followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
      },
    });

    return NextResponse.json({ data: interaction }, { status: 201 });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Error creating client interaction:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
