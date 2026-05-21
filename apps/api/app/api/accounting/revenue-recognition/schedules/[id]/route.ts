/**
 * Revenue Recognition Schedule Detail API Routes
 *
 * GET   /api/accounting/revenue-recognition/schedules/[id]  - Get schedule with lines
 * PATCH /api/accounting/revenue-recognition/schedules/[id]  - Update schedule
 *
 * MANIFEST GOVERNANCE STATUS — PARTIAL MIGRATION (2 of 5 actions)
 * --------------------------------------------------------------
 * `start` and `cancel` are now routed through the manifest runtime. The
 * remaining three actions (`recognize`, `reverse`, `adjust`, and the default
 * field-update branch) still issue direct writes; each is a tracked
 * violation surfaced by `pnpm manifest:audit-direct-writes`.
 *
 * Store gap CLOSED (2026-05): both RevenueRecognitionSchedule and
 * RevenueRecognitionLine now have dedicated PrismaStores in
 * `packages/manifest-adapters/src/prisma-stores/revenue-recognition.ts` and
 * are members of `ENTITIES_WITH_SPECIFIC_STORES`. The runtime no longer
 * falls back to PrismaJsonStore for either entity.
 *
 * Per-retained-action blockers:
 *
 *   - recognize:  Atomic dual-entity write inside
 *                 `database.$transaction([line.create, schedule.update])`.
 *                 The manifest runtime executes one command at a time;
 *                 splitting this into back-to-back `runCommand` calls would
 *                 break the atomicity invariant pinned by
 *                 `__tests__/accounting/revenue-recognition-patch-actions.test.ts`
 *                 ("creates a line and updates aggregates atomically").
 *                 Unblocking requires either a manifest composite-command
 *                 primitive or a documented bypass in `bypasses.json`.
 *
 *   - reverse:    Same atomic dual-entity pattern — soft-delete the line
 *                 AND restore aggregate amounts on the schedule in one
 *                 transaction. Same blocker as `recognize`.
 *
 *   - adjust:     Manifest `adjustSchedule(newEndDate, newTotalAmount)`
 *                 only handles those two fields and guards
 *                 `newEndDate > now()`. Route additionally supports
 *                 `description`, `notes`, and `recognitionPeriod` updates
 *                 in the same call and has no endDate guard. Migration
 *                 drops three field-update paths AND tightens validation.
 *
 *   - default:    Generic field-update branch (status / description /
 *                 notes when no `action` is provided). Manifest has no
 *                 corresponding generic update command. Migration requires
 *                 either adding such a command or splitting the route into
 *                 purpose-specific endpoints.
 *
 * Do not silence retained findings by adding a `DEPRECATED ALIAS` marker.
 */

import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { requireCurrentUser, requireTenantId } from "@/app/lib/tenant";
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

    // Action: Start recognition process
    //
    // MIGRATED to Manifest runtime governance. The status mutation
    // (PENDING → IN_PROGRESS) and the `RecognitionStarted` outbox event are
    // both owned by the `RevenueRecognitionSchedule.startRecognition`
    // command. The pre-check below preserves the legacy 400-status mapping
    // for the existing test (`__tests__/accounting/revenue-recognition-patch-actions.test.ts`
    // → "rejects start on a non-PENDING schedule"); the same guard inside the
    // manifest would return 422 with a guardFailure body.
    //
    // Spec tightening (intentional): the manifest also guards
    // `now() >= self.startDate`, which the legacy route did not enforce. A
    // start request for a schedule with a future `startDate` will now return
    // 422 instead of 200. No existing test covers that edge.
    if (action === "start") {
      if (existing.status !== "PENDING") {
        return NextResponse.json(
          { error: "Only PENDING schedules can be started" },
          { status: 400 }
        );
      }

      const user = await requireCurrentUser();
      const runtime = await createManifestRuntime({
        user: {
          id: user.id,
          tenantId: user.tenantId,
          role: user.role,
        },
        entityName: "RevenueRecognitionSchedule",
      });

      const result = await runtime.runCommand(
        "startRecognition",
        {},
        {
          entityName: "RevenueRecognitionSchedule",
          instanceId: id,
        }
      );

      if (!result.success) {
        if (result.policyDenial) {
          return NextResponse.json(
            {
              error: `Access denied: ${result.policyDenial.policyName} (role=${user.role})`,
            },
            { status: 403 }
          );
        }
        if (result.guardFailure) {
          return NextResponse.json(
            {
              error: `Guard ${result.guardFailure.index} failed: ${result.guardFailure.formatted}`,
            },
            { status: 422 }
          );
        }
        return NextResponse.json(
          { error: result.error ?? "Command failed" },
          { status: 400 }
        );
      }

      // Read-back to preserve the legacy `{ data: { ..., lines: [...] } }`
      // response shape — the runtime store does not include the `lines`
      // relation in its return value.
      const updated = await database.revenueRecognitionSchedule.findFirst({
        where: { tenantId, id },
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
    //
    // MIGRATED to Manifest runtime governance (2026-05).
    //
    // The manifest source was tightened in the same pass so the notes
    // mutation is now conditional on `reason != ""`. Callers that omit a
    // reason (the legacy route shape) keep their existing notes untouched;
    // callers that supply a non-empty reason now get a `\nCancelled: <reason>`
    // audit-trail entry persisted to `notes`. See
    // `packages/manifest-adapters/manifests/revenue-recognition-rules.manifest`.
    //
    // The pre-check below preserves the legacy 400 status code for the
    // COMPLETED case (the test pins this); the manifest's own guard would
    // otherwise return 422 with a `guardFailure` body. Spec tightening
    // (intentional, untested edge): the manifest guards
    // `status in [PENDING, IN_PROGRESS, PAUSED]`, so calling cancel on a
    // schedule that is already CANCELLED now returns 422 instead of the
    // legacy 200 (idempotent no-op). No existing test covers that path.
    if (action === "cancel") {
      if (existing.status === "COMPLETED") {
        return NextResponse.json(
          { error: "Cannot cancel completed schedule" },
          { status: 400 }
        );
      }

      const reason =
        typeof body.reason === "string" ? body.reason : "";

      const user = await requireCurrentUser();
      const runtime = await createManifestRuntime({
        user: {
          id: user.id,
          tenantId: user.tenantId,
          role: user.role,
        },
        entityName: "RevenueRecognitionSchedule",
      });

      const result = await runtime.runCommand(
        "cancel",
        { reason },
        {
          entityName: "RevenueRecognitionSchedule",
          instanceId: id,
        }
      );

      if (!result.success) {
        if (result.policyDenial) {
          return NextResponse.json(
            {
              error: `Access denied: ${result.policyDenial.policyName} (role=${user.role})`,
            },
            { status: 403 }
          );
        }
        if (result.guardFailure) {
          return NextResponse.json(
            {
              error: `Guard ${result.guardFailure.index} failed: ${result.guardFailure.formatted}`,
            },
            { status: 422 }
          );
        }
        return NextResponse.json(
          { error: result.error ?? "Command failed" },
          { status: 400 }
        );
      }

      // Read-back to preserve the legacy `{ data: { ..., lines: [...] } }`
      // response shape — the runtime store does not include relations.
      const updated = await database.revenueRecognitionSchedule.findFirst({
        where: { tenantId, id },
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
    log.error("Error updating revenue recognition schedule:", error);
    return NextResponse.json(
      { error: "Failed to update revenue recognition schedule" },
      { status: 500 }
    );
  }
}
