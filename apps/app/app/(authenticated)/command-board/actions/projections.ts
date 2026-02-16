"use server";

import { database } from "@repo/database";
import { revalidatePath } from "next/cache";
import { requireTenantId } from "../../../lib/tenant";
import type { BoardProjection } from "../types/board";
import type { EntityType } from "../types/entities";

// ============================================================================
// Helpers
// ============================================================================

/** Map a Prisma BoardProjection row to the BoardProjection domain type */
function dbToProjection(row: {
  id: string;
  tenantId: string;
  boardId: string;
  entityType: string;
  entityId: string;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  zIndex: number;
  colorOverride: string | null;
  collapsed: boolean;
  groupId: string | null;
  pinned: boolean;
}): BoardProjection {
  return {
    id: row.id,
    tenantId: row.tenantId,
    boardId: row.boardId,
    entityType: row.entityType as EntityType,
    entityId: row.entityId,
    positionX: row.positionX,
    positionY: row.positionY,
    width: row.width,
    height: row.height,
    zIndex: row.zIndex,
    colorOverride: row.colorOverride,
    collapsed: row.collapsed,
    groupId: row.groupId,
    pinned: row.pinned,
  };
}

// ============================================================================
// Read
// ============================================================================

/** Fetch all non-deleted projections for a board, ordered by zIndex */
export async function getProjectionsForBoard(
  boardId: string
): Promise<BoardProjection[]> {
  const tenantId = await requireTenantId();

  const rows = await database.boardProjection.findMany({
    where: {
      tenantId,
      boardId,
      deletedAt: null,
    },
    orderBy: {
      zIndex: "asc",
    },
  });

  return rows.map(dbToProjection);
}

// ============================================================================
// Create
// ============================================================================

export interface AddProjectionInput {
  entityType: EntityType;
  entityId: string;
  positionX?: number;
  positionY?: number;
  width?: number;
  height?: number;
}

export interface AddProjectionResult {
  success: boolean;
  projection?: BoardProjection;
  error?: string;
}

/** Add a new entity projection to a board */
export async function addProjection(
  boardId: string,
  input: AddProjectionInput
): Promise<AddProjectionResult> {
  try {
    const tenantId = await requireTenantId();

    // Check for duplicate — same entity already projected on this board
    const existing = await database.boardProjection.findFirst({
      where: {
        tenantId,
        boardId,
        entityType: input.entityType,
        entityId: input.entityId,
        deletedAt: null,
      },
    });

    if (existing) {
      return {
        success: false,
        error: `A ${input.entityType} projection for this entity already exists on this board`,
      };
    }

    // Get max zIndex so the new projection lands on top
    const topProjection = await database.boardProjection.findFirst({
      where: {
        tenantId,
        boardId,
        deletedAt: null,
      },
      orderBy: {
        zIndex: "desc",
      },
      select: { zIndex: true },
    });

    const nextZ = (topProjection?.zIndex ?? 0) + 1;

    const created = await database.boardProjection.create({
      data: {
        tenantId,
        id: crypto.randomUUID(),
        boardId,
        entityType: input.entityType,
        entityId: input.entityId,
        positionX: Math.round(input.positionX ?? 100),
        positionY: Math.round(input.positionY ?? 100),
        width: input.width ?? 280,
        height: input.height ?? 180,
        zIndex: nextZ,
      },
    });

    revalidatePath(`/command-board/${boardId}`);

    return {
      success: true,
      projection: dbToProjection(created),
    };
  } catch (error) {
    console.error("[addProjection] Failed to add projection:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add projection",
    };
  }
}

// ============================================================================
// Update — Position
// ============================================================================

/** Update a single projection's position (used during drag) */
export async function updateProjectionPosition(
  projectionId: string,
  position: { x: number; y: number }
): Promise<void> {
  const tenantId = await requireTenantId();

  await database.boardProjection.update({
    where: {
      tenantId_id: {
        tenantId,
        id: projectionId,
      },
    },
    data: {
      positionX: Math.round(position.x),
      positionY: Math.round(position.y),
    },
  });
}

/** Batch-update positions for multiple projections atomically (group drag) */
export async function batchUpdatePositions(
  updates: Array<{ id: string; x: number; y: number }>
): Promise<void> {
  const tenantId = await requireTenantId();

  await database.$transaction(
    updates.map((u) =>
      database.boardProjection.update({
        where: {
          tenantId_id: {
            tenantId,
            id: u.id,
          },
        },
        data: {
          positionX: Math.round(u.x),
          positionY: Math.round(u.y),
        },
      })
    )
  );
}

// ============================================================================
// Update — Size
// ============================================================================

/** Update a projection's dimensions (used during resize) */
export async function updateProjectionSize(
  projectionId: string,
  size: { width: number; height: number }
): Promise<void> {
  const tenantId = await requireTenantId();

  await database.boardProjection.update({
    where: {
      tenantId_id: {
        tenantId,
        id: projectionId,
      },
    },
    data: {
      width: Math.round(size.width),
      height: Math.round(size.height),
    },
  });
}

// ============================================================================
// Delete (soft)
// ============================================================================

/** Soft-delete a single projection */
export async function removeProjection(projectionId: string): Promise<void> {
  const tenantId = await requireTenantId();

  const projection = await database.boardProjection.update({
    where: {
      tenantId_id: {
        tenantId,
        id: projectionId,
      },
    },
    data: {
      deletedAt: new Date(),
    },
    select: { boardId: true },
  });

  revalidatePath(`/command-board/${projection.boardId}`);
}

/** Soft-delete multiple projections at once */
export async function batchRemoveProjections(
  projectionIds: string[]
): Promise<void> {
  const tenantId = await requireTenantId();

  if (projectionIds.length === 0) return;

  // Use updateMany for bulk soft-delete — filters by tenantId for isolation
  await database.boardProjection.updateMany({
    where: {
      tenantId,
      id: { in: projectionIds },
      deletedAt: null,
    },
    data: {
      deletedAt: new Date(),
    },
  });

  revalidatePath("/command-board/[boardId]");
}
