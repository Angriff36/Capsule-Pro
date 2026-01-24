/**
 * Client Contacts API Endpoints
 *
 * GET  /api/crm/clients/[id]/contacts - List client contacts
 * POST /api/crm/clients/[id]/contacts - Add a new contact
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const invariant_1 = require("@/app/lib/invariant");
const tenant_1 = require("@/app/lib/tenant");
const validation_1 = require("../../validation");
/**
 * GET /api/crm/clients/[id]/contacts
 * List all contacts for a client
 */
async function GET(_request, { params }) {
  try {
    const { id } = await params;
    (0, invariant_1.invariant)(id, "params.id must exist");
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
    // Get contacts
    const contacts = await database_1.database.clientContact.findMany({
      where: {
        AND: [{ tenantId }, { clientId: id }, { deletedAt: null }],
      },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    });
    return server_2.NextResponse.json({ data: contacts });
  } catch (error) {
    if (error instanceof invariant_1.InvariantError) {
      return server_2.NextResponse.json(
        { message: error.message },
        { status: 400 }
      );
    }
    console.error("Error listing client contacts:", error);
    return server_2.NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
/**
 * POST /api/crm/clients/[id]/contacts
 * Add a new contact to a client
 */
async function POST(request, { params }) {
  try {
    const { id } = await params;
    (0, invariant_1.invariant)(id, "params.id must exist");
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
    (0, validation_1.validateCreateClientContactRequest)(body);
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
    // If setting as primary, unset existing primary contact
    if (data.isPrimary) {
      await database_1.database.clientContact.updateMany({
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
      await database_1.database.clientContact.updateMany({
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
    const contact = await database_1.database.clientContact.create({
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
    return server_2.NextResponse.json({ data: contact }, { status: 201 });
  } catch (error) {
    if (error instanceof invariant_1.InvariantError) {
      return server_2.NextResponse.json(
        { message: error.message },
        { status: 400 }
      );
    }
    console.error("Error creating client contact:", error);
    return server_2.NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
