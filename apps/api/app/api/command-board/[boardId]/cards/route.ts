/**
 * Command Board Cards API Endpoints
 *
 * GET    /api/command-board/[boardId]/cards      - List cards for a board
 * POST   /api/command-board/[boardId]/cards      - Create a new card
 */

import { auth } from "@repo/auth/server";
import { database, type Prisma } from "@repo/database";
import { NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import type { CreateCardRequest } from "../../types";
import { parseCardListFilters, validateCreateCardRequest } from "./validation";

type RouteContext = {
  params: Promise<{ boardId: string }>;
};

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
 * Get the next zIndex for a new card (place on top)
 */
async function getNextZIndex(
  tenantId: string,
  boardId: string
): Promise<number> {
  const maxZIndexCard = await database.commandBoardCard.findFirst({
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
function buildCardWhereClause(
  tenantId: string,
  boardId: string,
  filters: { cardType?: string; status?: string }
) {
  const whereClause: Record<string, unknown> = {
    AND: [{ tenantId }, { boardId }, { deletedAt: null }],
  };

  if (filters.cardType) {
    (whereClause.AND as Record<string, unknown>[]).push({
      cardType: filters.cardType,
    });
  }

  if (filters.status) {
    (whereClause.AND as Record<string, unknown>[]).push({
      status: filters.status,
    });
  }

  return whereClause;
}

/**
 * GET /api/command-board/[boardId]/cards
 * List cards for a specific board with optional filters
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

    const filters = parseCardListFilters(searchParams);
    const whereClause = buildCardWhereClause(tenantId, boardId, filters);

    const cards = await database.commandBoardCard.findMany({
      where: whereClause,
      orderBy: [{ zIndex: "asc" }, { createdAt: "desc" }],
      select: CARD_SELECT,
    });

    return NextResponse.json({ data: cards });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Error listing cards:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/command-board/[boardId]/cards
 * Create a new card on the specified board
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { boardId } = await context.params;
    const body = await request.json();

    validateBoardId(boardId);
    validateCreateCardRequest(body);

    const data = body as CreateCardRequest;

    const boardExists = await verifyBoardAccess(tenantId, boardId);
    if (!boardExists) {
      return NextResponse.json({ message: "Board not found" }, { status: 404 });
    }

    const defaultZIndex = await getNextZIndex(tenantId, boardId);

    const card = await database.commandBoardCard.create({
      data: {
        tenantId,
        boardId,
        title: data.title.trim(),
        content: data.content?.trim() || null,
        cardType: data.cardType || "task",
        status: data.status || "pending",
        positionX: data.positionX ?? 0,
        positionY: data.positionY ?? 0,
        width: data.width ?? 200,
        height: data.height ?? 150,
        zIndex: data.zIndex ?? defaultZIndex,
        color: data.color || null,
        metadata: (data.metadata || {}) as Prisma.InputJsonValue,
      },
      select: CARD_SELECT,
    });

    return NextResponse.json({ data: card }, { status: 201 });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Error creating card:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
