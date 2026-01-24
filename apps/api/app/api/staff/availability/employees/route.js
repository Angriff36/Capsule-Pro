Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const tenant_1 = require("@/app/lib/tenant");
/**
 * GET /api/staff/availability/employees
 * Get employee availability for a date range (for scheduling)
 *
 * Query params:
 * - employeeIds: Comma-separated list of employee IDs to query (optional, returns all if omitted)
 * - startDate: Start date of range (YYYY-MM-DD, required)
 * - endDate: End date of range (YYYY-MM-DD, required)
 * - includeTimeOff: Also include time-off requests (true/false, default false)
 *
 * Returns availability for each day of the week for each employee,
 * along with any time-off requests that overlap the date range.
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
  const employeeIdsParam = searchParams.get("employeeIds");
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");
  const includeTimeOff = searchParams.get("includeTimeOff") === "true";
  // Validate required date parameters
  if (!(startDateParam && endDateParam)) {
    return server_2.NextResponse.json(
      { message: "Start date and end date are required" },
      { status: 400 }
    );
  }
  const startDate = new Date(startDateParam);
  const endDate = new Date(endDateParam);
  if (endDate < startDate) {
    return server_2.NextResponse.json(
      { message: "End date must be on or after start date" },
      { status: 400 }
    );
  }
  // Parse employee IDs if provided
  const employeeIds = employeeIdsParam
    ? employeeIdsParam.split(",").filter((id) => id.trim().length > 0)
    : undefined;
  try {
    // Get availability for employees
    const availabilityData = await database_1.database.$queryRaw(database_1
      .Prisma.sql`
        SELECT DISTINCT
          e.id as employee_id,
          e.first_name AS employee_first_name,
          e.last_name AS employee_last_name,
          e.email AS employee_email,
          e.role AS employee_role,
          COALESCE(ea.day_of_week, -1) as day_of_week,
          COALESCE(ea.start_time::text, '') as start_time,
          COALESCE(ea.end_time::text, '') as end_time,
          COALESCE(ea.is_available, false) as is_available
        FROM tenant_staff.employees e
        LEFT JOIN tenant_staff.employee_availability ea
          ON ea.tenant_id = e.tenant_id
         AND ea.employee_id = e.id
         AND ea.deleted_at IS NULL
         AND ea.effective_from <= ${endDate}::date
         AND (ea.effective_until IS NULL OR ea.effective_until >= ${startDate}::date)
        WHERE e.tenant_id = ${tenantId}
          AND e.deleted_at IS NULL
          AND e.is_active = true
          ${
            employeeIds && employeeIds.length > 0
              ? database_1.Prisma.sql`AND e.id = ANY(${employeeIds}::uuid[])`
              : database_1.Prisma.empty
          }
        ORDER BY e.id, ea.day_of_week, ea.start_time
      `);
    // Group availability by employee
    const employeeAvailability = new Map();
    for (const row of availabilityData) {
      if (!employeeAvailability.has(row.employee_id)) {
        employeeAvailability.set(row.employee_id, {
          employee_id: row.employee_id,
          employee_first_name: row.employee_first_name,
          employee_last_name: row.employee_last_name,
          employee_email: row.employee_email,
          employee_role: row.employee_role,
          availability: [],
        });
      }
      // Only add availability if day_of_week is not -1 (no availability set)
      if (row.day_of_week >= 0) {
        employeeAvailability.get(row.employee_id)?.availability.push({
          day_of_week: row.day_of_week,
          start_time: row.start_time,
          end_time: row.end_time,
          is_available: row.is_available,
        });
      }
    }
    let result = Array.from(employeeAvailability.values());
    // Include time-off requests if requested
    if (includeTimeOff) {
      const timeOffData = await database_1.database.$queryRaw(database_1.Prisma
        .sql`
          SELECT
            tor.employee_id,
            tor.id as time_off_id,
            tor.start_date,
            tor.end_date,
            tor.status,
            tor.request_type
          FROM tenant_staff.employee_time_off_requests tor
          WHERE tor.tenant_id = ${tenantId}
            AND tor.deleted_at IS NULL
            AND tor.status IN ('PENDING', 'APPROVED')
            AND tor.end_date >= ${startDate}::date
            AND tor.start_date <= ${endDate}::date
            ${
              employeeIds && employeeIds.length > 0
                ? database_1.Prisma
                    .sql`AND tor.employee_id = ANY(${employeeIds}::uuid[])`
                : database_1.Prisma.empty
            }
          ORDER BY tor.employee_id, tor.start_date
        `);
      // Group time-off requests by employee
      const timeOffByEmployee = new Map();
      for (const tor of timeOffData) {
        if (!timeOffByEmployee.has(tor.employee_id)) {
          timeOffByEmployee.set(tor.employee_id, []);
        }
        timeOffByEmployee.get(tor.employee_id)?.push({
          id: tor.time_off_id,
          start_date: tor.start_date,
          end_date: tor.end_date,
          status: tor.status,
          request_type: tor.request_type,
        });
      }
      // Attach time-off requests to result
      result = result.map((employee) => ({
        ...employee,
        time_off_requests: timeOffByEmployee.get(employee.employee_id) || [],
      }));
    }
    return server_2.NextResponse.json({ employees: result });
  } catch (error) {
    console.error("Error fetching employee availability:", error);
    return server_2.NextResponse.json(
      { message: "Failed to fetch employee availability" },
      { status: 500 }
    );
  }
}
