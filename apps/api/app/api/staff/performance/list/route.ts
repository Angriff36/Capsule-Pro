// List performance reviews
import { auth } from "@repo/auth/server";
import { captureException } from "@sentry/nextjs";
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
    if (!(userId && orgId)) return manifestErrorResponse("Unauthorized", 401);

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) return manifestErrorResponse("Tenant not found", 400);

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const employeeId = searchParams.get("employeeId");

    let whereClause = "WHERE pr.tenant_id = $1::uuid AND pr.deleted_at IS NULL";
    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (status && status !== "all") {
      whereClause += ` AND pr.status = $${paramIndex}::text`;
      params.push(status);
      paramIndex++;
    }

    if (employeeId) {
      whereClause += ` AND pr.employee_id = $${paramIndex}::uuid`;
      params.push(employeeId);
      paramIndex++;
    }

    const reviews = await database.$queryRawUnsafe(
      `
      SELECT
        pr.id, pr.employee_id, pr.reviewer_id, pr.review_type,
        pr.scheduled_date, pr.completed_date, pr.status,
        pr.rating, pr.strengths, pr.areas_for_improvement,
        pr.goals_next_period, pr.manager_comments, pr.employee_comments,
        pr.created_at,
        e.first_name || ' ' || e.last_name as employee_name,
        r.first_name || ' ' || r.last_name as reviewer_name
      FROM tenant_staff.performance_reviews pr
      LEFT JOIN accounts.users e ON e.id = pr.employee_id
      LEFT JOIN accounts.users r ON r.id = pr.reviewer_id
      ${whereClause}
      ORDER BY pr.scheduled_date DESC
    `,
      ...params
    );

    return manifestSuccessResponse({ reviews });
  } catch (error) {
    captureException(error);
    console.error("Error listing performance reviews:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
