import { database, Prisma } from "@repo/database";
import { NextResponse } from "next/server";
import type { ShiftOverlap } from "./types";

/**
 * Validates shift timing requirements
 */
export function validateShiftTimes(
  shiftStart: Date,
  shiftEnd: Date,
  allowHistorical?: boolean
): NextResponse | null {
  if (shiftEnd <= shiftStart) {
    return NextResponse.json(
      { message: "Shift end time must be after start time" },
      { status: 400 }
    );
  }

  const now = new Date();
  if (shiftEnd < now && !allowHistorical) {
    return NextResponse.json(
      {
        message:
          "Cannot create shifts in the past. Use allowHistorical flag for historical data entry.",
      },
      { status: 400 }
    );
  }

  return null;
}

/**
 * Verifies an employee exists and is active
 */
export async function verifyEmployee(
  tenantId: string,
  employeeId: string
): Promise<{
  employee: { id: string; role: string; is_active: boolean } | null;
  error: NextResponse | null;
}> {
  const employee = await database.$queryRaw<
    Array<{ id: string; role: string; is_active: boolean }>
  >(
    Prisma.sql`
      SELECT id, role, is_active
      FROM tenant_staff.employees
      WHERE tenant_id = ${tenantId}
        AND id = ${employeeId}
        AND deleted_at IS NULL
    `
  );

  if (!employee[0]) {
    return {
      employee: null,
      error: NextResponse.json(
        { message: "Employee not found" },
        { status: 404 }
      ),
    };
  }

  if (!employee[0].is_active) {
    return {
      employee: null,
      error: NextResponse.json(
        { message: "Cannot assign shift to inactive employee" },
        { status: 400 }
      ),
    };
  }

  return { employee: employee[0], error: null };
}

/**
 * Validates employee role matches required role
 */
export function validateEmployeeRole(
  employeeRole: string,
  requiredRole?: string
): NextResponse | null {
  if (requiredRole && employeeRole !== requiredRole) {
    return NextResponse.json(
      {
        message: `Employee role (${employeeRole}) does not match required role (${requiredRole})`,
      },
      { status: 400 }
    );
  }

  return null;
}

/**
 * Checks for overlapping shifts for an employee
 */
export async function checkOverlappingShifts(
  tenantId: string,
  employeeId: string,
  shiftStart: Date,
  shiftEnd: Date,
  excludeShiftId?: string
): Promise<{ overlaps: ShiftOverlap[]; error: NextResponse | null }> {
  const overlappingShifts = await database.$queryRaw<
    Array<{ id: string; shift_start: Date; shift_end: Date }>
  >(
    Prisma.sql`
      SELECT id, shift_start, shift_end
      FROM tenant_staff.schedule_shifts
      WHERE tenant_id = ${tenantId}
        AND employee_id = ${employeeId}
        ${excludeShiftId ? Prisma.sql`AND id != ${excludeShiftId}` : Prisma.empty}
        AND deleted_at IS NULL
        AND (
          (shift_start < ${shiftEnd}) AND (shift_end > ${shiftStart})
        )
    `
  );

  return {
    overlaps: overlappingShifts,
    error: null,
  };
}

/**
 * Verifies a schedule exists
 */
export async function verifySchedule(
  tenantId: string,
  scheduleId: string
): Promise<{
  schedule: { id: string; status: string } | null;
  error: NextResponse | null;
}> {
  const schedule = await database.$queryRaw<
    Array<{ id: string; status: string }>
  >(
    Prisma.sql`
      SELECT id, status
      FROM tenant_staff.schedules
      WHERE tenant_id = ${tenantId}
        AND id = ${scheduleId}
        AND deleted_at IS NULL
    `
  );

  if (!schedule[0]) {
    return {
      schedule: null,
      error: NextResponse.json(
        { message: "Schedule not found" },
        { status: 404 }
      ),
    };
  }

  return { schedule: schedule[0], error: null };
}
