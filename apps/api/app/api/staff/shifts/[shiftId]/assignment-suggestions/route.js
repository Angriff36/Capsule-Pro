Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const tenant_1 = require("@/app/lib/tenant");
const auto_assignment_1 = require("@/lib/staff/auto-assignment");
/**
 * GET /api/staff/shifts/[shiftId]/assignment-suggestions
 *
 * Get assignment suggestions for a specific shift.
 *
 * Query params:
 * - locationId: The location ID (optional)
 * - requiredSkills: Comma-separated list of skill IDs (optional)
 */
async function GET(request, { params }) {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    return server_2.NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  const { shiftId } = await params;
  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get("locationId");
  const requiredSkillsParam = searchParams.get("requiredSkills");
  try {
    // Get the shift details - use raw query to avoid type issues
    const shift = await database_1.database.$queryRaw(database_1.Prisma.sql`
      SELECT
        tenant_id,
        id,
        schedule_id,
        location_id,
        shift_start,
        shift_end,
        role_during_shift,
        notes,
        employee_id
      FROM tenant_staff.schedule_shifts
      WHERE tenant_id = ${tenantId}
        AND id = ${shiftId}
        AND deleted_at IS NULL
    `);
    if (!shift || shift.length === 0) {
      return server_2.NextResponse.json(
        { message: "Shift not found" },
        { status: 404 }
      );
    }
    const shiftData = shift[0];
    const requirement = {
      shiftId,
      scheduleId: shiftData.schedule_id,
      locationId: locationId || shiftData.location_id || "",
      shiftStart: shiftData.shift_start,
      shiftEnd: shiftData.shift_end,
      roleDuringShift: shiftData.role_during_shift || undefined,
      requiredSkills: requiredSkillsParam ? requiredSkillsParam.split(",") : [],
    };
    const result = await (0, auto_assignment_1.getEligibleEmployeesForShift)(
      tenantId,
      requirement
    );
    return server_2.NextResponse.json(result);
  } catch (error) {
    console.error("Error getting assignment suggestions:", error);
    return server_2.NextResponse.json(
      { message: "Failed to get assignment suggestions" },
      { status: 500 }
    );
  }
}
/**
 * POST /api/staff/shifts/[shiftId]/assignment-suggestions
 *
 * Auto-assign the best match employee to a shift.
 *
 * Body:
 * - employeeId: Optional specific employee ID to assign (if not provided, uses best match)
 * - force: Boolean to force assignment even with medium/low confidence
 */
async function POST(request, { params }) {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    return server_2.NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  const { shiftId } = await params;
  try {
    const body = await request.json();
    const { employeeId, force = false } = body;
    // Always verify the shift exists first
    const shift = await database_1.database.$queryRaw(database_1.Prisma.sql`
      SELECT
        tenant_id,
        id,
        schedule_id,
        location_id,
        shift_start,
        shift_end,
        role_during_shift,
        notes,
        employee_id
      FROM tenant_staff.schedule_shifts
      WHERE tenant_id = ${tenantId}
        AND id = ${shiftId}
        AND deleted_at IS NULL
    `);
    if (!shift || shift.length === 0) {
      return server_2.NextResponse.json(
        { message: "Shift not found" },
        { status: 404 }
      );
    }
    const shiftData = shift[0];
    // If employeeId provided, assign directly
    if (employeeId) {
      const result = await (0, auto_assignment_1.autoAssignShift)(
        tenantId,
        shiftId,
        employeeId
      );
      if (result.success) {
        return server_2.NextResponse.json(result);
      }
      return server_2.NextResponse.json(result, { status: 400 });
    }
    // Otherwise, get suggestions and assign best match
    const requirement = {
      shiftId,
      scheduleId: shiftData.schedule_id,
      locationId: shiftData.location_id || "",
      shiftStart: shiftData.shift_start,
      shiftEnd: shiftData.shift_end,
      roleDuringShift: shiftData.role_during_shift || undefined,
    };
    const result = await (0, auto_assignment_1.getEligibleEmployeesForShift)(
      tenantId,
      requirement
    );
    if (!(result.canAutoAssign || force)) {
      return server_2.NextResponse.json({
        message: "No high-confidence match found",
        result,
      });
    }
    if (result.bestMatch) {
      const assignResult = await (0, auto_assignment_1.autoAssignShift)(
        tenantId,
        shiftId,
        result.bestMatch.employee.id
      );
      return server_2.NextResponse.json({
        ...assignResult,
        suggestion: result.bestMatch,
      });
    }
    return server_2.NextResponse.json(
      { message: "No eligible employees found", result },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error auto-assigning shift:", error);
    return server_2.NextResponse.json(
      { message: "Failed to auto-assign shift" },
      { status: 500 }
    );
  }
}
