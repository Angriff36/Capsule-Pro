import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import type { CreateBatchAvailabilityInput } from "../types";
import {
  checkOverlappingAvailability,
  validateBatchAvailabilityInput,
  validateEffectiveDates,
  verifyEmployee,
} from "../validation";

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
export async function POST(request: Request) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const body = (await request.json()) as CreateBatchAvailabilityInput;

  // Validate required fields
  if (!(body.employeeId && body.patterns && body.patterns.length > 0)) {
    return NextResponse.json(
      {
        message:
          "Employee ID and at least one availability pattern are required",
      },
      { status: 400 }
    );
  }

  // Validate batch input
  const batchError = validateBatchAvailabilityInput(body.patterns);
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
  const dateError = validateEffectiveDates(effectiveFrom, effectiveUntil);
  if (dateError) return dateError;

  // Verify employee exists and is active
  const { employee, error: employeeError } = await verifyEmployee(
    tenantId,
    body.employeeId
  );
  if (employeeError) {
    return employeeError;
  }

  // Check for overlapping availability for each pattern
  const errors: Array<{
    pattern: { dayOfWeek: number; startTime: string; endTime: string };
    error: string;
  }> = [];

  for (const pattern of body.patterns) {
    const { hasOverlap, overlappingAvailability } =
      await checkOverlappingAvailability(
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
    return NextResponse.json(
      {
        message: "Some patterns have overlapping availability",
        errors,
      },
      { status: 409 }
    );
  }

  try {
    // Create all availability records in a transaction
    const results = await database.$transaction(
      body.patterns.map((pattern) => {
        const [startHour, startMinute] = pattern.startTime
          .split(":")
          .map(Number);
        const [endHour, endMinute] = pattern.endTime.split(":").map(Number);

        const startTime = new Date();
        startTime.setHours(startHour, startMinute, 0, 0);

        const endTime = new Date();
        endTime.setHours(endHour, endMinute, 0, 0);

        return database.$queryRaw<
          Array<{
            id: string;
            employee_id: string;
            day_of_week: number;
            start_time: Date;
            end_time: Date;
            effective_from: Date;
          }>
        >(
          Prisma.sql`
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
          `
        );
      })
    );

    const createdRecords = results.flat();

    return NextResponse.json(
      {
        message: `Created ${createdRecords.length} availability records`,
        availability: createdRecords,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating batch availability:", error);
    return NextResponse.json(
      { message: "Failed to create availability records" },
      { status: 500 }
    );
  }
}
