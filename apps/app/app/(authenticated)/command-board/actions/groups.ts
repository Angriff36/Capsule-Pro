"use server";

import { database } from "@repo/database";
import { revalidatePath } from "next/cache";
import { requireTenantId } from "../../../lib/tenant";
import type { BoardGroup } from "../types/board";

// ============================================================================
// Helpers
// ============================================================================

/** Map a Prisma CommandBoardGroup row to the BoardGroup domain type */
function dbToGroup(row: {
  id: string;
  tenantId: string;
  boardId: string;
  name: string;
  color: string | null;
  collapsed: boolean;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  zIndex: number;
}): BoardGroup {
  return {
    id: row.id,
    tenantId: row.tenantId,
    boardId: row.boardId,
    name: row.name,
    color: row.color,
    collapsed: row.collapsed,
    positionX: row.positionX,
    positionY: row.positionY,
    width: row.width,
    height: row.height,
    zIndex: row.zIndex,
  };
}

// ============================================================================
// Read
// ============================================================================

/** Fetch all non-deleted groups for a board */
export async function getGroupsForBoard(
  boardId: string
): Promise<BoardGroup[]> {
  const tenantId = await requireTenantId();

  const rows = await database.commandBoardGroup.findMany({
    where: {
      tenantId,
      boardId,
      deletedAt: null,
    },
    orderBy: {
      zIndex: "asc",
    },
  });

  return rows.map(dbToGroup);
}

// ============================================================================
// Create
// ============================================================================

export interface CreateGroupInput {
  name: string;
  color?: string;
  positionX?: number;
  positionY?: number;
  width?: number;
  height?: number;
  /** Projection IDs to add to this group */
  projectionIds?: string[];
}

export interface CreateGroupResult {
  success: boolean;
  group?: BoardGroup;
  error?: string;
}

/** Create a new group on a board, optionally with initial projections */
export async function createGroup(
  boardId: string,
  input: CreateGroupInput
): Promise<CreateGroupResult> {
  try {
    const tenantId = await requireTenantId();

    // Get max zIndex so the new group lands on bottom (groups contain nodes, so lower zIndex)
    const bottomGroup = await database.commandBoardGroup.findFirst({
      where: {
        tenantId,
        boardId,
        deletedAt: null,
      },
      orderBy: {
        zIndex: "asc",
      },
      select: { zIndex: true },
    });

    const nextZ = Math.max(0, (bottomGroup?.zIndex ?? 1) - 1);

    const created = await database.commandBoardGroup.create({
      data: {
        tenantId,
        id: crypto.randomUUID(),
        boardId,
        name: input.name.trim(),
        color: input.color ?? null,
        collapsed: false,
        positionX: Math.round(input.positionX ?? 100),
        positionY: Math.round(input.positionY ?? 100),
        width: input.width ?? 400,
        height: input.height ?? 300,
        zIndex: nextZ,
      },
    });

    // If projection IDs provided, add them to the group
    if (input.projectionIds && input.projectionIds.length > 0) {
      // Calculate the bounding box of all projections to size the group
      const projections = await database.boardProjection.findMany({
        where: {
          tenantId,
          boardId,
          id: { in: input.projectionIds },
          deletedAt: null,
        },
        select: {
          id: true,
          positionX: true,
          positionY: true,
          width: true,
          height: true,
        },
      });

      if (projections.length > 0) {
        // Calculate bounds
        const padding = 40;
        const minX = Math.min(...projections.map((p) => p.positionX)) - padding;
        const minY = Math.min(...projections.map((p) => p.positionY)) - padding;
        const maxX =
          Math.max(...projections.map((p) => p.positionX + p.width)) + padding;
        const maxY =
          Math.max(...projections.map((p) => p.positionY + p.height)) + padding;

        // Update group position and size
        await database.commandBoardGroup.update({
          where: { tenantId_id: { tenantId, id: created.id } },
          data: {
            positionX: Math.round(minX),
            positionY: Math.round(minY),
            width: Math.round(maxX - minX),
            height: Math.round(maxY - minY),
          },
        });

        // Update all projections to belong to this group
        await database.boardProjection.updateMany({
          where: {
            tenantId,
            id: { in: input.projectionIds },
          },
          data: {
            groupId: created.id,
          },
        });
      }
    }

    revalidatePath(`/command-board/${boardId}`);

    return {
      success: true,
      group: dbToGroup(created),
    };
  } catch (error) {
    console.error("[createGroup] Failed to create group:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create group",
    };
  }
}

// ============================================================================
// Update
// ============================================================================

export interface UpdateGroupInput {
  name?: string;
  color?: string | null;
  collapsed?: boolean;
  positionX?: number;
  positionY?: number;
  width?: number;
  height?: number;
}

/** Update a group's properties */
export async function updateGroup(
  groupId: string,
  input: UpdateGroupInput
): Promise<BoardGroup> {
  const tenantId = await requireTenantId();

  const updated = await database.commandBoardGroup.update({
    where: {
      tenantId_id: {
        tenantId,
        id: groupId,
      },
    },
    data: {
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.color !== undefined && { color: input.color }),
      ...(input.collapsed !== undefined && { collapsed: input.collapsed }),
      ...(input.positionX !== undefined && {
        positionX: Math.round(input.positionX),
      }),
      ...(input.positionY !== undefined && {
        positionY: Math.round(input.positionY),
      }),
      ...(input.width !== undefined && { width: Math.round(input.width) }),
      ...(input.height !== undefined && { height: Math.round(input.height) }),
    },
  });

  revalidatePath(`/command-board/${updated.boardId}`);

  return dbToGroup(updated);
}

/** Toggle the collapsed state of a group */
export async function toggleGroupCollapse(
  groupId: string
): Promise<BoardGroup> {
  const tenantId = await requireTenantId();

  const current = await database.commandBoardGroup.findUnique({
    where: {
      tenantId_id: {
        tenantId,
        id: groupId,
      },
    },
    select: { collapsed: true, boardId: true },
  });

  if (!current) {
    throw new Error("Group not found");
  }

  const updated = await database.commandBoardGroup.update({
    where: {
      tenantId_id: {
        tenantId,
        id: groupId,
      },
    },
    data: {
      collapsed: !current.collapsed,
    },
  });

  revalidatePath(`/command-board/${current.boardId}`);

  return dbToGroup(updated);
}

// ============================================================================
// Delete
// ============================================================================

/** Soft-delete a group and ungroup all its projections */
export async function deleteGroup(groupId: string): Promise<void> {
  const tenantId = await requireTenantId();

  // First, ungroup all projections in this group
  await database.boardProjection.updateMany({
    where: {
      tenantId,
      groupId,
    },
    data: {
      groupId: null,
    },
  });

  // Then soft-delete the group
  const group = await database.commandBoardGroup.update({
    where: {
      tenantId_id: {
        tenantId,
        id: groupId,
      },
    },
    data: {
      deletedAt: new Date(),
    },
    select: { boardId: true },
  });

  revalidatePath(`/command-board/${group.boardId}`);
}

// ============================================================================
// Card/Projection Management
// ============================================================================

/** Add projections to a group */
export async function addProjectionsToGroup(
  groupId: string,
  projectionIds: string[]
): Promise<{ count: number }> {
  const tenantId = await requireTenantId();

  const result = await database.boardProjection.updateMany({
    where: {
      tenantId,
      id: { in: projectionIds },
      deletedAt: null,
    },
    data: {
      groupId,
    },
  });

  return { count: result.count };
}

/** Remove projections from their group (ungroup) */
export async function removeProjectionsFromGroup(
  projectionIds: string[]
): Promise<{ count: number }> {
  const tenantId = await requireTenantId();

  const result = await database.boardProjection.updateMany({
    where: {
      tenantId,
      id: { in: projectionIds },
      deletedAt: null,
    },
    data: {
      groupId: null,
    },
  });

  return { count: result.count };
}

/** Get the group ID for a set of projections (returns null if they don't all share the same group) */
export async function getSharedGroupForProjections(
  projectionIds: string[]
): Promise<string | null> {
  const tenantId = await requireTenantId();

  const projections = await database.boardProjection.findMany({
    where: {
      tenantId,
      id: { in: projectionIds },
      deletedAt: null,
    },
    select: { groupId: true },
  });

  if (projections.length === 0 || projections.length !== projectionIds.length) {
    return null;
  }

  const groupIds = new Set(projections.map((p) => p.groupId));

  // All must be in the same group (and not null)
  if (groupIds.size !== 1) {
    return null;
  }

  const groupId = Array.from(groupIds)[0];
  return groupId ?? null;
}
