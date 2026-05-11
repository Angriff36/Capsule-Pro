import { auth } from "@repo/auth/server";
import { log } from "@repo/observability/log";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { predictPerformance } from "@/lib/staff/workforce-ai-optimizer";

export async function POST(request: NextRequest) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);

  try {
    const body = await request.json();
    const { employeeId, scheduleId, predictionHorizon, metrics } = body;

    if (!employeeId || !predictionHorizon || !metrics?.length) {
      return NextResponse.json(
        { message: "Missing required fields: employeeId, predictionHorizon, metrics" },
        { status: 400 },
      );
    }

    const result = await predictPerformance(tenantId, {
      employeeId,
      scheduleId,
      predictionHorizon,
      metrics,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    log.error("Failed to predict performance", { error });
    return NextResponse.json(
      { message: "Failed to predict performance" },
      { status: 500 },
    );
  }
}
