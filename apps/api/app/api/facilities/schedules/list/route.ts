// API route for listing preventive maintenance schedules

import { auth } from "@repo/auth/server";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
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

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") || "active";
    const overdue = searchParams.get("overdue") === "true";

    const scheduleRecords = await database.preventiveMaintenanceSchedule.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(status !== "all" ? { status } : {}),
        ...(overdue ? { nextDueAt: { lt: new Date() } } : {}),
      },
      orderBy: { nextDueAt: "asc" },
    });
    const schedules = scheduleRecords.map((schedule) => ({
      id: schedule.id,
      schedule_number: schedule.scheduleNumber,
      area_id: schedule.areaId,
      equipment_id: schedule.equipmentId,
      title: schedule.title,
      description: schedule.description,
      frequency: schedule.frequency,
      interval_days: schedule.intervalDays,
      last_completed_at: schedule.lastCompletedAt,
      next_due_at: schedule.nextDueAt,
      assigned_to: schedule.assignedTo,
      estimated_hours: schedule.estimatedHours,
      estimated_cost: schedule.estimatedCost,
      status: schedule.status,
      created_at: schedule.createdAt,
    }));

    return manifestSuccessResponse({ schedules });
  } catch (error) {
    captureException(error);
    log.error("Error listing preventive maintenance schedules:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
