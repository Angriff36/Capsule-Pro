// API route for marking a preventive maintenance schedule as completed
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
    const { scheduleId, notes, actualHours, actualCost } = body;

    if (!scheduleId) {
      return manifestErrorResponse("scheduleId is required", 400);
    }

    // Verify schedule exists and belongs to tenant
    const existing = await database.$queryRaw`
      SELECT id, interval_days FROM tenant_facilities.preventive_maintenance_schedules
      WHERE tenant_id = ${tenantId}::uuid AND id = ${scheduleId}::uuid AND deleted_at IS NULL
    `;

    if (!existing || (existing as any[]).length === 0) {
      return manifestErrorResponse("Schedule not found", 404);
    }

    const intervalDays = (existing as any[])[0]?.interval_days || 30;
    const now = new Date();
    const nextDue = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);

    // Update schedule with completion and calculate next due date
    const result = await database.$queryRaw`
      UPDATE tenant_facilities.preventive_maintenance_schedules
      SET 
        last_completed_at = NOW(),
        next_due_at = ${nextDue},
        updated_at = NOW()
      WHERE tenant_id = ${tenantId}::uuid AND id = ${scheduleId}::uuid
      RETURNING id, schedule_number, title, last_completed_at, next_due_at
    `;

    // Optionally create a work order for record-keeping
    if (notes || actualHours || actualCost) {
      const schedule = (result as any[])[0];
      await database.$queryRaw`
        INSERT INTO tenant_facilities.maintenance_work_orders (
          tenant_id, work_order_number, work_order_type, priority, status,
          title, description, completed_at, completed_by, labor_hours, total_cost
        ) VALUES (
          ${tenantId}::uuid,
          'WO-PM-' || ${schedule.schedule_number},
          'preventive',
          'medium',
          'completed',
          ${`PM Completed: ${schedule.title}`},
          ${notes || null},
          NOW(),
          ${userId}::uuid,
          ${actualHours || null},
          ${actualCost || null}
        )
      `;
    }

    return manifestSuccessResponse({ schedule: (result as any[])[0] });
  } catch (error) {
    console.error("Error completing preventive maintenance:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
