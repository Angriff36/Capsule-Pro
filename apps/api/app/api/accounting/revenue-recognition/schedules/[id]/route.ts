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
 * Update mutable fields on a revenue recognition schedule
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const tenantId = await requireTenantId();
    const { id } = await context.params;
    const body = await request.json();

    // Verify schedule exists and belongs to tenant
    const existing = await database.revenueRecognitionSchedule.findFirst({
      where: { tenantId, id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Revenue recognition schedule not found" },
        { status: 404 }
      );
    }

    // Build updates object from mutable fields only
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
      where: {
        tenantId_id: { tenantId, id },
      },
      data: {
        ...updates,
        updatedAt: new Date(),
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
