// API route for listing preventive maintenance schedules
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
    const status = searchParams.get("status") || "active";
    const overdue = searchParams.get("overdue") === "true";

    const schedules = await database.$queryRaw`
      SELECT 
        id, schedule_number, area_id, equipment_id, title, description,
        frequency, interval_days, last_completed_at, next_due_at,
        assigned_to, estimated_hours, estimated_cost, status, created_at
      FROM tenant_facilities.preventive_maintenance_schedules
      WHERE tenant_id = ${tenantId}::uuid
        AND deleted_at IS NULL
        ${status !== "all" ? database.Prisma.sql`AND status = ${status}` : database.Prisma.empty}
        ${overdue ? database.Prisma.sql`AND next_due_at < NOW()` : database.Prisma.empty}
      ORDER BY next_due_at ASC
    `;

    return manifestSuccessResponse({ schedules });
  } catch (error) {
    console.error("Error listing preventive maintenance schedules:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
