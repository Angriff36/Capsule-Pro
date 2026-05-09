import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { requireTenantId } from "@/app/lib/tenant";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const updateShiftSchema = z.object({
  id: z.string().uuid(),
  scheduleId: z.string().uuid().optional(),
  employeeId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  eventId: z.string().uuid().optional(),
  shiftStart: z.number().optional(),
  shiftEnd: z.number().optional(),
  roleDuringShift: z.string().optional(),
  notes: z.string().optional(),
  allowOverlap: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await requireTenantId();
    const body = await request.json();

    const parsed = updateShiftSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { id, allowOverlap, ...updates } = parsed.data;

    // Check shift exists
    const existing = await database.scheduleShift.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) {
      return NextResponse.json(
        { message: "Shift not found" },
        { status: 404 },
      );
    }

    // If times are being changed, validate them
    const shiftStart = updates.shiftStart
      ? new Date(updates.shiftStart)
      : existing.shift_start;
    const shiftEnd = updates.shiftEnd
      ? new Date(updates.shiftEnd)
      : existing.shift_end;

    if (shiftEnd <= shiftStart) {
      return NextResponse.json(
        { message: "End time must be after start time" },
        { status: 400 },
      );
    }

    // Check for overlapping shifts if times changed
    if (!allowOverlap && (updates.shiftStart || updates.shiftEnd)) {
      const employeeId = updates.employeeId || existing.employeeId;
      const [overlap] = await database.$queryRaw<Array<{ count: bigint }>>(
        Prisma.sql`
          SELECT COUNT(*)::bigint
          FROM tenant_staff.schedule_shifts
          WHERE tenant_id = ${tenantId}
            AND employee_id = ${employeeId}
            AND id != ${id}
            AND deleted_at IS NULL
            AND shift_start < ${shiftEnd}
            AND shift_end > ${shiftStart}
        `,
      );

      if (Number(overlap.count) > 0) {
        return NextResponse.json(
          { message: "Employee has overlapping shifts" },
          { status: 409 },
        );
      }
    }

    const data: Record<string, unknown> = {};
    if (updates.scheduleId) data.scheduleId = updates.scheduleId;
    if (updates.employeeId) data.employeeId = updates.employeeId;
    if (updates.locationId) data.locationId = updates.locationId;
    if (updates.shiftStart) data.shift_start = shiftStart;
    if (updates.shiftEnd) data.shift_end = shiftEnd;
    if (updates.roleDuringShift !== undefined) data.role_during_shift = updates.roleDuringShift || null;
    if (updates.notes !== undefined) data.notes = updates.notes || null;

    const shift = await database.scheduleShift.update({
      where: { tenantId_id: { tenantId, id } },
      data,
    });

    revalidatePath("/scheduling/shifts");

    return NextResponse.json({ shift });
  } catch (error) {
    console.error("Error updating shift:", error);
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Failed to update shift",
      },
      { status: 500 },
    );
  }
}
