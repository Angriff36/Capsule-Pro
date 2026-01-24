/**
 * Storage Locations API Endpoint
 *
 * GET    /api/inventory/stock-levels/locations      - List storage locations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const tenant_1 = require("@/app/lib/tenant");
/**
 * GET /api/inventory/stock-levels/locations - List storage locations
 */
async function GET(request) {
  try {
    const { orgId } = await (0, server_1.auth)();
    if (!orgId) {
      return server_2.NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
    if (!tenantId) {
      return server_2.NextResponse.json(
        { message: "Tenant not found" },
        { status: 404 }
      );
    }
    // Get active storage locations for this tenant
    const locations = await database_1.database.$queryRaw`
      SELECT
        tenant_id,
        id,
        location_id,
        name,
        storage_type,
        temperature_min,
        temperature_max,
        temperature_unit,
        is_active,
        created_at,
        updated_at,
        deleted_at
      FROM tenant_inventory.storage_locations
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
        AND is_active = true
      ORDER BY name ASC
    `;
    const data = locations.map((loc) => ({
      id: loc.id,
      tenantId: loc.tenant_id,
      name: loc.name,
      locationType: loc.storage_type,
      address: null,
      isActive: loc.is_active,
      createdAt: loc.created_at,
      updatedAt: loc.updated_at,
    }));
    const response = {
      data,
    };
    return server_2.NextResponse.json(response);
  } catch (error) {
    console.error("Failed to list storage locations:", error);
    return server_2.NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
