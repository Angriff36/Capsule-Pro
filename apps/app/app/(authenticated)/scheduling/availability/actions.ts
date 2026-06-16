"use server";

import { auth } from "@repo/auth/server";
import { revalidatePath } from "next/cache";
import type {
  AvailabilityFilters,
  DayOfWeek,
} from "@/app/lib/staff/availability/types";
import { getTenantIdForOrg, requireCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest-command";
import {
  activeUsers,
  getEmployeeAvailabilityById,
  loadEmployeeAvailabilities,
  loadTimeOffRequests,
  loadUsers,
} from "@/app/lib/scheduling/server-reads";
import { isDeleted, toDate } from "@/app/lib/scheduling/shift-utils";
import type { EmployeeAvailability, User } from "@/app/lib/manifest-types.generated";

type AvailabilityRow = {
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
};

function formatTimeValue(value: unknown): string {
  const date = toDate(value);
  if (!date) return String(value ?? "");
  const hours = date.getUTCHours().toString().padStart(2, "0");
  const minutes = date.getUTCMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function isEffectiveOnDate(record: EmployeeAvailability, date: Date): boolean {
  const effectiveFrom = toDate(record.effectiveFrom) ?? date;
  const effectiveUntil = toDate(record.effectiveUntil) ?? date;
  return date >= effectiveFrom && date <= effectiveUntil;
}

function mapAvailabilityRow(
  record: EmployeeAvailability,
  user?: User
): AvailabilityRow {
  return {
    id: record.id,
    employeeId: record.employeeId ?? "",
    employeeFirstName: user?.firstName ?? null,
    employeeLastName: user?.lastName ?? null,
    employeeEmail: user?.email ?? "",
    employeeRole: user?.role ?? "staff",
    dayOfWeek: record.dayOfWeek ?? 0,
    startTime: formatTimeValue(record.startTime),
    endTime: formatTimeValue(record.endTime),
    isAvailable: record.isAvailable ?? true,
    effectiveFrom: toDate(record.effectiveFrom) ?? new Date(),
    effectiveUntil: toDate(record.effectiveUntil),
    createdAt: toDate(record.createdAt) ?? new Date(),
    updatedAt: toDate(record.updatedAt) ?? new Date(),
  };
}

function filterAvailabilityRecords(
  records: EmployeeAvailability[],
  params: AvailabilityFilters
): EmployeeAvailability[] {
  const effectiveDate = params.effectiveDate
    ? new Date(params.effectiveDate)
    : params.isActive
      ? new Date()
      : null;

  return records.filter((record) => {
    if (isDeleted(record.deletedAt)) return false;
    if (params.employeeId && record.employeeId !== params.employeeId) {
      return false;
    }
    if (
      params.dayOfWeek !== undefined &&
      params.dayOfWeek !== null &&
      record.dayOfWeek !== params.dayOfWeek
    ) {
      return false;
    }
    if (effectiveDate && !isEffectiveOnDate(record, effectiveDate)) {
      return false;
    }
    return true;
  });
}

function sortAvailabilityRows(
  rows: AvailabilityRow[]
): AvailabilityRow[] {
  return [...rows].sort((a, b) => {
    const last = (a.employeeLastName ?? "").localeCompare(b.employeeLastName ?? "");
    if (last !== 0) return last;
    const first = (a.employeeFirstName ?? "").localeCompare(
      b.employeeFirstName ?? ""
    );
    if (first !== 0) return first;
    if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
    return a.startTime.localeCompare(b.startTime);
  });
}

async function buildAvailabilityRows(
  records: EmployeeAvailability[]
): Promise<AvailabilityRow[]> {
  const users = await loadUsers();
  const usersById = new Map(users.map((user) => [user.id, user]));
  return sortAvailabilityRows(
    records.map((record) =>
      mapAvailabilityRow(record, usersById.get(record.employeeId ?? ""))
    )
  );
}

export async function getAvailability(params: AvailabilityFilters = {}) {
  const { orgId } = await auth();
  if (!orgId) throw new Error("Not authenticated");
  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) throw new Error("No tenant found");

  const limit = params.limit ?? 50;
  const page = params.page ?? 1;
  const offset = (page - 1) * limit;

  const filtered = filterAvailabilityRecords(
    await loadEmployeeAvailabilities(),
    params
  );
  const rows = await buildAvailabilityRows(filtered);
  const total = rows.length;

  return {
    availability: rows.slice(offset, offset + limit),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getAvailabilityById(availabilityId: string) {
  const { orgId } = await auth();
  if (!orgId) throw new Error("Not authenticated");
  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) throw new Error("No tenant found");

  const record = await getEmployeeAvailabilityById(availabilityId);
  if (!record) throw new Error("Availability record not found");

  const users = await loadUsers();
  const user = users.find((entry) => entry.id === record.employeeId);
  return { availability: mapAvailabilityRow(record, user) };
}

export async function createAvailability(formData: FormData) {
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

  if (!(employeeId && !Number.isNaN(dayOfWeek) && startTime && endTime)) {
    throw new Error(
      "Employee, day of week, start time, and end time are required"
    );
  }

  const createEffectiveFrom = effectiveFrom ? new Date(effectiveFrom) : new Date();
  const effectiveUntilDate = effectiveUntil ? new Date(effectiveUntil) : null;

  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  const startTimeDate = new Date(1970, 0, 1, startH, startM);
  const endTimeDate = new Date(1970, 0, 1, endH, endM);

  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (!(timeRegex.test(startTime) && timeRegex.test(endTime))) {
    throw new Error("Time must be in HH:MM format (24-hour)");
  }

  if (endTime <= startTime) {
    throw new Error("End time must be after start time");
  }

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

  const existingActive = (await loadEmployeeAvailabilities()).filter(
    (record) =>
      !isDeleted(record.deletedAt) &&
      record.employeeId === employeeId &&
      record.dayOfWeek === dayOfWeek &&
      !record.effectiveUntil
  );

  if (existingActive.length > 0) {
    throw new Error("Employee already has active availability for this day");
  }

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

  const availability = await getEmployeeAvailabilityById(createdId);
  revalidatePath("/scheduling/availability");
  return { availability };
}

export async function updateAvailability(
  availabilityId: string,
  formData: FormData
) {
  const user = await requireCurrentUser();

  const dayOfWeekRaw = formData.get("dayOfWeek") as string | undefined;
  const startTimeRaw = formData.get("startTime") as string | undefined;
  const endTimeRaw = formData.get("endTime") as string | undefined;
  const isAvailableRaw = formData.get("isAvailable") as string | undefined;
  const effectiveFromRaw = formData.get("effectiveFrom") as string | undefined;
  const effectiveUntilRaw = formData.get("effectiveUntil") as
    | string
    | null
    | undefined;

  const existing = await getEmployeeAvailabilityById(availabilityId);
  if (!existing) throw new Error("Availability record not found");

  const dayOfWeek =
    dayOfWeekRaw === undefined
      ? (existing.dayOfWeek ?? 0)
      : Number.parseInt(dayOfWeekRaw, 10);
  const startTime =
    startTimeRaw ?? formatTimeValue(existing.startTime);
  const endTime = endTimeRaw ?? formatTimeValue(existing.endTime);
  const isAvailable =
    isAvailableRaw === undefined
      ? (existing.isAvailable ?? true)
      : isAvailableRaw !== "false";
  const effectiveFrom =
    effectiveFromRaw === undefined
      ? existing.effectiveFrom ?? ""
      : effectiveFromRaw;
  const effectiveUntil =
    effectiveUntilRaw === undefined
      ? existing.effectiveUntil ?? ""
      : effectiveUntilRaw ?? "";

  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (!(timeRegex.test(startTime) && timeRegex.test(endTime))) {
    throw new Error("Time must be in HH:MM format (24-hour)");
  }

  if (endTime <= startTime) {
    throw new Error("End time must be after start time");
  }

  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  const startTimeDate = new Date(1970, 0, 1, startH, startM);
  const endTimeDate = new Date(1970, 0, 1, endH, endM);

  const effectiveFromDate = effectiveFrom ? new Date(effectiveFrom) : null;
  const effectiveUntilDate = effectiveUntil ? new Date(effectiveUntil) : null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (effectiveFromDate) {
    const fromNorm = new Date(effectiveFromDate);
    fromNorm.setHours(0, 0, 0, 0);
    if (fromNorm < today) {
      throw new Error("Effective from date cannot be in the past");
    }
    if (effectiveUntilDate && effectiveUntilDate < fromNorm) {
      throw new Error(
        "Effective until date must be on or after effective from date"
      );
    }
  }

  const result = await runManifestCommand({
    entity: "EmployeeAvailability",
    command: "update",
    body: {
      id: availabilityId,
      dayOfWeek,
      startTime: startTimeDate.toISOString(),
      endTime: endTimeDate.toISOString(),
      isAvailable,
      effectiveFrom: effectiveFromDate ? effectiveFromDate.toISOString() : "",
      effectiveUntil: effectiveUntilDate
        ? effectiveUntilDate.toISOString()
        : "",
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to update availability");
  }

  const updated = await getEmployeeAvailabilityById(availabilityId);
  revalidatePath("/scheduling/availability");
  return { availability: updated };
}

export async function deleteAvailability(availabilityId: string) {
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

export async function createBatchAvailability(formData: FormData) {
  const user = await requireCurrentUser();

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
  const createEffectiveFrom = effectiveFrom ? new Date(effectiveFrom) : new Date();
  const effectiveUntilDate = effectiveUntil ? new Date(effectiveUntil) : null;

  if (!patterns || patterns.length === 0) {
    throw new Error("At least one availability pattern must be provided");
  }

  const days = patterns.map((pattern) => pattern.dayOfWeek);
  const uniqueDays = new Set(days);
  if (days.length !== uniqueDays.size) {
    throw new Error(
      "Cannot have multiple availability patterns for the same day"
    );
  }

  for (const pattern of patterns) {
    const dayOfWeek = pattern.dayOfWeek as DayOfWeek;
    const startTime = pattern.startTime as string;
    const endTime = pattern.endTime as string;

    if (dayOfWeek < 0 || dayOfWeek > 6 || !Number.isInteger(dayOfWeek)) {
      throw new Error(
        `Invalid day of week: ${dayOfWeek}. Must be 0-6 (0=Sunday, 6=Saturday)`
      );
    }

    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!(timeRegex.test(startTime) && timeRegex.test(endTime))) {
      throw new Error("Time must be in HH:MM format (24-hour)");
    }

    if (endTime <= startTime) {
      throw new Error("End time must be after start time");
    }
  }

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

  const existingActive = (await loadEmployeeAvailabilities()).filter(
    (record) =>
      !isDeleted(record.deletedAt) &&
      record.employeeId === employeeId &&
      record.dayOfWeek != null && uniqueDays.has(record.dayOfWeek as DayOfWeek) &&
      !record.effectiveUntil
  );

  if (existingActive.length > 0) {
    throw new Error(
      "Employee already has active availability for one or more of these days"
    );
  }

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

  const createdAvailability = await loadEmployeeAvailabilities();
  revalidatePath("/scheduling/availability");
  return { availability: createdAvailability };
}

export async function getEmployeeAvailability(params: {
  employeeIds?: string[];
  startDate: string;
  endDate: string;
  includeTimeOff?: boolean;
}) {
  const { orgId } = await auth();
  if (!orgId) throw new Error("Not authenticated");
  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) throw new Error("No tenant found");

  const startDate = new Date(params.startDate);
  const endDate = new Date(params.endDate);

  const [availabilityRecords, users] = await Promise.all([
    loadEmployeeAvailabilities(),
    loadUsers(),
  ]);
  const usersById = new Map(users.map((user) => [user.id, user]));

  const availability = availabilityRecords
    .filter((record) => {
      if (isDeleted(record.deletedAt)) return false;
      if (
        params.employeeIds &&
        params.employeeIds.length > 0 &&
        !params.employeeIds.includes(record.employeeId ?? "")
      ) {
        return false;
      }
      const effectiveFrom = toDate(record.effectiveFrom) ?? startDate;
      const effectiveUntil = toDate(record.effectiveUntil) ?? endDate;
      return startDate <= effectiveUntil && endDate >= effectiveFrom;
    })
    .map((record) => {
      const user = usersById.get(record.employeeId ?? "");
      return {
        employeeId: record.employeeId ?? "",
        employeeFirstName: user?.firstName ?? null,
        employeeLastName: user?.lastName ?? null,
        employeeEmail: user?.email ?? "",
        employeeRole: user?.role ?? "staff",
        isAvailable: record.isAvailable ?? true,
        dayOfWeek: record.dayOfWeek ?? 0,
        startTime: formatTimeValue(record.startTime),
        endTime: formatTimeValue(record.endTime),
      };
    })
    .sort((a, b) => {
      const last = (a.employeeLastName ?? "").localeCompare(b.employeeLastName ?? "");
      if (last !== 0) return last;
      const first = (a.employeeFirstName ?? "").localeCompare(
        b.employeeFirstName ?? ""
      );
      if (first !== 0) return first;
      if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
      return a.startTime.localeCompare(b.startTime);
    });

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

  let timeOffRequests: Array<{
    id: string;
    employeeId: string;
    startDate: Date;
    endDate: Date;
    status: string;
  }> = [];

  if (params.includeTimeOff) {
    timeOffRequests = (await loadTimeOffRequests())
      .filter((request) => {
        if (isDeleted(request.deletedAt)) return false;
        if (!["approved", "pending", "APPROVED", "PENDING"].includes(
          request.status ?? ""
        )) {
          return false;
        }
        if (
          params.employeeIds &&
          params.employeeIds.length > 0 &&
          !params.employeeIds.includes(request.employeeId ?? "")
        ) {
          return false;
        }
        const requestStart = toDate(request.startDate);
        const requestEnd = toDate(request.endDate);
        if (!requestStart || !requestEnd) return false;
        return startDate <= requestEnd && endDate >= requestStart;
      })
      .map((request) => ({
        id: request.id,
        employeeId: request.employeeId ?? "",
        startDate: toDate(request.startDate) ?? new Date(),
        endDate: toDate(request.endDate) ?? new Date(),
        status: request.status ?? "",
      }))
      .sort(
        (a, b) => a.startDate.getTime() - b.startDate.getTime()
      );
  }

  const employeesWithAvailability = Object.values(availabilityByEmployee).map(
    (employee) => {
      const employeeTimeOff = timeOffRequests.filter(
        (entry) => entry.employeeId === employee.employeeId
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

export async function getEmployees() {
  const { orgId } = await auth();
  if (!orgId) throw new Error("Not authenticated");
  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) throw new Error("No tenant found");

  const employees = activeUsers(await loadUsers())
    .map((employee) => ({
      id: employee.id,
      email: employee.email,
      first_name: employee.firstName ?? null,
      last_name: employee.lastName ?? null,
      role: employee.role ?? "staff",
      isActive: employee.isActive ?? true,
    }))
    .sort((a, b) => {
      const last = (a.last_name ?? "").localeCompare(b.last_name ?? "");
      return last !== 0 ? last : (a.first_name ?? "").localeCompare(b.first_name ?? "");
    });

  return { employees };
}
