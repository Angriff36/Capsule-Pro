// List preventive maintenance schedules
import { auth } from "@repo/auth/server";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

function mapScheduleToSnake(s: {
  id: string;
  scheduleNumber: string;
  areaId: string | null;
  equipmentId: string | null;
  title: string;
  description: string | null;
  frequency: string;
  intervalDays: number;
  lastCompletedAt: Date | null;
  nextDueAt: Date;
  assignedTo: string | null;
  estimatedHours: { toNumber: () => number } | null;
  estimatedCost: { toNumber: () => number } | null;
  status: string;
  createdAt: Date;
}) {
  return {
    id: s.id,
    schedule_number: s.scheduleNumber,
    area_id: s.areaId,
    equipment_id: s.equipmentId,
    title: s.title,
    description: s.description,
    frequency: s.frequency,
    interval_days: s.intervalDays,
    last_completed_at: s.lastCompletedAt,
    next_due_at: s.nextDueAt,
    assigned_to: s.assignedTo,
    estimated_hours: s.estimatedHours?.toNumber?.() ?? null,
    estimated_cost: s.estimatedCost?.toNumber?.() ?? null,
    status: s.status,
    created_at: s.createdAt,
  };
}

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

    const schedules = await database.preventiveMaintenanceSchedule.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(status !== "all" && { status }),
        ...(overdue && { nextDueAt: { lt: new Date() } }),
      },
      orderBy: { nextDueAt: "asc" },
    });

    return manifestSuccessResponse({
      schedules: schedules.map(mapScheduleToSnake),
    });
  } catch (error) {
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
