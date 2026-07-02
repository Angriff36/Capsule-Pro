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
      orderBy: { scheduledDate: "desc" },
    });

    if (reviews.length === 0) {
      return manifestSuccessResponse({ reviews: [] });
    }

    // Batch fetch employee and reviewer names
    const userIds = [
      ...new Set([
        ...reviews.map((r) => r.employeeId),
        ...reviews.map((r) => r.reviewerId),
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
      employeeId: r.employeeId,
      reviewerId: r.reviewerId,
      reviewType: r.reviewType,
      scheduledDate: r.scheduledDate,
      completedDate: r.completedDate,
      status: r.status,
      rating: r.rating,
      strengths: r.strengths,
      areas_for_improvement: r.areas_for_improvement,
      goals_next_period: r.goals_next_period,
      manager_comments: r.manager_comments,
      employee_comments: r.employee_comments,
      createdAt: r.createdAt,
      employee_name: userMap.get(r.employeeId) || null,
      reviewer_name: userMap.get(r.reviewerId) || null,
    }));

    return manifestSuccessResponse({ reviews: shaped });
  } catch (error) {
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
