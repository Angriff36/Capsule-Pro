/**
 * @module EventReportAPI
 * @intent Get, update, and delete individual event reports
 * @responsibility Single event report operations
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

interface RouteContext {
  params: Promise<{ reportId: string }>;
}

/**
 * GET /api/events/reports/[reportId]
 * Get a single event report
 */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { reportId } = await context.params;

    const report = await database.eventReport.findFirst({
      where: {
        id: reportId,
        tenantId,
        deletedAt: null,
      },
      include: {
        event: {
          select: {
            id: true,
            eventNumber: true,
            title: true,
            eventDate: true,
            venueName: true,
            venueAddress: true,
            guestCount: true,
          },
        },
      },
    });

    if (!report) {
      return NextResponse.json(
        { message: "Report not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: report });
  } catch (error) {
    console.error("Error fetching event report:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/events/reports/[reportId]
 * Update an event report
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ reportId: string }> }
) {
  const { reportId } = await context.params;
  console.log("[EventReport/PUT] Delegating to manifest submit command", {
    reportId,
  });
  return executeManifestCommand(request, {
    entityName: "EventReport",
    commandName: "submit",
    params: { reportId },
    transformBody: (body) => ({ ...body, id: reportId }),
  });
}

/**
 * DELETE /api/events/reports/[reportId]
 * Soft delete an event report
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ reportId: string }> }
) {
  const { reportId } = await context.params;
  console.log("[EventReport/DELETE] Delegating to manifest complete command", {
    reportId,
  });
  return executeManifestCommand(request, {
    entityName: "EventReport",
    commandName: "complete",
    params: { reportId },
    transformBody: (_body) => ({ id: reportId }),
  });
}
