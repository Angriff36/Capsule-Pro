/**
 * Command Board Cards API Endpoints
 *
 * GET    /api/command-board/[boardId]/cards      - List cards for a board
 * POST   /api/command-board/[boardId]/cards      - Create a new card
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const realtime_1 = require("@repo/realtime");
const server_2 = require("next/server");
const invariant_1 = require("@/app/lib/invariant");
const tenant_1 = require("@/app/lib/tenant");
const validation_1 = require("./validation");
const CARD_SELECT = {
  id: true,
  tenantId: true,
  boardId: true,
  title: true,
  content: true,
  cardType: true,
  status: true,
  positionX: true,
  positionY: true,
  width: true,
  height: true,
  zIndex: true,
  color: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
};
/**
 * Validate board ID parameter
 */
function validateBoardId(boardId) {
  if (!boardId || typeof boardId !== "string") {
    throw new invariant_1.InvariantError("Invalid board ID");
  }
}
/**
 * Verify board exists and belongs to tenant
 */
async function verifyBoardAccess(tenantId, boardId) {
  const board = await database_1.database.commandBoard.findFirst({
    where: {
      AND: [{ tenantId }, { id: boardId }, { deletedAt: null }],
    },
  });
  return board !== null;
}
/**
 * Get the next zIndex for a new card (place on top)
 */
async function getNextZIndex(tenantId, boardId) {
  const maxZIndexCard = await database_1.database.commandBoardCard.findFirst({
    where: {
      AND: [{ tenantId }, { boardId }, { deletedAt: null }],
    },
    orderBy: { zIndex: "desc" },
    select: { zIndex: true },
  });
  return (maxZIndexCard?.zIndex ?? -1) + 1;
}
/**
 * Build where clause for card queries
 */
function buildCardWhereClause(tenantId, boardId, filters) {
  const whereClause = {
    AND: [{ tenantId }, { boardId }, { deletedAt: null }],
  };
  if (filters.cardType) {
    whereClause.AND.push({
      cardType: filters.cardType,
    });
  }
  if (filters.status) {
    whereClause.AND.push({
      status: filters.status,
    });
  }
  return whereClause;
}
/**
 * GET /api/command-board/[boardId]/cards
 * List cards for a specific board with optional filters
 */
async function GET(request, context) {
  try {
    const { orgId } = await (0, server_1.auth)();
    if (!orgId) {
      return server_2.NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
    const { boardId } = await context.params;
    const { searchParams } = new URL(request.url);
    validateBoardId(boardId);
    const filters = (0, validation_1.parseCardListFilters)(searchParams);
    const whereClause = buildCardWhereClause(tenantId, boardId, filters);
    const cards = await database_1.database.commandBoardCard.findMany({
      where: whereClause,
      orderBy: [{ zIndex: "asc" }, { createdAt: "desc" }],
      select: CARD_SELECT,
    });
    return server_2.NextResponse.json({ data: cards });
  } catch (error) {
    if (error instanceof invariant_1.InvariantError) {
      return server_2.NextResponse.json(
        { message: error.message },
        { status: 400 }
      );
    }
    console.error("Error listing cards:", error);
    return server_2.NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
/**
 * POST /api/command-board/[boardId]/cards
 * Create a new card on the specified board
 */
async function POST(request, context) {
  try {
    const { orgId, userId } = await (0, server_1.auth)();
    if (!(orgId && userId)) {
      return server_2.NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
    const { boardId } = await context.params;
    const body = await request.json();
    validateBoardId(boardId);
    (0, validation_1.validateCreateCardRequest)(body);
    const data = body;
    const boardExists = await verifyBoardAccess(tenantId, boardId);
    if (!boardExists) {
      return server_2.NextResponse.json(
        { message: "Board not found" },
        { status: 404 }
      );
    }
    const defaultZIndex = await getNextZIndex(tenantId, boardId);
    const positionX = data.positionX ?? 0;
    const positionY = data.positionY ?? 0;
    const card = await database_1.database.$transaction(async (tx) => {
      const createdCard = await tx.commandBoardCard.create({
        data: {
          tenantId,
          boardId,
          title: data.title.trim(),
          content: data.content?.trim() || null,
          cardType: data.cardType || "task",
          status: data.status || "pending",
          positionX,
          positionY,
          width: data.width ?? 200,
          height: data.height ?? 150,
          zIndex: data.zIndex ?? defaultZIndex,
          color: data.color || null,
          metadata: data.metadata || {},
        },
        select: CARD_SELECT,
      });
      // Publish outbox event for real-time sync
      await (0, realtime_1.createOutboxEvent)(tx, {
        tenantId,
        aggregateType: "CommandBoardCard",
        aggregateId: createdCard.id,
        eventType: "command.board.card.created",
        payload: {
          boardId,
          cardId: createdCard.id,
          cardType: createdCard.cardType,
          title: createdCard.title,
          positionX,
          positionY,
          createdBy: userId,
          createdAt: createdCard.createdAt.toISOString(),
        },
      });
      return createdCard;
    });
    return server_2.NextResponse.json({ data: card }, { status: 201 });
  } catch (error) {
    if (error instanceof invariant_1.InvariantError) {
      return server_2.NextResponse.json(
        { message: error.message },
        { status: 400 }
      );
    }
    console.error("Error creating card:", error);
    return server_2.NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
