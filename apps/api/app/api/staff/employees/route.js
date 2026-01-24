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
    const role = searchParams.get("role");
    // Fetch employees (User model mapped to tenant_staff.employees table)
    const employees = await database_1.database.$queryRaw(database_1.Prisma.sql`
        SELECT
          id,
          email,
          first_name,
          last_name,
          role,
          is_active,
          phone,
          avatar_url,
          employment_type,
          hourly_rate,
          hire_date,
          created_at,
          updated_at
        FROM tenant_staff.employees
        WHERE tenant_id = ${tenantId}
          AND deleted_at IS NULL
          ${isActive === "true" ? database_1.Prisma.sql`AND is_active = true` : database_1.Prisma.empty}
          ${role ? database_1.Prisma.sql`AND role = ${role}` : database_1.Prisma.empty}
        ORDER BY created_at DESC
      `);
    return server_2.NextResponse.json({ employees });
  } catch (error) {
    console.error("Failed to fetch employees:", error);
    return server_2.NextResponse.json(
      { error: "Failed to fetch employees" },
      { status: 500 }
    );
  }
}
