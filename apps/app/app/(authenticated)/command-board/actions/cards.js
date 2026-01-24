"use server";

Object.defineProperty(exports, "__esModule", { value: true });
exports.createCard = createCard;
exports.updateCard = updateCard;
exports.deleteCard = deleteCard;
exports.batchUpdateCardPositions = batchUpdateCardPositions;
exports.bringCardToFront = bringCardToFront;
const database_1 = require("@repo/database");
const tenant_1 = require("../../../lib/tenant");
function positionToDb(position) {
  return {
    positionX: position.x,
    positionY: position.y,
    width: position.width,
    height: position.height,
    zIndex: position.zIndex,
  };
}
async function createCard(boardId, input) {
  try {
    const tenantId = await (0, tenant_1.requireTenantId)();
    const maxZCards = await database_1.database.commandBoardCard.findMany({
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
    const defaultPosition = {
      x: 100,
      y: 100,
      width: 280,
      height: 180,
      zIndex: maxZ + 1,
    };
    const position = input.position
      ? { ...defaultPosition, ...input.position }
      : defaultPosition;
    const metadata = input.metadata ?? {};
    const card = await database_1.database.commandBoardCard.create({
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
        metadata,
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
        cardType: card.cardType,
        status: card.status,
        position: {
          x: card.positionX,
          y: card.positionY,
          width: card.width,
          height: card.height,
          zIndex: card.zIndex,
        },
        color: card.color,
        metadata: card.metadata ?? {},
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
async function updateCard(input) {
  try {
    const tenantId = await (0, tenant_1.requireTenantId)();
    const updateData = {};
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
      updateData.metadata = input.metadata;
    }
    if (input.position !== undefined) {
      updateData.positionX = input.position.x;
      updateData.positionY = input.position.y;
      updateData.width = input.position.width;
      updateData.height = input.position.height;
      updateData.zIndex = input.position.zIndex;
    }
    const card = await database_1.database.commandBoardCard.update({
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
        cardType: card.cardType,
        status: card.status,
        position: {
          x: card.positionX,
          y: card.positionY,
          width: card.width,
          height: card.height,
          zIndex: card.zIndex,
        },
        color: card.color,
        metadata: card.metadata ?? {},
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
async function deleteCard(cardId) {
  try {
    const tenantId = await (0, tenant_1.requireTenantId)();
    await database_1.database.commandBoardCard.update({
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
async function batchUpdateCardPositions(updates) {
  const tenantId = await (0, tenant_1.requireTenantId)();
  let successCount = 0;
  let failedCount = 0;
  for (const update of updates) {
    try {
      await database_1.database.commandBoardCard.update({
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
async function bringCardToFront(cardId) {
  try {
    const tenantId = await (0, tenant_1.requireTenantId)();
    const maxZCards = await database_1.database.commandBoardCard.findMany({
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
    await database_1.database.commandBoardCard.update({
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
