/**
 * Individual Command Board API Endpoints
 *
 * GET    /api/command-board/[boardId]  - Get a single command board with cards
 * PUT    /api/command-board/[boardId]  - Update a command board
 * DELETE /api/command-board/[boardId]  - Delete a command board (soft delete)
 */

import { auth } from "@repo/auth/server";
import { database, type Prisma } from "@repo/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { executeManifestCommand } from "@/lib/manifest-command-handler";
import type {
  BoardStatus,
  CardStatus,
  CardType,
  CommandBoardWithCards,
} from "../types";

interface RouteContext {
  params: Promise<{ boardId: string }>;
}

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
        select: {
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
          vectorClock: true,
          version: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
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
    metadata: unknown;
    vectorClock: Prisma.JsonValue;
    version: number;
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
    tags: board.tags ?? [],
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
      metadata: (card.metadata as Record<string, unknown>) ?? null,
      vector_clock: (card.vectorClock as Record<string, number> | null) ?? null,
      version: card.version,
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
 * PUT /api/command-board/[boardId] - Update a command board via manifest runtime
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  const { boardId } = await context.params;
  return executeManifestCommand(request, {
    entityName: "CommandBoard",
    commandName: "update",
    params: { id: boardId },
    transformBody: (body, ctx) => ({
      ...body,
      id: boardId,
      tenantId: ctx.tenantId,
    }),
  });
}

/**
 * DELETE /api/command-board/[boardId] - Deactivate a command board via manifest runtime
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const { boardId } = await context.params;
  return executeManifestCommand(request, {
    entityName: "CommandBoard",
    commandName: "deactivate",
    params: { id: boardId },
    transformBody: (_body, ctx) => ({
      id: boardId,
      tenantId: ctx.tenantId,
    }),
  });
}
