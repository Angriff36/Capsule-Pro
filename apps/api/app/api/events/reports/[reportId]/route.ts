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
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

type RouteContext = {
  params: Promise<{ reportId: string }>;
};

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
export async function PUT(request: Request, context: RouteContext) {
  try {
    const { orgId, userId } = await auth();
    if (!(orgId && userId)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { reportId } = await context.params;
    const body = await request.json();

    // Verify report exists
    const existing = await database.eventReport.findFirst({
      where: {
        id: reportId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { message: "Report not found" },
        { status: 404 }
      );
    }

    const { checklistData, status, reviewNotes } = body;

    // Calculate completion percentage
    let completion = existing.completion;
    if (checklistData?.sections) {
      const questions = checklistData.sections.flatMap(
        (s: { questions: unknown[] }) => s.questions
      );
      const answered = questions.filter(
        (q: { value: unknown }) => q.value !== null && q.value !== ""
      ).length;
      completion = Math.round((answered / questions.length) * 100);
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      completion,
    };

    if (checklistData !== undefined) {
      updateData.checklistData = checklistData;
    }

    if (status !== undefined) {
      updateData.status = status;

      // Set completedAt when status changes to completed
      if (status === "completed" && existing.status !== "completed") {
        updateData.completedAt = new Date();
      }

      // Set reviewedBy/reviewedAt when status changes to approved
      if (status === "approved" && existing.status !== "approved") {
        updateData.reviewedBy = userId;
        updateData.reviewedAt = new Date();
      }
    }

    if (reviewNotes !== undefined) {
      updateData.reviewNotes = reviewNotes;
    }

    // Update report
    const report = await database.eventReport.update({
      where: {
        tenantId_id: {
          tenantId,
          id: reportId,
        },
      },
      data: updateData,
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

    return NextResponse.json({ data: report });
  } catch (error) {
    console.error("Error updating event report:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/events/reports/[reportId]
 * Soft delete an event report
 */
export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { reportId } = await context.params;

    // Verify report exists
    const existing = await database.eventReport.findFirst({
      where: {
        id: reportId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { message: "Report not found" },
        { status: 404 }
      );
    }

    // Soft delete
    await database.eventReport.update({
      where: {
        tenantId_id: {
          tenantId,
          id: reportId,
        },
      },
      data: {
        deletedAt: new Date(),
      },
    });

    return NextResponse.json({ message: "Report deleted" });
  } catch (error) {
    console.error("Error deleting event report:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
