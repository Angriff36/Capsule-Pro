import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import type { DayOfWeek, UpdateAvailabilityInput } from "../types";
import {
  checkOverlappingAvailability,
  validateDayOfWeek,
  validateEffectiveDates,
  validateTimeRange,
  verifyAvailability,
} from "../validation";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/staff/availability/[id]
 * Get a single availability record by ID
 */
export async function GET(_request: Request, context: RouteContext) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { id } = await context.params;

  const availability = await database.$queryRaw<
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
        AND ea.id = ${id}
        AND ea.deleted_at IS NULL
    `
  );

  if (!availability[0]) {
    return NextResponse.json(
      { message: "Availability record not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ availability: availability[0] });
}

/**
 * PATCH /api/staff/availability/[id]
 * Update an existing availability record
 *
 * Optional fields:
 * - dayOfWeek: New day of week (0-6)
 * - startTime: New start time in HH:MM format
 * - endTime: New end time in HH:MM format
 * - isAvailable: New availability status
 * - effectiveFrom: New effective from date (YYYY-MM-DD)
 * - effectiveUntil: New effective until date (YYYY-MM-DD or null)
 */
export async function PATCH(request: Request, context: RouteContext) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { id } = await context.params;
  const body = (await request.json()) as UpdateAvailabilityInput;

  // Verify availability exists
  const { availability: existingAvail, error: verifyError } =
    await verifyAvailability(tenantId, id);
  if (verifyError || !existingAvail) {
    return (
      verifyError ||
      NextResponse.json(
        { message: "Availability record not found" },
        { status: 404 }
      )
    );
  }

  // Validate provided fields
  if (body.dayOfWeek !== undefined) {
    const dayError = validateDayOfWeek(body.dayOfWeek);
    if (dayError) {
      return dayError;
    }
  }

  // Validate time range if both provided
  if (body.startTime && body.endTime) {
    const timeError = validateTimeRange(body.startTime, body.endTime);
    if (timeError) {
      return timeError;
    }
  }

  // Validate effective dates if both provided
  if (body.effectiveFrom || body.effectiveUntil !== undefined) {
    const effectiveFrom = body.effectiveFrom
      ? new Date(body.effectiveFrom)
      : new Date();
    effectiveFrom.setHours(0, 0, 0, 0);

    let effectiveUntil: Date | null;
    if (body.effectiveUntil) {
      effectiveUntil = new Date(body.effectiveUntil);
    } else if (existingAvail.effective_until) {
      effectiveUntil = new Date(existingAvail.effective_until);
    } else {
      effectiveUntil = null;
    }
    if (effectiveUntil) {
      effectiveUntil.setHours(0, 0, 0, 0);
    }

    const dateError = validateEffectiveDates(effectiveFrom, effectiveUntil);
    if (dateError) {
      return dateError;
    }
  }

  // Check for overlapping availability if day or time is changing
  const newDayOfWeek: DayOfWeek = (body.dayOfWeek ??
    existingAvail.day_of_week) as DayOfWeek;
  const _newStartTime = body.startTime ?? "00:00"; // Will be validated on overlap check
  const _newEndTime = body.endTime ?? "23:59";
  const _newEffectiveFrom = body.effectiveFrom
    ? new Date(body.effectiveFrom)
    : new Date();
  const _newEffectiveUntil = body.effectiveUntil
    ? new Date(body.effectiveUntil)
    : null;

  // Only check overlap if day/time is changing
  if (
    body.dayOfWeek !== undefined ||
    body.startTime !== undefined ||
    body.endTime !== undefined
  ) {
    // We need to get the existing record's actual time for proper overlap check
    const existingRecord = await database.$queryRaw<
      Array<{
        start_time: Date;
        end_time: Date;
        effective_from: Date;
        effective_until: Date | null;
      }>
    >(
      Prisma.sql`
        SELECT start_time, end_time, effective_from, effective_until
        FROM tenant_staff.employee_availability
        WHERE tenant_id = ${tenantId}
          AND id = ${id}
          AND deleted_at IS NULL
      `
    );

    if (existingRecord[0]) {
      const existingStart = existingRecord[0].start_time
        .toISOString()
        .substring(11, 16);
      const existingEnd = existingRecord[0].end_time
        .toISOString()
        .substring(11, 16);
      const checkStartTime = body.startTime ?? existingStart;
      const checkEndTime = body.endTime ?? existingEnd;
      const checkEffectiveFrom = body.effectiveFrom
        ? new Date(body.effectiveFrom)
        : existingRecord[0].effective_from;
      const checkEffectiveUntil = body.effectiveUntil
        ? new Date(body.effectiveUntil)
        : existingRecord[0].effective_until;

      const { hasOverlap, overlappingAvailability } =
        await checkOverlappingAvailability(
          tenantId,
          existingAvail.employee_id,
          newDayOfWeek,
          checkStartTime,
          checkEndTime,
          checkEffectiveFrom,
          checkEffectiveUntil,
          id // Exclude current record from overlap check
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
    }
  }

  try {
    // Build dynamic update query
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

    if (updateFields.length === 0) {
      return NextResponse.json(
        { message: "No fields to update" },
        { status: 400 }
      );
    }

    updateFields.push("updated_at = NOW()");
    updateValues.push(id, tenantId);

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

    if (!result[0]) {
      return NextResponse.json(
        { message: "Availability record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ availability: result[0] });
  } catch (error) {
    console.error("Error updating availability:", error);
    return NextResponse.json(
      { message: "Failed to update availability" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/staff/availability/[id]
 * Soft delete an availability record
 */
export async function DELETE(_request: Request, context: RouteContext) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { id } = await context.params;

  // Verify availability exists
  const { error: verifyError } = await verifyAvailability(tenantId, id);
  if (verifyError) {
    return verifyError;
  }

  try {
    const result = await database.$queryRaw<
      Array<{ id: string; deleted_at: Date }>
    >(
      Prisma.sql`
        UPDATE tenant_staff.employee_availability
        SET deleted_at = NOW()
        WHERE tenant_id = ${tenantId}
          AND id = ${id}
          AND deleted_at IS NULL
        RETURNING id, deleted_at
      `
    );

    if (!result[0]) {
      return NextResponse.json(
        { message: "Availability record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ deleted: result[0].id });
  } catch (error) {
    console.error("Error deleting availability:", error);
    return NextResponse.json(
      { message: "Failed to delete availability" },
      { status: 500 }
    );
  }
}
