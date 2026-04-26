/**
 * Revenue Recognition Schedule Detail API Routes
 *
 * Handles get/update for a single revenue recognition schedule.
 */

import { database } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { requireTenantId } from "@/app/lib/tenant";
import { captureException } from "@sentry/nextjs";

type RouteContext = {
  params: { id: string };
};

/**
 * GET /api/accounting/revenue-recognition/schedules/[id]
 * Get a single revenue recognition schedule
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const tenantId = await requireTenantId();
    const { id } = context.params;

    const schedule = await database.revenueRecognitionSchedule.findFirst({
      where: { tenantId, id, deletedAt: null },
      include: {
        lines: { orderBy: { recognitionDate: "asc" } },
        invoice: { select: { invoiceNumber: true, status: true } },
      },
    });

    if (!schedule) {
      return NextResponse.json(
        { error: "Revenue recognition schedule not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...schedule,
      totalAmount: schedule.totalAmount.toString(),
      recognizedAmount: schedule.recognizedAmount.toString(),
      remainingAmount: schedule.remainingAmount.toString(),
      recognitionPercentage: schedule.recognitionPercentage.toString(),
    });
  } catch (error) {
    captureException(error);
    return NextResponse.json(
      { error: "Failed to get revenue recognition schedule" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/accounting/revenue-recognition/schedules/[id]
 * Update a revenue recognition schedule
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const tenantId = await requireTenantId();
    const { id } = context.params;
    const body = await request.json();

    const existing = await database.revenueRecognitionSchedule.findFirst({
      where: { tenantId, id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Revenue recognition schedule not found" },
        { status: 404 }
      );
    }

    const validStatuses = [
      "PENDING",
      "IN_PROGRESS",
      "COMPLETED",
      "CANCELLED",
      "PAUSED",
    ];
    if (body.status && !validStatuses.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (body.status) data.status = body.status;
    if (body.endDate) data.endDate = new Date(body.endDate);
    if (body.totalMilestones !== undefined)
      data.totalMilestones = body.totalMilestones;
    if (body.metadata) data.metadata = body.metadata;

    if (body.status === "PAUSED") {
      data.pausedAt = new Date();
    } else if (body.status === "CANCELLED") {
      data.cancelledAt = new Date();
    } else if (body.status === "COMPLETED") {
      data.completedAt = new Date();
    }

    if (body.recognizedAmount !== undefined) {
      data.recognizedAmount = body.recognizedAmount;
      data.remainingAmount =
        Number(existing.totalAmount) - Number(body.recognizedAmount);
      data.recognitionPercentage =
        (Number(body.recognizedAmount) / Number(existing.totalAmount)) * 100;
    }

    if (body.completedMilestones !== undefined) {
      data.completedMilestones = body.completedMilestones;
    }

    const schedule = await database.revenueRecognitionSchedule.update({
      where: { tenantId_id: { tenantId, id } },
      data,
    });

    return NextResponse.json({
      ...schedule,
      totalAmount: schedule.totalAmount.toString(),
      recognizedAmount: schedule.recognizedAmount.toString(),
      remainingAmount: schedule.remainingAmount.toString(),
      recognitionPercentage: schedule.recognitionPercentage.toString(),
    });
  } catch (error) {
    captureException(error);
    return NextResponse.json(
      { error: "Failed to update revenue recognition schedule" },
      { status: 500 }
    );
  }
}
