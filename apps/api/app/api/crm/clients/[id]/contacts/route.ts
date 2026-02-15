/**
 * Client Contacts API Endpoints
 *
 * GET  /api/crm/clients/[id]/contacts - List client contacts
 * POST /api/crm/clients/[id]/contacts - Add a new contact
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { InvariantError, invariant } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { executeManifestCommand } from "@/lib/manifest-command-handler";

/**
 * GET /api/crm/clients/[id]/contacts
 * List all contacts for a client
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

    // Get contacts
    const contacts = await database.clientContact.findMany({
      where: {
        AND: [{ tenantId }, { clientId: id }, { deletedAt: null }],
      },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({ data: contacts });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Error listing client contacts:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/crm/clients/[id]/contacts
 * Add a new contact to a client via manifest command
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return executeManifestCommand(request, {
    entityName: "ClientContact",
    commandName: "create",
    params: { id },
    transformBody: (body) => ({ ...body, clientId: id }),
  });
}
