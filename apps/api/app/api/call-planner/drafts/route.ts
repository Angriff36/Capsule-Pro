/**
 * AI Call Planner Drafts API Endpoints
 *
 * GET    /api/call-planner/drafts        - List drafts
 *
 * Read-only route: direct tenant-scoped Prisma reads (constitution §10).
 * The schema has no Prisma relations — session rows are fetched by flat key.
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

export const runtime = "nodejs";

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

    const whereClause = {
      AND: [
        { tenantId },
        { deletedAt: null },
        ...(status ? [{ status }] : []),
      ],
    };

    const [drafts, totalCount] = await Promise.all([
      database.eventPlanningDraft.findMany({
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
        },
      }),
      database.eventPlanningDraft.count({ where: whereClause }),
    ]);

    // No Prisma relations in this schema — resolve sessions by flat key.
    const sessionIds = [...new Set(drafts.map((draft) => draft.sessionId))];
    const sessions = sessionIds.length
      ? await database.callPlanningSession.findMany({
          where: {
            tenantId,
            id: { in: sessionIds },
            deletedAt: null,
          },
          select: {
            id: true,
            status: true,
            startedAt: true,
            endedAt: true,
          },
        })
      : [];
    const sessionById = new Map(sessions.map((s) => [s.id, s]));

    return NextResponse.json({
      drafts: drafts.map((draft) => ({
        ...draft,
        session: sessionById.get(draft.sessionId) ?? null,
      })),
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
