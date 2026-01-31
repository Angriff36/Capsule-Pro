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
import type {
  BoardStatus,
  CardStatus,
  CardType,
  CommandBoardWithCards,
} from "../types";
import { validateUpdateCommandBoardRequest } from "../validation";

type RouteContext = {
  params: Promise<{ boardId: string }>;
};

async function fetchBoardWithCards(boardId: string, tenantId: string) {
  return await database.commandBoard.findFirst({
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
}

function formatCommandBoardWithCards(board: {
  id: string;
  tenantId: string;
  eventId: string | null;
  name: string;
  description: string | null;
  status: string;
  isTemplate: boolean;
  tags: string[] | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  cards: Array<{
    id: string;
    tenantId: string;
    boardId: string;
    title: string;
    content: string | null;
    cardType: string;
    status: string;
    positionX: number;
    positionY: number;
    width: number;
    height: number;
    zIndex: number;
    color: string | null;
    metadata: Record<string, unknown> | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }>;
}): CommandBoardWithCards {
  return {
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
      card_type: card.cardType as CardType,
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
}

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

    const board = await fetchBoardWithCards(boardId, tenantId);

    if (!board) {
      return NextResponse.json(
        { message: "Command board not found" },
        { status: 404 }
      );
    }

    const boardWithCards = formatCommandBoardWithCards(board);

    return NextResponse.json(boardWithCards);
  } catch (error) {
    console.error(
      "Failed to get command board:",
      error instanceof Error ? error : new Error(String(error))
    );
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

    const existing = await fetchBoardWithCards(boardId, tenantId);

    if (!existing) {
      return NextResponse.json(
        { message: "Command board not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    validateUpdateCommandBoardRequest(body);

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

    const updatedBoard = await fetchBoardWithCards(boardId, tenantId);

    if (!updatedBoard) {
      return NextResponse.json(
        { message: "Command board not found" },
        { status: 404 }
      );
    }

    const boardWithCards = formatCommandBoardWithCards(updatedBoard);

    return NextResponse.json(boardWithCards);
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json(
        { message: (error as InvariantError).message },
        { status: 400 }
      );
    }
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("Failed to update command board:", err);
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
    console.error(
      "Failed to delete command board:",
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
