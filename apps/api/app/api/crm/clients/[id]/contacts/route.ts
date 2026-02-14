/**
 * Client Contacts API Endpoints
 *
 * GET  /api/crm/clients/[id]/contacts - List client contacts
 * POST /api/crm/clients/[id]/contacts - Add a new contact
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { InvariantError, invariant } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import type { CreateClientContactRequest } from "../../types";
import { validateCreateClientContactRequest } from "../../validation";

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
 * Add a new contact to a client
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
    validateCreateClientContactRequest(body);

    const data = body as CreateClientContactRequest;

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

    // If setting as primary, unset existing primary contact
    if (data.isPrimary) {
      await database.clientContact.updateMany({
        where: {
          AND: [
            { tenantId },
            { clientId: id },
            { isPrimary: true },
            { deletedAt: null },
          ],
        },
        data: { isPrimary: false },
      });
    }

    // If setting as billing contact, unset existing billing contact
    if (data.isBillingContact) {
      await database.clientContact.updateMany({
        where: {
          AND: [
            { tenantId },
            { clientId: id },
            { isBillingContact: true },
            { deletedAt: null },
          ],
        },
        data: { isBillingContact: false },
      });
    }

    // Create contact
    const contact = await database.clientContact.create({
      data: {
        tenantId,
        clientId: id,
        first_name: data.first_name.trim(),
        last_name: data.last_name.trim(),
        title: data.title?.trim() || null,
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        phoneMobile: data.phoneMobile?.trim() || null,
        isPrimary: data.isPrimary ?? false,
        isBillingContact: data.isBillingContact ?? false,
        notes: data.notes?.trim() || null,
      },
    });

    return NextResponse.json({ data: contact }, { status: 201 });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Error creating client contact:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
