"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import { captureException } from "@sentry/nextjs";
import { differenceInMinutes, format, isPast } from "date-fns";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/app/lib/api";
import type { ApiResponse, OfflineQueueItem, Task } from "../types";
import { priorityConfig } from "../types";

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

function getDueStatusBadgeClass(dueStatus: {
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

function MobileTaskCard({
  task,
  type,
  isLoading,
  isOnline,
  onClaim,
  onRelease,
  onComplete,
}: {
  task: Task;
  type: "available" | "my-tasks";
  isLoading: boolean;
  isOnline: boolean;
  onClaim: (taskId: string) => void;
  onRelease: (taskId: string) => void;
  onComplete: (taskId: string) => void;
}) {
  const priority = priorityConfig[task.priority] || priorityConfig[5];
  const dueStatus = formatDueStatus(task.dueDate);

  return (
    <div
      className={`mb-3 overflow-hidden rounded-xl border-2 bg-white p-4 shadow-sm ${
        dueStatus?.isUrgent ? "border-rose-300" : "border-slate-200"
      } ${dueStatus?.isOverdue ? "bg-rose-50" : ""}`}
    >
      {/* Priority indicator */}
      <div className={"mb-3 flex items-center justify-between"}>
        <Badge className={`${priority.color} border-0 font-bold text-xs`}>
          {priority.label}
        </Badge>
        {dueStatus && (
          <span
            className={`flex items-center gap-1 rounded-full px-2 py-1 font-bold text-xs ${getDueStatusBadgeClass(dueStatus)}`}
          >
            <Clock className="h-3 w-3" />
            {dueStatus.label}
          </span>
        )}
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

      {/* Claimed by others indicator */}
      {type === "available" &&
        task.isClaimedByOthers &&
        task.claims.length > 0 && (
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-slate-50 px-2 py-1">
            <AlertCircle className="h-4 w-4 text-slate-500" />
            <span className="text-slate-600 text-xs">
              Claimed by {task.claims[0].user?.firstName || "Someone"}
            </span>
          </div>
        )}

      {/* Action button - LARGE for mobile */}
      {type === "available" && task.isAvailable && (
        <Button
          className="h-14 w-full text-lg font-bold"
          disabled={isLoading || !isOnline}
          onClick={() => onClaim(task.id)}
          size="lg"
        >
          CLAIM TASK
        </Button>
      )}

      {type === "my-tasks" && (
        <div className="flex gap-2">
          <Button
            className="h-14 flex-1 text-lg font-bold"
            disabled={isLoading || !isOnline}
            onClick={() => onRelease(task.id)}
            variant="outline"
          >
            RELEASE
          </Button>
          {task.status === "in_progress" && (
            <Button
              className="h-14 flex-1 bg-emerald-600 text-lg font-bold hover:bg-emerald-700"
              disabled={isLoading || !isOnline}
              onClick={() => onComplete(task.id)}
            >
              <CheckCircle2 className="mr-1 h-5 w-5" />
              DONE
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default function MobileTasksPage() {
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("available");
  const [syncQueue, setSyncQueue] = useState<OfflineQueueItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Stable fetch callbacks using useCallback with no function-reference deps
  const fetchAvailableTasks = useCallback(async () => {
    try {
      const response = await apiFetch("/api/kitchen/tasks/available");
      if (response.ok) {
        const data: ApiResponse = await response.json();
        setAvailableTasks(data.tasks);
      }
    } catch (err) {
      captureException(err);
      console.error("[MobileTasks] Failed to fetch available tasks:", err);
    }
  }, []);

  const fetchMyTasks = useCallback(async () => {
    try {
      const response = await apiFetch("/api/kitchen/tasks/my-tasks");
      if (response.ok) {
        const data: ApiResponse = await response.json();
        setMyTasks(data.tasks);
      }
    } catch (err) {
      captureException(err);
      console.error("[MobileTasks] Failed to fetch my tasks:", err);
    }
  }, []);

  // Initial load — stable deps, runs once on mount
  useEffect(() => {
    fetchAvailableTasks();
    fetchMyTasks();
  }, [fetchAvailableTasks, fetchMyTasks]);

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

  // Sync offline queue when coming back online
  useEffect(() => {
    if (!isOnline || syncQueue.length === 0) {
      return;
    }

    const syncOfflineClaims = async () => {
      try {
        const response = await apiFetch("/api/kitchen/tasks/sync-claims", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ claims: syncQueue }),
        });

        if (response.ok) {
          setSyncQueue([]);
          await fetchAvailableTasks();
          await fetchMyTasks();
        }
      } catch (err) {
        captureException(err);
        console.error("[MobileTasks] Failed to sync offline claims:", err);
      }
    };

    syncOfflineClaims();
  }, [isOnline, syncQueue, fetchAvailableTasks, fetchMyTasks]);

  const handleClaim = useCallback(
    async (taskId: string) => {
      setIsLoading(true);
      setError(null);

      if (!isOnline) {
        setSyncQueue((prev = []) => [
          ...(prev || []),
          {
            taskId,
            action: "claim",
            timestamp: new Date().toISOString(),
          },
        ]);
        setIsLoading(false);
        return;
      }

      try {
        const response = await apiFetch(
          "/api/kitchen/kitchen-tasks/commands/claim",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: taskId }),
          }
        );

        if (response.ok) {
          await fetchAvailableTasks();
          await fetchMyTasks();
          setActiveTab("my-tasks");
        } else {
          const errData = await response.json();
          const message = errData.message || "Failed to claim task";
          setError(message);
          captureException(new Error(`[MobileTasks] Claim failed: ${message}`));
        }
      } catch (err) {
        captureException(err);
        console.error("[MobileTasks] Failed to claim task:", err);
        setError("Failed to claim task. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [isOnline, fetchAvailableTasks, fetchMyTasks]
  );

  const handleRelease = useCallback(
    async (taskId: string) => {
      setIsLoading(true);
      setError(null);

      if (!isOnline) {
        setSyncQueue((prev = []) => [
          ...(prev || []),
          {
            taskId,
            action: "release",
            timestamp: new Date().toISOString(),
          },
        ]);
        setIsLoading(false);
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
          await fetchAvailableTasks();
          await fetchMyTasks();
        } else {
          const errData = await response.json();
          const message = errData.message || "Failed to release task";
          setError(message);
          captureException(
            new Error(`[MobileTasks] Release failed: ${message}`)
          );
        }
      } catch (err) {
        captureException(err);
        console.error("[MobileTasks] Failed to release task:", err);
        setError("Failed to release task. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [isOnline, fetchAvailableTasks, fetchMyTasks]
  );

  const handleComplete = useCallback(
    async (taskId: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await apiFetch(`/api/kitchen/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "done" }),
        });

        if (response.ok) {
          await fetchMyTasks();
        } else {
          const message = "Failed to complete task";
          setError(message);
          captureException(
            new Error(`[MobileTasks] Complete failed for task ${taskId}`)
          );
        }
      } catch (err) {
        captureException(err);
        console.error("[MobileTasks] Failed to complete task:", err);
        setError("Failed to complete task. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [fetchMyTasks]
  );

  const handleTabChange = useCallback(
    (value: string) => {
      setActiveTab(value);
      if (value === "available") {
        fetchAvailableTasks();
      }
      if (value === "my-tasks") {
        fetchMyTasks();
      }
    },
    [fetchAvailableTasks, fetchMyTasks]
  );

  return (
    <div className="flex flex-1 flex-col p-4">
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

      {/* Sync queue indicator */}
      {syncQueue && syncQueue.length > 0 && (
        <div className="mb-4 flex items-center justify-center gap-2 rounded-lg bg-blue-100 p-3">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <span className="text-blue-700 text-sm">
            {syncQueue.length} action{syncQueue.length > 1 ? "s" : ""} pending
            sync
          </span>
        </div>
      )}

      <Tabs
        className="flex flex-1 flex-col"
        onValueChange={handleTabChange}
        value={activeTab}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger className="text-base" value="available">
            Available ({availableTasks.length})
          </TabsTrigger>
          <TabsTrigger className="text-base" value="my-tasks">
            My Tasks ({myTasks.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent className="mt-4 flex-1" value="available">
          {/* Refresh button */}
          <div className="mb-4 flex items-center justify-between">
            <span className="text-slate-600 text-sm">
              {isOnline ? (
                <span className="flex items-center gap-1">
                  <Wifi className="h-3 w-3 text-emerald-500" />
                  Online
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <WifiOff className="h-3 w-3 text-amber-500" />
                  Offline
                </span>
              )}
            </span>
            <Button
              disabled={isLoading || !isOnline}
              onClick={fetchAvailableTasks}
              size="sm"
              variant="outline"
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>

          {/* Available tasks list */}
          {availableTasks.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-12">
              <CheckCircle2 className="mb-4 h-16 w-16 text-emerald-500" />
              <p className="text-center text-slate-600">
                No available tasks right now!
              </p>
              <p className="mt-2 text-center text-slate-500 text-sm">
                Check back later or pull to refresh.
              </p>
            </div>
          ) : (
            availableTasks.map((task) => (
              <MobileTaskCard
                isLoading={isLoading}
                isOnline={isOnline}
                key={task.id}
                onClaim={handleClaim}
                onComplete={handleComplete}
                onRelease={handleRelease}
                task={task}
                type="available"
              />
            ))
          )}
        </TabsContent>

        <TabsContent className="mt-4 flex-1" value="my-tasks">
          {/* Refresh button */}
          <div className="mb-4 flex items-center justify-between">
            <span className="text-slate-600 text-sm">
              {isOnline ? (
                <span className="flex items-center gap-1">
                  <Wifi className="h-3 w-3 text-emerald-500" />
                  Online
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <WifiOff className="h-3 w-3 text-amber-500" />
                  Offline
                </span>
              )}
            </span>
            <Button
              disabled={isLoading || !isOnline}
              onClick={fetchMyTasks}
              size="sm"
              variant="outline"
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>

          {/* My tasks list */}
          {myTasks.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-12">
              <Clock className="mb-4 h-16 w-16 text-slate-400" />
              <p className="text-center text-slate-600">
                You haven't claimed any tasks yet.
              </p>
              <p className="mt-2 text-center text-slate-500 text-sm">
                Switch to Available tab to claim tasks.
              </p>
            </div>
          ) : (
            myTasks.map((task) => (
              <MobileTaskCard
                isLoading={isLoading}
                isOnline={isOnline}
                key={task.id}
                onClaim={handleClaim}
                onComplete={handleComplete}
                onRelease={handleRelease}
                task={task}
                type="my-tasks"
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
