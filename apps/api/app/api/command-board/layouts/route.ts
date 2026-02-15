/**
 * Command Board Layouts API Endpoints
 *
 * GET    /api/command-board/layouts      - List user's layouts
 * POST   /api/command-board/layouts      - Create a new layout
 */

import { auth } from "@repo/auth/server";
import { database, type Prisma } from "@repo/database";
import { createOutboxEvent } from "@repo/realtime";
import { NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import type { CreateLayoutRequest, ViewportState } from "../types";
import { validateBoardId, validateCreateLayoutRequest } from "./validation";

const LAYOUT_SELECT = {
  id: true,
  tenantId: true,
  boardId: true,
  userId: true,
  name: true,
  viewport: true,
  visibleCards: true,
  gridSize: true,
  showGrid: true,
  snapToGrid: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * Verify board exists and belongs to tenant
 */
async function verifyBoardAccess(
  tenantId: string,
  boardId: string
): Promise<boolean> {
  const board = await database.commandBoard.findFirst({
    where: {
      AND: [{ tenantId }, { id: boardId }, { deletedAt: null }],
    },
  });
  return board !== null;
}

/**
 * Get the default viewport state
 */
function getDefaultViewport(): ViewportState {
  return {
    zoom: 1,
    panX: 0,
    panY: 0,
  };
}

/**
 * GET /api/command-board/layouts
 * List layouts for the authenticated user, optionally filtered by board
 */
export async function GET(request: Request) {
  try {
    const { orgId, userId } = await auth();
    if (!(orgId && userId)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { searchParams } = new URL(request.url);

    const boardId = searchParams.get("boardId");

    // Build where clause
    const whereClause: Prisma.CommandBoardLayoutWhereInput = {
      AND: [{ tenantId }, { userId }, { deletedAt: null }],
    };

    if (boardId) {
      validateBoardId(boardId);
      (whereClause.AND as Prisma.CommandBoardLayoutWhereInput[]).push({
        boardId,
      });
    }

    const layouts = await database.commandBoardLayout.findMany({
      where: whereClause,
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      select: LAYOUT_SELECT,
    });

    return NextResponse.json({ data: layouts });
  } catch (error: unknown) {
    if (error instanceof InvariantError) {
      const message = (error as InvariantError).message;
      return NextResponse.json({ message }, { status: 400 });
    }
    console.error("Error listing layouts:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/command-board/layouts
 * Create a new layout for the authenticated user
 */
export async function POST(request: Request) {
  try {
    const { orgId, userId } = await auth();
    if (!(orgId && userId)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const body = await request.json();

    validateCreateLayoutRequest(body);

    const data = body as CreateLayoutRequest;

    const boardExists = await verifyBoardAccess(tenantId, data.boardId);
    if (!boardExists) {
      return NextResponse.json({ message: "Board not found" }, { status: 404 });
    }

    const layout = await database.$transaction(async (tx) => {
      const createdLayout = await tx.commandBoardLayout.create({
        data: {
          tenantId,
          boardId: data.boardId,
          userId,
          name: data.name.trim(),
          viewport: (data.viewport ||
            getDefaultViewport()) as unknown as Prisma.InputJsonValue,
          visibleCards: data.visibleCards || [],
          gridSize: data.gridSize ?? 40,
          showGrid: data.showGrid ?? true,
          snapToGrid: data.snapToGrid ?? true,
        },
        select: LAYOUT_SELECT,
      });

      // Publish outbox event for real-time sync
      await createOutboxEvent(tx, {
        tenantId,
        aggregateType: "CommandBoardLayout",
        aggregateId: createdLayout.id,
        eventType: "command.board.layout.created",
        payload: {
          boardId: data.boardId,
          layoutId: createdLayout.id,
          name: createdLayout.name,
          userId,
          createdAt: createdLayout.createdAt.toISOString(),
        },
      });

      return createdLayout;
    });

    return NextResponse.json({ data: layout }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof InvariantError) {
      const message = (error as InvariantError).message;
      return NextResponse.json({ message }, { status: 400 });
    }
    console.error("Error creating layout:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
