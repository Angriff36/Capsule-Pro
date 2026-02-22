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
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { executeManifestCommand } from "@/lib/manifest-command-handler";

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
export async function POST(request: NextRequest) {
  console.log("[BattleBoard/POST] Delegating to manifest create command");
  return await executeManifestCommand(request, {
    entityName: "BattleBoard",
    commandName: "create",
  });
}
