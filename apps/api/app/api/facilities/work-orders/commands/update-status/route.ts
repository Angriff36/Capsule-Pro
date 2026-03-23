// API route for updating work order status
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
      workOrderId,
      status,
      laborHours,
      partsCost,
      laborCost,
      notes,
    } = body;

    if (!workOrderId) {
      return manifestErrorResponse("workOrderId is required", 400);
    }

    const validStatuses = ["open", "assigned", "in_progress", "parts_ordered", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return manifestErrorResponse(`Invalid status. Must be one of: ${validStatuses.join(", ")}`, 400);
    }

    // Verify work order exists and belongs to tenant
    const existing = await database.$queryRaw`
      SELECT id, status FROM tenant_facilities.maintenance_work_orders
      WHERE tenant_id = ${tenantId}::uuid AND id = ${workOrderId}::uuid AND deleted_at IS NULL
    `;

    if (!existing || (existing as any[]).length === 0) {
      return manifestErrorResponse("Work order not found", 404);
    }

    const totalCost = (partsCost || 0) + (laborCost || 0);
    const completedAt = status === "completed" ? new Date() : null;
    const startedAt = status === "in_progress" ? new Date() : null;

    const result = await database.$queryRaw`
      UPDATE tenant_facilities.maintenance_work_orders
      SET 
        status = ${status},
        started_at = COALESCE(started_at, ${startedAt}),
        completed_at = ${completedAt},
        completed_by = CASE WHEN ${status} = 'completed' THEN ${userId}::uuid ELSE completed_by END,
        labor_hours = COALESCE(${laborHours || null}, labor_hours),
        parts_cost = COALESCE(${partsCost || null}, parts_cost),
        labor_cost = COALESCE(${laborCost || null}, labor_cost),
        total_cost = CASE WHEN ${totalCost > 0} THEN ${totalCost} ELSE total_cost END,
        notes = COALESCE(${notes || null}, notes),
        updated_at = NOW()
      WHERE tenant_id = ${tenantId}::uuid AND id = ${workOrderId}::uuid
      RETURNING id, work_order_number, status, completed_at, total_cost
    `;

    return manifestSuccessResponse({ workOrder: (result as any[])[0] });
  } catch (error) {
    console.error("Error updating work order:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
