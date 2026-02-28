// Offline sync hook to process queued actions when online

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiClient } from "../api/client";
import { queryKeys } from "../api/queries";
import { getAuthToken } from "../store/auth";
import {
  getOfflineQueue,
  removeFromOfflineQueue,
} from "../store/offline-queue";
import type { OfflineQueueItem } from "../types";
import { useNetworkStatus } from "./useNetworkStatus";

export interface SyncStatus {
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: Date | null;
  error: string | null;
}

const SYNC_INTERVAL_MS = 30_000; // Try sync every 30 seconds when online
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/**
 * Process a single offline queue item
 */
async function processQueueItem(item: OfflineQueueItem): Promise<boolean> {
  const token = await getAuthToken();

  let endpoint: string;
  let method: string;
  let body: Record<string, unknown>;

  switch (item.action) {
    case "claim":
      endpoint = "/api/kitchen/kitchen-tasks/commands/claim";
      method = "POST";
      body = { taskId: item.taskId };
      break;
    case "release":
      endpoint = "/api/kitchen/kitchen-tasks/commands/release";
      method = "POST";
      body = { taskId: item.taskId };
      break;
    case "start":
      endpoint = "/api/kitchen/kitchen-tasks/commands/start";
      method = "POST";
      body = { taskId: item.taskId };
      break;
    case "complete":
      endpoint = `/api/kitchen/tasks/${item.taskId}`;
      method = "PATCH";
      body = { status: "done" };
      break;
    case "markPrepComplete":
      endpoint = "/api/kitchen/prep-list-items/commands/mark-completed";
      method = "POST";
      body = {
        itemId: item.taskId,
        completed: item.payload?.completed ?? true,
      };
      break;
    case "updatePrepNotes":
      endpoint = "/api/kitchen/prep-list-items/commands/update-prep-notes";
      method = "POST";
      body = {
        itemId: item.taskId,
        notes: (item.payload?.notes as string) ?? "",
      };
      break;
    default:
      console.warn(`Unknown action type: ${item.action}`);
      return false;
  }

  try {
    await apiClient(endpoint, {
      token: token ?? undefined,
      method,
      body: JSON.stringify(body),
    });
    return true;
  } catch (error) {
    console.error(
      `Failed to process ${item.action} for ${item.taskId}:`,
      error
    );
    return false;
  }
}

/**
 * Hook to manage offline queue synchronization
 * Automatically processes queued actions when connectivity is restored
 */
export function useOfflineSync(): {
  syncStatus: SyncStatus;
  processQueue: () => Promise<void>;
} {
  const queryClient = useQueryClient();
  const { isOnline } = useNetworkStatus();
  const syncStatusRef = useRef<SyncStatus>({
    isSyncing: false,
    pendingCount: 0,
    lastSyncTime: null,
    error: null,
  });
  const retryCountRef = useRef(0);

  const processQueue = useCallback(async () => {
    if (syncStatusRef.current.isSyncing) {
      return;
    }

    const queue = await getOfflineQueue();

    if (queue.length === 0) {
      syncStatusRef.current.pendingCount = 0;
      return;
    }

    syncStatusRef.current.isSyncing = true;
    syncStatusRef.current.pendingCount = queue.length;

    let successCount = 0;
    let failCount = 0;

    // Process items in FIFO order
    for (const item of queue) {
      const success = await processQueueItem(item);

      if (success) {
        await removeFromOfflineQueue(item.id);
        successCount++;
      } else {
        failCount++;
      }
    }

    syncStatusRef.current.isSyncing = false;
    syncStatusRef.current.lastSyncTime = new Date();

    // Update pending count
    const remainingQueue = await getOfflineQueue();
    syncStatusRef.current.pendingCount = remainingQueue.length;

    // If all succeeded, invalidate queries to refresh data
    if (failCount === 0 && successCount > 0) {
      queryClient.invalidateQueries({ queryKey: queryKeys.availableTasks });
      queryClient.invalidateQueries({ queryKey: queryKeys.myTasks });
      queryClient.invalidateQueries({ queryKey: queryKeys.eventsToday });
      queryClient.invalidateQueries({ queryKey: ["prepLists"] });
      queryClient.invalidateQueries({ queryKey: ["prepListDetail"] });
    }

    // Handle retry logic for failures
    if (failCount > 0 && retryCountRef.current < MAX_RETRIES) {
      retryCountRef.current++;
      setTimeout(
        () => {
          processQueue();
        },
        RETRY_DELAY_MS * 2 ** retryCountRef.current
      );
    } else if (failCount === 0) {
      retryCountRef.current = 0;
    }
  }, [queryClient]);

  // Sync when coming online
  useEffect(() => {
    if (isOnline) {
      // Small delay to let network stabilize
      const timer = setTimeout(() => {
        processQueue();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOnline, processQueue]);

  // Periodic sync attempt when online
  useEffect(() => {
    if (!isOnline) {
      return;
    }

    const interval = setInterval(() => {
      processQueue();
    }, SYNC_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isOnline, processQueue]);

  // Get initial queue count
  useEffect(() => {
    getOfflineQueue().then((queue) => {
      syncStatusRef.current.pendingCount = queue.length;
    });
  }, []);

  return {
    syncStatus: syncStatusRef.current,
    processQueue,
  };
}

/**
 * Hook to get just the pending count for UI display
 */
export function useOfflineQueueCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    getOfflineQueue().then((queue) => {
      setCount(queue.length);
    });

    // Poll for changes (simple approach)
    const interval = setInterval(() => {
      getOfflineQueue().then((queue) => {
        setCount(queue.length);
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return count;
}
