Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const tenant_1 = require("@/app/lib/tenant");
const validation_1 = require("../validation");
/**
 * POST /api/staff/availability/batch
 * Create multiple availability records at once (for recurring weekly patterns)
 *
 * Required fields:
 * - employeeId: Employee to set availability for
 * - patterns: Array of availability patterns
 *   - dayOfWeek: Day of week (0-6)
 *   - startTime: Start time in HH:MM format
 *   - endTime: End time in HH:MM format
 *   - isAvailable: (optional) Whether available (defaults to true)
 *
 * Optional fields:
 * - effectiveFrom: Date when availability starts (YYYY-MM-DD, defaults to today)
 * - effectiveUntil: Date when availability ends (YYYY-MM-DD or null for ongoing)
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
  const body = await request.json();
  // Validate required fields
  if (!(body.employeeId && body.patterns && body.patterns.length > 0)) {
    return server_2.NextResponse.json(
      {
        message:
          "Employee ID and at least one availability pattern are required",
      },
      { status: 400 }
    );
  }
  // Validate batch input
  const batchError = (0, validation_1.validateBatchAvailabilityInput)(
    body.patterns
  );
  if (batchError) return batchError;
  // Set defaults for effective dates
  const effectiveFrom = body.effectiveFrom
    ? new Date(body.effectiveFrom)
    : new Date();
  effectiveFrom.setHours(0, 0, 0, 0);
  const effectiveUntil = body.effectiveUntil
    ? new Date(body.effectiveUntil)
    : null;
  if (effectiveUntil) {
    effectiveUntil.setHours(0, 0, 0, 0);
  }
  // Validate effective dates
  const dateError = (0, validation_1.validateEffectiveDates)(
    effectiveFrom,
    effectiveUntil
  );
  if (dateError) return dateError;
  // Verify employee exists and is active
  const { employee, error: employeeError } = await (0,
  validation_1.verifyEmployee)(tenantId, body.employeeId);
  if (employeeError) {
    return employeeError;
  }
  // Check for overlapping availability for each pattern
  const errors = [];
  for (const pattern of body.patterns) {
    const { hasOverlap, overlappingAvailability } = await (0,
    validation_1.checkOverlappingAvailability)(
      tenantId,
      body.employeeId,
      pattern.dayOfWeek,
      pattern.startTime,
      pattern.endTime,
      effectiveFrom,
      effectiveUntil
    );
    if (hasOverlap) {
      errors.push({
        pattern: {
          dayOfWeek: pattern.dayOfWeek,
          startTime: pattern.startTime,
          endTime: pattern.endTime,
        },
        error: "Overlapping availability exists for this day and time",
      });
    }
  }
  if (errors.length > 0) {
    return server_2.NextResponse.json(
      {
        message: "Some patterns have overlapping availability",
        errors,
      },
      { status: 409 }
    );
  }
  try {
    // Create all availability records in a transaction
    const results = await database_1.database.$transaction(
      body.patterns.map((pattern) => {
        const [startHour, startMinute] = pattern.startTime
          .split(":")
          .map(Number);
        const [endHour, endMinute] = pattern.endTime.split(":").map(Number);
        const startTime = new Date();
        startTime.setHours(startHour, startMinute, 0, 0);
        const endTime = new Date();
        endTime.setHours(endHour, endMinute, 0, 0);
        return database_1.database.$queryRaw(database_1.Prisma.sql`
            INSERT INTO tenant_staff.employee_availability (
              tenant_id,
              employee_id,
              day_of_week,
              start_time,
              end_time,
              is_available,
              effective_from,
              effective_until
            )
            VALUES (
              ${tenantId},
              ${body.employeeId},
              ${pattern.dayOfWeek},
              ${startTime}::time,
              ${endTime}::time,
              ${pattern.isAvailable ?? true},
              ${effectiveFrom}::date,
              ${effectiveUntil}::date
            )
            RETURNING id, employee_id, day_of_week, start_time, end_time, effective_from
          `);
      })
    );
    const createdRecords = results.flat();
    return server_2.NextResponse.json(
      {
        message: `Created ${createdRecords.length} availability records`,
        availability: createdRecords,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating batch availability:", error);
    return server_2.NextResponse.json(
      { message: "Failed to create availability records" },
      { status: 500 }
    );
  }
}
