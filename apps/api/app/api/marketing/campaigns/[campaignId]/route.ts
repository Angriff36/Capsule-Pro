/**
 * @module MarketingCampaignDetailAPI
 * @intent Manage individual marketing campaign operations
 * @responsibility GET, PUT, DELETE for specific campaign
 * @domain Marketing
 * @tags marketing, campaigns, api
 * @canonical true
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";

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

interface LaunchCampaignRequest {
  scheduledAt?: string;
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
 * Validate launch campaign request
 */
function validateLaunchCampaignRequest(
  body: unknown
): asserts body is LaunchCampaignRequest {
  InvariantError(body && typeof body === "object", "Request body must be valid");
}

/**
 * GET /api/marketing/campaigns/[campaignId]
 * Get a single campaign by ID
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { campaignId } = await params;

    const campaign = await database.campaign.findFirst({
      where: {
        id: campaignId,
        tenantId,
        deletedAt: null,
      },
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
        campaignMessages: {
          orderBy: { createdAt: "desc" },
        },
        campaignMetrics: {
          orderBy: { recordedAt: "desc" },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ message: "Campaign not found" }, { status: 404 });
    }

    return NextResponse.json(campaign);
  } catch (error) {
    console.error("Error fetching campaign:", error);
    return NextResponse.json(
      { message: "Failed to fetch campaign", error: String(error) },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/marketing/campaigns/[campaignId]
 * Update a campaign
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { campaignId } = await params;
    const body = await request.json();
    validateUpdateCampaignRequest(body);

    const existing = await database.campaign.findFirst({
      where: { id: campaignId, tenantId, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json({ message: "Campaign not found" }, { status: 404 });
    }

    const { channelIds, contactListIds, ...campaignData } = body;

    const campaign = await database.campaign.update({
      where: { id: campaignId },
      data: {
        ...campaignData,
        startDate: campaignData.startDate ? new Date(campaignData.startDate) : undefined,
        endDate: campaignData.endDate ? new Date(campaignData.endDate) : undefined,
      },
    });

    // Update channels if provided
    if (channelIds !== undefined) {
      await database.campaignChannel.deleteMany({
        where: { campaignId },
      });

      if (channelIds.length > 0) {
        await database.campaignChannel.createMany({
          data: channelIds.map((channelId: string) => ({
            tenantId,
            campaignId,
            channelId,
          })),
        });
      }
    }

    // Update contact lists if provided
    if (contactListIds !== undefined) {
      await database.campaignContactList.deleteMany({
        where: { campaignId },
      });

      if (contactListIds.length > 0) {
        await database.campaignContactList.createMany({
          data: contactListIds.map((contactListId: string) => ({
            tenantId,
            campaignId,
            contactListId,
          })),
        });
      }
    }

    return NextResponse.json(campaign);
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Error updating campaign:", error);
    return NextResponse.json(
      { message: "Failed to update campaign", error: String(error) },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/marketing/campaigns/[campaignId]
 * Soft delete a campaign
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { campaignId } = await params;

    const existing = await database.campaign.findFirst({
      where: { id: campaignId, tenantId, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json({ message: "Campaign not found" }, { status: 404 });
    }

    await database.campaign.update({
      where: { id: campaignId },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ message: "Campaign deleted" });
  } catch (error) {
    console.error("Error deleting campaign:", error);
    return NextResponse.json(
      { message: "Failed to delete campaign", error: String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/marketing/campaigns/[campaignId]/launch
 * Launch a campaign
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { campaignId } = await params;
    const body = await request.json();

    const existing = await database.campaign.findFirst({
      where: { id: campaignId, tenantId, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json({ message: "Campaign not found" }, { status: 404 });
    }

    const { action } = body;
    let newStatus: string;

    switch (action) {
      case "launch":
        newStatus = "active";
        break;
      case "pause":
        newStatus = "paused";
        break;
      case "complete":
        newStatus = "completed";
        break;
      default:
        return NextResponse.json({ message: "Invalid action" }, { status: 400 });
    }

    const campaign = await database.campaign.update({
      where: { id: campaignId },
      data: { status: newStatus },
    });

    return NextResponse.json(campaign);
  } catch (error) {
    console.error("Error updating campaign status:", error);
    return NextResponse.json(
      { message: "Failed to update campaign status", error: String(error) },
      { status: 500 }
    );
  }
}
