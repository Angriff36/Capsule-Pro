Object.defineProperty(exports, "__esModule", { value: true });
exports.validateTimeFormat = validateTimeFormat;
exports.validateDayOfWeek = validateDayOfWeek;
exports.validateTimeRange = validateTimeRange;
exports.validateEffectiveDates = validateEffectiveDates;
exports.checkOverlappingAvailability = checkOverlappingAvailability;
exports.verifyEmployee = verifyEmployee;
exports.verifyAvailability = verifyAvailability;
exports.validateBatchAvailabilityInput = validateBatchAvailabilityInput;
const database_1 = require("@repo/database");
const server_1 = require("next/server");
/**
 * Validates time string in HH:MM format (24-hour)
 */
function validateTimeFormat(time) {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (!timeRegex.test(time)) {
    return server_1.NextResponse.json(
      {
        message: `Invalid time format: ${time}. Expected HH:MM format (24-hour)`,
      },
      { status: 400 }
    );
  }
  return null;
}
/**
 * Validates day of week (0-6, where 0=Sunday)
 */
function validateDayOfWeek(dayOfWeek) {
  if (dayOfWeek < 0 || dayOfWeek > 6 || !Number.isInteger(dayOfWeek)) {
    return server_1.NextResponse.json(
      {
        message: `Invalid day of week: ${dayOfWeek}. Must be 0-6 (0=Sunday, 6=Saturday)`,
      },
      { status: 400 }
    );
  }
  return null;
}
/**
 * Validates that end time is after start time
 */
function validateTimeRange(startTime, endTime) {
  const startError = validateTimeFormat(startTime);
  if (startError) return startError;
  const endError = validateTimeFormat(endTime);
  if (endError) return endError;
  if (endTime <= startTime) {
    return server_1.NextResponse.json(
      {
        message: `End time (${endTime}) must be after start time (${startTime})`,
      },
      { status: 400 }
    );
  }
  return null;
}
/**
 * Validates effective date range
 */
function validateEffectiveDates(effectiveFrom, effectiveUntil) {
  // Check for past dates (allow with warning but not before today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const effectiveFromDate = new Date(effectiveFrom);
  effectiveFromDate.setHours(0, 0, 0, 0);
  if (effectiveFromDate < today) {
    return server_1.NextResponse.json(
      { message: "Effective from date cannot be in the past" },
      { status: 400 }
    );
  }
  // If effectiveUntil is provided, it must be after effectiveFrom
  if (effectiveUntil) {
    const effectiveUntilDate = new Date(effectiveUntil);
    effectiveUntilDate.setHours(0, 0, 0, 0);
    if (effectiveUntilDate < effectiveFromDate) {
      return server_1.NextResponse.json(
        {
          message:
            "Effective until date must be on or after effective from date",
        },
        { status: 400 }
      );
    }
  }
  return null;
}
/**
 * Checks for overlapping availability periods for the same employee and day
 */
async function checkOverlappingAvailability(
  tenantId,
  employeeId,
  dayOfWeek,
  startTime,
  endTime,
  effectiveFrom,
  effectiveUntil,
  excludeAvailabilityId
) {
  // Check for overlapping time periods on the same day
  const overlappingAvailability = await database_1.database.$queryRaw(database_1
    .Prisma.sql`
      SELECT
        id,
        day_of_week,
        start_time::text as start_time,
        end_time::text as end_time,
        effective_from,
        effective_until
      FROM tenant_staff.employee_availability
      WHERE tenant_id = ${tenantId}
        AND employee_id = ${employeeId}
        AND day_of_week = ${dayOfWeek}
        AND deleted_at IS NULL
        ${excludeAvailabilityId ? database_1.Prisma.sql`AND id != ${excludeAvailabilityId}` : database_1.Prisma.empty}
        -- Check for date range overlap
        AND (
          -- New range overlaps with existing if:
          -- effective_from is before or on the existing effective_until (or no effective_until)
          AND (effective_until IS NULL OR effective_from <= ${effectiveUntil || effectiveFrom})
          AND (effective_until IS NULL OR ${effectiveFrom} <= effective_until)
        )
    `);
  // Filter for time overlap
  const timeOverlapping = overlappingAvailability.filter((avail) => {
    // Check if time ranges overlap
    const existingStart = avail.start_time.substring(0, 5);
    const existingEnd = avail.end_time.substring(0, 5);
    // Overlap exists if:
    // - New start time is before existing end time
    // - New end time is after existing start time
    return startTime < existingEnd && endTime > existingStart;
  });
  return {
    hasOverlap: timeOverlapping.length > 0,
    overlappingAvailability: timeOverlapping,
  };
}
/**
 * Verifies an employee exists and is active
 */
async function verifyEmployee(tenantId, employeeId) {
  const employee = await database_1.database.$queryRaw(database_1.Prisma.sql`
      SELECT id, role, is_active
      FROM tenant_staff.employees
      WHERE tenant_id = ${tenantId}
        AND id = ${employeeId}
        AND deleted_at IS NULL
    `);
  if (!employee[0]) {
    return {
      employee: null,
      error: server_1.NextResponse.json(
        { message: "Employee not found" },
        { status: 404 }
      ),
    };
  }
  if (!employee[0].is_active) {
    return {
      employee: null,
      error: server_1.NextResponse.json(
        { message: "Cannot set availability for inactive employee" },
        { status: 400 }
      ),
    };
  }
  return { employee: employee[0], error: null };
}
/**
 * Verifies an availability record exists
 */
async function verifyAvailability(tenantId, availabilityId) {
  const availability = await database_1.database.$queryRaw(database_1.Prisma
    .sql`
      SELECT id, employee_id, day_of_week, effective_until
      FROM tenant_staff.employee_availability
      WHERE tenant_id = ${tenantId}
        AND id = ${availabilityId}
        AND deleted_at IS NULL
    `);
  if (!availability[0]) {
    return {
      availability: null,
      error: server_1.NextResponse.json(
        { message: "Availability record not found" },
        { status: 404 }
      ),
    };
  }
  return { availability: availability[0], error: null };
}
/**
 * Validates batch availability input
 */
function validateBatchAvailabilityInput(patterns) {
  if (!patterns || patterns.length === 0) {
    return server_1.NextResponse.json(
      { message: "At least one availability pattern must be provided" },
      { status: 400 }
    );
  }
  // Check for duplicate days
  const days = patterns.map((p) => p.dayOfWeek);
  const uniqueDays = new Set(days);
  if (days.length !== uniqueDays.size) {
    return server_1.NextResponse.json(
      {
        message: "Cannot have multiple availability patterns for the same day",
      },
      { status: 400 }
    );
  }
  // Validate each pattern
  for (const pattern of patterns) {
    const dayError = validateDayOfWeek(pattern.dayOfWeek);
    if (dayError) return dayError;
    const timeError = validateTimeRange(pattern.startTime, pattern.endTime);
    if (timeError) return timeError;
  }
  return null;
}
