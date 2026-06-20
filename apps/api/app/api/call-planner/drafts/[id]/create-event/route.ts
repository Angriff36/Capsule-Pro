/**
 * POST /api/call-planner/drafts/[id]/create-event
 * Creates an Event from draft fields, marks review, and converts the draft.
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { resolveCurrentUser } from "@/app/lib/tenant";
import { runCommand } from "@/lib/manifest/execute-command";

export const runtime = "nodejs";

type Params = Promise<{ id: string }>;

export async function POST(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id: draftId } = await params;
    const user = await resolveCurrentUser(request);
    const tenantId = user.tenantId;

    const draft = await database.eventPlanningDraft.findFirst({
      where: { tenantId, id: draftId, deletedAt: null },
    });

    if (!draft) {
      return NextResponse.json({ message: "Draft not found" }, { status: 404 });
    }

    if (draft.status === "converted" && draft.convertedEventId) {
      return NextResponse.json({
        success: true,
        eventId: draft.convertedEventId,
        alreadyConverted: true,
      });
    }

    const title =
      draft.clientName && draft.eventType
        ? `${draft.clientName} — ${draft.eventType.replace(/_/g, " ")}`
        : draft.clientName || "Call Planner Event";

    const eventDate = draft.eventDate ?? new Date();

    const createResponse = await runCommand({
      entity: "Event",
      command: "create",
      body: {
        title,
        eventType: draft.eventType ?? "other",
        eventDate: new Date(eventDate).getTime(),
        guestCount: draft.guestCount ?? 0,
        venueName: draft.venuePreference ?? "",
        notes: draft.specialNotes ?? draft.aiSummary ?? "",
        status: "draft",
        clientId: draft.clientContactId ?? "",
      },
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
    });

    if (!createResponse.ok) {
      return createResponse;
    }

    const createPayload = (await createResponse.json()) as {
      result?: { id?: string };
    };
    const eventId = createPayload.result?.id;
    if (!eventId) {
      return NextResponse.json(
        { message: "Event created but ID missing from response" },
        { status: 500 }
      );
    }

    const userCtx = { id: user.id, tenantId: user.tenantId, role: user.role };

    if (draft.status === "active") {
      const reviewResponse = await runCommand({
        entity: "EventPlanningDraft",
        command: "markReview",
        body: { id: draftId },
        user: userCtx,
      });
      if (!reviewResponse.ok) {
        log.warn("Draft markReview failed after event create", { draftId });
      }
    }

    const convertResponse = await runCommand({
      entity: "EventPlanningDraft",
      command: "convertToEvent",
      body: { id: draftId, eventId },
      user: userCtx,
    });

    if (!convertResponse.ok) {
      return convertResponse;
    }

    return NextResponse.json({
      success: true,
      eventId,
      draftId,
    });
  } catch (error) {
    captureException(error);
    log.error("Error creating event from draft:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
