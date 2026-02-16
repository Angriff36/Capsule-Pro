/**
 * Command Board Replay API Endpoint
 *
 * GET /api/command-board/[boardId]/replay - Fetch replay events for a board
 *
 * Returns recent events that occurred on the board, allowing users
 * joining a session to see what happened before they arrived.
 */

import { auth } from "@repo/auth/server";
import { database, type Prisma } from "@repo/database";
import { NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";

interface RouteContext {
  params: Promise<{ boardId: string }>;
}

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
 * GET /api/command-board/[boardId]/replay
 * Fetch replay events for a specific board
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

    const boardExists = await verifyBoardAccess(tenantId, boardId);
    if (!boardExists) {
      return NextResponse.json({ message: "Board not found" }, { status: 404 });
    }

    // Parse query parameters
    const limit = Number.parseInt(searchParams.get("limit") || "1000", 10);
    const sinceParam = searchParams.get("since");
    const since = sinceParam ? new Date(sinceParam) : undefined;

    if (limit < 1 || limit > 5000) {
      return NextResponse.json(
        { message: "Limit must be between 1 and 5000" },
        { status: 400 }
      );
    }

    // Get all card and connection IDs for this board
    const cards = await database.commandBoardCard.findMany({
      where: {
        AND: [{ tenantId }, { boardId }, { deletedAt: null }],
      },
      select: { id: true },
    });

    const connections = await database.commandBoardConnection.findMany({
      where: {
        AND: [{ tenantId }, { boardId }, { deletedAt: null }],
      },
      select: { id: true },
    });

    const cardIds = cards.map((card: { id: string }) => card.id);
    const connectionIds = connections.map(
      (connection: { id: string }) => connection.id
    );
    const allAggregateIds = [...cardIds, ...connectionIds];

    if (allAggregateIds.length === 0) {
      return NextResponse.json({
        data: {
          events: [],
          totalCount: 0,
          lastSequence: 0,
          hasMore: false,
        },
      });
    }

    // Build where clause for outbox events
    const whereClause: Prisma.OutboxEventWhereInput = {
      AND: [
        { tenantId },
        { aggregateId: { in: allAggregateIds } },
        {
          aggregateType: {
            in: ["CommandBoardCard", "CommandBoardConnection"],
          },
        },
        { status: "published" },
      ],
    };

    // Add time filter if provided
    if (since) {
      (whereClause.AND as Prisma.OutboxEventWhereInput[]).push({
        createdAt: { gte: since },
      });
    }

    // Fetch outbox events for these entities
    const outboxEvents = await database.outboxEvent.findMany({
      where: whereClause,
      orderBy: { createdAt: "asc" },
      take: limit,
    });

    // Convert to ReplayEvent format
    const events = outboxEvents.map(
      (outboxEvent: {
        id: string;
        eventType: string;
        payload: Prisma.JsonValue;
        createdAt: Date;
      }) => {
        const payload = outboxEvent.payload as Record<string, unknown>;
        return {
          id: outboxEvent.id,
          eventType: outboxEvent.eventType,
          occurredAt: outboxEvent.createdAt.toISOString(),
          userId:
            (payload.userId as string) || (payload.createdBy as string) || "",
          payload,
          sequence: outboxEvent.createdAt.getTime(),
        };
      }
    );

    // Get total count
    const countWhereClause: Prisma.OutboxEventWhereInput = {
      AND: [
        { tenantId },
        { aggregateId: { in: allAggregateIds } },
        {
          aggregateType: {
            in: ["CommandBoardCard", "CommandBoardConnection"],
          },
        },
        { status: "published" },
      ],
    };
    const totalCount = await database.outboxEvent.count({
      where: countWhereClause,
    });

    const lastSequence = events.length > 0 ? (events.at(-1)?.sequence ?? 0) : 0;
    const hasMore = events.length === limit;

    return NextResponse.json({
      data: {
        events,
        totalCount,
        lastSequence,
        hasMore,
      },
    });
  } catch (error: unknown) {
    if (error instanceof InvariantError) {
      const message = (error as InvariantError).message;
      return NextResponse.json({ message }, { status: 400 });
    }
    console.error("Error fetching replay events:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
