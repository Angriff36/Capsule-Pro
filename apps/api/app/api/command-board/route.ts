/**
 * Command Board API Endpoints
 *
 * GET    /api/command-board      - List command boards with pagination and filters
 * POST   /api/command-board      - Create a new command board
 */

import { auth } from "@repo/auth/server";
import { database, type Prisma } from "@repo/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { executeManifestCommand } from "@/lib/manifest-command-handler";
import type {
  BoardStatus,
  CommandBoardListFilters,
  CommandBoardWithCardsCount,
} from "./types";
import { BOARD_STATUSES } from "./types";

interface PaginationParams {
  page: number;
  limit: number;
}

/**
 * Parse pagination parameters from URL search params
 */
function parsePaginationParams(
  searchParams: URLSearchParams
): PaginationParams {
  const page = Number.parseInt(searchParams.get("page") || "1", 10);
  const limit = Math.min(
    Math.max(Number.parseInt(searchParams.get("limit") || "20", 10), 1),
    100
  );

  return { page, limit };
}

/**
 * Parse command board list filters from URL search params
 */
function parseCommandBoardFilters(
  searchParams: URLSearchParams
): CommandBoardListFilters {
  const filters: CommandBoardListFilters = {};

  const search = searchParams.get("search");
  if (search) {
    filters.search = search;
  }

  const status = searchParams.get("status");
  if (status && BOARD_STATUSES.includes(status as BoardStatus)) {
    filters.status = status as BoardStatus;
  }

  const eventId = searchParams.get("event_id");
  if (eventId) {
    filters.event_id = eventId;
  }

  const isTemplate = searchParams.get("is_template");
  if (isTemplate) {
    filters.is_template = isTemplate === "true";
  }

  const tags = searchParams.get("tags");
  if (tags) {
    filters.tags = tags.split(",");
  }

  return filters;
}

/**
 * GET /api/command-board - List command boards with pagination and filters
 */
export async function GET(request: Request) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json(
        { message: "Tenant not found" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const { page, limit } = parsePaginationParams(searchParams);
    const filters = parseCommandBoardFilters(searchParams);

    // Build where clause
    const where: Prisma.CommandBoardWhereInput = {
      tenantId,
      deletedAt: null,
    };

    // Search filter (name or description)
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    // Status filter
    if (filters.status) {
      where.status = filters.status;
    }

    // Event filter
    if (filters.event_id) {
      where.eventId = filters.event_id;
    }

    // Template filter
    if (filters.is_template !== undefined) {
      where.isTemplate = filters.is_template;
    }

    // Tags filter (any of the provided tags)
    if (filters.tags && filters.tags.length > 0) {
      where.tags = {
        hasSome: filters.tags,
      };
    }

    // Get total count for pagination
    const total = await database.commandBoard.count({ where });

    // Get boards with pagination and cards count
    const boards = await database.commandBoard.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      include: {
        _count: {
          select: { cards: true },
        },
      },
    });

    // Map to response format
    const mappedBoards: CommandBoardWithCardsCount[] = boards.map((board) => ({
      id: board.id,
      tenant_id: board.tenantId,
      event_id: board.eventId,
      name: board.name,
      description: board.description,
      status: board.status as BoardStatus,
      is_template: board.isTemplate,
      tags: board.tags,
      created_at: board.createdAt,
      updated_at: board.updatedAt,
      deleted_at: board.deletedAt,
      cards_count: board._count.cards,
    }));

    return NextResponse.json({
      data: mappedBoards,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Failed to list command boards:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/command-board - Create a new command board via manifest runtime
 */
export function POST(request: NextRequest) {
  return executeManifestCommand(request, {
    entityName: "CommandBoard",
    commandName: "create",
    transformBody: (body, ctx) => ({
      ...body,
      tenantId: ctx.tenantId,
    }),
  });
}
