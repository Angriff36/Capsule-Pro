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

// Get a single task with comments
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
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
        comments: {
          where: {
            deletedAt: null,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!task || task.workspace.members.length === 0) {
      return manifestErrorResponse("Task not found or access denied", 404);
    }

    return manifestSuccessResponse({ task });
  } catch (error) {
    console.error("Error fetching task:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}

// Update a task
export async function PATCH(request: NextRequest, context: RouteContext) {
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
    const {
      title,
      description,
      status,
      priority,
      dueDate,
      assignedTo,
      position,
      version,
    } = body;

    // Get current task
    const currentTask = await database.eventWorkspaceTask.findFirst({
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
                role: { in: ["owner", "editor"] },
              },
            },
          },
        },
      },
    });

    if (!currentTask || currentTask.workspace.members.length === 0) {
      return manifestErrorResponse(
        "Task not found or insufficient permissions",
        404
      );
    }

    // Check version for optimistic concurrency
    if (version !== undefined && currentTask.version !== version) {
      return manifestErrorResponse(
        "Task was modified by another user. Please refresh.",
        409
      );
    }

    const updateData: Record<string, unknown> = {
      version: currentTask.version + 1,
    };

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) {
      updateData.status = status;
      if (status === "done") {
        updateData.completedAt = new Date();
      } else if (currentTask.status === "done" && status !== "done") {
        updateData.completedAt = null;
      }
    }
    if (priority !== undefined) updateData.priority = priority;
    if (dueDate !== undefined)
      updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo;
    if (position !== undefined) updateData.position = position;

    const task = await database.eventWorkspaceTask.update({
      where: {
        tenantId_id: {
          tenantId,
          id: taskId,
        },
      },
      data: updateData,
      include: {
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    return manifestSuccessResponse({ task });
  } catch (error) {
    console.error("Error updating task:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}

// Delete a task
export async function DELETE(request: NextRequest, context: RouteContext) {
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

    // Check permissions
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
                role: { in: ["owner", "editor"] },
              },
            },
          },
        },
      },
    });

    if (!task || task.workspace.members.length === 0) {
      return manifestErrorResponse(
        "Task not found or insufficient permissions",
        404
      );
    }

    await database.eventWorkspaceTask.update({
      where: {
        tenantId_id: {
          tenantId,
          id: taskId,
        },
      },
      data: {
        deletedAt: new Date(),
      },
    });

    return manifestSuccessResponse({ success: true });
  } catch (error) {
    console.error("Error deleting task:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
