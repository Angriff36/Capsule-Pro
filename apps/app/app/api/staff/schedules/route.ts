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
    const status = searchParams.get("status");
    const locationId = searchParams.get("locationId");
    const limit = parseInt(searchParams.get("limit") || "50");
    const page = parseInt(searchParams.get("page") || "1");
    const skip = (page - 1) * limit;

    // Fetch schedules using SQL query
    const [schedulesList, totalCount] = await Promise.all([
      database.$queryRaw<
        Array<{
          id: string;
          location_id: string | null;
          schedule_date: Date;
          status: string;
          published_at: Date | null;
          published_by: string | null;
          created_at: Date;
          updated_at: Date;
        }>
      >(
        Prisma.sql`
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
            ${status ? Prisma.sql`AND status = ${status}` : Prisma.empty}
            ${locationId ? Prisma.sql`AND location_id = ${locationId}` : Prisma.empty}
          ORDER BY schedule_date DESC
          LIMIT ${limit}
          OFFSET ${(page - 1) * limit}
        `
      ),
      database.$queryRaw<
        [{ count: bigint }]
      >(
        Prisma.sql`
          SELECT COUNT(*)::bigint
          FROM tenant_staff.schedules
          WHERE tenant_id = ${tenantId}
            AND deleted_at IS NULL
            ${status ? Prisma.sql`AND status = ${status}` : Prisma.empty}
            ${locationId ? Prisma.sql`AND location_id = ${locationId}` : Prisma.empty}
        `
      ),
    ]);

    return NextResponse.json({
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
    return NextResponse.json(
      { error: "Failed to fetch schedules" },
      { status: 500 }
    );
  }
}
