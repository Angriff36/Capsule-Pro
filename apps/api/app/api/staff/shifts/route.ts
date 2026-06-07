import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg, resolveCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";

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

  const [shiftRows, totalCount] = await Promise.all([
    database.scheduleShift.findMany({
      where,
      orderBy: { shift_start: "asc" },
      skip: offset,
      take: limit,
      select: {
        id: true,
        scheduleId: true,
        employeeId: true,
        locationId: true,
        shift_start: true,
        shift_end: true,
        role_during_shift: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    database.scheduleShift.count({ where }),
  ]);

  const [employees, locations] = await Promise.all([
    database.user.findMany({
      where: {
        tenantId,
        id: { in: [...new Set(shiftRows.map((shift) => shift.employeeId))] },
        deletedAt: null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
      },
    }),
    database.location.findMany({
      where: {
        tenantId,
        id: { in: [...new Set(shiftRows.map((shift) => shift.locationId))] },
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
      },
    }),
  ]);

  const employeesById = new Map(employees.map((employee) => [employee.id, employee]));
  const locationsById = new Map(locations.map((location) => [location.id, location]));
  const shifts = shiftRows.map((shift) => {
    const employee = employeesById.get(shift.employeeId);
    const location = locationsById.get(shift.locationId);
    return {
      id: shift.id,
      schedule_id: shift.scheduleId,
      employee_id: shift.employeeId,
      employee_first_name: employee?.firstName ?? null,
      employee_last_name: employee?.lastName ?? null,
      employee_email: employee?.email ?? "",
      employee_role: employee?.role ?? "",
      location_id: shift.locationId,
      location_name: location?.name ?? "",
      shift_start: shift.shift_start,
      shift_end: shift.shift_end,
      role_during_shift: shift.role_during_shift,
      notes: shift.notes,
      created_at: shift.createdAt,
      updated_at: shift.updatedAt,
    };
  });

  return NextResponse.json({
    shifts,
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
export async function POST(request: NextRequest) {
  log.info("[ScheduleShift/POST] Delegating to manifest create command");
  const user = await resolveCurrentUser(request);
  const rawBody = await request.json().catch(() => ({})) as Record<string, unknown>;

  return runManifestCommand({
    entity: "ScheduleShift",
    command: "create",
    body: rawBody,
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });
}
