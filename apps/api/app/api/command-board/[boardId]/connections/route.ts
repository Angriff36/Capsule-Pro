/**
 * Command Board Connections API Endpoints
 *
 * GET    /api/command-board/[boardId]/connections      - List connections for a board
 * POST   /api/command-board/[boardId]/connections      - Create a new connection
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { createOutboxEvent } from "@repo/realtime";
import { NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import type { CreateConnectionRequest } from "../../types";
import {
  parseConnectionListFilters,
  validateCreateConnectionRequest,
} from "./validation";

interface RouteContext {
  params: Promise<{ boardId: string }>;
}

const CONNECTION_SELECT = {
  id: true,
  tenantId: true,
  boardId: true,
  fromCardId: true,
  toCardId: true,
  relationshipType: true,
  label: true,
  visible: true,
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
 * Verify both cards exist and belong to the board
 */
async function verifyCardsExist(
  tenantId: string,
  boardId: string,
  fromCardId: string,
  toCardId: string
): Promise<boolean> {
  const cards = await database.commandBoardCard.findMany({
    where: {
      AND: [
        { tenantId },
        { boardId },
        { deletedAt: null },
        {
          OR: [{ id: fromCardId }, { id: toCardId }],
        },
      ],
    },
    select: { id: true },
  });

  return cards.length === 2;
}

/**
 * Build where clause for connection queries
 */
function buildConnectionWhereClause(
  tenantId: string,
  boardId: string,
  filters: { fromCardId?: string; toCardId?: string; relationshipType?: string }
) {
  const whereClause: Record<string, unknown> = {
    AND: [{ tenantId }, { boardId }, { deletedAt: null }],
  };

  if (filters.fromCardId) {
    (whereClause.AND as Record<string, unknown>[]).push({
      fromCardId: filters.fromCardId,
    });
  }

  if (filters.toCardId) {
    (whereClause.AND as Record<string, unknown>[]).push({
      toCardId: filters.toCardId,
    });
  }

  if (filters.relationshipType) {
    (whereClause.AND as Record<string, unknown>[]).push({
      relationshipType: filters.relationshipType,
    });
  }

  return whereClause;
}

/**
 * GET /api/command-board/[boardId]/connections
 * List connections for a specific board with optional filters
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { boardId } = await context.params;
    const { searchParams } = new URL(request.url);

    validateBoardId(boardId);

    const filters = parseConnectionListFilters(searchParams);
    const whereClause = buildConnectionWhereClause(tenantId, boardId, filters);

    const connections = await database.commandBoardConnection.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      select: CONNECTION_SELECT,
    });

    return NextResponse.json({ data: connections });
  } catch (error: unknown) {
    if (error instanceof InvariantError) {
      const message = (error as InvariantError).message;
      return NextResponse.json({ message }, { status: 400 });
    }
    console.error("Error listing connections:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/command-board/[boardId]/connections
 * Create a new connection between cards on the specified board
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
    validateCreateConnectionRequest(body);

    const data = body as CreateConnectionRequest;

    const boardExists = await verifyBoardAccess(tenantId, boardId);
    if (!boardExists) {
      return NextResponse.json({ message: "Board not found" }, { status: 404 });
    }

    const cardsExist = await verifyCardsExist(
      tenantId,
      boardId,
      data.fromCardId,
      data.toCardId
    );
    if (!cardsExist) {
      return NextResponse.json(
        { message: "One or both cards not found" },
        { status: 404 }
      );
    }

    const connection = await database.$transaction(async (tx) => {
      const createdConnection = await tx.commandBoardConnection.create({
        data: {
          tenantId,
          boardId,
          fromCardId: data.fromCardId,
          toCardId: data.toCardId,
          relationshipType: data.relationshipType || "generic",
          label: data.label?.trim() || null,
          visible: data.visible ?? true,
        },
        select: CONNECTION_SELECT,
      });

      // Publish outbox event for real-time sync
      await createOutboxEvent(tx, {
        tenantId,
        aggregateType: "CommandBoardConnection",
        aggregateId: createdConnection.id,
        eventType: "command.board.connection.created",
        payload: {
          boardId,
          connectionId: createdConnection.id,
          fromCardId: createdConnection.fromCardId,
          toCardId: createdConnection.toCardId,
          relationshipType: createdConnection.relationshipType,
          createdBy: userId,
          createdAt: createdConnection.createdAt.toISOString(),
        },
      });

      return createdConnection;
    });

    return NextResponse.json({ data: connection }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof InvariantError) {
      const message = (error as InvariantError).message;
      return NextResponse.json({ message }, { status: 400 });
    }

    // Handle unique constraint violation for duplicate connections
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          message:
            "A connection between these cards with this type already exists",
        },
        { status: 409 }
      );
    }

    console.error("Error creating connection:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
