import { auth } from "@repo/auth/server";

import { NextResponse } from "next/server";

import { getTenantIdForOrg } from "@/app/lib/tenant";

import {
  type AssignmentResult,
  type BulkAssignmentRequest,
  buildSummary,
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
export async function POST(request: Request) {
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

    return NextResponse.json({
      results: sortedResults,
      summary,
    });
  } catch (error) {
    console.error("Error executing bulk assignment:", error);
    return NextResponse.json(
      {
        message: "Failed to execute bulk assignment",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
