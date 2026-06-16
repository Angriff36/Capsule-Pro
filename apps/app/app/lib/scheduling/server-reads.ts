import "server-only";

import { cache } from "react";
import {
  fetchConvexList,
  fetchConvexRecord,
} from "../convex/read-bridge-server";
import type {
  EmployeeAvailability,
  Schedule,
  ScheduleShift,
  TimeOffRequest,
  User,
  Venue,
} from "../manifest-types.generated";
import { activeShifts, isDeleted } from "./shift-utils";

export const loadUsers = cache(async (): Promise<User[]> => {
  return (await fetchConvexList("User")) as User[];
});

export const loadScheduleShifts = cache(async (): Promise<ScheduleShift[]> => {
  return (await fetchConvexList("ScheduleShift")) as ScheduleShift[];
});

export const loadSchedules = cache(async (): Promise<Schedule[]> => {
  return (await fetchConvexList("Schedule")) as Schedule[];
});

export const loadEmployeeAvailabilities = cache(
  async (): Promise<EmployeeAvailability[]> => {
    return (await fetchConvexList(
      "EmployeeAvailability"
    )) as EmployeeAvailability[];
  }
);

export const loadTimeOffRequests = cache(async (): Promise<TimeOffRequest[]> => {
  return (await fetchConvexList("TimeOffRequest")) as TimeOffRequest[];
});

export const loadVenues = cache(async (): Promise<Venue[]> => {
  return (await fetchConvexList("Venue")) as Venue[];
});

export async function getScheduleShiftById(
  shiftId: string
): Promise<ScheduleShift | null> {
  const record = (await fetchConvexRecord(
    "ScheduleShift",
    shiftId
  )) as ScheduleShift | null;
  if (!record || isDeleted(record.deletedAt)) return null;
  return record;
}

export async function getTimeOffRequestById(
  requestId: string
): Promise<TimeOffRequest | null> {
  const record = (await fetchConvexRecord(
    "TimeOffRequest",
    requestId
  )) as TimeOffRequest | null;
  if (!record || isDeleted(record.deletedAt)) return null;
  return record;
}

export async function getEmployeeAvailabilityById(
  availabilityId: string
): Promise<EmployeeAvailability | null> {
  const record = (await fetchConvexRecord(
    "EmployeeAvailability",
    availabilityId
  )) as EmployeeAvailability | null;
  if (!record || isDeleted(record.deletedAt)) return null;
  return record;
}

export async function venuesByIds(ids: string[]): Promise<Map<string, Venue>> {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map();

  const venues = (await loadVenues()).filter(
    (venue) => !isDeleted(venue.deletedAt) && uniqueIds.includes(venue.id)
  );
  return new Map(venues.map((venue) => [venue.id, venue]));
}

export function activeUsers(users: User[]): User[] {
  return users.filter((user) => !isDeleted(user.deletedAt) && user.isActive);
}

export function countShiftsForSchedule(
  shifts: ScheduleShift[],
  scheduleId: string
): number {
  return activeShifts(shifts).filter((shift) => shift.scheduleId === scheduleId)
    .length;
}
