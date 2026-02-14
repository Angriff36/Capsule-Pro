/**
 * Client Preferences API Endpoints
 *
 * GET  /api/crm/clients/[id]/preferences - List client preferences
 * POST /api/crm/clients/[id]/preferences - Add a preference
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { InvariantError, invariant } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";

/**
 * GET /api/crm/clients/[id]/preferences
 * List all preferences for a client
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

    // Get preferences
    const preferences = await database.clientPreference.findMany({
      where: {
        AND: [{ tenantId }, { clientId: id }, { deletedAt: null }],
      },
      orderBy: [{ preferenceType: "asc" }, { preferenceKey: "asc" }],
    });

    return NextResponse.json({ data: preferences });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Error listing client preferences:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/crm/clients/[id]/preferences
 * Add a new preference for a client
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

    invariant(
      body && typeof body === "object",
      "Request body must be a valid object"
    );
    invariant(
      typeof body.preferenceType === "string" &&
        body.preferenceType.trim().length > 0,
      "preferenceType is required and must not be empty"
    );
    invariant(
      typeof body.preferenceKey === "string" &&
        body.preferenceKey.trim().length > 0,
      "preferenceKey is required and must not be empty"
    );
    invariant(
      body.preferenceValue !== undefined && body.preferenceValue !== null,
      "preferenceValue is required"
    );

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

    // Create preference
    const preference = await database.clientPreference.create({
      data: {
        tenantId,
        clientId: id,
        preferenceType: body.preferenceType.trim(),
        preferenceKey: body.preferenceKey.trim(),
        preferenceValue: body.preferenceValue,
        notes: body.notes?.trim() || null,
      },
    });

    return NextResponse.json({ data: preference }, { status: 201 });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Error creating client preference:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
