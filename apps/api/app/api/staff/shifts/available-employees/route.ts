import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
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

  // Validate shift end is after start
  if (endDate <= startDate) {
    return NextResponse.json(
      { message: "Shift end time must be after start time" },
      { status: 400 }
    );
  }

  try {
    const [employees, conflicts] = await Promise.all([
      database.user.findMany({
        where: {
          tenantId,
          deletedAt: null,
          isActive: true,
          ...(requiredRole ? { role: requiredRole } : {}),
        },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          isActive: true,
        },
      }),
      database.scheduleShift.findMany({
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
      }),
    ]);

    const locations = await database.location.findMany({
      where: {
        tenantId,
        id: { in: [...new Set(conflicts.map((shift) => shift.locationId))] },
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
      },
    });

    const locationNamesById = new Map(
      locations.map((location) => [location.id, location.name])
    );
    const conflictsByEmployeeId = new Map<
      string,
      Array<{
        id: string;
        shift_start: Date;
        shift_end: Date;
        location_name: string;
      }>
    >();

    for (const shift of conflicts) {
      const employeeConflicts =
        conflictsByEmployeeId.get(shift.employeeId) ?? [];
      employeeConflicts.push({
        id: shift.id,
        shift_start: shift.shift_start,
        shift_end: shift.shift_end,
        location_name: locationNamesById.get(shift.locationId) ?? "",
      });
      conflictsByEmployeeId.set(shift.employeeId, employeeConflicts);
    }

    const employeesWithConflicts = employees
      .map((employee) => {
        const conflictingShifts = conflictsByEmployeeId.get(employee.id) ?? [];
        return {
          id: employee.id,
          first_name: employee.firstName,
          last_name: employee.lastName,
          email: employee.email,
          role: employee.role,
          is_active: employee.isActive,
          has_conflicting_shift: conflictingShifts.length > 0,
          conflicting_shifts: conflictingShifts,
        };
      })
      .sort((a, b) => {
        if (a.has_conflicting_shift !== b.has_conflicting_shift) {
          return a.has_conflicting_shift ? 1 : -1;
        }
        return (
          (a.last_name ?? "").localeCompare(b.last_name ?? "") ||
          (a.first_name ?? "").localeCompare(b.first_name ?? "")
        );
      });

    return NextResponse.json({
      employees: employeesWithConflicts.map((e) => ({
        id: e.id,
        firstName: e.first_name,
        lastName: e.last_name,
        email: e.email,
        role: e.role,
        isActive: e.is_active,
        hasConflictingShift: e.has_conflicting_shift,
        conflictingShifts: e.conflicting_shifts,
      })),
    });
  } catch (error) {
    captureException(error);
    log.error("Error fetching available employees:", error);
    return NextResponse.json(
      { message: "Failed to fetch available employees" },
      { status: 500 }
    );
  }
}
