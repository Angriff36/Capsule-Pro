/**
 * Revenue Recognition Schedule Detail API Routes
 *
 * Handles individual revenue recognition schedule operations
 */

import { database } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTenantId } from "@/app/lib/tenant";

// Validation schemas
const recognizeAmountSchema = z.object({
  amount: z.number().positive(),
  recognizedAt: z.string().datetime().optional(),
});

const recognizeMilestoneSchema = z.object({
  milestoneId: z.string().uuid(),
  amount: z.number().positive(),
});

const recognizePercentageSchema = z.object({
  percentage: z.number().min(0).max(100),
});

const adjustScheduleSchema = z.object({
  newEndDate: z.string().datetime(),
  newTotalAmount: z.number().positive(),
});

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
      where: {
        tenantId,
        id,
        deletedAt: null,
      },
      include: {
        scheduleLines: {
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

    return NextResponse.json({
      ...schedule,
      recognitionPercentage:
        schedule.totalAmount > 0
          ? Number((schedule.recognizedAmount / schedule.totalAmount) * 100)
          : 0,
      isFullyRecognized:
        schedule.recognizedAmount >= schedule.totalAmount - 0.01,
    });
  } catch (error) {
    console.error("Error getting revenue recognition schedule:", error);
    return NextResponse.json(
      { error: "Failed to get revenue recognition schedule" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/accounting/revenue-recognition/schedules/[id]
 * Update a revenue recognition schedule (limited fields)
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const tenantId = await requireTenantId();
    const { id } = context.params;
    const body = await request.json();

    // Verify schedule exists
    const schedule = await database.revenueRecognitionSchedule.findFirst({
      where: {
        tenantId,
        id,
        deletedAt: null,
      },
    });

    if (!schedule) {
      return NextResponse.json(
        { error: "Revenue recognition schedule not found" },
        { status: 404 }
      );
    }

    // Handle different action types
    const action = body.action;

    if (action === "start") {
      const updated = await database.revenueRecognitionSchedule.update({
        where: { id },
        data: {
          status: "IN_PROGRESS",
          updatedAt: new Date(),
        },
      });
      return NextResponse.json(updated);
    }

    if (action === "recognizeAmount") {
      const validated = recognizeAmountSchema.parse(body);
      const newRecognized =
        Number(schedule.recognizedAmount) + validated.amount;
      const newRemaining = Number(schedule.remainingAmount) - validated.amount;

      const isComplete = newRemaining <= 0.01;

      const updated = await database.revenueRecognitionSchedule.update({
        where: { id },
        data: {
          recognizedAmount: newRecognized,
          remainingAmount: Math.max(0, newRemaining),
          status: isComplete ? "COMPLETED" : schedule.status,
          completedAt: isComplete ? new Date() : null,
          updatedAt: new Date(),
        },
      });
      return NextResponse.json(updated);
    }

    if (action === "recognizeMilestone") {
      const validated = recognizeMilestoneSchema.parse(body);
      const newCompleted = schedule.completedMilestones + 1;
      const newRecognized =
        Number(schedule.recognizedAmount) + validated.amount;
      const newRemaining = Number(schedule.remainingAmount) - validated.amount;

      const isComplete =
        newCompleted >= schedule.totalMilestones || newRemaining <= 0.01;

      const updated = await database.revenueRecognitionSchedule.update({
        where: { id },
        data: {
          completedMilestones: newCompleted,
          recognizedAmount: newRecognized,
          remainingAmount: Math.max(0, newRemaining),
          status: isComplete ? "COMPLETED" : schedule.status,
          completedAt: isComplete ? new Date() : null,
          updatedAt: new Date(),
        },
      });
      return NextResponse.json(updated);
    }

    if (action === "recognizePercentage") {
      const validated = recognizePercentageSchema.parse(body);
      const targetAmount =
        Number(schedule.totalAmount) * (validated.percentage / 100);
      const amountToRecognize =
        targetAmount - Number(schedule.recognizedAmount);

      if (amountToRecognize <= 0) {
        return NextResponse.json(
          { error: "Target percentage already reached" },
          { status: 400 }
        );
      }

      const isComplete = validated.percentage >= 100;

      const updated = await database.revenueRecognitionSchedule.update({
        where: { id },
        data: {
          recognizedAmount: targetAmount,
          remainingAmount: Number(schedule.totalAmount) - targetAmount,
          status: isComplete ? "COMPLETED" : schedule.status,
          completedAt: isComplete ? new Date() : null,
          updatedAt: new Date(),
        },
      });
      return NextResponse.json(updated);
    }

    if (action === "pause") {
      const updated = await database.revenueRecognitionSchedule.update({
        where: { id },
        data: {
          status: "PAUSED",
          updatedAt: new Date(),
        },
      });
      return NextResponse.json(updated);
    }

    if (action === "resume") {
      const updated = await database.revenueRecognitionSchedule.update({
        where: { id },
        data: {
          status: "IN_PROGRESS",
          updatedAt: new Date(),
        },
      });
      return NextResponse.json(updated);
    }

    if (action === "adjustSchedule") {
      const validated = adjustScheduleSchema.parse(body);
      const adjustment =
        validated.newTotalAmount - Number(schedule.totalAmount);

      const updated = await database.revenueRecognitionSchedule.update({
        where: { id },
        data: {
          endDate: new Date(validated.newEndDate),
          totalAmount: validated.newTotalAmount,
          remainingAmount: Number(schedule.remainingAmount) + adjustment,
          updatedAt: new Date(),
        },
      });
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error updating revenue recognition schedule:", error);
    return NextResponse.json(
      { error: "Failed to update revenue recognition schedule" },
      { status: 500 }
    );
  }
}
