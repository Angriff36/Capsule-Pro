"use server";

import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { revalidatePath } from "next/cache";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { createManifestRuntime } from "@/lib/manifest-runtime";
import type { RuntimeEngine } from "@angriff36/manifest";
import { requireCurrentUser } from "@/app/lib/tenant";

// ---------------------------------------------------------------------------
// Shared helpers for manifest-wired mutations
// ---------------------------------------------------------------------------

/**
 * Resolve auth context + create a manifest runtime wired to ScheduleShift.
 *
 * Combines Clerk auth → tenant → internal user into a runtime ready for
 * `runCommand("create"|"update"|"remove", body, { entityName: "ScheduleShift" })`.
 */
async function resolveScheduleRuntime(): Promise<{
  runtime: RuntimeEngine;
  tenantId: string;
  userId: string;
}> {
  const { userId: clerkId } = await auth();
  const user = await requireCurrentUser();
  const { orgId } = await auth();
  const tenantId = user.tenantId;

  const runtime = await createManifestRuntime({
    user: { id: user.id, tenantId, role: user.role },
    entityName: "ScheduleShift",
  });

  return { runtime, tenantId, userId: user.id };
}

// ---------------------------------------------------------------------------
// Read / get helpers (unchanged — these are query-only)
// ---------------------------------------------------------------------------

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
  const hasStartDate = Boolean(params.startDate);
  const hasEndDate = Boolean(params.endDate);
  const hasEmployeeId = Boolean(params.employeeId);
  const hasLocationId = Boolean(params.locationId);
  const hasRole = Boolean(params.role);

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
  if (!orgId) {
    throw new Error("Not authenticated");
  }
  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) {
    throw new Error("No tenant found");
  }

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
  if (!orgId) {
    throw new Error("Not authenticated");
  }
  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) {
    throw new Error("No tenant found");
  }

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

// ---------------------------------------------------------------------------
// Mutation actions — wired through manifest runtime for guard/policy enforcement
// ---------------------------------------------------------------------------

/**
 * Create a new shift via manifest runtime.
 *
 * Business-rule validation (historical check, overlap detection) remains as
 * pre-checks before the manifest call. The manifest runtime enforces its own
 * guards (non-null scheduleId, employeeId) and policies.
 */
export async function createShift(formData: FormData) {
  const { runtime, tenantId } = await resolveScheduleRuntime();

  const scheduleId = formData.get("scheduleId") as string;
  const employeeId = formData.get("employeeId") as string;
  const locationId = formData.get("locationId") as string;
  const shiftStart = formData.get("shiftStart") as string;
  const shiftEnd = formData.get("shiftEnd") as string;
  const roleDuringShift = formData.get("roleDuringShift") as string | null;
  const notes = formData.get("notes") as string | null;
  const allowHistorical = formData.get("allowHistorical") === "true";
  const allowOverlap = formData.get("allowOverlap") === "true";

  // Basic required-field guard (fast-fail before hitting the DB)
  if (!(scheduleId && employeeId && locationId && shiftStart && shiftEnd)) {
    throw new Error("Schedule, employee, location, and times are required");
  }

  const startDate = new Date(shiftStart);
  const endDate = new Date(shiftEnd);

  // Time-order validation
  if (endDate <= startDate) {
    throw new Error("End time must be after start time");
  }

  // No-past-shift rule (business policy, not enforced by manifest today)
  if (!allowHistorical && endDate < new Date()) {
    throw new Error("Cannot create shifts in the past");
  }

  // Overlap detection (business policy — keep as pre-check until manifest
  // gets an overlap constraint)
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
      throw new Error("Employee has overlapping shifts");
    }
  }

  // --- Manifest runtime write ---
  const body = {
    scheduleId,
    employeeId,
    locationId,
    shiftStart: startDate.getTime(),
    shiftEnd: endDate.getTime(),
    roleDuringShift: roleDuringShift || "",
    notes: notes || "",
  };

  const result = await runtime.runCommand("create", body, {
    entityName: "ScheduleShift",
  });

  if (!result.success) {
    const detail =
      result.guardFailure?.formatted ??
      result.policyDenial ??
      result.error ??
      "Unknown error";
    throw new Error(`Failed to create shift: ${detail}`);
  }

  revalidatePath("/scheduling/shifts");
  return { shift: result.result };
}

/**
 * Update an existing shift via manifest runtime.
 */
export async function updateShift(shiftId: string, formData: FormData) {
  const { runtime, tenantId } = await resolveScheduleRuntime();

  // The manifest update command does NOT accept scheduleId —
  // a shift's parent schedule is immutable.
  const employeeId = formData.get("employeeId") as string;
  const locationId = formData.get("locationId") as string;
  const shiftStart = formData.get("shiftStart") as string;
  const shiftEnd = formData.get("shiftEnd") as string;
  const roleDuringShift = formData.get("roleDuringShift") as string | null;
  const notes = formData.get("notes") as string | null;
  const allowOverlap = formData.get("allowOverlap") === "true";

  if (!(employeeId && locationId && shiftStart && shiftEnd)) {
    throw new Error("Employee, location, and times are required");
  }

  const startDate = new Date(shiftStart);
  const endDate = new Date(shiftEnd);

  if (endDate <= startDate) {
    throw new Error("End time must be after start time");
  }

  // Overlap detection (excluding current shift)
  if (!allowOverlap) {
    const [overlap] = await database.$queryRaw<Array<{ count: bigint }>>(
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

  // --- Manifest runtime write ---
  const body = {
    employeeId,
    locationId,
    shiftStart: startDate.getTime(),
    shiftEnd: endDate.getTime(),
    roleDuringShift: roleDuringShift || "",
    notes: notes || "",
  };

  const result = await runtime.runCommand("update", body, {
    entityName: "ScheduleShift",
    instanceId: shiftId,
  });

  if (!result.success) {
    const detail =
      result.guardFailure?.formatted ??
      result.policyDenial ??
      result.error ??
      "Unknown error";
    throw new Error(`Failed to update shift: ${detail}`);
  }

  revalidatePath("/scheduling/shifts");
  return { shift: result.result };
}

/**
 * Soft-delete a shift via manifest runtime's remove command.
 */
export async function deleteShift(shiftId: string) {
  const { runtime, userId } = await resolveScheduleRuntime();

  const body = { userId };

  const result = await runtime.runCommand("remove", body, {
    entityName: "ScheduleShift",
    instanceId: shiftId,
  });

  if (!result.success) {
    const detail =
      result.guardFailure?.formatted ??
      result.policyDenial ??
      result.error ??
      "Unknown error";
    throw new Error(`Failed to delete shift: ${detail}`);
  }

  revalidatePath("/scheduling/shifts");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Dropdown / lookup helpers (unchanged)
// ---------------------------------------------------------------------------

/**
 * Get all employees for dropdown
 */
export async function getEmployees(params?: {
  search?: string;
  locationId?: string;
  role?: string;
  activeOnly?: boolean;
}) {
  const { orgId } = await auth();
  if (!orgId) {
    throw new Error("Not authenticated");
  }
  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) {
    throw new Error("No tenant found");
  }

  const hasSearch = Boolean(params?.search);
  const hasLocationId = Boolean(params?.locationId);
  const hasRole = Boolean(params?.role);

  const employees = await database.$queryRaw<
    Array<{
      id: string;
      first_name: string | null;
      last_name: string | null;
      email: string;
      role: string;
      is_active: boolean;
      phone: string | null;
    }>
  >(
    Prisma.sql`
      SELECT
        id, first_name, last_name, email, role, is_active, phone
      FROM tenant_staff.employees
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
        ${params?.activeOnly !== false ? Prisma.sql`AND is_active = true` : Prisma.empty}
        ${hasSearch ? Prisma.sql`AND (
          first_name ILIKE ${"%" + params!.search! + "%"}
          OR last_name ILIKE ${"%" + params!.search! + "%"}
          OR email ILIKE ${"%" + params!.search! + "%"}
        )` : Prisma.empty}
        ${hasRole ? Prisma.sql`AND role = ${params!.role!}` : Prisma.empty}
      ORDER BY last_name ASC, first_name ASC
      LIMIT 50
    `
  );

  return { employees };
}

/**
 * Get all locations for dropdown
 */
export async function getLocations(params?: {
  search?: string;
  activeOnly?: boolean;
}) {
  const { orgId } = await auth();
  if (!orgId) {
    throw new Error("Not authenticated");
  }
  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) {
    throw new Error("No tenant found");
  }

  const hasSearch = Boolean(params?.search);

  const locations = await database.$queryRaw<
    Array<{
      id: string;
      name: string;
      address: string | null;
      is_active: boolean;
    }>
  >(
    Prisma.sql`
      SELECT id, name, address, is_active
      FROM tenant.locations
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
        ${params?.activeOnly !== false ? Prisma.sql`AND is_active = true` : Prisma.empty}
        ${hasSearch ? Prisma.sql`AND name ILIKE ${"%" + params!.search! + "%"}` : Prisma.empty}
      ORDER BY name ASC
      LIMIT 50
    `
  );

  return { locations };
}

/**
 * Get all schedules for dropdown
 */
export async function getSchedules(params?: {
  search?: string;
  status?: string;
  locationId?: string;
}) {
  const { orgId } = await auth();
  if (!orgId) {
    throw new Error("Not authenticated");
  }
  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) {
    throw new Error("No tenant found");
  }

  const hasSearch = Boolean(params?.search);
  const hasStatus = Boolean(params?.status);
  const hasLocationId = Boolean(params?.locationId);

  const schedules = await database.$queryRaw<
    Array<{
      id: string;
      schedule_date: Date;
      status: string;
      location_id: string;
      location_name: string;
      shift_count: number;
    }>
  >(
    Prisma.sql`
      SELECT
        s.id,
        s.schedule_date,
        s.status,
        s.location_id,
        l.name AS location_name,
        s.shift_count
      FROM tenant_staff.schedules s
      JOIN tenant.locations l
        ON l.tenant_id = s.tenant_id
       AND l.id = s.location_id
      WHERE s.tenant_id = ${tenantId}
        AND s.deleted_at IS NULL
        ${hasSearch ? Prisma.sql`AND (
          l.name ILIKE ${"%" + params!.search! + "%"}
        )` : Prisma.empty}
        ${hasStatus ? Prisma.sql`AND s.status = ${params!.status!}` : Prisma.empty}
        ${hasLocationId ? Prisma.sql`AND s.location_id = ${params!.locationId!}` : Prisma.empty}
      ORDER BY s.schedule_date DESC
      LIMIT 50
    `
  );

  return { schedules };
}

/**
 * Get events for shift creation context
 */
export async function getEvents(params?: {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const { orgId } = await auth();
  if (!orgId) {
    throw new Error("Not authenticated");
  }
  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) {
    throw new Error("No tenant found");
  }

  const hasSearch = Boolean(params?.search);
  const hasDateFrom = Boolean(params?.dateFrom);
  const hasDateTo = Boolean(params?.dateTo);

  const events = await database.$queryRaw<
    Array<{
      id: string;
      name: string;
      event_date: Date;
      status: string;
      client_id: string;
      client_name: string;
      location_id: string;
      location_name: string;
    }>
  >(
    Prisma.sql`
      SELECT
        e.id,
        e.name,
        e.event_date,
        e.status,
        e.client_id,
        c.name AS client_name,
        e.location_id,
        l.name AS location_name
      FROM tenant.events e
      JOIN tenant.clients c
        ON c.tenant_id = e.tenant_id
       AND c.id = e.client_id
      JOIN tenant.locations l
        ON l.tenant_id = e.tenant_id
       AND l.id = e.location_id
      WHERE e.tenant_id = ${tenantId}
        AND e.deleted_at IS NULL
        ${hasSearch ? Prisma.sql`AND (
          e.name ILIKE ${"%" + params!.search! + "%"}
          OR c.name ILIKE ${"%" + params!.search! + "%"}
        )` : Prisma.empty}
        ${hasDateFrom ? Prisma.sql`AND e.event_date >= ${new Date(params!.dateFrom!)}` : Prisma.empty}
        ${hasDateTo ? Prisma.sql`AND e.event_date <= ${new Date(params!.dateTo!)}` : Prisma.empty}
      ORDER BY e.event_date DESC
      LIMIT 50
    `
  );

  return {
    events: events.map((e) => ({
      id: e.id,
      title: e.name,
      eventDate: e.event_date,
      eventType: "event",
      status: e.status,
      clientId: e.client_id,
      clientName: e.client_name,
      locationId: e.location_id,
      locationName: e.location_name,
    })),
  };
}
