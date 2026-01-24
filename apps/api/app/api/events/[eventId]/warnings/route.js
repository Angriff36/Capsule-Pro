Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const invariant_1 = require("@/app/lib/invariant");
const tenant_1 = require("@/app/lib/tenant");
async function GET(request, { params }) {
  try {
    const { eventId } = await params;
    (0, invariant_1.invariant)(eventId, "params.eventId must exist");
    // Authenticate the user
    const { userId, orgId } = await (0, server_1.auth)();
    if (!(userId && orgId)) {
      return server_2.NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    (0, invariant_1.invariant)(orgId, "auth.orgId must exist");
    // Get tenant ID
    const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
    (0, invariant_1.invariant)(
      tenantId,
      `tenantId not found for orgId=${orgId}`
    );
    const { searchParams } = new URL(request.url);
    const isAcknowledged = searchParams.get("is_acknowledged");
    // Validate the event exists and belongs to the tenant
    const event = await database_1.database.event.findFirst({
      where: {
        id: eventId,
        tenantId,
        deletedAt: null,
      },
    });
    if (!event) {
      return server_2.NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }
    // Build query conditions
    const where = {
      eventId,
      tenantId,
      deletedAt: null,
    };
    // Filter by acknowledgment status if provided
    if (isAcknowledged !== null) {
      where.isAcknowledged = isAcknowledged === "true";
    }
    // Fetch warnings
    // Note: Relations like dish, guest are not defined in Prisma schema yet
    // TODO: Add relations to schema and include them here
    const warnings = await database_1.database.allergenWarning.findMany({
      where,
      orderBy: [
        { isAcknowledged: "asc" },
        { severity: "desc" },
        { createdAt: "desc" },
      ],
    });
    return server_2.NextResponse.json(warnings);
  } catch (error) {
    if (error instanceof invariant_1.InvariantError) {
      return server_2.NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    console.error("Error fetching allergen warnings:", error);
    return server_2.NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
