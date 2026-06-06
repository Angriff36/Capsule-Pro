"use server";

import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { revalidatePath } from "next/cache";
import type {
  AvailabilityFilters,
  DayOfWeek,
} from "@/app/lib/staff/availability/types";
import { getTenantIdForOrg, requireCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest-command";

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
  const hasEmployeeId = Boolean(params.employeeId);
  const hasDayOfWeek =
    params.dayOfWeek !== undefined && params.dayOfWeek !== null;
  const hasEffectiveDate = Boolean(params.effectiveDate);
  const hasIsActive = params.isActive !== undefined && params.isActive !== null;

  // Fetch availability and count
  const [availability, totalCount] = await Promise.all([
    database.$queryRaw<
      Array<{
        id: string;
        employeeId: string;
        employeeFirstName: string | null;
        employeeLastName: string | null;
        employeeEmail: string;
        employeeRole: string;
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        isAvailable: boolean;
        effectiveFrom: Date;
        effectiveUntil: Date | null;
        createdAt: Date;
        updatedAt: Date;
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
      employeeId: string;
      employeeFirstName: string | null;
      employeeLastName: string | null;
      employeeEmail: string;
      employeeRole: string;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      isAvailable: boolean;
      effectiveFrom: Date;
      effectiveUntil: Date | null;
      createdAt: Date;
      updatedAt: Date;
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
  // Governed write: EmployeeAvailability.create runs through the Manifest runtime
  // (constitution §9) — no direct database.employeeAvailability.create.
  // requireCurrentUser supplies the actor + tenant the command needs for its
  // access policy (hr_admin/payroll_admin/manager/admin) and audit context (§19).
  const user = await requireCurrentUser();
  const tenantId = user.tenantId;

  const employeeId = formData.get("employeeId") as string;
  const dayOfWeekRaw = formData.get("dayOfWeek") as string;
  const dayOfWeek = Number.parseInt(dayOfWeekRaw, 10);
  const startTime = formData.get("startTime") as string;
  const endTime = formData.get("endTime") as string;
  const isAvailable = formData.get("isAvailable") !== "false";
  const effectiveFrom = formData.get("effectiveFrom") as string;
  const effectiveUntil = formData.get("effectiveUntil") as string | null;

  // Validate required fields
  if (!(employeeId && !isNaN(dayOfWeek) && startTime && endTime)) {
    throw new Error(
      "Employee, day of week, start time, and end time are required"
    );
  }

  const createEffectiveFrom = effectiveFrom
    ? new Date(effectiveFrom)
    : new Date();
  const effectiveUntilDate = effectiveUntil ? new Date(effectiveUntil) : null;

  // Parse time strings into Date objects for Prisma Time fields
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  const startTimeDate = new Date(1970, 0, 1, startH, startM);
  const endTimeDate = new Date(1970, 0, 1, endH, endM);

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

  // Governed create. startTime/endTime are @db.Time(6) and effectiveFrom/
  // effectiveUntil are @db.Date columns; the GenericPrismaStore coerces the
  // command's string params via `new Date(value)`, so we pass ISO strings built
  // from the already-validated Date objects (a bare "HH:MM" would parse to an
  // invalid Date and NULL the NOT NULL Time column).
  const result = await runManifestCommand({
    entity: "EmployeeAvailability",
    command: "create",
    body: {
      employeeId,
      dayOfWeek,
      startTime: startTimeDate.toISOString(),
      endTime: endTimeDate.toISOString(),
      isAvailable,
      effectiveFrom: createEffectiveFrom2.toISOString(),
      effectiveUntil: effectiveUntilDate ? effectiveUntilDate.toISOString() : "",
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to create availability");
  }

  const createdId = (result.result as { id?: string } | null)?.id;
  if (!createdId) {
    throw new Error("EmployeeAvailability.create did not return an id");
  }

  // Read back the persisted row to preserve the prior return shape.
  const availability = await database.employeeAvailability.findFirst({
    where: { tenantId, id: createdId },
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
    Array<{ employeeId: string; dayOfWeek: number }>
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
    dayOfWeek?: number;
    startTime?: string;
    endTime?: string;
    isAvailable?: boolean;
    effectiveFrom?: Date;
    effectiveUntil?: Date | null;
  }

  const updateData: EmployeeAvailabilityUpdateData = {};

  if (dayOfWeek !== undefined) {
    updateData.dayOfWeek = dayOfWeek;
  }
  if (startTime !== undefined) {
    updateData.startTime = startTime;
  }
  if (endTime !== undefined) {
    updateData.endTime = endTime;
  }
  if (isAvailable !== undefined) {
    updateData.isAvailable = isAvailable;
  }
  if (effectiveFrom !== undefined) {
    const updateEffectiveFrom = new Date(effectiveFrom);
    updateData.effectiveFrom = updateEffectiveFrom;
  }
  if (effectiveUntil !== undefined) {
    updateData.effectiveUntil = effectiveUntil
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
  const availability = await database.employeeAvailability.update({
    where: {
      tenantId_id: {
        tenantId,
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
  // Governed soft delete via the Manifest runtime (constitution §9) — sets
  // deletedAt + emits EmployeeAvailabilityDeleted, no direct
  // database.employeeAvailability.update. softDelete only patches deletedAt, so
  // the @db.Time/@db.Date columns are left untouched.
  const user = await requireCurrentUser();

  const result = await runManifestCommand({
    entity: "EmployeeAvailability",
    command: "softDelete",
    body: { id: availabilityId },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to delete availability");
  }

  revalidatePath("/scheduling/availability");
  return { success: true };
}

/**
 * Create batch availability records (recurring weekly patterns)
 */
export async function createBatchAvailability(formData: FormData) {
  // Governed batch create — each pattern routes through EmployeeAvailability.create
  // on the Manifest runtime (constitution §9). requireCurrentUser supplies the
  // actor + tenant for the access policy + audit context.
  const user = await requireCurrentUser();
  const tenantId = user.tenantId;

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

  // Govern each pattern through EmployeeAvailability.create. Time/date params are
  // passed as ISO strings the GenericPrismaStore can coerce to the @db.Time(6) /
  // @db.Date columns — converting the "HH:MM" pattern times to a 1970-epoch ISO
  // datetime. (The prior direct write passed the raw "HH:MM" string straight to a
  // DateTime column, which Prisma rejects — this path also fixes that latent bug.)
  const effectiveFromIso = createEffectiveFrom2.toISOString();
  const effectiveUntilIso = effectiveUntilDate
    ? effectiveUntilDate.toISOString()
    : "";

  const results = await Promise.all(
    patterns.map((pattern) => {
      const [ph, pm] = pattern.startTime.split(":").map(Number);
      const [eh, em] = pattern.endTime.split(":").map(Number);
      return runManifestCommand({
        entity: "EmployeeAvailability",
        command: "create",
        body: {
          employeeId,
          dayOfWeek: pattern.dayOfWeek,
          startTime: new Date(1970, 0, 1, ph, pm).toISOString(),
          endTime: new Date(1970, 0, 1, eh, em).toISOString(),
          isAvailable: pattern.isAvailable ?? true,
          effectiveFrom: effectiveFromIso,
          effectiveUntil: effectiveUntilIso,
        },
        user: { id: user.id, tenantId: user.tenantId, role: user.role },
      });
    })
  );

  for (const result of results) {
    if (!result.ok) {
      throw new Error(result.message || "Failed to create availability");
    }
  }

  const createdIds = results
    .map((r) => (r.ok ? (r.result as { id?: string } | null)?.id : undefined))
    .filter((id): id is string => Boolean(id));

  const createdAvailability = await database.employeeAvailability.findMany({
    where: { tenantId, id: { in: createdIds } },
  });

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
      employeeId: string;
      employeeFirstName: string | null;
      employeeLastName: string | null;
      employeeEmail: string;
      employeeRole: string;
      isAvailable: boolean;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
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
      const employeeId = avail.employeeId;
      if (!acc[employeeId]) {
        acc[employeeId] = {
          employeeId,
          employeeFirstName: avail.employeeFirstName,
          employeeLastName: avail.employeeLastName,
          employeeEmail: avail.employeeEmail,
          employeeRole: avail.employeeRole,
          availability: [],
        };
      }
      acc[employeeId].availability.push({
        isAvailable: avail.isAvailable,
        dayOfWeek: avail.dayOfWeek,
        startTime: avail.startTime,
        endTime: avail.endTime,
      });
      return acc;
    },
    {} as Record<
      string,
      {
        employeeId: string;
        employeeFirstName: string | null;
        employeeLastName: string | null;
        employeeEmail: string;
        employeeRole: string;
        availability: Array<{
          isAvailable: boolean;
          dayOfWeek: number;
          startTime: string;
          endTime: string;
        }>;
      }
    >
  );

  // Get time-off requests if requested
  let timeOffRequests: Array<{
    id: string;
    employeeId: string;
    startDate: Date;
    endDate: Date;
    status: string;
  }> = [];
  if (params.includeTimeOff) {
    timeOffRequests = await database.$queryRaw<
      Array<{
        id: string;
        employeeId: string;
        startDate: Date;
        endDate: Date;
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
        (to) => to.employeeId === employee.employeeId
      );

      return {
        employeeId: employee.employeeId,
        employeeFirstName: employee.employeeFirstName,
        employeeLastName: employee.employeeLastName,
        employeeEmail: employee.employeeEmail,
        employeeRole: employee.employeeRole,
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
      isActive: boolean;
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
