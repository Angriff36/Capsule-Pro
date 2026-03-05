// API endpoint for getting a public template by shareId

import { auth } from "@repo/auth/server";
import type { NextRequest } from "next/server";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  try {
    const { shareId } = await params;

    if (!shareId) {
      return manifestErrorResponse("Share ID is required", 400);
    }

    // Get template by shareId (must be public)
    const template = await database.commandBoard.findUnique({
      where: {
        shareId,
      },
      include: {
        projections: {
          where: { deletedAt: null },
        },
        groups: {
          where: { deletedAt: null },
        },
        annotations: {
          where: { deletedAt: null },
        },
      },
    });

    if (!(template && template.isTemplate && template.isPublic)) {
      return manifestErrorResponse("Template not found or not public", 404);
    }

    return manifestSuccessResponse({
      template: {
        id: template.id,
        name: template.name,
        description: template.description,
        tags: template.tags,
        scope: template.scope,
        autoPopulate: template.autoPopulate,
        projections: template.projections,
        groups: template.groups,
        annotations: template.annotations,
      },
    });
  } catch (error) {
    console.error("Error fetching shared template:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const { shareId } = await params;

    if (!shareId) {
      return manifestErrorResponse("Share ID is required", 400);
    }

    const getTenantIdForOrg = (await import("@/app/lib/tenant"))
      .getTenantIdForOrg;
    const tenantId = await getTenantIdForOrg(orgId);

    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const body = await request.json();
    const {
      boardName,
      description,
      includeProjections = true,
    } = body as {
      boardName?: string;
      description?: string;
      includeProjections?: boolean;
    };

    if (!boardName) {
      return manifestErrorResponse("Board name is required", 400);
    }

    // Get template by shareId (must be public)
    const template = await database.commandBoard.findUnique({
      where: {
        shareId,
      },
      include: {
        projections: {
          where: { deletedAt: null },
        },
        groups: {
          where: { deletedAt: null },
        },
        annotations: {
          where: { deletedAt: null },
        },
      },
    });

    if (!(template && template.isTemplate && template.isPublic)) {
      return manifestErrorResponse("Template not found or not public", 404);
    }

    // Create new board from template
    const boardId = crypto.randomUUID();

    await database.commandBoard.create({
      data: {
        id: boardId,
        tenantId,
        name: boardName,
        description: description || null,
        isTemplate: false,
        tags: template.tags,
        scope: template.scope,
        autoPopulate: template.autoPopulate,
        status: "active",
      },
    });

    if (includeProjections) {
      // Copy projections with new IDs
      const projectionIdMap = new Map<string, string>();
      const projectionCopies = template.projections.map((proj) => {
        const newId = crypto.randomUUID();
        projectionIdMap.set(proj.id, newId);
        return {
          id: newId,
          tenantId,
          boardId,
          entityType: proj.entityType,
          entityId: proj.entityId,
          positionX: proj.positionX,
          positionY: proj.positionY,
          width: proj.width,
          height: proj.height,
          zIndex: proj.zIndex,
          colorOverride: proj.colorOverride,
          collapsed: proj.collapsed,
          groupId: proj.groupId,
          pinned: proj.pinned,
        };
      });

      // Copy groups
      const groupIdMap = new Map<string, string>();
      const groupCopies = template.groups.map((group) => {
        const newId = crypto.randomUUID();
        groupIdMap.set(group.id, newId);
        return {
          id: newId,
          tenantId,
          boardId,
          name: group.name,
          color: group.color,
          collapsed: group.collapsed,
          positionX: group.positionX,
          positionY: group.positionY,
          width: group.width,
          height: group.height,
          zIndex: group.zIndex,
        };
      });

      // Update projections with new group IDs
      for (const proj of projectionCopies) {
        if (proj.groupId && groupIdMap.has(proj.groupId)) {
          (proj as { groupId: string }).groupId = groupIdMap.get(proj.groupId)!;
        }
      }

      // Copy annotations
      const annotationCopies = template.annotations.map((ann) => {
        const newFromId = ann.fromProjectionId
          ? (projectionIdMap.get(ann.fromProjectionId) ?? null)
          : null;
        const newToId = ann.toProjectionId
          ? (projectionIdMap.get(ann.toProjectionId) ?? null)
          : null;
        return {
          id: crypto.randomUUID(),
          tenantId,
          boardId,
          annotationType: ann.annotationType,
          fromProjectionId: newFromId,
          toProjectionId: newToId,
          label: ann.label,
          color: ann.color,
          style: ann.style,
        };
      });

      // Batch insert
      if (projectionCopies.length > 0) {
        await database.boardProjection.createMany({
          data: projectionCopies,
        });
      }

      if (groupCopies.length > 0) {
        await database.commandBoardGroup.createMany({
          data: groupCopies,
        });
      }

      if (annotationCopies.length > 0) {
        await database.boardAnnotation.createMany({
          data: annotationCopies,
        });
      }
    }

    return manifestSuccessResponse({
      boardId,
      message: "Board created from template successfully",
    });
  } catch (error) {
    console.error("Error creating board from shared template:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
