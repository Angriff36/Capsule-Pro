import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
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

  const [shifts, totalCount] = await Promise.all([
    database.$queryRaw<
      Array<{
        id: string;
        schedule_id: string;
        employee_id: string;
        employee_first_name: string | null;
        employee_last_name: string | null;
        employee_email: string;
        employee_role: string;
        location_id: string;
        location_name: string;
        shift_start: Date;
        shift_end: Date;
        role_during_shift: string | null;
        notes: string | null;
        created_at: Date;
        updated_at: Date;
      }>
    >(
      Prisma.sql`
        SELECT
          ss.id,
          ss.schedule_id,
          ss.employee_id,
          e.first_name AS employee_first_name,
          e.last_name AS employee_last_name,
          e.email AS employee_email,
          e.role AS employee_role,
          ss.location_id,
          l.name AS location_name,
          ss.shift_start,
          ss.shift_end,
          ss.role_during_shift,
          ss.notes,
          ss.created_at,
          ss.updated_at
        FROM tenant_staff.schedule_shifts ss
        JOIN tenant_staff.employees e
          ON e.tenant_id = ss.tenant_id
         AND e.id = ss.employee_id
        JOIN tenant.locations l
          ON l.tenant_id = ss.tenant_id
         AND l.id = ss.location_id
        WHERE ss.tenant_id = ${tenantId}
          AND ss.deleted_at IS NULL
          ${startDate ? Prisma.sql`AND ss.shift_start >= ${new Date(startDate)}` : Prisma.empty}
          ${endDate ? Prisma.sql`AND ss.shift_end <= ${new Date(endDate)}` : Prisma.empty}
          ${employeeId ? Prisma.sql`AND ss.employee_id = ${employeeId}` : Prisma.empty}
          ${locationId ? Prisma.sql`AND ss.location_id = ${locationId}` : Prisma.empty}
          ${role ? Prisma.sql`AND ss.role_during_shift = ${role}` : Prisma.empty}
        ORDER BY ss.shift_start ASC
        LIMIT ${limit}
        OFFSET ${offset}
      `
    ),
    database.$queryRaw<[{ count: bigint }]>(
      Prisma.sql`
        SELECT COUNT(*)::bigint
        FROM tenant_staff.schedule_shifts ss
        WHERE ss.tenant_id = ${tenantId}
          AND ss.deleted_at IS NULL
          ${startDate ? Prisma.sql`AND ss.shift_start >= ${new Date(startDate)}` : Prisma.empty}
          ${endDate ? Prisma.sql`AND ss.shift_end <= ${new Date(endDate)}` : Prisma.empty}
          ${employeeId ? Prisma.sql`AND ss.employee_id = ${employeeId}` : Prisma.empty}
          ${locationId ? Prisma.sql`AND ss.location_id = ${locationId}` : Prisma.empty}
          ${role ? Prisma.sql`AND ss.role_during_shift = ${role}` : Prisma.empty}
      `
    ),
  ]);

  return NextResponse.json({
    shifts,
    pagination: {
      page,
      limit,
      total: Number(totalCount[0].count),
      totalPages: Math.ceil(Number(totalCount[0].count) / limit),
    },
  });
}

/**
 * POST /api/staff/shifts
 * Create a new shift (manifest command)
 */
export async function POST(request: NextRequest) {
  console.log("[ScheduleShift/POST] Delegating to manifest create command");
  return executeManifestCommand(request, {
    entityName: "ScheduleShift",
    commandName: "create",
  });
}
