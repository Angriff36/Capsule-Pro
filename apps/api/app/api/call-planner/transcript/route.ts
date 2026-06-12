/**
 * AI Call Planner API Endpoints
 *
 * POST   /api/call-planner/transcript     - Process transcript and create draft
 * GET    /api/call-planner/drafts        - List drafts
 * GET    /api/call-planner/drafts/[id]   - Get draft details
 * PATCH  /api/call-planner/drafts/[id]   - Update draft
 * POST   /api/call-planner/proposals      - Generate proposal from draft
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { executeManifestCommand } from "@/lib/manifest-command-handler";
import { extractEventDetails, type ExtractedEventDetails } from "../lib/transcript-extractor";
import { Prisma } from "@repo/database";

/**
 * POST /api/call-planner/transcript
 * Process a transcript and create an event planning draft
 */
export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!orgId || !userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const body = await request.json();

    const { transcript, sourceType = "manual", sessionId } = body as {
      transcript?: string;
      sourceType?: string;
      sessionId?: string;
    };

    if (!transcript || typeof transcript !== "string") {
      return NextResponse.json({ message: "Transcript is required" }, { status: 400 });
    }

    if (sourceType && !["manual", "ringcentral", "upload"].includes(sourceType)) {
      return NextResponse.json({ message: "Invalid source type" }, { status: 400 });
    }

    // Create a new call planning session
    const session = await database.callPlanningSession.create({
      data: {
        tenantId,
        userId,
        status: "active",
        sourceType: sourceType || "manual",
        transcriptText: transcript,
        startedAt: new Date(),
      },
    });

    // Extract event details from transcript
    const extractedDetails = extractEventDetails(transcript);

    // Create event planning draft
    const draft = await database.eventPlanningDraft.create({
      data: {
        tenantId,
        sessionId: session.id,
        userId,
        status: "active",
        clientName: extractedDetails.clientName || null,
        eventType: extractedDetails.eventType || null,
        eventDate: extractedDetails.eventDate || null,
        eventTime: extractedDetails.eventTime || null,
        guestCount: extractedDetails.guestCount || null,
        guestCountMin: extractedDetails.guestCountMin || null,
        guestCountMax: extractedDetails.guestCountMax || null,
        venuePreference: extractedDetails.venuePreference || null,
        serviceStyle: extractedDetails.serviceStyle || null,
        dietaryRestrictions: extractedDetails.dietaryRestrictions || null,
        menuPreferences: (extractedDetails.menuPreferences as unknown as Prisma.InputJsonValue) || Prisma.JsonNull,
        budgetMin: extractedDetails.budgetMin || null,
        budgetMax: extractedDetails.budgetMax || null,
        customItems: (extractedDetails.customItems as unknown as Prisma.InputJsonValue) || Prisma.JsonNull,
        timelineNotes: extractedDetails.timelineNotes || null,
        openQuestions: (extractedDetails.openQuestions as unknown as Prisma.InputJsonValue) || Prisma.JsonNull,
        specialNotes: extractedDetails.specialNotes || null,
        aiSummary: extractedDetails.aiSummary || null,
        overallConfidence: extractedDetails.overallConfidence || null,
      },
    });

    // Store extracted details
    if (extractedDetails.details && extractedDetails.details.length > 0) {
      await database.extractedDetail.createMany({
        data: extractedDetails.details.map((detail) => ({
          tenantId,
          sessionId: session.id,
          draftId: draft.id,
          fieldName: detail.fieldName,
          rawValue: detail.rawValue,
          normalizedValue:
            typeof detail.normalizedValue === "string"
              ? detail.normalizedValue
              : detail.normalizedValue instanceof Date
              ? detail.normalizedValue.toISOString()
              : detail.normalizedValue === null
              ? null
              : String(detail.normalizedValue),
          confidence: detail.confidence || "medium",
          sourceQuote: detail.sourceQuote || null,
          sourceTimestamp: detail.sourceTimestamp || null,
          status: "pending",
          catalogMatchType: detail.catalogMatchType || null,
        })),
      });
    }

    // Mark session as complete
    await database.callPlanningSession.update({
      where: {
        tenantId_id: {
          tenantId,
          id: session.id,
        },
      },
      data: {
        status: "completed",
        endedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      draftId: draft.id,
      extractedDetails: extractedDetails.details,
    });
  } catch (error) {
    captureException(error);
    log.error("Error processing transcript:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
