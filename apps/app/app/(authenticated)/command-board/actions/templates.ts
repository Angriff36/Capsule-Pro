"use server";

import { database } from "@repo/database";
import { requireTenantId } from "../../../lib/tenant";
import { withRetry } from "../lib/retry-utils";
import type {
  BoardAnnotation,
  BoardGroup,
  BoardProjection,
} from "../types/board";

// ---------------------------------------------------------------------------
// Template Types
// ---------------------------------------------------------------------------

export interface BoardTemplate {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  tags: string[];
  scope: Record<string, unknown> | null;
  autoPopulate: boolean;
  shareId: string | null;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BoardTemplateDetail extends BoardTemplate {
  projections: BoardProjection[];
  groups: BoardGroup[];
  annotations: BoardAnnotation[];
}

export interface CreateTemplateInput {
  name: string;
  description?: string;
  tags?: string[];
  scope?: Record<string, unknown> | null;
  autoPopulate?: boolean;
  isPublic?: boolean;
}

export interface UpdateTemplateInput {
  id: string;
  name?: string;
  description?: string;
  tags?: string[];
  scope?: Record<string, unknown> | null;
  autoPopulate?: boolean;
  isPublic?: boolean;
}

export interface CreateBoardFromTemplateInput {
  templateId: string;
  boardName: string;
  description?: string;
  includeProjections?: boolean;
}

// ---------------------------------------------------------------------------
// Template CRUD Operations
// ---------------------------------------------------------------------------

/**
 * Lists all templates for the current tenant.
 * Optionally includes public templates from other tenants.
 */
export async function listBoardTemplates(
  options: { includePublic?: boolean } = {}
): Promise<BoardTemplate[]> {
  const tenantId = await requireTenantId();

  try {
    const templates = await withRetry(
      () =>
        database.commandBoard.findMany({
          where: {
            deletedAt: null,
            isTemplate: true,
            ...(options.includePublic
              ? {
                  OR: [{ tenantId }, { isPublic: true }],
                }
              : { tenantId }),
          },
          orderBy: {
            createdAt: "desc",
          },
          select: {
            id: true,
            tenantId: true,
            name: true,
            description: true,
            tags: true,
            scope: true,
            autoPopulate: true,
            shareId: true,
            isPublic: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
      { maxRetries: 1, delayMs: 2000 }
    );

    return templates.map((t) => ({
      id: t.id,
      tenantId: t.tenantId,
      name: t.name,
      description: t.description,
      tags: t.tags,
      scope: t.scope as Record<string, unknown> | null,
      autoPopulate: t.autoPopulate,
      shareId: t.shareId,
      isPublic: t.isPublic,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));
  } catch (error) {
    console.error("[listBoardTemplates] Failed to list templates:", error);
    return [];
  }
}

/**
 * Gets a template by ID with full details including projections, groups, and annotations.
 */
export async function getBoardTemplate(
  templateId: string
): Promise<BoardTemplateDetail | null> {
  const tenantId = await requireTenantId();

  try {
    const template = await withRetry(
      () =>
        database.commandBoard.findUnique({
          where: {
            tenantId_id: {
              tenantId,
              id: templateId,
            },
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
        }),
      { maxRetries: 1, delayMs: 2000 }
    );

    if (!(template && template.isTemplate)) {
      return null;
    }

    return {
      id: template.id,
      tenantId: template.tenantId,
      name: template.name,
      description: template.description,
      tags: template.tags,
      scope: template.scope as Record<string, unknown> | null,
      autoPopulate: template.autoPopulate,
      shareId: template.shareId,
      isPublic: template.isPublic,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
      projections: template.projections.map((p) => ({
        id: p.id,
        tenantId: p.tenantId,
        boardId: p.boardId,
        entityType: p.entityType as BoardProjection["entityType"],
        entityId: p.entityId,
        positionX: p.positionX,
        positionY: p.positionY,
        width: p.width,
        height: p.height,
        zIndex: p.zIndex,
        colorOverride: p.colorOverride,
        collapsed: p.collapsed,
        groupId: p.groupId,
        pinned: p.pinned,
      })),
      groups: template.groups.map((g) => ({
        id: g.id,
        tenantId: g.tenantId,
        boardId: g.boardId,
        name: g.name,
        color: g.color,
        collapsed: g.collapsed,
        positionX: g.positionX,
        positionY: g.positionY,
        width: g.width,
        height: g.height,
        zIndex: g.zIndex,
      })),
      annotations: template.annotations.map((a) => ({
        id: a.id,
        boardId: a.boardId,
        annotationType: a.annotationType as BoardAnnotation["annotationType"],
        fromProjectionId: a.fromProjectionId,
        toProjectionId: a.toProjectionId,
        label: a.label,
        color: a.color,
        style: a.style,
      })),
    };
  } catch (error) {
    console.error("[getBoardTemplate] Failed to fetch template:", error);
    return null;
  }
}

/**
 * Gets a template by its share ID (for public/shared templates).
 */
export async function getBoardTemplateByShareId(
  shareId: string
): Promise<BoardTemplateDetail | null> {
  try {
    const template = await withRetry(
      () =>
        database.commandBoard.findUnique({
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
        }),
      { maxRetries: 1, delayMs: 2000 }
    );

    if (!(template && template.isTemplate && template.isPublic)) {
      return null;
    }

    return {
      id: template.id,
      tenantId: template.tenantId,
      name: template.name,
      description: template.description,
      tags: template.tags,
      scope: template.scope as Record<string, unknown> | null,
      autoPopulate: template.autoPopulate,
      shareId: template.shareId,
      isPublic: template.isPublic,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
      projections: template.projections.map((p) => ({
        id: p.id,
        tenantId: p.tenantId,
        boardId: p.boardId,
        entityType: p.entityType as BoardProjection["entityType"],
        entityId: p.entityId,
        positionX: p.positionX,
        positionY: p.positionY,
        width: p.width,
        height: p.height,
        zIndex: p.zIndex,
        colorOverride: p.colorOverride,
        collapsed: p.collapsed,
        groupId: p.groupId,
        pinned: p.pinned,
      })),
      groups: template.groups.map((g) => ({
        id: g.id,
        tenantId: g.tenantId,
        boardId: g.boardId,
        name: g.name,
        color: g.color,
        collapsed: g.collapsed,
        positionX: g.positionX,
        positionY: g.positionY,
        width: g.width,
        height: g.height,
        zIndex: g.zIndex,
      })),
      annotations: template.annotations.map((a) => ({
        id: a.id,
        boardId: a.boardId,
        annotationType: a.annotationType as BoardAnnotation["annotationType"],
        fromProjectionId: a.fromProjectionId,
        toProjectionId: a.toProjectionId,
        label: a.label,
        color: a.color,
        style: a.style,
      })),
    };
  } catch (error) {
    console.error(
      "[getBoardTemplateByShareId] Failed to fetch template:",
      error
    );
    return null;
  }
}

/**
 * Creates a new board template from an existing board.
 */
export async function createTemplateFromBoard(
  boardId: string,
  input: CreateTemplateInput
): Promise<{ success: boolean; template?: BoardTemplate; error?: string }> {
  try {
    const tenantId = await requireTenantId();

    // Verify source board exists
    const sourceBoard = await database.commandBoard.findUnique({
      where: {
        tenantId_id: {
          tenantId,
          id: boardId,
        },
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

    if (!sourceBoard) {
      return {
        success: false,
        error: "Source board not found",
      };
    }

    // Generate share ID if making public
    const shareId = input.isPublic
      ? generateShareId()
      : input.isPublic === false
        ? null
        : null;

    // Create template as a copy of the board
    const templateId = crypto.randomUUID();

    const template = await database.commandBoard.create({
      data: {
        id: templateId,
        tenantId,
        name: input.name,
        description: input.description || null,
        isTemplate: true,
        tags: input.tags || [],
        scope: (input.scope ?? sourceBoard.scope) as unknown as undefined,
        autoPopulate:
          input.autoPopulate !== undefined
            ? input.autoPopulate
            : sourceBoard.autoPopulate,
        shareId,
        isPublic: input.isPublic ?? false,
        status: "active",
      },
    });

    // Copy projections
    const projectionIdMap = new Map<string, string>();
    const projectionCopies = sourceBoard.projections.map((proj) => {
      const newId = crypto.randomUUID();
      projectionIdMap.set(proj.id, newId);
      return {
        id: newId,
        tenantId,
        boardId: templateId,
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
    const groupCopies = sourceBoard.groups.map((group) => {
      const newId = crypto.randomUUID();
      groupIdMap.set(group.id, newId);
      return {
        id: newId,
        tenantId,
        boardId: templateId,
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
        proj.groupId = groupIdMap.get(proj.groupId)!;
      }
    }

    // Copy annotations with updated projection references
    const annotationCopies = sourceBoard.annotations.map((ann) => {
      const newFromId = ann.fromProjectionId
        ? (projectionIdMap.get(ann.fromProjectionId) ?? null)
        : null;
      const newToId = ann.toProjectionId
        ? (projectionIdMap.get(ann.toProjectionId) ?? null)
        : null;
      return {
        id: crypto.randomUUID(),
        tenantId,
        boardId: templateId,
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

    return {
      success: true,
      template: {
        id: template.id,
        tenantId: template.tenantId,
        name: template.name,
        description: template.description,
        tags: template.tags,
        scope: template.scope as Record<string, unknown> | null,
        autoPopulate: template.autoPopulate,
        shareId: template.shareId,
        isPublic: template.isPublic,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create template",
    };
  }
}

/**
 * Updates an existing template.
 */
export async function updateBoardTemplate(
  input: UpdateTemplateInput
): Promise<{ success: boolean; template?: BoardTemplate; error?: string }> {
  try {
    const tenantId = await requireTenantId();

    // Generate or remove share ID based on isPublic change
    const existing = await database.commandBoard.findUnique({
      where: {
        tenantId_id: {
          tenantId,
          id: input.id,
        },
      },
      select: {
        shareId: true,
        isPublic: true,
      },
    });

    if (!existing) {
      return {
        success: false,
        error: "Template not found",
      };
    }

    let shareId = existing.shareId;
    if (input.isPublic !== undefined && input.isPublic !== existing.isPublic) {
      shareId = input.isPublic ? generateShareId() : null;
    }

    const template = await database.commandBoard.update({
      where: {
        tenantId_id: {
          tenantId,
          id: input.id,
        },
      },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && {
          description: input.description,
        }),
        ...(input.tags !== undefined && { tags: input.tags }),
        ...(input.scope !== undefined && {
          scope: input.scope as unknown as undefined,
        }),
        ...(input.autoPopulate !== undefined && {
          autoPopulate: input.autoPopulate,
        }),
        ...(input.isPublic !== undefined && {
          isPublic: input.isPublic,
          shareId,
        }),
      },
    });

    return {
      success: true,
      template: {
        id: template.id,
        tenantId: template.tenantId,
        name: template.name,
        description: template.description,
        tags: template.tags,
        scope: template.scope as Record<string, unknown> | null,
        autoPopulate: template.autoPopulate,
        shareId: template.shareId,
        isPublic: template.isPublic,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update template",
    };
  }
}

/**
 * Deletes a template (soft delete).
 */
export async function deleteBoardTemplate(
  templateId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const tenantId = await requireTenantId();

    await database.commandBoard.update({
      where: {
        tenantId_id: {
          tenantId,
          id: templateId,
        },
      },
      data: {
        deletedAt: new Date(),
      },
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete template",
    };
  }
}

/**
 * Creates a new board from a template.
 */
export async function createBoardFromTemplate(
  input: CreateBoardFromTemplateInput
): Promise<{ success: boolean; boardId?: string; error?: string }> {
  try {
    const tenantId = await requireTenantId();

    // Get template (could be from shareId or templateId)
    const template = await getBoardTemplate(input.templateId);
    if (!template) {
      // Try as shareId
      const sharedTemplate = await getBoardTemplateByShareId(input.templateId);
      if (!sharedTemplate) {
        return {
          success: false,
          error: "Template not found",
        };
      }
      return createBoardFromTemplateData(
        sharedTemplate,
        input.boardName,
        input.description,
        input.includeProjections
      );
    }

    return createBoardFromTemplateData(
      template,
      input.boardName,
      input.description,
      input.includeProjections
    );
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create board from template",
    };
  }
}

async function createBoardFromTemplateData(
  template: BoardTemplateDetail,
  boardName: string,
  description?: string,
  includeProjections = true
): Promise<{ success: boolean; boardId?: string; error?: string }> {
  const tenantId = await requireTenantId();
  const boardId = crypto.randomUUID();

  // Create the board
  await database.commandBoard.create({
    data: {
      id: boardId,
      tenantId,
      name: boardName,
      description: description || null,
      isTemplate: false,
      tags: template.tags,
      scope: template.scope as unknown as undefined,
      autoPopulate: template.autoPopulate,
      status: "active",
    },
  });

  // Copy projections if requested
  if (includeProjections && template.projections.length > 0) {
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
        proj.groupId = groupIdMap.get(proj.groupId)!;
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

  return {
    success: true,
    boardId,
  };
}

// ---------------------------------------------------------------------------
// Share ID Generation
// ---------------------------------------------------------------------------

function generateShareId(): string {
  // Generate a short, URL-friendly share ID
  const chars =
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let result = "";
  for (let i = 0; i < 10; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

/**
 * Generates a unique share ID that doesn't collide with existing ones.
 */
async function generateUniqueShareId(): Promise<string> {
  let shareId: string;
  let attempts = 0;
  const maxAttempts = 10;

  do {
    shareId = generateShareId();
    const existing = await database.commandBoard.findUnique({
      where: { shareId },
      select: { id: true },
    });
    if (!existing) {
      return shareId;
    }
    attempts++;
  } while (attempts < maxAttempts);

  // Fallback to UUID-based share ID
  return crypto.randomUUID().replace(/-/g, "").substring(0, 10);
}
