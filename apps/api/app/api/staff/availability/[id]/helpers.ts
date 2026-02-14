/**
 * Helper functions for staff availability route handlers
 */

import { database, Prisma } from "@repo/database";
import { NextResponse } from "next/server";
import type { DayOfWeek, UpdateAvailabilityInput } from "../types";
import {
  checkOverlappingAvailability,
  validateDayOfWeek,
  validateEffectiveDates,
  validateTimeRange,
} from "../validation";

export interface ExistingAvailability {
  id: string;
  employee_id: string;
  day_of_week: number;
  effective_until: Date | null;
}

export interface ExistingAvailabilityRecord {
  start_time: Date;
  end_time: Date;
  effective_from: Date;
  effective_until: Date | null;
}

export interface EffectiveDateRange {
  effectiveFrom: Date;
  effectiveUntil: Date | null;
}

export interface OverlapCheckParams {
  startTime: string;
  endTime: string;
  effectiveFrom: Date;
  effectiveUntil: Date | null;
}

/**
 * Validates day of week field
 */
function validateDayOfWeekField(
  dayOfWeek: number | undefined
): NextResponse | null {
  if (dayOfWeek !== undefined) {
    return validateDayOfWeek(dayOfWeek);
  }
  return null;
}

/**
 * Validates time range fields
 */
function validateTimeRangeFields(
  startTime: string | undefined,
  endTime: string | undefined
): NextResponse | null {
  if (startTime && endTime) {
    return validateTimeRange(startTime, endTime);
  }
  return null;
}

/**
 * Builds effective date range from request body and existing data
 */
function buildEffectiveDateRange(
  body: UpdateAvailabilityInput,
  existing: ExistingAvailability
): EffectiveDateRange {
  const effectiveFrom = body.effectiveFrom
    ? new Date(body.effectiveFrom)
    : new Date();
  effectiveFrom.setHours(0, 0, 0, 0);

  let effectiveUntil: Date | null;
  if (body.effectiveUntil) {
    effectiveUntil = new Date(body.effectiveUntil);
  } else if (existing.effective_until) {
    effectiveUntil = new Date(existing.effective_until);
  } else {
    effectiveUntil = null;
  }

  if (effectiveUntil) {
    effectiveUntil.setHours(0, 0, 0, 0);
  }

  return { effectiveFrom, effectiveUntil };
}

/**
 * Validates effective date range
 */
function validateEffectiveDateRange(
  body: UpdateAvailabilityInput,
  existing: ExistingAvailability
): NextResponse | null {
  if (body.effectiveFrom || body.effectiveUntil !== undefined) {
    const { effectiveFrom, effectiveUntil } = buildEffectiveDateRange(
      body,
      existing
    );
    return validateEffectiveDates(effectiveFrom, effectiveUntil);
  }
  return null;
}

/**
 * Builds overlap check parameters from body and existing record
 */
function buildOverlapCheckParams(
  body: UpdateAvailabilityInput,
  existingRecord: ExistingAvailabilityRecord
): OverlapCheckParams {
  const existingStart = existingRecord.start_time
    .toISOString()
    .substring(11, 16);
  const existingEnd = existingRecord.end_time.toISOString().substring(11, 16);

  return {
    startTime: body.startTime ?? existingStart,
    endTime: body.endTime ?? existingEnd,
    effectiveFrom: body.effectiveFrom
      ? new Date(body.effectiveFrom)
      : existingRecord.effective_from,
    effectiveUntil: body.effectiveUntil
      ? new Date(body.effectiveUntil)
      : existingRecord.effective_until,
  };
}

/**
 * Checks for overlapping availability
 */
async function checkOverlap(
  tenantId: string,
  employeeId: string,
  newDayOfWeek: DayOfWeek,
  overlapParams: OverlapCheckParams,
  availabilityId: string
): Promise<NextResponse | null> {
  const { hasOverlap, overlappingAvailability } =
    await checkOverlappingAvailability(
      tenantId,
      employeeId,
      newDayOfWeek,
      overlapParams.startTime,
      overlapParams.endTime,
      overlapParams.effectiveFrom,
      overlapParams.effectiveUntil,
      availabilityId
    );

  if (hasOverlap) {
    return NextResponse.json(
      {
        message:
          "Update would create overlapping availability for this day and time",
        overlappingAvailability,
      },
      { status: 409 }
    );
  }

  return null;
}

/**
 * Validates availability update input
 */
export async function validateAvailabilityUpdate(
  body: UpdateAvailabilityInput,
  existing: ExistingAvailability,
  tenantId: string,
  availabilityId: string
): Promise<NextResponse | null> {
  // Validate day of week
  const dayError = validateDayOfWeekField(body.dayOfWeek);
  if (dayError) {
    return dayError;
  }

  // Validate time range
  const timeError = validateTimeRangeFields(body.startTime, body.endTime);
  if (timeError) {
    return timeError;
  }

  // Validate effective dates
  const dateError = validateEffectiveDateRange(body, existing);
  if (dateError) {
    return dateError;
  }

  // Check for overlapping availability if day or time is changing
  const newDayOfWeek: DayOfWeek = (body.dayOfWeek ??
    existing.day_of_week) as DayOfWeek;

  const isDayOrTimeChanging =
    body.dayOfWeek !== undefined ||
    body.startTime !== undefined ||
    body.endTime !== undefined;

  if (!isDayOrTimeChanging) {
    return null;
  }

  const existingRecord = await fetchExistingAvailabilityRecord(
    tenantId,
    availabilityId
  );

  if (!existingRecord) {
    return null;
  }

  const overlapParams = buildOverlapCheckParams(body, existingRecord);
  return checkOverlap(
    tenantId,
    existing.employee_id,
    newDayOfWeek,
    overlapParams,
    availabilityId
  );
}

/**
 * Fetches existing availability record details
 */
export async function fetchExistingAvailabilityRecord(
  tenantId: string,
  availabilityId: string
): Promise<ExistingAvailabilityRecord | null> {
  const result = await database.$queryRaw<ExistingAvailabilityRecord[]>(
    Prisma.sql`
      SELECT start_time, end_time, effective_from, effective_until
      FROM tenant_staff.employee_availability
      WHERE tenant_id = ${tenantId}
        AND id = ${availabilityId}
        AND deleted_at IS NULL
    `
  );

  return result[0] || null;
}

/**
 * Builds dynamic update query for availability
 */
export function buildAvailabilityUpdateQuery(body: UpdateAvailabilityInput): {
  fields: string[];
  values: (string | number | boolean | Date | null)[];
} {
  const updateFields: string[] = [];
  const updateValues: (string | number | boolean | Date | null)[] = [];

  if (body.dayOfWeek !== undefined) {
    updateFields.push(`day_of_week = $${updateValues.length + 1}`);
    updateValues.push(body.dayOfWeek);
  }

  if (
    (body.startTime !== undefined || body.endTime !== undefined) &&
    body.startTime !== undefined &&
    body.endTime !== undefined
  ) {
    const [startHour, startMinute] = body.startTime.split(":").map(Number);
    const [endHour, endMinute] = body.endTime.split(":").map(Number);

    const startTime = new Date();
    startTime.setHours(startHour, startMinute, 0, 0);

    const endTime = new Date();
    endTime.setHours(endHour, endMinute, 0, 0);

    updateFields.push(`start_time = $${updateValues.length + 1}`);
    updateValues.push(startTime.toISOString());

    updateFields.push(`end_time = $${updateValues.length + 1}`);
    updateValues.push(endTime.toISOString());
  }

  if (body.isAvailable !== undefined) {
    updateFields.push(`is_available = $${updateValues.length + 1}`);
    updateValues.push(body.isAvailable);
  }

  if (body.effectiveFrom !== undefined) {
    const effectiveFrom = new Date(body.effectiveFrom);
    effectiveFrom.setHours(0, 0, 0, 0);
    updateFields.push(`effective_from = $${updateValues.length + 1}`);
    updateValues.push(effectiveFrom.toISOString());
  }

  if (body.effectiveUntil !== undefined) {
    if (body.effectiveUntil === null) {
      updateFields.push("effective_until = NULL");
    } else {
      const effectiveUntil = new Date(body.effectiveUntil);
      effectiveUntil.setHours(0, 0, 0, 0);
      updateFields.push(`effective_until = $${updateValues.length + 1}`);
      updateValues.push(effectiveUntil.toISOString());
    }
  }

  return { fields: updateFields, values: updateValues };
}

/**
 * Executes raw SQL update for availability
 */
export async function updateAvailabilityRaw(
  tenantId: string,
  availabilityId: string,
  updateFields: string[],
  updateValues: (string | number | boolean | Date | null)[]
): Promise<boolean> {
  if (updateFields.length === 0) {
    return false;
  }

  updateFields.push("updated_at = NOW()");
  updateValues.push(availabilityId, tenantId);

  const result = await database.$queryRaw<
    Array<{ id: string; employee_id: string; day_of_week: number }>
  >(
    Prisma.raw(
      `UPDATE tenant_staff.employee_availability
       SET ${updateFields.join(", ")}
       WHERE id = $${updateValues.length - 1}
         AND tenant_id = $${updateValues.length}
         AND deleted_at IS NULL
       RETURNING id, employee_id, day_of_week`
    ),
    updateValues
  );

  return result[0] !== undefined;
}
