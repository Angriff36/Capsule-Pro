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
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "@/app/lib/api";
import { Header } from "../../components/header";

// Types
interface Task {
  id: string;
  title: string;
  summary: string | null;
  status: string;
  priority: number;
  dueDate: string | null;
  tags: string[];
  claims: Array<{
    id: string;
    employeeId: string;
    user: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      email: string | null;
    } | null;
  }>;
  isClaimedByOthers?: boolean;
  isAvailable?: boolean;
  claimedAt?: string | null;
}

interface ApiResponse {
  tasks: Task[];
  userId?: string;
}

const priorityConfig: Record<number, { label: string; color: string }> = {
  1: { label: "CRITICAL", color: "bg-rose-500" },
  2: { label: "URGENT", color: "bg-red-500" },
  3: { label: "HIGH", color: "bg-orange-500" },
  4: { label: "MED-HIGH", color: "bg-amber-500" },
  5: { label: "MEDIUM", color: "bg-yellow-500" },
  6: { label: "MED-LOW", color: "bg-lime-500" },
  7: { label: "LOW", color: "bg-green-500" },
  8: { label: "VERY LOW", color: "bg-emerald-500" },
  9: { label: "MINIMAL", color: "bg-teal-500" },
  10: { label: "NONE", color: "bg-slate-400" },
};

function _getInitials(
  firstName?: string | null,
  lastName?: string | null
): string {
  const first = firstName?.charAt(0)?.toUpperCase() || "";
  const last = lastName?.charAt(0)?.toUpperCase() || "";
  return first + last || "?";
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

export default function KitchenMobilePage() {
  const _searchParams = useSearchParams() ?? new URLSearchParams();
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("available");
  const [_currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [syncQueue, setSyncQueue] = useState<
    { taskId: string; action: "claim" | "release"; timestamp: string }[]
  >([]);

  // Fetch available tasks
  const fetchAvailableTasks = async () => {
    try {
      const response = await apiFetch("/api/kitchen/tasks/available");
      if (response.ok) {
        const data: ApiResponse = await response.json();
        setAvailableTasks(data.tasks);
        setCurrentUserId(data.userId || null);
      }
    } catch (error) {
      captureException(error);
    }
  };

  // Fetch my tasks
  const fetchMyTasks = async () => {
    try {
      const response = await apiFetch("/api/kitchen/tasks/my-tasks");
      if (response.ok) {
        const data: ApiResponse = await response.json();
        setMyTasks(data.tasks);
        setCurrentUserId(data.userId || null);
      }
    } catch (error) {
      captureException(error);
    }
  };

  // Initial load
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

  const syncOfflineClaims = async () => {
    if (!syncQueue || syncQueue.length === 0) {
      return;
    }

    try {
      const response = await apiFetch("/api/kitchen/tasks/sync-claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claims: syncQueue }),
      });

      if (response.ok) {
        setSyncQueue([]);
        fetchAvailableTasks();
        fetchMyTasks();
      }
    } catch (error) {
      captureException(error);
    }
  };

  // Sync offline queue when coming back online
  useEffect(() => {
    if (isOnline && syncQueue && syncQueue.length > 0) {
      syncOfflineClaims();
    }
  }, [isOnline, syncOfflineClaims, syncQueue]);

  const handleClaim = async (taskId: string) => {
    setIsLoading(true);

    if (!isOnline) {
      // Queue the action for later sync
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
      // Manifest route: /api/kitchen/kitchen-tasks/commands/claim
      const response = await apiFetch("/api/kitchen/kitchen-tasks/commands/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId }),
      });

      if (response.ok) {
        await fetchAvailableTasks();
        await fetchMyTasks();
        setActiveTab("my-tasks");
      } else {
        const error = await response.json();
        alert(error.message || "Failed to claim task");
      }
    } catch (error) {
      captureException(error);
      alert("Failed to claim task. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRelease = async (taskId: string) => {
    setIsLoading(true);

    if (!isOnline) {
      // Queue the action for later sync
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
      // Manifest route: /api/kitchen/kitchen-tasks/commands/release
      const response = await apiFetch("/api/kitchen/kitchen-tasks/commands/release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId, reason: "" }),
      });

      if (response.ok) {
        await fetchAvailableTasks();
        await fetchMyTasks();
      } else {
        const error = await response.json();
        alert(error.message || "Failed to release task");
      }
    } catch (error) {
      captureException(error);
      alert("Failed to release task. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async (taskId: string) => {
    setIsLoading(true);

    try {
      const response = await apiFetch(`/api/kitchen/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });

      if (response.ok) {
        await fetchMyTasks();
      } else {
        alert("Failed to complete task");
      }
    } catch (error) {
      captureException(error);
      alert("Failed to complete task. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const MobileTaskCard = ({
    task,
    type,
  }: {
    task: Task;
    type: "available" | "my-tasks";
  }) => {
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
              className={`flex items-center gap-1 rounded-full px-2 py-1 font-bold text-xs ${
                dueStatus.isOverdue
                  ? "bg-rose-100 text-rose-700"
                  : dueStatus.isUrgent
                    ? "bg-amber-100 text-amber-700"
                    : "bg-slate-100 text-slate-600"
              }`}
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
            onClick={() => handleClaim(task.id)}
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
              onClick={() => handleRelease(task.id)}
              variant="outline"
            >
              RELEASE
            </Button>
            {task.status === "in_progress" && (
              <Button
                className="h-14 flex-1 bg-emerald-600 text-lg font-bold hover:bg-emerald-700"
                disabled={isLoading || !isOnline}
                onClick={() => handleComplete(task.id)}
              >
                <CheckCircle2 className="mr-1 h-5 w-5" />
                DONE
              </Button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Header page="Mobile Tasks" pages={["Kitchen Ops"]} />

      {/* Offline indicator banner */}
      {!isOnline && (
        <div className="flex items-center justify-center gap-2 bg-amber-500 px-4 py-2">
          <WifiOff className="h-4 w-4 text-white" />
          <span className="font-medium text-white">
            You're offline. Actions will sync when you reconnect.
          </span>
        </div>
      )}

      {/* Sync queue indicator */}
      {syncQueue && syncQueue.length > 0 && (
        <div className="flex items-center justify-center gap-2 bg-blue-500 px-4 py-2">
          <AlertCircle className="h-4 w-4 text-white" />
          <span className="font-medium text-white">
            {syncQueue.length} action{syncQueue.length > 1 ? "s" : ""} pending
            sync
          </span>
        </div>
      )}

      <div className="flex flex-1 flex-col p-4">
        <Tabs
          className="flex flex-1 flex-col"
          onValueChange={(value) => {
            setActiveTab(value);
            if (value === "available") {
              fetchAvailableTasks();
            }
            if (value === "my-tasks") {
              fetchMyTasks();
            }
          }}
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
                <MobileTaskCard key={task.id} task={task} type="available" />
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
                <MobileTaskCard key={task.id} task={task} type="my-tasks" />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
