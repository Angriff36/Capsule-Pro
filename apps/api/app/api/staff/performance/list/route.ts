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

    const where = {
      tenant_id: tenantId,
      deleted_at: null,
      ...(status && status !== "all" ? { status } : {}),
      ...(employeeId ? { employee_id: employeeId } : {}),
    };

    const reviews = await database.performanceReview.findMany({
      where,
      orderBy: { scheduled_date: "desc" },
    });

    // Fetch employee and reviewer names
    const employeeIds = [...new Set(reviews.map((r) => r.employee_id))];
    const reviewerIds = [...new Set(reviews.map((r) => r.reviewer_id))];
    const allUserIds = [...new Set([...employeeIds, ...reviewerIds])];

    const users =
      allUserIds.length > 0
        ? await database.user.findMany({
            where: { id: { in: allUserIds } },
            select: { id: true, firstName: true, lastName: true },
          })
        : [];
    const userMap = new Map(
      users.map((u) => [u.id, `${u.firstName} ${u.lastName}`])
    );

    const enrichedReviews = reviews.map((review) => ({
      ...review,
      employee_name: userMap.get(review.employee_id) ?? "Unknown",
      reviewer_name: userMap.get(review.reviewer_id) ?? "Unknown",
    }));

    return manifestSuccessResponse({ reviews: enrichedReviews });
  } catch (error) {
    captureException(error);
    console.error("Error listing performance reviews:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
