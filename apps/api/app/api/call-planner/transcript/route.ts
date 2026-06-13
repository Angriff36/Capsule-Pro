/**
 * AI Call Planner API Endpoints
 *
 * POST   /api/call-planner/transcript     - Process transcript and create draft
 *
 * Governed writes (CallPlanningSession, EventPlanningDraft) execute via
 * Manifest runtime commands. ExtractedDetail rows are a documented bypass
 * (child rows of the extraction pipeline — see manifest/governance/bypasses.json).
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { resolveCurrentUser } from "@/app/lib/tenant";
import { runCommand } from "@/lib/manifest/execute-command";
import { extractEventDetails } from "../lib/transcript-extractor";

export const runtime = "nodejs";

/** Parse the domain result out of a runCommand success envelope. */
async function readCommandResult(
  response: Response
): Promise<Record<string, unknown>> {
  const payload = (await response.json()) as {
    result?: Record<string, unknown>;
  };
  return payload.result ?? {};
}

/**
 * POST /api/call-planner/transcript
 * Process a transcript and create an event planning draft
 */
export async function POST(request: NextRequest) {
  try {
    const { orgId, userId: clerkUserId } = await auth();
    if (!orgId || !clerkUserId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const user = await resolveCurrentUser(request);
    const body = await request.json();

    const { transcript, sourceType = "manual" } = body as {
      transcript?: string;
      sourceType?: string;
    };

    if (!transcript || typeof transcript !== "string") {
      return NextResponse.json(
        { message: "Transcript is required" },
        { status: 400 }
      );
    }

    if (sourceType && !["manual", "ringcentral", "upload"].includes(sourceType)) {
      return NextResponse.json(
        { message: "Invalid source type" },
        { status: 400 }
      );
    }

    // Governed write: create the call planning session via Manifest runtime
    const sessionResponse = await runCommand({
      entity: "CallPlanningSession",
      command: "create",
      body: {
        userId: user.id,
        sourceType: sourceType || "manual",
        transcriptText: transcript,
      },
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
    });
    if (!sessionResponse.ok) {
      return sessionResponse;
    }
    const session = await readCommandResult(sessionResponse);
    const sessionId = typeof session.id === "string" ? session.id : "";
    if (!sessionId) {
      return NextResponse.json(
        { message: "Session creation returned no id" },
        { status: 500 }
      );
    }

    // Extract event details from transcript (pure heuristics, no DB writes)
    const extractedDetails = extractEventDetails(transcript);

    // Governed write: create the event planning draft via Manifest runtime.
    // The create body is the authoritative instance seed, so extracted fields
    // are passed alongside the declared (sessionId, userId) params.
    const draftBody: Record<string, unknown> = {
      sessionId,
      userId: user.id,
    };
    if (extractedDetails.clientName) {
      draftBody.clientName = extractedDetails.clientName;
    }
    if (extractedDetails.eventType) {
      draftBody.eventType = extractedDetails.eventType;
    }
    if (extractedDetails.eventDate) {
      // Datetime command params are epoch-ms numbers
      draftBody.eventDate = extractedDetails.eventDate.getTime();
    }
    if (extractedDetails.eventTime) {
      draftBody.eventTime = extractedDetails.eventTime;
    }
    if (extractedDetails.guestCount !== undefined) {
      draftBody.guestCount = extractedDetails.guestCount;
    }
    if (extractedDetails.guestCountMin !== undefined) {
      draftBody.guestCountMin = extractedDetails.guestCountMin;
    }
    if (extractedDetails.guestCountMax !== undefined) {
      draftBody.guestCountMax = extractedDetails.guestCountMax;
    }
    if (extractedDetails.venuePreference) {
      draftBody.venuePreference = extractedDetails.venuePreference;
    }
    if (extractedDetails.serviceStyle) {
      draftBody.serviceStyle = extractedDetails.serviceStyle;
    }
    if (extractedDetails.dietaryRestrictions) {
      draftBody.dietaryRestrictions = extractedDetails.dietaryRestrictions;
    }
    if (extractedDetails.budgetMin !== undefined) {
      draftBody.budgetMin = extractedDetails.budgetMin;
    }
    if (extractedDetails.budgetMax !== undefined) {
      draftBody.budgetMax = extractedDetails.budgetMax;
    }
    if (extractedDetails.timelineNotes) {
      draftBody.timelineNotes = extractedDetails.timelineNotes;
    }
    if (extractedDetails.openQuestions?.length) {
      draftBody.openQuestions = extractedDetails.openQuestions;
    }
    if (extractedDetails.specialNotes) {
      draftBody.specialNotes = extractedDetails.specialNotes;
    }
    if (extractedDetails.aiSummary) {
      draftBody.aiSummary = extractedDetails.aiSummary;
    }
    if (extractedDetails.overallConfidence !== undefined) {
      draftBody.overallConfidence = extractedDetails.overallConfidence;
    }

    const draftResponse = await runCommand({
      entity: "EventPlanningDraft",
      command: "create",
      body: draftBody,
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
    });
    if (!draftResponse.ok) {
      // Best-effort: abandon the dangling session so it doesn't stay active
      await runCommand({
        entity: "CallPlanningSession",
        command: "abandon",
        body: { id: sessionId },
        user: { id: user.id, tenantId: user.tenantId, role: user.role },
      });
      return draftResponse;
    }
    const draft = await readCommandResult(draftResponse);
    const draftId = typeof draft.id === "string" ? draft.id : "";
    if (!draftId) {
      return NextResponse.json(
        { message: "Draft creation returned no id" },
        { status: 500 }
      );
    }

    // Documented bypass: ExtractedDetail has no manifest entity (yet). These
    // child rows are written only inside this parent flow, tenant-scoped.
    // See manifest/governance/bypasses.json (entity: ExtractedDetail).
    if (extractedDetails.details && extractedDetails.details.length > 0) {
      await database.extractedDetail.createMany({
        data: extractedDetails.details.map((detail) => ({
          tenantId: user.tenantId,
          sessionId,
          draftId,
          fieldName: detail.fieldName,
          rawValue: detail.rawValue,
          normalizedValue:
            typeof detail.normalizedValue === "string"
              ? detail.normalizedValue
              : detail.normalizedValue instanceof Date
                ? detail.normalizedValue.toISOString()
                : detail.normalizedValue === null ||
                    detail.normalizedValue === undefined
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

    // Governed write: mark session as complete via Manifest runtime.
    // Non-fatal — the draft already exists; surface the failure in logs.
    const completeResponse = await runCommand({
      entity: "CallPlanningSession",
      command: "complete",
      body: { id: sessionId },
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
    });
    if (!completeResponse.ok) {
      log.error(
        "CallPlanningSession.complete failed after transcript processing:",
        await completeResponse.text()
      );
    }

    return NextResponse.json({
      success: true,
      sessionId,
      draftId,
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
