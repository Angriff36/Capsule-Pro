import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import {
  autoAssignShift,
  getAssignmentSuggestionsForMultipleShifts,
  type ShiftRequirement,
} from "@/lib/staff/auto-assignment";

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
    } = body as {
      shifts: Array<{
        shiftId: string;
        employeeId?: string | null;
        requiredSkills?: string[];
      }>;
      dryRun?: boolean;
      onlyHighConfidence?: boolean;
    };

    if (!(shifts && Array.isArray(shifts))) {
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

    // Separate shifts with pre-selected employees from those needing auto-assignment
    const shiftsPreSelected = shifts.filter((s) => s.employeeId);
    const shiftsToAutoAssign = shifts.filter((s) => !s.employeeId);

    const results: Array<{
      shiftId: string;
      success: boolean;
      message: string;
      employeeId?: string;
      employeeName?: string;
      confidence?: "high" | "medium" | "low";
      skipped: boolean;
    }> = [];

    // Process shifts with pre-selected employees
    for (const shiftAssignment of shiftsPreSelected) {
      const { shiftId, employeeId } = shiftAssignment;

      if (!employeeId) {
        results.push({
          shiftId,
          success: false,
          message: "No employee ID provided",
          skipped: true,
        });
        continue;
      }

      if (dryRun) {
        // In dry run mode, just validate the employee exists
        const employee = await database.$queryRaw<
          Array<{
            id: string;
            first_name: string | null;
            last_name: string | null;
          }>
        >(Prisma.sql`
          SELECT id, first_name, last_name
          FROM tenant_staff.employees
          WHERE tenant_id = ${tenantId}
            AND id = ${employeeId}
            AND deleted_at IS NULL
            AND is_active = true
        `);

        if (!employee || employee.length === 0) {
          results.push({
            shiftId,
            success: false,
            message: "Employee not found or inactive",
            skipped: true,
          });
        } else {
          results.push({
            shiftId,
            success: true,
            message: `[DRY RUN] Would assign ${employee[0].first_name} ${employee[0].last_name} to shift`,
            employeeId,
            employeeName: `${employee[0].first_name} ${employee[0].last_name}`,
            skipped: false,
          });
        }
        continue;
      }

      // Actually assign the pre-selected employee
      const assignResult = await autoAssignShift(tenantId, shiftId, employeeId);
      results.push({
        shiftId,
        success: assignResult.success,
        message: assignResult.message,
        employeeId,
        skipped: false,
      });
    }

    // Process shifts needing auto-assignment
    if (shiftsToAutoAssign.length > 0) {
      // Get shift details from database
      const shiftIds = shiftsToAutoAssign.map((s) => s.shiftId);
      const shiftsFromDb = await database.$queryRaw<
        Array<{
          tenant_id: string;
          id: string;
          schedule_id: string;
          location_id: string;
          shift_start: Date;
          shift_end: Date;
          role_during_shift: string | null;
        }>
      >(Prisma.sql`
        SELECT
          tenant_id,
          id,
          schedule_id,
          location_id,
          shift_start,
          shift_end,
          role_during_shift
        FROM tenant_staff.schedule_shifts
        WHERE tenant_id = ${tenantId}
          AND id = ANY(${shiftIds})
          AND deleted_at IS NULL
      `);

      // Build requirements for auto-assignment
      const requirements: ShiftRequirement[] = shiftsFromDb.map((shift) => {
        const requestShift = shiftsToAutoAssign.find(
          (s) => s.shiftId === shift.id
        );
        return {
          shiftId: shift.id,
          scheduleId: shift.schedule_id,
          locationId: shift.location_id,
          shiftStart: shift.shift_start,
          shiftEnd: shift.shift_end,
          roleDuringShift: shift.role_during_shift || undefined,
          requiredSkills: requestShift?.requiredSkills || [],
        };
      });

      // Get assignment suggestions
      const suggestions = await getAssignmentSuggestionsForMultipleShifts(
        tenantId,
        requirements
      );

      // Execute assignments based on suggestions
      for (const suggestion of suggestions) {
        const { shiftId, bestMatch, canAutoAssign, laborBudgetWarning } =
          suggestion;

        // Skip if no suggestions
        if (!bestMatch) {
          results.push({
            shiftId,
            success: false,
            message: "No eligible employees found for this shift",
            skipped: true,
          });
          continue;
        }

        // Skip if only high confidence and this isn't high confidence
        if (onlyHighConfidence && !canAutoAssign) {
          results.push({
            shiftId,
            success: false,
            message: `Best match confidence is ${bestMatch.confidence}, but only high confidence assignments are allowed`,
            employeeId: bestMatch.employee.id,
            employeeName: `${bestMatch.employee.firstName} ${bestMatch.employee.lastName}`,
            confidence: bestMatch.confidence,
            skipped: true,
          });
          continue;
        }

        // Skip if labor budget warning
        if (laborBudgetWarning) {
          results.push({
            shiftId,
            success: false,
            message: `Labor budget warning: ${laborBudgetWarning}`,
            employeeId: bestMatch.employee.id,
            employeeName: `${bestMatch.employee.firstName} ${bestMatch.employee.lastName}`,
            confidence: bestMatch.confidence,
            skipped: true,
          });
          continue;
        }

        // Dry run mode - just return what would be assigned
        if (dryRun) {
          results.push({
            shiftId,
            success: true,
            message: `[DRY RUN] Would assign ${bestMatch.employee.firstName} ${bestMatch.employee.lastName} (confidence: ${bestMatch.confidence}, score: ${bestMatch.score})`,
            employeeId: bestMatch.employee.id,
            employeeName: `${bestMatch.employee.firstName} ${bestMatch.employee.lastName}`,
            confidence: bestMatch.confidence,
            skipped: false,
          });
          continue;
        }

        // Actually assign the employee
        const assignResult = await autoAssignShift(
          tenantId,
          shiftId,
          bestMatch.employee.id
        );

        results.push({
          shiftId,
          success: assignResult.success,
          message: assignResult.success
            ? `Auto-assigned ${bestMatch.employee.firstName} ${bestMatch.employee.lastName} (confidence: ${bestMatch.confidence}, score: ${bestMatch.score})`
            : assignResult.message,
          employeeId: bestMatch.employee.id,
          employeeName: `${bestMatch.employee.firstName} ${bestMatch.employee.lastName}`,
          confidence: bestMatch.confidence,
          skipped: false,
        });
      }
    }

    // Sort results to match input order
    results.sort((a, b) => {
      const aIndex = shifts.findIndex((s) => s.shiftId === a.shiftId);
      const bIndex = shifts.findIndex((s) => s.shiftId === b.shiftId);
      return aIndex - bIndex;
    });

    // Calculate summary
    const summary = {
      total: results.length,
      assigned: results.filter((r) => r.success && !r.skipped).length,
      skipped: results.filter((r) => r.skipped).length,
      failed: results.filter((r) => !(r.success || r.skipped)).length,
      dryRun,
    };

    return NextResponse.json({
      results,
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
