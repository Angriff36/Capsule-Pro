"use client";

import { useCallback, useMemo, useState } from "react";
import { apiFetch } from "@/app/lib/api";
import * as routes from "@/app/lib/routes";
import type { KanbanTask } from "../lib/board-types";

interface BoardStateParams {
  initialTasks: KanbanTask[];
  columns: Array<{ status: string; title: string }>;
  settings?: {
    devModeEnabled?: boolean;
  };
}

interface UseBoardStateReturn {
  tasks: KanbanTask[];
  tasksByColumn: Record<string, KanbanTask[]>;
  isDevMode: boolean;
  setDevMode: (enabled: boolean) => void;
  handleDragEnd: (activeId: string, overId: string, overColumnStatus: string) => Promise<void>;
  refreshTasks: () => Promise<void>;
  updateTask: (id: string, updates: Partial<KanbanTask>) => void;
  addTask: (task: KanbanTask) => void;
}

export function useBoardState({
  initialTasks,
  columns,
  settings = {},
}: BoardStateParams): UseBoardStateReturn {
  const [tasks, setTasks] = useState<KanbanTask[]>(initialTasks);
  const [isDevMode, setIsDevMode] = useState(settings.devModeEnabled ?? false);
  const [, setOptimisticUpdates] = useState<
    Record<string, Partial<KanbanTask>>
  >({});

  // Filter tasks based on dev mode
  const filteredTasks = useMemo(() => {
    if (!isDevMode) {
      return tasks;
    }
    return tasks.filter((task) => task.sourceType === "dev_bug");
  }, [tasks, isDevMode]);

  // Group tasks by column and sort by position
  const tasksByColumn = useMemo(() => {
    const grouped: Record<string, KanbanTask[]> = {};

    columns.forEach((col) => {
      grouped[col.status] = [];
    });

    filteredTasks.forEach((task) => {
      const columnTasks = grouped[task.status];
      if (columnTasks) {
        columnTasks.push(task);
      }
    });

    // Sort each column by position
    Object.keys(grouped).forEach((status) => {
      const columnTasks = grouped[status];
      if (columnTasks) {
        columnTasks.sort((a, b) => a.position - b.position);
      }
    });

    return grouped;
  }, [filteredTasks, columns]);

  const handleDragEnd = useCallback(
    async (activeId: string, overId: string, overColumnStatus: string) => {
      const sourceTask = tasks.find((t) => t.id === activeId);
      if (!sourceTask) return;

      // Find position in target column
      const targetColumnTasks = tasksByColumn[overColumnStatus] || [];
      const targetIndex = targetColumnTasks.findIndex((t) => t.id === overId);
      const targetTask =
        targetIndex >= 0 ? targetColumnTasks[targetIndex] : undefined;
      const newPosition = targetTask
        ? targetTask.position
        : targetColumnTasks.length;

      // Optimistic update
      const updatedTask: KanbanTask = {
        ...sourceTask,
        status: overColumnStatus,
        position: newPosition,
      };

      setOptimisticUpdates((prev) => ({
        ...prev,
        [activeId]: { status: overColumnStatus, position: newPosition },
      }));

      setTasks((prev) =>
        prev.map((t) => (t.id === activeId ? updatedTask : t))
      );

      // Call API
      try {
        const response = await apiFetch(routes.adminTaskMove(activeId), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: overColumnStatus, position: newPosition }),
        });

        if (!response.ok) {
          // Rollback on failure
          setTasks((prev) =>
            prev.map((t) => (t.id === activeId ? sourceTask : t))
          );
          setOptimisticUpdates((prev) => {
            const updated = { ...prev };
            delete updated[activeId];
            return updated;
          });
          throw new Error(`Failed to move task: ${response.statusText}`);
        }

        // Clear optimistic update on success
        setOptimisticUpdates((prev) => {
          const updated = { ...prev };
          delete updated[activeId];
          return updated;
        });
      } catch (error) {
        console.error("Error moving task:", error);
        // Rollback on error
        setTasks((prev) =>
          prev.map((t) => (t.id === activeId ? sourceTask : t))
        );
        setOptimisticUpdates((prev) => {
          const updated = { ...prev };
          delete updated[activeId];
          return updated;
        });
      }
    },
    [tasks, tasksByColumn]
  );

  const refreshTasks = useCallback(async () => {
    try {
      const response = await apiFetch(routes.adminTasks(), {
        method: "GET",
      });

      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
      }
    } catch (error) {
      console.error("Error refreshing tasks:", error);
    }
  }, []);

  const updateTask = useCallback(
    (id: string, updates: Partial<KanbanTask>) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
      );
    },
    []
  );

  const addTask = useCallback((task: KanbanTask) => {
    setTasks((prev) => [...prev, task]);
  }, []);

  const setDevMode = useCallback((enabled: boolean) => {
    setIsDevMode(enabled);
  }, []);

  return {
    tasks: filteredTasks,
    tasksByColumn,
    isDevMode,
    setDevMode,
    handleDragEnd,
    refreshTasks,
    updateTask,
    addTask,
  };
}
