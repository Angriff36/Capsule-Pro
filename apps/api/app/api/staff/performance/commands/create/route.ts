// Create a performance review
import { auth } from "@repo/auth/server";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";
import { log } from "@repo/observability/log";

export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) return manifestErrorResponse("Unauthorized", 401);

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) return manifestErrorResponse("Tenant not found", 400);

    const body = await request.json();
    const { employeeId, reviewType, scheduledDate } = body;

    if (!(employeeId && reviewType && scheduledDate)) {
      return manifestErrorResponse(
        "employeeId, reviewType, and scheduledDate are required",
        400
      );
    }

    const validTypes = ["ANNUAL", "SIX_MONTH", "COACHING", "PROBATION"];
    if (!validTypes.includes(reviewType)) {
      return manifestErrorResponse(
        `Invalid reviewType. Must be one of: ${validTypes.join(", ")}`,
        400
      );
    }

    const result = await database.$queryRaw`
      INSERT INTO tenant_staff.performance_reviews (
        tenant_id, employee_id, reviewer_id, review_type, scheduled_date, status
      ) VALUES (
        ${tenantId}::uuid,
        ${employeeId}::uuid,
        ${userId}::uuid,
        ${reviewType},
        ${new Date(scheduledDate)}::timestamptz,
        'scheduled'
      )
      RETURNING id, employee_id, reviewer_id, review_type, scheduled_date, status, created_at
    `;

    return manifestSuccessResponse({ review: (result as any[])[0] });
  } catch (error) {
    captureException(error);
    log.error("Error creating performance review:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
