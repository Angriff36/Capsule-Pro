"use server";

import { listClients, listEvents } from "@/app/lib/manifest-client.generated";
import { auth } from "@repo/auth/server";
import { revalidatePath } from "next/cache";
import { getTenantIdForOrg, requireCurrentUser } from "@/app/lib/tenant";
import {
  activeUsers,
  countShiftsForSchedule,
  getScheduleShiftById,
  loadScheduleShifts,
  loadSchedules,
  loadUsers,
  loadVenues,
  venuesByIds,
} from "@/app/lib/scheduling/server-reads";
import {
  activeShifts,
  countOverlappingShifts,
  isDeleted,
  shiftEndDate,
  shiftStartDate,
  toDate,
} from "@/app/lib/scheduling/shift-utils";
import type { ScheduleShift } from "@/app/lib/manifest-types.generated";
import {
  type RunManifestCommandResult,
  runManifestCommand,
} from "@/lib/manifest-command";

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

function roleDuringShift(shift: ScheduleShift): string | null {
  return (
    shift.roleDuringShift ??
    ((shift as unknown as Record<string, unknown>).role_during_shift as string | null) ??
    null
  );
}

async function mapShiftRows(shifts: ScheduleShift[]): Promise<ShiftDisplayRow[]> {
  const [employees, venues] = await Promise.all([
    loadUsers(),
    venuesByIds(shifts.map((shift) => shift.locationId)),
  ]);
  const employeesById = new Map(employees.map((employee) => [employee.id, employee]));

  return shifts.map((shift) => {
    const employee = employeesById.get(shift.employeeId);
    const location = venues.get(shift.locationId);
    const shiftStart = shiftStartDate(shift);
    const shiftEnd = shiftEndDate(shift);
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
      shift_start: shiftStart ?? new Date(),
      shift_end: shiftEnd ?? new Date(),
      role_during_shift: roleDuringShift(shift),
      notes: shift.notes ?? null,
      created_at: toDate(shift.createdAt) ?? new Date(),
      updated_at: toDate(shift.updatedAt) ?? new Date(),
    };
  });
}

function matchesShiftFilters(
  shift: ScheduleShift,
  params: {
    startDate?: string;
    endDate?: string;
    employeeId?: string;
    locationId?: string;
    role?: string;
  }
): boolean {
  if (isDeleted(shift.deletedAt)) return false;

  const start = shiftStartDate(shift);
  const end = shiftEndDate(shift);

  if (params.startDate) {
    const filterStart = new Date(params.startDate);
    if (!start || start < filterStart) return false;
  }
  if (params.endDate) {
    const filterEnd = new Date(params.endDate);
    if (!end || end > filterEnd) return false;
  }
  if (params.employeeId && shift.employeeId !== params.employeeId) return false;
  if (params.locationId && shift.locationId !== params.locationId) return false;
  if (params.role && roleDuringShift(shift) !== params.role) return false;
  return true;
}

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
  if (!orgId) throw new Error("Not authenticated");
  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) throw new Error("No tenant found");

  const limit = params.limit ?? 50;
  const page = params.page ?? 1;
  const offset = (page - 1) * limit;

  const filtered = (await loadScheduleShifts())
    .filter((shift) => matchesShiftFilters(shift, params))
    .sort((a, b) => {
      const aStart = shiftStartDate(a)?.getTime() ?? 0;
      const bStart = shiftStartDate(b)?.getTime() ?? 0;
      return bStart - aStart;
    });

  const totalCount = filtered.length;
  const pageRecords = filtered.slice(offset, offset + limit);
  const shifts = await mapShiftRows(pageRecords);

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

export async function getShift(shiftId: string) {
  const { orgId } = await auth();
  if (!orgId) throw new Error("Not authenticated");
  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) throw new Error("No tenant found");

  const shiftRecord = await getScheduleShiftById(shiftId);
  if (!shiftRecord) throw new Error("Shift not found");

  const [shift] = await mapShiftRows([shiftRecord]);
  return { shift };
}

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
  const allShifts = await loadScheduleShifts();

  const employees = activeUsers(await loadUsers())
    .filter(
      (emp) => !params.requiredRole || emp.role === params.requiredRole
    )
    .sort((a, b) => {
      const last = (a.lastName ?? "").localeCompare(b.lastName ?? "");
      return last !== 0 ? last : (a.firstName ?? "").localeCompare(b.firstName ?? "");
    });

  const employeesWithConflicts = await Promise.all(
    employees.map(async (emp) => {
      const conflictingShiftRecords = activeShifts(allShifts)
        .filter((shift) => {
          if (shift.employeeId !== emp.id) return false;
          const shiftStart = shiftStartDate(shift);
          const shiftEnd = shiftEndDate(shift);
          if (!shiftStart || !shiftEnd) return false;
          return (
            shiftStart < endDate &&
            shiftEnd > startDate &&
            (!params.excludeShiftId || shift.id !== params.excludeShiftId)
          );
        })
        .sort((a, b) => {
          const aStart = shiftStartDate(a)?.getTime() ?? 0;
          const bStart = shiftStartDate(b)?.getTime() ?? 0;
          return aStart - bStart;
        });

      const locations = await venuesByIds(
        conflictingShiftRecords.map((shift) => shift.locationId)
      );

      return {
        id: emp.id,
        first_name: emp.firstName ?? null,
        last_name: emp.lastName ?? null,
        email: emp.email,
        role: emp.role ?? "staff",
        is_active: emp.isActive ?? true,
        hasConflictingShift: conflictingShiftRecords.length > 0,
        conflictingShifts: conflictingShiftRecords.map((shift) => ({
          id: shift.id,
          shiftStart: shiftStartDate(shift) ?? new Date(),
          shiftEnd: shiftEndDate(shift) ?? new Date(),
          locationName: locations.get(shift.locationId)?.name ?? "",
        })),
      };
    })
  );

  return { employees: employeesWithConflicts };
}

export async function createShift(formData: FormData) {
  const { tenantId, user } = await resolveScheduleContext();

  const scheduleId = formData.get("scheduleId") as string;
  const employeeId = formData.get("employeeId") as string;
  const shiftStart = formData.get("shiftStart") as string;
  const shiftEnd = formData.get("shiftEnd") as string;
  const roleDuringShiftValue = formData.get("roleDuringShift") as string | null;
  const notes = formData.get("notes") as string | null;
  const allowHistorical = formData.get("allowHistorical") === "true";
  const allowOverlap = formData.get("allowOverlap") === "true";

  if (!(scheduleId && employeeId && shiftStart && shiftEnd)) {
    throw new Error("Schedule, employee, and times are required");
  }

  const startDate = new Date(shiftStart);
  const endDate = new Date(shiftEnd);

  if (endDate <= startDate) {
    throw new Error("End time must be after start time");
  }

  if (!allowHistorical && endDate < new Date()) {
    throw new Error("Cannot create shifts in the past");
  }

  if (!allowOverlap) {
    const overlapCount = countOverlappingShifts(
      await loadScheduleShifts(),
      employeeId,
      startDate,
      endDate
    );

    if (overlapCount > 0) {
      throw new Error("Employee has overlapping shifts");
    }
  }

  const body = {
    scheduleId,
    employeeId,
    shiftStart: startDate.getTime(),
    shiftEnd: endDate.getTime(),
    roleDuringShift: roleDuringShiftValue || "",
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

export async function updateShift(shiftId: string, formData: FormData) {
  const { user } = await resolveScheduleContext();

  const employeeId = formData.get("employeeId") as string;
  const locationId = formData.get("locationId") as string;
  const shiftStart = formData.get("shiftStart") as string;
  const shiftEnd = formData.get("shiftEnd") as string;
  const roleDuringShiftValue = formData.get("roleDuringShift") as string | null;
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

  if (!allowOverlap) {
    const overlapCount = countOverlappingShifts(
      await loadScheduleShifts(),
      employeeId,
      startDate,
      endDate,
      shiftId
    );

    if (overlapCount > 0) {
      throw new Error("Employee has overlapping shifts");
    }
  }

  const body = {
    employeeId,
    locationId,
    shiftStart: startDate.getTime(),
    shiftEnd: endDate.getTime(),
    roleDuringShift: roleDuringShiftValue || "",
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

export async function getEmployees(params?: {
  search?: string;
  locationId?: string;
  role?: string;
  activeOnly?: boolean;
}) {
  const { orgId } = await auth();
  if (!orgId) throw new Error("Not authenticated");
  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) throw new Error("No tenant found");

  const search = params?.search?.toLowerCase();
  const employees = activeUsers(await loadUsers())
    .filter((employee) => {
      if (params?.activeOnly === false) return true;
      return employee.isActive;
    })
    .filter((employee) => !params?.role || employee.role === params.role)
    .filter((employee) => {
      if (!search) return true;
      return [employee.firstName, employee.lastName, employee.email]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search));
    })
    .map((employee) => ({
      id: employee.id,
      first_name: employee.firstName ?? null,
      last_name: employee.lastName ?? null,
      email: employee.email,
      role: employee.role ?? "staff",
      is_active: employee.isActive ?? true,
      phone: employee.phone,
    }));

  return { employees };
}

export async function getLocations(params?: {
  search?: string;
  activeOnly?: boolean;
}) {
  const { orgId } = await auth();
  if (!orgId) throw new Error("Not authenticated");
  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) throw new Error("No tenant found");

  const search = params?.search?.toLowerCase();
  const locations = (await loadVenues())
    .filter((venue) => !isDeleted(venue.deletedAt))
    .filter((venue) => params?.activeOnly === false || venue.isActive !== false)
    .filter((venue) => !search || (venue.name ?? "").toLowerCase().includes(search))
    .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""))
    .slice(0, 50)
    .map((venue) => ({
      id: venue.id,
      name: venue.name ?? "",
      address: venue.addressLine1 ?? "",
      is_active: venue.isActive ?? true,
    }));

  return { locations };
}

export async function getSchedules(params?: {
  search?: string;
  status?: string;
  locationId?: string;
}) {
  const { orgId } = await auth();
  if (!orgId) throw new Error("Not authenticated");
  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) throw new Error("No tenant found");

  const [allSchedules, allShifts, allVenues] = await Promise.all([
    loadSchedules(),
    loadScheduleShifts(),
    loadVenues(),
  ]);

  const venuesByName = allVenues.filter(
    (venue) =>
      !isDeleted(venue.deletedAt) &&
      (!params?.search ||
        (venue.name ?? "").toLowerCase().includes(params.search.toLowerCase()))
  );

  const locationIds = params?.locationId
    ? [params.locationId]
    : params?.search
      ? venuesByName.map((venue) => venue.id)
      : undefined;

  const scheduleRecords =
    params?.search && locationIds?.length === 0
      ? []
      : allSchedules
          .filter((schedule) => !isDeleted(schedule.deletedAt))
          .filter(
            (schedule) => !params?.status || schedule.status === params.status
          )
          .filter(
            (schedule) =>
              !locationIds ||
              (schedule.locationId && locationIds.includes(schedule.locationId))
          )
          .sort((a, b) => {
            const aDate = toDate(a.scheduleDate)?.getTime() ?? 0;
            const bDate = toDate(b.scheduleDate)?.getTime() ?? 0;
            return bDate - aDate;
          })
          .slice(0, 50);

  const scheduleLocations = await venuesByIds(
    scheduleRecords
      .map((schedule) => schedule.locationId ?? "")
      .filter(Boolean)
  );

  const schedules = scheduleRecords.map((schedule) => {
    const scheduleDate = toDate(schedule.scheduleDate) ?? new Date();
    return {
      id: schedule.id,
      schedule_date: scheduleDate,
      status: schedule.status ?? "",
      location_id: schedule.locationId ?? "",
      location_name: schedule.locationId
        ? (scheduleLocations.get(schedule.locationId)?.name ?? "")
        : "",
      shift_count: BigInt(countShiftsForSchedule(allShifts, schedule.id)),
    };
  });

  return { schedules };
}

export async function getEvents(params?: {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const { orgId } = await auth();
  if (!orgId) throw new Error("Not authenticated");
  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) throw new Error("No tenant found");

  let eventRecords = (await listEvents()).data;
  if (params?.dateFrom) {
    const fromMs = new Date(params.dateFrom).getTime();
    eventRecords = eventRecords.filter(
      (event) => new Date(String(event.eventDate)).getTime() >= fromMs
    );
  }
  if (params?.dateTo) {
    const toMs = new Date(params.dateTo).getTime();
    eventRecords = eventRecords.filter(
      (event) => new Date(String(event.eventDate)).getTime() <= toMs
    );
  }
  if (params?.search) {
    const q = params.search.toLowerCase();
    eventRecords = eventRecords.filter((event) =>
      String(event.title ?? "").toLowerCase().includes(q)
    );
  }
  eventRecords = [...eventRecords]
    .sort(
      (a, b) =>
        new Date(String(b.eventDate)).getTime() -
        new Date(String(a.eventDate)).getTime()
    )
    .slice(0, 50);

  const [clients, eventLocations] = await Promise.all([
    (await listClients()).data,
    venuesByIds(
      eventRecords
        .map((event) => event.locationId ?? "")
        .filter((id): id is string => Boolean(id))
    ),
  ]);

  const clientsById = new Map(clients.map((client) => [client.id, client]));
  const events = eventRecords.map((event) => {
    const client = event.clientId ? clientsById.get(event.clientId) : undefined;
    const clientName =
      client?.companyName ||
      [client?.firstName, client?.lastName].filter(Boolean).join(" ");
    return {
      id: event.id,
      name: event.title,
      event_date: event.eventDate,
      status: event.status,
      client_id: event.clientId ?? "",
      client_name: clientName,
      location_id: event.locationId ?? "",
      location_name: event.locationId
        ? (eventLocations.get(event.locationId)?.name ?? "")
        : "",
    };
  });

  return {
    events: events.map((event) => ({
      id: event.id,
      title: event.name,
      eventDate: event.event_date,
      eventType: "event",
      status: event.status,
      clientId: event.client_id,
      clientName: event.client_name,
      locationId: event.location_id,
      locationName: event.location_name,
    })),
  };
}
