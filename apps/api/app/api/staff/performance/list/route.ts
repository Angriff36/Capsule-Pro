// List performance reviews — converted from $queryRawUnsafe to Prisma ORM
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
    if (!(userId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const employeeId = searchParams.get("employeeId");

    const where: Record<string, unknown> = {
      tenantId,
      deletedAt: null,
    };
    if (status && status !== "all") {
      where.status = status;
    }
    if (employeeId) {
      where.employee_id = employeeId;
    }

    const reviews = await database.performanceReview.findMany({
      where,
      orderBy: { scheduled_date: "desc" },
    });

    if (reviews.length === 0) {
      return manifestSuccessResponse({ reviews: [] });
    }

    // Batch fetch employee and reviewer names
    const userIds = [
      ...new Set([
        ...reviews.map((r) => r.employee_id),
        ...reviews.map((r) => r.reviewer_id),
      ]),
    ];
    const users = await database.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true },
    });
    const userMap = new Map(
      users.map((u) => [u.id, `${u.firstName} ${u.lastName}`])
    );

    const shaped = reviews.map((r) => ({
      id: r.id,
      employee_id: r.employee_id,
      reviewer_id: r.reviewer_id,
      review_type: r.review_type,
      scheduled_date: r.scheduled_date,
      completed_date: r.completed_date,
      status: r.status,
      rating: r.rating,
      strengths: r.strengths,
      areas_for_improvement: r.areas_for_improvement,
      goals_next_period: r.goals_next_period,
      manager_comments: r.manager_comments,
      employee_comments: r.employee_comments,
      created_at: r.created_at,
      employee_name: userMap.get(r.employee_id) || null,
      reviewer_name: userMap.get(r.reviewer_id) || null,
    }));

    return manifestSuccessResponse({ reviews: shaped });
  } catch (error) {
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
