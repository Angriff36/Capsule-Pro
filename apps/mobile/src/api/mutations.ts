// React Query mutations for write operations
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, ApiError } from "./client";
import { getAuthToken } from "../store/auth";
import { queryKeys } from "./queries";
import type { BundleClaimResponse, Task } from "../types";

// Request/Response types
interface ClaimTaskRequest {
  taskId: string;
}

interface ClaimTaskResponse {
  success: boolean;
  claimId: string;
}

interface BundleClaimRequest {
  taskIds: string[];
}

interface StartTaskRequest {
  taskId: string;
}

interface CompleteTaskRequest {
  taskId: string;
}

interface ReleaseTaskRequest {
  taskId: string;
}

interface MarkPrepItemCompleteRequest {
  itemId: string;
  completed: boolean;
}

interface UpdatePrepItemNotesRequest {
  itemId: string;
  notes: string;
}

// Helper to get auth token and make authenticated request
async function authRequest<T>(
  endpoint: string,
  options: { method: string; body?: unknown } = { method: "POST" }
): Promise<T> {
  const token = await getAuthToken();
  return apiClient<T>(endpoint, {
    token: token ?? undefined,
    method: options.method,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

/**
 * Hook to claim a single task
 * POST /api/kitchen/kitchen-tasks/commands/claim
 */
export function useClaimTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      return authRequest<ClaimTaskResponse>(
        "/api/kitchen/kitchen-tasks/commands/claim",
        {
          method: "POST",
          body: { taskId },
        }
      );
    },
    onSuccess: () => {
      // Invalidate both task lists
      queryClient.invalidateQueries({ queryKey: queryKeys.availableTasks });
      queryClient.invalidateQueries({ queryKey: queryKeys.myTasks });
    },
  });
}

/**
 * Hook to claim multiple tasks atomically
 * POST /api/kitchen/tasks/bundle-claim
 */
export function useBundleClaimTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskIds: string[]) => {
      return authRequest<BundleClaimResponse>("/api/kitchen/tasks/bundle-claim", {
        method: "POST",
        body: { taskIds } as BundleClaimRequest,
      });
    },
    onSuccess: (response) => {
      // Invalidate both task lists
      queryClient.invalidateQueries({ queryKey: queryKeys.availableTasks });
      queryClient.invalidateQueries({ queryKey: queryKeys.myTasks });
    },
  });
}

/**
 * Hook to start a task
 * POST /api/kitchen/kitchen-tasks/commands/start
 */
export function useStartTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      return authRequest<{ success: boolean }>(
        "/api/kitchen/kitchen-tasks/commands/start",
        {
          method: "POST",
          body: { taskId },
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myTasks });
    },
  });
}

/**
 * Hook to complete a task
 * PATCH /api/kitchen/tasks/[id]
 */
export function useCompleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      return authRequest<{ success: boolean }>(`/api/kitchen/tasks/${taskId}`, {
        method: "PATCH",
        body: { status: "done" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myTasks });
      queryClient.invalidateQueries({ queryKey: queryKeys.availableTasks });
    },
  });
}

/**
 * Hook to release a task
 * POST /api/kitchen/kitchen-tasks/commands/release
 */
export function useReleaseTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      return authRequest<{ success: boolean }>(
        "/api/kitchen/kitchen-tasks/commands/release",
        {
          method: "POST",
          body: { taskId },
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myTasks });
      queryClient.invalidateQueries({ queryKey: queryKeys.availableTasks });
    },
  });
}

/**
 * Hook to mark a prep item as complete/incomplete
 * POST /api/kitchen/prep-lists/items/commands/mark-completed
 */
export function useMarkPrepItemComplete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, completed }: { itemId: string; completed: boolean }) => {
      return authRequest<{ success: boolean }>(
        "/api/kitchen/prep-lists/items/commands/mark-completed",
        {
          method: "POST",
          body: { itemId, completed },
        }
      );
    },
    onSuccess: (_, variables) => {
      // Invalidate all prep list queries
      queryClient.invalidateQueries({ queryKey: ["prepLists"] });
      queryClient.invalidateQueries({ queryKey: ["prepListDetail"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.eventsToday });
    },
  });
}

/**
 * Hook to update prep item notes
 * POST /api/kitchen/prep-lists/items/commands/update-prep-notes
 */
export function useUpdatePrepItemNotes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, notes }: { itemId: string; notes: string }) => {
      return authRequest<{ success: boolean }>(
        "/api/kitchen/prep-lists/items/commands/update-prep-notes",
        {
          method: "POST",
          body: { itemId, notes },
        }
      );
    },
    onSuccess: () => {
      // Invalidate all prep list queries
      queryClient.invalidateQueries({ queryKey: ["prepLists"] });
      queryClient.invalidateQueries({ queryKey: ["prepListDetail"] });
    },
  });
}

// Export mutation error type for error handling
export type { ApiError };
