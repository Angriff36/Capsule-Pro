"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@repo/auth/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database, Prisma } from "@repo/database";

/**
 * Get all shifts with optional filters
 */
export async function getShifts(params: {
  startDate?: string;
  endDate?: string;
  employeeId?: string;
  locationId?: string;
  role?: string;
  page?: number;
  limit?: number;
}) {
  const { orgId } = await auth();
  if (!orgId) {
    throw new Error("Not authenticated");
  }
  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) {
    throw new Error("No tenant found");
  }

  const limit = params.limit ?? 50;
  const page = params.page ?? 1;
  const offset = (page - 1) * limit;

  // Build filters
  const hasStartDate = params.startDate !== undefined;
  const hasEndDate = params.endDate !== undefined;
  const hasEmployeeId = params.employeeId !== undefined;
  const hasLocationId = params.locationId !== undefined;
  const hasRole = params.role !== undefined;

  // Fetch shifts and count
  const [shifts, totalCount] = await Promise.all([
    database.$queryRaw<
      Array<{
        id: string;
        schedule_id: string;
        employee_id: string;
        employee_first_name: string | null;
        employee_last_name: string | null;
        employee_email: string;
        employee_role: string;
        location_id: string;
        location_name: string;
        shift_start: Date;
        shift_end: Date;
        role_during_shift: string | null;
        notes: string | null;
        created_at: Date;
        updated_at: Date;
      }>
    >(
      Prisma.sql`
        SELECT
          ss.id,
          ss.schedule_id,
          ss.employee_id,
          e.first_name AS employee_first_name,
          e.last_name AS employee_last_name,
          e.email AS employee_email,
          e.role AS employee_role,
          ss.location_id,
          l.name AS location_name,
          ss.shift_start,
          ss.shift_end,
          ss.role_during_shift,
          ss.notes,
          ss.created_at,
          ss.updated_at
        FROM tenant_staff.schedule_shifts ss
        JOIN tenant_staff.employees e
          ON e.tenant_id = ss.tenant_id
         AND e.id = ss.employee_id
        JOIN tenant.locations l
          ON l.tenant_id = ss.tenant_id
         AND l.id = ss.location_id
        WHERE ss.tenant_id = ${tenantId}
          AND ss.deleted_at IS NULL
          ${hasStartDate ? Prisma.sql`AND ss.shift_start >= ${new Date(params.startDate!)}` : Prisma.empty}
          ${hasEndDate ? Prisma.sql`AND ss.shift_end <= ${new Date(params.endDate!)}` : Prisma.empty}
          ${hasEmployeeId ? Prisma.sql`AND ss.employee_id = ${params.employeeId!}` : Prisma.empty}
          ${hasLocationId ? Prisma.sql`AND ss.location_id = ${params.locationId!}` : Prisma.empty}
          ${hasRole ? Prisma.sql`AND ss.role_during_shift = ${params.role!}` : Prisma.empty}
        ORDER BY ss.shift_start ASC
        LIMIT ${limit}
        OFFSET ${offset}
      `
    ),
    database.$queryRaw<[{ count: bigint }]>(
      Prisma.sql`
        SELECT COUNT(*)::bigint
        FROM tenant_staff.schedule_shifts ss
        WHERE ss.tenant_id = ${tenantId}
          AND ss.deleted_at IS NULL
          ${hasStartDate ? Prisma.sql`AND ss.shift_start >= ${new Date(params.startDate!)}` : Prisma.empty}
          ${hasEndDate ? Prisma.sql`AND ss.shift_end <= ${new Date(params.endDate!)}` : Prisma.empty}
          ${hasEmployeeId ? Prisma.sql`AND ss.employee_id = ${params.employeeId!}` : Prisma.empty}
          ${hasLocationId ? Prisma.sql`AND ss.location_id = ${params.locationId!}` : Prisma.empty}
          ${hasRole ? Prisma.sql`AND ss.role_during_shift = ${params.role!}` : Prisma.empty}
      `
    ),
  ]);

  return {
    shifts,
    pagination: {
      page,
      limit,
      total: Number(totalCount[0].count),
      totalPages: Math.ceil(Number(totalCount[0].count) / limit),
    },
  };
}

/**
 * Get a single shift by ID
 */
export async function getShift(shiftId: string) {
  const { orgId } = await auth();
  if (!orgId) throw new Error("Not authenticated");
  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) throw new Error("No tenant found");

  const [shift] = await database.$queryRaw<
    Array<{
      id: string;
      schedule_id: string;
      employee_id: string;
      employee_first_name: string | null;
      employee_last_name: string | null;
      employee_email: string;
      employee_role: string;
      location_id: string;
      location_name: string;
      shift_start: Date;
      shift_end: Date;
      role_during_shift: string | null;
      notes: string | null;
      created_at: Date;
      updated_at: Date;
    }>
  >(
    Prisma.sql`
      SELECT
        ss.id,
        ss.schedule_id,
        ss.employee_id,
        e.first_name AS employee_first_name,
        e.last_name AS employee_last_name,
        e.email AS employee_email,
        e.role AS employee_role,
        ss.location_id,
        l.name AS location_name,
        ss.shift_start,
        ss.shift_end,
        ss.role_during_shift,
        ss.notes,
        ss.created_at,
        ss.updated_at
      FROM tenant_staff.schedule_shifts ss
      JOIN tenant_staff.employees e
        ON e.tenant_id = ss.tenant_id
       AND e.id = ss.employee_id
      JOIN tenant.locations l
        ON l.tenant_id = ss.tenant_id
       AND l.id = ss.location_id
      WHERE ss.tenant_id = ${tenantId}
        AND ss.id = ${shiftId}
        AND ss.deleted_at IS NULL
    `
  );

  if (!shift) {
    throw new Error("Shift not found");
  }

  return { shift };
}

/**
 * Get available employees for a shift time slot
 */
export async function getAvailableEmployees(params: {
  shiftStart: string;
  shiftEnd: string;
  excludeShiftId?: string;
  locationId?: string;
  requiredRole?: string;
}) {
  const { orgId } = await auth();
  if (!orgId) throw new Error("Not authenticated");
  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) throw new Error("No tenant found");

  const startDate = new Date(params.shiftStart);
  const endDate = new Date(params.shiftEnd);

  // Get all active employees
  const employees = await database.$queryRaw<
    Array<{
      id: string;
      first_name: string | null;
      last_name: string | null;
      email: string;
      role: string;
      is_active: boolean;
      has_conflicting_shift: boolean;
      conflicting_shifts: Array<{
        id: string;
        shift_start: Date;
        shift_end: Date;
        location_name: string;
      }>;
    }>
  >(
    Prisma.sql`
      SELECT
        e.id,
        e.first_name,
        e.last_name,
        e.email,
        e.role,
        e.is_active,
        COALESCE(
          EXISTS(
            SELECT 1
            FROM tenant_staff.schedule_shifts ss
            WHERE ss.tenant_id = e.tenant_id
              AND ss.employee_id = e.id
              AND ss.deleted_at IS NULL
              AND ss.shift_start < ${endDate}
              AND ss.shift_end > ${startDate}
              ${params.excludeShiftId ? Prisma.sql`AND ss.id != ${params.excludeShiftId}` : Prisma.empty}
          ),
          false
        ) AS has_conflicting_shift
      FROM tenant_staff.employees e
      WHERE e.tenant_id = ${tenantId}
        AND e.deleted_at IS NULL
        AND e.is_active = true
        ${params.requiredRole ? Prisma.sql`AND e.role = ${params.requiredRole}` : Prisma.empty}
      ORDER BY e.last_name ASC, e.first_name ASC
    `
  );

  // For employees with conflicts, get their conflicting shifts
  const employeesWithConflicts = await Promise.all(
    employees.map(async (emp) => {
      if (!emp.has_conflicting_shift) {
        return {
          ...emp,
          hasConflictingShift: false,
          conflictingShifts: [],
        };
      }

      const conflictingShifts = await database.$queryRaw<
        Array<{
          id: string;
          shift_start: Date;
          shift_end: Date;
          location_name: string;
        }>
      >(
        Prisma.sql`
          SELECT
            ss.id,
            ss.shift_start,
            ss.shift_end,
            l.name AS location_name
          FROM tenant_staff.schedule_shifts ss
          JOIN tenant.locations l ON l.id = ss.location_id
          WHERE ss.tenant_id = ${tenantId}
            AND ss.employee_id = ${emp.id}
            AND ss.deleted_at IS NULL
            AND ss.shift_start < ${endDate}
            AND ss.shift_end > ${startDate}
            ${params.excludeShiftId ? Prisma.sql`AND ss.id != ${params.excludeShiftId}` : Prisma.empty}
          ORDER BY ss.shift_start ASC
        `
      );

      return {
        ...emp,
        hasConflictingShift: true,
        conflictingShifts: conflictingShifts.map((cs) => ({
          id: cs.id,
          shiftStart: cs.shift_start,
          shiftEnd: cs.shift_end,
          locationName: cs.location_name,
        })),
      };
    })
  );

  return { employees: employeesWithConflicts };
}

/**
 * Create a new shift
 */
export async function createShift(formData: FormData) {
  const { orgId } = await auth();
  if (!orgId) throw new Error("Not authenticated");
  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) throw new Error("No tenant found");

  const scheduleId = formData.get("scheduleId") as string;
  const employeeId = formData.get("employeeId") as string;
  const locationId = formData.get("locationId") as string;
  const shiftStart = formData.get("shiftStart") as string;
  const shiftEnd = formData.get("shiftEnd") as string;
  const roleDuringShift = formData.get("roleDuringShift") as string | null;
  const notes = formData.get("notes") as string | null;
  const allowHistorical = formData.get("allowHistorical") === "true";
  const allowOverlap = formData.get("allowOverlap") === "true";

  // Validate required fields
  if (!scheduleId || !employeeId || !locationId || !shiftStart || !shiftEnd) {
    throw new Error("Schedule, employee, location, and times are required");
  }

  const startDate = new Date(shiftStart);
  const endDate = new Date(shiftEnd);

  // Validate shift times
  if (endDate <= startDate) {
    throw new Error("End time must be after start time");
  }

  if (!allowHistorical && endDate < new Date()) {
    throw new Error("Cannot create shifts in the past");
  }

  // Check for overlapping shifts
  if (!allowOverlap) {
    const [overlap] = await database.$queryRaw<
      Array<{ count: bigint }>
    >(
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
      throw new Error("Employee has overlapping shifts");
    }
  }

  // Create the shift
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
  return { shift };
}

/**
 * Update an existing shift
 */
export async function updateShift(shiftId: string, formData: FormData) {
  const { orgId } = await auth();
  if (!orgId) throw new Error("Not authenticated");
  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) throw new Error("No tenant found");

  const scheduleId = formData.get("scheduleId") as string;
  const employeeId = formData.get("employeeId") as string;
  const locationId = formData.get("locationId") as string;
  const shiftStart = formData.get("shiftStart") as string;
  const shiftEnd = formData.get("shiftEnd") as string;
  const roleDuringShift = formData.get("roleDuringShift") as string | null;
  const notes = formData.get("notes") as string | null;
  const allowOverlap = formData.get("allowOverlap") === "true";

  // Validate required fields
  if (!scheduleId || !employeeId || !locationId || !shiftStart || !shiftEnd) {
    throw new Error("Schedule, employee, location, and times are required");
  }

  const startDate = new Date(shiftStart);
  const endDate = new Date(shiftEnd);

  // Validate shift times
  if (endDate <= startDate) {
    throw new Error("End time must be after start time");
  }

  // Check for overlapping shifts (excluding current shift)
  if (!allowOverlap) {
    const [overlap] = await database.$queryRaw<
      Array<{ count: bigint }>
    >(
      Prisma.sql`
        SELECT COUNT(*)::bigint
        FROM tenant_staff.schedule_shifts
        WHERE tenant_id = ${tenantId}
          AND employee_id = ${employeeId}
          AND id != ${shiftId}
          AND deleted_at IS NULL
          AND shift_start < ${endDate}
          AND shift_end > ${startDate}
      `
    );

    if (Number(overlap.count) > 0) {
      throw new Error("Employee has overlapping shifts");
    }
  }

  // Update the shift
  const shift = await database.scheduleShift.update({
    where: {
      tenantId_id: {
        tenantId,
        id: shiftId,
      },
    },
    data: {
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
  return { shift };
}

/**
 * Delete a shift
 */
export async function deleteShift(shiftId: string) {
  const { orgId } = await auth();
  if (!orgId) throw new Error("Not authenticated");
  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) throw new Error("No tenant found");

  await database.scheduleShift.update({
    where: {
      tenantId_id: {
        tenantId,
        id: shiftId,
      },
    },
    data: {
      deletedAt: new Date(),
    },
  });

  revalidatePath("/scheduling/shifts");
  return { success: true };
}

/**
 * Get all employees for dropdown
 */
export async function getEmployees() {
  const { orgId } = await auth();
  if (!orgId) throw new Error("Not authenticated");
  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) throw new Error("No tenant found");

  const employees = await database.$queryRaw<
    Array<{
      id: string;
      email: string;
      first_name: string | null;
      last_name: string | null;
      role: string;
      is_active: boolean;
    }>
  >(
    Prisma.sql`
      SELECT
        id,
        email,
        first_name,
        last_name,
        role,
        is_active
      FROM tenant_staff.employees
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
        AND is_active = true
      ORDER BY last_name ASC, first_name ASC
    `
  );

  return { employees };
}

/**
 * Get all locations for dropdown
 */
export async function getLocations() {
  const { orgId } = await auth();
  if (!orgId) throw new Error("Not authenticated");
  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) throw new Error("No tenant found");

  const locations = await database.$queryRaw<
    Array<{
      id: string;
      name: string;
      is_active: boolean;
    }>
  >(
    Prisma.sql`
      SELECT
        id,
        name,
        is_active
      FROM tenant.locations
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
        AND is_active = true
      ORDER BY name ASC
    `
  );

  return { locations };
}

/**
 * Get all schedules for dropdown
 */
export async function getSchedules() {
  const { orgId } = await auth();
  if (!orgId) throw new Error("Not authenticated");
  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) throw new Error("No tenant found");

  const schedules = await database.$queryRaw<
    Array<{
      id: string;
      schedule_date: Date;
      status: string;
    }>
  >(
    Prisma.sql`
      SELECT
        id,
        schedule_date,
        status
      FROM tenant_staff.schedules
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
      ORDER BY schedule_date DESC
      LIMIT 100
    `
  );

  return { schedules };
}
