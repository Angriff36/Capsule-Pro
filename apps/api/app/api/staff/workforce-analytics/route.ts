import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import {
  generateWorkforceAnalytics,
  type WorkforceAnalyticsResult,
} from "@/lib/staff/workforce-ai-optimizer";

export async function GET(request: Request) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { searchParams } = new URL(request.url);

  const locationId = searchParams.get("locationId") || undefined;
  const days = Number(searchParams.get("days")) || 30;
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  try {
    const result = await generateWorkforceAnalytics(tenantId, {
      tenantId,
      locationId,
      startDate,
      endDate,
    });

    const serialized: Record<string, unknown> = {
      periodStart: result.periodStart.toISOString(),
      periodEnd: result.periodEnd.toISOString(),
      metrics: {
        totalHours: Number(result.metrics.totalHours),
        totalCost: Number(result.metrics.totalCost),
        averageHoursPerEmployee: Number(result.metrics.averageHoursPerEmployee),
        utilizationRate: Number(result.metrics.utilizationRate),
        turnoverRisk: result.metrics.turnoverRisk,
        topPerformers: result.metrics.topPerformers,
        skillGaps: result.metrics.skillGaps,
      },
      trends: result.trends,
    };

    return NextResponse.json({ success: true, data: serialized });
  } catch (error) {
    log.error("Failed to generate workforce analytics", { error });
    return NextResponse.json(
      { message: "Failed to generate analytics" },
      { status: 500 },
    );
  }
}
