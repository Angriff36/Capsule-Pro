"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.default = KitchenMobilePage;
const badge_1 = require("@repo/design-system/components/ui/badge");
const button_1 = require("@repo/design-system/components/ui/button");
const tabs_1 = require("@repo/design-system/components/ui/tabs");
const date_fns_1 = require("date-fns");
const lucide_react_1 = require("lucide-react");
const navigation_1 = require("next/navigation");
const react_1 = require("react");
const header_1 = require("../../components/header");
const priorityConfig = {
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
function getInitials(firstName, lastName) {
  const first = firstName?.charAt(0)?.toUpperCase() || "";
  const last = lastName?.charAt(0)?.toUpperCase() || "";
  return first + last || "?";
}
function formatDueStatus(dueDate) {
  if (!dueDate) return null;
  const now = new Date();
  const due = new Date(dueDate);
  const diffMins = (0, date_fns_1.differenceInMinutes)(due, now);
  if ((0, date_fns_1.isPast)(due) && diffMins < -30) {
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
  return {
    label: (0, date_fns_1.format)(due, "h:mm a"),
    isOverdue: false,
    isUrgent: false,
  };
}
function KitchenMobilePage() {
  const searchParams = (0, navigation_1.useSearchParams)();
  const [availableTasks, setAvailableTasks] = (0, react_1.useState)([]);
  const [myTasks, setMyTasks] = (0, react_1.useState)([]);
  const [isOnline, setIsOnline] = (0, react_1.useState)(true);
  const [isLoading, setIsLoading] = (0, react_1.useState)(false);
  const [activeTab, setActiveTab] = (0, react_1.useState)("available");
  const [currentUserId, setCurrentUserId] = (0, react_1.useState)(null);
  const [syncQueue, setSyncQueue] = (0, react_1.useState)([]);
  // Fetch available tasks
  const fetchAvailableTasks = async () => {
    try {
      const response = await fetch("/api/kitchen/tasks/available");
      if (response.ok) {
        const data = await response.json();
        setAvailableTasks(data.tasks);
        setCurrentUserId(data.userId || null);
      }
    } catch (error) {
      console.error("Error fetching available tasks:", error);
    }
  };
  // Fetch my tasks
  const fetchMyTasks = async () => {
    try {
      const response = await fetch("/api/kitchen/tasks/my-tasks");
      if (response.ok) {
        const data = await response.json();
        setMyTasks(data.tasks);
        setCurrentUserId(data.userId || null);
      }
    } catch (error) {
      console.error("Error fetching my tasks:", error);
    }
  };
  // Initial load
  (0, react_1.useEffect)(() => {
    fetchAvailableTasks();
    fetchMyTasks();
  }, []);
  // Monitor online/offline status
  (0, react_1.useEffect)(() => {
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
  (0, react_1.useEffect)(() => {
    if (isOnline && syncQueue && syncQueue.length > 0) {
      syncOfflineClaims();
    }
  }, [isOnline]);
  const syncOfflineClaims = async () => {
    if (!syncQueue || syncQueue.length === 0) return;
    try {
      const response = await fetch("/api/kitchen/tasks/sync-claims", {
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
      console.error("Error syncing claims:", error);
    }
  };
  const handleClaim = async (taskId) => {
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
      const response = await fetch(`/api/kitchen/tasks/${taskId}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      console.error("Error claiming task:", error);
      alert("Failed to claim task. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  const handleRelease = async (taskId) => {
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
      const response = await fetch(`/api/kitchen/tasks/${taskId}/release`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (response.ok) {
        await fetchAvailableTasks();
        await fetchMyTasks();
      } else {
        const error = await response.json();
        alert(error.message || "Failed to release task");
      }
    } catch (error) {
      console.error("Error releasing task:", error);
      alert("Failed to release task. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  const handleComplete = async (taskId) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/kitchen/tasks/${taskId}`, {
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
      console.error("Error completing task:", error);
      alert("Failed to complete task. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  const MobileTaskCard = ({ task, type }) => {
    const priority = priorityConfig[task.priority] || priorityConfig[5];
    const dueStatus = formatDueStatus(task.dueDate);
    return (
      <div
        className={`mb-3 overflow-hidden rounded-xl border-2 bg-white p-4 shadow-sm ${dueStatus?.isUrgent ? "border-rose-300" : "border-slate-200"} ${dueStatus?.isOverdue ? "bg-rose-50" : ""}`}
      >
        {/* Priority indicator */}
        <div className={"mb-3 flex items-center justify-between"}>
          <badge_1.Badge
            className={`${priority.color} border-0 font-bold text-xs`}
          >
            {priority.label}
          </badge_1.Badge>
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
              <lucide_react_1.Clock className="h-3 w-3" />
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
              <lucide_react_1.AlertCircle className="h-4 w-4 text-slate-500" />
              <span className="text-slate-600 text-xs">
                Claimed by {task.claims[0].user?.firstName || "Someone"}
              </span>
            </div>
          )}

        {/* Action button - LARGE for mobile */}
        {type === "available" && task.isAvailable && (
          <button_1.Button
            className="h-14 w-full text-lg font-bold"
            disabled={isLoading || !isOnline}
            onClick={() => handleClaim(task.id)}
            size="lg"
          >
            CLAIM TASK
          </button_1.Button>
        )}

        {type === "my-tasks" && (
          <div className="flex gap-2">
            <button_1.Button
              className="h-14 flex-1 text-lg font-bold"
              disabled={isLoading || !isOnline}
              onClick={() => handleRelease(task.id)}
              variant="outline"
            >
              RELEASE
            </button_1.Button>
            {task.status === "in_progress" && (
              <button_1.Button
                className="h-14 flex-1 bg-emerald-600 text-lg font-bold hover:bg-emerald-700"
                disabled={isLoading || !isOnline}
                onClick={() => handleComplete(task.id)}
              >
                <lucide_react_1.CheckCircle2 className="mr-1 h-5 w-5" />
                DONE
              </button_1.Button>
            )}
          </div>
        )}
      </div>
    );
  };
  return (
    <>
      <header_1.Header page="Mobile Tasks" pages={["Kitchen Ops"]} />

      {/* Offline indicator banner */}
      {!isOnline && (
        <div className="flex items-center justify-center gap-2 bg-amber-500 px-4 py-2">
          <lucide_react_1.WifiOff className="h-4 w-4 text-white" />
          <span className="font-medium text-white">
            You're offline. Actions will sync when you reconnect.
          </span>
        </div>
      )}

      {/* Sync queue indicator */}
      {syncQueue && syncQueue.length > 0 && (
        <div className="flex items-center justify-center gap-2 bg-blue-500 px-4 py-2">
          <lucide_react_1.AlertCircle className="h-4 w-4 text-white" />
          <span className="font-medium text-white">
            {syncQueue.length} action{syncQueue.length > 1 ? "s" : ""} pending
            sync
          </span>
        </div>
      )}

      <div className="flex flex-1 flex-col p-4">
        <tabs_1.Tabs
          className="flex flex-1 flex-col"
          onValueChange={(value) => {
            setActiveTab(value);
            if (value === "available") fetchAvailableTasks();
            if (value === "my-tasks") fetchMyTasks();
          }}
          value={activeTab}
        >
          <tabs_1.TabsList className="grid w-full grid-cols-2">
            <tabs_1.TabsTrigger className="text-base" value="available">
              Available ({availableTasks.length})
            </tabs_1.TabsTrigger>
            <tabs_1.TabsTrigger className="text-base" value="my-tasks">
              My Tasks ({myTasks.length})
            </tabs_1.TabsTrigger>
          </tabs_1.TabsList>

          <tabs_1.TabsContent className="mt-4 flex-1" value="available">
            {/* Refresh button */}
            <div className="mb-4 flex items-center justify-between">
              <span className="text-slate-600 text-sm">
                {isOnline ? (
                  <span className="flex items-center gap-1">
                    <lucide_react_1.Wifi className="h-3 w-3 text-emerald-500" />
                    Online
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <lucide_react_1.WifiOff className="h-3 w-3 text-amber-500" />
                    Offline
                  </span>
                )}
              </span>
              <button_1.Button
                disabled={isLoading || !isOnline}
                onClick={fetchAvailableTasks}
                size="sm"
                variant="outline"
              >
                <lucide_react_1.RefreshCw
                  className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                />
              </button_1.Button>
            </div>

            {/* Available tasks list */}
            {availableTasks.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center py-12">
                <lucide_react_1.CheckCircle2 className="mb-4 h-16 w-16 text-emerald-500" />
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
          </tabs_1.TabsContent>

          <tabs_1.TabsContent className="mt-4 flex-1" value="my-tasks">
            {/* Refresh button */}
            <div className="mb-4 flex items-center justify-between">
              <span className="text-slate-600 text-sm">
                {isOnline ? (
                  <span className="flex items-center gap-1">
                    <lucide_react_1.Wifi className="h-3 w-3 text-emerald-500" />
                    Online
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <lucide_react_1.WifiOff className="h-3 w-3 text-amber-500" />
                    Offline
                  </span>
                )}
              </span>
              <button_1.Button
                disabled={isLoading || !isOnline}
                onClick={fetchMyTasks}
                size="sm"
                variant="outline"
              >
                <lucide_react_1.RefreshCw
                  className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                />
              </button_1.Button>
            </div>

            {/* My tasks list */}
            {myTasks.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center py-12">
                <lucide_react_1.Clock className="mb-4 h-16 w-16 text-slate-400" />
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
          </tabs_1.TabsContent>
        </tabs_1.Tabs>
      </div>
    </>
  );
}
