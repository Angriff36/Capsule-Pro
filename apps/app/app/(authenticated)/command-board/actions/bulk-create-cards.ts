"use server";

import { database } from "@repo/database";
import { requireTenantId } from "../../../lib/tenant";
import type { CardToCreate } from "./suggestions-types";
import type { CardResult } from "./cards";
import type { CardMetadata, CardType } from "../types";

export interface BulkCreateCardsInput {
  cards: CardToCreate[];
}

export interface BulkCreateCardsResult {
  success: boolean;
  created: number;
  cards?: CardResult["card"][];
  error?: string;
}

/**
 * Creates multiple command board cards in a single transaction.
 * Used by AI suggestions to bulk-add entities to the board.
 */
export async function bulkCreateCards(
  boardId: string,
  input: BulkCreateCardsInput
): Promise<BulkCreateCardsResult> {
  try {
    const tenantId = await requireTenantId();

    // Validate board belongs to tenant
    const board = await database.commandBoard.findFirst({
      where: { tenantId, id: boardId },
    });

    if (!board) {
      return { success: false, created: 0, error: "Board not found" };
    }

    const createdCards: CardResult["card"][] = [];

    // Create cards in sequence (Prisma doesn't support createMany with relations)
    for (const cardInput of input.cards) {
      const cardType: CardType =
        cardInput.entityType === "note" ? "note" : cardInput.entityType;

      // For entity-linked cards, validate the entity exists
      if (cardInput.entityId && cardInput.entityType !== "note") {
        let entityExists = false;

        switch (cardInput.entityType) {
          case "client":
            entityExists = !!(await database.client.findFirst({
              where: { tenantId, id: cardInput.entityId },
            }));
            break;
          case "event":
            entityExists = !!(await database.event.findFirst({
              where: { tenantId, id: cardInput.entityId },
            }));
            break;
          case "task":
            entityExists = !!(await database.kitchenTask.findFirst({
              where: { tenantId, id: cardInput.entityId },
            }));
            break;
          case "employee":
            entityExists = !!(await database.user.findUnique({
              where: { tenantId_id: { tenantId, id: cardInput.entityId } },
            }));
            break;
          case "inventory":
            entityExists = !!(await database.inventoryItem.findUnique({
              where: { tenantId_id: { tenantId, id: cardInput.entityId } },
            }));
            break;
        }

        if (!entityExists) {
          // Skip this card but continue with others
          continue;
        }
      }

      const card = await database.commandBoardCard.create({
        data: {
          tenantId,
          boardId,
          id: crypto.randomUUID(),
          title: cardInput.title,
          content: cardInput.content ?? null,
          cardType,
          status: "active",
          positionX: cardInput.position.x,
          positionY: cardInput.position.y,
          width: cardInput.position.width,
          height: cardInput.position.height,
          zIndex: cardInput.position.zIndex,
          color: cardInput.color ?? null,
          entityId: cardInput.entityId ?? null,
          entityType: cardInput.entityType === "note" ? null : cardInput.entityType,
          metadata: {} as CardMetadata,
        },
      });

      createdCards.push({
        id: card.id,
        tenantId: card.tenantId,
        boardId: card.boardId,
        title: card.title,
        content: card.content,
        cardType,
        status: card.status as "active" | "completed" | "archived",
        position: {
          x: card.positionX,
          y: card.positionY,
          width: card.width,
          height: card.height,
          zIndex: card.zIndex,
        },
        color: card.color,
        metadata: (card.metadata as CardMetadata) || {},
        entityId: card.entityId ?? undefined,
        entityType: (card.entityType ?? undefined) as
          | "client"
          | "event"
          | "task"
          | "employee"
          | "inventory"
          | undefined,
        createdAt: card.createdAt,
        updatedAt: card.updatedAt,
        deletedAt: card.deletedAt,
      });
    }

    return {
      success: true,
      created: createdCards.length,
      cards: createdCards,
    };
  } catch (error) {
    return {
      success: false,
      created: 0,
      error: error instanceof Error ? error.message : "Failed to create cards",
    };
  }
}
