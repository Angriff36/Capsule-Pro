// Activity Feed API Route
// Provides a unified feed of all system events, entity changes, AI plan approvals, and collaborator actions

import { auth } from "@repo/auth/server";
import type { Prisma } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import { getReactionLogActivities } from "@/app/lib/activity-feed-service";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

export interface ActivityFeedItem {
  action: string;
  activityType: string;
  correlationId: string | null;
  createdAt: Date;
  description: string | null;
  entityId: string | null;
  entityType: string | null;
  id: string;
  importance: string;
  metadata: unknown;
  parentId: string | null;
  performedBy: string | null;
  performerName: string | null;
  sourceId: string | null;
  sourceType: string | null;
  tenantId: string;
  title: string;
  visibility: string;
}

// GET /api/activity-feed - List activities with filtering and pagination
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

    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const activityType = searchParams.get("activityType");
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");
    const performedBy = searchParams.get("performedBy");
    const importance = searchParams.get("importance");
    const sourceType = searchParams.get("sourceType");
    const correlationId = searchParams.get("correlationId");

    // Pagination
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 200);
    const offset = Number(searchParams.get("offset")) || 0;

    // Date range filter
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Build where clause
    const where: Prisma.ActivityFeedWhereInput = {
      tenantId,
    };

    if (activityType) {
      where.activityType = activityType;
    }
    if (entityType) {
      where.entityType = entityType;
    }
    if (entityId) {
      where.entityId = entityId;
    }
    if (performedBy) {
      where.performedBy = performedBy;
    }
    if (importance) {
      where.importance = importance;
    }
    if (sourceType) {
      where.sourceType = sourceType;
    }
    if (correlationId) {
      where.correlationId = correlationId;
    }

    // Add date range filters if provided
    if (startDate || endDate) {
      where.createdAt = {
        gte: startDate ? new Date(startDate) : undefined,
        lte: endDate ? new Date(endDate) : undefined,
      };
    }

    // Get total count for pagination
    const totalCount = await database.activityFeed.count({ where });

    // Fetch activities with pagination
    let activities = await database.activityFeed.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      skip: offset,
    });

    let effectiveTotal = totalCount;

    // When ActivityFeed is empty, surface historical command activity from
    // reaction_logs (written on every governed command) until feed rows exist.
    const hasActivityFeedOnlyFilters = Boolean(
      activityType ||
        entityId ||
        performedBy ||
        importance ||
        sourceType ||
        correlationId
    );

    if (totalCount === 0 && !hasActivityFeedOnlyFilters) {
      const fallback = await getReactionLogActivities(tenantId, {
        limit,
        offset,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        entityType: entityType ?? undefined,
      });
      activities = fallback.activities as typeof activities;
      effectiveTotal = fallback.totalCount;
    }

    const hasMore = offset + activities.length < effectiveTotal;

    return manifestSuccessResponse({
      activities: activities as ActivityFeedItem[],
      hasMore,
      totalCount: effectiveTotal,
    });
  } catch (error) {
    captureException(error);
    log.error("Error fetching activity feed:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
