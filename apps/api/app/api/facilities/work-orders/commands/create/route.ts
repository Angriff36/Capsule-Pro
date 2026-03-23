// API route for creating a maintenance work order
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
      workOrderType = "corrective",
      priority = "medium",
      title,
      description,
      scheduledDate,
      assignedTo,
      assignedVendor,
    } = body;

    if (!title) {
      return manifestErrorResponse("title is required", 400);
    }

    const validTypes = ["preventive", "corrective", "emergency", "inspection"];
    const validPriorities = ["critical", "high", "medium", "low"];

    if (!validTypes.includes(workOrderType)) {
      return manifestErrorResponse(`Invalid work order type. Must be one of: ${validTypes.join(", ")}`, 400);
    }

    if (!validPriorities.includes(priority)) {
      return manifestErrorResponse(`Invalid priority. Must be one of: ${validPriorities.join(", ")}`, 400);
    }

    // Generate work order number
    const countResult = await database.$queryRaw`
      SELECT COUNT(*)::int as count FROM tenant_facilities.maintenance_work_orders
      WHERE tenant_id = ${tenantId}::uuid
    `;
    const count = (countResult as any[])[0]?.count || 0;
    const workOrderNumber = `WO-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;

    const result = await database.$queryRaw`
      INSERT INTO tenant_facilities.maintenance_work_orders (
        tenant_id, work_order_number, area_id, equipment_id, work_order_type,
        priority, status, title, description, reported_by, reported_at,
        assigned_to, assigned_vendor, scheduled_date
      ) VALUES (
        ${tenantId}::uuid,
        ${workOrderNumber},
        ${areaId || null}::uuid,
        ${equipmentId || null}::uuid,
        ${workOrderType},
        ${priority},
        'open',
        ${title},
        ${description || null},
        ${userId}::uuid,
        NOW(),
        ${assignedTo || null}::uuid,
        ${assignedVendor || null},
        ${scheduledDate ? new Date(scheduledDate) : null}
      )
      RETURNING id, work_order_number, area_id, equipment_id, work_order_type,
        priority, status, title, description, reported_at, scheduled_date, created_at
    `;

    return manifestSuccessResponse({ workOrder: (result as any[])[0] });
  } catch (error) {
    console.error("Error creating work order:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
