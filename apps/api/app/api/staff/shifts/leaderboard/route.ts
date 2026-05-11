import { database, Prisma } from "@repo/database";
import { log } from "@repo/observability/log";
import { type NextRequest, NextResponse } from "next/server";
import { requireTenantId } from "@/app/lib/tenant";

interface LeaderboardRow {
  employee_id: string;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
  shift_count: number;
}

export async function GET(request: NextRequest) {
  try {
    const tenantId = await requireTenantId();
    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      Math.max(Number(searchParams.get("limit") || "50"), 1),
      200,
    );

    const leaderboard = await database.$queryRaw<LeaderboardRow[]>(
      Prisma.sql`
      SELECT
        s.employee_id,
        e.first_name,
        e.last_name,
        e.role,
        COUNT(*)::int AS shift_count
      FROM tenant_staff.schedule_shifts s
      JOIN tenant_staff.employees e
        ON e.tenant_id = s.tenant_id
        AND e.id = s.employee_id
      WHERE s.tenant_id = ${tenantId}
        AND s.deleted_at IS NULL
        AND s.shift_start >= date_trunc('week', CURRENT_DATE)
        AND s.shift_start < date_trunc('week', CURRENT_DATE) + interval '1 week'
      GROUP BY s.employee_id, e.first_name, e.last_name, e.role
      ORDER BY shift_count DESC, e.last_name ASC
      LIMIT ${limit}
      `,
    );

    return NextResponse.json({ data: leaderboard });
  } catch (error) {
    log.error("Error fetching shift leaderboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 },
    );
  }
}
