// Activity Feed API Route
// Provides a unified feed of all system events, entity changes, AI plan approvals, and collaborator actions

import { auth } from "@repo/auth/server";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

export interface ActivityFeedItem {
  id: string;
  tenantId: string;
  activityType: string;
  entityType: string | null;
  entityId: string | null;
  action: string;
  title: string;
  description: string | null;
  metadata: unknown;
  performedBy: string | null;
  performerName: string | null;
  correlationId: string | null;
  parentId: string | null;
  sourceType: string | null;
  sourceId: string | null;
  importance: string;
  visibility: string;
  createdAt: Date;
}

interface ActivityFeedResponse {
  activities: ActivityFeedItem[];
  hasMore: boolean;
  totalCount: number;
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
    const where: Record<string, unknown> = {
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
      where.createdAt = { gte: startDate ? new Date(startDate) : undefined, lte: endDate ? new Date(endDate) : undefined } as any;
    }

    // Get total count for pagination
    const totalCount = await database.activityFeed.count({ where });

    // Fetch activities with pagination
    const activities = await database.activityFeed.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      skip: offset,
    });

    const hasMore = offset + activities.length < totalCount;

    return manifestSuccessResponse<ActivityFeedResponse>({
      activities: activities as ActivityFeedItem[],
      hasMore,
      totalCount,
    });
  } catch (error) {
    console.error("Error fetching activity feed:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
