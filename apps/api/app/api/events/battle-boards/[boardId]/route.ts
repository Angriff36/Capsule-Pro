/**
 * @module BattleBoardAPI
 * @intent Get, update, and delete individual battle boards
 * @responsibility Single battle board operations
 * @domain Events
 * @tags events, battle-boards, api
 * @canonical true
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

interface RouteContext {
  params: Promise<{ boardId: string }>;
}

/**
 * GET /api/events/battle-boards/[boardId]
 * Get a single battle board
 */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { boardId } = await context.params;

    const board = await database.battleBoard.findFirst({
      where: {
        id: boardId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!board) {
      return NextResponse.json(
        { message: "Battle board not found" },
        { status: 404 }
      );
    }

    // Fetch event data separately if there's an eventId
    let event: {
      id: string;
      eventNumber: string | null;
      title: string;
      eventDate: Date;
      venueName: string | null;
      venueAddress: string | null;
      guestCount: number;
    } | null = null;
    if (board.eventId) {
      event = await database.event.findFirst({
        where: {
          id: board.eventId,
          tenantId,
          deletedAt: null,
        },
        select: {
          id: true,
          eventNumber: true,
          title: true,
          eventDate: true,
          venueName: true,
          venueAddress: true,
          guestCount: true,
        },
      });
    }

    return NextResponse.json({ data: { ...board, event } });
  } catch (error) {
    console.error("Error fetching battle board:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/events/battle-boards/[boardId]
 * Update a battle board
 */
export async function PUT(request: Request, context: RouteContext) {
  try {
    const { orgId, userId } = await auth();
    if (!(orgId && userId)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { boardId } = await context.params;
    const body = await request.json();

    // Verify board exists
    const existing = await database.battleBoard.findFirst({
      where: {
        id: boardId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { message: "Battle board not found" },
        { status: 404 }
      );
    }

    const { boardData, boardName, status, notes } = body;

    // Prepare update data
    const updateData: Record<string, unknown> = {};

    if (boardData !== undefined) {
      // Update lastUpdatedISO in meta
      if (boardData.meta) {
        boardData.meta.lastUpdatedISO = new Date().toISOString();
      }
      updateData.boardData = boardData;
    }

    if (boardName !== undefined) {
      updateData.board_name = boardName;
    }

    if (status !== undefined) {
      updateData.status = status;
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    // Update board
    const board = await database.battleBoard.update({
      where: {
        tenantId_id: {
          tenantId,
          id: boardId,
        },
      },
      data: updateData,
    });

    return NextResponse.json({ data: board });
  } catch (error) {
    console.error("Error updating battle board:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/events/battle-boards/[boardId]
 * Soft delete a battle board
 */
export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { boardId } = await context.params;

    // Verify board exists
    const existing = await database.battleBoard.findFirst({
      where: {
        id: boardId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { message: "Battle board not found" },
        { status: 404 }
      );
    }

    // Soft delete
    await database.battleBoard.update({
      where: {
        tenantId_id: {
          tenantId,
          id: boardId,
        },
      },
      data: {
        deletedAt: new Date(),
      },
    });

    return NextResponse.json({ message: "Battle board deleted" });
  } catch (error) {
    console.error("Error deleting battle board:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
