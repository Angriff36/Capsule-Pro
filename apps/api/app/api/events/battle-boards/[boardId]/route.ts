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
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { executeManifestCommand } from "@/lib/manifest-command-handler";

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
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ boardId: string }> }
) {
  const { boardId } = await context.params;
  console.log("[BattleBoard/PUT] Delegating to manifest open command", {
    boardId,
  });
  return executeManifestCommand(request, {
    entityName: "BattleBoard",
    commandName: "open",
    params: { boardId },
    transformBody: (body) => ({ ...body, id: boardId }),
  });
}

/**
 * DELETE /api/events/battle-boards/[boardId]
 * Soft delete a battle board
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ boardId: string }> }
) {
  const { boardId } = await context.params;
  console.log("[BattleBoard/DELETE] Delegating to manifest finalize command", {
    boardId,
  });
  return executeManifestCommand(request, {
    entityName: "BattleBoard",
    commandName: "finalize",
    params: { boardId },
    transformBody: (_body) => ({ id: boardId }),
  });
}
