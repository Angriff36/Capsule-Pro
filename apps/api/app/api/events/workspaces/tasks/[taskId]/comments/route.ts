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
    taskId: string;
  }>;
}

// Get comments for a task
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const { taskId } = await context.params;
    const tenantId = await getTenantIdForOrg(orgId);

    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    // Verify user has access to the task
    const task = await database.eventWorkspaceTask.findFirst({
      where: {
        tenantId,
        id: taskId,
        deletedAt: null,
      },
      include: {
        workspace: {
          include: {
            members: {
              where: {
                userId,
                status: "active",
              },
            },
          },
        },
      },
    });

    if (!task || task.workspace.members.length === 0) {
      return manifestErrorResponse("Task not found or access denied", 404);
    }

    const comments = await database.eventWorkspaceTaskComment.findMany({
      where: {
        tenantId,
        taskId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return manifestSuccessResponse({ comments });
  } catch (error) {
    console.error("Error fetching comments:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}

// Create a comment
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const { taskId } = await context.params;
    const tenantId = await getTenantIdForOrg(orgId);

    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const body = await request.json();
    const { content, contentType } = body;

    if (!content) {
      return manifestErrorResponse("content is required", 400);
    }

    // Verify user has access to the task
    const task = await database.eventWorkspaceTask.findFirst({
      where: {
        tenantId,
        id: taskId,
        deletedAt: null,
      },
      include: {
        workspace: {
          include: {
            members: {
              where: {
                userId,
                status: "active",
              },
            },
          },
        },
      },
    });

    if (!task || task.workspace.members.length === 0) {
      return manifestErrorResponse("Task not found or access denied", 404);
    }

    // Get user info
    const user = await database.user.findUnique({
      where: {
        tenantId_id: {
          tenantId,
          id: userId,
        },
      },
      select: {
        firstName: true,
        lastName: true,
      },
    });

    const authorName = user
      ? `${user.firstName} ${user.lastName}`.trim()
      : "Unknown User";

    const comment = await database.eventWorkspaceTaskComment.create({
      data: {
        tenantId,
        taskId,
        content,
        contentType: contentType ?? "text",
        version: 1,
        authorId: userId,
        authorName,
      },
    });

    return manifestSuccessResponse({ comment }, 201);
  } catch (error) {
    console.error("Error creating comment:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
