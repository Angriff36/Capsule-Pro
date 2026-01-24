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
    const status = searchParams.get("status");
    const locationId = searchParams.get("locationId");
    const limit = Number.parseInt(searchParams.get("limit") || "50");
    const page = Number.parseInt(searchParams.get("page") || "1");
    const skip = (page - 1) * limit;
    // Fetch schedules using SQL query
    const [schedulesList, totalCount] = await Promise.all([
      database_1.database.$queryRaw(database_1.Prisma.sql`
          SELECT
            id,
            location_id,
            schedule_date,
            status,
            published_at,
            published_by,
            created_at,
            updated_at
          FROM tenant_staff.schedules
          WHERE tenant_id = ${tenantId}
            AND deleted_at IS NULL
            ${status ? database_1.Prisma.sql`AND status = ${status}` : database_1.Prisma.empty}
            ${locationId ? database_1.Prisma.sql`AND location_id = ${locationId}` : database_1.Prisma.empty}
          ORDER BY schedule_date DESC
          LIMIT ${limit}
          OFFSET ${(page - 1) * limit}
        `),
      database_1.database.$queryRaw(database_1.Prisma.sql`
          SELECT COUNT(*)::bigint
          FROM tenant_staff.schedules
          WHERE tenant_id = ${tenantId}
            AND deleted_at IS NULL
            ${status ? database_1.Prisma.sql`AND status = ${status}` : database_1.Prisma.empty}
            ${locationId ? database_1.Prisma.sql`AND location_id = ${locationId}` : database_1.Prisma.empty}
        `),
    ]);
    return server_2.NextResponse.json({
      schedules: schedulesList,
      pagination: {
        page,
        limit,
        total: Number(totalCount[0].count),
        totalPages: Math.ceil(Number(totalCount[0].count) / limit),
      },
    });
  } catch (error) {
    console.error("Failed to fetch schedules:", error);
    return server_2.NextResponse.json(
      { error: "Failed to fetch schedules" },
      { status: 500 }
    );
  }
}
