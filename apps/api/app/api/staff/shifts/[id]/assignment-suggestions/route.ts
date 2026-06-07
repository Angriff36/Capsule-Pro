import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import type { ShiftRequirement } from "@/lib/staff/auto-assignment";
import {
  autoAssignShift,
  getEligibleEmployeesForShift,
} from "@/lib/staff/auto-assignment";

async function getShiftForAssignment(tenantId: string, shiftId: string) {
  return database.scheduleShift.findFirst({
    where: {
      tenantId,
      id: shiftId,
      deletedAt: null,
    },
    select: {
      id: true,
      scheduleId: true,
      locationId: true,
      shift_start: true,
      shift_end: true,
      role_during_shift: true,
      notes: true,
      employeeId: true,
    },
  });
}

/**
 * GET /api/staff/shifts/[shiftId]/assignment-suggestions
 *
 * Get assignment suggestions for a specific shift.
 *
 * Query params:
 * - locationId: The location ID (optional)
 * - requiredSkills: Comma-separated list of skill IDs (optional)
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { id: shiftId } = await params;
  const { searchParams } = new URL(request.url);

  const locationId = searchParams.get("locationId");
  const requiredSkillsParam = searchParams.get("requiredSkills");

  try {
    const shift = await getShiftForAssignment(tenantId, shiftId);

    if (!shift) {
      return NextResponse.json({ message: "Shift not found" }, { status: 404 });
    }

    const requirement: ShiftRequirement = {
      shiftId,
      scheduleId: shift.scheduleId,
      locationId: locationId || shift.locationId || "",
      shiftStart: shift.shift_start,
      shiftEnd: shift.shift_end,
      roleDuringShift: shift.role_during_shift || undefined,
      requiredSkills: requiredSkillsParam ? requiredSkillsParam.split(",") : [],
    };

    const result = await getEligibleEmployeesForShift(tenantId, requirement);

    return NextResponse.json(result);
  } catch (error) {
    captureException(error);
    log.error("Error getting assignment suggestions:", error);
    return NextResponse.json(
      { message: "Failed to get assignment suggestions" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/staff/shifts/[shiftId]/assignment-suggestions
 *
 * Auto-assign the best match employee to a shift.
 *
 * Body:
 * - employeeId: Optional specific employee ID to assign (if not provided, uses best match)
 * - force: Boolean to force assignment even with medium/low confidence
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { id: shiftId } = await params;

  try {
    const body = await request.json();
    const { employeeId, force = false } = body as {
      employeeId?: string;
      force?: boolean;
    };

    // Always verify the shift exists first.
    const shift = await getShiftForAssignment(tenantId, shiftId);

    if (!shift) {
      return NextResponse.json({ message: "Shift not found" }, { status: 404 });
    }

    // If employeeId provided, assign directly
    if (employeeId) {
      const result = await autoAssignShift(tenantId, shiftId, employeeId);
      if (result.success) {
        return NextResponse.json(result);
      }
      return NextResponse.json(result, { status: 400 });
    }

    // Otherwise, get suggestions and assign best match
    const requirement = {
      shiftId,
      scheduleId: shift.scheduleId,
      locationId: shift.locationId || "",
      shiftStart: shift.shift_start,
      shiftEnd: shift.shift_end,
      roleDuringShift: shift.role_during_shift || undefined,
    };

    const result = await getEligibleEmployeesForShift(tenantId, requirement);

    if (!(result.canAutoAssign || force)) {
      return NextResponse.json({
        message: "No high-confidence match found",
        result,
      });
    }

    if (result.bestMatch) {
      const assignResult = await autoAssignShift(
        tenantId,
        shiftId,
        result.bestMatch.employee.id
      );
      return NextResponse.json({
        ...assignResult,
        suggestion: result.bestMatch,
      });
    }

    return NextResponse.json(
      { message: "No eligible employees found", result },
      { status: 400 }
    );
  } catch (error) {
    captureException(error);
    log.error("Error auto-assigning shift:", error);
    return NextResponse.json(
      { message: "Failed to auto-assign shift" },
      { status: 500 }
    );
  }
}
