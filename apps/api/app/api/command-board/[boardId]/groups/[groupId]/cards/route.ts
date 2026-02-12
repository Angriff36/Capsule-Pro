/**
 * Command Board Group Cards API Endpoints
 *
 * POST   /api/command-board/[boardId]/groups/[groupId]/cards  - Add cards to a group
 * DELETE /api/command-board/[boardId]/groups/[groupId]/cards  - Remove cards from a group
 */

import { auth } from "@repo/auth/server";
import { database, type Prisma } from "@repo/database";
import { createOutboxEvent } from "@repo/realtime";
import { NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import type {
  AddCardsToGroupRequest,
  RemoveCardsFromGroupRequest,
} from "../../../../types";
import {
  validateAddCardsToGroupRequest,
  validateRemoveCardsFromGroupRequest,
} from "../../validation";

interface RouteContext {
  params: Promise<{ boardId: string; groupId: string }>;
}

/**
 * Validate board ID and group ID parameters
 */
function validateIds(boardId: string, groupId: string): void {
  if (!boardId || typeof boardId !== "string") {
    throw new InvariantError("Invalid board ID");
  }
  if (!groupId || typeof groupId !== "string") {
    throw new InvariantError("Invalid group ID");
  }
}

/**
 * Verify group exists and belongs to tenant and board
 */
async function verifyGroupAccess(
  tenantId: string,
  boardId: string,
  groupId: string
): Promise<boolean> {
  const group = await database.commandBoardGroup.findFirst({
    where: {
      AND: [{ tenantId }, { boardId }, { id: groupId }, { deletedAt: null }],
    },
  });
  return group !== null;
}

/**
 * POST /api/command-board/[boardId]/groups/[groupId]/cards
 * Add cards to a group
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const { orgId, userId } = await auth();
    if (!(orgId && userId)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { boardId, groupId } = await context.params;
    const body = await request.json();

    validateIds(boardId, groupId);
    validateAddCardsToGroupRequest(body);

    const data = body as AddCardsToGroupRequest;

    const groupExists = await verifyGroupAccess(tenantId, boardId, groupId);
    if (!groupExists) {
      return NextResponse.json({ message: "Group not found" }, { status: 404 });
    }

    // Verify all cards exist and belong to board
    const cards = await database.commandBoardCard.findMany({
      where: {
        AND: [
          { tenantId },
          { boardId },
          { id: { in: data.cardIds } },
          { deletedAt: null },
        ],
      },
      select: {
        id: true,
        groupId: true,
        vectorClock: true,
        version: true,
      },
    });

    if (cards.length !== data.cardIds.length) {
      return NextResponse.json(
        { message: "One or more cards not found" },
        { status: 404 }
      );
    }

    const result = await database.$transaction(async (tx) => {
      // Update each card individually to increment version and update vector clock
      for (const card of cards) {
        const existingVectorClock =
          (card.vectorClock as Record<string, number>) || {};
        const newVectorClock: Record<string, number> = {
          ...existingVectorClock,
          [userId]: (existingVectorClock[userId] || 0) + 1,
        };

        await tx.commandBoardCard.update({
          where: {
            tenantId_id: {
              tenantId,
              id: card.id,
            },
          },
          data: {
            groupId,
            version: { increment: 1 },
            vectorClock: newVectorClock as Prisma.InputJsonValue,
          },
        });
      }

      // Publish outbox event for real-time sync with version information
      await createOutboxEvent(tx, {
        tenantId,
        aggregateType: "CommandBoardGroup",
        aggregateId: groupId,
        eventType: "command.board.group.cards_added",
        payload: {
          boardId,
          groupId,
          cardIds: data.cardIds,
          addedBy: userId,
          addedAt: new Date().toISOString(),
          version: cards[0].version + 1,
        },
      });

      return { count: cards.length };
    });

    return NextResponse.json({
      message: "Cards added to group",
      count: result.count,
    });
  } catch (error: unknown) {
    if (error instanceof InvariantError) {
      const message = (error as InvariantError).message;
      return NextResponse.json({ message }, { status: 400 });
    }
    console.error("Error adding cards to group:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/command-board/[boardId]/groups/[groupId]/cards
 * Remove cards from a group (ungroup them)
 */
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { orgId, userId } = await auth();
    if (!(orgId && userId)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { boardId, groupId } = await context.params;
    const body = await request.json();

    validateIds(boardId, groupId);
    validateRemoveCardsFromGroupRequest(body);

    const data = body as RemoveCardsFromGroupRequest;

    const groupExists = await verifyGroupAccess(tenantId, boardId, groupId);
    if (!groupExists) {
      return NextResponse.json({ message: "Group not found" }, { status: 404 });
    }

    // Verify all cards exist and belong to this group
    const cards = await database.commandBoardCard.findMany({
      where: {
        AND: [
          { tenantId },
          { boardId },
          { groupId },
          { id: { in: data.cardIds } },
          { deletedAt: null },
        ],
      },
      select: {
        id: true,
        vectorClock: true,
        version: true,
      },
    });

    if (cards.length !== data.cardIds.length) {
      return NextResponse.json(
        { message: "One or more cards not found in this group" },
        { status: 404 }
      );
    }

    const result = await database.$transaction(async (tx) => {
      // Update each card individually to increment version and update vector clock
      for (const card of cards) {
        const existingVectorClock =
          (card.vectorClock as Record<string, number>) || {};
        const newVectorClock: Record<string, number> = {
          ...existingVectorClock,
          [userId]: (existingVectorClock[userId] || 0) + 1,
        };

        await tx.commandBoardCard.update({
          where: {
            tenantId_id: {
              tenantId,
              id: card.id,
            },
          },
          data: {
            groupId: null,
            version: { increment: 1 },
            vectorClock: newVectorClock as Prisma.InputJsonValue,
          },
        });
      }

      // Publish outbox event for real-time sync with version information
      await createOutboxEvent(tx, {
        tenantId,
        aggregateType: "CommandBoardGroup",
        aggregateId: groupId,
        eventType: "command.board.group.cards_removed",
        payload: {
          boardId,
          groupId,
          cardIds: data.cardIds,
          removedBy: userId,
          removedAt: new Date().toISOString(),
          version: cards[0].version + 1,
        },
      });

      return { count: cards.length };
    });

    return NextResponse.json({
      message: "Cards removed from group",
      count: result.count,
    });
  } catch (error: unknown) {
    if (error instanceof InvariantError) {
      const message = (error as InvariantError).message;
      return NextResponse.json({ message }, { status: 400 });
    }
    console.error("Error removing cards from group:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
