import { auth } from "@repo/auth/server";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

interface RouteContext {
  params: Promise<{
    workspaceId: string;
  }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const { workspaceId } = await context.params;
    const tenantId = await getTenantIdForOrg(orgId);

    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const { searchParams } = new URL(request.url);
    const limit = Number.parseInt(searchParams.get("limit") ?? "50", 10);
    const offset = Number.parseInt(searchParams.get("offset") ?? "0", 10);

    // Verify user has access to workspace
    const workspace = await database.eventWorkspace.findFirst({
      where: {
        tenantId,
        id: workspaceId,
        deletedAt: null,
      },
      include: {
        members: {
          where: {
            userId,
            status: "active",
          },
        },
      },
    });

    if (!workspace || workspace.members.length === 0) {
      return manifestErrorResponse("Workspace not found or access denied", 404);
    }

    // Get activity feed entries for this workspace
    const activities = await database.activityFeed.findMany({
      where: {
        tenantId,
        entityType: "EventWorkspace",
        entityId: workspaceId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: Math.min(limit, 200),
      skip: offset,
    });

    // Also get task-related activities
    const taskActivities = await database.activityFeed.findMany({
      where: {
        tenantId,
        entityType: "EventWorkspaceTask",
        entityId: {
          in: (
            await database.eventWorkspaceTask.findMany({
              where: {
                tenantId,
                workspaceId,
                deletedAt: null,
              },
              select: { id: true },
            })
          ).map((t) => t.id),
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: Math.min(limit, 200),
    });

    // Merge and sort by date
    const allActivities = [...activities, ...taskActivities]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);

    return manifestSuccessResponse({ activities: allActivities });
  } catch (error) {
    console.error("Error fetching workspace activity:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
