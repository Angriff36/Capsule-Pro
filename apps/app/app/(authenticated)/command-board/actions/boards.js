"use server";

Object.defineProperty(exports, "__esModule", { value: true });
exports.getCommandBoard = getCommandBoard;
exports.listCommandBoards = listCommandBoards;
exports.createCommandBoard = createCommandBoard;
exports.updateCommandBoard = updateCommandBoard;
exports.deleteCommandBoard = deleteCommandBoard;
const database_1 = require("@repo/database");
const tenant_1 = require("../../../lib/tenant");
function dbBoardToBoard(board) {
  return {
    id: board.id,
    tenantId: board.tenantId,
    eventId: board.eventId,
    name: board.name,
    description: board.description,
    status: board.status || "draft",
    isTemplate: board.isTemplate,
    tags: board.tags,
    createdAt: board.createdAt,
    updatedAt: board.updatedAt,
    deletedAt: board.deletedAt,
  };
}
async function getCommandBoard(boardId) {
  const tenantId = await (0, tenant_1.requireTenantId)();
  const board = await database_1.database.commandBoard.findUnique({
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
    cards: board.cards.map((card) => ({
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
      metadata: card.metadata || {},
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
      deletedAt: card.deletedAt,
    })),
  };
}
async function listCommandBoards() {
  const tenantId = await (0, tenant_1.requireTenantId)();
  const boards = await database_1.database.commandBoard.findMany({
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
async function createCommandBoard(input) {
  try {
    const tenantId = await (0, tenant_1.requireTenantId)();
    const board = await database_1.database.commandBoard.create({
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
async function updateCommandBoard(input) {
  try {
    const tenantId = await (0, tenant_1.requireTenantId)();
    const board = await database_1.database.commandBoard.update({
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
async function deleteCommandBoard(boardId) {
  try {
    const tenantId = await (0, tenant_1.requireTenantId)();
    await database_1.database.commandBoard.update({
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
