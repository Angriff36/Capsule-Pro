"use server";

import { auth } from "@clerk/nextjs/server";
import { db, type Prisma } from "@repo/database";
import { revalidatePath } from "next/cache";
import type { ViewportState } from "../types";

export interface SaveLayoutInput {
  boardId: string;
  name: string;
  viewport: ViewportState;
  visibleCards: string[];
  gridSize: number;
  showGrid: boolean;
  snapToGrid: boolean;
}

export interface LayoutResult {
  success: boolean;
  data?: {
    id: string;
    name: string;
  };
  error?: string;
}

export interface LayoutListItem {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LayoutDetail extends LayoutListItem {
  viewport: ViewportState;
  visibleCards: string[];
  gridSize: number;
  showGrid: boolean;
  snapToGrid: boolean;
}

/**
 * Save a new named layout for the current user
 */
export async function saveLayout(
  input: SaveLayoutInput
): Promise<LayoutResult> {
  const { userId, sessionClaims } = await auth();
  const tenantId = sessionClaims?.tenantId as string | undefined;

  if (!(userId && tenantId)) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // Check if layout with same name exists for this board/user
    const existing = await db.commandBoardLayout.findFirst({
      where: {
        tenantId,
        boardId: input.boardId,
        userId,
        name: input.name,
        deletedAt: null,
      },
    });

    if (existing) {
      // Update existing layout
      await db.commandBoardLayout.update({
        where: {
          tenantId_id: {
            tenantId,
            id: existing.id,
          },
        },
        data: {
          viewport: input.viewport as unknown as Prisma.InputJsonValue,
          visibleCards: input.visibleCards,
          gridSize: input.gridSize,
          showGrid: input.showGrid,
          snapToGrid: input.snapToGrid,
        },
      });

      return {
        success: true,
        data: { id: existing.id, name: existing.name },
      };
    }

    // Create new layout
    const layout = await db.commandBoardLayout.create({
      data: {
        tenantId,
        boardId: input.boardId,
        userId,
        name: input.name,
        viewport: input.viewport as unknown as Prisma.InputJsonValue,
        visibleCards: input.visibleCards,
        gridSize: input.gridSize,
        showGrid: input.showGrid,
        snapToGrid: input.snapToGrid,
      },
    });

    revalidatePath("/command-board/[boardId]");

    return {
      success: true,
      data: { id: layout.id, name: layout.name },
    };
  } catch (error) {
    console.error("Failed to save layout:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save layout",
    };
  }
}

/**
 * List all saved layouts for a board
 */
export async function listLayouts(
  boardId: string
): Promise<{ success: boolean; data?: LayoutListItem[]; error?: string }> {
  const { userId, sessionClaims } = await auth();
  const tenantId = sessionClaims?.tenantId as string | undefined;

  if (!(userId && tenantId)) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const layouts = await db.commandBoardLayout.findMany({
      where: {
        tenantId,
        boardId,
        userId,
        deletedAt: null,
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      success: true,
      data: layouts.map((layout) => ({
        id: layout.id,
        name: layout.name,
        createdAt: layout.createdAt,
        updatedAt: layout.updatedAt,
      })),
    };
  } catch (error) {
    console.error("Failed to list layouts:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to list layouts",
    };
  }
}

/**
 * Get a specific layout by ID
 */
export async function getLayout(
  layoutId: string
): Promise<{ success: boolean; data?: LayoutDetail; error?: string }> {
  const { userId, sessionClaims } = await auth();
  const tenantId = sessionClaims?.tenantId as string | undefined;

  if (!(userId && tenantId)) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const layout = await db.commandBoardLayout.findFirst({
      where: {
        tenantId,
        id: layoutId,
        userId,
        deletedAt: null,
      },
    });

    if (!layout) {
      return { success: false, error: "Layout not found" };
    }

    return {
      success: true,
      data: {
        id: layout.id,
        name: layout.name,
        createdAt: layout.createdAt,
        updatedAt: layout.updatedAt,
        viewport: layout.viewport as unknown as ViewportState,
        visibleCards: layout.visibleCards,
        gridSize: layout.gridSize,
        showGrid: layout.showGrid,
        snapToGrid: layout.snapToGrid,
      },
    };
  } catch (error) {
    console.error("Failed to get layout:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get layout",
    };
  }
}

/**
 * Delete a layout
 */
export async function deleteLayout(
  layoutId: string
): Promise<{ success: boolean; error?: string }> {
  const { userId, sessionClaims } = await auth();
  const tenantId = sessionClaims?.tenantId as string | undefined;

  if (!(userId && tenantId)) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // Soft delete
    await db.commandBoardLayout.updateMany({
      where: {
        tenantId,
        id: layoutId,
        userId,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    revalidatePath("/command-board/[boardId]");

    return { success: true };
  } catch (error) {
    console.error("Failed to delete layout:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete layout",
    };
  }
}
