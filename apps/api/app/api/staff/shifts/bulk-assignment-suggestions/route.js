Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
exports.GET = GET;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const tenant_1 = require("@/app/lib/tenant");
const auto_assignment_1 = require("@/lib/staff/auto-assignment");
/**
 * POST /api/staff/shifts/bulk-assignment-suggestions
 *
 * Get assignment suggestions for multiple shifts at once.
 *
 * Body:
 * - shifts: Array of shift requirements
 *   - shiftId: string
 *   - locationId: string (optional)
 *   - requiredSkills: string[] (optional)
 */
async function POST(request) {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    return server_2.NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  try {
    const body = await request.json();
    const { shifts } = body;
    if (!(shifts && Array.isArray(shifts))) {
      return server_2.NextResponse.json(
        { message: "Invalid request body" },
        { status: 400 }
      );
    }
    // Handle empty shifts array
    if (shifts.length === 0) {
      return server_2.NextResponse.json({
        results: [],
        summary: {
          total: 0,
          canAutoAssign: 0,
          hasSuggestions: 0,
          noSuggestions: 0,
        },
      });
    }
    // Get all shift details using raw query
    const shiftIds = shifts.map((s) => s.shiftId);
    const shiftsFromDb = await database_1.database.$queryRaw(database_1.Prisma
      .sql`
      SELECT
        tenant_id,
        id,
        schedule_id,
        location_id,
        shift_start,
        shift_end,
        role_during_shift
      FROM tenant_staff.schedule_shifts
      WHERE tenant_id = ${tenantId}
        AND id = ANY(${shiftIds})
        AND deleted_at IS NULL
    `);
    // Build requirements
    const requirements = shiftsFromDb.map((shift) => {
      const requestShift = shifts.find((s) => s.shiftId === shift.id);
      return {
        shiftId: shift.id,
        scheduleId: shift.schedule_id,
        locationId: requestShift?.locationId || shift.location_id || "",
        shiftStart: shift.shift_start,
        shiftEnd: shift.shift_end,
        roleDuringShift: shift.role_during_shift || undefined,
        requiredSkills: requestShift?.requiredSkills || [],
      };
    });
    const results = await (0,
    auto_assignment_1.getAssignmentSuggestionsForMultipleShifts)(
      tenantId,
      requirements
    );
    return server_2.NextResponse.json({
      results,
      summary: {
        total: results.length,
        canAutoAssign: results.filter((r) => r.canAutoAssign).length,
        hasSuggestions: results.filter((r) => r.suggestions.length > 0).length,
        noSuggestions: results.filter((r) => r.suggestions.length === 0).length,
      },
    });
  } catch (error) {
    console.error("Error getting bulk assignment suggestions:", error);
    return server_2.NextResponse.json(
      { message: "Failed to get bulk assignment suggestions" },
      { status: 500 }
    );
  }
}
/**
 * GET /api/staff/shifts/bulk-assignment-suggestions
 *
 * Get assignment suggestions for all open shifts (shifts without an assigned employee).
 *
 * Query params:
 * - scheduleId: Optional schedule ID to filter
 * - locationId: Optional location ID to filter
 * - startDate: Optional start date filter (ISO 8601)
 * - endDate: Optional end date filter (ISO 8601)
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
  const scheduleId = searchParams.get("scheduleId");
  const locationId = searchParams.get("locationId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  try {
    // Get open shifts (shifts without assigned employees) using raw query
    const openShifts = await database_1.database.$queryRaw(database_1.Prisma
      .sql`
      SELECT
        tenant_id,
        id,
        schedule_id,
        location_id,
        shift_start,
        shift_end,
        role_during_shift
      FROM tenant_staff.schedule_shifts
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
        AND employee_id IS NULL
        ${scheduleId ? database_1.Prisma.sql`AND schedule_id = ${scheduleId}` : database_1.Prisma.empty}
        ${locationId ? database_1.Prisma.sql`AND location_id = ${locationId}` : database_1.Prisma.empty}
        ${startDate ? database_1.Prisma.sql`AND shift_start >= ${new Date(startDate)}` : database_1.Prisma.empty}
        ${endDate ? database_1.Prisma.sql`AND shift_end <= ${new Date(endDate)}` : database_1.Prisma.empty}
      ORDER BY shift_start ASC
      LIMIT 50
    `);
    if (openShifts.length === 0) {
      return server_2.NextResponse.json({
        results: [],
        summary: {
          total: 0,
          canAutoAssign: 0,
          hasSuggestions: 0,
          noSuggestions: 0,
        },
      });
    }
    // Build requirements
    const requirements = openShifts.map((shift) => ({
      shiftId: shift.id,
      scheduleId: shift.schedule_id,
      locationId: locationId || shift.location_id || "",
      shiftStart: shift.shift_start,
      shiftEnd: shift.shift_end,
      roleDuringShift: shift.role_during_shift || undefined,
    }));
    const results = await (0,
    auto_assignment_1.getAssignmentSuggestionsForMultipleShifts)(
      tenantId,
      requirements
    );
    return server_2.NextResponse.json({
      results,
      summary: {
        total: results.length,
        canAutoAssign: results.filter((r) => r.canAutoAssign).length,
        hasSuggestions: results.filter((r) => r.suggestions.length > 0).length,
        noSuggestions: results.filter((r) => r.suggestions.length === 0).length,
      },
    });
  } catch (error) {
    console.error("Error getting open shifts suggestions:", error);
    return server_2.NextResponse.json(
      { message: "Failed to get open shifts suggestions" },
      { status: 500 }
    );
  }
}
