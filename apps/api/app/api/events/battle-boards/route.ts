/**
 * @module BattleBoardsAPI
 * @intent List and create battle boards for events
 * @responsibility Manage battle board lifecycle
 * @domain Events
 * @tags events, battle-boards, api
 * @canonical true
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

/**
 * GET /api/events/battle-boards
 * List battle boards with pagination and filters
 */
export async function GET(request: Request) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { searchParams } = new URL(request.url);

    // Parse filters
    const eventId = searchParams.get("eventId");
    const status = searchParams.get("status");
    const page = Number.parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(
      Math.max(Number.parseInt(searchParams.get("limit") || "20", 10), 1),
      100
    );
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause: Record<string, unknown> = {
      tenantId,
      deletedAt: null,
    };

    if (eventId) {
      whereClause.eventId = eventId;
    }

    if (status) {
      whereClause.status = status;
    }

    // Fetch battle boards
    const boards = await database.battleBoard.findMany({
      where: whereClause,
      orderBy: [{ createdAt: "desc" }],
      take: limit,
      skip: offset,
    });

    // Get total count
    const totalCount = await database.battleBoard.count({
      where: whereClause,
    });

    return NextResponse.json({
      data: boards,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Error listing battle boards:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/events/battle-boards
 * Create a new battle board
 */
export async function POST(request: Request) {
  try {
    const { orgId, userId } = await auth();
    if (!(orgId && userId)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const body = await request.json();

    const { eventId, boardData, boardName, autoFillScore } = body;

    // Verify event exists if provided
    let event = null;
    if (eventId) {
      event = await database.event.findFirst({
        where: {
          id: eventId,
          tenantId,
          deletedAt: null,
        },
      });

      if (!event) {
        return NextResponse.json(
          { message: "Event not found" },
          { status: 404 }
        );
      }

      // Check for existing board
      const existingBoard = await database.battleBoard.findFirst({
        where: {
          tenantId,
          eventId,
          deletedAt: null,
        },
      });

      if (existingBoard) {
        return NextResponse.json(
          {
            message: "Battle board already exists for this event",
            existingId: existingBoard.id,
          },
          { status: 409 }
        );
      }
    }

    // Build board name
    const name =
      boardName ||
      (event
        ? `${event.title || event.eventNumber} Battle Board`
        : "New Battle Board");

    // Create battle board
    const board = await database.battleBoard.create({
      data: {
        tenantId,
        eventId: eventId || undefined,
        board_name: name,
        board_type: "event-specific",
        schema_version: "mangia-battle-board@1",
        boardData: boardData || {
          schema: "mangia-battle-board@1",
          version: "1.0.0",
          meta: {
            eventName: event?.title || event?.eventNumber || "",
            eventNumber: event?.eventNumber || "",
            eventDate: event?.eventDate?.toISOString().split("T")[0] || "",
            staffRestrooms: "TBD",
            staffParking: "TBD",
          },
          staff: [],
          layouts: [{ type: "Main Hall", instructions: "" }],
          timeline: [],
          attachments: [],
        },
        status: "draft",
      },
    });

    return NextResponse.json({ data: board }, { status: 201 });
  } catch (error) {
    console.error("Error creating battle board:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
