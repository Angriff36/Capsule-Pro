// React Query hooks for read operations
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "./client";
import { getAuthToken } from "../store/auth";
import type { TodayEvent, Task, PrepList, PrepListItem } from "../types";

// Response types
interface EventsTodayResponse {
  events: TodayEvent[];
}

interface AvailableTasksResponse {
  tasks: Task[];
  userId?: string;
}

interface MyTasksResponse {
  tasks: Task[];
  userId?: string;
}

interface PrepListsResponse {
  prepLists: PrepList[];
}

interface PrepListDetailResponse {
  prepList: PrepList;
}

// Query keys for cache management
export const queryKeys = {
  eventsToday: ["eventsToday"] as const,
  availableTasks: ["availableTasks"] as const,
  myTasks: ["myTasks"] as const,
  prepLists: (filters?: { status?: string; eventId?: string }) =>
    ["prepLists", filters] as const,
  prepListDetail: (id: string) => ["prepListDetail", id] as const,
};

// Helper to get auth token and make authenticated request
async function authRequest<T>(endpoint: string): Promise<T> {
  const token = await getAuthToken();
  return apiClient<T>(endpoint, { token: token ?? undefined });
}

/**
 * Hook to fetch today's events
 * GET /api/kitchen/events/today
 */
export function useEventsToday() {
  return useQuery({
    queryKey: queryKeys.eventsToday,
    queryFn: () => authRequest<EventsTodayResponse>("/api/kitchen/events/today"),
    select: (data) => data.events,
    staleTime: 1000 * 60 * 2, // 2 minutes - events change frequently
  });
}

/**
 * Hook to fetch available tasks (claimable)
 * GET /api/kitchen/tasks/available
 */
export function useAvailableTasks() {
  return useQuery({
    queryKey: queryKeys.availableTasks,
    queryFn: () =>
      authRequest<AvailableTasksResponse>("/api/kitchen/tasks/available"),
    select: (data) => data.tasks,
    staleTime: 1000 * 30, // 30 seconds - tasks can be claimed quickly
  });
}

/**
 * Hook to fetch my claimed tasks
 * GET /api/kitchen/tasks/my-tasks
 */
export function useMyTasks() {
  return useQuery({
    queryKey: queryKeys.myTasks,
    queryFn: () => authRequest<MyTasksResponse>("/api/kitchen/tasks/my-tasks"),
    select: (data) => data.tasks,
    staleTime: 1000 * 30, // 30 seconds
  });
}

/**
 * Hook to fetch prep lists
 * GET /api/kitchen/prep-lists?status=active
 */
export function usePrepLists(filters?: { status?: string; eventId?: string }) {
  return useQuery({
    queryKey: queryKeys.prepLists(filters),
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters?.status) {
        params.set("status", filters.status);
      }
      if (filters?.eventId) {
        params.set("eventId", filters.eventId);
      }
      const queryString = params.toString();
      const endpoint = queryString
        ? `/api/kitchen/prep-lists?${queryString}`
        : "/api/kitchen/prep-lists";
      return authRequest<PrepListsResponse>(endpoint);
    },
    select: (data) => data.prepLists,
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Hook to fetch a single prep list with items
 * GET /api/kitchen/prep-lists/[id]
 */
export function usePrepListDetail(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.prepListDetail(id ?? ""),
    queryFn: () =>
      authRequest<PrepListDetailResponse>(`/api/kitchen/prep-lists/${id}`),
    select: (data) => data.prepList,
    enabled: !!id, // Only fetch when id is provided
    staleTime: 1000 * 60, // 1 minute
  });
}
