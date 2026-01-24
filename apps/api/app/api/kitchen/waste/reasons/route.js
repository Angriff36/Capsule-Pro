Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
/**
 * GET /api/kitchen/waste/reasons
 * Get all active waste reasons for dropdown
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
    // Get all active waste reasons
    const reasons = await database_1.database.wasteReason.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        colorHex: true,
        sortOrder: true,
      },
    });
    return server_2.NextResponse.json({ data: reasons });
  } catch (error) {
    console.error("Failed to fetch waste reasons:", error);
    return server_2.NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
