/**
 * Individual Command Board API Endpoints
 *
 * GET    /api/command-board/[boardId]  - Get a single command board with cards
 * PUT    /api/command-board/[boardId]  - Update a command board
 * DELETE /api/command-board/[boardId]  - Delete a command board (soft delete)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.PUT = PUT;
exports.DELETE = DELETE;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const invariant_1 = require("@/app/lib/invariant");
const tenant_1 = require("@/app/lib/tenant");
const validation_1 = require("../validation");
/**
 * GET /api/command-board/[boardId] - Get a single command board with cards
 */
async function GET(_request, context) {
  try {
    const { orgId } = await (0, server_1.auth)();
    if (!orgId) {
      return server_2.NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
    if (!tenantId) {
      return server_2.NextResponse.json(
        { message: "Tenant not found" },
        { status: 404 }
      );
    }
    const { boardId } = await context.params;
    if (!boardId) {
      return server_2.NextResponse.json(
        { message: "Board ID is required" },
        { status: 400 }
      );
    }
    const board = await database_1.database.commandBoard.findFirst({
      where: {
        id: boardId,
        tenantId,
        deletedAt: null,
      },
      include: {
        cards: {
          where: {
            deletedAt: null,
          },
          orderBy: {
            zIndex: "asc",
          },
        },
      },
    });
    if (!board) {
      return server_2.NextResponse.json(
        { message: "Command board not found" },
        { status: 404 }
      );
    }
    const boardWithCards = {
      id: board.id,
      tenant_id: board.tenantId,
      event_id: board.eventId,
      name: board.name,
      description: board.description,
      status: board.status,
      is_template: board.isTemplate,
      tags: board.tags,
      created_at: board.createdAt,
      updated_at: board.updatedAt,
      deleted_at: board.deletedAt,
      cards: board.cards.map((card) => ({
        id: card.id,
        tenant_id: card.tenantId,
        board_id: card.boardId,
        title: card.title,
        content: card.content,
        card_type: card.cardType,
        status: card.status,
        position_x: card.positionX,
        position_y: card.positionY,
        width: card.width,
        height: card.height,
        z_index: card.zIndex,
        color: card.color,
        metadata: card.metadata,
        created_at: card.createdAt,
        updated_at: card.updatedAt,
        deleted_at: card.deletedAt,
      })),
    };
    return server_2.NextResponse.json(boardWithCards);
  } catch (error) {
    console.error("Failed to get command board:", error);
    return server_2.NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
/**
 * PUT /api/command-board/[boardId] - Update a command board
 */
async function PUT(request, context) {
  try {
    const { orgId } = await (0, server_1.auth)();
    if (!orgId) {
      return server_2.NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
    if (!tenantId) {
      return server_2.NextResponse.json(
        { message: "Tenant not found" },
        { status: 404 }
      );
    }
    const { boardId } = await context.params;
    if (!boardId) {
      return server_2.NextResponse.json(
        { message: "Board ID is required" },
        { status: 400 }
      );
    }
    // Verify board exists and belongs to tenant
    const existing = await database_1.database.commandBoard.findFirst({
      where: {
        id: boardId,
        tenantId,
        deletedAt: null,
      },
    });
    if (!existing) {
      return server_2.NextResponse.json(
        { message: "Command board not found" },
        { status: 404 }
      );
    }
    const body = await request.json();
    (0, validation_1.validateUpdateCommandBoardRequest)(body);
    // Build update data with only provided fields
    const updateData = {};
    if (body.name !== undefined) {
      updateData.name = body.name;
    }
    if (body.description !== undefined) {
      updateData.description = body.description;
    }
    if (body.status !== undefined) {
      updateData.status = body.status;
    }
    if (body.is_template !== undefined) {
      updateData.isTemplate = body.is_template;
    }
    if (body.tags !== undefined) {
      updateData.tags = body.tags;
    }
    if (body.event_id !== undefined) {
      updateData.eventId = body.event_id;
    }
    // Update command board using raw SQL for composite key
    await database_1.database.$executeRaw`
      UPDATE "tenant_events".command_boards
      SET
        name = COALESCE(${body.name}, name),
        description = COALESCE(${body.description}, description),
        status = COALESCE(${body.status}, status),
        is_template = COALESCE(${body.is_template}, is_template),
        tags = COALESCE(${body.tags ? JSON.stringify(body.tags) : null}, tags::jsonb),
        event_id = COALESCE(${body.event_id}, event_id),
        updated_at = NOW()
      WHERE id = ${boardId} AND tenant_id = ${tenantId} AND deleted_at IS NULL
    `;
    // Fetch the updated board with cards
    const updatedBoard = await database_1.database.commandBoard.findFirst({
      where: {
        id: boardId,
        tenantId,
        deletedAt: null,
      },
      include: {
        cards: {
          where: {
            deletedAt: null,
          },
          orderBy: {
            zIndex: "asc",
          },
        },
      },
    });
    if (!updatedBoard) {
      return server_2.NextResponse.json(
        { message: "Command board not found" },
        { status: 404 }
      );
    }
    const boardWithCards = {
      id: updatedBoard.id,
      tenant_id: updatedBoard.tenantId,
      event_id: updatedBoard.eventId,
      name: updatedBoard.name,
      description: updatedBoard.description,
      status: updatedBoard.status,
      is_template: updatedBoard.isTemplate,
      tags: updatedBoard.tags,
      created_at: updatedBoard.createdAt,
      updated_at: updatedBoard.updatedAt,
      deleted_at: updatedBoard.deletedAt,
      cards: updatedBoard.cards.map((card) => ({
        id: card.id,
        tenant_id: card.tenantId,
        board_id: card.boardId,
        title: card.title,
        content: card.content,
        card_type: card.cardType,
        status: card.status,
        position_x: card.positionX,
        position_y: card.positionY,
        width: card.width,
        height: card.height,
        z_index: card.zIndex,
        color: card.color,
        metadata: card.metadata,
        created_at: card.createdAt,
        updated_at: card.updatedAt,
        deleted_at: card.deletedAt,
      })),
    };
    return server_2.NextResponse.json(boardWithCards);
  } catch (error) {
    if (error instanceof invariant_1.InvariantError) {
      return server_2.NextResponse.json(
        { message: error.message },
        { status: 400 }
      );
    }
    console.error("Failed to update command board:", error);
    return server_2.NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
/**
 * DELETE /api/command-board/[boardId] - Soft delete a command board
 */
async function DELETE(_request, context) {
  try {
    const { orgId } = await (0, server_1.auth)();
    if (!orgId) {
      return server_2.NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
    if (!tenantId) {
      return server_2.NextResponse.json(
        { message: "Tenant not found" },
        { status: 404 }
      );
    }
    const { boardId } = await context.params;
    if (!boardId) {
      return server_2.NextResponse.json(
        { message: "Board ID is required" },
        { status: 400 }
      );
    }
    // Verify board exists and belongs to tenant
    const existing = await database_1.database.commandBoard.findFirst({
      where: {
        id: boardId,
        tenantId,
        deletedAt: null,
      },
    });
    if (!existing) {
      return server_2.NextResponse.json(
        { message: "Command board not found" },
        { status: 404 }
      );
    }
    // Soft delete the board using raw SQL for composite key
    // Note: Cards will be cascade deleted due to the relation configuration
    await database_1.database.$executeRaw`
      UPDATE "tenant_events".command_boards
      SET deleted_at = NOW()
      WHERE id = ${boardId} AND tenant_id = ${tenantId} AND deleted_at IS NULL
    `;
    return new server_2.NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Failed to delete command board:", error);
    return server_2.NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
