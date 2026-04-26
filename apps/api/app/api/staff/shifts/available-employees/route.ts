import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

/**
 * GET /api/staff/shifts/available-employees
 * Get employees available for a shift (not already assigned during the same time)
 *
 * Query params:
 * - shiftStart: Shift start time (ISO 8601) - required
 * - shiftEnd: Shift end time (ISO 8601) - required
 * - excludeShiftId: Exclude this shift from conflict check (for updates)
 * - locationId: Filter by location
 * - requiredRole: Filter by required role
 */
export async function GET(request: Request) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { searchParams } = new URL(request.url);

  const shiftStart = searchParams.get("shiftStart");
  const shiftEnd = searchParams.get("shiftEnd");
  const excludeShiftId = searchParams.get("excludeShiftId");
  const _locationId = searchParams.get("locationId");
  const requiredRole = searchParams.get("requiredRole");

  if (!(shiftStart && shiftEnd)) {
    return NextResponse.json(
      { message: "Shift start and end times are required" },
      { status: 400 }
    );
  }

  const startDate = new Date(shiftStart);
  const endDate = new Date(shiftEnd);

  if (endDate <= startDate) {
    return NextResponse.json(
      { message: "Shift end time must be after start time" },
      { status: 400 }
    );
  }

  try {
    // Step 1: Find conflicting shifts in the time range
    const conflictingShifts = await database.scheduleShift.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(excludeShiftId ? { id: { not: excludeShiftId } } : {}),
        shift_start: { lt: endDate },
        shift_end: { gt: startDate },
      },
      select: {
        id: true,
        employeeId: true,
        locationId: true,
        shift_start: true,
        shift_end: true,
      },
    });

    // Step 2: Get location names for conflicting shifts
    const conflictLocationIds = [
      ...new Set(conflictingShifts.map((s) => s.locationId)),
    ];
    const conflictLocations =
      conflictLocationIds.length > 0
        ? await database.location.findMany({
            where: { id: { in: conflictLocationIds } },
            select: { id: true, name: true },
          })
        : [];
    const locationMap = new Map(conflictLocations.map((l) => [l.id, l.name]));

    // Step 3: Group conflicts by employee
    const conflictsByEmployee = new Map<
      string,
      Array<{
        id: string;
        shift_start: Date;
        shift_end: Date;
        location_name: string;
      }>
    >();
    for (const shift of conflictingShifts) {
      const conflicts = conflictsByEmployee.get(shift.employeeId) ?? [];
      conflicts.push({
        id: shift.id,
        shift_start: shift.shift_start,
        shift_end: shift.shift_end,
        location_name: locationMap.get(shift.locationId) ?? "Unknown",
      });
      conflictsByEmployee.set(shift.employeeId, conflicts);
    }

    // Step 4: Get all active employees
    const employees = await database.user.findMany({
      where: {
        tenantId,
        deletedAt: null,
        isActive: true,
        ...(requiredRole ? { role: requiredRole } : {}),
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    // Step 5: Merge and sort (non-conflicting first)
    const result = employees
      .map((emp) => ({
        id: emp.id,
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        role: emp.role,
        isActive: emp.isActive,
        hasConflictingShift: conflictsByEmployee.has(emp.id),
        conflictingShifts: conflictsByEmployee.get(emp.id) ?? [],
      }))
      .sort((a, b) => {
        if (a.hasConflictingShift !== b.hasConflictingShift) {
          return a.hasConflictingShift ? 1 : -1;
        }
        return (
          (a.lastName ?? "").localeCompare(b.lastName ?? "") ||
          (a.firstName ?? "").localeCompare(b.firstName ?? "")
        );
      });

    return NextResponse.json({ employees: result });
  } catch (error) {
    captureException(error);
    console.error("Error fetching available employees:", error);
    return NextResponse.json(
      { message: "Failed to fetch available employees" },
      { status: 500 }
    );
  }
}
