/**
 * AI Call Planner Draft Detail API Endpoints
 *
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
import { nanoid } from "nanoid";

type Params = Promise<{ id: string }>;

/**
 * GET /api/call-planner/drafts/[id]
 * Get draft details including extracted details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const tenantId = await getTenantIdForOrg(orgId);

    const draft = await database.eventPlanningDraft.findFirst({
      where: {
        tenantId,
        id,
        deletedAt: null,
      },
      include: {
        session: {
          select: {
            id: true,
            status: true,
            startedAt: true,
            endedAt: true,
            transcriptText: true,
          },
        },
        extractedDetails: {
          select: {
            id: true,
            fieldName: true,
            rawValue: true,
            normalizedValue: true,
            confidence: true,
            sourceQuote: true,
            status: true,
            catalogMatchType: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!draft) {
      return NextResponse.json({ message: "Draft not found" }, { status: 404 });
    }

    return NextResponse.json({ draft });
  } catch (error) {
    captureException(error);
    log.error("Error getting draft:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/call-planner/drafts/[id]
 * Update draft fields
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { orgId, userId } = await auth();
    if (!orgId || !userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const tenantId = await getTenantIdForOrg(orgId);

    // Check if draft exists and belongs to tenant
    const existingDraft = await database.eventPlanningDraft.findFirst({
      where: {
        tenantId,
        id,
        deletedAt: null,
      },
    });

    if (!existingDraft) {
      return NextResponse.json({ message: "Draft not found" }, { status: 404 });
    }

    const body = await request.json();

    // Build update data with only provided fields
    const updateData: Record<string, unknown> = {};

    if (body.clientName !== undefined) updateData.clientName = body.clientName;
    if (body.eventType !== undefined) updateData.eventType = body.eventType;
    if (body.eventDate !== undefined) {
      updateData.eventDate = body.eventDate ? new Date(body.eventDate) : null;
    }
    if (body.eventTime !== undefined) updateData.eventTime = body.eventTime;
    if (body.guestCount !== undefined) updateData.guestCount = body.guestCount;
    if (body.guestCountMin !== undefined) updateData.guestCountMin = body.guestCountMin;
    if (body.guestCountMax !== undefined) updateData.guestCountMax = body.guestCountMax;
    if (body.venuePreference !== undefined) updateData.venuePreference = body.venuePreference;
    if (body.venueId !== undefined) updateData.venueId = body.venueId;
    if (body.serviceStyle !== undefined) updateData.serviceStyle = body.serviceStyle;
    if (body.dietaryRestrictions !== undefined) updateData.dietaryRestrictions = body.dietaryRestrictions;
    if (body.menuPreferences !== undefined) updateData.menuPreferences = body.menuPreferences;
    if (body.budgetMin !== undefined) updateData.budgetMin = body.budgetMin;
    if (body.budgetMax !== undefined) updateData.budgetMax = body.budgetMax;
    if (body.customItems !== undefined) updateData.customItems = body.customItems;
    if (body.timelineNotes !== undefined) updateData.timelineNotes = body.timelineNotes;
    if (body.openQuestions !== undefined) updateData.openQuestions = body.openQuestions;
    if (body.specialNotes !== undefined) updateData.specialNotes = body.specialNotes;
    if (body.aiSummary !== undefined) updateData.aiSummary = body.aiSummary;
    if (body.overallConfidence !== undefined) updateData.overallConfidence = body.overallConfidence;

    updateData.updatedAt = new Date();

    // Status transitions require explicit action
    if (body.status && ["active", "review", "converted", "expired"].includes(body.status)) {
      updateData.status = body.status;
    }

    const updatedDraft = await database.eventPlanningDraft.update({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
      data: updateData,
    });

    return NextResponse.json({ draft: updatedDraft });
  } catch (error) {
    captureException(error);
    log.error("Error updating draft:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
