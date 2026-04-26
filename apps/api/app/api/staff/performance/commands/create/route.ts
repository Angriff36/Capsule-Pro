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

    const review = await database.performanceReview.create({
      data: {
        tenant_id: tenantId,
        employee_id: employeeId,
        reviewer_id: userId,
        review_type: reviewType,
        scheduled_date: new Date(scheduledDate),
        status: "scheduled",
      },
    });

    return manifestSuccessResponse({ review });
  } catch (error) {
    captureException(error);
    console.error("Error creating performance review:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
