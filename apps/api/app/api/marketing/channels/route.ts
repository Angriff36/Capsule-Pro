/**
 * @module MarketingChannelsAPI
 * @intent Manage marketing channels (email, SMS, social media, etc.)
 * @responsibility CRUD operations for marketing channels
 * @domain Marketing
 * @tags marketing, channels, api
 * @canonical true
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";

interface ChannelListFilters {
  channelType?: string;
  isActive?: boolean;
  search?: string;
}

interface PaginationParams {
  page: number;
  limit: number;
}

interface CreateChannelRequest {
  name: string;
  channelType: string;
  provider?: string;
  configuration?: unknown;
}

interface UpdateChannelRequest {
  name?: string;
  channelType?: string;
  provider?: string;
  configuration?: unknown;
  isActive?: boolean;
}

function parseChannelFilters(searchParams: URLSearchParams): ChannelListFilters {
  const filters: ChannelListFilters = {};

  const channelType = searchParams.get("channelType");
  if (channelType) {
    filters.channelType = channelType;
  }

  const isActive = searchParams.get("isActive");
  if (isActive !== null) {
    filters.isActive = isActive === "true";
  }

  const search = searchParams.get("search");
  if (search) {
    filters.search = search;
  }

  return filters;
}

function parsePaginationParams(searchParams: URLSearchParams): PaginationParams {
  const page = Number.parseInt(searchParams.get("page") || "1", 10);
  const limit = Math.min(
    Math.max(Number.parseInt(searchParams.get("limit") || "20", 10), 1),
    100
  );

  return { page, limit };
}

function validateCreateChannelRequest(
  body: unknown
): asserts body is CreateChannelRequest {
  InvariantError(body && typeof body === "object", "Request body must be valid");
  const b = body as Record<string, unknown>;
  InvariantError(typeof b.name === "string" && b.name.trim().length > 0, "Channel name is required");
  InvariantError(typeof b.channelType === "string" && b.channelType.trim().length > 0, "Channel type is required");
}

function validateUpdateChannelRequest(
  body: unknown
): asserts body is UpdateChannelRequest {
  InvariantError(body && typeof body === "object", "Request body must be valid");
}

/**
 * GET /api/marketing/channels
 * List channels with pagination and filters
 */
export async function GET(request: Request) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { searchParams } = new URL(request.url);

    const filters = parseChannelFilters(searchParams);
    const { page, limit } = parsePaginationParams(searchParams);
    const offset = (page - 1) * limit;

    const whereClause: Record<string, unknown> = {
      AND: [{ tenantId }, { deletedAt: null }],
    };

    if (filters.channelType) {
      (whereClause.AND as Record<string, unknown>[]).push({ channelType: filters.channelType });
    }

    if (filters.isActive !== undefined) {
      (whereClause.AND as Record<string, unknown>[]).push({ isActive: filters.isActive });
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      (whereClause.AND as Record<string, unknown>[]).push({
        OR: [
          { name: { contains: searchLower, mode: "insensitive" } },
          { provider: { contains: searchLower, mode: "insensitive" } },
        ],
      });
    }

    const [channels, total] = await Promise.all([
      database.channel.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      database.channel.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      channels,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error listing channels:", error);
    return NextResponse.json(
      { message: "Failed to list channels", error: String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/marketing/channels
 * Create a new marketing channel
 */
export async function POST(request: Request) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const body = await request.json();
    validateCreateChannelRequest(body);

    const channel = await database.channel.create({
      data: {
        ...body,
        tenantId,
      },
    });

    return NextResponse.json(channel, { status: 201 });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Error creating channel:", error);
    return NextResponse.json(
      { message: "Failed to create channel", error: String(error) },
      { status: 500 }
    );
  }
}
