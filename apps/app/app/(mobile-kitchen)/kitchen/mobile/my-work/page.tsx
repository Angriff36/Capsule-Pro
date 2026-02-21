"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { captureException } from "@sentry/nextjs";
import { differenceInMinutes, format, isPast } from "date-fns";
import {
  AlertCircle,
  Briefcase,
  CheckCircle2,
  Clock,
  Package,
  Play,
  RefreshCw,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/app/lib/api";
import type { OfflineQueueItem, Task } from "../types";
import { priorityConfig } from "../types";

interface MyWorkState {
  activeTasks: Task[];
  claimedTasks: Task[];
  isLoading: boolean;
}

function formatDueStatus(
  dueDate: string | null
): { label: string; isOverdue: boolean; isUrgent: boolean } | null {
  if (!dueDate) {
    return null;
  }

  const now = new Date();
  const due = new Date(dueDate);
  const diffMins = differenceInMinutes(due, now);

  if (isPast(due) && diffMins < -30) {
    return { label: "OVERDUE", isOverdue: true, isUrgent: true };
  }

  if (diffMins < 0) {
    return {
      label: `${Math.abs(diffMins)}m late`,
      isOverdue: false,
      isUrgent: true,
    };
  }

  if (diffMins < 60) {
    return { label: `Due ${diffMins}m`, isOverdue: false, isUrgent: true };
  }

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 4) {
    return { label: `Due ${diffHours}h`, isOverdue: false, isUrgent: false };
  }

  return { label: format(due, "h:mm a"), isOverdue: false, isUrgent: false };
}

function getDueStatusClasses(dueStatus: {
  isOverdue: boolean;
  isUrgent: boolean;
}): string {
  if (dueStatus.isOverdue) {
    return "bg-rose-100 text-rose-700";
  }
  if (dueStatus.isUrgent) {
    return "bg-amber-100 text-amber-700";
  }
  return "bg-slate-100 text-slate-600";
}

async function syncSingleItem(
  item: OfflineQueueItem
): Promise<{ success: boolean }> {
  try {
    let response: Response | undefined;
    if (item.action === "start") {
      response = await apiFetch("/api/kitchen/kitchen-tasks/commands/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.taskId }),
      });
    } else if (item.action === "release") {
      response = await apiFetch("/api/kitchen/kitchen-tasks/commands/release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.taskId, reason: "" }),
      });
    }

    if (response?.ok) {
      return { success: true };
    }
    return { success: false };
  } catch {
    return { success: false };
  }
}

function WorkTaskCard({
  task,
  isLoading,
  isOnline,
  onStart,
  onComplete,
  onRelease,
}: {
  task: Task;
  isLoading: boolean;
  isOnline: boolean;
  onStart: (taskId: string) => void;
  onComplete: (taskId: string) => void;
  onRelease: (taskId: string) => void;
}) {
  const priority = priorityConfig[task.priority] || priorityConfig[5];
  const dueStatus = formatDueStatus(task.dueDate);
  const isActive = task.status === "in_progress";

  return (
    <div
      className={`mb-3 overflow-hidden rounded-xl border-2 bg-white p-4 shadow-sm ${
        dueStatus?.isUrgent ? "border-rose-300" : "border-slate-200"
      } ${isActive ? "border-l-4 border-l-blue-500" : ""}`}
    >
      {/* Priority and status indicators */}
      <div className="mb-3 flex items-center justify-between">
        <Badge className={`${priority.color} border-0 font-bold text-xs`}>
          {priority.label}
        </Badge>
        <div className="flex items-center gap-2">
          {isActive && (
            <Badge className="bg-blue-500 font-bold text-xs">Active</Badge>
          )}
          {dueStatus && (
            <span
              className={`flex items-center gap-1 rounded-full px-2 py-1 font-bold text-xs ${getDueStatusClasses(dueStatus)}`}
            >
              <Clock className="h-3 w-3" />
              {dueStatus.label}
            </span>
          )}
        </div>
      </div>

      {/* Task title */}
      <h3 className="mb-1 text-lg font-bold text-slate-900">{task.title}</h3>
      {task.summary && (
        <p className="mb-3 text-slate-600 text-sm">{task.summary}</p>
      )}

      {/* Tags/Station */}
      {task.tags && task.tags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1">
          {task.tags.map((tag) => (
            <span
              className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600 text-xs font-medium"
              key={tag}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Action buttons based on status */}
      <div className="flex gap-2">
        {!isActive && (
          <Button
            className="h-12 flex-1 text-base font-bold"
            disabled={isLoading || !isOnline}
            onClick={() => onStart(task.id)}
            variant="default"
          >
            <Play className="mr-1 h-5 w-5" />
            START
          </Button>
        )}
        {isActive && (
          <Button
            className="h-12 flex-1 bg-emerald-600 text-base font-bold hover:bg-emerald-700"
            disabled={isLoading || !isOnline}
            onClick={() => onComplete(task.id)}
          >
            <CheckCircle2 className="mr-1 h-5 w-5" />
            DONE
          </Button>
        )}
        <Button
          className="h-12 px-4"
          disabled={isLoading || !isOnline}
          onClick={() => onRelease(task.id)}
          size="icon"
          variant="outline"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

export default function MobileMyWorkPage() {
  const [state, setState] = useState<MyWorkState>({
    activeTasks: [],
    claimedTasks: [],
    isLoading: false,
  });
  const [isOnline, setIsOnline] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncQueue, setSyncQueue] = useState<OfflineQueueItem[]>([]);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const fetchMyWork = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    setError(null);

    try {
      const response = await apiFetch("/api/kitchen/tasks/my-tasks");

      if (response.ok) {
        const data = await response.json();
        const tasks = data.tasks || [];

        // Separate into active and claimed
        const activeTasks = tasks.filter(
          (t: Task) => t.status === "in_progress"
        );
        const claimedTasks = tasks.filter(
          (t: Task) => t.status !== "in_progress" && t.status !== "done"
        );

        setState({
          activeTasks,
          claimedTasks,
          isLoading: false,
        });
      } else {
        const errData = await response.json();
        setError(errData.message || "Failed to load tasks");
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    } catch (err) {
      captureException(err);
      console.error("[MobileMyWork] Failed to fetch tasks:", err);
      setError("Failed to load tasks. Please try again.");
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    fetchMyWork();
  }, [fetchMyWork]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchMyWork, 30_000);
    return () => clearInterval(interval);
  }, [fetchMyWork]);

  // Sync offline queue when coming back online
  useEffect(() => {
    if (!isOnline || syncQueue.length === 0) {
      return;
    }

    const syncOfflineActions = async () => {
      const failedItems: OfflineQueueItem[] = [];

      for (const item of syncQueue) {
        const result = await syncSingleItem(item);
        if (!result.success) {
          failedItems.push(item);
        }
      }

      if (failedItems.length === 0) {
        setSyncQueue([]);
        await fetchMyWork();
      } else {
        setSyncQueue(failedItems);
      }
    };

    syncOfflineActions();
  }, [isOnline, syncQueue, fetchMyWork]);

  const handleStart = useCallback(
    async (taskId: string) => {
      setState((prev) => ({ ...prev, isLoading: true }));

      if (!isOnline) {
        setSyncQueue((prev) => [
          ...prev,
          {
            taskId,
            action: "start",
            timestamp: new Date().toISOString(),
          },
        ]);
        // Optimistic update
        setState((prev) => {
          const task = prev.claimedTasks.find((t) => t.id === taskId);
          if (task) {
            return {
              activeTasks: [
                ...prev.activeTasks,
                { ...task, status: "in_progress" },
              ],
              claimedTasks: prev.claimedTasks.filter((t) => t.id !== taskId),
              isLoading: false,
            };
          }
          return { ...prev, isLoading: false };
        });
        return;
      }

      try {
        const response = await apiFetch(
          "/api/kitchen/kitchen-tasks/commands/start",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: taskId }),
          }
        );

        if (response.ok) {
          await fetchMyWork();
        } else {
          const errData = await response.json();
          setError(errData.message || "Failed to start task");
          setState((prev) => ({ ...prev, isLoading: false }));
        }
      } catch (err) {
        captureException(err);
        setError("Failed to start task. Please try again.");
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    },
    [isOnline, fetchMyWork]
  );

  const handleComplete = useCallback(
    async (taskId: string) => {
      setState((prev) => ({ ...prev, isLoading: true }));

      try {
        const response = await apiFetch(`/api/kitchen/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "done" }),
        });

        if (response.ok) {
          await fetchMyWork();
        } else {
          const errData = await response.json();
          setError(errData.message || "Failed to complete task");
          setState((prev) => ({ ...prev, isLoading: false }));
        }
      } catch (err) {
        captureException(err);
        setError("Failed to complete task. Please try again.");
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    },
    [fetchMyWork]
  );

  const handleRelease = useCallback(
    async (taskId: string) => {
      setState((prev) => ({ ...prev, isLoading: true }));

      if (!isOnline) {
        setSyncQueue((prev) => [
          ...prev,
          {
            taskId,
            action: "release",
            timestamp: new Date().toISOString(),
          },
        ]);
        // Optimistic update
        setState((prev) => ({
          activeTasks: prev.activeTasks.filter((t) => t.id !== taskId),
          claimedTasks: prev.claimedTasks.filter((t) => t.id !== taskId),
          isLoading: false,
        }));
        return;
      }

      try {
        const response = await apiFetch(
          "/api/kitchen/kitchen-tasks/commands/release",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: taskId, reason: "" }),
          }
        );

        if (response.ok) {
          await fetchMyWork();
        } else {
          const errData = await response.json();
          setError(errData.message || "Failed to release task");
          setState((prev) => ({ ...prev, isLoading: false }));
        }
      } catch (err) {
        captureException(err);
        setError("Failed to release task. Please try again.");
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    },
    [isOnline, fetchMyWork]
  );

  const totalTasks = state.activeTasks.length + state.claimedTasks.length;

  return (
    <div className="flex flex-1 flex-col p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-2xl text-slate-900">My Work</h1>
          <p className="text-slate-500 text-sm">
            {totalTasks} task{totalTasks !== 1 ? "s" : ""} assigned
          </p>
        </div>
        <Button
          disabled={state.isLoading || !isOnline}
          onClick={fetchMyWork}
          size="icon"
          variant="outline"
        >
          <RefreshCw
            className={`h-5 w-5 ${state.isLoading ? "animate-spin" : ""}`}
          />
        </Button>
      </div>

      {/* Status bar */}
      <div className="mb-4 flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          {isOnline ? (
            <span className="flex items-center gap-1 text-emerald-600">
              <Wifi className="h-3 w-3" />
              Online
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-600">
              <WifiOff className="h-3 w-3" />
              Offline
            </span>
          )}
        </div>
        <span className="text-slate-500">Auto-refresh: 30s</span>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 flex items-center justify-between gap-2 rounded-lg bg-rose-100 p-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600" />
            <span className="text-rose-700 text-sm">{error}</span>
          </div>
          <Button
            className="h-6 px-2 text-rose-600 text-xs"
            onClick={() => setError(null)}
            size="sm"
            variant="ghost"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Offline queue indicator */}
      {syncQueue.length > 0 && (
        <div className="mb-4 rounded-lg bg-blue-100 p-3 text-center text-blue-700 text-sm">
          {syncQueue.length} action{syncQueue.length > 1 ? "s" : ""} pending
          sync
        </div>
      )}

      {/* Active Tasks Section */}
      {state.activeTasks.length > 0 && (
        <div className="mb-6">
          <div className="mb-2 flex items-center gap-2">
            <Play className="h-4 w-4 text-blue-500" />
            <h2 className="font-semibold text-slate-700">Active</h2>
            <Badge className="bg-blue-100 text-blue-700" variant="secondary">
              {state.activeTasks.length}
            </Badge>
          </div>
          <div>
            {state.activeTasks.map((task) => (
              <WorkTaskCard
                isLoading={state.isLoading}
                isOnline={isOnline}
                key={task.id}
                onComplete={handleComplete}
                onRelease={handleRelease}
                onStart={handleStart}
                task={task}
              />
            ))}
          </div>
        </div>
      )}

      {/* Claimed Tasks Section */}
      {state.claimedTasks.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Package className="h-4 w-4 text-slate-400" />
            <h2 className="font-semibold text-slate-700">Claimed</h2>
            <Badge className="bg-slate-100 text-slate-600" variant="secondary">
              {state.claimedTasks.length}
            </Badge>
          </div>
          <div>
            {state.claimedTasks.map((task) => (
              <WorkTaskCard
                isLoading={state.isLoading}
                isOnline={isOnline}
                key={task.id}
                onComplete={handleComplete}
                onRelease={handleRelease}
                onStart={handleStart}
                task={task}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {totalTasks === 0 && !state.isLoading && (
        <div className="flex flex-1 flex-col items-center justify-center py-12">
          <Briefcase className="mb-4 h-16 w-16 text-slate-300" />
          <p className="text-center text-slate-600">No tasks assigned</p>
          <p className="mt-2 text-center text-slate-400 text-sm">
            Claim tasks from the Tasks tab to see them here.
          </p>
        </div>
      )}
    </div>
  );
}
