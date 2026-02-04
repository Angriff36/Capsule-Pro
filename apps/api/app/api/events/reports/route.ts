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
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

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
export async function POST(request: Request) {
  try {
    const { orgId, userId } = await auth();
    if (!(orgId && userId)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const body = await request.json();

    const { eventId, checklistData, parsedEventData, autoFillScore } = body;

    if (!eventId) {
      return NextResponse.json(
        { message: "eventId is required" },
        { status: 400 }
      );
    }

    // Verify event exists and belongs to tenant
    const event = await database.event.findFirst({
      where: {
        id: eventId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!event) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 });
    }

    // Check for existing report
    const existingReport = await database.eventReport.findFirst({
      where: {
        tenantId,
        eventId,
        deletedAt: null,
      },
    });

    if (existingReport) {
      return NextResponse.json(
        {
          message: "Report already exists for this event",
          existingId: existingReport.id,
        },
        { status: 409 }
      );
    }

    // Calculate completion percentage
    let completion = 0;
    if (checklistData?.sections) {
      const questions = checklistData.sections.flatMap(
        (s: { questions: unknown[] }) => s.questions
      );
      const answered = questions.filter(
        (q: { value: unknown }) => q.value !== null && q.value !== ""
      ).length;
      completion = Math.round((answered / questions.length) * 100);
    }

    const reportName =
      event.title?.trim() || event.eventNumber?.trim() || event.id;

    // Create report
    const report = await database.eventReport.create({
      data: {
        tenantId,
        eventId,
        name: reportName,
        status: "draft",
        completion,
        checklistData: checklistData || {},
        parsedEventData: parsedEventData || undefined,
        autoFillScore: autoFillScore || undefined,
      },
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
    });

    return NextResponse.json({ data: report }, { status: 201 });
  } catch (error) {
    console.error("Error creating event report:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
