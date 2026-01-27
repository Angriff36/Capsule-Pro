/**
 * Individual Command Board API Endpoints
 *
 * GET    /api/command-board/[boardId]  - Get a single command board with cards
 * PUT    /api/command-board/[boardId]  - Update a command board
 * DELETE /api/command-board/[boardId]  - Delete a command board (soft delete)
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import type { BoardStatus, CardStatus, CommandBoardWithCards } from "../types";
import { validateUpdateCommandBoardRequest } from "../validation";

type RouteContext = {
  params: Promise<{ boardId: string }>;
};

/**
 * GET /api/command-board/[boardId] - Get a single command board with cards
 */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json(
        { message: "Tenant not found" },
        { status: 404 }
      );
    }

    const { boardId } = await context.params;
    if (!boardId) {
      return NextResponse.json(
        { message: "Board ID is required" },
        { status: 400 }
      );
    }

    const board = await database.commandBoard.findFirst({
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
      return NextResponse.json(
        { message: "Command board not found" },
        { status: 404 }
      );
    }

    const boardWithCards: CommandBoardWithCards = {
      id: board.id,
      tenant_id: board.tenantId,
      event_id: board.eventId,
      name: board.name,
      description: board.description,
      status: board.status as BoardStatus,
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
        status: card.status as CardStatus,
        position_x: card.positionX,
        position_y: card.positionY,
        width: card.width,
        height: card.height,
        z_index: card.zIndex,
        color: card.color,
        metadata: card.metadata as Record<string, unknown>,
        created_at: card.createdAt,
        updated_at: card.updatedAt,
        deleted_at: card.deletedAt,
      })),
    };

    return NextResponse.json(boardWithCards);
  } catch (error) {
    console.error("Failed to get command board:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/command-board/[boardId] - Update a command board
 */
export async function PUT(request: Request, context: RouteContext) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json(
        { message: "Tenant not found" },
        { status: 404 }
      );
    }

    const { boardId } = await context.params;
    if (!boardId) {
      return NextResponse.json(
        { message: "Board ID is required" },
        { status: 400 }
      );
    }

    // Verify board exists and belongs to tenant
    const existing = await database.commandBoard.findFirst({
      where: {
        id: boardId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { message: "Command board not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    validateUpdateCommandBoardRequest(body);

    // Build update data with only provided fields
    const updateData: Record<string, unknown> = {};

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
    await database.$executeRaw`
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
    const updatedBoard = await database.commandBoard.findFirst({
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
      return NextResponse.json(
        { message: "Command board not found" },
        { status: 404 }
      );
    }

    const boardWithCards: CommandBoardWithCards = {
      id: updatedBoard.id,
      tenant_id: updatedBoard.tenantId,
      event_id: updatedBoard.eventId,
      name: updatedBoard.name,
      description: updatedBoard.description,
      status: updatedBoard.status as BoardStatus,
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
        status: card.status as CardStatus,
        position_x: card.positionX,
        position_y: card.positionY,
        width: card.width,
        height: card.height,
        z_index: card.zIndex,
        color: card.color,
        metadata: card.metadata as Record<string, unknown>,
        created_at: card.createdAt,
        updated_at: card.updatedAt,
        deleted_at: card.deletedAt,
      })),
    };

    return NextResponse.json(boardWithCards);
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Failed to update command board:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/command-board/[boardId] - Soft delete a command board
 */
export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json(
        { message: "Tenant not found" },
        { status: 404 }
      );
    }

    const { boardId } = await context.params;
    if (!boardId) {
      return NextResponse.json(
        { message: "Board ID is required" },
        { status: 400 }
      );
    }

    // Verify board exists and belongs to tenant
    const existing = await database.commandBoard.findFirst({
      where: {
        id: boardId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { message: "Command board not found" },
        { status: 404 }
      );
    }

    // Soft delete the board using raw SQL for composite key
    // Note: Cards will be cascade deleted due to the relation configuration
    await database.$executeRaw`
      UPDATE "tenant_events".command_boards
      SET deleted_at = NOW()
      WHERE id = ${boardId} AND tenant_id = ${tenantId} AND deleted_at IS NULL
    `;

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Failed to delete command board:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
