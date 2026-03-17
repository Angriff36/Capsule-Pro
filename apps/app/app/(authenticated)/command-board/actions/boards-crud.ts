"use server";

import "server-only";

import { database } from "@repo/database";
import { requireTenantId } from "../../../lib/tenant";
import { withRetry } from "../lib/retry-utils";

export type BoardStatus = "draft" | "active" | "archived";

export interface CommandBoard {
  id: string;
  tenantId: string;
  eventId: string | null;
  name: string;
  description: string | null;
  status: BoardStatus;
  isTemplate: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface UpdateBoardInput {
  id: string;
  name?: string;
  description?: string;
  status?: BoardStatus;
  eventId?: string | null;
  isTemplate?: boolean;
  tags?: string[];
}

export interface BoardResult {
  success: boolean;
  board?: CommandBoard;
  error?: string;
}

function dbBoardToBoard(board: {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  status: string;
  isTemplate: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  eventId: string | null;
}): CommandBoard {
  return {
    id: board.id,
    tenantId: board.tenantId,
    eventId: board.eventId,
    name: board.name,
    description: board.description,
    status: (board.status as BoardStatus) || "draft",
    isTemplate: board.isTemplate,
    tags: board.tags,
    createdAt: board.createdAt,
    updatedAt: board.updatedAt,
    deletedAt: board.deletedAt,
  };
}

export async function listCommandBoards(): Promise<CommandBoard[]> {
  const tenantId = await requireTenantId();

  try {
    const boards = await withRetry(
      () =>
        database.commandBoard.findMany({
          where: {
            tenantId,
            deletedAt: null,
          },
          orderBy: {
            createdAt: "desc",
          },
        }),
      { maxRetries: 1, delayMs: 2000 }
    );

    return boards.map(dbBoardToBoard);
  } catch (error) {
    console.error("[listCommandBoards] Failed to list boards:", error);
    return [];
  }
}

export async function updateCommandBoard(
  input: UpdateBoardInput
): Promise<BoardResult> {
  try {
    const tenantId = await requireTenantId();

    const board = await withRetry(
      () =>
        database.commandBoard.update({
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
            ...(input.status !== undefined && { status: input.status }),
            ...(input.eventId !== undefined && { eventId: input.eventId }),
            ...(input.isTemplate !== undefined && {
              isTemplate: input.isTemplate,
            }),
            ...(input.tags !== undefined && { tags: input.tags }),
          },
        }),
      { maxRetries: 1, delayMs: 2000 }
    );

    return {
      success: true,
      board: dbBoardToBoard(board),
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to update board";
    console.error("[updateCommandBoard] Failed to update board:", error);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function deleteCommandBoard(
  boardId: string
): Promise<BoardResult> {
  try {
    const tenantId = await requireTenantId();

    await withRetry(
      () =>
        database.commandBoard.update({
          where: {
            tenantId_id: {
              tenantId,
              id: boardId,
            },
          },
          data: {
            deletedAt: new Date(),
          },
        }),
      { maxRetries: 1, delayMs: 2000 }
    );

    return { success: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to delete board";
    console.error("[deleteCommandBoard] Failed to delete board:", error);
    return {
      success: false,
      error: errorMessage,
    };
  }
}
