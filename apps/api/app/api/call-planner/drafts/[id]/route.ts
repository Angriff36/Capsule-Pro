/**
 * AI Call Planner Draft Detail API Endpoints
 *
 * GET    /api/call-planner/drafts/[id]   - Get draft details
 * PATCH  /api/call-planner/drafts/[id]   - Update draft
 *
 * Reads are direct tenant-scoped Prisma queries (constitution §10).
 * Writes execute via Manifest runtime commands on EventPlanningDraft
 * (updateField / updateBudget / updateGuestCount / updateVenue /
 * updateMenuPreferences / markReview / convertToEvent / expire).
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

/** Draft fields updatable one-at-a-time via EventPlanningDraft.updateField. */
const UPDATE_FIELD_NAMES = [
  "clientName",
  "eventType",
  "eventTime",
  "serviceStyle",
  "dietaryRestrictions",
  "timelineNotes",
  "specialNotes",
  "aiSummary",
] as const;

/** Patch keys with no governed command — rejected loudly, never dropped. */
const UNSUPPORTED_PATCH_FIELDS = [
  "customItems",
  "openQuestions",
  "clientContactId",
  "proposalId",
  "packageIds",
  "addOnIds",
  "expiresAt",
] as const;

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
    const user = await resolveCurrentUser(request);
    const tenantId = user.tenantId;

    const draft = await database.eventPlanningDraft.findFirst({
      where: {
        tenantId,
        id,
        deletedAt: null,
      },
    });

    if (!draft) {
      return NextResponse.json({ message: "Draft not found" }, { status: 404 });
    }

    // No Prisma relations in this schema — resolve children by flat key.
    const [session, extractedDetails] = await Promise.all([
      database.callPlanningSession.findFirst({
        where: {
          tenantId,
          id: draft.sessionId,
          deletedAt: null,
        },
        select: {
          id: true,
          status: true,
          startedAt: true,
          endedAt: true,
          transcriptText: true,
        },
      }),
      database.extractedDetail.findMany({
        where: {
          tenantId,
          draftId: draft.id,
          deletedAt: null,
        },
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
      }),
    ]);

    return NextResponse.json({
      draft: { ...draft, session, extractedDetails },
    });
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
 * Update draft fields via governed Manifest commands
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { orgId, userId: clerkUserId } = await auth();
    if (!orgId || !clerkUserId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const user = await resolveCurrentUser(request);
    const tenantId = user.tenantId;

    // Read path: confirm the draft exists in this tenant before mutating
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

    const body = (await request.json()) as Record<string, unknown>;

    // Fail loud on fields no governed command can express (constitution: no
    // silent drops, no direct writes on governed entities).
    const unsupported: string[] = UNSUPPORTED_PATCH_FIELDS.filter(
      (field) => body[field] !== undefined
    );
    if (body.eventDate === null) {
      unsupported.push("eventDate (clearing a date is not supported)");
    }
    if (
      body.status !== undefined &&
      !["review", "expired", "converted"].includes(String(body.status))
    ) {
      unsupported.push(`status=${String(body.status)}`);
    }
    if (unsupported.length > 0) {
      return NextResponse.json(
        {
          message: `Unsupported draft update field(s): ${unsupported.join(", ")}. No governed EventPlanningDraft command covers them.`,
        },
        { status: 400 }
      );
    }

    // Human edits are confirmed values — confidence defaults to 1 unless the
    // caller supplies an explicit overallConfidence.
    const confidence =
      typeof body.overallConfidence === "number" ? body.overallConfidence : 1;

    const commands: Array<{ command: string; body: Record<string, unknown> }> =
      [];

    let fieldUpdates = 0;
    for (const fieldName of UPDATE_FIELD_NAMES) {
      if (body[fieldName] !== undefined) {
        commands.push({
          command: "updateField",
          body: {
            id,
            fieldName,
            value: String(body[fieldName] ?? ""),
            confidence,
          },
        });
        fieldUpdates++;
      }
    }

    // venuePreference without venueId flows through updateField; with venueId
    // both flow through updateVenue below.
    if (body.venuePreference !== undefined && body.venueId === undefined) {
      commands.push({
        command: "updateField",
        body: {
          id,
          fieldName: "venuePreference",
          value: String(body.venuePreference ?? ""),
          confidence,
        },
      });
      fieldUpdates++;
    }

    if (body.eventDate !== undefined && body.eventDate !== null) {
      const dateValue =
        typeof body.eventDate === "number"
          ? body.eventDate
          : new Date(String(body.eventDate)).getTime();
      if (!Number.isFinite(dateValue)) {
        return NextResponse.json(
          { message: "Invalid eventDate" },
          { status: 400 }
        );
      }
      commands.push({
        command: "updateField",
        body: {
          id,
          fieldName: "eventDate",
          value: "",
          // Datetime command params are epoch-ms numbers
          dateValue,
          confidence,
        },
      });
      fieldUpdates++;
    }

    // Explicit overallConfidence with no accompanying field update still needs
    // an updateField pass (the command sets overallConfidence = confidence).
    if (
      typeof body.overallConfidence === "number" &&
      fieldUpdates === 0
    ) {
      commands.push({
        command: "updateField",
        body: { id, fieldName: "overallConfidence", value: "", confidence },
      });
    }

    if (
      body.guestCount !== undefined ||
      body.guestCountMin !== undefined ||
      body.guestCountMax !== undefined
    ) {
      commands.push({
        command: "updateGuestCount",
        body: {
          id,
          guestCount: Number(body.guestCount ?? existingDraft.guestCount ?? 0),
          guestCountMin: Number(
            body.guestCountMin ?? existingDraft.guestCountMin ?? 0
          ),
          guestCountMax: Number(
            body.guestCountMax ?? existingDraft.guestCountMax ?? 0
          ),
        },
      });
    }

    if (body.budgetMin !== undefined || body.budgetMax !== undefined) {
      commands.push({
        command: "updateBudget",
        body: {
          id,
          budgetMin: Number(body.budgetMin ?? existingDraft.budgetMin ?? 0),
          budgetMax: Number(body.budgetMax ?? existingDraft.budgetMax ?? 0),
        },
      });
    }

    if (body.venueId !== undefined) {
      commands.push({
        command: "updateVenue",
        body: {
          id,
          venueId: String(body.venueId ?? ""),
          venuePreference: String(
            body.venuePreference ?? existingDraft.venuePreference ?? ""
          ),
        },
      });
    }

    if (body.menuPreferences !== undefined) {
      commands.push({
        command: "updateMenuPreferences",
        body: {
          id,
          menuPreferences:
            typeof body.menuPreferences === "string"
              ? body.menuPreferences
              : JSON.stringify(body.menuPreferences ?? {}),
        },
      });
    }

    // Status transitions map to dedicated commands (applied last so field
    // updates still satisfy the active/review guards).
    if (body.status === "review") {
      commands.push({ command: "markReview", body: { id } });
    } else if (body.status === "expired") {
      commands.push({ command: "expire", body: { id } });
    } else if (body.status === "converted") {
      const eventId = body.convertedEventId ?? body.eventId;
      if (typeof eventId !== "string" || eventId.length === 0) {
        return NextResponse.json(
          {
            message:
              "Converting a draft requires an eventId (EventPlanningDraft.convertToEvent).",
          },
          { status: 400 }
        );
      }
      commands.push({ command: "convertToEvent", body: { id, eventId } });
    }

    // Governed writes: execute each mapped command via Manifest runtime
    for (const { command, body: commandBody } of commands) {
      const response = await runCommand({
        entity: "EventPlanningDraft",
        command,
        body: commandBody,
        user: { id: user.id, tenantId: user.tenantId, role: user.role },
      });
      if (!response.ok) {
        return response;
      }
    }

    // Read back the updated draft (read path, constitution §10)
    const updatedDraft = await database.eventPlanningDraft.findFirst({
      where: {
        tenantId,
        id,
        deletedAt: null,
      },
    });

    return NextResponse.json({ draft: updatedDraft ?? existingDraft });
  } catch (error) {
    captureException(error);
    log.error("Error updating draft:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
