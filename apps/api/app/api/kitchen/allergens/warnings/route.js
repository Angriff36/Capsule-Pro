/**
 * @module AllergenWarningsAPI
 * @intent Fetch all allergen warnings with optional filtering
 * @responsibility List warnings across all events with filtering by acknowledgment status, severity
 * @domain Kitchen
 * @tags allergens, warnings, api
 * @canonical true
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const invariant_1 = require("@/app/lib/invariant");
const tenant_1 = require("@/app/lib/tenant");
async function GET(request) {
  try {
    // Authenticate the user
    const { orgId } = await (0, server_1.auth)();
    if (!orgId) {
      return server_2.NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
    (0, invariant_1.invariant)(
      tenantId,
      `tenantId not found for orgId=${orgId}`
    );
    const { searchParams } = new URL(request.url);
    const isAcknowledged = searchParams.get("is_acknowledged");
    const severity = searchParams.get("severity");
    const warningType = searchParams.get("warning_type");
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");
    // Build query conditions
    const where = {
      tenantId,
      deletedAt: null,
    };
    // Filter by acknowledgment status if provided
    if (isAcknowledged !== null) {
      where.isAcknowledged = isAcknowledged === "true";
    }
    // Filter by severity if provided
    if (severity) {
      where.severity = severity;
    }
    // Filter by warning type if provided
    if (warningType) {
      where.warningType = warningType;
    }
    // Fetch warnings
    const warnings = await database_1.database.allergenWarning.findMany({
      where,
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
      take: limit ? Number.parseInt(limit, 10) : undefined,
      skip: offset ? Number.parseInt(offset, 10) : undefined,
    });
    // Get total count for pagination
    const totalCount = await database_1.database.allergenWarning.count({
      where,
    });
    return server_2.NextResponse.json({
      warnings,
      pagination: {
        total: totalCount,
        limit: limit ? Number.parseInt(limit, 10) : warnings.length,
        offset: offset ? Number.parseInt(offset, 10) : 0,
      },
    });
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
