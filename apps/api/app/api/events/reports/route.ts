/**
 * @module EventReportsAPI
 * @intent List and create event reports (Pre-Event Review checklists)
 * @responsibility Manage event report lifecycle
 * @domain Events
 * @tags events, reports, api
 * @canonical true
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { executeManifestCommand } from "@/lib/manifest-command-handler";

/**
 * GET /api/events/reports
 * List event reports with pagination and filters
 */
export async function GET(request: Request) {
  try {
    const { orgId, userId } = await auth();
    if (!(orgId && userId)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { searchParams } = new URL(request.url);

    // Parse filters
    const eventId = searchParams.get("eventId");
    const status = searchParams.get("status");
    const page = Number.parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(
      Math.max(Number.parseInt(searchParams.get("limit") || "20", 10), 1),
      100
    );
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause: Record<string, unknown> = {
      tenantId,
      deletedAt: null,
    };

    if (eventId) {
      whereClause.eventId = eventId;
    }

    if (status) {
      whereClause.status = status;
    }

    // Fetch reports
    const reports = await database.eventReport.findMany({
      where: whereClause,
      include: {
        event: {
          select: {
            id: true,
            eventNumber: true,
            title: true,
            eventDate: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      take: limit,
      skip: offset,
    });

    // Get total count
    const totalCount = await database.eventReport.count({
      where: whereClause,
    });

    return NextResponse.json({
      data: reports,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Error listing event reports:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/events/reports
 * Create a new event report
 */
export async function POST(request: NextRequest) {
  console.log("[EventReport/POST] Delegating to manifest create command");
  return executeManifestCommand(request, {
    entityName: "EventReport",
    commandName: "create",
  });
}
