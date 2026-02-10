import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import type { UpdateAvailabilityInput } from "../types";
import { verifyAvailability } from "../validation";
import {
  buildAvailabilityUpdateQuery,
  fetchExistingAvailabilityRecord,
  updateAvailabilityRaw,
  validateAvailabilityUpdate,
} from "./helpers";

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

  // Validate update input
  const validationError = await validateAvailabilityUpdate(
    body,
    existingAvail,
    tenantId,
    id
  );
  if (validationError) {
    return validationError;
  }

  try {
    // Build dynamic update query
    const { fields: updateFields, values: updateValues } =
      buildAvailabilityUpdateQuery(body);

    if (updateFields.length === 0) {
      return NextResponse.json(
        { message: "No fields to update" },
        { status: 400 }
      );
    }

    // Execute update
    const success = await updateAvailabilityRaw(
      tenantId,
      id,
      updateFields,
      updateValues
    );

    if (!success) {
      return NextResponse.json(
        { message: "Availability record not found" },
        { status: 404 }
      );
    }

    // Fetch updated record
    const updated = await fetchExistingAvailabilityRecord(tenantId, id);
    if (!updated) {
      return NextResponse.json(
        { message: "Availability record not found after update" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      availability: {
        id,
        employee_id: existingAvail.employee_id,
        day_of_week: body.dayOfWeek ?? existingAvail.day_of_week,
      },
    });
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
