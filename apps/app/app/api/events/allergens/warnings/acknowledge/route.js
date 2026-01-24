Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const tenant_1 = require("@/app/lib/tenant");
async function POST(request) {
  try {
    // Authenticate the user
    const { orgId } = await (0, server_1.auth)();
    if (!orgId) {
      return server_2.NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    // Get tenant ID
    const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
    if (!tenantId) {
      return server_2.NextResponse.json(
        { error: "Tenant not found" },
        { status: 404 }
      );
    }
    // Parse request body
    const body = await request.json();
    const { warningId, overrideReason, resolved = false } = body;
    // Validate required fields
    if (!warningId) {
      return server_2.NextResponse.json(
        { error: "warningId is required" },
        { status: 400 }
      );
    }
    if (resolved && !overrideReason) {
      return server_2.NextResponse.json(
        {
          error:
            "overrideReason is required when resolving an allergen warning",
        },
        { status: 400 }
      );
    }
    // Validate the warning exists and belongs to the tenant
    const warning = await database_1.database.allergenWarning.findFirst({
      where: {
        id: warningId,
        tenantId,
        deletedAt: null,
      },
    });
    if (!warning) {
      return server_2.NextResponse.json(
        { error: "Allergen warning not found" },
        { status: 404 }
      );
    }
    // Update the warning using the correct composite key format
    const updatedWarning = await database_1.database.allergenWarning.update({
      where: { tenantId_id: { tenantId, id: warningId } },
      data: {
        isAcknowledged: true,
        acknowledgedBy: orgId,
        acknowledgedAt: new Date(),
        overrideReason,
        resolved,
        resolvedAt: resolved ? new Date() : undefined,
      },
    });
    return server_2.NextResponse.json(updatedWarning);
  } catch (error) {
    console.error("Error acknowledging allergen warning:", error);
    return server_2.NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
