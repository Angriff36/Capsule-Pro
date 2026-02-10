/**
 * Command Board Group Details API Endpoints
 *
 * GET    /api/command-board/[boardId]/groups/[groupId]  - Get a single group
 * PUT    /api/command-board/[boardId]/groups/[groupId]  - Update a group
 * DELETE /api/command-board/[boardId]/groups/[groupId]  - Delete a group
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { createOutboxEvent } from "@repo/realtime";
import { type NextRequest, NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import type { UpdateGroupRequest } from "../../../types";
import { validateUpdateGroupRequest } from "../validation";

interface RouteContext {
  params: Promise<{ boardId: string; groupId: string }>;
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
 * GET /api/command-board/[boardId]/groups/[groupId]
 * Get a single group by ID
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { boardId, groupId } = await context.params;

    validateIds(boardId, groupId);

    const group = await database.commandBoardGroup.findFirst({
      where: {
        AND: [{ tenantId }, { boardId }, { id: groupId }, { deletedAt: null }],
      },
      select: GROUP_SELECT,
    });

    if (!group) {
      return NextResponse.json({ message: "Group not found" }, { status: 404 });
    }

    return NextResponse.json({ data: group });
  } catch (error: unknown) {
    if (error instanceof InvariantError) {
      const message = (error as InvariantError).message;
      return NextResponse.json({ message }, { status: 400 });
    }
    console.error("Error getting group:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/command-board/[boardId]/groups/[groupId]
 * Update a command board group
 *
 * Supports partial updates of:
 * - name: Group name
 * - color: Group color (hex code)
 * - collapsed: Whether the group is collapsed
 * - position_x, position_y: Group position on board
 * - width, height: Group dimensions
 * - z_index: Stacking order
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { orgId, userId } = await auth();
    if (!(orgId && userId)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { boardId, groupId } = await context.params;
    const body = await request.json();

    validateIds(boardId, groupId);
    validateUpdateGroupRequest(body);

    const data = body as UpdateGroupRequest;

    // Check if the group exists and belongs to the specified board
    const existingGroup = await database.commandBoardGroup.findFirst({
      where: {
        AND: [{ tenantId }, { boardId }, { id: groupId }, { deletedAt: null }],
      },
      select: {
        id: true,
        name: true,
        positionX: true,
        positionY: true,
      },
    });

    if (!existingGroup) {
      return NextResponse.json({ message: "Group not found" }, { status: 404 });
    }

    // Track if position changed
    const previousPosition = {
      x: existingGroup.positionX,
      y: existingGroup.positionY,
    };

    // Execute update and publish event in transaction
    const group = await database.$transaction(async (tx) => {
      const updatedGroup = await tx.commandBoardGroup.update({
        where: {
          tenantId_id: {
            tenantId,
            id: groupId,
          },
        },
        data: {
          name: data.name,
          color: data.color,
          collapsed: data.collapsed,
          positionX: data.position_x,
          positionY: data.position_y,
          width: data.width,
          height: data.height,
          zIndex: data.z_index,
        },
        select: GROUP_SELECT,
      });

      // Determine if this is a position change or general update
      const positionChanged =
        data.position_x !== undefined ||
        data.position_y !== undefined ||
        updatedGroup.positionX !== previousPosition.x ||
        updatedGroup.positionY !== previousPosition.y;

      // Publish appropriate event
      if (positionChanged) {
        await createOutboxEvent(tx, {
          tenantId,
          aggregateType: "CommandBoardGroup",
          aggregateId: groupId,
          eventType: "command.board.group.moved",
          payload: {
            boardId,
            groupId,
            previousPosition,
            newPosition: {
              x: updatedGroup.positionX,
              y: updatedGroup.positionY,
            },
            movedBy: userId,
            movedAt: updatedGroup.updatedAt.toISOString(),
          },
        });
      } else {
        // For non-position changes, track the actual changes
        const changes: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(data)) {
          changes[key] = value;
        }

        await createOutboxEvent(tx, {
          tenantId,
          aggregateType: "CommandBoardGroup",
          aggregateId: groupId,
          eventType: "command.board.group.updated",
          payload: {
            boardId,
            groupId,
            changes,
            updatedBy: userId,
            updatedAt: updatedGroup.updatedAt.toISOString(),
          },
        });
      }

      return updatedGroup;
    });

    return NextResponse.json({ data: group });
  } catch (error: unknown) {
    if (error instanceof InvariantError) {
      const message = (error as InvariantError).message;
      return NextResponse.json({ message }, { status: 400 });
    }
    console.error("Error updating group:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/command-board/[boardId]/groups/[groupId]
 * Soft delete a command board group
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { orgId, userId } = await auth();
    if (!(orgId && userId)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { boardId, groupId } = await context.params;

    validateIds(boardId, groupId);

    // Check if the group exists and belongs to the specified board
    const existingGroup = await database.commandBoardGroup.findFirst({
      where: {
        AND: [{ tenantId }, { boardId }, { id: groupId }, { deletedAt: null }],
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!existingGroup) {
      return NextResponse.json({ message: "Group not found" }, { status: 404 });
    }

    // Soft delete the group, ungroup its cards, and publish event in transaction
    await database.$transaction(async (tx) => {
      // Remove the group association from all cards in this group
      await tx.commandBoardCard.updateMany({
        where: {
          AND: [{ tenantId }, { groupId }, { deletedAt: null }],
        },
        data: {
          groupId: null,
        },
      });

      // Soft delete the group
      await tx.commandBoardGroup.update({
        where: {
          tenantId_id: {
            tenantId,
            id: groupId,
          },
        },
        data: {
          deletedAt: new Date(),
        },
      });

      // Publish outbox event for real-time sync
      await createOutboxEvent(tx, {
        tenantId,
        aggregateType: "CommandBoardGroup",
        aggregateId: groupId,
        eventType: "command.board.group.deleted",
        payload: {
          boardId,
          groupId,
          deletedBy: userId,
          deletedAt: new Date().toISOString(),
        },
      });
    });

    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    if (error instanceof InvariantError) {
      const message = (error as InvariantError).message;
      return NextResponse.json({ message }, { status: 400 });
    }
    console.error("Error deleting group:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
