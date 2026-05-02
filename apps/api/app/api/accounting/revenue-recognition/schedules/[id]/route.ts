/**
 * Revenue Recognition Schedule Detail API Routes
 *
 * GET   /api/accounting/revenue-recognition/schedules/[id]  - Get schedule with lines
 * PATCH /api/accounting/revenue-recognition/schedules/[id]  - Update schedule
 */

import { database } from "@repo/database";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { requireTenantId } from "@/app/lib/tenant";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/accounting/revenue-recognition/schedules/[id]
 * Get a single revenue recognition schedule with its lines
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const tenantId = await requireTenantId();
    const { id } = await context.params;

    const schedule = await database.revenueRecognitionSchedule.findFirst({
      where: {
        tenantId,
        id,
        deletedAt: null,
      },
      include: {
        lines: {
          where: { deletedAt: null },
          orderBy: { sequence: "asc" },
        },
      },
    });

    if (!schedule) {
      return NextResponse.json(
        { error: "Revenue recognition schedule not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: schedule });
  } catch (error) {
    captureException(error);
    console.error("Error getting revenue recognition schedule:", error);
    return NextResponse.json(
      { error: "Failed to get revenue recognition schedule" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/accounting/revenue-recognition/schedules/[id]
 * Handle schedule updates and command actions
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const tenantId = await requireTenantId();
    const { id } = await context.params;
    const body = await request.json();

    // Verify schedule exists and belongs to tenant
    const existing = await database.revenueRecognitionSchedule.findFirst({
      where: { tenantId, id, deletedAt: null },
      include: {
        lines: { where: { deletedAt: null }, orderBy: { sequence: "asc" } },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Revenue recognition schedule not found" },
        { status: 404 }
      );
    }

    const action = body.action;

    // Action: Start recognition process
    if (action === "start") {
      if (existing.status !== "PENDING") {
        return NextResponse.json(
          { error: "Only PENDING schedules can be started" },
          { status: 400 }
        );
      }

      const updated = await database.revenueRecognitionSchedule.update({
        where: { tenantId_id: { tenantId, id } },
        data: { status: "IN_PROGRESS", updatedAt: new Date() },
        include: {
          lines: { where: { deletedAt: null }, orderBy: { sequence: "asc" } },
        },
      });

      return NextResponse.json({ data: updated });
    }

    // Action: Recognize revenue (create a recognition line)
    if (action === "recognize") {
      const amount = Number(body.amount);
      if (!amount || amount <= 0) {
        return NextResponse.json(
          { error: "Valid amount is required" },
          { status: 400 }
        );
      }

      const newRecognized = Number(existing.recognizedAmount) + amount;
      const newRemaining = Number(existing.remainingAmount) - amount;

      if (newRemaining < 0) {
        return NextResponse.json(
          { error: "Recognition amount exceeds remaining amount" },
          { status: 400 }
        );
      }

      const newCompleted = existing.completedMilestones + 1;
      const isComplete = newRemaining <= 0.01;

      // Create a recognition line and update schedule
      const [line, updated] = await database.$transaction([
        database.revenueRecognitionLine.create({
          data: {
            tenantId,
            scheduleId: id,
            sequence: existing.lines.length + 1,
            amount,
            recognizedAt: new Date(body.recognizedAt || new Date()),
            status: "RECOGNIZED",
            description:
              body.description || `Recognition ${existing.lines.length + 1}`,
            metadata: body.metadata ?? {},
          },
        }),
        database.revenueRecognitionSchedule.update({
          where: { tenantId_id: { tenantId, id } },
          data: {
            recognizedAmount: newRecognized,
            remainingAmount: Math.max(0, newRemaining),
            completedMilestones: newCompleted,
            status: isComplete ? "COMPLETED" : "IN_PROGRESS",
            completedAt: isComplete ? new Date() : null,
            updatedAt: new Date(),
          },
          include: {
            lines: { where: { deletedAt: null }, orderBy: { sequence: "asc" } },
          },
        }),
      ]);

      return NextResponse.json({ data: { ...updated, newLine: line } });
    }

    // Action: Reverse a recognition
    if (action === "reverse") {
      const { lineId } = body;
      if (!lineId) {
        return NextResponse.json(
          { error: "lineId is required" },
          { status: 400 }
        );
      }

      const line = await database.revenueRecognitionLine.findFirst({
        where: { tenantId, id: lineId, scheduleId: id, deletedAt: null },
      });

      if (!line) {
        return NextResponse.json(
          { error: "Recognition line not found" },
          { status: 404 }
        );
      }

      const reverseAmount = Number(line.amount);
      const newRecognized = Number(existing.recognizedAmount) - reverseAmount;
      const newRemaining = Number(existing.remainingAmount) + reverseAmount;

      // Soft-delete the line and update schedule
      const [, updated] = await database.$transaction([
        database.revenueRecognitionLine.update({
          where: { tenantId_id: { tenantId, id: lineId } },
          data: { status: "REVERSED", deletedAt: new Date() },
        }),
        database.revenueRecognitionSchedule.update({
          where: { tenantId_id: { tenantId, id } },
          data: {
            recognizedAmount: Math.max(0, newRecognized),
            remainingAmount: newRemaining,
            status: "IN_PROGRESS",
            completedAt: null,
            updatedAt: new Date(),
          },
          include: {
            lines: { where: { deletedAt: null }, orderBy: { sequence: "asc" } },
          },
        }),
      ]);

      return NextResponse.json({ data: updated });
    }

    // Action: Cancel schedule
    if (action === "cancel") {
      if (existing.status === "COMPLETED") {
        return NextResponse.json(
          { error: "Cannot cancel completed schedule" },
          { status: 400 }
        );
      }

      const updated = await database.revenueRecognitionSchedule.update({
        where: { tenantId_id: { tenantId, id } },
        data: { status: "CANCELLED", updatedAt: new Date() },
        include: {
          lines: { where: { deletedAt: null }, orderBy: { sequence: "asc" } },
        },
      });

      return NextResponse.json({ data: updated });
    }

    // Action: Adjust schedule amounts
    if (action === "adjust") {
      const newTotal =
        body.totalAmount !== undefined ? Number(body.totalAmount) : null;

      if (newTotal !== null && newTotal <= 0) {
        return NextResponse.json(
          { error: "Total amount must be positive" },
          { status: 400 }
        );
      }

      const updates: Record<string, unknown> = { updatedAt: new Date() };

      if (newTotal !== null) {
        updates.totalAmount = newTotal;
        updates.remainingAmount = newTotal - Number(existing.recognizedAmount);
      }

      if (body.description !== undefined) {
        updates.description = body.description;
      }

      if (body.notes !== undefined) {
        updates.notes = body.notes;
      }

      if (body.endDate !== undefined) {
        updates.endDate = new Date(body.endDate);
      }

      if (body.recognitionPeriod !== undefined) {
        updates.recognitionPeriod = body.recognitionPeriod;
      }

      const updated = await database.revenueRecognitionSchedule.update({
        where: { tenantId_id: { tenantId, id } },
        data: updates,
        include: {
          lines: { where: { deletedAt: null }, orderBy: { sequence: "asc" } },
        },
      });

      return NextResponse.json({ data: updated });
    }

    // Default: simple field updates (backward compatible)
    const updates: Record<string, unknown> = {};

    if (body.description !== undefined) {
      updates.description = body.description;
    }

    if (body.notes !== undefined) {
      updates.notes = body.notes;
    }

    if (body.status !== undefined) {
      updates.status = body.status;
    }

    const updated = await database.revenueRecognitionSchedule.update({
      where: { tenantId_id: { tenantId, id } },
      data: { ...updates, updatedAt: new Date() },
      include: {
        lines: { where: { deletedAt: null }, orderBy: { sequence: "asc" } },
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    captureException(error);
    console.error("Error updating revenue recognition schedule:", error);
    return NextResponse.json(
      { error: "Failed to update revenue recognition schedule" },
      { status: 500 }
    );
  }
}
