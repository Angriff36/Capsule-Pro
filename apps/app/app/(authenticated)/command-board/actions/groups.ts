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

export interface UpdateGroupResult {
  success: boolean;
  group?: BoardGroup;
  error?: string;
  groupNotFound?: boolean;
}

export interface ToggleCollapseResult {
  success: boolean;
  group?: BoardGroup;
  error?: string;
  groupNotFound?: boolean;
}

/** Update a group's properties */
export async function updateGroup(
  groupId: string,
  input: UpdateGroupInput
): Promise<UpdateGroupResult> {
  try {
    const tenantId = await requireTenantId();

    const updated = await database.commandBoardGroup.update({
      where: {
        tenantId_id: {
          tenantId,
          id: groupId,
        },
        deletedAt: null,
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

    return { success: true, group: dbToGroup(updated) };
  } catch (error) {
    // Check if it's a "not found" error from Prisma
    if (error instanceof Error && error.message.includes("No record found")) {
      return { success: false, groupNotFound: true, error: "Group not found" };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update group",
    };
  }
}

/** Toggle the collapsed state of a group */
export async function toggleGroupCollapse(
  groupId: string
): Promise<ToggleCollapseResult> {
  try {
    const tenantId = await requireTenantId();

    const current = await database.commandBoardGroup.findUnique({
      where: {
        tenantId_id: {
          tenantId,
          id: groupId,
        },
        deletedAt: null,
      },
      select: { collapsed: true, boardId: true },
    });

    if (!current) {
      return { success: false, groupNotFound: true, error: "Group not found" };
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

    return { success: true, group: dbToGroup(updated) };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to toggle group collapse",
    };
  }
}

// ============================================================================
// Delete
// ============================================================================

export interface DeleteGroupResult {
  success: boolean;
  error?: string;
  /** Group was not found or already deleted */
  groupNotFound?: boolean;
}

/** Soft-delete a group and ungroup all its projections (idempotent) */
export async function deleteGroup(groupId: string): Promise<DeleteGroupResult> {
  try {
    const tenantId = await requireTenantId();

    // Check if group exists and is not already deleted
    const existingGroup = await database.commandBoardGroup.findFirst({
      where: {
        tenantId,
        id: groupId,
        deletedAt: null,
      },
      select: { id: true, boardId: true },
    });

    if (!existingGroup) {
      // Idempotent: group already deleted or doesn't exist
      return { success: true, groupNotFound: true };
    }

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
    await database.commandBoardGroup.update({
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

    revalidatePath(`/command-board/${existingGroup.boardId}`);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete group",
    };
  }
}

// ============================================================================
// Card/Projection Management
// ============================================================================

export interface AddProjectionsResult {
  success: boolean;
  count: number;
  error?: string;
  /** Group was not found or is deleted */
  groupNotFound?: boolean;
}

export interface RemoveProjectionsResult {
  success: boolean;
  count: number;
  error?: string;
}

/** Add projections to a group (idempotent - validates group exists first) */
export async function addProjectionsToGroup(
  groupId: string,
  projectionIds: string[]
): Promise<AddProjectionsResult> {
  try {
    if (!projectionIds || projectionIds.length === 0) {
      return { success: true, count: 0 };
    }

    const tenantId = await requireTenantId();

    // Validate that the group exists and is not deleted
    const group = await database.commandBoardGroup.findFirst({
      where: {
        tenantId,
        id: groupId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!group) {
      return {
        success: false,
        count: 0,
        groupNotFound: true,
        error: "Group not found or has been deleted",
      };
    }

    // Idempotent: updateMany is naturally idempotent - setting groupId to the same value has no effect
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

    return { success: true, count: result.count };
  } catch (error) {
    return {
      success: false,
      count: 0,
      error:
        error instanceof Error
          ? error.message
          : "Failed to add projections to group",
    };
  }
}

/** Remove projections from their group (ungroup) - idempotent operation */
export async function removeProjectionsFromGroup(
  projectionIds: string[]
): Promise<RemoveProjectionsResult> {
  try {
    if (!projectionIds || projectionIds.length === 0) {
      return { success: true, count: 0 };
    }

    const tenantId = await requireTenantId();

    // Idempotent: setting groupId to null is safe even if already null
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

    return { success: true, count: result.count };
  } catch (error) {
    return {
      success: false,
      count: 0,
      error:
        error instanceof Error
          ? error.message
          : "Failed to remove projections from group",
    };
  }
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

// ============================================================================
// Orphan Cleanup
// ============================================================================

export interface CleanupOrphansResult {
  success: boolean;
  /** Number of projections that had stale groupIds cleared */
  cleanedCount: number;
  error?: string;
}

/**
 * Clean up orphan projections - projections that reference a groupId
 * that no longer exists or has been soft-deleted.
 *
 * This should be called periodically or when loading a board to ensure
 * projections don't reference invalid groups.
 */
export async function cleanupOrphanProjections(
  boardId: string
): Promise<CleanupOrphansResult> {
  try {
    const tenantId = await requireTenantId();

    // Find all projections on this board that have a groupId
    const projectionsWithGroups = await database.boardProjection.findMany({
      where: {
        tenantId,
        boardId,
        deletedAt: null,
        groupId: { not: null },
      },
      select: { id: true, groupId: true },
    });

    if (projectionsWithGroups.length === 0) {
      return { success: true, cleanedCount: 0 };
    }

    // Get all valid (non-deleted) group IDs for this board
    const validGroups = await database.commandBoardGroup.findMany({
      where: {
        tenantId,
        boardId,
        deletedAt: null,
      },
      select: { id: true },
    });

    const validGroupIds = new Set(validGroups.map((g) => g.id));

    // Find projections with stale groupIds
    const staleProjectionIds = projectionsWithGroups
      .filter((p) => p.groupId && !validGroupIds.has(p.groupId))
      .map((p) => p.id);

    if (staleProjectionIds.length === 0) {
      return { success: true, cleanedCount: 0 };
    }

    // Clear the stale groupIds
    await database.boardProjection.updateMany({
      where: {
        tenantId,
        id: { in: staleProjectionIds },
      },
      data: {
        groupId: null,
      },
    });

    return { success: true, cleanedCount: staleProjectionIds.length };
  } catch (error) {
    return {
      success: false,
      cleanedCount: 0,
      error:
        error instanceof Error
          ? error.message
          : "Failed to cleanup orphan projections",
    };
  }
}
