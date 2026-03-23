// API route for listing maintenance work orders
import { auth } from "@repo/auth/server";
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
    const status = searchParams.get("status") || "open";
    const priority = searchParams.get("priority");
    const areaId = searchParams.get("areaId");
    const workOrderType = searchParams.get("workOrderType");

    const workOrders = await database.$queryRaw`
      SELECT 
        id, work_order_number, area_id, equipment_id, work_order_type,
        priority, status, title, description, reported_by, reported_at,
        assigned_to, assigned_vendor, scheduled_date, started_at,
        completed_at, completed_by, labor_hours, parts_cost, labor_cost,
        total_cost, notes, created_at, updated_at
      FROM tenant_facilities.maintenance_work_orders
      WHERE tenant_id = ${tenantId}::uuid
        AND deleted_at IS NULL
        ${status !== "all" ? database.Prisma.sql`AND status = ${status}` : database.Prisma.empty}
        ${priority ? database.Prisma.sql`AND priority = ${priority}` : database.Prisma.empty}
        ${areaId ? database.Prisma.sql`AND area_id = ${areaId}::uuid` : database.Prisma.empty}
        ${workOrderType ? database.Prisma.sql`AND work_order_type = ${workOrderType}` : database.Prisma.empty}
      ORDER BY 
        CASE priority 
          WHEN 'critical' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          WHEN 'low' THEN 4 
        END,
        reported_at DESC
    `;

    return manifestSuccessResponse({ workOrders });
  } catch (error) {
    console.error("Error listing work orders:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
