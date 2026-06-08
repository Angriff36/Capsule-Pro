"use server";

import { auth } from "@repo/auth/server";
import { database, type Prisma } from "@repo/database";
import { revalidatePath } from "next/cache";
import { getTenantIdForOrg, requireCurrentUser } from "@/app/lib/tenant";
import {
  runManifestCommand,
  type RunManifestCommandResult,
} from "@/lib/manifest-command";

// ---------------------------------------------------------------------------
// Shared helpers for manifest-wired mutations
// ---------------------------------------------------------------------------

async function resolveScheduleContext() {
  const user = await requireCurrentUser();
  return {
    tenantId: user.tenantId,
    userId: user.id,
    user: {
      id: user.id,
      tenantId: user.tenantId,
      role: user.role,
    },
  };
}

function formatManifestFailure(
  action: string,
  result: Extract<RunManifestCommandResult, { ok: false }>
): string {
  const detail =
    (result.guardFailure as { formatted?: string } | undefined)?.formatted ??
    (result.policyDenial as { policyName?: string } | undefined)?.policyName ??
    result.message;
  return `Failed to ${action} shift: ${detail}`;
}

// ---------------------------------------------------------------------------
// Read / get helpers (unchanged — these are query-only)
// ---------------------------------------------------------------------------

type ShiftDisplayRow = {
  id: string;
  schedule_id: string;
  employeeId: string;
  employeeFirstName: string | null;
  employeeLastName: string | null;
  employeeEmail: string;
  employeeRole: string;
  location_id: string;
  location_name: string;
  shift_start: Date;
  shift_end: Date;
  role_during_shift: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
};

async function mapShiftRows(
  tenantId: string,
  shifts: Array<{
    id: string;
    scheduleId: string;
    employeeId: string;
    locationId: string;
    shift_start: Date;
    shift_end: Date;
    role_during_shift: string | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>
): Promise<ShiftDisplayRow[]> {
  const [employees, locations] = await Promise.all([
    database.user.findMany({
      where: {
        tenantId,
        id: { in: shifts.map((shift) => shift.employeeId) },
        deletedAt: null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
      },
    }),
    database.location.findMany({
      where: {
        tenantId,
        id: { in: shifts.map((shift) => shift.locationId) },
        deletedAt: null,
      },
      select: { id: true, name: true },
    }),
  ]);
  const employeesById = new Map(employees.map((employee) => [employee.id, employee]));
  const locationsById = new Map(locations.map((location) => [location.id, location]));

  return shifts.map((shift) => {
    const employee = employeesById.get(shift.employeeId);
    const location = locationsById.get(shift.locationId);
    return {
      id: shift.id,
      schedule_id: shift.scheduleId,
      employeeId: shift.employeeId,
      employeeFirstName: employee?.firstName ?? null,
      employeeLastName: employee?.lastName ?? null,
      employeeEmail: employee?.email ?? "",
      employeeRole: employee?.role ?? "staff",
      location_id: shift.locationId,
      location_name: location?.name ?? "",
      shift_start: shift.shift_start,
      shift_end: shift.shift_end,
      role_during_shift: shift.role_during_shift,
      notes: shift.notes,
      created_at: shift.createdAt,
      updated_at: shift.updatedAt,
    };
  });
}

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

  const where: Prisma.ScheduleShiftWhereInput = {
    tenantId,
    deletedAt: null,
    ...(params.startDate
      ? { shift_start: { gte: new Date(params.startDate) } }
      : {}),
    ...(params.endDate ? { shift_end: { lte: new Date(params.endDate) } } : {}),
    ...(params.employeeId ? { employeeId: params.employeeId } : {}),
    ...(params.locationId ? { locationId: params.locationId } : {}),
    ...(params.role ? { role_during_shift: params.role } : {}),
  };

  // Fetch shifts and count
  const [shiftRecords, totalCount] = await Promise.all([
    database.scheduleShift.findMany({
      where,
      orderBy: { shift_start: "asc" },
      take: limit,
      skip: offset,
    }),
    database.scheduleShift.count({ where }),
  ]);
  const shifts = await mapShiftRows(tenantId, shiftRecords);

  return {
    shifts,
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limit),
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

  const shiftRecord = await database.scheduleShift.findFirst({
    where: { tenantId, id: shiftId, deletedAt: null },
  });

  if (!shiftRecord) {
    throw new Error("Shift not found");
  }

  const [shift] = await mapShiftRows(tenantId, [shiftRecord]);
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

  const employees = await database.user.findMany({
    where: {
      tenantId,
      deletedAt: null,
      isActive: true,
      ...(params.requiredRole ? { role: params.requiredRole } : {}),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      isActive: true,
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  // For employees with conflicts, get their conflicting shifts
  const employeesWithConflicts = await Promise.all(
    employees.map(async (emp) => {
      const conflictingShiftRecords = await database.scheduleShift.findMany({
        where: {
          tenantId,
          employeeId: emp.id,
          deletedAt: null,
          shift_start: { lt: endDate },
          shift_end: { gt: startDate },
          ...(params.excludeShiftId ? { id: { not: params.excludeShiftId } } : {}),
        },
        orderBy: { shift_start: "asc" },
      });
      const locations = await database.location.findMany({
        where: {
          tenantId,
          id: { in: conflictingShiftRecords.map((shift) => shift.locationId) },
          deletedAt: null,
        },
        select: { id: true, name: true },
      });
      const locationsById = new Map(locations.map((location) => [location.id, location]));

      return {
        id: emp.id,
        first_name: emp.firstName,
        last_name: emp.lastName,
        email: emp.email,
        role: emp.role,
        is_active: emp.isActive,
        hasConflictingShift: conflictingShiftRecords.length > 0,
        conflictingShifts: conflictingShiftRecords.map((shift) => ({
          id: shift.id,
          shiftStart: shift.shift_start,
          shiftEnd: shift.shift_end,
          locationName: locationsById.get(shift.locationId)?.name ?? "",
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
  const { tenantId, user } = await resolveScheduleContext();

  const scheduleId = formData.get("scheduleId") as string;
  const employeeId = formData.get("employeeId") as string;
  const shiftStart = formData.get("shiftStart") as string;
  const shiftEnd = formData.get("shiftEnd") as string;
  const roleDuringShift = formData.get("roleDuringShift") as string | null;
  const notes = formData.get("notes") as string | null;
  const allowHistorical = formData.get("allowHistorical") === "true";
  const allowOverlap = formData.get("allowOverlap") === "true";

  // Basic required-field guard (fast-fail before hitting the DB)
  // Note: locationId is auto-inherited from parent Schedule via parent-context propagation
  if (!(scheduleId && employeeId && shiftStart && shiftEnd)) {
    throw new Error("Schedule, employee, and times are required");
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
    const overlapCount = await database.scheduleShift.count({
      where: {
        tenantId,
        employeeId,
        deletedAt: null,
        shift_start: { lt: endDate },
        shift_end: { gt: startDate },
      },
    });

    if (overlapCount > 0) {
      throw new Error("Employee has overlapping shifts");
    }
  }

  // --- Manifest runtime write ---
  const body = {
    scheduleId,
    employeeId,
    shiftStart: startDate.getTime(),
    shiftEnd: endDate.getTime(),
    roleDuringShift: roleDuringShift || "",
    notes: notes || "",
  };

  const result = await runManifestCommand({
    entity: "ScheduleShift",
    command: "create",
    body,
    user,
  });

  if (!result.ok) {
    throw new Error(formatManifestFailure("create", result));
  }

  revalidatePath("/scheduling/shifts");
  return { shift: result.result };
}

/**
 * Update an existing shift via manifest runtime.
 */
export async function updateShift(shiftId: string, formData: FormData) {
  const { tenantId, user } = await resolveScheduleContext();

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
    const overlapCount = await database.scheduleShift.count({
      where: {
        tenantId,
        employeeId,
        id: { not: shiftId },
        deletedAt: null,
        shift_start: { lt: endDate },
        shift_end: { gt: startDate },
      },
    });

    if (overlapCount > 0) {
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

  const result = await runManifestCommand({
    entity: "ScheduleShift",
    command: "update",
    body,
    user,
    instanceId: shiftId,
  });

  if (!result.ok) {
    throw new Error(formatManifestFailure("update", result));
  }

  revalidatePath("/scheduling/shifts");
  return { shift: result.result };
}

/**
 * Soft-delete a shift via manifest runtime's remove command.
 */
export async function deleteShift(shiftId: string) {
  const { user, userId } = await resolveScheduleContext();

  const result = await runManifestCommand({
    entity: "ScheduleShift",
    command: "remove",
    body: { userId },
    user,
    instanceId: shiftId,
  });

  if (!result.ok) {
    throw new Error(formatManifestFailure("delete", result));
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

  const employeeWhere: Prisma.UserWhereInput = {
    tenantId,
    deletedAt: null,
    ...(params?.activeOnly !== false ? { isActive: true } : {}),
    ...(params?.role ? { role: params.role } : {}),
    ...(params?.search
      ? {
          OR: [
            { firstName: { contains: params.search, mode: "insensitive" } },
            { lastName: { contains: params.search, mode: "insensitive" } },
            { email: { contains: params.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const employeeRecords = await database.user.findMany({
    where: employeeWhere,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      isActive: true,
      phone: true,
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 50,
  });
  const employees = employeeRecords.map((employee) => ({
    id: employee.id,
    first_name: employee.firstName,
    last_name: employee.lastName,
    email: employee.email,
    role: employee.role,
    is_active: employee.isActive,
    phone: employee.phone,
  }));

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

  const locationRecords = await database.location.findMany({
    where: {
      tenantId,
      deletedAt: null,
      ...(params?.activeOnly !== false ? { isActive: true } : {}),
      ...(params?.search
        ? { name: { contains: params.search, mode: "insensitive" } }
        : {}),
    },
    select: {
      id: true,
      name: true,
      addressLine1: true,
      isActive: true,
    },
    orderBy: { name: "asc" },
    take: 50,
  });
  const locations = locationRecords.map((location) => ({
    id: location.id,
    name: location.name,
    address: location.addressLine1,
    is_active: location.isActive,
  }));

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

  const matchingLocations = params?.search
    ? await database.location.findMany({
        where: {
          tenantId,
          deletedAt: null,
          name: { contains: params.search, mode: "insensitive" },
        },
        select: { id: true, name: true },
      })
    : [];
  const locationIds = params?.locationId
    ? [params.locationId]
    : params?.search
      ? matchingLocations.map((location) => location.id)
      : undefined;
  const scheduleRecords =
    params?.search && locationIds?.length === 0
      ? []
      : await database.schedule.findMany({
          where: {
            tenantId,
            deletedAt: null,
            ...(params?.status ? { status: params.status } : {}),
            ...(locationIds ? { locationId: { in: locationIds } } : {}),
          },
          orderBy: { schedule_date: "desc" },
          take: 50,
        });
  const [scheduleLocations, shiftCounts] = await Promise.all([
    database.location.findMany({
      where: {
        tenantId,
        id: {
          in: scheduleRecords
            .map((schedule) => schedule.locationId)
            .filter((id): id is string => Boolean(id)),
        },
      },
      select: { id: true, name: true },
    }),
    Promise.all(
      scheduleRecords.map((schedule) =>
        database.scheduleShift.count({
          where: { tenantId, scheduleId: schedule.id, deletedAt: null },
        })
      )
    ),
  ]);
  const scheduleLocationsById = new Map(
    scheduleLocations.map((location) => [location.id, location])
  );
  const schedules = scheduleRecords.map((schedule, index) => ({
    id: schedule.id,
    schedule_date: schedule.schedule_date,
    status: schedule.status,
    location_id: schedule.locationId ?? "",
    location_name: schedule.locationId
      ? (scheduleLocationsById.get(schedule.locationId)?.name ?? "")
      : "",
    shift_count: BigInt(shiftCounts[index] ?? 0),
  }));

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

  const eventRecords = await database.event.findMany({
    where: {
      tenantId,
      deletedAt: null,
      ...(params?.dateFrom
        ? { eventDate: { gte: new Date(params.dateFrom) } }
        : {}),
      ...(params?.dateTo
        ? { eventDate: { lte: new Date(params.dateTo) } }
        : {}),
      ...(params?.search
        ? { title: { contains: params.search, mode: "insensitive" } }
        : {}),
    },
    orderBy: { eventDate: "desc" },
    take: 50,
  });
  const [clients, eventLocations] = await Promise.all([
    database.client.findMany({
      where: {
        tenantId,
        id: {
          in: eventRecords
            .map((event) => event.clientId)
            .filter((id): id is string => Boolean(id)),
        },
        deletedAt: null,
      },
      select: { id: true, company_name: true, first_name: true, last_name: true },
    }),
    database.location.findMany({
      where: {
        tenantId,
        id: {
          in: eventRecords
            .map((event) => event.locationId)
            .filter((id): id is string => Boolean(id)),
        },
        deletedAt: null,
      },
      select: { id: true, name: true },
    }),
  ]);
  const clientsById = new Map(clients.map((client) => [client.id, client]));
  const eventLocationsById = new Map(
    eventLocations.map((location) => [location.id, location])
  );
  const events = eventRecords.map((event) => {
    const client = event.clientId ? clientsById.get(event.clientId) : undefined;
    const clientName =
      client?.company_name ||
      [client?.first_name, client?.last_name].filter(Boolean).join(" ");
    return {
      id: event.id,
      name: event.title,
      event_date: event.eventDate,
      status: event.status,
      client_id: event.clientId ?? "",
      client_name: clientName,
      location_id: event.locationId ?? "",
      location_name: event.locationId
        ? (eventLocationsById.get(event.locationId)?.name ?? "")
        : "",
    };
  });

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
