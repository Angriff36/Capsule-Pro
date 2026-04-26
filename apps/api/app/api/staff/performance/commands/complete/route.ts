// Complete a performance review
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
    const {
      reviewId,
      rating,
      strengths,
      areasForImprovement,
      goalsNextPeriod,
      managerComments,
    } = body;

    if (!(reviewId && rating)) {
      return manifestErrorResponse("reviewId and rating are required", 400);
    }

    if (rating < 1 || rating > 5) {
      return manifestErrorResponse("Rating must be between 1 and 5", 400);
    }

    const review = await database.performanceReview.updateMany({
      where: {
        tenant_id: tenantId,
        id: reviewId,
        deleted_at: null,
      },
      data: {
        status: "completed",
        completed_date: new Date(),
        rating,
        strengths: strengths ?? null,
        areas_for_improvement: areasForImprovement ?? null,
        goals_next_period: goalsNextPeriod ?? null,
        manager_comments: managerComments ?? null,
        updated_at: new Date(),
      },
    });

    if (review.count === 0) {
      return manifestErrorResponse("Review not found", 404);
    }

    return manifestSuccessResponse({
      review: {
        id: reviewId,
        status: "completed",
        rating,
        completed_date: new Date(),
      },
    });
  } catch (error) {
    captureException(error);
    console.error("Error completing performance review:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
