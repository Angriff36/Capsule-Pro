Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const tenant_1 = require("@/app/lib/tenant");
async function GET(req) {
  try {
    const { orgId } = await (0, server_1.auth)();
    if (!orgId) {
      return server_2.NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }
    const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
    if (!tenantId) {
      return server_2.NextResponse.json(
        { error: "No tenant found" },
        { status: 401 }
      );
    }
    const { searchParams } = new URL(req.url);
    const isActive = searchParams.get("isActive");
    // Fetch locations using SQL query
    const locationsList = await database_1.database.$queryRaw(database_1.Prisma
      .sql`
        SELECT
          id,
          name,
          address_line_1,
          address_line_2,
          city,
          state_province,
          postal_code,
          country_code,
          timezone,
          is_primary,
          is_active,
          created_at,
          updated_at
        FROM tenant.locations
        WHERE tenant_id = ${tenantId}
          AND deleted_at IS NULL
          ${isActive === "true" ? database_1.Prisma.sql`AND is_active = true` : database_1.Prisma.empty}
        ORDER BY name ASC
      `);
    return server_2.NextResponse.json({ locations: locationsList });
  } catch (error) {
    console.error("Failed to fetch locations:", error);
    return server_2.NextResponse.json(
      { error: "Failed to fetch locations" },
      { status: 500 }
    );
  }
}
