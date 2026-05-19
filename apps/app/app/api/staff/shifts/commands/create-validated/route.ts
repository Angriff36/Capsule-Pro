import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTenantId } from "@/app/lib/tenant";

const createShiftSchema = z.object({
  scheduleId: z.uuid(),
  employeeId: z.uuid(),
  locationId: z.uuid(),
  shiftStart: z.number(), // epoch ms
  shiftEnd: z.number(), // epoch ms
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

    const parsed = createShiftSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: z.treeifyError(parsed.error) },
        { status: 400 }
      );
    }

    const {
      scheduleId,
      employeeId,
      locationId,
      shiftStart,
      shiftEnd,
      roleDuringShift,
      notes,
      allowOverlap,
    } = parsed.data;

    const startDate = new Date(shiftStart);
    const endDate = new Date(shiftEnd);

    if (endDate <= startDate) {
      return NextResponse.json(
        { message: "End time must be after start time" },
        { status: 400 }
      );
    }

    // Check for overlapping shifts
    if (!allowOverlap) {
      const [overlap] = await database.$queryRaw<Array<{ count: bigint }>>(
        Prisma.sql`
          SELECT COUNT(*)::bigint
          FROM tenant_staff.schedule_shifts
          WHERE tenant_id = ${tenantId}
            AND employee_id = ${employeeId}
            AND deleted_at IS NULL
            AND shift_start < ${endDate}
            AND shift_end > ${startDate}
        `
      );

      if (Number(overlap.count) > 0) {
        return NextResponse.json(
          { message: "Employee has overlapping shifts" },
          { status: 409 }
        );
      }
    }

    const shift = await database.scheduleShift.create({
      data: {
        tenantId,
        scheduleId,
        employeeId,
        locationId,
        shift_start: startDate,
        shift_end: endDate,
        role_during_shift: roleDuringShift || null,
        notes: notes || null,
      },
    });

    revalidatePath("/scheduling/shifts");

    return NextResponse.json({ shift });
  } catch (error) {
    console.error("Error creating shift:", error);
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Failed to create shift",
      },
      { status: 500 }
    );
  }
}
