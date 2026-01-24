/**
 * Client Preferences API Endpoints
 *
 * GET  /api/crm/clients/[id]/preferences - List client preferences
 * POST /api/crm/clients/[id]/preferences - Add a preference
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const invariant_1 = require("@/app/lib/invariant");
const tenant_1 = require("@/app/lib/tenant");
/**
 * GET /api/crm/clients/[id]/preferences
 * List all preferences for a client
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
    // Get preferences
    const preferences = await database_1.database.clientPreference.findMany({
      where: {
        AND: [{ tenantId }, { clientId: id }, { deletedAt: null }],
      },
      orderBy: [{ preferenceType: "asc" }, { preferenceKey: "asc" }],
    });
    return server_2.NextResponse.json({ data: preferences });
  } catch (error) {
    if (error instanceof invariant_1.InvariantError) {
      return server_2.NextResponse.json(
        { message: error.message },
        { status: 400 }
      );
    }
    console.error("Error listing client preferences:", error);
    return server_2.NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
/**
 * POST /api/crm/clients/[id]/preferences
 * Add a new preference for a client
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
    (0, invariant_1.invariant)(
      body && typeof body === "object",
      "Request body must be a valid object"
    );
    (0, invariant_1.invariant)(
      typeof body.preferenceType === "string" &&
        body.preferenceType.trim().length > 0,
      "preferenceType is required and must not be empty"
    );
    (0, invariant_1.invariant)(
      typeof body.preferenceKey === "string" &&
        body.preferenceKey.trim().length > 0,
      "preferenceKey is required and must not be empty"
    );
    (0, invariant_1.invariant)(
      body.preferenceValue !== undefined && body.preferenceValue !== null,
      "preferenceValue is required"
    );
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
    // Create preference
    const preference = await database_1.database.clientPreference.create({
      data: {
        tenantId,
        clientId: id,
        preferenceType: body.preferenceType.trim(),
        preferenceKey: body.preferenceKey.trim(),
        preferenceValue: body.preferenceValue,
        notes: body.notes?.trim() || null,
      },
    });
    return server_2.NextResponse.json({ data: preference }, { status: 201 });
  } catch (error) {
    if (error instanceof invariant_1.InvariantError) {
      return server_2.NextResponse.json(
        { message: error.message },
        { status: 400 }
      );
    }
    console.error("Error creating client preference:", error);
    return server_2.NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
