/**
 * Command Board Groups API Endpoints
 *
 * GET    /api/command-board/[boardId]/groups      - List groups for a board
 * POST   /api/command-board/[boardId]/groups      - Create a new group
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { createOutboxEvent } from "@repo/realtime";
import { NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import type { CreateGroupRequest } from "../../types";
import { validateCreateGroupRequest } from "./validation";

interface RouteContext {
  params: Promise<{ boardId: string }>;
}

const GROUP_SELECT = {
  id: true,
  tenantId: true,
  boardId: true,
  name: true,
  color: true,
  collapsed: true,
  positionX: true,
  positionY: true,
  width: true,
  height: true,
  zIndex: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * Validate board ID parameter
 */
function validateBoardId(boardId: string): void {
  if (!boardId || typeof boardId !== "string") {
    throw new InvariantError("Invalid board ID");
  }
}

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
 * Get the next zIndex for a new group (place on top)
 */
async function getNextZIndex(
  tenantId: string,
  boardId: string
): Promise<number> {
  const maxZIndexGroup = await database.commandBoardGroup.findFirst({
    where: {
      AND: [{ tenantId }, { boardId }, { deletedAt: null }],
    },
    orderBy: { zIndex: "desc" },
    select: { zIndex: true },
  });
  return (maxZIndexGroup?.zIndex ?? -1) + 1;
}

/**
 * Build where clause for group queries
 */
function buildGroupWhereClause(tenantId: string, boardId: string) {
  return {
    AND: [{ tenantId }, { boardId }, { deletedAt: null }],
  };
}

/**
 * GET /api/command-board/[boardId]/groups
 * List groups for a specific board
 */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { boardId } = await context.params;

    validateBoardId(boardId);

    const whereClause = buildGroupWhereClause(tenantId, boardId);

    const groups = await database.commandBoardGroup.findMany({
      where: whereClause,
      orderBy: [{ zIndex: "asc" }, { createdAt: "desc" }],
      select: GROUP_SELECT,
    });

    return NextResponse.json({ data: groups });
  } catch (error: unknown) {
    if (error instanceof InvariantError) {
      const message = (error as InvariantError).message;
      return NextResponse.json({ message }, { status: 400 });
    }
    console.error("Error listing groups:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/command-board/[boardId]/groups
 * Create a new group on the specified board
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const { orgId, userId } = await auth();
    if (!(orgId && userId)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { boardId } = await context.params;
    const body = await request.json();

    validateBoardId(boardId);
    validateCreateGroupRequest(body);

    const data = body as CreateGroupRequest;

    const boardExists = await verifyBoardAccess(tenantId, boardId);
    if (!boardExists) {
      return NextResponse.json({ message: "Board not found" }, { status: 404 });
    }

    const defaultZIndex = await getNextZIndex(tenantId, boardId);

    const positionX = data.positionX ?? 0;
    const positionY = data.positionY ?? 0;

    const group = await database.$transaction(async (tx) => {
      const createdGroup = await tx.commandBoardGroup.create({
        data: {
          tenantId,
          boardId,
          name: data.name.trim(),
          color: data.color || null,
          collapsed: data.collapsed ?? false,
          positionX,
          positionY,
          width: data.width ?? 300,
          height: data.height ?? 200,
          zIndex: data.zIndex ?? defaultZIndex,
        },
        select: GROUP_SELECT,
      });

      // Publish outbox event for real-time sync
      await createOutboxEvent(tx, {
        tenantId,
        aggregateType: "CommandBoardGroup",
        aggregateId: createdGroup.id,
        eventType: "command.board.group.created",
        payload: {
          boardId,
          groupId: createdGroup.id,
          name: createdGroup.name,
          positionX,
          positionY,
          createdBy: userId,
          createdAt: createdGroup.createdAt.toISOString(),
        },
      });

      return createdGroup;
    });

    return NextResponse.json({ data: group }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof InvariantError) {
      const message = (error as InvariantError).message;
      return NextResponse.json({ message }, { status: 400 });
    }
    console.error("Error creating group:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
