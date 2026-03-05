import { randomUUID } from "node:crypto";
import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { requireTenantId } from "@/app/lib/tenant";

export const runtime = "nodejs";
export const maxDuration = 30;

interface BulkCreateCardsRequest {
  boardId: string;
  cards: Array<{
    entityType: string;
    entityId?: string;
    title: string;
    content?: string;
    position: {
      x: number;
      y: number;
      width: number;
      height: number;
      zIndex: number;
    };
    color?: string;
  }>;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const { orgId, userId } = await auth();
    if (!(orgId && userId)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await requireTenantId();

    const body = (await request.json()) as BulkCreateCardsRequest;
    const { boardId, cards } = body;

    if (!boardId) {
      return Response.json({ error: "boardId is required" }, { status: 400 });
    }

    if (!Array.isArray(cards) || cards.length === 0) {
      return Response.json(
        { error: "cards must be a non-empty array" },
        { status: 400 }
      );
    }

    // Verify board exists and belongs to tenant
    const board = await database.commandBoard.findFirst({
      where: {
        id: boardId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!board) {
      return Response.json({ error: "Board not found" }, { status: 404 });
    }

    // Create projections for each card
    const createdProjections = await Promise.all(
      cards.map(async (card) => {
        // If entityId is provided, it's an existing entity
        // Otherwise, we'd need to create the entity first
        const projectionId = randomUUID();

        return database.boardProjection.create({
          data: {
            id: projectionId,
            tenantId,
            boardId,
            entityType: card.entityType as any,
            entityId: card.entityId || projectionId, // Use projection ID if no entity ID
            positionX: card.position.x,
            positionY: card.position.y,
            width: card.position.width,
            height: card.position.height,
            zIndex: card.position.zIndex,
            colorOverride: card.color ?? null,
            collapsed: false,
            groupId: null,
            pinned: false,
          },
        });
      })
    );

    return Response.json({
      success: true,
      projections: createdProjections,
      message: `Added ${createdProjections.length} cards to board`,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";

    return Response.json({ error: message }, { status: 500 });
  }
}
