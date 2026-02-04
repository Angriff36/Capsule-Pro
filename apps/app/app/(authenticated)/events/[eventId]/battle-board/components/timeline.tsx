"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { addMinutes, differenceInMinutes, format } from "date-fns";
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  CalendarIcon,
  ClockIcon,
  MoreHorizontalIcon,
  MoveIcon,
  PlusIcon,
  Redo2Icon,
  RefreshCwIcon,
  Undo2Icon,
  UsersIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from "lucide-react";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import {
  calculateCriticalPath,
  deleteTimelineTask,
  updateTimelineTask,
} from "../actions/tasks";
import {
  PRIORITY_ORDER,
  type StaffMember,
  TASK_STATUS_COLORS,
  TASK_STATUS_ICONS,
  type TimelineTask,
} from "../types";
import { DependencyLines } from "./dependency-lines";
import { TaskModal } from "./task-modal";

interface TimelineProps {
  eventId: string;
  eventDate: Date;
  initialTasks: TimelineTask[];
  initialStaff: StaffMember[];
}

const MINUTES_PER_HOUR = 60;
const PIXELS_PER_MINUTE = 4;
const SNAP_INTERVAL = 5;
const ROW_HEIGHT = 48;
const MIN_TASK_WIDTH = 30;

interface TaskAction {
  id: string;
  type: "create" | "update" | "delete";
  previousState?: TimelineTask;
  newState?: TimelineTask;
}

export function Timeline({
  eventId,
  eventDate,
  initialTasks,
  initialStaff,
}: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tasks, setTasks] = useState<TimelineTask[]>(initialTasks);
  const [staff, _setStaff] = useState<StaffMember[]>(initialStaff);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [showDependencies, setShowDependencies] = useState(true);
  const [showCriticalPath, setShowCriticalPath] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [_scrollX, setScrollX] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [undoStack, setUndoStack] = useState<TaskAction[]>([]);
  const [redoStack, setRedoStack] = useState<TaskAction[]>([]);
  const [conflicts, setConflicts] = useState<Map<string, string[]>>(new Map());
  const [isCalculatingCriticalPath, setIsCalculatingCriticalPath] =
    useState(false);

  const [dragState, setDragState] = useState({
    isDragging: false,
    taskId: null as string | null,
    startX: 0,
    startY: 0,
    originalStartTime: 0,
    originalDuration: 0,
    originalRow: 0,
  });

  const [_editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [_showStaffPanel, _setShowStaffPanel] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const taskPositions = useMemo(() => {
    const positions = new Map<
      string,
      { left: number; top: number; width: number; height: number }
    >();
    tasks.forEach((task, index) => {
      const startDate = new Date(task.startTime);
      const startTimeMinutes = differenceInMinutes(startDate, eventDate);
      const endDate = new Date(task.endTime);
      const duration = differenceInMinutes(endDate, startDate);

      positions.set(task.id, {
        left: startTimeMinutes * PIXELS_PER_MINUTE * (zoom / 100),
        top: index * ROW_HEIGHT,
        width: Math.max(
          duration * PIXELS_PER_MINUTE * (zoom / 100),
          MIN_TASK_WIDTH
        ),
        height: ROW_HEIGHT - 16,
      });
    });
    return positions;
  }, [tasks, eventDate, zoom]);

  const detectConflicts = useCallback((taskList: TimelineTask[]) => {
    const newConflicts = new Map<string, string[]>();

    for (let i = 0; i < taskList.length; i++) {
      const taskA = taskList[i];
      const taskAStart = new Date(taskA.startTime).getTime();
      const taskAEnd = new Date(taskA.endTime).getTime();
      const _taskAAssignees = taskA.assigneeId ? [taskA.assigneeId] : [];

      for (let j = i + 1; j < taskList.length; j++) {
        const taskB = taskList[j];
        const taskBStart = new Date(taskB.startTime).getTime();
        const taskBEnd = new Date(taskB.endTime).getTime();

        const timeOverlap = taskAStart < taskBEnd && taskBStart < taskAEnd;

        if (
          timeOverlap &&
          taskA.assigneeId &&
          taskB.assigneeId &&
          taskA.assigneeId === taskB.assigneeId
        ) {
          const existing = newConflicts.get(taskA.id) || [];
          if (!existing.includes(taskB.id)) {
            existing.push(taskB.id);
          }
          newConflicts.set(taskA.id, existing);

          const existingB = newConflicts.get(taskB.id) || [];
          if (!existingB.includes(taskA.id)) {
            existingB.push(taskA.id);
          }
          newConflicts.set(taskB.id, existingB);
        }
      }
    }

    setConflicts(newConflicts);
    return newConflicts;
  }, []);

  useEffect(() => {
    detectConflicts(tasks);
  }, [tasks, detectConflicts]);

  const calculateTaskPosition = useCallback(
    (task: TimelineTask) =>
      taskPositions.get(task.id) || { left: 0, top: 0, width: 0, height: 0 },
    [taskPositions]
  );

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    setScrollX(target.scrollLeft);
  }, []);

  const handleTaskClick = useCallback(
    (taskId: string, event: React.MouseEvent) => {
      event.stopPropagation();

      if (event.shiftKey) {
        setSelectedTaskIds((prev) =>
          prev.includes(taskId)
            ? prev.filter((id) => id !== taskId)
            : [...prev, taskId]
        );
      } else {
        setSelectedTaskIds([taskId]);
      }
    },
    []
  );

  const handleDragStart = useCallback(
    (e: React.MouseEvent, taskId: string) => {
      e.preventDefault();
      const task = tasks.find((t) => t.id === taskId);
      if (!task) {
        return;
      }

      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setDragState({
        isDragging: true,
        taskId,
        startX: e.clientX - rect.left,
        startY: e.clientY - rect.top,
        originalStartTime: differenceInMinutes(
          new Date(task.startTime),
          eventDate
        ),
        originalDuration: differenceInMinutes(
          new Date(task.endTime),
          new Date(task.startTime)
        ),
        originalRow: tasks.findIndex((t) => t.id === taskId),
      });
    },
    [tasks, eventDate]
  );

  const handleDragMove = useCallback(
    (e: MouseEvent) => {
      if (!(dragState.isDragging && dragState.taskId)) {
        return;
      }

      const container = containerRef.current;
      if (!container) {
        return;
      }

      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left - dragState.startX;
      const y = e.clientY - rect.top - dragState.startY;

      const newStartTime = Math.round(x / (PIXELS_PER_MINUTE * (zoom / 100)));
      const _newRow = Math.max(0, Math.floor(y / ROW_HEIGHT));

      const snappedStartTime =
        Math.round(newStartTime / SNAP_INTERVAL) * SNAP_INTERVAL;

      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === dragState.taskId
            ? {
                ...task,
                startTime: format(
                  addMinutes(eventDate, snappedStartTime),
                  "yyyy-MM-dd HH:mm:ss"
                ),
                endTime: format(
                  addMinutes(
                    addMinutes(eventDate, snappedStartTime),
                    dragState.originalDuration
                  ),
                  "yyyy-MM-dd HH:mm:ss"
                ),
              }
            : task
        )
      );
    },
    [dragState, eventDate, zoom]
  );

  const handleDragEnd = useCallback(async () => {
    if (!dragState.taskId) {
      return;
    }

    const task = tasks.find((t) => t.id === dragState.taskId);
    if (!task) {
      return;
    }

    await updateTimelineTask({
      id: dragState.taskId,
      eventId,
      startTime: task.startTime,
      endTime: task.endTime,
    });

    setDragState({
      isDragging: false,
      taskId: null,
      startX: 0,
      startY: 0,
      originalStartTime: 0,
      originalDuration: 0,
      originalRow: 0,
    });

    toast.success("Task updated");
  }, [dragState, tasks, eventId]);

  const _handleStatusChange = useCallback(
    async (taskId: string, newStatus: TimelineTask["status"]) => {
      await updateTimelineTask({
        id: taskId,
        eventId,
        status: newStatus,
      });

      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId ? { ...task, status: newStatus } : task
        )
      );

      toast.success(`Task marked as ${newStatus.replace("_", " ")}`);
    },
    [eventId]
  );

  const _handleProgressChange = useCallback(
    async (taskId: string, newProgress: number) => {
      await updateTimelineTask({
        id: taskId,
        eventId,
        progress: newProgress,
      });

      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId ? { ...task, progress: newProgress } : task
        )
      );
    },
    [eventId]
  );

  const handleDeleteTask = useCallback(
    async (taskId: string) => {
      if (!confirm("Are you sure you want to delete this task?")) {
        return;
      }

      const taskToDelete = tasks.find((t) => t.id === taskId);

      await deleteTimelineTask(taskId, eventId);

      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      setSelectedTaskIds((prev) => prev.filter((id) => id !== taskId));

      if (taskToDelete) {
        setUndoStack((prev) => [
          {
            id: `${Date.now()}`,
            type: "delete",
            previousState: taskToDelete,
          },
          ...prev,
        ]);
        setRedoStack([]);
      }

      toast.success("Task deleted");
    },
    [tasks, eventId]
  );

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) {
      return;
    }

    const action = undoStack[0];
    const newUndoStack = undoStack.slice(1);

    if (action.type === "delete" && action.previousState) {
      setTasks((prev) => [...prev, action.previousState!]);
      setRedoStack((prev) => [action, ...prev]);
    }

    setUndoStack(newUndoStack);
    toast.info("Undo successful");
  }, [undoStack]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) {
      return;
    }

    const action = redoStack[0];
    const newRedoStack = redoStack.slice(1);

    if (action.type === "delete" && action.previousState) {
      setTasks((prev) => prev.filter((t) => t.id !== action.previousState?.id));
      setUndoStack((prev) => [action, ...prev]);
    }

    setRedoStack(newRedoStack);
    toast.info("Redo successful");
  }, [redoStack]);

  const handleTaskCreated = useCallback((newTask: TimelineTask) => {
    setTasks((prev) => [...prev, newTask]);
    setUndoStack((prev) => [
      {
        id: `${Date.now()}`,
        type: "create",
        newState: newTask,
      },
      ...prev,
    ]);
    setRedoStack([]);
    toast.success("Task created");
  }, []);

  const handleCalculateCriticalPath = useCallback(async () => {
    setIsCalculatingCriticalPath(true);
    try {
      const results = await calculateCriticalPath(eventId);

      // Convert Map to array of updated task data
      const updatedTasks = tasks.map((task) => {
        const result = results.get(task.id);
        if (result) {
          return {
            ...task,
            isOnCriticalPath: result.isOnCriticalPath,
            slackMinutes: result.slackMinutes,
          };
        }
        return task;
      });

      setTasks(updatedTasks);

      const criticalCount = Array.from(results.values()).filter(
        (r) => r.isOnCriticalPath
      ).length;

      toast.success(
        `Critical path calculated: ${criticalCount} critical task${criticalCount !== 1 ? "s" : ""} identified`
      );
    } catch (error) {
      console.error("Failed to calculate critical path:", error);
      toast.error(
        `Failed to calculate critical path: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setIsCalculatingCriticalPath(false);
    }
  }, [eventId, tasks]);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(200, prev + 25));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(50, prev - 25));
  }, []);

  const handleJumpToNow = useCallback(() => {
    if (scrollContainerRef.current) {
      const nowMinutes = differenceInMinutes(currentTime, eventDate);
      const scrollPosition = nowMinutes * PIXELS_PER_MINUTE * (zoom / 100);
      scrollContainerRef.current.scrollLeft = scrollPosition - 100;
    }
  }, [currentTime, eventDate, zoom]);

  const handleKeyDown = useCallback(
    (e: ReactKeyboardEvent) => {
      if (e.key === "Delete" && selectedTaskIds.length > 0) {
        for (const id of selectedTaskIds) {
          handleDeleteTask(id);
        }
      }

      if (e.key === "Escape") {
        setSelectedTaskIds([]);
        setEditingTaskId(null);
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
    },
    [selectedTaskIds, handleDeleteTask, handleUndo, handleRedo]
  );

  useEffect(() => {
    window.addEventListener("mousemove", handleDragMove);
    window.addEventListener("mouseup", handleDragEnd);

    return () => {
      window.removeEventListener("mousemove", handleDragMove);
      window.removeEventListener("mouseup", handleDragEnd);
    };
  }, [handleDragMove, handleDragEnd]);

  const renderTimeMarkers = () => {
    const markers: React.ReactNode[] = [];
    const totalHours = 24;

    for (let hour = 0; hour <= totalHours; hour++) {
      const left = hour * MINUTES_PER_HOUR * PIXELS_PER_MINUTE * (zoom / 100);
      markers.push(
        <div
          className="absolute top-0 border-border/30 border-l text-muted-foreground text-xs"
          key={`marker-${hour}`}
          style={{ left }}
        >
          <span className="absolute -top-3 -left-8 bg-background px-1">
            {hour % 3 === 0 ? `${hour}:00` : ""}
          </span>
        </div>
      );
    }

    return markers;
  };

  const renderCurrentTimeIndicator = () => {
    const nowMinutes = differenceInMinutes(currentTime, eventDate);

    if (nowMinutes < 0 || nowMinutes > 24 * 60) {
      return null;
    }

    const left = nowMinutes * PIXELS_PER_MINUTE * (zoom / 100);

    return (
      <div
        className="pointer-events-none absolute top-0 bottom-0 z-10 w-0.5 bg-red-500"
        style={{ left }}
      >
        <div className="absolute -top-2 -left-2 rounded-full bg-red-500 px-1.5 py-0.5 font-medium text-white text-xs">
          NOW
        </div>
      </div>
    );
  };

  const getAvailabilityColor = (availability: StaffMember["availability"]) => {
    switch (availability) {
      case "available":
        return "bg-green-500";
      case "at_capacity":
        return "bg-yellow-500";
      case "overbooked":
        return "bg-red-500";
    }
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    const priorityCompare =
      PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
    if (priorityCompare !== 0) {
      return priorityCompare;
    }

    const timeCompare =
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    return timeCompare;
  });

  const totalTasks = sortedTasks.length;
  const completedTasks = sortedTasks.filter(
    (t) => t.status === "completed"
  ).length;
  const progressPercentage =
    totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const hasConflicts = conflicts.size > 0;

  return (
    <div
      aria-label="Timeline view"
      className="flex h-full flex-col overflow-hidden"
      onKeyDown={handleKeyDown}
      ref={containerRef}
      role="region"
    >
      <header className="flex items-center justify-between border-b bg-background px-4 py-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <h1 className="font-semibold text-foreground text-lg">
              Battle Board
            </h1>
            {hasConflicts && (
              <Badge className="flex items-center gap-1" variant="destructive">
                <AlertCircleIcon className="h-3 w-3" />
                Conflicts
              </Badge>
            )}
          </div>
          <div className="h-6 w-px bg-border" />
          <div className="flex items-center gap-2">
            <div className="text-muted-foreground text-sm">
              {format(eventDate, "MMM d, yyyy")}
            </div>
            <div className="h-4 w-px bg-border" />
            <div className="text-muted-foreground text-xs">
              {completedTasks}/{totalTasks} tasks
            </div>
          </div>
          <div className="h-6 w-px bg-border" />
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">Progress:</span>
            <div className="relative h-2 w-32 overflow-hidden rounded-full bg-muted">
              <div
                className="absolute inset-y-0 left-0 bg-primary transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <span className="ml-2 font-medium text-foreground text-xs">
              {Math.round(progressPercentage)}%
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            disabled={undoStack.length === 0}
            onClick={handleUndo}
            size="sm"
            title="Undo (Ctrl+Z)"
            variant="outline"
          >
            <Undo2Icon className="h-3 w-3" />
          </Button>
          <Button
            disabled={redoStack.length === 0}
            onClick={handleRedo}
            size="sm"
            title="Redo (Ctrl+Shift+Z)"
            variant="outline"
          >
            <Redo2Icon className="h-3 w-3" />
          </Button>
          <div className="h-6 w-px bg-border" />
          <Button onClick={handleJumpToNow} size="sm" variant="outline">
            <MoveIcon className="mr-2 h-3 w-3" />
            Jump to Now
          </Button>
          <Button
            onClick={() => setShowDependencies((prev) => !prev)}
            size="sm"
            variant={showDependencies ? "default" : "outline"}
          >
            Show Dependencies
          </Button>
          <div className="flex items-center gap-1">
            <Button
              onClick={() => setShowCriticalPath((prev) => !prev)}
              size="sm"
              variant={showCriticalPath ? "default" : "outline"}
            >
              Critical Path
            </Button>
            <Button
              disabled={isCalculatingCriticalPath}
              onClick={handleCalculateCriticalPath}
              size="sm"
              title="Recalculate critical path"
              variant="outline"
            >
              <RefreshCwIcon
                className={`h-3 w-3 ${isCalculatingCriticalPath ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
          <div className="flex items-center gap-1 rounded-md border bg-background">
            <Button onClick={handleZoomOut} size="sm" variant="ghost">
              <ZoomOutIcon className="h-4 w-4" />
            </Button>
            <span className="min-w-[3rem] text-center text-muted-foreground text-xs">
              {zoom}%
            </span>
            <Button onClick={handleZoomIn} size="sm" variant="ghost">
              <ZoomInIcon className="h-4 w-4" />
            </Button>
          </div>
          <Button
            onClick={() => setIsSidebarCollapsed((prev) => !prev)}
            size="sm"
            variant="ghost"
          >
            <UsersIcon className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        <div
          className="relative flex-1 overflow-x-auto overflow-y-auto bg-muted/20"
          onScroll={handleScroll}
          ref={scrollContainerRef}
        >
          <div
            className="relative min-h-full"
            style={{
              width: `${24 * 60 * PIXELS_PER_MINUTE * (zoom / 100)}px`,
            }}
          >
            {renderTimeMarkers()}
            {renderCurrentTimeIndicator()}

            <DependencyLines
              eventDate={eventDate}
              showDependencies={showDependencies}
              taskPositions={taskPositions}
              tasks={sortedTasks}
              zoom={zoom}
            />

            {sortedTasks.map((task, _index) => {
              const position = calculateTaskPosition(task);
              const isSelected = selectedTaskIds.includes(task.id);
              const statusClasses = TASK_STATUS_COLORS[task.status];
              const isCritical = task.isOnCriticalPath && showCriticalPath;
              const taskConflicts = conflicts.get(task.id);

              return (
                <div
                  aria-label={`Task: ${task.title}, ${task.status.replace("_", " ")}${taskConflicts ? ", has scheduling conflict" : ""}`}
                  className={`absolute cursor-pointer rounded-md border-2 transition-all duration-150 ${
                    isSelected ? "ring-2 ring-primary ring-offset-2" : ""
                  } ${statusClasses} ${isCritical ? "border-l-4 border-l-red-500" : ""} ${
                    taskConflicts ? "border-orange-400 border-dashed" : ""
                  }`}
                  key={task.id}
                  onClick={(e) => handleTaskClick(task.id, e)}
                  onMouseDown={(e) => handleDragStart(e, task.id)}
                  role="button"
                  style={{
                    left: `${position.left}px`,
                    top: `${position.top + 8}px`,
                    width: `${position.width}px`,
                    height: `${ROW_HEIGHT - 16}px`,
                  }}
                  tabIndex={0}
                >
                  <div className="flex h-full flex-col justify-between px-2 py-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="truncate font-semibold text-sm">
                        {task.title}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {TASK_STATUS_ICONS[task.status]}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <ClockIcon className="h-3 w-3" />
                        <span className="text-muted-foreground text-xs">
                          {format(new Date(task.startTime), "HH:mm")} -{" "}
                          {format(new Date(task.endTime), "HH:mm")}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {task.assigneeName && (
                          <span className="max-w-[80px] truncate text-muted-foreground text-xs">
                            {task.assigneeName}
                          </span>
                        )}
                        {task.priority === "critical" && (
                          <AlertTriangleIcon className="h-3 w-3 text-red-500" />
                        )}
                        {taskConflicts && (
                          <AlertCircleIcon className="h-3 w-3 text-orange-500" />
                        )}
                      </div>
                    </div>
                  </div>

                  {task.isOnCriticalPath && showCriticalPath && (
                    <Badge
                      className="absolute -top-1 -right-1 px-1.5 py-0 text-xs"
                      variant="destructive"
                    >
                      CRITICAL
                    </Badge>
                  )}

                  {taskConflicts && (
                    <Badge
                      className="absolute -top-1 -right-1 border-orange-300 bg-orange-50 px-1.5 py-0 text-orange-700 text-xs"
                      variant="outline"
                    >
                      CONFLICT
                    </Badge>
                  )}
                </div>
              );
            })}

            {tasks.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center">
                <div className="mb-4 text-muted-foreground/50">
                  <ClockIcon className="mx-auto h-12 w-12" />
                </div>
                <h3 className="mb-2 font-medium text-muted-foreground">
                  No tasks on timeline
                </h3>
                <p className="mb-4 text-muted-foreground text-sm">
                  Add your first task to start planning the event execution
                </p>
                <Button onClick={() => setIsTaskModalOpen(true)} size="lg">
                  <PlusIcon className="mr-2 h-5 w-5" />
                  Add Task
                </Button>
              </div>
            )}

            {tasks.length > 0 && (
              <div className="absolute right-4 bottom-4">
                <Button onClick={() => setIsTaskModalOpen(true)} size="lg">
                  <PlusIcon className="mr-2 h-5 w-5" />
                  Add Task
                </Button>
              </div>
            )}
          </div>
        </div>

        {isSidebarCollapsed ? (
          <Button
            className="absolute top-1/2 right-0 z-20 -translate-y-1/2 rounded-l-none border-l bg-background"
            onClick={() => setIsSidebarCollapsed(false)}
            size="sm"
            variant="ghost"
          >
            <UsersIcon className="h-4 w-4" />
          </Button>
        ) : (
          <aside className="flex w-80 flex-shrink-0 flex-col border-l bg-background">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="font-semibold text-foreground">Staff Roster</h2>
              <Button
                onClick={() => setIsSidebarCollapsed(true)}
                size="sm"
                variant="ghost"
              >
                <MoreHorizontalIcon className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {staff.map((member) => (
                <div
                  className="flex items-center gap-3 border-b px-4 py-3 transition-colors hover:bg-muted/50"
                  draggable
                  key={member.id}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("staffId", member.id);
                  }}
                >
                  <div className="relative">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full font-medium text-sm text-white ${getAvailabilityColor(member.availability)}`}
                    >
                      {member.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <div
                      className={`absolute right-0 bottom-0 h-2 w-2 rounded-full border-2 border-background ${getAvailabilityColor(member.availability)}`}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-foreground text-sm">
                      {member.name}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {member.role}
                    </div>
                  </div>

                  <Badge
                    className="text-xs"
                    variant={
                      member.availability === "available"
                        ? "default"
                        : "destructive"
                    }
                  >
                    {member.currentTaskCount}
                  </Badge>
                </div>
              ))}

              {staff.length === 0 && (
                <div className="flex h-full flex-col items-center justify-center px-4 py-8 text-center">
                  <UsersIcon className="mb-3 h-8 w-8 text-muted-foreground/50" />
                  <p className="text-muted-foreground text-sm">
                    No staff members available
                  </p>
                </div>
              )}
            </div>

            <div className="border-t px-4 py-3">
              <Button className="w-full" size="sm">
                <PlusIcon className="mr-2 h-4 w-4" />
                Add Staff
              </Button>
            </div>
          </aside>
        )}
      </main>

      <TaskModal
        eventDate={eventDate}
        eventId={eventId}
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onTaskCreated={handleTaskCreated}
        staff={staff}
      />
    </div>
  );
}
