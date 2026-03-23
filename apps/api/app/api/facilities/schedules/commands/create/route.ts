// API route for creating a preventive maintenance schedule
import { auth } from "@repo/auth/server";
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

    const validFrequencies = ["daily", "weekly", "biweekly", "monthly", "quarterly", "semiannual", "annual"];
    if (!validFrequencies.includes(frequency)) {
      return manifestErrorResponse(`Invalid frequency. Must be one of: ${validFrequencies.join(", ")}`, 400);
    }

    // Map frequency to interval days if not provided
    const frequencyDays: Record<string, number> = {
      daily: 1,
      weekly: 7,
      biweekly: 14,
      monthly: 30,
      quarterly: 90,
      semiannual: 180,
      annual: 365,
    };
    const days = intervalDays || frequencyDays[frequency] || 30;

    // Generate schedule number
    const countResult = await database.$queryRaw`
      SELECT COUNT(*)::int as count FROM tenant_facilities.preventive_maintenance_schedules
      WHERE tenant_id = ${tenantId}::uuid
    `;
    const count = (countResult as any[])[0]?.count || 0;
    const scheduleNumber = `PM-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

    const nextDue = nextDueDate ? new Date(nextDueDate) : new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const result = await database.$queryRaw`
      INSERT INTO tenant_facilities.preventive_maintenance_schedules (
        tenant_id, schedule_number, area_id, equipment_id, title, description,
        frequency, interval_days, next_due_at, assigned_to, estimated_hours, estimated_cost
      ) VALUES (
        ${tenantId}::uuid,
        ${scheduleNumber},
        ${areaId || null}::uuid,
        ${equipmentId || null}::uuid,
        ${title},
        ${description || null},
        ${frequency},
        ${days},
        ${nextDue},
        ${assignedTo || null}::uuid,
        ${estimatedHours || null},
        ${estimatedCost || null}
      )
      RETURNING id, schedule_number, title, frequency, interval_days, next_due_at, status, created_at
    `;

    return manifestSuccessResponse({ schedule: (result as any[])[0] });
  } catch (error) {
    console.error("Error creating preventive maintenance schedule:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
