Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const tenant_1 = require("@/app/lib/tenant");
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
async function GET(request) {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    return server_2.NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  const { searchParams } = new URL(request.url);
  const shiftStart = searchParams.get("shiftStart");
  const shiftEnd = searchParams.get("shiftEnd");
  const excludeShiftId = searchParams.get("excludeShiftId");
  const _locationId = searchParams.get("locationId");
  const requiredRole = searchParams.get("requiredRole");
  if (!(shiftStart && shiftEnd)) {
    return server_2.NextResponse.json(
      { message: "Shift start and end times are required" },
      { status: 400 }
    );
  }
  const startDate = new Date(shiftStart);
  const endDate = new Date(shiftEnd);
  // Validate shift end is after start
  if (endDate <= startDate) {
    return server_2.NextResponse.json(
      { message: "Shift end time must be after start time" },
      { status: 400 }
    );
  }
  try {
    const employees = await database_1.database.$queryRaw(database_1.Prisma.sql`
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
            ${excludeShiftId ? database_1.Prisma.sql`AND ss.id != ${excludeShiftId}` : database_1.Prisma.empty}
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
          ${requiredRole ? database_1.Prisma.sql`AND e.role = ${requiredRole}` : database_1.Prisma.empty}
        ORDER BY
          has_conflicting_shift ASC,
          e.last_name ASC,
          e.first_name ASC
      `);
    return server_2.NextResponse.json({
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
    return server_2.NextResponse.json(
      { message: "Failed to fetch available employees" },
      { status: 500 }
    );
  }
}
