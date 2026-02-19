"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@repo/design-system/components/ui/sheet";
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
  Filter,
  RefreshCw,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/app/lib/api";
import type {
  ApiResponse,
  BundleClaimResponse,
  FilterState,
  OfflineQueueItem,
  Task,
} from "../types";
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
  // Multi-select props
  isMultiSelectMode,
  isSelected,
  onToggleSelect,
  onSelectAndClaim,
}: {
  task: Task;
  type: "available" | "my-tasks";
  isLoading: boolean;
  isOnline: boolean;
  onClaim: (taskId: string) => void;
  onRelease: (taskId: string) => void;
  onComplete: (taskId: string) => void;
  // Multi-select props
  isMultiSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (taskId: string) => void;
  onSelectAndClaim?: (taskId: string) => void;
}) {
  const priority = priorityConfig[task.priority] || priorityConfig[5];
  const dueStatus = formatDueStatus(task.dueDate);

  // Handle long press for multi-select
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [_isLongPress, setIsLongPress] = useState(false);

  const handleTouchStart = () => {
    setTouchStart(Date.now());
    setIsLongPress(false);
  };

  const handleTouchEnd = () => {
    if (touchStart && Date.now() - touchStart > 500 && onSelectAndClaim) {
      // Long press detected (500ms)
      setIsLongPress(true);
      onSelectAndClaim(task.id);
    }
    setTouchStart(null);
  };

  const handleCardClick = () => {
    if (isMultiSelectMode && onToggleSelect) {
      onToggleSelect(task.id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (
      isMultiSelectMode &&
      onToggleSelect &&
      (e.key === "Enter" || e.key === " ")
    ) {
      e.preventDefault();
      onToggleSelect(task.id);
    }
  };

  const hasInteractivity =
    isMultiSelectMode || (type === "available" && !isMultiSelectMode);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Mobile task card with long-press gesture support
    <div
      className={`mb-3 overflow-hidden rounded-xl border-2 bg-white p-4 shadow-sm ${
        dueStatus?.isUrgent ? "border-rose-300" : "border-slate-200"
      } ${dueStatus?.isOverdue ? "bg-rose-50" : ""} ${
        isSelected ? "ring-2 ring-blue-500 ring-offset-2" : ""
      } ${isMultiSelectMode ? "cursor-pointer" : ""}`}
      onClick={hasInteractivity ? handleCardClick : undefined}
      onKeyDown={hasInteractivity ? handleKeyDown : undefined}
      onTouchEnd={
        type === "available" && !isMultiSelectMode ? handleTouchEnd : undefined
      }
      onTouchStart={
        type === "available" && !isMultiSelectMode
          ? handleTouchStart
          : undefined
      }
      role={hasInteractivity ? "button" : undefined}
      tabIndex={hasInteractivity ? 0 : undefined}
    >
      {/* Multi-select checkbox */}
      {isMultiSelectMode && (
        <div className="mb-2 flex items-center gap-2">
          <Checkbox
            checked={isSelected}
            className="h-6 w-6"
            onCheckedChange={() => onToggleSelect?.(task.id)}
          />
          <span className="text-slate-600 text-sm">Select task</span>
        </div>
      )}

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
      {type === "available" && task.isAvailable && !isMultiSelectMode && (
        <Button
          className="h-14 w-full text-lg font-bold"
          disabled={isLoading || !isOnline}
          onClick={(e) => {
            e.stopPropagation();
            onClaim(task.id);
          }}
          size="lg"
        >
          CLAIM TASK
        </Button>
      )}

      {type === "my-tasks" && !isMultiSelectMode && (
        <div className="flex gap-2">
          <Button
            className="h-14 flex-1 text-lg font-bold"
            disabled={isLoading || !isOnline}
            onClick={(e) => {
              e.stopPropagation();
              onRelease(task.id);
            }}
            variant="outline"
          >
            RELEASE
          </Button>
          {task.status === "in_progress" && (
            <Button
              className="h-14 flex-1 bg-emerald-600 text-lg font-bold hover:bg-emerald-700"
              disabled={isLoading || !isOnline}
              onClick={(e) => {
                e.stopPropagation();
                onComplete(task.id);
              }}
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

  // Multi-select state
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(
    new Set()
  );

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    station: null,
    minPriority: null,
    eventId: null,
    myStation: null,
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Load "My Station" from localStorage on mount
  useEffect(() => {
    const savedStation = localStorage.getItem("mobile-kitchen-my-station");
    if (savedStation) {
      setFilters((prev) => ({ ...prev, myStation: savedStation }));
    }
  }, []);

  // Extract unique stations from available tasks
  const uniqueStations = Array.from(
    new Set(availableTasks.flatMap((t) => t.tags || []).filter(Boolean))
  );

  // Filter available tasks based on current filters
  const filteredAvailableTasks = availableTasks.filter((task) => {
    // Apply station filter
    if (filters.station && !(task.tags || []).includes(filters.station)) {
      return false;
    }
    // Apply my station quick filter
    if (filters.myStation && !(task.tags || []).includes(filters.myStation)) {
      return false;
    }
    // Apply priority filter
    if (filters.minPriority && task.priority > filters.minPriority) {
      return false;
    }
    return true;
  });

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

  // Multi-select handlers
  const toggleTaskSelection = useCallback((taskId: string) => {
    setSelectedTaskIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  }, []);

  const enterMultiSelectMode = useCallback((taskId: string) => {
    setIsMultiSelectMode(true);
    setSelectedTaskIds(new Set([taskId]));
  }, []);

  const exitMultiSelectMode = useCallback(() => {
    setIsMultiSelectMode(false);
    setSelectedTaskIds(new Set());
  }, []);

  const selectAllVisible = useCallback(() => {
    const availableTaskIds = filteredAvailableTasks
      .filter((t) => t.isAvailable)
      .map((t) => t.id);
    setSelectedTaskIds(new Set(availableTaskIds));
  }, [filteredAvailableTasks]);

  const selectAllForStation = useCallback(
    (station: string) => {
      const stationTaskIds = filteredAvailableTasks
        .filter((t) => t.isAvailable && (t.tags || []).includes(station))
        .map((t) => t.id);
      setSelectedTaskIds(new Set(stationTaskIds));
    },
    [filteredAvailableTasks]
  );

  // Bundle claim handler
  const handleBundleClaim = useCallback(async () => {
    if (selectedTaskIds.size === 0) {
      return;
    }

    setIsLoading(true);
    setError(null);
    const taskIds = Array.from(selectedTaskIds);

    if (!isOnline) {
      // Queue all tasks individually for offline sync
      setSyncQueue((prev = []) => [
        ...(prev || []),
        ...taskIds.map((taskId) => ({
          taskId,
          action: "claim" as const,
          timestamp: new Date().toISOString(),
        })),
      ]);
      exitMultiSelectMode();
      setIsLoading(false);
      return;
    }

    try {
      const response = await apiFetch("/api/kitchen/tasks/bundle-claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskIds }),
      });

      const data: BundleClaimResponse = await response.json();

      if (response.ok && data.success && data.data) {
        await fetchAvailableTasks();
        await fetchMyTasks();
        exitMultiSelectMode();
        setActiveTab("my-tasks");
      } else {
        // Handle specific error cases
        if (
          data.errorCode === "TASKS_ALREADY_CLAIMED" &&
          data.alreadyClaimedTaskIds
        ) {
          setError(
            `${data.alreadyClaimedTaskIds.length} task(s) were already claimed by others.`
          );
        } else if (
          data.errorCode === "TASKS_NOT_FOUND" &&
          data.notFoundTaskIds
        ) {
          setError(`${data.notFoundTaskIds.length} task(s) not found.`);
        } else {
          setError(data.message || "Failed to claim tasks");
        }
        captureException(
          new Error(`[MobileTasks] Bundle claim failed: ${data.message}`)
        );
      }
    } catch (err) {
      captureException(err);
      console.error("[MobileTasks] Failed to bundle claim tasks:", err);
      setError("Failed to claim tasks. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [
    selectedTaskIds,
    isOnline,
    fetchAvailableTasks,
    fetchMyTasks,
    exitMultiSelectMode,
  ]);

  // Filter handlers
  const setMyStation = useCallback((station: string | null) => {
    setFilters((prev) => ({ ...prev, myStation: station }));
    if (station) {
      localStorage.setItem("mobile-kitchen-my-station", station);
    } else {
      localStorage.removeItem("mobile-kitchen-my-station");
    }
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters({
      station: null,
      minPriority: null,
      eventId: null,
      myStation: filters.myStation, // Preserve myStation
    });
  }, [filters.myStation]);

  const activeFilterCount =
    (filters.station ? 1 : 0) +
    (filters.minPriority ? 1 : 0) +
    (filters.eventId ? 1 : 0);

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
    <div className="relative flex flex-1 flex-col p-4 pb-24">
      {/* Multi-select header */}
      {isMultiSelectMode && (
        <div className="mb-4 flex items-center justify-between rounded-lg bg-blue-100 p-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-blue-700">
              {selectedTaskIds.size} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              className="text-blue-700"
              onClick={selectAllVisible}
              size="sm"
              variant="ghost"
            >
              Select All
            </Button>
            <Button
              className="h-8 w-8"
              onClick={exitMultiSelectMode}
              size="icon"
              variant="ghost"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

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

      {/* Active filter chips */}
      {(filters.station || filters.myStation || activeFilterCount > 0) && (
        <div className="mb-3 flex flex-wrap gap-2">
          {filters.myStation && (
            <Badge
              className="flex items-center gap-1 bg-blue-500 px-3 py-1 text-white"
              variant="default"
            >
              My Station: {filters.myStation}
              <button
                className="ml-1 hover:text-blue-200"
                onClick={() => setMyStation(null)}
                type="button"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.station && filters.station !== filters.myStation && (
            <Badge
              className="flex items-center gap-1 bg-slate-500 px-3 py-1 text-white"
              variant="default"
            >
              Station: {filters.station}
              <button
                className="ml-1 hover:text-slate-200"
                onClick={() =>
                  setFilters((prev) => ({ ...prev, station: null }))
                }
                type="button"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {activeFilterCount > 0 && (
            <button
              className="text-slate-500 text-sm underline"
              onClick={clearAllFilters}
              type="button"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      <Tabs
        className="flex flex-1 flex-col"
        onValueChange={handleTabChange}
        value={activeTab}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger className="text-base" value="available">
            Available ({filteredAvailableTasks.length})
          </TabsTrigger>
          <TabsTrigger className="text-base" value="my-tasks">
            My Tasks ({myTasks.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent className="mt-4 flex-1" value="available">
          {/* Toolbar with refresh and filter */}
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
            <div className="flex gap-2">
              {/* Filter button */}
              <Sheet onOpenChange={setIsFilterOpen} open={isFilterOpen}>
                <SheetTrigger asChild>
                  <Button className="relative" size="sm" variant="outline">
                    <Filter className="h-4 w-4" />
                    {activeFilterCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[10px] text-white">
                        {activeFilterCount}
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent className="h-auto" side="bottom">
                  <SheetHeader>
                    <SheetTitle>Filter Tasks</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4 space-y-4">
                    {/* My Station quick filter */}
                    <div>
                      <h4 className="mb-2 font-medium text-sm">My Station</h4>
                      <div className="flex flex-wrap gap-2">
                        {uniqueStations.length > 0 ? (
                          uniqueStations.map((station) => (
                            <Button
                              className={
                                filters.myStation === station
                                  ? "bg-blue-500 text-white"
                                  : ""
                              }
                              key={station}
                              onClick={() =>
                                setMyStation(
                                  filters.myStation === station ? null : station
                                )
                              }
                              size="sm"
                              variant="outline"
                            >
                              {station}
                            </Button>
                          ))
                        ) : (
                          <span className="text-slate-500 text-sm">
                            No stations found
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Station filter */}
                    <div>
                      <h4 className="mb-2 font-medium text-sm">Station</h4>
                      <div className="flex flex-wrap gap-2">
                        {uniqueStations.map((station) => (
                          <Button
                            className={
                              filters.station === station
                                ? "bg-blue-500 text-white"
                                : ""
                            }
                            key={`station-${station}`}
                            onClick={() =>
                              setFilters((prev) => ({
                                ...prev,
                                station:
                                  prev.station === station ? null : station,
                              }))
                            }
                            size="sm"
                            variant="outline"
                          >
                            {station}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Priority filter */}
                    <div>
                      <h4 className="mb-2 font-medium text-sm">Max Priority</h4>
                      <div className="flex flex-wrap gap-2">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((p) => (
                          <Button
                            className={
                              filters.minPriority === p
                                ? "bg-blue-500 text-white"
                                : ""
                            }
                            key={p}
                            onClick={() =>
                              setFilters((prev) => ({
                                ...prev,
                                minPriority: prev.minPriority === p ? null : p,
                              }))
                            }
                            size="sm"
                            variant="outline"
                          >
                            ≤{p}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Select All for Station shortcuts */}
                    {uniqueStations.length > 0 && (
                      <div>
                        <h4 className="mb-2 font-medium text-sm">
                          Select All [Station]
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {uniqueStations.map((station) => (
                            <Button
                              key={`select-${station}`}
                              onClick={() => {
                                selectAllForStation(station);
                                setIsMultiSelectMode(true);
                                setIsFilterOpen(false);
                              }}
                              size="sm"
                              variant="secondary"
                            >
                              All {station}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Clear and Done buttons */}
                    <div className="flex gap-2 pt-4">
                      <Button
                        className="flex-1"
                        onClick={clearAllFilters}
                        variant="outline"
                      >
                        Clear All
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={() => setIsFilterOpen(false)}
                      >
                        Done
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              {/* Refresh button */}
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
          </div>

          {/* Available tasks list */}
          {filteredAvailableTasks.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-12">
              <CheckCircle2 className="mb-4 h-16 w-16 text-emerald-500" />
              <p className="text-center text-slate-600">
                {availableTasks.length === 0
                  ? "No available tasks right now!"
                  : "No tasks match your filters"}
              </p>
              <p className="mt-2 text-center text-slate-500 text-sm">
                {availableTasks.length === 0
                  ? "Check back later or pull to refresh."
                  : "Try adjusting your filters."}
              </p>
            </div>
          ) : (
            filteredAvailableTasks.map((task) => (
              <MobileTaskCard
                isLoading={isLoading}
                isMultiSelectMode={isMultiSelectMode}
                isOnline={isOnline}
                isSelected={selectedTaskIds.has(task.id)}
                key={task.id}
                onClaim={handleClaim}
                onComplete={handleComplete}
                onRelease={handleRelease}
                onSelectAndClaim={enterMultiSelectMode}
                onToggleSelect={toggleTaskSelection}
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
                You haven&apos;t claimed any tasks yet.
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

      {/* Floating Claim Button - only in multi-select mode with selected tasks */}
      {isMultiSelectMode && selectedTaskIds.size > 0 && (
        <div className="fixed bottom-20 left-4 right-4 z-50">
          <Button
            className="h-16 w-full text-lg font-bold shadow-xl"
            disabled={isLoading || !isOnline}
            onClick={handleBundleClaim}
            size="lg"
          >
            <CheckCircle2 className="mr-2 h-6 w-6" />
            CLAIM {selectedTaskIds.size} TASK
            {selectedTaskIds.size > 1 ? "S" : ""}
          </Button>
        </div>
      )}
    </div>
  );
}
