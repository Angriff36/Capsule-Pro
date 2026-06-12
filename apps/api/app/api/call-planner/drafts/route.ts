/**
 * AI Call Planner Drafts API Endpoints
 *
 * GET    /api/call-planner/drafts        - List drafts
 * GET    /api/call-planner/drafts/[id]   - Get draft details
 * PATCH  /api/call-planner/drafts/[id]   - Update draft
 * POST   /api/call-planner/drafts/[id]/generate-proposal - Generate proposal from draft
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

type Params = Promise<{ id?: string }>;

/**
 * GET /api/call-planner/drafts
 * List event planning drafts with pagination and filters
 */
export async function GET(request: NextRequest) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = (page - 1) * limit;

    const whereClause: Record<string, unknown> = {
      AND: [{ tenantId }, { deletedAt: null }],
    };

    if (status) {
      whereClause.AND = [
        ...(whereClause.AND as Record<string, unknown>[]),
        { status },
      ];
    }

    const drafts = await database.eventPlanningDraft.findMany({
      where: whereClause,
      orderBy: [{ createdAt: "desc" }],
      take: limit,
      skip: offset,
      select: {
        id: true,
        tenantId: true,
        sessionId: true,
        userId: true,
        status: true,
        clientName: true,
        eventType: true,
        eventDate: true,
        eventTime: true,
        guestCount: true,
        guestCountMin: true,
        guestCountMax: true,
        venuePreference: true,
        venueId: true,
        serviceStyle: true,
        dietaryRestrictions: true,
        budgetMin: true,
        budgetMax: true,
        overallConfidence: true,
        proposalId: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
        session: {
          select: {
            id: true,
            status: true,
            startedAt: true,
            endedAt: true,
          },
        },
      },
    });

    const totalCount = await database.eventPlanningDraft.count({
      where: whereClause,
    });

    return NextResponse.json({
      drafts,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    captureException(error);
    log.error("Error listing drafts:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
