import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import {
  getAssignmentSuggestionsForMultipleShifts,
  type ShiftRequirement,
} from "@/lib/staff/auto-assignment";

/**
 * POST /api/staff/shifts/bulk-assignment-suggestions
 *
 * Get assignment suggestions for multiple shifts at once.
 *
 * Body:
 * - shifts: Array of shift requirements
 *   - shiftId: string
 *   - locationId: string (optional)
 *   - requiredSkills: string[] (optional)
 */
export async function POST(request: Request) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);

  try {
    const body = await request.json();
    const { shifts } = body as { shifts: Array<{ shiftId: string; locationId?: string; requiredSkills?: string[] }> };

    if (!shifts || !Array.isArray(shifts)) {
      return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
    }

    // Get all shift details using raw query
    const shiftIds = shifts.map((s) => s.shiftId);
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

    // Build requirements
    const requirements: ShiftRequirement[] = shiftsFromDb.map((shift) => {
      const requestShift = shifts.find((s) => s.shiftId === shift.id);
      return {
        shiftId: shift.id,
        scheduleId: shift.schedule_id,
        locationId: requestShift?.locationId || shift.location_id || "",
        shiftStart: shift.shift_start,
        shiftEnd: shift.shift_end,
        roleDuringShift: shift.role_during_shift || undefined,
        requiredSkills: requestShift?.requiredSkills || [],
      };
    });

    const results = await getAssignmentSuggestionsForMultipleShifts(tenantId, requirements);

    return NextResponse.json({
      results,
      summary: {
        total: results.length,
        canAutoAssign: results.filter((r) => r.canAutoAssign).length,
        hasSuggestions: results.filter((r) => r.suggestions.length > 0).length,
        noSuggestions: results.filter((r) => r.suggestions.length === 0).length,
      },
    });
  } catch (error) {
    console.error("Error getting bulk assignment suggestions:", error);
    return NextResponse.json(
      { message: "Failed to get bulk assignment suggestions" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/staff/shifts/bulk-assignment-suggestions
 *
 * Get assignment suggestions for all open shifts (shifts without an assigned employee).
 *
 * Query params:
 * - scheduleId: Optional schedule ID to filter
 * - locationId: Optional location ID to filter
 * - startDate: Optional start date filter (ISO 8601)
 * - endDate: Optional end date filter (ISO 8601)
 */
export async function GET(request: Request) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { searchParams } = new URL(request.url);

  const scheduleId = searchParams.get("scheduleId");
  const locationId = searchParams.get("locationId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  try {
    // Get open shifts (shifts without assigned employees) using raw query
    const openShifts = await database.$queryRaw<
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
        AND deleted_at IS NULL
        AND employee_id IS NULL
        ${scheduleId ? Prisma.sql`AND schedule_id = ${scheduleId}` : Prisma.empty}
        ${locationId ? Prisma.sql`AND location_id = ${locationId}` : Prisma.empty}
        ${startDate ? Prisma.sql`AND shift_start >= ${new Date(startDate)}` : Prisma.empty}
        ${endDate ? Prisma.sql`AND shift_end <= ${new Date(endDate)}` : Prisma.empty}
      ORDER BY shift_start ASC
      LIMIT 50
    `);

    if (openShifts.length === 0) {
      return NextResponse.json({
        results: [],
        summary: {
          total: 0,
          canAutoAssign: 0,
          hasSuggestions: 0,
          noSuggestions: 0,
        },
      });
    }

    // Build requirements
    const requirements: ShiftRequirement[] = openShifts.map((shift) => ({
      shiftId: shift.id,
      scheduleId: shift.schedule_id,
      locationId: locationId || shift.location_id || "",
      shiftStart: shift.shift_start,
      shiftEnd: shift.shift_end,
      roleDuringShift: shift.role_during_shift || undefined,
    }));

    const results = await getAssignmentSuggestionsForMultipleShifts(tenantId, requirements);

    return NextResponse.json({
      results,
      summary: {
        total: results.length,
        canAutoAssign: results.filter((r) => r.canAutoAssign).length,
        hasSuggestions: results.filter((r) => r.suggestions.length > 0).length,
        noSuggestions: results.filter((r) => r.suggestions.length === 0).length,
      },
    });
  } catch (error) {
    console.error("Error getting open shifts suggestions:", error);
    return NextResponse.json(
      { message: "Failed to get open shifts suggestions" },
      { status: 500 }
    );
  }
}
