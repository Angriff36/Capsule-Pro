// Update preventive maintenance schedule
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

    const {
      scheduleId,
      title,
      description,
      frequency,
      intervalDays,
      nextDueDate,
      assignedTo,
      estimatedHours,
      estimatedCost,
      status,
    } = await request.json();

    if (!scheduleId) {
      return manifestErrorResponse("scheduleId is required", 400);
    }

    const result = await database.$queryRaw`
      UPDATE tenant_facilities.preventive_maintenance_schedules
      SET
        title = COALESCE(${title ?? null}, title),
        description = COALESCE(${description ?? null}, description),
        frequency = COALESCE(${frequency ?? null}, frequency),
        interval_days = COALESCE(${intervalDays ?? null}, interval_days),
        next_due_at = COALESCE(${nextDueDate ? new Date(nextDueDate) : null}, next_due_at),
        assigned_to = COALESCE(${assignedTo ?? null}::uuid, assigned_to),
        estimated_hours = COALESCE(${estimatedHours ?? null}, estimated_hours),
        estimated_cost = COALESCE(${estimatedCost ?? null}, estimated_cost),
        status = COALESCE(${status ?? null}, status),
        updated_at = NOW()
      WHERE tenant_id = ${tenantId}::uuid
        AND id = ${scheduleId}::uuid
        AND deleted_at IS NULL
      RETURNING id, schedule_number, title, frequency, interval_days, next_due_at, status
    `;

    if (!(result as unknown[]).length) {
      return manifestErrorResponse("Schedule not found", 404);
    }

    return manifestSuccessResponse({ schedule: (result as unknown[])[0] });
  } catch (error) {
    captureException(error);
    log.error("Error updating maintenance schedule:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
