/**
 * Command Board API Endpoints
 *
 * GET    /api/command-board      - List command boards with pagination and filters
 * POST   /api/command-board      - Create a new command board
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const invariant_1 = require("@/app/lib/invariant");
const tenant_1 = require("@/app/lib/tenant");
const types_1 = require("./types");
const validation_1 = require("./validation");
/**
 * Parse pagination parameters from URL search params
 */
function parsePaginationParams(searchParams) {
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
function parseCommandBoardFilters(searchParams) {
  const filters = {};
  const search = searchParams.get("search");
  if (search) {
    filters.search = search;
  }
  const status = searchParams.get("status");
  if (status && types_1.BOARD_STATUSES.includes(status)) {
    filters.status = status;
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
async function GET(request) {
  try {
    const { orgId } = await (0, server_1.auth)();
    if (!orgId) {
      return server_2.NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
    if (!tenantId) {
      return server_2.NextResponse.json(
        { message: "Tenant not found" },
        { status: 404 }
      );
    }
    const { searchParams } = new URL(request.url);
    const { page, limit } = parsePaginationParams(searchParams);
    const filters = parseCommandBoardFilters(searchParams);
    // Build where clause
    const where = {
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
    const total = await database_1.database.commandBoard.count({ where });
    // Get boards with pagination and cards count
    const boards = await database_1.database.commandBoard.findMany({
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
    const mappedBoards = boards.map((board) => ({
      id: board.id,
      tenant_id: board.tenantId,
      event_id: board.eventId,
      name: board.name,
      description: board.description,
      status: board.status,
      is_template: board.isTemplate,
      tags: board.tags,
      created_at: board.createdAt,
      updated_at: board.updatedAt,
      deleted_at: board.deletedAt,
      cards_count: board._count.cards,
    }));
    return server_2.NextResponse.json({
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
    return server_2.NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
/**
 * POST /api/command-board - Create a new command board
 */
async function POST(request) {
  try {
    const { orgId } = await (0, server_1.auth)();
    if (!orgId) {
      return server_2.NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
    if (!tenantId) {
      return server_2.NextResponse.json(
        { message: "Tenant not found" },
        { status: 404 }
      );
    }
    const body = await request.json();
    (0, validation_1.validateCreateCommandBoardRequest)(body);
    // Create command board
    const board = await database_1.database.commandBoard.create({
      data: {
        tenantId,
        name: body.name,
        description: body.description ?? null,
        eventId: body.event_id ?? null,
        status: body.status ?? "draft",
        isTemplate: body.is_template ?? false,
        tags: body.tags ?? [],
      },
    });
    const responseBoard = {
      id: board.id,
      tenant_id: board.tenantId,
      event_id: board.eventId,
      name: board.name,
      description: board.description,
      status: board.status,
      is_template: board.isTemplate,
      tags: board.tags,
      created_at: board.createdAt,
      updated_at: board.updatedAt,
      deleted_at: board.deletedAt,
      cards_count: 0,
    };
    return server_2.NextResponse.json(responseBoard, { status: 201 });
  } catch (error) {
    if (error instanceof invariant_1.InvariantError) {
      return server_2.NextResponse.json(
        { message: error.message },
        { status: 400 }
      );
    }
    console.error("Failed to create command board:", error);
    return server_2.NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
