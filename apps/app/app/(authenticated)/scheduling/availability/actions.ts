"use server";

import type {
  AvailabilityFilters,
  DayOfWeek,
} from "@/app/lib/staff/availability/types";
import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { revalidatePath } from "next/cache";
import { getTenantIdForOrg } from "@/app/lib/tenant";

/**
 * Get all availability records with optional filters
 */
export async function getAvailability(params: AvailabilityFilters = {}) {
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
  const hasEmployeeId = params.employeeId !== undefined;
  const hasDayOfWeek = params.dayOfWeek !== undefined;
  const hasEffectiveDate = params.effectiveDate !== undefined;
  const hasIsActive = params.isActive !== undefined;

  // Fetch availability and count
  const [availability, totalCount] = await Promise.all([
    database.$queryRaw<
      Array<{
        id: string;
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
          ea.employee_id,
          e.first_name AS employee_first_name,
          e.last_name AS employee_last_name,
          e.email AS employee_email,
          e.role AS employee_role,
          ea.day_of_week,
          ea.start_time,
          ea.end_time,
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
          AND ea.deleted_at IS NULL
          ${hasEmployeeId ? Prisma.sql`AND ea.employee_id = ${params.employeeId!}` : Prisma.empty}
          ${hasDayOfWeek ? Prisma.sql`AND ea.day_of_week = ${params.dayOfWeek!}` : Prisma.empty}
          ${hasEffectiveDate ? Prisma.sql`AND ${new Date(params.effectiveDate!)} >= COALESCE(ea.effective_from, ${new Date(params.effectiveDate!)}) AND ${new Date(params.effectiveDate!)} <= COALESCE(ea.effective_until, ${new Date(params.effectiveDate!)})` : Prisma.empty}
          ${hasIsActive ? Prisma.sql`AND ${new Date(params.effectiveDate!)} >= COALESCE(ea.effective_from, ${new Date(params.effectiveDate!)}) AND ${new Date(params.effectiveDate!)} <= COALESCE(ea.effective_until, ${new Date(params.effectiveDate!)})` : Prisma.empty}
        ORDER BY e.last_name ASC, e.first_name ASC, ea.day_of_week ASC, ea.start_time ASC
        LIMIT ${limit}
        OFFSET ${offset}
      `
    ),
    database.$queryRaw<[{ count: bigint }]>(
      Prisma.sql`
        SELECT COUNT(*)::bigint
        FROM tenant_staff.employee_availability ea
        WHERE ea.tenant_id = ${tenantId}
          AND ea.deleted_at IS NULL
          ${hasEmployeeId ? Prisma.sql`AND ea.employee_id = ${params.employeeId!}` : Prisma.empty}
          ${hasDayOfWeek ? Prisma.sql`AND ea.day_of_week = ${params.dayOfWeek!}` : Prisma.empty}
          ${hasEffectiveDate ? Prisma.sql`AND ${new Date(params.effectiveDate!)} >= COALESCE(ea.effective_from, ${new Date(params.effectiveDate!)}) AND ${new Date(params.effectiveDate!)} <= COALESCE(ea.effective_until, ${new Date(params.effectiveDate!)})` : Prisma.empty}
          ${hasIsActive ? Prisma.sql`AND ${new Date(params.effectiveDate!)} >= COALESCE(ea.effective_from, ${new Date(params.effectiveDate!)}) AND ${new Date(params.effectiveDate!)} <= COALESCE(ea.effective_until, ${new Date(params.effectiveDate!)})` : Prisma.empty}
      `
    ),
  ]);

  return {
    availability,
    pagination: {
      page,
      limit,
      total: Number(totalCount[0].count),
      totalPages: Math.ceil(Number(totalCount[0].count) / limit),
    },
  };
}

/**
 * Get a single availability record by ID
 */
export async function getAvailabilityById(availabilityId: string) {
  const { orgId } = await auth();
  if (!orgId) {
    throw new Error("Not authenticated");
  }
  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) {
    throw new Error("No tenant found");
  }

  const [availability] = await database.$queryRaw<
    Array<{
      id: string;
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
        ea.employee_id,
        e.first_name AS employee_first_name,
        e.last_name AS employee_last_name,
        e.email AS employee_email,
        e.role AS employee_role,
        ea.day_of_week,
        ea.start_time,
        ea.end_time,
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
        AND ea.id = ${availabilityId}
        AND ea.deleted_at IS NULL
    `
  );

  if (!availability) {
    throw new Error("Availability record not found");
  }

  return { availability };
}

/**
 * Create a new availability record
 */
export async function createAvailability(formData: FormData) {
  const { orgId } = await auth();
  if (!orgId) {
    throw new Error("Not authenticated");
  }
  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) {
    throw new Error("No tenant found");
  }

  const employeeId = formData.get("employeeId") as string;
  const dayOfWeek = formData.get("dayOfWeek") as unknown as DayOfWeek;
  const startTime = formData.get("startTime") as string;
  const endTime = formData.get("endTime") as string;
  const isAvailable = formData.get("isAvailable") !== "false";
  const effectiveFrom = formData.get("effectiveFrom") as string;
  const effectiveUntil = formData.get("effectiveUntil") as string | null;

  // Validate required fields
  if (!(employeeId && dayOfWeek !== undefined && startTime && endTime)) {
    throw new Error(
      "Employee, day of week, start time, and end time are required"
    );
  }

  const createEffectiveFrom = effectiveFrom
    ? new Date(effectiveFrom)
    : new Date();
  const effectiveUntilDate = effectiveUntil ? new Date(effectiveUntil) : null;

  // Validate time format and range
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (!(timeRegex.test(startTime) && timeRegex.test(endTime))) {
    throw new Error("Time must be in HH:MM format (24-hour)");
  }

  if (endTime <= startTime) {
    throw new Error("End time must be after start time");
  }

  // Validate effective dates
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const createEffectiveFrom2 = new Date(createEffectiveFrom);
  createEffectiveFrom2.setHours(0, 0, 0, 0);

  if (createEffectiveFrom2 < today) {
    throw new Error("Effective from date cannot be in the past");
  }

  if (effectiveUntilDate && effectiveUntilDate < createEffectiveFrom2) {
    throw new Error(
      "Effective until date must be on or after effective from date"
    );
  }

  // Check for existing active availability
  const [existingActive] = await database.$queryRaw<Array<{ count: bigint }>>(
    Prisma.sql`
      SELECT COUNT(*)::bigint
      FROM tenant_staff.employee_availability
      WHERE tenant_id = ${tenantId}
        AND employee_id = ${employeeId}
        AND day_of_week = ${dayOfWeek}
        AND deleted_at IS NULL
        AND effective_until IS NULL
    `
  );

  if (Number(existingActive.count) > 0) {
    throw new Error("Employee already has active availability for this day");
  }

  // Create the availability record
  const availability = await database.employee_availability.create({
    data: {
      tenant_id: tenantId,
      employee_id: employeeId,
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
      is_available: isAvailable,
      effective_from: createEffectiveFrom2,
      effective_until: effectiveUntilDate,
    },
  });

  revalidatePath("/scheduling/availability");
  return { availability };
}

/**
 * Update an existing availability record
 */
export async function updateAvailability(
  availabilityId: string,
  formData: FormData
) {
  const { orgId } = await auth();
  if (!orgId) {
    throw new Error("Not authenticated");
  }
  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) {
    throw new Error("No tenant found");
  }

  const dayOfWeek = formData.get("dayOfWeek") as unknown as
    | DayOfWeek
    | undefined;
  const startTime = formData.get("startTime") as string | undefined;
  const endTime = formData.get("endTime") as string | undefined;
  const isAvailable = formData.get("isAvailable") as unknown as
    | boolean
    | undefined;
  const effectiveFrom = formData.get("effectiveFrom") as string | undefined;
  const effectiveUntil = formData.get("effectiveUntil") as
    | string
    | null
    | undefined;

  // Get existing availability
  const [existing] = await database.$queryRaw<
    Array<{ employee_id: string; day_of_week: number }>
  >(
    Prisma.sql`
      SELECT employee_id, day_of_week
      FROM tenant_staff.employee_availability
      WHERE tenant_id = ${tenantId}
        AND id = ${availabilityId}
        AND deleted_at IS NULL
    `
  );

  if (!existing) {
    throw new Error("Availability record not found");
  }

  // Update only provided fields
  interface EmployeeAvailabilityUpdateData {
    day_of_week?: number;
    start_time?: string;
    end_time?: string;
    is_available?: boolean;
    effective_from?: Date;
    effective_until?: Date | null;
  }

  const updateData: EmployeeAvailabilityUpdateData = {};

  if (dayOfWeek !== undefined) {
    updateData.day_of_week = dayOfWeek;
  }
  if (startTime !== undefined) {
    updateData.start_time = startTime;
  }
  if (endTime !== undefined) {
    updateData.end_time = endTime;
  }
  if (isAvailable !== undefined) {
    updateData.is_available = isAvailable;
  }
  if (effectiveFrom !== undefined) {
    const updateEffectiveFrom = new Date(effectiveFrom);
    updateData.effective_from = updateEffectiveFrom;
  }
  if (effectiveUntil !== undefined) {
    updateData.effective_until = effectiveUntil
      ? new Date(effectiveUntil)
      : null;
  }

  // Validate time format and range if provided
  if (startTime && endTime) {
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!(timeRegex.test(startTime) && timeRegex.test(endTime))) {
      throw new Error("Time must be in HH:MM format (24-hour)");
    }

    if (endTime <= startTime) {
      throw new Error("End time must be after start time");
    }
  }

  // Validate effective dates if provided
  if (effectiveFrom && effectiveUntil !== undefined) {
    const createEffectiveFrom2 = new Date(effectiveFrom);
    const effectiveUntilDate = effectiveUntil ? new Date(effectiveUntil) : null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const createEffectiveFrom22 = new Date(createEffectiveFrom2);
    createEffectiveFrom22.setHours(0, 0, 0, 0);

    if (createEffectiveFrom22 < today) {
      throw new Error("Effective from date cannot be in the past");
    }

    if (effectiveUntilDate && effectiveUntilDate < createEffectiveFrom22) {
      throw new Error(
        "Effective until date must be on or after effective from date"
      );
    }
  }

  // Update the availability record
  const availability = await database.employee_availability.update({
    where: {
      tenant_id_id: {
        tenant_id: tenantId,
        id: availabilityId,
      },
    },
    data: updateData,
  });

  revalidatePath("/scheduling/availability");
  return { availability };
}

/**
 * Delete (soft delete) an availability record
 */
export async function deleteAvailability(availabilityId: string) {
  const { orgId } = await auth();
  if (!orgId) {
    throw new Error("Not authenticated");
  }
  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) {
    throw new Error("No tenant found");
  }

  await database.employee_availability.update({
    where: {
      tenant_id_id: {
        tenant_id: tenantId,
        id: availabilityId,
      },
    },
    data: {
      deleted_at: new Date(),
    },
  });

  revalidatePath("/scheduling/availability");
  return { success: true };
}

/**
 * Create batch availability records (recurring weekly patterns)
 */
export async function createBatchAvailability(formData: FormData) {
  const { orgId } = await auth();
  if (!orgId) {
    throw new Error("Not authenticated");
  }
  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) {
    throw new Error("No tenant found");
  }

  const employeeId = formData.get("employeeId") as string;
  const patternsJson = formData.get("patterns") as string;
  const effectiveFrom = formData.get("effectiveFrom") as string;
  const effectiveUntil = formData.get("effectiveUntil") as string | null;

  const patterns = JSON.parse(patternsJson) as Array<{
    dayOfWeek: DayOfWeek;
    startTime: string;
    endTime: string;
    isAvailable?: boolean;
  }>;
  const createEffectiveFrom = effectiveFrom
    ? new Date(effectiveFrom)
    : new Date();
  const effectiveUntilDate = effectiveUntil ? new Date(effectiveUntil) : null;

  // Validate batch input
  if (!patterns || patterns.length === 0) {
    throw new Error("At least one availability pattern must be provided");
  }

  // Check for duplicate days
  const days = patterns.map((p) => p.dayOfWeek);
  const uniqueDays = new Set(days);
  if (days.length !== uniqueDays.size) {
    throw new Error(
      "Cannot have multiple availability patterns for the same day"
    );
  }

  // Validate each pattern
  for (const pattern of patterns) {
    const dayOfWeek = pattern.dayOfWeek as DayOfWeek;
    const startTime = pattern.startTime as string;
    const endTime = pattern.endTime as string;

    // Validate day of week
    if (dayOfWeek < 0 || dayOfWeek > 6 || !Number.isInteger(dayOfWeek)) {
      throw new Error(
        `Invalid day of week: ${dayOfWeek}. Must be 0-6 (0=Sunday, 6=Saturday)`
      );
    }

    // Validate time format and range
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!(timeRegex.test(startTime) && timeRegex.test(endTime))) {
      throw new Error("Time must be in HH:MM format (24-hour)");
    }

    if (endTime <= startTime) {
      throw new Error("End time must be after start time");
    }
  }

  // Validate effective dates
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const createEffectiveFrom2 = new Date(createEffectiveFrom);
  createEffectiveFrom2.setHours(0, 0, 0, 0);

  if (createEffectiveFrom2 < today) {
    throw new Error("Effective from date cannot be in the past");
  }

  if (effectiveUntilDate && effectiveUntilDate < createEffectiveFrom2) {
    throw new Error(
      "Effective until date must be on or after effective from date"
    );
  }

  // Check for existing active availability for any of the days
  const daysArray = Array.from(uniqueDays);
  const [existingActive] = await database.$queryRaw<Array<{ count: bigint }>>(
    Prisma.sql`
      SELECT COUNT(*)::bigint
      FROM tenant_staff.employee_availability
      WHERE tenant_id = ${tenantId}
        AND employee_id = ${employeeId}
        AND day_of_week IN (${Prisma.join(daysArray)})
        AND deleted_at IS NULL
        AND effective_until IS NULL
    `
  );

  if (Number(existingActive.count) > 0) {
    throw new Error(
      "Employee already has active availability for one or more of these days"
    );
  }

  // Create all availability records
  const createdAvailability = await Promise.all(
    patterns.map(async (pattern) => {
      return database.employee_availability.create({
        data: {
          tenant_id: tenantId,
          employee_id: employeeId,
          day_of_week: pattern.dayOfWeek,
          start_time: pattern.startTime,
          end_time: pattern.endTime,
          is_available: pattern.isAvailable ?? true,
          effective_from: createEffectiveFrom2,
          effective_until: effectiveUntilDate,
        },
      });
    })
  );

  revalidatePath("/scheduling/availability");
  return { availability: createdAvailability };
}

/**
 * Get employee availability for scheduling (date range with time-off integration)
 */
export async function getEmployeeAvailability(params: {
  employeeIds?: string[];
  startDate: string;
  endDate: string;
  includeTimeOff?: boolean;
}) {
  const { orgId } = await auth();
  if (!orgId) {
    throw new Error("Not authenticated");
  }
  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) {
    throw new Error("No tenant found");
  }

  const startDate = new Date(params.startDate);
  const endDate = new Date(params.endDate);

  // Get all employees if not specified
  const employeesQuery =
    params.employeeIds && params.employeeIds.length > 0
      ? Prisma.sql`AND e.id IN (${Prisma.join(params.employeeIds)})`
      : Prisma.empty;

  // Get availability for the date range
  const availability = await database.$queryRaw<
    Array<{
      employee_id: string;
      employee_first_name: string | null;
      employee_last_name: string | null;
      employee_email: string;
      employee_role: string;
      is_available: boolean;
      day_of_week: number;
      start_time: string;
      end_time: string;
    }>
  >(
    Prisma.sql`
      SELECT
        ea.employee_id,
        e.first_name AS employee_first_name,
        e.last_name AS employee_last_name,
        e.email AS employee_email,
        e.role AS employee_role,
        ea.is_available,
        ea.day_of_week,
        ea.start_time,
        ea.end_time
      FROM tenant_staff.employee_availability ea
      JOIN tenant_staff.employees e
        ON e.tenant_id = ea.tenant_id
       AND e.id = ea.employee_id
      WHERE ea.tenant_id = ${tenantId}
        AND ea.deleted_at IS NULL
        AND ${startDate} <= COALESCE(ea.effective_until, ${endDate})
        AND ${endDate} >= COALESCE(ea.effective_from, ${startDate})
        ${employeesQuery}
      ORDER BY e.last_name ASC, e.first_name ASC, ea.day_of_week ASC, ea.start_time ASC
    `
  );

  // Group availability by employee
  const availabilityByEmployee = availability.reduce(
    (acc, avail) => {
      const employeeId = avail.employee_id;
      if (!acc[employeeId]) {
        acc[employeeId] = {
          employeeId,
          employee_first_name: avail.employee_first_name,
          employee_last_name: avail.employee_last_name,
          employee_email: avail.employee_email,
          employee_role: avail.employee_role,
          availability: [],
        };
      }
      acc[employeeId].availability.push({
        is_available: avail.is_available,
        day_of_week: avail.day_of_week,
        start_time: avail.start_time,
        end_time: avail.end_time,
      });
      return acc;
    },
    {} as Record<
      string,
      {
        employeeId: string;
        employee_first_name: string | null;
        employee_last_name: string | null;
        employee_email: string;
        employee_role: string;
        availability: Array<{
          is_available: boolean;
          day_of_week: number;
          start_time: string;
          end_time: string;
        }>;
      }
    >
  );

  // Get time-off requests if requested
  let timeOffRequests: Array<{
    id: string;
    employee_id: string;
    start_date: Date;
    end_date: Date;
    status: string;
  }> = [];
  if (params.includeTimeOff) {
    timeOffRequests = await database.$queryRaw<
      Array<{
        id: string;
        employee_id: string;
        start_date: Date;
        end_date: Date;
        status: string;
      }>
    >(
      Prisma.sql`
        SELECT
          tor.id,
          tor.employee_id,
          tor.start_date,
          tor.end_date,
          tor.status
        FROM tenant_staff.time_off_requests tor
        WHERE tor.tenant_id = ${tenantId}
          AND tor.deleted_at IS NULL
          AND tor.status IN ('approved', 'pending')
          AND (${startDate} <= tor.end_date AND ${endDate} >= tor.start_date)
          ${employeesQuery}
        ORDER BY tor.start_date ASC
      `
    );
  }

  // Combine availability with time-off
  const employeesWithAvailability = Object.values(availabilityByEmployee).map(
    (employee) => {
      const employeeTimeOff = timeOffRequests.filter(
        (to) => to.employee_id === employee.employeeId
      );

      return {
        employeeId: employee.employeeId,
        employee_first_name: employee.employee_first_name,
        employee_last_name: employee.employee_last_name,
        employee_email: employee.employee_email,
        employee_role: employee.employee_role,
        availability: employee.availability,
        time_off_requests:
          employeeTimeOff.length > 0 ? employeeTimeOff : undefined,
      };
    }
  );

  return { employees: employeesWithAvailability };
}

/**
 * Get all active employees for dropdown
 */
export async function getEmployees() {
  const { orgId } = await auth();
  if (!orgId) {
    throw new Error("Not authenticated");
  }
  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) {
    throw new Error("No tenant found");
  }

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
