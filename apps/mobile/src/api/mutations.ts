// React Query mutations with optimistic UI and offline queue support
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getAuthToken } from "../store/auth";
import { addToOfflineQueue } from "../store/offline-queue";
import type { BundleClaimResponse, OfflineQueueItem, Task } from "../types";
import { type ApiError, apiClient } from "./client";
import { queryKeys } from "./queries";

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

// Helper to generate unique queue item ID
function generateQueueId(): string {
  return `queue_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
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

// Helper to queue action for offline processing
async function queueAction(
  action: OfflineQueueItem["action"],
  taskId: string,
  payload?: Record<string, unknown>
): Promise<void> {
  const queueItem: OfflineQueueItem = {
    id: generateQueueId(),
    taskId,
    action,
    payload,
    timestamp: new Date().toISOString(),
  };
  await addToOfflineQueue(queueItem);
}

/**
 * Hook to claim a single task
 * POST /api/kitchen/kitchen-tasks/commands/claim
 */
export function useClaimTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      try {
        return await authRequest<ClaimTaskResponse>(
          "/api/kitchen/kitchen-tasks/commands/claim",
          {
            method: "POST",
            body: { taskId },
          }
        );
      } catch (error) {
        // If network error, queue for later
        if (error instanceof TypeError && error.message.includes("Network")) {
          await queueAction("claim", taskId);
          return { success: true, claimId: "pending" };
        }
        throw error;
      }
    },
    onMutate: async (_taskId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.availableTasks });
      await queryClient.cancelQueries({ queryKey: queryKeys.myTasks });

      // Snapshot previous values
      const previousAvailable = queryClient.getQueryData(
        queryKeys.availableTasks
      );
      const previousMyTasks = queryClient.getQueryData(queryKeys.myTasks);

      // Optimistically update - move task from available to my tasks
      // This is a simplified optimistic update - real implementation would
      // need to properly update the cached data structure
      return { previousAvailable, previousMyTasks };
    },
    onError: (_err, _taskId, context) => {
      // Rollback on error
      if (context?.previousAvailable) {
        queryClient.setQueryData(
          queryKeys.availableTasks,
          context.previousAvailable
        );
      }
      if (context?.previousMyTasks) {
        queryClient.setQueryData(queryKeys.myTasks, context.previousMyTasks);
      }
    },
    onSettled: () => {
      // Always refetch after mutation settles
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
      try {
        return await authRequest<BundleClaimResponse>(
          "/api/kitchen/tasks/bundle-claim",
          {
            method: "POST",
            body: { taskIds } as BundleClaimRequest,
          }
        );
      } catch (error) {
        // If network error, queue each task individually
        if (error instanceof TypeError && error.message.includes("Network")) {
          for (const taskId of taskIds) {
            await queueAction("claim", taskId);
          }
          return {
            success: true,
            data: {
              claimed: taskIds.map((id) => ({
                taskId: id,
                claimId: "pending",
                status: "pending",
              })),
              totalClaimed: taskIds.length,
            },
          };
        }
        throw error;
      }
    },
    onSuccess: () => {
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
      try {
        return await authRequest<{ success: boolean }>(
          "/api/kitchen/kitchen-tasks/commands/start",
          {
            method: "POST",
            body: { taskId },
          }
        );
      } catch (error) {
        if (error instanceof TypeError && error.message.includes("Network")) {
          await queueAction("start", taskId);
          return { success: true };
        }
        throw error;
      }
    },
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.myTasks });
      const previousMyTasks = queryClient.getQueryData(queryKeys.myTasks);

      // Optimistically update task status to in_progress
      if (previousMyTasks) {
        const tasks = previousMyTasks as { tasks: Task[] };
        const updatedTasks = tasks.tasks.map((task) =>
          task.id === taskId ? { ...task, status: "in_progress" } : task
        );
        queryClient.setQueryData(queryKeys.myTasks, {
          ...tasks,
          tasks: updatedTasks,
        });
      }

      return { previousMyTasks };
    },
    onError: (_err, _taskId, context) => {
      if (context?.previousMyTasks) {
        queryClient.setQueryData(queryKeys.myTasks, context.previousMyTasks);
      }
    },
    onSettled: () => {
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
      try {
        return await authRequest<{ success: boolean }>(
          `/api/kitchen/tasks/${taskId}`,
          {
            method: "PATCH",
            body: { status: "done" },
          }
        );
      } catch (error) {
        if (error instanceof TypeError && error.message.includes("Network")) {
          await queueAction("complete", taskId);
          return { success: true };
        }
        throw error;
      }
    },
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.myTasks });
      await queryClient.cancelQueries({ queryKey: queryKeys.availableTasks });
      const previousMyTasks = queryClient.getQueryData(queryKeys.myTasks);
      const previousAvailable = queryClient.getQueryData(
        queryKeys.availableTasks
      );

      // Optimistically update task status to done
      if (previousMyTasks) {
        const tasks = previousMyTasks as { tasks: Task[] };
        const updatedTasks = tasks.tasks.map((task) =>
          task.id === taskId ? { ...task, status: "done" } : task
        );
        queryClient.setQueryData(queryKeys.myTasks, {
          ...tasks,
          tasks: updatedTasks,
        });
      }

      return { previousMyTasks, previousAvailable };
    },
    onError: (_err, _taskId, context) => {
      if (context?.previousMyTasks) {
        queryClient.setQueryData(queryKeys.myTasks, context.previousMyTasks);
      }
      if (context?.previousAvailable) {
        queryClient.setQueryData(
          queryKeys.availableTasks,
          context.previousAvailable
        );
      }
    },
    onSettled: () => {
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
      try {
        return await authRequest<{ success: boolean }>(
          "/api/kitchen/kitchen-tasks/commands/release",
          {
            method: "POST",
            body: { taskId },
          }
        );
      } catch (error) {
        if (error instanceof TypeError && error.message.includes("Network")) {
          await queueAction("release", taskId);
          return { success: true };
        }
        throw error;
      }
    },
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.myTasks });
      await queryClient.cancelQueries({ queryKey: queryKeys.availableTasks });
      const previousMyTasks = queryClient.getQueryData(queryKeys.myTasks);
      const previousAvailable = queryClient.getQueryData(
        queryKeys.availableTasks
      );

      // Optimistically remove task from my tasks
      if (previousMyTasks) {
        const tasks = previousMyTasks as { tasks: Task[] };
        const updatedTasks = tasks.tasks.filter((task) => task.id !== taskId);
        queryClient.setQueryData(queryKeys.myTasks, {
          ...tasks,
          tasks: updatedTasks,
        });
      }

      return { previousMyTasks, previousAvailable };
    },
    onError: (_err, _taskId, context) => {
      if (context?.previousMyTasks) {
        queryClient.setQueryData(queryKeys.myTasks, context.previousMyTasks);
      }
      if (context?.previousAvailable) {
        queryClient.setQueryData(
          queryKeys.availableTasks,
          context.previousAvailable
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myTasks });
      queryClient.invalidateQueries({ queryKey: queryKeys.availableTasks });
    },
  });
}

/**
 * Hook to mark a prep item as complete/incomplete
 * POST /api/kitchen/prep-list-items/commands/mark-completed
 */
export function useMarkPrepItemComplete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      completed,
    }: {
      itemId: string;
      completed: boolean;
    }) => {
      try {
        return await authRequest<{ success: boolean }>(
          "/api/kitchen/prep-list-items/commands/mark-completed",
          {
            method: "POST",
            body: { itemId, completed },
          }
        );
      } catch (error) {
        if (error instanceof TypeError && error.message.includes("Network")) {
          await queueAction("markPrepComplete", itemId, { completed });
          return { success: true };
        }
        throw error;
      }
    },
    onMutate: async ({ itemId, completed }) => {
      await queryClient.cancelQueries({ queryKey: ["prepListDetail"] });
      const previousDetail = queryClient.getQueryData(["prepListDetail"]);

      // Optimistically update the prep list item
      // This would need to update the specific item in the cached prep list
      return { previousDetail };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousDetail) {
        queryClient.setQueryData(["prepListDetail"], context.previousDetail);
      }
    },
    onSettled: (_, __, _variables) => {
      queryClient.invalidateQueries({ queryKey: ["prepLists"] });
      queryClient.invalidateQueries({ queryKey: ["prepListDetail"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.eventsToday });
    },
  });
}

/**
 * Hook to update prep item notes
 * POST /api/kitchen/prep-list-items/commands/update-prep-notes
 */
export function useUpdatePrepItemNotes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      notes,
    }: {
      itemId: string;
      notes: string;
    }) => {
      try {
        return await authRequest<{ success: boolean }>(
          "/api/kitchen/prep-list-items/commands/update-prep-notes",
          {
            method: "POST",
            body: { itemId, notes },
          }
        );
      } catch (error) {
        if (error instanceof TypeError && error.message.includes("Network")) {
          await queueAction("updatePrepNotes", itemId, { notes });
          return { success: true };
        }
        throw error;
      }
    },
    onMutate: async ({ itemId, notes }) => {
      await queryClient.cancelQueries({ queryKey: ["prepListDetail"] });
      const previousDetail = queryClient.getQueryData(["prepListDetail"]);

      // Optimistically update notes
      return { previousDetail };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousDetail) {
        queryClient.setQueryData(["prepListDetail"], context.previousDetail);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["prepLists"] });
      queryClient.invalidateQueries({ queryKey: ["prepListDetail"] });
    },
  });
}

// Export mutation error type for error handling
export type { ApiError };
