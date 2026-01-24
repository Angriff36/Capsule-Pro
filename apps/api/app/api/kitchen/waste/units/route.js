Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
/**
 * GET /api/kitchen/waste/units
 * Get all available measurement units for waste tracking
 */
async function GET() {
  try {
    const { orgId } = await (0, server_1.auth)();
    if (!orgId) {
      return server_2.NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    // Get all units for waste tracking dropdown
    const units = await database_1.database.$queryRaw`
      SELECT id, code, name, name_plural, unit_system, unit_type
      FROM core.units
      ORDER BY unit_type, code
    `;
    return server_2.NextResponse.json({ data: units });
  } catch (error) {
    console.error("Failed to fetch units:", error);
    return server_2.NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
