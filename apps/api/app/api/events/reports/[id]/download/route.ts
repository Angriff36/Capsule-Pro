/**
 * @module EventReportDownload
 * @intent Download an event report as a JSON file
 * @responsibility Return the report's parsedEventData (or full report) as a downloadable JSON document
 * @domain Events
 * @tags events, reports, download, api
 * @canonical true
 */

import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireTenantId } from "@/app/lib/tenant";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = await requireTenantId();
    const { id } = await params;

    const report = await database.eventReport.findUnique({
      where: { id, tenantId, deletedAt: null },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            eventNumber: true,
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

    const payload = report.parsedEventData ?? {
      id: report.id,
      name: report.name,
      status: report.status,
      completion: report.completion,
      checklistData: report.checklistData,
      reportConfig: report.reportConfig,
      reviewNotes: report.reviewNotes,
      autoFillScore: report.autoFillScore,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
      completedAt: report.completedAt,
    };

    const sanitizedTitle = report.event?.title
      ? report.event.title.replaceAll(/\s+/g, "-").toLowerCase().slice(0, 60)
      : "report";
    const filename = `event-report-${sanitizedTitle}-${report.id.slice(0, 8)}.json`;

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    captureException(error);
    log.error("Error downloading event report:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
