"use server";

import { database } from "@repo/database";
import { requireTenantId } from "../../../lib/tenant";
import type {
  BoardStatus,
  CardStatus,
  CardType,
  CommandBoard,
  CommandBoardCard,
  CreateBoardInput,
  UpdateBoardInput,
} from "../types";

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

export interface BoardResult {
  success: boolean;
  board?: CommandBoard;
  error?: string;
}

export interface CommandBoardWithCards extends CommandBoard {
  cards: CommandBoardCard[];
}

export async function getCommandBoard(
  boardId: string
): Promise<CommandBoardWithCards | null> {
  const tenantId = await requireTenantId();

  const board = await database.commandBoard.findUnique({
    where: {
      tenantId_id: {
        tenantId,
        id: boardId,
      },
    },
    include: {
      cards: true,
    },
  });

  if (!board) {
    return null;
  }

  return {
    ...dbBoardToBoard(board),
    cards: board.cards.map(
      (card): CommandBoardCard => ({
        id: card.id,
        tenantId: card.tenantId,
        boardId: card.boardId,
        title: card.title,
        content: card.content,
        cardType: card.cardType as CardType,
        status: card.status as CardStatus,
        position: {
          x: card.positionX,
          y: card.positionY,
          width: card.width,
          height: card.height,
          zIndex: card.zIndex,
        },
        color: card.color,
        metadata: (card.metadata as Record<string, unknown>) || {},
        createdAt: card.createdAt,
        updatedAt: card.updatedAt,
        deletedAt: card.deletedAt,
      })
    ),
  };
}

export async function listCommandBoards(): Promise<CommandBoard[]> {
  const tenantId = await requireTenantId();

  const boards = await database.commandBoard.findMany({
    where: {
      tenantId,
      deletedAt: null,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return boards.map(dbBoardToBoard);
}

export async function createCommandBoard(
  input: CreateBoardInput
): Promise<BoardResult> {
  try {
    const tenantId = await requireTenantId();

    const board = await database.commandBoard.create({
      data: {
        tenantId,
        id: crypto.randomUUID(),
        name: input.name,
        description: input.description || null,
        eventId: input.eventId || null,
        isTemplate: input.isTemplate,
        tags: input.tags || [],
      },
    });

    return {
      success: true,
      board: dbBoardToBoard(board),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create board",
    };
  }
}

export async function updateCommandBoard(
  input: UpdateBoardInput
): Promise<BoardResult> {
  try {
    const tenantId = await requireTenantId();

    const board = await database.commandBoard.update({
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
        ...(input.isTemplate !== undefined && { isTemplate: input.isTemplate }),
        ...(input.tags !== undefined && { tags: input.tags }),
      },
    });

    return {
      success: true,
      board: dbBoardToBoard(board),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update board",
    };
  }
}

export async function deleteCommandBoard(
  boardId: string
): Promise<BoardResult> {
  try {
    const tenantId = await requireTenantId();

    await database.commandBoard.update({
      where: {
        tenantId_id: {
          tenantId,
          id: boardId,
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
      error: error instanceof Error ? error.message : "Failed to delete board",
    };
  }
}
