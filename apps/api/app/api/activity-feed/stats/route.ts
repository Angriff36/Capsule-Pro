// Activity Feed Stats API Route
// Provides statistics about activities for a tenant

import { auth } from "@repo/auth/server";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

export async function GET(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);

    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    // Get stats using raw SQL for better performance
    const statsResult = await (await import("@repo/database")).database
      .$queryRaw<
      Array<{
        total_activities: bigint;
        today_count: bigint;
        week_count: bigint;
      }>
    >`
      SELECT
        COUNT(*) as total_activities,
        COUNT(*) FILTER (WHERE created_at >= ${todayStart}) as today_count,
        COUNT(*) FILTER (WHERE created_at >= ${weekStart}) as week_count
      FROM tenant_admin.activity_feed
      WHERE tenant_id = ${tenantId}
    `;

    const byTypeResult = await (await import("@repo/database")).database
      .$queryRaw<Array<{ activity_type: string; count: bigint }>>`
      SELECT activity_type, COUNT(*) as count
      FROM tenant_admin.activity_feed
      WHERE tenant_id = ${tenantId}
      GROUP BY activity_type
    `;

    const byEntityResult = await (await import("@repo/database")).database
      .$queryRaw<Array<{ entity_type: string; count: bigint }>>`
      SELECT COALESCE(entity_type, 'unknown') as entity_type, COUNT(*) as count
      FROM tenant_admin.activity_feed
      WHERE tenant_id = ${tenantId} AND entity_type IS NOT NULL
      GROUP BY entity_type
      ORDER BY count DESC
      LIMIT 10
    `;

    const stats = statsResult[0];
    const byType: Record<string, number> = {};
    for (const row of byTypeResult) {
      byType[row.activity_type] = Number(row.count);
    }

    const byEntity: Record<string, number> = {};
    for (const row of byEntityResult) {
      byEntity[row.entity_type] = Number(row.count);
    }

    return manifestSuccessResponse({
      stats: {
        totalActivities: Number(stats.total_activities),
        todayCount: Number(stats.today_count),
        weekCount: Number(stats.week_count),
        byType,
        byEntity,
      },
    });
  } catch (error) {
    console.error("Error fetching activity stats:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
