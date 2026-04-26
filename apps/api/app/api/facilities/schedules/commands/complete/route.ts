// Complete preventive maintenance schedule
import { auth } from "@repo/auth/server";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const body = await request.json();
    const { scheduleId, notes, actualHours, actualCost } = body;

    if (!scheduleId) {
      return manifestErrorResponse("scheduleId is required", 400);
    }

    const existing =
      await database.preventiveMaintenanceSchedule.findFirst({
        where: { tenantId, id: scheduleId, deletedAt: null },
      });

    if (!existing) {
      return manifestErrorResponse("Schedule not found", 404);
    }

    const intervalDays = existing.intervalDays || 30;
    const now = new Date();
    const nextDue = new Date(
      now.getTime() + intervalDays * 24 * 60 * 60 * 1000
    );

    const schedule =
      await database.preventiveMaintenanceSchedule.update({
        where: { tenantId_id: { tenantId, id: scheduleId } },
        data: {
          lastCompletedAt: now,
          nextDueAt: nextDue,
        },
      });

    if (notes || actualHours || actualCost) {
      const count = await database.maintenanceWorkOrder.count({
        where: { tenantId },
      });
      const workOrderNumber = `WO-PM-${schedule.scheduleNumber}`;
      await database.maintenanceWorkOrder.create({
        data: {
          tenantId,
          workOrderNumber,
          workOrderType: "preventive",
          priority: "medium",
          status: "completed",
          title: `PM Completed: ${schedule.title}`,
          description: notes || null,
          completedAt: now,
          completedBy: userId,
          laborHours: actualHours ?? null,
          totalCost: actualCost ?? null,
        },
      });
    }

    const result = {
      id: schedule.id,
      schedule_number: schedule.scheduleNumber,
      title: schedule.title,
      last_completed_at: schedule.lastCompletedAt,
      next_due_at: schedule.nextDueAt,
    };

    return manifestSuccessResponse({ schedule: result });
  } catch (error) {
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
