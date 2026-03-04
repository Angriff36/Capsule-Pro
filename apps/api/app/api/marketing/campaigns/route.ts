/**
 * @module MarketingCampaignsAPI
 * @intent Manage marketing campaigns with multi-channel support
 * @responsibility CRUD operations for marketing campaigns
 * @domain Marketing
 * @tags marketing, campaigns, api
 * @canonical true
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import type { Campaign, Channel } from "@repo/database";

interface CampaignListFilters {
  status?: string;
  campaignType?: string;
  search?: string;
  tags?: string[];
}

interface PaginationParams {
  page: number;
  limit: number;
}

interface CreateCampaignRequest {
  name: string;
  description?: string;
  campaignType?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  targetAudience?: unknown;
  tags?: string[];
  channelIds?: string[];
  contactListIds?: string[];
}

interface UpdateCampaignRequest {
  name?: string;
  description?: string;
  campaignType?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  targetAudience?: unknown;
  tags?: string[];
  status?: string;
}

/**
 * Parse and validate campaign list filters from URL search params
 */
function parseCampaignFilters(searchParams: URLSearchParams): CampaignListFilters {
  const filters: CampaignListFilters = {};

  const status = searchParams.get("status");
  if (status) {
    filters.status = status;
  }

  const campaignType = searchParams.get("campaignType");
  if (campaignType) {
    filters.campaignType = campaignType;
  }

  const search = searchParams.get("search");
  if (search) {
    filters.search = search;
  }

  const tags = searchParams.get("tags");
  if (tags) {
    try {
      filters.tags = JSON.parse(tags);
    } catch {
      filters.tags = tags.split(",");
    }
  }

  return filters;
}

/**
 * Parse pagination parameters from URL search params
 */
function parsePaginationParams(searchParams: URLSearchParams): PaginationParams {
  const page = Number.parseInt(searchParams.get("page") || "1", 10);
  const limit = Math.min(
    Math.max(Number.parseInt(searchParams.get("limit") || "20", 10), 1),
    100
  );

  return { page, limit };
}

/**
 * Validate create campaign request
 */
function validateCreateCampaignRequest(
  body: unknown
): asserts body is CreateCampaignRequest {
  InvariantError(body && typeof body === "object", "Request body must be valid");
  const b = body as Record<string, unknown>;
  InvariantError(typeof b.name === "string" && b.name.trim().length > 0, "Campaign name is required");
}

/**
 * Validate update campaign request
 */
function validateUpdateCampaignRequest(
  body: unknown
): asserts body is UpdateCampaignRequest {
  InvariantError(body && typeof body === "object", "Request body must be valid");
}

/**
 * GET /api/marketing/campaigns
 * List campaigns with pagination and filters
 */
export async function GET(request: Request) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { searchParams } = new URL(request.url);

    const filters = parseCampaignFilters(searchParams);
    const { page, limit } = parsePaginationParams(searchParams);
    const offset = (page - 1) * limit;

    const whereClause: Record<string, unknown> = {
      AND: [{ tenantId }, { deletedAt: null }],
    };

    if (filters.status) {
      (whereClause.AND as Record<string, unknown>[]).push({ status: filters.status });
    }

    if (filters.campaignType) {
      (whereClause.AND as Record<string, unknown>[]).push({ campaignType: filters.campaignType });
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      (whereClause.AND as Record<string, unknown>[]).push({
        OR: [
          { name: { contains: searchLower, mode: "insensitive" } },
          { description: { contains: searchLower, mode: "insensitive" } },
        ],
      });
    }

    if (filters.tags && filters.tags.length > 0) {
      (whereClause.AND as Record<string, unknown>[]).push({
        tags: { hasSome: filters.tags },
      });
    }

    const [campaigns, total] = await Promise.all([
      database.campaign.findMany({
        where: whereClause,
        include: {
          campaignChannels: {
            include: {
              channel: true,
            },
          },
          campaignContactLists: {
            include: {
              contactList: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      database.campaign.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      campaigns,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error listing campaigns:", error);
    return NextResponse.json(
      { message: "Failed to list campaigns", error: String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/marketing/campaigns
 * Create a new marketing campaign
 */
export async function POST(request: Request) {
  try {
    const { orgId, userId } = await auth();
    if (!orgId || !userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const body = await request.json();
    validateCreateCampaignRequest(body);

    const { channelIds, contactListIds, ...campaignData } = body;

    const campaign = await database.campaign.create({
      data: {
        ...campaignData,
        tenantId,
        startDate: campaignData.startDate ? new Date(campaignData.startDate) : null,
        endDate: campaignData.endDate ? new Date(campaignData.endDate) : null,
      },
    });

    // Connect channels if provided
    if (channelIds && channelIds.length > 0) {
      await database.campaignChannel.createMany({
        data: channelIds.map((channelId: string) => ({
          tenantId,
          campaignId: campaign.id,
          channelId,
        })),
      });
    }

    // Connect contact lists if provided
    if (contactListIds && contactListIds.length > 0) {
      await database.campaignContactList.createMany({
        data: contactListIds.map((contactListId: string) => ({
          tenantId,
          campaignId: campaign.id,
          contactListId,
        })),
      });
    }

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Error creating campaign:", error);
    return NextResponse.json(
      { message: "Failed to create campaign", error: String(error) },
      { status: 500 }
    );
  }
}
