import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

export async function GET(req: NextRequest) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant found" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const isActive = searchParams.get("isActive");
    const role = searchParams.get("role");

    // Fetch employees (User model mapped to tenant_staff.employees table)
    const employees = await database.$queryRaw<
      Array<{
        id: string;
        email: string;
        first_name: string | null;
        last_name: string | null;
        role: string;
        is_active: boolean;
        phone: string | null;
        avatar_url: string | null;
        employment_type: string;
        hourly_rate: number | null;
        hire_date: Date;
        created_at: Date;
        updated_at: Date;
      }>
    >(
      Prisma.sql`
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
          ${isActive === "true" ? Prisma.sql`AND is_active = true` : Prisma.empty}
          ${role ? Prisma.sql`AND role = ${role}` : Prisma.empty}
        ORDER BY created_at DESC
      `
    );

    return NextResponse.json({ employees });
  } catch (error) {
    console.error("Failed to fetch employees:", error);
    return NextResponse.json(
      { error: "Failed to fetch employees" },
      { status: 500 }
    );
  }
}
