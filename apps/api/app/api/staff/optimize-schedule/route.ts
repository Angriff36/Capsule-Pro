import { auth } from "@repo/auth/server";
import { log } from "@repo/observability/log";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import {
  optimizeSchedule,
  type OptimizationConstraints,
} from "@/lib/staff/workforce-ai-optimizer";

export async function POST(request: NextRequest) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);

  try {
    const body = await request.json();
    const { scheduleId, locationId, startDate, endDate, constraints } = body;

    if (!scheduleId || !locationId || !startDate || !endDate) {
      return NextResponse.json(
        { message: "Missing required fields: scheduleId, locationId, startDate, endDate" },
        { status: 400 },
      );
    }

    const optimizationConstraints: OptimizationConstraints = {
      maxLaborCost: constraints?.maxLaborCost,
      minSkillCoverage: constraints?.minSkillCoverage,
      maxHoursPerEmployee: constraints?.maxHoursPerEmployee,
      requireSeniorityBalance: constraints?.requireSeniorityBalance ?? true,
      preferFullAvailability: constraints?.preferFullAvailability ?? true,
      allowOvertime: constraints?.allowOvertime ?? false,
    };

    const result = await optimizeSchedule(tenantId, {
      scheduleId,
      locationId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      constraints: optimizationConstraints,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    log.error("Failed to optimize schedule", { error });
    return NextResponse.json(
      { message: "Failed to optimize schedule" },
      { status: 500 },
    );
  }
}
