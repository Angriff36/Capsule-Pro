import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import {
  optimizeSchedule,
  type ScheduleOptimizationRequest,
} from "@/lib/staff/workforce-ai-optimizer";

/**
 * POST /api/staff/workforce-ai/optimize-schedule
 *
 * Optimize a schedule using AI-powered assignment algorithms.
 *
 * Body:
 * - scheduleId: string - The schedule to optimize
 * - locationId: string - Location for the schedule
 * - startDate: string (ISO 8601) - Start of schedule period
 * - endDate: string (ISO 8601) - End of schedule period
 * - constraints: OptimizationConstraints
 *   - maxLaborCost?: number
 *   - minSkillCoverage?: number (0-1)
 *   - maxHoursPerEmployee?: number
 *   - requireSeniorityBalance?: boolean
 *   - preferFullAvailability?: boolean
 *   - allowOvertime?: boolean
 */
export async function POST(request: Request) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);

  try {
    const body = await request.json();
    const {
      scheduleId,
      locationId,
      startDate,
      endDate,
      constraints = {},
    } = body as ScheduleOptimizationRequest & {
      startDate: string;
      endDate: string;
    };

    if (!(scheduleId && startDate && endDate)) {
      return NextResponse.json(
        { message: "Missing required fields: scheduleId, startDate, endDate" },
        { status: 400 }
      );
    }

    // Verify schedule exists and belongs to tenant
    const schedule = await database.$queryRaw<
      Array<{ id: string; tenant_id: string }>
    >(
      database.$queryRawUnsafe(
        `
        SELECT id, tenant_id
        FROM tenant_staff.schedules
        WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL
        `,
        [tenantId, scheduleId]
      )
    );

    if (!schedule || schedule.length === 0) {
      return NextResponse.json(
        { message: "Schedule not found" },
        { status: 404 }
      );
    }

    const result = await optimizeSchedule(tenantId, {
      scheduleId,
      locationId: locationId || "",
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      constraints,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error optimizing schedule:", error);
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Failed to optimize schedule",
      },
      { status: 500 }
    );
  }
}
