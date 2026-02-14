"use server";

import { database } from "@repo/database";
import { requireTenantId } from "../../../lib/tenant";
import type {
  CardPosition,
  CardStatus,
  CardType,
  CommandBoardCard,
  CommandBoardCardMetadata,
  CreateCardInput,
  UpdateCardInput,
} from "../types";

function positionToDb(position: CardPosition): {
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  zIndex: number;
} {
  return {
    positionX: position.x,
    positionY: position.y,
    width: position.width,
    height: position.height,
    zIndex: position.zIndex,
  };
}

export interface CardResult {
  success: boolean;
  card?: CommandBoardCard;
  error?: string;
}

export async function createCard(
  boardId: string,
  input: CreateCardInput
): Promise<CardResult> {
  try {
    const tenantId = await requireTenantId();

    const maxZCards = await database.commandBoardCard.findMany({
      where: {
        tenantId,
        boardId,
        deletedAt: null,
      },
      orderBy: {
        zIndex: "desc",
      },
      take: 1,
    });

    const maxZ = maxZCards[0]?.zIndex ?? 0;

    const defaultPosition: CardPosition = {
      x: 100,
      y: 100,
      width: 280,
      height: 180,
      zIndex: maxZ + 1,
    };

    const position = input.position
      ? { ...defaultPosition, ...input.position }
      : defaultPosition;

    const metadata = (input.metadata ?? {}) as Record<string, unknown>;

    const card = await database.commandBoardCard.create({
      data: {
        tenantId,
        boardId,
        id: crypto.randomUUID(),
        title: input.title,
        content: input.content ?? null,
        cardType: input.cardType ?? "generic",
        status: "active",
        ...positionToDb(position),
        color: input.color ?? null,
        metadata: metadata as object,
      },
    });

    return {
      success: true,
      card: {
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
        metadata: (card.metadata as CommandBoardCardMetadata) ?? {},
        createdAt: card.createdAt,
        updatedAt: card.updatedAt,
        deletedAt: card.deletedAt,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create card",
    };
  }
}

export async function updateCard(input: UpdateCardInput): Promise<CardResult> {
  try {
    const tenantId = await requireTenantId();

    const updateData: {
      title?: string;
      content?: string | null;
      cardType?: string;
      color?: string | null;
      metadata?: object;
      positionX?: number;
      positionY?: number;
      width?: number;
      height?: number;
      zIndex?: number;
    } = {};

    if (input.title !== undefined) {
      updateData.title = input.title;
    }
    if (input.content !== undefined) {
      updateData.content = input.content;
    }
    if (input.cardType !== undefined) {
      updateData.cardType = input.cardType;
    }
    if (input.color !== undefined) {
      updateData.color = input.color;
    }
    if (input.metadata !== undefined) {
      updateData.metadata = input.metadata as object;
    }
    if (input.position !== undefined) {
      updateData.positionX = input.position.x;
      updateData.positionY = input.position.y;
      updateData.width = input.position.width;
      updateData.height = input.position.height;
      updateData.zIndex = input.position.zIndex;
    }

    const card = await database.commandBoardCard.update({
      where: {
        tenantId_id: {
          tenantId,
          id: input.id,
        },
      },
      data: updateData,
    });

    return {
      success: true,
      card: {
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
        metadata: (card.metadata as Record<string, unknown>) ?? {},
        createdAt: card.createdAt,
        updatedAt: card.updatedAt,
        deletedAt: card.deletedAt,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update card",
    };
  }
}

export async function deleteCard(cardId: string): Promise<CardResult> {
  try {
    const tenantId = await requireTenantId();

    await database.commandBoardCard.update({
      where: {
        tenantId_id: {
          tenantId,
          id: cardId,
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
      error: error instanceof Error ? error.message : "Failed to delete card",
    };
  }
}

export async function batchUpdateCardPositions(
  updates: Array<{ id: string; position: CardPosition }>
): Promise<{ success: number; failed: number }> {
  const tenantId = await requireTenantId();

  let successCount = 0;
  let failedCount = 0;

  for (const update of updates) {
    try {
      await database.commandBoardCard.update({
        where: {
          tenantId_id: {
            tenantId,
            id: update.id,
          },
        },
        data: positionToDb(update.position),
      });
      successCount += 1;
    } catch (_error) {
      failedCount += 1;
    }
  }

  return { success: successCount, failed: failedCount };
}

export async function bringCardToFront(cardId: string): Promise<CardResult> {
  try {
    const tenantId = await requireTenantId();

    const maxZCards = await database.commandBoardCard.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
      orderBy: {
        zIndex: "desc",
      },
      take: 1,
    });

    const maxZ = (maxZCards[0]?.zIndex ?? 0) + 1;

    await database.commandBoardCard.update({
      where: {
        tenantId_id: {
          tenantId,
          id: cardId,
        },
      },
      data: {
        zIndex: maxZ,
      },
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update card",
    };
  }
}
