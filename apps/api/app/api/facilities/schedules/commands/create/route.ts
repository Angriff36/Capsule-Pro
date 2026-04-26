// Create preventive maintenance schedule
import { auth } from "@repo/auth/server";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

const VALID_FREQUENCIES = [
  "daily",
  "weekly",
  "biweekly",
  "monthly",
  "quarterly",
  "semiannual",
  "annual",
];

const FREQUENCY_DAYS: Record<string, number> = {
  daily: 1,
  weekly: 7,
  biweekly: 14,
  monthly: 30,
  quarterly: 90,
  semiannual: 180,
  annual: 365,
};

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
    const {
      areaId,
      equipmentId,
      title,
      description,
      frequency = "monthly",
      intervalDays = 30,
      nextDueDate,
      assignedTo,
      estimatedHours,
      estimatedCost,
    } = body;

    if (!title) {
      return manifestErrorResponse("title is required", 400);
    }

    if (!VALID_FREQUENCIES.includes(frequency)) {
      return manifestErrorResponse(
        `Invalid frequency. Must be one of: ${VALID_FREQUENCIES.join(", ")}`,
        400
      );
    }

    const days = intervalDays || FREQUENCY_DAYS[frequency] || 30;
    const nextDue = nextDueDate
      ? new Date(nextDueDate)
      : new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const count = await database.preventiveMaintenanceSchedule.count({
      where: { tenantId },
    });
    const scheduleNumber = `PM-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

    const schedule =
      await database.preventiveMaintenanceSchedule.create({
        data: {
          tenantId,
          scheduleNumber,
          areaId: areaId || null,
          equipmentId: equipmentId || null,
          title,
          description: description || null,
          frequency,
          intervalDays: days,
          nextDueAt: nextDue,
          assignedTo: assignedTo || null,
          estimatedHours: estimatedHours ?? null,
          estimatedCost: estimatedCost ?? null,
        },
      });

    const result = {
      id: schedule.id,
      schedule_number: schedule.scheduleNumber,
      title: schedule.title,
      frequency: schedule.frequency,
      interval_days: schedule.intervalDays,
      next_due_at: schedule.nextDueAt,
      status: schedule.status,
      created_at: schedule.createdAt,
    };

    return manifestSuccessResponse({ schedule: result });
  } catch (error) {
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
