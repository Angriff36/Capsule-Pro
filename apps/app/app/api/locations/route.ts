import { NextRequest, NextResponse } from "next/server";
import { auth } from "@repo/auth/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database, Prisma } from "@repo/database";

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

    // Fetch locations using SQL query
    const locationsList = await database.$queryRaw<
      Array<{
        id: string;
        name: string;
        address_line_1: string | null;
        address_line_2: string | null;
        city: string | null;
        state_province: string | null;
        postal_code: string | null;
        country_code: string | null;
        timezone: string | null;
        is_primary: boolean;
        is_active: boolean;
        created_at: Date;
        updated_at: Date;
      }>
    >(
      Prisma.sql`
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
          ${isActive === "true" ? Prisma.sql`AND is_active = true` : Prisma.empty}
        ORDER BY name ASC
      `
    );

    return NextResponse.json({ locations: locationsList });
  } catch (error) {
    console.error("Failed to fetch locations:", error);
    return NextResponse.json(
      { error: "Failed to fetch locations" },
      { status: 500 }
    );
  }
}
