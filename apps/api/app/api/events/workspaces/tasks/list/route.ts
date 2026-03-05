import { auth } from "@repo/auth/server";
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

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    const status = searchParams.get("status");

    if (!workspaceId) {
      return manifestErrorResponse("workspaceId is required", 400);
    }

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

    const where: Record<string, unknown> = {
      tenantId,
      workspaceId,
      deletedAt: null,
    };

    if (status) {
      where.status = status;
    }

    const tasks = await database.eventWorkspaceTask.findMany({
      where,
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
        _count: {
          select: {
            comments: true,
          },
        },
      },
      orderBy: [{ status: "asc" }, { position: "asc" }, { createdAt: "desc" }],
    });

    return manifestSuccessResponse({ tasks });
  } catch (error) {
    console.error("Error fetching workspace tasks:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);

    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const body = await request.json();
    const { workspaceId, title, description, priority, dueDate, assignedTo } =
      body;

    if (!(workspaceId && title)) {
      return manifestErrorResponse("workspaceId and title are required", 400);
    }

    // Verify user has edit access to workspace
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
            role: { in: ["owner", "editor"] },
          },
        },
      },
    });

    if (!workspace || workspace.members.length === 0) {
      return manifestErrorResponse(
        "Workspace not found or insufficient permissions",
        404
      );
    }

    // Get the highest position for new task
    const maxPositionTask = await database.eventWorkspaceTask.findFirst({
      where: {
        tenantId,
        workspaceId,
        deletedAt: null,
      },
      orderBy: {
        position: "desc",
      },
      select: {
        position: true,
      },
    });

    const newPosition = (maxPositionTask?.position ?? -1) + 1;

    const task = await database.eventWorkspaceTask.create({
      data: {
        tenantId,
        workspaceId,
        title,
        description,
        priority: priority ?? "medium",
        dueDate: dueDate ? new Date(dueDate) : null,
        assignedToTenantId: assignedTo ? tenantId : null,
        assignedTo,
        createdByTenantId: userId ? tenantId : null,
        createdBy: userId,
        position: newPosition,
        version: 1,
      },
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

    return manifestSuccessResponse({ task }, 201);
  } catch (error) {
    console.error("Error creating workspace task:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
