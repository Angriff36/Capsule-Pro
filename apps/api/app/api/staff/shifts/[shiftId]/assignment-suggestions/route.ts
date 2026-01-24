import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { Prisma } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import {
  getEligibleEmployeesForShift,
  autoAssignShift,
} from "@/lib/staff/auto-assignment";
import type { ShiftRequirement } from "@/lib/staff/auto-assignment";

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
  { params }: { params: Promise<{ shiftId: string }> }
) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { shiftId } = await params;
  const { searchParams } = new URL(request.url);

  const locationId = searchParams.get("locationId");
  const requiredSkillsParam = searchParams.get("requiredSkills");

  try {
    // Get the shift details - use raw query to avoid type issues
    const shift = await database.$queryRaw<
      Array<{
        tenant_id: string;
        id: string;
        schedule_id: string;
        location_id: string;
        shift_start: Date;
        shift_end: Date;
        role_during_shift: string | null;
        notes: string | null;
        employee_id: string | null;
      }>
    >(Prisma.sql`
      SELECT
        tenant_id,
        id,
        schedule_id,
        location_id,
        shift_start,
        shift_end,
        role_during_shift,
        notes,
        employee_id
      FROM tenant_staff.schedule_shifts
      WHERE tenant_id = ${tenantId}
        AND id = ${shiftId}
        AND deleted_at IS NULL
    `);

    if (!shift || shift.length === 0) {
      return NextResponse.json({ message: "Shift not found" }, { status: 404 });
    }

    const shiftData = shift[0];
    const requirement: ShiftRequirement = {
      shiftId,
      scheduleId: shiftData.schedule_id,
      locationId: locationId || shiftData.location_id || "",
      shiftStart: shiftData.shift_start,
      shiftEnd: shiftData.shift_end,
      roleDuringShift: shiftData.role_during_shift || undefined,
      requiredSkills: requiredSkillsParam ? requiredSkillsParam.split(",") : [],
    };

    const result = await getEligibleEmployeesForShift(tenantId, requirement);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error getting assignment suggestions:", error);
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
  { params }: { params: Promise<{ shiftId: string }> }
) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { shiftId } = await params;

  try {
    const body = await request.json();
    const { employeeId, force = false } = body as { employeeId?: string; force?: boolean };

    // Get the shift details
    const shift = await database.$queryRaw<
      Array<{
        tenant_id: string;
        id: string;
        schedule_id: string;
        location_id: string;
        shift_start: Date;
        shift_end: Date;
        role_during_shift: string | null;
        notes: string | null;
        employee_id: string | null;
      }>
    >(Prisma.sql`
      SELECT
        tenant_id,
        id,
        schedule_id,
        location_id,
        shift_start,
        shift_end,
        role_during_shift,
        notes,
        employee_id
      FROM tenant_staff.schedule_shifts
      WHERE tenant_id = ${tenantId}
        AND id = ${shiftId}
        AND deleted_at IS NULL
    `);

    if (!shift || shift.length === 0) {
      return NextResponse.json({ message: "Shift not found" }, { status: 404 });
    }

    const shiftData = shift[0];

    // If employeeId provided, assign directly
    if (employeeId) {
      const result = await autoAssignShift(tenantId, shiftId, employeeId);
      if (result.success) {
        return NextResponse.json(result);
      } else {
        return NextResponse.json(result, { status: 400 });
      }
    }

    // Otherwise, get suggestions and assign best match
    const requirement = {
      shiftId,
      scheduleId: shiftData.schedule_id,
      locationId: shiftData.location_id || "",
      shiftStart: shiftData.shift_start,
      shiftEnd: shiftData.shift_end,
      roleDuringShift: shiftData.role_during_shift || undefined,
    };

    const result = await getEligibleEmployeesForShift(tenantId, requirement);

    if (!result.canAutoAssign && !force) {
      return NextResponse.json({
        message: "No high-confidence match found",
        result,
      });
    }

    if (result.bestMatch) {
      const assignResult = await autoAssignShift(tenantId, shiftId, result.bestMatch.employee.id);
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
    console.error("Error auto-assigning shift:", error);
    return NextResponse.json(
      { message: "Failed to auto-assign shift" },
      { status: 500 }
    );
  }
}
