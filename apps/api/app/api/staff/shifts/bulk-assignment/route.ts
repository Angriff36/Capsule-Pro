import { auth } from "@repo/auth/server";
import { triggerShiftAssignedSms } from "@repo/notifications";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { dispatchWebhooks } from "@/app/lib/webhook-dispatch";
import { withRateLimit } from "@/middleware/rate-limiter";
import {
  type AssignmentResult,
  type BulkAssignmentRequest,
  buildSummary,
  fetchShiftsForAutoAssignment,
  processAutoAssignShifts,
  processPreSelectedShifts,
  separateShiftsByAssignmentType,
  sortResultsByInputOrder,
} from "./helpers";

/**
 * POST /api/staff/shifts/bulk-assignment
 *
 * Execute bulk auto-assignment for multiple shifts.
 * Gets suggestions and assigns the best match to each shift.
 *
 * Body:
 * - shifts: Array of shift assignments
 *   - shiftId: string (required)
 *   - employeeId: string | null (optional - if null, auto-assign best match)
 *   - requiredSkills: string[] (optional - for auto-assignment scoring)
 * - dryRun: boolean (optional - if true, don't actually assign, just return results)
 * - onlyHighConfidence: boolean (optional - default: true, only assign high confidence matches)
 *
 * Returns:
 * - results: Array of assignment results per shift
 * - summary: Overall statistics
 */
export const POST = withRateLimit(
  async (request: Request) => {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);

    try {
      const body = await request.json();
      const {
        shifts,
        dryRun = false,
        onlyHighConfidence = true,
      } = body as BulkAssignmentRequest;

      // Validate shifts array
      if (!Array.isArray(shifts)) {
        return NextResponse.json(
          { message: "Invalid request body: shifts array required" },
          { status: 400 }
        );
      }

      // Handle empty shifts array
      if (shifts.length === 0) {
        return NextResponse.json({
          results: [],
          summary: {
            total: 0,
            assigned: 0,
            skipped: 0,
            failed: 0,
          },
        });
      }

      // Limit batch size
      if (shifts.length > 100) {
        return NextResponse.json(
          { message: "Cannot process more than 100 shifts at once" },
          { status: 400 }
        );
      }

      // Separate shifts by assignment type
      const { shiftsPreSelected, shiftsToAutoAssign } =
        separateShiftsByAssignmentType(shifts);

      // Process shifts with pre-selected employees
      const preSelectedResults = await processPreSelectedShifts(
        tenantId,
        shiftsPreSelected,
        dryRun
      );

      // Process shifts needing auto-assignment
      const autoAssignResults = await processAutoAssignShifts(
        tenantId,
        shiftsToAutoAssign,
        onlyHighConfidence,
        dryRun
      );

      // Combine and sort results
      const allResults: AssignmentResult[] = [
        ...preSelectedResults,
        ...autoAssignResults,
      ];
      const sortedResults = sortResultsByInputOrder(allResults, shifts);

      // Build summary
      const summary = buildSummary(sortedResults, dryRun);

      // Fire-and-forget SMS triggers for successful non-dry-run assignments
      if (!dryRun) {
        const assigned = sortedResults.filter(
          (r) => r.success && !r.skipped && r.employeeId && r.shiftId
        );
        if (assigned.length > 0) {
          (async () => {
            try {
              const shiftIds = assigned.map((r) => r.shiftId);
              const shifts = await fetchShiftsForAutoAssignment(
                tenantId,
                shiftIds.map((id) => ({ shiftId: id }))
              );
              const shiftMap = new Map(shifts.map((s) => [s.id, s]));
              for (const result of assigned) {
                const shift = shiftMap.get(result.shiftId);
                if (shift && result.employeeId) {
                  triggerShiftAssignedSms({
                    tenantId,
                    shiftId: result.shiftId,
                    shiftDate: shift.shift_start.toISOString().slice(0, 10),
                    shiftStart: shift.shift_start.toISOString(),
                    shiftEnd: shift.shift_end.toISOString(),
                    employeeId: result.employeeId,
                    employeeName: result.employeeName ?? "",
                    stationName: shift.role_during_shift ?? undefined,
                  }).catch(() => {});
                }
              }
            } catch {
              // SMS trigger failures must not affect the response
            }
          })();
        }
      }

      // Fire-and-forget webhook dispatch for successful non-dry-run assignments
      if (!dryRun) {
        const assigned = sortedResults.filter(
          (r) => r.success && !r.skipped && r.shiftId
        );
        for (const result of assigned) {
          dispatchWebhooks({
            tenantId,
            entityType: "scheduleShift",
            entityId: result.shiftId,
            action: "updated",
            data: { shiftId: result.shiftId, employeeId: result.employeeId },
          }).catch(() => {});
        }
      }

      return NextResponse.json({
        results: sortedResults,
        summary,
      });
    } catch (error) {
      captureException(error);
      log.error("Error executing bulk assignment:", error);
      return NextResponse.json(
        {
          message: "Failed to execute bulk assignment",
          error: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      );
    }
  },
  { limit: 10, window: "1m" }
);
