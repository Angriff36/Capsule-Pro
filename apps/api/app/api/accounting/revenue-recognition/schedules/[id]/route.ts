/**
 * Revenue Recognition Schedule Detail API Routes
 *
 * GET   /api/accounting/revenue-recognition/schedules/[id]  - Get schedule with lines
 * PATCH /api/accounting/revenue-recognition/schedules/[id]  - Update schedule
 */

import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { requireTenantId, resolveCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";
import { createManifestRuntime } from "@/lib/manifest-runtime";

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
    log.error("Error getting revenue recognition schedule:", error);
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

    // Action: Start recognition process (Manifest runtime)
    if (action === "start") {
      if (existing.status !== "PENDING") {
        return NextResponse.json(
          { error: "Only PENDING schedules can be started" },
          { status: 400 }
        );
      }

      const user = await resolveCurrentUser(request);
      return runManifestCommand({
        entity: "RevenueRecognitionSchedule",
        command: "startRecognition",
        body: { id, tenantId },
        user: { id: user.id, tenantId: user.tenantId, role: user.role },
        instanceId: id,
      });
    }

    // Action: Recognize revenue (Manifest runtime — multi-step)
    if (action === "recognize") {
      const amount = Number(body.amount);
      if (!amount || amount <= 0) {
        return NextResponse.json(
          { error: "Valid amount is required" },
          { status: 400 }
        );
      }

      const newRemaining = Number(existing.remainingAmount) - amount;

      if (newRemaining < 0) {
        return NextResponse.json(
          { error: "Recognition amount exceeds remaining amount" },
          { status: 400 }
        );
      }

      const isComplete = newRemaining <= 0.01;
      const recognizedAt = new Date(body.recognizedAt || Date.now());

      const user = await resolveCurrentUser(request);
      const manifestUser = { id: user.id, tenantId: user.tenantId, role: user.role };
      const manifestRuntime = await createManifestRuntime({
        user: manifestUser,
        entityName: "RevenueRecognitionLine",
      });

      // Step 1: Create the recognition line
      const lineResult = await manifestRuntime.runCommand(
        "create",
        {
          tenantId,
          scheduleId: id,
          sequence: existing.lines.length + 1,
          amount,
          recognizedAt: recognizedAt.toISOString(),
          status: "RECOGNIZED",
          description: body.description || `Recognition ${existing.lines.length + 1}`,
          metadata: body.metadata ?? {},
        },
        { entityName: "RevenueRecognitionLine" }
      );

      if (!lineResult.success) {
        return NextResponse.json(
          { error: "Failed to create recognition line", details: lineResult },
          { status: 500 }
        );
      }

      // Step 2: Update the schedule with recognized amounts
      const scheduleResult = await manifestRuntime.runCommand(
        "recognizeAmount",
        {
          id,
          tenantId,
          amount,
          recognizedAt: recognizedAt.toISOString(),
        },
        { entityName: "RevenueRecognitionSchedule", instanceId: id }
      );

      if (!scheduleResult.success) {
        return NextResponse.json(
          { error: "Failed to update schedule", details: scheduleResult },
          { status: 500 }
        );
      }

      // Step 3: Complete the schedule if fully recognized
      if (isComplete) {
        await manifestRuntime.runCommand(
          "completeIfFullyRecognized",
          { id, tenantId },
          { entityName: "RevenueRecognitionSchedule", instanceId: id }
        );
      }

      // Re-fetch the schedule with lines for response format compatibility
      const updated = await database.revenueRecognitionSchedule.findFirst({
        where: { tenantId, id, deletedAt: null },
        include: {
          lines: { where: { deletedAt: null }, orderBy: { sequence: "asc" } },
        },
      });

      return NextResponse.json({ data: { ...updated, newLine: lineResult.result } });
    }

    // TODO: migrate to Manifest runtime when commands are available
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

    // Action: Cancel schedule (Manifest runtime)
    if (action === "cancel") {
      if (existing.status === "COMPLETED") {
        return NextResponse.json(
          { error: "Cannot cancel completed schedule" },
          { status: 400 }
        );
      }

      const user = await resolveCurrentUser(request);
      return runManifestCommand({
        entity: "RevenueRecognitionSchedule",
        command: "cancel",
        body: {
          id,
          tenantId,
          reason: body.reason || "Cancelled via API",
        },
        user: { id: user.id, tenantId: user.tenantId, role: user.role },
        instanceId: id,
      });
    }

    // Action: Adjust schedule amounts (Manifest runtime — adjustSchedule command)
    if (action === "adjust") {
      const newTotal =
        body.totalAmount !== undefined ? Number(body.totalAmount) : null;

      if (newTotal !== null && newTotal <= 0) {
        return NextResponse.json(
          { error: "Total amount must be positive" },
          { status: 400 }
        );
      }

      const user = await resolveCurrentUser(request);
      await runManifestCommand({
        entity: "RevenueRecognitionSchedule",
        command: "adjustSchedule",
        instanceId: id,
        body: {
          newEndDate: body.endDate ? new Date(body.endDate).getTime() : existing.endDate?.getTime() ?? Date.now(),
          newTotalAmount: newTotal ?? Number(existing.totalAmount),
          description: body.description ?? existing.description ?? "",
          notes: body.notes ?? existing.notes ?? "",
          recognitionPeriod: body.recognitionPeriod ?? existing.recognitionPeriod ?? 0,
        },
        user: { id: user.id, tenantId: user.tenantId, role: user.role },
      });

      // Re-fetch with lines for response format compatibility (read path — constitution §10)
      const updated = await database.revenueRecognitionSchedule.findFirst({
        where: { tenantId, id, deletedAt: null },
        include: {
          lines: { where: { deletedAt: null }, orderBy: { sequence: "asc" } },
        },
      });

      return NextResponse.json({ data: updated });
    }

    // Default: simple field updates via governed adjustSchedule command
    {
      const user = await resolveCurrentUser(request);
      await runManifestCommand({
        entity: "RevenueRecognitionSchedule",
        command: "adjustSchedule",
        instanceId: id,
        body: {
          newEndDate: existing.endDate?.getTime() ?? Date.now(),
          newTotalAmount: Number(existing.totalAmount),
          description: body.description ?? existing.description ?? "",
          notes: body.notes ?? existing.notes ?? "",
          recognitionPeriod: body.recognitionPeriod ?? existing.recognitionPeriod ?? 0,
        },
        user: { id: user.id, tenantId: user.tenantId, role: user.role },
      });

      // Re-fetch with lines for response format compatibility (read path — constitution §10)
      const updated = await database.revenueRecognitionSchedule.findFirst({
        where: { tenantId, id, deletedAt: null },
        include: {
          lines: { where: { deletedAt: null }, orderBy: { sequence: "asc" } },
        },
      });

      return NextResponse.json({ data: updated });
    }
  } catch (error) {
    captureException(error);
    log.error("Error updating revenue recognition schedule:", error);
    return NextResponse.json(
      { error: "Failed to update revenue recognition schedule" },
      { status: 500 }
    );
  }
}
