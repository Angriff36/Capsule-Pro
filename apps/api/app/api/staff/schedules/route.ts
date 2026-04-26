import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { captureException } from "@sentry/nextjs";
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
    const status = searchParams.get("status");
    const locationId = searchParams.get("locationId");
    const limit = Number.parseInt(searchParams.get("limit") || "50", 10);
    const page = Number.parseInt(searchParams.get("page") || "1", 10);

    const where = {
      tenantId,
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(locationId ? { locationId } : {}),
    };

    const [schedules, totalCount] = await Promise.all([
      database.schedule.findMany({
        where,
        orderBy: { schedule_date: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      database.schedule.count({ where }),
    ]);

    return NextResponse.json({
      schedules,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    captureException(error);
    console.error("Failed to fetch schedules:", error);
    return NextResponse.json(
      { error: "Failed to fetch schedules" },
      { status: 500 }
    );
  }
}
