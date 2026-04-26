import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { executeManifestCommand } from "@/lib/manifest-command-handler";

/**
 * GET /api/staff/shifts
 * List shifts with optional filtering
 *
 * Query params:
 * - startDate: Filter shifts starting after this date
 * - endDate: Filter shifts ending before this date
 * - employeeId: Filter by assigned employee
 * - locationId: Filter by location
 * - role: Filter by role during shift
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 50)
 */
export async function GET(request: Request) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { searchParams } = new URL(request.url);

  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const employeeId = searchParams.get("employeeId");
  const locationId = searchParams.get("locationId");
  const role = searchParams.get("role");
  const page = Number.parseInt(searchParams.get("page") || "1", 10);
  const limit = Number.parseInt(searchParams.get("limit") || "50", 10);
  const offset = (page - 1) * limit;

  const where = {
    tenantId,
    deletedAt: null,
    ...(startDate ? { shift_start: { gte: new Date(startDate) } } : {}),
    ...(endDate ? { shift_end: { lte: new Date(endDate) } } : {}),
    ...(employeeId ? { employeeId } : {}),
    ...(locationId ? { locationId } : {}),
    ...(role ? { role_during_shift: role } : {}),
  };

  const [shifts, totalCount] = await Promise.all([
    database.scheduleShift.findMany({
      where,
      orderBy: { shift_start: "asc" },
      skip: offset,
      take: limit,
    }),
    database.scheduleShift.count({ where }),
  ]);

  // Fetch related employee and location data separately
  // (ScheduleShift has no relations to User or Location in the schema)
  const employeeIds = [...new Set(shifts.map((s) => s.employeeId))];
  const locationIds = [...new Set(shifts.map((s) => s.locationId))];

  const [employees, locations] = await Promise.all([
    employeeIds.length > 0
      ? database.user.findMany({
          where: { id: { in: employeeIds } },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        })
      : [],
    locationIds.length > 0
      ? database.location.findMany({
          where: { id: { in: locationIds } },
          select: { id: true, name: true },
        })
      : [],
  ]);

  const employeeMap = new Map(employees.map((e) => [e.id, e]));
  const locationMap = new Map(locations.map((l) => [l.id, l.name]));

  const enrichedShifts = shifts.map((shift) => {
    const employee = employeeMap.get(shift.employeeId);
    const locationName = locationMap.get(shift.locationId);
    return {
      id: shift.id,
      schedule_id: shift.scheduleId,
      employee_id: shift.employeeId,
      employee_first_name: employee?.firstName ?? null,
      employee_last_name: employee?.lastName ?? null,
      employee_email: employee?.email ?? "",
      employee_role: employee?.role ?? "",
      location_id: shift.locationId,
      location_name: locationName ?? "",
      shift_start: shift.shift_start,
      shift_end: shift.shift_end,
      role_during_shift: shift.role_during_shift,
      notes: shift.notes,
      created_at: shift.createdAt,
      updated_at: shift.updatedAt,
    };
  });

  return NextResponse.json({
    shifts: enrichedShifts,
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  });
}

/**
 * POST /api/staff/shifts
 * Create a new shift (manifest command)
 */
export function POST(request: NextRequest) {
  return executeManifestCommand(request, {
    entityName: "ScheduleShift",
    commandName: "create",
  });
}
