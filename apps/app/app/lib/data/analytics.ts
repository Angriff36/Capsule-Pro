/** Analytics — Prisma removed; stub until Convex aggregation wired. */
import { cache } from "react";

const empty = {
  currentRevenue: 0,
  previousRevenue: 0,
  currentEvents: 0,
  previousEvents: 0,
  currentGuests: 0,
  previousGuests: 0,
  topClients: [] as Array<{ name: string; revenue: number; events: number }>,
  revenueByMonth: [] as Array<{ month: string; revenue: number }>,
  eventsByStatus: [] as Array<{ status: string; count: number }>,
};

export const getRevenueMetrics = cache(async () => ({
  currentRevenue: 0,
  previousRevenue: 0,
}));

export const getEventMetrics = cache(async () => ({
  currentEvents: 0,
  previousEvents: 0,
  currentGuests: 0,
  previousGuests: 0,
}));

export const getTopClients = cache(async () => [] as typeof empty.topClients);
export const getRevenueByMonth = cache(async () => [] as typeof empty.revenueByMonth);
export const getEventsByStatus = cache(async () => [] as typeof empty.eventsByStatus);

export const getKitchenMetrics = cache(async () => ({
  tasksCompleted: 0,
  tasksPending: 0,
  wasteCost: 0,
}));

export const getStaffMetrics = cache(async () => ({
  hoursWorked: 0,
  overtimeHours: 0,
  activeStaff: 0,
}));
