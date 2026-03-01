import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { executeManifestCommand } from "@/lib/manifest-command-handler";
import type { AvailabilityListResponse } from "./types";
import { validateDayOfWeek } from "./validation";

export const runtime = "nodejs";

/**
 * GET /api/staff/availability
 * List employee availability with optional filtering
 *
 * Query params:
 * - employeeId: Filter by employee
 * - dayOfWeek: Filter by day of week (0-6)
 * - effectiveDate: Filter availability effective on this date (YYYY-MM-DD)
 * - isActive: Filter currently active availability (true) or all (false/omitted)
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

  const employeeId = searchParams.get("employeeId");
  const dayOfWeekParam = searchParams.get("dayOfWeek");
  const effectiveDateParam = searchParams.get("effectiveDate");
  const isActiveParam = searchParams.get("isActive");
  const page = Number.parseInt(searchParams.get("page") || "1", 10);
  const limit = Number.parseInt(searchParams.get("limit") || "50", 10);
  const offset = (page - 1) * limit;

  // Build query conditions
  const dayOfWeek = dayOfWeekParam ? Number.parseInt(dayOfWeekParam, 10) : null;
  const effectiveDate = effectiveDateParam
    ? new Date(effectiveDateParam)
    : null;
  const isActive = isActiveParam === "true";

  // Validate day of week if provided
  if (dayOfWeek !== null) {
    const dayError = validateDayOfWeek(dayOfWeek);
    if (dayError) {
      return dayError;
    }
  }

  const [availability, totalCount] = await Promise.all([
    database.$queryRaw<
      Array<{
        id: string;
        tenant_id: string;
        employee_id: string;
        employee_first_name: string | null;
        employee_last_name: string | null;
        employee_email: string;
        employee_role: string;
        day_of_week: number;
        start_time: string;
        end_time: string;
        is_available: boolean;
        effective_from: Date;
        effective_until: Date | null;
        created_at: Date;
        updated_at: Date;
      }>
    >(
      Prisma.sql`
        SELECT
          ea.id,
          ea.tenant_id,
          ea.employee_id,
          e.first_name AS employee_first_name,
          e.last_name AS employee_last_name,
          e.email AS employee_email,
          e.role AS employee_role,
          ea.day_of_week,
          ea.start_time::text as start_time,
          ea.end_time::text as end_time,
          ea.is_available,
          ea.effective_from,
          ea.effective_until,
          ea.created_at,
          ea.updated_at
        FROM tenant_staff.employee_availability ea
        JOIN tenant_staff.employees e
          ON e.tenant_id = ea.tenant_id
         AND e.id = ea.employee_id
        WHERE ea.tenant_id = ${tenantId}
          AND ea.deleted_at IS NULL
          ${employeeId ? Prisma.sql`AND ea.employee_id = ${employeeId}` : Prisma.empty}
          ${dayOfWeek !== null ? Prisma.sql`AND ea.day_of_week = ${dayOfWeek}` : Prisma.empty}
          ${
            effectiveDate
              ? Prisma.sql`
                  AND ea.effective_from <= ${effectiveDate}
                  AND (ea.effective_until IS NULL OR ea.effective_until >= ${effectiveDate})
                `
              : Prisma.empty
          }
          ${
            isActive
              ? Prisma.sql`
                  AND ea.effective_from <= CURRENT_DATE
                  AND (ea.effective_until IS NULL OR ea.effective_until >= CURRENT_DATE)
                `
              : Prisma.empty
          }
        ORDER BY ea.employee_id, ea.day_of_week, ea.start_time
        LIMIT ${limit}
        OFFSET ${offset}
      `
    ),
    database.$queryRaw<[{ count: bigint }]>(
      Prisma.sql`
        SELECT COUNT(*)::bigint
        FROM tenant_staff.employee_availability ea
        WHERE ea.tenant_id = ${tenantId}
          AND ea.deleted_at IS NULL
          ${employeeId ? Prisma.sql`AND ea.employee_id = ${employeeId}` : Prisma.empty}
          ${dayOfWeek !== null ? Prisma.sql`AND ea.day_of_week = ${dayOfWeek}` : Prisma.empty}
          ${
            effectiveDate
              ? Prisma.sql`
                  AND ea.effective_from <= ${effectiveDate}
                  AND (ea.effective_until IS NULL OR ea.effective_until >= ${effectiveDate})
                `
              : Prisma.empty
          }
          ${
            isActive
              ? Prisma.sql`
                  AND ea.effective_from <= CURRENT_DATE
                  AND (ea.effective_until IS NULL OR ea.effective_until >= CURRENT_DATE)
                `
              : Prisma.empty
          }
      `
    ),
  ]);

  const response: AvailabilityListResponse = {
    availability,
    pagination: {
      page,
      limit,
      total: Number(totalCount[0].count),
      totalPages: Math.ceil(Number(totalCount[0].count) / limit),
    },
  };

  return NextResponse.json(response);
}

/**
 * POST /api/staff/availability
 * Create a new availability record via manifest command
 */
export function POST(request: NextRequest) {
  return executeManifestCommand(request, {
    entityName: "EmployeeAvailability",
    commandName: "create",
    transformBody: (body) => ({
      employeeId: body.employeeId || body.employee_id,
      dayOfWeek: body.dayOfWeek ?? body.day_of_week,
      startTime: body.startTime || body.start_time,
      endTime: body.endTime || body.end_time,
      isAvailable: body.isAvailable ?? body.is_available ?? true,
      effectiveFrom: body.effectiveFrom || body.effective_from || "",
      effectiveUntil: body.effectiveUntil || body.effective_until || "",
    }),
  });
}
