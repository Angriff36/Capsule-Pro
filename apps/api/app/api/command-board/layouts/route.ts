/**
 * Command Board Layouts API Endpoints
 *
 * GET    /api/command-board/layouts      - List user's layouts
 * POST   /api/command-board/layouts      - Create a new layout
 */

import { auth } from "@repo/auth/server";
import { database, type Prisma } from "@repo/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { executeManifestCommand } from "@/lib/manifest-command-handler";
import { validateBoardId } from "./validation";

const LAYOUT_SELECT = {
  id: true,
  tenantId: true,
  boardId: true,
  userId: true,
  name: true,
  viewport: true,
  visibleCards: true,
  gridSize: true,
  showGrid: true,
  snapToGrid: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * GET /api/command-board/layouts
 * List layouts for the authenticated user, optionally filtered by board
 */
export async function GET(request: Request) {
  try {
    const { orgId, userId } = await auth();
    if (!(orgId && userId)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { searchParams } = new URL(request.url);

    const boardId = searchParams.get("boardId");

    // Build where clause
    const whereClause: Prisma.CommandBoardLayoutWhereInput = {
      AND: [{ tenantId }, { userId }, { deletedAt: null }],
    };

    if (boardId) {
      validateBoardId(boardId);
      (whereClause.AND as Prisma.CommandBoardLayoutWhereInput[]).push({
        boardId,
      });
    }

    const layouts = await database.commandBoardLayout.findMany({
      where: whereClause,
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      select: LAYOUT_SELECT,
    });

    return NextResponse.json({ data: layouts });
  } catch (error: unknown) {
    if (error instanceof InvariantError) {
      const message = (error as InvariantError).message;
      return NextResponse.json({ message }, { status: 400 });
    }
    console.error("Error listing layouts:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/command-board/layouts
 * Create a new layout via manifest runtime
 */
export function POST(request: NextRequest) {
  return executeManifestCommand(request, {
    entityName: "CommandBoardLayout",
    commandName: "create",
    transformBody: (body, ctx) => ({
      ...body,
      tenantId: ctx.tenantId,
      userId: ctx.userId,
    }),
  });
}
