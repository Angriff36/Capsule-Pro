import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
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
    const employees = await database.$queryRaw<
      Array<{
        id: string;
        first_name: string | null;
        last_name: string | null;
        email: string;
        role: string;
        is_active: boolean;
        has_conflicting_shift: boolean;
        conflicting_shifts: Array<{
          id: string;
          shift_start: Date;
          shift_end: Date;
          location_name: string;
        }>;
      }>
    >(
      Prisma.sql`
        WITH employee_conflicts AS (
          SELECT DISTINCT
            ss.employee_id,
            jsonb_agg(
              jsonb_build_object(
                'id', ss.id,
                'shift_start', ss.shift_start,
                'shift_end', ss.shift_end,
                'location_name', l.name
              )
            ) AS conflicting_shifts
          FROM tenant_staff.schedule_shifts ss
          JOIN tenant.locations l ON l.tenant_id = ss.tenant_id AND l.id = ss.location_id
          WHERE ss.tenant_id = ${tenantId}
            AND ss.deleted_at IS NULL
            ${excludeShiftId ? Prisma.sql`AND ss.id != ${excludeShiftId}` : Prisma.empty}
            AND (ss.shift_start < ${endDate}) AND (ss.shift_end > ${startDate})
          GROUP BY ss.employee_id
        )
        SELECT
          e.id,
          e.first_name,
          e.last_name,
          e.email,
          e.role,
          e.is_active,
          COALESCE(ec.has_conflicting_shift, false) AS has_conflicting_shift,
          COALESCE(ec.conflicting_shifts, '[]'::jsonb) AS conflicting_shifts
        FROM tenant_staff.employees e
        LEFT JOIN (
          SELECT
            employee_id,
            true AS has_conflicting_shift,
            conflicting_shifts
          FROM employee_conflicts
        ) ec ON ec.employee_id = e.id
        WHERE e.tenant_id = ${tenantId}
          AND e.deleted_at IS NULL
          AND e.is_active = true
          ${requiredRole ? Prisma.sql`AND e.role = ${requiredRole}` : Prisma.empty}
        ORDER BY
          has_conflicting_shift ASC,
          e.last_name ASC,
          e.first_name ASC
      `
    );

    return NextResponse.json({
      employees: employees.map((e) => ({
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
    console.error("Error fetching available employees:", error);
    return NextResponse.json(
      { message: "Failed to fetch available employees" },
      { status: 500 }
    );
  }
}
