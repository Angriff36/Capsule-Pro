// Complete a performance review
import { auth } from "@repo/auth/server";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import { manifestErrorResponse, manifestSuccessResponse } from "@/lib/manifest-response";

export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) return manifestErrorResponse("Unauthorized", 401);

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) return manifestErrorResponse("Tenant not found", 400);

    const body = await request.json();
    const { reviewId, rating, strengths, areasForImprovement, goalsNextPeriod, managerComments } = body;

    if (!reviewId || !rating) {
      return manifestErrorResponse("reviewId and rating are required", 400);
    }

    if (rating < 1 || rating > 5) {
      return manifestErrorResponse("Rating must be between 1 and 5", 400);
    }

    const result = await database.$queryRaw`
      UPDATE tenant_staff.performance_reviews
      SET
        status = 'completed',
        completed_date = NOW(),
        rating = ${rating}::decimal(3,2),
        strengths = ${strengths || null}::text,
        areas_for_improvement = ${areasForImprovement || null}::text,
        goals_next_period = ${goalsNextPeriod || null}::text,
        manager_comments = ${managerComments || null}::text,
        updated_at = NOW()
      WHERE tenant_id = ${tenantId}::uuid AND id = ${reviewId}::uuid AND deleted_at IS NULL
      RETURNING id, status, rating, completed_date
    `;

    if (!(result as any[]).length) {
      return manifestErrorResponse("Review not found", 404);
    }

    return manifestSuccessResponse({ review: (result as any[])[0] });
  } catch (error) {
    console.error("Error completing performance review:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
